/** Provider invocation port for an already-resolved concrete model. */

import type { ModelProviderRequest, ModelProviderResponse } from "../model/types.ts";

export interface ModelProvider {
  readonly id: string;
  generate(request: ModelProviderRequest): Promise<ModelProviderResponse>;
}
