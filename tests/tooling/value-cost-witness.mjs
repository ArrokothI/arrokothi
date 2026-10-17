// Design 03 assertion witness: source policy + eligible original operands + exact escaping error.
// This preload is test tooling. Test modules receive no new load-time intrinsic reference (D1).
import { writeFileSync, realpathSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { resolve, sep } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { AsyncLocalStorage } from 'node:async_hooks';
import { types } from 'node:util';
import legacyAssert from 'node:assert';
import strictAssert from 'node:assert/strict';
import ts from 'typescript';

const apply = Reflect.apply, keys = Reflect.ownKeys, descriptor = Object.getOwnPropertyDescriptor;
const hasOwn = Object.hasOwn;
// Descriptor records are engine-created own data. Never read an absent inherited field.
const field = (record, key) => hasOwn(record, key) ? record[key] : undefined;
const prototype = Object.getPrototypeOf, is = Object.is, isProxy = types.isProxy, isArray = Array.isArray;
const wmGet = WeakMap.prototype.get, wmSet = WeakMap.prototype.set, wmDelete = WeakMap.prototype.delete;
const wsHas = WeakSet.prototype.has, wsAdd = WeakSet.prototype.add;
const get = (map, key) => apply(wmGet, map, [key]);
const put = (map, key, value) => apply(wmSet, map, [key, value]);
const del = (map, key) => { if ((typeof key === 'object' && key !== null) || typeof key === 'function') apply(wmDelete, map, [key]); };
const ObjectProto = Object.prototype, ArrayProto = Array.prototype, RegExpProto = RegExp.prototype;
const AssertionError = strictAssert.AssertionError;
const nestingGet = AsyncLocalStorage.prototype.getStore, nestingRun = AsyncLocalStorage.prototype.run;
const witnessed = new WeakMap(), wrappers = new WeakMap(), regexps = new WeakMap();
const nesting = new AsyncLocalStorage();
const WITNESS = Symbol.for('arrokothi.value-cost.witness');
const MODULES = Symbol.for('arrokothi.value-cost.modules');
globalThis[WITNESS] = witnessed;
witnessed.sourceOffsets = new Map();
const TEST_SIDE = pathToFileURL(resolve(realpathSync(process.cwd()), 'packages/kernel/tests') + sep).href;
const snapshots = [];
const globals = ['Object','Array','RegExp','Function','String','Number','Boolean','Symbol','BigInt','Error','WeakMap','WeakSet','Reflect'];
const globalDescriptors = globals.map(name => descriptor(globalThis, name));
// Node v26.10.0 assert/comparisons uses these prototype/intrinsic surfaces for this narrow domain.
// Own descriptors are compared without invoking getters; plain operands exclude all exotic brands.
const roots = [Object, Object.prototype, Array, Array.prototype, RegExp, RegExp.prototype,
  Function.prototype, String.prototype, Number.prototype, Boolean.prototype, Symbol.prototype,
  BigInt.prototype, Error, Error.prototype, strictAssert.AssertionError, strictAssert.AssertionError.prototype,
  strictAssert.Assert.prototype, WeakMap.prototype, WeakSet.prototype, legacyAssert, strictAssert];
for (let i = 0; i < roots.length; i++) {
  const target = roots[i], names = keys(target), descriptors = [];
  for (let j = 0; j < names.length; j++) descriptors[j] = descriptor(target, names[j]);
  snapshots[i] = { target, prototype: prototype(target), names, descriptors };
}
function clean() {
  for (let i = 0; i < globals.length; i++) {
    const now = descriptor(globalThis, globals[i]), old = globalDescriptors[i];
    if (!now || !is(field(now, 'value'), field(old, 'value')) || field(now, 'get') !== field(old, 'get') || field(now, 'set') !== field(old, 'set')) return false;
  }
  for (let i = 0; i < snapshots.length; i++) {
    const old = snapshots[i], names = keys(old.target);
    if (prototype(old.target) !== old.prototype || names.length !== old.names.length) return false;
    for (let j = 0; j < names.length; j++) {
      if (names[j] !== old.names[j]) return false;
      const a = descriptor(old.target, names[j]), b = old.descriptors[j];
      if (!a || !is(field(a, 'value'), field(b, 'value')) || field(a, 'get') !== field(b, 'get') || field(a, 'set') !== field(b, 'set') ||
          field(a, 'writable') !== field(b, 'writable') || field(a, 'enumerable') !== field(b, 'enumerable') || field(a, 'configurable') !== field(b, 'configurable')) return false;
    }
  }
  return true;
}
function plain(value) {
  const pending = [value], seen = new WeakSet();
  let count = 0;
  while (pending.length) {
    const value = pending[pending.length - 1]; pending.length--;
    if (++count > 100000) return false;
    if (value === null || (typeof value !== 'object' && typeof value !== 'function')) continue;
    if (typeof value === 'function' || isProxy(value)) return false;
    if (apply(wsHas, seen, [value])) continue;
    apply(wsAdd, seen, [value]);
    const proto = prototype(value);
    if (isArray(value) ? proto !== ArrayProto : proto !== ObjectProto && proto !== null) return false;
    const names = keys(value);
    if (names.length > 100000 - count) return false;
    for (let i = 0; i < names.length; i++) {
      if (typeof names[i] === 'symbol') return false;
      const row = descriptor(value, names[i]);
      if (!row || descriptor(row, 'value') === undefined) return false;
      pending[pending.length] = row.value;
    }
  }
  return true;
}
function eligible(meta, site, args) {
  if (!site || !clean()) return false;
  const message = n => args.length === n || (args.length === n + 1 && typeof args[n] === 'string');
  const name = meta.name;
  if (name === 'fail') return args.length === 0 || (args.length === 1 && typeof args[0] === 'string');
  if (name === 'ok' || (name === 'default' && meta.strict)) return message(1) && typeof args[0] === 'boolean';
  if (name === 'match' || name === 'doesNotMatch') {
    const re = args[1];
    return message(2) && typeof args[0] === 'string' && re !== null && typeof re === 'object' &&
      !isProxy(re) && get(regexps, re) === site.module && prototype(re) === RegExpProto &&
      keys(re).length === 1 && keys(re)[0] === 'lastIndex' && typeof descriptor(re, 'lastIndex')?.value === 'number';
  }
  const equality = name === 'strictEqual' || name === 'notStrictEqual' || name === 'deepStrictEqual' || name === 'notDeepStrictEqual' ||
    (meta.strict && (name === 'equal' || name === 'notEqual' || name === 'deepEqual' || name === 'notDeepEqual'));
  return equality && message(2) && plain(args[0]) && plain(args[1]);
}
// A successful scalar strict comparison cannot supply its own failure. Avoid the expensive
// eligibility snapshot in that case, but still call the original assertion with original operands.
// Any unexpected throw remains uncredited; this fast path never manufactures a witness.
function passingScalar(meta, args) {
  const name = meta.name;
  if ((name === 'ok' || (name === 'default' && meta.strict)) && args[0] === true) return true;
  const primitive = value => value === null || (typeof value !== 'object' && typeof value !== 'function');
  if (!primitive(args[0]) || !primitive(args[1])) return false;
  if (name === 'strictEqual' || (meta.strict && name === 'equal')) return is(args[0], args[1]);
  if (name === 'notStrictEqual' || (meta.strict && name === 'notEqual')) return !is(args[0], args[1]);
  return false;
}
function invoke(meta, site, receiver, args) {
  let admitted = false;
  try { admitted = !apply(nestingGet, nesting, []) && !passingScalar(meta, args) && eligible(meta, site, args); } catch { /* preflight never supplies credit */ }
  return apply(nestingRun, nesting, [true, () => {
    let result;
    try { result = apply(meta.real, receiver, args); }
    catch (error) {
      // Repository-source policy excludes source-built assertion errors. Eligible assertions have
      // no subject callbacks/getters/hooks, and only their own synchronous error can reach here.
      if (admitted && error instanceof AssertionError) put(witnessed, error, {
        kind: 'assert.' + (meta.name === 'default' ? 'ok' : meta.name), module: site.module,
        anchor: { line: site.line, column: site.column, expression: site.expression },
      }); else del(witnessed, error);
      throw error;
    }
    // Async methods are excluded and cannot launder an inner assertion across a callback boundary.
    if (meta.name === 'rejects' || meta.name === 'doesNotReject') return result.then(undefined, error => { del(witnessed, error); throw error; });
    return result;
  }]);
}
function wrap(real, name, strict) {
  const meta = { real, name, strict };
  function wrapped(...args) { return invoke(meta, undefined, this, args); }
  put(wrappers, wrapped, meta);
  return wrapped;
}
function moduleFor(real, strict) {
  const module = wrap(real, 'default', strict);
  const names = keys(real);
  for (let i = 0; i < names.length; i++) {
    const key = names[i], row = descriptor(real, key);
    if (typeof key !== 'string' || !row || !('value' in row) || ['length','name','prototype','strict'].includes(key)) continue;
    const value = row.value;
    module[key] = typeof value === 'function' && !['AssertionError','CallTracker','Assert'].includes(key) ? wrap(value, key, strict) : value;
  }
  return module;
}
const strictModule = moduleFor(strictAssert, true), legacyModule = moduleFor(legacyAssert, false);
strictModule.strict = strictModule; legacyModule.strict = strictModule;
const modules = { 'arrokothi-witness:assert': legacyModule, 'arrokothi-witness:assert/strict': strictModule };
globalThis[MODULES] = modules;
const calls = {
  at(site, fn) { const meta = get(wrappers, fn); return meta ? function(...args) { return invoke(meta, site, this, args); } : fn; },
  regexp(module, value) { put(regexps, value, module); return value; },
};
strictModule.__arrokothiAt = legacyModule.__arrokothiAt = calls.at;
strictModule.__arrokothiRegexp = legacyModule.__arrokothiRegexp = calls.regexp;
const specifiers = new Map([['assert','arrokothi-witness:assert'],['node:assert','arrokothi-witness:assert'],
  ['assert/strict','arrokothi-witness:assert/strict'],['node:assert/strict','arrokothi-witness:assert/strict']]);
function moduleSource(url) {
  const module = modules[url];
  const lines = [`const module = globalThis[Symbol.for('arrokothi.value-cost.modules')][${JSON.stringify(url)}];`, 'export default module;'];
  for (const key of Object.keys(module)) if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) && key !== 'default') lines.push(`export const ${key} = module[${JSON.stringify(key)}];`);
  return lines.join('\n');
}
function instrument(text, url) {
  const ast = ts.createSourceFile(url, text, ts.ScriptTarget.Latest, true);
  if (ast.parseDiagnostics.length) return text; // Original loader owns parse disposition.
  const bindings = new Set(), edits = [];
  for (const statement of ast.statements) if (ts.isImportDeclaration(statement) && specifiers.has(statement.moduleSpecifier.text)) {
    const clause = statement.importClause;
    if (clause?.name) bindings.add(clause.name.text);
    if (clause?.namedBindings) {
      if (ts.isNamespaceImport(clause.namedBindings)) bindings.add(clause.namedBindings.name.text);
      else for (const binding of clause.namedBindings.elements) bindings.add(binding.name.text);
    }
  }
  if (bindings.size === 0) return text;
  if (/__arrokothiWitness(?:At|Regexp)/.test(text)) throw Error('witness injected binding collision');
  function walk(node) {
    if (ts.isCallExpression(node)) {
      let root = node.expression;
      while (ts.isPropertyAccessExpression(root) || ts.isElementAccessExpression(root)) root = root.expression;
      if (ts.isIdentifier(root) && bindings.has(root.text)) {
        const callee = node.expression, start = callee.getStart(ast), where = ast.getLineAndCharacterOfPosition(start);
        const site = {module:url,line:where.line+1,column:where.character+1,expression:callee.getText(ast)};
        edits.push({pos:start,text:`__arrokothiWitnessAt(${JSON.stringify(site)}, `,order:0},{pos:callee.end,text:')',order:0});
      }
    }
    if (ts.isRegularExpressionLiteral(node)) edits.push({pos:node.getStart(ast),text:`__arrokothiWitnessRegexp(${JSON.stringify(url)}, `,order:1},{pos:node.end,text:')',order:1});
    ts.forEachChild(node,walk);
  }
  walk(ast);
  edits.sort((a,b)=>b.pos-a.pos||b.order-a.order);
  for (const edit of edits) text = text.slice(0,edit.pos)+edit.text+text.slice(edit.pos);
  witnessed.sourceOffsets.set(fileURLToPath(url), 1);
  return `import { __arrokothiAt as __arrokothiWitnessAt, __arrokothiRegexp as __arrokothiWitnessRegexp } from 'node:assert/strict';\n` + text;
}
registerHooks({
  resolve(specifier, context, next) {
    const target = specifiers.get(specifier);
    if (target && context.parentURL?.startsWith(TEST_SIDE)) return { url:target,shortCircuit:true };
    return next(specifier,context);
  },
  load(url, context, next) {
    if (Object.hasOwn(modules,url)) return {format:'module',source:moduleSource(url),shortCircuit:true};
    const result = next(url,context);
    if (url.startsWith(TEST_SIDE) && result.source !== null && result.source !== undefined)
      return {...result,source:instrument(typeof result.source === 'string' ? result.source : Buffer.from(result.source).toString('utf8'),url)};
    return result;
  },
});
const loadRecord = process.env.ARROKOTHI_VALUE_COST_LOAD;
process.on('uncaughtExceptionMonitor',(error,origin)=>{
  if (loadRecord === undefined) return;
  try { writeFileSync(loadRecord,JSON.stringify({origin,syntax:error instanceof SyntaxError,name:error?.name??typeof error})); } catch {}
});
