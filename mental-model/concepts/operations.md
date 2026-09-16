# Operational and communication terms

These terms describe where the logical architecture runs and how Executions relate to each other. They group as three independent families. **Where code runs and what it may touch**: Kernel Worker, Execution Host, and the two trust modes — Trusted and Isolated Execution — with the operating profile that says which guarantees a deployment claims. **Time**: the three clocks that different questions about an Execution are answered against. **Executions talking to each other and to observers**: children and ownership, messages and correlation, observation cursors, and the debt that accumulates when observers or cleanup fall behind. [Deployment](../deployment.md) summarizes the first family; [communication](../mechanisms/communication.md), [output](../mechanisms/output.md) and [resources](../mechanisms/resources.md) own the mechanisms behind the third.

## Kernel Worker

A **Kernel Worker** performs Kernel state transitions and coordinates accepted work. This is a process role, not a required standalone deployment service.

## Execution Host

An **Execution Host** runs Runtime code. One process may be both host and Kernel Worker, and a host may run several Executions. A remote native provider may supply a job API instead of an ArrokothI-managed host.

## Trusted Execution

**Trusted Execution** intentionally permits ambient filesystem/network/process powers supplied by the deployment. Kernel action guarantees cover only the mediated paths. An interface contract alone does not contain arbitrary same-process code.

## Isolated Execution

**Isolated Execution** physically contains Runtime access according to a tested threat model. It uses a suitable sandbox/container/VM or equivalent backend. Isolation is independent of mediation: permitted native network calls still bypass Kernel admission.

## Operating profile and durability

An **operating/support profile** states the tested storage, Runtime, host versions, failure assumptions, recovery modes, limits and retention. **Durable** means that the specified accepted facts survive the specified failures during the promised period. The first persistent profile covers process failure with surviving storage, not storage disaster or arbitrary native recovery.

## Three clocks

Three different questions have a time limit, and each is answered by its own clock: how long a Runtime will wait for one observation, how long the Execution as a whole may live, and how long a worker may keep its exclusive claim on advancing it. They expire for unrelated reasons and their expiries mean different things.

| Clock | Exact purpose | Expiry consequence |
|---|---|---|
| Wait deadline | Bound one wait registration | End that wait and produce a timeout Event |
| Execution deadline | Bound the logical Execution lifetime | Enter ordered cancellation |
| Scheduler lease | Bound a worker's exclusive claim | Trigger recovery inspection/reassignment eligibility |

A **scheduler lease** is not proof the previous process died. A wait deadline is not proof an action failed. These clocks have independent identities and must not share one timer/field: an Execution waiting a week for an editor has a long wait deadline and, at the same time, a lease measured in seconds that keeps being renewed by whichever worker currently holds it. Folding them into one "timeout" would either expire the wait every few seconds or leave a dead worker's claim standing for a week. [Wait expiry](../mechanisms/waits.md#ending-a-wait), [cancellation](../mechanisms/lifecycle.md) and [recovery](../mechanisms/recovery.md) own what happens when each one fires. Units, precision and lease renewal mechanism remain implementation-owned.

## Child and ownership

The remaining terms describe Executions in relation to one another. The first relation is creation: one Execution asking, through a mediated request, for another to exist.

A **child Execution** is independently managed work created through an owning Execution's mediated request. **Ownership** means responsibility for required work, not universal access. **Required work** remains an obligation until its result is accounted for or responsibility is explicitly transferred/abandoned under policy.

A **call** helper combines child creation and required terminal-result handling. A **spawn** helper omits immediate waiting, not responsibility. **Detachment** transfers responsibility to a named durable owner; arbitrary detachment may be refused in the minimum release. **Supervision** is application/Runtime policy for child failures, retries and cancellation, not an automatic ancestry rule.

## Message, request and correlation

A **message** is addressed input routed by a mediated Effect. Send success means destination-mailbox acceptance, not Runtime processing. A **correlation** associates observations with the request/dependency they concern; knowledge of its ID is not permission to reply or settle.

A **request/reply record** binds requester, allowed responder, destination, expected reply contract, open/closed state and optional expiry. A **human input request** similarly binds a response contract, eligible human and one resume owner. A reply is an observation, not automatically consent or action settlement. [Communication](../mechanisms/communication.md) owns creation, closure and routing.

## Observation, cursor and routing

**Output observation** reads accepted output without submitting an Event or changing Runtime progress. An **output cursor** names an Execution/output view and replay position; it is not authority. A **routing obligation** records a durable duty to deliver addressed input later. It is not destination acceptance until that mailbox actually accepts it.

## Backpressure and cleanup debt

**Backpressure** bounds admitted/queued work when capacity is exhausted. Apply it before promising an acceptance the system cannot actually retain. **Cleanup debt** is known remaining resource cleanup with a responsible owner and lifetime/cost consequences. Terminal Execution state does not imply that debt or remote work has disappeared.
