/**
 * The ExecutionContext: the runtime's durable truth about one Execution.
 *
 * Deliberately *not* one `state: unknown` bag. Identity, ownership, pinned definition, operational
 * lifecycle, controller progress, wake dependency, mailbox, terminal result, and failure each have
 * their own field, because each has a different owner:
 *
 *   identity / ownership / definition ref   assigned once at creation, never rewritten
 *   lifecycle / waitingFor                  owned by the Harness
 *   control                                 owned by the controller, opaque to the kernel
 *   terminalResult / failure                written only by a validated Activation outcome
 *
 * Slots that later slices own (memory, notes, resources, pending, policy) are present as explicit
 * null/empty references rather than absent or improvised. They mark where those concerns live
 * without pretending an earlier slice has answered them. `authority` is no longer one of those: it
 * is a typed reference to the Execution's runtime-owned effective operation authority.
 *
 * There is deliberately no Active View slot. An Active Operation View is a deterministic derivation
 * from authority plus catalog plus an authored exposure request, so persisting one would store a
 * cache rather than a fact. What genuinely has to survive an Activation is the *projection snapshot*
 * one model invocation was shown, and that lives in Agent control state where the invocation it
 * belongs to lives.
 */

import type { ExecutionDefinitionRef } from "../definitions/ids.ts";
import type { DefinitionKind } from "../definitions/types.ts";
import type { WakeCondition } from "../interaction/event-envelope.ts";
import type { OperationAuthorityRef } from "../operations/authority.ts";
import type { JsonObject } from "../util/json.ts";
import type { ControllerResumptionId, ExecutionId } from "./ids.ts";
import type { LifecycleState } from "./lifecycle.ts";
import { assertTransition } from "./lifecycle.ts";
import type { ExecutionFailure, TerminalResultEnvelope } from "./terminal-result.ts";

/**
 * Controller progress, tagged by the kind whose controller owns it.
 *
 * The kernel stores and returns `progress` unchanged. The tag exists so a Workflow controller can
 * never be handed an Agent's progress, and so persisted progress is self-describing after a
 * restart.
 */
export type ControllerProgress =
  | { readonly kind: "agent"; readonly progress: JsonObject }
  | { readonly kind: "workflow"; readonly progress: JsonObject };

export function initialControllerProgress(kind: DefinitionKind): ControllerProgress {
  return { kind, progress: {} } as ControllerProgress;
}

/**
 * What a WAITING Execution is waiting for.
 *
 * An explicit tagged union rather than two nullable fields or a structural guess. The two arms are
 * genuinely different dependencies with different settlement paths - an Event arriving in the
 * mailbox, and a controller-local resumption settling - and the runtime must never satisfy one by
 * mistaking it for the other. Structural discrimination would work today and break the first time
 * either shape gained a field.
 *
 * ```text
 * EventWait                  a matching processable Event makes this Execution READY
 * ControllerResumptionWait   only that resumption settling makes it READY
 * ```
 *
 * ## Controlled interleaving (Slice E.1)
 *
 * `interleave` is the minimum serializable opt-in for controlled Event interleaving. It is a second,
 * *separate* wake condition: a controller that knows some Events it can safely process while its
 * primary dependency remains unresolved declares them here.
 *
 * ```text
 * no interleave condition   -> exactly the v0.4 behaviour: only the primary dependency wakes
 * primary condition matches -> ordinary dependency wake
 * interleave matches        -> this Execution becomes READY for another Activation, without the
 *                              primary dependency being satisfied; on the `controller_resumption`
 *                              arm, the still-live resumption is atomically invalidated first
 * unmatched Event           -> mailbox only; no wake
 * ```
 *
 * It is plain declarative runtime data, exactly like `wake`: no predicate, no callback, no function.
 * Interleaving *eligibility* is not mandatory immediate execution - the runtime stays free to be
 * conservative about scheduling, and repeated matching Events do not each force a fresh expensive
 * re-invocation (see [`../runtime/event-router.ts`](../runtime/event-router.ts) and
 * [`../../../../docs/development/016-slice-e1-interleaving-peer-interaction.md`](../../../../docs/development/016-slice-e1-interleaving-peer-interaction.md)).
 *
 * Absent `interleave`, the `controller_resumption` arm still suspends *exclusively*, exactly as in
 * v0.4: Events reach the mailbox but none produces an intervening Activation while the continuation
 * is outstanding.
 */
export type ExecutionWait =
  | { readonly kind: "event"; readonly wake: WakeCondition; readonly interleave?: WakeCondition }
  | {
      readonly kind: "controller_resumption";
      readonly resumptionId: ControllerResumptionId;
      readonly interleave?: WakeCondition;
    };

export function eventWait(wake: WakeCondition, interleave?: WakeCondition): ExecutionWait {
  return interleave ? { kind: "event", wake, interleave } : { kind: "event", wake };
}

export function controllerResumptionWait(
  resumptionId: ControllerResumptionId,
  interleave?: WakeCondition,
): ExecutionWait {
  return interleave
    ? { kind: "controller_resumption", resumptionId, interleave }
    : { kind: "controller_resumption", resumptionId };
}

/** Where this Execution's addressed Events accumulate. */
export interface MailboxRef {
  readonly mailboxId: string;
}

/**
 * Concerns owned by later slices.
 *
 * Each value is an opaque reference or an empty collection. Holding one grants nothing: they are
 * addresses into runtime-owned records, never the records themselves, and never a handle a
 * controller could use to widen what it is allowed to do.
 */
