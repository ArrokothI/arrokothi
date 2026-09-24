# Reviewable work packets and status ledger

This is the single current packet-status owner. [006](006-development-process.md) owns process;
[001](001-current-status-and-roadmap.md) owns milestone obligations.

K0 is closed. K1.0 and K1.1, including their cumulative corrections and reference supplement,
are accepted, integrated and owner-closed. K1 remains open; no E1 result is claimed. K1.2 was
separately released by the owner on 2026-09-16 and has no implementation candidate yet.
The 2026-09-22 owner instruction releases DOCS-CLEANUP-01 as bounded repository maintenance,
without advancing any Kernel gate.

**Owner hold on starting K1.2, 2026-09-23.** K1.2 stays released, but its implementation starts
only after (1) independent review of K1.1-correction-02, DOCS-CLEANUP-01 and PLAN-01, (2) the
owner's rewrite of `mental-model/mechanisms/creation.md`, and (3) an owner final check. A launcher
must not start K1.2 before the owner records that these are done.

Historical review rounds, invalidations and superseded holds remain in the [archive](archive.md);
this page keeps current dispositions and pinned evidence locators.

## How to read a packet

Each row is a bounded implementation contract seed, without a promised review-round count. Several
sessions may correct one packet; never claim a fixed time estimate. The packet inherits its parent
roadmap section in full **for the responsibility assigned here**, the design/touchpoint row below,
and applicable [process obligations](006-development-process.md). Its final gate packet checks
the entire parent without gaps.
If inspection shows even a packet is too large, propose a split preserving criterion IDs/dependencies
and obtain owner adoption before broad implementation. Split by observable boundary, not files or
an arbitrary line budget. K3/K5 experimental packets may take multiple sessions with one fixed contract.

Entry requires all listed dependencies independently ACCEPTED and integrated, owner release, available
required evidence inputs and a clean review base. Display order breaks ties; corrections take priority.
R1.1 can run before K2; K2 is required for its mediated paths. R2 and S1.1 can begin after K2 without
blocking K3. R1.3 is deliberately later than the initial structural probe. External E fixtures precede
candidate implementation, including a milestone's first structural or preparatory packet; results
close the relevant gate packet. Prepared fixtures are an entry prerequisite, never a passed gate,
and structural work earns no evidence credit. A missing benchmark artifact blocks
the gate, not a wholly independent packet. The owner must explicitly release that alternative.

Apply 006's repository, evidence and acceptance obligations, selecting proof methods under
[012](012-review-methods.md) for this packet's actual claims. Non-goals remain other packet
responsibilities, provider internals in Kernel types, speculative future-plan extensions and
unsupported durability/isolation claims. Scaffolding must explicitly refuse unsupported APIs.

At start create `work/<id>/contract.md` with stable criterion IDs, inherited requirement mapping,
exact sources/touchpoints found in the current tree, selected proof methods, interacting boundaries,
command plan, evidence owners and any limits. Map criteria to observable behavior and distinguishing
counterexamples, not only required sections. Assign one normative home per rule and cross-packet
interaction obligations. Keep historical findings in linked attempts rather than the live contract.
Routine coding choices may be resolved by the agent within the settled contract. This elaboration
cannot change semantic requirements or invent success thresholds. Owner decisions are needed for
semantic amendments, demand/claims, experimental margins/budgets and substrate/value adoption.
A reviewer verifies the contract diff as well as the code.

## Design and likely code/test locations

Paths are navigation hints, not required package layout. Resolve moved paths from the current tree.
All packets start at [the mental model](../../mental-model/README.md) and follow its owning
concept/mechanism. The [per-packet maintenance map](../../mental-model/roadmap.md) supplies precise
Layer-3 links; source hints below remain relative to repository root.

