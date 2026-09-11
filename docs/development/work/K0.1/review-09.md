# Independent review — K0.1, round 9

## Identity and access

- Packet: **K0.1** — Protocol decisions and legacy disposition.
- Reviewed base (unchanged across all rounds): `6464be12c11eb75f7dfbc5ece12ca8d3020a5c15`.
- Reviewed candidates to date: H `857fa05a8a72a4c6f4f294f9e775a0dc1f7919dc`,
  H2 `cc61e74455534abf896c46632246615185219b92`, H3 `aef1e33ba944a0647bb2319fb97ae40b18b05924`,
  H4 `a068e2f6c8d67e5e3e2512c765b29427acb4ac68`, H5 `d0dbc4800c10dad68a8b4b6c662bf90c963fd926`,
  H6 `c5bdd481134cf3691050b16dd6dd3a49aa9ab042`, H7 `6bdc53ad10d50e0e41bccf57bab212d406b7a2ce`,
  H8 `6290e68fb0231a6a8b4e6956d9a44afe7ac051ab`.
- Round-9 review record commit (adds [review-08.md](review-08.md); ledger → CHANGES_REQUESTED):
  `6ac959fef2883ae6bb14427c0f1a92cc54d43a65`.
- **Round-9 correction payload C9: `1b2ef1bd83681f302637ffd27c9630575289d37b`.**
- **Round-9 reviewed candidate H9: `00b30eb333024f7093c5a1db122a3772ca2b8b04`.**

Reviewed artifacts pinned by **blob** SHA at H9:

| Artifact | Blob SHA at H9 |
|---|---|
| [contract.md](contract.md) | `95015d103b31a6709be1cf5b3671872750d2e03c` |
| [protocol-worksheet.md](protocol-worksheet.md) (Revision 9) | `39334ef7bca32f599da0a69878a55f4002b2a29a` |
| [review-08.md](review-08.md) | `aad8377e3ec25ee5370d3c340a02ccebff8b3571` |
| [implementation-09.md](implementation-09.md) | `33c46df10772e3bd72e507d7c07b24ac25ae2cc4` |

- Reviewer identity: **GPT-5.6 Sol, High reasoning.**
- Reviewer access: **independent pinned GitHub source inspection; no executable local checkout and no
  shell rerun of any command.**
- Reviewer session identifier: **not supplied.** None is recorded here; this record does not invent one.
- Review date: **September 11, 2026** (America/New_York).
- Transcription path: delivered to the coding-agent session as an owner (Rex-Shih) message and
  recorded here verbatim in substance, per [006](../../006-development-process.md)'s
  owner-transcription path.

## Inspected versus rerun

- **Inspected, not rerun: the round-9 validation commands.** Their raw output as reproduced in
  [implementation-09.md](implementation-09.md) was read and accepted as pinned evidence; no command was
  re-executed and no digest recomputed. Round-9 validation-evidence availability is verdicted PASS.
- **Inspected:** the pinned tree at H9 by the blob identities above; `protocol-worksheet.md`
  Revision 9 in full, with particular attention to §3 (B-1/B-2/`B-6`/`B-7`/`B-8`), §4 (CL-1–CL-3), §5
  (W-1/W-2/W-3/W-7/W-8/W-9), §11 row 5, §12 and §13; `contract.md` at H9;
  [implementation-09.md](implementation-09.md)'s findings disposition, holistic reconstruction and
  adversarial self-review; and [review-08.md](review-08.md) against
  [008](../../008-implementation-report.md)'s requirements for a recorded review.

## Criterion verdicts

| Criterion | Verdict |
|---|---|
| K0.1-C1 — every 001 K0 boundary has one owner and an observable assertion | **FAIL** (K01-R9-01: the wait-registration boundary has two answers for one record) |
| K0.1-C2 — dedicated sections with decisions, not open questions restated | **PASS** |
| K0.1-C3 — every named legacy record classified migratable / legacy-only / refused, split where needed | **PASS** |
| K0.1-C4 — no new mandatory Kernel concept; transport/storage stays implementation-owned | **PASS** |
| K0.1-C5 — contradictions called out explicitly and resolved in the Kernel's favour | **FAIL** (K01-R9-01) |
| K0.1-C6 — versioned and self-contained for a K1.1 implementer | **FAIL** (K01-R9-01) |
| Round-9 validation-evidence availability | **PASS** |
| Candidate C/H identity and commit choreography (006) | **PASS** |
| Round-8 review-record compliance ([008](../../008-implementation-report.md)) | **FAIL** (K01-R9-02) |
| [007](../../007-work-packets.md) K0.1 packet acceptance | **FAIL** |
| K0.2/E0 and later executable proof | **DEFERRED** — explicitly outside this packet and assigned to K0.2 and later |

## Findings

### K01-R9-01 — W-1 registration well-formedness contradicts its intentionally permitted inert alternatives (P2)

W-1's well-formedness rule and W-1's own selector-grammar paragraph give two different answers for the
same wait record.

### K01-R9-02 — review-08.md omits the complete corrective prompt and sufficient source references required by 008 (P2)

