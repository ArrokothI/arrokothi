# Reviewable work packets and status ledger

This file is the single packet status owner. The [process](006-development-process.md) defines actors,
review identities and eligibility. The [milestone roadmap](001-current-status-and-roadmap.md) remains
binding: splitting work does not remove any exit requirement or change canonical semantics.

K0.1 is independently **ACCEPTED**, integrated and owner-closed; see the
[integration receipt](work/K0.1/integration-01.md). The post-K0.1 process review is also independently
**ACCEPTED** at H4 and integrated; see its [integration receipt](work/K0.1-process-review/integration-01.md).
That process integration set `next_release: none` and held K0.2; that receipt stands as the record of
the hold at its own date. By a **separate later instruction on 2026-09-11 the owner released K0.2**,
choosing implementation as written over a scope amendment; its round-1 candidate is now
`BLOCKED_EXTERNAL` on the E0 clause (see the row below). Every other successor remains **PLANNED**,
and this release extends to no other packet. Sequence: K0.2 → K1.0 structural preparation → K1.1.
K1.0 is the first K1 implementation packet, so the benchmark-owned E1 fixture preparation precedes it
as well as K1.1; K1.0 is unimplemented and unreleased. No benchmark acceptance or E0–E6 status is
changed here.

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
All packets read the mental model, canonical owner and evidence detail. Detail filenames below are
relative to `docs/detail-design/`; source hints are relative to repository root.

| Parent | Canonical/detail sources | Likely touchpoints; retained test families | Explicit exclusions |
|---|---|---|---|
| K0/K1 | kernel.md; execution-protocol, recovery-and-compatibility, evidence-and-observability | core runtime/harness, execution/context, ports/controller/runtime-store/scheduler, reference store; conformance execution/contracts, SDK host | No database, production native recovery, cognition rewrite; K1 initially refuses Effects until K2 |
| K2 | kernel.md; authority-and-actions, action-lifecycle, execution-protocol, interoperability | core runtime/effect-processor, schema/catalog/policy ports; effects, confirmation, reauthorization and MCP tests | No durable restart claim, remote instantaneous policy, action rollback or universal pending hierarchy |
| R1 | execution.md, deployment.md; runtime-integration, recovery-and-compatibility, resources-and-isolation, context-and-projections | new narrow Driver boundary outside core semantics; provider package tests and native paired fixtures | No four maintained Drivers, graph importer, forced durable live callback or untested fidelity |
| K3 | kernel.md, execution.md, deployment.md; recovery-and-compatibility, resources-and-isolation, action-lifecycle | runtime-store/scheduler/reference and chosen storage/host adapter; actual process fault runner and independent ledger | No two production backends, disk disaster, multi-region, arbitrary native retry or new host fleet |
| K4 | kernel.md; composition-and-communication, authority-and-actions, action-lifecycle, execution-protocol | child-link, structural-budget, event-router, input requests, output read boundary; composition/interaction plus process faults | No pub/sub actors, automatic forwarding, arbitrary detach, Kernel graph joins or universal sessions |
| R2 | execution.md; runtime-composition, memory-and-state, context-and-projections | stock controllers, workflow adapters/control, SDK exports, application examples; Agent evals/Workflow tests | No new model loop or graph engine required, universal memory or foreign parity |
| K5 | kernel.md, deployment.md; resources-and-isolation, evidence-and-observability, recovery-and-compatibility, action-lifecycle | storage/admission/output/inspection and native resource adapters; operations and application comparison fixtures | No production SLA without measurement, infinite retention, Kernel token ledger or inspector product |
| D1 | deployment.md; resources-and-isolation, evidence-and-observability | selected external sandbox adapter and physical adversarial fixtures | No custom sandbox; no claim derived from benchmark construction isolation |
| S1 | all relevant supported owners; interoperability, runtime-integration, recovery-and-compatibility, evidence-and-observability | package manifests/build/exports, SDK, guides, skills, clean consumers and benchmark E6 | No broad protocol parity, all P0X campaign, leaderboard or architecture-completeness release gate |

## Packet contracts

