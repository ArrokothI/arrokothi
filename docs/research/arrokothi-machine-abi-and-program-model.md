# ArrokothI Machine, ABI, and Program Model

> **Current disposition (2026-09-08):** see [future questions](../future-plan.md) Q8 and the [mental-model reference index](../../mental-model/reference.md). The sketches and captured protocol/provider observations below remain research. Old Harness/resumption/memory ownership and prototype sequences do not override the opaque Runtime target or schedule work.

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
> Current canonical security ownership remains in [Deployment](../../mental-model/deployment.md).

## 1. Executive hypothesis

ArrokothI 2.0 should investigate presenting an Agent with a **logical machine/environment**, not
merely a flat list of provider tools.

The word "machine" is intentionally broader than "coding environment". The target includes:

```text
customer-service Agents
website/application Agents
educational/tutoring Agents
shopping Agents
research Agents
enterprise assistants
game/NPC Agents
coding/data/scientific Agents
```

A customer-service Agent should not need Linux, Docker, a real filesystem, or arbitrary code
execution merely because the model-facing interface resembles a terminal.

The model-facing experience may borrow an interaction grammar that modern models understand well:

```text
workspace / namespace
files/directories as logical views
manual pages
commands
stdout/stderr-like observations
exit-status-like outcomes
scripts/programs
child executions
system calls
```

These are **logical projections over ArrokothI semantics**, not claims that every object is a physical
file or every command is a host-shell command.

The strongest form of the idea is:

> **An Agent inhabits an ArrokothI logical machine. A small stable ABI exposes logical inspection,
> local computation, model invocation, and runtime-mediated system calls. Different model-facing
> ACIs may project that same ABI as shell-like commands, code execution, structured function calls,
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
Execution != process != sandbox
```

The machine/ABI direction is therefore not obviously opposed to the 1.0 architecture. It may instead
be a new unifying presentation/execution model over concepts that 1.0 is already proving.

That is precisely why implementation should **not** be rushed before 1.0 is mature.

A premature migration would create two risks:

1. changing semantics before the existing model has been validated in real applications; and
2. layering a machine/ABI abstraction on top of every current abstraction, producing more adapters,
   indirection, and duplicated concepts instead of simplification.

The desired 2.0 redesign should be allowed to ask:

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
load-bearing boundary merely because a shell-like syntax makes it look simpler.

---

## 3. The Agent-facing logical machine

A future Agent could begin in a logical namespace such as:

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
may synthesize these views from runtime state, memory providers, catalogs, application resources, or
context compilers.

Friendly paths are model UX. Stable typed references remain the semantic identity when correctness
requires them.

### 3.1 The namespace is application-shaped

The logical machine should be able to look very different for different products while preserving the
same ABI and kernel semantics.

Customer-support example:

```text
/
├── task/
├── customer/
│   ├── profile
│   ├── orders
│   └── conversation
├── knowledge/
├── capabilities/
├── memory/
└── manual/
```

Educational Agent example:

```text
/
├── student/
│   ├── progress
│   ├── misconceptions
│   └── preferences
├── curriculum/
├── exercises/
├── memory/
└── manual/
```

Coding Agent example:

```text
/
├── task/
├── workspace/        optional real/sandboxed repository projection
├── capabilities/
├── memory/
├── artifacts/
└── manual/
```

The coding Agent is one deployment of the machine, not the definition of the machine.

---

## 4. Mounts: one machine, different worlds

A useful research abstraction is that an application **mounts logical views and powers** into an
Execution's machine.

Conceptually:

```text
ArrokothI Machine
      │
      ├── mount task view
      ├── mount memory view
      ├── mount resource
      ├── mount capability namespace
      ├── mount Agent/Workflow definitions
      ├── mount artifact store
      └── optionally mount real/sandboxed compute/workspace