| Parent | Canonical/detail sources | Likely touchpoints; retained test families | Explicit exclusions |
|---|---|---|---|
| K0/K1 | [execution-cycle](../../mental-model/mechanisms/execution-cycle.md), [waits](../../mental-model/mechanisms/waits.md), [lifecycle](../../mental-model/mechanisms/lifecycle.md), [evidence](../../mental-model/mechanisms/evidence.md) | core runtime/harness, execution/context, ports/controller/runtime-store/scheduler, reference store; conformance execution/contracts, SDK host | No database, production native recovery, cognition rewrite; K1 initially refuses Effects until K2 |
| K2 | [authority](../../mental-model/mechanisms/authority.md), [actions](../../mental-model/mechanisms/actions.md), [communication](../../mental-model/mechanisms/communication.md), [external protocols](../../mental-model/mechanisms/external-protocols.md) | core runtime/effect-processor, schema/catalog/policy ports; effects, confirmation, reauthorization and MCP tests | No durable restart claim, remote instantaneous policy, action rollback or universal pending hierarchy |
| R1 | [integration](../../mental-model/mechanisms/integration.md), [recovery](../../mental-model/mechanisms/recovery.md), [resources](../../mental-model/mechanisms/resources.md), [context](../../mental-model/mechanisms/context.md) | new narrow Driver boundary outside core semantics; provider package tests and native paired fixtures | No four maintained Drivers, graph importer, forced durable live callback or untested fidelity |
| K3 | [recovery](../../mental-model/mechanisms/recovery.md), [resources](../../mental-model/mechanisms/resources.md), [actions](../../mental-model/mechanisms/actions.md) | runtime-store/scheduler/reference and chosen storage/host adapter; actual process fault runner and independent ledger | No two production backends, disk disaster, multi-region, arbitrary native retry or new host fleet |
| K4 | [communication](../../mental-model/mechanisms/communication.md), [authority](../../mental-model/mechanisms/authority.md), [output](../../mental-model/mechanisms/output.md), [waits](../../mental-model/mechanisms/waits.md) | child-link, structural-budget, event-router, input requests, output read boundary; composition/interaction plus process faults | No pub/sub actors, automatic forwarding, arbitrary detach, Kernel graph joins or universal sessions |
| R2 | [composition](../../mental-model/mechanisms/composition.md), [state](../../mental-model/mechanisms/state.md), [context](../../mental-model/mechanisms/context.md) | stock controllers, workflow adapters/control, SDK exports, application examples; Agent evals/Workflow tests | No new model loop or graph engine required, universal memory or foreign parity |
| K5 | [resources](../../mental-model/mechanisms/resources.md), [evidence](../../mental-model/mechanisms/evidence.md), [recovery](../../mental-model/mechanisms/recovery.md), [output](../../mental-model/mechanisms/output.md) | storage/admission/output/inspection and native resource adapters; operations and application comparison fixtures | No production SLA without measurement, infinite retention, Kernel token ledger or inspector product |
| D1 | [resources](../../mental-model/mechanisms/resources.md), [evidence](../../mental-model/mechanisms/evidence.md) | selected external sandbox adapter and physical adversarial fixtures | No custom sandbox; no claim derived from benchmark construction isolation |
| S1 | [external protocols](../../mental-model/mechanisms/external-protocols.md), [integration](../../mental-model/mechanisms/integration.md), [recovery](../../mental-model/mechanisms/recovery.md), [evidence](../../mental-model/mechanisms/evidence.md) | package manifests/build/exports, SDK, guides, skills, clean consumers and benchmark E6 | No broad protocol parity, all P0X campaign, leaderboard or architecture-completeness release gate |

## Packet contracts

### K0.1 — Protocol decisions and legacy disposition

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k01); also inspect affected dependencies.

**Dependencies:** —. **Scope:** Produce a versioned contract worksheet: equality/limits, scoped receipts, batches, three clocks, cancellation/terminal obligations, progress compatibility, locally ordered policy. Map every 001 K0 boundary to an assertion; classify legacy data as migratable, legacy-only or refused.

**Acceptance:** Every boundary has one owner and an unambiguous observable outcome; contradictory semantics are blocked, storage/wire choices justified without new Kernel concepts.

### K0.2 — Public controls and K0/E0 gate

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k02); also inspect affected dependencies.

**Dependencies:** K0.1. **Scope:** Build the smallest public delayed-Runtime/typed-output/input-wait fixture, independent sink and direct baseline specification. Include both public application shapes and unsafe/state-loss control specifications; obtain pinned E0 evidence.

**Acceptance:** All K0 exit requirements and E0 ownership observations covered; fixture preparation is explicitly distinguished from later K1 candidate success.
### K1.0 — Target boundary and legacy quarantine

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k10); also inspect affected dependencies.

**Dependencies:** K0.2, and the benchmark-owned E1 fixture preparation required before K1
implementation. K1.0 is K1 implementation, so it cannot start on K0.2 acceptance alone; the required
E1 fixtures must already be built. See the
[structure assessment](013-structure-and-evidence-sequencing.md#benchmark-interlock-and-planning-concerns).
**Scope:** Establish an enforced landing zone for target Kernel work and an
explicit quarantine for the current 0.8.x implementation. Inventory source/export ownership and
cross-boundary dependencies; record concrete paths and allowed imports. Add meaningful transitive
import guards with forbidden-edge controls, preserve existing public imports/behavior and useful
regressions, and identify later extraction/bridge owners. See the
[structure assessment](013-structure-and-evidence-sequencing.md) for the bounded approach.

**Acceptance:** New Kernel work cannot depend on legacy/native Runtime internals through direct,
type-only or barrel imports. Guards demonstrate rejection on representative forbidden edges rather
than passing only an empty graph. Current SDK/examples/consumer behavior and existing tests remain
working and explicitly legacy; every deferred extraction is assigned. No new protocol implementation,
no-op target API, wholesale native Runtime rewrite, E1 pass or package-release claim. Its entry
record names the prepared E1 fixture identities it relied on; their existence and this packet's
structural pass close no E1 criterion. K1.4 rechecks
these structural obligations with actual behavior. The original planning seed did not release this
packet. Its later owner release, historical acceptance/invalidation, correction records and cumulative integration are
recorded in the status ledger below, [cleanup-01](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.0/cleanup-01.md) and [integration-01](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.0/integration-01.md).

### K1.0-correction-01 — Whole-cell inventory fidelity

Closed historical packet; current cumulative disposition is in the status table.
The [sealed contract](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.0-correction-01/contract.md)
preserves its exact criteria and authority. Continuing rules live in the canonical
reference and [structural evidence rules](015-structural-evidence-rules.md).

### K1.0-correction-02 — Collection identity in inventory comparison

Closed historical packet; current cumulative disposition is in the status table.
The [sealed contract](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.0-correction-02/contract.md)
preserves its exact criteria and authority. Continuing rules live in the canonical
reference and [structural evidence rules](015-structural-evidence-rules.md).

### K1.1 — Create, reserve and asynchronous dispatch

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k11); also inspect affected dependencies.

