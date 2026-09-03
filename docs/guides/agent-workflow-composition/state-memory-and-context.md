# State, memory, and context

> **Application/developer guidance — not canonical architecture.**
> **Canonical owner:** [`../../memory.md`](../../memory.md) — memory forms, provenance, promotion,
> and context compilation. Operation exposure belongs to
> [`../../authority.md`](../../authority.md), and is deliberately a *separate* mechanism.
> Precedence and the end-to-end procedure are in [`README.md`](README.md).

This page covers builder steps 6 and 9: where each piece of information lives, and what reaches the
model. It is not a second `memory.md` — it classifies application information and records what the
current implementation can actually do with it.

Preserve these distinctions exactly:

```text
memory                    ≠ context
Structured Memory         ≠ Derived Semantic Memory
Working Notes             ≠ authority evidence
Derived Semantic Memory   ≠ asserted truth
memory form               ≠ memory scope
scope membership          ≠ permission
```

---

## 1. Classification tree

For each piece of information, ask in this order:

```text
1. Does anything later depend on it?
     no  → nowhere persistent. Let it live in the transcript / this model call and expire.

2. Does the application intend to ASSERT it as current state, with a known field meaning?
     yes → Structured Memory.
           Give it a field key + ValueSchema + description.
           Written through an authorized `WriteMemory` Effect; the runtime validates and commits.

3. Is it an inferred or retrieved CLAIM that may be wrong, stale, or contradicted?
     yes → Derived Semantic Memory.
           Keep provenance. Retrieval-oriented, not authoritative, never authority evidence.
           Promote it to Structured Memory only through an explicit decision (§4).

4. Is it scratch reasoning that helps the CURRENT Execution's own work?
     yes → Working Notes.
           Bounded, controller-owned, explicit visibility. Not durable application truth.

5. Is it a large durable work product or source document?
     yes → canonically the Artifact / File form, but there is NO executable Artifact/File API,
           store, or Effect in 0.8.x (§5). Today: application-owned durable storage reached
           through a capability you design, or a read-only materialized resource view exposed
           to Function Stage code.

6. Does it already live authoritatively in an external system of record?
     yes → leave it there. Reach it through a capability; do not shadow-copy it into memory
           unless the application genuinely needs its own assertion of it.
```

---

## 2. What each form is for, in application terms

**Structured Memory** — the application's own current facts. Customer details, qualification state,
selected options, computed and accepted results, preferences the application stands behind. Field
keys are stable, schemas are bounded, and a model-proposed write that violates the schema is
rejected rather than absorbed. Read it into model context only by naming the keys you need.
Remember that a schema establishes *shape*, not truth — see
[requirements and control](requirements-and-control.md).

**Derived Semantic Memory** — what the system *believes* from observations: extracted preferences,
prior-incident knowledge, background claims. Render it to a model as inferred and possibly wrong. Do
not let a confident claim decide a consequential action on its own.

**Working Notes** — the current Execution's plan, hypotheses, candidate evidence, and progress
scratch. Useful precisely because it is not durable truth. Do not use it as a side-channel for
information the next Stage or the parent needs — see
[composition](composition-children-and-concurrency.md).

**Transcript / context** — the conversation and recent observations. Bounded, selected, and
transient. Anything you would be upset to lose does not belong only here (§6, §7).

**Artifact / File** — canonical vocabulary for large durable work products, architecturally defined
and **not implemented** (§5). Not something you can build on today.

**External application state** — your database. The kernel does not want to own it, and today it is
where large durable work products and any cross-Execution shared state actually live.

### Storing memory is not the same as anyone being able to read it

Structured Memory has seven distinct steps between "the application has a fact" and "a model acts on
it", and each one fails closed:

