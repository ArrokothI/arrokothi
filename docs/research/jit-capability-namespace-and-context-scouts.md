# JIT Capability Namespace and Context Scouts

> **Status: focused non-canonical research note.**
>
> This document records a research direction for scaling knowledge/resource discovery and tool exposure without placing every authorized descriptor into every model context. It does **not** redefine current kernel semantics. Canonical authority/exposure ownership remains with [`../authority.md`](../authority.md); memory/context semantics remain with [`../memory.md`](../memory.md); child Execution composition and delegation remain with [`../composition.md`](../composition.md).
>
> Research date: **2026-09-04**. Scope clarification added **2026-09-06**: the virtual namespace is intended as a general Agent-environment abstraction, not only a coding-agent/filesystem technique. See [`arrokothi-machine-abi-and-program-model.md`](arrokothi-machine-abi-and-program-model.md).

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

The filesystem analogy is only an interaction grammar. The same namespace could describe a customer-support world, educational world, shopping application, enterprise system, or coding workspace without requiring a real OS filesystem.

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

A second extension is to delegate context acquisition to a constrained **Context Scout**: a cheaper/smaller child model whose job is to navigate authorized knowledge/resources, rank evidence, and return a compact provenance-preserving context package to the stronger primary model.

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

But authorization answers what the Execution may use, not what must be eagerly shown to the model.

Flat catalogs eventually reproduce the same token problem in a cheaper form. A hierarchy can reduce the branching factor at each decision.

This applies equally to non-coding applications. For example, a customer-service Agent might navigate:

```text
/customer
/orders
/policies
/capabilities/refunds
/capabilities/escalation
```

while an educational Agent might navigate:

```text
/student
/curriculum
/exercises
/capabilities/assessment
```

Neither layout implies real files. They are application-shaped logical views.

---

## 3. Candidate abstraction: a virtual authorized capability namespace

This note proposes a **virtual, read-only namespace**, not necessarily an OS filesystem.

Example:

```text
/capabilities
├── knowledge
├── tools
├── resources
├── skills
├── services
└── agents
```

The hierarchy itself acts as a low-cost semantic index. Directory/category names communicate intent before detailed descriptors are loaded.

A runtime could offer controller-facing primitives such as:

```text
capability_list(path)
capability_find(query, path?, limit?)
capability_view(ref, detail_level?)
```

while presenting them to a CLI-oriented model using filesystem-like affordances.

The same underlying operations could also be projected as structured functions or another ACI. The virtual hierarchy should therefore remain semantic/index data, not depend on shell implementation details.

---

## 4. Relationship to current Active View semantics

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

The namespace is a derived discovery structure over authorized possibilities. Model-visible discovery results still do not become authority.

Friendly paths should resolve to stable typed references. Renaming a path must not silently redefine what a delayed model response means.

---

## 5. `active` vs `available`

A useful UX distinction is between things likely relevant now and things still authorized to discover.

```text
/capabilities
├── active
└── available
```

`available` must never mean the global catalog. It is bounded by Effective Authority.

The exact representation remains TBD because current Active View is a semantic exposure layer whereas the namespace is primarily a discovery/index layer.

---

## 6. Progressive materialization and eviction

JIT disclosure solves little if every descriptor loaded during a long Execution remains in model context forever.

The runtime should investigate progressive materialization and later de-materialization while preserving immutable invocation snapshots for delayed responses.

Candidate signals include current phase, recent use, context pressure, explicit release, and authority/catalog revision.

---

## 7. Unifying discovery without unifying semantics

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

This does **not** mean these types become semantically identical. The unification is only at the discovery/navigation interface.

This becomes especially useful in the broader ArrokothI logical-machine research: one Agent-facing namespace can present heterogeneous application state and capabilities while the kernel retains strict typed ownership and authority semantics underneath.

---

## 8. Context Scouts

A specialized child Execution can act as a read-oriented Context Scout:

```text
Primary Agent
    ↓
Context Scout
    ↓
navigate authorized namespace
search resources
rank/filter evidence
    ↓
Context Package
    ↓
Primary Agent
```

