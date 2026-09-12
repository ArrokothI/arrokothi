# Independent review — K0.2, round 5

## Reviewer, date, identity

- **Reviewer:** OpenAI ChatGPT, GPT-5.6 Sol, High reasoning.
- **Role:** independent reviewer. I did not implement C5/H5.
- **Review date:** 2026-09-12 (America/New_York).
- **Governing base:** `c079237ee7aff428481426f93e87a68b79f170d4`.
- **Previously reviewed H4:** `ed438e88173e8f7306dfdfb16c290ea40fa0a0fd` — round 4 `CHANGES REQUIRED`.
- **Round-4 review record:** `55f11858962c5dfd9f75c20709209684e5abcbc2` (`review-04.md`).
- **Corrected clean payload C5:** `159f3dc0c13779c54a515aaffb74456bccafda09`.
- **Reviewed candidate H5:** `053bca6c77ad37aa3f3a4816765639707b662a4d`.
- **Branch reviewed:** `codex/k0.2-public-controls-e0-gate`.
- **Benchmark revision inspected read-only:** `98756f8c10bd806125da8318f1a129bc030aca61`.

This review is bound to H5 exactly. The reviewer-record commit that contains this file is administrative provenance and is not part of H5.

## Access and validation limits

I reviewed through the authorized GitHub connector: exact refs/commits, reviewer-A4→C5 correction delta, C5→H5 administrative delta, the governing K0.1 worksheet, C5 contract/specification, fixture runner, protocol vocabulary, scenarios, coverage map/tests, counterexample corpus, blind-spot regression material, implementation report and the pinned benchmark repository.

I had no local repository checkout and did not independently rerun the implementer's repository commands. GitHub exposes no status checks or workflow runs for C5 through the available connector. The report's typecheck/test/conformance/SDK/architecture/builder-doc results are therefore implementer-reported validation rather than reviewer-rerun evidence.

## Identity and correction-delta verification

The round-5 history is clean and linear:

- `55f11858962c5dfd9f75c20709209684e5abcbc2` → C5 is one correction commit touching 11 K0.2 contract/specification/conformance files.
- C5 → H5 is one administrative commit containing only `docs/development/007-work-packets.md` and `docs/development/work/K0.2/implementation-05.md`. No payload rides in H5.
- Repository `main` remains the governing base `c079237ee7aff428481426f93e87a68b79f170d4`.
- Prior review records remain historical provenance.

I do **not** recommend reverting C5. The R5-a4 withdrawal/assignment is sound, the round-4 named splits are materially improved, and the representation sweep found legitimate over-constraints. The findings below should be corrected forward from C5.

## Round-4 finding dispositions

### K02-R4-01 — invented empty-string subscription-validity rule — **CLOSED**

C5 correctly removes the rule that `subscriptionClass: ""` is canonically malformed and removes the false counterexample built on it.

The governing W-1 text is explicit: each present subscription must be a declared subscription identity, but rule 3 fixes only that the entry *is* such an identity; its exact spelling remains implementation-owned. The K0.1 correction history identifies K1.3 as the owner of that spelling. In this fixture's current `string` representation, inventing a token-level negative case would simply choose the representation early again.

Assigning R5-a4's concrete representation/validation case to K1.3 is therefore defensible. The current K0/K1 semantic rule remains exercised independently: application input is eligible only through declared subscriptions, dependency alternatives cannot substitute for them, and subscription-only waits remain first-class.

### K02-R4-02 — inconsistent assertion granularity — **PARTIALLY CLOSED; systemic defect remains open**

C5 fixes the four examples named in review-04 and several additional inherited bundles. In particular, progress versus emissions on rejected-envelope partial acceptance, stale-timer wake versus retirement, the completion-refusal clauses, terminal processed-versus-deleted disposition, duplicate acceptance versus emission publication, W-4 lifecycle versus wait-record existence, and recorded-rejection replay versus manufactured receipts now have narrower dedicated transcripts.

That is real progress. However, the new `COUPLED_FIELD_GROUPS`/`atomicity` mechanism does not establish the contract's stated standard, and some retained atomicity claims are substantively false. K02-R5-02 below records the remaining defect.

## Round-5 findings

### K02-R5-01 — P1 — one TokenRelation incorrectly imposes cross-namespace uniqueness between receipts and Activation IDs

**Affected material:** `tests/conformance/k0/fixture.ts`, `oracle-discrimination.test.ts`, and the C7 representation-neutrality claim.

C5 correctly observes that both receipt serialization and Activation-ID spelling are implementation-owned. It therefore replaces literal comparison with a relational mapping. The problem is that `runScenario` constructs **one** `TokenRelation`, and `compareRepresentations` sends both `receipt` and `activationId` through that same relation.

