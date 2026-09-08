# Detail design

This is the current implementation-oriented design beneath [Kernel](../kernel.md),
[Execution](../execution.md) and [Deployment](../deployment.md). Read [the mental model](../mental-model.md)
first. The top-level owners define meaning; each page below owns the detailed rules for its topic.
If they disagree, fix the conflict in the same change rather than maintaining competing contracts.

**All pages describe targets or optional designs, not newly implemented APIs.** Current 0.8.x behavior,
source/tests and migration gaps are in [development](../development/README.md). K0–K5, R1/R2, D1 and S1
remain the only active implementation sequence. More design depth does not add every documented
facility to 1.0. [Future plan](../future-plan.md) holds unresolved hypotheses and experiment gates.

## Design map

| Page | Detailed responsibility | Implementation connection |
|---|---|---|
| [Execution protocol](execution-protocol.md) | Identity, immutable exchanges, receipts, input acknowledgment, wait/timer races and completion checks | K0/K1; K2/K4 extensions |
| [Principals, authority and consent](authority-and-actions.md) | Authenticated facts, grants/delegation, disclosure, exact approval, revocation ordering | K0/K2/K4/K5 |
| [Action lifecycle and delivery](action-lifecycle.md) | Request disposition, attempts, outcome certainty, evidence revisions, result publication | K2/K3/K5 |
| [Recovery and compatibility](recovery-and-compatibility.md) | Native/Kernel crash windows, checkpoint pinning, re-execution, version migration/refusal | R1/K3/K5/S1 |
| [Children and communication](composition-and-communication.md) | Child obligations, finite lineage budgets, supervision, messages/replies and human waits | K4 |
| [Runtime composition](runtime-composition.md) | Agent/Workflow shared machinery, local Stages, typed values, barriers/joins, Skills | Optional R2 |
| [State and memory](memory-and-state.md) | Asserted/derived/scratch/artifact distinctions, views, promotion, concurrency and provenance | Optional R2; K2/K3/K5 boundaries |
| [Context and projections](context-and-projections.md) | Information selection, callable bindings, native context, cache/snapshot distinction, discovery | Optional R2; R1 fidelity |
| [Runtime integration](runtime-integration.md) | Per-Driver assurance, native identity/submit, tool bridges, pause semantics and fidelity | R1, K3, S1 |
| [Interoperability](interoperability.md) | Import/export, schema acceptance, MCP/A2A/service/task mappings and versioned refusal | Existing MCP regressions; demanded integrations |
| [Resources and isolation](resources-and-isolation.md) | Binding/attachment/cleanup, native writers, host limits, credentials and physical containment | R1/K3/K5; optional D1 |
| [Evidence and observability](evidence-and-observability.md) | Accepted facts vs traces, inspection, privacy/retention, attribution and reproducibility | K0 onward; benchmark E0–E6 |

## How to use this layer

For K1 implementation, start with protocol and its counterexamples. For an action gateway, read
authority → action lifecycle → recovery. For a native Driver, read integration → native recovery →
resources, adding protocol mapping only when needed. For an Agent/Workflow library, read Runtime
composition → state/memory → context. All paths use evidence/observability for the claimed guarantees.

Each page labels its owner, target/optional status and slice. Conceptual record shapes and algorithms
state obligations without freezing TypeScript types, storage layouts or mandatory services. A richer
record is justified where it prevents a concrete ambiguity; no requirement forces foreign Runtimes
to adopt the reference Runtime's memory, graph or package vocabulary.

Cross-repository links are source-inspection prior art, pinned in the
[detail-design review](../development/005-detail-design-review.md). They indicate mechanisms worth
learning from, not installed dependencies or passed upstream tests. Current design is self-contained:
future engineers do not need the legacy mental-model directory to recover intended semantics.
The review records retained, relocated and rejected legacy ideas by topic and source section.
