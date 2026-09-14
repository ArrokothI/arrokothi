# Recovery, uncertainty and compatibility

**Owner:** Kernel accepted truth, Runtime/Driver native continuation, deployment storage/processes.
**Status:** target K0/R1/K3/K5/S1. [Execution](../execution.md#progress-and-native-recovery) owns the
checkpoint meaning. This page defines failure obligations; it does not select a persistence engine.

## Recovery permissions, not a retry switch

For every supported Driver/profile, distinguish: reattach a native job; replay a proven-safe exchange;
resume a specific checkpoint; same-process continuation only; or hold because recovery is unsupported.
These modes can differ by phase of the same integration. A completed-job query may be safe while
resubmitting the job is not. Declare repeat billing/native actions as well as repeated output.

Reconstruct accepted Kernel records first. Before replacement work, establish current ownership,
compatible code, required resources, current identity/authority and the Driver's native continuation
permission. A lease expiry proves neither process death nor action failure. A native checkpoint must
include every piece the native engine needs, including output filtering and pending human work.

## Crash windows and required evidence

| Window | Surviving evidence / safe decision |
|---|---|
| Input commit before scheduler notification | Reconstruct READY from accepted input/wait state |
| Dispatch intent before send | Same immutable Activation; retry only under phase-specific Driver contract |
| Remote submit succeeded before native handle saved | Query by precommitted submit identity; otherwise unknown, not another submit |
| Native checkpoint saved before Outcome acceptance | Candidate checkpoint may be orphan; accepted revision unchanged |
| Outcome accepted before receipt | Replay receipt; never rerun accepted Effects |
| Action admitted before send/result receipt | May have acted; follow action reconciliation contract |
| Settlement committed before wake | Reconstruct Event/readiness from accepted records |
| Parent intent before child creation/link | Idempotent fulfillment binds one child and one budget debit |
| Terminal result before routing/delivery acknowledgment | Replay durable routing/publication intent with the same identity |
| Old host remains alive after takeover | Fence Kernel commits AND exclude native mutation, or refuse replacement |
| Code/checkpoint/resource missing | Hold, explicitly migrate or fail; no fresh empty session presented as restored |

No automatic startup rule may rerun every RUNNING record. Inspect the unresolved phase and recovery
contract. Store failure is unavailable accepted truth; do not fail over to an empty in-memory Kernel.
First persistent profile covers process failure with surviving storage, not storage disaster.

## Native checkpoint publication and retention

A Runtime writes an immutable candidate checkpoint before proposing its reference. The proposal
identifies native codec/version, code/config revision, required resource versions and content integrity
where available. Acceptance pins it; rejection does not. Failed publication can leave orphan blobs.
Garbage collection must distinguish candidate, accepted and in-use references, and serialize pinning
against deletion or use an equivalent safe retention protocol. A mere TTL between upload and commit
is insufficient if a delayed accepted proposal can reference an already deleted blob.

A useful first mechanism is an upload ticket with a validity/pin check at acceptance and a grace period
for failed proposals. This is an implementation option, not a required universal artifact service.
If the provider cannot offer immutable snapshots, use its own job/session lookup and writer contract;
do not pretend a mutable locator has snapshot semantics.

The Kernel and native store usually cannot share a transaction. Reconcile the gap: native state may
advance ahead of accepted progress. Never resume both revisions against a shared mutable session.
Use an exclusive native owner, immutable branchable checkpoints with controlled actions, or explicit
refusal. Native fork alone does not make duplicated external tool calls safe.

Dify [pause persistence](../../../dify/api/core/app/layers/pause_state_persist_layer.py),
`WorkflowResumptionContext`, includes graph state and the actual response-stream filter. CrewAI
[SQLite persistence](../../../crewAI/lib/crewai/src/crewai/flow/persistence/sqlite.py),
`save_pending_feedback`, saves flow state and pending feedback together. Preserve those native owners;
neither example proves atomicity with an unrelated external side effect.

## Recovery versus re-execution

Restoring means continuing the same logical work under its accepted identity and retained evidence.
Restart-from-input is a new explicitly authorized Execution with a causation link to the original.
A terminal Execution never reopens. Reusing a source checkpoint for a new run does not copy grants,
consent, open reply permissions or action idempotency identities into a fresh authority context.
Any intentional fork must define new action identities and access to source artifacts.

Within one unresolved exchange, re-delivery preserves immutable input. If fresh policy forbids
re-disclosure of that snapshot to the replacement host/provider, hold/refuse or explicitly abandon
that exchange before creating a new authorized one. Do not silently sanitize the old envelope while
calling it identical replay. Revocation cannot make an old host forget content it already received.

## Compatibility dimensions

| Version/binding | Pin or check |
|---|---|
| Protocol/codec | Supported envelope fields and equality rules; refuse unknown required semantics |
| Definition/Runtime code | Exact executable/config revision available, not just a friendly name |
| Native progress | Codec and migration path compatible with the actual provider/library version |
| Operation schema | Input/output acceptance and resource/account semantics unchanged |
| Authority/policy | Original provenance retained; current policy checked before disclosure/admission |
| Resource binding | Same intended owner and surviving workspace/checkpoint, or explicit loss |
| Output/Event consumers | Retained schema and cursor window; explicit unsupported version/gap |

Migrations must be explicit, versioned and fenced against active writers. Preserve original accepted
records/receipts, write a new migrated revision with provenance, validate it before use, and test
rollback/refusal without dispatching actions during migration. Do not rewrite approved requests under
a new schema; reapproval or old compatible code is required. Quiesce incompatible writers before
schema rollout. Credentials are rebound through current secret services, not stored inside checkpoints.

CrewAI [state runtime](../../../crewAI/lib/crewai/src/crewai/state/runtime.py) restores runtime
associations as well as data. Its [MemoryScope.bind](../../../crewAI/lib/crewai/src/crewai/memory/memory_scope.py)
requires rebinding a live memory dependency after deserialization. Persisted configuration is not an
executable client. Preserve that lesson without importing its state schema into Kernel progress.

## Cancellation and operational recovery

Logical cancellation stops new progress/admission immediately at its accepted boundary. Native
interrupt, physical termination, child cancellation, compensation and reconciliation remain separate.
A terminal Execution can therefore have unresolved external work and cleanup pending. The operator
view must show both; no extra lifecycle called “successfully cancelled everything” is implied.

Hermes [recover_abandoned_delegations](../../../hermes-agent/tools/async_delegation.py) preserves recorded
partial child results and marks missing work unknown when its owner disappears. Its bookkeeping is
best-effort; use it as evidence for truthful uncertainty, not as proof of durable all-child completion.
Process IDs/start time are useful on one host, not distributed ownership fencing.

## Retention and proof

Pending actions, callbacks, accepted checkpoints and output routes pin the evidence needed for the
advertised recovery period. Define deduplication horizon/tombstones before deleting full payloads.
If privacy or resource policy requires deletion that breaks replay, record recovery as unavailable;
never keep data indefinitely merely because the architecture says “durable.” See
[evidence](evidence-and-observability.md) for access/deletion and [resources](resources-and-isolation.md)
for cleanup ownership.

K3/E4 kills real workers/hosts at every claimed window and compares one transactional path with one
mature substrate. K5 adds retention, principal/secret rotation and upgrade/refusal. S1 pins supported
versions and runs an upstream upgrade exercise. Select the simpler adequate substrate; no universal
exactly-once external action, automatic native checkpoint migration or custom consensus layer follows.
