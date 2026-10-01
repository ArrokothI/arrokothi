// Reviewer feasibility probe (not a design): under `node --frozen-intrinsics`, can caller code
// still change what an ordinary property read of a plain object/array consults on the prototype?
'use strict';
const out = {};
const attempt = (name, fn) => { try { fn(); out[name] = 'mutation-succeeded'; } catch (e) { out[name] = 'threw ' + e.constructor.name; } };
attempt('Object.prototype.toJSON =', () => { Object.prototype.toJSON = () => 'x'; });
attempt('Array.prototype[0] accessor', () => { Object.defineProperty(Array.prototype, '0', { get() { return 9; } }); });
attempt('ArrayIteratorPrototype.next =', () => { Object.getPrototypeOf([][Symbol.iterator]()).next = () => ({ done: true }); });
attempt('Object.keys =', () => { Object.keys = () => []; });
attempt('Promise[Symbol.species]', () => { Object.defineProperty(Promise, Symbol.species, { get() { return Object; } }); });
out['JSON.stringify([1,{a:2}])'] = JSON.stringify([1, { a: 2 }]);
out['Proxy still constructible'] = typeof new Proxy({}, {}) === 'object';
out['Object.isFrozen(Object.prototype)'] = Object.isFrozen(Object.prototype);
console.log(JSON.stringify({ node: process.version, execArgv: process.execArgv, out }, null, 1));
