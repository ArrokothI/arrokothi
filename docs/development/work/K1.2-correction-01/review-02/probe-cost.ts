/**
 * Reviewer probe: per-root cost of refusing vs accepting, for a visibility-only caller (eager capture
 * before authority) and for the entitled attempt. One mode per process so peak RSS is attributable.
 * TREE=<worktree> MODE=<accept|refuse-undefined|refuse-ctor> node --experimental-strip-types --expose-gc probe-cost.ts
 */
const tree = process.env.TREE!;
const mode = process.env.MODE!;
const { ExecutionCoordinator } = await import(`${tree}/packages/kernel/src/index.ts`);
const h = await import(`${tree}/packages/kernel/tests/harness.ts`);

const who = h.caller("cost-host");
const visible = h.observer("cost-observer");
const driver = h.recordingDriver();
const kernel = new ExecutionCoordinator({ driver });
const { executionId } = h.accepted(kernel.createExecution(who, h.createRequest()));
const open = h.accepted(kernel.dispatch(who, executionId, { bound: 1 }));

let progress: unknown;
if (mode === "accept") {
  // About 1 MiB canonical: 127 references to one array of 4,096 single-digit numbers (8,193 bytes each).
  const inner = new Array(4_096).fill(7);
  progress = new Array(127).fill(inner);
} else if (mode === "refuse-undefined") {
  const inner = new Array(4_096).fill(undefined);
  progress = new Array(130).fill(inner);
} else {
  const bad = Object.create({ constructor: { name: "N".repeat(980) } });
  const inner = new Array(4_096).fill(bad);
  progress = new Array(130).fill(inner);
}
(globalThis as { gc?: () => void }).gc?.();
const base = process.memoryUsage();
const started = process.hrtime.bigint();
const entitled = mode === "accept";
const result = entitled
  ? kernel.submitOutcome(who, h.outcomeFor(executionId, open, { progress }), h.submissionFor(driver, open.activationId))
  : kernel.submitOutcome(visible, h.outcomeFor(executionId, open, { progress }), undefined);
const ms = Number(process.hrtime.bigint() - started) / 1e6;
const after = process.memoryUsage();
console.log(`${mode}: ${result.ok ? "accepted" : `refused ${result.error.classification}`} in ${ms.toFixed(0)} ms; heapUsed +${((after.heapUsed - base.heapUsed) / 2 ** 20).toFixed(0)} MiB, rss ${(after.rss / 2 ** 20).toFixed(0)} MiB`);
