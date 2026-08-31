# Architecture Research Dossier

> **TEMPORARY RESEARCH ARTIFACT — not canonical architecture.**
>
> **Purpose:** source material for the upcoming rewrite/reorganization of the canonical ArrokothI documentation.
>
> **Research date:** 2026-08-31.
>
> **Removal plan:** delete this file after its useful conclusions have been incorporated into the rewritten canonical documents.
>
> This dossier intentionally contains more detail, comparisons, rejected mappings, implementation notes, and external references than the final architecture documents should contain. The final docs should keep concepts concise and give each concept one canonical owner.

---

## 1. Evaluation framework

External projects and standards should not be evaluated with a binary “adopt vs do not adopt” decision. For ArrokothI, there are three different levels of admission.

### Layer 1 — semantic admission

Question:

> Does this external system reveal a more general truth about Agent/Workflow execution, authority, memory, composition, or lifecycle than the concept ArrokothI currently uses?

If yes, improve **ArrokothI's own mental model**. Do not make the external protocol/library the source of truth, and do not copy its object model merely because it is mature.

Examples of possible Layer-1 influence from this survey:

```text
Execution identity ≠ application security principal
explicit state ≠ inferred/derived memory
source episode ≠ derived semantic claim
authority grant may carry delegation provenance / constraints / lifetime
large authorized catalogs need progressive discovery, not prompt enumeration
standing constrained authorization ≠ exact action confirmation
```

### Layer 2 — portable/composition admission

Question:

> Is this a useful general interface, packaging, discovery, or projection concept that should be explicit in ArrokothI, but is not kernel runtime truth?

If yes, define an **Arrokoth-owned intermediate concept** and map external standards to/from it.

Examples:

```text
MCP Tool          ↔ portable Operation
A2A Agent Card    ↔ exported Agent/Workflow service description
Agent Skills      ↔ one profile of a broader Skill package
AG-UI             ↔ frontend/run-state projection
JSON Schema       ↔ portable interface schema language
CloudEvents       ↔ external event envelope
```

### Layer 3 — implementation reuse

Question:

> Is the semantic boundary already clear, while the remaining problem is provider transport, storage, policy evaluation, retrieval, durability, isolation, observability, etc.?

If yes, define a narrow Arrokoth port and reuse a good implementation where license, maintenance, security, and operational fit are acceptable.

Examples:

```text
ModelProvider          → Vercel AI SDK adapter
Policy backend         → Cedar / OpenFGA adapter
Semantic memory backend→ Graphiti / Mem0 adapter
Durability backend     → SQLite / DBOS / Temporal / other
Trace exporter         → OpenTelemetry GenAI
ExecutionEnvironment   → Docker/gVisor/Firecracker/Dify Sandbox/etc.
```

### General admission rule

For every external concept, ask in this order:

```text
1. Does it change actual runtime truth?
   yes → consider Layer 1

2. Does it describe a reusable external/composition interface?
   yes → Layer 2

3. Is it mainly a mechanism for an already-defined boundary?
   yes → Layer 3
```

Do not promote a wire-format detail into the kernel simply because a popular protocol has it. Conversely, do not keep an Arrokoth-specific concept merely because it existed first if a mature external concept reveals a more general distinction.

---

## 2. High-level survey result

| Area | Primary lesson | Likely Arrokoth treatment |
|---|---|---|
| A2A | Opaque remote Agent service, Task/Message/Artifact/context separation, interrupted states | Layer 2 first-class Agent-to-Agent binding; small Layer-1 lessons only |
| MCP | Tool/resource/template/task/input/change interoperability | Already Layer 2 first-class target |
| OpenClaw Tool Search / Code Mode | Large catalogs need policy-filtered progressive discovery and lazy schema hydration | Layer-1 discovery principle + Layer-3 mechanics |
| Hermes Tool Search | Tiered disclosure and token-budget-aware manifests | Layer-3 mechanics behind discovery seam |
| Cedar | Principal/action/resource/context separation; request context vs entity attributes | Layer-1 principal/policy clarification + optional backend |
| OpenFGA / Zanzibar | Relationship authorization, reverse enumeration, task-scoped grants | Layer-1 delegation/authority refinements + optional backend |
| UCAN | Attenuatable delegable capabilities and proof chains | Conceptual reference for future distributed delegation; not v0.4 dependency |
| AP2 Agent Authorization | Open constrained mandates vs exact closed authorization + signed receipts | Strong conceptual reference for confirmation/evidence semantics |
| Mem0 | Multi-scope memory, ADD-only fact extraction, hybrid retrieval, entity linking | Layer-1 memory distinctions + Layer-3 backend candidate |
| Graphiti | Episode provenance, temporal facts, learned/prescribed ontology, graph/hybrid retrieval | Strong Layer-1 memory influence + Layer-3 backend candidate |
| Agent Skills | Portable instruction/resource/script package with progressive disclosure | Layer 2 profile; broader Arrokoth Skill can be composition-backed |
| AG-UI | Agent-runtime ↔ frontend event protocol | Layer 2/3 Studio/hosted UI binding |
| A2UI / MCP Apps | Structured interactive/generative UI surfaces | Layer 2/3 watch/adapt where useful |
| ACP | Coding-agent ↔ editor protocol | Layer 2/3 optional binding for coding agents |
| AsyncAPI / CloudEvents | Message-driven API description / portable event envelope | Layer 2 optional service projection |
| JSON Schema 2020-12 | Mature portable data/interface schema vocabulary | Layer 2 schema language; provider subset remains separate |
| Vercel AI SDK | Broad provider abstraction already implemented | Layer 3 ModelProvider backend candidate |
| OpenTelemetry GenAI | Emerging common telemetry vocabulary | Layer 3 exporter, never runtime truth |
| DBOS | Lightweight TypeScript/Postgres durable execution | Layer 3 durability candidate |
| Temporal | Mature distributed durable orchestration | Layer 3 heavy-duty durability candidate |
| Restate | Durable services/virtual objects/workflows; useful conceptual/implementation reference | Layer 3 watch; licensing requires care |
| Erlang/OTP | Supervision trees and explicit process fault relationships | Validates ownership/supervision; selective conceptual influence |
| Orleans | Stable logical identity vs ephemeral activation/passivation/reminders | Strong validation for Execution ≠ physical activation |
| OpenClaw sandbox | Host-side gateway + isolated guest + controlled tool bridge | Layer 3 isolation reference |
| Dify Sandbox | Seccomp-oriented multi-tenant code execution | Layer 3 isolation candidate/reference |
| Dify main product | Workflow/HITL/plugin/security implementation reference | Reference only; modified license matters |

The strongest potential canonical changes identified by this survey are:

```text
A. Execution identity ≠ application principal / on-behalf-of identity
B. Authority and Active View should support efficient enumeration/filtering, not only point checks
C. Progressive discovery should eventually cover heterogeneous descriptors, not only tools
D. Memory should distinguish explicit Structured Memory from inferred/Derived Semantic Memory
E. Derived memory should preserve source/provenance and temporal supersession
F. Memory scope is a dimension separate from memory form
G. Authorization evidence may need explicit delegation/constraint/lifetime/provenance semantics
H. Skill should be a composition/package concept broader than SKILL.md
I. An external continuation may require input or authentication without changing kernel authority
```

These are research conclusions, not yet accepted canonical decisions.

---

# Part I — Core-semantic candidates

## 3. A2A: Agent-to-Agent interoperability and what it actually teaches us

### 3.1 What A2A is optimizing for

A2A is designed for communication between independently implemented Agent systems. The remote Agent is intentionally treated as an opaque service: its internal memory, tools, controller, topology, and runtime are not exposed to the caller.

Current important concepts include:

```text
Agent Card
Task
Message
Part
Artifact
Context / contextId
```

An Agent Card describes the public endpoint, capabilities, skills, and authentication requirements. A Task is a stateful unit of work with lifecycle. A Message is one communication turn. A Part carries text, structured data, inline bytes, or URL-referenced content. Artifacts are concrete task outputs. `contextId` groups related Tasks into a broader interaction context.

A2A supports ordinary request/response, streaming, and long-running/disconnected patterns through polling and push-style mechanisms.

Primary source:
- https://a2a-protocol.org/latest/topics/key-concepts/
- https://a2a-protocol.org/v1.0.0/

### 3.2 A2A Task is not a better internal Execution

Arrokoth `Execution` is an **internal independently managed runtime entity**. It carries semantics A2A intentionally does not require a remote caller to know:

```text
identity
lifecycle
owner/root relationship
authority
memory bindings
mailbox
pending operations
child ownership
cancellation/supervision
budget/deadline
durability/recovery
```

A2A Task is an external service work abstraction. It is intentionally a weaker and more interoperable object.

Therefore:

```text
A2A Task ≠ Arrokoth Execution
```

A Task may correlate to:

```text
one exported Arrokoth Execution
one external capability job
a wrapper around several Arrokoth Executions
another remote runtime object
```

This validates rather than weakens the existing “external async handle ≠ Execution” design.

### 3.3 A2A Message vs Arrokoth messaging

A2A `Message` is protocol communication. Arrokoth `SendMessage` is a requested runtime-mediated interaction between known Execution endpoints under Message Authority.

