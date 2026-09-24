# Independent review — K1.2 Outcome acceptance and receipts, round 1

## Identity

- Reviewer: ChatGPT independent reviewer.
- Model: GPT-5.6 Sol.
- Date: 2026-09-24.
- Stable opaque session identifier: not exposed by this environment.
- This session did not implement the candidate.
- Governing baseline B: a20d278185eaffc7f8b7489345a3624231ff6e6d.
- Payload C: 4babb6ee9550479c09e75d80cb8c17e8fc042b18.
- Reviewed H: 3b88d32733b89f32744251d71b2d70a8684ccd55.
- Branch: claude/k1.2-outcome-acceptance-receipts.
- Contract: docs/development/work/K1.2/contract.md, revision 1.
- Policy baseline: AGENTS.md, mental-model/README.md, docs/development/README.md, 006, 007, 008 and 012 at B.

Acceptance, if it were earned, would bind exactly H. This review does not certify any later administrative or merge commit.

## Access and limits

I had GitHub-connector read access to exact commits, repository files, commit metadata, branch metadata,
comparisons, source, tests, development records and all validation-01 artifacts committed at H. The
branch head was verified as H immediately before recording this review.

I did not independently rerun the candidate. The execution environment available to this session did
not provide a network checkout of the repository. The candidate's raw committed logs were therefore
inspected as immutable evidence, not represented as reviewer reruns. Under 006 this does not by itself
block acceptance when adequate immutable evidence is available.

I obtained and inspected the complete base-to-H changed-file inventory, the complete changed target
Kernel source, the new K1.2 tests, every modified pre-existing test patch, the Layer-3/reference edits,
the contract, implementation report, ablation runner and all eight raw validation attachments.

A second reviewer record was supplied by the owner outside the repository after my first review. I
treated it as owner-supplied supplemental evidence, not as authority to weaken or replace this review.
I independently checked its substantive claims against the governing B sources and H implementation.
Its reported reruns are not claimed here as my own observations.

## Release, prerequisites and candidate identity

K1.2 was released by the owner on 2026-09-16. The 2026-09-23 start hold was lifted on 2026-09-24
after the recorded prerequisite conditions, together with the B-5 scope amendment.

The K1.1 prerequisite integrations are ancestors of B. B..H is linear and consists of exactly two
commits: B -> C -> H. C contains the implementation payload. C..H contains only 007 status text,
implementation-01.md and validation-01/01..08; no package, test, script, mental-model or contract
payload changes occur in C..H.

## Independently derived coverage

Before relying on implementation-01.md, I derived the review surface from the packet seed and
contract plus the canonical/detail owners. The independent map covered:

1. scope and nondisclosure before caller-content observation;
2. replay/conflict ordering before fresh validation;
3. explicit exchange, epoch and base-progress claims;
4. whole-envelope validation and whole-proposal refusal;
5. one atomic accepted Outcome: whole batch, progress, Emissions, result and next state;
6. continue/complete/fail and B-5 terminal dispositions;
7. Effects/obligations/waits refusal;
8. retry versus takeover versus new exchange, including authenticated control and safe-replacement
   responsibility;
9. recovery-held and protocol-failure behavior, permitted recovery actions and retained recovery
   history;
10. late delivery and Outcome behavior, including exact attribution of delivery evidence;
11. receipts, evidence immutability, inspection and cross-scope nondisclosure;
12. boundary-value limits, hostile envelopes and single observation;
13. target-kernel structural ownership/dependency checks;
14. Layer-3/reference maintenance and dangerous-inference checks;
15. 006 evidence packaging and C/H administrative rules.

The full first pass continued after defects were found.

## Inspected validation evidence

The immutable logs at H report:

| Check | Inspected result |
|---|---|
| npm run typecheck | exit 0 |
| npm test | 2,436 tests; 2,436 pass; 0 fail/cancelled/skipped/todo; exit 0 |
| npm run test:kernel | 382/382 pass; exit 0 |
| npm run test:conformance | 1,945/1,945 pass; exit 0 |
| npm run test:sdk | 22/22 pass; exit 0 |
| npm run check:builder-docs | 72 Markdown files, 1,761 links/anchors, 38 imports; exit 0 |
| node docs/development/work/K1.2/ablations.mjs | clean control 382/382; 16/16 ablations rejected; exit 0 |

