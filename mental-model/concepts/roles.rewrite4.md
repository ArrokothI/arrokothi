# Runtime roles and context vocabulary

The Kernel sees exactly one thing on the Runtime's side of the boundary: an [Execution](core.md#execution). Everything on this page lives behind that, in the code that actually writes the report. It covers the shapes a Runtime can take, the machinery it uses to put a question in front of a model and read the answer back, and the packages and services it reaches through. None of it is a Kernel type, and nothing here has to be built. A Runtime that already has its own equivalents keeps them, and a third-party framework stays whole rather than being recompiled into ArrokothI shapes.

So why does the vocabulary exist at all, if the Kernel cannot see any of it? Because three confusions on this side of the boundary are expensive, and each one has a name here to stop it. The first is promoting an internal piece of a Runtime — a step in a graph, a parallel branch, a helper process — into something the Kernel coordinates, which costs a lifetime, an authority and a mailbox to gain nothing. The second is reading visibility as permission: a model that can see an operation has not been allowed to use it. The third is assuming a name still means what it meant when a model chose it, which is how a late reply ends up performing an operation nobody authorized.

The terms fall into three groups, and they answer three unrelated questions about one Runtime:

- **How the Runtime is shaped** — [Agent](#agent), [Workflow](#workflow), [Stage and local branch](#stage-and-local-branch), [local worker](#local-worker). Who decides what happens next, and what the pieces inside are called.
- **What the Runtime shows a model, and how it reads the reply** — [Context](#context), [projection and invocation binding](#projection-and-invocation-binding), [invocation snapshot and cache](#invocation-snapshot-and-cache). Two selections feeding one request, and the record that keeps a late answer pointing at the question that was asked.
- **What the Runtime is allowed to see, and what it can be handed** — [view and disclosure](#view-and-disclosure), [Skill and package](#skill-and-package), [service and interaction template](#service-and-interaction-template). Permission, packaging, and the three ways to reach something the Runtime does not implement.

The groups do not build on one another, so they can be read in any order.

One rule applies to every term below: **a Runtime-internal structure has no Kernel [mailbox](core.md#mailbox), no [authority](actions.md#principal-and-authority) binding and no [lifecycle](../mechanisms/lifecycle.md) of its own.** A stage, a branch, a worker, a Skill and a service are invisible to the Kernel in exactly the same way. It is worth stating that once rather than under every definition. The sections most likely to tempt a reader into forgetting it say so again at the point of temptation.

## A first example

The application from [the core vocabulary](core.md) has now built its weekly-report Runtime twice, because the team wanted to compare the two shapes. One build is an Agent: a model loop that decides each step — look up last quarter's figures, draft, ask the editor — and picks the next step from what came back. The other is a Workflow with three stages: **gather**, **draft** and **review**. Both builds are one Execution each. The Kernel's record does not say which is which, because nothing in the protocol asks.

Take the Workflow, since it has more parts to name. Its gather stage runs two analyses at once as local branches — one over the finance extract, one over the headcount feed — and joins them in a declared order before the stage may finish. The finance analysis does not run in this process at all: it delegates to a retriever running elsewhere, which is still a local worker, because the Runtime owns it and the Kernel has never heard of it.

The draft stage builds one model request. It selects last quarter's figures, the editor's earlier correction and two working notes into the request — that selection is the **context**. It renders two operations under friendlier names, so the model sees "Publish this week's report" rather than `publish_report`, and it adds one **local control** for saving a note, which shares the provider's tool syntax with the operations but is not one of them. The set of names shown, and which real operation or control each one meant, is the **invocation binding** for this request.

The model's answer takes nine minutes. In the meantime a teammate renames one of those aliases to point at a newer revision of the operation. The reply is still read through the binding the request was built with, so it still means the operation that was authorized, validated and — if it needed one — approved. What the catalog says now is a fact about the catalog.

Two more pieces sit outside the Runtime's own code. The production deployment authorizes a **view** of the finance dataset with the salary column removed, and what actually travels to the provider — the figures, the column names, the note text — is the **disclosure**. And the team ships its report procedure as a **Skill** whose manifest asks for `publish_report` and a workspace; the deployment answers that request, because the manifest is a request. Publication itself goes to a **service** the application owns, which hands back an **async handle** that later correlates the provider's result with this Execution.

## Agent

An **Agent** is a Runtime whose control flow a model or policy directs: at each step the model chooses what happens next, and the Runtime carries the choice out.

The shape exists because some work cannot be drawn in advance. The report may need three sources or thirty, and which ones matters depends on what the first source said. A control flow fixed ahead of time has to anticipate those cases; an Agent trades that anticipation for a loop that can decide them as they arrive. The trade is real in both directions: what the loop gains in adaptability it pays for in inspectability, because nobody can read the graph beforehand, and two runs over the same input may take different paths.

An Agent is not a kind the Kernel can name, and this is the property most often lost in translation. The Kernel sees an Execution; the pattern that built it is recorded nowhere in the protocol. Two Agents can disagree completely about the format of their saved progress. An Agent and a Workflow can share one format exactly. Whether an Execution can be resumed is therefore decided by its pinned [Runtime contract](core.md#runtime-contract) revision, and never by the word "Agent". A page, a schema or a conformance test that branches on Agent-versus-Workflow has invented a discriminator the architecture does not have.

Inside an Agent, planner, evaluator, router and retriever are application roles. They are useful names for the pieces a team builds, and they are not Kernel kinds: none of them can be addressed, authorized, cancelled or recovered on its own.

One consequence deserves its own sentence, because it is the most common misreading on this page. A model call inside an Agent is native work: while the Agent waits for its provider, the Execution stays [`RUNNING`](../mechanisms/lifecycle.md). [`WAITING`](core.md#wait-subscription-and-generation) is reserved for a dependency the Runtime declared and the Kernel can actually observe, and an internal model call is neither declared nor observable. An operator watching a long-running Agent therefore sees an Execution that looks stuck and is working, and that is the correct report.

## Workflow

A **Workflow** is a Runtime that follows a control flow defined in advance, which may include branches and loops a model selects.

The line between this and an Agent is who chooses the next step, not how much intelligence the work involves. A Workflow can call a model at every stage and still be a Workflow, because the order of those stages was fixed by somebody. An Agent can follow a rigid procedure most of the time and still be an Agent, because at each point it could have done otherwise. A model selecting between two pre-drawn branches is a Workflow branch; a model inventing the next step is an Agent loop.

The two coexist inside one Runtime, and they share machinery. A Workflow's draft stage may itself be an Agent loop, and an Agent may call a Workflow-shaped procedure as one of its steps. That is the reason the pair is a description of control flow rather than a taxonomy of products: there is no point at which a Runtime has to declare itself one or the other, and no property of the protocol depends on the answer.

What the shape buys is a graph a reader can inspect before anything runs, which makes completion barriers and required joins declarable in advance. What it costs is anticipation: a branch the graph does not contain is a branch the work cannot take. [Composing work inside a Runtime](../mechanisms/composition.md) owns what the pieces owe each other — typed handoffs, barriers, forks and joins.

## Stage and local branch

A **Stage** is a defined unit of input, computation, output and transition inside a Workflow Runtime. A **local branch** owns its own intermediate control flow and result inside the enclosing Runtime.

Neither has a Kernel mailbox, an authority binding or a lifecycle. The report's gather, draft and review stages are not three Executions, and the two analyses running inside gather are not two more.

That is a decision, and the rejected alternative is worth naming, because it looks like rigor. Giving every stage its own Execution would let the Kernel schedule, inspect and recover each one separately. It would also charge three creations, three authority bindings and three mailboxes, plus a parent that cannot [complete](../mechanisms/lifecycle.md#completion-is-an-accounting-check) until it has accounted for two children — all to coordinate one report. A second lifetime is worth buying when work needs to be addressed, authorized, recovered or inspected on its own. A stage needs none of those, and [child and ownership](operations.md#child-and-ownership) owns the test for when the separation pays.

The hard part of a stage is knowing when it is finished. A stage that starts work and returns looks identical, from outside, to a stage that waited for that work to complete — the function returned in both cases, and only one of them is done. Completion barriers are therefore explicit: required local work finished, required [action](actions.md#logical-action-and-intent) and child results accounted for, transforms complete, selected output committed, and only then a transition. A function returning is not evidence that every task it started has finished.

Local branches carry the concurrency, and concurrency inside one Runtime gets none of the protection the Kernel provides between Executions. The discipline that replaces it has five parts:

- Branch input is captured immutably at the fork.
- Each branch keeps its own [progress](state.md#progress), [scratch frame](state.md#working-notes) and result slot.
- The aggregate commit is serialized, or equivalent native ownership replaces it.
- Required results join in declared order, failures included.
- An explicit merge — or a refused conflict — comes before any downstream work.

Collecting what the branches returned is not deciding what it means together; that second act is still somebody's work.

Two limits on that discipline are easy to assume away. The Kernel's single-writer acceptance fences which attempt may write accepted progress — it does not serialize two branches writing the same file or the same row, which is why [shared mutation](../mechanisms/resources.md#shared-mutation) is its own problem. And cancelling the report does not prove the losing branch stopped; it proves the Kernel accepted a decision.

## Local worker

A **local or delegated worker** is internal work that a Runtime or a native framework manages itself.

The word *worker* is overloaded in this vocabulary, and a sentence using it bare is almost always ambiguous. A [Kernel Worker](operations.md#kernel-worker) is a process role performing Kernel transitions. An [Execution Host](operations.md#execution-host) is a process role running Runtime code. A local worker is neither: it is work the Runtime owns, and the Kernel has no record of it. Say which of the three is meant.

A local worker is not automatically a [child Execution](operations.md#child-and-ownership), and promoting one is a decision rather than a cleanup. Work that merely needs to run in parallel, or inside another framework, gains nothing from a second lifetime and pays for it in coordination. Work that needs to be addressed, authorized, recovered or inspected independently is the case where the promotion earns its cost.

"Local" describes ownership, not placement, and this is where the term most often misleads. A local worker may run in another process, on another machine, or inside a provider's service, and it may have its own identifiers, its own retries and its own cancellation. All of that stays a Runtime and [Driver](core.md#execution-driver) responsibility. Nothing about running elsewhere makes work Kernel-visible; it becomes Kernel work only when the application explicitly creates an independently managed Execution for it.

A supervisor that evaluates a worker's results or chooses a retry strategy is an application or Runtime role, not a Kernel one. Supervision that the Kernel must still mean something after a parent ends — declared failure policy, required children, authorized control paths — is a different thing with a different owner, and [finite expansion and supervision](../mechanisms/communication.md#finite-expansion-and-supervision) specifies it.

## Context

**Context** is the information selected for one computation. A **context compiler** is the code that selects, retrieves, redacts and summarizes authorized information for that request.

Context need not be retained, and treating it as memory is the first mistake available here. It is one request's inputs, assembled and then gone; what a Runtime keeps between computations is [progress](state.md#progress), [notes](state.md#working-notes) or [asserted state](state.md#structured-state), each with its own owner and its own trust. Context is also not [Execution History](state.md#execution-history), which is the Kernel's record of its own decisions rather than a feed a compiler may draw from freely — though authorized history can be one input source among several.

The rule that does the work is a limit on what selection may do. Selection may shorten, reorder and redact. It may not change what something is: an inference must not arrive looking like an assertion, a truncation must not arrive looking like the whole, and a record that could not be found must arrive as unavailable rather than as proof of absence. Those three are different instructions to a model. A compiler that quietly erases the difference does not produce a shorter context; it produces a confident answer built on the gap, and nothing downstream can tell.

A context compiler does not grant access, which is the second mistake. It chooses among information the Runtime is already authorized to read, so the selection inherits the authorization and adds none. A working note recording that the editor usually approves publication can inform a proposal; it cannot approve this one, because [content is not authority](../mechanisms/authority.md#content-is-not-authority).

Two acts that look alike from here are not. Selecting what goes into a request leaves the native transcript exactly as it was. Compacting that transcript destructively changes retained state, and then it is a [checkpoint publication](../mechanisms/recovery.md#checkpoint-publication) question rather than a formatting one. [Building context and preserving callable meaning](../mechanisms/context.md) owns the selection rules and what may be reused between requests.

## Projection and invocation binding

An **operation projection** renders selected stable [operations](actions.md#operation) as provider-facing names and schemas. A **callable alias** is the name the model sees. An **invocation binding** is the record that fixes, for one invocation, which actual operation or local control each alias meant, together with the contract versions and input it was built against.

Three names, because one word cannot carry the job. Models choose from what they can read, so the name in front of the model wants to be short and human: `publish_report` renders as "Publish this week's report". Permission and evidence need a name that does not drift, so [the operation keeps its identity across revisions and across labels](actions.md#operation). And the moment a request is in flight, the pairing between the two is a fact that has to be written down somewhere, because nothing else will remember it. That record is the binding.

The failure it prevents is concrete. The model is shown `search_docs`, bound to `docs.search@2`. Its reply takes nine minutes, and during those nine minutes a teammate renames the alias to point at `docs.search@3`. Resolving the late reply against today's catalog performs a different operation from the one that was authorized, validated against a schema, and — if the operation required it — approved by a person under [exact consent](actions.md#exact-consent). Resolving it through the binding performs the operation that was actually asked for. A catalog that moved is a fact about the catalog; it is not a decision to change what this reply means.

A **local control** is the other thing an alias can name: a callable that changes Runtime-local planner or scratch state rather than asking the Kernel to do something in the world. All callable kinds can share one provider tool syntax and still keep typed origin, and keeping that origin is what stops two failures in opposite directions. A note-update control must not be able to masquerade as a mediated operation, and a tool discovered at runtime must not be able to mint a local control. Where two aliases would be ambiguous, the Runtime refuses them or assigns collision-safe names before sending.

Showing a model that an operation exists authorizes nothing; [exposure is filtered visibility, not a grant](actions.md#exposure-and-mediation). [Fixing bindings for each invocation](../mechanisms/context.md#fix-bindings-for-each-invocation) owns what a binding retains and what an adapter must do when it cannot reconstruct one.

## Invocation snapshot and cache

An **invocation snapshot** preserves enough of one native request, and the bindings it was built with, to interpret the response or continue the work. A **context cache** is a copy kept to avoid recomputing something.

The difference is what losing each one costs, and the two are easy to file together because both are "data about a previous request". A cache is recomputable by definition — that is what makes it a cache — so discarding it costs time and money. A snapshot is the only copy of what an in-flight call was built from, so discarding it costs the ability to say what that call was asking. A snapshot needed by in-flight work therefore has a continuation lifetime, and treating it as a cache hit is how a Runtime discovers mid-recovery that it is holding a response it can no longer interpret.

Provider prompt caches sit outside both categories. They are provider-controlled optimizations that may reduce cost and latency; they carry no authority, they are not records the Runtime owns, and they are not evidence about what was disclosed.

One boundary closes the section. A fresh computation may produce a new snapshot with the same content, and that is a new request rather than a replay of the old one — calling it replay would claim a continuity nothing established. [Cache dependencies](../mechanisms/context.md#cache-dependencies) owns what each cached item may be reused for, and what has to be rechecked first.

## View and disclosure

A **view** is the selection of readable fields and objects, and writable targets, authorized for the current principal. **Disclosure** is what actually leaves: the content, descriptors and metadata sent to a Runtime, a model or a remote retrieval service.

Two words, because they are different kinds of fact and they fail differently. A view is a permission decision, made by whoever authorizes access, and it can be revised. A disclosure is a historical fact about bytes that travelled, and once it has happened no revision reaches it. A deployment that has authorized a narrow view has not thereby limited what a previous request already sent.

Scope labels locate information; they do not grant a view. Holding a scope name says where to look, not that looking is permitted, and a label that appears in a model's context is not a capability the model holds.

The view an exchange runs under is pinned, which turns a permission question into a recovery question. The authorized execution view is part of what a [dispatch records before sending](../mechanisms/execution-cycle.md#before-sending), so a redelivery carries the view the attempt actually computed against. If policy later forbids redisclosing that view, the honest answers are to hold the exchange, refuse it, or explicitly abandon it. Rebuilding a narrower view and calling the result an identical replay is not among them: the answer in hand was computed from the input that was sent, and quietly substituting a different input produces a record that describes an exchange nobody had.

An internal precondition token deserves suspicion even when it is opaque. A single revision number that moves whenever any hidden field changes tells a model that something it cannot see moved, which is a disclosure wearing the costume of an identifier. Opacity is not non-disclosure, and [the state service contract](../mechanisms/state.md#state-service-contract) owns the field-level alternatives.

Cached copies do not extend a view either. Revoked content may not enter a new request merely because a copy was already made, and revocation cannot retract what a provider already received — that residue is a [retention](state.md#retention-pin-and-tombstone) question with a different owner, not an access-control one.

## Skill and package

A runtime **Skill** packages instructions, references, assets or scripts, and optionally a root composition, so that a Runtime can be extended or a whole piece of work invoked. A **package manifest** is the Skill's own declaration: source and version, entry points, bindings, and the operations and resources it wants.

The boundary that matters is that a Skill is a request and never a grant. A manifest saying it needs `publish_report` and a workspace records what the package wants; the deployment decides whether it gets either. [Preflight](../mechanisms/composition.md#notes-controls-and-packages) checks the declaration — missing static bindings, unsupported requirements — and checking it is not authorizing it. An imported `allowed-tools` list cannot widen an Execution's [authority](actions.md#principal-and-authority), because if it could, packaging would be a privilege-escalation path with a friendly name.

A Skill is not an Execution. It has no mailbox, no authority binding and no lifecycle; loading one changes what a Runtime knows or can invoke, and changes nothing about what the Kernel is coordinating. It is also not an [operation](actions.md#operation): an operation is a pre-declared call contract, and a Skill packages instructions rather than exposing a call.

Three properties of the contents follow from the same reasoning. Descriptions remain untrusted text, however well written, and a sentence inside a package is not a decision by anyone. Scripts run under the execution profile the package declared, which is a [containment](../mechanisms/resources.md#containment-claims) question rather than a packaging one. And credentials, live sessions and private memory do not belong in a package at all, because a package is meant to be handed around.

How a Skill is loaded — metadata first, instructions on use, assets on demand — is a context strategy with a cost profile, not a permission model. Exporting a composition-backed Skill into an instruction-only format loses the composition's semantics; that loss has to be disclosed, or the capability exposed as a [service](#service-and-interaction-template) instead of flattened into prose. The architecture requires no universal Skill schema, registry or signing service to make any of this work.

One collision is worth closing explicitly, because it is the borrowed-term hazard in its purest form. These runtime Skills are not this repository's `.agents/skills/` coding-agent workflow skills. The two share a word and nothing else.

## Service and interaction template

A **service** exposes selected input, result and interaction contracts while keeping its implementation private. An **interaction template** supplies parameterized predefined or contextual input. An **async handle** correlates native external work with the Execution that started it.

The three belong together because they are the ways a Runtime reaches something it does not implement, and none of them adds a mandatory Kernel entity or a portable descriptor hierarchy. A service is a private implementation standing behind some selected operations; the [operation](actions.md#operation) remains the contract a mediated request is validated and approved against. Neither is a [resource](state.md#resource-binding-and-attachment), which is acted on rather than called, and neither is a [Skill](#skill-and-package), which packages instructions rather than exposing a call.

An interaction template is input, and input is not consent. Prefilling a form with the draft's title and the editor's address saves typing; it is not a person's yes to an unchangeable action, which is what [exact consent](actions.md#exact-consent) requires, and a reply that comes back through a template is an observation the Runtime must interpret.

An async handle is a correlation, and it is worth being precise about how little that is. Holding one says which native work a later result belongs to, so a result arriving hours later can be matched to the request that caused it. It authorizes nothing, it is not a bearer permission, and it does not make the work resumable — a handle to a session that can advance on its own is a [locator, not a checkpoint](state.md#checkpoint-and-locator). [Adapting a native Runtime faithfully](../mechanisms/integration.md) owns what a Driver must declare about native runs, sessions and jobs before any of this may be relied on.

## What the page adds up to

Every term here names something the Kernel deliberately cannot see, and the invisibility is the design rather than an omission. The Kernel agrees with a Runtime about what has been accepted, and never about how the report gets written. What that costs is that none of this page's quality shows up in the Kernel's record: a Runtime with a careful context compiler and a sloppy invocation binding looks exactly like the reverse from the accepted side. Measurements of context, retrieval, planning and tool wording therefore hold the Kernel fixed and compare Runtimes, while conformance tests of the protocol itself use deterministic fakes. [Benchmark attribution](../mechanisms/evidence.md#attribution-and-gates) owns that separation.