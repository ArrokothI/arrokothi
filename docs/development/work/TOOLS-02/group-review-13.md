# Group review 13 — round-7 family, early projection stop

2026-10-29, implementing Codex GPT-6 session under owner choice 09. Current reading
revision `b804e986` (full identity in adoption-controls-10.json). Source pin
`66bc041175e6fc191c2e7cf88de198111e7d97c9`: read the whole ablations-07.mjs runner
and validation-09/47-round7-ablations.txt, including its clean control, all 28 member
results and summary. Historical results are not current kills. No sealed source changes.

At origin **697**, under reconciliation: **five new-test groups and at least 70
mutation-adoption cases**. The same recent-rate projection used in projection 07
is now **253**, exceeding 250. Stop before building these additions or reconciling
R11–R12/C1–C16. The whole file was read; these remaining routes are not disposed.

## Member readings through R10

| Members | Reading and route |
|---|---|
| R1–R5 | The original controlScopes anchor remains unique. Quoted/computed/bare/assignment destructuring and the required-type cast all restore the same ambient Object.prototype controlScopes input and unauthorized-control result as H15. Preserve each production edit as a separate variant in the H15 adoption; no additional case count. These variants are planned, not yet built or killed. |
| R6 | The rest-copy variant likewise joins H15 for ambient controlScopes. It additionally loses a host-owned prototype's controlScopes declaration, so retain its positive-host-inheritance attribution to H21; do not discard that variant of the required result. No additional adoption case is needed. |
| R7 | **New adoption.** The current source-guard claim rejects `in` syntax. This edit keeps hostMember, so it need not grant ambient authority or run a getter; H15's behavioral kill cannot substitute for the structural obligation. Current ambient-reads leaf: `the zone uses only permitted syntax`. The poison sweep explicitly cannot observe HasProperty. No current registry or complete-decision control mutates this source decision. |
| R8 | **New adoption.** The diagnostic renderer still uses the bracket index read. Replacing it with `.startsWith` introduces a post-load built-in member access. Current ambient-reads leaf: `every reported site is inventoried, at its exact count, with a reason`. The current registries do not mutate this renderer's access decision. The required inventory report is structural, distinct from R7's forbidden syntax; do not merge merely because the target file is shared. |
| R9 | **Individual absent-anchor reading.** Kernel values.ts no longer contains the diagnostic collector; BINDING-01 design 01 §3/its migration inventory moved it to SDK internal/value-capture.ts and explicitly split the core analysis zone from wrapper capture. The exact collector span remains unique there. Its suffix entries are fresh own data with numeric occurrences initialized at 1; both spellings read that own number once, add 1 and write it once. The historical run failed only the core access-inventory guard, whose subject no longer includes this wrapper source. Thus the removed core inventory obligation is superseded by BINDING-01; the moved runtime counting obligation is not declared retired on anchor absence. Existing diagnostic count behavior/RC-OWN-EXPLAIN and the own-data reading remain its route to reconcile at final P1-M binding. No new adoption counted for a runtime-equivalent respelling. |
| R10 | **New adoption.** UnsupportedKernelSurfaceError still defines its own name. The maintained runtime leaf directly calls refuseUnsupportedSurface under an Error.prototype.name accessor, then restores the descriptor and asserts zero calls and an owned name. Restoring `this.name = ...` violates that result. No coordinator currently invoking this helper is not supersession of the retained helper's testable contract. Error.prototype is outside the poison sweep, and neither registry carries the class-field-to-Set edit. |

All R1–R8 anchors and both R10 edits remain unique at the current revision.
[Anchor observations](family-applicability-13.json) retain exact counts and R9's
relocation. These are source readings, not execution or kill evidence. R7/R8 will
need the existing source-read probe path; R10 can target its existing runtime leaf.
The ambient-reads file's 47-leaf control passed during the H22 adoption run at
`f9e9c540`, and the file/product bytes are unchanged at this reading. P1 credit and
hold-register readings remain separate requirements.

The search covered both maintained mutation registries, current ambient-read and
control-commit rules, the poison/fault oracle limitations in correction-01's contract,
current source anchors and the prior passing repository catalog. No new behavior
leaf is needed for these three groups. No new product defect was exposed.

## Validation completed before this reading

At `f9e9c540`, all 49 new controls passed. Of 51 mutants, 42 qualified, eight were
observed without a qualifying assertion witness, and H7's probe rejected its wrongly
named killer. [Results 09](adoption-controls-09.json) preserves those outcomes.

The four coordinate failures were internal state-owner precondition errors occurring
before the existing leaf's value assertions. The leaf now also asserts a boolean
normal-completion result at the same three operations. H15/H16/H19/H20 failed in
refused() before the test restored its prototype; those existing leaves now restore
first and assert afterward. The test-side witness policy is unchanged. H7's specified
killer was accidentally createExecution and is corrected to recoverExecution in the
fixture and triage pointer. No new input class, behavior leaf or test group was added.

At `b804e986`, the eight affected controls pass and all nine remaining mutants earn
qualified kills; `npm run typecheck` exits 0. [Results 10](adoption-controls-10.json).
Together with the eighteen earlier adoptions, the 67 built cases have 69 validated
mutants across the recorded revisions. This is not a final-C rerun or family closure;
R1–R6's additional variants above and the three new cases remain unbuilt.

All four measured adoption runs, failures and retries included, total **250.717
seconds** in the [runtime ledger](adoption-runtime-09.json). The output-cap launcher
refusal at `11887628` started no child and persisted no elapsed timer; it is disclosed
separately and is not a test run. No elapsed duration is invented for it.

Resume after owner disposition within this same origin at R11, then R12/C1–C16 and
source order. No P3 completion, self-audit, mappings_complete, final C/H or CI dispatch.
