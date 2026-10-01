// Reviewer probe: a control request whose activationId getter reenters the coordinator after the
// control-power check. The control must classify against post-reentry state and mutate nothing.
import { ExecutionCoordinator } from "../packages/kernel/src/index.ts";
import { caller, createRequest, accepted, refused, recordingDriver, submissionFor, outcomeFor } from "../packages/kernel/tests/harness.ts";
const avail = { definitionRevisions: ["weekly-report@3"], runtimeContractRevisions: ["runtime-contract@1"], progressCodecs: ["inline-json@1"] };
for (const [control, reentry] of [["takeover", "resolve"], ["takeover", "takeover"], ["protocol", "takeover"], ["recover", "resolve"], ["protocol", "complete"]] as const) {
  const who = caller("app", "tenant"); const driver = recordingDriver(); const k = new ExecutionCoordinator({ driver });
  const { executionId } = accepted(k.createExecution(who, createRequest({ creationKey: "r", scope: "tenant" })));
  const open = accepted(k.dispatch(who, executionId, { bound: 1 }));
  let fired = 0;
  const request: any = { writerEpoch: 1, available: { ...avail, progressCodecs: [] }, get activationId() {
    fired++;
    if (reentry === "resolve") accepted(k.submitOutcome(who, outcomeFor(executionId, open), submissionFor(driver, open.activationId)));
    if (reentry === "complete") accepted(k.submitOutcome(who, outcomeFor(executionId, open, { next: { step: "complete", result: 1 } }), submissionFor(driver, open.activationId)));
    if (reentry === "takeover") accepted(k.requestTakeover(who, executionId, { activationId: open.activationId, writerEpoch: 1 }));
    return open.activationId;
  } };
  const before = accepted(k.inspect(who, executionId));
  const answer = control === "takeover" ? k.requestTakeover(who, executionId, request) : control === "recover" ? k.recoverExecution(who, executionId, request) : k.reportProtocolFailure(who, executionId, request);
  const after = accepted(k.inspect(who, executionId));
  const r = answer.ok ? "ACCEPTED" : (answer as any).error.classification;
  console.log(JSON.stringify({ control, reentry, fired, result: r, epoch: after.activation?.writerEpoch ?? null, state: after.state, holds: after.recoveryHolds.length, receiptsAdded: after.receipts.length - before.receipts.length, deliveriesAdded: driver.seen.length }));
}
