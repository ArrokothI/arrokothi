/**
 * Shared wiring for the Agent conformance cases.
 *
 * Everything here is deliberately explicit about which side of the boundary a collaborator lands
 * on. The catalog and the exposure resolver are descriptive/derivational and reach the controller;
 * policy, the capability implementation, and the store reach the Harness. A helper that blurred
 * that would make several of these cases pass for the wrong reason.
 */

import type {
  AgentSpecInput,
  AgentDefinition,
  ObjectSchema,
  OperationRef,
} from "@agent-sdk/core/execution";
import { defineAgent } from "@agent-sdk/core/execution";
import type {
  AgentExecutor,
  AgentExecutorOutcome,
  AgentExecutorRequest,
  AgentExecutorStepResult,
  AgentModelInvocationMetadata,
  CapabilityCatalog,
} from "@agent-sdk/core/ports";
import { createCapabilityCatalog, portableModelFeatures, StaticModelResolver } from "@agent-sdk/core/reference";

export const SEARCH_INPUT: ObjectSchema = {
  kind: "object",
  fields: { query: { required: true, schema: { kind: "string" } } },
};

export const SEND_INPUT: ObjectSchema = {
  kind: "object",
  fields: { to: { required: true, schema: { kind: "string" } }, body: { required: true, schema: { kind: "string" } } },
};

export const DOCS_SEARCH: OperationRef = { capability: "docs", operation: "search" };
export const MAIL_SEND: OperationRef = { capability: "mail", operation: "send" };
export const LEDGER_POST: OperationRef = { capability: "ledger", operation: "post" };

/**
 * The descriptive source of operation truth.
 *
 * `ledger.post` deliberately carries no description or input schema: an operation the catalog
 * cannot describe to a model is not projectable, and the resolver has to say so rather than expose
 * a nameless tool.
 */
export function testCatalog(): CapabilityCatalog {
  return createCapabilityCatalog([
    {
      capability: "docs",
      operation: "search",
      consequential: false,
      title: "Search documents",
      description: "Search the project corpus and return matching passages.",
      input: SEARCH_INPUT,
      groups: ["research"],
    },
    {
      capability: "mail",
      operation: "send",
      consequential: true,
      title: "Send mail",
      description: "Send an email to one recipient.",
      input: SEND_INPUT,
      groups: ["outreach"],
    },
    {
      capability: "ledger",
      operation: "post",
      consequential: true,
      groups: ["finance"],
    },
  ]);
}

export function testModelResolver(provider = "test", model = "model-a"): StaticModelResolver {
  return new StaticModelResolver({
    primary: {
      provider,
      model,
      portableFeatures: portableModelFeatures({ capabilityCalls: true }),
    },
  });
}

export interface AgentDefinitionInput {
  readonly id: string;
  readonly operations?: AgentSpecInput["operations"];
  readonly limits?: AgentSpecInput["limits"];
  readonly completion?: AgentSpecInput["completion"];
  readonly instructions?: string;
  readonly terminalResult?: AgentDefinition["terminalResult"];
}

export function testAgent(input: AgentDefinitionInput): AgentDefinition {
  return defineAgent({
    id: input.id,
    ...(input.terminalResult !== undefined ? { terminalResult: input.terminalResult } : {}),
    spec: {
      model: { logicalRef: "primary", requirements: { text: true, capabilityCalls: "required" } },
      instructions: input.instructions ?? "Use the operations you were given, then answer.",
      ...(input.operations !== undefined ? { operations: input.operations } : {}),
      ...(input.limits !== undefined ? { limits: input.limits } : {}),
      ...(input.completion !== undefined ? { completion: input.completion } : {}),
    },
  });
}

export interface ScriptedAgentExecutor extends AgentExecutor {
  /** Every request this executor received, in order. */
  readonly requests: readonly AgentExecutorRequest[];
}

/**
 * An executor that answers from a script.
 *
 * It exists so a case can put an exact semantic outcome in front of the controller - including one
 * a real provider could not produce, such as a name the projection never exposed - and observe what
 * the controller does with it. Optional per-step metadata lets a case put provider evidence in front
 * of the trace without a provider.
 */
export function scriptedAgentExecutor(
  outcomes: readonly AgentExecutorOutcome[],
  metadata: readonly (AgentModelInvocationMetadata | undefined)[] = [],
): ScriptedAgentExecutor {
  const requests: AgentExecutorRequest[] = [];
  let cursor = 0;
  return {
    requests,
    step(request: AgentExecutorRequest): AgentExecutorStepResult {
      requests.push(request);
      const outcome = outcomes[cursor];
      const evidence = metadata[cursor];
      cursor += 1;
      return {
        outcome: outcome ?? { kind: "fail", code: "script_exhausted", message: `no scripted outcome ${cursor}` },
        ...(evidence !== undefined ? { metadata: evidence } : {}),
      };
    },
  };
}
