# Future questions and experiments

**Status:** unresolved thinking, not accepted architecture or a second roadmap. The active sequence
is [K0–K5/R1/R2/D1/S1](development/001-current-status-and-roadmap.md). Current contracts live in the
[mental model](../mental-model/README.md) and its [reference index](../mental-model/reference.md). This file replaces the old
feature inventory with questions that can change an investment decision.

A question can be investigated cheaply before a release if its prerequisites exist. “Future” does
not mean everything waits until 1.0, and an experiment is not a commitment to support its prototype.
For each experiment record owner, public workload, baseline, exact versions, predeclared acceptance
criteria, evidence and adopt/narrow/reuse/defer/delete decision. Do not inherit numerical margins or
old H–N/P1–P7/experimental sequences as current release promises.

## Thinking already given a current home

| Previously unresolved family | Current decision / remaining uncertainty |
|---|---|
| PendingOperation versus ControllerResumption | Kernel owns action/wait records; Runtime owns internal async work. No generic Kernel suspension hierarchy. Native recoverability is still Driver-specific. |
| Stale continuation, output vs completion, timeout races | [Protocol](../mental-model/mechanisms/execution-cycle.md), [Runtime composition](../mental-model/mechanisms/composition.md), [action lifecycle](../mental-model/mechanisms/actions.md). Native conflict/re-evaluation strategy remains replaceable. |
| Exact consent, delegation, revocation and evidence | [Authority](../mental-model/mechanisms/authority.md). Policy representation/scaling and remote freshness need concrete implementations. |
| Typed Stage/child results, local joins, notes and Skills | [Runtime composition](../mental-model/mechanisms/composition.md); optional R2, not Kernel graph types. |
| Structured/Derived/Working/Artifact semantics and promotion | [State/memory](../mental-model/mechanisms/state.md). Optional application/Runtime vocabulary, not four Kernel stores. |
| Context compilation, historical retrieval, immutable snapshots | [Context/projections](../mental-model/mechanisms/context.md); advanced strategies below remain experiments. |
| Native jobs, forms, checkpoints, resource lifetime and delivery | [Integration](../mental-model/mechanisms/integration.md), [recovery](../mental-model/mechanisms/recovery.md), [resources](../mental-model/mechanisms/resources.md). Specific support awaits R1/K3 evidence. |
| Telemetry, raw model requests, privacy, attribution | [Evidence](../mental-model/mechanisms/evidence.md); no mandatory raw prompt journal. |
| Service/schema/Task mapping and imported package permission | [External protocols](../mental-model/mechanisms/external-protocols.md); protocol breadth remains demand-gated. |

## Q1 — Does an Execution Kernel earn its cost?

**Owner / trigger:** product and Kernel, now through E0/E5. Compose a native specialist, deterministic
validator, human decision and external action; separately test two independently useful jobs with
corrections/restart. Compare competent direct services plus database/policy, and one mature substrate.
Measure verified outcomes, recurring coordination obligations, repair effort, total latency/cost and
ongoing maintenance. Seek actual user adoption, not only internal demos.

**Decision:** continue the Kernel only if its shared boundary repeatedly helps. If only action/authority
helps, ship a smaller facade/conformance kit. If direct native composition suffices, stop broad Kernel
investment. A coherent ontology or large framework compatibility list is not product evidence.

## Q2 — Which persistence and native recovery contracts are supportable?

**Owner / trigger:** Kernel/Driver/deployment; R1 before K3 freezes. Compare one transactional path
with one mature durable substrate using the same fault fixture. Test submit-before-handle,
checkpoint-before-Outcome, external-success-before-receipt, stale native writer, incompatible code,
resource loss and cancellation. Include duplicated native/model billing and unknown spend.

**Decision:** choose the simpler adequate mechanism; remove the losing scheduler/journal prototype.
For a provider without query/idempotent submit or writer exclusion, expose unknown/refuse takeover.
Do not invent a per-model Kernel ledger or claim a mutable session is a checkpoint. Native checkpoint
migration and restore-before-disclosure need explicit provider evidence, not a universal retry flag.

## Q3 — Are richer supervision, waits or detached services necessary?

**Owner / trigger:** application/Runtime; after K4 examples expose a missing pattern. Baseline is
finite any-of waits, explicit reply correlations, authored failure policy and required owned children.
Test wait-all helpers versus repeated any-of, basic send/reply versus compound reply-and-ask, and
application retry policy versus a shared supervision library.

Measure wake/dispatch overhead, clarification liveness, duplicate work, debugging and cancellation
burden. Test true blocked cycles separately from cycles with eligible external escape. Detached work
must transfer responsibility atomically to an accepting durable owner; no fire-and-forget escape from
unknown actions. Long-lived sessions can remain application grouping rather than immortal Executions.

