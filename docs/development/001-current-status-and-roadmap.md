# Current status and roadmap

> **Status:** primary active development plan for the ArrokothI agent-kernel 0.8.x line.
> **Kernel baseline:** the capability baseline summarized in
> [`002-implemented-kernel-baseline.md`](002-implemented-kernel-baseline.md).
> **Role:** engineering roadmap, not canonical architecture.

Canonical semantics remain in the documents indexed by [`../README.md`](../README.md). This plan
starts from the implementation evidenced in [`002-implemented-kernel-baseline.md`](002-implemented-kernel-baseline.md)
and converts unresolved work into dependency-ordered vertical proofs.

## 1. Version and release-gate convention

```text
Project/package development version:  ArrokothI agent-kernel 0.8.1
Architecture-complete release gate:    separate; not implied by the package version
```

`0.8.1` is the clean Execution-kernel package baseline under the `arrokothi` /
`@arrokothi/*` identity. It does not claim architecture completeness.

### Release-readiness verdict

**NO — the current kernel is not ready to claim architecture completeness.**

The current kernel has substantial, conformance-backed execution, composition, memory, authority,
provider, and narrow MCP foundations. The following architecture-completion work still lacks an
integrated reference proof:

- portable public schemas and service/resource descriptors;
- MCP expansion beyond synchronous Tools and an A2A/service projection;
- heterogeneous progressive discovery and lazy descriptor hydration;
- explicit hosted execution profiles and one credible isolated backend;
- durable restart/recovery of real waiting and in-flight state;
- an end-to-end campaign exercising the architecture together.

The verdict is based on current source/tests and canonical unresolved constraints, not the package
version.

## 2. Completed baseline

The implemented baseline is organized by capability:

- Execution identity, lifecycle, mailbox, scheduler, Harness mediation, Events, Effects,
  PendingOperations, and ControllerResumptions;
- provider-neutral model resolution/invocation plus Gemini and Strands boundary packages;
- Catalog → Effective Authority → Active View → immutable model projection;
- reference Agent and staged Workflow controllers;
- recursive child execution, peer messaging, user input, exact-payload confirmation, and
  cancellation/lineage controls;
- Structured Memory, Working Notes and explicit handoff, Derived Semantic Memory with provenance
  and explicit promotion;
- optimistic Structured Memory conflicts and system-defined parallel Workflow fork/join with
  branch Effects/resumptions and versioned branch writes;
- narrow MCP synchronous Tool import/export with strict identity, schema, result, authority, and
  outcome-certainty rules.

The optional `@arrokothi/sdk` application bootstrap now composes this baseline; see
[SDK design and findings](009-sdk-bootstrap-design-and-findings.md). It does not change the H–N
architecture-completion sequence or deployment claims.

The exact implementation/test map and intentional deferrals are in
[`002`](002-implemented-kernel-baseline.md).

## 3. Dependency order

```text
H  Portable schema + service descriptor foundation
       ↓
I  MCP expansion beyond synchronous Tool proof
       ↓
J  A2A / exported Agent-Workflow service projection
       ↓
K  Heterogeneous progressive discovery + lazy descriptor exposure
       ↓
L  Hosted execution + executable security profiles
       ↓
M  Durable restart/recovery semantics
       ↓
N  Whole-architecture integration + release-readiness campaign
```

Some investigation may overlap, but each minimum vertical proof depends on the accepted contracts
above it. Structured concurrency is part of the implemented baseline; extend it only through an
explicit architectural decision.

## 4. H — Portable schema and service-descriptor foundation

### Goal

Define the smallest provider- and protocol-neutral public description layer required to describe
operations, resources, Agent/Workflow services, interaction requirements, asynchronous external
handles, Skills, and public inputs/outputs.

### Why it is still needed

The current `ValueSchema` / `ObjectSchema` vocabulary supports internal validation and the narrow MCP
Tool proof, but it is not yet a declared portable service contract. The kernel has no complete
portable `Resource`, Agent/Workflow service descriptor, interaction/input requirement, async handle,
or Skill descriptor/profile surface.

