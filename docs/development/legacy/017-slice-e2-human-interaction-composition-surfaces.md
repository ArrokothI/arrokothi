# Slice E.2 — Human Interaction, Mechanical Confirmation, and Composition Surfaces

> **Status: implemented E.2 checkpoint on `slice-e-composition`. Not merged to `main`. This is the
> final Slice E checkpoint — stop for independent review before merge.**
>
> E.2 makes four current canonical concepts operational:
>
> ```text
> RequestUserInput      Harness-mediated user interaction; exact pending request + correlated
>                       continuation
> mechanical confirmation  optional exact-payload execution gate, AFTER authorization, distinct from
>                          user input and from authority
> Agent Stage           one Workflow Stage boundary implemented by a child Agent call
> Workflow Stage        one Workflow Stage boundary implemented by a child Workflow call
> ```
>
> Canonical architecture documents remain authoritative and **unchanged**: every mechanism here is an
> implementation of semantics `docs/execution-runtime.md`, `docs/composition.md`, and
> `docs/authority.md` already own — `RequestUserInput` in the closed Effect vocabulary, "authorization
> evidence and mechanical confirmation are different" (`authority.md` §10), Agent/Workflow Stage as a
> child `call` (`composition.md` §5.3/§5.4), and `BarrierEntryKind = effect | child`
> (`composition.md` §9, control-state §"The barrier"). §16 below records why no canonical change was
> needed.

---

## 1. Baseline

`68b56b4d4811a63949367eb96009253ad661db81` on `slice-e-composition` (E.0 / E.0.1 / E.1 / E.1.1
accepted, not merged). E.2 lands at `npm test` 800, `npm run test:conformance` clean,
`npm run test:mcp` 68, `npm run test:evals` 12, `npm run test:benchmark-subjects` 8,
`npm run typecheck` clean. A benign docs-only merge from `origin/slice-e-composition`
(`docs/research/`) is present in the branch history and touches no code.

Baseline `npm test` at `68b56b4` was 773; E.2 adds 27 conformance cases net.

---

## 2. RequestUserInput runtime

`request_user_input` was already one of the closed five Effect kinds. E.2 makes it dispatchable
through the ordinary `EffectProcessor` path — no new Effect (`AskUser` / `PromptUser` /
`WaitForUser` were **not** added).

```text
controller --RequestUserInput proposal-->  EffectProcessor.processOne
  ↓ decide()  (EffectAuthorizer, deny-by-default)     deny -> effect.denied
  ↓ ONE transaction:
      journal authorized + dispatch_started
      sender PendingOperation (effectKind request_user_input, deadline: null)
      UserInputRequest { state: open }, schema resolved
      NO result Event  <- the user has not answered
  ↓ controller waits on the correlation for user.input | effect.denied | effect.rejected
```

`request_user_input` is routed in `processOne` **before** the `withinEffectiveAuthority` capability
ceiling check — asking a question is not a capability operation and has no operation ceiling — but it
still crosses the `EffectAuthorizer` (§3).

### Schema vocabulary

`RequestUserInputProposal.schema?` is now `ValueSchema` (the existing serializable core value-schema
vocabulary), not the early `JsonObject` placeholder and not a second schema language. A malformed
schema is refused as **data** (`effectProposalIssues` → `valueSchemaIssues`), so it fails the
Activation with `invalid_effect` and is never carried into a `UserInputRequest`.

Absent schema resolves to `{ kind: "string" }` — ordinary textual input. This is stored on the
`UserInputRequest` as the resolved schema, so the response validation and the diagnostics agree.
Structured input against a text request is a rejection, never a silent stringify.

JSON Schema was **not** imported for this Effect. `ValueSchema` was sufficient for every scenario;
no canonical portable-schema contract changed.

---

## 3. User-input authorization

A controller asking the user a question is requesting a runtime interaction, so it crosses
`EffectAuthorizer`, deny-by-default. The reference allow-list policy gains a narrow explicit grant:

```ts
createAllowListAuthorizer({ ..., userInput?: boolean })   // default: absent = denied
```

With no configured `userInput`, every `RequestUserInput` is `effect.denied`
(`user_input_not_authorized`) and no `UserInputRequest` or PendingOperation is created. None of
"the model requested it", "the prompt text says it is needed", "the user has interacted before", or
"the Execution knows a user identity" is treated as permission.

