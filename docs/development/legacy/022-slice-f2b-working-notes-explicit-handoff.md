# Slice F.2b — Explicit Working Notes Handoff Across Composition Boundaries

> **Status:** implemented on the long-lived branch `slice-f-memory-completion` from the accepted
> F.2a checkpoint `fe837f24ba853df7ab797bb64751c75c6be11fdd`, then corrected by one independent
> review of F.2b HEAD `351c6e198e1ecab57d4b43385215b89c7ffd6e19` (§0 below). **Independently
> accepted at `d192f83279e6b996d70317150b6621b69bd52ef6` (behavioural) + `8b5e506` (doc-only
> follow-up). Still on the branch, not yet merged with the rest of Slice F.** F.3 (Derived Semantic
> Memory + provenance/promotion, doc [`023`](023-slice-f3-derived-semantic-memory-provenance-promotion.md))
> is the current checkpoint and builds on it; the branch merges into `main` only after the whole of
> Slice F is independently accepted in a final integrated review.
>
> **Scope:** the first explicit Working Notes composition transfer — a parent selects a subset of
> its own Working Notes, that subset crosses one **child Execution** boundary as an immutable
> snapshot attached to an already-authorized `SpawnExecution`, and the child starts with its own
> **fresh writable** local frame seeded from it.
>
> **Canonical documentation change:** none. [`../../memory.md`](../../memory.md) §5/§12/§15/§16 and
> [`../../composition.md`](../../composition.md) §15 already own every rule this slice implements — the
> runtime already has exactly the two artifacts §15 describes (§0.3 / §12).

This is an engineering record. Canonical memory semantics remain in [`../../memory.md`](../../memory.md);
composition-boundary consequences in [`../../composition.md`](../../composition.md) §15;
authority-vs-local-control semantics in [`../../authority.md`](../../authority.md) §3. F.2a is recorded in
[`021`](021-slice-f2a-working-notes-local-scratch.md).

## 0. F.2b independent-review correction

The review of F.2b HEAD `351c6e1` accepted the core architecture — `WorkingNotesHandoff`, explicit
key selection, `SpawnExecutionProposal.workingNotes` on the existing `SpawnExecution` Effect only,
the generic transfer envelope, atomic envelope rejection before child creation / spawn-credit
consumption, `ExecutionContext.workingNotesHandoff`, deep-copy independence, the Agent-local
writable frame, no automatic child→parent return, Workflow Stage handoff deferral, and the `014`
§7.6 note — and required five bounded corrections. **No behaviour changed for items 3 and 4; they
are wording/semantic-framing corrections. Items 1, 2, 5 add validation and tests.**

### 0.1 Public handoff helpers are now invariant-preserving (fail-closed)

`selectWorkingNotesHandoff`, `cloneWorkingNotesHandoff`, and `workingNotesFrameFromHandoff` are
exported through `execution-api.ts` and previously trusted their typed inputs at runtime. They now
follow the same discipline as `setWorkingNote`:

- new pure `workingNotesHandoffSelectionIssues(value)` — a plain object with exactly `keys`, an
  array of unique non-empty strings; empty `[]` valid; unknown properties rejected;
- `selectWorkingNotesHandoff(frame, selection)` **throws** (`TypeError`) on a malformed source
  frame (`workingNotesFrameIssues`) or a malformed selection, rather than silently filtering a bad
  frame into a statically-typed-valid value;
- `cloneWorkingNotesHandoff` / `workingNotesFrameFromHandoff` **throw** on a malformed input
  handoff (`workingNotesHandoffIssues`) before returning an invariant-bearing result.

The Effect gateway's internal `cloneWorkingNotesHandoff` call is still safe because the proposal was
already structurally validated by `effectProposalIssues`; the public API no longer exposes an
unchecked invariant constructor. Regressions added for malformed frame, malformed selection,
duplicate/blank selection key, and malformed handoff input.

### 0.2 Concrete-Effect authorization semantics — runtime unchanged, wording corrected

The runtime already passes the **complete concrete `SpawnExecutionProposal`** — `workingNotes`
included — to `EffectAuthorizer` (and the exact-payload confirmation gate). That is correct and was
never changed. Only the *documentation and comments* were wrong. The accurate statement:

```text
a Working Notes handoff does NOT grant, widen, attenuate, or evidence authority,
and adds no Working Notes authority ontology;

BUT it is part of the concrete cross-Execution SpawnExecution request, so current
authorization/policy (and confirmation) may inspect it and DENY (or gate) that
concrete transfer — an ordinary effect.denied on the spawn.
```

Doc 022 §10, the `SpawnExecutionProposal.workingNotes` doc comment, and the `dispatchSpawn` comment
were corrected. New conformance test with a narrow custom authorizer: the same child spawn *without*
a prohibited handoff key → allowed; *with* the selected prohibited key → `effect.denied`, no child,
no child link, no structural spawn credit consumed. Child operation attenuation is unchanged.

### 0.3 Canonical two-artifact reconciliation (no canonical-doc change)

The prior §12 wrongly claimed F.2b "concretizes §15 into one artifact". It does not. The runtime has
**exactly the two artifacts** canonical [`../../composition.md`](../../composition.md) §15 /
[`../../memory.md`](../../memory.md) §5 describe:

```text
ExecutionContext.workingNotesHandoff   = the immutable inherited / read-only selected snapshot
AgentControlState.workingNotes         = the child-owned writable frame, seeded once from a deep copy
```

"Consume once" means **seed once, never re-overlay** — it does *not* mean the inherited snapshot
ceases to exist. The retained handoff on `ExecutionContext` remains a read-only record/view of what
was explicitly delegated, for the life of the child. No new Agent state field, and no second
model-context block, is required: the accepted reference behaviour continues compiling only the
child-local seeded frame into model context. §12 is rewritten accordingly; comments in
`context.ts`, `controller.ts`, `control-state.ts`, and `working-notes.ts` were corrected.

### 0.4 Effect-journal retention is documented accurately (§16.5 below)

The generic `EffectProcessor` records every proposal verbatim in the `requested` journal phase, so a
`SpawnExecutionProposal.workingNotes` handoff means the **selected handoff content is present in
runtime Effect history**. The later `authorized`-phase detail records only `workingNotesHandoffKeys`,
but that does not make the journal keys-only overall. §16.5 records this accurately; F.2b does not
redesign or redact the generic Effect journal, and payload-redaction/retention policy is left as
later security/privacy engineering.

### 0.5 Strengthened parent/child independence regression

The independence test now performs the actual parent `plan = A → B` update: a real parent Agent
writes `plan = {v:"A"}` on step 1, is snapshotted, then advances to `plan = {v:"B"}` on step 2,
while the child (seeded from the step-1 snapshot) moves its own frame to `plan = {v:"C"}`. Asserted:
the selected snapshot value stays `A`, `childCtx.workingNotesHandoff` stays `A`, the child-local
frame is `C`, and the parent's own frame is `B`. Nested-JSON alias-independence regressions retained
and strengthened (mutating caller structures *after* the spawn reaches neither the child frame nor
the inherited snapshot).

Everything below reflects the corrected implementation.

## 1. Scope

Implemented:

```text
WorkingNotesHandoff (immutable transfer snapshot)         packages/core/src/execution/working-notes.ts
  + selectWorkingNotesHandoff / workingNotesFrameFromHandoff / cloneWorkingNotesHandoff
      (all fail-closed: they THROW on malformed runtime input, per §0.1)
  + workingNotesHandoffIssues / workingNotesHandoffSelectionIssues / workingNotesHandoffBudgetIssue
  + WORKING_NOTES_HANDOFF_MAX_ENTRIES / _MAX_BYTES (generic transfer envelope)
SpawnExecutionProposal.workingNotes? (+ SpawnExecutionInput)  packages/core/src/effects/types.ts
  validated structurally in effectProposalIssues, exactly like any other proposal field
ExecutionContext.workingNotesHandoff + ExecutionView         packages/core/src/execution/context.ts
  a plain typed field, null by default; NOT a DeferredSlot, NOT a RuntimeStore record
Effect gateway spawn path                                    packages/core/src/runtime/effect-processor.ts
  generic envelope check -> atomic effect.rejected; deep-copied snapshot onto the child context;
  parent-side journal of handed-off keys (no content)
AgentController.seedInitialState                             packages/core/src/controllers/agent/controller.ts
  folds the handoff into the initial AgentControlState.workingNotes exactly once, on first
  Activation; re-validates against this Agent's own budget; independent of read/write enablement
initialAgentControlState(workingNotes?)                     packages/core/src/agent/control-state.ts
testing: extraControllers on createAgentTestHarness; workingNotes on the scripted spawn/call step
```

