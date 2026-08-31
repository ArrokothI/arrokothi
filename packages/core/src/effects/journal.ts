/**
 * The Effect journal: what the runtime knows about every request that crossed the gateway.
 *
 * Its whole job is to keep apart the states that a naive implementation collapses:
 *
 *   requested          a controller asked
 *   authorized         policy allowed it
 *   denied             policy refused it
 *   rejected           the request was never valid or dispatchable at all
 *   dispatch_started   the runtime is about to do something it cannot take back
 *   completed          the world said it worked
 *   failed             the world said it definitely did not
 *   unknown_outcome    the world did not say
 *   replayed           a duplicate request was answered from the prior authoritative outcome
 *   abandoned          the Execution went terminal before the result could be delivered
 *
 * `requested != authorized != dispatched != completed` is the entire point. In particular
 * `dispatch_started` is committed *before* a consequential call, so a crash in the window leaves
 * evidence that something may have happened rather than a silent gap that invites a second attempt.
 *
 * These are audit records. They are never routed to a mailbox and never reach a controller: an
 * Execution learns what happened from delivered Events, and its own request history is not an
 * observation it consumes. Sharing physical storage with Events in a later slice must not merge
 * those roles.
 */

import type { ActivationId, ExecutionId } from "../execution/ids.ts";
import type { JsonObject } from "../util/json.ts";
import type { EffectId, PendingOperationId } from "./ids.ts";
import type { EffectKind, EffectProposal, EffectRequest } from "./types.ts";

export type EffectJournalPhase =
  | "requested"
  | "authorized"
  | "denied"
  | "rejected"
  | "dispatch_started"
  | "completed"
  | "failed"
  | "unknown_outcome"
  | "replayed"
  | "abandoned";

export const EFFECT_JOURNAL_PHASES: readonly EffectJournalPhase[] = [
  "requested",
  "authorized",
  "denied",
  "rejected",
  "dispatch_started",
  "completed",
  "failed",
  "unknown_outcome",
  "replayed",
  "abandoned",
];

/** Phases after which no further external work will be attempted for this Effect. */
export const TERMINAL_EFFECT_PHASES: readonly EffectJournalPhase[] = [
  "denied",
  "rejected",
  "completed",
  "failed",
  "unknown_outcome",
  "replayed",
  "abandoned",
];

export interface EffectJournalEntry {
  /** Per-Execution monotonic position, so the order of phases is inspectable. */
  readonly sequence: number;
  readonly effectId: EffectId;
  readonly executionId: ExecutionId;
  readonly effectKind: EffectKind;
  readonly phase: EffectJournalPhase;
  /** The Activation that proposed the Effect; `null` for phases that happen outside one. */
  readonly activationId: ActivationId | null;
  readonly pendingOperationId: PendingOperationId | null;
  readonly at: string;
  /** Phase-specific detail. Data only - never an executor, a payload handle, or a credential. */
  readonly detail: JsonObject;
}

export type EffectJournalDraft = Omit<EffectJournalEntry, "sequence">;

export function isTerminalEffectPhase(phase: EffectJournalPhase): boolean {
  return (TERMINAL_EFFECT_PHASES as readonly string[]).includes(phase);
}

/** The last phase recorded for one Effect, which is how "what happened to it" is answered. */
export function latestPhase(entries: readonly EffectJournalEntry[], effectId: EffectId): EffectJournalPhase | null {
  let latest: EffectJournalEntry | null = null;
  for (const entry of entries) {
    if (entry.effectId !== effectId) continue;
    if (latest === null || entry.sequence > latest.sequence) latest = entry;
  }
  return latest?.phase ?? null;
}

/**
 * The persisted request records, recovered from the journal's `requested` entries.
 *
 * Effect identity is a minted id and the request itself is stored, so "what was asked for" is
 * answerable from durable state rather than from a digest that merely suggests two requests were
 * alike. This is what a later reviewer reads alongside the authorization and outcome phases to
 * reconstruct why something was allowed and what actually happened.
 */
export function effectRequestsIn(entries: readonly EffectJournalEntry[]): readonly EffectRequest[] {
  const requests: EffectRequest[] = [];
  for (const entry of entries) {
    if (entry.phase !== "requested") continue;
    const proposal = entry.detail["proposal"];
    if (proposal === undefined) continue;
    requests.push({
      effectId: entry.effectId,
      kind: entry.effectKind,
      proposal: proposal as unknown as EffectProposal,
      correlationId: String(entry.detail["correlationId"] ?? entry.effectId),
      causationId: entry.activationId,
      requestedAt: String(entry.detail["requestedAt"] ?? entry.at),
    });
  }
  return requests;
}
