# Capabilities, Effects, and authority

[Guide home](README.md). Current target semantics are owned by the [Kernel](../../kernel.md), with
[authority/action detail](../../detail-design/authority-and-actions.md) and deployment trust limits in
[Deployment](../../deployment.md). This page describes the implemented 0.8.x authoring surface.

## Assemble the action path

1. Describe each operation in `createCapabilityCatalog`: capability/operation identity, useful
   description, bounded portable input schema, and explicit `consequential` classification.
2. Implement `CapabilityExecutor.execute`. Dispatch by capability **and** operation, validate the
   domain request, access the real service, and return a truthful `CapabilityOutcome`.
3. Grant the Execution's capability-operation ceiling at `createExecution({ operationAuthority })`.
4. Request only useful model exposure in `AgentSpec.operations`, or declare LLM Stage `callables`.
5. Configure an `EffectAuthorizer` on the Harness. Exposure and a ceiling are not final permission.
6. Add `ConfirmationPolicy` for exact payloads that require approval. Omission means **no** mandatory
   confirmation; merely declaring an operation consequential does not prompt the user.

The [runnable application](../../../examples/execution-kernel-minimal/patterns.ts) wires these together.
Catalogs are descriptors, not credential stores, executors, or a universal input validation gateway.
Conforming ModelProviders validate projected arguments, but a Function/custom-controller capability request does not
receive equivalent catalog-schema enforcement in the Effect processor. Validate at the executor or
trusted domain boundary too; see [findings](../../development/003-evidence-and-findings.md).

`createAllowListAuthorizer` is a reference static policy. It selects the **first capability-matching
grant**, then checks that grant's operations/resources. Consolidate operations for one capability in
one grant, or implement a domain policy for per-operation constraints. Multiple entries are not a
union. Static `executions` omitted means the rule applies to every Execution. Tenant/principal mapping
and current business prerequisites are application policy, not inferred from Definition names.

For exact gates, inspect the proposal and current trusted state on every authorization. In a real
multi-tenant application, map `executionId` to a trusted principal and enforce tenant ownership of
resource IDs. A model-supplied tenant ID is an argument, not authentication.

## Design a useful operation

Prefer distinct task operations, compact search results with references, bounded detail retrieval,
and errors that explain correction or retry. Exact filtering, arithmetic, pagination and conditional
writes belong in code. Keep read-only lookup separate from mutation. Use `ObjectSchema` constraints;
never rely on a description to enforce a threshold. Credentials remain in deployment wiring.

A Function Stage **returns** an `awaitEffects` request; it never calls the executor. LLM inference,
parsing, and local transformations are computation. Structured Memory writes, external capabilities,
child creation, peer communication, and typed user-input requests are the five Effect kinds; check
[which surface can emit them](current-authoring-surface.md).

## Confirmation and outcomes

```text
proposal → current authorization → optional exact-payload confirmation
         → dispatch → environment outcome → correlated observation
```

The UI discovers requests using `pendingConfirmations()` or `confirmationRequestsOf(id)`, shows the
stored `proposal`, and calls `resolveConfirmation({ confirmationId, decision: 'approve' | 'decline' })`
through a trusted authenticated handler. Approval rechecks current authority and dispatches the
stored payload, or returns `status: 'replayed'` from a prior authoritative success without another
external call; a changed payload needs a new proposal. Reusing the same confirmation ID cannot
produce a second dispatch. Natural-language “yes”, an emission, or a Working Note is not resolution.

| Observation | Application response |
|---|---|
| `completed` | Use the actual receipt/observation, not the model's claim |
| `failed` | Definite failure; retry only if policy and operation semantics allow |
| `unknown` | May have happened; reconcile externally before retrying |
| `denied` | Policy refused; correct prerequisites or report refusal |
| `rejected` | Invalid/unanswerable request; diagnose the rejection code |
| `declined` | Human declined this payload; do not silently ask again or reissue |
| `conflicted` | Stale memory revision; no write occurred; resolve explicitly |

The executor uses `status: 'success' | 'failure' | 'unknown'`; controller observations use the above
vocabulary. A settled barrier is not a success barrier. The reference Agent may still produce false
prose after an adverse observation, so assert world state in tests and present receipts in the UI
when a factual status must be exact.

## Deadlines, retries, and cancellation

- `UseCapability.deadlineMs` (or policy `maxDeadlineMs`) bounds that operation. The activation wait
  budget only determines whether to yield; it is not an operation timeout. The host must continue
  driving the runtime for deadline handling. See [diagnosis](evaluation-and-diagnosis.md).
- Child result, peer reply, typed user input, and confirmation waits have no configured deadline.
  Own their timeout policy in host code; cancel explicitly when appropriate.
- `cancelExecution` does not cascade to descendants or siblings. Enumerate child links and cancel
  those you intend to stop. Cancellation is not rollback of an external action.
- `idempotency: 'per_input'` is narrow in-runtime duplicate recognition for capability requests.
  For direct and confirmed dispatch, an exact prior success replays; unresolved/unknown consequential
  work blocks automatic redispatch. Equivalent confirmations approved concurrently linearize at
  dispatch intent, so at most one reaches the executor. A known duplicate is replayed before a
  redundant confirmation when prior truth is already available. `none` does not provide
  cross-proposal suppression.
- External idempotency is separate: use an application action ID/unique key and conditional write at
  the system of record, with reconciliation for unknown outcomes. The example's title key is a small
  domain convention, not a generic identity scheme. In-memory journals provide no crash protection.

## Security and budgets

The current profile is trusted-local: policy enforcement applies to Harness-mediated operations;
it is not a sandbox for arbitrary code in the process. Legitimately readable secrets can leak through
legitimately allowed output; no general information-flow guarantee exists. Treat model/retrieved
content as data that can influence requests, never permission.

Set `AgentLimits`, Workflow `maxTransitions`, provider/output bounds, operation deadlines, and root
`structuralSpawnBudget` as relevant. These bound work and do not grant it. Agent `maxModelCalls`
defaults to **8 across the whole Execution**, including later conversation turns. A transcript window
is not a spend budget. Surface exhaustion as failure and decide an application continuity policy;
do not silently reset budgets to evade limits.
