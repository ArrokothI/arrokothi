/**
 * What a model-facing action resolves to.
 *
 * A projection binding says "the model saw the name `docs_search`". This says what that name
 * *means* to the kernel once the model has used it. In v0.4 there is exactly one answer - a
 * capability operation, which becomes a `UseCapability` Effect - and the type is a union anyway,
 * because the shape of the persisted binding is the thing that would be expensive to change later.
 *
 * ```text
 * v0.4                  capability_operation  ->  UseCapability
 * canonically possible  memory write / child execution / message / user input / local computation
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

export const MODEL_ACTION_TARGET_KINDS = ["capability_operation"] as const;

export type ModelActionTargetKind = (typeof MODEL_ACTION_TARGET_KINDS)[number];

/** The only target kind v0.4 supports. Resolves to an ordinary `UseCapability` proposal. */
export interface CapabilityOperationTarget {
  readonly kind: "capability_operation";
  readonly capability: string;
  readonly operation: string;
}

export type ModelActionTarget = CapabilityOperationTarget;

export function capabilityOperationTarget(ref: OperationRef): CapabilityOperationTarget {
  return { kind: "capability_operation", capability: ref.capability, operation: ref.operation };
}

/** Reads a target as an operation identity, or `null` when it names some other action family. */
export function operationRefOfTarget(target: ModelActionTarget): OperationRef | null {
  if (target.kind !== "capability_operation") return null;
  return { capability: target.capability, operation: target.operation };
}

/** Human-readable form for messages and trace records. Never parsed back into an identity. */
export function formatModelActionTarget(target: ModelActionTarget): string {
  return target.kind === "capability_operation"
    ? `${target.capability}/${target.operation}`
    : `${(target as { kind: string }).kind}`;
}

export function isModelActionTarget(value: unknown): value is ModelActionTarget {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate["kind"] !== "capability_operation") return false;
  return typeof candidate["capability"] === "string" && typeof candidate["operation"] === "string";
}
