/** Minimal composition-root routing from resolved provider identity to one implementation. */

import { ModelResolutionError } from "../model/errors.ts";
import type { ResolvedModel } from "../model/types.ts";
import type { ModelProvider } from "../ports/model-provider.ts";

export class ModelProviderRegistry {
  private readonly providers = new Map<string, ModelProvider>();

  constructor(providers: readonly ModelProvider[]) {
    for (const provider of providers) {
      if (!provider.id.trim()) {
        throw new ModelResolutionError("invalid_configuration", "registered provider identity must be non-empty");
      }
      if (this.providers.has(provider.id)) {
        throw new ModelResolutionError("invalid_configuration", `provider ${provider.id} was registered more than once`, {
          provider: provider.id,
        });
      }
      this.providers.set(provider.id, provider);
    }
  }

  providerFor(resolved: ResolvedModel): ModelProvider {
    const provider = this.providers.get(resolved.provider);
    if (!provider) {
      throw new ModelResolutionError(
        "provider_not_registered",
        `no ModelProvider is registered for resolved provider ${resolved.provider}`,
        { logicalRef: resolved.logicalRef, provider: resolved.provider, model: resolved.model },
      );
    }
    return provider;
  }
}
