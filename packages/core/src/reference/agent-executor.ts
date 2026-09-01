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
import type { ModelMessage, ModelProviderRequest } from "../model/types.ts";
import type { AgentExecutor, AgentExecutorOutcome, AgentExecutorRequest, ModelOperationCall } from "../ports/agent-executor.ts";
import type { ModelProviderLookup } from "../ports/model-provider.ts";

export interface ReferenceAgentExecutorOptions {
  readonly providers: ModelProviderLookup;
  /** Reported to the provider as the reason for the call. Diagnostics, never semantics. */
  readonly purpose?: string;
}

function messagesFor(request: AgentExecutorRequest): readonly ModelMessage[] {
  return request.information.messages;
}

export function createReferenceAgentExecutor(options: ReferenceAgentExecutorOptions): AgentExecutor {
  return {
    async step(request: AgentExecutorRequest): Promise<AgentExecutorOutcome> {
      // Refused explicitly rather than by quietly sending no operations. An Agent whose exposed
      // operations vanished because the deployment model cannot receive them would look like a
      // model that simply chose not to use any.
      if (request.capabilities.length > 0 && !request.model.portableFeatures.capabilityCalls) {
        return {
          kind: "fail",
          code: "model_cannot_receive_operations",
          message:
            `logical model "${request.model.logicalRef}" resolved to ${request.model.provider}/${request.model.model}, ` +
            `which cannot receive operation calls, but this step exposes ${request.capabilities.length}`,
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

      let response;
      try {
        response = await provider.generate(providerRequest);
      } catch (error) {
        // A provider rejection is a step failure, not a runtime one, and it reads identically
        // whether the call settled inside its Activation or an hour later.
        return {
          kind: "fail",
          code: error instanceof ModelInvocationError ? `model_${error.code}` : "model_invocation_failed",
          message: error instanceof Error ? error.message : String(error),
        };
      }

      const returned = response.output.capabilityCalls ?? [];
      const text = typeof response.output.text === "string" ? response.output.text : "";

      if (returned.length > 0) {
        if (returned.length > request.limits.maxOperationCallsPerStep) {
          return {
            kind: "fail",
            code: "agent_operation_fanout_exceeded",
            message:
              `this step requested ${returned.length} operations; at most ${request.limits.maxOperationCallsPerStep} are permitted`,
          };
        }
        const calls: ModelOperationCall[] = returned.map((call) => ({
          callId: call.id ?? null,
          // The provider's string, carried verbatim. Whether it means anything is the controller's
          // question, answered against the projection this call was shown and against nothing else.
          alias: call.capability,
          input: call.input,
        }));
        return { kind: "call_operations", calls, ...(text.length > 0 ? { text } : {}) };
      }

      if (text.length > 0) return { kind: "respond", text };

      return {
        kind: "fail",
        code: "agent_empty_model_output",
        message: "the model returned neither text nor an operation selection",
      };
    },
  };
}
