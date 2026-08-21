import type { AgentDefinition } from "../definition/types.ts";
import type { ToolRegistry } from "./registry.ts";
import type { ToolArgumentSource, ToolDefinition, ToolRejection, ToolResult } from "./types.ts";
import type { TurnJournal } from "../runtime/journal.ts";
import type { ConfirmationResolver } from "../confirmation/types.ts";
import type { Clock, IdGenerator } from "../util/ids.ts";
import { describeIssues, validateObject } from "../schema/value-schema.ts";
import { findDuplicate, idempotencyKey } from "./idempotency.ts";
import { hashValue } from "../util/hash.ts";
import { defaultConfirmationPrompt } from "../confirmation/resolver.ts";
import { findPhase } from "../flow/evaluate.ts";
import { authorityFor, isAuthoritative, validateProposal } from "../memory/structured.ts";
import { toolVisibleContext } from "../context/host-context.ts";

/**
 * Tool authorization and execution.
 *
 * The model REQUESTS; this module DECIDES. Every check here is deterministic and every outcome is
 * an event, so "did the action run, and why" is always answerable from the stream without asking a
 * model to adjudicate.
 *
 * Order (any failure stops the pipeline):
 *   1. bound to this agent
 *   2. permitted in the current phase
 *   3. arguments validate against the declared schema
 *   4. no argument rests solely on a non-authoritative source (side-effecting tools only)
 *   5. idempotency - a completed identical action replays instead of re-running
 *   6. confirmation - a `required` tool needs a RESOLVED PendingAction
 *   7. execute
 */

export interface AuthorizeDeps {
  definition: AgentDefinition;
  tools: ToolRegistry;
  journal: TurnJournal;
  confirmationResolver: ConfirmationResolver;
  ids: IdGenerator;
  clock: Clock;
  /**
   * Consent grants earned on THIS turn, keyed `toolName:argsHash`.
   *
   * Populated only by `resolvePendingConfirmation` when a user message genuinely authorizes an
   * outstanding request. Keying on the payload hash is what makes consent non-transferable: if the
   * model re-requests the same tool with different arguments, the key does not match and a fresh
   * confirmation is demanded.
   */
  grants: Set<string>;
}

export function grantKey(toolName: string, argsHash: string): string {
  return `${toolName}:${argsHash}`;
}

export type ToolAttemptOutcome =
  | { kind: "executed"; result: ToolResult; requestId: string }
  | { kind: "replayed"; result: ToolResult; requestId: string }
  | { kind: "awaiting_confirmation"; requestId: string; promptText: string }
  | { kind: "rejected"; rejection: ToolRejection; requestId: string };

/** Phase scoping: the phase's `toolNames` list, when present, is a whitelist. */
function permittedInPhase(definition: AgentDefinition, phaseId: string | null, toolName: string): boolean {
  if (!definition.flow) return true;
  const phase = findPhase(definition.flow, phaseId);
  if (!phase) return true;
  if (!phase.toolNames) return true;
  return phase.toolNames.includes(toolName);
}

/**
 * Guards against a side effect resting on a guess using only declared, typed source paths.
 * There is intentionally no fallback substring search or inference over prose.
 */
function argumentsRestOnAuthoritativeSources(
  journal: TurnJournal,
  tool: ToolDefinition,
  args: Record<string, unknown>,
): { ok: true } | { ok: false; message: string } {
  if (tool.effect !== "external_side_effect") return { ok: true };

  const unsupported: string[] = [];
  for (const [key, value] of Object.entries(args)) {
    const policy = tool.argumentPolicies?.[key];
    if (!policy) {
      unsupported.push(`${key} has no declared argument-source policy`);
      continue;
    }
    if (policy.kind === "model_composed") continue;
    const supported = policy.sources.some((source) => {
      const candidate = authoritativeValue(journal, source);
      return candidate.found && typedEqual(value, candidate.value);
    });
    if (!supported) unsupported.push(`${key}=${JSON.stringify(value)}`);
  }

  if (unsupported.length) {
    return {
      ok: false,
      message:
        `argument(s) ${unsupported.join(", ")} do not exactly match any source allowed by the tool's ` +
        `typed argument policy. A working note, ` +
        `substring coincidence, confirmation, or an unverified inference cannot authorize an external side effect.`,
    };
  }
  return { ok: true };
}