The environment attachment pins C and B, branch, clean porcelain output, Node 25.2.1, npm 11.6.2
and macOS 26.6.2 arm64. These results are mechanical evidence and do not substitute for semantic
coverage.

## Reconciliation with the owner-supplied supplemental review

Three blocking findings in the supplemental review are independently confirmed:

- held RUNNING inspection omits the permitted next actions required by
  mental-model/concepts/state.md and mental-model/mechanisms/evidence.md;
- accepted recovery/control decisions are transient status edits rather than retained Execution
  History, despite state.md naming recovery decisions as History and evidence.md requiring
  authenticated recorded commands;
- the same scope/visibility check used by inspect currently authorizes takeover, recovery declarations
  and protocol-failure reports, despite evidence.md stating that inspection privilege does not grant
  re-execution or settlement privilege.

The supplemental review's evidence-attachment observation is also factually correct: validation
attachments 02..08 do not themselves name C, environment and digest as 006 requires. The report
cross-binds them, but the explicit attachment rule still says each such attachment must carry that
identity.

I do not adopt the supplemental review's characterization that native takeover safety is merely a
later K3 concern. The canonical identity/recovery sources require safe replacement to be established
before the writer fence advances. After reconciliation, I treat that requirement as part of the
control-authority finding below rather than as a second overlapping finding: an authorized control
path may own/attest the Driver-side prerequisite, but ordinary inspection scope cannot stand in for it.

I also retain two defects from my first review that the supplemental review did not identify:
delivery-attempt attribution across takeovers and a false maintained description of the in-process
Outcome transaction.

## Findings

### K12-R1-AUTH-01 — P1 — inspection scope authorizes control and does not establish the takeover safety prerequisite

Affected criteria: C8, C9, C10 and C15.

Governing sources:

- mental-model/mechanisms/evidence.md: held/control text says control, reconciliation and authority
  changes use authenticated recorded commands; inspection privilege does not grant re-execution or
  settlement privilege.
- docs/development/007-work-packets.md K1.2 seed says the writer epoch advances only through an
  authenticated control.
- mental-model/concepts/identity.md writer-epoch section says authorizing takeover needs a separate
  Driver guarantee that native continuation is exclusive or otherwise safe to replace; absent that
  guarantee takeover is refused or held.
- mental-model/mechanisms/recovery.md requires permission to be established before replacement and
  fencing.

Candidate behavior:

- requestTakeover, recoverExecution and reportProtocolFailure all authorize by calling #visible with
  an AuthenticatedCaller. inspect uses the same visibility rule.
- ExecutionDriver exposes delivery, but no distinct control grant/capability or phase-safety result.
- requestTakeover comments state that "the caller authorizing this has made that determination", but
  the caller type and check do not distinguish an inspect-only principal or record an allocation of
  that responsibility.
- the tests use the same ordinary scope-bearing caller for inspection, ordinary application
  operations and takeover/recovery controls.

Counterexample:

A dashboard principal has visibility of tenant-a but no control role. It inspects the Execution,
learns Activation/epoch, then can clear a code hold by declaring all pins available, advance the
writer epoch through requestTakeover, or inject a protocol-failure hold. The prior Runtime attempt is
then fenced even though the caller's only demonstrated privilege was visibility and no Driver-safe
replacement prerequisite was established by the binding.

Impact:

A read principal can change control/re-execution state, and the phrase "authorized takeover" is not
supported by the binding. The same gap lets the candidate assume the separate Driver safety
determination rather than establish who is trusted to make it.

Required outcome:

The three exchange controls must be authorized through a control authority distinct from read-only
inspection, and the takeover control path must have a real owner for the canonical safe-replacement
precondition. Acceptable implementations are not limited to one patch. A Kernel-enforced grant or
capability is one form. An embedding-host allocation is another only if the owner approves that
semantic allocation through 006's planning path and the contract/baseline state the host's authority
and responsibility. In either form, an inspect-only principal cannot enter/clear holds or supersede
an attempt.

Validation:

Tests must distinguish inspect-only and control-authorized principals for all three controls, verify
zero control-state mutation for the inspect-only arm, and distinguish takeover with versus without
the safe-replacement authorization condition. An ablation that falls back to visibility alone must
fail.

