/**
 * What a mediated operation established, and nothing about how it was requested.
 *
 * Split from the request side deliberately. Result vocabulary is what *Events* carry, and Events
 * are the one thing every controller sees; request vocabulary is what an *executor* receives, and
 * no controller may ever be able to reach that. Keeping them in one module would have put
 * `AuthorizedCapabilityRequest` in the import graph of anything that can read an Event.
 *
 * The three outcomes are kept strictly apart. `failure` means the operation definitely did not take
 * effect. `unknown` means the runtime could not establish what happened - the request may have
 * succeeded remotely while the response was lost. Collapsing the second into the first is how
 * systems send an email twice, so the kernel refuses to do it and lets the controller decide what
 * an ambiguous observation means.
 */

import type { JsonValue } from "../util/json.ts";
import { jsonIssues } from "../util/json.ts";

export interface CapabilityError {
  readonly code: string;
  readonly message: string;
}

/**
 * The three outcomes an executor may report, which the runtime keeps strictly apart.
 *
 * `failure` means the operation definitely did not take effect. `unknown` means the runtime could
 * not establish what happened - the request may have succeeded remotely while the response was
 * lost. Collapsing the second into the first is how systems send an email twice, so the kernel
 * refuses to do it and lets the controller decide what an ambiguous observation means.
 */
export type CapabilityOutcome =
  | { readonly status: "success"; readonly observation: JsonValue }
  | { readonly status: "failure"; readonly error: CapabilityError; readonly retryable?: boolean }
  | { readonly status: "unknown"; readonly error: CapabilityError };

export const CAPABILITY_OUTCOME_STATUSES = ["success", "failure", "unknown"] as const;

export interface CapabilityOutcomeIssue {
  readonly path: string;
  readonly message: string;
}

/**
 * Checks an executor's reply before any of it becomes a persisted observation.
 *
 * An executor is an injected implementation, so its reply is untrusted data in exactly the way a
 * controller's outcome is. A provider client, a stream, or a class instance smuggled inside
 * `observation` would put an external implementation object into a semantic record.
 */
export function capabilityOutcomeIssues(outcome: unknown, path = "outcome"): readonly CapabilityOutcomeIssue[] {
  if (outcome === null || typeof outcome !== "object" || Array.isArray(outcome)) {
    return [{ path, message: "expected a capability outcome object" }];
  }
  const candidate = outcome as Record<string, unknown>;
  const status = candidate["status"];
  if (status === "success") {
    return jsonIssues(candidate["observation"], `${path}.observation`).map((i) => ({ path: i.path, message: i.message }));
  }
  if (status === "failure" || status === "unknown") {
    const error = candidate["error"];
    if (error === null || typeof error !== "object" || Array.isArray(error)) {
      return [{ path: `${path}.error`, message: "expected an error object" }];
    }
    const { code, message } = error as { code?: unknown; message?: unknown };
    if (typeof code !== "string" || code.length === 0 || typeof message !== "string") {
      return [{ path: `${path}.error`, message: "expected a non-empty code and a message" }];
    }
    return [];
  }
  return [
    {
      path: `${path}.status`,
      message: `expected one of ${CAPABILITY_OUTCOME_STATUSES.join(", ")}, received ${JSON.stringify(status)}`,
    },
  ];
}

