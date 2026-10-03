// TOOLS-01 reach counts (design 05 §4, D05-CHK-02): for each requested file and UTF-16 offset, the
// count of the innermost V8 block range that contains it, the rule of `coverageExecuted` in
// packages/kernel/tests/sweep/fault-oracle.ts (not imported: that file is a preserved origin).
// Reads raw NODE_V8_COVERAGE output; a file loaded by more than one process is refused.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [directory, requestFile] = process.argv.slice(2);
const request = JSON.parse(readFileSync(requestFile, 'utf8'));
const byUrl = new Map();
for (const name of readdirSync(directory).filter(entry => entry.startsWith('coverage-') && entry.endsWith('.json')).sort()) {
  for (const script of JSON.parse(readFileSync(join(directory, name), 'utf8')).result) {
    if (!byUrl.has(script.url)) byUrl.set(script.url, []);
    byUrl.get(script.url).push(script);
  }
}
const results = request.map(({ file, offsets }) => {
  const scripts = byUrl.get(pathToFileURL(file).href) ?? [];
  if (scripts.length !== 1) return { file, scripts: scripts.length, counts: offsets.map(() => null) };
  const ranges = scripts[0].functions.flatMap(fn => fn.ranges);
  const count = (offset) => {
    let best;
    for (const range of ranges) {
      if (range.startOffset <= offset && offset < range.endOffset &&
          (best === undefined || range.endOffset - range.startOffset <= best.endOffset - best.startOffset)) best = range;
    }
    return best === undefined ? null : best.count;
  };
  return { file, scripts: 1, counts: offsets.map(count) };
});
process.stdout.write(JSON.stringify(results) + '\n');