```

"Mount" here is a conceptual term, not a commitment to POSIX mounts.

A lightweight web application might effectively configure:

```text
/customer       -> application customer resource
/orders         -> application order resource
/knowledge      -> help-center resource
/capabilities   -> lookup-order, request-refund, escalate
```

No separate agent server, VM, container, or filesystem should be required by the machine abstraction
itself.

A coding/data application could additionally mount:

```text
/workspace      -> sandboxed filesystem
/process        -> bounded command execution
/network        -> explicitly mediated or policy-controlled access
```

The same logical machine model should scale from an embedded full-stack web application to an
isolated coding environment without forcing the lighter case to pay for the heavier one.

---

## 5. Boot environment: small eager context plus progressive manual

The machine should not be maximally JIT.

Every Agent is likely to need a small stable amount of orientation. That information should be
provided eagerly because forcing the model to rediscover its operating environment wastes turns and
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

## 6. ArrokothI commands as logical system calls

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
typed runtime request
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

## 7. Kernel-like failures without making Unix codes semantic truth

The logical machine may report failures in a form models naturally understand:

```console
$ arrokothi call mail.send --json @message.json
arrokothi: mail.send: permission denied
code: authority_denied
exit status 77
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

The invariant is that model-friendly presentation must not erase distinctions such as denied vs
failed vs declined vs unknown outcome.

---

## 8. Model-authored logical programs for dependent work

The major opportunity is not merely renaming function calls into commands. It is allowing one model
invocation to produce a **logical program** that can perform bounded local computation and
suspend/resume around runtime-mediated operations without requiring another planning-model inference
after every step.

Customer-support example:

```bash
order=$(arrokothi call order.get --id "$order_id")

if eligible_for_return "$order"; then
  arrokothi call return.open --order "$order_id"
else
  arrokothi call support.escalate --order "$order_id"
fi
```

Educational example:

```bash
progress=$(arrokothi read /student/progress)
exercise=$(arrokothi call curriculum.next-exercise --topic algebra)
answer=$(arrokothi request-input "$exercise")
grade=$(arrokothi llm grader --input "$answer")
arrokothi memory write student.progress --json "$grade"
```

Neither example requires a real terminal.

Conceptual execution:

```text
model emits program once
        ↓
local parse / variables / branch
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
local computation
        ↓
next syscall/model call
```

The critical property is:

> **A dependent sequence may cross multiple runtime waits without requiring a fresh planning LLM
> turn unless semantic reasoning is genuinely needed.**

---

## 9. Shell-like source is an ACI, not the program semantics

Do not commit 2.0 to implementing POSIX Bash.

A future ArrokothI logical shell could accept a familiar, deliberately bounded subset:

```text
values/variables
command substitution
if/case
loops
functions
pipes or structured composition
&& / ||
JSON transforms
logical namespace reads
```

But the durable abstraction should likely be a typed **ArrokothI Program IR**.

```text
shell-like source ─┐
Python/code ACI ───┼─> ArrokothI Program IR ─> kernel/runtime
function calls ────┤
Studio graph ──────┤
TypeScript SDK ────┘
```

The logical shell should therefore avoid unnecessary OS semantics such as job-control edge cases,
file-descriptor tricks, ambient environment inheritance, arbitrary host process spawning, or other
features that do not improve Agent effectiveness.

---

## 10. Candidate Program IR / ABI categories

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
  local subprogram

LOCAL MODEL WORK
  invoke logical model
  preserve continuation
  suspend/resume without creating an Effect

RUNTIME-MEDIATED SYSTEM CALLS
  use capability
  write governed memory/state
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

Some concepts may remain kernel-internal rather than becoming public ABI instructions, and some
current APIs may collapse into a smaller set of primitives.

The design goal is the **smallest semantic machine** that can faithfully express Agents, Workflows,
and application composition without forcing every current implementation layer to survive as a
separate abstraction.

---

## 11. Agent and Workflow as two control modes over one machine

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

Working hypothesis:

> **Agent and Workflow need not be separate computational universes. They may be distinct control
> ownership models over one machine/ABI/program execution substrate.**

