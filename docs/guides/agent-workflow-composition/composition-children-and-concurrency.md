# Composition: children, handoff, and concurrency

> **Application/developer guidance — not canonical architecture.**
> **Canonical owner:** [`../../composition.md`](../../composition.md), with runtime mechanics in
> [`../../execution-runtime.md`](../../execution-runtime.md), attenuation in
> [`../../authority.md`](../../authority.md), and memory visibility in
> [`../../memory.md`](../../memory.md).
> Precedence and the end-to-end procedure are in [`README.md`](README.md).

This page answers: does this work need its own Execution, how does anything get back from it, and
what can actually run in parallel.

Preserve:

```text
Stage            ≠ mini-Execution
Workflow branch  ≠ child Execution
delegation       ≠ another Execution
```

---

## 1. Not everything needs another Execution

```text
same-Execution composition   Stages, functions, LLM calls, Effects, Adapters
child Execution              spawn / call — independent identity, lifecycle, mailbox,
                             authority, memory views, budgets
peer interaction             send / ask / reply to an already-existing Execution
```

The test is not complexity. A 500-line function stays local. Introduce a child Execution when the
work needs **independent runtime identity**: its own authority envelope, its own lifecycle, its own
mailbox, separate cancellation, a separate context/memory view, or separate addressability.

> **Delegation does not require another Execution. Independent runtime identity does.**

A child Execution buys context isolation, independent authority, parallelism, and separate budgets.
It costs tokens, coordination, harder debugging, and more evaluation surface. Add one when you can
name which benefit you are buying, then make the delegation explicit — objective, scope, expected
output shape, available operations, budget, and what not to duplicate — as
[`../../agent-engineering/03-long-running-and-multi-agent.md`](../../agent-engineering/03-long-running-and-multi-agent.md)
describes.

**How a child call is authorable today:** only as an Agent Stage or Workflow Stage of a Workflow, and
only in `call` form. A stock Agent cannot spawn or call at all. See
[current authoring surface](current-authoring-surface.md).

---

## 2. Parent/child boundaries

Use `call` (`callExecution`) when the current semantic boundary depends on the child's terminal
result — the normal form for an Agent Stage or Workflow Stage. Use `spawn` (`spawnExecution`) only
for work whose completion the current boundary genuinely does not require; detached semantics remain
conservative in 0.8.x, so prefer `call` unless you can say what happens if the child never finishes.

What the boundary actually gives you:

- **Capability-operation attenuation.** `child capability-operation authority = requestedOperations ∩
  the parent's current effective operation authority ∩ policy`. A child cannot mint authority.
  Be precise about scope: an absent `requestedOperations` means **the child receives no
  capability-operation authority through this attenuation path** — it does not mean the child is
  inert. The child still has its own lifecycle, its own controller and local computation, its own
  mailbox, and whatever its Definition's spec asks its controller to do. Other powers — spawning,
  messaging, memory writes, user input — are governed by the `EffectAuthorizer` evaluating that
  child's Effects, which is a separate contract. `requestedOperations` is one narrowing lever, not
  the whole child security envelope.
- **Context isolation.** The child gets its own views. It **receives no Structured Memory view at
  all** — only `Harness.createExecution` binds one, and the spawn path does not — and it sees no
  parent Working Notes by ancestry.
- **Structural budget.** Autonomous spawning spends a lineage-scoped credit. `structuralSpawnBudget`
  omitted at root creation means the lineage can spawn nothing — "nobody granted spawn capacity" is
  not "unlimited". A descendant cannot enlarge it. Recursive definitions are legal; the budget, not
  acyclicity, is what bounds expansion.
- **Terminal-dependency abandonment**, and a `call` parent's PendingOperation settling as `cancelled`
  if the child is cancelled. Note what this is *not*: cancellation does not cascade, and no
  child-result deadline is configured — see
  [capabilities and authority](capabilities-effects-and-authority.md).

---

## 3. Working Notes handoff and the child return path

Distinguish the generic mechanism from what the stock Stage definitions actually expose.

