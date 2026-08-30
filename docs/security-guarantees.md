# Security Model and Guarantees

> **Status: v0.4 security contract derived from the current architecture.**
>
> Read [`mental-model.md`](mental-model.md), [`composition.md`](composition.md), and [`runtime-architecture.md`](runtime-architecture.md) first. This document does not redefine Execution, Event, Effect, authority, memory, or lifecycle. It states what security properties the kernel should enforce, which guarantees depend on the deployment environment, and where application policy remains responsible.

The central security principle is:

> **An Execution receives authority, not ambient privilege. A request is not permission.**

---

## 1. Security goal

Arrokoth should support both ordinary developer-controlled applications and future public ecosystems in which Agents, Workflows, peers, models, tools, and uploaded code may be mutually untrusted.

The responsibilities separate into three layers:

```text
application / world policy
  decides what should be allowed
        ↓
Arrokoth kernel
  represents and enforces authority,
  visibility, ownership, messaging,
  Effect authorization, and lifecycle
        ↓
execution-isolation substrate
  prevents executable code from bypassing
  the kernel through host privilege
        ↓
filesystem / network / databases / services / world state
```

For an RPG or social world, for example, the application may decide that one Agent may move, trade, and message nearby peers but may not inspect another Agent's private memory. The kernel should enforce those granted permissions consistently. The kernel should not contain the domain rule that defines what counts as "nearby" or whether a trade is legal.

The distinction is:

```text
application: what should be allowed?
kernel:      is this requested operation allowed?
isolation:   can executable code bypass that decision?
```

---

## 2. Threat model

In a hosted or public-agent deployment, assume the following may be malicious or compromised:

```text
model output
peer Executions
child Executions
user-uploaded Stage/function code
third-party skills/plugins
retrieved documents and web content
capability/tool results
external messages
```

The trusted computing base includes the logical Harness, policy evaluation, the stores that protect kernel state, and any sandbox/isolation backend used to execute untrusted code. A vulnerability in that trusted substrate can invalidate the corresponding guarantee.

Arrokoth v0.4 does **not** attempt full information-flow control. In particular, a parent that legitimately learns a secret may intentionally copy that information into an authorized message or result unless the application adds stronger policy. The current guarantee is narrower: runtime ancestry, resource bindings, Working Notes, or peer identity must not silently create access that was not delegated.

---

## 3. Kernel-level guarantees

When operations go through the Arrokoth runtime, the kernel should preserve these properties:

```text
Effect request       ≠ authorization
ExecutionId          ≠ access capability
ownership            ≠ communication permission
message permission   ≠ memory access
message permission   ≠ cancellation authority
resource binding     ≠ raw credential exposure
note ancestry        ≠ note visibility
child ownership      ≠ unrestricted parent authority
```

Child authority must be derived from the creator's delegable authority plus application/runtime policy. A child must not gain authority merely by requesting it.

```text
requested child authority
        ∩
creator delegable authority
        ∩
application/runtime policy
        ↓
effective child authority
```

Cross-Execution memory/context visibility remains explicit. Knowing another Execution exists, owning it, or being allowed to message it does not imply direct access to its `ExecutionContext`, private memory, Working Notes, mailbox, or cancellation controls.

Externally meaningful operations must remain observable at the Harness boundary so authorization, correlation, confirmation, provenance, retry/idempotency policy, and recovery can be applied consistently.

---

## 4. Two deployment profiles

The same kernel semantics can run under different trust assumptions. The security claim must state which profile is active.

### 4.1 Trusted local / SDK profile

In this profile, the developer owns the host process and may run ordinary application code in-process.

Arrokoth can guarantee that operations performed **through the kernel** obey its authority, memory, messaging, ownership, and Effect semantics.

It cannot guarantee that arbitrary host code cannot bypass the SDK. A developer-controlled Node/Python process can directly open files, sockets, databases, or subprocesses if the operating system permits it.

Therefore:

> **The trusted SDK profile provides semantic enforcement for Arrokoth-mediated operations, not containment against the owner of the host process.**

Static checks, lint rules, or runtime assertions can catch mistakes, but they are not an operating-system security boundary.

### 4.2 Isolated hosted / untrusted-code profile

In this profile, executable Agent/Stage/plugin code may be adversarial.

A stronger guarantee requires that such code run inside a reviewed isolation backend with no ambient path around the Harness. The intended posture is:

```text
untrusted code
  ↓
restricted local computation environment
  ├── explicit inputs
  ├── explicitly exposed read-only/materialized resources
  ├── bounded local scratch/workspace
  └── controlled Effect/capability bridge
        ↓
Harness authorization
        ↓
external resources / world state
```

The sandbox should not receive raw production credentials merely because the enclosing Execution has Resource Authority. Network, filesystem, subprocess, secret, and host-resource access should be deny-by-default or explicitly scoped according to the selected backend and application policy.

