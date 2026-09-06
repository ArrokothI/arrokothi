/**
 * Scripted Agent and Workflow controllers.
 *
 * These stand in for real controllers while proving the *shape* of the semantic spine: they
 * consume delivered Events, keep progress across Activations, emit without completing, report a
 * wake dependency, propose terminal results, fail, and - deliberately - misreport, so conformance
 * can show the Harness refusing them.
 *
 * The script lives in the definition itself, which means it is ordinary serializable authored data.
 * That is not a test convenience: it is the same constraint every real Agent or Workflow spec is
 * under, and it keeps these controllers from becoming a back door for runtime objects. Since the kernel
 * an Agent `spec` is a real, validated Agent spec, so a scripted Agent carries its program in the
 * definition's `metadata` and pins a minimal valid spec beside it - the definition stays publishable
 * while the scripted controller keeps driving the substrate.
 *
 * One Activation executes one step. The step cursor lives in controller progress, so "the same
 * Execution resumed where it left off" is observable rather than assumed.
 *
 * The Effect steps matter for what they cannot do. `use_capability` produces a *proposal* and
 * nothing else: this controller has no executor, no journal, no authorizer, and no way to learn an
 * outcome except by being handed an Event in a later Activation. A script that requests a capability
 * and then awaits its result is therefore the honest shape of controller/Harness collaboration,
 * whether the Effect takes a microsecond or an hour.
 */

import type { AgentSpecInput } from "../agent/spec.ts";
import type { AgentDefinition, WorkflowDefinition, TerminalResultSchema } from "../definitions/types.ts";
import { defineAgent, defineWorkflow } from "../definitions/validation.ts";
import type { DefinitionKind } from "../definitions/types.ts";
import type { EffectIdempotencyScope } from "../effects/fingerprint.ts";
import type { EffectProposal } from "../effects/types.ts";
import { ask, callExecution, reply, requestUserInput, send, spawnExecution, useCapability } from "../effects/types.ts";
import type { WorkingNotesHandoff } from "../execution/working-notes.ts";
import type { OperationRefInput } from "../operations/refs.ts";
import type { ValueSchema } from "../schema/value-schema.ts";
import { eventSatisfiesWake } from "../interaction/event-envelope.ts";
import type { WakeCondition } from "../interaction/event-envelope.ts";
import type { EventKind } from "../interaction/events.ts";
import { CHILD_RESULT_EVENT_KINDS, EFFECT_RESULT_EVENT_KINDS, isEffectResultEventKind } from "../interaction/events.ts";
import type { ActivationInput, ActivationOutcome, ExecutionController } from "../ports/controller.ts";
import type { ControllerResumptionScope } from "../ports/controller-resumption.ts";
import type { EmissionProposal } from "../execution/emission.ts";
import type { JsonObject, JsonValue } from "../util/json.ts";

