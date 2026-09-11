# Independent review — K0.1, round 3

## Identity and access

- Packet: **K0.1** — Protocol decisions and legacy disposition.
- Reviewed base (unchanged across all rounds): `6464be12c11eb75f7dfbc5ece12ca8d3020a5c15`.
- Round-1 reviewed candidate H: `857fa05a8a72a4c6f4f294f9e775a0dc1f7919dc`.
- Round-2 correction payload C2: `fc84664a873d6a4cfaf1d86d57fb9bcba34a6f04`.
- Round-2 reviewed candidate H2: `cc61e74455534abf896c46632246615185219b92`.
- Round-2 review record commit: `ca065990835795fffdcb1eca5601572c24791a60`.
- **Round-3 correction payload C3: `2b252b05eaf7020fec1e2b4a342d5fea86bad66e`.**
- **Round-3 reviewed candidate H3: `aef1e33ba944a0647bb2319fb97ae40b18b05924`.**
- Contract reviewed: [contract.md](contract.md) as carried by H3, together with
  [protocol-worksheet.md](protocol-worksheet.md) **Revision 3** and the round-3 report
  [implementation-03.md](implementation-03.md).
- Evidence reviewed: the committed directory [`evidence/round-3/`](evidence/round-3/) at H3 (nine
  files; their SHA-256 digests are tabulated in [implementation-03.md](implementation-03.md)).
- Reviewer identity: **GPT-5.6 Sol, High reasoning.**
- Reviewer access: **independent GitHub pinned-source inspection; no executable local checkout and
  no shell rerun of any command.** This is the same posture recorded for round 2 and, per
  [006](../../006-development-process.md), an acceptable review posture where adequate immutable
  evidence is inspectable — which round 3's in-repository evidence directory is.
- Reviewer session identifier: **not supplied.** None is recorded here; this record does not invent one.
- Review date: delivered **September 10, 2026** (America/New_York); transcribed into this record on
  September 11, 2026 (America/New_York).
- Transcription path: delivered to the coding-agent session as an owner (Rex-Shih) message and
  recorded here verbatim in substance, per 006's owner-transcription path.

## Inspected versus rerun

- **Inspected:** the pinned tree at H3; the cumulative diff `6464be1..aef1e33` and the round-3
  correction delta `cc61e74..2b252b0`; the C3→H3 delta; `protocol-worksheet.md` Revision 3 in full
  (§1 E-1/E-3/E-6/E-7, §5 W-1/W-7, §11, §12, §13, revision history); `contract.md`'s corrected
  K0.1-C2/C3/C4 and non-goals; [review-01.md](review-01.md) and [review-02.md](review-02.md) as
  historical records; and the committed round-3 evidence logs.
- **Rerun:** none. No command was re-executed and no digest was recomputed by the reviewer. Round-3
  validation-evidence *availability* is nevertheless verdicted PASS below, because the logs are
  ordinary tracked repository content retrievable through exactly the access this review used.

## Criterion verdicts (as delivered)

| Criterion | Verdict |
|---|---|
| K0.1-C1 — every 001 K0 boundary has one owner and an observable assertion | **PASS** |
| K0.1-C2 — dedicated sections with decisions; limits with units and a computable canonical encoding | **PASS** |
| K0.1-C3 — every named legacy record classified migratable / legacy-only / refused, split where needed | **FAIL** (K01-R3-02) |
| K0.1-C4 — no new mandatory Kernel concept; transport/storage stays implementation-owned | **PASS** |
| K0.1-C5 — contradictions called out explicitly and resolved in the Kernel's favour | **FAIL** (K01-R3-01) |
| K0.1-C6 — versioned and self-contained for a K1.1 implementer | **FAIL** (K01-R3-01) |
| [007](../../007-work-packets.md) K0.1 packet acceptance | **FAIL** |
| Round-3 validation-evidence availability | **PASS** |
| Candidate C/H process identity (006's commit-identity convention) | **FAIL** (K01-R3-03) |
| K0.2/E0 and later executable proof | **DEFERRED** — explicitly outside this packet and assigned to K0.2 and later |

## Provenance corrections to round 2 (finding K01-R3-04)

[review-02.md](review-02.md) is **preserved byte-for-byte** as the historical transcription of the
round-2 review. Two of its statements are **superseded by this record**:

1. review-02.md states: *"Severity labels were not supplied for the round-2 findings and are not
   inferred here."* **Superseded.** The round-2 findings did carry severity labels:

   | Round-2 finding | Severity as actually assigned |
   |---|---|
   | K01-R2-01 — complete the canonical value encoding | **P1** |
   | K01-R2-02 — valid legacy disposition for `PendingOperation` | **P1** |
   | K01-R2-03 — Event-wait migration and target wait shape | **P1** |
   | K01-R2-04 — correct the reference-store claims | **P2** |
   | K01-R2-05 — preserve/correct review provenance | **P2** |
   | K01-R2-06 — reviewer-accessible validation evidence | **P2 / evidence gap** |

2. review-02.md states: *"Three of round 1's five severities were understated by the coding agent's
   inferred transcription (K01-REV-03 and K01-REV-04 were P1, not P2)."* **Superseded.** Exactly
   **two** round-1 severities were understated in [review-01.md](review-01.md) — **K01-REV-03** and
   **K01-REV-04**. The pair review-02.md named is correct; its count of three is not. The corrected
   round-1 severity set recorded in review-02.md's provenance table (K01-REV-01 P1, K01-REV-02 P1,
   K01-REV-03 P1, K01-REV-04 P1, K01-REV-05 P2) otherwise stands unchanged.

