/**
 * Dependency-free DefinitionStore.
 *
 * Published versions are immutable and stored as clones, so nothing a caller keeps a reference to
 * can change a definition an Execution has already pinned. `get` re-derives the integrity digest
 * and refuses to return content that no longer matches the pinned ref rather than quietly running
 * a different program.
 */

import type { DefinitionId, ExecutionDefinitionRef } from "../definitions/ids.ts";
import type { ExecutionDefinition } from "../definitions/types.ts";
import { assertValidDefinition, definitionIntegrity, definitionRef } from "../definitions/validation.ts";
import type { DefinitionStore } from "../ports/definition-store.ts";
import { DefinitionIntegrityError, DefinitionVersionConflictError } from "../ports/definition-store.ts";

export class InMemoryDefinitionStore implements DefinitionStore {
  private readonly byId = new Map<string, Map<number, ExecutionDefinition>>();

  constructor(definitions: readonly ExecutionDefinition[] = []) {
    for (const definition of definitions) this.insert(definition);
  }

  async save(definition: ExecutionDefinition): Promise<ExecutionDefinitionRef> {
    return this.insert(definition);
  }

  private insert(definition: ExecutionDefinition): ExecutionDefinitionRef {
    const validated = assertValidDefinition(definition);
    const versions = this.byId.get(validated.id) ?? new Map<number, ExecutionDefinition>();
    if (versions.has(validated.version)) {
      throw new DefinitionVersionConflictError(validated.id, validated.version);
    }
    versions.set(validated.version, structuredClone(validated));
    this.byId.set(validated.id, versions);
    return definitionRef(validated);
  }

  async get(ref: ExecutionDefinitionRef): Promise<ExecutionDefinition | undefined> {
    const stored = this.byId.get(ref.id)?.get(ref.version);
    if (!stored) return undefined;
    const actual = definitionIntegrity(stored);
    if (actual !== ref.integrity) {
      throw new DefinitionIntegrityError(ref.id, ref.version, ref.integrity, actual);
    }
    return structuredClone(stored);
  }

  async getVersion(id: DefinitionId, version: number): Promise<ExecutionDefinition | undefined> {
    const stored = this.byId.get(id)?.get(version);
    return stored ? structuredClone(stored) : undefined;
  }

  async getLatest(id: DefinitionId): Promise<ExecutionDefinition | undefined> {
    const versions = this.byId.get(id);
    if (!versions || versions.size === 0) return undefined;
    return this.getVersion(id, Math.max(...versions.keys()));
  }

  async listVersions(id: DefinitionId): Promise<readonly number[]> {
    return [...(this.byId.get(id)?.keys() ?? [])].sort((a, b) => a - b);
  }
}
