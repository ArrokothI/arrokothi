# K1.2 invalidation notice 01 — accepted H14 held

Owner-instructed administrative record, 2026-09-26 UTC, written by the reviewer session of
[review-14](review-14.md) (Claude Code, `claude-opus-5-5`) at the owner's explicit instruction. It is
not a review, an implementation or an acceptance.

## What is invalidated

- Candidate: H14 `c36cbe04f7c97f198794bfede972d4861247cca0` (payload C12
  `2f4e64b1f51c679e2b381f9fb9800f2e290ddd30`, base `a20d278185eaffc7f8b7489345a3624231ff6e6d`,
  contract revision 9).
- Historical acceptance: [review-13](review-13.md) ACCEPT, recorded in administrative commit
  `c0e2b01ffa36e4e6be20ed35958f8568008995b8`. That record stays unchanged; it remains the historical
  verdict for its exact revision.
- Later evidence: [review-14](review-14.md) (owner-requested second independent review of the same
  H14) — CHANGES REQUIRED with reproducible counterexamples: K12-R14-ID-01 (P2; the Kernel refuses
  its own minted Activation ID once it exceeds the 65,536-scalar text limit, leaving the Execution
  unanswerable and unrecoverable) and K12-R14-EVID-01 (P2; the text-malformed Activation identity
  class is unpinned). C3, C8, C9 and C10 fail on that evidence.

## Consequences under 006

- Integration of H14 is **on hold**; no merge of this branch as accepted K1.2 work.
- No claim that depends on K1.2 acceptance may be released; K1.3 stays unreleased.
- Corrective packet **K1.2-correction-01** is created in [007](../../007-work-packets.md) and released
  by the owner's instruction of 2026-09-26 to address K12-R14-ID-01 and K12-R14-EVID-01. It needs a
  fresh C/H, validation and an independent cumulative review against base
  `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
- The P3 observations in review-14 (O1–O3) and the carried P3 notes may be addressed in the same
  correction; they do not block by themselves.
