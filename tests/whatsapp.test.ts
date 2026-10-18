import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { deskReducer, liveInitialState, windowOpen, type DeskEvent } from "@/lib/desk";
import { leadIdFor, parseInbound, verifySignature } from "@/lib/whatsapp";

const SECRET = "test-app-secret";
const sign = (body: string, secret = SECRET) => `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
const PHONE_ID = "1111";

const inbound = (over: Record<string, unknown> = {}, phoneId = PHONE_ID) => ({
  object: "whatsapp_business_account",
  entry: [{ id: "WABA", changes: [{ field: "messages", value: {
    messaging_product: "whatsapp",
    metadata: { display_phone_number: "15550000000", phone_number_id: phoneId },
    contacts: [{ profile: { name: "Asha" }, wa_id: "919800000001" }],
    messages: [{ from: "919800000001", id: "wamid.A1", timestamp: "1760800000", type: "text", text: { body: "Hi, franchise details?" }, ...over }],
  } }] }],
});

describe("webhook signature", () => {
  const body = JSON.stringify(inbound());
  it("accepts Meta's signature over the raw body", () => expect(verifySignature(body, sign(body), SECRET)).toBe(true));
  it("rejects a wrong secret, a tampered body, a missing or malformed header", () => {
    expect(verifySignature(body, sign(body, "other"), SECRET)).toBe(false);
    expect(verifySignature(body + " ", sign(body), SECRET)).toBe(false);
    expect(verifySignature(body, null, SECRET)).toBe(false);
    expect(verifySignature(body, "sha256=abc", SECRET)).toBe(false); // wrong length must not throw
    expect(verifySignature(body, sign(body).replace("sha256=", "sha1="), SECRET)).toBe(false);
  });
  it("rejects everything when the App Secret is unset", () => {
    expect(verifySignature(body, sign(body, ""), undefined)).toBe(false);
    expect(verifySignature(body, sign(body, ""), "")).toBe(false);
  });
});

describe("inbound mapping", () => {
  it("maps a text message to sender, name, body and Meta's time", () => {
    expect(parseInbound(inbound(), PHONE_ID)).toEqual([
      { id: "wamid.A1", waId: "919800000001", name: "Asha", body: "Hi, franchise details?", at: new Date(1760800000 * 1000).toISOString() },
    ]);
  });
  it("ignores status callbacks (sent/delivered/read)", () => {
    const status = { entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: PHONE_ID }, statuses: [{ id: "wamid.X", status: "delivered", recipient_id: "919800000001" }] } }] }] };
    expect(parseInbound(status, PHONE_ID)).toEqual([]);
  });
  it("drops traffic for any other phone number id", () => {
    expect(parseInbound(inbound({}, "2222"), PHONE_ID)).toEqual([]);
  });
  it("turns non-text messages into a visible placeholder", () => {
    expect(parseInbound(inbound({ type: "image", text: undefined, image: { id: "m" } }), PHONE_ID)[0].body).toBe("(sent an image; open WhatsApp to view)");
  });
  it("survives junk payloads", () => {
    for (const junk of [null, 42, {}, { entry: "x" }, { entry: [{ changes: [{}] }] }]) expect(parseInbound(junk, PHONE_ID)).toEqual([]);
  });
});

describe("live desk events", () => {
  const T = "2026-10-18T10:00:00.000Z";
  const id = leadIdFor("919800000001");
  const created: DeskEvent = { type: "lead_created", leadId: id, name: "Asha", phone: "+919800000001", at: T };
  it("a new contact becomes an AI-owned WhatsApp lead, once", () => {
    const s = [created, created].reduce(deskReducer, liveInitialState());
    expect(s.leads).toHaveLength(1);
    expect(s.leads[0]).toMatchObject({ id, channel: "whatsapp", state: "ai_talking", brandId: null });
  });
  it("an inbound message then runs the takeover rules", () => {
    const s = [created, { type: "lead_message", leadId: id, body: "Call me please", at: T } as DeskEvent].reduce(deskReducer, liveInitialState());
    expect(s.leads[0].state).toBe("waiting");
  });
  it("24-hour window is measured from the lead's last message", () => {
    const now = Date.parse(T);
    expect(windowOpen(new Date(now - 23 * 3600e3).toISOString(), now)).toBe(true);
    expect(windowOpen(new Date(now - 25 * 3600e3).toISOString(), now)).toBe(false);
    expect(windowOpen(undefined, now)).toBe(false);
  });
});

describe("live desk session cookie", async () => {
  const { sessionValue, validSession, MAX_AGE } = await import("@/lib/desk-session");
  const now = Date.parse("2026-10-19T00:00:00Z");
  it("accepts a fresh session, rejects expired, forged, other-password and empty ones", () => {
    const v = sessionValue("pw-A", now);
    expect(validSession(v, "pw-A", now + 1000)).toBe(true);
    expect(validSession(v, "pw-A", now + (MAX_AGE + 1) * 1000)).toBe(false);
    expect(validSession(v, "pw-B", now)).toBe(false);
    expect(validSession(v.replace(/^\d+/, String(now / 1000 + 999)), "pw-A", now + 1000_000)).toBe(false);
    expect(validSession(v, undefined, now)).toBe(false);
    expect(validSession(undefined, "pw-A", now)).toBe(false);
  });
});
