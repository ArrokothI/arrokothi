/**
 * The runtime-backed effective-operation-authority source.
 *
 * A window, not a copy. It reads the record the Harness wrote when the Execution was created and
 * returns it; there is no write path here, no cache that could disagree with the store, and no way
 * to construct a ceiling that the runtime did not.
 *
 * The narrow port is what keeps the ownership honest. Exposure resolution needs the ceiling, but
 * giving it the store would give it everything else too - contexts, mailboxes, pending work, the
 * journal - and "the resolver only reads authority" would become a habit rather than a boundary.
 */

import type { EffectiveOperationAuthority } from "../operations/authority.ts";
import type { EffectiveOperationAuthoritySource } from "../ports/effective-operation-authority.ts";
import type { RuntimeStore } from "../ports/runtime-store.ts";
import type { ExecutionId } from "../execution/ids.ts";

export function createRuntimeOperationAuthoritySource(store: RuntimeStore): EffectiveOperationAuthoritySource {
  return {
    async effectiveOperationAuthority(executionId: string): Promise<EffectiveOperationAuthority | null> {
      return (await store.readOperationAuthority(executionId as ExecutionId)) ?? null;
    },
  };
}

/**
 * A fixed source, for wiring that has no runtime store to read from.
 *
 * Useful for exercising the resolver in isolation. It is still read-only, and an Execution absent
 * from the map answers `null` - which every caller reads as "nothing is authorized".
 */
export function createStaticOperationAuthoritySource(
  authorities: Readonly<Record<string, EffectiveOperationAuthority>>,
): EffectiveOperationAuthoritySource {
  const stored = new Map(Object.entries(authorities));
  return {
    async effectiveOperationAuthority(executionId: string): Promise<EffectiveOperationAuthority | null> {
      const record = stored.get(executionId);
      return record ? structuredClone(record) : null;
    },
  };
}
