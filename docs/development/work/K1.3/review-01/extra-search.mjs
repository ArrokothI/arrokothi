// Independent reviewer assertions over K13-9's declared words; does not alter candidate plans/state.
// Run from the candidate repository root with Node 26.10.0 and --experimental-strip-types.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const atRoot = p => import(pathToFileURL(`${process.cwd()}/${p}`).href);
const { ExecutionCoordinator } = await atRoot('packages/kernel/src/index.ts');
const { SEEDS, runWord } = await atRoot('packages/kernel/tests/race-search/harness.ts');
const { ALPHABET } = await atRoot('packages/kernel/tests/race-search/model.ts');
const plain = x => JSON.stringify(x);
const eq = (a,b,label) => { if (plain(a)!==plain(b)) throw new Error(`${label}: ${plain(a)} != ${plain(b)}`); };
function check(v) {
  eq(v.acceptedProgress, v.progressRevision === 0 ? null : {phase:'x'}, 'accepted progress content');
  eq([v.scope,v.creationKey,v.definitionRevision,v.runtimeContractRevision,v.progressCodec,v.authorityContext], ['tenant','search','d@1','r@1','c@1',null], 'immutable creation facts');
  eq(v.emissions, [], 'no emissions proposed');
  eq(v.recoveryHolds, [], 'no recovery holds proposed');
  eq(v.recoveryHistory, [], 'no recovery control proposed');
  for (const [field,kind] of [['queued','queued'],['acknowledged','acknowledged'],['terminalDispositions','terminal']]) {
    eq(v[field], v.mailbox.filter(e=>e.disposition.kind===kind).map(e=>e.eventId), `mailbox ${field} projection`);
  }
  if (v.result !== null) {
    eq([v.state,v.result.kind,v.result.value],['COMPLETED','completed',true], 'terminal result content');
    eq(v.result.activationId,v.exchanges.at(-1).activationId, 'terminal result causation');
  }
}
// Show these extra assertions actually reject corruption that the maintained projection omits.
const good = {acceptedProgress:{phase:'x'}, progressRevision:1, scope:'tenant',creationKey:'search',definitionRevision:'d@1',runtimeContractRevision:'r@1',progressCodec:'c@1',authorityContext:null,emissions:[],recoveryHolds:[],recoveryHistory:[],queued:[],acknowledged:[],terminalDispositions:[],mailbox:[],result:null};
check(good);
assert.throws(()=>check({...good,acceptedProgress:null}),/accepted progress content/);
assert.throws(()=>check({...good,authorityContext:{changed:true}}),/immutable creation facts/);
let snapshots=0, timerListings=0, terminalChecks=0, runs=0;
let context='';
const terminal = new WeakMap();
const ids = new WeakMap();
const inspect = ExecutionCoordinator.prototype.inspect;
const pending = ExecutionCoordinator.prototype.pendingTimers;
function frozenLogical(v) {
  const {refusals, losingOutcomes, timerFires, ...rest} = v;
  return plain({...rest, exchanges:rest.exchanges.map(({deliveries,...e})=>e), cancellation:rest.cancellation===null ? null : (({deliveries,...c})=>c)(rest.cancellation)});
}
ExecutionCoordinator.prototype.inspect = function(...args) {
  const answer = Reflect.apply(inspect,this,args);
  if (answer.ok) {
    const v=answer.value; snapshots++; ids.set(this,v.executionId); check(v);
    if (terminal.has(this)) {
      terminalChecks++; eq(frozenLogical(v),terminal.get(this),'logical state changed after termination');
    } else if (['CANCELLED','COMPLETED','FAILED'].includes(v.state)) terminal.set(this,frozenLogical(v));
  }
  return answer;
};
ExecutionCoordinator.prototype.pendingTimers = function(...args) {
  const list = Reflect.apply(pending,this,args); timerListings++;
  for (const timer of list) eq(timer.executionId,ids.get(this),'pending timer Execution identity');
  return list;
};
try {
  const word=new Array(4);
  for (const seed of SEEDS) for (const bound of [1,2]) {
    const visit = depth => {
      if (depth===4) {
        context=`${seed.name}/B${bound}: ${word.join('')}`;
        const result=runWord(seed,word,bound);
        if (result.failure!==null) throw new Error(result.failure);
        runs++; return;
      }
      for (const letter of ALPHABET) {word[depth]=letter; visit(depth+1);}
    };
    visit(0);
  }
  eq(runs,456976,'declared run count');
  console.log(JSON.stringify({runs,depth:4,alphabet:ALPHABET,seeds:SEEDS.length,bounds:[1,2],snapshots,timerListings,terminalChecks,negativeControls:2,failures:0}));
} catch(error) {
  console.error(context, error); process.exitCode=1;
} finally {
  ExecutionCoordinator.prototype.inspect=inspect;
  ExecutionCoordinator.prototype.pendingTimers=pending;
}
