/** Deployment-owned logical-model resolution port. */

import type { ModelResolutionRequest, ResolvedModel } from "../model/types.ts";

export interface ModelResolver {
  resolve(request: ModelResolutionRequest): Promise<ResolvedModel> | ResolvedModel;
}
