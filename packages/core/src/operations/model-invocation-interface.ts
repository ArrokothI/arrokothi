/**
 * The one provider-visible callable namespace, assembled from two separate persisted snapshots.
 *
 * A model invocation is shown a single list of callables, but two kernel categories feed it:
 *
 * ```text
 * ModelActionProjection          authority-governed model actions
 *   ⊆ ActiveModelActionView        (Projection ⊆ Active View ⊆ Effective Authority ⊆ Catalog)
 *
 * LocalModelControlProjection    controller-local model controls
 *   ⊆ LocalModelControlView        (authored local enablement; NOT authority, NOT an Active View)
 * ```
 *
 * This module composes the two into one `ModelInvocationInterface` without collapsing them: every
 * callable carries its `origin`, so a returned alias resolves back to the exact binding of the exact
 * snapshot it came from. Aliases are checked across **both** families together, with no
 * iteration-order collision winner - an ambiguous namespace fails to assemble.
 *
 * It is plain deterministic data. It reaches no store, no Harness, no authorizer, and no Effect
 * machinery; it only rearranges two projections it is handed.
 */

import type { ModelCapabilitySpec } from "../model/types.ts";
import type { LocalModelControlBinding, LocalModelControlProjection } from "./local-model-control.ts";
import type { ModelActionBinding, ModelActionProjection } from "./projection.ts";

export type ModelCallableOrigin = "action" | "local_control";

export type ModelCallableBinding =
  | { readonly origin: "action"; readonly binding: ModelActionBinding }
  | { readonly origin: "local_control"; readonly binding: LocalModelControlBinding };

export interface ModelInvocationInterface {
  /** Provenance: the two exact snapshots this callable surface was assembled from. */
  readonly actionProjectionId: string;
  readonly localControlProjectionId: string;
  readonly callables: readonly ModelCallableBinding[];
}

export interface InvocationInterfaceIssue {
  readonly path: string;
  readonly message: string;
}

export type ModelInvocationInterfaceResult =
  | { readonly ok: true; readonly interface: ModelInvocationInterface }
  | { readonly ok: false; readonly issues: readonly InvocationInterfaceIssue[] };

/**
 * Assembles the callable namespace and checks it.
 *
 * Deterministic order: authority-governed action bindings first (already ordered by their
 * projection), then local-control bindings (already ordered by theirs). A cross-family alias
 * collision is an issue for *every* colliding entry - no winner, no implicit suffix.
 */
export function createModelInvocationInterface(input: {
  readonly actions: ModelActionProjection;
  readonly localControls: LocalModelControlProjection;
}): ModelInvocationInterfaceResult {
  const callables: ModelCallableBinding[] = [
    ...input.actions.bindings.map((binding) => ({ origin: "action" as const, binding })),
    ...input.localControls.bindings.map((binding) => ({ origin: "local_control" as const, binding })),
  ];

  const byAlias = new Map<string, number>();
  for (const callable of callables) {
    byAlias.set(callable.binding.alias, (byAlias.get(callable.binding.alias) ?? 0) + 1);
  }
  const issues: InvocationInterfaceIssue[] = [];
  callables.forEach((callable, index) => {
    if ((byAlias.get(callable.binding.alias) ?? 0) > 1) {
      issues.push({
        path: `callables[${index}]`,
        message:
          `model-facing name "${callable.binding.alias}" is claimed by more than one binding ` +
          `(this one is ${callable.origin}); a provider callable namespace with an ambiguous name cannot exist`,
      });
    }
  });
  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    interface: {
      actionProjectionId: input.actions.projectionId,
      localControlProjectionId: input.localControls.projectionId,
      callables,
    },
  };
}

/** The flat provider-facing spec list. One namespace; provenance is not sent to the provider. */
export function modelInvocationCallableSpecs(iface: ModelInvocationInterface): readonly ModelCapabilitySpec[] {
  return iface.callables.map((callable) => ({
    name: callable.binding.alias,
    description: callable.binding.description,
    input: callable.binding.input,
  }));
}

export type ModelInvocationResolution =
  | { readonly resolved: true; readonly origin: "action"; readonly binding: ModelActionBinding }
  | { readonly resolved: true; readonly origin: "local_control"; readonly binding: LocalModelControlBinding }
  | { readonly resolved: false; readonly alias: string };

/**
 * Resolves a returned alias through the assembled interface.
 *
 * The alias is matched against the interface's callables only - never a catalog, an Active View, or
 * a freshly resolved projection. A collision-free interface (the only kind `createModelInvocationInterface`
 * returns) matches at most one binding.
 */
export function resolveModelInvocationAlias(
  iface: ModelInvocationInterface,
  alias: string,
): ModelInvocationResolution {
  const match = iface.callables.find((callable) => callable.binding.alias === alias);
  if (!match) return { resolved: false, alias };
  return match.origin === "action"
    ? { resolved: true, origin: "action", binding: match.binding }
    : { resolved: true, origin: "local_control", binding: match.binding };
}
