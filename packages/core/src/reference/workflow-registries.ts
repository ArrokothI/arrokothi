/**
 * Reference registries for Workflow implementation refs.
 *
 * A serializable Workflow definition names behaviour; the application supplies it. These are the
 * smallest honest implementations of that handshake: a fixed map from logical ref to trusted local
 * code, built at the composition root.
 *
 * An unknown ref resolves to `undefined` rather than to a do-nothing implementation, because a
 * Stage that silently does nothing is far worse than a Workflow that fails saying which ref was
 * never wired.
 */

import type { AdapterContext, AdapterImplementation, AdapterRegistry, AdapterResult } from "../ports/adapter.ts";
import type { FunctionStageImplementation, FunctionStageOutcome, FunctionStageRegistry, StageExecutionContext } from "../ports/stage.ts";

export type FunctionStageHandler = (context: StageExecutionContext) => FunctionStageOutcome | Promise<FunctionStageOutcome>;

export type AdapterHandler = (context: AdapterContext) => AdapterResult | Promise<AdapterResult>;

function assertRef(ref: string, what: string): void {
  if (!ref.trim()) throw new Error(`${what} implementation ref must be non-empty`);
}

/** Registers Function Stage implementations by logical ref. */
export function createFunctionStageRegistry(
  handlers: Readonly<Record<string, FunctionStageHandler>>,
): FunctionStageRegistry {
  const byRef = new Map<string, FunctionStageImplementation>();
  for (const [ref, run] of Object.entries(handlers)) {
    assertRef(ref, "Function Stage");
    byRef.set(ref, { ref, run });
  }
  return {
    resolve(ref: string): FunctionStageImplementation | undefined {
      return byRef.get(ref);
    },
  };
}

/**
 * Registers Function Adapter implementations by logical ref.
 *
 * Note what an `AdapterHandler` receives: an `AdapterContext`, which has no Effect proposer and no
 * capability handle. There is no version of this registry that could hand an Adapter one, because
 * there is no such field to pass.
 */
export function createAdapterRegistry(handlers: Readonly<Record<string, AdapterHandler>>): AdapterRegistry {
  const byRef = new Map<string, AdapterImplementation>();
  for (const [ref, apply] of Object.entries(handlers)) {
    assertRef(ref, "Adapter");
    byRef.set(ref, { ref, apply });
  }
  return {
    resolve(ref: string): AdapterImplementation | undefined {
      return byRef.get(ref);
    },
  };
}
