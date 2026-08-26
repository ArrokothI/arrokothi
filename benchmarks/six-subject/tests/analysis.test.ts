// Tests for the FINAL AGGREGATION + AUDIT script (2026-08-23). Covers the pure, offline-testable
// aggregation helpers plus a read-only integration check against the already-materialized
// v2-six-subject-run-1 analysis/ output on disk. No network, no Gemini call.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";
import {
  canonicalPairLabel,
  clusterBootstrapMean,
  mulberry32,
  scoreDistribution,
  splitKey,
  stats,
  tally,
} from "../src/analyze.ts";
import { computeAggregateSha256 } from "../src/judge/materialize.ts";

const SEP = String.fromCharCode(0); // the same NUL separator used by analyze.ts's composite grouping keys

describe("analysis: splitKey -- composite grouping key round-trip", () => {
  test("splits a well-formed SEP-joined key", () => {
    assert.deepEqual(splitKey(`p01${SEP}p01-original`), ["p01", "p01-original"]);
  });
  test("throws on a malformed key (missing separator)", () => {
    assert.throws(() => splitKey("p01"));
  });
  test("throws on an empty half", () => {
    assert.throws(() => splitKey(`${SEP}p01-original`));
    assert.throws(() => splitKey(`p01${SEP}`));
  });
});

describe("analysis: tally -- deterministic outcome distribution", () => {
  test("pass/hard_fail/soft_fail/not_applicable-excluded/inconclusive denominators are as documented", () => {
    const t = tally(["pass", "pass", "hard_fail", "inconclusive", "not_applicable"]);
    assert.equal(t.tally.pass, 2);
    assert.equal(t.tally.hard_fail, 1);
    assert.equal(t.tally.inconclusive, 1);
    assert.equal(t.tally.not_applicable, 1);
    // denominator = pass+hard_fail+soft_fail = 3 (not_applicable and inconclusive excluded)
    assert.equal(t.passRate, 2 / 3);
    assert.equal(t.hardFailRate, 1 / 3);
    // inconclusiveRate denominator = 3 + 1 = 4
    assert.equal(t.inconclusiveRate, 1 / 4);
  });

  test("empty input returns null rates, not NaN or a divide-by-zero", () => {
    const t = tally([]);
    assert.equal(t.passRate, null);
    assert.equal(t.hardFailRate, null);
    assert.equal(t.inconclusiveRate, null);
  });

  test("all not_applicable: denominator is 0, passRate is null (not 0/0-as-1 or similar)", () => {
    const t = tally(["not_applicable", "not_applicable"]);
    assert.equal(t.passRate, null);
    assert.equal(t.tally.not_applicable, 2);
  });
});

describe("analysis: scoreDistribution -- semantic 0/1/2 distribution", () => {
  test("counts and mean are computed correctly, mean explicitly labeled descriptive-only", () => {
    const d = scoreDistribution([{ score: 2 }, { score: 2 }, { score: 0 }, { score: 1 }]);
    assert.equal(d.total, 4);
    assert.equal(d.score2.count, 2);
    assert.equal(d.score0.count, 1);
    assert.equal(d.score1.count, 1);
    assert.equal(d.meanRequirementScoreDescriptiveOnly, (2 + 2 + 0 + 1) / 4);
  });

  test("empty input returns null mean and null rates, not NaN", () => {
    const d = scoreDistribution([]);
    assert.equal(d.meanRequirementScoreDescriptiveOnly, null);
    assert.equal(d.score2.rate, null);
  });
});

describe("analysis: canonicalPairLabel -- fixed non-randomized pair identity", () => {
  test("original < agenerateor < arrokothai regardless of input order", () => {
    const a = canonicalPairLabel("p01-arrokothai", "p01-original");
    assert.equal(a.label, "original-vs-arrokothai");
    assert.equal(a.left, "p01-original");
    assert.equal(a.right, "p01-arrokothai");

    const b = canonicalPairLabel("p01-original", "p01-arrokothai"); // already in canonical order
    assert.deepEqual(a, b); // same canonical result regardless of call-site argument order
  });

  test("agenerateor-vs-arrokothai in either input order", () => {
    const a = canonicalPairLabel("p02-arrokothai", "p02-agenerateor");
    assert.equal(a.label, "agenerateor-vs-arrokothai");
    assert.equal(a.left, "p02-agenerateor");
    assert.equal(a.right, "p02-arrokothai");
  });
});

