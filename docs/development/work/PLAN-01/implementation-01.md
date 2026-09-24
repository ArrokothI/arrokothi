# Implementation report — PLAN-01, round 1

## Identity

- Packet: PLAN-01, planning/process amendment. [Contract](contract.md) at C. Governing process
  baseline for its review: integrated main `70467f4cf76896529486499db24fcaa953292491`.
- State: WAITING_FOR_REVIEW. Owner release: explicit owner instruction, 2026-09-23. No prerequisite
  packet; it only amends seeds and process text.
- Author: Claude Code session (Claude Opus 5.5), 2026-09-23, at the owner's instruction.
- Branch `claude/pre-k1.2-reviews`; branch base `70467f4`. Earlier commits on the branch belong to
  K1.1-correction-02 (H `e1c751b87ee0e16af1280aefcf485fceeb409664`) and DOCS-CLEANUP-01
  (H `0c82b2ffdf65b733c4e67b089e45b2529499b74f`). PLAN-01's payload is the single commit
  C = `77194248b73664a7fdf9dffcd8c356099af55fd5`; review it as `git diff 0c82b2f 7719424`.
- Candidate H: the commit containing this report, supplied in the owner handoff. C..H allowlist: this
  report, `validation-01/*.txt` and the PLAN-01 status row in 007.

## Changes and coverage

| Criterion | Change |
|---|---|
| PL-1 | 001 "Sequence and ownership" gains the owner's product sequence; the R2 section points to it; `concepts/roles.md` intro points to it without restating it. |
| PL-2 | 001's opening loses the K1.0-correction-02 status paragraph (review identities, cleanup, `next_release: none`). Those facts remain in 007's K1.0 rows and the linked review, cleanup and integration records. 001 now says status is read in 007. |
| PL-3 | 001 K2: "the narrow human input-request operation" becomes "the narrow human input request … its own Effect shape, not an operation", linked to `concepts/actions.md#effect`. |
| PL-4 | 007 K1.2 scope: late delivery reports after resolution or takeover; next exchange after `continue`; no "current Activation" convenience path. Acceptance: late Outcome for a resolved Activation (exact → original receipt; otherwise refused, no state change, never committed into the new exchange); late report changes no receipt, epoch, reservation, acknowledgment or lifecycle. |
| PL-5 | 007 K1.3 acceptance: the five small distinguishing examples as separate cases; late report after cancellation. |
| PL-6 | 007 K1.4: entry checks (E1 readiness before K1.3 closes; size assessment and split path keeping `K1.4` as the bridge identity; legacy-name routing). |
| PL-7 | 007 K2.2, K2.4, R1.1, K3.1, K5.1 gain the research-derived inputs listed in the contract. |
| PL-8 | 006 "Maintaining the mental-model reference": the semantic candidate carries Layer-3 updates; it follows the rewrite index's marker rules; Prompt C verifies. 009 Prompt A reads Layer 2 and the rewrite index §4/§5 and includes Layer-3 updates in C; Prompt B reviews Layer-3 changes as normative payload; Prompt C verifies instead of authoring. `mental-model/roadmap.md` intro matches. The existing rule that missing documentation needs a scoped reviewed correction is kept word for word. |
| PL-9 | 006 "delegates final cleanup to the owner-selected cleanup agent"; 009 Prompt C heading and role sentence drop the model name. The one inbound anchor link (`mental-model/roadmap.md`) is updated. |
| PL-10 | 007 opening: owner hold on starting K1.2 with its three conditions. |
| PL-11 | Rewrite index header records its maintained role; new "Mechanism rewrite schedule" subsection, stated as a plan with status left to the ledger. |
| PL-12 | `reference.md` common search terms: one row routing seven 0.8.x names to current owners, "not renames"; the paragraph below now says "last four rows". |
| PL-13 | `mental-model/roadmap.md` K1.2 map adds lifecycle and core. |

Selected 012 methods: process/documentation and normative examination, as the contract states.

**Launch simulation (process method).** A fresh coding session given Prompt A for "the released
packet" reads 007: K1.2 is released, but the new opening hold names three unmet conditions, so the
launcher must stop and ask; without the hold, the old text would have let it start. If the hold is
lifted, Prompt A now directs it to Layer 2, the rewrite index §4/§5 and the K1.2 seed's new late-report
and next-exchange obligations, and to put its `execution-cycle.md` and `identity.md` updates into C.
Prompt B then reviews those Layer-3 edits with the code. Prompt C, after ACCEPT, checks them against
the accepted delta and, if something is missing, still prepares a scoped reviewed correction. That
path no longer needs a K1.1-reference-01-style extra review cycle, and it drops no reviewed check.

**Normative check of the seed amendments.** Each K1.2/K1.3 addition restates an obligation a
mechanism page already assigns — delivery reporting (`execution-cycle.md`: "These latter lifecycle
interactions belong to K1.2/K1.3"), retry versus takeover (its third row), and the wait examples
(`waits.md`) — or a refusal that follows from attempt-bound acceptance. The one sentence without a
direct Layer-3 source is the refusal of a "current Activation" convenience path. It is an
implementation-safety constraint drawn from the Temporal study, recorded as an owner amendment, and
compatible with `execution-cycle.md` step 3 (validate "current Activation, writer epoch"). K2.2's
dispatcher sentence leaves the `OPEN(unassigned)` question open unless the owner settles it.

## Validation and interpretation

Environment: macOS 26.6.2, Node v25.2.1, npm 11.6.2; clean tree at C.

| Command | Result | Attachment (SHA-256) |
|---|---|---|
| Local link/anchor check, links touching `mental-model/` (script in the session; logic: resolve every relative Markdown link, check file and GitHub-style heading anchor) | 0 broken, 94 files | `validation-01/links.txt` (`fd8d6c3d287b62885c6fb5a5924b1fda8a0733530bfcb4b35266fef0fb9bc76f`) |
| Same check over all current documents | 131 broken, all pre-existing and unchanged from `70467f4`: 130 relative links inside the two byte-sealed K0 fixtures, 1 in `.claude/skills/arrokothi-architecture/SKILL.md` | `validation-01/links-all.txt` (`e392885757bfcc5453dd2368b35a1b4f4615aa3682fea02537a9c798b1878821`) |
| `npm run check:builder-docs` | exit 0; 72 Markdown files, 1,713 links/anchors, 38 imports | `validation-01/builder.txt` (`0659be774e06344f222e092189f892eb34749f9e013da727c31cd24371f2f9dd`) |
| `npm test` | exit 0; 2,323 tests / 356 suites, 0 fail/cancelled/skipped (unchanged from K1.1-correction-02's run) | `validation-01/full.txt` (`42d1871c434e8ae1c580792caf071cb9569c89e2a48a6945232a3376028ed0ce`) |
| `git diff --check` | clean | — |

Not run: no Runtime behavior changed, so no targeted kernel runs beyond the full suite. The link-check
script is not committed; a reviewer can rerun `npm run check:builder-docs` and inspect links directly.
Implementer assessment, not acceptance: PL-1–PL-13 are met by the diff. Strongest remaining risk:
a reader treating a research-derived seed sentence as a new gate. The contract states they are
inputs and counterexamples, and each sits inside an existing packet's scope.

Third-party review: none.

## Handoff

Ready for independent review, together with K1.1-correction-02 and DOCS-CLEANUP-01 on the same branch;
each packet has its own C, H and verdict. No self-acceptance and no successor release; K1.2 stays
held under OD-2.
