/**
 * `SendMessage` as a real Harness-mediated peer interaction (Slice E.1).
 *
 * `send`, `ask`, and `reply` are the same Effect kind. They differ only in the completion dependency
 * they create. The sender never writes another Execution's mailbox; a controller never receives a
 * mailbox handle. A message/correlation id is integrity data, not a credential.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createAllowListAuthorizer } from "@agent-sdk/core/reference";
import { createTestHarness, readScriptedProgress, scriptedAgentDefinition } from "@agent-sdk/core/testing";
import type { ScriptedControllerStep } from "@agent-sdk/core/testing";

function rig(message: Parameters<typeof createAllowListAuthorizer>[0]["message"] = true) {
  return createTestHarness({ authorizer: createAllowListAuthorizer({ grants: [], message }) });
}

/** A peer that holds forever on a primary dependency but interleaves on peer messages. */
const HOLD_INTERLEAVING: ScriptedControllerStep = {
  do: "await",
  eventKinds: ["external.input"],
  correlationId: "never",
  interleave: { eventKinds: ["peer.message"] },
};

describe("send", () => {
  test("an authorized send delivers exactly one peer.message and the sender gets exactly one message.sent", async () => {
    const { harness, definitions } = rig();
    const recipRef = await definitions.save(
      scriptedAgentDefinition({ id: "recip", program: [HOLD_INTERLEAVING, { do: "observe" }, { do: "complete" }] }),
    );
    const recip = await harness.createExecution({ definition: recipRef });
    await harness.runUntilIdle();

    const senderRef = await definitions.save(
      scriptedAgentDefinition({
        id: "sender",
        program: [{ do: "send", to: recip.executionId, body: { hi: 1 }, requestKey: "s1" }, { do: "complete" }],
      }),
    );
    const sender = await harness.createExecution({ definition: senderRef });
    await harness.runUntilIdle();

    const sc = readScriptedProgress((await harness.inspect(sender.executionId))!.control.progress);
    assert.equal((await harness.inspect(sender.executionId))?.lifecycle, "COMPLETED");
    assert.deepEqual(sc.seenKinds, ["message.sent"], "the sender's acknowledgement, exactly once");
    const ack = sc.observations[0] as { to: string; messageId: string };
    assert.equal(ack.to, recip.executionId);

    const rc = readScriptedProgress((await harness.inspect(recip.executionId))!.control.progress);
    assert.deepEqual(rc.seenKinds, ["peer.message"], "the recipient observed exactly one message");
    assert.equal(rc.peerMessages.length, 1);
    assert.equal(rc.peerMessages[0]!.fromExecutionId, sender.executionId, "source identity is runtime-owned");
    assert.equal(rc.peerMessages[0]!.expectsReply, false);
    assert.equal(rc.peerMessages[0]!.messageId, ack.messageId, "sender ack and delivered message share the id");
  });

  test("recipient processing is distinct from the sender's delivery acknowledgement", async () => {
    const { harness, definitions } = rig();
    // The recipient is WAITING and does not interleave, so it never processes the message - but the
    // sender is still acknowledged, because "sent" means admitted, not processed.
    const recipRef = await definitions.save(
      scriptedAgentDefinition({
        id: "quiet",
        program: [{ do: "await", eventKinds: ["external.input"], correlationId: "never" }, { do: "complete" }],
      }),
    );
    const recip = await harness.createExecution({ definition: recipRef });
    await harness.runUntilIdle();

    const senderRef = await definitions.save(
      scriptedAgentDefinition({
        id: "sender2",
        program: [{ do: "send", to: recip.executionId, body: {}, requestKey: "s1" }, { do: "complete" }],
      }),
    );
    const sender = await harness.createExecution({ definition: senderRef });
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(sender.executionId))?.lifecycle, "COMPLETED", "sender acknowledged");
    assert.equal((await harness.inspect(recip.executionId))?.lifecycle, "WAITING", "recipient never woke");
    assert.deepEqual(
      readScriptedProgress((await harness.inspect(recip.executionId))!.control.progress).seenKinds,
      [],
      "the message is in the mailbox, unprocessed",
    );
  });
});

