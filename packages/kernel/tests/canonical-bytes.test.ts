import assert from "node:assert/strict";
import { test } from "node:test";
import { BOUNDARY_LIMITS, validateCanonicalBytes } from "../src/index.ts";
import { acceptCanonicalBytes } from "../src/values.ts";
import { canonicalizeJsonText } from "../src/json-transport.ts";
import { canonicalize } from "../../sdk/src/internal/value-capture.ts";
const bytes = (text: string) => new TextEncoder().encode(text);
const accepted = (text: string) => {
  const result = acceptCanonicalBytes(bytes(text));
  assert.ok(result.ok, text.slice(0, 120));
  assert.equal(result.value.canonical, text);
  assert.deepEqual(result.value.bytes, bytes(text));
  return result.value.value;
};
const refused = (input: string | Uint8Array, code?: string) => {
  const result = validateCanonicalBytes(typeof input === "string" ? bytes(input) : input);
  assert.equal(result.ok, false);
  if (!result.ok && code !== undefined) assert.equal(result.issues[0]?.code, code);
};

test("B1-1 copy exact views and expose only deeply frozen parsed content", () => {
  const full = bytes('x{"a":[1,"😀"]}y');
  const result = validateCanonicalBytes(full.subarray(1, full.length - 1));
  assert.ok(result.ok);
  full.fill(0);
  assert.deepEqual(result.value, { a: [1, "😀"] });
  assert.ok(Object.isFrozen(result.value));
  assert.ok(Object.isFrozen((result.value as { a: unknown }).a));
  assert.throws(() => { (result.value as { a: unknown }).a = 2; });
  assert.deepEqual(accepted('{"__proto__":1,"constructor":2}'), JSON.parse('{"__proto__":1,"constructor":2}'));
  assert.ok(validateCanonicalBytes(Buffer.from('[1]')).ok);
});

test("B1-1 native byte brand/copy ignores caller properties and rejects unstable storage", () => {
  let calls = 0;
  const source = bytes('1');
  for (const key of ['buffer', 'length', 'byteLength', 'byteOffset', 'constructor', 'slice']) Object.defineProperty(source, key, { get() { calls++; throw new Error('caller property'); } });
  Object.defineProperty(source, Symbol.iterator, { get() { calls++; throw new Error('iterator'); } });
  assert.ok(validateCanonicalBytes(source).ok);
  assert.equal(calls, 0);
  for (const input of [[], {}, '1', 1, null, new Uint16Array([49]), new DataView(new ArrayBuffer(1)), new Proxy(bytes('1'), {})]) { const result = validateCanonicalBytes(input as never); assert.equal(result.ok, false); if (!result.ok) assert.equal(result.issues[0]?.code, 'unsupported_form'); }
  refused(new Uint8Array(new SharedArrayBuffer(1)), 'unsupported_form');
  const detached = bytes('1'); structuredClone(detached, { transfer: [detached.buffer] });
  refused(detached, 'unstable_representation');
  refused(new Uint8Array(), 'invalid_json');
});

const invalidText: readonly [string, string][] = [
  ['\ufeff0','invalid_json'], ['{"a":1,"a":2}','duplicate_key'], ['{"a":1,"\\u0061":2}','duplicate_key'],
  ['{"b":2,"a":1}','non_canonical'], ['{"2":2,"10":1}','non_canonical'],
  [' 0','non_canonical'], ['0\n','non_canonical'], ['[0, 1]','non_canonical'],
  ['"\\/"','non_canonical'], ['"\\u0061"','non_canonical'], ['"\\u000A"','non_canonical'],
  ['"\\ud83d\\ude00"','non_canonical'], ['"\\ud800"','lone_surrogate'], ['"\\udc00"','lone_surrogate'],
  ['-0','non_canonical'], ['1.0','non_canonical'], ['1e0','non_canonical'], ['1E+21','non_canonical'],
  ['1e21','non_canonical'], ['1e-07','non_canonical'], ['1e-999','non_canonical'], ['9007199254740993','non_canonical'],
  ['1e400','non_finite_number'], ['01','invalid_json'], ['+1','invalid_json'], ['.1','invalid_json'], ['1.','invalid_json'],
  ['1e','invalid_json'], ['1e+','invalid_json'], ['[0,]','invalid_json'], ['{"a":1,}','invalid_json'],
  ['null false','invalid_json'], ['/*x*/0','invalid_json'], ['"\n"','invalid_json'], ['"\\x00"','invalid_json'],
  ['[','invalid_json'], ['{"a":','invalid_json'], ['"','invalid_json'], ['', 'invalid_json'],
];
for (const [text, code] of invalidText) test(`B1-3 reject ${JSON.stringify(text)}`, () => refused(text, code));
for (const input of [[0xff],[0x80],[0xc0,0x80],[0xc2],[0xe0,0x80,0x80],[0xed,0xa0,0x80],[0xf0,0x80,0x80,0x80],[0xf4,0x90,0x80,0x80],[0xf5,0x80,0x80,0x80]]) {
  test(`B1-3 fatal UTF-8 ${input.join(',')}`, () => refused(new Uint8Array(input), 'invalid_utf8'));
}

