import type { ToolDefinition, ToolResult } from "./types.ts";
import { hashValue } from "../util/hash.ts";

/**
 * Idempotency.
 *
 * A duplicate is never re-executed. The prior *authoritative* result is replayed instead, so the
 * agent's account of what happened stays consistent - a second "please send that" does not produce
 * a second email, and does not produce a second, possibly different, answer either.
 */

export interface LedgerEntry {
  key: string;
  toolName: string;
  argsHash: string;
  turn: number;
  at: string;
  result: ToolResult;
  requestId: string;
}

/** The action ledger: every executed tool call, keyed by its idempotency key. */
export type ActionLedger = Record<string, LedgerEntry>;

/**
 * `per_input`        - tool name + canonical argument hash.
 * `once_per_session` - tool name alone, so any arguments count as the same action.
 * `none`             - a fresh key per request, so nothing is ever suppressed.
 */
export function idempotencyKey(definition: ToolDefinition, args: Record<string, unknown>, requestId: string): string {
  switch (definition.idempotency) {
    case "per_input":
      return `${definition.name}:${hashValue(args)}`;
    case "once_per_session":
      return definition.name;
    case "none":
      return `${definition.name}:${requestId}`;
  }
}

/**
 * The success ledger suppresses re-execution when a prior call succeeded. External definite
 * failures and unknown outcomes are governed separately by the authorization layer.
 *
 * A failed attempt must remain retryable: the point of idempotency is to prevent duplicate effects,
 * not to make a transient failure permanent.
 */
export function findDuplicate(ledger: ActionLedger, definition: ToolDefinition, key: string): LedgerEntry | undefined {
  if (definition.idempotency === "none") return undefined;
  const entry = ledger[key];
  if (!entry) return undefined;
  return entry.result.ok ? entry : undefined;
}

export function recordExecution(ledger: ActionLedger, entry: LedgerEntry): ActionLedger {
  return { ...ledger, [entry.key]: entry };
}

/** Successful external side effects, in execution order - what the Studio shows as the action ledger. */
export function successfulEffects(ledger: ActionLedger): LedgerEntry[] {
  return Object.values(ledger)
    .filter((e) => e.result.ok)
    .sort((a, b) => a.at.localeCompare(b.at));
}
