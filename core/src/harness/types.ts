import type { AgentDefinition } from "../definition/types.ts";
import type { ModelProvider } from "../provider/types.ts";
import type { ToolRegistry } from "../tools/registry.ts";
import type { KnowledgeIndex } from "../knowledge/in-memory.ts";
import type { ConfirmationResolver } from "../confirmation/types.ts";
import type { TurnJournal } from "../runtime/journal.ts";
import type { Clock, IdGenerator } from "../util/ids.ts";
import type { CompiledContext } from "../compiler/context-compiler.ts";

/**
 * The harness interface.
 *
 * Harness strategy is the part of an agent most likely to change as models improve: a two-pass
 * interpret-then-respond loop is right for today's models, but a stronger model may do better in one
 * pass. Putting the strategy behind an interface means that change does not touch the session, tool,
 * or storage interfaces - which is exactly the property v0 is trying to preserve.
 *
 * A harness receives a `TurnJournal`, not a store. It therefore cannot persist anything directly and
 * cannot change state except by appending an event.
 */

export interface HarnessServices {
  definition: AgentDefinition;
  model: ModelProvider;
  tools: ToolRegistry;
  knowledge: KnowledgeIndex;
  confirmationResolver: ConfirmationResolver;
  ids: IdGenerator;
  clock: Clock;
  /** Optional observer for compiled contexts, so the Studio and tests can inspect every prompt. */
  onContextCompiled?: (context: CompiledContext, purpose: string) => void;
}

export interface HarnessTurnInput {
  journal: TurnJournal;
  userMessage: string;
  turn: number;
}

export type TurnStopReason = "completed" | "max_steps" | "awaiting_confirmation" | "error";

export interface HarnessTurnResult {
  replyText: string;
  stopReason: TurnStopReason;
  /** Model/tool steps consumed in the response pass, for the step-limit accounting. */
  steps: number;
}

export interface AgentHarness {
  readonly name: string;
  runTurn(input: HarnessTurnInput, services: HarnessServices): Promise<HarnessTurnResult>;
}
