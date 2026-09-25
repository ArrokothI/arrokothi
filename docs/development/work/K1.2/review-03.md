# Independent review — K1.2 Outcome acceptance and receipts, round 3

## Identity

- Reviewer: ChatGPT independent reviewer.
- Model: GPT-5.6 Sol.
- Date: 2026-09-24/25.
- Governing base B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
- Prior administrative review head A2: `19d77004b3d8fb9d2cbba9524770c250700016a9`.
- Round-3 payload C3: `5797bde3df2f3b6f91f255a0b08a6b42ad2d134d`.
- Reviewed candidate H3: `51d30370ef041106969dc75682ddf37081be1a34`.
- Branch: `claude/k1.2-outcome-acceptance-receipts`.
- Contract: `docs/development/work/K1.2/contract.md` revision 3 at C3.
- Governing process baseline: AGENTS.md, mental model, development front door, 006/007/008/012 at B.

Acceptance, if earned, would bind exactly H3. This review does not certify its own administrative
commit or any later merge.

## Access and validation provenance

The reviewer inspected the exact GitHub source at C3/H3, the A2..C3 correction delta, the cumulative
packet state, C3..H3 administrative/evidence delta, changed source/tests/contract/baseline/ablations,
and the round-3 validation attachments.

C3..H3 is administrative/evidence-only: `implementation-03.md`, `validation-03/01..08`, and the
K1.2 007 status-row update. No source, test, contract, baseline or script payload changes occur there.

The reviewer did not independently rerun the candidate in this environment. The committed round-3 logs
were inspected as immutable evidence. They report:

- `npm run typecheck`: exit 0.
- `npm test`: 2,489/2,489 pass, 0 fail/cancelled/skipped/todo.
- `npm run test:kernel`: 435/435 pass.
- `npm run test:conformance`: 1,945/1,945 pass.
- `npm run test:sdk`: 22/22 pass.
- `npm run check:builder-docs`: exit 0.
- ablations: clean control 435/435; 23/23 rejected.

Every validation-03 attachment inspected carries candidate C3, base, branch, exact command,
environment/config and output digest. Attachment 01 now includes the fields missing in round 2.

## Trajectory assessment

K1.2 continues to **converge with substantial improvement**.

Round 3 closes the only new semantic blocker from round 2, K12-R2-TAKEOVER-01. The correction now
treats `isSafeToReplace` as a reentrancy boundary: after that callback it re-establishes terminal/open
exchange identity, writer epoch and code-hold state before committing, and no further Driver/host code
runs between the final check and mutation. The new suite distinguishes nested takeover, a current
nonterminal Outcome, a terminal Outcome with B-5, and a code hold created inside the callback. B6
removes the protection and is rejected.

Round 3 also closes K12-R1-REC-01: the new immutable evidence set satisfies the per-attachment identity
shape, including attachment 01.

The round-2 AUTH/HOLD/HISTORY/DELIVERY closures remain intact. The kernel suite increased 429→435 and
the ablation set 21→23 while preserving previous distinguishing cases.

This is not oscillation: no previously removed authority ambiguity, hold opacity, history loss,
delivery-attribution loss or takeover callback race was reintroduced.

One documentation/mechanism defect remains in the same DOC-01 family, but it has narrowed again to one
internal retained wrapper construction. That is evidence of incomplete exhaustive inspection in this
small transaction-mechanism area, not evidence that the overall implementation is cycling between
designs.

No implementation-agent switch is recommended solely from round 3. A final narrow correction can
reasonably stay with the current agent. Escalate/switch if the next round again claims complete
build-before-mutate alignment while another retained Outcome-decision record is still constructed
after mutation begins, or if that correction reopens one of the closed semantic families.

## Prior finding dispositions

### K12-R2-TAKEOVER-01 — closed

`requestTakeover` now revalidates accepted state after `isSafeToReplace` returns:

- terminal state is rechecked;
- the same `ActivationRecord` must still be the unresolved exchange;
- the exchange writer epoch must still equal the pre-callback current epoch;
- a code hold established during the callback is read again and blocks takeover.

After those checks there is no additional Driver/host callback before commit. The inspected tests assert
whole retained state for nested takeover, continuing Outcome, terminal Outcome/B-5 and mid-callback
code hold. B6 removes the revalidation block and the suite rejects the mutant.

No same-class stale pre-callback commit path was found in the corrected takeover flow.

### K12-R1-REC-01 — closed

`validation-03/01-tree-and-environment.txt` now explicitly contains C3, exact command,
environment/config and output-sha256 in addition to its raw output/exit/date. Attachments 02..08 retain
the same required self-identification shape. Round-2 evidence was not edited in place.

### K12-R1-AUTH-01 / HOLD-01 / HISTORY-01 / DELIVERY-01 — remain closed