Explicitly **deferred** (unchanged from the task brief):

```text
sequential Workflow Stage Working Notes handoff             later — a Stage is not a parent/child
parallel-branch Working Notes / shared mutable notes        Slice G / later evidence
join/merge semantics                                         Slice G / later evidence
child-to-parent automatic note return                       not designed; use terminal result / memory
Working Notes references / RuntimeStore / authority system  not built
Derived Semantic Memory / promotion / Artifacts             F.3
model-directed SpawnExecution + handoff                     not implemented (no model-directed spawn today)
```

`SendMessage`, `RequestUserInput`, confirmation, Structured Memory, and the F.1.1 action view are
untouched. No new Effect kind, Event kind, or PendingOperation kind. `LocalModelControlProjection`
and `ActiveModelActionView` are byte-identical to F.2a.

## 2. Audit before coding

- `SpawnExecution` is already the only mediated child-creation gateway
  ([`013`](013-slice-e0-child-execution-foundation.md)): a controller *proposes*, the Effect gateway
  resolves the Definition, attenuates authority against the parent's current ceiling, spends one
  lineage structural-spawn credit, and creates the child - or refuses, atomically. F.2b attaches a
  datum to that proposal; it invents no second gateway.
- A child's initial `AgentControlState` is built by the `AgentController` on its first Activation
  (`readAgentControlState` returns `absent`), from `initialAgentControlState()`. There was no
  generic "startup data" seam; the start *input* rides an `external.input` Event labelled `"spawn"`,
  which is task input, not scratch initialization.
- `ExecutionContext` already carries typed per-concern fields plus opaque `DeferredSlots`. F.2a
  removed the `slots.workingNotes` placeholder and its module comment already anticipated F.2b:
  "explicit cross-Execution note visibility, but through `SpawnExecution`/Stage handoff, not a slot."
- `WorkingNoteEntry` / `WorkingNotesFrame` are a dependency-free `execution/` leaf (util only). A
  handoff snapshot is structurally the same ordered entry list, so it lives in the same leaf and the
  generic Effect gateway can carry it without importing anything from `agent/`.

The resulting choice: **a plain immutable snapshot on the proposal → a plain field on the child
`ExecutionContext` → surfaced once through `ExecutionView` → the child's own controller folds it
into its initial frame.** No resolver, no store facet, no Harness API, no controller store handle.

## 3. The handoff snapshot type

`packages/core/src/execution/working-notes.ts` gains, alongside the F.2a frame:

```ts
interface WorkingNotesHandoff { readonly entries: readonly WorkingNoteEntry[]; }
type WorkingNotesHandoffSelection = { readonly keys: readonly string[] };
```

Explicit terminology, deliberately:

```text
WorkingNotesFrame      mutable-by-owner scratch state carried across a controller's own progress
WorkingNotesHandoff    a deep copy of an explicitly selected subset, frozen at one boundary
```

`WorkingNotesHandoff` is a *separate interface*, not an alias, so the two roles read distinctly at
every call site even though TypeScript's structural typing makes them assignable. It is:

```text
plain JSON            survives JSON.stringify / parse and a durable-store substitution
deterministically     entries key-ordered and unique, exactly like a frame
  ordered
deeply copied         selectWorkingNotesHandoff / workingNotesFrameFromHandoff / cloneWorkingNotesHandoff
  (no aliasing)          each clone every entry's content; no structure is ever shared
bounded               validated against a fixed transfer envelope before it crosses the Harness
no runtime revision   no owner id, no memoryViewId, no authority, no credential, no provenance graph,
                        no live reference back to the source frame
```

No store-backed handoff record was created: nothing else reads it, and the child consumes it once.

## 4. Selection semantics

```ts
selectWorkingNotesHandoff(frame: WorkingNotesFrame, selection: { keys: string[] }): WorkingNotesHandoff
```

Pure. Filters the frame's entries to the selected keys, deep-copies each surviving entry's content,
and preserves the frame's ascending key order. Decisions, recorded:

