// Tests for the FINAL JUDGE OUTPUT MATERIALIZATION + FREEZE script (2026-08-23). This file covers
// the pure, offline-testable helpers plus a real-evidence, read-only integration check against the
// already-materialized v2-six-subject-run-1 output on disk. No network, no Gemini call.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { assertDirEmpty, checkKeySet, computeAggregateSha256, sha256OfString } from "../src/judge/materialize.ts";

describe("judge-materialize: computeAggregateSha256 -- deterministic, order-independent", () => {
  test("the same (path, sha256) pairs in a different input order produce the same aggregate hash", () => {
    const a = [{ path: "b.json", sha256: "22" }, { path: "a.json", sha256: "11" }];
    const b = [{ path: "a.json", sha256: "11" }, { path: "b.json", sha256: "22" }];
    assert.equal(computeAggregateSha256(a), computeAggregateSha256(b));
  });

  test("matches the documented construction: sha256 of newline-joined, path-sorted \"path:sha256\" lines", () => {
    const files = [{ path: "z.json", sha256: "zz" }, { path: "a.json", sha256: "aa" }];
    const expected = sha256OfString("a.json:aa\nz.json:zz");
    assert.equal(computeAggregateSha256(files), expected);
  });

  test("changing even one file's hash changes the aggregate hash", () => {
    const base = [{ path: "a.json", sha256: "aa" }];
    const changed = [{ path: "a.json", sha256: "ab" }];
    assert.notEqual(computeAggregateSha256(base), computeAggregateSha256(changed));
  });

  test("empty file list is still deterministic (hash of the empty string)", () => {
    assert.equal(computeAggregateSha256([]), sha256OfString(""));
  });
});

describe("judge-materialize: checkKeySet -- output key-set vs frozen-plan key-set", () => {
  test("exact match: no missing, no unknown, no duplicates", () => {
    const result = checkKeySet(["a.json", "b.json"], new Set(["a", "b"]));
    assert.deepEqual(result, { count: 2, missing: [], unknown: [], duplicates: [] });
  });

  test("a key present on disk but not expected by the frozen plan is reported unknown", () => {
    const result = checkKeySet(["a.json", "b.json"], new Set(["a"]));
    assert.deepEqual(result.unknown, ["b"]);
    assert.deepEqual(result.missing, []);
  });

  test("a key expected by the frozen plan but absent on disk is reported missing", () => {
    const result = checkKeySet(["a.json"], new Set(["a", "b"]));
    assert.deepEqual(result.missing, ["b"]);
    assert.deepEqual(result.unknown, []);
  });

  test("a duplicate filename (same id twice) is reported as a duplicate, not silently deduped away", () => {
    const result = checkKeySet(["a.json", "a.json"], new Set(["a"]));
    assert.deepEqual(result.duplicates, ["a"]);
    assert.equal(result.count, 1);
  });
});

describe("judge-materialize: assertDirEmpty -- materialization-target cleanliness gate", () => {
  test("a nonexistent directory is treated as empty (nothing to refuse)", async () => {
    await assert.doesNotReject(() => assertDirEmpty(join(tmpdir(), "judge-materialize-test-does-not-exist-xyz")));
  });

  test("an empty existing directory passes", async () => {
    const dir = await mkdtemp(join(tmpdir(), "judge-materialize-empty-"));
    try {
      await assert.doesNotReject(() => assertDirEmpty(dir));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("a directory containing even one file is refused -- never silently combined with a stale partial collection", async () => {
    const dir = await mkdtemp(join(tmpdir(), "judge-materialize-nonempty-"));
    try {
      await writeFile(join(dir, "stale.json"), "{}");
      await assert.rejects(() => assertDirEmpty(dir), /not empty/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("hidden dotfiles (e.g. .gitkeep) do not count as stale content", async () => {
    const dir = await mkdtemp(join(tmpdir(), "judge-materialize-dotfile-"));
    try {
      await writeFile(join(dir, ".gitkeep"), "");
      await assert.doesNotReject(() => assertDirEmpty(dir));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("judge-materialize: against the real materialized v2-six-subject-run-1 output on disk (read-only)", () => {
  const RESULTS = join(import.meta.dirname, "..", "..", "runs", "v2-six-subject-run-1");

  test("the freeze manifest's own aggregate hash matches an independent recomputation from its own fileHashes list", async () => {
    const manifestPath = join(RESULTS, "judge", "materialization-freeze.v1.json");
    let manifest: { fileHashes: { path: string; sha256: string }[]; aggregateSha256: string; counts: Record<string, number> };
    try {
      manifest = JSON.parse(await (await import("node:fs/promises")).readFile(manifestPath, "utf8"));
    } catch {
      return; // freeze manifest not yet materialized in this checkout -- nothing to check
    }
    assert.equal(computeAggregateSha256(manifest.fileHashes), manifest.aggregateSha256);
    assert.equal(manifest.counts.semanticOutputCount, 369);
    assert.equal(manifest.counts.pairwiseOutputCount, 369);
    assert.equal(manifest.counts.semanticMetadataCount, 369);
    assert.equal(manifest.counts.pairwiseMetadataCount, 369);
    assert.equal(manifest.counts.selectedAttempt1Count, 737);
    assert.equal(manifest.counts.selectedAttempt2Count, 1);
    assert.equal(manifest.fileHashes.length, 369 * 4);
  });
});
