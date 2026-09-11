# Independent review — K0.1, round 5

## Identity and access

- Packet: **K0.1** — Protocol decisions and legacy disposition.
- Reviewed base (unchanged across all rounds): `6464be12c11eb75f7dfbc5ece12ca8d3020a5c15`.
- Round-1 reviewed candidate H: `857fa05a8a72a4c6f4f294f9e775a0dc1f7919dc`.
- Round-2 reviewed candidate H2: `cc61e74455534abf896c46632246615185219b92`.
- Round-3 reviewed candidate H3: `aef1e33ba944a0647bb2319fb97ae40b18b05924`.
- Round-4 reviewed candidate H4: `a068e2f6c8d67e5e3e2512c765b29427acb4ac68`.
- Round-5 review record commit (adds [review-04.md](review-04.md); ledger → CHANGES_REQUESTED):
  `cef33136c13f311064dff55c76932a444fa2c9da`.
- **Round-5 correction payload C5: `ab2ff6d16914edbf89dee24498140ef2a41a5689`.**
- **Round-5 reviewed candidate H5: `d0dbc4800c10dad68a8b4b6c662bf90c963fd926`.**
- Contract reviewed: [contract.md](contract.md) as carried by H5, together with
  [protocol-worksheet.md](protocol-worksheet.md) **Revision 5** and the round-5 report
  [implementation-05.md](implementation-05.md).
- Evidence reviewed: the raw command output reproduced verbatim inside
  [implementation-05.md](implementation-05.md) at H5, plus the historical directory
  [`evidence/round-3/`](evidence/round-3/) that H3 carries.
- Reviewer identity: **GPT-5.6 Sol, High reasoning.**
- Reviewer access: **independent pinned GitHub source inspection; no executable local checkout and no
  shell rerun of any command.**
- Reviewer session identifier: **not supplied.** None is recorded here; this record does not invent one.
- Review date: **September 11, 2026** (America/New_York).
- Transcription path: delivered to the coding-agent session as an owner (Rex-Shih) message and
  recorded here verbatim in substance, per [006](../../006-development-process.md)'s
  owner-transcription path.

## Inspected versus rerun

- **Inspected, not rerun: the round-5 validation commands.** Their raw output as reproduced in
  [implementation-05.md](implementation-05.md) was read and accepted as pinned evidence; no command
  was re-executed and no digest recomputed by the reviewer. Round-5 validation evidence availability
  is verdicted PASS on that basis.
- **Inspected:** the pinned tree at H5; the cumulative diff `6464be1..d0dbc48`; the round-5 correction
  delta `a068e2f..ab2ff6d` and the administrative delta `ab2ff6d..d0dbc48`;
  `protocol-worksheet.md` Revision 5 in full, with particular attention to §3, §5, §9, §11, §12 and
  §13; `contract.md` at H5 including its new command-plan exception; and
  [review-04.md](review-04.md).

## Accepted without reopening

- **The owner-approved historical blank-at-EOL exception** recorded in [contract.md](contract.md)'s
  command plan is **ACCEPTED** by this review. Its three-run form is sound, its scope is genuinely
  narrow and self-limiting, and round 5's own delta passing under the strict rule is the right test.
  `implementation-04.md` is not to be edited, and this exception is not to be reopened.
- **Round-4 findings K01-R4-01 and K01-R4-02 are accepted as fixed** in substance. The residual
  defects below are *consequences* of the round-4 repair that revision 5 did not carry through, not a
  reversal of it.
- **E-7 / JCS** is unchanged and is not reopened.

## Criterion verdicts

