// Review-only bounded search of typed owner-plan positions and registration freshness.
import { test } from 'node:test';
import assert from 'node:assert/strict';
const { KernelState } = await import(`${process.cwd()}/packages/kernel/src/state.ts`);
const { accepted } = await import(`${process.cwd()}/packages/kernel/tests/harness.ts`);
const { author, created, dispatch, input, submitAwait, submitNext, view, waitOn } = await import(`${process.cwd()}/packages/kernel/tests/waits-kit.ts`);
const original = KernelState.prototype.apply;
function rewrite(kind, transform, run) {
  KernelState.prototype.apply = function(p) { return original.call(this, p.kind === kind ? Object.freeze(transform(p)) : p); };
  try { return run(); } finally { KernelState.prototype.apply = original; }
}
function* words(alphabet,max,prefix=[]) {
  yield prefix;
  if(prefix.length<max) for(const value of alphabet) yield* words(alphabet,max,[...prefix,value]);
}
test('exact-cover matrix: two queued positions, every split, numeric aliases and out-of-range positions', () => {
  let acceptedCount=0, refusedCount=0;
  for(const word of words([-1,-0,0,1,2,NaN,Infinity,0.5],3)) {
    for(let split=0;split<=word.length;split++) {
      const first=word.slice(0,split),second=word.slice(split);
      const exact=word.length===2 && new Set(word).size===2 && word.every(n=>n===0||n===1);
      const o=created();input(o,'s');const a=dispatch(o,1);const before=view(o);
      const run=()=>rewrite('outcome',p=>({...p,acknowledgeAt:first,endAt:second}),()=>submitNext(o,a,{step:'complete',result:true}));
      if(exact) {accepted(run());assert.deepEqual(view(o).queued,[]);acceptedCount++;}
      else {assert.throws(run,/S2/);assert.deepEqual(view(o),before);refusedCount++;}
    }
  }
  console.log(JSON.stringify({dimension:'exact-cover',accepted:acceptedCount,refused:refusedCount}));
});
test('generation matrix: mutually consistent reused/skipped/fresh generations for live, immediate wake and immediate expiry', () => {
  let acceptedCount=0,refusedCount=0;
  for(const mode of ['live','event','deadline']) for(const generation of [0,1,2,3,4]) {
    const o=created();accepted(submitAwait(o,dispatch(o),waitOn('s',0)));const a=dispatch(o);
    if(mode==='event')input(o,'s');const before=view(o);
    const run=()=>rewrite('outcome',p=>({...p,registrations:generation,
      liveWait:p.liveWait===null?null:Object.freeze({...p.liveWait,generation}),
      retired:p.retired===null?null:Object.freeze({...p.retired,generation}),
      readiness:p.readiness===null?null:Object.freeze({...p.readiness,generation}),
      timeout:p.timeout===null?null:Object.freeze({...p.timeout,generation})
    }),()=>submitAwait(o,a,waitOn('s',mode==='deadline'?0:10)));
    if(generation===2){accepted(run());assert.equal((view(o).wait??view(o).retiredWaits.at(-1)).generation,2);acceptedCount++;}
    else {assert.throws(run,/S4/);assert.deepEqual(view(o),before);refusedCount++;}
  }
  console.log(JSON.stringify({dimension:'generation-freshness',accepted:acceptedCount,refused:refusedCount}));
});
