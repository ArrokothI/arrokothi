# Implementation report — TOOLS-02, round 6 (correction of review 05: T2-R5-CLAIM-01)

## Identity

- **Packet:** TOOLS-02, scope B, ranges 2–4. [Brief 01](brief-01.md) is the contract, with owner choices 01–14. This
  round follows correction brief 05 (`review-05/brief-05.md` on `claude/tools-02-review-05`, `e20a0904`). The
  governing process baseline is [006](../../006-development-process.md) at B.
- **State:** WAITING_FOR_REVIEW, for review 05's bounded delta review.
  - Owner release: [release 01](release-01.md).
  - Previous review: review 05 (`review-05.md` on `claude/tools-02-review-05`), a separate Claude Opus session.
    Its verdict is `3e478016`: CHANGES REQUIRED of H `19c1f43f2989acc1a501c96ca0f0f08dbba339b9`, with
    T2-R5-CLAIM-01 (P2).
  - Owner answers recorded there:
    - "Bounded delta review": the review covers only C..C2 and T2-R5-CLAIM-01.
    - "Refined claim": 006's refined finishable claim.
  - The P3 observations (T2-R5-WITNESS-01, -TRIAGE-01 and -RELEVANCE-01) are outside this round.
  - This branch does not merge the review branch.
- **Implementer:** Claude Code desktop session (`claude-opus-5-5`), owner choice 12.
- **Branch:** `codex/tools-02` on `origin`.
  - B `335ae7e6b6ddf7fa3c32a8605559268ed8a4e39b`.
  - Reviewed C `302fee9de7dc857ce58cf1e86d7fbb223af7c5fb`, H `19c1f43f2989acc1a501c96ca0f0f08dbba339b9`.
  - Payload C2 `272489a0c3a6e853d17f3ba89f719a627f859847`, a child of H.
- **Candidate H2:** the commit containing this report, a direct child of C2.
- **C2..H2 administrative allowlist** (as in [verification.json](verification.json)):
  - `docs/development/007-work-packets.md`, the TOOLS-02 row only;
  - this report;
  - `progress.md`.
- **Working tree:** clean. The push is verified in the external handoff.

## Changes and coverage

**H..C2 changes three files:**
- `docs/development/002-implemented-kernel-baseline.md`: the register sentence at lines 190–192.
- `docs/development/017-known-limitations.md`: L-17's Scope cell.
- [verification.json](verification.json): only `administrative_files`, which now names the H2 records.

The new text, in both passages:
- It names the register's unread entries as the `unread:*` rows of the corpus report's
  `register.by_classification`.
- It gives the figure with the revision it was measured at: 1,174 at `302fee9de7dc857ce58cf1e86d7fbb223af7c5fb`.
  L-17 also gives the per-claim split: 1,100 V-ENV, 41 Proxy, 21 V-D1 and 12 re-prototyped built-in.
- The hand-copied "983" is gone.

**T2-R5-BOUND.** `git diff --name-only C H2` lists exactly:

```text
docs/development/002-implemented-kernel-baseline.md
docs/development/007-work-packets.md
docs/development/017-known-limitations.md
docs/development/work/TOOLS-02/implementation-05.md
docs/development/work/TOOLS-02/implementation-06.md
docs/development/work/TOOLS-02/progress.md
docs/development/work/TOOLS-02/self-audit-05.json
docs/development/work/TOOLS-02/verification.json
```

- `implementation-05.md` and `self-audit-05.json` are H's administrative records, unchanged since H.
- 007 changes only in its TOOLS-02 row.
- Every other path under `tests/`, `scripts/`, `packages/`, `docs/` and `mental-model/` is byte-identical to C.
- No corpus item is added: the defect is in prose, and the owner chose no check (brief 05).

**Mechanism.** A figure derived from the corpus was copied by hand into current prose, and nothing revisited it
after range 4's recompute. Both passages now take one of brief 05's two finishable forms:
- a reference to the report, which has nothing to drift;
- a figure pinned to its revision, which stays true at that revision.

Rather than choose one, each passage carries both.

**Brief questions.**
1. *Form.* Both passages cite the report's `unread:*` rows and add the figure pinned to C. The pinned figure keeps
   L-17's Scope cell readable: about 1,174 entries carry no credit, mostly V-ENV. Pinning to C rather than C2 is
   exact, because the corpus fixtures are byte-identical from C to C2. A record cannot name the revision that
   contains it.
2. *Other figures.* The current-claim documents were searched for corpus-derived counts: 002, 014, 017, `mental-model/`,
   `docs/guides/`, `tests/tooling/README.md`, the package READMEs, `README.md` and `AGENTS.md`. TOOLS-02 changed 002,
   007, 017 and `tests/tooling/README.md` from B to H, and among their added lines only the 983 derives from the
   corpus. 014's "1,549 origins" and "23 of 1,272 members preserved", and the README's "1,549", are earlier
   inventory figures. They are still true at C2: inventory reports 1,549 origins, and `regenerate` reports 1,272
   members with 23 preserved. TOOLS-02 did not add them. 007 entries are dated, and progress.md's 983 sits inside
   its dated 2026-10-28 entry. No second instance falls within this round.

**Prior findings.** T2-R5-CLAIM-01 is fixed, as described above. The P3s stay open for the owner's routing (brief
05). Review 05's other results stand for H2 under the bounded delta review.

## Validation and interpretation

**Packet verify CI run [41358816946](https://github.com/ArrokothI/arrokothi/actions/runs/41358816946)** at C2, with
spec `docs/development/work/TOOLS-02/verification.json`:
- job `verify` succeeded, 2026-11-01T22:46Z to 2026-11-02T01:03Z;
- the run log's inputs and checkout show revision C2;
- it ran from `main`'s workflow file, byte-identical to the one at C2;
- artifact `packet-verify-272489a0c3a6e853d17f3ba89f719a627f859847`, id 13109200965, 2,540,558 bytes, digest
  `sha256:831b5b7bc418a1a31216d3c14ac8b190267821c25d2f0af60e595b15d867a637`, as the GitHub API reports. The
  implementer did not download it.

**Fresh clone at C2** (`git clone --no-local`, `npm ci`, nothing untracked; Mac arm64, Node v26.10.0):
- `corpus`: `mappings_complete` in 371 s. `register.by_classification` gives 1,174 unread entries (1,100 V-ENV,
  41 Proxy, 21 V-D1, 12 re-prototyped built-in), 11 `not_held` and 1 `superseded`, out of 1,186. These are the
  counts brief 05 records at H, so its stop condition did not fire.
- `check:builder-docs`: passed, with 74 Markdown files and 2,223 local links and anchors.

**Checks not run:**
- The local full composed verify at C2 was not rerun; CI ran it at C2.
- The external live-provider and large-memory profiles stay not run.

**Criteria (implementer assessment, not acceptance):**
- **T2-R5-CLAIM-01:** both passages cite `register.by_classification`. Their figure equals the report at the
  revision they name.
- **T2-R5-BOUND:** the name list above.
- **T2-R5-VERIFY:** the CI run above.

**Strongest remaining risk:** other packets' records hold hand-copied corpus figures. That is the redesign route
the owner did not choose.

**Third-party:** none.

## Handoff

Ready for review 05's bounded delta review of H2 over C2, citing CI `41358816946`. The pushed H2 SHA is supplied
externally. No self-acceptance; no hold is lifted and no successor is released.
