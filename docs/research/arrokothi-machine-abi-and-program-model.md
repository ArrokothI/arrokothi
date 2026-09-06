# ArrokothI Machine, ABI, and Program Model

> **Status: non-canonical 2.0 research direction.**
>
> This note records a post-1.0 architectural hypothesis. It does **not** change current kernel
> semantics, does not authorize a 1.x implementation rewrite, and does not supersede the canonical
> owners in [`../README.md`](../README.md).
>
> The intended sequencing is deliberate: first make the 1.0 line coherent, usable, testable, and
> practically successful; then use that working system plus benchmark evidence to redesign the core
> conceptual documents for 2.0 as a coordinated whole.
>
> Related current research: [`jit-capability-namespace-and-context-scouts.md`](jit-capability-namespace-and-context-scouts.md).

## 1. Executive hypothesis

ArrokothI 2.0 should investigate presenting an Agent with a **logical machine/environment**, not
merely a flat list of provider tools.

The model-facing experience would borrow the interaction grammar that modern coding models already
understand well:

```text
workspace
files/directories
manual pages
commands
stdout/stderr
exit status
scripts/programs
child processes
system calls
```

However, these are **logical projections over ArrokothI semantics**, not claims that every object is
a physical file or that every command is a host-shell command.

The strongest form of the idea is:

> **An Agent interacts with an ArrokothI machine. A small stable ABI exposes logical inspection,
> local computation, model invocation, and runtime-mediated system calls. Different model-facing
> ACIs may project that same ABI as Bash-like commands, code execution, structured function calls,
> or future interfaces.**

The kernel underneath should retain typed identity, authority, Effects, Events, memory semantics,
waiting, Execution boundaries, and other correctness properties. The shell/code representation is
an Agent-computer interface, not the source of runtime truth.

---

## 2. Why this is a 2.0 target rather than a 1.x rewrite

The current architecture already contains many of the semantic distinctions needed for this model:

```text
memory != context
exposure != authority
Effect proposal != outcome
local computation != runtime-mediated action
Stage != Execution
Workflow != Agent
```

The machine/ABI direction is therefore not obviously opposed to the 1.0 architecture. It may instead
be a new unifying presentation/execution model over concepts that 1.0 is already proving.

That is precisely why implementation should **not** be rushed before 1.0 is mature.

A premature migration would create two risks:

1. changing semantics before the existing model has been validated in real applications; and
2. layering a shell/ABI abstraction on top of every current abstraction, producing more adapters,
   indirection, and duplicated concepts instead of simplification.

The desired 2.0 redesign should be allowed to ask a harder question:

> **Which current layers remain essential semantic boundaries, and which were transitional
> implementation/API structure that can collapse once the machine/ABI model becomes primary?**

Therefore the 1.x rule should be:

```text
make 1.0 good on its own terms
        ↓
collect application + benchmark evidence
        ↓
crystallize the machine/ABI model
        ↓
redesign canonical concepts together for 2.0
        ↓
simplify implementation where the new model makes layers redundant
```

Do not preserve an abstraction merely because 1.x happened to contain it. Equally, do not remove a
load-bearing boundary merely because a shell syntax makes it look simpler.

---

## 3. The Agent-facing ArrokothI machine

A future Agent could begin in a small logical workspace such as:

```text
/
├── task/
├── memory/
├── capabilities/
├── resources/
├── agents/
├── workflows/
├── executions/
├── artifacts/
└── manual/
```

The exact hierarchy is TBD. Its purpose is to provide one familiar environmental mental model while
preserving different semantic types underneath.

Examples:

```text
/memory/structured/...      explicitly asserted application state
/memory/derived/...         inferred/retrieval-oriented knowledge
/memory/notes/...           local scratch material
/capabilities/...           authority-filtered discovery/projection
/resources/...              logical resource handles/materializations
/agents/...                 callable/spawnable Agent definitions or references
/workflows/...              callable/spawnable Workflow definitions or references
/artifacts/...              durable work products/source materials
/manual/...                 progressively disclosed system documentation
```

A path is not automatically storage. A directory is not automatically an OS directory. The machine
may synthesize these views from runtime state, memory providers, catalogs, resources, or context
compilers.

Friendly paths are model UX. Stable typed references remain the semantic identity when correctness
requires them.

