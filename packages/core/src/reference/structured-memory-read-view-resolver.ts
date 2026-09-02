/**
 * A reference `StructuredMemoryReadViewResolver`: an explicit read allow-list.
 *
 * Small on purpose, and the mirror image of the `WriteMemory` rule in
 * [`allow-list-authorizer.ts`](allow-list-authorizer.ts). It answers one question: which declared
 * Structured Memory fields may this Execution read into a context right now, and it answers
 * deny-by-default.
 *
 * The ordering matters and matches F.0's write path: the read grant is applied **first**, and only
 * if something survives it is the bound view resolved. An Execution with no read grant never causes
 * a view lookup and learns nothing about which fields exist.
 *
 * This is not the `EffectAuthorizer`. Read authority and `WriteMemory` authority are configured
 * separately here and in the authorizer, and neither implies the other: a write-only deployment
 * grants no reads, a read-only deployment grants no writes.
 *
 * Like `createRuntimeOperationAuthoritySource`, the factory takes the store but the resolver it
 * returns only ever reads an Execution context and a Structured Memory view - there is no write
 * path and no cache that could disagree with the store.
 */

import type { RuntimeStore } from "../ports/runtime-store.ts";
import type {
  StructuredMemoryReadRequest,
  StructuredMemoryReadViewResolver,
} from "../ports/structured-memory-read-view.ts";
import type { StructuredMemoryReadView } from "../execution/structured-memory-read.ts";
import { projectStructuredMemoryReadView } from "../execution/structured-memory-read.ts";
import type { ExecutionId } from "../execution/ids.ts";

/**
 * Whether this policy permits reading Structured Memory into a context.
 *
 * `true` allows every field the bound view declares; `{ readableKeys }` narrows to named keys.
 * Omitted (the default) denies every read - a binding is not a read grant.
 */
export type StructuredMemoryReadGrantRule = boolean | { readonly readableKeys: readonly string[] };

export interface StructuredMemoryReadViewResolverOptions {
  readonly store: RuntimeStore;
  /** Which fields are readable, and optionally which keys. Default: denied. */
  readonly grants?: StructuredMemoryReadGrantRule;
  /** Restricts the grant to named Executions. Omitted means every Execution. */
  readonly executions?: readonly string[];
}

function readableKeysOf(rule: StructuredMemoryReadGrantRule, requested: readonly string[]): string[] {
  if (rule === true) return [...requested];
  if (rule === false) return [];
  return requested.filter((key) => rule.readableKeys.includes(key));
}

export function createStructuredMemoryReadViewResolver(
  options: StructuredMemoryReadViewResolverOptions,
): StructuredMemoryReadViewResolver {
  const rule = options.grants ?? false;
  return {
    async resolve(request: StructuredMemoryReadRequest): Promise<StructuredMemoryReadView | null> {
      if (options.executions && !options.executions.includes(request.executionId)) return null;

      const readableKeys = readableKeysOf(rule, request.keys);
      if (readableKeys.length === 0) return null;

      const context = await options.store.readExecution(request.executionId as ExecutionId);
      const ref = context?.slots.memoryView;
      if (!ref) return null;

      const view = await options.store.readStructuredMemoryView(ref.memoryViewId);
      if (!view) return null;

      return projectStructuredMemoryReadView(view, new Set(readableKeys));
    },
  };
}
