# Merged independent review reconciliation — K1.2 round-3 candidate

## Identity and purpose

This record reconciles two independent reviews of the **same** K1.2 round-3 candidate. It is not a
round-4 review and does not change the reviewed candidate.

- Governing base B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
- Payload C3: `5797bde3df2f3b6f91f255a0b08a6b42ad2d134d`.
- Reviewed H3: `51d30370ef041106969dc75682ddf37081be1a34`.
- Branch: `claude/k1.2-outcome-acceptance-receipts`.
- Contract: `docs/development/work/K1.2/contract.md` revision 3 at C3.
- Primary review: `docs/development/work/K1.2/review-03.md`.
- Supplemental review: owner-supplied Arena.ai Agent Mode independent review dated 2026-09-25.
  The platform did not expose the underlying model identity.
- Governing process/reference baseline: AGENTS.md, mental model, development front door and
  006/007/008/012 at B.

Acceptance, if it were earned, would bind exactly H3. This merged administrative record does not
certify itself or any later commit.

## Reconciliation method

The supplemental review was not copied mechanically into the ledger. Its substantive findings were
checked against H3/C3 source and the pinned canonical/binding text.

The supplemental reviewer reports a full clone, cumulative review, targeted probes and reviewer
reruns on Linux x86_64, Node 22.22.3/npm 10.9.8. Its reruns report typecheck 0, kernel 435/435,
SDK 22/22, builder-docs 0 and 23/23 ablations rejected. Its full/conformance runs contain two
cancelled tests in the pre-existing `fast-slow-equivalence.test.ts`; the same 5-pass/2-cancelled
behavior was reproduced at B, so this is retained as an environment observation rather than a K1.2
defect.

The primary reviewer did not independently rerun H3. Source-level claims below are independently
checked against exact H3/C3 repository content; supplemental probe/rerun claims remain attributed to
that reviewer.

## What both reviews agree on

The following round-3 corrections are valid and remain closed:

- **K12-R2-TAKEOVER-01.** Post-`isSafeToReplace` revalidation closes the stale pre-callback commit
  schedules. Terminal state, the same unresolved exchange object, writer epoch and code hold are
  re-established before commit, with no further Driver/host callback before mutation.
- **K12-R1-REC-01.** `validation-03/01..08` use the required per-attachment identity shape; attachment
  01 now names C, command, environment/config and digest.
- **K12-R1-HOLD-01 / K12-R1-HISTORY-01 / K12-R1-DELIVERY-01.** Permitted-next-action inspection,
  retained recovery history and per-delivery Activation/epoch attribution remain implemented.
- **K12-R1-DOC-01 remains open.** Both reviews independently found that the maintained
  build-before-mutate description is still not literally true.

The three-control authorization and Driver-safe-replacement corrections made for
K12-R1-AUTH-01 also remain real: `requestTakeover`, `recoverExecution` and
`reportProtocolFailure` require `controlScopes`, and takeover requires Driver
`isSafeToReplace === true`.

What is withdrawn is the broader statement that AUTH-01's required outcome was fully closed across
the whole K1.2 surface.

## Merged finding — K12-R3-AUTH-02 — P2 — visibility-only callers can still exercise Runtime Outcome power

Adopted from the supplemental review's `K12-R3I-AUTH-02`.

Affected criterion: C10. It also invalidates the broad AUTH-01 closure statement and touches the
binding/reference accuracy required by C15.

### Binding and canonical facts

H3's own `AuthenticatedCaller` documentation says that absence of `controlScopes` means
**inspect-only**: such a caller "can read but cannot enter/clear holds or supersede an attempt."
`#requireControl` repeats that an inspect-only caller must not be able to supersede an attempt,
enter/clear a hold, or declare availability.

C10 says a protocol-failure hold ends only through an explicit recovery decision — an authorized
takeover — or acceptance of a valid Outcome **from the current attempt**.

The canonical Kernel/Driver split says the application creates, sends input, inspects and cancels,
while the Kernel sends an Activation through a Driver to the Runtime and the Runtime returns an
Outcome. The Outcome is a Runtime proposal until the Kernel accepts it.

### H3 behavior

`submitOutcome(caller, envelope)` authorizes only through `#visible`; it never checks a Runtime
submission grant, attempt-bound capability or `controlScopes`. Inspection exposes the current
Activation ID, writer epoch and base revision needed to construct a current-looking envelope.

Therefore a principal that H3 itself describes as inspect-only can:

- inspect another principal's open Execution;
- submit a current-looking `continue`, `complete` or `fail` Outcome;
- win the exchange's one accepted Outcome;
- clear standing code/protocol holds through `ended_by_outcome`;
- complete/fail the Execution and trigger B-5 terminal dispositions;
- cause the actual Runtime's later differing Outcome to conflict.

The supplemental reviewer reports reproducing both a fabricated terminal Outcome and an Outcome that
ends code+protocol holds from a visibility-only `dashboard` caller while the same caller's explicit
control operation is refused `unauthorized_control`. Inspection of the H3 source independently
supports that schedule: no additional authority check exists on `submitOutcome`.

