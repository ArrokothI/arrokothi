// Reviewer probe (not payload): caller-supplied Activation ID near the engine's maximum string length.
const tree = process.env.TREE!;
const k = await import(`${tree}/packages/kernel/src/index.ts`);
const h = await import(`${tree}/packages/kernel/tests/harness.ts`);
const { ExecutionCoordinator } = k;
const { accepted, caller, observer, createRequest, outcomeFor, recordingDriver } = h;

const who = caller("app-a", "tenant-a");
const driver = recordingDriver();
const kernel = new ExecutionCoordinator({ driver });
const executionId = accepted(kernel.createExecution(who, createRequest({ creationKey: "k" }))).executionId as string;
const open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
const viewer = observer("app-b", "tenant-a"); // visibility only: no grant, no control power

// V8's maximum string length on 64-bit is 2**29 - 24 UTF-16 code units.
const MAX = 2 ** 29 - 24;
const huge = "Z".repeat(MAX - 16);
const refusalsBefore = accepted(kernel.inspect(who, executionId)).refusals.length;
const attempt = (label: string, run: () => any) => {
  try {
    const res = run();
    console.log(`${label}: returned ${res.ok ? "ok" : res.error.classification} (reason length ${res.ok ? "-" : res.error.reason.length})`);
  } catch (error) {
    console.log(`${label}: THREW ${(error as Error).name}: ${(error as Error).message}`);
  }
};
attempt("submitOutcome, visibility-only caller, wrong huge activationId", () =>
  kernel.submitOutcome(viewer, outcomeFor(executionId, { ...open, activationId: huge }), undefined as any));
attempt("requestTakeover, control caller, wrong huge activationId", () =>
  kernel.requestTakeover(who, executionId, { activationId: huge, writerEpoch: 1 }));
attempt("recoverExecution, control caller, wrong huge activationId", () =>
  kernel.recoverExecution(who, executionId, { activationId: huge, available: { definitionRevisions: [], runtimeContractRevisions: [], progressCodecs: [] } }));
attempt("reportProtocolFailure, control caller, wrong huge activationId", () =>
  kernel.reportProtocolFailure(who, executionId, { activationId: huge, writerEpoch: 1 }));
attempt("submitOutcome, visibility-only caller, huge activationId after resolution (no exchange)", () => {
  const g = h.submissionFor(driver, open.activationId);
  accepted(kernel.submitOutcome(who, outcomeFor(executionId, open), g));
  return kernel.submitOutcome(viewer, outcomeFor(executionId, { ...open, activationId: huge }), undefined as any);
});
const after = accepted(kernel.inspect(who, executionId));
console.log(`refusals recorded: ${after.refusals.length - refusalsBefore}; state ${after.state}; exchange open ${after.activation !== null}; progressRevision ${after.progressRevision}`);