```text
storage / binding      Harness.createExecution({ structuredMemory: { fields } })
request                AgentSpec.spec.structuredMemory.read.keys / .write.keys — declarations
view resolution        an application-supplied resolver, denied by default
grant                  request ∩ grant ∩ bound declarations
model exposure         the authorized snapshot, or the write callable, enters one invocation
write proposal         the model selects; the controller proposes WriteMemory
Effect authorization   the Harness authorizes the concrete proposal, freshly
commit                 schema and revision checks, then an atomic commit
```

The exact resolver names, defaults, and ordering are in
[current authoring surface §3](current-authoring-surface.md), which is where the operational wiring
lives. Two rules from that chain matter for classification here:

> **memory ≠ context.** A committed value exists whether or not any model call ever sees it.
> Reaching a model context requires the read chain, and a compiler still selects from the result.

> **exposure ≠ authority.** A write interface being visible to a model does not mean the resulting
> `WriteMemory` will be authorized. The Harness decides that again, on the concrete proposal.

### Who can read committed Structured Memory

Two programmatic readers exist, and they are different things:

```text
CAN read
  trusted host / application code
      Harness.structuredMemoryOf(executionId) → the full committed view, as cloned read-only
      data. General inspection: not an Effect, and not reachable from a controller or a model
      context.

  an AgentInformationCompiler
      AgentInformationInput.memory → the ALREADY-AUTHORIZED snapshot for one invocation,
      narrowed by the read chain before it arrives. A replaceable strategy selects what to
      render from it and cannot widen it.

  (and the model itself sees only what that compiler selected)

CANNOT read
  Function Stage code    — StageExecutionContext has no memory handle
  CapabilityExecutor     — given no store and no ExecutionContext, by design
  a generic controller   — ExecutionView carries no slot references
  a spawned/called child — it receives no Structured Memory view at all
```

The design consequence: **a deterministic gate over committed facts is host work**, or work done by
an `EffectAuthorizer` / `ConfirmationPolicy` the host wired — not a Function Stage. The information
compiler is a genuine programmatic reader, but its input is already narrowed and its job is context
selection, not application logic. Plan for this explicitly rather than discovering it when a Function
Stage has nothing to read.

---

## 3. Current implemented shape (do not design past it)

From [`../../development/002-implemented-kernel-baseline.md`](../../development/002-implemented-kernel-baseline.md):

- Structured Memory is an **Execution-local, schema-bound view**, configured when the Execution is
  created. Read authority, write *exposure*, and final write authorization are three independent
  decisions, each deny-by-default. Commits are atomic and carry revision, history, and provenance.
- Optimistic concurrency is **whole-view** `expectedRevision`, producing an explicit
  `memory.write_conflict`. There are no field-level versions, no multi-key transactions, and no
  reducers/CRDTs/locks.
- Autonomous children do **not** inherit the parent's Structured Memory view. There is no general
  cross-Execution memory scope ontology — "user-scoped" or "org-scoped" memory is application work
  today, not a kernel feature.
- Working Notes: an Agent-local bounded frame, a controller-local `working_notes_set` model control,
  and **explicit parent→child handoff at spawn/call**. There is deliberately **no automatic
  child→parent note return**, no sequential-Stage handoff policy, and no parallel-branch note
  semantics.
- Derived Semantic Memory: plain provenance-bearing claims, an explicit extraction seam, a
  deterministic reference extractor, deny-before-provider retrieval, and a bounded read view whose
  retrieval `query` is **authored, not model-generated**. For task-following lookup, use a
  model-selected retrieval capability instead — a different mechanism with different authority and
  determinism properties.

---

## 4. Correction, currentness, and supersession

Use the mechanism that matches the form; do not invent a new one.

**Structured Memory** represents *current* state, so correcting it means writing the new value. The
runtime retains history and provenance; the field itself holds the latest assertion. If concurrent
writers are possible, supply `expectedRevision` and handle the conflict observation deliberately —
re-read, merge, retry, or fail deliberately. Never ignore it.

**Derived Semantic Memory** claims are additive and provenance-bearing, and the current record has
**no supersession, validity-interval, currentness, or confidence field**. The accepted claim shape is
closed:

```text
DerivedSemanticClaim = { claimId, statement, provenance }
provenance           = { sourceRefs, derivedAt, derivation }
                       (an unknown property is rejected, not stored)
```

So the truthful current behaviour is:

```text
derived claims simply coexist
  — including newer ones, and including ones that contradict each other
  — and the reference provider implements no semantic supersession
```

Do not try to record a supersession relation in the claim; there is no field for it and the record
will be rejected. Where currentness matters, that policy lives outside the claim schema today:

- **application policy** — the application decides which claim it will act on, using `derivedAt` and
  `sourceRefs` it already has;
- **the provider / retrieval strategy** — a `DerivedSemanticMemoryProvider` is replaceable, and
  ranking or filtering by recency is a provider mechanism, not kernel semantics;
- **promotion into Structured Memory** — where a claim genuinely needs to become the current,
  relied-upon fact, promote it and let the Structured Memory field carry currentness.

**Working Notes** may be overwritten freely. That is what scratch state is for.

Promotion is always explicit. Use `promoteDerivedClaim(...)`, which builds an ordinary `WriteMemory`
proposal carrying `derivedClaimIds` and `sourceRefs` as provenance. There is no `PromoteMemory`
Effect and no automatic promotion. A trusted caller chooses the key and the value; the Harness still
authorizes, the schema still validates, and confirmation still applies.

> **Inference cannot create authority, and provenance is not permission.**

---

## 5. Artifact / File is canonical vocabulary, not a current mechanism

`Artifact / File` is a real memory form in [`../../memory.md`](../../memory.md), and it is the right
way to *think* about large durable work products. It is also, at this baseline, **entirely
unimplemented**:

```text
Artifact / File
  canonical architectural concept          yes — docs/memory.md owns it
  executable 0.8.x application mechanism   none
    no port, no store, no Effect, no API, no conformance coverage
```

Therefore, for anything you are building today:

- do **not** treat an Artifact as a child return path — it is not one
  ([composition](composition-children-and-concurrency.md));
- do **not** treat it as durable storage for long-running work — it is not one (§7);
- do **not** reference "the Artifact" in a design as if the runtime will hold it.

The truthful current alternative is **application-owned durable storage reached through a capability
you design**, with only a reference (an id, a path, a URL) travelling through Structured Memory, a
Stage result, or a terminal result. Where trusted Function Stage code needs to read
already-materialized content, a declared read-only `resourceViews` entry is the supported path.
Whether the SDK should eventually own an Artifact mechanism is an open question tracked in
[`../../future-plan.md`](../../future-plan.md) §14.4.

---

## 6. Context engineering

Context compilation and operation exposure are **separate mechanisms** and must stay separate in
your design:

```text
context compilation     chooses INFORMATION     never chooses callables
Active View/projection  chooses CALLABLES       never chooses memory snippets
```

The second belongs to [capabilities and authority](capabilities-effects-and-authority.md).

### 6.1 The objective

> The smallest high-signal working set that is sufficient for the *next* decision.

Not "everything relevant". Not "everything authorized". Irrelevant or stale material degrades
selection quality and costs tokens on every call.

### 6.2 Levers available today

Almost all of these are **Agent** levers. An LLM Stage's context is its `system` prompt plus a
`prompt` template into which the incoming Stage result is substituted — no transcript window, no
memory read, no notes, no retrieval of its own. Shaping an LLM Stage's context means shaping what
the preceding Stage hands it.

| Lever | What it does | Author it as |
|---|---|---|
| instructions | standing task framing | `AgentSpec.instructions` / LLM Stage `system` |
| transcript window | how much conversation the model sees | `AgentLimits.maxContextMessages` |
| Structured Memory selection | which asserted fields enter context | `spec.structuredMemory.read.keys` (intersected with read authority) |
| Working Notes | the Execution's own curated scratch | `spec.workingNotes.read` / `.write` (independent flags) |
| Derived Memory retrieval | bounded inferred claims with provenance | `spec.derivedMemory.read.query` + `maxClaims`, bounded by `maxDerivedMemoryClaims` / `maxDerivedMemoryBytes` |
| observation projection | how a settled action result is rendered to the model | replaceable `AgentObservationProjector` |
| deterministic pre-filtering | shrink a result before it is ever context | Function Stage or the capability implementation |
| information compiler | the whole selection strategy | replaceable `AgentInformationCompiler` |