The round-2 criterion dispositions **as actually delivered** are also preserved here, because
review-02.md recorded no criterion table at all:

| Criterion | Round-2 verdict |
|---|---|
| K0.1-C1 | **PASS** |
| K0.1-C2 | **FAIL** |
| K0.1-C3 | **FAIL** |
| K0.1-C4 | **PASS** |
| K0.1-C5 | **FAIL** |
| K0.1-C6 | **FAIL** |
| 007 K0.1 packet acceptance | **FAIL** |
| K0.2/E0 and later executable evidence | **DEFERRED** |

The round-2 review date is **September 10, 2026** (America/New_York). No reviewer session identifier
was supplied for round 1, round 2 or round 3, and none is invented for any of them. `review-01.md`
and `review-02.md` are not edited: superseding metadata belongs in this later record, not in a
rewrite of an earlier one.

## Findings

Severities are as assigned by the round-3 review. All four are blocking for this round.

### K01-R3-01 — make E-7's canonical encoding and its standards guidance agree (P1)

`protocol-worksheet.md` §1 **E-7** defines object member ordering by **Unicode code point** (rule 4,
with UTF-8 byte order recommended as the order-isomorphic implementation), and then states under
*Relationship to published profiles* that *"Rules 4, 6 and 7 coincide with the JSON Canonicalization
Scheme (RFC 8785)."* That is false for rule 4: RFC 8785 sorts object-property strings by **unsigned
UTF-16 code units** and explicitly notes that UTF-8/UTF-32 ordering differs. As written, the
worksheet's normative rule and its own implementation guidance point at two different byte sequences,
so two implementations each following the document faithfully can disagree on identity and size —
which is precisely the failure E-7 was added in round 2 to eliminate.

Choose exactly **one** consistent protocol profile:

- **Preferred, minimal-standard route.** Align rule 4 with RFC 8785/JCS UTF-16-code-unit ordering,
  update the supplementary-plane test vector and the byte-order explanation accordingly, and then
  accurately state that the canonical form follows RFC 8785/JCS for property ordering and primitive
  serialization. Preserve E-7's internal-only nature: the transport wire codec remains replaceable.
- **Acceptable alternative.** Retain Unicode-code-point ordering, but explicitly state that ArrokothI
  deliberately diverges from RFC 8785 property sorting, remove every claim that rule 4 coincides with
  JCS, state that an unmodified RFC-8785/JCS canonicalizer is **not** conforming to ArrokothI's
  canonical form, and update the third-party-library guidance accordingly.

Whichever route is selected: ensure that one implementation following the normative rules and another
following every implementation recommendation necessarily produce the same bytes; keep number
serialization pinned to a stable exact algorithm or reference rather than merely to empirical Node
behaviour; and recheck all canonical byte-count examples.

### K01-R3-02 — make §12 obey K0.1-C3's exact disposition vocabulary (P1)

[contract.md](contract.md)'s K0.1-C3 permits only **`migratable`**, **`legacy-only`** or **`refused`**,
with splitting when different parts of one record need different dispositions. Revision 3's §12
introduces `Partially migratable` (row `MIG-5`) and `limitation` (row `LIM-1`), and its header note
advertises a five-label vocabulary. Neither extra label is permitted.

