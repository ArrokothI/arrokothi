/**
 * Controller-neutral resolution of currently exposable Structured Memory write interfaces.
 *
 * The resolver answers an exposure question, not an Effect-authorization question. It returns
 * plain metadata and cannot write, dispatch, confirm, or settle anything. Implementations must
 * apply write-exposure authority before resolving the Execution's memory binding so a denied key
 * guess cannot become a field-existence oracle.
 */

import type { ActiveStructuredMemoryWriteView } from "../execution/structured-memory-write-view.ts";
import { emptyActiveStructuredMemoryWriteView } from "../execution/structured-memory-write-view.ts";

export interface ActiveStructuredMemoryWriteViewRequest {
  /** Addressing only; an Execution id is not a credential. */
  readonly executionId: string;
  /** Authored requested keys. The resolver intersects them with current exposure authority. */
  readonly keys: readonly string[];
}

export interface ActiveStructuredMemoryWriteViewResolver {
  resolve(
    request: ActiveStructuredMemoryWriteViewRequest,
  ): Promise<ActiveStructuredMemoryWriteView> | ActiveStructuredMemoryWriteView;
}

/** Fail closed when no write-exposure policy is configured. */
export const noActiveStructuredMemoryWriteView: ActiveStructuredMemoryWriteViewResolver = {
  resolve() {
    return emptyActiveStructuredMemoryWriteView();
  },
};
