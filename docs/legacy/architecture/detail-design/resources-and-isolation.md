# Resource lifetime, hosts and isolation

> **Superseded architecture, retired 2026-09-14.** The current architecture is the [mental model](../../../../mental-model/README.md) and its [reference index](../../../../mental-model/reference.md). Phrases below such as "target contract", "current design" or "this page owns" describe this document as it stood then, not current authority; some rules here were later corrected. [What replaced it](../../README.md).

**Owner:** deployment and native/application resource services; Kernel owns admitted requests and
references only. **Status:** R1/K3/K5 resource contract; D1 physical containment only when claimed.
[Deployment](../deployment.md) owns topology and the two trust modes.

## Binding is not attachment

A logical binding associates a principal/workload with a specific native workspace, session, database
view or resource. A host attachment/client/lease is temporary access to that backing resource. Releasing
an attachment must not implicitly delete the resource. Persistence of a resource does not prove a
native run can resume from it, and a serialized client is not a durable binding.

Use these distinctions only for resources the application needs; no mandatory Home/Workspace/Machine
hierarchy is introduced. An application may use ordinary object-store/database IDs. The binding records
owner, resource identity/version, permitted access, sharing/exclusion and retention/cleanup owner. Host
credentials stay outside Runtime progress and materialized artifacts.

## Lifecycle operations

| Operation | Required behavior |
|---|---|
| Allocate/create | Stable request identity; return only after ready; clean partial newly owned resources on failure |
| Attach/acquire | Authenticate current owner/access; verify exact backing resource survives; reconnect rather than silently recreate |
| Release | Close invocation-local clients/transports; preserve backing resources and other holders |
| Snapshot/publish | Capture a declared immutable version; clarify whether live processes/external jobs are included |
| Destroy | Explicit target and ownership; idempotent; respect preservation and retention pins before destructive work |
| Resource lost | Distinguish confirmed loss from temporarily unavailable; refuse fake restoration with empty state |

Allocation success before recording the returned handle creates an orphan risk. Prefer provider
idempotency/query by precommitted allocation identity, or a scoped reconciliation/cleanup inventory.
An adapter may clean only resources it can prove it owns; broad prefix deletion is not a recovery
mechanism. A cleanup failure remains an observable obligation and resource-cost risk.

Dify's [ExecutionBindingBackend](../../../../../dify/dify-agent/src/dify_agent/runtime_backend/protocols.py)
separates create/acquire/release/destroy and prohibits replacing a lost binding or deleting a preserved
workspace. Its `RuntimeLease` is explicitly invocation-local and never persisted. Reuse the actual
backend/service if suitable; preserve these contracts rather than adopting Dify's whole logical schema.
Hermes [environment base](../../../../../hermes-agent/tools/environments/base.py) supplies native command/
environment lifecycle, and its [checkpoint manager](../../../../../hermes-agent/tools/checkpoint_manager.py)
provides workspace file undo. Neither supplies general remote-action rollback.

## Shared mutation and takeover

One current Kernel writer does not fence an old host's shell, mutable session or shared filesystem.
Before takeover, use native exclusive ownership/fencing or prove the old writer has stopped. A PID
alone can be reused; a time-expired lease with no enforcement at the target is insufficient. If the
resource cannot reject old writers and physical exclusion cannot be established, hold/refuse takeover.

A per-Execution process limit does not protect a shared resource from another Execution. Use provider
transactions/preconditions or resource-specific leases. Never hold a Kernel/store mutex across a
human wait. Multiple workspaces may share immutable source snapshots without sharing writable state.
Copying a filesystem snapshot also does not copy authority or credentials legitimately.

## Trust and physical powers

Trusted Execution may intentionally receive ambient filesystem/network/process powers. Kernel action
guarantees cover only mediated paths. Isolated Execution requires physical containment for the stated
threat model. Mediation and containment are independent: an isolated Runtime with allowed native
network access still performs actions outside the Kernel.

For each deployment, list who can access the Kernel store, policy/secret services, native session,
workspace and external sinks; identify how each access is enforced. Trusted computing base includes
admission/store code, authenticated ingress, adapters and relevant host/isolation components. No
interface can contain arbitrary hostile code sharing those objects and credentials in one process.

A claimed isolated profile tests:

- credential/env inheritance, control sockets and direct Kernel-store access;
- canonical filesystem paths, traversal/symlinks, mount modes and cross-owner workspace access;
- egress destinations, redirects/DNS changes, private/link-local/metadata endpoints and subprocess bypass;
- process-tree termination, CPU/memory/time/output bounds and cleanup after crash;
- authorized work succeeding through the permitted bridge, and denied work producing no sink attempt;
- restoration/credential rotation and no silent fallback to unrestricted local execution.

Use an established sandbox/container/VM backend. Reuse native browser/terminal services instead of
building them into the Kernel. Static checks, package signatures, prompt scanners and telemetry are
useful at their respective boundaries; they are not physical containment or action authorization.

## Limits, cancellation and dormant work

Bound coordinator transitions separately from active native compute. READY admission, provider
concurrency, CPU tasks, queued output and dormant waits have different resource costs. A trusted
CPU loop can block an embedded event loop; use ordinary process/worker pools where needed. A timeout
field does not preempt that code.

Kernel can bound mediated actions and child admissions. Runtime/provider can bound model requests;
host can bound CPU/memory/processes. Record estimates and unknown spend honestly. Native polling
keeps compute/resources occupied unless the provider has a dormant subscription/reattachment mode;
calling the outer job durable does not make waiting free.

Cancellation fences Kernel progress/admission, signals native interruption, and separately requests
physical cleanup. A remote job may survive host death. Do not delete a workspace still needed to
reconcile or finish admitted work; do not silently retain it forever either. Operator policy records
retention deadlines, cleanup debt and any explicit loss of recovery guarantees.

## Retention, security and evidence gates

Reference handoff includes access and lifetime; a parent finishing cannot invalidate a child's pinned
artifact accidentally. Deletion may be required even if recovery would prefer retention. Record what
was erased and which resume/replay guarantees are no longer available. Do not expose raw secret URLs
in logs, receipts or model context. Legitimate read and send permissions do not imply complete
information-flow control; stronger declassification is a separate future profile.

R1 names resource ownership before integration. K3 kills worker/host independently and exercises
resource loss and stale writers. K5 measures allocation/cleanup, dormant cost, retention, rotation and
limits. D1 reuses those fixtures with physical adversarial access tests on the advertised host. The
benchmark's builder container is laboratory protection, not subject containment evidence.
