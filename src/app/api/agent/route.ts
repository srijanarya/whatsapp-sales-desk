// Live AI reply for one lead. Fails loudly: every failure returns an error the UI shows,
// and the chat goes to a human. The API key never leaves the server.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { BRANDS, brandById } from "@/lib/data/brands";
import { buildSystemPrompt } from "@/lib/agent/prompt";
import { AgentOutput, AgentRequest } from "@/lib/agent/schema";
import { checkReply } from "@/lib/agent/guard";

export const maxDuration = 30;

const MODEL = "claude-sonnet-5-5";
const MAX_MESSAGES = 12;
const MAX_CHARS = 600;

const factsText = (b: (typeof BRANDS)[number]) =>
  `${b.name}: ${b.sector}; listed investment ${b.investment}; based in ${b.base}${b.outlets ? `; ${b.outlets}` : ""}. Source: ${b.sourceUrl} (${b.asOf}).`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "live_ai_off" }, { status: 503 });

  const parsed = AgentRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });
  const { brandId, leadType, messages } = parsed.data;

  const brand = brandById(brandId);
  const brandName = brand?.name ?? "our listed franchise brands";
  const brandFacts = brand ? factsText(brand) : BRANDS.map(factsText).join("\n");
  const recent = messages.slice(-MAX_MESSAGES).map((m) => ({ ...m, body: m.body.slice(0, MAX_CHARS) }));
  const leadText = recent.filter((m) => m.sender === "lead").map((m) => m.body).join("\n");

  // The API needs alternating roles: lead lines become user turns (tagged as data), everyone else assistant.
  const turns: Anthropic.Beta.BetaMessageParam[] = [];
  for (const m of recent) {
    const role = m.sender === "lead" ? "user" : "assistant";
    const text = m.sender === "lead" ? `<lead_message>${m.body}</lead_message>` : m.body;
    const last = turns.at(-1);
    if (last && last.role === role) last.content = `${last.content}\n${text}`;
    else turns.push({ role, content: text });
  }
  if (turns[0]?.role !== "user") turns.unshift({ role: "user", content: "<lead_message>(conversation continues)</lead_message>" });
  if (turns.at(-1)?.role !== "user") return Response.json({ error: "no_new_lead_message" }, { status: 400 });

  const started = Date.now();
  try {
    const client = new Anthropic();
    const res = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 1024,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: buildSystemPrompt(brandName, brandFacts) + (leadType === "founder" ? "\n\nThis lead is a brand founder." : ""),
      messages: turns,
      output_config: { effort: "low", format: betaZodOutputFormat(AgentOutput) },
    });
    const meta = { model: res.model, latencyMs: Date.now() - started, tokensIn: res.usage.input_tokens, tokensOut: res.usage.output_tokens };

    if (res.stop_reason === "refusal") return fail("model declined to answer", meta);
    if (res.stop_reason === "max_tokens") return fail("reply was cut off (max tokens)", meta);
    const out = res.parsed_output;
    if (!out) return fail("reply did not match the expected format", meta);

    const guard = checkReply(out.reply, brandFacts, leadText);
    log({ ...meta, handoff: out.handoff_reason, blocked: guard.ok ? null : guard.reason });
    if (!guard.ok) return Response.json({ blocked: guard.reason, trigger: guard.trigger, meta }, { status: 200 });
    return Response.json({ output: out, meta });
  } catch (err) {
    const status = err instanceof Anthropic.APIError ? err.status : undefined;
    log({ model: MODEL, latencyMs: Date.now() - started, error: status ?? "network" });
    return Response.json({ error: status === 429 ? "rate_limited" : status ? `api_error_${status}` : "network_error" }, { status: 502 });
  }
}

function fail(reason: string, meta: object) {
  log({ ...meta, error: reason });
  return Response.json({ error: reason, meta }, { status: 502 });
}

// One structured line per AI call, readable in the Vercel logs.
function log(fields: object) {
  console.log(JSON.stringify({ event: "agent_call", ...fields }));
}
