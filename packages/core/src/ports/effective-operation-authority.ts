/**
 * Read-only access to runtime-owned effective operation authority.
 *
 * One method, and it only reads. Exposure resolution needs to know the ceiling in order to narrow
 * inside it; nothing about that job requires - or is permitted - the ability to create, widen, or
 * revoke one. The record itself is written by the runtime when an Execution is created, from
 * application/deployment grants, and an implementation of this port is a window onto that state
 * rather than a second copy of it.
 *
 * ```text
 * this port                 may an exposure resolver see the ceiling?
 * EffectAuthorizer          may this concrete Effect payload proceed, right now?
 * ```
 *
 * They are different questions and must not be answered by one object. The first is enumerable and
 * advisory: a stale answer costs an operation its place in the model's view. The second is the
 * decisive check on the exact request immediately before dispatch, and a stale answer there would
 * be a bypass. Nothing in this file can dispatch, journal, settle, or mutate anything.
 *
 * An Execution with no configured record answers `null`, which every caller must read as "nothing
 * is authorized", not as "everything is".
 */

import type { EffectiveOperationAuthority } from "../operations/authority.ts";

export interface EffectiveOperationAuthoritySource {
  /**
   * The ceiling for one Execution, or `null` when none is configured.
   *
   * Taking an `ExecutionId` is addressing, not authorization: an id names which record to read and
   * confers nothing. What is returned is a read-only copy of runtime-owned data.
   */
  effectiveOperationAuthority(executionId: string): Promise<EffectiveOperationAuthority | null>;
}

/** The fail-closed default: no ceiling is configured for anything, so nothing is exposable. */
export const noOperationAuthority: EffectiveOperationAuthoritySource = {
  async effectiveOperationAuthority() {
    return null;
  },
};