### K0.1 — Protocol decisions and legacy disposition

**Dependencies:** —. **Scope:** Produce a versioned contract worksheet: equality/limits, scoped receipts, batches, three clocks, cancellation/terminal obligations, progress compatibility, locally ordered policy. Map every 001 K0 boundary to an assertion; classify legacy data as migratable, legacy-only or refused.

**Acceptance:** Every boundary has one owner and an unambiguous observable outcome; contradictory semantics are blocked, storage/wire choices justified without new Kernel concepts.

### K0.2 — Public controls and K0/E0 gate

**Dependencies:** K0.1. **Scope:** Build the smallest public delayed-Runtime/typed-output/input-wait fixture, independent sink and direct baseline specification. Include both public application shapes and unsafe/state-loss control specifications; obtain pinned E0 evidence.

**Acceptance:** All K0 exit requirements and E0 ownership observations covered; fixture preparation is explicitly distinguished from later K1 candidate success.
### K1.0 — Target boundary and legacy quarantine

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
these structural obligations with actual behavior. This packet is PLANNED and requires separate owner
release after K0.2 and the required E1 fixture preparation; adding it here is not release.

### K1.1 — Create, reserve and asynchronous dispatch

**Dependencies:** K1.0. **Scope:** Implement atomic create/initial input, scoped identity, opaque pinned progress, reservation and Driver dispatch; expose minimum inspection. Refuse unsupported next forms until their packet lands.

**Acceptance:** Delayed fake A does not prevent B dispatch on the same coordinator; retries preserve identity/batch, reservation does not acknowledge input, no Agent/Workflow discriminator in the new boundary.

### K1.2 — Outcome acceptance and receipts

**Dependencies:** K1.1. **Scope:** Implement whole-envelope validation, receipt replay/conflict, epoch/revision checks, whole-batch acknowledgment, progress and accepted output, continue/complete/fail. Explicitly refuse not-yet-supported Effects/waits.

**Acceptance:** Stale/conflicting/malformed proposals change no accepted state; exact duplicate returns original receipt; one progress writer and typed terminal/output semantics.

### K1.3 — Wait and cancellation races

**Dependencies:** K1.2. **Scope:** Implement finite any-of, input subscriptions, eligible unmatched accounting, wait generation/deadlines, out-of-band cancellation and terminal disposition.

**Acceptance:** Before/during/after wait arrivals, stale timers, unmatched backlog and cancel/complete schedules lose no accepted input or wake and never reopen a terminal execution.

### K1.4 — Legacy bridge and K1/E1 gate

**Dependencies:** K1.3. **Scope:** Integrate the new boundary with SDK host driving; bridge viable existing controllers as private Runtime machinery. Port useful conformance and document unsupported legacy features.

**Acceptance:** Full K1/E1 matrix and K1.0 structural obligations pass, including actual accepted asynchronous exchange through the supported entry; legacy resumptions do not drive new Kernel types/stores. Existing supported behavior is preserved or explicitly migrated/refused.

### K2.1 — Atomic Effect intents

**Dependencies:** K1.4. **Scope:** Commit all intents with progress/input/output/next state, bind same-Outcome keys and dispatch only from accepted records. Record attempts separately.

**Acceptance:** Malformed Effect 2 rejects the envelope with zero dispatch; failure attempting Effect 2 preserves Effect 1 evidence and Effect 2 intent; invalid/stale Outcome dispatches nothing.

### K2.2 — Concrete schema and admission

**Dependencies:** K2.1. **Scope:** Select/license-review a mature validator and narrow schema subset; validate custom/stock/MCP paths. Bind final operation/input; define unknown operation and overlapping grants; order consent, withdrawal/revocation and dispatch epoch.

**Acceptance:** Zero executor calls for malformed/refused requests; stale ownership, payload/version/account change, duplicate approval, grant overlap and correction/admission races cannot bypass exact admission.

### K2.3 — Settlement, uncertainty and completion

**Dependencies:** K2.2. **Scope:** Implement trusted attempt evidence, duplicate/conflict and immutable refinements, result validity versus certainty, safe retry/refusal and required-work accounting.

