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

export interface AgentInformationContext {
  readonly system: string;
  readonly messages: readonly ModelMessage[];
}
