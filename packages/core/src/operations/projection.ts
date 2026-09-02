/**
 * The Model Operation Projection: what one specific model invocation was shown.
 *
 * Layer four, and the one that has to be *immutable* to be correct. A model answers with a name it
 * was given; that name means whatever it meant **when the model was shown it**, and never whatever
 * it happens to mean when the answer arrives.
 *
 * ```text
 * invocation N sees      search_docs -> capability A / operation old-search
 * the view later changes search_docs -> capability B / operation new-search
 * the answer to N says   search_docs
 * it MUST resolve to     capability A / operation old-search
 * ```
 *
 * So resolution goes through the snapshot handed to that call and through nothing else. There is
 * no fallback to the latest Active View, no lookup in the catalog, and no fuzzy match: a name that
 * is not in these bindings resolves to nothing, deterministically, and a projection that would
 * have contained two bindings under one name is refused at construction rather than resolved
 * ambiguously later.
 *
 * ```text
 * projection id  ≠ credential
 * binding id     ≠ credential
 * alias          ≠ authority
 * ```
 *
 * Everything here is correlation and integrity data. It explains which meaning the model saw; the
 * Effect that results is still authorized, from current authority, at dispatch.
 *
 * `ModelCapabilitySpec[]` is derived from this snapshot and is deliberately smaller than it: name,
 * description, input schema. The provider sees model vocabulary; the binding that maps that
 * vocabulary back to an operation identity never leaves the kernel.
 */

import type { ModelCapabilitySpec } from "../model/types.ts";
import type { ObjectSchema } from "../schema/value-schema.ts";
import type { ModelActionTarget } from "./action-target.ts";
import { capabilityOperationTarget, formatModelActionTarget, memoryWriteTarget } from "./action-target.ts";
import type { ActiveOperationEntry, ActiveOperationView } from "./active-view.ts";
import type { OperationRef } from "./refs.ts";

/**
 * One model-facing name and what it stands for, for one invocation.
 *
 * The target is a discriminated record rather than a bare `capability`/`operation` pair, and that is
 * the only reason this type is not simply an `ActiveOperationEntry`. A binding is written into a
 * persisted invocation snapshot, so the shape chosen here is the shape a stored projection has; a
 * flat pair would have persisted the claim that every model-visible action *is* a capability
 * operation, which canonical interoperability does not say. Slice F.0 mints the second target kind.
 */
export interface ModelOperationBinding {
  /** Stable within the projection. Deterministic, derived from the projection id and position. */
  readonly bindingId: string;
  /** Model-facing vocabulary. Never treated as an identifier anything is looked up by. */
  readonly alias: string;
  /** What this name resolves to. Identity, never permission. */
  readonly target: ModelActionTarget;
  readonly description: string;
  readonly input: ObjectSchema;
}

export interface ModelOperationProjection {
  /** Deterministic, derived from persisted Agent coordinates. Correlation data, never authority. */
  readonly projectionId: string;
  /** The Active View this snapshot was cut from. */
  readonly viewId: string;
  readonly viewRevision: number;
  /** Immutable, ordered. The only thing a returned name is ever resolved against. */
  readonly bindings: readonly ModelOperationBinding[];
}

/**
 * The model-facing alias for one operation.
 *
 * Provider tool names are conventionally restricted to word characters, so the identity is
 * flattened rather than passed through. Flattening can collide - `a.b` / `c` and `a` / `b.c` both
 * flatten to `a_b_c` - which is precisely why construction below rejects duplicates instead of
 * hoping it never happens.
 */
export function modelOperationAlias(ref: OperationRef): string {
  return `${ref.capability}_${ref.operation}`.replace(/[^A-Za-z0-9_]/g, "_");
}

export interface ProjectionIssue {
  readonly path: string;
  readonly message: string;
}

export type ProjectionResult =
  | { readonly ok: true; readonly projection: ModelOperationProjection }
  | { readonly ok: false; readonly issues: readonly ProjectionIssue[] };

