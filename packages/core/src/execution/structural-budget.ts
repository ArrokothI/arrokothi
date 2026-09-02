/**
 * Lineage-scoped structural spawn budget.
 *
 * A per-Execution `maxChildren` cannot bound recursion: every Execution can obey its own limit
 * while the ownership tree grows exponentially (see [`../../../../docs/execution-runtime.md`](../../../../docs/execution-runtime.md) §14).
 * So autonomous child creation - a `SpawnExecution` Effect - consumes a finite budget that belongs
 * to the whole lineage, keyed by its root Execution.
 *
 * The invariant this type exists to hold:
 *
 * > **Delegation may subdivide the remaining structural budget; a descendant can never enlarge the
 * > finite structural budget of its lineage.**
 *
 * The representation is deliberately the smallest thing that is honest: one root-scoped credit
 * counter. `capacity` is fixed when the root Execution is created by trusted application wiring and
 * is never rewritten. `consumed` only ever increases, by exactly one per autonomous child, through
 * the Effect gateway. Nothing a controller or a child Definition can reach writes either field -
 * there is no widen, no reset, and no per-child knob a Definition could inflate.
 *
 * This is not authority. A spawn inside budget may still be denied by policy - and policy is
 * consulted first: the gateway checks authorization before it ever reads this budget, so a caller
 * with no spawn authority never learns whether the lineage has capacity left, only that it was
 * denied. Budget answers "how much autonomous work may this lineage create", never "is this action
 * permitted".
 *
 * Depth limits, active-descendant limits, per-subtree subdivision, and parallel-creation limits are
 * all legitimate future refinements of the same idea; E.0 implements the one counter the mandatory
 * recursion proof needs and records the rest as deferred.
 */

import type { ExecutionId } from "./ids.ts";

export interface LineageSpawnBudget {
  /** The root Execution whose whole ownership tree shares this budget. */
  readonly rootExecutionId: ExecutionId;
  /**
   * Total autonomous descendant Executions this lineage may ever create.
   *
   * Fixed when the root Execution is created. A descendant cannot raise it, and there is no API
   * that rewrites it.
   */
  readonly capacity: number;
  /** Autonomous descendants created so far. Only ever increases, by one per child. */
  readonly consumed: number;
  /** Compare-and-set counter, so two concurrent spawns cannot both spend the last credit. */
  readonly revision: number;
  readonly grantedAt: string;
}

export interface CreateLineageSpawnBudgetInput {
  readonly rootExecutionId: ExecutionId;
  readonly capacity: number;
  readonly grantedAt: string;
}

export function createLineageSpawnBudget(input: CreateLineageSpawnBudgetInput): LineageSpawnBudget {
  return {
    rootExecutionId: input.rootExecutionId,
    capacity: input.capacity,
    consumed: 0,
    revision: 1,
    grantedAt: input.grantedAt,
  };
}

/** Credits still available to the whole lineage. Never negative. */
export function spawnBudgetRemaining(budget: LineageSpawnBudget): number {
  return Math.max(0, budget.capacity - budget.consumed);
}

export function canConsumeSpawnCredit(budget: LineageSpawnBudget): boolean {
  return budget.consumed < budget.capacity;
}

/**
 * Spends one credit.
 *
 * Only decrements the shared pool; there is no counterpart that adds capacity. Throws rather than
 * returning an over-spent record when nothing is left, so a caller that skipped `canConsumeSpawnCredit`
 * fails loudly instead of minting a descendant.
 */
export function consumeSpawnCredit(budget: LineageSpawnBudget): LineageSpawnBudget {
  if (!canConsumeSpawnCredit(budget)) {
    throw new RangeError(
      `lineage ${budget.rootExecutionId} has consumed its entire structural spawn budget (${budget.capacity}); a descendant cannot mint more`,
    );
  }
  return { ...budget, consumed: budget.consumed + 1, revision: budget.revision + 1 };
}

export interface SpawnBudgetIssue {
  readonly path: string;
  readonly message: string;
}

/** Structural check for an application-supplied capacity, before the runtime stores anything. */
export function spawnBudgetCapacityIssues(capacity: unknown, path = "structuralSpawnBudget"): readonly SpawnBudgetIssue[] {
  if (typeof capacity !== "number" || !Number.isInteger(capacity) || capacity < 0) {
    return [{ path, message: "expected a non-negative integer number of descendant spawn credits" }];
  }
  return [];
}
