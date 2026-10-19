/**
 * K1.1-correction-03, owner decision-05 item 3: the generated corpus, a declared bounded search.
 *
 * Dimensions (from DESIGN-AUDIT-01 verdict-flips' list of dimensions earlier searches never varied):
 * refusal family (`FAMILIES`, 27, including prototype shapes Object.prototype / null / foreign chain of 1
 * and of 1,000) × nesting depth of the refusing container {1, 2, 16, 31, 32} × aliasing {distinct,
 * shared} × width {1, 8, 9, 4,096} × diagnostic band (≤ 8 details or a suffix) × root consumer
 * (`CONSUMERS`, the 11 single roots plus the eight-root eager Outcome). The full product is about
 * 6 × 10⁴ consumer runs; this file runs three declared slices of it, with no randomness:
 *
 * 1. every family × every depth × both aliasings at width 4,096 (64 for the four families whose
 *    distinct instances are each over 64 KiB or 4,096 names to build), through `captureWithWork`;
 * 2. every family × every consumer at depth 2 and width 9;
 * 3. three families (undefined element, foreign object, Proxy) × every width × every consumer.
 *
 * Each case asserts the refusal, its codes, the meter staying within B plus the one operation, and,
 * across depths, that per-position work does not change with depth. Exact whole results for the
 * maintained counterexamples are in `capture-work.test.ts` and `capture-refusals.test.ts`.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { BOUNDARY_LIMITS, canonicalize, captureWithWork, type CaptureWork, type ValueIssue } from "../src/values.ts";
import { CONSUMERS, expectedCode, FAMILIES, wrapped, type Family } from "./capture-corpus.ts";

const B = 3 * BOUNDARY_LIMITS.canonicalBytes;
const STOP_CODES = new Set(["too_many_bytes", "too_much_work"]);
const HEAVY = new Set(["long string", "long member name", "over-named array", "over-named object"]);
const DEPTHS = [1, 2, 16, 31, 32] as const;

const occurrences = (issues: readonly ValueIssue[], code: string): number =>
  issues.reduce((sum, issue) => sum + (issue.code === code ? issue.occurrences ?? 1 : 0), 0);

/** A container of `width` refused elements of `family`, at container depth `depth` (1 is the root). */
const build = (family: Family, depth: number, width: number, shared: boolean): unknown => {
  const container: unknown[] = [];
  const one = family.make(container);
  for (let index = 0; index < width; index += 1) container.push(shared ? one : family.make(container));
  return wrapped(container, depth - 1).root;
};

describe("generated corpus slice 1: family × depth × aliasing at width 4,096 (canonicalize)", () => {
  for (const family of FAMILIES) {
    for (const shared of [false, true]) {
      const width = !shared && HEAVY.has(family.name) ? 64 : 4_096;
      test(`${family.name}, ${shared ? "shared" : "distinct"}, width ${width}`, () => {
        const seen = new Map<number, CaptureWork>();
        for (const depth of DEPTHS) {
          const { result, work } = captureWithWork(build(family, depth, width, shared));
          assert.equal(result.ok, false, `refused at depth ${depth}`);
          if (result.ok) return;
          const code = expectedCode(family, depth + 1);
          for (const issue of result.issues) assert.ok(issue.code === code || STOP_CODES.has(issue.code), `depth ${depth}: unexpected ${issue.code}`);
          const counted = occurrences(result.issues, code);
          if (work.stop === "none") assert.equal(counted, width, `depth ${depth}: one refusal per position`);
          else {
            assert.ok(counted >= 1 && counted <= width, `depth ${depth}: refusals up to the stop`);
            assert.equal(occurrences(result.issues, work.stop === "bytes" ? "too_many_bytes" : "too_much_work"), 1, "exactly one stop issue");
          }
          // B plus the one operation that crosses it; the largest single listing here is 4,098 names.
          assert.ok(work.units <= B + 1 + 4_098, `depth ${depth}: ${work.units} units`);
          seen.set(depth, work);
        }
        // Per-position work does not depend on depth: between depths at which the same code is
        // reported and no stop intervened, the only difference is the enclosing singleton arrays,
        // six units each.
        const comparable = DEPTHS.filter((depth) => depth <= 31 && seen.get(depth)!.stop === "none");
        for (const depth of comparable) {
          const base = comparable[0]!;
          assert.equal(seen.get(depth)!.units - seen.get(base)!.units, 6 * (depth - base), `units at depth ${depth} vs ${base}`);
          assert.equal(seen.get(depth)!.diagnostic, seen.get(base)!.diagnostic, `diagnostics at depth ${depth}`);
        }
      });
    }
  }
});

describe("generated corpus slice 2: family × consumer at depth 2, width 9", () => {
  for (const family of FAMILIES) {
    test(family.name, () => {
      for (const consumer of CONSUMERS) {
        const root = build(family, 2, 9, true);
        const direct = canonicalize(root);
        assert.equal(direct.ok, false);
        if (direct.ok) return;
        const first = direct.issues[0]!;
        consumer.run(root, first.path, first.code, consumer.name === "canonicalize" ? first.message : null);
      }
    });
  }
});

describe("generated corpus slice 3: width × consumer for three families", () => {
  for (const name of ["undefined element", "foreign object", "Proxy"]) {
    const family = FAMILIES.find((candidate) => candidate.name === name)!;
    for (const width of [1, 8, 9, 4_096]) {
      test(`${name}, width ${width}`, () => {
        const root = build(family, 2, width, false);
        const direct = canonicalize(root);
        assert.equal(direct.ok, false);
        if (direct.ok) return;
        const code = expectedCode(family, 3);
        assert.equal(occurrences(direct.issues, code), width, "every position refused once");
        assert.equal(direct.issues.filter((issue) => issue.occurrences === undefined).length, Math.min(width, 8), "at most eight details");
        assert.deepEqual(
          direct.issues.filter((issue) => issue.occurrences !== undefined).map((issue) => [issue.code, issue.occurrences]),
          width > 8 ? [[code, width - 8]] : [],
          "the suffix counts the rest exactly",
        );
        for (const consumer of CONSUMERS) consumer.run(root, direct.issues[0]!.path, code, null);
      });
    }
  }
});