---

## 4. Boot environment: small eager context plus progressive manual

The machine should not be maximally JIT.

Every Agent is likely to need a small stable amount of orientation. That information should be
provided eagerly because forcing the model to rediscover the operating environment wastes turns and
increases failure probability.

A candidate boot context:

```text
You are running inside an ArrokothI Execution.

Core logical roots:
  /task
  /memory
  /capabilities
  /resources
  /agents
  /workflows
  /artifacts
  /manual

Core commands:
  arrokothi call ...
  arrokothi memory ...
  arrokothi run ...
  arrokothi spawn ...
  arrokothi llm ...
  arrokothi request-input ...
  arrokothi wait ...

Use `arrokothi help <command>` or read `/manual/...` for less-common details.
An exposed object or command does not by itself grant authority.
Runtime actions may complete, fail, be denied, require confirmation, or have an unknown outcome.
```

This should remain intentionally small.

The manual can then use progressive disclosure similar to Agent Skills:

```text
/manual
├── syscalls/
│   ├── call.md
│   ├── memory-write.md
│   ├── run.md
│   ├── spawn.md
│   ├── request-input.md
│   └── ...
├── concepts/
│   ├── authority.md
│   ├── executions.md
│   ├── waiting.md
│   └── ...
└── capabilities/
    └── ...
```

Common/inevitable semantics belong in boot context. Rare operations should expose only a compact
name/description/path until the Agent chooses to inspect their full documentation.

The general target is:

```text
eager:
  stable machine orientation
  recovery-critical operations
  task-critical material
  small common syscall set

JIT:
  rare syscall manuals
  large capability schemas
  deep memory/resource content
  uncommon integrations
  large artifacts
```

This extends the existing JIT namespace research rather than replacing it.

---

## 5. ArrokothI commands as logical system calls

The model-facing syntax should favor ordinary verbs rather than forcing kernel-internal terminology
into every interaction.

Candidate commands:

```bash
arrokothi call <operation> ...
arrokothi memory read ...
arrokothi memory write ...
arrokothi run agent <ref> ...
arrokothi run workflow <ref> ...
arrokothi spawn agent <ref> ...
arrokothi spawn workflow <ref> ...
arrokothi llm <logical-model> ...
arrokothi request-input ...
arrokothi wait ...
arrokothi cancel ...
```

The command is not the semantic truth. It resolves to a typed operation.

For example:

```text
arrokothi call mail.send
        ↓ parse/resolve
portable operation binding
        ↓
typed UseCapability proposal
        ↓
Harness authorization/coordination
        ↓
executor/environment
        ↓
typed Event/outcome
        ↓
model-facing stdout/stderr/structured result
```

Likewise, a future memory-write command would resolve to the relevant typed memory operation rather
than mutating an arbitrary virtual file directly.

This preserves the useful current property that **the model requests; the Harness decides what may
actually happen**.

---

## 6. Kernel-like failures without making Unix codes semantic truth

The logical machine should report failures in a form coding models naturally understand:

```console
$ arrokothi call mail.send --json @message.json
arrokothi: mail.send: permission denied
code: authority_denied
exit status 77
```

```console
$ arrokothi spawn agent researcher --input @question.json
arrokothi: spawn: structural budget exhausted
code: execution_budget_exceeded
exit status 75
```

```console
$ arrokothi call payment.charge --json @charge.json
arrokothi: payment.charge: outcome unknown
reconciliation-required: true
exit status 76
```

The presentation layer may use stdout/stderr and conventional-looking exit statuses, but the typed
ArrokothI outcome remains canonical internally.

Scripts should also have a machine-readable result mode so they never need to scrape prose:

```bash
arrokothi call ... --json-output
```

The exact CLI is research work. The invariant is that model-friendly error presentation must not
erase distinctions such as denied vs failed vs declined vs unknown outcome.

---

## 7. Model-authored programs for dependent/sequential work

The major opportunity is not merely renaming function calls into commands. It is allowing one model
invocation to produce a **program** that can perform local computation and suspend/resume around
runtime-mediated operations without requiring another planning-model inference after every step.

Example source syntax:

```bash
customer=$(arrokothi call crm.customer.get --json '{"id":"cust_17"}')
tier=$(echo "$customer" | jq -r '.tier')

if [ "$tier" = "enterprise" ]; then
  draft=$(arrokothi llm writer --input "$customer")
  arrokothi call mail.send --json "$draft"
fi
```

Conceptual execution:

```text
model emits program once
        ↓
local parse / variable handling
        ↓
`arrokothi call`
        ↓
Effect proposal
        ↓
program continuation suspends
        ↓
Event/outcome settles
        ↓
resume program
        ↓
local jq/branch computation
        ↓
`arrokothi llm`
        ↓
controller-local model work may suspend/resume
        ↓
resume program
        ↓
next Effect
```

The critical property is:

> **A dependent sequence may cross multiple runtime waits without requiring a fresh planning LLM
> turn unless semantic reasoning is genuinely needed.**

This could improve token cost, latency, and behavioral consistency for coding-capable models while
keeping the current Effect/Harness boundary intact.

---

## 8. Bash-like source is an ACI, not necessarily the program semantics

Do not commit 2.0 to implementing all of POSIX Bash.

Full shell semantics contain large amounts of complexity that may not improve Agent effectiveness:

```text
eval/source edge cases
file-descriptor manipulation
job control
signal semantics
process substitution
environment inheritance
quoting/globbing corner cases
shell injection hazards
```

A future ArrokothI shell could accept a familiar, deliberately bounded subset:

```text
variables
command substitution
if/case
loops
functions
pipes
&& / ||
JSON transforms
simple file-like workspace operations
```

The more durable abstraction should likely be a typed **ArrokothI Program IR**.

```text
Bash-like source ─┐
Python/code ACI ──┼─> ArrokothI Program IR ─> kernel/runtime
function calls ───┤
Studio graph ─────┤
TypeScript SDK ───┘
```

This makes the model-facing interface replaceable and benchmarkable without creating parallel kernel
semantics for every frontend.

---

## 9. Candidate Program IR / ABI categories

The minimal ABI should be designed before the shell syntax is frozen.

A candidate decomposition:

```text
INFORMATION / INSPECTION
  inspect path/ref
  search namespace
  read resource/materialization
  read authorized memory view
  inspect manual/descriptor

LOCAL COMPUTATION
  values/variables
  transform
  branch
  loop
  function/local subprogram

LOCAL MODEL WORK
  invoke logical model
  preserve continuation
  suspend/resume without creating an Effect

RUNTIME-MEDIATED SYSTEM CALLS
  use capability
  write memory
  call/spawn child Execution
  peer send/ask
  request user input

CONTROL / STRUCTURED CONCURRENCY
  wait
  fork
  join
  cancel
  complete
  fail
```

This list is intentionally provisional. Some concepts may remain kernel-internal rather than becoming
public ABI instructions, and some current APIs may collapse into a smaller set of primitives.

The important design goal is to identify the **smallest semantic machine** that can faithfully
express Agents, Workflows, and application composition without forcing every current implementation
layer to survive as a separate abstraction.

---

## 10. Agent and Workflow as two control modes over one machine

The current conceptual distinction remains valuable:

```text
Workflow
  system/application-defined semantic topology

Agent
  model-directed open-ended semantic progression
```

The machine model suggests they may share more execution machinery than their authoring surfaces
currently imply.

### Agent

An Agent may dynamically choose or generate a temporary Program:

```text
model
  ↓
creates/extends program
  ↓
program runs on ArrokothI machine
```

The model owns the open-ended continuation space.

### Workflow

A Workflow may be an application-authored durable Program/topology:

```text
application-defined Program IR
  ↓
runs on same ArrokothI machine
```

It may contain local functions, model calls, Effects, child Agents, child Workflows, loops, branches,
and structured parallelism while remaining a Workflow because the application owns the allowed
control topology.

This suggests a potentially strong 2.0 simplification:

> **Agent and Workflow need not be separate computational universes. They may be distinct control
> ownership models over one machine/ABI/program execution substrate.**

This is a hypothesis to validate, not a current semantic change.

---

## 11. Workflow should not be reduced to a `.sh` file

Literal shell is a useful model, but Workflow semantics can be richer than ordinary shell process
control.

Current Workflow concepts include structured parallelism, Stage completion barriers, child
Execution calls, controlled branches/loops, and explicit handling of shared-state races. Those
properties should not be discarded merely to imitate:

```bash
foo &
bar &
wait
```

A Program IR may instead contain first-class structures such as:

```text
Sequence
Local
Syscall
ModelCall
Branch
Loop
Fork
Join
ChildCall
ChildSpawn
Complete
```

A shell frontend can map familiar syntax onto these structures where appropriate. A Studio graph can
map directly onto them. A typed SDK can construct them programmatically.

The deeper goal is one semantic program substrate with multiple authoring projections.

---

## 12. `arrokothi llm` is not necessarily an Effect

A model-facing machine may intentionally make different semantic categories look similarly easy to
invoke:

```bash
summary=$(arrokothi llm summarizer --input @document)
result=$(arrokothi call search.query --json @query.json)
```

But their kernel meanings should remain distinct.

Current ArrokothI treats model inference as controller-local computation: it can suspend and resume
without becoming a runtime-mediated Effect or a new Execution. By contrast, a capability call that
crosses the runtime/environment boundary goes through the Effect/Harness path.

A 2.0 ABI can preserve that distinction while exposing both through a consistent machine interface:

```text
arrokothi llm
  -> local model instruction
  -> controller-local suspension/resumption

arrokothi call
  -> typed runtime-mediated syscall
  -> Effect/Harness/Event
```

The user-facing convenience layer should unify ergonomics, not erase semantics.

---

## 13. Authority remains dynamic during program execution

A generated script/program must never become a bearer capability for every operation it contains.

Example:

```bash
x=$(arrokothi call a ...)
arrokothi call b ...
```

The Agent may have had authority for both operations when the program was generated. Authority may
change while `a` is outstanding. When execution reaches `b`, the concrete request must still be
checked under the then-current authority according to the accepted authority model.

Therefore:

```text
program was generated/exposed
        !=
all future syscalls pre-authorized
```

The Program IR may preserve immutable bindings needed to interpret delayed model/program output, but
final runtime-mediated actions must retain the appropriate current authorization/confirmation rules.

This property is central to using programs for efficiency without weakening the kernel security model.

---

## 14. Real terminal access remains separate

Some Agents genuinely need an OS/process environment for tasks such as:

```bash
npm test
git diff
python script.py
compiler/build tools
repository editing
```

That should remain a distinct capability from the logical ArrokothI machine.

A coding Agent may eventually see both:

```bash
npm test                 # real sandbox/host process capability
arrokothi call ...       # logical ArrokothI syscall
```

The machine model must not accidentally turn virtual paths into host filesystem authority or expose
ambient credentials to arbitrary code. Real process/filesystem/network containment remains a separate
security/deployment problem.

---

## 15. Simplification criterion: avoid abstraction-on-abstraction migration

The 2.0 redesign should explicitly resist this failure mode:

```text
1.x abstraction
  ↓ adapter
new machine abstraction
  ↓ adapter
Program IR abstraction
  ↓ adapter
provider abstraction
  ↓ adapter
runtime abstraction
```

A successful redesign should instead ask where the machine/ABI model lets us **delete or merge**
intermediate layers.

For each current core concept/API during the eventual 2.0 document rewrite, classify it as one of:

```text
1. load-bearing semantic invariant
   preserve explicitly

2. public semantic concept that maps directly to ABI/IR
   retain, possibly rename/reframe

3. implementation mechanism
   keep only if it remains useful

4. transitional/duplicative abstraction
   collapse or delete

5. model-facing/provider-facing projection
   move outward from kernel truth where possible
```

The goal is not fewer types at any cost. The goal is **fewer independent abstractions than necessary
to express the actual semantic boundaries**.

A typed boundary that prevents authority bypass or stale resumption bugs is valuable. An adapter that
exists only because two historical APIs evolved separately may not be.

---

## 16. 1.x implementation guidance implied by this research

This note should exert very little direct pressure on 1.x code.

### Do now

- finish and harden the 1.0 semantics;
- make application building pleasant and well-documented;
- collect evidence about Agent effectiveness, Workflow ergonomics, context cost, and provider ACIs;
- preserve clean typed seams where they already represent real semantic distinctions;
- avoid introducing unnecessary permanent abstraction layers when a simpler 1.x implementation works;
- keep the JIT namespace work experimental and compatible with existing authority/context boundaries.