`TokenRelation` has one shared forward/backward bijection. Consequently, if an implementation uses the same opaque string in the receipt namespace and the Activation-ID namespace, C5 treats the second use as a collision even when every relation *within each namespace* is correct.

The governing worksheet does not impose that cross-domain rule:

- ID-3/ID-9 constrain Activation IDs relative to other Activation IDs: same exchange keeps the ID; a new semantic exchange gets a different one.
- ID-6/ID-7 constrain receipt identity/scope relative to other receipts and accepted boundaries, while the exact receipt serialization is explicitly implementation-owned.
- Nothing says an opaque receipt token's raw representation must be disjoint from the raw representation chosen for an Activation ID. They are different typed protocol concepts.

A conforming adapter could therefore expose receipt `"opaque-1"` and Activation ID `"opaque-1"` while keeping both domains internally correct. C5 rejects that candidate solely because its normalizer accidentally treats the two token families as one namespace.

The permanent tests cover consistent respelling and collapse **within** each family, but do not exercise this cross-family reuse, so the over-constraint survives green tests.

**Required outcome:** preserve relational comparison, but scope the bijection by protocol token family (for example one relation for receipts and one for Activation IDs, or a typed `(family, expected-token)` key). Add a distinguishing conforming probe where a receipt and an Activation ID deliberately share the same raw spelling and PASS, while same-family collapse still FAILS. Re-audit any other normalization state for accidental cross-domain coupling.

**Impact:** K0.2-C7 **FAIL** because the oracle can reject a conforming implementation for an implementation-owned representation choice.

### K02-R5-02 — P1 — the atomicity guard is circular/incomplete and a canonical row-7 deadline mutation remains unobservable; K02-R4-02 is not fully closed

**Affected material:** `coverage.ts`, `coverage.test.ts`, `candidate.ts`, `fixture.ts`, the cancellation control, and C6/C7/C9.

C5's guard groups fields that a *conforming* accepted transaction is supposed to write together and then requires an `atomicity` note when a counterexample crosses groups. That is useful as a review prompt, but it cannot justify leaving clauses bundled: the entire purpose of these counterexamples is to model implementations whose atomicity is broken. A normative rule saying two facts commit together is evidence that a partial-write candidate is **wrong**, not evidence that such a wrong implementation is implausible.

Two concrete retained cases demonstrate the problem:

1. **R3-b's atomicity note is false.** R3-b keeps “same-identity/different-content is rejected, not merged” as one entry. Its note says a candidate that records the conflict *and* merges it is “not plausible,” because merge happens instead of rejection. But OA-5 exists precisely to prohibit rejected Outcomes from leaking partial state. A plausible implementation can detect and record the duplicate conflict correctly while a progress writer that ran too early leaves the conflicting progress installed. This packet already models the same partial-writer shape for malformed envelopes, cancellation and completion. The current transcript changes both progress and rejection, so there is still no dedicated conflict-path counterexample for “rejection recorded correctly, but accepted state was nevertheless patched.”

2. **R7-a6 still claims more than the fixture can observe.** The obligation says a cancellation-losing Outcome produces “no wait, deadline or next-state change.” Its sole counterexample changes the lifecycle state. `Observation` exposes lifecycle/readiness and a live wait generation, but no persisted deadline/timer-registration fact at all, and the cancellation scenario submits losing `continue`/`complete` Outcomes rather than a losing `await(wait-with-deadline)`. Yet accepted CX-6/OA-5 explicitly require zero wait/**deadline**/readiness/next-state mutation. A broken implementation can keep the Execution correctly `CANCELLED`, report the correct rejection, and still leak a deadline/timer registration from a losing `await` path; H5 has neither a schedule that submits that case nor an observation that can see it.

A third warning sign is the guard's `lifecycle` group itself: it places `state`, `liveWaitGeneration` and `waitEndedReadiness` in one coupled group because conforming W-2/W-3/B-6/B-7/B-8 transactions write them together. Earlier review rounds already proved that candidates can violate those facts separately — for example wake without retirement, retirement without wake, or phantom readiness. Grouping them suppresses exactly the field-crossing signal that exposed those defects. C5 manually split some such cases, but the mechanical guard cannot establish that no others remain.

The same reasoning should be applied to every one of the 17 atomicity notes. An `atomicity` note may explain why a **specific bug construction** legitimately moves multiple fields; it cannot serve as an exemption from asking whether another plausible partial writer can violate one retained clause while getting the others right. In particular, statements like “that candidate is not plausible” need support from the implementation boundary/writer model, not from the fact that the protocol requires an atomic result.

**Required outcome:** treat `COUPLED_FIELD_GROUPS` only as a review heuristic, not as evidence that within-group partial failures are impossible. Re-audit all retained composite/atomicity entries against plausible broken writers and transactions. At minimum:

- split or otherwise directly evidence the duplicate-conflict path where the rejection is correctly recorded but conflicting state still leaks;
- make CX-6's zero wait/deadline/readiness/next-state requirement candidate-observable. Exercise a losing `await` carrying a wait/deadline (or an equivalent canonical schedule), and expose the smallest truthful accepted-state observation needed to detect leaked deadline/timer registration rather than inferring it from terminal lifecycle state;
- preserve the already-correct narrow splits rather than recombining them through field groups.

**Impact:** K0.2-C6 **FAIL** because the row-7 unsafe control still claims a zero-deadline mutation that its schedule/observation surface cannot distinguish; K0.2-C7 **FAIL** because the promised per-assertion discriminating wrong candidate is still absent for retained composite behavior; K0.2-C9 **FAIL** because the inventory still does not meet its own independently-distinguishable standard.

## Per-criterion verdicts

| Criterion | Verdict | Review basis |
|---|---|---|
| K0.2-C1 | **PASS** | The deterministic K0 trace remains coherent; C5's corrections do not weaken its accepted-input/typed-output/subscription-wait/completion path. |
| K0.2-C2 | **PASS** | The explicit delayed-Runtime/non-blocking scenario remains coherent. |
| K0.2-C3 | **PASS** | The independent-ledger retained-reference and `"__proto__"` corrections remain intact. |
| K0.2-C4 | **PASS** | The direct-baseline/shared-laboratory specification remains intact. |
| K0.2-C5 | **PASS** | Both public application shapes remain prepared without claiming E0 execution or acceptance. |
| K0.2-C6 | **FAIL** | The cancellation control claims zero wait/deadline/readiness/next-state mutation, but a losing deadline-bearing wait is not exercised and deadline/timer registration is not observable. K02-R5-02. |
| K0.2-C7 | **FAIL** | The shared receipt/Activation token relation rejects a permitted representation, and retained composite behavior still lacks exact discriminating candidates. K02-R5-01/R5-02. |
| K0.2-C8 | **FAIL — BLOCKED_EXTERNAL** | Accepted pinned E0 evidence still does not exist at the inspected benchmark revision. |
| K0.2-C9 | **FAIL** | R5-a4 is now honestly assigned, but the atomicity inventory/guard still leaves independently violable or unobservable clauses counted as one assertion. K02-R5-02. |

## External E0 blocker

The benchmark repository's `main` still points exactly to `98756f8c10bd806125da8318f1a129bc030aca61`. Its roadmap still states that E0–E6 are planned, not implemented.

K0.2-C8 therefore remains `BLOCKED_EXTERNAL`: responsible actor is the benchmark repository owner; unblock requires an accepted E0 deliverable/evidence set at a pinned benchmark revision that this repository can record and an independent reviewer can inspect. Nothing in H5 grants or infers E0 acceptance.

This is not an architecture-decision blocker. The correct overall review verdict remains `CHANGES REQUIRED`.

## Validation-evidence distinction

`implementation-05.md` reports clean-C5 validation including typecheck, 1384 tests with zero failures, 1275 conformance tests, SDK, architecture and builder-doc checks. I did not independently rerun those repository commands, and no GitHub status/workflow evidence for C5 is exposed through the available connector.

The round-5 findings are source/contract counterexamples that a green suite cannot discharge: K02-R5-01 identifies a conforming representation the current oracle rejects, and K02-R5-02 identifies canonical behavior that the current schedule/observation inventory does not discriminate.

## Correction handoff and revert recommendation

**Fix forward from C5. Do not revert C5/H5 to C4/H4.** R5-a4's withdrawal/assignment is correct; the new narrow transcripts close many real gaps; recovery-hold reason normalization and per-domain representation neutrality are the right direction. Reverting would restore known false rules and bundled assertions.

Correct the same released K0.2 packet. Separate receipt and Activation-ID relation namespaces; then finish the assertion reconstruction without treating normative transaction coupling as proof that partial-write bugs are implausible. Make the row-7 deadline clause genuinely observable and exercise it. Preserve all prior sound fixes. Keep C8 `BLOCKED_EXTERNAL` until accepted pinned E0 evidence actually exists. Produce a newly validated clean payload and administrative candidate/report. Do not self-accept, merge, close K0 or release K1.0.

## Final outcome

H5 `053bca6c77ad37aa3f3a4816765639707b662a4d` is not acceptable. C5 is another substantial improvement and should be fixed forward, not reverted, but its representation-neutrality fix accidentally couples two independent token domains, and its atomicity machinery still permits partial-write blind spots—one of which leaves a canonical cancellation/deadline obligation unobservable. C8 also remains externally blocked.

**CHANGES REQUIRED**
