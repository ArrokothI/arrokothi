# Capabilities, Effects, and authority

> **Application/developer guidance — not canonical architecture.**
> **Canonical owners:** [`../../authority.md`](../../authority.md) (authority, exposure,
> projection, confirmation) and [`../../execution-runtime.md`](../../execution-runtime.md) (Effect
> mechanics, settlement, cancellation), with deployment guarantees in
> [`../../security-guarantees.md`](../../security-guarantees.md) and portable Operation projection
> in [`../../interoperability.md`](../../interoperability.md).
> Precedence and the end-to-end procedure are in [`README.md`](README.md).

This page covers builder steps 7, 8, and 10: designing the model-facing action surface, getting an
action through the Harness, and deciding what may be exposed, authorized, or confirmed.

Preserve throughout:

```text
exposure          ≠ authority
model selection   ≠ authorization
description       ≠ permission
prompt text       ≠ authority boundary
```

---

## 1. Designing capabilities the model can use

A capability operation is part of the model's action vocabulary. Wrapping every endpoint one-to-one
is the standard mistake: it produces overlapping operations, ambiguous choices, and results that
flood context.

Ask instead:

- What task boundary is natural for the model here?
- Can the *implementation* filter, join, rank, or aggregate before returning?
- Does this operation reduce or increase what has to be in context?
- Is its purpose distinct from every neighbouring operation?

### Checklist

**Distinct purposes.** `search_listings` / `read_listing` / `update_listing` partitions the action
space cleanly. Several near-identical wrappers do not.

**Names and namespacing.** Names are behavioural interface design. Namespace by domain when several
sources are exposed (`docs_search`, `crm_read_contact`). Evaluate naming rather than assuming it.

**Descriptions are prompts.** Write the `description` and per-field descriptions as if onboarding a
capable colleague who lacks your domain knowledge: intended use, explicit non-use, parameter meaning,
resource relationships, expected output. These come from the `CapabilityOperationDescriptor`
(`title`, `description`, `input`), which is descriptive truth and carries no permission.

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

### External sources

Imported MCP Tools become ordinary capability operations and travel the ordinary authority path; MCP
metadata grants nothing. The current adapter covers **synchronous Tools only** (import: list and
call; export: explicit allowlist). Resources, Prompts, Tasks/handles, elicitation, and notifications
are roadmap tranches I/J. Design against what exists.

---

## 2. Exposure and the authority chain

Author exposure as the *narrowest* useful request: `refs` for a known small set, `groups` for
label-based selection over a larger catalog, and `maxOperations` as a hard ceiling. Then remember
where the real decisions live:

```text
Catalog                 what exists                    descriptive truth, grants nothing
        ↓
Effective Authority     what this Execution may use    runtime-owned, deny-by-default
        ↓
Active View             what is shown now              deterministic narrowing, never widening
        ↓
immutable projection    what this exact call sees      persisted; responses resolve against it
        ↓
model selection         the model names one            not authorization
        ↓
Effect proposal         typed, with real arguments
        ↓
Harness reauthorization the concrete request is authorized again, every time
```

Declaring an operation in a definition neither grants it nor makes it appear.

### Controller-local model controls are a different category

`working_notes_set` mutates only the Agent's own scratch frame and crosses no Execution or runtime
boundary. It is therefore **not** an exercise of Execution authority and is not a member of an Active
View or Effective Authority. Enable it with `spec.workingNotes.write`. Do not model it as a
capability, and do not treat its enablement as permission for anything else.

---

## 3. Effects and consequential actions

### 3.1 What must cross the Harness as an Effect

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

Which of these five your chosen surface can actually propose is a separate question — see
[current authoring surface](current-authoring-surface.md).

### 3.2 The lifecycle you are designing against

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

- **No authorizer means every Effect is denied.** Correct behaviour, not a stub: "nobody configured
  policy" and "policy allowed it" must never look the same.
- **No confirmation policy means nothing requires confirmation.** Confirmation is an optional extra
  gate that runs strictly after an `allow`. A policy that throws fails *conservative* — treated as
  requiring confirmation.

### 3.3 Handle every outcome, not just success

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

### 3.4 Why a model's claim is not evidence

The model is a participant, not an authority. It can propose; it cannot establish. The Harness
records what was authorized and dispatched, and the executor/environment reports what happened. Your
stopping conditions, terminal results, and graders should read those, not the model's prose.

### 3.5 A prompt is never the authority boundary

