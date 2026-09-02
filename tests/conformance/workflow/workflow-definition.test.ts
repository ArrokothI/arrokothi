/**
 * The Workflow definition is real topology, and it is checked before it can run.
 *
 * Slice A deliberately left `WorkflowSpec = JsonObject`. These cases prove the replacement: a
 * Workflow now declares an entry Stage, Stage definitions, predefined transitions, and completion
 * targets, all as portable data - and every statically knowable defect is refused at authoring time
 * rather than discovered several Activations into a run.
 *
 * The other half is what a definition may *not* contain. A Stage names application-wired code by
 * logical reference; it cannot carry the function, a provider client, a key, a store, or a resource's
 * contents. That rule is structural, so the tests below check the structure rather than trusting a
 * naming convention.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  defineWorkflow,
  definitionIntegrity,
  deserializeDefinition,
  InvalidDefinitionError,
  serializeDefinition,
  STAGE_KINDS,
  validateWorkflowSpec,
} from "@agent-sdk/core/execution";
import type { WorkflowSpecInput } from "@agent-sdk/core/execution";

/** One Workflow using all four canonical Stage kinds and both transition forms. */
const everyStageKind: WorkflowSpecInput = {
  entryStage: "parse",
  stages: [
    {
      id: "parse",
      kind: "function",
      implementationRef: "parse-document",
      config: { strict: true },
      transitions: { kind: "always", next: { to: "stage", stage: "classify" } },
    },
    {
      id: "classify",
      kind: "llm",
      model: { logicalRef: "primary", requirements: { text: true, structuredOutput: "required" } },
      system: "Classify the document.",
      prompt: "Document: {{input}}",
      transitions: {
        kind: "labeled",
        cases: [
          { label: "research", next: { to: "stage", stage: "researcher" } },
          { label: "pipeline", next: { to: "stage", stage: "sub-pipeline" } },
          { label: "done", next: { to: "complete" } },
        ],
      },
    },
    {
      id: "researcher",
      kind: "agent",
      child: { definitionId: "research-agent", definitionVersion: 3 },
      requestedOperations: [{ capability: "knowledge.query", operation: "search" }],
      transitions: { kind: "always", next: { to: "complete" } },
    },
    {
      id: "sub-pipeline",
      kind: "workflow",
      child: { definitionId: "nested-workflow", definitionVersion: 1 },
      transitions: { kind: "always", next: { to: "complete" } },
    },
  ],
};

function expectIssues(spec: unknown): readonly { code: string; path: string; message: string }[] {
  const result = validateWorkflowSpec(spec);
  assert.equal(result.ok, false, "expected this spec to be rejected");
  return result.ok ? [] : result.issues;
}

