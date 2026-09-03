# Agent Effectiveness Seams Before Slice D Review

> **Status: development guidance for reviewing the v0.4 Agent slice.**
>
> This note does not redefine canonical architecture. Canonical semantics remain in `docs/mental-model.md`, `docs/execution-runtime.md`, `docs/composition.md`, `docs/authority.md`, `docs/memory.md`, `docs/interoperability.md`, and `docs/security-guarantees.md`.
>
> This note exists because ArrokothI's current architecture is deliberately strong on semantic correctness, runtime safety, authority, durability seams, and interoperability, while a different class of concerns determines whether an Agent is actually effective: ACI quality, observation shaping, context strategy, long-horizon scaffolding, verification/backpressure, and behavioral evaluation.

## 1. Do not turn effectiveness techniques into kernel semantics

The current kernel should remain stable around:

```text
Execution / Activation
Agent / Workflow
Event / Effect
Harness
PendingOperation / ControllerResumption
authority / delegation
memory epistemic forms
composition boundaries
portable interoperability
security profiles
```

Model- and task-dependent techniques such as compaction, progress files, planner/generator/evaluator loops, tool-search algorithms, prompt variants, and tool-result formatting should remain replaceable strategies unless repeated evidence demonstrates that they express a durable semantic requirement.

The desired relationship is:

```text
stable semantic/runtime boundaries
        ↓
replaceable Agent engineering strategies
        ↓
behavioral evaluation
        ↓
evidence-driven refinement
```

Do not promote a technique into canonical architecture merely because it improves one model family or benchmark.

---

## 2. Terminology: Arrokoth `Harness` vs external "agent harness"

ArrokothI uses **Harness** as a precise runtime term: the logical operational boundary that manages Executions, scheduling, lifecycle, Event delivery, Effect authorization/coordination, pending work, wake-up, budgets, cancellation/supervision, persistence/recovery, routing, and mechanical confirmation.

Some external literature uses **agent harness** more broadly for the entire scaffold around a model, often including:

```text
agent loop
prompt/context assembly
tool definitions and tool execution
state/history management
model-specific scaffolding
evaluation-oriented instrumentation
```

These meanings are not identical.

For ArrokothI discussions, read external "agent harness" approximately as:

```text
Arrokoth Harness
+ AgentController
+ AgentExecutor
+ information-context compilation
+ model operation projection / ACI
+ optional engineering strategies
```

**Decision for v0.4:** do not rename the canonical `Harness` merely to match external terminology. `Runtime` is already a broader and more ambiguous word in this codebase and in distributed-systems literature. If future usability testing shows the public term is persistently confusing, revisit naming before v1.0 as an explicit terminology/API migration, not as a mechanical search-and-replace during Slice D.

---

## 3. Slice D review must preserve four effectiveness seams

The active Slice D implementation should not be interrupted solely to implement these concerns. After the current implementation lands, review it against the following seams before treating Slice D as the stable v0.4 Agent baseline.

### 3.1 Model-facing observation/result projection

The architecture already has a strong model-facing **action** path:

```text
Catalog
  ↓
Effective Authority
  ↓
Active Operation View
  ↓
immutable Model Operation Projection
  ↓
model-selected call
  ↓
typed Effect proposal
```

The reverse direction also needs a replaceable model-facing boundary:

```text
Event / operation result / runtime observation
        ↓
model-facing observation projection
        ↓
AgentExecutor / provider request
```

The first implementation may be intentionally simple, but provider/framework adapters must not permanently own ad hoc result rendering.

The seam should allow later strategies such as:

```text
filtering
redaction
truncation
pagination
summarization
stable logical references
concise vs detailed modes
model-actionable error rendering
provider-specific formatting after semantic shaping
```

This projection does **not** change the semantic Event/result, does not grant authority, and does not create durable memory by itself.

A useful implementation test is:

> Can the same semantic capability result be projected differently for two model strategies without changing Effect/Event/runtime semantics or modifying the capability executor?

### 3.2 Evaluation-grade model invocation trace

ArrokothI already distinguishes semantic Events from audit/history/trace records. Preserve that distinction and add enough non-semantic instrumentation to reconstruct model behavior.

At minimum, the implementation should have a replaceable trace/observer seam capable of recording or referencing:

```text
Execution / Activation / controller revision
resolved model/deployment
information-context selection identity or digest
operation projection identity and bindings
model request metadata
model semantic output / operation calls
usage / latency / finish reason
normalized provider diagnostics/failure
resulting controller decision
causation/correlation identifiers
```

Raw provider payloads do not need to become persisted kernel state. Full rendered prompts need not always be retained in production. The requirement is that evaluation/debug deployments can reconstruct enough of the invocation boundary to compare strategies and inspect trajectories.

Do not turn model invocation results into semantic Events solely for observability.

