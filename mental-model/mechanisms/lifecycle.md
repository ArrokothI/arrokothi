# Lifecycle, cancellation and completion

This page owns the transitions of one [Execution](../concepts/core.md#execution). Terminal states never reopen; intentional re-execution creates a new identity.

There are only five states, and every transition between them is caused by one accepted Kernel decision — a creation, a dispatch, an Outcome acceptance, a wake or expiry, or a cancellation control. Nothing a Runtime does on its own moves an Execution between states; it can only propose, and the transition happens when the proposal is accepted.

```text
atomic create + initial input                         → READY
READY + accepted dispatch intent                      → RUNNING
RUNNING + accepted continue                           → READY
RUNNING + accepted await                              → WAITING or READY
RUNNING + accepted complete                           → COMPLETED
RUNNING + accepted fail                               → FAILED
WAITING + eligible Event or current deadline expiry   → READY
nonterminal + accepted cancellation control           → CANCELLED
```

`RUNNING` means an [Activation](../concepts/core.md#activation) is unresolved, not that a process is healthy. Lost work can remain visibly [recovery-held](../concepts/state.md#recovery-and-re-execution). `WAITING` exists only for an accepted Runtime-declared Kernel dependency. [Wait registration](waits.md#registering-a-wait) determines whether an `await` instead immediately yields `READY`.

**Status:** Required Kernel contract. Introduced by K1.2–K1.3; completion accounting bites from K2.3. This is target specification, not shipped behavior.

## Cancellation order

Cancellation is a Kernel control operation independent of the Runtime [mailbox](../concepts/core.md#mailbox). Its **request acceptance** immediately fences new progress and [action admission](../concepts/actions.md#admission-and-physical-action-attempt). Native interrupt may occur later; the Kernel requests it without waiting for cooperation. [Execution deadline](../concepts/operations.md#three-clocks) expiry uses this same control path.

Cancellation and an in-flight Outcome can race, and the race needs one unambiguous referee. Order cancellation acceptance against [Outcome acceptance](execution-cycle.md#outcome-acceptance), not submission time or later physical stop — submission time is not something the Kernel can trust or even observe consistently, and physical stop may never come. Whichever decision the Kernel accepts first wins outright; there is no partial overlap. If the Outcome wins, its complete atomic result stands. A later cancel acts on its nonterminal result or reports its already terminal result. If cancellation wins, every new losing Outcome (`continue`, `await`, `complete`, `fail`) is rejected in full, with no accepted component.

Record the losing proposal — its scoped Execution/Activation/[epoch](../concepts/identity.md#writer-epoch)/base revision and [canonical content](../concepts/values.md#canonical-form) — under classification **cancellation/terminal-conflict**, reason **cancellation accepted before Outcome acceptance**. Its exact authenticated retry returns that same recorded rejection, including after cancellation completes. It does not manufacture an acceptance [receipt](../concepts/identity.md#acceptance-boundary-and-receipt). Retention expiry never removes the terminal fence. In contrast, retry of an Outcome accepted *before* cancellation still returns its original acceptance receipt without mutations.

The losing reserved [batch](../concepts/core.md#batch-reservation-and-acknowledgment) remains unacknowledged. The cancellation control path gives all unprocessed Events explicit terminal dispositions. A pending/applied operational marker cannot defer the semantic fence, install losing progress or add a lifecycle state.

## Completion is an accounting check

`complete` is not a declaration of success that the Kernel takes on trust. It is a claim that nothing this Execution is responsible for is still outstanding, and the Kernel checks the claim against its own records before accepting it. A Runtime that has forgotten about a child it spawned, or an action whose result never came back, cannot complete until it says what happens to them.

An Outcome proposing completion must propose no new [Effects](../concepts/actions.md#effect). Required owned actions and [children](../concepts/operations.md#child-and-ownership) must have known dispositions, with their relevant results accounted for in previously acknowledged Events or this batch — unless responsibility was explicitly transferred or abandoned under policy. Approved but undispatched work is still pending. Acknowledging an unknown-action Event is not settlement and cannot discharge it.

A child failure can be accounted for without implying application success; the Runtime decides that meaning. Arbitrary detachment may be refused until a durable recipient of responsibility is defined. K1 has no Effects, but still enforces the rule at acceptance.

Failure/cancellation may proceed with unknown external work. Keep its evidence and application reconciliation/supervision owner. Late trusted [settlements](../concepts/actions.md#settlement-and-reconciliation) update their original action records without reopening the Execution or replacing its terminal result. Physical termination, child cancellation, compensation and cleanup follow separately declared policies; logical cancellation cannot promise that they all succeeded.

For live children, terminalization preserves the owner and any follow-up obligation defined by [supervision](communication.md#finite-expansion-and-supervision). It does not depend on a final callback from the parent Runtime. Closing the parent's wait or abandoning its interest in a reply cannot erase the child's independent lifetime or the remaining reconciliation responsibility.

Completion records the terminal result plus its [output obligation](output.md). Required [child-result routing](communication.md#children) commits with it or as a durable routing intent; it is not another Runtime Effect proposed at completion. External delivery may remain pending afterwards. If delivery is required for business success, request and account for that action before completing.
