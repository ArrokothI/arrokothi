# ArrokothI Agent Kernel

ArrokothI is a provider-neutral execution kernel for Agents and Workflows with explicit authority,
memory, waiting, and composition. Workspace packages use the `@arrokothi/*` scope.

## Build an application

**Start with [the application builder guide](docs/guides/agent-workflow-composition/README.md).**
It takes ordinary product requirements through API choice, a runnable application, state, actions,
provider wiring, and testing. Coding agents enter through [AGENTS.md](AGENTS.md) and the
[builder skill](.agents/skills/arrokothi-agent-builder/SKILL.md); all routes lead to the same guide.

From this checkout, with Node 22.9+:

```sh
npm install
npm run example:execution-kernel
npm run example:application-patterns
npm run test:example:execution-kernel
npm run typecheck
```

These examples are offline and need no key. They run the real Harness/controllers against scripted
models and fake external systems. The [quick start](docs/guides/agent-workflow-composition/quick-start.md)
explains workspace setup, assembly and the host loop.

**New application code uses `@arrokothi/core`, `/ports`, and `/reference`.**
`@arrokothi/core/execution` is an equivalent focused entry point for the semantic API.
Current Gemini and Strands wiring is in
[the provider guide](docs/guides/agent-workflow-composition/providers-and-integrations.md).

## Current scope

An Execution is independently managed runtime identity. A Workflow declares semantic topology;
an Agent lets a model choose progression within configured bounds. Functions and LLM calls can stay
local to an Execution. Controllers propose Effects; the Harness authorizes and coordinates them;
executors/environment report what happened. Exposure does not grant authority, and a response is not
necessarily completion.

The experimental package line is **0.8.1**. It has real enforcement and conformance coverage, but not
an architecture-complete production deployment stack. In particular:

- Stock Agent/Stage authoring is narrower than the full Effect vocabulary.
- Structured Memory is Execution-local; Artifact/File has no current API.
- The Execution runtime store/scheduler are in memory; there is no crash-recovery adapter.
- Current security is trusted-local, not hosted hostile-code containment.
- MCP integration covers synchronous Tools; broader services/discovery remain future work.

Consult the [surface matrix](docs/guides/agent-workflow-composition/current-authoring-surface.md) and
[known builder concerns](docs/development/007-application-builder-ergonomics-findings.md) before making
application guarantees. Confirmed capability approvals now obey the same in-runtime `per_input`
duplicate/unresolved guard as direct dispatch, including concurrent approvals. Consequential external
systems still need durable application-owned idempotency and unknown-outcome reconciliation.

## Verify and diagnose

```sh
npm test                     # package tests and semantic conformance
npm run test:conformance      # semantic conformance only
npm run check:builder-docs    # builder links, anchors, public imports
npm run test:evals            # separate reference-Agent behavioral baseline
```

Runtime tests do not grade your application's model quality. Use your own deterministic world-state
tests and behavior cases. The [diagnosis guide](docs/guides/agent-workflow-composition/evaluation-and-diagnosis.md)
maps common symptoms to Harness evidence and likely configuration mistakes.

Copy [`.env.example`](.env.example) only for optional live provider work. `canary:gemini`,
`canary:workflow`, and `canary:mcp:gemini` require configured credentials; offline validation does not
establish live provider availability or quality.

## Framework development and architecture

[docs/README.md](docs/README.md) assigns canonical concept ownership. Start there when changing or
investigating kernel semantics, then read the owning document. [docs/development](docs/development/README.md)
records the implemented baseline, roadmap and engineering findings; it does not override architecture.
External engineering/research notes are background references rather than implementation promises.

| Directory | Role |
|---|---|
| `packages/core` | Current contracts, runtime, and reference mechanisms |
| `packages/agents/strands` | Strands Agent-executor adapter |
| `packages/models/gemini` | Gemini model-provider adapter |
| `packages/retrieval/local` | Local retrieval/resource/capability implementations |
| `packages/interoperability/mcp` | MCP Tool import/export boundary |
| `examples/execution-kernel-minimal` | Current public-surface application examples |
| `tests/conformance` | Semantic behavior and boundary tests |
| `docs/guides/agent-workflow-composition` | Single application builder guide |

Dependencies flow from applications to implementations/adapters to core-owned contracts. Provider and
protocol types stay at their boundaries; they do not define kernel semantics.
