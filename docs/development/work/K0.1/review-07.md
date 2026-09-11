# Independent review — K0.1, round 7

## Identity and access

- Packet: **K0.1** — Protocol decisions and legacy disposition.
- Reviewed base (unchanged across all rounds): `6464be12c11eb75f7dfbc5ece12ca8d3020a5c15`.
- Reviewed candidates to date: H `857fa05a8a72a4c6f4f294f9e775a0dc1f7919dc`,
  H2 `cc61e74455534abf896c46632246615185219b92`, H3 `aef1e33ba944a0647bb2319fb97ae40b18b05924`,
  H4 `a068e2f6c8d67e5e3e2512c765b29427acb4ac68`, H5 `d0dbc4800c10dad68a8b4b6c662bf90c963fd926`,
  H6 `c5bdd481134cf3691050b16dd6dd3a49aa9ab042`.
- Round-7 review record commit (adds [review-06.md](review-06.md); ledger → CHANGES_REQUESTED):
  `6b9a66d448e762744c6e473f104754de5c81984c`.
- **Round-7 correction payload C7: `fdac4ccdce5e674c9aba43b645b8061ca7578526`.**
- **Round-7 reviewed candidate H7: `6bdc53ad10d50e0e41bccf57bab212d406b7a2ce`.**

Reviewed artifacts pinned by **blob** SHA at H7:

| Artifact | Blob SHA at H7 |
|---|---|
| [contract.md](contract.md) | `fa0b95ed3a2ea3f5943e753789244a528d15af82` |
| [protocol-worksheet.md](protocol-worksheet.md) (Revision 7) | `bd2689ff5d6f36fb353d8b2a6f55643d3c05d68b` |
| [review-06.md](review-06.md) | `ecc4e2f32fb762fe10199c6ecba502aa030978a7` |
| [implementation-07.md](implementation-07.md) | `f819fe4dc937aea73bf85913a70231a2d3da3012` |

- Reviewer identity: **GPT-5.6 Sol, High reasoning.**
- Reviewer access: **independent pinned GitHub source inspection; no executable local checkout and no
  shell rerun of any command.**
- Reviewer session identifier: **not supplied.** None is recorded here; this record does not invent one.
- Review date: **September 11, 2026** (America/New_York).
- Transcription path: delivered to the coding-agent session as an owner (Rex-Shih) message and
  recorded here verbatim in substance, per [006](../../006-development-process.md)'s
  owner-transcription path.

## Inspected versus rerun

- **Inspected, not rerun: the round-7 validation commands.** Their raw output as reproduced in
  [implementation-07.md](implementation-07.md) was read and accepted as pinned evidence; no command was
  re-executed and no digest recomputed. Round-7 validation-evidence availability is verdicted PASS.
- **Inspected:** the pinned tree at H7 by the blob identities above; the cumulative diff
  `6464be1..6bdc53a`; the correction delta `c5bdd48..fdac4cc` and the administrative delta
  `fdac4cc..6bdc53a`; `protocol-worksheet.md` Revision 7 in full, with particular attention to §3
  (B-1/B-2/`B-6`), §4 (CL-1/CL-2), §5 (W-1/W-2/W-3/W-6/W-7/W-8), §11 row 5, §12 (`MIG-5`/`REF-5`) and
  §13; and `contract.md` at H7.

## Accepted without reopening

- The **owner-approved historical blank-at-EOL exception** stands; `implementation-04.md` and every
  other historical report are not to be edited.
- **Round-6 findings K01-R6-01 and K01-R6-02 are accepted as fixed.** `B-6`'s two-path split is right,
  and the selector grammar's normativity is now in the correct place. The findings below are a
  different class: one is a genuine bypass the grammar's precision made visible, one is a gap the
  `B-6` work left beside itself, and one is an over-reach inside the round-6 fix that its own report
  flagged.
- **E-7 / JCS**, the Activation-ID takeover identity, the K1 Effect-refusal boundary, the progress
  decisions and the three-label legacy vocabulary are unchanged and not reopened.
- The round-7 report's *Reviewer focus* correctly identified path B's child/message row as the
  likeliest error. It was. K01-R7-03 answers it.

## Criterion verdicts