- **No `all` mode.** The smallest useful semantics is a key list. An "all" convenience would invite
  "omitted means all"; keeping only `{ keys }` makes "no handoff declaration → zero notes cross" and
  "`{ keys: [] }` → zero notes cross" the same obvious rule.
- **Omitted selection is never "all".** A `SpawnExecution` proposal with no `workingNotes` field
  hands off nothing. Parent/child ownership carries no ambient note visibility.
- **A selected key the source frame does not currently hold is ignored** - not an error, and it
  reveals nothing to the child (no "key absent" metadata crosses). Working Note keys are dynamic
  local vocabulary, not stable identities or permissions, so runtime note existence must not become
  an authored-selection validation input. Selection is visibility / data-flow intent, never
  permission.

## 5. SpawnExecution integration

`SpawnExecutionProposal` (and the `SpawnExecutionInput` the `spawnExecution` / `callExecution`
builders take) gains one optional field:

```ts
readonly workingNotes?: WorkingNotesHandoff;
```

`effectProposalIssues` validates it under the `spawn_execution` arm with `workingNotesHandoffIssues`
- structurally, before identity is assigned - exactly as every other malformed proposal field is
refused as data. A controller building the proposal normally does
`workingNotes: selectWorkingNotesHandoff(frame, { keys })`, so the snapshot is already deep-copied
and bounded by its source frame.

The two-step design the task suggested is what shipped:

```text
proposing controller's own frame
        ↓ selectWorkingNotesHandoff(frame, { keys })   (pure helper, no runtime lookup)
plain immutable snapshot
        ↓ attached to the SpawnExecution proposal
Effect gateway
```

The Effect carries the snapshot, not a frame handle. The gateway performs no runtime lookup of any
controller's state to "resolve" a handoff - the proposing controller already owns its frame.

## 6. Effect gateway: envelope check, atomic rejection, deep copy

In `dispatchSpawn`, after Definition resolution and the `expectedChildKind` check, before the spawn
transaction:

```text
proposal.workingNotes present?
  yes -> workingNotesHandoffBudgetIssue(handoff)   (generic transfer envelope: 32 entries / 16384 bytes)
           over -> effect.rejected  "spawn_working_notes_handoff_over_budget"
                   NO child, NO lineage credit spent, NO partial state, NO first Activation
```

Then inside the same spawn transaction that creates the child:

```text
createExecutionContext({ ..., workingNotesHandoff: cloneWorkingNotesHandoff(proposal.workingNotes) })
journal (authorized phase) detail.workingNotesHandoffKeys = [selected keys]   (parent-side audit, keys only)
```

The clone is deliberate: the journal retains the proposal object verbatim, and the child's stored
snapshot must not share structure with it.

### Why a generic envelope rather than the child's real budget

The task's preferred rule is "handoff must fit the destination's Working Notes limits", but the
generic Effect gateway must not parse Agent-internal limits (`agentLimits`, `AgentSpec`) to mediate
a generic spawn - `SpawnExecution` is proposed by controllers other than Agent. So the Harness
enforces a **fixed transfer envelope** it can evaluate from trusted, layering-safe information, and
does so atomically. The envelope values equal `DEFAULT_AGENT_LIMITS`'s Working Notes budgets
(`maxWorkingNoteEntries` 32, `maxWorkingNotesBytes` 16384):

```text
default-limits parent  -> its frame is already <= 16384 bytes, so any selected subset fits the
                          envelope, and a default-limits child accepts it -> fully atomic, no second failure
child with a LOWER      -> the handoff passes the envelope but the AgentController re-validates it
  custom budget            against the real budget at initialization and FAILS the Execution
                          deterministically (`agent_working_notes_handoff_over_budget`) - never truncates
child with a HIGHER     -> cannot receive a handoff larger than the envelope (a safe false rejection;
  custom budget            deterministic, no truncation)
```

Documented tradeoff, per task §13: the lower-custom-budget corner fails at the child's first
Activation rather than atomically at spawn, because the Harness genuinely does not have that budget
without violating controller/runtime separation. **No path truncates silently.**

## 7. Child initialization seam

