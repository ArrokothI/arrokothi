# Heterogeneous environments, Machine/ABI, and selective reuse

[Study home](README.md). The question is whether a common environment adds useful guarantees while preserving the engines that make the application worth running. Compatibility alone is insufficient.

## Reuse implementation versus outsource semantic ownership

A useful boundary can reuse a database transaction, durable job scheduler, model SDK, native checkpoint codec, or sandbox without adopting those implementations' meanings as its public contract. It must, however, map their actual behavior honestly. For example, a backend that retries an external call cannot satisfy a contract forbidding blind retries of an unknown non-idempotent action just because it calls its execution “durable.” The adapter must configure, intercept, or reject the mismatch.

Conversely, wrapping a framework's `run()` and recording its final text does not let ArrokothI claim it authorized the framework's internal tools, reconstructed its context, or can resume its internal computation. Those responsibilities still belong to the framework. That is a valid integration if the declared assurance is narrow.

Use one authoritative owner for each responsibility:

| Responsibility | External native task | Mediated native engine | Native ArrokothI controller |
|---|---|---|---|
| Internal reasoning, context, model routing | Upstream engine | Upstream engine, except explicitly supplied host services | Controller/executor strategy |
| Native checkpoint | Upstream engine; opaque handle | Upstream engine; pinned codec/version and recovery bridge | Controller progress accepted by Harness |
| Enclosing application job and result acceptance | ArrokothI or existing application runtime, chosen once | ArrokothI | ArrokothI |
| Internal tool authority | Upstream; ArrokothI can constrain outer credentials/environment | ArrokothI for every demonstrably routed action; upstream/OS for declared residual paths | Harness for governed actions; trusted code still requires containment to prevent bypass |
| Human business approval | Application, with explicit scope | ArrokothI binding + application UI, if supported by bridge | Harness binding + application UI |
| Channel delivery | Native gateway or application adapter | Same | Application adapter |
| Physical process/workspace | Upstream or selected environment provider | Selected provider, with exclusive lease/cleanup ownership | Selected provider |

An enclosing job ID and native session ID are not inherently duplicate state: they describe different lifetimes. They become harmful duplication when both are authoritative for the same lifecycle transition, both retry the same action, or both resume a single native checkpoint independently. Every integration should include a written ownership table and failure-state translation before code grows around it.

### Assurance is a capability vector, not a ladder

The product vision's integration spectrum is useful orientation, but a single label such as “adapted” can hide material differences. A native runtime might support complete tool mediation but no crash resumption; another might resume reliably but retain direct network authority.

A candidate adapter manifest should declare and test at least:

- task identity and native session mapping; checkpoint codec and supported engine versions;
- resume mode: same-process only, native restart, replay, restart-from-input, or unsupported;
- tool paths mediated, indirect/native paths remaining, and credential/egress containment;
- current principal/authority restoration and exact confirmation support;
- cancellation mode, deadline propagation, physical termination, and late result behavior;
- output streaming/replay support, artifact access, and outcome reconciliation;
- model/context ownership and observable usage/request evidence.

These are proposals for conformance dimensions, not a mandatory production schema to design in full today. The first adapter needs only the dimensions exercised by its application, with unsupported claims explicit. Credentials remain outside checkpoint payloads. A recovered job must re-establish its principal and bindings; a stored session key is not a bearer capability.

## Promising combinations and their counterfactuals

### A native specialist plus a governed deterministic action

A Hermes or coding Agent investigates and produces an artifact. A deterministic application validates the artifact and derives an exact business-action payload. A human authorizes that payload; a governed operation dispatches it with an identity and reconciliation contract. The native engine retains its planning, context, tools for the investigation, and workspace. ArrokothI governs the shared action and the enclosing handoff.

**Potential added value:** shared evidence, precise authority boundaries, and recoverable handoffs without rewriting specialist cognition. **Counterfactual:** an ordinary queue, database record, and approval endpoint may do this just as well. Compare implementation effort and injected failure outcomes. Do not credit ArrokothI for “safety” supplied by the deterministic validator that both implementations share.

### OpenClaw ingress plus a long-lived application process

OpenClaw owns user sessions, routing, and delivery. The application starts or addresses a durable business process with its own lifetime. Replies carry stable correlation and delivery identity back to the gateway. ArrokothI may own the business process's authority and wait state while OpenClaw owns the channel lifecycle.

