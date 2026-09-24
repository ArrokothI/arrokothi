# Runtime roles and context vocabulary

The pages before this one name what the [Kernel](core.md#kernel) decides about. This page opens the box the Kernel deliberately leaves shut — the [Runtime](core.md#execution-runtime) — and names what is commonly built inside it: how a Runtime divides its work, what it shows a model and how it reads the answer, and what it may see, send, load and call. Throughout, a *model* means an AI model such as a large language model: something a Runtime may call, usually through an API run by an outside *provider*.

The earlier terms had to be exact because Kernel and deployment guarantees are stated in them. These are optional. A Runtime can be a short function, a workflow engine, a remote service behind its [Driver](core.md#execution-driver), or an Agent looping around a model. It can build the structures named here, build them under other names, or build none of them, and still be a correct Runtime. The Kernel sees one [Execution](core.md#execution) either way. That gives every definition below the same boundary: **a Runtime-internal structure has no Kernel mailbox, no authority of its own and no Kernel lifecycle**, whatever native lifecycle its own framework gives it.

Optional does not mean unconstrained, though. When a Runtime calls a model, sends content outside itself or loads a Skill, some of the entries below carry rules it must keep, and link to the pages that own them.

ArrokothI is more than its Kernel, and these terms are also the vocabulary for its own optional [reference Runtime](../mechanisms/composition.md#reference-runtime-acceptance) facilities. Those facilities are optional for Kernel conformance, not as a product direction: ArrokothI's own Agent and Workflow systems use this vocabulary, and the [roadmap's product sequence](../../docs/development/001-current-status-and-roadmap.md#sequence-and-ownership) places them after the Kernel/Driver foundation. A native framework keeps its own names.

The terms fall into three groups, which do not build on one another:

- **How a Runtime is shaped** — [Workflow](#workflow) and [Agent](#agent), the two ways control flow gets decided, plus the [Stage and local branch](#stage-and-local-branch) and [local worker](#local-worker) that divide work inside one of them.
- **What a Runtime shows a model, and how it reads the reply** — the [context](#context) it assembles, the [projection and invocation binding](#projection-and-invocation-binding) that keep a displayed name attached to what it actually invokes, and the [invocation snapshot](#invocation-snapshot-and-cache) that survives long enough to interpret a late answer.
- **What a Runtime is allowed to see, and to package** — [view and disclosure](#view-and-disclosure), the [Skill](#skill-and-package) whose manifest carries requests rather than grants, and the [service, interaction template and async handle](#service-and-interaction-template) that a Runtime uses to reach work behind someone else's contract.

[Local composition](../mechanisms/composition.md), [context construction](../mechanisms/context.md) and [state and memory](../mechanisms/state.md) are the mechanism pages that specify how these pieces behave together. This page says what each one is.

## A first example

Open up the weekly report from [the core vocabulary](core.md) and look inside the Runtime. Everything visible from here is invisible to the Kernel, which continues to see exactly one Execution running one pinned [Definition](core.md#definition) revision, answering Activations with Outcomes.

The team that wrote this Runtime built it as a **Workflow**: fetch, then summarize, then draft, then route for review, in an order fixed before anything ran. A second team, whose reports vary more from week to week, built theirs as an **Agent**: a model reads the brief and decides for itself what to do next — search, summarize, draft, ask. Each Runtime does the work of its own Execution, and the Kernel records nothing that says which pattern either one used — deliberately so.

Follow the first team's Workflow into its summarize step, which is a **Stage** — a defined unit with its own input, computation, output and transition to whatever comes next. The Stage needs three sources read and has no reason to read them one at a time, so it opens three **local branches**. The third branch hands its actual work to a summarization service running on someone else's machines. That is still a **local worker**: the report Runtime remains the party answerable for it, and the Kernel has not been told it exists.

Now turn to the second team's Agent, which faces a question the Workflow's code answered in advance: what should happen next? Answering it means deciding what a model gets to see. The Agent assembles a **context**: the brief, last quarter's figures, three retrieved passages, a note it left itself two Activations ago. A **context compiler** did that assembling. Alongside the information it sends a list of things the model may call — an **operation projection** of the mediated [operations](actions.md#operation) this Execution is permitted to use. `publish_report` appears under the **callable alias** "Publish this week's report", because that is the phrase a model handles well. An **invocation binding** records, for this one request only, that the alias means `publish_report` at revision 2 — and that `note_update`, which arrives in the provider's tool syntax looking exactly the same, is a **local control** that touches nothing but the Runtime's own scratch state.

The model answers ninety seconds later, choosing "Publish this week's report". By then the catalog has been republished and that phrase points at revision 3, but the Runtime reads the answer as revision 2, from the **invocation snapshot** it saved of the request it sent.

A few more terms are already in play without having been named. What the compiler was allowed to put into that context came from a **view**: the fields and objects that the [principal](actions.md#principal-and-authority) the report runs on behalf of may read. What the Agent then actually sent to the model's provider was **disclosure**, and it cannot be taken back. And the Agent's drafting machinery was not written by the second team at all — it was imported as a **Skill**, a package of instructions and scripts whose **package manifest** lists the operations it would like to use. The deployment answered that list. The manifest did not.

The Kernel interprets none of this. It accepted the report's Outcomes without knowing that any of these words applied.

## How a Runtime is shaped

The first two terms describe who decides what a Runtime does next: code written in advance, or a model at run time. The second two name the pieces a Runtime divides its work into.

### Workflow

A **Workflow** is a Runtime, or a part of one, that primarily follows a control flow fixed before the work runs. That control flow may include branches and loops that models select among.

A model can do a great deal inside a Workflow without making it something else. It can pick which of four prepared paths a request takes. It can review a draft and send it back for revision until the draft passes. It can read the brief, split it into as many subtasks as the brief needs, and hand each to its own model call before the results are merged. In every case the model decides what goes into a step — which path, how many subtasks, what each one covers, whether a draft is good enough. The code still decides the shape: what kind of step comes next, and what ends the work. These three are the routing, evaluator-optimizer and orchestrator-workers patterns from Anthropic's [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents), whose line between workflows and agents this page follows.

### Agent

An **Agent** is a Runtime, or a part of one, whose control flow a model or policy directs while the work is running, rather than one fixed in advance.

An Agent goes one step further than a Workflow. The model or policy decides not only what goes into a step but what the next step is and when the work is done, usually in a loop that acts, looks at the result and decides again. That suits work whose steps cannot be laid out in advance: the report may need three sources or thirty, and which ones matter depends on what the first one turned up. The price is predictability. Nobody can read the path in advance, and two runs over the same input may take different ones, which is why, as that article advises, an Agent is usually worth reaching for only when a Workflow cannot express the work.

While an Agent waits ninety seconds for its model to answer, the Execution shows `RUNNING`, not [`WAITING`](core.md#wait-subscription-and-generation). The model call is the Runtime's own work, and `RUNNING` means only that an Activation is still unresolved; `WAITING` is reserved for a dependency the Runtime declared to the Kernel in an accepted Outcome. So a long `RUNNING` is neither a sign that the Agent is stuck nor proof that it is healthy.

Agent and Workflow are not exclusive, and the Kernel never asks which one a Runtime is. Each can use the other, in two ways. Inside one Runtime, a Workflow's review step can run an Agent loop, and an Agent can call a small Workflow as a function; the Kernel sees neither. Or either one can hand work to a separate [child Execution](operations.md#child-and-ownership), whose own Runtime may be an Agent or a Workflow; that child is Kernel work with a lifetime of its own. The next two entries name the pieces for the first case, and the Stage entry is where the choice between the two comes up.

Planner, evaluator, router, critic and retriever are application roles inside either kind of Runtime. They are not separate kinds of anything, and adding one does not add a Kernel concept. A Runtime that calls one part of itself "the planner" has named a function; it has not created something the protocol can address, authorize, cancel or recover.

### Stage and local branch

A **Stage**, also called a local node, is a defined unit of input, computation, output and transition inside a [Workflow](#workflow) Runtime. A **local branch** is control flow that owns its own intermediate steps and its own result within the enclosing Runtime.

The two name different things. A Stage is a *step*: the report Workflow's fetch, summarize and draft are three Stages, one after another, each handing its output to the next. A branch is a *path running alongside others*: the summarize Stage opens three branches so that three sources are read at once, and each branch keeps its own steps and result until a join collects them. A branch can contain several Stages, and branches are not limited to Workflows — an Agent that runs three searches side by side has opened three branches too.

Both follow this page's shared rule. The three Stages are not three Executions, and the three branches are not three more: the Kernel cannot address or cancel any of them, and does not know how many there are. Each term still earns its name, because each marks a different decision a Runtime author makes.

A Stage marks the choice between a step inside one Execution and a [child Execution](operations.md#child-and-ownership). The Stage is the cheap side: it costs nothing the Kernel has to track and buys nothing the Kernel can offer. A child buys a lifetime the Kernel can address on its own, and pays for everything a lifetime carries, including a parent that cannot finish until it has accounted for the child. [Children](../mechanisms/communication.md#children) owns when that price is worth paying.

A branch marks the point where work inside one Execution becomes concurrent, without any of the protection the Kernel gives between Executions. The Kernel's single-writer rule fences accepted progress, not the files, rows or native sessions that two branches can both reach. [Forks, joins and corrections](../mechanisms/composition.md#forks-joins-and-corrections) owns what a Runtime has to do about that, along with joins and merges.

### Local worker

A **local or delegated worker** is internal work that a Runtime or a native framework manages on its own.

Stages and branches describe how a Runtime arranges its work. A local worker is a piece of that work the Runtime hands off and keeps track of: a background task, a subprocess, a subagent its framework starts, or a call to an outside service like the summarization service in the first example.

*Local* describes who answers for the work, not where it runs. A local worker may run in another process, on another machine or inside a vendor's service, with its own IDs, retries and cancellation. It is still local, because the Runtime, with its Driver, answers for all of that. It stops being local only when the application explicitly creates it as Kernel work — an Execution of its own, such as a child — and from then on it has everything an Execution has.

That makes *worker* on its own ambiguous. A local worker is not a child Execution, and it is not a [Kernel Worker](operations.md#kernel-worker), the process role that performs Kernel transitions; that entry lists every kind of worker in this vocabulary and the qualifier each one needs.

Supervising delegated work — judging its results, deciding whether to retry — is likewise an application or Runtime job, not a Kernel facility. The Kernel helps only when the supervised work is child Executions, because only those are Kernel work: [supervision](operations.md#child-and-ownership) names what it contributes, and [finite expansion and supervision](../mechanisms/communication.md#finite-expansion-and-supervision) owns the accounting and controls a supervisor's choices use.

## What a Runtime shows a model, and how it reads the reply

Everything in this group applies only to a Runtime that calls a model; a Runtime that never does can skip it.

A model call has two halves. Going out, the Runtime decides what information to include and which operations to offer. Coming back, it has to work out what the reply means — possibly after a long wait, during which the catalog of operations may have changed. The first entry covers the information going out. The second covers the operations offered and how a name in the reply is traced back to one of them. The third covers what the Runtime keeps so that it can still do that when the reply arrives.

### Context

**Context** is the information a Runtime selects for one computation. It need not be retained afterwards. A **context compiler** is the component that selects, retrieves, redacts and summarizes authorized information for that one request.

The important words are *for one computation*. Context is chosen for one request and may be thrown away when that request returns. What a Runtime keeps between computations is a different subject with different owners, covered on [the next page](state.md#structured-state). Keeping the two apart is what lets a system say whether something was remembered or merely shown once.

Readers coming from provider documentation may know a second meaning of the word. In a provider API, "context" usually means the token window, which is a size limit. Here it means a choice: which authorized information goes into this request. The size limit is real, but it is the provider's; this term is about the choosing.

Two limits bound the term. Selecting information does not grant access to it, and putting a claim into a context does not assert that the claim is true. Selection is where the second limit is most easily broken. A compiler may shorten and redact, and a shortened or redacted item can come out looking like something it is not: a guess like a finding, an excerpt like the whole, a record nobody could find like evidence that none exists. [Selecting information without changing its status](../mechanisms/context.md#select-information-without-changing-its-status) owns what selection must preserve.

### Projection and invocation binding

Four terms describe how a Runtime offers operations to a model and reads the model's choice:

- An **operation projection** renders selected stable [operations](actions.md#operation) as provider-facing names and schemas.
- A **callable alias** is the name shown to the model. It is not the operation's stable identity.
- An **invocation binding** fixes, for one invocation, the mapping from each alias to the actual operation or local control it means, together with the relevant contract versions and the input and state versions it was built from.
- A **local control** changes Runtime-local planner or scratch state. It keeps its typed origin even when it shares the provider's tool syntax with a mediated operation.

They belong together because of one mismatch: a model chooses from names it can read, while permission and evidence need names that do not drift. The projection and alias serve the model. The binding connects what the model chose back to something exact.

The first example shows the case the binding exists for. The model saw "Publish this week's report" mean `publish_report` revision 2; by the time it answered, the catalog had pointed that phrase at revision 3, whose arguments mean something slightly different. Reading the reply against the current catalog would propose a publication under a contract the model was never shown. Reading it through the binding keeps the meaning the model saw. Current rules still apply, but to permission rather than meaning: the request for revision 2 goes through admission like any other, and is refused if it is no longer allowed.

The binding also keeps apart two things that look the same to the model. In the provider's tool syntax, the mediated operation `publish_report` and the local control `note_update` arrive as the same kind of call. Without a recorded origin for each, the Runtime can confuse them in either direction: a note update gets passed off as a mediated operation, or a call that should have gone through admission is handled as a local control and never meets it. [Fixing bindings for each invocation](../mechanisms/context.md#fix-bindings-for-each-invocation) owns what a binding retains and what a Runtime does when it cannot reconstruct one.

None of this is permission. Showing a model that an operation exists authorizes no particular use of it; [exposure and mediation](actions.md#exposure-and-mediation) owns that distinction.

### Invocation snapshot and cache

An **invocation snapshot** preserves enough of a native request and its bindings to interpret the response or to continue the work. A **context cache** is a recomputable optimization.

The binding is the mapping; the snapshot is the saved copy of the request that holds it, along with the input the model was given. Both a snapshot and a cache are material kept from an earlier request, and both are obvious candidates when space runs short. They differ in what happens when one is dropped. Drop a cache and the Runtime can recompute what it needs; the loss is only time. Drop the snapshot of a request whose reply has not arrived, and nothing any longer says which alias meant which operation, or what input the model was answering. The reply is not wrong; it is unreadable. So a snapshot that in-flight work still depends on must not be discarded as though it were a cache.

A provider's prompt cache is neither of these. It is the provider's own optimization, and it carries no permission: content that was allowed into a request once is not allowed into a later one just because it was cached. [Cache dependencies](../mechanisms/context.md#cache-dependencies) owns what has to be rechecked before any retained copy is reused.

## What a Runtime is allowed to see, and to package

Unlike the previous group, these entries apply to any Runtime, whether or not it calls a model: they are about permission rather than the mechanics of a request.

Each entry separates something that looks like permission from what actually decides it. A view says what may be read, but a scope label does not grant one, and what was actually sent is a separate fact. A Skill's manifest asks for operations but is not given them by asking. A service, a template's defaults and an async handle help a Runtime reach outside work, and none of them authorizes anything.

### View and disclosure

A **view** is a selection of readable fields and objects, and writable targets, authorized for the current principal. **Disclosure** is what is actually sent to a Runtime, a model or a remote retrieval service; it includes content, descriptors and metadata.

The two behave differently over time. A view can be narrowed or revoked, and the next read follows the change. A disclosure cannot be taken back: once a passage has reached a provider, no later decision reaches it. With only one word for both, it would be easy to believe that revoking a view unsends something. [Views and retrieval](../mechanisms/state.md#views-and-retrieval) owns what each of the two promises.

Scope labels locate information; they do not grant a view of it. A folder name, an organization label or an ancestry relation tells a retrieval system where something lives, not who may read it. Being able to find a thing and being allowed to see it are separate facts, and only the second is authority.

Disclosure also covers more than the visible content. A request carries other information alongside the text, and each kind can reveal something the principal was not meant to learn:

- *Descriptors* such as titles, field names and labels can name something even when its content is withheld.
- *Counts* such as "3 of 12 results" tell the recipient that nine more exist.
- *Ranking influence* means that an item the principal may not see can still push visible results up or down, which hints that the item exists.
- *Internal precondition tokens*, the version values a system uses to check that nothing changed, show that something did change when they differ between two requests, whatever the visible text says.

So metadata needs the same check as content. It is not safe to send just because it is not what the request is about.

### Skill and package

A runtime **Skill** packages instructions, references, assets or scripts, and optionally a root composition. It can enrich a Runtime, or invoke work, without being an Execution and without being an authority grant. A **package manifest** describes the package's source, version, entry points, bindings and requested requirements.

A Skill is assembled in one place to be loaded in another. It may be written by the team that uses it or imported from elsewhere, as the drafting Skill in the first example was, and elsewhere can include a party the deployment does not control. The rules below hold either way.

The manifest is a request, never a grant. A manifest listing `publish_report` says what the package would like to use. It reads like configuration, and that is the hazard: configuration records a decision the operator made, while a manifest records what the package's author wanted, even when author and operator are on the same team. Enabling the package is the deployment's decision, and it decides only that: what the package may then do is still bounded by the Execution's [authority](actions.md#principal-and-authority) and current policy. Preflight checks whether what a manifest names is present and resolvable, not whether it is permitted, and an imported list of allowed tools cannot widen that bound. The manifest is one case of the wider rule that [content is not authority](../mechanisms/authority.md#content-is-not-authority).

The package's contents follow the same distinction. Its descriptions are content: they can shape what a Runtime proposes and can settle nothing. Its scripts run only where the Runtime and isolation requirements stated for them are met. And credentials, local sessions and private memory do not belong in a package at all, because whatever is packed into it reaches everywhere it is loaded. [Notes, controls and packages](../mechanisms/composition.md#notes-controls-and-packages) owns what a deployment pins before enabling one.

This repository also contains coding-agent workflow skills under `.agents/skills/`. They are tooling for people and agents working *on* ArrokothI, not runtime Skills, and not part of the architecture this page describes.

### Service and interaction template

A **service** exposes selected input, result and interaction contracts while keeping its implementation private. An **interaction template** supplies parameterized predefined or context input. An **async handle** correlates native external work.

Each of the three is easy to mistake for a term defined elsewhere, and the three mistakes are different.

A service is not an [operation](actions.md#operation). An operation is a pre-declared contract for one kind of mediated work, and admission, consent and evidence all attach to it. A service is an implementation boundary that may stand behind several operations, or behind none. The summarization service in the first example stands behind none: the report Runtime calls it directly, through a local worker, and no admission is involved.

An interaction template is not a grant, and it is not [exact consent](actions.md#exact-consent). A template is a prepared request with blanks — say, "publish this week's report to {account}" — where the Runtime fills each blank from a default or from context. Filling in a blank decides what is being asked for. It does not make the request any more allowed, and it does not count as anyone approving the value it filled in. If a person approved publishing to the team account and the template then fills in the company-wide account, the request being sent is not the one they approved. It is a new request, and it needs its own decision.

An async handle is not permission, and it is not a [correlation identifier](operations.md#message-request-and-correlation) in the Kernel's sense. It is a native value that lets a Runtime find its own outstanding external work again. Like every identifier in this architecture, holding one authorizes nothing.

None of the three implies a new mandatory Kernel entity, and none requires a portable descriptor hierarchy that every Runtime must adopt.

Next in the reading order: [state](state.md) — what an Execution keeps, and who stands behind each thing it keeps.
