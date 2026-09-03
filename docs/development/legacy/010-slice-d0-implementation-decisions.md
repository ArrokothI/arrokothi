# Slice D.0 Implementation Decisions — Agent Operation Exposure and Projection

> **Status: implemented v0.4 reference-Agent baseline, plus the D.0.1 review retrofit (§14).**
>
> This note records the concrete shapes chosen while implementing Slice D.0, described in
> [`003-implementation-audit-and-migration-plan.md`](003-implementation-audit-and-migration-plan.md)
> §18.2 and constrained by the accepted decisions in
> [`007-interoperability-decisions-before-agent-slice.md`](007-interoperability-decisions-before-agent-slice.md).
> Those decisions were deliberately left unfrozen; this is what they became in code. Canonical
> architecture documents remain authoritative — nothing here promotes an implementation choice into
> an architectural claim.
>
> **Baseline:** Slice C.1 at commit `14d74ab`. D.0 landed at `npm test` 540,
> `npm run test:benchmark-subjects` 8, `npm run typecheck` clean. After the D.0.1 retrofit recorded
> in §14: `npm test` 567, `npm run test:evals` 11, `npm run test:benchmark-subjects` 8, typecheck
> clean.
>
> **Sections 1-13 describe D.0 as it was implemented. §14 records what the post-D review against
> [`009-agent-effectiveness-seams-before-slice-d-review.md`](009-agent-effectiveness-seams-before-slice-d-review.md)
> changed.** Where the two disagree, §14 is current.

## 1. What the slice implements

The four exposure layers of [`../../authority.md`](../../authority.md) §3 are now four distinct
implemented objects, and a model-selected operation reaches the world only as an ordinary Effect:

```text
CapabilityCatalog descriptor          operation-intrinsic truth
        +
EffectiveOperationAuthority           runtime-owned ceiling, written at Execution creation
        +
OperationExposureRequest              authored, in AgentSpec
        ↓ deterministic intersection
ActiveOperationView                   ordered, bounded, content-identified
        ↓ one per model invocation
ModelOperationProjection              immutable bindings; alias → (capability, operation)
        ↓
ModelCapabilitySpec[]                 name / description / input schema
        ↓ the model answers with a name
resolved through THAT projection      never the latest view, never the catalog
        ↓
UseCapability proposal                ordinary typed Effect
        ↓
Harness authorization at dispatch     decisive, from current policy
```

Nothing in the middle is a permission. An operation may be authorized, exposed, projected, selected,
proposed — and denied at dispatch.

## 2. AgentSpec

`packages/core/src/agent/spec.ts`, validated by `agent/validation.ts` at the
`definitions/validation.ts` boundary (authoring, deserialization, and store time alike).

```ts
interface AgentSpec {
  model: LogicalModelRequest;              // logical ref + portable requirements
  instructions: string;
  operations?: OperationExposureRequest;   // refs / groups / maxOperations
  limits?: AgentLimits;                    // maxModelCalls, maxOperationCallsPerStep, maxContextMessages
  completion?: "respond_and_wait" | "complete_on_response";
}
```

Decisions worth recording:

- **Unknown fields are refused**, not carried. That is what keeps a catalog, an authority grant, an
  Active View, a projection, a provider tool schema, an executor reference, or a credential out of a
  definition as *data*, on top of the existing plain-JSON structural rule.
- **An exposure ref names an operation and nothing else.** A ref carrying `description` or
  `consequential` is rejected: those belong to the catalog descriptor.
- **An absent exposure request exposes nothing.** There is no implicit "all of my authority", because
  an Agent that silently inherits its whole ceiling into model context is the failure the Active View
  exists to prevent.
- **`completion` exists so `response != terminal result` stays true by default.** Completing on a
  response is a contract an author opts into, and a terminal value appears only when the definition
  also declares a terminal-result schema.
