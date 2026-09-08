# Composition and communication

This document preserves detailed composition rules under the current [`Kernel`](../kernel.md) / [`Execution`](../execution.md) boundary.

The Kernel manages independently addressable Executions. Agent/Workflow graph structure and local composition remain Runtime concerns unless they cross that boundary.

## Kernel side

### When composition creates an Execution

Create a child Execution when the child needs independent management such as:

- its own identity/address;
- independent lifecycle or cancellation;
- independently bounded authority;
- durable wait/recovery ownership;
- separately inspectable progress/result;
- communication that must survive the caller's current Activation.

Do not create an Execution merely because work is complex, asynchronous, model-driven, parallel, or implemented by another function/node.

| Local Runtime work | Child Execution |
|---|---|
| function/model/graph node | independently managed Agent/Workflow/job |
| internal retry/compaction | independently recoverable task |
| branch-local value | separately addressable result |
| same Runtime authority/lifecycle | separately delegated authority/lifecycle |

### Child creation

Child creation is a Kernel-mediated operation with stable identity/correlation. In a durable profile, accepted creation intent, authority/budget reservation, parent correlation, and resulting child identity must survive retry without duplicate ownership or duplicate budget consumption.

A child is a real Execution. Parent and child progress remain separate.

### Ownership and authority

Parent/child ownership is an operational relationship for causation, delegation, budgets, result routing, and cancellation policy. It does not imply:

- read access to private Runtime memory;
- ambient credential inheritance;
- peer impersonation;
- automatic cascade cancellation;
- authority wider than explicit attenuation.

### Messaging

Addressed communication is separate from ownership.

A message/request/reply uses stable sender/destination/correlation identities and is delivered as accepted Events. A request that expects a reply needs a real open correlation/ownership record; text that merely looks like a question does not create a Kernel wait.

Knowing a message or correlation ID does not grant permission to reply, settle an Effect, or inspect another Execution.

### Waits and joins

The Kernel provides bounded waits for Kernel-visible dependencies such as correlated Events, child results, human replies, Effect settlements, or deadlines.

General graph joins belong to the Runtime. For all-of behavior, the Runtime can retain already observed members in progress and wait on the remaining finite set.

Registering a wait and checking already accepted mailbox Events must not create a lost-wake window.

### Completion obligations

Completion is allowed only after work still owned by the Execution is settled, explicitly transferred to another durable owner, or explicitly abandoned under policy.

This preserves the useful part of the old Stage/effect barrier without requiring the Kernel to understand Stages.

Failure or cancellation may leave external actions `unknown`; their evidence remains inspectable after the Execution becomes terminal.

### Cancellation

Cancellation is ordered Kernel control, not an ordinary model message. It fences new accepted progress and new Effect admission after cancellation wins the acceptance race.

Child cancellation, peer-request abandonment, native process termination, and external compensation are separate policies/actions. A parent link does not imply all of them automatically.

### Structural budgets

Limits such as child depth/count can be useful to bound recursive expansion when the Kernel owns child creation. They are operational limits, not authority grants and not model-call budgets.

## Execution side

### Agent and Workflow

Agent and Workflow remain useful semantic authoring styles:

- **Agent:** progression is substantially chosen at runtime by a model/intelligent policy;
- **Workflow:** allowed progression/topology is primarily system-defined.

Both may share one Runtime implementation or substrate. The Kernel does not branch on these kinds.

### Stages and local nodes

ArrokothI's own Workflow Runtime may keep Stage/node abstractions for authoring. A Stage remains local Runtime composition unless it explicitly creates/calls a child Execution.

Useful local Stage kinds may include function, model, Agent call wrapper, Workflow call wrapper, validation/transform, or provider-native node. These are library choices, not Kernel vocabulary.

### Typed local dataflow

Local values should move directly between Runtime steps in structured form. Text is one value representation, not the universal edge contract.

A Stage/node result is not automatically the Execution's terminal result. The Runtime selects/validates the final result separately.

Large durable outputs may use application-owned artifact references rather than memory writes or prompt text.

### Parallel work

Parallel branches may overlap computation while Runtime state mutation remains controlled.

Prefer structured concurrency:

- branch-local progress/results;
- explicit join;
- deterministic/authored ordering where order matters;
- no uncontrolled concurrent mutation of shared Runtime state;
- explicit conflict/reducer semantics for shared external resources.

A complex branch does not become a child Execution until independent Kernel management is needed.

### Adapters/transforms

A Runtime-local Adapter/transform should remain local if it only maps/validates values. If it performs governed external work, it is no longer merely a transform and should use an Effect or another declared integration boundary.

### Skills/packages

A Skill/package is reusable instructions/code/resources/composition, not an Execution and not authority.

A Skill may declare requested/recommended operations or resources for composition/preflight. Those declarations do not grant them.

Foreign Runtime packages do not need to be translated into an ArrokothI Skill format unless a real portability use case justifies it.

### Native composition

Prefer a provider's own composition machinery when it is already good at the job:

- CrewAI Crew/Flow;
- Dify graph/application;
- Hermes delegation/context machinery;
- OpenClaw task/session/channel ownership.

The Driver should expose only the independently managed boundary that ArrokothI needs, rather than flattening every native node/worker into Kernel Executions.

## Preserve vs retire from the previous model

| Previous idea | Current treatment |
|---|---|
| Stage is different from Execution | Preserve |
| Child Execution for independent lifecycle/authority/addressability | Preserve and make provider-neutral |
| Ownership separate from communication | Preserve |
| Recursive child Executions | Preserve |
| Explicit waits/correlation | Preserve |
| Required-work barrier before terminal completion | Preserve narrowly as Execution-owned obligations |
| Agent vs Workflow distinction | Preserve as Runtime authoring semantics, not Kernel kind |
| Stage graph/barrier/join as Kernel semantics | Retire; Runtime-owned |
| Text/none universal Stage result | Retire |
| Local Adapter as effectful integration point | Retire; local transforms stay local, governed work crosses boundary |
| Skill as Kernel primitive | Retire; optional Runtime/package concept |

Current implementation evidence is indexed in [`../development/002-implemented-kernel-baseline.md`](../development/002-implemented-kernel-baseline.md). Historical composition detail remains in [`../mental-model-legacy/composition.md`](../mental-model-legacy/composition.md).
