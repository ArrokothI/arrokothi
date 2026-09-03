/**
 * The controller-local resumption gateway.
 *
 * Mechanically this is a sibling of `EffectProcessor`: the same `InlineWaitBudget.race`, the same
 * follow-the-promise tracking, the same commit-then-enqueue ordering, the same deterministic
 * `drain` affordance. Semantically it shares nothing with it, and the whole point of a separate
 * file is that the two never quietly merge.
 *
 * ```text
 * EffectProcessor                     ControllerResumptionProcessor
 *   authorizes                          authorizes nothing
 *   journals                            journals nothing
 *   creates a PendingOperation          creates a ControllerResumption
 *   settles into an Event               settles into a runnable continuation
 *   has a public settlement ingress     has none, deliberately
 * ```
 *
 * That last line is a security property, not an omission. A caller who could settle a resumption
 * could hand a controller a fabricated model result. There is no `settle...` method on the Harness
 * for these; the only thing that can settle one is the promise the runtime itself started.
 *
 * ## The start/suspend race
 *
 * The ordering below is the reason this file is careful rather than short.
 *
 * ```text
 * Activation A1 begins
 *   scope created, bound to this Execution + Activation
 *   controller calls run(key, thunk)
 *   runtime starts the normalized promise and races the inline budget
 *
 *   settled inline  -> return the outcome; no record, no WAITING, A1 continues
 *   budget expired  -> keep the promise ephemerally; return suspended(id)
 *                      controller persists progress and returns await_resumption(id)
 *
 * Harness validates that outcome, then ONE transaction:
 *   persist controller progress
 *   no matching queued interleave Event -> insert pending R; RUNNING -> WAITING on R
 *   matching queued interleave Event    -> insert/in-place update R as invalidated; -> READY
 * commit
 *
 * only after a WAITING commit: attach the continuation
 * ```
 *
 * Nothing durable exists until the controller has actually declared itself suspended on it. That
 * ordering is what prevents an orphaned record when a controller throws after starting work, a
 * durable record for an outcome the Harness rejected, and an Execution woken for work it never
 * said it was waiting on. And because the continuation is attached *after* the WAITING commit, a
 * promise that resolved during the ordinary WAITING commit window still drives the normal
 * settlement path - it just does so on the next microtask instead of later. If an interleave Event
 * committed first, the registration is durably invalidated and deliberately never attached.
 *
 * A registration the controller never waited on is abandoned: the promise keeps running to
 * completion, its result is discarded, and no record ever names it. The normalized promise cannot
 * reject, so an abandoned registration cannot produce an unhandled rejection either.
 */

import { transitionContext } from "../execution/context.ts";
import type { ExecutionContext } from "../execution/context.ts";
import type { ActivationId, ControllerResumptionId, ExecutionId } from "../execution/ids.ts";
import { isTerminalLifecycle } from "../execution/lifecycle.ts";
import type { ControllerResumption, ControllerResumptionOutcome } from "../execution/resumption.ts";
import {
  createControllerResumption,
  isResumptionTerminal,
  normalizeResumptionError,
  normalizeResumptionValue,
  outcomeOfResumption,
  settleControllerResumption,
} from "../execution/resumption.ts";
import type { Clock } from "../ports/clock.ts";
import { nowIso } from "../ports/clock.ts";
import type {
  ControllerResumptionAttempt,
  ControllerResumptionScope,
  ControllerResumptionWork,
} from "../ports/controller-resumption.ts";
import type { IdGenerator } from "../ports/ids.ts";
import { ID_PREFIXES } from "../ports/ids.ts";
import type { InlineWaitBudget } from "../ports/inline-wait.ts";
import type { RuntimeStore, RuntimeTransaction } from "../ports/runtime-store.ts";