- **Adapters were deferred.** §18.2 permits Adapter declarations "when used"; D.0 exercises none, and
  adding a declaration form with no consumer would have frozen a shape against no evidence. The
  attachment point is the same one the Workflow path uses.

## 3. Effective operation authority

`packages/core/src/operations/authority.ts`, stored through a new `RuntimeStore` facet.

```ts
interface EffectiveOperationAuthority {
  authorityId: string;
  executionId: string;
  version: number;                 // 1 at root; a later narrowing bumps it
  operations: readonly OperationRef[];   // deduplicated, ordered
  source: "root_grant";
  grantedAt: string;
}
```

Ownership, exactly:

```text
application supplies CreateExecutionInput.operationAuthority
        ↓ validated before anything is written
Harness computes the record and stores it in the SAME transaction as the ExecutionContext
        ↓
ExecutionContext.slots.authority = { authorityId }        (a typed ref, not the record)
        ↓ read-only, through EffectiveOperationAuthoritySource
ActiveOperationViewResolver
```

- A compact allow-set was chosen over a grant/constraint/expiry vocabulary. v0.4 needs "which
  operations", and a general policy language would have been guessing at a slice that has not
  happened. Resource-level narrowing already exists where the Effect model needs it, on the
  authorization decision (`AuthorizationConstraints.resources`); nothing new was invented.
- **Fail closed.** No grant means no record, and a missing record reads as *nothing authorized*. An
  empty grant and an absent one differ only in whether omissions are reported as `not_authorized` or
  `no_authority`.
- `DeferredSlots.activeView` was **removed** rather than typed. An Active View is a deterministic
  derivation; persisting one would store a cache rather than a fact. What must survive an Activation
  is the projection snapshot, and that lives in Agent control state beside the invocation it belongs
  to.
- This is deliberately **not** `EffectAuthorizer`. The authority record is enumerable and advisory —
  a stale answer costs an operation its place in the model's view. The authorizer is decisive on the
  concrete payload immediately before dispatch — a stale answer there would be a bypass.

## 4. ActiveOperationViewResolver

Port: `packages/core/src/ports/active-operation-view.ts`. Reference:
`packages/core/src/reference/active-operation-view-resolver.ts`.

```ts
resolve({ executionId, exposure, taskScope? }) -> ActiveOperationView
```

`ActiveOperationView` carries a content-derived `viewId`, the ceiling it was cut from, ordered
`entries`, and `omitted` entries with a reason (`no_authority`, `not_authorized`, `not_in_catalog`,
`not_projectable`, `beyond_bound`).

- The resolver holds a read-only authority source and a catalog. Its import graph reaches no store,
  scheduler, dispatcher, authorizer, Effect type, or model port — asserted, not asserted-about.
- **Ordering is by `(capability, operation)`**, group selection reads catalog enumeration in the
  catalog's own stable order, and the bound applies after ordering. Two resolutions over the same
  inputs are structurally identical, which is what makes a projection snapshot meaningful.
- **`viewId` tracks what is exposed, not what is authorized.** A wider ceiling that changes nothing
  about the exposed subset yields the same view; changed membership or changed exposed metadata
  yields a different one.
- **No model call.** Large-catalog ranking is a later slice; a mandatory inference in front of every
  Agent turn was explicitly excluded by DEC-I13.
- An operation the catalog cannot describe (no description or input schema) is `not_projectable`
  rather than exposed as a nameless tool.

## 5. Catalog enrichment

`CapabilityOperationDescriptor` gained `title?`, `description?`, `input?: ObjectSchema`, and
`groups?`, all optional, plus `CapabilityCatalog.list()` for deterministic enumeration.

Per DEC-I14 no second ontology was created: there is no `AgentToolDescriptor`, no protocol tool type
in core, no provider tool spec treated as truth, and no second registry. One operation has one
identity, one description, one schema, and one consequentiality baseline whichever surface projects
it. `groups` is present only because the first deterministic resolver consumes it.

## 6. ModelOperationProjection

`packages/core/src/operations/projection.ts`.

