# ArrokothI architecture

Start with [the mental model](mental-model.md). The canonical documents describe the target architecture; current 0.8.x implementation remains behind it.

| Document | Sole detailed owner |
|---|---|
| [Mental model](mental-model.md) | Whole-system picture and vocabulary map |
| [Kernel](kernel.md) | Execution lifecycle, Activation/Outcome acceptance, Events/waits, Effects/authority, history and recovery semantics |
| [Execution](execution.md) | Runtime/Driver, Agent/Workflow, progress/checkpoint meaning, native tools/context/memory and integration fidelity |
| [Deployment](deployment.md) | Processes, physical trust/isolation, resources, protocol placement and operating profiles |

The Kernel owns acceptance and governance, the Runtime owns how work is done, and deployment owns physical enforcement. A concept has one canonical owner; other documents link instead of redefining it. Add a Kernel concept only when a demonstrated correctness obligation requires it. Opaque work still needs an explicit recovery contract; opacity never establishes replay safety.

## Detail design

[The detail-design map](detail-design/README.md) routes twelve focused pages: Execution protocol;
principals/authority/consent; action lifecycle/delivery; recovery/compatibility; children/communication;
Runtime composition; state/memory; context/projections; Runtime integration; interoperability;
resource lifetime/isolation; and evidence/observability.

These pages preserve implementation-useful semantics beneath the three owners. They distinguish
required boundary contracts from optional Runtime designs, name the relevant development slices,
and include counterexamples and practical prior-art links. They do not claim new implementation.
The [detail-design review](development/005-detail-design-review.md) records legacy knowledge disposition
and changes to the target contract. Current design is self-contained after removal of the legacy directory.

## Supporting material

| Supporting material | Role |
|---|---|
| [Development](development/README.md) | Active roadmap, implemented baseline and evidence; not an alternative architecture |
| [Architecture review](development/004-architecture-review.md) | Decisions, migration consequences and pinned prior-art navigation |
| [Future plan](future-plan.md) | Unresolved/evidence-gated work only; not the active roadmap |
| [Architecture strategy study](architecture-strategy-study/README.md) | Historical research/evidence that informed the redesign |
| [Research](research/README.md) | Conditional hypotheses, not a release checklist |
| [Guides](guides/README.md) | Implemented SDK/application behavior; distinguish it from the target |

The legacy mental-model directory and old root architecture files have been removed. Historical
versions remain in Git history; the [detail-design review](development/005-detail-design-review.md)
records the current homes of retained concepts. `agent-engineering/` was also retired: its reusable
principles are covered by detail design, future questions and the relevant implementation guides.

When sources disagree, the canonical owner decides target meaning; detail design expands that meaning without overriding it; development records what is implemented; historical research/guides/legacy material do not override current architecture.
