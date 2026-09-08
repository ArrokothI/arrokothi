# Deployment

This document owns processes, trust, containment, transport placement and physical operating claims.
The [Kernel contract](kernel.md) defines accepted state; [Execution](execution.md) defines Runtime and
Driver behavior. Deployments implement those contracts with explicitly tested limits.

## Roles and first profile

A **Kernel Worker** processes Kernel state transitions. An **Execution Host** runs Runtime code.
These are operational roles: an ordinary backend process may perform both, and an in-process Driver
need not be a service. Use these names only when discussing a real process/failure boundary.

| Shape | Use and limits |
|---|---|
| Embedded, in memory | One application process for tests and ephemeral trusted work; process loss loses state |
| Embedded or local service, persistent | One administrative trust domain and persistent store; separate host process where needed for Runtime lifecycle and process-kill tests |
| Remote hosts / multiple workers | Optional expansion; authenticated transport, durable claims/fencing and native-session ownership must survive worker/host partitions |

The first production candidate is trusted execution, one surviving persistent store and fenced
ownership. Process failure is in scope; disk/host destruction, multi-region availability and hostile
multi-tenancy are separate profiles. This is a target; current 0.8.x ships an in-memory reference.

A web application creates the Kernel once, authenticates callers at its routes and creates or sends
input to Executions. It can return immediately, stream output, or await a bounded result. No extra
process per HTTP request is required. Browser code uses an authenticated backend; it does not own
privileged Kernel state. A sidecar/service exposes the same create/input/inspect/cancel semantics.
CLI command names and package splitting are product choices, not architecture requirements.

## Failure, admission and recovery

Coordinator loss and Runtime-host loss are different failures. The store restores accepted Kernel
truth; the Driver determines whether native work can be reattached or safely repeated. A Runtime
can outlive its coordinator, and a coordinator can outlive a Runtime. Test both directions.

Transport receipt and heartbeat are not Outcome acceptance. Duplicate delivery and lost
acknowledgments require stable identities. Leases bound ownership, not external-action certainty.
A stale host must be prevented from committing Kernel progress; native session/filesystem mutation
requires its own exclusion or a refusal to take over. A remote provider may supply queryable job
state instead of a host heartbeat. Do not require every provider to implement ArrokothI leases.

Bound active Runtime dispatch separately from the coordinator's event loop. Asynchrony permits
concurrency but does not provide backpressure, fair service, CPU preemption or process isolation.
A synchronous CPU loop in an embedded Runtime can still block the process. Use existing process/
worker pools for such work. Queued ingress, output and dormant waits need explicit operating limits.

Use a transactional database or existing durable runtime for journals, timers and dispatch mechanics.
Choose one through the roadmap's failure experiment, not through architectural preference. In
particular, a substrate's automatic activity retry must not blindly repeat an unresolved consequential
action. [Temporal's activity contract](https://docs.temporal.io/activity-definition) describes repeated
execution after unreported completion; [Restate's durable steps](https://docs.restate.dev/develop/ts/durable-steps)
provide a candidate journaling mechanism. Neither removes the need to map external uncertainty.
These are documentation references, not locally tested integrations or selected dependencies.

## Trust and containment

**Trusted Execution** allows native ambient capabilities intentionally supplied by the deployment.
Kernel guarantees cover mediated paths. The interface is an ownership contract; arbitrary code in
the same process is not physically prevented from reaching files, network, credentials or Kernel objects.

**Isolated Execution** physically restricts Runtime access according to a declared threat model.
Use an existing container, sandbox, microVM or other suitable backend and test the actual profile.
A declaration that only calls permitted APIs is still trusted if its implementation can escape that
restriction. Hosted declarative code needs no third trust category: classify its actual enforcement.

Isolation and action mediation are independent. An isolated Runtime may have allowed native network
access; those calls remain outside Kernel action governance. Restrict all relevant bypass paths if
claiming complete mediation of a particular action class. Test filesystem traversal/symlinks, mounts,
network/metadata endpoints, control sockets, inherited credentials, subprocesses and cleanup. A
container label or action telemetry alone is insufficient.

Privileged credentials belong in trusted adapters outside isolated code. Pass scoped operation or
resource references, not reusable backing secrets. Authenticate create/inspect/input/cancel and
settlement independently. An execution/session/job identifier is not a bearer credential. Restore
principal/resource binding and current authorization after restart; reject cross-owner callbacks.

Budgets are only hard where a component can enforce them. The Kernel can bound admissions and
mediated actions; a native Runtime/provider controls internal calls; the host controls physical CPU,
memory and termination. Record which limit is advisory. Logical cancellation prevents new Kernel
progress; terminating a process tree or remote job is a separate backend operation.

## Resource lifetime

A persistent workspace/session can outlive one host attachment. Acquire/release of a client or lease
must not imply create/delete of its backing resource. If a required workspace or checkpoint is lost,
report loss instead of silently supplying an empty replacement. Cleanup must preserve resources owned
by another run/application, and be safe after retries and partial allocation.

Prior art: Dify's [binding backend](../../dify/dify-agent/src/dify_agent/runtime_backend/protocols.py)
separates stable bindings, immutable home snapshots and invocation-local leases, and explicitly
rejects lost resources. Hermes' [environment backends](../../hermes-agent/tools/environments/base.py)
retain native shell/environment lifecycle. Reuse a native backend or service when needed; these
examples do not justify a mandatory Kernel environment hierarchy.

## Protocols and delivery

MCP, HTTP, A2A, queues and webhooks belong at application/Driver/operation-adapter boundaries.
Use established protocol libraries. A native Runtime's MCP client performs native actions unless
explicitly routed through the Kernel action gateway. A mediated MCP operation uses the same exact
schema, authority, consent and settlement contract as any other Effect. An MCP server exposing
Executions needs authenticated scoped application APIs; it must not publish arbitrary Kernel state.

Keep native session and channel delivery in systems that already own them. ArrokothI can durably
accept a result while delivery to a user remains pending elsewhere. The transport adapter owns
send acknowledgment, retries, expiry and reconciliation; it cannot convert a timeout into a definite
non-delivery. OpenClaw's [task records](../../openclaw/src/tasks/task-registry.types.ts) and
[delivery reconciliation](../../openclaw/src/infra/outbound/delivery-queue-reconciliation.ts) are practical
references. Add a separate delivery service only if the application needs one.

## Evidence and support

Publish the deployment's exact store/runtime/host versions, acknowledged durability, restart behavior,
backup/restore scope, checkpoint compatibility, retention/deduplication window, unresolved-work
inspection and supported load. Process-kill tests must use surviving independent external evidence.
A serialization test is not a restart test; a restart test is not storage-disaster recovery.

Kernel History records its own decisions. Native traces, model usage, stdout, file observations and
host telemetry help diagnosis, but do not prove prevention. A benchmark's gateway/container protects
the laboratory and must not be attributed to the subject's Kernel or isolation profile.

The [roadmap](development/001-current-status-and-roadmap.md) makes persistent operation mandatory for
the proposed durable 1.0 and isolation conditional on demand. If a mature substrate makes the custom
scheduler unnecessary, adopt it and remove that work. No custom database, sandbox, channel gateway,
consensus layer or hosting fleet is a default release obligation.