In this profile, static analysis and AI-assisted rewriting remain developer-experience features. Isolation plus runtime authorization is the security boundary.

---

## 5. Stage-local computation and resource exposure

A Workflow Stage may perform substantial local computation without becoming another Execution:

```text
Stage-local computation
  ├── functions
  ├── parsing / validation
  ├── LLM inference
  ├── local filtering / reranking
  ├── context construction
  └── computation over already-exposed data
```

The Stage is free to compute over what the enclosing Execution has deliberately exposed. This does **not** mean Stage code should receive unrestricted host access.

A useful rule is:

> **Local code may freely transform information already inside its exposed computation environment. Expanding that environment requires an authorized runtime boundary.**

This matters for RAG.

### Materialized/local retrieval

If a bound resource is deliberately materialized as a safe read-only corpus or local index, Stage code may query, filter, or rerank it directly:

```text
BoundResource
  ↓ explicitly materialized read-only view
local index / document snapshot
  ↓
Stage-local retrieval and reranking
```

No Effect is required for every local query because the data is already inside the exposed computation environment.

### Live/external retrieval

If the resource is a live database, remote vector service, browser, private API, or other runtime-managed resource, binding means the Execution is eligible to use it; it does not imply that arbitrary Stage code receives raw credentials or unrestricted transport access.

```text
BoundResource: production-vector-db
        ↓
UseCapability / retrieval Effect
        ↓
Harness authorization
        ↓
resource adapter owns credentials
        ↓
result observation
```

This keeps authority enforcement meaningful while still allowing rich Stage-local RAG composition around the mediated retrieval call.

---

## 6. Uploaded code: validation is not containment

Future UI/UX may allow a user to upload Function Stage or other executable code. Arrokoth may provide:

```text
syntax/type validation
restricted import checks
AST/static analysis
policy linting
AI suggestions
automatic proposals to rewrite direct external access as Effects
```

These are useful because they can reject obvious violations early and explain how to express the same intent through the Effect gateway.

They must not be described as a proof that arbitrary code is safe. General-purpose code can hide behavior behind dependencies, dynamic loading, generated code, subprocesses, native extensions, or indirect calls.

The failure model should therefore be:

```text
validator misses malicious operation
        ↓
sandbox still blocks ambient access
        ↓
code must use exposed Effect bridge
        ↓
Harness can authorize or reject
```

not:

```text
validator accepted code
        ↓
run with host credentials and unrestricted network
```

---

## 7. Execution-to-Execution isolation

A public Agent ecosystem should treat each Execution as a principal with explicit authority rather than trusting Agents to follow social conventions.

For example:

```text
Execution A
  may message B
  may trade through World.trade
  may read public-map resource
  may not read B private memory
  may not cancel B
  may not mutate world storage directly
```

The Agent may request any operation it can express. The Harness decides whether the request is authorized.

This is analogous to an authoritative multiplayer server:

```text
untrusted client/Agent
        ↓ request
trusted server/Harness
        ↓ validate policy and authority
world/resource mutation
```

An Agent saying "give me admin" or "transfer all of B's inventory" must not make that statement true.

---

## 8. No ambient credentials

For untrusted execution, prefer capability/resource handles over raw secrets.

Avoid exposing:

```text
production database passwords
cloud provider credentials
host environment secrets
unrestricted network access
container-runtime sockets
shared writable host directories
other Executions' state stores
```

Prefer exposing:

```text
Capability: knowledge.query
Resource: corpus-17 read-only
Capability: world.move
Capability: world.trade
MessageAuthority: selected peers
SpawnAuthority: bounded child definitions
```

The resource/capability adapter may hold the underlying credential outside the untrusted execution environment.

---

## 9. Defense in depth

Different mechanisms solve different problems:

```text
static checks / compiler diagnostics
  catch mistakes early

AI-assisted suggestions
  help translate unsupported direct access into Effects

Harness authority + policy
  decide which requested operations may occur

sandbox / process / VM / WASM isolation
  prevent arbitrary executable code from bypassing the Harness

resource limits
  bound CPU, memory, process count, output, time, and tool-call amplification

tracing / provenance / audit
  reconstruct what was requested, allowed, denied, and observed
```

No single layer should be treated as sufficient for hostile multi-tenant code.

---

## 10. Existing implementations we can reuse behind Arrokoth ports

Arrokoth should not reimplement every sandbox mechanism from scratch. Existing open-source projects already provide useful execution-isolation components and patterns. They should remain **implementation backends**, not sources of kernel semantics.

### OpenClaw

OpenClaw separates sandbox configuration from its agent semantics and currently supports Docker, SSH, and OpenShell sandbox backends. Its backend-neutral sandbox handle is explicitly designed so Docker, SSH, and future providers implement a common execution/filesystem surface. Its Docker posture includes configurable per-agent/per-session scope, workspace access (`none`/`ro`/`rw`), default no-network mode, read-only root, dropped Linux capabilities, and `no-new-privileges`.

