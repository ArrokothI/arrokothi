# Brief 03 — K1.4 correction after review 02

Correct the same released packet K1.4 on `claude/k1.4`, after the owner decides the stop-and-redesign
question below. Base `608f9ece44dbe42b78974bdac9e7ddcd33697705`; reviewed H
`96214874577f2108a7578d1d6fcebc4af0f7173c`; payload C
`3e4c59faa7b6138693bb9094144cafff7a33158e`.
Review record: `docs/development/work/K1.4/review-02.md` on `codex/k1.4-review-02`
(use the immutable recording SHA supplied in the reviewer handoff).
Open findings: **K14-R2-01, K14-R2-02**; required outcomes and counterexamples are in that record.
Owner supplemental decisions: none supplied to this review. Owner choice 04 remains in force.
Unresolved authority: the next build needs the owner's choice under 006's stop-and-redesign rule.

Read this brief first. Answer its design questions in `design-04.md`; get the new design check if the
owner selects redesign. Apply 006 and 012: fix the mechanism, add every counterexample to the maintained
corpus, and re-audit the whole cumulative packet. Record additional self-found defects separately.
If the cause belongs in accepted earlier design, identify that cause and take the decision to the owner.
Use 008 for the next report and 006 for fresh C/H, evidence and verified push handoff. No successor release.

## Goal

Give every committed native state that needs another step either a reliable route to that step or an
explicit inspectable failure/hold, while preserving transaction results and avoiding duplicate work.
Make termination evidence distinguish every actual cleanup route, including accounting failure before
a nonterminal Outcome can be submitted.

## Finishable criteria

| ID | Required outcome and owner | Closes by | Evidence expected |
|---|---|---|---|
| R2-PROGRESS | K14-R2-01; K14-1/K14-4; design 03 §8 D03-CHK-01: one failed postcommit scheduler lookup cannot leave settled READY work silently parked | Structural scheduling/error ownership plus deterministic fault schedules | Both capability and model-resumption reproducers progress or expose an explicit failure/hold; no duplicate native invocation; original transaction promise/result/error preserved; lineage routing and one-active-step preserved |
| R2-CLEANUP | K14-R2-02; K14-R1-05; design 03 §8 D03-CHK-02: accounting-encoding failure ends a live lineage before holding the exchange | Maintained live-lineage test and site-complete mutation mapping | Parent and child terminal, no later native steps, held Kernel exchange with no acknowledgment/accounting Emission; removing only the hold cascade fails; every real cleanup site mapped to a test or an explicit equivalence |
| R2-CUMULATIVE | Original K14-1..K14-6, prior review findings and D03-CHK-01..03 | Existing mechanisms, corpus and declared searches, checked cumulatively | Old four probes, retries/conflicts, ledger unknown/no-second-forward, coherent await through submission, initialized hook, named reached/unreachable schedules, cascade triggers, wrapper/boundary/mapping and unweakened registries |

## Known counterexamples

Maintain the complete earlier corpus, including review 01 at
`0f415d6e016824ea9bddac0ca7aca3fd2d3accb5` and design check 03 at
`3e55960e0493854490ac83a420ee12295c003e82`. Preserve owner choice 04's per-Event accounting semantics.

New evidence in this directory:

- `probes.mjs`: one-shot enqueue lookup failure after capability settlement; the same after model
  resumption settlement. Both fail at C with settled native work, READY, queue empty and no hold.
- The same file: real commit/rollback state and error identity; delayed signal after a no-wake lineage
  parks. These controls pass and must remain valid.
- The same file: accounting-encoding failure with a live Workflow parent and called chat child. The
  implementation cancels both; deleting only the `hold` cascade leaves both WAITING.
- `hold-mutant.py`: the removed-hold-cascade mutant survives the 412-test maintained focused corpus.
  `hold-mutant.log` records that survival; it is not acceptance evidence.
- `review01-probes.mjs` retains the four old counterexamples with only the renamed collector stack
  selector rebound, plus the original control. No assertion has been relaxed.

Reproduction commands and subject/environment identity are in [README](README.md). Review probes are
evidence to promote into the maintained suite, not a parallel permanent runner that may be forgotten.

## Suspect design

The native Runtime commits READY before calling a fallible scheduler enqueue; asynchronous effect and
resumption trackers swallow the rejection. The Driver's commit signal wakes its observer, but does not
restore runnable work. Its step loop assumes an unqueued READY member still has an enqueue in flight.
Accepted native comments describe pending work left after an unwritable settlement; the observed error
can instead occur after a successful settlement. Establish ownership for that whole sequence.

The cleanup table is hand-enumerated separately from the actual `TerminateSite` paths. Its existing
accounting test starts with a completed root, so neither the assertion nor the table distinguishes
removal of the newly added hold cascade. Preserve the production behavior while fixing the evidence
mechanism and correcting the twelve-versus-eleven removal count.

## Questions before code

1. Which owner guarantees runnable work after native commit, and how is a failed scheduling operation
   distinguished from an operation that is still in flight? Explain both capability and resumption
   producers, registration before/after commit, known/unknown lineage assignment, and cleanup/cancellation.
2. Can scheduling use authoritative learned identity without another fallible lookup, reconcile from
   committed state, or expose an explicit Driver failure? Show how the selected design avoids a second
   native step/model/capability call and preserves the transaction port unchanged.
3. How will the maintained oracle enumerate all real cleanup sites and prove every non-equivalent
   removed cascade is caught? Separate the terminal-Outcome-refusal hold from the nonterminal
   accounting-encoding hold; retain T6's legitimate no-descendant equivalence.
4. Which current claims need correction? L-31 covers still-in-flight/never-settled work, not already
   settled READY work or a model-only execution. Do not extend it without an explicit owner decision.

## Bounds and stop conditions

Ownership is SDK Execution Driver/native scheduling and its evidence. No Kernel semantic or source
change is justified by these findings. Keep the in-memory/private/trusted scope, no native takeover,
unmediated tools/memory/children, and owner choice 04. Do not introduce provider special cases, relax
the quiescence predicate, forward an unknown Event twice, count fallback schedules as coverage, or
change expected results merely to fit the defect.

**Stop before another patch round.** This is a second CHANGES REQUIRED in the corrected subsystem.
006 requires the owner to choose redesign with a fresh design check, a refined finishable claim, a
split with a combined gate, or an explicit recorded limit. The review's root-cause note explains the
tradeoffs. Once that decision is recorded, correct the same packet; do not self-accept it or release
K1.4-gate.
