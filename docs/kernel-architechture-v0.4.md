# Kernel Architecture v0.4

> **Status: concise architecture guide for the v0.4 mental model.**
>
> This document is intentionally narrower than [`mental-model-v0.4.md`](mental-model-v0.4.md). The mental model defines the full semantics; [`mental-model-to-implementation-model.md`](mental-model-to-implementation-model.md) maps them to implementation. This document explains the architectural choices, their tradeoffs, and when each layer is worth adding.

## The architecture in one paragraph

Arrokoth is a durable execution kernel, not an agent framework. Its basic unit is an addressable **Execution** created from an **ExecutableDefinition**. Executions receive **Events**, request **Effects**, hold bounded authority and private state, and may either finish or wait for future work. The runtime sits between controller intent and the outside world: it authorizes effects, records durable truth, dispatches work, and turns results back into events. A **Workflow** uses this substrate when the application owns the semantic path; an **Agent** uses it when the model chooses the semantic path. Model providers, agent-loop libraries, retrieval systems, sandboxes, storage engines, and tool transports are replaceable implementations behind these semantics.

That is the core. Most of the architecture follows from refusing to create a second mechanism when the existing one is sufficient.

---

## 1. Start with the smallest useful unit: an Execution

The first useful distinction is between a reusable definition and one running instance.

```text
ExecutableDefinition
        │ instantiate
        ▼
     Execution
```

A definition describes what may run. An Execution is the durable runtime identity: it has lifecycle, authority, state, memory bindings, pending work, and trace identity.

This is more general than `input -> output` without making simple work complicated. A function or LLM call can be a short-lived Execution. A chat Agent or monitoring Workflow can be a long-lived Execution that spends most of its life waiting.

In practice, this separation pays off when the same logical component must be instantiated many times, resumed after failure, addressed by another component, or given different budgets and authority per instance.

### When to use this

- The work needs identity beyond one function call.
- Instances need independent state, authority, lifecycle, or tracing.
- Work may pause and resume later.
- Another Execution may need to send it a message or wait for its result.

### When not to use this

Do not persist a heavyweight Execution record for every trivial local helper if there is no semantic value in doing so. The kernel may optimize finite internal leaves as long as their behavior remains reconstructable where conformance, accounting, or tracing requires it.

**Tradeoff:** durable identity adds storage, scheduling, and bookkeeping cost. Use it where identity matters; do not confuse the semantic model with a requirement to make every operation operationally expensive.

---

## 2. Keep one boundary between intent and reality: Events and Effects

The most important runtime boundary is simple:

```text
Event
  ↓
controller
  ↓
EffectRequest
  ↓
runtime
  ↓
environment
  ↓
Event
```

An **Event** is something the Execution observes. An **Effect** is something the controller asks the runtime to do.

The v0.4 effect vocabulary should remain small:

```text
UseCapability
SpawnExecution
SendMessage
WriteMemory
```

This matters because agent systems become difficult to reason about when tools, retrieval, subagents, memory, approvals, and asynchronous jobs each invent their own control path. A small effect vocabulary gives one place to apply authorization, validation, idempotency, correlation, persistence, and tracing.

The runtime should also remain the source of external truth. A model may request that an email be sent; only the executor or environment can establish that it was sent. A model may request search; the returned search result becomes an Event. A failed API call should normally become a failure Event before the containing Execution is declared failed.

### When to use this

- The operation touches external state or another Execution.
- The operation needs authorization, retry, timeout, or audit semantics.
- The result must survive process failure or be correlated with later work.

### When not to use this

Do not route pure in-memory calculations through an external effect pipeline when no policy or durability boundary is involved. Local controller computation can stay local.

**Tradeoff:** an explicit effect boundary introduces indirection and sometimes latency. The return is reliability: effects can be denied, retried safely, traced, and recovered without asking the model what happened.

---

## 3. Add durability only where time becomes part of the problem

Long-lived does not mean continuously running. An Execution should wake only when there is work to process.

```text
CREATED -> READY -> RUNNING -> WAITING
                    │
                    ├-> COMPLETED
                    ├-> FAILED
                    └-> CANCELLED
```

An **Activation** is one period of controller work. When no runnable work remains, the Execution becomes `WAITING`. A later Event moves it back toward `READY`.

This model avoids a common implementation mistake: representing a long-running Agent as one process, container, or loop that must remain alive. Durable identity should live outside transient compute.

For recovery, the runtime needs enough durable state to reconstruct important transitions: incoming Events, requested Effects, dispatch checkpoints, results, memory commits, pending operations, lifecycle changes, and terminal outcomes.

