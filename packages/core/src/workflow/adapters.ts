/**
 * Adapter declarations: authored boundary transformations.
 *
 * An Adapter is a lightweight computation attached to a Stage boundary. It reports what the value
 * should become, or that it should be rejected. It does not decide what happens next.
 *
 * ```text
 * Stage input -> input Adapter(s) -> Stage computation -> output Adapter(s) -> result / transition
 * ```
 *
 * The prohibition list is enforced by API shape rather than by comment: an `AdapterContext`
 * (`ports/adapter.ts`) has no Effect proposer, no capability handle, no memory writer, no
 * spawn/call, and no way to name a next Stage. There is nothing an Adapter could return that would
 * move the Workflow somewhere the definition did not declare. An `AdapterResult.nextStage` field
 * would defeat the whole point, so no such field exists.
 *
 * Two declaration kinds, matching the canonical vocabulary:
 *
 *   function   one local computation, reached by logical implementation ref
 *   llm        exactly one bounded model inference, with no callables exposed
 */

import type { LogicalModelRequest } from "../model/types.ts";
import type { JsonObject } from "../util/json.ts";
import type { ImplementationRef } from "./spec.ts";

export interface FunctionAdapterDeclaration {
  readonly kind: "function";
  readonly implementationRef: ImplementationRef;
  readonly config?: JsonObject;
}

/**
 * One bounded model inference at a boundary.
 *
 * There is no `callables` field. An LLM Adapter never exposes model-callable operations, so a
 * provider that returns a capability call at this boundary is returning something that was not
 * requested - and `validateModelProviderResponse` rejects exactly that, at the provider edge,
 * before any of it becomes Adapter output.
 */
export interface LLMAdapterDeclaration {
  readonly kind: "llm";
  readonly model: LogicalModelRequest;
  readonly system: string;
  /** `{{value}}` is substituted with the value being adapted. */
  readonly prompt: string;
}

export type AdapterDeclaration = FunctionAdapterDeclaration | LLMAdapterDeclaration;

export type AdapterKind = AdapterDeclaration["kind"];

export const ADAPTER_KINDS: readonly AdapterKind[] = ["function", "llm"];

export function isAdapterKind(value: unknown): value is AdapterKind {
  return value === "function" || value === "llm";
}