### Canonical owner

[`../interoperability.md`](../interoperability.md), with Definition/Execution consequences owned by
[`../execution-runtime.md`](../execution-runtime.md), composition consequences by
[`../composition.md`](../composition.md), and authority/exposure consequences by
[`../authority.md`](../authority.md).

### Existing substrate

- `packages/core/src/schema/value-schema.ts` and schema-bound validation;
- `CapabilityOperationDescriptor`, `CapabilityCatalog`, `OperationRef`, and active-view projection;
- MCP's strict accepted-subset importer and recursive `toJsonSchema` exporter;
- current Definition validation and Agent/Workflow public input/terminal-result shapes.

### First schema decision to test

Start with an explicitly declared **ArrokothI portable schema profile** whose accepted forms map
losslessly to a documented subset of JSON Schema 2020-12. Do not claim support for all of JSON
Schema merely because protocol payloads use it, and do not freeze a larger custom schema language
than current interop proofs require. The proof must state:

```text
accepted schema set
normalization rules
round-trip / acceptance-set fidelity
unsupported-keyword refusal
version/dialect identifier
```

The choice between retaining `ValueSchema`, replacing it, or layering a public dialect over it is
an explicit design decision for H; it is not predetermined by MCP wire types.

### Minimum vertical proof

One portable descriptor bundle that can:

1. describe one Operation and one Resource with public input/output schemas;
2. describe one Agent or Workflow service with required interaction/input and an optional
   long-running external handle contract;
3. carry one Skill descriptor/profile without turning the profile into runtime authority;
4. validate and round-trip through a protocol-neutral JSON form;
5. project into one existing native capability path without changing Effect semantics.

### Explicit non-goals

- full JSON Schema 2020-12 support before evidence requires it;
- protocol-native types in core;
- universal resource, claim, or entity ontology;
- a new Effect/Event kind or Execution lifecycle;
- hosted containment or durable backend implementation.

### Exit criteria

- the portable schema/dialect boundary and versioning rule are documented;
- unsupported schemas fail closed rather than widen acceptance;
- Operation, Resource, service, input-requirement, async-handle, and Skill descriptor shapes have
  conformance coverage as plain provider-neutral data;
- authority is absent from or explicitly distinct from discovery metadata;
- existing runtime and MCP Tool behavior remains compatible.

### Dependencies

Current implementation baseline only.

## 5. I — MCP expansion beyond the synchronous Tool proof

### Goal

Extend the MCP adapter only where H's portable contracts can represent the semantics honestly.

### Why it is still needed

The current proof covers synchronous Tool list/call import and explicit Tool export. It does not
cover Resources, Prompts/templates, long-running Tasks/handles, elicitation/input-required, or
notifications/change signals.

### Canonical owner

[`../interoperability.md`](../interoperability.md), with Event/Effect and waiting semantics from
[`../execution-runtime.md`](../execution-runtime.md), and authority/exposure from
[`../authority.md`](../authority.md).

### Existing substrate

- `packages/interoperability/mcp` import/export boundary;
- accepted synchronous Tool identity/schema/result/outcome rules summarized in
  [`005`](005-interoperability-baseline-and-next-constraints.md);
- kernel `Resource`-adjacent local-resource ports, PendingOperation, user-input, and wait machinery;
- H's accepted portable descriptors and schemas.

### Minimum vertical proof

Select the smallest two additions supported by evidence—likely one read-only Resource projection
and one long-running/input-required path—and prove both import and/or export mappings without
collapsing protocol objects into kernel objects.

Required mapping constraints:

```text
MCP Task          != Execution
MCP notification  != Event automatically
MCP authorization != Execution authority
MCP elicitation   maps only through an explicit ArrokothI interaction requirement
```

### Explicit non-goals

- implementing every MCP capability at once;
- treating protocol session state as an Execution;
- treating annotations or discovery metadata as grants;
- silently converting uncertain remote outcomes to definite failure;
- moving the MCP SDK into core.