This is a hypothesis to validate, not a current semantic change.

---

## 12. Workflow should not be reduced to a `.sh` file

Literal shell is a useful model, but Workflow semantics can be richer than ordinary shell process
control.

A Program IR may contain first-class structures such as:

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

## 13. `arrokothi llm` is not necessarily an Effect

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

A 2.0 ABI can preserve that distinction while exposing both through a consistent machine interface.

---

## 14. Authority remains dynamic during program execution

A generated program must never become a bearer capability for every operation it contains.

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

Programs improve orchestration efficiency; they do not replace runtime authorization.

---

## 15. Security research: separate machine capability from containment

The current canonical security model already distinguishes semantic enforcement from physical
containment and defines deployment profiles such as trusted-local/embedded, hosted declarative, and
isolated hosted/hostile-code. Those definitions remain current truth.

For 2.0 research, the logical-machine model suggests a useful refinement: **do not express security
as one linear level.** Two different questions should be modeled separately:

```text
A. What computational/environmental powers are mounted into this machine?

B. How much do we trust the executable logic and hosting environment, and therefore what physical
   containment is required?
```

A customer Agent may be very consequential but need almost no ambient computation. A coding Agent
may need broad local computation but run under strong isolation. A trusted embedded application may
need no sandbox even though it uses the same logical ABI.

### 15.1 Machine capability profiles

These profiles describe **what kind of computation/environment the Agent can use**, not how much the
Agent is trusted.

#### M0 — Logical operations only

```text
logical namespace reads
model calls
explicit ArrokothI syscalls
no model-authored general program
no native filesystem/process/network access
```

Typical uses:

```text
simple website assistants
bounded customer-service Agents
basic tutoring/chat applications
```

This can remain extremely lightweight and embed directly in an ordinary application process.

#### M1 — Logical program

Adds a bounded ArrokothI program language/IR:

```text
variables
branching
loops
local transformations
structured concurrency
ArrokothI syscalls
```

Still no requirement for:

```text
host shell
native subprocesses
real filesystem
ambient network
arbitrary package installation
```

This may cover a large fraction of business, education, research-orchestration, support, shopping,
and application Agents.

#### M2 — Sandboxed general computation

Adds a general-purpose execution surface such as:

```text
JavaScript / Python / WASM / another bounded runtime
```

General code interacts with privileged application/world state through the same ArrokothI ABI rather
than receiving ambient credentials.

This profile requires stronger resource limits and isolation assumptions than M0/M1 when code is
untrusted.

#### M3 — Real workspace/process environment

Adds explicitly mounted machine powers such as:

```text
real/sandboxed filesystem
process execution
compiler/build tools
git
controlled network
```

Typical uses include coding, data, scientific, browser-automation, or operations Agents.

M3 should be optional. ArrokothI should not become operationally heavy merely because this profile
exists.

### 15.2 Trust/containment profiles

These describe **who controls executable logic and what physical containment is needed**.

#### T0 — Trusted embedded

```text
developer-owned application process
trusted controllers/program runtime
ArrokothI semantic enforcement
```

This aligns with the current trusted-local/embedded SDK direction. It should stay lightweight.

ArrokothI does not claim to contain the owner of the host process from bypassing itself.

#### T1 — Hosted declarative

Users may provide untrusted prompts, definitions, topology, inputs, and selections, while executable
controller/runtime implementation remains trusted platform code.

This aligns with the current hosted declarative profile and is especially attractive for M0/M1
machines because the platform can offer rich Agent behavior without executing arbitrary user code.

#### T2 — Isolated untrusted-code

Model/user/plugin-authored general executable code may be hostile.

Containment may require, according to threat model:

```text
sandbox/isolate/container/microVM
filesystem isolation
network/egress restrictions
secret isolation
CPU/memory/time/process/output limits
cross-tenant isolation
controlled syscall/Effect bridge
```

This aligns with the current isolated hosted/hostile-code profile.

