# Execution protocol and accepted state

**Owner:** Kernel. **Status:** target contract for K0/K1, extended by K2/K4; not implemented by this
review. [Kernel](../kernel.md) owns the lifecycle. This page defines acceptance, input accounting and
race outcomes without selecting a wire encoding, database schema or scheduler.

## Identities and immutable exchanges

| Identity | Scope and purpose | Must not be used as |
|---|---|---|
| Execution ID | One logical lifetime, never reused after terminal deletion | Principal, native session, credential |
| Input ID | Authenticated producer namespace + destination + producer request key | Global cross-tenant deduplication key |
| Activation ID | One exchange against a pinned accepted progress revision and Event batch | Every network delivery attempt |
| Writer epoch | Current attempt allowed to submit progress for that exchange | Native session lock or authentication |
| Effect ID | One immutable logical request; proposal key is bound during acceptance | A physical attempt number |
| Receipt / acceptance position | Evidence a specific request was accepted at a specific boundary | Evidence an external action succeeded |

Creation binds the Runtime contract and executable definition revision, authority context and initial
input in one atomic decision. A retried create uses the same caller-scoped request key and content;
it returns the original Execution, not another child or another charge. Changing content under that
key is a conflict. A fresh intentional run needs a fresh key, even with identical input.

Dispatch pins accepted progress, its codec, definition/Runtime revisions, the selected Event batch
and any supplied execution view. Delivery retries preserve that input. A takeover changes only the
attempt envelope/epoch after recovery permission has been established; it cannot replace input with
new mailbox content under the old Activation ID. New semantic input requires a new exchange.

The codec must define equality for duplicate detection: reject non-finite numbers, duplicate object
keys and unsupported values before deriving identities; distinguish absent fields from explicit null
where the schema does. Object key ordering need not create a different logical payload. K0 selects
one canonical value encoding and limits. Compare the full identity/content binding; a hash alone is
neither authentication nor permission. No API spelling here is frozen.

## Input reservation and acknowledgment

Accepted input is immutable with trusted ingress provenance and a per-Execution acceptance position.
Mailbox delivery is at least once to Runtime attempts. A read/reservation does not acknowledge it.
An accepted Outcome acknowledges the **entire reserved batch**; it means the Runtime accounted for
those Events, not that it obeyed every request. Runtime code must retain deferred meaning in progress
or explicitly reject it. The Kernel does not parse the Runtime's response to infer acknowledgment.

While READY, select a bounded batch in acceptance order. While WAITING, select only Events eligible
under the registered wait/subscriptions, with an eligible wake included before unrelated backlog.
Unmatched Events remain queued. A consumed correction must not disappear because an implementation
advanced one global cursor past older unmatched input: use per-entry disposition or an equivalent
representation. New arrivals during RUNNING belong to the next exchange.

The following are distinct observable decisions:

```text
input accepted → reserved in Activation → acknowledged by Outcome
                                      ↘ terminal disposition if work is cancelled/failed
input refused before acceptance → caller can see refusal; no delivery guarantee
```

Terminal ingress refuses new ordinary input. Previously accepted but unprocessed inputs receive a
recorded terminal disposition; cancellation does not assert that the Runtime processed them. Late
authenticated action evidence follows the action ledger even when its Execution is terminal.

## Outcome acceptance algorithm

1. Authenticate the submitter and scope access to this Execution. A receipt lookup must not leak
   another principal's payload or existence.
2. Check for an already accepted matching Outcome. Return its original receipt without replaying
   progress, Effects or publication. A different body for that accepted identity is a conflict.
3. Validate the whole new envelope: current Activation/epoch/base revision, bounded values, unique
   proposal/emission keys, valid next step, resolvable wait references and completion obligations.
4. Atomically acknowledge the reserved batch; install opaque progress and its revision; record
   accepted emissions, all Effect intents, next state, wait/deadline and recoverable readiness.
5. Return the accepted receipt. Dispatchers and publishers later read accepted intents.

