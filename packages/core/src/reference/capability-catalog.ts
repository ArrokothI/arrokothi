/**
 * A reference CapabilityCatalog: a fixed list of descriptors, matched by capability and operation.
 *
 * Enumeration is ordered by `(capability, operation)` rather than by declaration order, so two
 * catalogs configured with the same descriptors in a different order enumerate identically and a
 * deterministic Active View stays deterministic across wiring changes.
 */

import { capabilityId, operationId } from "../effects/ids.ts";
import type { CapabilityCatalog, CapabilityOperationDescriptor } from "../ports/capability-catalog.ts";
import type { ObjectSchema } from "../schema/value-schema.ts";

export interface CapabilityOperationDescriptorInput {
  /** Plain strings: this is application configuration, so the factory brands and validates. */
  readonly capability: string;
  readonly operation: string;
  readonly consequential: boolean;
  readonly title?: string;
  readonly description?: string;
  readonly input?: ObjectSchema;
  readonly groups?: readonly string[];
}

export function createCapabilityCatalog(descriptors: readonly CapabilityOperationDescriptorInput[]): CapabilityCatalog {
  const byKey = new Map<string, CapabilityOperationDescriptor>();
  for (const input of descriptors) {
    const capability = capabilityId(input.capability);
    const operation = operationId(input.operation);
    byKey.set(`${capability}:${operation}`, {
      capability,
      operation,
      consequential: input.consequential,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.input !== undefined ? { input: input.input } : {}),
      ...(input.groups !== undefined ? { groups: [...input.groups] } : {}),
    });
  }
  const ordered = [...byKey.values()].sort((a, b) =>
    a.capability !== b.capability
      ? a.capability < b.capability
        ? -1
        : 1
      : a.operation < b.operation
        ? -1
        : a.operation > b.operation
          ? 1
          : 0,
  );
  return {
    describe(capability, operation) {
      return byKey.get(`${capability}:${operation}`);
    },
    list() {
      return ordered;
    },
  };
}
