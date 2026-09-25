# Independent review — K1.2 Outcome acceptance and receipts, round 4

## Identity

- Reviewer: ChatGPT independent reviewer.
- Model: GPT-5.6 Sol.
- Date: 2026-09-25.
- Governing base B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
- Prior merged administrative head: `7f08677e617457683a55d5b6c51661ec690f613f`.
- Round-4 payload C4: `da82de9de1e51c4b1980e4450a6daf1126945ad2`.
- Reviewed candidate H4: `f8c1c5e2b9edc22725857f60e0ea6dbadaf105f6`.
- Branch: `claude/k1.2-outcome-acceptance-receipts`.
- Contract: `docs/development/work/K1.2/contract.md` revision 4 at C4.
- Governing process/reference baseline: AGENTS.md, mental model, development front door and
  006/007/008/012 at B.

Acceptance, if earned, would bind exactly H4. This review does not certify its own administrative
commit or any later merge.

## Access and evidence provenance

The reviewer inspected exact GitHub source at C4/H4, the prior-head-to-C4 correction delta, the
cumulative candidate, changed source/tests/contract/baseline/reference/ablations, and all round-4
validation attachment headers plus the relevant result tails.

C4..H4 is administrative/evidence-only: `implementation-04.md`, `validation-04/01..08`, and the
K1.2 007 status-row update. No package, test, script, contract, baseline or mental-model payload
change occurs there.

The reviewer did not independently rerun H4. The immutable round-4 logs were inspected. They report:

- `npm run typecheck`: exit 0.
- `npm test`: 2,502/2,502 pass, 0 fail/cancelled/skipped/todo.
- `npm run test:kernel`: 448/448 pass.
- `npm run test:conformance`: 1,945/1,945 pass.
- `npm run test:sdk`: 22/22 pass.
- `npm run check:builder-docs`: exit 0.
- ablations: clean control 448/448; 25/25 rejected.

Every validation-04 attachment inspected carries C4, base, branch, exact command,
environment/config and output digest. Attachment 01 shows empty porcelain before the recorded
C4 SHA.

## Independent correction review

### K12-R3-AUTH-02 — closed in behavior

Round 4 establishes a real attempt-bound Outcome-submission authority rather than reusing ordinary
visibility or general `controlScopes`.

For each writer-epoch attempt the Kernel mints one frozen `SubmissionGrant`, stores it only on the
unresolved exchange and hands the same reference to the Driver with the Activation. Ordinary
redelivery reuses that grant. Accepted takeover replaces it with a fresh grant for the new epoch.
`submitOutcome` requires strict reference identity against the exchange's current grant.

The check is ordered after terminal/current-exchange/epoch/base-revision currency checks, preserving
the existing `terminal_destination`/`stale_exchange` fencing vocabulary. A current-looking
proposal with a forged, absent or retired grant reaches `unauthorized_submission`; an old attempt
remains stale.

The grant is not exposed by inspection. A grant-bearing submitter need not hold general
`controlScopes`, and explicit takeover/recovery/protocol controls still independently require
control authority.

The new `submission-authority.test.ts` covers forged/absent grants, terminal and hold-ending
proposals, authorized no-control Runtime submission, takeover retirement, replay ordering and
hidden/missing nondisclosure. B8 removes the authority check and is rejected.

No semantic path was found in which visibility alone can still commit a new Outcome.

### K12-R3-HISTORY-02 — closed in behavior and schema

`RecoveryHistoryRecord` now carries an explicit authority discriminator:

- `control` for recovery declarations, protocol-failure reports and takeover clears where
  `controlScopes` was checked;
- `attempt_submission` for hold-ending accepted Outcomes presenting the current attempt grant.

`actorScope` is now documented as factual causation rather than proof of control for the
`attempt_submission` arm.

