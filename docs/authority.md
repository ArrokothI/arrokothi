# Authority Model

> **Status: canonical authority and exposure semantics for ArrokothI v0.4.**
>
> Read [`mental-model.md`](mental-model.md) first. This document owns the meanings of authority, delegation, policy inputs, exposure, Active View, model projection, authorization evidence, and confirmation. Runtime Effect handling is defined in [`execution-runtime.md`](execution-runtime.md); portable descriptor/protocol mappings are defined in [`interoperability.md`](interoperability.md).

## 1. Authority is the power an Execution may exercise

An Execution may request actions that affect resources, memory, child Executions, peers, users, or external systems. **Authority** is the bounded power under which those requests may be accepted.

```text
controller
   ↓ proposes Effect
Harness
   ↓ authorize under current effective authority + policy
accept / deny / require confirmation
```

A request does not prove permission:

```text
Effect proposal ≠ authority ≠ authorization result
```

The Harness is the decisive runtime enforcement point. Application/world/platform policy may decide what should be allowed; the Harness represents and enforces the resulting Arrokoth authority boundary.

---

## 2. Runtime identity is not application principal identity

`ExecutionId` identifies a runtime Execution. It is not automatically the user, tenant, Agent service, resource owner, or other application security principal.

A policy decision may receive authenticated application facts such as:

```text
Execution: exec-17
Agent/service principal: agent:research-assistant
acting on behalf of: user:rex
tenant/application/world: org:arrokoth
current task/session: task:paper-review
resource owner / relationship facts: ...
```

These facts are **policy context**, not aliases for the Execution identity.

> **Execution identity ≠ application security principal identity.**

The kernel does not need to understand what `user`, `tenant`, `organization`, or `world` mean. Applications define those domain relationships and authenticate their facts; the authority/policy boundary must be able to evaluate them.

Ownership is similarly distinct. Parent/child ownership is a runtime relation for delegation, supervision, budgets, and causation. It does not replace an application's user/resource/tenant relationship graph.

---

## 3. Authority and exposure are separate

Arrokoth distinguishes four layers:

```text
1. Catalog
   What exists?

2. Effective Authority
   What could this Execution legally use/access now?

3. Active/Exposed View
   Which authorized subset is currently useful/appropriate to expose?

4. Model Invocation Projection
   What exact names/schemas/bindings does this model call receive?
```

The subset relation is:

```text
Model Invocation Projection
        ⊆
Active/Exposed View
        ⊆
Effective Authority
        ⊆
Catalog universe
```

These layers answer different questions and must not collapse into one list.

### Catalog

A Catalog contains registered Operations, Resources, services, memory interfaces, Skills, peers, or other descriptors known to the application/runtime.

Catalog membership says only that something exists.

### Effective Authority

Effective Authority is the currently valid power available to one Execution after delegation, revocation, constraints, and application/runtime policy are applied.

It may be represented through grants, references, predicates, policy-backed queries, or a combination. It does not need to be a fully materialized list.

### Active/Exposed View

The Active View is a **deterministic narrowing of already-authorized possibilities** for the current task/progression.

Inputs may include:

```text
authored exposure declarations
effective authority
application/task scope
descriptor tags/groups
current Stage/Agent policy
bounded ranking/search results
```

The Active View may be small even when Effective Authority is large.

### Model Invocation Projection

A provider call receives a final provider-compatible projection of the Active View: model-facing names, descriptions, schemas, aliases, and binding identities.

This projection is invocation-specific and may be narrower than the Active View because of token budgets or provider schema constraints.

> **Visibility to a model never grants authority.**

---

## 4. Final authorization happens on the concrete Effect

Discovery and model projection are usability/scaling mechanisms, not authorization mechanisms.

```text
catalog descriptor
   ↓ authorized Active View
model sees operation
   ↓ model selects it
controller resolves exact invocation binding
   ↓
typed Effect proposal
   ↓
Harness re-authorizes concrete request
```

Therefore:

```text
discovery result       ≠ permission
Active View membership ≠ authorization
model tool schema      ≠ capability token
operation/resource id  ≠ bearer credential
```

