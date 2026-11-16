// Independent review 03; run from the reviewed checkout with Node 26.10+.
// Public records are paired independently here; this script never calls H's Oracle.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(process.argv[2] ?? process.cwd());
const load = p => import(pathToFileURL(resolve(root, p)));
const { startLab, createCommand, acceptCommand, dispatchCommand, registerWait, timerCommand, shownGeneration } = await load('tests/conformance/k0-candidate/identity-lab.ts');
let runs = 0, steps = 0, pairs = 0;
function verify(lab) {
  const forward = new Map(), backward = new Map();
  const bind = (family, execution, native, text) => {
    assert.equal(typeof text, 'string');
    const a = JSON.stringify([family, execution, native]), b = JSON.stringify([family, execution, text]);
    if (forward.has(a)) assert.equal(forward.get(a), text);
    if (backward.has(b)) assert.equal(backward.get(b), native);
    forward.set(a, text); backward.set(b, native); pairs++;
  };
  for (const r of lab.records) {
    steps++;
    assert.equal(r.thrown, undefined);
    const {view:v, observation:o, command:c} = r;
    assert.ok(v && o);
    const ref = c.kind === 'create' || c.kind === 'create_retry' ? null : c.kind === 'accept_event' ? c.event.destination : c.kind === 'submit_outcome' || c.kind === 'resubmit_outcome' ? c.outcome.executionId : c.executionId;
    if (ref !== null) {
      const target = backward.get(JSON.stringify(['execution', '', ref]));
      assert.equal(v.executionId, target, 'post-command inspection describes the addressed Execution');
      for (const call of r.calls) {
        if (['inspect','dispatch','redeliver','requestTakeover','recoverExecution','cancelExecution'].includes(call.method)) assert.equal(call.args[1], target);
        if (call.method === 'submitInput') assert.equal(call.args[1].destination, target);
        if (call.method === 'submitOutcome') assert.equal(call.args[1].executionId, target);
        if (call.method === 'fireTimer') {
          assert.equal(call.args[0].executionId, target);
          assert.equal(String(call.args[0].generation), backward.get(JSON.stringify(['generation', target, c.generation])));
        }
      }
    }
    bind('execution','',v.executionId,o.executionId);
    for (const key of ['acknowledged','queued','terminalDispositions','dispatchedBatch']) {
      const raw=key==='dispatchedBatch' ? v.activation?.batch ?? null : v[key];
      assert.equal(o[key]===null,raw===null);
      if (raw===null) continue;
      assert.equal(o[key].length,raw.length);
      raw.forEach((id,i)=>bind('event',v.executionId,id,o[key][i]));
    }
    assert.equal(o.liveWaitGeneration===null,v.wait===null);
    if(v.wait) bind('generation',v.executionId,String(v.wait.generation),o.liveWaitGeneration);
    assert.equal(o.waitEndedReadiness.length,v.waitEndedReadiness?1:0);
    if(v.waitEndedReadiness) bind('generation',v.executionId,String(v.waitEndedReadiness.generation),o.waitEndedReadiness[0].generation);
  }
  runs++;
}
const view = l => l.records.at(-1).view;
const timeout = l => view(l).mailbox.filter(e=>e.sourceCategory==='kernel_timeout').at(-1).eventId;
const names=['', '__proto__', 'constructor', '雪', 'a\u0000b', 'e\u0301', 'é', 'kernel-generation:2', 'kernel-event:invented~2', 'to-g', 'name~9007199254740992'];
// Mixed Event paths, copied output chains, both orders, and identical local names in two Executions.
for(const name of names) for(const inputFirst of [false,true]) {
  const l=startLab(); l.apply(createCommand('x','kx')); l.apply(createCommand('y','ky'));
  for(const [x,offset] of [['x',0],['y',1000]]) {
    if(inputFirst) l.apply(acceptCommand(name,x,'a'));
    let g=shownGeneration(registerWait(l,x,name,offset+10));
    let o=l.apply(timerCommand(x,g,name));
    if(!inputFirst) o=l.apply(acceptCommand(name,x,'a'));
    let copied=o.queued.at(-1);
    for(let n=2;n<=5;n++) {
      g=shownGeneration(registerWait(l,x,name,offset+n*10));
      o=l.apply(timerCommand(x,g,copied));
      copied=o.queued.at(-1);
      l.apply(acceptCommand(copied,x,'copy'+n));
      l.apply(timerCommand(x,g,copied));
    }
    l.apply(dispatchCommand(x));l.apply({kind:'accept_cancellation',executionId:x});
  }
  verify(l);
}
// Occupy predicted fallback and all suffixes through ~32, before and after first exposure.
for(const occupied of [1,2,3,8,32]) {
  const cal=startLab();cal.apply(createCommand('x','kx'));registerWait(cal,'x','g',100);cal.apply(timerCommand('x','g','t'));
  const base='kernel-event:'+timeout(cal);
  const l=startLab();l.apply(createCommand('x','kx'));
  for(let n=1;n<=occupied;n++) l.apply(acceptCommand(n===1?base:base+'~'+n,'x','n'+n));
  registerWait(l,'x','g',100);
  const fired=l.apply(timerCommand('x','g',base));assert.equal(timeout(l),timeout(cal));
  assert.equal(fired.queued.at(-1),base+'~'+(occupied+1));
  l.apply(acceptCommand(fired.queued.at(-1),'x','after'));verify(l);
}
// Generation fallback and ~n variants; resolve old and fresh names to distinct native generations.
for(const occupied of [2,3,8]) {
  const l=startLab();l.apply(createCommand('x','kx'));const base='kernel-generation:'+(occupied+1);
  for(let n=1;n<=occupied;n++) {const g=shownGeneration(registerWait(l,'x',n===1?base:base+'~'+n,n*10));l.apply(timerCommand('x',g,'t'));}
  const g=shownGeneration(registerWait(l,'x',base,(occupied+1)*10));assert.equal(g,base+'~'+(occupied+1));
  assert.equal(l.apply(timerCommand('x',base,'old')).state,'WAITING');
  assert.equal(l.apply(timerCommand('x',g,'new')).state,'READY');verify(l);
}
// Execution fallback suffixes, copied outputs and inverse targeting; all observations remain usable.
for(const occupied of [2,3,8]) {
  const cal=startLab();cal.apply(createCommand('cal','target'));const base='kernel-execution:'+view(cal).executionId;
  const l=startLab();
  for(let n=1;n<=occupied;n++) l.apply(createCommand(n===1?base:base+'~'+n,'before'+n));
  const target=l.apply(createCommand(base,'target'));assert.equal(target.executionId,base+'~'+(occupied+1));
  l.apply(dispatchCommand(target.executionId));
  l.apply({kind:'inspect',executionId:base});assert.equal(view(l).creationKey,'before1');
  const after=l.apply(createCommand(target.executionId,'after'));
  assert.notEqual(after.executionId,target.executionId);l.apply(dispatchCommand(after.executionId));verify(l);
}
console.log(JSON.stringify({result:'passed',runs,steps,pairs,names,maximumOccupiedSuffix:32}));
