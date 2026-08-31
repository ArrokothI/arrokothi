/**
 * The Adapter execution boundary.
 *
 * An Adapter transforms or rejects a boundary value. That is the entire job, and this file is
 * mostly a list of things it therefore cannot do.
 *
 * Read `AdapterContext` as the enforcement, not the documentation. There is no Effect proposer, no
 * `requestCapability`, no capability handle, no memory writer, no spawn or call, no messaging, no
 * settlement function, and no way to name a Stage. An Adapter that wanted to retrieve something,
 * write memory, or redirect the Workflow has nothing here to do it with - the prohibition is the
 * shape of the type rather than a comment asking nicely.
 *
 * `AdapterResult` is likewise missing the field that would matter most:
 *
 * ```text
 * AdapterResult.nextStage    // does not exist, deliberately
 * ```
 *
 * An Adapter reports a transformation or a rejection; the WorkflowController applies deterministic,
 * *predefined* Workflow policy to it. Letting an Adapter choose the next Stage would put topology
 * ownership in a boundary transformation and quietly make the graph dynamic.
 *
 * What an Adapter may do: transform, validate, normalize, perform one bounded local model inference,
 * and read explicitly exposed read-only resource views. Its visibility can never exceed the
 * environment it was derived from.
 */

import type { JsonObject } from "../util/json.ts";
import type { StageResult } from "../workflow/stage-result.ts";
import type { StageId } from "../workflow/spec.ts";
import type { LocalResourceView } from "./local-resource.ts";

export type AdapterPosition = "input" | "output";

/**
 * Everything an Adapter is given.
 *
 * Enough to transform a value; not enough to do anything else. The Stage id and visit are here for
 * traces and messages, and they are inert data - an Adapter cannot address anything with them.
 */
export interface AdapterContext {
  readonly stageId: StageId;
  /** Which invocation of that Stage this boundary belongs to. Controller progress, not identity. */
  readonly visit: number;
  readonly position: AdapterPosition;
  /** The value being adapted. */
  readonly value: StageResult;
  /** Authored configuration from the adapter declaration. */
  readonly config: JsonObject;
  /** Read-only, and only what the enclosing Stage was authored to see. */
  readonly resources: LocalResourceView;
}

export type AdapterResult =
  /** The value is acceptable as it stands. */
  | { readonly kind: "pass" }
  | { readonly kind: "transform"; readonly value: StageResult }
  /** The value is not acceptable. Where that leads is predefined Workflow policy, not this. */
  | { readonly kind: "reject"; readonly reason: string };

export interface AdapterImplementation {
  readonly ref: string;
  apply(context: AdapterContext): AdapterResult | Promise<AdapterResult>;
}

/**
 * Where a Function Adapter's logical implementation ref is resolved.
 *
 * Application wiring, like the Function Stage registry: the definition carries the name, the
 * application carries the trusted code, and the two meet here.
 */
export interface AdapterRegistry {
  /** `undefined` for an unknown ref. The controller fails the Workflow rather than skipping it. */
  resolve(ref: string): AdapterImplementation | undefined;
}

export const emptyAdapterRegistry: AdapterRegistry = {
  resolve() {
    return undefined;
  },
};

export function adapterResultIssues(result: unknown, path = "adapterResult"): readonly { path: string; message: string }[] {
  if (result === null || typeof result !== "object" || Array.isArray(result)) {
    return [{ path, message: "expected an adapter result object" }];
  }
  const candidate = result as Record<string, unknown>;
  // An implementation that tries to steer the Workflow is refused rather than silently ignored:
  // topology ownership is not something an Adapter may claim, even by accident.
  if (candidate["nextStage"] !== undefined || candidate["transition"] !== undefined) {
    return [{ path, message: "an Adapter reports a transformation or a rejection; it does not choose the next Stage" }];
  }
  switch (candidate["kind"]) {
    case "pass":
      return [];
    case "transform": {
      const value = candidate["value"];
      return value === null || typeof value === "string"
        ? []
        : [{ path: `${path}.value`, message: "a transformed Stage value is text or none" }];
    }
    case "reject":
      return typeof candidate["reason"] === "string" && (candidate["reason"] as string).length > 0
        ? []
        : [{ path: `${path}.reason`, message: "a rejection states a reason" }];
    default:
      return [{ path: `${path}.kind`, message: `expected "pass", "transform", or "reject"` }];
  }
}
