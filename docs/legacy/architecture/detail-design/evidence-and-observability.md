# History, inspection and evidence

> **Superseded architecture, retired 2026-09-14.** The current architecture is the [mental model](../../../../mental-model/README.md) and its [reference index](../../../../mental-model/reference.md). Phrases below such as "target contract", "current design" or "this page owns" describe this document as it stood then, not current authority; some rules here were later corrected. [What replaced it](../../README.md).

**Owner:** Kernel accepted facts; Runtime native traces; application/domain evidence; deployment
physical observations. **Status:** required boundary evidence starts at K0/K1, operating depth at K5.
[Kernel](../kernel.md#history-and-retention) owns History; this page specifies useful projections and
retention constraints without a mandatory telemetry vendor or event-sourcing implementation.

## Evidence levels and authoritative stores

| Record | What it establishes | What it cannot establish alone |
|---|---|---|
| Accepted input/Outcome receipt | Exact request accepted at Kernel revision | Native computation or external success |
| Admission/attempt record | Policy/consent decision and dispatch ownership | Sink received/performed action |
| Authenticated settlement | Adapter's validated evidence for a particular attempt | More than that adapter/provider can actually observe |
| Native checkpoint/trace | Native state/behavior under its declared codec/owner | Kernel acceptance, safe retry or complete mediation |
| Independent application/sink state | Business result or physical attempted action | Which layer prevented other paths without attribution |
| Host/isolation telemetry | Observed process/resource activity | Prevention unless an enforcement test establishes it |
| Model text/self-reported inspect | A claim made by the subject | Committed state, consent or task success |

Kernel History retains causal edges needed to answer: which input batch led to this progress; which
Outcome proposed this action; which policy/approval admitted it; which attempt produced this evidence;
which child/request is awaited; who owns uncertainty and cleanup now. Acceptance order is per owning
record/domain, not a fictitious total order over all provider clocks.

Keep original facts immutable where promised. Corrections/reconciliation append evidence revisions;
they do not overwrite a consumed Event or terminal result. Storage may compact records while preserving
the declared receipts, deduplication and outstanding obligations. History need not be an executable
replay log; a telemetry span never becomes the authoritative lifecycle record.

## Minimum inspection contract

K1 inspection should show lifecycle, accepted progress revision, current Activation/epoch or wait,
queued/acknowledged input status, terminal result and protocol failure. K2 adds action dispositions,
consent, physical attempts, certainty and owner. K3 adds recovery mode/reason and required missing
resources/versions. K4 adds child/message correlations. K5 adds retention horizon, output replay gaps,
cleanup/admission pressure and the actual support profile.

A recovery-held RUNNING Execution must be visibly held, with reason and allowed next actions; it must
not look like healthy computation. A CANCELLED Execution with a live remote request must show that
obligation. Expose read-only evidence first; reconciliation, cancellation and authority changes use
authenticated control paths with their own receipts, never ad-hoc edits to stored status.

Inspection is access-controlled and field-scoped. Parent ownership does not expose all native progress,
notes, prompts or another principal's resource metadata. Unknown/denied lookups must not reveal private
existence. Operator privileges to inspect are separate from authority to re-execute or settle work.

## Model invocation evidence

For evaluation/debugging where allowed, record native invocation/run identity, logical Execution and
Activation correlation, input/state revision, selected-context and callable-binding identity, resolved
model/config, observable provider request, output/tool selections, usage/latency and resulting Runtime
decision. Link raw trusted tool result separately from text shown to the model.

Raw prompts, private reasoning and complete transcripts are not mandatory production persistence.
Prefer concise state and scoped source references; capture content only under the declared retention/
access policy. If a provider hides request scaffolding, exact tokenization or cost, record unavailable
or estimated, not zero. Sampling and redaction constrain reproducibility and must be disclosed.

Hermes' [context engine](../../../../../hermes-agent/agent/context_engine.py) notes that turn-completion hooks
are best-effort and may be skipped on abnormal exits. Such hooks are useful diagnostics but cannot
be the sole durable commit record. CrewAI's [tool hooks](../../../../../crewAI/lib/crewai/src/crewai/hooks/tool_hooks.py)
retain raw results separately from modified presentation; preserve that distinction when instrumenting.

## Retention, deletion and cursors

Declare accepted payload/receipt, action/evidence, native checkpoint, output cursor, artifact and
trace retention independently. Pending obligations pin necessary evidence only for the supported
period. Dedupe tombstones can retain identity/content binding after permitted payload deletion, with
access control; hashes of sensitive low-entropy values are not automatically anonymous.

Deletion that removes recovery-critical data explicitly narrows the guarantee: recovery unavailable,
source unavailable, or cursor expired. Do not fabricate empty successful reads. Preserve permitted
minimal causation/disposition metadata and record who authorized deletion. An expired idempotency key
must not silently become a new consequential action; require a fresh intentional request or explicit
refusal according to the published scope. Infinite deduplication is not implied.

Authorized historical-observation retrieval may feed Runtime context without exposing raw storage
rows or making History an Agent memory product. Summaries remain derived representations with source
and omission/retention limits; they cannot replace exact action arguments or consent binding.

## Failure attribution and evidence loop

Use the [benchmark methodology](../../../../../benchmark/docs/methodology.md) owner ledger. Distinguish Kernel,
Agent Runtime, Workflow Runtime, Driver, application, isolation, laboratory, provider and evaluator.
A lab denial can keep the world safe while still recording the subject's unauthorized attempted send.
A lab checkpoint cannot earn subject recovery credit. A native form's reliable resume belongs to the
native Runtime/Driver claim unless the Kernel's own routing is separately exercised.

K0/E0 defines claims and independent observations. K1/E1 uses deterministic fake Runtimes, enumerated
races and immutable receipts. K2/E2 adds unsafe/safe/state-losing controls. R1/E3 compares native fidelity.
K3–K5/E4 injects real process death with an independent surviving sink ledger. E5 compares application
value; E6 tests construction/distribution. Existing tests are baseline evidence, not passed future gates.

Capture versions, fixture/fault schedule, accepted and attempted identities, raw observations, exclusions,
known missing data and the resulting continue/narrow/reuse/stop decision. Quality measurements keep
Kernel fixed and use verified outcomes across repeated trials; deterministic invariant tests do not
need models or statistical reliability claims. Reuse ordinary trace/metrics tooling as a projection.
No custom tracing database or inspector product is required to establish these contracts.