`ExecutionContext` gains `workingNotesHandoff: WorkingNotesHandoff | null` (a plain typed field, not
a `DeferredSlot`, not a store facet), surfaced through `ExecutionView.workingNotesHandoff` and
`toExecutionView`. `ActivationInput` is **unchanged** - still exactly four fields - because the
handoff reaches the controller inside the read-only `execution` view it already receives.

`AgentController.seedInitialState(spec, handoff)` is the consume point. On the first Activation
(`readAgentControlState` → `absent`):

```text
handoff === null   -> initialAgentControlState()            (empty frame; nothing scanned or cloned)
handoff present    -> workingNotesHandoffIssues(handoff)     malformed -> agent_working_notes_handoff_invalid
                      workingNotesFrameFromHandoff(handoff)   deep-copied fresh writable frame
                      workingNotesBudgetIssue(frame, agentLimits(spec))
                                                             over -> agent_working_notes_handoff_over_budget
                      initialAgentControlState(frame)
```

`initialAgentControlState` gained one optional parameter (`workingNotes: WorkingNotesFrame =
emptyWorkingNotesFrame()`). A malformed or over-budget handoff is a deterministic Execution
**failure**, never a throw, never a restart, never a silent trim.

The generic Effect gateway never learns `AgentControlState` shape: it stores generic snapshot data
on the context, and the Agent controller consumes an *eligible* handoff through the controller-
neutral view seam. A non-Agent controller could later construct its own eligible snapshot from its
own Working Notes semantics without any change here.

## 8. Consume-once semantics (two coexisting artifacts)

```text
child's first Activation
  -> readAgentControlState(progress) === "absent"
  -> seedInitialState builds AgentControlState.workingNotes from a deep copy of
     ExecutionContext.workingNotesHandoff
  -> the Activation persists that control state

every later Activation
  -> readAgentControlState(progress) === "read"
  -> the controller uses stored.state.workingNotes (the child's writable frame)
  -> input.execution.workingNotesHandoff is still present as the read-only inherited record,
     but is NEVER re-overlaid onto the writable frame
```

"Consume once" is **seed once, never re-overlay** — *not* "the inherited snapshot disappears". Both
artifacts coexist for the life of the child:

```text
ExecutionContext.workingNotesHandoff   immutable inherited/read-only snapshot A         (never changes)
AgentControlState.workingNotes         child-owned writable frame, starts as copy(A)     (child may write C)
```

This is what lets a child intentionally replace or remove a handed-off note: after
`working_notes_set { key: "plan", content: "C" }`, step N+1's writable frame reads `plan = C`, not
`plan = A` again — while `input.execution.workingNotesHandoff` still reads `A`. Persisted child
progress is authoritative for the child's *writable* scratch from initialization onward.

## 9. Parent/child independence

Three independent deep copies stand between the parent's frame and the child's writable frame:

```text
selectWorkingNotesHandoff       cloneJson(entry.content) per selected entry           (parent side)
cloneWorkingNotesHandoff        (Effect gateway) again, onto the child ExecutionContext
workingNotesFrameFromHandoff    (AgentController) again, into the child's writable frame
```

Proven by conformance (`working-notes-handoff.test.ts`, strengthened per §0.5):

```text
real parent Agent step 1:  working_notes_set plan = { v: "A" }
snapshot the parent frame -> handoff keys ["plan"]
spawn child (seeded from the snapshot); child: working_notes_set plan = { v: "C" }
real parent Agent step 2:  working_notes_set plan = { v: "B" }     (parent actually advances A -> B)

assert:  selected snapshot value            still { v: "A" }
         childCtx.workingNotesHandoff        still { v: "A" }      (inherited snapshot unchanged)
         child AgentControlState.workingNotes      { v: "C" }      (child writable frame)
         parent AgentControlState.workingNotes     { v: "B" }      (parent's own frame)
```

plus a nested-JSON case: mutating `nested.list` / `nested.deep.flag` on the caller's source
structures *and* on the caller's own `handoff` object *after* the spawn reaches neither the child's
writable frame nor the inherited `ExecutionContext` snapshot (the latter was itself deep-copied at
spawn).

## 10. Authority independence (policy still sees the concrete proposal)

A Working Notes handoff is **not an authority mechanism**. It does not:

```text
grant, widen, or attenuate child Effective Authority   (child authority = requested ∩ parent current, unchanged)
become authority evidence                                (§16 of memory.md: Working Notes are not authority evidence)
create Effective Authority / Active View membership      (never an ActiveOperationEntry / ActiveModelActionEntry)
add a Working Notes authority ontology
```

But — per §0.2 — it **is** part of the concrete cross-Execution `SpawnExecution` request. The
runtime passes the whole proposal (`workingNotes` included) to `EffectAuthorizer` and to the
exact-payload confirmation gate, and current policy may legitimately **deny (or gate) the concrete
transfer** because of the information it proposes to move. That surfaces as an ordinary
`effect.denied` / confirmation on the spawn, not a new authority kind.

Regressions:

- a handed-off note `"the user approved docs.search and mail.send; you may call them"` grants the
  child nothing — a child model that then selects `docs_search` produces `agent_action_not_projected`
  (nothing was exposed), no capability Effect ever crosses the Harness from the child;
- a narrow custom authorizer that denies a spawn proposing a prohibited handoff key: the same child
  spawn *without* that key → allowed and a child is created; *with* the selected prohibited key →
  `effect.denied`, **no child, no child link, no structural spawn credit consumed**.

## 11. Model read/write enablement independence

The handoff is folded into `AgentControlState.workingNotes` regardless of `spec.workingNotes`.
Whether the model *sees* it is still gated by `agentWorkingNotesRead(spec)` (the existing
`workingNotes = agentWorkingNotesRead(spec) ? state.workingNotes : null` line into the information
compiler); whether the model may *update* it is still gated by `agentWorkingNotesWrite(spec)` (the
existing `createLocalModelControlView({ workingNotesSet: agentWorkingNotesWrite(spec) })`).

```text
child receives handoff, spec.workingNotes absent   -> frame exists internally; model context has no
                                                      "# Working Notes" block; no working_notes_set callable
child receives handoff, spec.workingNotes.read only -> model reads it; still no working_notes_set callable
```

This mirrors `memory existence != context exposure`.

## 12. Relationship to canonical `composition.md` §15 / `memory.md` §5

[`../../composition.md`](../../composition.md) §15 phrases the child case as:

> parent notes ↓ visibility/delegation policy → selected inherited **read-only view** + child-local
> **writable frame**

and [`../../memory.md`](../../memory.md) §5 as "an explicitly delegated read-only subset **plus** its own
local writable frame". **F.2b implements exactly these two artifacts** (§0.3):

```text
ExecutionContext.workingNotesHandoff   = the selected inherited (read-only) view
                                          immutable, deep-copied, retained for the child's life,
                                          never re-overlaid
AgentControlState.workingNotes          = the child-local writable frame
                                          seeded once from a deep copy of the inherited view
```

Every §15 / §5 / §12 / §17 invariant holds: `note ancestry != note visibility` (a child that was
not handed a key does not see it), not silently shared across Execution boundaries (the two frames
are independent deep copies), explicit handoff only, no mutable cross-Execution sharing, and the
parent's frame is never a shared mutable frame with the child.

This checkpoint does **not** additionally render the inherited read-only view as a second
model-context block — the accepted reference behaviour continues compiling only the child-local
seeded frame into model context, and whether the model sees it at all stays gated by
`spec.workingNotes.read` (§11). Exposing the inherited view separately in the model context is a
possible later refinement, not a requirement, and needs no new state. **No canonical-doc change.**

## 13. No child-to-parent automatic return

F.2b is one-way: `parent → child initialization snapshot`. A child's Working Notes are **not**
included in `child.completed`, its terminal result, or any parent observation. The parent Workflow
in the conformance suite sees only `terminalResult`; nothing about notes leaks. Important child
output uses the terminal result, Structured Memory, an Artifact/File (later), or an explicit
message - the same as before F.2b.

## 14. Workflow deferral

The Workflow controller is untouched: it still proposes `callExecution({ ... })` for an Agent Stage
/ Workflow Stage with no `workingNotes`. Recorded for the future Slice-G handoff:

```text
child Execution boundary       uses an explicit immutable handoff snapshot on SpawnExecution (F.2b)
sequential Workflow Stage       is NOT parent/child; needs its own explicit Stage handoff policy later,
  boundary                       reusing selectWorkingNotesHandoff / WorkingNotesHandoff as the primitive
parallel Working Notes sharing  remains deferred to Slice G / later evidence
```

