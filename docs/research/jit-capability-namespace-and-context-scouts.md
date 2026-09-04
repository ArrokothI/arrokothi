# JIT Capability Namespace and Context Scouts

> **Status: focused non-canonical research note.**
>
> This document records a research direction for scaling knowledge/resource discovery and tool exposure without placing every authorized descriptor into every model context. It does **not** redefine current kernel semantics. Canonical authority/exposure ownership remains with [`../authority.md`](../authority.md); memory/context semantics remain with [`../memory.md`](../memory.md); child Execution composition and delegation remain with [`../composition.md`](../composition.md).
>
> Research date: **2026-09-04**.

## 1. Executive conclusion

ArrokothI already separates:

```text
Catalog
  ⊇ Effective Authority
  ⊇ Active/Exposed View
  ⊇ Model Invocation Projection
```

and the canonical authority model already allows progressive discovery to search an Execution's authorized descriptor universe and expand the Active View when the initial selection is insufficient.

The research direction in this note is to make that progressive discovery surface **hierarchical, navigable, and cheap to inspect**.

Instead of eagerly projecting every relevant tool schema, knowledge descriptor, resource, Skill, or service into a model invocation, the runtime could expose a small **virtual capability namespace** whose directory/category names provide semantic hints. A model could progressively navigate that namespace using familiar operations analogous to `ls`, `find`, and `cat`, materializing detailed descriptors only when needed.

Conceptually:

```text
Effective Authority
      ↓ authorized filtering / enumeration
Authorized Discovery Namespace
      ↓ navigate / rank / inspect
Active View
      ↓ provider-compatible projection
Model Invocation Projection
```

The namespace is a **discovery/index representation**, not an authority mechanism. It must never reveal or activate capability outside Effective Authority, and final concrete Effects remain subject to current Harness authorization.

A second extension is to delegate context acquisition to a constrained **Context Scout**: a cheaper/smaller child model whose job is to navigate authorized knowledge/resources, rank evidence, and return a compact provenance-preserving context package to the stronger primary model. This creates a tiered cognition pattern where expensive models spend tokens on reasoning and decisions rather than catalog exploration.

The two ideas fit together:

```text
cheap deterministic retrieval
        ↓
small Context Scout
        ↓
compact evidence + descriptor references
        ↓
strong primary model
        ↓
decision / action
```

This direction is especially interesting for ArrokothI's goal of making smaller/open models effective through architecture rather than relying only on larger context windows and larger models.

---

## 2. Motivation: authority scale should not imply prompt scale

A capable Execution may be authorized to access a large universe:

```text
hundreds/thousands of Operations
many knowledge collections
many Resources
multiple services / Agents / Workflows
Skills and interaction templates
```

But authorization answers:

> What could this Execution legally use/access now?

It does **not** imply:

> The model should receive the full description/schema of everything now.

The canonical `Effective Authority -> Active View -> Model Invocation Projection` split already protects this distinction. The remaining research question is how to make the narrowing/discovery process easy for models when the authorized universe itself becomes large.

Flat catalogs eventually reproduce the same token problem in a cheaper form:

```text
1000 full schemas      -> too large
1000 names+descriptions -> still large
1000 names             -> still noisy
```

A hierarchy can reduce the branching factor at each decision:

```text
communication
  -> email
     -> send
        -> full descriptor/schema
```

rather than forcing one model decision over hundreds of unrelated leaves.

---

## 3. Candidate abstraction: a virtual authorized capability namespace

This note proposes a **virtual, read-only namespace**, not necessarily an OS filesystem.

Example:

```text
/capabilities
├── knowledge
│   ├── project
│   ├── customer
│   └── policy
├── tools
│   ├── communication
│   ├── engineering
│   ├── data
│   └── web
├── resources
├── skills
├── services
└── agents
```

The hierarchy itself acts as a low-cost semantic index. Directory/category names communicate intent before detailed descriptors are loaded.

A possible exploration sequence:

```text
ls /capabilities/tools

communication/
engineering/
data/
web/
```

then:

```text
ls /capabilities/tools/communication

email/       Email messaging and mailbox operations
slack/       Slack messaging and channel operations
calendar/    Calendar lookup and scheduling operations
```

