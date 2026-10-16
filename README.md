# Franchise sales desk: WhatsApp AI agents with human takeover

A working prototype of one screen from a franchise-growth sales system. AI agents handle WhatsApp franchise enquiries and qualify leads. They hand the conversation to a human when a clear rule says they should. The "AI vs human" figure in the top bar is counted from what actually happened, not typed in.

**Status:** skeleton (lead list, conversation view, lead card, agent switchboard, computed AI vs human badge). Takeover controls, the rules engine, scenarios and live AI replies are being added next.

## What is real and what isn't
- **Brand names and facts:** taken only from a public franchise directory listing (dated in the app, with a source link). There is no affiliation, and they are listings, not clients.
- **Leads, conversations and metrics:** all synthetic.
- **No real integrations:** WhatsApp, Meta Ads, telephony and CRM connections are out of scope. Data lives in the page and resets on refresh.

## How it was built
I direct AI tools (Claude Code) rather than writing code by hand. I make the decisions, review and test. The build log covers my instructions, the prompts used, what the AI got wrong, and what I fixed.

The lead table and lead fields are adapted from my own earlier project, growth-gap-fund. UI components are shadcn/ui (MIT).

## Run it
```bash
npm install
npm run dev
```

## File map
| Path | What it does |
|---|---|
| `src/app/page.tsx` | Page layout: top bar, synthetic-data banner, three panes |
| `src/app/api/health/route.ts` | Health check: whether live AI is configured, the model, and the build commit |
| `src/lib/store.tsx` | The only data access point. A reducer plus React context; swap this file for a database |
| `src/lib/types.ts` | Lead, message, action and brand types |
| `src/lib/metrics.ts` | AI vs human split (from the action log), counters, temperature |
| `src/lib/data/brands.ts` | Brand facts as publicly listed, each with source and date |
| `src/lib/data/seed.ts` | Synthetic leads, messages and action history |
| `src/components/desk/*` | Top bar (switchboard and badge), leads table, conversation, lead card |
| `src/components/ui/*` | shadcn/ui components |
