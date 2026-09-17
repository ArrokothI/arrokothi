# Resource lifetime and physical enforcement

[Bindings and attachments](../concepts/state.md#resource-binding-and-attachment) separate a persistent resource from a temporary connection. Deployment/native services own the backing resource; Kernel owns accepted requests and references. No mandatory Home/Workspace/Machine hierarchy is introduced.

**Status:** Deployment and resource-service obligation. Introduced by R1/K3/K5; physical containment only under D1. This is target specification, not shipped behavior.

The Kernel accepts requests and holds references. It does not own workspaces, sessions, filesystems or sandboxes, and this page is mostly about what follows from that gap. Its four sections answer four questions the Kernel cannot answer alone: what the lifecycle operations on a resource actually mean, what happens when two writers reach the same resource, what a containment claim has to be backed by, and who is accounting for the cost and the cleanup. The through-line is that a Kernel decision is not an enforcement mechanism — accepted state can say an attempt is fenced, and only the resource's own owner can make that true.

## Resource operations

| Operation | Contract |
|---|---|
| Allocate/create | Stable request identity; return after ready; clean partially created owned resources on failure |
| Attach/acquire | Authenticate current access and verify the exact backing resource survives |
| Release | Close local clients/transports without deleting backing resources or other holders |
| Snapshot/publish | Identify immutable content; state whether processes/jobs are included |
| Destroy | Explicit ownership/target; idempotence; respect preservation and retention pins |
| Resource lost | Distinguish confirmed loss from temporary unavailability; refuse empty fake restoration |

Release and destroy are the pair most often confused. Closing a workspace client at the end of an Activation releases a connection; it must not delete the workspace, which the next Activation still needs.

Allocation success before handle recording creates an orphan risk: the resource exists and nothing in the Kernel's records knows its name, so nothing will ever release it. Use provider idempotency/query by precommitted allocation identity or scoped reconciliation/cleanup inventory. Clean only provably owned resources, not arbitrary broad prefixes. Failed cleanup retains an owner and cost/retention consequence. Credentials stay outside persisted progress and artifacts.

## Shared mutation

The Kernel's single-writer rule is often read as a general concurrency guarantee. It is not one. It decides whose progress is accepted, and that is all it decides.

Kernel [single-writer](../concepts/identity.md#writer-epoch) acceptance cannot fence a shell, filesystem or native session. Before takeover, enforce native ownership/fencing or prove the old writer stopped. A reused PID or expired unenforced lease is insufficient; otherwise hold/refuse. Both are guesses that a process is gone, and a guess that is wrong produces two live writers on one session with no record of which wrote what. [Recovery](recovery.md) owns the replacement order.

Per-Execution process limits do not serialize another Execution's access to shared resources. Use service preconditions/transactions or enforced resource leases. Immutable snapshots can be shared while writable state remains separate. Copying a filesystem does not legitimately copy authority/credentials.

## Containment claims

Containment is the one claim on these pages that cannot be established by design review at all. Either the tests below were run against a real backend and something was actually prevented, or the profile is Trusted and should say so.

For a [Trusted or Isolated profile](../concepts/operations.md#trusted-execution), list who accesses Kernel storage, policy/secrets, native sessions, workspaces and sinks, and how access is enforced. The trusted computing base includes store/admission, authenticated ingress, adapters and relevant host/containment components. Same-process interfaces cannot contain arbitrary hostile code sharing credentials and objects: an interface describes how cooperating code is meant to be called, and code that is not cooperating is under no obligation to use it.

A claimed isolated profile tests:

- inherited credentials/environment, control sockets and direct store access;
- resolved filesystem paths, traversal/symlinks, mounts and cross-owner workspaces;
- egress, redirects/DNS changes, private/link-local/metadata addresses and subprocess bypass;
- process-tree termination, CPU/memory/time/output limits and crash cleanup;
- permitted work through the bridge and denied work with zero sink attempts;
- restore/credential rotation without fallback to unrestricted local execution.

Use an established sandbox/container/VM backend and native browser/terminal services. Prompt scanning, signatures, static checks and telemetry do not establish physical containment or [exact action authorization](authority.md#exact-action-consent). Read plus send permission is not complete information-flow control; stronger declassification remains a separate profile.

## Capacity, cancellation and retention

Cost and cleanup are the parts of resource ownership that nothing forces anyone to look at until they are already a problem. Each rule below names a place where work, money or storage accumulates under someone's name without an obvious owner.

Measure coordinator transitions separately from active native compute, READY admission, provider concurrency, output queues and dormant [waits](waits.md). An embedded CPU loop can block the event loop; use process/worker pools where needed. A timeout field does not preempt it. Kernel bounds mediated work/[children](../concepts/operations.md#child-and-ownership), Runtime/provider bounds internal calls, [host](../concepts/operations.md#execution-host) bounds physical resources. Estimates and unknown consumption must stay labeled.

Polling keeps resources occupied unless the provider supports dormant subscription or [reattachment](../concepts/state.md#recovery-and-re-execution). Stored outer state does not make native waiting free: an Execution that looks idle in Kernel records can still be holding a connection, a process and a provider slot for the whole wait. Logical [cancellation](lifecycle.md#cancellation-order), native interruption and physical cleanup are separate; a remote job may survive host death. Do not delete resources required by admitted work/reconciliation, or silently retain them forever. Record retention deadlines and [cleanup debt](../concepts/operations.md#backpressure-and-cleanup-debt).

Handoff includes access and lifetime. Parent completion cannot accidentally delete a child's pinned [artifact](../concepts/state.md#artifact-reference). Privacy deletion may require loss of recovery availability; record what was erased and which guarantee ended. Never expose secret URLs in receipts, logs or context. R1 establishes ownership, K3 tests resource loss and stale writers, K5 tests cost/rotation/retention, and D1 tests physical adversarial access. A laboratory builder container does not count as subject containment.
