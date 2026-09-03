/**
 * The AgentExecutor boundary: a model's selection becomes semantic output, and stops there.
 *
 * This is where a provider call, or a whole third-party agent framework, is allowed to live - so it
 * is the place a native tool loop would most plausibly become an alternate gateway. The contract
 * prevents that by subtraction: there is nothing in the request an executor could dispatch with,
 * and the outcome it returns is data in the model's own vocabulary that only the controller can
 * turn into an operation identity.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { agentExecutorOutcomeIssues } from "@agent-sdk/core/ports";
import { formatModelActionTarget } from "@agent-sdk/core/execution";
import type { AgentExecutorRequest } from "@agent-sdk/core/ports";
import {
  createAllowListAuthorizer,
  createScriptedCapabilityExecutor,
  portableModelFeatures,
  ScriptedModelProvider,
  StaticModelResolver,
} from "@agent-sdk/core/reference";
import type { RecordingCapabilityExecutor } from "@agent-sdk/core/reference";
import { agentModelAccess, createAgentTestHarness, referenceAgentExecutor } from "@agent-sdk/core/testing";
import { DOCS_SEARCH, scriptedAgentExecutor, testAgent, testCatalog, testModelResolver } from "./fixtures.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const CORE_SRC = resolve(REPO_ROOT, "packages/core/src");
const IMPORT_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["']([^"']+)["']/g;

async function graphFrom(entries: readonly string[]): Promise<Set<string>> {
  const files = new Set<string>();
  const queue = [...entries];
  while (queue.length > 0) {
    const relativePath = queue.pop()!;
    if (files.has(relativePath)) continue;
    files.add(relativePath);
    const absolute = resolve(CORE_SRC, relativePath);
    const source = await readFile(absolute, "utf8");
    for (const match of source.matchAll(IMPORT_SPECIFIER)) {
      const specifier = match[1]!;
      if (!specifier.startsWith(".")) continue;
      queue.push(relative(CORE_SRC, resolve(dirname(absolute), specifier)));
    }
  }
  return files;
}

describe("an AgentExecutor reports selections and cannot perform them", () => {
  test("its request carries no Effect requester, dispatcher, policy, or store", async () => {
    const executor = scriptedAgentExecutor([{ kind: "respond", text: "hello" }]);
    const bundle = createAgentTestHarness({
      catalog: testCatalog(),
      models: agentModelAccess(testModelResolver()),
      executor,
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "docs", operations: ["search"] }] }),
      capabilities: createScriptedCapabilityExecutor({ handlers: {} }),
    });
    const ref = await bundle.definitions.save(testAgent({ id: "boundary", operations: { refs: [DOCS_SEARCH] } }));
    const agent = await bundle.createAgent({ definition: ref, authority: [DOCS_SEARCH] });
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "go" });
    await bundle.harness.runUntilIdle();

    const request = executor.requests[0]!;
    assert.deepEqual(
      Object.keys(request).sort(),
      [
        "capabilities",
        "continuation",
        "information",
        "limits",
        "localControls",
        "model",
        "observations",
        "projection",
        "requirements",
        "step",
      ],
      "compiled information, a resolved model, the two model-callable snapshots, observations, bounds - and nothing else",
    );

    // Nothing in the request is callable, so there is nothing to dispatch with even by accident.
    const functions: string[] = [];
    const walk = (value: unknown, path: string, seen = new Set<object>()): void => {
      if (typeof value === "function") return void functions.push(path);
      if (value === null || typeof value !== "object" || seen.has(value as object)) return;
      seen.add(value as object);
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) walk(child, `${path}.${key}`, seen);
    };
    walk(request, "request");
    assert.deepEqual(functions, [], "the executor is handed pure data");
    assert.deepEqual(JSON.parse(JSON.stringify(request)), request, "which survives a JSON round trip");
  });

  test("a provider capability call becomes semantic executor output, never a dispatch", async () => {
    const provider = new ScriptedModelProvider({
      id: "test",
      steps: [
        { output: { capabilityCalls: [{ id: "c1", capability: "docs_search", input: { query: "q" } }] } },
        { output: { text: "done" } },
      ],
    });
    const capabilities = createScriptedCapabilityExecutor({
      handlers: { "docs:search": () => ({ status: "success", observation: { hits: 1 } }) },
    }) as RecordingCapabilityExecutor;

    // The executor alone, with no Harness anywhere near it.
    const executor = referenceAgentExecutor([provider]);
    const resolved = await testModelResolver().resolve({ logicalRef: "primary", requirements: { text: true } });
    const { outcome, metadata } = await executor.step({
      model: resolved,
      requirements: { text: true, capabilityCalls: "required" },
      information: { system: "s", messages: [{ role: "user", content: "go" }] },
      projection: {
        projectionId: "ag/step1/projection",
        viewId: "aov_1",
        bindings: [
          {
            bindingId: "ag/step1/projection/b1",
            alias: "docs_search",
            target: { kind: "capability_operation", capability: "docs", operation: "search" },
            description: "Search.",
            input: { kind: "object", fields: { query: { required: true, schema: { kind: "string" } } } },
          },
        ],
      },
      localControls: { projectionId: "ag/step1/local-controls", viewId: "lmcv_empty", bindings: [] },
      capabilities: [
        { name: "docs_search", description: "Search.", input: { kind: "object", fields: { query: { required: true, schema: { kind: "string" } } } } },
      ],
      observations: [],
      step: 1,
      limits: { maxOperationCallsPerStep: 4 },
      continuation: null,
    } as AgentExecutorRequest);

    assert.equal(outcome.kind, "call_operations");
    assert.ok(outcome.kind === "call_operations");
    assert.deepEqual(outcome.calls, [{ callId: "c1", alias: "docs_search", input: { query: "q" } }]);
    assert.equal(
      JSON.stringify(outcome).includes('"capability":"docs"'),
      false,
      "the executor reports the name it was given; resolving it to an identity is the controller's job",
    );
    assert.equal(capabilities.callCount, 0, "and the capability implementation was never invoked");

    // The provider's own report travels beside the outcome rather than being discarded. It is
    // evidence: nothing in the semantic answer above depends on any of it.
    assert.equal(metadata?.provider, "test");
    assert.ok(typeof metadata?.latencyMs === "number", "measured at the invocation boundary");
    assert.deepEqual(JSON.parse(JSON.stringify(metadata)), metadata, "and it is plain JSON");
  });

  test("swapping the deployment behind a logical model changes nothing semantic", async () => {
    const run = async (id: string, provider: string, model: string) => {
      const resolver = new StaticModelResolver({
        primary: { provider, model, portableFeatures: portableModelFeatures({ capabilityCalls: true }) },
      });
      const scripted = new ScriptedModelProvider({
        id: provider,
        steps: [
          { output: { capabilityCalls: [{ id: "c1", capability: "docs_search", input: { query: "q" } }] } },
          { output: { text: "done" } },
        ],
      });
      const bundle = createAgentTestHarness({
        catalog: testCatalog(),
        models: agentModelAccess(resolver),
        executor: referenceAgentExecutor([scripted]),
        authorizer: createAllowListAuthorizer({ grants: [{ capability: "docs", operations: ["search"] }] }),
        capabilities: createScriptedCapabilityExecutor({
          handlers: { "docs:search": () => ({ status: "success", observation: { hits: 1 } }) },
        }),
      });
      const ref = await bundle.definitions.save(testAgent({ id, operations: { refs: [DOCS_SEARCH] } }));
      const agent = await bundle.createAgent({ definition: ref, authority: [DOCS_SEARCH] });
      await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "go" });
      for (let i = 0; i < 6; i++) {
        await bundle.harness.runUntilIdle();
        await bundle.harness.drainResumptions();
        const context = await bundle.harness.inspect(agent.executionId);
        if (context?.lifecycle === "WAITING" && context.waitingFor?.kind === "event") break;
      }
      return {
        journal: (await bundle.harness.effectJournalOf(agent.executionId)).map((entry) => entry.phase),
        proposals: bundle.trace.proposals.map((record) => formatModelActionTarget(record.target)),
        deployments: bundle.trace.deployments(),
      };
    };

    const first = await run("swap-a", "vendor-a", "model-1");
    const second = await run("swap-b", "vendor-b", "model-2");

    assert.deepEqual(second.proposals, first.proposals, "the same operation identity results");
    assert.deepEqual(second.journal, first.journal, "and the same Effect semantics");
    assert.notDeepEqual(second.deployments, first.deployments, "even though a different deployment answered");
  });

  test("a malformed executor outcome is refused rather than acted on", () => {
    assert.deepEqual(agentExecutorOutcomeIssues({ kind: "respond", text: "ok" }), []);
    for (const bad of [
      null,
      { kind: "dispatch" },
      { kind: "respond" },
      { kind: "call_operations", calls: [] },
      { kind: "call_operations", calls: [{ input: {} }] },
      { kind: "call_operations", calls: [{ alias: "x", input: "not-an-object" }] },
      { kind: "fail", message: "no code" },
    ]) {
      assert.ok(agentExecutorOutcomeIssues(bad).length > 0, `${JSON.stringify(bad)} must be refused`);
    }
  });

  test("the executor boundary reaches no Effect dispatch or backend machinery", async () => {
    const files = await graphFrom(["ports/agent-executor.ts", "reference/agent-executor.ts"]);
    const forbidden = [
      "effects/types.ts",
      "effects/journal.ts",
      "effects/pending.ts",
      "effects/authorization.ts",
      "effects/capability.ts",
      "ports/capability-executor.ts",
      "ports/effect-authorizer.ts",
      "ports/runtime-store.ts",
      "ports/scheduler.ts",
      "ports/active-operation-view.ts",
      "ports/effective-operation-authority.ts",
      "runtime/harness.ts",
      "runtime/effect-processor.ts",
      "runtime/event-router.ts",
      "execution/context.ts",
      "execution/lifecycle.ts",
    ];
    assert.deepEqual(
      [...files].filter((path) => forbidden.includes(path)),
      [],
      "an executor returns semantic outcomes; it is handed no route to authority, dispatch, or lifecycle",
    );

    const port = await readFile(resolve(CORE_SRC, "ports/agent-executor.ts"), "utf8");
    for (const forbiddenName of ["EffectProposal", "EffectRequest", "useCapability", "settle", "authorize"]) {
      assert.equal(port.includes(`${forbiddenName}(`) || port.includes(`: ${forbiddenName}`), false);
    }
  });
});
