import { createHmac } from "node:crypto";
import { createServer, type Server } from "node:http";
import { expect, test, type APIRequestContext } from "@playwright/test";

// One real round trip through the live path with Meta's Graph API and Claude mocked:
// signed inbound -> AI reply sent -> takeover rule fires -> consultant reply sent.
const sent: { path: string; auth?: string; body: { to: string; text: { body: string } } }[] = [];
let mock: Server;
const AI_REPLY = "Happy to help. Which city are you looking at?";

test.beforeAll(async () => {
  mock = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      res.setHeader("content-type", "application/json");
      if (req.url?.startsWith("/v26.0/")) {
        sent.push({ path: req.url, auth: req.headers.authorization, body: JSON.parse(raw) });
        return res.end(JSON.stringify({ messaging_product: "whatsapp", messages: [{ id: `wamid.out${sent.length}` }] }));
      }
      if (req.url?.startsWith("/v1/messages")) {
        const out = { reply: AI_REPLY, qualification: { city: null, budget_lakh: null, timeline: null, has_space: null, experience: null }, keenness: 55, said_will_check: false, handoff: false, handoff_reason: null };
        return res.end(JSON.stringify({ id: "msg_e2e", type: "message", role: "assistant", model: "claude-sonnet-5-5", content: [{ type: "text", text: JSON.stringify(out) }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 } }));
      }
      res.statusCode = 404;
      res.end("{}");
    });
  });
  await new Promise<void>((r) => mock.listen(4010, "127.0.0.1", r));
});
test.afterAll(() => mock.close());

let n = 0;
async function inbound(request: APIRequestContext, text: string) {
  const body = JSON.stringify({ object: "whatsapp_business_account", entry: [{ id: "WABA", changes: [{ field: "messages", value: {
    messaging_product: "whatsapp", metadata: { display_phone_number: "15550000000", phone_number_id: "1111" },
    contacts: [{ profile: { name: "Asha Test" }, wa_id: "919800000001" }],
    messages: [{ from: "919800000001", id: `wamid.in${++n}`, timestamp: String(Math.floor(Date.now() / 1000)), type: "text", text: { body: text } }],
  } }] }] });
  const sig = `sha256=${createHmac("sha256", "e2e-secret").update(body).digest("hex")}`;
  return request.post("/api/whatsapp", { data: body, headers: { "content-type": "application/json", "x-hub-signature-256": sig } });
}

test("live WhatsApp: AI reply, takeover rule, consultant reply all go out through the Cloud API", async ({ page, request }) => {
  // Handshake and signature boundary.
  expect((await request.get("/api/whatsapp?hub.mode=subscribe&hub.verify_token=e2e-verify&hub.challenge=42")).status()).toBe(200);
  expect((await request.get("/api/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=42")).status()).toBe(403);
  expect((await request.post("/api/whatsapp", { data: "{}", headers: { "x-hub-signature-256": "sha256=00" } })).status()).toBe(401);

  // 1. Inbound text -> the AI replies on WhatsApp.
  expect((await inbound(request, "Hi, I want franchise details")).status()).toBe(200);
  await expect.poll(() => sent.length, { timeout: 30_000 }).toBe(1);
  expect(sent[0]).toMatchObject({ path: "/v26.0/1111/messages", auth: "Bearer e2e-token", body: { to: "919800000001", text: { body: AI_REPLY } } });

  // A Meta retry of the same message is stored once.
  n--;
  await inbound(request, "Hi, I want franchise details");

  await page.goto("/live");
  await expect(page.getByTestId("live-banner")).toBeVisible();
  await expect(page.getByTestId("messages")).toContainText(AI_REPLY);
  await expect(page.getByTestId("messages").getByText("Hi, I want franchise details")).toHaveCount(1);
  await expect(page.getByTestId("lead-input")).toHaveCount(0); // nobody can type as the real customer

  // 2. A takeover rule fires; the AI stays quiet.
  await inbound(request, "Call me please");
  await expect(page.getByTestId("takeover-banner")).toContainText("Asked for a person or a call", { timeout: 15_000 });
  expect(sent.length).toBe(1);

  // 3. The consultant takes over and replies; it goes out on WhatsApp.
  await page.getByTestId("takeover-banner").getByRole("button", { name: "Take over" }).click();
  await page.getByTestId("human-input").fill("Hi Asha, Srijan here. Calling you in 5 minutes.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect.poll(() => sent.length, { timeout: 15_000 }).toBe(2);
  expect(sent[1].body).toMatchObject({ to: "919800000001", text: { body: "Hi Asha, Srijan here. Calling you in 5 minutes." } });
  await expect(page.getByTestId("conversation-state")).toHaveText("Human talking");

  // Survives a refresh: state comes from the server, not the page.
  await page.reload();
  await expect(page.getByTestId("messages")).toContainText("Calling you in 5 minutes");
});

test("live desk and its API are locked without the password", async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL, extraHTTPHeaders: { authorization: `Basic ${Buffer.from("x:wrong").toString("base64")}` } });
  expect((await ctx.request.get("/api/live")).status()).toBe(401);
  expect((await ctx.request.get("/live", { maxRedirects: 0 })).headers()["location"]).toContain("/login");
  expect((await ctx.request.get("/")).status()).toBe(200); // the public demo stays open
  await ctx.close();
});

test("the sign-in page lets a browser in with the desk password, and only with it", async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL, extraHTTPHeaders: {} }); // no Basic auth: a real browser
  const page = await ctx.newPage();
  await page.goto("/live");
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Desk password").fill("wrong");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Wrong password. Try again.")).toBeVisible();
  await page.getByLabel("Desk password").fill("e2e-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("live-banner")).toBeVisible();
  await ctx.close();
});

test("a cross-site POST to the live API is refused even with the password (CSRF)", async ({ request }) => {
  const post = (headers: Record<string, string>) => request.post("/api/live", { data: JSON.stringify({ type: "toggle_channel", channel: "email" }), headers });
  expect((await post({ "content-type": "application/json", origin: "https://evil.example" })).status()).toBe(403);
  expect((await post({ "content-type": "text/plain", origin: "http://localhost:3108" })).status()).toBe(403);
});
