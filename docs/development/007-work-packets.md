# Reviewable work packets and status ledger

This file is the single packet status owner. The [process](006-development-process.md) defines actors,
review identities and eligibility. The [milestone roadmap](001-current-status-and-roadmap.md) remains
binding: splitting work does not remove any exit requirement or change canonical semantics.

K0.1 is independently **ACCEPTED**, integrated and owner-closed; see the
[integration receipt](work/K0.1/integration-01.md). The post-K0.1 process review is also independently
**ACCEPTED** at H4 and integrated; see its [integration receipt](work/K0.1-process-review/integration-01.md).
That process integration set `next_release: none` and held K0.2; that receipt stands as the record of
the hold at its own date. By a **separate later instruction on 2026-09-11 the owner released K0.2**,
choosing implementation as written over a scope amendment. K0.2 is now independently **ACCEPTED** at
H16 by [review-17.md](work/K0.2/review-17.md), integrated as
`0535160e677231da41b06d9f822e62e2f0364dd1`, and owner-closed; see its
[integration receipt](work/K0.2/integration-01.md). With K0.1 already accepted/integrated and E0 satisfied,
parent milestone **K0 is closed**. No successor was released by that closeout: `next_release: none`,
and at that date K1.0 remained **PLANNED** and unreleased, still requiring the benchmark-owned E1
fixture preparation plus a separate explicit owner release. That paragraph stands as the record of
the hold at its own date.

