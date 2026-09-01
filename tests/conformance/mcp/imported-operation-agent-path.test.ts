/**
 * The whole import path, end to end, with a real MCP server on the far side.
 *
 * ```text
 * an actual MCP server registers one synchronous Tool
 *        v tools/list
 * the importer produces an ordinary CapabilityOperationDescriptor
 *        v
 * Catalog
 *        v  explicit EffectiveOperationAuthority for that exact operation
 * Active Operation View
 *        v
 * immutable ModelOperationProjection
 *        v  the model selects an alias
 * exact binding resolution
 *        v
 * ModelActionTarget { kind: "capability_operation" }
 *        v
 * UseCapability                      <- the only Effect an Agent proposes
 *        v
 * Harness current-authority ceiling
 *        v
 * EffectAuthorizer
 *        v
 * MCP-backed CapabilityExecutor
 *        v
 * a real tools/call
 *        v
 * ordinary CapabilityOutcome -> ordinary capability.completed Event
 *        v
 * the existing observation projector
 * ```
 *
 * Nothing in that column knows MCP exists except the two ends. The Agent controller, the exposure
 * resolver, the projection, the action target, the Effect gateway, the Event vocabulary, and the
 * observation projector are the same code a native capability operation goes through - which is the
 * actual claim this slice makes, and the reason the assertions below walk every layer rather than
 * checking only that the server was called.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { OperationRef } from "@agent-sdk/core/execution";
import { EVENT_KINDS, effectRequestsIn } from "@agent-sdk/core/execution";
import type { EffectAuthorizer } from "@agent-sdk/core/ports";
import { createActiveOperationViewResolver, createAllowListAuthorizer, createRuntimeOperationAuthoritySource, InMemoryRuntimeStore } from "@agent-sdk/core/reference";
import { agentModelAccess, createAgentTestHarness, referenceAgentExecutor } from "@agent-sdk/core/testing";
import { importMcpTools } from "@agent-sdk/integration-mcp";
import {
  LOOKUP_INPUT_SCHEMA,
  LOOKUP_TOOL,
  PROOF_CODE,
  connect,
  counting,
  lookupServer,
  mcpAgent,
  selectingProvider,
  settleAgent,
  testModelResolver,
} from "./fixtures.ts";

const IMPORTED: OperationRef = { capability: "external.lookup", operation: LOOKUP_TOOL };

describe("an imported MCP Tool travels the ordinary Agent path", () => {
  test("discovery, authority, exposure, projection, selection, dispatch, and observation", async () => {
    const pair = await connect(lookupServer());
    try {
      // -- discovery ---------------------------------------------------------
      const snapshot = await importMcpTools({
        capability: IMPORTED.capability,
        client: pair.client,
        tools: [{ tool: LOOKUP_TOOL, consequential: false, groups: ["research"] }],
      });
      assert.deepEqual(snapshot.issues, []);

      // The result is the existing descriptor type. There is no MCP-shaped descriptor anywhere in
      // Arrokoth for it to have become instead.
      const descriptor = snapshot.catalog.describe(IMPORTED.capability as never, IMPORTED.operation as never);
      assert.ok(descriptor, "the imported tool is an ordinary catalog descriptor");
      assert.deepEqual(Object.keys(descriptor).sort(), [
        "capability",
        "consequential",
        "description",
        "groups",
        "input",
        "operation",
        "title",
      ]);

      // -- wiring ------------------------------------------------------------
      const store = new InMemoryRuntimeStore();
      const executor = counting(snapshot.executor);
      const authorizations: string[] = [];
      const policy: EffectAuthorizer = {
        authorize(request) {
          authorizations.push(`${request.effectKind}`);
          return createAllowListAuthorizer({
            grants: [{ capability: IMPORTED.capability, operations: [IMPORTED.operation] }],
          }).authorize(request);
        },
      };

      const bundle = createAgentTestHarness({
        store,
        // Descriptive truth reaches the exposure resolver; the MCP executor reaches the Harness.
        catalog: snapshot.catalog,
        models: agentModelAccess(testModelResolver()),
        executor: referenceAgentExecutor([selectingProvider("external_lookup_lookup_code", { key: "alpha" }, `The code is ${PROOF_CODE}.`)]),
        authorizer: policy,
        capabilities: executor,
      });

      const ref = await bundle.definitions.save(
        mcpAgent({ id: "mcp-import-proof", operations: { refs: [IMPORTED] } }),
      );
      // Explicit authority for that exact imported operation. Discovery granted nothing; this did.
      const agent = await bundle.createAgent({ definition: ref, authority: [IMPORTED] });

      // -- the ceiling the runtime stored ------------------------------------
      const ceiling = await bundle.harness.effectiveOperationAuthorityOf(agent.executionId);
      assert.deepEqual(ceiling?.operations, [IMPORTED]);

      // -- the Active View, from the real resolver over the real store --------
      const view = await createActiveOperationViewResolver({
        authority: createRuntimeOperationAuthoritySource(store),
        catalog: snapshot.catalog,
      }).resolve({ executionId: agent.executionId, exposure: { refs: [IMPORTED] } });
      assert.deepEqual(
        view.entries.map((entry) => `${entry.capability}/${entry.operation}`),
        ["external.lookup/lookup_code"],
      );
      assert.deepEqual(view.omitted, []);

      // -- run ---------------------------------------------------------------
      await bundle.harness.deliverExternalInput({
        destination: agent.executionId,
        label: "ask",
        payload: "What is the code for record alpha?",
      });
      await settleAgent(bundle.harness, agent.executionId);

      // -- the immutable projection the model was shown -----------------------
      const invocation = bundle.trace.modelInvocations[0]!;
      assert.equal(invocation.viewId, view.viewId, "the projection was cut from that same view");
      assert.deepEqual(invocation.bindings.map((binding) => binding.alias), ["external_lookup_lookup_code"]);
      assert.deepEqual(invocation.bindings[0]!.target, {
        kind: "capability_operation",
        capability: IMPORTED.capability,
        operation: IMPORTED.operation,
      });

      // -- exact binding resolution, and only UseCapability -------------------
      const proposal = bundle.trace.proposals[0]!;
      assert.equal(proposal.bindingId, invocation.bindings[0]!.bindingId, "resolved through that exact projection");
      const journal = await bundle.harness.effectJournalOf(agent.executionId);
      assert.deepEqual([...new Set(journal.map((entry) => entry.effectKind))], ["use_capability"]);
      assert.equal(effectRequestsIn(journal).length, 1);
      assert.deepEqual(journal.map((entry) => entry.phase), [
        "requested",
        "authorized",
        "dispatch_started",
        "completed",
      ]);

      // -- the ceiling and then policy, in that order -------------------------
      assert.deepEqual(authorizations, ["use_capability"], "policy was consulted exactly once, after the ceiling");

      // -- the MCP-backed executor, and the real protocol call ----------------
      assert.equal(executor.dispatches.length, 1, "the Harness reached the MCP-backed executor once");
      assert.equal(executor.dispatches[0]!.capability, IMPORTED.capability);
      assert.deepEqual(
        pair.calls,
        [{ tool: LOOKUP_TOOL, arguments: { key: "alpha" } }],
        "the MCP server saw the expected input exactly once",
      );

      // The executor was handed an authorized request and nothing else: no Harness, no store, no
      // Active View, no projection, no authority record, no credential.
      const dispatched = executor.dispatches[0]! as unknown as Record<string, unknown>;
      assert.deepEqual(Object.keys(dispatched).sort(), [
        "authorization",
        "cancellation",
        "capability",
        "causationId",
        "correlationId",
        "deadline",
        "effectId",
        "executionId",
        "idempotencyKey",
        "input",
        "operation",
        "pendingOperationId",
        "resources",
      ]);

      // -- the outcome became an ordinary Event -------------------------------
      const settled = journal.at(-1)!;
      assert.equal(settled.phase, "completed");
      assert.deepEqual(settled.detail["observation"], { key: "alpha", code: PROOF_CODE });
      assert.equal(
        JSON.stringify(settled.detail).includes("structuredContent"),
        false,
        "no MCP result vocabulary survived into the journal",
      );

      // -- and the Agent read it through the existing observation projector ---
      const context = await bundle.harness.inspect(agent.executionId);
      const progress = JSON.parse(JSON.stringify(context!.control.progress)) as {
        messages: { role: string; content: string; capability?: string }[];
      };
      const observed = progress.messages.filter((message) => message.role === "capability");
      assert.equal(observed.length, 1);
      assert.equal(observed[0]!.capability, "external_lookup_lookup_code");
      assert.match(observed[0]!.content, new RegExp(PROOF_CODE));

      // -- no MCP Event kind exists ------------------------------------------
      assert.deepEqual(
        EVENT_KINDS.filter((kind) => kind.toLowerCase().includes("mcp") || kind.toLowerCase().includes("tool")),
        [],
        "the Event vocabulary did not grow a protocol arm",
      );
    } finally {
      await pair.close();
    }
  });

  test("the imported operation's input schema is the published one, unchanged", async () => {
    const pair = await connect(lookupServer());
    try {
      const snapshot = await importMcpTools({ capability: IMPORTED.capability, client: pair.client });
      const bundle = createAgentTestHarness({
        catalog: snapshot.catalog,
        models: agentModelAccess(testModelResolver()),
        executor: referenceAgentExecutor([selectingProvider("external_lookup_lookup_code", { key: "alpha" })]),
        authorizer: createAllowListAuthorizer({ grants: [{ capability: IMPORTED.capability }] }),
        capabilities: snapshot.executor,
      });
      const ref = await bundle.definitions.save(mcpAgent({ id: "mcp-schema", operations: { refs: [IMPORTED] } }));
      const agent = await bundle.createAgent({ definition: ref, authority: [IMPORTED] });
      await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "ask", payload: "code?" });
      await settleAgent(bundle.harness, agent.executionId);

      // What the *model* was shown is the descriptor's schema, which is the server's schema.
      const shown = bundle.trace.modelInvocations[0]!;
      assert.equal(shown.exposedOperations, 1);
      const descriptor = snapshot.catalog.describe(IMPORTED.capability as never, IMPORTED.operation as never)!;
      assert.deepEqual(descriptor.input, {
        kind: "object",
        fields: { key: { schema: { kind: "string" }, required: true, description: LOOKUP_INPUT_SCHEMA.properties.key.description } },
        additionalProperties: false,
      });
    } finally {
      await pair.close();
    }
  });
});
