/**
 * The authorized, model-exposable write interface for Structured Memory.
 *
 * This is metadata only: one entry names one already-authorized field interface and its declared
 * value schema. It carries no current value, memory-view identity, revision, store handle, or
 * permission token. A model selection built from this view still becomes an ordinary
 * `WriteMemory` proposal that the Harness authorizes again from current policy.
 */

import type { ValueSchema } from "../schema/value-schema.ts";
import { hashValue } from "../util/hash.ts";
import type { StructuredMemoryView } from "./structured-memory.ts";

export interface ActiveStructuredMemoryWriteEntry {
  readonly kind: "structured_memory_write";
  readonly key: string;
  readonly description: string;
  readonly valueSchema: ValueSchema;
}

export interface ActiveStructuredMemoryWriteView {
  /** Content-derived correlation identity. It is not authority. */
  readonly viewId: string;
  /** Authorized, declared fields only, ordered by key. */
  readonly entries: readonly ActiveStructuredMemoryWriteEntry[];
}

export function createActiveStructuredMemoryWriteView(
  entries: readonly ActiveStructuredMemoryWriteEntry[],
): ActiveStructuredMemoryWriteView {
  const ordered = [...entries].sort((a, b) => a.key.localeCompare(b.key));
  return {
    viewId: `asmwv_${hashValue(ordered)}`,
    entries: ordered,
  };
}

export function emptyActiveStructuredMemoryWriteView(): ActiveStructuredMemoryWriteView {
  return createActiveStructuredMemoryWriteView([]);
}

/**
 * Projects already-authorized keys through the bound declarations.
 *
 * Authority filtering happens before this function is called. An authorized key absent from the
 * view is ignored; declaration existence never widens the authorized set.
 */
export function projectActiveStructuredMemoryWriteView(
  view: StructuredMemoryView,
  writableKeys: ReadonlySet<string>,
): ActiveStructuredMemoryWriteView {
  return createActiveStructuredMemoryWriteView(
    view.fields
      .filter((field) => writableKeys.has(field.key))
      .map((field) => ({
        kind: "structured_memory_write" as const,
        key: field.key,
        description: field.description ?? `Write Structured Memory field "${field.key}"`,
        valueSchema: field.schema,
      })),
  );
}