The `selectWorkingNotesHandoff` / `workingNotesFrameFromHandoff` helpers and the `WorkingNotesHandoff`
type are controller-neutral (`execution/` leaf, util-only imports), so Workflow Stage work can reuse
the concept without pretending a Stage is a child Execution.

## 15. No-feature cost

For an ordinary `SpawnExecution` without a handoff:

```text
proposal has no `workingNotes` key            (spawnExecution omits it, never synthesizes {})
dispatchSpawn: one `proposal.workingNotes !== undefined` check, then nothing
createExecutionContext: workingNotesHandoff = null   (one null field, like the empty DeferredSlots)
no parent note scan, no clone, no envelope check, no extra store read, no provider call
AgentController.seedInitialState(spec, null) -> initialAgentControlState()   (the F.2a constant)
```

Conformance: a child spawned with no handoff has `workingNotesHandoff === null` and its provider
request (system context + callable namespace) is **byte-identical** to the same Agent spec run as a
directly-created root. All F.2a and Slice-E composition regressions stay green.

## 16. Tests

New: `tests/conformance/memory/working-notes-handoff.test.ts` (26 cases):

- pure selection: only selected keys cross, key-ordered; no selection / empty list = zero notes;
  absent selected key ignored; nested-content deep-copy independence; snapshot is plain JSON;
  `workingNotesFrameFromHandoff` yields an independent well-formed frame; malformed / over-envelope
  detection; **the fail-closed helpers throw on malformed frame / selection / handoff input (§0.1)**;
- a real Agent child: selected parent note → child's own initial frame; unselected key absent in
  the child; no handoff → empty frame; consume-once (child replaces `plan`, not re-overlaid, while
  the inherited snapshot stays put);
- parent/child independence (§0.5): real parent Agent advances `plan A → B`, the selected snapshot
  and `childCtx.workingNotesHandoff` stay `A`, the child-local frame is `C`; nested-JSON mutation
  after the spawn reaches nothing;
- **a narrow custom authorizer denies a concrete spawn because of its proposed handoff key: same
  spawn without it → allowed; with it → `effect.denied`, no child, no link, no spawn credit (§0.2)**;
- read disabled → handed notes exist internally, never in the model context; write disabled → no
  `working_notes_set` callable though a frame was handed over;
- a note asserting an approval grants nothing (`agent_action_not_projected`, no capability Effect);
  child effective authority stays `requested ∩ parent`, unchanged by the handoff;
- oversized handoff → atomic `effect.rejected`, no child, no link, no `dispatch_started`, no
  lineage credit spent, parent Activation not failed; a child with a tighter custom budget than the
  envelope fails deterministically at initialization;
- no automatic child-to-parent return (parent sees only `terminalResult`);
- `spawnExecution` carries the handoff as plain data and round-trips; a scripted parent proposing a
  structurally malformed handoff fails its Activation; no-handoff proposal omits the field;
  no-handoff child byte-identical to a root Agent.

Architecture (`tests/conformance/architecture/`):

- `composition-boundaries.test.ts`: the handoff select/snapshot helpers are a dependency-free
  `execution/` leaf reaching no Harness/store/authorizer/Active View/Agent internals; the generic
  spawn runtime names no `AgentControlState` / `AgentSpec` / `AgentController` / local-model-control
  and its graph reaches no Agent runtime-state module (`agent/spec.ts` is a pre-existing type-only
  edge via `definitions/types.ts`); the handoff is a plain `ExecutionContext` field, not a
  `DeferredSlot` and not a `RuntimeStore` facet; the AgentController consumes a handoff but still
  holds no runtime handle; the handoff adds no Effect / Event / PendingOperation kind and no local
  model control; `ActiveModelActionView` stays F.1.1-only; the `SpawnExecution` proposal (handoff
  included) is plain data.
- `agent-boundaries.test.ts`: the `working_notes_set` *local control* is still never an Effect
  field; the F.2b handoff *is* an optional `workingNotes?: WorkingNotesHandoff` on
  `SpawnExecutionProposal`, plain data, never a `working_notes.*` Effect / Event / PendingOperation
  kind.

