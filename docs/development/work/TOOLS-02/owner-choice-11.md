# TOOLS-02 — owner choice 11: finish triage and measure one full pass

Recorded on 2026-10-30 by the implementing Codex GPT-6 session, from the owner's
approval of the drafted words in this chat. This is owner direction, not acceptance.

The approved owner's words, verbatim:

> Owner choice 11 for TOOLS-02:
> answering projection-10 (17e77cc8). Raise the test-group cap to 25 and finish triage through origin 1,518
> without the origin-1,331 checkpoint. Clarify the runtime cap: 10 minutes is the measured runtime of one
> complete pass of all adopted cases (controls plus mutants), not a running sum of every attempt, retry or
> failure. Keep the per-attempt ledger. The 250-adoption cap and every product, evidence, defect and audit
> stop are unchanged. When triage completes, write projection-11 with the final test-group and adoption
> counts and one measured full-pass runtime, then continue to P3 builds unless a cap is exceeded.

This answers [projection 10](projection-10.md) at
17e77cc83fe0861be8db96f9c60b33835b20ba2a. It raises the new-test-group cap from 12
to **25** and authorizes completing triage through origin **1,518**, without an
origin-1,331 checkpoint. Stop early if test groups exceed 25, projected adoptions
exceed **250**, or a measured full pass of all built adopted cases exceeds
**600 seconds**.

The runtime limit applies to **one complete pass, controls plus mutants**. Keep
all per-attempt measurements, including retries and failures, in the ledger, but
do not use their cumulative sum as the cap measurement. The prior 250.717-second
sum remains historical evidence; it is not a complete-pass result. No fresh full
pass at this revision has yet been measured.

Resume within K1.2-correction-01/review-04/README.md:11,
mention-b521726deecc3636dce692c5: finish P1's combined protocol-hold/unsafe-Driver
coverage or supersession reading, then source order. Starting counts are at least
13 test groups and 135 adoption cases (67 built / 68 planned, plus shared variants).

At triage completion, write projection-11.md with final test-group/adoption counts
and one fresh-clone full-pass runtime, explicitly identifying its built-case set.
Every planned adoption still needs implementation and fresh-clone control/qualified
kill validation in the existing registries. Then complete the remaining adoption
and P3 builds, n=50/seed=20261026 self-audit, mappings_complete, final fresh-clone
verification, C/CI dispatch with no polling, and subsequent H. Preserve S1–S6,
P1-G, the family rule and every product, historical-evidence, defect and audit stop.
Implementers mark review-ready only; never acceptance.