**Potential added value:** the business process survives gateway sessions and spans services. **Failure mode:** treating every gateway turn as a new mirrored Execution, competing notification state machines, or retries that resend already delivered output. If a native OpenClaw task and delivery queue already meet the need, the extra runtime has little justification.

### Dify application plus another independent participant

A published, versioned Dify application supplies a bounded result or artifact. ArrokothI coordinates its result with a separately valuable Agent and a shared external action. Dify retains its graph, forms, datasets, and internal runtime. The adapter must distinguish native pause from completion, and distinguish accepted output from deferred human work.

**Potential added value:** composition across independent application boundaries. **Failure mode:** mirroring every Dify node and form into ArrokothI, inventing a second resume token, or translating the graph to an impoverished common language. If the entire process can be authored naturally in Dify, use Dify.

### CrewAI for a bounded team task

A Crew performs its native multi-role process and returns an artifact with cost and execution identity. ArrokothI only manages the surrounding application's contract. A deeper bridge is justified if the same consequential operation must be governed consistently across this Crew and another engine.

**Potential added value:** independent native team strategies under one application contract. **Failure mode:** nested planner hierarchies, two checkpoint owners, duplicated memory, and translating every Flow event into an ArrokothI Event. If a CrewAI Flow plus normal services suffices, adding another Workflow is overhead.

### Humans and external services

A human is normally an authenticated participant responding to an addressed request, not an Agent to be executed. A stateless API is normally an operation provider, not an Execution. A long-lived external job may deserve a managed task identity because it has independent lifetime, cancellation, and results. A deterministic function needs an Execution only when those properties matter. This distinction prevents an “everything is an Agent” ontology from consuming the kernel.

## The logical Machine research: separate four hypotheses

The [Machine/ABI note](../research/arrokothi-machine-abi-and-program-model.md) is serious research, not merely a shell metaphor. It proposes application-shaped namespaces, optional mounts, progressive manuals, bounded programs, suspended calls, and potentially shared computation for Agent and Workflow control. It explicitly separates logical capabilities from containment and asks for simplification. Those are good constraints. Its post-1.0 scheduling is not a reason to postpone every cheap discriminating experiment while the kernel is still inexpensive to change.

### H1: a stable, authorized environment boundary

A logical environment presents versioned operation contracts, resource references, permitted discovery, and resumable interactions independent of an Agent's internal model or planning algorithm. This is promising as an **environment contract**. It need not simulate files, processes, or an operating system, and it need not create a new universal Agent base class.

A minimum experimental call envelope needs a caller execution/principal binding, logical operation and schema version, invocation identity, concrete arguments, relevant resource revision, deadline/cancellation context, and an attributable outcome or wait reference. Authority is checked by the host on the concrete call. Resource identifiers are scoped references, not implicit access tokens. This description is a design sketch, not an accepted interface.

The strongest counterexamples already exist: OpenClaw's [host capabilities](../../../openclaw/src/agents/harness/host-capability-types.ts) around native runtimes, and Dify's [bindings and leases](../../../dify/dify-agent/src/dify_agent/runtime_backend/protocols.py). ArrokothI's hypothesis must add **portability with preserved guarantees and lower integration cost**, not just a more abstract name for these facilities.

### H2: progressive discovery and context acquisition

The [JIT note](../research/jit-capability-namespace-and-context-scouts.md) proposes a hierarchy over the authorized descriptor universe and read-only scouts returning compact evidence. Separate discovery, content retrieval, and action activation: metadata can reveal sensitive existence; reading content is itself an authority and egress decision; loading a schema still does not grant the action.

Test at least flat direct tools, deterministic retrieval, Hermes-style search/describe/call, hierarchical navigation, and navigation with a scout. Preserve a small eager set of essential controls. Vary catalog size, vocabulary ambiguity, permission changes, and tasks requiring rare operations. A hierarchy can impose an unfamiliar taxonomy; a scout can omit decisive evidence, hallucinate provenance, or cost more than it saves. A small catalog often needs no discovery layer.

A scout should initially be an application composition or engine strategy. Give it only required read operations, bounded cost, and provenance-preserving outputs. No new kernel `Scout` type is needed. Fewer tokens are useful only if end-to-end task success, authority non-disclosure, and latency remain acceptable.

### H3: bounded programs reduce repeated model mediation

A model may already know a sequence: retrieve records, filter deterministically, calculate, then request a governed action. Requiring a new model turn for each elementary data transformation can be wasteful. A bounded logical program with data bindings, conditional branches, and explicit host calls might express the sequence once and suspend at external boundaries.

