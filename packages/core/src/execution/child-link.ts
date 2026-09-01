/**
 * ChildExecutionLink: the runtime's record of one spawned child and the dependency (if any) that
 * waits on its terminal result.
 *
 * A child Execution is independently managed - its own identity, lifecycle, mailbox, authority, and
 * budget. The link is *not* the child; it is the edge from the spawning Execution to it, kept so the
 * Harness can answer two questions later:
 *
 * ```text
 * which Execution spawned this one, and under which Effect?     (lineage / causation)
 * does anyone need to be told when this child terminally ends?  (call vs spawn)
 * ```
 *
 * `pendingOperationId` is the whole difference between `call` and `spawn`. A `call` registers a
 * `PendingOperation` on the parent and records its id here; the child's terminal result settles that
 * exact operation through the ordinary Event path. A plain `spawn` records `null` - the child runs
 * independently and the parent registered no dependency on its completion.
 *
 * It is runtime state. A controller never receives one: it learns a child was created, or that a
 * child it called has finished, only by being handed an Event.
 */

import type { ExecutionDefinitionRef } from "../definitions/ids.ts";
import type { EffectId, PendingOperationId } from "../effects/ids.ts";
import type { ActivationId, ExecutionId } from "./ids.ts";

export type ChildLinkState = "active" | "settled";

export interface ChildExecutionLink {
  readonly childExecutionId: ExecutionId;
  readonly parentExecutionId: ExecutionId;
  /** Inherited from the parent; the child does not start a new lineage. */
  readonly rootExecutionId: ExecutionId;
  readonly definition: ExecutionDefinitionRef;
  /** The `SpawnExecution` Effect that created this child. */
  readonly effectId: EffectId;
  readonly spawnedByActivationId: ActivationId;
  /**
   * `call`: the parent `PendingOperation` a terminal result must settle. `null` for a plain `spawn`.
   */
  readonly pendingOperationId: PendingOperationId | null;
  /** The correlation the terminal-result Event carries, so the parent can wait for this child. */
  readonly resultCorrelationId: string | null;
  readonly state: ChildLinkState;
  readonly createdAt: string;
  /** Set once a terminal result has been delivered to the parent (a `call` only). */
  readonly settledAt: string | null;
}

export interface CreateChildExecutionLinkInput {
  readonly childExecutionId: ExecutionId;
  readonly parentExecutionId: ExecutionId;
  readonly rootExecutionId: ExecutionId;
  readonly definition: ExecutionDefinitionRef;
  readonly effectId: EffectId;
  readonly spawnedByActivationId: ActivationId;
  readonly pendingOperationId: PendingOperationId | null;
  readonly resultCorrelationId: string | null;
  readonly createdAt: string;
}

export function createChildExecutionLink(input: CreateChildExecutionLinkInput): ChildExecutionLink {
  return {
    childExecutionId: input.childExecutionId,
    parentExecutionId: input.parentExecutionId,
    rootExecutionId: input.rootExecutionId,
    definition: input.definition,
    effectId: input.effectId,
    spawnedByActivationId: input.spawnedByActivationId,
    pendingOperationId: input.pendingOperationId,
    resultCorrelationId: input.resultCorrelationId,
    state: "active",
    createdAt: input.createdAt,
    settledAt: null,
  };
}

/** Marks that the child's terminal result has been delivered to the waiting parent. */
export function markChildLinkSettled(link: ChildExecutionLink, at: string): ChildExecutionLink {
  if (link.state === "settled") return link;
  return { ...link, state: "settled", settledAt: at };
}

/** A `call` whose child has not yet delivered its terminal result. */
export function isAwaitingChildResult(link: ChildExecutionLink): boolean {
  return link.state === "active" && link.pendingOperationId !== null;
}