| Criterion | Verdict |
|---|---|
| K0.1-C1 — every 001 K0 boundary has one owner and an observable assertion | **PASS** |
| K0.1-C2 — dedicated sections with decisions, not open questions restated | **FAIL** (K01-R7-02: the wait-deadline clock is named in §4 but its expiry has no accepted-fact, delivery or batch semantics) |
| K0.1-C3 — every named legacy record classified migratable / legacy-only / refused, split where needed | **PASS** |
| K0.1-C4 — no new mandatory Kernel concept; transport/storage stays implementation-owned | **PASS** |
| K0.1-C5 — contradictions called out explicitly and resolved in the Kernel's favour | **FAIL** (K01-R7-01: W-1's eligibility rule contradicts kernel.md's "application-input waits require a declared subscription") |
| K0.1-C6 — versioned and self-contained for a K1.1 implementer | **FAIL** (all three findings) |
| [007](../../007-work-packets.md) K0.1 packet acceptance | **FAIL** |
| Round-7 validation-evidence availability | **PASS** |
| Candidate C/H process identity (006's commit-identity convention) | **PASS** |
| K0.2/E0 and later executable proof | **DEFERRED** — explicitly outside this packet and assigned to K0.2 and later |

## Findings

### K01-R7-01 — application input must not bypass declared subscriptions (P1)

Rewrite W-1's eligibility rule so it has an explicit **source-category** rule.

- For **ordinary application input**, eligibility while `WAITING` is determined **ONLY** by declared
  input subscriptions. A dependency alternative matching that Event's identity/kind/correlation does
  **not** make ordinary application input eligible.
- For **non-application-input Kernel Events**, dependency alternatives use W-1's identity/kind/
  correlation selector grammar.
- Keep declared subscriptions separate from dependency alternatives. Do **not** turn application
  label/name into a fourth dependency-selector field.

Recheck B-2, `B-6`, W-1, W-2, W-7, W-8 and §11 row 5. Preserve the existing invariant that application
input outside every declared subscription remains queued and unacknowledged **even when the wait has
dependency alternatives**.

Reconcile `MIG-5`: `eventSatisfiesWake` remains migratable unchanged as a kind/correlation **matching
component**, but it is **NOT by itself the complete target eligibility predicate**. The target caller
must enforce the source-category rule before/around that matcher. A legacy `WakeCondition` that happens
to match `external.input` does **not** become a target application-input subscription merely by
migration. `REF-5`/current-record refusal remains consistent.

Add a deterministic **negative** case: wait `W` has dependency alternative `kind = external.input` and
no matching declared subscription; ordinary external input arrives. It **MUST** remain queued and
**MUST NOT** wake. Add the corresponding **positive** case with the matching declared subscription.

### K01-R7-02 — give deadline expiry the same crash-safe batch semantics as Event wake (P1)

Re-read [kernel.md](../../../kernel.md)'s *Events and waits* and *Acceptance and atomicity*;
[execution-protocol.md](../../../detail-design/execution-protocol.md)'s wait registration and race
table; [recovery-and-compatibility.md](../../../detail-design/recovery-and-compatibility.md)'s crash
windows; and worksheet CL-1/CL-2, B-1/B-2/`B-6`, W-1/W-3/W-6 and §11 row 5.

A **current-generation** wait-deadline expiry is a Kernel-owned accepted timeout fact/observation. Its
acceptance must atomically: retire that wait/generation; record the timeout observation tied to the
expired wait generation; make the Execution `READY`; and record recoverable readiness sufficient to
deliver that timeout observation in the immediately resulting Activation.

**Do not let deadline expiry fall into ordinary `READY` selection.** Older unrelated backlog **MUST
NOT** displace the timeout observation.

Generalize B-2/`B-6`, or add a narrowly named sibling decision, so there is one coherent
**"wait-ended readiness"** protocol:

- Event-triggered readiness keeps the existing `B-6` behaviour;
- deadline-triggered readiness makes the timeout observation **mandatory** in the next batch;
- Events that would have been eligible under the retired wait and are accepted **before reservation**
  remain eligible for that same wake/timeout-triggered batch, subject to the normal bound and
  deterministic acceptance ordering;
- unrelated backlog remains queued;
- after the batch is durably reserved, the readiness is consumed and the pinned Activation/batch
  governs replay/takeover.

The timeout observation **must be observable to the Runtime through the Activation's accepted
input/batch contract**. Do not leave a state transition to `READY` with no way to distinguish "deadline
expired" from ordinary readiness. The exact transport/wire spelling of the timeout Event/fact can
remain replaceable, but its **logical identity, wait-generation correlation and mandatory delivery
semantics** cannot remain unspecified.

Preserve W-3: a timer naming a superseded generation cannot wake the replacement wait. Do not convert
wait timeout into proof that the external action failed. Preserve CL-2's rule that a timeout and a
later authenticated result can both remain accepted facts.

Add deterministic cases:

1. current G1 deadline expires with older unrelated backlog and batch bound 1 → next Activation
   contains the timeout observation, not backlog;
2. G1 is replaced by G2 before G1 timer delivery → G1 timer cannot wake G2;
3. G1 timeout is accepted first, then a result correlated to G1 is accepted **before reservation** →
   timeout remains delivered and the result remains durable/eligible according to the retired wait rule
   and bound; neither fact is rewritten into the other.

Update §11 row 5 so wait-generation/lost-wake assertions cover **both** matching-Event wake and
current-generation timeout wake.

### K01-R7-03 — separate durable child routing obligation from destination Event acceptance (P2)

Correct `B-6` path B's child/message/routed-result row.

- For a **message** where success itself is durable destination-mailbox acceptance, the destination
  Event acceptance and readiness when applicable **may** be one atomic boundary.
- For a **child terminal result**, the child's terminal boundary may commit the terminal result plus a
  **durable Kernel-to-parent routing obligation** WITHOUT yet accepting a parent mailbox Event. In that
  case the parent is **not** `B-6`-ready merely because the routing obligation exists. Recovery must
  replay / idempotently fulfil that obligation.
- **`B-6` starts for the parent only when fulfilment actually accepts the resulting Event into the
  parent's mailbox.** That destination Event acceptance must atomically record applicable
  wake/readiness. If a profile performs terminal-result commit and parent Event acceptance in one
  transaction, that is also conforming; do not require it universally.
- Apply the same principle to any other routed Event: obligation creation and destination Event
  acceptance may be distinct accepted facts. **Never fabricate destination readiness before the
  destination Event exists.**

This is a **K4-owned future mechanism**; K0.1 should state only the cross-cutting Event/readiness
invariant needed by `B-6`, not freeze K4's concrete routing implementation.

## Required cumulative consistency pass

Perform a final cumulative consistency pass after these changes. Specifically prove that:

- application input has exactly **one** target wake path (declared subscription);
- non-input dependency Events use exactly **one** selector grammar;
- Event wake and deadline wake **both** have crash-safe next-batch semantics;
- routing obligations are not confused with Event acceptance;
- no previously fixed Activation-ID, Effect-refusal, canonical-encoding, progress, legacy-disposition,
  C/H or evidence decisions regress.

## Required round-8 process

Record this review as `docs/development/work/K0.1/review-07.md`, changing only the K0.1 ledger row to
`CHANGES_REQUESTED`, in a separate administrative review-record commit. Create payload **C8** after it,
containing only bounded K0.1 contract/worksheet corrections and required correction/revision history.
Validate only after a clean C8 exists: `npm run check:builder-docs`; `npm run typecheck`; strict
cumulative `base..C8`, permitting only the two already-approved immutable `implementation-04.md`
blank-at-EOL findings; cumulative `base..C8` with only `blank-at-eol` disabled, which must exit 0;
strict `H7..C8` with no exception; the K0.1 link/anchor audit; cumulative and `H7..C8` scope/diff-stat
checks; `git status --porcelain`. `npm test` remains unnecessary for documentation-only changes.

Create **H8** containing only `docs/development/work/K0.1/implementation-08.md` and the
`docs/development/007-work-packets.md` K0.1 status edit back to `WAITING_FOR_REVIEW`; verify `C8..H8`
contains exactly those two files.

**Do not say "every raw command output reproduced verbatim" in the new status row** if the report again
strips the two echoed trailing-space bytes from the historical strict-diff output. State the evidence
accurately — for example, "raw outputs reproduced in the report subject to the documented
historical-whitespace rendering exception."

`implementation-08.md` must disposition K01-R7-01, K01-R7-02 and K01-R7-03 separately and include
complete small raw validation outputs.

## Scope preserved

Unchanged non-goals: no `packages/` changes; no K0.2 or E0; no K1/K2/K4 implementation; no database,
scheduler, native-recovery or isolation implementation; no new dependency; no successor packet; no
self-acceptance. Corrections on a released packet need no renewed owner release; K0.2 and all later
packets remain unreleased.

## Outcome

CHANGES REQUIRED

Disposition of all three findings is recorded in [implementation-08.md](implementation-08.md).
