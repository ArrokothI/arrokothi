/** Terminal sources abandon cross-Execution dependencies without cancelling their targets. */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createAllowListAuthorizer } from "@agent-sdk/core/reference";
import { createTestHarness, readScriptedProgress, scriptedAgentDefinition } from "@agent-sdk/core/testing";
import type { ScriptedControllerStep } from "@agent-sdk/core/testing";

type TerminalMode = "COMPLETED" | "FAILED" | "CANCELLED";

function terminalStep(mode: TerminalMode): ScriptedControllerStep {
  return mode === "FAILED"
    ? { do: "fail", code: "deliberate", message: "terminal source" }
    : { do: "complete" };
}

describe("terminal dependency abandonment", () => {
  for (const mode of ["COMPLETED", "FAILED", "CANCELLED"] as const) {
    test(`${mode} requester abandons a peer ask without cancelling the peer`, async () => {
      const { harness, definitions } = createTestHarness({
        authorizer: createAllowListAuthorizer({ grants: [], message: true }),
      });
      const responderRef = await definitions.save(
        scriptedAgentDefinition({
          id: `responder-${mode}`,
          program: [
            {
              do: "await",
              eventKinds: ["external.input"],
              correlationId: "never",
              interleave: { eventKinds: ["peer.message"] },
            },
            { do: "await", eventKinds: ["external.input"] },
            { do: "reply", body: { late: true }, await: true },
            { do: "complete" },
          ],
        }),
      );
      const responder = await harness.createExecution({ definition: responderRef });
      await harness.runUntilIdle();

      const requesterRef = await definitions.save(
        scriptedAgentDefinition({
          id: `requester-${mode}`,
          program: [
            {
              do: "ask",
              to: responder.executionId,
              body: { question: true },
              requestKey: "ask",
              interleave: { eventKinds: ["external.input"] },
            },
            terminalStep(mode),
          ],
        }),
      );
      const requester = await harness.createExecution({ definition: requesterRef });
      await harness.runUntilIdle();
      const [link] = await harness.peerRequestLinksOf(requester.executionId);
      assert.equal(link?.state, "open");
      assert.equal((await harness.waitForEdgesFrom(requester.executionId)).length, 1);

      if (mode === "CANCELLED") {
        await harness.cancelExecution({ executionId: requester.executionId });
      } else {
        await harness.deliverExternalInput({ destination: requester.executionId, label: "terminalize" });
        await harness.runUntilIdle();
      }

      assert.equal((await harness.inspect(requester.executionId))?.lifecycle, mode);
      assert.equal((await harness.peerRequestLink(link!.messageId))?.state, "abandoned");
      const pending = (await harness.pendingOperationsOf(requester.executionId)).find((operation) => operation.correlationId === "ask")!;
      assert.equal(pending.status, "abandoned");
      assert.deepEqual(await harness.waitForEdgesFrom(requester.executionId), []);
      assert.equal((await harness.inspect(responder.executionId))?.lifecycle, "WAITING", "the peer remains alive");

      // The peer can still run independently, but its late reply cannot settle or wake the source.
      await harness.deliverExternalInput({ destination: responder.executionId, label: "release" });
      await harness.runUntilIdle();
      const responderProgress = readScriptedProgress((await harness.inspect(responder.executionId))!.control.progress);
      assert.ok(
        responderProgress.observations.some((value) => (value as { code?: string }).code === "reply_request_abandoned"),
        "late reply is explicitly rejected",
      );
      assert.equal((await harness.peerRequestLink(link!.messageId))?.state, "abandoned");
    });

    test(`${mode} parent abandons a child call without cancelling the child`, async () => {
      const { harness, definitions } = createTestHarness({
        authorizer: createAllowListAuthorizer({ grants: [], spawn: true }),
      });
      await definitions.save(
        scriptedAgentDefinition({
          id: `child-${mode}`,
          program: [{ do: "await", eventKinds: ["external.input"] }, { do: "complete" }],
        }),
      );
      const parentRef = await definitions.save(
        scriptedAgentDefinition({
          id: `parent-${mode}`,
          program: [
            {
              do: "call",
              definitionId: `child-${mode}`,
              definitionVersion: 1,
              requestKey: "call",
              interleave: { eventKinds: ["external.input"] },
            },
            terminalStep(mode),
          ],
        }),
      );
      const parent = await harness.createExecution({ definition: parentRef, structuralSpawnBudget: 1 });
      await harness.runUntilIdle();
      const [link] = await harness.childExecutionLinksOf(parent.executionId);
      assert.equal(link?.state, "active");
      assert.equal((await harness.inspect(link!.childExecutionId))?.lifecycle, "WAITING");

      if (mode === "CANCELLED") {
        await harness.cancelExecution({ executionId: parent.executionId });
      } else {
        await harness.deliverExternalInput({ destination: parent.executionId, label: "terminalize" });
        await harness.runUntilIdle();
      }

      assert.equal((await harness.inspect(parent.executionId))?.lifecycle, mode);
      assert.equal((await harness.childExecutionLink(link!.childExecutionId))?.state, "abandoned");
      const pending = (await harness.pendingOperationsOf(parent.executionId)).find((operation) => operation.correlationId === "call")!;
      assert.equal(pending.status, "abandoned");
      assert.deepEqual(await harness.waitForEdgesFrom(parent.executionId), []);
      assert.equal((await harness.inspect(link!.childExecutionId))?.lifecycle, "WAITING", "the child remains alive");

      // Late child completion remains the child's own outcome and delivers nothing to its terminal parent.
      await harness.deliverExternalInput({ destination: link!.childExecutionId, label: "finish" });
      await harness.runUntilIdle();
      assert.equal((await harness.inspect(link!.childExecutionId))?.lifecycle, "COMPLETED");
      assert.equal((await harness.childExecutionLink(link!.childExecutionId))?.state, "abandoned");
      assert.equal((await harness.pendingOperation(pending.pendingOperationId))?.status, "abandoned");
    });
  }
});