export type ScriptedControllerStep =
  /** Produce nonterminal output. The Execution stays alive and schedulable. */
  | { readonly do: "emit"; readonly text?: string; readonly data?: JsonValue }
  /** Local work that changes nothing observable; the Execution remains runnable. */
  | { readonly do: "continue" }
  /** Write into controller progress, so progress carried across Activations is checkable. */
  | { readonly do: "remember"; readonly key: string; readonly value: JsonValue }
  /**
   * Report a wake dependency. The Harness, not this step, decides whether that means WAITING.
   *
   * `interleave` declares a second, separate wake condition. An Event matching it makes
   * the Execution READY without the primary dependency being satisfied; the step does not advance,
   * so the resumed Activation re-reports the same dependency.
   */
  | {
      readonly do: "await";
      readonly eventKinds?: readonly EventKind[];
      readonly correlationId?: string;
      readonly note?: string;
      readonly interleave?: { readonly eventKinds?: readonly EventKind[]; readonly correlationId?: string };
    }
  /**
   * Propose a capability Effect, then report that its result is still needed.
   *
   * One step, because that is the shape real controllers have: the proposal and the dependency on
   * its result are one semantic decision. The Harness decides whether the result arrived in time.
   */
  | {
      readonly do: "use_capability";
      readonly capability: string;
      readonly operation: string;
      readonly input?: JsonObject;
      readonly requestKey?: string;
      readonly resources?: readonly string[];
      readonly deadlineMs?: number;
      readonly idempotency?: EffectIdempotencyScope;
      /** Report `continue` instead of awaiting, for scripts that do not need the result yet. */
      readonly await?: boolean;
    }
  /** Propose an Effect kind the harness does not dispatch, to prove it is refused rather than dropped. */
  | { readonly do: "propose_effect"; readonly effect: EffectProposal; readonly await?: boolean }
  /**
   * Propose a `RequestUserInput` and wait for the correlated `user.input` result.
   *
   * `schema` is the existing core `ValueSchema`; omitted, the response is validated as text. The
   * step reports the same prospective dependency each Activation, so a resumed Activation re-checks
   * whether the answer arrived.
   */
  | {
      readonly do: "request_user_input";
      readonly prompt: string;
      readonly schema?: ValueSchema;
      readonly requestKey?: string;
      /** Report `continue` instead of awaiting, for scripts that do not need the answer yet. */
      readonly await?: boolean;
    }
  /**
   * Propose a `SpawnExecution` (`spawn` or `call`).
   *
   * `spawn` proposes and, unless `await` is false, waits for `child.spawned` on the request key.
   * `call` proposes and waits for the correlated `child.completed` / `child.failed`. Either way the
   * child is a full independent Execution; `call` only adds the terminal-result dependency.
   */
  | {
      readonly do: "spawn" | "call";
      readonly definitionId: string;
      readonly definitionVersion: number;
      readonly childInput?: JsonValue;
      readonly requestedOperations?: readonly OperationRefInput[];
      /**
       * An explicit Working Notes handoff snapshot for the child.
       *
       * A substrate fixture has no Working Notes frame of its own, so it supplies the already-selected
       * snapshot directly - the shape a real controller would produce with
       * `selectWorkingNotesHandoff(frame, { keys })`.
       */
      readonly workingNotes?: WorkingNotesHandoff;
      readonly requestKey?: string;
      readonly interleave?: { readonly eventKinds?: readonly EventKind[]; readonly correlationId?: string };
      /** `spawn` only: report `continue` instead of waiting for `child.spawned`. */
      readonly await?: boolean;
    }
  /**
   * Propose a `send` (fire-and-forget peer message).
   *
   * Unless `await` is false, waits for the `message.sent` acknowledgement on the request key.
   */
  | {
      readonly do: "send";
      readonly to: string;
      readonly body?: JsonValue;
      readonly requestKey?: string;
      readonly await?: boolean;
    }
  /**
   * Propose an `ask` and wait for the correlated reply `peer.message`.
   *
   * `interleave` opts into processing other peer messages while the reply is outstanding.
   */
  | {
      readonly do: "ask";
      readonly to: string;
      readonly body?: JsonValue;
      readonly requestKey?: string;
      readonly interleave?: { readonly eventKinds?: readonly EventKind[]; readonly correlationId?: string };
    }
  /**
   * Propose a `reply` to a peer request this Execution received.
   *
   * `toMessageId` names the request; omitted, it replies to the most recent `peer.message` this
   * Execution saw that had `expectsReply: true`. `to` is normally derived from that runtime-owned
   * message; tests may provide it explicitly to exercise integrity rejection.
   */
  | {
      readonly do: "reply";
      readonly body?: JsonValue;
      readonly toMessageId?: string;
      readonly to?: string;
      readonly requestKey?: string;
      /** Wait for the reply's delivery acknowledgement or refusal. */
      readonly await?: boolean;
    }
  /**
   * Propose an `ask` addressed to the sender of the most recent `peer.message` this Execution saw.
   *
   * A convenience so a peer program does not need the other Execution's id baked in as authored data.
   */
  | {
      readonly do: "ask_sender";
      readonly body?: JsonValue;
      readonly requestKey?: string;
      readonly interleave?: { readonly eventKinds?: readonly EventKind[]; readonly correlationId?: string };
    }
  /**
   * Run controller-local asynchronous work under this Activation's inline budget.
   *
   * The substrate counterpart of a model call: opaque local work the runtime races, tracks, and -
   * if it outlives the Activation - resumes. The step deliberately does not advance when the work
   * suspends, so the Activation that resumes re-runs it and recovers the stored outcome by key,
   * exactly as a real controller reconstructing a model call would.
   */
  | {
      readonly do: "local_work";
      readonly key: string;
      /** What the work produces. */
      readonly produces?: JsonValue;
      /** Throw instead, to exercise normalized failure. */
      readonly throws?: string;
      /** Produce something unpersistable, to prove the JSON boundary is not path-dependent. */
      readonly unserializable?: boolean;
      /** Register the work but never report the matching dependency, so it is abandoned. */
      readonly abandon?: boolean;
      /**
       * Opt into controlled interleaving while suspended on this work.
       *
       * An Event matching this condition invalidates the still-pending resumption and makes the
       * Execution READY. The step does not advance; the resumed Activation re-runs `run(key)`, finds
       * no reusable record, and starts fresh work.
       */
      readonly interleave?: { readonly eventKinds?: readonly EventKind[]; readonly correlationId?: string };
    }
  /** Record the kinds and correlations of the Events this Activation consumed. */
  | { readonly do: "observe"; readonly note?: string }
  /** Propose semantic completion. The Harness validates the value against the pinned schema. */
  | { readonly do: "complete"; readonly result?: JsonValue }
  | { readonly do: "fail"; readonly code: string; readonly message: string }
  /** Return an outcome the Harness must reject. */
  | { readonly do: "misreport"; readonly as: "wrong_kind" | "lifecycle_status" | "unserializable_progress" | "unknown_resumption" };

