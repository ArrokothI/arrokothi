# Reviewable work packets and status ledger

This file is the single packet status owner. The [process](006-development-process.md) defines actors,
review identities and eligibility. The [milestone roadmap](001-current-status-and-roadmap.md) remains
binding: splitting work does not remove any exit requirement or change canonical semantics.

All packets below are **PLANNED**. There are no implementation or independent acceptance claims.
Initial next packet is K0.1, only after owner adoption of the planning change. This file adds no
benchmark acceptance and changes no E0–E6 status in the benchmark repository.

## How to read a packet

Each row is a bounded implementation contract seed, normally one coding/review cycle. Several
sessions may correct one packet; never claim a fixed time estimate. The packet inherits its parent
roadmap section in full **for the responsibility assigned here**, the design/touchpoint row below,
and the universal obligations below. Its final gate packet checks the entire parent without gaps.
If inspection shows even a packet is too large, propose a split preserving criterion IDs/dependencies
and obtain owner adoption before broad implementation. Split by observable boundary, not files or
an arbitrary line budget. K3/K5 experimental packets may take multiple sessions with one fixed contract.

Entry requires all listed dependencies independently ACCEPTED and integrated, owner release, available
required evidence inputs and a clean review base. Display order breaks ties; corrections take priority.
R1.1 can run before K2; K2 is required for its mediated paths. R2 and S1.1 can begin after K2 without
blocking K3. R1.3 is deliberately later than the initial structural probe. External E fixtures precede
candidate implementation; results close the relevant gate packet. A missing benchmark artifact blocks
the gate, not a wholly independent packet. The owner must explicitly release that alternative.

Universal obligations: scoped tests and counterexamples; preserve useful existing regressions or
justify retirement; current baseline/guides/migration/skills update where materially affected; versioned
compatibility or explicit refusal; exact third-party review before reuse; raw evidence and a report;
independent review. Non-goals for every packet are other packet responsibilities, provider internals
in Kernel types, speculative future-plan extensions and unsupported durability/isolation claims.
Scaffolding that cannot yet fulfill an API must explicitly refuse it and remain experimental.

At start create `work/<id>/contract.md` with stable criterion IDs, inherited requirement mapping,
exact sources/touchpoints found in the current tree, command plan, evidence owners and any limits.
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

### K1.1 — Create, reserve and asynchronous dispatch

**Dependencies:** K0.2. **Scope:** Implement atomic create/initial input, scoped identity, opaque pinned progress, reservation and Driver dispatch; expose minimum inspection. Refuse unsupported next forms until their packet lands.

**Acceptance:** Delayed fake A does not prevent B dispatch on the same coordinator; retries preserve identity/batch, reservation does not acknowledge input, no Agent/Workflow discriminator in the new boundary.

### K1.2 — Outcome acceptance and receipts

**Dependencies:** K1.1. **Scope:** Implement whole-envelope validation, receipt replay/conflict, epoch/revision checks, whole-batch acknowledgment, progress and accepted output, continue/complete/fail. Explicitly refuse not-yet-supported Effects/waits.

**Acceptance:** Stale/conflicting/malformed proposals change no accepted state; exact duplicate returns original receipt; one progress writer and typed terminal/output semantics.

### K1.3 — Wait and cancellation races

**Dependencies:** K1.2. **Scope:** Implement finite any-of, input subscriptions, eligible unmatched accounting, wait generation/deadlines, out-of-band cancellation and terminal disposition.

**Acceptance:** Before/during/after wait arrivals, stale timers, unmatched backlog and cancel/complete schedules lose no accepted input or wake and never reopen a terminal execution.

### K1.4 — Legacy bridge and K1/E1 gate

**Dependencies:** K1.3. **Scope:** Integrate the new boundary with SDK host driving; bridge viable existing controllers as private Runtime machinery. Port useful conformance and document unsupported legacy features.

**Acceptance:** Full K1/E1 matrix passes, including actual accepted asynchronous exchange through the supported entry; legacy resumptions do not drive new Kernel types/stores. Existing supported behavior is preserved or explicitly migrated/refused.

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
integration SHA and owner discussion/release in that packet's review record. Never infer acceptance
from this table's prose or a test count. Milestone status is derived from its final gate below;
there is no second editable “done” checkbox in 001.

| Packet | Status | Report / review / candidate |
|---|---|---|
| K0.1 | WAITING_FOR_REVIEW | Revision 11: [implementation-11.md](work/K0.1/implementation-11.md); base `6464be12c11eb75f7dfbc5ece12ca8d3020a5c15`, reviewed H10 `012ca92574319aa099a91c845f8fb4375c081f34`, [review-10.md](work/K0.1/review-10.md) administrative commit `5d726684f2911882c22762dcab61f001cd680847`, clean-validated C11 `b40cfe968c8e0d2111a88df68c68f64fd02a4be3`; H11 is this report/status commit (SHA in handoff). K01-R10-01 corrected by citing retirement/readiness and READY-only selection; implementer-discovered K01-I11-01 corrects early-result consumption wording. Builder/typecheck/link checks pass; strict cumulative whitespace remains red only for the two approved historical implementation-04 lines; exception-limited cumulative and strict H10..C11 checks pass. Raw outputs in report, no new evidence file. Prior reviewed history immutable. Awaiting independent review; no acceptance. K0.2 was not started and remains unreleased. |
| K0.2 | PLANNED | — |
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
| K1 | K1.1–K1.4 | K1.4 ACCEPTED, full E1 |
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
