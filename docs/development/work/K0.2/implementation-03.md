# Implementation report — K0.2, round 3

Correction round for the CHANGES REQUIRED verdict on H2, recorded in
[review-02.md](review-02.md). Rounds 1 and 2 are unchanged.

## Identity

- **Packet / parent:** K0.2 — public controls and the K0/E0 gate; parent milestone K0.
- **Contract:** [`contract.md`](contract.md), **revision 3**, at C3 below.
- **Governing process baseline:** `c079237ee7aff428481426f93e87a68b79f170d4`, unchanged.
- **State: `BLOCKED_EXTERNAL`,** unchanged. C1–C7 and C9 are corrected and independently reviewable;
  C8 cannot be satisfied from this repository. See §4.
- **Owner release:** the original explicit release of 2026-09-11 still stands; corrections on a
  released packet need no renewed permission. No successor is started or released.
- **Branch:** `codex/k0.2-public-controls-e0-gate`. **Configured remote:** `origin`
  `https://github.com/ArrokothI/Agent_SDK.git`, unchanged.
- **Base commit:** `c079237ee7aff428481426f93e87a68b79f170d4`, unchanged.
- **Previously reviewed H2:** `60a05f822b9415382653e286be1189ec0a01e472` (CHANGES REQUIRED).
- **Reviewer records on the branch:** `9c63b2c1064747b3c00594584d910f30852d2a18` adds
  [review-01.md](review-01.md); `a057a122318eb39508542af4b4c5d53200115259` adds
  [review-02.md](review-02.md). Both are the reviewer's/owner's commits, not this round's payload.
  They also close the round-1 record gap reported in [implementation-02.md](implementation-02.md) §1.
- **Clean payload C3:** `acb5e01c80f015ebf715f4de3e7fdb10f05f1a33`. Final validation ran on this tree.
- **Candidate H3:** the commit containing this report. Full SHA in the external handoff.
- **Exact C3..H3 administrative allowlist:** `docs/development/work/K0.2/implementation-03.md` (this
  file) and the K0.2 row in `docs/development/007-work-packets.md`. **No payload rides in H3.**
- **Correction delta:** `a057a122..acb5e01c` is 9 files, +317/−43 — the correction proper.
  `60a05f82..acb5e01c` is 11 files because it also spans the two reviewer record commits above.
- **Working tree:** clean at C3 and at H3.

## 1. Finding dispositions

### K02-R2-01 — the completion control invents a rejection-reason distinction the protocol does not require — **CLOSED**

**The finding is correct, and I accept it without qualification.** I checked it against the accepted
sources rather than taking it on the reviewer's word, and it holds:

- **§11 row 4** requires an Effect-proposing Outcome to be "rejected at whole-envelope validation
  (OA-3) with a recorded, inspectable reason". It fixes *that* there is a reason, not *which*.
- **EF-1/EF-2** require that refusal for every K1 Outcome proposing an Effect, independently of what
  the Outcome's next step is.
- **CX-3** records that the owned-obligation check is satisfied trivially at K1 and becomes non-trivial
  only at K2.

So a K1 candidate handed `complete` + an Effect, which refuses the envelope atomically and records
"Effect proposals are not supported before K2", is **conforming**. H2's oracle failed it. The fixture
was rejecting correct work, which is a worse defect than round 1's under-coverage: under-coverage lets
a wrong candidate through, over-constraint fails a right one and there is no later gate that recovers
from that.

**What changed.**

