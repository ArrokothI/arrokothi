/**
 * The controller boundary - the narrowest interface in the kernel, on purpose.
 *
 * A controller owns *semantic* control: what should happen next in this Agent's model-directed
 * progression or this Workflow's system-defined topology. The Harness owns *operational* control:
 * lifecycle, scheduling, persistence, routing, authorization.
 *
 * Read the shapes below as a list of things a controller cannot do. `ActivationInput` hands it a
 * frozen read-only view, the pinned definition, the Events delivered to it, and Activation
 * metadata - no store, no transaction, no scheduler, no mailbox, no lifecycle setter, no way to
 * grant itself anything. `ActivationOutcome` is plain data describing what it decided; the Harness
 * validates that data and decides what it means.
 *
 * Note what `ControllerNext` deliberately lacks: any `WAITING` value. A controller reports that it
 * is *waiting for an Event matching X*. Only the Harness, after confirming there is no runnable
 * local work, derives the WAITING state.
 */

import type { ExecutionDefinition, DefinitionKind } from "../definitions/types.ts";
import type { DeliveredEvent, WakeCondition } from "../interaction/event-envelope.ts";
import type { ControllerProgress, ExecutionView } from "../execution/context.ts";
import type { EmissionProposal } from "../execution/emission.ts";
import type { ActivationId } from "../execution/ids.ts";
import type { TerminalResultProposal } from "../execution/terminal-result.ts";
import type { JsonValue } from "../util/json.ts";

/** Cancellation as data, so an Activation is reproducible. */
export interface CancellationSignal {
  readonly cancelled: boolean;
  readonly reason: string | null;
}

export interface ActivationBudget {
  /** Controller-visible step allowance for this Activation, when the runtime imposes one. */
  readonly maxSteps: number | null;
  /** ISO timestamp after which the controller should yield rather than start new local work. */
  readonly deadline: string | null;
}

export interface ActivationMetadata {
  readonly activationId: ActivationId;
  readonly startedAt: string;
  readonly budget: ActivationBudget;
  readonly cancellation: CancellationSignal;
}

export interface ActivationInput {
  /** Read-only projection. Deep-frozen by the Harness before the controller sees it. */
  readonly execution: ExecutionView;
  /** The exact definition version this Execution pinned at creation. */
  readonly definition: ExecutionDefinition;
  /** Observations delivered since the previous Activation. Already consumed from the mailbox. */
  readonly events: readonly DeliveredEvent[];
  readonly activation: ActivationMetadata;
}

export type ControllerNext =
  /** More runnable local work exists; schedule another Activation. */
  | { readonly status: "continue" }
  /** No runnable local work; this Execution depends on an Event matching `wake`. */
  | { readonly status: "await_event"; readonly wake: WakeCondition }
  /** Semantic completion. The Harness validates the result before anything becomes COMPLETED. */
  | { readonly status: "complete"; readonly result?: TerminalResultProposal }
  /** Semantic failure. Distinct from one failed operation, which is only an observation. */
  | { readonly status: "fail"; readonly failure: { readonly code: string; readonly message: string; readonly details?: JsonValue } };

export interface ActivationOutcome {
  /** Controller-owned progress to persist. Must be tagged with this controller's kind. */
  readonly control: ControllerProgress;
  /** Nonterminal output. Emitting never completes an Execution. */
  readonly emissions?: readonly EmissionProposal[];
  readonly next: ControllerNext;
}

/**
 * One controller per Definition kind. The Harness selects it by `definition.kind` and needs no
 * provider-, framework-, or topology-specific knowledge to schedule it.
 */
export interface ExecutionController {
  readonly kind: DefinitionKind;
  activate(input: ActivationInput): Promise<ActivationOutcome> | ActivationOutcome;
}
