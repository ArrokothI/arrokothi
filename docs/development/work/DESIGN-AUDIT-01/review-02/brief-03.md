```text
Correct the same released packet DESIGN-AUDIT-01 on codex/design-audit-01.
Base 66bc041175e6fc191c2e7cf88de198111e7d97c9; reviewed H 4c1b11e115ad61fbcfeebf83f50bb6a35478ea8e; review record docs/development/work/DESIGN-AUDIT-01/review-02.md (Claude Code, claude-opus-5-5, 2026-10-01) with evidence in docs/development/work/DESIGN-AUDIT-01/review-02/, recorded on this branch after H.
Open findings DA01-R2-REALM-01 (P2); P3 DA01-R2-DEP-01, -CONSIST-01, -GUARD-01, -PROXY-01, -DEPENDENTS-01. Required outcomes and counterexamples are in that record.
Owner supplemental decisions: review-02/owner-choice.md (stop-and-redesign option (a), refined finishable claim); owner-decisions-02.md still in force. Unresolved authority: the PROXY-01 expected result (draft both, do not choose).
Read the brief below first. Answer its design questions in design-03.md; get the design check when 006 requires it. Apply 006 and 012: fix the mechanism, not only the listed counterexamples; add every counterexample to the corpus; then re-audit the whole cumulative packet. Fix additional in-scope defects with separate provenance. If the fix belongs in accepted earlier design, say so and ask.
Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.
```

# Brief 03 — DESIGN-AUDIT-01, refined hardening claim

Prepared 2026-10-01 by the independent reviewer of round 2 (Claude Code, `claude-opus-5-5`) after the owner chose
option (a) in [owner-choice](owner-choice.md). Brief-01's goal, bounds and stop conditions stay in force, and so do
brief-02's criteria.

## Goal

Round 2 closed four of review-01's five P2s. The realm-hardening alternative it added was evaluated only against
five first-hop intrinsic mutations, so its closure would accept a hardening that leaves canonical bytes
steerable. Make every threat-model option's closure answer to the counterexamples already on record for its
family, starting with hardening, so the owner compares options that are stated truthfully.

## Criteria (finishable)

| ID | Criterion | Closes by | Evidence expected |
|---|---|---|---|
| R3-CORPUS | A hardening corpus manifest maps every label that `classifications.json` marks `hostile_only` (16 at H: nine from K1.1 and seven from K1.2-correction-01, including K11-R5-VAL-03's binding replacement and K12C1-R9-HISTORY-01's polluted `Object.prototype` getter) to either a maintained probe, with its expected result under `--frozen-intrinsics`, or a stated reason that hardening does not address it (for example Proxy incoherence or a getter running caller code). It includes replacement of each of the eight bindings in `values.ts:1130–1137`, tried mid-capture from a coherent Proxy trap where the probe allows | Deterministic check: the verifier fails when a `hostile_only` label is unmapped or a probe's observed outcome differs from its recorded expectation | Manifest file, probes under `probes/`, verifier output |
| R3-REALM | `realm-hardening.md` states what the flag does not freeze, citing the Node page it already links, and the "passes the first" sentence (`:15`) matches the R3-CORPUS outcomes. The A-hard and B-hard options either (i) require the call-time bindings to be pinned or captured at load and test binding replacement mid-capture, or (ii) narrow V-ENV integrity, not only availability, in their claims and inventory cells. Whichever is drawn, the closure rejects a flag-only implementation | Structural: the reviewer's reading, plus R3-CORPUS's deterministic outcomes | Updated `family-notes.json`, re-rendered register, drafts and option claims |
| R3-PROXY | The C-brand and F02K closures name the Proxy-forwarded re-prototyped built-in witness (`review-02/brand/proxy-exotic-probe.mts`). Register C and CORE state the owner question with both outcomes and their affected claims: (1) accepted as presented under coherent-Proxy acceptance, with the restored O-R8-4 claim and the invalidation-01 release condition narrowed to non-Proxy values; or (2) refused, which needs a decision-04 item 5 amendment for the interim step. Neither is chosen | Structural: reading; deterministic: the probe's current outcome is asserted | Register C, CORE C row, drafts C/F02, probe in the regression run |
| R3-KEEP | DA-1, DA-3a, DA-ARCH, DA-3 owner extras, DA-5, DA-6 and DA-7 still pass, and review-01's and review-02's scripts still run in the verifier with their expected results | Deterministic: the packet verifier on clean C and at H | Verifier output |

P3s (separate provenance; they do not block):
- **DEP-01 and CONSIST-01 are recommended**, because their causes sit in the same records. Tag core-independent
  recommendations as independent, and state sequencing separately from core dependency; mutant M7 must then
  be accepted by `validate()`. Align K11C03 and K14 under the hardened profile with CORE. Align the method
  labels of identical closure text. Fix the ISOLATION paraphrase.
- **GUARD-01 and DEPENDENTS-01 are optional.**

## Known counterexamples (add to the packet corpus)

From `review-02/` (provenance: independent review 02):
- `realm/global-binding-probe.mjs` and `realm/global-bindings-all.mjs`: under the flag all eight bindings are
  replaceable and the output is steered. The expected result stays "replacement succeeds" for the flag alone.
- K11-R5-VAL-03's `getPrototypeOf`-trap witness (K1.1 `review-05.md` at `9fd2faa`), as a hardening case.
- `brand/proxy-exotic-probe.mts` and `brand/structured-clone-control.mjs`: assert the current outcomes; the
  expected result after correction is an owner question.
- `guards/validator_mutants.py`: M2, M3, M5 and M6 recorded as declared survivors closed by reading; M7 as a
  regression if DEP-01 is fixed.

Review-01's scripts stay in the run.

## Suspect design

- **Closures written against the corpus at hand.** This is the root-cause note's mechanism. Question: for each
  option of A, B, C, F02, F09 and F10 whose closure relies on a finite corpus, does that corpus contain every
  recorded counterexample of its family? List any that do not.
- **Hardening and the adversarial binding.** Under coherent-Proxy acceptance, caller code runs inside capture.
  Any replacement for the serializer window must cover every ambient read the dependency makes. Question:
  what exactly would a hardened configuration need to pin, and can a startup check alone establish it?

## Questions before writing (design-03)

1. Which of the 16 `hostile_only` findings could hardening stop, and which are out of its reach? Give one line of
   reasoning each.
2. For A-hard and B-hard, which form is truthful: pinning or capture-at-load, or a narrowed V-ENV? Draft the
   one whose closure rejects a flag-only implementation, and state the other's cost.
3. How do the C-brand and F02K closures, the restored O-R8-4 claim and the invalidation-01 release condition
   read under each PROXY-01 answer?
4. Does the R3-CORPUS reconciliation change any other option's claims, or the CORE matrix's hardened column?

## Bounds

- Read-only on product code, tests, Layer 3, BASELINE, AGENTS.md and process documents. Probes stay under
  `probes/`.
- Do not choose an option or the PROXY-01 answer. The audit drafts; the owner decides.
- Add no dependency and install no SES.
- Do not rerun the R8 timing corpus.
- Do not edit `review-01/`, `review-02/`, `review-02.md`, `owner-decisions-02.md` or other historical records.
  Extend the verifier's protected list to include `review-02` and `review-02.md`.
- Both holds remain. No successor is released.

## Stop conditions

As brief-01 and brief-02. Also stop and ask if:
- a recorded hostile counterexample cannot be classified as stoppable or not stoppable by hardening without a
  semantic decision;
- drawing A-hard or B-hard truthfully would contradict an accepted claim not already named in
  owner-decisions-02.
