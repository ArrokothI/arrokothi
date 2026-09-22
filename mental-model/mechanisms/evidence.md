# Inspecting accepted facts and proving claims

[Execution History](../concepts/state.md#execution-history) provides Kernel evidence. Native traces, application state and host observations have their own owners. This page owns inspection, retention and evidence attribution, including the accepted K1.0 structural preparation limits.

**Status:** Inspection and attribution obligation. Minimum at K1, operating depth at K5. This is target specification, not shipped behavior.

Every section here answers one question in a different setting: **what does this record actually let someone claim?** The first section answers it for each kind of record, and its right-hand column — what a record does *not* establish — is the part that matters, because every row has a tempting overreach. The rest applies the same discipline to what inspection must expose, what deletion may destroy, what a structural change has and has not achieved, and which layer a benchmark result belongs to. A record is evidence of the decision it names and nothing further, and most incorrect claims in this system come from promoting one a single step beyond that.

## What evidence proves

| Record | Establishes | Does not establish by itself |
|---|---|---|
| Input/Outcome receipt | Exact request accepted at its named decision | Native or external success |
| Admission record | Authorized attempt intent | Sink receipt/execution |
| Authenticated settlement | What that adapter/provider can attest about the attempt | Unobservable external facts |
| Native [checkpoint](../concepts/state.md#checkpoint-and-locator)/trace | Declared native state/behavior | Kernel acceptance, safe retry or complete [mediation](../concepts/actions.md#exposure-and-mediation) |
| Independent sink/application state | Attempted action or business result | Which layer supplied prevention |
| Host telemetry | Observed process/resource activity | Prevention without enforcement tests |
| Model text | A subject's claim | Consent, committed state or task success |

Retain useful causal links: input [batch](../concepts/core.md#batch-reservation-and-acknowledgment) → accepted [progress](../concepts/state.md#progress) → proposed action → policy/[consent](../concepts/actions.md#exact-consent) → physical attempt → evidence, plus awaited [child](../concepts/operations.md#child-and-ownership)/request and current uncertainty/[cleanup owner](../concepts/operations.md#backpressure-and-cleanup-debt). Order is per accepting domain, not a total order over provider clocks. Corrections append evidence; they do not overwrite consumed Events or terminal results. A Runtime already acted on what it was told, so rewriting that record would produce a history in which its decision looks unexplainable. Compaction must preserve promised receipts and outstanding work. Telemetry remains a projection, not authoritative lifecycle storage.

## Inspection grows with the supported mechanism

Inspection cannot show what the system does not yet have. Each row adds the facts that become real at that gate, so the table doubles as a statement of what is genuinely unanswerable earlier — an operator at K1 cannot be told why an action is pending, because there are no actions.

| Gate | Required additions |
|---|---|
| K1 | Lifecycle, progress revision, current Activation/[epoch](../concepts/identity.md#writer-epoch) or wait, input dispositions, terminal result, protocol failure |
| K2 | Action disposition, consent, attempts, certainty and owner |
| K3 | Recovery mode/reason, missing resource/version |
| K4 | Children/messages and correlations; declared supervision/parent-close policy, accountable owner and pending/refused follow-up controls |
| K5 | Retention/replay gaps, cleanup, pressure and supported profile |

[Held `RUNNING`](../concepts/state.md#recovery-and-re-execution) must visibly show its reason and permitted next actions; terminal work with a live remote action shows that obligation. Read-only inspection comes first; control, reconciliation and authority changes use authenticated recorded commands, not ad-hoc stored-status edits. Scope both field visibility and existence disclosure to what the principal is authorized to see. Parent ownership does not expose private native prompts, notes or resource metadata. Inspection privilege does not grant re-execution or settlement privilege.

For allowed debugging/evaluation, correlate native invocation/run with Execution and Activation, input/state version, selected context/bindings, model/config, observable request, output/tool choices, usage/latency and resulting decision. Link raw trusted results separately from presented text. Raw prompts, private reasoning and complete transcripts are not mandatory production records. Redaction/sampling and hidden provider details limit reproducibility; unknown cost is not zero.

## Retention and deletion

Evidence has a cost and a lifetime, and both collide with obligations that outlive them. Deletion here is never allowed to be silent: something that can no longer be proven has to say so rather than return an empty answer that reads like proof of nothing having happened.

Declare payload/receipt, action/evidence, checkpoint, output, artifact and trace periods independently. Pending obligations pin necessary data only within the supported period. Permitted [tombstones](../concepts/state.md#retention-pin-and-tombstone) can preserve identity/content binding after payload deletion, with access control; hashes of sensitive low-entropy values are not automatically anonymous.

Deletion that removes required data explicitly reports recovery unavailable, source unavailable or cursor expiry. Preserve permitted minimal causation/disposition and who authorized deletion. Expired idempotency cannot silently create another consequential action: require fresh intentional input or explicit refusal per published policy. Authorized historical retrieval can feed context without turning raw journals into Agent memory. Summaries retain source/omission limits and cannot replace exact consent.

## Structural evidence

K1.0 creates a private, refusal-only target package and a checked separation from legacy implementation. It does **not** implement asynchronous target execution or earn E1. The live [ownership inventory](../../docs/development/kernel-ownership.md) relates documented zones/roots, exports, measured dependencies and deferred owners to enforced source/configuration. Candidate measurements are not base measurements.

**Moving code is not migrating it.** A new directory, a new package name or a renamed file decides where future work lands. It changes nothing about what the code does. Only an accepted packet that implements the protocol does that. Say which of the two a change was, and never report a move as progress against a protocol gate.

Two rules about that inventory are architecture, not tooling. A written boundary and an executable one must be checked against each other, so a documentation change can never quietly widen what the code may import. And a check that cannot read part of its input must fail, not skip it: silently ignored evidence is indistinguishable from evidence that passed. How the inventory is parsed and compared is owned by [structural evidence rules](../../docs/development/015-structural-evidence-rules.md).

## Attribution and gates

When a benchmark run fails, the useful question is which layer failed, and the layers are easy to confuse because they share one observable outcome. This section keeps them apart so that a result can be credited or blamed correctly.

Distinguish Kernel, [Agent](../concepts/roles.md#agent) Runtime, [Workflow](../concepts/roles.md#workflow) Runtime, Driver, application, isolation, laboratory, provider and evaluator. A lab denial can protect the world while the subject still attempted an unauthorized send: the sink saw nothing, and the system under test is exactly as unsafe as it was before the harness caught it. A lab checkpoint earns no subject recovery credit. Use the benchmark-owned methodology and independent surviving sinks.

K0/E0 supplies public controls; K1/E1 tests deterministic protocol races; K2/E2 adds action controls; R1/E3 compares native fidelity; K3–K5/E4 injects real process death; E5 tests application value; E6 tests construction/distribution. Fixtures and structural passes are not gate acceptance. Record versions, schedules, attempted/accepted IDs, raw observations, exclusions, missing data and continue/narrow/reuse/stop decisions. Quality measurements hold Kernel fixed and repeat verified trials. Deterministic invariant checks require no models. Serialization alone is not a restart test, and restart alone is not storage-disaster recovery.
