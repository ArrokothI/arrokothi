// Probe for K1.4 attack 01 GROW-01: cost per exchange as one chat Execution's history grows.
// Run from the repository root: node docs/development/work/K1.4/attack-01/growth-probe.mjs [turns]
const kernel = await import(new URL("../../../../../packages/kernel/src/index.ts", import.meta.url).href);
const turns = Number(process.argv[2] ?? 2000);
const bytes = (v) => new TextEncoder().encode(JSON.stringify(v));
const host = { namespace: "arrokothi.sdk", scopes: ["application"], cancelScopes: ["application"] };
let last;
const driver = { driverId: "growth", deliver(a, s, g) { last = { a, g }; s.delivered(); return undefined; } };
const k = new kernel.ExecutionCoordinator({ driver, clock: { now: () => 0 } });
const id = k.createExecution(host, { creationKey: "chat", scope: "application", definitionRevision: "d", runtimeContractRevision: "r",
  progressCodec: "p", authorityContext: bytes({}), initialInput: { kind: "arrokothi.legacy.start", payload: bytes({ input: null }) } }).value.executionId;
const env = (next) => ({ executionId: id, activationId: last.a.activationId, writerEpoch: last.a.writerEpoch,
  baseProgressRevision: last.a.baseProgressRevision, progress: bytes({ emissionCursor: 0, root: id, v: 1 }),
  emissions: [{ emissionKey: `e-${last.a.activationId}`, value: bytes({ text: "reply" }) }], next });
const await_ = { step: "await", wait: { subscriptions: [{ subscriptionClass: "arrokothi.legacy.input" }] } };
const report = [];
let t0 = performance.now();
for (let turn = 0; turn < turns; turn += 1) {
  k.dispatch(host, id, { bound: 64 });
  if (!k.submitOutcome(host, env({ step: "continue" }), last.g).ok) throw new Error("continue refused");
  k.dispatch(host, id, { bound: 64 });
  if (!k.submitOutcome(host, env(await_), last.g).ok) throw new Error("await refused");
  k.inspect(host, id); // the host loop re-reads state each iteration
  if (!k.submitInput(host, { destination: id, requestKey: `t${turn}`, kind: "arrokothi.legacy.input", payload: bytes({ label: "u", payload: turn }), subscriptionClass: "arrokothi.legacy.input" }).ok) throw new Error("input refused");
  if ((turn + 1) % (turns / 4) === 0) {
    const t1 = performance.now();
    report.push(`turns ${turn + 1 - turns / 4}-${turn + 1}: ${((t1 - t0) / (turns / 4)).toFixed(3)} ms/turn`);
    t0 = t1;
  }
}
console.log(report.join("\n"));