---

## 4. UserInputRequest lifecycle, correlation, and abandonment

`execution/user-input-request.ts` — a runtime-owned record, `UserInputRequestFacet` on the
transaction, read-only diagnostics on the Harness (`userInputRequestsOf`, `userInputRequest`,
`openUserInputRequests`). Fields: `requestId`, `executionId`, `effectId`, `pendingOperationId`,
`correlationId`, `prompt`, `schema` (resolved `ValueSchema`), `state: open | responded | abandoned`,
`createdAt`, `respondedAt`, `abandonedAt`. All serializable. The `requestId` is
correlation/integrity data, **not** a bearer authorization credential.

### Dedicated response Event

`Harness.submitUserInput` produces a **dedicated `user.input` Event kind**, not `external.input`.
`external.input` is an application observation and is externally mintable through
`deliverEnvelope`; a `user.input` is a runtime-*established* correlated result that identifies
`effectId`, `effectKind = request_user_input`, `pendingOperationId`, `requestId`, and the validated
`value`. `user.input` is in `EFFECT_RESULT_EVENT_KINDS` and is refused by `deliverEnvelope`
(`kind_not_deliverable`).

### Trusted response entry point

```ts
Harness.submitUserInput({ requestId, value })
  -> read the exact UserInputRequest
  -> verify open (else already_responded / abandoned)
  -> validate value against the STORED schema, strictly (no coercion)
       invalid -> explicit validation rejection; request left open; nothing settled; no Event
  -> verify the source Execution can still observe it
       terminal / cancelling -> PendingOperation abandoned, request abandoned; rejected
  -> ONE transaction: journal completed; markSettled(pending, "success"); mark request responded;
     route exactly one correlated user.input Event; wake if the recorded wait matched
```

`submitUserInput` sits at the same trust level as `settleEffect` / `deliverExternalInput` /
`cancelExecution`: an internet-facing application authenticates the human/application before it is
reached. A duplicate response produces no second Event and does not settle twice; an unknown request
settles nothing.

### Terminal abandonment

When the requesting Execution reaches `COMPLETED` / `FAILED` / `CANCELLED`, an open
`UserInputRequest` and its PendingOperation are abandoned inside the terminal lifecycle transaction
(`abandonOutgoingDependencies`), folded into the existing mechanism. The no-feature terminal path
does **not** scan the user-input facet: the pre-check is over the already-fetched pending-operation
list.

### Agent integration

The reference `AgentExecutor` / `ModelActionTarget` were **not** changed. No synthetic
`system/request_user_input` capability was invented. E.2 proves the runtime Effect and continuation
with scripted controllers (a `request_user_input` step). Full model-facing discovery/projection of
user interaction remains a later action-projection/ACI concern.

---

## 5. Mechanical-confirmation boundary

Mechanical confirmation is a **separate gate**, evaluated:

```text
concrete Effect proposal
   ↓ EffectAuthorizer                         deny -> effect.denied (no confirmation)
   ↓ allow
ConfirmationPolicy.requires(...)              not required -> dispatch now
   ↓ required
persist exact payload + digest + PendingOperation + ConfirmationRequest; wait for approve/decline
```

It is **not**:

- a third arm of `AuthorizationDecision` — authorization stays `allow | deny`; the seam is the new
  `ConfirmationPolicy` port (`ports/confirmation-policy.ts`);
- `RequestUserInput("Are you sure?")` — it gates one already-concrete payload with a trusted
  `approve` / `decline`, never free prose; natural-language-to-decision resolution stays above the
  kernel boundary;
- the legacy `ConservativeConfirmationResolver` — that Session/Flow subsystem is untouched, still
  green in the legacy suite (`packages/core/tests/confirmation.test.ts`), and is **not** part of the
  new Execution path.

### Policy seam and defaults

`ConfirmationPolicy.requires(request) -> { required: false } | { required: true; reason? }`. Default
`confirmationNotRequired` — an unconfigured workload pays one synchronous branch per dispatchable
Effect and touches no facet. A policy that throws or answers malformedly fails **conservative** (the
Effect is gated, not dispatched unreviewed), mirroring the authorizer failing closed toward deny.