export interface ScriptedPeerMessage extends JsonObject {
  messageId: string;
  fromExecutionId: string;
  body: JsonValue;
  expectsReply: boolean;
  inReplyToMessageId: string | null;
}

export interface ScriptedProgress extends JsonObject {
  step: number;
  awaiting: boolean;
  /** Every Event id this Execution has ever consumed, in order. */
  seenEvents: string[];
  /** Every Event kind this Execution has ever consumed, in order. */
  seenKinds: string[];
  /** Bodies of the Effect-result Events consumed, so a test can assert what was observed. */
  observations: JsonValue[];
  /** Every `peer.message` this Execution has consumed, in order. */
  peerMessages: ScriptedPeerMessage[];
  notes: JsonObject;
}

const EMPTY: ScriptedProgress = {
  step: 0,
  awaiting: false,
  seenEvents: [],
  seenKinds: [],
  observations: [],
  peerMessages: [],
  notes: {},
};

function readProgress(value: JsonObject): ScriptedProgress {
  const step = typeof value["step"] === "number" ? (value["step"] as number) : 0;
  const awaiting = value["awaiting"] === true;
  const seenEvents = Array.isArray(value["seenEvents"]) ? ([...(value["seenEvents"] as JsonValue[])] as string[]) : [];
  const seenKinds = Array.isArray(value["seenKinds"]) ? ([...(value["seenKinds"] as JsonValue[])] as string[]) : [];
  const observations = Array.isArray(value["observations"]) ? [...(value["observations"] as JsonValue[])] : [];
  const peerMessages = Array.isArray(value["peerMessages"])
    ? ([...(value["peerMessages"] as JsonValue[])] as ScriptedPeerMessage[])
    : [];
  const notes = (value["notes"] ?? {}) as JsonObject;
  return { step, awaiting, seenEvents, seenKinds, observations, peerMessages, notes: { ...notes } };
}

/**
 * Finds the script.
 *
 * A scripted Agent carries it in the definition's `metadata`, because an Agent `spec` is now a real
 * validated Agent spec with no room for one. A Workflow spec is real Stage topology,
 * so a scripted Workflow wraps its program in the `config` of a single Function Stage. Either way
 * the definition stays valid and publishable while the scripted controller drives it. These
 * controllers exercise the *substrate* (Events, progress, Effects, completion), not Agent or Stage
 * semantics; `controllers/agent` and `controllers/workflow` own those.
 */
function readProgram(definition: { readonly spec?: unknown; readonly metadata?: unknown }): readonly ScriptedControllerStep[] {
  const metadata = definition.metadata;
  if (metadata !== null && typeof metadata === "object") {
    const program = (metadata as Record<string, unknown>)["program"];
    if (Array.isArray(program)) return program as unknown as readonly ScriptedControllerStep[];
  }
  const spec = definition.spec;
  if (spec === null || typeof spec !== "object") return [];
  const stages = (spec as Record<string, unknown>)["stages"];
  if (Array.isArray(stages)) {
    const first = stages[0] as { config?: { program?: unknown } } | undefined;
    const program = first?.config?.program;
    if (Array.isArray(program)) return program as unknown as readonly ScriptedControllerStep[];
  }
  return [];
}