export interface DeferredSlots {
  /**
   * The Execution's effective operation authority, as a typed reference.
   *
   * Slice D replaced the Slice-A opaque string with a real one. It is still only an address:
   * the record lives in runtime-owned state, the Harness writes it at creation from
   * application/deployment grants, and nothing a controller can reach dereferences it. `null`
   * means no ceiling is configured, which reads as "nothing is authorized", never as "everything".
   */
  readonly authority: OperationAuthorityRef | null;
  /** Slice F: delegated memory view. */
  readonly memoryView: string | null;
  /** Slice F: Working Note frame/view. */
  readonly workingNotes: string | null;
  /** Slice H: effective runtime policy. */
  readonly policy: string | null;
  /** Slice B/C: logical resource bindings. */
  readonly resources: readonly string[];
  /** Slice B: pending operation references. */
  readonly pending: readonly string[];
}

export const EMPTY_SLOTS: DeferredSlots = Object.freeze({
  authority: null,
  memoryView: null,
  workingNotes: null,
  policy: null,
  resources: Object.freeze([]) as readonly string[],
  pending: Object.freeze([]) as readonly string[],
});

export interface ExecutionContext {
  readonly executionId: ExecutionId;
  readonly kind: DefinitionKind;
  /** Pinned at creation. The Execution runs against these exact bytes for its whole life. */
  readonly definition: ExecutionDefinitionRef;
  /** `null` for a root Execution. Ownership is not communication permission. */
  readonly ownerExecutionId: ExecutionId | null;
  readonly rootExecutionId: ExecutionId;
  readonly lifecycle: LifecycleState;
  readonly control: ControllerProgress;
  /** Non-null only while WAITING: what must settle before this Execution is runnable again. */
  readonly waitingFor: ExecutionWait | null;
  readonly mailbox: MailboxRef;
  readonly slots: DeferredSlots;
  readonly terminalResult: TerminalResultEnvelope | null;
  readonly failure: ExecutionFailure | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Optimistic-concurrency counter. Every persisted change increments it exactly once. */
  readonly revision: number;
}

/**
 * The projection a controller receives.
 *
 * It carries no mailbox handle, no revision, no slot references, and no functions - reading it
 * cannot become writing, and there is nothing here to persist through or schedule with.
 */
export interface ExecutionView {
  readonly executionId: ExecutionId;
  readonly kind: DefinitionKind;
  readonly definition: ExecutionDefinitionRef;
  readonly ownerExecutionId: ExecutionId | null;
  readonly rootExecutionId: ExecutionId;
  readonly lifecycle: LifecycleState;
  readonly control: ControllerProgress;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateExecutionContextInput {
  readonly executionId: ExecutionId;
  readonly kind: DefinitionKind;
  readonly definition: ExecutionDefinitionRef;
  readonly ownerExecutionId: ExecutionId | null;
  readonly rootExecutionId: ExecutionId;
  readonly mailboxId: string;
  readonly createdAt: string;
  /**
   * The Execution's effective operation authority, when the runtime wrote one.
   *
   * Supplied by the Harness after it has stored the record, never by a definition and never by a
   * controller. Omitted means no ceiling was configured, and an Execution with no ceiling exposes
   * nothing.
   */
  readonly authority?: OperationAuthorityRef;
}

export function createExecutionContext(input: CreateExecutionContextInput): ExecutionContext {
  return {
    executionId: input.executionId,
    kind: input.kind,
    definition: input.definition,
    ownerExecutionId: input.ownerExecutionId,
    rootExecutionId: input.rootExecutionId,
    lifecycle: "CREATED",
    control: initialControllerProgress(input.kind),
    waitingFor: null,
    mailbox: { mailboxId: input.mailboxId },
    slots: input.authority ? { ...EMPTY_SLOTS, authority: input.authority } : EMPTY_SLOTS,
    terminalResult: null,
    failure: null,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    revision: 1,
  };
}

export function toExecutionView(context: ExecutionContext): ExecutionView {
  return {
    executionId: context.executionId,
    kind: context.kind,
    definition: context.definition,
    ownerExecutionId: context.ownerExecutionId,
    rootExecutionId: context.rootExecutionId,
    lifecycle: context.lifecycle,
    control: context.control,
    createdAt: context.createdAt,
    updatedAt: context.updatedAt,
  };
}

/** Fields a lifecycle change may carry along with it. All of them are Harness-owned. */
export interface ContextTransitionPatch {
  readonly control?: ControllerProgress;
  readonly waitingFor?: ExecutionWait | null;
  readonly terminalResult?: TerminalResultEnvelope | null;
  readonly failure?: ExecutionFailure | null;
}

/**
 * Pure lifecycle application.
 *
 * Rejects illegal edges before anything is persisted, and refuses to leave a stale wake dependency
 * behind: `waitingFor` is meaningful only in `WAITING`.
 */
export function transitionContext(
  context: ExecutionContext,
  to: LifecycleState,
  at: string,
  patch: ContextTransitionPatch = {},
): ExecutionContext {
  assertTransition(context.lifecycle, to);
  const waitingFor = to === "WAITING" ? (patch.waitingFor ?? context.waitingFor) : null;
  return {
    ...context,
    lifecycle: to,
    control: patch.control ?? context.control,
    waitingFor,
    terminalResult: patch.terminalResult !== undefined ? patch.terminalResult : context.terminalResult,
    failure: patch.failure !== undefined ? patch.failure : context.failure,
    updatedAt: at,
    revision: context.revision + 1,
  };
}

/** Records controller progress without touching the lifecycle. */
export function withControllerProgress(context: ExecutionContext, control: ControllerProgress, at: string): ExecutionContext {
  return { ...context, control, updatedAt: at, revision: context.revision + 1 };
}