This is plausible for structured business applications as well as coding. But an SDK function, a native code tool, or an ordinary Workflow can already remove model round trips. The experiment must distinguish value from **program execution in general** from value created by a new ArrokothI Program representation.

Prototype only a small explicit representation: local values, bounded iteration if required, deterministic transforms, host-call instructions, and serializable continuation position. Exclude arbitrary host imports, network, filesystem, dynamic evaluation, and unbounded loops from the first logical profile. Each resumed action gets fresh authorization and a stable call identity. Partial completion is not an atomic multi-action transaction. An unknown action cannot be skipped or blindly retried because the interpreter wants to continue.

Pure-looking model invocation is still a nondeterministic, billable host operation requiring recovery accounting. It need not become a public Effect. Compile or interpret against the same attempt mechanism used by other runners; otherwise the Program VM creates a third recovery engine.

### H4: Agent and Workflow share a Program substrate

CrewAI's [Flow-based Agent executor](../../../crewAI/lib/crewai/src/crewai/experimental/agent_executor.py) is evidence that different control strategies can share a substrate. ArrokothI can preserve “authored possible control flow” versus “runtime-selected next action” without enforcing separate execution kinds forever.

A universal IR is nevertheless the highest-risk part of the proposal. Native engines depend on streaming, interrupts, context mutation, provider-specific continuations, tools, and internal scheduling. A lowest-common-denominator IR may erase their strengths; an exhaustive IR may recreate all of them badly. Translation compatibility and version migration become a permanent team cost.

Promote a shared Program representation only if two native ArrokothI control modes demonstrably simplify onto it, and an independent consumer can use its boundary without adopting its entire implementation. Foreign engines may remain opaque runners forever. Do not make arbitrary Hermes, CrewAI, or Dify programs compile to ArrokothI IR an adoption prerequisite.

### Keep capability and containment independent

The research's M0–M3 capability profiles and T0–T2 trust profiles capture a useful distinction. Logical operation calls can exist with no physical terminal. Bounded logical programs are different from sandboxed general computation, which is different from a persistent real workspace. A filesystem-like display does not confer shell access; a sandbox brand does not prove an operation's authority semantics.

An untrusted program even with only logical operations still requires resource bounds and scoped access. A trusted local Agent may possess ambient process/network access despite an elegant host interface. General computation can exfiltrate via any permitted output channel unless the deployment constrains it. State the actual environment powers and enforcement, rather than implying that model-authored code is safe because it uses a logical machine.

**Verdict:** investigate the environment boundary and bounded programs early as independent experiments. Keep “Machine” as a research metaphor until it predicts behavior more clearly than “execution environment.” Do not build a POSIX clone, a new general language, a universal memory filesystem, or a mandatory IR migration now.

## Selective reuse decisions

The table separates attractive mechanisms from their integration costs. “Candidate” does not mean approved dependency or production-ready adapter. License observations concern inspected roots; transitive and component licenses require checking when selecting actual code.

