/**
 * BENCHMARK DEPLOYMENT PLUMBING — not application logic, not kernel semantics.
 *
 * The P01/P02 benchmark subjects drive one Agent Execution across every user turn, so a single
 * scenario can legitimately spend many model calls (an initial reasoning call plus one continuation
 * per capability / memory Effect round-trip). The benchmark provider quota is a requests-per-minute
 * ceiling, and the outer benchmark runner reserves per scenario rather than per HTTP request.
 *
 * `createPacedFetch` closes that gap at the only place it can be measured truthfully: the actual
 * outgoing HTTP request. It wraps a `fetch` implementation with a minimum inter-request interval
 * derived from a requests-per-minute budget. Every call — including transport retries, because the
 * Gemini provider issues retries through the same injected `fetchImpl` — waits its turn. It changes
 * nothing about request content or responses; it only spaces them in time.
 *
 * It is activated only when the benchmark sets `ARROKOTHI_BENCHMARK_RPM` (see `main.ts`). Normal
 * local and example use is unaffected.
 */

export interface PacedFetchOptions {
  /** Requests-per-minute budget. Non-positive or non-finite disables pacing. */
  readonly rpm: number;
  /** Underlying fetch. Defaults to the global. */
  readonly fetchImpl?: typeof fetch;
  /** Injectable clock for deterministic tests. */
  readonly now?: () => number;
  /** Injectable sleep for deterministic tests. */
  readonly sleep?: (ms: number) => Promise<void>;
}

/**
 * Returns a `fetch`-compatible function that starts at most one request per `60000 / rpm` ms.
 * Requests are released in call order; a burst queues rather than overlapping.
 */
export function createPacedFetch(options: PacedFetchOptions): typeof fetch {
  const base = options.fetchImpl ?? fetch;
  const rpm = options.rpm;
  if (!Number.isFinite(rpm) || rpm <= 0) return base;

  const minIntervalMs = 60_000 / rpm;
  const now = options.now ?? (() => Date.now());
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  let gate: Promise<void> = Promise.resolve();
  let lastStart = Number.NEGATIVE_INFINITY;

  const paced = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]): Promise<Response> => {
    const previous = gate;
    let release!: () => void;
    gate = new Promise<void>((r) => { release = r; });
    await previous;
    try {
      const waitFor = lastStart + minIntervalMs - now();
      if (waitFor > 0) await sleep(waitFor);
      lastStart = now();
    } finally {
      release();
    }
    return base(input, init);
  }) as typeof fetch;

  return paced;
}

/** Reads the benchmark RPM budget from the environment. Returns 0 (disabled) when unset/invalid. */
export function benchmarkRpmFromEnv(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env["ARROKOTHI_BENCHMARK_RPM"];
  if (raw === undefined) return 0;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : 0;
}
