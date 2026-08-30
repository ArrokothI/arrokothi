# Implementation Guide

> **Status: non-normative implementation translation.**
>
> Read [`mental-model.md`](mental-model.md), [`composition.md`](composition.md), [`runtime-architecture.md`](runtime-architecture.md), and [`security-guarantees.md`](security-guarantees.md) first. This guide translates those semantics into implementation boundaries and a practical coding-plan strategy. Exact APIs are intentionally illustrative.

## 1. Implementation goal

The implementation should make the semantic model obvious in the codebase:

```text
ExecutionDefinition
        ↓ create
ExecutionContext
        ↓ scheduled Activation
AgentController | WorkflowController
        ↓
EffectRequest(s)
        ↓
Harness
        ↓
Event(s)
```

The critical dependency direction is:

```text
provider/framework/storage implementations
                ↓
            kernel ports
                ↓
          kernel semantics
```

Provider SDKs, Agent-loop frameworks, retrieval libraries, tool transports, databases, observability systems, and sandbox backends should not define what Execution, Workflow, Agent, Event, Effect, authority, memory, or security boundaries mean.

---

## 2. Suggested core definitions

The older four-way `ExecutableDefinition` union should not be carried forward merely for uniformity.

A clearer name is worth considering:

```ts
type ExecutionDefinition =
  | AgentDefinition
  | WorkflowDefinition
```

This naming is not yet frozen. The semantic requirement is that the union means **definitions that instantiate independently managed Executions**.

Illustratively:

```ts
interface DefinitionBase {
  id: string
  version: string
  requestedAuthority?: AuthorityRequest
  memory?: MemoryDeclaration
  metadata?: Record<string, unknown>
}

interface AgentDefinition extends DefinitionBase {
  kind: "agent"
  spec: AgentSpec
}

interface WorkflowDefinition extends DefinitionBase {
  kind: "workflow"
  spec: WorkflowSpec
}
```

Function and LLM configuration belongs to Stage/Agent implementation structures rather than this top-level union.

---

## 3. Execution record vs controller state

Do not place every concept into one opaque `state` object.

A useful conceptual split is:

```ts
interface ExecutionContext<TResult = TerminalResult> {
  id: ExecutionId
  definition: ExecutionDefinitionRef

  owner?: ExecutionId
  rootExecutionId: ExecutionId

  lifecycle: LifecycleState
  authority: AuthorityEnvelope
  activeView: ActiveCapabilityView
  resources: BoundResource[]

  control: AgentControlState | WorkflowControlState
  mailbox: MailboxRef
  memoryView: MemoryViewRef
  workingNotes: WorkingNoteViewRef
  pending: PendingOperationRef[]

  policy: EffectiveRuntimePolicy
  terminalResult?: TResult

  createdAt: Timestamp
  updatedAt: Timestamp
}
```

`TerminalResult` here is definition/interface-specific and may be generic or schema-bound. It must **not** inherit the Workflow experiment that Stage transitions use `text | none`.

Keep identity/metadata, controller progress, semantic memory, and execution history separately queryable.

---

## 4. Controller contracts

The Harness should not need provider-specific knowledge to schedule an Agent or Workflow.

Conceptually, a controller advances one Execution during an Activation and reports what semantic progress was made:

```text
ExecutionContext + delivered Events
        ↓ Activation
AgentController | WorkflowController
        ↓
Activation outcome
  ├── requested Effects
  ├── updated controller progress
  └── optional terminal completion/result
        ↓
Harness
        ↓
update ExecutionContext / dispatch Effects / route future Events
```

The important relationship is:

```text
Controller
  computes what should happen next

Activation outcome
  reports that result for this Activation

ExecutionContext
  records the runtime's current durable truth about the Execution
```

Most Activations do not terminate the Execution. A terminal result appears only when the controller reports semantic completion; the Harness then records the completed lifecycle and terminal result in the `ExecutionContext` and may deliver that result to a waiting parent/caller as an Event.

The exact API shape is intentionally left open. Preserve only these semantics: controllers do not directly own persistence or operational lifecycle, external truth returns through Events, and Execution terminal-result typing remains independent from Workflow Stage-result typing.

### Agent controller

An Agent controller owns the model-directed loop and may use an interchangeable Agent executor.

It should:

```text
compile context
apply input Adapter(s)
perform model inference
apply output Adapter(s)
interpret model output
request Effects / child calls / messages
observe results
repeat when model-directed continuation requires it
```

Do not hard-code one framework's tool-loop object model into kernel contracts.

### Workflow controller

A Workflow controller owns:

```text
current Stage
Stage execution
predefined transition resolution
Stage completion barrier
Stage result handoff
terminal completion
```

It should not expose its Stage objects as independent runtime Executions.

---

## 5. Workflow definitions

Illustrative only:

```ts
interface WorkflowSpec {
  entry: StageId
  stages: Record<StageId, StageDefinition>
}

type StageDefinition =
  | FunctionStageDefinition
  | LLMStageDefinition
  | AgentStageDefinition
  | WorkflowStageDefinition
```

Each Stage can define:

```text
input mapping
implementation/body
input/output Adapters
memory view hints
Working Note handoff policy
predefined transitions
```

Avoid prematurely adding one core Stage kind for every UI concept such as router, evaluator, guard, retrieval, or aggregator. Those should usually compile to the four base Stage forms.

---

## 6. Stage execution contract

A useful internal Stage runner should guarantee:

```text
start Stage
  ↓
construct Stage-local view
  ↓
input Adapter(s)
  ↓
run Stage body
  ↓
request/await Effects required for this Stage
  ↓
collect required child/results
  ↓
output Adapter(s)
  ↓
produce text | none
  ↓
resolve predefined transition
```

The Stage runner needs access to the enclosing Workflow Execution's runtime facilities, but should not create another `ExecutionContext` for local Function/LLM computation.

A Stage may have a local runtime record for configuration, progress, or tracing. This does not make the Stage an independently managed Execution. Stage identifiers are Workflow-local bookkeeping and do not imply independent lifecycle, authority, mailbox, durability, addressability, cancellation, or messaging semantics.

A useful implementation concept is a **Stage-local computation environment**:

```text
Workflow Execution authority / active view
        ↓
Stage-local environment
  ├── Stage input
  ├── local variables
  ├── selected memory/context
  ├── explicitly exposed local/materialized resources
  ├── functions / parsing / validation
  ├── local retrieval / filtering / reranking
  └── LLM inference
```

Local code may compute freely over information and handles that have already been deliberately exposed. It should not gain additional environmental authority merely because it can execute code.

Effects remain attributed to the enclosing Workflow Execution. A Stage runner only establishes which pending operations are required for the current Stage's completion.

---

## 7. LLM Stage and retrieval implementation

Do not encode "LLM Stage = exactly one provider call" as a kernel invariant.

A bounded Stage implementation may do:

```text
one LLM call
```

or:

```text
LLM → Effect(s) → collect → output
```

or:

```text
LLM → retrieval → LLM → output
```

provided continuation is program-defined.

A provider SDK may itself hide a multi-turn tool loop. If that hidden loop allows model-directed open-ended action selection, semantically it behaves like Agent execution, even if the provider exposes it as one HTTP/SDK method. Model semantic control, not API-call count.

### Local RAG vs runtime-mediated RAG

Do not encode "retrieval = always an Effect" either.

If a resource has already been deliberately materialized into the Stage's exposed computation environment as a safe read-only corpus/index, then querying, filtering, reranking, and context construction may be ordinary local computation:

```text
read-only corpus/index already exposed
        ↓
local query / filter / rerank
        ↓
LLM
```

If retrieval requires expanding beyond that environment to a live database, remote vector service, browser, private API, or other runtime-managed resource, use the Effect/capability boundary:

```text
Stage
  ↓ retrieval Effect
Harness authorization
  ↓
resource adapter
  ↓
result observation
```

A `BoundResource` therefore means that an Execution is eligible to use a resource under its effective authority/view. It does not necessarily mean arbitrary Stage code receives a raw database connection, filesystem path, network route, or production credential.

This distinction allows rich Stage-local coding while keeping external authority enforceable.

---

## 8. Adapter interface

Illustratively:

```ts
type AdapterResult<T> =
  | { kind: "pass"; value: T }
  | { kind: "transform"; value: T }
  | { kind: "reject"; reason: string }

interface Adapter<I, O> {
  apply(input: I, ctx: AdapterContext): Promise<AdapterResult<O>>
}
```

The v0.4 `AdapterContext` should expose only what is necessary:

```text
read-only selected memory
metadata/context needed for transformation
no Effect gateway
no write authority
no spawn/message API
```

The same adapter interface should be usable at:

```text
Stage input
Stage output
Agent-loop model input
Agent-loop model output
```

Future attachment points such as memory-read, memory-write, Event, or Effect adapters should not be added until concrete applications justify them.

---

## 9. Event and Effect envelopes

Use normalized envelopes with causation/correlation metadata.

Illustratively:

```ts
type EffectRequest =
  | UseCapabilityEffect
  | WriteMemoryEffect
  | SpawnExecutionEffect
  | SendMessageEffect
  | RequestUserInputEffect
```

Common fields may include:

```text
effectId
requestingExecutionId
causedByEventId / activationId
kind
payload
authorizationEvidence?
```

Events should be typed observations:

```text
StartInput
CapabilityResult / CapabilityFailure
ChildCompleted / ChildFailed
MessageReceived
UserInput
ConfirmationDecision
Timer / Timeout
Cancellation / control
```

Avoid treating provider/model output as an Event when it is merely local controller computation. An ordinary model call may return directly to the controller inside the same Activation. Reserve Event semantics for observations delivered through the Execution runtime boundary.

The source alone does not determine the abstraction. If a model inference is itself dispatched as a remote runtime-managed operation that outlives the current Activation, its later completion may legitimately arrive through the runtime as an Event.

---

## 10. Pending operations, inline waiting, and deadlines

A generic pending-operation record should avoid one-off waiting mechanisms per feature.

Illustratively:

```ts
interface PendingOperation {
  id: PendingOperationId
  executionId: ExecutionId
  effectId?: EffectId
  kind: string
  status: "pending" | "completed" | "failed" | "cancelled"
  correlation: CorrelationKey
  requiredFor?: CompletionBoundary
  deadline?: Timestamp
}
```

Potential `requiredFor` values could encode whether completion blocks:

```text
current Agent step
current Workflow Stage
Execution terminal completion
nothing (non-blocking/future)
```

This is completion/correlation scope, not ownership by a Stage or Agent step. The Effect itself remains attributed to `executionId`.

Not every pending operation must originate from an Effect. Runtime-mediated waits such as timers may still need correlation and completion metadata, so `effectId` should not be a universal requirement.

### Fast-path completion within an Activation

An Effect boundary does not have to imply an immediate lifecycle transition to `WAITING`.

A useful v0.4 implementation strategy is:

```text
EffectRequest
   ↓
Harness dispatches
   ↓
result becomes available quickly?
   ├── yes → deliver/observe result and continue same Activation
   └── no  → persist pending operation, yield Activation,
             Execution RUNNING → WAITING
```

This is an optimization of scheduling, not a change in Effect semantics. Authorization, correlation, tracing, and external-observation rules still apply whether the result is fast or slow.

Keep two time concepts separate:

```text
inline / Activation wait budget
  how long the current Activation is willing to remain occupied

Effect deadline
  how long the operation itself is allowed to remain unresolved
```

Reaching the inline wait budget should normally mean "yield this Activation," **not** "cancel/fail the Effect."

For example:

```text
Effect dispatched
  ↓
inline budget expires
  ↓
persist PendingOperation
  ↓
Execution WAITING
  ↓
Effect later completes before its actual deadline
  ↓
Event → mailbox → READY → future Activation
```

An ordinary language-level `await` also does not by itself imply Arrokoth lifecycle `WAITING`. The lifecycle transition occurs only when the runtime yields the Activation because required runtime-mediated work remains unresolved.

The Stage itself never enters lifecycle `WAITING`; the enclosing Workflow Execution does, while Workflow control state records which Stage is still active.

Do not freeze exact threshold values or a particular Promise/stream API before measuring real workloads. The important semantic requirements are correlation, durable resumability when yielded, and separation between an Activation scheduling budget and the actual operation deadline.

---

## 11. Memory interfaces

Separate logical memory semantics from physical storage.

Potential kernel ports:

```text
StructuredMemoryStore
ArtifactStore
WorkingNoteStore
MemoryViewResolver
ContextCompiler
```

### Structured Memory

Support:

```text
schema validation
field-level/read-write views where useful
provenance
optimistic/conflict handling when concurrency appears
explicit writes through WriteMemory Effect when externally meaningful
```

### Working Notes

Represent frames explicitly enough to support:

```text
ancestral frame relationships
explicit child visibility/delegation filter
inherited read-only note view
child-local writes
pop/remove from active context
optional trace archival
per-frame/token bounds
Stage handoff policy
future fork snapshot/reference semantics
```

The critical rule is:

```text
note ancestry ≠ note visibility
```

At child creation, derive a Working Note view from explicit delegation/policy rather than automatically exposing every parent frame. This prevents a child with narrower resource authority from receiving confidential information merely because the parent wrote that information into scratch notes.

Do not implement automatic child-to-parent commit in v0.4.

### Artifacts

Keep large files/work products outside prompt-shaped state objects. Bind them as resources and retrieve/select relevant content into context.

---

## 12. Authority model implementation

Keep four concerns separate in types and checks:

```text
capability permissions
resource permissions
spawn permissions
message permissions
```

Creation should compute effective child authority from explicit inputs, not from model statements.

A possible pipeline:

```text
Definition request
      ↓
creator delegable authority
      ↓
runtime/application policy
      ↓
resource availability
      ↓
effective envelope
```

Child creation should separately derive a memory/context visibility view:

```text
parent eligible memory/context
      ↓
visibility/delegation policy
      ↓
child MemoryView / WorkingNoteView
```

Do not assume that Resource Authority alone implements information-flow control. A parent can derive information from a resource and later pass that information explicitly; memory/context delegation is therefore a separate policy surface.

Active/exposed views should be separately mutable within the envelope.

Conformance checks should prove:

```text
Active View never exceeds authority
child authority never exceeds parent delegation
child note ancestry does not bypass child visibility policy
message permission does not imply memory access
message permission does not imply cancellation
knowing an ExecutionId does not imply access to its private runtime state
```

---

## 13. Capability and resource gateway

Capabilities should use a stable kernel-facing interface even if transports differ.

Conceptually:

```ts
interface CapabilityGateway {
  execute(request: AuthorizedCapabilityRequest): Promise<CapabilityOutcome>
}
```

Implementations may route to:

```text
native function
MCP
HTTP/OpenAPI
retrieval framework
browser/computer service
sandbox
remote job system
```

Knowledge retrieval and action tools can share runtime Effect semantics while retaining class/provenance metadata.

A local Function Stage that deterministically chooses a consequential capability still uses the same Effect gateway.

For untrusted execution, prefer exposing capability/resource handles rather than raw credentials:

```text
untrusted Stage/Agent code
      ↓ EffectRequest(resource handle)
Harness / gateway
      ↓ authorization
resource adapter owns secret/transport
      ↓
external system
```

A resource being bound to an Execution means the runtime may expose an authorized mode of use. It should not automatically mean that the underlying credential is placed in `process.env`, that arbitrary network egress is opened, or that a raw database client is handed to hostile code.

---

## 14. Confirmation and user input

Implement user input and confirmation separately.

### RequestUserInput

Needs:

```text
Effect + pending operation
presentation transport
UserInput Event
correlation
resume/wake-up
```

### Mechanical confirmation

Needs:

```text
canonical Effect payload hash/id
Confirm/Deny decision
exact-payload binding
pending-operation recovery
```

### Authorization evidence

Allow an Effect to reference user Events/preferences as evidence, but keep the decision in policy code:

```ts
interface AuthorizationEvidence {
  eventIds?: EventId[]
  preferenceRefs?: MemoryRef[]
}
```

Do not accept a model-authored boolean as authoritative consent.

---

## 15. Runtime store and scheduler ports

Keep storage and scheduling replaceable.

Potential ports:

```text
ExecutionStore
EventStore/MailboxStore
PendingOperationStore
SchedulerQueue
EffectJournal
TraceSink
```

An in-memory reference implementation is valuable because it tests semantics without durability complexity.

A durable SQLite implementation can then prove restart/recovery semantics.

Later distributed implementations should not require changes to application-level Agent/Workflow definitions.

---

## 16. Execution environment and sandbox ports

Security isolation should also remain replaceable.

Do not make the kernel's Execution/Stage semantics depend on one container product. A useful boundary is:

```text
Agent/Workflow/Stage semantics
        ↓
ExecutionEnvironment / Sandbox port
        ↓
trusted in-process runner
Docker / container backend
remote isolated worker
managed sandbox
VM / microVM
WASM/isolate where appropriate
```

