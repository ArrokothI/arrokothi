/**
 * What a model-facing action resolves to.
 *
 * A projection binding says "the model saw the name `docs_search`". This says what that name
 * *means* to the kernel once the model has used it. Capability operations become `UseCapability`;
 * Structured Memory write interfaces become `WriteMemory`.
 *
 * ```text
 * capability_operation      -> UseCapability
 * structured_memory_write   -> WriteMemory
 * ```
 *
 * A target is *identity*, not permission. Naming an action here neither exposes it nor authorizes
 * it: an authorized Active View decided the first, and the Harness decides the second from current
 * effective authority at dispatch.
 */

import type { OperationRef } from "./refs.ts";

export const MODEL_ACTION_TARGET_KINDS = ["capability_operation", "structured_memory_write"] as const;

export type ModelActionTargetKind = (typeof MODEL_ACTION_TARGET_KINDS)[number];

/** Resolves to an ordinary `UseCapability` proposal. */
export interface CapabilityOperationTarget {
  readonly kind: "capability_operation";
  readonly capability: string;
  readonly operation: string;
}

/** One exact Structured Memory field identity. It carries no value, view id, or authority. */
export interface StructuredMemoryWriteTarget {
  readonly kind: "structured_memory_write";
  readonly key: string;
}

export type ModelActionTarget = CapabilityOperationTarget | StructuredMemoryWriteTarget;

export function capabilityOperationTarget(ref: OperationRef): CapabilityOperationTarget {
  return { kind: "capability_operation", capability: ref.capability, operation: ref.operation };
}

export function structuredMemoryWriteTarget(key: string): StructuredMemoryWriteTarget {
  if (typeof key !== "string" || key.length === 0) throw new TypeError("a Structured Memory write target needs a key");
  return { kind: "structured_memory_write", key };
}

/** Reads a target as an operation identity, or `null` when it names another action family. */
export function operationRefOfTarget(target: ModelActionTarget): OperationRef | null {
  if (target.kind !== "capability_operation") return null;
  return { capability: target.capability, operation: target.operation };
}

/** Human-readable form for messages and trace records. Never parsed back into an identity. */
export function formatModelActionTarget(target: ModelActionTarget): string {
  return target.kind === "capability_operation"
    ? `${target.capability}/${target.operation}`
    : `Structured Memory/${target.key}`;
}

export function isModelActionTarget(value: unknown): value is ModelActionTarget {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate["kind"] === "capability_operation") {
    return (
      Object.keys(candidate).length === 3 &&
      typeof candidate["capability"] === "string" &&
      candidate["capability"].length > 0 &&
      typeof candidate["operation"] === "string" &&
      candidate["operation"].length > 0
    );
  }
  if (candidate["kind"] === "structured_memory_write") {
    return Object.keys(candidate).length === 2 && typeof candidate["key"] === "string" && candidate["key"].length > 0;
  }
  return false;
}
