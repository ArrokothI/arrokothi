# Independent review 06 — TOOLS-02 ranges 2–4, bounded delta review

**Verdict: ACCEPT**, bound to exact H2 `0c2573eb61b399508df49d9dad16c732d7e1fd3b`.

The owner chose a bounded delta review for the correction of [review 05](review-05.md), and this is that review. It
covers H..H2 and T2-R5-CLAIM-01 under [correction brief 05](review-05/brief-05.md). All three of the brief's criteria
pass, and T2-R5-CLAIM-01 is closed. Outside the delta, H2's tree is byte-identical to H, so review 05's cumulative
results for B..H stand for H2. Review 05's P3 observations stay open and do not block.

## Identity and scope

- **Reviewer:** the Claude Code desktop session (`claude-opus-5-5`) that wrote review 05, on 2026-11-02, under
  [owner choice 12](owner-choice-12.md). This session implemented none of the work. Implementation 06 is by the
  implementing Claude Opus session. The two sessions are the same model, so their assumptions may be correlated.
  Every check below is mechanical: file lists, the CI artifact and corpus counts.
- **Candidate:**
  - H2 `0c2573eb61b399508df49d9dad16c732d7e1fd3b`, a direct child of C2. It is `origin/codex/tools-02`.
  - C2 `272489a0c3a6e853d17f3ba89f719a627f859847`, a child of review 05's H
    `19c1f43f2989acc1a501c96ca0f0f08dbba339b9`.
  - Reviewed C `302fee9de7dc857ce58cf1e86d7fbb223af7c5fb`. B `335ae7e6b6ddf7fa3c32a8605559268ed8a4e39b`.
- **Contract:**
  - [brief 05](review-05/brief-05.md);
  - [brief 01](brief-01.md) (scope B), with owner choices 01–14;
  - the owner's two answers recorded in review 05: "Bounded delta review" and "Refined claim".
- **Process:** 006, 008 and 012 at B.
- **Scope, by the owner's answer:** the H..H2 delta and T2-R5-CLAIM-01 only.
  - 006 asks for a cumulative base-to-candidate review in every round, and for one accountable full cumulative
    review before acceptance.
  - Here that full review is review 05 of B..H, by the same reviewer. T2-R5-BOUND below shows that H2 differs from
    H only in the delta.
  - The owner authorized this combination, in review 05's "Owner answer" section.
- **Read:** [implementation 06](implementation-06.md); the H..H2 diff; the new [progress](progress.md) entry; the
  TOOLS-02 row of 007; [verification.json](verification.json) at C and at C2.
- **Ownership:** repository evidence tooling and current-claim documentation. No product source changes.

## Brief 05's criteria

| ID | Result | Evidence |
|---|---|---|
| T2-R5-CLAIM-01 | **PASS** | Both passages give the reference and a pinned figure. The figure equals the corpus report at its revision |
| T2-R5-BOUND | **PASS** | `git diff --name-only C H2` lists only allowed paths. `verification.json` changes only `administrative_files` |
| T2-R5-VERIFY | **PASS** | Run 41358816946 at C2 passed 19 of 19 checks. I downloaded the artifact, and its digest matches GitHub's |

### T2-R5-CLAIM-01

- **002** (lines 190–192 at C2) now says: "Its unread entries are the `unread:*` rows of the corpus report's
  `register.by_classification` (017 L-17); at `302fee9d…` they were 1,174."
- **017 L-17**'s Scope cell now gives the same reference, followed by "at `302fee9d…`, 1,174 (1,100 V-ENV,
  41 Proxy, 21 V-D1, 12 re-prototyped built-in)".
- **Both passages are in finishable form.** The reference names the report's rows and copies no current figure.
  The figure names the revision it was measured at.
- **The figure equals the report at that revision.** Run 41286444190's artifact at C, in its `adoption` check,
  reports `unread:V-ENV` 1100, `unread:Proxy` 41, `unread:V-D1` 21 and `unread:re-prototyped-built-in` 12, which
  totals 1,174. The keys begin with `unread:`, as the text says. Run 41358816946 at C2 reports the identical
  register, including `not_held:V-ENV` 11 and `superseded:Proxy` 1. So the pinned figure is also current at C2.
- **The stale figure is gone.** Both passages have dropped 983. It now appears only in progress.md:701, inside the
  dated 2026-10-28 entry, which is historical.
- **Brief question 2, other figures:** review 05 found the 983 to be the only corpus-derived figure that TOOLS-02
  added to 002, 007 or 017. Implementation 06 searched further. I also checked `tests/tooling/README.md`, which
  TOOLS-02 changed from B to H: the lines it added hold design parameters (seed 20261026, size 50), not corpus
  counts. I did not recheck the 1,549 figures in 014 and README.md. TOOLS-02 did not change those files, so they
  are outside this finding.

### T2-R5-BOUND

- `git diff --name-only C H2` lists eight paths:
  - 002, 007 and 017;
  - in `docs/development/work/TOOLS-02/`: `implementation-05.md`, `implementation-06.md`, `progress.md`,
    `self-audit-05.json` and `verification.json`.
