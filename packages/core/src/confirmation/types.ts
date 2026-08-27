/**
 * Pending-action confirmation.
 *
 * There is deliberately no global "the user said yes" flag anywhere in this SDK. Consent attaches to
 * one specific request, identified by `requestId`, bound to the exact payload that was described to
 * the user and to the assistant event that described it.
 */

export type PendingActionStatus = "pending" | "confirmed" | "declined" | "superseded" | "expired";

export interface PendingAction {
  /** Unique per request. A later message can authorize ONLY this id. */
  requestId: string;
  toolName: string;
  /** The exact payload the user was asked about. */
  args: Record<string, unknown>;
  /** Canonical hash of `args`. If the payload changes, the old consent does not carry over. */
  argsHash: string;
  /** The `ConfirmationRequested` event that asked the user - the prompt this consent answers. */
  promptEventId: string;
  /** The assistant text that asked for confirmation, for the resolver and for traces. */
  promptText: string;
  turn: number;
  createdAt: string;
  status: PendingActionStatus;
}

/**
 * Four-valued, not boolean.
 *
 * `unrelated` and `ambiguous` are distinct from `decline` because they mean different things to the
 * agent: a decline should stop pursuing the action, while an unrelated or ambiguous message should
 * leave the request pending and let the assistant ask again. All three mean "do not execute".
 */
export type ConfirmationDecision = "confirm" | "decline" | "unrelated" | "ambiguous";

export interface ConfirmationResolution {
  decision: ConfirmationDecision;
  /** Human-readable justification, recorded on the event so the choice is auditable. */
  reason: string;
  /** Which rule produced the decision. Makes resolver behaviour testable rule by rule. */
  rule: string;
}

/**
 * A resolver is injectable so a caller can supply a stricter policy (for example, requiring an
 * explicit code word for high-value actions) without touching the runtime.
 */
export interface ConfirmationResolver {
  readonly name: string;
  resolve(message: string, pending: PendingAction): ConfirmationResolution;
}
