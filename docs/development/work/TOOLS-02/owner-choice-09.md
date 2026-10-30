# TOOLS-02 — owner choice 09: adoption and measured-runtime limits

Recorded on 2026-10-29 by the implementing Codex GPT-6 session, from the owner's
approval of the drafted words in this chat. This is owner direction, not review or acceptance.

The approved owner's words, verbatim:

> Owner choice 09 for TOOLS-02:
> answering projection-07 (8e9a8b8f). Continue triage past origin 731 without stopping there. Replace the
> mutation-adoption cap of 60 with: stop and ask if projected adoptions exceed 250, or if the measured added
> registry runtime at any checkpoint exceeds 10 minutes. The test-group cap stays 12. Re-estimate both counts
> and the measured added runtime after origin 1,031. Everything else in owner choices 07 and 08 is unchanged.

This answers [projection 07](projection-07.md) at
`8e9a8b8fb4443984f80406a29edd788e2868693e` and replaces owner choice 08's
60-adoption cap with a projected cap of **250** and a **10-minute measured added
registry-runtime** stop. The new-test-group cap remains **12**. Stop and ask early
if test groups exceed 12, projected adoptions exceed 250, or measured added registry
runtime exceeds 10 minutes. Runtime evidence must include every adoption run so far;
extrapolated runtimes are not the checkpoint's measurement.

Resume within `K1.2-correction-01/ablations-06.mjs:1`,
`artifact-89a6c743f27e1e2697eab84d`, as projection 07 states, then source order.
Continue past origin 731 without treating it as a scheduled stop. The next scheduled
checkpoint is after origin **1,031**, recorded as `projection-08.md`, with both
current counts/projections and measured added runtime for every adoption run so far.

The current lower bound is five new-test groups and 61 mutation adoptions, with
18 adoptions control/kill validated and at least 43 planned. The original
projection-07 stop is retained unchanged apart from its pointer to this decision.
The family rule, P1-G, S1–S6, dispositions, other stops, n=50/seed=20261026 self-audit,
P3, mappings_complete, final fresh-clone checks, CI dispatch without polling and H
remain required. No acceptance is self-certified.
