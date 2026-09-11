# Independent review — K0.1, round 4

## Identity and access

- Packet: **K0.1** — Protocol decisions and legacy disposition.
- Reviewed base (unchanged across all rounds): `6464be12c11eb75f7dfbc5ece12ca8d3020a5c15`.
- Round-1 reviewed candidate H: `857fa05a8a72a4c6f4f294f9e775a0dc1f7919dc`.
- Round-2 reviewed candidate H2: `cc61e74455534abf896c46632246615185219b92`.
- Round-3 reviewed candidate H3: `aef1e33ba944a0647bb2319fb97ae40b18b05924`.
- Round-4 review record commit (adds [review-03.md](review-03.md); ledger → CHANGES_REQUESTED):
  `673888425bdc4d9822f7d9e192dc34d66149ae5d`.
- **Round-4 correction payload C4: `2286106dfc8efc43a9f8758b2deaa6a7ddb64fa9`.**
- **Round-4 reviewed candidate H4: `a068e2f6c8d67e5e3e2512c765b29427acb4ac68`.**
- Contract reviewed: [contract.md](contract.md) as carried by H4, together with
  [protocol-worksheet.md](protocol-worksheet.md) **Revision 4** and the round-4 report
  [implementation-04.md](implementation-04.md).
- Evidence reviewed: the raw command output reproduced verbatim inside
  [implementation-04.md](implementation-04.md) at H4, plus the historical directory
  [`evidence/round-3/`](evidence/round-3/) that H3 carries.
- Reviewer identity: **GPT-5.6 Sol, High reasoning.**
- Reviewer access: **independent pinned GitHub source inspection, plus direct inspection of
  RFC 8785; no executable local checkout and no shell rerun of any command.**
- Reviewer session identifier: **not supplied.** None is recorded here; this record does not invent one.
- Review date: **September 11, 2026** (America/New_York).
- Transcription path: delivered to the coding-agent session as an owner (Rex-Shih) message and
  recorded here verbatim in substance, per [006](../../006-development-process.md)'s
  owner-transcription path.

## Inspected versus rerun

- **Inspected, not rerun: the round-4 validation commands.** Their raw output as reproduced in
  [implementation-04.md](implementation-04.md) was read and accepted as pinned evidence; no command
  was re-executed, no digest recomputed and no script re-run by the reviewer. Round-4 validation
  evidence availability is verdicted PASS on that basis: the outputs are inside the candidate itself
  and are retrievable through exactly the access this review used.
- **Inspected:** the pinned tree at H4; the cumulative diff `6464be1..a068e2f`; the round-4
  correction delta `aef1e33..2286106` and the administrative delta `2286106..a068e2f`;
  `protocol-worksheet.md` Revision 4 in full; `contract.md` at H4; [review-03.md](review-03.md);
  and — independently of this repository — **RFC 8785** itself, against which E-7's realigned rule 4,
  rule 6, rule 7 and the profile note were checked.
- **Also inspected:** current `packages/core` sources bearing on the wait contract —
  `execution/context.ts`, `interaction/event-envelope.ts`, `interaction/events.ts` and
  `ports/controller.ts` — which is where finding K01-R4-01's evidence about
  `ExternalInputBody.label` and the legacy `interleave` field comes from.

## Criterion verdicts