By a **separate instruction on 2026-09-13 the owner released K1.0**, accepting already-built but unaccepted benchmark E1 fixture preparation as its prerequisite; the exact exception and identities remain in [K1.0's contract](work/K1.0/contract.md). No E1 criterion is closed. K1.0 round-16 H `f3aa29d7ecba2a23aa85788b7efdebdd383cab24` received historical independent ACCEPT at A `36595f57d1f8cec8c4bf8a6293e888ca27750fab`; [cleanup-01](work/K1.0/cleanup-01.md) then held integration for K10-CLEANUP-01.

**K1.0-correction-02 round 1 is independently ACCEPTED** at H `def91fb9f34ade40a65cbde999c0ffe192d18239`, over C `95d74530f37c7af8706ef92d29574425a39afcf1`, original base `c9a9ed7e6e538ab0542fc6a999426264abb6212a`. OpenAI GPT-5.6 Sol (High) recorded [review-01](work/K1.0-correction-02/review-01.md) at A `4c3c2cf6cb0d4a0c6dd5ecbd97ceccadb8f161b0`, closing K10-CORR1-CLEANUP-01. [Delegated cleanup](work/K1.0-correction-02/cleanup-01.md) is complete. The owner merged the final cleaned cumulative candidate to `main` on 2026-09-14 as `9baff3a03662720af6eefe1ecfabc41fde99298f` (PR #21); the [parent integration receipt](work/K1.0/integration-01.md) and [correction-02 integration receipt](work/K1.0-correction-02/integration-01.md) verify the accepted lineage and tree-equivalent merge. Later administrative merge `4f02e6cad2dbc9d5444fededbdc27f0dc695060d` (PR #24) updated owner/status documentation and is not the K1.0 implementation integration identity. K1.0 with corrections 01–02 is therefore **integrated**. The cumulative C1–C9 acceptance restores the current structural claim; both earlier ACCEPT/invalidation records remain historical. No E1 result or K1 milestone closure; `next_release: none` at integration.

By a **separate instruction on 2026-09-14 the owner released K1.1**. It has been through three
independent-review rounds and is at its **fourth candidate**, `WAITING_FOR_REVIEW`: payload C4
`1d4e4867b748f9e0b2f4041e17ded836ebc25a75` over base `777b9955fb3a443f700b4f3d1f4f2aef1869345b`, with
the [contract](work/K1.1/contract.md) at revision 4 and the
[round-4 report](work/K1.1/implementation-04.md) naming its own containing commit as H4. Rounds 1 and
2 both returned CHANGES REQUIRED ([review-01](work/K1.1/review-01.md),
[review-02](work/K1.1/review-02.md)); every prior payload, candidate and review commit is preserved
in the branch's ancestry. The integration receipts the predecessor paragraph records as owed were
supplied by the owner and reconciled on `main` by PR #26, closing K11-R1-PROC-01. **Nothing about any
of these candidates is accepted**: the per-criterion assessments in the reports are the implementer's.
No E1 result and no K1 milestone closure; `next_release: none`.

The K1.1–K1.3 seeds below were re-checked on 2026-09-14 against the rewritten mental model and the K0 fixture that E1 pins (`tests/conformance/k0/`, mirrored by the benchmark's E1 kernel-fixture pin). No packet was added, removed or reordered; three fixture-exercised behaviors (authorized takeover, recovery hold for unavailable pinned code, post-creation input ingress) gained an explicit K1 owner so that K1.4 does not meet them unassigned.

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
recorded in the status ledger below, [cleanup-01](work/K1.0/cleanup-01.md) and [integration-01](work/K1.0/integration-01.md).

### K1.0-correction-01 — Whole-cell inventory fidelity

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k10-correction-01); also inspect affected dependencies.

Corrective record under 006, required by [K10-CLEANUP-01](work/K1.0/cleanup-01.md).
Correct K1.0-C4's value decoding and compare complete asserted relations; revalidate cumulative
C1–C9 without weakening them. Owner's copy-ready coding handoff:
[handoff-01](work/K1.0-correction-01/handoff-01.md); bounded scope, authority and preserved
identities: [contract](work/K1.0-correction-01/contract.md). The criteria are K1.0-C1 … C9 exactly as
[K1.0's contract](work/K1.0/contract.md) states them; this packet adds none and weakens none.
Historical K1.0 and correction-01 ACCEPTs and cleanup invalidations are preserved. Correction-02 supplies the accepted cumulative correction; its [cleanup record](work/K1.0-correction-02/cleanup-01.md) closes pre-merge obligations. Cumulative integration is PR #21 / `9baff3a03662720af6eefe1ecfabc41fde99298f`, recorded in the [parent receipt](work/K1.0/integration-01.md) and [correction-02 receipt](work/K1.0-correction-02/integration-01.md); no successor release follows from that merge.

### K1.0-correction-02 — Collection identity in inventory comparison

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k10-correction-02); also inspect affected dependencies.

Corrective record under 006 for [K10-CORR1-CLEANUP-01](work/K1.0-correction-01/cleanup-01.md). Repair loss of element boundaries in root/export comparison, trace all four inventory consumers, preserve existing parser/schema controls and revalidate original-base cumulative K1.0-C1–C9. [Bounded scope and copy-ready fixing prompt](work/K1.0-correction-02/handoff-01.md); bounded scope, authority and preserved identities: [contract](work/K1.0-correction-02/contract.md). The criteria are K1.0-C1 … C9 exactly as [K1.0's contract](work/K1.0/contract.md) states them; this packet adds none and weakens none. Historical correction-01 ACCEPT and invalidation remain. Correction-02 has independent ACCEPT at H `def91fb9f34ade40a65cbde999c0ffe192d18239`; [cleanup is complete](work/K1.0-correction-02/cleanup-01.md) and the cumulative candidate is integrated on `main` as PR #21 / `9baff3a03662720af6eefe1ecfabc41fde99298f`; see [integration-01](work/K1.0-correction-02/integration-01.md). No successor release follows from that merge.

### K1.1 — Create, reserve and asynchronous dispatch

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k11); also inspect affected dependencies.

**Dependencies:** K1.0 as integrated, including corrections 01–02. **Scope:** Implement atomic create/initial input, scoped identity, opaque pinned progress, reservation and Driver dispatch; expose minimum inspection. Own post-creation input ingress under the Input ID triple as [creation](../../mental-model/mechanisms/creation.md) states it: exact replay returns the retained disposition, conflicting content under an existing key is recorded and refused, the same key text from different producers never collides, and input to a terminal or unknown destination is refused with an inspectable reason. Refuse unsupported next forms until their packet lands.

**Acceptance:** Delayed fake A does not prevent B dispatch on the same coordinator; retries preserve identity/batch, reservation does not acknowledge input, no Agent/Workflow discriminator in the new boundary. Ingress replay, conflict, cross-producer and terminal-destination cases behave as scoped above whether or not any wait exists; wait matching itself remains K1.3.

### K1.2 — Outcome acceptance and receipts

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k12); also inspect affected dependencies.

**Dependencies:** K1.1. **Scope:** Implement whole-envelope validation, receipt replay/conflict, epoch/revision checks, whole-batch acknowledgment, progress recording, continue/complete/fail. Own authorized takeover as [identity](../../mental-model/concepts/identity.md) and the [retry-versus-takeover table](../../mental-model/mechanisms/execution-cycle.md) state it: the same Activation ID advances its writer epoch only through an authenticated control, the older attempt is fenced with no staleness window, and an ordinary retry never advances the epoch. Own the recovery hold for unavailable pinned progress code: the Execution stays RUNNING under an inspectable protocol-failure/recovery reason with progress and revision intact, and the hold clears when compatible code is available; this is [execution-cycle](../../mental-model/mechanisms/execution-cycle.md) exchange handling, not K3 process-fault recovery, and claims no persistence. Record Emission identities and the typed terminal result at acceptance; output observation, replay and cursors stay K4.4. Refuse Effects as [execution-cycle](../../mental-model/mechanisms/execution-cycle.md) fixes for K1: the whole envelope is rejected, no Effect ID, denied-action or admission record is created, and the Activation stays open. Refuse `complete` proposing any obligation whole, since every obligation kind is unsupported before K2.3; refuse not-yet-supported waits until K1.3.

**Acceptance:** Stale/conflicting/malformed proposals change no accepted state; exact duplicate returns original receipt; one progress writer and typed terminal/output semantics. A stale-epoch proposal after takeover is refused while the new epoch commits; a retry-only sequence shows no epoch change. A missing-code hold is distinguishable by inspection from a failed or waiting Execution and reverts to ordinary progress without a new revision. An Effect-bearing envelope leaves no K2-style record that E2 attribution could mistake for a denial.

### K1.3 — Wait and cancellation races

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k13); also inspect affected dependencies.

