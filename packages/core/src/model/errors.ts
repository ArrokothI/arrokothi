/** Stable kernel-owned failure taxonomy for model resolution and invocation. */

import type { PortableModelFeature } from "./types.ts";

export type ModelResolutionErrorCode =
  | "invalid_configuration"
  | "logical_model_not_configured"
  | "provider_not_registered"
  | "concrete_model_unavailable"
  | "required_feature_unsupported";

export interface ModelResolutionErrorOptions {
  readonly logicalRef?: string;
  readonly provider?: string;
  readonly model?: string;
  readonly feature?: PortableModelFeature;
}

export class ModelResolutionError extends Error {
  readonly code: ModelResolutionErrorCode;
  readonly logicalRef?: string;
  readonly provider?: string;
  readonly model?: string;
  readonly feature?: PortableModelFeature;

  constructor(code: ModelResolutionErrorCode, message: string, options: ModelResolutionErrorOptions = {}) {
    super(message);
    this.name = "ModelResolutionError";
    this.code = code;
    this.logicalRef = options.logicalRef;
    this.provider = options.provider;
    this.model = options.model;
    this.feature = options.feature;
  }
}

export type ModelInvocationErrorCode =
  | "invalid_request"
  | "authentication"
  | "rate_limit"
  | "transport"
  | "provider_rejected"
  | "invalid_response"
  | "cancelled";

export interface ModelInvocationErrorOptions {
  readonly retryable?: boolean;
  readonly provider?: string;
  readonly model?: string;
  readonly cause?: unknown;
}

export class ModelInvocationError extends Error {
  readonly code: ModelInvocationErrorCode;
  readonly retryable: boolean;
  readonly provider?: string;
  readonly model?: string;
  override readonly cause?: unknown;

  constructor(code: ModelInvocationErrorCode, message: string, options: ModelInvocationErrorOptions = {}) {
    super(message);
    this.name = "ModelInvocationError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.provider = options.provider;
    this.model = options.model;
    this.cause = options.cause;
  }
}