The new history-attribution suite checks a grant-authorized Runtime submitter without general
control power, control-origin transitions, replay/refused-submission no-op behavior and frozen
snapshots. B9 conflates Outcome History back into control authority and is rejected.

### K12-R1-DOC-01 — closed

The retained `AcceptedOutcomeRecord` wrapper is now constructed before the apply boundary and only
the prebuilt wrapper is inserted during mutation.

The complete `#accept` inventory now distinguishes:

- pre-apply retained decision records;
- transient planning allocations;
- apply-phase insertions/mutations of already-built records;
- the post-apply, non-retained returned answer projection.

DEC-10, the coordinator comments, BASELINE and rewrite-index §4 agree on that mechanism. No further
retained record built inside the apply phase was found.

### Previously closed semantic families remain closed

The round-4 delta preserves:

- distinct control authority for takeover/recover/protocol report;
- Driver-owned safe-replacement prerequisite;
- post-`isSafeToReplace` takeover revalidation;
- held-RUNNING permitted-next-action inspection;
- retained recovery History;
- per-delivery Activation/epoch attribution;
- receipt contiguity and replay/conflict ordering;
- evidence attachment identity.

B1–B9 and A1–A16 remain rejected in the inspected evidence.

## Finding

### K12-R4-AUTH-DOC-01 — P2 — old control-authority prose contradicts the new attempt-grant model

Affected criterion: C15. C10 behavior itself passes.

Round 4 correctly added DEC-20 and updated the baseline, Driver docs, History schema and tests.
However several maintained statements from the old AUTH correction were left unchanged and now
describe an authority model H4 intentionally no longer has.

#### 1. `packages/kernel/src/identity.ts`

The `AuthenticatedCaller.controlScopes` documentation still says:

> Absent (or not containing the scope) means inspect-only: the caller can read but cannot enter/clear
> holds or supersede an attempt.

That was a reasonable description before DEC-20. It is false as an absolute description at H4.
The new intended/tested Runtime path is specifically a caller with no `controlScopes` that holds
the current `SubmissionGrant`; it may submit an accepted Outcome, and that Outcome may end code or
protocol holds.

Absence of `controlScopes` now means **no general exchange-control power**. It does not mean the
principal can only read: a distinct attempt capability can authorize one Runtime proposal path.

#### 2. `ExecutionCoordinator.#requireControl` documentation

The comment still says an "inspect-only principal must not be able to supersede an attempt,
enter/clear a hold, or declare code availability."

As written, "clear a hold" is again too broad: a no-control grant holder can validly end a hold
through an accepted current-attempt Outcome. The rule this helper actually enforces is narrower and
sound: such a caller cannot use the three explicit control operations to supersede an attempt,
declare availability, or enter/clear a hold through those control commands.

#### 3. Contract DEC-14

DEC-14 still states:

> Outcome submission stays visibility-only so the Runtime path is preserved. Absent
> `controlScopes` means inspect-only (default-deny).

DEC-20 now says the opposite of "visibility-only" if that phrase means authorization by visibility:
scope visibility is necessary but **not sufficient**; the current attempt grant is additionally
required. Likewise, absence of `controlScopes` does not by itself imply a globally inspect-only
principal once an attempt grant is present.

DEC-14 and DEC-20 can coexist cleanly if DEC-14 is scoped to **general control authority**:
Outcome submission does not require `controlScopes`, but it does require the separate DEC-20
attempt grant.

#### Impact

The implemented mechanism is not shown to be unsafe. The defect is maintained contract/source
documentation that gives two incompatible answers to "what power does a caller without
`controlScopes` have?"

This matters because round 3's AUTH defect came directly from treating "inspect-only" as a global
authority description. Leaving the old wording in place makes the same misunderstanding likely for
future K1/K2 work and makes the implementation report's claim of a complete authority model
unsupported.

#### Required outcome

Perform one exhaustive wording pass over the live K1.2 authority descriptions and make the
distinctions explicit:

1. `scopes` / visibility: may locate/read an Execution and is required before any K1.2 surface.
2. `controlScopes`: general authority for the three explicit exchange-control commands.
3. `SubmissionGrant`: separate attempt-bound authority to propose an Outcome for one current
   Runtime attempt.

A principal lacking `controlScopes` may still possess a current SubmissionGrant; therefore do not
call that principal globally "inspect-only" or say it cannot end holds without qualifying the
statement to the explicit control API.

At minimum reconcile `identity.ts`, `#requireControl` comments and contract DEC-14 with DEC-20,
and search the current live contract/baseline/source comments for equivalent absolute wording.
Historical reviews/reports remain untouched.

This should be a narrow documentation/source-comment correction. Do not reopen or redesign the
working grant mechanism merely to make the old prose true.

## Per-criterion verdicts

| Criterion | Verdict | Rationale |
|---|---|---|
| C1 | PASS | Scope/existence nondisclosure still precedes all other Outcome/control behavior. |
| C2 | PASS | Exact replay/conflict still precede fresh authority/validation and commit nothing new. |
| C3 | PASS | Current-exchange/currency/content validation remains whole-proposal. |
| C4 | PASS | Outcome commit mechanism and complete retained-record inventory now agree. |
| C5 | PASS | Continue/terminal/next-exchange behavior remains supported. |
| C6 | PASS | B-5 and terminal ingress behavior remain supported. |
| C7 | PASS | Unsupported Effects/obligations/waits remain refused. |
| C8 | PASS | Takeover control, Driver safety and post-callback revalidation remain intact. |
| C9 | PASS | Code-hold behavior/permitted actions/history remain supported. |
| C10 | PASS | Current-attempt Outcome authority is now established by the attempt grant; visibility alone cannot commit. |
| C11 | PASS | Late report/Outcome behavior and delivery attribution remain supported. |
| C12 | PASS | History authority attribution is now truthful and retained evidence remains immutable/nondisclosing. |
| C13 | PASS | Single-observation/hostile-boundary protections remain supported. |
| C14 | PASS | Structural boundary/inventory remains coherent. |
| C15 | **FAIL** | K12-R4-AUTH-DOC-01: live authority descriptions still contradict DEC-20. |

No criterion is deferred. Round-4 process/evidence packaging passes.

## Trajectory assessment

Round 4 is **substantial forward progress**.

All three blocking findings from the merged round-3 review are closed in implementation and tests.
The remaining defect is a small documentation/reference inconsistency left behind by the semantic
authority correction.

This is **not oscillation**: the code did not revert to visibility-as-submission-authority, History
did not revert to false control attribution, and the transaction inventory did not regress.

This is also **not an implementation local minimum**. The current agent implemented the difficult
cross-cutting authority correction successfully. Keep the same agent for a narrow round-5 cleanup.
Switch/escalate only if that pass again leaves contradictory live authority descriptions after being
asked to exhaustively search them, or if it changes working semantics to fit stale prose.

## Compact correction handoff

Correct the same released K1.2 packet.

Only blocking finding:

- **K12-R4-AUTH-DOC-01 (P2):** reconcile all live authority wording with the three distinct powers:
  visibility, general exchange-control authority, and attempt-bound Outcome submission authority.

Preserve DEC-20 and all working authority/history/takeover behavior. Do not change runtime semantics
unless an independently found defect requires it.

At minimum update:

- `packages/kernel/src/identity.ts` `AuthenticatedCaller` documentation;
- `ExecutionCoordinator.#requireControl` documentation;
- contract DEC-14;

and audit BASELINE/current source comments for equivalent wording. Historical reviews and sealed
reports stay historical.

Because documentation/content is payload under 006, create a new C5, run appropriate clean validation,
attach immutable evidence, then create report/status H5. Re-review cumulative B..H5 and the correction
delta. Do not self-accept, merge or release K1.3.

CHANGES REQUIRED
