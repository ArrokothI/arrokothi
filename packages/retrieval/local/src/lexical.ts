/**
 * Local lexical document retrieval.
 *
 * The algorithm is deliberately small and deterministic:
 * recursive character splitting, an explainable IDF-weighted term-overlap score, deterministic
 * tie-breaking by chunk id. No embeddings, no vector service, no model call, no network - which is
 * exactly what makes it usable as a conformance fixture as well as a real local backend.
 *
 * What *has* changed is ownership. This lives outside `packages/core` now, so LangChain is a
 * retrieval-implementation dependency rather than a kernel dependency, and the direction is
 * one-way: this package depends inward on core ports, and core depends on nothing here.
 */

import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export const DEFAULT_CHUNK_SIZE = 1000;
export const DEFAULT_CHUNK_OVERLAP = 200;

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
    .map((token) => token.replace(/\.$/, ""))
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

export interface LexicalSourceInput {
  readonly id: string;
  readonly title: string;
  readonly text: string;
  readonly chunking?: { readonly chunkSize?: number; readonly chunkOverlap?: number };
}

export interface LexicalChunk {
  readonly sourceId: string;
  readonly sourceTitle: string;
  readonly chunkId: string;
  readonly text: string;
  /** Lexical relevance. Comparable only within one retrieval call. */
  readonly score: number;
  readonly rank: number;
}

interface IndexedChunk {
  readonly chunkId: string;
  readonly text: string;
  readonly tokens: Set<string>;
}

/** Splits with LangChain's maintained splitter. Small inputs naturally yield one chunk. */
export async function splitSource(source: LexicalSourceInput): Promise<{ chunkId: string; text: string }[]> {
  const chunkSize = source.chunking?.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkOverlap = source.chunking?.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize, chunkOverlap });
  const input = new Document({ pageContent: source.text, metadata: { sourceId: source.id } });
  const split = await splitter.splitDocuments([input]);
  const documents = split.length ? split : [input];
  return documents.map((document, index) => ({ chunkId: `${source.id}#${index}`, text: document.pageContent }));
}

/** IDF-weighted overlap: common terms carry less signal than terms found in few chunks. */
function score(chunks: readonly IndexedChunk[], queryTokens: readonly string[]): { chunk: IndexedChunk; score: number }[] {
  const total = chunks.length || 1;
  const documentFrequency = new Map<string, number>();
  for (const chunk of chunks) {
    for (const token of chunk.tokens) documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
  }
  return chunks.map((chunk) => {
    let value = 0;
    for (const token of queryTokens) {
      if (!chunk.tokens.has(token)) continue;
      value += Math.log(1 + total / (1 + (documentFrequency.get(token) ?? 0)));
    }
    return { chunk, score: value };
  });
}

/**
 * A lazily-built lexical index over one source.
 *
 * Read-only by construction: it exposes `search` and nothing that could change what it holds.
 */
export class LexicalIndex {
  readonly sourceId: string;
  readonly sourceTitle: string;
  private readonly indexed: Promise<IndexedChunk[]>;

  constructor(source: LexicalSourceInput) {
    this.sourceId = source.id;
    this.sourceTitle = source.title;
    this.indexed = splitSource(source).then((chunks) =>
      chunks.map((chunk) => ({ chunkId: chunk.chunkId, text: chunk.text, tokens: new Set(tokenize(chunk.text)) })),
    );
  }

  async chunkCount(): Promise<number> {
    return (await this.indexed).length;
  }

  async search(query: string, topK: number): Promise<LexicalChunk[]> {
    const tokens = tokenize(query);
    if (tokens.length === 0) return [];
    const chunks = await this.indexed;
    return score(chunks, tokens)
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.chunk.chunkId.localeCompare(b.chunk.chunkId))
      .slice(0, topK)
      .map((entry, index) => ({
        sourceId: this.sourceId,
        sourceTitle: this.sourceTitle,
        chunkId: entry.chunk.chunkId,
        text: entry.chunk.text,
        score: Number(entry.score.toFixed(4)),
        rank: index + 1,
      }));
  }
}