The policy is consulted for `use_capability`, `spawn_execution`, and `send_message` — **not** for
`request_user_input`: recursive confirmation of a user interaction is structurally impossible, and
the baseline treats user-input requests as outside mechanical confirmation.

Reference `createCapabilityConfirmationPolicy({ rules })` gates selected `(capability, operation)`
pairs. It is provider- and UI-neutral.

---

## 6. Exact-payload confirmation

`execution/confirmation-request.ts` — `ConfirmationRequestFacet` on the transaction; read-only
diagnostics (`confirmationRequestsOf`, `confirmationRequest`, `pendingConfirmations`). Fields:
`confirmationId`, `executionId`, `effectId`, `effectKind`, `pendingOperationId`, `correlationId`,
the **exact validated `proposal`**, its **canonical `proposalDigest`** (`hashValue` /
`canonicalJson` — key order and argument order never change it), `reason`,
`state: pending | approved | declined | abandoned`, `createdAt`, `resolvedAt`.

The gate transaction: journal `authorized` + `confirmation_pending`, create the Effect
PendingOperation **`not_dispatched`**, persist the `ConfirmationRequest` — one atomic commit. No
result Event. The confirmation binds to the exact stored proposal, not to `effectKind` / operation
name / prompt: a different payload has a different digest and is its own `ConfirmationRequest`
(`mechanical-confirmation.test.ts` "a changed payload cannot inherit an approval").

`resolveConfirmation` has **no caller-controlled payload parameter** — only `{ confirmationId,
decision }` — so an approval can never be redirected onto a different payload.

---

## 7. Confirmation authorization / revocation behavior

Approval is **not** a bearer grant.

```text
Harness.resolveConfirmation({ confirmationId, decision: "approve" })
  ↓ claim transaction: ConfirmationRequest pending -> approved   (the linearization point)
  ↓ re-check the CURRENT authority on the STORED exact proposal:
       use_capability: withinEffectiveAuthority (current ceiling) + EffectAuthorizer.decide()
       spawn / send:   EffectAuthorizer.decide()
  ↓ still allowed -> dispatch the STORED payload through the ordinary dispatch path, reusing the
                     exact PendingOperation (no model turn, no shadow Effect kind)
  ↓ now denied    -> PendingOperation settled `denied`, journal `denied`, ordinary effect.denied
                     Event; nothing dispatched
```

An old approval never overrides a revocation that happened while it waited
(`mechanical-confirmation.test.ts` "authority revoked while the confirmation was pending"). The
`ConfirmationRequest` ends `approved` either way — the human approved; the Effect outcome reflects
what happened.

The confirmed dispatch adds `resume?: { pendingOperationId, confirmationId }` to
`dispatchCapability` / `dispatchSpawn` / `dispatchSendMessage`: it reuses the gated PendingOperation
so the controller's correlation is stable and there is only ever one PendingOperation per Effect. No
RuntimeStore transaction is held open across the human wait or across executor work.

---

## 8. Confirmation race and duplicate proof

- **duplicate approval** — the second `resolveConfirmation({approve})` sees the state off `pending`
  and returns `already_resolved`; the executor is called exactly once.
- **approve vs decline race** — `Promise.all([approve, decline])`: exactly one call moves the state
  off `pending`; the other returns `already_resolved`; at most one dispatch.
- **decline** — `ConfirmationRequest` → `declined`, PendingOperation settled `declined` (a distinct
  `PendingOutcomeState`, not `failure` / `denied` / `cancelled`), one correlated
  **`confirmation.declined`** Event (a distinct Event kind, not `effect.denied` and not a capability
  failure). Nothing dispatched. Approval itself is not a controller Event; audit lives in the
  journal.
- **terminal requester while pending** — the Effect PendingOperation and the `ConfirmationRequest`
  are both abandoned in terminal cleanup; a late approve/decline does nothing and dispatches nothing.
- **duplicate-safety for consequential Effects** — the gate creates a `not_dispatched` Pending
  operation; the confirmed dispatch reuses it and `markDispatched`s it inside one transaction, so
  there is no path to two dispatches.

---

## 9. Agent Stage