**Dependencies:** K1.2. **Scope:** Implement finite any-of, input subscriptions, eligible unmatched accounting, wait generation/deadlines, out-of-band cancellation and terminal disposition. Of the three clocks in [operations](../../mental-model/concepts/operations.md), this packet implements wait deadlines and routes Execution-deadline expiry through the same cancellation path; scheduler leases remain K3. Matching consumes input already admitted by K1.1 ingress; this packet adds no second ingress rule.

**Acceptance:** Before/during/after wait arrivals, stale timers, unmatched backlog and cancel/complete schedules lose no accepted input or wake and never reopen a terminal execution. A stale timer from a superseded wait generation is discarded with an inspectable reason and no state change; Execution-deadline expiry and explicit cancellation produce the same terminal disposition shape.

### K1.4 — Legacy bridge and K1/E1 gate

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k14); also inspect affected dependencies.

**Dependencies:** K1.3. **Scope:** Integrate the new boundary with SDK host driving; bridge viable existing controllers as private Runtime machinery. Port useful conformance and document unsupported legacy features.

**Acceptance:** Full K1/E1 matrix and K1.0 structural obligations pass, including actual accepted asynchronous exchange through the supported entry; legacy resumptions do not drive new Kernel types/stores. Existing supported behavior is preserved or explicitly migrated/refused.

### K2.1 — Atomic Effect intents

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k21); also inspect affected dependencies.

**Dependencies:** K1.4. **Scope:** Commit all intents with progress/input/output/next state, bind same-Outcome keys and dispatch only from accepted records. Record attempts separately.

**Acceptance:** Malformed Effect 2 rejects the envelope with zero dispatch; failure attempting Effect 2 preserves Effect 1 evidence and Effect 2 intent; invalid/stale Outcome dispatches nothing.

### K2.2 — Concrete schema and admission

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k22); also inspect affected dependencies.

**Dependencies:** K2.1. **Scope:** Select/license-review a mature validator and narrow schema subset; validate custom/stock/MCP paths. Bind final operation/input; define unknown operation and overlapping grants; order consent, withdrawal/revocation and dispatch epoch.

**Acceptance:** Zero executor calls for malformed/refused requests; stale ownership, payload/version/account change, duplicate approval, grant overlap and correction/admission races cannot bypass exact admission.

### K2.3 — Settlement, uncertainty and completion

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k23); also inspect affected dependencies.

**Dependencies:** K2.2. **Scope:** Implement trusted attempt evidence, duplicate/conflict and immutable refinements, result validity versus certainty, safe retry/refusal and required-work accounting.

**Acceptance:** Malformed response after possible success cannot fabricate failure; acknowledging unknown cannot permit completion; late authenticated evidence survives cancellation; unresolved non-idempotent work is never blindly retried.

