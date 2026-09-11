# Independent review — K0.1, round 8

## Identity and access

- Packet: **K0.1** — Protocol decisions and legacy disposition.
- Reviewed base (unchanged across all rounds): `6464be12c11eb75f7dfbc5ece12ca8d3020a5c15`.
- Reviewed candidates to date: H `857fa05a8a72a4c6f4f294f9e775a0dc1f7919dc`,
  H2 `cc61e74455534abf896c46632246615185219b92`, H3 `aef1e33ba944a0647bb2319fb97ae40b18b05924`,
  H4 `a068e2f6c8d67e5e3e2512c765b29427acb4ac68`, H5 `d0dbc4800c10dad68a8b4b6c662bf90c963fd926`,
  H6 `c5bdd481134cf3691050b16dd6dd3a49aa9ab042`, H7 `6bdc53ad10d50e0e41bccf57bab212d406b7a2ce`.
- Round-8 review record commit (adds [review-07.md](review-07.md); ledger → CHANGES_REQUESTED):
  `5dda5a7fce11b09f98118085ea7f57d46c8e077c`.
- **Round-8 correction payload C8: `40feb095d8e0f964bce854facd90f51d23633380`.**
- **Round-8 reviewed candidate H8: `6290e68fb0231a6a8b4e6956d9a44afe7ac051ab`.**

Reviewed artifacts pinned by **blob** SHA at H8:

| Artifact | Blob SHA at H8 |
|---|---|
| [contract.md](contract.md) | `a18343820301f181740492a3ee65b44db317237f` |
| [protocol-worksheet.md](protocol-worksheet.md) (Revision 8) | `75e5c6378bd569c3bce14a5c38b5a3a1ae6da33a` |
| [review-07.md](review-07.md) | `851efc09d42d8d02e314cd815599efb204681033` |
| [implementation-08.md](implementation-08.md) | `0cd56a0608157199572e53354635ee615acafa3d` |

- Reviewer identity: **GPT-5.6 Sol, High reasoning.**
- Reviewer access: **independent pinned GitHub source inspection; no executable local checkout and no
  shell rerun of any command.**
- Reviewer session identifier: **not supplied.** None is recorded here; this record does not invent one.
- Review date: **September 11, 2026** (America/New_York).
- Transcription path: delivered to the coding-agent session as an owner (Rex-Shih) message and
  recorded here verbatim in substance, per [006](../../006-development-process.md)'s
  owner-transcription path.

## Inspected versus rerun

- **Inspected, not rerun: the round-8 validation commands.** Their raw output as reproduced in
  [implementation-08.md](implementation-08.md) was read and accepted as pinned evidence; no command was
  re-executed and no digest recomputed. Round-8 validation-evidence availability is verdicted PASS.
- **Inspected:** the pinned tree at H8 by the blob identities above; `protocol-worksheet.md`
  Revision 8 in full, with particular attention to §3 (B-1/B-2/`B-6`/`B-7`), §4, §5
  (W-1/W-2/W-3/W-7/W-8/W-9), §11 row 5, §12 (`MIG-5`/`REF-5`) and §13; `contract.md` at H8; and
  [implementation-08.md](implementation-08.md)'s findings disposition and *Reviewer focus* section.

## Criterion verdicts

| Criterion | Verdict |
|---|---|
| K0.1-C1 — every 001 K0 boundary has one owner and an observable assertion | **PASS** |
| K0.1-C2 — dedicated sections with decisions, not open questions restated | **FAIL** (K01-R8-02, K01-R8-04) |
| K0.1-C3 — every named legacy record classified migratable / legacy-only / refused, split where needed | **PASS** |
| K0.1-C4 — no new mandatory Kernel concept; transport/storage stays implementation-owned | **PASS** |
| K0.1-C5 — contradictions called out explicitly and resolved in the Kernel's favour | **FAIL** (K01-R8-01) |
| K0.1-C6 — versioned and self-contained for a K1.1 implementer | **FAIL** (all four findings) |
| [007](../../007-work-packets.md) K0.1 packet acceptance | **FAIL** |
| Round-8 validation-evidence availability | **PASS** |
| Candidate C/H process identity (006's commit-identity convention) | **PASS** |
| K0.2/E0 and later executable proof | **DEFERRED** — explicitly outside this packet and assigned to K0.2 and later |

## Findings

### K01-R8-01 — B-2 still carries the superseded eligibility rule (P1)

B-2 still contains the old two-independent-sufficient-conditions eligibility rule and therefore still
permits the application-input dependency-alternative bypass that W-1 was corrected to forbid.

### K01-R8-02 — the timeout observation has no coherent semantic home (P1)

B-1 says Activation batches are Event references; B-7 says the timeout is mandatory in that batch; W-9
leaves open whether the timeout is an Event, a separate Activation field, or something else.

### K01-R8-03 — current eligibility made conditional on a future K1.3 choice (P2)

W-1 says non-application Events use dependency alternatives, then immediately leaves open whether K1.3
may allow subscriptions for non-input peer classes. That makes the supposedly exact current K0/K1
eligibility rule conditional on a future choice.

### K01-R8-04 — already-expired deadline at wait registration left undecided (P2)

The worksheet/report deliberately leaves "wait registered with an already-expired deadline" undecided,
despite K0.1-C2/C6 requiring concrete self-contained clock semantics.

## Outcome

CHANGES REQUIRED

Disposition of all four findings is recorded in [implementation-09.md](implementation-09.md).
