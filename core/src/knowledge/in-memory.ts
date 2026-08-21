import type {
  DocumentSource,
  KnowledgeBinding,
  KnowledgeChunk,
  KnowledgeQuery,
  KnowledgeRetriever,
  KnowledgeSource,
  RecordSetSource,
} from "./types.ts";

/**
 * In-memory knowledge retrieval, CPU-only.
 *
 * v0 uses lexical retrieval - tokenize, drop stopwords, score by IDF-weighted overlap. No embedding
 * model, no vector database, no GPU. This is enough for the small documents and record sets the
 * Studio is designed to hold, and it has the useful property of being completely explainable: you
 * can always say exactly why a chunk was retrieved.
 */

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "can", "do", "does", "for", "from", "had",
  "has", "have", "how", "i", "if", "in", "is", "it", "its", "me", "my", "no", "not", "of", "on",
  "or", "our", "so", "that", "the", "their", "them", "then", "there", "these", "they", "this",
  "to", "was", "we", "were", "what", "when", "where", "which", "who", "will", "with", "would", "you", "your",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9.]+/)
    .map((t) => t.replace(/\.$/, ""))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

const DEFAULT_CHUNK_CHARS = 700;

/** Splits on blank lines, then packs paragraphs up to the target size so sentences stay intact. */
export function chunkDocument(source: DocumentSource): { chunkId: string; text: string }[] {
  const target = source.chunkChars ?? DEFAULT_CHUNK_CHARS;
  const paragraphs = source.text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks: { chunkId: string; text: string }[] = [];
  let buffer = "";

  const flush = () => {
    if (!buffer) return;
    chunks.push({ chunkId: `${source.id}#${chunks.length}`, text: buffer });
    buffer = "";
  };

  for (const paragraph of paragraphs) {
    if (buffer && buffer.length + paragraph.length + 2 > target) flush();
    buffer = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    if (buffer.length >= target) flush();
  }
  flush();
  return chunks.length ? chunks : [{ chunkId: `${source.id}#0`, text: source.text.trim() }];
}

interface ScoredDoc {
  chunkId: string;
  text: string;
  tokens: Set<string>;
  record?: Record<string, unknown>;
}

/** IDF-weighted overlap: a term shared by every chunk carries no signal, a rare term carries a lot. */
function scoreChunks(docs: ScoredDoc[], queryTokens: string[]): { doc: ScoredDoc; score: number }[] {
  const total = docs.length || 1;
  const df = new Map<string, number>();
  for (const doc of docs) {
    for (const token of doc.tokens) df.set(token, (df.get(token) ?? 0) + 1);
  }
  return docs.map((doc) => {
    let score = 0;
    for (const token of queryTokens) {
      if (!doc.tokens.has(token)) continue;
      const idf = Math.log(1 + total / (1 + (df.get(token) ?? 0)));
      score += idf;
    }
    return { doc, score };
  });
}

class DocumentRetriever implements KnowledgeRetriever {
  readonly sourceId: string;
  readonly kind = "document" as const;
  readonly title: string;
  private readonly docs: ScoredDoc[];
  private readonly defaultTopK: number;

  constructor(source: DocumentSource, defaultTopK: number) {
    this.sourceId = source.id;
    this.title = source.title;
    this.defaultTopK = defaultTopK;
    this.docs = chunkDocument(source).map((c) => ({ chunkId: c.chunkId, text: c.text, tokens: new Set(tokenize(c.text)) }));
  }

  async retrieve(query: KnowledgeQuery): Promise<KnowledgeChunk[]> {
    const tokens = tokenize(query.text);
    if (!tokens.length) return [];
    const topK = query.topK ?? this.defaultTopK;
    return scoreChunks(this.docs, tokens)
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score || a.doc.chunkId.localeCompare(b.doc.chunkId))
      .slice(0, topK)
      .map((s) => ({
        sourceId: this.sourceId,
        sourceTitle: this.title,
        chunkId: s.doc.chunkId,
        text: s.doc.text,
        score: Number(s.score.toFixed(4)),
      }));
  }
}