export interface ControllerResumptionProcessorDeps {
  readonly store: RuntimeStore;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  /** How long an Activation stays occupied waiting for local work. Never an operation deadline. */
  readonly inlineWait: InlineWaitBudget;
  /** Enqueues an Execution a settled resumption made runnable. Post-commit, exactly like Effects. */
  readonly wake: (executionId: ExecutionId) => Promise<void>;
  /** Records the WAITING -> READY transition inside the settlement transaction. */
  readonly recordTransition: (
    tx: RuntimeTransaction,
    executionId: ExecutionId,
    from: "WAITING",
    to: "READY",
    at: string,
    reason: string,
  ) => Promise<void>;
}

/** One registration this Activation started and has not committed to. */
interface Registration {
  readonly resumptionId: ControllerResumptionId;
  readonly key: string;
  readonly work: Promise<ControllerResumptionOutcome>;
}

/**
 * Whether a reported dependency is legal, and what the Harness must write for it.
 *
 * Two legal shapes, because a controller can arrive at a suspension two ways: it started the work
 * in this Activation, or it re-derived a key whose work is still unresolved. The first needs a
 * record written; the second already has one and needs nothing but the wait.
 */
export type ResumptionDependency =
  | { readonly status: "new"; readonly record: ControllerResumption }
  | { readonly status: "recovered" }
  | { readonly status: "invalid"; readonly detail: string };

/**
 * The resolved form of a *set* of reported resumption dependencies (Slice G.2).
 *
 * Legal only when every id is legal - work belonging to this Execution that has not settled, either
 * registered by this Activation (`newRecords`) or recovered as an unresolved record - and no id is
 * repeated. One illegal id rejects the whole set, so a partial dependency set can never be committed.
 */
export type ResumptionDependencySet =
  | { readonly status: "ok"; readonly newRecords: readonly ControllerResumption[] }
  | { readonly status: "invalid"; readonly detail: string };

/**
 * What an Activation's scope produced, handed back to the Harness.
 *
 * The Harness never touches the promises directly: it asks whether the id the controller reported
 * is a legal dependency, writes what that answer tells it to, and later tells the scope to attach.
 */
export interface ActivationResumptions {
  readonly scope: ControllerResumptionScope;
  /**
   * Checks the id the controller reported.
   *
   * Legal only for work belonging to *this* Execution that has not settled - either registered by
   * this Activation or recovered as an unresolved record. Anything else is refused, so an Execution
   * can never be parked on work nothing is following.
   */
  resolve(resumptionId: ControllerResumptionId, at: string): Promise<ResumptionDependency>;
  /**
   * Checks a whole *set* of reported ids (Slice G.2).
   *
   * Rejects the entire set if any id is illegal or repeated, so the Harness never commits a partial
   * dependency set. On success it returns the records for the ids that are `new` this Activation;
   * the Harness inserts every one of them in the same transaction as the controller progress.
   */
  resolveMany(resumptionIds: readonly ControllerResumptionId[], at: string): Promise<ResumptionDependencySet>;
  /**
   * Starts following a registration this Activation created. Call only after the WAITING commit.
   *
   * A no-op for a recovered dependency, whose promise is already being followed, and for every
   * registration the controller did not wait on - which is how abandonment works.
   */
  attach(resumptionId: ControllerResumptionId): void;
}

export class ControllerResumptionProcessor {
  private readonly deps: ControllerResumptionProcessorDeps;
  /** Continuations whose promise has not resolved yet. Only the reference runtime inspects this. */
  private readonly inFlight = new Set<Promise<void>>();

  constructor(deps: ControllerResumptionProcessorDeps) {
    this.deps = deps;
  }

