/** Maintained invalidation-03 form × pin witness. All modules load before the attempted hop. */
import vm from 'node:vm';
import jcs from 'canonicalize';
import assert from 'node:assert/strict';
import { canonicalize } from '../../sdk/src/internal/value-capture.ts';
import { ExecutionCoordinator, validateCanonicalBytes } from '../src/index.ts';
const [name='JSON', form='declare', pin='full'] = process.argv.slice(2);
const host = globalThis as unknown as Record<string, unknown>;
const saved = host[name];
const define = Object.defineProperty;
const getDescriptor = Object.getOwnPropertyDescriptor;
const stringify = JSON.stringify;
const expected = '{"a":[1,"x"],"b":2}';
const one = Buffer.from(expected), two = Buffer.from('{"a":[3,"x"],"b":7}');
const fakeSource: Record<string,string> = {
  JSON: "((stringify) => ({ stringify: value => typeof value === 'number' ? '999' : stringify(value) }))(globalThis.JSON.stringify)",
  Object: "((keys) => ({ keys: value => keys(value).filter(key => key !== 'b') }))(globalThis.Object.keys)",
  Array: "({ isArray: () => false })",
};
assert.ok(fakeSource[name]);
let attempt = 'none';
if (form === 'preexisting') vm.runInThisContext(`let ${name} = ${fakeSource[name]};`);
define(globalThis, name, { value:saved, writable:false, configurable:pin !== 'full' });
const descriptor = getDescriptor(globalThis, name)!;
// A descriptor-only startup check cannot see an existing global lexical binding.
assert.equal(descriptor.value, saved); assert.equal(descriptor.writable, false);
try {
  if (form === 'assign') { host[name] = vm.runInThisContext(fakeSource[name]!); attempt = 'assigned'; }
  else if (form === 'define') { define(globalThis,name,{value:vm.runInThisContext(fakeSource[name]!)}); attempt = 'defined'; }
  else if (form === 'declare') { vm.runInThisContext(`let ${name} = ${fakeSource[name]};`); attempt = 'declared'; }
} catch (error) { attempt = (error as Error).name; }
const steered = form === 'preexisting' || ((form === 'declare' || form === 'define') && pin === 'writableOnly');
const wrapper = canonicalize({ b:2, a:[1,'x'] });
// Pinning prevents the unchanged wrapper from installing its temporary serializer environment.
assert.equal(wrapper.ok, false, stringify(wrapper));
if (!wrapper.ok) assert.deepEqual(wrapper.issues, [{ path:'', code:'unstable_representation', message:"serializing the accepted snapshot failed; the serializer execution environment was disturbed while observing the caller's value" }]);
// The dependency still resolves free names through the pinned/lexical host environment.
assert.equal(jcs({ b:2, a:[1,'x'] }) !== expected, steered);
const parsed = validateCanonicalBytes(one);
assert.equal(parsed.ok,true);
if (parsed.ok) assert.equal(stringify(parsed.value),expected);
const caller = { namespace:'pins', scopes:['scope'], controlScopes:['scope'] };
const kernel = new ExecutionCoordinator({ driver:{driverId:'pins',deliver(_activation,settlement){settlement.delivered();}} });
const request = (payload:Uint8Array) => ({creationKey:'key',scope:'scope',definitionRevision:'def',runtimeContractRevision:'runtime',progressCodec:'codec',authorityContext:one,initialInput:{kind:'kind',payload}});
const created=kernel.createExecution(caller,request(one));
const replay=kernel.createExecution(caller,request(one));
const conflict=kernel.createExecution(caller,request(two));
assert.equal(created.ok,true); assert.equal(replay.ok,true); assert.equal(conflict.ok,false);
if(created.ok&&replay.ok)assert.equal(replay.value.receipt.position,created.value.receipt.position);
if(!conflict.ok)assert.equal(conflict.error.classification,'duplicate_conflict');
process.stdout.write(stringify({name,form,pin,attempt,wrapper:'unstable_representation',serializerSteered:steered,core:'correct'})+'\n');
