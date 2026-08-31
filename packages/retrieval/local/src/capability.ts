/**
 * A local retrieval `CapabilityExecutor`: the *live* half of the retrieval rule.
 *
 * ```text
 * Stage
 *   -> UseCapability Effect
 *   -> Harness authorization
 *   -> CapabilityExecutor            <- here
 *   -> capability.completed Event
 *   -> Stage barrier collection
 * ```
 *
 * This backend happens to be in-process and deterministic, which is what makes it usable in a
 * conformance run with no network. That is a *deployment* fact, not a semantic one: from the
 * Workflow's point of view the truth still crosses the Effect/Event boundary, because the Stage
 * cannot call this code and can only observe what the Harness delivers back.
 *
 * Note what an executor is handed (`AuthorizedCapabilityRequest`): logical names, validated input,
 * and the resource bindings policy actually permitted. No Harness, no store, no ExecutionContext,
 * no credential. Resolving a binding id to real content happens here, behind the port, where
 * semantic code cannot see it - which is the same shape a production database adapter would have.
 */

import type {
  AuthorizedCapabilityRequest,
  CapabilityExecutionEnvironment,
  CapabilityExecutor,
  CapabilityOutcome,
} from "@agent-sdk/core/ports";
import { LexicalIndex } from "./lexical.ts";
import type { LexicalSourceInput } from "./lexical.ts";
import { queryRecords } from "./records.ts";
import type { RecordQuery, RecordSetView } from "./records.ts";

/** The logical capability name this executor answers to unless the deployment renames it. */
export const LOCAL_RETRIEVAL_CAPABILITY = "knowledge.retrieval";

export const LOCAL_RETRIEVAL_OPERATIONS = {
  /** Lexical search over one bound document corpus. */
  search: "search",
  /** Deterministic filter/sort over one bound record set. */
  queryRecords: "query_records",
} as const;

export interface LocalRetrievalExecutorOptions {
  /** Document corpora, keyed for binding by their `id`. */
  readonly documents?: readonly LexicalSourceInput[];
  readonly recordSets?: readonly RecordSetView[];
  /** Overrides the capability name this executor claims. */
  readonly capability?: string;
  readonly defaultTopK?: number;
}

function failure(code: string, message: string): CapabilityOutcome {
  return { status: "failure", error: { code, message }, retryable: false };
}

/**
 * Resolves the single bound resource a retrieval request operates on.
 *
 * A retrieval that names no resource, or more than one, is refused rather than guessed at: which
 * corpus was searched is provenance, and "whichever one was registered first" is not an answer.
 */
function boundResource(request: AuthorizedCapabilityRequest): string | CapabilityOutcome {
  const resources = request.authorization.resources;
  if (resources.length !== 1) {
    return failure(
      "resource_binding_required",
      `local retrieval acts on exactly one bound resource; the authorized grant carried ${resources.length}`,
    );
  }
  return resources[0]!.bindingId as string;
}

export function createLocalRetrievalExecutor(options: LocalRetrievalExecutorOptions = {}): CapabilityExecutor {
  const capability = options.capability ?? LOCAL_RETRIEVAL_CAPABILITY;
  const defaultTopK = options.defaultTopK ?? 3;
  const corpora = new Map<string, LexicalIndex>();
  for (const document of options.documents ?? []) corpora.set(document.id, new LexicalIndex(document));
  const recordSets = new Map<string, RecordSetView>();
  for (const view of options.recordSets ?? []) recordSets.set(view.id, view);

  return {
    async execute(
      request: AuthorizedCapabilityRequest,
      _environment: CapabilityExecutionEnvironment,
    ): Promise<CapabilityOutcome> {
      if ((request.capability as string) !== capability) {
        return failure("unknown_capability", `this executor implements "${capability}", not "${request.capability}"`);
      }
      const bound = boundResource(request);
      if (typeof bound !== "string") return bound;

      if ((request.operation as string) === LOCAL_RETRIEVAL_OPERATIONS.search) {
        const index = corpora.get(bound);
        if (!index) return failure("unknown_resource", `no local document corpus is registered for binding "${bound}"`);
        const query = request.input["query"];
        if (typeof query !== "string" || query.length === 0) {
          return failure("invalid_input", "a document search requires a non-empty string query");
        }
        const topK = typeof request.input["topK"] === "number" ? (request.input["topK"] as number) : defaultTopK;
        const chunks = await index.search(query, topK);
        return { status: "success", observation: { sourceId: bound, query, chunks } as never };
      }

      if ((request.operation as string) === LOCAL_RETRIEVAL_OPERATIONS.queryRecords) {
        const view = recordSets.get(bound);
        if (!view) return failure("unknown_resource", `no local record set is registered for binding "${bound}"`);
        const result = queryRecords(view, request.input as unknown as RecordQuery);
        if (!result.ok) return failure(result.error.code, result.error.message);
        return { status: "success", observation: result.value as never };
      }

      return failure("unknown_operation", `local retrieval does not implement operation "${request.operation}"`);
    },
  };
}