/**
 * A hold placed on `local_work`, so a test can keep controller-local work genuinely outstanding.
 *
 * Without one, work registered by a script resolves immediately and the runtime settles it on the
 * next microtask - correct behaviour, and exactly what proves no wake is lost, but useless for
 * showing that an Execution *stays* suspended while work is in flight. The gate is a controller
 * construction argument rather than script data for the obvious reason: a promise is not
 * serializable, and a definition that could carry one would not be a definition.
 */
export type ScriptedWorkGate = (key: string) => Promise<void> | void;

/** Builds an interleave `WakeCondition` from a step's optional `interleave` field. */
function interleaveWake(
  interleave: { readonly eventKinds?: readonly EventKind[]; readonly correlationId?: string } | undefined,
): WakeCondition | undefined {
  if (interleave === undefined) return undefined;
  return {
    eventKinds: interleave.eventKinds ? [...interleave.eventKinds] : [],
    correlationId: interleave.correlationId ?? null,
  };
}

export interface ScriptedControllerOptions {
  readonly gate?: ScriptedWorkGate;
}

class ScriptedController implements ExecutionController {
  readonly kind: DefinitionKind;
  private readonly gate: ScriptedWorkGate | undefined;

  constructor(kind: DefinitionKind, options: ScriptedControllerOptions = {}) {
    this.kind = kind;
    this.gate = options.gate;
  }

