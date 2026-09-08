# Kernel

The Kernel owns the acceptance of Execution state, addressed inputs and mediated actions. It does
not implement Agent reasoning or Workflow progression. This is the **target contract**, not a claim
that the current 0.8.x Harness implements it. See the [migration roadmap](development/001-current-status-and-roadmap.md).

Implementation-level acceptance and race rules live in [Execution protocol](detail-design/execution-protocol.md).
[Authority](detail-design/authority-and-actions.md), [action lifecycle](detail-design/action-lifecycle.md),
[composition](detail-design/composition-and-communication.md), [recovery](detail-design/recovery-and-compatibility.md)
and [evidence](detail-design/evidence-and-observability.md) expand their respective boundaries.

## Execution and lifecycle

An Execution record needs identity, pinned Runtime/definition contract, authority binding, lifecycle,
accepted progress revision, mailbox, current Activation or wait, result/failure and history references.
Parent relationships and action obligations are present only when used. Agent/Workflow tags, native
session formats, model settings and memory categories do not belong in the generic record.

```text
create + initial input → READY → dispatch intent → RUNNING
RUNNING + accepted continue → READY
RUNNING + accepted await    → WAITING (or READY if already satisfied)
RUNNING + accepted complete → COMPLETED
RUNNING + accepted fail     → FAILED
WAITING + matching Event   → READY
nonterminal + cancel       → CANCELLED
```

`RUNNING` means an Activation remains unresolved, not that a process is currently making progress.
If its attempt is lost, inspection shows the recovery reason and whether retry is permitted. It can
remain held without inventing a semantic wait. `READY` work may be delayed by admission/backpressure.
Terminal states do not reopen; starting again is an explicit new Execution.

Completion records a result, not its delivery to a person or external system. Nonterminal emissions
are output, not completion. Completion must reject newly proposed Effects and unresolved owned
Effects or required child results. An acknowledged uncertainty Event does not discharge unknown work;
request disposition, external certainty and responsibility are distinct. The Runtime must account for
required settlement/results in previously acknowledged Events or the current batch, or the application
must explicitly transfer/abandon the obligation under policy. Failure/cancellation may leave external work
unknown; the Kernel retains it for reconciliation rather than deleting evidence with the Execution.
Detached work is optional: do not introduce it until another durable owner can be named.

## Activation and Outcome

The minimal conceptual exchange is data, not a portable program:

```text
Activation:
  execution_id, activation_id, writer_epoch, base_progress_revision
  runtime_contract_revision, definition_revision
  accepted_progress, events[]
  permitted execution view, deadline/limits if applicable

Outcome:
  execution_id, activation_id, writer_epoch, base_progress_revision
  progress, emissions[], effects[]
  next: continue | await(wait) | complete(result) | fail(error)
```

Runtime identity and progress version must select compatible code or fail explicitly. Small boundary
values are JSON-compatible and schema-checked where a contract is declared; large payloads use
application-owned references with access and retention contracts. No universal artifact type system
or provider transcript is required.

An Activation ID identifies the exchange. A writer epoch fences its attempt. Retransmission uses
the same immutable input and identity; a takeover changes the epoch before any replacement attempt
can commit. One current Activation may commit for an Execution. An epoch is not a credential and
host liveness is not proof of ownership; authenticated ingress and the authoritative store decide.

Dispatch does not synchronously await native work in the coordinator loop. The Driver eventually
submits an Outcome. Dispatch acknowledgment, heartbeat, cancellation signaling and diagnostic
streaming are operational traffic, not additional progress-writing Outcomes.

### Acceptance and atomicity

These are semantic atomic boundaries; a database transaction, journal or durable substrate may
implement them. Queues may be derived from durable records instead of a second source of truth.

| Boundary | Accepted together | Not implied |
|---|---|---|
| Creation/input ingress | Execution plus initial input; subsequent input ID, payload and mailbox entry, with readiness when applicable | Process received bytes means input accepted |
| Activation dispatch intent | Exact Event batch reservation, progress revision, pinned inputs, current epoch and dispatch intent | Runtime started or finished |
| Outcome acceptance | Validate current Activation/epoch/revision; acknowledge its Event batch; commit progress, accepted emissions, all Effect intents, next state and recoverable readiness | Effects happened or were authorized |
| Effect admission | Current concrete policy/consent decision and attempt intent under current dispatch ownership | External success |
| Effect settlement | Authenticated evidence, action state, result Event and recoverable readiness | Runtime has processed the Event |
| Child/message operation | Idempotent creation/routing obligation and parent correlation/budget reservation; fulfillment cannot lose the link | Cross-Execution operations are local to one storage shard |

