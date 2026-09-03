# P02 — EstatePro concierge

A benchmark subject built on the current ArrokothI 0.8.x Execution-kernel surfaces
(`@arrokothi/core/execution`, `/ports`, `/reference`). It is a luxury real-estate concierge: it
holds one short, natural conversation that qualifies a buy, rent, or sell inquiry, grounds the
discussion in real listings, and hands a qualified lead to the human team.

## Composition

| Concern | Where it lives |
|---|---|
| Multi-turn conversation, intent classification, prose interpretation, choosing the next question, tone, the analysis text | **one Agent Execution** (`agent.ts`), model-directed. The progression is roughly knowable but the conversation is not — facts arrive out of order, visitors correct themselves, intent changes — and a stock Workflow cannot span turns. |
| The lead record — intent, location, budget, timeline, intent-specific qualification, selected listing, name, phone, optional email, contact preference, best time | **Structured Memory** (`lead.ts`), schema-bound. Latest committed write wins, so a correction supersedes a stale value and out-of-order facts accumulate on one record. `intent` is an enum. |
| Property facts (title, price, beds, baths, sqft, location, features) | the read-only **`properties.search`** capability over the authoritative catalog (`properties.ts`, `catalog.ts`). The model never states a number it did not receive from a result; a no-match search returns an empty set with a note. |
| Whether the team handoff may happen | a deterministic gate inside the **async `EffectAuthorizer`** (`app.ts`): `lead.submit` is denied until `firstName` and `phone` are committed, and denied again once the transport has settled. The authorizer also stages the authoritative committed lead into the transport and forces `per_input` idempotency. |
| The external handoff itself | the **`lead.submit`** capability → a dry-run fake transport (`email.ts`) with a selectable outcome (`success` / `failure` / `unknown`) and its own send-once idempotency. No real message, no credential. |

The distinction the product depends on is kept intact: the model *proposes* `lead.submit`; the
application *validates* eligibility and *sources* the arguments from committed memory; the Harness
*authorizes*; the fake transport *performs*; and the runner reports the *observed* outcome from the
Effect journal — never the model's prose. `unknown` is never rounded to success or to failure.

Active security profile: `trusted-local`. There is no containment claim.

## Run

```bash
npm run example:benchmark:p02 -- --check

printf '%s' '{"protocolVersion":"1","sessionId":"s1","generation":{"provider":"gemini","model":"gemini-3.5-flash-lite","temperature":0},"turns":[{"message":"I want to buy a place in TriBeCa, budget around 8 million."}]}' \
  | npm run example:benchmark:p02
```

Live execution needs `GEMINI_API_KEY` (or `GOOGLE_API_KEY`). The injected `generation` config is
respected as-is: provider `gemini`, the given model, temperature, `maxOutputTokens`. No other model
is contacted for planning, extraction, matching, or rewriting.

stdout carries exactly one JSON object (`protocolVersion`, `subject`, `sessionId`, `conversation`,
`turns`, `lead`, `handoff`). Diagnostics go to stderr. The opening concierge line is product copy,
surfaced as `initialMessage` inside the session result and not part of the `conversation`
alternation.

## Tests

```bash
node --test --experimental-strip-types examples/benchmark/p02/subject.test.ts
```

Deterministic, offline, scripted-model. They cover: pinned property retrieval and no-match honesty;
definition validity and protocol parsing; cross-turn state retention and out-of-order facts;
correction and intent-change supersession; grounding through the capability; the front-loaded-brief
probe; required-contact enforcement; optional-email refusal not blocking; deny-by-default handoff
authority; the three Effect outcomes kept apart (success delivered, failure retryable, unknown
neither); duplicate-handoff prevention; and a combined intent-flip / email-declined / single-handoff
probe.
