# Runtime roles and context vocabulary

Every other page in this directory names something the [Kernel](core.md#kernel) decides about. This page names what is inside the box the Kernel declines to open.

That inversion is worth sitting with before reading further, because it changes what the definitions below are for. A term like [Activation](core.md#activation) or [Event](core.md#event) has to be exact because the Kernel enforces it: get the term wrong and an implementation is wrong. Nothing on this page is enforced by anything. These are names for structures a Runtime may build inside itself, and a Runtime that builds none of them, or builds all of them under other names, is not thereby incorrect.

So the shared rule under every definition here is a negative one, and it holds without exception: **a Runtime-internal structure has no Kernel mailbox, no authority binding and no lifecycle of its own.** The Kernel sees one [Execution](core.md#execution) whichever of these patterns built it. Nothing below adds a Kernel type, a Kernel scheduler, or a kind the protocol can branch on.

Which raises the obvious question: if none of it is enforced, why define any of it? Two reasons, and the second is the stronger one. First, these words get used constantly in conversations about ArrokothI, and several of them — *worker*, *service*, *context*, *view* — are ordinary English that already means three things to any engineer in the room. Second, and less obviously, half the terms below name something that **closely resembles a Kernel concept and is not one**. A local branch resembles a child Execution. A local control resembles a mediated operation. A Skill's manifest resembles a grant. Each resemblance is a mistake somebody will make, and the only defence against it is a word that says which side of the boundary the thing sits on.

The terms fall into three groups, and they do not build on one another:

- **How a Runtime is shaped** — [Agent](#agent) and [Workflow](#workflow), the two ways control flow gets decided, plus the [Stage and local branch](#stage-and-local-branch) and [local worker](#local-worker) that divide work inside one of them.
- **What a Runtime shows a model, and how it reads the reply** — the [context](#context) it assembles, the [projection and invocation binding](#projection-and-invocation-binding) that keep a displayed name attached to what it actually invokes, and the [invocation snapshot](#invocation-snapshot-and-cache) that survives long enough to interpret a late answer.
- **What a Runtime is allowed to see, and to package** — [view and disclosure](#view-and-disclosure), the [Skill](#skill-and-package) that arrives from outside carrying requests, and the [service and interaction template](#service-and-interaction-template) that expose a contract without exposing an implementation.

[Local composition](../mechanisms/composition.md), [context construction](../mechanisms/context.md) and [state and memory](../mechanisms/state.md) are the mechanism pages that specify how these pieces behave together. This page says what each one is.

## A first example

Open up the weekly report from [the core vocabulary](core.md) and look inside the Runtime. Everything visible from here is invisible to the Kernel, which continues to see exactly one Execution running one pinned [Definition](core.md#definition) revision, answering Activations with Outcomes.

The team that wrote this Runtime built it as an **Agent**: a model reads the brief and decides for itself what to do next — search, summarize, draft, ask. A second team, solving the same problem, built theirs as a **Workflow**: fetch, then summarize, then draft, then route for review, in an order fixed before anything ran. Both Runtimes produce an Execution. From outside, the two are indistinguishable, and deliberately so.

Follow the Agent into its drafting step, which is a **Stage** — a bounded unit with its own input, computation and output. The Stage needs three sources checked and it has no reason to check them one at a time, so it opens three **local branches**. The third branch hands its actual work to a summarization service running on someone else's machines. That is still a **local worker**: the report Runtime is still the party answerable for it, and the Kernel has not been told it exists.

Now the Agent has to ask a model what to do next, which means deciding what the model gets to see. It assembles a **context**: the brief, last quarter's figures, three retrieved passages, a note it left itself two Activations ago. A **context compiler** did that assembling. Alongside the information it sends a list of things the model may call — an **operation projection** of the mediated [operations](actions.md#operation) this Execution is permitted to use. `publish_report` appears under the **callable alias** "Publish this week's report", because that is the phrase a model handles well. An **invocation binding** records, for this one request only, that the alias means `publish_report` at revision 2 — and that `note_update`, which arrives in the provider's tool syntax looking exactly the same, is a **local control** that touches nothing but the Runtime's own scratch state.

The model answers ninety seconds later, naming "Publish this week's report". The Runtime resolves that answer through the **invocation snapshot** it kept from the request, not through whatever the catalog holds now. In between, someone republished the catalog.

Two more terms are already in play without having been named. What the compiler was allowed to put into that context came from a **view**: the fields and objects this principal may read. Handing them to the provider was **disclosure**, which is a different act with a different owner. And the drafting machinery was not written by this team at all — it arrived as a **Skill**, a package of instructions and scripts whose **package manifest** lists the operations it would like to use. The deployment answered that list. The manifest did not.

Not one of those words appears in anything the Kernel accepted about the report.

## How a Runtime is shaped

The first two terms name the two answers to one question: who decides what happens next. The second two name the pieces a Runtime divides itself into once that question is settled.

### Agent

An **Agent** is a Runtime whose control flow a model or policy directs while the work is running, rather than one fixed in advance.

The word names a shape, and the shape has consequences for the team that owns the Runtime — what they can predict, what they have to test, what they pay per run. It has no consequences for the Kernel, which never learns the shape.

Planner, evaluator, router, critic and retriever are application roles inside such a Runtime. They are not separate kinds of anything, and adding one does not add a Kernel concept. A Runtime that calls one part of itself "the planner" has named a function; it has not created something the protocol can address.

An Agent is not a Kernel type, and the temptation to treat it as one is specific enough to name: the label looks like it should predict something about the Runtime behind it. It predicts nothing. Two Agents can disagree completely about how they save their state, and an Agent and a Workflow can agree exactly. [The Runtime contract](core.md#runtime-contract) owns what does decide that compatibility, and owns why no such tag appears in the Kernel's model at all.

### Workflow

A **Workflow** is a Runtime that primarily follows a control flow fixed before the work runs, which may include branches and loops that models select among.

The qualifier in that definition is the part worth reading twice. A Workflow whose third step asks a model "which of these four paths?" is still a Workflow, because the four paths were fixed in advance and only the choice among them was not. What makes a Runtime an Agent is not the presence of a model but a model's power to decide something nobody enumerated.

Agent and Workflow are not exclusive, and the pair is not a union the Kernel resolves. They can share implementation machinery, and one Runtime can contain both — a Workflow whose review step is an Agent is an ordinary thing to build. There is no moment at which a deployment must declare which one it has, because nothing ever asks.

### Stage and local branch

A **Stage**, also called a local node, is a defined unit of input, computation, output and transition inside a Runtime. A **local branch** is control flow that owns its own intermediate steps and its own result within the enclosing Runtime.

Both are instances of this page's shared rule: a Stage has no Kernel mailbox, no authority of its own and no lifecycle, and neither does a branch. The Kernel cannot address one, cannot cancel one, and does not know how many there are.

Given that, the fair question is why the architecture bothers to name them. The answer is that a Runtime author faces a real and consequential choice — divide this work into Stages inside one Execution, or create a child Execution for it — and a choice between two options is only available to someone who has words for both. A Stage is the cheap side of that choice: it costs nothing the Kernel has to track, and it buys nothing the Kernel can offer. What the expensive side buys instead, and what it then obliges somebody to account for, belongs to [child and ownership](operations.md#child-and-ownership).

The resemblance runs deep enough to mislead in one specific way, so state it directly: two local branches are not two Executions, and they get none of the protection the Kernel provides between Executions. The Kernel's single-writer rule fences which attempt may write accepted progress. It says nothing about which of two branches may write the same file, the same row or the same native session. [Forks, joins and corrections](../mechanisms/composition.md#forks-joins-and-corrections) owns what a Runtime has to do about that, along with barriers and merges.

### Local worker

A **local or delegated worker** is internal work that a Runtime or a native framework manages on its own.

*Local* describes ownership, not location, and this is the most reliably surprising sentence on the page. A local worker may run in a different process, on a different machine, or inside a vendor's service, and may carry native identifiers, native retries and a native cancellation API of its own. None of that makes it less local. It stays local because the Runtime remains the party answerable for it, and it stops being local only when the application explicitly creates independently managed Kernel work — at which point it is a child Execution, with everything that implies.

A local worker is therefore neither a child Execution nor a Kernel Worker, and the shared noun does nothing to keep the three apart — [Kernel Worker](operations.md#kernel-worker) lists everything this vocabulary calls a worker and says which qualifier each one needs.

A supervisor that watches these workers, judges their results and picks a retry strategy is likewise an application or Runtime role, not a Kernel facility. The Kernel supplies the accounting and the authorized control paths that such a policy uses to still mean something after a restart; it does not supply the policy. [Finite expansion and supervision](../mechanisms/communication.md#finite-expansion-and-supervision) owns what it does supply.

## What a Runtime shows a model, and how it reads the reply

Showing a model something is the easy half. The hard half arrives later, when the answer comes back and the Runtime has to work out what the model actually meant — against a catalog that may have changed, a token that may look like two different things, and a request nobody kept. The four terms here exist for that second half.

### Context

**Context** is the information a Runtime selects for one computation. It need not be retained afterwards. A **context compiler** is the component that selects, retrieves, redacts and summarizes authorized information for that one request.

The phrase *for one computation* is doing the work, and it is the clause most likely to be read past. Context is a per-request decision and is allowed to be thrown away the moment the request returns. The memory a Runtime keeps between computations is a different subject with different owners, set out under [retained information](state.md#structured-state). Treating the two as one concept is how a system ends up unable to say whether something was remembered or merely shown once.

Readers arriving from provider documentation carry a second meaning of the word, and it does not apply here. In a provider API, "context" usually names the token window — a size. Here it names a selection decision: which authorized things go into this request. The size limit is real and belongs to the provider; the term on this page is about the choosing.

Two negatives bound the term. Selecting information does not grant access to it, and compiling a claim into a context does not assert that the claim is true — an inference that arrives looking like an assertion is a defect in the selection, not a promotion. [Selecting information without changing its status](../mechanisms/context.md#select-information-without-changing-its-status) owns what selection may and may not alter.

### Projection and invocation binding

An **operation projection** renders selected stable [operations](actions.md#operation) as provider-facing names and schemas. A **callable alias** is the name shown to the model, which is not the operation's stable identity. An **invocation binding** fixes, for one invocation, the mapping from each alias to the actual operation or local control it means, together with the relevant contract versions and input state. A **local control** changes Runtime-local planner or scratch state, and keeps its typed origin even when it shares the provider's tool syntax with a mediated operation.

Four terms in one entry, because they only make sense as one mechanism: a model chooses from names it can read, while permission and evidence need names that do not drift.

The failure this prevents is worth walking through on the running example, because a design without the binding looks perfectly reasonable right up until it silently misfires. The Runtime shows the model `publish_report@2` under the alias "Publish this week's report". The model takes ninety seconds to answer. In that gap the catalog is republished, and the same friendly phrase is now attached to `publish_report@3`, whose arguments mean something slightly different. The reply arrives naming a phrase. Resolve it against today's catalog and the Execution publishes under a contract nobody showed anyone. Resolve it through the binding, and the reply means what it meant when it was offered.

The same binding answers a second question that the first one hides. In the provider's tool syntax, the mediated operation `publish_report` and the purely local `note_update` arrive as the same kind of token. Without a recorded origin for each, the two failures are symmetric and both are bad: a note update gets admitted as a mediated action it was never authorized for, or a real publication is quietly executed as a scratch write and nothing reaches the world. Typed origin, retained per invocation, is what keeps a shared namespace from erasing the difference. [Fixing bindings for each invocation](../mechanisms/context.md#fix-bindings-for-each-invocation) owns what a binding retains and what a Runtime does when it cannot reconstruct one.

None of this is permission. Rendering an operation into a catalog shows a model that the operation exists; it authorizes no particular use of it, and [exposure and mediation](actions.md#exposure-and-mediation) owns that distinction in full.

### Invocation snapshot and cache

An **invocation snapshot** preserves enough of a native request and its bindings to interpret the response or to continue the work. A **context cache** is a recomputable optimization.

These two look identical in storage. Both are material kept from an earlier request, both take space, and both are obvious candidates when something needs evicting. They differ entirely in what happens when one is dropped.

Drop a cache and the Runtime recomputes the same thing more slowly. Drop the snapshot for a request whose reply has not arrived, and the reply becomes uninterpretable — there is no longer anything that says which alias meant which operation, or which version of the input the model was reasoning about. The answer is not wrong; it is unreadable. So a snapshot that in-flight work still depends on is not discardable as though it were a cache hit, and an eviction policy that cannot tell the two apart will eventually discard the wrong one.

A provider's prompt cache is neither of these. It is the provider's own optimization, under the provider's control, and it carries no permission with it — content that was cached because it was disclosable once does not become disclosable again by having been cached. [Cache dependencies](../mechanisms/context.md#cache-dependencies) owns what has to be rechecked before any retained copy is reused.

## What a Runtime is allowed to see, and to package

The last three terms answer one question at three different sizes: being shown a thing is not being allowed to act on it. A view shows fields. A Skill manifest shows a list of wants. A service shows a contract. None of the three is a grant, and each gets mistaken for one in its own way.

### View and disclosure

A **view** is a selection of readable fields and objects, and writable targets, authorized for the current principal. **Disclosure** is content, descriptors and metadata actually sent to a Runtime, a model or a remote retrieval service.

They are two words because they behave differently in time, and that asymmetry is the whole reason to keep them apart. A view can be narrowed or revoked, and the next read obeys the change. A disclosure cannot be taken back: once a passage has reached a provider, no later decision by anyone reaches it. Writing both under one word invites the belief that revoking a view retroactively unsends something, and [views and retrieval](../mechanisms/state.md#views-and-retrieval) owns what each of the two actually promises.

Scope labels locate information; they do not grant a view of it. A folder name, an organization label or an ancestry relation tells a retrieval system where something lives, and answers nothing about who may read it. The rule generalizes: the ability to find a thing and the permission to see it are separate facts, and only the second is authority.

Disclosure includes more than the content a reader would think of as the content. Descriptors, counts, ranking influence and internal precondition tokens all leave the boundary with the payload, and each can reveal a change the recipient was never meant to learn — a token whose value differs between two requests announces that something moved, whatever the visible text says. Internal metadata is not automatically safe to expose merely because it is not the subject.

### Skill and package

A runtime **Skill** packages instructions, references, assets or scripts, and optionally a root composition. It can enrich a Runtime, or invoke work, without being an Execution and without being an authority grant. A **package manifest** describes the package's source, version, entry points, bindings and requested requirements.

A Skill is the one thing on this page that arrives from outside the deployment, and everything unusual about it follows from that. Its text will end up inside a model's context. Its scripts will run somewhere. Its manifest will be read by someone deciding what to enable. All three are inputs from a party the deployment does not control.

The manifest is therefore a request, never a grant, and the word *requested* in the definition is load-bearing. A manifest listing `publish_report` is a package saying what it would like to be able to do. It reads like configuration, which is exactly the hazard: configuration is something an operator wrote, and this is something a stranger wrote. Preflight checks whether the things a manifest names are present and resolvable; it does not decide whether they are permitted, and an imported list of allowed tools cannot widen what an Execution may do. [Content is not authority](../mechanisms/authority.md#content-is-not-authority) is the general form of that rule, and [notes, controls and packages](../mechanisms/composition.md#notes-controls-and-packages) owns what a deployment pins before enabling one.

One naming collision needs closing, because this repository contains both kinds. A runtime Skill is the concept defined here. The coding-agent workflow skills under `.agents/skills/` are tooling for people and agents working *on* ArrokothI, and they are not runtime Skills, not Executions, and not part of the architecture this page describes.

### Service and interaction template

A **service** exposes selected input, result and interaction contracts while keeping its implementation private. An **interaction template** supplies parameterized predefined or context input. An **async handle** correlates native external work.

These are the shortest entries on the page because they are, genuinely, labels — but each sits next to a Kernel concept that someone will reach for by mistake, and the three mistakes are different.

A service is not an [operation](actions.md#operation). An operation is a pre-declared contract for one kind of mediated work, and admission, consent and evidence all attach to it. A service is an implementation boundary that may stand behind several operations, or behind none. Treating a service as an operation puts permission and evidence on an object that was never designed to carry them.

An interaction template is not a grant and not a schema amendment. Supplying default or context-derived input shapes what gets asked; it does not widen what may be asked for.

An async handle is not permission and not a [correlation identifier](operations.md#message-request-and-correlation) in the Kernel's sense. It is a native string that lets a Runtime find its own outstanding external work again. Holding one authorizes nothing — the same rule that applies to every identifier in this architecture, and worth restating here because a handle *feels* like a capability in a way that a folder label does not.

None of the three implies a new mandatory Kernel entity, and none requires a portable descriptor hierarchy that every Runtime must adopt.

---

A closing note on how much of this is optional, because the answer is: all of it. A native framework can implement every idea on this page under its own names, or implement none of them, and remain a perfectly correct Runtime — the Kernel will not notice either way. What is not optional is the boundary these words mark. The failures this page exists to prevent are conversational before they are technical: one engineer's *worker* is another's Kernel Worker, a manifest gets read as a grant because it looked like configuration, a branch gets assumed to have the isolation a child Execution has. Each of those starts as two people using one word for two things, and ends as a defect nobody can locate.
