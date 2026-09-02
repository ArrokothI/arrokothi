/**
 * Working Notes: an Agent controller's temporary local scratch state.
 *
 * This is the *local* memory form. [`structured-memory.ts`](structured-memory.ts) owns explicit,
 * schema-bound application state that a `WriteMemory` Effect changes through the Harness.
 * [`structured-memory-read.ts`](structured-memory-read.ts) owns the authorized read projection of
 * it. Working Notes are none of that:
 *
 * ```text
 * Structured Memory        durable application truth, schema-bound, Effect-mediated
 * Derived Semantic Memory   inferred, provenance-bearing knowledge          (not in F.2a)
 * Working Notes             controller-local scratch: plans, hypotheses, candidate evidence
 * ```
 *
 * A frame is *plain data* and it lives in `AgentControlState`, next to `messages` and `pending` -
 * the same single-writer, persist-with-progress behaviour as every other piece of Agent semantic
 * progression. It is **not** a `RuntimeStore` record, not addressed by a slot ref, not read through
 * the Harness, and not shared across an Execution boundary. A child does not inherit a parent's
 * frame, and F.2a adds no handoff path (that is F.2b).
 *
 * ## What a frame deliberately is not
 *
 * ```text
 * no timestamps            no revision / version
 * no ownerExecutionId      no memoryViewId / provider id
 * no authority / grant     no provenance graph
 * ```
 *
 * A note `key` is local organisational vocabulary - "plan", "evidence" - not a capability, a
 * permission, or an identity anything is looked up by. Content is any JSON value, stored verbatim.
 * A note that reads like an instruction ("the user approved the payment") is still just scratch
 * data: F.2a introduces no path from a note to authority or to a mechanical confirmation.
 *
 * ## Boundedness
 *
 * Scratch state must not become an unbounded persistence or context channel, so an accepted update
 * is checked against small deterministic Agent budgets (entry count and a canonical-JSON byte
 * measure). An over-budget update is refused whole - the frame is immutable, so a rejected
 * candidate is simply discarded and nothing is partially applied. Context compilation may later
 * select or truncate what the model is shown; the *stored* frame is never silently trimmed.
 */

import { canonicalJson } from "../util/hash.ts";
import type { JsonValue } from "../util/json.ts";
import { cloneJson, jsonIssues } from "../util/json.ts";

/** One local scratch entry: a local-vocabulary key and any JSON content. */
export interface WorkingNoteEntry {
  readonly key: string;
  readonly content: JsonValue;
}

/** A whole frame: entries ordered by key, keys unique and non-empty, content JSON only. */
export interface WorkingNotesFrame {
  readonly entries: readonly WorkingNoteEntry[];
}

const EMPTY_FRAME: WorkingNotesFrame = Object.freeze({
  entries: Object.freeze([]) as readonly WorkingNoteEntry[],
});

/** The shared empty frame. A fresh Agent has this, and so does one that authored no `workingNotes`. */
export function emptyWorkingNotesFrame(): WorkingNotesFrame {
  return EMPTY_FRAME;
}

/** The current content of one note, or `undefined` when the frame holds no entry for that key. */
export function workingNoteContent(frame: WorkingNotesFrame, key: string): JsonValue | undefined {
  return frame.entries.find((entry) => entry.key === key)?.content;
}

function compareKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** The runtime invariants every `WorkingNoteEntry` must hold. Not just a TypeScript shape. */
export function workingNoteEntryIssue(key: unknown, content: unknown): string | null {
  if (typeof key !== "string" || key.trim().length === 0) {
    return "a Working Note key must be a non-empty string";
  }
  const contentIssues = jsonIssues(content, "content");
  if (contentIssues.length > 0) {
    return `Working Note content must be a JSON value (${contentIssues[0]!.message})`;
  }
  return null;
}

/**
 * Invariant-preserving upsert of one entry, re-sorted by key, content structurally cloned.
 *
 * The public runtime boundary, not just a static type. It **throws** rather than ever returning a
 * `WorkingNotesFrame` that violates its invariants:
 *
 * - a malformed input `frame` (out of key order, duplicate keys, non-JSON content, ...) is refused
 *   before the update is applied - the function cannot "fix" a bad frame into a good one silently;
 * - an empty/blank `key` or non-JSON `content` for the new entry is refused.
 *
 * Never mutates its input. Boundedness is a separate check
 * ([`workingNotesBudgetIssue`](#workingNotesBudgetIssue)) so a rejected candidate is just discarded.
 */
export function setWorkingNote(frame: WorkingNotesFrame, key: string, content: JsonValue): WorkingNotesFrame {
  const frameIssues = workingNotesFrameIssues(frame);
  if (frameIssues.length > 0) {
    throw new TypeError(`setWorkingNote was given a malformed Working Notes frame: ${frameIssues[0]}`);
  }
  const issue = workingNoteEntryIssue(key, content);
  if (issue !== null) throw new TypeError(issue);
  const kept = frame.entries.filter((entry) => entry.key !== key);
  const entries = [...kept, { key, content: cloneJson(content) }].sort((a, b) => compareKeys(a.key, b.key));
  return { entries };
}