Validate the entire Outcome envelope and its references before acceptance. A wait may reference an Effect proposed in that same Outcome by its stable local key; validate and bind both together. Malformed or stale
Outcomes create no Effects, acknowledge no Events and commit no progress. An exact duplicate of an
accepted Outcome returns its original receipt; a conflicting duplicate is rejected. Rejection is
recorded; an invalid current Runtime response causes an explicit protocol failure/inspection result,
not an endless silent retry. In a durable profile, the accepted receipt survives restart.

Effect proposals may be denied individually after acceptance, yielding denial Events. Their inputs
are immutable, and IDs are stable within the Execution (for example an Activation plus proposal key).
Reusing an ID with different content is a conflict. Already recorded intents are dispatched by their
own state, never by re-running an accepted Outcome. A failure on Effect 2 cannot roll back Effect 1.
Dependent actions belong in separate Outcomes after their prerequisite result; an array of Effects
is not a distributed transaction or an execution order guarantee.

Accepted emissions have stable IDs and replay positions. A streaming transport may additionally
show provisional output, but must label it as such; it cannot authorize an action or certify a result.
Output publication intent and acceptance must not leave a lost-output gap after a committed result.

## Events and waits

An Event has an identity, destination, kind, payload and trusted ingress provenance, with correlation
when needed. The Kernel assigns an acceptance order per Execution, without promising causal order
across transports. It records duplicate acceptance consistently; same ID with different content is a
conflict. Delivery may repeat after a lost attempt. Processing is acknowledged only by accepted
Outcome or an explicit recorded terminal disposition, never merely by reading the mailbox. An Outcome
acknowledges its whole reserved batch; unselected unmatched input retains its own disposition.

The Runtime cannot mint Effect settlements, child completions or consent by submitting an Event-like
payload. Application input, trusted adapter settlement and operator control have separately scoped
ingress. Knowing a correlation ID gives no settlement authority.

Start with a wait on **any of a finite set of correlated Events**, optionally with a durable deadline.
An explicit input subscription can allow corrections/peer questions while waiting. Unknown action
IDs and unrelated destination references are refused; application-input waits require a declared
subscription. Conditions use envelope identity/kind/correlation, not arbitrary code or model-text
predicates. A Runtime can implement an all-of join by retaining observed results in progress and
waiting for the remaining set. No Kernel graph language or universal wait-expression engine is needed.

Register the wait and check unacknowledged mailbox Events atomically. A result accepted before the
wait, during the current Activation, or after wait registration must wake the same continuation.
Unmatched Events remain queued under the declared retention policy; they do not disappear or force
a busy loop. Fast/slow settlement uses the same Event/result contract. A new Activation receives a
bounded batch; no second writer is dispatched while the current one is unresolved.

Timers wake from persisted deadlines and name the wait generation; stale timers cannot wake a
replacement wait. Wait expiry does not settle an external action or necessarily end the Execution.
Timeouts, human replies and cancellation races follow Kernel
acceptance order. Parent/peer cyclic waits can still deadlock: expose correlations and deadlines;
do not promise general deadlock prevention. Local Runtime promises are never Kernel waits.

## Effects and authority

An Effect requests a Kernel-mediated operation: an external service action, input request, child
creation, message, or an explicitly offered resource service. Pending action state is necessary;
a separate universal `PendingOperation` abstraction is not required beyond these records.

The supported action contract specifies operation identity/revision, accepted schema subset, exact
input, output validation and outcome certainty. Unknown operations and unsupported schema features
fail explicitly. No silent coercion/default insertion after consent. Use a mature schema validator;
provider-facing tool schemas do not substitute for validation at the actual action boundary.

```text
accepted Effect intent → validate concrete operation/input → current policy and consent
                      → record attempt → trusted dispatch → success / failure / unknown
                      → recorded settlement + Event
```

Authority is an upper bound; application policy decides whether this concrete action is permitted
now. Exposed metadata must also respect read/disclosure policy. Model aliases must resolve through
the immutable invocation binding the Runtime used, then submit the real operation identity.
A prompt, advertised tool, native config or identifier never grants authority.

Child delegation is the intersection of requested power, delegable parent authority and application
policy. Messaging, inspection, cancellation and resource access are separate permissions. Children
do not inherit private state or ambient credentials merely through ancestry.

Exact consent, when required, binds the validated payload, operation/contract revision, relevant
resource revision and authenticated approver. Changed payload or contract requires renewed consent
or refusal. Recheck policy after approval and at dispatch admission. Revocation and admission have a
defined ordering: revocation accepted first blocks admission; it cannot recall an already admitted
external request. Enforce the current dispatcher epoch at admission, not only at Outcome acceptance.
Do not imply a local authorization transaction atomically commits with a remote service. Remote policy
freshness requires an explicit integration contract. Ordinary correction input cannot itself withdraw
an action: an application claiming retraction must order explicit withdrawal/consent invalidation
against admission. Transitive child grants retain their delegating constraints under revocation.