**Generic kernel/controller capability.** A controller may build a `spawn`/`call` proposal carrying
`workingNotes`, normally selected with `selectWorkingNotesHandoff(frame, { keys })`. The Harness
envelope-checks the snapshot, policy may deny the concrete transfer, and the child receives an
immutable inherited snapshot plus its own independent writable frame.

**What Agent Stage and Workflow Stage expose.** Neither. An `AgentStageDefinition` /
`WorkflowStageDefinition` carries a `ChildDefinitionRef` and `requestedOperations`, and the Workflow
controller builds its child `call` from that alone — **no `workingNotes`, no child input beyond the
adapted Stage result, no deadline**. Handing off notes to a child today therefore requires a
controller that builds the proposal itself, which the stock Agent and Workflow controllers do not.

**The child return path, exactly as implemented.** For a stock Agent Stage or Workflow Stage the
**terminal result is the only built-in return route.** There is deliberately no automatic
child→parent Working Notes return, the child has no Structured Memory view to write into, and there
is no Artifact mechanism (see [state and memory](state-memory-and-context.md)). Anything else the
parent needs must come back either in that terminal result or through an **application-defined
external mechanism** — your own store, written by a capability the child is authorized to use and
read by the parent through a capability or by the host. Design that path explicitly; it will not
appear on its own.

These handoff ergonomics are an open SDK question tracked in
[`../../future-plan.md`](../../future-plan.md) §14.5.

---

## 4. Parallel Workflow branches — current limits

Implemented today: system-defined fork topology with **two or more branches**; each branch body is
**exactly one adapter-free Stage** of any of the four kinds; a branch Stage is reachable only through
its fork and transitions only to its own fork's join; and the join has **exactly one downstream
Function Stage**, which may not itself be a branch Stage.

The Function-Stage requirement is not incidental — the join snapshot is delivered to Function Stage
code (`StageExecutionContext.join`), so a non-Function join successor could not consume it and
validation rejects it.

Branch Effects, branch child calls, and branch model resumptions work, with branch-qualified
correlation. The join delivers each branch's final `text | none` result in **authored branch order**.

Explicitly **not** implemented — validation rejects these rather than half-supporting them:
multi-Stage branch subgraphs, nested or concurrent forks, branch loops, branch Adapters, branch
emissions, join reducers or automatic merge/retry, failure-driven sibling cancellation, and
branch-level Working Notes semantics.

**Shared state across branches:** a concurrent branch `WriteMemory` **must** carry `expectedRevision`
(an unversioned branch write fails before it reaches the Harness), and a stale one settles as
`conflicted` — an observation for that branch to handle, not an automatic retry or merge. Prefer
branch-local results merged deterministically by the downstream Function Stage after the join.

Parallelise when the branches are independent and the latency matters. Otherwise a sequence is easier
to reason about, cheaper, and easier to evaluate.

**A branch is not a child Execution.** Branch progress lives in the one Workflow Execution's
controller state; nothing is addressed to a branch and no lifecycle attaches to it.

---

## 5. Cross-Stage data flow

**A Stage result and a transition label are two different things.** Keep them separate; encoding
control into the data string is a bug waiting to happen.

```text
StageResult = string | null
  the DATA one Stage hands to the next. `null` means none — not "", not "unknown".

transition label
  a separate CONTROL selection. A Stage returns a label; the definition declares where each
  label goes. A label the Stage never declared is rejected, not routed.
```

A Function Stage returns both independently (`{ status: "completed", result, transition }`), and an
`always` Stage returns no label at all. Do not pack a routing decision into the result text and
re-parse it downstream — that turns a declared graph edge into a string convention, and the Workflow
stops describing its own control flow.

The result contract is intentionally the smallest useful edge value in the kernel, so structural
information travels elsewhere:

```text
Stage result           one small text handoff (or none)
transition label       one declared control choice
Structured Memory      asserted facts — writable from a Function Stage, but NOT readable by
                       Stage code; host code reads it
resource views         explicitly exposed read-only local materialisations, declared per Stage
application storage    large or structured work products, reached through a capability
                       (there is no Artifact mechanism)
```

Do not use Working Notes as a second data-flow system between Stages; there is no sequential-Stage
handoff policy today, and building one out of scratch state hides your Workflow's real dataflow.
