# Slice F.2b Follow-up — Working Notes Retention vs Hot-Path Exposure

> **Status:** cross-cutting engineering follow-up recorded after independent F.2b review. Not canonical architecture.
>
> This note preserves a performance/layering discussion that must survive the Slice-G new-chat handoff. Canonical Working Notes and composition semantics remain in `../../memory.md` and `../../composition.md`; the implemented F.2b checkpoint is recorded in `022-slice-f2b-working-notes-explicit-handoff.md`; the broader efficiency plan is `014-v1-efficiency-and-developer-ergonomics-validation.md`.

## 1. Accepted semantic distinction

F.2b intentionally has two semantic artifacts for a child that receives an explicit Working Notes handoff:

```text
ExecutionContext.workingNotesHandoff
  immutable inherited snapshot of what crossed the child-Execution boundary

AgentControlState.workingNotes
  current child-owned writable scratch frame, seeded once from a deep copy of that snapshot
```

Example:

```text
parent delegates plan=A
        ↓
inherited snapshot = A
        ↓ seed once
child local frame   = A
        ↓ child updates
child local frame   = C

later:
inherited snapshot = A   // historical delegation fact
child local frame   = C   // current scratch state
```

`consume once` means **seed once, never re-overlay**. It does not mean the inherited snapshot disappears.

The normal Agent information/compiler path should reason from the child-local frame. The inherited snapshot is not merged back into the local frame and is not automatically rendered as a second model-context block.

## 2. Semantic retention does not imply hot-path exposure

A durable semantic fact may need to survive without being transported to every controller step.

Use this engineering principle:

> **Retain what correctness/recovery requires; expose or transport only what the current step requires.**

The current reference runtime keeps `workingNotesHandoff` on `ExecutionContext` and therefore it is also present on `ExecutionView`. The Agent controller consults it only when `readAgentControlState(...)` is `absent`; once controller progress exists, the local `AgentControlState.workingNotes` is authoritative for writable scratch and the inherited snapshot is ignored by normal Agent progression.

In the current in-process TypeScript runtime, placing the already-resident handoff object on an `ExecutionView` is effectively an object-reference/property assignment rather than a deep copy each Activation. With the current bounded handoff envelope, this is expected to be small relative to model latency.

However, a future remote-worker / IPC / distributed controller boundary may serialize `ExecutionView` on every Activation. In that implementation, repeatedly transporting an already-consumed 1–16 KB inherited snapshot could become measurable even though the semantic model is still correct.

Do **not** redesign semantics preemptively for this hypothetical cost. Measure first.

## 3. Why the inherited snapshot should not live only in trace

Trace is observability, not semantic state.

A correct deployment must be able to:

```text
disable trace
sample trace
elide trace payloads
send trace asynchronously
delete debug/evaluation trace
```

without changing recovery or controller semantics.

Therefore:

```text
trace may record that a handoff occurred
trace may record a redacted or full payload according to profile
trace must not become the only semantic owner of the inherited snapshot
```

Moving the only copy into `AgentTrace` would make correctness/audit/recovery depend on an optional diagnostic channel and would violate the existing `observability != semantic state` discipline.

## 4. Why not clear the snapshot immediately after seeding

Clearing `ExecutionContext.workingNotesHandoff` after the first Agent initialization could reduce retained/hot-path data, but it introduces a new correctness protocol:

```text
controller seeds local state
        +
runtime marks initialization datum consumed
```

Those facts would need compatible crash/transaction semantics. If the controller progress commit succeeds but the consumed marker does not (or vice versa), recovery must still know whether seeding may occur again.

Adding a new controller→Harness "consume initialization datum" protocol merely to reclaim a bounded snapshot is not justified without evidence that the retained/transported bytes are material.

## 5. Why not reconstruct only from the Effect journal

The runtime already records the exact `SpawnExecutionProposal` in the Effect journal, so selected handoff content is also present in Effect history. This does not make `ExecutionContext.workingNotesHandoff` meaningless duplication.

The two records currently serve different roles:

```text
Effect journal proposal
  source/audit fact: what the parent requested to transfer

child ExecutionContext.workingNotesHandoff
  materialized child-initialization fact: directly available for restart before first controller progress exists
```

Removing the child-context materialization would require recovery to chase child lineage/effect correlation back into the journal and reconstruct initialization data. That is extra coupling/store work and should be justified by measurement rather than assumed better.

This also reinforces the privacy note from doc 022: selected handoff content may be retained in runtime Effect history even though Working Notes are temporary scratch. Epistemic type and retention policy are different concerns.

## 6. Future optimization seam if measurement justifies it

If post-F / post-G measurements show meaningful transport overhead, prefer a mechanism such as an **initialization-only controller projection** rather than weakening Working Notes semantics.

Conceptually:

```text
ExecutionContext durable truth
  inherited handoff snapshot
        ↓ first controller initialization only
ControllerInitializationProjection
        ↓
controller seeds local progress

ordinary later Activation
  does not transport inherited initialization payload
```

Requirements for any future optimization:

```text
same semantic two-artifact model
no dependency on trace
restart before first Activation still works
no Agent-specific knowledge in generic spawn mediation
no repeated re-overlay of inherited notes
no new authority meaning
simple/no-handoff path remains cheap
```

Do not introduce this seam until evidence shows the ordinary `ExecutionView` representation is materially expensive or another feature independently needs a general one-shot initialization channel.

## 7. Benchmark additions for the post-F / post-G overhead checkpoint

In addition to the matrix already recorded in development note 014 §7.6, measure the Working Notes child-handoff case explicitly:

```text
child with no handoff
child with small handoff
child with near-default-envelope handoff

first Activation
later Activation after local frame has been seeded
```

Track, where practical:

```text
Activation/ExecutionView payload bytes
serialized bytes across controller boundary
number of handoff deep clones
number of handoff validations
store reads/writes
CPU time / wall-clock p50-p95
allocations / GC proxy
```

For an in-process runtime, distinguish object-reference projection from actual serialization. For a remote/IPC runtime, measure bytes actually transported.

The decision question is:

```text
Does retaining the inherited snapshot materially increase ordinary post-initialization Activation cost?
```

If no, keep the simpler mechanism. If yes, optimize transport/projection while preserving semantic retention.

## 8. Product/profile consequence

A future lightweight/local ArrokothI profile should use the same semantics, not a second weakened kernel. It may choose cheaper mechanisms such as in-memory state, local authority, minimal trace, no Derived Semantic Memory provider unless enabled, and in-process controller execution.

The general rule for Slice G and later work is:

```text
semantic richness != mandatory transport/work on every step

retain semantic truth where required
project only the information/action surface needed now
```

This follow-up should be included in the final Slice-F → Slice-G handoff material so a fresh ChatGPT session does not re-open the same question from scratch.