**Dependencies:** K1.0 as integrated, including corrections 01–02. **Scope:** Implement atomic create/initial input, scoped identity, opaque pinned progress, reservation and Driver dispatch; expose minimum inspection. Own post-creation input ingress under the Input ID triple as [creation](../../mental-model/mechanisms/creation.md) states it: exact replay returns the retained disposition, conflicting content under an existing key is recorded and refused, the same key text from different producers never collides, and input to a terminal or unknown destination is refused with an inspectable reason. Refuse unsupported next forms until their packet lands.

**Acceptance:** Delayed fake A does not prevent B dispatch on the same coordinator; retries preserve identity/batch, reservation does not acknowledge input, no Agent/Workflow discriminator in the new boundary. Ingress replay, conflict, cross-producer and terminal-destination cases behave as scoped above whether or not any wait exists; wait matching itself remains K1.3.

### K1.1-correction-01 — Accepted-work correction for K1.1 review findings

Closed historical packet; current cumulative disposition is in the status table.
The [sealed contract](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.1-correction-01/contract.md)
preserves its exact criteria and authority. Continuing rules live in the canonical
reference and [structural evidence rules](015-structural-evidence-rules.md).

### K1.1-reference-01 — Faithful reference maintenance

Closed historical packet; current cumulative disposition is in the status table.
The [sealed contract](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.1-reference-01/contract.md)
preserves its exact criteria and authority. Continuing rules live in the canonical
reference and [structural evidence rules](015-structural-evidence-rules.md).

### K1.1-correction-02 — Bounded refusal cost in value capture

**Owner release:** explicit owner instruction, 2026-09-23. **Dependencies:** K1.1 as integrated.
**Scope:** [contract](work/K1.1-correction-02/contract.md). Make reviewable the capture change that
keeps a running canonical byte count and stops past the per-root limit, integrated in `66e9e84`
before review, and record the three value obligations the values rewrite adopted
([decision 01](work/K1.1-correction-02/decision-01.md)). The original K1.1 ACCEPT is unchanged.

**Acceptance:** Refusing a shared-reference value stops after about the limit's worth of reading;
the running count is exact, so no value the finished-bytes check accepts is refused; every prior
K1.1 test passes unchanged; the decisions state their relation to accepted material.

### K1.2 — Outcome acceptance and receipts

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k12); also inspect affected dependencies.

**Dependencies:** K1.1. **Scope:** Implement whole-envelope validation, receipt replay/conflict, epoch/revision checks, whole-batch acknowledgment, progress recording, continue/complete/fail. Own authorized takeover as [identity](../../mental-model/concepts/identity.md) and the [retry-versus-takeover table](../../mental-model/mechanisms/execution-cycle.md) state it: the same Activation ID advances its writer epoch only through an authenticated control, the older attempt is fenced with no staleness window, and an ordinary retry never advances the epoch. Own the recovery hold for unavailable pinned progress code: the Execution stays RUNNING under an inspectable protocol-failure/recovery reason with progress and revision intact, and the hold clears when compatible code is available; this is [execution-cycle](../../mental-model/mechanisms/execution-cycle.md) exchange handling, not K3 process-fault recovery, and claims no persistence. Record Emission identities and the typed terminal result at acceptance; output observation, replay and cursors stay K4.4. Refuse Effects as [execution-cycle](../../mental-model/mechanisms/execution-cycle.md) fixes for K1: the whole envelope is rejected, no Effect ID, denied-action or admission record is created, and the Activation stays open. Refuse `complete` proposing any obligation whole, since every obligation kind is unsupported before K2.3; refuse not-yet-supported waits until K1.3. Own the late-report cases the [delivery reporting boundary](../../mental-model/mechanisms/execution-cycle.md#delivery-reporting-boundary) assigns to K1.2: after the exchange resolves or is taken over, a late delivery report updates only its original retained operational record. After an accepted `continue`, the next dispatch is a new exchange, as the [retry-versus-takeover table](../../mental-model/mechanisms/execution-cycle.md#retry-versus-takeover) states: new Activation ID, newly selected batch, and a starting epoch per the implementation's recorded choice. No submission path resolves "the current Activation" or the current epoch on the caller's behalf; an Outcome names the exchange and attempt it answers (owner amendment PLAN-01).

**Acceptance:** Stale/conflicting/malformed proposals change no accepted state; exact duplicate returns original receipt; one progress writer and typed terminal/output semantics. A stale-epoch proposal after takeover is refused while the new epoch commits; a retry-only sequence shows no epoch change. A missing-code hold is distinguishable by inspection from a failed or waiting Execution and reverts to ordinary progress without a new revision. An Effect-bearing envelope leaves no K2-style record that E2 attribution could mistake for a denial. A late Outcome for an already resolved Activation returns its original receipt when it is an exact duplicate and is otherwise refused with no state change, including after the next exchange has started; it never commits into the new exchange. A late delivery report after resolution or takeover changes no receipt, epoch, reservation, acknowledgment or lifecycle.

### K1.3 — Wait and cancellation races

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k13); also inspect affected dependencies.