  async activate(input: ActivationInput, resumptions: ControllerResumptionScope): Promise<ActivationOutcome> {
    const progress = readProgress(input.execution.control.progress);
    for (const event of input.events) {
      progress.seenEvents.push(event.eventId);
      progress.seenKinds.push(event.kind);
      if (isEffectResultEventKind(event.kind)) {
        progress.observations.push(event.body as unknown as JsonValue);
      }
      if (event.kind === "peer.message") {
        const body = event.body as unknown as ScriptedPeerMessage;
        progress.peerMessages.push({
          messageId: body.messageId,
          fromExecutionId: body.fromExecutionId,
          body: body.body,
          expectsReply: body.expectsReply,
          inReplyToMessageId: body.inReplyToMessageId,
        });
        progress.observations.push(event.body as unknown as JsonValue);
      }
    }

    const program = readProgram(input.definition);
    const step = program[progress.step];

    if (step === undefined) {
      return this.outcome(progress, {
        status: "fail",
        failure: { code: "script_exhausted", message: `no step ${progress.step} in the scripted program` },
      });
    }

    switch (step.do) {
      case "emit": {
        progress.step += 1;
        const body: EmissionProposal["body"] =
          step.data !== undefined ? { kind: "data", data: step.data } : { kind: "text", text: step.text ?? "" };
        return this.outcome(progress, { status: "continue" }, [{ body }]);
      }

      case "continue": {
        progress.step += 1;
        return this.outcome(progress, { status: "continue" });
      }

      case "remember": {
        progress.step += 1;
        progress.notes[step.key] = step.value;
        return this.outcome(progress, { status: "continue" });
      }

      case "await": {
        const wake: WakeCondition = {
          eventKinds: step.eventKinds ? [...step.eventKinds] : [],
          correlationId: step.correlationId ?? null,
          ...(step.note !== undefined ? { description: step.note } : {}),
        };
        const interleave = interleaveWake(step.interleave);
        // An Event already delivered into this Activation is an answer, not something still owed.
        // Reporting a dependency that the controller can already satisfy would make the Harness
        // derive WAITING for work that is actually runnable. An interleave Event counts too.
        if (
          input.events.some(
            (event) => eventSatisfiesWake(event, wake) || (interleave !== undefined && eventSatisfiesWake(event, interleave)),
          )
        ) {
          progress.awaiting = false;
          progress.step += 1;
          return this.outcome(progress, { status: "continue" });
        }
        progress.awaiting = true;
        return this.outcome(
          progress,
          interleave !== undefined ? { status: "await_event", wake, interleave } : { status: "await_event", wake },
        );
      }

      case "use_capability": {
        progress.step += 1;
        const requestKey = step.requestKey ?? `${step.capability}:${progress.step}`;
        const proposal: EffectProposal = useCapability({
          capability: step.capability,
          operation: step.operation,
          ...(step.input !== undefined ? { input: step.input } : {}),
          requestKey,
          ...(step.resources !== undefined ? { resources: step.resources } : {}),
          ...(step.deadlineMs !== undefined ? { deadlineMs: step.deadlineMs } : {}),
          ...(step.idempotency !== undefined ? { idempotency: step.idempotency } : {}),
        });
        if (step.await === false) {
          return this.outcome(progress, { status: "continue" }, [], [proposal]);
        }
        progress.awaiting = true;
        return this.outcome(
          progress,
          {
            status: "await_event",
            // Wait on the correlation, not on a particular outcome: success, definite failure, and
            // an unknown outcome are all answers, and a controller that only woke for success would
            // sleep forever on the ones that matter most.
            wake: { eventKinds: [...EFFECT_RESULT_EVENT_KINDS], correlationId: requestKey, description: `result of ${step.capability}` },
          },
          [],
          [proposal],
        );
      }

      case "request_user_input": {
        progress.step += 1;
        const requestKey = step.requestKey ?? `user_input:${progress.step}`;
        const proposal = requestUserInput({
          prompt: step.prompt,
          ...(step.schema !== undefined ? { schema: step.schema } : {}),
          requestKey,
        });
        if (step.await === false) {
          return this.outcome(progress, { status: "continue" }, [], [proposal]);
        }
        progress.awaiting = true;
        return this.outcome(
          progress,
          {
            status: "await_event",
            wake: {
              eventKinds: ["user.input", "effect.denied", "effect.rejected"],
              correlationId: requestKey,
              description: `user response to "${step.prompt}"`,
            },
          },
          [],
          [proposal],
        );
      }

      case "propose_effect": {
        progress.step += 1;
        const requestKey = step.effect.requestKey ?? `effect:${progress.step}`;
        const proposal: EffectProposal = { ...step.effect, requestKey } as EffectProposal;
        if (step.await === false) {
          return this.outcome(progress, { status: "continue" }, [], [proposal]);
        }
        progress.awaiting = true;
        return this.outcome(
          progress,
          {
            status: "await_event",
            wake: { eventKinds: [...EFFECT_RESULT_EVENT_KINDS], correlationId: requestKey, description: `result of ${step.effect.kind}` },
          },
          [],
          [proposal],
        );
      }

      case "spawn":
      case "call": {
        progress.step += 1;
        const requestKey = step.requestKey ?? `${step.do}:${step.definitionId}:${progress.step}`;
        const build = step.do === "call" ? callExecution : spawnExecution;
        const proposal = build({
          definitionId: step.definitionId,
          definitionVersion: step.definitionVersion,
          ...(step.childInput !== undefined ? { input: step.childInput } : {}),
          ...(step.requestedOperations !== undefined ? { requestedOperations: step.requestedOperations } : {}),
          ...(step.workingNotes !== undefined ? { workingNotes: step.workingNotes } : {}),
          requestKey,
        });
        if (step.do === "spawn" && step.await === false) {
          return this.outcome(progress, { status: "continue" }, [], [proposal]);
        }
        progress.awaiting = true;
        // Wait on the correlation across every answer: the child result, and also a refusal - a
        // controller that only woke for success would sleep forever on a denied or budget-exhausted
        // spawn.
        const wake: WakeCondition =
          step.do === "call"
            ? {
                eventKinds: [...CHILD_RESULT_EVENT_KINDS, "effect.denied", "effect.rejected"],
                correlationId: requestKey,
                description: `terminal result of ${step.definitionId}`,
              }
            : {
                eventKinds: ["child.spawned", "effect.denied", "effect.rejected"],
                correlationId: requestKey,
                description: `${step.definitionId} spawned`,
              };
        const interleave = interleaveWake(step.interleave);
        return this.outcome(
          progress,
          interleave !== undefined ? { status: "await_event", wake, interleave } : { status: "await_event", wake },
          [],
          [proposal],
        );
      }

      case "send": {
        progress.step += 1;
        const requestKey = step.requestKey ?? `send:${progress.step}`;
        const proposal = send({ to: step.to, ...(step.body !== undefined ? { body: step.body } : {}), requestKey });
        if (step.await === false) {
          return this.outcome(progress, { status: "continue" }, [], [proposal]);
        }
        progress.awaiting = true;
        return this.outcome(
          progress,
          {
            status: "await_event",
            wake: { eventKinds: ["message.sent", "effect.denied", "effect.rejected"], correlationId: requestKey, description: `sent to ${step.to}` },
          },
          [],
          [proposal],
        );
      }

      case "ask":
      case "ask_sender": {
        progress.step += 1;
        const requestKey = step.requestKey ?? `ask:${progress.step}`;
        const to =
          step.do === "ask"
            ? step.to
            : [...progress.peerMessages].reverse()[0]?.fromExecutionId;
        if (to === undefined) {
          return this.outcome(progress, {
            status: "fail",
            failure: { code: "no_peer_to_ask", message: "ask_sender ran with no peer message to reply to" },
          });
        }
        const proposal = ask({ to, ...(step.body !== undefined ? { body: step.body } : {}), requestKey });
        const interleave = interleaveWake(step.interleave);
        progress.awaiting = true;
        const wake: WakeCondition = {
          eventKinds: ["peer.message", "effect.denied", "effect.rejected"],
          correlationId: requestKey,
          description: `reply from ${to}`,
        };
        return this.outcome(
          progress,
          interleave !== undefined ? { status: "await_event", wake, interleave } : { status: "await_event", wake },
          [],
          [proposal],
        );
      }

      case "reply": {
        progress.step += 1;
        const request = step.toMessageId !== undefined
          ? [...progress.peerMessages].reverse().find((message) => message.messageId === step.toMessageId)
          : [...progress.peerMessages].reverse().find((message) => message.expectsReply);
        const target = step.toMessageId ?? request?.messageId;
        const to = step.to ?? request?.fromExecutionId;
        if (target === undefined || to === undefined) {
          return this.outcome(progress, {
            status: "fail",
            failure: { code: "no_peer_request_to_reply_to", message: "reply step needs a request id and concrete requester" },
          });
        }
        const requestKey = step.requestKey ?? `reply:${progress.step}`;
        const proposal = reply({
          to,
          inReplyToMessageId: target,
          ...(step.body !== undefined ? { body: step.body } : {}),
          requestKey,
        });
        if (step.await !== true) {
          // A plain reply settles as soon as it is admitted; do not block on it.
          return this.outcome(progress, { status: "continue" }, [], [proposal]);
        }
        progress.awaiting = true;
        return this.outcome(
          progress,
          {
            status: "await_event",
            wake: { eventKinds: ["message.sent", "effect.denied", "effect.rejected"], correlationId: requestKey },
          },
          [],
          [proposal],
        );
      }

      case "local_work": {
        const attempt = await resumptions.run(step.key, async () => {
          await this.gate?.(step.key);
          if (step.throws !== undefined) throw new Error(step.throws);
          // A closure is the cheapest thing that cannot be persisted, and it must fail identically
          // whether it settled inline or an hour later.
          if (step.unserializable === true) return { callback: () => undefined };
          return step.produces ?? null;
        });

        if (attempt.status === "suspended") {
          if (step.abandon === true) {
            // Registered, then not waited on. Nothing durable exists, nothing follows the promise,
            // and this Execution can never be woken by it.
            progress.step += 1;
            progress.notes[step.key] = "abandoned";
            return this.outcome(progress, { status: "continue" });
          }
          // Deliberately does not advance the cursor: the resumed Activation re-runs this step,
          // derives the same key, and is handed the stored outcome instead of working again - or,
          // after an interleave Event invalidated it, starts fresh work.
          const interleave = interleaveWake(step.interleave);
          return this.outcome(
            progress,
            interleave !== undefined
              ? { status: "await_resumption", resumptionId: attempt.resumptionId, interleave }
              : { status: "await_resumption", resumptionId: attempt.resumptionId },
          );
        }

        progress.step += 1;
        progress.notes[step.key] =
          attempt.status === "settled"
            ? { settled: attempt.value }
            : { failed: attempt.failure.code, message: attempt.failure.message };
        return this.outcome(progress, { status: "continue" });
      }

      case "observe": {
        progress.step += 1;
        if (step.note !== undefined) progress.notes["observed"] = step.note;
        return this.outcome(progress, { status: "continue" });
      }

      case "complete": {
        progress.step += 1;
        return this.outcome(
          progress,
          step.result === undefined ? { status: "complete" } : { status: "complete", result: { value: step.result } },
        );
      }

      case "fail": {
        progress.step += 1;
        return this.outcome(progress, { status: "fail", failure: { code: step.code, message: step.message } });
      }

      case "misreport": {
        progress.step += 1;
        if (step.as === "wrong_kind") {
          const other: DefinitionKind = this.kind === "agent" ? "workflow" : "agent";
          return { control: { kind: other, progress }, next: { status: "continue" } } as ActivationOutcome;
        }
        if (step.as === "lifecycle_status") {
          // A controller must not be able to name an operational state at all.
          return { control: { kind: this.kind, progress }, next: { status: "WAITING" } } as unknown as ActivationOutcome;
        }
        if (step.as === "unknown_resumption") {
          // A dependency on work this Activation never registered. The Harness must refuse it
          // rather than park the Execution on something nothing is following.
          return {
            control: { kind: this.kind, progress },
            next: { status: "await_resumption", resumptionId: "res_never_registered" },
          } as unknown as ActivationOutcome;
        }
        const poisoned = { ...progress, callback: () => undefined } as unknown as JsonObject;
        return { control: { kind: this.kind, progress: poisoned }, next: { status: "continue" } } as ActivationOutcome;
      }
    }
  }

