# Current authoring surface: what each stock surface can emit today

> **Application/developer guidance — not canonical architecture.**
> **Canonical owners:** [`../../composition.md`](../../composition.md) (what a Stage or Agent *is*)
> and [`../../execution-runtime.md`](../../execution-runtime.md) (the Effect vocabulary). This page
> owns neither; it records what the **current implementation** lets an author express.
> Verified against the baseline in
> [`../../development/002-implemented-kernel-baseline.md`](../../development/002-implemented-kernel-baseline.md).
> Precedence and the end-to-end procedure are in [`README.md`](README.md).

**Read this page before sketching a composition.** It answers one question:

> Given the semantic design I want, can this chosen stock ArrokothI authoring surface actually
> express it today?

The single most expensive mistake available here is designing against the kernel's vocabulary
instead of against your chosen surface. The design looks correct until `defineWorkflow` rejects it,
or until the controller simply never proposes the Effect.

```text
kernel semantic vocabulary
        ≠
stock application authoring surface
```

---

## 1. The emission matrix

The kernel understands a closed five-Effect vocabulary — `UseCapability`, `WriteMemory`,
`SpawnExecution`, `SendMessage`, `RequestUserInput`. No stock authoring surface can emit all five.
Verified against `packages/core/src/controllers/`, `workflow/spec.ts`, `ports/stage.ts`, and
`effects/types.ts`:

| Surface | UseCapability | WriteMemory | child call / spawn | SendMessage | RequestUserInput |
|---|---|---|---|---|---|
| generic `ExecutionController` port | yes | yes | yes | yes | yes |
| reference **Agent** controller | yes — model selects from the Active View | yes — model selects a declared write interface | **no** | **no** | **no** |
| **Function Stage** | yes — `StageCapabilityRequest` | yes — `StageMemoryWriteRequest` (optional `expectedRevision`) | **no** | **no** | **no** |
| **LLM Stage** | yes — only via declared `callables`, which resolve to a capability/operation | **no** | **no** | **no** | **no** |
| **Agent Stage** | no | no | **`call` only**, to a child Agent | **no** | **no** |
| **Workflow Stage** | no | no | **`call` only**, to a child Workflow | **no** | **no** |

Two further rows a builder needs just as much, because they are where a great deal of real
application logic belongs:

| Surface | What it adds |
|---|---|
| **host / application code** (trusted runtime entry points, not Effects) | `createExecution`, `deliverExternalInput`, `submitUserInput`, `resolveConfirmation`, `settleEffect`, `cancelExecution`, and — the one most often missed — `structuredMemoryOf(executionId)` to **read** committed Structured Memory |
| **application-supplied ports** | `EffectAuthorizer`, `ConfirmationPolicy`, `CapabilityExecutor`, `FunctionStageRegistry`, `LocalResourceEnvironment` — ordinary application code, and where most deterministic gating actually lives |

---

## 2. Consequences worth stating explicitly

Each of these has bitten a real design.

- **An LLM Stage cannot write Structured Memory.** Its `callables` are capability operations. If a
  model-interpreted value must be retained, the LLM Stage returns it as its `StageResult` text and a
  following **Function Stage** parses it and requests the write.
- **No controller-side code can read Structured Memory.** `StageExecutionContext` has no memory
  handle, and `CapabilityExecutor` is given no store and no `ExecutionContext`, by design. Committed
  values reach only (a) an Agent's *model* information context via `spec.structuredMemory.read.keys`
  and (b) host code via `Harness.structuredMemoryOf`. Deterministic computation over committed state
  is therefore host work, or work over data reached through a resource view or capability. See
  [state and memory](state-memory-and-context.md).
- **A stock Workflow is not multi-turn.** It consumes `external.input` exactly once, before its
  first Activation, as the entry Stage's input; later application input is not consumed by the
  Workflow controller. A conversation across turns is **Agent** shape, or host orchestration that
  runs a fresh Workflow Execution per turn.
- **Human input and peer messaging are not authorable from a stock surface.** `RequestUserInput` and
  `SendMessage` are real kernel Effects with full runtime support — user-input requests with schema
  validation, `send`/`ask`/`reply` correlation — but no reference Agent or Stage proposes them.
  Reaching them today means host orchestration (`submitUserInput` answers a request that a custom or
  scripted controller made) or a custom controller.
- **Child calls are Stage-shaped only.** A stock Agent cannot spawn or call at all. A child call is
  expressible only as an Agent Stage or Workflow Stage of a Workflow, and only in `call` form.
- **Neither Agent Stage nor Workflow Stage hands off Working Notes**, and neither passes a child
  deadline. The Workflow controller builds its child `call` from the Stage definition alone.
- **A `spawn`/`call` child receives no Structured Memory view.** Only `createExecution` binds one.

Both of the last two, and the child return path they imply, are covered in
[composition](composition-children-and-concurrency.md).

---

## 3. When your requirement is not directly authorable

Work down this list. **Do not jump to a custom controller** — it is the last option, not the first.

