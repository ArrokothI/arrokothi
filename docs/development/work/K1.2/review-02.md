# Independent review — K1.2 Outcome acceptance and receipts, round 2

## Identity

- Primary reviewer: ChatGPT independent reviewer.
- Primary reviewer model: GPT-5.6 Sol.
- Date: 2026-09-24.
- Stable opaque session identifier: not exposed by this environment.
- Supplemental independent review: owner-supplied Arena.ai Agent Mode review from a separate session; that environment did not disclose its underlying model identity.
- Governing base B: a20d278185eaffc7f8b7489345a3624231ff6e6d.
- Round-1 payload C1: 4babb6ee9550479c09e75d80cb8c17e8fc042b18.
- Round-1 reviewed H1: 3b88d32733b89f32744251d71b2d70a8684ccd55.
- Round-1 review/status administrative commit A1: 0c0e644b9c9e621da6a3cd02732f50949f1c0744.
- Round-2 payload C2: c395abfb27c4a0bc7d5c18ed1d9edd2b8b840c47.
- Round-2 reviewed H2: da371b6a09d65b0242010d4fe46e51d64c9e2fbd.
- Branch: claude/k1.2-outcome-acceptance-receipts.
- Contract: docs/development/work/K1.2/contract.md revision 2 at C2.
- Governing process baseline: AGENTS.md, mental-model/README.md, docs/development/README.md, 006, 007, 008 and 012 at B.

Acceptance, if earned, would bind exactly H2. This record does not certify its own administrative
commit or any later merge.

## Access, candidate identity and evidence

The primary reviewer had GitHub-connector access to exact commits, full repository files, source,
tests, contract/reference records, commit comparisons and all round-2 validation attachments. The
branch was verified at H2 immediately before this administrative review commit.

The primary reviewer did not independently rerun the candidate: the available local environment could
not obtain a network checkout. The committed round-2 logs were inspected as immutable evidence, not
represented as primary-reviewer reruns.

The supplemental Arena.ai reviewer reports a full local checkout with B/C1/H1/A1/C2/H2 object
verification, full cumulative and correction-delta inspection, and reviewer reruns on Linux x86_64,
Node 22.22.3/npm 10.9.8. Its reruns reported typecheck exit 0; kernel 429/429; SDK 22/22; builder-docs
exit 0; and 21/21 ablations rejected when forcing the spec reporter. Its full/conformance runs had two
cancelled subtests in an untouched conformance file, reproduced identically at B and therefore recorded
as an environment observation rather than a candidate regression. Those reruns are supplemental
reviewer evidence; they are not claimed as reruns by the primary reviewer.

C2..H2 is administrative-only: implementation-02.md, validation-02/01..08 and the 007 K1.2 status
row. No source, tests, contract, script or baseline payload changed in C2..H2.

The round-2 implementation logs report typecheck exit 0, full 2,483/2,483, kernel 429/429,
conformance 1,945/1,945, SDK 22/22, builder-docs exit 0 and 21/21 ablations rejected.

## Trajectory assessment

The owner asked for progress assessment by **movement between rounds**, not merely by whether a defect
name has appeared before. On that measure K1.2 is **converging with substantial improvement**.

Round 1 exposed six broad problem families: control/safe-replacement authority, held-state guidance,
retained recovery history, delivery attribution, transaction-description accuracy and evidence
packaging. Round 2 materially changed the implementation and evidence in each area:

- control mutation is now separated from inspection through default-deny control authority;
- takeover now requires a Driver safe-replacement determination rather than assuming it;
- held RUNNING inspection exposes permitted next actions;
- accepted recovery decisions survive as retained Execution History;
- every delivery row carries its Activation/epoch attribution;
- the acceptance-position mutation was moved into the commit phase and transaction tests were added;
- evidence attachments 02..08 gained explicit candidate/command/environment/config/digest headers;
- the kernel suite grew from 382 to 429 tests and the distinguishing set from 16 to 21 ablations.

Four round-1 findings are independently closed: AUTH-01's original visibility/safe-owner defect,
HOLD-01, HISTORY-01 and DELIVERY-01. The new takeover defect is narrower: it is a reentrancy/TOCTOU
interaction introduced by the new safe-replacement callback, not a reversal to the old design.
DOC-01 and REC-01 are partial closures whose remaining defects are narrower than round 1.

This is **not oscillation**: the candidate has not alternated between incompatible authority models,
reintroduced removed delivery ambiguity, or removed retained recovery evidence. Previously closed
semantic behavior remains in place.

