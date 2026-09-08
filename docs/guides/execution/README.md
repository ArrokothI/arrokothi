# Execution guide

An Execution Runtime performs the work behind the Kernel boundary. Target semantics are in
[Execution](../../execution.md); the Driver preserves the selected Runtime's native behavior.

| Topic | Start here |
|---|---|
| ArrokothI-native Agent | [Native guide](native/README.md), [control choice](native/workflow-agent-and-stages.md), [state/context](native/state-memory-and-context.md) |
| ArrokothI-native Workflow | [Stages](native/workflow-agent-and-stages.md), [current authoring surface](native/current-authoring-surface.md) |
| Native composition and applications | [Children/dataflow/concurrency](native/composition-children-and-concurrency.md), [worked examples](native/worked-examples.md) |
| Models, retrieval and current adapters | [Provider wiring](providers/current-wiring.md) |
| Other providers' whole Executions | [External Runtime integration](providers/README.md) — planned Driver tutorials |
| Quality and diagnosis | [Application evaluation](native/evaluation-and-diagnosis.md) |

The native pages document 0.8.x APIs, including their restrictions. They do not require external
Runtimes to adopt ArrokothI's Agent, Stage, memory or context vocabulary. R1/R2 tutorials will be added
alongside tested implementations. [SDK bootstrap](../deployment/quick-start.md) lives in deployment;
[governed action admission](../kernel/capabilities-effects-and-authority.md) lives in Kernel guidance.
