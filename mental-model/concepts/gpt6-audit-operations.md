# GPT-6 audit: operations rewrite and supervision

Review date: 2026-09-21. Review target: [operations.rewrite.md](operations.rewrite.md), all ten subsections and their introductory examples, compared with [operations.md](operations.md) and the canonical mechanism owners. This is a document-design review and handoff to Claude, not independent implementation acceptance.

The user's existing rewrite edits were preserved. Its reviewed SHA-256 is `1e32076a25bd05ea61541c680ead1c4e13d08c57885997034ef94927f1396956`. ArrokothI checkout base: `e15140299efd2b508987575530d7d87f8d52bbdc`. Direct edits are confined to the permitted `roles.md`, `state.md` and `mechanisms/` files. `values.md` needs no change. This note asks Claude to reconcile the rewrite and canonical operations page; neither was edited by this review.

## Main finding and implementation gap

The suspicion is substantially right: target supervision is not implemented, but the repository already has narrower legacy child behavior. [The baseline, section 7](../../docs/development/002-implemented-kernel-baseline.md#7-recursive-child-composition), [the work ledger](../../docs/development/007-work-packets.md), and [the target package's refusal](../../packages/kernel/src/unsupported.ts) distinguish those surfaces. At the reviewed revision, K4.1–K4.5 are planned; the target package provides K1.1 creation/ingress/dispatch boundaries, not durable child supervision.

Legacy [child links](../../packages/core/src/execution/child-link.ts) distinguish call from spawn by whether a parent pending operation exists. [Harness cancellation and abandonment](../../packages/core/src/runtime/harness.ts) route child cancellation and abandon outgoing dependencies without cancelling the independent child. [Child cancellation tests](../../tests/conformance/composition/child-cancellation.test.ts) explicitly cover no sibling propagation; [terminal abandonment tests](../../tests/conformance/composition/terminal-dependency-abandonment.test.ts) cover a parent ending while its child continues. These are useful observations, not evidence for the target rule that spawned children remain required owned work.

The draft's deeper defect is conceptual: “not a behaviour the Kernel supplies” excludes the very durable mechanics that make an application policy reliable. The application chooses what to do; Kernel-owned links, accounting, authorized controls and retained obligations ensure that accepted decisions survive the parent disappearing. The distinction is especially clear in Temporal's parent-close implementation [T1]. No intelligent supervisor, Erlang-style restart hierarchy or general detached-service framework is required to fix this.

## Comparison method and source revisions

Inspected the four clean local Git checkouts at the exact revisions below. No upstream fetch, provider execution or fault campaign was performed. Source observations identify mechanisms and counterexamples; they do not establish tested integration support. “No equivalent established” below means the inspected paths did not establish a matching guarantee, not that the entire project lacks the feature. Temporal's current official documentation supplements its server source; those documentation pages are not pinned to the server commit.

| Repository | Inspected commit |
|---|---|
| Temporal | `543367eec690da3c23e536cf5dfe76928af11b2c` |
| Dify | `8fc11b2927fb8b2957cdde7bf805614370d2d50a` |
| Hermes | `50d7a756d8feebff4d0e8c2de8c59d9c7ed75b83` |
| OpenClaw | `7cabf654ef59339b9dd3cf9a7993a9cb26725d0d` |

Source labels in the comparison resolve to exact GitHub files in the final section. They name prior art, not dependencies selected for ArrokothI.

## Introductory framing and first example

**Revise.** Keep the user's correction that laptop and production run different Executions. Replace “families that do not depend on each other” and “a child Execution has nothing to do with an Execution Host” with “distinct responsibilities that interact.” Parent closure, native resource lifetime, routing and recovery interact in Temporal [T1], Hermes [H1/H2] and OpenClaw [O1/O4]. Dify's pause record crosses application, worker and storage boundaries [D1/D2]. Independence of meanings is not absence of dependency.

The production paragraph should promise survival of **accepted Kernel records**, conditional on the storage profile. Postgres alone does not preserve the report Runtime's live model call, session or checkpoint. Dify's explicit pause snapshots [D2] and Hermes's separate session and file stores [H3/H4] make that distinction concrete. Temporal can reconstruct its own workflow state under its replay contract; that does not extend to arbitrary code merely placed beside it [T5].

The week-long example must not require one lease renewal per dormant Execution for the entire week. Say “when a worker holds a scheduling claim, it has a separately bounded lease; the stored wait can remain dormant without a dedicated worker.” The Runtime proposes a wait in an Outcome; the Kernel registers it on acceptance. Avoid wording that suggests a second direct Runtime registration API.

## 1. Kernel Worker

**Keep the role; correct the exclusivity explanation.**

| Repository | Relevant comparison |
|---|---|
| Temporal | History-service transitions and shard range IDs [T1/T4] are the closer analogy. An SDK Worker executes workflow/activity code, so its name does not map directly to Kernel Worker. |
| Dify | The application task pipeline and Celery worker entry point [D1] divide physical execution responsibilities differently; they are not evidence of an ArrokothI-equivalent Kernel role. |
| Hermes | Gateway session recovery and delegation registry [H1/H3] show coordinator bookkeeping without establishing a separate durable Kernel transition service. |
| OpenClaw | Gateway/registry code records and coordinates native runs [O1/O2]; its “controller” vocabulary is native and should stay native. |

The draft currently answers “what stops two workers advancing it?” with a scheduler lease. Restore the omitted qualification: accepted transition preconditions and writer fencing decide whose progress commits; a lease only bounds a scheduling claim. Horizontal scaling also needs a compatible shared store/ownership protocol, not just surviving records. No custom queue or database should be implied. Direct clarification added to [recovery](../mechanisms/recovery.md#decide-permission-before-replacing-work).

## 2. Execution Host

**Keep; qualify physical failure examples.** Temporal application Workers, Dify execution workers [D1], Hermes delegate threads and terminal backends [H1/H2], and OpenClaw agent processes/tool sandboxes [O1/O3] all support separating the logical job from where it computes. They do not imply one process per Execution or that the Driver must live with the Runtime.

Change “the Driver and host usually live together” to “they may be colocated.” A privileged adapter may need to sit outside the Runtime's isolation boundary. The twelve-gigabyte allocation example also needs an independently enforced memory/failure boundary: two processes sharing a machine can still affect one another under host memory exhaustion. Say “with independent resource limits and surviving storage, an Execution Host failure need not destroy accepted Kernel state.”

The remote job API locates and controls work on a remote Execution Host; the API itself does not supply CPU. Direct clarification in [roles](roles.md#local-worker) says “local” means Runtime-owned, even when physically remote.

## 3. Trusted Execution

**Keep the declaration; remove the mandatory credential location.** Temporal API authorization [T6] governs service calls, not all ambient activity code. Dify's sandbox configuration [D4] applies to a service; Hermes explicitly supports a local terminal backend [H2]; OpenClaw separates tool policy and sandbox configuration [O3]. None makes an adapter's mere presence proof of complete mediation.

Replace “a service-wide credential belongs in the Driver” with “broad credentials remain in explicitly privileged application/adapter/broker components outside isolated Runtime code; identify their actual holders.” Some Drivers should receive only narrow capabilities and never the service credential. Trusted/Isolated classify Runtime reach, while the deployment separately enumerates its trusted computing base. That answers the practical concern in the OPEN marker without inventing a third Execution trust mode or a universal Driver identity type. Direct change: [containment claims](../mechanisms/resources.md#containment-claims). See also [deployment handoff](../gpt6-audit-deployment.md).

## 4. Isolated Execution

**Revise two overclaims.** Temporal task scheduling and authorization [T4/T6] do not prove physical containment of activity code. Dify's checked-in sandbox configuration permits network access [D4]. Hermes has several execution backends [H2]. OpenClaw has explicit sandbox modes and different tool/browser network settings [O3]. Inspect and test the selected configuration and every relevant path; a project label cannot establish the scope.

First, a sandbox around one code/terminal tool does not isolate the whole Runtime, including plugins, model clients and other native tools. Second, missing isolation evidence means **unverified/unsupported isolation**, not that the deployment intentionally selected Trusted Execution. Do not silently weaken a requested Isolated profile to Trusted. These are support/verification outcomes, not a third trust mode. Preserve the real-backend adversarial tests and mediation distinction. Direct change: [resources](../mechanisms/resources.md#containment-claims).

## 5. Operating profile and durability

**Keep the bounded guarantee; distinguish persistence from continuation.**

| Repository | What the inspected evidence supports |
|---|---|
| Temporal | Service history plus compatible workflow replay can reconstruct workflow state; history reads carry run/branch-bound continuation tokens [T4/T5]. Its replay machinery is native, not a universal interpretation of opaque progress. |
| Dify | Pause persistence captures graph state, response stream filter and resumption context [D2]. That is substantially more than saving a run ID; arbitrary crash recovery at every graph step was not established here. |
| Hermes | Session routing rows [H3] and filesystem checkpoints [H4] preserve different things. Neither alone serializes the live delegate thread/future in [H1]. |
| OpenClaw | Restart recovery checks lifecycle identity, bounds attempts and suppresses ambiguous replay [O1]; outbound unknown-send reconciliation has a separate provider contract [O4]. Persisted run status alone is not its whole recovery mechanism. |

Replace “atomicity stores nothing” with “atomicity specifies all-or-nothing acceptance; the storage profile separately specifies survival.” Atomic transactions may of course also be durable. Likewise, actual data loss is not always either a Kernel defect or expected profile behavior: it may be a Driver, deployment or violated storage-assumption defect. Attribute it to the failed obligation.

Retain exact failure/retention scope. Allow a pinned native history boundary plus compatible code to represent resumable state without requiring an in-memory snapshot. Direct changes: [state](state.md#checkpoint-and-locator), [recovery](../mechanisms/recovery.md#checkpoint-publication).

## 6. Three clocks

**Keep the three Kernel meanings; do not describe them as all clocks in the system.** Temporal separates workflow run/execution timeouts from activity timeouts/retries and shard ownership [T3/T4]. Dify distinguishes form expiry from workflow stream idle timeout [D3/D5]. Hermes separates delegate limits, foreground terminal timeout and interrupt responsiveness [H1/H2]. OpenClaw separates recovery attempt windows, interruption age and run timeout [O1]. None maps those durations one-to-one to ArrokothI fields.

Clarify that native heartbeat, provider call, request-expiry and cleanup timers remain possible. Preserve distinct wait versus Execution-deadline effects. Temporal's cancellation request records an event and schedules workflow handling [T2]; ArrokothI cancellation immediately fences progress. Temporal also has a timeout terminal result, whereas ArrokothI's specified Execution deadline takes its cancellation path. These are deliberate translation differences, not reasons to import Temporal's state enum.

Remove continuous lease renewal from the dormant-wait example in both operations files. Units/precision are implementation choices; the OPEN marker should not present those choices as unresolved architecture. Direct change: [recovery](../mechanisms/recovery.md#decide-permission-before-replacing-work).

## 7. Child and ownership, including supervision

**Revise the supervision definition; retain explicit required-work accounting.**

| Repository | Finding and transfer to ArrokothI |
|---|---|
| Temporal | `processParentClosePolicy` and `applyParentClosePolicy` [T1] execute abandon/request-cancel/terminate dispositions through service-side work after parent closure. Child failure handling is a separate application decision. Adopt this separation and durable fulfillment, not the enum verbatim. |
| Dify | Parallel human-input/join tests [D6] preserve graph-local branch state. A graph node or branch is not automatically an independently addressable Kernel child. No general parent-close supervision contract was established in these inspected paths. |
| Hermes | Delegation bounds depth/concurrency/iterations, registers children in a live registry, and propagates cooperative interruption [H1]. Pending futures may be abandoned after parent interruption; physical completion is a separate fact. Preserve native ownership and declare its limits. |
| OpenClaw | Control ownership can differ from completion-routing ownership [O2]. Restart recovery uses persisted receipts, lifecycle checks and bounded retries [O1]. Adopt exact identities, distinct responsibility/delivery and explicit uncertainty, without copying native session semantics. |

Suggested replacement definition for Claude:

> **Supervision** is the declared policy and responsibility for handling child failure, parent closure and any authorized replacement work. The application or Runtime chooses the response. The Kernel records ownership, enforces required-work accounting and preserves accepted controls and outstanding obligations. The Driver and deployment establish whether native work actually stopped. A child's failure need not fail its parent; a parent's closure follows its declared disposition and cannot erase live work or its accountable owner.

Then link to [finite expansion and supervision](../mechanisms/communication.md#finite-expansion-and-supervision), where the direct edit specifies the following:

1. Separate child-terminal reaction from parent-close disposition. A terminal parent cannot run a callback to rescue its children.
2. Bind an application reconciliation owner at creation. The minimum can report and retain under that owner; unsupported automatic cancellation/retry policies are refused.
3. Preserve stable, recoverable follow-up obligations and exact control targets; authority still applies. No supervisor service or general Kernel policy interpreter is required.
4. Completion cannot evade required children by appealing to a parent-close default. Failure/cancellation preserve outstanding work without waiting for cleanup.
5. Intentional retry creates a new Execution and consumes bounded total work. Driver reattachment/replay and native retries remain distinct; unknown old actions do not become safe to repeat.

Temporal permits parent-close abandonment and separately supports termination [T1]. ArrokothI deliberately has stronger default responsibility accounting and no separate native-kill promise. Native `ABANDON` is therefore not evidence that ArrokothI detachment has an accepting durable owner. Similarly, stopping one child does not imply the right to cancel siblings. Preserve the existing detachment limitation.

Narrow the OPEN marker to the actual unanswered question: whether applications need a richer reusable supervision library, general detachment or additional lifecycle mechanisms. The minimal durable accounting described here is no longer an unnamed hole. Do not claim that Q3 has been fully resolved or that this document change implements K4.

## 8. Message, request and correlation

**Keep the core contract; qualify its examples and profile.** Temporal signals record an event and deduplicate a supplied request ID [T2]; this is not handler completion or ArrokothI's exact-content conflict guarantee. Dify human submission validates the form, commits submission and then enqueues resumption [D3]; those separate steps motivate a crash-window test. Hermes steering distinguishes queued text from processing at a later iteration boundary [H1]. OpenClaw's controller/read scope and delivery reconciliation distinguish permission, destination and delivery state [O2/O4].

“The sender controls none of the peer's lifetime” is too absolute: an independently authorized application can have cancellation/control rights over a peer. Say “sending a message itself grants none of those controls.” Correlation is not authority in any case.

A durable human request also needs a recoverable closure-to-resume path; merely calling it an object does not prove this. Say records are durable **under a persistent profile**, so the concept does not contradict the embedded in-memory deployment. Redisplaying a form creates no second logical request, but is not literally free: delivery/notification has cost and may require deduplication. Existing [communication](../mechanisms/communication.md#human-input-requests) already has the correct closure/routing contract; keep it. Do not label Dify's inspected enqueue sequence a product-wide bug without examining all recovery paths.

## 9. Observation, cursor and routing

**Keep; fix a contradictory mechanism introduction.** Temporal history reads use bound pagination and optional long polling [T4]; they are not signals. Dify reconstructs a snapshot and subscribes to live events [D5], a useful comparator but not proof of ArrokothI's exact accepted-output cursor semantics. Hermes emits/reroutes completion notifications [H5]; a UI notification is not necessarily durable mailbox input. OpenClaw separately bounds gateway broadcast and reconciles durable sends [O4/O5].

Keep authorized observation separate from addressed input. A result route that wakes a parent is explicit protocol work. A dashboard read cannot secretly become a supervision command. A bridge needs read/disclosure and destination-input permission, stable delivery identity and a recoverable cursor advance.

The draft already correctly allows repeated delivery. [Output replay](../mechanisms/output.md#authorized-subscriptions-and-replay) had an opening promise of no repetition that contradicted its own later deduplication rule; corrected directly. Retention expiry/view change still needs an honest gap or refusal. A native snapshot-and-live API must not be advertised as this contract without reconnect-race tests.

## 10. Backpressure and cleanup debt

**Narrow cleanup debt and preserve separate capacity accounts.** Temporal's outstanding parent-close transfer work [T1] distinguishes logical closure from follow-up completion. Dify's worker limits and stream pipeline [D4/D5] put capacity in different components. Hermes's live registry explicitly retains attribution for background processes that outlive a child [H1], and its terminal backend has orphan cleanup [H2]. OpenClaw closes or drops slow-consumer broadcasts [O5] while separately retaining unknown-send state [O4]. Droppable native telemetry is not an example permitting loss of accepted ArrokothI output.

The draft broadens cleanup debt to “work, cost or storage still owed” and includes publication that may still execute. Keep three records distinct: **action uncertainty/reconciliation**, **routing or delivery obligations**, and **resource cleanup debt**. They may refer to one another, but successfully deleting a container settles none of the other two. Also distinguish cost already incurred from future unbounded resource consumption.

Logical active-child slots can be released when a child terminalizes, while physical provider/process slots remain occupied until actual release. Without separate accounting, immediate logical cancellation can admit unlimited replacement compute. Direct clarification: [capacity, cancellation and retention](../mechanisms/resources.md#capacity-cancellation-and-retention). The target tests are assigned in [the roadmap map](../roadmap.md).

## Adjacent changes and handoff

Direct changes: `roles.md`, `state.md`, and mechanisms `communication`, `lifecycle`, `recovery`, `integration`, `resources`, `evidence`, `output`. Their existing ownership and Status gates remain in place. No implementation, public API, accepted protocol encoding or historical evidence was changed.

Claude should update the two operations pages using this note, reconcile [deployment](../gpt6-audit-deployment.md), and maintain the [roadmap mapping](../roadmap.md). Do not infer that other files need rewriting merely because they mention children. `values.md` remains correct: none of these comparisons justifies changing canonical equality, fixed limits or progress-codec ownership. Concept/reference anchors were preserved; no new Kernel lifecycle state or entity was introduced.

## Exact source catalog

### Temporal

- **T1:** [Parent-close dispatch and policy application](https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/service/history/transfer_queue_active_task_executor.go) — `processParentClosePolicy`, `applyParentClosePolicy`, and close/start-child handling. [Tests](https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/service/history/transfer_queue_active_task_executor_test.go) include few/many/abandoned children and parent reset. [Official parent-close contract](https://docs.temporal.io/parent-close-policy) supplements the pinned implementation.
- **T2:** [Signal acceptance](https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/service/history/api/signalworkflow/api.go) and [cancellation request](https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/service/history/api/requestcancelworkflow/api.go).
- **T3:** [Timer execution](https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/service/history/timer_queue_active_task_executor.go) — activity retry, workflow run timeout and execution timeout are separate handlers.
- **T4:** [Shard ownership/range checks](https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/service/history/shard/context_impl.go) and [history pagination/long polling](https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/service/history/api/getworkflowexecutionhistory/api.go).
- **T5:** Official [workflow execution/replay](https://docs.temporal.io/workflow-execution) and [activity execution](https://docs.temporal.io/activity-execution), read 2026-09-21. Workflow replay and activity retries have different side-effect implications; these pages are not pinned source-revision evidence.
- **T6:** [Default API authorizer](https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/common/authorization/default_authorizer.go).

### Dify

- **D1:** [Workflow worker entry point](https://github.com/langgenius/dify/blob/8fc11b2927fb8b2957cdde7bf805614370d2d50a/api/tasks/app_generate/workflow_execute_task.py).
- **D2:** [Pause-state persistence](https://github.com/langgenius/dify/blob/8fc11b2927fb8b2957cdde7bf805614370d2d50a/api/core/app/layers/pause_state_persist_layer.py) and [pause entity contract](https://github.com/langgenius/dify/blob/8fc11b2927fb8b2957cdde7bf805614370d2d50a/api/repositories/entities/workflow_pause.py).
- **D3:** [Human input submission, expiry and resume routing](https://github.com/langgenius/dify/blob/8fc11b2927fb8b2957cdde7bf805614370d2d50a/api/services/human_input_service.py).
- **D4:** [Checked-in sandbox configuration](https://github.com/langgenius/dify/blob/8fc11b2927fb8b2957cdde7bf805614370d2d50a/docker/volumes/sandbox/conf/config.yaml), an example configuration rather than a claim about a deployed installation.
- **D5:** [Workflow snapshot/live event stream](https://github.com/langgenius/dify/blob/8fc11b2927fb8b2957cdde7bf805614370d2d50a/api/services/workflow_event_snapshot_service.py).
- **D6:** [Parallel human-input join/resume test](https://github.com/langgenius/dify/blob/8fc11b2927fb8b2957cdde7bf805614370d2d50a/api/tests/unit_tests/core/workflow/graph_engine/test_parallel_human_input_join_resume.py). The inspected test imports `graphon`; this review does not claim to have audited that dependency's implementation.

### Hermes

- **H1:** [Delegate construction/limits](https://github.com/NousResearch/hermes-agent/blob/50d7a756d8feebff4d0e8c2de8c59d9c7ed75b83/tools/delegate_tool.py), [live registry and steering](https://github.com/NousResearch/hermes-agent/blob/50d7a756d8feebff4d0e8c2de8c59d9c7ed75b83/tools/delegate_tool_registry.py), [parallel future/interrupt handling](https://github.com/NousResearch/hermes-agent/blob/50d7a756d8feebff4d0e8c2de8c59d9c7ed75b83/tools/delegate_tool_dispatch.py).
- **H2:** [Terminal backends, timeouts and orphan reaper entry](https://github.com/NousResearch/hermes-agent/blob/50d7a756d8feebff4d0e8c2de8c59d9c7ed75b83/tools/terminal_tool.py).
- **H3:** [Session routing-row recovery](https://github.com/NousResearch/hermes-agent/blob/50d7a756d8feebff4d0e8c2de8c59d9c7ed75b83/gateway/session_recovery.py).
- **H4:** [Filesystem checkpoint manager](https://github.com/NousResearch/hermes-agent/blob/50d7a756d8feebff4d0e8c2de8c59d9c7ed75b83/tools/checkpoint_manager.py).
- **H5:** [Session completion notifications](https://github.com/NousResearch/hermes-agent/blob/50d7a756d8feebff4d0e8c2de8c59d9c7ed75b83/tui_gateway/session_notifications.py).

### OpenClaw

- **O1:** [Interrupted-subagent restart recovery](https://github.com/openclaw/openclaw/blob/7cabf654ef59339b9dd3cf9a7993a9cb26725d0d/src/agents/subagents/registry/subagent-registry-restart-recovery.ts) and [run replacement/recovery management](https://github.com/openclaw/openclaw/blob/7cabf654ef59339b9dd3cf9a7993a9cb26725d0d/src/agents/subagents/registry/subagent-registry-run-recovery.ts).
- **O2:** [Subagent control and read scope](https://github.com/openclaw/openclaw/blob/7cabf654ef59339b9dd3cf9a7993a9cb26725d0d/src/agents/subagents/registry/subagent-control-scope.ts).
- **O3:** [Sandbox mode/network/scope configuration](https://github.com/openclaw/openclaw/blob/7cabf654ef59339b9dd3cf9a7993a9cb26725d0d/src/agents/sandbox/config.ts).
- **O4:** [Unknown-send queue reconciliation](https://github.com/openclaw/openclaw/blob/7cabf654ef59339b9dd3cf9a7993a9cb26725d0d/src/infra/outbound/delivery-queue-reconciliation.ts).
- **O5:** [Gateway broadcast and slow-consumer handling](https://github.com/openclaw/openclaw/blob/7cabf654ef59339b9dd3cf9a7993a9cb26725d0d/src/gateway/server-broadcast.ts).

## Reuse and licensing record

Reuse method: architectural comparison and independently written documentation only. No third-party code, tests, assets or dependency was copied, adapted, vendored or installed; no hosted service was used. The pinned root licenses were read: [Temporal](https://github.com/temporalio/temporal/blob/543367eec690da3c23e536cf5dfe76928af11b2c/LICENSE), [Hermes](https://github.com/NousResearch/hermes-agent/blob/50d7a756d8feebff4d0e8c2de8c59d9c7ed75b83/LICENSE) and [OpenClaw](https://github.com/openclaw/openclaw/blob/7cabf654ef59339b9dd3cf9a7993a9cb26725d0d/LICENSE) identify MIT terms, including preservation of notices for copied material. [Dify](https://github.com/langgenius/dify/blob/8fc11b2927fb8b2957cdde7bf805614370d2d50a/LICENSE) adds multi-tenant and frontend branding conditions to Apache 2.0 terms. This is not clearance to reuse those projects: any later incorporation needs exact module/header/NOTICE/dependency/service review, particularly Dify's restrictions. The root-license observations do not establish uniform licensing of bundled modules.
