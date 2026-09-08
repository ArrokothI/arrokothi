# Runtime integration and Driver fidelity

**Owner:** Execution Runtime/Driver. **Status:** R1 design and support criteria; K1/K2 supply the
boundary, K3 tests recovery, S1 freezes supported versions. [Execution](../execution.md) owns the
contract. A Driver is an adapter, potentially an ordinary function, not a second execution engine.

## Select an integration boundary

| Shape | What ArrokothI can own | What remains native |
|---|---|---|
| Service operation | Exact invocation, action attempts, surrounding application | Internal run, tools, context and native recovery |
| Managed native job | Enclosing Execution, accepted input/result, declared job recovery | Native session, algorithm, graph, checkpoint meaning |
| Selected mediated tools | Above plus the specifically proven action paths | Every residual native path and native continuation machinery |
| ArrokothI Runtime | Same Kernel protocol, optionally richer reference libraries | Agent/Workflow algorithms and local state |

These are not a ranked trust ladder. A native ArrokothI Runtime with ambient credentials may offer
less containment than an external isolated job. Mediation, recovery, fidelity and containment are
independent dimensions. Product support must report tested properties, not a single “native/managed” badge.

Start from a useful native public API/job, not the old model-shaped AgentExecutor port. Keep the
existing step bridge useful within its documented scope. One native session may span several Executions
or runs; one native job may contain many internal workers. Record the mapping and serialize access
where the native session requires it. A Kernel Activation is not automatically a native conversation turn.

## Per-Driver support record

For each supported profile, record a versioned declaration with evidence links:

| Dimension | Required answers |
|---|---|
| Identity/principals | Execution/Activation/native run/session mapping; native account; authenticated restoration; session sharing owner |
| Input | Exact native input/config, submit deduplication, stable request key, lost-ack query or refusal |
| Progress | Inline/checkpoint/job locator, codec/code version, required resources, retention owner |
| Recovery | Phase-specific reattach/replay/unsupported behavior and stale native writer exclusion |
| Actions | Direct, indirect, fallback and delegated paths; which are mediated; actual credential holder |
| Pause/input | Durable native pause identity, one form/resume owner, expiry and duplicate reply behavior |
| Output | Native completion meaning, typed/invalid result, provisional stream and delivery owner |
| Cancellation | Signal/interrupt/kill capability, lost-host behavior and remaining native work |
| Resources | Acquire/release/destroy, missing binding and cross-owner cleanup behavior |
| Fidelity | Native feature coverage, quality/cost/latency comparison, upstream upgrade exercised |

Unsupported is a useful explicit value. These declarations are not a generic capability registry that
every Runtime must implement in full. Application preflight refuses a demanded guarantee that lacks
proof. A probe can be same-process-only; a persistent production claim cannot conceal that restriction.

## Opaque work and native submission

Before submitting external work, pin the logical request identity and exact configuration. Use a
native idempotent submit/query contract if it exists. Saving a returned job ID only after submit leaves
a lost-ack gap; an adapter-local database alone does not close it. Reconcile native work by a stable
identity or hold it unknown. Native retrieval by “latest run” or nearest timestamp cannot establish
exclusive ownership.

Native checkpoints include whatever the native engine needs: transcript, graph position, output filter,
forms, resources or executable associations. The Driver must preserve those invariants while returning
only opaque references. [Recovery](recovery-and-compatibility.md) defines publication, retention and
upgrade windows. Do not create a shadow Kernel graph or second authoritative checkpoint.

## Tool mediation without splitting ownership

A supported mediated tool bridge performs this sequence:

```text
native selects tool → resolve underlying target and final semantic arguments
  → yield native continuation + Outcome Effect
  → Kernel accepts intent and admits exact action
  → trusted adapter establishes result
  → later Activation forwards correlated observation to native continuation
```

Argument-mutating middleware must finish before exact consent/admission. Output presentation hooks
can reshape the model-facing observation but cannot rewrite trusted attempt evidence. Audit cache,
fallback, nested delegation and code/terminal paths; a callback hook does not prove they all pass it.
A late hook rejection after a tool ran is observation, not prevention.

If the native API only awaits a live callback, a live coroutine bridge can work in an ephemeral profile.
For durable operation it needs native durable suspension or a safe native replay contract. Never serialize
a Promise, replay a billable/toolful prefix blindly, or add a second unversioned action RPC during an
unaccepted Activation. Prefer an outer artifact/approval/action handoff when deep interception damages
native quality or cannot resume honestly. Any future alternate streaming action protocol requires its
own atomicity/fencing design and evidence; it is not silently permitted by this page.

OpenClaw's [host capabilities](../../../openclaw/src/agents/harness/host-capability-types.ts) bind current
activity, prepared tools and approval to the admitted host context. CrewAI's
[executor tool path](../../../crewAI/lib/crewai/src/crewai/experimental/agent_executor.py) uses mutable
before-hooks, raw results and presentation hooks. Hermes'
[handle_function_call](../../../hermes-agent/model_tools.py) resolves indirect bridge targets before
middleware. These are specific integration seams to inspect, not proof that the same adapter works
across all their tool paths or versions.

## Native human work and completion

Preserve a native form/feedback request under one resume owner. Kernel waiting requires a durable
correlation/subscription or a native job contract that can safely be queried; polling can remain in
RUNNING without inventing a second user request. A native human answer is feedback unless it satisfies
the exact consent binding in [authority](authority-and-actions.md).

Dify's [runner](../../../dify/dify-agent/src/dify_agent/runtime/runner.py) emits `run_succeeded` with either
final output or `deferred_tool_call` plus session snapshot. The latter is not Kernel completion.
Its [human-input service](../../../dify/api/services/human_input_service.py) checks form state and routes
resumption to the owning Workflow or Agent application. Preserve those mappings, and independently
test the submit-to-resume enqueue gap rather than inferring durability from an API status. CrewAI
[human feedback](../../../crewAI/lib/crewai/src/crewai/flow/human_feedback.py) likewise owns native routing.

## Fidelity experiment and adoption decision

Compare native-only and thin Driver configurations on the same useful public task. First use fake
models/services for identity, pause/resume, typed output, context/tool preservation, cancellation and
unknown-work tests. Then test live quality for the profile being supported: native behavior, verified
outcome, cost/latency, unsupported features and one upstream upgrade. Pin input/config/versions and
margins before comparing; disclose when normalizing configuration removes native advantages.

R1 starts after K1; K2 is needed for mediation. Its findings constrain K3 **before persistence design
freezes**. Test a second independently designed Runtime before promoting a shared extension. If an
outer native job is adequate, remove deep interception. If a Crew/Flow or Dify application already
owns the entire needed process, direct use may remove the need for ArrokothI itself.