  /**
   * Builds the scope for one Activation.
   *
   * Bound to exactly one Execution and one Activation, and holding nothing else: the object handed
   * to the controller is a closure over `run` and nothing more.
   */
  beginActivation(context: ExecutionContext, activationId: ActivationId): ActivationResumptions {
    const executionId = context.executionId;
    const observedRevision = context.revision;
    const registrations = new Map<string, Registration>();
    /** Keys this Activation already resolved inline, so a repeated call is not a second dispatch. */
    const settledInline = new Map<string, ControllerResumptionAttempt>();
    const byKey = new Map<string, ControllerResumptionId>();

    const scope: ControllerResumptionScope = {
      run: async (key: string, work: ControllerResumptionWork): Promise<ControllerResumptionAttempt> => {
        if (typeof key !== "string" || key.length === 0) {
          throw new TypeError("a controller-local resumption needs a stable non-empty key");
        }

        const inline = settledInline.get(key);
        if (inline) return inline;

        const registered = byKey.get(key);
        if (registered) return { status: "suspended", resumptionId: registered };

        // A record for this key already exists: either a previous Activation's work that has
        // settled - in which case this is the recovery path and the thunk must not run - or one
        // still pending, which must not be dispatched a second time either.
        const stored = await this.deps.store.findControllerResumptionByKey(executionId, key);
        if (stored) {
          const outcome = outcomeOfResumption(stored);
          if (outcome) return this.attemptOf(outcome);
          return { status: "suspended", resumptionId: stored.resumptionId };
        }

        const normalized = this.normalizeWork(work);
        const raced = await this.deps.inlineWait.race(normalized);
        if (raced.settled) {
          const attempt = this.attemptOf(raced.value);
          settledInline.set(key, attempt);
          return attempt;
        }

        // The Activation stopped waiting. The work did not stop running, and nothing durable
        // exists yet: it appears only if the controller reports the matching dependency.
        const resumptionId = this.deps.ids.next(ID_PREFIXES.resumption) as ControllerResumptionId;
        registrations.set(resumptionId, { resumptionId, key, work: normalized });
        byKey.set(key, resumptionId);
        return { status: "suspended", resumptionId };
      },
    };

    const resolveOne = async (resumptionId: ControllerResumptionId, at: string): Promise<ResumptionDependency> => {
      const registration = registrations.get(resumptionId);
      if (registration) {
        return {
          status: "new",
          record: createControllerResumption({
            resumptionId,
            executionId,
            key: registration.key,
            activationId,
            observedRevision,
            createdAt: at,
          }),
        };
      }
      // Not started here. It is still a legal dependency if it is this Execution's own unresolved
      // work - the case where a controller re-derived a key whose record has not settled.
      const stored = await this.deps.store.readControllerResumption(resumptionId);
      if (!stored || stored.executionId !== executionId) {
        return { status: "invalid", detail: `${resumptionId} was not registered by this Activation` };
      }
      if (isResumptionTerminal(stored)) {
        return {
          status: "invalid",
          detail: `${resumptionId} is already ${stored.state}; re-derive the key to start fresh work`,
        };
      }
      return { status: "recovered" };
    };

    return {
      scope,
      resolve: resolveOne,
      resolveMany: async (
        resumptionIds: readonly ControllerResumptionId[],
        at: string,
      ): Promise<ResumptionDependencySet> => {
        if (new Set(resumptionIds).size !== resumptionIds.length) {
          return { status: "invalid", detail: "the dependency set contains a duplicate resumption id" };
        }
        const newRecords: ControllerResumption[] = [];
        for (const id of resumptionIds) {
          const dependency = await resolveOne(id, at);
          if (dependency.status === "invalid") return { status: "invalid", detail: dependency.detail };
          if (dependency.status === "new") newRecords.push(dependency.record);
        }
        return { status: "ok", newRecords };
      },
      attach: (resumptionId: ControllerResumptionId) => {
        const registration = registrations.get(resumptionId);
        if (!registration) return;
        this.track(executionId, registration.resumptionId, registration.work);
      },
    };
  }

  /** Resolves once every attached continuation has settled. Reference/testing affordance. */
  async drain(): Promise<void> {
    while (this.inFlight.size > 0) {
      await Promise.all([...this.inFlight]);
    }
  }

  /**
   * Wraps controller-local work so it can neither reject nor smuggle a non-persistable value.
   *
   * The same wrapper on both paths is what makes fast and slow completion interchangeable: a value
   * that fails the JSON boundary fails identically whether it settled inline or an hour later, and
   * a thrown error becomes the same normalized failure either way. It also means the returned
   * promise never rejects, so abandoning a registration cannot produce an unhandled rejection.
   */
  private normalizeWork(work: ControllerResumptionWork): Promise<ControllerResumptionOutcome> {
    return (async () => {
      try {
        return normalizeResumptionValue(await work());
      } catch (error) {
        return normalizeResumptionError(error);
      }
    })();
  }

