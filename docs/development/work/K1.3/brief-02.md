# Brief 02 — K1.3 correction

```text
Correct the same released packet K1.3 on claude/k1.3, subject to the owner's handoff.
Base 22c8c1db9958049eb8693dd5aa4d7005f2d565db;
reviewed H d05af3476b1523dadee0858373c0713610103419.
Review record: docs/development/work/K1.3/review-01.md, in the review commit carrying this brief
on codex/k1.3-review-01. Open findings: K13-R01-S2-01, K13-R01-S4-02, K13-R01-CLOCK-03.
Owner decisions still in force: brief-01 answers, release-01, owner-choice-01 and owner-choice-02.
Unresolved architectural authority: none for the required corrections; weakening the approved
structural guarantees or changing an accepted policy needs an explicit owner disposition.
Read this brief first. Answer its questions in design-02.md and obtain the design check required by
006 before changing Kernel semantics. Apply 006 and 012: fix the mechanism, preserve the corpus,
then re-audit the cumulative packet. Use 008 for a new C/H and evidence/push handoff.
No successor release is authorized.
```

## Goal

Make the state owner's advertised terminal-completeness and generation-uniqueness guarantees true for every relevant plan, and make the deadline descriptions accurately distinguish registration from host firing. Preserve the passing public behavior and the owner's Execution-scoped Driver cancellation and fire-only Execution-deadline decisions.

## Criteria (finishable)

The original K13-1..9 criteria, design-check obligations and attack corpus remain in force. These correction criteria identify the new required outcomes, not a substitute for cumulative review.

| ID | Required outcome | Closes by | Evidence expected |
|---|---|---|---|
| K13-C2-1 | The owner guarantee for terminal completeness matches [B-5](../../../../mental-model/concepts/core.md#batch-reservation-and-acknowledgment), cancellation and design §12 S2. A terminal plan cannot leave a previously queued Event undisposed through duplicate or overlapping position lists. | Structural argument over every disposition writer, plus direct owner-plan controls. | Both S2 counterexamples in review 01 reject before mutation; valid disjoint partitions still work. Cover complete, fail and shared explicit/deadline cancellation. Explain why equal length alone is insufficient. |
| K13-C2-2 | The owner guarantee for one registration/retirement/timeout per generation matches [waits](../../../../mental-model/mechanisms/waits.md#ending-a-wait) and design §12 S4. Mutually consistent plan fields cannot reuse an old generation. | Structural argument over registration/retirement/timeout writers, plus direct controls. | The S4 counterexample rejects before mutation; successive valid generations and duplicate host fires preserve their existing behavior. Cover both a live new registration and one immediately retired by Event/deadline. |
| K13-C2-3 | BASELINE, 017, the operations binding note and dependent current descriptions distinguish registration-time due waits from host-fired live waits and Execution deadlines. | Bounded source search plus a three-path behavior comparison. | Retain the review's zero-fire immediate-expiry case, live-wait fire case, and owner-approved Execution fire-only tests. Preserve operations' OPEN marker. |
| K13-C2-4 | K13-1..9, D01-CHK-01..07, all A01..A24 destinations and the two owner choices remain satisfied; all claims accurately describe the corrected candidate. | Original deterministic checks, declared search, registry and packet verification under 006. | Full correction report with new C/H, fresh required verification evidence, targeted registry/attack reruns and disposition of each review finding. Do not treat this review's passing evidence as verification of changed code. |

## Known counterexamples

[Review 01](review-01.md) owns findings and provenance. [guard-probe.test.mjs](review-01/guard-probe.test.mjs) and its raw output reproduce:

- Two queued positions, cancellation `endAt: [0, 0]`: H accepts and leaves one queued.
- Two queued positions, complete Outcome `acknowledgeAt: [0]`, `endAt: [0]`: H accepts, overwrites the first disposition and leaves the other queued.
- Second immediate-expiry Outcome reusing g1 consistently across registration count, retirement, readiness and timeout: H accepts duplicate g1/T1 records.
- A due wait expires at registration with zero host fires: correct existing behavior that disproves the all-deadlines-fire-only prose.

The first three are internal-plan negative controls of an explicitly claimed structural boundary, not hostile-runtime ingress cases. Keep their positive controls. Add them to maintained tests with the stable review IDs. Preserve the original attack probes and maintained corpus; the review's additional bounded-search assertions are also available for adoption or an explicitly justified equivalent check.

## Suspect design

The new guards confuse count equality with set coverage and field agreement with freshness. The older sole-writer plan/apply architecture constrains where changes happen, but does not automatically validate the coupled facts a new plan carries. The next design must identify all writers capable of violating S1–S5 and give the precise invariant each guard proves. Audit analogous omissions allowed by the same mechanism before choosing a correction.

The deadline documentation combined three distinct entry paths under one sentence. The owner chose fire-only admission for Execution deadlines; W-2 independently requires a due wait to expire during registration. This is a description error, not permission to change either rule.

## Questions before code

1. What relation proves the disposition lists cover each queued position exactly once, and how is that relation enforced before any mutation in every terminal arm? Which malformed-plan cases are structurally rejected versus left to planner semantics?
2. What identifies a newly created registration at the owner boundary? How do live, immediately woken and immediately expired registrations prove fresh generation identity and exactly one retirement/timeout without assuming the planner already got the increment right?
3. Which S1–S5 statements can the corrected owner establish, and which remain semantic tests under L-15? Trace every writer and preserve a precise distinction; do not silently narrow an approved guarantee to match a weaker check.
4. How will all current clock descriptions state the three paths consistently, while retaining the optional clock, host pumping duty, no instant Execution-deadline enforcement and OPEN marker?

## Bounds

No persistence, scheduler leases, K2 result ingress, native-stop proof, isolation mechanism or successor packet is added. Keep owner choice 02's exact exclusion and explicit code-versus-data coverage limit; its narrative count of other scenario files is 59 but the verified scope is 60. Use the verified count in the next report; preserve the historical decision record and its owner quotation.

Preserve the accepted public behavior: OA-2 replay before cancellation fence, full-content losing retries, separate cancel authority, one Driver request after commit, terminal redelivery tokens, mandatory timeout membership and sort-union equivalence on reachable states. Fix the cause through an independently reviewed design; this brief does not prescribe a particular data structure or the only allowed patch.

## Stop conditions

Use 006 if the correction requires changing accepted behavior, weakening the required structural guarantees, altering the declared K13-9 alphabet/depth to avoid evidence, or contradicting an owner choice. This first implementation review does not itself trigger the repeated-failure stop-and-redesign threshold. If new evidence shows a defect in an accepted earlier design, identify it and obtain the owner decision rather than layering a workaround on it.