So:

```text
A2A Message ≠ SendMessage Effect
```

When an Arrokoth Execution talks to a remote A2A Agent, a portable service/communication adapter can translate an authorized operation or message into A2A traffic. A local peer message between two Arrokoth Executions does not need to become A2A merely for uniformity.

### 3.4 `contextId` is conceptually interesting

A2A separates a logical interaction context from individual stateful Tasks:

```text
context C
  ├── Task 1
  ├── Task 2
  └── Task 3
```

This raises a useful question for Arrokoth:

> Is there sometimes a durable interaction/conversation identity that groups several independently managed units of work without itself being an Execution?

Do **not** add a kernel type merely because A2A has `contextId`. For a persistent conversational Arrokoth Agent, the Execution itself may already be the durable conversation identity. For other service shapes, a portable interaction/session handle may group multiple child Executions.

Likely placement: interoperability/service layer, unless future applications prove a runtime-level identity is necessary.

### 3.5 `input-required` vs `auth-required`

A2A distinguishes interrupted Task states such as:

```text
input-required
auth-required
```

The A2A specification explicitly warns that `auth-required` by itself is not authorization for a particular later operation; implementations must define the scope and meaning of the resulting credential/decision.

Source:
- https://a2a-protocol.org/dev/specification/

This is a useful distinction for Arrokoth interoperability.

Current portable concept:

```text
input requirement
```

Possible future generalization:

```text
ContinuationRequirement
├── user/external input required
├── external authentication/credential refresh required
└── other externally satisfied prerequisite
```

Important separations:

```text
external authentication required ≠ Harness authority denied
external authentication obtained ≠ new Arrokoth authority grant
user input required ≠ mechanical confirmation
```

Do not freeze a new name yet. Record the semantic distinction and wait for a concrete adapter/service case.

### 3.6 A2A conclusion

Adopt:
- A2A as a first-class Agent/service interoperability target beside MCP.
- Agent Card-like public Agent service discovery at Layer 2.
- Task/Message/Artifact separation for external interfaces.
- interrupted-state distinction as input for portable continuation requirements.

Do not adopt:
- A2A Task as internal `Execution`.
- A2A Message as kernel Event/Effect.
- A2A `contextId` as a mandatory new runtime object.
- A2A authentication state as Arrokoth authority semantics.

Likely canonical home after rewrite: `interoperability.md`, with one short reference from `mental-model.md`.

---

## 4. Large catalogs: OpenClaw, Hermes, and the actual Active View problem

### 4.1 The Arrokoth problem is larger than “tool search”

The target problem is:

```text
potentially thousands of:
  Operations
  Resources
  memory interfaces
  Agent services
  Workflow services
  Skills
  interaction templates

without:
  putting all schemas/descriptions into every model request
  making several extra LLM routing calls before real work
  allowing discovery to enlarge authority
```

The existing four-layer model is already correct:

```text
Catalog
  ↓
Effective Authority
  ↓
Active/Exposed View
  ↓
Model Invocation Projection
```

The research question is how to implement the middle efficiently and whether a more general concept is missing.

### 4.2 OpenClaw Tool Search

OpenClaw's current experimental Tool Search is very close to the required mechanics.

Key behavior:

1. Build the **effective catalog after normal policy filtering**.
2. Keep direct/core/required tools exposed normally.
3. Put the remaining large catalog behind a compact discovery surface.
4. Reuse a bounded, cache-stable directory for an unchanged catalog snapshot.
5. Use lexical BM25 ranking over trusted metadata.
6. Do not index untrusted third-party parameter schemas as trusted search metadata.
7. Hydrate the exact full schema only when a candidate is selected.
8. Execute the final selected tool through the normal policy/approval/hook/executor path.

Source:
- https://docs.openclaw.ai/tools/tool-search

The capability directory is bounded and generated from the already-policy-filtered catalog, which is exactly the correct ordering for Arrokoth:

```text
policy / authority first
ranking second
```

### 4.3 OpenClaw Code Mode and avoiding multiple LLM turns

The most interesting implementation idea is the compact code bridge. One model decision can execute a short isolated program that performs:

```text
search
  ↓
describe
  ↓
call
```

without returning to the LLM between every discovery operation.

Conceptually:

```js
const hits = await tools.search("create a GitHub issue")
const op = await tools.describe(hits[0].id)
return await tools.call(op.id, args)
```

The nested call still goes through OpenClaw's normal execution boundary; the guest program does not bypass policy.

Sources:
- https://docs.openclaw.ai/tools/tool-search
- https://docs.openclaw.ai/tools/code-mode

This directly addresses the user's performance concern: progressive discovery does not inherently require a chain of LLM turns.

### 4.4 Hermes Tool Search

Hermes independently converged on progressive disclosure.

Its useful contribution is **tiered disclosure under a context/token budget**:

```text
Tier 0
  no deferrable MCP/plugin tools
  → normal eager exposure

Tier 1
  listing fits budget
  → bridge + compact per-tool listing
  → oversized individual servers may degrade to names-only

Tier 2
  listing itself too large
  → bridge + one-line-per-server summaries
  → individual tools found through search
```

Source:
- https://hermes-agent.nousresearch.com/docs/user-guide/features/tool-search

Hermes uses BM25 and loads schemas on demand. The most useful implementation lessons are:

- tier the disclosure strategy based on actual context budget;
- degrade oversized namespaces independently instead of degrading the entire catalog;
- preserve enough domain/server summary information that the model knows what is reachable;
- treat retrieval quality as measurable because small/weak models may fail to search well.

### 4.5 What to adopt as an Arrokoth concept

Do **not** define a kernel `ToolSearch` primitive.

The general concept is closer to:

> **Authorized progressive descriptor discovery**

The searchable universe can span different typed catalogs without pretending all items are the same semantic kind.

Conceptual index projection:

```text
DiscoverableSummary
  kind
  stableRef
  name/title
  short description
  tags/groups
  compact interface hints
  optional ranking metadata
```

Possible `kind` values:

```text
operation
resource
agent-service
workflow-service
memory-interface
skill
interaction-template
```

This index representation is not the authoritative descriptor ontology. Selecting a hit resolves back to its owning typed descriptor.

### 4.6 Suggested discovery pipeline

A mature path could be:

```text
all descriptors / registrations
       ↓
Effective Authority filtering / enumeration
       ↓
cheap authorized discovery index
       ↓
query from:
  user request
  current task
  observations
  authored scope
  current Stage/Agent policy
       ↓
BM25 / embedding / hybrid retrieval
       ↓
small Active View
       ↓
provider-aware per-call projection
```

The **first pass should normally require zero additional LLM calls**.

Only when the initial Active View is insufficient should a deliberately exposed discovery/expansion operation allow the model to search more of its already-authorized universe.

### 4.7 Search should not grant authority

All external examples reinforce this invariant:

```text
discovery result ≠ permission
search hit ≠ active exposure grant
schema hydration ≠ authority
catalog id ≠ bearer capability
```

The Harness authorization check remains decisive even when the selected operation was present in the model projection.

### 4.8 Snapshot integrity

OpenClaw's run/catalog snapshot behavior supports the decision already made for Slice D: a model result should resolve against the exact binding snapshot shown to that model call, not a refreshed catalog.

That means discovery and dynamic view refresh should preserve:

```text
projection snapshot identity
binding identity
stable operation/service ref
```

as integrity/correlation data, not authority credentials.

### 4.9 Recommendation

Layer 1:
- Adopt progressive descriptor discovery as a general scaling principle.
- Generalize the discoverable universe beyond Tools.

Layer 2:
- Define future portable discoverability metadata only as needed.

Layer 3:
- Reuse/port proven mechanics: BM25, compact manifests/directories, per-namespace tiering, lazy schema hydration, snapshot caches, possibly sandboxed search→describe→call programs.

For Slice D specifically: keep the current deterministic Active Operation View seam. Do not prematurely implement the full heterogeneous discovery engine before the reference Agent semantics exist.

---

## 5. Authority: Cedar, OpenFGA/Zanzibar, UCAN, and AP2

The current Arrokoth rule is strong:

```text
application/world/platform policy
  decides what should be allowed
        ↓
Arrokoth kernel
  represents/enforces Execution authority
        ↓
isolation
  prevents bypass through ambient host privilege
```

The survey did not find a reason to replace this. It did find several distinctions worth making more explicit.

### 5.1 Cedar: separate the request actor from application identity facts

Cedar authorization requests are shaped around:

```text
Principal
Action
Resource
Context
```

The language/schema/entity model supports RBAC/ABAC-style policies while keeping request-specific context distinct from entity attributes.

Sources:
- https://docs.cedarpolicy.com/auth/authorization.html
- https://docs.cedarpolicy.com/bestpractices/bp-using-the-context.html

For Agent systems, Cedar documents different patterns such as:

```text
Agent is principal
User appears as onBehalfOf context
```

or:

```text
User is principal
Agent appears as viaAgent context
```

depending on which identity should dominate the policy decision.

This exposes an important Arrokoth distinction:

```text
ExecutionId ≠ application security principal
```

A runtime Execution may have policy facts such as:

```text
Execution: exec-17
application agent principal: agent:research-assistant
acting on behalf of: user:rex
tenant/world: org:arrokoth
current task: task:paper-review
```

