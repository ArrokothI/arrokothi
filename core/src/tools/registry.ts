import type { BoundTool, ToolBinding, ToolDefinition, ToolExecutor } from "./types.ts";
import type { ModelToolSpec } from "../provider/types.ts";

/**
 * Tool registry: the dependency-injection seam.
 *
 * A definition declares tools by *shape*. Executors are registered separately, by name. That split
 * is what lets the same stored AgentDefinition run against a dry-run executor in a benchmark, a fake
 * in a test, and a real transport in production, with no change to the definition and no branch
 * inside core.
 */
export class ToolRegistry {
  private readonly bindings = new Map<string, ToolBinding>();
  private readonly executors = new Map<string, ToolExecutor>();

  constructor(bindings: ToolBinding[] = []) {
    for (const binding of bindings) this.bindings.set(binding.definition.name, binding);
  }

  /** Declare a tool's shape without an executor. Calls to it are refused with `no_executor`. */
  bind(binding: ToolBinding): this {
    this.bindings.set(binding.definition.name, binding);
    return this;
  }

  register(name: string, executor: ToolExecutor): this {
    this.executors.set(name, executor);
    return this;
  }

  /** Declare and register in one step, for tools built in code rather than loaded from a definition. */
  add(definition: ToolDefinition, executor: ToolExecutor, phaseIds?: string[]): this {
    this.bind(phaseIds ? { definition, phaseIds } : { definition });
    this.register(definition.name, executor);
    return this;
  }

  has(name: string): boolean {
    return this.bindings.has(name);
  }

  getBinding(name: string): ToolBinding | undefined {
    return this.bindings.get(name);
  }

  getDefinition(name: string): ToolDefinition | undefined {
    return this.bindings.get(name)?.definition;
  }

  getExecutor(name: string): ToolExecutor | undefined {
    return this.executors.get(name);
  }

  get(name: string): BoundTool | undefined {
    const binding = this.bindings.get(name);
    const executor = this.executors.get(name);
    return binding && executor ? { definition: binding.definition, executor } : undefined;
  }

  /** Names of tools whose executors are missing - a Studio/startup check, surfaced not swallowed. */
  missingExecutors(): string[] {
    return [...this.bindings.keys()].filter((name) => !this.executors.has(name));
  }

  /** Tools available in a phase: a phase's `toolNames` scope, intersected with each tool's own scope. */
  availableIn(phaseId: string | null, phaseToolNames?: string[]): ToolDefinition[] {
    const out: ToolDefinition[] = [];
    for (const binding of this.bindings.values()) {
      if (phaseToolNames && !phaseToolNames.includes(binding.definition.name)) continue;
      if (binding.phaseIds && phaseId && !binding.phaseIds.includes(phaseId)) continue;
      if (binding.phaseIds && !phaseId) continue;
      out.push(binding.definition);
    }
    return out;
  }

  /** Projection for a model call. Carries name/description/input only - never the executor. */
  toModelSpecs(definitions: ToolDefinition[]): ModelToolSpec[] {
    return definitions.map((d) => ({ name: d.name, description: d.description, input: d.input }));
  }
}
