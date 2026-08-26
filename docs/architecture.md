# Architecture

The SDK has one public turn coordinator, `AgentHarness`, and one authorization boundary,
`CapabilityGateway`.

## Ownership

- `AgentDefinition` owns serializable application policy: model, memory, host context, knowledge,
  tools, limits, rules, and optional phases.
- `AgentRuntime` owns durable session loading, event append/replay, injected services, and turn
  concurrency.
- `AgentHarness` owns confirmation resolution, semantic preflight, phase coordination, compiled
  context, inner-loop delegation, and turn metrics.
- `AgentLoopEngine` owns only temporary observe/decide/delegate mechanics within an agentic turn.
- `CapabilityGateway` owns the dynamic capability catalog and revalidates every knowledge or action
  request against current runtime state.
- Tool executors own external I/O; their returned result is projected into authoritative events.

## Execution strategies

`AgentHarness({ strategy: "agentic", engine })` uses semantic preflight for state synchronization,
then delegates iterative mechanics to an `AgentLoopEngine`. `StrandsLoopEngine` is the production
adapter. `ReferenceLoopEngine` is a small provider-neutral implementation for deterministic tests
and offline development.

`AgentHarness({ strategy: "workflow" })` runs the bounded preflight/retrieval/response flow. It is
also the `AgentRuntime` default when no harness is injected.

Both strategies use the same memory, flow, authorization, confirmation, idempotency, durability,
and event contracts. No provider-specific agent harness is part of the public surface.

During an agentic turn, the Harness exposes a fresh authoritative `CompiledContext` immediately
before every model iteration. Engines pair that projection with the capability catalog for the same
current Phase. A Phase transition therefore cannot leave the next model call on old objectives or
instructions while offering a new capability envelope. `PhaseTransitioned`, followed by
`AgentIterationStarted.phaseId`, records the boundary durably; per-iteration compiled contexts are
also available to runtime observers.

## Compatibility boundary

The canonical public surface accepts only `execution.harness: "agentic" | "workflow"`. Serialized
definitions using the removed `two_pass`, `native_agent`, or `claude_agent` values fail definition
validation and must be migrated before import. The corresponding legacy Harness classes are not
exported.

Planning API type names now describe semantic Preflight, but durable session names remain stable:
the event discriminator is still `TurnPlanCreated`, and the projected state field is still
`turnPlan`. Existing event streams therefore do not depend on the TypeScript naming cleanup.

## Trust boundaries

Models may propose memory writes, retrievals, capabilities, and responses. Runtime code validates
those proposals. Host context declares lifecycle, visibility, and trust; tool-only/runtime-only data
does not enter model prompts. Consequential payloads are frozen at confirmation and checked again at
dispatch. See [durability](durability.md) for the external-execution checkpoints.
