# Merged independent review reconciliation — K1.2 round 8

## Identity

- Date: 2026-09-25.
- Governing base B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
- Payload C8: `61059a3e43d7057de9be29f101a65ebed9416ae2`.
- Reviewed report-bearing H8: `ad4a0e8b4bcfa5e3064a53024fe49ae3d63f38c7`.
- Branch: `claude/k1.2-outcome-acceptance-receipts`.
- Contract: K1.2 revision 7.
- Owner-supplied supplemental reviewer: Arena.ai Agent Mode, model identity not exposed by the
  platform. That session reports a full local clone, GitHub fetch/deepening, Linux x86_64,
  Node v22.22.3/npm 10.9.8, inspection of the complete review line and independent reruns on H8.
- Reconciliation reviewer: ChatGPT GPT-5.6 Sol. This session rechecked exact H8, the H8-only 007
  delta, `scripts/check-builder-docs.ts`, the validation-08 directory contents and the candidate
  identities through the GitHub repository connector. It did not independently rerun the full suite.
- This is an administrative review/status reconciliation. It does not change H8 and does not accept
  its own containing commit.

## Reconciliation with the earlier review

The earlier ChatGPT review concluded ACCEPT for exact H8 after verifying the C8/H8 identity,
the H8 administrative allowlist, the carried-forward architecture/evidence corrections and the
committed C8 validation.

That conclusion missed one candidate-specific check: validation-08's builder-doc result was run on
C8, while H8 itself changes the top-level K1.2 row in `docs/development/007-work-packets.md`.
Because the documentation gate scans that file, its result must be checked on the exact H8 tree as
well. The owner-supplied Arena review did so and found a reproducible failure.

The Arena finding is valid and supersedes the earlier ACCEPT conclusion for H8.

## What remains valid

The substantive K1.2 corrections remain sound:

- K12-R6-EVID-01 is closed: saved-reference submission-lifetime tests distinguish per-attempt
  submission authority from per-delivery reporting authority; B10 and B11 reject the corresponding
  grant-rotation mutations.
- K12-R6-LAYER3-01 is closed: the owner authorized the narrow third-argument carrier extension;
  `execution-cycle.md#submission-authority` is the single canonical owner; ordinary redelivery,
  takeover and next-exchange lifetimes are explicit; replay/currency/authority/content ordering is
  coherent; `SubmissionGrant` remains an in-process representation rather than a universal token.
- K12-R7-PROC-01 is closed by the fresh C8/H8 packaging.
- K12-R6-DOC-01 is repaired by C8's concise development-front-door update.
- C8's small `OPEN(K3.2)` correction agrees with the K3.2 roadmap ownership.
- No new runtime, authority-lifetime, replay-order, takeover, receipt, nondisclosure or structural
  defect was established by the Arena review or this reconciliation.

The Arena reviewer independently reran the kernel suite and packet ablations on H8: kernel 450/450;
27/27 mutations rejected, with B10 at 448/450 and B11 at 449/450 failing exactly the intended
saved-reference schedules. Its seven additional public-API probes also passed.

The Arena review observed two cancelled conformance tests under Node 22.22.3. The relevant
`fast-slow-equivalence.test.ts` file is unchanged from B through H8, and the reviewer reproduced the
same cancellation at B. The implementer's Node 25.2.1 evidence passes those tests. Treat this as a
non-blocking environment/version observation, not a K1.2 regression.

## Finding

### K12-R8-DOC-01 — P2 — exact H8 fails the repository documentation gate

**Criterion:** C15; 006/008 exact-candidate evidence and reference maintenance.

**Location introduced by H8:** the K1.2 status row in
`docs/development/007-work-packets.md`.

H8 adds this link:

`[validation-08](work/K1.2/validation-08/)`

The repository's `scripts/check-builder-docs.ts` scans every top-level
`docs/development/*.md`. For a Markdown target that resolves to a directory, it then checks that
directory's `README.md`. The directory
`docs/development/work/K1.2/validation-08/` contains ten `.txt` evidence files and no
`README.md`.

Therefore exact H8 fails with:

`docs/development/007-work-packets.md: missing target: work/K1.2/validation-08/`

This explains the apparent contradiction with implementation-08's recorded builder-doc result:
validation-08/07 correctly records exit 0 on exact C8, before H8 introduced the broken directory
link. The result is true for C8 but not for the report-bearing candidate H8.

The defect is narrow and administrative, but it blocks acceptance because the contract's required
documentation gate does not pass on the exact candidate.

### Required outcome

- Repair the live K1.2 row so it does not contain a target rejected by the repository's own
  documentation checker. The exact wording/link form is the implementer's choice; do not add a
  `validation-08/README.md` merely to preserve a gratuitous directory link unless that index has an
  independent documentation purpose.
- Re-run the required command plan against the exact candidate tree used for the next review,
  including `npm run check:builder-docs`.
- Ensure the next implementation report distinguishes evidence run on its payload C from any gate
  that can be changed by the H administrative delta. If H changes a scanned documentation file,
  verify the affected documentation gate on H before handoff.
- Package a new report-bearing candidate under 006/008. Do not self-accept, integrate or release
  K1.3.
- Re-review the cumulative B..new-H packet; no architecture rewrite is requested.

## Per-criterion reconciliation

- C1–C14: PASS. No new defect established; current runtime/test evidence and the Arena reruns support
  the existing closures.
- C15: FAIL solely because of K12-R8-DOC-01 on exact H8.

No criterion is deferred.

## Non-blocking observations

- The 007 introductory prose describing only the first few K1.2 correction rounds is stale after
  eight rounds. This is administrative P3 cleanup and need not expand the correction.
- The existing `fail` wording tension between conceptual prose and BASELINE's typed failed result
  remains a future documentation item; no behavioral defect is established.
- Prior P3 observations concerning protocol-only holds and takeover availability retain their
  recorded dispositions.

## Compact correction handoff

```text
Correct the same released packet K1.2 on claude/k1.2-outcome-acceptance-receipts.
Base a20d278185eaffc7f8b7489345a3624231ff6e6d; reviewed H
ad4a0e8b4bcfa5e3064a53024fe49ae3d63f38c7; payload C8
61059a3e43d7057de9be29f101a65ebed9416ae2; review record
docs/development/work/K1.2/review-08-merged.md.

Open finding: K12-R8-DOC-01 (P2, C15). H8's K1.2 row links
work/K1.2/validation-08/ as a directory. scripts/check-builder-docs.ts resolves directory targets
to <dir>/README.md; that directory has no README, so exact H8 fails the required documentation
gate. Repair the live row without weakening the gate, verify the affected gate on the exact final
candidate, and package a fresh report-bearing H under 006/008. Keep the existing architecture,
runtime, tests and ablations unchanged unless a new concrete defect is established. Re-review the
whole cumulative packet. No successor release.
```

## Verdict

The owner-supplied Arena review is valid. Its H8-only documentation-gate finding corrects the
earlier review's missed exact-candidate check. H8 is not acceptable as submitted.

CHANGES REQUIRED
