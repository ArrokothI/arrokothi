// Probes for K1.4 attack 01. Bound to origin/claude/k1.4 at 6831b112 (Kernel src identical to 608f9ece).
// Run from the repository root: node docs/development/work/K1.4/attack-01/bridge-probes.mjs
import assert from "node:assert/strict";

const kernel = await import(process.argv[2] ?? new URL("../../../../../packages/kernel/src/index.ts", import.meta.url).href);
const { ExecutionCoordinator } = kernel;
const bytes = (v) => new TextEncoder().encode(JSON.stringify(v));

// The design's fixed host caller (§2): no controlScopes.
const host = { namespace: "arrokothi.sdk", scopes: ["application"], cancelScopes: ["application"] };

let now = 1_000;
const clock = { now: () => now };
const delivered = [];
const cancels = [];
const driver = {
  driverId: "legacy-probe",
  deliver(activation, settlement, grant) {
    delivered.push({ activation, grant });
    settlement.delivered();
    return undefined;
  },
  requestCancellation(request) {
    cancels.push(request);
    return undefined;
  },
};
const k = new ExecutionCoordinator({ driver, clock });

const create = (key) => {
  const r = k.createExecution(host, {
    creationKey: key, scope: "application", definitionRevision: "def", runtimeContractRevision: "arrokothi.legacy-harness/0.8.1",
    progressCodec: "arrokothi.legacy-bridge.progress/1", authorityContext: bytes({}),
    initialInput: { kind: "arrokothi.legacy.start", payload: bytes({ input: null }) },
  });
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.value.executionId;
};
const dispatch = (id) => {
  const r = k.dispatch(host, id, { bound: 64 });
  assert.equal(r.ok, true, JSON.stringify(r));
  return delivered[delivered.length - 1];
};
const envelope = (a, next, revision = a.baseProgressRevision) => ({
  executionId: a.executionId, activationId: a.activationId, writerEpoch: a.writerEpoch, baseProgressRevision: revision,
  progress: bytes({ emissionCursor: 0, root: a.executionId, v: 1 }), next,
});

// P-1 (attack PF-01): the design's protocol-failure fallback with the fixed host caller.
{
  const id = create("pf-01");
  const { activation } = dispatch(id);
  const r = k.reportProtocolFailure(host, id, { activationId: activation.activationId, writerEpoch: activation.writerEpoch, diagnostic: "fallback refused" });
  console.log("PF-01 reportProtocolFailure with the design's host caller:", r.ok ? "accepted" : r.error.classification ?? r.error);
  assert.equal(r.ok, false);
  const view = k.inspect(host, id);
  console.log("PF-01 state afterwards:", view.value.state, "holds:", JSON.stringify(view.value.exchange?.recoveryHolds ?? view.value.recoveryHolds ?? null));
}

// P-2 (attack DL-01): a class-equal but natively useless input re-arms the per-wait deadline.
{
  const id = create("dl-01");
  let { activation, grant } = dispatch(id);
  const wait = (deadline) => ({ step: "await", wait: { subscriptions: [{ subscriptionClass: "arrokothi.legacy.input" }], deadline } });
  let r = k.submitOutcome(host, envelope(activation, wait(now + 100)), grant);
  assert.equal(r.ok, true, JSON.stringify(r));
  const first = k.pendingTimers().filter((t) => t.executionId === id);
  console.log("DL-01 first wait deadline:", first.map((t) => t.deadline));
  for (let i = 0; i < 3; i += 1) {
    now += 90; // always before the deadline the human was promised
    const input = k.submitInput(host, { destination: id, requestKey: `stray-${i}`, kind: "arrokothi.legacy.input",
      payload: bytes({ destination: "exe_not_in_lineage", label: "x", payload: null }), subscriptionClass: "arrokothi.legacy.input" });
    assert.equal(input.ok, true, JSON.stringify(input));
    ({ activation, grant } = dispatch(id));
    // The Driver forwards, native rejects (destination outside lineage), the native root is still waiting: re-await.
    r = k.submitOutcome(host, envelope(activation, wait(now + 100)), grant);
    assert.equal(r.ok, true, JSON.stringify(r));
  }
  const last = k.pendingTimers().filter((t) => t.executionId === id);
  console.log("DL-01 deadline after three stray wakes:", last.map((t) => t.deadline), "clock:", now, "(first promised", first[0].deadline + ")");
  assert.ok(now > first[0].deadline && last[0].deadline > now);
}

// P-3 (attack DL-02): with no host pump at ingress, a reply after the deadline wins.
{
  const id = create("dl-02");
  const { activation, grant } = dispatch(id);
  const r = k.submitOutcome(host, envelope(activation, { step: "await", wait: { subscriptions: [{ subscriptionClass: "arrokothi.legacy.input" }], deadline: now + 10 } }), grant);
  assert.equal(r.ok, true);
  now += 10_000; // the human replies long after humanWaitDeadlineMs; no runUntilBlocked ran meanwhile
  const input = k.submitInput(host, { destination: id, requestKey: "late-reply", kind: "arrokothi.legacy.input",
    payload: bytes({ label: "reply", payload: "ok" }), subscriptionClass: "arrokothi.legacy.input" });
  assert.equal(input.ok, true);
  const view = k.inspect(host, id);
  console.log("DL-02 state after a late reply with no pump:", view.value.state, "pending timers:", k.pendingTimers().filter((t) => t.executionId === id).length);
  const { activation: next } = dispatch(id);
  console.log("DL-02 next batch kinds:", next.events.map((e) => e.kind));
}

// P-4 (attack CX-01): requestCancellation reaches the Driver before its queued task has created the native root.
{
  const id = create("cx-01");
  const order = [];
  const realDeliver = driver.deliver;
  driver.deliver = function (activation, settlement, grant) {
    realDeliver.call(this, activation, settlement, grant);
    queueMicrotask(() => order.push("driver task starts: native root does not exist until here"));
    return undefined;
  };
  dispatch(id);
  const c = k.cancelExecution(host, id);
  order.push(`requestCancellation seen (${cancels.length} so far), attempt ${JSON.stringify(cancels[cancels.length - 1]?.attempt)}`);
  await Promise.resolve();
  driver.deliver = realDeliver;
  console.log("CX-01 cancel:", c.ok ? "accepted" : c.error, "; order:", order);
}

// P-5 (attack VAL-01): a native value the legacy Harness accepts but the Kernel refuses.
{
  const id = create("val-01");
  const { activation, grant } = dispatch(id);
  const long = "x".repeat(70_000);
  const r = k.submitOutcome(host, envelope(activation, { step: "complete", result: bytes({ schemaId: "s", schemaVersion: 1, value: long }) }), grant);
  console.log("VAL-01 complete with a 70,000-character native result:", r.ok ? "accepted" : r.error.classification ?? r.error);
}
console.log("probes done");
