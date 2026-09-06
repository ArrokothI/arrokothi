import assert from "node:assert/strict";
import { test } from "node:test";
import { createPatternApp } from "./patterns.ts";
import { settleOffline } from "./settle.ts";

const save = (title: string) => ({ output: { capabilityCalls: [{ id: "save", capability: "memory_write_title", input: { value: title } }] } });
const publish = (title: string) => ({ output: { capabilityCalls: [{ id: "publish", capability: "articles_publish", input: { title } }] } });
const say = (text: string) => ({ output: { text } });

test("multiple turns: committed memory reaches context, exact approval publishes once, responses keep the Agent alive", async () => {
  const app = createPatternApp([save("A useful guide"), say("Title saved."), publish("A useful guide"), say("Published."), publish("A useful guide"), say("Already published.")]);
  const id = await app.startConversation("Use the title A useful guide");
  assert.equal((await settleOffline(app.harness, id)).lifecycle, "WAITING");
  assert.equal((await app.harness.structuredMemoryOf(id))?.values["title"]?.value, "A useful guide");
  assert.match(app.provider.requests[1]?.system ?? "", /A useful guide/);
  await app.harness.deliverExternalInput({ destination: id, label: "user", payload: "Publish it" });
  await settleOffline(app.harness, id);
  const [confirmation] = await app.harness.pendingConfirmations();
  assert.ok(confirmation);
  assert.deepEqual(confirmation.proposal.kind === "use_capability" && confirmation.proposal.input, { title: "A useful guide" });
  assert.equal(app.articles.size, 0);
  assert.equal((await app.harness.resolveConfirmation({ confirmationId: confirmation.confirmationId, decision: "approve" })).status, "dispatched");
  assert.equal((await app.harness.resolveConfirmation({ confirmationId: confirmation.confirmationId, decision: "approve" })).status, "already_resolved");
  assert.equal((await settleOffline(app.harness, id)).lifecycle, "WAITING");
  assert.deepEqual([...app.articles.values()], ["A useful guide"]);
  await app.harness.deliverExternalInput({ destination: id, label: "user", payload: "Publish the same title again" });
  await settleOffline(app.harness, id);
  assert.equal((await app.harness.pendingConfirmations()).length, 0, "the known duplicate replays before redundant confirmation");
  assert.equal(app.articles.size, 1, "application-owned unique key prevents duplicate publication");
  assert.equal(app.publisherCalls.length, 1, "runtime per_input recognition prevents a second in-process dispatch");
  assert.ok((await app.harness.effectJournalOf(id)).some((entry) => entry.phase === "replayed"));
  assert.equal((await app.harness.emissionsOf(id)).length, 3, "host must track a cursor to avoid showing old emissions again");
});

test("a publish before a committed title is denied even when the model claims success", async () => {
  const app = createPatternApp([publish("Invented title"), say("Published!")]);
  const id = await app.startConversation("Publish something");
  await settleOffline(app.harness, id);
  assert.equal(app.articles.size, 0);
  assert.equal((await app.harness.pendingConfirmations()).length, 0);
  assert.ok((await app.harness.effectJournalOf(id)).some((entry) => entry.phase === "denied"));
});

test("a changed title is checked within the turn, without a stale host gate flag", async () => {
  const app = createPatternApp([save("First title"), say("Saved"), save("Second title"), publish("First title"), say("That title is stale")]);
  const id = await app.startConversation("First title");
  await settleOffline(app.harness, id);
  await app.harness.deliverExternalInput({ destination: id, label: "user", payload: "Change to Second title" });
  await settleOffline(app.harness, id);
  assert.equal((await app.harness.structuredMemoryOf(id))?.values["title"]?.value, "Second title");
  assert.equal(app.articles.size, 0);
  assert.ok((await app.harness.effectJournalOf(id)).some((entry) => entry.phase === "denied"));
});

