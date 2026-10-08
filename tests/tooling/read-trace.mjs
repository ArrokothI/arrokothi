// TOOLS-01 read trace (design 05 §2.3 rule 5). Loaded only through
// NODE_OPTIONS=--import=<absolute path> for the reads phase, never in a verdict run.
// It records the path argument of fs read, list, stat and existence calls; it changes no result.
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
let busy = false;

function pathText(target) {
  if (typeof target === 'string') return target;
  if (target instanceof URL) return target.protocol === 'file:' ? fileURLToPath(target) : null;
  if (Buffer.isBuffer(target)) return target.toString();
  return null;
}

function record(operation, target) {
  if (busy) return; // appendFileSync may call wrapped functions internally
  busy = true;
  try {
    const text = pathText(target);
    const row = { pid: process.pid, operation,
      path: text === null ? null : resolve(cwd(), text),
      ...(text === null ? { argument: typeof target === 'number' ? 'fd' : typeof target } : {}) };
    append(destination, JSON.stringify(row) + '\n');
  } finally {
    busy = false;
  }
}

function wrap(owner, name, operation) {
  const original = owner[name];
  if (typeof original !== 'function') return;
  const wrapper = function (...args) {
    record(operation, args[0]);
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
  'open', 'realpath', 'readlink', 'glob', 'openAsBlob', 'createReadStream'];
for (const name of operations) {
  wrap(fs, name, name);
  wrap(fs, name + 'Sync', name + 'Sync');
}
const promises = fs.promises;
for (const name of operations) wrap(promises, name, 'promises.' + name);
syncBuiltinESMExports();
append(destination, JSON.stringify({ pid: process.pid, operation: 'preload', path: null,
  test_child: process.env.NODE_TEST_CONTEXT !== undefined }) + '\n');