The final typed request may include concrete arguments/resources that were not knowable at discovery time, so the Harness must authorize the actual action, not merely the descriptor.

---

## 5. Invocation projection is a binding snapshot

A model-returned operation name must resolve against the **exact projection/binding snapshot shown to that model invocation**, not against whichever Active View happens to be current when the response arrives.

```text
model call N
  projection snapshot P17
  name "search_docs" → stable operation ref op-42

catalog/view later refreshes
  "search_docs" may now mean something else

model response from call N
  resolves through P17, never through latest view
```

Snapshot IDs, binding IDs, operation refs, and correlation IDs protect integrity and causation. They are not credentials.

This rule becomes especially important with progressive discovery, dynamic aliases, delayed model responses, and concurrent Agent progressions.

---

## 6. Delegation is attenuation, not authority creation

When one Execution creates a child, the child may receive only authority that the creator/application is permitted to delegate.

Conceptually:

```text
child effective authority
  = requested child authority
    ∩ creator's delegable authority
    ∩ application/runtime policy
```

A child cannot mint authority merely because its Definition requests it.

Useful grant semantics may include some subset of:

```text
scope / resource / operation set
holder/subject
delegator / provenance
delegable?
constraints
valid-from / expiry
revocation state
```

The exact grant representation is not frozen by this document. A simple trusted-local deployment may use compact internal records; a distributed/federated deployment may eventually need stronger proof mechanisms.

Budgets are separate:

```text
authority
  may this action occur?

budget/runtime limit
  how much/how often/how long may work continue?
```

A call-count, token limit, or spawn credit should not automatically become an authority permission merely because a policy engine can express it.

---

## 7. Policy backends decide application relationships; they do not define Arrokoth authority

Arrokoth may use different policy implementations behind an application/runtime policy boundary.

A useful abstract capability is:

```text
check(request)
filterAllowed(candidates)       # optional optimization
enumerateAllowed(kind, scope)  # optional optimization
```

`check` is the fundamental ability. Bulk filtering/reverse enumeration matters when thousands of descriptors must be reduced into an Active View without thousands of expensive point checks.

A simple application can implement these operations directly. More complex deployments may use systems such as Cedar or OpenFGA.

```text
Arrokoth authority semantics
        ↓ policy port
application policy / Cedar / OpenFGA / other backend
```

No backend's entity model becomes the kernel's authority ontology.

---

## 8. Progressive discovery narrows exposure, never authority

Large authorized catalogs should not require every descriptor/schema to appear in every model context.

The general pattern is:

```text
Catalog
  ↓ authority filtering/enumeration
Authorized descriptor universe
  ↓ deterministic ranking/search
Active View
  ↓ provider projection
small model-visible surface
```

The searchable universe may contain heterogeneous typed summaries:

```text
Operation
Resource
Agent/Workflow service
memory interface
Skill
interaction template
```

A compact discovery index may use lexical, embedding, hybrid, or application-specific ranking. The selected item resolves back to its owning typed descriptor.

Authority should be filtered **before ranking where feasible**, and the final Effect is authorized again at execution time.

A future model-visible discovery operation may expand the Active View when the initial selection is insufficient, but it can search only the Execution's already-authorized universe.

> **Discovery can reveal authorized possibilities; it cannot create new ones.**

---

## 9. Requested requirements are not grants

Definitions, Skills, plugins, protocol descriptors, and model-facing interfaces may declare what they would like to use:

```text
requested operations
recommended tools/resources
required service scopes
preferred memory/resource bindings
```

Those declarations are inputs to application composition and policy.

```text
requested/recommended authority
        ↓
application + delegator decision
        ↓
effective authority
```

Never:

```text
manifest says "allowed"
        ↓
authority automatically granted
```

This applies to external formats such as Agent Skills `allowed-tools` as well as Arrokoth-native package metadata.

---

## 10. Authorization evidence and mechanical confirmation are different

Autonomous systems often need both **standing/semantic authorization evidence** and **exact action confirmation**.

