// Reviewer probe (not payload). Usage: TREE=<worktree> node --experimental-strip-types probe-identity.ts
import assert from "node:assert/strict";
const tree = process.env.TREE!;
const k = await import(`${tree}/packages/kernel/src/index.ts`);
const h = await import(`${tree}/packages/kernel/tests/harness.ts`);
const { ExecutionCoordinator } = k;
const { accepted, caller, observer, createRequest, outcomeFor, recordingDriver, refused, submissionFor } = h;

const out: string[] = [];
const log = (s: string) => { out.push(s); console.log(s); };
const r = (x: any) => (x.ok ? `ok` : `${x.error.classification}`);
const absent = undefined as any;
const available = { definitionRevisions: ["weekly-report@3"], runtimeContractRevisions: ["runtime-contract@1"], progressCodecs: ["inline-json@1"] };

function setup(key = "identity", namespace = "app-a", scope = "tenant-a") {
  const who = caller(namespace, scope);
  const driver = recordingDriver();
  const kernel = new ExecutionCoordinator({ driver });
  const created = accepted(kernel.createExecution(who, createRequest({ creationKey: key, scope })));
  const executionId = created.executionId as string;
  const view = () => accepted(kernel.inspect(who, executionId));
  return { who, driver, kernel, executionId, view };
}

// P1: review-14 CE2 reproduced independently, all four surfaces, at exchange 10.
{
  const { who, driver, kernel, executionId, view } = setup("k".repeat(65_490));
  let open: any;
  for (let n = 1; n <= 9; n++) {
    open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
    accepted(kernel.submitOutcome(who, outcomeFor(executionId, open, { progress: n }), submissionFor(driver, open.activationId)));
  }
  open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
  log(`P1 exch10 id length ${open.activationId.length}`);
  log(`P1 recover(missing) ${r(kernel.recoverExecution(who, executionId, { activationId: open.activationId, available: { ...available, progressCodecs: [] } }))}`);
  log(`P1 recover(all) ${r(kernel.recoverExecution(who, executionId, { activationId: open.activationId, available }))}`);
  log(`P1 protocol ${r(kernel.reportProtocolFailure(who, executionId, { ...open, diagnostic: "x" }))}`);
  const t = kernel.requestTakeover(who, executionId, open);
  log(`P1 takeover ${r(t)} epoch=${t.ok ? t.value.writerEpoch : "-"}`);
  const cur = t.value;
  const d = kernel.submitOutcome(who, outcomeFor(executionId, cur, { progress: 10, next: { step: "complete", result: { done: true } }, emissions: [{ emissionKey: "e", value: 1 }] }), submissionFor(driver, open.activationId));
  log(`P1 outcome(complete+emission) ${r(d)} rev=${d.ok ? d.value.progressRevision : "-"} resultId.len=${d.ok ? d.value.resultId?.length : "-"}`);
  const v = view();
  log(`P1 state ${v.state} emissions=${v.emissions.length} result=${v.result?.kind}`);
  // P2: exact equality on the long current-then-accepted ID
  const acc = outcomeFor(executionId, cur, { progress: 10, next: { step: "complete", result: { done: true } }, emissions: [{ emissionKey: "e", value: 1 }] });
  const rep = kernel.submitOutcome(who, acc, absent);
  log(`P2 replay after terminal (no grant) ${rep.ok ? "replayed=" + rep.value.replayed + " sameReceipt=" + (rep.value.receipt === d.value.receipt) : rep.error.classification}`);
  // ID of exchange 1 vs truncated exchange 10: exchange 10 truncated to 65,536 equals exchange 1's ID
  const trunc = open.activationId.slice(0, 65_536);
  log(`P2 truncated exch10 === exch1 id? ${trunc === v.exchanges[0].activationId}`);
  const rTrunc = kernel.submitOutcome(who, { ...acc, activationId: trunc }, absent);
  log(`P2 submit truncated exch10 (== exch1 id, different content) -> ${rTrunc.ok ? "replay" : rTrunc.error.classification}`);
}

// P2b: exact equality with open exchange: prefix/suffix/normalization variants all stale.
{
  const { who, driver, kernel, executionId } = setup("café", "app-a");
  const open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
  const g = submissionFor(driver, open.activationId);
  const variants: [string, string][] = [
    ["prefix", open.activationId.slice(0, -1)],
    ["suffix", open.activationId + "0"],
    ["NFD", open.activationId.normalize("NFD")],
    ["upper", open.activationId.toUpperCase()],
    ["rope-equal", [...open.activationId].join("")],
  ];
  for (const [name, id] of variants) {
    const res = kernel.submitOutcome(who, outcomeFor(executionId, { ...open, activationId: id }), g);
    log(`P2b ${name} (${id === open.activationId ? "equal" : "different"}) -> ${r(res)}`);
    if (res.ok) break;
  }
}

// P3: lone-surrogate namespace, emission/result IDs, replay distinctness.
{
  const { who, driver, kernel, executionId, view } = setup("k", "host-\ud800");
  const open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
  const d = kernel.submitOutcome(who, outcomeFor(executionId, open, { emissions: [{ emissionKey: "a", value: 1 }, { emissionKey: "b", value: 2 }], next: { step: "fail", error: "x" } }), submissionFor(driver, open.activationId));
  log(`P3 surrogate namespace fail+2 emissions ${r(d)} emissionIds distinct=${d.ok && new Set(d.value.emissionIds).size === 2}`);
  log(`P3 view state ${view().state}`);
}

// P4: refusal-reason rendering of arbitrary caller strings reachable before authority.
{
  const { who, driver, kernel, executionId, view } = setup();
  const open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
  const viewer = observer("app-b", "tenant-a"); // visibility only: no control power, no grant
  const huge = "Z".repeat(50_000_000);
  const before = process.memoryUsage().heapUsed;
  const res = kernel.submitOutcome(viewer, outcomeFor(executionId, { ...open, activationId: huge }), absent);
  log(`P4 visibility-only huge stale Outcome -> ${r(res)} reasonLength=${res.ok ? "-" : res.error.reason.length}`);
  const sur = kernel.submitOutcome(viewer, outcomeFor(executionId, { ...open, activationId: "inject\ud800" }), absent);
  log(`P4 visibility-only surrogate stale Outcome -> ${r(sur)} reasonHasLoneSurrogate=${!sur.ok && /\ud800(?![\udc00-\udfff])/.test(sur.error.reason)}`);
  const other = observer("app-c", "tenant-a");
  const seen = accepted(kernel.inspect(other, executionId));
  log(`P4 another viewer inspects refusal reasons: maxLength=${Math.max(...seen.refusals.map((x: any) => x.reason.length))}`);
  // Controls with control power: #openExchange stale path
  const ctl = kernel.requestTakeover(who, executionId, { activationId: huge, writerEpoch: 1 });
  log(`P4 control huge stale takeover -> ${r(ctl)} reasonLength=${ctl.ok ? "-" : ctl.error.reason.length}`);
  // No exchange path
  accepted(kernel.submitOutcome(who, outcomeFor(executionId, open), submissionFor(driver, open.activationId)));
  const ne = kernel.submitOutcome(viewer, outcomeFor(executionId, { ...open, activationId: huge + "!" }), absent);
  log(`P4 no-exchange huge -> ${r(ne)} reasonLength=${ne.ok ? "-" : ne.error.reason.length}`);
  log(`P4 heap delta MB ~ ${Math.round((process.memoryUsage().heapUsed - before) / 1e6)}`);
  void view;
}