Two profiles should remain explicit:

```text
trusted local profile
  developer owns the host process
  → in-process execution is acceptable
  → kernel guarantees Arrokoth-mediated semantics,
    not containment from arbitrary host code

isolated hosted profile
  executable code may be adversarial
  → selected runner must provide an actual isolation boundary
  → privileged external access goes through controlled Effects/capabilities
```

Static code analysis, restricted-import checks, and AI suggestions are useful front-end tooling but must not be the only defense for hostile uploaded code.

Before building sandbox primitives from scratch, evaluate existing open-source mechanisms such as OpenClaw sandbox backends, Hermes execution environments/tool RPC patterns, and Dify Sandbox. Reuse should occur behind an Arrokoth-owned port and only after reviewing threat model, configuration defaults, escape hatches, licenses/notices, and security maintenance. See [`security-guarantees.md`](security-guarantees.md) for the current security contract and upstream references.

---

## 17. Tracing and provenance

Every important runtime action should be reconstructable across:

```text
Execution ancestry
Activation
Event → Effect causation
Effect → result Event correlation
messages
memory writes
capability/resource provenance
Stage transitions
Agent decisions where inspectable
authority grants/denials
sandbox/profile selection
```

Do not confuse tracing with model context. Detailed history may be retained for debugging/evaluation without being placed into every model call.

Security-relevant denials should be auditable without leaking secrets into ordinary model context or error messages.

---

## 18. Practical implementation slices

A future coding plan should prefer vertical semantic slices over broad renames.

### Slice A — Execution substrate

Deliver:

```text
Agent/Workflow ExecutionDefinition
ExecutionContext
lifecycle
Activation
basic in-memory scheduler/store
```

Checkpoint:

- a long-lived test Execution can WAIT, receive an Event, wake, and resume;
- a normal response does not imply completion;
- a typed/schema-bound terminal result can be returned without depending on Workflow Stage result semantics.

### Slice B — Event/Effect gateway

Deliver:

```text
normalized Events
EffectRequests
Capability gateway
pending operations
Event routing
inline-completion fast path + yield-to-WAITING path
```

Checkpoint:

- a fast authorized Effect may complete without forcing another Activation;
- the same Effect, when slow, can survive `WAITING` and resume with a correlated Event;
- reaching an Activation inline-wait budget does not accidentally become the Effect's failure deadline;
- failures are observable Events before terminal failure.

### Slice C — Workflow Stages

Deliver:

```text
Workflow controller
four Stage types
text|none Stage result
predefined transitions
Stage completion barrier
Stage-local computation environment
```

Checkpoint:

- `LLM → RAG Effect → collect → next Stage` works without making retrieval or LLM calls child Executions;
- local retrieval over an already-exposed read-only corpus can remain ordinary Stage computation;
- a live external retrieval uses the Effect/resource gateway;
- undefined transition is rejected;
- Effects required for Stage completion are correlated without treating the Stage as their owner.

### Slice D — Agent Execution

Deliver:

```text
Agent executor contract
model-directed loop
Effects/Event observations
Agent-loop Adapters
```

Checkpoint:

- the Agent can choose repeated retrieval/tool operations and stop;
- Workflow with two predetermined LLM calls remains Workflow behavior.

### Slice E — Recursive composition

Deliver:

```text
spawn
call
child authority derivation
child memory/context visibility derivation
child terminal result Event
Agent Stage / Workflow Stage
```

Checkpoint:

- Workflow → Agent → Workflow composition preserves identity and authority boundaries;
- Stage does not transition before required child result settles;
- child note visibility follows explicit delegation rather than ownership ancestry;
- child authority cannot exceed the creator's delegable envelope.

### Slice F — Memory

Deliver:

```text
Structured Memory views/provenance
Artifacts
Working Note frames + visibility/delegation filter
Stage no-pass default
```

Checkpoint:

- child receives only delegated parent notes, reads them as inherited context, and writes only its own frame;
- a child lacking access to confidential resource A does not receive A-derived parent scratch notes unless explicitly delegated by policy;
- parent does not see child scratch after return;
- explicit Structured Memory write remains visible where authorized.

### Slice G — Communication and human interaction

Deliver:

```text
send / ask
Message Event routing
RequestUserInput
mechanical confirmation
```

Checkpoint:

