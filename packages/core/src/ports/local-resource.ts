/**
 * The local materialized resource boundary.
 *
 * The canonical rule this port exists to make true:
 *
 * ```text
 * already explicitly exposed/materialized read-only resource
 *     -> Stage-local computation, no Effect
 *
 * live/external resource
 *     -> UseCapability Effect -> Harness authorization
 * ```
 *
 * A Stage may compute freely over what has been deliberately placed inside its computation
 * environment: query a materialized corpus, filter a record snapshot, rerank, build context. That
 * is ordinary local work and manufacturing an Effect for it would be theatre. *Expanding* that
 * environment - reaching a live database, a remote index, a private API - is a different act and
 * still crosses the Harness.
 *
 * The boundary is therefore about exposure, and it is enforced by API shape. A Stage receives a
 * `LocalResourceView` built from the view names its definition declared. Asking that view for
 * anything else throws: an unexposed resource is *unreachable*, not merely unmentioned, so a test
 * can observe the denial instead of relying on nobody having written the name down.
 *
 * This is **not** a sandbox, and must not be described as one. It is the narrow read-only
 * computation/resource-view boundary Workflow Stage conformance needs. Containment against hostile
 * code belongs to an `ExecutionEnvironment`, and building a fraction of one here would make a
 * containment claim the trusted-local profile cannot honour.
 *
 * Note what a `LocalResource` cannot be handed: it has no writer, no credential, no connection, and
 * no transport. Application wiring owns the concrete contents and hands over an already-materialized
 * read-only view; the definition owns only the *name* of that view.
 */

import type { JsonObject, JsonValue } from "../util/json.ts";

/**
 * One already-materialized read-only resource.
 *
 * `read` is deliberately generic. Core does not know what retrieval means - lexical search, record
 * filtering, a snapshot lookup - and encoding one of those here would put a retrieval ontology in
 * the kernel. The implementation is application-owned (see `packages/retrieval/local` for the
 * repository's own), takes plain JSON, and answers with plain JSON.
 */
export interface LocalResource {
  readonly id: string;
  /** Application vocabulary describing what kind of view this is, e.g. `corpus`, `records`. */
  readonly kind: string;
  /** A deterministic, effect-free read. Never mutates and never reaches outside what was exposed. */
  read(request: JsonObject): JsonValue | Promise<JsonValue>;
}

/** Raised when Stage-local computation asks for a resource its definition did not expose. */
export class UnexposedLocalResourceError extends Error {
  readonly resourceId: string;
  readonly exposed: readonly string[];
  constructor(resourceId: string, exposed: readonly string[]) {
    super(
      `local resource "${resourceId}" is not exposed to this Stage (exposed: ${exposed.length ? exposed.join(", ") : "none"}); ` +
        `reaching a resource outside the exposed computation environment requires a UseCapability Effect`,
    );
    this.name = "UnexposedLocalResourceError";
    this.resourceId = resourceId;
    this.exposed = exposed;
  }
}

/**
 * What Stage-local computation may read.
 *
 * The view is constructed from the Stage definition's declared `resourceViews`, so it is the
 * intersection of what the application materialized and what this Stage was authored to see.
 */
export interface LocalResourceView {
  /** The resource names exposed to this Stage. */
  readonly exposed: readonly string[];
  /** Throws `UnexposedLocalResourceError` for anything not exposed. */
  open(resourceId: string): LocalResource;
  /** Non-throwing form for code that legitimately probes. Never widens what is exposed. */
  tryOpen(resourceId: string): LocalResource | undefined;
}

/**
 * Where materialized local resources come from.
 *
 * Application wiring implements this. A view is derived, never accumulated: asking for names the
 * environment does not hold yields a view that simply does not expose them, so a Stage cannot gain
 * a resource by naming one that was never registered.
 */
export interface LocalResourceEnvironment {
  viewFor(resourceIds: readonly string[]): LocalResourceView;
}

/** The environment for a deployment that materialized nothing. Every lookup is unexposed. */
export const emptyLocalResourceEnvironment: LocalResourceEnvironment = {
  viewFor() {
    return {
      exposed: [],
      open(resourceId: string): LocalResource {
        throw new UnexposedLocalResourceError(resourceId, []);
      },
      tryOpen() {
        return undefined;
      },
    };
  },
};