### Exit criteria

- every supported MCP object has a written import/export mapping and refusal behavior;
- change signals become Events only through an explicit runtime mapping;
- long-running handles preserve honest outcome certainty and do not impersonate Execution identity;
- schema mappings retain the H acceptance set;
- adapter-specific conformance tests and at least one end-to-end canary pass.

### Dependencies

H.

## 6. J — A2A and exported Agent/Workflow service projection

### Goal

Project portable ArrokothI Agent/Workflow services into A2A or an equivalent service boundary while
keeping the kernel ontology authoritative.

### Why it is still needed

Current external interoperability proves capability Tools, not the publication or invocation of
an Agent/Workflow service with inputs, progress, waiting, terminal result, and cancellation.

### Canonical owner

[`../interoperability.md`](../interoperability.md), with Agent/Workflow/Execution meaning from
[`../composition.md`](../composition.md) and [`../execution-runtime.md`](../execution-runtime.md).

### Existing substrate

- Agent and Workflow Definitions plus independent Execution identity;
- terminal results, child-call links, messages, user input, cancellation, and lifecycle state;
- H portable service descriptors and I's protocol-boundary lessons.

### Minimum vertical proof

Export one Agent and one Workflow service, invoke each through the protocol boundary, correlate
progress and one input-required interaction, and obtain an honest terminal result/cancellation
outcome.

Preserve:

```text
A2A Task    != Execution
A2A Message != SendMessage Effect
service descriptor != Definition authority
```

### Explicit non-goals

- replacing Agent/Workflow/Execution with A2A ontology;
- universal federation, routing, registry, or trust model;
- automatic authority grants from an agent card/service descriptor;
- durable restart or hostile-code containment.

### Exit criteria

- protocol and kernel identities remain separately inspectable and correlated;
- exported service input/output and status mappings are lossless for the supported subset;
- protocol messages request kernel communication only through explicit mapped operations;
- authorization is evaluated by ArrokothI before consequential work;
- unsupported protocol states fail closed and are documented.

### Dependencies

H and the boundary discipline proven in I.

## 7. K — Heterogeneous progressive discovery and lazy descriptor exposure

### Goal

Scale discovery across Operations, Resources, Agent/Workflow services, and Skills while preserving
the authority/exposure narrowing chain and bounded model context.

### Why it is still needed

The current catalog and active-view mechanism is strong for a known capability universe, but no
reference path proves heterogeneous discovery, ranking, lazy descriptor/schema hydration, and a
small immutable Active View over a large authorized universe.

### Canonical owner

[`../authority.md`](../authority.md), with descriptor meaning from
[`../interoperability.md`](../interoperability.md) and context/memory selection boundaries from
[`../memory.md`](../memory.md).

### Existing substrate

```text
Catalog → Effective Authority → Active View → immutable model projection
```

plus content-derived view/projection identities, identity-only narrowing, deterministic local
retrieval, and H/J heterogeneous descriptors.

### Minimum vertical proof

```text
authorized descriptor universe
  → cheap deterministic retrieval/ranking
  → small heterogeneous Active View
  → lazy describe/schema hydration
  → immutable projection
  → call
```

Use a deterministic non-LLM selector first. Measure recall, latency, hydrated descriptor count,
and model-token cost before considering an LLM selector.

### Explicit non-goals

- discovery granting authority;
- exposing the whole catalog merely because it is discoverable;
- mandatory embeddings, vector database, or extra model call;
- one opaque component that combines authorization, ranking, context compilation, and projection;
- mutable model projections during an in-flight invocation.

### Exit criteria

- discovered-but-unauthorized descriptors cannot enter an Active View;
- only selected descriptors hydrate expensive schemas/details;
- view/projection membership is deterministic and reconstructable;
- a returned alias resolves only through the persisted immutable projection;
- scale and token-cost evidence covers representative small and large catalogs.

### Dependencies

H and at least one heterogeneous protocol/service source from I or J.