```ts
interface ModelOperationProjection {
  projectionId: string;     // "ag/step{N}/projection" - derived, never minted
  viewId: string;
  viewRevision: number;
  bindings: readonly ModelOperationBinding[];   // bindingId, alias, capability, operation, description, input
}
```

- **Aliases are derived from identity** — `${capability}_${operation}` with non-word characters
  flattened — so a provider-safe name is deterministic. Flattening can collide (`docs.search`/`v2`
  and `docs`/`search.v2` both give `docs_search_v2`), and **construction refuses a duplicate alias**
  rather than resolving one ambiguously later.
- `resolveProjectedAlias(projection, alias)` is the only supported resolution. An unknown name
  returns `{ resolved: false }`; there is no nearest match and no catalog fallback.
- `CreateProjectionInput.entries` allows a per-invocation narrowing below the Active View (token
  budget, provider tool limits) without a second view type.
- Every identity here is correlation/integrity data. The conformance suite asserts a projection
  carries no grant, executor, credential, deadline, or resource binding.

## 7. AgentControlState and re-entry coordinates

`packages/core/src/agent/control-state.ts`, version 1.

```ts
interface AgentControlState {
  version; step; started; responses;
  messages: readonly ModelMessage[];          // user input, responses, observations
  invocation: AgentInvocationState | null;    // prepared or in-flight
  continuation: JsonValue | null;             // executor-owned, opaque
  pending: readonly AgentPendingCall[];       // one per requested operation
}

interface AgentInvocationState {
  step; information; projection; observations; continuation; messageCount;
}
```

Re-entry coordinates:

```text
resumption key       agentModelResumptionKey(step)      "ag/step3/model"
correlation          agentCallCorrelationId(step, i)    "ag/step3/call2"
```

Both derive from the persisted step counter alone. Nothing process-local enters either, so a resumed
Activation reconstructs the same key and is handed the stored outcome rather than dispatching again.

- **The invocation snapshot is the whole point.** It records the exact information *and* the exact
  projection the model was shown, so the Activation that interprets the answer interprets it against
  what the model actually saw. The resumption test changes the Active View underneath a suspended
  call and the answer still resolves correctly.
- **`messageCount`** records where in the transcript this invocation's output belongs. Input that
  arrives while a call is outstanding is appended as it arrives — it was consumed from the mailbox
  and must not be dropped — so the answer is spliced at the recorded position rather than pushed onto
  the end. Without it the transcript would show the Agent asked a second question before answering
  the first.
- Correlations are step-scoped, so an earlier step's result matches nothing in a later one, and a
  settled entry ignores a duplicate.

## 8. Reference AgentExecutor boundary

Port: `packages/core/src/ports/agent-executor.ts`. Reference:
`packages/core/src/reference/agent-executor.ts`.

```text
input   resolved model, requirements, compiled information, ONE projection,
        derived ModelCapabilitySpec[], observations, step, bounds, continuation
output  respond | call_operations | continue | stop | fail   (+ optional continuation)
```

- The executor is handed **pure data**, asserted structurally: no function appears anywhere in the
  request, and the whole request survives a JSON round trip.
- **Model resolution stays with the controller; provider invocation lives in the executor.** The
  controller therefore never holds a provider client, and an executor cannot perform application
  routing.
- A returned operation call carries the **alias only**. Resolving it to an operation identity is the
  controller's job, against the projection it showed that call.
- `agentExecutorOutcomeIssues` validates the reply before the controller acts on any of it — the
  outcome crosses the JSON boundary of a resumption, so it is untrusted data on return.

## 9. Information branch

`packages/core/src/controllers/agent/information.ts` compiles instructions plus a bounded window of
the message history. `AgentInformationContext` lives in `agent/information-context.ts` specifically so
the compiler does not transitively import the projection through the executor port — the architecture
suite walks that graph. The compiler chooses no operations and reads no authority; the resolver and
projector own no instructions, transcript, or memory selection. Retrieval, salience, and provenance
are Slice F and were not anticipated.

