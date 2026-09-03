/**
 * The A↔B liveness proof (Slice E.1).
 *
 * ```text
 * A ask B   ("need value B")            A waits for B's reply, but interleaves on peer.message
 * B ask A   ("need clarification")      B waits for A's reply, but interleaves on peer.message
 * A processes B's ask while its own is still pending  -> A replies -> A returns to waiting
 * B receives A's reply -> B replies to A -> A's original ask settles -> both complete
 * ```
 *
 * The cycle progresses because both controllers opted into peer-message interleaving. Neither ask
 * was rejected for being cyclic; the cycle was never treated as a deadlock.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createAllowListAuthorizer } from "@arrokothi/core/reference";
import { createTestHarness, readScriptedProgress, scriptedAgentDefinition } from "@arrokothi/core/testing";

const PEER_INTERLEAVE = { eventKinds: ["peer.message"] as const };

describe("A<->B ask cycle", () => {
  test("both Executions progress and complete; the original PendingOperations settle exactly", async () => {
    const { harness, definitions } = createTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [], message: true }),
    });

    // B needs no peer id baked in: it asks back whoever asked it, and replies to whoever asked it.
    const bRef = await definitions.save(
      scriptedAgentDefinition({
        id: "B",
        program: [
          { do: "await", eventKinds: ["peer.message"], interleave: PEER_INTERLEAVE }, // 0: receive A's ask
          { do: "ask_sender", body: { q: "need clarification" }, requestKey: "BA", interleave: PEER_INTERLEAVE }, // 1
          { do: "reply", body: { value: "B-value" } }, // 2: answer A's original ask
          { do: "complete" }, // 3
        ],
      }),
    );
    const b = await harness.createExecution({ definition: bRef });

    const aRef = await definitions.save(
      scriptedAgentDefinition({
        id: "A",
        program: [
          { do: "ask", to: b.executionId, body: { q: "need value B" }, requestKey: "AB", interleave: PEER_INTERLEAVE }, // 0
          { do: "reply", body: { clarification: "here it is" } }, // 1: answer B's ask (interleaved)
          { do: "await", eventKinds: ["peer.message"], correlationId: "AB", interleave: PEER_INTERLEAVE }, // 2: re-wait for B's reply
          { do: "complete" }, // 3
        ],
      }),
    );
    const a = await harness.createExecution({ definition: aRef });

    await harness.runUntilIdle();

    assert.equal((await harness.inspect(a.executionId))?.lifecycle, "COMPLETED", "A progressed to completion");
    assert.equal((await harness.inspect(b.executionId))?.lifecycle, "COMPLETED", "B progressed to completion");

    // Both original asks settled exactly once, as success, each with a distinct reply Event.
    const aAsk = (await harness.pendingOperationsOf(a.executionId)).find(
      (p) => p.effectKind === "send_message" && p.correlationId === "AB",
    )!;
    const bAsk = (await harness.pendingOperationsOf(b.executionId)).find(
      (p) => p.effectKind === "send_message" && p.correlationId === "BA",
    )!;
    assert.equal(aAsk.status, "settled");
    assert.equal(aAsk.outcome, "success");
    assert.equal(bAsk.status, "settled");
    assert.equal(bAsk.outcome, "success");
    assert.notEqual(aAsk.resultEventId, bAsk.resultEventId, "the two replies are distinct observations");

    // A received B's value; B received A's clarification.
    const aReply = readScriptedProgress((await harness.inspect(a.executionId))!.control.progress).peerMessages.find(
      (m) => m.inReplyToMessageId !== null,
    );
    assert.deepEqual(aReply?.body, { value: "B-value" });
    const bReply = readScriptedProgress((await harness.inspect(b.executionId))!.control.progress).peerMessages.find(
      (m) => m.inReplyToMessageId !== null,
    );
    assert.deepEqual(bReply?.body, { clarification: "here it is" });

    // No concurrent controller writer for either Execution: every RUNNING is closed before the next.
    for (const id of [a.executionId, b.executionId]) {
      const transitions = await harness.transitionsOf(id);
      let running = false;
      for (const t of transitions) {
        if (t.to === "RUNNING") {
          assert.equal(running, false, `${id} entered RUNNING while already RUNNING`);
          running = true;
        } else if (t.from === "RUNNING") {
          running = false;
        }
      }
    }

    // One blocked continuation never closed either mailbox: both consumed several Events across
    // several Activations.
    assert.ok(
      readScriptedProgress((await harness.inspect(a.executionId))!.control.progress).seenEvents.length >= 2,
      "A processed more than one Event",
    );

    // The peer request links both closed - the wait cycle is gone once the dependencies settled.
    assert.deepEqual(await harness.waitForEdgesFrom(a.executionId), []);
    assert.deepEqual(await harness.waitForEdgesFrom(b.executionId), []);
  });

  test("the wait cycle is observable while it exists, and neither ask was refused for being cyclic", async () => {
    const { harness, definitions } = createTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [], message: true }),
    });
    // Neither peer replies - they just ask each other and hold. The cycle stays open.
    const bRef = await definitions.save(
      scriptedAgentDefinition({
        id: "B-hold",
        program: [
          { do: "await", eventKinds: ["peer.message"] },
          { do: "ask_sender", body: {}, requestKey: "BA" },
          { do: "complete" },
        ],
      }),
    );
    const b = await harness.createExecution({ definition: bRef });
    const aRef = await definitions.save(
      scriptedAgentDefinition({
        id: "A-hold",
        program: [
          { do: "ask", to: b.executionId, body: {}, requestKey: "AB" },
          { do: "complete" },
        ],
      }),
    );
    const a = await harness.createExecution({ definition: aRef });
    await harness.runUntilIdle();

    // Both are alive and WAITING - neither FAILED, neither was terminated.
    assert.equal((await harness.inspect(a.executionId))?.lifecycle, "WAITING");
    assert.equal((await harness.inspect(b.executionId))?.lifecycle, "WAITING");

    const aEdges = await harness.waitForEdgesFrom(a.executionId);
    const bEdges = await harness.waitForEdgesFrom(b.executionId);
    assert.deepEqual(
      aEdges.map((e) => [e.kind, e.targetExecutionId]),
      [["peer_ask", b.executionId]],
      "A -> B is in the wait graph",
    );
    assert.deepEqual(
      bEdges.map((e) => [e.kind, e.targetExecutionId]),
      [["peer_ask", a.executionId]],
      "B -> A is in the wait graph - a cycle, surfaced as diagnostics only",
    );
  });
});
