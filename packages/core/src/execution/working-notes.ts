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
 * Deterministic validation of an ordered Working-Note entry list.
 *
 * The structural invariants are the same whether the list is a mutable-by-owner
 * [`WorkingNotesFrame`](#WorkingNotesFrame) or an immutable [`WorkingNotesHandoff`](#WorkingNotesHandoff)
 * snapshot: only `entries`, each an object of exactly `key` and `content`, keys non-empty, unique,
 * and in ascending order, content JSON. `noun` only shapes the messages.
 */
function orderedEntryListIssues(value: unknown, noun: string): readonly string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [`expected a Working Notes ${noun} object`];
  }
  const record = value as Record<string, unknown>;
  const issues: string[] = [];
  for (const extra of Object.keys(record).filter((key) => key !== "entries")) {
    issues.push(`unknown ${noun} property "${extra}"`);
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

/**
 * Deterministic validation of a whole frame's structure.
 *
 * Used to assert the persisted/derived shape holds its invariants: only `entries`, each an object
 * of exactly `key` and `content`, keys non-empty, unique, and in ascending order, content JSON.
 */
export function workingNotesFrameIssues(value: unknown): readonly string[] {
  return orderedEntryListIssues(value, "frame");
}

// -- explicit handoff across a composition boundary (F.2b) ---------------------

/**
 * An immutable Working Notes transfer snapshot for exactly one composition boundary.
 *
 * ```text
 * WorkingNotesFrame      mutable-by-owner scratch state carried across a controller's own progress
 * WorkingNotesHandoff    a deep copy of an explicitly selected subset, frozen at one boundary
 * ```
 *
 * Structurally an ordered entry list like a frame, but it is a *different concept*: nothing owns it,
 * nothing revises it, and it is never a live reference back to the source frame. It carries no
 * owner id, revision, authority, credential, or provenance graph - only the selected entries. A
 * parent selects it with [`selectWorkingNotesHandoff`](#selectWorkingNotesHandoff) and attaches it
 * to a `SpawnExecution` proposal; the child Execution retains it as an **immutable inherited
 * (read-only) record** on its `ExecutionContext`, and its controller *seeds* its own separate
 * fresh writable frame from a deep copy with
 * [`workingNotesFrameFromHandoff`](#workingNotesFrameFromHandoff), exactly once. The two artifacts
 * coexist - the inherited snapshot does not disappear once it has seeded the writable frame; it is
 * simply never re-overlaid.
 */
export interface WorkingNotesHandoff {
  readonly entries: readonly WorkingNoteEntry[];
}

/**
 * Which notes cross the boundary.
 *
 * Explicit and small: a list of keys. There is deliberately no "all" mode and an absent selection
 * is not "all" - no handoff declaration means zero notes cross. A Working Note key is dynamic local
 * vocabulary rather than a stable identity, so a selected key that the source frame does not
 * currently hold is *ignored* (it reveals nothing to the child and it is not an error). Selection
 * is data-flow intent, never permission.
 */
export type WorkingNotesHandoffSelection = { readonly keys: readonly string[] };

/**
 * The runtime invariants a `WorkingNotesHandoffSelection` must hold, not just its TypeScript shape.
 *
 * A plain object with exactly `keys`, an array of unique non-empty strings. An empty `keys` array
 * is valid (an explicit "hand off nothing"). Unknown properties are rejected rather than dropped.
 */
export function workingNotesHandoffSelectionIssues(value: unknown): readonly string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return ["expected a { keys } selection object"];
  }
  const record = value as Record<string, unknown>;
  const issues: string[] = [];
  for (const extra of Object.keys(record).filter((key) => key !== "keys")) {
    issues.push(`unknown selection property "${extra}"`);
  }
  const keys = record["keys"];
  if (!Array.isArray(keys)) return [...issues, "`keys` must be an array"];
  const seen = new Set<string>();
  keys.forEach((key, index) => {
    if (typeof key !== "string" || key.trim().length === 0) {
      issues.push(`keys[${index}] must be a non-empty string`);
      return;
    }
    if (seen.has(key)) issues.push(`keys[${index}] "${key}" is repeated`);
    seen.add(key);
  });
  return issues;
}

