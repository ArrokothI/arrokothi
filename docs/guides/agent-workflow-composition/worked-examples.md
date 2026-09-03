# Worked examples

> **Application/developer guidance — not canonical architecture.**
> **Canonical owners:** whichever the pattern touches; each example links to the topic page rather
> than restating its rules. Precedence and the end-to-end procedure are in [`README.md`](README.md).

Illustrative and deliberately generic: these demonstrate architectural choice, not domain answers.
Every shape here is one the current stock surfaces can actually run — see
[current authoring surface](current-authoring-surface.md) for why some obvious-looking alternatives
are not.

---

## A qualification funnel with a conversational surface

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
Workflow, and it is worth being exact about why
([current authoring surface](current-authoring-surface.md)):

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

application wiring the memory keys REQUIRE (they grant nothing on their own)
  createAgentController({ structuredMemoryReadView, structuredMemoryWriteView })
    both resolvers are application-supplied and denied by default; omit either and the
    model silently sees no memory / is offered no write action. Full chain in
    current-authoring-surface.md §3.

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
    idempotency too
```

> Every memory write the model proposes still goes through fresh `WriteMemory` authorization at the
> Harness, then schema validation, then commit. Exposing a write interface is not authorizing a
> write — see [current authoring surface §3.2](current-authoring-surface.md).

Why this shape: the progression *is* knowable, but the knowable part is the **gate**, not the
conversation, and the gate is what must be deterministic. Putting it in host code and in the
`EffectAuthorizer` makes it exact and Harness-enforced — strictly stronger than a Workflow
transition, because the model cannot route around a denial. Records stay grounded through a read-only
capability. The model owns interpretation and phrasing; it owns nothing else.

Where a Workflow *is* the right answer here: if a turn's post-processing is itself a multi-step known
process — normalise, look up, score, write — run it as a **separate Workflow Execution per turn**
from the host, with the turn's text as its start input. That keeps the topology honest instead of
pretending one Workflow Execution can span a conversation.

What is *not* here: no child Execution (nothing needs independent identity), no retrieval layer (a
record capability is enough), no Working Notes (nothing to keep that is not already an asserted fact
or in the transcript).

Related: [capabilities and authority](capabilities-effects-and-authority.md) for the denial and
confirmation gates; [current authoring surface §3](current-authoring-surface.md) for the memory
wiring this example assumes; [state and memory](state-memory-and-context.md) for who can read
committed values.

---

## An open-ended investigation task

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
*information* without pretending the runtime has action discovery. Working Notes hold the exploration
state so it is not carried entirely in the transcript. The stopping rule is *both* a budget the
Harness enforces and an instruction the model can act on — the budget is the part that actually
holds.

Related: [state and memory](state-memory-and-context.md) for the retrieval and context levers;
[workflow and stages](workflow-agent-and-stages.md) for completion mode.

---

## A known process containing an autonomous sub-problem

Take the investigation Agent above and make it one step of a larger knowable process:

```text
Workflow
  Function Stage  prepare the question and the evidence standard
        ↓ always
  Agent Stage     call the investigation Agent; its terminal result is this Stage's output
        ↓ always
  Function Stage  verify the claims against a record before anything downstream trusts them
        ↓ labelled: "verified" → publish   |   "unsupported" → back to prepare
```

Why this shape: the outer progression is enumerable, so it is a Workflow; only the middle is
open-ended, so only the middle is an Agent. Verifying in the following Function Stage is what keeps
the child's prose from becoming the parent's truth.

Two constraints to design around
([composition](composition-children-and-concurrency.md)):

- the child receives **no Structured Memory view**, so everything it produces must come back in its
  **terminal result**;
- the Stage passes it **no Working Notes handoff**, so its `spec.workingNotes` frame starts empty.
  Its own local Working Notes still work — those are Agent-local and need no handoff.

---

## An exact calculation inside a conversation

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

2. acceptance — the step that is easy to skip and expensive to skip
     schema validation establishes shape/type/bounds and rejects a malformed value.
     It does NOT establish that "about 40, maybe a few more" means 40.
     For a field the calculation depends on, add one of:
       deterministic parsing in host / Function Stage code
       a source-of-record lookup whose RETRIEVED value is what gets written
       an explicit confirmation from the person
       a host policy that decides what to accept

3. accepted values are committed to Structured Memory
     schema-bound WriteMemory — from the Agent's model-facing write action,
     or from a Function Stage request. NOT from an LLM Stage.
     For the Agent path this needs the whole write chain: the Execution's memory binding,
     the authored write.keys, a configured structuredMemoryWriteView resolver that grants
     them, and then fresh Harness authorization of the concrete write. Authored keys alone
     produce no write action at all.

4. deterministic calculation over the COMMITTED values
     host code, reading Harness.structuredMemoryOf.
     A Function Stage and a CapabilityExecutor have no memory handle, so this is host work
     unless the inputs are already in hand. (An AgentInformationCompiler does receive an
     authorized snapshot, but it builds model context — it is not where a calculation belongs.)

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

Related: [requirements and control](requirements-and-control.md) for the four-step acceptance
sequence; [current authoring surface §3](current-authoring-surface.md) for the memory wiring steps 3
and 4 depend on, why step 3 excludes an LLM Stage, and why step 4 excludes Stage code.

---

## A runnable one

[`examples/execution-kernel-minimal/`](../../../examples/execution-kernel-minimal/README.md) is not a
sketch — it is a deterministic, offline, key-free application on the production-facing surfaces, with
one authorized path and one deny-by-default path. Read it when you want the wiring rather than the
shape.
