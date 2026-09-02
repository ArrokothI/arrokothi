# Slice F.1 — Bounded Structured Memory Read into Agent Context

> **Status:** F.1 runtime implemented on `slice-f1-memory-read`, branched from `main` at
> `b56b631` (the PR #9 merge of Slice F.0). Not merged; awaiting independent review.
> **Scope:** an authorized, read-only Structured Memory snapshot resolved by the Harness and
> rendered into the reference Agent's model context. Reads only — model-directed `WriteMemory`
> exposure remains deferred (now F.1.1).
> **Canonical documentation change:** none.

This note records what the F.1 checkpoint became in code. It is an engineering record, not a new
owner of memory semantics. [`../memory.md`](../memory.md) and [`../authority.md`](../authority.md),
using the precedence map in [`../README.md`](../README.md), remain authoritative.

## 1. Baseline

Work began from `main` at:

```text
b56b631ae6eff60a0123b49215f6cd30c18d5dce
```

Its tree is identical to the accepted Slice F.0 branch tip `86bbc4d` (F.0 + F.0.1 + F.0.2). Before
modification the local baseline was green:

```text
npm test                         830 pass
npm run test:conformance         579 pass
npm run test:mcp                  68 pass
npm run test:evals               12 pass
npm run test:benchmark-subjects    8 pass
npm run typecheck                pass
```

After F.1:

```text
npm test                         844 pass   (+14)
npm run test:conformance         593 pass   (+14)
npm run test:mcp                  68 pass
npm run test:evals               12 pass    (unchanged: default wiring adds no read resolver)
npm run test:benchmark-subjects    8 pass
npm run typecheck                pass
```

These are local runs, not CI evidence.

## 2. What F.1 re-scoped

Doc [`018`](018-slice-f0-structured-memory-write-foundation.md) §8 recorded that F.0 adds **no**
memory contents to Agent context, and §13 sketched a "Future direction (F.1)" that was the
model-directed **write**-exposure chain (memory Active/Exposed View → projection → `WriteMemory`).

F.1 is now the **read** path instead:

```text
F.1  (this slice)                         F.1.1 (later, not started)
authorized Structured Memory              authorized memory operation interface
   ↓                                          ↓
read-only memory information view             Active/Exposed View
   ↓                                          ↓
context compilation                           Model Projection
   ↓                                          ↓
model reads memory                            WriteMemory Effect
```

The split is clean against the canonical docs, which already separate the two mechanisms:

- [`../memory.md`](../memory.md) §13: "context compiler chooses information … does NOT choose
  operation exposure"; §12: `model context ⊆ information selected from authorized memory/resource
  views`.
- [`../README.md`](../README.md) "Memory/context in one picture":
  `authorized memory/… → context compilation → current model context`.
- [`../authority.md`](../authority.md) §12: "may read resource ≠ may write resource" — read
  authority is separate from write authority.

So F.1 touches only the **information branch**. It adds no memory Active View, no projection
binding, and no Effect. `018` §13's write-exposure chain is renumbered **F.1.1** and is not begun
here.

## 3. Canonical invariants applied

```text
memory != context
information selection != operation projection
read authority != write authority (independent grants)
no ReadMemory Effect — a read never crosses the Effect gateway
context compilation is pure information selection
the Harness authorizes; the controller selects
child does not inherit a parent's memory view
a memory binding grants nothing
```

`WriteMemory` remains one of the existing five Effects. No `ReadMemory` or sixth Effect was added.
Read authorization is a distinct Harness dependency, evaluated deny-by-default before the bound
view is resolved.

## 4. The read snapshot — plain, controller-neutral data

`packages/core/src/execution/structured-memory-read.ts` is a dependency-free leaf
(`schema/value-schema.ts`, `util/json.ts`, and the F.0 `StructuredMemoryView` type only):

```ts
interface StructuredMemoryReadField {
  key: string; description?: string; schema: ValueSchema;
  value: JsonValue | undefined;   // undefined = declared but unset
  revision: number | undefined;   // committed revision for this field
}
interface StructuredMemoryReadView {
  memoryViewId: string; revision: number;               // whole-view revision at snapshot time
  fields: readonly StructuredMemoryReadField[];          // readable only, key-sorted
}
function projectStructuredMemoryReadView(
  view: StructuredMemoryView, readableKeys: ReadonlySet<string>,
): StructuredMemoryReadView   // pure and total
```

It mentions no Agent, Workflow, Stage, projection, or step. It is a value, not a handle: no id here
is looked up, there is no write path, and holding one grants nothing. A key named in `readableKeys`
that the view does not declare is silently ignored.

## 5. The read-authority seam

`packages/core/src/ports/structured-memory-read-view.ts`:

```ts
interface StructuredMemoryReadRequest { executionId: string; keys: readonly string[] }
interface StructuredMemoryReadViewResolver {
  resolve(r: StructuredMemoryReadRequest):
    Promise<StructuredMemoryReadView | null> | StructuredMemoryReadView | null;
}
const noStructuredMemoryRead   // resolve() => null — the fail-closed default
```

Deliberately **not** the `EffectAuthorizer`: a read is not an Effect and never becomes one. Read
authority and `WriteMemory` authority are independent — an Execution may hold one, both, or
neither. The request is Execution-scoped, not Agent-scoped.

`HarnessOptions.structuredMemoryReadView` holds it, alongside `authorizer` and `confirmationPolicy`.
Absent ⇒ `noStructuredMemoryRead` ⇒ **no memory ever reaches any controller context**. This is the
same fail-closed philosophy as the absent `authorizer` denying every Effect: "nobody wired memory
reads" and "this memory is readable" must not look the same.

The reference `createStructuredMemoryReadViewResolver({ store, grants })`
(`packages/core/src/reference/structured-memory-read-view-resolver.ts`) mirrors the F.0 write rule:

```ts
type StructuredMemoryReadGrantRule = boolean | { readableKeys: readonly string[] };
```

with optional `executions` scoping. Ordering matches F.0's deny-before-view-resolution (`018` §5):
the grant is applied to `request.keys` first, and only if something survives is the bound view
read from the store. Like `createRuntimeOperationAuthoritySource`, the factory takes the store but
the resolver it returns only ever reads an Execution context and a Structured Memory view.

## 6. Harness resolution and delivery

`Harness.runController` resolves the snapshot before `buildActivationInput`:

```text
context.slots.memoryView == null   -> memory: null, no store read       (018 §10 no-cost path)
binding present, resolver present   -> read the bound view for its declared keys,
                                       resolver.resolve({ executionId, keys }) -> snapshot | null
```

`no-child-cost.test.ts` already pins that an Activation with no binding touches no Structured
Memory facet and never calls `readStructuredMemoryView`; that assertion still holds because the
`memoryView == null` branch returns before any store access.

The snapshot travels on **`ActivationInput.memory: StructuredMemoryReadView | null`** — a new
field, delivered to every controller.

### 6.1 `ActivationInput` grows from four fields to five — flagged for review

`tests/conformance/architecture/agent-boundaries.test.ts` asserted "ActivationInput is still
exactly four fields and function-free", with the rationale that Slice D wanted "an authority
handle, an Active View, or a resolver in here" and got none.

`memory` is **not** that. It is a deep-frozen, structured-cloned value in the same category as
`events` and `definition` — delivered, already-authorized information with no functions and no
route to runtime state. The resolver that produced it stays a Harness dependency and must not
appear in `ports/controller.ts`.

The architecture test is updated: "exactly five fields", the function-free / no-operational-handle
assertions are kept, `StructuredMemoryReadViewResolver` is **added** to the names forbidden in
`ports/controller.ts`, and `ExecutionView` still exposes no `slots`. `controller-boundary.test.ts`
and `effect-gateway.test.ts` field-list assertions were updated the same way, each with a one-line
rationale. This is the single change most worth an independent look.

## 7. The information branch renders it (Agent, reference compiler)

`AgentInformationInput` gains `memory: StructuredMemoryReadView | null`. The reference
`compileAgentInformation` renders a readable snapshot as a standing-context block **appended to
`system`** (not a windowed message, so the message-window trim can't drop it):

```text
<instructions verbatim>

# Structured Memory
Explicitly asserted application state, current as of memory revision <r>.
- profile — <description>: {"name":"Ada"}
- count — <description>: (not set)
```

Fields in the snapshot's key order; committed value as compact JSON; declared-but-unset shown as
`(not set)` so the model knows the field exists. An empty snapshot (`null`, or no readable fields)
⇒ `system` is exactly `instructions`, byte-for-byte as before F.1.

`compileAgentInformation` stays pure and total. The controller compiles `invocation.information`
**once** and persists it in `AgentInvocationState.information` (`{ system, messages }`), replaying
it verbatim on re-entry. So:

- a suspended model step keeps the exact snapshot it was issued;
- a value committed while a step is outstanding is folded into the **next** step, whose fresh
  compile sees it — consistent with the existing frozen-invocation rule;
- **no `AGENT_CONTROL_STATE_VERSION` bump** — the persisted shape is unchanged, `system` merely
  carries more text, and `agentInformationSelectionId` (content-derived) reflects the difference.

The architecture test that walks `controllers/agent/information.ts` for forbidden operation
machinery still passes: the module's new dependency, `execution/structured-memory-read.ts`, is a
pure leaf.

## 8. Controller-neutral seam; Agent-only consumer

The snapshot type, the port, and the resolver carry no controller concept, and the Harness
delivers `ActivationInput.memory` to **every** controller. In F.1 the Workflow controller receives
it and ignores it. A conformance test captures a Workflow Execution's `ActivationInput.memory` and
asserts it is the same populated `StructuredMemoryReadView` an Agent would get.

A later F checkpoint injects the same snapshot into Workflow LLM Stages, Function Stages, and
adapter context. That is additive: it needs no change to the resolver, the port, the Harness
resolution path, or `ActivationInput`. "Agent only" here is an implementation-scope decision, not
a memory-semantics restriction.

## 9. Conformance coverage

New `tests/conformance/memory/structured-memory-read.test.ts` (14 cases):

- `projectStructuredMemoryReadView`: committed value + revision, unset ⇒ undefined, off-view field
  dropped, unknown readable key ignored;
- resolver: deny-by-default returns `null` even with a committed value; per-key grant returns only
  that field; no-binding Execution ⇒ `null`; read grant and `WriteMemory` grant are independent
  (a read grant does not let a `write_memory` proposal through);
- Harness delivery: `ActivationInput.memory` is `null` with no binding and `null` with a binding
  but no resolver; a bound Execution with a read grant receives the snapshot, **Agent and Workflow
  alike**; the shared read modules name no controller concept;
- reference Agent compiler: no grant ⇒ `system` is exactly the instructions; a granted key + value
  render and an ungranted key is absent; declared-but-unset ⇒ `(not set)`; rendering is
  deterministic and a different value is a different `agentInformationSelectionId`; a value
  committed after step 1 reaches step 2 and never step 1's frozen context.

Updated: `agent-boundaries.test.ts`, `controller-boundary.test.ts`, `effect-gateway.test.ts`
(field-list + rationale), `v04-boundaries.test.ts` (new `testing/structured-memory.ts` helper
added to the owned set), `information-compiler.test.ts` (the new required `memory` input).

A test-only `seedStructuredMemory` helper (`packages/core/src/testing/structured-memory.ts`)
commits a value through the RuntimeStore facet and the pure `commitStructuredMemoryWrite`, so a
read test has a value to read without routing through a `WriteMemory` Effect. It is not a public
API and not a shortcut around the Effect path.

## 10. Explicit deferrals

F.1 intentionally does not implement:

```text
model-directed WriteMemory exposure / memory Active/Exposed View / memory operation interface  (F.1.1)
wiring the snapshot into Workflow LLM Stages, Function Stages, or adapters                      (later F)
a ReadMemory Effect (reads are context compilation, never an Effect)
Derived Semantic Memory, retrieval, ranking, summarisation, provenance selection
Working Notes, Artifacts
memory scope / principal / org ontology
cross-Execution memory reads
CAS / precondition read APIs
a policy-engine backend for read grants (reference allow-list only; the seam is in place)
```

No unresolved canonical contradiction was found. `../memory.md` §12–13 and `../authority.md` §12
already own the read path; no clarifying sentence was needed.
