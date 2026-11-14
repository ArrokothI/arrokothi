/**
 * The native Runtime's store under the legacy Driver (K1.4 design 03 §2.3, addendum D03-CHK-01).
 *
 * Every port method is forwarded unchanged. `transact` returns the underlying store's own promise
 * object, so its result or exception reaches the native caller untouched; the facade adds no read and
 * no `await` to the transaction. When that promise settles, either way, the facade calls `onSettled`
 * synchronously with the transaction's scope. The Driver's handler cannot fail (it resolves the scope's
 * lineage from a map of immutable roots, or wakes every waiter), so a committed change always wakes its
 * lineage and a notification never turns into a fictitious rollback.
 */

import type { ExecutionId } from "@arrokothi/core";
import type { RuntimeStore, RuntimeTransaction } from "@arrokothi/core/ports";

type Port = RuntimeStore;

export class CommitSignallingStore implements RuntimeStore {
  private readonly inner: Port;
  private readonly onSettled: (scope: string) => void;

  constructor(inner: Port, onSettled: (scope: string) => void) {
    this.inner = inner;
    this.onSettled = onSettled;
  }

  transact<T>(scope: ExecutionId, work: (tx: RuntimeTransaction) => Promise<T>): Promise<T> {
    const result = this.inner.transact(scope, work);
    const settled = (): void => this.onSettled(scope);
    // The handlers never throw; the returned promise is the store's own.
    void result.then(settled, settled);
    return result;
  }

  readExecution(...args: Parameters<Port["readExecution"]>): ReturnType<Port["readExecution"]> { return this.inner.readExecution(...args); }
  listExecutions(...args: Parameters<Port["listExecutions"]>): ReturnType<Port["listExecutions"]> { return this.inner.listExecutions(...args); }
  listEmissions(...args: Parameters<Port["listEmissions"]>): ReturnType<Port["listEmissions"]> { return this.inner.listEmissions(...args); }
  listTransitions(...args: Parameters<Port["listTransitions"]>): ReturnType<Port["listTransitions"]> { return this.inner.listTransitions(...args); }
  listPendingOperations(...args: Parameters<Port["listPendingOperations"]>): ReturnType<Port["listPendingOperations"]> { return this.inner.listPendingOperations(...args); }
  readPendingOperation(...args: Parameters<Port["readPendingOperation"]>): ReturnType<Port["readPendingOperation"]> { return this.inner.readPendingOperation(...args); }
  listEffectJournal(...args: Parameters<Port["listEffectJournal"]>): ReturnType<Port["listEffectJournal"]> { return this.inner.listEffectJournal(...args); }
  listControllerResumptions(...args: Parameters<Port["listControllerResumptions"]>): ReturnType<Port["listControllerResumptions"]> { return this.inner.listControllerResumptions(...args); }
  readControllerResumption(...args: Parameters<Port["readControllerResumption"]>): ReturnType<Port["readControllerResumption"]> { return this.inner.readControllerResumption(...args); }
  findControllerResumptionByKey(...args: Parameters<Port["findControllerResumptionByKey"]>): ReturnType<Port["findControllerResumptionByKey"]> { return this.inner.findControllerResumptionByKey(...args); }
  readOperationAuthority(...args: Parameters<Port["readOperationAuthority"]>): ReturnType<Port["readOperationAuthority"]> { return this.inner.readOperationAuthority(...args); }
  readLineageSpawnBudget(...args: Parameters<Port["readLineageSpawnBudget"]>): ReturnType<Port["readLineageSpawnBudget"]> { return this.inner.readLineageSpawnBudget(...args); }
  readChildExecutionLink(...args: Parameters<Port["readChildExecutionLink"]>): ReturnType<Port["readChildExecutionLink"]> { return this.inner.readChildExecutionLink(...args); }
  listChildExecutionLinks(...args: Parameters<Port["listChildExecutionLinks"]>): ReturnType<Port["listChildExecutionLinks"]> { return this.inner.listChildExecutionLinks(...args); }
  readPeerRequestLink(...args: Parameters<Port["readPeerRequestLink"]>): ReturnType<Port["readPeerRequestLink"]> { return this.inner.readPeerRequestLink(...args); }
  listPeerRequestLinksByRequester(...args: Parameters<Port["listPeerRequestLinksByRequester"]>): ReturnType<Port["listPeerRequestLinksByRequester"]> { return this.inner.listPeerRequestLinksByRequester(...args); }
  listPeerRequestLinksByResponder(...args: Parameters<Port["listPeerRequestLinksByResponder"]>): ReturnType<Port["listPeerRequestLinksByResponder"]> { return this.inner.listPeerRequestLinksByResponder(...args); }
  readCancellationRequest(...args: Parameters<Port["readCancellationRequest"]>): ReturnType<Port["readCancellationRequest"]> { return this.inner.readCancellationRequest(...args); }
  readUserInputRequest(...args: Parameters<Port["readUserInputRequest"]>): ReturnType<Port["readUserInputRequest"]> { return this.inner.readUserInputRequest(...args); }
  listUserInputRequests(...args: Parameters<Port["listUserInputRequests"]>): ReturnType<Port["listUserInputRequests"]> { return this.inner.listUserInputRequests(...args); }
  listOpenUserInputRequests(...args: Parameters<Port["listOpenUserInputRequests"]>): ReturnType<Port["listOpenUserInputRequests"]> { return this.inner.listOpenUserInputRequests(...args); }
  readConfirmationRequest(...args: Parameters<Port["readConfirmationRequest"]>): ReturnType<Port["readConfirmationRequest"]> { return this.inner.readConfirmationRequest(...args); }
  listConfirmationRequests(...args: Parameters<Port["listConfirmationRequests"]>): ReturnType<Port["listConfirmationRequests"]> { return this.inner.listConfirmationRequests(...args); }
  listPendingConfirmations(...args: Parameters<Port["listPendingConfirmations"]>): ReturnType<Port["listPendingConfirmations"]> { return this.inner.listPendingConfirmations(...args); }
  readStructuredMemoryView(...args: Parameters<Port["readStructuredMemoryView"]>): ReturnType<Port["readStructuredMemoryView"]> { return this.inner.readStructuredMemoryView(...args); }
}
