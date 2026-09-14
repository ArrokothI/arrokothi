# Reference index

Start with [the overview](README.md), then [Kernel](kernel.md), [Runtime](runtime.md),
[Driver](driver.md) and [Deployment](deployment.md). Use this index to retrieve one
definition or the mechanism that composes it. Layer 3 is precise target/reference
material; the [roadmap mapping](roadmap.md) identifies implementation owners and gates.

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
| How are external values, jobs and notifications mapped? | [interoperability](mechanisms/interoperability.md) |
| Who owns resource lifetime and physical enforcement? | [resources](mechanisms/resources.md) |
| What does inspection or a test actually prove? | [evidence](mechanisms/evidence.md) |

## Canonical definitions

Each entry points to its sole definition section. Related words share a page so a
reader can compare them without opening dozens of one-paragraph files. Linked local
reminders elsewhere do not own another definition.

### Actions, authority and observations

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

### Core coordination vocabulary

- [Kernel](concepts/core.md#kernel)
- [Execution](concepts/core.md#execution)
- [Execution Runtime](concepts/core.md#execution-runtime)
- [Execution Driver](concepts/core.md#execution-driver)
- [Definition](concepts/core.md#definition)
- [Activation](concepts/core.md#activation)
- [Outcome](concepts/core.md#outcome)
- [Event](concepts/core.md#event)
- [Mailbox](concepts/core.md#mailbox)
- [Batch, reservation and acknowledgment](concepts/core.md#batch-reservation-and-acknowledgment)
- [Wait, subscription and generation](concepts/core.md#wait-subscription-and-generation)
- [Readiness](concepts/core.md#readiness)
- [Timeout Event](concepts/core.md#timeout-event)

### Identity, attempts and accepted versions

- [Request key and Input ID](concepts/identity.md#request-key-and-input-id)
- [Runtime attempt](concepts/identity.md#runtime-attempt)
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

### Runtime authoring and context vocabulary

- [Agent](concepts/runtime.md#agent)
- [Workflow](concepts/runtime.md#workflow)
- [Stage and local branch](concepts/runtime.md#stage-and-local-branch)
- [Local worker](concepts/runtime.md#local-worker)
- [Context](concepts/runtime.md#context)
- [Projection and invocation binding](concepts/runtime.md#projection-and-invocation-binding)
- [Invocation snapshot and cache](concepts/runtime.md#invocation-snapshot-and-cache)
- [View and disclosure](concepts/runtime.md#view-and-disclosure)
- [Skill and package](concepts/runtime.md#skill-and-package)
- [Service and interaction template](concepts/runtime.md#service-and-interaction-template)

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
- [Canonical form](concepts/values.md#canonical-form)
- [Fixed semantic limits](concepts/values.md#fixed-semantic-limits)
- [Collection identity is a different comparison](concepts/values.md#collection-identity-is-a-different-comparison)

## Former names and common search terms

| Search term | Use this owner |
|---|---|
| attempt epoch, attempt envelope, exchange | [Activation/attempt/epoch](concepts/identity.md#writer-epoch) |
| delivery, Execution dispatch | [Qualified dispatch and delivery](concepts/identity.md#dispatch-and-delivery) |
| canonical, canonicalization, codec, equality | [Values](concepts/values.md) |
| publication intent, output subscription | [Output obligation](concepts/actions.md#emission-result-and-output-obligation), [replay](mechanisms/output.md) |
| Structured Memory | [Structured state](concepts/state.md#structured-state) |
| boundary, receipt, acceptance position | [Acceptance and receipt](concepts/identity.md#acceptance-boundary-and-receipt) |
| worker, runtime, host | [Runtime](concepts/core.md#execution-runtime), [local worker](concepts/runtime.md#local-worker), [host roles](concepts/operations.md) |
| ControllerResumption, interleave, closed Agent/Workflow union | Legacy implementation vocabulary; [baseline](../docs/development/002-implemented-kernel-baseline.md) and [target separation](mechanisms/evidence.md#structural-evidence) |

Ordinary words such as process, queue, model, database and transport retain their
normal engineering meanings unless qualified above. This index introduces no universal
object hierarchy. [Sources and open choices](sources.md) records provenance, accepted
decision coverage, usability findings and intentionally unselected implementation choices.
