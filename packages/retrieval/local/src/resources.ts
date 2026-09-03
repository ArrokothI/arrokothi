/**
 * Materialized read-only retrieval resources for Stage-local computation.
 *
 * These implement the kernel's `LocalResource` port, which is the *local* half of the retrieval
 * rule:
 *
 * ```text
 * already materialized read-only corpus  -> Stage-local computation, no Effect
 * live/external index or database        -> UseCapability Effect -> Harness authorization
 * ```
 *
 * A corpus handed to a Stage this way has already been deliberately exposed by application wiring,
 * so querying, filtering, and reranking it is ordinary local work. Manufacturing an Effect for each
 * query would be theatre: nothing crosses a trust boundary, and the "authorization" would be
 * authorizing access to data the Stage was already holding.
 *
 * The resources are read-only by shape. There is no writer, no credential, no connection, and no
 * way to reach a source that was not materialized into this object.
 */

import type { JsonObject, JsonValue } from "@arrokothi/core/execution";
import type { LocalResource } from "@arrokothi/core/ports";
import { LexicalIndex } from "./lexical.ts";
import type { LexicalSourceInput, LexicalChunk } from "./lexical.ts";
import { queryRecords } from "./records.ts";
import type { RecordQuery, RecordSetView } from "./records.ts";

export const LOCAL_CORPUS_KIND = "corpus";
export const LOCAL_RECORDS_KIND = "records";

export interface LocalCorpusInput extends LexicalSourceInput {
  /** Chunks returned when a read does not say. Defaults to 3. */
  readonly defaultTopK?: number;
}

/** What a corpus read answers with. Plain data; it is persisted and inspected like any other. */
export interface LocalCorpusReadResult {
  readonly sourceId: string;
  readonly query: string;
  readonly chunks: readonly LexicalChunk[];
}

function readString(request: JsonObject, key: string): string {
  const value = request[key];
  if (typeof value !== "string") throw new TypeError(`local corpus read requires a string "${key}"`);
  return value;
}

/**
 * A materialized document corpus.
 *
 * `read({ query, topK? })` answers with ranked chunks. Deterministic for a given corpus and query,
 * which is what lets a conformance run assert on retrieval output without a network or a model.
 */
export function createLocalCorpusResource(input: LocalCorpusInput): LocalResource {
  const index = new LexicalIndex(input);
  const defaultTopK = input.defaultTopK ?? 3;
  return {
    id: input.id,
    kind: LOCAL_CORPUS_KIND,
    async read(request: JsonObject): Promise<JsonValue> {
      const query = readString(request, "query");
      const topK = typeof request["topK"] === "number" ? request["topK"] : defaultTopK;
      const chunks = await index.search(query, topK);
      return { sourceId: input.id, query, chunks } as unknown as JsonValue;
    },
  };
}

/**
 * A materialized record set.
 *
 * `read(recordQuery)` runs the deterministic evaluator. An unknown field is an error rather than an
 * empty result, so a Stage that asks a wrong question gets told rather than quietly getting nothing.
 */
export function createLocalRecordsResource(view: RecordSetView): LocalResource {
  return {
    id: view.id,
    kind: LOCAL_RECORDS_KIND,
    read(request: JsonObject): JsonValue {
      const result = queryRecords(view, request as unknown as RecordQuery);
      if (!result.ok) throw new TypeError(`${result.error.code}: ${result.error.message}`);
      return result.value as unknown as JsonValue;
    },
  };
}
