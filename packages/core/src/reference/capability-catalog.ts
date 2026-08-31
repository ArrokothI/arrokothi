/**
 * A reference CapabilityCatalog: a fixed list of descriptors, matched by capability and operation.
 */

import { capabilityId, operationId } from "../effects/ids.ts";
import type { CapabilityCatalog, CapabilityOperationDescriptor } from "../ports/capability-catalog.ts";

export interface CapabilityOperationDescriptorInput {
  /** Plain strings: this is application configuration, so the factory brands and validates. */
  readonly capability: string;
  readonly operation: string;
  readonly consequential: boolean;
}

export function createCapabilityCatalog(descriptors: readonly CapabilityOperationDescriptorInput[]): CapabilityCatalog {
  const byKey = new Map<string, CapabilityOperationDescriptor>();
  for (const input of descriptors) {
    const capability = capabilityId(input.capability);
    const operation = operationId(input.operation);
    byKey.set(`${capability}:${operation}`, { capability, operation, consequential: input.consequential });
  }
  return {
    describe(capability, operation) {
      return byKey.get(`${capability}:${operation}`);
    },
  };
}