Updated: `working-notes.test.ts` - one F.2a comment rescoped from "F.2a adds no handoff path at
all" to "an Agent created directly (not spawned with an explicit F.2b handoff)"; the assertion
(a directly-created Execution inherits nothing) is unchanged and still passes.

Added by the §0 review correction:

- **§0.1** — `workingNotesHandoffSelectionIssues` accepts `{ keys: [] }` / `{ keys: [...unique
  non-empty strings] }` and rejects a non-object, extra props, non-array `keys`, blank keys, and
  duplicate keys; `selectWorkingNotesHandoff` throws on a malformed source frame (out-of-order /
  duplicate keys / blank key / non-JSON content) and on a malformed selection;
  `cloneWorkingNotesHandoff` / `workingNotesFrameFromHandoff` throw on a malformed input handoff; a
  well-formed handoff still round-trips.
- **§0.2 / §0.5** — the policy-denied-handoff test and the strengthened parent `A → B` /
  inherited `A` / child-local `C` independence test described above.

## 16.5 Effect-journal retention of handed-off content

Per §0.4. The generic `EffectProcessor` records every proposal **verbatim** in the `requested`
journal phase (that verbatim record is exactly what makes `denied` / `rejected` reviewable
afterwards). Therefore:

```text
unselected notes        never enter the proposal, never cross the Harness, never journaled
selected handoff        crosses the Harness deliberately; the `requested`-phase journal entry
                        contains the exact SpawnExecutionProposal, so the selected handoff CONTENT
                        is retained in runtime Effect history
`authorized`-phase      records only workingNotesHandoffKeys (keys, no content) as parent-side audit
detail                  -- but this does not make the journal keys-only overall
```

Retaining the selected content as runtime audit/history does **not** promote it to Structured
Memory, Derived Semantic Memory, authority, or application truth — it is Effect provenance, exactly
like a `UseCapability` proposal's `input`. F.2b deliberately does **not** redesign or redact the
generic Effect journal. Payload redaction / encryption / retention policy for consequential-Effect
proposals (handoffs included) is later security/privacy engineering; [`../../security-guarantees.md`](../../security-guarantees.md)
owns the trust/deployment consequences and no F.2b API is invented for it here.

## 17. Local validation

Run at the F.2b re-review tip (local, not CI):

```text
npm test                        950 pass, 0 fail   (was 918 at F.2a; 946 before the §0 correction)
npm run test:conformance        699 pass, 0 fail   (was 667; 695 before)
npm run test:mcp                 68 pass, 0 fail
npm run test:evals               12 pass, 0 fail   (unchanged: default wiring authors no handoff)
npm run test:benchmark-subjects   8 pass, 0 fail
npm run typecheck               pass
git diff --check                clean
```

## 18. Canonical consistency

[`../../memory.md`](../../memory.md) §5 ("A child may receive an explicitly delegated read-only subset
plus its own local writable frame"), §12 (explicit views; ownership ancestry does not expand
visibility), §15 ("explicit handoff/commit is safer than turning scratch state into ambient shared
memory"), §16 (Working Notes are not authority evidence), and §17 invariants all already own the
F.2b rules, and the runtime implements the §5 / [`../../composition.md`](../../composition.md) §15
**two-artifact** model literally (§0.3 / §12): an immutable inherited read-only snapshot on
`ExecutionContext` plus a child-local writable frame seeded once from it. `composition.md` §15 owns
the child/Stage split; F.2b implements the child arm and leaves the sequential-Stage arm deferred,
exactly as §15 anticipates. **No canonical-doc change.**
[`../../authority.md`](../../authority.md) §3/§14 are untouched: a handoff is not a model callable at all,
so neither the authority-governed chain nor the F.2a local-control category needs a new clause — and
policy denying a *concrete spawn* because of its proposed handoff (§0.2) is the ordinary
`EffectAuthorizer` decision authority.md already owns, not a new evidence rule.
[`../../future-plan.md`](../../future-plan.md) §1.3 still lists parallel-branch Working Notes and branch
handoff/commit as open - F.2b does not decide them. Effect-proposal payload redaction / retention
(§16.5) is later security/privacy engineering under [`../../security-guarantees.md`](../../security-guarantees.md);
no F.2b API is invented for it.