**Dependencies:** K1.2. **Scope:** Implement finite any-of, input subscriptions, eligible unmatched accounting, wait generation/deadlines, out-of-band cancellation and terminal disposition. Of the three clocks in [operations](../../mental-model/concepts/operations.md), this packet implements wait deadlines and routes Execution-deadline expiry through the same cancellation path; scheduler leases remain K3. Matching consumes input already admitted by K1.1 ingress; this packet adds no second ingress rule.

**Acceptance:** Before/during/after wait arrivals, stale timers, unmatched backlog and cancel/complete schedules lose no accepted input or wake and never reopen a terminal execution. A stale timer from a superseded wait generation is discarded with an inspectable reason and no state change; Execution-deadline expiry and explicit cancellation produce the same terminal disposition shape. The five [small distinguishing examples](../../mental-model/mechanisms/waits.md#small-distinguishing-examples) pass as separate cases, since one example cannot tell the plausible wrong selection rules apart. A late delivery report after cancellation changes no logical state.

### K1.4 — Legacy bridge and K1/E1 gate

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k14); also inspect affected dependencies.

**Dependencies:** K1.3. **Scope:** Integrate the new boundary with SDK host driving; bridge viable existing controllers as private Runtime machinery. Port useful conformance and document unsupported legacy features.

**Acceptance:** Full K1/E1 matrix and K1.0 structural obligations pass, including actual accepted asynchronous exchange through the supported entry; legacy resumptions do not drive new Kernel types/stores. Existing supported behavior is preserved or explicitly migrated/refused.

**Entry checks (owner amendment PLAN-01).** Before K1.3 closes, confirm with the benchmark owner that the E1 fixtures drive the new supported entry: K2.1 and R1.1 wait on this gate, and an unavailable fixture makes K1.4 BLOCKED_EXTERNAL rather than a reason to weaken E1. The K1.4 contract first assesses its own size; if the bridge/port and the gate cannot be reviewed coherently together, it proposes a split under the rule above, keeping `K1.4` as the bridge identity that sealed records and code comments already cite. Legacy names the bridge meets are routed through the [reference index's legacy rows](../../mental-model/reference.md#common-search-terms).

### K2.1 — Atomic Effect intents

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k21); also inspect affected dependencies.

**Dependencies:** K1.4. **Scope:** Commit all intents with progress/input/output/next state, bind same-Outcome keys and dispatch only from accepted records. Record attempts separately.

**Acceptance:** Malformed Effect 2 rejects the envelope with zero dispatch; failure attempting Effect 2 preserves Effect 1 evidence and Effect 2 intent; invalid/stale Outcome dispatches nothing.

### K2.2 — Concrete schema and admission

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k22); also inspect affected dependencies.

**Dependencies:** K2.1. **Scope:** Select/license-review a mature validator and narrow schema subset; validate custom/stock/MCP paths. Bind final operation/input; define unknown operation and overlapping grants; order consent, withdrawal/revocation and dispatch epoch. Close the `OPEN(K2.2)` marker in [operation](../../mental-model/concepts/actions.md#operation) by stating the selected validator and enforced subset. Ordering the dispatch epoch meets the open question of whether an action dispatcher is its own concept (`OPEN(unassigned)` in [admission](../../mental-model/concepts/actions.md#admission-and-physical-action-attempt)); settle it with the owner or leave it explicitly open. For MCP paths, pin the MCP version and use items 8–9 of the [MCP mapping backlog](../research/mcp-arrokothi-semantic-mapping.md#9-research-and-experiment-backlog) as counterexamples: refuse rather than silently weaken an unsupported schema feature, and keep outcome certainty through protocol and tool errors.

**Acceptance:** Zero executor calls for malformed/refused requests; stale ownership, payload/version/account change, duplicate approval, grant overlap and correction/admission races cannot bypass exact admission.

### K2.3 — Settlement, uncertainty and completion

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k23); also inspect affected dependencies.

**Dependencies:** K2.2. **Scope:** Implement trusted attempt evidence, duplicate/conflict and immutable refinements, result validity versus certainty, safe retry/refusal and required-work accounting.

**Acceptance:** Malformed response after possible success cannot fabricate failure; acknowledging unknown cannot permit completion; late authenticated evidence survives cancellation; unresolved non-idempotent work is never blindly retried.

### K2.4 — Input requests and K2/E2 gate

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k24); also inspect affected dependencies.

**Dependencies:** K2.3. **Scope:** Implement immutable human request/schema/eligible responder intent and authorized admission/disclosure with correlated denial; same-Outcome wait. Run all K2 and native-attribution controls. Give MCP's input-required/elicitation pattern an explicit disposition, mapped to human input requests or refused.

**Acceptance:** Display settles nothing and is not consent; safe/unsafe/state-losing subjects get distinct attributed verdicts despite laboratory protection; complete K2/E2 gate passes.

### R1.1 — First real native boundary

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#r11); also inspect affected dependencies.