## 10. AgentController

`packages/core/src/controllers/agent/controller.ts`. One bounded step per Activation:

```text
validate spec -> fold Events -> settle pending -> resolve view -> project
  -> one executor step through ControllerResumptionScope
  -> interpret against THAT projection
  -> respond / propose UseCapability / complete / fail
```

- Holds an exposure resolver, model resolution, an executor, and a trace sink. Its import graph
  reaches no store, scheduler, dispatcher, authorizer, Effect processor, event router, or settlement
  path, and its modules do not name any of them.
- A slow model step takes the Slice-C.1 controller-local resumption path unchanged. No Agent-specific
  promise registry and no second suspension implementation were added.
- Denials, failures, and unknown outcomes reach the model as faithfully as successes.

## 11. Strands bridge

`packages/agents/strands/src/agent-executor.ts` and `model.ts`, satisfying DEC-I19.

```text
projection -> FunctionTool specs -> model tool use
  -> BeforeToolCallEvent.interrupt(), strictly before native execution
  -> capture name/input/tool-use id + takeSnapshot({ preset: "session" })
  -> semantic operation call + JSON continuation
  -> [ AgentController -> UseCapability -> Harness -> result Event ]
  -> loadSnapshot + invoke([InterruptResponseContent]) with the observation
  -> the interrupt returns it; an observation-only callback hands it to the model
```

Findings:

- The installed Strands 1.14 surface supports this. The interrupt id is derived as
  `hook:beforeToolCall:${toolUseId}:${name}`, so it is reconstructible from persisted state; the
  continuation carries `{ snapshot, pending: [{ interruptId, toolUseId, alias }] }` and round-trips
  through JSON.
- **Multiple tool uses in one turn work.** The concurrent tool executor registers an interrupt per
  call before throwing, so all of them are captured before any executes.
- The experimental `afterModel` checkpoint was **not** used, per DEC-I19: its JavaScript resume path
  may re-invoke the model, which would be a model turn the Agent's budget never accounted for.
- The model is always an `ArrokothStrandsModel` over the provider ArrokothI's own resolution named.
  No vendor is inferred and no first-party provider is constructed — the legacy engine's
  `providerId === "gemini"` branch is not reproduced.
- **Limitation: cancellation is only forwarded when the resolved deployment declared the portable
  `cancellation` feature.** Strands supplies a `cancelSignal` on every invocation, and the portable
  provider contract rejects a signal for a model that did not negotiate one. Framework-level
  cancellation still works (the agent stops and the bridge reports `strands_cancelled`); it simply is
  not pushed down to a provider that never advertised it.
- **Limitation: the model bridge is not really streaming.** The portable provider contract returns a
  whole response, so `stream()` emits the aggregate as the events the framework's aggregator expects.
  Nothing depends on token-level streaming today, and pretending otherwise would have been dishonest.
- **Limitation: `options.toolSpecs` is ignored.** The specs shown to the model come from the
  ArrokothI projection, deliberately, so the framework's registry cannot become a second source of
  what the model sees.
- The legacy `StrandsLoopEngine` is retained untouched while the benchmark subjects, examples, and
  Studio remain on the legacy Session path. It is not part of the v0.4 boundary and is deleted with
  those consumers.

## 12. Substrate changes made for this slice

Additive except where noted:

| Change | Kind |
|---|---|
| `RuntimeStore.operationAuthorities` facet + `readOperationAuthority` | additive; contract case added |
| `CapabilityOperationDescriptor` descriptive fields; `CapabilityCatalog.list()` | additive; `list()` is a new required method on the port |
| `CreateExecutionInput.operationAuthority`; `Harness.effectiveOperationAuthorityOf` | additive |
| `DeferredSlots.authority: OperationAuthorityRef \| null` | typed; was `string \| null` |
| `DeferredSlots.activeView` | **removed**; see §3 |
| `AgentSpec = JsonObject` → validated interface | replaced, as §18.2 requires |
| `TestHarnessOptions.store` | additive; exposure resolution must read the store the Harness writes |
| `toJsonSchema` exported from `/execution`; data contracts exported from `/ports` | additive |