This is also **not a local minimum yet**. The remaining blocking surface is much smaller and has
concrete counterexamples. Continue with the current implementation agent if desired. Escalate or
switch implementation agents if the next correction fails to close the callback reentrancy class,
reopens one of the four closed families, or introduces another materially equivalent check-callback-
commit race without reducing the remaining surface. That would be evidence of stagnation; round 2
alone is evidence of convergence.

## Reconciliation with the supplemental independent review

The supplemental review and the primary review agree that C2/H2 is well-formed, the mechanical evidence
is broadly green, HOLD/HISTORY/DELIVERY are closed, the control-vs-inspection distinction is now real,
and the new isSafeToReplace callback creates an uncovered takeover reentrancy window.

The supplemental review classified K12-R2-TAKEOVER-01 as P2. This merged review adopts P2: the defect
violates C8 and retained control evidence, but requires trusted same-process Driver reentrancy and is
bounded to this control interaction rather than exposing an unauthenticated/external unsafe action.

Two supplemental-review closure claims are not adopted:

1. **K12-R1-DOC-01 is not fully closed.** The correction moved nextAcceptancePosition into the commit
   phase, which fixes the original example. But when an accepted Outcome ends a standing hold,
   #accept starts accepted-state mutation before it constructs the ended_by_outcome
   RecoveryHistoryRecord objects. The maintained text still says every record the decision needs is
   built before accepted state is mutated. The mechanism remains plausibly atomic in this in-process
   binding because the later path invokes no caller code, but the implementation-choice description
   is still factually inaccurate.
2. **K12-R1-REC-01 is not fully closed.** validation-02/02..08 have the required per-attachment
   candidate/command/environment/config/digest header. validation-02/01-tree-and-environment.txt
   names C/base/branch and environment values but does not name the command or carry a digest. 006
   says raw output attachments included with H must name C, command/environment and digest.
   implementation-02.md's claim that every attachment 01..08 independently carries those fields is
   therefore unsupported.

The supplemental review's P3 observations are retained below. Its interpretation that Outcome
submission may remain visibility-only is not promoted to a finding here: in the canonical vocabulary,
Outcome acceptance is not clearly the "settlement" whose privilege evidence.md separates, and the
contract deliberately preserves the Runtime Outcome path. No architecture verdict is manufactured
from that ambiguity.

## Prior finding dispositions

### K12-R1-AUTH-01 — closed

Round 1's actual defect is closed. requestTakeover, recoverExecution and reportProtocolFailure now
require controlScopes after visibility; an inspect-only visible principal receives
unauthorized_control and hidden/missing remain indistinguishable. Driver safe replacement is explicit:
isSafeToReplace absent/false/throwing refuses takeover as unsafe_replacement. The baseline and Driver
contract state that Kernel fencing does not itself stop native work.

The new callback reentrancy defect below has separate provenance and does not mean the old
visibility-equals-control implementation returned.

### K12-R1-HOLD-01 — closed

RecoveryHoldView now exposes permittedNextActions and the tests distinguish code hold, protocol hold
and both-held behavior against actual accepted/refused operations.

### K12-R1-HISTORY-01 — closed

recoveryHistory retains entered/updated/cleared_by_declaration/cleared_by_takeover/ended_by_outcome
records with actor and exchange/epoch causation across hold clearing, exchange resolution, later
dispatch and terminal state. Immutability and nondisclosure are exercised.

### K12-R1-DELIVERY-01 — closed

DeliveryAttemptView now retains activationId/writerEpoch per row. Mixed redelivery/takeover schedules
retain [1,1,2,2] attribution and late reports remain bound to their own row.

### K12-R1-DOC-01 — remains open, narrowed

The original acceptance-position-before-build defect was corrected. The remaining mismatch is only
the new recovery-history end records built after mutation has started. See finding below.

### K12-R1-REC-01 — remains open, narrowed

Attachments 02..08 now satisfy the self-identification shape. Attachment 01 still does not. See
finding below.

## New and surviving findings

### K12-R2-TAKEOVER-01 — P2 — isSafeToReplace is a reentrancy window between takeover validation and commit

Affected criterion: C8; retained receipt/evidence consequences also touch C12.

requestTakeover validates the current unresolved exchange, writer epoch and code hold, then calls
Driver.isSafeToReplace(exchange.activation). That is trusted same-process Driver code and can
synchronously reenter the coordinator. After the callback returns true, the outer request does not
revalidate that the same unresolved exchange/epoch/hold state still governs before minting a receipt,
advancing the epoch and delivering.

