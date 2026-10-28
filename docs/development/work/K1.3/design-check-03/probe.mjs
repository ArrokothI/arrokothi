// Design-check evidence only. Independently written executable thought experiment;
// no production imports and no claim to implement the proposed owner.
// Records are projections to the fields used below, not loadable production plans.
import assert from 'node:assert/strict';
const terminal = s => ['COMPLETED', 'FAILED', 'CANCELLED'].includes(s);
const q = {kind:'queued'};
const ack = activationId => ({kind:'acknowledged', activationId});
const entry = (id, disposition=q) => ({eventId:id, sourceCategory:'application_input', disposition});
const blank = () => ({state:'READY', registrations:0, wait:null, readiness:null, activation:null, cancellation:null, retiredWaits:[], mailbox:[entry('e0'),entry('e1')]});
const declaration = {deadline:5};
const wait = {generation:1, registeredBy:'a1', declaration, deadline:5};
const retirement = {...wait, retiredBy:'deadline', endingEventId:'t1'};
const timeout = {...entry('t1'), sourceCategory:'kernel_timeout', waitGeneration:1, deadline:5};
const readiness = {species:'deadline', generation:1, selector:declaration, timeoutEventId:'t1'};
function overlay(old, delta={}) {
  const {writes=[], appended=[], retired=null, ...fields} = delta;
  const seen = new Set();
  const mailbox = old.mailbox.slice();
  for (const w of writes) {
    const key = String(w.position);
    if (!Object.hasOwn(mailbox,key) || seen.has(key)) throw Error('construction');
    seen.add(key);
    mailbox[w.position] = {...old.mailbox[w.position], disposition:w.disposition};
  }
  return {...old,...fields,mailbox:[...mailbox,...appended],retiredWaits:[...old.retiredWaits,...(retired?[retired]:[])]};
}
function P(n) {
  const errors=[]; const check=(id,yes)=>{if(!yes)errors.push(id);};
  const ts=n.mailbox.filter(e=>e.sourceCategory==='kernel_timeout');
  const ds=n.retiredWaits.filter(w=>w.retiredBy==='deadline');
  const ledger=[...n.retiredWaits,...(n.wait?[n.wait]:[])];
  const match=(w,e)=>w.endingEventId===e.eventId&&w.generation===e.waitGeneration&&w.deadline===e.deadline;
  check('P1',!terminal(n.state)||(!n.mailbox.some(e=>e.disposition.kind==='queued')&&!n.wait&&!n.readiness&&!n.activation));
  check('P2',(n.state==='WAITING')===(n.wait!==null));
  check('P3',(n.state==='RUNNING')===(n.activation!==null));
  check('P4',(n.state==='CANCELLED')===(n.cancellation!==null));
  check('P5',!n.mailbox.some(e=>e.disposition.kind==='terminal')||terminal(n.state));
  check('P6',ledger.length===n.registrations&&ledger.every((w,i)=>w.generation===i+1&&w.deadline===w.declaration.deadline));
  check('P7',ts.length===ds.length&&ds.every(w=>ts.filter(e=>match(w,e)).length===1)&&ts.every(e=>ds.filter(w=>match(w,e)).length===1));
  check('P8',n.retiredWaits.every((w,i)=>w.retiredBy==='cancellation' ? i===n.retiredWaits.length-1&&n.state==='CANCELLED'&&w.endingEventId===null : w.retiredBy==='deadline' ? ts.some(e=>match(w,e)) : n.mailbox.some(e=>e.eventId===w.endingEventId&&e.sourceCategory!=='kernel_timeout')));
  if(n.readiness) {
    const r=n.readiness,w=n.retiredWaits.at(-1),e=n.mailbox.find(e=>e.eventId===w?.endingEventId);
    check('P9',n.state==='READY'&&!!w&&r.generation===w.generation&&r.species===w.retiredBy&&r.selector===w.declaration&&r.timeoutEventId===(w.retiredBy==='deadline'?w.endingEventId:null)&&e?.disposition.kind==='queued');
  }
  return errors;
}
// The four explicitly listed incremental P6 forms, before adding the missing
// new-registration deadline equation. T4's registeredBy check is below.
function incrementalP6(o,n,d) {
  const r=o.registrations,w=n.wait,t=d.retired??null;
  return (w===o.wait&&!t&&n.registrations===r) ||
    (!!o.wait&&!!t&&t.generation===o.wait.generation&&!w&&n.registrations===r) ||
    (!o.wait&&!!t&&t.generation===r+1&&n.registrations===r+1&&!w) ||
    (!o.wait&&!!w&&w.generation===r+1&&n.registrations===r+1&&!t);
}
function T(o,n,d,kind) {
  const errors=[];const check=(id,yes)=>{if(!yes)errors.push(id);};
  const edges={READY:['RUNNING','CANCELLED'],RUNNING:['READY','WAITING','COMPLETED','FAILED','CANCELLED'],WAITING:['READY','CANCELLED']};
  check('T1',!terminal(o.state)&&(o.state===n.state||edges[o.state]?.includes(n.state)));
  const writes=d.writes??[],appended=d.appended??[],t=d.retired??null;
  check('T2',new Set(writes.map(w=>String(w.position))).size===writes.length&&writes.every(w=>o.mailbox[w.position]?.disposition.kind==='queued'&&w.disposition.kind!=='queued')&&appended.every(e=>e.disposition.kind==='queued'));
  // Literal global reading of T3's table sentence; cancellation has its explicit exception.
  const a=writes.filter(w=>w.disposition.kind==='acknowledged');
  const batch=kind==='cancellation'?[]:(o.activation?.batch??[]);
  check('T3',a.length===batch.length&&a.every(w=>batch.includes(o.mailbox[w.position]?.eventId)&&w.disposition.activationId===o.activation?.activationId)&&batch.every(id=>a.some(w=>o.mailbox[w.position]?.eventId===id)));
  if(t&&o.wait)check('T4',['generation','registeredBy','declaration','deadline'].every(k=>t[k]===o.wait[k]));
  if(kind==='outcome'&&!o.wait&&(t||n.wait))check('T4',(t??n.wait).registeredBy===o.activation?.activationId);
  check('T5',n.readiness===null||(o.readiness!==null?n.readiness===o.readiness:t!==null));
  const creates=!o.wait&&(!!n.wait||!!t);
  check('T6',n.registrations===o.registrations+(creates?1:0));
  return errors;
}
const old={...blank(),state:'RUNNING',activation:{activationId:'a1',batch:['e0']}};
const live={state:'WAITING',activation:null,registrations:1,wait,writes:[{position:0,disposition:ack('a1')}]};
assert.deepEqual(P(old),[]);
assert.deepEqual(P(overlay(old,live)),[]);
assert.deepEqual(T(old,overlay(old,live),live,'outcome'),[]);
const wrongDeadline={...live,wait:{...wait,deadline:6}};
assert.equal(incrementalP6(old,overlay(old,wrongDeadline),wrongDeadline),true);
assert.deepEqual(T(old,overlay(old,wrongDeadline),wrongDeadline,'outcome'),[]);
assert.deepEqual(P(overlay(old,wrongDeadline)),['P6']);
const expired={state:'READY',activation:null,registrations:1,wait:null,retired:retirement,readiness,appended:[timeout],writes:live.writes};
assert.deepEqual(P(overlay(old,expired)),[]);
assert.deepEqual(T(old,overlay(old,expired),expired,'outcome'),[]);
const shiftedExpiry={...expired,retired:{...retirement,deadline:6},appended:[{...timeout,deadline:6}]};
assert.equal(incrementalP6(old,overlay(old,shiftedExpiry),shiftedExpiry),true);
assert.deepEqual(T(old,overlay(old,shiftedExpiry),shiftedExpiry,'outcome'),[]);
assert.deepEqual(P(overlay(old,shiftedExpiry)),['P6']);
const missingReadiness={...expired,readiness:null};
assert.deepEqual(P(overlay(old,missingReadiness)),[]);
assert.deepEqual(T(old,overlay(old,missingReadiness),missingReadiness,'outcome'),[]);
const arrival={appended:[entry('e2')]};
assert.deepEqual(P(overlay(old,arrival)),[]);
assert.deepEqual(T(old,overlay(old,arrival),arrival,'input'),['T3']);
const emptyBatch={...blank(),state:'RUNNING',mailbox:[entry('e0',ack('a0'))],activation:{activationId:'a1',batch:[]}};
const redispatch={activation:{activationId:'a2',batch:[]}};
assert.deepEqual(P(emptyBatch),[]);
assert.deepEqual(P(overlay(emptyBatch,redispatch)),[]);
assert.deepEqual(T(emptyBatch,overlay(emptyBatch,redispatch),redispatch,'dispatch'),[]);
// Review-02 same-decision append remains refused by full P, even with old backlog covered.
const terminalTimeout={...expired,state:'COMPLETED',writes:[...live.writes,{position:1,disposition:{kind:'terminal',reason:'complete'}}]};
assert.deepEqual(P(overlay(old,terminalTimeout)),['P1','P9']);
// A whole-record projection check need not establish facts not stated in P/T.
const cancellation={state:'CANCELLED',activation:null,cancellation:{retiredGeneration:999,terminalDispositions:[]},writes:old.mailbox.map((_,position)=>({position,disposition:{kind:'terminal',reason:'cancel'}}))};
assert.deepEqual(P(overlay(old,cancellation)),[]);
assert.deepEqual(T(old,overlay(old,cancellation),cancellation,'cancellation'),[]);
let words=0,covers=0,wholeBatch=0;
function* sequences(max,prefix=[]) {yield prefix;if(prefix.length<max)for(const v of [-1,-0,0,1,2,NaN,Infinity,.5])yield* sequences(max,[...prefix,v]);}
for(const word of sequences(3))for(let split=0;split<=word.length;split++) {
  words++;
  const d={state:'COMPLETED',activation:null,writes:word.map((position,i)=>({position,disposition:i<split?ack('a1'):{kind:'terminal',reason:'complete'}}))};
  try {const n=overlay(old,d);if(P(n).length===0)covers++;if(P(n).length===0&&T(old,n,d,'outcome').length===0)wholeBatch++;}catch(e){assert.equal(e.message,'construction');}
}
assert.deepEqual({words,covers,wholeBatch},{words:2257,covers:12,wholeBatch:2});
console.log(JSON.stringify({
  controls:'genuine live and expired successors satisfy P/T',
  deadlineMismatch:'live and mutually shifted expiry: incremental P6 and T pass; full P refuses P6',
  missingReadiness:'full P and T pass',
  runningInput:'full P passes; literal global T3 refuses',
  runningRedispatch:'full P and T pass on an empty reserved batch',
  terminalTimeout:'full P refuses P1 and P9',
  cancellationMetadata:'full P and T do not validate retiredGeneration or terminalDispositions',
  positionMatrix:{words,exactCovers:covers,wholeBatchAccepted:wholeBatch}
},null,2));
