import type {
  HostContextField,
  HostContextInput,
  HostContextSchema,
  HostContextState,
  HostContextValue,
} from "./types.ts";
import { describeIssues, validateValue } from "../schema/value-schema.ts";

/**
 * Host-context handling.
 *
 * The visibility filter here is the single place that decides what the model may see. It is a
 * whitelist (`visibility === "model"`), not a blacklist, so a newly added visibility level cannot
 * accidentally leak by default.
 */

export interface ContextObservation {
  accepted: HostContextValue[];
  rejected: { key: string; reason: string }[];
}

export function findContextField(schema: HostContextSchema, key: string): HostContextField | undefined {
  return schema.fields.find((f) => f.key === key);
}

/** Validates raw host input against the declared schema. Undeclared keys are rejected, not stored. */
export function observeHostContext(
  schema: HostContextSchema,
  input: HostContextInput,
  turn: number,
  at: string,
): ContextObservation {
  const accepted: HostContextValue[] = [];
  const rejected: { key: string; reason: string }[] = [];

  for (const [key, raw] of Object.entries(input)) {
    if (raw === undefined || raw === null) continue;
    const field = findContextField(schema, key);
    if (!field) {
      rejected.push({ key, reason: `"${key}" is not declared in the host context schema` });
      continue;
    }
    const result = validateValue(field.schema, raw, { coerce: true });
    if (!result.ok) {
      rejected.push({ key, reason: describeIssues(result.issues) });
      continue;
    }
    const value: HostContextValue = {
      key,
      value: result.value,
      lifecycle: field.lifecycle,
      visibility: field.visibility,
      trust: field.trust,
      turn,
      at,
    };
    if (field.description) value.description = field.description;
    accepted.push(value);
  }

  return { accepted, rejected };
}

/**
 * Applies observed values, then expires turn-scoped values from earlier turns.
 *
 * A `turn`-lifecycle value is live only for the turn it arrived on. `fixed` values are written once
 * and are not overwritten by a later observation - that is what makes them fixed.
 */
export function applyHostContext(state: HostContextState, observed: HostContextValue[], turn: number): HostContextState {
  const next: HostContextState = {};
  for (const [key, value] of Object.entries(state)) {
    if (value.lifecycle === "turn" && value.turn !== turn) continue;
    next[key] = value;
  }
  for (const value of observed) {
    const existing = next[value.key];
    if (existing && existing.lifecycle === "fixed") continue;
    next[value.key] = value;
  }
  return next;
}

/** Values the MODEL may see. The compiler must use only this. */
export function modelVisibleContext(state: HostContextState): HostContextValue[] {
  return Object.values(state).filter((v) => v.visibility === "model");
}

/**
 * Values a TOOL EXECUTOR may see: `model` plus `tools_only`.
 *
 * `runtime_only` is withheld even from tools - it is for the runtime's own policy decisions.
 */
export function toolVisibleContext(state: HostContextState): HostContextState {
  const out: HostContextState = {};
  for (const [key, value] of Object.entries(state)) {
    if (value.visibility === "model" || value.visibility === "tools_only") out[key] = value;
  }
  return out;
}

/** Trust labels shown to the model, so a user-claimed value is never presented as established fact. */
export function trustLabel(trust: HostContextValue["trust"]): string {
  switch (trust) {
    case "trusted_host":
      return "verified by host";
    case "tool_verified":
      return "verified by tool";
    case "user_claimed":
      return "claimed by user, unverified";
  }
}