**Acceptance:** Malformed response after possible success cannot fabricate failure; acknowledging unknown cannot permit completion; late authenticated evidence survives cancellation; unresolved non-idempotent work is never blindly retried.

### K2.4 — Input requests and K2/E2 gate

**Dependencies:** K2.3. **Scope:** Implement immutable human request/schema/eligible responder intent and authorized admission/disclosure with correlated denial; same-Outcome wait. Run all K2 and native-attribution controls.

**Acceptance:** Display settles nothing and is not consent; safe/unsafe/state-losing subjects get distinct attributed verdicts despite laboratory protection; complete K2/E2 gate passes.

### R1.1 — First real native boundary

**Dependencies:** K1.4. **Scope:** Probe Hermes unless the owner-selected application requires another Runtime; preserve native context/tools and declare identity, pause/output/cancel, resources and lost-submit behavior. Mediated paths additionally require K2.4.

**Acceptance:** Real native-only versus thin-Driver observations with fake model/services where feasible; every unsupported recovery/mediation capability refused or declared. Same-process-only is a valid bounded probe.

### R1.2 — Second boundary and R1/E3 initial gate

**Dependencies:** R1.1, K2.4. **Scope:** Probe one bounded CrewAI or published Dify application before freezing a shared extension. Compare submit/pause/result mapping and produce K3 constraints.

**Acceptance:** Two independent Runtime designs inform the boundary; E3 initial structural evidence covers the claimed profile and known gaps. No live quality or production durability claim inherited.

### K3.1 — Fault harness and substrate experiment contract

**Dependencies:** K2.4, R1.2. **Scope:** Build real worker/host kill control with surviving store/sink ledger. Pin the full 001 K3 crash matrix and measurement protocol. Select one mature comparator after API/operating/license review.

**Acceptance:** Fault triggers demonstrably kill processes; oracle survives independently; every K3 window, repeat plan, correctness and cost measurement is assigned before prototypes. Owner approves comparison criteria.

### K3.2 — Narrow transactional persistent candidate

**Dependencies:** K3.1. **Scope:** Implement persistent accepted truth, intents/receipts, readiness reconstruction and phase-specific recovery on one transactional path. Keep effects externally observable.

**Acceptance:** Actual process kills at input/dispatch/Outcome/action/settlement/terminal boundaries preserve records or truthful unknown/refusal; no empty-store fallback. Record remaining native-specific windows for K3.3.

### K3.3 — Native recovery and resource windows

**Dependencies:** K3.2. **Scope:** Implement/test safe reattach/replay/refusal, stale-host exclusion, checkpoint pin/delete, allocation-before-handle, revoked replay disclosure and unavailable code/checkpoint/resource behavior.

**Acceptance:** Real old-host-alive and two-store crashes show native exclusion or refusal; no fabricated restoration, blind submit or accepted deleted checkpoint; inspection/reconciliation owner explicit.

### K3.4 — Comparator and K3/E4 decision gate

**Dependencies:** K3.3. **Scope:** Run the same full core matrix against one mature substrate facade; collect raw traces/repeats/latency/transition and repeated native cost. Owner chooses simpler adequate substrate, retire losing production mechanism.

**Acceptance:** Complete E4 core matrix has zero specified invariant violations and comparable observations; owner records choose/reuse/narrow/stop. Neither serialization nor one passing prototype closes K3.

### K4.1 — Durable children and delegation

**Dependencies:** K3.4. **Scope:** Implement idempotent child/link/root budget reservation, required result accounting, terminal routing, cancellation/late result policy and transitive grant constraints.

**Acceptance:** Real crash at spawn/link/result route; no orphan or duplicate credit/active-slot mutation, no renewed total credits, no unauthorized descendant admission after revocation.

### K4.2 — Addressed messages and replies

**Dependencies:** K4.1. **Scope:** Implement mediated destination acceptance and recoverable sender settlement, scoped reply records where selected applications need them; support parent clarification subscriptions.

