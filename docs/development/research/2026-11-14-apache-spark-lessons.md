# Apache Spark: what its failure history teaches an execution kernel

> **Research record, 2026-11-14.** Background for briefs, design notes and reviews. It is not
> architecture, an owner decision, acceptance evidence or licence clearance; the
> [research index](README.md) states the rules for using it. Packet and issue states are as of that
> date, and [007](../007-work-packets.md) owns current packet status.
>
> - **Question.** Does Apache Spark's distributed-systems engineering contain ideas that would make
>   ArrokothI better? Separate proven mechanisms, architectural lessons and speculation, and say
>   what should not be borrowed.
> - **Method.** Standard scope, one agent session. ArrokothI was read first (AGENTS.md, Layers 1–3 of
>   `mental-model/`, the roadmap and ledger). Spark was read from source at a pinned release, its
>   commit messages, its issue tracker and the RDD paper (see [Methodology](#methodology)).
> - **Earlier reports.** [2026-10-02 §5](2026-10-02-canonical-bytes-kernel.md#5-single-writer-fencing-and-takeover)
>   covers fencing from Kleppmann, Temporal and Cadence. This report adds Spark and does not repeat it.

Learning only. No code was copied, and nothing here is legal advice. Spark's `LICENSE` at the pinned
commit opens as Apache License 2.0; `NOTICE` and per-file headers were not audited. Re-read them before
any reuse.

**Read-status tags** (defined in the [index](README.md)): **[P]** primary text read; **[P~]** primary
source read through a text extraction; **[R]** our own check of this repository; **[I]** this report's
inference. Every Spark source citation is to release `v4.3.0`, commit
`98bc0212c94705434471627068f41e374ccab143`, unless it names a commit or issue of its own.

Each finding carries one class:

| Class | Meaning |
|---|---|
| **Proven mechanism** | Spark ships it and its history shows why. The mechanism itself is portable. |
| **Architectural lesson** | A consequence Spark paid for. It informs a rule, not a component. |
| **Speculative** | An idea this report derives. Nothing in Spark proves it for ArrokothI. |
| **Do not borrow** | Correct for Spark, wrong here, with the reason. |

## Executive summary

**The useful part of Spark is not its design. It is the record of where its design broke.**

Spark's fault tolerance rests on one assumption: recomputing a lost result is cheap and gives an
equivalent answer. The RDD paper says so directly and names the workloads that do not fit [P~]. An
agent Runtime is the opposite case. A second run is billed again, may answer differently, and may
repeat an external action. ArrokothI already refuses that assumption
([deployment](../../../mental-model/deployment.md#check-what-a-durable-substrate-retries-on-its-own)).

So Spark's core (lineage, speculation, stage retry) does not transfer. What transfers is the set of
places where Spark's own assumption failed: committing output to a store it does not own,
non-deterministic stages, tasks that will not die, and a lossy event bus. Those edge cases in Spark are
the ordinary case in ArrokothI, and Spark has ten years of dated fixes for them.

Six findings matter most:

1. **Commit arbitration took nine years to settle.** Spark's `OutputCommitCoordinator` is about 240
   lines. Eight commits between 2015 and 2024 changed who may commit, and the last one reverts the one
   before it. Its final state matches the two exits ArrokothI's action rules already allow.
   ([§1](#1-commit-arbitration-nine-years-on-one-small-component))
2. **Declared determinism was not enough.** Spark shipped a declared determinism level with stage
   rollback in 3.0.0. A wrong-result report was still filed in 2025, and the fix was a runtime
   checksum. ([§3](#3-re-running-work-that-is-not-deterministic))
3. **Spark cannot reliably stop a task.** Its kill is documented as best effort, and the component
   that enforces it is off by default. The only sure stop is killing the whole process.
   ([§4](#4-cancellation-that-does-not-stop-anything))
4. **Control decisions fed by telemetry were unsafe.** Spark's event bus drops events by design, and
   a component that scheduled from it could remove a busy executor.
   ([§5](#5-telemetry-that-drove-control-decisions))
5. **"Exactly-once" in Spark is scoped, and the scope is printed.** Processing is exactly-once;
   delivery depends on the sink. ([§6](#6-intent-before-work-and-the-scope-of-exactly-once))
6. **One check of our own code.** In `packages/kernel/src`, the writer epoch and the base progress
   revision are both plain `number` fields declared next to each other. That is the configuration
   Spark's maintainers blamed for a 2015 fencing bug. It is an observation to weigh, not a defect
   found. ([§1](#what-this-suggests-for-arrokothi)) [R]

Four things should not be borrowed: speculative execution, lineage recomputation as a recovery mode,
acknowledgement-driven output retention, and an asynchronous fast path around durable intent
([§9](#9-do-not-borrow)).

Nothing in this report requires a change to an accepted decision. Most findings confirm rules
ArrokothI already states and supply dated counterexamples for them. The new inputs are small and are
collected in [§11](#11-findings-mapped-to-roadmap-gates).

## How the two systems differ

A short orientation for readers who know one system and not the other.

| | Spark | ArrokothI |
|---|---|---|
| Unit of work | A task: one partition of one stage | An [Activation](../../../mental-model/concepts/core.md#activation) of one Execution |
| Who decides the result | The driver's scheduler | The [Kernel](../../../mental-model/kernel.md), by accepting an Outcome |
| Recovery | Re-run the task from lineage | Reconstruct accepted state, then ask the Driver whether native work may continue ([recovery](../../../mental-model/mechanisms/recovery.md)) |
| Assumed cost of a re-run | None, and the answer is equivalent | Possibly billed, different, and externally visible |
| Concurrent attempts | Normal (speculation, stage retries) | Forbidden to commit: one current attempt per Execution |
| External effects | An afterthought, handled at the sink | A first-class record ([actions](../../../mental-model/mechanisms/actions.md)) |

The RDD paper states the trade. RDDs "can only be created ('written') through coarse grained
transformations", which "restricts RDDs to applications that perform bulk writes, but allows for more
efficient fault tolerance". Its §2.4 is titled "Applications Not Suitable for RDDs" and excludes
"applications that make asynchronous fine grained updates to shared state" [P~].

That section is itself a lesson, taken up in [§7](#7-grain-size-and-saying-what-the-system-is-not-for).

## 1. Commit arbitration: nine years on one small component

**Class: architectural lesson, with one proven mechanism.**

### What Spark does

Spark may run two attempts of the same task at once. To keep both from writing the same output, a
task asks the driver for permission before it commits. The driver grants the first request and denies
the rest: "Uses a 'first committer wins' policy" (`OutputCommitCoordinator.scala` L36–46) [P].

The task then commits to the file system on its own. Permission is granted in one place and the commit
happens in another. That gap is the source of most of what follows.

### Its history

The GitHub commit list for this file has 24 entries. Eight of them change who may commit [P]:

| Date | Issue | What was wrong |
|---|---|---|
| 2015-02 | SPARK-4879 | No arbiter. Two attempts committed and "some partition files are actually lost entirely". The coordinator is introduced. |
| 2015-03 | SPARK-6614 | The lock was cleared when *any* attempt failed, not only the authorized one. |
| 2015-09 | SPARK-10381 | One place used the attempt *number*, another the attempt *ID*. The lock was never released: "an infinite retry loop". |
| 2017-01 | SPARK-18113 | A retried permission request was denied as if it came from a rival. Denials do not count as failures, so the task was rescheduled "infinitely". |
| 2017-03 | SPARK-19631 | A task marked failed after a heartbeat timeout "(possibly due to GC)" recovered and committed anyway. |
| 2018-06 | SPARK-24589 | The identity lacked the stage attempt. A task from the previous stage attempt and its replacement were both allowed. |
| 2022-06 | SPARK-39195 | The authorized task committed, then its container died. The lock was cleared, the retry committed too: "Finally data duplicated." Fix: detect it and fail the job. |
| 2024-05 | SPARK-48292 | Reverts the 2022 fix. Attempts of one task now commit to the same path, so a second commit lands on the first: "No need anymore". |

Three patterns in that table apply to ArrokothI.

**A failure report is not proof that nothing happened.** The code at `v4.3.0` still clears the lock
when the authorized committer ends for any reason other than success or denial (L155–163) [P]. That
treats "the attempt failed" as "the attempt did not commit". SPARK-39195 is the case where that is
false. Spark tried two answers. In 2022 it detected the contradiction and failed the job. In 2024 it
removed the detection because the destination had become idempotent under a stable task identity.

Those are the two exits ArrokothI's
[action rules](../../../mental-model/mechanisms/actions.md#retrying-an-action) allow: "provider-enforced
idempotency valid for the scope/window or reliable proof of non-execution", and otherwise unknown.
Spark reached the same pair from the opposite direction, and preferred idempotent identity once it
was available [I].

**Every bug was a missing or confused coordinate.** SPARK-24589 lacked the stage attempt. SPARK-10381
mixed two integers. Its commit message names the cause: "many similarly-named identifiers that have
different semantics but the same data types", and adds that the bug "was masked by the fact that the
OutputCommitCoordinator does not have enough end-to-end tests (the current tests use many mocks)" [P].

**A refusal that does not count toward a limit can loop forever.** SPARK-18113 and SPARK-10381 are both
livelocks. In each, a refusal was correct in isolation and the scheduler's reaction to it never ended.

### What ArrokothI already has

[Outcome acceptance](../../../mental-model/mechanisms/execution-cycle.md#outcome-acceptance) is
structurally stronger than Spark's coordinator [I]. The Kernel does not grant permission for a commit
made elsewhere. Acceptance *is* the commit, in the Kernel's own store, as one atomic step. There is no
window between "allowed" and "done" for progress.

The Kernel also checks the Activation identity, writer epoch and base progress revision
independently, and an exact duplicate returns its original receipt instead of being judged again. That
closes the SPARK-24589 and SPARK-18113 shapes by construction.

Spark's shape does reappear wherever ArrokothI must act in a store it does not own. The
[crash-window table](../../../mental-model/mechanisms/recovery.md#crash-windows) lists them: action
admission before send, native submit before the handle is saved, candidate checkpoint before
acceptance. Each is a grant followed by an act elsewhere.

### What this suggests for ArrokothI

- **A named counterexample for K2 and K3.** "The authorized attempt reports failure after its external
  commit succeeded" is SPARK-39195. It is a concrete fixture for the admission-to-send window. [I]
- **Deterministic names for things written before acceptance.** SPARK-48292 worked because a retry of
  the same task writes to the same committed path, while each attempt keeps its own working path. A
  candidate checkpoint named from its exchange identity would make an orphan findable by enumeration
  rather than by a separate ledger. *Speculative*; K3 owns checkpoint publication. [I]
- **A termination argument for each uncounted refusal.** ArrokothI says a rejected proposal must never
  be "endlessly retried". The Kernel has no scheduler; the host dispatches. A conformance check with a
  host that redispatches as fast as it can would test that no stale, duplicate or unauthorized
  refusal causes a redispatch by itself. [I]
- **Coordinate types in the Kernel package.** `packages/kernel/src/driver.ts` declares
  `writerEpoch: number` and `baseProgressRevision: number` on adjacent lines, and `activationId` and
  `executionId` as plain `string`. A search of `packages/kernel/src` finds no branded type, while
  `packages/core` brands `ExecutionId` and `ActivationId` [R]. This is the SPARK-10381 precondition.
  It may be deliberate: values cross this boundary as canonical bytes, where a compile-time brand
  proves nothing. The question for a design note is whether *internal* Kernel code that passes two
  bare numbers side by side should be able to swap them without a type error. [I]

## 2. Counting failures by cause

**Class: proven mechanism.**

Spark aborts a stage after a task fails `spark.task.maxFailures` times (default 4, "continuous
failures of any particular task") [P]. Not every failure counts. Each failure reason carries a
`countTowardsTaskFailures` flag (`TaskEndReason.scala`) [P]:

| Reason | Counts? | Stated reason |
|---|---|---|
| Ordinary exception | Yes | Default |
| `FetchFailed` | No | "presumably its not the fault of the executor where the task ran, but the executor which stored the data" |
| `TaskKilled` | No | Killed intentionally |
| `TaskCommitDenied` | No | "prevent spurious stage failures in cases where many speculative tasks are launched and denied to commit" |
| `ExecutorLostFailure` | Only if the task caused the exit | `exitCausedByApp` |
| `ExecutorShutdownFailure` | No | "This is not a task fault" |

The mechanism is small: a retry limit is only meaningful if each failure is attributed to a cause
before it is counted.

ArrokothI attributes failures by domain for benchmarks (AGENTS.md, "Benchmark attribution") and bounds
child retries: "Bound attempts and total work across the replacement lineage"
([communication](../../../mental-model/mechanisms/communication.md)). I found no rule saying *which*
endings debit that bound. A child cancelled by its parent, a child refused for stale authority and a
child whose Runtime crashed are different causes. [I]

The table is also a warning. `TaskCommitDenied` is uncounted, and SPARK-18113 is the infinite loop
that followed ([§1](#1-commit-arbitration-nine-years-on-one-small-component)). An uncounted cause
needs its own bound.

## 3. Re-running work that is not deterministic

**Class: architectural lesson; one speculative idea.**

This is the closest Spark comes to ArrokothI's normal case.

In January 2018, SPARK-23207 reported that a job counting one million distinct rows returned 931,532
after one executor was killed [P]. Some tasks had been re-run, the re-run ordered rows differently,
and downstream tasks combined output from two attempts that disagreed.

Spark's response came in three steps:

1. **A declared level.** Each dataset reports `DETERMINATE`, `UNORDERED` or `INDETERMINATE`: "The RDD
   output can be different after a rerun" (`RDD.scala` L2276–2290). It propagates downstream. [P]
2. **Roll back every consumer.** If an indeterminate stage is retried, all later stages are re-run
   (SPARK-25341, resolved 2019, fixed in 3.0.0). The issue proposes a "shuffle generation number",
   because in shuffle writing "first write wins" and a second attempt could not replace the first.
   Where rollback is impossible the job is aborted with instructions: "Spark cannot rollback the …
   to re-process the input data, and has to fail this job. Please eliminate the indeterminacy by
   checkpointing the RDD before repartition and try again" (`DAGScheduler.scala` L3813–3816). [P]
3. **Detect it at run time.** SPARK-51756 (opened April 2025, fixed in 4.1.0) reports that a partial
   retry of a non-deterministic stage "could lead to incorrect results". The scheduler now compares
   checksums of each attempt's output (L3459), because "we don't know the stage is indeterminate
   until we see the checksum differ" (L2674). [P]

Seven years separate the first report from the runtime check.

### Lessons

**Never let a consumer see a mixture of two attempts.** That is the rule Spark converged on.
ArrokothI enforces it at the Kernel boundary: an Outcome is accepted whole or rejected whole, and a
superseded attempt's Outcome "is rejected in full, even if its draft looks correct"
([worked trace](../../../mental-model/mechanisms/execution-cycle.md#worked-trace)). A child's terminal
result never reopens, so a parent cannot consume two versions of it. This confirms the design. [I]

The mixture can still occur where the Kernel does not arbitrate. ArrokothI names both places already:
provisional output from a replaced attempt must not be spliced "into an apparently accepted
transcript" ([output](../../../mental-model/mechanisms/output.md)), and a Driver must "never resume two
accepted/candidate revisions against one mutable session"
([recovery](../../../mental-model/mechanisms/recovery.md#checkpoint-publication)). SPARK-23207 is a
measured example of what those rules prevent.

**A declaration is a claim. Spark needed a tripwire as well.** The
[Driver support record](../../../mental-model/mechanisms/integration.md#support-record) is a set of
declarations: recovery modes, "proven-safe replay", stale-writer exclusion. R1 supplies evidence for
them at test time. Spark's history says a static declaration of this kind was violated in production
for years after it shipped.

*Speculative:* where a Driver reconstructs continuation by "deterministic replay of its own durable
history", a digest of the replayed prefix compared against the recorded one would catch divergence at
run time. ArrokothI already computes canonical bytes, so the comparison is cheap. This is Driver-side
and belongs to R1 if anywhere. Nothing in Spark shows it is worth its cost here. [I]

**A hold should say what would release it.** Spark's abort message names the remedy. ArrokothI's rule
is "hold visibly". The lesson is that a visible hold with no stated exit is only half as useful. [I]

## 4. Cancellation that does not stop anything

**Class: proven mechanism.**

Spark's own description of its kill: "Spark's current task cancellation / task killing mechanism is
'best effort' because some tasks may not be interruptible or may not respond to their 'killed' flags
being set" (`Executor.scala` L1230–1231). The consequence: "new jobs and tasks are starved of
resources that are being used by these zombie tasks" (SPARK-18761, 2016). [P]

The fix is the `TaskReaper`. It does four things in order [P]:

1. Send the kill once.
2. Poll until the task exits (default every 10 s).
3. Log a thread dump of the task each time it is still running.
4. After `spark.task.reaper.killTimeout`, throw so that the whole executor process exits.

Three details matter more than the ladder itself:

- **It is off by default** (`spark.task.reaper.enabled = false`), and the timeout defaults to `-1`,
  meaning the reaper "may run indefinitely if the supervised task never exits".
- **The last step kills everything in the process**, not only the stuck task.
- **In local mode the last step is refused:** "not killing JVM because we are running in local mode."

ArrokothI states the same separation as a principle: "Cancel-wait, child-cancel request and physical
stop are independent", and names the remainder
[cleanup debt](../../../mental-model/concepts/operations.md#backpressure-and-cleanup-debt). Spark
supplies the operational shape behind the principle.

- The only reliable stop is at an isolation boundary. That matches the
  [Trusted/Isolated](../../../AGENTS.md#security-and-trust) split: an in-process Trusted Execution is
  Spark's local mode, where no reaper is possible. [I]
- The Driver support record's Cancellation row asks for "Signal/interrupt/kill support, host loss,
  late results and remaining native work". Spark suggests two more answers: the *terminal step* and
  its *blast radius* (what else dies with it). [I]
- "Killed but still running" is a count worth exposing in K5. Spark added the reaper because killed
  tasks that keep their slots can starve new work. [I]

## 5. Telemetry that drove control decisions

**Class: architectural lesson.**

Spark publishes scheduler events on an in-memory bus. Each queue is bounded (default 10,000). When a
queue is full the event is dropped, a counter is incremented and an error is logged once: "Dropping
event from queue … This likely means one of the listeners is too slow" (`AsyncEventQueue.scala`
L174–186). [P]

That is acceptable for a UI. It was not acceptable for what else read the bus. SPARK-18838 (2016):
"Many critical component of the scheduler like `ExecutorAllocationManager`, `HeartbeatReceiver` depend
on the `ListenerBus` events and this delay might hurt the job performance significantly or even fail
the job." A late event "might cause `ExecutorAllocationManager` manager to mistakenly remove an
executor which is not idle", and a slow listener "can cause events to be dropped from the event queue
which might be fatal to the job". [P]

Spark's fix was to split the bus into separate named queues, so a slow listener delays or drops only
its own queue's events. It did not make the bus lossless.

ArrokothI has the rule from first principles: "Derived queues are allowed; no second source of
accepted truth is required", an accepted intent "is reconstructible even if notification is lost", and
capacity pressure must "reject/hold Outcome acceptance **before commit**, never accept then drop it".
Spark is a production case of what breaks without it.

A check worth making explicit for K3 and K5: list every input to a readiness, dispatch, wake or
cleanup decision, and confirm none arrives over a path that is allowed to drop. [I]

## 6. Intent before work, and the scope of "exactly-once"

**Class: architectural lesson; mostly confirmation.**

Structured Streaming's micro-batch loop has the same skeleton as an ArrokothI exchange. The
`CommitLog` documentation gives the sequence: "obtain batch 1 offsets and write to offset log",
"process batch 1", "write batch 1 to completion log". On restart, "if commit log indicates we
successfully processed the latest batch id in the offset log, then we can safely move to the next
batch" (`MicroBatchExecution.scala` L882–884). [P]

ArrokothI's version: the Kernel "atomically reserves the exact Event batch and records dispatch
intent" before sending, so that on restart it "finds a pinned exchange it can redeliver unchanged".
Two unrelated systems arrived at the same shape. That is mild evidence the shape is right. [I]

### Spark prints the scope of its guarantee

The guarantee is conditional, and the documentation says on what: "using replayable sources and
idempotent sinks, Structured Streaming can ensure end-to-end exactly-once semantics"
(`docs/streaming/getting-started.md` L509). The newer real-time mode is more exact still: it "is
exactly-once with respect to processing. End-to-end delivery depends on the sink", and "the built-in
Kafka sink provides at-least-once delivery" (`real-time-mode.md` L421–424). `foreachBatch` "provides
only at-least-once write guarantees" unless the caller deduplicates by `batchId`. [P]

The sink contract carries the obligation: "The execution engine may call `commit` multiple times for
the same epoch … implementations must ensure that multiple commits for the same epoch are idempotent"
(`StreamingWrite.java`). [P]

ArrokothI makes the same division (acceptance is exact; "no universal exactly-once external action").
What is worth copying is the habit of stating the scope beside every use of the phrase. A support
profile could publish it per path, in Spark's two-word form: *accepted* exactly once; *delivered* as
the adapter declares. [I]

### Spark publishes what may change between restarts

"Recovery Semantics after Changes in a Streaming Query" lists changes that are allowed or not allowed
when restarting from the same checkpoint. Changing the number or type of sources "is not allowed".
"Any changes … to the stateful operations of a streaming query are not allowed between restarts."
"Not allowed" means "the restarted query is likely to fail with unpredictable errors". [P]

ArrokothI's [compatibility table](../../../mental-model/mechanisms/recovery.md#compatibility-and-migration)
is stricter: it requires a check and a refusal, not a warning. Spark is moving the same way; its
newest commit-log format records each sink's identity "to detect reuse of a sink name"
(`CommitLog.scala`, `CommitMetadataV3`). [P]

The lesson runs toward documentation. A user restarting an Execution needs Spark's table: a plain
list, per Driver, of what they may change between restarts. The internal check does not replace it. [I]

### The price of durable intent, and the pressure to skip it

SPARK-39591 lets a pipeline write its offsets asynchronously, for cases where "end-to-end exactly once
is not support[ed] and latency is sensitive". Continuous processing reaches lower latency "with
at-least-once guarantees" (`docs/streaming/index.md` L26). [P]

Each is a weaker guarantee sold for speed. The same request will reach ArrokothI. See
[§9](#9-do-not-borrow).

## 7. Grain size, and saying what the system is not for

**Class: architectural lesson.**

The RDD paper's argument for cheap fault tolerance is about grain. Coarse transformations let the
system "remember each transformation as one step in a lineage graph and … recover lost partitions
without having to log large amounts of data" [P~].

ArrokothI makes the same choice for a different reason. The accepted unit is an Outcome, and the
Kernel "does not need a model transcript". The recovery page already guards the edge: "ArrokothI's
Execution History does not become a replay log for arbitrary Runtime code".

Two things follow.

- **The cost per exchange is fixed, so exchanges should stay coarse.** Each accepted Outcome is a
  durable decision. Pressure for finer-grained acceptance (per token, per tool call) is pressure
  toward the workload the RDD paper excluded. Provisional output, labelled unaccepted, is the right
  outlet for that pressure. [I]
- **Spark's authors wrote down what RDDs are not for.** ArrokothI's README says its value over a
  native framework "remains a product question to test". A short, explicit list of Executions that do
  not suit Kernel coordination would serve users the way §2.4 served Spark's. Candidates: work whose
  state changes many times a second, and work that needs a reply faster than a durable write. [I]

## 8. Smaller findings

**Retry the coupled unit, not its parts.** *Architectural lesson.* Spark's model assumes "a task in a
stage doesn't depend on any other tasks in the same stage". Distributed training broke that, so
barrier mode launches all tasks together and, on any failure, "would abort all tasks and restart the
stage" (SPARK-24374). It has carried `@Experimental` since 2.4.0 and still does at `v4.3.0`, where it
"only handles limited scenarios" (`RDD.scala` L1913–1926). [P] Two readings: tightly coupled
agents belong in one Execution, with separately re-runnable work as children; and a second execution
model bolted onto an engine built on the opposite assumption stays second-class. The second supports
keeping [branch concurrency](../../../mental-model/mechanisms/composition.md) inside the Runtime. [I]

**A staged write whose failure state is admitted.** *Architectural lesson.* Spark's write interface is
two-phase: each writer commits privately and must "hide" its data until the driver-side
`BatchWrite.commit` succeeds. It is candid about failure. If the final commit throws,
"the state of the destination is undefined". Abort is "best effort", because "some data writers were
committed but their commit messages haven't reached the driver". And "Spark won't retry failed writing
jobs. Users should do it manually" (`BatchWrite.java`, `DataWriter.java`). [P] That is ArrokothI's
candidate-checkpoint problem with a weaker answer. It marks the floor: K3 should not promise more than
"a candidate may be orphaned" unless the store supports more. [I]

**An incarnation token beside a locator.** *Proven mechanism.* Spark Connect lets a client reattach to
a running operation by a client-chosen `operation_id` and resume "after that response". Responses
also carry a `server_side_session_id`, a "server-side generated idempotency key that the client can
use to assert that the server side session has not changed" (`base.proto` L838–840, L884–888). [P]
ArrokothI distinguishes a [checkpoint from a locator](../../../mental-model/concepts/state.md) and
warns that "'latest run' and nearest timestamp cannot establish the right job". An incarnation token
turns "is this the session I left?" into an equality test. It fits the support record's Identity row,
and an output cursor presented to a Kernel that has since restarted without its store. [I]

**An expired cursor is an error, not an empty stream.** *Confirmation.* Spark Connect: "server controls
the amount of responses that it buffers and it may drop responses … If the response is no longer
available, this will result in an error" (`base.proto` L911–913). [P] ArrokothI's
[output](../../../mental-model/mechanisms/output.md#bounded-retention) rule is the same.

**Collapse numeric equivalents before computing identity.** *Confirmation.* SPARK-26021: a `GROUP BY`
gave different counts depending on row order, because `0.0` and `-0.0` have different bytes. The fix
normalizes them, and its comment lists five separate comparison sites that each needed handling. It
adds: "We don't need this normalization if the Spark SQL execution engine is not optimized to run on
binary data" (`NormalizeFloatingNumbers.scala`). [P] ArrokothI canonicalizes `-0` to `0` and refuses
`NaN` at one [admission point](../../../mental-model/concepts/values.md). Spark shows the cost of
doing it per site, after the fact.

**Guarantees stated per path.** *Confirmation.* For accumulators, an update made inside an action "will
only be applied once"; in transformations "each task's update may be applied more than once if tasks or
job stages are re-executed" (`docs/rdd-programming-guide.md` L1540–1542). [P] One feature, two guarantees, both
printed. ArrokothI does the same when it limits Kernel guarantees to "Kernel-mediated paths".

**Extension contracts stabilize slowly.** *Architectural lesson.* `BatchWrite` and `DataWriter` are
annotated `@Evolving` and `@since 3.0.0` at `v4.3.0`. [P] That is a second-generation connector API
still not declared stable. It supports keeping the Driver contract narrow and its stability explicit. [I]

## 9. Do not borrow

**Speculative execution.** Spark runs a backup copy of a slow task and keeps whichever finishes first.
The RDD paper explains why it can: results are immutable, whereas with shared mutable state "the two
copies of a task would access the same memory locations and interfere with each other's updates"
[P~]. An agent's native session *is* shared mutable state. AGENTS.md already says so: "Kernel fencing
does not by itself prevent stale native-session mutation." A second attempt is also a second bill and
a second set of tool calls. Even Spark ships it off (`spark.speculation = false`) and tells every
connector author that concurrent writers "don't conflict" is their problem (`DataWriter.java`). [P]
If hedging is ever wanted, it is two Executions with their own identities and budgets, decided by the
application.

**Lineage recomputation as a recovery mode.** Spark recovers by re-deriving a result from its inputs.
ArrokothI already classifies that correctly: restart-from-input "creates new authorized Executions"
and is not recovery of the old one. The Spark precedent should not be read as support for a Kernel
that replays Runtime steps.

**Acknowledgement-driven retention, and release that interrupts.** Spark Connect frees buffered
responses when the client sends `ReleaseUntil`, and `ReleaseAll` "will also interrupt the query if it
is running" (`base.proto` L947–955). [P] That suits one client reading one result. For Execution
output it is wrong twice: a slow reader would pin records, and an observer could stop the work.
ArrokothI's rules ("observation does not send input"; consumers "cannot indefinitely pin records")
are the better design for many readers.

**An asynchronous fast path around durable intent.** SPARK-39591 is the precedent for a flag that
skips the write-before-work step. The flag is honest in Spark because the documentation withdraws
exactly-once with it. In ArrokothI the pinned exchange is what makes a crash between "decided to
dispatch" and "the Runtime heard" recoverable. If a lower-latency mode is ever offered, it should be
a separately named profile with its own weaker claims, never an option on the persistent one. [I]

**A scheduler in the Kernel.** Much of Spark's code and bug history is scheduling: locality, fairness,
executor allocation, exclusion lists. None of it bears on what counts as accepted. ArrokothI's
position that "the Kernel has no scheduler of its own" avoids that whole class. The one obligation it
leaves is in [§1](#what-this-suggests-for-arrokothi): Kernel refusals must be safe under any host
policy.

## 10. Assumptions this challenges

The request asked for challenges. These are the four I would raise with the owner. None is a finding
of error.

1. **"The host schedules; the Kernel only decides."** Spark's livelocks came from the interaction of a
   correct refusal with a retry policy. With scheduling outside the Kernel, that interaction is
   outside the Kernel's tests unless a conformance fixture plays an adversarial host.
2. **"A Driver's declaration plus R1 evidence is sufficient."** Spark's declared determinism level
   shipped with rollback in 3.0.0, and a wrong-result report against it was filed in 2025. Evidence
   at test time and a tripwire at run time are different protections.
3. **"The Outcome is the right grain."** Spark's micro-batch grain drew steady demand for lower
   latency, and each answer weakened a guarantee. The equivalent demand here will be for acceptance
   of partial output. Whether provisional output is enough for real interfaces is worth testing
   before that demand arrives.
4. **"Identity coordinates are checked, so they are safe."** They are checked at the boundary. Spark's
   2015 bug was inside the arbiter, between two integers of the same type. See the [R] observation
   in §1.

## 11. Findings mapped to roadmap gates

Inputs for briefs, not decisions. Gate ownership is from the
[roadmap](../001-current-status-and-roadmap.md); on this date the ledger shows K1.0–K1.4 accepted and
K1.4-candidate, K1.4-gate and every later gate planned.

| Gate | Input from this report | Class | Section |
|---|---|---|---|
| K1 (conformance) | Adversarial-host fixture: no refusal alone causes redispatch | Speculative | §1, §10 |
| K1 (Kernel package) | Question: distinct types for epoch, revision and IDs inside the Kernel | Architectural lesson [R] | §1 |
| K2 | Counterexample: attempt reports failure after its external commit succeeded | Architectural lesson | §1 |
| K2 | Publish guarantee scope per path: accepted versus delivered | Architectural lesson | §6 |
| R1 | Support record: cancellation terminal step and blast radius | Proven mechanism | §4 |
| R1 | Support record: incarnation token beside each native locator | Proven mechanism | §8 |
| R1 | Replay-divergence digest for replay-based Drivers | Speculative | §3 |
| K3 | Deterministic candidate-checkpoint names; do not promise more than "may be orphaned" | Speculative | §1, §8 |
| K3, K5 | Audit: no readiness, wake or cleanup input on a droppable path | Architectural lesson | §5 |
| K4 | Which child endings debit a retry bound; a bound for each uncounted cause | Proven mechanism | §2 |
| K5 | Expose "cancelled but still running"; holds state what would release them | Proven mechanism | §3, §4 |
| S1 (docs) | Per-Driver "what may change between restarts"; "not suitable for" list | Architectural lesson | §6, §7 |

## Sources

All Spark paths are under `https://github.com/apache/spark/blob/98bc0212c94705434471627068f41e374ccab143/`.
All are [T1].

**Source files read [P]**

| Path | Used in |
|---|---|
| `core/src/main/scala/org/apache/spark/scheduler/OutputCommitCoordinator.scala` | §1 |
| `core/src/main/scala/org/apache/spark/mapred/SparkHadoopMapRedUtil.scala` (`commitTask`) | §1 |
| `core/src/main/scala/org/apache/spark/TaskEndReason.scala` | §2 |
| `core/src/main/scala/org/apache/spark/rdd/RDD.scala` (`DeterministicLevel`, `barrier`) | §3, §8 |
| `core/src/main/scala/org/apache/spark/scheduler/DAGScheduler.scala` (rollback and checksum paths) | §3 |
| `core/src/main/scala/org/apache/spark/executor/Executor.scala` (`TaskReaper`) | §4 |
| `core/src/main/scala/org/apache/spark/internal/config/package.scala` (reaper and bus defaults) | §4, §5 |
| `core/src/main/scala/org/apache/spark/scheduler/AsyncEventQueue.scala` | §5 |
| `sql/core/.../execution/streaming/checkpointing/CommitLog.scala`, `OffsetSeqLog.scala` | §6 |
| `sql/core/.../execution/streaming/runtime/MicroBatchExecution.scala` (selected comments) | §6 |
| `sql/catalyst/.../connector/write/BatchWrite.java`, `DataWriter.java`, `WriterCommitMessage.java` | §8, §9 |
| `sql/catalyst/.../connector/write/streaming/StreamingWrite.java` | §6 |
| `sql/connect/common/src/main/protobuf/spark/connect/base.proto` | §8, §9 |
| `sql/catalyst/.../optimizer/NormalizeFloatingNumbers.scala` | §8 |
| `docs/configuration.md`, `docs/rdd-programming-guide.md`, `docs/job-scheduling.md` | §2, §8, §9 |
| `docs/streaming/getting-started.md`, `apis-on-dataframes-and-datasets.md`, `index.md`, `real-time-mode.md` | §6 |

**Commit messages read [P]** (GitHub API): `1cb3770075` SPARK-4879, `37326079d8` SPARK-6614,
`38700ea40c` SPARK-10381, `33791a8ced` SPARK-18113, `433d9eb615` SPARK-19631, `c8e909cd49` SPARK-24589,
`29cf0c4121` SPARK-39195, `f68d761c9b` SPARK-48292. The SPARK-4879 message was read to its first 1,500
characters. The other sixteen commits on that file were read by title only.

**Issues read [P]** (`issues.apache.org` REST API; summary, status, fix versions, dates and the first
1,250 characters of each description): SPARK-4879, SPARK-18761, SPARK-18838, SPARK-23207, SPARK-24374,
SPARK-25341, SPARK-26021, SPARK-39591, SPARK-51756.

**Paper [P~]**: Zaharia et al., "Resilient Distributed Datasets", NSDI 2012,
`https://www.usenix.org/system/files/conference/nsdi12/nsdi12-final138.pdf`. Read as extracted PDF
text; §2.3 and §2.4 are quoted.

**ArrokothI [R]**: this repository at `c195122`. `packages/kernel/src/driver.ts` L66–76 and a search of
`packages/kernel/src` and `packages/core/src` for branded types.

## Research gaps

**Not verified in this pass.** These came up as leads and are not cited above. Treat them as unread.

- The state store's file naming by batch, and whether state is written before the commit-log entry.
  This bears directly on K3 checkpoint publication and is the most valuable follow-up.
- The Spark Connect server's response buffer and its retention policy. Only the wire contract was read.
- Graceful decommissioning and the external shuffle service, as precedents for state that outlives its
  host. Only configuration text was seen.
- Adaptive query execution, locality scheduling and executor exclusion. Not examined.
- The Spark Connect design proposal and the versioning policy.

**Limits of what was read.**

- Issue descriptions were truncated at 1,250 characters, and no issue comments were read. The design
  discussion that `OutputCommitCoordinator` points to in SPARK-4879 was not read.
- The pull-request thread cited by SPARK-48292 as the reason for the revert was not read. The report
  relies on the commit message.
- `DAGScheduler.scala` was read by search hits and two comment blocks, not end to end.
- Nothing was executed. No Spark job was run, and no ArrokothI test was added or run.

**Scope limits.**

- Spark is a batch and streaming data engine. Every mapping to ArrokothI marked [I] is an analogy made
  here. Spark's maintainers did not design for agent Runtimes.
- Flink, Beam, Ray and Kafka Streams handle some of these problems differently (Flink's checkpoint
  barriers in particular). They were out of scope.
- The [R] observation is a text search. It does not show that any Kernel code path confuses the two
  fields.

## Methodology

One agent session on 2026-11-14.

1. **ArrokothI first.** AGENTS.md; `mental-model/README.md`; the mechanism pages for the execution
   cycle, actions, output and recovery in full; targeted reads of the concept pages, deployment,
   integration, communication and composition; the roadmap and the ledger's status table.
2. **Pin Spark.** A sparse, shallow clone of tag `v4.3.0`, resolving to `98bc0212`.
3. **Follow the failure paths.** Starting from the component closest to ArrokothI's writer epoch, then
   outward: failure attribution, non-determinism, cancellation, the event bus, streaming recovery, the
   connector write contract and the reattach protocol.
4. **Check each mechanism against its incident.** Commit messages and issue records were fetched from
   their APIs, so the dates and stated causes above are the maintainers' own.
5. **Map, then try to refute.** Each candidate lesson was checked against the ArrokothI page that owns
   the matching rule. Where ArrokothI already states the rule, the finding is recorded as
   confirmation, not as something new.

The session ran in two passes. The first read more widely, and its working notes were lost before
the report was written. The second re-read every source cited above. Leads from the first pass that
were not re-read are listed under [Research gaps](#research-gaps) and are not used as evidence.