### When to use this

- Human approval, timers, remote jobs, or peer replies may take seconds to days.
- A process restart must not lose progress.
- The work may span many model context windows.
- External side effects must not be duplicated on retry.

### When not to use this

For a single request that finishes within one process and has no consequential side effects, a durable scheduler may be unnecessary. Keep the same semantics, but use an in-memory implementation.

**Tradeoff:** durability increases write volume and recovery complexity. It should protect meaningful state transitions, not turn every token or internal thought into an event-sourcing project.

---

## 4. Treat tools, retrieval, and sandboxes as capabilities

A tool usually does not need its own execution model. Search, MCP servers, browsers, databases, knowledge systems, and sandboxes are normally **Capabilities** used by an Execution.

```text
Execution
   │ UseCapability
   ▼
CapabilityGateway
   │ validate / authorize / dispatch
   ▼
implementation adapter
```

This keeps the kernel focused on stable semantics while allowing implementations to change. An MCP server can replace a native tool adapter. LangChain can be replaced by a custom retriever. A local sandbox can be replaced by a remote one. Those changes should not alter what an Execution or Agent means.

A capability should become a separate Executable only when it actually needs independent identity, lifecycle, authority, state, mailbox, or supervision.

### When to use this

Use a Capability when the component is primarily a service invoked by an Execution and the caller owns the conversational or workflow state.

Examples:

- search
- retrieval
- filesystem access
- browser/computer use
- database queries
- MCP or HTTP tools
- sandbox execution

### When not to use this

Do not create a child Agent or Workflow merely to wrap a stateless tool. Separate Executions add scheduling, context, failure, and cost surfaces.

**Tradeoff:** a Capability is cheaper and easier to operate, but has less independent autonomy. Promote it to an Executable only when that independence is useful.

---

## 5. Separate authority from what the model currently sees

A recurring production problem is mixing permission with prompt construction. They are different concerns.

```text
Capability Catalog
        ↓
Authority Envelope
        ↓
Active Capability View
```

The **Authority Envelope** is the hard maximum: what this Execution may ever access or do. The **Active Capability View** is the smaller set currently exposed to its controller or model.

```text
Active Capability View ⊆ Authority Envelope
```

This gives two useful properties at once:

1. Large systems can authorize many resources without placing all of them in every prompt.
2. Context selection cannot silently become privilege escalation.

Child authority should be narrowed from owner authority rather than created from model requests:

```text
child authority
=
owner authority
∩ child requested authority
∩ runtime/application policy
```

### When to use this

- The model can access consequential tools or private data.
- The authorized resource set is much larger than one context window should expose.
- Child Agents or Workflows receive delegated authority.
- Capabilities are discovered dynamically.

### When not to use this

If an application has three harmless tools and no multi-tenant or consequential access, elaborate capability discovery is unnecessary. A static Active View may be enough.

**Tradeoff:** fine-grained authority improves containment and auditability but raises policy complexity. Start with a small explicit envelope; add dynamic discovery only when scale requires it.

---

## 6. Keep durable memory separate from model context

Memory answers: **what does the Execution retain?**

Context answers: **what does this Activation show the model?**

They should not be the same data structure.

```text
Execution state / memory / Events / authorized resources
                         ↓
                  ContextCompiler
                         ↓
                  model context
```

Useful memory forms are deliberately ordinary:

- **Structured memory** for schema-validated application state.
- **Working notes** for inspectable, advisory Agent-owned state.
- **Artifacts/files** for larger persistent work products.

Private memory should remain private unless an explicit shared resource is bound to multiple Executions. Messaging does not imply shared memory.

This distinction is especially important for long-running work. The durable record should preserve recoverable truth; the ContextCompiler may summarize, rank, trim, retrieve, or pack only what the current Activation needs.

### When to use this

- Work spans multiple Activations or context windows.
- Some state is authoritative while other state is advisory.
- Context size needs active management.
- Multiple Agents require independent contexts.

### When not to use this

For a one-shot call, explicit memory infrastructure may add no value. Passing the required input directly is simpler.

**Tradeoff:** persistent memory improves continuity but creates stale-state and provenance problems. Prefer small typed state and explicit artifacts over an unbounded opaque memory layer.

---

## 7. Use a Workflow when the path is known

A Workflow is appropriate when the application owns the allowed semantic topology.

```text
collect -> analyze -> validate -> publish
             │
             └-> collect more
```

