/**
 * @agent-sdk/core - an importable agent kernel.
 *
 * Zero runtime dependencies. No React/Next, no database, no web routes, no provider credentials.
 * Everything environment-specific is injected: a `ModelProvider`, a `SessionStore`, and a
 * `ToolExecutor` per tool.
 *
 * The shortest path to a running agent:
 *
 *   const runtime = new AgentRuntime({ definition, sessions, model, tools, knowledge });
 *   const sessionId = await runtime.createSession();
 *   const { reply } = await runtime.runTurn({ sessionId, message: "hello" });
 */

// -- schema -----------------------------------------------------------------
export { validateValue, validateObject, describeIssues, toJsonSchema } from "./schema/value-schema.ts";
export type { ValueSchema, ObjectSchema, FieldSpec, SchemaIssue, ValidationResult } from "./schema/value-schema.ts";

// -- definition --------------------------------------------------------------
export {
  defineAgent,
  nextVersion,
  definitionHash,
  definitionRef,
  validateDefinition,
  assertValidDefinition,
  serializeDefinition,
  deserializeDefinition,
} from "./definition/definition.ts";
export { DEFAULT_POLICIES } from "./definition/types.ts";
export type { AgentDefinition, DeterministicPolicies, DefinitionIssue } from "./definition/types.ts";
export { InMemoryDefinitionStore } from "./definition/store.ts";
export type { DefinitionStore } from "./definition/store.ts";

// -- memory ------------------------------------------------------------------
export { validateProposal, commitValue, memoryValues, changedOnTurn, isAuthoritative, findField } from "./memory/structured.ts";
export type { MemoryValidation, MemoryRejectionCode, CommitInput } from "./memory/structured.ts";
export { addNote, liveNotes, selectNotes } from "./memory/working.ts";
export type {
  StructuredMemory,
  StructuredMemorySchema,
  StructuredMemoryField,
  MemoryFieldSchema,
  MemoryValue,
  MemoryPrimitive,
  MemorySource,
  MemoryWriteProposal,
  WorkingNote,
} from "./memory/types.ts";

// -- host context ------------------------------------------------------------
export {
  observeHostContext,
  applyHostContext,
  modelVisibleContext,
  toolVisibleContext,
  findContextField,
  trustLabel,
} from "./context/host-context.ts";
export type {
  HostContextSchema,
  HostContextField,
  HostContextState,
  HostContextValue,
  HostContextInput,
  ContextLifecycle,
  ContextVisibility,
  ContextTrust,
} from "./context/types.ts";

// -- knowledge ---------------------------------------------------------------
export { KnowledgeIndex, createRetriever, chunkDocument, tokenize, renderRecord } from "./knowledge/in-memory.ts";
export { queryRecords } from "./knowledge/record-query.ts";
export type {
  KnowledgeSource,
  DocumentSource,
  RecordSetSource,
  KnowledgeBinding,
  KnowledgeChunk,
  KnowledgeQuery,
  KnowledgeRetriever,
  RecordQuery,
  RecordFilter,
  RecordFilterOp,
  RecordSort,
  RecordQueryResult,
  RecordQueryError,
} from "./knowledge/types.ts";

// -- tools -------------------------------------------------------------------
export { ToolRegistry } from "./tools/registry.ts";
export { idempotencyKey, findDuplicate, recordExecution, successfulEffects } from "./tools/idempotency.ts";
export type { ActionLedger, LedgerEntry } from "./tools/idempotency.ts";
export { attemptToolCall, resolvePendingConfirmation, grantKey } from "./tools/authorize.ts";
export type { AuthorizeDeps, ToolAttemptOutcome } from "./tools/authorize.ts";
export {
  createRecordQueryToolDefinition,
  createRecordQueryExecutor,
  parseRecordQueryArgs,
  recordQueryTools,
  recordQueryToolName,
} from "./tools/record-query-tool.ts";
export type {
  ToolDefinition,
  ToolBinding,
  ToolExecutor,
  ToolExecutionContext,
  ToolResult,
  ToolEffect,
  ToolConfirmation,
  ToolIdempotency,
  ToolRejection,
  ToolRejectionReason,
  AuthoritativeFact,
  BoundTool,
} from "./tools/types.ts";

// -- confirmation ------------------------------------------------------------
export { resolveConfirmation, ConservativeConfirmationResolver, defaultConfirmationPrompt } from "./confirmation/resolver.ts";
export type {
  PendingAction,
  PendingActionStatus,
  ConfirmationDecision,
  ConfirmationResolution,
  ConfirmationResolver,
} from "./confirmation/types.ts";

// -- session -----------------------------------------------------------------
export { applyEvent, project, resume, initialState, snapshotOf } from "./session/state.ts";
export type { SessionState, SessionSnapshot, TranscriptEntry, ToolResultRecord } from "./session/state.ts";
export { InMemorySessionStore } from "./session/store.ts";
export type { SessionStore, SessionRecord, CreateSessionInput, DraftEvent } from "./session/store.ts";
export { isEventOfType } from "./session/events.ts";
export type { SessionEvent, SessionEventType, SessionEventInput } from "./session/events.ts";

// -- flow --------------------------------------------------------------------
export { evaluateCondition, evaluateTransitions, findPhase } from "./flow/evaluate.ts";
export type {
  FlowDefinition,
  Phase,
  Transition,
  TransitionTiming,
  Condition,
  ConditionTrace,
  TransitionEvaluation,
} from "./flow/types.ts";

// -- compiler ----------------------------------------------------------------
export { compileContext, compileWithRetrieval } from "./compiler/context-compiler.ts";
export type { CompiledContext, CompiledContextSection, CompileInput } from "./compiler/context-compiler.ts";

// -- harness / runtime -------------------------------------------------------
export { TwoPassHarness } from "./harness/two-pass.ts";
export type { AgentHarness, HarnessServices, HarnessTurnInput, HarnessTurnResult, TurnStopReason } from "./harness/types.ts";
export { AgentRuntime } from "./runtime/runtime.ts";
export type { AgentRuntimeConfig, RunTurnInput, RunTurnResult } from "./runtime/runtime.ts";
export { TurnJournal } from "./runtime/journal.ts";

// -- provider ----------------------------------------------------------------
export { ModelProviderError } from "./provider/types.ts";
export type {
  ModelProvider,
  ModelPolicy,
  ModelRequest,
  ModelResponse,
  ModelMessage,
  ModelToolSpec,
  ModelToolCall,
  ModelUsage,
} from "./provider/types.ts";

// -- utilities ---------------------------------------------------------------
export { canonicalJson, hashValue, hashString } from "./util/hash.ts";
export { createDeterministicIds, createRandomIds, createSystemClock, createFixedClock } from "./util/ids.ts";
export type { IdGenerator, Clock } from "./util/ids.ts";
export { ok, err } from "./util/result.ts";
export type { Result, Ok, Err } from "./util/result.ts";