### Why this is a current defect, not merely the old abstract settlement ambiguity

Review-02 declined to turn `evidence.md`'s phrase "inspection privilege does not grant ...
settlement privilege" into an Outcome-submission finding because the word *settlement* was not enough
by itself.

The current finding does not depend on that interpretation. It rests on H3's own binding contract
("inspect-only", cannot clear holds/supersede), C10's requirement that the hold-ending Outcome be
from the current attempt, and the canonical Runtime-through-Driver ownership of Outcome proposals.

### Required outcome

The ordinary correction path is to establish Runtime/attempt submission authority separately from
read-only inspection so that visibility alone cannot submit an Outcome that wins, clears holds or
ends an Execution. The representation is open: an attempt-bound capability supplied with the
Activation, a distinct trusted submission grant, or another mechanism may satisfy the requirement.

Tests must distinguish visibility-only from Runtime-authorized submission for `continue`,
terminal Outcome and hold-ending Outcome, and must assert zero accepted-state mutation for the
unauthorized arm. A distinguishing ablation that falls back to visibility alone must fail.

If the implementation instead intends the semantic rule that ordinary visibility itself grants
Runtime-proposal power, including the power to clear holds and end an Execution, that is not a
reviewer correction. It requires the owner/planning path to amend the binding claims, C10/AUTH
disposition and related text deliberately. Until such an owner decision exists, the current H3 claims
are internally inconsistent.

This review therefore remains **CHANGES REQUIRED**, not `BLOCKED — ARCHITECTURE DECISION`, because
a correction consistent with the existing canonical Runtime/Driver boundary exists without choosing
a new architecture. If the implementer refuses that path and wants visibility-as-submission-power,
stop and request the owner decision rather than silently changing the contract.

## Merged finding — K12-R3-HISTORY-02 — P2 — hold-ending History asserts authority that was not checked

Adopted from the supplemental review's `K12-R3I-HISTORY-02`.

Affected criterion: C12, with C10 interaction.

`RecoveryHistoryRecord.actorNamespace` is documented as "the authenticated control actor" and
`actorScope` as the Execution scope "which the caller held control power over."

For `ended_by_outcome`, `#accept` currently fills those fields from the Outcome submitter:

- `actorNamespace: caller.namespace`
- `actorScope: record.scope`

But H3 does not check control authority — or any distinct Runtime-submission authority — before
accepting that Outcome. The record can therefore assert that the submitter was a control actor and
held control power even when the same caller would receive `unauthorized_control` from
`reportProtocolFailure`, `recoverExecution` or `requestTakeover`.

The supplemental reviewer reports reproducing exactly this retained History with an inspect-only
`dashboard` submitter.

Required outcome: retained hold-ending History must identify the submission actor and the authority
under which the submission was accepted truthfully. It must not assert unchecked control power.

This remains a separate finding from AUTH-02 because even a sound dedicated Runtime submission grant
need not be the same thing as general control authority. If the correction uses a distinct proposal
capability/grant, History must represent that distinction rather than relabeling it as control. Tests
must assert the authority/actor fields for a submitter that lacks general control power.

## Merged finding — K12-R1-DOC-01 — P2 — complete #accept construction inventory still disagrees with maintained prose

Affected criterion: C15.

Round 3 correctly moved `ended_by_outcome` History-record construction before the accepted-state
mutation boundary. Both reviews agree that one retained record still violates the stated mechanism:
the `AcceptedOutcomeRecord` wrapper stored in `record.acceptedOutcomes` is constructed inside the
apply phase:

```ts
mapSet(
  record.acceptedOutcomes,
  activationId,
  PrimordialObjectFreeze({ identity: outcome.identity, decision }),
);
```

The source defines that wrapper as "the retained decision an exact replay answers from", and DEC-12
treats accepted-Outcome records as retained state.

The false mechanism statement exists in all of:

- contract DEC-10;
- the coordinator transaction/#accept comments;
- BASELINE `#outcome-acceptance-api`;
- `mental-model/rewrite-index.md` §4, which says the binding "builds every record and only then
  mutates."

The supplemental review additionally notes that `return { ...decision, replayed: false }` constructs
a non-retained answer after mutation. That returned object is not itself a retained decision record,
so it is not an additional atomicity defect, but the literal comment "constructs nothing after
mutation has started" must either exclude answer projection explicitly or be made true.

No split commit is claimed: the late wrapper construction invokes no caller code. This remains a
documentation/implementation-mechanism mismatch.

Required outcome: explicitly inventory every application-level object/record created by `#accept`,
classify retained-decision records versus returned projections, and make DEC-10, coordinator comments,
BASELINE, rewrite-index §4 and implementation agree in one correction. Do not close this family
one object at a time.

## Non-blocking observations

- K12-R2-PROC-01 is resolved by forcing the ablation runner's spec reporter; the supplemental
  Linux/Node 22 rerun confirms the unmodified C3 script works there.