  private attemptOf(outcome: ControllerResumptionOutcome): ControllerResumptionAttempt {
    return outcome.status === "settled"
      ? { status: "settled", value: outcome.value }
      : { status: "failed", failure: outcome.failure };
  }

  /**
   * Follows a registration the Harness committed to.
   *
   * A failure while recording settlement is deliberately swallowed rather than rethrown: the
   * Activation that started this work ended long ago, so there is nobody to throw to, and an
   * unhandled rejection would take a runtime down for one unwritable record. What is left behind
   * is honest - a pending resumption and an Execution still WAITING on it. Nothing here invents a
   * result for work whose outcome could not be stored.
   */
  private track(
    executionId: ExecutionId,
    resumptionId: ControllerResumptionId,
    work: Promise<ControllerResumptionOutcome>,
  ): void {
    const tracked = work
      .then(async (outcome) => {
        await this.settle(executionId, resumptionId, outcome);
      })
      .catch(() => undefined)
      .finally(() => {
        this.inFlight.delete(tracked);
      });
    this.inFlight.add(tracked);
  }

  /**
   * Records an outcome and, when it is the dependency the Execution is waiting on, makes it READY.
   *
   * One transaction, and it does exactly two things. No mailbox append, no Event, no Effect journal
   * entry, no pending operation, no authorizer call - a controller-local result is not an
   * observation delivered through the runtime boundary, and writing it as one would erase the
   * distinction this slice exists to establish.
   */
  private async settle(
    executionId: ExecutionId,
    resumptionId: ControllerResumptionId,
    outcome: ControllerResumptionOutcome,
  ): Promise<void> {
    const settledAt = nowIso(this.deps.clock);

    const woke = await this.deps.store.transact(
      executionId,
      async (tx): Promise<ExecutionId | null> => {
        // Re-read inside the transaction: the check and the write must see the same record, so a
        // duplicate continuation cannot settle the same dependency twice.
        const stored = await tx.controllerResumptions.get(resumptionId);
        // `pending` is the only state a late promise result may act on. A `settled` record is
        // already done; an `invalidated` one was overtaken by an interleave Event and its result is
        // obsolete - it must not settle, must not wake, and must not become an Event.
        if (!stored || stored.state !== "pending") return null;

        await tx.controllerResumptions.update(settleControllerResumption(stored, outcome, settledAt));

        const context = await tx.executions.get(stored.executionId);
        if (!context) return null;
        // A terminal Execution does not resume. The record is settled honestly; nothing wakes.
        if (isTerminalLifecycle(context.lifecycle)) return null;

        const waiting = context.waitingFor;
        // A settled resumption wakes the Execution only when it is genuinely the dependency being
        // waited on - the single `controller_resumption` arm, or a member of a G.2 `dependencies`
        // union wait. In every other case (already READY / RUNNING, or WAITING on something else)
        // the outcome is still recorded above; it simply causes no second READY transition, which is
        // exactly the "R2 settles while already READY" rule.
        const dependsOnThis =
          context.lifecycle === "WAITING" &&
          waiting !== null &&
          ((waiting.kind === "controller_resumption" && waiting.resumptionId === resumptionId) ||
            (waiting.kind === "dependencies" && waiting.resumptions.includes(resumptionId)));
        if (!dependsOnThis) return null;

        const ready = transitionContext(context, "READY", settledAt);
        await tx.executions.update(ready, context.revision);
        await this.deps.recordTransition(
          tx,
          stored.executionId,
          "WAITING",
          "READY",
          settledAt,
          `controller resumption ${resumptionId}`,
        );
        return stored.executionId;
      },
    );

    // Scheduling is a post-commit act, exactly as it is for an Event.
    if (woke) await this.deps.wake(woke);
  }
}