### 15.3 Profiles compose as a matrix

Examples:

```text
customer-service Agent in a Next.js app
  M1 Logical Program + T0 Trusted Embedded

hosted education platform
  M1 Logical Program + T1 Hosted Declarative

hosted workflow product with model-authored JS
  M2 Sandboxed General Compute + T2 Isolated Untrusted-Code

coding Agent service
  M3 Real Workspace/Process + T2 Isolated Untrusted-Code
```

This is preferable to a single `security_level = 0..4` because capability and containment are
orthogonal.

### 15.4 Security should follow mounted powers

The logical namespace itself is not a reason to require an OS sandbox.

```text
logical path
  -> typed application/resource view
  -> no ambient host path implied
```

Likewise:

```text
arrokothi call refund.request
  -> typed runtime request
  -> authority/Harness path
  -> no direct database credential implied
```

Stronger physical containment becomes necessary as the machine gains ambient executable powers that
could bypass the Harness, especially M2/M3 with untrusted code.

The target property is:

> **Security cost should scale with actual mounted powers and threat model, not with the fact that
> the Agent-facing ACI looks terminal-like.**

### 15.5 Logical programs may be a security advantage

A bounded M1 logical program runtime may offer a useful middle ground:

```text
much lower LLM-turn cost than one-operation-per-turn
+ useful branching/looping/transforms
+ no arbitrary host execution
+ every privileged action still crosses the ArrokothI syscall boundary
```

For many non-coding Agents this could provide most of the efficiency benefit of CodeAct/shell-style
orchestration without inheriting the security and deployment burden of a real shell.

This should be benchmarked rather than assumed.

---

## 16. Real terminal access remains separate and optional

Some Agents genuinely need an OS/process environment for tasks such as:

```bash
npm test
git diff
python script.py
compiler/build tools
repository editing
```

That should remain a distinct mounted capability from the logical ArrokothI machine.

A coding Agent may eventually see both:

```bash
npm test                 # real sandbox/process capability
arrokothi call ...       # logical ArrokothI syscall
```

A customer, education, shopping, or website Agent may see only the second category and never receive
real process access at all.

The machine model must not accidentally turn virtual paths into host filesystem authority or expose
ambient credentials to arbitrary code.

---

## 17. Simplification criterion: avoid abstraction-on-abstraction migration

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

---

## 18. 1.x implementation guidance implied by this research

This note should exert very little direct pressure on 1.x code.

### Do now

- finish and harden the 1.0 semantics;
- keep the embedded/trusted profile lightweight;
- make application building pleasant and well-documented;
- collect evidence about Agent effectiveness, Workflow ergonomics, context cost, and provider ACIs;
- preserve clean typed seams where they already represent real semantic distinctions;
- avoid unnecessary permanent abstraction layers when a simpler 1.x implementation works;
- preserve the distinction between semantic security and physical containment;
- keep the JIT namespace work experimental and compatible with existing authority/context boundaries.

### Do not do merely because of this note

- rewrite current Agents/Workflows around a shell;
- require containers/sandboxes for ordinary embedded Agents;
- rename canonical Effects into CLI vocabulary;
- add a Program IR before requirements are validated;
- turn logical memory/resources into a real filesystem;
- make scripts a new authority mechanism;
- preserve every current API through adapters solely for hypothetical 2.0 compatibility;
- modify canonical `mental-model.md`, `memory.md`, `authority.md`, `composition.md`, or
  `security-guarantees.md` to describe this research direction as current truth.

If a 1.x change is independently justified and also makes 2.0 easier, it may still be worth doing.
The reason must stand on 1.x merits rather than speculative 2.0 architecture.

---

## 19. 2.0 crystallization gate

After 1.0 is stable and genuinely usable, revisit this direction as a coordinated architecture
exercise rather than incremental edits to individual documents.

Questions to resolve before canonical promotion:

1. What is the minimal ArrokothI machine ABI?
2. Which operations are local instructions versus runtime-mediated syscalls?
3. What is the Program IR, if any, and what must be persistable/resumable?
4. How do Programs interact with Activation, PendingOperation, Event, and controller resumption?
5. Can Agent and Workflow share one execution substrate without weakening their control-ownership
   distinction?
6. Which current Stage concepts remain first-class and which become Program IR structure?
7. How should structured parallelism/fork/join map into the machine model?
8. Which logical directories are stable concepts versus replaceable application/context projections?
9. What belongs eagerly in boot context versus `/manual` or JIT discovery?
10. How should logical mounts, paths, aliases, and friendly names resolve to stable typed identities?
11. Which 1.x abstractions can be removed rather than wrapped?
12. Which ACI performs best for each model family: shell-like, code execution, structured tools, or
    hybrid?
13. How much turn/token reduction do model-authored programs provide on dependent operations?
14. Which workloads can remain M0/M1 and avoid general code entirely?
15. What additional containment does each mounted capability actually require?
16. Should the M/T profile matrix become canonical, and if so how does it map onto the current
    deployment profiles?
17. How should debugging, tracing, replay, and error presentation work at the Program/syscall level?

Once these are answered with implementation experience and benchmarks, the canonical documents
should be redesigned **together** so mental model, runtime, composition, authority, memory,
interoperability, and security all describe one coherent 2.0 machine rather than accumulating local
patches.

---

## 20. Prototype/evaluation sequence after 1.0

### P1 — logical command projection over existing Agent operations

No semantic change. Compare current structured model tools against command-style aliases and logical
workspace navigation.

Include non-coding workloads, not only repository tasks:

```text
customer support
education/tutoring
shopping/website assistant
research orchestration
```

Measure task success, model turns, operation-selection errors, context tokens, recovery behavior, and
provider/model differences.

### P2 — bounded M1 logical program

Allow a model to emit a small logical program containing local values/transforms/branching plus
existing typed runtime operations. No real shell or native filesystem is required.

### P3 — suspendable Program prototype

Persist/resume one dependent program across Effect completion without a new planning-model turn.
Validate authority changes, cancellation, unknown outcomes, and replay/resumption integrity.

### P4 — common Program IR for Workflow and Agent-authored programs

Try expressing representative Workflows and dynamic Agent programs through one internal substrate.
Measure whether this actually simplifies implementation or merely adds another layer.

### P5 — security/capability matrix

Run equivalent tasks under M0/M1/M2/M3 where applicable. Measure whether M1 provides most of the
Agent-effectiveness benefit without the cost/attack surface of general code.

Separately validate T0/T1/T2 containment claims; do not infer security from model behavior alone.

### P6 — alternate ACI projections

Benchmark shell-like, Python/code, structured tool, and hybrid frontends over the same ABI/IR. Do not
assume coding-model shell priors make one interface universally optimal.

### P7 — Studio projection

Use the same Program IR to drive a visual Workflow/program representation. This tests whether the IR
captures genuine semantics rather than shell syntax accidents.

---

## 21. Working target for ArrokothI 2.0

The current working target can be summarized as:

> **ArrokothI 2.0 presents Agents with a small logical computer, not necessarily a coding computer: a
> bounded application-shaped namespace, progressively disclosed manuals/resources/capabilities, and
> a stable set of ArrokothI system calls. Models may author bounded logical programs that perform
> local computation and suspend/resume across typed kernel operations. Workflows and Agents should,
> where evidence supports it, share one Program/ABI substrate while remaining distinct in who owns
> semantic progression. Real filesystem/process/code access is optional and mounted only when the
> application needs it. Security and deployment cost should scale with actual mounted powers and
> threat model. The 2.0 redesign should simplify the implementation by collapsing redundant 1.x
> layers rather than preserving them through endless adapters.**

This is intentionally a research target, not canonical architecture. The project should earn the
right to crystallize it by first shipping a coherent 1.0 and then redesigning the core documents as a
single 2.0 system.
