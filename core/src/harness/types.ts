import type { AgentDefinition } from "../definition/types.ts";
import type { ModelProvider } from "../provider/types.ts";
import type { ToolRegistry } from "../tools/registry.ts";
import type { KnowledgeProvider } from "../knowledge/types.ts";
import type { ConfirmationResolver } from "../confirmation/types.ts";
import type { TurnJournal } from "../runtime/journal.ts";
import type { Clock, IdGenerator } from "../util/ids.ts";
import type { CompiledContext } from "../compiler/context-compiler.ts";

/**
 * The harness interface.
 *
 * A Harness is the execution environment around the planning/model/capability lifecycle. It owns
 * model mechanics, iterative delegation, result delivery, limits, cancellation, temporary context,
 * provider event translation, and terminal states. The planner decides what to do next; the Harness
 * safely lets it do that without changing session, authority, executor, or storage contracts.
 *
 * A harness receives a `TurnJournal`, not a store. It therefore cannot persist anything directly and
 * cannot change state except by appending an event.
 */

export interface HarnessServices {
  definition: AgentDefinition;
  model: ModelProvider;
  /** May differ from the response provider; defaults to `model` in AgentRuntime. */
  planningModel: ModelProvider;
  tools: ToolRegistry;
  knowledge: KnowledgeProvider;
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
  /** UserMessageReceived event that the planner's extracted facts must cite. */
  userEventId: string;
  /** Optional request cancellation signal. Harnesses must stop before starting more work. */
  signal?: AbortSignal;
}

export type TurnStopReason =
  | "completed"
  | "max_steps"
  | "max_iterations"
  | "awaiting_confirmation"
  | "awaiting_user"
  | "cancelled"
  | "error";

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
