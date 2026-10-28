/**
 * COORD-REFACTOR-01, CR1-2: the state owner's module boundary, checked over the zone's real sources.
 *
 * `KERNEL_STATE_RULES` (`boundary-policy.ts`) says who may name the mutable records, who may hold the
 * owner, and what the owner and the plans may call. Each rule must name real files and, for an importer
 * rule, match at least one edge, so a rule cannot pass by matching nothing. The must-fail fixtures inject
 * one bypass import each into an in-memory copy of the zone and require the intended rule to report it;
 * a type-only import is counted where naming is the violation and not where calling is.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { KERNEL_STATE_RULES, zoneImportEdges, zoneImportViolations, type ZoneImportRule } from "./boundary-policy.ts";
import { typeScriptFilesUnder } from "./module-graph.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const SRC = "packages/kernel/src";

const zoneSources = async (): Promise<Map<string, string>> => {
  const files = (await typeScriptFilesUnder(REPO_ROOT, SRC)).sort();
  const out = new Map<string, string>();
  for (const file of files) out.set(file, await readFile(resolve(REPO_ROOT, file), "utf8"));
  return out;
};

/** The zone with one file's text changed: `prepend` adds an import line, `drop` removes one exact line. */
const edited = (sources: Map<string, string>, file: string, change: { prepend?: string; drop?: string }): Map<string, string> => {
  const copy = new Map(sources);
  const text = copy.get(`${SRC}/${file}`);
  assert.ok(text !== undefined, file);
  if (change.drop !== undefined) {
    assert.equal(text.split(change.drop).length, 2, `${file} contains the line to drop exactly once`);
    copy.set(`${SRC}/${file}`, text.replace(change.drop, ""));
  }
  if (change.prepend !== undefined) copy.set(`${SRC}/${file}`, `${change.prepend}\n${copy.get(`${SRC}/${file}`)}`);
  return copy;
};

describe("COORD-REFACTOR-01 CR1-2: only the state owner reaches accepted state", () => {
  test("the real zone keeps every rule, and every rule matches real files and edges", async () => {
    const sources = await zoneSources();
    assert.ok(sources.size >= 18, "the zone's sources were read");
    assert.deepEqual(zoneImportViolations(sources, KERNEL_STATE_RULES), []);
    const edges = zoneImportEdges(sources);
    const into = (file: string): string[] => edges.filter((edge) => edge.to === `${SRC}/${file}`).map((edge) => edge.from).sort();
    assert.deepEqual(into("state-records.ts"), [`${SRC}/state.ts`]);
    assert.deepEqual(into("state.ts"), [`${SRC}/coordinator.ts`]);
    assert.ok(edges.some((edge) => edge.from === `${SRC}/state-records.ts` && edge.to === `${SRC}/plan.ts` && !edge.value), "a type-only import is seen, as a type edge");
    assert.ok(edges.some((edge) => edge.from === `${SRC}/state.ts` && edge.to === `${SRC}/plan.ts` && edge.value), "an import of a runtime binding is a value edge");
  });

  const fixtures: readonly { name: string; file: string; change: { prepend?: string; drop?: string }; rule: string; reports: string }[] = [
    { name: "a type-only import of a mutable record into the coordinator", file: "coordinator.ts", change: { prepend: 'import type { ExecutionRecord } from "./state-records.ts";' }, rule: "R1", reports: `${SRC}/coordinator.ts imports ${SRC}/state-records.ts` },
    { name: "the owner imported by another module", file: "outcome.ts", change: { prepend: 'import { KernelState } from "./state.ts";' }, rule: "R2", reports: `${SRC}/outcome.ts imports ${SRC}/state.ts` },
    { name: "a mutable record type named by the plan module", file: "plan.ts", change: { prepend: 'import type { MailboxEntry } from "./state-records.ts";' }, rule: "R3", reports: `${SRC}/plan.ts imports ${SRC}/state-records.ts` },
    { name: "caller observation called from the owner", file: "state.ts", change: { prepend: 'import { hostMember } from "./envelope.ts";' }, rule: "R4", reports: `${SRC}/state.ts imports ${SRC}/envelope.ts` },
    { name: "capture called from the plan module", file: "plan.ts", change: { prepend: 'import { captureOutcome } from "./outcome.ts";' }, rule: "R4", reports: `${SRC}/plan.ts imports ${SRC}/outcome.ts` },
    { name: "the owner's own import of its records removed", file: "state.ts", change: { drop: 'import type { ActivationRecord, CancellationRecord, DeliveryAttempt, ExecutionRecord, MailboxEntry, ResolvedExchange } from "./state-records.ts";\n' }, rule: "R1", reports: "so the rule matches nothing" },
  ];
  for (const fixture of fixtures) {
    test(`must fail: ${fixture.name}`, async () => {
      const found = zoneImportViolations(edited(await zoneSources(), fixture.file, fixture.change), KERNEL_STATE_RULES);
      assert.ok(found.some((violation) => violation.startsWith(`${fixture.rule}:`) && violation.includes(fixture.reports)), `expected ${fixture.rule} "${fixture.reports}"; reported: ${found.join(" | ") || "nothing"}`);
    });
  }

  test("a type-only import of caller observation into the owner is not a call path", async () => {
    const sources = edited(await zoneSources(), "state.ts", { prepend: 'import type { LocatedIssue } from "./envelope.ts";' });
    assert.deepEqual(zoneImportViolations(sources, KERNEL_STATE_RULES), []);
  });

  test("a rule naming a file that does not exist fails rather than passing vacuously", async () => {
    const rules: readonly ZoneImportRule[] = [{ id: "RX", subject: `${SRC}/no-such-module.ts`, kind: "importers", edges: "all", allowed: [], reason: "probe" }];
    const found = zoneImportViolations(await zoneSources(), rules);
    assert.ok(found.some((violation) => violation.includes("is not a zone source")));
    assert.ok(found.some((violation) => violation.includes("matches nothing")));
  });
});