- **H..C2** changes 002, 017 and `verification.json`. **C2..H2** changes 007, `implementation-06.md` and
  `progress.md`, which is exactly C2's `administrative_files`.
- `implementation-05.md` and `self-audit-05.json` are H's administrative records, which review 05 read. They are
  byte-identical from H to H2.
- **`verification.json`** changes from C to C2 only in `administrative_files`. `base`, `require_direct_parent`,
  `preserve` and every check are unchanged.
- **007** changes only in the TOOLS-02 row. Every other line is byte-identical from C to H2. The row changes its
  status to WAITING_FOR_REVIEW and adds dated entries, one of which quotes review 05's outcome line verbatim.
- **`progress.md`** gains lines and loses none.
- **Nothing else changes:** no path under `tests/`, `scripts/`, `packages/` or `mental-model/`, and nothing else
  under `docs/`. So the corpus fixtures, mutation registry, tests and tools are the ones review 05 reviewed at C.
  Review 05's audit population, `adoption.json` frozen at H, is also unchanged.

### T2-R5-VERIFY

- **The run:** Packet verify run [41358816946](https://github.com/ArrokothI/arrokothi/actions/runs/41358816946), a
  `workflow_dispatch` using `main`'s workflow at `335ae7e6` (which is B). Its job `verify` (125004566098) succeeded,
  running from 2026-11-01T22:46:42Z to 2026-11-02T01:03:16Z.
- **What it ran on:** the artifact's `run.txt` records `revision=` and `head=` as C2, the spec as
  `docs/development/work/TOOLS-02/verification.json`, Node v26.10.0 and `exit=0`.
- **The artifact:** id 13109200965, 2,540,558 bytes. I downloaded it myself. Its SHA-256,
  `831b5b7bc418a1a31216d3c14ac8b190267821c25d2f0af60e595b15d867a637`, equals GitHub's digest. It is kept as
  [review-06/packet-verify-41358816946.zip](review-06/packet-verify-41358816946.zip).
- **Summary:** `summary.json` reports `checks_passed`, with all 19 checks passing. Check by check, it is identical
  to run 41286444190 at C: 777 tool tests, `mappings_complete`, 4,766 repository tests, and the same mutant,
  census, sweep and docs results.
- **`verify.json` against the run at C:** every difference is accounted for.
  - The revision fields change from C to C2.
  - Three mutant kill names differ, but only in run-local values: a temp directory name, a lambda address and a
    scratch-repository commit SHA. The killing tests are the same.
  - The advisory area gate's `changed_paths` goes from 123 to 124. The gate unites the B..rev diff with
    `administrative_files`, and `implementation-06.md` is declared at C2 but does not exist until H2. The gate
    reports 0 ungated origins in both runs.
- **Not rerun locally:** the corpus at C2. CI's `adoption` check at C2 reports `mappings_complete` with the register
  above. Implementation 06 reports the same from a fresh clone, in 371 s.

## Packet criteria at H2

| Criterion | Result | Source |
|---|---|---|
| T2-3 (range 2) | PASS | Review 05, carried by T2-R5-BOUND |
| T2-4 (range 3) | PASS | Review 05, carried by T2-R5-BOUND; its docs claim is now true (T2-R5-CLAIM-01) |
| T2-5 (range 4), audit and relevance | PASS | Review 05: 0 unsafe in 150 (bound 3), and all 20 relevance samples relevant. The population is unchanged at H2 |
| Design 06 routes | Rule kept, at the strength review 05 states | Review 05 |
| Caps and scope of owner choices 07–14 | Held | Review 05. H..H2 adds no test group, adoption or runtime |

Range 1 (T2-1, T2-2) was accepted by [review 04](review-04.md) and has been integrated.

## Prior findings

- **T2-R5-CLAIM-01 (P2): closed** by C2, as shown above.
- **Still open, non-blocking:** T2-R5-WITNESS-01, T2-R5-TRIAGE-01 and T2-R5-RELEVANCE-01 (all P3), and review 05's
  unnumbered note on design 06 §5 (in its design 06 ruling). Brief 05 kept them out of this round, and their
  routing is the owner's. Review 05's header counts "four P3 observations": the three numbered findings and that
  note.

## New findings

None.

## Handoff

- This ACCEPT binds exact H2 `0c2573eb61b399508df49d9dad16c732d7e1fd3b` only. Review 05's results carry to H2 on
  the strength of T2-R5-BOUND.
- It is not integration, which belongs to the owner. It lifts no hold, and it releases no successor. 017 L-17
  stays a recorded limit.
- Evidence: [review-06/checks.json](review-06/checks.json) and the CI artifact beside it.
- No third-party material was copied or added.

ACCEPT — H `0c2573eb61b399508df49d9dad16c732d7e1fd3b` — TOOLS-02 ranges 2–4 (T2-3, T2-4, T2-5).
