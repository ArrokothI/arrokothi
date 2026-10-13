Correct the same released packet K1.1-correction-03 on claude/k1.1-correction-03.
Base b9c1e549c81fa4fe4f18fa1a36986f1a5581fc9b; reviewed H 5f586b176089987fa3667e4c03f26b3dac0a5bfb; review record docs/development/work/K1.1-correction-03/review-01.md in this delivered review bundle (recording commit not created).
Open findings KC3-R1-STOP-01, KC3-R1-EVID-02 and KC3-R1-DOC-03; required outcomes and counterexamples are in that record.
Owner supplemental decisions: owner-choice-01 and the verbatim 2026-10-12 supplement in review-01.md; unresolved authority: none identified for correcting these violations.
Read the brief below first. Answer its design questions in design-02.md; get the design check when 006 requires it. Apply 006 and 012: fix the mechanism, not only the listed counterexamples; add every counterexample to the corpus; then re-audit the whole cumulative packet. Fix additional in-scope defects with separate provenance. If the fix belongs in accepted earlier design, say so and ask.
Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.

# Brief 02 — K1.1-correction-03

## Goal

Make the per-root work stop govern every subsequent caller observation and value-dependent operation, including the paths after a diagnostic stops capture. Make mutation evidence distinguish a reached qualifying assertion from a failed test process or test setup, so the review can rely on its credit. Keep dependent descriptions within the owner-approved Q6 scope.

## Criteria

All [brief-01](../brief-01.md) criteria remain in force. The following finishable outcomes target the open findings without replacing the cumulative review:

| Finding / obligation | Required outcome | Closes by | Evidence |
|---|---|---|---|
| KC3-R1-STOP-01; KC3-1/2/6 | No new caller listing or other uncharged value-dependent work starts after a root has stopped. A length-discovered operation that itself crosses B remains charged immediately on return. | Structural argument over every stop-producing operation and continuation; deterministic native-operation/meter comparison at those transitions; declared search across alignments and consumers | Maintained versions of the attached stop fixtures and neighboring controls, plus mutants that would admit an additional post-stop observation |
| KC3-R1-EVID-02; KC3-5, TOOLS-01 F3, 012 | A setup, parse, module-load, timeout, output-limit, no-selection or unrelated failure cannot earn a qualifying kill. Credited failures establish the intended selected witness and assertion. | Explicit evidence-state contract; negative controls and a genuine assertion-failure positive control; fresh applicable-mutant runs | Both attached negative controls, leaf/assertion attribution or another justified mechanism, requalified value-cost and C1 results |
| KC3-R1-DOC-03; KC3-10 | Dependent current descriptions preserve Q6's detectable-kind scope and declared limits. | Review every current internal-slot refusal claim against its canonical owner and owner amendment | Roadmap correction and the attached permitted WeakRef/FinalizationRegistry outcomes; no expansion of the refusal contract |
| KC3-9/10/11 and C1 | Preserve accepted values/bytes, observation and diagnostic rules under existing owner amendments; preserve meaningful converted-test coverage; complete the clean-C gate and normative maintenance | Existing checks, cumulative source/test/prose review, ablation reconciliation and declared search | New exact C/H, complete raw evidence, dispositions for these findings and any separately discovered defects |

## Known counterexamples to add

