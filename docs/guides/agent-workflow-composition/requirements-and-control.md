# Translate requirements into enforcement

[Guide home](README.md). This is application engineering guidance; the linked API pages establish
which mechanisms are currently usable.

For each hard requirement identify the observable, source of truth, enforcing code/policy, and failure
response. Keep this close to the application's code and tests; no separate elaborate design document
is required for a small application.

| Requirement | Enforce with | Test against |
|---|---|---|
| Exact calculation, ranking, filtering | Ordinary code or Function Stage | Exact values and boundary cases |
| Required facts before an action | Current committed-state check in host policy; Stage gate over its own inputs | Missing, invalid, corrected and stale facts |
| Fixed ordering/branches | Workflow transitions and Effect barriers | No downstream step before successful required outcome |
| Facts extracted from language | Schema + appropriate factual acceptance | Incorrect-but-schema-valid interpretation |
| Grounded answer | Source lookup through capability; preserve references | Source records and receipts, not just fluent wording |
| External mutation | Harness Effect + exact domain policy + external idempotency | Actual records, denied/declined/unknown paths |
| Human approval | ConfirmationPolicy + trusted resolution handler | Stored payload, one dispatch per confirmation ID |
| Long-lived conversation | Root Agent + host input loop + cumulative budget policy | Several turns, correction, context trimming, exhaustion |
| Style and explanation | Instructions + behavior evaluation | Grounding, clarity, tone and cost separately |

## Schema validity versus acceptance

A schema establishes type, shape and declared bounds. It cannot prove the model understood the user.
If “around forty” is saved as `40`, numeric validation says nothing about the interpretation.

Choose acceptance per field: deterministic parsing for a structured form, a source-of-record lookup,
a human choice, cross-field consistency, or an explicitly best-effort model assertion. A free-text
summary may reasonably be model asserted; an approval flag should not be. Do not grant a model a
write action for policy-controlled fields just because they are represented as Structured Memory.

There is no public host memory setter. If trusted host logic accepts a candidate, use an ordinary
supported write path (Function Stage/Agent Effect or a tested application controller) with appropriate
policy, or keep that state in the host database. See [memory](state-memory-and-context.md).

## Exact decisions inside conversation

Let the Agent interpret and explain; retain accepted inputs and compute the result in code. Pass the
computed value to the explaining model, and render the exact value directly in UI if it must not be
misquoted. Giving the model a correct number does not guarantee it repeats that number faithfully.

A gate over current Structured Memory can live in a host-supplied Effect authorizer. A Function Stage
can gate its input/observations, but cannot fetch that memory through Stage context. Compute the gate
when authorizing the action rather than cache it only between user turns. A policy decision is still
not an atomic transaction with an external database; enforce relevant invariants there too.

## Choose control after identifying the uncertainty

A known process is a Workflow, even if an LLM chooses among fixed branches. Open-ended exploration
may justify an Agent. Multi-turn conversations use the stock Agent because stock Workflows consume
input only once. Choose the smallest supported combination and verify it against the
[surface matrix](current-authoring-surface.md). A bigger prompt is not a substitute for an absent
state check, permission boundary, or failure handler.