then:

```text
ls /capabilities/tools/communication/email

search       Search authorized mailboxes
send         Send an email
create_draft Create an email draft
```

and only after selecting a leaf:

```text
cat /capabilities/tools/communication/email/send

stable operation ref: op-42
effect: write
summary: Send an email
confirmation: policy-dependent
input contract: ...
```

The detailed descriptor can then be admitted to the Active View and provider projection for the next invocation.

### 3.1 `ls`, `find`, and `cat` are interaction semantics, not necessarily shell commands

The important property is that models already understand filesystem navigation extremely well. The implementation does not have to expose a real shell or real paths.

A runtime could offer controller-facing primitives such as:

```text
capability_list(path)
capability_find(query, path?, limit?)
capability_view(ref, detail_level?)
```

while presenting them to a CLI-oriented model using filesystem-like affordances.

This avoids accidental coupling to host filesystem security and allows the runtime to preserve typed stable references behind friendly paths.

### 3.2 The hierarchy is part of retrieval

A poor implementation would make:

```text
ls /capabilities
```

return 2,000 leaf names. That merely recreates the original problem.

The useful property is progressive reduction:

```text
root categories
    ↓
provider/domain categories
    ↓
capability groups
    ↓
leaf descriptors
    ↓
full schema/contract
```

The ontology itself becomes a retrieval index.

---

## 4. Relationship to current Active View semantics

This proposal should **not** redefine Active View to mean all of Effective Authority.

Current canonical semantics remain:

```text
Model Invocation Projection
        ⊆
Active/Exposed View
        ⊆
Effective Authority
        ⊆
Catalog universe
```

A clean interpretation is:

```text
Effective Authority
  ↓
build an authorized discovery index / namespace
  ↓ model navigates the index
select stable descriptor refs
  ↓ deterministic validation/ranking
expand or refresh Active View
  ↓
project selected descriptors to model invocation
```

Under this interpretation, the namespace is a derived discovery structure over authorized possibilities. Model-visible discovery results still do not become authority. Selected callable leaves must enter the Active View/provider projection before ordinary tool selection, unless a future canonical design defines a direct typed invocation path with equivalent snapshot/binding guarantees.

An alternative design would model directory/category nodes themselves as catalog descriptors and put only those lightweight nodes in the Active View. That may be viable, but it would enlarge the descriptor ontology and requires a canonical decision. This note does not assume that change.

---

## 5. The `available` / "other capabilities" idea

A useful UX distinction is between:

```text
likely relevant now
vs.
other things this Execution is still authorized to discover
```

For example:

```text
/capabilities
├── active
│   ├── knowledge/...
│   └── tools/...
└── available
    ├── communication/...
    ├── enterprise_apps/...
    └── data/...
```

However, this tree should be understood carefully.

`available` must **not** mean "everything in the global Catalog." It may contain only possibilities already inside current Effective Authority:

```text
discoverable ⊆ Effective Authority
```

A capability cannot become legal merely because a model finds a path to it.

A safer terminology than `other_capabilities` is therefore `available` or `authorized`, because it communicates that these are dormant/discoverable possibilities for this Execution rather than arbitrary platform capabilities.

The exact representation of `active/` versus `available/` remains TBD because current Active View is a semantic exposure layer, while the proposed namespace is primarily a discovery/index layer. An implementation should avoid creating two conflicting meanings of "active."

---

## 6. Progressive materialization and eviction

JIT disclosure solves little if every descriptor loaded during a long Execution remains in model context forever.

The runtime should investigate **progressive materialization with later de-materialization**.

Conceptually:

```text
authorized + discoverable
      ↓ inspect
selected descriptor
      ↓
Active View / invocation projection
      ↓ use / phase transition / inactivity / compaction
return to discoverable-only state
```

This is analogous to a capability lease for context, not a lease for authority.

Important distinction:

```text
context/materialization lease expires
  -> descriptor/schema stops consuming model context

Effective Authority changes/revokes
  -> capability may no longer be legal or discoverable
```

Those events must not be conflated.

The exact eviction policy is research work. Candidate signals include:

- current Stage/flow phase;
- recent tool use;
- task-local relevance score;
- context pressure;
- explicit model release;
- controller compaction;
- authority/catalog revision.

