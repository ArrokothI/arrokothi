# Actions, authority and observations

These canonical terms separate a request, permission to try it and evidence of what happened. [Authority](../mechanisms/authority.md) and [actions](../mechanisms/actions.md) compose them.

## Operation

An **operation** is an invocable versioned contract: identity, input/output schema, supported schema features, exact input meaning and result-certainty behavior. For example, `publish_report` can describe the callable contract before any report is selected. Its name shown to a model is an alias, not its stable identity.

## Effect

An **Effect** is a proposal for one Kernel-mediated interaction, carried in an Outcome. Examples include invoking a service, reading governed data, requesting human input, creating a child and sending a message. An Emission is not an Effect.

A **proposal key** is the Runtime's stable local name for that proposal within the Activation. Acceptance binds it to an **Effect ID** — the immutable logical request identity within the Execution, such as an Activation paired with a local key. This is not the ID of a physical send. A wait may refer to the same Outcome's proposal key.

## Logical action and intent

A **logical action** is the immutable action record created when an Effect is accepted. An **intent** is an accepted obligation to perform or route specified work later; it is not evidence that the work already ran. “Action” on these pages means mediated work unless explicitly qualified as native.

## Admission and physical action attempt

**Admission** is the ordered decision that authorizes a concrete action attempt under current policy and required consent. It records that intent under current dispatch ownership. A **physical action attempt** is one invocation of that logical action through a trusted adapter. Admission can precede sending and cannot prove receipt. Its dispatch ownership/fencing is separate from the Runtime's writer epoch.

## Settlement and reconciliation

**Settlement** accepts authenticated evidence for a particular action attempt and records its observation for the Runtime. **Reconciliation** queries or inspects existing external work through a trusted path to resolve uncertainty. It is not blind re-execution.

Keep four dimensions distinct:

| Dimension | Meaning and example |
|---|---|
| Request disposition | What may happen next: waiting for approval, denied, withdrawn, no more attempts |
| Attempt evidence / certainty | What is known externally: no attempt, may have run, observed success, definite failure, unknown |
| Result validity | Whether the returned value satisfies the result contract, even if the action ran |
| Responsibility / obligation | Who still owes settlement or required results: Execution, named durable owner, explicit policy abandonment |

These are conceptual dimensions, not a mandated enum cross-product. An invalid result can coexist with proven external success. Stopping retries changes disposition, not certainty. Acknowledging an unknown observation does not remove the obligation.

## Principal and authority

A **principal** is an authenticated application identity — a user, a service, or an acting-on-behalf-of identity — with tenant/application scope where applicable. An Execution is not a principal. **Authority** is the upper bound of Kernel-mediated operations/resources available to an Execution. **Policy** decides whether a concrete request is permitted now and can narrow that bound. A **grant** records authority and, when applicable, delegation constraints.

**Delegation** passes only the intersection of requested power, the parent's delegable bound and current policy. Ownership ancestry is not a universal permission edge.

## Exact consent

**Exact consent** is an eligible authenticated human's decision about one immutable logical action: scoped identity, validated arguments, operation version, meaningful account/resource/content bindings and validity/approval policy. Ordinary feedback or standing intent is not that decision. Approving “Plan A” need not approve its eventual recipient and payload. The [consent mechanism](../mechanisms/authority.md#exact-action-consent) owns the full binding and mutation rules.

## Exposure and mediation

**Exposure** means filtered visibility of authorized operation metadata or callable choices. It is not a grant or mandatory durable object. **Mediation** means the specific action path goes through Kernel admission and settlement. **Ambient/native action** uses powers provided directly by the Runtime's host or native system. Telemetry that observes such an action does not mediate or prevent it.

## Withdrawal and compensation

**Withdrawal** is an explicit control preventing future admission of a named request. A correction message alone is not withdrawal. **Compensation** is a new authorized action intended to counter an earlier action; it is not rollback of external history.

## Emission, result and output obligation

An **Emission** is accepted nonterminal output from an Outcome. A **terminal result** is output accepted with completion. **Provisional output** is unaccepted diagnostic or streaming content, such as stdout tokens from a still-running attempt.

An **output obligation** makes accepted Emissions/results available for authorized, retention-bounded observation/replay. Older “publication intent” means this obligation, not automatic public disclosure or channel sending. External delivery is a separate application-adapter responsibility. [Output](../mechanisms/output.md) owns the exact rules.
