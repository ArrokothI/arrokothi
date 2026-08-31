/**
 * Terminal results.
 *
 * `response != terminal result` is a core invariant, so completion is deliberately awkward: a
 * controller can only *propose* a result, and the proposal is checked against the schema declared
 * by the definition the Execution pinned at creation. Nothing else - a reply, an emission, a model
 * "end turn" signal, a Stage result - can populate this field.
 *
 * Validation is intentionally strict (no coercion). A controller proposing `"3"` where the schema
 * says number has produced a different value than the interface promises, and the runtime, not the
 * proposer, establishes what the Execution actually returned.
 */

import type { TerminalResultSchema } from "../definitions/types.ts";
import { validateValue } from "../schema/value-schema.ts";
import type { SchemaIssue } from "../schema/value-schema.ts";
import { hashValue } from "../util/hash.ts";
import type { JsonValue } from "../util/json.ts";
import { jsonIssues } from "../util/json.ts";
import type { ActivationId } from "./ids.ts";

/** What a controller hands to the Harness when it believes the Execution is done. */
export interface TerminalResultProposal {
  readonly value: JsonValue;
}

/** What the Harness commits, atomically with the transition to COMPLETED. */
export interface TerminalResultEnvelope {
  /** `null` when the definition declares no result: completing without a value is a real outcome. */
  readonly schema: { readonly schemaId: string; readonly schemaVersion: number } | null;
  readonly value: JsonValue;
  readonly valueDigest: string;
  readonly completedByActivationId: ActivationId;
  readonly completedAt: string;
}

export type TerminalResultRejectionCode =
  | "missing_result"
  | "unexpected_result"
  | "not_serializable"
  | "schema_violation";

export interface TerminalResultRejection {
  readonly code: TerminalResultRejectionCode;
  readonly message: string;
  readonly issues: readonly SchemaIssue[];
}

export type TerminalResultValidation =
  | { readonly ok: true; readonly envelope: TerminalResultEnvelope }
  | { readonly ok: false; readonly rejection: TerminalResultRejection };

export interface TerminalResultContext {
  readonly activationId: ActivationId;
  readonly completedAt: string;
}

export function validateTerminalResult(
  declared: TerminalResultSchema | undefined,
  proposal: TerminalResultProposal | undefined,
  context: TerminalResultContext,
): TerminalResultValidation {
  if (declared === undefined) {
    if (proposal !== undefined) {
      return {
        ok: false,
        rejection: {
          code: "unexpected_result",
          message: "definition declares no terminal result schema, so no result value may be committed",
          issues: [],
        },
      };
    }
    return {
      ok: true,
      envelope: {
        schema: null,
        value: null,
        valueDigest: hashValue(null),
        completedByActivationId: context.activationId,
        completedAt: context.completedAt,
      },
    };
  }

  if (proposal === undefined) {
    return {
      ok: false,
      rejection: {
        code: "missing_result",
        message: `definition declares terminal result schema "${declared.schemaId}" v${declared.schemaVersion}; completion requires a result value`,
        issues: [],
      },
    };
  }

  const serialization = jsonIssues(proposal.value, "result");
  if (serialization.length > 0) {
    return {
      ok: false,
      rejection: {
        code: "not_serializable",
        message: `terminal result is not serializable: ${serialization.map((i) => i.message).join("; ")}`,
        issues: [],
      },
    };
  }

  const validation = validateValue(declared.schema, proposal.value);
  if (!validation.ok) {
    return {
      ok: false,
      rejection: {
        code: "schema_violation",
        message: `terminal result does not satisfy schema "${declared.schemaId}" v${declared.schemaVersion}`,
        issues: validation.issues,
      },
    };
  }

  const value = validation.value as JsonValue;
  return {
    ok: true,
    envelope: {
      schema: { schemaId: declared.schemaId, schemaVersion: declared.schemaVersion },
      value,
      valueDigest: hashValue(value),
      completedByActivationId: context.activationId,
      completedAt: context.completedAt,
    },
  };
}

/** Why an Execution reached FAILED. Distinct from a failed Effect, which is only an observation. */
export interface ExecutionFailure {
  readonly code: string;
  readonly message: string;
  readonly failedByActivationId: ActivationId | null;
  readonly failedAt: string;
  readonly details?: JsonValue;
}
