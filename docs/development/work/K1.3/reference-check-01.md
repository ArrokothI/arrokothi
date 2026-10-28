# K1.3 — final Layer-3 check 01

Owner-delegated Prompt C check, 2026-10-28, by the cleanup session identified in
[cleanup 01](cleanup-01.md). Subject: accepted H `47c0b7f1c089260991649a6d814ad7db22b54a2f`
over C `c7abff65ceca3e3b21fd64ffee12ea2f636f5cbc`, base B
`22c8c1db9958049eb8693dd5aa4d7005f2d565db`. This is a maintenance check of the independently
accepted candidate, not a new semantic decision or an independent acceptance of cleanup.

## Accepted sources and ownership

The check starts at [roadmap K1.3](../../../../mental-model/roadmap.md#k13) and the
[reference index](../../../../mental-model/reference.md), then follows the actual delta beyond those
listed owners. Its accepted sources are brief 01's owner answers; owner choices 01–06; design 01 and
its addendum; design 03 revision 1; and [independent review 03](review-03.md). Canonical owners remain
above implementation records. The boundaries are Kernel logical state/acceptance, Driver native
cooperation and takeover safety, and deployment containment/durability.

| Definition or mechanism | Accepted maintenance already in H | Dependency check |
|---|---|---|
| [Creation](../../../../mental-model/mechanisms/creation.md#one-atomic-creation) | Optional immutable Execution deadline joins creation content and retry/conflict semantics, under brief 01 decision 1 | Creation identity packing preserves the old six-part identity when absent; adding/removing/changing the deadline conflicts. Identity and values retain their existing canonical-equality ownership. |
| [Three clocks](../../../../mental-model/concepts/operations.md#three-clocks) | Execution deadline points to creation; the in-process binding note records its clock choices | Registration-time due wait, host-fired live wait and host-fired Execution deadline remain distinct. The clock `OPEN(implementation)` marker remains; no lease representation or native-death inference is selected. |
| [Waits](../../../../mental-model/mechanisms/waits.md#small-distinguishing-examples) | Five examples distinguish membership, eligibility and ordering; correct-candidate sort/truncate equivalence on reachable histories is explained | The declaration, trusted category, four registration steps, generation retirement, reservation-time selection and backlog accounting are consistent with the code and tests. The corrected mutant is timeout omission; equivalence is not credited as a kill. |
| [Core vocabulary](../../../../mental-model/concepts/core.md) | Existing wait, readiness, timeout, mailbox and whole-batch definitions already cover the new implementation | No new canonical term or blank definition is needed. Disposition remains per entry; terminal disposition is not acknowledgment. A Runtime-internal promise still cannot produce Kernel WAITING. |
| [Lifecycle](../../../../mental-model/mechanisms/lifecycle.md#cancellation-order) and [execution cycle](../../../../mental-model/mechanisms/execution-cycle.md#outcome-acceptance) | Existing accepted ordering and losing-proposal rules need no normative change | Cancellation and expiry share the logical terminal path. Accepted Outcome replay precedes the cancellation fence; losing proposals install no progress/output, and exact losing retries retain the refusal. Late delivery evidence reaches only its original row. |
| [Authority](../../../../mental-model/mechanisms/authority.md) | Existing separate cancel power covers the binding's `cancelScopes` | Visibility, exchange-control authority and submission authority do not grant cancellation. The host timer port is a trusted binding entry, not a tenant-facing authorization API. |
| [Recovery](../../../../mental-model/mechanisms/recovery.md), [integration](../../../../mental-model/mechanisms/integration.md) and [resources](../../../../mental-model/mechanisms/resources.md) | No changed target recovery or containment rule | The optional Driver request occurs after logical cancellation and is never physical-stop evidence. Lease expiry still proves no native death. In-memory waits/readiness do not establish crash survival; native exclusion and containment remain separate obligations. |
| [Actions](../../../../mental-model/mechanisms/actions.md), [communication](../../../../mental-model/mechanisms/communication.md) and [output](../../../../mental-model/mechanisms/output.md) | Existing intent, routing, responsibility and observation rules remain intact | K2 Effects/trusted result ingress, child/message routing and K4 output reads are not introduced. A timeout establishes no remote failure; cancellation settles no unknown action and proves no output delivery. |
| [Evidence](../../../../mental-model/mechanisms/evidence.md), BASELINE and 017 | H updates the implemented surface and L-15/L-19–L-28 | Full P/T admission and exact writes establish the enumerated relations, not all planner semantics. Interrupted commits may leave an invalid prefix; later governed admission refuses a successor still outside P. No universal repair, rollback, persistence or E1 claim follows. |

The successor overlay, P1–P9 and T1–T6 are this implementation's internal enforcement mechanism.
Their precise scope belongs to the implementation and BASELINE, not a new portable Kernel protocol.
The review and owner choices 05/06 supply the accepted full-evaluation and interrupted-commit limits.

## Reference disposition

No missing normative Layer-3 correction or contradiction was found in this check. H already replaces
the affected creation, clock and example prose, records binding representations in rewrite-index §4,
and retains the genuinely undecided choices in §4/§5. No definition moves and no obsolete canonical
alias is introduced. Layer 1/2 need no change: the model and major abstractions are unchanged.

Cleanup changes navigation only: the roadmap's K1.3 list gains links to the existing creation,
identity and values owners, and the vocabulary index spells out the three existing clock names in
its link label. Those edits add no rule, representation, acceptance claim or definition. No text
under `concepts/` or `mechanisms/` changes after H.

## Validation and examples

The cleanup reran the owner, successor, control-commit, fault-oracle, wait, cancellation,
Execution-deadline, losing-Outcome, ambient-time, race-search, state-plan and attack-01 suites:
700 tests in 63 suites passed, with no failures, cancellations, skips or todos on Node 26.10.0.
This includes all five batch examples; 256/257 selector limits; malformed/unsupported declarations;
source-category spoofing; no-clock refusal; creation-deadline retry compatibility; three deadline
paths; both cancellation/Outcome orders; and the 11,964-variant successor domain. The full CI and
independent-review evidence remain pinned to their original C/H rather than relabeled as cleanup runs.

Local Markdown path/anchor checks cover the mental-model tree, changed administrative documents and
this record: 40 files and 1,730 local links, with zero missing paths or anchors. Builder-docs and typecheck are rerun separately; builder-docs alone is not a development
link check. Historical records and probes remain unchanged, including the historical position-matrix
expectation superseded by reviewed whole-batch T3.
