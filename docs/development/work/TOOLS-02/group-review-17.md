# Group review 17 — runtime sweep reports and inspection adoption

2026-10-30, Codex GPT-6; origins 901–971 in source order, historical pin
66bc041175e6fc191c2e7cf88de198111e7d97c9, current reading at 1a6f6651.
**Five distinct new-test groups / 131 mutation adoptions.** This batch adds 54
retirement readings and 17 extraction-origin plans: 891 retired and 80 plans total.
All measured adoption runs remain 250.717 seconds; no new execution occurred.

Implementation reports 07–08 retain the runtime poison catalog, whole-view and
recovery comparisons, fault oracle, and the effect-analysis negative controls for
logical assignments, constructed containers and foreign handoffs. The maintained
control-commits order-independence leaf compares summaries in both traversal orders,
retaining the incomplete-cycle memoization counterexample. Administrative fences,
aggregate counts and implementation status supply no new executable evidence.
Concrete round-7 read/commit forms reuse their existing adoption groups and the
individual H/shared/moved-owner readings in group review 14.

One new case is needed for the round-8 READ-01 inspection mutant. The complete
sweeps-08 runner and its validation-09/56 log were read. The old viewOf(record)
return disappeared when inspection moved to ExecutionReader.inspection(). Current
coordinator inspect still obtains that reader, whose class has no resultingEpoch
member and whose prototype chain reaches Object.prototype. Preserve the Pick cast
and unused resultingEpoch read at the unique current inspection return. The current
poison-catalog count leaf already checks zero zone firings with live accessors and
passes in the recorded catalog. Existing History H1/H2 cases mutate a different
operation; the bounded search of both registries found no inspection counterpart.
[Anchor record](family-applicability-17.json) keeps the concrete replacement. This is
one adoption against an existing test, not a new test group, and is not yet executed.

The remaining round-8 family is not closed here. Early default-parameter and shadowed
undefined index writes need their state-owner relocation and complete-decision
nextAcceptance/applySequence route; a reader-setter TypeError is not the intended
kill. Ordinary oracle coverage does not silently close unexamined family members.

Only human origin state/triage fields changed in adoption.json; all other origin
fields and every derived table were compared unchanged. No product or historical
evidence changes, regeneration, P3 completion, self-audit, mappings_complete, final
C/H or CI. Owner choice 10 authorizes the next readings through origin 1,031. Resume
origin 972 at implementation-09.md:20, mention-08f056189d606bd949f70225.
