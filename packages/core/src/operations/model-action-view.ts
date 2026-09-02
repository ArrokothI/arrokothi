/**
 * The heterogeneous Active Model Action View.
 *
 * Capability operations, Structured Memory writes, and the local Working Notes update each reach
 * this view through their own authorized exposure path. The view merely composes their canonical
 * entries; it grants nothing. Its content-derived identity is the single Active/Exposed View
 * identity named by an invocation projection.
 *
 * ```text
 * ActiveOperationView -----------------------\
 * ActiveStructuredMemoryWriteView -----------+-> ActiveModelActionView
 * ActiveWorkingNotesActionView --------------/
 * ```
 */

import type { ActiveStructuredMemoryWriteEntry, ActiveStructuredMemoryWriteView } from "../execution/structured-memory-write-view.ts";
import type {
  ActiveWorkingNotesActionEntry,
  ActiveWorkingNotesActionView,
} from "../execution/working-notes-action-view.ts";
import { emptyActiveWorkingNotesActionView } from "../execution/working-notes-action-view.ts";
import { hashValue } from "../util/hash.ts";
import type { ActiveOperationEntry, ActiveOperationView } from "./active-view.ts";
import type {
  CapabilityOperationTarget,
  ModelActionTarget,
  StructuredMemoryWriteTarget,
  WorkingNotesSetTarget,
} from "./action-target.ts";

export interface CapabilityOperationActionEntry extends ActiveOperationEntry {
  readonly kind: "capability_operation";
}

export type StructuredMemoryWriteActionEntry = ActiveStructuredMemoryWriteEntry;

export type WorkingNotesSetActionEntry = ActiveWorkingNotesActionEntry;

export type ActiveModelActionEntry =
  | CapabilityOperationActionEntry
  | StructuredMemoryWriteActionEntry
  | WorkingNotesSetActionEntry;

export interface ActiveModelActionView {
  /** Content-derived correlation identity. Membership is not permission. */
  readonly viewId: string;
  /** Source identities explain the authorized views this composition came from. */
  readonly sources: {
    readonly operations: string;
    readonly structuredMemoryWrites: string;
    readonly workingNotes: string;
  };
  readonly entries: readonly ActiveModelActionEntry[];
}

export function targetOfActiveModelAction(entry: ActiveModelActionEntry): ModelActionTarget {
  switch (entry.kind) {
    case "capability_operation":
      return {
        kind: "capability_operation",
        capability: entry.capability,
        operation: entry.operation,
      } satisfies CapabilityOperationTarget;
    case "structured_memory_write":
      return { kind: "structured_memory_write", key: entry.key } satisfies StructuredMemoryWriteTarget;
    case "working_notes_set":
      return { kind: "working_notes_set" } satisfies WorkingNotesSetTarget;
  }
}

export function sameModelActionTarget(a: ModelActionTarget, b: ModelActionTarget): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "capability_operation":
      return (
        a.capability === (b as CapabilityOperationTarget).capability &&
        a.operation === (b as CapabilityOperationTarget).operation
      );
    case "structured_memory_write":
      return a.key === (b as StructuredMemoryWriteTarget).key;
    case "working_notes_set":
      return true;
  }
}

export function findActiveModelAction(
  view: ActiveModelActionView,
  target: ModelActionTarget,
): ActiveModelActionEntry | undefined {
  return view.entries.find((entry) => sameModelActionTarget(targetOfActiveModelAction(entry), target));
}

function kindRank(kind: ActiveModelActionEntry["kind"]): number {
  return kind === "capability_operation" ? 0 : kind === "structured_memory_write" ? 1 : 2;
}

function compareEntries(a: ActiveModelActionEntry, b: ActiveModelActionEntry): number {
  if (a.kind !== b.kind) return kindRank(a.kind) - kindRank(b.kind);
  if (a.kind === "capability_operation" && b.kind === "capability_operation") {
    return a.capability.localeCompare(b.capability) || a.operation.localeCompare(b.operation);
  }
  if (a.kind === "structured_memory_write" && b.kind === "structured_memory_write") {
    return a.key.localeCompare(b.key);
  }
  return 0;
}

export function createActiveModelActionView(input: {
  readonly operations: ActiveOperationView;
  readonly structuredMemoryWrites: ActiveStructuredMemoryWriteView;
  readonly workingNotes?: ActiveWorkingNotesActionView;
}): ActiveModelActionView {
  const workingNotes = input.workingNotes ?? emptyActiveWorkingNotesActionView();
  const entries: ActiveModelActionEntry[] = [
    ...input.operations.entries.map((entry) => ({ ...entry, kind: "capability_operation" as const })),
    ...input.structuredMemoryWrites.entries,
    ...workingNotes.entries,
  ];
  entries.sort(compareEntries);
  const sources = {
    operations: input.operations.viewId,
    structuredMemoryWrites: input.structuredMemoryWrites.viewId,
    workingNotes: workingNotes.viewId,
  };
  return {
    viewId: `amav_${hashValue({ sources, entries })}`,
    sources,
    entries,
  };
}