test("invalid memory values are rejected and never become application facts", async () => {
  const app = createPatternApp([save("x"), say("Could not save")]);
  const id = await app.startConversation("x");
  await settleOffline(app.harness, id);
  assert.equal((await app.harness.structuredMemoryOf(id))?.values["title"], undefined);
  assert.equal(app.articles.size, 0);
});

test("declining a conversational action leaves the world unchanged and allows another turn", async () => {
  const app = createPatternApp([save("Draft title"), publish("Draft title"), say("Publication cancelled")]);
  const id = await app.startConversation("Save and publish Draft title");
  await settleOffline(app.harness, id);
  const [confirmation] = await app.harness.pendingConfirmations();
  assert.ok(confirmation);
  await app.harness.resolveConfirmation({ confirmationId: confirmation.confirmationId, decision: "decline" });
  assert.equal((await settleOffline(app.harness, id)).lifecycle, "WAITING");
  assert.equal(app.articles.size, 0);
  assert.match(app.provider.requests.at(-1)?.messages.at(-1)?.content ?? "", /declin/i);
});

test("maxModelCalls is an Execution-wide budget, not a fresh budget on each user turn", async () => {
  const app = createPatternApp([say("First reply"), say("Must not run")]);
  const id = await app.startConversation("Hello", 1);
  await settleOffline(app.harness, id);
  await app.harness.deliverExternalInput({ destination: id, label: "user", payload: "Again" });
  const context = await settleOffline(app.harness, id);
  assert.equal(context.lifecycle, "FAILED");
  assert.equal(app.provider.invocationCount, 1);
  assert.equal(context.failure?.code, "agent_model_call_budget_exhausted");
});

test("Workflow calls a terminal Agent child, then a Function Stage awaits actual publication", async () => {
  const app = createPatternApp([say("A reviewed title")]);
  const id = await app.startWorkflow("Explain application construction");
  await settleOffline(app.harness, id);
  const [link] = await app.harness.childExecutionLinksOf(id);
  assert.ok(link);
  const child = await app.harness.inspect(link.childExecutionId);
  assert.equal(child?.lifecycle, "COMPLETED");
  assert.equal(child?.terminalResult?.value, "A reviewed title");
  assert.equal(await app.harness.structuredMemoryOf(link.childExecutionId), undefined);
  assert.deepEqual((await app.harness.effectiveOperationAuthorityOf(link.childExecutionId))?.operations, []);
  const [confirmation] = await app.harness.pendingConfirmations();
  assert.ok(confirmation);
  assert.equal(app.articles.size, 0);
  await app.harness.resolveConfirmation({ confirmationId: confirmation.confirmationId, decision: "approve" });
  const context = await settleOffline(app.harness, id);
  assert.equal(context.lifecycle, "COMPLETED");
  assert.equal(context.terminalResult?.value, null, "Stage receipt/emission does not automatically become the Workflow terminal value");
  assert.deepEqual([...app.articles.values()], ["A reviewed title"]);
  assert.match(JSON.stringify(await app.harness.emissionsOf(id)), /article-1/);
});

test("Workflow decline is handled as a failed business step, not successful barrier completion", async () => {
  const app = createPatternApp([say("Reviewed title")]);
  const id = await app.startWorkflow("A topic");
  await settleOffline(app.harness, id);
  const [confirmation] = await app.harness.pendingConfirmations();
  assert.ok(confirmation);
  await app.harness.resolveConfirmation({ confirmationId: confirmation.confirmationId, decision: "decline" });
  const context = await settleOffline(app.harness, id);
  assert.equal(context.lifecycle, "FAILED");
  assert.equal(context.failure?.code, "publication_declined");
  assert.equal(app.articles.size, 0);
});

test("child calls need lineage spawn credits as well as spawn permission", async () => {
  const app = createPatternApp([say("Must not run")]);
  const id = await app.startWorkflow("A topic", 0);
  const context = await settleOffline(app.harness, id);
  assert.equal(context.lifecycle, "FAILED");
  assert.equal(app.provider.invocationCount, 0);
  assert.equal((await app.harness.childExecutionLinksOf(id)).length, 0);
});