### K2.4 — Input requests and K2/E2 gate

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k24); also inspect affected dependencies.

**Dependencies:** K2.3. **Scope:** Implement immutable human request/schema/eligible responder intent and authorized admission/disclosure with correlated denial; same-Outcome wait. Run all K2 and native-attribution controls.

**Acceptance:** Display settles nothing and is not consent; safe/unsafe/state-losing subjects get distinct attributed verdicts despite laboratory protection; complete K2/E2 gate passes.

### R1.1 — First real native boundary

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#r11); also inspect affected dependencies.

**Dependencies:** K1.4. **Scope:** Probe Hermes unless the owner-selected application requires another Runtime; preserve native context/tools and declare identity, pause/output/cancel, resources and lost-submit behavior. Mediated paths additionally require K2.4.

**Acceptance:** Real native-only versus thin-Driver observations with fake model/services where feasible; every unsupported recovery/mediation capability refused or declared. Same-process-only is a valid bounded probe.

### R1.2 — Second boundary and R1/E3 initial gate

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#r12); also inspect affected dependencies.

**Dependencies:** R1.1, K2.4. **Scope:** Probe one bounded CrewAI or published Dify application before freezing a shared extension. Compare submit/pause/result mapping and produce K3 constraints.

**Acceptance:** Two independent Runtime designs inform the boundary; E3 initial structural evidence covers the claimed profile and known gaps. No live quality or production durability claim inherited.

### K3.1 — Fault harness and substrate experiment contract

