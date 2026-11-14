// Independent review 06 of K1.4: R6-SCOPE as owner choice 07 widens it. Review evidence, not product code.
// Run from the repository root with Node v26.10.0 after `npm ci`:
//   node docs/development/work/K1.4/review-06/executable-delta.mjs
// It reads pinned Git objects only, so the commit that records it cannot change what it compares.
//
// Method for "the executable delta is empty": for each changed TypeScript file, parse both versions and
// walk the syntax tree, keeping every token's kind and exact text and the tree shape, and skipping JSDoc
// nodes. `//` and `/* */` comments are trivia and never tokens. Equal trees mean equal program text up to
// comments and whitespace that does not change the parse. As a second view, the comment-free JavaScript
// emit is compared. Limit: a comment can carry a compiler or tool directive; the tree compare cannot see
// that, so the changed comment text is checked for directive markers separately.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import ts from "typescript";

const B = "608f9ece44dbe42b78974bdac9e7ddcd33697705";   // base
const A5 = "e307943d6b315e724e49107c3b26a1100ef4916c";  // H accepted by review 05
const K = "b153ccacb57c35652be3aeba43f47a48905e077b";   // cleanup head, parent of C
const C = "5b81a1b0cd9e73d7591ea23fd29195e24536d50d";   // round 6 payload
const H = "64c505bfee13cae340710942e69fe805723aaad9";   // round 6 candidate

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 << 20 });
const at = (rev, path) => git("show", `${rev}:${path}`);
const id = (rev, path) => git("rev-parse", `${rev}:${path}`).trim();
const lines = text => text.split("\n").filter(Boolean);
const names = (a, b, ...paths) => lines(git("diff", "--name-only", "--no-renames", a, b, "--", ...paths));
const status = (a, b, ...paths) => lines(git("diff", "--name-status", "--no-renames", a, b, "--", ...paths));
const sha = value => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const log = value => console.log(JSON.stringify(value));

function tree(text, path) {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  assert.equal(source.parseDiagnostics.length, 0, `${path}: parse errors`);
  let tokens = 0;
  const visit = node => {
    if (node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode) return null;
    if (node.kind >= ts.SyntaxKind.FirstToken && node.kind <= ts.SyntaxKind.LastToken) {
      tokens += 1;
      return [node.kind, node.getText(source)];
    }
    return [node.kind, ...node.getChildren(source).map(visit).filter(child => child !== null)];
  };
  return { shape: visit(source), tokens };
}
const emit = text => ts.transpileModule(text, {
  compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, removeComments: true },
}).outputText;

log({ B, accepted_H: A5, cleanup_head: K, C, H, node: process.version, typescript: ts.version });

// 1. Identity. C sits directly on the cleanup head and H directly on C; the accepted H and B are ancestors.
assert.equal(git("rev-parse", `${C}^`).trim(), K);
assert.equal(git("rev-parse", `${H}^`).trim(), C);
for (const [older, newer] of [[B, A5], [A5, K], [K, C], [C, H]]) git("merge-base", "--is-ancestor", older, newer);
log({ ancestry: "B < accepted H < cleanup head < C < H; C^ = cleanup head; H^ = C" });

// 2. Controls for the comparator.
assert.deepEqual(tree("/** old */ const x = 1; // a", "c.ts"), tree("/** new\n * text */ const x = 1; /* b */", "c.ts"));
assert.notDeepEqual(tree("const x = 1;", "c.ts"), tree("const x = 2;", "c.ts"));
assert.notDeepEqual(tree("const x = a\n(b);", "c.ts").shape, tree("const x = a;\n(b);", "c.ts").shape);
assert.notDeepEqual(tree("function f(){return 1;}", "c.ts"), tree("function f(){return\n1;}", "c.ts"));
assert.notDeepEqual(tree("interface A { readonly a?: number }", "c.ts"), tree("interface A { readonly a: number }", "c.ts"));
// The stated limit: a directive comment is invisible to the tree compare.
assert.deepEqual(tree("// plain\nconst x: number = 1;", "c.ts"), tree("// @ts-ignore\nconst x: number = 1;", "c.ts"));
log({ controls: ["comment and JSDoc edits ignored", "literal change detected", "statement split detected",
  "ASI newline detected", "optional-member change detected", "directive comment NOT detected (checked separately)"], passed: true });

// 3. The exact changed-file set of the correction, classified.
const changed = names(K, C);
const sources = ["packages/sdk/src/host.ts", "packages/sdk/src/types.ts"];
const prose = ["docs/guides/deployment/quick-start.md", "mental-model/concepts/values.md", "mental-model/mechanisms/execution-cycle.md"];
const spec = "docs/development/work/K1.4/verification.json";
const records = ["docs/development/work/K1.4/owner-choice-07.md"];
const evidence = ["architecture-tests.log", "builder-docs.log", "comment-only.log", "due-at-registration.log",
  "due-at-registration.probe.mjs", "linkcheck-control.log", "linkcheck.log", "linkcheck.py", "sdk-tests.log", "timer-grep.log", "typecheck.log",
].map(name => `docs/development/work/K1.4/implementation-06/${name}`);
assert.deepEqual([...changed].sort(), [...sources, ...prose, spec, ...records, ...evidence].sort());
const statuses = Object.fromEntries(status(K, C).map(line => line.split("\t").reverse()));
for (const path of [...records, ...evidence]) assert.equal(statuses[path], "A", `${path} is new`);
for (const path of [...sources, ...prose, spec]) assert.equal(statuses[path], "M", `${path} is modified`);
log({ changed_files: changed.length, modified: [...sources, ...prose, spec], added: [...records, ...evidence] });

