/**
 * The Effect gateway: request, authorize, dispatch, observe.
 *
 * The claims here are all about the boundary between asking and happening. A controller can propose
 * an Effect and nothing else; there is no handle in its input that reaches an executor, a journal,
 * a store, or a policy evaluator. Whether anything occurs is decided afterwards by the Harness, and
 * a decision to refuse is still delivered back as an observation rather than as silence.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { effectRequestsIn, isTerminalEffectPhase, latestPhase, useCapability } from "@arrokothi/core/execution";
import type { ActivationInput, ActivationOutcome, ExecutionController } from "@arrokothi/core/ports";
import { createAllowListAuthorizer, createScriptedCapabilityExecutor } from "@arrokothi/core/reference";
import { createTestHarness, readScriptedProgress, scriptedAgentDefinition } from "@arrokothi/core/testing";

/**
 * What this Execution is permitted to use at all.
 *
 * The runtime-owned ceiling, supplied when the Execution is created. It is checked again at dispatch
 * from current state, so an Execution created without one can reach no capability implementation
 * whatever a controller proposes and whatever policy would have said.
 */
const AUTHORITY = { operations: [{ capability: "knowledge.query", operation: "search" }] };

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const searcher = () =>
  scriptedAgentDefinition({
    id: "searcher",
    program: [
      { do: "use_capability", capability: "knowledge.query", operation: "search", input: { q: "revenue" }, requestKey: "search-1" },
      { do: "observe", note: "read the result" },
      { do: "complete" },
    ],
  });

const allowSearch = () =>
  createAllowListAuthorizer({
    grants: [{ capability: "knowledge.query", operations: ["search"] }],
  });

const searchExecutor = () =>
  createScriptedCapabilityExecutor({
    handlers: {
      "knowledge.query:search": (request) => ({
        status: "success",
        observation: { hits: [`match for ${String(request.input["q"])}`] },
      }),
    },
  });

