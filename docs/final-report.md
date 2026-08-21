# Agent SDK v0 — Final Report

**Date:** 2026-08-21
**Status:** v0 complete. 103 tests passing, typecheck clean, Studio verified end to end.
**Scope discipline:** no Skills, no multi-agent, no self-learning, no vector infrastructure, no voice
stack, no Agenerateor integration.

---

## 1. What was implemented

### Core kernel (`core/`) — importable, zero runtime dependencies

Every v0 concept from the brief, with the boundary held: no React/Next, no database library, no web
routes, no provider SDK, and no credential read anywhere inside `core`.

| # | Concept | Implementation |
| --- | --- | --- |
| 1 | AgentDefinition | Plain-JSON, versioned, content-hashed. `defineAgent`, `nextVersion`, `definitionHash`, `validateDefinition` (errors *and* design-smell warnings), JSON round trip. |
| 2 | Durable session | 18 event types across all required families, a pure `project()` fold, optional snapshot as a strict cache, `SessionStore` interface + in-memory implementation. |
| 3 | Memory | Structured authoritative memory (string/number/boolean/enum/string[], enum choices, min/max, integer, provenance, per-source write permissions) and non-authoritative working notes. |
| 4 | Host context | `lifecycle × visibility × trust`, whitelist filtering into prompts, trust labels rendered to the model, turn-scoped expiry. |
| 5 | Knowledge | `document` (IDF-weighted lexical retrieval, CPU only) and `record_set` (deterministic filter/sort/limit over declared fields). |
| 6 | Tools | Typed input/output, `effect`, `confirmation`, `idempotency`, DI executors, authoritative `ToolResult` with facts. |
| 7 | Confirmation | `PendingAction` bound to a `requestId` **and** an args hash; a four-valued conservative resolver. |
| 8 | Coarse flow | Optional phases, `pre_response` and `action_result` timings, a closed condition union with an explanation trace. No code execution. |
| 9 | Harness | `AgentHarness` interface + `TwoPassHarness` default. |
| 10 | ContextCompiler | Structured `CompiledContext` rendered to text; audits what it withheld. |
| 11 | Deterministic authority | Action success/failure, permission, idempotency, numeric bounds, record filters, and confirmation state are all runtime-owned. |

### Outside core

- **`providers/gemini/`** — implements the provider-neutral interface, reads its own environment at
  the application boundary, classifies failures into the benchmark protocol's taxonomy
  (`HTTP_429_RATE_LIMIT`, `DAILY_QUOTA_EXHAUSTED`, `NETWORK_DNS`, `NETWORK_TIMEOUT`, `PROVIDER_5XX`,
  …), and records the model the provider *reports* rather than the one requested.
- **`apps/studio/`** — every required Studio feature, over `node:http` + `node:sqlite` + a vanilla
  SPA. Schema is the three tables the brief specified. All tools run as dry runs, switchable to
  failure.
- **`benchmarks/`** — P01 and P02 adapters, ported assertions, a documented result schema, a
  self-check mode, and a comparison script that refuses to compare a non-measurement.
- **`examples/`** — `minimal-agent` (no tools, no flow) and `estate-like` (the full surface). Both
  run with no API key and no network.

---

## 2. Tests and commands actually run

```bash
npm install                    # typescript + @types/node only
npm test                       # 103 passing, 0 failing
npm run typecheck              # clean
npm run example:minimal        # verified output below
npm run example:estate         # verified output below
npm run studio                 # started, driven through the browser, verified
npm run bench:p01              # 20 scenarios, adapter self-check
npm run bench:p02              # 16 scenarios, adapter self-check
```

### The 13 required invariants

| # | Invariant | Test |
| --- | --- | --- |
| 1 | memory type/min/max/enum validation | `memory.test.ts` — 10 cases incl. integer, maxItems, case-normalized enum |
| 2 | bad proposal rejected **and evented** | `memory.test.ts` — reason recorded, sibling field still commits |
| 3 | a working note cannot authorize a side effect | `context.test.ts` — refused as `non_authoritative_argument_source`, succeeds once committed |
| 4 | turn-scoped, model-visible context enters context | `context.test.ts` — incl. trust labelling and turn expiry |
| 5 | `tools_only`/`runtime_only` never enter context | `context.test.ts` — across every pass, and after a tool result is folded in |
| 6 | deterministic record price filter | `knowledge.test.ts` — 9 cases incl. unknown field = error, not empty |
| 7 | action success/failure is authoritative | `tools.test.ts` — incl. an executor that throws |
| 8 | `once_per_session` / `per_input` idempotency | `tools.test.ts` — incl. a failure staying retryable |
| 9 | confirmation bound to PendingAction; **GAP-005** | `confirmation.test.ts` — resolver unit cases + end-to-end |
| 10 | intent change causes a pre-response transition | `flow.test.ts` — reply pass sees the new phase |
| 11 | a successful action causes an action_result transition | `flow.test.ts` — plus the failure routing |
| 12 | session reconstructs from events + snapshot | `session.test.ts` — `replay === live`, `resume === project` |
| 13 | max-step limit terminates safely | `runtime.test.ts` — truthful message, `RuntimeError` evented |

