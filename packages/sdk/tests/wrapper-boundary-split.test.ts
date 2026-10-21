/** Wrapper-only historical consumer cases, split under the owner's migration-question-01 ruling.
 * No rejected object is submitted to a Kernel. byte-consumers.test.ts covers malformed-byte atomicity.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canonicalize, boundaryValueIssues } from '../src/internal/value-capture.ts';
import { inWrappedChild } from './capture-instruments.ts';
function assertExtraMember(value: unknown[]) {
  Object.defineProperty(value,'01',{value:99,writable:true,enumerable:true,configurable:true});
  assert.equal(boundaryValueIssues(value)[0]?.code,'unrepresentable_member');
}
function assertDisagreement(object: boolean) {
  const observed = inWrappedChild<any>(`
    const object = ${object};
    const value=track(object ? {tenant:'b'} : [2]); let observations=0;
    hooks.descriptor=(target,key,real)=>{if(target===value && key===(object?'tenant':'0')) { observations++; return {value:object?'a':1,writable:true,enumerable:true,configurable:true}; } return real;};
    const result=values.canonicalize(value);
    emit({result,observations,read:object?value.tenant:value[0]});
  `);
  assert.equal(observed.observations,1); assert.equal(observed.read,object?'b':2);
  assert.equal(observed.result.ok,false);
  assert.equal(observed.result.issues[0].code,'unstable_representation');
  assert.equal(observed.result.issues[0].path,object?'tenant':'[0]');
}

test("SDK split: K11-R5-VAL-03 creation refuses a foreign-prototype payload while the live Object binding is swapped", () => {

  const RealObject = Object;
  const Fake = function Fake() {};
  const value = RealObject.create(Fake.prototype); value.a = 1;
  let result;
  try { globalThis.Object = Fake as never; result = canonicalize(value); }
  finally { globalThis.Object = RealObject; }
  assert.equal(result.ok,false);
  if (!result.ok) assert.deepEqual(result.issues,[{path:'',code:'unsupported_form',message:'expected a plain object, received object'}]);
 
});

test("SDK split: K11-R2-VAL-02 a payload whose own data and property reads disagree is refused at creation", () => {
assertDisagreement(false); assertDisagreement(true);
});

test("SDK split: K11-R1-VAL-01 an array carrying own non-index member 01 is refused at creation", () => {
assertExtraMember([1,2]);
});

test("SDK split: a payload whose observation throws under the get/set it installed is refused, never accepted or leaked", () => {

  const observed = inWrappedChild<any>(`
    const value = track({ text: 'report' }); let installed=false, hostile=false;
    hooks.prototype = (target, real) => { if (target === value) { installed=true; Object.prototype.get=1; Object.prototype.set=()=>{};
      try { Object.defineProperty([], '0', {value:1}); } catch { hostile=true; } } return real; };
    hooks.descriptor = (target,key,real) => { if(target === value) throw new TypeError('injected'); return real; };
    let result; try { result=values.canonicalize(value); } finally { delete Object.prototype.get; delete Object.prototype.set; }
    emit({installed,hostile,result});
  `);
  assert.equal(observed.installed,true); assert.equal(observed.hostile,true);
  assert.equal(observed.result.ok,false); assert.equal(observed.result.issues[0].code,'unstable_representation');
 
});

test("SDK split: input that is not a boundary value is refused and queues nothing", () => {
assert.equal(boundaryValueIssues({when:new Date(0)})[0]?.code,'unsupported_form');
});

test("SDK split: K11-R2-VAL-02 a payload whose own data and property reads disagree is refused at ingress", () => {

  assertDisagreement(false);
  const hollow: unknown[]=[]; hollow.length=1;
  const saved=Object.getOwnPropertyDescriptor(Array.prototype,'0');
  let issues;
  try { Object.defineProperty(Array.prototype,'0',{value:7,writable:true,configurable:true}); assert.equal(hollow[0],7); issues=boundaryValueIssues(hollow); }
  finally { if(saved) Object.defineProperty(Array.prototype,'0',saved); else delete (Array.prototype as any)[0]; }
  assert.equal(issues[0]?.code,'undefined_member'); assert.equal(issues[0]?.path,'[0]');
 
});

test("SDK split: K11-R1-VAL-01 an array with own 01 is refused at ingress and queues nothing", () => {
assertExtraMember([1]);
});

test("SDK split: K11-R2-VAL-02 a payload with no single reading never reaches a Driver", () => {
assertDisagreement(false);
});
