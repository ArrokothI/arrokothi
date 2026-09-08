# Deployment

ArrokothI's architecture does not require one physical deployment shape. The same Kernel/Execution semantics should work when everything runs in one application process, when the Kernel is a separate local service, or when Kernel Workers and Execution Hosts are distributed.

This document owns deployment topology, process roles, trust/isolation, embedding, protocol placement, and observability. It does not redefine Kernel lifecycle/authority or Execution Runtime internals.

## 1. Deployment roles

Use these role names consistently.

| Role | Meaning |
|---|---|
| **Kernel** | Logical execution coordinator and owner of Kernel semantics |
| **Kernel Worker** | Process/worker that performs Kernel coordination and accepted state transitions |
| **Execution Host** | Process/service that runs an Execution Runtime and accepts Activations |
| **Execution Driver** | Boundary adapter between Kernel protocol and a specific Runtime |
| **Application** | Product/backend that creates Executions, supplies policy/resources, receives output, and authenticates users |
| **Isolation Backend** | Sandbox/container/microVM/WASM/other mechanism used when the Runtime must not have ambient host access |

One physical process may perform several roles. The roles remain conceptually distinct because their failure and security responsibilities differ.

## 2. Embedded deployment

The smallest deployment is an ordinary application process containing the Kernel and one or more Execution Runtimes.

```text
web/backend process
┌──────────────────────────────────┐
│ application routes/business code │
│                                  │
│ ArrokothI Kernel                  │
│   ├─ Kernel Worker loop           │
│   └─ in-process Execution Driver  │
│         └─ Agent/Workflow Runtime │
└──────────────────────────────────┘
```

### Kernel side

The application creates/configures a Kernel object during process startup. The Kernel can use an in-memory store for tests/local work or a persistent backend for a supported durable profile.

There is **no architectural requirement to spawn another operating-system process** merely because ArrokothI is a Kernel.

If a Node web application runs `npm run dev` or `npm start`, that process may instantiate the ArrokothI Kernel as a library and drive its event loop in the same process.

### Execution side

ArrokothI-native Agent/Workflow Runtimes may run in-process through an in-process Driver. Trusted foreign runtimes that can be embedded safely may do the same.

Internal model/network waits do not block the logical Kernel architecture; the Driver dispatches an Activation asynchronously and returns its Outcome later.

### Best fit

Embedded deployment is appropriate for:

- local development;
- tests;
- desktop/CLI applications;
- ordinary trusted backend services;
- applications that do not need Kernel process independence.

The tradeoff is that application-process loss also loses any nonpersistent Kernel/Runtime state and terminates all in-process work.

## 3. Sidecar or local Kernel service

The Kernel may run as its own long-lived local process/service.

```text
application process
       │ local HTTP/gRPC/IPC
       ▼
Kernel service
  ├─ persistent Kernel state
  ├─ Kernel Worker
  └─ Execution Drivers
       ├─ local Runtime
       └─ remote Runtime
```

### Kernel side

The service exposes authenticated application/control APIs for creating Executions, sending input, reading output/history, confirming actions, cancelling work, and inspection.

The application should not need to spawn a new Kernel process per user request or per Execution. A Kernel service is normally long-lived and manages many Executions.

### Execution side

Execution Hosts may be children of the Kernel service, independent local processes, or remote provider services.

This deployment makes Kernel failure/restart testing easier because the Kernel process has a clear boundary from the application.

## 4. Remote durable Kernel service

A larger deployment may run Kernel Workers as a service over a persistent store/queue/durable-runtime substrate.

```text
applications
    │
    ▼
Kernel API / ingress
    │
    ├── persistent Kernel state/history
    │
    ├── Kernel Worker A
    ├── Kernel Worker B
    │
    └── Execution dispatch
          ├── Execution Host 1
          ├── Execution Host 2
          └── external provider/runtime
```

### Kernel side

