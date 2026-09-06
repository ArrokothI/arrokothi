/** Reusable conformance contract for every ModelProvider implementation. */

import { ModelInvocationError } from "../../model/errors.ts";
import type { ModelProviderRequest, ModelRequirements, ResolvedModel } from "../../model/types.ts";
import type { ModelProvider } from "../../ports/model-provider.ts";
import type { ContractCase } from "./expect.ts";
import { assertDeepEqual, assertEqual, assertTrue } from "./expect.ts";

export type ModelProviderContractScenario =
  | "text"
  | "structured"
  | "capability_call"
  | "metadata"
  | "invalid_response"
  | "diagnostics";

export interface ModelProviderContractSubject {
  readonly provider: ModelProvider;
  readonly model: ResolvedModel;
}

const STRUCTURED_SCHEMA = {
  kind: "object",
  fields: { answer: { required: true, schema: { kind: "string" } } },
} as const;

function request(
  subject: ModelProviderContractSubject,
  options: {
    requirements?: ModelRequirements;
    capability?: boolean;
    structured?: boolean;
    signal?: AbortSignal;
  } = {},
): ModelProviderRequest {
  return {
    model: subject.model,
    requirements: options.requirements ?? { text: true },
    system: "Provider conformance fixture.",
    messages: [{ role: "user", content: "Run the fixture." }],
    ...(options.capability ? {
      capabilities: [{
        name: "lookup",
        description: "Look up one test value.",
        input: {
          kind: "object",
          fields: { key: { required: true, schema: { kind: "string" } } },
        },
      }],
    } : {}),
    ...(options.structured ? { structuredOutput: { schema: STRUCTURED_SCHEMA } } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
  };
}

export function modelProviderContract(
  factory: (scenario: ModelProviderContractScenario) => ModelProviderContractSubject,
): readonly ContractCase[] {
  return [
    {
      name: "normalizes text generation",
      async run() {
        const subject = factory("text");
        const response = await subject.provider.generate(request(subject));
        assertEqual(response.output.text, "hello", "portable text is returned as semantic output");
      },
    },
    {
      name: "normalizes and validates schema-constrained structured output",
      async run() {
        const subject = factory("structured");
        const response = await subject.provider.generate(request(subject, {
          requirements: { text: true, structuredOutput: "required" },
          structured: true,
        }));
        assertDeepEqual(response.output.structured, { answer: "ok" }, "structured output satisfies the requested core schema");
      },
    },
    {
      name: "returns capability-call data without executing it",
      async run() {
        const subject = factory("capability_call");
        const response = await subject.provider.generate(request(subject, {
          requirements: { text: true, capabilityCalls: "required" },
          capability: true,
        }));
        assertDeepEqual(
          response.output.capabilityCalls,
          [{ capability: "lookup", input: { key: "x" } }],
          "capability calls use the provider-neutral projection",
        );
        assertTrue(
          !("effect" in response.output) && !("result" in response.output),
          "the provider reports a request as data and has no Effect/capability settlement output",
        );
      },
    },
    {
      name: "represents cancellation with the stable provider taxonomy",
      async run() {
        const subject = factory("text");
        const controller = new AbortController();
        controller.abort();
        try {
          await subject.provider.generate(request(subject, {
            requirements: { text: true, cancellation: "required" },
            signal: controller.signal,
          }));
          throw new Error("expected cancellation");
        } catch (error) {
          assertTrue(error instanceof ModelInvocationError, "cancellation is normalized by the provider boundary");
          assertEqual((error as ModelInvocationError).code, "cancelled", "cancellation has one stable code");
        }
      },
    },
    {
      name: "preserves provider, actual-model, usage, and finish metadata",
      async run() {
        const subject = factory("metadata");
        const response = await subject.provider.generate(request(subject, {
          requirements: { text: true, usageMetadata: "required" },
        }));
        assertEqual(response.metadata.provider, subject.model.provider, "resolved provider identity remains observable");
        assertEqual(response.metadata.model, "provider-model", "actual provider model remains observable");
        assertDeepEqual(
          response.metadata.usage,
          { inputTokens: 3, outputTokens: 2, totalTokens: 5 },
          "portable usage metadata is preserved",
        );
        assertEqual(response.metadata.finishReason, "stop", "portable finish metadata is preserved");
      },
    },
    {
      name: "rejects an invalid provider result with a stable error",
      async run() {
        const subject = factory("invalid_response");
        try {
          await subject.provider.generate(request(subject));
          throw new Error("expected invalid provider response");
        } catch (error) {
          assertTrue(error instanceof ModelInvocationError, "invalid output is normalized at the provider boundary");
          assertEqual((error as ModelInvocationError).code, "invalid_response", "invalid provider data has one stable code");
        }
      },
    },
    {
      name: "keeps provider diagnostics outside semantic output",
      async run() {
        const subject = factory("diagnostics");
        const response = await subject.provider.generate(request(subject));
        assertDeepEqual(response.output, { text: "hello" }, "diagnostics do not change semantic output");
        assertTrue(!("raw" in response.output), "raw provider data is not a semantic-output field");
        assertDeepEqual(JSON.parse(JSON.stringify(response)), response, "public response data survives serialization");
      },
    },
  ];
}
