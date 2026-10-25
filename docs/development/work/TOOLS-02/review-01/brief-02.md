# Correction brief 02 — TOOLS-02 range 1

Correct the same released packet TOOLS-02 on `claude/tools-02`.
Base `b5daf35aeee37305c1ee41bb626c97d26db94ab2`; reviewed H
`f2184fc60e0b766b36877784b56e66af5a9cfbb5`; review record
`docs/development/work/TOOLS-02/review-01.md` (this review delivery; recording commit not yet assigned).
Open finding: T2-R1-READ-01. Required outcome and counterexample are in that record.
Owner supplemental decisions: none; owner choice 01 remains governing. No unresolved architecture authority.
Read this brief first, answer the design questions, and obtain the design check when 006 requires it.
Apply 006/012 and use 008 for the next report and new C/H evidence handoff. No successor release.

## Goal

Ensure a preserved member's fixture-listing identity covers what its supported filesystem call actually
observes. Close the recursive-listing omission without restoring digest churn for unrelated non-fixture
enumerations or weakening the clean-checkout guards.

## Criteria

| ID | Required result | Closing evidence |
|---|---|---|
| T2-R1-READ-01 | Two successive nested fixture-entry changes observed by a recursive fixture listing must change the member record and invalidate the stale preserved table; an unrepresentable listing mode must explicitly refuse preservation | Port `probe-range1.py` into the maintained corpus as an acceptance assertion, including an initially preserved member and the immediate-child positive control; add a plausible distinguishing mutant |
| T2-1 cumulative | Keep the owner's amended read classes, unrelated existing/new-directory additions, repeated named/fixture edits and directory-existence correction | Full maintained controls and registry; no restored requirement to hash enumerated non-fixture content |
| T2-2 cumulative | Keep all declared routes guarded, direct inner-guard ablations meaningful, canonical write scope and writer-census coverage | Maintained refusal controls/census and Packet verify at the corrected C |

## Suspect design and questions before code

The accepted trace records only a filesystem operation and its first path argument. `listing` then
models every listing as immediate children. The candidate's identity-at-C digest inherits this mismatch.
Do not special-case the discovered member or infer correctness from another scanner that stats children.

1. How will the supported listing modes be represented so current identity and pin comparison describe
   the same dependency? Identify the supported modes and explicit refusals; do not claim a universal
   filesystem observer.
2. How will recursive fixture reads remain sensitive at successive commits while unrelated enumerated
   non-fixture additions remain stable? Trace the answer through trace capture, classification, identity,
   refusal reasons, aggregation and regeneration.
3. Which nearby forms share this mechanism (sync/callback/promise listings, recursion and returned entry
   forms), and which distinguishing controls or stated bounds cover them? Keep the search finishable.
4. Does correcting the inherited representation require an accepted-design amendment? Explain the
   affected contract and obtain owner/design-check direction where required, rather than silently
   narrowing “any fixture read.”

## Known counterexamples

- [Review probe](probe-range1.py) and [observed output](probe-range1.json): an initially preserved member
  recursively lists `tests/fixtures`; additions under `nested/` and `nested/deeper/` change its returned
  list but keep both `table_current` and `revalidation_complete`. A direct child correctly invalidates.
- Keep D02-CHK-01/02's existing controls, D02-CHK-03's guard ablations, all maintained mutation registries
  and the complete Packet verify profile passing. Preserve the original CI artifact and this review.

## Bounds and stop conditions

Only T2-1/T2-2 remain in this correction. Do not implement or review T2-3, T2-4/design 03, or T2-5.
No product-file change, hold release, origin-triage change, history deletion or new acceptance claim.
If a correction requires a semantic scope change, record the smallest owner decision first. Continue
the cumulative range-1 audit after fixing the reproducer; report additional defects with separate provenance.
