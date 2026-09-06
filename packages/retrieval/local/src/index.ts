/**
 * Local retrieval implementations for the Execution kernel.
 *
 * This package exists because a retrieval implementation is not kernel semantics. The dependency
 * direction is one-way and enforced by an architecture test:
 *
 * ```text
 * retrieval/local implementation
 *         |
 *         v
 * core ports / contracts
 * ```
 *
 * Core owns generic capability and local-resource contracts; this package owns lexical document
 * retrieval, the deterministic record-set evaluator, materialized read-only resource views, and a
 * retrieval capability executor. LangChain lives here, not in `packages/core`.
 *
 * Both retrieval paths are provided on purpose, because they are semantically different:
 *
 *   `createLocalCorpusResource` / `createLocalRecordsResource`
 *     already-materialized read-only data; Stage-local computation; no Effect
 *
 *   `createLocalRetrievalExecutor`
 *     the mediated path; a Stage must request a UseCapability Effect and observe the result Event
 *
 */

export { DEFAULT_CHUNK_OVERLAP, DEFAULT_CHUNK_SIZE, LexicalIndex, splitSource, tokenize } from "./lexical.ts";
export type { LexicalChunk, LexicalSourceInput } from "./lexical.ts";

export {
  RECORD_FILTER_OPERATORS,
  queryRecords,
  recordFieldDescription,
  recordFieldExamples,
  recordFieldSchema,
} from "./records.ts";
export type {
  RecordField,
  RecordFieldMetadata,
  RecordFilter,
  RecordFilterOp,
  RecordQuery,
  RecordQueryError,
  RecordQueryResult,
  RecordSetView,
  RecordSort,
} from "./records.ts";

export { LOCAL_CORPUS_KIND, LOCAL_RECORDS_KIND, createLocalCorpusResource, createLocalRecordsResource } from "./resources.ts";
export type { LocalCorpusInput, LocalCorpusReadResult } from "./resources.ts";

export {
  LOCAL_RETRIEVAL_CAPABILITY,
  LOCAL_RETRIEVAL_OPERATIONS,
  createLocalRetrievalExecutor,
} from "./capability.ts";
export type { LocalRetrievalExecutorOptions } from "./capability.ts";
