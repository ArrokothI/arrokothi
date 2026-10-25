# Correction brief 03 — TOOLS-02 range 1

Correct the same released packet TOOLS-02 on `claude/tools-02`, **after the owner's required
stop-and-redesign choice**.
Base `b5daf35aeee37305c1ee41bb626c97d26db94ab2`; reviewed H
`7791cda6b0b28324e608ca5483e97059b7398b55`; review record
`docs/development/work/TOOLS-02/review-02.md` (this review delivery; recording commit not yet assigned).
Open findings: T2-R2-READ-01 and T2-R2-PATTERN-01; the broader closure of T2-R1-READ-01 remains incomplete.
Owner decisions in force: owner-choice-01 and owner-choice-03 at H. Unresolved authority: the next
choice required by 006's second failure in a corrected subsystem. No successor release.
Read this brief first. After that choice, answer its questions in a new design note and obtain the
applicable design check before building. Apply 006/012 and use 008 for the next C/H report and handoff.

## Goal

Make the declared filesystem evidence boundary preserve the observations it claims to represent, or
refuse preservation explicitly. Prevent lost call information from silently producing stale credit.

## Criteria

| ID | Required result | Closing evidence |
|---|---|---|
| T2-R2-READ-01 | Fixture entries reached through supported recursive directory symlinks affect identity and pin comparison, or the mode refuses preservation | Port the retained sync/promise typed reproducer, its two successive descendant changes and immediate-child positive control; distinguish the chosen mechanism with a mutant |
| T2-R2-PATTERN-01 | Supported array glob arguments cannot disappear before the unrepresented-dependency refusal | Real capture-to-census controls for string/array patterns and file→directory→file, plus a mutation before the refusal predicate; account for callback/promise forms |
| T2-1 cumulative | Retain amended read classes, unrelated-addition stability, repeated named/fixture edits, directory-existence correction and ordinary recursive-listing closure | Existing corpus, eleven read-form/directory mutants, new counterexamples and cumulative manifest-delta audit |
| T2-2 cumulative | All declared fixture-producing routes remain guarded and regeneration retains its write scope | Direct route tests, refusal census/ablations, writer census and clean-C Packet verify |

## Suspect design and questions before code

The inherited observer reduces calls to a path/kind before it has established a complete dependency
representation. Design 04 adds reconstruction but assumes recursive readdir does not descend symlinks;
its refusal sees only path-shaped arguments that survive filtering. Both assumptions fail at H.

1. What finite operation × argument × traversal matrix is supported? How is every encountered
   unrepresentable form routed to refusal rather than dropped? Keep this a bounded evidence tool.
2. How does the chosen mechanism cover actual listing entries at both C and the pin, including alias
   targets, target changes, deletion and repeated edits? How are cycles and external targets bounded or
   refused? Do not infer all listing APIs' behavior from one operation.
3. Which facts must survive capture to enforce pattern refusal, including arrays and operation-specific
   roots/options? How will end-to-end tests detect a loss before `pattern_refusal`, rather than starting
   from a fabricated already-classified row?
4. Which producer, consumer, refusal, documentation and manifest-credit changes follow from the owner
   choice? Does any additional real origin lose credit, and who authorizes its disposition?

## Known counterexamples

- [Probe](probe-range1.py), [output](probe-range1.json): committed
  `tests/fixtures/link -> ../../data/target`; sync names and promise typed recursive readers start
  preserved. Two additions under the target change returned entries but leave `table_current` and
  `revalidation_complete`; an immediate fixture child correctly invalidates.
- The same probe: string glob is refused, array glob is preserved. Same-name fixture
  file→directory→file changes its typed result twice while leaving the preserved table valid.
- Keep review 01's ordinary recursive-listing reproducer, all D02-CHK-01/02 controls and D02-CHK-03
  guard ablations. Preserve earlier reports and raw CI evidence.

## Bounds and stop conditions

Only T2-1/T2-2. T2-3, T2-4/design 03 and T2-5 remain outside this correction. Owner choice 01's
enumerated non-fixture rule and owner choice 03's two transfers remain in force unless the owner
explicitly changes them. No product changes, new hold release, origin triage, historical deletion or
self-acceptance. Do not start another patch round before the owner chooses the 006 route. A narrowed
claim needs the corresponding owner amendment and truthful credit/disclosure, not only a README edit.