Every one of these is **absent by default**. Omitting a memory or retrieval request means no
resolver call, no provider call, no context block, and no extra model call. Add a lever when you can
say what it buys.

### 6.3 Just-in-time retrieval and progressive disclosure

Prefer lightweight references (ids, keys, titles, paths, counts) in context, with a capability that
loads detail on demand — the pattern
[`../../agent-engineering/02-context-tools-and-skills.md`](../../agent-engineering/02-context-tools-and-skills.md)
calls just-in-time context. It works well for *information* today: a `search`/`list` operation
returning compact identifiers plus a `get`/`read` operation returning the full record.

**Be precise about what is implemented.** Progressive disclosure over *information* is ordinary
capability design and available now. Progressive disclosure over the *action surface* — heterogeneous
discovery across Operations, Resources, services and Skills, with lazy descriptor hydration over a
large authorized universe — is **roadmap tranche K**, not a current feature. What exists is the
narrowing chain in [capabilities and authority](capabilities-effects-and-authority.md): enough to
keep a model surface small over a known catalog, and not a discovery service.

### 6.4 Avoid repeated large static context

If something is large, stable, and only occasionally needed, do not put it in every model call.
Options, in preference order: put it behind a retrieval capability; put a compact summary in
instructions and the detail behind a lookup; keep it in application storage and reference it; or move
the work that needs it into a Function Stage where no model sees it at all.

### 6.5 When *not* to use retrieval

- The value is a small, known, asserted fact → Structured Memory read, not retrieval.
- The answer must be exact and computable → compute it.
- The corpus is small enough to be a bounded literal in instructions and never changes.
- You cannot state what a retrieval failure looks like. Add the observable first.

---

## 7. Long-horizon state and continuity

**Separate two questions.**

```text
semantic substrate for long-lived work        IMPLEMENTED
  logical Executions that outlive Activations; explicit waits; mailboxes and Event cursors;
  PendingOperations and ControllerResumptions; dependency-set waits; durable-shaped serializable
  controller progress; child/peer/user-input/confirmation links; Effect journal and idempotency
  keys; cancellation and lineage budgets

production crash durability                    NOT IMPLEMENTED (roadmap tranche M)
  a durable store/scheduler surviving a real process stop/restart, lease/requeue behaviour,
  recovery of in-flight uncertain outcomes, external idempotency guarantees
```

The reference runtime store is **in memory**. Reconstruction over the same in-memory store is not
crash durability, and this guide will not let you tell a stakeholder otherwise. If your application
must survive a process crash today, keep the authoritative long-horizon state in **your own** durable
store and treat ArrokothI Executions as recoverable-by-replay from it.

**Design for continuity anyway.** The engineering pattern holds regardless of which store you use:

```text
Activation / context A
        ↓ externalize what matters
durable state outside the active context
        ↓ reconstruct
Activation / context B
```

| Continuity need | Where it goes |
|---|---|
| the objective and its acceptance criteria | Structured Memory, or application storage referenced from it |
| what is done / what remains | Structured Memory fields, or a progress record in application storage |
| the current unit of work and its hypotheses | Working Notes (this Execution only) |
| large intermediate products | application-owned storage, reached through a capability (no Artifact mechanism — §5) |
| what actually happened | Effect journal, Events, lifecycle history (runtime truth; observability, not semantic state) |
| how to verify | tests, validators, deterministic graders — outside the Execution, see [evaluation](evaluation-and-diagnosis.md) |

Anything that must survive a context reset belongs in Structured Memory or application-owned durable
storage — never only in the transcript.