The kernel should not encode the domain semantics of “user”, “tenant”, or “organization”, but its policy interface must be able to evaluate application-provided authenticated subject/delegation facts without pretending the Execution identifier itself is the user identity.

### 5.2 OpenFGA/Zanzibar: relationships and reverse permission queries

OpenFGA is a Zanzibar-style relationship authorization system. Its new AI-Agent guidance is particularly relevant because it explicitly models:

- Agents as first-class principals.
- Explicit and revocable “act on behalf of” relationships.
- Bounded tool/resource/workspace grants.
- Task/session/agent-scoped permissions.
- Expiration and contextual constraints.
- Sub-agent delegation through either sharing a task or creating a narrower task.

Sources:
- https://openfga.dev/docs/use-cases/ai-agent-authorization
- https://openfga.dev/docs/modeling/agents/task-based-authorization
- https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/

The conceptual lesson is not “use ReBAC everywhere.” It is that authority often depends on an application relationship graph that is richer than the Execution ownership tree.

Examples:

```text
user owns workspace
workspace contains document
Agent acts on behalf of user
Task grants tool use only for that workspace
resource shared from another workspace
```

Arrokoth ownership remains a runtime relation for supervision/delegation. Application resource/person relationships belong to application policy.

### 5.3 Reverse queries matter for Active View performance

OpenFGA exposes reverse enumeration such as `ListObjects`:

> Which objects of type X may principal P access with relation R?

This is important for large Active Views.

A policy interface that only supports:

```text
isAllowed(execution, operation)
```

may require thousands of checks to build a catalog.

A more general optional capability could support:

```text
check(candidate)
filterAllowed(candidates)
enumerateAllowed(kind, scope)
```

An embedded/simple policy can implement these naively. An OpenFGA/Zanzibar-style backend can implement reverse enumeration efficiently.

This should be treated as a **policy/authority-query capability**, not as a requirement that every AuthorityEnvelope contain a materialized list of all allowed objects.

### 5.4 Task-scoped authority

OpenFGA's task-based authorization examples include:

```text
task-specific tool grants
session-scoped grants
agent-scoped grants
expiration
agent↔task binding
call-count-like conditions
```

This supports a possible refinement of authority grants:

```text
Grant
  scope
  delegator/provenance
  subject / effective holder
  delegable?
  validity/lifetime
  optional constraints
```

Do not automatically put every policy condition into the kernel authority record. For example, call count may be better modeled as a budget/policy check. The conceptual point is that a grant can have provenance and attenuation, not merely membership in a flat permission set.

This is especially relevant before Slice E child delegation.

### 5.5 UCAN: capability attenuation as a distributed reference model

UCAN defines cryptographically verifiable, delegable capabilities. A delegate may pass **equal or narrower** authority onward, with explicit delegation, invocation, revocation, validity windows, and proof chains.

Sources:
- https://github.com/ucan-wg/spec
- https://ucan.xyz/delegation/

The useful conceptual correspondence is:

```text
Arrokoth child authority must be attenuated
        ↕
UCAN delegated capability must be equal/narrower than delegator authority
```

Arrokoth should **not** require DIDs, public-key UCAN tokens, or cryptographic capability chains inside a trusted single-Harness deployment. The current Harness is already the trust anchor.

But UCAN is a strong future reference if Arrokoth authority must cross administrative/runtime trust boundaries, for example remote workers or federated Agent platforms.

### 5.6 AP2 Agent Authorization: a strong model for autonomous authorization evidence

The Agent Payments Protocol's Agent Authorization framework introduces a useful general distinction even outside payment systems.

It separates:

```text
Mandate Delegation
  user authorizes goals/constraints for future autonomous action

Action Authorization
  specific concrete action is checked against that delegated mandate
```

Mandates can be:

```text
Open
  bound to an Agent + constraints
  not yet bound to one exact transaction

Closed
  bound to a specific concrete verifier/action/transaction
```

Verifiers return signed Receipts, and the mandate chain plus receipt creates durable evidence of what was authorized and what was actually accepted/rejected.

Source:
- https://ap2-protocol.org/ap2/agent_authorization/

This is highly relevant to Arrokoth's distinction between semantic authorization evidence and exact mechanical confirmation.

A useful future conceptual model may be:

```text
standing constrained grant / mandate
        ↓
Agent proposes exact Effect
        ↓
current authorization check
        ↓
optional exact-payload mechanical confirmation
        ↓
execution/outcome receipt/audit evidence
```

Possible evidence/grant metadata:

```text
issuer/delegator
subject/holder
scope
constraints
validity
exact payload binding when applicable
provenance/evidence refs
consumption/revocation state
result/receipt reference
```

Do not overbuild this into v0.4. The existing exact-payload mechanical confirmation remains a good baseline. AP2 is evidence that “standing consent” and “exact action approval” should remain separate concepts.

### 5.7 Authority conclusions

Potential Layer-1 changes:

1. Explicitly state `Execution identity ≠ application principal identity`.
2. Treat on-behalf-of/delegation facts as policy inputs, not identity aliases.
3. Model child/delegated authority as attenuated grants with enough provenance/lifetime semantics when a concrete slice needs them.
4. Allow authority/policy implementations to efficiently filter/enumerate allowed resources/operations, not only point-check.
5. Keep semantic/standing authorization evidence separate from exact mechanical confirmation.

Layer-3 reuse:

- Cedar: strong embedded attribute/request policy backend candidate.
- OpenFGA: strong relationship/tenant/resource/delegation backend candidate.
- Neither should define the core AuthorityEnvelope.
- UCAN/AP2 are conceptual references for distributed/delegated authorization rather than near-term dependencies.

Likely canonical home: new `authority.md`; deployment security implications in `security.md`.

---

## 6. Memory: Mem0 and Graphiti in detail

This area deserves more refinement than the earlier simple “Derived Semantic Memory” proposal.

Current Arrokoth canonical forms are:

```text
Structured Memory
Working Notes
Artifacts / Files
```

and execution history/provenance is explicitly not the same as semantic memory.

That is still a strong base, but it does not yet clearly classify automatically inferred facts such as:

```text
"the user prefers boutique hotels"
"Alice moved to team X"
"the project used design A before switching to B"
"we solved a similar bug with technique Y"
```

when those facts were derived from messages/events/resources rather than explicitly written into a schema-bound field.

### 6.1 Mem0's memory layers

Mem0 describes several scopes/layers:

```text
Conversation memory
Session memory
User memory
Organizational memory
```

It also relates these to classic short/long-term categories such as working, factual, episodic, and semantic memory.

Source:
- https://docs.mem0.ai/core-concepts/memory-types

Important observation for Arrokoth: these categories mix **form**, **lifetime**, and **scope**. We should not copy them literally.

For example:

- Mem0 “conversation memory” is close to current context/history, which Arrokoth deliberately does not want to call durable semantic memory.
- “User memory” describes scope/ownership/lifetime more than a memory representation.
- “Organizational memory” is a sharing scope, not a storage algorithm.

This suggests Arrokoth should make two axes explicit:

```text
Memory Form
  what kind of information/semantics is this?

Memory Scope/View
  for whom / which Execution/principal/task/world is it visible?
```

### 6.2 Mem0 v3 ADD-only extraction

Mem0's current open-source v3 algorithm is notably different from older “LLM chooses ADD/UPDATE/DELETE” memory agents.

Current design:

```text
incoming material
  ↓
retrieve related existing memories
  ↓
one extraction LLM call
  ↓
new distinct facts
  ↓
batch embedding / exact dedupe
  ↓
ADD
```

It does not ask the extraction LLM to destructively UPDATE/DELETE existing memories during normal extraction.

Source:
- https://docs.mem0.ai/platform/features/graph-memory

This is conceptually useful. If a user says:

```text
2025: "I live in Taipei"
2026: "I moved to New York"
```

an inferred-memory system should not necessarily erase the first observation. The old statement may remain historically true while being superseded as current state.

For Arrokoth this supports:

> Derived/inferred memory should prefer additive observations + temporal/supersession relations over destructive rewriting of source history.

Explicit Structured Memory is different. A schema field representing *current shipping address* may correctly be updated. This is another reason the two forms should not be merged.

### 6.3 Mem0 retrieval

Mem0 v3 documents multi-signal retrieval using:

```text
semantic/vector similarity
BM25 keyword signal
entity matching/linking
temporal reasoning/ranking
```

The implementation details can change; the conceptual lesson is that memory retrieval is a ranking problem rather than a simple “vector database lookup.”

Arrokoth should keep retrieval strategy behind a memory/retrieval provider boundary.

### 6.4 Mem0 scoping

Mem0 APIs commonly scope memories through identifiers such as:

```text
user_id
agent_id
run_id
metadata/application scope
```

This strongly supports separating memory **scope** from memory **kind**.

Possible Arrokoth scopes may eventually include:

```text
Execution-local
Task/run
Agent/Workflow Definition family
application principal/user
application/world
tenant/organization
explicit shared group
```

But those scopes must not silently bypass Arrokoth memory visibility/authority. A storage namespace is not itself an authorization rule.

### 6.5 Graphiti: source Episodes vs derived graph

