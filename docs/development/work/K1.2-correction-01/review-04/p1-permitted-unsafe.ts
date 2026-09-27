// Reviewer probe (second review of H 312f258): permitted actions vs actual control outcomes
// when the Driver cannot establish safe replacement.
import { ExecutionCoordinator } from "../packages/kernel/src/index.ts";
import { caller, createRequest, accepted, refused } from "../packages/kernel/tests/harness.ts";
for (const variant of ["absent isSafeToReplace", "isSafeToReplace returns false"]) {
  const grants: unknown[] = [];
  const driver: any = { driverId: "probe", deliver(_a: unknown, s: any, g: unknown) { grants.push(g); s.delivered(); return undefined; } };
  if (variant.includes("false")) driver.isSafeToReplace = () => false;
  const who = caller("app", "tenant");
  const k = new ExecutionCoordinator({ driver });
  const { executionId } = accepted(k.createExecution(who, createRequest({ creationKey: "p", scope: "tenant" })));
  const open = accepted(k.dispatch(who, executionId, { bound: 1 }));
  accepted(k.reportProtocolFailure(who, executionId, { activationId: open.activationId, writerEpoch: 1, diagnostic: "garbled" }));
  const hold = accepted(k.inspect(who, executionId)).recoveryHolds;
  const permitted = hold.map(h => h.permittedNextActions);
  const takeover = refused(k.requestTakeover(who, executionId, { activationId: open.activationId, writerEpoch: 1 }));
  const redeliver = refused(k.redeliver(who, executionId));
  console.log(JSON.stringify({ variant, holds: hold.map(h => h.cause), permitted, takeover: takeover.classification, redeliver: redeliver.classification }));
}
