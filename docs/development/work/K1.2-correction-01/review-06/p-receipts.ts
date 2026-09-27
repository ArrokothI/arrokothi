// Reviewer oracle R-P3: receipt tokens stay distinct across two Executions whose minted IDs DEC-4
// renders as omitted (creation, ingress, dispatch, redelivery answer, takeover, Outcome).
// Usage: node --experimental-strip-types p-receipts.ts <treeRoot>
const [,, root] = process.argv;
const { ExecutionCoordinator } = await import(`${root}/packages/kernel/src/index.ts`);
const h = await import(`${root}/packages/kernel/tests/harness.ts`);
const scope = "tenant-é", who = h.caller("actor-é", scope), driver = h.recordingDriver();
(driver as any).isSafeToReplace = () => true;
const kernel = new ExecutionCoordinator({ driver });
function run(key: string) {
  const created = h.accepted(kernel.createExecution(who, h.createRequest({ scope, creationKey: key })));
  const input = h.accepted(kernel.submitInput(who, { destination: created.executionId, requestKey: "r", kind: "application.note", payload: 1 }));
  const queued = h.accepted(kernel.submitInput(who, { destination: created.executionId, requestKey: "q", kind: "application.note", payload: 2 }));
  const view0 = h.accepted(kernel.inspect(who, created.executionId));
  checks.push([`${key[0]}: view names the exact Execution`, view0.executionId === created.executionId]);
  checks.push([`${key[0]}: view queued lists exact Event IDs`, view0.queued.includes(queued.eventId) && view0.queued.includes(input.eventId)]);
  checks.push([`${key[0]}: mailbox view keeps the exact Input ID destination`, view0.mailbox.every((m: any) => m.inputId.destination === created.executionId)]);
  const open = h.accepted(kernel.dispatch(who, created.executionId, { bound: 1 }));
  const again = h.accepted(kernel.redeliver(who, created.executionId));
  const delivered = driver.seen[driver.seen.length - 1];
  checks.push([`${key[0]}: redeliver answer names the exact Activation`, again.activationId === open.activationId]);
  checks.push([`${key[0]}: delivered Event destination is the exact Execution`, delivered.events.length === 1 && delivered.events[0].destination === created.executionId]);
  const taken = h.accepted(kernel.requestTakeover(who, created.executionId, { activationId: open.activationId, writerEpoch: 1 }));
  const outcome = h.accepted(kernel.submitOutcome(who, h.outcomeFor(created.executionId, taken), h.submissionFor(driver, open.activationId)));
  return { creation: created.receipt, input: input.receipt, dispatch: open.receipt, takeover: taken.receipt, outcome: outcome.receipt };
}
const checks: [string, boolean][] = [];
const a = run("k".repeat(200)), b = run("q".repeat(200));
for (const k of Object.keys(a) as (keyof typeof a)[]) {
  checks.push([`${k}: same position`, a[k].position === b[k].position]);
  checks.push([`${k}: distinct tokens across Executions`, a[k].token !== b[k].token]);
}
for (const [name, ok] of checks) console.log(ok ? "PASS" : "FAIL", name);
process.exitCode = checks.every(([, ok]) => ok) ? 0 : 1;
