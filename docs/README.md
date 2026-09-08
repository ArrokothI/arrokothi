# ArrokothI architecture

Start with [the mental model](mental-model.md). The canonical documents describe the target
architecture; current 0.8.x implementation remains behind it.

| Document | Sole detailed owner |
|---|---|
| [Mental model](mental-model.md) | Whole-system picture and vocabulary map |
| [Kernel](kernel.md) | Execution lifecycle, Activation/Outcome acceptance, Events/waits, Effects/authority, history and recovery semantics |
| [Execution](execution.md) | Runtime/Driver, Agent/Workflow, progress/checkpoint meaning, native tools/context/memory and integration fidelity |
| [Deployment](deployment.md) | Processes, physical trust/isolation, resources, protocol placement and operating profiles |

The Kernel owns acceptance and governance, the Runtime owns how work is done, and deployment owns
physical enforcement. A concept has one detailed owner; other documents link instead of redefining it.
Add a Kernel concept only when a demonstrated correctness obligation requires it. Opaque work still
needs an explicit recovery contract; opacity never establishes replay safety.

| Supporting material | Role |
|---|---|
| [Development](development/README.md) | Active roadmap, implemented baseline and evidence; not an alternative architecture |
| [Architecture review](development/004-architecture-review.md) | Decisions, migration consequences and pinned prior-art navigation |
| [Architecture strategy study](architecture-strategy-study/README.md) | Historical research/evidence that informed the redesign |
| [Research](research/README.md) | Conditional hypotheses, not a release checklist |
| [Agent engineering](agent-engineering/README.md) | Framework-neutral engineering guidance |
| [Guides](guides/README.md) | Implemented SDK/application behavior; distinguish it from the target |
| [Legacy mental model](mental-model-legacy/) | Preserved historical architecture, never edited to match the target |

Old root names such as `authority.md`, `composition.md`, `execution-runtime.md`, `memory.md`,
`interoperability.md`, `product-vision.md` and `security-guarantees.md` route to historical material.
They are not current concept owners. When sources disagree, the canonical owner decides target
meaning, development records what is implemented, and historical research/guides do not override either.
