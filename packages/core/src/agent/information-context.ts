/**
 * The compiled information one model call receives.
 *
 * A tiny module of its own, and that is the point. If this type lived beside the executor contract
 * it would drag the operation projection into every import of it, and the information compiler
 * would transitively depend on the exposure layer it is supposed to know nothing about. The two
 * branches meet when a request is assembled and nowhere earlier:
 *
 * ```text
 * information branch   instructions + observations  ->  system + messages
 * operation branch     authority + exposure         ->  Active View -> projection
 *                               ↘               ↙
 *                            one provider request
 * ```
 */

import type { ModelMessage } from "../model/types.ts";
import { hashValue } from "../util/hash.ts";

export interface AgentInformationContext {
  readonly system: string;
  readonly messages: readonly ModelMessage[];
}

/**
 * A stable identity for one compiled information selection.
 *
 * Content-derived, so two compilations that selected the same thing carry the same id and a strategy
 * change is visible as a different one. It exists for correlation and reproducibility: a trace can
 * say *this invocation saw selection IC-...* without the raw prompt being retained anywhere, which
 * is the point - the digest is what makes not storing the prompt an option rather than a loss.
 *
 * It is not authority, not a cache key the runtime resolves, and not a handle: nothing looks a
 * context up by one, and holding one grants nothing.
 */
export function agentInformationSelectionId(context: AgentInformationContext): string {
  return `ic_${hashValue({ system: context.system, messages: context.messages })}`;
}
