/**
 * K0.2 public fixture — the fake operation sink and its independent ledger.
 *
 * 001 K0: "Add a fake operation sink with an independent ledger for later action tests."
 *
 * The point of the ledger is **attribution**, not bookkeeping convenience. A later E2 comparison has
 * to be able to say what a candidate actually attempted against the outside world, independently of
 * what the candidate reports about itself. So the two surfaces are split:
 *
 *   - `sink`   — the only surface a candidate is given. It can attempt operations. It cannot read,
 *                edit, reorder, truncate or replay the ledger, because those methods are not on it.
 *   - `ledger` — the fixture's observation surface, never handed to a candidate. Returns frozen
 *                snapshots, so a caller cannot mutate the record after the fact either.
 *
 * At K0/K1 the Kernel refuses Effects outright (worksheet EF-1/EF-2), so the sink's K0 role is to make
 * that refusal *observable*: an Outcome proposing an Effect must leave the ledger empty. A candidate
 * that claims "rejected" while the ledger shows a dispatch is caught by the ledger, not by its own
 * self-report. The sink is built now because K2's action work needs it, and because a refusal with no
 * independent observation behind it is an unsupported claim.
 */

export interface OperationAttempt {
  /** Logical request identity. Recorded separately from the physical attempt (kernel.md). */
  readonly operationId: string;
  readonly executionId: string;
  readonly operation: string;
  readonly input: unknown;
}

/**
 * kernel.md's action outcome triple. `unknown` is a first-class result, not a flavour of failure:
 * "A lost receipt, timeout or malformed response after possible execution is `unknown`, not definite
 * failure."
 */
export type OperationDisposition = "success" | "failure" | "unknown";

export interface OperationResult {
  readonly disposition: OperationDisposition;
  readonly observation?: unknown;
  readonly error?: { readonly code: string; readonly message: string };
}

/** One immutable ledger entry. `sequence` is the sink's own acceptance order, not the candidate's. */
export interface LedgerEntry extends OperationAttempt {
  readonly sequence: number;
  readonly result: OperationResult;
}

/** The narrow surface a candidate is given. Deliberately has no read path. */
export interface OperationSink {
  attempt(request: OperationAttempt): OperationResult;
}

/** The fixture's observation surface. Never handed to a candidate. */
export interface OperationLedger {
  /** Frozen snapshot in sink acceptance order. */
  entries(): readonly LedgerEntry[];
  entriesFor(executionId: string): readonly LedgerEntry[];
  count(): number;
}

export interface OperationSinkBundle {
  readonly sink: OperationSink;
  readonly ledger: OperationLedger;
}

export interface OperationSinkOptions {
  /**
   * Scripted dispositions by operation name. Anything unscripted settles `unknown`, which is the
   * honest default for a sink that was never told what the outside world did.
   */
  readonly handlers?: Readonly<Record<string, (request: OperationAttempt) => OperationResult>>;
}

export function createOperationSink(options: OperationSinkOptions = {}): OperationSinkBundle {
  // Closed over, not exposed. The only way to add an entry is to actually attempt an operation.
  const entries: LedgerEntry[] = [];
  const handlers = options.handlers ?? {};

  const sink: OperationSink = {
    attempt(request: OperationAttempt): OperationResult {
      const handler = handlers[request.operation];
      const result: OperationResult = handler
        ? handler(request)
        : { disposition: "unknown", error: { code: "unscripted_operation", message: `no scripted result for ${request.operation}` } };
      entries.push(Object.freeze({ ...request, sequence: entries.length, result }));
      return result;
    },
  };

  const ledger: OperationLedger = {
    entries: () => Object.freeze(entries.slice()),
    entriesFor: (executionId) => Object.freeze(entries.filter((entry) => entry.executionId === executionId)),
    count: () => entries.length,
  };

  return { sink, ledger };
}
