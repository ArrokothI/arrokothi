# Recovering accepted state and native work

[Recovery](../concepts/state.md#recovery-and-re-execution) has two duties: reconstruct what the Kernel accepted, then establish whether native work can continue safely. This page owns that composition. Other mechanisms supply their accepted facts rather than inventing independent retry policies.

**Status:** Required Kernel contract plus a per-Driver obligation. Introduced by K3; R1 supplies the Driver evidence. This is target specification, not shipped behavior.

Recovery is two jobs that are tempting to treat as one. Reconstructing accepted Kernel state is mechanical: the records either survived or they did not. Deciding whether the native work behind those records can continue is not mechanical at all, because the Kernel does not own that work and cannot inspect it. The page is ordered so the second question is never skipped: a procedure that establishes permission first, a table of the exact moments a crash can land in, the checkpoint rules that make safe resumption possible at all, and the compatibility checks that decide whether restored state can still be run. The recurring answer is that when safety cannot be established, holding visibly is correct and guessing is not.

## Decide permission before replacing work

1. Reconstruct accepted Kernel records, including [readiness](../concepts/core.md#readiness) and unresolved obligations.
2. Establish current ownership, compatible Runtime/[Definition](../concepts/core.md#definition)/progress [codec](../concepts/values.md#codec), resources, [principal](../concepts/actions.md#principal-and-authority) binding and current authority/disclosure permission.
3. Apply the [Driver's](../concepts/core.md#execution-driver) contract for the exact native phase: reattach, resume [checkpoint](../concepts/state.md#checkpoint-and-locator), proven-safe replay, same-process continuation only, or hold/refuse.
4. Only after permission is established, authorize replacement and [fence](../concepts/identity.md#writer-epoch) the old attempt.

A [lease](../concepts/operations.md#three-clocks) expiring proves neither process death nor action failure. A lease bounds a claim, not a process: it expires because time passed, which is equally consistent with a dead worker and a slow one still writing. A native job may outlive its host. Do not automatically rerun all `RUNNING` records at startup or fail over an unavailable store to an empty in-memory Kernel. The first persistent profile assumes storage survives process failure.

A dormant `WAITING` Execution need not retain a dedicated worker or a continuously renewed per-Execution lease. Persist the wait, deadline and wake obligation; claim work when a transition needs processing. A substrate may lease a shard or queue instead. Lease granularity and renewal are deployment choices, while accepted writer epochs and native exclusion remain distinct correctness obligations. Driver/provider heartbeat and call timeouts may add other clocks; they do not replace these Kernel meanings.

## Crash windows

Each row is a moment where two facts that belong together could not be written together. Read the pairs: whatever the Kernel committed first is what it will find, and the column on the right says what must be reconstructed or decided from that fact alone. Rows differ in how recoverable they are — some name an exact reconstruction, others end at "unknown", and that difference is the point rather than an inconsistency.

| Interrupted between | Required reconstruction or decision |
|---|---|
| Input commit and scheduler notification | Recover input and applicable readiness together |
| [Dispatch intent](../concepts/identity.md#dispatch-and-delivery) and sending | Keep immutable Activation/batch; Driver contract controls resending |
| Native submit success and saving its handle | Query by precommitted submit identity; otherwise unknown |
| Candidate checkpoint write and Outcome acceptance | Accepted progress stays unchanged; candidate may be orphaned |
| Outcome acceptance and receipt | Return original receipt; do not repeat accepted intents |
| Action admission and send/result | Reconcile possible execution under the [action contract](actions.md) |
| Settlement commit and wake notification | Recover Event and applicable readiness |
| Child intent and child/link fulfillment | Fulfill one identity/correlation/budget debit idempotently |
| Terminal result and route/delivery acknowledgment | Replay the recorded obligation with the same identity |
| Parent closure and supervision follow-up | Recover the exact child, policy, accountable owner and control/routing obligation without reactivating the terminal parent |
| Takeover and old host's return | Reject stale Kernel writes and exclude native mutation or refuse takeover |
| Resume and missing code/checkpoint/resource | Hold, explicitly migrate or fail; never present empty state as restored |

An adapter ledger written only after remote submission does not close the lost-handle window. Before submission pin exact configuration and a stable native request identity; use native submit/query idempotency if available. “Latest run” and nearest timestamp cannot establish the right job or exclusive ownership. The risk of repeat billing, and how native tools are handled, belong in the Driver's phase-specific recovery declaration.

## Checkpoint publication

A checkpoint is written by the Runtime into its own store, and accepted by the Kernel into a different one. Those two stores do not share a transaction, which is the source of every rule in this section: the object must exist before it is proposed, must survive until acceptance decides, and must not be collected while an accepted reference still names it.

Write an immutable candidate checkpoint before proposing its reference. Identify native codec/version, code/config, required resources and integrity where available. Kernel acceptance pins the candidate; rejection does not. [Pinning](../concepts/state.md#retention-pin-and-tombstone) must serialize against deletion or use an equivalent retention protocol. A TTL alone is insufficient: a delayed Outcome must not accept an already-collected object, and a timer cannot know that an Outcome is still in flight.

Garbage collection distinguishes candidate, accepted and in-use references. Upload tickets checked at acceptance plus a grace period are one implementation option, not a mandatory universal artifact service. Preserve the last accepted checkpoint while supported recovery can still require it.

Native state may advance before Kernel acceptance, because the native store and the Kernel's store do not share one transaction. Never resume two accepted/candidate revisions against one mutable session. Use native exclusive ownership, immutable branchable checkpoints with controlled actions, or refusal. Forkable state alone does not make repeated tool calls safe. A mutable session locator remains a locator; it must not be advertised as a snapshot.

Native snapshots retain all their engine's required state: graph position, output filter, pending forms, resources and executable associations when applicable. Restoring serialized configuration does not recreate a live resource client automatically.

A Runtime may reconstruct continuation through deterministic replay of its own durable history instead of loading a memory snapshot. Its Driver must pin the relevant history boundary and compatible code and prove that replay does not repeat unrecorded external actions. A transcript, filesystem snapshot or bare native workflow ID alone is insufficient. ArrokothI's Execution History does not become a replay log for arbitrary Runtime code by adopting such a Driver.

## Compatibility and migration

Reconstructing state is not the same as being able to use it. Progress is only meaningful to code that can decode it, an approval is only meaningful under the operation version it was given for, and a resource reference is only meaningful while its backing resource exists. Each row below names a binding that can survive a restart and still be wrong, together with the check that catches it.

| Binding | Required check |
|---|---|
| Protocol/transport semantics | Required fields/equality supported; refuse unknown required semantics |
| Definition and Runtime | Exact code/config available |
| Progress | Codec and migration compatible with actual native version |
| Operation | Schema, input/output meaning, account/resource semantics unchanged |
| Policy | Keep original provenance; recheck current disclosure/[admission](authority.md#order-revocation-against-admission) |
| Resource | Intended owner and backing state survive, or explicit loss |
| Output/Event consumer | Supported schema and retained cursor window, or explicit gap/refusal |

Migrations are explicit, versioned and fenced from active writers. Preserve original accepted records/receipts; write a new migrated revision with provenance and validate before use. Test rollback/refusal without dispatching actions during migration. Quiesce incompatible writers before rollout. Old [approved](authority.md#exact-action-consent) requests require old compatible code or reapproval; migration cannot reinterpret their arguments. Rebind credentials through current secret services instead of storing them in checkpoints.

Restart-from-input and intentional forks create new authorized Executions and action identities, with causation and source-artifact access. They do not copy old grants, consent, open reply permissions or action idempotency keys. Terminal work never reopens: a restart-from-input is a new Execution that points at the old one, not the old one resumed, and the distinction is what keeps a completed lifetime from acquiring new actions. Revocation cannot make an old host forget disclosed content; if current policy forbids redisclosing pinned input, hold/refuse or explicitly abandon it before a new exchange.

[Cancellation](lifecycle.md#cancellation-order), physical stop and cleanup remain separate. Pending actions, callbacks, checkpoints and routes retain the evidence their supported recovery period needs. Deletion that breaks that guarantee records recovery as unavailable. [Resource cleanup](resources.md) and [retention](evidence.md#retention-and-deletion) own those policies.

K3 compares a transactional candidate with a mature substrate using real process kills, including [what that substrate retries on its own](../deployment.md#check-what-a-durable-substrate-retries-on-its-own); K5 adds retention/rotation/upgrades; S1 pins supported versions. No universal exactly-once external action, automatic native migration or custom consensus layer follows.
