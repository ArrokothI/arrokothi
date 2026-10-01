// Reviewer probes (K1.2 review 09). Independent of the packet's tests; imports the exact-H source.
import assert from "node:assert/strict";
import { ExecutionCoordinator } from "/Users/rex-shih/Documents/ArrokothI/arrokothi/packages/kernel/src/index.ts";
import type { Activation, DeliverySettlement, SubmissionGrant } from "/Users/rex-shih/Documents/ArrokothI/arrokothi/packages/kernel/src/index.ts";

const author = { namespace: "app-a", scopes: ["tenant-a"], controlScopes: ["tenant-a"] };
const dashboard = { namespace: "app-a", scopes: ["tenant-a"] }; // visible, no control, never handed a grant

function driver() {
  const grants: SubmissionGrant[] = [];
  const seen: Activation[] = [];
  const settlements: DeliverySettlement[] = [];
  return {
    grants, seen, settlements,
    driverId: "probe",
    deliver(a: Activation, s: DeliverySettlement, g: SubmissionGrant): undefined { seen.push(a); settlements.push(s); grants.push(g); s.delivered(); return undefined; },
    isSafeToReplace(): boolean { return true; },
  };
}
const req = (creationKey: string) => ({
  creationKey, scope: "tenant-a", definitionRevision: "d@1", runtimeContractRevision: "r@1", progressCodec: "c@1",
  authorityContext: { t: "a" }, initialInput: { kind: "k", payload: 1 },
});
function open(key: string) {
  const d = driver();
  const k = new ExecutionCoordinator({ driver: d });
  const c = k.createExecution(author, req(key)); assert.ok(c.ok);
  const x = k.dispatch(author, c.value.executionId, { bound: 1 }); assert.ok(x.ok);
  return { k, d, id: c.value.executionId, ex: x.value };
}
const report: Record<string, unknown> = {};
const out = (label: string, r: any) => { report[label] = r.ok ? { ok: true, ...r.value } : { classification: r.error.classification, reason: r.error.reason }; };

// P1: current exchange, grant-less, content malformed in several ways -> spec step 3: authority before content.
{
  const { k, id, ex } = open("p1");
  const base = { executionId: id, activationId: ex.activationId, writerEpoch: 1, baseProgressRevision: 0 };
  out("P1a dup emission keys, no grant", k.submitOutcome(dashboard, { ...base, progress: 1, emissions: [{ emissionKey: "x", value: 1 }, { emissionKey: "x", value: 2 }], next: { step: "continue" } } as any, undefined as any));
  out("P1b effects, no grant", k.submitOutcome(dashboard, { ...base, progress: 1, effects: [{}], next: { step: "continue" } } as any, undefined as any));
  out("P1c await, no grant", k.submitOutcome(dashboard, { ...base, progress: 1, next: { step: "await", wait: {} } } as any, undefined as any));
  out("P1d unknown field, no grant", k.submitOutcome(dashboard, { ...base, progress: 1, extra: 1, next: { step: "continue" } } as any, undefined as any));
}

// P2: current Activation ID, epoch missing (claim malformed), grant-less, progress malformed.
{
  const { k, id, ex } = open("p2");
  const deep: any = {}; let cur = deep; for (let i = 0; i < 40; i += 1) { cur.n = {}; cur = cur.n; }
  const r = k.submitOutcome(dashboard, { executionId: id, activationId: ex.activationId, baseProgressRevision: 0, progress: deep, emissions: [{ emissionKey: "x", value: 1 }, { emissionKey: "x", value: 2 }], next: { step: "fail", error: "\ud800" } } as any, undefined as any);
  out("P2 epoch missing + no grant + bad content", r);
  const v = k.inspect(author, id); assert.ok(v.ok);
  report["P2 retained refusal visible to any inspector"] = v.value.refusals.at(-1)?.reason;
  // Same envelope with epoch present: what does the grant-less caller get?
  out("P2b epoch present + no grant + same bad content", k.submitOutcome(dashboard, { executionId: id, activationId: ex.activationId, writerEpoch: 1, baseProgressRevision: 0, progress: deep, emissions: [{ emissionKey: "x", value: 1 }, { emissionKey: "x", value: 2 }], next: { step: "fail", error: "\ud800" } } as any, undefined as any));
  // baseProgressRevision non-integer
  out("P2c base revision -1 + no grant + effects", k.submitOutcome(dashboard, { executionId: id, activationId: ex.activationId, writerEpoch: 1, baseProgressRevision: -1, progress: 1, effects: [1], next: { step: "continue" } } as any, undefined as any));
}

// P3: grant from another Execution on the same coordinator.
{
  const d = driver();
  const k = new ExecutionCoordinator({ driver: d });
  const a = k.createExecution(author, req("p3a")); const b = k.createExecution(author, req("p3b")); assert.ok(a.ok && b.ok);
  const xa = k.dispatch(author, a.value.executionId, { bound: 1 }); const xb = k.dispatch(author, b.value.executionId, { bound: 1 }); assert.ok(xa.ok && xb.ok);
  const grantA = d.grants[0]!;
  out("P3 grant of A used for B", k.submitOutcome(author, { executionId: b.value.executionId, activationId: xb.value.activationId, writerEpoch: 1, baseProgressRevision: 0, progress: 1, next: { step: "continue" } } as any, grantA));
}

