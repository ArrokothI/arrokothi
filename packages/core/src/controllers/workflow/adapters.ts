/**
 * Running Stage Adapters.
 *
 * Adapters settle before the Stage boundary they guard: input Adapters before the Stage body sees
 * anything, output Adapters before a transition is resolved. They run in declaration order and the
 * first rejection stops the chain, because a value that has been rejected is not a value later
 * Adapters should be transforming.
 *
 * Two invariants are enforced here rather than trusted:
 *
 * **An Adapter cannot request an Effect.** Its context has no proposer, so there is nothing to
 * enforce at runtime - but `adapterResultIssues` also refuses a result that tries to name a next
 * Stage, so an implementation that reaches for topology gets an error rather than silence.
 *
 * **An LLM Adapter exposes no model-callable operations.** The request carries no `capabilities`,
 * which means the provider boundary itself (`validateModelProviderResponse`) rejects any capability
 * call that comes back - an unrequested call is invalid provider output, not an Effect the runtime
 * might consider dispatching.
 *
 * ## Resuming a chain
 *
 * An LLM Adapter's model call may outlive its Activation, so a chain is *resumable* rather than
 * restartable. `startIndex` and the incoming value together name a position in the chain, and the
 * caller persists that position before yielding. Restarting at zero would re-run Adapters that
 * already produced a value - for a function Adapter that is a duplicated computation, and for an
 * LLM Adapter it is a duplicated inference - so the chain never starts anywhere but where it
 * stopped.
 */

import type { ControllerResumptionId } from "../../execution/ids.ts";
import type { ModelMessage } from "../../model/types.ts";
import type { AdapterContext, AdapterRegistry, AdapterResult } from "../../ports/adapter.ts";
import { adapterResultIssues } from "../../ports/adapter.ts";
import type { ControllerResumptionScope } from "../../ports/controller-resumption.ts";
import type { LocalResourceView } from "../../ports/local-resource.ts";
import type { AdapterDeclaration } from "../../workflow/adapters.ts";
import { stageAdapterResumptionKey } from "../../workflow/resumption-keys.ts";
import type { StageId } from "../../workflow/spec.ts";
import type { StageResult } from "../../workflow/stage-result.ts";
import { describeStageResult } from "../../workflow/stage-result.ts";
import type { WorkflowModelAccess, WorkflowTrace } from "./model-access.ts";
import { invokeStageModelResumable } from "./model-access.ts";

export type AdapterChainOutcome =
  | { readonly status: "value"; readonly value: StageResult }
  | { readonly status: "rejected"; readonly reason: string; readonly index: number }
  | { readonly status: "failed"; readonly code: string; readonly message: string }
  /**
   * An Adapter's model call outlived this Activation.
   *
   * `index` is the Adapter that suspended and `value` is what it was given, so re-entering with
   * both re-runs exactly one Adapter - the one that never finished.
   */
  | {
      readonly status: "suspended";
      readonly resumptionId: ControllerResumptionId;
      readonly index: number;
      readonly value: StageResult;
    };

export interface AdapterChainInput {
  readonly stageId: StageId;
  readonly visit: number;
  readonly position: "input" | "output";
  readonly declarations: readonly AdapterDeclaration[];
  readonly value: StageResult;
  readonly resources: LocalResourceView;
  readonly adapters: AdapterRegistry;
  readonly models: WorkflowModelAccess | undefined;
  readonly trace: WorkflowTrace | undefined;
  readonly resumptions: ControllerResumptionScope;
  /** Where to resume. Zero for a chain that has not run yet. */
  readonly startIndex?: number;
}

function renderPrompt(template: string, value: StageResult): string {
  return template.replaceAll("{{value}}", describeStageResult(value));
}

type ApplyOutcome =
  | AdapterResult
  | { readonly kind: "error"; readonly code: string; readonly message: string }
  | { readonly kind: "suspended"; readonly resumptionId: ControllerResumptionId };

async function applyOne(
  declaration: AdapterDeclaration,
  index: number,
  context: AdapterContext,
  input: AdapterChainInput,
): Promise<ApplyOutcome> {
  if (declaration.kind === "function") {
    const implementation = input.adapters.resolve(declaration.implementationRef);
    if (!implementation) {
      return {
        kind: "error",
        code: "adapter_implementation_missing",
        message: `no adapter implementation is wired for logical ref "${declaration.implementationRef}"`,
      };
    }
    const result = await implementation.apply(context);
    const issues = adapterResultIssues(result);
    if (issues.length > 0) {
      return { kind: "error", code: "invalid_adapter_result", message: issues.map((i) => `${i.path}: ${i.message}`).join("; ") };
    }
    return result;
  }

  const messages: readonly ModelMessage[] = [{ role: "user", content: renderPrompt(declaration.prompt, context.value) }];
  const attempt = await invokeStageModelResumable(
    input.resumptions,
    stageAdapterResumptionKey(input.stageId, input.visit, input.position, index),
    input.models,
    declaration.model,
    {
      system: declaration.system,
      messages,
      purpose: `adapter:${input.position}`,
    },
  );
  if (attempt.status === "suspended") return { kind: "suspended", resumptionId: attempt.resumptionId };

  const { resolved, response } = attempt.invocation;
  input.trace?.modelInvoked?.({
    stageId: input.stageId,
    visit: input.visit,
    purpose: "adapter",
    phase: 1,
    logicalRef: declaration.model.logicalRef,
    provider: resolved.provider,
    model: resolved.model,
    ...(response.metadata.finishReason !== undefined ? { finishReason: response.metadata.finishReason } : {}),
    capabilityCallCount: response.output.capabilityCalls?.length ?? 0,
  });
  const text = response.output.text;
  if (typeof text !== "string") {
    return { kind: "error", code: "adapter_model_output_missing", message: "an LLM Adapter needs text output to transform its value" };
  }
  return { kind: "transform", value: text };
}

/**
 * Runs one Adapter chain from `startIndex` to completion, or until it suspends.
 *
 * The caller applies predefined policy to a rejection and persists the boundary position for a
 * suspension.
 */
export async function runAdapterChain(input: AdapterChainInput): Promise<AdapterChainOutcome> {
  let value = input.value;
  const from = input.startIndex ?? 0;
  for (const [index, declaration] of input.declarations.entries()) {
    // Everything before `from` already ran in an earlier Activation. Re-running it would duplicate
    // a computation or, worse, a model inference that has already been paid for and observed.
    if (index < from) continue;
    const context: AdapterContext = {
      stageId: input.stageId,
      visit: input.visit,
      position: input.position,
      value,
      config: declaration.kind === "function" ? (declaration.config ?? {}) : {},
      resources: input.resources,
    };
    let result: ApplyOutcome;
    try {
      result = await applyOne(declaration, index, context, input);
    } catch (error) {
      return {
        status: "failed",
        code: "adapter_error",
        message: error instanceof Error ? error.message : String(error),
      };
    }
    if (result.kind === "suspended") {
      return { status: "suspended", resumptionId: result.resumptionId, index, value };
    }
    if (result.kind === "error") return { status: "failed", code: result.code, message: result.message };
    if (result.kind === "reject") return { status: "rejected", reason: result.reason, index };
    if (result.kind === "transform") value = result.value;
  }
  return { status: "value", value };
}
