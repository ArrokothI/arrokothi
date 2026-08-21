import type { AgentDefinition, ToolExecutor, ToolRegistry } from "@agent-sdk/core";
import { recordQueryTools } from "@agent-sdk/core";
import type { KnowledgeIndex } from "@agent-sdk/core";

/**
 * Studio tool executors.
 *
 * The Studio is a development surface, so it NEVER performs a real external side effect. Every
 * side-effecting tool gets a dry-run executor that records the payload and reports a controllable
 * outcome. That keeps the interesting parts real - authorization, confirmation, idempotency, the
 * authoritative result - while the transport is fake.
 */

export interface DryRunRecord {
  toolName: string;
  args: Record<string, unknown>;
  sessionId: string;
  turn: number;
  at: string;
  outcome: "success" | "failure";
}

export class DryRunRegistry {
  readonly records: DryRunRecord[] = [];
  /** Per-tool outcome, switchable from the UI so the failure path is testable. */
  private readonly modes = new Map<string, "success" | "failure">();

  setMode(toolName: string, mode: "success" | "failure"): void {
    this.modes.set(toolName, mode);
  }

  getMode(toolName: string): "success" | "failure" {
    return this.modes.get(toolName) ?? "success";
  }

  recordsFor(sessionId: string): DryRunRecord[] {
    return this.records.filter((r) => r.sessionId === sessionId);
  }

  executorFor(toolName: string): ToolExecutor {
    return {
      execute: async (args, ctx) => {
        const outcome = this.getMode(toolName);
        this.records.push({ toolName, args, sessionId: ctx.sessionId, turn: ctx.turn, at: new Date().toISOString(), outcome });

        if (outcome === "failure") {
          return {
            ok: false,
            error: { code: "dry_run_failure", message: `${toolName} was configured to fail in the Studio dry run` },
            retryable: true,
          };
        }
        return {
          ok: true,
          output: { dry_run: true, tool: toolName, received: args },
          facts: [
            {
              key: `${toolName}_completed`,
              value: true,
              description: `${toolName} completed as a Studio dry run. No external system was contacted.`,
            },
          ],
        };
      },
    };
  }
}

/**
 * Registers an executor for every declared tool.
 *
 * Record-set query tools get the REAL deterministic executor - there is nothing unsafe about a
 * filter, and faking it would defeat the purpose of testing deterministic retrieval in the Studio.
 */
export function registerStudioExecutors(
  registry: ToolRegistry,
  definition: AgentDefinition,
  knowledge: KnowledgeIndex,
  dryRun: DryRunRegistry,
): ToolRegistry {
  for (const { definition: toolDef, executor } of recordQueryTools(knowledge)) {
    registry.add(toolDef, executor);
  }
  for (const binding of definition.tools) {
    registry.register(binding.definition.name, dryRun.executorFor(binding.definition.name));
  }
  return registry;
}
