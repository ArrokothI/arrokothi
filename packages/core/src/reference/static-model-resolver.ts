/** Dependency-free deterministic ModelResolver for application wiring and tests. */

import { ModelResolutionError } from "../model/errors.ts";
import type {
  ModelLimits,
  ModelResolutionRequest,
  PortableModelFeatures,
  ResolvedModel,
} from "../model/types.ts";
import {
  assertModelRequirementsSupported,
  unavailableOptionalModelFeatures,
} from "../model/validation.ts";
import type { ModelResolver } from "../ports/model-resolver.ts";
import { cloneJson, isJsonObject } from "../util/json.ts";
import type { JsonObject } from "../util/json.ts";

export interface StaticModelMapping {
  readonly provider: string;
  readonly model: string;
  readonly portableFeatures: PortableModelFeatures;
  readonly limits?: ModelLimits;
  readonly deploymentMetadata?: JsonObject;
  /** Allows deterministic representation of a configured deployment whose model is unavailable. */
  readonly available?: boolean;
}

function positiveLimit(value: number | undefined): boolean {
  return value === undefined || (Number.isFinite(value) && value > 0);
}

function assertMapping(logicalRef: string, mapping: StaticModelMapping): void {
  const fail = (message: string): never => {
    throw new ModelResolutionError("invalid_configuration", `invalid mapping for logical model "${logicalRef}": ${message}`, {
      logicalRef,
      provider: mapping.provider,
      model: mapping.model,
    });
  };
  if (!logicalRef.trim()) fail("logical reference must be non-empty");
  if (!mapping.provider.trim()) fail("provider identity must be non-empty");
  if (!mapping.model.trim()) fail("concrete model identity must be non-empty");
  const features = mapping.portableFeatures;
  if (!features || [features.text, features.capabilityCalls, features.structuredOutput, features.cancellation, features.usageMetadata]
    .some((value) => typeof value !== "boolean")) {
    fail("portableFeatures must explicitly declare every portable feature");
  }
  if (!positiveLimit(mapping.limits?.maxInputTokens) || !positiveLimit(mapping.limits?.maxOutputTokens)) {
    fail("model limits must be positive finite numbers");
  }
  if (mapping.deploymentMetadata !== undefined && !isJsonObject(mapping.deploymentMetadata)) {
    fail("deploymentMetadata must be a serializable JSON object");
  }
}

function copyMapping(logicalRef: string, mapping: StaticModelMapping): StaticModelMapping {
  assertMapping(logicalRef, mapping);
  return {
    provider: mapping.provider,
    model: mapping.model,
    portableFeatures: { ...mapping.portableFeatures },
    ...(mapping.limits ? { limits: { ...mapping.limits } } : {}),
    ...(mapping.deploymentMetadata ? { deploymentMetadata: cloneJson(mapping.deploymentMetadata) } : {}),
    ...(mapping.available !== undefined ? { available: mapping.available } : {}),
  };
}

/** Convenience for an explicit feature set whose only baseline capability is text generation. */
export function portableModelFeatures(
  overrides: Partial<Omit<PortableModelFeatures, "text">> & { readonly text?: boolean } = {},
): PortableModelFeatures {
  return {
    text: overrides.text ?? true,
    capabilityCalls: overrides.capabilityCalls ?? false,
    structuredOutput: overrides.structuredOutput ?? false,
    cancellation: overrides.cancellation ?? false,
    usageMetadata: overrides.usageMetadata ?? false,
  };
}

export class StaticModelResolver implements ModelResolver {
  readonly requests: ModelResolutionRequest[] = [];
  private readonly mappings = new Map<string, StaticModelMapping>();

  constructor(mappings: Readonly<Record<string, StaticModelMapping>>) {
    for (const [logicalRef, mapping] of Object.entries(mappings)) {
      this.mappings.set(logicalRef, copyMapping(logicalRef, mapping));
    }
  }

  resolve(request: ModelResolutionRequest): ResolvedModel {
    this.requests.push({
      logicalRef: request.logicalRef,
      requirements: { ...request.requirements },
      ...(request.policy ? { policy: cloneJson(request.policy) } : {}),
    });
    const mapping = this.mappings.get(request.logicalRef);
    if (!mapping) {
      throw new ModelResolutionError(
        "logical_model_not_configured",
        `logical model "${request.logicalRef}" is not configured`,
        { logicalRef: request.logicalRef },
      );
    }
    if (mapping.available === false) {
      throw new ModelResolutionError(
        "concrete_model_unavailable",
        `configured model ${mapping.provider}/${mapping.model} is unavailable`,
        { logicalRef: request.logicalRef, provider: mapping.provider, model: mapping.model },
      );
    }
    assertModelRequirementsSupported(request.logicalRef, request.requirements, mapping);
    return {
      logicalRef: request.logicalRef,
      provider: mapping.provider,
      model: mapping.model,
      portableFeatures: { ...mapping.portableFeatures },
      unavailableOptionalFeatures: unavailableOptionalModelFeatures(request.requirements, mapping.portableFeatures),
      ...(mapping.limits ? { limits: { ...mapping.limits } } : {}),
      ...(mapping.deploymentMetadata ? { deploymentMetadata: cloneJson(mapping.deploymentMetadata) } : {}),
    };
  }
}
