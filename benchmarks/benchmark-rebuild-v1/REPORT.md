# benchmark-rebuild-v1 final report

Date: 2026-08-22 (Asia/Taipei)

Status: complete, with documented framework-natural limitations below. This rebuild creates four clean benchmark subjects; it does not draw benchmark conclusions.

## 1–3. Files and benchmark history

### Agent_SDK / Arrokothai

- `.env.example`
- `package.json`
- `benchmarks/package.json`
- `benchmarks/README.md`
- `benchmarks/rebuild-v1.test.ts`
- `benchmarks/benchmark-rebuild-v1/README.md`
- `benchmarks/benchmark-rebuild-v1/REPORT.md`
- `benchmarks/benchmark-rebuild-v1/shared/model.ts`
- `benchmarks/benchmark-rebuild-v1/shared/raw-run.ts`
- `benchmarks/benchmark-rebuild-v1/p01-arrokothai/application.ts`
- `benchmarks/benchmark-rebuild-v1/p01-arrokothai/smoke.ts`
- `benchmarks/benchmark-rebuild-v1/p02-arrokothai/application.ts`
- `benchmarks/benchmark-rebuild-v1/p02-arrokothai/records.ts`
- `benchmarks/benchmark-rebuild-v1/p02-arrokothai/smoke.ts`
- `benchmarks/benchmark-rebuild-v1/results/p01-arrokothai-smoke.json`
- `benchmarks/benchmark-rebuild-v1/results/p02-arrokothai-smoke.json`

### Agenerateor

- `.dev.vars.example`
- `package.json`
- `app/api/benchmark-rebuild-v1/turn/route.ts`
- `tests/benchmark-rebuild-v1.test.mjs`
- `benchmarks/benchmark-rebuild-v1/README.md`
- `benchmarks/benchmark-rebuild-v1/shared/base.ts`
- `benchmarks/benchmark-rebuild-v1/shared/smoke.mjs`
- `benchmarks/benchmark-rebuild-v1/p01-agenerateor/config.ts`
- `benchmarks/benchmark-rebuild-v1/p01-agenerateor/application-service.ts`
- `benchmarks/benchmark-rebuild-v1/p02-agenerateor/config.ts`
- `benchmarks/benchmark-rebuild-v1/p02-agenerateor/application-service.ts`
- `benchmarks/benchmark-rebuild-v1/p02-agenerateor/records.ts`
- `benchmarks/benchmark-rebuild-v1/results/p01-agenerateor.raw.json`
- `benchmarks/benchmark-rebuild-v1/results/p02-agenerateor.raw.json`

No old benchmark file was deleted or moved. Existing scenarios, graders, adapters, and scientific results were retained and are now explicitly labeled historical in `benchmarks/README.md`. `benchmark-rebuild-v1` is the sole documented active path.

## 4–5. Authoritative application contracts

P01 is a conversational hemp-lime project guide. It retains corrections, distinguishes floor area from net wall area, computes wall volume from exact positive dimensions using `area_sq_ft × thickness_in / 12 × 0.0283168`, explains material/method/code facts, keeps quantities in physical units, and refuses to invent live price, inventory, SKU, checkout, permit, or engineering facts.

P02 is an EstatePro concierge for buy/rent/sell and exact property questions. It retains intent changes and criteria, filters the exact six source records by supported constraints, returns truthful zero matches, does not reinterpret sale prices as rent or live availability, qualifies sellers for human valuation, and transmits an exact confirmed handoff at most once while treating the executor result as outcome truth.

## 6–9. Four designs

### Agenerateor P01

Customer Data stores project facts. Craig facts are configured document Knowledge. A subject-specific host application service uses Agenerateor's existing runtime-composition and host-updateable App Context seam to compute and publish authoritative volume/status/basis before reply generation. It has one consultative stage, no Action, and no artificial business workflow.

### Agenerateor P02

Customer Data stores intent, criteria, corrections, and contact data. Exact source records are configured Knowledge. A host application service deterministically filters the six-record set and writes rows/count/criteria to App Context. Native stages cover consultation, seller handling, and confirmation. The existing non-repeatable `send_email` backend Action uses explicit confirmation and a fixed truthful result message; its dry-run output contains the exact fields and query observation.

### Arrokothai P01

Structured memory stores project facts, document Knowledge stores Craig truth, and declared read tool `compute_wall_volume` plus its injected executor performs authoritative arithmetic. Full ToolResult facts return to the model. There is no Workflow.

### Arrokothai P02

Structured memory stores criteria and contact state. Two canonical record Knowledge sources contain the exact six properties and eight named rooms; service policy is document Knowledge. The model proposes deterministic record queries. `send_lead_to_team` is a typed external-side-effect tool with authoritative argument policies, required frozen-payload confirmation, `once_per_session` idempotency, and success/failure/unknown ToolResult support. There is no Workflow.

