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
 *
 * Slice B widens the outcome by exactly one field: `effects`, a list of Effect *proposals* as plain
 * data. Note what did not appear alongside it. A controller still receives no `CapabilityExecutor`,
 * no `EffectAuthorizer`, no Effect journal, no pending-operation store, no `RuntimeStore`, and no
 * scheduler. It describes what it would like the runtime to do; the Harness authorizes, journals,
 * dispatches, correlates, and eventually delivers the result as an Event.
 *
 * Proposing an Effect also does not imply `WAITING`. The controller separately reports whether it
 * has runnable local work, and the Harness decides whether the Effect settled inline, whether work
 * remains pending, and therefore whether this Execution is READY or WAITING.
 *
 * Slice C.1 adds one argument and one outcome status, and nothing else. `activate` receives a
 * second parameter - a `ControllerResumptionScope` - through which slow *controller-local* work
 * such as a model-provider call can be started and, if it outlives the Activation's inline budget,
 * yielded on. It is a separate argument rather than an `ActivationInput` field precisely because
 * `ActivationInput` is frozen pure data with no functions in it, and that invariant is worth more
 * than the convenience of one uniform parameter. The scope carries no store, no scheduler, no
 * Harness, no lifecycle setter, no Effect machinery, and no settlement path; see
 * [`controller-resumption.ts`](controller-resumption.ts).
 *
 * A controller with no slow local work ignores the second parameter entirely.
 */

import type { ExecutionDefinition, DefinitionKind } from "../definitions/types.ts";
import type { EffectProposal } from "../effects/types.ts";
import type { DeliveredEvent, WakeCondition } from "../interaction/event-envelope.ts";
import type { ControllerProgress, ExecutionView } from "../execution/context.ts";
import type { EmissionProposal } from "../execution/emission.ts";
import type { ActivationId, ControllerResumptionId } from "../execution/ids.ts";
import type { ControllerResumptionScope } from "./controller-resumption.ts";
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
  /**
   * No runnable local work; this Execution depends on an Event matching `wake`.
   *
   * `interleave` (Slice E.1) is an optional second, separate wake condition. An Event that matches
   * it makes the Execution `READY` for another Activation *without* satisfying the primary `wake`
   * dependency - the primary `PendingOperation` (an `ask` reply, a child result) stays pending and
   * the controller may report the same prospective dependency again on the next Activation. Absent
   * `interleave`, only `wake` wakes the Execution, exactly as before.
   */
  | { readonly status: "await_event"; readonly wake: WakeCondition; readonly interleave?: WakeCondition }
  /**
   * No runnable local work; this Execution depends on controller-local work that has not settled.
   *
   * A dependency report, not a lifecycle instruction - the same as `await_event`. The Harness
   * checks that the identifier names an unresolved registration created for *this* Execution
   * during *this* Activation, and derives `WAITING` itself.
   *
   * `interleave` (Slice E.1) is an optional wake condition. Absent it, this suspension is
   * *exclusive*, exactly as in v0.4: no Event produces an intervening Activation. With it, an Event
   * that matches `interleave` atomically invalidates this still-pending resumption and makes the
   * Execution `READY`; the resumption's late result can then never wake the Execution or be reused
   * by stable-key recovery, and the controller re-evaluates from the consolidated new state.
   */
  | {
      readonly status: "await_resumption";
      readonly resumptionId: ControllerResumptionId;
      readonly interleave?: WakeCondition;
    }
  /** Semantic completion. The Harness validates the result before anything becomes COMPLETED. */
  | { readonly status: "complete"; readonly result?: TerminalResultProposal }
  /** Semantic failure. Distinct from one failed operation, which is only an observation. */
  | { readonly status: "fail"; readonly failure: { readonly code: string; readonly message: string; readonly details?: JsonValue } };

export interface ActivationOutcome {
  /** Controller-owned progress to persist. Must be tagged with this controller's kind. */
  readonly control: ControllerProgress;
  /** Nonterminal output. Emitting never completes an Execution. */
  readonly emissions?: readonly EmissionProposal[];
  /**
   * Interactions the controller would like the runtime to perform.
   *
   * Proposals, not instructions and not claims. Each one is validated, journaled, and authorized
   * before anything happens, and its result reaches this controller only as a delivered Event.
   * Proposing Effects alongside `complete` or `fail` is rejected: an Execution that is finishing
   * must not be launching work whose result nothing will ever observe.
   */
  readonly effects?: readonly EffectProposal[];
  readonly next: ControllerNext;
}

/**
 * One controller per Definition kind. The Harness selects it by `definition.kind` and needs no
 * provider-, framework-, or topology-specific knowledge to schedule it.
 */
export interface ExecutionController {
  readonly kind: DefinitionKind;
  /**
   * @param input       frozen pure data: the read-only view, the pinned definition, the delivered
   *                    Events, and Activation metadata.
   * @param resumptions the only live capability a controller receives, and only for starting and
   *                    recovering controller-local asynchronous work. Controllers with no slow
   *                    local work ignore it.
   */
  activate(
    input: ActivationInput,
    resumptions: ControllerResumptionScope,
  ): Promise<ActivationOutcome> | ActivationOutcome;
}