### 3.3 Forward-compatible model action binding target

v0.4 Agent operation use is primarily:

```text
model call → capability operation → UseCapability
```

That is correct for the first Agent slice. However, the durable/invocation-local binding representation should not permanently encode the equation:

```text
model-visible action == capability operation
```

Canonical interoperability already allows a portable Operation to resolve, when appropriate, to capability use, memory write, child execution, messaging, user input, or local computation.

Prefer a binding concept that can evolve toward a typed target such as:

```text
binding
  id
  model-facing name
  target kind
  stable target ref
  projected schema/description
```

v0.4 may support only `capability_operation` as the concrete target kind. Do not add a universal action registry or expose all Effects as tools now. The goal is only to avoid a persisted snapshot shape that requires migration as soon as model-directed `SpawnExecution`, `SendMessage`, or another action family becomes useful.

### 3.4 Strategy-neutral information context compiler

The canonical distinction remains:

```text
memory / retained information != invocation context
information selection != operation exposure
```

The Slice D information-context API should therefore avoid freezing the assumption that context is simply one ever-growing chat-message array.

Leave room for inputs and policies such as:

```text
recent Events/messages
Structured Memory
retrieved Derived Semantic Memory
Working Notes
Artifact/resource excerpts
summaries/compaction
invocation purpose
model/context constraints
token budget
selection metadata
```

and for experiments that compare continuous history, compacted history, retrieval, note-taking, fresh-context workflows, and model-specific strategies.

The compiler remains an information-selection mechanism. It does not choose operation authority/exposure.

---

## 4. Behavioral evals begin with the first reference Agent

`tests/conformance/` answers:

> Does an implementation preserve ArrokothI semantics and forbidden boundaries?

A behavioral Agent eval answers a different question:

> Does this Agent configuration actually accomplish useful tasks well?

Do not wait until v0.9 to establish the second feedback loop.

The v0.4 baseline can be deliberately small: roughly 10-30 representative tasks, multiple trials for stochastic cases, deterministic fake environments where useful, and a few real-provider runs where cost permits.

Useful first metrics include:

```text
outcome/task success
correct operation selection
argument semantic correctness
unnecessary operation calls
recovery after operation failure or denial
operation-call count
model input/output tokens
latency
bounded-progression failures
final-result quality where an automatic or human grader exists
```

When possible, grade **environment outcome** rather than trusting the Agent's textual claim of success.

Keep:

```text
conformance suite != behavioral eval suite
Agent runtime/Harness != eval harness
trajectory/transcript != outcome
```

The first suite does not need a dashboard or a stable public API. It needs reproducible tasks, trace capture, repeatable trials, and enough metadata to compare changes to ACI/context/AgentExecutor strategies.

---

## 5. Review consequences for the current Slice D implementation

When the active D.0/D implementation completes, review it without assuming these seams require a rewrite.

Classify findings as:

```text
already adequate
  existing boundary can support the experiment unchanged

small additive seam
  add an interface/record/observer without changing semantics

local retrofit before D acceptance
  current implementation accidentally hard-codes a strategy in a place
  that later experiments would otherwise require expensive migration

future experiment only
  no current implementation change required
```

Specifically inspect:

```text
AgentExecutor input/output contract
AgentController progression state
information-context compiler output
Event/operation-result → provider observation conversion
ModelOperationProjection persisted snapshot/binding shape
provider/Strands adapter result rendering
model invocation metadata and trace hooks
reference Agent examples and tests
```

Do not reopen the accepted rules that:

```text
AgentExecutor does not dispatch Effects
Harness remains final Effect authorizer/coordinator
model invocation remains controller-local work
ModelOperationProjection is invocation-local integrity state
information context and operation projection are separate
MCP/provider/framework types stay outside kernel semantics
```

---

## 6. Effectiveness work belongs in experiments and reference strategies

Future experiments should preferentially live in reference/strategy packages, examples, evals, or development documents rather than expanding the kernel vocabulary.

Examples include:

```text
ACI/tool naming and descriptions
when-to-use / when-not-to-use guidance
few-shot tool-use examples
tool granularity and overlap
result/error shaping
progressive disclosure and tool search
context compaction
fresh-context handoff
structured progress notes
long-horizon progress protocols
planner / generator / evaluator compositions
subagent delegation strategies
verification/backpressure through tests, compilers, browsers, or evaluators
programmatic/code-mediated operation use
model-specific prompting/context policies
model-specific harness simplification
```

Use the same pattern repeatedly:

```text
hypothesis
  ↓
representative tasks + trials
  ↓
trajectory and outcome inspection
  ↓
measured change
  ↓
keep / revise / delete
```

The default outcome of a successful experiment is a better reference strategy or application pattern, **not** a new kernel primitive.