**Dependencies:** K1.4. **Scope:** Probe Hermes unless the owner-selected application requires another Runtime; preserve native context/tools and declare identity, pause/output/cancel, resources and lost-submit behavior. Mediated paths additionally require K2.4. In the support record, map which layer retries which operation (transport, substrate, Driver submission, native Runtime, provider SDK), whether identity survives recovery and which counters reset, and record each native feature as preserved, replaced, disabled or unsupported ([research P4/P7](../research/temporal-04-other-candidates.md#proposed-changes-to-mental-model-for-later-review)).

**Acceptance:** Real native-only versus thin-Driver observations with fake model/services where feasible; every unsupported recovery/mediation capability refused or declared. Same-process-only is a valid bounded probe.

### R1.2 — Second boundary and R1/E3 initial gate

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#r12); also inspect affected dependencies.

**Dependencies:** R1.1, K2.4. **Scope:** Probe one bounded CrewAI or published Dify application before freezing a shared extension. Compare submit/pause/result mapping and produce K3 constraints.

**Acceptance:** Two independent Runtime designs inform the boundary; E3 initial structural evidence covers the claimed profile and known gaps. No live quality or production durability claim inherited.

### K3.1 — Fault harness and substrate experiment contract

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k31); also inspect affected dependencies.

**Dependencies:** K2.4, R1.2. **Scope:** Build real worker/host kill control with surviving store/sink ledger. Pin the full 001 K3 crash matrix and measurement protocol. Select one mature comparator after API/operating/license review. Use the [substrate prototype questions and rejection-capable comparison](../research/temporal-03-integration-and-experiments.md#what-a-substrate-prototype-must-establish) as input to the criteria the owner approves, including how a long history is bounded without losing Execution identity, deduplication windows, action obligations, input accounting or cursors.

**Acceptance:** Fault triggers demonstrably kill processes; oracle survives independently; every K3 window, repeat plan, correctness and cost measurement is assigned before prototypes. Owner approves comparison criteria.

### K3.2 — Narrow transactional persistent candidate

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k32); also inspect affected dependencies.

**Dependencies:** K3.1. **Scope:** Implement persistent accepted truth, intents/receipts, readiness reconstruction and phase-specific recovery on one transactional path. Keep effects externally observable.

**Acceptance:** Actual process kills at input/dispatch/Outcome/action/settlement/terminal boundaries preserve records or truthful unknown/refusal; no empty-store fallback. Record remaining native-specific windows for K3.3.

### K3.3 — Native recovery and resource windows

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k33); also inspect affected dependencies.

**Dependencies:** K3.2. **Scope:** Implement/test safe reattach/replay/refusal, stale-host exclusion, checkpoint pin/delete, allocation-before-handle, revoked replay disclosure and unavailable code/checkpoint/resource behavior.

**Acceptance:** Real old-host-alive and two-store crashes show native exclusion or refusal; no fabricated restoration, blind submit or accepted deleted checkpoint; inspection/reconciliation owner explicit.

### K3.4 — Comparator and K3/E4 decision gate

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k34); also inspect affected dependencies.

**Dependencies:** K3.3. **Scope:** Run the same full core matrix against one mature substrate facade; collect raw traces/repeats/latency/transition and repeated native cost. Owner chooses simpler adequate substrate, retire losing production mechanism.

**Acceptance:** Complete E4 core matrix has zero specified invariant violations and comparable observations; owner records choose/reuse/narrow/stop. Neither serialization nor one passing prototype closes K3.

### K4.1 — Durable children and delegation

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k41); also inspect affected dependencies.

**Dependencies:** K3.4. **Scope:** Implement idempotent child/link/root budget reservation, required result accounting, terminal routing, cancellation/late result policy and transitive grant constraints.

**Acceptance:** Real crash at spawn/link/result route; no orphan or duplicate credit/active-slot mutation, no renewed total credits, no unauthorized descendant admission after revocation.

### K4.2 — Addressed messages and replies

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k42); also inspect affected dependencies.

**Dependencies:** K4.1. **Scope:** Implement mediated destination acceptance and recoverable sender settlement, scoped reply records where selected applications need them; support parent clarification subscriptions.

**Acceptance:** Lost receipt repeats one mailbox identity; notify is distinct from processing/reply; wrong/late/conflicting reply refused, closure and wake survive process death, no second parent writer.

### K4.3 — Durable human response lifecycle

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k43); also inspect affected dependencies.

**Dependencies:** K4.2. **Scope:** Complete K2 request path with authenticated/schema-valid response, atomic closure/receipt/Event/readiness, request expiry versus wait timeout and restart.

**Acceptance:** Execute the entire Q1/R1 fixture in 001 including early reply, duplicate/conflict, wrong responder, replaced wait and cancellation races with actual process death.

### K4.4 — Authorized retained output

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k44); also inspect affected dependencies.

**Dependencies:** K4.3. **Scope:** Implement bounded authorized output reads/cursors/reconnect through completion, independently from explicit message/parent result routing. Declare finite retention.

**Acceptance:** Execute entire P/C/E1/E2/M1 fixture in 001 under process death: no replay/live gap or duplicate accepted IDs, no observation-induced parent input/Activation, denied reads disclose nothing.

### K4.5 — K4/E4 composition gate

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k45); also inspect affected dependencies.

**Dependencies:** K4.4. **Scope:** Run combined composition matrix and compare direct composition using same public policy/services; ensure ownership survives crossed human/child/message/output/cancel races.

