import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  knowledgeCapabilityName,
  type CapabilityOutcome,
  type ToolDefinition,
} from "../src/index.ts";
import { ScriptedModelProvider } from "../src/testing/scripted-provider.ts";
import { RecordingExecutor } from "../src/testing/fake-executors.ts";
import {
  ClaudeAgentHarness,
  type ClaudeAgentQueryInput,
  type ClaudeAgentQueryResult,
  type ClaudeExecutionAdapter,
} from "../../providers/claude-agent/src/index.ts";
import { buildRuntime, testDefinition } from "./helpers.ts";

class FakeClaudeAdapter implements ClaudeExecutionAdapter {
  readonly inputs: ClaudeAgentQueryInput[] = [];
  private readonly run: (input: ClaudeAgentQueryInput, call: number) => Promise<ClaudeAgentQueryResult>;

  constructor(run: (input: ClaudeAgentQueryInput, call: number) => Promise<ClaudeAgentQueryResult>) {
    this.run = run;
  }

  async execute(input: ClaudeAgentQueryInput): Promise<ClaudeAgentQueryResult> {
    this.inputs.push(input);
    return this.run(input, this.inputs.length);
  }
}

const DOC = {
  source: {
    id: "claude_docs",
    kind: "document" as const,
    title: "Claude docs test",
    description: "Read-only test evidence.",
    text: "The runtime-controlled answer is 42.",
  },
};

describe("ClaudeAgentHarness adapter", () => {
  it("maps Claude capability requests through the shared core gateway without a live API", async () => {
    const capability = knowledgeCapabilityName("document_search", "claude_docs");
    const seen: CapabilityOutcome[] = [];
    const adapter = new FakeClaudeAdapter(async (input) => {
      seen.push(await input.invokeCapability(capability, { query: "runtime-controlled answer" }, 1));
      return { text: "The answer is 42.", model: input.model, numTurns: 2, stopReason: "end_turn", terminalReason: "completed" };
    });
    const definition = testDefinition({
      model: { providerId: "claude", model: "claude-test" },
      planning: { mode: "deterministic" },
      knowledge: [DOC],
    });
    const planningOnly = new ScriptedModelProvider([]);
    const built = buildRuntime(planningOnly, { definition, harness: new ClaudeAgentHarness({ adapter }) });
    const sessionId = await built.runtime.createSession("claude-fake");
    const result = await built.runtime.runTurn({ sessionId, message: "Find the answer." });

    assert.equal(result.reply, "The answer is 42.");
    assert.equal(seen[0]?.kind, "completed");
    assert.ok(result.events.some((event) => event.type === "KnowledgeRetrieved"));
    assert.ok(result.events.some((event) => event.type === "DelegationCompleted"));
    assert.equal(adapter.inputs[0]?.maxTurns, definition.policies.maxAgentIterations);
    assert.equal(adapter.inputs[0]?.capabilities.some((candidate) => candidate.name === capability), true);
  });

  it("uses fresh execution context and lets durable PendingAction override speculative Claude text", async () => {
    const send: ToolDefinition = {
      name: "claude_send",
      description: "Send a message.",
      effect: "external_side_effect",
      confirmation: "required",
      idempotency: "per_input",
      argumentPolicies: { message: { kind: "model_composed" } },
      input: { kind: "object", fields: { message: { required: true, schema: { kind: "string" } } } },
      output: { kind: "object", additionalProperties: true, fields: {} },
    };
    const adapter = new FakeClaudeAdapter(async (input, call) => {
      if (call === 1) {
        await input.invokeCapability(send.name, { message: "Frozen Claude payload" }, 1);
        return { text: "The tool failed internally.", model: input.model, numTurns: 1, stopReason: "tool_deferred", terminalReason: "tool_deferred" };
      }
      return { text: "The frozen payload was sent.", model: input.model, numTurns: 1, terminalReason: "completed" };
    });
    const executor = new RecordingExecutor(() => ({ ok: true, output: { sent: true } }));
    const definition = testDefinition({
      model: { providerId: "claude", model: "claude-test" },
      planning: { mode: "deterministic" },
      knowledge: [],
      tools: [{ definition: send }],
    });
    const built = buildRuntime(new ScriptedModelProvider([]), {
      definition,
      harness: new ClaudeAgentHarness({ adapter, executionContextPolicy: "fresh_each_turn" }),
      registerTools: (tools) => tools.register(send.name, executor),
    });
    const sessionId = await built.runtime.createSession("claude-pending");
    const pending = await built.runtime.runTurn({ sessionId, message: "Send it." });
    assert.equal(pending.stopReason, "awaiting_confirmation");
    assert.doesNotMatch(pending.reply, /failed internally/);
    assert.deepEqual(pending.state.pendingAction?.args, { message: "Frozen Claude payload" });
    assert.equal(executor.callCount, 0);

    const confirmed = await built.runtime.runTurn({ sessionId, message: "Yes." });
    assert.equal(executor.callCount, 1);
    assert.deepEqual(executor.lastArgs, { message: "Frozen Claude payload" });
    assert.equal(confirmed.reply, "The frozen payload was sent.");
    assert.equal(adapter.inputs.length, 2, "each external user turn gets a fresh adapter execution");
  });

  it("rejects cross-turn Claude resume in v0.3", () => {
    assert.throws(() => new ClaudeAgentHarness({ executionContextPolicy: "resume" }), /deferred to v0\.4/);
  });

  it("keeps every Claude Agent SDK import outside core", () => {
    const root = join(process.cwd(), "core", "src");
    const files = walk(root).filter((path) => path.endsWith(".ts"));
    const coreText = files.map((path) => readFileSync(path, "utf8")).join("\n");
    assert.doesNotMatch(coreText, /@anthropic-ai\/claude-agent-sdk/);
    assert.match(readFileSync(join(process.cwd(), "providers", "claude-agent", "src", "index.ts"), "utf8"), /@anthropic-ai\/claude-agent-sdk/);
  });
});

function walk(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const full = join(path, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
