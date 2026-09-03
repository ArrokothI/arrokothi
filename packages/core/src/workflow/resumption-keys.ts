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
 *
 * ## Scopes (Slice G.2)
 *
 * Every key is `<scope>/<what>`. The scope names the Stage invocation the work belongs to, and is
 * the single place branch identity enters: an ordinary Stage's scope is `wf/<stage>#<visit>`, and a
 * *parallel branch* Stage's scope also carries the fork invocation and the branch, so two sibling
 * branches running the same Stage-local phase derive different keys and recover only their own work.
 * The scope is built from persisted controller coordinates only (`WorkflowParallelState.forkId` /
 * `.forkVisit`, `WorkflowParallelBranchState.branchId` / `.stageId` / `.visit`), so a resumed
 * Activation reconstructs it exactly.
 */

import type { BranchId, ForkId, StageId } from "./spec.ts";

/**
 * The resumption scope for one ordinary Stage invocation.
 *
 * ```text
 * stage = draft, visit = 2  ->  "wf/draft#2"
 * ```
 */
export function stageResumptionScope(stage: StageId, visit: number): string {
  return `wf/${stage}#${visit}`;
}

/**
 * The resumption scope for one parallel branch Stage invocation (Slice G.2).
 *
 * ```text
 * fork = p, forkVisit = 2, branch = c, stage = c, visit = 8
 *   -> "wf/fork/p#2/branch/c/stage/c#8"
 * ```
 *
 * The fork invocation (`forkVisit`) distinguishes repeated visits of the same authored fork; the
 * branch id distinguishes sibling branches; the Stage id and visit distinguish the branch's own
 * Stage invocation. Nothing here is process-local, so a fresh controller reconstructs it byte for
 * byte.
 */
export function branchStageResumptionScope(
  forkId: ForkId,
  forkVisit: number,
  branchId: BranchId,
  stage: StageId,
  visit: number,
): string {
  return `wf/fork/${forkId}#${forkVisit}/branch/${branchId}/stage/${stage}#${visit}`;
}

/**
 * The key for one Stage-body model phase, within a scope.
 *
 * ```text
 * scope = wf/draft#2, phase = 1  ->  "wf/draft#2/model/phase1"
 * ```
 *
 * Stage, visit, and phase (and, for a branch, the fork/branch coordinates baked into the scope) are
 * all already persisted Workflow progress, so nothing process-local leaks into the key and a resumed
 * Activation cannot accidentally derive a different one.
 */
export function modelPhaseResumptionKey(scope: string, phase: number): string {
  return `${scope}/model/phase${phase}`;
}

/**
 * The key for one Adapter's model call, within a scope.
 *
 * ```text
 * scope = wf/review#3, output adapter 0  ->  "wf/review#3/adapter/output/0"
 * ```
 *
 * Position and index are both present because a Stage may have Adapters on both boundaries, and an
 * input chain and an output chain are different work even at the same index.
 */
export function adapterPositionResumptionKey(scope: string, position: "input" | "output", index: number): string {
  return `${scope}/adapter/${position}/${index}`;
}

/** Back-compatible convenience: the model-phase key for an ordinary Stage invocation. */
export function stageModelResumptionKey(stage: StageId, visit: number, phase: number): string {
  return modelPhaseResumptionKey(stageResumptionScope(stage, visit), phase);
}

/** Back-compatible convenience: the Adapter key for an ordinary Stage invocation. */
export function stageAdapterResumptionKey(
  stage: StageId,
  visit: number,
  position: "input" | "output",
  index: number,
): string {
  return adapterPositionResumptionKey(stageResumptionScope(stage, visit), position, index);
}
