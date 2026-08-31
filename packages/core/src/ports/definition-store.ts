/**
 * Definition storage.
 *
 * Versions are immutable: a published `(id, version)` is never rewritten, so an Execution that
 * pinned one can never have its semantics changed underneath it. `get` takes a full
 * `ExecutionDefinitionRef` and must verify the stored content still matches `ref.integrity`,
 * turning a corrupted or hand-edited row into a loud failure instead of a silently different
 * program.
 */

import type { DefinitionId, ExecutionDefinitionRef } from "../definitions/ids.ts";
import type { ExecutionDefinition } from "../definitions/types.ts";

export interface DefinitionStore {
  /** Publishes an immutable version and returns the ref that pins it. */
  save(definition: ExecutionDefinition): Promise<ExecutionDefinitionRef>;
  /** Resolves a pinned ref, verifying integrity. */
  get(ref: ExecutionDefinitionRef): Promise<ExecutionDefinition | undefined>;
  getVersion(id: DefinitionId, version: number): Promise<ExecutionDefinition | undefined>;
  getLatest(id: DefinitionId): Promise<ExecutionDefinition | undefined>;
  listVersions(id: DefinitionId): Promise<readonly number[]>;
}

export class DefinitionVersionConflictError extends Error {
  constructor(id: string, version: number) {
    super(`definition "${id}" version ${version} already exists; publish a new version instead of editing it`);
    this.name = "DefinitionVersionConflictError";
  }
}

export class DefinitionIntegrityError extends Error {
  readonly expected: string;
  readonly actual: string;
  constructor(id: string, version: number, expected: string, actual: string) {
    super(`definition "${id}" version ${version} no longer matches the pinned integrity ${expected} (stored ${actual})`);
    this.name = "DefinitionIntegrityError";
    this.expected = expected;
    this.actual = actual;
  }
}
