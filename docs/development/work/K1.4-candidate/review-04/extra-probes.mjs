// Independently authored review-04 probes. Run with Node 26.10+ and the H checkout as argv[2].
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(process.argv[2] ?? process.cwd());
const { startLab, createCommand, dispatchCommand, judge, AnswerContradiction } = await import(pathToFileURL(root + '/tests/conformance/k0-candidate/identity-lab.ts'));
const codes = records => judge({records}).problems.map(p => p.split(':')[0]);
const results = [];
const expect = (name, records, expected) => {
  const result = judge({records});
  assert.deepEqual(result.problems.map(p => p.split(':')[0]), expected, name);
  results.push({name, expected, problems:result.problems, counts:result.counts});
};
// Design check 04's exact swallowed-refusal recipe, generated afresh.
{
  const lab=startLab(); lab.apply(createCommand('x','kx')); lab.apply(dispatchCommand('x'));
  const prefix=[...lab.records]; expect('accepted dispatch neighbor',prefix,[]);
  const refused=lab.attempt(dispatchCommand('x'));
  const inspected=lab.attempt({kind:'inspect',executionId:'x'});
  expect('genuine refused dispatch',[...prefix,refused],['answer']);
  expect('swallowed refused dispatch',[...prefix,{...refused,calls:[...refused.calls,...inspected.calls],observation:inspected.observation,thrown:undefined}],['answer']);
}
// Swap both operation and its genuine final projection, keeping the declared command.
{
  const lab=startLab(); lab.apply(createCommand('x','kx')); lab.apply(dispatchCommand('x'));
  const prefix=[...lab.records];
  const recovered=lab.attempt({kind:'recover',executionId:'x',availableDefinitionRevisions:['identity-lab@1']});
  expect('recover neighbor',[...prefix,recovered],[]);
  expect('takeover replaced by complete recover trace',[...prefix,{...recovered,command:{kind:'takeover',executionId:'x'}}],['call-method']);
}
// Retarget both preliminary argument and its exchange argument. The final view cannot conceal it.
{
  const lab=startLab(); lab.apply(createCommand('x','kx')); lab.apply(createCommand('y','ky'));
  lab.apply(dispatchCommand('x')); lab.apply(dispatchCommand('y'));
  const prefix=[...lab.records];
  const y=prefix.at(-1).view;
  const r=lab.attempt({kind:'takeover',executionId:'x'});
  expect('takeover neighbor',[...prefix,r],[]);
  const calls=r.calls.map((c,i)=>i===0 ? {...c,args:[c.args[0],y.executionId],answer:{ok:true,value:y}} : i===1 ? {...c,args:[c.args[0],y.executionId,{activationId:y.activation.activationId,writerEpoch:y.activation.writerEpoch}]} : c);
  // A foreign preliminary answer selects the one-call early row in B2, so C precedes D.
  expect('preliminary answer and exchange moved together',[...prefix,{...r,calls}],['call-extra']);
  const targetsOnly=calls.map((c,i)=>i===0?{...c,answer:r.calls[0].answer}:c);
  expect('preliminary and exchange targets moved together',[...prefix,{...r,calls:targetsOnly}],['target']);
  // StepRecord.view is only a convenience; altering it must not alter judgment.
  expect('unused view field cannot choose final inspection',[...prefix,{...r,view:y}],[]);
}
// Read-only calls cannot hide after an otherwise valid unknown-reference exit.
{
  const lab=startLab();lab.apply(createCommand('x','kx'));const prefix=[...lab.records];
  const unknown=lab.attempt({kind:'inspect',executionId:'missing'});
  const inspected=lab.attempt({kind:'inspect',executionId:'x'});
  expect('unknown neighbor',[...prefix,unknown],[]);
  expect('read after unknown exit',[...prefix,{...unknown,calls:inspected.calls}],['call-extra']);
}
// A saved real reporting capability invoked before a command has no current delivery.
// Exercise both a normal inspection and the empty unknown-reference row.
for (const unknown of [false,true]) {
  for (const broken of [false,true]) {
    let saved; let armed=false;
    const lab=startLab({tamper:{
      delivery(c){saved=c.recording;c.forward(c.recording);},
      command(c){if(armed&&broken)saved.delivered();return c;},
    }});
    lab.apply(createCommand('x','kx'));lab.apply(dispatchCommand('x'));armed=true;
    lab.attempt({kind:'inspect',executionId:unknown?'missing':'x'});
    expect(`saved callback ${unknown?'unknown':'known'} ${broken?'extra':'neighbor'}`,lab.records,broken?['report-extra']:[]);
    if(broken)assert.deepEqual(lab.records.at(-1).reports.map(r=>[r.owner,r.during,r.inCall]),[[1,null,null]]);
  }
}
// A callback from x during y's delivery: both real capabilities, no forged recorder metadata.
for (const broken of [false,true]) {
  const lab=startLab({tamper:{delivery(c){c.forward(broken&&c.number===2?c.earlier[0]:c.recording);}}});
  lab.apply(createCommand('x','kx'));lab.apply(createCommand('y','ky'));
  lab.apply(dispatchCommand('x'));lab.attempt(dispatchCommand('y'));
  expect(`cross-Execution capability ${broken?'misuse':'neighbor'}`,lab.records,broken?['report-delivery']:[]);
}
// Successful nested redelivery: recording order and restoration are independent of C's rejection.
{
  const lab=startLab({tamper:{delivery(c){
    if(c.number===1)c.coordinator.redeliver(c.calls[0].args[0],c.activation.executionId);
    c.forward(c.recording);
  }}});
  lab.apply(createCommand('x','kx'));const r=lab.attempt(dispatchCommand('x'));
  assert.deepEqual(r.trace,[{kind:'call',index:0},{kind:'delivery',number:1},{kind:'call',index:1},{kind:'delivery',number:2},{kind:'report',index:0},{kind:'report',index:1},{kind:'call',index:2}]);
  assert.deepEqual(r.reports.map(r=>[r.owner,r.during,r.inCall]),[[2,2,1],[1,1,0]]);
  expect('successful reentry still rejected as extra call',lab.records,['call-extra']);
  const next=lab.attempt({kind:'redeliver_dispatch',executionId:'x'});
  assert.deepEqual(next.reports.map(r=>[r.owner,r.during,r.inCall]),[[3,3,0]]);
  results.push({name:'successful nesting and subsequent stacks',trace:r.trace,reports:r.reports,nextReports:next.reports});
}
// Explicit §8 limit witness: five copied scalars and identity lists do not cover recoveryHold.
{
  const lab=startLab();lab.apply(createCommand('x','kx'));const old=lab.apply(dispatchCommand('x'));
  const prefix=[...lab.records];const held=lab.attempt({kind:'recover',executionId:'x',availableDefinitionRevisions:[]});
  assert.notDeepEqual(held.observation.recoveryHold,old.recoveryHold);
  expect('recovery hold honest neighbor',[...prefix,held],[]);
  expect('declared non-identity limit: previous recoveryHold',[...prefix,{...held,observation:old}],[]);
}
console.log(JSON.stringify({subject:'a734d03a9eb352bd29988bff1a68d9d6ca9bb2d3',results},null,2));
