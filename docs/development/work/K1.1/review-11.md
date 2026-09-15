# K1.1 independent second review — submitted H12

**Reviewer/session:** OpenAI ChatGPT, **GPT-5.6 Sol**, High reasoning.  
**Date:** 2026-09-15, America/New_York.  
**Role:** independent second reviewer. I did not implement K1.1 or modify its source, tests, contract, evidence, or repository state.  
**Session identifier:** not exposed to me.

## Candidate binding and access

This review binds only to:

- **Governing base B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`
- **Semantic payload C10:** `d1fcffdf8b3f411ecde28ae0b14fe79523dfcc14`
- **Submitted candidate H12:** `a047283523f7487cc025f4cf58d17028caad6389`
- **Contract:** `docs/development/work/K1.1/contract.md`, revision 5
- **Report:** `docs/development/work/K1.1/implementation-12.md`
- **Evidence:** `docs/development/work/K1.1/validation-12/`
- **Branch:** `codex/k1.1-create-reserve-async-dispatch`

At review completion the branch had advanced to `0367420d8993075470e8e671e462b643e6d42f10`, which adds the first reviewer's `review-10.md` ACCEPT record. That later review-record commit is not the candidate and receives no certification from this review. I independently reviewed H12 and did not adopt the prior ACCEPT as evidence.

I had authenticated immutable GitHub access to commits, trees, exact files, history, cumulative comparison and raw committed evidence. I obtained the cumulative B→C10 comparison rather than relying on the implementation report or a truncated patch, and inspected all eleven target-Kernel source modules at exact C10 plus the relevant tests, contract, status, structural inventory, implemented-baseline/migration descriptions, prerequisite receipts and correction history.

I did **not** have a usable local repository checkout for an independent repository-level npm rerun. The validation-12 commands are therefore **inspected implementer executions**, not reviewer reruns. Required immutable source and raw evidence were nevertheless available, so governing 006's external-blocker path does not apply.

I also independently inspected upstream `canonicalize` tag `v3.0.0`, resolving to commit `aba9209d044f2729c51141d8a73b11e80816e42c`: version 3.0.0, Apache-2.0, Node >=18, no runtime dependencies, with the unmodified serializer corresponding to the candidate's exact dependency pin. I make no broader legal-clearance claim.

## Governing material and independent coverage

Before relying on `implementation-12.md` or the previous ACCEPT, I read B-pinned `AGENTS.md`, `mental-model/README.md`, the development front door, 006, 007, 008, 012 and 015, then the applicable Layer-3 owners: creation, core, identity, values, state/lifecycle, execution-cycle and evidence.

The relevant canonical rules include:

- a receipt is retained evidence for one named acceptance boundary;
- an acceptance position orders accepted facts within the **owning record/domain** and is **not a global clock**;
- lookup authenticates and scopes before revealing content or existence;
- inspection must scope both **field visibility and existence disclosure**;
- reservation fixes a batch but acknowledges nothing;
- ordinary redelivery preserves the same unresolved exchange;
- K1.1 owns creation/input/reservation/dispatch/inspection while later Outcome, wait/cancellation, Effects, persistence and public integration remain in successor packets.

My independent interaction coverage was:

1. authenticated scope → creation/input identity → replay/conflict;
2. caller observation → immutable accepted value → JCS bytes → retained state → Activation/inspection;
3. creation/input acceptance → retained evidence → replay → inspection;
4. caller-visible receipt fields/tokens → authority scoping → hidden-principal non-disclosure;
5. dispatch bound → exact reservation → intent-before-send → asynchronous Driver call;
6. accepted intent → exact redelivery and exclusion of later Events;
7. refusal paths → zero forbidden mutation/receipt creation;
8. residual caller-induced JavaScript pollution → state commit/projection;
9. unsupported successor surfaces;
10. K1.0 structural zone/inventory/dependency obligations and migration/support claims.

The fourth interaction is where the submitted candidate fails.

## Identity, release, prerequisites and correction delta

The prerequisite chain is present. The K1.0 parent and correction-02 integration receipts identify cumulative integration as PR #21 / `9baff3a03662720af6eefe1ecfabc41fde99298f`, with tree-equivalent cleanup lineage, and C10's raw ancestry evidence confirms that integration plus the later `05f48c204d1eae021b3464c206e5c11e84bb3505` reconciliation are ancestors. The K1.1 records contain the later explicit owner release. I found no prerequisite or release blocker.

H12 is correctly an administrative/evidence correction over unchanged C10. `4c03ce8b... → H12` changes only 007 status material, `implementation-12.md`, and `validation-12/*`; no production source, test, fixture, contract, evaluator, threshold or configuration changes.

The H12 evidence correction itself is sound. `01-tree-and-environment.log` now explicitly measures the tracked `packages/kernel/src/*.ts` relation, lists exactly eleven files, counts the same relation as eleven, and asserts that count. It also imports the barrel and asserts all seventeen runtime exports, reproduces the exact `canonicalize@3.0.0` pin/integrity, and enumerates the permitted import specifiers. This closes the earlier K11-R10-EVID-01 measurement defect at the evidence-record level.

Inspected H12 implementer executions report typecheck clean; 2,265/2,265 full tests; 1,949/1,949 conformance; 207/207 Kernel cases; 22 SDK tests; builder-doc checks; 362/362 architecture cases; and seven of seven named ablations rejecting their weakened implementations. Those are useful mechanical observations, but the ablation matrix does not test the cross-principal receipt-position channel below.

## Finding

### K11-R12-ID-01 — P1 — coordinator-global receipt/refusal positions disclose activity in inaccessible scopes

**Affected:** `packages/kernel/src/coordinator.ts`, `packages/kernel/src/identity.ts`, receipt/refusal replay and inspection.  
**Criteria:** K1.1-C6 and K1.1-C9.  
**Canonical owners:** `mental-model/concepts/identity.md`, `mental-model/mechanisms/evidence.md`.

C10 keeps one mutable counter on the entire `ExecutionCoordinator`:

`#acceptancePosition = 0`

Every accepted creation/input/dispatch runs `#mint`, which increments that single counter. Every protocol refusal runs `#refusal`, which increments the **same** counter, including refusals that name no visible Execution.

`mintReceipt` exposes the resulting number twice:

- `position`
- `token`, as `crt:<position>`, `inp:<position>` or `dsp:<position>`

This creates a deterministic authority side channel.

Consider two authenticated principals A and B whose authority scopes are disjoint but whose requests use the same coordinator:

1. A creates an Execution and receives its own receipt at position `N`.
2. In a control schedule, A immediately submits its next accepted input and receives `N+1`.
3. In another schedule, B performs one accepted operation in B's inaccessible scope between those same two A operations.
4. A's otherwise identical next operation now returns `N+2`.
5. A cannot inspect B's Execution and B's identifier is supposed to be indistinguishable from a missing record, yet A can tell that an additional Kernel decision occurred outside A's visible domain merely by observing A's own authorized receipt.
6. Repeating this reveals counts of intervening accepted/refused activity. Because `#refusal` shares the counter, the channel is broader than accepted Executions alone.

This is not the historical K11-R1-ID-01 defect. R1-ID-01 concerned **one lookup's control-path work**: hidden IDs used to pay for scope scanning while missing IDs returned early. C10 correctly normalizes that path. The new finding concerns **information carried by an otherwise authorized receipt after unrelated hidden activity**.

It also is not cured by calling the token “opaque.” The candidate separately returns the numeric `position`, and its current token spelling embeds the same value.

The canonical rule is stronger than “do not return the hidden record itself”: acceptance position is not a global clock, lookup/inspection scope existence disclosure, and K1 inspection must not leak inaccessible records. A coordinator-global monotonically observable sequence gives one principal information about decisions outside its authorized visible domain.

### Required outcome

Restore scoped non-disclosure across all caller-visible acceptance evidence.

A principal's authorized receipts, refusals and inspection results must not reveal whether or how many operations occurred solely in scopes that principal cannot observe. At the same time, preserve the existing obligations that an exact replay returns its original retained receipt, each receipt names its real boundary, retained evidence remains immutable, and authorized ordering/evidence remains meaningful within the appropriate owning record/domain.

The correction must audit the information flow as a class rather than special-case one token spelling or one counter. In particular, evaluate every externally observable monotone identifier/position/counter and every inspection projection affected by the chosen ownership domain.

A distinguishing test should compare otherwise identical A schedules with and without interposed B-only activity and demonstrate that no A-visible evidence discloses the hidden interposition. A weakened implementation using one shared coordinator-global visible position should be rejected.

This specifies the required observable outcome, not a mandatory patch design.

## Prior-finding reconciliation

I reconciled the historical findings rather than inheriting their closure mechanically.

The concrete value-fidelity defects K11-R1-VAL-01 and K11-R2-VAL-02, including `__proto__`, non-index array names, Proxy read/descriptor disagreement, inherited serializer state and later ambient-operation manifestations, remain materially corrected in C10. The later STATE/VAL chain—K11-R5-STATE-01, K11-R5-VAL-03, K11-R6-STATE-02, K11-R6-VAL-04, K11-R6-VAL-05 and K11-R7-STATE-03—has been reconstructed through own-data operations, null-prototype descriptors, serializer-window restoration and distinguishing tests. I found no new counterexample in that JavaScript-operation family.

K11-R2-EVID-01 remains closed: retained receipt/refusal objects are frozen at their mint sites and the mutation tests distinguish that invariant.

K11-R1-SCOPE-01 remains closed: cancellation is again K1.3-owned and K1.1 refuses it rather than implementing terminal disposition.

K11-R1-JCS-01 remains closed by exact owner-approved `canonicalize@3.0.0`.

K11-R1-PROC-01 remains closed by the prerequisite integration receipts and ancestry.

K11-R1-DOC-01 and K11-R3-DOC-02 remain closed; current package/support/import descriptions accurately describe the partial private K1.1 boundary.

K11-R3-ID-02 and K11-R3-ID-03 remain closed on non-text identity and scope-validation ordering.

K11-R3-LIMIT-01 remains closed; oversized arrays are rejected without declared-length traversal.

K11-R3-PROC-02 remains closed; raw evidence is accessible.

K11-R4-DISPATCH-01 remains closed; dispatch bound is one observation reused for validation and selection.

K11-R4-PROC-01 remains closed for the current handoff chronology.

K11-R10-DOC-01 remains closed in current 007 material.

K11-R10-EVID-01 is closed by H12's regenerated, self-consistent tracked-set/export/import evidence.

**K11-R1-ID-01 itself remains closed on its narrow control-path/timing invariant, but the broader scoped non-disclosure family is not closed because of K11-R12-ID-01.**

## Migration, examples and structural claims

The cumulative inventory and source tree support the candidate's bounded migration claim. K1.1 modifies the private `packages/kernel` target zone without routing SDK, legacy core or runtime integrations through it. The K1.0 ownership inventory still records no target→legacy reach; target third-party reach is exactly `canonicalize`; the package remains private.

The K1.1 dispositions of DX-1, DX-2, DX-3 and DX-12 are coherent: hash is not extracted, canonical bytes use the approved JCS dependency rather than legacy repair-on-encode code, result shape is implemented in-zone, and the old closed controller discriminator is refused rather than migrated.

`docs/development/002-implemented-kernel-baseline.md` correctly describes the target K1.1 behavior as candidate-tree work and explicitly leaves integration/acceptance to 007. I found no false SDK/example migration or K1/E1 claim.

## Per-criterion verdicts

| Criterion | Verdict | Independent assessment |
|---|---|---|
| **K1.1-C1** | **PASS** | Atomic creation, scoped key/content replay/conflict, initial input and READY publication remain coherent. |
| **K1.1-C2** | **PASS** | Input-ID triple, replay/conflict, capacity-before-acknowledgment and retained ingress remain coherent. |
| **K1.1-C3** | **PASS** | One observed value determines retained structure and JCS identity; limits/refusals and the prior ambient-operation corrections remain distinguishing. |
| **K1.1-C4** | **PASS** | One bound observation, acceptance-order reservation, intent-before-send, immutable exchange and asynchronous Driver delivery remain correct. |
| **K1.1-C5** | **PASS** | Ordinary redelivery preserves the exact unresolved exchange and excludes later arrivals. |
| **K1.1-C6** | **FAIL** | Receipt objects are immutable and replayed correctly, but their globally visible position/token leaks activity belonging solely to inaccessible scopes. K11-R12-ID-01. |
| **K1.1-C7** | **PASS** | Outcome/takeover/recovery/cancellation remain explicit successor-packet refusals with no accepted-state mutation. |
| **K1.1-C8** | **PASS** | No Agent/Workflow discriminator is carried into the target protocol; dependency/import boundary remains exact. |
| **K1.1-C9** | **FAIL** | Inspection is mechanically inert and explicit lookup scoping is correct, but the retained receipt evidence it exposes contains a cross-scope activity side channel, contradicting the scoped “leaks nothing” obligation. K11-R12-ID-01. |
| **K1.1-C10** | **PASS** | H12's regenerated evidence consistently establishes eleven tracked target `.ts` files, seventeen runtime exports, private package status and exact permitted dependency reach. |

No criterion is deferred. No architecture rule is unresolved. No required source/evidence is inaccessible.

## Coverage gaps and evidence attribution

I did not independently execute the npm validation suite and did not independently recompute every H12 SHA-256 attachment digest. Those are execution-access limitations, not blockers, because complete immutable source and raw attachments were available for inspection.

The green 207-case Kernel suite and seven round-12 ablations are **mechanical implementer evidence**, not proof against untested semantic interactions. The current receipt tests cover distinct boundaries, replay, immutability, hidden-vs-missing lookup behavior and position progression, but they do not compare one principal's observable receipts with and without interposed inaccessible-principal activity. That is the missing distinguishing schedule exposed by this review.

## Compact 008 correction handoff

Correct the same released packet **K1.1** on `codex/k1.1-create-reserve-async-dispatch`.

Keep governing B `777b9955fb3a443f700b4f3d1f4f2aef1869345b` fixed. Reviewed candidate is H12 `a047283523f7487cc025f4cf58d17028caad6389`, semantic payload C10 `d1fcffdf8b3f411ecde28ae0b14fe79523dfcc14`, contract revision 5.

Open mandatory finding: **K11-R12-ID-01**. Required outcome: caller-visible acceptance evidence and inspection must not disclose decisions occurring solely in inaccessible authority scopes, while preserving retained exact replay, boundary-specific evidence and all previously closed semantics. Re-audit the complete scoped-evidence information flow and add a distinguishing cross-principal interleaving case plus a weaker-form ablation.

Preserve H12's valid evidence correction and every genuinely closed prior finding. After correction, perform the full cumulative 006/012 review path and produce a fresh exact C/H under 008. Do not release or begin K1.2 as a consequence of this review.

## Owner note — outside the reviewer report

There has been **substantial improvement**, not simple stagnation. The implementation agent repeatedly reconstructed difficult JavaScript boundary semantics rather than merely hiding individual tests, and C10 materially closes the long ambient-operation chain that consumed several rounds.

This new finding does, however, return to the **broader scoped non-disclosure family** first encountered in K11-R1-ID-01. The earlier correction audited hidden-vs-missing lookup work, but apparently did not perform a complete information-flow audit over other caller-visible fields such as receipt positions/tokens. I would not call the agent globally stuck or recommend switching solely because of this one newly exposed mechanism. I would tell the owner explicitly to require a full scoped-observable audit in the next correction; if the next round only changes this counter/token while another equivalent authority side channel survives, that would be a stronger sign of a local minimum and a good point to switch or escalate the implementation agent.

## Coding-agent correction prompt

Read `docs/development/work/K1.1/review-11.md` in full first. It is the authoritative independent second-review handoff for exact K1.1 H12 `a047283523f7487cc025f4cf58d17028caad6389`. The open mandatory finding is **K11-R12-ID-01: coordinator-global receipt/refusal positions disclose activity in inaccessible scopes**.

Correct the same released K1.1 packet. Governing base remains `777b9955fb3a443f700b4f3d1f4f2aef1869345b`. Do not begin or release K1.2, do not weaken contract revision 5 or the governing identity/evidence rules, and preserve all valid C10/H12 corrections.

The invariant to restore is **scoped non-disclosure across the complete accepted-evidence path**. Today one coordinator-wide `#acceptancePosition` is incremented by all accepted boundaries and refusals, and the resulting number is directly exposed as `Receipt.position` and embedded in `Receipt.token`. Consequently caller A can distinguish whether inaccessible caller B performed intervening operations even though B's Executions themselves are hidden.

Treat the following as a distinguishing schedule, not as a prescribed implementation:

A creates/accepts an operation and observes its own evidence. Run an otherwise identical A schedule twice. In one schedule, perform one or more B-only accepted/refused operations in an authority scope A cannot see before A's next operation. A's authorized observable result—including receipts/tokens/positions, replay behavior and inspection—must not reveal whether or how many solely inaccessible B operations occurred. Hidden-record and missing-record behavior must remain indistinguishable. Exact replay must still return the original retained receipt, receipts must still name their correct boundary, and retained evidence must remain immutable.

Audit the whole class: every externally observable monotonically changing identifier, position, counter, refusal field, token spelling and inspection projection that could encode decisions outside the observer's authority. Do not fix only `token`, only `#mint`, or only accepted operations; `#refusal` currently participates in the same shared sequence.

Choose whatever in-scope representation/ownership mechanism satisfies the canonical “owning record/domain, not a global clock” and scoped-existence rules; this review does not prescribe per-Execution, per-scope or any other specific storage design.

Add deterministic positive/negative tests and a distinguishing ablation that reintroduces a caller-visible coordinator-global sequence and is rejected. Re-run the full cumulative packet validation, preserve immutable historical evidence, and produce a fresh C/H under 006/008 for independent review.

CHANGES REQUIRED