# Independent review — K0.1, round 10

## Identity and access

- Reviewer: **GPT-5.6 Sol, High reasoning**.
- Date: **September 11, 2026**, America/New_York.
- Access: **independent pinned GitHub inspection; no executable checkout or shell rerun by the reviewer**.
- No reviewer session identifier was supplied; none is invented here.
- Recorded from the owner's delivered review and corrective prompt, under
  [006](../../006-development-process.md) and [008](../../008-implementation-report.md).
- Integration base: `6464be12c11eb75f7dfbc5ece12ca8d3020a5c15`.
- Previous reviewed H9: `00b30eb333024f7093c5a1db122a3772ca2b8b04`.
- Round-10 review-record administrative commit: `ab3dbd6781a2c59a8bd0dc6386d4f7875c76ae8b`.
- Payload C10: `7f68df367d05641dfdcfca932a1f4c533b5ace3d`.
- Reviewed candidate H10: `012ca92574319aa099a91c845f8fb4375c081f34`.
- Branch: `codex/k0.1-protocol-legacy-disposition`.

| H10 artifact | Git blob identity |
|---|---|
| [contract.md](contract.md) | `d5e8eec4f16fd3409b2f230298ccc88b8815f78e` |
| [protocol-worksheet.md](protocol-worksheet.md), Revision 10 | `c0c67084bb1631ae388ca8ede4c9b759b24b2202` |
| [review-09.md](review-09.md) | `a110737d8199c38400d7dad3cea12ec96c99afc5` |
| [implementation-10.md](implementation-10.md) | `df5f89b706bf075e0dbd83a9315ea42aad70a01a` |

## Inspected versus rerun

The review used pinned GitHub source and recorded validation evidence. Validation-evidence
availability, C/H process identity and the review-09 provenance repair received PASS. These are
inspection verdicts, **not independently rerun commands**. The reviewer had no executable checkout
and reran no shell validation. The delivered review explicitly says the OA-3 seam was examined and
was not blocking. No more detailed inspection inventory was supplied.

## Criterion verdicts

| Criterion / gate | Verdict |
|---|---|
| K0.1-C1 | **FAIL** |
| K0.1-C2 | **PASS** |
| K0.1-C3 | **PASS** |
| K0.1-C4 | **PASS** |
| K0.1-C5 | **FAIL** |
| K0.1-C6 | **FAIL** |
| Round-10 validation evidence availability | **PASS** |
| Candidate C/H process identity | **PASS** |
| Round-9 / review-08 provenance repair | **PASS** |
| [007](../../007-work-packets.md) K0.1 packet acceptance | **FAIL** |
| K0.2/E0 and later executable proof | **DEFERRED** |

## Finding

### K01-R10-01 — P2: stale selection claims contradict the consolidated lifecycle

In the H10 [worksheet](protocol-worksheet.md), §3 **B-2** (lines 324–337) says that a `WAITING`
Execution is not dispatched and no batch is selected while it remains `WAITING`. §5 **W-1** determines
Event eligibility under the live wait; an eligible Event retires it and makes the Execution `READY`
at **B-6 path B**'s Event-acceptance boundary. B-2 then selects from `READY` using the retired wait's
rule. **B-7** supplies the corresponding deadline path.

Two live normative claims still describe selection of a “WAITING batch”:

1. §5 **W-1**, source-category-rule paragraph, H10 lines **704–706**:
   “§3's B-2 selects the `WAITING` batch by exactly this rule and by no other”.
2. §11 boundary/assertion **row 5(b)**, H10 line **1533**:
   “§3's B-2 selects the `WAITING` batch by this rule alone”.

