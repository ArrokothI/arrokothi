/**
 * The Structured Memory read-view resolver: authorized read narrowing, and nothing else.
 *
 * A reader that will compile memory into a model context needs the current value of the fields it
 * is *allowed* to read. It must not receive the runtime state that answer is derived from, and it
 * must not be the thing that decides what it may read - so the decision sits behind this port and
 * the Harness holds only the port and the plain-data result.
 *
 * Read the interface as a list of things a resolver cannot do:
 *
 * ```text
 * it cannot write memory                    it cannot authorize an Effect
 * it cannot widen or mint read authority    it cannot return a handle or a credential
 * it cannot see who will read the snapshot  it cannot mutate the view
 * ```
 *
 * What it can do is apply the Execution's configured **read** grants - deny-by-default, and
 * evaluated *before* the bound view is resolved, so a caller with no read grant learns nothing
 * about which fields exist - and return a plain read-only snapshot of the readable subset.
 *
 * This is deliberately **not** the `EffectAuthorizer`. `EffectAuthorizer` answers "may this Effect
 * proposal proceed"; a read is not an Effect and never becomes one. Read authority and
 * `WriteMemory` authority are independent: an Execution may be granted one, both, or neither.
 *
 * It is also controller-neutral. The request names an Execution, not an Agent step; the result is
 * [`StructuredMemoryReadView`](../execution/structured-memory-read.ts), which mentions no controller
 * concept. The same resolver serves an Agent today and a Workflow Stage or adapter later.
 */

import type { StructuredMemoryReadView } from "../execution/structured-memory-read.ts";

export interface StructuredMemoryReadRequest {
  /**
   * Which Execution's Structured Memory to read.
   *
   * An address, not a credential. Resolving against an id returns that Execution's own
   * authorized-readable snapshot; it cannot produce a value the Execution is not permitted to see.
   */
  readonly executionId: string;
  /**
   * The declared field keys the caller wants considered.
   *
   * The resolver intersects these with the Execution's read grants, so naming a key here can only
   * ever make the result smaller. A key the bound view does not declare is ignored.
   */
  readonly keys: readonly string[];
}

export interface StructuredMemoryReadViewResolver {
  resolve(
    request: StructuredMemoryReadRequest,
  ): Promise<StructuredMemoryReadView | null> | StructuredMemoryReadView | null;
}

/**
 * The fail-closed default: every request resolves to nothing.
 *
 * Not a stub. An Execution whose deployment wired no read resolver has no configured read authority,
 * and "nobody wired memory reads" must not look the same as "this memory is readable". A Harness
 * with no resolver never puts memory into any context.
 */
export const noStructuredMemoryRead: StructuredMemoryReadViewResolver = {
  resolve() {
    return null;
  },
};
