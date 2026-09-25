import assert from "node:assert/strict";
import { ExecutionCoordinator } from "/Users/rex-shih/Documents/ArrokothI/arrokothi/packages/kernel/src/index.ts";
import type { Activation, DeliverySettlement, SubmissionGrant } from "/Users/rex-shih/Documents/ArrokothI/arrokothi/packages/kernel/src/index.ts";
const author = { namespace: "app-a", scopes: ["tenant-a"], controlScopes: ["tenant-a"] };
const grants: SubmissionGrant[] = [];
const d = { driverId: "p", deliver(a: Activation, s: DeliverySettlement, g: SubmissionGrant): undefined { grants.push(g); s.delivered(); return undefined; }, isSafeToReplace: () => true };
const req = (k: string) => ({ creationKey: k, scope: "tenant-a", definitionRevision: "d", runtimeContractRevision: "r", progressCodec: "c", authorityContext: 1, initialInput: { kind: "k", payload: 1 } });
const out: Record<string, unknown> = {};
{ // getter reenters with takeover during capture; envelope names epoch 1 with grant 1
  const k = new ExecutionCoordinator({ driver: d });
  const c = k.createExecution(author, req("r1")); assert.ok(c.ok); const id = c.value.executionId;
  const x = k.dispatch(author, id, { bound: 1 }); assert.ok(x.ok); const g1 = grants.at(-1)!;
  const env = { executionId: id, activationId: x.value.activationId, writerEpoch: 1, baseProgressRevision: 0, get progress() { const t = k.requestTakeover(author, id, { activationId: x.value.activationId, writerEpoch: 1 }); out["inner takeover ok"] = t.ok; return 1; }, next: { step: "continue" } };
  const r = k.submitOutcome(author, env as any, g1);
  out["outer after reentrant takeover"] = r.ok ? "ACCEPTED" : r.error.classification;
  const v = k.inspect(author, id); assert.ok(v.ok); out["state/epoch/rev"] = [v.value.state, v.value.activation?.writerEpoch, v.value.progressRevision];
}
{ // getter reenters with a valid different Outcome that resolves the exchange
  const k = new ExecutionCoordinator({ driver: d });
  const c = k.createExecution(author, req("r2")); assert.ok(c.ok); const id = c.value.executionId;
  const x = k.dispatch(author, id, { bound: 1 }); assert.ok(x.ok); const g1 = grants.at(-1)!;
  const inner = { executionId: id, activationId: x.value.activationId, writerEpoch: 1, baseProgressRevision: 0, progress: "inner", next: { step: "complete", result: "inner" } };
  const env = { executionId: id, activationId: x.value.activationId, writerEpoch: 1, baseProgressRevision: 0, get progress() { const t = k.submitOutcome(author, inner as any, g1); out["inner outcome ok"] = t.ok; return "outer"; }, next: { step: "continue" } };
  const r = k.submitOutcome(author, env as any, g1);
  out["outer after reentrant resolution"] = r.ok ? "ACCEPTED" : r.error.classification;
  const v = k.inspect(author, id); assert.ok(v.ok); out["final"] = [v.value.state, v.value.acceptedProgress, v.value.progressRevision, v.value.receipts.length];
}
console.log(JSON.stringify(out, null, 1));
