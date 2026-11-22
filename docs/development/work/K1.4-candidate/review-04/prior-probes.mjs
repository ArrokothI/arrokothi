// Review 04: review-03 probes from 3e86a8c0, with corrected expectations only.
// All records below come from real public calls in H's recording lab. Splicing models the
// indicated adapter mistake; it is NOT an allegation that H's adapter or Kernel makes it.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root=resolve(process.argv[2]??process.cwd());
const {startLab,createCommand,dispatchCommand,registerWait,timerCommand,Oracle}=await import(pathToFileURL(root+'/tests/conformance/k0-candidate/identity-lab.ts'));
const check=records=>{const o=new Oracle();for(const r of records)o.check(r);return {problems:o.problems,counts:o.counts};};
const report=(name,honest,wrong,detail)=>{
  const control=check(honest), mutant=check(wrong);
  assert.deepEqual(control.problems,[],'the honest control passes');
  const expected = {'dispatch-x-observe-y':'inspection','wrong-primary-method':'call-method','extra-cancellation-after-dispatch':'call-extra','extra-cancellation-before-declared-throw':'call-extra'}[name];
  assert.deepEqual(mutant.problems.map(p=>p.split(':')[0]),[expected]);
  console.log(JSON.stringify({case:name,control,mutant,...detail}));
};
{
  const l=startLab();l.apply(createCommand('x','kx'));l.apply(createCommand('y','ky'));
  l.apply(dispatchCommand('y'));const prefix=[...l.records];
  l.apply(dispatchCommand('x'));const x=l.records.at(-1);
  l.apply({kind:'inspect',executionId:'y'});const y=l.records.at(-1);
  assert.notEqual(x.view.executionId,y.view.executionId);
  const wrong={...x,calls:[...x.calls.filter(c=>c.method!=='inspect'),...y.calls],view:y.view,observation:y.observation};
  const honest=prefix.concat(x), bad=prefix.concat(wrong);
  report('dispatch-x-observe-y',honest,bad,{primaryTarget:x.view.executionId,inspectionTarget:y.view.executionId,expectedShown:'x',actualShown:wrong.observation.executionId});
}
{
  const l=startLab();l.apply(createCommand('x','kx'));const prefix=[...l.records];
  l.apply(dispatchCommand('x'));const dispatched=l.records.at(-1);
  l.apply({kind:'accept_cancellation',executionId:'x'});const cancelled=l.records.at(-1);
  const wrong={...cancelled,command:dispatchCommand('x')};
  report('wrong-primary-method',prefix.concat(dispatched),prefix.concat(wrong),{command:'dispatch',actualPrimary:wrong.calls[0].method,actualState:wrong.observation.state});
  const extra={...dispatched,calls:[...dispatched.calls.filter(c=>c.method!=='inspect'),...cancelled.calls],view:cancelled.view,observation:cancelled.observation};
  report('extra-cancellation-after-dispatch',prefix.concat(dispatched),prefix.concat(extra),{calls:extra.calls.map(c=>c.method),actualState:extra.observation.state});
}
{
  let inject=false;
  const l=startLab({faults:{answer(method,args,answer){
    if(inject&&method==='fireTimer')return {...answer,timeoutEventId:'absent'};
    return answer;
  }}});
  l.apply(createCommand('x','kx'));registerWait(l,'x','g',10);l.apply(timerCommand('x','g','t'));
  const prefix=[...l.records];inject=true;
  const contradiction=l.attempt(timerCommand('x','g','t'));
  assert.equal(contradiction.thrown.code,'timeout_generation');
  l.apply({kind:'accept_cancellation',executionId:'x'});const cancelled=l.records.at(-1);
  const wrong={...contradiction,calls:[...contradiction.calls,...cancelled.calls],view:cancelled.view};
  report('extra-cancellation-before-declared-throw',prefix.concat(contradiction),prefix.concat(wrong),{calls:wrong.calls.map(c=>c.method),honestState:contradiction.view.state,mutantState:wrong.view.state,thrown:wrong.thrown.code});
}