A stage may invoke a function, LLM, Agent, or another Workflow. A transition may even use an LLM to choose among predefined edges. It is still a Workflow because the application defined the possible paths.

This is usually the preferred architecture when the process can be stated explicitly. Predictable topology makes latency, cost, testing, and failure handling easier to bound.

### When to use this

- The major steps are known in advance.
- Compliance or business rules constrain valid transitions.
- Reproducibility and debuggability matter more than open-ended autonomy.
- Different stages benefit from different models, tools, or validation rules.

### When not to use this

Do not encode a large pseudo-workflow whose only purpose is to approximate every decision an Agent might make. If the valid next step is inherently open-ended, the workflow graph becomes brittle and expensive to maintain.

**Tradeoff:** Workflows improve predictability and usually reduce cost, but they require the developer to anticipate the useful topology.

---

## 8. Use an Agent only when the model needs to choose the path

An Agent uses the same Execution substrate, but the model owns the semantic next step inside hard runtime limits.

```text
model proposes action
        ↓
runtime validates
        ↓
world acts
        ↓
Event returns
        ↓
model chooses again
```

This distinction is intentionally narrow. An Agent is not defined by tool use, number of model calls, memory, loops, or long duration. A Workflow may have all of those. The difference is who chooses what happens next.

Agents are useful for tasks where decomposition is difficult to predict: coding across an unfamiliar repository, exploratory research, troubleshooting, or interacting with changing environments.

They also cost more. More model turns increase latency and spend; more autonomous decisions increase the surface for compounding error. Use environment feedback, budgets, deadlines, and sandboxing where appropriate.

### When to use this

- The required sequence of steps cannot be known reliably in advance.
- The environment provides feedback the model can use to correct itself.
- Success can be checked with tests, validators, or human review.
- The value of flexibility justifies additional latency and cost.

### When not to use this

Do not use an Agent when a single model call, retrieval-augmented call, or small Workflow solves the task reliably. Adding an autonomous loop to a deterministic problem usually makes it slower, more expensive, and harder to debug.

**Tradeoff:** Agents buy flexibility by spending predictability, latency, and cost.

---

## 9. Compose with `spawn`, `call`, `send`, and `ask` before adding new abstractions

Once Executions are addressable, most higher-level orchestration reduces to four operations:

```text
spawn(definition)       -> new Execution handle
call(definition, input) -> spawn + wait for terminal result
send(handle, message)   -> deliver and continue
ask(handle, message)    -> send + correlation + wait for reply
```

This is enough for subagents, evaluator loops, Agent meetings, recursive Workflows, and many orchestrator-worker patterns.

Two graphs must remain separate:

```text
Ownership tree       Communication graph

Workflow W           Agent A <-> Agent B
├── Agent A               \       /
├── Agent B                Agent C
└── Agent C
```

Ownership controls authority derivation, budgets, cancellation, and supervision. Communication controls who may talk to whom. Messaging another Execution should not grant the right to cancel it or inspect its private memory.

### When to use this

- Independent tasks benefit from separate state or context.
- A component needs its own lifecycle or budget.
- Parallel work can reduce end-to-end latency.
- Different Agents need to critique or query one another without sharing full context.

### When not to use this

Do not introduce multiple Agents merely for conceptual neatness. If the work shares one state, one authority boundary, and one decision process, one Agent with good tools is usually easier to operate.

**Tradeoff:** multi-Execution composition can improve isolation and parallelism, but adds model calls, coordination latency, message failure modes, and harder evaluation.

---

## 10. Keep the kernel smaller than the ecosystem around it

The kernel should own semantics that must remain stable across implementations:

```text
Definitions and Executions
lifecycle and Activations
Events and Effects
ownership and communication
Authority Envelope and Active View
memory visibility and provenance rules
pending operations
idempotency and durable truth
Workflow and Agent controller contracts
```

It should not own every mechanism used to implement those semantics.

```text
Kernel contract             Replaceable implementation
-------------------------   ----------------------------
Agent execution             Strands / reference / future adapter
Model inference             Gemini / OpenAI-compatible / local
Knowledge retrieval         LangChain / custom / other
Tool transport              native / MCP / HTTP
Persistence                 memory / SQLite / Postgres
Sandbox                     local / Docker / remote
Observability               Arrokoth trace -> OTel / other sink
```

This boundary is important because model and framework assumptions age quickly. A useful architectural test is:

> If this implementation disappeared, could another implementation satisfy the same kernel contract without changing the application's conceptual model?

If the answer is yes, the boundary is probably in the right place.

### When to add another kernel abstraction

