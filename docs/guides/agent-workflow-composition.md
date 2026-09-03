# Agent and Workflow composition guide

> **Status:** application/developer guidance for building applications **on** ArrokothI 0.8.x.
> **Role:** a decision procedure. **Not canonical kernel architecture.**
>
> This guide does not own any ArrokothI concept. When it and a canonical document disagree, the
> canonical document wins, and this guide is the thing that is wrong. Resolve every semantic
> question through the ownership table in [`../README.md`](../README.md), and establish what the
> runtime actually implements from
> [`../development/002-implemented-kernel-baseline.md`](../development/002-implemented-kernel-baseline.md).
>
> External engineering guidance — framework-neutral, and deliberately not ArrokothI truth — is in
> [`../agent-engineering/`](../agent-engineering/README.md). This guide translates that guidance
> into ArrokothI composition choices; it does not import it as architecture.

---

## 0. What this guide is for

You have an application specification. You need an Agent/Workflow composition that satisfies it.
This guide is the bridge:

```text
application / product requirements
        ↓  §1  extract observable requirements
agent/workflow engineering reasoning
        ↓  §2–§3  control ownership and determinism
ArrokothI composition choices
        ↓  §4–§10  memory, context, capabilities, Effects, authority
implementation
        ↓  §11–§13  deterministic tests, then behavioural evaluation
evaluation
```

Three rules govern everything below.

> **Build the smallest composition that can satisfy the observable requirements, then let evidence
> justify each increment.**

> **Enforce a hard requirement in code, state, schema, or a gate. A prompt sentence is a
> preference, not an enforcement mechanism.**

> **Design against the surface you chose, not against the kernel's vocabulary.** The kernel
> understands more than any stock Agent or Stage can emit. **Read §2.4 before sketching a
> composition** — it is the table that decides whether a design is buildable at all.

### Reading order

```text
this guide §0–§3          decide the shape — §2.4 decides what is buildable
../mental-model.md        the invariants you must not route around
../composition.md         Stage / child / branch truth
../memory.md              memory-form truth
../authority.md           authority / exposure truth
../development/002-…      what is actually implemented today
examples/execution-kernel-minimal/   a runnable, offline assembly on the production surfaces
```

Read [`../agent-engineering/01-agent-vs-workflow.md`](../agent-engineering/01-agent-vs-workflow.md)
and [`02-context-tools-and-skills.md`](../agent-engineering/02-context-tools-and-skills.md) before
your first design; they carry the general engineering reasoning this guide assumes.

### Vocabulary this guide uses without redefining

`Execution`, `Definition`, `Harness`, `Activation`, `Event`, `Effect`, `Agent`, `Workflow`,
`Stage`, `Adapter`, `Structured Memory`, `Derived Semantic Memory`, `Working Notes`,
`Artifact/File`, `Catalog`, `Effective Authority`, `Active View`, `Model Invocation Projection`,
`PendingOperation`, `ControllerResumption`, `Skill`. Each has exactly one canonical owner. If you
need to know what one *means*, go to the owner, not to this file.

---

## 1. Turn the specification into observable requirements

Do this before naming a single ArrokothI abstraction. Most bad compositions are bad because the
requirement was never made observable, so nothing could enforce or evaluate it.

For each sentence of the specification, write one row:

```text
requirement            what must be true
observable?            what in the world proves it
who establishes it     code | schema | the runtime | a model | a human | an external system
failure visible?       how the system notices when it is false
```

If a requirement has no observable, you have a style preference or an unstated assumption. Either
give it an observable or record it as non-enforceable.

### 1.1 Classify every requirement

Sort each requirement into exactly one class. The class, not the wording, decides the mechanism.

| Class | Meaning | Mechanism (details in) |
|---|---|---|
| deterministic state | a fact the application asserts and later relies on | Structured Memory (§4) |
| deterministic calculation | an exact transform with one right answer | Function Stage / host code (§3) |
| fixed business progression | a knowable sequence, branch set, or gate | Workflow topology (§2) |
| open-ended reasoning | progression that cannot be enumerated in advance | Agent (§2) |
| grounded factual lookup | an answer that must come from a record, not the model | retrieval capability / Derived Memory (§5, §6) |
| external side effect | something that changes the world outside the Execution | Effect through the Harness (§7) |
| human interaction | input, choice, or approval from a person | `RequestUserInput` / mechanical confirmation (§7, §10) |
| style / response behaviour | tone, format, length, register | instructions + evaluation rubric (§3.4) |
| long-horizon retained state | must survive context resets and Activations | Structured Memory + application-owned storage (§9) |
| temporary working state | useful within one Execution's current work, then discardable | Working Notes (§4) |
| evaluation-only requirement | how you will know the application works | eval suite, not runtime (§11) |

### 1.2 The anti-pattern this step exists to prevent

```text
requirements document
        ↓  (wrong)
one very long system prompt
```

A giant instruction block is the default failure mode of specification-driven agent building. It
converts checkable requirements into probabilistic ones, makes every requirement compete for the
same attention budget, and leaves nothing to test. Before you put a requirement into instructions,
ask: *can a schema, a transition, a gate, a field, or a function establish this instead?* If yes,
that is where it belongs, and the instruction (if you keep one at all) is a restatement for the
model's benefit, not the enforcement.

Keep instructions for the requirements that genuinely need a model: interpretation, judgment,
composition, tone.

### 1.3 Identify the environment's sources of truth

List everything that can *report* reality rather than assert it: record stores, APIs, validators,
schema validation, committed Structured Memory values, capability outcomes, test suites, and the
Harness's own Event vocabulary. These are what your stopping conditions and your graders will read.

> A model saying it did something is not evidence that it happened. Prefer an observation the
> runtime or the environment established. See §7.5 and §11.

---

## 2. Workflow or Agent

### 2.1 The distinction

Canonical owner: [`../composition.md`](../composition.md), recapped from
[`../mental-model.md`](../mental-model.md).

```text
Workflow
= system-defined semantic topology
  the application declares the Stages and the allowed transitions

Agent
= primarily model-directed semantic progression
  the model owns an open-ended continuation space inside runtime bounds
```

Two facts that decide most arguments:

- **The number of LLM calls does not matter.** An LLM Stage may make several model calls and remain
  a Workflow. An Agent with one model call is still an Agent.
- **A model choosing among declared transition labels is still Workflow semantics.** Model-driven
  *data* is fine; model-driven *topology* is Agent semantics, and dynamic topology mutation is out
  of scope for 0.8.x.

### 2.2 Decision procedure

Run this per requirement cluster, not once per product.

1. **Can code alone satisfy it?** Then no model is involved. Function Stage or host logic. Stop.
2. **Can you write down the complete set of semantic steps and the conditions between them?**
   If yes → **Workflow**. The steps become Stages; the conditions become declared transitions.
3. **Is the uncertainty about *which declared branch*, or about *what to do at all*?**
   - which declared branch → **Workflow** with labelled transitions; a classifier is an LLM Stage.
   - what to do at all → **Agent**.
4. **Does progression depend on what earlier observations reveal, in a way you cannot enumerate?**
   → **Agent** for that part only.
5. **Is the open-ended part a bounded sub-problem inside a knowable process?**
   → **Workflow** whose one Stage is an **Agent Stage** (a child Agent call). This is the default
   hybrid and it is usually the right answer for a real product.
6. **Would you struggle to write the stopping condition?** That is a signal the boundary is wrong.
   A Workflow's stopping condition is its topology; an Agent needs an explicit one (§10.4, §2.8).

### 2.3 Choosing the body for a Workflow Stage

Four Stage kinds exist, and exactly four. `router`, `classifier`, `gate`, `guard`, `retriever`,
`evaluator`, and `aggregator` are compositions of these plus transitions — not new kinds.

| Use | Kind | When |
|---|---|---|
| exact computation, validation, ranking, merging, record filtering; requesting capability/memory Effects programmatically | **Function Stage** | the answer is computable, or the program (not the model) decides an action must occur |
| a bounded, program-defined language task | **LLM Stage** | interpretation/summarisation/classification/composition with a *predetermined* number of model phases (`maxModelPhases`, default 1) |
| a bounded sub-problem needing open-ended model progression | **Agent Stage** | you want the Agent's terminal result as this Stage's output; the parent graph must not show the Agent's internal cycles |
| a reusable sub-process with its own topology | **Workflow Stage** | recursive composition without flattening the child graph into the parent |

Notes that matter in practice:

- An LLM Stage's model-callable operations are **declared in the definition** as
  `{ name, description, input, capability, operation }`. The model-facing `name` is vocabulary; the
  definition owns the identity. A returned name the Stage never declared resolves to nothing.
- `maxModelPhases` is enforced structurally: callables are exposed only while phases remain, so the
  last phase cannot ask for more work. There is no phase count that turns an LLM Stage into an
  Agent — that is a different Execution kind.
- A Function Stage cannot call an executor. It *returns* `awaitEffects` requests; the controller
  proposes them and the Harness performs them. This is the same rule as everywhere else: propose,
  do not perform.
- Agent and Workflow Stages take a `ChildDefinitionRef` plus `requestedOperations`. Requested is
  not granted: the child's capability-operation authority is the request intersected with the
  parent's *current* effective operation authority. See §8.2 for exactly what that does and does
  not cover.

