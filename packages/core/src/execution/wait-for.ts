/**
 * WaitForEdge: a small read-only view of the cross-Execution required-wait graph.
 *
 * Canonical runtime (`docs/execution-runtime.md` §12) says known cross-Execution waits should be
 * observable for diagnostics, tracing, and future deadlock detection - and that a cycle in this
 * view is a *deadlock candidate*, never a proven deadlock the runtime may kill.
 *
 * E.1 derives the graph from the links it already keeps rather than storing a third structure:
 *
 * ```text
 * child_call   ChildExecutionLink with an unsettled pendingOperationId   parent -> child
 * peer_ask     open PeerRequestLink                                       asker  -> expected responder
 * ```
 *
 * Once the underlying dependency settles the edge disappears from the view (the link is `settled`).
 * This is diagnostics only: it is not authority, and nothing here terminates an Execution.
 */

import type { ExecutionId } from "./ids.ts";

export type WaitForEdgeKind = "child_call" | "peer_ask";

export const WAIT_FOR_EDGE_KINDS: readonly WaitForEdgeKind[] = ["child_call", "peer_ask"];

export interface WaitForEdge {
  readonly sourceExecutionId: ExecutionId;
  readonly targetExecutionId: ExecutionId;
  readonly kind: WaitForEdgeKind;
  /** The source Execution's PendingOperation that this dependency will settle. */
  readonly pendingOperationId: string;
  /** The correlation the settling Event carries. */
  readonly correlationId: string | null;
}
