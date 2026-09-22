/**
 * K0.2-C1..C6 in aggregate: every K0 boundary *obligation* is actually observed, and observing it
 * actually discriminates.
 *
 * Round-1 review finding K02-R1-01: the previous version of this file proved only that each §11 row
 * number pointed at a scenario that existed. A row can hold several distinguishing obligations, so
 * that check passed while most of row 1, row 2, row 5(c)/(e) and all of row 8's completion clause went
 * untested. The unit is now the obligation, and an obligation is only covered when the oracle can be
 * shown to *reject* a candidate that gets it wrong.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BOUNDARY_ROWS, COUPLED_FIELD_GROUPS, K0_OBLIGATIONS } from "./coverage.ts";
import { VIOLATIONS, violatingCandidate } from "./candidate.ts";
import { createOperationSink } from "./operation-sink.ts";
import { runScenario } from "./fixture.ts";
import { ALL_SCENARIOS } from "./scenarios.ts";

const scenarioById = new Map(ALL_SCENARIOS.map((scenario) => [scenario.id, scenario]));
const violationById = new Map(VIOLATIONS.map((violation) => [violation.id, violation]));
const HERE = dirname(fileURLToPath(import.meta.url));

describe("K0 boundary coverage: structure", () => {
  test("all ten §11 rows are present exactly once, in order", () => {
    assert.deepEqual(BOUNDARY_ROWS.map((entry) => entry.row), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  test("every row carries at least one obligation", () => {
    for (const { row } of BOUNDARY_ROWS) {
      const obligations = K0_OBLIGATIONS.filter((entry) => entry.row === row);
      assert.ok(obligations.length > 0, `§11 row ${row} has no obligation recorded`);
    }
  });

  test("obligation IDs are unique and name their row", () => {
    const ids = K0_OBLIGATIONS.map((entry) => entry.id);
    assert.equal(new Set(ids).size, ids.length, "duplicate obligation ID");
    for (const entry of K0_OBLIGATIONS) {
      assert.match(entry.id, new RegExp(`^R${entry.row}-`), `${entry.id} does not name row ${entry.row}`);
      assert.ok(entry.obligation.length > 40, `${entry.id} has no substantive obligation text`);
    }
  });

  test("row 5's lettered sub-parts are each represented", () => {
    // The one row whose cell states seven separately observable things. Losing any of them silently
    // was the shape of the round-1 gap, so each letter is checked by name.
    const rowFive = K0_OBLIGATIONS.filter((entry) => entry.row === 5).map((entry) => entry.obligation).join(" ");
    for (const letter of ["(a)", "(b)", "(c)", "(d)", "(e)", "(f)", "(g)"]) {
      assert.ok(rowFive.includes(letter), `§11 row 5 sub-part ${letter} has no obligation`);
    }
  });

  test("row 9 is the one boundary K0.1 assigns jointly to Kernel and Runtime/Driver", () => {
    assert.deepEqual(BOUNDARY_ROWS.filter((entry) => entry.owner === "Kernel + Runtime/Driver").map((entry) => entry.row), [9]);
  });
});

describe("K0 boundary coverage: every obligation resolves to real evidence", () => {
  for (const entry of K0_OBLIGATIONS) {
    test(`${entry.id} has usable evidence`, () => {
      const evidence = entry.evidence;
      if (evidence.kind === "assigned") {
        assert.ok(/^[KR]\d/.test(evidence.packet), `${entry.id} assigns to a non-packet ${evidence.packet}`);
        assert.ok(evidence.reason.length > 80, `${entry.id} is assigned away without a substantive reason`);
        return;
      }
      if (evidence.kind === "corpus") {
        assert.ok(evidence.test.length > 10 && evidence.note.length > 40);
        return;
      }
      if (evidence.kind === "shared") {
        // A shared entry is only honest if what it points at is real candidate-level evidence, and if
        // the identity claim is written down. Round-3 review finding K02-R3-01 landed partly because
        // an obligation pointed at a neighbouring rule's transcript with nothing said about why.
        const target = K0_OBLIGATIONS.find((other) => other.id === evidence.obligation);
        assert.ok(target, `${entry.id} shares evidence with unknown obligation ${evidence.obligation}`);
        assert.equal(
          target.evidence.kind,
          "scenario",
          `${entry.id} shares evidence with ${evidence.obligation}, which carries no scenario evidence of its own`,
        );
        assert.notEqual(target.row, entry.row, `${entry.id} shares evidence within its own row, which is a missing split rather than one fact seen twice`);
        assert.ok(evidence.reason.length > 80, `${entry.id} shares evidence without justifying the identity`);
        return;
      }
      const scenario = scenarioById.get(evidence.scenario);
      assert.ok(scenario, `${entry.id} names unknown scenario ${evidence.scenario}`);
      assert.ok(
        evidence.stepIndex >= 0 && evidence.stepIndex < scenario.steps.length,
        `${entry.id} names step ${evidence.stepIndex}, but ${scenario.id} has ${scenario.steps.length} steps`,
      );
      assert.ok(evidence.counterexamples.length > 0, `${entry.id} is observed but carries no counterexample`);
    });
  }
});

describe("K0 boundary coverage: every counterexample actually discriminates", () => {
  for (const entry of K0_OBLIGATIONS) {
    if (entry.evidence.kind !== "scenario") continue;
    const evidence = entry.evidence;
    for (const violationId of evidence.counterexamples) {
      test(`${entry.id} is defended by ${violationId}`, () => {
        const violation = violationById.get(violationId);
        assert.ok(violation, `${entry.id} names unknown violation ${violationId}`);
        assert.equal(
          violation.scenarioId,
          evidence.scenario,
          `${violationId} runs against ${violation.scenarioId}, but ${entry.id} is observed in ${evidence.scenario}`,
        );

        // The counterexample must be rejected, and rejected at the step the obligation lives at —
        // otherwise it defends some other obligation and this one is still unguarded.
        const scenario = scenarioById.get(evidence.scenario)!;
        const bundle = createOperationSink();
        const result = runScenario(violatingCandidate(violation), scenario, bundle);
        assert.equal(result.outcome, "FAIL", `${violationId} was accepted by the oracle`);
        if (result.outcome !== "FAIL") return;
        assert.ok(
          result.failures.some((failure) => failure.stepIndex === evidence.stepIndex),
          `${violationId} failed at steps ${result.failures.map((f) => f.stepIndex).join(",")}, not at ${entry.id}'s step ${evidence.stepIndex}`,
        );
      });
    }
  }
});

describe("K0 boundary coverage: the corpus is fully accounted for", () => {
  test("every scenario is referenced by at least one obligation: none is dead weight", () => {
    const referenced = new Set(
      K0_OBLIGATIONS.flatMap((entry) => (entry.evidence.kind === "scenario" ? [entry.evidence.scenario] : [])),
    );
    for (const scenario of ALL_SCENARIOS) {
      assert.ok(referenced.has(scenario.id), `${scenario.id} is not referenced by any obligation`);
    }
  });

  test("every scenario's declared rows are rows an obligation actually observes it at", () => {
    // A shared entry resolves to the scenario its target names: the obligation really is observed in
    // that scenario, just through a transcript another row also relies on. Resolving the reference
    // here rather than treating shared evidence as no evidence keeps the attribution truthful in both
    // directions — this check exists because row attribution had silently drifted in round 1.
    const scenarioOf = (entry: (typeof K0_OBLIGATIONS)[number]): string | null => {
      const evidence = entry.evidence;
      if (evidence.kind === "scenario") return evidence.scenario;
      if (evidence.kind !== "shared") return null;
      const target = K0_OBLIGATIONS.find((other) => other.id === evidence.obligation);
      return target !== undefined && target.evidence.kind === "scenario" ? target.evidence.scenario : null;
    };
    for (const scenario of ALL_SCENARIOS) {
      for (const row of scenario.k0BoundaryRows) {
        const observing = K0_OBLIGATIONS.filter((entry) => entry.row === row && scenarioOf(entry) === scenario.id);
        assert.ok(observing.length > 0, `${scenario.id} claims row ${row} but no obligation observes it there`);
      }
    }
  });

  test("and the reverse: every row the map attributes to a scenario is a row that scenario declares", () => {
    // The other direction of the same agreement, which round 3 added after the one-directional check
    // let a stale claim survive: `control-cancel-versus-complete` went on declaring row 10 after its
    // row-10 attribution moved elsewhere. Drift can appear on either side, so both are checked.
    for (const entry of K0_OBLIGATIONS) {
      const evidence = entry.evidence;
      if (evidence.kind !== "scenario") continue;
      const scenario = scenarioById.get(evidence.scenario);
      assert.ok(scenario, `${entry.id} names unknown scenario ${evidence.scenario}`);
      assert.ok(
        scenario.k0BoundaryRows.includes(entry.row),
        `${entry.id} attributes row ${entry.row} to ${scenario.id}, which declares rows ${scenario.k0BoundaryRows.join(",")}`,
      );
    }
  });

  test("every violating transcript names the governing rule its behaviour breaks", () => {
    // Round-2 finding K02-R2-01: an invalid counterexample reached the corpus because nothing required
    // its author to name the rule being broken. A transcript that cannot cite one is a preference, not
    // a counterexample, and failing a candidate for it makes the oracle reject conforming work.
    for (const violation of VIOLATIONS) {
      assert.ok(
        violation.forbiddenBy.length > 30,
        `violation ${violation.id} does not name the governing rule it breaks`,
      );
      assert.match(
        violation.forbiddenBy,
        // No \b around the alternatives: "§11" begins with a non-word character, so a leading word
        // boundary there can never match.
        /(?:OA|CX|W|B|E|EF|PC|ID|LP)-\d|§11|execution-protocol\.md|kernel\.md|mental-model\.md|Decision M-1/,
        `violation ${violation.id} cites no identifiable governing decision: ${violation.forbiddenBy}`,
      );
    }
  });

  test("no counterexample defends two obligations: each assertion has evidence of its own", () => {
    // The structural guard against round-3 review finding K02-R3-01 recurring. That finding's shape
    // was a counterexample doing double duty — LP-1's freshness assertion "covered" by a cancellation
    // atomicity failure — which passes every other check here while leaving the assertion unguarded.
    // Where two §11 rows genuinely name one fact, the `shared` evidence kind records it explicitly and
    // is checked above; reuse by accident is what this forbids.
    const owner = new Map<string, string>();
    for (const entry of K0_OBLIGATIONS) {
      if (entry.evidence.kind !== "scenario") continue;
      for (const violationId of entry.evidence.counterexamples) {
        const existing = owner.get(violationId);
        assert.equal(
          existing,
          undefined,
          `${violationId} defends both ${existing} and ${entry.id}; if they are the same assertion say so with shared evidence, otherwise one of them needs its own counterexample`,
        );
        owner.set(violationId, entry.id);
      }
    }
  });

  test("an entry whose counterexamples cross coupled field groups declares why it is still one assertion", () => {
    // Round-4 review finding K02-R4-02. The round-3 guard above catches a transcript defending two
    // entries; it is blind to the opposite failure, one entry holding two independently violable
    // assertions, and the review found four of those. Prose cannot be checked mechanically, but the
    // *fields the counterexamples actually move* can: crossing more than one coupled group is the
    // signal that an entry may be bundling, and the author must then say in writing why one plausible
    // bug produces all of it. That does not prove atomicity — nothing here can — but it converts a
    // silent assumption into a reviewable claim, which is the same remedy `forbiddenBy` applies to
    // counterexamples.
    const groupOf = (field: string) =>
      COUPLED_FIELD_GROUPS.find((group) => group.fields.includes(field))?.name ?? field;

    for (const entry of K0_OBLIGATIONS) {
      if (entry.evidence.kind !== "scenario") continue;
      const scenario = scenarioById.get(entry.evidence.scenario)!;
      const expected = scenario.steps[entry.evidence.stepIndex]!.expect.observation;
      const groups = new Set<string>();
      for (const violationId of entry.evidence.counterexamples) {
        const violation = violationById.get(violationId);
        assert.ok(violation, `${entry.id} names unknown violation ${violationId}`);
        const mutated = violation.mutate(expected);
        for (const key of Object.keys(expected) as (keyof typeof expected)[]) {
          if (JSON.stringify(expected[key]) !== JSON.stringify(mutated[key])) groups.add(groupOf(key));
        }
      }
      if (groups.size <= 1) continue;
      assert.ok(
        entry.atomicity !== undefined && entry.atomicity.length > 80,
        `${entry.id}'s counterexamples move ${groups.size} coupled field groups (${[...groups].join(", ")}); either it is holding more than one independently violable assertion and needs splitting, or it needs an \`atomicity\` note saying why one bug produces all of them`,
      );
    }
  });

  test("no two counterexamples at one step move the same set of fields: a split must produce distinct evidence", () => {
    // The other half of round-4 review finding K02-R4-02. Splitting a bundled entry is only real if
    // the two transcripts discriminate different things; two names for the same mutation would satisfy
    // every other check here — one counterexample per entry, each failing at the right step — while
    // leaving the second assertion exactly as unguarded as before. Field sets are the mechanical
    // signal: at a given step, two transcripts that move precisely the same fields are doing one job.
    const byStep = new Map<string, { id: string; fields: string }[]>();
    for (const violation of VIOLATIONS) {
      const scenario = scenarioById.get(violation.scenarioId);
      assert.ok(scenario, `${violation.id} names unknown scenario ${violation.scenarioId}`);
      const expected = scenario.steps[violation.stepIndex]?.expect.observation;
      assert.ok(expected, `${violation.id} names step ${violation.stepIndex}, which does not exist`);
      const mutated = violation.mutate(expected);
      const fields = (Object.keys(expected) as (keyof typeof expected)[])
        .filter((key) => JSON.stringify(expected[key]) !== JSON.stringify(mutated[key]))
        .join(",");
      const key = `${violation.scenarioId}#${violation.stepIndex}`;
      const bucket = byStep.get(key) ?? [];
      // A transcript caught only by the independent ledger changes no observation field at all; that is
      // its whole design, so it is exempt rather than a collision.
      if (fields.length > 0) {
        const clash = bucket.find((other) => other.fields === fields);
        assert.equal(
          clash,
          undefined,
          `${violation.id} and ${clash?.id} both move exactly [${fields}] at ${key}; if they are meant to discriminate different assertions one of them is not narrow enough`,
        );
        bucket.push({ id: violation.id, fields });
      }
      byStep.set(key, bucket);
    }
  });

  test("the coupling table is well formed: no field in two groups, every group justified", () => {
    const seen = new Set<string>();
    for (const group of COUPLED_FIELD_GROUPS) {
      assert.ok(group.fields.length > 1, `coupled group ${group.name} couples nothing`);
      assert.ok(group.because.length > 60, `coupled group ${group.name} does not cite why the fields move together`);
      for (const field of group.fields) {
        assert.ok(!seen.has(field), `${field} appears in two coupled groups, which makes the reduction ambiguous`);
        seen.add(field);
      }
    }
  });

  test("every violating transcript defends a recorded obligation", () => {
    // A violation nobody relies on is either a coverage gap in this map or dead code; both matter.
    const relied = new Set(
      K0_OBLIGATIONS.flatMap((entry) => (entry.evidence.kind === "scenario" ? entry.evidence.counterexamples : [])),
    );
    for (const violation of VIOLATIONS) {
      assert.ok(relied.has(violation.id), `violation ${violation.id} defends no obligation in the coverage map`);
    }
  });

  test("no part of the fixture claims a remote-revocation freshness guarantee", async () => {
    // Obligation R10-b, enforced across the corpus rather than at a step: LP-2's decision at K0/K1 is
    // the negative one, so what has to be checked is that nothing here quietly asserts the positive.
    // This file is excluded: it necessarily contains the pattern it searches for, and a scanner that
    // matches its own detector proves nothing about the corpus.
    const fixtureFiles = (await readdir(HERE)).filter((name) => name.endsWith(".ts") && name !== "coverage.test.ts");
    const specPath = resolve(HERE, "../../../tests/fixtures/k0/public-fixture-specification.md");
    const sources = await Promise.all([
      ...fixtureFiles.map((name) => readFile(resolve(HERE, name), "utf8")),
      readFile(specPath, "utf8"),
    ]);

    const claimsFreshness = /\b(instantaneous|immediately\s+fresh|instantly\s+revoked)\b[^.]*\b(revocation|revoked|remote)\b/i;
    for (const [index, source] of sources.entries()) {
      const name = index < fixtureFiles.length ? fixtureFiles[index] : "public-fixture-specification.md";
      for (const line of source.split("\n")) {
        // The prohibition is on asserting the guarantee, not on naming it in order to disclaim it.
        if (/\bnot\b|\bnever\b|\bno\b|cannot|must not/i.test(line)) continue;
        assert.ok(!claimsFreshness.test(line), `${name} appears to assert remote-revocation freshness: ${line.trim()}`);
      }
    }
  });
});
