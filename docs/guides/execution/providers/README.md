# Integrating external Execution Runtimes

**Whole-Runtime Driver tutorials are not implemented yet.** R1 will add a native job example,
its identity and input/result mapping, pause/resume behavior, recovery limits and native comparison.
K3 supplies the process-failure evidence needed for persistent support claims.

For implemented 0.8.x model, Strands step-executor, retrieval and MCP Tools adapters, use
[current wiring](current-wiring.md). Those integrations are not proof of whole-Runtime support for
CrewAI, Hermes, OpenClaw or Dify.

Design references: [Runtime integration](../../../detail-design/runtime-integration.md),
[recovery](../../../detail-design/recovery-and-compatibility.md), and
[interoperability](../../../detail-design/interoperability.md). Prefer the native Runtime's supported
API and preserve its context, tools, sessions and checkpoints. Before copying or adapting provider
code or adding dependencies, follow the repository's [reuse requirements](../../../../AGENTS.md#third-party-code-and-license-review).
