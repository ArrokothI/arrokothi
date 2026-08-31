/** Provider invocation port for an already-resolved concrete model. */

import type { ModelProviderRequest, ModelProviderResponse, ResolvedModel } from "../model/types.ts";

export interface ModelProvider {
  readonly id: string;
  generate(request: ModelProviderRequest): Promise<ModelProviderResponse>;
}

/**
 * Composition-root routing from a resolved provider identity to one implementation.
 *
 * Deliberately separate from `ModelResolver`: resolution answers *which* provider and model a
 * logical reference means, and this answers *who* implements the provider that resolution named.
 * Keeping them apart is what stops a provider from performing application-level routing, and it is
 * why controller code can hold both without either becoming a place to hide deployment policy.
 */
export interface ModelProviderLookup {
  providerFor(resolved: ResolvedModel): ModelProvider;
}