**Acceptance:** Every 001 K4 fixture and E4 composition requirement passes on integrated candidate; remove unnecessary peer sugar rather than add a conversation engine.

### R2.1 — Selected stock Runtime migration

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#r21); also inspect affected dependencies.

**Dependencies:** K2.4. **Scope:** Port needed Agent/Workflow behavior behind accepted boundary with fixed Kernel; update public surface/migration matrix and independent behavior tests.

**Acceptance:** No new Kernel cognition/graph/memory types; supported legacy semantics and refusal paths accounted for. Native quality not inferred from kernel conformance.

### R2.2 — Typed local composition

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#r22); also inspect affected dependencies.

**Dependencies:** R2.1. **Scope:** Implement direct local values/computed result and required barriers; test branch-local scratch, stale callbacks/conflicts, selected state/artifact binding.

**Acceptance:** Extraction/validation/branch/join requires no JSON-as-text or memory transport; authored order/barriers and explicit conflict semantics hold with fixed Kernel.

### R2.3 — Public child/join and R2 gate

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#r23); also inspect affected dependencies.

**Dependencies:** R2.2, K4.5. **Scope:** Exercise selected application via public imports using extraction → validation → child → join → computed terminal result. Document every unsupported authoring form.

**Acceptance:** R2 exit passes with independent Agent/Workflow tests; omitted native facilities remain outside supported claims. Required only if these surfaces ship.

### K5.1 — Bounded queues, retention and output

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k51); also inspect affected dependencies.

**Dependencies:** K4.5. **Scope:** Implement measured mailbox/history/output/deduplication and host admission limits; expiration, replay/live, slow/disconnected readers, revoked access and capacity refusal, including an output adapter over a native stream that silently skips expired data, which must still surface the explicit gap.

**Acceptance:** Reject before acceptance on exhaustion; explicit expired/view-mismatched cursor gaps, retained terminal drain and separately pinned routing obligations; no subscriber blocking/unbounded retention.

### K5.2 — Operations, upgrade and deletion

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k52); also inspect affected dependencies.

**Dependencies:** K5.1. **Scope:** Expose wait/unknown/recovery holds and authenticated reconcile; test principal/resource/secret changes, fenced migration/refusal, cleanup debt, privacy deletion and uncertain usage.

**Acceptance:** E4 operating faults and compatibility matrix reproducible; deleted data explicitly disables affected recovery, terminal cancellation retains unknown owner and cleanup evidence.

### R1.3 — Supported Driver evidence

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#r13); also inspect affected dependencies.

**Dependencies:** R1.2, K3.4. **Scope:** For each proposed supported Driver, run representative live paired fidelity, cancellation/restart and one upstream-version upgrade with predeclared quality/cost margins.

**Acceptance:** Actual E3 supported-profile evidence passes; unavailable live access blocks this packet, not initial R1 probe. Pin versions/config and disclose unsupported native behavior.

### K5.3 — Applications and comparison preparation

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k53); also inspect affected dependencies.

**Dependencies:** K5.2, R1.3. **Scope:** Complete both 001 public application shapes and competent direct plus mature comparator arms; include R2.3 only for stock facilities used. Freeze margins/repeats/evidence and owner budget before confirmatory runs.

**Acceptance:** Runnable equal-policy/service applications, calibrated independent observations and approved comparison protocol; prepared fixtures alone are not application-value success.

### K5.4 — K5/E5 operating and value gate

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k54); also inspect affected dependencies.

**Dependencies:** K5.3. **Scope:** Execute repeat plan and publish attributable verified outcomes, repairs, quality, total cost, operating burden and strongest counterexample; obtain owner continue/narrow/stop decision.

**Acceptance:** All operating obligations pass and both application shapes demonstrate recurring benefit within predeclared margins. Inconclusive/negative value is not a pass; narrow/stop requires explicit plan/release revision.

### D1.1 — One isolation profile

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#d11); also inspect affected dependencies.

**Dependencies:** K3.4 + owner demand. **Scope:** Select/license-review existing backend; declare credentials, network/filesystem/process/quota/resource/cleanup threat model and implement bounded adapter.

**Acceptance:** Supported work succeeds and actual advertised host tests declared bypass paths; mocks/lab container earn no subject containment credit.

### D1.2 — D1 physical gate

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#d12); also inspect affected dependencies.

**Dependencies:** D1.1. **Scope:** Exercise restart, stale/native powers, process-tree/resource cleanup and limits on the advertised profile; capture independent sink/host observations.

**Acceptance:** Entire D1 physical claim passes with measured limits, or remain trusted-only with isolation unsupported. Final claim also rechecked against release candidate.

### S1.1 — Packed-consumer prototype

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#s11); also inspect affected dependencies.

**Dependencies:** K2.4. **Scope:** Prototype compiled JS/types and clean packed install outside workspace links/loaders; retain current consumers and document experimental exports.

**Acceptance:** Fresh offline deterministic public example imports packed packages with supported Node; prototype does not establish stable exports, registry publication or release acceptance.

### S1.2 — Release candidate freeze

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#s12); also inspect affected dependencies.

