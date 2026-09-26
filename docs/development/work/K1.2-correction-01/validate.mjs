// Raw-output collector, not a substitute for the semantic audit. Run on a clean payload C.
import { spawnSync, execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { platform, arch, release } from "node:os";
const out = resolve(process.argv[2] ?? "/tmp/k12-correction-validation");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
if (git("status", "--porcelain") !== "") throw Error("payload tree is not clean");
const payload = git("rev-parse", "HEAD");
mkdirSync(out, { recursive: true });
const context = { payload, cwd: process.cwd(), date: new Date().toISOString(), node: process.version, npm: execFileSync("npm", ["--version"], { encoding: "utf8" }).trim(), typescript: execFileSync("node_modules/.bin/tsc", ["--version"], { encoding: "utf8" }).trim(), os: `${platform()} ${arch()} ${release()}`, branch: git("branch", "--show-current"), remote: git("remote", "-v"), statusBefore: "clean" };
writeFileSync(join(out, "00-environment.json"), JSON.stringify(context, null, 2) + "\n");
const checks = [
  ["01-typecheck", "npm", ["run", "typecheck"]],
  ["02-full", "npm", ["test"]],
  ["03-kernel", "npm", ["run", "test:kernel"]],
  ["04-conformance", "npm", ["run", "test:conformance"]],
  ["05-sdk", "npm", ["run", "test:sdk"]],
  ["06-builder-docs", "npm", ["run", "check:builder-docs"]],
  ["07-original-ablations", "node", ["docs/development/work/K1.2/ablations.mjs"]],
  ["08-correction-ablations", "node", ["docs/development/work/K1.2-correction-01/ablations.mjs"]],
  ["09-r11-probe", "node", ["--experimental-strip-types", "docs/development/work/K1.2/review-11/probe-partial-claim.ts"]],
  ["10-records-links", "node", ["docs/development/work/K1.2-correction-01/check-records.mjs"]],
  ["11-evals", "npm", ["run", "test:evals"]],
  ["12-diff-check", "git", ["diff", "--check", "a20d278185eaffc7f8b7489345a3624231ff6e6d", "HEAD"]],
];
const results = [];
for (const [name, executable, args] of checks) {
  console.log(`Running ${name} on ${payload}`);
  const start = new Date().toISOString();
  const run = spawnSync(executable, args, { encoding: "utf8", timeout: 600_000, maxBuffer: 128 * 1024 * 1024 });
  const result = { name, command: [executable, ...args], exit: run.status, signal: run.signal, error: run.error?.message ?? null, start, end: new Date().toISOString() };
  writeFileSync(join(out, `${name}.txt`), `payload C: ${payload}\ncwd: ${process.cwd()}\ncommand: ${[executable, ...args].join(" ")}\nenvironment: 00-environment.json\nstarted: ${start}\n\n${run.stdout ?? ""}${run.stderr ?? ""}\nexit: ${run.status}; signal: ${run.signal}; error: ${run.error?.message ?? "none"}\n`);
  results.push(result); console.log(`${name}: exit=${run.status}, signal=${run.signal}`);
}
writeFileSync(join(out, "13-results.json"), JSON.stringify({ payload, results, statusAfter: git("status", "--porcelain") || "clean" }, null, 2) + "\n");
process.exitCode = results.every(r => r.exit === 0 && r.error === null) && git("status", "--porcelain") === "" ? 0 : 1;