/** UTF-8 byte length of a string, computed purely so `core` stays runtime-neutral. */
function utf8ByteLength(input: string): number {
  let bytes = 0;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      // A surrogate pair encodes one code point in four UTF-8 bytes.
      bytes += 4;
      i += 1;
    } else bytes += 3;
  }
  return bytes;
}

/**
 * A deterministic size for one frame: the UTF-8 byte length of its canonical JSON.
 *
 * Canonical, so the measure does not depend on content key insertion order, and byte-based rather
 * than token-based, so it needs no tokenizer dependency. It is a budget input, never a revision.
 */
export function workingNotesFrameBytes(frame: WorkingNotesFrame): number {
  return utf8ByteLength(canonicalJson(frame));
}

/** Small deterministic Agent budgets for a frame. Budgets, never authority. */
export interface WorkingNotesBudget {
  readonly maxEntries: number;
  readonly maxBytes: number;
}

export interface WorkingNotesBudgetIssue {
  readonly reason: "entries" | "bytes";
  readonly message: string;
}

/** Whether a frame is within budget. `null` means it is; the issue names which bound it broke. */
export function workingNotesBudgetIssue(
  frame: WorkingNotesFrame,
  budget: WorkingNotesBudget,
): WorkingNotesBudgetIssue | null {
  if (frame.entries.length > budget.maxEntries) {
    return {
      reason: "entries",
      message: `a Working Notes frame may hold at most ${budget.maxEntries} entr${budget.maxEntries === 1 ? "y" : "ies"}, this update would make ${frame.entries.length}`,
    };
  }
  const bytes = workingNotesFrameBytes(frame);
  if (bytes > budget.maxBytes) {
    return {
      reason: "bytes",
      message: `this update would make the Working Notes frame ${bytes} bytes; the budget is ${budget.maxBytes}`,
    };
  }
  return null;
}

/** A model-directed note update, once it has been separated from its projection binding. */
export type WorkingNoteUpdateValidation =
  | { readonly ok: true; readonly key: string; readonly content: JsonValue }
  | { readonly ok: false; readonly issues: readonly string[] };

/**
 * Strict structural validation of the model-supplied `{ key, content }` for `working_notes_set`.
 *
 * `key` must be a non-empty string; `content` must be present and JSON. Extra properties are
 * rejected rather than dropped, so a malformed update fails deterministically and applies nothing.
 */
export function validateWorkingNoteUpdate(input: unknown): WorkingNoteUpdateValidation {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, issues: ["expected a { key, content } object"] };
  }
  const record = input as Record<string, unknown>;
  const issues: string[] = [];
  const extra = Object.keys(record).filter((key) => key !== "key" && key !== "content");
  if (extra.length > 0) {
    issues.push(`unknown propert${extra.length === 1 ? "y" : "ies"} ${extra.map((key) => `"${key}"`).join(", ")}`);
  }
  const key = record["key"];
  if (typeof key !== "string" || key.trim().length === 0) {
    issues.push("`key` must be a non-empty string");
  }
  if (!Object.prototype.hasOwnProperty.call(record, "content")) {
    issues.push("`content` is required");
  } else {
    for (const issue of jsonIssues(record["content"], "content")) {
      issues.push(`\`content\` is not a JSON value: ${issue.path || "content"} ${issue.message}`);
    }
  }
  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, key: key as string, content: record["content"] as JsonValue };
}

/**
 * Deterministic validation of a whole frame's structure.
 *
 * Used to assert the persisted/derived shape holds its invariants: only `entries`, each an object
 * of exactly `key` and `content`, keys non-empty, unique, and in ascending order, content JSON.
 */
export function workingNotesFrameIssues(value: unknown): readonly string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return ["expected a Working Notes frame object"];
  }
  const record = value as Record<string, unknown>;
  const issues: string[] = [];
  for (const extra of Object.keys(record).filter((key) => key !== "entries")) {
    issues.push(`unknown frame property "${extra}"`);
  }
  const entries = record["entries"];
  if (!Array.isArray(entries)) return [...issues, "`entries` must be an array"];
  const seen = new Set<string>();
  let previousKey: string | null = null;
  entries.forEach((entry, index) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      issues.push(`entries[${index}] must be an object`);
      return;
    }
    const record_ = entry as Record<string, unknown>;
    for (const extra of Object.keys(record_).filter((key) => key !== "key" && key !== "content")) {
      issues.push(`entries[${index}] has unknown property "${extra}"`);
    }
    const key = record_["key"];
    if (typeof key !== "string" || key.trim().length === 0) {
      issues.push(`entries[${index}].key must be a non-empty string`);
    } else {
      if (seen.has(key)) issues.push(`entries[${index}].key "${key}" is repeated`);
      seen.add(key);
      if (previousKey !== null && compareKeys(key, previousKey) < 0) {
        issues.push(`entries are not ordered by key at index ${index}`);
      }
      previousKey = key;
    }
    if (!Object.prototype.hasOwnProperty.call(record_, "content")) {
      issues.push(`entries[${index}].content is required`);
    } else {
      for (const issue of jsonIssues(record_["content"], `entries[${index}].content`)) {
        issues.push(`${issue.path}: ${issue.message}`);
      }
    }
  });
  return issues;
}