function authoritativeValue(
  journal: TurnJournal,
  source: ToolArgumentSource,
): { found: true; value: unknown } | { found: false } {
  const [namespace, ...rest] = source.split(".");
  const key = rest.join(".");
  if (namespace === "memory") {
    const entry = journal.state.memory[key];
    return isAuthoritative(entry) ? { found: true, value: entry!.value } : { found: false };
  }
  if (namespace === "host_context") {
    const entry = toolVisibleContext(journal.state.hostContext)[key];
    return entry && entry.trust !== "user_claimed" ? { found: true, value: entry.value } : { found: false };
  }
  if (namespace === "tool_fact") {
    for (const result of journal.state.allToolResults.slice().reverse()) {
      if (!result.ok) continue;
      const fact = result.facts?.find((candidate) => candidate.key === key);
      if (fact) return { found: true, value: fact.value };
    }
  }
  return { found: false };
}

function typedEqual(actual: unknown, expected: unknown): boolean {
  if (typeof actual !== typeof expected) return false;
  if (typeof actual === "string" && typeof expected === "string") {
    return normalizeIdentifyingString(actual) === normalizeIdentifyingString(expected);
  }
  if (typeof actual === "number" || typeof actual === "boolean" || actual === null || expected === null) {
    return Object.is(actual, expected);
  }
  if (Array.isArray(actual) || Array.isArray(expected)) {
    return Array.isArray(actual) && Array.isArray(expected) && actual.length === expected.length && actual.every((value, index) => typedEqual(value, expected[index]));
  }
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function normalizeIdentifyingString(text: string): string {
  return text.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function commitToolFacts(
  deps: AuthorizeDeps,
  result: Extract<ToolResult, { ok: true }>,
  resultEventId: string,
  toolName: string,
  turn: number,
): void {
  for (const fact of result.facts ?? []) {
    if (fact.writeToMemory !== true) continue;
    const provenance = { kind: "tool_verified" as const, sourceEventIds: [resultEventId], sourceName: toolName };
    const proposed = deps.journal.append({
      type: "MemoryWriteProposed",
      turn,
      payload: { key: fact.key, value: fact.value, writeMechanism: "runtime_observation", provenance },
    });
    const validation = validateProposal(deps.definition.memorySchema, { key: fact.key, value: fact.value }, provenance.kind, { coerce: false });
    if (!validation.ok) {
      deps.journal.append({
        type: "MemoryWriteRejected",
        turn,
        payload: {
          key: fact.key,
          value: fact.value,
          code: validation.code,
          reason: validation.reason,
          writeMechanism: "runtime_observation",
          provenance,
          proposalEventId: proposed.id,
        },
      });
      continue;
    }
    const previous = deps.journal.state.memory[fact.key];
    if (previous && typedEqual(previous.value, validation.value)) continue;
    deps.journal.append({
      type: "MemoryWriteCommitted",
      turn,
      payload: {
        key: fact.key,
        value: validation.value,
        previousValue: previous?.value,
        writeMechanism: "runtime_observation",
        provenance,
        authority: authorityFor(validation.field, provenance.kind),
        normalized: validation.normalized || undefined,
        proposalEventId: proposed.id,
      },
    });
  }
}

/**
 * Runs one requested tool call through the full pipeline.
 *
 * `userMessage` is the current turn's user text, used only to resolve an outstanding confirmation.
 */
export async function attemptToolCall(
  deps: AuthorizeDeps,
  toolName: string,
  args: Record<string, unknown>,
  turn: number,
  requestedBy: "model" | "runtime" = "model",
): Promise<ToolAttemptOutcome> {
  const { definition, tools, journal, ids } = deps;
  const requestId = ids.next("act");

  journal.append({ type: "ToolRequested", turn, payload: { requestId, toolName, args, requestedBy } });

  const reject = (reason: ToolRejection["reason"], message: string): ToolAttemptOutcome => {
    journal.append({ type: "ToolCallRejected", turn, payload: { requestId, toolName, reason, message, args } });
    return { kind: "rejected", rejection: { reason, message }, requestId };
  };

  // 1. bound to this agent
  const definitionForTool = tools.getDefinition(toolName);
  if (!definitionForTool) {
    return reject("unknown_tool", `no tool named "${toolName}" is bound to agent "${definition.id}"`);
  }

  // 2. phase scoping
  if (!permittedInPhase(definition, journal.state.phaseId, toolName)) {
    return reject("not_permitted_in_phase", `tool "${toolName}" is not permitted in phase "${journal.state.phaseId}"`);
  }

  // 3. argument schema
  const validation = validateObject(definitionForTool.input, args, { coerce: true });
  if (!validation.ok) {
    return reject("invalid_arguments", `arguments failed validation: ${describeIssues(validation.issues)}`);
  }
  const validatedArgs = validation.value as Record<string, unknown>;

  // 4. authoritative-source check for side effects
  const sourced = argumentsRestOnAuthoritativeSources(journal, definitionForTool, validatedArgs);
  if (!sourced.ok) {
    return reject("non_authoritative_argument_source", sourced.message);
  }

  // 5. idempotency
  const key = idempotencyKey(definitionForTool, validatedArgs, requestId);
  const duplicate = findDuplicate(journal.state.ledger, definitionForTool, key);
  if (duplicate && duplicate.result.ok) {
    journal.append({
      type: "ToolExecutionSucceeded",
      turn,
      payload: {
        requestId,
        toolName,
        output: duplicate.result.output,
        facts: duplicate.result.facts,
        idempotencyKey: key,
        replayed: true,
      },
    });
    return { kind: "replayed", result: duplicate.result, requestId };
  }

  // 6. confirmation
  if (definitionForTool.confirmation === "required" && !definition.policies.allowUnconfirmedSideEffects) {
    const argsHash = hashValue(validatedArgs);
    const pending = journal.state.pendingAction;

    if (!deps.grants.has(grantKey(toolName, argsHash))) {
      // No usable consent for THIS payload. Either nothing was ever confirmed, or something was
      // confirmed for different arguments - in which case the old request is superseded rather than
      // inherited, and the user is asked again about the payload that would actually be sent.
      const supersededRequestId = pending && pending.argsHash !== argsHash ? pending.requestId : undefined;
      const promptText = defaultConfirmationPrompt(definitionForTool.label ?? definitionForTool.name.replace(/_/g, " "), validatedArgs);
      journal.append({
        type: "ConfirmationRequested",
        turn,
        payload: { requestId, toolName, args: validatedArgs, argsHash, promptText, supersededRequestId },
      });
      return { kind: "awaiting_confirmation", requestId, promptText };
    }
  }

  // 7. execute
  const executor = tools.getExecutor(toolName);
  if (!executor) {
    return reject("no_executor", `tool "${toolName}" is declared but no executor is registered for it`);
  }

  journal.append({ type: "ToolExecutionStarted", turn, payload: { requestId, toolName, args: validatedArgs, idempotencyKey: key } });

  let result: ToolResult;
  try {
    result = await executor.execute(validatedArgs, {
      sessionId: journal.state.sessionId,
      turn,
      requestId,
      memory: journal.state.memory,
      hostContext: toolVisibleContext(journal.state.hostContext),
    });
  } catch (error) {
    // An executor that throws is a FAILED action, never an ambiguous one. Recording it as failure
    // is what stops the model from narrating a success the runtime never observed.
    result = {
      ok: false,
      error: { code: "executor_threw", message: error instanceof Error ? error.message : String(error) },
      retryable: true,
    };
  }

  if (result.ok) {
    const succeeded = journal.append({
      type: "ToolExecutionSucceeded",
      turn,
      payload: { requestId, toolName, output: result.output, facts: result.facts, idempotencyKey: key },
    });
    commitToolFacts(deps, result, succeeded.id, toolName, turn);
  } else {
    journal.append({
      type: "ToolExecutionFailed",
      turn,
      payload: { requestId, toolName, error: result.error, retryable: result.retryable, idempotencyKey: key },
    });
  }

  return { kind: "executed", result, requestId };
}

/**
 * Resolves an outstanding confirmation against the current user message, at the START of a turn.
 *
 * On a genuine confirmation this issues a grant for the *stored* payload - the exact arguments the
 * user was shown - and returns the pending action so the caller can execute it directly. The model
 * is not asked to re-request the tool, so it cannot quietly alter the payload between consent and
 * execution.
 */
export function resolvePendingConfirmation(
  deps: AuthorizeDeps,
  userMessage: string,
  turn: number,
): { resolved: false } | { resolved: true; decision: "confirm"; action: NonNullable<TurnJournal["state"]["pendingAction"]> } | { resolved: true; decision: "decline" | "unrelated" | "ambiguous"; reason: string } {
  const pending = deps.journal.state.pendingAction;
  if (!pending) return { resolved: false };

  const resolution = deps.confirmationResolver.resolve(userMessage, pending);
  deps.journal.append({
    type: "ConfirmationResolved",
    turn,
    payload: {
      requestId: pending.requestId,
      decision: resolution.decision,
      reason: resolution.reason,
      rule: resolution.rule,
      message: userMessage,
    },
  });

  if (resolution.decision === "confirm") {
    deps.grants.add(grantKey(pending.toolName, pending.argsHash));
    return { resolved: true, decision: "confirm", action: pending };
  }
  return { resolved: true, decision: resolution.decision, reason: resolution.reason };
}