/** Renders one record as `key: value` lines, which is both the search text and the model-facing form. */
export function renderRecord(record: Record<string, unknown>): string {
  return Object.entries(record)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
    .join("\n");
}

class RecordSetRetriever implements KnowledgeRetriever {
  readonly sourceId: string;
  readonly kind = "record_set" as const;
  readonly title: string;
  private readonly docs: ScoredDoc[];
  private readonly defaultTopK: number;

  constructor(source: RecordSetSource, defaultTopK: number) {
    this.sourceId = source.id;
    this.title = source.title;
    this.defaultTopK = defaultTopK;
    const searchFields = source.searchFields ?? Object.keys(source.fields);
    this.docs = source.records.map((record, i) => {
      const searchable = searchFields
        .map((f) => record[f])
        .filter((v) => v !== undefined && v !== null)
        .map((v) => (Array.isArray(v) ? v.join(" ") : String(v)))
        .join(" ");
      return {
        chunkId: `${source.id}#${i}`,
        text: renderRecord(record),
        tokens: new Set(tokenize(searchable)),
        record,
      };
    });
  }

  async retrieve(query: KnowledgeQuery): Promise<KnowledgeChunk[]> {
    const tokens = tokenize(query.text);
    if (!tokens.length) return [];
    const topK = query.topK ?? this.defaultTopK;
    return scoreChunks(this.docs, tokens)
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score || a.doc.chunkId.localeCompare(b.doc.chunkId))
      .slice(0, topK)
      .map((s) => ({
        sourceId: this.sourceId,
        sourceTitle: this.title,
        chunkId: s.doc.chunkId,
        text: s.doc.text,
        score: Number(s.score.toFixed(4)),
        record: s.doc.record,
      }));
  }
}

export function createRetriever(source: KnowledgeSource, defaultTopK = 3): KnowledgeRetriever {
  return source.kind === "document"
    ? new DocumentRetriever(source, defaultTopK)
    : new RecordSetRetriever(source, defaultTopK);
}

/**
 * The set of sources bound to an agent, with retrieval and record access.
 *
 * A caller may replace any retriever with an injected one (a vector store, a search service) while
 * keeping the record-query path deterministic - the two concerns are separate on purpose.
 */
export class KnowledgeIndex {
  private readonly bindings = new Map<string, KnowledgeBinding>();
  private readonly retrievers = new Map<string, KnowledgeRetriever>();

  constructor(bindings: KnowledgeBinding[] = []) {
    for (const binding of bindings) {
      this.bindings.set(binding.source.id, binding);
      this.retrievers.set(binding.source.id, createRetriever(binding.source, binding.topK ?? 3));
    }
  }

  /** Replace the retriever for a source, keeping its binding. Used to inject non-lexical retrieval. */
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
    return [...this.bindings.values()].map((b) => b.source).filter((s): s is RecordSetSource => s.kind === "record_set");
  }

  /**
   * Lexical retrieval across all auto-retrieve sources visible in the given phase.
   *
   * Returns a flat, score-sorted list so the compiler can take a global top-k rather than k per
   * source - otherwise a single irrelevant source dilutes the context budget.
   */
  async retrieve(query: KnowledgeQuery, phaseId?: string, allowedSourceIds?: string[]): Promise<KnowledgeChunk[]> {
    const results: KnowledgeChunk[] = [];
    for (const [sourceId, binding] of this.bindings) {
      if (binding.autoRetrieve === false) continue;
      if (allowedSourceIds && !allowedSourceIds.includes(sourceId)) continue;
      if (binding.phaseIds && phaseId && !binding.phaseIds.includes(phaseId)) continue;
      const retriever = this.retrievers.get(sourceId);
      if (!retriever) continue;
      results.push(...(await retriever.retrieve(query)));
    }
    return results.sort((a, b) => b.score - a.score || a.chunkId.localeCompare(b.chunkId));
  }
}