The round-8 administrative transcription records the four findings as one-sentence statements without
meaningful file/section/contract references, and it does not preserve the complete corrective prompt
delivered with the round-8 CHANGES REQUIRED review.

## Supersession of review-08 administrative transcription

[review-08.md](review-08.md) is **immutable and is not edited**. It remains exactly as committed in
`6ac959fef2883ae6bb14427c0f1a92cc54d43a65`, blob `aad8377e3ec25ee5370d3c340a02ccebff8b3571` at H9.
This section repairs its two omissions **prospectively**, by adding here what 008 required there.

Measured against [008](../../008-implementation-report.md), that record omitted two things:

1. **Meaningful file/section/contract references for its severity findings.** Each of K01-R8-01 through
   K01-R8-04 was recorded as a one-sentence statement of the defect without naming the worksheet
   section, decision ID or contract criterion a reviewer or implementer should open. The findings were
   actionable in substance — round 9 fixed all four — but the record did not carry the references 008
   requires a recorded review to carry.
2. **The complete corrective prompt delivered with the round-8 CHANGES REQUIRED review.** The
   round-8 verdict was transmitted to the coding-agent session together with a long owner-supplied
   consolidation/correction prompt that defined round 9's scope, its target semantic model, its
   authorisation to rewrite the worksheet, its adversarial self-review obligation, its commit
   choreography and its validation plan. None of that reached the repository record, so the committed
   history did not explain why round 9 is a consolidation rather than a four-patch round.

Neither omission changes the round-8 verdict, the four findings or their round-9 disposition. Both are
supplied below and are the authoritative reference record for round 8 from this point forward.

### Supplied: exact H8 references for the four round-8 findings

These are the references [review-08.md](review-08.md) should have carried. All locations are in the
**H8** tree, `6290e68fb0231a6a8b4e6956d9a44afe7ac051ab` — worksheet blob
`75e5c6378bd569c3bce14a5c38b5a3a1ae6da33a` (Revision 8), `implementation-08.md` blob
`0cd56a0608157199572e53354635ee615acafa3d`.

| Finding | Severity | Exact H8 location | The conflict |
|---|---|---|---|
| **K01-R8-01** | P1 | H8 [protocol-worksheet.md](protocol-worksheet.md) §3 **B-2**, its `WAITING` bullet, against §5 **W-1**'s source-category eligibility rule | B-2 still stated eligibility as "matches at least one **dependency alternative** … **or** it is application input matching at least one **declared input subscription**", the two-independent-sufficient-conditions form W-1 had replaced in round 7. Contract criteria **K0.1-C5** (a contradiction resolved in the Kernel's favour must stay resolved) and **K0.1-C6**; canonical owner [kernel.md](../../../kernel.md) *Events and waits*, "application-input waits require a declared subscription". |
| **K01-R8-02** | P1 | H8 [protocol-worksheet.md](protocol-worksheet.md) §3 **B-1** and **B-7** against §5 **W-9**'s *Left open* paragraph | B-1 defined an Activation batch as a set of **Event** references; B-7 made the timeout observation a **mandatory member** of that batch; W-9 left open whether the observation is "an Event of a dedicated kind in the mailbox, a distinct field on the Activation's accepted-input contract, or another representation". The three have no common model. Contract criteria **K0.1-C2** (decisions, not open questions restated) and **K0.1-C6**; detail owner [execution-protocol.md](../../../detail-design/execution-protocol.md) *Wait registration, deadlines and liveness*, "order their acceptance and let the Runtime interpret the eligible batch". |
| **K01-R8-03** | P2 | H8 [protocol-worksheet.md](protocol-worksheet.md) §5 **W-1**, the *Scope note* immediately following the source-category rule | The source-category rule was stated as exact and then made conditional: whether a declared subscription may additionally name a non-input class was "left to K1.3". Contract criteria **K0.1-C2** and **K0.1-C6**; relevant owners [kernel.md](../../../kernel.md) *Events and waits* and [composition-and-communication.md](../../../detail-design/composition-and-communication.md), whose status line reads target **K4**. |
| **K01-R8-04** | P2 | H8 [implementation-08.md](implementation-08.md) *Interpretation and decisions* → *Reviewer focus for this round*, against §5 **W-2** and §3 **B-7** | The report itself named the gap — a wait registered with a deadline that has already passed — and recorded "two defensible answers" without deciding. W-2 specified only the mailbox check and B-7 only the asynchronous expiry path, so the registration-time case had no rule. Contract criteria **K0.1-C2** (concrete self-contained clock semantics) and **K0.1-C6**; owners [kernel.md](../../../kernel.md) lifecycle table and [execution-protocol.md](../../../detail-design/execution-protocol.md) wait-registration paragraph. |

### Supplied: the complete round-8 corrective prompt

Reproduced below **verbatim**, exactly as the owner delivered it to the coding-agent session together
with the round-8 CHANGES REQUIRED verdict. It is fenced so that its own separator lines, numbering and
emphasis are preserved as delivered rather than rendered as Markdown. Nothing is added, summarised,
reordered or omitted.

Two notes on reading it, neither of which alters the text:

