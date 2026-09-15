# Core coordination vocabulary

These are canonical definitions. [The overview](../README.md) shows how they fit; [the execution cycle](../mechanisms/execution-cycle.md) specifies their interaction.

## A first example

Before the definitions: the application creates an Execution for "prepare the weekly report." The Kernel sends an Activation asking the Runtime to advance it. The Runtime drafts the report and returns an Outcome — proposed progress, plus a wait for the editor's answer. The Kernel accepts it, and the Execution enters `WAITING`. When the editor replies, that reply becomes an Event addressed to this Execution; a new Activation carries it, and the Runtime can complete the report. Each term below names one piece of this exchange precisely — see [the same example in more of its target form](../README.md#a-report-that-needs-publication).

## Kernel

The **Kernel** is the provider-neutral coordinator that accepts and records Execution state changes, addressed observations and mediated action requests. It owns lifecycle, authority enforcement on mediated paths, scheduling semantics, communication and recovery of accepted truth. It does not own the work's algorithm.

## Execution

An **Execution** is one independently addressable logical lifetime of work, with an authority binding, accepted progress and eventual result, failure or cancellation. Its ID is never reused, even after deletion. A native session, process, user or tenant is not an Execution. The application chooses what work merits this lifetime.

## Execution Runtime

An **Execution Runtime**, shortened to **Runtime**, is code or a service that performs an Execution's work and owns the meaning of its continuation data. This “Runtime” is not the JavaScript VM or the deployment host. Native algorithms and internal workers stay opaque to the Kernel.

## Execution Driver

An **Execution Driver**, shortened to **Driver**, adapts a Runtime to the Kernel protocol and declares which native continuation and action guarantees it can preserve. It is an adapter, not a second scheduler or required service.

## Definition

A **Definition** is the versioned executable code/configuration selected for an Execution. Its pinned revision identifies the intended program — not just a friendly name. The **Runtime contract** is the separate versioned agreement through which the Driver interprets Activation, Outcome and progress for that program: one pins the program, the other pins how it is read.

## Activation

An **Activation** is one immutable semantic exchange asking a Runtime to advance an Execution from pinned progress and a fixed Event batch. “Bounded” describes its protocol data, not how long its computation may run. An Activation ID names this exchange.

The exchange stays the same through ordinary delivery retries and authorized takeover. New semantic input requires a new Activation after resolution; it cannot be slipped into an unresolved exchange. One Execution has at most one current Activation allowed to have an Outcome accepted. See [attempt and epoch](identity.md#runtime-attempt).

## Outcome

An **Outcome** is the Runtime's proposal ending an Activation: progress, emissions, Effects and one next step (`continue`, `await`, `complete`, or `fail`). It becomes accepted state only through [Outcome acceptance](../mechanisms/execution-cycle.md#outcome-acceptance). Heartbeats, dispatch acknowledgments and diagnostic streams are not extra Outcomes.

## Event

An **Event** is an immutable accepted observation addressed to an Execution. It has identity, destination, kind, payload and trusted ingress provenance; correlation is included when needed. Acceptance gives it a per-Execution position. No causal order across independent transports or Executions is implied.

Its **source category** comes from the trusted path that accepted or minted it: application input, Kernel timeout, or another trusted result/routed observation. A payload that calls itself a settlement cannot change its source category.

## Mailbox

The **mailbox** is the accepted Events addressed to an Execution, with independent processing dispositions. It is not a transport queue or a single “everything before this cursor was processed” marker. Events can remain unacknowledged behind later ones.

## Batch, reservation and acknowledgment

A **batch** is the finite, enumerable set of accepted Event references pinned in one Activation. **Reservation** is the Kernel decision that fixes that batch as part of dispatch intent. The implementation picks a finite bound of at least one, but an ordinary continuation can still carry an empty batch.

**Acknowledgment** records that the Runtime accounted for an Event. Accepted Outcome acknowledges the whole reserved batch, not just selected members. It does not certify obedience or application correctness. Reservation and mailbox reads acknowledge nothing. A **terminal disposition** instead records that the Execution ended before processing the input; it must not masquerade as acknowledgment.

## Wait, subscription and generation

A **wait** is a Runtime-declared need for a Kernel-visible observation, registered by an accepted Outcome. It contains finite dependency alternatives and declared input subscriptions, an optional deadline, and a **generation** identifying this registration.

A **dependency alternative** selects non-application, non-timeout Events by envelope identity/kind/correlation. A **declared input subscription** names a class of ordinary application input eligible to wake this wait. These are distinct selectors, not a generic pub/sub service. A generation belongs to the wait, not the awaited external work. The exact grammar and source-category rules live in [waits](../mechanisms/waits.md).

## Readiness

**Readiness** is accepted state from which a scheduler can reconstruct the need for dispatch. **Wait-ended readiness** is the one-dispatch selection information retained when a wait ends: the retired selector and, for expiry, its mandatory timeout Event. It is a property of readiness, not another addressable object or a live wait.

## Timeout Event

A **timeout Event** is a Kernel-minted observation that one wait generation expired. It has stable Event identity, destination, a distinct timeout class, exact generation correlation and trusted timer provenance. It is carried as a mandatory next-batch member, not selected by a dependency or subscription. It says nothing about whether the external work succeeded. [Wait expiry](../mechanisms/waits.md#ending-a-wait) owns its creation.