  private outcome(
    progress: ScriptedProgress,
    next: ActivationOutcome["next"],
    emissions: readonly EmissionProposal[] = [],
    effects: readonly EffectProposal[] = [],
  ): ActivationOutcome {
    return { control: { kind: this.kind, progress } as ActivationOutcome["control"], emissions, effects, next };
  }
}

export function createScriptedAgentController(options: ScriptedControllerOptions = {}): ExecutionController {
  return new ScriptedController("agent", options);
}

export function createScriptedWorkflowController(options: ScriptedControllerOptions = {}): ExecutionController {
  return new ScriptedController("workflow", options);
}

export interface ScriptedDefinitionInput {
  readonly id: string;
  readonly version?: number;
  readonly name?: string;
  readonly program: readonly ScriptedControllerStep[];
  readonly terminalResult?: TerminalResultSchema;
}

function spec(program: readonly ScriptedControllerStep[]): JsonObject {
  return { program: program as unknown as JsonValue } as JsonObject;
}

/**
 * The minimal valid Agent spec a scripted definition pins.
 *
 * It names a logical model and instructions because every Agent definition must; the scripted
 * controller never resolves either. Nothing here exposes an operation, which is the fail-closed
 * default and keeps a substrate fixture from accidentally asserting anything about exposure.
 */