describe("analysis: stats -- mean/median/min/max/quartiles", () => {
  test("computes correct summary stats for a known array", () => {
    const s = stats([1, 2, 3, 4, 5]);
    assert.equal(s.mean, 3);
    assert.equal(s.median, 3);
    assert.equal(s.min, 1);
    assert.equal(s.max, 5);
    assert.equal(s.n, 5);
  });

  test("empty input returns nulls, not NaN/Infinity", () => {
    const s = stats([]);
    assert.equal(s.mean, null);
    assert.equal(s.median, null);
    assert.equal(s.n, 0);
  });
});

describe("analysis: mulberry32 -- deterministic PRNG", () => {
  test("the same seed always produces the same sequence", () => {
    const seqA = Array.from({ length: 5 }, mulberry32(20260823));
    const seqB = Array.from({ length: 5 }, mulberry32(20260823));
    assert.deepEqual(seqA, seqB);
  });

  test("different seeds produce different sequences", () => {
    const a = mulberry32(1)();
    const b = mulberry32(2)();
    assert.notEqual(a, b);
  });

  test("all outputs are in [0, 1)", () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      assert.ok(v >= 0 && v < 1, `value ${v} out of range`);
    }
  });
});

describe("analysis: clusterBootstrapMean -- deterministic, scenario-clustered", () => {
  test("the same seed and clusters always reproduce the same mean and CI", () => {
    const clusters = [[1, 1, 0], [0, 0], [1, 1, 1, 0]];
    const a = clusterBootstrapMean(clusters, 20260823, 500);
    const b = clusterBootstrapMean(clusters, 20260823, 500);
    assert.deepEqual(a, b);
  });

  test("observed mean is the flat mean across all clusters, independent of the bootstrap resampling", () => {
    const clusters = [[1, 1], [0, 0]];
    const result = clusterBootstrapMean(clusters, 1, 200);
    assert.equal(result.mean, 0.5);
  });

  test("empty clusters array returns NaN mean and [NaN, NaN] CI, not a crash", () => {
    const result = clusterBootstrapMean([], 1, 100);
    assert.ok(Number.isNaN(result.mean));
    assert.ok(Number.isNaN(result.ci95[0]) && Number.isNaN(result.ci95[1]));
  });

  test("a different seed can produce a different (but still valid) CI for the same clusters", () => {
    const clusters = [[1, 0], [1, 1], [0, 0], [1, 0]];
    const a = clusterBootstrapMean(clusters, 1, 500);
    const b = clusterBootstrapMean(clusters, 2, 500);
    assert.equal(a.mean, b.mean); // observed mean is seed-independent
    assert.equal(a.clusters, 4);
  });
});

describe("final analysis: against the real materialized analysis/ output on disk (read-only)", () => {
  const RESULTS = [import.meta.dirname, "..", "..", "runs", "v2-six-subject-run-1", "analysis"].join("/");

  test("the freeze manifest's own aggregate hash matches an independent recomputation from its own fileHashes list", async () => {
    let manifest: { fileHashes: { path: string; sha256: string }[]; aggregateSha256: string; counts: Record<string, number> };
    try {
      manifest = JSON.parse(await readFile(`${RESULTS}/final-analysis-freeze.v1.json`, "utf8"));
    } catch {
      return; // analysis/ not yet materialized in this checkout -- nothing to check
    }
    assert.equal(computeAggregateSha256(manifest.fileHashes), manifest.aggregateSha256);
    // The freeze manifest must never include itself in its own file-hash list (self-reference).
    assert.ok(!manifest.fileHashes.some((f) => f.path.endsWith("final-analysis-freeze.v1.json")));
    assert.equal(manifest.counts.deterministicRuns, 369);
    assert.equal(manifest.counts.semanticRuns, 369);
    assert.equal(manifest.counts.pairwiseComparisons, 369);
    assert.equal(manifest.counts.rawSubjectRuns, 369);
  });

  test("aggregate-results.json totals are internally consistent with deterministic-summary.json / semantic-summary.json", async () => {
    let aggregate: any, det: any, sem: any;
    try {
      aggregate = JSON.parse(await readFile(`${RESULTS}/aggregate-results.json`, "utf8"));
      det = JSON.parse(await readFile(`${RESULTS}/deterministic-summary.json`, "utf8"));
      sem = JSON.parse(await readFile(`${RESULTS}/semantic-summary.json`, "utf8"));
    } catch {
      return;
    }
    assert.deepEqual(aggregate.deterministicHeadline, det.byApplicationImplementation);
    assert.deepEqual(aggregate.semanticHeadline, sem.byApplicationImplementation);
    assert.equal(det.byApplicationImplementation.length, 6); // 2 apps x 3 implementations
  });
});