### Do not do merely because of this note

- rewrite current Agents/Workflows around a shell;
- rename canonical Effects into CLI vocabulary;
- add a Program IR before requirements are validated;
- turn logical memory/resources into a real filesystem;
- make scripts a new authority mechanism;
- preserve every current API through adapters solely for hypothetical 2.0 compatibility;
- modify `mental-model.md`, `memory.md`, `authority.md`, `composition.md`, or other canonical owners to
  describe this research direction as current truth.

### Exception

If a 1.x change is independently justified and also makes 2.0 easier—for example by removing a
clearly redundant layer or strengthening a typed boundary—it may still be worth doing. The reason
must stand on 1.x merits rather than speculative 2.0 architecture.

---

## 17. 2.0 crystallization gate

After 1.0 is stable and genuinely usable, the project should revisit this direction as a coordinated
architecture exercise rather than incremental edits to individual documents.

Questions to resolve before canonical promotion:

1. What is the minimal ArrokothI machine ABI?
2. Which operations are local instructions versus runtime-mediated syscalls?
3. What is the Program IR, if any, and what must be persistable/resumable?
4. How do Programs interact with Activation, PendingOperation, Event, and controller resumption?
5. Can Agent and Workflow share one execution substrate without weakening their control-ownership
   distinction?
6. Which current Stage concepts remain first-class and which become Program IR structure?
7. How should structured parallelism/fork/join map into the machine model?
8. Which logical directories are stable concepts versus replaceable context projections?
9. What belongs eagerly in boot context versus in `/manual` or JIT discovery?
10. How should paths, aliases, and friendly command names resolve to stable typed identities?
11. Which 1.x abstractions can be removed rather than wrapped?
12. Which ACI performs best for each model family: shell, code execution, structured tools, or hybrid?
13. How much turn/token reduction do model-authored programs provide on dependent operations?
14. What security properties change when model-authored code can suspend across Effects?
15. How should debugging, tracing, replay, and error presentation work at the Program/syscall level?

Once these are answered with implementation experience and benchmarks, the canonical documents
should be redesigned **together** so `mental-model.md`, runtime, composition, authority, memory,
interoperability, and security all describe one coherent 2.0 machine rather than accumulating local
patches.

---

## 18. Prototype/evaluation sequence after 1.0

A possible evidence sequence:

### P1 — shell-shaped projection over existing Agent operations

No semantic change. Compare current structured model tools against command-style aliases and
logical workspace navigation.

Measure:

```text
task success
model turns
operation-selection errors
context tokens
recovery behavior
provider/model differences
```

### P2 — bounded logical shell with local computation

Allow a model to emit a small script containing local variables/transforms/branching plus existing
typed runtime operations.

### P3 — suspendable Program prototype

Persist/resume one dependent program across Effect completion without a new planning-model turn.
Validate authority changes, cancellation, unknown outcomes, and replay/resumption integrity.

### P4 — common Program IR for Workflow and Agent-authored programs

Try expressing existing representative Workflows and dynamic Agent programs through one internal
substrate. Measure whether this actually simplifies implementation or merely adds another layer.

### P5 — alternate ACI projections

Benchmark Bash-like, Python/code, structured tool, and hybrid frontends over the same ABI/IR.
Do not assume coding-model shell priors make one interface universally optimal.

### P6 — Studio projection

Use the same Program IR to drive a visual Workflow/program representation. This is a useful test of
whether the IR captures genuine semantics rather than Bash syntax accidents.

---

## 19. Working target for ArrokothI 2.0

The current working target can be summarized as:

> **ArrokothI 2.0 presents Agents with a small logical computer: a bounded workspace, progressively
> disclosed manuals/resources/capabilities, and a stable set of ArrokothI system calls. Coding-capable
> models may author programs that perform local computation and suspend/resume across typed kernel
> operations. Workflows and Agents should, where the evidence supports it, share one Program/ABI
> substrate while remaining distinct in who owns semantic progression. The redesign should simplify
> the implementation by collapsing redundant 1.x layers rather than preserving them through endless
> adapters.**

This is intentionally a research target, not canonical architecture. The project should earn the
right to crystallize it by first shipping a coherent 1.0 and then redesigning the core documents as a
single 2.0 system.