function scriptedAgentSpec(): AgentSpecInput {
  return {
    model: { logicalRef: "scripted", requirements: { text: true } },
    instructions: "Scripted substrate fixture; this Agent's progression comes from its program.",
  };
}

export function scriptedAgentDefinition(input: ScriptedDefinitionInput): AgentDefinition {
  return defineAgent({
    id: input.id,
    ...(input.version !== undefined ? { version: input.version } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.terminalResult !== undefined ? { terminalResult: input.terminalResult } : {}),
    metadata: spec(input.program),
    spec: scriptedAgentSpec(),
  });
}

export function scriptedWorkflowDefinition(input: ScriptedDefinitionInput): WorkflowDefinition {
  return defineWorkflow({
    id: input.id,
    ...(input.version !== undefined ? { version: input.version } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.terminalResult !== undefined ? { terminalResult: input.terminalResult } : {}),
    spec: {
      entryStage: "scripted",
      stages: [
        {
          id: "scripted",
          kind: "function",
          implementationRef: "scripted-controller-program",
          config: spec(input.program),
          transitions: { kind: "always", next: { to: "complete" } },
        },
      ],
    },
  });
}

export function readScriptedProgress(progress: JsonObject): ScriptedProgress {
  return readProgress(progress);
}

export const INITIAL_SCRIPTED_PROGRESS: ScriptedProgress = EMPTY;