These contradict B-2 itself. The affected [contract criteria](contract.md#acceptance-criteria-007s-k01-row)
are **C1** (one unambiguous boundary/assertion), **C5** (internal contradictions) and **C6**
(self-contained decisions). The canonical lifecycle owner is
[kernel.md](../../../kernel.md#execution-and-lifecycle); the batch guarantee is in
[execution-protocol.md](../../../detail-design/execution-protocol.md#input-reservation-and-acknowledgment),
whose wait-side phrasing B-2 already reconciles with retirement. The requested correction preserves
that state machine and separates eligibility, retirement/readiness and subsequent READY reservation.

## Final outcome

**CHANGES REQUIRED.** Record only K0.1 as `CHANGES_REQUESTED`. No acceptance or successor release.

## Complete corrective prompt delivered with the review

The full owner-delivered correction prompt follows. Markdown transport escapes and the encoded
space character are decoded for readability; wording, ordering and requirements are preserved.
This is the delivered task, not additional reviewer observations or a fabricated reviewer session.

````text
You are taking over an existing correction cycle for the ArrokothI `agent-kernel` repository.

Repository:
[https://github.com/ArrokothI/agent-kernel](https://github.com/ArrokothI/agent-kernel)

Branch:
codex/k0.1-protocol-legacy-disposition

Your job is to continue packet **K0.1 only** and produce the next independently reviewable candidate.

This is not a request to start K0.2 or implement runtime code.

Use your full engineering judgment. Do not optimize for the smallest possible textual patch or for merely satisfying the literal wording of the reviewer comment. At the same time, do not unnecessarily redesign parts of K0.1 that are already coherent.

The goal is:

> produce the cleanest, internally consistent K0.1 Revision 11 that resolves the current review finding without regressing the consolidated wait/batch/clock protocol.

You have discretion over the exact wording and local organization needed to achieve that.

===============================================================================
1. ESTABLISH THE ACTUAL REPOSITORY STATE FIRST
===============================================================================

Do not trust this handoff as proof. Verify the repository and remote yourself before editing.

Expected reviewed state:

Original integration base:
6464be12c11eb75f7dfbc5ece12ca8d3020a5c15

Reviewed H9:
00b30eb333024f7093c5a1db122a3772ca2b8b04

Round-10 review-record administrative commit:
ab3dbd6781a2c59a8bd0dc6386d4f7875c76ae8b

Round-10 payload C10:
7f68df367d05641dfdcfca932a1f4c533b5ace3d

Reviewed candidate H10:
012ca92574319aa099a91c845f8fb4375c081f34

Expected H10 artifact blobs:

- docs/development/work/K0.1/contract.md
  d5e8eec4f16fd3409b2f230298ccc88b8815f78e

- docs/development/work/K0.1/protocol-worksheet.md
  c0c67084bb1631ae388ca8ede4c9b759b24b2202

- docs/development/work/K0.1/review-09.md
  a110737d8199c38400d7dad3cea12ec96c99afc5

- docs/development/work/K0.1/implementation-10.md
  df5f89b706bf075e0dbd83a9315ea42aad70a01a

Verify:

- HEAD / branch identity
- remote advertised branch SHA
- clean working tree
- ancestry
- all four blob identities
- that H10 has not been rewritten

If any of those do not match, stop and report the discrepancy instead of silently adapting.

===============================================================================
2. READ THE GOVERNING MATERIAL BEFORE EDITING
===============================================================================

Read the applicable repository instructions and architecture rather than working only from the review.

At minimum inspect:

- AGENTS.md
- docs/README.md
- docs/mental-model.md
- docs/kernel.md
- docs/detail-design/execution-protocol.md
- docs/detail-design/recovery-and-compatibility.md
- docs/detail-design/evidence-and-observability.md
- docs/development/README.md
- docs/development/001-current-status-and-roadmap.md
- docs/development/002-implemented-kernel-baseline.md
- docs/development/003-evidence-and-findings.md
- docs/development/004-architecture-review.md
- docs/development/005-detail-design-review.md
- docs/development/006-development-process.md
- docs/development/007-work-packets.md
- docs/development/008-implementation-report.md
- docs/development/work/K0.1/contract.md
- docs/development/work/K0.1/protocol-worksheet.md
- review-09.md
- implementation-10.md

Also inspect earlier K0.1 reviews/reports when useful for understanding why a rule exists.

Architecture/canonical sources outrank this prompt and reviewer prose.

If you discover that the requested correction conflicts with a canonical architecture source, do NOT force the requested wording. Stop and identify the smallest architecture decision needed.

===============================================================================
3. ROUND-10 INDEPENDENT REVIEW TO RECORD
===============================================================================

Independent reviewer:

GPT-5.6 Sol, High reasoning

Review date:

September 11, 2026
America/New_York

Reviewer access:

Independent pinned GitHub inspection.
No executable checkout or shell rerun by the reviewer.

Round-10 criterion verdicts:

K0.1-C1 FAIL
K0.1-C2 PASS
K0.1-C3 PASS
K0.1-C4 PASS
K0.1-C5 FAIL
K0.1-C6 FAIL

Round-10 validation evidence availability PASS
Candidate C/H process identity PASS
Round-9 / review-08 provenance repair PASS
007 K0.1 packet acceptance FAIL

K0.2/E0 and later executable proof DEFERRED

Finding:

K01-R10-01 — P2

Revision 10's actual state machine says:

- a WAITING Execution is not dispatched;
- no batch is selected while it remains WAITING;
- W-1 determines whether an accepted Event is eligible under the live wait;
- an eligible Event retires the wait and makes the Execution READY;
- the resulting dispatch is selected from READY by B-2's wait-ended-readiness branch using the retired wait rule.

But two live normative statements still use the superseded model and say B-2 selects a “WAITING batch”:

1. W-1 says approximately:
   “§3's B-2 selects the `WAITING` batch by exactly this rule and by no other.”

2. §11 row 5 says approximately:
   “§3's B-2 selects the `WAITING` batch by this rule alone.”

Those contradict B-2 itself.

Final review outcome:

CHANGES REQUIRED

===============================================================================
4. FIRST RECORD THE REVIEW — DO NOT MIX IT WITH THE PAYLOAD
===============================================================================

Preserve all reviewed history.

Do not:

- amend H10
- rebase reviewed history
- force-push
- rewrite old reviews
- rewrite old implementation reports
- rewrite evidence
- edit implementation-04.md
- retroactively “clean up” historical records

First create:

docs/development/work/K0.1/review-10.md

and update only the K0.1 row in:

docs/development/007-work-packets.md

to CHANGES_REQUESTED.

Commit those as a separate administrative review-record commit.

review-10.md must faithfully record:

- reviewer identity/model
- date
- access limitations
- base / C10 / H10 identities
- relevant H10 artifact identities
- inspected versus rerun distinction
- every criterion verdict above
- K01-R10-01 with meaningful file/section/contract references
- final outcome CHANGES REQUIRED
- the complete corrective prompt delivered with the review

Do not invent a reviewer session identifier.

===============================================================================
5. SEMANTIC OBJECTIVE FOR REVISION 11
===============================================================================

The correction should be conceptually simple:

There is no such thing as a batch selected while the Execution remains WAITING.

The lifecycle is:

    WAITING
      |
      | eligible Event accepted under W-1
      v
    wait retired + recoverable wait-ended readiness
      |
      v
    READY
      |
      | B-2 reservation
      v
    Activation with wait-ended batch

So keep these concepts distinct:

1. **Eligibility while WAITING**
   W-1 answers whether an accepted Event is eligible to end the live wait.

2. **Wait retirement / readiness creation**
   B-6/B-7 describe the acceptance boundary that retires the wait and records recoverable readiness.

3. **Batch selection after READY**
   B-2 selects the resulting batch once the Execution is READY.

The current state-machine design itself is not under review. The stale wording is.

At minimum reconcile:

- W-1's source-category-rule paragraph
- §11 boundary/assertion row 5

Search the entire live worksheet for any other language that still implies:

- a “WAITING batch”
- selection/reservation while the lifecycle is still WAITING
- B-2 selecting before the WAITING→READY transition
- an Activation being dispatched directly from WAITING

Historical text describing an earlier defective revision may remain when clearly historical.

Prefer citation over another paraphrase if that reduces the chance of this rule drifting again.

You may improve nearby wording if necessary for one coherent rule, but do not perform another large redesign unless your independent analysis demonstrates that the current state machine actually requires it.

===============================================================================
6. IMPORTANT NON-REGRESSION CONSTRAINTS
===============================================================================

Round 9's consolidation and Revision 10's well-formedness correction are not invitations to reopen everything.

Preserve unless you discover an actual contradiction:

- W-1 structural well-formedness:
   structure, not satisfiability
- inert alternatives remain structurally valid
- subscription-only waits are valid
- source-category eligibility
- application input requires a declared subscription
- B-2's ordinary READY / wait-ended READY / WAITING-no-selection model
- B-6 Event-triggered wait ending
- B-7 deadline-triggered wait ending
- W-2's ordered single-transaction registration algorithm
- timeout is a Kernel Event
- timeout exactly-once/idempotency semantics
- B-8 no-extra-readiness rule
- wait-generation fencing only for wait-created artifacts
- authenticated result Events are not generation-fenced away
- timeout/result coexistence and ordering
- cancellation-before-reservation behavior
- routing obligation versus destination Event acceptance
- Runtime-local work remains Runtime-private
- Activation ID / writer epoch semantics
- E-7 / RFC 8785 / JCS decisions
- Effect refusal boundary
- progress compatibility decisions
- migratable / legacy-only / refused vocabulary
- MIG-5 / REF-5
- historical evidence preservation
- the owner-approved historical blank-at-EOL exception

The round-10 reviewer explicitly examined the OA-3 seam and did NOT find it blocking. Do not redesign OA-3 merely because the implementation report flagged it as an area to inspect.

===============================================================================
7. USE YOUR OWN ADVERSARIAL REVIEW
===============================================================================

Do not stop at replacing two phrases.

After making the correction, attack the resulting Revision 11 as if you were the independent reviewer.

Try to derive two answers for the same scenario.

Especially inspect transitions among:

WAITING
eligible Event acceptance
wait retirement
recoverable readiness
READY
reservation
batch selection

Ask:

- Is eligibility being confused with selection anywhere?
- Is readiness being confused with the wait itself?
- Does any live section imply dispatch from WAITING?
- Does §11 accurately describe the rule rather than restating an obsolete one?
- Did the correction accidentally weaken the “eligible wake before unrelated backlog” guarantee?
- Did any wording imply the eligible Event itself is acknowledged before an Outcome?
- Did any wording revive the old interleave/satisfied-state concept?

If you discover another genuine K0.1 defect while doing this:

- fix it in the same payload if it is clearly within K0.1 and necessary for coherence;
- label it **implementer-discovered**, not reviewer-found;
- explain it in the report;
- do not hide it merely to keep the round narrow.

But do not expand into speculative future design.

===============================================================================
8. C11 PAYLOAD BOUNDARY
===============================================================================

After the administrative review-record commit, create payload C11.

C11 should normally modify only:

- docs/development/work/K0.1/contract.md
- docs/development/work/K0.1/protocol-worksheet.md

Update:

- worksheet Revision marker
- revision history
- contradiction/resolution history as appropriate
- contract correction history

Keep the acceptance criteria unchanged.

Before committing C11, perform a search-based consistency pass over the live worksheet for the stale model.

A good pass should include variants such as:

- WAITING batch
- `WAITING` batch
- select while WAITING
- selects the WAITING
- selects the `WAITING`
- dispatch while WAITING
- reservation while WAITING

Use judgment; don't limit yourself to those exact strings.

Commit C11 and ensure the tree is clean.

===============================================================================
9. VALIDATE THE CLEAN C11 TREE
===============================================================================

Run final validation against the clean committed C11 tree.

Required:

npm run check:builder-docs

npm run typecheck

Strict cumulative diff check:

git diff --check 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 <C11>

The expected historical exception remains exactly two pre-existing findings:

docs/development/work/K0.1/implementation-04.md:227
docs/development/work/K0.1/implementation-04.md:235

No other strict cumulative finding is acceptable.

Then:

git -c core.whitespace=-blank-at-eol diff --check \
  6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 <C11>

must exit 0.

The new correction delta must pass strict default rules with no exception:

git diff --check \
  012ca92574319aa099a91c845f8fb4375c081f34 <C11>

must exit 0.

Also run:

- K0.1 link/anchor audit
- cumulative base..C11 diff stat / scope
- H10..C11 diff stat / scope
- git status --porcelain
- preservation checks for prior reviews/reports/evidence
- a search/output demonstrating that no LIVE normative “WAITING batch” rule remains

`npm test` is not required for a documentation-only payload unless your work unexpectedly changes executable material.

If executable/package/test material changes, stop and reconsider scope rather than casually widening the validation plan.

===============================================================================
10. REPORT AND H11
===============================================================================

After C11 validation succeeds, write:

docs/development/work/K0.1/implementation-11.md

The report should be concise but complete.

It must include:

- exact base/H10/review-admin/C11 identities
- scope
- K01-R10-01 disposition
- any implementer-discovered issue separately identified
- semantic before/after explanation
- validation commands, environment, exit codes and meaningful raw outputs
- consistency-search results
- preservation observations
- known limitations
- explicit statement that K0.2 was not started

For raw output, preserve the already-approved historical whitespace rule:

- ordinary cumulative `git diff --check` remains red only for the two historical implementation-04 lines;
- report that honestly;
- do not reproduce those two trailing spaces into the new report;
- cumulative with only blank-at-eol disabled must pass;
- H10..C11 strict diff check must pass.

Do not create new evidence files or scripts in the repository after validating C11.

Then update only the K0.1 ledger row to WAITING_FOR_REVIEW and commit:

- implementation-11.md
- docs/development/007-work-packets.md

as candidate H11.

C11..H11 must contain exactly those two administrative files.

===============================================================================
11. PUSH / HANDOFF
===============================================================================

Push by fast-forward only.

No force-push.

Verify the remote advertised branch SHA after push.

Return a handoff containing:

- base full SHA
- H10 full SHA
- review-10 administrative commit full SHA
- C11 full SHA
- H11 full SHA
- remote advertised SHA
- clean-tree state
- base..H11 scope
- H10..C11 scope
- C11..H11 scope
- validation results
- finding disposition
- any implementer-discovered semantic issue
- confirmation that prior reviewed history stayed immutable

Do not claim acceptance.

===============================================================================
12. NON-GOALS
===============================================================================

Still K0.1 only.

Do not start or implement:

- K0.2
- E0
- K1
- K2
- K4
- database work
- scheduler work
- persistent substrate work
- native recovery
- process-kill testing
- isolation
- release/packaging
- new third-party dependencies
- successor packets

Do not modify `packages/*` or `tests/*` as part of the intended correction.

Do not merge to main.

Do not self-accept.

Do not release K0.2.

===============================================================================
13. QUALITY BAR
===============================================================================

Success is not:

“the two quoted sentences were edited.”

Success is:

“Revision 11 has one lifecycle story: W-1 decides eligibility while WAITING, an eligible fact ends the wait and creates READY readiness, and B-2 selects the resulting batch only after READY — with no live normative text implying otherwise.”

Use your judgment about the cleanest way to express that.

Keep the correction as small as correctness permits, but as large as correctness requires.
````