### K12-R1-HOLD-01 — P2 — held RUNNING inspection omits permitted next actions

Affected criteria: C9 and C10.

Governing sources:

- mental-model/concepts/state.md recovery-held: inspection shows the reason and the permitted next
  steps.
- mental-model/mechanisms/evidence.md: held RUNNING must visibly show its reason and permitted next
  actions; this page's status is Minimum at K1.

Candidate behavior:

RecoveryHoldView exposes cause, reason, activationId and writerEpoch. Inspection does not expose which
operations are permitted/refused or what ends a hold.

The rules differ materially by cause. A code hold refuses redelivery and takeover and can be cleared
by an availability declaration or ended by the current valid Outcome. A protocol-failure hold refuses
redelivery but permits an authorized takeover or a valid Outcome. A caller currently learns those
rules only by hard-coding implementation knowledge or attempting controls; a refused attempt itself
creates a refusal record.

Required outcome:

Inspection of each standing hold must expose enough immutable information for an authorized reader to
know the permitted next actions and how the hold can end, without probing by mutation. The
representation is an implementation choice.

Validation:

Cover a code hold, a protocol-failure hold and both simultaneously. For each, compare inspected
permitted actions to actual acceptance/refusal of the corresponding controls and hold-ending paths.
A deliberately desynchronized inspection/action implementation must be caught.

### K12-R1-HISTORY-01 — P2 — recovery decisions are transient status edits and disappear from Execution History

Affected criteria: C9, C10 and C12.

Governing sources:

- mental-model/concepts/state.md Execution History explicitly includes recovery decisions.
- mental-model/mechanisms/evidence.md requires authenticated recorded commands rather than ad-hoc
  stored-status edits.
- OA-6 requires an explicit, inspectable recovery decision.

Candidate behavior:

recoverExecution sets/replaces/clears exchange.codeHold directly. reportProtocolFailure sets
protocolFailureHold. requestTakeover clears protocolFailureHold. Outcome acceptance resolves the
Activation and drops both hold fields. Resolved ExchangeView retains neither the hold nor the recovery
decision that entered/cleared it.

Counterexamples:

1. Report a protocol failure with a bounded diagnostic; take over; accept the replacement Outcome.
   The final inspection contains no evidence of the protocol failure or the recovery decision that
   cleared it.
2. Declare missing code, change which pin is missing, then declare all pins available. Final
   inspection can return to the same logical view as before the first declaration, so accepted
   recovery decisions leave less history than refused recovery commands.

Required outcome:

Accepted recovery/control decisions that explain entering, changing or ending a hold must remain as
immutable, scoped, inspectable Execution History after the standing hold changes or disappears. The
record must preserve the decision, exchange/epoch and causal reason/diagnostic, and must be
attributable to the authenticated control authority. This does not require inventing a new receipt
boundary. Idempotent duplicate commands may replay/reference existing evidence rather than create
unbounded duplicate records.

Validation:

Exercise hold entry, reason change, declaration clear, takeover clear and Outcome resolution, then
inspect after the hold is gone. Tests must show the history still explains what happened. Add a
distinguishing mutation/ablation that drops the historical record.

### K12-R1-DELIVERY-01 — P2 — retained delivery evidence cannot attribute each delivery to its writer epoch after takeover

Affected criterion: C12. C11's late-report mutation isolation otherwise passes.

Governing sources:

- mental-model/concepts/identity.md dispatch-and-delivery naming rule: always say what was delivered
  and to whom.
- execution-cycle delivery reporting boundary: each reporting capability is bound to the exact
  delivery attempt and a late report may update only that original record.

Candidate behavior:

DeliveryAttemptView contains only attempt ordinal, status and failure. ActivationView says its
deliveries span all Runtime attempts but exposes only the current writerEpoch. Resolved ExchangeView
exposes only the epoch whose Outcome was accepted and the last dispatch-intent receipt.

Counterexample:

Delivery 1 occurs at epoch 1, ordinary redelivery 2 at epoch 1, takeover advances to epoch 2,
delivery 3 occurs at epoch 2 and ordinary redelivery 4 at epoch 2. Inspection retains four rows but
does not retain enough information to reconstruct which writer epoch/Runtime attempt each row
delivered. A late settlement mutates the correct row internally, but the retained evidence cannot say
what that row was an attempt to deliver.