Graphiti's strongest conceptual contribution is explicit provenance from raw source material into derived semantic knowledge.

Its model includes:

```text
Episode
  raw source material / observation
  reference time
       ↓ extraction
Entities
Facts / relationships
Communities
```

Source:
- https://help.getzep.com/graphiti/getting-started/welcome
- https://github.com/getzep/graphiti

Derived facts retain links back to source episodes. This provides an answer to:

> Why does the Agent believe this fact?

That question is critical for debugging, trust, correction, security, and later re-derivation.

### 6.6 Temporal validity and supersession

Graphiti facts can represent temporal validity such as:

```text
valid_at
invalid_at
```

and episodes have reference/event time in addition to ingestion time.

This makes a useful **bi-temporal** distinction:

```text
observed/ingested time
  when Arrokoth learned/stored the claim

subject/reference time
  when the claim is asserted to be true in the represented world
```

Not every Arrokoth memory needs full bitemporal machinery. But Derived Semantic Memory should be able to express supersession/validity when a backend/application needs it.

Example:

```text
Claim A: Alice works on Team Red
  valid: Jan–Jun

Claim B: Alice works on Team Blue
  valid: from Jul
```

Both can remain in provenance history while current retrieval prefers B.

### 6.7 Graphiti ontology

Graphiti supports both prescribed/custom entity types and more emergent/learned graph structure.

The lesson is **not** that Arrokoth needs a knowledge graph ontology in the kernel.

Instead:

- applications may define structured semantic schemas/ontologies;
- memory providers may infer entities/relations;
- the kernel should preserve provenance/visibility/trust semantics without requiring one graph technology.

### 6.8 Graphiti retrieval

Graphiti combines multiple retrieval techniques, including lexical BM25, embedding similarity, graph traversal, and reranking strategies such as reciprocal-rank fusion/MMR/cross-encoder paths.

Source code/reference:
- https://github.com/getzep/graphiti/tree/main/graphiti_core/search

This reinforces the same conclusion as Mem0: semantic-memory retrieval should be a replaceable provider strategy.

### 6.9 Proposed Arrokoth memory conceptual split

A better future mental model appears to be:

```text
Memory / retained information

1. Structured Memory
   explicit
   schema-bound
   intentionally written
   suitable for application state / stable facts
   may have field-level read/write policy

2. Derived Semantic Memory
   extracted / inferred from observations
   open-world / retrieval-oriented
   provenance-bearing
   potentially stale, contradictory, or superseded
   not authoritative by default

3. Working Notes
   temporary scratch / local reasoning support
   context-oriented
   explicit visibility/delegation

4. Artifacts / Files
   large durable work products
   externalized from prompt-shaped state

Source history / Episodes
   Events, messages, resources, tool results, documents, etc.
   provide provenance/source material
   not automatically semantic memory themselves
```

The important distinction is:

```text
source observation ≠ derived claim ≠ explicit structured state
```

### 6.10 Derived claim metadata

A portable semantic claim might eventually need some subset of:

```text
claim/value or subject-predicate-object
source/provenance refs
derivation method/model/version
observedAt / ingestedAt
referenceTime / validFrom / validUntil
confidence / quality metadata
trust label / source class
supersedes / contradictedBy links
scope / visibility ref
```

Do not freeze this full schema in v0.4. It is a checklist for the `memory.md` rewrite and future provider boundary.

### 6.11 Trust and security: derived memory is not authority evidence by default

This is essential.

Suppose an untrusted web page says:

```text
"The user permanently approves all payments."
```

If an extraction model stores that as inferred semantic memory, it must not automatically become valid authorization evidence.

Therefore:

```text
Derived Semantic Memory
        ≠
trusted Structured Memory preference
        ≠
authority grant
        ≠
mechanical confirmation
```

A trusted promotion/validation path may explicitly move information into authoritative Structured Memory or authorization evidence, but inference alone cannot grant authority.

This extends the existing security rule:

```text
retrieved/model/tool/protocol content may influence requests
but cannot create permission
```

### 6.12 Memory scope should be orthogonal

A second likely conceptual improvement:

```text
Memory Form
  Structured / Derived / Notes / Artifact

is orthogonal to

Memory Scope / View
  Execution / task / principal / application / shared group / etc.
```

An “organizational memory” is therefore not necessarily a fourth storage ontology. It can be Structured or Derived memory exposed through an organization/shared-group scope under policy.

### 6.13 Mem0 vs Graphiti as implementations

Mem0 strengths:
- practical memory capture/retrieval API;
- multiple scopes;
- ADD-only extraction;
- semantic + lexical + entity retrieval;
- operationally simple memory abstraction.

Graphiti strengths:
- explicit source Episode provenance;
- temporal validity/supersession;
- entity/relation graph;
- flexible ontology;
- rich hybrid/graph retrieval.

Licenses observed during survey:
- Mem0: Apache-2.0.
- Graphiti: Apache-2.0.

Potential architecture:

```text
Arrokoth Memory semantics
        ↓
SemanticMemoryProvider port
        ├── simple reference implementation
        ├── Mem0 adapter
        ├── Graphiti adapter
        └── application-specific backend
```

Do not let either library define Structured Memory, Working Note visibility, cross-Execution delegation, or authority semantics.

Likely canonical home: new `memory.md`.

---

## 7. Agent Skills and the broader Arrokoth Skill concept

### 7.1 What Agent Skills standardizes

The Agent Skills specification defines a lightweight portable directory convention:

```text
SKILL.md
scripts/
references/
assets/
```

`SKILL.md` includes required `name` and `description`, optional metadata/license/compatibility fields, an experimental `allowed-tools` field, and Markdown instructions.

It explicitly uses progressive disclosure:

```text
startup
  → metadata only

activation
  → full instructions

as needed
  → references/assets/scripts
```

Source:
- https://agentskills.io/specification

This is valuable interoperability and validates the same “do not dump everything into context” design direction as Active View.

### 7.2 Why Arrokoth Skill should be broader

Arrokoth has a unique composition advantage:

```text
Workflow may contain Agent Stages
Agent/Workflow can call/spawn child Executions
```

Therefore a reusable Skill need not be only “instructions injected into the current Agent.”

A richer Arrokoth Skill can be conceptualized as:

```text
Skill Package
  descriptor
  input interface/default bindings
  instructions/templates
  resources/references/assets
  optional scripts
  requested/recommended capabilities/resources
  optional root composition
      AgentDefinition
      or WorkflowDefinition
```

Examples:

```text
read-pdf skill
  root Workflow
  input: file
  parse → retrieve sections → analyze → return result
```

```text
paper-research skill
  root Workflow
  search stage
  parallel child research Agents
  synthesis stage
```

A caller can reuse the Skill by changing inputs/bindings instead of rebuilding the orchestration.

### 7.3 Skill is not an Execution kind

The package itself is not independently managed runtime work.

```text
Skill ≠ Execution
Skill ≠ Effect
Skill ≠ controller
```

Activation of a composition-backed Skill may call/spawn its root Definition, which then creates an Execution.

An instruction-only Skill may simply alter the current Agent's context/resources without creating a child Execution.

### 7.4 Two useful Skill profiles

Conceptually:

```text
Arrokoth Skill

Instruction profile
  metadata + instructions + refs/assets/scripts
  ↕ compatible with Agent Skills SKILL.md

Composition-backed profile
  metadata + input bindings + root Agent/Workflow Definition
  + optional instructions/resources/scripts
```

Some composition-backed Skills may export to standard Agent Skills only lossily. A conventional client could instead be given instructions to invoke the Skill's exported MCP/A2A/API service operation.

This is acceptable: interoperability does not require every richer Arrokoth concept to collapse into the lowest-common-denominator format.

### 7.5 `allowed-tools` must not grant authority

Agent Skills' experimental `allowed-tools` field can map only to something like:

```text
requested / recommended operation exposure
        ↓
intersect Effective Authority
        ↓
Active View
```

Never:

```text
SKILL.md says tool is allowed
        ↓
permission granted
```

A Skill package may similarly declare **requested authority/resource requirements**, but the Harness/application grants or narrows them.

### 7.6 Skill discovery

Skills should participate in the future heterogeneous progressive discovery system.

A model/controller may discover:

```text
skill: paper-research
workflow-service: literature-review
operation: semantic-scholar.search
resource: project-papers
```

without seeing their full manifests/schemas until selected.

Likely canonical home: `composition.md` for Skill semantics; `interoperability.md` for Agent Skills mapping; `authority.md` for requested-vs-granted authority.

---

## 8. Actor/virtual-actor runtimes: Erlang/OTP and Orleans

These are not Agent protocols, but they are valuable cross-checks because Arrokoth Executions resemble logical actors in some ways.

### 8.1 Erlang/OTP supervision

OTP distinguishes workers from supervisors and organizes them into supervision trees. Supervisors monitor child processes and apply restart strategies.

Sources:
- https://www.erlang.org/docs/27/system/design_principles.html
- https://www.erlang.org/doc/apps/stdlib/supervisor.html

This validates several Arrokoth distinctions:

```text
ownership/supervision tree ≠ communication graph
child failure policy belongs to supervisor/runtime, not arbitrary peer
fault relationship should be explicit
```

Potential lesson for Slice E and later:

- child ownership should eventually carry explicit supervision/cancellation/failure policy;
- parent/owner relation should not automatically imply one universal “child failed → parent failed” rule;
- restart policy, if introduced, is operational runtime policy rather than Agent semantic reasoning.

Do not import OTP's process identity or crash model wholesale. Arrokoth Executions can be durable, typed, authority-carrying service/runtime entities whose semantics differ from Erlang processes.

### 8.2 Orleans: logical identity vs physical activation

Orleans' virtual actor model distinguishes a stable grain identity from temporary in-memory **activations**. Idle activations can be collected and recreated later. Durable reminders are associated with the grain identity rather than one particular activation and can reactivate a grain.

Sources:
- https://learn.microsoft.com/en-us/dotnet/orleans/overview
- https://learn.microsoft.com/en-us/dotnet/orleans/host/configuration-guide/activation-collection
- https://learn.microsoft.com/en-us/dotnet/orleans/grains/timers-and-reminders

This strongly validates the Arrokoth model:

```text
Execution identity
   ≠
current physical process/task/worker/Activation
```

It also validates the planned scaling direction for large dormant Agent populations:

```text
logical Execution exists durably
        ↓ event/reminder/message
runtime materializes an Activation on some worker
        ↓
work completes / becomes idle
        ↓
physical activation disappears
logical Execution remains
```

This is not a reason to rename Arrokoth `Activation` to Orleans activation or adopt Orleans. It is independent evidence that the semantic/physical separation is sound.

### 8.3 Actor-model conclusion

No major mental-model rewrite is needed.

Possible improvements:
- make future supervision policy explicit in composition/runtime docs;
- preserve logical Execution identity independent from loaded worker state;
- treat passivation/materialization as implementation/scaling, not lifecycle meaning visible to application code.

---

# Part II — Portable/intermediate layers

## 9. MCP remains the baseline tool/resource interoperability target

MCP has already been deeply incorporated into the architecture and does not need another conceptual rewrite here.

The important retained mappings are:

```text
portable Operation          ↔ MCP Tool
portable Resource           ↔ MCP Resource
interaction template        ↔ MCP Prompt
external async handle       ↔ MCP Task where appropriate
input/continuation need     ↔ MCP elicitation / multi-round mechanisms
change signal               ↔ MCP notifications/subscriptions
```

and the non-equivalences:

```text
Effect            ≠ MCP Tool
Execution         ≠ MCP Task
Event             ≠ MCP Notification
Capability        ≠ MCP Tool
BoundResource     ≠ MCP Resource
```

The new survey adds A2A/Agent Skills/UI standards around MCP rather than replacing it.

---

## 10. A useful external protocol stack

The ecosystem is increasingly separating concerns rather than converging on one “universal Agent protocol.” That aligns with Arrokoth's layered design.

Conceptually:

```text
Agent ↔ tools/data/services      MCP / HTTP / SDK
Agent ↔ remote Agent system      A2A
Agent/runtime ↔ frontend         AG-UI
Generated interactive UI        A2UI / MCP Apps (context-dependent)
Coding Agent ↔ editor            ACP
Skill package                    Agent Skills
Message-driven API description   AsyncAPI
Portable external event envelope CloudEvents
```

Arrokoth should resist inventing one giant protocol that competes with all of these.

---

## 11. AG-UI

AG-UI is an event-driven protocol between Agent runtimes and user-facing applications. Its standard event families cover areas such as:

```text
run lifecycle
step lifecycle
text streaming
tool-call activity
state snapshots/deltas
message snapshots
custom/activity events
```

Source:
- https://docs.ag-ui.com/

Possible future flow:

```text
Arrokoth Execution/Harness
  Events / Effects / traces / projected state
        ↓
AG-UI adapter
        ↓
Studio / React / mobile / external frontend
```

Non-equivalences:

```text
AG-UI event ≠ Arrokoth Event
AG-UI runId ≠ ExecutionId by definition
AG-UI tool-call event ≠ Effect
```

AG-UI is primarily a presentation/interaction projection. It may save Arrokoth from inventing and maintaining a proprietary Studio WebSocket/run-stream protocol.

Likely Layer 2/3, later than core Slice D.

---

## 12. A2UI and MCP Apps

A2UI and MCP Apps represent a related emerging area: tools/Agents returning **structured interactive UI** rather than only text/data.

Possible relevance:

- future Studio can render interactive approval/configuration/result components;
- exported MCP services can provide UI components where the MCP Apps extension is supported;
- UI intent can be mapped to a client-owned component catalog rather than arbitrary remote frontend code.

These should remain UI/presentation concepts, not kernel Event/Effect semantics.

Watch rather than freeze into v0.4.

References to track:
- A2UI project/specification from Google ecosystem.
- MCP Apps extension announcements/specification under Model Context Protocol.

---

## 13. ACP: Agent Client Protocol

ACP targets coding-Agent ↔ editor/client integration. It allows Agents and IDE/editor clients to interoperate without one custom integration per Agent/editor pair.

Source:
- https://zed.dev/acp

If Arrokoth later powers coding Agents, ACP is a better external client target than inventing an Arrokoth-specific editor protocol.

It should not influence general Execution semantics unless later versions reveal a genuinely reusable concept.

---

## 14. AsyncAPI and CloudEvents

### AsyncAPI

AsyncAPI describes message-driven external APIs: channels, operations, messages, correlation, servers, security, and schema bindings.

Source:
- https://www.asyncapi.com/docs/reference/specification/v3.1.0

Potential use:

```text
explicit exported Arrokoth message/change/event service interface
        ↓
AsyncAPI descriptor
        ↓
Kafka/NATS/webhook/etc. application integration
```

This is not an internal Event ontology.

### CloudEvents

CloudEvents standardizes an external event envelope with stable source/type/id/spec metadata across transports.

Source:
- https://cloudevents.io/

Potential use:

```text
selected external Arrokoth observation/change signal
        ↓
CloudEvent envelope
```

Non-equivalence:

```text
CloudEvent ≠ Arrokoth Event
```

A CloudEvent can represent exported data that originated from an Event, Effect outcome, lifecycle change, or application-level domain event.

---

## 15. JSON Schema 2020-12

JSON Schema is mature enough to be a strong candidate for the **portable interface schema language**.

Source:
- https://json-schema.org/draft/2020-12

Recommended separation:

```text
portable Operation / Definition service interface
  input/output schema
  → JSON Schema 2020-12 (or declared portable dialect)

model/provider projection
  → constrained ObjectSchema/provider-supported subset
```

Why this matters:
- do not grow a proprietary general schema language unnecessarily;
- portable APIs/MCP/OpenAPI/tool projections can start from one mature schema vocabulary;
- provider APIs frequently support only subsets, so projection/validation remains explicit.

Do not aggressively replace every current internal `ObjectSchema` immediately. Slice D only needs the stable provider-facing subset. Full portable schema admission should occur when the portable Operation/Definition interface requires it.

JSON Schema does not define authority, exposure, or execution semantics.

---

## 16. ANP and federated Agent identity: watchlist

Agent Network Protocol (ANP) is exploring a broader “Agentic Web” model with decentralized identity, discovery, secure communication, and application protocols.

Reference:
- https://github.com/agent-network-protocol/AgentNetworkProtocol

This may become relevant for future federation across administrative domains, especially when combined with questions such as:

```text
remote Agent identity
publisher/service identity
cross-platform authentication
delegated authority proofs
end-to-end secure messaging
```

It is not mature/necessary enough to shape v0.4. Track it alongside A2A/UCAN rather than inventing distributed identity now.

---

# Part III — Implementation/backend reuse

## 17. Vercel AI SDK

The AI SDK already provides a broad provider-neutral model transport ecosystem with many model providers, model registries, middleware, tool schema helpers, streaming, and MCP integration.

Source:
- https://ai-sdk.dev/
- https://github.com/vercel/ai

Observed license: Apache-2.0.

Recommended use:

```text
Arrokoth ModelProvider port
      ├── native Gemini reference adapter
      └── AI-SDK-backed adapter
             ↓
        OpenAI / Anthropic / Google / Bedrock / etc.
```

Do not outsource Agent semantics to the AI SDK's high-level tool loop.

A tool `execute` callback in a provider SDK should not bypass:

```text
ModelCapabilityCall
    ↓
resolved invocation binding
    ↓
typed Effect proposal
    ↓
Harness authorization
```

The SDK should own provider protocol normalization, not authority or runtime progression.

---

## 18. OpenTelemetry GenAI semantic conventions

OpenTelemetry's GenAI semantic conventions increasingly cover inference, tools, Agents/workflows, retrieval, and memory-related operations.

The GenAI conventions are still evolving/developmental, so Arrokoth should treat them as an exporter vocabulary rather than a kernel contract.

Sources:
- https://opentelemetry.io/docs/specs/semconv/gen-ai/
- https://github.com/open-telemetry/semantic-conventions-genai

Recommended relationship:

```text
Arrokoth journal / trace / Event / Effect truth
        ↓ projection
OpenTelemetry spans/metrics/logs
```

Do not store arbitrary OTel attribute names as the canonical internal representation.

Tool arguments/results may contain secrets or sensitive user data; OTel itself treats some payload capture as opt-in. Arrokoth exporters should default to metadata/redaction-conscious behavior.

