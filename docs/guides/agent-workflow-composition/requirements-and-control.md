# Requirements and control: what must be exact

> **Application/developer guidance — not canonical architecture.** Precedence, principles, the
> requirements mapping, and the end-to-end procedure are in [`README.md`](README.md).
>
> This page has no single canonical owner: it is engineering method applied before ArrokothI
> abstractions are chosen. The mechanisms it names are owned by the pages it links to.

This page covers builder steps 1–3: turning a specification into observable requirements, deciding
what must be deterministic, and finding what can report reality.

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

| Class | Meaning | Mechanism |
|---|---|---|
| deterministic state | a fact the application asserts and later relies on | Structured Memory — [state](state-memory-and-context.md) |
| deterministic calculation | an exact transform with one right answer | Function Stage or host code — §2 below |
| fixed business progression | a knowable sequence, branch set, or gate | Workflow topology — [workflow](workflow-agent-and-stages.md) |
| open-ended reasoning | progression that cannot be enumerated in advance | Agent — [workflow](workflow-agent-and-stages.md) |
| grounded factual lookup | an answer that must come from a record, not the model | retrieval capability — [capabilities](capabilities-effects-and-authority.md) |
| external side effect | something that changes the world outside the Execution | Effect through the Harness — [capabilities](capabilities-effects-and-authority.md) |
| human interaction | input, choice, or approval from a person | `RequestUserInput` / confirmation — [capabilities](capabilities-effects-and-authority.md), and check [surface](current-authoring-surface.md) first |
| style / response behaviour | tone, format, length, register | instructions **plus** an eval rubric — §4 below |
| long-horizon retained state | must survive context resets and Activations | Structured Memory + application storage — [state](state-memory-and-context.md) |
| temporary working state | useful within this Execution's current work, then discardable | Working Notes — [state](state-memory-and-context.md) |
| evaluation-only requirement | how you will know the application works | eval suite, not runtime — [evaluation](evaluation-and-diagnosis.md) |

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
that is where it belongs, and the instruction — if you keep one at all — is a restatement for the
model's benefit, not the enforcement.

Keep instructions for the requirements that genuinely need a model: interpretation, judgment,
composition, tone.

### 1.3 Identify the environment's sources of truth

List everything that can *report* reality rather than assert it: record stores, APIs, validators,
schema validation, committed Structured Memory values, capability outcomes, test suites, and the
Harness's own Event vocabulary. These are what your stopping conditions and your graders will read.

> **A model saying it did something is not evidence that it happened.** Prefer an observation the
> runtime or the environment established. This rule reappears in
> [capabilities](capabilities-effects-and-authority.md) and
> [evaluation](evaluation-and-diagnosis.md), because it decides both.

---

## 2. Deterministic logic versus model responsibility

This is the section that most changes application quality. The question is never "can the model do
this?" — it is "**is there a mechanism that establishes the exact truth, and am I using it?**"

### 2.1 Implement these deterministically. Never delegate them to prompt text.

| Requirement | Mechanism in ArrokothI |
|---|---|
| numeric calculation, totals, thresholds, unit conversion | Function Stage / host code |
| required-field *presence* | Structured Memory field schemas + an exact gate (host code reading `structuredMemoryOf`, a Function Stage over its own inputs, or the `EffectAuthorizer`) |
| known stage progression, ordering, prerequisites | Workflow topology and declared transitions |
| record filtering, sorting, pagination, budget/eligibility limits | Function Stage before the result enters model context, or inside the capability implementation |
| *structural* validity of any value that becomes state | Structured Memory schema-bound `WriteMemory`; the runtime validates the shape and rejects a malformed one (see §3 for what this does **not** establish) |
| authority checks | `EffectAuthorizer` at the Harness; deny-by-default |
| approval of a consequential payload | `ConfirmationPolicy` (exact-payload mechanical confirmation) |
| duplicate suppression of a capability call | `EffectIdempotencyScope` on a `UseCapability` request — not a universal Effect property, and not crash-safe ([capabilities](capabilities-effects-and-authority.md)) |
| concurrent-write correctness | `expectedRevision` on `WriteMemory`; a stale write conflicts, it never silently overwrites |
| terminal conditions and budgets | Workflow topology; `AgentLimits`; the `UseCapability` operation deadline; lineage structural spawn budget |
| "this must never happen" | absence of authority, plus absence of exposure — not an instruction |

Concretely: if the specification says *"never hand off without a phone number"*, the enforcement is
a `phone` field with a schema **plus an exact gate that reads the committed value**. Note where that
gate can live today: **ordinary Function Stage code and capability implementations have no Structured
Memory handle**, so the gate is host code reading `Harness.structuredMemoryOf`, or an
`EffectAuthorizer` / `ConfirmationPolicy` the host wired that refuses the handoff Effect until its
gate has passed. (An `AgentInformationCompiler` also receives an already-authorized memory snapshot,
but its job is choosing model context, not enforcing application rules.) See
[current authoring surface §3](current-authoring-surface.md) for the exact chain, and
[state and memory](state-memory-and-context.md) for who can read what. The instruction telling the
model to collect a phone number is a helpful restatement; it is not the requirement's implementation.

### 2.2 Delegate these to a model

```text
natural-language interpretation of what a person meant
semantic summarisation and extraction
open-ended planning where the step set is not enumerable
ambiguous classification where no rule is available
response composition, explanation, tone
qualitative judgment against articulated criteria
```

---

## 3. Schema validation is not factual acceptance

Structured Memory validates a written value against its `ValueSchema`. That establishes real, useful
things:

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
write is a legitimate and supported design, and for many fields — a free-text summary, a best-effort
category, a preference — structural validation is exactly the right amount of rigour. The narrow
point is:

> **Structural validity is not factual truth.** Choose the acceptance step deliberately for the
> fields where being wrong is expensive.

---

## 4. Style and behaviour requirements

Style requirements are real requirements, but their mechanism is instructions *plus a grader*, not
instructions alone. Put the requirement in the Agent's `instructions` or the LLM Stage's `system`
prompt, and put the check in the eval rubric — see
[evaluation](evaluation-and-diagnosis.md). An unevaluated style instruction is unowned.

---

## 5. The division-of-labour pattern

The strongest shape for an exact requirement inside a conversation separates four jobs:

```text
LLM               interpret the person's input into CANDIDATE values
acceptance step   establish that a candidate is actually right (§3)
Structured Memory retain the accepted values
host code         compute the exact result from the committed values
LLM               explain the computed result it was given
```

Two implementation facts shape where each job can live today:

- the computation reads committed Structured Memory, and **neither a Function Stage nor a
  `CapabilityExecutor` is given a memory handle**, so it belongs in host code via
  `Harness.structuredMemoryOf`. (The other programmatic reader, an `AgentInformationCompiler`,
  receives an already-authorized snapshot for building model context — not a place for the
  calculation.) See [state and memory](state-memory-and-context.md);
- the explaining model must be *given* the number, not asked to produce it.

The model never performs the arithmetic and never becomes the unchecked source of a retained fact
that matters. Worked end to end in
[worked-examples.md](worked-examples.md#an-exact-calculation-inside-a-conversation).