A useful conceptual sequence is:

```text
standing constrained grant / user intent / application policy
        ↓
Agent proposes concrete Effect
        ↓
current authorization check
        ↓
optional exact-payload mechanical confirmation
        ↓
execute
        ↓
outcome / receipt / audit evidence
```

Semantic evidence may include trusted references such as:

```text
user Event
Structured Memory preference
application policy fact
delegated grant
previous authorization record
```

Whether such evidence is sufficient is a policy decision.

Mechanical confirmation is different: it binds approval to a concrete consequential action/payload as closely as practical.

```text
standing consent ≠ exact payload approval
user input        ≠ mechanical confirmation
authentication    ≠ authorization
```

Derived Semantic Memory is not authorization evidence by default; see [`memory.md`](memory.md).

---

## 11. Revocation and changing authority

Authority may change while an Execution remains alive.

Examples:

```text
user revokes access
resource sharing changes
task grant expires
application policy changes
child delegation is narrowed
credential/resource binding becomes unavailable
```

The runtime therefore must not assume that authority resolved at Execution creation is valid forever.

Active Views and model projections may be refreshed when authority/catalog state changes. Already-issued model projections remain immutable binding snapshots for interpreting their own responses, but final Effect authorization uses current authority/policy.

For already-dispatched consequential external work, revocation may prevent future actions without being able to undo an action that already occurred. Runtime cancellation/outcome semantics are defined in [`execution-runtime.md`](execution-runtime.md).

---

## 12. Authority over memory, messaging, resources, and control remains explicit

Different powers should not imply one another.

Examples:

```text
may message peer
  ≠ may read peer memory
  ≠ may cancel peer
  ≠ may impersonate peer

may read resource
  ≠ may write resource
  ≠ may obtain backing credential

owns child
  ≠ may bypass child's memory visibility

may discover operation
  ≠ may execute arbitrary arguments against it
```

Memory scope/view rules are defined in [`memory.md`](memory.md); composition and ownership are defined in [`composition.md`](composition.md); runtime cancellation is defined in [`execution-runtime.md`](execution-runtime.md).

---

## 13. External authentication and Arrokoth authority are separate

A remote service may require OAuth, API credentials, user sign-in, or other authentication before it can continue.

That external state is not itself an Arrokoth authority grant.

```text
remote auth required
  ≠ Harness authority denied

remote authentication succeeds
  ≠ Execution gains new Arrokoth authority automatically
```

An adapter may surface an external continuation requirement to the application/user, then continue the already-authorized operation once the external prerequisite is satisfied.

Similarly, control-plane authentication answers who may operate the Arrokoth service; Execution authority answers what the Execution itself may do. `ExecutionId`, session IDs, trace IDs, and routing handles are not bearer authorization unless an application deliberately designs them as protected capability tokens.

---

## 14. Authority invariants

Preserve these distinctions:

```text
Execution identity      ≠ application principal identity
runtime ownership       ≠ application relationship graph
authority               ≠ exposure
Catalog                 ≠ Effective Authority
Effective Authority     ≠ Active View
Active View             ≠ Model Invocation Projection
discovery               ≠ authority grant
projection binding id   ≠ credential
requested requirement   ≠ granted authority
authority               ≠ budget
semantic evidence       ≠ exact mechanical confirmation
authentication          ≠ authorization
Derived Semantic Memory ≠ authority evidence by default
```

And these positive rules summarize the model:

> **The Harness authorizes the concrete Effect under current effective authority and policy.**

> **Child delegation attenuates authority; it does not create new authority.**

> **Application principals/on-behalf-of facts are policy inputs separate from Execution identity.**

> **Exposure is a deterministic narrowing of authority for usability, not a permission mechanism.**

> **Model responses resolve against the exact projection snapshot they observed.**

> **Large catalogs may use authorized progressive discovery without putting the entire authorized universe into model context.**

> **Policy engines are replaceable mechanisms behind Arrokoth-owned authority semantics.**

This document owns these authority/exposure meanings. Other canonical documents should reference them rather than redefine them.