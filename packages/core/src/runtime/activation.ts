/**
 * Activations: one scheduled period in which a controller ran.
 *
 * An Activation is not "a turn" and not "a request". An Execution lives across many Activations,
 * separated by WAITING; a single Activation may consume several delivered Events and produce
 * several emissions without ending anything.
 *
 * This module also owns outcome validation. Everything a controller returns is untrusted data
 * until checked here: the Harness must never persist a mistagged progress record, a non-JSON
 * value, or a malformed wake condition, and it must never be able to read a lifecycle state out of
 * a controller's reply, because there is no field for one.
 *
 * `await_resumption` is checked the same way and no more trustingly. This module confirms only that
 * the reported identifier is well formed; whether it names work this Execution is actually waiting
 * on is a runtime fact the Harness establishes separately, because a controller asserting it would
 * be a controller choosing what the runtime believes.
 */

import type { DefinitionKind, ExecutionDefinition } from "../definitions/types.ts";
import type { EffectProposal } from "../effects/types.ts";
import { effectProposalIssues } from "../effects/types.ts";
import type { ControllerProgress, ExecutionView } from "../execution/context.ts";
import type { EmissionProposal } from "../execution/emission.ts";
import { emissionBodyIssues } from "../execution/emission.ts";
import type { ActivationId, ExecutionId } from "../execution/ids.ts";
import { isControllerResumptionId } from "../execution/ids.ts";
import type { LifecycleState } from "../execution/lifecycle.ts";
import type { EffectDispatchRecord } from "./effect-processor.ts";
import type { DeliveredEvent } from "../interaction/event-envelope.ts";
import { wakeConditionIssues } from "../interaction/event-envelope.ts";
import type { ActivationInput, ActivationOutcome, ControllerNext } from "../ports/controller.ts";
import { isJsonObject, jsonIssues } from "../util/json.ts";

export type ActivationResultKind = "continued" | "waiting" | "completed" | "failed";

/** What one Activation did. An audit record, never a delivered Event. */
export interface ActivationRecord {
  readonly activationId: ActivationId;
  readonly executionId: ExecutionId;
  readonly kind: DefinitionKind;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly deliveredEventIds: readonly string[];
  readonly emissionIds: readonly string[];
  /** What the Harness did with each Effect this Activation proposed. */
  readonly effects: readonly EffectDispatchRecord[];
  readonly lifecycleBefore: LifecycleState;
  readonly lifecycleAfter: LifecycleState;
  readonly result: ActivationResultKind;
  /** Why the Harness rejected a controller outcome, when it did. */
  readonly rejection: string | null;
}

export type OutcomeRejectionCode =
  | "malformed_outcome"
  | "wrong_control_kind"
  | "invalid_progress"
  | "invalid_emission"
  | "invalid_effect"
  | "invalid_next"
  | "invalid_wake"
  | "invalid_resumption"
  | "invalid_result"
  | "invalid_failure";

export interface OutcomeRejection {
  readonly code: OutcomeRejectionCode;
  readonly message: string;
}

export type OutcomeValidation =
  | { readonly ok: true; readonly outcome: ActivationOutcome }
  | { readonly ok: false; readonly rejection: OutcomeRejection };

const reject = (code: OutcomeRejectionCode, message: string): OutcomeValidation => ({ ok: false, rejection: { code, message } });

function validateNext(next: unknown): OutcomeRejection | null {
  if (next === null || typeof next !== "object" || Array.isArray(next)) {
    return { code: "invalid_next", message: "outcome.next must be an object" };
  }
  const status = (next as { status?: unknown }).status;
  switch (status) {
    case "continue":
      return null;
    case "await_event": {
      const wake = (next as { wake?: unknown }).wake;
      if (wake === null || typeof wake !== "object" || Array.isArray(wake)) {
        return { code: "invalid_wake", message: "await_event requires a wake condition" };
      }
      const issues = wakeConditionIssues(wake as never);
      if (issues.length > 0) {
        return { code: "invalid_wake", message: issues.map((i) => `${i.path}: ${i.message}`).join("; ") };
      }
      return null;
    }
    case "await_resumption": {
      const resumptionId = (next as { resumptionId?: unknown }).resumptionId;
      if (!isControllerResumptionId(resumptionId)) {
        return { code: "invalid_resumption", message: "await_resumption requires a controller resumption id" };
      }
      return null;
    }
    case "complete": {
      const result = (next as { result?: unknown }).result;
      if (result === undefined) return null;
      if (result === null || typeof result !== "object" || Array.isArray(result) || !("value" in result)) {
        return { code: "invalid_result", message: "complete.result must be { value } or be omitted" };
      }
      const issues = jsonIssues((result as { value: unknown }).value, "result.value");
      if (issues.length > 0) {
        return { code: "invalid_result", message: issues.map((i) => `${i.path}: ${i.message}`).join("; ") };
      }
      return null;
    }
    case "fail": {
      const failure = (next as { failure?: unknown }).failure;
      if (failure === null || typeof failure !== "object" || Array.isArray(failure)) {
        return { code: "invalid_failure", message: "fail requires a failure object" };
      }
      const { code, message } = failure as { code?: unknown; message?: unknown };
      if (typeof code !== "string" || code.length === 0 || typeof message !== "string") {
        return { code: "invalid_failure", message: "failure requires a non-empty code and a message" };
      }
      return null;
    }
    default:
      return {
        code: "invalid_next",
        message: `unknown next.status ${JSON.stringify(status)}; a controller reports semantic progress, it does not set a lifecycle state`,
      };
  }
}

