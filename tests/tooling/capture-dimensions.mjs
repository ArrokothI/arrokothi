/** Maintained design-03 bounded search, adapted from review-01/search-dimensions.mjs.
 * Historical report counts are provenance; this run emits its actual counts.
 * Node v26.10.0; args: optional candidate tree, baseline tree (or declared verify input).
 * This is finite evidence, not an exhaustive claim. No candidate file is edited.
 * Real native listings are wrapped before import, then the global slots restored.
 */
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const tree = resolve(process.argv[2] ?? process.cwd());
const baseline = resolve(process.argv[3] ?? process.env.ARROKOTHI_VALUE_COST_BASELINE);
const url = (root, p) => pathToFileURL(resolve(root, p)).href;
const ownNames = Object.getOwnPropertyNames, ownSymbols = Object.getOwnPropertySymbols;
let tracked = new WeakSet(), listingUnits = 0, calls = 0, maxListing = 0;
let forbiddenCalls = 0;
const track = v => { if (v && (typeof v === 'object' || typeof v === 'function')) tracked.add(v); return v; };
for (const [key, native] of [['getOwnPropertyNames', ownNames], ['getOwnPropertySymbols', ownSymbols]]) {
  Object[key] = object => {
    const list = native(object);
    if (tracked.has(object)) { listingUnits += 1 + list.length; calls++; maxListing = Math.max(maxListing, 1 + list.length); }
    return list;
  };
}
let v;
try { v = await import(url(tree, 'packages/kernel/src/values.ts')); }
finally { Object.getOwnPropertyNames = ownNames; Object.getOwnPropertySymbols = ownSymbols; }
// The baseline is a read-only source snapshot (verify's declared input has no node_modules). Import a
// temporary copy of its Kernel source that resolves its one package import through the candidate tree's.
const baselineCopy = mkdtempSync(join(tmpdir(), 'kc3-dimensions-baseline-'));
process.on('exit', () => rmSync(baselineCopy, { recursive: true, force: true }));
cpSync(resolve(baseline, 'packages/kernel/src'), join(baselineCopy, 'src'), { recursive: true });
symlinkSync(resolve(tree, 'node_modules'), join(baselineCopy, 'node_modules'));
const b = await import(pathToFileURL(join(baselineCopy, 'src/values.ts')).href);
const reset = () => { tracked = new WeakSet(); listingUnits = 0; calls = 0; maxListing = 0; forbiddenCalls = 0; };
const B = 3 * 1048576;
let chain = Object.create(null);
for (let i = 0; i < 1000; i++) chain = Object.create(chain);
const prototypes = { plain: Object.prototype, null: null, foreign1: Object.create(null), foreign1000: chain };
const longName = 'a'.repeat(65537);
const plain = shape => track(Object.create(prototypes[shape]));
const wrap = (root, n) => { for (let i = 0; i < n; i++) root = track([root]); return root; };

function leaf(family, shape, root) {
  let x;
  switch (family) {
    case 'symbol': x = plain(shape); x[Symbol('s')] = 1; return x;
    case 'hidden': return Object.defineProperty(plain(shape), 'h', { value: 1 });
    case 'accessor': return Object.defineProperty(plain(shape), 'x', { enumerable: true, get() { forbiddenCalls++; return 1; } });
    case 'undefined': x = plain(shape); x.x = undefined; return x;
    case 'lone-name': x = plain(shape); x['\ud800'] = 0; return x;
    case 'long-name': x = plain(shape); x[longName] = 0; return x;
    case 'array-extra': x = track([0]); x.extra = 1; return x;
    case 'hole': return track(Array(1));
    case 'NaN': return NaN;
    case 'Map': return track(Object.setPrototypeOf(new Map([[1, 2]]), prototypes[shape]));
    case 'proxy': {
      const fail = () => { forbiddenCalls++; throw Error('a Proxy trap ran'); };
      return track(new Proxy({}, { get: fail, getPrototypeOf: fail, ownKeys: fail, getOwnPropertyDescriptor: fail }));
    }
    case 'revoked': { const r = Proxy.revocable([], {}); r.revoke(); return track(r.proxy); }
    case 'cycle': return root;
    default: throw Error(family);
  }
}
function refusedRoot(family, shape, width, wrappers, alias) {
  const root = track([]);
  const a = leaf(family, shape, root), b = leaf(family, shape, root);
  for (let i = 0; i < width; i++) root.push(alias === 'shared' ? a : alias === 'alternating' ? i % 2 ? a : b : leaf(family, shape, root));
  return wrap(root, wrappers);
}