Untrusted content — retrieved documents, tool results, peer messages, model output, third-party
descriptors — may influence what gets *requested*. It must never widen what is *permitted*. If your
design's answer to "what stops this from happening?" is a sentence in a prompt, the design has no
boundary there. Remove the authority, or add a gate.

---

## 4. Deadlines, duplicate suppression, and cancellation are narrower than they look

These three are commonly assumed to be uniform kernel-wide properties. They are not, and designing as
if they were produces a liveness or double-execution bug that testing rarely catches.

### 4.1 Operation deadlines are a `UseCapability` property

`deadlineMs` exists on the `UseCapability` proposal only, and the Harness's `defaultEffectDeadlineMs`
is applied only on that path. Everything else waits with **no configured deadline**, deliberately and
with the reasoning recorded in source:

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

### 4.2 Cancellation is explicit and does not cascade

`Harness.cancelExecution` is a trusted runtime entry point, not an Effect and not a model action. A
`call` parent's PendingOperation settles as `cancelled` with one correlated `child.cancelled` Event,
and that is all:

```text
cancelling one Execution does NOT cancel its parent,
                             does NOT cancel its siblings,
                             does NOT cancel its descendants
```

Cancelling a subtree is application work: walk it and cancel each Execution yourself.

### 4.3 Three different things get called "idempotency"

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
implement (2). Do not rely on (1) for a guarantee only (3) could give, and do not assume the Harness
provides (3).

---

## 5. Deciding what may be exposed, authorized, or confirmed

### 5.1 The questions, in order

For every action your application can take:

```text
1. May it be exposed?        Is a model allowed to SEE that this action exists?
2. May it be authorized?     Would the Harness allow this concrete request, with these arguments,
                             under this Execution's current authority?
3. Does it require confirmation?
                             Must a human approve THIS exact payload before dispatch?
4. Should it be deterministic instead?
                             Is a model involved in this decision at all, and why?
5. Does it belong outside model control entirely?
                             Credential handling, policy decisions, irreversible destruction —
                             anything where "the model was persuaded" is an unacceptable failure.
                             Those are not exposed and not authorized. Absence is the strongest
                             boundary available.
```

### 5.2 Mapping the answers onto mechanisms

```text
exposure          author the narrowest exposure request; keep the Active View small
authority         configure the EffectAuthorizer; deny-by-default is the baseline, keep it
confirmation      configure ConfirmationPolicy for consequential payloads
determinism       move the decision into a Function Stage / schema / transition / host gate
outside control   do not grant it; do not expose it; do not build the capability
```

Attenuate for children: pass the smallest `requestedOperations` the child needs, remembering it is
intersected with the parent's *current* authority and narrows only capability-operation authority —
see [composition](composition-children-and-concurrency.md).

### 5.3 Truthful current guarantees

- **Semantic enforcement is real** for everything mediated by the Harness: Effect authorization,
  child attenuation, memory visibility, messaging boundaries, exact-payload confirmation,
  correlation/settlement, lifecycle and cancellation.
- **Physical containment is not provided by the trusted-local profile.** ArrokothI does not contain
  the owner of the host process from touching files, sockets, databases, subprocesses, or credentials
  directly. Hosted-declarative and hostile-code-isolated profiles are **roadmap tranche L**; there is
  no sandbox to claim today.
- **Information-flow control is not guaranteed.** An Execution legitimately allowed to read a secret
  and legitimately allowed to produce output may combine the two.

State the active profile in your own documentation. Do not let an application inherit a containment
claim the runtime does not make.

### 5.4 Approval fatigue

Confirmation is for meaningful escalation. If everything requires approval, approval stops meaning
anything. Draw the line at real boundary crossings — irreversibility, external visibility, spend,
third-party contact — and let deterministic authority handle the routine cases automatically.

---

## 6. Budgets are not permissions

`AgentLimits` (model calls, per-step call fan-out, context messages, notes and derived budgets), the
`UseCapability` operation deadline, and the lineage structural spawn budget constrain *how much*
autonomous work may occur. They say nothing about whether an action is allowed. Set both: a
composition with authority but no budget can burn cost; one with budget but no authority does
nothing. Exhausting a budget should be a **reported failure**, not a silent loop.

Be precise about coverage (§4.1): a configured deadline bounds a `UseCapability` operation. Waiting
for a child result, a peer reply, user input, or a confirmation has **no configured deadline**, so
any bound on those is yours to enforce in host orchestration.
