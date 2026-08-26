# Pre-merge design review

## Executive summary

The cleanup is internally coherent after the concrete fixes made during final review. One public
`AgentHarness`, a provider-neutral `AgentLoopEngine` boundary, and one authoritative
`CapabilityGateway` form a consistent control plane. The known in-loop Phase/context drift had a
local fix: both Reference and Strands now obtain an authoritative context immediately before each
model iteration, with focused regressions for Phase instructions, capability scope, trace ordering,
and single dispatch.

Two questions remain for the owner because they concern release policy and the interpretation of
the active research roadmap rather than implementation correctness.

## Findings requiring owner decision

### 1. Canonicalization is a breaking public and serialized-definition change at version 0.37.0

Current behavior:

- `TwoPassHarness`, `NativeAgentHarness`, their option types, and the provider-specific Claude
  package are no longer public.
- planning exports use `PreflightPlan` terminology instead of the removed `TurnPlan` aliases;
- serialized definitions accept only `execution.harness: "agentic" | "workflow"`;
- definitions containing `two_pass`, `native_agent`, or `claude_agent` fail validation;
- the workspace and packages still report `0.37.0`.

Durable session compatibility is different: `TurnPlanCreated`, its payload shape, and
`SessionState.turnPlan` remain stable, so the TypeScript terminology cleanup does not invalidate
old event streams.

Why this matters:

The cleanup is a reasonable pre-v1 canonicalization, but consumers need an explicit answer about
whether the branch is an in-place internal replacement, a breaking prerelease, or the start of
v0.4. Restoring every alias would weaken the stated cleanup goal, while saying nothing makes stored
definition failures surprising.

Evidence:

- `core/src/index.ts`
- `core/src/definition/types.ts`
- `core/src/definition/definition.ts#validateDefinition`
- `core/src/session/events.ts`
- `core/src/session/state.ts`
- root and workspace `package.json` files
- `docs/architecture.md#compatibility-boundary`

Options:

A. Keep the breaking canonical surface at `0.37.0` for this internal merge and require a concise
migration/release note before external publication.

B. Treat the merge as the first v0.4 prerelease and update versions plus release documentation in a
separate, explicit release change.

C. Restore temporary deprecated aliases and definition migration for one release, then remove them
at a declared boundary.

Recommendation:

Retain the canonical surface. Choose A for an internal-only merge or B if packages are published
from `main`; do not restore compatibility shims without evidence of an active consumer that needs
them. The current compatibility facts are documented, but the release label is an owner decision.

Impact:

- core architecture: low if the canonical surface remains;
- backward compatibility: high for source imports and stored AgentDefinitions;
- benchmark validity: none;
- roadmap: release/versioning only; no research conclusion changes;
- inference cost: none;
- implementation complexity: low for documentation/versioning, moderate for migration shims.

Suggested roadmap consequence:

Leave the active roadmap unchanged until release policy is chosen. Its v1.0 readiness list already
requires SemVer policy, serialization stability, and migration guidance.

### 2. The bounded `workflow` strategy needs an explicit relationship to the P03 evidence gate

Current behavior:

`AgentHarness({ strategy: "workflow" })` is public, and `AgentRuntime` uses it when no Harness is
injected. The retained minimal and estate examples exercise that bounded preflight/retrieval/
response coordinator. The cleanup absorbed the earlier two-pass behavior into the one public
Harness instead of introducing a node-graph/process runtime.

The active roadmap, however, lists “a workflow runtime” as out of scope for the v0.4 correctness
checkpoint and says P03 category-4 evidence is required before adding a minimal Workflow runtime.

Why this matters:

There are two reasonable readings. The current bounded coordinator may be historical baseline
behavior and not the proposed future Workflow runtime, or its public `workflow` name/default may
already cross the roadmap gate. Code cannot settle that research-language distinction.

Evidence:

- `core/src/harness/workflow.ts`
- `core/src/harness/agent-harness.ts`
- `core/src/runtime/runtime.ts`
- `README.md#current-architecture`
- `docs/architecture.md#execution-strategies`
- `docs/v0.4-roadmap.md`, especially the v0.4 out-of-scope list and P03 workflow gate

Options:

A. Retain the bounded strategy and explicitly define it as baseline/compatibility execution,
distinct from the prospective node-based Workflow runtime gated on P03.

B. Retain it but stop making it the runtime default; require applications to choose a strategy and
inject an engine for agentic execution.

C. Remove or hide it until P03 provides workflow evidence, accepting another breaking change and
reworking the retained examples and provider canary.

Recommendation:

Choose A unless the roadmap author intended “workflow runtime” to include the existing bounded
coordinator. It preserves tested baseline behavior without committing to the future node/process
architecture. The owner should then clarify that distinction in the roadmap or release notes in a
separate decision.

Impact:

- core architecture: medium because it defines the default execution posture;
- backward compatibility: medium to high for B or C, low for A;
- benchmark validity: none for the frozen run; prospective subject construction could be affected;
- roadmap: direct interpretation of the P03 workflow evidence gate;
- inference cost: potentially material because workflow and agentic paths have different call
  profiles;
- implementation complexity: low for A, moderate for B, high for C.

Suggested roadmap consequence:

Do not edit the roadmap during this merge. After owner review, clarify whether its future
“Workflow runtime” excludes or includes the retained bounded coordinator.
