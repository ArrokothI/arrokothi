// Extend DA01-R3-HOP-01's access-form matrix to a zone global outside the serializer eight.
import vm from 'node:vm';
const [name, form, pin] = process.argv.slice(2);
if (!['Map', 'Reflect'].includes(name) || !['assign', 'define', 'declare', 'preexisting'].includes(form)
    || !['full', 'writableOnly'].includes(pin)) throw new Error('Invalid form case');
const saved = { stringify: JSON.stringify, define: Object.defineProperty,
  descriptor: Object.getOwnPropertyDescriptor, original: globalThis[name] };
globalThis.packetReplacement = { marker: 'replacement' };
if (form === 'preexisting') vm.runInThisContext(`let ${name} = globalThis.packetReplacement;`);
saved.define(globalThis, name, { value: saved.original, writable: false, configurable: pin !== 'full' });
let attempt = 'none';
try {
  if (form === 'assign') { globalThis[name] = globalThis.packetReplacement; attempt = 'assigned'; }
  if (form === 'define') { saved.define(globalThis, name, { value: globalThis.packetReplacement }); attempt = 'defined'; }
  if (form === 'declare') { vm.runInThisContext(`let ${name} = globalThis.packetReplacement;`); attempt = 'declared'; }
} catch (error) { attempt = error.name; }
const descriptor = saved.descriptor(globalThis, name);
console.log(saved.stringify({ name, form, pin, attempt,
  propertyUnchanged: globalThis[name] === saved.original,
  nameResolutionUnchanged: vm.runInThisContext(name) === saved.original,
  writable: descriptor.writable, configurable: descriptor.configurable }));