Add one only when multiple implementations need to agree on a semantic invariant that applications depend on.

### When not to add one

Do not promote a library feature, provider option, retrieval strategy, prompt pattern, or SDK-specific object into the kernel simply because the current implementation uses it.

**Tradeoff:** narrow interfaces may expose less convenience than framework-native APIs. The benefit is that applications are not coupled to assumptions that may become obsolete.

---

## 11. A practical complexity ladder

The default should be to stop at the lowest layer that meets the requirement.

```text
1. Single model/function call
   cheapest, lowest latency, easiest to test

2. Call + capabilities/retrieval
   add external information or action without adding orchestration

3. Workflow
   add explicit multi-step control when the path is known

4. Durable Execution
   add waiting/recovery when time and failure matter

5. Agent
   add model-owned control flow when the path is not predictable

6. Multiple Executions / Agents
   add isolation, parallelism, specialization, or independent context
```

Moving down the list generally increases capability, but also increases cost, latency, state, and failure modes. Complexity should be justified by measured improvement, not by architectural preference.

---

## 12. What v0.4 should optimize for

The current repository is still migrating from an earlier Agent SDK model. The near-term goal should not be to add more orchestration features. It should be to make the execution substrate coherent enough that future features do not require new semantics.

The important v0.4 invariants are:

- Definition and Execution are separate.
- An Execution may be finite or long-lived.
- Ordinary Agent responses do not imply completion.
- Waiting is scheduler state, not a model action.
- External work crosses an Effect boundary and returns as Events.
- Authority is immutable for an Execution and child authority is narrowed.
- Active capability exposure never exceeds authority.
- Memory, context, ownership, and communication remain separate concerns.
- Workflow topology is system-owned; Agent topology is model-owned.
- Concrete frameworks remain behind replaceable ports.

If these rules hold, later work—durable peer messaging, recursive composition, large capability catalogs, more storage adapters, or new Agent executors—can be added without changing the mental model.

---

# Appendix: Designing Effect and tool contracts for reliable Agents

Tool quality often matters more than adding another orchestration layer. The model should see an interface that is easy to choose correctly, while the runtime should see an interface that is safe to execute and recover.

A practical contract has four layers.

## A.1 Model-facing schema

Prefer a small, explicit input shape with names that match the domain.

Bad:

```json
{
  "action": "modify",
  "payload": "...",
  "options": {"mode": 3}
}
```

Better:

```json
{
  "repository": "owner/repo",
  "path": "docs/architecture.md",
  "content": "...",
  "expected_sha": "abc123"
}
```

The second shape gives the model fewer hidden conventions to infer and gives the runtime more information to validate.

## A.2 Runtime authorization

Before dispatch, validate mechanically:

```text
capability exists?
inside Authority Envelope?
arguments match schema?
resource scope allowed?
budget/deadline valid?
confirmation required?
```

Do not ask the model to enforce these rules on itself.

## A.3 Idempotency and concurrency

Consequential writes should carry an idempotency or compare-and-swap boundary where possible.

For example, file updates should include the expected current version/SHA. Payment-like effects should use an idempotency key. Message delivery should have stable event IDs or deduplication semantics.

The intended sequence is:

```text
Effect requested
      ↓
durable intent/checkpoint
      ↓
external dispatch
      ↓
durable result/failure
      ↓
Event delivered
```

This is the difference between retrying safely and guessing whether a side effect already happened.

## A.4 Failure as structured observation

Return failures in a form the controller can act on:

```json
{
  "type": "capability.failed",
  "operation": "update_file",
  "code": "VERSION_CONFLICT",
  "retryable": true,
  "message": "The file changed after it was read. Fetch the latest version before retrying."
}
```

This is more useful than a generic exception string. It gives an Agent enough ground truth to choose a sensible next action without granting it authority to reinterpret the failure as success.

The operational rule is simple: **make the model-facing interface easy to use, and make the runtime-facing interface hard to misuse.**

---

## Related documents

- [`mental-model-v0.4.md`](mental-model-v0.4.md) — canonical semantics
- [`mental-model-to-implementation-model.md`](mental-model-to-implementation-model.md) — implementation mapping
- [`future-plan.md`](future-plan.md) — migration sequence
- [`repository-structure-plan.md`](repository-structure-plan.md) — package and dependency ownership

External references that motivated the presentation style and several operational lessons:

- [Anthropic: Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- [Anthropic: Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Anthropic: Scaling Managed Agents: Decoupling the brain from the hands](https://www.anthropic.com/engineering/managed-agents)
