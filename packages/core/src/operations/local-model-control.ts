/**
 * Controller-local model controls: model-facing callables that mutate only the controller's own
 * state and cannot cross an Execution or runtime boundary.
 *
 * These are a **different category** from the authority-governed model actions in
 * [`action-target.ts`](action-target.ts) / [`model-action-view.ts`](model-action-view.ts) /
 * [`projection.ts`](projection.ts). Canonical [`../../../../docs/authority.md`](../../../../docs/authority.md)
 * requires
 *
 * ```text
 * Model Invocation Projection ⊆ Active/Exposed View ⊆ Effective Authority ⊆ Catalog
 * ```
 *
 * for every *authority-governed* action binding, because selecting one eventually proposes an Effect
 * the Harness re-authorizes. A local control has no such downstream: `working_notes_set` changes the
 * Agent controller's own Working Notes frame and nothing else. It is therefore **not** an exercise
 * of Execution authority and **not** a member of Effective Authority or an Active View. It is:
 *
 * ```text
 * explicitly typed          a distinct ModelLocalControlTarget, never a ModelActionTarget
 * explicitly enabled        authored per Agent (spec.workingNotes.write), never inferred
 * invocation-snapshotted     the exact projection is frozen on AgentInvocationState
 * unable to create Effect authority / cross an Execution boundary / masquerade as an action
 * ```
 *
 * If a provider represents a local control as tool/function-call syntax alongside authorized tools,
 * that provider syntax does not collapse the kernel distinction: the two families are assembled into
 * one callable namespace by [`model-invocation-interface.ts`](model-invocation-interface.ts), which
 * preserves each binding's provenance.
 *
 * This module is plain deterministic data. It imports no authority resolver, no Active View
 * implementation, no store, no Harness, and no Effect machinery.
 */

import type { ObjectSchema } from "../schema/value-schema.ts";
import { hashValue } from "../util/hash.ts";

/** The one local control this slice defines. Identity only - it carries no key. */
export type ModelLocalControlTarget = { readonly kind: "working_notes_set" };

export const MODEL_LOCAL_CONTROL_KINDS = ["working_notes_set"] as const;

export type ModelLocalControlKind = (typeof MODEL_LOCAL_CONTROL_KINDS)[number];

/** The stable provider-facing alias for the local Working Notes update control. */
export const MODEL_WORKING_NOTES_SET_ALIAS = "working_notes_set";

export function workingNotesSetTarget(): ModelLocalControlTarget {
  return { kind: "working_notes_set" };
}

export function isModelLocalControlTarget(value: unknown): value is ModelLocalControlTarget {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return candidate["kind"] === "working_notes_set" && Object.keys(candidate).length === 1;
}

/** Human-readable form for messages and trace records. Never parsed back into an identity. */
export function formatModelLocalControlTarget(_target: ModelLocalControlTarget): string {
  return "Working Notes/set";
}

/**
 * Model-facing input schema for `working_notes_set`.
 *
 * `content` is `{ kind: "any" }` because a note may hold any JSON value. The kernel accepts exactly
 * that at controller validation (`jsonIssues`); the existing `ValueSchema -> JSON Schema` projection
 * of `any` is a lossy subset (it omits nested objects and null), a pre-existing schema-layer
 * limitation deferred to a future JSON Schema slice.
 */
export const WORKING_NOTES_SET_INPUT: ObjectSchema = {
  kind: "object",
  fields: {
    key: {
      required: true,
      schema: { kind: "string", minLength: 1 },
      description: "Your own local label for this note.",
    },
    content: {
      required: true,
      schema: { kind: "any" },
      description: "Any JSON value; stored verbatim as local scratch.",
    },
  },
  additionalProperties: false,
};

const WORKING_NOTES_SET_DESCRIPTION =
  "Record or replace one entry in your local Working Notes - temporary scratch state for plans, " +
  "hypotheses, and candidate evidence. It is not durable application state, not shared with other " +
  "Executions, and not authority. Supply { key, content }; the key is your own local label.";

// -- the view: derived purely from authored local enablement --------------------

export interface LocalModelControlEntry {
  readonly kind: ModelLocalControlKind;
  readonly description: string;
}

export interface LocalModelControlView {
  /** Content-derived correlation identity. Membership is not permission. */
  readonly viewId: string;
  readonly entries: readonly LocalModelControlEntry[];
}

const EMPTY_VIEW: LocalModelControlView = Object.freeze({
  viewId: `lmcv_${hashValue({ entries: [] })}`,
  entries: Object.freeze([]) as readonly LocalModelControlEntry[],
});

/** The fail-closed constant: no local control is exposed. */
export function emptyLocalModelControlView(): LocalModelControlView {
  return EMPTY_VIEW;
}

/**
 * The local-control view for one invocation.
 *
 * Deterministic and total: derived entirely from authored enablement flags, with no resolver, store
 * read, or policy call, because a local control grants no external/runtime authority.
 */
export function createLocalModelControlView(enabled: { readonly workingNotesSet: boolean }): LocalModelControlView {
  const entries: LocalModelControlEntry[] = [];
  if (enabled.workingNotesSet) {
    entries.push({ kind: "working_notes_set", description: WORKING_NOTES_SET_DESCRIPTION });
  }
  if (entries.length === 0) return EMPTY_VIEW;
  return { viewId: `lmcv_${hashValue({ entries })}`, entries };
}

// -- the projection: the exact local-control surface one invocation was shown ---