### 2.4 What each stock surface can actually emit today

**This is the most important table in the guide.** The kernel understands a five-Effect vocabulary.
That is *not* the same as what each stock authoring surface can emit. Designing against the kernel
vocabulary instead of against your chosen surface is the most expensive mistake available here,
because the design looks correct until `defineWorkflow` rejects it or the controller simply never
proposes the Effect.

```text
kernel semantic vocabulary
        ≠
stock application authoring surface
```

Verified against `packages/core/src/controllers/`, `workflow/spec.ts`, `ports/stage.ts`, and
`effects/types.ts` at the current baseline:

| Surface | UseCapability | WriteMemory | child call / spawn | SendMessage | RequestUserInput |
|---|---|---|---|---|---|
| generic `ExecutionController` port | yes | yes | yes | yes | yes |
| reference **Agent** controller | yes — model selects from the Active View | yes — model selects a declared write interface | **no** | **no** | **no** |
| **Function Stage** | yes — `StageCapabilityRequest` | yes — `StageMemoryWriteRequest` (optional `expectedRevision`) | **no** | **no** | **no** |
| **LLM Stage** | yes — only via declared `callables`, which resolve to a capability/operation | **no** | **no** | **no** | **no** |
| **Agent Stage** | no | no | **`call` only**, to a child Agent | **no** | **no** |
| **Workflow Stage** | no | no | **`call` only**, to a child Workflow | **no** | **no** |

Two further rows a builder needs just as much:

| Surface | What it adds |
|---|---|
| **host / application code** (trusted runtime entry points, not Effects) | `createExecution`, `deliverExternalInput`, `submitUserInput`, `resolveConfirmation`, `settleEffect`, `cancelExecution`, and — the one most often missed — `structuredMemoryOf(executionId)` to **read** committed Structured Memory |
| **application-supplied ports** | `EffectAuthorizer`, `ConfirmationPolicy`, `CapabilityExecutor`, `FunctionStageRegistry`, `LocalResourceEnvironment` — ordinary application code, and where most deterministic gating actually lives |

Consequences worth stating explicitly, because each one has bitten a design:

- **An LLM Stage cannot write Structured Memory.** Its `callables` are capability operations. If a
  model-interpreted value must be retained, the LLM Stage returns it as its `StageResult` text and a
  following **Function Stage** parses it and requests the write.
- **No controller-side code can read Structured Memory.** `StageExecutionContext` has no memory
  handle, and `CapabilityExecutor` is given no store or ExecutionContext. Committed values reach
  only (a) an Agent's *model* information context via `spec.structuredMemory.read.keys`, and
  (b) host code via `Harness.structuredMemoryOf`. Deterministic computation over committed state is
  therefore host work, or work over data reached through a resource view or capability.
- **A stock Workflow is not multi-turn.** It consumes `external.input` exactly once, before its
  first Activation, as the entry Stage's input; later application input is not consumed by the
  Workflow controller. A conversation across turns is **Agent** shape, or host orchestration that
  runs a fresh Workflow Execution per turn.
- **Neither Agent Stage nor Workflow Stage hands off Working Notes**, and neither passes a child
  deadline. The Workflow controller builds its child `call` from the Stage definition only (§8.3).
- **A `spawn`/`call` child receives no Structured Memory view.** Only `createExecution` binds one.

### 2.5 Reading the matrix when your requirement is not directly authorable

Work down this list. **Do not jump to a custom controller** — it is the last option, not the first.

1. **Directly authorable** on the chosen surface → use it.
2. **Another existing ArrokothI composition** expresses it → e.g. an Agent instead of a Workflow for
   multi-turn conversation; a Function Stage after an LLM Stage for a memory write; an Agent Stage
   for a bounded open-ended sub-problem.
3. **Host/application orchestration** → the host reads committed memory, applies an exact rule,
   creates or feeds an Execution, submits user input, or resolves a confirmation. This is a
   first-class and fully supported design, not a workaround.
4. **An application-supplied port** → put the rule in the `EffectAuthorizer`, `ConfirmationPolicy`,
   or the capability implementation, where it is deterministic and Harness-enforced.
5. **A custom controller** implementing `ExecutionController` → unlocks the full Effect vocabulary,
   and costs you every semantic guarantee the reference controllers give you for free. Reach for it
   only when 1–4 genuinely cannot express the requirement, and say so in your design notes.
6. **Not currently implemented** → record it and choose a different shape. Do not build it into the
   kernel (§16).

### 2.6 Hybrid shapes that work

```text
multi-turn conversation with exact gating
  Agent Execution (root, Structured Memory bound at creation)
  + read-only grounding capability
  + host code between turns reading structuredMemoryOf and applying the exact rule
  + EffectAuthorizer / ConfirmationPolicy gating the consequential capability

knowable process with one genuinely open sub-problem
  Workflow: Function Stage (prepare) → Agent Stage (investigate)
            → Function Stage (verify the child's terminal result) → complete

model interpretation that must become retained state
  Workflow: LLM Stage (interpret → text) → Function Stage (parse, validate, request WriteMemory)

open-ended work with reusable exact sub-processes
  Agent whose capabilities include a Workflow-backed operation implemented by the application
```

### 2.7 When to choose parallel Workflow branches

Only when the branches are genuinely independent and the latency is worth the coordination cost.
The current fork topology is deliberately narrow (see §8.4) — check it before designing around it.

### 2.8 When *not* to reach for an Agent

- The path is knowable and you are choosing an Agent for flexibility you cannot name.
- You cannot state a stopping condition or a budget.
- You cannot state what the environment will report to prove progress.
- The only thing you actually need is one bounded language task — that is an LLM Stage.

---

## 3. Deterministic logic versus LLM responsibility

This is the section that most changes application quality. The question is never "can the model do
this?" — it is "**is there a mechanism that establishes the exact truth, and am I using it?**"

### 3.1 Implement these deterministically. Never delegate them to prompt text.

| Requirement | Mechanism in ArrokothI |
|---|---|
| numeric calculation, totals, thresholds, unit conversion | Function Stage / host code |
| required-field *presence* | Structured Memory field schemas + an exact gate (host code reading `structuredMemoryOf`, a Function Stage over its own inputs, or the `EffectAuthorizer`) |
| known stage progression, ordering, prerequisites | Workflow topology and declared transitions |
| record filtering, sorting, pagination, budget/eligibility limits | Function Stage before the result enters model context, or inside the capability implementation |
| *structural* validity of any value that becomes state | Structured Memory schema-bound `WriteMemory`; the runtime validates the shape and rejects a malformed one (see §3.2 for what this does **not** establish) |
| authority checks | `EffectAuthorizer` at the Harness; deny-by-default |
| approval of a consequential payload | `ConfirmationPolicy` (exact-payload mechanical confirmation) |
| duplicate suppression of a capability call | `EffectIdempotencyScope` on a `UseCapability` request (§7.4 — not a universal Effect property, and not crash-safe) |
| concurrent-write correctness | `expectedRevision` on `WriteMemory`; a stale write conflicts, it never silently overwrites |
| terminal conditions and budgets | Workflow topology; `AgentLimits`; the `UseCapability` operation deadline; lineage structural spawn budget |
| "this must never happen" | absence of authority, plus absence of exposure — not an instruction |

Concretely: if the specification says *"never hand off without a phone number"*, the enforcement is
a `phone` field with a schema **plus an exact gate that reads the committed value**. Note where that
gate can live today: no controller-side code can read Structured Memory (§2.4), so the gate is host
code reading `Harness.structuredMemoryOf`, or an `EffectAuthorizer`/`ConfirmationPolicy` that
refuses the handoff Effect until the host's gate has passed. The instruction telling the model to
collect a phone number is a helpful restatement; it is not the requirement's implementation.

### 3.2 Schema validation is not factual acceptance

Structured Memory validates a written value against its `ValueSchema`. That establishes real,
useful things:

```text
shape          type          bounds          structural validity
```

It does **not** establish that the model interpreted the person correctly. A structurally valid
value can be semantically wrong:

```text
user says:        "about 40, maybe a few more"
model proposes:   affected_users = 40
numeric schema:   PASS  — 40 is an integer in range
factual truth:    unestablished
```

Keep four steps distinct, and decide per field how far you need to go:

```text
1. candidate extraction     a model proposes a value from language
2. schema validation        the runtime checks shape/type/bounds; a malformed value is rejected
3. factual acceptance       something establishes the value is actually right
4. authoritative state      the accepted value is committed and later relied upon
```

Step 2 is not step 3. When factual correctness matters, add an acceptance mechanism appropriate to
the field:

- **deterministic parsing** in host or Function Stage code, where the input has a parseable form;
- **source-of-record lookup** through a capability, where an external system already knows the
  answer (the retrieved value, not the model's reading of it, becomes the write);
- **explicit user confirmation** — `RequestUserInput` for a value, or `ConfirmationPolicy` when the
  consequential action itself is the thing to confirm;
- **trusted host/application policy** — the host reads the proposal, applies its own rule, and
  writes the accepted value itself;
- **cross-field or cross-source agreement** before the value is relied on.

This does **not** mean model-originating writes are invalid. Letting a model propose a schema-bound
write is a legitimate and supported design, and for many fields — a free-text summary, a
best-effort category, a preference — structural validation is exactly the right amount of rigour.
The narrow point is:

> **Structural validity is not factual truth.** Choose the acceptance step deliberately for the
> fields where being wrong is expensive.

### 3.3 Delegate these to a model

```text
natural-language interpretation of what a person meant
semantic summarisation and extraction
open-ended planning where the step set is not enumerable
ambiguous classification where no rule is available
response composition, explanation, tone
qualitative judgment against articulated criteria
```

### 3.4 Style and behaviour requirements

Style requirements are real requirements, but their mechanism is instructions *plus a grader*, not
instructions alone. Put the requirement in the Agent's `instructions` or the LLM Stage's `system`
prompt, and put the check in the eval rubric (§11). An unevaluated style instruction is unowned.

### 3.5 The division-of-labour pattern

The strongest shape for an exact requirement inside a conversation separates four jobs:

```text
LLM               interpret the person's input into CANDIDATE values
acceptance step   establish that a candidate is actually right (§3.2)
Structured Memory retain the accepted values
host code         compute the exact result from the committed values
LLM               explain the computed result it was given
```

Two implementation facts shape where each job can live today (§2.4):

- the computation reads committed Structured Memory, and **only host code can do that**
  (`Harness.structuredMemoryOf`) — neither a Function Stage nor a `CapabilityExecutor` is given a
  memory handle;
- the explaining model must be *given* the number, not asked to produce it.

The model never performs the arithmetic and never becomes the unchecked source of a retained fact
that matters. See the worked example in §14.3.

---

## 4. State and memory classification

Canonical owner: [`../memory.md`](../memory.md). Preserve these distinctions exactly:

```text
memory                    ≠ context
Structured Memory         ≠ Derived Semantic Memory
Working Notes             ≠ authority evidence
Derived Semantic Memory   ≠ asserted truth
memory form               ≠ memory scope
scope membership          ≠ permission
```

### 4.1 Decision tree

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
           Keep provenance. It is retrieval-oriented, not authoritative, and never authority
           evidence. Promote it to Structured Memory only through an explicit decision (§4.4).

4. Is it scratch reasoning that helps the CURRENT Execution's own work?
     yes → Working Notes.
           Bounded, controller-owned, explicit visibility. Not durable application truth.

5. Is it a large durable work product or source document?
     yes → canonically this is the Artifact / File form, but there is NO executable
           Artifact/File API, store, or Effect in 0.8.x (§4.5). Today: keep it in
           application-owned durable storage and reach it through a capability you design,
           or expose a read-only materialized resource view to Function Stage code.

6. Does it already live authoritatively in an external system of record?
     yes → leave it there. Reach it through a capability; do not shadow-copy it into memory
           unless the application genuinely needs its own assertion of it.
```

### 4.2 What each form is for, in application terms

**Structured Memory** — the application's own current facts. Customer details, qualification state,
selected options, computed and accepted results, preferences the application stands behind. Field
keys are stable, schemas are bounded, and a model-proposed write that violates the schema is
rejected rather than absorbed. Read it into model context only by naming the keys you need.

**Derived Semantic Memory** — what the system *believes* from observations: extracted preferences,
prior-incident knowledge, background claims. Render it to a model as inferred and possibly wrong.
Do not let a confident claim decide a consequential action on its own.

**Working Notes** — the current Execution's plan, hypotheses, candidate evidence, and progress
scratch. Useful precisely because it is not durable truth. Do not use it as a side-channel for
information the next Stage or the parent needs (§8.5).

**Transcript / context** — the conversation and recent observations. Bounded, selected, and
transient. Anything you would be upset to lose does not belong only here (§5, §9).

**Artifact / File** — canonical vocabulary for large durable work products. See §4.5: the concept is
architecturally defined and **not implemented**, so it is not something you can build on today.

**External application state** — your database. The kernel does not want to own it, and today it is
where large durable work products and any cross-Execution shared state actually live.

Two reachability facts that decide more designs than the classification itself (§2.4):

```text
who can READ committed Structured Memory?
  the model, via an Agent's spec.structuredMemory.read.keys      → into model context only
  host code, via Harness.structuredMemoryOf(executionId)         → the only programmatic read

who CANNOT?
  Function Stage code   — StageExecutionContext has no memory handle
  CapabilityExecutor    — given no store and no ExecutionContext, by design
  a spawned/called child — it receives no Structured Memory view at all
```

So "the program checks the committed facts" is host work today. Plan for it explicitly rather than
discovering it when a Function Stage has nothing to read.

### 4.3 Current implemented shape (do not design past it)

From [`../development/002-implemented-kernel-baseline.md`](../development/002-implemented-kernel-baseline.md):

- Structured Memory is an **Execution-local, schema-bound view**, configured when the Execution is
  created. Read authority, write *exposure*, and final write authorization are three independent
  decisions, each deny-by-default. Commits are atomic and carry revision, history, and provenance.
- Optimistic concurrency is **whole-view** `expectedRevision`, producing an explicit
  `memory.write_conflict`. There are no field-level versions, no multi-key transactions, and no
  reducers/CRDTs/locks.
- Autonomous children do **not** inherit the parent's Structured Memory view. There is no general
  cross-Execution memory scope ontology yet — "user-scoped" or "org-scoped" memory is application
  work today, not a kernel feature.
- Working Notes: an Agent-local bounded frame, a controller-local `working_notes_set` model control,
  and **explicit parent→child handoff at spawn/call**. There is deliberately **no automatic
  child→parent note return**, no sequential-Stage handoff policy, and no parallel-branch note
  semantics.
- Derived Semantic Memory: plain provenance-bearing claims, an explicit extraction seam, a
  deterministic reference extractor, deny-before-provider retrieval, and a bounded read view whose
  retrieval `query` is **authored, not model-generated**. The current claim record is exactly
  `{ claimId, statement, provenance }` with `provenance = { sourceRefs, derivedAt, derivation }`,
  and unknown properties are rejected (§4.4).

### 4.4 Correction, currentness, and supersession

Use the mechanism that matches the form; do not invent a new one.

**Structured Memory** represents *current* state, so correcting it means writing the new value. The
runtime retains history and provenance; the field itself holds the latest assertion. If concurrent
writers are possible, supply `expectedRevision` and handle the conflict observation deliberately —
re-read, merge, retry, or fail deliberately. Never ignore it.

**Derived Semantic Memory** claims are additive and provenance-bearing, and the current record has
**no supersession, validity-interval, currentness, or confidence field**. The accepted claim shape
is closed:

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

- **application policy** — the application decides which claim it will act on, using `derivedAt`
  and `sourceRefs` it already has;
- **the provider / retrieval strategy** — a `DerivedSemanticMemoryProvider` is replaceable, and
  ranking or filtering by recency is a provider mechanism, not kernel semantics;
- **promotion into Structured Memory** — where a claim genuinely needs to become the current,
  relied-upon fact, promote it and let the Structured Memory field carry currentness.

**Working Notes** may be overwritten freely. That is what scratch state is for.

Promotion is always explicit. Use `promoteDerivedClaim(...)`, which builds an ordinary
`WriteMemory` proposal carrying `derivedClaimIds` and `sourceRefs` as provenance. There is no
`PromoteMemory` Effect and no automatic promotion. A trusted caller chooses the key and the value;
the Harness still authorizes, the schema still validates, and confirmation still applies.

> **Inference cannot create authority, and provenance is not permission.**

### 4.5 Artifact / File is canonical vocabulary, not a current mechanism

`Artifact / File` is a real memory form in [`../memory.md`](../memory.md), and it is the right way
to *think* about large durable work products. It is also, at this baseline, **entirely
unimplemented**:

```text
Artifact / File
  canonical architectural concept          yes — docs/memory.md owns it
  executable 0.8.x application mechanism   none
    no port, no store, no Effect, no API, no conformance coverage
```

Therefore, for anything you are building today:

- do **not** treat an Artifact as a child return path (§8.3) — it is not one;
- do **not** treat it as durable storage for long-running work (§9.2) — it is not one;
- do **not** reference "the Artifact" in a design as if the runtime will hold it.

The truthful current alternative is **application-owned durable storage reached through a
capability you design**, with only a reference (an id, a path, a URL) travelling through Structured
Memory, a Stage result, or a terminal result. Where trusted Function Stage code needs to read
already-materialized content, a declared read-only `resourceViews` entry is the supported path.

---

## 5. Context engineering

Canonical owners: [`../memory.md`](../memory.md) §13 (context compilation) and
[`../authority.md`](../authority.md) §3 (operation exposure). They are **separate mechanisms** and
must stay separate in your design:

```text
context compilation   chooses INFORMATION      never chooses callables
Active View/projection chooses CALLABLES        never chooses memory snippets
```

### 5.1 The objective

> The smallest high-signal working set that is sufficient for the *next* decision.

Not "everything relevant". Not "everything authorized". Irrelevant or stale material degrades
selection quality and costs tokens on every call.

### 5.2 Levers available today

Almost all of these are **Agent** levers. An LLM Stage's context is its `system` prompt plus a
`prompt` template into which the incoming Stage result is substituted — it has no transcript window,
no memory read, no notes, and no retrieval of its own. Shaping an LLM Stage's context therefore
means shaping what the preceding Stage hands it.

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
resolver call, no provider call, no context block, and no extra model call. Add a lever when you
can say what it buys.

### 5.3 Just-in-time retrieval and progressive disclosure

Prefer lightweight references (ids, keys, titles, paths, counts) in context, with a capability that
loads detail on demand. This is the pattern
[`../agent-engineering/02-context-tools-and-skills.md`](../agent-engineering/02-context-tools-and-skills.md)
calls just-in-time context, and it works well for *information* today: expose a `search`/`list`
operation returning compact identifiers plus a `get`/`read` operation returning the full record.

**Be precise about what is implemented.** Progressive disclosure over *information* is ordinary
capability design and available now. Progressive disclosure over the *action surface* —
heterogeneous discovery across Operations, Resources, Agent/Workflow services and Skills, with lazy
descriptor/schema hydration over a large authorized universe — is **roadmap tranche K**, not a
current feature. What exists today is:

```text
CapabilityCatalog (descriptive truth)
        ↓ intersect with runtime-owned Effective Authority
        ↓ deterministic exposure request: refs | groups | maxOperations
Active View
        ↓ immutable Model Invocation Projection (persisted; responses resolve against it)
the model call
```

That chain is enough to keep a model surface small over a known catalog. It is not a discovery
service, and you should not design an application that assumes one.

### 5.4 Avoid repeated large static context

If something is large, stable, and only occasionally needed, do not put it in every model call.
Options, in preference order: put it behind a retrieval capability; put a compact summary in
instructions and the detail behind a lookup; keep it in application storage and reference it; or move the
work that needs it into a Function Stage where no model sees it at all.

### 5.5 When *not* to use retrieval

- The value is a small, known, asserted fact → Structured Memory read, not retrieval.
- The answer must be exact and computable → compute it.
- The corpus is small enough to be a bounded literal in instructions and never changes.
- You cannot state what a retrieval failure looks like. Add the observable first.

### 5.6 Context resets are a design input, not an accident

Anything that must survive a reset belongs in Structured Memory or application-owned durable
storage — never only in the transcript. See §9.

---

## 6. Designing capabilities the model can use

Canonical owners: [`../authority.md`](../authority.md) (exposure and projection) and
[`../interoperability.md`](../interoperability.md) (portable Operations and protocol bindings).

Preserve:

```text
exposure          ≠ authority
model selection   ≠ authorization
description       ≠ permission
```

Declaring an operation in a definition neither grants it nor makes it appear. The Harness authorizes
the concrete Effect, with its actual arguments, every time.

### 6.1 Design for the model, not for your API

A capability operation is part of the model's action vocabulary. Wrapping every endpoint one-to-one
is the standard mistake: it produces overlapping operations, ambiguous choices, and results that
flood context.

Ask instead:

- What task boundary is natural for the model here?
- Can the *implementation* filter, join, rank, or aggregate before returning?
- Does this operation reduce or increase what has to be in context?
- Is its purpose distinct from every neighbouring operation?

### 6.2 Concrete checklist

**Distinct purposes.** `search_listings` / `read_listing` / `update_listing` partitions the action
space cleanly. Several near-identical wrappers do not.

**Names and namespacing.** Names are behavioural interface design. Namespace by domain when several
sources are exposed (`docs_search`, `crm_read_contact`). Evaluate naming rather than assuming it.

**Descriptions are prompts.** Write the `description` and per-field descriptions as if onboarding a
capable colleague who lacks your domain knowledge: intended use, explicit non-use, parameter
meaning, resource relationships, expected output. In ArrokothI these come from the
`CapabilityOperationDescriptor` (`title`, `description`, `input`), which is descriptive truth and
carries no permission.

**Bounded input schemas.** Use `ObjectSchema` with real constraints. A bounded schema is both better
model guidance and the thing that makes a malformed call a deterministic rejection.

**High-signal outputs.** Return meaningful labels over opaque ids, concise summaries, relevant
excerpts, and explicit pagination. Filter deterministically *before* the result becomes context
whenever the program can decide relevance.

**Actionable errors.** An error should tell the model what was invalid, what the valid shape is, and
whether to narrow, paginate, retry, or choose something else.

**Grounding versus action.** Keep read-only grounding operations separate from consequential ones.
Do not build an operation that quietly does both.

**Consequentiality is declared, not guessed.** Classify each operation in the `CapabilityCatalog`.
An operation the catalog does not classify is treated as **consequential** — the conservative
default. Do not rely on the gap; declare it.

### 6.3 Exposure and the authority chain

Author exposure as the *narrowest* useful request: `refs` for a known small set, `groups` for
label-based selection over a larger catalog, and `maxOperations` as a hard ceiling. Then remember
where the real decisions live:

```text
what exists            CapabilityCatalog
what may be used       Effective Authority (runtime-owned; deny-by-default)
what is shown now      Active View (deterministic narrowing; never widening)
what this call sees    immutable projection snapshot
what actually happens  Harness authorization of the concrete Effect
```

### 6.4 Controller-local model controls are a different category

`working_notes_set` mutates only the Agent's own scratch frame and crosses no Execution or runtime
boundary. It is therefore **not** an exercise of Execution authority and is not a member of an
Active View or Effective Authority. Enable it with `spec.workingNotes.write`. Do not model it as a
capability, and do not treat its enablement as permission for anything else.

### 6.5 External sources

Imported MCP Tools become ordinary capability operations and travel the ordinary authority path;
MCP metadata grants nothing. The current adapter covers **synchronous Tools only** (import: list and
call; export: explicit allowlist). Resources, Prompts, Tasks/handles, elicitation, and notifications
are roadmap tranches I/J. Design against what exists.

---

## 7. Effects and consequential actions

Canonical owners: [`../execution-runtime.md`](../execution-runtime.md) (Effect mechanics) and
[`../authority.md`](../authority.md) (authorization and confirmation).

### 7.1 What must cross the Harness as an Effect

Anything that reaches outside the Execution's own computation. The 0.8.x vocabulary is closed:

```text
UseCapability      an external or application capability operation
WriteMemory        a schema-bound Structured Memory assertion
SpawnExecution     create a child Execution (spawn) or create-and-await it (call)
SendMessage        peer communication (send / ask / reply)
RequestUserInput   ask a person for a value
```

Local computation — parsing, arithmetic, ranking, validation, prompt assembly — is not an Effect and
should not be dressed as one.

**A deterministic decision still produces an Effect.** A Function Stage that computes "an email must
be sent now" does not send it; it returns the request, and the Harness authorizes and dispatches it.
The semantic decision and the runtime action are different things.

### 7.2 The lifecycle you are designing against

```text
controller proposes (typed proposal, exact arguments)
        ↓
Harness authorizes            deny → effect.denied observation
        ↓ allow
ConfirmationPolicy            required → persist exact payload + digest, wait
        ↓ approved / not required     declined → declined observation, nothing dispatched
Harness dispatches
        ↓
executor / environment establishes reality
        ↓
result Event                  completed | failed | unknown
```

Two defaults you must configure deliberately:

- **No authorizer means every Effect is denied.** That is correct behaviour, not a stub: "nobody
  configured policy" and "policy allowed it" must never look the same.
- **No confirmation policy means nothing requires confirmation.** Confirmation is an optional extra
  gate that runs strictly after an `allow`. A policy that throws fails *conservative* — treated as
  requiring confirmation.

### 7.3 Handle every outcome, not just success

The settled-outcome vocabulary is deliberately wide, and collapsing any two of these makes your
application confidently wrong:

```text
completed   it happened
failed      it definitely did not happen
unknown     it may have happened; the answer was lost
denied      policy refused
rejected    the request was never answerable
declined    a human declined this exact payload; nothing dispatched, policy did not deny
conflicted  a versioned memory write was stale; nothing was written
```

For each consequential action in your specification, write down what the application does for each
outcome. In particular: **never round `unknown` up to success, and never round it down to a clean
failure.**

### 7.4 Deadlines, duplicate suppression, and cancellation are narrower than they look

These three controls are commonly assumed to be uniform kernel-wide properties. They are not, and
designing as if they were produces a liveness or double-execution bug that testing rarely catches.

**Operation deadlines are a `UseCapability` property.** `deadlineMs` exists on the `UseCapability`
proposal only, and the Harness's `defaultEffectDeadlineMs` is applied only on that path. Everything
else waits with **no configured deadline**, deliberately and with the reasoning recorded in source:

```text
UseCapability            deadlineMs, defaulted and cappable by policy (maxDeadlineMs)
child call result        deadline: null — a parent may legitimately wait for a child indefinitely,
                                    and no child-result deadline policy is implemented
ask / peer reply         deadline: null — a peer may take arbitrarily long
RequestUserInput         deadline: null — a person may never answer
pending confirmation     deadline: null — a person may never decide
```

If your application needs a bound on any of the last four, that bound is **yours to implement** in
host orchestration — for example by timing the wait yourself and calling `cancelExecution`.

**Cancellation is explicit and does not cascade.** `Harness.cancelExecution` is a trusted runtime
entry point, not an Effect and not a model action. A `call` parent's PendingOperation settles as
`cancelled` with one correlated `child.cancelled` Event, and that is all:

```text
cancelling one Execution does NOT cancel its parent,
                             does NOT cancel its siblings,
                             does NOT cancel its descendants
```

Cancelling a subtree is application work: walk it and cancel each Execution yourself.

**Distinguish three different things that all get called "idempotency".**

```text
1. runtime duplicate recognition        IMPLEMENTED, narrow
     EffectIdempotencyScope ("none" | "per_input") on a UseCapability request, plus an exact
     comparison of capability/operation/input/resources against the Effect journal. It suppresses a
     duplicate dispatch within this runtime's own journal.

2. external system idempotency          YOURS TO DESIGN
     The remote system must be able to recognise a repeated request — an idempotency key you send,
     a natural unique key, or a conditional write. The Harness cannot give you this.

3. durable crash/restart deduplication  NOT IMPLEMENTED (roadmap tranche M)
     The reference runtime store is in memory. A process restart does not carry the journal, so
     runtime duplicate recognition provides no crash-safety guarantee whatsoever.
```

For a consequential external operation where a duplicate is genuinely harmful, use (1) *and*
implement (2). Do not rely on (1) for a guarantee only (3) could give, and do not assume the
Harness provides (3).

### 7.5 Why a model's claim is not evidence

The model is a participant, not an authority. It can propose; it cannot establish. The Harness
records what was authorized and dispatched, and the executor/environment reports what happened. Your
stopping conditions, your terminal results, and your graders should read those, not the model's
prose. This is the same rule the guide applies to evaluation (§11.3) and to safety (§10).

### 7.6 A prompt is never the authority boundary

Untrusted content — retrieved documents, tool results, peer messages, model output, third-party
descriptors — may influence what gets *requested*. It must never widen what is *permitted*. If your
design's answer to "what stops this from happening?" is a sentence in a prompt, the design has no
boundary there. Remove the authority, or add a gate.

---

## 8. Composition

Canonical owner: [`../composition.md`](../composition.md).

### 8.1 Not everything needs another Execution

```text
same-Execution composition   Stages, functions, LLM calls, Effects, Adapters
child Execution              spawn / call — independent identity, lifecycle, mailbox,
                             authority, memory views, budgets
peer interaction             send / ask / reply to an already-existing Execution
```

The test is not complexity. A 500-line function stays local. Introduce a child Execution when the
work needs **independent runtime identity**: its own authority envelope, its own lifecycle, its own
mailbox, separate cancellation, a separate context/memory view, or separate addressability.

> **Delegation does not require another Execution. Independent runtime identity does.**

### 8.2 Parent/child boundaries

Use `call` (`callExecution`) when the current semantic boundary depends on the child's terminal
result — which is the normal form for an Agent Stage or Workflow Stage. Use `spawn`
(`spawnExecution`) only for work whose completion the current boundary genuinely does not require;
detached semantics remain conservative in 0.8.x, so prefer `call` unless you can say what happens if
the child never finishes.

What the boundary actually gives you:

- **Capability-operation attenuation.** `child capability-operation authority = requestedOperations
  ∩ the parent's current effective operation authority ∩ policy`. A child cannot mint authority.
  Be precise about the scope of this one: an absent `requestedOperations` means **the child receives
  no capability-operation authority through this attenuation path** — it does not mean the child is
  inert. The child still has its own lifecycle, its own controller and local computation, its own
  mailbox, and whatever its Definition's spec asks its controller to do. Other powers — spawning,
  messaging, memory writes, user input — are governed by the `EffectAuthorizer` for that child's
  Effects, which is a separate contract. `requestedOperations` is one narrowing lever, not the whole
  child security envelope.
- **Context isolation.** The child gets its own views. It **receives no Structured Memory view at
  all** — only `Harness.createExecution` binds one, and the spawn path does not — and it sees no
  parent Working Notes by ancestry.
- **Structural budget.** Autonomous spawning spends a lineage-scoped credit. `structuralSpawnBudget`
  omitted at root creation means the lineage can spawn nothing — "nobody granted spawn capacity" is
  not "unlimited". A descendant cannot enlarge it. Recursive definitions are legal; the budget, not
  acyclicity, is what bounds expansion.
- **Terminal-dependency abandonment**, and a `call` parent's PendingOperation settling as
  `cancelled` if the child is cancelled. Note what this is *not*: cancellation does not cascade, and
  no child-result deadline is configured (§7.4).

### 8.3 Working Notes handoff and the child return path

Distinguish the generic mechanism from what the stock Stage definitions actually expose.

**Generic kernel/controller capability.** A controller may build a `spawn`/`call` proposal carrying
`workingNotes`, normally selected with `selectWorkingNotesHandoff(frame, { keys })`. The Harness
envelope-checks the snapshot, policy may deny the concrete transfer, and the child receives an
immutable inherited snapshot plus its own independent writable frame.

**What Agent Stage and Workflow Stage expose.** Neither. An `AgentStageDefinition` /
`WorkflowStageDefinition` carries a `ChildDefinitionRef` and `requestedOperations`, and the Workflow
controller builds its child `call` from that alone — **no `workingNotes`, no child input beyond the
adapted Stage result, no deadline**. Handing off notes to a child today therefore requires a
controller that builds the proposal itself, which the stock Agent and Workflow controllers do not.

**The child return path, exactly as implemented.** For a stock Agent Stage or Workflow Stage the
**terminal result is the only built-in return route.** There is deliberately no automatic
child→parent Working Notes return, the child has no Structured Memory view to write into, and there
is no Artifact mechanism (§4.5). Anything else the parent needs must come back either in that
terminal result or through an **application-defined external mechanism** — your own store, written
by a capability the child is authorized to use and read by the parent through a capability or by the
host. Design that path explicitly; it will not appear on its own.

### 8.4 Parallel Workflow branches — current limits

Implemented today: system-defined fork topology with **two or more branches**; each branch body is
**exactly one adapter-free Stage** of any of the four kinds; a branch Stage is reachable only through
its fork and transitions only to its own fork's join; and the join has **exactly one downstream
Function Stage**, which may not itself be a branch Stage. The Function-Stage requirement is not
incidental — the join snapshot is delivered to Function Stage code (`StageExecutionContext.join`),
so a non-Function join successor could not consume it and validation rejects it. Branch Effects,
branch child calls, and branch model resumptions work, with branch-qualified correlation. The join
delivers each branch's final `text | none` result in **authored branch order**.

Explicitly **not** implemented — validation rejects these rather than half-supporting them:
multi-Stage branch subgraphs, nested or concurrent forks, branch loops, branch Adapters, branch
emissions, join reducers or automatic merge/retry, failure-driven sibling cancellation, and
branch-level Working Notes semantics.

Shared state across branches: a concurrent branch `WriteMemory` **must** carry `expectedRevision`
(an unversioned branch write fails before it reaches the Harness), and a stale one settles as
`conflicted` — an observation for that branch to handle, not an automatic retry or merge. Prefer
branch-local results merged deterministically by the downstream Stage after the join.

Parallelise when the branches are independent and the latency matters. Otherwise a sequence is
easier to reason about, cheaper, and easier to evaluate.

### 8.5 Cross-Stage data flow

**A Stage result and a transition label are two different things.** Keep them separate; encoding
control into the data string is a bug waiting to happen.

```text
StageResult = string | null
  the DATA one Stage hands to the next. `null` means none — not "", not "unknown".

transition label
  a separate CONTROL selection. A Stage returns a label; the definition declares where each
  label goes. A label the Stage never declared is rejected, not routed.
```

A Function Stage returns both independently (`{ status: "completed", result, transition }`), and an
`always` Stage returns no label at all. Do not pack a routing decision into the result text and
re-parse it downstream — that turns a declared graph edge into a string convention, and the
Workflow stops describing its own control flow.

The result contract is intentionally the smallest useful edge value in the kernel, so structural
information travels elsewhere:

```text
Stage result           one small text handoff (or none)
transition label       one declared control choice
Structured Memory      asserted facts — writable from a Function Stage, but NOT readable by
                       Stage code (§4.2); host code reads it
resource views         explicitly exposed read-only local materialisations, declared per Stage
application storage    large or structured work products, reached through a capability
                       (there is no Artifact mechanism — §4.5)
```

Do not use Working Notes as a second data-flow system between Stages; there is no sequential-Stage
handoff policy today, and building one out of scratch state hides your Workflow's real dataflow.

### 8.6 Multi-Execution designs earn their cost or they do not exist

A child Execution buys context isolation, independent authority, parallelism, and separate budgets.
It costs tokens, coordination, harder debugging, and more evaluation surface. Add one when you can
name which of those benefits you are buying. Then make the delegation explicit — objective, scope,
expected output shape, available operations, budget, and what not to duplicate — exactly as
[`../agent-engineering/03-long-running-and-multi-agent.md`](../agent-engineering/03-long-running-and-multi-agent.md)
describes.

---

## 9. Long-running work

Canonical owner for runtime facts: [`../execution-runtime.md`](../execution-runtime.md).

### 9.1 Separate the two questions

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
needs to survive a process crash today, keep the authoritative long-horizon state in **your own**
durable store and treat ArrokothI Executions as recoverable-by-replay from it.

### 9.2 Design for continuity anyway

The engineering pattern holds regardless of which store you use:

```text
Activation / context A
        ↓ externalize what matters
durable state outside the active context
        ↓ reconstruct
Activation / context B
```

Practical artifacts, mapped to ArrokothI:

| Continuity need | Where it goes |
|---|---|
| the objective and its acceptance criteria | Structured Memory, or application storage referenced from it |
| what is done / what remains | Structured Memory fields, or a progress record in application storage |
| the current unit of work and its hypotheses | Working Notes (this Execution only) |
| large intermediate products | application-owned storage, reached through a capability (no Artifact mechanism — §4.5) |
| what actually happened | Effect journal, Events, lifecycle history (runtime truth; observability, not semantic state) |
| how to verify | tests, validators, deterministic graders — outside the Execution |

### 9.3 Make progress increments bounded and verified

```text
reconstruct state → choose ONE bounded objective → do it
    → verify against an environmental observation → record progress → next
```

"Done" is a verified requirement, not a model's impression. Use validators, schema validation,
committed memory values, capability outcomes, and tests as backpressure — an agent generates work
faster than it can reliably judge it.

### 9.4 Response is not completion

An Agent's default `completion` mode is `respond_and_wait`: a response is communication and the
Execution stays alive. `complete_on_response` makes a response the terminal answer — a deliberate
contract, appropriate for a one-shot Agent Stage child, wrong for a long-lived conversational
Execution. Choose it explicitly; do not let the default decide by accident.

---

## 10. Safety and authority for application builders

Canonical owners: [`../authority.md`](../authority.md) and
[`../security-guarantees.md`](../security-guarantees.md).

### 10.1 The four questions, in order

For every action your application can take:

```text
1. May it be exposed?        Is a model allowed to SEE that this action exists?
2. May it be authorized?     Would the Harness allow this concrete request, with these arguments,
                             under this Execution's current authority?
3. Does it require confirmation?
                             Must a human approve THIS exact payload before dispatch?
4. Should it be deterministic instead?
                             Is a model involved in this decision at all, and why?
```

Then a fifth: **what belongs entirely outside model control?** Credential handling, policy
decisions, irreversible destruction, anything where "the model was persuaded" is an unacceptable
failure. Those actions are not exposed and not authorized for the Execution — absence is the
strongest boundary available.

### 10.2 Mapping the answers onto mechanisms

```text
exposure          author the narrowest exposure request; keep the Active View small
authority         configure the EffectAuthorizer; deny-by-default is the baseline, keep it
confirmation      configure ConfirmationPolicy for consequential payloads
determinism       move the decision into a Function Stage / schema / transition
outside control   do not grant it; do not expose it; do not build the capability
```

Attenuate for children: pass the smallest `requestedOperations` the child needs, and remember it is
intersected with the parent's *current* authority.

### 10.3 Truthful current guarantees

- **Semantic enforcement is real** for everything mediated by the Harness: Effect authorization,
  child attenuation, memory visibility, messaging boundaries, exact-payload confirmation,
  correlation/settlement, lifecycle and cancellation.
- **Physical containment is not provided by the trusted-local profile.** ArrokothI does not contain
  the owner of the host process from touching files, sockets, databases, subprocesses, or
  credentials directly. Hosted-declarative and hostile-code-isolated profiles are **roadmap tranche
  L**; there is no sandbox to claim today.
- **Information-flow control is not guaranteed.** An Execution legitimately allowed to read a secret
  and legitimately allowed to produce output may combine the two.

State the active profile in your own documentation. Do not let an application inherit a containment
claim the runtime does not make.

### 10.4 Budgets are not permissions

`AgentLimits` (model calls, per-step call fan-out, context messages, notes and derived budgets), the
`UseCapability` operation deadline, and the lineage structural spawn budget constrain *how much*
autonomous work may occur. They say nothing about whether an action is allowed. Set both: a
composition with authority but no budget can burn cost; one with budget but no authority does
nothing. Exhausting a budget should be a **reported failure**, not a silent loop.

Be precise about coverage (§7.4): a configured deadline bounds a `UseCapability` operation. Waiting
for a child result, a peer reply, user input, or a confirmation has **no configured deadline**, so
any bound on those is yours to enforce in host orchestration.

### 10.5 Approval fatigue

Confirmation is for meaningful escalation. If everything requires approval, approval stops meaning
anything. Draw the line at real boundary crossings — irreversibility, external visibility, spend,
third-party contact — and let deterministic authority handle the routine cases automatically.

---

## 11. Evaluation-driven application development

```text
kernel conformance        does the RUNTIME preserve its semantic contract?     npm test
application effectiveness did THIS composition accomplish the task?            npm run test:evals
```

These answer different questions and must stay separate. A green conformance suite says nothing
about whether your Agent is useful; a passing eval says nothing about whether the kernel is correct.
See [`../development/003-agent-effectiveness-guidance.md`](../development/003-agent-effectiveness-guidance.md).

### 11.1 Define success before tuning anything

Before the first prompt edit, write down for each requirement: what success is, what failure is, and
**how the environment can tell them apart**. If you cannot answer the third, you do not yet have a
requirement you can build against (§1).

### 11.2 Build deterministic tests first

Most requirements from §3.1 are testable without a model at all: schema rejection, transition
correctness, exact calculations, gate behaviour, authority denial, confirmation decline, conflict
handling, idempotency, budget exhaustion. Cover these with ordinary tests over your Function Stages,
schemas, policies, and topology. They are cheap, fast, and they are what actually enforces the
specification.

### 11.3 Then evaluate behaviour, grading the world

Model the eval on the existing behavioural baseline (`tests/evals/agent/`): each case owns a small
deterministic world, and grading reads the world.

Record at least:

```text
task success                 did the required outcome occur?
hard requirement failures    which §3.1 requirements were violated?
grounding failures           claims not supported by a record or observation
state correctness            are the committed Structured Memory values right?
tool/effect correctness      right operation, right arguments, right outcome handling?
model calls                  count
tool/action calls            count
turns                        count
context/token use            where the provider reports it
latency / cost               where available
```

Report quality and cost together. A strategy that improves success through unbounded context, extra
model turns, or full-catalog exposure has a real price.

Grade the outcome, not the transcript. An Agent that says it sent the message and sent nothing has
failed, whatever the prose looked like. An Agent that left the world correct but explained it badly
has passed the outcome check and failed the quality check — two separate measurements.

Include unhappy paths deliberately: capability failure, policy denial, confirmation decline, unknown
outcome, memory conflict, budget exhaustion, adversarial retrieved content, ambiguous user input.
A happy-path-only suite hides the failures that dominate production.

Keep held-out cases. Once prompts, descriptions, or exposure are tuned against a suite, that suite
has stopped measuring generalisation.

### 11.4 Classify every failure before changing anything

This is the most important discipline in the guide. Assign one class, then fix at that layer:

| Class | Symptom | Fix |
|---|---|---|
| application composition | wrong Workflow/Agent boundary, missing Stage, missing gate, requirement left to a prompt | change the composition (§2, §3) |
| prompt / context | the model lacked, or was swamped by, information | change instructions or the context strategy (§5) |
| tool / interface | wrong operation chosen, ambiguous names, unusable results, unhelpful errors | redesign the capability surface (§6) |
| model limitation | the task is beyond this model or this budget | change model, or decompose, or add determinism |
| framework ergonomics | correct design was hard to express or easy to misuse | record it (§12) — do not bend the design around it silently |
| genuine missing kernel contract | the semantics you need do not exist | write it up as a candidate architecture issue; **do not implement it here** |
| evaluation / grader | the rubric was wrong, brittle, or measured the transcript | fix the grader |

> **A failing benchmark or eval never by itself justifies changing kernel semantics.** Exhaust the
> first five classes, then escalate through
> [`../development/001-current-status-and-roadmap.md`](../development/001-current-status-and-roadmap.md)
> and the owning canonical document.

---

## 12. Requirements → ArrokothI mapping

A compact reference. Every row is grounded in a current contract; follow the section for the
conditions. **Check §2.4 before committing to a row** — the surface you pick decides whether the
mechanism named here is authorable from it.

| Requirement shape | ArrokothI choice | § |
|---|---|---|
| Known semantic progression | **Workflow** definition (`defineWorkflow`) with declared Stages and transitions | §2 |
| Unpredictable semantic progression | **Agent** definition (`defineAgent`) with explicit `limits` | §2 |
| Exact deterministic transform | **Function Stage** (`implementationRef` → application code), or host logic | §2.3, §3 |
| Known language task in a fixed topology | **LLM Stage** with `maxModelPhases` and declared `callables` | §2.3 |
| Choice among known outcomes | LLM or Function Stage + **labelled transitions** | §2.2 |
| Specialized, independently progressing autonomous sub-task | **Agent Stage** → child Agent `call` | §2.3, §8.2 |
| Reusable sub-process with its own topology | **Workflow Stage** → child Workflow `call` | §2.3, §8.2 |
| Independent concurrent work inside one Workflow | **system-defined fork/join**: ≥2 single-Stage adapter-free branches, join successor is **exactly one Function Stage** | §8.4 |
| Explicit authoritative application fact | **Structured Memory** field (schema-bound; written via `WriteMemory` from an Agent or a Function Stage — never an LLM Stage) | §2.4, §4 |
| Temporary controller/model scratch | **Working Notes** (`spec.workingNotes`, `working_notes_set`) | §4 |
| Inferred or retrieved semantic claim | **Derived Semantic Memory** claim with provenance | §4 |
| Accepting an inferred claim as fact | explicit **promotion** (`promoteDerivedClaim` → `WriteMemory` with provenance) | §4.4 |
| Grounded record lookup | read-only **capability operation** (`UseCapability`), filtered deterministically | §6 |
| Large optional context universe | bounded retrieval + reference-then-detail operations; small Active View | §5.3 |
| Consequential external action | **Effect** through the Harness + authorization + declared consequentiality | §7 |
| Approval of one exact payload | **`ConfirmationPolicy`** (mechanical confirmation) | §7.2, §10 |
| A value only a person can supply | **`RequestUserInput`** (schema-validated) — not emittable by a stock Agent or Stage; see §2.4 | §2.4, §7.1 |
| Talking to an existing Execution | **`SendMessage`** — `send` / `ask` / `reply`; not emittable by a stock Agent or Stage (§2.4) | §2.4, §8.1 |
| Large durable work product | **application-owned storage** reached through a capability; only a reference travels through the kernel. `Artifact/File` is canonical vocabulary with **no** 0.8.x mechanism | §4.5 |
| Must survive context resets | Structured Memory / application-owned durable store — never only the transcript | §9 |
| "This must never happen" | withhold authority **and** exposure; add a gate. Not an instruction | §10 |
| Bounding autonomous work | `AgentLimits`, the `UseCapability` operation deadline, lineage `structuralSpawnBudget`. Child/peer/user-input waits have **no** configured deadline | §7.4, §10.4 |
| Safe retry of a consequential external action | `EffectIdempotencyScope` on `UseCapability` **plus** external idempotency you design; honest `unknown` handling | §7.3, §7.4 |
| Concurrent writers to one memory view | `expectedRevision` + explicit conflict handling | §4.4, §8.4 |
| Style / tone / format | instructions **plus** an eval rubric | §3.4, §11 |
| A model-interpreted value that must be factually right | an explicit acceptance step — deterministic parsing, source-of-record lookup, user confirmation, or host policy. Schema validation alone checks shape only | §3.2 |
| Multi-turn conversation | **Agent** Execution. A stock Workflow consumes `external.input` only once, before its first Activation | §2.4 |
| Reading committed facts in code | **host code** via `Harness.structuredMemoryOf`. Neither Stage code nor a `CapabilityExecutor` can read memory | §2.4, §4.2 |
| Getting work back from a child | the child's **terminal result**, or an application-defined external mechanism. No note return, no shared memory view, no Artifact | §8.3 |
| "How do we know it works?" | eval case grading the world, not the transcript | §11 |

---

## 13. End-to-end builder procedure

Follow these in order. Do not skip ahead to implementation; steps 1–4 are where composition quality
is actually decided.

### 1. Extract observable requirements

Read the specification and produce the §1 table: requirement, observable, who establishes it, how
failure becomes visible. Name every requirement with no observable.

### 2. Separate hard/deterministic requirements from qualitative ones

Classify with §1.1 and §3. For each hard requirement, write the exact mechanism —
field + schema, transition, gate, authorizer rule, confirmation rule, idempotency scope, budget.
Anything left in prose is now a known, deliberate risk, not an oversight.

### 3. Identify environmental sources of truth

List what can report reality: record stores, APIs, validators, committed memory values, capability
outcomes, tests. These become your stopping conditions and your graders. If a requirement has no
source of truth, either build one or accept that it can only be graded subjectively.

### 4. Decide Workflow vs Agent boundaries

Run §2.2 per requirement cluster. Produce a topology sketch naming, for each node, its Stage kind or
its Execution kind. Default to the smallest shape: one Workflow, or one Agent, or one Workflow with
one Agent Stage. Justify every additional Execution against §8.6, and every fork against §8.4.

### 5. Define application state and memory ownership

Run the §4.1 decision tree over every piece of information. Produce:

```text
Structured Memory      field key → ValueSchema → description → who writes it → who reads it
Derived Semantic       what is extracted, from what material, with what provenance
Working Notes          which Execution, and what the notes are for
application storage    what, where it lives, and how it is referenced from the kernel
external state         what stays in your own store
nothing persistent     what is allowed to expire
```

Decide the handoff paths explicitly: parent→child Working Notes selection, and how a child's result
gets back. For a stock Agent/Workflow Stage child that is the terminal result, or an
application-defined external mechanism — never an implicit note return, and never an Artifact (§8.3).

### 6. Design capabilities and Effects

For each external interaction: name, description, bounded input schema, output shape, error text,
consequentiality classification, and — for `UseCapability` — idempotency scope and deadline (§7.4).
Apply §6.2. Separate grounding from action. Decide, per operation, whether a model selects it or the program does — the same
implementation used in both places is a different semantic design.

### 7. Define authority, exposure, and confirmation

Answer §10.1 for every action. Then write down:

```text
Effective Authority     the operation grant this Execution receives
exposure request        refs | groups | maxOperations — the narrowest useful set
confirmation policy     which concrete payloads need a human decision
child attenuation       requestedOperations per child, and why each is needed
structural budget       the lineage spawn budget (omit = cannot spawn)
what is absent          actions deliberately never granted or exposed
```

### 8. Design context and retrieval

Choose from §5.2 the smallest set of levers. State, per lever, what it buys. Prefer
reference-then-detail over bulk loading. Confirm you are not depending on progressive action
discovery (roadmap K) or on any other unimplemented mechanism.

### 9. Define budgets and stopping rules

For every Agent: `maxModelCalls`, per-step call fan-out, context/notes/derived budgets, completion
mode, and what "done" reads from the environment. For every Workflow: which transitions reach
`complete`, and what happens on adapter rejection (`onAdapterReject`; absent means the Workflow
fails — the deterministic default). For every `UseCapability`: deadline and idempotency scope, plus
external idempotency where a duplicate would be harmful. For every wait with **no** configured
deadline — child result, peer reply, user input, confirmation — decide whether the host must impose
one. For every lineage: spawn budget. Make exhaustion a reported failure.

### 10. Implement the smallest working composition

Author the definitions (`defineAgent` / `defineWorkflow`) — portable data only, no provider ids, no
clients, no keys. Wire the application side: Function Stage registry, Adapter registry, capability
catalog and executor, authorizer, confirmation policy, model resolution, stores, scheduler. Get one
end-to-end path working with a deterministic scripted provider before adding a second requirement.

**Import from `@arrokothi/core/execution`, `@arrokothi/core/ports`, and `@arrokothi/core/reference`.**
The package root `@arrokothi/core` still carries the legacy Session/Flow/`AgentRuntime` API and
exports a *different* `defineAgent` and `AgentDefinition`; `examples/minimal-agent/`,
`examples/estate-like/`, and both `examples/benchmark/` subjects target that legacy surface, so do
not use them as models for Execution-kernel code.

Be honest with yourself about the level you are working at: these exports are the current *explicit*
kernel surface, not a polished application-composition API. Assembling a Harness means naming a
definition store, runtime store, scheduler, controller registry, clock, id generator, authorizer,
capability catalog, capability executor, and — depending on the composition — model resolution, an
Agent executor, or the Function Stage and Adapter registries. That is expected, and every one of
those is a real seam rather than ceremony.

**A runnable minimal reference:**
[`../../examples/execution-kernel-minimal/`](../../examples/execution-kernel-minimal/README.md) is a
deterministic, offline, key-free application that assembles exactly this from the production-facing
surfaces — including one authorized path and one deny-by-default path. Run it with
`npm run example:execution-kernel` and its tests with `npm run test:example:execution-kernel`.
`scripts/workflow-scenario-canary.ts` shows the same assembly for a Workflow, against a live model.

**Where `@arrokothi/core/testing` belongs.** It is not forbidden — it is scoped:

```text
production / runtime application code
  → @arrokothi/core/execution, /ports, /reference only.
    createAgentTestHarness and friends assemble collaborators with test-shaped defaults;
    shipping them means your application's wiring is invisible and not yours to configure.

tests, deterministic prototypes, benchmark subjects, eval harnesses
  → @arrokothi/core/testing is appropriate and intended.
    ScriptedModelProvider, scripted capability executors, the harness builders, and the
    contract suites exist precisely so a deterministic offline subject is cheap to write.
```

A benchmark subject or eval harness built on `/testing` is using it correctly; that choice says
nothing about how the corresponding production application should be assembled.

### 11. Build deterministic tests

Cover §11.2: schema rejection, transitions, gates, exact calculations, denial, decline, conflict,
unknown-outcome handling, idempotency, budget exhaustion. These run offline and are your real
specification enforcement.

### 12. Run behavioural evaluation

Build eval cases per §11.3 over a small deterministic world, graded on the world. Record quality and
cost together. Include the unhappy paths. Keep held-out cases.

### 13. Diagnose failures before increasing complexity

Classify each failure with §11.4 and fix at that layer. Resist the two standard reflexes: adding an
Agent where a Stage would do, and adding instructions where a gate would do. Escalate a suspected
missing kernel contract as a documented candidate issue — never as a silent local change.

---

## 14. Worked examples

Illustrative, and deliberately generic. They demonstrate architectural choice, not domain answers.

### 14.1 A qualification funnel with a conversational surface

*Requirement shape:* collect a fixed set of facts through conversation, qualify against exact rules,
show only real records, hand off to a human team when qualified.

**The ideal semantic decomposition.** This part is sound and is what you should reason with:

```text
known business progression       →  system-defined topology
open-ended conversation          →  model responsibility
exact completeness / eligibility →  deterministic code over accepted facts
record lookup                    →  grounded read-only capability
consequential handoff            →  Harness-authorized Effect, confirmed
```

**What the current stock surfaces can compose directly.** The whole thing is *not* one stock
Workflow, and it is worth being exact about why (§2.4):

```text
a stock Workflow consumes external.input ONCE, before its first Activation
  → it cannot host a multi-turn conversation loop

an LLM Stage has callables that resolve to capability operations
  → it cannot write Structured Memory

no Stage or capability executor is given a memory handle
  → the "read committed memory and decide" gate cannot live in a Function Stage
```

So the viable current shape puts the conversation in an **Agent** and the exact gate in the **host**:

```text
host creates a root AGENT Execution
  Harness.createExecution({ definition, structuredMemory: { fields: [...] },
                            operationAuthority: { ... } })

Agent spec
  instructions: tone, one question at a time, never assert an unlisted record
  operations:   record_search        read-only grounding
                handoff_to_team      consequential; declared consequential in the catalog
  structuredMemory.read.keys   the fields the model should see
  structuredMemory.write.keys  the fields the model may propose
  completion: respond_and_wait       a response is communication, not termination

per turn (host loop)
  harness.deliverExternalInput({ destination, label: "user", payload: text })
  harness.runUntilIdle() / drainResumptions()
  read the reply from harness.emissionsOf(...)

between turns (host code — the deterministic gate)
  const view = await harness.structuredMemoryOf(executionId)
  completeness + eligibility computed in ordinary code over view.values
  the host owns a gate flag derived from that computation

the consequential handoff
  EffectAuthorizer wraps createAllowListAuthorizer and DENIES handoff_to_team
    while the host's gate flag is false  → the Agent observes effect.denied and must react
  ConfirmationPolicy requires approval of the exact payload
  UseCapability carries an idempotency scope, and the executor implements external
    idempotency too (§7.4)
```

Why this shape: the progression *is* knowable, but the part that is knowable is the **gate**, not
the conversation, and the gate is the part that must be deterministic. Putting it in host code and
in the `EffectAuthorizer` makes it exact and Harness-enforced — strictly stronger than a Workflow
transition, because the model cannot route around a denial. The records stay grounded through a
read-only capability. The model owns interpretation and phrasing; it owns nothing else.

Where a Workflow *is* the right answer here: if a turn's post-processing is itself a multi-step
known process — normalise, look up, score, write — run it as a **separate Workflow Execution per
turn** from the host, with the turn's text as its start input. That keeps the topology honest
instead of pretending one Workflow Execution can span a conversation.

What is *not* here: no child Execution (nothing needs independent identity), no retrieval layer
(a record capability is enough), no Working Notes (nothing to keep that is not already an asserted
fact or in the transcript).

### 14.2 An open-ended investigation task

*Requirement shape:* answer a question that requires unpredictable exploration, then report with
sources.

```text
Agent
  instructions: the objective, the evidence standard, and the stopping rule in words
  operations: search (compact identifiers) + read (full record) — reference-then-detail
  workingNotes: read + write — the plan, what has been checked, open questions
  limits: maxModelCalls, maxOperationCallsPerStep, maxContextMessages,
          maxWorkingNoteEntries / maxWorkingNotesBytes
  completion: complete_on_response when this Agent is a called child with one answer to give
```

Why this shape: the required sequence of lookups genuinely cannot be enumerated, which is the one
condition that earns an Agent. The two-operation surface gives progressive disclosure over
information without pretending the runtime has action discovery. Working Notes hold the exploration
state so it is not carried entirely in the transcript. The stopping rule is *both* a budget the
Harness enforces and an instruction the model can act on — the budget is the part that actually
holds.

If this Agent is one step of a larger known process, make it an **Agent Stage** of the enclosing
Workflow and verify its claims in the following Function Stage. Do not let the child's prose become
the parent's truth. Two constraints to design around when you do (§8.2, §8.3): the child receives
**no Structured Memory view**, so everything it produces must come back in its **terminal result**;
and the Stage passes it **no Working Notes handoff**, so its `spec.workingNotes` frame starts empty.
Its own local Working Notes still work — those are Agent-local and need no handoff.

### 14.3 An exact calculation inside a conversation

*Requirement shape:* a person describes their situation in prose; the system must produce an exact
number and explain it.

**The pattern to preserve:**

```text
language interpretation  +  accepted factual state  +  deterministic calculation  +  explanation
```

**The current implementation path**, with each job where it can actually live:

```text
1. LLM interprets prose into CANDIDATE values
     Agent with structuredMemory.write.keys exposed, or an LLM Stage returning text

2. acceptance — the step that is easy to skip and expensive to skip (§3.2)
     schema validation establishes shape/type/bounds and rejects a malformed value.
     It does NOT establish that "about 40, maybe a few more" means 40.
     For a field the calculation depends on, add one of:
       deterministic parsing in host / Function Stage code
       a source-of-record lookup whose RETRIEVED value is what gets written
       an explicit confirmation from the person
       a host policy that decides what to accept

3. accepted values are committed to Structured Memory
     schema-bound WriteMemory — from the Agent's model-facing write action,
     or from a Function Stage request. NOT from an LLM Stage (§2.4).

4. deterministic calculation over the COMMITTED values
     host code, reading Harness.structuredMemoryOf.
     Neither a Function Stage nor a CapabilityExecutor can read Structured Memory,
     so this is host work unless the inputs are already in hand.

5. the LLM explains the number it was GIVEN
     deliver the computed result as external.input to the Agent, or pass it as the
     input to an explaining LLM Stage. Never ask the model to recompute it.
```

Why this shape: the model is good at interpretation and explanation and is not a calculator. Step 2
is what stops "about 40" from silently becoming an authoritative `40`; step 4 is what stops the
arithmetic from being probabilistic; and because step 5 *receives* the value, the number a person
reads is the number the program produced.

Two tests for this pattern:

- **Could the model's output and the committed state ever disagree about the answer?** If yes, the
  computation is in the wrong place.
- **If the model misread the person, what catches it?** If the only answer is "the schema", you have
  step 2 missing.

---

## 15. Known application-builder friction

Building on the current kernel has real rough edges. The ones most likely to make a sound design
feel wrong:

```text
no application-facing composition root; the assembly helpers live in /testing
two overlapping @arrokothi/core surfaces with a colliding defineAgent
the kernel Effect vocabulary is much wider than any stock authoring surface (§2.4)
no controller-side code can read Structured Memory (§4.2)
deny-by-default misconfigurations all present as "nothing happened"
Artifact/File is canonical vocabulary with no mechanism (§4.5)
derived claims cannot express supersession (§4.4)
deadline / idempotency / cancellation are narrower than they read (§7.4)
Agent and Workflow Stages expose no Working Notes handoff (§8.3)
```

All of these are recorded, classified, and kept out of this guide's decision procedure in
[`../development/007-application-builder-ergonomics-findings.md`](../development/007-application-builder-ergonomics-findings.md).
Read it before concluding that a clumsy-feeling composition is your design's fault — and read it
before proposing a kernel change, because most of these are deliberate scope decisions rather than
gaps.

---

## 16. What this guide does not decide

- **Kernel semantics.** Every concept above is owned elsewhere. If this guide seems to grant a
  semantic, it does not.
- **Anything on the roadmap.** Portable service descriptors, expanded MCP, A2A, progressive
  heterogeneous discovery, hosted/isolated profiles, and durable restart are tranches H–N in
  [`../development/001-current-status-and-roadmap.md`](../development/001-current-status-and-roadmap.md).
  Do not design an application that assumes them, and do not implement them because a build exposed
  the gap.
- **Canonical concepts that are not implemented.** Some vocabulary in
  [`../memory.md`](../memory.md) and elsewhere is architecturally defined without an executable
  0.8.x mechanism — `Artifact/File` (§4.5) is the clearest case, and memory *scope* beyond
  Execution-local is another. Treat those as ideas to think with, not APIs to call.
- **New vocabulary.** No new Stage kind, Effect kind, Event kind, memory form, or Execution kind
  follows from an application need. If you are convinced one is missing, that is a candidate
  architecture issue to document against the owning canonical doc — not something to add here.
- **Benchmark answers.** This guide generalises deliberately. Scenario-specific tactics do not
  belong in framework guidance.
