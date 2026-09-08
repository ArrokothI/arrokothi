# ArrokothI Product Vision

> **Status: cross-repository product vision. Not canonical kernel architecture.**
>
> This document describes what ArrokothI may become as a product family across multiple repositories
> and surfaces. It is intentionally broader than this `agent-kernel` repository. Canonical execution,
> composition, authority, memory, interoperability, and security semantics remain owned by the
> architecture documents indexed in [`README.md`](README.md).
>
> Product names, repository boundaries, packaging, UI details, pricing, and third-party integrations
> are expected to evolve. They must not silently redefine kernel semantics.

---

The [active development roadmap](development/001-current-status-and-roadmap.md) selects the release
boundary and investment gates. This vision preserves possibilities; Studio, Cloud, deep adapters and
a universal Machine are not mandatory 1.0 deliverables.

## 1. Product thesis

ArrokothI should not require the world to standardize on one Agent framework.

The product opportunity is to make heterogeneous Agents, Workflows, services, resources, and human
interactions composable inside one reliable application execution system.

A concise product statement is:

> **ArrokothI lets developers compose Agents from different frameworks into reliable, governed
> applications.**

A broader enterprise statement is:

> **One execution and governance plane for heterogeneous Agents and Workflows.**

The architecture statement remains narrower and more precise:

> **ArrokothI is a provider-neutral execution kernel for long-lived Agents and Workflows.**

These statements describe different layers of the same product rather than competing definitions.

---

## 2. The application, not one Agent, is the primary product outcome

Many useful systems will not consist of one Agent from one framework.

A realistic application may contain:

```text
customer request
      ↓
ArrokothI Workflow
      │
      ├── Dify support application
      ├── Hermes research Agent
      ├── custom fraud Agent
      ├── ArrokothI-native analysis Agent
      ├── internal policy Workflow
      ├── MCP / HTTP services
      └── human approval
      ↓
terminal business result
```

The individual Agents may have been authored and tuned elsewhere. ArrokothI's job is not necessarily
to replace their cognition, tools, prompts, Skills, channels, or authoring environments.

The new application is created by composing them under coherent lifecycle, authority, communication,
waiting, causation, recovery, and observability semantics.

This implies an important product distinction:

```text
Agent creation
    !=
Agent application construction
```

ArrokothI may support both, but it should become exceptional at the second.

---

## 3. Agents should remain heterogeneous internally

Do not force every imported Agent into one internal implementation if doing so destroys the behavior
that made the source framework valuable.

Examples of framework-specific value may include:

```text
reasoning strategy
model/tool interaction design
context engineering
Skills
memory techniques
browser/coding environment
channel integration
provider-specific optimizations
```

The desired model is:

```text
external/native Agent implementation
             ↓
well-defined composition boundary
             ↓
ArrokothI application execution
```

ArrokothI should standardize the boundary needed for reliable composition, not homogenize all Agent
internals.

Useful questions at that boundary include:

```text
How is the Agent invoked?
What input and result contract does it expose?
Can it wait or resume?
Can it be cancelled?
Can its actions be intercepted before execution?
Which Operations/Resources does it require?
What lifecycle state can ArrokothI observe or own?
What guarantees can ArrokothI actually enforce?
```

The portable service/interface layer in [`interoperability.md`](interoperability.md) is the canonical
home for protocol-neutral mappings that support this direction.

---

## 4. Integration depth is a spectrum

An external Agent can participate in an ArrokothI application at different depths. The product must
make the difference explicit instead of pretending all integrations provide the same guarantees.

### 4.1 External service

```text
ArrokothI Execution
      ↓ HTTP / A2A / other protocol
external Agent runtime
```

ArrokothI can ordinarily govern the invocation boundary, correlation, outer waiting/timeout policy,
and surrounding Workflow. It cannot claim control over the external runtime's internal tool calls,
memory, side effects, or recovery unless the external contract proves those properties.

This is the easiest compatibility mode and should be useful for existing systems.

### 4.2 Wrapped / managed external task

```text
ArrokothI child/service boundary
             ↓
external Agent task/runtime
```

ArrokothI represents the external work explicitly inside its application lifecycle and may gain better
cancellation, progress, input-required, and terminal-result correlation through portable async/service
interfaces.

Operational truth remains shared: ArrokothI owns the surrounding Execution semantics while the
external runtime owns its internal execution.

### 4.3 Adapted executor

```text
ArrokothI Execution
      ↓
AgentController
      ↓
framework-specific AgentExecutor
      ↓
external framework cognition/model loop
```