export interface LocalModelControlBinding {
  readonly bindingId: string;
  /** Provider/model vocabulary. Never parsed back into an identity. */
  readonly alias: string;
  /** Exact meaning shown to this invocation. Identity only, never permission. */
  readonly target: ModelLocalControlTarget;
  readonly description: string;
  readonly input: ObjectSchema;
}

export interface LocalModelControlProjection {
  readonly projectionId: string;
  /** The local-control view this snapshot was cut from. Correlation only. */
  readonly viewId: string;
  readonly bindings: readonly LocalModelControlBinding[];
}

/** One local-control kind's stable alias. Only `working_notes_set` exists today. */
function aliasOfLocalControl(kind: ModelLocalControlKind): string {
  switch (kind) {
    case "working_notes_set":
      return MODEL_WORKING_NOTES_SET_ALIAS;
  }
}

/** One local-control kind's model-facing input schema. */
function inputOfLocalControl(kind: ModelLocalControlKind): ObjectSchema {
  switch (kind) {
    case "working_notes_set":
      return WORKING_NOTES_SET_INPUT;
  }
}

/** Pure, total: one view entry becomes exactly one binding, in the view's order. */
export function createLocalModelControlProjection(input: {
  readonly projectionId: string;
  readonly view: LocalModelControlView;
}): LocalModelControlProjection {
  const bindings: LocalModelControlBinding[] = input.view.entries.map((entry, index) => ({
    bindingId: `${input.projectionId}/c${index + 1}`,
    alias: aliasOfLocalControl(entry.kind),
    target: { kind: entry.kind } satisfies ModelLocalControlTarget,
    description: entry.description,
    input: inputOfLocalControl(entry.kind),
  }));
  return { projectionId: input.projectionId, viewId: input.view.viewId, bindings };
}

export function emptyLocalModelControlProjection(projectionId = "local-controls/empty"): LocalModelControlProjection {
  return { projectionId, viewId: EMPTY_VIEW.viewId, bindings: [] };
}

export type LocalModelControlResolution =
  | { readonly resolved: true; readonly binding: LocalModelControlBinding }
  | { readonly resolved: false; readonly alias: string };

export function resolveLocalControlAlias(
  projection: LocalModelControlProjection,
  alias: string,
): LocalModelControlResolution {
  const binding = projection.bindings.find((candidate) => candidate.alias === alias);
  return binding ? { resolved: true, binding } : { resolved: false, alias };
}

const LOCAL_CONTROL_KIND_SET = new Set<string>(MODEL_LOCAL_CONTROL_KINDS);

/**
 * Deterministic structural validation of a *persisted* local-control projection.
 *
 * A returned alias is resolved against this snapshot on re-entry, so a persisted snapshot must be an
 * honest F.2a local-control projection: plain data, non-empty ids, and every binding's alias, target,
 * and input schema canonical for its kind, with no duplicate aliases. This is scoped to the F.2a
 * re-entry contract - it is not a universal persisted-Agent-state validator.
 */
export function localModelControlProjectionIssues(value: unknown): readonly string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return ["expected a local model-control projection object"];
  }
  const record = value as Record<string, unknown>;
  const issues: string[] = [];
  for (const extra of Object.keys(record).filter((k) => k !== "projectionId" && k !== "viewId" && k !== "bindings")) {
    issues.push(`unknown projection property "${extra}"`);
  }
  if (typeof record["projectionId"] !== "string" || (record["projectionId"] as string).length === 0) {
    issues.push("projectionId must be a non-empty string");
  }
  if (typeof record["viewId"] !== "string" || (record["viewId"] as string).length === 0) {
    issues.push("viewId must be a non-empty string");
  }
  const bindings = record["bindings"];
  if (!Array.isArray(bindings)) return [...issues, "bindings must be an array"];

  const seenAliases = new Set<string>();
  bindings.forEach((binding, index) => {
    if (binding === null || typeof binding !== "object" || Array.isArray(binding)) {
      issues.push(`bindings[${index}] must be an object`);
      return;
    }
    const b = binding as Record<string, unknown>;
    for (const extra of Object.keys(b).filter(
      (k) => !["bindingId", "alias", "target", "description", "input"].includes(k),
    )) {
      issues.push(`bindings[${index}] has unknown property "${extra}"`);
    }
    if (typeof b["bindingId"] !== "string" || (b["bindingId"] as string).length === 0) {
      issues.push(`bindings[${index}].bindingId must be a non-empty string`);
    }
    if (typeof b["description"] !== "string") {
      issues.push(`bindings[${index}].description must be a string`);
    }
    const target = b["target"];
    if (
      target === null ||
      typeof target !== "object" ||
      Array.isArray(target) ||
      !LOCAL_CONTROL_KIND_SET.has(String((target as Record<string, unknown>)["kind"])) ||
      Object.keys(target as Record<string, unknown>).length !== 1
    ) {
      issues.push(`bindings[${index}].target is not a valid local model-control target`);
      return;
    }
    const kind = (target as ModelLocalControlTarget).kind;
    const expectedAlias = aliasOfLocalControl(kind);
    if (b["alias"] !== expectedAlias) {
      issues.push(`bindings[${index}].alias "${String(b["alias"])}" is not "${expectedAlias}" for ${kind}`);
    } else if (seenAliases.has(expectedAlias)) {
      issues.push(`bindings[${index}].alias "${expectedAlias}" is repeated`);
    } else {
      seenAliases.add(expectedAlias);
    }
    if (hashValue(b["input"]) !== hashValue(inputOfLocalControl(kind))) {
      issues.push(`bindings[${index}].input is not the canonical schema for ${kind}`);
    }
  });
  return issues;
}