describe("ask", () => {
  test("the ask PendingOperation stays pending after delivery, and only the exact peer reply settles it", async () => {
    const { harness, definitions } = rig();
    const bRef = await definitions.save(
      scriptedAgentDefinition({
        id: "B",
        program: [HOLD_INTERLEAVING, { do: "reply", body: { answer: 42 } }, { do: "complete" }],
      }),
    );
    const b = await harness.createExecution({ definition: bRef });
    await harness.runUntilIdle();

    const aRef = await definitions.save(
      scriptedAgentDefinition({
        id: "A",
        program: [{ do: "ask", to: b.executionId, body: { q: "value?" }, requestKey: "a1" }, { do: "complete" }],
      }),
    );
    const a = await harness.createExecution({ definition: aRef });

    // Run A's first Activation only: it proposes the ask and should be WAITING with a pending op.
    await harness.runOnce();
    const aPendingAfterAsk = (await harness.pendingOperationsOf(a.executionId)).find((p) => p.effectKind === "send_message");
    assert.equal(aPendingAfterAsk?.status, "pending", "the ask is still owed a reply");
    assert.equal((await harness.inspect(a.executionId))?.lifecycle, "WAITING");
    const [link] = await harness.peerRequestLinksOf(a.executionId);
    assert.equal(link?.state, "open");
    assert.equal(link?.responderExecutionId, b.executionId);

    // Now let B interleave, reply, and A progress.
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(a.executionId))?.lifecycle, "COMPLETED");
    assert.equal((await harness.inspect(b.executionId))?.lifecycle, "COMPLETED");

    const aFinal = (await harness.pendingOperationsOf(a.executionId)).find((p) => p.effectKind === "send_message")!;
    assert.equal(aFinal.status, "settled");
    assert.equal(aFinal.outcome, "success");
    const aProgress = readScriptedProgress((await harness.inspect(a.executionId))!.control.progress);
    const replyBody = aProgress.peerMessages.find((m) => m.inReplyToMessageId !== null);
    assert.deepEqual(replyBody?.body, { answer: 42 }, "the asker received the reply body with the original correlation");
    assert.equal((await harness.peerRequestLink(link!.messageId))?.state, "settled", "the link closed exactly once");
  });

  test("a duplicate reply cannot settle the request twice", async () => {
    const { harness, definitions } = rig();
    const bRef = await definitions.save(
      scriptedAgentDefinition({
        id: "B-dup",
        program: [
          HOLD_INTERLEAVING,
          { do: "reply", body: { first: true }, requestKey: "r1" },
          // A second reply to the same request - it must be refused.
          { do: "reply", body: { second: true }, requestKey: "r2", await: true },
          { do: "complete" },
        ],
      }),
    );
    const b = await harness.createExecution({ definition: bRef });
    await harness.runUntilIdle();
    const aRef = await definitions.save(
      scriptedAgentDefinition({
        id: "A-dup",
        program: [{ do: "ask", to: b.executionId, body: {}, requestKey: "a1" }, { do: "complete" }],
      }),
    );
    const a = await harness.createExecution({ definition: aRef });
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(a.executionId))?.lifecycle, "COMPLETED", "A settled once");
    const bProgress = readScriptedProgress((await harness.inspect(b.executionId))!.control.progress);
    const rejection = bProgress.observations.find(
      (o) => (o as { code?: string }).code === "reply_already_settled",
    );
    assert.ok(rejection, "the second reply was refused as already-settled");
    // A saw exactly one reply.
    const aReplies = readScriptedProgress((await harness.inspect(a.executionId))!.control.progress).peerMessages.filter(
      (m) => m.inReplyToMessageId !== null,
    );
    assert.equal(aReplies.length, 1, "the asker's pending operation settled exactly once");
  });

  test("a third Execution cannot settle someone else's ask, even holding the message id", async () => {
    const { harness, definitions } = rig();
    const bRef = await definitions.save(
      scriptedAgentDefinition({ id: "B-int", program: [{ do: "await", eventKinds: ["external.input"], correlationId: "never" }, { do: "complete" }] }),
    );
    const b = await harness.createExecution({ definition: bRef });
    await harness.runUntilIdle();
    const aRef = await definitions.save(
      scriptedAgentDefinition({ id: "A-int", program: [{ do: "ask", to: b.executionId, body: {}, requestKey: "a1" }, { do: "complete" }] }),
    );
    const a = await harness.createExecution({ definition: aRef });
    await harness.runUntilIdle();
    const [link] = await harness.peerRequestLinksOf(a.executionId);

    // C knows the message id (a test hands it in) and tries to reply. It is not the addressee.
    const cRef = await definitions.save(
      scriptedAgentDefinition({
        id: "C",
        program: [{ do: "reply", body: { forged: true }, toMessageId: link!.messageId, requestKey: "c1" }, { do: "complete" }],
      }),
    );
    const c = await harness.createExecution({ definition: cRef });
    await harness.runUntilIdle();

    const cProgress = readScriptedProgress((await harness.inspect(c.executionId))!.control.progress);
    assert.equal(
      (cProgress.observations[0] as { code?: string }).code,
      "reply_not_addressee",
      "the runtime checks the responder identity, not the id",
    );
    assert.equal((await harness.inspect(a.executionId))?.lifecycle, "WAITING", "A's ask is still unsettled");
    assert.equal((await harness.peerRequestLink(link!.messageId))?.state, "open");
  });
});