**Acceptance:** Lost receipt repeats one mailbox identity; notify is distinct from processing/reply; wrong/late/conflicting reply refused, closure and wake survive process death, no second parent writer.

### K4.3 — Durable human response lifecycle

**Dependencies:** K4.2. **Scope:** Complete K2 request path with authenticated/schema-valid response, atomic closure/receipt/Event/readiness, request expiry versus wait timeout and restart.

**Acceptance:** Execute the entire Q1/R1 fixture in 001 including early reply, duplicate/conflict, wrong responder, replaced wait and cancellation races with actual process death.

### K4.4 — Authorized retained output

**Dependencies:** K4.3. **Scope:** Implement bounded authorized output reads/cursors/reconnect through completion, independently from explicit message/parent result routing. Declare finite retention.

**Acceptance:** Execute entire P/C/E1/E2/M1 fixture in 001 under process death: no replay/live gap or duplicate accepted IDs, no observation-induced parent input/Activation, denied reads disclose nothing.

### K4.5 — K4/E4 composition gate

**Dependencies:** K4.4. **Scope:** Run combined composition matrix and compare direct composition using same public policy/services; ensure ownership survives crossed human/child/message/output/cancel races.

**Acceptance:** Every 001 K4 fixture and E4 composition requirement passes on integrated candidate; remove unnecessary peer sugar rather than add a conversation engine.

### R2.1 — Selected stock Runtime migration

**Dependencies:** K2.4. **Scope:** Port needed Agent/Workflow behavior behind accepted boundary with fixed Kernel; update public surface/migration matrix and independent behavior tests.

**Acceptance:** No new Kernel cognition/graph/memory types; supported legacy semantics and refusal paths accounted for. Native quality not inferred from kernel conformance.

### R2.2 — Typed local composition

**Dependencies:** R2.1. **Scope:** Implement direct local values/computed result and required barriers; test branch-local scratch, stale callbacks/conflicts, selected state/artifact binding.

**Acceptance:** Extraction/validation/branch/join requires no JSON-as-text or memory transport; authored order/barriers and explicit conflict semantics hold with fixed Kernel.

### R2.3 — Public child/join and R2 gate

**Dependencies:** R2.2, K4.5. **Scope:** Exercise selected application via public imports using extraction → validation → child → join → computed terminal result. Document every unsupported authoring form.

**Acceptance:** R2 exit passes with independent Agent/Workflow tests; omitted native facilities remain outside supported claims. Required only if these surfaces ship.

### K5.1 — Bounded queues, retention and output

**Dependencies:** K4.5. **Scope:** Implement measured mailbox/history/output/deduplication and host admission limits; expiration, replay/live, slow/disconnected readers, revoked access and capacity refusal.

**Acceptance:** Reject before acceptance on exhaustion; explicit expired/view-mismatched cursor gaps, retained terminal drain and separately pinned routing obligations; no subscriber blocking/unbounded retention.

### K5.2 — Operations, upgrade and deletion

**Dependencies:** K5.1. **Scope:** Expose wait/unknown/recovery holds and authenticated reconcile; test principal/resource/secret changes, fenced migration/refusal, cleanup debt, privacy deletion and uncertain usage.

**Acceptance:** E4 operating faults and compatibility matrix reproducible; deleted data explicitly disables affected recovery, terminal cancellation retains unknown owner and cleanup evidence.

### R1.3 — Supported Driver evidence

**Dependencies:** R1.2, K3.4. **Scope:** For each proposed supported Driver, run representative live paired fidelity, cancellation/restart and one upstream-version upgrade with predeclared quality/cost margins.

**Acceptance:** Actual E3 supported-profile evidence passes; unavailable live access blocks this packet, not initial R1 probe. Pin versions/config and disclose unsupported native behavior.

### K5.3 — Applications and comparison preparation

**Dependencies:** K5.2, R1.3. **Scope:** Complete both 001 public application shapes and competent direct plus mature comparator arms; include R2.3 only for stock facilities used. Freeze margins/repeats/evidence and owner budget before confirmatory runs.

**Acceptance:** Runnable equal-policy/service applications, calibrated independent observations and approved comparison protocol; prepared fixtures alone are not application-value success.

