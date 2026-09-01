/**
 * Portable operation identity: `(capability, operation)` and nothing else.
 *
 * The identity of an operation is already owned by the capability catalog (see
 * [`../ports/capability-catalog.ts`](../ports/capability-catalog.ts)); this module only gives that
 * pair a name so the four exposure layers can pass it around without any of them inventing a second
 * one. There is deliberately no `OperationDescriptor` here, no consequentiality, no schema, and no
 * backend reference - a ref says *which* operation, never what it does, who may use it, or how it
 * is carried out.
 *
 * ```text
 * OperationRef            which operation
 * catalog descriptor      what that operation intrinsically is
 * effective authority     whether this Execution may use it at all
 * Active Operation View   whether it is exposed right now
 * projection binding      what this one model call called it
 * ```
 *
 * Names are plain strings on purpose. Branding happens at the Effect boundary, where
 * `useCapability` validates and brands them, exactly as an authored Workflow
 * `ModelCallableDeclaration` does. A ref is authored/derived data that travels through JSON; it is
 * not a credential, and holding one grants nothing.
 */

/** The `(capability, operation)` pair. Plain data; equality is by value. */
export interface OperationRef {
  readonly capability: string;
  readonly operation: string;
}

/** Authoring/wiring shape. Identical today; separate so validation has somewhere to sit. */
export interface OperationRefInput {
  readonly capability: string;
  readonly operation: string;
}

/** Same pattern the Effect boundary brands with, checked here so bad refs never reach it. */
const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,191}$/;

export function isOperationName(value: unknown): value is string {
  return typeof value === "string" && NAME_PATTERN.test(value);
}

export function isOperationRef(value: unknown): value is OperationRef {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return isOperationName(candidate["capability"]) && isOperationName(candidate["operation"]);
}

export function operationRef(capability: string, operation: string): OperationRef {
  if (!isOperationName(capability)) throw new TypeError(`invalid capability name ${JSON.stringify(capability)}`);
  if (!isOperationName(operation)) throw new TypeError(`invalid operation name ${JSON.stringify(operation)}`);
  return { capability, operation };
}

export function isSameOperationRef(a: OperationRef, b: OperationRef): boolean {
  return a.capability === b.capability && a.operation === b.operation;
}

/**
 * The canonical string form, used for deterministic ordering and set membership.
 *
 * A display/index key, never an identifier anything is addressed by and never a bearer token.
 */
export function formatOperationRef(ref: OperationRef): string {
  return `${ref.capability}:${ref.operation}`;
}

/** Deterministic total order over refs, so every layer can sort the same way. */
export function compareOperationRefs(a: OperationRef, b: OperationRef): number {
  if (a.capability !== b.capability) return a.capability < b.capability ? -1 : 1;
  if (a.operation !== b.operation) return a.operation < b.operation ? -1 : 1;
  return 0;
}
