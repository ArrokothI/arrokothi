// TOOLS-01 reach counts (design 05 §4, D05-CHK-02): for each requested file and UTF-16 offset, the
// count of the innermost V8 block range that contains it, the rule of `coverageExecuted` in
// packages/kernel/tests/sweep/fault-oracle.ts (not imported: that file is a preserved origin).
// Reads raw NODE_V8_COVERAGE output; a file loaded by more than one process is refused, unless the
// request asks for `processes: "any"` (a mutant's edit site in a target-set control), which takes the
// largest count over the processes that loaded it.
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
const innermost = (script, offset) => {
  let best;
  for (const range of script.functions.flatMap(fn => fn.ranges)) {
    if (range.startOffset <= offset && offset < range.endOffset &&
        (best === undefined || range.endOffset - range.startOffset <= best.endOffset - best.startOffset)) best = range;
  }
  return best === undefined ? null : best.count;
};
const results = request.map(({ file, offsets, processes }) => {
  const scripts = byUrl.get(pathToFileURL(file).href) ?? [];
  if (processes === 'any') {
    return { file, scripts: scripts.length, counts: offsets.map(offset => scripts.reduce((most, script) => {
      const count = innermost(script, offset);
      return count === null ? most : Math.max(most ?? 0, count);
    }, null)) };
  }
  if (scripts.length !== 1) return { file, scripts: scripts.length, counts: offsets.map(() => null) };
  return { file, scripts: 1, counts: offsets.map(offset => innermost(scripts[0], offset)) };
});
process.stdout.write(JSON.stringify(results) + '\n');
