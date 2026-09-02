/**
 * The AgentExecutor boundary: semantic outcomes in, nothing operational out.
 *
 * An executor turns compiled information plus one immutable callable namespace (assembled from an
 * authority-governed action projection and a controller-local model-control projection) into a
 * semantic decision. It is where a provider call, or a whole third-party agent framework, is
 * allowed to live. It is not where anything happens to the world.
 *
 * Read the request shape as a list of what an executor is *not* handed:
 *
 * ```text
 * no Effect requester        no runtime store          no lifecycle mutator
 * no capability dispatcher   no scheduler              no settlement entry point
 * no authorization decision  no Harness                no mutable authority
 * no protocol or HTTP client
 * ```
 *
 * The consequence is the one that matters. When a model selects a callable, the executor can only
 * *report* that selection; it cannot carry it out. The Agent controller resolves the reported name
 * against the same persisted snapshots, and then either proposes an ordinary typed Effect (an
 * authority-governed action, which the Harness authorizes) or applies a controller-local model
 * control to its own state (no Effect at all). A framework with a native tool loop therefore cannot
 * become an alternate gateway - there is nothing in this contract for such a loop to call.
 *
 * Everything crossing this boundary is plain JSON, in both directions. That is what lets one
 * invocation outlive its Activation: the outcome is stored and replayed, and an executor that
 * needs to carry framework state between steps returns it as `continuation` - opaque data the
 * kernel stores and hands back, never a live object.
 */

import type { ModelCapabilitySpec, ModelRequirements, ModelUsage, ResolvedModel } from "../model/types.ts";
import type { LocalModelControlProjection } from "../operations/local-model-control.ts";
import type { ModelActionProjection } from "../operations/projection.ts";
import type { AgentInformationContext } from "../agent/information-context.ts";
import type { AgentModelObservation } from "../agent/observation-projection.ts";
import type { JsonObject, JsonValue } from "../util/json.ts";

export type { AgentInformationContext };

export interface AgentExecutorLimits {
  readonly maxOperationCallsPerStep: number;
}

export interface AgentExecutorRequest {
  /** Already resolved by the controller; an executor performs no application routing. */
  readonly model: ResolvedModel;
  readonly requirements: ModelRequirements;
  readonly information: AgentInformationContext;
  /**
   * The immutable authority-governed model-action snapshot this call is being shown.
   *
   * Provenance for an executor that wants it; the controller resolves the answer against the
   * combined callable namespace, not this field alone.
   */
  readonly projection: ModelActionProjection;
  /**
   * The immutable controller-local model-control snapshot this call is being shown.
   *
   * A separate category from `projection` - it carries no authority. Present so an executor that
   * inspects provenance can distinguish a local control (`working_notes_set`) from an
   * authority-governed action; both still appear in `capabilities` as one flat namespace.
   */
  readonly localControls: LocalModelControlProjection;
  /**
   * The one provider-facing callable namespace: names, descriptions, input schemas, assembled from
   * both snapshots above. Provenance is not sent to the provider; the controller keeps it.
   */
  readonly capabilities: readonly ModelCapabilitySpec[];
  /**
   * Results of the actions the previous step requested, already projected for a model.
   *
   * The semantic observations were shaped by the controller's observation projector before they got
   * here, so an executor renders nothing itself: it forwards what the strategy decided the model
   * should read. Correlated by the call ids the previous step emitted.
   */
  readonly observations: readonly AgentModelObservation[];
  /** 1-based Agent step. Persisted controller progress, never a runtime identity. */
  readonly step: number;
  readonly limits: AgentExecutorLimits;
  /** Whatever this executor returned last time. Opaque JSON; the kernel never inspects it. */
  readonly continuation: JsonValue | null;
}

/** One action the model selected, named in the vocabulary the projection gave it. */
export interface ModelActionCall {
  /** The provider's own correlation for this call, when it supplied one. */
  readonly callId: string | null;
  /** A model-facing name. Resolved by the controller against the projection, or by nothing at all. */
  readonly alias: string;
  readonly input: JsonObject;
}

export type AgentExecutorOutcome =
  /** The model produced text. Communication, which is not by itself terminal completion. */
  | { readonly kind: "respond"; readonly text: string; readonly continuation?: JsonValue }
  /** The model selected provider-callable actions. Data: nothing has been dispatched and nothing will be here. */
  | {
      readonly kind: "call_operations";
      readonly calls: readonly ModelActionCall[];
      readonly text?: string;
      readonly continuation?: JsonValue;
    }
  /** Local progress with nothing to report yet; the controller may run another step. */
  | { readonly kind: "continue"; readonly continuation?: JsonValue }
  /** The model is done. The controller decides whether the definition permits completing on it. */
  | { readonly kind: "stop"; readonly text?: string; readonly continuation?: JsonValue }
  /** This step cannot produce a semantic answer. Distinct from one action failing. */
  | { readonly kind: "fail"; readonly code: string; readonly message: string };