Any delayed model response still resolves against the exact immutable invocation projection/binding snapshot defined by `authority.md`, not against a later refreshed view.

---

## 7. Unifying knowledge/resource JIT and tool JIT

Today these are often treated as separate problems:

```text
Knowledge JIT
query -> retrieve documents -> inject chunks

Tool JIT
search tools -> retrieve schema -> expose tool
```

The capability namespace suggests a common operation:

```text
navigate namespace
      ↓
inspect lightweight descriptor/reference
      ↓
materialize selected information into model context
```

Potential typed roots include:

```text
knowledge
resources
operations/tools
skills
services
agents/workflows
memory interfaces
interaction templates
```

This does **not** mean they become semantically identical. Their typed ownership, authority rules, execution behavior, and provenance remain distinct. The unification is only at the **discovery/navigation interface**.

This could give models one stable environmental mental model while the kernel keeps strong internal type distinctions.

---

## 8. Context Scouts: delegate context acquisition to a cheaper model

The primary model does not necessarily need to perform every discovery step itself.

A specialized child Execution can act as a **Context Scout**:

```text
Primary Agent (strong model)
        ↓ requests context acquisition
Context Scout (small/cheap model)
        ↓
navigate authorized namespace
search knowledge/resources
inspect candidate evidence
rank/filter results
        ↓
compact Context Package
        ↓
Primary Agent
```

The Scout's product is **context, not external actions**.

### 8.1 Authority attenuation

A default Scout should receive only the parent's delegable read/discovery authority needed for the task.

Conceptually:

```text
Scout Effective Authority
  = requested retrieval authority
    ∩ parent's delegable Effective Authority
    ∩ application/runtime policy
```

Example:

```text
Parent:
  github.read
  github.write
  slack.read
  slack.send
  filesystem.read
  filesystem.write

Scout:
  github.read
  slack.read
  filesystem.read
```

The Scout may recommend an operation/resource reference to the parent, but it cannot grant that capability or bypass the parent's own Active View/final authorization path.

### 8.2 Provenance-preserving output

A small model should not be trusted to freely rewrite all retrieved evidence into prose. Its result should preserve references and selected source material so that the stronger model can inspect the evidence directly.

A candidate shape:

```text
ContextPackage {
  query
  findings[] {
    source_ref
    descriptor_ref
    excerpt_or_fact
    relevance
  }
  candidate_resources[]
  candidate_capabilities[]
  unresolved_questions[]
  search_trace_summary?
}
```

For high-value evidence, prefer:

```text
source reference + bounded raw excerpt + Scout annotation
```

rather than:

```text
Scout-generated summary only
```

This reduces distortion and makes evidence auditable.

### 8.3 Tiered cognition

Context Scouts suggest a broader optimization hierarchy:

```text
strong model
  decision / synthesis / consequential planning
        ↑
medium model
  difficult search / decomposition / ambiguity resolution
        ↑
small model
  navigation / filtering / ranking / extraction
        ↑
deterministic runtime
  lexical search / embeddings / SQL / indexes / policy filtering
```

The runtime should attempt to solve context acquisition at the cheapest layer that can reliably do so.

Example:

```text
need architecture evidence about authority inheritance
        ↓
deterministic retrieval -> 120 candidates
        ↓
small Scout -> 8 candidates
        ↓
optional stronger Scout -> 3 evidence packets
        ↓
primary model reasons over 3 relevant passages
```

This is not necessarily a universal routing rule. It is a benchmarkable policy option.

---

## 9. External precedents and adjacent systems

The proposed direction is not isolated; several current systems are converging on progressive disclosure. The distinctive research question for ArrokothI is whether to make **one hierarchical authorized discovery namespace** span heterogeneous capability types under the existing authority model.

### 9.1 Anthropic: JIT context and filesystem navigation

Anthropic's context-engineering guidance describes "just in time" context as retaining lightweight identifiers such as file paths, stored queries, and links, then loading data dynamically during execution. It explicitly highlights progressive disclosure through filesystem-like exploration: naming conventions, file sizes, and timestamps can help an agent choose what to inspect next.

