import assert from "node:assert/strict";
import { createPatternApp } from "./patterns.ts";

const conversation = createPatternApp([
  { output: { capabilityCalls: [{ id: "save", capability: "memory_write_title", input: { value: "Building useful applications" } }] } },
  { output: { text: "Title saved. Ready when you are." } },
  { output: { capabilityCalls: [{ id: "publish", capability: "articles_publish", input: { title: "Building useful applications" } }] } },
  { output: { text: "Published with receipt article-1." } },
]);
const id = await conversation.startConversation("Title it Building useful applications");
assert.equal((await conversation.application.runUntilBlocked(id)).reason, "input_required");
console.log("Committed title:", (await conversation.harness.structuredMemoryOf(id))?.values["title"]?.value);
await conversation.harness.deliverExternalInput({ destination: id, label: "user", payload: "Publish it" });
assert.equal((await conversation.application.runUntilBlocked(id)).reason, "confirmation_required");
const [confirmation] = await conversation.harness.pendingConfirmations();
assert.ok(confirmation);
console.log("Exact proposal awaiting approval:", confirmation.proposal);
assert.equal(conversation.articles.size, 0);
// Simulated approval ONLY for this offline fake publisher. Real applications use a trusted human UI.
await conversation.harness.resolveConfirmation({ confirmationId: confirmation.confirmationId, decision: "approve" });
assert.equal((await conversation.application.runUntilBlocked(id)).reason, "input_required");
assert.equal(conversation.articles.size, 1);
console.log("Published records:", [...conversation.articles]);

const workflow = createPatternApp([{ output: { text: "A reviewed title" } }]);
const workflowId = await workflow.startWorkflow("Explain how to build an application");
assert.equal((await workflow.application.runUntilBlocked(workflowId)).reason, "confirmation_required");
const [approval] = await workflow.harness.pendingConfirmations();
assert.ok(approval);
await workflow.harness.resolveConfirmation({ confirmationId: approval.confirmationId, decision: "approve" });
const result = await workflow.application.runUntilBlocked(workflowId);
assert.equal(result.reason, "completed");
const completed = result.execution;
assert.equal(completed.lifecycle, "COMPLETED");
assert.equal(workflow.articles.size, 1);
console.log("Workflow:", completed.lifecycle, "terminal value:", completed.terminalResult?.value);
console.log("Workflow receipt emission:", (await workflow.harness.emissionsOf(workflowId)).map((e) => e.body));
