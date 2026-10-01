// Reviewer probe (K1.2 review 11, K12-R11-ORDER-01). Independent of the packet's tests.
// Run from the repository root after `npm install`:
//   node --experimental-strip-types --no-warnings docs/development/work/K1.2/review-11/probe-partial-claim.ts
// It exits non-zero while a proposal whose well-formed writer epoch or base progress revision is
// stale is classified as anything other than `stale_exchange`.
import { ExecutionCoordinator } from "../../../../../packages/kernel/src/index.ts";
import type { Activation, DeliverySettlement, SubmissionGrant } from "../../../../../packages/kernel/src/index.ts";

const author = { namespace: "app-a", scopes: ["tenant-a"], controlScopes: ["tenant-a"] };
const dashboard = { namespace: "app-a", scopes: ["tenant-a"] }; // visible, no control, never handed a grant

const grants: SubmissionGrant[] = [];
const driver = {
  driverId: "probe",
  deliver(_activation: Activation, settlement: DeliverySettlement, grant: SubmissionGrant): undefined {
    grants.push(grant);
    settlement.delivered();
    return undefined;
  },
  isSafeToReplace(): boolean {
    return true;
  },
};
const kernel = new ExecutionCoordinator({ driver });
const created = kernel.createExecution(author, {
  creationKey: "r11-partial-claim",
  scope: "tenant-a",
  definitionRevision: "d@1",
  runtimeContractRevision: "r@1",
  progressCodec: "c@1",
  authorityContext: { t: "a" },
  initialInput: { kind: "k", payload: 1 },
});
if (!created.ok) throw new Error("create refused");
const id = created.value.executionId;
const open = kernel.dispatch(author, id, { bound: 1 });
if (!open.ok) throw new Error("dispatch refused");
const activationId = open.value.activationId;
const retired = grants[0] as SubmissionGrant;
const takeover = kernel.requestTakeover(author, id, { activationId, writerEpoch: 1 });
if (!takeover.ok || takeover.value.writerEpoch !== 2) throw new Error("takeover refused");
const current = grants[1] as SubmissionGrant;

// Current exchange after takeover: Activation `activationId`, writer epoch 2, base progress revision 0.
const envelope = (claim: Record<string, unknown>) =>
  ({ executionId: id, activationId, progress: 1, next: { step: "continue" }, ...claim }) as never;
const cases: [string, Record<string, unknown>, SubmissionGrant | undefined, typeof author | typeof dashboard][] = [
  ["control: stale epoch 1, base 0, retired grant", { writerEpoch: 1, baseProgressRevision: 0 }, retired, author],
  ["stale epoch 1, base missing, retired grant", { writerEpoch: 1 }, retired, author],
  ["stale epoch 1, base -1, retired grant", { writerEpoch: 1, baseProgressRevision: -1 }, retired, author],
  ["stale epoch 1, base missing, no grant", { writerEpoch: 1 }, undefined, dashboard],
  ["stale epoch 1, base missing, current grant", { writerEpoch: 1 }, current, author],
  ["future epoch 5, base missing, no grant", { writerEpoch: 5 }, undefined, dashboard],
  ["epoch missing, stale base 7, current grant", { baseProgressRevision: 7 }, current, author],
  ["epoch missing, stale base 7, no grant", { baseProgressRevision: 7 }, undefined, dashboard],
];
let wrong = 0;
for (const [label, claim, grant, who] of cases) {
  const answer = kernel.submitOutcome(who, envelope(claim), grant as SubmissionGrant);
  const got = answer.ok ? "ACCEPTED" : answer.error.classification;
  if (got !== "stale_exchange") wrong += 1;
  console.log(`${got === "stale_exchange" ? "ok  " : "BAD "} ${label.padEnd(48)} -> ${got}`);
}
const view = kernel.inspect(author, id);
if (!view.ok || view.value.state !== "RUNNING" || view.value.progressRevision !== 0) throw new Error("accepted state changed");
console.log(`accepted state unchanged: RUNNING, progress revision 0, epoch ${view.value.activation?.writerEpoch}`);
process.exitCode = wrong === 0 ? 0 : 1;