**Dependencies:** K5.4, R1.3, S1.1. **Scope:** Finalize supported exports/names, guides/skills, persistent deployment and compatibility/refusal matrix. Require R2.3/D1.2 only if corresponding claims ship. Complete actual dependency/terms inventory.

**Acceptance:** Clean installs and examples pass; exact final source/build/provider/profile identity frozen, no unsupported claim or unresolved license adoption; prepare E6 independent construction handoff.

### S1.3 — S1/E6 final acceptance

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#s13); also inspect affected dependencies.

**Dependencies:** S1.2. **Scope:** Run fresh final-surface public construction canary and independently re-evaluate immutable recovery/value/support evidence; publish reproducibility artifacts and limits.

**Acceptance:** E6 and full S1 release contract pass on frozen candidate, not historical core-only v3; supported Driver live/upgrade and claimed isolation evidence match candidate. Release publishing requires explicit owner action.

### DOCS-CLEANUP-01 — Archive closed evidence and simplify current navigation

**Owner release:** explicit cleanup instruction, 2026-09-22. **Scope:** [contract](work/DOCS-CLEANUP-01/contract.md).
Preserve sealed history in a verified root upload artifact; relocate active fixtures/inventory;
remove obsolete working-tree copies; retain exact acceptance identities; decouple historical-log
checks from ordinary conformance; ignore concurrent owner rewrite drafts. No runtime migration,
dependency removal, semantic change or milestone closure. Future dependency/legacy-code retirement
remains assigned to its owning migration/release packet.

### PLAN-01 — Pre-K1.2 planning and process amendments

**Owner release:** explicit owner instruction, 2026-09-23. **Scope:** [contract](work/PLAN-01/contract.md).
Record the owner's product sequence in 001; remove status prose from 001; align 001's K2 wording
with the Effect vocabulary; amend K1.2–K1.4 and later packet seeds with the obligations found in
review and research; place Layer-3 maintenance in the candidate, with delegated cleanup verifying
it; update the role launchers accordingly; add legacy-name routing to the reference index; and
confirm `mental-model/rewrite-index.md` as the maintained owner of open choices and editorial
conventions. No Kernel semantics, gate, acceptance or release changes.

## Authoritative status

A dash means no evidence/acceptance exists. On change, replace the evidence cell with the relative
work/report/review path and exact candidate H; acceptance must name the independent review. Keep
integration SHA and owner discussion/release in a separate integration receipt linked here; preserve
the review as acceptance of its historical candidate. Never infer acceptance
from this table's prose or a test count. Milestone status is derived from its final gate below;
there is no second editable “done” checkbox in 001.