// P4: previous exchange's grant used for the next exchange.
{
  const { k, d, id, ex } = open("p4");
  const g1 = d.grants[0]!;
  const a1 = k.submitOutcome(author, { executionId: id, activationId: ex.activationId, writerEpoch: 1, baseProgressRevision: 0, progress: 1, next: { step: "continue" } } as any, g1); assert.ok(a1.ok);
  const x2 = k.dispatch(author, id, { bound: 1 }); assert.ok(x2.ok);
  out("P4 old exchange grant for new exchange", k.submitOutcome(author, { executionId: id, activationId: x2.value.activationId, writerEpoch: 1, baseProgressRevision: 1, progress: 2, next: { step: "continue" } } as any, g1));
  report["P4 grants distinct"] = d.grants[0] !== d.grants[1];
}

// P5: replay/conflict with no grant; conflict with stale epoch; replay after terminal.
{
  const { k, d, id, ex } = open("p5");
  const env = { executionId: id, activationId: ex.activationId, writerEpoch: 1, baseProgressRevision: 0, progress: 1, next: { step: "complete", result: { r: 1 } } };
  const first = k.submitOutcome(author, env as any, d.grants[0]!); assert.ok(first.ok);
  const rep = k.submitOutcome(dashboard, env as any, undefined as any);
  report["P5 replay no grant after terminal"] = rep.ok ? { replayed: rep.value.replayed, sameReceipt: rep.value.receipt === first.value.receipt } : rep.error.classification;
  out("P5 conflict epoch 7 no grant", k.submitOutcome(dashboard, { ...env, writerEpoch: 7 } as any, undefined as any));
  out("P5 conflict invalid content no grant", k.submitOutcome(dashboard, { ...env, progress: undefined } as any, undefined as any));
}

// P6: terminal ingress and B-5.
{
  const { k, d, id, ex } = open("p6");
  const early = k.submitInput(author, { destination: id, requestKey: "early", kind: "k", payload: 2 }); assert.ok(early.ok);
  const f = k.submitOutcome(author, { executionId: id, activationId: ex.activationId, writerEpoch: 1, baseProgressRevision: 0, progress: 1, next: { step: "fail", error: { why: "x" } } } as any, d.grants[0]!);
  assert.ok(f.ok);
  report["P6 decision"] = { nextState: f.value.nextState, acknowledged: f.value.acknowledged, terminalDispositions: f.value.terminalDispositions };
  const v = k.inspect(author, id); assert.ok(v.ok);
  report["P6 view"] = { state: v.value.state, queued: v.value.queued, ack: v.value.acknowledged, term: v.value.terminalDispositions, result: v.value.result?.kind, disp: v.value.mailbox.map((m) => m.disposition) };
  const retry = k.submitInput(author, { destination: id, requestKey: "early", kind: "k", payload: 2 });
  report["P6 exact retry"] = retry.ok ? { replayed: retry.value.replayed, disposition: retry.value.disposition } : retry.error.classification;
  out("P6 changed retry", k.submitInput(author, { destination: id, requestKey: "early", kind: "k", payload: 3 }));
  out("P6 new input", k.submitInput(author, { destination: id, requestKey: "new", kind: "k", payload: 3 }));
  const v2 = k.inspect(author, id); assert.ok(v2.ok);
  report["P6 mailbox size after"] = v2.value.mailbox.length;
  out("P6 dispatch after terminal", k.dispatch(author, id, { bound: 1 }));
  out("P6 takeover after terminal", k.requestTakeover(author, id, { activationId: ex.activationId, writerEpoch: 1 }));
  out("P6 redeliver after terminal", k.redeliver(author, id));
}

// P7: takeover then late report from epoch-1 delivery; retired grant with current coordinates.
{
  const d = { ...driver(), deliver(a: Activation, s: DeliverySettlement, g: SubmissionGrant): undefined { (d as any).grants.push(g); (d as any).settlements.push(s); return undefined; } } as any;
  const k = new ExecutionCoordinator({ driver: d });
  const c = k.createExecution(author, req("p7")); assert.ok(c.ok);
  const id = c.value.executionId;
  const x = k.dispatch(author, id, { bound: 1 }); assert.ok(x.ok);
  const r1 = k.redeliver(author, id); assert.ok(r1.ok);
  const t = k.requestTakeover(author, id, { activationId: x.value.activationId, writerEpoch: 1 }); assert.ok(t.ok);
  const r2 = k.redeliver(author, id); assert.ok(r2.ok);
  d.settlements[0].failed("late epoch-1 report");
  d.settlements[3].delivered();
  const v = k.inspect(author, id); assert.ok(v.ok);
  report["P7 deliveries"] = v.value.activation?.deliveries;
  report["P7 grant identity [d1,d2,take,d4]"] = [d.grants[0] === d.grants[1], d.grants[1] === d.grants[2], d.grants[2] === d.grants[3]];
  out("P7 old grant + current coords", k.submitOutcome(author, { executionId: id, activationId: x.value.activationId, writerEpoch: 2, baseProgressRevision: 0, progress: 1, next: { step: "continue" } } as any, d.grants[0]));
  out("P7 saved takeover grant after redelivery", k.submitOutcome(author, { executionId: id, activationId: x.value.activationId, writerEpoch: 2, baseProgressRevision: 0, progress: 1, next: { step: "continue" } } as any, d.grants[2]));
  d.settlements[1].delivered();
  const v2 = k.inspect(author, id); assert.ok(v2.ok);
  report["P7 late report after resolution"] = { exch: v2.value.exchanges[0]?.deliveries, state: v2.value.state, rev: v2.value.progressRevision };
}

console.log(JSON.stringify(report, null, 2));