Plus 17 benchmark-adapter tests and coverage of degradation, provider metadata, definition
versioning, and prompt-size discipline.

### Verified example output

`npm run example:estate`, abridged:

```
[ADVERSARIAL: 'go ahead' in an unrelated forbidden request]
        phase=handoff stop=awaiting_confirmation dispatches=0
[genuine confirmation]
        phase=complete stop=completed dispatches=1
[duplicate attempt]
        phase=complete stop=completed dispatches=1

  budget               12000000  (was 20000000)
  external dispatches                 1  (exactly one, despite two requests)
  confirmation decisions              unrelated, confirm
  tools_only token in model context   no
  64 events; replay(events) === live state: true
```

`npm run example:minimal` demonstrates the rejection path: the model proposed `affected_users:
"about 40"` for a number field; it was rejected with `expected number, received string` and recorded,
and the clean `40` committed a turn later.

---

## 3. Deliberate deviations, and why

1. **Studio is a zero-dependency Node server + vanilla SPA, not Next.js.** The brief permits Next.js
   but also demands "avoid framework magic" and "the smallest implementation that preserves the
   stable interfaces". A dependency-free Studio delivers every listed feature, installs nothing, and
   cannot drift. The boundary the brief actually protects — database and UI outside core, behind a
   store adapter — is unchanged.
2. **`node:test` instead of Vitest, `node:sqlite` instead of better-sqlite3.** Same reasoning; also
   removes native-module compilation as a failure mode. Consequence: Node 22.6+ is required, and core
   uses only *erasable* TypeScript (no `enum`, no parameter properties).
3. **Test doubles ship inside `core/src/testing/`.** `ScriptedModelProvider` and the fake executors
   have no I/O and no dependencies. Shipping them is what lets examples, benchmarks, and the Studio
   exercise the kernel with no live model. Documented rather than hidden.
4. **Record queries are exposed as a built-in read tool.** The brief requires deterministic record
   filtering; making it a tool puts the filter in the event stream and the trace as an authoritative
   result, rather than leaving it an invisible compiler step.
5. **The schema language gained `array` and `any`.** A record-filter list is genuinely a list, and a
   filter's comparand is genuinely polymorphic. `any` is used in exactly one place, where
   `queryRecords` validates the value against the *declared field type* — a stricter check than the
   schema layer could express. Memory fields still cannot use either.
6. **The confirmed action executes the stored payload directly.** Rather than waiting for the model
   to re-request the tool after consent, the runtime executes the exact arguments the user was shown.
   This closes the window in which a model could alter a payload between consent and execution.
7. **A benchmark self-check grades every scenario `inconclusive`.** That is the correct grade under
   the ported grading contract for a run no model answered. What the self-check genuinely establishes
   is recorded separately in `adapterCheck`.

---

## 4. Benchmarks: state of play

Both adapters are complete and self-checked. **No live run has been performed, and no measurement is
claimed.**

Two reasons, both deliberate:

- The brief says live quota need not be spent until the setup is ready.
- No provider key is present in this shell. A key does exist in the EstatePro project directory, but
  the benchmark protocol's credential-isolation rule is explicit that credential domains must stay
  separate and must never be silently switched. Cross-using it would invalidate exactly the property
  that made P01-R1 authoritative after P01-R0 was withdrawn for that contamination.

To produce the first comparison:

```bash
GEMINI_API_KEY=<key for THIS experiment> \
  node --experimental-strip-types benchmarks/p02-estate/run.ts --live   # --pace defaults to 15000

node --experimental-strip-types benchmarks/shared/compare.ts \
  --sdk=p02-estate-live.json \
  --baseline=<path>/tests/benchmarks/real-agents/estate/results-controlled.json
```

Budget estimate before committing quota, counted from the suites rather than guessed:

| | scenarios | turns | assertions | base calls (2/turn) | with tool round trips |
| --- | --- | --- | --- | --- | --- |
| P01 / Craig | 20 | 36 | 89 | 72 | ~80–90 |
| P02 / EstatePro | 16 | 33 | 67 | 66 | ~75–85 |

Pacing is applied per **turn**, but each turn issues at least two model calls back to back, so the
default `--pace=15000` works out to roughly 9 calls/min — just under the protocol's conservative
~10/min ceiling. That is about 8 minutes of wall clock per project. A 7s gap would be roughly 20
calls/min and would start drawing 429s.

Run P02 first: it carries the handoff, idempotency, and GAP-005 scenarios, which is where this
design's claims are most testable.

If a headline result comes out close or surprising, the brief's guidance applies — add a small
contemporaneous rerun of the high-information subset (S14, S16, S17, S19, S20) rather than
re-running everything.

---

## 5. What the design predicts, and how it would be falsified

Testable claims this SDK makes about the recorded gaps:

- **GAP-001 (no deterministic home for a derived value)** — answered by `compute_wall_volume`.
  Falsified if live Craig runs still produce volume errors, which would mean the model is not calling
  the tool, i.e. a harness problem rather than a representability one.
- **GAP-003 (no numeric bounds)** — answered by `min`/`max`/`integer` on memory fields. CRAIG-S22
  asserts the negative area never enters state.
- **GAP-004 (no deterministic filter over structured knowledge)** — answered by `query_listings`.
  ESTATE-S14's truthful no-match is the test.
- **GAP-005 (confirmation satisfied by an adversarial substring)** — answered by the conservative
  resolver, and the payload-hash binding closes a related hole the original report did not raise.
  Already regression-tested offline; ESTATE-S20 tests it live.
- **GAP-002 (exactly one closing question)** — **not** addressed. This is a response-shaping
  constraint with no deterministic home in this design either. It is left open on purpose rather than
  solved with a regex over the model's output.

---

## 6. Open v1 hypotheses

1. **One-pass harness.** The two-pass split costs a model call per turn. A stronger model may extract
   and respond in one structured call. The `AgentHarness` interface exists precisely so this can be
   swapped and A/B'd against the same scenarios without touching session, tool, or storage code.
2. **The authoritative-source check is a heuristic and I expect it to need work.** It currently
   string-matches required short arguments against authoritative values. That is right for names and
   phone numbers and wrong-shaped for anything composed. A typed `argument provenance` — where the
   model names the memory field an argument came from and the runtime resolves it — would be
   deterministic instead of approximate. This is the weakest part of v0.
3. **Rejection feedback.** Rejected proposals are recorded but not currently fed back into the next
   prompt. Telling the model "you proposed `budget: 'twenty million'` and it was rejected because the
   field is a number" may fix the next attempt. Untested; would need care not to become a loop.
4. **Working-note selection.** Recency-ordered, capped at 5. Fine for short sessions; a long session
   is untested and lexical relevance may beat recency.
5. **Snapshot compaction.** Events accumulate without bound. The projection is cheap, so this is not
   urgent, but a long-running session will eventually want event compaction behind the same
   `resume === project` invariant.
6. **Multi-source retrieval budget.** The compiler takes a global top-4 across sources. With many
   sources, per-source guarantees may matter more than a global ranking.
7. **Phase-scoped memory writes.** Fields are currently writable in any phase. Whether phase-scoped
   write permission is worth its complexity is unproven — the brief's warning about turning
   conversation into a ten-state form applies here.

---

## 7. Honest assessment of what is not proven

- **No live model has run against this kernel.** Every test uses a scripted or static provider. The
  deterministic properties are genuinely proven; the *semantic* properties — does a real model use
  the query tool instead of comparing prices in prose, does it call `compute_wall_volume` — are not.
  This is the single biggest open question, and the benchmark adapters exist to answer it.
- **The confirmation resolver is conservative by construction, and that has a cost.** It will
  sometimes ask twice. The bias is deliberate (a wrongly-confirmed email is worse than an extra
  turn), but the false-refusal rate on real user phrasing is unmeasured.
- **Lexical retrieval is adequate for small sources, and nothing more.** It was chosen because the
  brief forbids requiring a vector DB, not because it is good. The `KnowledgeRetriever` interface
  exists so it can be replaced without touching anything else.
- **The Studio's provider selection is per-process.** All agents share one provider, chosen at
  startup. Fine for a dev tool; not a design worth keeping if the Studio grows.
- **Concurrency is handled but barely tested.** The SQLite append derives its sequence inside a
  transaction, and the runtime skips a snapshot rather than writing a wrong one. There is no
  concurrent-writer test.
