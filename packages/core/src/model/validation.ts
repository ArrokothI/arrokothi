/** Portable feature negotiation and provider-boundary validation. */

import { validateObject } from "../schema/value-schema.ts";
import { isJsonObject, jsonIssues } from "../util/json.ts";
import { ModelInvocationError, ModelResolutionError } from "./errors.ts";
import type {
  ModelProviderRequest,
  ModelProviderResponse,
  ModelRequirements,
  PortableModelFeature,
  PortableModelFeatures,
  ResolvedModel,
} from "./types.ts";

export function requiredModelFeatures(requirements: ModelRequirements): readonly PortableModelFeature[] {
  const required: PortableModelFeature[] = ["text"];
  if (requirements.capabilityCalls === "required") required.push("capabilityCalls");
  if (requirements.structuredOutput === "required") required.push("structuredOutput");
  if (requirements.cancellation === "required") required.push("cancellation");
  if (requirements.usageMetadata === "required") required.push("usageMetadata");
  return required;
}

export function optionalModelFeatures(requirements: ModelRequirements): readonly PortableModelFeature[] {
  const optional: PortableModelFeature[] = [];
  if (requirements.capabilityCalls === "optional") optional.push("capabilityCalls");
  if (requirements.structuredOutput === "optional") optional.push("structuredOutput");
  if (requirements.cancellation === "optional") optional.push("cancellation");
  if (requirements.usageMetadata === "optional") optional.push("usageMetadata");
  return optional;
}

export function unsupportedRequiredModelFeatures(
  requirements: ModelRequirements,
  supported: PortableModelFeatures,
): readonly PortableModelFeature[] {
  return requiredModelFeatures(requirements).filter((feature) => supported[feature] !== true);
}

export function unavailableOptionalModelFeatures(
  requirements: ModelRequirements,
  supported: PortableModelFeatures,
): readonly PortableModelFeature[] {
  return optionalModelFeatures(requirements).filter((feature) => supported[feature] !== true);
}

export function assertModelRequirementsSupported(
  logicalRef: string,
  requirements: ModelRequirements,
  resolved: Pick<ResolvedModel, "provider" | "model" | "portableFeatures">,
): void {
  const missing = unsupportedRequiredModelFeatures(requirements, resolved.portableFeatures)[0];
  if (missing) {
    throw new ModelResolutionError(
      "required_feature_unsupported",
      `logical model "${logicalRef}" resolves to ${resolved.provider}/${resolved.model}, which does not support required feature ${missing}`,
      { logicalRef, provider: resolved.provider, model: resolved.model, feature: missing },
    );
  }
}

/** Defensive check at the provider edge; ordinary required-feature failure belongs in resolution. */
export function assertModelProviderRequest(request: ModelProviderRequest, providerId: string): void {
  const invalid = (message: string): never => {
    throw new ModelInvocationError("invalid_request", message, {
      provider: providerId,
      model: request.model.model,
    });
  };

  if (!request.model.provider || request.model.provider !== providerId) {
    invalid(`provider ${providerId} cannot invoke a model resolved for ${request.model.provider || "an empty provider"}`);
  }
  if (!request.model.model) invalid("resolved concrete model id must be non-empty");
  if (request.requirements.text !== true) invalid("portable text generation must be required");

  const missing = unsupportedRequiredModelFeatures(request.requirements, request.model.portableFeatures)[0];
  if (missing) invalid(`resolved model is missing required feature ${missing}; resolution should have failed before invocation`);
  if (request.capabilities?.length && !request.model.portableFeatures.capabilityCalls) {
    invalid("capability call specs were supplied to a model that does not support capability calls");
  }
  if (request.structuredOutput && !request.model.portableFeatures.structuredOutput) {
    invalid("structured output was supplied to a model that does not support structured output");
  }
  if (request.signal && !request.model.portableFeatures.cancellation) {
    invalid("a cancellation signal was supplied to a model that does not support cancellation");
  }
}

function responseError(request: ModelProviderRequest, message: string): never {
  throw new ModelInvocationError("invalid_response", message, {
    provider: request.model.provider,
    model: request.model.model,
  });
}

function validTokenCount(value: unknown): boolean {
  return value === undefined || (typeof value === "number" && Number.isFinite(value) && value >= 0);
}

/**
 * Validates and normalizes provider output before it can enter controller semantics.
 * Provider-specific diagnostics remain in their dedicated field and are required to be JSON data.
 */
