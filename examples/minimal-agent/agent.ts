import type { AgentDefinition } from "@agent-sdk/core";
import { defineAgent } from "@agent-sdk/core";

/**
 * The smallest agent that is still a real agent.
 *
 * No flow, no tools, no knowledge - just a goal, three typed memory fields, and one piece of host
 * context. It exists to show that phases and tools are genuinely optional: ordinary conversation
 * does not become a form.
 */
export const minimalAgent: AgentDefinition = defineAgent({
  id: "minimal-agent",
  name: "Minimal Agent",
  description: "A support triage agent with typed memory and no tools, flow, or knowledge.",
  goal: "Help a caller describe their problem clearly, and record the few facts a human would need to pick it up.",
  model: { providerId: "gemini", model: "gemini-3.5-flash-lite", temperature: 0.2 },
  globalRules: [
    "Never claim to have opened a ticket, emailed anyone, or contacted a team - you have no tools.",
    "Ask at most one question per reply.",
  ],
  memorySchema: {
    fields: [
      { key: "problem_summary", schema: { kind: "string", maxLength: 300 }, description: "What is going wrong, in the caller's own terms" },
      { key: "severity", schema: { kind: "enum", choices: ["low", "medium", "high", "critical"] }, description: "How badly it is affecting them" },
      { key: "affected_users", schema: { kind: "number", min: 0, max: 1_000_000, integer: true }, description: "How many people are affected" },
      { key: "first_noticed", schema: { kind: "string" }, description: "When they first noticed it" },
    ],
  },
  hostContextSchema: {
    fields: [
      { key: "plan_tier", schema: { kind: "enum", choices: ["free", "pro", "enterprise"] }, lifecycle: "session", visibility: "model", trust: "trusted_host", description: "The caller's support plan" },
      { key: "current_page", schema: { kind: "string" }, lifecycle: "turn", visibility: "model", trust: "trusted_host" },
      { key: "account_secret", schema: { kind: "string" }, lifecycle: "fixed", visibility: "runtime_only", trust: "trusted_host", description: "Never shown to the model" },
    ],
  },
  policies: { maxSteps: 3, maxToolCallsPerTurn: 0 },
});