Required outcome:

Each retained delivery-attempt record must preserve enough identity to attribute it to the exact
Activation attempt/dispatch intent it carried across ordinary redelivery and takeover. The
representation is open.

Validation:

Cover mixed schedules with multiple redeliveries before and after takeover and late reports from both
epochs. Inspection must identify each attempt unambiguously while late reports remain isolated.

### K12-R1-DOC-01 — P2 — maintained transaction-choice text does not match the implementation

Affected criterion: C15.

The maintained baseline and rewrite index describe the in-process Outcome transaction as observing all
caller-owned fields, building every record, and only then mutating. The comment immediately above
#accept repeats that description.

But #accept calls #mint("outcome_acceptance", record) before building the Emission records, terminal
result, disposition plans, resolved exchange and retained Outcome decision. #mint increments
record.nextAcceptancePosition immediately.

This does not by itself prove an observable split acceptance under the current modeled failure paths,
because the rest of the region deliberately avoids caller-owned callbacks. It does make the binding's
maintained implementation-choice record factually false.

Required outcome:

The implementation and maintained transaction-choice records must describe the same real mechanism
while preserving the canonical all-or-none Outcome invariant. Correcting code or correcting the
record are both in scope if the resulting mechanism is semantically sound; this review does not
prescribe one patch.

Validation:

Add or retain a counterexample that exercises the failure/reentrancy boundary on which the chosen
atomicity mechanism relies, and make 002/rewrite-index/code comments agree with that mechanism.

### K12-R1-REC-01 — P2 — validation attachments 02..08 do not satisfy 006's attachment identity rule

This is a process/evidence-record finding, not a semantic Kernel defect.

006 says raw output attachments included with H must name C, command/environment and digest.
validation-01/01-tree-and-environment.txt names C/B/branch/environment, but attachments 02..08 begin
with command output and do not themselves name C, the environment and a digest. implementation-01.md
cross-binds the artifacts, so the payload is available and reviewable; nevertheless the explicit
attachment rule is not met.

Required outcome:

The correction round's raw output attachments must each carry their own candidate C identity,
command, relevant environment/config identity and digest as 006 requires. Do not modify old evidence
in place; produce the next round's new C/H/evidence sequence.

## Layer-3 and reference maintenance

The actual mental-model/concepts/identity.md change preserves its OPEN(implementation) marker and
records the in-process epoch representation only inside the implementation-choice note. No
specification page records candidate acceptance or release status.

The dangerous inferences around takeover creating a new Activation ID, whole-Outcome fencing,
cross-Activation epoch comparisons, atomicity versus durability, recovery-held RUNNING state,
acknowledgment semantics and target-specification/build-status separation are otherwise respected.

Reference maintenance still fails C15 because the transaction mechanism is inaccurately described.
The correction should also make the target baseline explicit that Kernel fencing does not itself stop
or exclude superseded native work; the authenticated control/safe-replacement owner is what must
establish that precondition. This documentation outcome is part of K12-R1-AUTH-01 rather than a
separate patch prescription.

## Per-criterion verdicts

| Criterion | Verdict | Independent rationale |
|---|---|---|
| C1 | PASS | Outcome and control paths scope before content/disclosure; hidden/missing behavior is directly exercised. |
| C2 | PASS | Exact replay returns original decision/receipt before terminal/currency validation; changed content conflicts. |
| C3 | PASS | Whole-envelope/current-exchange validation and root limits are exercised with whole-proposal refusal and no Kernel retry. |
| C4 | PASS | Observable accepted Outcome behavior is whole-batch/progress/Emission/result/next-state atomic in inspected schedules; the inaccurate implementation-mechanism record is charged to C15. |
| C5 | PASS | continue creates a new exchange on next dispatch; complete/fail terminate and never reopen. |
| C6 | PASS | B-5 terminal disposition is distinct from acknowledgment and terminal ingress/replay/conflict is exercised. |
| C7 | PASS | Effects, obligations and await are refused whole without fabricating later-packet records. |
| C8 | FAIL | K12-R1-AUTH-01: visibility is treated as takeover authority and no binding establishes who owns the canonical safe-replacement authorization. |
| C9 | FAIL | K12-R1-AUTH-01, K12-R1-HOLD-01 and K12-R1-HISTORY-01. |
| C10 | FAIL | K12-R1-AUTH-01, K12-R1-HOLD-01 and K12-R1-HISTORY-01. |
| C11 | PASS | Late Outcome and late delivery settlement isolation holds; exact delivery attribution is charged to C12. |
| C12 | FAIL | K12-R1-HISTORY-01 and K12-R1-DELIVERY-01: required retained evidence is incomplete. |
| C13 | PASS | Own-only/single observation, hostile envelope values, ambient sabotage and reentrancy are directly exercised. |
| C14 | PASS | Target Kernel remains private and the structural/dependency inventory and landing-zone guard are updated coherently. |
| C15 | FAIL | K12-R1-DOC-01 plus incomplete control/safe-replacement baseline description. |

