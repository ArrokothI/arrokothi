/**
 * Reference Structured Memory write-exposure policy and view resolver.
 *
 * This evaluates model exposure independently from final `WriteMemory` Effect authorization. A
 * deployment may derive both from the same immutable application configuration, but they remain
 * separate evaluations at different times. The grant is applied before any runtime view read.
 */

import type { ExecutionId } from "../execution/ids.ts";
import {
  emptyActiveStructuredMemoryWriteView,
  projectActiveStructuredMemoryWriteView,
} from "../execution/structured-memory-write-view.ts";
import type {
  ActiveStructuredMemoryWriteViewRequest,
  ActiveStructuredMemoryWriteViewResolver,
} from "../ports/active-structured-memory-write-view.ts";
import type { RuntimeStore } from "../ports/runtime-store.ts";

export type StructuredMemoryWriteExposureGrantRule =
  | boolean
  | { readonly writableKeys: readonly string[] };

export interface StructuredMemoryWriteViewResolverOptions {
  readonly store: Pick<RuntimeStore, "readExecution" | "readStructuredMemoryView">;
  /** Write-interface exposure only. Default: denied. */
  readonly grants?: StructuredMemoryWriteExposureGrantRule;
  /** Restricts the exposure rule to named Executions. */
  readonly executions?: readonly string[];
}

function exposedKeys(
  rule: StructuredMemoryWriteExposureGrantRule,
  requested: readonly string[],
): readonly string[] {
  if (rule === true) return [...requested];
  if (rule === false) return [];
  return requested.filter((key) => rule.writableKeys.includes(key));
}

export function createStructuredMemoryWriteViewResolver(
  options: StructuredMemoryWriteViewResolverOptions,
): ActiveStructuredMemoryWriteViewResolver {
  const rule = options.grants ?? false;
  return {
    async resolve(request: ActiveStructuredMemoryWriteViewRequest) {
      if (options.executions && !options.executions.includes(request.executionId)) {
        return emptyActiveStructuredMemoryWriteView();
      }

      // Authority first. If nothing survives, do not resolve the binding or read the view.
      const keys = exposedKeys(rule, request.keys);
      if (keys.length === 0) return emptyActiveStructuredMemoryWriteView();

      const context = await options.store.readExecution(request.executionId as ExecutionId);
      const ref = context?.slots.memoryView;
      if (!ref) return emptyActiveStructuredMemoryWriteView();

      const view = await options.store.readStructuredMemoryView(ref.memoryViewId);
      if (!view) return emptyActiveStructuredMemoryWriteView();
      return projectActiveStructuredMemoryWriteView(view, new Set(keys));
    },
  };
}
