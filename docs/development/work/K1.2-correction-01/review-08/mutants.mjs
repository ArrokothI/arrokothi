// Reviewer single-span mutants for K1.2-correction-01 H 9248e56, run against the FULL kernel suite.
// Each mutant: disposable copy of packages/kernel from the H tree; unique-anchor check; full suite.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const H = process.env.TREE; assert.ok(H, "TREE=<H tree>");
const V = "values.ts", C = "coordinator.ts";
const tryRead = (expr) => `(() => { try { return ${expr} ? "" : ""; } catch { return ""; } })()`;
const all = [
  ["N1 catch path reads thrown constructor", V, "threw (${describe(error)}), so it", "threw (${describe(error)}${" + tryRead("(error as { constructor?: unknown } | null)?.constructor") + "}), so it"],
  ["N2 foreign array reads constructor", V, "message: `expected a plain array, received ${describe(container)}` }", "message: `expected a plain array, received ${describe(container)}${" + tryRead("(container as { constructor?: unknown }).constructor") + "}` }"],
  ["N3 foreign object reads constructor", V, "message: `expected a plain object, received ${describe(container)}` }", "message: `expected a plain object, received ${describe(container)}${" + tryRead("(container as { constructor?: unknown }).constructor") + "}` }"],
  ["N4 primitive label reads function name", V, "message: `expected a boundary value, received ${describe(value)}` }", "message: `expected a boundary value, received ${describe(value)}${" + tryRead("typeof value === \"function\" && (value as { name?: unknown }).name") + "}` }"],
  ["N5 preflight refuses at exactly 131072 units", V, "if (units > 2 * BOUNDARY_LIMITS.stringScalarValues) return TOO_LONG;", "if (units >= 2 * BOUNDARY_LIMITS.stringScalarValues) return TOO_LONG;"],
  ["N6 preflight admits 131073 units", V, "if (units > 2 * BOUNDARY_LIMITS.stringScalarValues) return TOO_LONG;", "if (units > 2 * BOUNDARY_LIMITS.stringScalarValues + 1) return TOO_LONG;"],
  ["N7 index read before preflight flattens", V, "  const units = input.length;\n", "  const units = input.length;\n  void input[0];\n"],
  ["N8 second ordinary length read", V, "  const lengthRead: unknown = (container as { length: unknown }).length;\n", "  const lengthRead: unknown = (container as { length: unknown }).length;\n  void (container as { length: unknown }).length;\n"],
  ["N9 object half lists symbols twice", V, "  const symbolCount = PrimordialGetOwnPropertySymbols(container).length;\n  if (symbolCount > 0) {", "  const symbolCount = PrimordialGetOwnPropertySymbols(container).length;\n  void PrimordialGetOwnPropertySymbols(container);\n  if (symbolCount > 0) {"],
  ["N10 object half observes prototype twice", V, "  const prototype = PrimordialGetPrototypeOf(container) as object | null;\n", "  const prototype = PrimordialGetPrototypeOf(container) as object | null;\n  void PrimordialGetPrototypeOf(container);\n"],
  ["N11 object member descriptor read twice", V, "    const member = describedValue(container, key, descriptor, where, state);", "    void PrimordialGetOwnPropertyDescriptor(container, key);\n    const member = describedValue(container, key, descriptor, where, state);"],
  ["N12 member ordinary read twice", V, "  const read = (container as Record<string, unknown>)[key];\n", "  const read = (container as Record<string, unknown>)[key];\n  void (container as Record<string, unknown>)[key];\n"],
  ["N13 array half lists names twice", V, "  const names = PrimordialGetOwnPropertyNames(container) as string[];\n  const overlong", "  const names = PrimordialGetOwnPropertyNames(container) as string[];\n  void PrimordialGetOwnPropertyNames(container);\n  const overlong"],
  ["N14 seven details instead of eight", V, "  if (issues.length < 8) {", "  if (issues.length < 7) {"],
  ["N15 array surplus names uncharged", V, "containerStructureBytes(length, false) + (surplus > 0 ? surplus : 0) + symbolCount", "containerStructureBytes(length, false) + symbolCount"],
  ["N16 object half charges only enumerable names", V, "if (!charge(state, containerStructureBytes(names.length, true) + symbolCount)) return REFUSED;", "if (!charge(state, containerStructureBytes(enumerable.length, true) + symbolCount)) return REFUSED;"],
  ["F1 refusal record executionId lossy", C, "const refusal = mintRefusal(classification, reason, position, record.executionId);", "const refusal = mintRefusal(classification, reason, position, diagnosticIdentity(record.executionId));"],
  ["F2 visibleExecutions lossy", C, "appendOwn(visible, record.executionId);", "appendOwn(visible, diagnosticIdentity(record.executionId));"],
  ["F3 view creationKey lossy", C, "    creationKey: record.creationRequestId.requestKey,", "    creationKey: diagnosticIdentity(record.creationRequestId.requestKey),"],
  ["F4 creation answer initialEventId lossy", C, "return ok({ executionId, receipt, replayed: false, initialEventId: eventId });", "return ok({ executionId, receipt, replayed: false, initialEventId: diagnosticIdentity(eventId) });"],
];
const only = process.argv[2] ? new Set(process.argv.slice(2)) : null;
const mutants = only ? all.filter(m => only.has(m[0].split(" ")[0])) : all;
const files = readdirSync(join(H, "packages/kernel/tests")).filter(f => f.endsWith(".test.ts")).sort().map(f => `packages/kernel/tests/${f}`);
const args = ["--experimental-strip-types", "--test", "--test-reporter=spec", ...files];
console.log(`TREE ${H}; node ${process.version}; ${files.length} test files`);
const results = [];
for (const m of [null, ...mutants]) {
  const work = mkdtempSync(join(tmpdir(), "rv-mut-"));
  try {
    cpSync(join(H, "packages/kernel"), join(work, "packages/kernel"), { recursive: true });
    cpSync(join(H, "package.json"), join(work, "package.json"));
    symlinkSync(join(H, "node_modules"), join(work, "node_modules"), "dir");
    if (m) {
      const [id, file, find, rep] = m, p = join(work, "packages/kernel/src", file), src = readFileSync(p, "utf8");
      assert.equal(src.split(find).length, 2, `unique anchor: ${id}`);
      writeFileSync(p, src.replace(find, rep));
    }
    const t0 = Date.now();
    const run = spawnSync(process.execPath, args, { cwd: work, encoding: "utf8", timeout: 900_000, maxBuffer: 64 * 1024 * 1024 });
    const out = (run.stdout ?? "") + (run.stderr ?? "");
    const n = k => Number(new RegExp(`^ℹ ${k} (\\d+)`, "m").exec(out)?.[1]);
    const r = { id: m ? m[0] : "CONTROL", exit: run.status, signal: run.signal, tests: n("tests"), pass: n("pass"), fail: n("fail"), cancelled: n("cancelled"), skipped: n("skipped"), todo: n("todo"), ms: Date.now() - t0,
      failed: [...new Set([...out.matchAll(/^\s*✖ (.+?) \(\d/gm)].map(x => x[1]))].slice(0, 6) };
    r.verdict = !m ? (r.exit === 0 && r.fail === 0 ? "CONTROL OK" : "CONTROL BAD") : (r.fail > 0 && r.cancelled === 0 ? "REJECTED" : r.fail === 0 && r.exit === 0 ? "SURVIVED" : "ERROR");
    results.push(r);
    console.log(`${r.verdict.padEnd(10)} ${r.id} — tests ${r.tests} pass ${r.pass} fail ${r.fail} cancelled ${r.cancelled} (${r.ms} ms)${r.failed.length ? " — e.g. " + r.failed.slice(0, 3).join(" | ") : ""}`);
    if (!m) assert.equal(r.verdict, "CONTROL OK", out.slice(-3000));
  } finally { rmSync(work, { recursive: true, force: true }); }
}
writeFileSync(process.env.OUT ?? "/dev/null", JSON.stringify(results, null, 2));
