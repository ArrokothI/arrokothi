/**
 * The authored operation-exposure request.
 *
 * This is what an Agent definition is allowed to say about operations, and it is deliberately the
 * smallest thing that can express "expose these, not everything I am allowed to use". It carries
 * refs and authored group labels - identities the catalog already owns - and never descriptors,
 * schemas, backends, credentials, or grants.
 *
 * ```text
 * requested exposure                     what the author would like the model to see
 *        ∩ effective authority           what the runtime has decided is legal
 *        ∩ catalog                       what actually exists and can be projected
 *        = Active Operation View
 * ```
 *
 * The intersection is the entire semantics. A request naming an operation outside authority does
 * not expose it, does not grant it, and does not fail the Execution: it is recorded as an omission
 * with a reason, because "you asked for something you may not have" is information, not an error
 * and certainly not a permission.
 *
 * An absent or empty request exposes nothing. There is no implicit "all my authority", because an
 * Agent that silently inherits its whole ceiling into model context is the exact failure mode the
 * Active View exists to prevent.
 */

import type { OperationRef } from "./refs.ts";
import { isOperationName } from "./refs.ts";

export interface OperationExposureRequest {
  /** Explicit operation identities. */
  readonly refs?: readonly OperationRef[];
  /** Authored group labels, matched against the catalog descriptor's own `groups`. */
  readonly groups?: readonly string[];
  /**
   * A deterministic upper bound on how many operations may be exposed.
   *
   * Applied after ordering, so the same request always keeps the same operations. It is a context
   * budget, not a permission: dropping an operation from the view never widens anything.
   */
  readonly maxOperations?: number;
}

export const EMPTY_EXPOSURE_REQUEST: OperationExposureRequest = Object.freeze({});

export interface ExposureIssue {
  readonly path: string;
  readonly message: string;
}

export function exposureRequestIssues(request: unknown, path: string): readonly ExposureIssue[] {
  if (request === undefined) return [];
  if (request === null || typeof request !== "object" || Array.isArray(request)) {
    return [{ path, message: "expected an operation exposure request object" }];
  }
  const candidate = request as Record<string, unknown>;
  const issues: ExposureIssue[] = [];

  const refs = candidate["refs"];
  if (refs !== undefined) {
    if (!Array.isArray(refs)) {
      issues.push({ path: `${path}.refs`, message: "expected an array of operation refs" });
    } else {
      refs.forEach((ref, index) => {
        const at = `${path}.refs[${index}]`;
        if (ref === null || typeof ref !== "object" || Array.isArray(ref)) {
          issues.push({ path: at, message: "expected an operation ref object" });
          return;
        }
        const value = ref as Record<string, unknown>;
        if (!isOperationName(value["capability"])) {
          issues.push({ path: `${at}.capability`, message: "expected a capability name" });
        }
        if (!isOperationName(value["operation"])) {
          issues.push({ path: `${at}.operation`, message: "expected an operation name" });
        }
        for (const key of Object.keys(value)) {
          if (key !== "capability" && key !== "operation") {
            issues.push({
              path: `${at}.${key}`,
              message: "an exposure ref names an operation and nothing else; descriptors and grants belong elsewhere",
            });
          }
        }
      });
    }
  }

  const groups = candidate["groups"];
  if (groups !== undefined) {
    if (!Array.isArray(groups) || groups.some((group) => typeof group !== "string" || group.length === 0)) {
      issues.push({ path: `${path}.groups`, message: "expected an array of non-empty group labels" });
    }
  }

  const bound = candidate["maxOperations"];
  if (bound !== undefined && (!Number.isInteger(bound) || (bound as number) < 0)) {
    issues.push({ path: `${path}.maxOperations`, message: "expected a non-negative integer bound" });
  }

  for (const key of Object.keys(candidate)) {
    if (key !== "refs" && key !== "groups" && key !== "maxOperations") {
      issues.push({
        path: `${path}.${key}`,
        message: `"${key}" is not part of an exposure request; authority, descriptors, and projections are owned elsewhere`,
      });
    }
  }

  return issues;
}
