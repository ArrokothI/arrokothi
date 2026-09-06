/** Copyable deployment wiring. No environment reads or network work until the caller opts in. */
import { GeminiModelProvider } from "@arrokothi/provider-gemini";
import type { GeminiModelProviderOptions } from "@arrokothi/provider-gemini";
import { createStrandsAgentExecutor } from "@arrokothi/integration-strands";
import {
  ModelProviderRegistry, StaticModelResolver, createReferenceAgentExecutor, portableModelFeatures,
} from "@arrokothi/core/reference";
import type { AgentModelAccess, WorkflowModelAccess } from "@arrokothi/core";

export function geminiWiring(options: GeminiModelProviderOptions & { model: string }) {
  const provider = new GeminiModelProvider(options);
  const providers = new ModelProviderRegistry([provider]);
  const resolver = new StaticModelResolver({ primary: {
    provider: provider.id, model: options.model,
    // Deployment must verify these features for its selected model before using it live.
    portableFeatures: portableModelFeatures({ capabilityCalls: true, structuredOutput: true }),
  } });
  const agentModels: AgentModelAccess = { resolver };
  const workflowModels: WorkflowModelAccess = { resolver, providers };
  return {
    agentModels, workflowModels,
    referenceExecutor: createReferenceAgentExecutor({ providers }),
    strandsExecutor: createStrandsAgentExecutor({ providers }),
  };
}