## 8. L — Hosted execution and executable security profiles

### Goal

Make deployment trust profiles explicit and prove one real containment boundary.

### Why it is still needed

The local SDK enforces semantic boundaries but does not provide physical isolation from hostile
code. A hosted product must say what runs where, under which identity, with which credentials,
network/filesystem access, resource limits, and failure behavior.

### Canonical owner

[`../security-guarantees.md`](../security-guarantees.md), with execution mechanics from
[`../execution-runtime.md`](../execution-runtime.md) and authority limits from
[`../authority.md`](../authority.md).

### Existing substrate

- Effect mediation, reauthorization, exact-payload confirmation, authority attenuation;
- provider/capability ports and serializable controller progress;
- explicit distinction between semantic enforcement and physical containment.

### Required profiles

```text
trusted local         in-process code; semantic controls, no hostile-code containment claim
hosted declarative    controlled definitions/adapters; explicit service/credential boundary
hostile-code isolated untrusted code behind a real isolation backend and resource policy
```

### Minimum vertical proof

Define an `ExecutionEnvironment`/isolation seam and run one untrusted capability or controller
extension in a credible isolated backend with explicit filesystem, network, secret, CPU/memory,
timeout, termination, and audit behavior. Prove fail-closed behavior when isolation is unavailable.
The proof must also demonstrate that the physical environment is replaceable infrastructure rather
than runtime identity: one logical Execution can release, lose, or replace its isolated environment
and later reacquire a suitable environment without becoming a different Execution. Backing
credentials remain outside the hostile environment and are exercised only through mediated,
authorized operations.

### Explicit non-goals

- claiming ordinary Node process separation is a sandbox;
- silently falling back from isolated to trusted-local execution;
- making every embedded workload pay hosted/sandbox costs;
- provider-specific isolation types in core;
- a complete multi-tenant control plane.

### Exit criteria

- each profile has executable configuration and accurate guarantees/non-guarantees;
- the isolated proof prevents at least the declared filesystem/network/secret escapes;
- resource exhaustion, timeout, cancellation, and audit behavior are tested;
- identity and credential boundaries are distinct from Execution identity;
- an Execution can replace/reacquire an isolated environment without changing logical identity;
- the hostile environment never receives raw backing credentials for mediated operations;
- disabled isolation adds no external round trip to the trusted-local path.

### Dependencies

H for declarative contracts and K for governed exposure; I/J where the hosted proof crosses a
protocol boundary.

## 9. M — Durable restart and recovery semantics

### Goal

Prove process restart/recovery for real pending execution state, not merely reconstruction from an
in-memory object graph.

### Why it is still needed

Current in-memory/reference-store and fresh-controller reconstruction tests prove serializable
state boundaries, but they do not prove durable transactions, lease/requeue behavior, external
idempotency, or recovery of uncertain in-flight outcomes after a process crash.

### Canonical owner

[`../execution-runtime.md`](../execution-runtime.md), with memory references from
[`../memory.md`](../memory.md), security consequences from
[`../security-guarantees.md`](../security-guarantees.md), and composition links from
[`../composition.md`](../composition.md).

### Existing substrate

- `RuntimeStore`, scheduler, serializable Execution/controller state and wait conditions;
- Effect journal/idempotency keys, PendingOperations, ControllerResumptions;
- child/peer/user-input/confirmation links;
- no complete durable kernel backend.

### Minimum durable reference path

One durable store/scheduler implementation must survive an actual process stop/restart with:

```text
Execution + lifecycle                 controller progress
mailbox + Event cursor                PendingOperations
ControllerResumptions                 dependency waits
confirmations + user-input requests   child/peer links
Effect journal + idempotency          memory/resource references
in-flight uncertain outcomes          scheduler/requeue state
```

`PendingOperation` and `ControllerResumption` remain semantically distinct even if one backend
shares transaction or storage machinery.

