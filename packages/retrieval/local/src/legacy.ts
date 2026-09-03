/**
 * Legacy pre-v0.4 local knowledge implementation.
 *
 * Moved out of `packages/core` unchanged in behaviour. It is isolated compatibility for consumers
 * that have not migrated to the v0.4 capability/resource path - Studio, the current examples, the
 * benchmark subjects, and the legacy Session runtime - and it has no presumption of surviving.
 * New code should use the v0.4 surface in `./index.ts` instead: a materialized `LocalResource` for
 * Stage-local retrieval, or `createLocalRetrievalExecutor` for the mediated Effect path.
 *
 * Its ownership was the real problem, not its behaviour. Document representation, recursive
 * splitting, and IDF-weighted ranking are perfectly good; they simply are not kernel semantics, and
 * keeping them in core put LangChain in the kernel's install surface.
 */

import { Document } from "@langchain/core/documents";
import { BaseRetriever } from "@langchain/core/retrievers";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type {
  DocumentSearchRequest,
  DocumentSource,
  KnowledgeBinding,
  KnowledgeChunk,
  KnowledgeProvider,
  KnowledgeRetriever,
  KnowledgeSource,
  KnowledgeSourceCatalogEntry,
  RecordQueryRequest,
  RecordQueryError,
  RecordQueryResult,
  RecordSetSource,
  Result,
  WebKnowledgeResult,
  WebSearchProvider,
  WebSearchRequest,
} from "@arrokothi/core";
import { err, recordFieldDescription, recordFieldExamples, recordFieldSchema } from "@arrokothi/core";
import { DEFAULT_CHUNK_OVERLAP, DEFAULT_CHUNK_SIZE, tokenize } from "./lexical.ts";
import { RECORD_FILTER_OPERATORS, queryRecords as executeRecordQuery } from "./records.ts";

export { DEFAULT_CHUNK_OVERLAP, DEFAULT_CHUNK_SIZE, RECORD_FILTER_OPERATORS, tokenize };

interface LexicalMetadata extends Record<string, unknown> {
  sourceId: string;
  sourceTitle: string;
  chunkId: string;
  score?: number;
}

interface IndexedDocument {
  document: Document<LexicalMetadata>;
  tokens: Set<string>;
}

/** Uses LangChain's maintained splitter. Small inputs naturally yield one Document. */
async function splitSource(source: DocumentSource): Promise<Document<LexicalMetadata>[]> {
  const chunkSize = source.chunking?.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkOverlap = source.chunking?.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize, chunkOverlap });
  const input = new Document<LexicalMetadata>({
    pageContent: source.text,
    metadata: { sourceId: source.id, sourceTitle: source.title, chunkId: `${source.id}#0` },
  });
  const split = await splitter.splitDocuments([input]);
  const documents = split.length ? split : [input];
  return documents.map((document, index) =>
    new Document<LexicalMetadata>({
      pageContent: document.pageContent,
      metadata: {
        ...document.metadata,
        sourceId: source.id,
        sourceTitle: source.title,
        chunkId: `${source.id}#${index}`,
      },
    }),
  );
}

/** Public SDK-shaped view used by tests/inspection; no LangChain Document escapes. */
export async function chunkDocument(source: DocumentSource): Promise<{ chunkId: string; text: string }[]> {
  return (await splitSource(source)).map((document) => ({
    chunkId: document.metadata.chunkId,
    text: document.pageContent,
  }));
}

/** IDF-weighted overlap: common terms carry less signal than terms found in few chunks. */
function scoreDocuments(documents: IndexedDocument[], queryTokens: string[]): { item: IndexedDocument; score: number }[] {
  const total = documents.length || 1;
  const documentFrequency = new Map<string, number>();
  for (const item of documents) {
    for (const token of item.tokens) documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
  }
  return documents.map((item) => {
    let score = 0;
    for (const token of queryTokens) {
      if (!item.tokens.has(token)) continue;
      score += Math.log(1 + total / (1 + (documentFrequency.get(token) ?? 0)));
    }
    return { item, score };
  });
}

/** Internal LangChain retriever. It is deliberately not exported from the SDK. */
class LocalLexicalLangChainRetriever extends BaseRetriever<LexicalMetadata> {
  override lc_namespace = ["agent_sdk", "knowledge", "local_lexical"];
  private readonly indexed: Promise<IndexedDocument[]>;

  constructor(source: DocumentSource) {
    super();
    this.indexed = splitSource(source).then((documents) =>
      documents.map((document) => ({ document, tokens: new Set(tokenize(document.pageContent)) })),
    );
  }

  override async _getRelevantDocuments(query: string): Promise<Document<LexicalMetadata>[]> {
    const tokens = tokenize(query);
    if (!tokens.length) return [];
    return scoreDocuments(await this.indexed, tokens)
      .filter(({ score }) => score > 0)
      .sort(({ item: a, score: aScore }, { item: b, score: bScore }) =>
        bScore - aScore || a.document.metadata.chunkId.localeCompare(b.document.metadata.chunkId),
      )
      .map(({ item, score }) =>
        new Document<LexicalMetadata>({
          pageContent: item.document.pageContent,
          metadata: { ...item.document.metadata, score: Number(score.toFixed(4)) },
        }),
      );
  }
}

/** SDK adapter around the internal LangChain retriever and its standard `invoke` path. */
class DocumentRetriever implements KnowledgeRetriever {
  readonly sourceId: string;
  readonly kind = "document" as const;
  readonly title: string;
  private readonly retriever: LocalLexicalLangChainRetriever;
  private readonly defaultTopK: number;

  constructor(source: DocumentSource, defaultTopK: number) {
    this.sourceId = source.id;
    this.title = source.title;
    this.defaultTopK = defaultTopK;
    this.retriever = new LocalLexicalLangChainRetriever(source);
  }

