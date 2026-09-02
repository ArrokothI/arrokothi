/**
 * What a model-facing action resolves to.
 *
 * A projection binding says "the model saw the name `docs_search`". This says what that name
 * *means* to the kernel once the model has used it. Capability operations become `UseCapability`;
 * Slice F.0 adds the view-neutral `write_memory` target for the existing `WriteMemory` Effect.
 *
 * ```text
 * capability_operation  ->  UseCapability
 * write_memory          ->  WriteMemory
 * later                 ->  child execution / message / user input / local computation
 * ```
 *
 * Canonical interoperability already permits a portable Operation to resolve to something other
 * than capability use. Nothing here implements any of that, and nothing here is a registry of
 * actions: this is one discriminated field on a record that is written into an invocation snapshot,
 * so that adding a second action family later is a new arm rather than a migration of every
 * persisted projection. A controller switches on `kind`; an unrecognised `kind` resolves to nothing
 * rather than being guessed at.
 *
 * A target is *identity*, not permission. Naming an operation here neither exposes it nor authorizes
 * it: the Active View decided the first, and the Harness decides the second, from current effective
 * authority, at dispatch.
 */

import type { OperationRef } from "./refs.ts";

export const MODEL_ACTION_TARGET_KINDS = ["capability_operation", "write_memory"] as const;

export type ModelActionTargetKind = (typeof MODEL_ACTION_TARGET_KINDS)[number];

/** Resolves to an ordinary `UseCapability` proposal. */
export interface CapabilityOperationTarget {
  readonly kind: "capability_operation";
  readonly capability: string;
  readonly operation: string;
}

/** A generic Structured Memory write. The runtime chooses and validates the bound view/schema. */
export interface MemoryWriteTarget {
  readonly kind: "write_memory";
}

export type ModelActionTarget = CapabilityOperationTarget | MemoryWriteTarget;

export function capabilityOperationTarget(ref: OperationRef): CapabilityOperationTarget {
  return { kind: "capability_operation", capability: ref.capability, operation: ref.operation };
}

export function memoryWriteTarget(): MemoryWriteTarget {
  return { kind: "write_memory" };
}

/** Reads a target as an operation identity, or `null` when it names some other action family. */
export function operationRefOfTarget(target: ModelActionTarget): OperationRef | null {
  if (target.kind !== "capability_operation") return null;
  return { capability: target.capability, operation: target.operation };
}

/** Human-readable form for messages and trace records. Never parsed back into an identity. */
export function formatModelActionTarget(target: ModelActionTarget): string {
  return target.kind === "capability_operation" ? `${target.capability}/${target.operation}` : "write_memory";
}

export function isModelActionTarget(value: unknown): value is ModelActionTarget {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate["kind"] === "write_memory") return Object.keys(candidate).length === 1;
  if (candidate["kind"] !== "capability_operation") return false;
  return typeof candidate["capability"] === "string" && typeof candidate["operation"] === "string";
}
