/**
 * The native root's identity (K1.4 design 01 §2; design 02, ALS-01).
 *
 * The legacy Harness mints its root Execution ID from the configured `IdGenerator`. The bridge
 * needs that ID to equal the Kernel Execution ID, so `harness.createExecution` runs inside a
 * one-shot scope: the first `exe` request in scope is answered with E, a second one throws, and
 * every other request (and every request outside a scope) goes to the configured generator.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { ID_PREFIXES } from "@arrokothi/core/ports";
import type { IdGenerator } from "@arrokothi/core/ports";

interface Scope {
  readonly executionId: string;
  used: boolean;
}

export class RootIdentityError extends Error {
  constructor(executionId: string) {
    super(`a second native Execution ID was requested while creating root ${executionId}`);
    this.name = "RootIdentityError";
  }
}

export class RootIdentityScope implements IdGenerator {
  private readonly storage = new AsyncLocalStorage<Scope>();
  private readonly inner: IdGenerator;

  constructor(inner: IdGenerator) {
    this.inner = inner;
  }

  next(prefix: string): string {
    const scope = this.storage.getStore();
    if (scope === undefined || prefix !== ID_PREFIXES.execution) return this.inner.next(prefix);
    if (scope.used) throw new RootIdentityError(scope.executionId);
    scope.used = true;
    return scope.executionId;
  }

  /** Runs `create` with the first `exe` request answered by `executionId`. */
  withRoot<T>(executionId: string, create: () => Promise<T>): Promise<T> {
    return this.storage.run({ executionId, used: false }, create);
  }
}
