/**
 * COORD-REFACTOR-01 CR1-1 and CR1-2 at compile time, with each expected diagnostic pinned by code.
 *
 * `// @ts-expect-error` accepts any error, so each fixture here is an in-memory source in the zone's
 * directory, compiled with the repository's options, and every line marked `// expect TS<code>` must
 * report exactly that code while no unmarked line reports anything. A clean fixture builds a valid plan
 * and reads through a reader, so the controls fail for their marked reason and not for a broken setup.
 * The runtime half of the brand (private fields, forged receivers, getter-only members) is in
 * `state-plans.test.ts`.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import ts from "typescript";
import { buildZone, SOURCE_ROOT, zoneFiles } from "./zone-analysis.ts";

const PRELUDE = [
  'import type { Activation, SubmissionGrant } from "./driver.ts";',
  'import type { Receipt } from "./identity.ts";',
  'import type { DataOnly, Plan, RefusalPlan, TakeoverAccepted, TakeoverPlan } from "./plan.ts";',
  'import type { Ok } from "./result.ts";',
  'import type { RefusalRecord } from "./refusal.ts";',
  'import type { ExecutionReader, KernelState } from "./state.ts";',
  "declare const receipt: Receipt;",
  "declare const activation: Activation;",
  "declare const submission: SubmissionGrant;",
  "declare const answer: Ok<TakeoverAccepted>;",
  "declare const refusal: RefusalRecord;",
  "declare const reader: ExecutionReader;",
  "declare const owner: KernelState;",
  "type Check<T extends true> = T;",
  "",
].join("\n");

const FIXTURES: readonly { readonly name: string; readonly source: string }[] = [
  {
    name: "clean: a valid plan, a reader read and an apply",
    source: [
      'export const plan: RefusalPlan = { kind: "refusal", executionId: "x", basis: 0, refusal };',
      'export const takeover: TakeoverPlan = { kind: "takeover", executionId: "x", basis: 0, receipt, cleared: null, activation, submission, answer };',
      "export const state: string = reader.state;",
      "owner.apply(plan);",
      "export type PlansAreData = Check<[Plan] extends [DataOnly<Plan>] ? true : false>;",
    ].join("\n"),
  },
  {
    name: "a plan member that is a function",
    source: 'export const plan: Plan = { kind: "refusal", executionId: "x", basis: 0, refusal: (): number => 1 }; // expect TS2322',
  },
  {
    name: "a plan kind outside the closed union",
    source: 'export const plan: Plan = { kind: "teleport", executionId: "x", basis: 0 }; // expect TS2322',
  },
  {
    name: "a takeover plan without its grant",
    source: 'export const plan: TakeoverPlan = { kind: "takeover", executionId: "x", basis: 0, receipt, cleared: null, activation, answer }; // expect TS2741',
  },
  {
    name: "a plan type that holds a function is not data",
    source: ['type Bad = { readonly kind: "refusal"; readonly notify: () => void };', "export type Proof = Check<[Bad] extends [DataOnly<Bad>] ? true : false>; // expect TS2344"].join("\n"),
  },
  {
    name: "a write through a reader",
    source: 'reader.state = "COMPLETED"; // expect TS2540',
  },
  {
    name: "a reader constructed outside the owner",
    source: ['import { ExecutionReader as Reader } from "./state.ts"; // expect TS1485', "export const forged = new Reader(undefined as never); // expect TS1362"].join("\n"),
  },
  {
    name: "the owner's private records read from outside",
    source: "export const records = owner.#executions; // expect TS18013",
  },
  {
    name: "a mutation method the owner does not have",
    source: 'owner.write("state", "COMPLETED"); // expect TS2339',
  },
];

const fixturePath = (index: number): string => resolve(SOURCE_ROOT, `__state_type_fixture_${index}.ts`);
const overrides = new Map(FIXTURES.map((fixture, index) => [fixturePath(index), `${PRELUDE}${fixture.source}\n`]));
const zone = buildZone([...zoneFiles(), ...overrides.keys()], overrides);
const preludeLines = PRELUDE.split("\n").length - 1;

/** `line → code` for each diagnostic of one fixture, and `line → code` its markers expect. */
function diagnosticsOf(index: number): { found: string[]; expected: string[] } {
  const source = zone.program.getSourceFile(fixturePath(index));
  assert.ok(source !== undefined, "the fixture is part of the program");
  const found = [...zone.program.getSyntacticDiagnostics(source), ...zone.program.getSemanticDiagnostics(source)].map((diagnostic) => {
    const line = source.getLineAndCharacterOfPosition(diagnostic.start ?? 0).line + 1 - preludeLines;
    return `${line}: TS${diagnostic.code}`;
  });
  const expected: string[] = [];
  FIXTURES[index]!.source.split("\n").forEach((line, offset) => {
    const marker = /\/\/ expect (TS\d+)$/.exec(line);
    if (marker !== null) expected.push(`${offset + 1}: ${marker[1]}`);
  });
  return { found: [...new Set(found)].sort(), expected: expected.sort() };
}

describe("COORD-REFACTOR-01: the plan union and the owner's boundary, pinned by diagnostic code", () => {
  test("the zone itself compiles cleanly beside the fixtures", () => {
    const own = zone.program.getSourceFiles().filter((source) => zoneFiles().includes(source.fileName));
    assert.ok(own.length >= 19);
    for (const source of own) assert.deepEqual(zone.program.getSemanticDiagnostics(source).map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")), [], source.fileName);
  });

  FIXTURES.forEach((fixture, index) => {
    test(fixture.name, () => {
      const { found, expected } = diagnosticsOf(index);
      assert.deepEqual(found, expected);
    });
  });
});