An Agent Stage is one Workflow Stage boundary implemented by a child Agent `call`. It is **not** a
new Execution kind and gets **no** `ExecutionId`, mailbox, lifecycle, authority envelope, or
scheduler entry — only a `child` barrier entry in Workflow control state.

```text
Workflow Stage (kind "agent")
  first visit  -> WorkflowController.step() proposes ONE callExecution
                  (SpawnExecution, awaitTerminalResult, expectedChildKind "agent",
                   requestedOperations, input = adapted StageResult), records ONE ChildBarrierEntry
  Harness      -> dispatchSpawn: resolve Definition, kind check, attenuate authority, spend one
                  lineage credit, create the child Agent Execution, register parent PendingOperation
                  + ChildExecutionLink
  child Agent  -> its own model/Effect/Event cycles; terminal result
  child.completed -> collect() folds it into the ChildBarrierEntry; barrier settles
  later visit  -> step() sees the settled child barrier -> finishChildStage: derive Stage result,
                  run output Adapters, resolve the transition. NEVER re-proposes the call.
```

The controller has no `DefinitionStore` and never becomes an existence oracle. It proposes a spawn;
the Harness owns existence/kind truth. Architecture tests confirm the WorkflowController import graph
still cannot reach `runtime-store` / `harness` / `effect-processor` / `child-link` /
`structural-budget`, and the controller source names no `routeEvent` / `settleOwnerOnChildTerminal`
/ `.executions.insert(`.

---

## 10. Workflow Stage

Structurally identical to an Agent Stage with `childKind = "workflow"` and `expectedChildKind =
"workflow"`. The child Workflow is one independently managed Execution; its topology is never
flattened into the parent graph. Recursive Workflow composition is legal
(`workflow-stage.test.ts` "recursive nested Workflow composition": parent → Workflow Stage → child →
Workflow Stage → grandchild yields three independent Executions sharing one lineage root, and the
parent holds exactly one child link).

The existing child-`call` substrate from E.0/E.1 is reused; no second child invocation mechanism was
added inside the Workflow controller.

---

## 11. Child authority / input / output semantics

### Authority

`AgentStageDefinition` / `WorkflowStageDefinition` gain `requestedOperations?: readonly
ChildOperationRef[]`. A Definition requirement is not authority:

```text
child effective operation authority
  = requestedOperations  ∩  the parent Workflow Execution's CURRENT effective operation authority
```

via the E.0 `attenuateChildOperations`. **Absent** `requestedOperations` yields an empty child
ceiling — never "inherit everything" (`agent-stage.test.ts` "absent requestedOperations means the
child receives no operation authority"). There is no special Workflow bypass.

### Input

The removed `childInput?: JsonObject` field is rejected at authoring (`validateWorkflowSpec`:
`childInput was removed in Slice E.2 ...`). The Stage's adapted `StageResult` (`text | none`, after
its ordinary `inputAdapters`) is the child's semantic input: a `text` result is delivered as the
child's `external.input` spawn payload; a `none` result delivers no input Event. No implicit
`{ ...childInput, stageInput }` merge, no stringify.

### Output

Child terminal result → StageResult:

```text
child terminal value = string   -> StageResult text
child terminal value = null      -> StageResult none
child terminal value = structured -> Stage fails (child_structured_terminal_result); never
                                     JSON-stringified through the text|none edge
```

The cross-Stage contract stays `text | none`. Structured cross-Stage data belongs in explicit shared
resources/Artifacts/Memory (a later slice). After deriving the Stage's own result,
`finishChildStage` runs the ordinary output Adapters and transition resolution.

### Failure and cancellation

```text
child.failed     -> Stage fails explicitly   (<kind>_stage_child_failed)
child.cancelled  -> Stage fails explicitly with a cancellation-specific reason
                    (<kind>_stage_child_cancelled) — NOT relabelled as ordinary failure
effect.denied    -> Stage fails explicitly   (<kind>_stage_spawn_denied)   — no child exists
effect.rejected  -> Stage fails explicitly   (<kind>_stage_spawn_rejected) — no child exists
                    (covers spawn_definition_kind_mismatch, missing Definition, etc.)
```

No automatic child restart/supervision policy in E.2. The parent is never left permanently WAITING.

---

## 12. Stage barrier integration

