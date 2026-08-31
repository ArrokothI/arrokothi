/**
 * The Function Stage execution boundary.
 *
 * A Stage is a semantic Workflow boundary, not a mini-Execution, and this context is where that
 * claim is either true or a slogan. Read it as a list of absences:
 *
 * ```text
 * no stage.executionId          no stage.lifecycle
 * no stage.mailbox              no stage.ownerExecutionId
 * no stage.authorityEnvelope    no stage.cancel()
 * ```
 *
 * There is also no `CapabilityExecutor`, no `EffectAuthorizer`, no `RuntimeStore`, no scheduler, no
 * Harness, no `settleEffect`, and no lifecycle setter. A Function Stage implementation is trusted
 * *application* code, so this is not a containment boundary - a host process can always bypass the
 * SDK at the OS level, and the trusted-local profile says so plainly. What it is, is an honest
 * statement of ownership: a Stage computes and *proposes*; the enclosing Workflow Execution owns the
 * Effects, and the Harness owns everything operational.
 *
 * Effect requests therefore leave Stage logic the same way controller Effects leave a controller -
 * as returned data. `FunctionStageOutcome.awaitEffects` is a list of requests, not a call.
 *
 * The Stage may:
 *   parse, validate, rank, merge, compute
 *   inspect explicitly exposed local materialized resources
 *   propose Effects through returned data
 *
 * It may not, and structurally cannot:
 *   call a CapabilityExecutor, write the RuntimeStore, set a lifecycle, settle an Effect,
 *   or open a resource its Stage definition did not expose
 */

import type { JsonObject } from "../util/json.ts";
import type { EmissionProposal } from "../execution/emission.ts";
import type { StageDefinition, StageId } from "../workflow/spec.ts";
import type { StageCapabilityRequest, StageObservation } from "../workflow/observations.ts";
import type { StageResult } from "../workflow/stage-result.ts";
import type { LocalResourceView } from "./local-resource.ts";

/** Activation facts a Stage may legitimately react to. Data, mirroring the controller port. */
export interface StageActivationFacts {
  readonly cancelled: boolean;
  readonly cancellationReason: string | null;
  /** ISO timestamp after which the Stage should stop starting new local work. */
  readonly deadline: string | null;
}

/**
 * What Stage-local computation receives.
 *
 * `visit` and `stageId` are topology bookkeeping, not runtime identity: nothing is addressed to
 * them, nothing waits on them, and no lifecycle attaches to them.
 */
export interface StageExecutionContext {
  /** The pinned Stage definition, frozen. */
  readonly stage: StageDefinition;
  readonly stageId: StageId;
  /** Which invocation of this Stage is running. Workflow controller progress. */
  readonly visit: number;
  /** What this Stage was given, after input Adapters ran. */
  readonly input: StageResult;
  /** Authored configuration from the Stage definition. */
  readonly config: JsonObject;
  /** Stage-local progress across Activations. Serializable; returned to the controller to persist. */
  readonly progress: JsonObject;
  /**
   * Results of the required operations this Stage most recently asked for.
   *
   * Settled does not mean successful - read `outcome` before reading `observation`. Each round of
   * required operations replaces the previous set, so a Stage that needs an earlier observation
   * again should record the relevant fact in `progress` rather than expecting it to persist here.
   */
  readonly observations: readonly StageObservation[];
  /** Explicitly exposed read-only local resource views. Anything else is unreachable. */
  readonly resources: LocalResourceView;
  readonly activation: StageActivationFacts;
}

