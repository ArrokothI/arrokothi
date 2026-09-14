# Recovering accepted state and native work

[Recovery](../concepts/state.md#recovery-and-re-execution) has two duties: reconstruct
what the Kernel accepted, then establish whether native work can continue safely.
This page owns that composition. Other mechanisms supply their accepted facts rather
than inventing independent retry policies.

## Decide permission before replacing work

1. Reconstruct accepted Kernel records, including readiness and unresolved obligations.
2. Establish current ownership, compatible Runtime/Definition/progress codec, resources,
   principal binding and current authority/disclosure permission.
3. Apply the Driver's contract for the exact native phase: reattach, resume checkpoint,
   proven-safe replay, same-process continuation only, or hold/refuse.
4. Only after permission is established, authorize replacement and fence the old attempt.

A lease expiring proves neither process death nor action failure. A native job may
outlive its host. Do not automatically rerun all `RUNNING` records at startup or fail
over an unavailable store to an empty in-memory Kernel. The first persistent profile
assumes storage survives process failure.

## Crash windows

| Interrupted between | Required reconstruction or decision |
|---|---|
| Input commit and scheduler notification | Recover input and applicable readiness together |
| Dispatch intent and sending | Keep immutable Activation/batch; Driver contract controls resending |
| Native submit success and saving its handle | Query by precommitted submit identity; otherwise unknown |
| Candidate checkpoint write and Outcome acceptance | Accepted progress stays unchanged; candidate may be orphaned |
| Outcome acceptance and receipt | Return original receipt; do not repeat accepted intents |
| Action admission and send/result | Reconcile possible execution under the action contract |
| Settlement commit and wake notification | Recover Event and applicable readiness |
| Child intent and child/link fulfillment | Fulfill one identity/correlation/budget debit idempotently |
| Terminal result and route/delivery acknowledgment | Replay the recorded obligation with the same identity |
| Takeover and old host's return | Reject stale Kernel writes and exclude native mutation or refuse takeover |
| Resume and missing code/checkpoint/resource | Hold, explicitly migrate or fail; never present empty state as restored |

An adapter ledger written only after remote submission does not close the lost-handle
window. Before submission pin exact configuration and a stable native request identity;
use native submit/query idempotency if available. “Latest run” and nearest timestamp
cannot establish the right job or exclusive ownership. Repeat billing and native tools
belong in the Driver's phase-specific recovery declaration.

## Checkpoint publication

Write an immutable candidate checkpoint before proposing its reference. Identify
native codec/version, code/config, required resources and integrity where available.
Kernel acceptance pins the candidate; rejection does not. Pinning must serialize
against deletion or use an equivalent retention protocol. A TTL alone is insufficient:
a delayed Outcome must not accept an already-collected object.

Garbage collection distinguishes candidate, accepted and in-use references. Upload
tickets checked at acceptance plus a grace period are one implementation option,
not a mandatory universal artifact service. Preserve the last accepted checkpoint
while supported recovery can still require it.

Native state may advance before Kernel acceptance because their stores do not share
a transaction. Never resume two accepted/candidate revisions against one mutable
session. Use native exclusive ownership, immutable branchable checkpoints with
controlled actions, or refusal. Forkable state alone does not make repeated tool calls safe.
A mutable session locator remains a locator; it must not be advertised as a snapshot.

Native snapshots retain all their engine's required state: graph position, output
filter, pending forms, resources and executable associations when applicable. Restoring
serialized configuration does not recreate a live resource client automatically.

## Compatibility and migration

| Binding | Required check |
|---|---|
| Protocol/transport semantics | Required fields/equality supported; refuse unknown required semantics |
| Definition and Runtime | Exact code/config available |
| Progress | Codec and migration compatible with actual native version |
| Operation | Schema, input/output meaning, account/resource semantics unchanged |
| Policy | Keep original provenance; recheck current disclosure/admission |
| Resource | Intended owner and backing state survive, or explicit loss |
| Output/Event consumer | Supported schema and retained cursor window, or explicit gap/refusal |

Migrations are explicit, versioned and fenced from active writers. Preserve original
accepted records/receipts; write a new migrated revision with provenance and validate
before use. Test rollback/refusal without dispatching actions during migration. Quiesce
incompatible writers before rollout. Old approved requests require old compatible code
or reapproval; migration cannot reinterpret their arguments. Rebind credentials through
current secret services instead of storing them in checkpoints.

Restart-from-input and intentional forks create new authorized Executions and action
identities, with causation and source-artifact access. They do not copy old grants,
consent, open reply permissions or action idempotency keys. Terminal work never reopens.
Revocation cannot make an old host forget disclosed content; if current policy forbids
redisclosing pinned input, hold/refuse or explicitly abandon it before a new exchange.

Cancellation, physical stop and cleanup remain separate. Pending actions, callbacks,
checkpoints and routes retain the evidence their supported recovery period needs.
Deletion that breaks that guarantee records recovery as unavailable. [Resource cleanup](resources.md)
and [retention](evidence.md#retention-and-deletion) own those policies.

K3 compares a transactional candidate with a mature substrate using real process kills;
K5 adds retention/rotation/upgrades; S1 pins supported versions. No universal exactly-once
external action, automatic native migration or custom consensus layer follows.