**Open question:** should the Kernel expose narrow atomic lifecycle mechanisms driven by
application-supplied policy for responsibility transfer/abandonment and for access/retention of
application- or provider-owned references, rather than requiring each application to invent those
mechanics? Test whether applications can register eligible Effect/child classes, allowed abandonment
rules, named durable owners, reference providers, access rules and retention classes while the Kernel
validates authorization, commits responsibility transitions, coordinates reference pin/release with
accepted records and deletion, preserves evidence, and refuses completion, disclosure or recovery when
a required policy-compliant disposition or reference guarantee is unavailable. Keep actual payload
storage, retry, reconciliation, compensation and business-success semantics application/provider-owned;
the Kernel must not become a universal orphan supervisor or artifact repository merely because it
provides these lifecycle primitives.

**Decision:** add only repeated useful helpers. Keep general graph joins Runtime-local. Defer a Kernel
wait-expression engine, global deadlock solver and arbitrary ownership transfer if explicit records
and application policy suffice.

## Q4 — What resource/state concurrency actually needs portability?

**Owner / trigger:** application services/R2, after a shared-state workload. Compare whole-view versus
field-level preconditions, branch-local deltas with authored merge, commutative operations and native
transactions. Test conflicts under real interleavings and reapproval when conflict resolution changes
an exact payload. Measure false conflicts, metadata leakage, retries and lost updates.

**Decision:** keep resource-specific semantics when they suffice. Promote a common version/precondition
or lease contract only for multiple consumers. Do not build universal multi-resource transactions,
CRDTs, a global mutex or a distributed database. A lease without target-side fencing is not exclusivity.

## Q5 — Which memory and historical-context policies improve useful work?

**Owner / trigger:** Runtime/application, with fixed Kernel and tasks that need continuity. Compare
simple asserted state + artifacts/recent history against optional derived memory and authorized historical
retrieval. Test source correction, temporal validity, supersession/contradiction, explicit promotion,
revocation and deleted sources. Compare simple lexical retrieval with native/vector/graph backends.

Measure verified task quality, stale-claim errors, provenance completeness, information disclosure,
retrieval latency and full extraction/storage cost. A claim provider may expose confidence/entities/
temporal fields, but use at least two consumers before defining a portable claim schema.

**Decision:** preserve the epistemic distinctions regardless of backend. If derived memory adds stale
beliefs without value, keep simpler state/history. Do not require extraction before every explicit
write or automatic promotion. Data deletion must truthfully reduce recovery/reproducibility claims.

## Q6 — Is a semantic context representation better than native context?

**Owner / trigger:** Runtime/provider, after two rendering strategies need comparable inputs. Compare
native request-only selection/compaction with typed selected sections and provider-specific renderers.
Separate selection identity from rendering identity; include raw observations, notes, evidence,
instructions and examples only as needed. Test prompt caching, context editing, retained provider state,
fresh-context handoff and long-horizon progress files/ledgers.

Measure quality, omitted evidence, coherence after correction/restart, total tokens/latency and
warm/cold cache behavior. Record hosted hidden scaffolding as unobservable; compare API requests
without pretending to know their exact final tokens. Self-hosted chat templates may expose more.

**Decision:** standardize a small Runtime context shape only if it preserves native behavior and
simplifies at least two uses. Otherwise retain native engines and a trace seam. A cached view is
replaceable; an in-flight binding/checkpoint is recovery truth and cannot be evicted on the same policy.

## Q7 — Do discovery, virtual namespaces or scouts justify extra steps?

**Owner / trigger:** Runtime/integration; actual catalog pressure after K2. Compare eager essentials,
flat deterministic retrieval, native search/describe/call, provider deferred loading, virtual category
views and an optional bounded read-only scout. Vary ambiguous/rare operations, permissions and model
capability. Resolve all views to stable typed refs; no canonical folder tree is required.

Measure task success, tool recall/wrong-tool rate, unauthorized metadata exposure, total scout/model
cost, hydration latency and extra turns. Keep essential controls visible. Scope frequency/ranking
signals and cache invalidation to avoid cross-principal leakage. Test dynamic provider hydration
against exact invocation bindings.

**Decision:** use native or flat search if it matches the richer design. A scout must preserve sources
and beat equivalent-budget direct retrieval. Its instructions and privileges remain application
composition, never a Kernel Scout primitive. See the [namespace research](research/jit-capability-namespace-and-context-scouts.md)
for optional sketches, not another implementation sequence.

## Q8 — Does code-mediated work need a new Program representation?

**Owner / trigger:** Runtime, after K2 action contracts; durable experiments after K3. Compare ordinary
tool turns, a developer function/Workflow, existing native code execution and a bounded suspendable
program for dependent reads/transforms/actions. Hold actual powers and containment constant. Test
revocation/schema change between calls, partial completion, unknown action and resource exhaustion.

