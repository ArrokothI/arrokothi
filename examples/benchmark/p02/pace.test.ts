/**
 * Deterministic tests for the benchmark request pacer (`pace.ts`).
 *
 * The pacer is benchmark deployment plumbing: it spaces outgoing HTTP requests to a
 * requests-per-minute budget without touching request content or responses. These tests use an
 * injected clock and sleep, so they assert the spacing arithmetic, never wall-clock timing.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { benchmarkRpmFromEnv, createPacedFetch } from "./pace.ts";

function harness(rpm: number) {
  let clock = 0;
  const sleeps: number[] = [];
  const calls: number[] = [];
  const base = (async () => {
    calls.push(clock);
    return new Response("ok");
  }) as unknown as typeof fetch;
  const paced = createPacedFetch({
    rpm,
    fetchImpl: base,
    now: () => clock,
    sleep: async (ms: number) => {
      sleeps.push(ms);
      clock += ms;
    },
  });
  return { paced, sleeps, calls, advance: (ms: number) => { clock += ms; } };
}

describe("createPacedFetch", () => {
  test("spaces requests by 60000/rpm milliseconds", async () => {
    const h = harness(15); // 4000 ms minimum interval
    await h.paced("https://example.test/a");
    await h.paced("https://example.test/b");
    await h.paced("https://example.test/c");
    assert.deepEqual(h.calls, [0, 4000, 8000]);
    assert.deepEqual(h.sleeps, [4000, 4000]);
  });

  test("does not delay a request that already comes after the interval", async () => {
    const h = harness(60); // 1000 ms interval
    await h.paced("https://example.test/a");
    h.advance(5000);
    await h.paced("https://example.test/b");
    assert.deepEqual(h.sleeps, []);
    assert.deepEqual(h.calls, [0, 5000]);
  });

  test("paces retry attempts too — every call through the returned fetch is metered", async () => {
    const h = harness(30); // 2000 ms interval
    // Three calls in a row model an initial request plus two provider retries.
    await h.paced("https://example.test/x");
    await h.paced("https://example.test/x");
    await h.paced("https://example.test/x");
    assert.deepEqual(h.calls, [0, 2000, 4000]);
  });

  test("rpm <= 0 or non-finite disables pacing and returns the base fetch", async () => {
    const base = (async () => new Response("ok")) as unknown as typeof fetch;
    assert.equal(createPacedFetch({ rpm: 0, fetchImpl: base }), base);
    assert.equal(createPacedFetch({ rpm: -5, fetchImpl: base }), base);
    assert.equal(createPacedFetch({ rpm: Number.NaN, fetchImpl: base }), base);
  });

  test("concurrent callers are released in order, one interval apart", async () => {
    const h = harness(20); // 3000 ms interval
    await Promise.all([
      h.paced("https://example.test/1"),
      h.paced("https://example.test/2"),
      h.paced("https://example.test/3"),
    ]);
    assert.deepEqual(h.calls, [0, 3000, 6000]);
  });
});

describe("benchmarkRpmFromEnv", () => {
  test("reads a positive number, and treats anything else as disabled", () => {
    assert.equal(benchmarkRpmFromEnv({ ARROKOTHI_BENCHMARK_RPM: "13" }), 13);
    assert.equal(benchmarkRpmFromEnv({ ARROKOTHI_BENCHMARK_RPM: "13.5" }), 13.5);
    assert.equal(benchmarkRpmFromEnv({}), 0);
    assert.equal(benchmarkRpmFromEnv({ ARROKOTHI_BENCHMARK_RPM: "0" }), 0);
    assert.equal(benchmarkRpmFromEnv({ ARROKOTHI_BENCHMARK_RPM: "nonsense" }), 0);
  });
});
