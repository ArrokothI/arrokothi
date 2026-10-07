# Safe-position table audit

This is an audit of design 06 revision 4, not a proposed replacement table. The coarse-rule exit
is required by the credited counterexamples in the parent report. The following separates the
result/argument-admission premise from the stronger no-reachable-write premise.

| Design row, including every named operation | Result and intrinsic-argument admission | No reachable writes / conclusion |
|---|---|---|
| `Object.keys`, `Object.getOwnPropertyNames`, `Reflect.ownKeys` | New arrays of primitive keys, not property values. The admitted intrinsic cannot be returned as an element. Extra arguments are ignored. | Correct for ordinary objects without user-defined internal methods. Arbitrary member values admitted by the detector may involve Proxy internal methods; these rows do not establish a universal absence of callbacks. Runtime controls confirm fresh key arrays on the actual prototype. |
| `Object.isFrozen`, `Object.hasOwn`, `Array.isArray` (remainder of design row 1) | Booleans. None can return/hold an admitted intrinsic argument. | `Array.isArray` does not invoke ordinary coercion hooks. `isFrozen` can invoke Proxy internal methods. `hasOwn` converts its key: the executed ordinary `toString` example mutates that argument. Thus the grouped row's unconditional no-reachable-write justification is false even without a Proxy. |
| `JSON.stringify` | String or `undefined`; first intrinsic argument admitted, replacer/space intrinsic arguments rejected. The returned value cannot hold that intrinsic. | **FAIL:** a local replacer receives the admitted intrinsic as `value` and may store, return or mutate it. A primitive result does not imply non-escape. The real preserved-credit reproduction in `credit.json` proves this is a relevant hole, not merely a theoretical callback concern. |
| `Object.entries`, `Object.values`, `Object.fromEntries`, `Object.create`, `Array.from`, `Array` | New outer objects; entries/values/elements or prototype can retain input values. No intrinsic arguments are admitted, which is necessary and is enforced in the probes. | `entries`/`values` read property values; `fromEntries`/`from` consume iterators, `from` can invoke a mapper, and `create` reads descriptors. Such hooks can write. `Array` itself constructs a fresh array. The whole row cannot support the unconditional no-write claim. |
| `JSON.parse`; `String`, `String.fromCharCode`; `Number`, `Number.isInteger`, `Number.isSafeInteger`, `Number.parseInt`; `Symbol`, `Symbol.for`; `Math.random`, `Math.round`, `Math.min`, `Math.max`, `Math.ceil`; `Date`, `Date.now`; `RegExp`; `Error` | None admits intrinsic arguments. String/number/symbol/math/Date-call results are primitive; `Error` is fresh but can retain `cause`. **`JSON.parse` with a reviver can return an existing object. `RegExp(r)` can return `r`.** Both were executed. | Integer predicates, random, Date-call/now do not need argument coercion callbacks; string/numeric/symbol coercions, reviver, RegExp accessors and Error message/options access can invoke user code. The blanket fresh-or-primitive and no-reachable-write premises are false. The non-fresh ordinary-object results are justification defects, not separately alleged intrinsic-credit misses. |
| `new Array`, `Date`, `RegExp`, `Error`, `TypeError`, `RangeError`, `SyntaxError`, `Map`, `Set`, `WeakMap`, `WeakSet`, `Uint32Array`, `Promise`; `Promise.all`, `Promise.resolve`, `Promise.reject` | No intrinsic argument admitted. Constructors return fresh outer objects, potentially retaining values; error causes, map/set members and promise fulfillment/rejection may retain inputs. `Promise.resolve(p)` can return `p` when its constructor matches. That exception is explicitly acknowledged in the design, and the row really admits **zero** intrinsic argument positions. | Iteration, coercion, executor/thenable callbacks and promise reactions prevent an unconditional no-reachable-write proof. Executed `Promise.all` invokes an input promise's custom `then`, which mutates that input. `Promise.resolve` identity-return was also executed. Intrinsic admission is appropriately conservative, but the group justification is too broad. |
| Three `Number` constants and seven `Symbol` constants named in the design | Primitive number/symbol values, non-writable and non-configurable properties of the original roots. All ten descriptors were checked on Node v26.10.0. | Correct for the original roots; access still depends on establishing root identity. No extra constant or comparison row is proposed. |

**Admission checks:** `probe_extended.py` extracts all 47 prototype call/new rows and tests direct
intrinsic values at argument indices 0, 1 and 2: 141/141 match the declared admission. The source
predicate is `'*'` or index membership, with no other arity-based admission. No declared row with
an admitted intrinsic argument was found to return that argument in its result. The serious flaw
is that `JSON.stringify` hands the intrinsic to a callback despite returning a primitive.
`Promise.resolve(Object.prototype)` is a match; it is not the reproduced miss.

**Evidence:** [runtime assertions](table-runtime.mjs), [their fresh output](table-runtime.json),
[admission and syntax results](extended.json), and [real credit results](credit.json).
Runtime examples establish counterexamples and selected positive controls; they are not a
universal proof over every Proxy, getter, callback or host-modified intrinsic.

Primary specifications consulted on 2026-10-07 (references only, no specification source copied):
[Object.hasOwn](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.hasown),
[JSON callback step](https://tc39.es/ecma262/multipage/structured-data.html#sec-serializejsonproperty),
[JSON reviver result](https://tc39.es/ecma262/multipage/structured-data.html#sec-internalizejsonproperty),
[RegExp constructor](https://tc39.es/ecma262/multipage/text-processing.html#sec-regexp-pattern-flags),
and [Promise.resolve](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.resolve).
The decisive claims are independently executed on the pinned Node version in the attachments.
