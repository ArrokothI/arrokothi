/**
 * Nonterminal output.
 *
 * A long-lived Execution answers, reports, streams, and keeps living. An emission is that: an
 * observable output produced during one Activation which says nothing about whether the Execution
 * is finished. It is stored separately from `terminalResult` precisely so no code path can confuse
 * "the model finished its turn" with "the Execution completed".
 */

import type { JsonValue } from "../util/json.ts";
import type { ActivationId, ExecutionId } from "./ids.ts";

export type EmissionBody =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "data"; readonly data: JsonValue };

/** What a controller returns. The Harness assigns identity and ordering. */
export interface EmissionProposal {
  readonly body: EmissionBody;
}

export interface ExecutionEmission {
  readonly emissionId: string;
  readonly executionId: ExecutionId;
  readonly activationId: ActivationId;
  /** Per-Execution monotonic position. */
  readonly sequence: number;
  readonly body: EmissionBody;
  readonly emittedAt: string;
}

export function emissionBodyIssues(body: unknown, path: string): readonly { path: string; message: string }[] {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return [{ path, message: "expected an emission body object" }];
  }
  const kind = (body as { kind?: unknown }).kind;
  if (kind === "text") {
    return typeof (body as { text?: unknown }).text === "string"
      ? []
      : [{ path: `${path}.text`, message: "expected a string" }];
  }
  if (kind === "data") return [];
  return [{ path: `${path}.kind`, message: `expected "text" or "data", received ${JSON.stringify(kind)}` }];
}
