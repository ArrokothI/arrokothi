# Inspecting accepted facts and proving claims

[Execution History](../concepts/state.md#execution-history) provides Kernel evidence.
Native traces, application state and host observations have their own owners. This
page owns inspection, retention and evidence attribution, including the accepted
K1.0 structural preparation limits.

**Status:** Inspection and attribution obligation. Minimum at K1, operating depth at K5.
This is target specification, not shipped behavior.

## What evidence proves

| Record | Establishes | Does not establish by itself |
|---|---|---|
| Input/Outcome receipt | Exact request accepted at its named decision | Native or external success |
| Admission record | Authorized attempt intent | Sink receipt/execution |
| Authenticated settlement | What that adapter/provider can attest about the attempt | Unobservable external facts |
| Native checkpoint/trace | Declared native state/behavior | Kernel acceptance, safe retry or complete mediation |
| Independent sink/application state | Attempted action or business result | Which layer supplied prevention |
| Host telemetry | Observed process/resource activity | Prevention without enforcement tests |
| Model text | A subject's claim | Consent, committed state or task success |

Retain useful causal links: input batch → accepted progress → proposed action →
policy/consent → physical attempt → evidence, plus awaited child/request and current
uncertainty/cleanup owner. Order is per accepting domain, not a total order over
provider clocks. Corrections append evidence; they do not overwrite consumed Events
or terminal results. Compaction must preserve promised receipts and outstanding work.
Telemetry remains a projection, not authoritative lifecycle storage.

## Inspection grows with the supported mechanism

| Gate | Required additions |
|---|---|
| K1 | Lifecycle, progress revision, current Activation/epoch or wait, input dispositions, terminal result, protocol failure |
| K2 | Action disposition, consent, attempts, certainty and owner |
| K3 | Recovery mode/reason, missing resource/version |
| K4 | Children/messages and correlations |
| K5 | Retention/replay gaps, cleanup, pressure and supported profile |

Held `RUNNING` must visibly show its reason and permitted next actions; terminal work
with a live remote action shows that obligation. Read-only inspection comes first;
control, reconciliation and authority changes use authenticated recorded commands,
not ad-hoc stored-status edits. Scope both field visibility and existence disclosure
to what the principal is authorized to see. Parent ownership does not expose private
native prompts, notes or resource metadata.
Inspection privilege does not grant re-execution or settlement privilege.

For allowed debugging/evaluation, correlate native invocation/run with Execution and
Activation, input/state version, selected context/bindings, model/config, observable
request, output/tool choices, usage/latency and resulting decision. Link raw trusted
results separately from presented text. Raw prompts, private reasoning and complete
transcripts are not mandatory production records. Redaction/sampling and hidden provider
details limit reproducibility; unknown cost is not zero.

## Retention and deletion

Declare payload/receipt, action/evidence, checkpoint, output, artifact and trace periods
independently. Pending obligations pin necessary data only within the supported period.
Permitted tombstones can preserve identity/content binding after payload deletion,
with access control; hashes of sensitive low-entropy values are not automatically anonymous.

Deletion that removes required data explicitly reports recovery unavailable, source
unavailable or cursor expiry. Preserve permitted minimal causation/disposition and who
authorized deletion. Expired idempotency cannot silently create another consequential
action: require fresh intentional input or explicit refusal per published policy.
Authorized historical retrieval can feed context without turning raw journals into
Agent memory. Summaries retain source/omission limits and cannot replace exact consent.

## Structural evidence

K1.0 created a private target package that implemented none of the protocol, plus
a checked separation from legacy implementation. That pass does **not** implement
asynchronous target execution or earn E1, and a later packet landing real protocol
code in that package does not change what the pass proved. The live
[ownership inventory](../../docs/development/work/K1.0/ownership-inventory.md)
relates documented zones/roots, exports, measured dependencies and deferred owners
to enforced source/configuration; it is maintained by whichever packet changes the
tree it measures. Candidate measurements are not base measurements.

**Moving code is not migrating it.** A new directory, a new package name or a renamed
file decides where future work lands. It changes nothing about what the code does. Only
an accepted packet that implements the protocol does that. Say which of the two a change
was, and never report a move as progress against a protocol gate.

Two rules about that inventory are architecture, not tooling. A written boundary and an
executable one must be checked against each other, so a documentation change can never
quietly widen what the code may import. And a check that cannot read part of its input
must fail, not skip it: silently ignored evidence is indistinguishable from evidence that
passed. How the inventory is parsed and compared is owned by
[structural evidence rules](../../docs/development/015-structural-evidence-rules.md).

## Attribution and gates

Distinguish Kernel, Agent Runtime, Workflow Runtime, Driver, application, isolation,
laboratory, provider and evaluator. A lab denial can protect the world while the
subject still attempted an unauthorized send. A lab checkpoint earns no subject
recovery credit. Use the benchmark-owned methodology and independent surviving sinks.

K0/E0 supplies public controls; K1/E1 tests deterministic protocol races; K2/E2 adds
action controls; R1/E3 compares native fidelity; K3–K5/E4 injects real process death;
E5 tests application value; E6 tests construction/distribution. Fixtures and structural
passes are not gate acceptance. Record versions, schedules, attempted/accepted IDs,
raw observations, exclusions, missing data and continue/narrow/reuse/stop decisions.
Quality measurements hold Kernel fixed and repeat verified trials. Deterministic
invariant checks require no models. Serialization alone is not a restart test, and
restart alone is not storage-disaster recovery.