The Scout's product is context, not external action. Its authority should be attenuated accordingly and its output should preserve provenance rather than returning unsupported prose summaries.

Tiered cognition remains a benchmarkable strategy:

```text
strong model
  decision / synthesis
        ↑
small model
  navigation / filtering
        ↑
deterministic runtime
  indexes / search / policy filtering
```

---

## 9. External precedents and adjacent systems

Several current systems converge on progressive disclosure through Skills, tool search, files, and code-oriented interfaces. These are useful precedents for Agent-computer interfaces, but the ArrokothI research target is broader than a coding shell.

The relevant question is whether one **authority-aware logical namespace** can work for customer, educational, workflow, website, research, and coding Agents alike.

Coding-agent systems are useful because modern models understand hierarchical navigation well; they do not define the intended deployment shape of ArrokothI.

---

## 10. Security and semantic invariants

Any prototype should preserve:

### 10.1 Discovery never grants authority

```text
discovery result != permission
path/ref != bearer credential
model-visible name != authorization
```

### 10.2 Namespace is authority-filtered

Prefer building the discoverable universe from Effective Authority rather than disclosing the global Catalog and filtering only after discovery.

### 10.3 Final Effects are re-authorized

A selected operation still resolves to a typed runtime request and current Harness authorization.

### 10.4 Stable refs remain separate from friendly paths

Paths/categories are retrieval UX.

### 10.5 Invocation projection remains a binding snapshot

Delayed output must resolve against the immutable projection/binding shown to that invocation.

### 10.6 Do not expose secrets through the discovery tree

Credentials and privileged bindings stay outside model-visible descriptors unless explicitly intended.

### 10.7 A real filesystem is not required

A virtual namespace avoids accidental path traversal, host-file disclosure, and coupling authority semantics to OS permissions.

More strongly: **a terminal-like or filesystem-like Agent experience must not imply a terminal security model.** A lightweight website/customer Agent can use the same namespace abstraction entirely in memory through typed application resources and capabilities.

Physical sandboxing becomes relevant when actual general executable code, host filesystem/process access, or ambient network powers are mounted into the machine—not merely because the model navigates logical paths.

See the machine capability / trust-containment matrix in [`arrokothi-machine-abi-and-program-model.md`](arrokothi-machine-abi-and-program-model.md).

---

## 11. Design questions to benchmark rather than guess

Compare hierarchical browse, semantic search, hybrid retrieval, runtime preselection, and direct structured tools.

Also test whether non-coding Agents benefit from the same environmental metaphor:

```text
customer support
education
shopping/website interaction
enterprise workflows
research orchestration
coding
```

Important metrics include task success, discovery turns, context tokens, recovery behavior, provenance, and failure to discover obscure operations.

---

## 12. Suggested prototype slices

### P1 — virtual operation hierarchy

Build an authority-filtered read-only index over Operations.

### P2 — application/resource roots

Add knowledge, Resources, and application-shaped views while preserving typed read behavior.

### P3 — materialization/eviction policy

Allow detailed descriptors to leave model context while remaining rediscoverable if authority remains valid.

### P4 — Context Scout

Spawn a read-only child Execution and require provenance-preserving context output.

### P5 — logical-machine integration

Expose the namespace as part of the broader ArrokothI machine prototype and test it in both lightweight non-coding applications and heavier coding/data applications.

The implementation should verify that the lighter cases do not inherit unnecessary filesystem/process/sandbox dependencies.

---

## 13. Working hypothesis

> **Effective Authority should bound what an Execution may discover and use, while model context should contain only a small navigable projection plus the capabilities/evidence materialized for the current reasoning step. The navigable projection is a logical application namespace, not necessarily a filesystem.**

If this holds experimentally, ArrokothI can make authority scale, catalog scale, model-context scale, and physical-compute requirements substantially more independent.

---

## 14. Sources reviewed

Research sources originally checked on 2026-09-04 include Anthropic context engineering and Agent Skills material, Hermes progressive disclosure, OpenClaw Skills/tooling, and Dify's Agent redesign. External systems are research analogues only; their terminology does not define ArrokothI semantics.
