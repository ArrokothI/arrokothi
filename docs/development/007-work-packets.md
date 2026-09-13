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

By a **separate later instruction on 2026-09-13 the owner released K1.0**, and directed that its
second dependency be treated as "the already-built but unaccepted fixture preparation" — resolving
the benchmark E1 prerequisite against this file's general rule that dependencies be independently
ACCEPTED and integrated. The exact instruction, the E1 identities relied on and their unaccepted
status are recorded in [K1.0's contract](work/K1.0/contract.md); that preparation is accepted by
nobody and closes no E1 criterion. K1.0's candidate is now **WAITING_FOR_REVIEW**; see its row below.
That release names no successor: `next_release: none`, and every other successor remains **PLANNED**.

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
| K0.2 | ACCEPTED | Round 17 accepted by [review-17.md](work/K0.2/review-17.md), OpenAI GPT-5.6 Sol (High), 2026-09-12. Accepted H16 `90a6f37eaeb61009025449a1abc7e6d31dc1dbb2`; clean-validated C16 `9821cc27dbe5990f86028846b07edfb31cb65380`; base `c079237ee7aff428481426f93e87a68b79f170d4`. K0.2-C1–C9 PASS; no findings. C8 is backed by accepted benchmark E0 H `26d274fad53b2aa4fc2c7f596cae52e072cd24b5`, independent ACCEPT A `ac1445fb8144ffab8a9153b243d4b9237d1927b0`, owner integration receipt `9b816d47e83ff210fa32400aa91994f8055138d5`, and benchmark main `4d83c245c8f6bb0886c1035ec1c6bba3f91f0ddd`. Integrated on main as `0535160e677231da41b06d9f822e62e2f0364dd1`; owner considers K0.2 merged/closed and K0 milestone closed. [Integration and discussion receipt](work/K0.2/integration-01.md) separately verifies H16→A17 administrative scope, tree-equivalent integration, and the owner closeout. `next_release: none`; K1.0 remains PLANNED and unreleased pending E1 fixture preparation and a separate explicit owner release. |
| K1.0 | WAITING_FOR_REVIEW | Released by the owner on 2026-09-13 with the E1 dependency treated as built-but-unaccepted preparation (see the release paragraph above). Round 8 (correction): clean-validated payload C `b8037aa02f76716d09293fb236e51bf3da9282fb`; base `c9a9ed7e6e538ab0542fc6a999426264abb6212a`; branch `codex/k1.0-target-boundary-legacy-quarantine`; [contract](work/K1.0/contract.md) revision 8; report [implementation-08.md](work/K1.0/implementation-08.md) with raw validation under [validation-08/](work/K1.0/validation-08/MANIFEST.md). The exact candidate H is the commit containing that report, so it cannot be named from inside it; the external handoff supplies it. Prior rounds all returned CHANGES REQUIRED and are preserved: H1 `40bb07a54cd5ba78aed386cb03cd0fb47579b6f6` ([review-01](work/K1.0/review-01.md), K10-R1-01/-02); H2 `d4347837699b80e5cbffa83d48dd7a8c9e53f7e6` ([review-02](work/K1.0/review-02.md), K10-R2-01/-02); H3 `bddbbc6ee8bc3ce1198c431efedcf9227d8d5cba` ([review-03](work/K1.0/review-03.md), K10-R3-01); H4 `14cc1c1997573ac434b2491653ab4cb974abf633` ([review-04](work/K1.0/review-04.md), K10-R4-01 P2 and K10-R4-02 P2); H5 `2b274e6ecbaa8cdcc4600d8574234fc027c2b37e` ([review-05](work/K1.0/review-05.md), K10-R5-01 P2); H6 `5dd570002c082872914291ef0b3cc244bf9bc205` ([review-06](work/K1.0/review-06.md), K10-R6-01 P2, with C1/C2/C3/C5/C6/C7/C8/C9 PASS and C4 FAIL, and K10-R5-01 recorded CLOSED); H7 `2dfc6d818498263c30cb64db32a91aa0ac0543a5` ([review-07](work/K1.0/review-07.md), K10-R7-01 P2, with C1/C2/C3/C5/C6/C7/C8/C9 PASS and C4 FAIL, and K10-R6-01 recorded CLOSED). Round 8 rebuilds C4's section selection so section membership is **structural, never textual**: a block scanner with fence tracking runs each section from the first level-2 ATX heading outside fenced code carrying the exact expected title to the first later such heading carrying the expected next title, and call sites name full titles instead of loose `indexOf` prefixes — so literal heading bytes in prose, inline code, fenced code, escaped text or malformed heading-like lines can neither truncate a section nor select its start. Round 7's structural header/body split, round 6's GFM row discovery, round 5's key-before-value reader, the relational comparisons, the dependency recomputation and the evidence-record guard are preserved and re-asserted. Deliverable remains structural: `packages/kernel` as the enforced landing zone (`private`, no protocol implementation), the executable ownership policy with 24 forbidden-edge controls, the ownership inventory with twelve deferred extraction assignments, and the legacy re-attribution of `kernel-boundaries.test.ts` → `legacy-core-boundaries.test.ts` with its 13 assertions intact. Suite 1775 → 1937, 0 fail, 0 skipped; no legacy source moved and no public export changed; `tests/conformance/k0` byte-identical to base. **It holds no E1 result and no K1 acceptance.** Accepted by nobody; not merged. Ten further defects were self-found across rounds 5–8 (K1.0-SELF-08 … -17); five obligations are recorded unresolved. `next_release: none`. |
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