No criterion is deferred.

Process/evidence compliance also FAILS K12-R1-REC-01 for the round-1 attachment metadata. This does not
make the evidence inaccessible; it requires correction in the next immutable evidence set.

## Coverage gaps

Not rerun by this reviewer:

- typecheck/tests/conformance/SDK/docs/ablations; the committed raw logs were inspected instead;
- macOS or the implementer's exact Node patch;
- model-backed evaluations, which the packet does not claim;
- process-death/persistence/native-driver fidelity, except where the canonical K1.2 takeover
  precondition constrains authorization of replacement.

Out of packet and not converted into failures:

- K1.3 waits/cancellation/deadlines;
- K2 Effects/action settlement;
- R1 provider/native fidelity implementation;
- K3 persistent process-fault recovery;
- K4.4 output reads/cursors;
- K5 retention depth;
- E1 gate closure.

## Reconciliation with implementation-01.md and prior findings

The report's green command counts agree with the raw logs I inspected. Its replay, whole-envelope
refusal, B-5, hostile-boundary, code-hold and ablation descriptions agree with the candidate.

The report does not cover K12-R1-AUTH-01, K12-R1-HOLD-01, K12-R1-HISTORY-01 or
K12-R1-DELIVERY-01. Its assertion that the takeover caller has already made the Driver safety
determination is not evidence of who is authorized to make that determination.

The report repeats the "build every record before the first mutation" claim contradicted by #mint,
so K12-R1-DOC-01 survives reconciliation.

The reported self-found redelivery-answer defect is closed in final C: redeliver snapshots the
resent Activation/receipt before invoking the reentrant Driver and takeover.test.ts distinguishes
the former broken behavior.

There is no prior independent K1.2 review round. No repeated-defect/local-minimum owner escalation is
triggered.

## Verdict and status transcription

CHANGES REQUIRED for K1.2 round 1 at reviewed H 3b88d32733b89f32744251d71b2d70a8684ccd55.

Open blocking findings:

- K12-R1-AUTH-01 — P1.
- K12-R1-HOLD-01 — P2.
- K12-R1-HISTORY-01 — P2.
- K12-R1-DELIVERY-01 — P2.
- K12-R1-DOC-01 — P2.
- K12-R1-REC-01 — P2.

No acceptance is recorded. No successor is released. No E1 result or K1 closure is claimed.

## Compact correction handoff

Correct the same released packet K1.2 on claude/k1.2-outcome-acceptance-receipts.

Base a20d278185eaffc7f8b7489345a3624231ff6e6d; reviewed H 3b88d32733b89f32744251d71b2d70a8684ccd55; review record docs/development/work/K1.2/review-01.md in the
administrative commit that records this verdict.

Open findings K12-R1-AUTH-01, K12-R1-HOLD-01, K12-R1-HISTORY-01,
K12-R1-DELIVERY-01, K12-R1-DOC-01 and K12-R1-REC-01; required outcomes and
counterexamples are in this record.

Owner supplemental decisions: none. If the correction chooses a host-allocation solution for
K12-R1-AUTH-01 instead of Kernel-enforced control authority, that semantic allocation requires owner
approval through 006's planning path before implementation.

Apply 006 and 012: close the affected subsystem — exchange controls, recovery holds, retained
recovery/delivery evidence and their reference descriptions — and dependent behavior, then re-review
the whole cumulative packet. Fix additional in-scope defects with separate provenance.

Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.

CHANGES REQUIRED