| Material | Correction |
|---|---|
| `scenarios.ts` `control-completion-obligations` | The expected rejection reason is now the same EF-2 refusal the Effect-refusal scenario pins. The `forbids` prose no longer demands a completion-specific reason and instead states the real obligations: no terminal state, the envelope refused whole rather than stripped of its Effect and accepted, no acknowledgment. The scenario's doc comment records the withdrawn requirement and why. |
| `candidate.ts` | `completion/rejected-for-the-wrong-reason` **deleted**. Replaced by `completion/refused-envelope-partly-committed`: a candidate that reports the refusal while committing the progress and acknowledgment underneath it — genuinely forbidden by OA-3/OA-5 on a completing envelope as on any other. |
| `coverage.ts` R8-a | Obligation narrowed to what is observable: "A completing Outcome carrying newly proposed Effects is not accepted: the Execution reaches no terminal state, the envelope is refused whole with a recorded reason, and nothing in it is committed." |
| `public-fixture-specification.md` §3 | Control row rewritten; "reject for the wrong reason" removed from the must-never column. |
| `contract.md` C6 | Adds the general rule: a control may only assert distinctions the governing protocol makes observable. |

§11 row 8's previously-owned-obligation clause remains assigned to **K2.4** with CX-3's reason,
exactly as before — the reviewer agreed that part was defensible, and it is untouched.

**Structural safeguard, because the class of defect matters more than the instance.** The invalid
counterexample reached the corpus because nothing obliged its author to say which rule the behavior
broke — there was no such rule, and no check could notice. Every `Violation` now carries a
`forbiddenBy` citation naming the governing decision, and `coverage.test.ts` asserts every transcript
has one that identifies a real decision. Verified discriminating: replacing one citation with "it just
feels wrong to me" fails the check. This does not make an invalid counterexample impossible — a false
citation would still pass — but it converts a silent assumption into a written claim a reviewer can
check, which is the enforceable part.

**Neighbouring audit.** I swept every other pinned rejection reason in the corpus for the same defect.
Seven distinct reasons exist. One — CX-6's "cancellation accepted before Outcome acceptance" — is
**mandated by name in the worksheet** and is correctly pinned. The other five each distinguish a
different rejection *condition* (duplicate conflict, create-key conflict, duplicate emission key,
structurally empty wait, unavailable pinned revision); none makes a choice between two canonically
equivalent answers to the same condition into a pass/fail. The generalization is now written down in
`protocol-vocabulary.ts` beside `RejectionClassification`, so the next author does not have to
re-derive it: reason strings are representational conventions except where a decision fixes them, and
a fixture may never fail a candidate for picking one of two correct answers.

### K02-R2-02 — `snapshot()` is not value-preserving for every valid E-1 object member name — **CLOSED**

**Reproduced before fixing.** I ran the checked-in C2 algorithm against
`JSON.parse('{"__proto__":{"x":1},"safe":2}')` and observed exactly what the review describes: the
`__proto__` member absent from `Object.keys` and from the JSON serialization, its value sitting on the
snapshot's prototype, the prototype not frozen, and `Object.getPrototypeOf(snapshot).x = 99` still
succeeding after `deepFreeze`. The ledger was therefore both **incomplete** about what a candidate
attempted and **rewritable** through the prototype it had grown — the same class of defect as
K02-R1-02, surviving in the one key the round-1 fix did not reach.

**Fix.** `snapshot()` writes members with `Object.defineProperty` instead of assignment, so an own
data property is created whatever the key is and no member name gets special treatment.
`deepFreeze()` walks `Reflect.ownKeys` rather than `Object.values`, so nothing reachable is skipped
because of how it is keyed.

**Distinguishing tests, and proof they distinguish.** Seven new tests: the member at top level; JSON
round-trip equality; the stored value frozen and absent from the prototype; caller-side mutation after
`attempt()`; the member inside a returned observation; the neighbouring shadowing names
(`constructor`, `toString`, `hasOwnProperty`, `valueOf`, `""`, `"0"`); and the member nested inside
objects and arrays at depth. Run against the C2 implementation, **five fail**; all seven pass against
C3. The two that pass both ways are documentation cases — no other key has an accessor on
`Object.prototype` — and are kept because the claim is about the whole key space, not one key.

