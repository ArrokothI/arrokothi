/**
 * Execution identity.
 *
 * An `ExecutionId` names an independently managed runtime entity; an `ActivationId` names one
 * scheduled period during which a controller ran. They are different lifetimes and must never be
 * interchangeable - "the turn" and "the conversation" collapsing into one identifier is exactly
 * the confusion this kernel is built to avoid.
 *
 * Knowing an `ExecutionId` grants nothing. It is an address, not a capability: every operation
 * that acts on an Execution is authorized separately by the Harness.
 */

export type ExecutionId = string & { readonly __brand: "ExecutionId" };
export type ActivationId = string & { readonly __brand: "ActivationId" };

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function isExecutionId(value: unknown): value is ExecutionId {
  return typeof value === "string" && ID_PATTERN.test(value);
}

export function executionId(value: string): ExecutionId {
  if (!isExecutionId(value)) throw new TypeError(`invalid execution id ${JSON.stringify(value)}`);
  return value;
}

export function isActivationId(value: unknown): value is ActivationId {
  return typeof value === "string" && ID_PATTERN.test(value);
}

export function activationId(value: string): ActivationId {
  if (!isActivationId(value)) throw new TypeError(`invalid activation id ${JSON.stringify(value)}`);
  return value;
}
