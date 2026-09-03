/** Runs the published CapabilityExecutor contract against the dependency-free reference executors. */

import { test, describe } from "node:test";
import { createDeferredCapabilityExecutor, createScriptedCapabilityExecutor } from "@arrokothi/core/reference";
import { capabilityExecutorContract } from "@arrokothi/core/testing";

describe("CapabilityExecutor contract: scripted executor", () => {
  for (const contractCase of capabilityExecutorContract(() => ({
    executor: createScriptedCapabilityExecutor({
      handlers: { "knowledge.query:search": () => ({ status: "success", observation: { hits: ["a"] } }) },
    }),
    capability: "knowledge.query",
    operation: "search",
    input: { q: "x" },
  }))) {
    test(contractCase.name, contractCase.run);
  }
});

describe("CapabilityExecutor contract: scripted executor reporting an unknown outcome", () => {
  for (const contractCase of capabilityExecutorContract(() => ({
    executor: createScriptedCapabilityExecutor({
      fallback: () => ({ status: "unknown", error: { code: "response_lost", message: "no terminal response" } }),
    }),
    capability: "mail.send",
    operation: "send",
  }))) {
    test(contractCase.name, contractCase.run);
  }
});

describe("CapabilityExecutor contract: deferred executor settled by the test", () => {
  for (const contractCase of capabilityExecutorContract(() => {
    // The contract asks a question the deferred executor only answers when told to, so the subject
    // arranges its own completion. Latency is not part of the contract; the reply shape is.
    const executor = createDeferredCapabilityExecutor();
    return {
      executor: {
        async execute(request, environment) {
          const work = executor.execute(request, environment);
          executor.complete(request.effectId, { delivered: true });
          return work;
        },
      },
      capability: "mail.send",
      operation: "send",
    };
  })) {
    test(contractCase.name, contractCase.run);
  }
});
