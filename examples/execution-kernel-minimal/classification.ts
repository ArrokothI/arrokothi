/** Fixed model classification: the model selects a declared label, never a Stage ID. */
import { createApplication, defineWorkflow } from "@arrokothi/sdk";
import type { WorkflowModelAccess } from "@arrokothi/core";


export const classificationWorkflow = () => defineWorkflow({
  id: "classify-draft",
  spec: {
    entryStage: "classify",
    stages: [
      {
        id: "classify", kind: "llm",
        // Definition requirements are distinct from deployment's advertised portableFeatures.
        model: { logicalRef: "primary", requirements: { text: true, structuredOutput: "required" } },
        system: "Classify whether this draft needs a human review. Return the declared transition and a short reason.",
        prompt: "Draft: {{input}}",
        maxModelPhases: 1, // One classification, no tool calls.
        transitions: { kind: "labeled", cases: [
          { label: "ready", next: { to: "stage", stage: "ready" } },
          { label: "needs_review", next: { to: "stage", stage: "review" } },
        ] },
      },
      { id: "ready", kind: "function", implementationRef: "record", config: { category: "ready" }, transitions: { kind: "always", next: { to: "complete" } } },
      { id: "review", kind: "function", implementationRef: "record", config: { category: "needs_review" }, transitions: { kind: "always", next: { to: "complete" } } },
    ],
  },
});

export async function startClassification(models: WorkflowModelAccess, draft: string) {
  const application = createApplication({
    models: { resolver: models.resolver, providers: models.providers },
    functions: { record: (context) => {
      const result = JSON.stringify({ category: context.config["category"], reason: context.input });
      return { status: "completed", result, emissions: [{ body: { kind: "text", text: result } }] };
    } },
    // No capabilities, operation grants, or authorizer needed: this process only computes/emits.
  });
  const { executionId } = await application.start({
    definition: classificationWorkflow(), input: { label: "draft", payload: draft },
  });
  return { application, harness: application.harness, executionId };
}
