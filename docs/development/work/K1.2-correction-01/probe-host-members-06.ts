// Round 6, implementer-found (same mechanism as K12C1-R9-HISTORY-01): optional members of trusted
// host objects answered by Object.prototype. Runs one schedule per defect against the start
// commit's Kernel source (extracted with `git show` into a temporary directory) and against the
// current tree. Exit 0 only when the start source reproduces all three defects and the current
// source refuses all three. Run from the repository root:
//   node --experimental-strip-types docs/development/work/K1.2-correction-01/probe-host-members-06.ts
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const START = "60eebc24113eb834e5d88015ca2a196c95c60493";
const git = (...args: string[]): string => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

type Answer = { ok: true; value: Record<string, unknown> } | { ok: false; error: { classification: string } };
const accepted = (answer: Answer): Record<string, unknown> => {
  if (!answer.ok) throw new Error(`expected acceptance, got ${answer.error.classification}`);
  return answer.value;
};
const inherit = (key: string, descriptor: PropertyDescriptor): (() => void) => {
  const installer = Object.create(null) as PropertyDescriptor;
  installer.configurable = true;
  if (descriptor.get !== undefined) installer.get = descriptor.get;
  else installer.value = descriptor.value;
  Object.defineProperty(Object.prototype, key, installer);
  return () => {
    delete (Object.prototype as Record<string, unknown>)[key];
  };
};
const request = {
  creationKey: "probe",
  scope: "tenant-a",
  definitionRevision: "weekly-report@3",
  runtimeContractRevision: "runtime-contract@1",
  progressCodec: "inline-json@1",
  authorityContext: { tenant: "a" },
  initialInput: { kind: "application.request", payload: { text: "probe" } },
};
const author = { namespace: "probe", scopes: ["tenant-a"], controlScopes: ["tenant-a"] };
const visibleOnly = { namespace: "visible-only", scopes: ["tenant-a"] };
// A Driver that declares nothing about replacement safety.
const bare = () => ({ driverId: "bare", deliver(_activation: unknown, settlement: { delivered(): void }) { settlement.delivered(); return undefined; } });

async function run(label: string, src: string): Promise<Record<string, string>> {
  const { ExecutionCoordinator } = (await import(`${src}/index.ts`)) as { ExecutionCoordinator: new (options: object) => Record<string, (...args: unknown[]) => Answer> };
  const results: Record<string, string> = {};
  {
    // A: a takeover request's own getter installs an inherited isSafeToReplace during observation.
    const kernel = new ExecutionCoordinator({ driver: bare() });
    const { executionId } = accepted(kernel.createExecution!(author, request)) as { executionId: string };
    const open = accepted(kernel.dispatch!(author, executionId, { bound: 1 })) as { activationId: string };
    let remove = (): void => {};
    const takeover = { get activationId(): string { remove = inherit("isSafeToReplace", { value: () => true }); return open.activationId; }, writerEpoch: 1 };
    let answer: Answer;
    try { answer = kernel.requestTakeover!(author, executionId, takeover); } finally { remove(); }
    results.A_inheritedSafety = answer.ok ? `accepted at writer epoch ${String(answer.value.writerEpoch)}` : answer.error.classification;
  }
  {
    // B: residue controlScopes on Object.prototype and a caller that owns none.
    const kernel = new ExecutionCoordinator({ driver: bare() });
    const { executionId } = accepted(kernel.createExecution!(author, request)) as { executionId: string };
    const open = accepted(kernel.dispatch!(author, executionId, { bound: 1 })) as { activationId: string };
    const remove = inherit("controlScopes", { value: ["tenant-a"] });
    let answer: Answer;
    try { answer = kernel.reportProtocolFailure!(visibleOnly, executionId, { activationId: open.activationId, writerEpoch: 1, diagnostic: "residue" }); } finally { remove(); }
    results.B_residueControl = answer.ok ? `accepted, changed=${String(answer.value.changed)}` : answer.error.classification;
  }
  {
    // C: residue mailboxCapacity at construction; options that declare none.
    const remove = inherit("mailboxCapacity", { value: 1 });
    let kernel: Record<string, (...args: unknown[]) => Answer>;
    try { kernel = new ExecutionCoordinator({ driver: bare() }); } finally { remove(); }
    const { executionId } = accepted(kernel.createExecution!(author, request)) as { executionId: string };
    const second = kernel.submitInput!(author, { destination: executionId, requestKey: "second", kind: "k", payload: 1 });
    results.C_residueCapacity = second.ok ? "second input queued (default capacity)" : second.error.classification;
  }
  console.log(JSON.stringify({ tree: label, ...results }));
  return results;
}

const directory = mkdtempSync(join(tmpdir(), "k12c1-r6-host-members-"));
try {
  const startSrc = join(directory, "src");
  mkdirSync(startSrc);
  for (const path of git("ls-tree", "--name-only", START, "packages/kernel/src/").split("\n").filter(Boolean)) {
    writeFileSync(join(startSrc, path.slice("packages/kernel/src/".length)), git("show", `${START}:${path}`));
  }
  // The start source imports the approved JCS dependency; resolve it from the repository.
  execFileSync("ln", ["-s", resolve("node_modules"), join(directory, "node_modules")]);
  const before = await run(`start ${START}`, startSrc);
  const after = await run("current tree", resolve("packages/kernel/src"));
  assert.deepEqual(before, { A_inheritedSafety: "accepted at writer epoch 2", B_residueControl: "accepted, changed=true", C_residueCapacity: "capacity_exhausted" }, "the start source reproduces all three");
  assert.deepEqual(after, { A_inheritedSafety: "unsafe_replacement", B_residueControl: "unauthorized_control", C_residueCapacity: "second input queued (default capacity)" }, "the current source refuses all three");
  console.log("Start source reproduces A/B/C; current source refuses all three.");
} finally {
  rmSync(directory, { recursive: true, force: true });
}