| Criterion | Verdict |
|---|---|
| K0.1-C1 — every 001 K0 boundary has one owner and an observable assertion | **FAIL** (K01-R4-01: §11 row 5 does not cover the K0 trace's subscription-only input wait) |
| K0.1-C2 — dedicated sections with decisions; limits with units and a computable canonical encoding | **PASS** |
| K0.1-C3 — every named legacy record classified migratable / legacy-only / refused, split where needed | **FAIL** (K01-R4-01: `MIG-5` overclaims, `REF-5` under-covers the legacy `interleave` field) |
| K0.1-C4 — no new mandatory Kernel concept; transport/storage stays implementation-owned | **FAIL** (K01-R4-01: W-5 keeps `interleave` as a target Kernel wait field alongside W-1's two lists) |
| K0.1-C5 — contradictions called out explicitly and resolved in the Kernel's favour | **FAIL** (K01-R4-01: B-2/W-1/W-5 describe two different wait protocols and the conflict is not called out) |
| K0.1-C6 — versioned and self-contained for a K1.1 implementer | **FAIL** (K01-R4-01 and K01-R4-02) |
| [007](../../007-work-packets.md) K0.1 packet acceptance | **FAIL** |
| Round-4 validation evidence availability | **PASS** |
| Candidate C/H process identity (006's commit-identity convention) | **PASS** — the review-record / C4 / validation / H4 sequence is correct and `C4..H4` carries only the report and the status row |
| K0.2/E0 and later executable proof | **DEFERRED** — explicitly outside this packet and assigned to K0.2 and later |

E-7 and its RFC 8785 alignment were re-checked directly against the RFC and are **not** reopened;
K0.1-C2 passes. The round-3 findings K01-R3-01 through K01-R3-04 are accepted as fixed.

## Findings

### K01-R4-01 — repair the wait contract cumulatively, not just one paragraph (P1)

Re-read [kernel.md](../../../kernel.md)'s *Events and waits*,
[execution-protocol.md](../../../detail-design/execution-protocol.md)'s *Input reservation and
acknowledgment* and *Wait registration, deadlines and liveness*, [001](../../001-current-status-and-roadmap.md)
K0/K1, [007](../../007-work-packets.md) K0.2/K1.3, and current
`packages/core/src/{execution/context.ts,interaction/event-envelope.ts,interaction/events.ts,ports/controller.ts}`
before editing.

**The target protocol must have one unambiguous wait representation.** Revision 4 has two: W-1's
dependency-alternatives-plus-subscriptions record, and W-5's separate `interleave` field, with B-2
still selecting by singular `wake` plus `interleave`.

Keep the target `waitingFor` record based on **dependency alternatives**, **explicit input
subscriptions**, and **optional deadline/generation metadata already required elsewhere**.

**Change W-1 so dependency alternatives themselves are NOT required to be non-empty.** Instead require
at least one eligible wake source across dependency alternatives **+** input subscriptions. This must
permit the K0 trace's selective input-only wait.

**Define the Kernel behavior without inventing a persistent "dependency satisfied" flag:**

- an Event matching any dependency alternative makes the Execution `READY`;
- application input is eligible only when it matches a declared input subscription;
- a subscribed input may itself be the sole reason for the wait (input-only wait);
- any eligible wake retires that current wait registration/generation and makes the Execution `READY`;
- if the Runtime still needs some other dependency after processing a correction/peer input, its next
  Outcome registers that dependency again.

Do not claim that waking through a subscription proves some unrelated external dependency settled.

**Remove the target-level legacy `interleave` schema:**

- B-2 must select `WAITING` Events using the W-1 dependency/subscription eligibility rule, not
  singular `wake` plus `interleave`.
- W-5 must no longer define `interleave` as an additional target Kernel wait field. Reframe it as
  current-0.8.x legacy/compatibility semantics if it is worth retaining in the worksheet at all.
- Search the entire worksheet for target-semantic uses of `wake` singular / `interleave` and make them
  consistent with W-1. Historical, revision-history and current-code quotations may remain when
  clearly labelled legacy.
- §11 row 5 must explicitly cover subscription-only input wait as well as correlated dependency waits.
- Add a deterministic counterexample for the exact K0 trace: after typed output, the Runtime waits
  only for application input subscription `continue`; unrelated input remains queued, matching
  `continue` wakes, and the next accepted Outcome may complete.
- Preserve the existing child-result/correction examples, but express correction wake using target
  subscriptions rather than a separate interleave field.

**Correct legacy classification in §12:**

- `MIG-5` may classify the current kind/correlation declarative matcher as **Migratable** for ordinary
  correlated Event dependency matching.
- Do **not** say current `eventSatisfiesWake` unchanged builds *both* target lists: it cannot inspect
  `ExternalInputBody.label` and its own source documents that limitation.
- `REF-5` must explicitly cover adoption of the current `ExecutionWait.event` shape, **including its
  optional legacy `interleave` field**, as the new target wait record.
- If needed, split another refused row for the legacy `interleave` field, but every actual
  classification must still use only Migratable / Legacy-only / Refused.
- Do not reintroduce controller resumptions or Runtime-local promises as Kernel waits.

**The corrected semantics must make this counterexample impossible:** *"wait for application input
label=continue" either requires a fake unrelated dependency or wakes for every `external.input`
regardless of label.*

### K01-R4-02 — correct PC-1's progress compatibility wording (P2)

`PC-1` must not call current `ControllerProgress` / `context.control` **as a whole** "fully
compatible." State precisely:

- the nested `ControllerProgress.progress: JsonObject` payload pattern is an example of form (a),
  inline opaque Runtime-owned progress;
- the enclosing current wrapper does **not** migrate unchanged, because its closed
  `kind: "agent" | "workflow"` discriminator is `LEG-4`;
- K1 compatibility is determined through the pinned Runtime/definition/codec contract, not that
  two-value tag.

Recheck PC-1 against `MIG-3`, `LEG-4`, [001](../../001-current-status-and-roadmap.md) K1 and
[007](../../007-work-packets.md) K1.1 so all four say the same thing.

## Required cumulative consistency pass

After both fixes, perform a narrow cumulative consistency pass over the entire worksheet. In
particular verify:

- B-2, W-1 through W-7, §11 row 5, `MIG-5`/`REF-5` and any legacy `interleave` text describe **one**
  wait protocol;
- PC-1, `MIG-3` and `LEG-4` describe **one** progress-compatibility protocol;
- no new fourth legacy-disposition label appears;
- E-7/JCS remains untouched unless an actual defect is found;
- no previously fixed Activation-ID, Runtime-local-wait, Effect-refusal, revision, evidence or
  review-provenance decision regresses.

Update the worksheet revision/history and contract correction history as needed, but do not broaden
packet scope.

## Required round-5 process

Record this review as `docs/development/work/K0.1/review-04.md`, changing only the K0.1 ledger row to
`CHANGES_REQUESTED`, in a separate administrative review-record commit. Create correction payload
**C5** after that commit, containing only the bounded contract/worksheet corrections required above.
Run final documentation validation only after C5 exists and the working tree is clean:
`npm run check:builder-docs`; `npm run typecheck`; cumulative `git diff --check` from the original
base to C5; the K0.1 relative-link/anchor audit; cumulative and `H4..C5` diff-stat/scope checks;
`git status --porcelain`. `npm test` is still not required if there are no executable or test changes.

Keep round-5 evidence compliant with the now-correct C/H convention: put the complete small raw
command outputs in `implementation-05.md`, or use another already-allowed pinned artifact path, and
add no evidence file or script after validating C5. Then create **H5** containing only
`docs/development/work/K0.1/implementation-05.md` and the
`docs/development/007-work-packets.md` K0.1 status-row edit back to `WAITING_FOR_REVIEW`; verify
`git diff --stat C5 H5` contains exactly those two files. `implementation-05.md` must disposition
K01-R4-01 and K01-R4-02 individually with exact correction locations and evidence, not collapsed into
"addressed."

## Scope preserved

Unchanged non-goals: no `packages/` runtime work; no K0.2 or E0 execution; no K1/K2 implementation;
no database, scheduler, substrate, native-recovery or isolation work; no new third-party dependency;
no successor packet; no self-acceptance. Corrections on a released packet need no renewed owner
release; K0.2 and all later packets remain unreleased.

## Outcome

CHANGES REQUIRED

Disposition of both findings is recorded in [implementation-05.md](implementation-05.md).