Multiple Kernel Workers may process independent Executions concurrently. The substrate must still enforce one accepted progress-writing Activation per Execution, durable writer epochs/fencing, and recovery semantics.

A mature durable runtime/database/queue may supply mechanics. ArrokothI does not need to implement its own distributed consensus system.

### Execution side

Execution Hosts may scale independently from Kernel Workers. A CPU-heavy coding Agent, a remote Dify application, and an in-process deterministic Workflow can all participate through Drivers while keeping the same Kernel Execution contract.

## 5. Kernel Worker and Execution Host failure

Do not equate the two roles.

### Kernel Worker failure

Another Kernel Worker may continue from durable Kernel state. Any worker ownership/claim must be fenced so a stale worker cannot commit after takeover.

### Execution Host failure

The Kernel may detect an expired lease/heartbeat, mark the current Activation attempt lost/stale, and decide whether it can safely re-dispatch, reconcile, wait for evidence, or expose an unknown/manual recovery condition.

The logical Execution remains unless the Kernel transitions it to a terminal state.

### Heartbeats

Heartbeats/lease renewals are operational protocol traffic:

```text
Execution Host → Kernel
  activation_id
  writer_epoch
  lease renewal / liveness
```

They are not semantic Events delivered to the Agent/Workflow.

A heartbeat cannot establish whether an external action happened just before the host disappeared.

## 6. Trusted Execution mode

A **Trusted Execution** runs code that the deployment is willing to let use ambient host facilities that are deliberately provided.

Examples may include:

- project working directory;
- terminal/subprocess access;
- ordinary outbound network;
- local package/tool installation;
- provider-native tool systems;
- selected environment variables/credentials.

### Kernel side

Kernel authority still governs Kernel-mediated Effects. The Kernel must not claim to authorize or prevent ambient operations that bypass it.

### Execution side

Hermes, OpenClaw, CrewAI, Dify components, or ArrokothI-native code may use their normal facilities according to the application's trust decision.

This is often the simplest and most useful mode for developer-owned applications.

Trusted does not mean “the OS prevents all harm because there is no sudo.” A normal user process can often read/write user files, make network requests, run programs, and use credentials available to that user. The deployment is intentionally accepting that power.

## 7. Isolated Execution mode

An **Isolated Execution** runs behind a physical containment boundary appropriate to the deployment claim.

```text
Kernel
  │ explicit Activation / Effect bridge
  ▼
Isolation Backend
┌──────────────────────────────┐
│ Execution Host               │
│ Agent/Workflow Runtime       │
│ bounded workspace            │
│ restricted network/secrets   │
└──────────────────────────────┘
```

### Kernel side

The Kernel sends explicit inputs and receives Outcomes. Privileged external operations can cross a controlled Kernel-mediated Effect bridge.

### Execution side

The Runtime can compute freely within the resources made available to the sandbox, but it cannot rely on ambient access outside the declared boundary.

### Isolation controls

Depending on threat model, a real isolated profile may require:

- filesystem/workspace boundaries;
- network/egress restrictions;
- secret isolation;
- process/system-call restrictions;
- CPU/memory/time/process/output limits;
- tenant/principal separation;
- cleanup and artifact retention rules.

The exact backend is replaceable. The guarantee is only as strong as the configured isolation profile and its tests.

## 8. Trust mode and interaction path

Keep two different questions separate.

| Question | Options |
|---|---|
| Do we trust the Runtime with ambient host capabilities? | Trusted / Isolated |
| Does this particular action cross the Kernel governance path? | Kernel-mediated / native-ambient |

Examples:

```text
Hermes Execution
  trust mode: Trusted
  terminal/filesystem: native-ambient
  publish_payment: Kernel-mediated
```

```text
Hermes Execution
  trust mode: Isolated
  filesystem: sandbox-local
  arbitrary network: denied
  publish_payment: Kernel-mediated
```

This is simpler than inventing many security profiles while still describing the important assurance difference.

## 9. Building an Agent or Workflow