### K5.4 — K5/E5 operating and value gate

**Dependencies:** K5.3. **Scope:** Execute repeat plan and publish attributable verified outcomes, repairs, quality, total cost, operating burden and strongest counterexample; obtain owner continue/narrow/stop decision.

**Acceptance:** All operating obligations pass and both application shapes demonstrate recurring benefit within predeclared margins. Inconclusive/negative value is not a pass; narrow/stop requires explicit plan/release revision.

### D1.1 — One isolation profile

**Dependencies:** K3.4 + owner demand. **Scope:** Select/license-review existing backend; declare credentials, network/filesystem/process/quota/resource/cleanup threat model and implement bounded adapter.

**Acceptance:** Supported work succeeds and actual advertised host tests declared bypass paths; mocks/lab container earn no subject containment credit.

### D1.2 — D1 physical gate

**Dependencies:** D1.1. **Scope:** Exercise restart, stale/native powers, process-tree/resource cleanup and limits on the advertised profile; capture independent sink/host observations.

**Acceptance:** Entire D1 physical claim passes with measured limits, or remain trusted-only with isolation unsupported. Final claim also rechecked against release candidate.

### S1.1 — Packed-consumer prototype

**Dependencies:** K2.4. **Scope:** Prototype compiled JS/types and clean packed install outside workspace links/loaders; retain current consumers and document experimental exports.

**Acceptance:** Fresh offline deterministic public example imports packed packages with supported Node; prototype does not establish stable exports, registry publication or release acceptance.

### S1.2 — Release candidate freeze

**Dependencies:** K5.4, R1.3, S1.1. **Scope:** Finalize supported exports/names, guides/skills, persistent deployment and compatibility/refusal matrix. Require R2.3/D1.2 only if corresponding claims ship. Complete actual dependency/terms inventory.

**Acceptance:** Clean installs and examples pass; exact final source/build/provider/profile identity frozen, no unsupported claim or unresolved license adoption; prepare E6 independent construction handoff.

### S1.3 — S1/E6 final acceptance

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
| K0.2 | BLOCKED_EXTERNAL | Released by explicit owner instruction 2026-09-11. Round 1: [implementation-01.md](work/K0.2/implementation-01.md), [contract.md](work/K0.2/contract.md), [public-fixture-specification.md](work/K0.2/public-fixture-specification.md); branch `codex/k0.2-public-controls-e0-gate`, base `c079237ee7aff428481426f93e87a68b79f170d4`, clean payload C `9aa70a82f02d57b2658e0906af53dc31bc34e483`, candidate H named in the report and supplied in the handoff. **Complete and independently reviewable:** K0.2-C1–C7 — the versioned public fixture (7 scenarios including 001's K0 trace and Decision M-1's four unsafe/state-loss controls), the independent operation sink and ledger, the refusing candidate plus 10 violating transcripts proving oracle discrimination, the direct baseline contract, both public application shapes and the E0 ownership records. Validation on C: typecheck exit 0; `npm test` 1063 tests / 0 failures (965 pre-existing plus 98 new); conformance 954; builder-docs 26 files / 280 links. **Blocked:** K0.2-C8, "obtain pinned E0 evidence". **Unavailable input:** any E0 fixture, ownership record, baseline contract, evaluator version or control result in the benchmark repository, which at revision `98756f8c10bd806125da8318f1a129bc030aca61` states E0 is planned and unimplemented. **Responsible actor:** benchmark repository owner. **Unblock condition:** E0's deliverable produced and accepted there at a pinned revision, with artifact identities recordable here. No E0 acceptance is claimed, implied or self-granted, and nothing was written in that repository. Not review-ready as a whole; this row is not acceptance of any part. Because K0.2 is K0's final gate packet, K0 stays open. |
| K1.0 | PLANNED | Target boundary/legacy quarantine proposal; K0.2 plus the benchmark-owned E1 fixture preparation required before K1 implementation are prerequisites, and separate explicit owner release is required. No implementation; no E1 credit. |
| K1.1 | PLANNED | — |
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
