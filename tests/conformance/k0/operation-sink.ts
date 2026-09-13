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
 * **Independence has to survive retained references, not just missing methods.** An earlier revision
 * recorded the caller's own `request` and `result` objects and shallow-froze the entry. A candidate
 * that kept a reference to the input it passed in, or to the result it was handed back, could still
 * reach through into the ledger and rewrite history after the attempt was recorded — historical
 * evidence editable by the party it incriminates. `snapshot()` below therefore deep-copies on the way
 * in and deep-freezes what it stores, and `attempt()` hands the caller a *separate* copy back, so no
 * reference the candidate holds is the reference the ledger keeps.
 *
 * At K0/K1 the Kernel refuses Effects outright (worksheet EF-1/EF-2), so the sink's K0 role is to make
 * that refusal *observable*: an Outcome proposing an Effect must leave the ledger empty. A candidate
 * that claims "rejected" while the ledger shows a dispatch is caught by the ledger, not by its own
 * self-report.
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

/**
 * Deep structural copy. Plain data only, which is all a boundary value ever is (worksheet E-1:
 * `null`, boolean, finite number, string, or arrays/objects built recursively from those). Anything
 * exotic that survives is passed through by reference and then frozen, so it still cannot be edited
 * in place; it simply cannot be cloned.
 *
 * **Members are written with `defineProperty`, not assignment.** Round-2 review finding K02-R2-02:
 * E-1 permits any well-formed string as an object member name, so `"__proto__"` is a valid member —
 * `JSON.parse('{"__proto__":{"x":1},"safe":2}')` produces it as an ordinary own data property. Plain
 * assignment `copy[key] = ...` would invoke the inherited `__proto__` *setter* for that one key
 * instead of creating an own property: the member would vanish from the record, its value would
 * silently become the copy's prototype, and `deepFreeze` would not reach it there. The ledger would
 * then be both incomplete about what was attempted and rewritable through the prototype it grew.
 * `defineProperty` creates an own data property whatever the key is, so no member name gets special
 * treatment and the stored value is faithful across the whole accepted key space.
 */
function snapshot<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((entry) => snapshot(entry)) as unknown as T;
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return value;
  const copy: Record<string, unknown> = {};
  for (const [key, member] of Object.entries(value as Record<string, unknown>)) {
    Object.defineProperty(copy, key, { value: snapshot(member), writable: true, enumerable: true, configurable: true });
  }
  return copy as unknown as T;
}

/**
 * Freeze a value and everything reachable through it, so a stored entry has no mutable interior.
 *
 * The walk uses `Reflect.ownKeys` rather than `Object.values` so that nothing reachable is skipped
 * because of how it is keyed — the same K02-R2-02 concern, applied to the freeze rather than the copy.
 */
function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const key of Reflect.ownKeys(value as object)) {
    const descriptor = Object.getOwnPropertyDescriptor(value as object, key);
    if (descriptor && "value" in descriptor) deepFreeze(descriptor.value);
  }
  return value;
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

      // Record deep copies: what the ledger keeps must not be reachable from anything the caller holds.
      entries.push(
        deepFreeze({
          operationId: request.operationId,
          executionId: request.executionId,
          operation: request.operation,
          input: snapshot(request.input),
          sequence: entries.length,
          result: snapshot(result),
        }),
      );

      // Hand back a separate copy too, so mutating the returned result cannot reach the entry either.
      return snapshot(result);
    },
  };

  const ledger: OperationLedger = {
    entries: () => Object.freeze(entries.slice()),
    entriesFor: (executionId) => Object.freeze(entries.filter((entry) => entry.executionId === executionId)),
    count: () => entries.length,
  };

  return { sink, ledger };
}
