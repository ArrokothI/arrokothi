# K1.4 design check 04

**Verdict: APPROVED WITH REQUIRED CHANGES — D04-CHK-01, D04-CHK-02, D04-CHK-03.**

The learned-root scheduling primitive and source-derived cleanup inventory are the right mechanisms.
Design 04's idle-only reconciliation does not give *every* committed READY member an opportunity,
and its existing exception route can lose the promised failure report. The cleanup equivalence
rule also needs an executable, internally consistent definition. The three changes below stay
inside owner choice 05's narrow redesign; they require no Kernel or native-core source change.
This is conditional design approval, not acceptance of K1.4 or evidence that design 04 shipped.

## Identity, authority and scope

- Checker: Codex (GPT-6), independent session, 2026-11-08. This session did not write design 04 or previously review K1.4, and used no subagents.
- Design subject **H04 = `9cf57c61c78b1982012d6db920d353f8abba8ddb`**, fetched head of
  `origin/claude/k1.4` when this check began.
- Review binding **R02 = `b655733b9b90810eca747c61b8f2095f5f201341`**, fetched
  `origin/codex/k1.4-review-02`, equal to the requested `b655733b`.
- Check branch: `codex/k1.4-design-check-04`, created directly from H04. Neither review branch
  nor another candidate was merged. All source locations below are at H04.
- Native/SDK/test source at H04 equals review 02's payload
  **C = `3e4c59faa7b6138693bb9094144cafff7a33158e`**; verified with
  `git diff --quiet C H04 -- packages tests package.json package-lock.json` (exit 0).
