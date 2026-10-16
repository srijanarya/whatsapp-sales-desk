import { expect, test, type Page, type Route } from "@playwright/test";

// Fail-loud checks: force live AI on, then break the AI endpoint in each way the plan lists.
async function liveAiOn(page: Page, agent: (route: Route) => Promise<void>) {
  await page.route("**/api/health", (r) => r.fulfill({ json: { liveAi: true, model: "claude-sonnet-5-5", commit: "test" } }));
  await page.route("**/api/agent", agent);
  await page.goto("/");
  await page.getByTestId("lead-input").fill("Hello, tell me more about Banjos please.");
  await page.getByTestId("lead-input").press("Enter");
}

const cases: [string, (route: Route) => Promise<void>][] = [
  ["server error", (r) => r.fulfill({ status: 502, json: { error: "api_error_500" } })],
  ["timeout / network", (r) => r.abort("timedout")],
  ["malformed reply", (r) => r.fulfill({ status: 200, body: "not json at all" })],
  ["reply blocked by guard", (r) => r.fulfill({ status: 200, json: { blocked: "reply talked about earnings", trigger: "t1_earnings" } })],
];

for (const [name, handler] of cases) {
  test(`AI failure (${name}) shows a calm notice and hands the chat to a human`, async ({ page }) => {
    await liveAiOn(page, handler);
    const banner = page.getByTestId("takeover-banner");
    await expect(banner).toContainText("AI unavailable", { timeout: 10_000 });
    await expect(banner.getByRole("button", { name: "Retry AI" })).toBeVisible();
    await expect(page.getByTestId("conversation-state")).toHaveText("Waiting for human");
  });
}

test("with no API key, the chip says live AI is off and the rules still run", async ({ page }) => {
  let agentCalled = false;
  await page.route("**/api/health", (r) => r.fulfill({ json: { liveAi: false, model: "claude-sonnet-5-5", commit: "test" } }));
  await page.route("**/api/agent", (r) => { agentCalled = true; return r.abort(); });
  await page.goto("/");
  await expect(page.getByTestId("live-ai-off")).toBeVisible();
  await page.getByTestId("lead-input").fill("Call me please");
  await page.getByTestId("lead-input").press("Enter");
  await expect(page.getByTestId("takeover-banner")).toContainText("Asked for a person or a call");
  expect(agentCalled).toBe(false);
});
