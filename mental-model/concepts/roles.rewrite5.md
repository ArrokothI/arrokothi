# Runtime roles and context vocabulary

The [core vocabulary](core.md) names what the [Kernel](core.md#kernel) decides. This page names what a [Runtime](core.md#execution-runtime) builds inside itself while it does the work: the shape an application gives its Runtime, the material it puts in front of a model, and what it may read or carry in from outside.

One rule holds every term here together, and it is worth stating before any of the terms rather than after all of them: **a Runtime-internal structure has no Kernel mailbox, authority or lifecycle of its own.** An Agent is not a kind of Execution. A Stage is not a lifecycle state. A callable alias is not a grant. A Skill manifest is not permission. Whichever of these patterns assembled a Runtime, the Kernel sees one Execution, exchanged one Activation at a time.

That rule is a decision rather than an omission, and its reason is the same one that keeps the Kernel's own job small. An earlier design in this project made Agent and Workflow Kernel-visible kinds and left Stage boundaries for the Kernel to enforce. That arrangement asked the Kernel to stay correct about control flow inside code it cannot see, and it bought nothing the Kernel needs: whether a model or an author chose the next step changes nothing about what has been accepted. The [architecture review](../../docs/development/004-architecture-review.md#decisions-and-strongest-counterexamples) records what was retired and why; what survived is this vocabulary, on the Runtime's side of the boundary.

Two limits on the page's scope follow from that.

The vocabulary is *optional*. A Runtime can be a fifty-line function or a whole third-party framework, and neither has to adopt these names; a foreign Runtime keeps its own composition, its own context handling and its own packaging. Where an ArrokothI-shaped Runtime is useful, these are the words it uses, and [local composition](../mechanisms/composition.md) and [context construction](../mechanisms/context.md) describe the mechanisms built on them. Those mechanism pages carry the Status lines that say which parts are optional and which gates the binding and disclosure rules belong to; a concept page states no status at all, because a term is not a promise to build anything ([Target, not shipped](../README.md#target-not-shipped)).

Most of the words are also *borrowed*, and that shapes how each section reads. *Agent*, *Workflow*, *context*, *Skill*, *service* and *template* all arrive from other systems with associations already attached, and a good part of this page's work is saying which of those associations survive the trip. One of them matters in three different groups and is worth flagging here: none of these things grants anything. Naming an operation, showing it to a model, packaging instructions that ask for it, or describing it in a service interface are all acts of selection. Permission comes from a principal and a policy, and the Kernel decides it at admission.

## A first example

The weekly report from the [core vocabulary](core.md#a-first-example) runs on a Runtime. Suppose the application shaped that Runtime as an **Agent**: on each Activation a model reads the situation and decides what the report should do next. Nothing about the exchange changes. The Activation still asks one question — advance this Execution from this saved progress, taking these Events into account — and the Outcome still answers with progress, output and any Effects. The Kernel cannot tell whether a model or a `switch` wrote that answer, and everything defined below lives on the Runtime's side of it.

One exchange shows why the vocabulary is needed. The report has reached a drafted state, and the Runtime wants the model to be able to do two things: publish the draft, and note an editorial detail for later. The model sees both as callables in one list, written in the same provider syntax — *Publish this week's report* and *Remember this*. Only one of them asks the Kernel to mediate an external action; the other changes the Runtime's own scratch state. The names sit side by side in one list, and their consequences do not, which is the whole reason [local controls](#local-controls) have a name.

The model picks the publication name, and the Runtime translates the answer back through the mapping it actually sent. The reply is read against the alias the model saw, never against whatever the catalog offers under that name later — otherwise the same word could settle on a different operation, and the model's decision would quietly become a different action. Holding that mapping for as long as the reply can arrive is not bookkeeping; it is what makes the reply mean anything.

A few more words are in play at the same time, and they are easy to blur into one:

- what the model was shown — a **context**, assembled for that one request from Events, the draft and working notes, shortened, reordered and partly withheld;
- what the Runtime kept so that the answer would still mean something when it arrived — an **invocation snapshot**;
- what a dashboard may read about the report afterwards — a **view** over accepted output, authorized when the dashboard asks for it;
- and the drafting instructions the Runtime loaded in the first place — a **package** carrying a **Skill**, pinned by publisher and version, declaring what it wants and granting nothing.

None of those names a Kernel object, and that is the point of the page. The terms below fall into three groups, which are three different questions rather than one progression:

- **How a Runtime is shaped** — [Agent](#agent), [Workflow](#workflow), [Stage and local branch](#stage-and-local-branch), [local worker](#local-worker).
- **What it shows a model and how it reads the reply** — [Context](#context), [projection and invocation binding](#projection-and-invocation-binding), [invocation snapshot and cache](#invocation-snapshot-and-cache).
- **What it is allowed to see and to package** — [view and disclosure](#view-and-disclosure), [Skill and package](#skill-and-package), [service and interaction template](#service-and-interaction-template).

Within a group the terms build on each other; across groups they answer unrelated questions, and knowing how a Runtime is shaped tells you nothing about what it discloses. The connections that do exist between groups belong to mechanism pages — context selection, for instance, answers to the disclosure rules named in the last group.

## How a Runtime is shaped

These four terms describe the inside of one Runtime: the pattern of its control flow and the pieces it is built from. They matter because they are how an application talks about its own work, and because none of them reaches the Kernel on its own. No shape described here changes an Activation, an Outcome, or anything the Kernel records; whatever a Runtime wants remembered out of one of these structures has to be expressed in accepted state.

### Agent

An **Agent** is a Runtime whose next piece of work is chosen at run time by a model or a policy, rather than fixed in advance by whoever wrote the Runtime.

The category is a *shape of a Runtime*, not a Kernel type and not a kind of Execution. What makes something an Agent is where the next step comes from: an open-ended decision made while the work is running. Call counts do not decide the category, and using ordinary functions does not disqualify a Runtime from being one; a Runtime that consults a model once, at a single fixed step of an otherwise authored pipeline, is not thereby an Agent.

Why an application would pick this shape is usually obvious — it wants the model to decide. What needs saying is the design consequence of the Kernel not being able to see that decision. Everything an Agent decides becomes durable only by being expressed in the objects the Kernel does keep: accepted [progress](state.md#progress), [Effects](actions.md#effect), [waits](core.md#wait-subscription-and-generation) and [output](actions.md#emission-result-and-output-obligation). A decision that stays inside the loop and reaches none of those does not exist as far as any later exchange is concerned; the next Activation that cannot reconstruct it will simply make it again.

An Agent is not a principal either. It acts under the Execution's authority binding, and a model's opinion about what should be allowed changes nothing about what is allowed. That question is settled where every authority question is settled: by a principal, a policy and any required consent ([principal and authority](actions.md#principal-and-authority), [content is not authority](../mechanisms/authority.md#content-is-not-authority)).

The shape also says nothing about scale. A Runtime can be one function that asks a model a single open-ended question, and a whole multi-agent application — planner, retriever, evaluator and all — can remain one Agent-shaped Runtime behind one Execution. Both are consistent with the boundary, because the boundary is not about how much is inside the Runtime; it is about which decisions have to become accepted state. [Runtime](../runtime.md) describes how native structure of either size stays opaque without going unrecorded.

### Workflow

A **Workflow** is a Runtime whose allowed control flow was fixed in advance by its author. The Runtime may loop, branch on data, and call models inside those steps; what was decided ahead of time is the topology — which step can follow which.

The difference between an Agent and a Workflow is therefore one question: who chooses the next step, the author or a decision made during this run. It is not a difference in intelligence, model use or difficulty. A Workflow may hand a model a set of authored branches to choose among, and an Agent may spend most of its life calling deterministic functions in a fixed order; both still belong to the category their control decision belongs to.

The word does not require a drawn graph. Ordinary code whose control flow is written out in advance is a Workflow in this sense, whether it is a function, a script or a node graph with explicit edges. What the vocabulary tracks is the authoring decision, not the diagram.

A Workflow's structure is its own business, in a sharper sense than the other terms here. When a Runtime splits into pieces, the Kernel still accepts one writer's progress per Execution, and that single-writer rule fences which attempt may commit; it does not order the pieces, serialize what they touch, or notice when one is still running. So the rules that keep a composition honest — completed work accounted for, branches isolated, joins explicit — all live on the Runtime side, and [local composition](../mechanisms/composition.md#forks-joins-and-corrections) owns them. Their absence would be invisible from the outside: nothing about accepted state would reveal that two branches wrote the same file.

What a Workflow is not is equally important. It is not a Kernel scheduler, and a Workflow does not make its steps Kernel-visible. If a piece of work inside a Runtime needs its own identity, its own authority and its own recovery decision, that requirement makes it an [Execution](core.md#execution) — a deliberate choice about what the application manages, not an automatic promotion of every piece of a graph.

### Stage and local branch

A **Stage** is a bounded local unit of work inside a Runtime: it takes typed input, computes, produces output, and hands control onward through a transition the Runtime's author wrote. A **local branch** is one of several Stages that run concurrently within the same Execution.

Neither has a Kernel mailbox, authority or lifecycle. That is precisely why the terms exist. Activation and Outcome are too coarse to describe what a composition does step by step, and treating each piece as its own Execution would put identity, authority and recovery obligations on work the application never wanted to manage separately.

The vocabulary is load-bearing because composition fails quietly, and two of those quiet failures motivate most of the rules the mechanism page states. The first is the completion barrier: a Stage that starts non-blocking work and returns looks exactly like a Stage that waited for it. Nothing in the return tells the difference, so continuing work has to have a named owner that will carry its result or its failure into the transition — a function returning is not evidence that everything it started has finished. The second is branch isolation. Branches inside one Runtime share a process, files and rows, and the Kernel protects none of them — so input is captured at the fork, each branch gets separate progress, scratch and result slots, and the join is explicit and in the order the author declared. [Typed work and completion barriers](../mechanisms/composition.md#typed-work-and-completion-barriers) and [forks, joins and corrections](../mechanisms/composition.md#forks-joins-and-corrections) own the details.

One boundary around values is easy to over-read. Inside a Runtime, values flow as the Runtime's own types: a small object passing from an extraction Stage to a validation Stage is a plain function call or graph edge. The [boundary value](values.md#boundary-value-and-root) rules and [fixed semantic limits](values.md#fixed-semantic-limits) govern data where it crosses the Kernel protocol, not data moving between a Runtime's own steps. A Stage's output is also not automatically the Execution's terminal result; keeping the two distinct is what lets a composition finish its local work without claiming the Execution has answered.

### Local worker

A **local worker** is a piece of work the Runtime runs itself or delegates to its own machinery: a thread, an in-process task, a job on a queue the Runtime owns, a child task inside a native framework. It is internal work, and it is invisible to the Kernel.

Three different things are called *worker* in this vocabulary, and it is worth paying for the disambiguation once. A [Kernel Worker](operations.md#kernel-worker) is a process role that performs Kernel transitions. An [Execution Host](operations.md#execution-host) is a process role that runs Runtime code. A local worker is neither: it is the Runtime's own help, and it has no identity the Kernel will ever name.

The question that decides which one a given piece of work is has nothing to do with size: does it need to be independently addressable — inspected, cancelled, resumed or accounted for on its own? If the answer is yes, it does not belong in this section. That requirement makes it an Execution, and [child and ownership](operations.md#child-and-ownership) covers how one Execution comes to be responsible for another.

Keeping work local has a consequence worth stating plainly, because it is easy to assume the Kernel somehow tracks it. The Kernel learns nothing about a local worker: not that it started, not that it failed, not that it is still running after the exchange that launched it has been closed. Everything the Kernel will ever know about it arrives in the next accepted Outcome, where the Runtime reports honestly what it can resume. That is where the difference between a checkpoint and a locator earns its keep: a native handle proves that something was allocated, not that the work behind it can continue ([progress](state.md#progress), [checkpoint and locator](state.md#checkpoint-and-locator)).

## What a Runtime shows a model and how it reads the reply

A model request has two sides: choosing what the model may see, and reading back what it chose. The first side fails when selection quietly changes what something *is*; the second fails when a name is resolved against a different catalog than the one the model saw. The terms below keep those two failures apart. All of them sit upstream of authority: showing, naming and caching change what a Runtime proposes, never what the Kernel admits.

### Context

A **Context** is the information a Runtime selects for one computation, usually one model request. It is assembled rather than accumulated, and it need not be retained after the computation it served.

A **context compiler** is the part of a Runtime that assembles one. It selects, retrieves, redacts and summarizes from sources the Execution is authorized to use: accepted [Events](core.md#event), the native transcript, [structured state](state.md#structured-state), [working notes](state.md#working-notes), [inferred claims](state.md#derived-semantic-memory), artifact excerpts and instructions.

Selection may shorten, reorder and redact. It may not change what a thing is, and three consequences of that rule do most of the work:

- An inferred claim must not arrive looking like a recorded fact.
- A truncation must not arrive looking like the whole.
- A record that is missing must not arrive as evidence that nothing happened.

The last two are opposite instructions to whoever reads the context — one says "I do not have this", the other says "there is nothing to have" — and a context that drops the distinction gets a confident answer built on the gap. [Selecting information without changing its status](../mechanisms/context.md#select-information-without-changing-its-status) owns that rule and the provenance markers that carry it.

Context is not memory, and it is not permission. Memory is what somebody retained across computations ([state](state.md)); context is what this one computation was shown, and forgetting it afterward is normal. Neither is a grant: a summary can inform a proposal, and a note can read like an approval, but what the Kernel admits is decided by [authority](../mechanisms/authority.md#content-is-not-authority), never by content that arrived beside the request.

Because a context is assembled from information a Runtime is authorized to use, the selection answers to the same disclosure decisions as any other showing of content. That connection is the third group's subject, and [context construction](../mechanisms/context.md) owns the rules for building one, caching its inputs and keeping disclosure and binding honest.

### Projection and invocation binding

When a model is asked to act, it chooses from names it can read. Permission and evidence attach to something else: the stable identity of an [operation](actions.md#operation), with its revisions. An **operation projection** renders selected stable operations as provider-facing names and schemas for one audience, and a **callable alias** is the particular name a model saw in one request.

The distinction between an alias and an operation sounds cosmetic and is not. A projection may display `publish_report` to a model as "Publish this week's report"; the same operation may be projected differently tomorrow, or not at all, and a different operation may later be shown under a similar name. So the alias is not the operation — it is a rendering of it for one request. What keeps the two connected is the **invocation binding**: the record of what the Runtime showed the model and which stable target each name resolved to, together with the versions and pinned inputs that choice depended on.

```text
model sees "Publish this week's report"        ← callable alias, one rendering
        │  the reply arrives later
        ▼
invocation binding: alias → publish_report @ revision 3, pinned arguments
```

The binding exists to make a late reply interpretable. A model that chose "Publish this week's report" chose one specific operation, and if its answer is read against a newer catalog, that same word can point somewhere else. So the reply resolves through the mapping the model saw, or it is refused; ambiguous aliases are refused before the request goes out, or given collision-safe names, because a name that cannot be resolved back is not a binding at all. [Fix bindings for each invocation](../mechanisms/context.md#fix-bindings-for-each-invocation) owns the retained fields and the refusal rules.

A projection is not a call path, and it is not a permission. Showing a model that an operation exists authorizes nothing; the actual request still crosses the Kernel boundary as an [Effect](actions.md#effect) inside the Runtime's next Outcome, and the Kernel's decision comes back as an Event. An adapter that cannot reconstruct what a model saw refuses the portability claim rather than guessing at the latest catalog.

#### Local controls

A **local control** is a callable a Runtime offers that changes its own planner or scratch state — "remember this", "mark this step done", "switch to the short list". It is not a mediated operation: it produces no Effect, asks for no admission, and has no external consequence.

Local controls need their own name because provider tool syntax does not separate them from anything else. A model can see a note-update control listed beside a governed operation, in the same call format, with an equally plausible name; the list is one namespace even though the consequences are not. So the typed origin is preserved anyway: a scratch write cannot masquerade as a mediated action, and something discovered from a provider cannot mint a local control. If that distinction is lost where the callables are rendered, nothing later can recover it, because the call itself arrives with nothing but a name and arguments. [Notes, controls and packages](../mechanisms/composition.md#notes-controls-and-packages) owns the composition side of the same distinction.

The reason to keep them apart is the size of the difference. A local control changes what the Runtime will propose next, and the Runtime can undo it. A mediated operation asks the Kernel to authorize an external action, and by the time it is admitted, undoing may no longer be available to anyone — [withdrawal and compensation](actions.md#withdrawal-and-compensation) exist precisely because external history is not rolled back. Two calls that look alike in a model's tool list are not alike in what can still be repaired.

### Invocation snapshot and cache

An **invocation snapshot** is the state a Runtime must keep in order to interpret one in-flight model invocation. A **context cache** is a copy kept to avoid recomputing something that can be recomputed.

The difference shows up when each is discarded. Throwing away a cache costs work. Throwing away a snapshot can make an answer meaningless: when the reply finally arrives, the Runtime needs the alias mapping, the versions and the selected inputs it sent, or it cannot say what the model answered. That is why a binding snapshot has a continuation lifetime — it lives as long as something will still be read against it — while a catalog index, a selected-context cache and a provider prompt cache can be dropped the moment they are stale. [Cache dependencies](../mechanisms/context.md#cache-dependencies) lists what may be reused and what has to be rechecked first.

Two consequences follow, and they fail in opposite directions. First, permission and freshness do not travel inside a copy: an item was allowed then, under a scope and a disclosure decision that a copy does not restate, so reusing it means checking again. A cached catalog or stale exposure view cannot authorize arguments, and content that has since been revoked cannot re-enter a new request merely because a copy of it exists. Second, an optimization must not be described as a replay: retransmitting a pinned request is native-retry business with its own safety and current-disclosure checks, and computing fresh from the same sources builds a new snapshot rather than replaying the old one.

## What a Runtime is allowed to see and to package

The last three terms cover visibility and portability: what a reader or a model provider may be shown, what a Runtime may load in from outside, and how an interface to work elsewhere is described. Each one is a place where a familiar word normally means "the capability itself"; here each is only a description, a request or a name for something that still has to be decided elsewhere.

### View and disclosure

A **view** is a filtered read surface: some part of what an Execution or an application holds, presented to a reader within a stated scope. **Disclosure** is the decision to make specific content visible to a specific reader or provider.

The rule that binds them is short: a scope label locates what a reader is looking at; it does not authorize the reading. A view described as "this Execution's output" names the slice, not the right to see it, and an authorized read is checked when it is made rather than inferred from the shape of the surface. The same holds one level down: an [output cursor](operations.md#observation-cursor-and-routing) identifies a view and a position within it, so reconnecting is authorized afresh — holding a position is not holding a permission. [Observing output](../mechanisms/output.md#authorized-subscriptions-and-replay) owns replay, resumption and what a filtered view must not leak indirectly.

Disclosure reaches further than callers, which is why the term appears on a model-facing page at all. Sending selected metadata to a model or a search provider is itself a disclosure that must be authorized before anything is ranked or sent, so a cached catalog or a stale exposure view cannot authorize the sending either. Discovery stays inside the same authorized metadata scope, which is what keeps "the model can find it" from quietly widening into "the model may see it". [Discovery and observations](../mechanisms/context.md#discovery-and-observations) owns that boundary, and [exposure and mediation](actions.md#exposure-and-mediation) owns the general rule that exposure is not permission.

### Skill and package

A **Skill** packages reusable behavior for a Runtime: instructions, usually with references, assets, scripts and an optional composition with its entry points. A **package** is how a Skill travels — the content plus a manifest that describes it.

The vocabulary exists because Runtimes often need to load behavior they did not ship with, and the ecosystem words for that each carry a different set of promises. The first thing to fix is what a Skill is not: it is authoring content loaded into a Runtime, not an Execution, not an [operation](actions.md#operation), and not a grant.

That last point is where the design decision sits. A manifest may declare a great deal: publisher and source, version, entry points, input and default bindings, the operations and resources the Skill wants, the Runtime and isolation requirements it expects. Every one of those declarations is a *request* a deployment answers, not a permission that travels with the package. A package that declares `publish_report` among its wanted operations does not thereby get to publish; authority still comes from the principal, the policy and any consent the action requires, because content is never authority. The alternative — treating a manifest as self-service authority — was rejected, and the reason is structural: a package arrives with the work, so anything a manifest could grant would be grantable by whoever wrote the package. [Notes, controls and packages](../mechanisms/composition.md#notes-controls-and-packages) states the rule and the preflight checks that go with it.

What may travel in a package is correspondingly narrow. Descriptions and reference documents remain untrusted content however authoritative they read; scripts require the execution profile the deployment declares; credentials, local sessions and private memory do not belong in a package at all, because a package is content to be shared and those are not. Which parts load when — metadata first, instructions on use, assets on demand — is a context strategy, not a permission model. [External protocols](../mechanisms/external-protocols.md#mapping-worksheet) owns what happens when a composition-backed Skill is exported to an instruction-only format: the export must declare the execution semantics it loses, or expose a service in their place.

Two boundaries keep the term from growing beyond what it needs to be. No universal Skill schema, registry or signing service is required by this design; a Skill is a package with a manifest, and deployments decide how much machinery they want around it. And the name collides with this repository's own `.agents/skills/`, which are instruction files for coding agents working on this codebase — useful tooling, and not the architecture concept this section defines.

### Service and interaction template

A **service** exposes selected inputs, results and interaction contracts while keeping its implementation private: its definition, its tools and its private state stay behind the interface. An **interaction template** is parameterized content that supplies input or context for an interaction. An **async handle** correlates work that outlives the request that started it.

These three arrive together from the integration side, where every protocol gives them a slightly different meaning, and they are kept because adapters need the distinctions — not because any of them is a Kernel type. Mapping one of them onto a Kernel object without checking what it actually owns produces exactly the class of error this page exists to prevent. A remote task that is one operation's handle stays one Effect with an adapter-owned handle. A managed native job may legitimately be a whole Execution. And a service interface that looks like a durable object is not one. [Mapping external protocols](../mechanisms/external-protocols.md#mapping-worksheet) owns the per-surface detail.

The rules that matter here are all about what these things are not:

- Discovering or importing a service cannot grant authority, copy its credentials into a Runtime, or authorize destinations the server picks.
- A template is untrusted content with explicit parameters; its arrival never widens permission.
- A handle is an identifier, so holding one authorizes nothing — not resolving it, not inspecting behind it, not settling it.

Identifiers carried across a boundary are not bearer permissions — a rule that applies to trace IDs and correlation IDs as much as to async handles ([import and export](../mechanisms/external-protocols.md#import-and-export), [message, request and correlation](operations.md#message-request-and-correlation)).

Where these three live follows from what they are. A service is a description placed at an adapter, application or Driver boundary; an interaction template is content an adapter or application owns; an async handle is an adapter's correlation for work it started. None of them becomes an additional writer of Kernel lifecycle, and a service can be built entirely out of ordinary [operations](actions.md#operation) and [resources](state.md#resource-binding-and-attachment) without the Kernel learning a new word.

## Where these terms stop

The Kernel's record contains Executions, Activations, Outcomes, Events, waits, authority decisions, Effects and the accepted states built from them. It contains no Agents, Workflows, Stages, branches, contexts, projections, aliases, snapshots, views, Skills, services or templates. Nothing on this page appears in a batch, an Outcome or a receipt, and no term here can be used to ask the Kernel a question it is able to answer.

That gives each concept on this page a translation step, and the step is a design decision every time it is taken. Anything a Runtime wants the Kernel to know must be expressed in objects the Kernel keeps: continue from this progress, request this Effect, wait for this observation, make this output available. If something cannot be expressed that way, then either the Kernel does not need to know it — which is the usual case, and why native structure stays native — or the work was identified at the wrong level and probably wants its own Execution.

None of these terms is a permission, and in each group the same rule takes a different shape:

- A projection shows an operation without granting it.
- A context selects information without changing what it may be used for.
- A view describes a slice of somebody's data without authorizing the read.
- A Skill requests capabilities without receiving them.
- A service publishes an interface without publishing authority.

Permission is decided where it always is: by a principal, under a policy, with consent when the action requires it, and the Kernel decides it at admission.

Finally, having no Kernel lifecycle is not the same as having no consequences. A local worker that keeps running, a native session that keeps mutating, a snapshot that no longer exists and a cached copy that outlived its permission all change what a Runtime can honestly resume. Honesty about resuming is exactly what [progress](state.md#progress) and [recovery](../mechanisms/recovery.md) are built on. The Kernel cannot see any of those things. It can only refuse to accept a claim that overstates them.