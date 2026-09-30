// Reviewer probe R-P2: the prototype-chain refusal through submitOutcome with no grant (pre-authority).
// Usage: node --expose-gc --experimental-strip-types p-chain-outcome.ts <treeRoot> <D> <roots>
const [,, root, Ds, Rs] = process.argv;
const { ExecutionCoordinator } = await import(`${root}/packages/kernel/src/index.ts`);
const h = await import(`${root}/packages/kernel/tests/harness.ts`);
const D = Number(Ds), R = Number(Rs);
const who = h.caller("probe"), driver = h.recordingDriver(), kernel = new ExecutionCoordinator({ driver });
const { executionId } = h.accepted(kernel.createExecution(who, h.createRequest()));
const open = h.accepted(kernel.dispatch(who, executionId, { bound: 1 }));
let tail: object = { constructor: { name: "X" } };
for (let i = 0; i < D; i++) tail = Object.create(tail);
const objs = Array.from({ length: 4096 }, () => Object.create(Object.create(tail)));
const rootValue = Array(256).fill(objs);
const extra = Array.from({ length: Math.max(0, R - 2) }, (_, i) => ({ emissionKey: `e${i}`, value: rootValue }));
const proposal = h.outcomeFor(executionId, open, { progress: rootValue, emissions: extra, next: R >= 2 ? { step: "complete", result: rootValue } : { step: "continue" } });
const before = JSON.stringify(h.accepted(kernel.inspect(who, executionId)));
(globalThis as any).gc(); const t0 = performance.now();
const r = kernel.submitOutcome(h.observer("visible"), proposal, undefined as never);
const ms = Math.round(performance.now() - t0);
const after = h.accepted(kernel.inspect(who, executionId));
console.log(JSON.stringify({ D, roots: R, ok: r.ok, classification: r.ok ? null : r.error.classification, reasonLen: r.ok ? 0 : r.error.reason.length, ms, rssMiB: Math.round(process.memoryUsage().rss / 2**20), onlyRefusalAppended: after.refusals?.length !== undefined ? undefined : null, sameExchange: JSON.stringify(after.activation) === JSON.stringify(JSON.parse(before).activation) }));
