# Reference index

Start with [the overview](README.md), then [Kernel](kernel.md), [Runtime](runtime.md), [Driver](driver.md) and [Deployment](deployment.md). This page is the **lookup table**, for someone who already knows the architecture and wants one term or one page. If you are learning Layer 3 for the first time instead, the reading paths live with the pages they order: [`concepts/README.md`](concepts/README.md) and [`mechanisms/README.md`](mechanisms/README.md). Layer 3 is precise target/reference material; the [roadmap mapping](roadmap.md) identifies implementation owners and gates.

## Where the reading order lives

Each directory's README owns its own reading path, says what every page in it does, and gives the reason each page sits where it does:

- [`concepts/README.md`](concepts/README.md) — seven pages in dependency order, `core` first.
- [`mechanisms/README.md`](mechanisms/README.md) — sixteen pages in six groups, `creation` first.

Both orders track actual term dependency, not alphabetical or directory order, so opening the folders in a file browser will not give you either sequence. The “Find a mechanism” table below lists the mechanism pages in that same reading order, so it doubles as a lookup for anyone who already knows the architecture.

Not every mechanism has a matching concept page and vice versa: `context` is a mechanism with no `concepts/context.md`, because its vocabulary lives in `concepts/roles.md` instead. The reverse also happens. Matching basenames (`actions`, `state`) mean the subject was large enough to split; they are not a promise that every subject splits.

## How pages are named

Three conventions, so a path tells you what you are opening.