`BarrierEntry` is now a discriminated union, replacing the flat shape that carried `capability` /
`operation` on every entry:

```text
EffectBarrierEntry  kind "effect"  capability, operation, StageObservationOutcome, observation, error
ChildBarrierEntry   kind "child"   childDefinitionId/Version, childKind, requestedOperations,
                                   ChildBarrierOutcome, childResult (text|none), error
```

Child data is never stuffed into capability/operation fields. `settleBarrierEntry` (effect) and
`settleChildBarrierEntry` (child) are correlation-exact and idempotent — a duplicate result settles
nothing twice, and a result whose correlation matches no entry of this visit changes nothing (a
stale result from a previous loop iteration is harmless). `observationsOf` yields only `effect`
entries.

The child-call barrier understands `child.completed | child.failed | child.cancelled` and the
Effect-level `effect.denied | effect.rejected` (a refused `SpawnExecution` — no child, but the
Stage's required call still received a terminal answer). Correlation is exact: one Stage's child
barrier cannot be satisfied by another child's result (correlation is `stageCorrelationId(stage,
visit, "child")`).

The wait condition (`wakeFor`) names the child correlation exactly when it is the only outstanding
entry, and otherwise waits broadly on `EFFECT_RESULT_EVENT_KINDS` (which does not include
`peer.message` / `external.input`), so an unrelated message does not wake a Workflow child wait.
E.1's controlled interleaving is untouched — the Workflow controller opts into nothing.

---

## 13. Cross-feature composition

`child-stage-cross-feature.test.ts`:

- A child Agent behind an Agent Stage runs its **own** user-input cycle: the parent Stage waits on
  the child's terminal result; the child waits on the user; `submitUserInput` (against the *child's*
  request) lets the child complete; the parent Stage resumes. The parent Workflow never learns the
  child's internal cycle.
- A child Agent behind an Agent Stage runs its **own** confirmation cycle: the child's gated
  `use_capability` pauses; `resolveConfirmation` (against the *child's* confirmation) dispatches the
  stored payload; the child continues and completes; the parent child-call settles normally.

---

## 14. E.1.1 preservation and the folded cleanup

E.1's controlled interleaving, the RUNNING-window stale invalidation, cancellation linearization,
reply-destination authority, and terminal dependency abandonment are all preserved (regression suite
green). `reply_and_ask()` stays deferred in `docs/future-plan.md` §1.7 — not implemented; ordinary
`reply` still settles one ask with `expectsReply = false`.

**Folded cleanup (§35):** `settleOwnerOnChildTerminal`'s parent-already-terminal fallback now marks
the `ChildExecutionLink` `abandoned`, not `settled` — `settled` means a required result was
delivered; `abandoned` means the source terminalized first. This was non-blocking for E.1.1 (normal
terminal cleanup handles the current state first), and the path is only reachable under a
durable/multi-worker race, so no dedicated regression was added beyond the full-suite check.

---

## 15. 014 cost observations

Per `014` §9 discipline — what physical work the simple path that uses none of the new guarantees
now pays for:

```text
RequestUserInput not used   -> zero: no userInputRequests facet access; the confirmation policy is
                               not even consulted for request_user_input
confirmation not configured  -> one synchronous ConfirmationPolicy.requires() branch per
                               use_capability / spawn_execution / send_message proposal; zero
                               confirmationRequests facet access
Agent/Workflow Stage not used -> zero child-Stage barrier scans: childBarrierEntry(state) is an
                                O(barrier length ≤ 1) in-memory find over controller state, never a
                                store read
terminal cleanup              -> the no-feature terminal path still consults only the already-fetched
                                pending-operation list; the user-input and confirmation facets are
                                touched only when a `not_dispatched` (gated) or `request_user_input`
                                pending operation exists