No Slice-C.1 or Workflow semantics were changed. `ControllerResumption`, Stage semantics, Workflow
resumption keys, the scheduler, the Event vocabulary, Effect/PendingOperation semantics, and
EffectProcessor fast/slow equivalence are untouched.

## 13. Deliberately not implemented

MCP in any form; child composition, `SpawnExecution`, or authority delegation; memory, `WriteMemory`,
`SendMessage`, `RequestUserInput`; general human interaction; Agent-loop Adapters; general
stale-continuation or interleaving policy; parallel Workflow branches; durable resumption recovery; a
unified `Suspension` record; sandbox or environment architecture; a full principal/tenant policy
model; Cedar/OpenFGA; large-catalog BM25/embedding/LLM selection; general service export; A2A;
Skills; and any new Event kind.

---

## 14. D.0.1 — the post-D review retrofit

The review in
[`009-agent-effectiveness-seams-before-slice-d-review.md`](009-agent-effectiveness-seams-before-slice-d-review.md)
was applied to the landed D.0 implementation. It produced one blocking correction and four additive
seams. Nothing in the Slice-D architecture above was reversed: the layering, the controller/Harness
division, `ControllerResumption`, and the Strands interrupt-before-execution bridge are unchanged.

### 14.1 The defect: effective authority did not bind dispatch

D.0 made `EffectiveOperationAuthority` constrain the **Active Operation View**, and made the
`EffectAuthorizer` decide the concrete request. Read together, those two facts left a gap:

```text
a buggy or custom ActiveOperationViewResolver exposes an operation
        ↓ outside the stored ceiling
the projection carries it, the model selects it, the controller proposes it
        ↓
a permissive EffectAuthorizer allows it
        ↓
it dispatches
```

Nothing in D.0 stopped that, which contradicts what §3 of this document says the ceiling *is*.
Exposure was narrowing authority without authority binding execution.

`EffectProcessor` now checks the operation against the Execution's **current** effective authority
before it consults policy at all:

```text
UseCapability proposal
        ↓ journal      requested
current EffectiveOperationAuthority, read fresh from the runtime-owned store facet
  operation absent, or no record at all  ->  denied, and policy is never asked
        ↓
EffectAuthorizer on the concrete payload
  deny  ->  denied
        ↓
ordinary dispatch
```

Decisions worth recording:

- **The check is in the gateway, not in a controller.** Enforcement belongs where dispatch happens.
  The architecture suite now asserts the inverse as well: no module under `controllers/` names
  `authorizesOperation`, `readOperationAuthority`, or `effectiveOperationAuthority`, and no
  controller's import graph reaches the read-only authority port.
- **One source, not two.** The gateway reads `RuntimeStore.readOperationAuthority` - the same
  runtime-owned facet the exposure resolver reads through
  `EffectiveOperationAuthoritySource` - rather than being handed a second authority object. The
  ceiling that governs a dispatch and the ceiling an Active View was cut from cannot drift apart.
- **The ceiling is checked before policy.** Ordering matters as much as outcome: policy that is
  *asked* about an operation outside the ceiling is policy that could accidentally allow it.
- **Fail closed, with two distinct codes.** `no_effective_operation_authority` and
  `operation_outside_effective_authority` are different mistakes and read differently in the journal.
  There is no compatibility fallback that trusts the authorizer alone when no record exists.
- **Fixtures were updated, not the rule.** Every conformance case and the workflow canary that
  legitimately dispatches a capability now creates its root Execution with an explicit
  `operationAuthority` grant. That is a real improvement in those tests: they now say what the
  Execution was permitted, rather than relying on policy to imply it. No Workflow semantics,
  topology, or `ControllerResumption` behaviour changed.