---

## 19. Durability: DBOS, Temporal, Restate

The canonical semantic contract should be proven first with in-memory and straightforward durable stores. External durable runtimes can then be evaluated behind ports.

### 19.1 DBOS

DBOS TypeScript offers database-backed durable workflows, step checkpointing, recovery, durable sleeps/timers, and Postgres-based state.

Sources:
- https://docs.dbos.dev/
- https://github.com/dbos-inc/dbos-transact-ts

Observed TypeScript license: MIT.

Why it is interesting:
- TypeScript-native;
- relatively lightweight operational model;
- Postgres as the durable foundation;
- useful for applications already comfortable with a relational store.

Caution:

```text
DBOS Workflow ≠ Arrokoth Workflow
```

Arrokoth should not translate its semantic Workflow Stages one-to-one into DBOS workflow steps unless that mapping proves correct. DBOS may instead back durable scheduling/workers/effect execution or selected runtime operations.

### 19.2 Temporal

Temporal is a mature distributed durable execution/orchestration system with Activities, durable Workflow code, child workflows, signals/updates, timers, cancellation, retry, versioning, workers, and cluster services.

Sources:
- https://docs.temporal.io/develop/typescript
- https://github.com/temporalio/sdk-typescript

Observed TypeScript SDK/server licensing: MIT.

Strengths:
- very mature failure/retry/durability model;
- distributed workers;
- rich long-running workflow primitives;
- broad operational ecosystem.

Cautions:
- Temporal Workflow deterministic-replay constraints are not the same as Arrokoth Workflow semantics;
- model calls and arbitrary side effects must remain outside deterministic workflow code/inside Activities or equivalent boundaries;
- adopting Temporal too early could force Arrokoth concepts to fit its programming model.

Use only after Arrokoth persistence/scheduler/pending-operation semantics are stable enough to define a clean adapter.

### 19.3 Restate

Restate provides durable services, stateful/virtual objects, workflows, durable timers, reliable calls, and recovery.

Source:
- https://docs.restate.dev/

Conceptually it is interesting because its **durable service/object** model may align with long-lived addressable Agent services more naturally than a workflow-only engine.

However, the Restate server currently uses Business Source License 1.1 with an additional-use grant and later Apache conversion. This is not a plain permissive open-source dependency and must be reviewed carefully for Arrokoth product/service plans.

Source:
- https://github.com/restatedev/restate/blob/main/LICENSE

Recommendation: implementation/reference watchlist rather than default backend.

### 19.4 Durability conclusion

Do not choose one now.

Preserve ports such as:

```text
ExecutionStore
Mailbox/EventStore
PendingOperationStore
EffectJournal
SchedulerQueue
```

Then benchmark/validate a backend against Arrokoth conformance rather than changing semantics to match the backend.

---

## 20. Isolation: OpenClaw and Dify Sandbox

### 20.1 OpenClaw isolation pattern

OpenClaw's sandbox/code-mode design provides a useful implementation pattern:

```text
trusted gateway/host
  owns tools/policy/secrets
        ↓ controlled bridge
isolated guest process/runtime
  receives bounded computation surface
```

The sandbox can restrict workspace access, network, capabilities, and mounts. Tool calls return to the trusted host execution path rather than handing all credentials to the guest.

This closely matches the intended Arrokoth hostile-code profile:

```text
untrusted Stage/Agent code
  ↓
ExecutionEnvironment
  local computation + explicit resource views
  ↓ Effect bridge
Harness
  authorization / secrets / external clients
```

OpenClaw's path/mount hardening and deny lists are useful test references because container isolation can be undermined by dangerous host mounts, symlink escape, Docker sockets, credential directories, etc.

### 20.2 Dify Sandbox

Dify Sandbox is a separate Apache-2.0 repository designed to execute untrusted code in a multi-tenant environment. It uses Linux/container assumptions and syscall restrictions (libseccomp/whitelists) as part of its containment model.

Sources:
- https://github.com/langgenius/dify-sandbox
- https://github.com/langgenius/dify-sandbox/blob/main/FAQ.md

Potential use:
- reference backend or implementation study for a narrow code-execution profile;
- not sufficient by itself for the complete Arrokoth threat model (network, filesystem, credentials, mounts, quotas, tenant boundaries, effect bridge all still matter).

### 20.3 Dify main repository licensing

Dify's main repository uses a modified Apache-2.0-based license with additional conditions, including a commercial-license requirement for operating its source as a multi-tenant service and frontend branding restrictions.

Source:
- https://github.com/langgenius/dify/blob/main/LICENSE

Therefore:
- study Dify workflow/HITL/plugin/security designs;
- do not casually embed/copy main Dify product code into a future hosted multi-tenant Arrokoth product;
- Dify Sandbox has a separate permissive license and should be evaluated independently.

---

## 21. Dify workflow/HITL/plugin lessons

Dify remains useful as an implementation reference even when its core product model is not adopted.

Useful patterns to study:

```text
visual/declarative Workflow authoring
pause/resume for human input/review
plugin manifests and requested permissions
separate sandbox service
separate SSRF/network protection
runtime status/progress projection to UI
```

Arrokoth already has stronger conceptual distinctions for:

```text
Workflow vs Agent
Stage vs Execution
RequestUserInput vs confirmation
authority vs exposure
```

so these are mostly Layer-3 implementation/UX references.

One portable lesson: a plugin/Skill manifest may declare **requested requirements/permissions**, but declaration must not equal effective grant.

---

# Part IV — Other potentially missed areas

## 22. Capability-based security as a conceptual cross-check

Arrokoth uses the word **authority** intentionally. Capability-security literature makes a useful distinction between possessing permission and the effects a component can cause through direct and indirect interactions.

UCAN's specification explicitly frames authority as the total effects enabled by delegated capabilities and requires attenuation on delegation.

This validates several Arrokoth principles:

```text
child authority must narrow
ambient host privilege is dangerous
resource handles should be scoped
raw credential possession is not required
message permission does not imply other powers
```

Possible future distributed mechanism:
- short-lived signed/MACed capability tokens to remote resource gateways/workers.

But inside one trusted Harness, an internal authority record/ref is cheaper and simpler than cryptographic capabilities.

---

## 23. Supply-chain trust for Skills/plugins

This survey did not find a reason to add supply-chain machinery to v0.4, but the future public Skill/Agent ecosystem will need it.

Areas to evaluate later:

```text
publisher identity
content hashes/content-addressed packages
signatures (e.g. Sigstore-like approaches)
version pinning/lockfiles
requested-authority manifest
sandbox/security-profile requirement
static/malware scanning
revocation/blocklists
provenance
```

This is distinct from runtime authority:

```text
package signature proves provenance/integrity
        ≠
permission to perform Effects
```

Agent Skills' package format, OCI-style artifact distribution, and modern software supply-chain standards should be surveyed when public distribution becomes real.

---

## 24. Workload identity and distributed trust

If one logical Harness becomes distributed across workers, future implementation questions include:

```text
worker authentication
mTLS/service identity
secret delivery
remote capability enforcement
message integrity
attestation when isolation guarantees matter
```

Potential standards to study later include SPIFFE/SPIRE, OAuth/OIDC workload flows, and signed capability approaches such as UCAN.

Do not introduce per-Execution public/private keypairs in the trusted local profile merely for conceptual purity.

---

## 25. Frontend/client protocol diversity

Avoid treating one frontend standard as universal:

```text
AG-UI
  general Agent runtime ↔ application UI stream

A2UI
  portable generated UI intent/components

MCP Apps
  interactive UI returned through MCP Tool ecosystem

ACP
  coding-Agent ↔ editor integration
```

Arrokoth should define internal state/trace/interactions once and project them to the client protocol required by the product surface.

---

## 26. Commerce/transaction protocols as stress tests

AP2 and related commerce protocols are useful even if Arrokoth never owns payment semantics, because autonomous financial actions stress the exact boundaries we care about:

```text
user intent
standing delegation
exact action binding
external credential/authentication
mechanical confirmation
receipts/audit
revocation
```

Treat vertical protocols as **semantic stress tests** for generic authority/confirmation interfaces rather than reasons to put “payment” in the kernel.

---

# Part V — Candidate changes for canonical rewrite

## 27. Candidate A: Principal context distinct from Execution identity

Potential mental-model rule:

> **Execution identity is runtime identity, not automatically application principal identity.**

Policy may evaluate authenticated application facts such as:

```text
agent/service principal
human/user principal
on-behalf-of relationship
tenant/world/application
resource owner
current task/session
```

The Harness remains the runtime enforcement point. Application policy defines what these domain principals mean.

Likely owner: `authority.md` with one invariant in `mental-model.md`.

---

## 28. Candidate B: Heterogeneous progressive discovery

Potential conceptual rule:

> **The discoverable universe may be much larger than the current Active View; authorized descriptors can be searched/hydrated progressively without making the entire catalog model context.**

Searchable typed domains may include:

```text
Operations
Resources
Agent/Workflow services
Memory interfaces
Skills
Interaction templates
```

Important invariant:

```text
discovery never enlarges Effective Authority
```

