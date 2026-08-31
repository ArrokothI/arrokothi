/**
 * A three-function assertion helper.
 *
 * Contract suites ship inside the package so that every implementation of a port - in-memory today,
 * SQLite and distributed queues later - runs the *same* cases rather than a lookalike. That means
 * they must not drag in a test framework or a runtime-specific builtin, so the assertions live here.
 */

export function assertTrue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`contract violation: ${message}`);
}

export function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`contract violation: ${message} (expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)})`);
  }
}

export function assertDeepEqual(actual: unknown, expected: unknown, message: string): void {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`contract violation: ${message} (expected ${b}, received ${a})`);
}

export async function assertRejects(work: () => Promise<unknown>, name: string, message: string): Promise<void> {
  try {
    await work();
  } catch (error) {
    const actual = error instanceof Error ? error.name : typeof error;
    if (actual !== name) throw new Error(`contract violation: ${message} (expected ${name}, received ${actual})`);
    return;
  }
  throw new Error(`contract violation: ${message} (nothing was thrown)`);
}

export interface ContractCase {
  readonly name: string;
  readonly run: () => Promise<void>;
}