describe("reply authorization", () => {
  test("a responder whose current policy denies messaging cannot reply, despite holding the request metadata", async () => {
    // A different policy per Execution: A may message (it must, to create the request); B may not.
    const permitA = createAllowListAuthorizer({ grants: [], message: true });
    const denyB = createAllowListAuthorizer({ grants: [], message: false });
    let aId = "";
    const { harness, definitions } = createTestHarness({
      authorizer: {
        authorize: (request) => (request.executionId === aId ? permitA.authorize(request) : denyB.authorize(request)),
      },
    });

    const bRef = await definitions.save(
      scriptedAgentDefinition({
        id: "B-noauth",
        program: [
          { do: "await", eventKinds: ["external.input"], correlationId: "never", interleave: { eventKinds: ["peer.message"] } },
          { do: "reply", body: { answer: 1 }, requestKey: "r1", await: true },
          { do: "complete" },
        ],
      }),
    );
    const b = await harness.createExecution({ definition: bRef });
    await harness.runUntilIdle();
    const aRef = await definitions.save(
      scriptedAgentDefinition({ id: "A-noauth", program: [{ do: "ask", to: b.executionId, body: {}, requestKey: "a1" }, { do: "complete" }] }),
    );
    const a = await harness.createExecution({ definition: aRef });
    aId = a.executionId;
    await harness.runUntilIdle();

    const bProgress = readScriptedProgress((await harness.inspect(b.executionId))!.control.progress);
    assert.equal(
      (bProgress.observations.find((o) => (o as { code?: string }).code) as { code?: string } | undefined)?.code,
      "message_not_authorized",
      "the reply was denied - request metadata is not a capability token",
    );
    const [link] = await harness.peerRequestLinksOf(a.executionId);
    assert.equal((await harness.peerRequestLink(link!.messageId))?.state, "open", "A's ask is still unsettled");
    assert.equal((await harness.inspect(a.executionId))?.lifecycle, "WAITING");
  });

  test("policy deny on the send is an effect.denied, and it is decided before any destination lookup", async () => {
    const { harness, definitions } = rig(false); // messaging denied
    const senderRef = await definitions.save(
      scriptedAgentDefinition({
        id: "denied-sender",
        program: [
          { do: "propose_effect", effect: { kind: "send_message", to: "exe_does_not_exist", body: {} }, await: true },
          { do: "complete" },
        ],
      }),
    );
    const sender = await harness.createExecution({ definition: senderRef });
    await harness.runUntilIdle();
    const progress = readScriptedProgress((await harness.inspect(sender.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["effect.denied"], "denied, not rejected");
    assert.equal((progress.observations[0] as { code: string }).code, "message_not_authorized");
  });

  test("an authorized send to an unknown destination is an explicit rejection", async () => {
    const { harness, definitions } = rig();
    const senderRef = await definitions.save(
      scriptedAgentDefinition({
        id: "to-nowhere",
        program: [
          { do: "propose_effect", effect: { kind: "send_message", to: "exe_nobody", body: {} }, await: true },
          { do: "complete" },
        ],
      }),
    );
    const sender = await harness.createExecution({ definition: senderRef });
    await harness.runUntilIdle();
    const progress = readScriptedProgress((await harness.inspect(sender.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["effect.rejected"]);
    assert.equal((progress.observations[0] as { code: string }).code, "message_destination_not_found");
    assert.deepEqual(await harness.peerRequestLinksOf(sender.executionId), [], "no half-created link");
  });
});