Likely owner: `authority.md` for Catalog→Authority→Active View→Projection; `interoperability.md` for descriptor types; `composition.md` for Skills/Definitions.

---

## 29. Candidate C: Explicit vs Derived Semantic Memory

Potential mental-model rule:

```text
Structured Memory
  explicit/schema-bound state

Derived Semantic Memory
  inferred/provenance-bearing knowledge
```

Do not let inferred memory silently become authoritative structured state or authorization evidence.

Likely owner: new `memory.md`.

---

## 30. Candidate D: Source Episode / provenance relation

Potential rule:

> **Derived semantic memory should be traceable to source observations and may be superseded without erasing source history.**

The source need not be called an `Episode` in core. Existing Events/messages/resources/artifacts can serve as provenance sources. A memory provider may materialize its own episodic representation.

Likely owner: `memory.md`.

---

## 31. Candidate E: Memory scope orthogonal to memory form

Do not make “user memory”, “organizational memory”, etc. separate fundamental storage ontologies merely because one provider uses those names.

Conceptually:

```text
memory form
    ×
memory scope/view
```

Visibility/authority remains explicit.

Likely owner: `memory.md` + `authority.md` cross-reference.

---

## 32. Candidate F: Delegation/evidence metadata

Before child composition and consequential autonomous actions mature, test whether effective grants/evidence need explicit:

```text
issuer/delegator
holder/subject
scope
constraints
delegable flag
validity
provenance
exact payload binding where applicable
consumption/revocation
```

Do not freeze a universal token format. These are semantic questions independent of Cedar/OpenFGA/UCAN/AP2 encodings.

Likely owner: `authority.md`; confirmation details in `security.md` or `execution-runtime.md` depending final doc ownership.

---

## 33. Candidate G: Skill as composition/package

Potential rule:

> **A Skill is a reusable package of instructions/resources/composition and interface metadata; it is not itself an Execution or controller.**

Profiles:

```text
instruction-only
composition-backed (root Agent/Workflow)
```

Agent Skills `SKILL.md` is an important compatibility profile, not the definition of all Arrokoth Skills.

Likely owner: `composition.md`; external format mapping in `interoperability.md`.

---

## 34. Candidate H: Continuation requirement beyond user input

Research signal from A2A:

```text
input-required
auth-required
```

Possible portable generalization:

```text
ContinuationRequirement
```

Do not add a new kernel Effect until a real case demonstrates that `RequestUserInput` plus external adapter state cannot express the needed semantics cleanly.

Likely owner if adopted: `interoperability.md`; runtime mapping remains in `execution-runtime.md`.

---

# Part VI — Explicit non-adoptions

## 35. Concepts we should not import directly

### Do not make A2A Task the Execution model

A2A intentionally hides internal runtime semantics and is too weak to replace Execution.

### Do not make MCP Tool or OpenClaw Tool the capability ontology

Portable Operation remains the reusable interface; Effect remains runtime semantic request.

### Do not make BM25/embeddings kernel semantics

They are replaceable discovery/retrieval strategies.

### Do not make Cedar/OpenFGA the authority model

They are policy engines/backends. Arrokoth must remain usable with a tiny local policy implementation.

### Do not make Graphiti's graph ontology the memory model

Graph is one representation/backend for derived knowledge.

### Do not make Mem0's conversation/session/user/org categories the fundamental Arrokoth memory taxonomy

They mix lifetime, context, and scope. Adopt the useful distinctions, not the exact taxonomy.

### Do not make SKILL.md a new Execution kind

Skill is packaging/composition; activation may or may not create a child Execution.

### Do not make Temporal/DBOS/Restate Workflow equal Arrokoth Workflow

They are durable runtime programming/execution models with different semantics.

### Do not make OpenTelemetry the trace/journal source of truth

OTel is an export vocabulary.

### Do not make AG-UI/CloudEvents protocol events equal Arrokoth Events

External representation does not redefine runtime observation semantics.

---

# Part VII — Consequences for the planned documentation rewrite

## 36. `mental-model.md`

Keep only the whole picture and strongest invariants.

Potential new/updated one-line concepts from this research:

```text
Execution identity ≠ application principal identity
explicit memory ≠ derived semantic memory
large authority/catalog ≠ model context
Skill ≠ Execution
```

Do not put Cedar/OpenFGA/Mem0/Graphiti/OpenClaw mechanics into the mental model.

---

## 37. `execution-runtime.md`

Own:

```text
Execution / ExecutionContext meaning
Harness
Activation
lifecycle
Events / Effects
PendingOperation
fast/slow completion
correlation/causation
waiting/wake-up
terminal completion
mailbox/runtime messaging mechanics
supervision/cancellation operational semantics
logical identity vs physical worker/materialization
```

Useful research influence:
- Orleans logical identity/passivation validates Execution ≠ physical activation.
- OTP supervision informs future restart/failure policy.
- A2A/MCP async handles remain external projections.

---

## 38. `composition.md`

Own:

```text
Agent vs Workflow semantic progression
Stage
Function/LLM local computation
spawn/call/send/ask
ownership vs communication
child composition
Adapters
Skill package/composition
```

Useful research influence:
- broader Skill concept with instruction and composition-backed profiles.
- A2A is not the internal child-composition model.
- future supervision policy can be referenced but operational details belong runtime.

---

## 39. `authority.md`

This should be a major concept-owner document.

Own:

```text
Authority categories
requested vs effective authority
delegation / attenuation
Execution ≠ application principal
application policy facts / on-behalf-of relationships
Catalog → Effective Authority → Active View → Invocation Projection
authorized progressive discovery
policy query/filter/enumeration
resource/operation/spawn/message authority
confirmation/evidence relationship
```

External references used as design evidence:
- Cedar
- OpenFGA/Zanzibar
- UCAN
- AP2
- OpenClaw/Hermes discovery mechanics

The canonical doc should explain the concepts without becoming a survey of those projects.

---

## 40. `memory.md`

Own:

```text
memory ≠ context
Structured Memory
Derived Semantic Memory (if accepted)
Working Notes
Artifacts/Files
source history/provenance
memory form vs scope/view
visibility/delegation
context compilation relationship
supersession / temporal facts at conceptual level
trust/promotion rules
```

External evidence:
- Mem0 for practical scoped/additive memory and hybrid retrieval.
- Graphiti for Episodes, temporal knowledge, provenance, graph retrieval.

Keep vector database/graph database implementation details out of canonical semantics.

---

## 41. `interoperability.md`

Own portable interface concepts and protocol mappings.

Likely target families:

```text
MCP
A2A
Agent Skills
HTTP/OpenAPI
AsyncAPI/CloudEvents
AG-UI where frontend service interaction belongs
ACP where coding-client integration belongs
future protocols
```

Own:

```text
Operation
Resource
service/Definition interface
interaction template
async handle
continuation/input requirement
change signal
portable schema choice
explicit export/import
```

Do not repeat the kernel definitions; link to their owners.

---

## 42. `security.md`

Own:

```text
semantic enforcement vs physical containment
trusted local vs hosted declarative vs isolated code profiles
prompt/tool/memory/protocol content cannot grant authority
control-plane auth vs Execution runtime authority
mechanical confirmation/evidence guarantees
sandbox/network/filesystem/secrets concerns
supply-chain and signing future boundary
```

External implementation references belong in short notes or future-plan, not lengthy walkthroughs:
- OpenClaw sandbox
- Dify Sandbox
- Cedar/OpenFGA
- AP2

---

## 43. `future-plan.md`

Keep only features not targeted/frozen for v0.4 and unresolved questions.

Possible future questions identified here:

```text
full heterogeneous discovery engine and ranking strategy
Derived Semantic Memory exact API/provider contract
bitemporal/supersession semantics
public Skill packaging/signing/registry
federated identity / UCAN-like delegation
A2A server/client adapter
AG-UI/ACP/A2UI/MCP Apps bindings
distributed durability backend selection
remote worker identity/attestation
information-flow labels/taint
standing autonomous authorization mandates/receipts
```

Do not let `future-plan.md` restate current v0.4 semantics.

---

# Part VIII — Slice D implications

## 44. Do not redesign Slice D into the full research vision

Slice D has not started. That is a good opportunity to improve docs first, but it is still important not to overload the first Agent implementation.

The current accepted minimum remains appropriate:

```text
operation catalog/intrinsic descriptor
        +
effective operation authority
        ↓
ActiveOperationViewResolver
        ↓
immutable per-call ModelOperationProjection
        ↓
model call
        ↓
resolve returned name against same snapshot
        ↓
typed Effect proposal
        ↓
Harness authorization
```

### What Slice D should anticipate

- Active View types should not assume the universe can only ever contain locally registered executor tools.
- operation refs should remain stable/portable enough for later MCP/A2A/service projection.
- resolver should have a seam that can later use BM25/embedding/hybrid selection without changing Agent semantics.
- authority input should be abstract enough that a future policy backend can filter/enumerate efficiently.
- context compiler and operation projector remain separate.

### What Slice D should not implement yet

```text
full heterogeneous Skill/Resource/Agent discovery index
Mem0/Graphiti integration
Cedar/OpenFGA dependency
A2A server/client
Agent Skills package loader
JSON Schema full-dialect portable service registry
learned/LLM operation selector
DBOS/Temporal runtime
```