| Packet | Status | Report / review / candidate |
|---|---|---|
| DOCS-CLEANUP-01 | ACCEPTED | H `0c82b2ffdf65b733c4e67b089e45b2529499b74f`; [independent review](work/DOCS-CLEANUP-01/review-01.md) (Codex, GPT-6, 2026-09-23), covering payload `99e75608434499e2cf5e9d3a6ae8b43bbe1103e7` plus `12c664bd3cc0b59c2b5669890aae53bb651c8c9e` with the owner-draft exclusions. [Contract](work/DOCS-CLEANUP-01/contract.md), [round 1](work/DOCS-CLEANUP-01/implementation-01.md), [round 2](work/DOCS-CLEANUP-01/implementation-02.md). Integration of the correction commit pending owner merge; cloud upload of the archive remains owner action. |
| K0.1-process-review | ACCEPTED | H `3736e580f435e0b9eb91ff49ebb75f6d7750dcaa`; [review](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K0.1-process-review/review-04.md). Integrated `2833c222df7d587eb6b79275430b2653cd10019b`; [receipt](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K0.1-process-review/integration-01.md). Owner-closed. |
| K0.1 | ACCEPTED | H `bab7bf6635781e6d2f9b0e8e333f58440ae0b047`; [independent review](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K0.1/review-12.md). Integrated `42731300266eea00a9a24d867d5e82d9887c280d`; [receipt](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K0.1/integration-01.md). Owner-closed. |
| K0.2 | ACCEPTED | H `90a6f37eaeb61009025449a1abc7e6d31dc1dbb2`; [independent review](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K0.2/review-17.md). Integrated `0535160e677231da41b06d9f822e62e2f0364dd1`; [receipt](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K0.2/integration-01.md). Owner-closed; K0/E0 closed. |
| K1.0 | ACCEPTED | H `def91fb9f34ade40a65cbde999c0ffe192d18239`; [independent review](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.0-correction-02/review-01.md). Integrated `9baff3a03662720af6eefe1ecfabc41fde99298f`; [receipt](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.0/integration-01.md). Cumulative correction-02 supersedes earlier invalidated claims; no E1 result. |
| K1.0-correction-01 | ACCEPTED | Historical H `1295c68b03ae5d8eb0bbb86e974353402ff9a518` was later invalidated; [invalidation](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.0-correction-01/cleanup-01.md). Current cumulative acceptance/integration is correction-02 above, which closes K10-CORR1-CLEANUP-01; this row grants no standalone restored claim. |
| K1.0-correction-02 | ACCEPTED | H `def91fb9f34ade40a65cbde999c0ffe192d18239`; [independent review](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.0-correction-02/review-01.md). Integrated `9baff3a03662720af6eefe1ecfabc41fde99298f`; [receipt](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.0-correction-02/integration-01.md). Cleanup complete; cumulative C1–C9 restored. |
| K1.1 | ACCEPTED | H `52b1600f3b42e3a360fdc3395178f1d147edf304`; [independent review](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.1-correction-01/review-08.md). Integrated `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`; [receipt](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.1/integration-01.md). Includes accepted reference H9 below; cleanup complete, owner-closed. No E1/K1 closure. |
| K1.1-correction-01 | ACCEPTED | H `52b1600f3b42e3a360fdc3395178f1d147edf304`; [independent review](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.1-correction-01/review-08.md). Integrated `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`; [receipt](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.1-correction-01/integration-01.md). All packet findings closed; reference cleanup closed KC1-CLEANUP-REF-01. Historical Node 22 test-cancellation limitation retained. |
| K1.1-reference-01 | ACCEPTED | H `644dfffc7904176ee3a4f9943310cf926408a113`; [independent review](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.1-reference-01/review-08.md). Integrated `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`; [receipt](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.1-reference-01/integration-01.md). Cleanup complete; five non-blocking P3 observations and authentication limit remain in the review. |
| K1.1-correction-02 | CHANGES_REQUESTED | [Review 01](work/K1.1-correction-02/review-01.md) (Codex, GPT-6, 2026-09-23) of H `e1c751b87ee0e16af1280aefcf485fceeb409664`: open finding KC2-R1-01 (P1, unbounded scans before the refusal budget applies). [Contract](work/K1.1-correction-02/contract.md), [report](work/K1.1-correction-02/implementation-01.md), [decision 01](work/K1.1-correction-02/decision-01.md). |
| PLAN-01 | CHANGES_REQUESTED | [Review 01](work/PLAN-01/review-01.md) (Codex, GPT-6, 2026-09-23) of H `a6481c3b85811adb94f35d5309e04b9f3d9fc2ac`: open finding PLAN-R1-01 (P2, current K0 status remains in 001's opening). [Contract](work/PLAN-01/contract.md), [report](work/PLAN-01/implementation-01.md). |
| K1.2 | PLANNED | Released by separate owner instruction on 2026-09-16; prerequisites (K1.1 as integrated, including correction-01 and reference-01) satisfied; ready for its implementation packet under 006 entry checks. No candidate, review, or acceptance exists yet. No E1 result or K1 closure. |
| K1.3 | PLANNED | — |
| K1.4 | PLANNED | — |
| K2.1 | PLANNED | — |
| K2.2 | PLANNED | — |
| K2.3 | PLANNED | — |
| K2.4 | PLANNED | — |
| R1.1 | PLANNED | — |
| R1.2 | PLANNED | — |
| K3.1 | PLANNED | — |
| K3.2 | PLANNED | — |
| K3.3 | PLANNED | — |
| K3.4 | PLANNED | — |
| K4.1 | PLANNED | — |
| K4.2 | PLANNED | — |
| K4.3 | PLANNED | — |
| K4.4 | PLANNED | — |
| K4.5 | PLANNED | — |
| R2.1 | PLANNED | — |
| R2.2 | PLANNED | — |
| R2.3 | PLANNED | — |
| K5.1 | PLANNED | — |
| K5.2 | PLANNED | — |
| R1.3 | PLANNED | — |
| K5.3 | PLANNED | — |
| K5.4 | PLANNED | — |
| D1.1 | PLANNED | — |
| D1.2 | PLANNED | — |
| S1.1 | PLANNED | — |
| S1.2 | PLANNED | — |
| S1.3 | PLANNED | — |

## Old → new mapping and milestone closure

| Existing milestone | New packets | Milestone closes only after |
|---|---|---|
| K0 | K0.1–K0.2 | K0.2 ACCEPTED, including E0 |
| K1 | K1.0–K1.4 | K1.4 ACCEPTED, structural obligations plus full E1 |
| K2 | K2.1–K2.4 | K2.4 ACCEPTED, full E2 |
| R1 | R1.1–R1.2 initial; R1.3 supported profile | R1.2 unlocks K3; R1.3 is separately required for shipped Driver claims |
| K3 | K3.1–K3.4 | K3.4 ACCEPTED, full E4 core and owner substrate decision |
| K4 | K4.1–K4.5 | K4.5 ACCEPTED, full E4 composition |
| R2 | R2.1–R2.3 | R2.3 if selected stock surfaces ship |
| K5 | K5.1–K5.4 | K5.4 ACCEPTED, E4 operations and E5 positive value decision |
| D1 | D1.1–D1.2 | D1.2 only for an isolation claim |
| S1 | S1.1–S1.3 | S1.3 ACCEPTED, E6 on final candidate and all shipped claims |

R2 and D1 start PLANNED with conditional entry; absence of demand does not pretend completion.
The owner may DEFER them with a corresponding unsupported feature declaration. If E5 selects an
action-only product or stopping broad Kernel work, explicitly supersede affected release packets
with a new contract. Neither “narrow” nor “stop” is permission to mark the old durable Kernel gate PASS.

After every accepted packet the owner discussion/release gate in 006 applies, even within the same
parent milestone. No packet in this plan implements the speculative supervisor/lifecycle extensions
in future-plan Q3/Q9. Existing required-child and checkpoint-lifetime contracts remain binding.