test("B1-3 cap minus one, cap, cap plus one for strings, names, arrays, objects and depth", () => {
  for (const delta of [-1,0,1]) {
    for (const unit of ['x','😀']) for (const name of [false,true]) {
      const text = unit.repeat(BOUNDARY_LIMITS.stringScalarValues + delta);
      const encoded = name ? '{' + JSON.stringify(text) + ':0}' : JSON.stringify(text);
      if (delta <= 0) accepted(encoded); else refused(encoded, 'string_too_long');
    }
    const length = BOUNDARY_LIMITS.containerEntries + delta;
    const array = '[' + Array(length).fill('0').join(',') + ']';
    const object = '{' + Array.from({ length }, (_, i) => `"k${String(i).padStart(4,'0')}":0`).join(',') + '}';
    const depth = '['.repeat(32 + delta) + ']'.repeat(32 + delta);
    for (const text of [array, object]) if (delta <= 0) accepted(text); else refused(text, 'too_many_entries');
    if (delta <= 0) accepted(depth); else refused(depth, 'too_deep');
    const strings = [...Array(15).fill('x'.repeat(65536)), 'x'.repeat(65487 + delta)];
    const sized = JSON.stringify(strings);
    assert.equal(bytes(sized).length, BOUNDARY_LIMITS.canonicalBytes + delta);
    if (delta <= 0) accepted(sized); else refused(sized, 'too_many_bytes');
  }
});

test("B1-2 fixed number/key/escape golden vectors remain identical to the unchanged wrapper", () => {
  for (const input of [0,-0,1,-1,1e-7,1e-6,1e20,1e21,Number.MIN_VALUE,Number.MAX_VALUE,333333333.33333329,
    9007199254740992,2.2250738585072014e-308,1.7976931348623157e308,'\u0000\b\t\n\f\r"\\/é中😀',
    { '2': 2, '10': 1, '\uffff': 3, '😀': 4, '\u0000': 5 }, [null,true,false]]) {
    const wrapped = canonicalize(input); assert.ok(wrapped.ok);
    accepted(wrapped.value.canonical);
  }
});

test("transport bounds before decoding, refuses decoded duplicates, and revalidates canonical output", () => {
  const output = canonicalizeJsonText(bytes(' { "b": 2, "a": [1.0, "\\u0061"] } '));
  assert.ok(output.ok);
  assert.equal(new TextDecoder().decode(output.value), '{"a":[1,"a"],"b":2}');
  assert.ok(validateCanonicalBytes(output.value).ok);
  for (const text of ['{"x":1,"\\u0078":2}', '"\\ud800"', '1e400']) assert.equal(canonicalizeJsonText(bytes(text)).ok, false);
  for (const cap of [-1,Infinity,1.5,8388609]) assert.equal(canonicalizeJsonText(bytes('0'), cap).ok, false);
  for (const delta of [-1,0,1]) {
    const input = bytes('0' + ' '.repeat(8_388_607 + delta));
    const result = canonicalizeJsonText(input);
    assert.equal(result.ok, delta <= 0);
    if (!result.ok) assert.equal(result.issues[0]?.code, 'transport_too_large');
  }
});
