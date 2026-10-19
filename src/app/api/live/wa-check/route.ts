// Diagnostics for the live WhatsApp link (behind the desk password in src/proxy.ts).
// GET  [?waba=<id>]               -> test number status, the account ids this token can reach,
//                                    and (with waba) which apps that account sends webhooks to
// POST ?waba=<id>                 -> subscribe this app to that account's webhooks (the step that makes inbound arrive)
// POST ?hello=<phone digits>       -> send Meta's hello_world template to a registered test phone (proves outbound)
// Uses the server's own token; never returns it.
import { connection } from "next/server";
import { GRAPH_VERSION } from "@/lib/whatsapp";

const graph = async (path: string, method = "GET") => {
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`, {
    method,
    headers: { authorization: `Bearer ${process.env.WA_ACCESS_TOKEN}` },
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data: data?.error ? { error: data.error.message, code: data.error.code } : data };
};

function waba(req: Request) {
  const id = new URL(req.url).searchParams.get("waba") ?? "";
  return /^\d{6,}$/.test(id) ? id : null;
}

export async function GET(req: Request) {
  await connection();
  const id = waba(req);
  const phone = await graph(`${process.env.WA_PHONE_NUMBER_ID}?fields=display_phone_number,verified_name,status,code_verification_status,quality_rating,platform_type`);
  // Which WhatsApp account ids this token was granted (the scopes, never the token).
  const debug = await graph(`debug_token?input_token=${process.env.WA_ACCESS_TOKEN}`);
  const grantedTo = (debug.data?.data?.granular_scopes ?? []).map((g: { scope: string; target_ids?: string[] }) => ({ scope: g.scope, ids: g.target_ids ?? "all" }));
  const apps = id ? await graph(`${id}/subscribed_apps`) : null;
  return Response.json({ phone, grantedTo, debugError: debug.data?.error, subscribedApps: apps });
}

export async function POST(req: Request) {
  const to = new URL(req.url).searchParams.get("hello");
  if (to) {
    if (!/^\d{8,15}$/.test(to)) return Response.json({ error: "bad phone" }, { status: 400 });
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${process.env.WA_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.WA_ACCESS_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "template", template: { name: "hello_world", language: { code: "en_US" } } }),
    });
    const data = await res.json().catch(() => null);
    return Response.json({ hello: { status: res.status, data: data?.error ? { error: data.error.message, code: data.error.code } : data } });
  }
  const id = waba(req);
  if (!id) return Response.json({ error: "pass ?waba=<WhatsApp account id>" }, { status: 400 });
  return Response.json({ subscribe: await graph(`${id}/subscribed_apps`, "POST") });
}
