/**
 * Stable keys for a Workflow's controller-local model work.
 *
 * Kept in their own module because of who needs them. The Adapter runner needs to build an Adapter
 * key, and the architecture suite asserts that Adapter code reaches nothing under `effects/` - not
 * even a branded id type. Putting these beside the barrier, which does reach the Effect vocabulary,
 * would have quietly widened that boundary for the sake of one string builder.
 *
 * A key is not a correlation id and not a credential. Nothing is addressed to it, no Event carries
 * it, and knowing one authorizes nothing. Its only job is to be *reconstructible*: an Activation
 * resuming a suspended model call derives the same string from the same persisted coordinates and
 * is handed the stored result instead of invoking the provider a second time.
 */

import type { StageId } from "./spec.ts";

/**
 * The key for one Stage-body model phase.
 *
 * ```text
 * stage = draft, visit = 2, phase = 1
 *   -> "wf/draft#2/model/phase1"
 * ```
 *
 * Stage, visit, and phase are all already persisted Workflow progress, so nothing process-local
 * leaks into the key and a resumed Activation cannot accidentally derive a different one.
 */
export function stageModelResumptionKey(stage: StageId, visit: number, phase: number): string {
  return `wf/${stage}#${visit}/model/phase${phase}`;
}

/**
 * The key for one Adapter's model call.
 *
 * ```text
 * stage = review, visit = 3, output adapter 0
 *   -> "wf/review#3/adapter/output/0"
 * ```
 *
 * Position and index are both present because a Stage may have Adapters on both boundaries, and an
 * input chain and an output chain are different work even at the same index.
 */
export function stageAdapterResumptionKey(
  stage: StageId,
  visit: number,
  position: "input" | "output",
  index: number,
): string {
  return `wf/${stage}#${visit}/adapter/${position}/${index}`;
}