Distinguishing counterexamples:

- **Nested takeover.** isSafeToReplace reenters requestTakeover for the same Activation/epoch and then
  returns true. The inner call can commit epoch 2 and a dispatch-intent receipt; the outer call then
  resumes from its stale epoch-1 snapshot and can commit another takeover path/receipt/delivery
  instead of becoming stale.
- **Outcome during safety check.** isSafeToReplace submits a valid current Outcome and returns true.
  The Outcome can resolve or terminally complete the exchange, after which the outer takeover can
  still return success, mint a dispatch-intent receipt and deliver an Activation for an exchange no
  longer open.
- **Code hold during safety check.** isSafeToReplace reenters recoverExecution and creates a code
  hold, then returns true. The outer takeover already passed the code-hold check and can advance
  despite the newly established hold.

The required outcome is observable, not patch-specific: after any Driver/host callback invoked as
part of takeover, the decision must establish that the same unresolved exchange, current epoch and
relevant hold conditions still govern immediately before commit, with no further reentrant code
between that final validation and mutation; or use another design that gives the same guarantee.
One request must commit at most one takeover decision/receipt, and an exchange resolved or newly held
during the callback must make the outer request refuse rather than act on stale state.

Validation must distinguish at least nested takeover, terminal/current Outcome from the safety
callback, and code-hold creation from the safety callback. Assert the entire retained result:
lifecycle, activation, exchange list, receipt positions/references, deliveries, holds and refusal.
An ablation removing the post-callback protection must be rejected.

### K12-R1-DOC-01 — P2 — transaction description is still stronger than the implementation

Affected criterion: C15.

The round-2 header, BASELINE and #accept comment say every record the Outcome decision needs is built
before accepted state is mutated. For an Outcome that resolves one or two holds, #accept constructs
the Outcome receipt, Emissions/result, dispositions, resolved exchange and Outcome decision first,
then begins mutation (acceptance index, dispositions, progress, emissions, exchange, acceptedOutcome,
receipt), and only afterward calls appendRecoveryHistory to construct and append each
ended_by_outcome RecoveryHistoryRecord.

No caller-owned callback appears in that trailing history path, so this review does not claim an
observable split Outcome solely from that ordering. The maintained implementation-choice statement is
nevertheless false: not every record needed by the accepted decision is built before mutation.

Required outcome: either prebuild the hold-ending history records before the mutation phase, or record
the actual atomicity mechanism accurately if the architecture permits a different implementation.
In either case BASELINE, contract/DEC-10 if affected, coordinator comments and actual code must agree.
Add a test/counterexample that includes an Outcome ending standing holds so the documented mechanism
is exercised with the records introduced in round 2.

### K12-R1-REC-01 — P2 — validation attachment 01 still misses 006's per-attachment identity fields

This is a process/evidence finding, not a semantic Kernel defect.

006 states that raw output attachments included with H must name C, command/environment and digest.
validation-02/02..08 now do so. validation-02/01-tree-and-environment.txt contains C, base, branch,
clean status and raw tool/environment values, but has no named command and no digest. The round-2
report says all eight attachments independently include command/environment/config/output-sha256,
which is false for 01.

Required outcome: in the next immutable evidence round, make every output attachment in the declared
C..H allowlist satisfy 006 individually. Do not rewrite validation-02 or H2 in place.

### K12-R2-OBS-PERMITTED-01 — P3 — protocol-only hold wording versus no-op availability declaration

A protocol-only hold exposes request_takeover and submit_outcome, not declare_code_availability.
recoverExecution with fully available pins can nevertheless return an accepted changed:false answer
because there is no code hold to clear. This can be read consistently as "not refused for the hold",
so it does not violate a required criterion. The next correction may clarify wording/behavior if it
can do so without widening scope.

### K12-R2-PROC-01 — P3 — ablation runner depends on test-reporter output spelling

The supplemental reviewer reports that under Linux/Node 22, the unmodified ablation script parses
spec-reporter text but piped node --test emits TAP, so the script's control parser fails unless
--test-reporter=spec is forced. With the spec reporter the supplemental reviewer reproduced 21/21
rejected. The committed evidence remains valid for its recorded Node 25/macOS environment. Optional
hardening would improve cross-environment reproducibility but is not a gate.

## Per-criterion verdicts