- peer messaging does not grant ownership/cancellation/memory access;
- knowing a peer ExecutionId does not permit direct runtime inspection;
- exact-payload confirmation invalidates when payload changes.

### Slice H — Security profile and execution environment

Deliver first:

```text
explicit trusted-local profile
ExecutionEnvironment/Sandbox port
no assumption that static analysis is containment
security-profile metadata/diagnostics
```

Then, when hostile uploaded code becomes a product requirement, add one reviewed isolated backend:

```text
deny-by-default ambient access
bounded CPU/memory/time/output/process use
scoped workspace/filesystem
scoped or disabled network
a controlled Effect/capability bridge
no raw production secrets in the sandbox
```

Checkpoint:

- the trusted-local profile remains lightweight and honest about its threat model;
- hostile code running under the isolated profile cannot read host secrets or directly reach an unexposed external resource;
- the same code can request an allowed operation through the Harness and receive the authorized result;
- denied operations do not cause external mutation.

### Slice I — durability

Deliver:

```text
persistent ExecutionContext/mailbox/pending operations
restart recovery
idempotent Effect dispatch boundaries
```

Checkpoint:

- WAITING Execution restarts and wakes correctly;
- a consequential Effect is not duplicated after crash/retry;
- pending Effects yielded because of the Activation wait budget retain their original operation deadline/correlation across restart.

---

## 19. Conformance scenarios

Before freezing APIs, make these executable tests/examples.

### 1. Simple RAG Workflow

```text
LLM Stage
  → retrieval Effect
  → collect
  → text
  → next LLM Stage
```

Tests Stage-local computation, Execution-attributed Effects, and simple composition.

### 2. Local-corpus RAG Stage

```text
read-only corpus already exposed
  → local query/rerank
  → LLM
  → Stage result
```

Tests that computation over already-exposed data does not require fake runtime Events/Effects.

### 3. Bounded multi-LLM Workflow Stage

```text
LLM → retrieve → LLM → result
```

Tests that multiple LLM calls do not imply Agent semantics.

### 4. Agentic research loop

```text
model decides search/query/inspect/stop repeatedly
```

Tests the actual Workflow/Agent distinction.

### 5. Workflow containing child Agent

Tests Agent Stage abstraction and Stage completion barrier.

### 6. Parent Agent with two child Agents

Tests child identity, narrowed authority, results, delegated Working Note visibility, and parallel pending work.

### 7. Long-lived Agent waiting for user input

Tests response ≠ completion, RequestUserInput, WAITING/READY, and restart.

### 8. Fast vs slow Effect

Run the same Effect under two latency regimes:

```text
fast → result observed in current Activation
slow → pending operation → WAITING → Event → later Activation
```

Tests that latency changes scheduling rather than Effect semantics, and that the inline wait budget is independent from the Effect deadline.

### 9. Peer Agents

Tests ownership ≠ communication, message correlation, and that message permission does not expose memory/cancellation rights.

### 10. Confirmation

Tests semantic authorization evidence versus exact mechanical confirmation.

### 11. Memory visibility and confidentiality

Tests Structured Memory views, Working Note frame behavior, and the rule that ancestry alone cannot reveal parent scratch information to a narrower child.

### 12. Hostile Stage code

Under the isolated hosted profile, attempt direct filesystem secret reads, unrestricted network access, raw resource access, and another Execution's workspace/state. These should fail even if static validation misses the code path. The same Stage should succeed when expressing an authorized external action through the Effect gateway.

### 13. Minimal runtime profile

Runs representative Workflow/Agent cases entirely in-process to verify that the architecture does not require heavyweight sandbox/durable/distributed infrastructure for trusted simple applications.

---

## 20. Coding-plan rule

When converting these docs into issues/tasks:

> **Plan around semantic and security invariants plus conformance scenarios, not around reproducing the class names in these documents.**

Before replacing an existing component, ask whether its responsibility already matches the target model. Preserve useful working code behind corrected interfaces where possible.

Do not combine the deepest semantic migration with unrelated package movement, provider replacement, or stylistic refactoring unless necessary.

For security mechanisms, prefer a small Arrokoth-owned interface around a reviewed existing backend over reimplementing mature isolation machinery merely for architectural purity. Reuse the mechanism; keep Arrokoth's authority and Execution semantics as the source of truth.

The target is not maximum abstraction. It is the smallest implementation that makes the mental model and stated security profile true and testable.