**One defect of my own, found and fixed during this round.** My first version of the frozen-value test
asserted non-leakage by writing `x = 99` onto `Object.getPrototypeOf(recorded)` — which *is*
`Object.prototype`. That polluted a global for the whole test process to test for pollution, and it
failed. The assertion now checks that the prototype is exactly `Object.prototype` and carries no such
member, writing nothing. Recorded as K0.2-SELF-07 below.

## 2. Whole-packet re-audit

| Area | Result |
|---|---|
| Completion control, oracle, coverage | Realigned with CX-3/EF-1/EF-2 (§1). |
| Every other pinned rejection reason | Swept; one canonically mandated, five condition-distinguishing, none over-constraining. |
| Counterexample validity, corpus-wide | All 30 transcripts now cite a governing decision; the check is enforced and verified discriminating. |
| `protocol-vocabulary.ts` | Gains the normative note on what a fixture may make pass/fail. |
| Ledger faithfulness | Corrected for the whole accepted key space; regression tests proven against C2. |
| Interaction invariants | Unchanged and still passing; the completion correction did not disturb them. |
| Contract | Revision 3: C3 and C6 amended, C7 and C9 gain the counterexample-validity requirement. |
| Specification | §2, §3 and the scenario table reconciled; §9 added recording what round 2 got wrong. |
| Rounds 1 and 2 records | Untouched, as immutable history. |

Counts after correction: 11 scenarios, 6 unsafe/state-loss controls, 33 obligations, 30 violating
transcripts. The transcript count is unchanged because one invalid transcript was **replaced**, not
merely deleted.

## 3. Additional self-found defects

| ID | What | Disposition |
|---|---|---|
| **K0.2-SELF-01** | The architecture guard's raw-text import scanner misreads prose of a particular shape. | **Still not fixed here, deliberately**; still recommended as a separate corrective packet. Re-verified at C3: zero false positives from the k0 fixture. |
| **K0.2-SELF-07** | My first `__proto__` immutability test wrote to `Object.prototype` to check for prototype pollution, polluting a global for every other test in the process. | **Fixed in C3** before commit. The assertion now checks the prototype's identity and absence of the member without writing anything. |
| **K0.2-SELF-08** | The new counterexample-citation check used a regex with `\b` immediately before `§11`, which can never match because `§` is not a word character; it failed a correctly cited transcript. | **Fixed in C3** before commit, and the reason recorded at the site. |

K0.2-SELF-04, -05 and -06 were closed in C2 and are unchanged.

## 4. K0.2-C8: the E0 blocker, re-checked again

| Field | Value |
|---|---|
| State | **BLOCKED_EXTERNAL**, unchanged |
| Benchmark revision re-checked | `98756f8c10bd806125da8318f1a129bc030aca61` — identical to rounds 1 and 2; clean tree |
| Observed | `docs/roadmap.md:3` still states E0–E6 are "**planned**, not implemented"; `docs/current-state.md:79` still lists "Start E0 ownership/claim fixtures" under next useful work; no tracked E0 artifact outside `.git` |
| Access used | read-only; nothing created or modified in that repository |
| Responsible actor | benchmark repository owner |
| Unblock condition | an accepted E0 deliverable at a pinned benchmark revision, recordable here and inspectable by a reviewer |
| Claimed | **nothing.** No E0 acceptance is claimed, implied, inferred or self-granted |

No genuinely new accepted E0 evidence exists. K0.2 stays `BLOCKED_EXTERNAL`, is **not presented as
review-ready as a whole**, and **K0 does not close**.

## 5. Validation

