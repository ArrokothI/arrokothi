// A11 fixture: one distinct path per access form; the floor check expects each in the trace.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs, { existsSync, promises, readdirSync, readFileSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import * as fsp from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const directory = process.env.FLOOR_READ_DIR as string;
const at = (name: string) => path.join(directory, name);

test('every access form reads its own path', async () => {
  assert.equal(fs.readFileSync(at('default-sync'), 'utf8'), 'default-sync');
  assert.equal(readFileSync(at('named-sync'), 'utf8'), 'named-sync');
  assert.equal(existsSync(at('missing')), false);
  assert.ok(statSync(at('named-stat')).isFile());
  assert.deepEqual(readdirSync(at('listing')), ['entry']);
  assert.equal(await promises.readFile(at('fs-promises-property'), 'utf8'), 'fs-promises-property');
  assert.equal(await readFile(at('promises-named'), 'utf8'), 'promises-named');
  assert.ok((await fsp.stat(at('promises-namespace'))).isFile());
  assert.equal(await new Promise((resolve, reject) => fs.readFile(at('callback'), 'utf8',
    (error, data) => error ? reject(error) : resolve(data))), 'callback');
  const required = createRequire(import.meta.url)('node:fs');
  assert.equal(required.readFileSync(at('require-sync'), 'utf8'), 'require-sync');
  const chunks: Buffer[] = [];
  for await (const chunk of fs.createReadStream(at('stream'))) chunks.push(chunk as Buffer);
  assert.equal(Buffer.concat(chunks).toString(), 'stream');
});