`tests/conformance/agent/authority-ceiling.test.ts` is the inverse of the existing reauthorization
test and proves the four cases that matter: a buggy resolver plus a permissive authorizer dispatches
nothing; the authorizer is never consulted for an out-of-ceiling operation; an Execution with no
ceiling can dispatch nothing; and a ceiling narrowed *while a model call is suspended* denies the
dispatch the old projection would otherwise have carried. That last case models the narrowing at the
store port rather than inventing a mutable-authority API, because v0.4 has none and delegation is
Slice E.

### 14.2 Model-facing observation projection

`agent/observation-projection.ts`. D.0 shaped operation results in two independent places -
`renderAgentObservation` in core and `observationValue` in the Strands bridge - which is two answers
to one question.

```text
Event / settled result  ->  AgentOperationObservation  ->  AgentModelObservation  ->  executor
                            semantic                      replaceable strategy
```

```ts
interface AgentObservationProjector {
  project(observation: AgentOperationObservation, context?: AgentObservationProjectionContext): AgentModelObservation;
}
```

- `AgentModelObservation` carries **two** rendered forms - `content` for the transcript and `value`
  for a framework resuming a paused tool call - because there are two honest consumers and one
  strategy must decide both. Everything else on it (`callId`, `alias`, `outcome`) is correlation.
- `renderAgentObservation` was **removed**. The controller projects once per step and uses that one
  projection for the transcript *and* for `AgentExecutorRequest.observations`, whose type changed
  from the semantic record to the projected one. The Strands bridge now forwards
  `observation.value`; converting it to `InterruptResponseContent` is framework adaptation, and the
  test greps to prove the bridge no longer re-derives outcome shape itself.
- The persisted `AgentInvocationState.observations` stores the **projected** form, deliberately: what
  must survive a resumption is what the call actually saw, and a later strategy change must not
  retroactively rewrite it.
- The reference projector preserves D.0 behaviour and implements none of redaction, truncation,
  pagination, summarisation, stable references, or concise/detailed modes. Those are what the seam
  exists to make replaceable; shipping one as the default would make it policy.

### 14.3 Evaluation-grade model invocation trace

The `AgentTrace` seam was kept and extended rather than replaced, and no model-result Event kind was
added.

`AgentExecutor.step` now returns `AgentExecutorStepResult`:

```ts
{ outcome: AgentExecutorOutcome; metadata?: AgentModelInvocationMetadata }
```

Split rather than flattened, so a controller structurally cannot branch on a finish reason. The
reference executor was discarding `response.metadata` and `response.diagnostics` entirely; it now
reports provider, concrete model, usage, finish reason, normalized diagnostics, and a latency
measured around the provider call. The Strands bridge reports what the framework truthfully has -
accumulated usage, stop reason, latency - and invents no `diagnostics` field it cannot fill.

`AgentModelInvocation` grew from eight fields to the whole invocation boundary: `executionId`,
`activationId`, `step`, `reentered`, logical and resolved model identity, deployment metadata,
`informationSelectionId`, `projectionId`/`viewId`/`bindings`, the semantic `outcome`, the resulting
controller `decision`, the `proposals` with their correlations, and `metadata`. The record is now
emitted **after** the decision is known, so one record answers "what did it see, what did it say,
what did we then do".

- **`informationSelectionId`** is a content digest of the compiled context (`ic_…`), added so a trace
  can name what a call saw without the prompt being retained. It is correlation, not authority, and
  nothing looks a context up by one.
- **`reentered`** distinguishes a fast completion from one that crossed a `ControllerResumption`. The
  metadata travels as plain JSON through the resumption, so both paths report the same facts - which
  the conformance suite asserts on both paths.
- Tracing remains inert: the trace test asserts no Effect kind, no journal entry, no mailbox append,
  and no leakage of `usage`, `finishReason`, `latencyMs`, or diagnostics into control state.

### 14.4 Typed model action binding target

