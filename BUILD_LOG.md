# Build log

**How this was built.** I direct AI tools rather than writing code by hand: Claude Code as the orchestrator, plus sub-agents for testing and review. I define the problem, make every decision, review, test and correct. This file is the curated log the brief asks for: the exact prompts used, what the AI got wrong, what I fixed, and what I'd do with one more day. A fuller private log and a 43-entry decision log back it up.

## 1. The prompts that shaped the build

### My instructions (quoted as typed; speech-to-text left as is)
| # | Instruction | What it changed |
|---|---|---|
| 1 | "Before I start the project, I run deep research and deep sweeps of GitHub repos regarding the existing projects related to what we are planning to build... so I don't build anything that I don't need to build." | A licence-checked sweep of open-source projects and my own repos before building. Result: reuse my earlier CRM lead schema and table, and MIT shadcn/ui parts. Build the takeover logic new, because nothing open-source does it |
| 2 | "When something is uncertain, we add our own constraints that help the project become certain... the Lindy effect." | Missing inputs anchored on brands listed in a public franchise directory, with listed facts only |
| 3 | "In that demo, the actual name should be there." | Real brand names, with safeguards: listed facts with source and date, synthetic everything else, an on-screen banner |
| 4 | "Are there any loosenesses in the plan... Is there a context drift?" | The takeover rules and agent prompt were written and approved *before* the screen was built |
| 5 | "We need to add a lot of end-to-end tests that are output-driven... How do we make sure that the systems fail loudly?" | An output checklist, golden rule tests, invariant tests, browser tests and a three-level failure display |
| 6 | "Run a subagent to review this and share the results with me." | Two independent reviewer agents (one playing the grader, one a QA engineer) cut and reshaped the plan |
| 7 | "If I keep AI as the judge and if I don't keep AI as the judge. What will be the changes?" | Kept a separate AI judge for reply tone only; code checks decide safety |

### The agent's system prompt
The prompt the live AI runs is in `src/lib/agent/prompt.ts`: 211 words, approved before the build and copied in by script. A test keeps it within 150–250 words.

### The independent test-writer prompt (verbatim, abridged only where marked)
> You are writing an independent test set BEFORE the rules engine exists. Do NOT open or read anything under /src (the implementation must not influence your cases).
> Input (read only this): the approved design doc, Part A (8 takeover triggers, their priority, examples, "never a trigger" note) and Part B (agent rules).
> Write exactly one file: tests/golden/rule-cases.json, a JSON array of 34 to 40 objects with this schema: { id, lead_type, context: { keenness, unanswered_count, qualified_fields }, prior_lead_messages, message, expected, checkable_by: "code" | "model", note }
> […trigger id mapping…] When several triggers apply, "expected" is the highest-priority one.
> Coverage: at least 3 cases per trigger t1, t2, t3, t5; at least 2 each for t4, t6, t7, t8. At least 8 cases in Hindi/Hinglish (Roman script). At least 6 held-out paraphrases that express a trigger WITHOUT obvious keywords. At least 8 negatives, including negations, harmless uses of trigger-looking words, keenness ≥ 80 with no next step, and a prompt-injection attempt. 2 precedence cases.

The result was 39 cases. On the first honest run, all 24 code-checkable cases passed. The code rules also caught 4 of the 15 model-checkable paraphrases, which are the live model's job.

### Build instruction to the orchestrator (summary)
Build the agreed plan in three checkpoints, each reviewed by me:
1. The skeleton, live on Vercel.
2. The takeover flow, the rules engine, the scenarios and the live-AI route.
3. Polish and this log.

Commit at each milestone. Never enter API keys. Stop before submitting anything.

## 2. What the AI got wrong, and how it was caught
| What went wrong | How it was caught | Fix |
|---|---|---|
| The rules engine flagged "What is the refund policy on the deposit?" as a complaint, which would cause a false takeover | Golden test case written by the separate agent, recorded before fixing | A policy question about refunds no longer counts as a complaint |
| The reply guard blocked the safest possible answer, "I can't promise any returns" | A guard unit test written before the fix | Missing negations added |
| That fix opened a bypass: "No doubt you'll get great returns" would have passed, and a lead saying "not asking for a guarantee, just the profit" would not have reached a human | Automated security review of the pushed commit | Only explicit refusals are exempt on the AI side; only the negated phrase is ignored on the lead side; regression tests added |
| A second bypass: "I can't promise anything, but you'll earn great returns" | Second security review | The refusal exemption now covers only the refusal phrase itself |
| The earnings check matched exact words only ("highly profitable", "recoup", "lucrative" slipped through) | Third security review | Matches word families; 5 regression tests |
| The live AI endpoint had no access control, so anyone could spend the API credit | Second security review | Same-site check, per-visitor rate limit, size and count caps. The account's spend limit is the hard ceiling (see the README's accepted-risk note) |
| The rate limit trusted a caller-settable IP header, and the size cap trusted a caller-settable length header | Third security review | Uses the platform's own client IP; reads the body with a hard 20 KB cap |
| Duplicate message IDs ("m1" clashed with the seed data), then IDs repeating because the counter was bumped on an old copy of the state | Browser console; then a uniqueness test that failed before the fix | IDs prefixed and generated before the state is copied; test passes |
| The reducer mutated the previous state | Code review; a no-mutation test was added | State copied first |
| The page scrolled sideways on a phone (499px on a 375px screen) | Width check in the browser | One-line grid fix, verified live |
| The chat didn't scroll to the newest message | Browser check | Auto-scroll on new messages |
| A dependency was filed in the wrong place, so production showed 7 "high" audit warnings | `npm audit --omit=dev` | Moved to dev tools; production audit shows 0 |
| The AI added an MIT licence to this public repo without asking | Caught before commit: a licence is the owner's choice | Removed; licence still to be decided |

## 3. What I did myself
- **Every product decision:** the option, the rules and their order, the wording, the model, which safeguards to adopt, and what to cut.
- **Every approval:** the takeover rules, the system prompt, the data design and the quality plan, each before anything was built on it.
- **The reviews:** asked for both independent reviews and the AI-judge trade-off, and chose what to adopt.
- **Pushback when I didn't understand:** stopped the build to have the choices and data design explained as pictures.
- **No hand-written code.**

## 4. One more day
- Connect a WhatsApp Cloud API test number to the same rules engine and reply guard.
- Persist data in Supabase behind the existing data module (`src/lib/store.tsx`).
- Run the live-model evaluation on more Hinglish and code-mixed conversations, and tune the takeover thresholds on real outcomes.
- Add a lost-leads-by-stage view built from the same action log.
