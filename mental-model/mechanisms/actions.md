# From accepted Effect to external evidence

An accepted [logical action](../concepts/actions.md#logical-action-and-intent) has
immutable input. [Admission](../concepts/actions.md#admission-and-physical-action-attempt)
authorizes a physical attempt; [settlement](../concepts/actions.md#settlement-and-reconciliation)
records what is known. K2 introduces these mechanisms; K1 refuses Effects at Outcome validation.

**Status:** Required Kernel contract. Introduced by K2.1–K2.3. K1 refuses Effects. This is
target specification, not shipped behavior.

## Admission and sending

```text
accepted intent → operation/input validation → current policy and consent
                → recorded attempt admission → trusted adapter sends exact request
                → authenticated evidence, action observation, result Event/readiness
```

Unknown operations, invalid input and unsupported schema constructs refuse before
executor invocation. A business refusal is an observation the Runtime can handle,
not necessarily Execution failure. Waiting for consent consumes no physical attempt.
[Authority](authority.md#order-revocation-against-admission) owns the final ordered admission.

An attempt records adapter/operation revision, account/resource, policy/consent decision,
exact payload, attempt identity and admission order. Admitted work with a lost send/result
may have executed. Do not turn absence of a receipt into definite failure.

Logical IDs prevent repeated Outcome acceptance from creating another action. An
optional application idempotency key can bind proposals across Activations only under
a declared principal/operation/resource scope, immutable content and expiry contract.
Equal payloads alone do not deduplicate: two intentional purchases can be identical.

## Retrying an action

Retry uncertain work only with provider-enforced idempotency valid for the scope/window
or reliable proof of non-execution. A key in the Kernel's own database is not provider
deduplication. Physical retries retain logical identity and recheck authority/consent.
Changed arguments form a new action; compensation also forms a new authorized action.

An array of Effects is independent unordered intent, not a transaction or execution
sequence. For “reserve → charge → publish,” propose charge only after reserve's result,
and publication only after charge's result. Application/Workflow saga policy owns any
compensation; failure of action 2 cannot roll back action 1.

## Settlement and refinement

Authenticate evidence against adapter/provider/account and original attempt. Validate
its schema and identity. Exact duplicates return their original receipts; changed
content under the same evidence identity conflicts. Retain contradictory trusted
reports and flag reconciliation rather than choosing last-write-wins. Provider sequence
numbers do not make an untrusted report authoritative.

Settlement commits evidence, action state, the result Event and applicable readiness
together. [Wait rules](waits.md) apply at destination acceptance. Provisional status
need not generate a business Event unless subscribed to.

Unknown may later refine to observed success or definite failure through authorized
reconciliation. Append a new immutable evidence revision and action-observation Event;
do not edit one the Runtime already acknowledged. A malformed result can coexist with
proven external success when the adapter distinguishes them; otherwise keep uncertainty.
Preserve raw evidence independently of model-facing presentation.

For example, “payment succeeded, receipt body is malformed” differs from “we cannot
tell whether payment ran.” Neither justifies blindly submitting a new payment.

## Withdrawal and remaining responsibility

Withdrawal before admission atomically prevents future admission and records refusal.
If admission won, attempt cancellation only where supported and retain possible execution.
Expiry before admission closes the request; expiry after send does not prove non-execution.
Wait expiry is a separate clock.

Every accepted action retains responsibility until a known disposition is accounted
for or ownership changes explicitly. An operator's “stop trying” changes disposition
or responsibility, not external truth. Acknowledged unknown evidence cannot satisfy
[completion](lifecycle.md#completion-is-an-accounting-check).

Late authenticated evidence after failure/cancellation updates the original ledger
and responsible owner, without reopening the Execution. No reliable query means retain
unknown for the application; elapsed time, Agent prose or weakly consistent absence
cannot establish success/failure. Refusing arbitrary detachment is compatible with
the minimal release, but failures still need an application reconciliation owner.