- K12-R2-OBS-PERMITTED-01 remains P3: a protocol-only hold can accept a no-op availability
  declaration although that action is not listed as a permitted next action.
- A protocol-only hold may list `request_takeover` even when the bound Driver can never establish
  `isSafeToReplace`; this is defensible as "not refused for the hold" but may be operationally
  misleading.
- Outcome acceptance has no general submitter attribution record except when a hold-ending History
  record is produced. This is not made blocking independently of AUTH-02/HISTORY-02.
- Unbounded refusal/history/delivery retention remains an acknowledged OPEN item rather than a
  K1.2 gate failure.

## Per-criterion verdicts

| Criterion | Verdict | Merged rationale |
|---|---|---|
| C1 | PASS | Scope/existence nondisclosure ordering remains intact. |
| C2 | PASS | Replay/conflict ordering remains intact. |
| C3 | PASS | Whole-envelope/current-exchange validation remains intact. |
| C4 | PASS | Observable Outcome atomicity remains supported; DOC-01 is the documented mechanism mismatch. |
| C5 | PASS | Lifecycle transitions/terminal behavior are mechanically correct once an Outcome is accepted. |
| C6 | PASS | B-5 and live terminal ingress remain mechanically correct. |
| C7 | PASS | Unsupported Effects/obligations/waits remain refused. |
| C8 | PASS | Control-authorized takeover + Driver safety + post-callback revalidation are supported. |
| C9 | PASS | Code-hold declaration/inspection behavior meets C9; unauthorized Outcome ending is charged through AUTH-02/C10. |
| C10 | **FAIL** | K12-R3-AUTH-02: H3 does not establish that the hold-ending Outcome came from the current Runtime attempt rather than a merely visible principal. |
| C11 | PASS | Late delivery/Outcome behavior remains supported. |
| C12 | **FAIL** | K12-R3-HISTORY-02: retained hold-ending History may assert unchecked control authority. |
| C13 | PASS | Single-observation/hostile-boundary protections remain supported. |
| C14 | PASS | Structural boundary/inventory remains coherent. |
| C15 | **FAIL** | K12-R1-DOC-01 plus the inaccurate AUTH/history binding descriptions. |

No criterion is deferred. Round-3 process/evidence packaging remains acceptable.

## Trajectory assessment

H3 is **not a regression and not an oscillation**. It genuinely closes the round-2 takeover
reentrancy defect, repairs the evidence attachment format and preserves the previously corrected
hold/history/delivery mechanisms.

However, the merged review materially changes the estimate of how close K1.2 is to acceptance.
`review-03.md` concluded that only one narrow DOC wrapper remained. That conclusion is superseded:
the Outcome-submission authority boundary and its History attribution are still unresolved.

AUTH-02/HISTORY-02 were latent in H2/H3; round 3 did not introduce them. The trajectory therefore
remains forward, but the independent-review coverage was incomplete around "who may speak for the
current Runtime attempt."

This does not yet show an implementation local minimum. The round-3 agent successfully closed the
specific findings it was handed. Keep the current implementation agent if desired, but the next
correction must re-derive the full Outcome authority path from the canonical Kernel→Driver→Runtime
exchange rather than treating `AuthenticatedCaller.scopes` as sufficient because the existing
Runtime harness happens to use it.

Escalate/switch if the next correction merely substitutes `controlScopes` everywhere without
preserving the Runtime/Driver ownership model, requires visibility to carry proposal authority without
an owner decision, or fixes one attribution label while leaving another unchecked-authority claim.

## Correction handoff

Correct the same released K1.2 packet from the current administrative branch head. Preserve all
round-3 takeover/evidence corrections and all prior HOLD/HISTORY/DELIVERY closures.

Blocking findings:

1. **K12-R3-AUTH-02 (P2)** — visibility alone must not let a principal speak as the current Runtime
   attempt, clear holds, win the exchange or end the Execution. Establish a real Runtime/attempt
   submission authority path, or stop for an explicit owner amendment if choosing visibility as that
   power.
2. **K12-R3-HISTORY-02 (P2)** — hold-ending History must attribute the submitter and accepted authority
   truthfully; do not claim general control power that was never checked.
3. **K12-R1-DOC-01 (P2)** — reconcile the complete `#accept` construction inventory, including the
   retained `AcceptedOutcomeRecord`, with DEC-10/coordinator/BASELINE/rewrite-index §4.

Required distinguishing evidence:

- visibility-only versus Runtime-authorized `continue`, terminal and hold-ending Outcomes;
- zero accepted-state mutation on unauthorized Outcome;
- an ablation that collapses Runtime submission authority back to visibility and is rejected;
- History assertions for an Outcome submitter without general control power;
- explicit implementation-report construction inventory for every object created before/after the
  `#accept` apply boundary.

Then use the normal 006 new-C / clean-validation / immutable-evidence / new-H sequence. Re-review the
whole cumulative packet plus correction delta. No self-acceptance, merge or successor release.

CHANGES REQUIRED