- It names the review it was transmitting as "round 8" throughout and the work it commissioned as
  "round 9"; the repository records that work as correction round 9, payload C9
  `1b2ef1bd83681f302637ffd27c9630575289d37b` and candidate H9
  `00b30eb333024f7093c5a1db122a3772ca2b8b04`.
- Its section 5 is labelled a *target semantic model to test against canonical sources*, explicitly
  subject to being blocked rather than forced if it conflicted with a higher-priority owner. Round 9
  tested it, found no canonical conflict, and recorded that in
  [implementation-09.md](implementation-09.md).

```text
You are taking over an existing correction cycle for the ArrokothI `agent-kernel` repository.

This is NOT a routine “fix these four review comments” task.

Round 9 is a CONSOLIDATION / SEMANTIC-RECONSTRUCTION round for packet K0.1.

The previous workflow repeatedly fixed local defects correctly while exposing new contradictions between neighboring rules. Your job is to stop that pattern: reconstruct the complete K0.1 protocol as one state machine, prove it is internally consistent against the canonical architecture, then rewrite the current K0.1 worksheet as much as necessary to make that single protocol unambiguous.

Do not optimize for a small diff.
Do not optimize for “getting the reviewer to pass it.”
Do not preserve flawed wording merely because an earlier round added it.
Do not make a narrow patch if a broader rewrite inside the current K0.1 worksheet is needed.

The goal is a correct, coherent K0.1 contract that a K1 implementer can actually implement without discovering another interpretation gap.

Repository:
https://github.com/ArrokothI/agent-kernel

Branch:
codex/k0.1-protocol-legacy-disposition

================================================================================
1. REVIEWED HISTORY — PRESERVE IT
================================================================================

Original integration base:

6464be12c11eb75f7dfbc5ece12ca8d3020a5c15

Prior reviewed candidate H7:

6bdc53ad10d50e0e41bccf57bab212d406b7a2ce

Round-8 administrative review-record commit:

5dda5a7fce11b09f98118085ea7f57d46c8e077c

Round-8 payload C8:

40feb095d8e0f964bce854facd90f51d23633380

Round-8 reviewed candidate H8:

6290e68fb0231a6a8b4e6956d9a44afe7ac051ab

H8 is immutable reviewed history.

Do NOT:
- amend H8;
- rebase reviewed history;
- force-push;
- rewrite or delete any prior review;
- rewrite or delete any prior implementation report;
- rewrite prior evidence;
- edit `implementation-04.md`;
- “clean up” historical records for aesthetics.

Round-8 H8 artifact blob identities:

- contract.md
  a18343820301f181740492a3ee65b44db317237f

- protocol-worksheet.md Revision 8
  75e5c6378bd569c3bce14a5c38b5a3a1ae6da33a

- review-07.md
  851efc09d42d8d02e314cd815599efb204681033

- implementation-08.md
  0cd56a0608157199572e53354635ee615acafa3d

Verify those blob identities against H8 before editing anything.

================================================================================
2. ROUND-8 INDEPENDENT REVIEW — RECORD IT FAITHFULLY
================================================================================

Independent reviewer:

GPT-5.6 Sol, High reasoning

Review date:

September 11, 2026
America/New_York

Reviewer access:

Independent pinned GitHub source inspection.
No executable local checkout.
No shell rerun of validation commands.

Round-8 criterion verdicts:

K0.1-C1 PASS
K0.1-C2 FAIL
K0.1-C3 PASS
K0.1-C4 PASS
K0.1-C5 FAIL
K0.1-C6 FAIL

007 K0.1 packet acceptance FAIL

Round-8 validation evidence availability PASS

Candidate C/H process identity PASS

K0.2/E0 and later executable proof DEFERRED

Findings:

K01-R8-01 — P1
B-2 still contains the old two-independent-sufficient-conditions eligibility rule and therefore still permits the application-input dependency-alternative bypass that W-1 was corrected to forbid.

K01-R8-02 — P1
The timeout observation has no coherent semantic home. B-1 says Activation batches are Event references; B-7 says the timeout is mandatory in that batch; W-9 leaves open whether timeout is an Event, separate Activation field, or something else.

K01-R8-03 — P2
W-1 says non-application Events use dependency alternatives, then immediately leaves open whether K1.3 may allow subscriptions for non-input peer classes. That makes the supposedly exact current K0/K1 eligibility rule conditional on a future choice.

K01-R8-04 — P2
The worksheet/report deliberately leaves “wait registered with an already-expired deadline” undecided, despite K0.1-C2/C6 requiring concrete self-contained clock semantics.

Final round-8 review outcome:

CHANGES REQUIRED

First create:

docs/development/work/K0.1/review-08.md

Faithfully record the above review, including identities, blob SHAs, access limits, inspected-vs-rerun distinction, criterion verdicts, severities, and final outcome.

Do not invent a reviewer session identifier.

In the SAME administrative review-record commit, change only the K0.1 ledger row in:

docs/development/007-work-packets.md

to CHANGES_REQUESTED.

That administrative commit must contain only:
- review-08.md
- the K0.1 ledger edit

Preserve H8 exactly.

================================================================================
3. REQUIRED READING BEFORE YOU EDIT
================================================================================

Do not begin by editing the four findings.

First read and reconcile the complete semantic source set.

At minimum read:

Repository/process:
- AGENTS.md
- docs/development/001-current-status-and-roadmap.md
- docs/development/006-development-process.md
- docs/development/007-work-packets.md
- docs/development/008-implementation-report.md

Canonical architecture / detailed owners:
- docs/mental-model.md
- docs/kernel.md
- docs/execution.md
- docs/detail-design/execution-protocol.md
- docs/detail-design/recovery-and-compatibility.md
- docs/detail-design/composition-and-communication.md
- docs/detail-design/action-lifecycle.md
- docs/detail-design/evidence-and-observability.md

Current packet:
- docs/development/work/K0.1/contract.md
- docs/development/work/K0.1/protocol-worksheet.md
- review-01.md through review-08.md
- implementation-01.md through implementation-08.md

Read-only current-code evidence:
- packages/core/src/interaction/event-envelope.ts
- packages/core/src/interaction/events.ts
- packages/core/src/execution/context.ts
- packages/core/src/execution/lifecycle.ts
- packages/core/src/execution/cancellation-request.ts
- packages/core/src/execution/resumption.ts
- packages/core/src/ports/controller.ts
- packages/core/src/ports/controller-resumption.ts
- packages/core/src/reference/in-memory-runtime-store.ts
- packages/core/src/runtime/harness.ts
- packages/core/src/effects/pending.ts
- packages/core/src/definitions/types.ts

Architecture precedence is mandatory:

canonical architecture
>
detail design
>
development contract / worksheet
>
tests/examples/current implementation
>
historical reports

If current code disagrees with target architecture, classify/migrate/refuse it.
Do NOT change target semantics merely to fit current 0.8.x behavior.

If two canonical owners genuinely conflict and there is no principled resolution already implied by architecture, STOP and report:

BLOCKED_ARCHITECTURE

with:
- exact conflicting passages;
- affected K0.1 rule;
- smallest owner decision needed;
- options and consequences.

Do not silently choose.

================================================================================
4. PRE-EDIT SEMANTIC RECONSTRUCTION — MANDATORY
================================================================================

Before editing the repository, reconstruct the target K0/K1 protocol as ONE state machine.

Use a private scratch matrix if convenient, but do not rely on intuition.

For every scenario below determine ALL of:

- starting lifecycle state;
- authoritative accepted fact/boundary;
- whether an Event exists;
- Event/source category;
- wait generation;
- wait registration state;
- lifecycle transition;
- recoverable readiness created;
- exact next-batch eligibility;
- mandatory next-batch member(s);
- acceptance ordering;
- batch reservation point;
- acknowledgment point;
- crash/recovery behavior;
- replay/takeover behavior;
- what remains queued/unacknowledged.

You must cover at least these cases:

1. Ordinary READY with backlog.
2. Outcome registers a wait and no eligible Event exists.
3. Outcome registers a wait and an eligible correlated Event was already accepted.
4. Outcome registers a subscription-only application-input wait and matching input was already accepted.
5. Outcome registers a wait whose deadline is already due.
6. Already-due deadline AND a previously accepted eligible Event both exist.
7. WAITING then ordinary application input arrives with matching subscription.
8. WAITING then ordinary application input arrives without matching subscription.
9. WAITING has dependency alternative `kind=external.input`, ordinary application input arrives, but no subscription matches.
10. WAITING then non-application correlated result arrives.
11. WAITING then current-generation deadline expires.
12. Stale timer for superseded generation fires.
13. Timeout accepted first, correlated result arrives before Activation reservation.
14. Correlated result accepted first, then deadline becomes due.
15. Batch bound = 1 for Event wake with older ineligible backlog.
16. Batch bound = 1 for timeout wake with older ineligible backlog.
17. Crash after Event acceptance/readiness but before scheduler notification.
18. Crash after timeout acceptance/readiness but before reservation.
19. Crash after Activation dispatch intent/reservation but before delivery.
20. Authorized takeover after dispatch reservation.
21. Child terminal result commits only a durable routing obligation; parent Event does not yet exist.
22. Later fulfillment accepts that child-result Event into parent mailbox.
23. Message whose success boundary itself is durable destination-mailbox acceptance.
24. Subscribed correction wakes while original dependency remains logically needed by Runtime.
25. Runtime re-registers that dependency in its next Outcome.
26. Timeout then later authenticated result after the timeout-triggered Activation was already reserved.
27. Terminal completion with unrelated queued application input.
28. Cancellation racing current Activation Outcome.
29. Runtime-local native/model promise with no Kernel-visible dependency.
30. Result arrives before a later wait explicitly correlating to it.

Do not edit until this matrix has exactly one answer per scenario.

If two current worksheet sections give different answers, record that as an internal defect and fix it even if it was not one of the four round-8 findings.

This is important:

ROUND 9 IS NOT LIMITED TO THE FOUR ROUND-8 FINDINGS.

You are required to proactively find and correct any additional K0.1-internal contradiction that the complete reconstruction exposes.

Do not manufacture extra scope, but do not knowingly leave a defect merely because the reviewer did not already name it.

================================================================================
5. TARGET SEMANTIC MODEL TO TEST AGAINST CANONICAL SOURCES
================================================================================

Treat the following as the intended resolution of the round-8 findings, UNLESS your canonical-source reconstruction proves one of them conflicts with a higher-priority owner. If that happens, block rather than forcing it.

A. ACTIVATION BATCHES

B-1 remains:

An Activation batch is a finite, explicit, enumerable set of accepted Event references pinned at dispatch reservation.

No global cursor semantics.

Whole reserved batch acknowledged only by accepted Outcome.

Unselected Events remain independently queued.

B. ORDINARY APPLICATION INPUT

Ordinary application input is defined by trusted ingress provenance, not merely its current Event-kind spelling.

For K0/K1:

ordinary application input has exactly ONE wait-eligibility path:

declared input subscription.

A dependency alternative matching its Event ID/kind/correlation MUST NOT make it eligible.

No alternative `kind=external.input` bypass.

C. NON-APPLICATION KERNEL EVENTS

For the K0/K1 contract:

non-application Kernel Events become eligible through dependency alternatives using the exact W-1 identity/kind/correlation selector grammar.

Do not make the current K0/K1 rule conditional on a later K1.3 choice.

If future K4 composition adds subscription-capable addressed peer/clarification input, state that as a VERSIONED K4 interaction-contract extension.

Do not leave current K1 semantics open.

D. DEPENDENCY SELECTOR GRAMMAR

One alternative may supply any non-empty subset of:

- exact Event identity;
- one Event kind or non-empty finite kind set;
- exact correlation identity.

Within an alternative: AND.

Between alternatives: ANY-OF.

At least one field required.

Supplied empty kind set invalid.

Payload/body not selectable.

No callbacks, predicates, query language, model text, regex, ranges, negation, etc.

Legacy mapping:

current `eventKinds: []` means target Kind field absent;
current `correlationId: null` means target Correlation field absent.

`[] + null` maps to no supplied fields and is invalid as a target alternative.

E. TIMEOUT OBSERVATION

Resolve the semantic-home ambiguity.

A wait timeout observation is, semantically, a KERNEL EVENT for:

- mailbox accounting;
- Activation batch reservation;
- whole-batch acknowledgment;
- replay/recovery.

It has at least:

- stable Event identity;
- destination Execution;
- semantic timeout class;
- exact wait-generation correlation;
- trusted Kernel timer/deadline provenance.

Exactly one timeout Event may be accepted per wait generation.

Duplicate/replayed delivery of the same already-accepted timeout must not create:
- a second timeout Event;
- a second readiness transition;
- a second logical timeout.

The exact concrete wire kind token, TypeScript discriminant, encoded schema and storage layout remain later implementation/version choices.

Current 0.8.x having no timer Event kind is a CURRENT-CODE GAP, not a reason to leave target semantics outside the Event protocol.

F. TIMEOUT IS NOT A DEPENDENCY MATCH

The timeout Event is not required to satisfy a W-1 dependency alternative.

It is produced because the current-generation deadline itself expired.

Therefore the deadline-triggered batch is:

mandatory timeout Event
+
zero or more ordinary Events that are eligible under the RETIRED wait's W-1 eligibility rule and are accepted before reservation,

subject to the normal batch bound.

At batch bound 1, the mandatory timeout Event occupies the slot.

Any later correlated result remains durable and unacknowledged.

G. WAIT-ENDED READINESS

There is one coherent concept:

wait-ended recoverable readiness

with at least two causes:

1. eligible Event ended the wait;
2. current-generation deadline ended the wait.

It survives crashes until the immediately resulting Activation's batch is durably reserved.

At reservation:
- the exact batch becomes immutable for that Activation;
- wait-ended readiness is consumed;
- replay/takeover uses the same Activation/batch;
- it does not re-arm.

Do not revive the retired wait.
Do not introduce per-alternative satisfied state.
Do not add a new lifecycle state.

H. EVENT-TRIGGERED WAIT END

Eligible Event wake:

- retire wait/generation;
- set READY;
- persist recoverable wait-ended readiness;
- next batch selected under the retired wait's eligibility rule;
- at least one eligible Event mandatory;
- older ineligible backlog cannot displace it.

Two acceptance paths remain:

Path A:
eligible Event already exists during Outcome acceptance / atomic wait registration check.

Path B:
Execution was WAITING; Event accepted later at its own authoritative ingress/settlement/destination Event-acceptance boundary.

Path B has no Runtime Outcome.

I. ALREADY-DUE DEADLINE DURING WAIT REGISTRATION

This must no longer be left open.

During Outcome acceptance of `await(wait)`:

1. Perform W-2's atomic check for already-accepted unacknowledged eligible Events.

2. If an eligible Event already exists:
   - that Event was already accepted;
   - B-6 path A wins;
   - retire the just-proposed wait;
   - READY with Event-triggered readiness;
   - do NOT create a timeout Event for that retired generation.

3. If no eligible Event exists:
   evaluate the wait deadline at this acceptance boundary.

4. If already due:
   in the SAME Outcome-acceptance transaction:
   - retire the just-created generation;
   - create exactly one timeout Event for it;
   - set READY;
   - commit deadline-triggered recoverable readiness;
   - never persist durable WAITING for that generation.

5. If deadline is not due:
   persist WAITING;
   later expiry follows the asynchronous deadline path.

Use one accepted-time observation/profile.
Exact clock implementation is implementation-owned.

This gives deterministic ordering:
preaccepted eligible Event first;
otherwise already-due deadline.

J. LATER DEADLINE EXPIRY

If the Execution actually reached WAITING:

acceptance of a current-generation deadline expiry must atomically:

- accept the one timeout Event;
- retire wait/generation;
- set READY;
- commit deadline-triggered recoverable readiness.

A stale timer for a superseded generation is a no-op.

K. TIMEOUT / RESULT RACES

Preserve both facts.

Timeout does not mean action failure.

If timeout accepted first and result accepted before reservation:

- timeout remains mandatory;
- result is an ordinary eligible candidate if it matched the retired wait rule;
- bound >= 2 may contain both;
- bound 1 contains timeout; result remains durable and unacknowledged.

Do not discard or rewrite either fact.

L. ROUTING OBLIGATION VS DESTINATION EVENT

A durable routing obligation is not itself destination Event acceptance.

Child terminal commit may create:

terminal result + durable parent-routing obligation

without yet creating the parent mailbox Event.

Parent is not READY merely because that obligation exists.

Recovery replays/idempotently fulfills the obligation.

Only when fulfillment actually accepts the destination Event into the parent's mailbox does B-6 Event/readiness logic apply.

A profile may combine both into one transaction, but K0.1 does not require that.

Never fabricate destination readiness before the destination Event exists.

M. RUNTIME-LOCAL WORK

Native/model promises that have not crossed a Kernel dependency boundary remain Runtime/Driver-private.

They do not create Kernel WAITING.

The current Activation stays RUNNING/unresolved until Runtime submits an Outcome.

N. SUBSCRIBED CORRECTION / PEER INPUT

Any eligible wake retires the current wait.

If the Runtime still logically needs another dependency after processing a correction, it reports/registers that dependency again in its next Outcome under a new wait generation.

Kernel does not retain a “primary dependency still unsatisfied” flag.

================================================================================
6. REWRITE STRATEGY — YOU MAY RESTRUCTURE THE WORKSHEET
================================================================================

You are explicitly authorized to substantially rewrite:

docs/development/work/K0.1/protocol-worksheet.md

inside K0.1 scope.

You do NOT need to preserve the current paragraph structure.

Preserve stable decision IDs where practical:
B-1...
B-7...
W-1...
W-9...
etc.

But you may:
- rewrite their normative content;
- consolidate duplicated prose;
- replace repeated paraphrases with one normative table plus cross-references;
- delete stale explanations from the CURRENT worksheet;
- move examples beside the rule they test;
- clearly mark obsolete prior wording as superseded in revision history instead of keeping contradictory live prose.

Historical implementation/review reports already preserve how the document evolved.
The current worksheet does not need to retain every obsolete paragraph merely for history.

In particular, strongly consider making one compact normative table covering:

Trigger / boundary
→ accepted fact/Event
→ lifecycle result
→ recoverable readiness
→ mandatory next-batch member
→ other eligible batch members
→ consumption point
→ recovery rule

for at least:

- preaccepted eligible Event during wait registration;
- later eligible Event while WAITING;
- already-due deadline during registration;
- later deadline expiry.

That is preferable to four long passages that can drift apart.

Do not change canonical architecture documents in this packet.

If the worksheet cannot be made consistent without changing a canonical owner, stop as BLOCKED_ARCHITECTURE instead.

================================================================================
7. SPECIFIC ROUND-8 DEFECTS THAT MUST DISAPPEAR
================================================================================

K01-R8-01:

B-2's stale WAITING rule must disappear.

Search the entire worksheet for paraphrases equivalent to:

"dependency alternative OR application input subscription"

and ensure none permit application input through the dependency branch.

Prefer B-2 saying:

“Apply W-1's source-category eligibility rule exactly.”

rather than restating it differently.

K01-R8-02:

Remove the semantic open choice:

“timeout may be an Event, a distinct Activation field, or another representation.”

At the semantic protocol level it is an Event.

Only encoding/storage spelling stays open.

Ensure:
- B-1 includes it naturally;
- B-3 acknowledges it naturally;
- B-7 does not require it to satisfy W-1;
- W-1 does not list timeout as an ordinary dependency Event;
- W-9 says exactly one timeout Event per generation;
- duplicate timer delivery is idempotent.

K01-R8-03:

Remove the scope note that says K1.3 may reinterpret subscriptions to select a non-input class.

For current K0/K1 semantics:
- app input → subscription;
- non-app Event → dependency alternative.

State that K4 may version-extend addressed clarification/peer-input semantics later.

Do not make current W-1 conditional on that future extension.

K01-R8-04:

Resolve already-expired deadline registration exactly as described above.

There must not be an unresolved “two defensible answers” note in implementation-09.

================================================================================
8. ADVERSARIAL PRE-COMMIT SELF-REVIEW — MANDATORY
================================================================================

After editing but BEFORE committing C9, stop implementing and act as the hostile independent reviewer.

Try to break your own protocol.

Do not merely re-read changed hunks.

Search the entire CURRENT worksheet for every normative occurrence of at least:

READY
WAITING
eligible
eligibility
subscription
dependency alternative
external.input
application input
peer
timeout
deadline
timer
generation
wake
wait-ended
recoverable readiness
batch
Event batch
acknowledge
accepted Outcome
routing
child
destination Event
acceptance order
mandatory
ordinary readiness

For every occurrence ask:
- Is this normative or historical?
- Does it agree with the one reconstructed state machine?
- Is it accidentally paraphrasing another rule differently?
- Does it create another eligibility path?
- Does it confuse obligation creation with Event acceptance?
- Does it confuse timeout Event creation with dependency matching?
- Does it leave a K0-owned behavior to K1 as an open choice?
- Does it create a crash window?
- Does it allow bounded batching to hide the trigger Event?
- Does it rely on an Event that has not actually been accepted yet?

Explicitly adversarially test:

1. dependency alternative `kind=external.input`, no subscription;
2. input subscription only, no dependency list;
3. batch bound 1;
4. older unmatched backlog;
5. preaccepted Event + already-due deadline;
6. no preaccepted Event + already-due deadline;
7. timeout then result before reservation;
8. result then deadline;
9. stale timer;
10. duplicate timer delivery;
11. crash before reservation;
12. takeover after reservation;
13. child routing obligation with no parent Event yet;
14. application input whose kind accidentally matches a dependency alternative;
15. peer message under current K0/K1 semantics;
16. Runtime-local promise;
17. result accepted after the old wait retired but before a later wait explicitly correlates to it.

If you discover ANY additional internal K0.1 contradiction:
FIX IT NOW if it is resolvable from canonical sources and remains inside K0.1 scope.

Do not knowingly leave it for “round 10.”

If you discover a genuine higher-level ambiguity:
do NOT guess;
do NOT mark WAITING_FOR_REVIEW;
report BLOCKED_ARCHITECTURE.

================================================================================
9. LEGACY CLASSIFICATION / PREVIOUSLY FIXED AREAS — NON-REGRESSION
================================================================================

Recheck, do not casually rewrite, previously accepted decisions:

- Activation ID:
  one semantic exchange = one Activation ID;
  takeover changes writer epoch under same Activation ID.

- Runtime-local work:
  no Kernel-visible local promise wait.

- Effect refusal in K1:
  unsupported Effect content rejects whole Outcome at envelope validation before any Effect intent exists.

- canonical encoding E-7:
  RFC 8785/JCS-compatible UTF-16 property ordering;
  stable ECMAScript number spelling;
  do not reopen unless an actual defect is found.

- canonical finite limits:
  remain concrete/testable.

- progress:
  opaque nested payload migrates;
  closed Agent/Workflow discriminator does not.

- revision:
  current generic `revision` is not automatically semantic `base_progress_revision`.

- legacy vocabulary:
  exactly:
  Migratable
  Legacy-only
  Refused

No fourth classification.

- `PendingOperation`:
  universal abstraction remains Legacy-only.

- `REF-4`:
  monotonic mailbox cursor refused for target K1.

- `MIG-5`:
  matcher migrates only as the appropriate kind/correlation component;
  it is not the whole target eligibility rule;
  it does not create an application subscription.

- `LIM-1`:
  remains outside legacy disposition table.

- historical C/H/evidence process fixes:
  do not regress.

================================================================================
10. CURRENT-CODE MIGRATION CROSS-CHECK
================================================================================

Recheck `MIG-5` and `REF-5` after the semantic rewrite.

`MIG-5` should say, in substance:

- `eventSatisfiesWake` can be reused for kind/correlation comparison in a target dependency alternative;
- exact Event ID needs the additional equality check;
- legacy `eventKinds: []` maps to target Kind absent;
- legacy `correlationId: null` maps to target Correlation absent;
- [] + null maps to no target selector and is invalid;
- matcher alone is NOT target eligibility;
- ordinary application input still requires the separate subscription branch;
- timeout Event creation/eligibility is NOT performed by this matcher.

`REF-5` should continue refusing the old target wait-record shape:
- one `wake`;
- optional `interleave`;
- no finite differently-correlated alternatives;
- no exact Event identity field;
- no declared-input subscription list;
- sentinel-encoded absence;
- wrong target semantics for K1.

Do not reintroduce `interleave`.

================================================================================
11. CONTRACT / REVISION RECORD
================================================================================

Update:

docs/development/work/K0.1/contract.md

only as needed for:
- round-8 correction history;
- any genuinely necessary clarification of the K0.1 command/review contract.

Do not weaken acceptance criteria.

Update worksheet revision to Revision 9.

Revision history must accurately explain:
- round-8 findings;
- the holistic reconstruction;
- any additional internal defect found and fixed in this same round.

Do not call newly discovered defects “reviewer findings” unless the independent review actually named them.
Call them implementer-discovered consistency defects if applicable.

================================================================================
12. COMMIT CHOREOGRAPHY
================================================================================

Required sequence:

H8
→ administrative review-08 commit
→ C9 payload
→ final validation on CLEAN C9
→ H9 report/status-only commit

No rewrite of H8.

C9 may modify ONLY:

docs/development/work/K0.1/contract.md
docs/development/work/K0.1/protocol-worksheet.md

The C9 diff may be substantial.

A substantial worksheet rewrite is ACCEPTABLE.

Diff size is not a success metric.
Semantic coherence is.

================================================================================
13. FINAL VALIDATION AT CLEAN C9
================================================================================

Do not run final validation until:

- C9 exists;
- HEAD is exactly C9;
- working tree is clean.

Then run:

npm run check:builder-docs

npm run typecheck

Strict cumulative:

git diff --check \
  6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 \
  <C9>

The ONLY permitted findings are the two already-approved immutable historical lines in:

docs/development/work/K0.1/implementation-04.md

Then run cumulative with only blank-at-eol disabled:

git -c core.whitespace=-blank-at-eol diff --check \
  6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 \
  <C9>

Must exit 0.

Then strict current correction delta:

git diff --check \
  6290e68fb0231a6a8b4e6956d9a44afe7ac051ab \
  <C9>

Must exit 0 with NO exception.

Also run:
- K0.1 relative-link/anchor audit;
- cumulative diff stat base..C9;
- correction diff stat H8..C9;
- git status --porcelain;
- explicit history-preservation checks for every prior review/report/evidence directory.

`npm test` remains unnecessary if no executable/test file changes.

Do NOT add evidence files/scripts after C9 validation.

For small raw output, put it directly into implementation-09.md.

Preserve the already-approved historical whitespace rendering exception:
if the strict cumulative command echoes the two offending lines with trailing spaces, strip only those two trailing spaces in the Markdown rendering and disclose that exactly.

================================================================================
14. IMPLEMENTATION REPORT / H9
================================================================================

After validation, create:

docs/development/work/K0.1/implementation-09.md

The report must include:

- base;
- H8;
- review-08 administrative commit;
- C9;
- candidate H9 identity convention;
- branch;
- clean-tree state;
- remote;
- exact scope;
- exact validation outputs;
- evidence-rendering exception;
- no tests claim beyond what ran.

Disposition EACH round-8 finding separately:

K01-R8-01
K01-R8-02
K01-R8-03
K01-R8-04

For each:
- state exact defect;
- exact final rule;
- exact worksheet location;
- deterministic counterexample(s);
- how the corrected rule prevents the defect.

Also include a section:

“Holistic semantic reconstruction”

summarizing the final unified state machine, preferably with a compact table covering:

- Event-present-at-registration;
- later Event wake;
- already-due deadline;
- later deadline expiry;
- application-input category;
- timeout Event;
- routing obligation vs destination Event;
- readiness lifetime through reservation.

Also include:

“Adversarial self-review”

with the counterexamples you attempted and whether any additional consistency defects were found and corrected before C9.

Do not claim acceptance.

Do not say “no unresolved issue” if you actually found one and left it open.

Do not put “two defensible answers” or similar language around K0.1-owned semantics and still mark review-ready.

If any K0.1 semantic ambiguity remains:
do NOT create WAITING_FOR_REVIEW H9.
Use the appropriate blocked/in-progress state.

If everything is coherent, update only the K0.1 ledger row to:

WAITING_FOR_REVIEW

and create H9 containing ONLY:

docs/development/work/K0.1/implementation-09.md
docs/development/007-work-packets.md

Verify:

git diff --stat <C9> <H9>

contains exactly those two files.

Status wording should say raw outputs are reproduced subject to the documented historical-whitespace rendering exception, not falsely claim literal verbatim reproduction.

================================================================================
15. REMOTE / PUSH
================================================================================

Push fast-forward only.

No force push.

Verify the advertised remote branch SHA after push.

Report full SHAs for:

- base
- H8
- review-08 commit
- C9
- H9

Also report:

- remote advertised SHA;
- working-tree cleanliness;
- base..H9 scope;
- H8..C9 payload scope;
- C9..H9 administrative scope;
- validation observations;
- any semantic defect discovered beyond the four review findings.

================================================================================
16. NON-GOALS
================================================================================

Still packet K0.1 only.

Do NOT start:

- K0.2;
- E0 execution;
- K1 implementation;
- K2 implementation;
- K4 implementation;
- database work;
- scheduler implementation;
- persistent substrate;
- native recovery;
- isolation;
- process-kill testing;
- new third-party dependencies;
- successor packets.

Do not modify packages/* or tests/*.

Do not self-accept.

Do not merge to main.

Do not release K0.2.

================================================================================
17. QUALITY BAR
================================================================================

The success condition for this session is NOT:

“all four reviewer comments have edits next to them.”

The success condition is:

“A K1 implementer can read Revision 9 as one coherent protocol and cannot derive two different answers for the same lifecycle/input/wait/deadline/crash scenario.”

Before declaring C9 complete, ask yourself:

If an independent reviewer invents a new counterexample rather than merely checking my four edits, where is the most likely contradiction?

Attack that area yourself.

Do not save an obvious defect for the next round.

If a broader rewrite of the worksheet is what it takes to make K0.1 coherent, do the broader rewrite.
```

## Outcome

CHANGES REQUIRED

Disposition of both findings is recorded in [implementation-10.md](implementation-10.md).
