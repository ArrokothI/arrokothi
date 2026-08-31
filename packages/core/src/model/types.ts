/**
 * Portable model semantics shared by resolution and provider ports.
 *
 * A logical reference belongs to authored semantics. Provider and concrete-model identities appear
 * only after deployment resolution. Every shape in this file is data: no credentials, clients,
 * transport handles, runtime stores, or Effect executors can be represented here.
 */

import type { ObjectSchema } from "../schema/value-schema.ts";
import type { JsonObject } from "../util/json.ts";

/** Application-defined role/profile name such as `primary`, `planner`, or `summarizer`. */
export type LogicalModelRef = string;

export type ModelRequirementLevel = "required" | "optional";

/**
 * The deliberately narrow portable requirement vocabulary needed by Workflow/Agent work.
 *
 * Text is the baseline and is always required. Optional features are called out explicitly so an
 * absent optional feature can be observed after resolution rather than silently emulated.
 */
export interface ModelRequirements {
  readonly text: true;
  readonly capabilityCalls?: ModelRequirementLevel;
  readonly structuredOutput?: ModelRequirementLevel;
  readonly cancellation?: ModelRequirementLevel;
  readonly usageMetadata?: ModelRequirementLevel;
}

export type PortableModelFeature =
  | "text"
  | "capabilityCalls"
  | "structuredOutput"
  | "cancellation"
  | "usageMetadata";

export const PORTABLE_MODEL_FEATURES: readonly PortableModelFeature[] = [
  "text",
  "capabilityCalls",
  "structuredOutput",
  "cancellation",
  "usageMetadata",
];

/** Explicit support facts for one concrete deployment model. */
export interface PortableModelFeatures {
  readonly text: boolean;
  readonly capabilityCalls: boolean;
  readonly structuredOutput: boolean;
  readonly cancellation: boolean;
  readonly usageMetadata: boolean;
}

export interface ModelLimits {
  readonly maxInputTokens?: number;
  readonly maxOutputTokens?: number;
}

/**
 * Descriptive resolution result. This is not a transport handle.
 *
 * `unavailableOptionalFeatures` is request-specific negotiation output. Required missing features
 * never produce a ResolvedModel; they fail during resolution instead.
 */
export interface ResolvedModel {
  readonly logicalRef: LogicalModelRef;
  readonly provider: string;
  readonly model: string;
  readonly portableFeatures: PortableModelFeatures;
  readonly unavailableOptionalFeatures: readonly PortableModelFeature[];
  readonly limits?: ModelLimits;
  /** Serializable, non-secret deployment diagnostics only. */
  readonly deploymentMetadata?: JsonObject;
}

/** The definition-facing shape future Agent/Workflow specs can embed. */
export interface LogicalModelRequest {
  readonly logicalRef: LogicalModelRef;
  readonly requirements: ModelRequirements;
}

export interface ModelResolutionRequest extends LogicalModelRequest {
  /** Opaque, serializable deployment/policy facts. Core assigns no tenancy or billing semantics. */
  readonly policy?: JsonObject;
}

export type ModelMessageRole = "user" | "assistant" | "capability";

export interface ModelMessage {
  readonly role: ModelMessageRole;
  readonly content: string;
  /** Present for a capability observation returned to the model. */
  readonly capability?: string;
  readonly capabilityCallId?: string;
}

/** Model-facing projection of an exposed capability. It has no executor and grants no authority. */
export interface ModelCapabilitySpec {
  readonly name: string;
  readonly description: string;
  readonly input: ObjectSchema;
}

/** A model's requested operation. This is data, not an Effect and never dispatches by itself. */
export interface ModelCapabilityCall {
  readonly id?: string;
  readonly capability: string;
  readonly input: JsonObject;
}

export interface ModelStructuredOutputRequest {
  readonly schema: ObjectSchema;
  readonly name?: string;
  readonly description?: string;
}

export interface ModelProviderRequest {
  /** Already-resolved provider/model selection; a provider must not perform application routing. */
  readonly model: ResolvedModel;
  readonly requirements: ModelRequirements;
  readonly system: string;
  readonly messages: readonly ModelMessage[];
  readonly capabilities?: readonly ModelCapabilitySpec[];
  readonly structuredOutput?: ModelStructuredOutputRequest;
  readonly purpose?: string;
  readonly signal?: AbortSignal;
}

export interface ModelUsage {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
}

export interface ModelOutput {
  readonly text?: string;
  readonly capabilityCalls?: readonly ModelCapabilityCall[];
  readonly structured?: JsonObject;
}

export interface ModelResponseMetadata {
  readonly provider: string;
  /** Actual provider-reported model/version, which may be more specific than the requested id. */
  readonly model: string;
  readonly usage?: ModelUsage;
  readonly finishReason?: string;
}

export interface ModelDiagnostics {
  /** Provider-specific debug data, deliberately separated from semantic output/context. */
  readonly provider?: JsonObject;
}

export interface ModelProviderResponse {
  readonly output: ModelOutput;
  readonly metadata: ModelResponseMetadata;
  readonly diagnostics?: ModelDiagnostics;
}
