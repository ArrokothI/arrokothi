# Design 01 — K1.4

Implementer: Claude Code desktop, Claude Opus 5.5 (`claude-opus-5-5`), 2026-11-05. Base B
`608f9ece44dbe42b78974bdac9e7ddcd33697705` (main after PR #66, which merged [release 01](release-01.md) and
[brief 01](brief-01.md) with the owner's answers). This note answers brief 01's five questions and its four
suspect designs. It holds the K14-4 feature inventory, the K14-6 conformance mapping and a size assessment. A Codex
GPT-6 Prompt E adversary attacks it next, then a Codex GPT-6 design check. No production code is written before
the check.

Owners read: [integration](../../../../mental-model/mechanisms/integration.md),
[execution-cycle](../../../../mental-model/mechanisms/execution-cycle.md),
[evidence](../../../../mental-model/mechanisms/evidence.md), [waits](../../../../mental-model/mechanisms/waits.md),
[the reference index's legacy rows](../../../../mental-model/reference.md#common-search-terms),
[BASELINE](../../002-implemented-kernel-baseline.md),
[kernel-ownership](../../kernel-ownership.md#deferred-extraction-and-bridge-owners) DX-5 to DX-12,
[decision-02](../DESIGN-AUDIT-01/decision-02.md) stage 3, [017](../../017-known-limitations.md) L-01, L-19 to L-22,
the K1.3 records, `packages/sdk`, `packages/kernel/src/{coordinator,driver,waits}.ts`, and the legacy
`Harness`, controller and scheduler ports.

**Ownership.** Everything here is on the Execution side and in the host: a Driver whose native Runtime is the
legacy `Harness`, and the SDK host that owns the coordinator. The bridge uses only the coordinator's public API.
**No Kernel semantic change and no new Kernel entry is needed** (§10). No Layer-1 or Layer-2 change is needed.
One owner decision is in tension with this packet: decision-02 says the public SDK never depends on the private
Kernel package (Q1).

## 1. Mechanism in one paragraph

`createApplication` builds one `ExecutionCoordinator` and one **legacy Driver**. The Driver privately owns the
legacy `Harness` the SDK builds today, with its stores, stock controllers and Effect processing. That Harness is
now the native Runtime. It is not Kernel code (DX-5). Each Kernel Execution E has one **native lineage**: a legacy
root Execution with the same ID as E, plus any native children it calls. `start` creates E through the Kernel, with
the initial input inside the atomic creation. The SDK host dispatches READY Executions and pumps due timers. The
Driver's `deliver` queues the Activation, reports `delivered()`, and returns `undefined`. The Driver's own
asynchronous task then forwards the batch into the native lineage, runs **one native step** of that lineage, and
submits an Outcome:
- `complete` or `fail` when the native root ended;
- `continue` when native work is still runnable;
- `await` with input subscriptions when the lineage is quiescent and blocked on the host.

Replies to native pauses (the next chat turn, a confirmation decision) arrive as Kernel input and wake that wait.
Cancellation is the Kernel's. The Kernel's `requestCancellation` makes the Driver cancel the native lineage. Native
tools, models, children, confirmations and memory run unmediated inside the Driver as Trusted Execution (owner
decision 2A).

## 2. Components and boundaries

| Component | Location (new zone `legacy-bridge` unless noted) | Owns | Imports |
|---|---|---|---|
| Legacy Driver | `packages/sdk/src/legacy-bridge/driver.ts` | Activation queue, per-Execution exchange task, Event forwarding, the native-state → Outcome mapping, `requestCancellation` | `@arrokothi/kernel` (package root), `@arrokothi/core*` public subpaths, `../internal/value-capture.ts` |
| Lineage scheduler | `legacy-bridge/lineage-scheduler.ts` | The legacy `Scheduler` port, with one FIFO per native root. `claim(workerId)` serves only the lineage that `workerId` names. | `@arrokothi/core/ports` |
| Root identity scope | `legacy-bridge/root-ids.ts` | An `IdGenerator` wrapper. Inside the Driver's root-creation async context (`node:async_hooks` `AsyncLocalStorage`) it answers the `exec` prefix with E's ID; otherwise it defers to the configured generator. | `node:async_hooks`, `@arrokothi/core/ports` |
| Codec | `legacy-bridge/codec.ts` | The progress, input-payload, result and Emission shapes (§5); conversion to and from canonical bytes | `../internal/value-capture.ts` |
| SDK host | `packages/sdk/src/application.ts`, `host.ts` (zone `host-sdk`) | The coordinator, the fixed host caller, the dispatch and timer pump, the public methods | `@arrokothi/kernel`, `./legacy-bridge/*`, `@arrokothi/core*` |
| Deprecated Harness view | `legacy-bridge/harness-view.ts` | `Application.harness`: native reads pass through; mutators per Q2 | `@arrokothi/core` |
| Value wrapper (public) | `packages/sdk/src/index.ts` re-export of `internal/value-capture.ts` | `toCanonicalBytes`, `ValueIssue`; the L-01 startup check (§9) | unchanged: no Kernel import (decision-02) |

The **host caller** is fixed per application: `{ namespace: "arrokothi.sdk", scopes: ["application"],
cancelScopes: ["application"] }`. It has no `controlScopes`. Takeover and recovery declarations are not exposed:
the Driver has no `isSafeToReplace`, so every takeover is refused as `unsafe_replacement`, which is correct for a
native Runtime with no exclusion protocol (§10).

## 3. Brief question 1: the Driver's shape

**One Driver for both kinds.** The Kernel Activation has no kind discriminator (DX-12). The Driver resolves the
pinned `definitionRevision` against the native `DefinitionStore`. The legacy `ControllerRegistry`, inside the
native Harness, then selects the stock Agent or Workflow controller, exactly as today. Two Drivers would put a
kind switch back at the boundary DX-12 removed.

**How a definition reaches it.** `register` and `start` save definitions to the native `DefinitionStore`. That
is Runtime-owned code identity, unchanged. `start` creates E with these pins:
- `definitionRevision`: the canonical text of the integrity-pinned `ExecutionDefinitionRef`
  `{ id, version, integrity }`;
- `runtimeContractRevision = "arrokothi.legacy-harness/0.8.1"`;
- `progressCodec = "arrokothi.legacy-bridge.progress/1"`.

The first Activation's Driver task parses the revision and loads exactly that ref. A missing definition is a
named `fail`. The `operationAuthority`, `structuralSpawnBudget` and `structuredMemory` creation parameters travel
in `authorityContext`, the opaque application authority context the Kernel supplies to the Runtime as its
execution view. They are part of creation's canonical content, so an exact `start` retry with the same
`creationKey` replays, and a changed one conflicts.

**One exchange, one native step.** Driver task for Activation A of E:

1. **Forward.** If `acceptedProgress` is `null`, create the native root inside the root-identity scope (native ID =
   E). Then forward every batch Event in acceptance order (§5 table) through the native Harness's own ingress
   methods. The legacy create-then-deliver race the SDK `exclusive` lock guarded against cannot occur: the
   lineage scheduler serves this lineage only to this exchange's worker.
2. **Step.** Claim with worker `lineage:<E>`. If a native Execution in the lineage is runnable, run one native
   Activation (`harness.runOnce(worker)`). If none is runnable but native work is in flight, wait (§4) until the
   scheduler enqueues work for this lineage. A pending controller resumption or an Effect dispatch whose
   promise is unsettled counts as in flight.
3. **Decide** from native state (§6), encode, and call `coordinator.submitOutcome(caller, envelope, grant)`
   synchronously. Each Outcome acknowledges its whole batch. Here acknowledgment means that the native
   mailbox took responsibility for each Event; that is a limit to record (§12).

One native step per exchange gives the host the same pacing it had: `RunOptions.maxActivations` again bounds work
between host decisions, and `activation_limit` leaves the Execution READY.

**How legacy waits map (K14-2).** A native pause becomes a Kernel wait only by the Driver writing a
`WaitDeclaration` (plain data from the Kernel's public types) into an Outcome. Legacy code builds no Kernel type,
and `packages/core` cannot import `@arrokothi/kernel` (guard, §8).

| Native lineage state after the step | Outcome `next` | Kernel state |
|---|---|---|
| Root `COMPLETED` | `complete(result)`; the result is the native terminal envelope `{ schemaId, schemaVersion, value }` | `COMPLETED` |
| Root `FAILED` | `fail({ code, message, details? })` from the native failure | `FAILED` |
| Root `CANCELLED` without a Kernel cancellation (unreachable under Q2's recommendation; defensive) | `fail({ code: "arrokothi.bridge.native_cancelled" })` | `FAILED` |
| Native work still runnable | `continue` | `READY` |
| Nothing runnable, work in flight | No Outcome yet: the exchange stays open, the native lineage advances only through Runtime-local work, and no Kernel wait exists (W-4) | `RUNNING` |
| Quiescent; the root, or a required-call descendant, waits on `external.input` | `await({ subscriptions: [{ subscriptionClass: "arrokothi.legacy.input" }] })` | `WAITING` |
| Quiescent; a pending confirmation in the lineage | `await` with `arrokothi.legacy.confirmation` (and the input class when both apply) | `WAITING` |
| Quiescent; an open native user-input request | `await` with `arrokothi.legacy.user_input` | `WAITING` |
| Quiescent and none of the above: native work is stuck, for example a child awaiting a peer that never replies | No Outcome: the exchange stays open, as the legacy host would have timed out | `RUNNING` |

*Quiescent* means nothing in the lineage is runnable or in flight. The Driver declares `await` only at
quiescence (Q7). If a sibling branch's model call is in flight when a confirmation becomes pending, the exchange
stays `RUNNING` until that call settles. Otherwise native work would run while the Kernel says `WAITING`, and its
results would be stranded until a human replies: no trusted non-timeout Event can wake a K1 wait (L-21).
Dependency alternatives are therefore never declared. Native Effect results, child results and resumptions stay
Runtime-internal.

When Q4 configures a wait deadline, the declaration carries `deadline = clockNow + waitDeadlineMs`. A batch
carrying the `kernel.wait.timeout` Event makes the Driver cancel the native lineage and submit
`fail({ code: "arrokothi.bridge.wait_deadline_expired" })`.

## 4. Brief question 2: the SDK host loop and determinism

**No background loop in the host.** As today, the host drives only inside host calls (`runUntilBlocked`,
`runUntilIdle`, and the ingress methods, which dispatch nothing). The Driver owns native asynchronous work once
an exchange is open, exactly as a native Runtime does. Each host iteration:

1. Read `pendingTimers()`. Call `fireTimer(key)` for each timer whose deadline is at or before the Kernel clock.
2. Dispatch every Kernel Execution the application holds in `READY`, with a constant `bound` (64). A refused
   dispatch (`not_ready`, `exchange_unresolved`, terminal) is not an error; the loop re-reads state.
3. Return at a boundary: the target is terminal or `WAITING`, or a host limit has passed. Otherwise await the next
   **change signal**: a promise the Driver resolves when it submits an Outcome, raced against the
   `timeoutMs`/`signal` limits and the next pending deadline. Nothing polls Kernel state on a timer.

**One clock.** The Kernel clock is `{ now: () => runtime.clock.now().getTime() }`, so native ISO timestamps and
Kernel deadlines read the same source. Tests inject a manual `runtime.clock`: advancing it and calling
`runUntilBlocked` fires exactly the due timers. No test sleeps for a deadline.

**Concurrency.** Exchanges for different Executions run concurrently. Each holds its own lineage worker, so a
native Activation that never returns (a Function handler awaiting a barrier) blocks only its own lineage (K14-1).
Native in-flight waits use the lineage scheduler's enqueue notification, so they need no timers either. The legacy
in-memory store serializes transactions, not Activations. The existing `scheduler-exclusion` conformance case
already shows that a parked Activation does not stall other Executions.

**Kernel never sees a Promise.** `deliver` does three synchronous things and returns `undefined`: queue the
Activation, call `settlement.delivered()`, and start the task through `queueMicrotask`. The task's whole body runs
under a terminal `catch`. A native throw, such as a store error or `HarnessRunawayError`, becomes a
`fail({ code: "arrokothi.bridge.native_error" })` Outcome with a bounded message. If the Kernel refuses that
Outcome, the Driver files `reportProtocolFailure`, which leaves an inspectable hold. A refusal because a
cancellation won (CX-6) is recorded in the Driver's diagnostics and changes nothing.

## 5. Brief suspect designs 1 and 2: two stores, sync controllers

**One source of truth per fact.**

| Fact | Owner after K1.4 | The other side holds |
|---|---|---|
| Execution identity, lifecycle, waits, deadlines, cancellation | Kernel | Native lifecycle is Runtime-private progress. It is reported only through Outcomes and never read by the host to decide anything. |
| Accepted input, receipts, deduplication | Kernel | Native receives each accepted Event once, forwarded by the exchange that acknowledges it |
| Accepted output | Kernel Emissions | The native `emissionsOf` history (deprecated diagnostic) |
| Terminal result | Kernel `result` | The native `terminalResult` |
| Semantic progression: controller progress, Effects, children, memory, notes, resumptions | Native store (Runtime-owned, in memory, L-19) | Kernel `acceptedProgress`: a small locator only |

Progress (codec `arrokothi.legacy-bridge.progress/1`) is `{ v: 1, root: E, emissionCursor: n }`. The Kernel
stores it opaquely and returns it unchanged. If the native root it names is missing, the Driver submits
`fail({ code: "arrokothi.bridge.native_session_missing" })`. This is the *managed native job* integration shape
([integration](../../../../mental-model/mechanisms/integration.md#select-the-smallest-useful-integration)): the Kernel
manages the enclosing Execution and its input and result, and the native Harness keeps session, graph and
checkpoint meaning. Dropped legacy state: none. The legacy `FifoScheduler` is replaced by the lineage scheduler,
and the SDK `exclusive` lock is retired, because creation and initial input are one Kernel decision.

**Payload shapes.** Values pass through `toCanonicalBytes`. A native value the canonical-bytes core cannot
represent (over the four limits, or not valid JSON) fails by name
(`arrokothi.bridge.value_unrepresentable`), with no partial Outcome. An exchange with more native Emissions
than `emissionsPerOutcome` (256) submits `continue` carrying the first 256 and the advanced cursor. The next
exchange submits the rest before running a step, so nothing is dropped.

| Kernel input `kind` / `subscriptionClass` | Payload | Forwarded natively as |
|---|---|---|
| `arrokothi.legacy.start` / none (creation's initial input) | `{ input: { label, payload, correlationId?, causationId? } \| null }` | `createExecution` in the root scope, then `deliverExternalInput` when `input` is non-null. A native `rejected` receipt ends the exchange with `fail({ code: "arrokothi.bridge.initial_input_rejected" })` |
| `arrokothi.legacy.input` / same | `{ label, payload, destination?, correlationId?, causationId? }` | `deliverExternalInput`; `destination` defaults to E and must be in E's lineage |
| `arrokothi.legacy.confirmation` / same | `{ confirmationId, decision: "approve" \| "decline" }` | `resolveConfirmation`; the confirmation must belong to E's lineage |
| `kernel.wait.timeout` (Kernel-minted) | `null` | Nothing. The Driver cancels the native lineage and fails E (§3) |

The Kernel receipt says the reply was accepted. The native result of forwarding it (`delivered`, `duplicate`,
`rejected`, a confirmation `dispatched`/`declined`/`replayed`) is reported as one Emission of kind
`arrokothi.bridge.ingress_result` in that exchange's Outcome. Native rejection never refuses the Kernel input
retroactively.

**Synchronous controllers, asynchronous delivery.** Controllers keep returning from `activate` inside the native
Harness's `runOnce`, which the Driver's own task awaits. The Kernel boundary sees only `deliver` → `undefined`
and a later synchronous `submitOutcome`. A `ControllerResumption` that outlives the native inline budget keeps the
exchange open (`RUNNING`), and its settlement re-enqueues the lineage. It never becomes a Kernel wait or a Kernel
record. That is DX-6 exactly.

## 6. Brief suspect designs 3 and 4: the public handle and features with no K1 home

**`Application.harness` (owner decision 3: keep, deprecated, one release).** It returns a deprecated view over the
native Harness. Every read method passes through unchanged. Because the native root ID equals E, existing code
such as `app.harness.emissionsOf(executionId)` still works. Its answers are native diagnostics; `app.inspect`
is authoritative. The mutators are the open choice, Q2. The recommendation is that they **refuse by name**
(`LegacyHarnessMutationRefused`, naming the replacement). A native `resolveConfirmation` beside the Kernel-routed
reply would give one pause two resume owners, which integration forbids. A native `deliverExternalInput` would
advance a lineage that the Kernel records as `WAITING`. The view is typed `LegacyHarnessView` (the read methods),
so mutator calls fail at compile time with the deprecation note. The runtime refusal covers JavaScript callers.

**Features with no K1 home (owner decision 2A).** Tools and model calls, children, confirmations and memory all
run inside the native Harness as Trusted Execution: unmediated, with no Kernel guarantee for those paths, until
K2 and K4. The Kernel guarantees apply to the bridge's own paths: creation, input, dispatch, Outcome,
waits, deadlines and cancellation. Cancellation is Q3: the recommendation is that `requestCancellation` cancels the
whole native lineage, root and descendants. It is a request only (L-20). Native children are not addressable
through the supported entry, so a non-cascading cancel would orphan them with no Kernel owner.

## 7. Brief question 3: feature inventory (K14-4)

Closed inventory: the runtime and type exports of `packages/sdk/src/index.ts` at B, their members, and the
features the guide map documents through the SDK
([quick start](../../../guides/deployment/quick-start.md),
[authoring surface](../../../guides/execution/native/current-authoring-surface.md),
[composition](../../../guides/execution/native/composition-children-and-concurrency.md),
[capabilities](../../../guides/kernel/capabilities-effects-and-authority.md),
[state](../../../guides/execution/native/state-memory-and-context.md),
[providers](../../../guides/execution/providers/current-wiring.md)). Each row gets one test through the new entry
(`packages/sdk/tests/bridge-inventory.test.ts`, test name = row ID). A refusal test asserts the named error and
that no Kernel or native record was created. Dispositions: **P** preserved, **PD** preserved and deprecated,
**M** migrated (documented in `docs/guides`), **F** refused by name, **N** not an SDK feature (unchanged, explicitly
legacy).

| ID | Feature | Disp. | Through the new entry |
|---|---|---|---|
| S-DEFS | `defineAgent`, `defineWorkflow`, `definitionRef` and the type re-exports | P | Unchanged |
| S-ERR | `ApplicationConfigurationError` | P | Unchanged; new codes for refused options |
| S-OPT-NATIVE | `models` (bindings/resolver), `capabilities`, `functions`, `adapters`, `memory.*`, `authorizer`, `confirmationPolicy`, the `controllers(services)` hook | P | Configure the Driver's native Runtime, exactly as before |
| S-RT-NATIVE | `runtime.store`, `definitions`, `inlineWait`, `activationBudget`, `defaultEffectDeadlineMs`, `securityProfile` | P | Native Runtime services |
| S-RT-CLOCK | `runtime.clock` | P | Also feeds the Kernel clock (§4) |
| S-RT-IDS | `runtime.ids` | P | Wrapped for the root identity (§2); every other ID is the caller's generator |
| S-RT-SCHED | `runtime.scheduler` | F | `ApplicationConfigurationError` `scheduler_owned_by_bridge`. Kernel dispatch and the lineage scheduler replace the shared scheduler |
| S-RT-MAXRUN | `runtime.maxActivationsPerRun` | F | `option_retired`; it bounded only `Harness.runUntilIdle`, which the bridge never calls. `RunOptions.maxActivations` remains |
| S-SERVICES | `Application.services` | P | Native services; `scheduler` is the lineage scheduler |
| S-REGISTER | `register(...)` | P | Native `DefinitionStore`, unchanged |
| S-PREFLIGHT | `preflight(input)` | P | Unchanged reads, plus the refused-option diagnostics |
| S-START | `start(input)` → `StartedExecution` (`executionId`, `kind`, `definition`, `ownerExecutionId: null`, `rootExecutionId`, `preflight`) | P | Kernel creation; `executionId` is the Kernel ID and the native root ID. New: optional `creationKey` (exact replay; Q5), optional `executionDeadline`, and `receipt` (the Kernel creation receipt) |
| S-START-PARAMS | `operationAuthority`, `structuralSpawnBudget`, `structuredMemory` | P | In `authorityContext` (§3) |
| S-START-ORDER | Initial input precedes the first Activation | P | Stronger: atomic with creation |
| S-START-RECEIPT | `StartedExecution.inputReceipt` (native `EventDeliveryReceipt`) | M | Replaced by `receipt`; the native delivery result is the first exchange's `ingress_result` Emission |
| S-START-REJECT | A native rejection of initial input cancels the created Execution and throws | M | The Execution fails with `arrokothi.bridge.initial_input_rejected`; `start` still throws for malformed data and preflight errors before creation |
| S-OWNER | `start({ ownerExecutionId })` | F | `owner_unsupported`: Kernel composition is K4's |
| S-RUN | `runUntilBlocked(id, options)` with all nine reasons | P | Reimplemented (§4); `reason` comes from Kernel state; `waitingExecutionId` names the native Execution holding the human wait; `user_input_required` stays in the type and is unreachable with stock controllers |
| S-RUN-RESULT | `RunResult.execution` (native `ExecutionContext`), `activations` | PD / M | `execution` is the native root view (deprecated); new `kernel: ExecutionView`. `activations` counts Kernel exchanges this call dispatched |
| S-RUN-OPT | `timeoutMs`, `maxActivations`, `pollIntervalMs`, `signal` | P | `pollIntervalMs` becomes the longest idle wait slice; waits are event-driven |
| S-IDLE | `runUntilIdle()` | PD | Fire due timers, dispatch READY, await until no lineage can run a step; returns the native `ActivationRecord`s of the steps run |
| S-HARNESS-R | `harness` reads: `inspect`, `emissionsOf`, `transitionsOf`, confirmation, user-input, pending-operation, journal, memory, resumption, authority, child/peer link, wait-graph, spawn-budget and cancellation-request readers | PD | Pass-through native diagnostics |
| S-HARNESS-W | `harness` mutators: `createExecution`, `deliverExternalInput`, `deliverEnvelope`, `settleEffect`, `submitUserInput`, `resolveConfirmation`, `cancelExecution`, `runOnce`, `runUntilIdle`, `drainEffects`, `drainResumptions` | F (Q2) | `LegacyHarnessMutationRefused` naming the replacement; no native effect |
| S-INPUT | Next conversation input (was `harness.deliverExternalInput`) | M | `app.input(executionId, { requestKey?, label, payload?, destination?, correlationId?, causationId? })` → Kernel `submitInput` |
| S-CONFIRM | Confirmation decision (was `harness.resolveConfirmation`) | M | `app.resolveConfirmation(executionId, { requestKey?, confirmationId, decision })` |
| S-CANCEL | Cancellation (was `harness.cancelExecution`) | M | `app.cancel(executionId)` → Kernel `cancelExecution`; the native lineage is cancelled (Q3); the free-text `reason` is not carried, because the Kernel record has no such field |
| S-SETTLE | Out-of-band `settleEffect` | F | The trusted result ingress is K2's; not in the guides' host list |
| S-USERINPUT | Typed user input (`submitUserInput`) | F | No stock controller requests it; routed nowhere, refused at the view |
| S-INSPECT | New: `app.inspect(executionId)` | P (new) | Kernel `ExecutionView`, including accepted Emissions and the result |
| S-WRAPPER | New: `toCanonicalBytes`, `ValueIssue` | P (new) | K14-5 (§9) |
| G-CHAT | Multi-turn `respond_and_wait` Agent | P | Emission plus `await` on `arrokothi.legacy.input`; budgets are cumulative and unchanged |
| G-TOOLS | Capabilities, catalog, authorizer, operation ceiling | P, unmediated | Native Effect path (DX-7) |
| G-CONFIRM | Exact-payload confirmation, one dispatch per confirmation | P, unmediated | `await` on `arrokothi.legacy.confirmation`; the decision is Kernel input |
| G-WORKFLOW | Function and LLM Stages, adapters, transitions, loops, `maxTransitions` | P | Native |
| G-FORK | Parallel fork/join | P | Native; `await` waits for quiescence (Q7) |
| G-CHILD | Agent/Workflow Stage child `call` | P, Runtime-internal | A human wait in a child surfaces through `waitingExecutionId`; cancellation cascades (Q3) |
| G-MEMORY | Structured Memory read/write, optimistic revision | P, unmediated | Native |
| G-NOTES | Working Notes | P | Native |
| G-DERIVED | Derived Semantic Memory through the hook | P | Native |
| G-SLOWMODEL | Slow model call yields and resumes exactly once | P | Exchange stays `RUNNING`; no Kernel wait |
| G-SLOWCAP | Slow capability settles later | P | Same |
| G-PROVIDERS | Gemini provider, Strands executor through the hook, MCP-imported tools | P, unmediated | Native |
| G-PEER | `send`/`ask`/`reply`, `RequestUserInput`, detached spawn | N | Custom controllers only; not an SDK feature |
| G-CORE-DIRECT | Direct `@arrokothi/core` `Harness` and custom controllers | N | Unchanged and explicitly legacy; not routed through the Kernel. The guides say so |

Every migration (M) gets a "before/after" note in `docs/guides`. The examples (`examples/execution-kernel-minimal`:
`app.ts`, `main.ts`, `patterns-main.ts`, `settle.ts`) move to the new methods in range B. Their tests stay the
acceptance check that the documented path runs.

## 8. K14-3: the structural recheck

`kernel-ownership.md` and `boundary-policy.ts` gain a fifth zone, `legacy-bridge` (`packages/sdk/src/legacy-bridge`),
with rows in the zones, cross-boundary-dependency and export tables. The agreement oracle compares the new rows
like the old ones. Rules, each with a representative rejected edge in the existing mutated-fixture style:

| Rule | Rejected edge (fixture) |
|---|---|
| Kernel ↛ legacy, SDK, bridge (existing, extended to the new zone) | `packages/kernel/src/index.ts` importing `../../sdk/src/legacy-bridge/driver.ts` |
| Bridge reaches the Kernel only through the package root `@arrokothi/kernel` | bridge importing `../../../kernel/src/state.ts`, a type-only `import type` of `coordinator.ts`, a re-export barrel |
| `legacy-core` ↛ Kernel, ↛ bridge (new) | `packages/core/src/runtime/harness.ts` importing `@arrokothi/kernel` |
| Wrapper (`sdk/src/internal`) ↛ Kernel, ↛ bridge (decision-02's dependency direction) | `internal/value-capture.ts` importing `@arrokothi/kernel` |
| Quarantine test: importers of the Kernel outside its zone are exactly the named bridge/host files plus the existing verifiers | a new example file importing `@arrokothi/kernel` |
| Only `legacy-bridge/driver.ts` constructs the native `Harness` inside `packages/sdk/src` | `application.ts` calling `new Harness(...)` |

The Kernel's own import graph is unchanged, and so are its 21 files. Moving native work behind the Driver
is migration, because the SDK now drives the Kernel protocol. It is not a move: the Harness source does not change.

## 9. K14-5: public wrapper and the L-01 startup check

`@arrokothi/sdk` exports `toCanonicalBytes(value)`, which returns `{ ok: true, value: Uint8Array }` or
`{ ok: false, issues }`, the existing internal `captureCanonicalBytes` unchanged, plus `ValueIssue`.
`docs/guides` gains a short "Values at the boundary" page stating the cooperative contract and limits L-02 and
L-04 to L-09.

**Startup check (owner decision 4).** The serializer `canonicalize@3.0.0` reads eight free identifiers: `isNaN`,
`isFinite`, `Object`, `Array`, `JSON`, `Set`, `Error` and `Symbol` (the audited table in `value-capture.ts`).
For each, the check compares three references:
- the identifier as resolved now from module code (a closure `() => JSON` resolves through the global declarative
  record first, as the dependency's own free reference does);
- `globalThis[name]`;
- the load-time capture.

All three must be the same object, or the check throws `WrapperEnvironmentError` naming the identifier. It runs in
`createApplication` and again immediately before each serializer call, inside the existing sandbox window. A
lexical shadow installed after startup (V-ENV's `let JSON` through `vm.runInThisContext`) is therefore refused at
the call. The **refusal test** runs a child process that installs `let JSON = {...}` with `vm.runInThisContext`
before and after importing the SDK. It asserts that `createApplication` and `toCanonicalBytes` both throw the
named error, and that a harmless shadow equal to the genuine object passes. **Residual L-01** narrows to "genuine
intrinsics at SDK module load". A host that replaces both the global property and the lexical binding before the
SDK loads is undetectable and remains a precondition.

## 10. Accepted designs relied on, and fitness

| Design | Fit? | Note |
|---|---|---|
| Coordinator public API (K1.1–K1.3): `createExecution`, `submitInput`, `dispatch`, `submitOutcome`, `inspect`, `cancelExecution`, `pendingTimers`, `fireTimer` | Fit | No new entry. The Driver is constructed first and given the coordinator after construction (a private `attach`) |
| `deliver` → `undefined` with `DeliverySettlement` and `SubmissionGrant` | Fit | §4 |
| K1.3 input subscriptions; dependency alternatives inert (L-21) | Fit, with a consequence | Native-only dependencies cannot be Kernel waits, so they stay `RUNNING`; that is W-4 |
| `requestCancellation` (optional, never awaited) | Fit | The cascade policy is Q3 |
| `isSafeToReplace` absent → takeover refused | Fit | In-process native Runtime: no exclusion protocol, no takeover (limit) |
| DX-5, DX-6, DX-7, DX-9, DX-10 | Fit | Harness, resumptions, Effects, scheduler and controllers stay native, behind the Driver |
| DX-12 controller port refused | Fit | The Driver resolves pinned revisions |
| decision-02 "a public SDK package never depends on the private Kernel package" | **Conflict** | K1.4's goal requires the SDK to import the Kernel. Q1 |
| The SDK's `exclusive` lock and shared FIFO scheduler | Retired | Atomic creation with input and the lineage scheduler replace them |
| Legacy `ExecutionId` pattern `^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$` | Constrains the API | Native root ID = Kernel ID requires an SDK `creationKey` of at most 64 characters from `[A-Za-z0-9._:-]`. The default is a UUID. Longer or other keys are refused by name at `start` |

## 11. Brief question 4: conformance mapping (K14-6)

Dispositions:
- **R:** retained unchanged as native Runtime conformance, attributed to the legacy Runtime per AGENTS.md's failure
  domains.
- **P:** retained, plus a bridge test (`B-*`, in `packages/sdk/tests/bridge-*.test.ts`) through the SDK entry for
  its host-observable property.
- **X:** the file's claim was a Kernel claim. That claim moves to the named Kernel test. The file stays as native
  regression with a header note, since its code still runs inside the Driver (Q6).
- **U:** unaffected; not Harness conformance.
- **G:** guard extended under K14-3.
- **S:** support file.

No file is retired. A test that pinned a retired *Kernel* concept still pins live *native* behaviour. Deleting it
would lose regression coverage of code that still runs. Totals over the 132 files of `tests/conformance` at B:
79 R, 7 P, 11 X, 20 U, 4 G, 11 S. Outside `tests/conformance`: `packages/core/tests` is retained as native unit
tests, `tests/evals` holds the Kernel fixed and is retained, and `packages/sdk/tests/application.test.ts`
maps row by row onto the §7 inventory.

| File | Disp. | Kept property, new owner or reason |
|---|---|---|
| `agent/action-binding.test.ts` | R | Agent Runtime behaviour inside the native Runtime. |
| `agent/active-view.test.ts` | R | Agent Runtime behaviour inside the native Runtime. |
| `agent/agent-controller.test.ts` | R | Agent Runtime behaviour inside the native Runtime. |
| `agent/agent-definition.test.ts` | R | Agent Runtime behaviour inside the native Runtime. |
| `agent/agent-executor.test.ts` | R | Agent Runtime behaviour inside the native Runtime. |
| `agent/agent-resumption.test.ts` | R | Agent Runtime behaviour inside the native Runtime. |
| `agent/authority-ceiling.test.ts` | R | Agent Runtime behaviour inside the native Runtime. |
| `agent/effective-authority.test.ts` | R | Agent Runtime behaviour inside the native Runtime. |
| `agent/fixtures.ts` | S | Shared fixture for the retained Agent cases. |
| `agent/harness-reauthorization.test.ts` | R | Agent Runtime behaviour inside the native Runtime. |
| `agent/information-compiler.test.ts` | R | Agent Runtime behaviour inside the native Runtime. |
| `agent/model-trace.test.ts` | R | Agent Runtime behaviour inside the native Runtime. |
| `agent/observation-projection.test.ts` | R | Agent Runtime behaviour inside the native Runtime. |
| `agent/operation-catalog.test.ts` | R | Agent Runtime behaviour inside the native Runtime. |
| `agent/projection.test.ts` | R | Agent Runtime behaviour inside the native Runtime. |
| `agent/untrusted-content.test.ts` | R | Agent Runtime behaviour inside the native Runtime. |
| `architecture/agent-boundaries.test.ts` | U | Unaffected guard. |
| `architecture/boundary-policy.ts` | G | Gains the `legacy-bridge` zone and its rules (K14-3). |
| `architecture/builder-docs-anchor.test.ts` | U | Unaffected guard. |
| `architecture/composition-boundaries.test.ts` | U | Unaffected guard. |
| `architecture/import-scanner.test.ts` | U | Unaffected guard. |
| `architecture/inventory-oracle.ts` | G | Parses the new zone and dependency rows (K14-3). |
| `architecture/kernel-landing-zone.test.ts` | G | Quarantine test admits exactly the bridge importers; new forbidden-edge controls (K14-3). |
| `architecture/kernel-state-ownership.test.ts` | U | Unaffected guard. |
| `architecture/legacy-core-boundaries.test.ts` | G | Adds legacy-core ↛ Kernel and ↛ bridge (K14-3). |
| `architecture/mcp-boundaries.test.ts` | U | Unaffected guard. |
| `architecture/module-graph.ts` | U | Unaffected guard. |
| `architecture/workflow-boundaries.test.ts` | U | Unaffected guard. |
| `composition/authority-attenuation.test.ts` | R | Native children (owner decision 2A): Runtime-internal, not Kernel composition. |
| `composition/child-call-deadline.test.ts` | R | Native children (owner decision 2A): Runtime-internal, not Kernel composition. |
| `composition/child-cancellation.test.ts` | P | Native child cancellation stays Runtime behaviour. Bridge: `app.cancel` cancels the whole native lineage (Q3) and a late native result changes no Kernel state (B-CANCEL). |
| `composition/child-lineage.test.ts` | R | Native children (owner decision 2A): Runtime-internal, not Kernel composition. |
| `composition/child-stage-cross-feature.test.ts` | P | Bridge: a confirmation inside a called native child surfaces as `confirmation_required` with the child's `waitingExecutionId` (B-CHILD), ported from the SDK test of the same name. |
| `composition/failure-atomicity.test.ts` | R | Native children (owner decision 2A): Runtime-internal, not Kernel composition. |
| `composition/fixtures.ts` | S | Shared fixture for the retained composition cases. |
| `composition/no-child-cost.test.ts` | R | Native children (owner decision 2A): Runtime-internal, not Kernel composition. |
| `composition/peer-liveness.test.ts` | R | Native children (owner decision 2A): Runtime-internal, not Kernel composition. |
| `composition/recursive-composition.test.ts` | R | Native children (owner decision 2A): Runtime-internal, not Kernel composition. |
| `composition/runtime-independence.test.ts` | R | Native children (owner decision 2A): Runtime-internal, not Kernel composition. |
| `composition/spawn-authorization-ordering.test.ts` | R | Native children (owner decision 2A): Runtime-internal, not Kernel composition. |
| `composition/spawn-budget-contention.test.ts` | R | Native children (owner decision 2A): Runtime-internal, not Kernel composition. |
| `composition/spawn-vs-call.test.ts` | R | Native children (owner decision 2A): Runtime-internal, not Kernel composition. |
| `composition/structural-budget.test.ts` | R | Native children (owner decision 2A): Runtime-internal, not Kernel composition. |
| `composition/terminal-dependency-abandonment.test.ts` | R | Native children (owner decision 2A): Runtime-internal, not Kernel composition. |
| `composition/terminal-result-correlation.test.ts` | R | Native children (owner decision 2A): Runtime-internal, not Kernel composition. |
| `contracts/capability-executor.test.ts` | R | Native port contract (DX-8, DX-9). |
| `contracts/definition-store.test.ts` | R | Native port contract (DX-8, DX-9). |
| `contracts/runtime-store.test.ts` | R | Native port contract (DX-8, DX-9). |
| `contracts/scheduler.test.ts` | P | The published Scheduler contract also runs against the Driver's lineage scheduler (B-SCHED). |
| `effects/consequentiality.test.ts` | R | Native, unmediated Effect processing (DX-7; owner decision 2A). |
| `effects/duplicate-recognition.test.ts` | R | Native, unmediated Effect processing (DX-7; owner decision 2A). |
| `effects/effect-gateway.test.ts` | R | Native, unmediated Effect processing (DX-7; owner decision 2A). |
| `effects/failure-semantics.test.ts` | R | Native, unmediated Effect processing (DX-7; owner decision 2A). |
| `effects/fast-slow-equivalence.test.ts` | R | Native, unmediated Effect processing (DX-7; owner decision 2A). |
| `effects/pending-operations.test.ts` | R | Native, unmediated Effect processing (DX-7; owner decision 2A). |
| `effects/transaction-atomicity.test.ts` | R | Native, unmediated Effect processing (DX-7; owner decision 2A). |
| `execution/cancellation-linearization.test.ts` | X | Kernel claim now owned by K1.3's `packages/kernel/tests/cancellation.test.ts` and `losing-outcomes.test.ts`. Bridge: B-CANCEL. File kept as native regression. |
| `execution/controlled-interleaving.test.ts` | X | `interleave` is legacy wait vocabulary with no Kernel home; the Kernel never sees it. Kept property: the Driver declares no Kernel wait for native-only dependencies (B-MAP). File kept as native regression (DX-6). |
| `execution/controller-boundary.test.ts` | X | The controller port is refused at the Kernel (DX-12); the Driver boundary replaces it. Kept property: the Kernel observes no Promise and no controller type (B-DELIVER, K14-2 guards). File kept as native regression. |
| `execution/controller-resumption.test.ts` | X | Kept property: slow native work creates no Kernel-visible wait; the exchange stays RUNNING and resumes exactly once (B-RES). File kept as native regression (DX-6). |
| `execution/definition-kinds.test.ts` | X | The closed `DefinitionKind` union is refused at the Kernel (DX-12); the Activation pins a definition revision instead. Kept property: the Driver resolves exactly the pinned revision (B-PIN). File kept as native regression. |
| `execution/harness-many-contexts.test.ts` | P | Bridge: one application, one Driver, many Kernel Executions with separate native lineages (B-MANY). |
| `execution/interleaving-cost.test.ts` | R | Native cost discipline; no Kernel claim. |
| `execution/lifecycle.test.ts` | X | The Kernel lifecycle is owned by `packages/kernel/tests/outcome-acceptance.test.ts` and `terminal.test.ts`. Kept property: the bridge maps native terminal states to Outcomes and never reopens a terminal Execution (B-TERM). File kept as native regression. |
| `execution/multi-dependency-wait.test.ts` | X | `await_dependencies` is legacy wait vocabulary. Kept property: B-MAP. File kept as native regression (DX-6). |
| `execution/ownership.test.ts` | X | Host-supplied `ownerExecutionId` is refused by name at the SDK (inventory S-OWNER); native ownership inside a lineage is unchanged. File kept as native regression. |
| `execution/response-vs-completion.test.ts` | P | Bridge: a `respond_and_wait` reply is an Emission plus `await`, never `complete` (B-CONV). |
| `execution/scheduler-exclusion.test.ts` | X | One current Activation per Execution is owned by `packages/kernel/tests/dispatch.test.ts`, `submission-authority.test.ts` and `takeover.test.ts`. Kept property: a stalled native lineage does not block another Execution (B-STALL, K14-1). File kept as native regression. |
| `execution/serialization.test.ts` | R | Native record shapes. |
| `execution/terminal-result.test.ts` | P | Bridge: `complete` carries the native terminal result as canonical bytes; an unrepresentable value fails by name (B-TERM, B-VALUE). |
| `execution/wait-wake-resume.test.ts` | X | Kernel waits are owned by `packages/kernel/tests/waits-*.test.ts`. Kept property: an input reply wakes the declared Kernel wait and reaches native exactly once (B-WAKE). File kept as native regression. |
| `interaction/confirmation-decline-controllers.test.ts` | R | Native interaction machinery (owner decision 2A). |
| `interaction/confirmation-settlement.test.ts` | R | Native interaction machinery (owner decision 2A). |
| `interaction/event-delivery.test.ts` | X | Receipts are the Kernel's, owned by `packages/kernel/tests/creation.test.ts`, `ingress.test.ts` and `receipts.test.ts`. Kept property: an exact input retry replays and native receives one Event (B-INPUT). File kept as native regression. |
| `interaction/event-vocabulary.test.ts` | R | Native interaction machinery (owner decision 2A). |
| `interaction/mechanical-confirmation.test.ts` | P | Bridge: confirmation decisions travel as Kernel input and reach native exactly once; an exact retry replays (B-CONFIRM). |
| `interaction/messaging-authority.test.ts` | R | Peer messaging needs a custom controller; native regression only. |
| `interaction/send-message.test.ts` | R | Peer messaging needs a custom controller; native regression only. |
| `interaction/user-input.test.ts` | R | Typed user input needs a custom controller, which the SDK does not host; native regression only. The deprecated `harness.submitUserInput` refuses by name (inventory S-HARNESS-W). |
| `k0/blind-spot-regression.test.ts` | U | K0 control fixture over the protocol vocabulary, not the Harness. |
| `k0/candidate.ts` | S | Support file for this directory's cases. |
| `k0/cited-decisions.test.ts` | U | K0 control fixture over the protocol vocabulary, not the Harness. |
| `k0/cited-decisions.ts` | S | Support file for this directory's cases. |
| `k0/clause-refinements.ts` | S | Support file for this directory's cases. |
| `k0/controls.test.ts` | U | K0 control fixture over the protocol vocabulary, not the Harness. |
| `k0/coverage.test.ts` | U | K0 control fixture over the protocol vocabulary, not the Harness. |
| `k0/coverage.ts` | S | Support file for this directory's cases. |
| `k0/delayed-runtime.test.ts` | U | K0 control fixture over the protocol vocabulary, not the Harness. |
| `k0/fixture.ts` | S | Support file for this directory's cases. |
| `k0/interactions.test.ts` | U | K0 control fixture over the protocol vocabulary, not the Harness. |
| `k0/k0-trace.test.ts` | U | K0 control fixture over the protocol vocabulary, not the Harness. |
| `k0/operation-sink.test.ts` | U | K0 control fixture over the protocol vocabulary, not the Harness. |
| `k0/operation-sink.ts` | S | Support file for this directory's cases. |
| `k0/oracle-discrimination.test.ts` | U | K0 control fixture over the protocol vocabulary, not the Harness. |
| `k0/protocol-vocabulary.ts` | S | Support file for this directory's cases. |
| `k0/refusal.test.ts` | U | K0 control fixture over the protocol vocabulary, not the Harness. |
| `k0/rule-agreement.test.ts` | U | K0 control fixture over the protocol vocabulary, not the Harness. |
| `k0/scenarios.ts` | S | Support file for this directory's cases. |
| `k0/selector-isolation.test.ts` | U | K0 control fixture over the protocol vocabulary, not the Harness. |
| `mcp/exported-operation.test.ts` | R | Native MCP adapter path. |
| `mcp/fixtures.ts` | S | Shared fixture for the retained MCP cases. |
| `mcp/imported-operation-agent-path.test.ts` | R | Native MCP adapter path. |
| `mcp/imported-operation-authority.test.ts` | R | Native MCP adapter path. |
| `mcp/imported-operation-outcome-certainty.test.ts` | R | Native MCP adapter path. |
| `memory/derived-semantic-memory.test.ts` | R | Native memory (owner decision 2A). |
| `memory/structured-memory-model-write.test.ts` | R | Native memory (owner decision 2A). |
| `memory/structured-memory-optimistic-write.test.ts` | R | Native memory (owner decision 2A). |
| `memory/structured-memory-read.test.ts` | R | Native memory (owner decision 2A). |
| `memory/structured-memory-write.test.ts` | R | Native memory (owner decision 2A). |
| `memory/working-notes-handoff.test.ts` | R | Native memory (owner decision 2A). |
| `memory/working-notes.test.ts` | R | Native memory (owner decision 2A). |
| `models/model-portability.test.ts` | R | Native model ports. |
| `models/model-provider.test.ts` | R | Native model ports. |
| `models/model-resolution.test.ts` | R | Native model ports. |
| `workflow/adapters.test.ts` | R | Workflow Runtime behaviour inside the native Runtime. |
| `workflow/agent-stage.test.ts` | R | Workflow Runtime behaviour inside the native Runtime. |
| `workflow/barrier-persistence.test.ts` | R | Workflow Runtime behaviour inside the native Runtime. |
| `workflow/child-stage-decline.test.ts` | R | Workflow Runtime behaviour inside the native Runtime. |
| `workflow/child-stage-integrity.test.ts` | R | Workflow Runtime behaviour inside the native Runtime. |
| `workflow/llm-rag.test.ts` | R | Workflow Runtime behaviour inside the native Runtime. |
| `workflow/model-resumption.test.ts` | R | Workflow Runtime behaviour inside the native Runtime. |
| `workflow/parallel-branch-effects.test.ts` | R | Workflow Runtime behaviour inside the native Runtime. |
| `workflow/parallel-branch-resumptions.test.ts` | R | Workflow Runtime behaviour inside the native Runtime. |
| `workflow/parallel-branch-structured-memory.test.ts` | R | Workflow Runtime behaviour inside the native Runtime. |
| `workflow/parallel-fork-join.test.ts` | R | Workflow Runtime behaviour inside the native Runtime. |
| `workflow/provider-portability.test.ts` | R | Workflow Runtime behaviour inside the native Runtime. |
| `workflow/retrieval.test.ts` | R | Workflow Runtime behaviour inside the native Runtime. |
| `workflow/stage-barrier.test.ts` | R | Workflow Runtime behaviour inside the native Runtime. |
| `workflow/stage-semantics.test.ts` | R | Workflow Runtime behaviour inside the native Runtime. |
| `workflow/workflow-definition.test.ts` | R | Workflow Runtime behaviour inside the native Runtime. |
| `workflow/workflow-stage.test.ts` | R | Workflow Runtime behaviour inside the native Runtime. |
| `workflow/workflow-topology.test.ts` | R | Workflow Runtime behaviour inside the native Runtime. |

## 12. Why each criterion closes

| ID | Closes by | Argument |
|---|---|---|
| K14-1 | Deterministic, with one structural support | Every public run/start path reaches the Kernel through one host module. Its only Kernel calls are the listed coordinator entries. Structurally, only `legacy-bridge/driver.ts` constructs a `Harness` (a §8 rule), so no SDK path can drive native work except through the Driver. SDK tests B-CONTINUE, B-WAKE, B-DEADLINE-WAIT, B-DEADLINE-EXEC, B-TERM, B-FAIL, B-CANCEL and B-STALL drive `createApplication` with a manual clock and assert Kernel `inspect` state, receipts and native side effects (counts at the sink). |
| K14-2 | Structural + deterministic | Structural: legacy-core ↛ Kernel, and the bridge reaches only the Kernel's package root (§8). So legacy code cannot construct a Kernel type, and the bridge's only route to a Kernel wait is `submitOutcome`'s `next`. Deterministic: B-MAP walks every row of the §3 table and asserts the accepted Kernel wait's subscription classes, plus no Kernel wait for in-flight or stuck native states. B-RES asserts a pending native resumption leaves the Kernel `RUNNING` with no wait, and resumes once. |
| K14-3 | Structural | §8 rules in `boundary-policy.ts` and the inventory rows, checked by the existing agreement oracle; one rejected-edge control per rule; the quarantine importer list named exactly. |
| K14-4 | Deterministic, over a closed inventory | The inventory is closed by construction. The test enumerates the runtime exports (`Object.keys(await import("@arrokothi/sdk"))`) and the `Application`, `StartedExecution`, `RunResult` and `ApplicationOptions` members. It enumerates the type-only exports by parsing `index.ts` with the TypeScript API the architecture guards already use. It fails on any export or member the S-rows do not list. G-rows are closed by the guide map's list of SDK-documented features (above). One test per row; refusals assert no Kernel creation and no native record. |
| K14-5 | Deterministic | The export test, the guide page's presence (`check:builder-docs` inventory), and the child-process refusal test for the startup check (§9). |
| K14-6 | Deterministic | `tests/conformance/mapping.test.ts` (new) lists `tests/conformance/**/*.ts` at runtime and fails if a file is missing from, or extra to, the §11 table. It maintains the table as `tests/conformance/legacy-mapping.json`, generated from this note at build, and checks that each P row's named bridge test exists and each X row's named Kernel test file exists. |

## 13. Corpus

Kept passing: the K1.1–K1.3 Kernel corpus, COORD-REFACTOR-01's plan/apply oracle, K1.3's P1–P9 predicate (the
bridge goes through public entries only and constructs no plan), K1.0's forbidden-edge controls, BINDING-01's
canonical-bytes boundary (the Kernel sees only bytes from `toCanonicalBytes`), every retained conformance file,
and the SDK application tests and examples, each preserved or migrated under §7.

New bridge cases (`packages/sdk/tests/bridge-*.test.ts`), each a maintained test:

| ID | Case |
|---|---|
| B-DELIVER | `deliver` returns `undefined` synchronously, reports `delivered()` before returning, and the Kernel holds no Promise; a throwing native step becomes a named `fail`, and a refused fallback becomes a protocol-failure hold |
| B-CONTINUE | A looping Workflow with `maxActivations: 2` returns `activation_limit` with the Kernel `READY` and two `continue` exchanges accepted |
| B-WAKE | Chat turn: `await` on `arrokothi.legacy.input`; `app.input` wakes it; native receives the turn once |
| B-INPUT | An exact `app.input` retry with the same `requestKey` replays the Kernel receipt; native receives one Event; a changed payload conflicts |
| B-QUEUED | Input submitted while an exchange is open is queued, carried by the next exchange, and forwarded once; an `await` declared while it is queued registers as already woken (W-2) |
| B-CONFIRM | Confirmation decision as Kernel input; one native dispatch; an exact retry replays; a decline reaches the native controller; a confirmation outside E's lineage is reported in `ingress_result` and changes nothing native |
| B-CHILD | A confirmation inside a called native child surfaces with the child's `waitingExecutionId` |
| B-DEADLINE-WAIT | Q4: wait deadline expiry fails E by name and cancels the native lineage, pumped by `runUntilBlocked` on a manual clock |
| B-DEADLINE-EXEC | `executionDeadline` expiry cancels E with cause `execution_deadline`, and the Driver cancels the native lineage |
| B-TERM / B-FAIL | Native completion and failure map to `complete`/`fail` with exact result bytes; a terminal Kernel Execution refuses later input |
| B-VALUE | A native value over the core limits fails by name with no partial Outcome; 300 Emissions in one step arrive in order over two exchanges |
| B-CANCEL | `app.cancel` during an open exchange: the Kernel is `CANCELLED`, the native lineage is cancelled, and the Driver's late Outcome loses under CX-6 with no state change |
| B-STALL | Two Executions: E1's Function handler parks on a barrier; E2 starts, runs and completes; then E1 is released and completes |
| B-RES | A slow native model call keeps E `RUNNING` with no Kernel wait, then resumes exactly once |
| B-MAP | Every row of the §3 mapping table |
| B-PIN | The Driver resolves exactly the pinned definition revision; a later version registered under the same ID does not change a running Execution |
| B-MANY | Ten Executions in one application have separate lineages; one lineage's step never runs another lineage's native work |
| B-SCHED | The published Scheduler contract suite runs against the lineage scheduler |
| B-ROOTID | The native root ID equals the Kernel ID under concurrent child spawns in other lineages; an over-long or out-of-pattern `creationKey` is refused by name |
| B-HARNESS | Each deprecated mutator refuses by name with no native effect (Q2); each reader returns the native view |
| B-WRAPPER | The export, and the startup-check refusal in a child process (§9) |

Prompt E attack items will be added here, with their provenance, when the attack record lands.

## 14. Brief question 5: size and ranges

| Part | Production | Tests | Docs |
|---|---|---|---|
| Driver, lineage scheduler, root IDs, codec, host loop | ≈ 900 lines | B-DELIVER … B-ROOTID, ≈ 900 lines | |
| SDK surface: new methods, deprecated view, refused options, wrapper export, L-01 check | ≈ 350 | B-HARNESS, B-WRAPPER, inventory, ≈ 600 | Guides: values page, migrations |
| K14-3 zone, rules, inventory rows | ≈ 80 (policy) | ≈ 250 (fixtures, controls) | `kernel-ownership.md` |
| K14-6 mapping file and test, X-row header notes | — | ≈ 150 | |
| Examples migrated; SDK application tests migrated | ≈ 150 | ≈ 200 changed | |
| BASELINE, Layer 3, 017, reference index, README files | — | — | ≈ 400 |

That is about 1,500 production lines and 2,100 test lines. The interacting state machine is the Driver plus the
host loop; everything else hangs off it. **Recommendation: one packet in two ranges with one review**, as K1.3
did.
- **Range A, the bridge:** Driver, scheduler, root IDs, codec, host loop, `start`, `runUntilBlocked`,
  `runUntilIdle`, `input`, `resolveConfirmation`, `cancel`, `inspect`; K14-1, K14-2, K14-3.
- **Range B, surface and migration:** deprecated view, refused options, wrapper and L-01, K14-4, K14-6, examples,
  guides, BASELINE, Layer 3 and 017.

Splitting A from B across two reviews would review the SDK surface without the inventory that closes it.
Evidence stays proportional (006 principle 6): deterministic tests per row and the standard packet verify in CI.
There is no new mutation registry beyond what packet verify already requires, and no new sweeps.

## 15. Layer 3, BASELINE and 017 at build

- [integration](../../../../mental-model/mechanisms/integration.md): the Status line's "K1.4's legacy bridge uses
  only the reference-Runtime shape" becomes the managed-native-job shape (§5), still earning no support record. One
  sentence for in-process adapters whose native Runtime keeps its own session store: acknowledgment means the
  native mailbox took the Event, and native ingress results are output, not receipts.
- [execution-cycle](../../../../mental-model/mechanisms/execution-cycle.md): state the contract that the host owning
  an in-process coordinator dispatches and pumps timers, since the Kernel has no scheduler. No status text.
- [evidence](../../../../mental-model/mechanisms/evidence.md): no change. Gate results are K1.4-gate's.
- [reference index](../../../../mental-model/reference.md#common-search-terms): the Harness/ControllerResumption row
  says they now live as native machinery behind the legacy Driver.
- BASELINE: rewrite the header's "no supported SDK consumer is routed through the private target package yet" and
  §16; add the bridge API.
- 017, new rows: acknowledgment = forwarded to the native mailbox; no takeover for the legacy Driver; `await` only
  at native quiescence (Q7); a stuck native lineage stays `RUNNING`; deprecated reads are native diagnostics; the
  narrowed L-01.

## 16. Questions for the owner (the design check answers them before code)

1. **Packaging (decision-02 conflict).** K1.4 makes `@arrokothi/sdk` import `@arrokothi/kernel`. Decision-02 says
   "a public SDK package therefore never depends on the private Kernel package". *Recommended:* keep
   `@arrokothi/kernel` `private`. The SDK takes a workspace dependency on it, so the SDK is not publishable until a
   release packet decides how. Record this as a small owner amendment to decision-02. The wrapper's own direction
   (wrapper ↛ Kernel) still holds and is guarded (§8).
2. **Deprecated `harness` mutators.** *Recommended:* refuse by name (§6), so each pause has one resume owner.
   *Alternative:* pass through natively, with documented divergence from Kernel state.
3. **Native lineage on cancellation.** *Recommended:* cancel the root and its native descendants. This changes the
   documented legacy "cancellation does not cascade" behaviour for SDK users. *Alternative:* cancel the root
   only, which orphans children the supported entry can no longer address.
4. **Wait deadline source.** K14-1 asks for an `await` ended by a deadline. Legacy human waits have none.
   *Recommended:* an optional `ApplicationOptions.humanWaitDeadlineMs`. Each Kernel wait the Driver declares carries
   it, and expiry cancels the native lineage and fails E with `arrokothi.bridge.wait_deadline_expired`. The
   Execution deadline is exposed as `start({ executionDeadline })`. *Alternative:* only the Execution deadline, with
   K14-1's deadline case covered by it.
5. **Retry keys.** *Recommended:* optional `creationKey` and `requestKey`, defaulting to fresh UUIDs. The guides
   say only caller keys make retries exact. *Alternative:* required keys on the new methods.
6. **Conformance dispositions.** *Recommended:* add **R** (retained, Runtime-attributed) to the brief's three, and
   keep X-row files as native regressions rather than deleting them (§11).
7. **`await` only at native quiescence (§3).** *Recommended:* yes. A parallel Workflow with an in-flight sibling
   model call reports `confirmation_required` once that call settles rather than at once. This is a migration
   note.
8. **Ranges.** *Recommended:* one packet, ranges A and B, one CI verify and one review (§14).

**Stop conditions checked.** No Kernel semantic change, no new Kernel entry, and no feature that can be neither
preserved nor refused cleanly. Every row in §7 has a disposition with a test. Q1 is an owner-decision conflict, not
a Kernel change, and is put to the owner here. Third-party code: none new. `node:async_hooks` is a builtin, and
`canonicalize@3.0.0` keeps its recorded approval.
