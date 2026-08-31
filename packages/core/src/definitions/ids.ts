/**
 * Definition identity.
 *
 * A Definition is authored, versioned, and stored. An Execution is instantiated from one. Keeping
 * their identity types distinct is the first line of defence for the `Definition != Execution`
 * invariant: an `ExecutionId` can never be passed where a `DefinitionId` is expected.
 */

/** Author-chosen stable name for a family of definition versions. */
export type DefinitionId = string & { readonly __brand: "DefinitionId" };

/** Monotonic integer. A published (id, version) pair is immutable forever. */
export type DefinitionVersion = number;

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function isDefinitionId(value: unknown): value is DefinitionId {
  return typeof value === "string" && ID_PATTERN.test(value);
}

export function definitionId(value: string): DefinitionId {
  if (!isDefinitionId(value)) {
    throw new TypeError(`invalid definition id ${JSON.stringify(value)}; expected ${ID_PATTERN}`);
  }
  return value;
}

export function isDefinitionVersion(value: unknown): value is DefinitionVersion {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

/**
 * A pinned reference to one immutable definition version.
 *
 * `integrity` is a content digest, not a security signature. It exists so an Execution that pinned
 * a definition can detect that the bytes behind (id, version) are not the ones it was created
 * against - a store bug, a bad restore, or a hand-edited row - instead of silently running
 * different semantics.
 */
export interface ExecutionDefinitionRef {
  readonly id: DefinitionId;
  readonly version: DefinitionVersion;
  readonly integrity: string;
}

export function isSameDefinitionRef(a: ExecutionDefinitionRef, b: ExecutionDefinitionRef): boolean {
  return a.id === b.id && a.version === b.version && a.integrity === b.integrity;
}

export function formatDefinitionRef(ref: ExecutionDefinitionRef): string {
  return `${ref.id}@${ref.version}#${ref.integrity}`;
}