1. **Directly authorable** on the chosen surface → use it.
2. **Another existing ArrokothI composition** expresses it → an Agent instead of a Workflow for
   multi-turn conversation; a Function Stage after an LLM Stage for a memory write; an Agent Stage
   for a bounded open-ended sub-problem.
3. **Host/application orchestration** → the host reads committed memory, applies an exact rule,
   creates or feeds an Execution, submits user input, or resolves a confirmation. This is a
   first-class, fully supported design, not a workaround.
4. **An application-supplied port** → put the rule in the `EffectAuthorizer`, `ConfirmationPolicy`,
   or the capability implementation, where it is deterministic and Harness-enforced.
5. **A custom controller** implementing `ExecutionController` → unlocks the full Effect vocabulary,
   and costs you every semantic guarantee the reference controllers give you for free. Reach for it
   only when 1–4 genuinely cannot express the requirement, and say so in your design notes.
6. **Not currently implemented** → record it and choose a different shape. Do not build it into the
   kernel; see the escalation rule in [`README.md`](README.md).

---

## 4. Import surface

**Application code imports from:**

```text
@arrokothi/core/execution    definitions, Harness, controllers, Execution/Effect vocabulary
@arrokothi/core/ports        the interfaces an application supplies or implements
@arrokothi/core/reference    dependency-free implementations of those ports
```

**The package root `@arrokothi/core` is a different, legacy surface.** It still carries the
Session/Flow/`AgentRuntime` API and exports a *different* `defineAgent` and a different type named
`AgentDefinition`. Importing it into Execution-kernel code produces a definition that will not run,
and the failure appears far from the import. `examples/minimal-agent/`, `examples/estate-like/`, and
both `examples/benchmark/` subjects target that legacy surface, so do not use them as models for
Execution-kernel code.

Be honest about the level you are working at: these exports are the current *explicit* kernel
surface, not a polished application-composition API. Assembling a Harness means naming a definition
store, runtime store, scheduler, controller registry, clock, id generator, authorizer, capability
catalog, capability executor, and — depending on the composition — model resolution, an Agent
executor, or the Function Stage and Adapter registries. That is expected; every one of those is a
real seam rather than ceremony. Whether the SDK should eventually offer an optional bootstrap layer
is tracked as an open question in [`../../future-plan.md`](../../future-plan.md) §14.1.

**A runnable minimal reference:**
[`examples/execution-kernel-minimal/`](../../../examples/execution-kernel-minimal/README.md) is a
deterministic, offline, key-free application assembled from exactly these surfaces, with one
authorized path and one deny-by-default path. `npm run example:execution-kernel` runs it;
`npm run test:example:execution-kernel` runs its tests. `scripts/workflow-scenario-canary.ts` shows
the same assembly for a Workflow, against a live model.

### Where `@arrokothi/core/testing` belongs

It is not forbidden — it is scoped:

```text
production / runtime application code
  → @arrokothi/core/execution, /ports, /reference only.
    createAgentTestHarness and friends assemble collaborators with test-shaped defaults;
    shipping them means your application's wiring is invisible and not yours to configure.

tests, deterministic prototypes, benchmark subjects, eval harnesses
  → @arrokothi/core/testing is appropriate and intended.
    ScriptedModelProvider, scripted capability executors, the harness builders, and the
    contract suites exist precisely so a deterministic offline subject is cheap to write.
```

A benchmark subject or eval harness built on `/testing` is using it correctly; that choice says
nothing about how the corresponding production application should be assembled.

---

## 5. Current-versus-future caveats that affect authoring

Do not design an application that assumes any of these.

| Concept | Status today |
|---|---|
| `Artifact/File` | canonical vocabulary, **no** port, store, Effect, or API — see [state and memory](state-memory-and-context.md) |
| Structured Memory scope beyond Execution-local | not implemented; cross-Execution sharing is application storage |
| Derived Semantic Memory supersession / currentness | no field on the claim record; policy lives outside it |
| progressive heterogeneous action discovery | roadmap tranche K; what exists is catalog → Active View → immutable projection |
| MCP beyond synchronous Tools | roadmap tranches I/J |
| hosted or isolated security profiles | roadmap tranche L; the trusted-local profile provides no containment |
| durable crash restart / recovery | roadmap tranche M; the reference runtime store is in memory |
| multi-Stage, nested, or looping fork branches; join reducers | rejected by validation — see [composition](composition-children-and-concurrency.md) |

Roadmap tranches are defined in
[`../../development/001-current-status-and-roadmap.md`](../../development/001-current-status-and-roadmap.md);
open SDK-surface questions are tracked in [`../../future-plan.md`](../../future-plan.md) §14.

---

## 6. Deny-by-default defaults are load-bearing

Several distinct misconfigurations all present as "nothing happened":

```text
no EffectAuthorizer            every Effect is denied
no operationAuthority          the Execution can expose nothing
no structuralSpawnBudget       the lineage can spawn nothing
unclassified catalog operation treated as consequential
```

Each default is correct — "nobody configured it" and "it was allowed" must never look the same — but
none of them is self-describing. When an assembly does nothing, check these before suspecting the
model. The runnable example demonstrates the first one deliberately.