export type FunctionStageOutcome =
  /**
   * The Stage body is done. `transition` names one of the Stage's predefined labels; the controller
   * resolves it against the declared graph and rejects anything undeclared.
   */
  | {
      readonly status: "completed";
      readonly result: StageResult;
      readonly transition?: string;
      readonly progress?: JsonObject;
      readonly emissions?: readonly EmissionProposal[];
    }
  /**
   * The Stage requires these operations before it can complete.
   *
   * The controller records them as barrier entries, returns them upward as Effect proposals, and
   * re-enters this Stage - same visit, same progress - once every one of them has settled.
   */
  | {
      readonly status: "awaitEffects";
      readonly effects: readonly StageCapabilityRequest[];
      readonly progress?: JsonObject;
      readonly emissions?: readonly EmissionProposal[];
    }
  /** Semantic Stage failure. The controller proposes Workflow failure; the Harness records it. */
  | { readonly status: "failed"; readonly code: string; readonly message: string };

export interface FunctionStageImplementation {
  readonly ref: string;
  run(context: StageExecutionContext): FunctionStageOutcome | Promise<FunctionStageOutcome>;
}

/**
 * Where a Function Stage's logical implementation ref is resolved.
 *
 * ```text
 * FunctionStageDefinition
 *   implementationRef = "parse-document"
 *
 * application wiring
 *   "parse-document" -> trusted FunctionStage implementation
 * ```
 *
 * A serializable Workflow definition cannot embed an executable function, so the definition carries
 * the name and the application carries the code. An unknown ref fails the Workflow explicitly; it is
 * never treated as a Stage that does nothing.
 */
export interface FunctionStageRegistry {
  resolve(ref: string): FunctionStageImplementation | undefined;
}

export const emptyFunctionStageRegistry: FunctionStageRegistry = {
  resolve() {
    return undefined;
  },
};

export function functionStageOutcomeIssues(
  outcome: unknown,
  path = "stageOutcome",
): readonly { path: string; message: string }[] {
  if (outcome === null || typeof outcome !== "object" || Array.isArray(outcome)) {
    return [{ path, message: "expected a Function Stage outcome object" }];
  }
  const candidate = outcome as Record<string, unknown>;
  switch (candidate["status"]) {
    case "completed": {
      const issues: { path: string; message: string }[] = [];
      const result = candidate["result"];
      if (result !== null && typeof result !== "string") {
        issues.push({ path: `${path}.result`, message: "a Stage result is text or none" });
      }
      const transition = candidate["transition"];
      if (transition !== undefined && (typeof transition !== "string" || transition.length === 0)) {
        issues.push({ path: `${path}.transition`, message: "expected a predefined transition label when present" });
      }
      return issues;
    }
    case "awaitEffects": {
      const effects = candidate["effects"];
      if (!Array.isArray(effects) || effects.length === 0) {
        return [{ path: `${path}.effects`, message: "awaiting effects requires at least one request" }];
      }
      const issues: { path: string; message: string }[] = [];
      const keys = new Set<string>();
      for (const [index, request] of effects.entries()) {
        if (request === null || typeof request !== "object" || Array.isArray(request)) {
          issues.push({ path: `${path}.effects[${index}]`, message: "expected a capability request object" });
          continue;
        }
        const described = request as Record<string, unknown>;
        const key = described["key"];
        if (typeof key !== "string" || key.length === 0) {
          issues.push({ path: `${path}.effects[${index}].key`, message: "expected a Stage-local request key" });
        } else if (keys.has(key)) {
          // Two requests sharing a key in one visit would produce one correlation for two
          // operations, and their results would be indistinguishable at the barrier.
          issues.push({ path: `${path}.effects[${index}].key`, message: `request key "${key}" is used twice in one Stage visit` });
        } else {
          keys.add(key);
        }
        for (const field of ["capability", "operation"] as const) {
          if (typeof described[field] !== "string" || (described[field] as string).length === 0) {
            issues.push({ path: `${path}.effects[${index}].${field}`, message: `expected a logical ${field} name` });
          }
        }
      }
      return issues;
    }
    case "failed":
      return typeof candidate["code"] === "string" && (candidate["code"] as string).length > 0 && typeof candidate["message"] === "string"
        ? []
        : [{ path, message: "a Stage failure states a non-empty code and a message" }];
    default:
      return [{ path: `${path}.status`, message: `expected "completed", "awaitEffects", or "failed"` }];
  }
}