**Layer-3 maintenance:** [expected owners](../../mental-model/roadmap.md#k31); also inspect affected dependencies.

**Dependencies:** K2.4, R1.2. **Scope:** Build real worker/host kill control with surviving store/sink ledger. Pin the full 001 K3 crash matrix and measurement protocol. Select one mature comparator after API/operating/license review.

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

**Dependencies:** K4.5. **Scope:** Implement measured mailbox/history/output/deduplication and host admission limits; expiration, replay/live, slow/disconnected readers, revoked access and capacity refusal.

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

## Authoritative status

A dash means no evidence/acceptance exists. On change, replace the evidence cell with the relative
work/report/review path and exact candidate H; acceptance must name the independent review. Keep
integration SHA and owner discussion/release in a separate integration receipt linked here; preserve
the review as acceptance of its historical candidate. Never infer acceptance
from this table's prose or a test count. Milestone status is derived from its final gate below;
there is no second editable “done” checkbox in 001.

| Packet | Status | Report / review / candidate |
|---|---|---|
| K0.1 | ACCEPTED | Round 12 accepted by [review-12.md](work/K0.1/review-12.md), OpenAI GPT-5.6 Sol (High), 2026-09-11. Accepted H12 `bab7bf6635781e6d2f9b0e8e333f58440ae0b047`; clean-validated C12 `7a51801afcdf5c13d481e92c5d219a8c9be7c0eb`; base `6464be12c11eb75f7dfbc5ece12ca8d3020a5c15`. K0.1-C1–C6 PASS; no findings. Reviewer inspected pinned GitHub source/diffs and implementation-12 evidence; no shell commands independently rerun. Acceptance is for H12 only. Integrated on main as `42731300266eea00a9a24d867d5e82d9887c280d` (PR #19); owner considers K0.1 merged/closed. [Integration and discussion receipt](work/K0.1/integration-01.md) separately verifies A12 and the merge. `next_release: none`; workflow review/improvement precedes any K0.2 release. |
| K0.2 | ACCEPTED | Round 17 accepted by [review-17.md](work/K0.2/review-17.md), OpenAI GPT-5.6 Sol (High), 2026-09-12. Accepted H16 `90a6f37eaeb61009025449a1abc7e6d31dc1dbb2`; clean-validated C16 `9821cc27dbe5990f86028846b07edfb31cb65380`; base `c079237ee7aff428481426f93e87a68b79f170d4`. K0.2-C1–C9 PASS; no findings. C8 is backed by accepted benchmark E0 H `26d274fad53b2aa4fc2c7f596cae52e072cd24b5`, independent ACCEPT A `ac1445fb8144ffab8a9153b243d4b9237d1927b0`, owner integration receipt `9b816d47e83ff210fa32400aa91994f8055138d5`, and benchmark main `4d83c245c8f6bb0886c1035ec1c6bba3f91f0ddd`. Integrated on main as `0535160e677231da41b06d9f822e62e2f0364dd1`; owner considers K0.2 merged/closed and K0 milestone closed. [Integration and discussion receipt](work/K0.2/integration-01.md) separately verifies H16→A17 administrative scope, tree-equivalent integration, and the owner closeout. `next_release: none`; K1.0 remains PLANNED and unreleased pending E1 fixture preparation and a separate explicit owner release. |
| K1.0 | ACCEPTED | Historical round-16 ACCEPT at H `f3aa29d7ecba2a23aa85788b7efdebdd383cab24`, C `d693d59aefe5335c8950d57cec6d6b57e375cadc`, base `c9a9ed7e6e538ab0542fc6a999426264abb6212a`, A `36595f57d1f8cec8c4bf8a6293e888ca27750fab`, [review-17](work/K1.0/review-17.md), OpenAI GPT-5.6 Sol (High). Historical [cleanup invalidation](work/K1.0/cleanup-01.md) and [correction-01 invalidation](work/K1.0-correction-01/cleanup-01.md) remain. Current cumulative C1–C9 ACCEPT is correction-02 H `def91fb9f34ade40a65cbde999c0ffe192d18239`; [cleanup complete](work/K1.0-correction-02/cleanup-01.md). Cumulative K1.0 is integrated on main as `9baff3a03662720af6eefe1ecfabc41fde99298f` (PR #21); [parent integration receipt](work/K1.0/integration-01.md) and [correction-02 receipt](work/K1.0-correction-02/integration-01.md). [Contract revision 19](work/K1.0/contract.md). Structural only; no E1 result or K1 closure. `next_release: none` at integration. |
| K1.0-correction-01 | ACCEPTED | Historical round-2 ACCEPT at H `1295c68b03ae5d8eb0bbb86e974353402ff9a518`, C `36460438e95e968beec0b354b07a616b53981256`, base `c9a9ed7e6e538ab0542fc6a999426264abb6212a`, A `41728edfc3cfc5c745e4293c511a740942f7b631`, [review-02](work/K1.0-correction-01/review-02.md), OpenAI GPT-5.6 Sol (High). [Cleanup/invalidation](work/K1.0-correction-01/cleanup-01.md) preserved. Its K10-CORR1-CLEANUP-01 is now closed by correction-02 independent [review-01](work/K1.0-correction-02/review-01.md); current cumulative acceptance belongs to that H, not this historical candidate. Cumulative integration is supplied by correction-02 at PR #21 / `9baff3a03662720af6eefe1ecfabc41fde99298f`; the historical correction-01 H is not presented as the final integrated candidate. [Parent receipt](work/K1.0/integration-01.md); `next_release: none` at integration. |
| K1.0-correction-02 | ACCEPTED | Round 1: original base `c9a9ed7e6e538ab0542fc6a999426264abb6212a`, C `95d74530f37c7af8706ef92d29574425a39afcf1`, accepted H `def91fb9f34ade40a65cbde999c0ffe192d18239`, A `4c3c2cf6cb0d4a0c6dd5ecbd97ceccadb8f161b0`; OpenAI GPT-5.6 Sol (High), [review-01](work/K1.0-correction-02/review-01.md). K1.0 contract revision 19 / corrective revision 1. [Report](work/K1.0-correction-02/implementation-01.md), [pinned evidence](work/K1.0-correction-02/validation-01/MANIFEST.md). K10-CORR1-CLEANUP-01 CLOSED; cumulative C1–C9 independently PASS. [Cleanup-01](work/K1.0-correction-02/cleanup-01.md) COMPLETE. Integrated on main through PR #21 as `9baff3a03662720af6eefe1ecfabc41fde99298f`, with tree-equivalent integration verified in [integration-01](work/K1.0-correction-02/integration-01.md). No E1 result or K1 closure; `next_release: none` at integration. |
| K1.1 | WAITING_FOR_REVIEW | Round 1 CHANGES REQUIRED by [review-01.md](work/K1.1/review-01.md) (OpenAI GPT-5.6 Sol High, base `777b9955fb3a443f700b4f3d1f4f2aef1869345b`, payload C `8cd9e269b1c08f166dec1b567aedf7d1b4810b34`, H `0f345b3c9ab49f6c5d9e09b162641cda78f96356`): K11-R1-VAL-01, ID-01, SCOPE-01, JCS-01, PROC-01, DOC-01. Round-2 payload C2 `6b7e5fb0eb3cb323788f97889b84db845a7b3f9f` / H2 `297cc56ff186638817e0edfba7a3ce9f103d561e` corrected VAL/ID/SCOPE/DOC and recorded JCS/PROC as owner blockers. Round 3 closed PROC-01 on the `87ee39c` main-merge ancestry (integrated main PR #26 / `05f48c204d1eae021b3464c206e5c11e84bb3505`, carrying PR #21 / `9baff3a` K1.0 receipts) and JCS-01 by implementing owner-approved exact `canonicalize@3.0.0`; payload C3 `615cdf884ac560aec659162353680e55f732804c` / H3 `b3cdf33732df1f0645e0d773917b4f82444208c5`. **Round 3 CHANGES REQUIRED** by [review-02.md](work/K1.1/review-02.md) (same reviewer, review record `3012b3c3328c49cfa15b2d4330f1bb871f53162a`): K11-R2-VAL-02 (P1, accepted values could bind canonical bytes describing a structure other than the one retained) and K11-R2-EVID-01 (P1, retained receipts and refusals escaped as mutable shared objects); C5/C7/C8/C10 passed. Round-4 payload C4 `1d4e4867b748f9e0b2f4041e17ded836ebc25a75` reconstructs value acceptance around one capture pass, makes retained evidence immutable at its two mints, and corrects one self-found identity defect (K11-R3-ID-02: `packIdentity` is injective over text only, so a non-text `kind` made two different contents replay as one). [Contract revision 4](work/K1.1/contract.md), [report](work/K1.1/implementation-04.md), [pinned evidence](work/K1.1/validation-04/MANIFEST.md); candidate H4 is the commit containing implementation-04. **Round 4 CHANGES REQUIRED** by [review-03.md](work/K1.1/review-03.md) plus [supplement-01](work/K1.1/review-03-supplement-01.md) (same reviewer): reopened K11-R2-VAL-02 (P1, inherited `toJSON`/`map` serializer boundary, outside-length index, hostile-throw formatter), K11-R3-ID-03 (P2, scope auth before text validation), K11-R3-LIMIT-01 (P2, over-limit traversal), K11-R3-DOC-02 (P2, entry docs vs guard), K11-R3-PROC-02 (P1/BLOCKED_EXTERNAL, H4 raw logs absent). Round-5 payload C5 `e0660effc729b968c528943220d9ba6fbc561c18` reconstructs the serializer boundary (safe clone + shadows + primordials), fixes scope-before-auth with single-observation envelope reuse, bounds over-limit refusal, corrects entry docs, and force-commits `validation-05/` raw logs. [Contract revision 4](work/K1.1/contract.md) (unchanged), [report](work/K1.1/implementation-05.md), [pinned evidence](work/K1.1/validation-05/MANIFEST.md); candidate H5 is the commit containing implementation-05. All prior C/H/review commits are preserved as ancestors of C5. **Round 5 CHANGES REQUIRED** by [review-04.md](work/K1.1/review-04.md) (same reviewer): reopened K11-R2-VAL-02 (P1, capture-time `Object.keys` replacement reaches the exact JCS call; JCS throw escapes `encode`), new K11-R4-DISPATCH-01 (P1, `options.bound` validated twice and selected from a third read: `1,1,0` getter reserves an empty prefix), K11-R4-PROC-01 (P1, H5 claimed `WAITING_FOR_REVIEW` while both P1s were known). Both P1s were implementer-self-found after H5 and independently confirmed by that review. Round-6 payload C6 `b3d0d59f18f6c2b1d0a49746428123d84dd80df2` isolates the serializer execution environment (19 audited slots restored per exact-JCS call, adapter primordial discipline, refusal boundary) and observes the dispatch bound once (primordial integer test, loop selection, non-object guard). [Contract revision 4](work/K1.1/contract.md) (unchanged), [report](work/K1.1/implementation-06.md), [pinned evidence](work/K1.1/validation-06/MANIFEST.md); candidate H6 is the commit containing implementation-06. All prior C/H/review commits are preserved as ancestors of C6. Implementer's assessment only; no criterion is accepted. No E1 result or K1 closure; `next_release: none`. |
| K1.2 | PLANNED | — |
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