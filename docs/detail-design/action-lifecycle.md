# Action admission, settlement and delivery

**Owner:** Kernel for mediated action records; trusted adapters for external evidence; application
transports for delivery. **Status:** target K2/K3/K5. [Authority](authority-and-actions.md) owns consent
and policy. This is not a new universal PendingOperation hierarchy.

## One request, several kinds of fact

An Effect is a proposal in an Outcome. Acceptance creates an immutable **logical action** record.
Physical attempts, human decisions, returned values and ownership obligations are related records,
not alternative names for the action. Each applicable record has a stable identity and revision.

Do not compress all of these into one ambiguous `status`:

| Dimension | Facts to distinguish |
|---|---|
| Request disposition | Proposed/accepted; waiting for consent; eligible; denied/refused/declined/expired/withdrawn; no further attempts |
| Attempt evidence | No attempt admitted; admitted and may have run; observed success; definite failure; unknown |
| Result contract | Validated value; invalid/missing value; partial evidence |
| Responsibility | Still required by Execution; transferred to a named durable owner; deliberately abandoned under policy |

These are conceptual dimensions, not mandatory enum names or a Cartesian product of states. An
approved action may be denied without a physical attempt. A cancelled request may have succeeded
externally. A malformed output can coexist with trustworthy evidence of external success. Preserve
both when the adapter can prove them; otherwise report unknown, never fabricated failure.

## Admission and attempts

```text
accepted immutable intent
  → operation/input validation
  → current policy and required consent
  → atomic attempt admission under dispatcher ownership
  → trusted adapter sends exact request
  → authenticated evidence + action revision + result Event + wake intent
```

Unknown operations, invalid input and unsupported schema constructs refuse before an executor runs.
A normal business refusal is an action observation the Runtime can handle, not necessarily Execution
failure. Waiting for consent consumes no physical attempt. Admission does not imply the remote system
received anything. Until proved otherwise, a lost admitted attempt may have executed.

Stable logical IDs prevent a retried Outcome creating another action. Optional application idempotency
keys can link proposals across Activations only within a declared principal/operation/resource scope
and with identical request content. Never deduplicate arbitrary equal payloads globally: two legitimate
purchases or messages may be identical. Keys, scope and expiry are part of the operation contract.

A physical attempt records adapter/operation revision, account/resource binding, policy/consent
reference, exact payload reference, attempt identity and admission order. Retry of an unresolved
attempt requires provider-enforced idempotency valid for this scope/window, or reliable proof of
non-execution. “Our database has a key” does not prevent the provider acting twice. All physical retries
retain logical identity and recheck current authority. Semantic retry with changed arguments is a
new action; compensation is also a new authorized action.

An array of Effects is unordered independent intent. For `reserve → charge → publish`, propose the
next step only after receiving the prerequisite's evidence. A saga or rollback policy belongs in the
application/Workflow; the Kernel records each action and compensating action independently.

## Evidence revisions and reconciliation

Settlement ingress authenticates the adapter/provider/account and binds the original attempt. It
validates payload/schema and evidence identity. Exact duplicate evidence returns its receipt. Same
evidence identity with changed content is a conflict. Contradictory trusted reports are retained and
flagged for reconciliation, not last-write-wins truth. Provider sequence numbers alone do not make
an untrusted report authoritative.

Unknown can later be refined to observed success or definite failure by authorized reconciliation.
Emit a new immutable action-observation Event with a new evidence revision; do not edit an Event a
Runtime already acknowledged. Provisional updates need no new business Event unless the Runtime
subscribes to them. An acknowledged `unknown` Event does **not** discharge a completion obligation.
Late evidence after terminal cancellation updates the action ledger and responsible owner without
reopening the Execution or overwriting its terminal result.

Reconciliation is a trusted inspect/query path over existing work. Record who resolved it, what
external evidence supports the decision and which prior revision it refines. An operator choosing
“stop trying” changes responsibility/disposition, not proof of external failure. If no reliable
provider query exists, retain unknown and escalate to the application; do not derive success from
Agent text, an absent search result with weak consistency, or elapsed time alone.

## Withdrawal, cancellation and obligations

Withdrawing a not-yet-admitted action atomically blocks future admission and records a refusal Event.
If admission won first, attempt cancellation only where supported, retain possible execution and
reconcile. A deadline expiring while approval is pending closes that request; a deadline after sending
does not imply non-execution. [Execution protocol](execution-protocol.md) owns timer/control ordering.

All accepted actions are owned until a known disposition is accounted for or responsibility changes
explicitly. A failed/cancelled Execution leaves a durable application/reconciliation owner for unknown
attempts. Permission to abandon a dependency is not permission to delete action evidence or say it
succeeded. The minimal 1.0 can refuse arbitrary detachment/transfer APIs; it still needs an operator
owner for failures. See [composition](composition-and-communication.md) for child obligations.

## Results, emissions and delivery

Runtime output can be provisional, accepted nonterminal emission, or accepted terminal result.
Only accepted output has a stable Kernel replay position. A process stdout token is not a committed
emission. An application may show provisional text but cannot use it as an authorization receipt or
asserted terminal outcome. On failed attempts it may retract/mark provisional text; do not silently
splice two attempt streams into one apparently accepted transcript.

A Runtime proposing completion has no new Effects. Kernel-to-parent result routing is a Kernel
obligation created with terminal acceptance. External delivery is separately owned by an application
adapter; accepted result and output-publication intent must not have a lost-output gap. Delivery may
remain pending or unknown after COMPLETED. If business success requires a delivery receipt, the Runtime
must request that action and observe its result **before** completion, then return the receipt.

Subscriptions use stable output IDs/cursors and may redeliver after disconnect. Consumers deduplicate.
Resume beyond retention returns an explicit gap/expired cursor, not an empty stream pretending all
output arrived. Authorize reads and destination/account selection at reconnect and delivery admission.
Transport-level batching/rendering has its own immutable prepared payload identity; a retry must not
silently send a newly rendered message to a newly resolved destination.

Prior art: OpenClaw's [task records](../../../openclaw/src/tasks/task-registry.types.ts) separate task
status and delivery status. [Unknown-send reconciliation](../../../openclaw/src/infra/outbound/delivery-queue-reconciliation.ts)
passes exact prepared payloads, destination, account and send-start evidence to a channel-specific
adapter. Prefer its channel service where it already owns delivery; copying a generic retry loop
would discard the mechanism that makes its certainty meaningful.

## Acceptance matrix

K2/E2: denied/declined/invalid input yields zero sink attempts; concurrent approvals share one action;
malformed consequential output is not definite failure; same payload with a fresh intentional key
remains a distinct action. K3/E4: kill after admission, after remote success, after settlement and
before wake; query/retry only under the tested operation contract. K5: reconcile after cancellation,
expire idempotency windows, replay output cursors and lose the delivery receipt. Retain independent
sink evidence so the laboratory cannot manufacture the subject's safety/recovery result.