Conceptually, developers build/register an **Execution Runtime + Driver**, not a special Kernel implementation.

### ArrokothI-native Runtime

A project may define an ArrokothI Agent or Workflow using the provided execution-side SDK/runtime package. The resulting definition identifies which Driver/Runtime can execute it and what input/output/progress contract it uses.

### Provider Runtime

A provider integration defines how one native run/session/job maps to one ArrokothI Execution and implements the Driver translation.

Examples:

- Hermes Driver starts/resumes a native Hermes job/session;
- OpenClaw Driver targets an appropriate native task/runtime boundary;
- Dify Driver calls a published application/Workflow and preserves its native state;
- CrewAI Driver runs a Crew/Flow and returns its native result/progress.

The Kernel should not require these systems to translate their entire internal graph or cognition into ArrokothI types.

## 10. CLI shape

A CLI can improve development and operations, but command names are product/API choices rather than Kernel semantics.

A plausible future UX is:

| Candidate command | Purpose |
|---|---|
| `arrokothi dev` | Start an embedded/local development Kernel with configured Runtime Drivers |
| `arrokothi kernel` | Run a long-lived Kernel service |
| `arrokothi run <definition>` | Create an Execution and optionally stream emissions/result |
| `arrokothi inspect <execution>` | Read lifecycle/history/current wait/unknown work |
| `arrokothi send <execution>` | Deliver application input/Event through trusted ingress |

These names are illustrative until a release/API decision adopts them.

The important conceptual rule is that CLI usage drives the same Kernel APIs/protocol as an embedded application or web backend; it is not a separate execution model.

## 11. Web application embedding

A normal web application should be able to use ArrokothI without becoming an orchestration platform itself.

### Embedded example

```text
Node backend starts
  ↓
create/configure Kernel once
  ↓
HTTP route authenticates user
  ↓
route creates/sends input to Execution
  ↓
Kernel dispatches Activations asynchronously
  ↓
route returns immediately, streams updates, or awaits a bounded result
```

`npm run dev` does not need to spawn a second process unless the deployment intentionally chooses the sidecar/service model.

Do not run a privileged Kernel in an ordinary browser frontend. Browser/UI code should normally talk to an authenticated backend/control API that owns application principals, policy, secrets, and Kernel ingress.

## 12. Application authentication and Execution authority

Applications authenticate users/services before letting them create, inspect, message, confirm, or cancel Executions.

That control-plane/application authorization is separate from the authority the Execution receives after it starts.

```text
user/service authentication
  ↓ application access policy
create/send/inspect/cancel Execution
  ↓
Kernel Execution authority
  ↓
what the Execution itself may request as Effects
```

An `execution_id`, `activation_id`, correlation ID, or external job ID is not automatically a bearer credential.

## 13. MCP client placement

MCP is a protocol boundary, not a Kernel primitive. Placement depends on what guarantee the application wants.

### Execution-native MCP client

A Trusted Runtime may run its own MCP client internally.

```text
Execution Runtime → MCP server
```

This preserves native behavior but the resulting tool call is ambient/native from the Kernel's perspective unless the Driver also routes it through the Kernel.

### Kernel-mediated MCP client/provider

When an MCP Tool should be governed by Kernel authority/consent/history, the MCP client/import adapter sits behind a Kernel-mediated operation:

```text
Execution Effect
  ↓ Kernel authorization
MCP client adapter
  ↓
MCP server
  ↓ result
Kernel settlement/Event
```

This is the appropriate placement for strong ArrokothI action-governance claims.

## 14. MCP server placement

ArrokothI may also expose selected application/Execution functionality through an MCP server.

```text
external MCP client
  ↓ authenticated application/protocol boundary
ArrokothI MCP server adapter
  ↓ Kernel/application operation
Execution or governed resource
```

The MCP server must expose an explicitly declared interface. It should not automatically publish internal mailboxes, all Effects, private memory, or raw Kernel state.

