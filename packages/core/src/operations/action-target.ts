/**
 * What a model-facing action resolves to.
 *
 * A projection binding says "the model saw the name `docs_search`". This says what that name
 * *means* to the kernel once the model has used it. Capability operations become `UseCapability`;
 * Structured Memory write interfaces become `WriteMemory`; a local Working Notes update becomes a
 * controller-local scratch mutation and no Effect at all.
 *
 * ```text
 * capability_operation      -> UseCapability
 * structured_memory_write   -> WriteMemory
 * working_notes_set         -> controller-local Working Notes update (no Effect, no Event)
 * ```
 *
 * A target is *identity*, not permission. Naming an action here neither exposes it nor authorizes
 * it: an authorized Active View decided the first, and the Harness decides the second from current
 * effective authority at dispatch. `working_notes_set` is the exception that proves the rule about
 * *dispatch*, not exposure: it still originates in an Active View, but it mutates only the
 * controller's own local frame, so there is no concrete Effect for the Harness to re-authorize.
 */

import type { OperationRef } from "./refs.ts";

export const MODEL_ACTION_TARGET_KINDS = [
  "capability_operation",
  "structured_memory_write",
  "working_notes_set",
] as const;

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

/**
 * The local Working Notes update action. Identity only, and it carries no key: unlike a Structured
 * Memory field, a note key is local vocabulary the model supplies with each call, not an identity
 * the binding owns.
 */
export interface WorkingNotesSetTarget {
  readonly kind: "working_notes_set";
}

export type ModelActionTarget =
  | CapabilityOperationTarget
  | StructuredMemoryWriteTarget
  | WorkingNotesSetTarget;

export function capabilityOperationTarget(ref: OperationRef): CapabilityOperationTarget {
  return { kind: "capability_operation", capability: ref.capability, operation: ref.operation };
}

export function structuredMemoryWriteTarget(key: string): StructuredMemoryWriteTarget {
  if (typeof key !== "string" || key.length === 0) throw new TypeError("a Structured Memory write target needs a key");
  return { kind: "structured_memory_write", key };
}

export function workingNotesSetTarget(): WorkingNotesSetTarget {
  return { kind: "working_notes_set" };
}

/** Reads a target as an operation identity, or `null` when it names another action family. */
export function operationRefOfTarget(target: ModelActionTarget): OperationRef | null {
  if (target.kind !== "capability_operation") return null;
  return { capability: target.capability, operation: target.operation };
}

/** Human-readable form for messages and trace records. Never parsed back into an identity. */
export function formatModelActionTarget(target: ModelActionTarget): string {
  switch (target.kind) {
    case "capability_operation":
      return `${target.capability}/${target.operation}`;
    case "structured_memory_write":
      return `Structured Memory/${target.key}`;
    case "working_notes_set":
      return "Working Notes/set";
  }
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
  if (candidate["kind"] === "working_notes_set") {
    return Object.keys(candidate).length === 1;
  }
  return false;
}
