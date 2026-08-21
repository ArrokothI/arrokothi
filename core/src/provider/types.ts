import type { ObjectSchema } from "../schema/value-schema.ts";

/**
 * Provider-neutral model interfaces.
 *
 * Core defines these and nothing more. It never imports a provider SDK, never reads an environment
 * variable, and never holds a credential. `providers/gemini` implements this interface outside core;
 * a test injects `ScriptedModelProvider` instead. The runtime cannot tell the difference.
 */

/** A reference to a model, stored on the AgentDefinition. Resolving it is the caller's job. */
export interface ModelPolicy {
  /** Matched against `ModelProvider.id` when a provider is injected. */
  providerId: string;
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export type ModelRole = "user" | "assistant" | "tool";

export interface ModelMessage {
  role: ModelRole;
  content: string;
  /** For `tool` messages: which tool produced this content. */
  toolName?: string;
}

/** A tool offered to the model. Projected from `ToolDefinition`; carries no executor. */
export interface ModelToolSpec {
  name: string;
  description: string;
  input: ObjectSchema;
}

export interface ModelRequest {
  /** The compiled context. Everything the model is allowed to see, and nothing else. */
  system: string;
  messages: ModelMessage[];
  tools?: ModelToolSpec[];
  /** When set, the provider must return JSON matching this schema in `ModelResponse.json`. */
  responseSchema?: ObjectSchema;
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** Free-form label identifying which harness pass issued this call, recorded in traces. */
  purpose?: string;
  /** Optional cancellation signal supplied by an execution Harness. */
  signal?: AbortSignal;
}

export interface ModelToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface ModelUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface ModelResponse {
  text?: string;
  toolCalls?: ModelToolCall[];
  /** Parsed structured output when `responseSchema` was supplied. */
  json?: unknown;
  /** Provider/model actually used - recorded in traces, never assumed to equal the request. */
  providerId: string;
  model: string;
  usage?: ModelUsage;
  finishReason?: string;
  /** Provider-specific payload for debugging. Never enters compiled context. */
  raw?: unknown;
}

export interface ModelProvider {
  readonly id: string;
  generate(request: ModelRequest): Promise<ModelResponse>;
}

/** Thrown by adapters for transport/quota failures, so the runtime can event them truthfully. */
export class ModelProviderError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = "ModelProviderError";
    this.code = code;
    this.retryable = retryable;
  }
}
