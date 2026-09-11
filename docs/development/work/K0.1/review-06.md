# Independent review — K0.1, round 6

## Identity and access

- Packet: **K0.1** — Protocol decisions and legacy disposition.
- Reviewed base (unchanged across all rounds): `6464be12c11eb75f7dfbc5ece12ca8d3020a5c15`.
- Round-1 reviewed candidate H: `857fa05a8a72a4c6f4f294f9e775a0dc1f7919dc`.
- Round-2 reviewed candidate H2: `cc61e74455534abf896c46632246615185219b92`.
- Round-3 reviewed candidate H3: `aef1e33ba944a0647bb2319fb97ae40b18b05924`.
- Round-4 reviewed candidate H4: `a068e2f6c8d67e5e3e2512c765b29427acb4ac68`.
- Round-5 reviewed candidate H5: `d0dbc4800c10dad68a8b4b6c662bf90c963fd926`.
- Round-6 review record commit (adds [review-05.md](review-05.md); ledger → CHANGES_REQUESTED):
  `35e7de50dc2091d925f918c14c3b2bc5ee62ba0b`.
- **Round-6 correction payload C6: `4a015b316d604f501a9895e85c627b7d0ba0edfd`.**
- **Round-6 reviewed candidate H6: `c5bdd481134cf3691050b16dd6dd3a49aa9ab042`.**

Reviewed artifacts pinned by **blob** SHA at H6, so the exact bytes inspected are unambiguous:

| Artifact | Blob SHA at H6 |
|---|---|
| [contract.md](contract.md) | `70350d75627f040ce25fca605c322024a43d577b` |
| [protocol-worksheet.md](protocol-worksheet.md) (Revision 6) | `4079effad29bbeef33ded38783706396f70a0c3e` |
| [review-05.md](review-05.md) | `fd75cde77f3e21c291a5064aebe818a09ccb6341` |
| [implementation-06.md](implementation-06.md) | `99768ff09dde8267f3e25e623aac3cbca2bdbe68` |

- Reviewer identity: **GPT-5.6 Sol, High reasoning.**
- Reviewer access: **independent pinned GitHub source inspection; no executable local checkout and no
  shell rerun of any command.**
- Reviewer session identifier: **not supplied.** None is recorded here; this record does not invent one.
- Review date: **September 11, 2026** (America/New_York).
- Transcription path: delivered to the coding-agent session as an owner (Rex-Shih) message and
  recorded here verbatim in substance, per [006](../../006-development-process.md)'s
  owner-transcription path.

## Inspected versus rerun

- **Inspected, not rerun: the round-6 validation commands.** Their raw output as reproduced in
  [implementation-06.md](implementation-06.md) was read and accepted as pinned evidence; no command
  was re-executed and no digest recomputed by the reviewer. Round-6 validation evidence availability
  is verdicted PASS on that basis.
- **Inspected:** the pinned tree at H6 by the blob identities above; the cumulative diff
  `6464be1..c5bdd48`; the round-6 correction delta `d0dbc48..4a015b3` and the administrative delta
  `4a015b3..c5bdd48`; `protocol-worksheet.md` Revision 6 in full, with particular attention to §3
  (B-1/B-2/`B-6`), §5 (W-1/W-2/W-7/W-8), §11 row 5, §12 (`MIG-5`/`REF-5`) and §13; and `contract.md`
  at H6.

## Accepted without reopening

- The **owner-approved historical blank-at-EOL exception** in [contract.md](contract.md)'s command
  plan stands, and `implementation-04.md` is not to be edited.
- **Round-5 findings K01-R5-01 and K01-R5-02 are accepted as fixed in direction.** `B-6` is the right
  mechanism and the selector grammar is the right shape. Both findings below are residual precision
  defects inside those two corrections, not a reversal of either.
- **E-7 / JCS** is unchanged and is not reopened.
- The round-6 report's incidental "(this document)" revision-history fix, and its self-flagged
  question about where the match-everything rejection belongs, were both appropriate; the latter is
  answered by K01-R6-02 below.

## Criterion verdicts

