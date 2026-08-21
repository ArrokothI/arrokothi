import type { ValueSchema } from "../schema/value-schema.ts";
import type { Result } from "../util/result.ts";

/** SDK-owned knowledge contracts. LangChain remains an internal document implementation detail. */

export interface DocumentSource {
  id: string;
  kind: "document";
  title: string;
  /** Short routing hint for the planner. Source text is never included in planner context. */
  description?: string;
  text: string;
  chunking?: {
    /** Characters, as interpreted by RecursiveCharacterTextSplitter. Default 1000. */
    chunkSize?: number;
    /** Overlap between adjacent chunks. Default 200. */
    chunkOverlap?: number;
  };
  tags?: string[];
}

export interface RecordSetSource {
  id: string;
  kind: "record_set";
  title: string;
  /** Short routing hint for the planner. Records themselves never enter planner context. */
  description?: string;
  /** Declared field types. A query referencing anything else is an error, not an empty result. */
  fields: Record<string, ValueSchema>;
  records: Record<string, unknown>[];
  /** Field used to name a record in rendered output, e.g. "title". */
  displayField?: string;
  /** Fields included in optional host-side search affordances. Deterministic filters ignore this. */
  searchFields?: string[];
}

export type KnowledgeSource = DocumentSource | RecordSetSource;

export interface KnowledgeBinding {
  source: KnowledgeSource;
  /** Default maximum chunks returned by a planned document search. Default 3. */
  topK?: number;
  /** For record sets: expose a deterministic query tool to the response model. Default true. */
  exposeQueryTool?: boolean;
  /** Restrict this source to specific phases. Absent means all phases. */
  phaseIds?: string[];
}

export interface DocumentSearchRequest {
  kind: "document_search";
  sourceId: string;
  /** Standalone query written by the planner; it need not equal the user's literal message. */
  query: string;
  topK?: number;
}

export interface KnowledgeChunk {
  sourceId: string;
  sourceTitle: string;
  chunkId: string;
  text: string;
  /** Lexical relevance score. Comparable only within one retrieval call. */
  score: number;
  rank: number;
}

/** A source-local document retriever. No LangChain type crosses this interface. */
export interface KnowledgeRetriever {
  readonly sourceId: string;
  readonly kind: "document";
  readonly title: string;
  retrieve(request: DocumentSearchRequest): Promise<KnowledgeChunk[]>;
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

export interface RecordQueryRequest extends RecordQuery {
  kind: "record_query";
  sourceId: string;
}

export type RetrievalRequest = DocumentSearchRequest | RecordQueryRequest;

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

export interface DocumentKnowledgeResult {
  kind: "document_search";
  sourceId: string;
  sourceTitle: string;
  query: string;
  chunks: KnowledgeChunk[];
}

export interface RecordKnowledgeResult {
  kind: "record_query";
  sourceId: string;
  sourceTitle: string;
  query: RecordQuery;
  matches: Record<string, unknown>[];
  totalMatched: number;
  totalRecords: number;
}

export type KnowledgeResult = DocumentKnowledgeResult | RecordKnowledgeResult;

export interface DocumentSourceCatalogEntry {
  id: string;
  type: "document";
  title: string;
  description?: string;
}

export interface RecordSetCatalogEntry {
  id: string;
  type: "record_set";
  title: string;
  description?: string;
  fields: { name: string; type: ValueSchema["kind"] }[];
  supportedOperators: RecordFilterOp[];
}

export type KnowledgeSourceCatalogEntry = DocumentSourceCatalogEntry | RecordSetCatalogEntry;

/** The provider-neutral boundary consumed by Harness. */
export interface KnowledgeProvider {
  catalog(phaseId?: string, allowedSourceIds?: string[]): KnowledgeSourceCatalogEntry[];
  retrieve(request: DocumentSearchRequest): Promise<KnowledgeChunk[]>;
  queryRecords(request: RecordQueryRequest): Result<RecordQueryResult, RecordQueryError>;
}