If a provider Runtime exposes its own MCP server internally, that is part of that Runtime unless the application deliberately maps it to a Kernel-governed service.

## 15. Other protocols

HTTP, OpenAPI, A2A, queues, webhooks, provider SDKs, and future protocols follow the same rule:

- transport identity/authentication belongs at the deployment/integration boundary;
- Kernel semantics remain Execution/Event/Effect/authority/history;
- provider protocol objects do not automatically become Kernel objects;
- asynchronous provider jobs may be represented by Driver/native progress without forcing a universal protocol abstraction into the Kernel.

Add stable portable interoperability contracts only when multiple real consumers need the same mapping.

## 16. Observability

Observability is a separate plane from authority and containment.

### Kernel observations

The Kernel can reliably record its own history:

- input acceptance;
- Activation dispatch/acceptance;
- Outcome acceptance/rejection;
- Effect authorization/attempt/outcome;
- communication;
- lifecycle/recovery.

### Execution observations

A Runtime/Host may additionally report telemetry:

- model calls;
- token/cost usage;
- native tools;
- CPU/memory;
- stdout/stderr;
- native progress;
- files changed;
- provider traces.

These observations are valuable for diagnosis and benchmark attribution but do not prove that the Kernel prevented an action.

> **Observation is not enforcement. Prevention requires Kernel mediation or physical isolation.**

## 17. Secrets and resources

### Trusted Execution

The application may intentionally provide selected native credentials/resources directly to the Runtime. Those uses are outside Kernel mediation unless routed back through a governed operation.

### Isolated Execution

Prefer logical handles/Kernel-mediated operations while privileged credentials remain outside the sandbox in trusted adapters/providers.

```text
isolated Runtime
  ↓ logical operation/resource
Kernel
  ↓ authorization
trusted adapter owns credential
  ↓
external system
```

Do not persist raw secrets in Kernel progress/checkpoints when a renewable resource binding or external secret manager can be used instead.

## 18. Persistence

Deployment determines which semantics are actually durable.

### In-memory profile

Useful for tests, examples, and embedded ephemeral applications. Process loss ends its state unless the application owns persistence elsewhere.

### Persistent profile

A supported persistent profile needs durable accepted input, progress revisions, Activation/worker ownership, Effect intent/outcome evidence, Events/wakes, terminal state, child/peer obligations, and migration/version behavior according to the claims being made.

The first production target may deliberately remain one administrative trust domain, one persistent store, and one fenced active writer per Execution. Multi-region availability and hostile multi-tenant hosting are separate future deployment profiles.

## 19. Packaging direction

The physical package layout should reinforce the architecture over time:

```text
@arrokothi/kernel        Kernel contracts/runtime
@arrokothi/sdk           application-facing assembly/control API
@arrokothi/execution-*   optional native Agent/Workflow runtimes
@arrokothi/driver-*      provider Runtime Drivers
@arrokothi/mcp           MCP boundary package
```

Names are illustrative; package migration is not required merely to adopt the mental model. The important dependency direction is:

```text
application
  ↓
SDK / deployment assembly
  ↓
Kernel + Execution Drivers
  ↓
Execution Runtimes / external providers
```

Provider-specific types should not leak into the Kernel contract.

## 20. Deployment invariants

1. Kernel is a logical role, not necessarily a separate OS process.
2. A web/backend application may embed the Kernel; a sidecar/remote Kernel is a deployment choice.
3. Kernel Worker and Execution Host are distinct roles even when co-located.
4. Host/worker heartbeats are operational signals, not semantic Events.
5. Trusted Execution intentionally accepts ambient Runtime power; Kernel claims cover Kernel-mediated paths only.
6. Isolated Execution requires real containment appropriate to the advertised threat model.
7. Observation/telemetry does not substitute for authority enforcement or isolation.
8. Protocol placement determines which actions are Kernel-mediated; MCP/HTTP/A2A do not redefine Kernel semantics.
9. Persistent/deployment guarantees must be tested on the physical profile being advertised.
