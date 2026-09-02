/**
 * The heterogeneous Active Model Action View.
 *
 * Capability operations and Structured Memory writes reach this view through their own authorized
 * exposure paths. The view merely composes their canonical entries; it grants nothing. Its
 * content-derived identity is the single Active/Exposed View identity named by an invocation
 * projection.
 */

import type { ActiveStructuredMemoryWriteEntry, ActiveStructuredMemoryWriteView } from "../execution/structured-memory-write-view.ts";
import { hashValue } from "../util/hash.ts";
import type { ActiveOperationEntry, ActiveOperationView } from "./active-view.ts";
import type { CapabilityOperationTarget, ModelActionTarget, StructuredMemoryWriteTarget } from "./action-target.ts";

export interface CapabilityOperationActionEntry extends ActiveOperationEntry {
  readonly kind: "capability_operation";
}

export type StructuredMemoryWriteActionEntry = ActiveStructuredMemoryWriteEntry;

export type ActiveModelActionEntry = CapabilityOperationActionEntry | StructuredMemoryWriteActionEntry;

export interface ActiveModelActionView {
  /** Content-derived correlation identity. Membership is not permission. */
  readonly viewId: string;
  /** Source identities explain the authorized views this composition came from. */
  readonly sources: {
    readonly operations: string;
    readonly structuredMemoryWrites: string;
  };
  readonly entries: readonly ActiveModelActionEntry[];
}

export function targetOfActiveModelAction(entry: ActiveModelActionEntry): ModelActionTarget {
  return entry.kind === "capability_operation"
    ? ({ kind: "capability_operation", capability: entry.capability, operation: entry.operation } satisfies CapabilityOperationTarget)
    : ({ kind: "structured_memory_write", key: entry.key } satisfies StructuredMemoryWriteTarget);
}

export function sameModelActionTarget(a: ModelActionTarget, b: ModelActionTarget): boolean {
  if (a.kind !== b.kind) return false;
  return a.kind === "capability_operation"
    ? a.capability === (b as CapabilityOperationTarget).capability && a.operation === (b as CapabilityOperationTarget).operation
    : a.key === (b as StructuredMemoryWriteTarget).key;
}

export function findActiveModelAction(
  view: ActiveModelActionView,
  target: ModelActionTarget,
): ActiveModelActionEntry | undefined {
  return view.entries.find((entry) => sameModelActionTarget(targetOfActiveModelAction(entry), target));
}

function compareEntries(a: ActiveModelActionEntry, b: ActiveModelActionEntry): number {
  if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
  if (a.kind === "capability_operation" && b.kind === "capability_operation") {
    return a.capability.localeCompare(b.capability) || a.operation.localeCompare(b.operation);
  }
  return (a as StructuredMemoryWriteActionEntry).key.localeCompare((b as StructuredMemoryWriteActionEntry).key);
}

export function createActiveModelActionView(input: {
  readonly operations: ActiveOperationView;
  readonly structuredMemoryWrites: ActiveStructuredMemoryWriteView;
}): ActiveModelActionView {
  const entries: ActiveModelActionEntry[] = [
    ...input.operations.entries.map((entry) => ({ ...entry, kind: "capability_operation" as const })),
    ...input.structuredMemoryWrites.entries,
  ];
  entries.sort(compareEntries);
  const sources = {
    operations: input.operations.viewId,
    structuredMemoryWrites: input.structuredMemoryWrites.viewId,
  };
  return {
    viewId: `amav_${hashValue({ sources, entries })}`,
    sources,
    entries,
  };
}