1. [probe-stop-boundary.mjs](probe-stop-boundary.mjs): a symbol diagnostic at B+1 followed by an uncharged own-name listing. Keep ordinary and null prototypes, names 0/1/257/4,096/65,536, shared/distinct rows, nesting variants, and offsets −2/−1/0/+1/+2. The neighboring offsets distinguish a legitimate crossing listing from a listing that began after the stop. Add actual operation counts, not just a reported total of B+1.
2. The same file's consumers: direct capture helpers, both creation roots, ingress, each of three recovery lists, progress/emission/result/error, and the eight eager roots of a visible caller's unauthorized Outcome. Preserve whole-state/refusal assertions. Each root must retain its own budget.
3. [probe-evidence-attribution.py](probe-evidence-attribution.py): selected test module cannot parse; selected test module throws while loading. Both currently report `reached: true` and `killed` with zero selected bodies run. Keep the passing control and add a selected assertion failure that legitimately qualifies.
4. [Direct leaf audit](value-cost-leaf-audit.json): the submitted ingress `O-DEFINEDATA-LITERAL` mutant throws a Kernel `TypeError` before the subsequent result assertions. Decide and demonstrate the evidence needed for credit; do not silently convert any failed leaf into the named assertion. Retain meaningful custom harness assertions without relying solely on an error-class name.
5. [probe-declared-limit.mjs](probe-declared-limit.mjs): re-prototyped WeakRef and FinalizationRegistry accept as `{}`. Preserve these as Q6 scope witnesses and use them to check current descriptions; their acceptance is permitted, not a defect to patch.

Use [review-01.md](../review-01.md) for full construction, counts and source locations. The [broader search](search-dimensions.mjs) supplies additional deterministic dimensions and the seed; it is evidence, not an exhaustive claim.

## Suspect design

Two local observations were promoted to stronger global guarantees. A helper containing a charge was treated as proof that all reachable work is authorized and charged, although a preceding diagnostic can stop the root. A failed TAP total was treated as proof that the intended assertion executed, although Node's file-level failure uses the same total.

The accepted design's helper/static/runtime decomposition needs an explicit stop-propagation argument. The new registry adapter needs an explicit reach/failure-attribution argument. The roadmap separately carries a stronger summary than the accepted Q6 amendment permits: trace the scope through dependent descriptions as well as the canonical owner. Earlier byte-budget and diagnostic-collector code, and the accepted TOOLS-01 outer observation parser, are part of the causal context; acceptance does not exempt their interaction. The review does not establish that B's unrelated semantics require amendment.

## Questions before code

1. What invariant prevents every observation/allocation after each kind of stop, and where is that invariant enforced? Which operations legitimately finish or unwind after a crossing charge? Account for diagnostic calls that return no stop result and helpers charged after a native operation.
2. Does the mechanism cover both byte and work stops, all helper classes, nested returns, mixed accepted/refused siblings and eager roots? How will static and runtime checks divide this obligation without an uncovered transition?
3. Which wrong implementations will the new checks distinguish: extra listing after a diagnostic, missing/late charge, stale stop state, and duplicated own-data reads? Include near-budget shapes that the old nine-shape oracle excluded.
4. What exactly is a reached qualifying assertion for a probe that invokes selected maintained tests? How are file-load failures, hooks, test exceptions, cancellations, no matches and genuine failed assertions distinguished? How will custom harness assertions and errors during argument evaluation be attributed?
5. Which of the 227 reported value-cost kills and 162 C1 registrations can be credited under that contract? Reconcile any downgraded results without silently weakening C1 or moving unfinished evidence into an accepted count.
6. Where do current summaries restate the internal-slot refusal claim, and how will each preserve the governing Q6 limitation without becoming another rule owner?

## Bounds and stop conditions

Stay in this released packet and keep B as the cumulative review base. This is not permission to raise B, broaden residuals, alter accepted bytes/diagnostic meaning, replace the prescribed gate, or declare setup failures acceptable evidence. The supplemental owner decision preserves the two helper-only origin closures and accepts the TOOLS-02 scope edit and 2,400-second sweep timeout. Reopen other changed witnessed tests mechanically under the standing rule where it applies.

No implementation is provided by the reviewer, and no single patch is prescribed. Propose the mechanism before building it. If correction needs a semantic change or a new accepted limit, obtain the smallest owner decision and the required design check. If the next independent review produces a second changes-required finding in a subsystem corrected here, apply 006's stop-and-redesign rule. Preserve this review and its evidence; issue the next implementation report and a fresh exact candidate. Do not merge, lift holds or release a successor.
