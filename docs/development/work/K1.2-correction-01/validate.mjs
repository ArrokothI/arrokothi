// Raw-output collector, not a substitute for the semantic audit. Run on a clean payload C.
import { spawnSync, execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { platform, arch, release } from "node:os";
const out = resolve(process.argv[2] ?? "/tmp/k12-correction-04-validation");
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
  ["14-original-ablations-adapted", "node", ["docs/development/work/K1.2-correction-01/original-ablations-02.mjs"]],
  ["15-review-identity", "node", ["--experimental-strip-types", "docs/development/work/K1.2-correction-01/review-01/probe-identity.ts"]],
  ["16-review-maxlen", "node", ["--max-old-space-size=4096", "--experimental-strip-types", "docs/development/work/K1.2-correction-01/review-01/probe-maxlen.ts"]],
  ["17-review-namespace", "node", ["--max-old-space-size=8192", "--experimental-strip-types", "docs/development/work/K1.2-correction-01/review-01/probe-namespace.ts"]],
  ["18-diagnostics-maxlen", "node", ["--max-old-space-size=4096", "--experimental-strip-types", "docs/development/work/K1.2-correction-01/probe-diagnostics-maxlen.ts"]],
  ["20-review-aggregate", "node", ["--max-old-space-size=8192", "--experimental-strip-types", "docs/development/work/K1.2-correction-01/review-02/probe-aggregate.ts", "130", "980"]],
  ["21-review-equality", "node", ["--experimental-strip-types", "docs/development/work/K1.2-correction-01/review-02/probe-equality.ts"]],
  ...["accept", "refuse-undefined", "refuse-ctor"].map((mode, index) => [`${23 + index}-review-cost-${mode}`, "node", ["--max-old-space-size=4096", "--experimental-strip-types", "--expose-gc", "docs/development/work/K1.2-correction-01/review-02/probe-cost.ts"], { MODE: mode }]),
  ["26-review-aggregate-pre-authority", "node", ["--max-old-space-size=8192", "--experimental-strip-types", "docs/development/work/K1.2-correction-01/review-02/probe-aggregate.ts", "130", "980"], { PRE: "1" }],
  ["27-revision4-ablations", "node", ["docs/development/work/K1.2-correction-01/ablations-03.mjs"]],
  ["28-review4-p4-p5", "node", ["docs/development/work/K1.2-correction-01/refusal-cost-probe-03.mjs"]],
  ["30-review6-exact-ablations", "node", ["docs/development/work/K1.2-correction-01/ablations-04.mjs"]],
  ["31-diagnostic-work-ablations", "node", ["docs/development/work/K1.2-correction-01/diagnostic-ablations-04.mjs"]],
  ["32-review6-cost-and-blocker", "node", ["docs/development/work/K1.2-correction-01/refusal-cost-probe-04.mjs"]],
  ["33-round4-diff-check", "git", ["diff", "--check", "3287640f045cf2e6adeefcd32f21d897480a6a7d", "HEAD"]],
  ...["direct", "outcome"].flatMap(surface => [0, 1000, 10000].map(depth => [
    `34-handler-${surface}-${depth}`, "node", ["--expose-gc", "docs/development/work/K1.2-correction-01/probe-handler-chain-04.mjs", ".", String(depth), surface],
  ])),
  ["35-string-work", "node", ["--expose-gc", "docs/development/work/K1.2-correction-01/probe-string-work-04.mjs"]],
  ["29-round3-diff-check", "git", ["diff", "--check", "8a418d408f715e999a403a3e84b73a9db1b43712", "HEAD"]],
  ["22-correction-diff-check", "git", ["diff", "--check", "b18a729d989dea334a86ec08bdf8773ee77de4db", "HEAD"]],
  ["19-round2-diff-check", "git", ["diff", "--check", "449b243cd31d5596c457e091233dfc4d77a4eff4", "HEAD"]],
  ["12-diff-check", "git", ["diff", "--check", "a20d278185eaffc7f8b7489345a3624231ff6e6d", "HEAD"]],
];
const results = [];
for (const [name, executable, args, extraEnv = {}] of checks) {
  console.log(`Running ${name} on ${payload}`);
  const start = new Date().toISOString();
  const run = spawnSync(executable, args, { encoding: "utf8", timeout: 600_000, maxBuffer: 128 * 1024 * 1024, env: { ...process.env, TREE: process.cwd(), ...extraEnv } });
  const result = { name, command: [executable, ...args], exit: run.status, signal: run.signal, error: run.error?.message ?? null, env: { TREE: process.cwd(), ...extraEnv }, start, end: new Date().toISOString() };
  writeFileSync(join(out, `${name}.txt`), `payload C: ${payload}\ncwd: ${process.cwd()}\ncommand: ${[executable, ...args].join(" ")}\nenvironment: 00-environment.json; ${JSON.stringify(result.env)}\nstarted: ${start}\n\n${run.stdout ?? ""}${run.stderr ?? ""}\nexit: ${run.status}; signal: ${run.signal}; error: ${run.error?.message ?? "none"}\n`);
  results.push(result); console.log(`${name}: exit=${run.status}, signal=${run.signal}`);
}
writeFileSync(join(out, "13-results.json"), JSON.stringify({ payload, results, statusAfter: git("status", "--porcelain") || "clean" }, null, 2) + "\n");
process.exitCode = results.every(r => r.exit === 0 && r.error === null) && git("status", "--porcelain") === "" ? 0 : 1;
