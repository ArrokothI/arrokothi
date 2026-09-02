/**
 * The reference AgentExecutor: one model call, one semantic answer.
 *
 * Everything about this file is about what it does *not* do. It builds a provider request from the
 * compiled information and the projection it was handed, calls the provider that resolution named,
 * and translates the reply into a semantic outcome. When the model selects an operation, that
 * selection is *returned*, as data, in the model's own vocabulary. The executor does not resolve
 * the name to an operation identity, does not build an Effect, does not consult a catalog, and has
 * nothing here it could dispatch with even if it wanted to.
 *
 * ```text
 * provider says   search_docs { q: "..." }
 * executor returns  { kind: "call_operations", calls: [{ alias: "search_docs", input: {...} }] }
 * controller       resolves "search_docs" through the exact projection it showed this call
 * Harness          authorizes the concrete request and decides what actually happens
 * ```
 *
 * It holds a `ModelProviderLookup` and nothing else. Model *resolution* stays with the controller,
 * so an executor cannot perform application routing; provider *invocation* lives here, so the
 * controller never holds a provider client. Swapping the deployment behind a logical model changes
 * which provider answers and changes nothing about the operation identity that results.
 */

import { ModelInvocationError } from "../model/errors.ts";
import type { ModelMessage, ModelProviderRequest, ModelProviderResponse } from "../model/types.ts";
import type {
  AgentExecutor,
  AgentExecutorRequest,
  AgentExecutorStepResult,
  AgentModelInvocationMetadata,
  ModelActionCall,
} from "../ports/agent-executor.ts";
import type { ModelProviderLookup } from "../ports/model-provider.ts";

export interface ReferenceAgentExecutorOptions {
  readonly providers: ModelProviderLookup;
  /** Reported to the provider as the reason for the call. Diagnostics, never semantics. */
  readonly purpose?: string;
}

function messagesFor(request: AgentExecutorRequest): readonly ModelMessage[] {
  return request.information.messages;
}

/**
 * What the provider reported about the call, kept truthfully.
 *
 * Only what was actually there: a provider that returns no usage produces no `usage` field, rather
 * than zeros that would read as "it used nothing". None of this is semantic - the controller never
 * sees it as an outcome - but discarding it here is what would make an evaluation deployment unable
 * to reconstruct the invocation at all, since nothing downstream ever sees the provider response.
 */
function metadataOf(response: ModelProviderResponse, latencyMs: number): AgentModelInvocationMetadata {
  return {
    provider: response.metadata.provider,
    model: response.metadata.model,
    ...(response.metadata.usage !== undefined ? { usage: response.metadata.usage } : {}),
    ...(response.metadata.finishReason !== undefined ? { finishReason: response.metadata.finishReason } : {}),
    ...(response.diagnostics?.provider !== undefined ? { diagnostics: response.diagnostics.provider } : {}),
    latencyMs,
  };
}

export function createReferenceAgentExecutor(options: ReferenceAgentExecutorOptions): AgentExecutor {
  return {
    async step(request: AgentExecutorRequest): Promise<AgentExecutorStepResult> {
      // Refused explicitly rather than by quietly sending no operations. An Agent whose exposed
      // operations vanished because the deployment model cannot receive them would look like a
      // model that simply chose not to use any.
      if (request.capabilities.length > 0 && !request.model.portableFeatures.capabilityCalls) {
        return {
          outcome: {
            kind: "fail",
            code: "model_cannot_receive_actions",
            message:
              `logical model "${request.model.logicalRef}" resolved to ${request.model.provider}/${request.model.model}, ` +
              `which cannot receive action calls, but this step exposes ${request.capabilities.length}`,
          },
        };
      }

      const provider = options.providers.providerFor(request.model);
      const providerRequest: ModelProviderRequest = {
        model: request.model,
        requirements: request.requirements,
        system: request.information.system,
        messages: messagesFor(request),
        ...(request.capabilities.length > 0 ? { capabilities: request.capabilities } : {}),
        purpose: options.purpose ?? `agent:step${request.step}`,
      };

      // Measured around the provider call and nowhere wider, so it means one round trip rather
      // than "how long the Activation took".
      const startedAt = Date.now();
      let response;
      try {
        response = await provider.generate(providerRequest);
      } catch (error) {
        // A provider rejection is a step failure, not a runtime one, and it reads identically
        // whether the call settled inside its Activation or an hour later.
        const failure = {
          code: error instanceof ModelInvocationError ? `model_${error.code}` : "model_invocation_failed",
          message: error instanceof Error ? error.message : String(error),
        };
        return {
          outcome: { kind: "fail", ...failure },
          metadata: { latencyMs: Date.now() - startedAt, failure },
        };
      }
      const metadata = metadataOf(response, Date.now() - startedAt);

      const returned = response.output.capabilityCalls ?? [];
      const text = typeof response.output.text === "string" ? response.output.text : "";

      if (returned.length > 0) {
        if (returned.length > request.limits.maxOperationCallsPerStep) {
          return {
            outcome: {
              kind: "fail",
              code: "agent_action_fanout_exceeded",
              message:
                `this step requested ${returned.length} actions; at most ${request.limits.maxOperationCallsPerStep} are permitted`,
            },
            metadata,
          };
        }
        const calls: ModelActionCall[] = returned.map((call) => ({
          callId: call.id ?? null,
          // The provider's string, carried verbatim. Whether it means anything is the controller's
          // question, answered against the projection this call was shown and against nothing else.
          alias: call.capability,
          input: call.input,
        }));
        return { outcome: { kind: "call_operations", calls, ...(text.length > 0 ? { text } : {}) }, metadata };
      }

      if (text.length > 0) return { outcome: { kind: "respond", text }, metadata };

      return {
        outcome: {
          kind: "fail",
          code: "agent_empty_model_output",
          message: "the model returned neither text nor an operation selection",
        },
        metadata,
      };
    },
  };
}
