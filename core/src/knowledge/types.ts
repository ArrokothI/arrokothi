import type { ValueSchema } from "../schema/value-schema.ts";

/**
 * Knowledge sources.
 *
 * v0 supports two kinds, and the split is the point: a `document` answers "what does the material
 * say about X" with lexical retrieval, while a `record_set` answers "which rows satisfy price <=
 * budget" with a deterministic query. The second must not be left to prose reasoning, which is why
 * it is a typed query engine rather than a pile of text handed to the model.
 */

export interface DocumentSource {
  id: string;
  kind: "document";
  title: string;
  text: string;
  /** Approximate characters per chunk. Chunking is on paragraph boundaries where possible. */
  chunkChars?: number;
  tags?: string[];
}

export interface RecordSetSource {
  id: string;
  kind: "record_set";
  title: string;
  /** Declared field types. A query referencing anything else is an error, not an empty result. */
  fields: Record<string, ValueSchema>;
  records: Record<string, unknown>[];
  /** Field used to name a record in rendered output, e.g. "title". */
  displayField?: string;
  /** Fields included in lexical retrieval text. Defaults to all string-ish fields. */
  searchFields?: string[];
}

export type KnowledgeSource = DocumentSource | RecordSetSource;

export interface KnowledgeBinding {
  source: KnowledgeSource;
  /** Max chunks returned by lexical retrieval. Default 3. */
  topK?: number;
  /** Include lexical hits in compiled context automatically. Default true. */
  autoRetrieve?: boolean;
  /** For record sets: expose a deterministic query tool to the model. Default true. */
  exposeQueryTool?: boolean;
  /** Restrict this source to specific phases. Absent means all phases. */
  phaseIds?: string[];
}

export interface KnowledgeQuery {
  text: string;
  topK?: number;
}

export interface KnowledgeChunk {
  sourceId: string;
  sourceTitle: string;
  chunkId: string;
  text: string;
  /** Lexical relevance score. Comparable only within one retrieval call. */
  score: number;
  /** Present for record-set hits: the underlying row, so callers get structure, not just prose. */
  record?: Record<string, unknown>;
}

/**
 * The retrieval interface. v0 ships an in-memory lexical implementation; a caller may inject
 * anything else that satisfies this shape. Core requires no vector database and no GPU.
 */
export interface KnowledgeRetriever {
  readonly sourceId: string;
  readonly kind: KnowledgeSource["kind"];
  readonly title: string;
  retrieve(query: KnowledgeQuery): Promise<KnowledgeChunk[]>;
}

// ---------------------------------------------------------------------------
// Deterministic record queries
// ---------------------------------------------------------------------------

export type RecordFilterOp = "eq" | "ne" | "lt" | "lte" | "gt" | "gte" | "in" | "contains" | "starts_with";

export interface RecordFilter {
  field: string;
  op: RecordFilterOp;
  value: unknown;
}

export interface RecordSort {
  field: string;
  direction: "asc" | "desc";
}

export interface RecordQuery {
  filters?: RecordFilter[];
  sort?: RecordSort[];
  limit?: number;
}

export interface RecordQueryResult {
  sourceId: string;
  /** Rows that satisfied every filter, after sorting and limiting. */
  matches: Record<string, unknown>[];
  /** Match count *before* `limit` was applied - the honest answer to "how many are there". */
  totalMatched: number;
  /** Total rows in the source, so "0 of 6" can be stated truthfully. */
  totalRecords: number;
  /** The normalized query actually executed, for the trace. */
  query: RecordQuery;
}

export interface RecordQueryError {
  code: "unknown_field" | "bad_operator" | "bad_value" | "unknown_source";
  message: string;
}
