# Builder guides

Practical, procedural guidance for **building applications on ArrokothI**. These documents are
developer guidance, not canonical kernel architecture: they translate the canonical semantics
indexed by [`../README.md`](../README.md) into decision procedures an application author (human or
coding agent) can follow.

| Guide | Use it when |
|---|---|
| [`agent-workflow-composition.md`](agent-workflow-composition.md) | turning an application specification into an Agent/Workflow composition: Workflow vs Agent, Stage kinds, memory forms, context, capabilities, Effects, authority, budgets, and evaluation |

## Precedence

```text
canonical concept owner (docs/README.md table)
        ↓ overrides
development/ synthesis and roadmap
        ↓ overrides
guides/
```

A guide never owns a concept. When a guide and a canonical document disagree, the canonical
document wins and the guide is corrected. Guides may cite the framework-neutral external
engineering material in [`../agent-engineering/`](../agent-engineering/README.md), which is
likewise not ArrokothI architecture.