const dimensions = {
  families: ['symbol', 'hidden', 'accessor', 'undefined', 'lone-name', 'long-name', 'array-extra', 'hole', 'NaN', 'Map', 'proxy', 'revoked', 'cycle'],
  prototypes: Object.keys(prototypes), widths: [1, 7, 8, 9, 33, 257, 4096],
  wrappers: [0, 1, 15, 29, 31], aliases: ['shared', 'alternating', 'distinct'],
};
const outcomes = { cases: 0, stops: {}, codes: {}, maxUnits: 0, listingMismatches: [], maxDetails: 0, maxPath: 0, maxMessage: 0 };
for (const family of dimensions.families) for (const shape of dimensions.prototypes)
for (const width of dimensions.widths) for (const wrappers of dimensions.wrappers) for (const alias of dimensions.aliases) {
  // Distinct long names are identical immutable strings, but their objects are distinct.
  reset();
  const input = refusedRoot(family, shape, width, wrappers, alias);
  const { result, work } = v.captureWithWork(input);
  assert.equal(result.ok, false, JSON.stringify({ family, shape, width, wrappers, alias }));
  assert.equal(forbiddenCalls, 0, 'no Proxy trap or accessor call');
  assert.ok(work.units <= B + Math.max(1, maxListing, 131072));
  if (work.listing !== listingUnits) outcomes.listingMismatches.push({ family, shape, width, wrappers, alias, charged: work.listing, actual: listingUnits });
  const details = result.issues.filter(i => i.occurrences === undefined);
  assert.ok(details.length <= 8);
  for (const issue of result.issues) {
    assert.ok(issue.path.length <= 128);
    assert.ok(issue.message.length <= 1024);
    outcomes.codes[issue.code] = (outcomes.codes[issue.code] ?? 0) + 1;
    outcomes.maxPath = Math.max(outcomes.maxPath, issue.path.length);
    outcomes.maxMessage = Math.max(outcomes.maxMessage, issue.message.length);
  }
  outcomes.cases++;
  outcomes.stops[work.stop] = (outcomes.stops[work.stop] ?? 0) + 1;
  outcomes.maxUnits = Math.max(outcomes.maxUnits, work.units);
  outcomes.maxDetails = Math.max(outcomes.maxDetails, details.length);
}

// Accepted values: independent node-cost recurrence plus baseline byte equality.
// Object names count their UTF-16 length; arrays and objects use disjoint own costs.
function expectedUnits(x) {
  if (typeof x === 'string') return 1 + x.length;
  if (x === null || typeof x !== 'object') return 1;
  if (Array.isArray(x)) return 2 * x.length + 4 + x.reduce((s, y) => s + expectedUnits(y), 0);
  return Object.keys(x).reduce((s, k) => s + 3 + k.length + expectedUnits(x[k]), 3);
}
function markGraph(x, seen = new WeakSet()) {
  if (x === null || typeof x !== 'object' || seen.has(x)) return;
  seen.add(x); track(x);
  for (const key of Object.keys(x)) markGraph(x[key], seen);
}
let seed = 0x4b433303;
const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
const scalars = [0, -0, 1, -1, 1e-7, 1e21, Number.MIN_VALUE, Number.MAX_VALUE, true, false, null,
  '', 'ascii', '\n\t\"\\', '\u0000', 'é', '中', '😀', 'e\u0301'];
