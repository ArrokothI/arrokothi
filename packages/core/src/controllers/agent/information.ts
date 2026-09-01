/**
 * The information branch: instructions plus the observations that matter now.
 *
 * There are two branches into a model call and they are separate on purpose:
 *
 * ```text
 * information branch                     operation branch
 *   instructions                           catalog descriptors
 *   input and responses so far             + effective authority
 *   settled operation observations         + authored exposure request
 *          ↓                                      ↓
 *   system prompt + messages               Active View → projection → specs
 *          ↘                                      ↙
 *                 assembled into one request
 * ```
 *
 * This module owns the left side and is not allowed to know the right side exists. It does not
 * choose which operations are exposed, does not read or narrow authority, and does not build a
 * model binding - and the architecture suite walks its import graph to prove it cannot. The reverse
 * holds too: the resolver and projector select no memory, compile no transcript, and own no
 * instructions.
 *
 * It is deliberately small. Retrieval, memory selection, salience, summarisation, and provenance
 * are a whole slice of their own, and a first compiler that guessed at them would have to be
 * unpicked rather than extended. What it does today is bound the window, which is the one thing a
 * bounded Agent genuinely needs: a progression that keeps appending to one growing array eventually
 * stops being a progression and starts being an outage.
 */

import type { AgentInformationContext } from "../../agent/information-context.ts";
import type { ModelMessage } from "../../model/types.ts";

export interface AgentInformationInput {
  /** The Agent's standing instructions, verbatim from its definition. */
  readonly instructions: string;
  /** Everything observed so far, oldest first: input, responses, operation observations. */
  readonly messages: readonly ModelMessage[];
  /** How many messages may reach the model. The most recent window is kept. */
  readonly maxMessages: number;
}

/**
 * How information is selected for one model call.
 *
 * A strategy, not a semantic rule. What belongs in an invocation's context - a window of recent
 * messages, retrieved Derived Semantic Memory, Structured Memory, Working Notes, an artifact
 * excerpt, a compacted summary, a fresh-context handoff - is model- and task-dependent, and the
 * useful comparison between those policies is behavioural. So the compiler is replaceable and the
 * boundary around it is what stays fixed:
 *
 * ```text
 * information selection   what the model reads
 * operation exposure      what the model may do
 * ```
 *
 * Swapping a compiler changes the first and provably not the second. It cannot widen effective
 * authority, cannot change an Active View, cannot alter a ModelOperationProjection, and cannot
 * touch Effect semantics - it is handed instructions and a transcript and returns a context. The
 * architecture suite walks this module's import graph to keep that true.
 */
export interface AgentInformationCompiler {
  compile(input: AgentInformationInput): AgentInformationContext;
}

/**
 * Compiles the information one model call receives.
 *
 * Pure and total: the same input produces the same context, so a resumed Activation replaying a
 * persisted snapshot and the Activation that produced it cannot disagree.
 */
export function compileAgentInformation(input: AgentInformationInput): AgentInformationContext {
  const window = input.maxMessages > 0 ? input.messages.slice(-input.maxMessages) : [];
  return { system: input.instructions, messages: window };
}

/**
 * The reference strategy: instructions plus a bounded window of the most recent messages.
 *
 * Deliberately the smallest thing that keeps a progression bounded. It retrieves nothing, summarises
 * nothing, and remembers nothing beyond the transcript it is handed, because a first compiler that
 * guessed at those would have to be unpicked rather than replaced.
 */
export const referenceAgentInformationCompiler: AgentInformationCompiler = {
  compile: compileAgentInformation,
};
