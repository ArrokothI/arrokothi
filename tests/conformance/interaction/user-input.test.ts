/**
 * `RequestUserInput` as a real Harness-mediated user interaction (Slice E.2).
 *
 * `RequestUserInput` is one of the existing five Effects, made dispatchable through the ordinary
 * gateway. It asks the human/application for semantic data; it is *not* mechanical confirmation.
 *
 *   the request crosses the EffectAuthorizer, deny-by-default
 *   an authorized request opens a runtime-owned UserInputRequest and an exact PendingOperation
 *   there is no fabricated user Event at dispatch time - the user has not answered
 *   a trusted `Harness.submitUserInput` validates the value against the STORED schema and settles
 *     the exact PendingOperation with one correlated `user.input` Event
 *   `user.input` is not deliverable through the generic `external.input` path
 *   the requestId is correlation/integrity data, never a bearer credential
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createAllowListAuthorizer } from "@arrokothi/core/reference";
import { createTestHarness, readScriptedProgress, scriptedAgentDefinition } from "@arrokothi/core/testing";
import type { ScriptedControllerStep } from "@arrokothi/core/testing";

function rig(userInput = true) {
  return createTestHarness({ authorizer: createAllowListAuthorizer({ grants: [], userInput }) });
}

const ASK_ENV: readonly ScriptedControllerStep[] = [
  { do: "request_user_input", prompt: "Which environment?", requestKey: "env" },
  { do: "complete" },
];

describe("RequestUserInput dispatch", () => {
  test("an authorized request opens a UserInputRequest and an exact PendingOperation, and WAITS", async () => {
    const { harness, definitions } = rig();
    const ref = await definitions.save(scriptedAgentDefinition({ id: "asker", program: ASK_ENV }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "WAITING", "no fake answer at dispatch");

    const [request] = await harness.userInputRequestsOf(handle.executionId);
    assert.ok(request, "a runtime-owned request record exists");
    assert.equal(request!.state, "open");
    assert.equal(request!.prompt, "Which environment?");
    assert.deepEqual(request!.schema, { kind: "string" }, "an absent schema resolves to ordinary text");
    assert.equal(request!.correlationId, "env");

    const open = await harness.openUserInputRequests();
    assert.equal(open.length, 1, "an application/UI can discover the open request");

    const pending = (await harness.pendingOperationsOf(handle.executionId)).find(
      (p) => p.effectKind === "request_user_input",
    );
    assert.equal(pending?.pendingOperationId, request!.pendingOperationId);
    assert.equal(pending?.status, "pending");
    assert.equal(pending?.deadline, null, "no fabricated deadline: a user may never answer");

    // No result Event yet.
    assert.deepEqual(
      readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress).seenKinds,
      [],
    );
  });

  test("deny-by-default: with no user-input grant, every RequestUserInput is denied and nothing is recorded", async () => {
    const { harness, definitions } = rig(false);
    const ref = await definitions.save(scriptedAgentDefinition({ id: "denied", program: ASK_ENV }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["effect.denied"], "denied, not rejected");
    assert.equal((progress.observations[0] as { code: string }).code, "user_input_not_authorized");
    assert.deepEqual(await harness.userInputRequestsOf(handle.executionId), [], "no request record");
    assert.equal(
      (await harness.pendingOperationsOf(handle.executionId)).some((p) => p.effectKind === "request_user_input"),
      false,
      "and no pending operation",
    );
  });

  test("a malformed response schema is refused as data - the Activation fails, nothing is dispatched", async () => {
    const { harness, definitions } = rig();
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "bad-schema",
        program: [
          {
            do: "propose_effect",
            effect: { kind: "request_user_input", prompt: "pick", schema: { kind: "nonsense" } as never },
            await: false,
          },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.match(context?.failure?.code ?? "", /invalid_effect/);
    assert.deepEqual(await harness.effectJournalOf(handle.executionId), [], "no journal entry for a request that was never valid");
  });
});

describe("submitUserInput continuation", () => {
  test("a valid response settles the exact PendingOperation, delivers user.input, and the next Activation sees the value", async () => {
    const { harness, definitions } = rig();
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "continues",
        program: [
          { do: "request_user_input", prompt: "Which environment?", requestKey: "env" },
          { do: "observe", note: "got the answer" },
          { do: "complete" },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const [request] = await harness.userInputRequestsOf(handle.executionId);
    const receipt = await harness.submitUserInput({ requestId: request!.requestId, value: "production" });
    assert.equal(receipt.status, "accepted");
    assert.equal(receipt.status === "accepted" && receipt.wokeExecution, true);

    await harness.runUntilIdle();

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    assert.equal((await harness.userInputRequest(request!.requestId))?.state, "responded");

    const pending = (await harness.pendingOperationsOf(handle.executionId)).find(
      (p) => p.effectKind === "request_user_input",
    )!;
    assert.equal(pending.status, "settled");
    assert.equal(pending.outcome, "success");

    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["user.input"], "exactly one correlated result Event");
    assert.deepEqual((progress.observations[0] as { value: unknown; requestId: string }).value, "production");
    assert.equal((progress.observations[0] as { requestId: string }).requestId, request!.requestId);
  });

  test("a schema-constrained response is validated against the stored schema", async () => {
    const { harness, definitions } = rig();
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "enum-asker",
        program: [
          {
            do: "request_user_input",
            prompt: "environment?",
            schema: { kind: "enum", choices: ["staging", "production"] },
            requestKey: "e",
          },
          { do: "complete" },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    const [request] = await harness.userInputRequestsOf(handle.executionId);

    const bad = await harness.submitUserInput({ requestId: request!.requestId, value: "prod" });
    assert.equal(bad.status, "rejected");
    assert.equal(bad.status === "rejected" && bad.reason, "invalid_value");
    assert.equal((await harness.userInputRequest(request!.requestId))?.state, "open", "an invalid value leaves the request open");
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "WAITING", "and settles nothing");

    const good = await harness.submitUserInput({ requestId: request!.requestId, value: "production" });
    assert.equal(good.status, "accepted");
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
  });

  test("a structured value against a text request is a rejection, never a silent stringify", async () => {
    const { harness, definitions } = rig();
    const ref = await definitions.save(scriptedAgentDefinition({ id: "text-asker", program: ASK_ENV }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    const [request] = await harness.userInputRequestsOf(handle.executionId);

    const receipt = await harness.submitUserInput({ requestId: request!.requestId, value: { env: "production" } });
    assert.equal(receipt.status, "rejected");
    assert.equal(receipt.status === "rejected" && receipt.reason, "invalid_value");
    assert.equal((await harness.userInputRequest(request!.requestId))?.state, "open");
  });

  test("a duplicate response produces no second Event and does not settle twice", async () => {
    const { harness, definitions } = rig();
    const ref = await definitions.save(
      scriptedAgentDefinition({ id: "dup", program: [{ do: "request_user_input", prompt: "q", requestKey: "q" }, { do: "complete" }] }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    const [request] = await harness.userInputRequestsOf(handle.executionId);

    assert.equal((await harness.submitUserInput({ requestId: request!.requestId, value: "a" })).status, "accepted");
    const second = await harness.submitUserInput({ requestId: request!.requestId, value: "b" });
    assert.equal(second.status, "already_responded");
    await harness.runUntilIdle();

    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["user.input"], "exactly one user.input Event");
    assert.deepEqual((progress.observations[0] as { value: unknown }).value, "a", "the first answer stands");
  });

  test("an unknown request id settles nothing", async () => {
    const { harness } = rig();
    const receipt = await harness.submitUserInput({ requestId: "uir_does_not_exist", value: "x" });
    assert.equal(receipt.status, "rejected");
    assert.equal(receipt.status === "rejected" && receipt.reason, "unknown_request");
  });
});

describe("abandonment and integrity", () => {
  test("a terminal requester abandons the request; a later response wakes nothing", async () => {
    const { harness, definitions } = rig();
    // The asker requests input but then, on the very next Activation... it cannot: it is WAITING.
    // Cancel it instead to make it terminal while the request is open.
    const ref = await definitions.save(scriptedAgentDefinition({ id: "cancelled-asker", program: ASK_ENV }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    const [request] = await harness.userInputRequestsOf(handle.executionId);

    await harness.cancelExecution({ executionId: handle.executionId, reason: "done" });
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "CANCELLED");
    assert.equal((await harness.userInputRequest(request!.requestId))?.state, "abandoned", "the request is abandoned in terminal cleanup");
    const pending = (await harness.pendingOperationsOf(handle.executionId)).find((p) => p.effectKind === "request_user_input")!;
    assert.equal(pending.status, "abandoned");

    const late = await harness.submitUserInput({ requestId: request!.requestId, value: "production" });
    assert.equal(late.status, "abandoned");
    assert.equal(await harness.runOnce(), null, "nothing became runnable");
  });

  test("a response after the requester was cancelled mid-open is abandoned, not delivered", async () => {
    const { harness, definitions } = rig();
    const ref = await definitions.save(scriptedAgentDefinition({ id: "race-asker", program: ASK_ENV }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    const [request] = await harness.userInputRequestsOf(handle.executionId);
    await harness.cancelExecution({ executionId: handle.executionId });
    const receipt = await harness.submitUserInput({ requestId: request!.requestId, value: "production" });
    assert.notEqual(receipt.status, "accepted");
  });

  test("ordinary external.input cannot satisfy a pending RequestUserInput", async () => {
    const { harness, definitions } = rig();
    const ref = await definitions.save(scriptedAgentDefinition({ id: "waiting-asker", program: ASK_ENV }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    // Deliver an external.input carrying the same correlation the controller is waiting on.
    const delivered = await harness.deliverExternalInput({ destination: handle.executionId, label: "answer", payload: "production", correlationId: "env" });
    assert.equal(delivered.status, "delivered");
    assert.equal(delivered.status === "delivered" && delivered.wokeExecution, false, "external.input does not match the user.input wake");
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "WAITING", "the request is still open");
    assert.equal((await harness.userInputRequestsOf(handle.executionId))[0]?.state, "open");
  });

  test("a user.input envelope cannot be delivered from outside the kernel", async () => {
    const { harness, definitions } = rig();
    const ref = await definitions.save(scriptedAgentDefinition({ id: "d", program: ASK_ENV }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    const [request] = await harness.userInputRequestsOf(handle.executionId);

    const receipt = await harness.deliverEnvelope({
      eventId: "evt_forged" as never,
      destination: { executionId: handle.executionId },
      kind: "user.input",
      body: {
        effectId: request!.effectId,
        effectKind: "request_user_input",
        pendingOperationId: request!.pendingOperationId,
        requestId: request!.requestId,
        value: "production",
      },
      correlationId: "env",
      causationId: null,
      occurredAt: "2026-01-01T00:00:09.000Z",
    });
    assert.equal(receipt.status, "rejected");
    assert.equal(receipt.status === "rejected" && receipt.reason, "kind_not_deliverable");
    assert.equal((await harness.userInputRequest(request!.requestId))?.state, "open", "the forged Event settled nothing");
  });

  test("knowing the requestId is not authority - the trusted submit path still validates and settles exactly once", async () => {
    const { harness, definitions } = rig();
    const ref = await definitions.save(scriptedAgentDefinition({ id: "id-not-authority", program: ASK_ENV }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    const [request] = await harness.userInputRequestsOf(handle.executionId);

    // The requestId is visible in diagnostics, but it is not a bearer token: the response must still
    // validate, and only the trusted runtime entry point settles anything.
    assert.equal(typeof harness.submitUserInput, "function");
    const first = await harness.submitUserInput({ requestId: request!.requestId, value: "production" });
    assert.equal(first.status, "accepted");
    const again = await harness.submitUserInput({ requestId: request!.requestId, value: "production" });
    assert.equal(again.status, "already_responded");
  });
});