export interface CreateProjectionInput {
  /** Derived from persisted Agent coordinates only, so a resumed Activation rebuilds the same id. */
  readonly projectionId: string;
  readonly view: ActiveOperationView;
  /** Optional narrowing for this call alone: token budget, provider tool limits, relevance. */
  readonly entries?: readonly ActiveOperationEntry[];
  /** Authored exposure request for the existing WriteMemory Effect. It grants nothing. */
  readonly memoryWrite?: { readonly description?: string };
}

/**
 * Builds the immutable snapshot for one invocation.
 *
 * Refuses rather than repairs. A duplicate alias is an ambiguity that would later have to be
 * resolved by guessing which operation the model meant, and there is no correct guess, so the
 * projection never comes into existence.
 */
export function createModelOperationProjection(input: CreateProjectionInput): ProjectionResult {
  const source = input.entries ?? input.view.entries;
  const issues: ProjectionIssue[] = [];
  const bindings: ModelOperationBinding[] = [];
  const byAlias = new Map<string, ModelOperationBinding>();

  source.forEach((entry, index) => {
    const alias = modelOperationAlias(entry);
    const existing = byAlias.get(alias);
    if (existing) {
      issues.push({
        path: `bindings[${index}]`,
        message:
          `model-facing name "${alias}" would mean both ${formatModelActionTarget(existing.target)} and ` +
          `${entry.capability}/${entry.operation}; a projection with an ambiguous name cannot resolve a response`,
      });
      return;
    }
    const binding: ModelOperationBinding = {
      bindingId: `${input.projectionId}/b${index + 1}`,
      alias,
      target: capabilityOperationTarget(entry),
      description: entry.description,
      input: entry.input,
    };
    byAlias.set(alias, binding);
    bindings.push(binding);
  });

  if (input.memoryWrite !== undefined) {
    const alias = "write_memory";
    const existing = byAlias.get(alias);
    if (existing) {
      issues.push({
        path: `bindings[${bindings.length}]`,
        message:
          `model-facing name "${alias}" would mean both ${formatModelActionTarget(existing.target)} and ` +
          "the Structured Memory write target; a projection with an ambiguous name cannot resolve a response",
      });
    } else {
      const binding: ModelOperationBinding = {
        bindingId: `${input.projectionId}/b${bindings.length + 1}`,
        alias,
        target: memoryWriteTarget(),
        description:
          input.memoryWrite.description ??
          "Write one declared Structured Memory field. The runtime validates the key and value against the bound schema.",
        input: {
          kind: "object",
          fields: {
            key: { required: true, schema: { kind: "string", minLength: 1 } },
            value: { required: true, schema: { kind: "any" } },
          },
          additionalProperties: false,
        },
      };
      byAlias.set(alias, binding);
      bindings.push(binding);
    }
  }

  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    projection: {
      projectionId: input.projectionId,
      viewId: input.view.viewId,
      viewRevision: input.view.authorityVersion,
      bindings,
    },
  };
}

/** The provider-facing projection: model vocabulary only, with no route back to an identity. */
export function modelCapabilitySpecs(projection: ModelOperationProjection): readonly ModelCapabilitySpec[] {
  return projection.bindings.map((binding) => ({
    name: binding.alias,
    description: binding.description,
    input: binding.input,
  }));
}

export type ProjectionResolution =
  | { readonly resolved: true; readonly binding: ModelOperationBinding }
  /** Deterministic non-resolution. Never a nearest match, and never a catalog lookup. */
  | { readonly resolved: false; readonly alias: string };

/**
 * Resolves a model-returned name against **this** snapshot.
 *
 * The only supported way to interpret a response. A caller that reached for the current Active View
 * instead would silently rebind an old answer to a new operation.
 */
export function resolveProjectedAlias(projection: ModelOperationProjection, alias: string): ProjectionResolution {
  const binding = projection.bindings.find((candidate) => candidate.alias === alias);
  return binding ? { resolved: true, binding } : { resolved: false, alias };
}
