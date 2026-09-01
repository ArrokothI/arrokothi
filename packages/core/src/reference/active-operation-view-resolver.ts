/**
 * The reference Active Operation View resolver: deterministic set arithmetic, no model call.
 *
 * ```text
 * requested refs ∪ requested groups          what the author asked to expose
 *      ∩ effective operation authority       what the runtime decided is legal
 *      ∩ catalog descriptors                 what exists and can be described to a model
 *      → ordered, bounded                    the Active Operation View
 * ```
 *
 * Every step is subtractive, so there is no input to this function that widens anything. An unknown
 * ref, an unknown group, an operation outside the ceiling, or a descriptor with nothing to show a
 * model all narrow the result and are recorded as omissions with a reason. None of them fails the
 * Execution, and none of them becomes a permission.
 *
 * Determinism is a requirement rather than a nicety. A projection snapshot is only meaningful if
 * the view it was cut from would be produced again from the same inputs, so ordering is by
 * `(capability, operation)`, group membership is evaluated against catalog enumeration in the
 * catalog's own stable order, and the bound is applied after ordering. There is no ranking model,
 * no retrieval index, and no extra inference: large-catalog selection is a scaling problem for a
 * later slice, and solving it here would have put a mandatory model call in front of every Agent
 * turn.
 *
 * The resolver holds a read-only authority source and a catalog. It holds nothing that can dispatch,
 * decide, persist, or settle - and the architecture suite walks its import graph to keep it that way.
 */

import type { ActiveOperationEntry, OmittedExposure } from "../operations/active-view.ts";
import { createActiveOperationView, unauthorizedActiveOperationView } from "../operations/active-view.ts";
import type { ActiveOperationView } from "../operations/active-view.ts";
import { authorizesOperation } from "../operations/authority.ts";
import type { OperationRef } from "../operations/refs.ts";
import { compareOperationRefs, formatOperationRef } from "../operations/refs.ts";
import type {
  ActiveOperationViewRequest,
  ActiveOperationViewResolver,
} from "../ports/active-operation-view.ts";
import type { CapabilityCatalog, CapabilityOperationDescriptor } from "../ports/capability-catalog.ts";
import type { CapabilityId, OperationId } from "../effects/ids.ts";
import type { EffectiveOperationAuthoritySource } from "../ports/effective-operation-authority.ts";

export interface ActiveOperationViewResolverOptions {
  readonly authority: EffectiveOperationAuthoritySource;
  readonly catalog: CapabilityCatalog;
}

/** Candidate identities, deduplicated and ordered, before any narrowing has happened. */
function requestedRefs(request: ActiveOperationViewRequest, catalog: CapabilityCatalog): readonly OperationRef[] {
  const byKey = new Map<string, OperationRef>();
  for (const ref of request.exposure.refs ?? []) {
    byKey.set(formatOperationRef(ref), { capability: ref.capability, operation: ref.operation });
  }
  const groups = request.exposure.groups ?? [];
  if (groups.length > 0) {
    for (const descriptor of catalog.list()) {
      if (!(descriptor.groups ?? []).some((group) => groups.includes(group))) continue;
      const ref = { capability: descriptor.capability as string, operation: descriptor.operation as string };
      byKey.set(formatOperationRef(ref), ref);
    }
  }
  return [...byKey.values()].sort(compareOperationRefs);
}

/** Whether a descriptor carries what a model call needs. Missing metadata is not a silent default. */
function projectable(descriptor: CapabilityOperationDescriptor): boolean {
  return typeof descriptor.description === "string" && descriptor.description.length > 0 && descriptor.input !== undefined;
}

function entryOf(descriptor: CapabilityOperationDescriptor): ActiveOperationEntry {
  return {
    capability: descriptor.capability as string,
    operation: descriptor.operation as string,
    title: descriptor.title ?? `${descriptor.capability}.${descriptor.operation}`,
    description: descriptor.description as string,
    input: descriptor.input!,
    consequential: descriptor.consequential,
    groups: [...(descriptor.groups ?? [])],
  };
}

export function createActiveOperationViewResolver(
  options: ActiveOperationViewResolverOptions,
): ActiveOperationViewResolver {
  return {
    async resolve(request: ActiveOperationViewRequest): Promise<ActiveOperationView> {
      const authority = await options.authority.effectiveOperationAuthority(request.executionId);
      const candidates = requestedRefs(request, options.catalog);

      // No ceiling means nothing is exposable. Every requested identity is reported as omitted for
      // that reason, so "nobody configured authority" is visible rather than looking like an Agent
      // that simply asked for nothing.
      if (!authority) {
        return unauthorizedActiveOperationView(
          candidates.map((ref) => ({ capability: ref.capability, operation: ref.operation, reason: "no_authority" as const })),
        );
      }

      const entries: ActiveOperationEntry[] = [];
      const omitted: OmittedExposure[] = [];

      for (const ref of candidates) {
        if (!authorizesOperation(authority, ref)) {
          omitted.push({ capability: ref.capability, operation: ref.operation, reason: "not_authorized" });
          continue;
        }
        const descriptor = options.catalog.describe(ref.capability as CapabilityId, ref.operation as OperationId);
        if (!descriptor) {
          omitted.push({ capability: ref.capability, operation: ref.operation, reason: "not_in_catalog" });
          continue;
        }
        // A further intersection, applied after authority so a task scope can only narrow.
        if (request.taskScope && request.taskScope.length > 0) {
          const groups = descriptor.groups ?? [];
          if (!groups.some((group) => request.taskScope!.includes(group))) {
            omitted.push({ capability: ref.capability, operation: ref.operation, reason: "beyond_bound" });
            continue;
          }
        }
        if (!projectable(descriptor)) {
          omitted.push({ capability: ref.capability, operation: ref.operation, reason: "not_projectable" });
          continue;
        }
        entries.push(entryOf(descriptor));
      }

      entries.sort(compareOperationRefs);

      // The bound is a context budget applied last, so which operations survive it is a function of
      // the ordering and not of the order the author happened to list them in.
      const bound = request.exposure.maxOperations;
      const kept = bound === undefined ? entries : entries.slice(0, bound);
      if (bound !== undefined) {
        for (const dropped of entries.slice(bound)) {
          omitted.push({ capability: dropped.capability, operation: dropped.operation, reason: "beyond_bound" });
        }
      }

      return createActiveOperationView({
        authorityId: authority.authorityId,
        authorityVersion: authority.version,
        entries: kept,
        omitted,
      });
    },
  };
}
