# Runtime roles and context vocabulary

A Runtime preparing the weekly report has many decisions to make that the Kernel never makes for it: how to gather evidence, whether to ask a model another question, which analyses to run together, and what to show the model next. This page names the pieces a Runtime can use to organize those decisions. They describe the work inside the [Execution](core.md#execution), whose identity and accepted lifecycle the Kernel manages.

The distinction lets the application choose useful algorithms without changing its coordination protocol. A report produced by a fixed sequence of functions and a report produced by a team of model-directed workers can both belong to one Execution. Each Runtime receives an [Activation](core.md#activation), performs its internal work, and eventually proposes an [Outcome](core.md#outcome). The Kernel needs that boundary to remain intelligible; it does not need a common representation for everything behind it.

These are optional Runtime concepts. A native framework can supply its own equivalents, and ordinary code can do without most of them. Calling an internal component an Agent, Stage or worker gives it no separate Kernel mailbox, authority binding or lifecycle. Those belong to an Execution explicitly created for independently managed work.

The vocabulary follows three groups of questions:

- **How a Runtime is shaped:** [Agent](#agent), [Workflow](#workflow), [Stage and local branch](#stage-and-local-branch), and [local worker](#local-worker).
- **What a Runtime shows a model and how it reads the reply:** [Context](#context), [projection and invocation binding](#projection-and-invocation-binding), and [invocation snapshot and cache](#invocation-snapshot-and-cache).
- **What a Runtime is allowed to see and to package:** [View and disclosure](#view-and-disclosure), [Skill and package](#skill-and-package), and [service and interaction template](#service-and-interaction-template).

The weekly report will stay with us through all three. First we will choose how its work proceeds, then examine one model request closely, and finally ask what may cross the Runtime's information and capability boundaries. The mechanisms for [local composition](../mechanisms/composition.md) and [context construction](../mechanisms/context.md) specify how these pieces interact.

## Agent

An **Agent** is a Runtime pattern in which a model directs control flow: its response helps decide what work to do next, which available capability to request, or whether enough work has been done.

For the report, the model might examine the available evidence and ask for a missing source. After reading that source, it might revise the outline, request a calculation, or produce a draft. The sequence develops from the model's decisions. The Runtime supplies the loop that presents information, interprets responses and carries the computation forward.

That loop matters as much as the model. A model response proposing publication is still a response to be interpreted. The Runtime determines whether the response is well-formed, resolves any requested callable, and decides what proposal to submit through its own protocol boundary. If publication is Kernel-mediated, the Runtime requests it through an [Effect](actions.md#effect) in an Outcome; the model's text does not itself admit an action.

“Model-directed” also leaves room for firm program structure. The Runtime may restrict the available choices, validate intermediate values, bound iterations or require a particular completion check. An Agent can have a carefully controlled loop while leaving the next useful step to the model. What identifies the pattern is where the choice of subsequent work comes from, rather than how unconstrained the model is.

The Agent's apparent confidence has no special standing at the Kernel boundary. A model saying “published” does not establish publication, and a model saying “finished” does not discharge outstanding required work. The Runtime has to interpret observations and propose a result consistent with the [completion accounting rules](../mechanisms/lifecycle.md#completion-is-an-accounting-check). The quality of that interpretation is a Runtime concern; accepting its Outcome does not certify the quality of its reasoning.

## Workflow

A **Workflow** is a Runtime pattern whose control flow is defined in advance. Its definition determines which steps may follow which, including any branches, loops and conditions.

A report Workflow might gather records, extract claims, validate them, draft the report and request publication. A model can perform the extraction or drafting without choosing the enclosing sequence. A model can also choose among branches the Workflow defines. The presence of a model call therefore tells us little about whether the overall Runtime is an Agent or a Workflow; the useful question is who defines the path through the work.

These patterns can nest. The “investigate missing evidence” step in a Workflow might run an Agent until it returns a bounded result. An Agent might invoke a predefined calculation Workflow. The outer Runtime still owns how that result affects the next step. There is no requirement to classify the entire application once, choose one pattern forever, or expose that choice as a Kernel type.

Predefined control flow does not imply predictable timing or recoverability. A step can await a slow model call, a native service or an internal worker. While the Runtime is doing that work within an unresolved Activation, the Execution remains `RUNNING`. Kernel `WAITING` has a narrower meaning: the Runtime has submitted a dependency the Kernel can observe, and the Kernel has accepted that wait. [Wait, subscription and generation](core.md#wait-subscription-and-generation) explains the boundary.

Similarly, a graph diagram is not a recovery record. Continuing a Workflow after failure requires enough native state to know where it was, which results it had incorporated and which work might still be outstanding. The [Driver](core.md#execution-driver) must establish what the native engine can preserve. Choosing the Workflow pattern does not make those answers follow automatically.

## Stage and local branch

A **Stage** is a named unit of work within a Runtime's composition. It gives the Runtime a place to define inputs, intermediate computation, completion conditions and output. A **local branch** is one path of work within that composition, including a path that runs concurrently with others.

The report's evidence-validation Stage can take extracted claims and produce validated claims with source references. That output can pass directly to the drafting Stage as an ordinary typed value. The transfer needs no new Execution, mailbox Event or model call simply to make the data move. Its meaning belongs to the Runtime that composed both stages.

Naming a Stage is useful because “this function returned” and “this unit of work is finished” can differ. Suppose validation starts two source checks and immediately returns a preliminary list. Drafting from that list would race with the remaining checks. The Runtime needs a completion boundary that says which work must finish and which results must be incorporated before the next Stage uses the output. A Stage name alone supplies no such barrier; the composition must define it.

Branches make that obligation more visible. The report might analyze revenue and support incidents concurrently, then gather both results. Gathering produces two answers. Turning them into one coherent account is additional computation, with its own handling of disagreement or missing evidence. A join cannot silently decide that the later callback is more authoritative, or that one branch's interpretation replaces another's.

The Runtime also owns concurrent mutation. Two local branches writing the same draft file can overwrite each other even though only one Runtime attempt may commit an Outcome. The Kernel's [writer epoch](identity.md#writer-epoch) governs acceptance at the protocol boundary; it does not serialize the branches' filesystem writes. Separate result slots and an explicit merge are ways a Runtime can organize this work. [Forks, joins and corrections](../mechanisms/composition.md#forks-joins-and-corrections) owns the interaction rules, including what happens when input changes during computation.

Stage output is intermediate output until the enclosing Runtime decides what it means for the Execution. Finishing the drafting Stage can leave publication, an editor's response or other required work outstanding. The Runtime must preserve that distinction when it constructs its eventual terminal proposal.

## Local worker

A **local/delegated worker** is a unit of work managed inside a Runtime. The Runtime assigns it work, receives its results and owns the consequences of its failure or delay.

The report's source checker could be a function, another model loop, a subprocess or a job on a remote machine. “Local” describes ownership in the design. It does not require the worker to share a process or computer with its caller. A native framework can manage a large distributed team while the Kernel sees one Execution and one unresolved Activation.

That arrangement keeps the native framework's scheduling and supervision together. Its worker IDs, retry rules and cancellation behavior remain part of the Runtime and its Driver contract. Moving a source checker across a network does not, by itself, make it independently addressable through the Kernel. Conversely, the application can choose to create a [child Execution](operations.md#child-and-ownership) when it needs that checker to have a separate logical lifetime, accepted input, authority binding and accounting.

The choice changes who must remember the work. An internal worker's unresolved request has to remain understandable to its Runtime after any supported recovery. A child Execution has its own Kernel records and leaves explicit ownership and routing obligations between the two Executions. A name such as “research agent” cannot substitute for making this choice: it describes a task role, while the choice determines where responsibility is recorded.

Native work can also outlive the Runtime that launched it. A remote checker may continue after the enclosing Execution is cancelled, or after its host disappears. The Driver's [support record](../mechanisms/integration.md#support-record) must describe the relevant native behavior; Kernel cancellation alone cannot prove the worker stopped. A Runtime's retry or evaluation supervisor belongs on this same side of the boundary unless it explicitly creates or controls Kernel Executions.

Keep this use of worker separate from a [Kernel Worker](operations.md#kernel-worker), which processes Kernel transitions, and an [Execution Host](operations.md#execution-host), which runs Runtime code. One process can perform several roles, but the roles answer different questions about what the process is responsible for.

## Context

**Context** is the information selected for one computation. A **context compiler** is the Runtime component or strategy that assembles that information into a form the computation can consume.

For the report's drafting call, context might include the requested audience, validated claims, selected source excerpts and the current outline. The Runtime may retain much more: every retrieved document, earlier drafts, unsuccessful searches and working notes. Context is the particular selection supplied now. Keeping a record does not require showing it on every call, and omitting it from one request need not delete it from retained state.

The compiler has two constraints to satisfy together. It needs to select information useful for the computation, and it needs to preserve the meaning of what it selects. Reducing a long source to an excerpt is reasonable if the model can tell it is an excerpt. Turning “the analyst suspects a decline” into “revenue declined” changes an inference into an assertion. The second transformation is not merely more aggressive compression; it changes the evidence available to the computation.

The same care applies to absence. If retrieval could not access a source, the context should not present that gap as evidence that the source contains no relevant information. If two sources disagree, selecting only the convenient one can conceal the unresolved disagreement. These are quality failures with architectural consequences: a later decision may look well supported because the context removed the facts that would have made it uncertain.

Selection begins with information the recipient may receive. Ranking something as relevant cannot authorize its disclosure, and a compiler must not retrieve private material into a remote model request merely to decide whether it would be useful. [View and disclosure](#view-and-disclosure) below define that access boundary. Within it, the Runtime can choose retrieval, redaction, summarization and formatting strategies suited to its model or native framework.

A context compiler need not be a separate service or produce a universal intermediate format. It can be a function assembling a request, or a native framework's existing context machinery. The design requires preserved distinctions, not a shared prompt representation. [Selecting information without changing its status](../mechanisms/context.md#select-information-without-changing-its-status) specifies what selection and compaction must keep intact.

## Projection and invocation binding

An **operation projection** is a model-facing presentation of an available operation: the name, description and argument shape through which the model can propose using it. A **callable alias** is the name used in that presentation. An **invocation binding** records what that alias means for a particular model invocation.

These terms separate the durable meaning of a capability from the words chosen to make it usable. An application can have a stable, versioned [operation](actions.md#operation) for searching its report archive while presenting the concise alias `search_reports` to a model. The projection helps the model choose and form a request. The binding lets the Runtime interpret the returned choice against the exact target and version that were presented.

Time makes the binding necessary. Suppose the Runtime sends a request exposing `search_reports` as the internal archive search. While the model is computing, the application changes its current catalog so that the same alias refers to another service. The delayed response belongs to the earlier request. Looking up its alias in today's catalog would silently change what the model selected.

The Runtime therefore resolves that response through the binding retained for its invocation. If the binding cannot be reconstructed, choosing the current catalog entry is a guess about meaning. A stable alias string is insufficient because the string was only one part of the presentation. [Fixing bindings for each invocation](../mechanisms/context.md#fix-bindings-for-each-invocation) owns the exact retention and collision rules.

Preserving meaning does not preserve permission indefinitely. A response can still refer unambiguously to the old archive operation after access to that archive has been revoked. The Runtime can know exactly what was requested while the action is refused under current policy. Binding answers what the request means; [admission](actions.md#admission-and-physical-action-attempt) answers whether that request may proceed.

A **local control** is a callable instruction handled by the Runtime's own machinery, such as updating a working note. A provider may encode that instruction using the same tool-call syntax it uses for a projected operation. The Runtime must retain the callable's origin so that shared syntax does not erase the distinction.

For example, `remember_outline` might update the report Runtime's scratch state, while `publish_report` proposes a Kernel-mediated action. Both can appear in one native model request. Interpreting the response requires knowing which path the named callable belongs to; the Runtime cannot infer the path from the fact that the provider returned a “tool call.” A discovered external tool likewise cannot become an internal control merely by claiming a familiar name.

Projection is also separate from enforcement. Showing `publish_report` makes publication discoverable. It neither grants authority to publish nor ensures that all native publication paths pass through the Kernel. [Exposure and mediation](actions.md#exposure-and-mediation) explains those action boundaries; the projection's job is to make an available choice understandable without changing its contract.

## Invocation snapshot and cache

An **invocation snapshot** retains the information needed to interpret and, where supported, continue a particular model invocation. A **context cache** retains material so that future context construction can reuse work.

The difference is the consequence of losing the material. If an archive index cache disappears, the Runtime may be able to build it again. If the only copy of an in-flight invocation's alias binding disappears, a later response may no longer have a recoverable meaning. Both records can be held in the same storage system; their obligations remain different.

The report invocation needs more than its user-visible prompt text. Its snapshot associates the request with the relevant input or state version, the selected information or references, the callable bindings and the provider/model configuration. Those associations explain which computation a response belongs to. A correction to the report received during the call does not retroactively change the input the model saw. The Runtime must decide how to use, discard or recompute the old result in light of that correction.

An invocation snapshot also has a different scope from an Activation. One Activation can contain several model calls, calculations and local worker exchanges before the Runtime yields an Outcome. Retaining the Activation's input does not reconstruct every intermediate model request or its bindings. That native continuation belongs to the Runtime and its [recovery contract](state.md#recovery-and-re-execution).

Calling retained material a snapshot does not establish that a lost computation can be replayed safely. A native model request may already have run, incurred cost or triggered native work. Its exact prompt may include provider-controlled scaffolding the adapter cannot inspect. The support contract must state what can be reconstructed and what evidence makes resumption or retransmission safe; fresh computation must be identified as fresh computation.

Caches bring a separate problem: permission and freshness can change while the cached content stays the same. An excerpt authorized for yesterday's report is not automatically authorized for a new request today. Reuse must account for the source version, intended audience and current disclosure conditions. A cache hit can avoid recomputation, but it cannot avoid the decision about whether the material may enter this request. [Cache dependencies](../mechanisms/context.md#cache-dependencies) describes the lifetimes and checks for the different retained forms.

## View and disclosure

A **view** is an authorized selection of information available to a particular reader or computation. **Disclosure** is making information available to a recipient, including a model provider or another service.

A view gives access control a more precise subject than “the report data.” The drafting model might receive validated claims and source excerpts, while an operator can inspect diagnostic records that contain additional details. Those readers have different purposes and permissions. A reference to the same report does not mean both may see every field associated with it.

Context construction operates within such a view and then chooses what is useful for the current computation. The two selections answer different questions. Authorization can permit ten source documents while the compiler selects three relevant excerpts. Relevance can narrow what is sent, but it cannot enlarge what the recipient is entitled to receive.

Scope labels help locate information; they do not grant access. A file marked “organization,” a note attached to an Execution or an artifact inherited from a parent still needs an access decision for the actual recipient. Ancestry is particularly easy to overread: work can belong to the same family while having different authority and disclosure limits. Copying a reference into a child's input does not by itself give the child access to the referenced bytes.

Disclosure includes more than the returned document body. A search query sent to a remote embedding service can reveal a confidential topic. Result counts or snippets can reveal the presence of records that the reader cannot open. The retrieval path therefore needs to consider what each recipient learns along the way, rather than treating the final document read as its only access boundary. [Views and retrieval](../mechanisms/state.md#views-and-retrieval) owns those rules.

Revocation governs subsequent access and disclosure. It cannot make a provider forget text it already received. Retained copies, provider caches and logs follow their respective retention contracts, which is why the application must consider the recipient before sending material. Information selection can reduce exposure, but it does not undo an earlier disclosure.

## Skill and package

A **Skill** is reusable material that helps a Runtime perform a task. It can supply instructions, resources or an entry into a composition, depending on the Runtime and the form in which it is packaged. A **package manifest** describes that material and the requirements for using it.

A report-writing Skill might contain an editorial method, templates and a validation script. An instruction-only use loads the editorial method into the existing Runtime. A composition-backed use might run a defined sequence of extraction and validation work. Both can help with the same task, but importing the first form does not automatically reproduce the behavior of the second.

The manifest lets the host identify what it is loading and assess whether it can use it: source and publisher, version, entry points, input bindings, requested operations or resources, and relevant Runtime or isolation requirements. Those declarations support preflight checks. They let an application discover a missing script runner before beginning work, for example, rather than discovering it after a model has planned around that script.

Requirements are requests to the host. A package saying it needs archive access cannot grant itself archive access, and an imported `allowed-tools` list cannot widen an Execution's authority. The host evaluates what the package requests against the actual permissions and execution profile. A successful compatibility check still does not predict every later policy decision for dynamically chosen arguments.

Packaging also creates an information boundary. Reusable material should not carry the author's credentials, a live local session or private working memory into another application. Descriptions and instructions remain content to interpret, while scripts run under the declared execution profile. A package name is no substitute for knowing which version was loaded or which code receives native capabilities.

Loading can be gradual: metadata for discovery, instructions when selected, and assets when needed. That is a context strategy, rather than a requirement for a universal Skill registry or file format. A native framework can preserve its own packaging. When exporting a composition as plain instructions would lose executable behavior, the export must disclose that loss or expose the composition through an appropriate service. [Notes, controls and packages](../mechanisms/composition.md#notes-controls-and-packages) owns these composition rules.

Here, Skill names a Runtime concept. The repository's `.agents/skills/` directory contains instructions for coding agents working on this repository; its existence does not define the Runtime packaging contract.

## Service and interaction template

A **service** exposes a selected capability through a declared external contract. An **interaction template** describes an intended pattern of interaction with that capability, such as requesting work, receiving a result or returning input when the work asks for it.

The report composition can be packaged for use inside another Runtime, or exposed as a service that accepts report requests. The service boundary lets the implementation keep its model loop, graph and native memory private. A caller needs the supported request and result contract, along with the rules for authentication and subsequent interaction. It does not need a remote representation of every Stage.

A template makes that interaction understandable before a particular request exists. For example, “request a report, inspect its progress, provide a clarification if asked, then retrieve the result” describes a useful pattern. It does not establish that the result is already available, that a clarification has been accepted, or that the caller has permission to perform every step. Each actual interaction still has its own identity, authorization and evidence.

An **async handle** is a reference returned so that a caller can identify ongoing work in later interactions. For a long-running report, it may let the caller address supported inspection, input, cancellation or result-retrieval operations. Which operations exist, and what each response establishes, belong to the service contract.

Receiving a handle establishes less than receiving a completed report. The underlying work may still be running, waiting for information or unable to continue. Nor does possession of the handle establish permission to inspect private state or send input. The service authenticates and authorizes the later interaction; a trace identifier or correlation value cannot become a bearer permission by convenience.

External protocols may have their own vocabulary for agents, tasks, tools and sessions. An adapter maps the selected public contract while preserving these distinctions. It must not expose private memory or arbitrary internal callables merely because they are discoverable inside the Runtime. [External protocol mapping](../mechanisms/external-protocols.md) owns import and export behavior, including the difference between transport acknowledgment, ongoing work and final result.

The report can thus remain one Execution while its Runtime evolves from a simple Workflow into an Agent with delegated workers, specialized context construction and packaged methods. What has to stay explicit is who owns each decision and what each boundary promises. The Runtime organizes computation; the service declares what callers may request; the Kernel records the accepted coordination facts on which those requests rely.
