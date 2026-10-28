// Review 03: real load-time host-intrinsic fault, and continued calls on its resulting record.
import assert from 'node:assert/strict';
const define=Object.defineProperty;
let point=null, fired=0;
const FAULT=new Error('review-03 injected host fault');
Object.defineProperty=function(target,key,descriptor){
  const v=descriptor.value;
  const hit=point==='exchange' ? v&&typeof v==='object'&&'outcomeReceipt' in v&&'deliveries' in v
    : point==='receipt' ? v&&typeof v==='object'&&v.boundary==='outcome_acceptance'
    : point==='retirement' ? v&&typeof v==='object'&&v.retiredBy==='deadline' : false;
  if(hit && new Error().stack.includes('#applyOutcome')) {point=null;fired++;throw FAULT;}
  return define(target,key,descriptor);
};
const at=p=>import(`${process.cwd()}/${p}`);
const {KernelState}=await at('packages/kernel/src/state.ts');
const {accepted}=await at('packages/kernel/tests/harness.ts');
const {author,created,dispatch,input,submitAwait,submitNext,view,waitOn}=await at('packages/kernel/tests/waits-kit.ts');
Object.defineProperty=define;
const original=KernelState.prototype.apply;
let owner;
KernelState.prototype.apply=function(p){owner=this;return original.call(this,p);};
const rows=[];
try {
  for(const action of ['complete','fail']) for(const repair of ['retry','cancel']) {
    const o=created();input(o,'backlog');const a=dispatch(o,1);
    const next=action==='complete'?{step:action,result:true}:{step:action,error:'failure'};
    point='exchange';assert.throws(()=>submitNext(o,a,next),e=>e===FAULT);assert.equal(point,null);
    assert.match(owner.postStateViolation(o.executionId),/^P5/);
    const before=view(o),version=owner.find(o.executionId).version;
    assert.throws(()=>input(o,'new'),/P5/);assert.deepEqual(view(o),before);
    assert.throws(()=>submitNext(o,a),/P5/);assert.deepEqual(view(o),before);
    assert.equal(owner.find(o.executionId).version,version);
    accepted(repair==='retry'?submitNext(o,a,next):o.kernel.cancelExecution(author,o.executionId));
    assert.equal(owner.postStateViolation(o.executionId),null);
    rows.push({action,point:'exchange',probes:'P5/no mutation',repair,state:view(o).state});
  }
  // A timeout was appended, but its retirement was not; full P detects old damage.
  const o=created(),a=dispatch(o);
  point='retirement';assert.throws(()=>submitAwait(o,a,waitOn('x',0)),e=>e===FAULT);assert.equal(point,null);
  assert.match(owner.postStateViolation(o.executionId),/^P7/);
  const before=view(o),version=owner.find(o.executionId).version;
  assert.throws(()=>input(o,'new'),/P7/);assert.deepEqual(view(o),before);
  assert.equal(owner.find(o.executionId).version,version);
  // Outcome index precedes timeout/retirement: retry is a replay, so it does not run admission or repair P.
  assert.equal(accepted(submitAwait(o,a,waitOn('x',0))).replayed,true);
  assert.deepEqual(view(o),before);assert.match(owner.postStateViolation(o.executionId),/^P7/);
  assert.throws(()=>o.kernel.cancelExecution(author,o.executionId),/P7/);assert.deepEqual(view(o),before);
  rows.push({action:'await',point:'retirement',probes:'input and cancellation P7/no mutation; exact retry replays without repair',limit:'L-28; no automatic repair'});
  console.log(JSON.stringify({fired,rows,failures:0},null,2));
}finally{KernelState.prototype.apply=original;point=null;Object.defineProperty=define;}