Measure model turns, construction/repair rate, end-to-end cost, debugging and recovery burden. Each
resumed call needs current admission; batching does not make a transaction. General model-generated
code needs the declared trust/isolation profile. A bounded interpreter still needs fuel and size limits.

**Decision:** if ordinary code or native tools explain the win, reuse them and abandon a new language.
A shared Agent/Workflow substrate needs a separate simplification result from two control modes.
Universal foreign-graph compilation, portable ABI and Machine ontology do not follow automatically.
The [Machine research](research/arrokothi-machine-abi-and-program-model.md) is optional background.

## Q9 — Which Agent and multi-Agent scaffolds should survive?

**Owner / trigger:** Runtime/evaluation, anytime a fixed Kernel supports the task. Compare domain ACI
names/schemas, raw versus concise result projections, planning, generator/verifier loops, structured
notes, fresh-context workers and native strategies. Compare one strong Agent at equal total budget,
deterministic fan-out, homogeneous workers and a heterogeneous pair.

Verify environment outcomes; count failed trials, evaluator calls, handoff loss, duplicated work,
shared-state conflicts and cancellation cost. Hold model/config where testing a scaffold; separate
model changes from scaffold changes. Repeat stochastic trials and predeclare useful margins. An Agent
claiming success or a self-evaluator approving it is not independent evidence or exact consent.

**Decision:** promote a successful technique to application pattern or optional Runtime strategy first.
Delete mandatory planning/extra evaluators/resets when improved models no longer need them. No new
Planner/Evaluator Execution kinds, universal team model or fixed reasoning budget in Kernel semantics.

### Supervisory multi-Execution coordination

