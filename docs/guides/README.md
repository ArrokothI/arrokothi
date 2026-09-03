# Builder guides

Practical, procedural guidance for **building applications on ArrokothI**. These documents are
developer guidance, not canonical kernel architecture: they translate the canonical semantics
indexed by [`../README.md`](../README.md) into decision procedures an application author (human or
coding agent) can follow.

| Guide | Use it when |
|---|---|
| [`agent-workflow-composition/`](agent-workflow-composition/README.md) | turning an application specification into an Agent/Workflow composition. Its `README.md` is the front door: principles, the requirements mapping, the end-to-end procedure, and a router to seven topic pages — requirements and control, Workflow/Agent/Stage choice, the current authoring surface, state and memory, capabilities and authority, composition and concurrency, evaluation and diagnosis, plus worked examples |

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