**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64. **Working
directory:** repository root. **Tree:** clean payload C3 `acb5e01c80f015ebf715f4de3e7fdb10f05f1a33`.

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0, no diagnostics |
| `npm test` | exit 0 — **1193 tests, 240 suites, 1193 pass, 0 fail, 0 skipped, 0 todo** |
| `npm run test:conformance` | exit 0 — 1084 tests, 1084 pass, 0 fail |
| `npm run check:builder-docs` | exit 0 — 26 Markdown files, 280 local links/anchors, 38 public package imports |
| `node --test tests/conformance/k0/*.test.ts` | exit 0 — **228 tests, 228 pass** (220 at H2) |
| pre-existing suite with `tests/conformance/k0` excluded | exit 0 — **965 tests, 965 pass**; unchanged across all three rounds |
| `git diff --check --cached` on C3 | exit 0 |
| K0.2 document link/anchor audit | 14 local links, 0 problems |
| import-scanner false positives in the k0 directory | 0 |
| K02-R2-02 discrimination against the C2 sink | **5 of 7** new tests fail against C2, all 7 pass against C3 |
| counterexample-citation check discrimination | a transcript citing no decision fails the check |

`npm run test:evals` not run: no Agent behavior or eval fixture change. `npm run test:sdk` not run
separately: `npm test` already includes it.

**Raw evidence.** Counts are inline. No external artifact is cited: the only raw logs are
session-local, and 008 is explicit that a temporary local path is insufficient. Reproducibility
replaces it — every command is deterministic and offline, so a reviewer rerunning at C3 gets these
numbers, and a divergence is itself a finding.

**On the reviewer's validation limits.** Review-02 correctly records that the H2 command results were
implementer-reported rather than reviewer-rerun, and that no CI status is exposed for this branch.
That remains true of C3. Both round-2 findings were nevertheless static source-level counterexamples
that a green suite could not have discharged, which is precisely why they survived a passing run — I
have no basis to argue the reported numbers should carry more weight than the reviewer gave them.

**Fixture prepared / gate executed / external decision**, kept separate: a fixture was **prepared**;
**no gate was executed**; **no external decision exists**.

**Checks not run, and the resulting claim limits:** no process-death, persistence, isolation,
performance, cost or model-quality check; none claimed. No E0/E1 evidence produced. No candidate
implements the protocol, so nothing here is evidence about a Kernel.

**Third-party review under AGENTS.md: none.** No dependency added; nothing copied, adapted or vendored.
`package.json` and `package-lock.json` unchanged.

**Strongest remaining risk.** Two rounds have now found defects in *my derivation from the worksheet*
rather than in the code that implements it — round 1 under-covered it, round 2 over-constrained it.
`coverage.ts`, `protocol-vocabulary.ts` and the scenario expectations are all one author's reading of
one document, and the citation requirement added this round makes that reading auditable without
making it correct. A reviewer who re-derives the §11 obligations independently, and who checks each
`forbiddenBy` claim against the cited decision rather than accepting it, is the control this packet
cannot supply for itself. Both rounds of review found exactly this class of defect, and the second
found it in material added to fix the first.

## 6. Handoff

**Not review-ready as a whole**, per 006's rule on unavailable required evidence.

- **C1–C7 and C9 are corrected and independently reviewable now.** A review of them cannot accept the
  packet while C8 is unmet, and its record should say so.
- **C8 requires the benchmark owner**, not more work here.
- **Remaining work in this repository for C1–C7/C9: none.**

```text
Correct the same released packet K0.2 on codex/k0.2-public-controls-e0-gate.
Base c079237ee7aff428481426f93e87a68b79f170d4; previously reviewed H2
60a05f822b9415382653e286be1189ec0a01e472 (review-02.md); corrected payload C3
acb5e01c80f015ebf715f4de3e7fdb10f05f1a33; candidate H3 in the handoff.
Round-2 findings K02-R2-01 and K02-R2-02: both CLOSED, dispositioned in
implementation-03.md §1. Round-1 findings remain closed. Self-found K0.2-SELF-07
and -08 closed in C3; K0.2-SELF-01 remains open for a separate packet.
Highest-value review target: re-derive the §11 obligations independently and
check each violation's `forbiddenBy` citation against the decision it names.
C8 remains BLOCKED_EXTERNAL on benchmark E0 at 98756f8c; responsible actor is
the benchmark repository owner. No successor release.
```

No self-acceptance is claimed or implied. K0 is not closed, nothing is merged, and K1.0 is not
released.