  async retrieve(request: DocumentSearchRequest): Promise<KnowledgeChunk[]> {
    const topK = request.topK ?? this.defaultTopK;
    const documents = (await this.retriever.invoke(request.query)).slice(0, topK);
    return documents.map((document, index) => ({
      sourceId: this.sourceId,
      sourceTitle: this.title,
      chunkId: document.metadata.chunkId,
      text: document.pageContent,
      score: typeof document.metadata.score === "number" ? document.metadata.score : 0,
      rank: index + 1,
    }));
  }
}

/** Convenience formatter for host-side inspection of record rows. */
export function renderRecord(record: Record<string, unknown>): string {
  return Object.entries(record)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
    .join("\n");
}

export function createRetriever(source: DocumentSource, defaultTopK = 3): KnowledgeRetriever {
  return new DocumentRetriever(source, defaultTopK);
}

/** Default provider: LangChain-backed local documents plus SDK-native deterministic record sets. */
export class KnowledgeIndex implements KnowledgeProvider {
  private readonly bindings = new Map<string, KnowledgeBinding>();
  private readonly retrievers = new Map<string, KnowledgeRetriever>();
  private readonly webSearch?: WebSearchProvider;

  constructor(bindings: KnowledgeBinding[] = [], options: { webSearch?: WebSearchProvider } = {}) {
    this.webSearch = options.webSearch;
    for (const binding of bindings) {
      this.bindings.set(binding.source.id, binding);
      if (binding.source.kind === "document") {
        this.retrievers.set(binding.source.id, createRetriever(binding.source, binding.topK ?? 3));
      }
    }
  }

  /** Replace a document retriever without changing Harness, Compiler, Session, Flow, or Tools. */
  setRetriever(sourceId: string, retriever: KnowledgeRetriever): void {
    this.retrievers.set(sourceId, retriever);
  }

  get sourceIds(): string[] {
    return [...this.bindings.keys()];
  }

  getBinding(sourceId: string): KnowledgeBinding | undefined {
    return this.bindings.get(sourceId);
  }

  getSource(sourceId: string): KnowledgeSource | undefined {
    return this.bindings.get(sourceId)?.source;
  }

  getRecordSet(sourceId: string): RecordSetSource | undefined {
    const source = this.getSource(sourceId);
    return source?.kind === "record_set" ? source : undefined;
  }

  recordSets(): RecordSetSource[] {
    return [...this.bindings.values()].map((binding) => binding.source).filter((source): source is RecordSetSource => source.kind === "record_set");
  }

  catalog(phaseId?: string, allowedSourceIds?: string[]): KnowledgeSourceCatalogEntry[] {
    const catalog: KnowledgeSourceCatalogEntry[] = [];
    for (const [sourceId, binding] of this.bindings) {
      if (allowedSourceIds && !allowedSourceIds.includes(sourceId)) continue;
      if (binding.phaseIds && (!phaseId || !binding.phaseIds.includes(phaseId))) continue;
      const source = binding.source;
      if (source.kind === "document") {
        catalog.push({ id: source.id, type: "document", title: source.title, description: source.description });
      } else if (source.kind === "record_set") {
        catalog.push({
          id: source.id,
          type: "record_set",
          title: source.title,
          description: source.description,
          fields: Object.entries(source.fields).map(([name, field]) => ({
            name,
            type: recordFieldSchema(field).kind,
            ...(recordFieldDescription(field) ? { description: recordFieldDescription(field) } : {}),
            ...(recordFieldExamples(field) ? { examples: recordFieldExamples(field) } : {}),
          })),
          supportedOperators: [...RECORD_FILTER_OPERATORS],
        });
      } else {
        catalog.push({
          id: source.id,
          type: "web_search",
          title: source.title,
          description: source.description,
          allowedDomains: source.allowedDomains,
          blockedDomains: source.blockedDomains,
        });
      }
    }
    return catalog;
  }

  /** A planned search targets exactly one logical document source. */
  async retrieve(request: DocumentSearchRequest): Promise<KnowledgeChunk[]> {
    return (await this.retrievers.get(request.sourceId)?.retrieve(request)) ?? [];
  }

  /** Record sets never pass through document retrieval or LangChain. */
  queryRecords(request: RecordQueryRequest): Result<RecordQueryResult, RecordQueryError> {
    const source = this.getRecordSet(request.sourceId);
    if (!source) return err({ code: "unknown_source", message: `record set "${request.sourceId}" is not bound to this agent` });
    const { kind: _kind, sourceId: _sourceId, ...query } = request;
    return executeRecordQuery(source, query);
  }

  async searchWeb(request: WebSearchRequest): Promise<WebKnowledgeResult> {
    const source = this.getSource(request.sourceId);
    if (!source || source.kind !== "web_search") {
      throw new Error(`web search source "${request.sourceId}" is not bound to this agent`);
    }
    if (!this.webSearch) {
      throw new Error(`web search source "${request.sourceId}" is configured, but no WebSearchProvider was injected`);
    }
    const sourceLimit = source.maxResults ?? Number.MAX_SAFE_INTEGER;
    const maxResults = Math.min(request.maxResults ?? source.maxResults ?? 5, sourceLimit);
    const found = await this.webSearch.search({
      query: request.query,
      allowedDomains: source.allowedDomains,
      blockedDomains: source.blockedDomains,
      maxResults,
    });
    return {
      kind: "web_search",
      sourceId: source.id,
      sourceTitle: source.title,
      query: found.query || request.query,
      allowedDomains: source.allowedDomains,
      results: found.results.slice(0, maxResults),
    };
  }
}
