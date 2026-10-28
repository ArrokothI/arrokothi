// Review 03 evidence. Run from exact H; no source edits or reference-oracle imports.
import assert from 'node:assert/strict';
const at = p => import(`${process.cwd()}/${p}`);
const { KernelState } = await at('packages/kernel/src/state.ts');
const { accepted } = await at('packages/kernel/tests/harness.ts');
const { author, created, dispatch, input, submitAwait, submitNext, view, waitOn } = await at('packages/kernel/tests/waits-kit.ts');
const apply = KernelState.prototype.apply;
let capture = null, plans = 0;
const STOP = {};
KernelState.prototype.apply = function(p) {
  if (capture) { capture(p, this); throw STOP; }
  apply.call(this,p); plans++;
  assert.equal(this.postStateViolation(p.executionId),null);
};
function planned(run) {
  let found; capture=(p,owner)=>{found={p,owner};};
  try {run();} catch(e) {if(e!==STOP) throw e;} finally {capture=null;}
  assert.ok(found); return found;
}
function seed(n) {
  const o=created(); let a=dispatch(o);
  for(let i=0;i<n;i++) {
    const cls=`history-${i}`;
    if(i%3===0) accepted(submitAwait(o,a,waitOn(cls,0)));
    else if(i%3===1) {input(o,cls);accepted(submitAwait(o,a,waitOn(cls)));}
    else {accepted(submitAwait(o,a,waitOn(cls)));input(o,cls);}
    a=dispatch(o);
  }
  input(o,'next');input(o,'unmatched');
  return {o,a};
}
let historyCases=0, refusalCases=0, acceptedCases=0, partitionCases=0;
function rejected(owner,p,o) {
  const before=view(o), version=owner.find(o.executionId).version;
  assert.throws(()=>apply.call(owner,Object.freeze(p)),/plan refused/);
  assert.deepEqual(view(o),before);assert.equal(owner.find(o.executionId).version,version);
  refusalCases++;
}
try {
  for(const n of [0,1,2,5,16]) for(const mode of ['live','event','deadline']) {
    const {o,a}=seed(n);
    const wait=mode==='event'?waitOn('next'):waitOn('absent',mode==='deadline'?0:10);
    const {p,owner}=planned(()=>submitAwait(o,a,wait));
    for(const g of [-1,0,n,n+2,Number.MAX_SAFE_INTEGER,NaN,Infinity,1.5]) {
      if(g===n+1) continue;
      const alter=x=>x===null?null:Object.freeze({...x,generation:g});
      rejected(owner,{...p,registrations:g,liveWait:alter(p.liveWait),retired:alter(p.retired),readiness:alter(p.readiness),timeout:alter(p.timeout)},o);
      historyCases++;
    }
    if(p.liveWait) rejected(owner,{...p,liveWait:{...p.liveWait,deadline:11}},o);
    if(p.retired) {
      rejected(owner,{...p,readiness:null},o);
      rejected(owner,{...p,retired:{...p.retired,deadline:11},timeout:p.timeout===null?null:{...p.timeout,deadline:11}},o);
      rejected(owner,{...p,readiness:{...p.readiness,selector:{...p.readiness.selector}}},o);
    }
    if(n>0 && p.timeout) {
      const old=view(o).retiredWaits.find(w=>w.retiredBy==='deadline');
      rejected(owner,{...p,timeout:{...p.timeout,eventId:old.endingEventId},retired:{...p.retired,endingEventId:old.endingEventId},readiness:{...p.readiness,timeoutEventId:old.endingEventId}},o);
    }
    apply.call(owner,p);acceptedCases++;
    assert.equal(owner.postStateViolation(o.executionId),null);
    const v=view(o), ledger=[...v.retiredWaits,...(v.wait?[v.wait]:[])];
    assert.deepEqual(ledger.map(w=>w.generation),Array.from({length:n+1},(_,i)=>i+1));
    if(mode!=='live') {
      const ready=owner.find(o.executionId).readiness;
      input(o,'unmatched');input(o,'next');
      assert.equal(owner.find(o.executionId).readiness,ready);
      const batch=dispatch(o,2);assert.equal(owner.find(o.executionId).readiness,null);
      assert.ok(batch.batch.includes(v.retiredWaits.at(-1).endingEventId));
      accepted(submitNext(o,batch));
    }
    accepted(o.kernel.cancelExecution(author,o.executionId));
    assert.equal(owner.postStateViolation(o.executionId),null);
    assert.deepEqual(view(o).queued,[]);
  }
  // Six queued entries, a two-entry batch: all 3^6 assignments to acknowledgment/end/omit.
  for(const step of ['complete','fail']) for(let word=0;word<729;word++) {
    const o=created();for(let i=1;i<6;i++)input(o,`s${i}`);
    const a=dispatch(o,2),{p,owner}=planned(()=>submitNext(o,a,step==='complete'?{step,result:true}:{step,error:'x'}));
    let digits=word;const ack=[],end=[];
    for(let i=0;i<6;i++){const digit=digits%3;digits=Math.floor(digits/3);if(digit===1)ack.push(i);if(digit===2)end.push(i);}
    const valid=ack.length===2&&ack[0]===0&&ack[1]===1&&end.length===4&&end[0]===2;
    const varied={...p,acknowledgeAt:ack,endAt:end};partitionCases++;
    if(valid){apply.call(owner,varied);acceptedCases++;assert.equal(owner.postStateViolation(o.executionId),null);assert.deepEqual(view(o).queued,[]);}
    else rejected(owner,varied,o);
  }
  console.log(JSON.stringify({historyLengths:[0,1,2,5,16],modes:['live','event','deadline'],historyCases,partitionCases,refusalCases,acceptedCases,publicPlansWitnessed:plans,failures:0},null,2));
} finally {KernelState.prototype.apply=apply;}
