# Waiting for observations and selecting the next batch

A [wait](../concepts/core.md#wait-subscription-and-generation) lets the Kernel pause
dispatch until a declared observation or deadline permits another Activation. It
does not represent an internal Runtime promise. This page is the single owner of
eligibility, wait retirement, batch selection and the wait clock (K0.1 B-1–B-8,
CL-1–CL-3 and W-1–W-9).

**Status:** Required Kernel contract. Introduced by K1.3. This is target specification, not
shipped behavior.

## A first example

Before the rules: the Runtime finishes a draft and proposes `await` with one dependency
alternative matching a correction message from the editor, no deadline set. The Execution
enters `WAITING`. When the editor's correction arrives as an Event, it matches that
alternative, the wait retires, and the next Activation's batch carries that Event. Had a
deadline been set instead and no correction arrived in time, the wait would retire on
expiry with a timeout Event in the batch instead. The sections below give the exact
selector, eligibility and batch-selection rules this example simplifies; read the [small
distinguishing examples](#small-distinguishing-examples) near the end alongside them.

## Declare what can wake the Execution

A wait contains two finite lists: **dependency alternatives** and **declared input
subscriptions**, plus optional deadline and registration generation. Either list may
be empty; both empty is malformed, even with a deadline. There is no third list,
Runtime-local-work arm or `interleave` field.

Each dependency alternative supplies a nonempty subset of these fields:

| Field | Allowed test |
|---|---|
| Event identity | Equal to one exact identity |
| Kind | Equal to one kind, or member of a nonempty finite kind set |
| Correlation | Equal to one exact correlation |

All supplied fields within an alternative must match (AND). Any matching alternative
can qualify an Event (ANY-OF). Empty alternatives and empty supplied kind sets are
invalid. Payload selectors, labels as extra fields, ranges, prefixes, regex, arbitrary
predicates, negation and all-of are unsupported. Input subscriptions instead match a
declared application-input class by identity equality; their concrete spelling is
implementation-owned.

Well-formedness is structural, **not a test that the wait can ever be satisfied**.
A valid alternative naming an application-input or timeout kind is inert but still
counts toward a nonempty declaration. A well-formed wait with only inert alternatives
can remain waiting indefinitely without a deadline. The Kernel does not infer intent
or guarantee general deadlock prevention.

## Eligibility comes from trusted source category

First use the Event's trusted ingress/mint provenance, then select within that category:

| Source category | Eligible exactly when |
|---|---|
| Ordinary application input | At least one declared input subscription matches |
| Kernel timeout Event | Never through matching; expiry supplies it by the mandatory-member rule below |
| Every other trusted Kernel Event (settlement, child result, peer message, etc.) | At least one dependency alternative matches |

A kind string cannot change the category. A dependency alternative cannot bypass the
subscription requirement for application input; a subscription cannot match a peer
message or settlement. This is the accepted K0/K1 rule. Any later extension for peer
subscriptions requires explicit versioning and refusal of unsupported semantics.

Example: waiting for child C and for an application correction uses a child-result
dependency plus a correction subscription. A peer question uses a peer-message
dependency. A subscription-only “continue when the editor replies” wait is valid with
no dependencies. Choosing `kind: external.input` as a dependency alone does not wake
on ordinary application input.

## Registering a wait

After the whole Outcome has passed validation, evaluate in this order **inside its
single acceptance transaction**:

1. Acknowledge this Outcome's entire reserved batch. Those Events no longer qualify.
2. Create the registration/generation and check all accepted, still-unacknowledged
   mailbox Events against its eligibility rule. If any qualify, retire the registration
   immediately and record Event-triggered wait-ended readiness; next state is `READY`.
3. Otherwise, if a deadline exists, compare it with **one accepted-time observation**
   for this transaction. `now >= deadline` is due. If due, retire the registration,
   create its one timeout Event and record deadline-triggered readiness; next state
   is `READY`. Do not persist an already-expired `WAITING` state.
4. Otherwise persist `WAITING`, the live generation and its deadline.

An already accepted eligible Event wins over an already-due deadline, so that path
creates no timeout. The current batch cannot wake the wait it just registered.
The check also applies to subscription-only waits. These are ordered evaluations,
not four separately observable commits.

## Ending a wait

A generation is live exactly while `WAITING`. Any eligible wake retires the **entire**
registration. No partial “dependency satisfied” flag survives. If work remains needed,
the Runtime registers it again in its next Outcome with a new generation.

| Trigger | Atomic facts | Next batch must contain |
|---|---|---|
| Registration finds eligible mailbox Event | Outcome's accepted set + create/retire wait + Event-triggered readiness | Earliest eligible Event |
| Eligible Event accepted while `WAITING` | Event/mailbox acceptance + wait retirement + Event-triggered readiness | Earliest eligible Event |
| Registration finds no eligible Event and deadline is due | Outcome's accepted set + create/retire wait + timeout Event + deadline readiness | That timeout Event |
| Current live generation expires | Kernel timeout Event + wait retirement + deadline readiness | That timeout Event |

The Event's destination acceptance owns the second row. A child's source-side routing
obligation alone cannot wake the parent: readiness starts only when the destination
Event actually exists. Durable routing may bridge the two transactions.

Expiry creates at most one timeout Event per generation. Repeated timer delivery
creates no second Event, readiness or logical timeout. A timer for a retired/replaced
generation is a no-op. Timeout acceptance is Kernel-internal, not a seventh external
receipt API.

Generation fencing applies to wait-created artifacts such as timers, **not ordinary
authenticated results**. A late result stays an accepted mailbox fact and can match
a later explicitly correlated wait. It is not discarded because an earlier wait ended.

Events arriving in `READY` or `RUNNING` create no additional wait-ended readiness and
do not change a reserved batch. Terminal ordinary input is refused; permitted late
evidence follows its terminal disposition. Only retirement of a live or newly-created
registration can create wait-ended readiness.

## Selecting the batch

There is no dispatch or batch selection while `WAITING`. Once `READY`, there are two cases:

**Ordinary readiness:** select unacknowledged Events in per-Execution acceptance order,
up to the finite batch bound (at least one). A `continue` with no mailbox Events may
produce an empty batch.

**Wait-ended readiness:** for this one reservation, use Events unacknowledged **at
reservation**, filtered by the retired wait's eligibility rule. For deadline-triggered
readiness, also include the timeout Event independently of matching. Then:

1. Retain the mandatory member first: the earliest-accepted eligible Event for an
   Event wake, or the exact timeout Event for expiry.
2. Fill remaining capacity with earliest-accepted remaining eligible candidates.
3. Present the selected batch in acceptance order, regardless of which member was mandatory.

Ineligible backlog is never a candidate, even with spare capacity. Selection priority
and presentation order are different rules. A wait-ended batch is never empty unless
an accepted terminal decision suppresses the dispatch entirely.

Wait-ended readiness survives a crash and is consumed at **durable reservation**.
It never re-arms during redelivery/takeover or spans two exchanges: those use the
already pinned batch. After the Outcome, `continue` produces ordinary readiness;
another `await` needs a new registration. A materialized candidate set is permitted
only if it stays equivalent to evaluating the selector through reservation, including
eligible arrivals after the wake. A stale snapshot taken at wake is insufficient.

## Small distinguishing examples

Let U be older ineligible input, E1 and E2 be eligible Events in that acceptance order.

| Situation at reservation | Correct batch | What remains queued |
|---|---|---|
| Event wake, bound 1, U/E1/E2 present | E1 | U and E2 |
| Event wake, bound 3, U/E1 present | E1 only | U, despite spare capacity |
| E2 arrives after wake, before reservation; bound 2 | E1, E2 | U |
| Expiry T accepted, eligible result R follows, bound 1 | T | R and U |
| Same expiry, bound 2 | T, R in acceptance order | U |

These distinguish mandatory retention, earliest-member selection, candidate exclusion,
late eligibility and ordering. One bound-1 example cannot prove all of them.

If R ends the live wait *before* its timer is accepted, the timer is stale and no T
exists. If T was accepted first, a later R does not retract it. Both facts survive;
neither establishes external failure. If cancellation wins before reservation, all
unacknowledged Events receive terminal disposition and no Activation is dispatched.

## Accounting and limits

Only accepted Outcome acknowledges the whole reserved batch. Runtime deferred meaning
must live in its progress or explicit rejection decision; Kernel does not infer it
from output text. Nonselected Events keep independent disposition, never disappearing
behind a global cursor. Terminal disposition records nonprocessing, not acknowledgment.

The wait deadline is checked only at registration and while its generation is live
in `WAITING`. [Execution deadline and scheduler lease](../concepts/operations.md#three-clocks)
have different effects. Long human waits may last indefinitely while stored state and
autonomous work stay bounded. No store lock survives an external call or human wait.
Admission fairness/load limits are operating claims, not consequences of asynchrony.
