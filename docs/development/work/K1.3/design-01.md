# Design 01 — K1.3

Implementer: Claude Code desktop, Claude Opus 5.5 (`claude-opus-5-5`), 2026-10-25. Base B
`22c8c1db9958049eb8693dd5aa4d7005f2d565db`. This note answers [brief 01](brief-01.md)'s questions 1–6 and
suspect designs 1, 2 and 4 (3 and 7 are settled by the owner's answers). It covers both ranges. A Prompt E
adversary attacks it next, then a Codex GPT-6 design check that reads the attack record. No production code is
written before the check.

Owners read: [waits](../../../../mental-model/mechanisms/waits.md),
[lifecycle](../../../../mental-model/mechanisms/lifecycle.md#cancellation-order),
[core § waiting](../../../../mental-model/concepts/core.md#waiting-for-what-arrives),
[operations § three clocks](../../../../mental-model/concepts/operations.md#three-clocks),
[recovery](../../../../mental-model/mechanisms/recovery.md),
[execution-cycle](../../../../mental-model/mechanisms/execution-cycle.md),
[creation](../../../../mental-model/mechanisms/creation.md),
[identity § receipts](../../../../mental-model/concepts/identity.md#acceptance-boundary-and-receipt),
[authority § ingress](../../../../mental-model/mechanisms/authority.md#establish-identity-at-trusted-ingress),
the worksheet's B, CL, W and CX families ([protocol worksheet](../../../../tests/fixtures/k0/protocol-worksheet.md)
§3–§7), [rewrite-index §4 and §5](../../../../mental-model/rewrite-index.md#4-explicitly-undecided--implementation-owned),
[BASELINE](../../002-implemented-kernel-baseline.md#outcome-acceptance-api), [017](../../017-known-limitations.md),
[research §6](../../research/2026-10-02-canonical-bytes-kernel.md#6-waits-timers-and-cancellation-k13) and the K0.2
fixture vocabulary (`tests/conformance/k0/protocol-vocabulary.ts`, `scenarios.ts`).

**Ownership.** Everything here is Kernel semantics in the in-process binding (`packages/kernel`). One optional
Driver member is proposed (brief question 5, owner question Q2); no deployment claim changes. Nothing needs a
Layer-1 or Layer-2 change.

## Mechanism

### 1. In one paragraph

An `await` Outcome carries a wait: dependency alternatives, input subscriptions and an optional deadline. The
Outcome decision registers it in the worksheet's four ordered steps and leaves the Execution `WAITING` or, when an
eligible Event is already queued or the deadline is already due, `READY` with **wait-ended readiness**. Later, an
eligible input's own ingress decision, or a host-delivered timer fire the Kernel resolves against its own clock and
state, retires the wait and records the readiness. The next dispatch selects its batch by the retired selector.
`cancelExecution`, and an Execution-deadline timer fire, take one cancellation decision: every unprocessed Event
gets a terminal disposition, any open exchange ends unacknowledged, any wait or readiness is discarded, and the
Execution is `CANCELLED`. Every decision is one plan of COORD-REFACTOR-01's closed union. The Kernel reads time only
through an injected clock, and only at two points: registration of a wait with a deadline, and a timer fire.

### 2. Public surface

All changes are in `@arrokothi/kernel` (private package; no SDK consumer is routed through it yet, K1.4).

| Surface | Change |
|---|---|
| `CoordinatorOptions.clock?: KernelClock` | New. `KernelClock { now(): number }`, a trusted host object like the Driver. Validated at construction (an object whose own chain, never a built-in prototype, supplies a callable `now`; otherwise `RangeError`). Without a clock, the coordinator supports no deadline: a wait deadline or an Execution deadline is refused (§3, §9). |
| `CreateExecutionRequest.executionDeadline?: number` | New, owner decision 1. A safe integer ≥ 0 on the clock's scale. Part of creation's canonical content; immutable. |
| `OutcomeNext` `await` arm | `{ step: "await", wait: WaitDeclaration }` replaces `wait: unknown` (§3). |
| `AuthenticatedCaller.cancelScopes?: readonly string[]` | New (brief question 4; owner question Q1): the separate cancel power, read through `hostMember`. |
| `ExecutionDriver.requestInterrupt?(activation): undefined` | New and optional (brief question 5; owner question Q2): asked after an accepted cancellation that ended an open exchange; never awaited, its return and throws ignored. |
| `ExecutionCoordinator.cancelExecution(caller, executionId)` | Implemented (was the K1.3 unsupported surface). Returns `Result<CancellationDecision, RefusalRecord>`. |
| `ExecutionCoordinator.pendingTimers()` | New host entry: every deadline the Kernel would honour now (§7). |
| `ExecutionCoordinator.fireTimer(key)` | New host entry: "time has passed for this timer"; a hint the Kernel resolves (§7). |
| `OutcomeAccepted.wait` | New: `{ generation, result: "waiting" \| "woken" \| "expired", timeoutEventId } \| null`. Retained with the decision, so a replay returns it. |
| `ActivationEvent`, `MailboxEntryView` | Become unions on `sourceCategory`: the existing `application_input` member unchanged, plus `kernel_timeout` (§11). |
| `ExecutionView` | New members `executionDeadline`, `wait`, `waitEndedReadiness`, `retiredWaits`, `timerFires`, `cancellation`, `losingOutcomes` (§11). |
| `RefusalClassification` | New: `cancellation_terminal_conflict` (CX-6; the K0.2 fixture's spelling), `not_ready` (dispatch while `WAITING`), `clock_unavailable` (the clock threw or returned no usable reading). `unauthorized_control` also covers a visible caller without cancel power. |
| `RecoveryHistoryRecord` | `transition` gains `ended_by_cancellation`; `authority` gains `cancellation` and `execution_deadline` (§9). |
| `refuseUnsupportedSurface` | Stays exported for future surfaces; no coordinator member uses it after K1.3. |

### 3. The wait declaration and its validation (K13-1)

```ts
interface WaitDeclaration {
  readonly dependencies?: readonly DependencyAlternative[]; // absent and [] mean the same
  readonly subscriptions?: readonly InputSubscription[];    // absent and [] mean the same
  readonly deadline?: number;                               // safe integer >= 0, clock scale
}
interface DependencyAlternative { readonly eventIdentity?: string; readonly kinds?: readonly string[]; readonly correlation?: string }
interface InputSubscription { readonly subscriptionClass: string }
```

Field names follow the K0.2 fixture vocabulary, so K1.4's port is wiring. One kind is a one-element `kinds` list:
"equal to one kind" and "member of a one-element set" are the same test, so one spelling suffices.

`captureNext` reads the wait eagerly with the rest of the envelope (DEC-10's single reading), because an exact
duplicate must compare the wait too. Its issues are content-group issues: they decide a refusal only after the
exchange checks and submission authority pass, exactly like every other content issue today. Each row is one
deterministic case in K13-1's table.

| Rule (source) | Spelling refused | Issue code |
|---|---|---|
| Both lists empty is malformed, even with a deadline (W-1 rule 1; waits § Declare) | `{}`, `{deadline: 5}`, `{dependencies: [], subscriptions: []}` | `empty_wait` |
| An alternative supplies at least one of the three fields (W-1 rule 2) | `{dependencies: [{}]}` | `empty_alternative` |
| A supplied kind set is non-empty (W-1 grammar) | `{dependencies: [{kinds: []}]}` | `empty_kind_set` |
| No selector outside the three fields; no extra wait or subscription field (W-1 grammar; K1.2-DEC-1 "nothing silently stripped") | `{dependencies: [{payload: …}]}`, `{interleave: …}`, `{subscriptions: [{subscriptionClass: "a", label: "b"}]}` | `unknown_field` |
| Each value has its declared form | a list field that is not a list, an entry that is not a record, text that is not a string, `kinds: "a"`, `deadline: null / -1 / 1.5 / "5"` | `unsupported_form` |
| Text is identity text (the K1.1 rule `subscriptionClass` already follows) | lone surrogate, over-long | existing value codes |
| A deadline needs a clock (§2) | `{subscriptions: [...], deadline: 5}` on a coordinator without `clock` | `deadline_unsupported` |
| A declared operational bound: at most 256 selector strings per wait, counting each subscription class, kind, event identity and correlation; each list's length is read before its elements (like the Emission limit) | 257 strings | `too_many_selectors` |

Not refused, deliberately: duplicate subscriptions, kinds or alternatives (equality semantics are unchanged by
repetition; refusing would invent a rule, cf. K0.2 finding `K02-R4-01`); the empty string as a subscription class or
kind (identity text allows it, and K02-R4-01 says the same); alternatives that can never match (inert alternatives
count toward non-emptiness, W-1; waits § Declare). Well-formedness is structural, never satisfiability.

The Outcome's content identity packs the wait injectively: step `await`, then the dependency count and each
alternative (presence and value of each field, kind count and kinds in order), the subscription count and classes in
order, and the deadline's presence and value. Absent and empty lists pack the same, as Emissions do today.

### 4. Eligibility (K13-2)

One pure function in a new module `waits.ts`:

```text
eligible(wait, event):
  application_input -> event.subscriptionClass !== null and some s in wait.subscriptions: s.subscriptionClass === event.subscriptionClass
  kernel_timeout    -> false
```

The category comes from the path that accepted or minted the Event and is stored on the mailbox entry; nothing reads
`kind` or the payload to decide it. Input ingress always stores `application_input`; only the expiry decision mints
`kernel_timeout`. The function ends with a `never` check on the category, so K2's trusted categories must be handled
before they can exist. `matchesAlternative(alternative, facts)` implements the W-1 grammar (AND within an alternative,
equality only) and is exported to the selector unit tests; in K1 no live category reaches it, which is the brief's
"dependency alternatives are inert in K1" limit.

A subscription matches the producer-declared `subscriptionClass` that K1.1 already accepts and packs into input
identity (its own doc says "Matched by K1.3, not here"), never the input's `kind`. Kind stays a label the Runtime
branches on.

### 5. Registration inside the Outcome decision (K13-3)

`submitOutcome` keeps its order (scope, replay lookup, terminal/cancellation fence, exchange currency, submission
authority, content). For an accepted `await`, `#accept` evaluates the worksheet's W-2 steps while it builds the plan:

1. Acknowledge the whole reserved batch, as today.
2. Generation `g` = the Execution's registration count + 1. Test every queued mailbox entry not in the batch. If one
   is eligible: the wait is created and retired in this decision, readiness `{species: "event", g, selector}`, next
   state `READY`, no timeout Event.
3. Otherwise, if the wait has a deadline and the decision's clock reading `now` satisfies `now >= deadline`: created
   and retired, one timeout Event minted at this decision's acceptance position, readiness
   `{species: "deadline", g, selector, timeoutEventId}`, next state `READY`. Durable `WAITING` is never persisted.
4. Otherwise: next state `WAITING`, live wait `{g, registeredBy, wait, deadline}`.

**One clock reading per decision.** When capture produced a complete Outcome whose next step is an `await` with a
deadline, `submitOutcome` calls `clock.now()` once, right after capture and before the replay lookup and every state
check, so a clock that reenters the coordinator is ordered before this decision exactly like a caller getter
(K1.2-DEC-10), and the plan's basis is read after it. This happens on every such call, a replay included; no other
`submitOutcome` call reads the clock. The reading is consulted only by step 3. A clock that throws or returns anything
but a safe integer ≥ 0 is recorded as unusable; it matters only if step 3 is reached, where the Outcome is refused
whole as `clock_unavailable`. A replay, a stale or losing proposal and a step-2 wake are therefore never affected by
the clock.

The current batch cannot wake its own wait because step 1 runs first and step 2 excludes batch members. A
subscription-only wait takes the same step 2 (W-8 case 1). The "eligible and due" tie goes to step 2.

### 6. Wake inside the input decision (B-6 path B)

`submitInput` is unchanged up to its accept path. When the Execution is `WAITING` and the new entry is eligible under
the live wait, the same input plan retires the generation and records readiness `{species: "event", g, selector}`
with next state `READY`. Only the new entry needs testing: every entry queued at registration was tested by step 2,
every entry accepted since was tested by its own ingress decision, and all were ineligible or the wait would have
retired; entries and selectors are immutable; and the queued set only grows while `WAITING`, because only an
accepted Outcome (impossible without an exchange) or a terminal decision (which ends `WAITING`) changes a
disposition. An input accepted while `READY` or `RUNNING` creates no readiness (B-8). The ingress answer is
unchanged; inspection shows the wake.

### 7. Timers: the host entry and expiry (K13-4, K13-8)

The Kernel owns every deadline as accepted state: a live wait's deadline and an Execution's deadline. A host
scheduler pumps time through two entries that take no caller, because a fire carries no authority: it can only
cause what the Kernel's own clock and state already make due.

- `pendingTimers()` lists `{executionId, kind: "wait_deadline", generation, deadline}` for every `WAITING` Execution
  whose live wait has a deadline, and `{executionId, kind: "execution_deadline", generation: null, deadline}` for
  every nonterminal Execution with an Execution deadline, in creation order. Retired generations and terminal
  Executions never appear, so a pending timer can never keep a terminal Execution alive (the DTFx trap).
- `fireTimer(key)` resolves the key against current state and answers `{result, reason, timeoutEventId}`. It observes
  the key's fields once, own-only. An unknown Execution or a malformed key answers `unknown` and records nothing.
  Otherwise it reads the clock once (an absent clock counts as an unusable reading), then reads the basis and takes
  the first matching row:

| Key | Condition, in this order | Result | Recorded |
|---|---|---|---|
| wait `g` | `g` already retired by its deadline | `duplicate` (names the existing timeout Event) | fire record only |
| wait `g` | `WAITING` with live generation `g` that has a deadline, clock unusable | `clock_unavailable` | fire record only |
| wait `g` | the same, `now >= deadline` | `expired`: one timeout Event at the next acceptance position, `g` retired, deadline readiness, `READY` | expiry plan |
| wait `g` | the same, `now < deadline` | `not_due` | fire record only |
| wait `g` | anything else: retired by an Event or by cancellation, superseded, never issued, live without a deadline, Execution terminal | `stale` | fire record only |
| Execution | no Execution deadline set | `stale` | fire record only |
| Execution | terminal and cancelled by this deadline | `duplicate` | fire record only |
| Execution | terminal otherwise | `stale` | fire record only |
| Execution | nonterminal, clock unusable | `clock_unavailable` | fire record only |
| Execution | nonterminal, `now < deadline` | `not_due` | fire record only |
| Execution | nonterminal, `now >= deadline` | `cancelled`, through the cancellation decision (§9) | cancellation plan |

A fire record `{timer, generation, observedAt, result, reason}` is operational evidence appended to the Execution's
`timerFires`. It changes no lifecycle state, mailbox entry, wait, readiness, progress or acceptance position; that is
what "discarded with an inspectable reason and no state change" means here. Timer acceptance issues no receipt
(identity § receipts: "introduces no seventh receipt"). Expiry happens only through this entry: an Event accepted
before the fire wins even if the deadline instant has passed (W-9 case 4: "decided by Kernel acceptance order and
nothing else"). The same holds for the Execution deadline (§9).

The timeout Event: ID `timeout-${packIdentity([executionId, g])}`, a pure function of its generation, so a second
mint for one generation would collide by construction; kind `kernel.wait.timeout` (the K0.2 token); payload canonical
`null`; `sourceCategory: "kernel_timeout"`; `waitGeneration: g`; `deadline`. It is an ordinary mailbox entry:
acknowledged, ordered and disposed like any other. Minting is never refused by mailbox capacity, which bounds
ingress only; once queued it counts toward the capacity later ingress sees.

### 8. Batch selection at dispatch (K13-5)

`dispatch` refuses `WAITING` as `not_ready` (waits § Selecting: no dispatch while `WAITING`). In `READY`:

- **Ordinary readiness** (none stored): the first `bound` queued entries in acceptance order, as today.
- **Wait-ended readiness:** candidates are the entries queued *at reservation* that are eligible under the stored
  selector. The mandatory member is the earliest eligible entry (event species) or the stored timeout Event (deadline
  species). Retain it first, fill the remaining capacity with the earliest remaining candidates, present the batch in
  acceptance order.

The selector is re-evaluated at reservation; no candidate set is materialized at wake (the worksheet's "stale
snapshot" hazard). The dispatch plan always clears readiness, so it never spans two exchanges or re-arms; redelivery
and takeover reuse the pinned batch as today. The mandatory member is always queued at reservation: nothing but an
accepted Outcome acknowledges, and none can occur between the wake and the reservation; a terminal decision removes
the readiness with it.

### 9. Cancellation and the Execution deadline (K13-6, K13-7)

`cancelExecution(caller, executionId)`:

1. Visibility: invisible answers `unknown_destination`, identical to missing.
2. Cancel power: `cancelScopes` must hold the Execution's scope, else `unauthorized_control` (scoped, Execution named,
   nothing changed).
3. Terminal: `COMPLETED` or `FAILED` answers `ok({changed: false, state, result})`; `CANCELLED` answers
   `ok({changed: false, state, cancellation})`. Nothing changes (lifecycle § Cancellation order; CX-2; research §6
   item 5).
4. Otherwise one cancellation plan, built from Kernel data:
   - every queued entry, including an open exchange's reserved batch and any queued timeout Event, gets
     `{kind: "terminal", reason}`, the B-5 shape;
   - an open exchange ends unacknowledged and is retained in the cancellation record with its batch, dispatch receipt
     and shared delivery log, so a late report still settles its own row;
   - a live wait is retired (`retiredBy: "cancellation"`), with no timeout and no readiness; stored readiness is
     discarded, which suppresses the Activation it would have produced;
   - each recovery hold on the open exchange gets an `ended_by_cancellation` history record (K1.2-DEC-18);
   - state `CANCELLED`; the record `{cause, actorNamespace, actorScope, position, exchange, retiredGeneration,
     terminalDispositions}` takes the next acceptance position and mints no receipt (identity § receipts lists six
     receipt boundaries; cancellation is not one).
5. After `apply`, for either cause, if an exchange was open and the Driver supplies `requestInterrupt` (resolved on
   the Driver's own chain, never a built-in prototype), it is called once with the current attempt's Activation;
   return ignored, throw caught, nothing recorded. The cancellation is already committed, so a reentrant call sees
   `CANCELLED`.

Request acceptance and the terminal transition are one decision: there is no pending/applied marker, so nothing can
defer the fence (CX-6 "left open" constraint).

**Execution deadline.** `executionDeadline` joins creation content: the creation identity gains a seventh packed part
only when a deadline is present, so every K1.1 identity without one is byte-for-byte unchanged, and an added, removed
or changed deadline under the same key conflicts. Creation never reads the clock; a deadline already past at creation
still creates a `READY` Execution, and the fire cancels it. Expiry is the §7 fire forming the same cancellation plan
with `cause: "execution_deadline"`, actor = the creating producer's namespace and the Execution's scope (the authority
that set the deadline), and disposition reason `Execution ended as CANCELLED (its Execution deadline expired) before
this Event was acknowledged`. Explicit cancellation uses `Execution ended as CANCELLED before this Event was
acknowledged`. No timeout Event and no further Activation follow either.

### 10. Losing Outcomes (CX-6)

In `submitOutcome`, after the replay lookup (OA-2 is unchanged, so an Outcome accepted before cancellation still
replays its receipt, and different content under its identity still conflicts) and before every other check:

- if the Execution is `CANCELLED`, the proposal loses whatever its step, epoch, grant or content. When its Activation
  identity and captured content are both well formed, the key `packIdentity([activationId, contentIdentity])` (the
  content identity already packs the epoch and base revision) is looked up in the losing-proposal index: a hit
  returns **the same retained refusal object**; a miss records a new refusal `cancellation_terminal_conflict` with
  reason exactly `cancellation accepted before Outcome acceptance` (the K0.2 fixture compares it verbatim) and a
  retained losing-proposal record `{activationId, writerEpoch, baseProgressRevision, refusal}` plus its content
  identity, which is the index entry. This is CX-6's "record the losing proposal — its scoped
  Execution/Activation/epoch/base revision and canonical content". A proposal without a usable identity or content
  gets the same classification and reason in an unindexed refusal: there is no canonical content to make a retry
  "exact".
- `COMPLETED` and `FAILED` keep K1.2's `terminal_destination` (question Q4).

Nothing of a losing proposal is installed: no acknowledgment, progress, Emission, wait, deadline, readiness or
next-state change. Input to a `CANCELLED` destination is refused as `terminal_destination` and not queued (K1.1);
dispatch, redelivery, takeover and the recovery controls refuse it as `terminal_destination` through their existing
terminal checks.

### 11. Representations chosen (question 2)

Each choice is recorded in BASELINE and in its rewrite-index §4 row, as that section's convention asks. The one
item with an in-page marker (the clocks) also gets the binding's answer at the marker, which stays. No other
Layer-3 page gets a binding note: spec pages carry no implementation status.

| Item (rewrite-index §4) | This binding's choice |
|---|---|
| Wait generation | Per-Execution integer from 1, one per accepted `await`, including generations retired at registration; compared by equality. Unique for the coordinator's lifetime because Execution IDs are never reused (no key expiry), so Restate#5425's purge-and-reuse cannot arise. A persistent profile must persist the counter (K3). |
| Subscription spelling | `{subscriptionClass}`; matches application input whose producer-declared `subscriptionClass` is equal. |
| Timeout kind token, discriminant, identity | `kernel.wait.timeout`; `sourceCategory: "kernel_timeout"`; ID packed from Execution ID and generation; payload `null`; `waitGeneration` and `deadline` fields. |
| Wait-ended readiness storage | One owner field: species, generation, the retired selector by reference, and the timeout Event ID for the deadline species; the selector is re-evaluated at reservation. |
| Cancellation-request storage, rejection encoding | One frozen cancellation record per Execution (§9); losing proposals as retained refusals plus an index keyed by Activation identity and content identity (§10). |
| Clock units, precision, instant source | Safe integers ≥ 0 in host-chosen units (BASELINE recommends milliseconds); instant source = the injected `KernelClock`; no monotonicity assumed: a reading that goes back only delays expiry. Lease model: not implemented (K3). Also at operations' `OPEN(implementation)` marker. |

New inspection members: `executionDeadline: number | null`; `wait` (the live generation, declaration and deadline)
or `null`; `waitEndedReadiness: {species, generation} | null`; `retiredWaits` (generation, registering Activation,
deadline, `retiredBy: "event" | "deadline" | "cancellation"`, ending Event ID or `null`); `timerFires`;
`cancellation` or `null`; `losingOutcomes` (the retained losing-proposal records without their content identity).
The timeout member of the mailbox and Activation unions has no `inputId`, `receipt` or `subscriptionClass`; the
application-input member is unchanged.

### 12. Plan variants (question 3)

Every plan still names `basis`, read after the planner's last callback (caller accessor, host member, clock, Driver),
and the owner still refuses a stale basis. The union grows from nine to thirteen variants.

| Variant | Formed by | Carries | Basis read after | Refused before planning |
|---|---|---|---|---|
| `OutcomePlan` (extended) | `submitOutcome` accept | `wait: {generation, live \| null, retired \| null, readiness \| null, timeout entry \| null} \| null` beside today's members | capture and the clock reading | today's refusals, plus `cancellation_terminal_conflict`, `clock_unavailable` |
| `InputPlan` (extended) | `submitInput` accept | `wake: {generation, retired, readiness} \| null` | content capture | unchanged |
| `DispatchPlan` (extended) | `dispatch` accept | the selected batch; the owner always clears readiness | bound observation | plus `not_ready` |
| `ExpiryPlan` (new, `expiry`) | `fireTimer`, current wait due | timeout entry, retired record, readiness, fire record, answer | the clock reading | — |
| `CancellationPlan` (new, `cancellation`) | `cancelExecution`; `fireTimer`, Execution deadline due | positions to end, the ending disposition, cancellation record, retired-wait record or `null`, ended-hold history, fire record or `null`, answer | `cancelScopes` (a host getter may run); for a fire, the clock | `unknown_destination`, `unauthorized_control`; terminal answers form no plan |
| `LosingOutcomePlan` (new, `losing_outcome`) | `submitOutcome` on `CANCELLED`, indexable | index key, refusal | capture and clock | — |
| `TimerDiscardPlan` (new, `timer_discard`) | `fireTimer` with no transition | fire record | the clock reading | — |

Each new variant gets one owner arm with the two phases. Prepare-phase checks the owner adds (suspect 2):

- **S1 Terminal never reopens.** The input, dispatch, delivery, Outcome, takeover, control, expiry and cancellation
  arms refuse a record in a terminal state. Only settlement (late reports), refusal, losing-outcome and timer-discard
  arms apply to a terminal record, and none of them writes lifecycle, mailbox, wait, readiness or progress fields.
- **S2 Terminal completeness.** A plan whose next state is terminal (`complete`, `fail`, cancellation) must dispose
  every queued position: acknowledged or ended. Otherwise the owner refuses it.
- **S3 `WAITING` iff one live wait.** The Outcome arm installs a live wait exactly when its next state is `WAITING`;
  the input-wake, expiry and cancellation arms require the live generation they name.
- **S4 One timeout per generation.** The expiry arm requires `WAITING` with the plan's generation live; the Outcome arm
  mints only for the generation it creates. A generation retires once, so it mints at most once.
- **S5 Readiness lifetime.** Only the Outcome, input-wake and expiry arms set readiness, and only over `null`; the
  dispatch and cancellation arms clear it.

`state-plans`, `control-commits` (per-arm commit table, per-field writer table), `state-types`,
`kernel-state-ownership` and `state-owner-controls.json` extend to the new variants and fields.

### 13. Modules

New `waits.ts` (pure: `eligible`, `matchesAlternative`, `selectWaitEndedBatch`, no state, no callbacks) and
`time.ts` (the `KernelClock` type and `readClock`, which resolves `now` through `hostMember`, calls it with the
load-time `Reflect.apply` and validates the reading). Wait capture goes in `outcome.ts` beside the other captures.
`coordinator.ts`, `plan.ts`, `state.ts`, `state-records.ts`, `inspection.ts`, `driver.ts`, `identity.ts`,
`refusal.ts`, `lifecycle.ts`, `unsupported.ts` and `index.ts` change. The zone inventory, the `target-kernel` module
count in `kernel-ownership.md` (19 → 21) and the landing-zone test's anchors follow.

### 14. Ranges

- **Range 1 (waits and wait deadlines):** §3–§8, the clock, the timer entries, the `kernel_timeout` category, the
  Outcome, input, dispatch and expiry plans and S3–S5, K13-1 to K13-5 and K13-8, waits/core/operations Layer 3.
- **Range 2 (cancellation and the Execution deadline):** §9–§10, `cancelScopes`, the Driver hook, the cancellation
  and losing-outcome plans, S1–S2, K13-6 and K13-7, then K13-9 over the whole; lifecycle/creation Layer 3.

Range 1 is committed as an intermediate C with its own CI verify, but is not reviewed alone; one review covers both.

## Why each criterion closes

**K13-1 — grammar and well-formedness.** Mechanism: `captureNext` reads the wait with a closed field list per object
and the rules of §3's table, and refuses the whole Outcome on any issue. Coverage: the declaration has exactly the
grammar's three object kinds (wait, alternative, subscription) plus scalars; each rule is a check at one of them, and
an unknown own field anywhere is refused by the existing `refuseUnknownFields`. Evidence: a table test, one row per
rule of §3 (valid and invalid), with the refusal classification `malformed_envelope`, the issue code, and an unchanged
whole view; plus K1.2's ordering property kept: a malformed wait from a stale or grant-less proposal discloses no
content diagnostic.

**K13-2 — eligibility from trusted category.** Mechanism: §4; the category is written once, by the accepting
decision, and the function branches on it before any selector. Coverage: K1 has two categories and the `never` check
closes the switch. Evidence: (a) selector units for `matchesAlternative` over synthetic trusted facts (each field, AND,
any-of, kind sets, identity equality, no payload access); (b) live: a wait with alternatives naming the kinds
`external.input` and `kernel.wait.timeout`, an already-accepted input's own Event ID, and a correlation, and no
subscription, receives inputs whose kind and payload imitate each (an input cannot carry a correlation at all); none
wakes, all stay queued, and the named input stays queued too (W-7 cases 6–7); (c) the same input
with a matching `subscriptionClass` wakes; (d) an input whose `kind` is `kernel.wait.timeout` is still
`application_input` in the view and in the Activation.

**K13-3 — registration.** Mechanism: §5, inside one plan. Coverage: the four steps are exhaustive and mutually
exclusive by construction (step 3 runs only when step 2 found nothing). Evidence, one case per branch: eligible queued
→ `READY`, event readiness, no timeout; nothing eligible and deadline due (including `now == deadline`) → `READY`,
exactly one timeout, `WAITING` never observable; deadline in the future → `WAITING`; no deadline → `WAITING`; the tie
(eligible and due) → event wins, no timeout; the own batch at bound ≥ 2 cannot wake → `WAITING`; subscription-only
path A; an instrumented clock proves one reading for an await with a deadline and none for every other decision; a
reentrant clock that cancels the Execution makes the Outcome lose (`cancellation_terminal_conflict`).

**K13-4 — ending a wait.** Mechanism: §6, §7. Coverage: a generation is retired by exactly one of: step 2, step 3, an
input wake, an expiry, a cancellation; each records `retiredBy` once; `fireTimer` classifies every key by the §7 table,
whose conditions are exhaustive in the order given. Evidence: a repeated fire (`duplicate`, one timeout Event, no
second readiness, before and after reservation and after the next Outcome: W-9 case 6); a stale fire after a wake;
a stale fire of `g1` while `g2` is live (W-9 case 2, `g2` untouched); a not-due fire; a fire after cancellation; a late
input matched by a later wait (W-6 case 4: timeout first, input accepted while `READY`, queued at bound 1, then the
next `await` wakes on it at registration).

**K13-5 — batch selection.** Mechanism: §8. Evidence: the five
[small distinguishing examples](../../../../mental-model/mechanisms/waits.md#small-distinguishing-examples) as five
separate Kernel cases, with the exact batch and the exact remaining queue. Three wrong rules are written as test-local
alternative selectors over the same mailbox facts (ignore eligibility; freeze candidates at wake; treat the timeout as
merely earliest), and each must fail at least one of the five cases (the K0.2 discrimination method). The two that are
one-line source changes (drop the eligibility filter; drop mandatory-first retention) are also registry mutants of
`waits.ts`, killed by the five cases.

**K13-6 — cancellation order.** Mechanism: §9, §10, S1, S2. Ordering: in-process, a decision is one synchronous call
whose plan is formed after its last callback and applied at once; a cancellation's apply advances the version, so no
plan formed before it can apply after it (the owner throws on a stale basis, an invariant violation correct code never
reaches). Evidence: both orders of cancel and `continue`/`await` (with a deadline)/`complete`/`fail`; cancel in each
nonterminal state (`READY` ordinary; `READY` with event readiness; `READY` with deadline readiness and a queued
timeout; `RUNNING`; `RUNNING` with both holds; `WAITING` with and without a deadline); the losing proposal's exact retry
returns the same refusal object; an Outcome accepted before cancel replays its receipt after it; repeated cancel and
cancel of `COMPLETED`/`FAILED` report and change nothing; cancel without cancel power is refused scoped; a Driver that
reenters `submitOutcome` from `requestInterrupt` loses; takeover whose safety callback cancels refuses
`terminal_destination` (K1.2-DEC-19 path).

**K13-7 — Execution deadline uses the same path.** Mechanism: §9, one plan builder for both causes. Evidence: from the
same prefix, explicit cancel and deadline expiry produce views equal after masking exactly `cancellation.cause`,
`cancellation.actorNamespace`, `cancellation.actorScope`, the disposition `reason` strings and `timerFires`; neither
mints a timeout or allows a further dispatch; creation retry with the same deadline replays and with an added,
removed or changed deadline conflicts; a coordinator without a clock refuses a deadline at creation
(`malformed_value`, `deadline_unsupported`).

**K13-8 — no ambient time.** Structural: the ambient-reads census gains a time-source rule. No zone file may reference
`Date`, `performance`, `setTimeout`, `setInterval`, `setImmediate`, their `clear*` forms, `queueMicrotask`, `process`,
`Temporal`, `Atomics` or `globalThis`, or import `node:timers`, `node:perf_hooks`, `node:process` or
`node:worker_threads`. Like L-11's guards, this is a bounded syntactic guard, not a proof about future code. Runtime
check: a catalog of the K1.3 boundary calls runs with `Date`, `performance`, the timer functions and
`queueMicrotask` replaced by throwing stubs inside each call's window (the poison catalog's window method), and every
result must equal the unstubbed run. Deterministic: every test drives a manual clock.

**K13-9 — race schedules lose nothing.** A declared bounded search, specified next.

### K13-9: the declared search

**Harness.** One coordinator per run, a fake Driver that keeps every delivered Activation, grant and reporting
capability and never reports by itself, a manual clock starting at 0, a caller with the Execution's scope in `scopes`
and `cancelScopes`, and the batch bound `B`. The host learns wait timer keys from `pendingTimers()` after every step and
never forgets one, so old keys become stale exactly as a real scheduler's would.

**Alphabet** (13 letters; each is one host or API action):

| Letter | Action |
|---|---|
| `i` | `submitInput` with a fresh key, `subscriptionClass: "x"` (never eligible) |
| `e` | `submitInput` with a fresh key, `subscriptionClass: "s"` (eligible under the script's wait) |
| `d` | `dispatch` with bound `B` |
| `c` | `submitOutcome` `continue` for the newest Activation the Driver received, with its grant |
| `w` | the same, `await {subscriptions: [{subscriptionClass: "s"}], deadline: now + 10}` |
| `z` | the same, `await` with `deadline: now` (due at registration) |
| `k` | the same, `complete` |
| `r` | repeat the most recent `submitOutcome` call exactly (same envelope object, same grant) |
| `t` | clock := max(clock, the newest held wait key's deadline); `fireTimer` that key |
| `s` | the same for the oldest held wait key |
| `x` | clock := max(clock, Execution deadline); `fireTimer` the Execution-deadline key |
| `q` | `cancelExecution` |
| `p` | the Driver calls `delivered()` on its oldest unreported capability |

An Outcome letter before any Activation, `t`/`s` with no held key, or `p` with no unreported capability, is a
recorded skip. `fail` is left out: K1.2
covers it, and its path differs from `complete` only in the result kind, which the K13-6 deterministic cases cover.

**Seeds** (each a fixed prefix after creation with initial input `I0`, `subscriptionClass: "x"`):

| Seed | Prefix | State it starts from |
|---|---|---|
| S0 | — | `READY`, `I0` queued |
| S1 | — (created with Execution deadline 25) | `READY` with an Execution deadline |
| S2 | `d w` | `WAITING` on `g1`, deadline 10 |
| S3 | `d w e` | `READY` with event readiness; the host holds the stale `g1` key |
| S4 | `d w e d w` | `WAITING` on `g2`; the host holds `g1` (stale) and `g2` |
| S5 | `d w t` | `READY` with deadline readiness; timeout `T1` queued |
| S6 | S1 then `d w` | `WAITING` with both a wait deadline and an Execution deadline |
| S7 | `d` | `RUNNING`, batch `[I0]` |

**Depth and scope.** Every word of exactly four letters from every seed, at `B = 1` and `B = 2`: 13⁴ × 8 × 2 = 456,976
runs, each checked after every step, so every shorter word is checked as a prefix. Effective depth reaches nine
letters (S4). The run prints the counts and fails if any class below has no witness. A seeded random walk (20,000 words
of length 12 from S0 and S1 at both bounds) runs beside it as supplementary evidence, outside the claim. The search
runs as its own verify check; `npm test` runs the depth-2 slice.

**Oracle.** A reference model in the test tree, written from the governing sources and importing nothing from the
Kernel. It holds lifecycle state, the mailbox (category, eligibility, disposition), the open exchange, the live wait,
readiness, retired generations and how each retired, the cancellation record, the clock, held keys, the last
submission and the losing-proposal index. Its transition rules, one per letter:

| Letter | Expected outcome (source) |
|---|---|
| `i`, `e` | Nonterminal: accepted as a new Event at the next position. If `WAITING` and the Event is eligible (only `e`): the wait retires, event readiness, `READY` (waits § Ending row 2; B-6 path B). Otherwise no readiness (B-8). Terminal: `terminal_destination`, nothing queued (creation § "When the destination cannot take the input"). |
| `d` | `READY`: reserve the ordinary or the wait-ended batch (waits § Selecting); readiness consumed (B-8 lifetime); `RUNNING`. `RUNNING`: `exchange_unresolved`. `WAITING`: `not_ready`. Terminal: `terminal_destination`. |
| `c`, `w`, `z`, `k` | Accepted Outcome already under that Activation: equal content replays the same receipt, different content is `duplicate_conflict` (OA-2). Else `CANCELLED`: `cancellation_terminal_conflict`, recorded and indexed (CX-6). Else `COMPLETED`: `terminal_destination` (K1.2). Else not the open exchange: `stale_exchange`. Else accepted: whole batch acknowledged (B-3); `c` → `READY`; `k` → `COMPLETED` with every other queued Event terminal (B-5); `w`/`z` → W-2 steps 1–4 (§5). |
| `r` | Accepted before → same receipt (OA-2). Indexed loser → the same refusal object (CX-6 retry). Otherwise evaluated afresh under its letter's rule. |
| `t`, `s` | The §7 wait rows in order (W-3; W-9 "exactly one", "duplicate", "stale"). |
| `x` | The §7 Execution rows; a due fire cancels with cause `execution_deadline` (operations § three clocks). |
| `q` | Terminal: `changed: false`, nothing changes (CX-2). Otherwise §9 (lifecycle § Cancellation order; CX-6; B-5). |
| `p` | Only that delivery row changes (execution-cycle § Delivery reporting boundary). |

**Compared after every step:** the answer's kind and classification (for refusals) or its decision fields; and the
whole inspection view except receipt tokens (opaque by design), refusal reason text other than CX-6's (diagnostic
prose; CX-6's is compared exactly) and payload bytes (fixed by the harness). Event IDs are mapped to model names by
acceptance order.

**Invariants**, checked after every step independently of the model:

| ID | Invariant | Source |
|---|---|---|
| INV-1 | No lost input: every accepted or minted Event is in the mailbox exactly once; it leaves `queued` only by acknowledgment in an accepted Outcome whose batch held it, or by a terminal disposition at a terminal decision; a non-queued disposition never changes | B-3, B-4, B-5 |
| INV-2 | A terminal Execution never changes state, result, cancellation, progress, Emissions, dispositions or waits; only refusals, timer fires and late delivery rows grow | lifecycle intro; CX-2 |
| INV-3 | At a terminal state nothing is queued and no live wait, readiness or open exchange exists | B-5; W-3 |
| INV-4 | A live generation exists iff `WAITING`; at most one | W-3 |
| INV-5 | At most one timeout Event per generation, and one exists iff that generation retired by its deadline; its `waitGeneration` equals it | W-9 |
| INV-6 | Readiness exists only in `READY`, names a retired generation, and is gone after the next dispatch | B-8 |
| INV-7 | A dispatch that consumed readiness carries its mandatory member, nothing ineligible, and is never empty | B-2, B-6, B-7 |
| INV-8 | No lost wake: never `WAITING` while a queued Event is eligible under the live wait | W-2 step 2; B-6 path B |
| INV-9 | At most one open exchange; `RUNNING` iff one is open | lifecycle; execution-cycle |
| INV-10 | Acceptance positions strictly increase; progress revision changes only at an accepted Outcome; an accepted Outcome's retry returns the same receipt; an indexed loser's retry the same refusal object | OA-2; CX-6 |
| INV-11 | `p` changes nothing but its own delivery row | execution-cycle § Delivery reporting boundary |
| INV-12 | The open exchange's batch at a cancellation is terminal-disposed, never acknowledged | CX-6; B-3 |

**Classes and witnesses** (the expected outcome per class follows from the rules above; the search asserts each class
is hit):

| Class | Witness words | Expected |
|---|---|---|
| Eligible arrival before registration | S7 `e w` | `READY` at registration, event readiness; next batch holds `e` |
| Arrival inside the registering batch | S0 `e d w` at `B = 2` | `WAITING`: the batch acknowledged `e` (W-2 step 1) |
| Same at bound 1 | S0 `e d w` at `B = 1` | `READY`: `e` stayed queued and wakes at step 2 |
| Arrival while `WAITING` | S2 `e` | `READY` (path B); a later `t` is `stale` |
| Arrival after expiry | S5 `e d` | `e` creates no readiness; the batch is `[T1]` at `B = 1`, `[T1, e]` at `B = 2` |
| Ineligible arrivals | S2 `i i` | Still `WAITING`; both queued and unacknowledged |
| Due at registration | S7 `z`; S7 `e z` | One timeout, `READY`, never `WAITING`; with `e` queued, the event wins and no timeout exists |
| Stale timer after a wake | S3 `t` | `stale`, no change |
| Stale timer after re-registration | S4 `s` | `stale`; `g2` live and untouched |
| Duplicate fire | S2 `t t`; S5 `d t`; S5 `d c t` | `duplicate`; one timeout; no second readiness |
| Eligible versus deadline order | S2 `e t` against S2 `t e` | Decided by acceptance order alone (W-9 cases 3–4) |
| Cancel before Outcome | S7 `q k r` | `CANCELLED`; batch terminal; `k` loses; `r` returns the same refusal |
| Outcome before cancel | S7 `k q`; S7 `c q` | `COMPLETED` reported unchanged; `READY` cancelled |
| Cancel in each nonterminal state | S0 `q`, S7 `q`, S2 `q`, S3 `q`, S5 `q` | §9 in each; S5 disposes `T1` and dispatches nothing |
| Repeated cancel | S0 `q q` | `changed: false` |
| Losing `await` with a deadline | S7 `q w r` | No wait, deadline, readiness or generation accepted; the same refusal |
| Accepted replay after cancel | S7 `c q r` | The original receipt |
| Execution deadline | S1 `x`; S6 `x t`; S6 `t x`; S1 `d x k`; S1 `d k x` | Cancel by deadline; `t` stale after it; `T1` terminal-disposed when `t` came first; `k` loses; `x` after `k` is `stale` |
| Late report after cancel | S7 `q p` | Only the delivery row changes |
| Unmatched backlog through a wait | S2 `i e d`; S3 `i d c d` | `i` is in no wait-ended batch at either bound; the first ordinary batch after `c` carries it |

**Mutants the search must kill** (registered in `tests/fixtures/packet-tools/mutations.json`, killer: the search, plus
the deterministic case named): a timer fire that skips the generation check (K13-4 stale cases); expiry that mints
without checking an existing timeout (K13-4 duplicate); registration that skips step 2 (K13-3); registration with steps
2 and 3 swapped (K13-3 tie); input acceptance that arms readiness while `READY` (B-8 case); cancellation that
acknowledges the reserved batch (K13-6); cancellation that leaves stored readiness (K13-6, S5 `q`); a losing retry that
records a fresh refusal (K13-6 retry); deadline expiry on a `COMPLETED` Execution that cancels it (K13-7); dispatch that
does not clear readiness (K13-5); the two §8 selection mutants. The owner checks S1–S5 make several of these refused
plans rather than wrong state; the mutant then dies on the thrown invariant error, which the search reports as a
failure.

**What the search does not claim:** schedules outside the alphabet and depth; more than one Execution (decisions on
different Executions share no record); `fail`, holds and takeover inside the search (K1.2's corpus and the K13-6
deterministic cases cover them); hostile host objects (L-02). A schedule outside the declared space that the sources
do not decide becomes an owner question, as the brief's review gate says.

## Accepted designs relied on

| Design | Fit? | Note |
|---|---|---|
| COORD-REFACTOR-01 plans, one owner, basis | Fit | Four variants and three extended ones; Kernel-internal triggers form plans after their last callback like every other planner (suspect 1). |
| K1.2 B-5 terminal disposition `{kind: "terminal", reason}` | Fit | Reused unchanged by both cancellation causes. |
| K1.2 OA-2 order (replay before every fresh check) | Fit | The cancellation fence slots after it, as CX-6 and execution-cycle step 2 require. |
| K1.2 `terminal_destination` for Outcomes on `COMPLETED`/`FAILED` | Kept | CANCELLED alone gets `cancellation_terminal_conflict` (Q4). |
| K1.1 `subscriptionClass` on input, in content identity | Fit | It becomes the subscription match key; no change. |
| K1.1 per-Execution acceptance positions | Fit | Expiry and cancellation take positions without receipts; a path-A timeout shares its Outcome's position, as an ingress entry shares its receipt's. No test pins receipt positions as gap-free beyond refusals taking none. |
| K1.2-DEC-14 `controlScopes` | Kept for exchange controls | Cancel gets its own power (Q1). |
| K1.2-DEC-17 permitted actions | Unchanged | They list exchange operations; a hold never refuses cancellation, which is an Execution control. |
| K1.2-DEC-18 recovery history | Extended | `ended_by_cancellation` records, as for `ended_by_outcome`. |
| K1.1-c01 delivery reporting | Fit | A cancelled exchange keeps its shared delivery log in the cancellation record; `deliveriesOf` looks there too. |
| L-15 | Narrowed | See suspect 2. |
| The K1.0 unsupported-surface mechanism | Fit | No coordinator surface remains unsupported; the exported function stays for later packets. |
| Research §6 item 4 (refuse a terminal Outcome that ignores pending Events, Temporal's UNHANDLED_COMMAND) | Not adopted | Accepted K1.2/B-5 gives such Events a terminal disposition instead; adopting it would change accepted behaviour. |

The brief also lists the SDK's `application.test.ts` among tests to replace. It calls the legacy
`@arrokothi/core` `Harness.cancelExecution`, not the Kernel's, and pins no K1.3 refusal; the build leaves it alone and
records why.

## Suspect designs

**1. The plan basis under Kernel-internal triggers.** In the in-process binding, `fireTimer` and `cancelExecution`
are synchronous host calls. Each reads its inputs (the key; `cancelScopes`), then its one callback (the clock, for a
fire), then the basis, and forms and applies its plan with no callback in between, as every planner does. Two plans
can therefore never be formed against the same basis: the second call starts after the first applied, or inside the
first's callback before the first read its basis. Example: `fireTimer`'s clock reenters `cancelExecution`; the cancel
applies; the fire then reads the new basis, sees `CANCELLED`, and forms a timer-discard plan (`stale`). Nobody
re-forms, because no plan is formed early; the owner's stale-basis error stays an invariant violation, never control
flow. A multi-worker K3 profile can race for real; there the fire, being a hint, is resolved again from fresh state,
which yields the same owned results (`stale`, `duplicate`, no-op). That is recorded as K3's obligation, not built here.

**2. L-15.** Structural (owner-checked) after K1.3: S1 terminal never reopens; S2 terminal completeness; S3
`WAITING` iff one live wait; S4 one timeout per generation; S5 readiness lifetime; plus the existing basis check and
fixed commits. Still semantic under L-15: eligibility, batch selection, registration step order, which plan an
operation forms, and refusal precedence. Those are test-checked: K13-1 to K13-7's deterministic cases, the K13-9 search
with its model and invariants, and the registered mutants. The 017 L-15 entry is narrowed to say so.

**4. The Driver contract and cancellation.** See question 5.

## Questions answered (brief questions 1–6)

1. **Clock and timer port.** `CoordinatorOptions.clock: KernelClock { now(): number }`; host entries
   `pendingTimers()` and `fireTimer(key)` (§7). Tests drive a manual clock object and call `fireTimer` directly, so
   every schedule, including stale, duplicate and not-due fires, is deterministic.
2. **Representations.** §11.
3. **Plan variants.** §12.
4. **Cancel authority.** `AuthenticatedCaller.cancelScopes` (owner question Q1). The scoped refusal is
   `unauthorized_control` naming the Execution, after visibility, with nothing changed; an invisible Execution answers
   `unknown_destination` exactly as a missing one.
5. **Driver interrupt.** Recommended: the optional `requestInterrupt(activation): undefined` of §9 step 5. Public
   impact: additive; an existing Driver is unchanged and simply receives no request. Without it (the alternative), the
   binding requests nothing and 017 records that CX-1's "requests Driver cancellation" is not met in process. Either way
   nothing is awaited or claimed (owner question Q2).
6. **K13-9's search.** The section above.

## Corpus

Maintained and passing at every C:

- COORD-REFACTOR-01's composed verify, its oracle `state-owner-controls.json` and L-15's structural owner checks
  (extended, never weakened).
- K1.2's B-5 cases and K1.1's terminal-ingress tests, now also run against `CANCELLED`.
- The K0.2 fixture suite, including §22's five examples, unchanged (it judges scripted candidates, not this package).
- Prior-art items as new Kernel tests: a timer from a retired generation fires into a later wait (Restate#5425);
  a terminal Execution has no pending timer (the DTFx trap); a timer fire after the terminal state changes nothing
  (durabletask-python PR #280); repeated cancel and cancel of a terminal Execution are no-ops.
- Every attack-01 item, as a maintained test or corpus entry.

Replaced, keeping the property that still holds:

| Test | Pins today | Replacement keeps |
|---|---|---|
| `refusals.test.ts`, `unsupported.test.ts` | `cancelExecution` throws `UnsupportedKernelSurfaceError` naming K1.3 | The unsupported-surface mechanism tested on a synthetic surface name; cancellation's own refusals (`unknown_destination`, `unauthorized_control`) change no state |
| `aggregate-refusal.test.ts`, `refusal-diagnostics.test.ts` | `wait_unsupported` in bounded reasons | The same bounding and ordering, with a malformed wait's real codes |
| `outcome-partial-claim.test.ts` | `wait_unsupported` among forbidden pre-authority content | The new wait codes among forbidden pre-authority content |
| `activation-identity.test.ts` | a throwing `wait` getter is never read | The wait is now read once at capture (DEC-10); a throw is a content issue never disclosed before authority |
| `poison-catalog.test.ts`, `ambient-reads.test.ts` | `cancelExecution()` and an unreadable wait as refusal calls | Calls with accepted, idempotent and refused exits for `cancelExecution`, `fireTimer`, `pendingTimers` and `await` |

The fault sweep gains one scenario per new commit (cancellation from each nonterminal state, expiry, the three
registration outcomes, the input wake). If its locator needs more than routine extension, the gap goes to TOOLS-02 as
evidence tooling rather than blocking (017 rule).

## Layer 3 and records in the build

- [creation](../../../../mental-model/mechanisms/creation.md#one-atomic-creation): the optional Execution deadline as
  part of the one decision and of its canonical content, immutable (owner decision 1), and the rows of the "accepted
  at creation" and "at a glance" tables that follow from it. This is the one architectural rule K1.3 adds.
- [operations](../../../../mental-model/concepts/operations.md#three-clocks): one sentence naming creation as the
  Execution deadline's source; the clock choice at the `OPEN(implementation)` marker, which stays.
- [rewrite-index](../../../../mental-model/rewrite-index.md): each K1.3 row of §4 records the binding's choice with
  its BASELINE pointer; §3 gains the owner decision; the "After K1.3" schedule row is checked.
- [waits](../../../../mental-model/mechanisms/waits.md), [lifecycle](../../../../mental-model/mechanisms/lifecycle.md),
  [core](../../../../mental-model/concepts/core.md#timeout-event) and [recovery](../../../../mental-model/mechanisms/recovery.md):
  read against the build; no semantic change is expected, since K1.3 implements their rules rather than changing them.
  Any sentence the build shows to be wrong or ambiguous is raised with the owner, not silently rewritten. The
  `OPEN(unassigned)` trusted-provenance marker in core stays: K1.3 adds a category, not a defining section.
- BASELINE: the "refused until K1.3" prose replaced by the implemented surface and every choice above; code comments
  likewise. 017: L-15 narrowed and the entries below added. The roadmap's K1.3 mapping and the reference index are
  checked for incoming links.

## Limits proposed for 017

IDs are assigned when the owner approves; TOOLS-02 may claim L-17. Each fix stays reachable without redesigning what
K1.3 builds.

| Not guaranteed | Why acceptable now | Fix when | Expected fix |
|---|---|---|---|
| Timers, waits, readiness and cancellation survive a crash | The in-process binding has no persistence | A persistent profile | K3 |
| Native interrupt: requested at most through the optional Driver hook, never awaited or claimed | Logical cancellation is the Kernel guarantee | A Driver needing a richer stop protocol | R1 / K1.4 |
| Dependency alternatives wake anything live | No trusted non-timeout Event exists before K2; proven on selector units and by refusal of imitating input | The first trusted category | K2 |
| Deadlines are enforced at the host's fire, not at the instant; acceptance order decides | Matches W-9 case 4 and the three clocks; the binding has no internal scheduler | A host needing tighter bounds | K1.4 host / K3 scheduler |
| Clock monotonicity | A reading that goes back only delays expiry; never wrong state | A real clock-skew incident | K3 |
| Memory for losing-proposal and timer-fire records | Kept for the coordinator's lifetime, like refusals; cooperative contract (L-02) | A measured growth problem | K5 retention |
| Host-only timer entries are not principal-scoped | The in-process host is trusted; a fire carries no authority | A remote scheduler | K3 |
| K13-9 beyond its declared alphabet and depth | A declared bounded search | A defect outside the space | The packet that finds it |

## Questions for the owner and the design check

- **Q1 Cancel power.** A separate `cancelScopes` (recommended: authority.md lists cancel as a separate power) or reuse
  of `controlScopes`?
- **Q2 Driver interrupt.** The optional, never-awaited `requestInterrupt` hook (recommended) or none, with a 017 entry?
- **Q3 Deadline enforcement point.** Confirm the reading that both deadlines take effect only when the host's fire is
  accepted, so an Event or Outcome accepted earlier wins even after the instant, and creation never reads the clock.
  It follows W-9 case 4 and the three clocks; the alternative is lazy clock checks in every decision.
- **Q4 Terminal classification.** Keep K1.2's `terminal_destination` for Outcomes on `COMPLETED`/`FAILED` and use
  `cancellation_terminal_conflict` only for `CANCELLED` (recommended), or widen it to every terminal state, which would
  change accepted K1.2 behaviour?
- **Q5 No clock.** Refuse deadlines on a coordinator without a clock (recommended; 51 test files construct the
  coordinator, and accepting an unenforceable deadline would be a silent broken promise), or make `clock` required?
- **Q6 Host entries.** `pendingTimers` and `fireTimer` take no caller (recommended), or take a caller and filter by
  visibility?
- **Q7 017.** Approve the limits above and the L-15 narrowing.
