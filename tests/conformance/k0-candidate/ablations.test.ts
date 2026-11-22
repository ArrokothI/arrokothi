/**
 * K1.4-candidate KC-1: the verdicts depend on the Kernel.
 *
 * A candidate that scripted its answers would pass whatever the Kernel did. Each row below edits one
 * decision out of a temporary copy of `packages/kernel/src` and runs a supported schedule against that
 * copy through the fixture's unmodified runner. The schedule must turn to FAIL at the named step, in the
 * named field (design 01 addendum 01 §A11, design check 01 D01-CHK-09).
 *
 * Rules, each asserted:
 * - the anchor occurs exactly once in the file, so an edit cannot silently miss;
 * - the same schedule PASSES against an unedited copy made the same way, so the copy is not the cause;
 * - the result is FAIL, its first failure is at the target step, and that step's failure names every
 *   listed field. A refusal, an import error or an unmatched anchor is not a kill.
 *
 * The rows are data, in `ablation-table.ts`: site, obligation and the test that rejects it (012 §
 * Maintained corpus and mutation registry). The same rows are cases `k14-candidate.abl-1` to `-5` of
 * `tests/fixtures/packet-tools/mutations.json` (owner choice 03), which the registry runs through
 * `ablation-probe.mjs`. A test below checks that each registered mutant is exactly its row's edit.
 *
 * A second witness is review 01's latest-grant adapter mutant: a candidate that presents the newest
 * grant instead of the attempt's own. It passes all twelve schedules, and ABL-2 rejects it.
 *
 * Kernel source is read and copied, never edited in place. Each copy is loaded in a child process from
 * a generated entry file whose imports are literal paths, so no source in this tree holds a non-literal
 * import and the K1.0 literal-import guard is unchanged. This file is test-side: the candidate's
 * implementation files import no `node:` module (`boundary.test.ts`).
 */

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import type { Scenario, ScenarioResult } from "../k0/fixture.ts";
import { ALL_SCENARIOS } from "../k0/scenarios.ts";
import { ABLATIONS, killProblems } from "./ablation-table.ts";
import type { Ablation } from "./ablation-table.ts";

const HERE = import.meta.dirname;
const KERNEL_SOURCE = resolve(HERE, "../../../packages/kernel/src");
const moduleUrl = (relative: string): string => JSON.stringify(pathToFileURL(resolve(HERE, relative)).href);

const REPO_ROOT = resolve(HERE, "../../..");
const REGISTRY = "tests/fixtures/packet-tools/mutations.json";
const COVERAGE = "tests/fixtures/packet-tools/coverage.json";
const PROBE = "tests/conformance/k0-candidate/ablation-probe.mjs";

/** One Outcome submission as the coordinator received it: the proposal's epoch and the presented grant's. */
interface Presented {
  readonly submittedEpoch: number;
  readonly grantEpoch: number;
}

interface ChildRun {
  readonly results: readonly ScenarioResult[];
  readonly presented: readonly Presented[];
}

/**
 * The entry file written beside each Kernel copy. It runs the named scenarios through the fixture's
 * unmodified runner, with a candidate built over the copy's `ExecutionCoordinator`, and prints the
 * results. `candidateModule` is the candidate to load: the real one, or an edited copy.
 */
const entryText = (candidateModule: string): string =>
  [
    'import { ExecutionCoordinator } from "./kernel/index.ts";',
    `import { createKernelCandidate } from ${candidateModule};`,
    `import { runScenario } from ${moduleUrl("../k0/fixture.ts")};`,
    `import { createOperationSink } from ${moduleUrl("../k0/operation-sink.ts")};`,
    `import { ALL_SCENARIOS } from ${moduleUrl("../k0/scenarios.ts")};`,
    "const presented = [];",
    "class Watching extends ExecutionCoordinator {",
    "  submitOutcome(caller, envelope, grant) {",
    "    presented.push({ submittedEpoch: envelope.writerEpoch, grantEpoch: grant.writerEpoch });",
    "    return super.submitOutcome(caller, envelope, grant);",
    "  }",
    "}",
    "const results = process.argv.slice(2).map((id) => {",
    "  const scenario = ALL_SCENARIOS.find((candidate) => candidate.id === id);",
    '  if (scenario === undefined) throw new Error("no such scenario");',
    "  return runScenario(createKernelCandidate({ Coordinator: Watching }), scenario, createOperationSink());",
    "});",
    "process.stdout.write(JSON.stringify({ results, presented }));",
    "",
  ].join("\n");

/**
 * Review 01's plausible wrong adapter: it presents the newest grant delivered for the Execution, not the
 * grant delivered for the attempt the Outcome names. A stale proposal then arrives with a current grant.
 */
