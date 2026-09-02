/**
 * The Model Action Projection: the exact action bindings one model invocation was shown.
 *
 * It is an immutable snapshot cut only from a heterogeneous `ActiveModelActionView`. A returned
 * alias resolves through this snapshot and nothing current: not a catalog, not a memory view, and
 * not a freshly resolved Active View. Projection membership is correlation/integrity data, never
 * authority; the resulting concrete Effect is authorized again by the Harness.
 */

import type { ModelCapabilitySpec } from "../model/types.ts";
import type { ObjectSchema } from "../schema/value-schema.ts";
import type { ModelActionTarget } from "./action-target.ts";
import { formatModelActionTarget } from "./action-target.ts";
import type { ActiveModelActionEntry, ActiveModelActionView } from "./model-action-view.ts";
import { findActiveModelAction, targetOfActiveModelAction } from "./model-action-view.ts";
import type { OperationRef } from "./refs.ts";

export interface ModelActionBinding {
  readonly bindingId: string;
  /** Provider/model vocabulary. Never parsed back into an identity. */
  readonly alias: string;
  /** Exact meaning shown to this invocation. Identity only, never permission. */
  readonly target: ModelActionTarget;
  readonly description: string;
  readonly input: ObjectSchema;
}

export interface ModelActionProjection {
  readonly projectionId: string;
  /** The heterogeneous Active Model Action View this snapshot was cut from. */
  readonly viewId: string;
  readonly bindings: readonly ModelActionBinding[];
}

/** Stable provider-safe alias for a capability operation. */
export function modelOperationAlias(ref: OperationRef): string {
  return `${ref.capability}_${ref.operation}`.replace(/[^A-Za-z0-9_]/g, "_");
}

/** Stable provider-safe alias for one exact Structured Memory write binding. */
export function modelStructuredMemoryWriteAlias(key: string): string {
  return `memory_write_${key}`.replace(/[^A-Za-z0-9_]/g, "_");
}

function aliasOf(entry: ActiveModelActionEntry): string {
  return entry.kind === "capability_operation"
    ? modelOperationAlias(entry)
    : modelStructuredMemoryWriteAlias(entry.key);
}

function inputOf(entry: ActiveModelActionEntry): ObjectSchema {
  if (entry.kind === "capability_operation") return entry.input;
  return {
    kind: "object",
    fields: {
      value: {
        required: true,
        schema: entry.valueSchema,
      },
    },
    additionalProperties: false,
  };
}

export interface ProjectionIssue {
  readonly path: string;
  readonly message: string;
}

export type ProjectionResult =
  | { readonly ok: true; readonly projection: ModelActionProjection }
  | { readonly ok: false; readonly issues: readonly ProjectionIssue[] };

export interface CreateProjectionInput {
  readonly projectionId: string;
  readonly view: ActiveModelActionView;
  /**
   * Optional identity-only narrowing. Every target is resolved back through `view.entries`; it can
   * select less, but cannot add an action or substitute description/schema/target metadata.
   */
  readonly actions?: readonly ModelActionTarget[];
}

function selectProjectedEntries(
  input: CreateProjectionInput,
  issues: ProjectionIssue[],
): readonly ActiveModelActionEntry[] {
  if (input.actions === undefined) return input.view.entries;
  const selected: ActiveModelActionEntry[] = [];
  input.actions.forEach((target, index) => {
    const canonical = findActiveModelAction(input.view, target);
    if (!canonical) {
      issues.push({
        path: `actions[${index}]`,
        message:
          `requested action ${formatModelActionTarget(target)} is not exposed by Active Model Action View ` +
          `${input.view.viewId}; projection narrowing can only subset the view it names`,
      });
      return;
    }
    selected.push(canonical);
  });
  return selected;
}

export function createModelActionProjection(input: CreateProjectionInput): ProjectionResult {
  const issues: ProjectionIssue[] = [];
  const source = selectProjectedEntries(input, issues);
  if (issues.length > 0) return { ok: false, issues };

  const bindings: ModelActionBinding[] = [];
  const byAlias = new Map<string, ModelActionBinding>();
  source.forEach((entry, index) => {
    const alias = aliasOf(entry);
    const target = targetOfActiveModelAction(entry);
    const existing = byAlias.get(alias);
    if (existing) {
      issues.push({
        path: `bindings[${index}]`,
        message:
          `model-facing name "${alias}" would mean both ${formatModelActionTarget(existing.target)} and ` +
          `${formatModelActionTarget(target)}; a projection with an ambiguous name cannot exist`,
      });
      return;
    }
    const binding: ModelActionBinding = {
      bindingId: `${input.projectionId}/b${index + 1}`,
      alias,
      target,
      description: entry.description,
      input: inputOf(entry),
    };
    byAlias.set(alias, binding);
    bindings.push(binding);
  });

  if (issues.length > 0) return { ok: false, issues };
  return {
    ok: true,
    projection: {
      projectionId: input.projectionId,
      viewId: input.view.viewId,
      bindings,
    },
  };
}

/**
 * Provider-facing callable specs. Providers still call this vocabulary "capabilities"; the kernel
 * binding remains a typed model action and is never reduced back to a capability identity.
 */
export function modelActionSpecs(projection: ModelActionProjection): readonly ModelCapabilitySpec[] {
  return projection.bindings.map((binding) => ({
    name: binding.alias,
    description: binding.description,
    input: binding.input,
  }));
}

export type ProjectionResolution =
  | { readonly resolved: true; readonly binding: ModelActionBinding }
  | { readonly resolved: false; readonly alias: string };

export function resolveProjectedAlias(projection: ModelActionProjection, alias: string): ProjectionResolution {
  const binding = projection.bindings.find((candidate) => candidate.alias === alias);
  return binding ? { resolved: true, binding } : { resolved: false, alias };
}
