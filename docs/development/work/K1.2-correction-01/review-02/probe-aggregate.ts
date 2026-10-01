/**
 * Reviewer probe (round 2): aggregate content-issue rendering on the four boundaries.
 * TREE=<worktree> node --experimental-strip-types --max-old-space-size=8192 probe-aggregate.ts [innerArrays] [nameLength]
 * A1: entitled attempt (current grant) submits an Outcome whose progress is an outer array of
 *     `innerArrays` references to one inner array of 4,096 references to one non-plain object whose
 *     inherited constructor name is `nameLength` printable ASCII units. Each element is one refused
 *     value, charged ~1 canonical byte; each issue renders ~name + 60 units.
 * A2: the same root as three recovery availability lists from a control caller.
 */
const tree = process.env.TREE!;
const { ExecutionCoordinator } = await import(`${tree}/packages/kernel/src/index.ts`);
const h = await import(`${tree}/packages/kernel/tests/harness.ts`);

const innerArrays = Number(process.argv[2] ?? 124);
const nameLength = Number(process.argv[3] ?? 980);
const bad = Object.create({ constructor: { name: "N".repeat(nameLength) } });
const inner = new Array(4_096).fill(bad);
const outer = new Array(innerArrays).fill(inner);

function setup() {
  const who = h.caller("aggregate-host");
  const driver = h.recordingDriver();
  const kernel = new ExecutionCoordinator({ driver });
  const { executionId } = h.accepted(kernel.createExecution(who, h.createRequest()));
  const open = h.accepted(kernel.dispatch(who, executionId, { bound: 1 }));
  return { who, driver, kernel, executionId, open };
}

function attempt(label: string, run: () => { ok: boolean; error?: { classification: string; reason: string } }, view: () => { refusals: unknown[] }) {
  const before = view().refusals.length;
  const started = Date.now();
  try {
    const result = run();
    const after = view().refusals.length;
    if (result.ok) console.log(`${label}: ACCEPTED (unexpected)`);
    else console.log(`${label}: refused ${result.error!.classification}, reason ${result.error!.reason.length} units, refusals +${after - before}, ${Date.now() - started} ms`);
  } catch (error) {
    const after = view().refusals.length;
    console.log(`${label}: THREW ${(error as Error)?.name}: ${(error as Error)?.message}; refusals +${after - before}, ${Date.now() - started} ms`);
  }
}

console.log(`tree=${tree} innerArrays=${innerArrays} nameLength=${nameLength} issues≈${innerArrays * 4096}`);
if (process.env.PRE === "1") {
  const s = setup();
  const visible = h.observer("aggregate-observer");
  const view = () => h.accepted(s.kernel.inspect(s.who, s.executionId));
  attempt("A3 visibility-only submitOutcome (no grant)", () => s.kernel.submitOutcome(visible, h.outcomeFor(s.executionId, s.open, { progress: outer }), undefined), view);
  attempt("A4 grant holder, stale epoch", () => s.kernel.submitOutcome(s.who, h.outcomeFor(s.executionId, s.open, { progress: outer, writerEpoch: 2 }), h.submissionFor(s.driver, s.open.activationId)), view);
  process.exit(0);
}
{
  const s = setup();
  const view = () => h.accepted(s.kernel.inspect(s.who, s.executionId));
  attempt("A1 entitled submitOutcome", () => s.kernel.submitOutcome(s.who, h.outcomeFor(s.executionId, s.open, { progress: outer }), h.submissionFor(s.driver, s.open.activationId)), view);
  // Exchange still answerable afterwards?
  const later = s.kernel.submitOutcome(s.who, h.outcomeFor(s.executionId, s.open), h.submissionFor(s.driver, s.open.activationId));
  console.log(`A1 later valid answer: ${later.ok ? "accepted" : later.error.classification}`);
}
{
  const s = setup();
  const view = () => h.accepted(s.kernel.inspect(s.who, s.executionId));
  attempt("A2 control recoverExecution", () => s.kernel.recoverExecution(s.who, s.executionId, { activationId: s.open.activationId, available: { definitionRevisions: outer, runtimeContractRevisions: outer, progressCodecs: outer } }), view);
}