Relevant upstream references:

- [OpenClaw security model](https://github.com/openclaw/openclaw/blob/main/docs/gateway/security/index.md)
- [OpenClaw sandboxing](https://github.com/openclaw/openclaw/blob/main/docs/gateway/sandboxing.md)
- [OpenClaw backend-neutral sandbox handle](https://github.com/openclaw/openclaw/blob/main/src/agents/sandbox/backend-handle.types.ts)

OpenClaw also explicitly documents that its normal Gateway security model assumes one trusted operator boundary and is not itself a hostile multi-tenant boundary. Therefore we may reuse backend mechanisms or architecture patterns, but Arrokoth's hosted guarantee must be validated against Arrokoth's own threat model rather than inherited from OpenClaw's product claim.

### Hermes Agent

Hermes provides multiple execution backends and useful defense-in-depth mechanisms: Docker/remote execution environments, environment-secret scrubbing, bounded execution, tool whitelisting, an RPC bridge for programmatic tool calls, and restricted subagent tool/context exposure.

Relevant upstream references:

- [Hermes security model](https://hermes-agent.nousresearch.com/docs/user-guide/security/)
- [Hermes code execution](https://hermes-agent.nousresearch.com/docs/user-guide/features/code-execution/)
- [Hermes execution backend configuration](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/configuration.md)
- [Hermes Docker environment](https://github.com/NousResearch/hermes-agent/blob/main/tools/environments/docker.py)

Hermes' local execution backend is explicitly not isolated, so hostile uploaded code should not be considered safe merely because it uses Hermes code-execution helpers. The reusable pieces are mechanisms such as sandbox backends, secret filtering, RPC capability exposure, resource limits, and child-tool restriction, subject to review.

### Dify Sandbox

[Dify Sandbox](https://github.com/langgenius/dify-sandbox) is a standalone service specifically designed to execute untrusted code in a multi-tenant environment while restricting resources and system calls. It is another candidate implementation backend or reference for a future Arrokoth untrusted-code runner.

### Reuse rule

Any adopted backend should sit behind an Arrokoth-owned abstraction such as a sandbox/execution-environment port:

```text
Arrokoth Execution / Stage semantics
        ↓
Arrokoth isolation/environment port
        ↓
Docker / OpenClaw-derived backend / Hermes-derived backend /
Dify Sandbox / managed sandbox / VM / WASM / other provider
```

Before incorporating upstream code or depending on a backend, review its current threat model, defaults, escape hatches, maintenance state, license/notice requirements, and security history. Hermes Agent and OpenClaw are currently MIT-licensed; Dify Sandbox is Apache-2.0. License compatibility does not replace security review.

---

## 11. What Arrokoth cannot guarantee

The kernel cannot preserve a strong hosted isolation claim if the application or deployment deliberately bypasses its boundary. Examples include:

```text
running hostile code in an unrestricted host process
handing raw production credentials to the sandbox
mounting sensitive host directories read-write
sharing one writable sandbox across mutually hostile principals
allowing unrestricted host/network escape paths
letting application code mutate kernel stores directly
using an isolation backend with a vulnerability or unsafe configuration
policy intentionally granting excessive authority
```

The kernel also cannot stop an authorized parent from intentionally communicating information it legitimately knows without a stronger information-flow system.

Security documentation and diagnostics should therefore report the active deployment profile and any configuration that weakens the corresponding guarantee.

---

## 12. Security conformance scenarios

Before claiming the isolated hosted profile, executable tests should demonstrate at least:

1. A child cannot obtain authority outside the creator's delegable envelope.
2. A peer that can message another Execution still cannot read its memory or cancel it without separate authority.
3. A child with narrower memory/resource visibility does not inherit confidential parent Working Notes by ancestry.
4. Untrusted Stage code cannot read host secrets, open unrestricted network connections, or access another Execution's workspace through ambient privilege.
5. The same Stage can request an allowed external operation through an Effect and receive the authorized result.
6. A bound live database/resource can be used through its capability adapter without exposing its raw credential to untrusted code.
7. A denied Effect produces no external mutation and leaves an auditable denial/result path.
8. Resource limits prevent one Execution from trivially exhausting the host or monopolizing the scheduler.
9. The trusted local profile remains usable without pretending to provide hostile-code containment.

These scenarios should be rerun for every isolation backend that Arrokoth advertises as compatible with the hosted profile.

---

## 13. Security invariant

The desired end state is:

```text
Agent/model/code may be malicious
        ↓
it can compute over what it was explicitly given
        ↓
it may request additional actions/resources
        ↓
request crosses the Harness
        ↓
authority + application policy decide
        ↓
isolation prevents a hidden path around that decision
```

> **Stage code may compute freely over what has been exposed to it. Executable code must not gain additional environmental authority merely because it can run.**
