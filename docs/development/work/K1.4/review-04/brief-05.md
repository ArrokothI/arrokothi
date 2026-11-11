# Brief 05 — K1.4 cleanup-claim closure

Correct the same released packet K1.4 on `claude/k1.4`.
Base `608f9ece44dbe42b78974bdac9e7ddcd33697705`; reviewed H
`1b98a76e625ef187ba179fdad2e823ac4dabd521`; payload C
`697922e251a572d0c96f7a02c1b646b607c351fc`.
Review record: `docs/development/work/K1.4/review-04.md` on `codex/k1.4-review-04`,
at the immutable recording SHA supplied in the reviewer's handoff.
Open finding: **K14-R4-01**. Owner choices 05/06 remain in force. Owner supplements of 2026-11-11:
deviation 1 **"Confirm both cases"**; deviation 3 **"Review as is"**, with a comment-only fix to be
taken in cleanup if the reviewer identifies a false current claim. No unresolved behavioral choice.

## Goal

Make current cleanup descriptions agree with the already-approved L-36 behavior and the actual
rejection-reporting boundary. Preserve F1–F3, L-37 and all runtime behavior. This is completion of the
recorded-limit route, not another cleanup implementation round.

## Criteria

| ID | Required outcome | Deterministic or bounded closure |
|---|---|---|
| R4-CLAIMS | Driver header and `endLineage`/`cascade`/`terminate` comments describe requests and future-scheduling suppression, not guaranteed ended members; L-36 and baseline qualify rejection reporting to its actual exchange boundary | Compare prose against B-TERM-LIMIT and the attached F1 rejection/no-hold trace. Inspect the named occurrences and dependent current cleanup summaries, including the baseline limit index. |
| R4-PRESERVE | Approved FAILED/CANCELLED limitations, census exclusions, F1–F3 and all earlier closed dispositions stay unchanged | Comment/document-only diff; no executable production/test/fixture/configuration changes. Preserve Kernel/core bytes. Keep historical records intact. |
| R4-EVIDENCE | Corrected payload has its own exact candidate identity and proportionate validation/review | 006 C/H and administrative allowlist; verify the changed prose and unchanged executable content. Existing evidence is attributed to its actual C, never relabeled as a run of a new C. No new CI is started by this brief's author. |

## Known counterexamples

- B-TERM-LIMIT's two failed-step cases and the confirmed mid-step CANCELLED variant: native RUNNING
  with pending cancellation, no cleanup hold and no later Driver step.
- Review 04 `probes.mjs`: one rejected `cancel.request`, real `cancel.application` fallback succeeds,
  Kernel CANCELLED, both native members CANCELLED, no hold, no later step. This is truthful observed
  behavior, not a request to install a hold after cancellation.
- Existing F1–F3 and L-37 cases remain maintained, with review 04's confirmed counts and dispositions.

## Mechanism and questions

The code has different facts: requesting native cancellation, fulfillment with a pending receipt,
Driver scheduling suppression, actual native terminal state, and rejection reporting from `terminate`.
Which of those does each sentence describe? Name that fact and its boundary. The blanket statements
are the defect; neither the native receipt nor `requestCancellation`'s catch is to be changed.

The owner has already selected the behavioral limit and authorized the comment-only cleanup route.
No new runtime design check is needed for this prose correction. If a change would instead force native
state, retry native work, remove a cascade, change Kernel semantics or expand the limit, stop for an
owner decision; it is outside this brief.

## Bounds and handoff

Do not merge review branches, reopen review-03 closed dispositions, build an analyzer, modify production
logic or self-certify acceptance. Source edits are limited to comments identifying R4-01; the existing
no-production-change rule continues to protect executable behavior. Documentation is payload under
006 and cannot be treated as administrative evidence merely because cleanup performs the edit.
Report the new C/H and focused closure evidence for independent review. No successor or K14-G release.