Evaluate an AI supervisor over delegated coding workers as an application/Runtime experiment with the
Kernel fixed, not a K4/K5/S1 gate or a new Kernel role. The existing
[output-to-input bridge](../mental-model/mechanisms/output.md#observation-does-not-send-input)
provides the boundary: UI observers read independently; an authorized application adapter selects
worker observations and submits explicit addressed input to the supervisor for a later eligible
Activation. Observation alone never wakes it. No Kernel subscription actor is needed.

The experiment must declare bounded filtering/aggregation and omission policy. Retain source
Execution/output IDs (or source sets for aggregates), actual producer provenance, causation and
selection/aggregation revision; a summary remains derived evidence. Persist the selected immutable
input and retry identity before sending, and advance the forwarding checkpoint only with mailbox
acceptance or recoverable pending delivery. Test bridge and supervisor restart, lost receipts,
deduplication-window expiry, bounded queues/coalescing and explicit replay gaps. Do not silently
regenerate a different summary under a retried input identity. Supervisor input acceptance remains
separate from processing acknowledged by its Outcome. Recheck source disclosure and destination
input authority, including disclosure to the supervisor's model, on restore/forwarding.

Treat delayed observations as historical claims: bind the target Execution lifetime and relevant
resource revision, inspect current state before intervention, and use resource-enforced preconditions
where required; inspection alone cannot close a mutation race. Bound feedback with explicit source/
destination selection, causation-aware echo suppression and finite forwarding/intervention budgets.
Test a worker emitting in response to each correction; input deduplication alone cannot stop a loop
that creates fresh output identities.

Use existing message/correction and authenticated cancellation paths with separate permissions;
a Runtime decision does not itself grant control authority. An application adapter may execute an
authorized cancellation request through the existing control plane; no generic cancellation Effect
or supervisor-control API is assumed. Correction is queued input, not preemption; cancellation fences
Kernel progress/admission but does not prove native work stopped or undo an admitted action. General
pause/resume, preemption and reassignment remain future questions, not capabilities of this experiment's
baseline. Resource inspection uses the owning service's permitted interface.

Intelligent supervision is advisory/strategic detection and intervention. Hard concurrency safety
remains [native/resource ownership and exclusion](../mental-model/mechanisms/resources.md#shared-mutation),
including across different Executions. A worker's `file_write: planned | started | completed` can be
structured Emission content; acceptance proves that it reported the activity, not file mutation,
completion or ownership. Permitted diagnostic/tool traces retain their own evidence limits and do
not inherit accepted-output replay guarantees. Authoritative resource state requires evidence from
the owning/enforcing service. Use intentionally exposed accepted progress, public reasoning summaries,
permitted traces and resource state; correctness must never require private hidden model reasoning.

Compare against no supervisor and deterministic conflict checks with the same native writer exclusion,
permissions and total budget. Measure verified outcomes, harmful/missed interventions, stale decisions,
reaction latency, repeated work and cost while a UI observes concurrently. Promote useful behavior to
an application pattern first; propose a Kernel extension only if repeated applications demonstrate an
invariant that output reads, authenticated routing and existing controls cannot express. No universal
pub/sub, supervisor hierarchy, event-processing engine or resource-lock system follows from the trial.

## Q10 — Which policy/discovery mechanisms need a shared adapter?

**Owner / trigger:** application/policy; repeated relationship or catalog-scale needs. Compare direct
policy checks with a mature policy backend and optional bulk filtering/enumeration. Test transitive
revocation, changing ownership, metadata disclosure and remote decision freshness. Evaluate grant
reference/expiry/provenance representations without requiring one token format.

**Decision:** choose the simpler adequate policy implementation. Keep model-visible discovery below
current disclosure permissions. If remote policy cannot supply the promised ordering, constrain the
profile or state the freshness limit; do not let a stale cache masquerade as instantaneous revocation.
Federated attenuation proofs/key infrastructure require actual administrative trust boundaries.

## Q11 — Which protocol and package surfaces deserve support?

**Owner / trigger:** Driver/SDK, a concrete integration need. Extend MCP Tools toward Resources,
Tasks, input/elicitation or subscriptions only with a versioned mapping and round-trip/refusal tests.
Test opaque A2A/service handles for identity, pause/auth requirements, output, cancellation and expiry.
Prefer native APIs when their fidelity is stronger. Optional UI/telemetry bindings project accepted
truth and cannot redefine it.

For Skills compare native packaging with a narrow common manifest; preserve input/default bindings,
requested powers, assets and exact versions. Composition-backed export may be lossy. Publisher identity,
signatures, lockfiles and revocation improve supply-chain provenance, not action authority.

**Decision:** stabilize shared descriptors after two independent consumers; refuse unsupported rich
content/schema semantics. Do not build a marketplace, full protocol parity or universal package importer
before useful demand. Use supported libraries and check actual distribution/support obligations at S1.

## Q12 — Which deployment guarantees justify additional infrastructure?

**Owner / trigger:** deployment, after K3 for a demonstrated profile; D1 only if containment is claimed.
Test binding loss versus temporary unavailability, allocate-before-handle leaks, cleanup, persistent
workspace ownership, credential rotation, active/dormant cost and fairness. Compare an existing native
backend/managed sandbox with the minimum integration; avoid a custom host fleet.

Multiple workers/remote hosts, partitions, backup/restore, storage disaster and multi-region recovery
need distinct fault models. Federation, workload identity, remote attestation and hostile multi-tenancy
must name who is trusted and what can be enforced. Information-flow/declassification experiments need
explicit read-to-output threat models; ordinary authority does not prevent all authorized exfiltration.

**Decision:** keep trusted single-domain operation if adequate. Reuse infrastructure or narrow the
market/profile if maintaining it requires a platform beyond the team's capacity. Resource retention,
privacy deletion and recovery promises cannot all be unlimited; publish their tested intersection.

## Q13 — What needs to stabilize in the public SDK and operator surface?

**Owner / trigger:** SDK/S1, after selected R2/K4/K5 applications exist. Maintain public import and
stock-authoring matrices; test clean packed consumers and explicit static preflight. Compare helpers
against ordinary functions before adding a first-class artifact store, mandatory session or graph API.
Dynamic policy remains runtime truth and preflight must not auto-grant missing permissions.

Review concept, public API, model-facing and protocol/UI names separately through comprehension and
operation-selection examples. Fix confusing names once before compatibility commitments; do not
rename for industry fashion. Preserve a deterministic offline SDK example and explicit migration/refusal.

A read-oriented inspector should help explain waiting, unknown work, exact approval and retention
without exposing private prompts by default. Test incident-resolution value before visual authoring.
Studio/Cloud/enterprise controls belong to demand-driven product work behind supported APIs, not Kernel
release obligations. OSS/hosted packaging and pricing remain product choices requiring cost/adoption
evidence; no commercial feature is a new semantic primitive.

## Questions deliberately closed or rejected

Do not reopen these merely because a legacy term disappears: CREATED as a ceremonial lifecycle;
Kernel-owned live-promise resumptions; closed Agent/Workflow kinds; text-only local dataflow; mandatory
four-form Kernel memory; automatic ancestor note/credential sharing; a separate hosted-declarative
trust category; a protocol Task equated with Execution; signatures or exposure treated as grants;
retrospective cancellation/rollback of arbitrary external work.

A demonstrated counterexample may change an accepted contract through architecture review. It must
name the missing guarantee and simpler alternatives, not only an appealing abstraction. The
[detail-design review](development/005-detail-design-review.md) records legacy knowledge disposition
so future work does not depend on that directory remaining in the repository.