Record logical action ID separately from physical attempts. Retry only under the operation's
idempotency/reconciliation contract; all retries keep the logical request identity. A lost receipt,
timeout or malformed response after possible execution is `unknown`, not definite failure.
Reconciliation uses trusted external evidence; Runtime prose cannot settle an Effect. Refinement of
unknown work appends a new evidence revision/Event rather than editing an already consumed Event.
Stopping retries or abandoning responsibility is not proof of external failure. Compensating
an action is a new authorized action, not automatic rollback.

Prior art: OpenClaw's [unknown-send reconciliation](../../openclaw/src/infra/outbound/delivery-queue-reconciliation.ts)
uses transport-specific evidence and exact prepared delivery information. Reuse that boundary lesson,
not its entire messaging control plane. The supporting [review](development/004-architecture-review.md)
pins the inspected checkout.

## Recovery and cancellation

Recovery has two distinct duties: reconstruct accepted Kernel truth and decide whether the Driver
can safely continue native work. The Driver's [recovery contract](execution.md#progress-and-native-recovery)
constrains the latter. Opaque work is never presumed pure, idempotent or free.

| Interrupted boundary | Required recovery behavior |
|---|---|
| Input accepted before dispatch | Reconstruct readiness and reserved input |
| Dispatch may have started native work | Reattach/query by stable identity, safely replay under a declared contract, or hold for reconciliation |
| Native progress saved, Outcome not accepted | Preserve accepted Kernel revision; reconcile native revision before resuming |
| Outcome accepted, dispatch/wake notification lost | Recreate dispatch/readiness from accepted intents |
| External action may have happened, receipt absent | Reconcile, use provider-enforced idempotency if valid, or retain unknown; no blind replay |
| Old host/worker returns after takeover | Reject stale progress and new dispatch; retain independently authenticated evidence of already attempted actions |
| Checkpoint/code/resource unavailable | Explicit recovery hold/refusal, migration or failure; never silently restart as if restored |

Fencing protects Kernel acceptance; it does not prevent an obsolete process mutating a native
session or filesystem. A Driver must prevent concurrent mutation there or refuse takeover. A lost
lease alone cannot justify replay. Repeated internal calls and their possible cost remain Runtime
recovery responsibilities; Kernel-enforced quotas cover only observable/mediated consumption.

Cancellation is a Kernel control operation independent of the Runtime inbox. Accepted cancellation
fences further progress and blocks new Effect admissions. It requests host/native cancellation
through the Driver without waiting for cooperation. If completion committed first, cancellation
reports that terminal result; if cancellation committed first, a late Outcome cannot reopen it.
Late external results remain evidence on the original attempts. Physical stop, child cancellation,
wait abandonment and compensation have separately declared policies. Deadline expiry uses this
same ordered control path; a time limit in an Activation alone cannot stop native code.

## History and retention

Execution History records accepted input, dispatch intent, Outcome acceptance/rejection, progress
revision, action decisions/attempts/results, communication, lifecycle and recovery decisions. It is
audit and recovery evidence, not an automatic deterministic replay engine, business database or
Agent memory. Native traces can be linked without becoming authoritative Kernel facts.

The persistent profile states what survives acknowledgment, how records are compacted, how pending
obligations pin required data, and when deduplication/replay guarantees expire. Bound mailbox size,
output, histories and wait count; reject excess ingress before acknowledging it. Limits, deletion,
credential rotation and unsupported upgrades must be inspectable. Model token budgets belong in
the Runtime unless every relevant call crosses an enforced metering boundary.

Completion versus delivery is deliberately separate. Internal child/result delivery is a durable
Kernel routing obligation; user-facing channel delivery belongs to an application/transport adapter.
See OpenClaw's [task versus delivery status](../../openclaw/src/tasks/task-registry.types.ts) and Hermes'
[restored result ownership tests](../../hermes-agent/tests/tools/test_restored_delegation_ownership.py).
No universal channel/session subsystem is implied.

## Implementation boundary

Use one coordinator and an in-memory store to establish the protocol, then prove one persistent
profile with real process kills. Persistence/scheduling may come from a mature durable substrate;
the Kernel owns semantics without requiring a custom journal, queue or consensus implementation.
Kernel Worker and Execution Host deployment details are owned by [Deployment](deployment.md).

Current migration touchpoints are `packages/core/src/runtime/{harness,effect-processor,resumption-processor}.ts`,
`execution/context.ts` and `ports/{runtime-store,scheduler}.ts`. In particular, current `applyOutcome`
dispatches Effects before later progress commit; its catch comment does not establish whole-Outcome
rollback. The existing tests preserve useful behavior but do not prove the target acceptance protocol.
[The baseline](development/002-implemented-kernel-baseline.md) and [review](development/004-architecture-review.md)
track that gap; this documentation revision implements no runtime change.
