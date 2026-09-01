# Slice D.0 Implementation Decisions — Agent Operation Exposure and Projection

> **Status: implemented v0.4 reference-Agent baseline.**
>
> This note records the concrete shapes chosen while implementing Slice D.0, described in
> [`003-implementation-audit-and-migration-plan.md`](003-implementation-audit-and-migration-plan.md)
> §18.2 and constrained by the accepted decisions in
> [`007-interoperability-decisions-before-agent-slice.md`](007-interoperability-decisions-before-agent-slice.md).
> Those decisions were deliberately left unfrozen; this is what they became in code. Canonical
> architecture documents remain authoritative — nothing here promotes an implementation choice into
> an architectural claim.
>
> **Baseline:** Slice C.1 at commit `14d74ab`. `npm test` 540, `npm run test:benchmark-subjects` 8,
> `npm run typecheck` clean.

## 1. What the slice implements

The four exposure layers of [`../authority.md`](../authority.md) §3 are now four distinct
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
