// TOOLS-01 read trace (design 05 §2.3 rule 5). Loaded only through
// NODE_OPTIONS=--import=<absolute path> for the reads phase, never in a verdict run.
// It records the path argument of fs read, list, stat and existence calls; it changes no result.
// A listing called with a truthy `recursive` option is marked `recursive` (TOOLS-02 design 04 §1).
// Each row also keeps what admission needs before anything is normalized (TOOLS-02 design 05 §7): the first
// argument's form, a path's original text and the call-time working directory, the second argument's form,
// and an options object's own keys and prototype (design 05 §8.2, rule O).
// Limits: processes that drop NODE_OPTIONS, reads outside fs and reads by native code are unseen.
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const destination = process.env.ARROKOTHI_READ_TRACE;
if (typeof destination !== 'string' || !path.isAbsolute(destination)) {
  throw new Error('read-trace: ARROKOTHI_READ_TRACE must name an absolute file');
}
const append = fs.appendFileSync;
const resolve = path.resolve;
const cwd = process.cwd;
const getPrototypeOf = Object.getPrototypeOf;
const objectPrototype = Object.prototype;
let busy = false;

function pathText(target) {
  if (typeof target === 'string') return target;
  if (target instanceof URL) return target.protocol === 'file:' ? fileURLToPath(target) : null;
  if (Buffer.isBuffer(target)) return target.toString();
  return null;
}

const LISTING = /(?:^|\.)(?:readdir|opendir)(?:Sync)?(?:\.native)?$/;

function argumentForm(target, text) {
  if (text !== null) return 'path';
  if (target instanceof URL) return 'url';
  if (typeof target === 'number') return 'fd';
  if (target === null) return 'null';
  if (Array.isArray(target)) return 'array';
  if (typeof target === 'object' && typeof target.fd === 'number' && typeof target.close === 'function') {
    return 'filehandle';
  }
  return typeof target;
}

function secondForm(value) {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  return typeof value === 'object' ? 'options' : typeof value;
}

function prototypeName(value) {
  const prototype = getPrototypeOf(value);
  if (prototype === objectPrototype) return 'Object.prototype';
  return prototype === null ? 'null' : 'other';
}

function record(operation, target, second) {
  if (busy) return; // appendFileSync may call wrapped functions internally
  busy = true;
  try {
    const text = pathText(target);
    const directory = cwd();
    const form = secondForm(second);
    const row = { pid: process.pid, operation,
      path: text === null ? null : resolve(directory, text),
      argument: argumentForm(target, text),
      ...(text === null ? {} : { text, cwd: directory }),
      second: form,
      ...(form === 'options' ? { keys: Object.keys(second).sort(), prototype: prototypeName(second) } : {}),
      ...(LISTING.test(operation) && form === 'options' && second.recursive ? { recursive: true } : {}) };
    append(destination, JSON.stringify(row) + '\n');
  } finally {
    busy = false;
  }
}

function wrap(owner, name, operation) {
  const original = owner[name];
  if (typeof original !== 'function') return;
  const wrapper = function (...args) {
    record(operation, args[0], args[1]);
    return Reflect.apply(original, this, args);
  };
  for (const key of Reflect.ownKeys(original)) {
    if (['length', 'name', 'prototype', 'arguments', 'caller'].includes(key)) continue;
    Object.defineProperty(wrapper, key, Object.getOwnPropertyDescriptor(original, key));
  }
  Object.defineProperty(wrapper, 'name', { value: original.name });
  if (typeof original.native === 'function') wrap(wrapper, 'native', operation + '.native');
  owner[name] = wrapper;
}

const operations = ['readFile', 'readdir', 'opendir', 'stat', 'lstat', 'statfs', 'exists', 'access',
  'open', 'realpath', 'readlink', 'glob', 'openAsBlob', 'createReadStream', 'cp'];
for (const name of operations) {
  wrap(fs, name, name);
  wrap(fs, name + 'Sync', name + 'Sync');
}
const promises = fs.promises;
for (const name of operations) wrap(promises, name, 'promises.' + name);
syncBuiltinESMExports();
append(destination, JSON.stringify({ pid: process.pid, operation: 'preload', path: null,
  test_child: process.env.NODE_TEST_CONTEXT !== undefined }) + '\n');
