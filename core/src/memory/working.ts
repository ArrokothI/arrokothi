import type { WorkingNote } from "./types.ts";

/**
 * Working memory operations.
 *
 * Working notes are non-authoritative by construction. Nothing here is consulted by the tool
 * authorization path - see `tools/authorize.ts`, which reads structured memory, tool results, and
 * host context, and does not import this module at all. That absence is the enforcement.
 */

export function addNote(notes: WorkingNote[], note: WorkingNote): WorkingNote[] {
  return [...notes, note];
}

/** Drops notes whose own `expiresAt` has passed, or that are older than the policy TTL. */
export function liveNotes(notes: WorkingNote[], now: Date, ttlMs = 0): WorkingNote[] {
  const nowMs = now.getTime();
  return notes.filter((n) => {
    if (n.expiresAt && new Date(n.expiresAt).getTime() <= nowMs) return false;
    if (ttlMs > 0 && nowMs - new Date(n.at).getTime() > ttlMs) return false;
    return true;
  });
}

/**
 * Selects notes for compiled context: most recent first, capped.
 *
 * Recency beats lexical relevance here on purpose. A working note is a short-lived observation
 * about the current conversation, so "what did I just notice" is the useful ordering, and it keeps
 * the selection deterministic and explainable in a trace.
 */
export function selectNotes(notes: WorkingNote[], now: Date, ttlMs = 0, limit = 5): WorkingNote[] {
  return liveNotes(notes, now, ttlMs)
    .slice()
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}
