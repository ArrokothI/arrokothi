// Reviewer probe R-P5: the prototype-chain refusal through K1.1 ingress (submitInput) and creation.
// Usage: node --expose-gc --experimental-strip-types p-chain-ingress.ts <treeRoot> <D>
const [,, root, Ds] = process.argv;
const { ExecutionCoordinator } = await import(`${root}/packages/kernel/src/index.ts`);
const h = await import(`${root}/packages/kernel/tests/harness.ts`);
const D = Number(Ds);
const who = h.caller("probe"), kernel = new ExecutionCoordinator({ driver: h.recordingDriver() });
const { executionId } = h.accepted(kernel.createExecution(who, h.createRequest()));
let tail: object = { constructor: { name: "X" } };
for (let i = 0; i < D; i++) tail = Object.create(tail);
const payload = Array(256).fill(Array.from({ length: 4096 }, () => Object.create(Object.create(tail))));
for (const [name, call] of [
  ["ingress", () => kernel.submitInput(who, { destination: executionId, requestKey: "chain", kind: "application.note", payload })],
  ["creation", () => kernel.createExecution(who, h.createRequest({ creationKey: "chain", initialInput: { kind: "application.message", payload } }))],
] as const) {
  (globalThis as any).gc(); const t0 = performance.now();
  const r = call();
  console.log(JSON.stringify({ surface: name, D, ok: r.ok, classification: r.ok ? null : r.error.classification, reasonLen: r.ok ? 0 : r.error.reason.length, ms: Math.round(performance.now() - t0) }));
}
