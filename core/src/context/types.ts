import type { ValueSchema } from "../schema/value-schema.ts";

/**
 * Host context: typed facts the *host application* supplies, as opposed to facts the user states.
 *
 * Three orthogonal attributes, because they answer three different questions:
 *   lifecycle  - how long is this value good for?
 *   visibility - who is allowed to see it?
 *   trust      - how much is its content worth?
 *
 * The visibility rule is a hard boundary, not a hint: `tools_only` and `runtime_only` values are
 * never placed into model context by the compiler, in any section.
 */

/** `fixed` set once at session creation; `session` persists and may update; `turn` is discarded after the turn. */
export type ContextLifecycle = "fixed" | "session" | "turn";

export type ContextVisibility = "model" | "tools_only" | "runtime_only";

/** `user_claimed` values are rendered to the model as claims, never as established fact. */
export type ContextTrust = "trusted_host" | "user_claimed" | "tool_verified";

export interface HostContextField {
  key: string;
  schema: ValueSchema;
  lifecycle: ContextLifecycle;
  visibility: ContextVisibility;
  trust: ContextTrust;
  description?: string;
}

export interface HostContextSchema {
  fields: HostContextField[];
}

/** A value observed for a session/turn, carrying the declaration it was validated against. */
export interface HostContextValue {
  key: string;
  value: unknown;
  lifecycle: ContextLifecycle;
  visibility: ContextVisibility;
  trust: ContextTrust;
  description?: string;
  /** Turn on which it was observed. Turn-scoped values are only live for their own turn. */
  turn: number;
  at: string;
  /** HostContextObserved event that accepted this value. Filled by session projection. */
  sourceEventId?: string;
}

export type HostContextState = Record<string, HostContextValue>;

/** Raw input from the host: an untyped bag that must pass the declared schema before it is stored. */
export type HostContextInput = Record<string, unknown>;
