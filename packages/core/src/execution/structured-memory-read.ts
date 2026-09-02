/**
 * The authorized read-only snapshot of an Execution's Structured Memory.
 *
 * This is the *information* side of memory, and it is deliberately separate from everything that
 * writes. [`structured-memory.ts`](structured-memory.ts) owns the runtime-mutable view: schema
 * declarations, committed values, append-only attribution history, the monotonic revision. A
 * `WriteMemory` Effect changes that record. This module owns a flat, immutable projection of it -
 * only the fields a reader is authorized to see, only their current value - shaped for a context
 * compiler to select from.
 *
 * ```text
 * StructuredMemoryView        runtime state, changed by WriteMemory
 *         ↓ authorized read projection (readable keys only)
 * StructuredMemoryReadView    plain frozen data
 *         ↓ resolved by the AgentController, per new model invocation
 *         ↓ context compilation (information selection)
 * model context
 * ```
 *
 * The snapshot is **not** carried on `ActivationInput` and the Harness does not resolve it. The
 * `AgentController` holds a `StructuredMemoryReadViewResolver`, calls it when it builds a new model
 * invocation for an Agent that authored a read request, and compiles the result into the persisted
 * invocation information.
 *
 * It is **controller-neutral**. Nothing here mentions a step, a projection, a model message, an
 * Agent, or a Stage: it is "what this Execution may currently read from its Structured Memory". A
 * later checkpoint that hands the same snapshot to a Workflow Stage or an adapter needs no change
 * to this file.
 *
 * ## What is deliberately absent: any whole-view revision
 *
 * The runtime view has a monotonic `revision` that advances for *every* committed write to the
 * whole view, including writes to fields this snapshot is not authorized to show. Exposing it here
 * would let a reader authorized for field A observe that field B - which it cannot read - changed.
 * So this projection carries no revision, per field or per view. `StructuredMemoryView.revision`
 * stays where it belongs: runtime/store metadata for atomic updates, future conflict detection,
 * and diagnostics. A field-local version, if a later concurrency checkpoint needs one, is that
 * checkpoint's to design.
 *
 * Holding one grants nothing. It is a value, not a handle: nothing here looks a record up, there is
 * no write path, and no authority. `memoryViewId` is internal correlation metadata only - not a
 * credential, and the reference information compiler does not render it. Read authorization
 * happened before this snapshot was built; see
 * [`../ports/structured-memory-read-view.ts`](../ports/structured-memory-read-view.ts).
 */

import type { ValueSchema } from "../schema/value-schema.ts";
import type { JsonValue } from "../util/json.ts";
import type { StructuredMemoryView } from "./structured-memory.ts";

/** One readable field: its declaration plus its current committed value, if any. */
export interface StructuredMemoryReadField {
  readonly key: string;
  readonly description?: string;
  readonly schema: ValueSchema;
  /** The current committed value, or `undefined` when the field is declared but never written. */
  readonly value: JsonValue | undefined;
}

/**
 * A read-only snapshot of the readable subset of one Execution-local Structured Memory view.
 *
 * `fields` contains only authorized-readable declarations, sorted by key for determinism. There is
 * no revision: see the module comment. `memoryViewId` is correlation metadata, never rendered to a
 * model.
 */
export interface StructuredMemoryReadView {
  readonly memoryViewId: string;
  readonly fields: readonly StructuredMemoryReadField[];
}

/**
 * Builds the read snapshot from the runtime view and the set of keys the reader is authorized to see.
 *
 * Pure and total: the same view and the same key set produce a structurally identical snapshot, so a
 * resumed Activation replaying a persisted context and the Activation that produced it cannot
 * disagree about what memory the model was shown. Because the snapshot carries no whole-view
 * revision, a write to an unreadable field does not change it. A key in `readableKeys` that the view
 * does not declare is ignored - a read grant naming an absent field reveals nothing and is not an
 * error.
 */
export function projectStructuredMemoryReadView(
  view: StructuredMemoryView,
  readableKeys: ReadonlySet<string>,
): StructuredMemoryReadView {
  const fields = view.fields
    .filter((field) => readableKeys.has(field.key))
    .map((field): StructuredMemoryReadField => {
      const committed = view.values[field.key];
      return {
        key: field.key,
        ...(field.description !== undefined ? { description: field.description } : {}),
        schema: field.schema,
        value: committed ? committed.value : undefined,
      };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
  return { memoryViewId: view.memoryViewId, fields };
}
