// Reviewer probe: deep foreign-prototype refusal (no Proxy) through submitOutcome by a visible
// caller with no submission grant, i.e. before authority. Observation only.
// Usage: node --expose-gc --experimental-strip-types deep-outcome.ts <tree> <roots 1|8>
import { pathToFileURL } from "node:url";
const [, , tree, Rs] = process.argv;
const R = Number(Rs);
const { ExecutionCoordinator } = await import(pathToFileURL(`${tree}/packages/kernel/src/index.ts`).href);
const h = await import(pathToFileURL(`${tree}/packages/kernel/tests/harness.ts`).href);
const who = h.caller("probe"), driver = h.recordingDriver(), kernel = new ExecutionCoordinator({ driver });
const { executionId } = h.accepted(kernel.createExecution(who, h.createRequest()));
const open = h.accepted(kernel.dispatch(who, executionId, { bound: 1 }));
const p = Object.create(null);
let rootValue: unknown = Array(256).fill(Array.from({ length: 4096 }, () => Object.create(p)));
for (let i = 0; i < 29; i++) rootValue = [rootValue];
const extra = Array.from({ length: Math.max(0, R - 2) }, (_, i) => ({ emissionKey: `e${i}`, value: rootValue }));
const proposal = h.outcomeFor(executionId, open, { progress: rootValue, emissions: extra, next: R >= 2 ? { step: "complete", result: rootValue } : { step: "continue" } });
const before = h.accepted(kernel.inspect(who, executionId));
(globalThis as { gc: () => void }).gc();
const t0 = performance.now();
const r = kernel.submitOutcome(h.observer("visible"), proposal, undefined as never);
const ms = Math.round(performance.now() - t0);
const after = h.accepted(kernel.inspect(who, executionId));
console.log(JSON.stringify({ roots: R, ok: r.ok, classification: r.ok ? null : r.error.classification, ms,
  sameExchange: JSON.stringify(after.activation) === JSON.stringify(before.activation), deliveries: driver.seen.length }));
