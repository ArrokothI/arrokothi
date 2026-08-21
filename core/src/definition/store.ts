import type { AgentDefinition } from "./types.ts";

/**
 * Definition storage. Versions are immutable: `save` writes a new (id, version) row and refuses to
 * overwrite an existing one, so a stored definition a session was run against can never change
 * underneath it.
 */
export interface DefinitionStore {
  save(definition: AgentDefinition): Promise<void>;
  /** Omitting `version` returns the highest version for that id. */
  get(id: string, version?: number): Promise<AgentDefinition | undefined>;
  listVersions(id: string): Promise<number[]>;
  /** Latest version of each definition. */
  listLatest(): Promise<AgentDefinition[]>;
  delete?(id: string, version?: number): Promise<void>;
}

export class InMemoryDefinitionStore implements DefinitionStore {
  private readonly byId = new Map<string, Map<number, AgentDefinition>>();

  constructor(definitions: AgentDefinition[] = []) {
    for (const def of definitions) void this.save(def);
  }

  async save(definition: AgentDefinition): Promise<void> {
    const versions = this.byId.get(definition.id) ?? new Map<number, AgentDefinition>();
    if (versions.has(definition.version)) {
      throw new Error(`definition "${definition.id}" version ${definition.version} already exists; bump the version instead of editing it`);
    }
    versions.set(definition.version, structuredClone(definition));
    this.byId.set(definition.id, versions);
  }

  async get(id: string, version?: number): Promise<AgentDefinition | undefined> {
    const versions = this.byId.get(id);
    if (!versions) return undefined;
    if (version !== undefined) return versions.get(version);
    const latest = Math.max(...versions.keys());
    return versions.get(latest);
  }

  async listVersions(id: string): Promise<number[]> {
    return [...(this.byId.get(id)?.keys() ?? [])].sort((a, b) => a - b);
  }

  async listLatest(): Promise<AgentDefinition[]> {
    const out: AgentDefinition[] = [];
    for (const id of this.byId.keys()) {
      const def = await this.get(id);
      if (def) out.push(def);
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }

  async delete(id: string, version?: number): Promise<void> {
    if (version === undefined) {
      this.byId.delete(id);
      return;
    }
    this.byId.get(id)?.delete(version);
  }
}