Anthropic has also described exposing MCP tools as code/files so models can read tool definitions on demand instead of placing every schema into context, or alternatively using a `search_tools` interface with multiple detail levels.

This is the closest conceptual precedent for treating a filesystem-like hierarchy as a context-efficiency mechanism.

### 9.2 Anthropic Agent Skills: metadata first, body later

Agent Skills use a directory plus `SKILL.md`. Name/description metadata is available first; detailed skill instructions are loaded later when relevant. Larger skills can further reference additional files.

This demonstrates a practical multi-level disclosure pattern:

```text
name + description
   ↓
full skill instructions
   ↓
additional referenced files
```

### 9.3 Hermes Agent: progressive tool disclosure

As of this research date, Hermes Agent contains explicit progressive tool disclosure. Deferrable MCP/plugin tools can hide behind bridge operations roughly corresponding to:

```text
tool_search
  -> tool_describe
  -> tool_call
```

Its implementation can degrade the catalog representation from grouped names/descriptions toward smaller listings as context pressure increases. Hermes also uses on-demand Skill loading.

This is very close to the ArrokothI direction, but the mechanisms remain separate surfaces rather than one authority-aware hierarchical namespace across tools, knowledge, resources, services, Skills, etc.

A useful warning also appears in current Hermes discussion: deferring recovery-critical tools can hurt cheap/fast models because they may fail to rediscover the needed tool. ArrokothI should therefore benchmark a small always-visible core/recovery surface rather than assuming that maximum deferral is always optimal.

### 9.4 OpenClaw: skill metadata on demand, tool list still explicit

OpenClaw documents a system prompt that includes its tool list and short descriptions while Skills are represented by metadata and their detailed instructions load on demand. This again shows progressive disclosure for one capability class, but not yet a universal directory-like discovery abstraction for all authorized capabilities.

### 9.5 Dify: converging on Agents + Skills + Files + Tools + CLI

Dify's August 2026 Agent redesign treats an Agent as a reusable unit with model, prompt, Skills, Files, and Tools, and also supports CLI tools in an isolated sandbox. This is directionally similar in that capabilities are becoming heterogeneous resources around an Agent rather than one flat function list.

The material reviewed for this note does not establish that Dify exposes those resources through one JIT hierarchical authorized namespace. Treat that comparison as adjacent product direction, not an implementation claim.

---

## 10. Security and semantic invariants

Any prototype should preserve at least these invariants.

### 10.1 Discovery never grants authority

```text
discovery result != permission
path/ref          != bearer credential
model-visible name != authorization
```

### 10.2 The namespace is authority-filtered

Prefer:

```text
Effective Authority
  -> authorized candidate universe
  -> hierarchy/ranking/search
```

not:

```text
global Catalog
  -> model search
  -> filter after disclosure
```

The latter can leak existence of unauthorized capabilities/resources.

### 10.3 Final Effects are re-authorized

A selected leaf descriptor still resolves to a typed Effect proposal and goes through current Harness authorization on the concrete request.

### 10.4 Stable refs remain separate from friendly paths

Paths/categories are retrieval UX. Internal identity should remain stable and typed so renaming/reorganization cannot silently change what an old model response means.

### 10.5 Invocation projection remains a binding snapshot

If the model saw `send_email -> op-42` in invocation N, its response must resolve against that exact invocation snapshot even if the namespace/Active View changes before the response is processed.

### 10.6 Do not expose secrets through the discovery tree

Descriptor metadata should reveal only what policy allows the Execution/model to know. Credentials and sensitive resource bindings remain outside prompt-visible descriptors unless explicitly intended and authorized.

### 10.7 A real filesystem is not required

A virtual namespace avoids accidental path traversal, host-file disclosure, and coupling authority semantics to OS permissions.

---

## 11. Design questions to benchmark rather than guess

### 11.1 Hierarchical browse vs semantic search

Compare:

```text
flat tool search
hierarchical navigation
embedding/hybrid search
hierarchy + search
runtime preselection + model navigation
```

Hierarchy may help small models through low branching factors, while semantic search may reach obscure leaves faster.

### 11.2 How should categories be created?

Candidates:

