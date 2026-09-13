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
nobody and closes no E1 criterion. K1.0 is now **CHANGES_REQUESTED**: [review-14](work/K1.0/review-14.md)
historically ACCEPTED exact H `0a9333faa7ea9cdf742f01b16af1069357b88bad`, but the requested
second independent [review-15](work/K1.0/review-15.md) found C4 defect **K10-R14-01** and invalidated
using that ACCEPT for integration or dependent release. Correction resumes the same released packet;
no successor is released (`next_release: none`), and every other successor remains **PLANNED**.

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