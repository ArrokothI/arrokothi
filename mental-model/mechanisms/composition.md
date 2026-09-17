# Composing work inside a Runtime

[Agent, Workflow, Stage and local branch](../concepts/roles.md) are optional Runtime role concepts. They do not introduce Kernel schedulers or kind unions. A native Crew/Flow or ordinary code may supply this composition more simply.

**Status:** Optional Runtime design, R2. Foreign Runtimes keep their own composition. This is target specification, not shipped behavior.

This page is optional in a way the Kernel pages are not: nothing here is a Kernel guarantee, and a native framework that already composes work well should keep doing so. What it offers is the set of problems that reliably appear when work is broken into pieces inside one Execution — passing typed values between them, knowing when a piece is genuinely finished, running pieces concurrently and merging what they produce, and keeping their scratch state apart. The Kernel is present throughout only as a constraint: it accepts one writer's progress per Execution, and that does nothing to serialize whatever the branches are touching.

## Typed work and completion barriers

Pass local values directly between functions/nodes. A transform validates or changes values; its enclosing Runtime chooses retry/branch/failure. Keep Stage output distinct from computed terminal result. Across the Kernel protocol, use supported [JSON values](../concepts/values.md#boundary-value-and-root) or explicit application references, refusing unsupported values.

```text
extract → {claims, sourceRef} → validate → two local analyses
        → declared-order join → report reference
        → mediated publication → observed receipt → completion
```

No memory write, JSON-as-text convention or extra model call is needed just to transfer that object. Keep Stage completion barriers inside the Workflow: finish required local work, account for required action/[child](../concepts/operations.md#child-and-ownership) results, finish transforms and commit selected output before transition. A late callback cannot mutate a later Stage's assumptions. Nonblocking work needs an explicit continuation/result owner. A function returning is not evidence that every task it started has finished. That is the whole reason barriers are explicit: a Stage that fires off work and returns looks identical, from the outside, to one that waited for it.

Independent [Effects](../concepts/actions.md#effect) may share an Outcome. Dependent actions follow evidence in later [Activations](../concepts/core.md#activation). Native async work stays inside an unresolved Activation until yielding an Outcome; do not restore a Kernel `ControllerResumption` or ad-hoc second action API.

## Forks, joins and corrections

Branching is where local composition most often goes wrong, because concurrency inside a Runtime gets none of the protection the Kernel provides between Executions. The five steps below are ordered to keep each branch's inputs, workspace and results separate until an explicit merge brings them back together.

1. Capture immutable branch input and explicit read views at fork.
2. Give branches separate [progress](../concepts/state.md#progress), [scratch frames](../concepts/state.md#working-notes) and result slots. Qualify local proposal keys by branch and visit so loops/retries cannot collide.
3. Compute concurrently but serialize aggregate commits or use equivalent native ownership. Kernel single-writer acceptance does not serialize native shared mutation: it fences which attempt may write accepted progress, not which of two branches may write the same file or row.
4. Join required terminal results in declared order, including failures/conflicts.
5. Use an explicit merge/reducer or refuse conflicts before downstream work starts.

Result collection is not semantic synthesis: a join produces the set of what the branches returned, and deciding what that set means together is separate work somebody still has to do. Declared display order does not order external writes; use service preconditions. Reducers tolerate reordering only when their associativity/commutativity actually permits it. Side-effecting reducers need normal action contracts. Wait-all, cancel-siblings and partial-result policies are declared in advance; cancellation does not prove losing branches stopped.

When a correction arrives during computation, a native continuation binds its relevant input/state version and re-evaluates, discards, explicitly merges or restricts interleaving. Callback arrival order cannot decide which answer is current. This is [Driver fidelity](integration.md), even though Kernel progress remains single-writer.

## Notes, controls and packages

Two things travel between the pieces of a composition and should not be confused: results, which are the point, and scratch notes, which are a convenience. A third thing — a Skill — can bring in whole pieces from outside, which makes the question of what it is allowed to bring with it worth stating plainly.

Use explicit [handoff](state.md#notes-and-handoff) between scratch frames. Important data travels through results/state, not a hidden ever-growing ancestry notes stack. [Context construction](context.md) keeps local controls distinguishable from mediated operations, even under one provider tool namespace. Model-based transforms still cost money even when they perform no external business action.

A [Skill](../concepts/roles.md#skill-and-package) can load instructions into the current Runtime or invoke a composition through a function/child according to lifetime needs. Pin source/publisher/version, entry points, input/default bindings, requested operations/resources and supported Runtime/isolation requirements where used. These are preflight inputs, not grants; imported `allowed-tools` cannot widen [authority](authority.md). A package declaring what it wants is a request the deployment answers, never a self-service grant. Descriptions remain untrusted; scripts require the stated execution profile. Do not package credentials, local sessions or private memory.

Metadata-first/instructions-on-use/assets-on-demand loading is a context strategy. Exporting a composition-backed Skill to an instruction-only format must disclose lost semantics or expose a service. No universal Skill schema, registry or signing service is required for R2/S1.

## Reference Runtime acceptance

Maintain a supported build matrix: direct, helper-only, custom Runtime/host or unsupported. Preflight detects missing static bindings, not permission or all dynamic policy outcomes. Exercise stable public SDK imports in examples. R2 checks typed extraction/validation/child/join/results, stale branches, notes isolation and barriers. Quality experiments hold Kernel fixed and compare context, retrieval, planning and tool wording separately. Count failures, repeat native billing and evaluator cost; verify outcomes in the environment, not through model self-approval.

Richer joins, context IR and multi-agent strategy remain [future questions](../../docs/future-plan.md). Useful native implementations can replace unnecessary reference machinery.
