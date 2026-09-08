# Children, data flow, and concurrency

[Guide home](README.md). Canonical owners: [composition](../../composition.md),
[runtime](../../execution-runtime.md), [authority](../../authority.md), [memory](../../memory.md).

## Call a child when it needs independent runtime identity

Function/LLM calls and ordinary Stages remain in the enclosing Execution. A child has its own
lifecycle, mailbox, authority and controller progress. Complexity alone is not a reason to create one.
Stock child composition is an Agent or Workflow Stage: it creates and awaits exactly one child
`call`. The stock Agent cannot call/spawn. Detached spawn and peer `send`/`ask`/`reply` need an
application controller; knowing an Execution ID does not grant messaging rights.

A runnable child call is in [patterns.ts](../../../examples/execution-kernel-minimal/patterns.ts):

1. `await app.register(childDefinition)`; the SDK already registers both stock controller kinds.
2. Put `child: { definitionId, definitionVersion }` on the parent Stage. `ChildDefinitionRef` has
   only these two fields; the Harness resolves and pins the saved definition's integrity internally.
3. Allow spawn for that child definition in the host authorizer and give the root a
   `structuralSpawnBudget`. Omission means zero credits, including for Workflow-authored calls.
4. Request only the child's needed `requestedOperations`. The runtime intersects these with current
   parent authority; omitted means no delegated capability operations, not “no local computation”.
   Other powers are checked separately by the Effect authorizer.
5. The adapted incoming Stage result becomes the child's external start input. For an Agent child
   returning text, set `completion: 'complete_on_response'` **and** a string terminal schema.
6. Validate the returned text in the following Function Stage. The child's confident assertion is
   not proof of factual correctness or successful external action.

If a child returns an object, the stock child Stage rejects it: it accepts text/null. If a child emits
text but stays in `respond_and_wait`, the parent keeps waiting; a response is not a terminal result.
The [Agent Stage conformance tests](../../../tests/conformance/workflow/agent-stage.test.ts) cover
one child per call, text return, no-value return, failure, cancellation, and attenuation.

## State does not automatically travel

Children receive no Structured Memory binding. Stock child Stages have no Working Notes handoff
field; the generic spawn/call proposal supports an explicitly filtered handoff, but no automatic
child-to-parent notes return exists. Terminal result is the stock return route. For shared or large
results, design an application store with explicit write/read capabilities and an application job ID.
Host-created roots have no automatic parent/child attenuation or budget relationship.

| Value | Where it goes |
|---|---|
| Function `progress` | Same Stage visit after a wait, not the next Stage |
| Stage `result` | Next Stage input (`string \| null`) |
| Function `transition` | One declared control label, separate from result |
| Stage `emissions` | Enclosing Execution's output history, not terminal return |
| Child `terminalResult.value` | Child Stage output, if string/null |
| Workflow completion `terminal` | Authored literal value or none; no dynamic Stage-result selector |

The last row is a real limitation. A computed receipt emitted by the final Function Stage does not
become the Workflow's return value. If a host wants that output, consume the emission or an external
record. Do not claim that this gives a called parent the same result automatically. Consider a
same-Execution Stage sequence, a text-returning Agent child, or explicit application storage when a
reusable computed-return Workflow hits this limit. The canonical suggestion to pass structured data
via memory is also narrower in practice because Stages cannot read committed memory. Both issues are
recorded in [findings](../../development/003-evidence-and-findings.md).

## Parallel Workflow branches

A fork has at least two branches, each exactly one adapter-free Stage. Branches transition only to
their fork's join. The join successor must be a Function Stage; it receives `context.join.branches`
in **authored order**, not completion order. Its ordinary `input` remains the fork's incoming input.
A branch is controller state inside the Workflow, not an independent Execution.

No multi-Stage branch subgraphs, nested/concurrent forks, branch loops/adapters/emissions, join
reducers, or automatic failure-driven sibling cancellation. A branch may use a child Workflow Stage
for a longer sub-process, but first check the child's output and authority constraints above. Branch
Effects, child calls, and model resumptions are correlated independently.

Prefer pure branch results merged by the join. Concurrent branch memory writes require whole-view
`expectedRevision` and explicit `conflicted` handling; there is no automatic merge/retry. Use
[fork/join tests](../../../tests/conformance/workflow/parallel-fork-join.test.ts) and
[parallel memory tests](../../../tests/conformance/workflow/parallel-branch-structured-memory.test.ts)
for exact topology shapes.

## Liveness and cancellation

Child calls have no configured result deadline. The application owns any timeout. Cancelling the
parent does not cancel the child; cancelling a child settles its parent's dependency with a
cancellation-specific observation. Inspect `childExecutionLinksOf`, `pendingOperationsOf`, and
`waitForEdgesFrom` when work hangs. A wait graph cycle is diagnostic evidence, not an automatic
runtime deadlock-resolution mechanism.