| Criterion | Verdict |
|---|---|
| K0.1-C1 — every 001 K0 boundary has one owner and an observable assertion | **PASS** |
| K0.1-C2 — dedicated sections with decisions; limits with units and a computable canonical encoding | **PASS** |
| K0.1-C3 — every named legacy record classified migratable / legacy-only / refused, split where needed | **PASS** |
| K0.1-C4 — no new mandatory Kernel concept; transport/storage stays implementation-owned | **PASS** |
| K0.1-C5 — contradictions called out explicitly and resolved in the Kernel's favour | **FAIL** (K01-R6-01: `B-6` conflates three distinct canonical acceptance boundaries into "the accepted Outcome") |
| K0.1-C6 — versioned and self-contained for a K1.1 implementer | **FAIL** (K01-R6-01 and K01-R6-02) |
| [007](../../007-work-packets.md) K0.1 packet acceptance | **FAIL** |
| Round-6 validation evidence availability | **PASS** |
| Candidate C/H process identity (006's commit-identity convention) | **PASS** |
| K0.2/E0 and later executable proof | **DEFERRED** — explicitly outside this packet and assigned to K0.2 and later |

## Findings

### K01-R6-01 — correct `B-6`'s acceptance-boundary atomicity (P1)

`B-6` has **two** creation paths and they must remain separate. Revision 6 says both "create
wake-triggered readiness identically" and that it is "committed **with** the accepted Outcome," which
is true only of the first.

**Path A — the result/input already exists when the Outcome registering the wait is accepted.**

- The Outcome-acceptance transaction runs W-2's mailbox check.
- If it finds an eligible Event, it retires the just-proposed wait, sets `READY`, and commits the
  wake-triggered recoverable readiness **in that Outcome-acceptance boundary**.

**Path B — no eligible Event existed at registration, so the Execution became `WAITING`; an eligible
Event is accepted later.**

- **There is no new Outcome at this point.**
- The authoritative acceptance boundary **for that Event** must atomically accept the Event/mailbox
  fact **and** the wake-triggered readiness together.
- For ordinary application input this is creation/input ingress's "mailbox entry, **with readiness
  when applicable**."
- For Effect settlement this is "**result Event and recoverable readiness**."
- For child/message/result paths use their authoritative accepted fulfillment/routing boundary,
  consistently with [kernel.md](../../../kernel.md) and the recovery contract.
- **Never** accept the Event durably and depend on a later unjournaled wake write.
- **No later Runtime Outcome is needed** to make this `READY` state durable.

Rewrite `B-6`'s *When it is created* and *Recovery* text so it says "**the authoritative acceptance
boundary that creates the readiness**," not generically "the accepted Outcome." Correct the
implementation/revision-history prose **prospectively**; preserve `implementation-06.md` unchanged as
historical evidence.

Use [recovery-and-compatibility.md](../../../detail-design/recovery-and-compatibility.md)'s
crash-window rules explicitly:

- *Input commit before scheduler notification* → reconstruct `READY` from accepted input/wait state;
- *Settlement committed before wake* → reconstruct Event/readiness from accepted records.

Keep `B-6`'s one-exchange lifetime:

- the selector/readiness survives a crash **before** reservation;
- it is consumed when the wake-triggered Activation batch is **durably reserved**;
- after reservation the pinned dispatch intent/batch is sufficient for replay/takeover, and `B-6` must
  **not** re-arm;
- no second wait type and no per-alternative satisfaction state is introduced.

If the "materialized eligible-Event set" example is retained as an implementation-owned
representation, clarify that it must be maintained — or otherwise represented — so that it preserves
**B-2's exact observable selection semantics through reservation**. An implementation-owned
representation may not weaken the selector semantics.

### K01-R6-02 — make empty kind-set semantics normative in W-1 (P2)

W-1 is the normative selector grammar. Add the rule **there**, not only in `MIG-5`:

- **Event identity** selector: optional exact identity.
- **Kind** selector: optional one kind **or NON-EMPTY finite set of kinds**.
- **Correlation** selector: optional exact correlation identity.
- At least one selector dimension must be present.
- **An empty finite kind set is not a valid supplied Kind selector in the target grammar.**

For migration of the current 0.8.x `WakeCondition` encoding:

- legacy `eventKinds: []` means "**Kind selector absent**", because the current source explicitly uses
  empty to mean unconstrained;
- legacy `correlationId: null` means "**Correlation selector absent**";
- therefore `[]` + `null` maps to **no selector fields** and is rejected under W-1;
- `[]` + non-null correlation maps to a valid **correlation-only** target alternative;
- non-empty `eventKinds` maps to the target **Kind** selector;
- exact Event identity still requires the additional equality check already described.

Update `MIG-5` to describe that mapping and **stop carrying a separate pseudo-normative validation
rule**.

Add deterministic examples:

1. `eventKinds=[]` + `correlation=null` → invalid target alternative;
2. `eventKinds=[]` + `correlation=c1` → valid correlation-only alternative, matching correlation `c1`
   regardless of kind;
3. `eventKinds=[child.result]` + `correlation=null` → valid kind-only;
4. `eventKinds=[child.result]` + `correlation=c1` → valid conjunction;
5. target kind-set field supplied as `[]` → invalid before matching.

Recheck W-1, `MIG-5`, `REF-5` and §11 row 5 together.

## Required cumulative consistency pass

Perform a narrow cumulative consistency pass:

- B-2/`B-6`/W-1/W-2/W-7/W-8 and §11 row 5 describe the same wake → `READY` → dispatch **crash-safe**
  protocol;
- input ingress, settlement and Outcome acceptance are **not conflated**;
- W-1 and `MIG-5` have one exact **encoding-independent** selector meaning;
- prior Activation-ID, local-wait, Effect-refusal, canonical-encoding, progress, legacy-classification
  and historical-evidence decisions do not regress.

## Required round-7 process

Record this review as `docs/development/work/K0.1/review-06.md`, changing only the K0.1 ledger row to
`CHANGES_REQUESTED`, in a separate administrative review-record commit. Create payload **C7** after it,
containing only bounded K0.1 contract/worksheet corrections. Validate only after a clean C7 exists:
`npm run check:builder-docs`; `npm run typecheck`; strict cumulative `base..C7` (only the two
already-approved `implementation-04.md` blank-at-EOL findings may appear); cumulative `base..C7` with
only `blank-at-eol` disabled, exit 0; strict `H6..C7`, exit 0 with no exception; the K0.1 link/anchor
audit; cumulative and `H6..C7` scope/diff-stat checks; `git status --porcelain`. `npm test` remains
unnecessary for documentation-only changes.

Then create **H7** containing only `docs/development/work/K0.1/implementation-07.md` and the
`docs/development/007-work-packets.md` status edit back to `WAITING_FOR_REVIEW`; verify `C7..H7` is
exactly those two files. `implementation-07.md` must disposition K01-R6-01 and K01-R6-02 separately,
include complete small raw validation outputs, and **explicitly distinguish the two `B-6` acceptance
paths**.

## Scope preserved

Unchanged non-goals: no `packages/` changes; no K0.2 or E0; no K1/K2 implementation; no
database, scheduler, native-recovery or isolation work; no new dependency; no successor packet; no
self-acceptance. Corrections on a released packet need no renewed owner release; K0.2 and all later
packets remain unreleased.

## Outcome

CHANGES REQUIRED

Disposition of both findings is recorded in [implementation-07.md](implementation-07.md).