| Capability / source | Preferred approach now | Semantic owner and coupling risks | Gate for deeper investment |
|---|---|---|---|
| Durable execution: Temporal or Restate | One small comparative backend spike; reuse supported SDK/runtime rather than extract internals. | ArrokothI must map attempt identity, cancellation, unknown action behavior, and progress acceptance. Avoid two independent retry engines and two competing histories. | Demonstrated simpler recovery implementation with acceptable deployment/latency costs. |
| Local persistence | A narrow transactional database prototype if needed for the comparison. | Own transaction/activation intent semantics; reuse database locking, WAL, indexes. No custom distributed consensus or storage engine. | Real process-death conformance and bounded-history cost. |
| JSON/schema validation | Mature validator behind an ArrokothI-owned portable contract. | Dialect, unsupported features, mutation/coercion, and provider schema projection must be explicit. | Same invalid payload rejected through every caller path. |
| Strands decision engine | Preserve existing SDK adapter as narrow reference integration. | ArrokothI owns model context/operations in current contract; native whole-framework freedom is limited. | Behavioral fidelity and exact-call resume tests under supported versions. |
| Hermes whole Agent | External job/service adapter before any deeper interception. | Native context, home/session state, tool registries, background workers, and cleanup remain upstream. Root MIT; do not assume easy multi-tenancy from license. | Native capabilities preserved, explicit environment scope, no undeclared direct action paths for claimed mediation. |
| Hermes discovery/compaction | Compare strategy implementations; extract only small separable algorithms if cheaper than maintaining adapters. | Model message formats, config globals, providers, thread context, secrets handling, and lifecycle coupling. | Measured win with native baselines and a maintainable isolated boundary. |
| Hermes environment backends/checkpointing | Backend or service integration; selective code reuse only after dependency analysis. | Shell state, process registry, global home paths; file undo is not execution recovery. MIT notices and upstream tracking remain necessary. | Resource lifecycle and tenant scoping conform; extraction smaller than adopting provider SDK directly. |
| OpenClaw gateway/channels | Integrate as an owned external ingress/delivery service. | Session identity, policy, output spools, plugin registries, channel delivery ownership. Root MIT. | Correlation and delivery recovery work without mirrored session machinery. |
| OpenClaw native harness/tool bridge | Design reference; one selected bridge only if application needs it. | Host-specific closures, native auth, prepared tool surfaces, rapid upstream API change. | Exclusive action ownership, restore/rotation tests, fidelity under an upstream upgrade. |
| OpenClaw delivery/reconciliation utilities | Prefer boundary-level interoperability; small utility extraction only if independent. | Transport evidence and exact payload/spool/lease semantics cannot be generalized away. | A second transport needs the same contract and standalone extraction beats a maintained service. |
| Dify application/workflow | Protocol/API integration with versioned published app. | Dify owns tenant, forms, graph, response stream, plugin credentials. Root modified Apache conditions matter. | Clear result/pause/cancel translation and deployment permission for intended use. |
| Dify environment/layer runtime | Design reference first; consider original independent libraries rather than copying platform code. | Home/workspace/binding semantics useful; platform imports, dependency versions, separate license terms must be verified. | Concrete physical-environment need and clean ownership map. |
| CrewAI Crew/Flow | External native task via supported APIs. | Native Python runtime, memory, callbacks, hooks, checkpoint restoration. Root MIT. | No duplicate lifecycle; required resume and artifact behavior proven. |
| CrewAI tool interception/checkpoints | Narrow adapter only; do not extract its full executor. | Hook mutation order, serialization version, event-driven snapshots, custom tools and ambient credentials. | Every claimed action path and upgrade behavior conforms. |
| MCP / A2A | Use official protocol libraries at an adapter boundary; add only demanded operations. | Discovery and protocol task status do not automatically equal authority, Execution, or effect outcome. | A real integration requires a protocol feature; semantics and negative tests precede exposure. |
| Retrieval/vector memory | Application-supplied provider; reuse storage/retrieval SDKs. | Data access, provenance, revocation, freshness, and egress owned at the ArrokothI/application boundary; ranking and index internals remain provider-owned. | A real application requires it; compare against simple retrieval first. |
| Browser/computer use | Native engine or isolated external capability service. | Browser profiles, authenticated sessions, process cleanup, screenshots, artifact size, and irreversible actions. | Demand plus explicit containment and action semantics; no browser engine project. |
| Skills/tool marketplaces | Native package/service integration, no universal import promise. | Package instructions are not authority; executable plugins can carry ambient powers. Version and provenance matter. | Repeated demand for a small common packaging contract. |
| UI/Studio/telemetry | Reuse UI and telemetry libraries; begin with minimal evidence inspection. | UI projects kernel truth; never becomes another authority or lifecycle writer. | Operators repeatedly need the same views across real applications. |

### Extraction rule for a very small team

Before extracting code, measure its dependency closure, globals, storage schema, lifecycle hooks, tests, license obligations, and expected upstream change frequency. Prototype the smallest supported API alternative. Prefer extraction only where the code is small, algorithmically stable, and meaningfully cheaper to maintain independently. A permissive license allows reuse; it does not make coupled application code a library.

Do not put upstream transcripts, provider model objects, Dify node classes, CrewAI task semantics, OpenClaw session keys, or Hermes home paths into ArrokothI's canonical types. Keep native identifiers as namespaced opaque references. Pin and test adapter versions. An adapter should fail explicitly on unsupported semantics instead of silently dropping pause, authority, or recovery information.

## Investment choice

The best near-term combination is **one native specialist + one deterministic validator/action path + one authenticated human interaction**, with a single durable owner for the enclosing task. It exercises ArrokothI's possible value while leaving native cognition intact. It is also simple enough for a direct implementation to provide a fair baseline.

Delay general multi-engine hosting, graph translation, channel catalogs, memory products, sandbox implementations, and Studio. If the small combination cannot justify its extra state, latency, and maintenance, a broader “Agent operating system” will make the problem larger rather than solve it.
