/**
 * Reviewer probe: exact equality between two DIFFERENT identities that both render as
 * `<identity omitted>`. TREE=<package root parent> node --experimental-strip-types probe-equality.ts
 */
const tree = process.env.TREE!;
const { ExecutionCoordinator } = await import(`${tree}/packages/kernel/src/index.ts`);
const h = await import(`${tree}/packages/kernel/tests/harness.ts`);

function setup() {
  const who = h.caller("namespace-".repeat(20)); // minted IDs > 128 units, printable
  const driver = h.recordingDriver();
  driver.isSafeToReplace = () => true;
  const kernel = new ExecutionCoordinator({ driver, emissionsPerOutcome: 2 });
  const { executionId } = h.accepted(kernel.createExecution(who, h.createRequest()));
  const open = h.accepted(kernel.dispatch(who, executionId, { bound: 1 }));
  return { who, driver, kernel, executionId, open };
}
const show = (label: string, r: { ok: boolean; value?: unknown; error?: { classification: string } }) =>
  console.log(`${label}: ${r.ok ? "ACCEPTED" : `refused ${r.error!.classification}`}`);

{
  const s = setup();
  const wrong = `${s.open.activationId}-not-this-exchange`;
  console.log(`current ID length ${s.open.activationId.length}; wrong ID length ${wrong.length}`);
  show("E1 grant holder, Outcome naming a different long Activation", s.kernel.submitOutcome(s.who, h.outcomeFor(s.executionId, { ...s.open, activationId: wrong }), h.submissionFor(s.driver, s.open.activationId)));
  const view = h.accepted(s.kernel.inspect(s.who, s.executionId));
  console.log(`   afterwards: progressRevision ${view.progressRevision}, exchange open ${view.activation !== null}`);
}
{
  const s = setup();
  const wrong = `${s.open.activationId}-not-this-exchange`;
  show("E2 control takeover naming a different long Activation", s.kernel.requestTakeover(s.who, s.executionId, { activationId: wrong, writerEpoch: 1 }));
  const view = h.accepted(s.kernel.inspect(s.who, s.executionId));
  console.log(`   afterwards: current epoch ${view.activation?.writerEpoch}`);
}
{
  const s = setup();
  show("E3 two distinct 129-unit Emission keys", s.kernel.submitOutcome(s.who, h.outcomeFor(s.executionId, s.open, { emissions: [{ emissionKey: "a".repeat(129), value: 1 }, { emissionKey: "b".repeat(129), value: 2 }] }), h.submissionFor(s.driver, s.open.activationId)));
}
