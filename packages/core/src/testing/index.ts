export { ScriptedModelProvider, StaticModelProvider } from "./scripted-provider.ts";
export type { ScriptedStep } from "./scripted-provider.ts";
export { RecordingExecutor, successExecutor, failureExecutor, emailDryRun } from "./fake-executors.ts";
export type { RecordedCall } from "./fake-executors.ts";

// -- v0.4 Execution kernel ---------------------------------------------------
export { createTestHarness } from "./execution-harness.ts";
export type { TestHarnessBundle, TestHarnessOptions } from "./execution-harness.ts";
export {
  createScriptedAgentController,
  createScriptedWorkflowController,
  readScriptedProgress,
  scriptedAgentDefinition,
  scriptedWorkflowDefinition,
  INITIAL_SCRIPTED_PROGRESS,
} from "./scripted-controllers.ts";
export type {
  ScriptedControllerOptions,
  ScriptedControllerStep,
  ScriptedDefinitionInput,
  ScriptedProgress,
  ScriptedWorkGate,
} from "./scripted-controllers.ts";
export { createWorkflowTestHarness, modelAccess, recordingWorkflowTrace } from "./workflow.ts";
export { seedStructuredMemory } from "./structured-memory.ts";
export type { SeedStructuredMemoryWrite } from "./structured-memory.ts";
export { seedDerivedSemanticMemory } from "./derived-semantic-memory.ts";
export {
  agentModelAccess,
  createAgentTestHarness,
  recordingAgentTrace,
  referenceAgentExecutor,
} from "./agent.ts";
export type {
  AgentTestHarnessBundle,
  AgentTestHarnessOptions,
  CreateTestAgentInput,
  RecordingAgentTrace,
} from "./agent.ts";
export type {
  RecordingWorkflowTrace,
  WorkflowTestHarnessBundle,
  WorkflowTestHarnessOptions,
} from "./workflow.ts";
export {
  capabilityExecutorContract,
  definitionStoreContract,
  modelProviderContract,
  runtimeStoreContract,
  schedulerContract,
} from "./contracts/index.ts";
export type {
  CapabilityExecutorSubject,
  ContractCase,
  ModelProviderContractScenario,
  ModelProviderContractSubject,
} from "./contracts/index.ts";