/**
 * Non-semantic facts about one provider round trip.
 *
 * Everything here is evidence, not meaning. Controller behaviour depends on the semantic outcome and
 * on nothing in this record: it grants no authority, becomes no Effect, produces no Event, and is
 * never folded into the transcript. It exists because usage, finish reason, and normalized provider
 * diagnostics are exactly what an evaluation or debug deployment needs and exactly what the first
 * implementation threw away before any observer could see it.
 *
 * Plain JSON, because it crosses the same resumption boundary the outcome does - so a slow
 * invocation reports the same facts a fast one did. Every field is optional and every field is
 * *truthful*: a provider that reports no usage produces no usage here. Nothing is invented to
 * satisfy a type.
 */
export interface AgentModelInvocationMetadata {
  /** Provider-reported provider id, which may differ from the one resolution named. */
  readonly provider?: string;
  /** Provider-reported concrete model/version, often more specific than the requested id. */
  readonly model?: string;
  readonly usage?: ModelUsage;
  readonly finishReason?: string;
  /** Provider-specific debug data, normalized to JSON. Not an Agent observation. */
  readonly diagnostics?: JsonObject;
  /** Wall-clock around the provider call, when the executor can measure it cleanly. */
  readonly latencyMs?: number;
  /** How a provider rejection was normalized, for a step that failed before producing output. */
  readonly failure?: { readonly code: string; readonly message: string };
}

/**
 * What one executor step returns.
 *
 * Split deliberately. `outcome` is the semantic answer and the only thing the controller acts on;
 * `metadata` is evidence an observer may record and nothing may decide on. Returning them as one
 * flat object would have made it possible - eventually inevitable - for a controller to branch on a
 * finish reason.
 */
export interface AgentExecutorStepResult {
  readonly outcome: AgentExecutorOutcome;
  readonly metadata?: AgentModelInvocationMetadata;
}

export interface AgentExecutorIssue {
  readonly path: string;
  readonly message: string;
}

/** Structural validation of an executor reply, before the controller acts on any of it. */
export function agentExecutorOutcomeIssues(outcome: unknown, path = "outcome"): readonly AgentExecutorIssue[] {
  if (outcome === null || typeof outcome !== "object" || Array.isArray(outcome)) {
    return [{ path, message: "expected an executor outcome object" }];
  }
  const candidate = outcome as Record<string, unknown>;
  const kind = candidate["kind"];
  switch (kind) {
    case "respond":
      return typeof candidate["text"] === "string"
        ? []
        : [{ path: `${path}.text`, message: "a response must carry text" }];
    case "continue":
      return [];
    case "stop":
      return candidate["text"] === undefined || typeof candidate["text"] === "string"
        ? []
        : [{ path: `${path}.text`, message: "expected text or nothing" }];
    case "fail": {
      const issues: AgentExecutorIssue[] = [];
      if (typeof candidate["code"] !== "string" || (candidate["code"] as string).length === 0) {
        issues.push({ path: `${path}.code`, message: "a failure needs a non-empty code" });
      }
      if (typeof candidate["message"] !== "string") {
        issues.push({ path: `${path}.message`, message: "a failure needs a message" });
      }
      return issues;
    }
    case "call_operations": {
      const calls = candidate["calls"];
      if (!Array.isArray(calls) || calls.length === 0) {
        return [{ path: `${path}.calls`, message: "expected at least one selected action" }];
      }
      const issues: AgentExecutorIssue[] = [];
      calls.forEach((call, index) => {
        const at = `${path}.calls[${index}]`;
        if (call === null || typeof call !== "object" || Array.isArray(call)) {
          issues.push({ path: at, message: "expected an action call object" });
          return;
        }
        const value = call as Record<string, unknown>;
        if (typeof value["alias"] !== "string" || (value["alias"] as string).length === 0) {
          issues.push({ path: `${at}.alias`, message: "expected the model-facing name the model returned" });
        }
        const input = value["input"];
        if (input === null || typeof input !== "object" || Array.isArray(input)) {
          issues.push({ path: `${at}.input`, message: "expected a JSON object of arguments" });
        }
        const callId = value["callId"];
        if (callId !== null && callId !== undefined && typeof callId !== "string") {
          issues.push({ path: `${at}.callId`, message: "expected a string correlation or null" });
        }
      });
      return issues;
    }
    default:
      return [{ path: `${path}.kind`, message: `unknown executor outcome ${JSON.stringify(kind)}` }];
  }
}

/** Structural validation of a whole step result, before the controller acts on any of it. */
export function agentExecutorStepResultIssues(result: unknown, path = "result"): readonly AgentExecutorIssue[] {
  if (result === null || typeof result !== "object" || Array.isArray(result)) {
    return [{ path, message: "expected an executor step result object" }];
  }
  const candidate = result as Record<string, unknown>;
  const issues = [...agentExecutorOutcomeIssues(candidate["outcome"], `${path}.outcome`)];
  const metadata = candidate["metadata"];
  if (metadata !== undefined && (metadata === null || typeof metadata !== "object" || Array.isArray(metadata))) {
    issues.push({ path: `${path}.metadata`, message: "expected invocation metadata or nothing" });
  }
  return issues;
}

export interface AgentExecutor {
  /**
   * Runs one bounded semantic step.
   *
   * One step, not a loop to completion: how far an Agent progresses is the controller's decision
   * and the Harness's budget, and an executor that ran until it felt finished would have taken
   * both.
   */
  step(request: AgentExecutorRequest): Promise<AgentExecutorStepResult> | AgentExecutorStepResult;
}
