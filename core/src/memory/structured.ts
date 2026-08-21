import type {
  MemoryPrimitive,
  MemorySource,
  MemoryValue,
  MemoryWriteProposal,
  StructuredMemory,
  StructuredMemoryField,
  StructuredMemorySchema,
} from "./types.ts";
import { describeIssues, validateValue } from "../schema/value-schema.ts";

/**
 * Validation of a proposed structured write.
 *
 * The contract that matters: a model's output is a PROPOSAL. This function decides, deterministically,
 * whether it becomes state. It never repairs a proposal beyond lossless normalization, and every
 * rejection carries a reason that gets recorded in the event stream - failures are visible, not
 * quietly smoothed over.
 */

export type MemoryRejectionCode =
  | "unknown_field"
  | "schema_violation"
  | "source_not_permitted"
  | "unchanged";

export type MemoryValidation =
  | { ok: true; key: string; value: MemoryPrimitive; normalized: boolean; field: StructuredMemoryField }
  | { ok: false; key: string; code: MemoryRejectionCode; reason: string };

export function findField(schema: StructuredMemorySchema, key: string): StructuredMemoryField | undefined {
  return schema.fields.find((f) => f.key === key);
}

export interface ValidateProposalOptions {
  /** Allow lossless normalization ("420" -> 420). Recorded on the committed value. */
  coerce?: boolean;
}

export function validateProposal(
  schema: StructuredMemorySchema,
  proposal: MemoryWriteProposal,
  source: MemorySource,
  opts: ValidateProposalOptions = {},
): MemoryValidation {
  const field = findField(schema, proposal.key);
  if (!field) {
    // An undeclared field can never enter structured memory: there is no schema to validate it
    // against, so committing it would mean storing an unvalidated model output as authoritative
    // state. `policies.rejectUnknownMemoryFields` does not change that; it only decides what the
    // harness does with the rejection (drop it, or keep it as a non-authoritative working note).
    return { ok: false, key: proposal.key, code: "unknown_field", reason: `field "${proposal.key}" is not declared in the memory schema` };
  }

  const writable = field.writableBy ?? ["model_proposal", "tool_result", "host_context"];
  if (!writable.includes(source)) {
    return {
      ok: false,
      key: proposal.key,
      code: "source_not_permitted",
      reason: `field "${proposal.key}" is not writable from source "${source}" (allowed: ${writable.join(", ")})`,
    };
  }

  const result = validateValue(field.schema, proposal.value, { coerce: opts.coerce === true });
  if (!result.ok) {
    return {
      ok: false,
      key: proposal.key,
      code: "schema_violation",
      reason: describeIssues(result.issues),
    };
  }

  return { ok: true, key: proposal.key, value: result.value as MemoryPrimitive, normalized: result.normalized, field };
}

export interface CommitInput {
  key: string;
  value: MemoryPrimitive;
  source: MemorySource;
  authority: "authoritative" | "advisory";
  turn: number;
  eventId: string;
  at: string;
  normalized?: boolean;
}

/** Pure: returns a new memory map. A correction REPLACES; nothing is merged or averaged. */
export function commitValue(memory: StructuredMemory, input: CommitInput): StructuredMemory {
  const previous = memory[input.key];
  const value: MemoryValue = {
    key: input.key,
    value: input.value,
    source: input.source,
    authority: input.authority,
    turn: input.turn,
    eventId: input.eventId,
    at: input.at,
  };
  if (input.normalized) value.normalized = true;
  if (previous) value.previousValue = previous.value;
  return { ...memory, [input.key]: value };
}

export function memoryValues(memory: StructuredMemory): Record<string, MemoryPrimitive> {
  const out: Record<string, MemoryPrimitive> = {};
  for (const [key, entry] of Object.entries(memory)) out[key] = entry.value;
  return out;
}

/** True when the value was committed on the given turn - the basis for `memory_changed`. */
export function changedOnTurn(memory: StructuredMemory, key: string, turn: number): boolean {
  const entry = memory[key];
  return entry !== undefined && entry.turn === turn;
}

/**
 * Whether a value may be used as an input to a side-effecting tool.
 *
 * Working notes are excluded by construction (they are not in this map at all). An `advisory`
 * structured field is treated the same way: informative, but not a basis for a consequential effect.
 */
export function isAuthoritative(entry: MemoryValue | undefined): boolean {
  return entry !== undefined && entry.authority === "authoritative";
}
