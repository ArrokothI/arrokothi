# Brief 04 — K1.4 recorded-limit disposition after review 03

Correct the same released packet K1.4 on `claude/k1.4` by the owner-choice-05 route (d).
Base `608f9ece44dbe42b78974bdac9e7ddcd33697705`; reviewed H
`b1769c0fcdb73bfc6297551b87f80e74bc6cb588`; payload C
`3e8b4bac60266fda3e277ae0dd381c4936e15ff3`.
Review record: `docs/development/work/K1.4/review-03.md` on `codex/k1.4-review-03`,
at the immutable recording SHA in the reviewer's handoff.
Open findings: **K14-R3-01, K14-R3-02, K14-R3-03**.
Owner decision: [owner choice 05](../owner-choice-05.md) at reviewed H selects a recorded limit
on this third CHANGES REQUIRED. No further patch round. The content of that limit is not yet approved.

## Goal

State exactly what logical native cleanup and its evidence do not establish, while preserving the
working committed-READY reconciliation, input accounting and fallback cancellation paths. Close the
false claims through the owner's concrete limit disposition, not through another implementation round.

## Criteria (finishable)

| ID | Required outcome | Closes by / expected evidence |
|---|---|---|
| R3-LIMIT | Owner decides the exact 017 scope, justification, trigger and fixing owner for each review finding | Named owner decision plus a 017 entry or explicit disposition; not a generic invocation of L-20/L-31/L-32 |
| R3-CLAIMS | Baseline, verification limits, equivalence explanations and current reporting claims match that decision | Bounded text/diff review against the three finding scenarios; historical evidence preserved with dated corrections |
| R3-CORPUS | Counterexamples remain reproducible with honest expected results | Retain review-03 probes and provenance; explicitly record any unpromoted test as an evidence limit, not a passed behavioral guarantee |
| R3-PRESERVE | No accidental loss of accepted scheduling/accounting mechanisms or current cleanup fallbacks | Kernel/core unchanged; review cumulative diff and existing corpus/evidence; if any payload changes require CI, start only through `gh workflow run packet-verify.yml` as directed |

## Known counterexamples

`probes.mjs` and `probes.log` in this directory contain:

- one failed native applyOutcome transaction and one failed definition read after READY→RUNNING:
  Kernel FAILED, native RUNNING, pending cancellation, no cleanup hold, no later native step;
- one failed request-cascade read, with/without each of `cancel.application`, `cancel.exchange-start`
  and `cancel.forward-loop`: the real cascade ends the members, removal does not;
- static template access and quoted destructuring aliases that escape the candidate's exact census.

The review's prior probe files and the candidate's maintained tests remain part of the cumulative corpus.
The initial-input T6 empty-obligation equivalence is retained; the other three label-wide equivalences
are not justified under prior-cascade failures.

## Suspect design and questions before any work

A fulfilled native cancellation receipt can mean `cancellation_pending`, and an earlier cascade's
settled promise can hide rejection. Neither means every member ended. Which exact cleanup guarantee
will the owner retain, and which will be explicitly disclaimed? What should an application infer from
FAILED plus native RUNNING without a hold, and who owns any subsequent reconciliation?

Which bounded oracle schedules and syntactic census forms will the owner claim? Do not describe a
finite successful-cleanup row set as proving a cancellation label unnecessary, or a static-name escape
as already covered by the runtime-computed-name exclusion.

## Bounds and stop conditions

Owner choice 05 already rules out another patch loop in this subsystem. The review's suggested limit
fields are proposals; obtain the content decision before weakening an obligation. Do not force native
state, repeat native calls, delete fallback cascades, change Kernel semantics/source, modify
`packages/core/src`, self-certify acceptance, merge review branches, or release K1.4-gate.

Use 008/006 for a new concrete candidate and its exact evidence if the owner approves a disposition.
If a proposed limit would silently lose/corrupt cooperative caller data or weaken a build-right-now
item under 017, stop for that decision rather than disguising it as evidence bookkeeping.