| Criterion | Verdict |
|---|---|
| K0.1-C1 — every 001 K0 boundary has one owner and an observable assertion | **PASS** |
| K0.1-C2 — dedicated sections with decisions; limits with units and a computable canonical encoding | **PASS** |
| K0.1-C3 — every named legacy record classified migratable / legacy-only / refused, split where needed | **PASS** |
| K0.1-C4 — no new mandatory Kernel concept; transport/storage stays implementation-owned | **PASS** |
| K0.1-C5 — contradictions called out explicitly and resolved in the Kernel's favour | **FAIL** (K01-R5-01: B-2's `READY` rule contradicts W-7/W-8 and execution-protocol.md, uncalled) |
| K0.1-C6 — versioned and self-contained for a K1.1 implementer | **FAIL** (K01-R5-01 and K01-R5-02) |
| [007](../../007-work-packets.md) K0.1 packet acceptance | **FAIL** |
| Round-5 validation evidence availability | **PASS** |
| Candidate C/H process identity (006's commit-identity convention) | **PASS** |
| K0.2/E0 and later executable proof | **DEFERRED** — explicitly outside this packet and assigned to K0.2 and later |

## Findings

### K01-R5-01 — make wake-derived READY preserve the wait eligibility rule through the next dispatch (P1)

Revision 5 correctly retires the wait when an eligible Event wakes it, but B-2 then falls back to the
generic `READY` rule ("all currently unacknowledged Events in acceptance order"). That permits older
unrelated backlog to displace the actual wake Event, and contradicts W-7/W-8.

Re-read before editing: [execution-protocol.md](../../../detail-design/execution-protocol.md)'s *Input
reservation and acknowledgment* and *Wait registration*; [kernel.md](../../../kernel.md)'s *Events and
waits*; worksheet B-1/B-2/B-4, W-1/W-2/W-3/W-7/W-8, §11 row 5.

Define the exact transition/selection semantics **without introducing another wait type**. When an
eligible Event ends a registered wait — either because W-2 finds it during atomic registration, or
because it is accepted later while `WAITING`:

- retire the wait/generation exactly as W-1 already requires;
- make the Execution `READY`;
- preserve enough accepted/recoverable readiness information to apply that retired wait's eligibility
  rule to the **next** dispatch;
- the next dispatch **MUST** include at least one accepted Event that was eligible under that retired
  wait, and **MUST NOT** allow older ineligible backlog to displace it;
- to match W-7/W-8's existing semantics, select that wake-triggered Activation batch **only** from
  Events eligible under the retired wait's dependency/subscription rule, in acceptance order among
  eligible Events and subject to the normal batch bound;
- unrelated backlog remains queued/unacknowledged under B-4;
- after that wake-triggered exchange is reserved, later ordinary `READY` dispatches use the normal
  `READY` acceptance-order rule unless another wait is registered.

Do not reintroduce a live wait after it has been retired. Do not invent a persistent per-alternative
"satisfied" flag. This is recoverable readiness / batch-selection semantics, not another Kernel
entity. Leave the exact storage representation implementation-owned.

Update **B-2** so the `READY` rule distinguishes (1) ordinary `READY` with no pending wait-wake
readiness → bounded acceptance-order batch, from (2) `READY` caused by a retired wait's eligible wake
→ the one-exchange wake-selection rule above. Update **W-1/W-2** as necessary so the same rule applies
when an eligible Event was already present during the atomic wait-registration check. Update **W-7
cases 4/5** and **W-8** to point to this rule rather than merely asserting the desired batch.

Add a load-bearing deterministic case: batch bound = 1; X is `WAITING` on subscription `{continue}`;
older `billing.question` is queued and ineligible; later `continue` is accepted and wakes X; the
immediately resulting Activation **MUST** contain `continue`, never `billing.question`;
`billing.question` remains queued; after that exchange, if X remains ordinarily `READY`, normal
acceptance-order backlog handling may resume.

Update §11 row 5's observable assertion to include "**an older unmatched Event cannot displace the
Event that woke the wait from the wake-triggered next batch**."

This must remain consistent with the canonical detail-design rule: *"While WAITING, select only Events
eligible under the registered wait/subscriptions, with an eligible wake included before unrelated
backlog. Unmatched Events remain queued."*

### K01-R5-02 — state one exact dependency-alternative selector grammar (P2)

W-1 currently says in one place that a dependency alternative is over kind and/or correlation, and
later says the declarative data uses envelope identity/kind/correlation. Resolve that internal
ambiguity.

Use the canonical dimensions already named by [kernel.md](../../../kernel.md):

- exact Event/envelope **identity**, when supplied;
- Event **kind** or finite kind set, when supplied;
- **correlation** identity, when supplied.

Matching within one alternative is **conjunction** over every selector field that alternative supplies.
At least one of identity/kind/correlation must be supplied; **no match-everything empty alternative**.
The dependency list remains finite and alternatives are combined only by **ANY-OF**. No
predicate/query/model-text condition is introduced.

Keep application-input subscription matching separate: subscription label/name selection is not an
ordinary dependency alternative and still follows W-1's declared-subscription path.

Reconcile `MIG-5` with this exact grammar:

- current `WakeCondition`/`eventSatisfiesWake` is **Migratable unchanged** as the kind/correlation
  matching component for alternatives that use those dimensions;
- it is **NOT** the complete target dependency matcher when exact Event identity is constrained;
- target exact Event-ID matching is an **additional ordinary equality check**, not a new matching
  language;
- retain the already-correct statement that current `eventSatisfiesWake` does not implement
  application-input label subscriptions.

Recheck W-1, §11 row 5, `MIG-5` and `REF-5` together after this edit.

## Required cumulative consistency pass

Perform one final cumulative consistency pass over the entire worksheet, specifically checking B-1/B-2/
B-4; W-1 through W-8; §11 row 5; `MIG-5`/`REF-5`; PC-1/`MIG-3`/`LEG-4`; and the §13 contradiction
ledger. Confirm there is **one** batch-selection protocol, **one** wait protocol and **one** selector
grammar.

Do not alter E-7/JCS unless a real defect is independently discovered. Do not regress Activation-ID
takeover identity. Do not reintroduce Runtime-local promises as Kernel waits. Do not alter the
corrected K1 Effect-refusal boundary. Do not equate generic `revision` with `base_progress_revision`.
Do not change the three-label legacy classification. Do not reopen the accepted historical-evidence
whitespace exception.

## Required round-6 process

Record this review as `docs/development/work/K0.1/review-05.md`, changing only the K0.1 ledger row to
`CHANGES_REQUESTED`, in a separate administrative review-record commit. Create correction payload
**C6** after it, containing only the bounded contract/worksheet correction needed for this review,
including correction/revision history where necessary. Run final documentation validation only after
C6 exists and the working tree is clean: `npm run check:builder-docs`; `npm run typecheck`; the
three-way diff-check plan already recorded in `contract.md` (ordinary strict cumulative `base..C6`,
which may report only the already-approved immutable `implementation-04.md` blank-at-EOL exceptions;
cumulative `base..C6` with only `blank-at-eol` disabled, which must exit 0; strict `H5..C6`, which
must exit 0 with no exception); the K0.1 relative-link/anchor audit; cumulative and `H5..C6`
diff-stat/scope checks; `git status --porcelain`. Do not reproduce unified-diff context lines with
trailing spaces in the round-6 report. `npm test` remains unnecessary if no executable or test files
change.

Then create **H6** containing only `docs/development/work/K0.1/implementation-06.md` and the
`docs/development/007-work-packets.md` status-row edit back to `WAITING_FOR_REVIEW`; verify `C6..H6`
contains exactly those two files. `implementation-06.md` must disposition K01-R5-01 and K01-R5-02
individually, with exact worksheet locations and complete small raw command outputs, not collapsed
into "addressed."

## Scope preserved

Unchanged non-goals: no `packages/` runtime work; no K0.2 or E0 execution; no K1/K2 implementation; no
database, scheduler, substrate, native-recovery or isolation work; no new third-party dependency; no
successor packet; no self-acceptance. Corrections on a released packet need no renewed owner release;
K0.2 and all later packets remain unreleased.

## Outcome

CHANGES REQUIRED

Disposition of both findings is recorded in [implementation-06.md](implementation-06.md).