- authored catalog groups;
- provider/integration groups;
- descriptor tags;
- generated semantic clustering;
- task-specific virtual folders;
- hybrid deterministic hierarchy + dynamic ranking.

Generated hierarchy is flexible but can become unstable. Authored hierarchy is predictable but may require maintenance.

### 11.3 What should remain eagerly visible?

Potential always-visible items:

- discovery/navigation primitives;
- recovery/context restoration tools;
- a very small set of ubiquitous controller controls;
- task-critical operations explicitly authored for the current Stage.

Everything else can be deferred.

### 11.4 Does a small Scout actually outperform direct retrieval?

Measure:

- retrieval precision/recall;
- hallucinated/misattributed evidence;
- token cost by model tier;
- end-to-end latency;
- number of discovery turns;
- primary-model task success;
- provenance retention;
- small-model failure to discover obscure capabilities.

### 11.5 When should materialized descriptors be evicted?

Compare:

- invocation-only;
- phase/Stage scoped;
- inactivity-based;
- relevance-score based;
- context-pressure based;
- explicit release;
- hybrid.

### 11.6 Can the same namespace work across heterogeneous types?

The experiment should test whether one navigation mental model improves behavior without obscuring important semantic differences between:

```text
Operation
Resource
knowledge source
Skill
Agent/Workflow service
memory interface
```

The interface may be unified while underlying types remain strict.

---

## 12. Suggested prototype slices

A low-risk experimental sequence:

### P1 — virtual tool hierarchy only

Build an authority-filtered read-only index over Operations.

```text
list category
list leaves
view descriptor
materialize selected tool schema
```

Benchmark flat eager schemas vs flat search vs hierarchy.

### P2 — knowledge/resource roots

Add knowledge and Resource descriptors using the same navigation interface, while preserving distinct typed fetch/read behavior.

### P3 — materialization/eviction policy

Allow detailed descriptors to leave the Active View after phase change or context pressure while remaining rediscoverable if authority remains valid.

### P4 — Context Scout

Spawn a read-only child Execution using a small model. Give it a bounded retrieval task and require a provenance-preserving `ContextPackage`.

Compare:

```text
primary model searches directly
vs.
small Scout searches -> primary model reasons
```

### P5 — automatic tier routing

Try deterministic retrieval first, Scout second, stronger model only when ambiguity remains.

The runtime should log why escalation occurred and measure whether the architecture lowers total cost without reducing task success.

---

## 13. Working hypothesis

The strongest version of the hypothesis is:

> **Effective Authority should bound what an Execution may discover and use, while model context should contain only a small navigable projection plus the capabilities/evidence materialized for the current reasoning step.**

A hierarchical namespace can make discovery easier by turning one high-branching selection problem into several low-branching navigation decisions. Context Scouts can further move those navigation/retrieval tokens onto cheaper models while preserving the primary model's attention for synthesis and consequential decisions.

If this holds experimentally, ArrokothI gains a useful scaling property:

```text
large capability universe
      does not require
large model-visible capability surface

and

large information universe
      does not require
strongest model performs every retrieval step
```

That would make authority scale, catalog scale, and model-context scale substantially more independent.

---

## 14. Sources reviewed

Research sources checked on 2026-09-04:

1. Anthropic, **Effective context engineering for AI agents**  
   https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
2. Anthropic, **Code execution with MCP: building more efficient AI agents**  
   https://www.anthropic.com/engineering/code-execution-with-mcp
3. Anthropic, **Equipping agents for the real world with Agent Skills**  
   https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
4. Hermes Agent, **progressive tool disclosure / tool search implementation**  
   https://github.com/NousResearch/hermes-agent/blob/main/tools/tool_search.py
5. Hermes Agent repository / Skills documentation and examples  
   https://github.com/NousResearch/hermes-agent
6. OpenClaw, **Token use and costs**  
   https://github.com/openclaw/openclaw/blob/main/docs/reference/token-use.md
7. OpenClaw, **Skills**  
   https://github.com/openclaw/openclaw/blob/main/docs/tools/skills.md
8. Dify, **Introducing New Agent** (2026-08-27)  
   https://dify.ai/blog/introducing-new-dify-agent

External systems are used here as research analogues only. Their terminology does not define ArrokothI semantics.
