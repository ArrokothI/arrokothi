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
export type { ScriptedControllerStep, ScriptedDefinitionInput, ScriptedProgress } from "./scripted-controllers.ts";
export {
  capabilityExecutorContract,
  definitionStoreContract,
  runtimeStoreContract,
  schedulerContract,
} from "./contracts/index.ts";
export type { CapabilityExecutorSubject, ContractCase } from "./contracts/index.ts";