/**
 * Checks a controller reply before any of it is persisted.
 *
 * `kind` is the Execution's kind, taken from the pinned definition - not from anything the
 * controller said - so a controller cannot relabel whose progress it is writing.
 */
export function validateActivationOutcome(outcome: unknown, kind: DefinitionKind): OutcomeValidation {
  if (outcome === null || typeof outcome !== "object" || Array.isArray(outcome)) {
    return reject("malformed_outcome", "controller must return an ActivationOutcome object");
  }
  const candidate = outcome as { control?: unknown; emissions?: unknown; next?: unknown };

  const control = candidate.control;
  if (control === null || typeof control !== "object" || Array.isArray(control)) {
    return reject("invalid_progress", "outcome.control must be a tagged controller progress object");
  }
  const controlKind = (control as { kind?: unknown }).kind;
  if (controlKind !== kind) {
    return reject(
      "wrong_control_kind",
      `outcome.control.kind ${JSON.stringify(controlKind)} does not match the Execution kind ${JSON.stringify(kind)}`,
    );
  }
  const progress = (control as { progress?: unknown }).progress;
  if (!isJsonObject(progress)) {
    return reject("invalid_progress", "outcome.control.progress must be a serializable JSON object");
  }

  const emissions = candidate.emissions;
  if (emissions !== undefined) {
    if (!Array.isArray(emissions)) {
      return reject("invalid_emission", "outcome.emissions must be an array when present");
    }
    for (const [index, emission] of emissions.entries()) {
      if (emission === null || typeof emission !== "object" || Array.isArray(emission)) {
        return reject("invalid_emission", `emissions[${index}] must be an object`);
      }
      const bodyIssues = emissionBodyIssues((emission as { body?: unknown }).body, `emissions[${index}].body`);
      if (bodyIssues.length > 0) {
        return reject("invalid_emission", bodyIssues.map((i) => `${i.path}: ${i.message}`).join("; "));
      }
      const serialization = jsonIssues((emission as { body?: unknown }).body, `emissions[${index}].body`);
      if (serialization.length > 0) {
        return reject("invalid_emission", serialization.map((i) => `${i.path}: ${i.message}`).join("; "));
      }
    }
  }

  const nextRejection = validateNext(candidate.next);
  if (nextRejection) return { ok: false, rejection: nextRejection };

  const effects = (candidate as { effects?: unknown }).effects;
  if (effects !== undefined) {
    if (!Array.isArray(effects)) {
      return reject("invalid_effect", "outcome.effects must be an array when present");
    }
    for (const [index, proposal] of effects.entries()) {
      const proposalIssues = effectProposalIssues(proposal, `effects[${index}]`);
      if (proposalIssues.length > 0) {
        return reject("invalid_effect", proposalIssues.map((i) => `${i.path}: ${i.message}`).join("; "));
      }
    }
    // An Execution that is finishing must not be launching work whose result nothing will observe.
    // The alternative - dispatching and discarding the outcome - would make a consequential action
    // happen with no record of anyone having seen it.
    const status = (candidate.next as { status?: unknown }).status;
    if (effects.length > 0 && (status === "complete" || status === "fail")) {
      return reject(
        "invalid_effect",
        `an Activation reporting "${String(status)}" cannot also propose Effects; their results could never be observed`,
      );
    }
    // v0.4 suspends exclusively on a controller-local resumption: while one is outstanding no Event
    // produces an Activation. An Effect proposed alongside it would leave its result Event sitting
    // in the mailbox with nothing waiting on it, which is a lost wake dressed up as a feature.
    if (effects.length > 0 && status === "await_resumption") {
      return reject(
        "invalid_effect",
        "an Activation suspending on controller-local work cannot also propose Effects; nothing would be waiting on their results",
      );
    }
    const keys = (effects as readonly EffectProposal[])
      .map((proposal) => proposal.requestKey)
      .filter((key): key is string => key !== undefined);
    if (new Set(keys).size !== keys.length) {
      return reject("invalid_effect", "two Effects in one Activation share a request key, so their results would be indistinguishable");
    }
  }

  return {
    ok: true,
    outcome: {
      control: control as ControllerProgress,
      emissions: (emissions as readonly EmissionProposal[] | undefined) ?? [],
      effects: (effects as readonly EffectProposal[] | undefined) ?? [],
      next: candidate.next as ControllerNext,
    },
  };
}

function deepFreeze<T>(value: T, seen = new Set<object>()): T {
  if (value === null || typeof value !== "object") return value;
  const object = value as unknown as object;
  if (seen.has(object)) return value;
  seen.add(object);
  for (const child of Object.values(object as Record<string, unknown>)) deepFreeze(child, seen);
  return Object.freeze(value);
}

/**
 * Builds the controller's input and freezes it.
 *
 * Freezing is not paranoia about buggy controllers so much as a statement of ownership: the
 * Execution record is the runtime's truth, and a controller changes it by *reporting an outcome*,
 * never by writing through a reference it was handed.
 */
export function buildActivationInput(input: {
  readonly execution: ExecutionView;
  readonly definition: ExecutionDefinition;
  readonly events: readonly DeliveredEvent[];
  readonly activation: ActivationInput["activation"];
}): ActivationInput {
  return deepFreeze({
    execution: structuredClone(input.execution) as ExecutionView,
    definition: structuredClone(input.definition) as ExecutionDefinition,
    events: structuredClone(input.events) as readonly DeliveredEvent[],
    activation: structuredClone(input.activation) as ActivationInput["activation"],
  });
}