The round-3 delta does not weaken separate control authority, Driver-owned safe replacement,
permitted-next-action inspection, retained recovery history or per-delivery Activation/epoch
attribution. Existing tests/ablations for those mechanisms remain in the green/rejected evidence.

## Open finding

### K12-R1-DOC-01 — P2 — the retained AcceptedOutcomeRecord wrapper is still constructed after mutation begins

Affected criterion: C15.

Round 3 correctly prebuilds the new `ended_by_outcome` recovery-history records before accepted-state
mutation begins. That closes the specific round-2 remainder.

However, `#accept` still performs this during the apply phase, after multiple accepted-state mutations
have already occurred:

```ts
mapSet(
  record.acceptedOutcomes,
  activationId,
  PrimordialObjectFreeze({ identity: outcome.identity, decision }),
);
```

The object constructed there is not incidental output. The source defines `AcceptedOutcomeRecord` as
"the retained decision an exact replay answers from", and `record.acceptedOutcomes` is the replay/
conflict index. Contract DEC-12 also explicitly treats accepted-Outcome records as retained state.

Yet DEC-10, the coordinator header/#accept comments and the implemented baseline state that every record
the Outcome decision needs is built before accepted state is mutated. Their enumerations mention the
Outcome decision but not the retained `AcceptedOutcomeRecord` wrapper that binds that decision to the
captured identity.

No caller callback or demonstrated exception occurs in this late wrapper construction, so this review
does **not** claim the observable Outcome commit currently splits. The defect is the same maintained
mechanism-description mismatch as DOC-01: the implementation still does not literally implement the
documented "all records built, then mutate" mechanism.

Required outcome: exhaust the complete set of records created by `#accept` and make the mechanism
statement true for all retained decision records, not just the instances named in prior reviews.
A straightforward correction is to prebuild the frozen `AcceptedOutcomeRecord` alongside `decision`
and `historyToAppend`, then only insert that prebuilt record during the apply phase. Another
implementation is acceptable if the maintained transaction description is changed to precisely match
the real mechanism while preserving canonical atomicity.

The next correction should explicitly inventory every object/record constructed before and after the
"decision, applied" boundary, so this family is closed exhaustively rather than one late construction
at a time. Add a focused structural/counterexample test or static assertion if useful; do not invent a
behavioral failure that the current synchronous mechanism does not actually exhibit.

## Per-criterion verdicts

| Criterion | Verdict | Rationale |
|---|---|---|
| C1 | PASS | Scope/nondisclosure ordering preserved. |
| C2 | PASS | Replay/conflict precedence preserved. |
| C3 | PASS | Whole-envelope/current-exchange validation preserved. |
| C4 | PASS | Observable Outcome atomicity remains supported; the open DOC finding is an implementation-description mismatch, not a demonstrated split commit. |
| C5 | PASS | Continue/terminal/next-exchange behavior preserved. |
| C6 | PASS | B-5 and terminal ingress preserved, including terminal Outcome inside the takeover safety callback. |
| C7 | PASS | Unsupported Effects/obligations/waits remain refused. |
| C8 | PASS | Post-safety-callback revalidation closes the round-2 stale-commit schedules. |
| C9 | PASS | Code-hold behavior and permitted/history evidence preserved. |
| C10 | PASS | Protocol-hold behavior and recovery paths preserved. |
| C11 | PASS | Late reports/Outcomes and delivery attribution preserved. |
| C12 | PASS | Retained evidence/immutability/nondisclosure remain supported. |
| C13 | PASS | Hostile-envelope/single-observation protections preserved. |
| C14 | PASS | Structural boundary/inventory remains coherent. |
| C15 | **FAIL** | K12-R1-DOC-01 remains narrowly open: the retained AcceptedOutcomeRecord wrapper is built after mutation starts while maintained text says every needed record is prebuilt. |

Process/evidence packaging passes for round 3. No criterion is deferred.

## Correction handoff

Correct the same released K1.2 packet. Preserve all semantic closures. The only blocking finding is
K12-R1-DOC-01 (P2).

Before editing, inventory every record/object constructed by `#accept` and mark whether construction
happens before or after the apply boundary. Reconcile that complete inventory against DEC-10,
coordinator comments and the implemented baseline.

Close the retained `AcceptedOutcomeRecord` mismatch and verify there is no other retained
Outcome-decision record still built after accepted-state mutation begins. Keep the current observable
atomicity, receipt contiguity, replay/conflict behavior, hold-ending history, immutability and hostile
boundary protections unchanged.

Create a new payload C, validate clean C, attach new immutable 006-compliant evidence, then create a
report/status H. Re-review the whole cumulative packet and correction delta. Do not self-accept, merge
or release a successor.

Trajectory remains converging. Stay with the current implementation agent for this narrow correction;
switch/escalate only if the next round again misses another record in the same transaction inventory
or destabilizes already-closed behavior.

CHANGES REQUIRED
