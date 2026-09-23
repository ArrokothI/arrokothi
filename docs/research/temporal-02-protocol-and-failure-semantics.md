# ArrokothI and Temporal: protocol and failure semantics

Research date: 2026-09-22. Non-canonical research. [Report 1](temporal-01-architecture-comparison.md#evidence-and-limits) pins the examined revisions and verification limits. Unless explicitly described as implemented, ArrokothI behavior below is canonical direction.

**The strongest common principle is that accepted execution progress must stay consistent with the work scheduled from it.** The sharpest difference is what each system assumes it can rerun after losing contact with computation. Neither system can infer the outcome of an arbitrary external action from a timeout.

## Map meanings before mapping names

| ArrokothI concept | Closest Temporal concept | Where the analogy breaks |
|---|---|---|
| Execution | Workflow Execution or an explicitly selected run chain | Temporal's Workflow ID can span multiple Run IDs; ArrokothI terminal Executions never reopen |
| Activation | Workflow Task at the service boundary | Core SDK WorkflowActivation is a separate internal boundary; neither is an interchangeable wire format |
| Outcome | Workflow Task completion plus Commands/messages | Temporal does not accept an arbitrary native checkpoint as Workflow continuation in this protocol |
| Accepted Progress | Reconstructible Workflow state | Temporal's server Mutable State tracks orchestration metadata, not a saved application stack |
| Event batch and acknowledgment | Delivered history/protocol messages plus accepted task completion | Temporal History Events include server decisions; they are not just ArrokothI mailbox observations |
| Effect intent | A Command scheduling an Activity, child, timer, or other operation | ArrokothI separates accepted intent from current authority/consent and physical admission |
| Writer epoch | Task attempt/start/version checks and ownership fencing | There is no one-to-one field mapping; shard ownership and application/native-session ownership differ |
| WAITING | Workflow blocked on an SDK awaitable | Temporal's Running status can include waiting; it does not mean ArrokothI RUNNING |
| Driver | Some combination of SDK, Worker, and native-service adapter | A stock Temporal Worker is not automatically an ArrokothI Driver |
| Governed Effect | Activity/Nexus operation plus application policy | Temporal's internal effect.Buffer is a commit callback buffer, not an action authority protocol |

Sources: ArrokothI [core vocabulary](../../mental-model/concepts/core.md), [identity](../../mental-model/concepts/identity.md), and [execution cycle](../../mental-model/mechanisms/execution-cycle.md); Temporal [architecture][t-arch], [History Service][t-history], [completion handler][t-wft], and [effect package][t-effect]. Temporal [execution status and run chains](https://docs.temporal.io/workflow-execution) provide the public lifecycle terminology.

## Atomic acceptance and durable dispatch

ArrokothI requires a single accepted decision to account for the reserved input batch, install progress, record Emissions and Effect intents, and choose the next lifecycle step. Malformed or stale Outcomes cannot partially advance that state. Exact accepted duplicates return the retained receipt. This is the target [Outcome acceptance algorithm](../../mental-model/mechanisms/execution-cycle.md#outcome-acceptance); the current target package does not implement it yet.

Temporal already implements related machinery. History Service accumulates history events, mutable-state changes, and internal tasks. Mutable State and tasks commit transactionally; history consistency is established through the history boundary recorded in Mutable State. In the SQL implementation, history nodes are appended before the shard-checked state transaction. Therefore “history and everything else use one physical database write” would be an inaccurate description. Transfer tasks form the durable bridge to Matching. [State transitions and consistency][t-history], [SQL implementation][t-sql].

The reusable lesson is to identify the authoritative commit boundary and reconstructible obligations. A successful callback or queue notification must not be the only evidence that work exists.

## Five failure cases that expose the differences

### 1. Publication succeeds, then the response is lost

A publishing service commits a document; the caller crashes before recording the reply.

Temporal can retry the Activity according to its policy. If the external API enforces a stable idempotency key, that can be safe. Without it, replay protection for completed Activity results does not prevent repeating the unrecorded publication. Activities have retries by default; Workflow Executions do not. [Activity idempotency](https://docs.temporal.io/activity-definition), [retry policy](https://docs.temporal.io/encyclopedia/retry-policies).

ArrokothI's target keeps the action unknown and requires reconciliation, provider-enforced deduplication, or reliable evidence of non-execution before another attempt. New physical attempts also require fresh admission. Disabling automatic retry prevents that retry source, but does not discover whether publication happened. [Action attempts and settlement](../../mental-model/mechanisms/actions.md).

**Implication:** Temporal can implement this policy, but a default retried Activity is insufficient. ArrokothI's prospective benefit is a shared policy/evidence contract, not a stronger physical exactly-once guarantee.

### 2. The old worker returns after replacement

Temporal's Workflow Task completion handler checks the current task, started identity/time, attempt, and version before processing Commands. Its Activity completion helper also checks attempt/version information on the token path. Those guards protect accepted Temporal state; they do not recall an HTTP request that obsolete Activity code already sent. The separate completion-by-ID path has different checks and must not be treated as an attempt-bound token. [Workflow completion][t-wft], [Activity token helper][t-activity], [helper tests][t-activity-tests].

ArrokothI's writer epoch likewise protects accepted Outcomes. A Driver must additionally exclude stale mutation of a native session, use a safe immutable continuation mechanism, or refuse takeover. Ordinary delivery retry preserves the Activation and epoch; authorized takeover changes the writer epoch. Delivery retry alone never grants permission to duplicate native work. [Execution cycle](../../mental-model/mechanisms/execution-cycle.md#retry-versus-takeover), [recovery](../../mental-model/mechanisms/recovery.md#decide-permission-before-replacing-work).

**Implication:** Fencing the coordinator's database and fencing the external resource are different tasks in both designs.

### 3. A native job starts, but its handle is lost

Temporal supports asynchronous Activity completion: external work can finish later using an Activity identifier or task token. This supports long-lived native jobs without requiring the Activity function to occupy a worker throughout. It does not, by itself, make the initial remote job submission atomic with recording its handle. [Asynchronous Activities](https://docs.temporal.io/develop/typescript/activities/asynchronous-activity).

ArrokothI requires a precommitted native request identity, exact submission configuration, and native query/deduplication support where available. If the only available evidence is an adapter record written after submission, the crash window remains open. A native job ID is a locator, not an immutable checkpoint. [Native submission and checkpoints](../../mental-model/mechanisms/recovery.md).

**Implication:** A Temporal-backed Driver still needs an explicit native submission protocol.

### 4. A human approves draft A; the Runtime changes it to draft B

Temporal Signals and Updates can transport approval decisions. Signals provide asynchronous delivery; Updates support validation and a result. These communication mechanisms do not by themselves define which exact document, destination, operation revision, or approver identity the decision authorizes. [Workflow Update implementation][t-update].

ArrokothI's target binds consent to a validated immutable action and applicable content/resource version. A material argument or destination change requires a new action and consent or refusal. Revocation accepted before admission blocks admission; later revocation cannot recall a remote request. [Exact consent](../../mental-model/mechanisms/authority.md#exact-action-consent).

Temporal does have authorization. The examined default Authorizer checks API access roles at namespace/cluster scope, and the Authorizer interface permits custom decisions using the request. The narrower conclusion is that this default mechanism is not ArrokothI's per-action consent and delegation contract. [Default authorizer][t-auth], [extension interface][t-auth-interface].

**Implication:** Compare against Temporal with a properly implemented application policy layer, not against an intentionally unprotected Workflow.

### 5. Cancellation arrives while external work is running

Temporal cancellation is cooperative Workflow handling; termination closes the Workflow without executing its cancellation cleanup path. Neither status alone establishes that a remote Activity effect was physically stopped. [Cancellation and termination](https://docs.temporal.io/encyclopedia/workflow/cancellation-and-termination).

ArrokothI separately tracks logical cancellation, native stop attempts, and remaining action responsibility. Late authenticated evidence can update the action ledger after terminal closure without reopening the Execution. Unknown consequential work cannot become resolved merely because the Runtime acknowledged an unknown result. [Lifecycle](../../mental-model/mechanisms/lifecycle.md), [remaining responsibility](../../mental-model/mechanisms/actions.md#withdrawal-and-remaining-responsibility).

**Implication:** A Driver cannot translate a cancellation acknowledgment into “no external effect occurred.”

## CHASM is important prior art, with narrower guarantees than a casual reading suggests

CHASM's component state and scheduled tasks commit together. Pure tasks operate inside transitions; side-effect tasks execute outside the state lock and use Engine APIs to record resulting state changes. Validators determine whether a task is still applicable, and the design describes retrying tasks on errors. These are close implementation analogies to accepted state plus deferred work. [CHASM design][t-chasm], [task interfaces][t-chasm-task].

The current code is more nuanced than the overview's simple description of stale callback rejection. The Engine supports reference consistency levels: exact last-update checking by default, component-creation checking, and current-run resolution that drops run/version checks and requires caller logic to re-establish identity. Do not promote the simplified overview into a claim that every CHASM reference always fences every stale callback. [Engine consistency levels][t-chasm-engine].

A CHASM side-effect task is also not automatically safe for an uncertain non-idempotent send. Its validator can decide whether the task is relevant in server state; that does not prove the external service did not already act.

## Long lifetimes and operational cost

Temporal's replay model needs compatible Workflow code. Worker Versioning can pin a Workflow to a deployment version; auto-upgrade behavior has compatibility obligations. ArrokothI instead pins Definition, Runtime contract, and progress codec, and requires an explicit hold/migration decision when continuation is unavailable. Neither approach makes arbitrary code upgrades free. [Worker Versioning](https://docs.temporal.io/worker-versioning), [ArrokothI compatibility](../../mental-model/mechanisms/recovery.md#compatibility-and-migration).

Temporal supplies concrete history, queue, persistence, and visibility machinery. ArrokothI's [operating profiles](../../mental-model/deployment.md) and K3/K5 obligations still need implemented evidence. Replay cost, checkpoint size, retained history, queue delay, and administrative burden must be measured on the same workload; this inspection establishes no latency, throughput, or cost winner.

[t-arch]: https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/docs/architecture/README.md
[t-history]: https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/docs/architecture/history-service.md
[t-sql]: https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/common/persistence/sql/execution.go
[t-wft]: https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/service/history/api/respondworkflowtaskcompleted/api.go
[t-activity]: https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/service/history/api/activity_util.go
[t-activity-tests]: https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/service/history/api/activity_util_test.go
[t-update]: https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/docs/architecture/workflow-update.md
[t-auth]: https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/common/authorization/default_authorizer.go
[t-auth-interface]: https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/common/authorization/authorizer.go
[t-effect]: https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/docs/architecture/effect-package.md
[t-chasm]: https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/docs/architecture/chasm.md
[t-chasm-task]: https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/chasm/task.go
[t-chasm-engine]: https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/chasm/engine.go