The canonical rewrite should make these future seams understandable without turning Slice D into a platform rewrite.

---

# Part IX — Source and maturity notes

## 45. Licensing / reuse notes observed during survey

| Project/component | Observed license/reuse note |
|---|---|
| OpenClaw | MIT |
| Hermes Agent | MIT |
| Mem0 OSS | Apache-2.0 |
| Graphiti | Apache-2.0 |
| Cedar | Apache-2.0 |
| OpenFGA | Apache-2.0 |
| Vercel AI SDK | Apache-2.0 |
| DBOS TypeScript | MIT |
| Temporal TypeScript/server | MIT |
| Dify main | modified Apache-2.0-based license with additional multi-tenant/frontend restrictions |
| Dify Sandbox | Apache-2.0 |
| Restate server | Business Source License 1.1 with additional-use grant and future Apache conversion; review before product dependency |

License status must be rechecked at the exact version before copying/linking code or shipping a dependency.

---

## 46. Primary source index

### Arrokoth current architecture
- `docs/mental-model.md`
- `docs/composition.md`
- `docs/runtime-architecture.md`
- `docs/interoperability.md`
- `docs/security-guarantees.md`
- `docs/implementation-guide.md`
- `docs/future-plan.md`
- `docs/development/007-interoperability-decisions-before-agent-slice.md`

### A2A
- https://a2a-protocol.org/latest/topics/key-concepts/
- https://a2a-protocol.org/v1.0.0/
- https://a2a-protocol.org/dev/specification/

### MCP
- https://modelcontextprotocol.io/
- https://blog.modelcontextprotocol.io/

### OpenClaw
- https://docs.openclaw.ai/tools/tool-search
- https://docs.openclaw.ai/tools/code-mode
- https://github.com/openclaw/openclaw/blob/main/LICENSE

### Hermes
- https://hermes-agent.nousresearch.com/docs/user-guide/features/tool-search
- https://github.com/NousResearch/hermes-agent

### Cedar
- https://docs.cedarpolicy.com/auth/authorization.html
- https://docs.cedarpolicy.com/bestpractices/bp-using-the-context.html
- https://github.com/cedar-policy/cedar

### OpenFGA / Zanzibar
- https://openfga.dev/docs/use-cases/ai-agent-authorization
- https://openfga.dev/docs/modeling/agents/task-based-authorization
- https://openfga.dev/docs/use-cases/rag-authorization
- https://openfga.dev/docs/use-cases/mcp-server-authorization
- https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/

### UCAN
- https://github.com/ucan-wg/spec
- https://ucan.xyz/delegation/

### AP2 Agent Authorization
- https://ap2-protocol.org/ap2/agent_authorization/
- https://ap2-protocol.org/ap2/specification/

### Mem0
- https://docs.mem0.ai/core-concepts/memory-types
- https://docs.mem0.ai/platform/features/graph-memory
- https://docs.mem0.ai/migration/oss-v2-to-v3
- https://github.com/mem0ai/mem0

### Graphiti
- https://help.getzep.com/graphiti/getting-started/welcome
- https://github.com/getzep/graphiti
- https://github.com/getzep/graphiti/tree/main/graphiti_core/search

### Agent Skills
- https://agentskills.io/specification
- https://agentskills.io/

### AG-UI / client protocols
- https://docs.ag-ui.com/
- https://zed.dev/acp

### JSON Schema
- https://json-schema.org/draft/2020-12

### AsyncAPI / CloudEvents
- https://www.asyncapi.com/docs/reference/specification/v3.1.0
- https://cloudevents.io/

### AI SDK
- https://ai-sdk.dev/
- https://github.com/vercel/ai

### OpenTelemetry GenAI
- https://opentelemetry.io/docs/specs/semconv/gen-ai/
- https://github.com/open-telemetry/semantic-conventions-genai

### Durable runtimes
- https://docs.dbos.dev/
- https://github.com/dbos-inc/dbos-transact-ts
- https://docs.temporal.io/develop/typescript
- https://github.com/temporalio/sdk-typescript
- https://docs.restate.dev/
- https://github.com/restatedev/restate/blob/main/LICENSE

### Actor-runtime references
- https://www.erlang.org/docs/27/system/design_principles.html
- https://www.erlang.org/doc/apps/stdlib/supervisor.html
- https://learn.microsoft.com/en-us/dotnet/orleans/overview
- https://learn.microsoft.com/en-us/dotnet/orleans/host/configuration-guide/activation-collection
- https://learn.microsoft.com/en-us/dotnet/orleans/grains/timers-and-reminders

### Dify / sandbox
- https://github.com/langgenius/dify/blob/main/LICENSE
- https://github.com/langgenius/dify-sandbox
- https://github.com/langgenius/dify-sandbox/blob/main/FAQ.md

---

## 47. Questions to resolve during the canonical rewrite

These are the most useful prompts to revisit while rewriting, rather than answers to freeze in this temporary file.

### Mental model

1. Is `Execution identity ≠ application principal identity` important enough to be a top-level invariant?
2. Should the mental model name Derived Semantic Memory, or only say explicit memory and inferred memory are distinct and delegate taxonomy to `memory.md`?
3. Should Skill appear in the overview or only composition?

### Runtime

4. What supervision/failure semantics are actually v0.4 commitments vs future work?
5. Is logical dormant/passivated Execution behavior merely implementation, or should “physical activation does not define existence” be explicit?

### Authority

6. What is the smallest general shape of an effective authority grant before Slice E?
7. Does delegation provenance need to be first-class immediately or can it remain policy/audit metadata?
8. Should the policy port conceptually support enumeration/filtering as well as check?
9. Where exactly is Active View derived: Harness-owned runtime policy, controller-facing resolver, or a shared service under Harness authority truth?
10. How should task/session/application principal facts enter policy without putting product tenancy into core?
11. What is the right conceptual boundary between standing semantic authorization evidence, budget/constraints, and exact mechanical confirmation?

### Discovery

12. Should “DiscoverableSummary” be a named portable concept or remain an implementation/index projection?
13. Should Resources/Skills/Definitions/memory interfaces share one query API or only one indexing mechanism with typed results?
14. How much discovery should happen automatically before a model call vs through a model-visible progressive search operation?
15. How do we benchmark recall/latency/token savings so BM25/embedding/LLM selectors remain evidence-driven?

### Memory

16. Exact name: `Derived Semantic Memory`, `Semantic Memory`, `Knowledge Memory`, or another term?
17. Is a source Episode a portable Arrokoth concept, or are Event/Artifact/Message/resource provenance refs enough?
18. Which temporal metadata is universally meaningful vs provider-specific?
19. How is a derived claim corrected/superseded without deleting provenance?
20. What can promote a derived claim into authoritative Structured Memory?
21. What trust labels/source classes are needed to prevent inferred memory from becoming authorization evidence?
22. Should scope be represented through memory store namespaces, policy views, or both?

### Skill/composition

23. Does a composition-backed Skill always have exactly one root Definition?
24. Can a Skill be pure instructions/resources without a root Definition?
25. How are input bindings/defaults represented?
26. How are requested resources/capabilities declared without conflating them with authority grants?
27. How should a richer Skill export to Agent Skills when the external format cannot encode composition?

### Interoperability

28. Should A2A be called first-class alongside MCP now, or added when the first exported Agent service exists?
29. Does `InputRequirement` become a broader continuation requirement, or is external auth best kept adapter-specific?
30. When should JSON Schema 2020-12 become the portable descriptor contract?
31. Which frontend bindings (AG-UI, A2UI, MCP Apps, ACP) deserve canonical mention vs future-plan watchlist?

### Implementation

32. Should AI SDK become the recommended multi-provider implementation immediately after the native provider conformance path is stable?
33. What durability conformance suite would allow DBOS/Temporal/other backends to prove semantic equivalence?
34. What exact threat-model tests must any Dify/OpenClaw/container/microVM sandbox backend pass?

---

## 48. Final research stance

The survey does **not** suggest replacing ArrokothI with another Agent framework or protocol.

It suggests a more disciplined architecture:

```text
Arrokoth-owned semantic kernel
  Execution / Event / Effect / authority / memory / lifecycle

        ↓

Arrokoth-owned portable/composition layer
  Operation / Resource / service / Skill / discovery / schemas / handles

        ↓

standard bindings
  MCP / A2A / Agent Skills / HTTP / UI protocols / message protocols

        ↓

replaceable implementation backends
  model SDKs / policy engines / memory engines / durability / isolation / telemetry
```

The middle remains ours, but “ours” should mean **the smallest general semantics that survive multiple external implementations**, not proprietary reinvention.

The most valuable external ideas are the ones that force a cleaner distinction inside Arrokoth:

```text
runtime identity ≠ application principal
catalog ≠ authority ≠ Active View ≠ model projection
explicit state ≠ inferred semantic memory
source observation ≠ derived claim
memory form ≠ memory scope
delegated/standing authorization ≠ exact action confirmation
Skill package ≠ Execution
external task/message/protocol state ≠ kernel runtime truth
```

Those distinctions should guide the canonical documentation rewrite. Implementation libraries and protocols should then fit behind them rather than forcing the concepts to bend around a particular ecosystem.
