/**
 * How Workflow Stage logic reaches a model.
 *
 * ```text
 * LogicalModelRequest
 *     -> ModelResolver
 *     -> ResolvedModel
 *     -> ModelProviderRegistry/lookup
 *     -> ModelProvider
 * ```
 *
 * Resolution and invocation stay separate responsibilities. A Workflow definition names a *logical*
 * model and the portable features that Stage genuinely needs; deployment configuration decides which
 * concrete provider and model that means. Nothing here reads a credential, and nothing here lets a
 * definition name a provider.
 *
 * Model inference is **local computation**, not an Effect. It returns to the controller inside the
 * same Activation, it is not journaled as a PendingOperation, and it never enters a mailbox. That is
 * why a Workflow controller may hold a resolver and a provider lookup at all: they are local
 * semantic dependencies in the same sense as a Function Stage registry, not operational runtime
 * ownership. Neither can reach the Harness, the store, the scheduler, or the Effect gateway.
 *
 * Provider/model identity is *observed* through the trace sink rather than written into Workflow
 * control state. Which deployment answered a Stage is a legitimate thing to see; it is not part of
 * the Workflow's semantic progress, and raw provider payloads are not part of anything.
 */

import { ModelResolutionError } from "../../model/errors.ts";
import type {
  LogicalModelRequest,
  ModelCapabilitySpec,
  ModelMessage,
  ModelProviderResponse,
  ModelStructuredOutputRequest,
  ResolvedModel,
} from "../../model/types.ts";
import type { ModelProviderLookup } from "../../ports/model-provider.ts";
import type { ModelResolver } from "../../ports/model-resolver.ts";
import type { JsonObject } from "../../util/json.ts";
import type { StageId } from "../../workflow/spec.ts";

/**
 * The model services a WorkflowController may hold.
 *
 * Both are ports. A deployment supplies a resolver that knows its mappings and a lookup that knows
 * its implementations; core supplies neither and depends on neither.
 */
export interface WorkflowModelAccess {
  readonly resolver: ModelResolver;
  readonly providers: ModelProviderLookup;
  /** Opaque, serializable deployment/policy facts forwarded to resolution. */
  readonly policy?: JsonObject;
}

export type ModelInvocationPurpose = "stage" | "adapter";

/**
 * One model invocation, as a trace record.
 *
 * Ephemeral observation, deliberately not persisted alongside Workflow progress. It is how a
 * conformance run proves that the same definition resolved to a different deployment without the
 * definition, its digest, or its control state changing.
 */
export interface WorkflowModelInvocation {
  readonly stageId: StageId;
  readonly visit: number;
  readonly purpose: ModelInvocationPurpose;
  /** 1-based index of this predetermined phase within the Stage. */
  readonly phase: number;
  readonly logicalRef: string;
  readonly provider: string;
  readonly model: string;
  readonly finishReason?: string;
  readonly capabilityCallCount: number;
}

export interface WorkflowStageTransitionRecord {
  readonly from: StageId;
  readonly visit: number;
  readonly label: string | null;
  readonly to: StageId | "complete";
}

/** Optional local observation sink. Holding one grants nothing and persists nothing. */
export interface WorkflowTrace {
  modelInvoked?(record: WorkflowModelInvocation): void;
  stageTransitioned?(record: WorkflowStageTransitionRecord): void;
}

export interface StageModelCall {
  readonly system: string;
  readonly messages: readonly ModelMessage[];
  readonly capabilities?: readonly ModelCapabilitySpec[];
  readonly structuredOutput?: ModelStructuredOutputRequest;
  readonly purpose: string;
}

export interface StageModelInvocation {
  readonly resolved: ResolvedModel;
  readonly response: ModelProviderResponse;
}

/**
 * Resolves a logical model and invokes the provider that resolution named.
 *
 * A required feature the deployment cannot supply fails here, during resolution, *before* any
 * provider is invoked - there is no silent prompt-only fallback for a missing structured-output or
 * capability-call capability, because a Stage that declared it required cannot do its job without it.
 */
export async function invokeStageModel(
  access: WorkflowModelAccess | undefined,
  request: LogicalModelRequest,
  call: StageModelCall,
): Promise<StageModelInvocation> {
  if (!access) {
    throw new ModelResolutionError(
      "invalid_configuration",
      "this WorkflowController was wired without model access, so no LLM Stage or LLM Adapter can run",
      { logicalRef: request.logicalRef },
    );
  }
  const resolved = await access.resolver.resolve({
    logicalRef: request.logicalRef,
    requirements: request.requirements,
    ...(access.policy ? { policy: access.policy } : {}),
  });
  const provider = access.providers.providerFor(resolved);
  const response = await provider.generate({
    model: resolved,
    requirements: request.requirements,
    system: call.system,
    messages: call.messages,
    ...(call.capabilities?.length ? { capabilities: call.capabilities } : {}),
    ...(call.structuredOutput ? { structuredOutput: call.structuredOutput } : {}),
    purpose: call.purpose,
  });
  return { resolved, response };
}