Envelope/reference errors reject the entire proposal. Operation-specific validation or policy denial
can settle an individual accepted Effect without discarding other intents; see
[action lifecycle](action-lifecycle.md). A rejected Outcome cannot mutate accepted Runtime progress.
Native mutations performed before rejection are a Driver recovery problem, not transactional rollback.

A crash after commit but before receipt is a successful acceptance with a lost acknowledgment.
A fresh process must return the same receipt. A stale, never-accepted Outcome cannot become valid
because it contains plausible output. Protocol failure by the current Runtime is inspectable and
ends or holds the exchange under explicit recovery policy; it is not an infinite invisible retry.

## Wait registration, deadlines and liveness

A wait names a finite any-of set of correlated dependencies, with optional explicit input subscriptions
and a deadline. An Effect in the same Outcome can be referenced by its local proposal key. Bind that
key to its stable ID and check existing unacknowledged eligible Events in the acceptance transaction.
If one is already present, next state is READY; otherwise it is WAITING. Readiness notifications may
be rebuilt from accepted records. Never rely on an unjournaled enqueue after commit.

A wait has a generation identity. Timer delivery names that generation; a timer for a replaced wait
cannot satisfy a newer wait. Timeout and a result may both be accepted facts; order their acceptance
and let the Runtime interpret the eligible batch. A wait timeout ends a dependency wait, **not** the
external action and not necessarily the Execution. Execution deadline expiry uses ordered cancellation.
Scheduler lease expiry only triggers recovery inspection. These are three different clocks.

| Race | Required result |
|---|---|
| Result precedes wait | Atomic mailbox check finds it; no lost wake |
| Event arrives during computation | Current batch unchanged; next exchange sees it if subscribed/eligible |
| Cancel versus complete | First accepted terminal decision wins; loser cannot reopen lifetime |
| Old writer versus takeover | Store fences old progress; native writer exclusion is separately proven |
| Corrected user instruction versus pending action | Input alone does not withdraw action; explicit control/policy invalidation orders against admission |
| Wait timeout versus action success | Preserve both facts; never turn timeout into proof of non-execution |
| Duplicate reply after input retention expires | Apply declared expired-key policy; never silently claim unlimited deduplication |

Finite limits must reject excess ingress before acknowledging it. Admission is separate from
readiness; K5 measures queue delay and starvation under the claimed load. Long human waits can be
unbounded in time while dormant state, mailbox and autonomous work remain bounded. No internal store
lock survives a wait or an external call. General deadlock prevention is not promised.

## Completion check

An Outcome completing an Execution proposes no new Effects. All owned required work must have a
known terminal disposition and its relevant result must be accounted for in previously acknowledged
Events or the current batch. Unknown external work remains an obligation even if an uncertainty Event
was acknowledged. Approved-but-undispatched work is still pending. A child failure can be accounted
for without implying application success; the Runtime owns that semantic choice.

[Composition](composition-and-communication.md) defines required children and any explicit ownership
transfer. Failure/cancellation stops progression but preserves unresolved evidence and a reconciliation
owner. Kernel-to-parent result routing is committed with the terminal result or a durable routing
intent; it is not a new Runtime Effect that would make completion circular.

## Acceptance examples for K0–K4

A fake Runtime receives input I at revision 0, proposes action A and `await(A)`. Kill the submitter
after acceptance. Retrying that Outcome returns the same receipt and yields one action intent.
Settle A before the next scheduler tick. Exactly one accepted next revision accounts for its result;
duplicate delivery is permitted, duplicate progress acceptance is not.

Also enumerate two concurrent Outcomes, conflicting duplicates, malformed proposal 2 of 2, early
human input, unmatched backlog, stale timers, terminal input, missing checkpoint versions and an
Execution with an unknown action attempting completion. E1 captures these schedules; E4 repeats the
same boundaries under actual process death. Existing 0.8.x serialization/exclusion tests do not
establish this protocol. Implementation references are in [the baseline](../development/002-implemented-kernel-baseline.md).
