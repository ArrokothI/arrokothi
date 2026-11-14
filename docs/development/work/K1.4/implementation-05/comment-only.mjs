// K1.4 round 5 (brief 05 R4-PRESERVE): shows that the changes since a reviewed revision touch no
// executable code. Usage, from the repository root with Node v26.10.0:
//   node docs/development/work/K1.4/implementation-05/comment-only.mjs <previous H> <B> [<C>]
// Without <C> it compares the working tree. For each changed TypeScript or JavaScript file it prints
// both versions without comments (the TypeScript printer) and compares the output. Every other
// changed file is listed by kind; JSON files list their changed top-level keys. It also checks that
// packages/kernel/src, packages/core/src and the three mutation registries are byte-identical to B.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import ts from "typescript";

const [previous, base, candidate] = process.argv.slice(2);
if (!previous || !base) throw new Error("usage: comment-only.mjs <previous H> <B> [<C>]");
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28 });
const at = (rev, path) => (rev ? git("show", `${rev}:${path}`) : readFileSync(path, "utf8"));
const range = candidate ? [previous, candidate] : [previous];
const changed = git("diff", "--name-only", ...range).split("\n").filter(Boolean);

// The program without comments, as the TypeScript printer emits it: equal output means equal code.
function code(text, path) {
  const kind = path.endsWith(".tsx") ? ts.ScriptKind.TSX : /\.(js|mjs|cjs)$/.test(path) ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, false, kind);
  if (source.parseDiagnostics?.length) throw new Error(`${path}: ${source.parseDiagnostics.length} parse errors`);
  return ts.createPrinter({ removeComments: true }).printFile(source);
}

let failures = 0;
const report = (line) => console.log(line);
report(`previous=${git("rev-parse", previous).trim()}`);
report(`base=${git("rev-parse", base).trim()}`);
report(`candidate=${candidate ? git("rev-parse", candidate).trim() : "working tree"}`);
report(`changed files: ${changed.length}`);
for (const path of changed) {
  if (/\.(ts|tsx|mts|cts|js|mjs|cjs)$/.test(path)) {
    let before;
    try { before = at(previous, path); } catch { before = null; }
    const after = at(candidate, path);
    if (before === null) {
      report(`  new script: ${path} (${after.split("\n").length} lines)`);
      continue;
    }
    const a = code(before, path), b = code(after, path);
    const same = a === b;
    if (!same) failures += 1;
    report(`  ${same ? "code identical without comments" : "CODE DIFFERS"}: ${path} (${a.split("\n").length} printed lines)`);
  } else if (path.endsWith(".json")) {
    const a = JSON.parse(at(previous, path)), b = JSON.parse(at(candidate, path));
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
    report(`  json, keys changed [${keys.join(", ")}]: ${path}`);
  } else {
    report(`  document: ${path}`);
  }
}
for (const tree of ["packages/kernel/src", "packages/core/src"]) {
  const diff = git("diff", "--name-only", base, ...(candidate ? [candidate] : []), "--", tree).trim();
  if (diff) failures += 1;
  report(`${tree} vs B: ${diff ? `CHANGED\n${diff}` : "identical"}`);
}
for (const path of ["mutations.json", "refusal-guards.json", "value-cost.json"].map(name => `tests/fixtures/packet-tools/${name}`)) {
  const diff = git("diff", "--name-only", base, ...(candidate ? [candidate] : []), "--", path).trim();
  if (diff) failures += 1;
  report(`${path} vs B: ${diff ? "CHANGED" : "identical"}`);
}
report(failures === 0 ? "result=comment_and_document_only" : `result=FAILED (${failures})`);
process.exitCode = failures === 0 ? 0 : 1;