## 10–13. Prompt, schema, Knowledge, computation, and Action inventories

| Subject | Instructions | Structured fields (`type`) | Knowledge/data | Deterministic capability / Action |
|---|---|---|---|---|
| Ag P01 | Purpose/responsibilities; answer-first, one-question, no-guess, invalid-input rules; consult-stage grounding and physical-unit instruction | `project_type:text`, `project_floor_area_sq_ft:number`, `wall_area_sq_ft:number`, `wall_thickness_in:number`, `install_method:choice`, `existing_wall_type:text`, `user_priority:text`, `project_stage:text`, `jurisdiction:text`; each has a concise task-semantic description | Craig product/material/method/code/planning/unavailable-system document | Host computation writes `computed_wall_volume_m3`, exact basis, and status to App Context |
| Ag P02 | Purpose/responsibilities; answer-first, one-question, no-guess, invalid-input rules; consult/seller/handoff instructions; fixed truthful Action result | `intent:choice`, `target_location:text`, `budget:number`, `bedrooms_needed:number`, `timeline:text`, `financing:choice`, `selected_property:text`, `listing_preference:text`, `seller_zip:text`, `contact_name:text`, `phone:phone`, `email:email`, `contact_preference:choice`, `best_contact_time:text` | Exact six properties/eight rooms plus company/service policy | Host exact-record filter; native confirmation-gated non-repeatable `send_email` dry-run with all current fields and query result |
| Arrokothai P01 | Goal plus four concise global rules for answer/question style, deterministic result authority, physical units, and known-vs-live boundaries | Same nine semantics using typed memory schemas with positive bounds and installation enum | Byte-equivalent Craig document | `compute_wall_volume(wall_area_sq_ft:number>0, wall_thickness_in:number>0)`, read effect, per-input idempotency |
| Arrokothai P02 | Goal plus concise rules for exact query truth, zero matches, unavailable systems, exact handoff, email refusal, and ToolResult outcome boundary | Same fourteen semantics using typed memory schemas and intent/financing/contact enums | Exact record-set Knowledge: six properties and eight rooms; company/service policy document | Canonical record query; `send_lead_to_team` authoritative arguments, external-side-effect, required confirmation, once/session; success/failure/unknown executor outcomes |

There are no few-shot examples, benchmark answers, scenario identifiers, evaluator phrases, or query exemplars in agent prompts or field descriptions. Numeric planning facts that appear in Knowledge are source-authored Craig product facts, not examples invented for evaluation.

## 14. Cross-framework information-parity audit

| Dimension | Agenerateor | Arrokothai | Classification |
|---|---|---|---|
| P01 goal and business facts | Same | Same | parity; Craig Knowledge is byte-equivalent |
| P01 field semantics | Nine equivalent fields/descriptions | Nine equivalent fields/descriptions | parity |
| P01 arithmetic | Host application service → App Context | Declared tool → ToolResult | framework-natural difference |
| P02 goal and records | Six properties/eight rooms | Six properties/eight rooms | parity; JSON data is identical |
| P02 query | Host application service | Record Knowledge query | framework-natural difference |
| P02 state | Customer Data | Structured memory | framework-natural difference |
| P02 external effect | Native backend email Action | Typed external-side-effect tool | framework-natural difference |
| Confirmation/idempotency | Explicit confirmation, same-turn mutation guard, non-repeatable execution | Frozen payload/hash, runtime confirmation resolver, once/session ledger | framework-natural difference; both enforce authority |
| Model settings | Gemini, explicit env model, 0.35/700, thinking unset | Same | parity |

No unfair informational advantage remains. The only differences are native representation and trace richness.

## 15. Arrokothai v0.37 mental-model audit

1. Business truth is in typed memory, document/record Knowledge, ToolResult, or AgentDefinition as appropriate.
2. The LLM proposes external action; CapabilityGateway/runtime authorizes it.
3. P01 arithmetic executes deterministically outside the model.
4. P02 queries canonical record Knowledge deterministically.
5. Full KnowledgeResult and ToolResult observations reach the model and remain in the native trace.
6. Consequential arguments are schema-validated against authoritative memory sources.
7. Confirmation stores and displays the exact normalized payload and hash.
8. The action runs through v0.37's start-before-executor, CAS/idempotency, outcome-aware execution path. The smoke store is ephemeral `InMemorySessionStore`; v0.37 SQLite durability/CAS remains covered by the unchanged core suite.
9. No wrapper bypasses AgentRuntime or CapabilityGateway; the runner only injects declared executors and records events.
10. No major behavior is implemented through a large prohibition prompt. Remaining rules express concise business semantics and unavailable capabilities.

## 16–19. Environment, live smokes, and verification

