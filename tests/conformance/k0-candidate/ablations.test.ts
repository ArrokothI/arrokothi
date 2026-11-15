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
 * The rows are data: site, obligation and the test that rejects it (012 § Maintained corpus and mutation
 * registry). They are a maintained test and not cases of `tests/fixtures/packet-tools/mutations.json`;
 * the addendum records that as a deviation.
 *
 * Kernel source is read and copied, never edited in place. Each copy is loaded in a child process from
 * a generated entry file whose imports are literal paths, so no source in this tree holds a non-literal
 * import and the K1.0 literal-import guard is unchanged. This file is test-side: the candidate's
 * implementation files import no `node:` module (`boundary.test.ts`).
 */

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import type { Scenario, ScenarioResult } from "../k0/fixture.ts";
import { ALL_SCENARIOS } from "../k0/scenarios.ts";

const HERE = import.meta.dirname;
const KERNEL_SOURCE = resolve(HERE, "../../../packages/kernel/src");
const moduleUrl = (relative: string): string => JSON.stringify(pathToFileURL(resolve(HERE, relative)).href);

/**
 * The entry file written beside each Kernel copy. It runs one scenario through the fixture's unmodified
 * runner, with the candidate built over the copy's `ExecutionCoordinator`, and prints the result.
 */
const ENTRY = [
  'import { ExecutionCoordinator } from "./kernel/index.ts";',
  `import { createKernelCandidate } from ${moduleUrl("./kernel-candidate.ts")};`,
  `import { runScenario } from ${moduleUrl("../k0/fixture.ts")};`,
  `import { createOperationSink } from ${moduleUrl("../k0/operation-sink.ts")};`,
  `import { ALL_SCENARIOS } from ${moduleUrl("../k0/scenarios.ts")};`,
  "const scenario = ALL_SCENARIOS.find((candidate) => candidate.id === process.argv[2]);",
  'if (scenario === undefined) throw new Error("no such scenario");',
  "const result = runScenario(createKernelCandidate({ Coordinator: ExecutionCoordinator }), scenario, createOperationSink());",
  "process.stdout.write(JSON.stringify(result));",
  "",
].join("\n");

interface Ablation {
  readonly id: string;
  /** File under `packages/kernel/src`. */
  readonly file: string;
  /** Text that must occur exactly once in that file. */
  readonly anchor: string;
  readonly edit: string;
  /** The decision the edit removes. */
  readonly obligation: string;
  /** A schedule the candidate supports. */
  readonly scenarioId: string;
  /** 0-based step at which the runner must first fail. */
  readonly step: number;
  /** Observation fields that step's failure must name. */
  readonly fields: readonly string[];
  /** What the edited Kernel does instead, as the run showed it. */
  readonly observed: RegExp;
}

export const ABLATIONS: readonly Ablation[] = [
  {
    id: "ABL-1",
    file: "coordinator.ts",
    anchor: "const already = record.acceptedOutcome(activationId);",
    edit: "const already = null;",
    obligation: "OA-2: an exact duplicate of an accepted Outcome is answered from its record, before fresh validation",
    scenarioId: "control-duplicate-conflicting-outcome",
    step: 3,
    fields: ["rejection"],
    observed: /expected no recorded rejection, observed \{"classification":"stale_exchange"/,
  },
  {
    id: "ABL-2",
    file: "coordinator.ts",
    anchor: "if (epochForCurrency !== null && epochForCurrency !== currentEpoch) {",
    edit: "if (false) {",
    obligation: "ID-4/OA-3: a proposal at a superseded writer epoch is refused as a stale exchange",
    scenarioId: "identity-create-and-activation",
    step: 7,
    fields: ["rejection"],
    // The grant fence still holds, so the stale Outcome does not commit: only the refusal's class changes.
    observed: /rejection classification: expected stale_exchange, observed unauthorized_submission/,
  },
  {
    id: "ABL-3",
    file: "coordinator.ts",
    anchor: '    if (record.state === "CANCELLED") {\n      if (identityUsable && capture.outcome !== null) return err(this.#refuseLosing(record, activationId, capture.outcome));',
    edit: "    if (false) {\n      if (identityUsable && capture.outcome !== null) return err(this.#refuseLosing(record, activationId, capture.outcome));",
    obligation: "CX-6: a proposal for a cancelled Execution loses with the cancellation classification and its fixed reason",
    scenarioId: "control-cancel-versus-complete",
    step: 3,
    fields: ["rejection"],
    observed: /rejection classification: expected cancellation_terminal_conflict, observed terminal_destination/,
  },
  {
    id: "ABL-4",
    file: "coordinator.ts",
    anchor: "    if (readiness === null) {\n      carriedEvents = record.queuedEvents(bound);",
    edit: "    if (true) {\n      carriedEvents = record.queuedEvents(bound);",
    obligation: "B-2/B-6: after wait-ended readiness the batch is selected by the retired wait's rule, not by acceptance order",
    scenarioId: "k0-trace",
    step: 7,
    fields: ["dispatchedBatch"],
    observed: /dispatchedBatch: expected \["cont-1"\], observed \["bq-1"\]/,
  },
  {
    id: "ABL-5",
    file: "outcome.ts",
    anchor: "  if (length !== null && length > 0) {\n    appendIssue(issues, {\n      path: \"effects\",",
    edit: "  if (false) {\n    appendIssue(issues, {\n      path: \"effects\",",
    obligation: "EF-1/EF-2: an Outcome proposing an Effect is refused whole at envelope validation",
    scenarioId: "effect-refusal-and-sink-attribution",
    step: 2,
    fields: ["state", "progressRevision", "progress", "emissions", "acknowledged", "queued", "dispatchedBatch", "activationId", "receipt", "rejection"],
    observed: /state: expected "RUNNING", observed "READY"/,
  },
];

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
   * Copies the Kernel source into a fresh directory, applying at most one edit, and runs one scenario
   * against that copy in a child process. A child that cannot load or run exits non-zero, which throws
   * here: that is a broken test, never a kill.
   */
  function runOver(ablation: Ablation | null, scenarioId: string): ScenarioResult {
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
    const entry = join(root, "run.mjs");
    writeFileSync(entry, ENTRY);
    const printed = execFileSync(process.execPath, ["--experimental-strip-types", "--no-warnings", entry, scenarioId], { encoding: "utf8" });
    const result = JSON.parse(printed) as ScenarioResult;
    assert.equal(result.scenarioId, scenarioId);
    return result;
  }

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
      assert.equal(failures[0]?.stepIndex, ablation.step, `${ablation.id}: the first failure is at the target step`);
      const detail = failures
        .filter((failure) => failure.stepIndex === ablation.step)
        .map((failure) => failure.detail)
        .join("\n");
      assert.doesNotMatch(detail, /candidate threw/, `${ablation.id}: the step failed on an observation, not on a throw`);
      for (const field of ablation.fields) {
        assert.match(detail, new RegExp(`(^|[\\s;])${field}\\b`, "m"), `${ablation.id}: the failure names ${field}`);
      }
      assert.match(detail, ablation.observed, `${ablation.id}: the edited Kernel did what the row says`);
    });
  }
});
