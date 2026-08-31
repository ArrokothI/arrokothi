/**
 * Failure semantics: three different things that are not each other.
 *
 *   definite failure    the operation did not take effect
 *   unknown outcome     nobody can say whether it took effect
 *   Execution failure   the Execution itself cannot validly continue
 *
 * Collapsing the first two is how a runtime sends the same email twice. Collapsing either into the
 * third takes the semantic decision away from the controller: a failed capability is an
 * *observation*, and what it means - retry, try something else, report a limitation, give up - is
 * the controller's judgement, made after it has seen the observation.
 *
 * The Harness still owns the operational consequence. The controller decides that the Execution
 * cannot continue; the Harness is what makes it FAILED.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createAllowListAuthorizer, createScriptedCapabilityExecutor } from "@agent-sdk/core/reference";
import { createTestHarness, readScriptedProgress, scriptedAgentDefinition } from "@agent-sdk/core/testing";

const consequential = () =>
  createAllowListAuthorizer({ grants: [{ capability: "mail.send", operations: ["send"], consequential: true }] });

const readOnly = () =>
  createAllowListAuthorizer({ grants: [{ capability: "knowledge.query", operations: ["search"], consequential: false }] });

const tries = (capability: string, operation: string, then: "complete" | "fail") =>
  scriptedAgentDefinition({
    id: `tries-${capability}`,
    program: [
      { do: "use_capability", capability, operation, input: { to: "team@example.com" }, requestKey: "attempt-1" },
      { do: "observe", note: "read what happened" },
      then === "complete"
        ? { do: "complete" }
        : { do: "fail", code: "cannot_continue", message: "the only route to the goal is closed" },
    ],
  });

describe("failure semantics", () => {
  test("a definite failure and an unknown outcome are different observations", async () => {
    const definite = createTestHarness({
      authorizer: consequential(),
      capabilities: createScriptedCapabilityExecutor({
        handlers: {
          "mail.send:send": () => ({
            status: "failure",
            error: { code: "rejected_before_send", message: "the recipient domain refused the connection" },
            retryable: true,
          }),
        },
      }),
    });
    const definiteRef = await definite.definitions.save(tries("mail.send", "send", "complete"));
    const definiteHandle = await definite.harness.createExecution({ definition: definiteRef });
    await definite.harness.runUntilIdle();

    const definiteProgress = readScriptedProgress((await definite.harness.inspect(definiteHandle.executionId))!.control.progress);
    assert.deepEqual(definiteProgress.seenKinds, ["capability.failed"]);
    assert.equal((definiteProgress.observations[0] as { retryable: boolean }).retryable, true);
    assert.deepEqual(
      (await definite.harness.pendingOperationsOf(definiteHandle.executionId)).map((operation) => operation.outcome),
      ["failure"],
    );

    const ambiguous = createTestHarness({
      authorizer: consequential(),
      capabilities: createScriptedCapabilityExecutor({
        handlers: {
          "mail.send:send": () => ({
            status: "unknown",
            error: { code: "response_lost", message: "the connection dropped after the request was accepted" },
          }),
        },
      }),
    });
    const ambiguousRef = await ambiguous.definitions.save(tries("mail.send", "send", "complete"));
    const ambiguousHandle = await ambiguous.harness.createExecution({ definition: ambiguousRef });
    await ambiguous.harness.runUntilIdle();

    const ambiguousProgress = readScriptedProgress(
      (await ambiguous.harness.inspect(ambiguousHandle.executionId))!.control.progress,
    );
    assert.deepEqual(ambiguousProgress.seenKinds, ["capability.unknown"], "a different kind, not a flag on the same one");
    assert.ok(
      !("retryable" in (ambiguousProgress.observations[0] as object)),
      "an unknown outcome carries no retry advice, because there is none to give",
    );
    assert.deepEqual(
      (await ambiguous.harness.pendingOperationsOf(ambiguousHandle.executionId)).map((operation) => operation.outcome),
      ["unknown"],
    );

    const definiteJournal = await definite.harness.effectJournalOf(definiteHandle.executionId);
    const ambiguousJournal = await ambiguous.harness.effectJournalOf(ambiguousHandle.executionId);
    assert.equal(definiteJournal.at(-1)?.phase, "failed");
    assert.equal(ambiguousJournal.at(-1)?.phase, "unknown_outcome");
  });

  test("a failed Effect leaves the Execution alive and the decision with the controller", async () => {
    const { harness, definitions } = createTestHarness({
      authorizer: consequential(),
      capabilities: createScriptedCapabilityExecutor({
        handlers: {
          "mail.send:send": () => ({ status: "failure", error: { code: "rejected", message: "no" }, retryable: false }),
        },
      }),
    });
    const ref = await definitions.save(tries("mail.send", "send", "complete"));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "COMPLETED", "the controller decided the failure did not end the Execution");
    assert.equal(context?.failure, null);
  });

  test("a failed Effect is delivered as an Event before any terminal Execution failure", async () => {
    const { harness, definitions } = createTestHarness({
      authorizer: consequential(),
      capabilities: createScriptedCapabilityExecutor({
        handlers: {
          "mail.send:send": () => ({ status: "failure", error: { code: "rejected", message: "no" }, retryable: false }),
        },
      }),
    });
    const ref = await definitions.save(tries("mail.send", "send", "fail"));
    const handle = await harness.createExecution({ definition: ref });
    const records = await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "cannot_continue", "the Execution failed for the controller's reason");
    assert.notEqual(context?.failure?.code, "rejected", "not for the capability's");

    // Ordering, stated as a fact about the record rather than about intent: the Activation that
    // consumed the failure Event finished before the one that reported terminal failure began.
    const observed = records.findIndex((record) => record.deliveredEventIds.length > 0);
    const failed = records.findIndex((record) => record.lifecycleAfter === "FAILED");
    assert.ok(observed >= 0, "the failure was delivered to an Activation");
    assert.ok(observed < failed, "and observed before the Execution was allowed to give up");

    const progress = readScriptedProgress(context!.control.progress);
    assert.deepEqual(progress.seenKinds, ["capability.failed"]);
  });

  test("an executor that throws is unknown for a consequential operation and failed for a read", async () => {
    const consequentialRun = createTestHarness({
      authorizer: consequential(),
      capabilities: createScriptedCapabilityExecutor({
        handlers: {
          "mail.send:send": () => {
            throw new Error("socket closed mid-request");
          },
        },
      }),
    });
    const consequentialRef = await consequentialRun.definitions.save(tries("mail.send", "send", "complete"));
    const consequentialHandle = await consequentialRun.harness.createExecution({ definition: consequentialRef });
    await consequentialRun.harness.runUntilIdle();

    const thrown = readScriptedProgress(
      (await consequentialRun.harness.inspect(consequentialHandle.executionId))!.control.progress,
    );
    assert.deepEqual(
      thrown.seenKinds,
      ["capability.unknown"],
      "the request may have taken effect before the error; calling that a definite failure invites a duplicate",
    );

    const readRun = createTestHarness({
      authorizer: readOnly(),
      capabilities: createScriptedCapabilityExecutor({
        handlers: {
          "knowledge.query:search": () => {
            throw new Error("index unavailable");
          },
        },
      }),
    });
    const readRef = await readRun.definitions.save(tries("knowledge.query", "search", "complete"));
    const readHandle = await readRun.harness.createExecution({ definition: readRef });
    await readRun.harness.runUntilIdle();

    const readProgress = readScriptedProgress((await readRun.harness.inspect(readHandle.executionId))!.control.progress);
    assert.deepEqual(readProgress.seenKinds, ["capability.failed"], "nothing could have happened, so nothing is ambiguous");
    assert.equal((readProgress.observations[0] as { retryable: boolean }).retryable, true);
  });

  test("a consequential operation whose outcome is unknown is not automatically retried", async () => {
    const executor = createScriptedCapabilityExecutor({
      handlers: {
        "mail.send:send": () => ({ status: "unknown", error: { code: "response_lost", message: "no terminal response" } }),
      },
    });
    const { harness, definitions } = createTestHarness({ authorizer: consequential(), capabilities: executor });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "retries-blindly",
        program: [
          {
            do: "use_capability",
            capability: "mail.send",
            operation: "send",
            input: { to: "team@example.com" },
            requestKey: "attempt-1",
            idempotency: "per_input",
          },
          {
            do: "use_capability",
            capability: "mail.send",
            operation: "send",
            input: { to: "team@example.com" },
            requestKey: "attempt-2",
            idempotency: "per_input",
          },
          { do: "complete" },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    assert.equal(executor.callCount, 1, "'we do not know whether it happened' is not a licence to do it again");
    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["capability.unknown", "effect.rejected"]);
    assert.equal((progress.observations[1] as { code: string }).code, "prior_outcome_unknown");
  });

  test("a definite failure stays retryable, because idempotency is not a punishment", async () => {
    let attempt = 0;
    const executor = createScriptedCapabilityExecutor({
      handlers: {
        "mail.send:send": () => {
          attempt += 1;
          return attempt === 1
            ? { status: "failure", error: { code: "transient", message: "try later" }, retryable: true }
            : { status: "success", observation: { messageId: "msg-2" } };
        },
      },
    });
    const { harness, definitions } = createTestHarness({ authorizer: consequential(), capabilities: executor });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "retries-a-definite-failure",
        program: [
          {
            do: "use_capability",
            capability: "mail.send",
            operation: "send",
            input: { to: "team@example.com" },
            requestKey: "attempt-1",
            idempotency: "per_input",
          },
          {
            do: "use_capability",
            capability: "mail.send",
            operation: "send",
            input: { to: "team@example.com" },
            requestKey: "attempt-2",
            idempotency: "per_input",
          },
          { do: "complete" },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    assert.equal(executor.callCount, 2, "a transient failure that can never be retried is worse than the failure");
    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["capability.failed", "capability.completed"]);
  });

  test("an executor reply that is not persistable data does not become a fabricated success", async () => {
    class ProviderClient {
      readonly secret = "sk-live-do-not-persist";
    }
    const { harness, definitions } = createTestHarness({
      authorizer: readOnly(),
      capabilities: {
        // A plausible mistake: handing back the provider's own object instead of an observation.
        execute: async () => ({ status: "success", observation: new ProviderClient() }) as never,
      },
    });
    const ref = await definitions.save(tries("knowledge.query", "search", "complete"));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["capability.failed"], "an unusable reply is not an outcome");
    assert.equal((progress.observations[0] as { error: { code: string } }).error.code, "invalid_capability_outcome");

    const journal = await harness.effectJournalOf(handle.executionId);
    assert.ok(!JSON.stringify(journal).includes("sk-live-do-not-persist"), "and nothing from it was persisted");
  });

  test("an authorized capability with no executor fails loudly instead of appearing to work", async () => {
    const { harness, definitions } = createTestHarness({
      authorizer: readOnly(),
      capabilities: createScriptedCapabilityExecutor({ handlers: { "other.thing": () => ({ status: "success", observation: null }) } }),
    });
    const ref = await definitions.save(tries("knowledge.query", "search", "complete"));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["capability.failed"]);
    assert.equal((progress.observations[0] as { error: { code: string } }).error.code, "capability_unavailable");
    assert.equal(
      (progress.observations[0] as { retryable: boolean }).retryable,
      false,
      "policy and reality disagreed, and the runtime said so rather than inventing a result",
    );
  });

  test("an authorizer that throws is a denial, never a grant", async () => {
    const executor = createScriptedCapabilityExecutor({ fallback: () => ({ status: "success", observation: null }) });
    const { harness, definitions } = createTestHarness({
      authorizer: {
        authorize() {
          throw new Error("the policy service is unreachable");
        },
      },
      capabilities: executor,
    });
    const ref = await definitions.save(tries("mail.send", "send", "complete"));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    assert.equal(executor.callCount, 0, "a policy that cannot answer has not said yes");
    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["effect.denied"]);
    assert.equal((progress.observations[0] as { code: string }).code, "authorizer_error");
  });
});
