import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const root = resolve(process.cwd());
const text = readFileSync("probes/reviewer-ablations.mjs", "utf8");
const start = text.indexOf("const all = ["), end = text.indexOf("];\nconst only");
const all = eval(text.slice(start + "const all = ".length, end + 1).replace(/\bC\b(?=,)/g, '"coordinator.ts"').replace(/\bE\b(?=,)/g, '"envelope.ts"').replace(/\bO\b(?=,)/g, '"outcome.ts"'));
const ids = new Set(process.argv[2].split(","));
for (const [id, file, find, replacement] of all.filter(m => ids.has(m[0].split(" ")[0]))) {
  const work = mkdtempSync(join(tmpdir(), "k12c1-oracle-"));
  try {
    cpSync(join(root, "packages/kernel"), join(work, "packages/kernel"), { recursive: true });
    mkdirSync(join(work, "probes"));
    cpSync(join(root, "probes/p4-exact-coordinates.ts"), join(work, "probes/p4-exact-coordinates.ts"));
    symlinkSync(join(root, "node_modules"), join(work, "node_modules"), "dir");
    const path = join(work, "packages/kernel/src", file);
    writeFileSync(path, readFileSync(path, "utf8").replace(find, replacement));
    const r = spawnSync(process.execPath, ["--experimental-strip-types", "probes/p4-exact-coordinates.ts"], { cwd: work, encoding: "utf8" });
    const failed = Object.entries(JSON.parse(r.stdout.slice(r.stdout.indexOf("{")))).filter(([, v]) => v !== "ok").map(([k, v]) => `${k} -> ${v}`);
    console.log(`${r.status !== 0 ? "ORACLE REJECTS" : "ORACLE MISSES"} ${id}\n    ${failed.join("\n    ")}`);
  } finally { rmSync(work, { recursive: true, force: true }); }
}