All subjects require `GEMINI_API_KEY` and `GEMINI_MODEL`; rebuild routes/runners disable model and reply fallback. The configured model was `gemini-3.5-flash-lite`, temperature `0.35`, max output `700`, thinking unset.

| Live subject | Result | Requested model | Provider-reported model | Calls / usage | Key evidence |
|---|---|---|---|---|---|
| Ag P01 | `scenario_turns_complete`, 0 errors, 2.505 s | `gemini-3.5-flash-lite` | unavailable from adapter; configured response model matched | 2 calls; token usage unavailable | 420×10 → authoritative 9.9 m³; 3–6 weeks |
| Ag P02 | `completed`, 0 errors, 5.945 s | same | unavailable from adapter; configured response model matched | 5 calls; token usage unavailable | exact Skyline match; exact phone/payload; explicit confirmation; one dry-run dispatch |
| Arrokothai P01 | `completed`, 0 errors, 4.145 s | same | `gemini-3.5-flash-lite` | 4 calls; 3,520 input / 372 output tokens | deterministic tool 9.9 m³; Knowledge retrieval; no dispatch |
| Arrokothai P02 | `completed`, 0 errors, 8.888 s | same | `gemini-3.5-flash-lite` | 8 calls; 15,366 input / 793 output tokens | one-row record query; exact frozen confirmation; one dispatch; no outreach overclaim |

Verification:

- Gemini provider canary: all five checks passed; requested and reported `gemini-3.5-flash-lite`.
- Agent_SDK typecheck: passed. Full tests: 198/198 passed across 46 suites.
- Agenerateor TypeScript check: passed. Full tests: 475/475 passed. Production build: passed and includes `/api/benchmark-rebuild-v1/turn`.
- New Agenerateor paths lint clean. Repository-wide lint retains three pre-existing accessibility errors in `components/stage-graph.tsx` lines 283 and 330; that file was not changed.
- Both Agenerateor definitions pass required readiness checks.
- Changed-path secret scans and `git diff --check`: clean.
- Craig reference repository remains clean. EstatePro retains only its pre-existing user-owned changes; this work did not modify it.

## 20–21. Ambiguities and framework limitations

- Craig source documents refer to IRC Appendix AU while the shipped application explicitly says Appendix BL. The rebuild follows the shipped application (BL) and records that local adoption still requires verification.
- One Craig requirements workflow states 2.5–3 m³ for 300 sq ft at 2.5–3 inches, while the shipped deterministic formula yields about 1.8–2.1 m³. The conflict is preserved; exact supplied dimensions use the formula.
- EstatePro source history contains an instruction to invent extra fictional listings when fewer than two match. That conflicts with the authoritative exact-record/no-invention requirement and was not reproduced.
- Agenerateor has no generic built-in formula or record-set query primitive. Subject-specific deterministic services therefore use its intended host App Context seam; no framework core changed.
- Agenerateor's Gemini adapter does not expose provider-returned model identity or token usage, so the raw artifact records those fields as unavailable rather than guessing.
- Agenerateor redacts the phone in model-visible confirmation prose. The exact phone remains in runtime-owned Customer Data, the confirmed Action input, executor output, and raw trace; same-turn changes invalidate confirmation. This is a privacy/observability tradeoff rather than an authority bypass.
- Agenerateor's configured mail integration is a dry-run success path. Its generic runtime supports failure routing but does not expose an `outcome_unknown` shape as rich as Agent_SDK's ToolResult union.

## 22–23. Scope confirmations

Evaluator/scenario semantics were not redesigned, imported into the subjects, or used for tuning. No Agent_SDK core, provider, Strands, Studio, example, evaluator, or scenario file changed. No Agenerateor `lib/`, component, evaluator, or scenario file changed. Agent_SDK remains v0.37.0.

## A–G answers

- **A — Yes.** The Craig Knowledge text is byte-equivalent, property/room JSON is identical, field semantics are equivalent, and model settings match.
- **B — No.** Agent prompts and field descriptions contain no benchmark answers, scenario wording, scenario IDs, regex phrases, or few-shot/query exemplars.
- **C — Yes.** Arrokothai P01 uses a deterministic typed computation tool and authoritative ToolResult.
- **D — Yes.** Arrokothai P02 uses canonical deterministic record Knowledge, not prose listings.
- **E — Yes, with the documented Agenerateor PII-display limitation.** Both runtimes authorize the consequential action, require explicit confirmation, preserve the exact runtime payload, and prevent duplicate execution.
- **F — Yes.** All four ran live using only repository-standard env-selected Gemini credentials/model; no model fallback occurred.
- **G — Yes.** There is one documented active implementation for each framework/task pair under `benchmark-rebuild-v1`; older artifacts are labeled historical.

