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

## Trust boundaries

Models may propose memory writes, retrievals, capabilities, and responses. Runtime code validates
those proposals. Host context declares lifecycle, visibility, and trust; tool-only/runtime-only data
does not enter model prompts. Consequential payloads are frozen at confirmation and checked again at
dispatch. See [durability](durability.md) for the external-execution checkpoints.