// 4. Each changed TypeScript file: same tokens and tree without JSDoc, same comment-free emit.
for (const path of sources) {
  assert.equal(id(A5, path), id(K, path), `${path}: cleanup head equals the accepted H`);
  const before = tree(at(K, path), path), after = tree(at(C, path), path);
  assert.deepEqual(after, before, `${path}: tokens and tree`);
  assert.equal(emit(at(C, path)), emit(at(K, path)), `${path}: comment-free emit`);
  log({ path, tokens: after.tokens, tree_sha256: sha(after.shape), emit_sha256: sha(emit(at(C, path))), identical_without_comments: true });
}

// 5. The changed lines themselves: every removed or added line is a comment line with no directive marker.
const directive = /@ts-|<reference|@jsx|@__PURE__|@__NO_SIDE_EFFECTS__|sourceMappingURL|eslint|istanbul|c8 ignore|prettier-ignore|@internal|@deprecated|@public|@alpha|@beta/;
for (const path of sources) {
  const hunks = lines(git("diff", "-U0", K, C, "--", path)).filter(line => /^[+-](?![+-])/.test(line));
  for (const line of hunks) {
    const body = line.slice(1).trim();
    assert.ok(body.startsWith("/**") || body.startsWith("*"), `${path}: not a doc-comment line: ${line}`);
    assert.ok(!directive.test(body), `${path}: directive marker in ${line}`);
  }
  log({ path, changed_lines: hunks.length, removed: hunks.filter(l => l[0] === "-").length, added: hunks.filter(l => l[0] === "+").length, all_doc_comment_lines_without_directives: true });
}

// 6. Everything executable or checked by the verification command is byte-identical across the correction.
const sameTree = ["tests", "scripts", ".github", "examples", ".agents", "package.json", "package-lock.json", "tsconfig.json",
  "packages/kernel", "packages/core", "packages/models", "packages/retrieval", "packages/agents"];
for (const path of sameTree) for (const rev of [C, H]) assert.equal(id(rev, path), id(K, path), `${path} at ${rev}`);
const src = rev => lines(git("ls-tree", "-r", "--name-only", rev, "--", "packages")).filter(path => path.includes("/src/"));
assert.deepEqual(src(C), src(K));
const untouched = src(C).filter(path => !sources.includes(path));
for (const path of untouched) assert.equal(id(C, path), id(K, path), path);
assert.deepEqual(names(K, C, "packages"), sources);
log({ identical_across_cleanup_head_C_H: sameTree, production_src_files: src(C).length, other_src_files_blob_identical: untouched.length });

// 7. Kernel and core against B, and the three mutation registries.
for (const path of ["packages/kernel/src", "packages/core/src", "packages/core"]) assert.equal(id(C, path), id(B, path), `${path} vs B`);
assert.deepEqual(names(B, C, "packages/kernel", "packages/core"), ["packages/kernel/tests/binding-surface.test.ts"]);
const registries = ["mutations.json", "refusal-guards.json", "value-cost.json"].map(name => `tests/fixtures/packet-tools/${name}`);
for (const path of registries) assert.equal(id(C, path), id(K, path), `${path} vs the cleanup head`);
log({ kernel_src_and_core_equal_B: true, kernel_package_delta_from_B: ["packages/kernel/tests/binding-surface.test.ts (accepted in review 05)"],
  mutation_registries_equal_cleanup_head: registries,
  mutation_registries_vs_B: Object.fromEntries(registries.map(path => [path, id(C, path) === id(B, path) ? "equal" : "changed before the accepted H"])) });

// 8. verification.json: only administrative_files, limits and preserve differ; every check is unchanged.
const before = JSON.parse(at(K, spec)), after = JSON.parse(at(C, spec));
assert.equal(id(C, spec), id(H, spec));
const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
const differing = keys.filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key])).sort();
assert.deepEqual(differing, ["administrative_files", "limits", "preserve"]);
assert.deepEqual(after.limits.slice(0, before.limits.length - 1), before.limits.slice(0, -1));
assert.equal(after.limits.length, before.limits.length + 1);
assert.equal(after.limits.at(-1), before.limits.at(-1));
assert.ok(after.limits.at(-2).startsWith("Round 6 "));
assert.deepEqual(after.preserve.slice(0, before.preserve.length), before.preserve);
const added = after.preserve.slice(before.preserve.length);
assert.equal(added.length, 40);
for (const entry of added) assert.deepEqual(Object.keys(entry).sort().concat(entry.revision), ["path", "revision", K]);
log({ spec_keys_changed: differing, checks_unchanged: after.checks.length, limits_added: 1, preserve_before: before.preserve.length, preserve_added: added.length });

// 9. C..H is exactly the allowlist, and every preserved path is unchanged at H.
assert.deepEqual(names(C, H).sort(), [...after.administrative_files].sort());
for (const entry of after.preserve) assert.equal(id(H, entry.path), id(entry.revision, entry.path), `preserved ${entry.path}`);
log({ c_to_h: names(C, H), exact_allowlist: true, preserved_paths_unchanged_at_H: after.preserve.length });

// 10. The K1.4 record directory across the whole round: additions only, apart from progress.md and the spec.
const work = status(K, H, "docs/development/work/K1.4").map(line => line.split("\t"));
const modified = work.filter(([kind]) => kind !== "A").map(([, path]) => path).sort();
assert.deepEqual(modified, ["docs/development/work/K1.4/progress.md", spec]);
assert.deepEqual(names(K, H).filter(path => !changed.includes(path)).sort(), [...after.administrative_files].sort());
log({ k14_records_modified_in_round: modified, k14_records_added_in_round: work.length - modified.length, result: "comment_and_document_only" });