const LATEST_GRANT = {
  file: "kernel-candidate.ts",
  anchor: "driver.grantFor(executionId, outcome.activationId, outcome.writerEpoch) ?? NO_GRANT",
  edit: "driver.deliveries.filter((delivery) => delivery.activation.executionId === executionId).at(-1)?.grant ?? NO_GRANT",
} as const;

const scenarioById = (id: string): Scenario => {
  const found = ALL_SCENARIOS.find((scenario) => scenario.id === id);
  assert.ok(found, `fixture scenario ${id} exists`);
  return found;
};

const occurrences = (text: string, anchor: string): number => text.split(anchor).length - 1;

describe("K1.4-candidate KC-1: removing a Kernel decision turns its witness schedule to FAIL", () => {
  let workspace = "";
  let copies = 0;

  before(() => {
    workspace = mkdtempSync(join(tmpdir(), "k14-candidate-ablation-"));
  });
  after(() => {
    if (workspace !== "") rmSync(workspace, { recursive: true, force: true });
  });

  /**
   * Copies the Kernel source into a fresh directory, applying at most one edit, and runs the scenarios
   * against that copy in a child process. With `adapterEdit`, the candidate is also a copy, with that
   * one edit. A child that cannot load or run exits non-zero, which throws here: that is a broken test,
   * never a kill.
   */
  function runAll(ablation: Ablation | null, scenarioIds: readonly string[], adapterEdit: typeof LATEST_GRANT | null = null): ChildRun {
    copies += 1;
    const root = join(workspace, `copy-${copies}`);
    const directory = join(root, "kernel");
    mkdirSync(directory, { recursive: true });
    const files = readdirSync(KERNEL_SOURCE, { withFileTypes: true });
    for (const entry of files) {
      assert.ok(entry.isFile() && entry.name.endsWith(".ts"), `packages/kernel/src holds only TypeScript files (saw ${entry.name})`);
      let text = readFileSync(join(KERNEL_SOURCE, entry.name), "utf8");
      if (ablation !== null && entry.name === ablation.file) {
        assert.equal(occurrences(text, ablation.anchor), 1, `${ablation.id}: the anchor occurs exactly once in ${ablation.file}`);
        text = text.replace(ablation.anchor, () => ablation.edit);
        assert.equal(occurrences(text, ablation.anchor), 0);
      }
      writeFileSync(join(directory, entry.name), text);
    }
    if (ablation !== null) assert.ok(files.some((entry) => entry.name === ablation.file), `${ablation.id}: ${ablation.file} exists`);

    let candidateModule = moduleUrl("./kernel-candidate.ts");
    if (adapterEdit !== null) {
      // The copy keeps the candidate's own layout, so its relative imports and its package-root import
      // resolve as they do in the tree. The link is the workspace's: the unedited Kernel package. The
      // candidate under test never uses it, because the entry hands it the copy's coordinator.
      const candidateCopy = join(root, "tests/conformance/k0-candidate");
      mkdirSync(candidateCopy, { recursive: true });
      mkdirSync(join(root, "tests/conformance/k0"), { recursive: true });
      mkdirSync(join(root, "node_modules/@arrokothi"), { recursive: true });
      symlinkSync(resolve(REPO_ROOT, "packages/kernel"), join(root, "node_modules/@arrokothi/kernel"), "dir");
      cpSync(resolve(HERE, "../k0/fixture.ts"), join(root, "tests/conformance/k0/fixture.ts"));
      for (const name of ["canonical-json.ts", "fake-driver.ts", "kernel-candidate.ts"]) {
        let text = readFileSync(join(HERE, name), "utf8");
        if (name === adapterEdit.file) {
          assert.equal(occurrences(text, adapterEdit.anchor), 1, `the adapter anchor occurs exactly once in ${adapterEdit.file}`);
          text = text.replace(adapterEdit.anchor, () => adapterEdit.edit);
        }
        writeFileSync(join(candidateCopy, name), text);
      }
      candidateModule = JSON.stringify("./tests/conformance/k0-candidate/kernel-candidate.ts");
    }

    const entry = join(root, "run.mjs");
    writeFileSync(entry, entryText(candidateModule));
    const printed = execFileSync(process.execPath, ["--experimental-strip-types", "--no-warnings", entry, ...scenarioIds], { encoding: "utf8" });
    const run = JSON.parse(printed) as ChildRun;
    assert.deepEqual(run.results.map((result) => result.scenarioId), scenarioIds);
    return run;
  }

  const runOver = (ablation: Ablation | null, scenarioId: string): ScenarioResult => runAll(ablation, [scenarioId]).results[0] as ScenarioResult;

  test("the table has one row per decision family and uses supported schedules only", () => {
    assert.deepEqual(ABLATIONS.map((ablation) => ablation.id), ["ABL-1", "ABL-2", "ABL-3", "ABL-4", "ABL-5"]);
    assert.equal(new Set(ABLATIONS.map((ablation) => ablation.scenarioId)).size, 5);
    for (const ablation of ABLATIONS) {
      const scenario = scenarioById(ablation.scenarioId);
      assert.ok(ablation.step < scenario.steps.length, `${ablation.id}: step ${ablation.step} exists`);
      assert.equal(
        scenario.steps.some((step) => step.command.kind === "accept_event" && step.command.event.category !== "application_input"),
        false,
        `${ablation.id}: its schedule is one the candidate runs, not one it refuses`,
      );
    }
  });

  test("an unedited copy of the Kernel source passes every witness schedule", () => {
    for (const ablation of ABLATIONS) {
      const result = runOver(null, ablation.scenarioId);
      assert.deepEqual(
        result,
        { outcome: "PASS", scenarioId: ablation.scenarioId, candidate: "arrokothi-kernel-coordinator", steps: scenarioById(ablation.scenarioId).steps.length },
        `${ablation.scenarioId} passes on the unedited copy`,
      );
    }
  });

  for (const ablation of ABLATIONS) {
    test(`${ablation.id} (${ablation.file}): ${ablation.scenarioId} fails at step ${ablation.step} in ${ablation.fields.join(", ")}`, () => {
      const result = runOver(ablation, ablation.scenarioId);
      assert.equal(result.outcome, "FAIL", `${ablation.id}: removing "${ablation.obligation}" must be seen`);
      const failures = (result as Extract<ScenarioResult, { outcome: "FAIL" }>).failures;
      // First failure at the target step, every listed field named, the row's observed text, no throw.
      assert.deepEqual(killProblems(ablation, failures), [], `${ablation.id}: the edited Kernel did what the row says`);
    });
  }

  // -- The registry runs the same rows (owner choice 03; review 01 K14C-R01-02) ------------------------

  interface RegistryCase {
    readonly id: string;
    readonly category?: string;
    readonly assertion: string;
    readonly argv?: readonly string[];
    readonly files: readonly string[];
    readonly failure_exit?: number;
    readonly input: Record<string, unknown>;
    readonly claim?: { readonly kind: string; readonly owner: string };
    readonly mutants: readonly { readonly path?: string; readonly before?: string; readonly after?: string; readonly obligation?: string }[];
  }
  const registered = (): RegistryCase[] =>
    (JSON.parse(readFileSync(resolve(REPO_ROOT, REGISTRY), "utf8")) as { cases: RegistryCase[] }).cases.filter(
      (entry) => entry.category === "k14-candidate-ablation" || entry.id.startsWith("k14-candidate.abl-"),
    );
  const caseId = (ablation: Ablation): string => `k14-candidate.${ablation.id.toLowerCase()}`;
  const testTitle = (ablation: Ablation): string =>
    `${ablation.id} (${ablation.file}): ${ablation.scenarioId} fails at step ${ablation.step} in ${ablation.fields.join(", ")}`;

  test("the mutation registry holds exactly these five rows, each with its row's edit and rejecting test", () => {
    const cases = registered();
    assert.deepEqual(cases.map((entry) => entry.id), ABLATIONS.map(caseId));
    for (const [index, ablation] of ABLATIONS.entries()) {
      const entry = cases[index] as RegistryCase;
      assert.equal(entry.category, "k14-candidate-ablation");
      assert.equal(entry.assertion, `${caseId(ablation)}.killed`);
      assert.deepEqual(entry.argv, ["node", "--no-warnings", "--experimental-strip-types", PROBE, ablation.id, "--link-workspace-kernel"]);
      assert.equal(entry.failure_exit, 17);
      assert.deepEqual(
        entry.mutants.map((mutant) => [mutant.path, mutant.before, mutant.after, mutant.obligation]),
        [[`packages/kernel/src/${ablation.file}`, ablation.anchor, ablation.edit, ablation.obligation]],
        `${ablation.id}: the registered mutant is the row's one edit`,
      );
      assert.deepEqual(entry.input, {
        ablation: ablation.id,
        site: `packages/kernel/src/${ablation.file}`,
        obligation: ablation.obligation,
        scenario: ablation.scenarioId,
        step: ablation.step,
        fields: ablation.fields,
        observed: ablation.observed.source,
        rejecting_test: `tests/conformance/k0-candidate/ablations.test.ts > K1.4-candidate KC-1: removing a Kernel decision turns its witness schedule to FAIL > ${testTitle(ablation)}`,
      });
      // A registry kill of these rows is a mechanism witness: it claims no conformance credit.
      assert.deepEqual([entry.claim?.kind, entry.claim?.owner], ["mechanism_witness", "K1.4-candidate"]);
      // The case names every file its run loads from this tree, apart from the shared Kernel source.
      for (const name of [PROBE, "packages/kernel/package.json", "tests/conformance/k0/fixture.ts", "tests/conformance/k0/scenarios.ts", "tests/conformance/k0/operation-sink.ts"]) {
        assert.ok(entry.files.includes(name), `${ablation.id}: the case lists ${name}`);
      }
      for (const name of ["ablation-table.ts", "canonical-json.ts", "fake-driver.ts", "kernel-candidate.ts"]) {
        assert.ok(entry.files.includes(`tests/conformance/k0-candidate/${name}`), `${ablation.id}: the case lists ${name}`);
      }
    }
    const coverage = JSON.parse(readFileSync(resolve(REPO_ROOT, COVERAGE), "utf8")) as {
      negative_categories: string[];
      families: { id: string; cases: { case: string }[] }[];
    };
    assert.ok(coverage.negative_categories.includes("k14-candidate-ablation"));
    assert.deepEqual(coverage.families.find((family) => family.id === "k14-candidate")?.cases.map((entry) => entry.case), ABLATIONS.map(caseId));
  });

  test("the registry's probe passes each row's schedule in this tree and refuses a row it does not know", () => {
    const probe = (id: string): string =>
      execFileSync(process.execPath, ["--no-warnings", "--experimental-strip-types", PROBE, id], { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    for (const ablation of ABLATIONS) {
      assert.deepEqual(JSON.parse(probe(ablation.id)), {
        case: caseId(ablation),
        assertion: `${caseId(ablation)}.killed`,
        reached: true,
        passed: true,
        scenario: ablation.scenarioId,
        steps: scenarioById(ablation.scenarioId).steps.length,
      });
    }
    assert.throws(() => probe("ABL-0"), (error: { status?: number; stderr?: string }) => error.status === 1 && /Unknown ablation/.test(error.stderr ?? ""));
  });

  // -- Review 01's latest-grant adapter mutant -----------------------------------------------------------

  test("the latest-grant adapter mutant passes all twelve schedules, and only the grants it presents differ", () => {
    const ids = ALL_SCENARIOS.map((scenario) => scenario.id);
    const outcomes = (run: ChildRun): string[] => run.results.map((result) => `${result.scenarioId}: ${result.outcome}`);
    const real = runAll(null, ids);
    const mutant = runAll(null, ids, LATEST_GRANT);
    assert.deepEqual(outcomes(mutant), outcomes(real), "the fifteen verdicts cannot tell the mutant from the candidate");
    assert.equal(mutant.results.filter((result) => result.outcome === "PASS").length, 12);
    assert.equal(mutant.results.filter((result) => result.outcome === "REFUSED").length, 3);

    // The candidate presents the attempt's own grant, or no grant at all (epoch 0). The mutant presents a
    // newer grant with an older proposal, which the Kernel's earlier epoch check happens to mask.
    const repaired = (run: ChildRun): Presented[] => run.presented.filter((row) => row.grantEpoch > row.submittedEpoch);
    assert.deepEqual(repaired(real), []);
    assert.ok(repaired(mutant).length > 0, "the mutant presented a newer grant for a superseded attempt");
  });

  test("ABL-2 rejects the latest-grant adapter mutant: its stale Outcome is no longer refused by the grant", () => {
    const row = ABLATIONS.find((ablation) => ablation.id === "ABL-2") as Ablation;
    const real = runAll(row, [row.scenarioId]).results[0] as ScenarioResult;
    assert.equal(real.outcome, "FAIL");
    assert.deepEqual(killProblems(row, (real as Extract<ScenarioResult, { outcome: "FAIL" }>).failures), []);

    const mutant = runAll(row, [row.scenarioId], LATEST_GRANT).results[0] as ScenarioResult;
    assert.equal(mutant.outcome, "FAIL");
    const failures = (mutant as Extract<ScenarioResult, { outcome: "FAIL" }>).failures;
    const problems = killProblems(row, failures);
    assert.ok(
      problems.some((problem) => problem.startsWith("the failure does not match")),
      `with the epoch check removed, the mutant's repaired grant lets the stale Outcome through, so ABL-2's expected ` +
        `unauthorized_submission is absent: ${JSON.stringify(problems)}`,
    );
    const detail = failures.map((failure) => failure.detail).join("\n");
    assert.doesNotMatch(detail, /observed unauthorized_submission/);
    assert.doesNotMatch(detail, /candidate threw/);
  });
});