describe("Workflow definitions declare real topology", () => {
  test("the canonical four Stage kinds are the whole vocabulary", () => {
    assert.deepEqual([...STAGE_KINDS], ["function", "llm", "agent", "workflow"]);
    for (const invented of ["router", "classifier", "retriever", "aggregator", "gate", "guard"]) {
      assert.equal(
        (STAGE_KINDS as readonly string[]).includes(invented),
        false,
        `"${invented}" is a composition of Function/LLM Stages plus transitions, not a kernel Stage kind`,
      );
    }
  });

  test("a spec using all four Stage kinds validates and survives a JSON round trip", () => {
    const definition = defineWorkflow({ id: "every-kind", spec: everyStageKind });
    const round = deserializeDefinition(serializeDefinition(definition));
    assert.deepEqual(round, definition, "a Workflow definition is portable data");
    assert.equal(definitionIntegrity(round), definitionIntegrity(definition));
    assert.deepEqual(
      definition.spec.stages.map((stage) => stage.kind),
      ["function", "llm", "agent", "workflow"],
    );
  });

  test("Agent and Workflow Stages carry a child reference, never an inlined child definition", () => {
    const definition = defineWorkflow({ id: "children", spec: everyStageKind });
    const agentStage = definition.spec.stages.find((stage) => stage.kind === "agent");
    assert.ok(agentStage && agentStage.kind === "agent");
    assert.deepEqual(agentStage.child, { definitionId: "research-agent", definitionVersion: 3 });

    const inlined = expectIssues({
      entryStage: "child",
      stages: [
        {
          id: "child",
          kind: "agent",
          child: { definitionId: "a", definitionVersion: 1, spec: { anything: true } },
          transitions: { kind: "always", next: { to: "complete" } },
        },
      ],
    });
    assert.ok(
      inlined.some((issue) => issue.code === "invalid_child_ref"),
      "inlining a child's spec would flatten its topology into the parent graph",
    );
  });

  test("a missing entry Stage is rejected", () => {
    const issues = expectIssues({
      entryStage: "nowhere",
      stages: [{ id: "only", kind: "function", implementationRef: "f", transitions: { kind: "always", next: { to: "complete" } } }],
    });
    assert.ok(issues.some((issue) => issue.code === "missing_entry_stage"));
  });

  test("a transition to an undeclared Stage is rejected", () => {
    const issues = expectIssues({
      entryStage: "a",
      stages: [{ id: "a", kind: "function", implementationRef: "f", transitions: { kind: "always", next: { to: "stage", stage: "ghost" } } }],
    });
    assert.ok(issues.some((issue) => issue.code === "unknown_stage"));
  });

  test("duplicate Stage ids are rejected rather than silently deduplicated", () => {
    const issues = expectIssues({
      entryStage: "a",
      stages: [
        { id: "a", kind: "function", implementationRef: "one", transitions: { kind: "always", next: { to: "complete" } } },
        { id: "a", kind: "function", implementationRef: "two", transitions: { kind: "always", next: { to: "complete" } } },
      ],
    });
    assert.ok(issues.some((issue) => issue.code === "duplicate_stage_id"));
  });

  test("an invalid Stage kind is rejected", () => {
    const issues = expectIssues({
      entryStage: "a",
      stages: [{ id: "a", kind: "router", transitions: { kind: "always", next: { to: "complete" } } }],
    });
    assert.ok(issues.some((issue) => issue.code === "invalid_stage_kind"));
  });

  test("an invalid logical implementation ref is rejected", () => {
    const issues = expectIssues({
      entryStage: "a",
      stages: [{ id: "a", kind: "function", implementationRef: "", transitions: { kind: "always", next: { to: "complete" } } }],
    });
    assert.ok(issues.some((issue) => issue.code === "invalid_implementation_ref"));
  });

  test("a concrete provider or model in a Stage's model request is rejected", () => {
    const issues = expectIssues({
      entryStage: "a",
      stages: [
        {
          id: "a",
          kind: "llm",
          model: { logicalRef: "primary", provider: "gemini", model: "gemini-3.5-flash", requirements: { text: true } },
          system: "s",
          prompt: "p",
          transitions: { kind: "always", next: { to: "complete" } },
        },
      ],
    });
    assert.ok(
      issues.some((issue) => issue.code === "invalid_model_request"),
      "deployment resolution decides which provider and model a logical reference means",
    );
  });

  test("declared requirements must match declared behaviour", () => {
    const exposingWithoutRequiring = expectIssues({
      entryStage: "a",
      stages: [
        {
          id: "a",
          kind: "llm",
          model: { logicalRef: "primary", requirements: { text: true } },
          system: "s",
          prompt: "p",
          maxModelPhases: 2,
          callables: [{ name: "search", description: "d", input: { kind: "object", fields: {} }, capability: "c", operation: "o" }],
          transitions: { kind: "always", next: { to: "complete" } },
        },
      ],
    });
    assert.ok(exposingWithoutRequiring.some((issue) => issue.path.endsWith("requirements.capabilityCalls")));

    const branchingWithoutStructured = expectIssues({
      entryStage: "a",
      stages: [
        {
          id: "a",
          kind: "llm",
          model: { logicalRef: "primary", requirements: { text: true } },
          system: "s",
          prompt: "p",
          transitions: { kind: "labeled", cases: [{ label: "go", next: { to: "complete" } }] },
        },
      ],
    });
    assert.ok(branchingWithoutStructured.some((issue) => issue.path.endsWith("requirements.structuredOutput")));
  });

  test("a Stage exposing callables must declare more than one predetermined phase", () => {
    const issues = expectIssues({
      entryStage: "a",
      stages: [
        {
          id: "a",
          kind: "llm",
          model: { logicalRef: "primary", requirements: { text: true, capabilityCalls: "required" } },
          system: "s",
          prompt: "p",
          maxModelPhases: 1,
          callables: [{ name: "search", description: "d", input: { kind: "object", fields: {} }, capability: "c", operation: "o" }],
          transitions: { kind: "always", next: { to: "complete" } },
        },
      ],
    });
    assert.ok(
      issues.some((issue) => issue.path.endsWith("maxModelPhases")),
      "the final phase never exposes callables, so exposing them needs at least two phases",
    );
  });

  test("a malformed Adapter declaration is rejected", () => {
    const badKind = expectIssues({
      entryStage: "a",
      stages: [
        {
          id: "a",
          kind: "function",
          implementationRef: "f",
          inputAdapters: [{ kind: "retriever", implementationRef: "x" }],
          transitions: { kind: "always", next: { to: "complete" } },
        },
      ],
    });
    assert.ok(badKind.some((issue) => issue.code === "invalid_adapter"));

    const reachingForCapabilities = expectIssues({
      entryStage: "a",
      stages: [
        {
          id: "a",
          kind: "function",
          implementationRef: "f",
          outputAdapters: [{ kind: "function", implementationRef: "x", capabilities: ["knowledge.retrieval"] }],
          transitions: { kind: "always", next: { to: "complete" } },
        },
      ],
    });
    assert.ok(
      reachingForCapabilities.some((issue) => issue.code === "invalid_adapter"),
      "an Adapter transforms a boundary value; it cannot declare capabilities",
    );
  });

  test("a nonserializable spec is rejected", () => {
    const issues = expectIssues({
      entryStage: "a",
      stages: [
        {
          id: "a",
          kind: "function",
          implementationRef: "f",
          config: { run: () => "nope" },
          transitions: { kind: "always", next: { to: "complete" } },
        },
      ],
    });
    assert.ok(issues.some((issue) => issue.code === "not_serializable"));
  });

  test("defineWorkflow refuses to publish a malformed graph at all", () => {
    assert.throws(
      () =>
        defineWorkflow({
          id: "broken",
          spec: {
            entryStage: "a",
            stages: [{ id: "a", kind: "function", implementationRef: "f", transitions: { kind: "always", next: { to: "stage", stage: "b" } } }],
          },
        }),
      InvalidDefinitionError,
      "topology is statically knowable, so it is rejected statically",
    );
  });

  test("changing any part of the topology changes the definition digest", () => {
    const base = defineWorkflow({ id: "digest", spec: everyStageKind });
    const withDifferentModelRef = defineWorkflow({
      id: "digest",
      spec: {
        ...everyStageKind,
        stages: everyStageKind.stages.map((stage) =>
          stage.kind === "llm"
            ? { ...stage, model: { logicalRef: "reviewer", requirements: { text: true, structuredOutput: "required" as const } } }
            : stage,
        ),
      },
    });
    assert.notEqual(
      definitionIntegrity(base),
      definitionIntegrity(withDifferentModelRef),
      "a logical model reference is pinned topology, not deployment configuration",
    );

    const withDifferentTransition = defineWorkflow({
      id: "digest",
      spec: {
        ...everyStageKind,
        stages: everyStageKind.stages.map((stage) =>
          stage.id === "parse" ? { ...stage, transitions: { kind: "always" as const, next: { to: "complete" as const } } } : stage,
        ),
      },
    });
    assert.notEqual(definitionIntegrity(base), definitionIntegrity(withDifferentTransition));
  });
});