export function validateModelProviderResponse(
  request: ModelProviderRequest,
  value: unknown,
): ModelProviderResponse {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    responseError(request, "provider response must be an object");
  }
  const candidate = value as Record<string, unknown>;
  const output = candidate["output"];
  const metadata = candidate["metadata"];
  if (output === null || typeof output !== "object" || Array.isArray(output)) {
    responseError(request, "provider response.output must be an object");
  }
  if (metadata === null || typeof metadata !== "object" || Array.isArray(metadata)) {
    responseError(request, "provider response.metadata must be an object");
  }

  const out = output as Record<string, unknown>;
  const meta = metadata as Record<string, unknown>;
  if (typeof meta["provider"] !== "string" || meta["provider"].length === 0) {
    responseError(request, "provider response metadata is missing provider identity");
  }
  if (meta["provider"] !== request.model.provider) {
    responseError(request, `provider response identity ${String(meta["provider"])} does not match resolved provider ${request.model.provider}`);
  }
  if (typeof meta["model"] !== "string" || meta["model"].length === 0) {
    responseError(request, "provider response metadata is missing concrete model identity");
  }
  if (meta["finishReason"] !== undefined && typeof meta["finishReason"] !== "string") {
    responseError(request, "provider finishReason must be a string when present");
  }

  const usage = meta["usage"];
  if (request.requirements.usageMetadata === "required" && (usage === undefined || usage === null)) {
    responseError(request, "provider omitted required usage metadata");
  }
  if (usage !== undefined) {
    if (usage === null || typeof usage !== "object" || Array.isArray(usage)) {
      responseError(request, "provider usage metadata must be an object");
    }
    const counts = usage as Record<string, unknown>;
    if (!validTokenCount(counts["inputTokens"]) || !validTokenCount(counts["outputTokens"]) || !validTokenCount(counts["totalTokens"])) {
      responseError(request, "provider usage token counts must be finite non-negative numbers");
    }
  }

  if (out["text"] !== undefined && typeof out["text"] !== "string") {
    responseError(request, "provider text output must be a string");
  }

  const calls = out["capabilityCalls"];
  if (calls !== undefined) {
    if (!request.capabilities?.length) responseError(request, "provider returned a capability call that was not requested");
    if (!Array.isArray(calls)) responseError(request, "provider capabilityCalls must be an array");
    for (const [index, call] of calls.entries()) {
      if (call === null || typeof call !== "object" || Array.isArray(call)) {
        responseError(request, `provider capabilityCalls[${index}] must be an object`);
      }
      const described = call as Record<string, unknown>;
      if (typeof described["capability"] !== "string" || described["capability"].length === 0) {
        responseError(request, `provider capabilityCalls[${index}] is missing a capability name`);
      }
      const spec = request.capabilities.find((candidate) => candidate.name === described["capability"]);
      if (!spec) {
        responseError(request, `provider requested unknown capability ${String(described["capability"])}`);
      }
      if (!isJsonObject(described["input"])) {
        responseError(request, `provider capabilityCalls[${index}].input must be a JSON object`);
      }
      const inputValidation = validateObject(spec.input, described["input"], { coerce: false });
      if (!inputValidation.ok) {
        responseError(
          request,
          `provider capabilityCalls[${index}].input failed schema validation: ${inputValidation.issues.map((i) => `${i.path}: ${i.message}`).join("; ")}`,
        );
      }
      if (described["id"] !== undefined && typeof described["id"] !== "string") {
        responseError(request, `provider capabilityCalls[${index}].id must be a string when present`);
      }
    }
  }

  let normalizedStructured = out["structured"];
  if (request.structuredOutput) {
    if (normalizedStructured === undefined) responseError(request, "provider omitted required structured output");
    const validation = validateObject(request.structuredOutput.schema, normalizedStructured, { coerce: false });
    if (!validation.ok) {
      responseError(request, `provider structured output failed schema validation: ${validation.issues.map((i) => `${i.path}: ${i.message}`).join("; ")}`);
    }
    normalizedStructured = validation.value;
  } else if (normalizedStructured !== undefined) {
    responseError(request, "provider returned structured output that was not requested");
  }

  if (out["text"] === undefined && calls === undefined && normalizedStructured === undefined) {
    responseError(request, "provider response contains no semantic output");
  }

  const diagnostics = candidate["diagnostics"];
  if (diagnostics !== undefined) {
    if (diagnostics === null || typeof diagnostics !== "object" || Array.isArray(diagnostics)) {
      responseError(request, "provider diagnostics must be an object");
    }
    const provider = (diagnostics as Record<string, unknown>)["provider"];
    if (provider !== undefined && !isJsonObject(provider)) {
      responseError(request, "provider diagnostics payload must be a JSON object");
    }
  }

  const jsonProblems = jsonIssues(candidate);
  if (jsonProblems.length > 0) responseError(request, `provider response is not serializable: ${jsonProblems[0]!.message}`);

  return {
    ...(candidate as unknown as ModelProviderResponse),
    output: {
      ...(out as ModelProviderResponse["output"]),
      ...(normalizedStructured !== undefined ? { structured: normalizedStructured as ModelProviderResponse["output"]["structured"] } : {}),
    },
  };
}