function generate(depth) {
  const pick = random();
  if (depth === 0 || pick % 3 === 0) return scalars[pick % scalars.length];
  if (pick % 3 === 1) return Array.from({ length: random() % 5 }, () => generate(depth - 1));
  const out = Object.create(pick % 2 ? null : Object.prototype);
  for (let i = 0, n = random() % 5; i < n; i++) out[['', 'é', '😀', '__proto__'][i] + i] = generate(depth - 1);
  return out;
}
const accepted = { cases: 0, maxRatio: 0, maxUnits: 0, costliestWitness: null, baselineComparisons: 0 };
function acceptedCase(input, label) {
  reset(); markGraph(input);
  const { result, work } = v.captureWithWork(input);
  assert.equal(result.ok, true, label);
  assert.equal(work.units, expectedUnits(input), 'independent recurrence');
  assert.equal(work.listing, listingUnits, 'real listings fully charged');
  const bytes = Buffer.byteLength(result.value.canonical, 'utf8');
  assert.equal(bytes, result.value.canonicalBytes);
  assert.ok(work.units <= 3 * bytes && work.units <= B);
  const old = b.canonicalize(input);
  assert.equal(old.ok, true, 'accepted at B');
  assert.equal(old.value.canonical, result.value.canonical, 'unchanged accepted bytes');
  accepted.cases++; accepted.baselineComparisons++;
  accepted.maxRatio = Math.max(accepted.maxRatio, work.units / bytes);
  accepted.maxUnits = Math.max(accepted.maxUnits, work.units);
  return { label, bytes, units: work.units, gapToBudget: B - work.units };
}
for (const scalar of scalars) acceptedCase(scalar, 'scalar');
for (let i = 0; i < 1500; i++) acceptedCase(generate(5), `seeded-${i}`);
for (const width of [0, 1, 8, 9, 4096]) for (const depth of [0, 1, 15, 31]) {
  acceptedCase(wrap(Array(width).fill(0), depth), `array-width-${width}-wrappers-${depth}`);
}
for (const text of ['x'.repeat(65536), '😀'.repeat(65536), '\n'.repeat(65536)]) acceptedCase(text, 'at-limit-string');
const chain30 = wrap(0, 30);
const wide = Array(4096).fill(chain30);
accepted.costliestWitness = acceptedCase([...Array(4).fill(wide), Array(528).fill(chain30)], 'submitted-costliest-witness');
assert.deepEqual(accepted.costliestWitness, { label: 'submitted-costliest-witness', bytes: 1048555, units: 3094930, gapToBudget: 50798 });

// The corpus harness supplies public API schedules with whole-state/refusal checks.
// Inputs and expected first locations/codes are independently selected here.
const { CONSUMERS } = await import(url(tree, 'packages/sdk/tests/capture-corpus.ts'));
let consumerCases = 0;
for (const family of ['symbol', 'accessor', 'proxy', 'Map']) for (const shape of ['plain', 'null'])
for (const width of [8, 9]) for (const wrappers of [0, 14, 29]) for (const alias of ['shared', 'distinct']) {
  reset();
  const root = refusedRoot(family, shape, width, wrappers, alias);
  const code = family === 'proxy' || family === 'Map' ? 'unsupported_form' : 'unrepresentable_member';
  const path = '[0]'.repeat(wrappers + 1) + (family === 'accessor' ? '.x' : '');
  for (const consumer of CONSUMERS) {
    consumer.run(root, path, code, null);
    assert.equal(forbiddenCalls, 0);
    consumerCases++;
  }
}
console.log(JSON.stringify({ node: process.version, tree, baseline, initialSeed: '0x4b433303', dimensions, outcomes, accepted,
  publicConsumers: CONSUMERS.map(c => c.name), consumerCases,
  limits: ['Finite deterministic slices; not all cross-products of all engine objects.',
    'Listing instrumentation observes real native returned lengths, not engine-internal work.',
    'No physical isolation, live providers, native-addon External, or wall-time guarantee.',
    'Near-budget mixed-family alignments are in probe-stop-boundary.mjs.'] }, null, 2));
assert.equal(outcomes.listingMismatches.length, 0, 'no additional listing mismatch in the declared ordinary slices');