- Remove **`Partially migratable`** as an actual classification. Split the current `MIG-5` into
  separate classifications: the reusable declarative Event matching primitive / envelope
  identity-kind-correlation material receives an allowed disposition such as **Migratable**; adoption
  of the existing single-`wake` `ExecutionWait.event` record as the new K1 target wait record receives
  its own allowed disposition, normally **Refused unchanged as the target record shape** (or
  Legacy-only, only if that exact term can be justified consistently).
- Keep W-1/W-7's target semantics. That substantive correction is good and is not reopened.
- **`LIM-1` is not a migration disposition.** Preserve its useful reference-store analysis, but move
  it outside the `migratable / legacy-only / refused` classification table into a clearly separate
  "reference implementation limitations" subsection or another appropriate section. Do **not** expand
  K0.1-C3's vocabulary to accommodate the row.

After the edit, every row that claims to classify legacy data must use exactly one of the three
allowed dispositions, with split rows where necessary.

### K01-R3-03 — restore the C/H commit-identity convention without rewriting H3 (P2)

[006](../../006-development-process.md)'s commit-identity convention requires final validation to run
on a clean payload tree C, with the candidate H adding only declared administrative material. H3 adds
the round-3 evidence directory *after* C3 validation, so H3's own tree was never the validated tree.
H3 is historical and **must remain untouched**.

- First record this review faithfully as `docs/development/work/K0.1/review-03.md` and set the
  [007](../../007-work-packets.md) ledger to `CHANGES_REQUESTED` in a **separate administrative
  review-record commit on top of H3**.
- Then create a new payload **C4** containing the bounded K0.1 contract/worksheet corrections. The
  existing round-3 evidence directory may remain in the tree as historical evidence; do not delete or
  rewrite it merely to clean history.
- Run all final validation against the **clean C4 tree**, after C4 exists.
- For round-4 evidence, do **not** add new evidence files or scripts to the repository after C4
  validation. The new **H4** must contain only `docs/development/work/K0.1/implementation-04.md` and
  the exact `docs/development/007-work-packets.md` status-row edit. Because the required command
  outputs are small, the simplest compliant evidence path is to reproduce each complete raw output
  verbatim inside `implementation-04.md`, together with exact command, cwd, C4 SHA,
  environment/tool versions, UTC timestamp, exit code/counts and SHA-256 where useful. An external
  immutable pinned artifact with digest and retention owner is an acceptable alternative. A
  session-local file path is not sufficient. Verify with `git diff --stat C4 H4` that only
  `implementation-04.md` and the ledger changed.
- Applicable validation remains documentation-focused: cumulative `git diff --check`, the K0.1
  link/anchor audit, `npm run check:builder-docs`, and `npm run typecheck` if claimed. `npm test`
  remains unnecessary if no executable or test files change.

### K01-R3-04 — correct historical review metadata in review-03 without rewriting review-02 (P2)

Preserve [review-02.md](review-02.md) byte-for-byte. In `review-03.md`, explicitly record that its
two statements about round-2 severity labels and about the number of understated round-1 severities
are superseded; preserve the round-2 criterion dispositions that were actually delivered; record the
round-2 review date as September 10, 2026 (America/New_York) unless the owner supplies a more precise
timestamp from the chat record; and do not invent a session identifier. The new `review-03.md` must
itself satisfy [008](../../008-implementation-report.md): reviewer identity/model, review date,
base/C3/H3/contract/evidence identities, access limits, inspected-versus-rerun checks, criterion
verdicts, severity findings with precise references, and one final outcome.

*(This record's own compliance with that requirement is the sections above: identity/access,
inspected-versus-rerun, the delivered criterion verdicts, the provenance corrections, these four
severity-labelled findings, and the single outcome below.)*

## Scope preserved

Unchanged non-goals: no `packages/` runtime implementation; no K0.2 fixture or E0 execution; no K1/K2
implementation; no database, scheduler, substrate, native-recovery or isolation work; no new
third-party dependency; no successor packet; no self-acceptance. Do not weaken K0 or K0.1 criteria to
make the correction pass. Corrections on a released packet need no renewed owner release; K0.2 and
all later packets remain unreleased.

## Outcome

CHANGES REQUIRED

Disposition of every finding is recorded in [implementation-04.md](implementation-04.md).