- **`concepts/` owns canonical vocabulary and its local invariants; `mechanisms/` owns how several concepts interact.** This is closer to the real split than “concepts define, mechanisms compose”: `concepts/values.md` states the actual canonical-encoding algorithm, and `concepts/identity.md` states substantive epoch/duplicate/retention rules, not bare definitions. Where a subject splits across both directories — `actions` and `state` — the concept page is the sole definition of the terms and the mechanism page is the sole specification of how they interact. The shared name is deliberate; the directory says which half you are in.
- **Layer-2 files use the short names.** `runtime.md` and `driver.md` cover the *Execution Runtime* and *Execution Driver*, whose formal names and shorthands are fixed in [core vocabulary](concepts/core.md#execution-runtime). Role vocabulary for Agents, Workflows and Stages is [`concepts/roles.md`](concepts/roles.md), a different subject from the Layer-2 `runtime.md`.
- **Each mechanism page opens with a Status line** naming whether it is a required Kernel contract, a per-Driver obligation or an optional Runtime design, and which development gate introduces it. Concept pages carry no Status line: they define vocabulary, and a term is not a commitment to build anything. A concept page you reached directly still describes target specification, not shipped behavior — see [Target, not shipped](README.md#target-not-shipped).

## Find a mechanism

| Question | Owning page |
|---|---|
| Did my create/input request commit? How do I retry? | [creation](mechanisms/creation.md) |
| What is dispatched, retried, fenced and atomically accepted? | [execution-cycle](mechanisms/execution-cycle.md) |
| Which Event wakes this wait and which batch follows? | [waits](mechanisms/waits.md) |
| What wins cancellation, and what permits completion? | [lifecycle](mechanisms/lifecycle.md) |
| Who can act, and what exactly did the human approve? | [authority](mechanisms/authority.md) |
| May an action have run? How do attempts and evidence evolve? | [actions](mechanisms/actions.md) |
| What can observers replay, and what requires explicit sending? | [output](mechanisms/output.md) |
| Who owns children, messages and human replies? | [communication](mechanisms/communication.md) |
| What survives a crash and when may native work resume? | [recovery](mechanisms/recovery.md) |
| What must a native Driver preserve and prove? | [integration](mechanisms/integration.md) |
| How do local branches, joins and Skills work? | [composition](mechanisms/composition.md) |
| How do assertions, inferred claims, notes and artifacts interact? | [state](mechanisms/state.md) |
| Which information/tools did a model actually see? | [context](mechanisms/context.md) |
| How are external values, jobs and notifications mapped? | [external-protocols](mechanisms/external-protocols.md) |
| Who owns resource lifetime and physical enforcement? | [resources](mechanisms/resources.md) |
| What does inspection or a test actually prove? | [evidence](mechanisms/evidence.md) |

## Canonical definitions

Each entry points to its sole definition section. Related words share a page so a reader can compare them without opening dozens of one-paragraph files. Linked local reminders elsewhere do not own another definition.

### Core coordination vocabulary

- [Kernel](concepts/core.md#kernel)
- [Execution](concepts/core.md#execution)
- [Execution Runtime](concepts/core.md#execution-runtime)
- [Execution Driver](concepts/core.md#execution-driver)
- [Definition](concepts/core.md#definition)
- [Runtime contract](concepts/core.md#runtime-contract)
- [Activation](concepts/core.md#activation)
- [Outcome](concepts/core.md#outcome)
- [Event](concepts/core.md#event)
- [Mailbox](concepts/core.md#mailbox)
- [Batch, reservation and acknowledgment](concepts/core.md#batch-reservation-and-acknowledgment)
- [Wait, subscription and generation](concepts/core.md#wait-subscription-and-generation)
- [Readiness](concepts/core.md#readiness)
- [Timeout Event](concepts/core.md#timeout-event)

### Actions, authority and observations

Read [core coordination vocabulary](#core-coordination-vocabulary) first: Effect, this section's first term, is defined in terms of Outcome, which that section owns.

- [Operation](concepts/actions.md#operation)
- [Effect](concepts/actions.md#effect)
- [Logical action and intent](concepts/actions.md#logical-action-and-intent)
- [Admission and physical action attempt](concepts/actions.md#admission-and-physical-action-attempt)
- [Settlement and reconciliation](concepts/actions.md#settlement-and-reconciliation)
- [Principal and authority](concepts/actions.md#principal-and-authority)
- [Exact consent](concepts/actions.md#exact-consent)
- [Exposure and mediation](concepts/actions.md#exposure-and-mediation)
- [Withdrawal and compensation](concepts/actions.md#withdrawal-and-compensation)
- [Emission, result and output obligation](concepts/actions.md#emission-result-and-output-obligation)

### Identity, attempts and accepted versions

- [Keys, IDs and scope: naming convention](concepts/identity.md#keys-ids-and-scope)
- [Request key, creation key, Creation request ID and Input ID](concepts/identity.md#request-key-and-input-id)
- [Activation ID and Runtime attempt](concepts/identity.md#runtime-attempt)
- [Writer epoch](concepts/identity.md#writer-epoch)
- [Dispatch and delivery](concepts/identity.md#dispatch-and-delivery)
- [Revision](concepts/identity.md#revision)
- [Acceptance, boundary and receipt](concepts/identity.md#acceptance-boundary-and-receipt)

### Operational and communication terms

- [Kernel Worker](concepts/operations.md#kernel-worker)
- [Execution Host](concepts/operations.md#execution-host)
- [Trusted Execution](concepts/operations.md#trusted-execution)
- [Isolated Execution](concepts/operations.md#isolated-execution)
- [Operating profile and durability](concepts/operations.md#operating-profile-and-durability)
- [Three clocks](concepts/operations.md#three-clocks)
- [Child and ownership](concepts/operations.md#child-and-ownership)
- [Message, request and correlation](concepts/operations.md#message-request-and-correlation)
- [Observation, cursor and routing](concepts/operations.md#observation-cursor-and-routing)
- [Backpressure and cleanup debt](concepts/operations.md#backpressure-and-cleanup-debt)

### Runtime roles and context vocabulary

- [Agent](concepts/roles.md#agent)
- [Workflow](concepts/roles.md#workflow)
- [Stage and local branch](concepts/roles.md#stage-and-local-branch)
- [Local worker](concepts/roles.md#local-worker)
- [Context](concepts/roles.md#context)
- [Projection and invocation binding](concepts/roles.md#projection-and-invocation-binding)
- [Invocation snapshot and cache](concepts/roles.md#invocation-snapshot-and-cache)
- [View and disclosure](concepts/roles.md#view-and-disclosure)
- [Skill and package](concepts/roles.md#skill-and-package)
- [Service and interaction template](concepts/roles.md#service-and-interaction-template)

### Continuation, retained information and resources

- [Progress](concepts/state.md#progress)
- [Checkpoint and locator](concepts/state.md#checkpoint-and-locator)
- [Recovery and re-execution](concepts/state.md#recovery-and-re-execution)
- [Execution History](concepts/state.md#execution-history)
- [Structured state](concepts/state.md#structured-state)
- [Derived Semantic Memory](concepts/state.md#derived-semantic-memory)
- [Working Notes](concepts/state.md#working-notes)
- [Artifact reference](concepts/state.md#artifact-reference)
- [Resource binding and attachment](concepts/state.md#resource-binding-and-attachment)
- [Retention, pin and tombstone](concepts/state.md#retention-pin-and-tombstone)

### Values, codecs and canonicalization

- [Codec](concepts/values.md#codec)
- [Boundary value and root](concepts/values.md#boundary-value-and-root)
- [In-process value capture](concepts/values.md#in-process-value-capture)
- [Canonical form](concepts/values.md#canonical-form)
- [Fixed semantic limits](concepts/values.md#fixed-semantic-limits)
- [What these rules do not cover](concepts/values.md#what-these-rules-do-not-cover)

## Common search terms

| Search term | Use this owner |
|---|---|
| attempt envelope, exchange | [Activation/attempt/epoch](concepts/identity.md#writer-epoch) |
| delivery, Execution dispatch | [Qualified dispatch and delivery](concepts/identity.md#dispatch-and-delivery) |
| canonical, canonicalization, codec, equality | [Values](concepts/values.md) |
| output obligation, output subscription | [Output obligation](concepts/actions.md#emission-result-and-output-obligation), [replay](mechanisms/output.md) |
| boundary, receipt, acceptance position | [Acceptance and receipt](concepts/identity.md#acceptance-boundary-and-receipt) |
| worker, runtime, host | [Runtime](concepts/core.md#execution-runtime), [local worker](concepts/roles.md#local-worker), [host roles](concepts/operations.md) |
| Agent, Workflow, Stage, Skill, “runtime concepts”, authoring | [Roles vocabulary](concepts/roles.md) |

Ordinary words such as process, queue, model, database and transport retain their normal engineering meanings unless qualified above. This index introduces no universal object hierarchy. [Sources and open choices](sources.md) records provenance, accepted decision coverage, usability findings and intentionally unselected implementation choices.