describe("the Effect gateway", () => {
  test("a controller proposes Effects as data and is handed nothing that could dispatch one", async () => {
    let captured: ActivationInput | null = null;
    const proposer: ExecutionController = {
      kind: "agent",
      activate(input): ActivationOutcome {
        captured = input;
        return {
          control: { kind: "agent", progress: { asked: true } },
          effects: [
            useCapability({ capability: "knowledge.query", operation: "search", input: { q: "revenue" }, requestKey: "search-1" }),
          ],
          next: { status: "await_event", wake: { eventKinds: ["capability.completed"], correlationId: "search-1" } },
        };
      },
    };

    const executor = searchExecutor();
    const { harness, definitions } = createTestHarness({
      controllers: [proposer],
      authorizer: allowSearch(),
      capabilities: executor,
    });
    const ref = await definitions.save(searcher());
    await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runOnce();

    const input = captured as unknown as ActivationInput;
    assert.ok(input, "the controller ran");
    assert.deepEqual(Object.keys(input).sort(), ["activation", "definition", "events", "execution"]);

    // The proposal is data the Harness acted on; the controller never touched what acted on it.
    assert.equal(executor.callCount, 1, "the Harness dispatched, having authorized first");
    const serialized = JSON.stringify(input);
    for (const forbidden of ["executor", "authorizer", "journal", "store", "scheduler", "pendingOperation"]) {
      assert.ok(!serialized.includes(forbidden), `the Activation input mentions no ${forbidden}`);
    }
  });

  test("the controller port declares no executor, authorizer, journal, or store dependency", async () => {
    const source = await readFile(resolve(REPO_ROOT, "packages/core/src/ports/controller.ts"), "utf8");
    for (const forbidden of [
      "capability-executor.ts",
      "effect-authorizer.ts",
      "runtime-store.ts",
      "scheduler.ts",
      "effects/journal.ts",
      "effects/pending.ts",
      "inline-wait.ts",
    ]) {
      assert.ok(!source.includes(forbidden), `the controller contract must not reference ${forbidden}`);
    }
  });

  test("with no policy configured every Effect is denied and nothing is dispatched", async () => {
    const executor = searchExecutor();
    const { harness, definitions } = createTestHarness({ capabilities: executor });
    const ref = await definitions.save(searcher());
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    assert.equal(executor.callCount, 0, "an unconfigured Harness is not a permissive one");
    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["effect.denied"], "the refusal was still delivered as an observation");
    assert.equal((progress.observations[0] as { code: string }).code, "no_authorizer_configured");
  });

  test("a denied Effect never reaches the executor and becomes an observable Event", async () => {
    const executor = searchExecutor();
    const { harness, definitions } = createTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "world.move" }] }),
      capabilities: executor,
    });
    const ref = await definitions.save(searcher());
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    assert.equal(executor.callCount, 0, "denial happens before dispatch, not after it");

    const journal = await harness.effectJournalOf(handle.executionId);
    assert.deepEqual(journal.map((entry) => entry.phase), ["requested", "denied"], "no authorization and no dispatch was recorded");

    const context = await harness.inspect(handle.executionId);
    const progress = readScriptedProgress(context!.control.progress);
    assert.deepEqual(progress.seenKinds, ["effect.denied"]);
    assert.equal((progress.observations[0] as { code: string }).code, "capability_not_authorized");
    assert.equal(context?.lifecycle, "COMPLETED", "a refused Effect is an observation, not a broken Execution");
  });

  test("authorization is not implied by the capability existing, being named, or being executable", async () => {
    const executor = searchExecutor();
    const { harness, definitions } = createTestHarness({
      // The operation is registered with the executor and the capability is real. Only the
      // authorized operation list decides.
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "knowledge.query", operations: ["summarize"] }] }),
      capabilities: executor,
    });
    const ref = await definitions.save(searcher());
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    assert.equal(executor.callCount, 0);
    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.equal((progress.observations[0] as { code: string }).code, "operation_not_authorized");
  });

  test("an unbound resource cannot be reached, and an authorized one is narrowed into the grant", async () => {
    const executor = createScriptedCapabilityExecutor({ fallback: () => ({ status: "success", observation: null }) });
    const { harness, definitions } = createTestHarness({
      authorizer: createAllowListAuthorizer({
        grants: [
          {
            capability: "knowledge.query",
            resources: [
              { bindingId: "knowledge://papers", mode: "read" },
              { bindingId: "knowledge://private", mode: "read" },
            ],
          },
        ],
      }),
      capabilities: executor,
    });

    const forbidden = await definitions.save(
      scriptedAgentDefinition({
        id: "reaches-too-far",
        program: [
          {
            do: "use_capability",
            capability: "knowledge.query",
            operation: "search",
            resources: ["knowledge://production"],
            requestKey: "r1",
          },
          { do: "complete" },
        ],
      }),
    );
    const overreaching = await harness.createExecution({ definition: forbidden, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();
    assert.equal(executor.callCount, 0, "an unbound resource is refused before dispatch");
    const denial = readScriptedProgress((await harness.inspect(overreaching.executionId))!.control.progress);
    assert.equal((denial.observations[0] as { code: string }).code, "resource_not_authorized");

    const allowed = await definitions.save(
      scriptedAgentDefinition({
        id: "stays-in-bounds",
        program: [
          {
            do: "use_capability",
            capability: "knowledge.query",
            operation: "search",
            resources: ["knowledge://papers"],
            requestKey: "r1",
          },
          { do: "complete" },
        ],
      }),
    );
    await harness.createExecution({ definition: allowed, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    assert.equal(executor.callCount, 1);
    const grantedResources = executor.calls[0]!.request.resources;
    assert.deepEqual(
      grantedResources.map((resource) => resource.bindingId),
      ["knowledge://papers"],
      "the grant narrows to what was both requested and permitted, never to everything policy could allow",
    );
  });

  test("an authorized Effect is journaled and its pending operation committed before dispatch", async () => {
    const order: string[] = [];
    const { harness, definitions, store } = createTestHarness({
      authorizer: allowSearch(),
      capabilities: {
        async execute(request) {
          // Read the durable record from inside the dispatch: whatever exists now was committed
          // before the call, which is the only ordering that survives a crash honestly.
          const journal = await store.listEffectJournal(request.executionId);
          order.push(...journal.map((entry) => entry.phase));
          const operation = await store.readPendingOperation(request.pendingOperationId);
          order.push(`pending:${operation?.status}/${operation?.dispatch}`);
          return { status: "success", observation: { hits: [] } };
        },
      },
    });
    const ref = await definitions.save(searcher());
    await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    assert.deepEqual(
      order,
      ["requested", "authorized", "dispatch_started", "pending:pending/dispatched"],
      "the intent to do something irreversible is durable before it is done",
    );
  });

  test("a successful Effect delivers a correlated observation the controller can read", async () => {
    const { harness, definitions } = createTestHarness({ authorizer: allowSearch(), capabilities: searchExecutor() });
    const ref = await definitions.save(searcher());
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "COMPLETED");

    const progress = readScriptedProgress(context!.control.progress);
    assert.deepEqual(progress.seenKinds, ["capability.completed"]);
    const body = progress.observations[0] as {
      capability: string;
      operation: string;
      observation: { hits: string[] };
      replayed: boolean;
      effectId: string;
      pendingOperationId: string;
    };
    assert.equal(body.capability, "knowledge.query");
    assert.equal(body.operation, "search");
    assert.deepEqual(body.observation.hits, ["match for revenue"]);
    assert.equal(body.replayed, false);

    const operations = await harness.pendingOperationsOf(handle.executionId);
    assert.equal(operations.length, 1);
    assert.equal(operations[0]!.correlationId, "search-1", "the controller's request key is the correlation");
    assert.equal(operations[0]!.effectId, body.effectId, "the observation names the request that produced it");
    assert.equal(operations[0]!.pendingOperationId, body.pendingOperationId);
    assert.equal(operations[0]!.status, "settled");
    assert.equal(operations[0]!.outcome, "success");
  });

  test("the request itself is persisted, not just a fingerprint of it", async () => {
    const { harness, definitions } = createTestHarness({ authorizer: allowSearch(), capabilities: searchExecutor() });
    const ref = await definitions.save(searcher());
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    const journal = await harness.effectJournalOf(handle.executionId);
    const [request] = effectRequestsIn(journal);
    assert.ok(request, "a request record survives in durable state");
    assert.equal(request.kind, "use_capability");
    assert.equal(request.correlationId, "search-1");
    assert.deepEqual(
      request.proposal,
      {
        kind: "use_capability",
        capability: "knowledge.query",
        operation: "search",
        input: { q: "revenue" },
        requestKey: "search-1",
      },
      "what was asked for is answerable from the record, not inferred from a digest that two requests could share",
    );

    // Identity is a minted id, and it is what every later phase is keyed by.
    assert.match(request.effectId, /^eff_/);
    assert.ok(
      journal.every((entry) => entry.effectId === request.effectId),
      "authorization, dispatch, and outcome all hang off the same request identity",
    );
    assert.equal(latestPhase(journal, request.effectId), "completed");
    assert.ok(isTerminalEffectPhase("completed"));
    assert.ok(!isTerminalEffectPhase("dispatch_started"), "dispatched is not completed");
  });

  test("an authorized WriteMemory without a configured view is rejected explicitly, never silently dropped", async () => {
    const executor = searchExecutor();
    const { harness, definitions } = createTestHarness({
      // Deliberately permissive: the refusal must come from the kernel, not from policy.
      authorizer: { authorize: () => ({ decision: "allow", grantId: "grant_permissive" }) },
      capabilities: executor,
    });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "wants-to-write-memory",
        program: [
          // F.0 dispatches `write_memory`, but a successful write requires a runtime-bound view.
          { do: "propose_effect", effect: { kind: "write_memory", key: "note", value: { text: "hi" } } },
          { do: "complete" },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    assert.equal(executor.callCount, 0);
    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["effect.rejected"], "the controller was told, not left waiting");
    assert.equal((progress.observations[0] as { code: string }).code, "structured_memory_view_not_configured");

    const journal = await harness.effectJournalOf(handle.executionId);
    assert.deepEqual(journal.map((entry) => entry.phase), ["requested", "authorized", "rejected"]);
    assert.equal(journal[0]!.effectKind, "write_memory", "the request is recorded as what it was");
  });

  test("proposing an Effect does not by itself mean WAITING", async () => {
    const { harness, definitions } = createTestHarness({ authorizer: allowSearch(), capabilities: searchExecutor() });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "fire-and-continue",
        program: [
          { do: "use_capability", capability: "knowledge.query", operation: "search", requestKey: "s1", await: false },
          { do: "emit", text: "still working locally" },
          { do: "complete" },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    const records = await harness.runUntilIdle();

    const afterProposal = records[0]!;
    assert.equal(afterProposal.effects.length, 1, "an Effect was proposed");
    assert.equal(
      afterProposal.lifecycleAfter,
      "READY",
      "the controller reported runnable local work, so the Effect did not suspend anything",
    );

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "COMPLETED");
    const progress = readScriptedProgress(context!.control.progress);
    assert.deepEqual(progress.seenKinds, ["capability.completed"], "the result still arrived as an observation");
  });

  test("an Activation that is completing cannot also launch work nothing would observe", async () => {
    const parting: ExecutionController = {
      kind: "agent",
      activate(): ActivationOutcome {
        return {
          control: { kind: "agent", progress: {} },
          effects: [useCapability({ capability: "knowledge.query", operation: "search" })],
          next: { status: "complete" },
        };
      },
    };
    const executor = searchExecutor();
    const { harness, definitions } = createTestHarness({
      controllers: [parting],
      authorizer: allowSearch(),
      capabilities: executor,
    });
    const ref = await definitions.save(searcher());
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    assert.equal(executor.callCount, 0, "nothing was dispatched");
    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "invalid_controller_outcome:invalid_effect");
    assert.equal(context?.terminalResult, null);
  });
});
