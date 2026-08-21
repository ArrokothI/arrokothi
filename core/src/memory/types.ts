import type { ValueSchema } from "../schema/value-schema.ts";

/**
 * Structured authoritative memory.
 *
 * Two properties of this design carry most of its weight:
 *
 * 1. A model never writes here directly. It *proposes*; the runtime validates and either commits or
 *    rejects, and both outcomes are events. See `memory/structured.ts`.
 * 2. The field list is a shape, not a script. Nothing in core iterates these fields asking the user
 *    for them in order. Front-loaded and out-of-order facts are the normal case.
 */

/** v0 memory field types. `object` is deliberately excluded - memory is flat and inspectable. */
export type MemoryFieldSchema = Extract<
  ValueSchema,
  { kind: "string" } | { kind: "number" } | { kind: "boolean" } | { kind: "enum" } | { kind: "string_array" }
>;

/** Where a committed value came from. Determines whether a side-effecting tool may rely on it. */
export type MemorySource = "model_proposal" | "tool_result" | "host_context";

export interface StructuredMemoryField {
  key: string;
  schema: MemoryFieldSchema;
  description?: string;
  /**
   * `authoritative` values may be used as inputs to a side-effecting tool.
   * `advisory` values are treated like working notes at the authorization boundary.
   */
  authority?: "authoritative" | "advisory";
  /** Restricts which sources may write this field. Defaults to all three. */
  writableBy?: MemorySource[];
}

export interface StructuredMemorySchema {
  fields: StructuredMemoryField[];
}

export type MemoryPrimitive = string | number | boolean | string[];

/** A committed value, carrying its provenance. Provenance is what the authorization step reads. */
export interface MemoryValue {
  key: string;
  value: MemoryPrimitive;
  source: MemorySource;
  authority: "authoritative" | "advisory";
  /** Turn on which this value was committed. */
  turn: number;
  /** The `MemoryWriteCommitted` event that established it. */
  eventId: string;
  at: string;
  /** True when the raw proposal needed lossless normalization (e.g. "420" -> 420). */
  normalized?: boolean;
  /** The value this one replaced, if any. Kept for correction traces. */
  previousValue?: MemoryPrimitive;
}

export type StructuredMemory = Record<string, MemoryValue>;

/** What a model proposes. Note there is no `authority` field - the model cannot grant itself one. */
export interface MemoryWriteProposal {
  key: string;
  value: unknown;
  /** Optional model-reported confidence. Advisory only; never affects validation. */
  confidence?: number;
}

/**
 * Working memory: free-form, non-authoritative by construction.
 *
 * A note can inform a reply. It can never be the sole basis for a side effect - the tool
 * authorization path does not read this collection at all.
 */
export interface WorkingNote {
  id: string;
  text: string;
  /** Events this note was derived from, so a trace can explain where it came from. */
  sourceEventIds: string[];
  turn: number;
  at: string;
  confidence?: number;
  /** ISO timestamp after which the note is dropped from compiled context. */
  expiresAt?: string;
}
