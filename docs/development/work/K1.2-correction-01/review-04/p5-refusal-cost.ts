// Reviewer probe: V-D1 (values.md) — refusal cost vs at-limit acceptance, one root, and the K1.2
// Outcome path for a visible caller without a grant (eager capture before authority).
import { canonicalize } from "../packages/kernel/src/values.ts";
import { ExecutionCoordinator } from "../packages/kernel/src/index.ts";
import { caller, observer, createRequest, accepted, refused, recordingDriver, outcomeFor } from "../packages/kernel/tests/harness.ts";
const gc = (globalThis as any).gc as () => void;
const mode = process.argv[2];
const inner = mode === "accept" ? Array.from({ length: 4_000 }, () => 7) : new Array(4_096).fill(undefined);
const root = Array.from({ length: 130 }, () => inner);
gc(); const h0 = process.memoryUsage().heapUsed; const t0 = performance.now();
let peak = h0; const tick = setInterval(() => {}, 1000);
if (process.argv[3] === "outcome") {
  const who = caller("app", "tenant"); const k = new ExecutionCoordinator({ driver: recordingDriver() });
  const { executionId } = accepted(k.createExecution(who, createRequest({ creationKey: "c", scope: "tenant" })));
  const open = accepted(k.dispatch(who, executionId, { bound: 1 }));
  const roots = Number(process.argv[4] ?? 1);
  const emissions = Array.from({ length: roots - 1 }, (_, i) => ({ emissionKey: `e${i}`, value: root }));
  const t1 = performance.now();
  const r = refused(k.submitOutcome(observer("x", "tenant"), outcomeFor(executionId, open, { progress: root, emissions }), undefined as never));
  peak = Math.max(peak, process.memoryUsage().heapUsed);
  console.log(JSON.stringify({ mode, path: "submitOutcome (no grant)", roots, classification: r.classification, ms: Math.round(performance.now() - t1), heapDeltaMiB: +((peak - h0) / 2 ** 20).toFixed(1), rssMiB: +(process.memoryUsage().rss / 2 ** 20).toFixed(0) }));
} else {
  const r = canonicalize(root);
  peak = Math.max(peak, process.memoryUsage().heapUsed);
  console.log(JSON.stringify({ mode, ok: r.ok, bytes: r.ok ? r.value.canonical.length : undefined, issues: r.ok ? 0 : r.issues.length, ms: Math.round(performance.now() - t0), heapDeltaMiB: +((peak - h0) / 2 ** 20).toFixed(1), rssMiB: +(process.memoryUsage().rss / 2 ** 20).toFixed(0) }));
}
clearInterval(tick);
