// Reviewer probe (not payload): trusted namespace large enough that derived IDs exceed the engine limit.
const tree = process.env.TREE!;
const k = await import(`${tree}/packages/kernel/src/index.ts`);
const h = await import(`${tree}/packages/kernel/tests/harness.ts`);
const { ExecutionCoordinator } = k;
const { accepted, caller, createRequest, outcomeFor, recordingDriver, submissionFor } = h;
const MAX = 2 ** 29 - 24;
const namespace = "n".repeat(Math.floor(MAX / 2) + 1000); // Execution/Activation IDs fit; their packed pair does not
const who = caller(namespace, "tenant-a");
const driver = recordingDriver();
const kernel = new ExecutionCoordinator({ driver });
const step = (label: string, run: () => any) => {
  try { const r = run(); console.log(`${label}: ${r.ok ? "ok" : r.error.classification}`); return r; }
  catch (e) { console.log(`${label}: THREW ${(e as Error).name}: ${(e as Error).message}`); return null; }
};
const created = step("create", () => kernel.createExecution(who, createRequest({ creationKey: "k" })));
const executionId = created.value.executionId as string;
const open = step("dispatch", () => kernel.dispatch(who, executionId, { bound: 1 })).value;
console.log(`activationId length ${open.activationId.length}`);
const grant = submissionFor(driver, open.activationId);
step("Outcome complete (current attempt, valid)", () => kernel.submitOutcome(who, outcomeFor(executionId, open, { next: { step: "complete", result: 1 } }), grant));
step("Outcome continue + one Emission (current attempt, valid)", () => kernel.submitOutcome(who, outcomeFor(executionId, open, { emissions: [{ emissionKey: "e", value: 1 }] }), grant));
step("Outcome continue, no Emission", () => kernel.submitOutcome(who, outcomeFor(executionId, open), grant));