/**
 * Select the named entries from a frame into an immutable, deeply copied handoff snapshot.
 *
 * The invariant-preserving public boundary, in the same fail-closed discipline as `setWorkingNote`:
 * it **throws** on a malformed source `frame` (out of key order, duplicate keys, non-JSON content)
 * or a malformed `selection`, rather than filtering a bad frame into a value that is only
 * statically typed valid. The result never aliases the source frame or its content objects, so a
 * later mutation on either side cannot reach the other. Absent selected keys are ignored; the
 * source frame's key order is preserved.
 */
export function selectWorkingNotesHandoff(
  frame: WorkingNotesFrame,
  selection: WorkingNotesHandoffSelection,
): WorkingNotesHandoff {
  const frameIssues = workingNotesFrameIssues(frame);
  if (frameIssues.length > 0) {
    throw new TypeError(`selectWorkingNotesHandoff was given a malformed Working Notes frame: ${frameIssues[0]}`);
  }
  const selectionIssues = workingNotesHandoffSelectionIssues(selection);
  if (selectionIssues.length > 0) {
    throw new TypeError(`selectWorkingNotesHandoff was given a malformed selection: ${selectionIssues[0]}`);
  }
  const wanted = new Set(selection.keys);
  const entries = frame.entries
    .filter((entry) => wanted.has(entry.key))
    .map((entry) => ({ key: entry.key, content: cloneJson(entry.content) }));
  return { entries };
}

/**
 * A handoff snapshot as a child controller's *fresh* initial writable frame.
 *
 * Invariant-preserving: it **throws** on a malformed input `handoff` rather than returning a
 * `WorkingNotesFrame` that violates its own invariants. Deep-copies every entry, so the child's
 * frame is independent of the snapshot from the first Activation onward.
 */
export function workingNotesFrameFromHandoff(handoff: WorkingNotesHandoff): WorkingNotesFrame {
  const issues = workingNotesHandoffIssues(handoff);
  if (issues.length > 0) {
    throw new TypeError(`workingNotesFrameFromHandoff was given a malformed handoff: ${issues[0]}`);
  }
  const entries = handoff.entries
    .map((entry) => ({ key: entry.key, content: cloneJson(entry.content) }))
    .sort((a, b) => compareKeys(a.key, b.key));
  return { entries };
}

/** Deterministic structural validation of a handoff snapshot. Same invariants as a frame. */
export function workingNotesHandoffIssues(value: unknown): readonly string[] {
  return orderedEntryListIssues(value, "handoff");
}

/**
 * A deep, alias-free copy of a handoff snapshot, so a stored record never aliases the proposal.
 *
 * Invariant-preserving: it **throws** on a malformed input rather than returning a
 * `WorkingNotesHandoff` that violates its invariants. (The Effect gateway's own call is safe
 * because the proposal was already structurally validated by `effectProposalIssues`.)
 */
export function cloneWorkingNotesHandoff(handoff: WorkingNotesHandoff): WorkingNotesHandoff {
  const issues = workingNotesHandoffIssues(handoff);
  if (issues.length > 0) {
    throw new TypeError(`cloneWorkingNotesHandoff was given a malformed handoff: ${issues[0]}`);
  }
  return { entries: handoff.entries.map((entry) => ({ key: entry.key, content: cloneJson(entry.content) })) };
}

/**
 * The generic maximum a handoff may be to ride a `SpawnExecution` across the Harness.
 *
 * This is a transfer *envelope*, not a per-child budget: the Harness resolves a child Definition
 * but must not parse Agent-internal limits to mediate a generic spawn, so it enforces this fixed
 * ceiling atomically at creation. The values equal `DEFAULT_AGENT_LIMITS`'s Working Notes budgets
 * on purpose - a default-limits parent's frame is already within that budget, so any subset of it
 * fits the envelope and a default-limits child accepts it without a second failure. A child with a
 * *lower* custom budget re-validates the handoff at initialization; a child with a *higher* custom
 * budget cannot receive a handoff larger than the envelope. Neither case ever truncates silently.
 */
export const WORKING_NOTES_HANDOFF_MAX_ENTRIES = 32;
export const WORKING_NOTES_HANDOFF_MAX_BYTES = 16384;

/** Whether a handoff is within the transfer envelope. `null` means it is. */
export function workingNotesHandoffBudgetIssue(handoff: WorkingNotesHandoff): WorkingNotesBudgetIssue | null {
  return workingNotesBudgetIssue(
    { entries: handoff.entries },
    { maxEntries: WORKING_NOTES_HANDOFF_MAX_ENTRIES, maxBytes: WORKING_NOTES_HANDOFF_MAX_BYTES },
  );
}
