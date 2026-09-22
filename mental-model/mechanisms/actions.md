# From accepted Effect to external evidence

An accepted [logical action](../concepts/actions.md#logical-action-and-intent) has immutable input. [Admission](../concepts/actions.md#admission-and-physical-action-attempt) authorizes a physical attempt; [settlement](../concepts/actions.md#settlement-and-reconciliation) records what is known. K2 introduces these mechanisms; K1 refuses [Effects](../concepts/actions.md#effect) at [Outcome](../concepts/core.md#outcome) validation.

**Status:** Required Kernel contract. Introduced by K2.1–K2.3. K1 refuses Effects. This is target specification, not shipped behavior.

One accepted intent travels through four stages, and the page follows them in order: **admission and sending** turns a request into at most one authorized attempt; **retrying** decides when a second attempt is safe, which is rarely; **settlement** records what can be known about an attempt that already happened; and **withdrawal** covers the request that should not run, or should stop being this Execution's problem. The thread running through all four is that the Kernel is recording what it knows, not what it hopes — an action whose result never came back stays unknown, and unknown is a disposition, not a failure.

## Admission and sending

```text
accepted intent → operation/input validation → current policy and consent
                → recorded attempt admission → trusted adapter sends exact request
                → authenticated evidence, action observation, result Event/readiness
```

Unknown [operations](../concepts/actions.md#operation), invalid input and unsupported schema constructs refuse before executor invocation. A business refusal is an observation the Runtime can handle, not necessarily Execution failure. Waiting for [consent](../concepts/actions.md#exact-consent) consumes no physical attempt. [Authority](authority.md#order-revocation-against-admission) owns the final ordered admission.

An attempt records adapter/operation [revision](../concepts/identity.md#revision), account/resource, policy/consent decision, exact payload, attempt identity and admission order. That record is written before the send, so that a crash in the middle leaves evidence that something may be running out in the world. Admitted work with a lost send/result may have executed. Do not turn absence of a receipt into definite failure: the receipt is evidence the Kernel did not get, not evidence the service did not act.

Logical IDs prevent repeated Outcome acceptance from creating another action. An optional application idempotency key can bind proposals across [Activations](../concepts/core.md#activation) only under a declared [principal](../concepts/actions.md#principal-and-authority)/operation/resource scope, immutable content and expiry contract. Equal payloads alone do not deduplicate: two intentional purchases can be identical.

## Retrying an action

Retrying a local computation is free. Retrying an action means possibly doing an external thing twice, and no amount of Kernel bookkeeping can undo the second one.

Retry uncertain work only with provider-enforced idempotency valid for the scope/window or reliable proof of non-execution. A key in the Kernel's own database is not provider deduplication: it can stop this Kernel from sending twice, but it cannot stop the provider from acting twice on two requests that did arrive. Physical retries retain logical identity and recheck authority/consent. Changed arguments form a new action; compensation also forms a new authorized action.

An array of Effects is independent unordered intent, not a transaction or execution sequence. Proposing three Effects together says only that three requests are wanted, not that they run in that order or that any of them is conditional on another. For “reserve → charge → publish,” propose charge only after reserve's result, and publication only after charge's result. Failure of action 2 cannot roll back action 1; recovering from that is [compensation](../concepts/actions.md#withdrawal-and-compensation), and nothing here performs one on its own.

## Settlement and refinement

Admission is the last point at which the Kernel controls anything. From here on it is a recorder: something happened, or may have happened, and the job is to write down what can actually be established about it, including that nothing can.

Authenticate evidence against adapter/provider/account and original attempt. Validate its schema and identity. Exact duplicates return their original [receipts](../concepts/identity.md#acceptance-boundary-and-receipt); changed content under the same evidence identity conflicts. Retain contradictory trusted reports and flag reconciliation rather than choosing last-write-wins. Two trusted sources disagreeing is a real fact about the world that someone needs to resolve; picking the later one hides it and produces a record that looks certain and is not. Provider sequence numbers do not make an untrusted report authoritative.

Settlement commits evidence, action state, the result [Event](../concepts/core.md#event) and applicable [readiness](../concepts/core.md#readiness) together. [Wait rules](waits.md) apply at destination acceptance. Provisional status need not generate a business Event unless subscribed to.

Unknown may later refine to observed success or definite failure through authorized reconciliation. Append a new immutable evidence revision and action-observation Event; do not edit one the Runtime already acknowledged. A malformed result can coexist with proven external success when the adapter distinguishes them; otherwise keep uncertainty. Preserve raw evidence independently of model-facing presentation.

For example, “payment succeeded, receipt body is malformed” differs from “we cannot tell whether payment ran.” Neither justifies blindly submitting a new payment.

## Withdrawal and remaining responsibility

Two different things can be true of a request nobody wants any more: it has not run and can still be stopped, or it may have run and can only be accounted for. Withdrawal addresses the first. Nothing addresses the second, which is why responsibility outlives it.

[Withdrawal](../concepts/actions.md#withdrawal-and-compensation) before admission atomically prevents future admission and records refusal. If admission already won, attempt cancellation only where supported, and still treat the action as possibly having executed. Expiry before admission closes the request; expiry after send does not prove non-execution. Wait expiry is a separate clock.

Every accepted action retains responsibility until a known disposition is accounted for or ownership changes explicitly. An operator's “stop trying” changes disposition or responsibility, not external truth: it is a decision about what this Execution will do next, not a discovery about what the service did. Acknowledged unknown evidence cannot satisfy [completion](lifecycle.md#completion-is-an-accounting-check).

Late authenticated evidence after [failure/cancellation](lifecycle.md#cancellation-order) updates the original ledger and responsible owner, without reopening the Execution. Without a reliable query, the ledger retains the result as unknown and escalates to the application; elapsed time, Agent prose or weakly consistent absence cannot establish success or failure. Refusing arbitrary detachment is compatible with the minimal release, but failures still need an application reconciliation owner.