```

`no-child-cost.test.ts` is extended to count `userInputRequests.*` and `confirmationRequests.*`
transaction-facet calls and assert the ordinary capability Activation touches zero of them.
Instrumented regression, not a benchmark. Metrics available for `014` where useful: open user-input
requests, pending confirmations, and (via the journal) confirmed/declined/abandoned confirmations
and deferred-dispatch count — none are semantic kernel state.

---

## 16. Why no canonical-doc change

| E.2 mechanism | Already owned by |
|---|---|
| `RequestUserInput` dispatchable through the gateway | `execution-runtime.md` §7 lists "user input" as an Event; `interoperability.md` §8 names `RequestUserInput` the kernel Effect for semantic user input |
| dedicated `user.input` Event, not `external.input` | `execution-runtime.md` §13 (trusted settlement produces a correlated Event); `security-guarantees.md` §13 (settlement authority ≠ Effect authority) |
| user-input authority, deny-by-default | `authority.md` §1, §10 ("user input ≠ mechanical confirmation ≠ authorization") |
| confirmation as a separate gate, not a third `AuthorizationDecision` arm | `authority.md` §10; `mental-model.md` §4 lists "mechanical confirmation" as a Harness concern distinct from authorization; `security-guarantees.md` §7 |
| exact-payload binding + digest; changed payload → new confirmation | `authority.md` §10 ("binds approval to a concrete consequential action/payload as closely as practical"); `security-guarantees.md` §20 scenario 8 |
| approval re-checks current authority; not a bearer grant | `authority.md` §11 (revocation) |
| Agent Stage / Workflow Stage as a child `call` | `composition.md` §5.3 / §5.4 |
| `BarrierEntryKind = effect | child` | `composition.md` §9; the field was already reserved in control-state |
| child authority = requested ∩ parent current | `authority.md` §6; `composition.md` §11 |
| `StageResult = text | none` unchanged | `composition.md` §4 |

No canonical ambiguity was found. If one is discovered in review, stop and report rather than
redefining architecture here.

---

## 17. Documentation

- **Created:** this document.
- **Updated:** `docs/development/README.md` (Slice E sequence: E.2 is the current/final checkpoint).
- Canonical docs: **no change**.
- `AGENTS.md`, `CLAUDE.md`, `.agents/skills/`: **no change** — nothing became materially false.
- `docs/future-plan.md` §1.7 (`reply_and_ask()`): **no change** — still deferred, still not
  implemented.

---

## E.2.1 — post-review corrections

> **Status: bounded post-review correction on `slice-e-composition`, on top of the E.2 checkpoint
> `6a433064`. Not a redesign. Canonical architecture documents remain unchanged — no contradiction
> was exposed.** Validation after E.2.1: `npm test` 810, `npm run test:conformance` clean,
> `npm run test:mcp` 68, `npm run test:evals` 12, `npm run test:benchmark-subjects` 8,
> `npm run typecheck` clean, `git diff --check` clean.

Three review findings, all in the *confirmation-enabled* path and in reference controller
result-mapping; nothing on the confirmation-disabled fast path changed.

### E.2.1(a) — resume-aware confirmed-refusal settlement

E.2 created exactly one `PendingOperation` at the confirmation gate, but the confirmed-dispatch
(`resume`) path for `spawn_execution` / `send_message` could still hit an ordinary runtime answer
*after* approval and *before* dispatch — a missing / kind-mismatched child Definition, an exhausted
or absent structural spawn budget, spawn-budget contention, an invalid or terminal message
destination, or (spawn/send) a fresh authorization `deny`. The generic `refuse()` path minted a new
`effect.denied` / `effect.rejected` Event with `pendingOperationId: null` and **left the gated
`PendingOperation` pending forever**, violating the E.2 contract "one Effect → one PendingOperation →
… → dispatch OR terminal refusal → that SAME PendingOperation is no longer pending".

`refuse()` now takes an optional `resume` argument. On the resume path it settles the **existing**
gated `PendingOperation` inside one transaction — `markSettled` with the new outcome, `dispatch`
left `not_dispatched` (nothing reached the world) — journals the phase against that
`pendingOperationId`, and routes exactly one correlated Event. It never creates a second
`PendingOperation` and never reports `pendingOperationId: null` when a real gated one exists. A
cancellation committed mid-resume abandons that same operation in the dispatch-intent transaction
(`abandonIfCancellationPending` gained an optional pending-operation id).

### E.2.1(b) — `PendingOutcomeState.rejected`

`PendingOutcomeState` gained `rejected`, distinct from `failure` / `denied` / `declined` /
`cancelled`. A confirmed Effect that becomes **authorization-denied** before dispatch settles
`denied` + one `effect.denied`; one that becomes **runtime-rejected** before dispatch settles
`rejected` + one `effect.rejected`. `ResolveConfirmationReceipt` gained a matching `rejected` arm;
`receiptForResumedRecord` maps the dispatch record (which now carries an optional `refusal`) to the
right receipt.

### E.2.1(c) — no duplicate authorization on a confirmed spawn/send

`approveConfirmation` previously ran its own `decide(...)` for spawn/send and then the resumed
`dispatchSpawn` / `dispatchSendMessage` ran authorization **again** — two independent policy
decisions for one approved dispatch. `approveConfirmation` no longer calls `decide` for spawn/send;
the resumed dispatch function owns the single fresh authorization check, and its refusal paths now
settle the gated `PendingOperation` (a1). The capability path already had a single `decide`
(in `approveConfirmation`) and is unchanged in that respect.

### E.2.1(d) — Agent `declined` observation

`AgentObservationOutcome` gained `declined`. The Agent controller's result collector maps
`confirmation.declined` → `declined` (was unmapped → the `AgentPendingCall` stayed unsettled while
the runtime `PendingOperation` was already `declined`). The model-facing projector renders it
truthfully via the existing non-`completed` arm (`code: confirmation_declined`), never as `denied`
or `failed`. A confirmation-declined capability call now settles the pending call and the Agent
makes its next model decision.

### E.2.1(e) — Workflow `declined` observation and child `spawn_declined`

`StageObservationOutcome` gained `declined`; `ChildBarrierOutcome` gained `spawn_declined`. The
Workflow controller's `outcomeOf` maps `confirmation.declined` → `declined` for an ordinary Effect
barrier, and `childOutcomeOf` maps it → `spawn_declined` for a child barrier (distinct from
`spawn_denied` = policy, `spawn_rejected` = request/runtime). `finishChildStage` terminates the
Stage with `agent_stage_spawn_declined` / `workflow_stage_spawn_declined` — an explicit case before
the `spawn_rejected` default, so a declined child call is never relabelled as a denial, a rejection,
or a child failure, and no child Execution is pretended into existence. A declined Effect barrier no
longer leaves the Workflow WAITING.

### E.2.1(f) — hard operation-authority recheck at confirmed dispatch intent

On a confirmed `use_capability` dispatch, the transaction that commits `dispatch_started` now also
re-reads the runtime-owned Effective Operation Authority and refuses if the operation is no longer
within it — closing the window between `approveConfirmation`'s outer ceiling read and the
dispatch-intent commit. On failure: no `dispatch_started`, no executor call, the existing
`PendingOperation` settles `denied`, one correlated `effect.denied`. This is a single store read
inside the *delayed confirmed* transaction only — the ordinary proposal path (`resume === undefined`)
never runs it, and there is no global revalidation scan.

### E.2.1 — invariant after the retrofit

For every gated Effect, the pending `ConfirmationRequest` eventually corresponds to exactly one of:
approved + dispatch committed; approved + existing `PendingOperation` settled `denied`; approved +
existing `PendingOperation` settled `rejected`; declined + existing `PendingOperation` settled
`declined`; abandoned + existing `PendingOperation` abandoned. There is no path to
"approved + `PendingOperation` pending forever".

### E.2.1 — deterministic regressions added

- `tests/conformance/interaction/confirmation-settlement.test.ts` — resumed spawn refusals (missing
  Definition, kind mismatch, structural budget), resumed send refusals (invalid destination,
  authorization recheck deny with a "no second policy evaluation" assertion), and the deterministic
  authority-race regression (an instrumented `InMemoryRuntimeStore` whose revocation is made
  observable the instant the outer approval recheck reads "allowed" — no sleeps). Several assertions
  read RuntimeStore records directly.
- `tests/conformance/interaction/confirmation-decline-controllers.test.ts` — `confirmation.declined`
  through the reference Agent (pending call settles `declined`, executor call count 0, projector
  renders `declined`, next model step runs) and through a Workflow Effect barrier (barrier settles
  `declined`, Stage observes `declined`, Workflow not left WAITING).
- `tests/conformance/workflow/child-stage-decline.test.ts` — full conformance for both an Agent
  Stage and a Workflow Stage whose child `SpawnExecution` confirmation is declined: no child
  Execution, same spawn `PendingOperation` settled `declined`, child barrier `spawn_declined`,
  parent Stage terminates with `<kind>_stage_spawn_declined`, parent not left WAITING.

Testing-helper change: `createAgentTestHarness` now forwards `confirmationPolicy` (it was already in
the options type). No agent-configuration artifact changed.

---

## 18. Deferred work

- `reply_and_ask()` (future-plan §1.7).
- `WriteMemory` / Working Notes / memory backends.
- Workflow parallel branches; general supervision / restart; cancellation propagation;
  sibling/descendant cancellation policy.
- Universal deadlock detection; timers / deadline scheduler; durable outbox/recovery redesign;
  distributed leases.
- Model-facing peer/child/user-interaction discovery; `ModelActionTarget` extensions for user input
  or child invocation; a generic conversation/session ontology.
- Full JSON Schema adoption; MCP/A2A expansion.
- Confirmation of `spawn_execution` / `send_message` is *wired* (the gate and the confirmed-dispatch
  `resume` path are generic), but the reference policy exercises only `use_capability`; a richer
  reference policy for child/peer confirmation is future work.
- Merge-safe stale continuations; a durable-runtime regression for the
  `settleOwnerOnChildTerminal` fallback.

---

## 19. Blockers

**None.** Every §47 stop condition was checked and none was hit:

1. `RequestUserInput` does not treat `external.input` as a fake Effect result — a dedicated
   `user.input` Event is routed by `submitUserInput` and is not deliverable through `deliverEnvelope`.
2. Confirmation approval is never authority — the current ceiling + authorizer are re-checked on the
   stored proposal before dispatch.
3. The model never regenerates the approved Effect — the stored exact payload dispatches
   mechanically, reusing the exact PendingOperation; one `requested` journal entry throughout.
4. No RuntimeStore transaction is held across the human wait or across executor work — the gate, the
   approval claim, and the confirmed dispatch are separate transactions.
5. No Stage gained an Execution identity — an Agent/Workflow Stage is a `ChildBarrierEntry` and a
   child `call`.
6. Child topology is never flattened — the controller has no `DefinitionStore`, proposes a spawn,
   and holds exactly one child link per Stage.
7. Child authority is explicit and attenuated — `requestedOperations ∩ parent current`; absent is
   empty, never inherit-all.
8. Structured child terminal values are not stringified — they fail the Stage explicitly.
9. No generic Session/conversation ontology was introduced.
10. The legacy confirmation subsystem is not the new runtime owner — it is untouched and still green
    in the legacy suite.
11. The user-input schema is expressed with the existing `ValueSchema` — no canonical portable-schema
    contract changed.
12. No accepted E.1 interleaving/cancellation semantics were redesigned.

### Acceptance answers (§48)

- Is `RequestUserInput` still one of the existing five Effects? **Yes.**
- Can arbitrary `external.input` settle a pending user-input Effect? **No.**
- Does user input use a correlated runtime-owned request and PendingOperation? **Yes.**
- Is user input the same as mechanical confirmation? **No.**
- Is confirmation a third authorization decision? **No.**
- Can confirmation approval widen or replace current authority? **No.**
- Is confirmation bound to the exact stored concrete Effect payload? **Yes.**
- Can changed payload inherit old consent? **No.**
- Does approval require another model call merely to reconstruct the Effect? **No.**
- Can duplicate approval dispatch twice? **No.**
- Can a terminal/cancelled Execution later dispatch a pending confirmed Effect? **No.**
- Does an Agent Stage create a Stage Execution? **No.**
- Does an Agent Stage call a child Agent Execution? **Yes.**
- Does a Workflow Stage call a child Workflow Execution? **Yes.**
- Does the parent flatten or inspect child topology? **No.**
- Is child authority explicitly requested and attenuated? **Yes.**
- Can a structured child terminal result silently become transition text? **No.**
- Can a child cancellation be mistaken for child failure? **No.**
- Does a Stage child get spawned more than once merely because the parent re-enters after waiting?
  **No.**
- Did E.2 implement `reply_and_ask()`? **No.**
- Did E.2 implement memory, supervision, parallel branches, or protocol expansion? **No.**