`operations/action-target.ts`. `ModelOperationBinding` no longer embeds `capability`/`operation`
directly:

```ts
type ModelActionTarget = { kind: "capability_operation"; capability: string; operation: string };

interface ModelOperationBinding { bindingId; alias; target: ModelActionTarget; description; input }
```

- **Exactly one target kind exists**, and the controller switches on `kind` with an explicit refusal
  for anything else. No `WriteMemory`, `SpawnExecution`, `SendMessage`, `RequestUserInput`, or local
  action was implemented, and no universal action registry was created. The change is migration
  safety: a projection is persisted inside an invocation snapshot, so the flat pair would have stored
  the claim that every model-visible action *is* a capability operation.
- `AgentPendingCall` and `AgentOperationObservation` carry the same target rather than duplicating
  the pair.
- **`AGENT_CONTROL_STATE_VERSION` is 2**, and `readAgentControlState` returns
  `absent | read | unsupported` instead of `AgentControlState | null`. A version this build does not
  know is *refused* - the controller fails with `agent_control_state_version_unsupported` - because
  "no progress yet" and "progress this build cannot interpret" are different situations, and reading
  a v1 record as v2 would resolve a stored alias against a target that is not there. Pre-v1 carries
  no migration, deliberately.

### 14.5 Strategy-neutral information compiler

`AgentInformationCompiler` in `controllers/agent/information.ts`, with
`referenceAgentInformationCompiler` (instructions plus a bounded recent-message window) as the
default. The controller held a direct import of the one fixed compiler; it now holds the port.

No Structured Memory, Derived Semantic Memory retrieval, Working Notes, artifact retrieval,
summarisation, compaction, fresh-context handoff, or model-specific packing was implemented. The
architecture suite still walks the compiler's import graph and asserts it reaches no authority,
exposure, or projection module, and the conformance case proves the property that matters: two
compilers over the same Agent state produce different contexts while the operation projection stays
structurally identical and the provider is shown byte-identical operation specs.

### 14.6 Behavioural eval baseline

`tests/evals/agent/`, run by `npm run test:evals`, kept strictly separate from
`tests/conformance/`. A small trial abstraction (`runTrial`/`runTrials`/`measure`) plus ten
deterministic cases over scripted models and in-memory worlds: correct selection, correct arguments,
no unnecessary call, success, failure recovery, denial recovery, unknown outcome not claimed as
success, an unexposed operation never selected, model-call budget exhaustion, and a confident claim
graded against an unchanged world.

Every case is graded on **environment state**, not on the Agent's text. Metrics recorded per trial:
task success, operation-selection correctness, argument correctness, unnecessary calls, model-call
count, operation-call count, bounded-progression failure, tokens, and latency. `runTrials` takes a
trial count so a stochastic provider drops in later; a deterministic script runs one trial and says
so. No dashboard, no telemetry service, no benchmark-specific kernel primitive, no planner/evaluator
type, and no LLM judge.

### 14.7 What D.0.1 deliberately did not do

Everything in §13 remains not implemented. The retrofit added no MCP, no Slice E, no memory, no
messaging, no human input, no second action family, and no model-visible wrapper for any other
Effect. It also did not add a mutable-authority API: the narrowing conformance case models a changed
ceiling at the store port precisely so that one is not invented before delegation needs it.

---

## 15. What came next

Slice D was accepted after this retrofit, and the behavioural baseline in §14.6 landed with it. The
next slice was the narrow synchronous MCP operation proof, recorded in
[`011-mcp-synchronous-operation-proof.md`](011-mcp-synchronous-operation-proof.md).

That proof is worth reading back against §5 and §14.4 in particular. Importing a real MCP Tool
needed no second descriptor ontology and no second action target kind: `CapabilityOperationDescriptor`
absorbed a protocol operation source unchanged, and `capability_operation` remained the only target
kind minted. §13's "MCP in any form" line is superseded only by that one narrow proof, which lives
entirely outside `packages/core`.