- Read by immutable R02: [review 02](https://github.com/ArrokothI/arrokothi/blob/b655733b9b90810eca747c61b8f2095f5f201341/docs/development/work/K1.4/review-02.md),
  [brief 03](https://github.com/ArrokothI/arrokothi/blob/b655733b9b90810eca747c61b8f2095f5f201341/docs/development/work/K1.4/review-02/brief-03.md),
  `review-02/probes.mjs`, `hold-mutant.py` and the evidence README. Read at H04:
  [owner choice 05](owner-choice-05.md), [design 03 §8](design-03.md#8-addendum-after-design-check-03),
  and all of [design 04](design-04.md).
- Governing process: [006](../../006-development-process.md), with the architecture and slice-audit
  skills. Read the mental-model overview/reference, relevant Kernel/Driver descriptions and the
  execution-cycle, lifecycle, integration and evidence owners; development front door, baseline,
  roadmap/status, 012 and L-29..L-35. The research reading map's §§6–8 supplied background only;
  no external project's behavior is used as evidence here.

**Only R2-01 and R2-02 are checked.** Ownership is the SDK Execution Driver, its native scheduling
boundary and its cleanup evidence. Full cumulative K14-1..6 acceptance, K14-G/E1, provider quality,
containment and durable recovery remain outside this check. Owner choice 05's review-03 fallback
is unchanged. No production code, maintained tests, ledger or prior report was edited.

## R2-01 — progress and failure ownership

**Design result: FAIL as written; closes with D04-CHK-01 and D04-CHK-02.**

### What holds

Reconciliation from the collected READY contexts, with a synchronous `schedule(member, E)`, repairs
both concrete review reproducers. With a disposable prototype implementing §2.1, the capability
case reached `confirmation_required` and the model case completed. The same original probes on
unchanged H04 reproduce both failures: READY, zero queued entries, Kernel RUNNING, no holds.
The prototype does not change the facade or `enqueue`; the fault is still observed exactly once.
It is a design experiment, not a candidate implementation (in particular it omits §2.8's guard).

Registration before the first read closes the lost-wake window under design 03's atomic-visibility
and monotone-record assumptions:

| Commit window | Result of the proposed mechanism |
|---|---|
| Before registration / before collect | The next collect sees committed READY; no retained notification is needed. |
| After registration, visible in collect | READY is observed and can be scheduled. |
| After a context read / during a torn collect | A collected `open` has an already-resolved `work`; a candidate human `await` requires the second equal collect. Re-observation sees the commit. |
| After collect / while parked | The registered waiter receives the synchronous signal. Unknown scopes broadcast; scheduling uses the BFS root E. |
| After validated human quiescence | Autonomous relevant settlement is ruled out by the unchanged quiescence argument; legal late enqueue tails are inert hints. Kernel input/cancellation retain their existing routes. |

The no-read scheduling primitive is compatible with the native transaction port: no extra transaction
await, no substituted result/error or promise. Source inspection of `LineageScheduler` and
`Harness.activate` supports deduplication: queued IDs coalesce, a claimed ID gets one pending requeue,
and every claim rechecks READY transactionally. A duplicate queue entry is not permission to replay
an already-consumed observation or resumption. A later claim can legitimately execute a **new** READY
revision; “one Activation and one dropped claim” in B-ENQUEUE-LATE must be scoped to the tested
continuation, not asserted across arbitrary subsequent work.

Cancellation remains a competing state change: after `ended`, the Driver must start no new
`runOnce`; a native pending cancellation is checked before controller work, and an already-started
step is handled by the existing cancellation/cleanup protocol. Reconciliation must not clear
`ended`, invent a worker, or redispatch capabilities. Retain the late-enqueue, during-claim requeue,
cancel-before-claim, cancel-during-step and spawned-descendant controls. This is a reasoned path
check plus retained tests, not a claim to have enumerated every asynchronous schedule.

### D04-CHK-01 — reconcile READY members even while another member makes progress

**P2; design 04 §§2.1, 2.8; `driver.ts:363–376`.**

The proposed precondition is *no step ran AND no claimable entry in the lineage*. Let parent A
continually return `continue`, leaving itself READY and requeued. Child B's capability settles,
commits B READY and loses its enqueue once. Every exchange runs A, collects B READY, and returns
`continue` at `if (record) return decision`. Reconciliation is never reached. §2.8 also never
fires: a step did run, and B was never scheduled by reconciliation.

The real Driver/Harness/scheduler probe in the appendix, with §2.1 installed on prototypes only,
observed:

```text
faults=1, capability calls=1, parent steps after settlement=20,
child steps after settlement=0, child=READY, queue=[parent], recoveryHolds=[]
```

Explicitly scheduling B then let it run without another capability dispatch. The bounded probe
uses 100 parent `continue` instructions; it proves the omitted scheduling opportunity for that
prefix. The indefinite case follows from the same branch on every iteration of a perpetually
continuing controller: no loop counter or failure/hold changes that branch. This does not demand
prompt human-pause surfacing under L-31; it demands an opportunity for B's **already-settled** work.

**Required:** reconcile all READY members of an observed nonterminal lineage before yielding a
`continue`, including when a different member just ran or already has a queue entry. An equivalent
per-member fairness mechanism is acceptable if it gives a finite scheduling opportunity independent
of a sibling becoming idle. Preserve one active native step and one-step-per-continue accounting.
Bind the §2.8 detector to an actual scheduling/claim attempt for the named member and revision;
a sibling's progress must not indefinitely mask an unserviceable member, nor count as its attempt.

**Build closure:** promote the appendix's settled-child/continuing-parent case, count per-member
steps and executor invocations, and show that removing reconciliation fails it as well as the two
original lost-enqueue tests. Include multiple READY members and a later revision after a duplicate
claim so the guard does not report a legitimate continuation as unschedulable.

### D04-CHK-02 — reporting failure must survive native cleanup failure

**P2; design 04 §§2.3, 2.8; `driver.ts:334–337`, `:579–588`, `:243–250`.**

The claimed explicit failure route is not total. `terminate` awaits native cascade before offering
failure/hold. The exchange catch then swallows rejection of that entire call. After a model commits
READY, reject the collect's context read and the exception cascade's context read. Both are native
store reads; the Kernel remains healthy. The appendix observed exactly two rejections and:

```text
Kernel=RUNNING, native=READY, recoveryHolds=[]
```

The exchange has exited and `ended` is set. Further host pumping supplies no recovery. This is a
bounded **two-fault** witness, not misreported as the original single enqueue fault. It also defeats
§2.8's reliance on the same exception route if native cleanup fails after `UnschedulableReadyError`.
The mechanism is inherited error suppression, now relied upon by the proposed guarantee.

**Required:** specify a final reporting path that needs no successful native store read, scheduling
operation or cascade. If cleanup fails, keep the lineage stopped and report an inspectable Kernel
hold/failure with a bounded diagnostic; do not falsely report successful physical cleanup or
acknowledge an unencodable batch. Preserve existing cancellation-loss handling. No native-core
change or new Kernel semantic is needed: the Driver already has `reportProtocolFailure`.

**Build closure:** retain one-shot faults at collect inspectors and activation setup, then add the
bounded collect-plus-cleanup failure above and unschedulable-plus-cleanup failure. Assert the explicit
Kernel disposition, no later native steps, no duplicate provider/executor call, and no unhandled
rejection. This asks for reporting while the Kernel control path remains available, not survival of
process death, OOM, a never-resolving native call or failure of the Kernel itself.

### Fallible-point trace

| Point | Ownership / closure |
|---|---|
| Settlement transaction rejects before READY commit | No committed READY premise; unchanged pending/unknown native work and existing recorded limits. Do not claim recovery by reconciliation. |
| Postcommit `wake` / `enqueue` lookup rejects | Both swallowed-tracker reproducers covered; committed facts must drive per-member reconciliation (D04-CHK-01). |
| Notification / new `schedule` | Synchronous learned-root/broadcast and local insertion; no store read or await. Host intrinsic failure is not claimed covered. |
| Any collect read, claim/activation setup, step, or submission-preparation read rejects | Exchange exception owner; explicit reporting requires D04-CHK-02 if its cleanup also rejects. |
| Non-READY stale claim | Ack/drop; no controller invocation. Pending cancellation cancels before controller invocation. |
| READY read but no activation at same revision | §2.8 is a useful diagnostic, conditional on identifying the attempted member and D04-CHK-02. It is not the only possible no-progress state: D04-CHK-01 has an ordinary conforming store. |
| Cleanup traversal, inspect, or native cancellation rejects | Must not prevent the Kernel-visible failure/hold; remaining cleanup is not represented as successful. |

The proposed producer census should be source-derived, not pinned to “13”: H04 has five literal
scheduler enqueue expressions in Harness (`316`, `343`, `443`, `515`, `1537`), eight `deps.wake`
expressions in the effect processor and one in the resumption processor. The first two Harness
expressions wire delegate callbacks. Distinguish delegate edges from actual producers and trace their
error owners; a raw expression total is 14, not the note's four-plus-eight-plus-one.

## R2-02 — cleanup oracle

**Design result: FAIL as written; closes with D04-CHK-03.**

The static census is materially stronger than deriving the inventory from trigger rows. Independently
walking the source confirms the proposed 16 semantic labels: six cancellation call sites, six
literal `terminate` callers, three arms at the terminal call, and the accounting `hold` call.
The forwarding call inside `terminate` is a delegation edge, not a seventeenth trigger.

| Real sites at H04 | Proposed label(s) |
|---|---|
| `driver.ts:198,228,279,300,331`; `application.ts:380` | `cancel.root-created`, `cancel.request`, `cancel.exchange-start`, `cancel.forward-loop`, `cancel.step-ended`, `cancel.application` |
| `driver.ts:283,286,295,316,320,337` | `progress`, `root-missing`, `timeout`, `forward`, `initial-input`, `exception` |
| `driver.ts:518` | `complete`, `fail`, `native-cancelled` |
| `driver.ts:523` | `hold` |

T13 has the necessary distinguishing state: a live parent and called child. Independently rerunning
review 02's probe yielded CANCELLED/CANCELLED with the hold cascade and WAITING/WAITING with only that
cascade suppressed; both cases had `protocol_failure`. Preserve T13's additional required assertions
for unacknowledged batch, absent accounting Emission and no later work. T12's terminal-Outcome refusal
does not substitute for this case. There is no demonstrated production hold-cascade defect to patch.

### D04-CHK-03 — define and test actual equivalence, including T6

**P2; design 04 §§3.3–3.4.**

Two inconsistencies remain in the proposed oracle:

1. §3.3 permits equivalence only by naming an earlier label that already ended the lineage, and
   requires that label to have been reached first. §3.4 declares T6 equivalent because the root is
   terminal and no descendant exists. T6 needs **no earlier label**. Applying the stated rule either
   rejects this legitimate equivalence or encourages an unrecorded exception to the oracle.
2. Entry into an earlier label is not evidence of completed cleanup over the same membership.
   The existing request cascade can be entered before root creation or before an in-flight step
   creates a child. This is precisely why `cancel.root-created`, `cancel.step-ended` and the second
   application cascade exist. Checking label order alone cannot establish redundancy of the later
   cascade. A finite row set also must not be described as proof against every future interleaving.

**Required:** give the table explicit, checked forms of equivalence:

- **Empty obligation:** assert terminal root and no descendants at the site (T6), plus its actual
  ingress/failure assertions, with and without the site. Do not replace execution with `assert.ok(true)`.
- **Redundant cleanup:** name the other cleanup and prove the relevant members were ended, with no
  subsequent member creation that escapes cleanup. Retain the row's full terminal/no-later-work
  assertions under removal, not merely the sequence of label entries. Include delayed root creation
  and the late-spawn cancellation schedule before assigning these sites an equivalence disposition.

Every non-equivalent label must have at least one distinguishing row whose **behavioral** assertion
fails when only that label's cascade is removed. Do not count failure of the census/log-hit assertion
itself as killing the behavioral mutant. A label may be redundant on one row and necessary on another;
require the named distinguishing rows to fail and explicitly record equivalent row/site pairs.
Unreached, unmapped, surviving-without-proof or malformed mappings fail the build as §3.4 promises.

The AST census must resolve the intended native cleanup calls (the SDK also calls the Kernel's
`cancelExecution`), enforce literal label ownership and compare the real set with both tuple and
oracle. Add negative controls for a new unlabeled/unmapped site and for deletion of the `hold` row.
Any unsupported indirect/aliased call form must fail closed or be an explicit bounded-search gap;
“parses with the TypeScript API” alone does not prove exhaustive call resolution.

**Build closure:** the source-derived matrix, executable T6, T13 plus its single-site ablation,
and cancellation creation/spawn rows all run. Report baseline rows, distinct labels, removals,
behavioral kills and proven equivalences separately. This closes the proposed oracle's consistency
and evidence obligations without changing working cleanup behavior.

## Evidence and limits

Environment: Darwin arm64, Node **v26.10.0** at the repository-recorded local Node path, existing
workspace dependencies. All production source remained unchanged. Commands ran from the H04 checkout:

| Execution | Observation |
|---|---|
| `node --experimental-strip-types --test packages/sdk/tests/bridge-*.test.ts` | 162 passed, 0 failed/cancelled/skipped/TODO; includes maintained in-test cleanup ablations. |
| R02 `probes.mjs`, only relative imports rebound to the H04 workspace | 3 passed, 2 failed as expected: both lost-enqueue reproducers. |
| Same five probes with appendix §2.1 prototype | 5 passed; capability reached confirmation, model completed; live-hold removal still distinguished. |
| Appendix `attacks.mjs` with prototype | 2 passed **as defect witnesses**, observations quoted above. These are not passing acceptance tests. |
| Same 162 bridge tests with the §2.1 prototype | 162 passed, 0 failed/cancelled/skipped/TODO. This does not close either new defect witness. |

No full packet verification, general mutation registry, typecheck, E1 run or new maintained schedule
matrix was run: this is the requested two-item documentation/design check. No claim of an implemented
§2.8 detector or completed 16-label census is made. Existing committed/rollback, no-wake, lineage and
schedule tests were retained; new registration/fault combinations listed in design 04 remain build
acceptance obligations. The two R02 failures are expected baseline observations, not new findings.

Design 04 §4's corrections are otherwise appropriate: retract the lost-enqueue attribution to L-31,
qualify G-SLOWCAP/G-SLOWMODEL with actual fault evidence, correct the cleanup-ablation count, preserve
historical evidence by dated correction, and commit the next report's own referenced log. Do not
turn the findings here into a further silent expansion of L-31.

Third-party reuse: none. The probes use existing repository code and dependencies; no external
source, dependency, asset or service was copied, adapted, added or licensed by this check.

## Reproducible throwaway probes

The following two complete files preserve the new witnesses inside this report, so no extra source
file is required on the check branch. The installation models only the specified scheduling delta
and retains the original step loop's control flow. It neither implements nor tests §2.8, and no
finding depends on omitting that guard: the starvation case always runs a step, and the read-failure
case throws before the guard could run. All mutations are process-local prototypes.

From the pinned checkout, extract and run with Node 26.10.0 (existing workspace dependencies):

```sh
python3 - <<'PYCODE'
from pathlib import Path
import re, subprocess
root = Path.cwd()
out = Path('/tmp/k14-d04-reproduce')
out.mkdir(exist_ok=True)
report = (root / 'docs/development/work/K1.4/design-check-04.md').read_text()
for name in ('install-design.mjs', 'attacks.mjs'):
    source = re.search(r'### ' + re.escape(name) + r'\n\n```javascript\n(.*?)\n```', report, re.S).group(1)
    (out / name).write_text(source.replace('@ROOT@', str(root)) + '\n')
source = subprocess.check_output(['git', 'show',
    'b655733b9b90810eca747c61b8f2095f5f201341:docs/development/work/K1.4/review-02/probes.mjs'], text=True)
(out / 'review-probes.mjs').write_text(source.replace('../../../../../', str(root) + '/'))
PYCODE
node --experimental-strip-types --test /tmp/k14-d04-reproduce/review-probes.mjs
node --experimental-strip-types --import /tmp/k14-d04-reproduce/install-design.mjs --test /tmp/k14-d04-reproduce/review-probes.mjs
node --experimental-strip-types --import /tmp/k14-d04-reproduce/install-design.mjs --test /tmp/k14-d04-reproduce/attacks.mjs
```

Expected: first command's tests fail 2/5 on unchanged source; second passes 5/5; third passes 2/2
by asserting the two defects exist. The source-derived oracle contradictions are specified above
and require no fake oracle implementation to reproduce.

### install-design.mjs

```javascript
import assert from 'node:assert/strict';
import { LegacyDriver } from '@ROOT@/packages/sdk/src/legacy-bridge/driver.ts';
import { LineageScheduler, lineageWorker } from '@ROOT@/packages/sdk/src/legacy-bridge/lineage-scheduler.ts';
// Throwaway reading of D04 §2.1. No repository source is changed.
LineageScheduler.prototype.schedule = function(executionId, lineage) {
  if (this.claimedExecutions.has(executionId)) this.pendingRequeue.set(executionId, lineage);
  else if (!this.queue.some(entry => entry.executionId === executionId)) this.queue.push({ executionId, lineage });
  this.wake(lineage);
};
const collected = new WeakMap();
const collect = LegacyDriver.prototype.collect;
LegacyDriver.prototype.collect = async function(...args) {
  const result = await collect.apply(this,args); collected.set(this,result); return result;
};
LegacyDriver.prototype.reconcile = function(id) {
  for (const [member, record] of collected.get(this).members) {
    if (record.context.lifecycle === 'READY') this.scheduler.schedule(member,id);
  }
};
let step = LegacyDriver.prototype.step.toString();
const old = /\/\/ READY in the store but not queued yet:[\s\S]*?\/\/ wait for it rather than split the work across exchanges\./;
assert.match(step,old);
step = step.replace(old, 'this.reconcile(executionId); continue;');
LegacyDriver.prototype.step = Function('lineageWorker',`return ({${step}}).step`)(lineageWorker);
```

### attacks.mjs

```javascript
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setImmediate as turn } from 'node:timers/promises';
import { scriptedRig } from '@ROOT@/packages/sdk/tests/bridge-rig.ts';
import { deferred, models, answerAgent } from '@ROOT@/packages/sdk/tests/bridge-fixtures.ts';
import { createApplication } from '@ROOT@/packages/sdk/src/index.ts';
import { InMemoryRuntimeStore, createNoInlineWaitBudget, createDeferredModelProvider } from '@ROOT@/packages/core/src/reference/index.ts';

test('D04 idle-only reconciliation starves a settled READY child while another member continues', async t => {
  const release = deferred(); let calls = 0;
  const rig = await scriptedRig({
    root: [{do:'spawn',definitionId:'child',definitionVersion:1,await:false, requestedOperations:[{capability:'test',operation:'slow'}]}, ...Array.from({length:100},()=>({do:'continue'})), {do:'await',eventKinds:['external.input']}],
    child:[{do:'use_capability',capability:'test',operation:'slow'}, {do:'complete'}],
  }, {async execute(){ calls++; await release.promise; return {status:'success',observation:'ok'}; }});
  const tick = async () => { rig.host.pump(); rig.host.dispatchReady(); await rig.host.idle(2); };
  let faults=0, child, childSteps=0, rootSteps=0;
  try {
    for(let i=0;i<10 && calls===0;i++) await tick();
    assert.equal(calls,1);
    child=(await rig.driver.harness.childExecutionLinksOf(rig.executionId))[0].childExecutionId;
    const read=rig.store.readExecution.bind(rig.store);
    rig.store.readExecution=async id=>{
      if(id===child && faults===0 && new Error().stack.includes('LineageScheduler.enqueue')) { faults++; throw Error('lost child enqueue'); }
      return read(id);
    };
    release.resolve();
    for(let i=0;i<100 && faults===0;i++) await turn();
    assert.equal(faults,1);
    const off=rig.driver.onStep(record=>{ if(record.executionId===child) childSteps++; else rootSteps++; });
    for(let i=0;i<20;i++) await tick();
    const facts={faults,calls,rootSteps,childSteps,child:(await read(child)).lifecycle,queued:rig.driver.scheduler.queue.map(x=>x.executionId===child?'child':'root'),holds:rig.host.inspect(rig.executionId).recoveryHolds};
    t.diagnostic(JSON.stringify(facts));
    assert.equal(facts.child,'READY'); assert.equal(childSteps,0); assert.ok(rootSteps>=20); assert.equal(facts.holds.length,0);
    rig.driver.scheduler.schedule(child,rig.executionId);
    for(let i=0;i<4;i++) await tick();
    assert.ok(childSteps>0,'control: scheduling the omitted member lets it run');
    assert.equal(calls,1,'no repeated capability dispatch'); off();
  } finally { release.resolve(); rig.host.coordinator.cancelExecution(rig.host.caller,rig.executionId); await rig.driver.cancellationSettled(rig.executionId); await rig.driver.cascade(rig.executionId); }
});

test('postcommit failure plus a cleanup read failure silently loses the exception report', async t => {
  let armed=false, faults=0;
  class Store extends InMemoryRuntimeStore {
    async readExecution(id) {
      const stack=new Error().stack;
      if(armed && (stack.includes('LegacyDriver.collect') || stack.includes('LegacyDriver.cascade'))) { faults++; throw Error('native reads unavailable'); }
      return super.readExecution(id);
    }
  }
  const provider=createDeferredModelProvider('slow'); const store=new Store();
  const app=createApplication({models:models(provider),runtime:{store,inlineWait:createNoInlineWaitBudget()}});
  const {executionId}=await app.start({definition:answerAgent(),input:{label:'user',payload:'q'}});
  try {
    await app.runUntilBlocked(executionId,{timeoutMs:30,pollIntervalMs:1});
    armed=true; provider.settle({text:'ready'});
    for(let i=0;i<100 && faults<2;i++) await turn();
    const run=await app.runUntilBlocked(executionId,{timeoutMs:50,pollIntervalMs:1});
    t.diagnostic(JSON.stringify({faults,kernel:run.kernel.state,native:run.execution.lifecycle,holds:run.kernel.recoveryHolds}));
    assert.equal(faults,2); assert.equal(run.kernel.state,'RUNNING'); assert.equal(run.execution.lifecycle,'READY'); assert.deepEqual(run.kernel.recoveryHolds,[]);
  } finally { armed=false; await app.cancel(executionId); }
});
```