The durable implementation must also preserve the authoritative source facts and references needed
for later authorized context/reconstruction strategies after restart. This is an optionality
requirement, not a unified-log requirement: model trace or rendered invocation context must not
become recovery-critical, and runtime Events/history, Effect journal, controller progress, memory,
resources, and trace retain their distinct meanings even if one backend shares storage machinery.

### Explicit non-goals

- choosing a universal durable platform for every deployment;
- treating reconstruction over the same in-memory store as crash durability;
- retrying uncertain consequential work as if it definitely failed;
- collapsing Events, Effect journal, controller progress, and trace into one log;
- requiring model trace or previously rendered prompt/context for correctness or restart;
- redesigning controller semantics for backend convenience.

### Exit criteria

- kill/restart tests recover each listed pending-state class;
- transaction boundaries prevent lost wake-ups and partial dependency registration;
- replay/dispatch policy preserves honest `success | failure | unknown` certainty;
- duplicate external consequences are prevented or surfaced according to declared guarantees;
- recovery does not merge PendingOperation with ControllerResumption meaning;
- durable source facts remain available for an authorized fresh-context reconstruction strategy
  without depending on model trace as semantic state;
- reference durability cost/write amplification is measured.

### Dependencies

L's deployment/identity boundary and the completed runtime substrate. Protocol-handle recovery from
I/J should be included when available.

## 10. N — Whole-architecture integration and release-readiness campaign

### Goal

Exercise the implemented architecture as one system and turn evidence into an explicit release
decision.

### Why it is still needed

Independent conformance slices do not prove that composition, memory, discovery, protocols,
containment, and restart work together within usable cost and authoring complexity.

### Canonical owner

All canonical owners through the precedence map in [`../README.md`](../README.md). This tranche may
identify contradictions but must not resolve them by silently editing one owner.

### Existing substrate

Everything accepted in H–M plus the baseline in [`002`](002-implemented-kernel-baseline.md), the
quality discipline in [`003`](003-agent-effectiveness-guidance.md), and the efficiency/ergonomics
checks in [`004`](004-efficiency-and-developer-ergonomics.md).

### Minimum integrated program

A single reproducible program must include:

- multiple Executions with recursive Agent/Workflow composition;
- parallel Workflow branches and an explicit join;
- shared Structured Memory with at least one observed conflict and deliberate handling;
- Working Notes local use and explicit handoff;
- Derived Semantic Memory retrieval with provenance and explicit promotion;
- user input and mechanical confirmation;
- heterogeneous discovered capabilities/services through a small Active View;
- MCP and/or A2A projection;
- one hosted/isolated execution path;
- restart/recovery while real pending state exists;
- at least one long-lived Execution that survives process restart after its prior isolated
  environment is gone, reacquires a fresh environment, receives a bounded freshly compiled model
  context from retained authorized sources rather than its entire lifetime history, and continues
  under the same logical Execution identity.

### Explicit non-goals

- declaring readiness from version numbers or test count alone;
- adding new ontology during the integration campaign without separate architecture review;
- hiding unsupported combinations behind demos;
- conflating conformance, performance, security, and behavioral quality.

### Exit criteria

- semantic conformance, behavioral eval, performance, security, and restart evidence are reported
  separately and all meet declared gates;
- the integrated program completes across a process restart and contains at least one genuine
  protocol boundary and isolated path;
- optional guarantees have measured, attributable cost;
- common Agent and Workflow authoring paths remain understandable and documented;
- every remaining gap is explicitly experimental/deferred;
- an independent architecture/documentation review accepts the evidence.

### Dependencies

H–M.

## 11. Roadmap discipline

Every tranche should begin with a fresh audit of its canonical owner, current source, and
conformance tests. Each implementation review must state:

```text
semantic guarantee added
simple-path physical work added
provider/protocol boundary affected
security and durability consequences
explicit deferrals
evidence that disabled paths remain low cost where architecture permits
```

If source, tests, and a canonical owner genuinely conflict, stop and report the ambiguity for an
explicit architecture decision. Development history is evidence, never authority by recency.