This is the deepest interoperability target for an existing Agent framework.

The external framework may retain reasoning, ACI, context, Skills, and model-interaction behavior,
while ArrokothI owns operational truth:

```text
Execution identity and lifecycle
Effect authorization and settlement
waiting/resumption
child/peer relationships
runtime-owned authority
recovery semantics
```

For action-producing frameworks, native tool execution should be intercepted **before** the external
framework performs the side effect, then returned to ArrokothI as a semantic action request. The
existing Strands bridge is the first concrete example of this pattern.

### 4.4 Native ArrokothI Definition

```text
ArrokothI Agent/Workflow Definition
              ↓
ArrokothI Execution
```

This provides the strongest ability to preserve the full current ArrokothI semantic model.

### 4.5 Import/translation

Some external definitions may be translated into ArrokothI-native definitions:

```text
external DSL/profile/config
          ↓ importer
ArrokothI Definition
```

Translation must never silently claim semantic equivalence when the source and destination models
differ. Importers should report supported, adapted, lossy, and unsupported constructs explicitly.

---

## 5. A common product vocabulary for integration assurance

The Studio and APIs should expose the guarantees of each component clearly.

The exact labels are not fixed, but a useful conceptual scale is:

```text
Native
  ArrokothI owns the relevant execution semantics end to end.

Managed / Adapted
  external cognition runs behind an ArrokothI-owned operational boundary.

Wrapped
  ArrokothI owns the surrounding task/service lifecycle but not the external runtime internals.

External
  ArrokothI invokes a black-box service and can guarantee only the invocation boundary and
  surrounding application semantics.
```

Do not present a black-box HTTP Agent as though ArrokothI can guarantee its internal authorization,
memory provenance, exactly-once side effects, or recovery.

A central trust rule is:

> **Product UI and documentation must distinguish what ArrokothI observes, what ArrokothI controls,
> and what ArrokothI can actually guarantee.**

---

## 6. Reuse an Agent without inheriting all of its ambient power

One of the strongest product consequences of the authority model is that an Agent's source
configuration does not become the authority of every Execution that uses it.

For example, a reusable research Agent may normally know how to use:

```text
browser
terminal
filesystem
GitHub write
email
```

but an Execution inside one insurance-claims Workflow may receive only:

```text
web.read
claim.read
document.read
```

The same Agent reused in a publishing Workflow may receive a different authority envelope.

This supports the product promise:

> **Reuse powerful Agents without inheriting all of their ambient power.**

This depends on the canonical distinctions in [`authority.md`](authority.md): Definition identity is
not Execution authority, exposure is not authority, and final concrete action authorization remains a
runtime responsibility.

---

## 7. Workflow as the application assembly layer

The Workflow product surface should be able to compose heterogeneous components such as:

```text
ArrokothI-native Agent
ArrokothI-native Workflow
external Agent service
adapted framework Agent
MCP/A2A/HTTP service
ordinary local computation
human input / confirmation
```

A Workflow is therefore more than a visual flowchart. At the product level it is also where
heterogeneous lifecycle, authority, communication, and service boundaries are assembled into one
application.

The canonical distinction remains important:

```text
Workflow topology / Definition
        !=
runtime Execution graph
```

The Studio should visualize both without collapsing them.

---

## 8. ArrokothI's native runtime must remain strong

Interoperability must not reduce ArrokothI to "Zapier for Agents."

ArrokothI-native Agents and Workflows should remain first-class and should eventually offer strong
reference implementations for:

```text
provider-neutral model execution
long-lived waiting and recovery
Agent/Workflow composition
authority and delegation
memory boundaries
human interaction
portable Operations/Resources/services
security profiles
runtime observability
```

Applications should be free to choose:

```text
all native
all external
or, most realistically, a heterogeneous mix
```

A likely real-world application is:

```text
ArrokothI Workflow
  ├── ArrokothI-native routing Agent
  ├── Hermes coding/research Agent
  ├── Dify support application
  ├── internal Workflow
  └── human approval
```

ArrokothI's competitive value is the coherent application execution system around those components,
not a requirement that every component use the same Agent engine.

---

## 9. Studio product vision

Studio should not begin as a clone of a generic chatbot builder.

Its distinctive job is to make heterogeneous Agentic applications understandable, composable, and
operable.

### 9.1 Component catalog and import

A future "Add Agent / Service" experience may accept sources such as:

```text
ArrokothI Definition
Hermes profile/distribution
OpenClaw Agent/workspace/config
Dify DSL or App endpoint
Git repository
HTTP/OpenAI-compatible Agent endpoint
MCP server
A2A Agent Card/service
other framework adapters
```

"Agent" must not be assumed to mean "folder." Different ecosystems package runtime definitions and
state differently.

Studio should detect what it can, then clearly show what will and will not be imported:

```text
instructions/config       supported
Skills                    supported/adapted
Operations                discovered
secrets                   not copied; re-bind explicitly
history/memory             optional migration
unsupported semantics     explicit warning/refusal
```

### 9.2 Composition Studio

The component catalog can feed a visual/code-backed application composition surface:

```text
[Dify Support]
      ↓
[Hermes Research]
      ↓
 ┌────┴────┐
 ▼         ▼
[Risk]   [Policy Workflow]
 └────┬────┘
      ↓
[Human Approval]
      ↓
[Payment Service]
```

Each component should visibly identify its integration/assurance mode rather than appearing
identical.

### 9.3 Definition graph vs Execution graph

Studio should provide separate views for:

```text
Definition / Workflow topology
  what the application was designed to do

Execution graph
  what actually happened in this particular run
```

The runtime graph should expose parent/child relationships, waiting reasons, failures, cancellation,
and causation.

### 9.4 Execution explorer / flight recorder

For an Execution, Studio should answer at least:

```text
What is it doing?
Why is it waiting?
What did the model see?
Why was this action allowed or denied?
What retained information can it access?
What happened before it reached this state?
```

Advanced internal concepts should be progressively disclosed rather than required for ordinary use.

### 9.5 Authority debugger

A distinctive Studio capability should explain the complete narrowing path:

```text
Catalog
  ↓
Effective Authority
  ↓
Active View
  ↓
Model Projection
  ↓
model selection
  ↓
concrete Effect authorization
```

This should make questions such as "why did the Agent not see/call this operation?" answerable from
runtime evidence instead of prompt guessing.

### 9.6 Memory/provenance UI

Studio should visually distinguish:

```text
Structured Memory
Derived Semantic Memory
Working Notes
Artifacts
source observations/history
```

The UI should make inferred information look different from explicitly asserted application state and
show provenance/supersession where applicable.

---

## 10. Cross-repository product structure

This repository should not become the monorepo for every eventual ArrokothI product.

A plausible future organization is:

```text
ArrokothI/

agent-kernel
  canonical kernel contracts
  reference runtime
  SDK/runtime ports
  conformance tests

studio
  local/hosted developer and operator UI
  composition/execution/authority/memory visualization

cloud / control-plane
  hosted runtime control plane
  deployments, workers, storage, HA, tenancy, operations

integrations / adapters
  framework/protocol-specific integration packages
  may be separate repositories or an ecosystem of repositories

examples / templates
  end-to-end application examples and starter projects
```

These names and boundaries are provisional. The durable rule is architectural dependency direction:
product surfaces consume the kernel contracts; product requirements do not silently redefine kernel
semantics.

If a Studio product is built, keep it in a separate repository behind the public kernel API.

---

## 11. Ecosystem strategy: cooperate before replacing

ArrokothI should not assume that success means users stop using Hermes, OpenClaw, Dify, or future
Agent frameworks.

A stronger ecosystem outcome is:

```text
Hermes on/through ArrokothI
OpenClaw connected to ArrokothI
Dify authored application connected to ArrokothI
custom Agents governed by ArrokothI
```

Different products may specialize at different layers:

```text
Agent effectiveness / cognition      external framework or native ArrokothI
visual/no-code authoring              Dify-like surface or Studio
messaging/channel experience          OpenClaw-like surface
specialized research/coding Agent     Hermes-like executor
application execution/governance      ArrokothI
```

The preferred interoperability path is open and protocol-neutral where possible:

```text
MCP          Operations / Resources and related portable interfaces
A2A          Agent service interoperability where semantically appropriate
HTTP         boring, broad compatibility
native adapter deepest integration and strongest runtime control
```

This lowers partnership friction and keeps ArrokothI from depending on proprietary bilateral
integrations for ordinary compatibility.

---

## 12. Compatibility, partnership, and branding posture

Technical compatibility, distribution rights, trademark rights, and formal partnership are separate
questions.

The default product posture should be:

```text
"compatible with X"
"adapter for X"
"supports importing X configuration"
"can invoke X Agents"
```

only when those claims are technically true and tested.

Do **not** claim:

```text
"official X integration"
"X partner"
"certified by X"
"endorsed by X"
```

without the corresponding written authorization.

Third-party source code, SDKs, protocols, names, and logos each have their own license/terms. Before
shipping or marketing an integration, use the retained checklist through the active roadmap’s P7 release gate:
[ecosystem integration checklist](development/legacy/2026-09-baseline/006-ecosystem-integration-brand-and-license-checklist.md).

The ecosystem strategy should prefer technical interoperability that does not require a bilateral
contract, while remaining open to formal partnerships when co-marketing, certification, private APIs,
enterprise support, logo use, or deeper commercial distribution makes an agreement valuable.

---

## 13. Open-source and business direction

The most natural business model is compatible with an open kernel.

A plausible structure is:

```text
ArrokothI OSS
  kernel
  SDKs
  reference runtime
  conformance suites
  interoperability adapters
  useful local Studio

ArrokothI Cloud
  managed durable runtime
  managed scheduling/storage/workers
  hosted Studio
  high availability/backups/upgrades
  managed isolation
  monitoring/alerts

Enterprise
  organization controls
  SSO/SCIM/RBAC
  audit retention
  private networking / BYOC / VPC
  data residency/compliance features
  enterprise policy integration
  SLA/support
```

The open-source version should not be deliberately semantically crippled. Core properties such as
Execution semantics, authority boundaries, and durability should not exist only as proprietary
concepts.

Commercial value should primarily come from operating the difficult infrastructure reliably and
providing enterprise operational guarantees.

Pricing should be chosen after runtime cost structure is measured; a usage-oriented model around
execution activity, durable state, and isolated compute is likely more natural than pure seat pricing,
but this document does not freeze a billing unit.

---

## 14. Primary users

Likely user groups include:

### AI product developers

They already have one or more Agents but need durable execution, composition, human interaction, and
production debugging.

### AI startups

They want to build applications from specialized Agents without building an execution control plane
from scratch.

### Platform / infrastructure teams

Their organization has multiple Agent frameworks and needs one operational/governance plane.

### Enterprise AI teams

They care about authority, auditability, approvals, tenant boundaries, recovery, and controlled
integration with internal systems.

### Agent-framework authors

They may want their Agent engine to run as an ArrokothI `AgentExecutor` rather than implementing a
complete durable multi-tenant runtime themselves.

### SaaS teams

They embed ArrokothI behind their own product UI. Their end users may never need to know ArrokothI is
present.

---

## 15. Initial adoption wedge

ArrokothI should not target every personal Agent use case first.

The strongest early user is likely a developer/team whose Agent system has begun to encounter
production runtime problems:

```text
server restart during long work
wait days for a human
multiple Agents/frameworks
uncertain external side effects
permission/revocation requirements
child cancellation/supervision
large operation catalogs
cross-Agent communication
production debugging
many dormant executions
```

For a single local personal Agent with no durable/business-process requirements, a specialized Agent
product may be the better solution. ArrokothI's value should increase as an Agentic system begins to
look like a real distributed application.

---

## 16. Non-goals

ArrokothI should avoid becoming a shallow bundle of every adjacent AI feature.

Do not make success depend on winning all of these categories:

```text
largest built-in tool catalog
best personal messaging assistant
best voice stack
best browser Agent
best no-code RAG builder
best proprietary model
best prompt marketplace
```

Those capabilities can integrate with the execution system.

ArrokothI should become exceptional at:

```text
heterogeneous composition
Execution lifecycle
waiting/recovery
causation and communication
authority/delegation
runtime observability
memory/trust boundaries
portable service interoperability
application-level governance
```

---

## 17. Product success test

A strong future ArrokothI deployment might look like:

```text
customer apps / Slack / web / voice / internal APIs
                    │
                    ▼
          ArrokothI execution plane
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
   Hermes Agent   Dify App   ArrokothI Agent
       │            │            │
       ├──── MCP / HTTP / A2A ───┤
       │            │            │
       └──── internal services ───┘
```

An operator should be able to see:

```text
which applications are running
which Executions are waiting/failed
which components are external vs managed vs native
what authority each Execution holds
what the model actually saw
which actions were allowed/denied
what information is explicit vs inferred
what survived a restart
why a result or failure occurred
```

A developer should still be able to run the same semantic core locally without adopting the hosted
control plane.

A particularly strong ecosystem success signal would be:

> **Developers keep using the Agent frameworks they like, but choose ArrokothI as the place where
> heterogeneous Agentic applications are composed, executed, and governed in production.**
