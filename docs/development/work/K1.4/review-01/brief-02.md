# Brief 02 — K1.4 correction

Correct the same released packet K1.4 on `claude/k1.4`.
Base `608f9ece44dbe42b78974bdac9e7ddcd33697705`; reviewed H
`072f9627791f43e4d990a6f47c3e32510cbbc011`; review record
`docs/development/work/K1.4/review-01.md` on `codex/k1.4-review-01` (the review's external handoff pins its commit).
Open findings K14-R1-01 through K14-R1-05; required outcomes and counterexamples are in that record.
Owner supplemental decisions: none. No unresolved authority prevents preparing the correction design;
changing accepted behavior requires the owner.
Read this brief first. Answer its questions in `design-03.md`; obtain the design check required by 006.
Apply 006 and 012: fix the mechanism, add every counterexample to the corpus, then re-audit the full cumulative
packet. Fix additional in-scope defects with separate provenance. If the fix belongs in accepted earlier
design, say so and ask. Use 008 for the next report and 006 for new C/H, evidence and push handoff.
No successor release.

## Goal

Make asynchronous native observations, SDK retry identity and terminal Event accounting reliable across the
boundaries the bridge already exposes. Restore the controller hook's promised services and close the
termination corpus against the actual trigger set.

## Criteria

The original K14-1..K14-6 criteria and owner decisions remain in force. These are correction obligations,
not substitutes for cumulative review:

| ID | Required outcome | Closes by / evidence |
|---|---|---|
| R1-01 | A declared human wait cannot strand runnable/native-settling work. | A coherent or validated observation mechanism with a commitment argument; deterministic mixed-operation and lineage settlement schedules, plus the operation-status/outcome and resumption product promised by D01-CHK-02. |
| R1-02 | Exact caller input retries retain the accepted destination/identity after pause changes. | Tests before/after continue, changed/absent/multiple pauses and termination; original Event/receipt replay, changed-content conflicts and no duplicate native delivery. |
| R1-03 | Every acknowledged batch Event has truthful, retained forwarding/discard accounting on all terminal exits. | Enumerate exits; test failure before first forward, after partial forward, initial rejection and encoding failure, each with multiple Events and complete receipts/results. |
| R1-04 | Controller hooks receive the actual initialized services at invocation. | Read/retain the scheduler inside the callback, then compare with the app's scheduler and exercise it without unsupported writes. |
| R1-05 | B-FAIL-CASCADE implements the promised terminal-trigger/descendant scope. | Each Driver failure trigger and completed-root/live-descendant case; all live members ended, no new work on a later host run, and a plausible removed-cascade mutation rejected. |

## Known counterexamples

[probes.mjs](probes.mjs) contains four contract assertions failing at H and one passing ordinary-flow control;
[probes.log](probes.log) records the retained run. Turn the four counterexamples into maintained tests with
review provenance. Keep the explicit-child retry control. The snapshot test gates a real native settlement
between Driver reads through an async RuntimeStore port; it does not authorize forged native records as a
replacement for exercising the actual schedule.

Retain the entire design-02 corpus, original/native conformance, K14-4 feature inventory, K14-6 mapping,
binding-surface prefix check, boundary controls and mutation registries. R1-05 is a bounded source-audit finding:
the required missing tests must be added, not recorded as if they already ran.

## Suspect design and questions before code

1. D01-CHK-02's proof moves from multiple native-store reads to a simultaneous human-pause fact. What enforces
   coherence, and what closes the gap through Outcome submission? Analyze settlement before/between/after
   reads and notification registration, mixed human/nonhuman work, and child links. Do not solve only the
   probe's particular read order or add native scheduling semantics to the Kernel.
2. INGRESS-01 derives a default from current pause state while Q5 promises exact replay of caller content.
   Where is the accepted resolution retained? Which fields define caller identity, and how do omitted versus
   explicit destinations, ambiguity and terminal retries behave without weakening changed-content conflicts?
3. Which component owns the complete Event batch's disposition when forwarding, classification, encoding or
   native-store access throws? How are already-forwarded and unattempted Events distinguished and encoded
   within limits, without acknowledging an unreported discard or claiming native processing?
4. How can construction supply the actual lineage scheduler before calling the supported hook without an
   observable partial object or a substitute scheduler identity? Audit other constructor-time consumers.
5. List every terminal trigger and late-work window, and map each to its stop/cascade mechanism and a
   distinguishing test. Why does completion with a live descendant close? Which existing claim was based
   only on a shared helper's presence, and how will the new oracle catch omission on one branch?

## Bounds and stop conditions

Keep fixes in the SDK/legacy Driver, its tests and dependent contract/migration descriptions unless the design
demonstrates a necessary earlier-owner correction. Kernel source is unchanged in the reviewed packet; do not
silently widen the packet to modify it. Native effects remain Trusted Execution work, physical interruption
and durable recovery stay outside scope, and K14-G remains assigned to K1.4-gate.

Do not replace promised behavior with a new limitation, weaken existing assertions/mutants, remove replay
support or silently require explicit destinations. Ask the owner if restoring the contract requires an accepted
behavior change or a wider boundary. There is no automatic repeated-failure redesign hold at review 01;
the ordinary design-note/check lifecycle still applies. Update the report, K14-4 inventory and K14-6 kept-property
claims only after their behavioral checks distinguish the repaired mechanism.