| Criterion | Verdict | Rationale |
|---|---|---|
| C1 | PASS | Scope/nondisclosure ordering remains intact, including the new controls. |
| C2 | PASS | Replay/conflict precedence and exact retained decision behavior remain covered. |
| C3 | PASS | Whole-envelope/current-exchange validation and refusal semantics remain covered. |
| C4 | PASS | Observable accepted Outcome behavior remains whole and single-writer; DOC-01 is a C15 mechanism-description mismatch, not an independently demonstrated split commit. |
| C5 | PASS | continue/complete/fail and next-exchange/terminal behavior remain covered. |
| C6 | PASS | B-5 and terminal ingress remain covered. |
| C7 | PASS | Effects/obligations/waits remain refused at K1.2. |
| C8 | **FAIL** | K12-R2-TAKEOVER-01: the newly introduced Driver callback can invalidate the state checked before takeover commit. |
| C9 | PASS | Code-hold behavior, permitted next actions and history are materially corrected. |
| C10 | PASS | Protocol hold behavior, control gating, permitted next actions and history are materially corrected. |
| C11 | PASS | Late reports/Outcomes and delivery attribution remain correct in inspected schedules. |
| C12 | PASS | Retained semantic evidence/immutability/nondisclosure is materially corrected; TAKEOVER-01's orphan/control-receipt consequence is charged to the C8 decision defect that creates it. |
| C13 | PASS | Single-observation/hostile-envelope protections remain covered. |
| C14 | PASS | Structural inventory/landing-zone evidence remains coherent. |
| C15 | **FAIL** | K12-R1-DOC-01 remains: maintained transaction mechanism overstates build-before-mutate ordering once recovery-history end records are included. |

Process/evidence compliance also fails K12-R1-REC-01 for round-2 attachment 01. The evidence itself is
accessible; the defect is the mandatory attachment identity format.

No criterion is deferred.

## Coverage gaps

The primary reviewer did not rerun commands. The supplemental reviewer did, under a different
Linux/Node 22 environment, with the disclosed pre-existing cancellations and ablation-reporter note.

Out of packet and not converted into failures remain K1.3 waits/cancellation/deadlines, K2 action
semantics, R1 native fidelity, K3 persistence/process death, K4.4 output reads/cursors, K5 retention
depth and E1/K1 closure.

## Verdict and correction handoff

CHANGES REQUIRED for K1.2 round 2 at reviewed H2 da371b6a09d65b0242010d4fe46e51d64c9e2fbd.

Open blocking findings:

- K12-R2-TAKEOVER-01 — P2.
- K12-R1-DOC-01 — P2, narrowed from round 1.
- K12-R1-REC-01 — P2, narrowed from round 1.

Non-blocking observations:

- K12-R2-OBS-PERMITTED-01 — P3.
- K12-R2-PROC-01 — P3.

Round-1 K12-R1-AUTH-01, K12-R1-HOLD-01, K12-R1-HISTORY-01 and
K12-R1-DELIVERY-01 are closed and must remain closed.

Trajectory disposition: **substantial improvement / converging**. No implementation-agent switch is
required by progress evidence at this round. Reassess for escalation after the next round if the
callback reentrancy class survives, a closed family reopens, or another materially equivalent
check-callback-commit defect appears without further narrowing.

Compact handoff:

```text
Correct the same released packet K1.2 on claude/k1.2-outcome-acceptance-receipts.
Base a20d278185eaffc7f8b7489345a3624231ff6e6d; reviewed H da371b6a09d65b0242010d4fe46e51d64c9e2fbd; review record docs/development/work/K1.2/review-02.md
in the administrative commit that records this verdict.

Open blocking findings:
- K12-R2-TAKEOVER-01
- K12-R1-DOC-01
- K12-R1-REC-01

Round-1 AUTH/HOLD/HISTORY/DELIVERY findings are closed; preserve those closures.
P3 observations K12-R2-OBS-PERMITTED-01 and K12-R2-PROC-01 are optional.

Close the takeover callback/reentrancy interaction as one subsystem and exercise all three
distinguishing schedules. Make the Outcome transaction description true for hold-ending history.
Produce a new immutable validation set in which every declared attachment, including 01, carries
the 006 identity fields.

Apply 006 and 012 to the full cumulative packet and correction delta. Use 008 for the next report
and 006 for a new payload C / report-evidence H. No successor release, merge or self-acceptance.

Trajectory is converging. Keep the current implementation strategy unless this round fails to
substantially narrow the remaining callback/transaction/evidence surface; if it does, escalate or
switch implementation agents rather than cycling another equivalent patch.
```

CHANGES REQUIRED
