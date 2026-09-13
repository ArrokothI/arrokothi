/**
 * A relational agreement oracle for K1.0's ownership inventory.
 *
 * Rebuilt for K10-R2-02. The previous version compared independent token sets: the set of zone ids,
 * the set of roots, the set of DX ids, and "does this package name occur somewhere on the page".
 * Every one of those stays green when the *associations* are wrong - swap two zones' roots, move an
 * owner from one DX row to another, or claim a private package is published, and nothing changes
 * about which tokens are present. An oracle that cannot fail on a wrong row is not evidence that the
 * rows are right.
 *
 * So this module parses the inventory's tables into the relations they assert - zone id to roots,
 * DX id to its whole tuple, package to its subpaths and publishability - and compares each relation
 * against the executable policy and the actual manifests. It is a pure function of the document
 * text, which is what lets `kernel-landing-zone.test.ts` feed it a deliberately mutated copy and
 * require a specific disagreement back.
 *
 * Parsing is deliberately strict. A table row this module cannot read is reported as a disagreement
 * rather than skipped, so the oracle cannot go quiet by failing to find the rows it is meant to
 * check. Uniqueness is part of every keyed relation: a duplicate zone id, DX id or package name is
 * itself a disagreement, so a contradictory row cannot be erased by last-write-wins overwriting
 * (K10-R3-01). The first row for a key is kept; the duplicate is preserved as a disagreement rather
 * than silently overwriting it.
 *
 * Row *identity* is structural, never textual (K10-R6-01). Discovery returns a table as a header
 * plus a body, so the header is the line that structurally precedes the delimiter row and nothing
 * else can be mistaken for it. Earlier revisions returned one undifferentiated row stream and let
 * the reader recognise the header by comparing the first cell against a configured label, which
 * meant any ordinary body row repeating that label - GFM allows arbitrary inline text in a data
 * cell - took the header's silent exit. The configured label is now a *check* on the structurally
 * identified header rather than the rule that selects it: a header that does not carry it is
 * reported, and no body row is ever compared against it. A section is expected to hold exactly one
 * governed table, so a missing table and every row of any further table in the same section are
 * reported too; otherwise a planted delimiter line could promote a contradictory row to "a header"
 * and reopen the same escape through structure instead of through text.
 *
 * Section *membership* is likewise structural, never textual (K10-R7-01). The governed section
 * runs from the first level-2 ATX heading outside fenced code carrying the exact expected title to
 * the first later such heading carrying the expected next title. Literal heading bytes in prose,
 * inline code, fenced code, escaped text or malformed heading-like lines never start or end a
 * section; only a real ATX heading does. Call sites name the full expected titles, not loose
 * textual prefixes.
 *
 * Block *context* is single-consumption and shared (K10-R8-01/K10-R8-02). One `scanBlocks` pass
 * computes every line's context exactly once — ordinary Markdown, fenced literal, GFM raw-HTML
 * block (types 1–7), blank, indented code or blockquote — and both section selection and table
 * discovery consume those annotations without recomputing fence/HTML transitions. A fence or HTML
 * marker that terminates a table body therefore closes the table as a break and is never
 * reprocessed as a second transition, so literal code cannot become a further table; a heading
 * inside a raw block is raw content, so it cannot truncate a governed section and hide a later
 * table. Heading/table recognition runs only where the block context permits Markdown structure.
 */

import type { PackageEntry, Workspace } from "./module-graph.ts";
import type { DeferredExtraction, Zone } from "./boundary-policy.ts";

/** The relations the inventory document asserts. */
export interface ParsedInventory {
  /** Zone id to the roots that zone owns, in document order. */
  readonly zones: ReadonlyMap<string, readonly string[]>;
  /** DX id to its whole row. */
  readonly deferred: ReadonlyMap<string, { readonly currentPath: string; readonly disposition: string; readonly owner: string }>;
  /** Package name to its declared subpaths and publishability. */
  readonly packages: ReadonlyMap<string, { readonly subpaths: readonly string[]; readonly published: boolean }>;
  /** Rows the parser could not read, as human-readable locations. */
  readonly unreadable: readonly string[];
}

const backticked = (cell: string): string[] =>
  (cell.match(/`([^`]+)`/g) ?? []).map((token) => token.replace(/`/g, ""));

/** Whether the `|` at `pos` is escaped by an odd run of preceding backslashes (GFM Example 200). */
function isEscapedPipe(line: string, pos: number): boolean {
  let backslashes = 0;
  for (let j = pos - 1; j >= 0 && line[j] === "\\"; j--) backslashes++;
  return backslashes % 2 === 1;
}

/** Whether the line carries at least one table-cell delimiter under GFM. */
function containsUnescapedPipe(line: string): boolean {
  for (let i = 0; i < line.length; i++) {
    if (line[i] === "|" && !isEscapedPipe(line, i)) return true;
  }
  return false;
}

/**
 * Splits one trimmed GFM table row into cells.
 *
 * GFM Table extension (https://github.github.com/gfm/#tables-extension-): leading and trailing
 * pipes are recommended but not required and may be inconsistent (Example 199), spaces around
 * cells are trimmed, and a pipe is a delimiter only when it is not escaped (Example 200:
 * `\|`, including inside other inline spans, stays inside the cell). Body rows may carry fewer
 * cells than the header (empty cells are inserted) or more (the excess is ignored, Example 204);
 * that padding/truncation is left to each table's `valueOf`, which already fails closed on a
 * missing cell while `readKeyedTable` has already accounted for the key.
 */
function splitGfmRow(trimmed: string): string[] {
  const parts: string[] = [];
  let current = "";
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i]!;
    if (ch === "|" && !isEscapedPipe(trimmed, i)) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);
  let start = 0;
  let end = parts.length;
  // A leading `|` at position 0 cannot be escaped, so it is always the outer delimiter.
  if (trimmed.startsWith("|")) start = 1;
  // A trailing `|` is the outer delimiter only when it is not itself escaped.
  if (trimmed.endsWith("|") && !isEscapedPipe(trimmed, trimmed.length - 1)) end = parts.length - 1;
  return parts
    .slice(start, end)
    .map((cell) => cell.replace(/\\\|/g, "|").trim());
}

/** Whether already-split cells form a GFM delimiter row (dashes with optional alignment colons). */
function isDelimiterCells(cells: readonly string[]): boolean {
  return cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell));
}

/** One GFM table discovered inside a section, with its header held apart from its body. */
interface DiscoveredTable {
  /** The line that structurally precedes the delimiter row. This is the header, by position. */
  readonly header: readonly string[];
  /** Every candidate data row of that table, in document order. */
  readonly body: readonly (readonly string[])[];
}

/**
 * One structural ATX heading on a line that is outside fenced code.
 *
 * GFM ATX headings (CommonMark 0.31 §4.2, carried by GFM): up to three spaces of indentation,
 * one to six `#` characters, then end of line or spaces/tabs followed by heading content. The
 * content is stripped of an optional closing sequence (` ##`). Anything else that merely contains
 * heading-looking bytes is paragraph text, not a heading: prose or inline code starting elsewhere
 * on the line, text inside fenced code, an escaped `\#`, `##foo` with no required whitespace, seven
 * or more `#`, or four-space indented code. Blockquote content (`> ## …`) is likewise not a
 * top-level section heading for this document.
 */
function parseAtxHeading(line: string): { readonly level: number; readonly text: string } | undefined {
  const indent = line.match(/^ */)?.[0].length ?? 0;
  if (indent > 3) return undefined;
  const rest = line.slice(indent);
  if (rest.startsWith(">")) return undefined;
  const hashes = rest.match(/^#{1,6}/)?.[0];
  if (hashes === undefined) return undefined;
  const after = rest.slice(hashes.length);
  if (after !== "" && !/^[ \t\r]/.test(after)) return undefined;
  const content = after.trim().replace(/[ \t]+#+[ \t]*$/, "").trim();
  return { level: hashes.length, text: content };
}

/**
 * A fenced-code marker candidate on one line (GFM fenced code blocks, CommonMark 0.31 §4.5).
 *
 * Up to three spaces of indentation, then three or more backticks or tildes. A backtick fence
 * whose info string contains a backtick is not a fence at all. Whether the candidate opens or
 * closes a block depends on the tracked state (same character, closing run at least as long as
 * the opening run, nothing but spaces/tabs after it); see `updateFence`.
 */
function parseFenceCandidate(line: string): { readonly char: string; readonly length: number; readonly info: string } | undefined {
  const indent = line.match(/^ */)?.[0].length ?? 0;
  if (indent > 3) return undefined;
  const rest = line.slice(indent);
  const run = rest.match(/^(```+|~~~+)/)?.[0];
  if (run === undefined) return undefined;
  const char = run[0]!;
  const info = rest.slice(run.length);
  if (char === "`" && info.includes("`")) return undefined;
  return { char, length: run.length, info };
}

/**
 * Tracked fenced-code state while scanning block structure top to bottom. `ownerDepth` is the
 * list-container stack depth that owns this leaf (0 = document top level): per GFM an unclosed
 * fence ends at the end of its containing block, so the leaf dies when that container does
 * (K10-R10-01). Top-level leaves (owner 0) still run to their normal end or document end.
 */
interface FenceState {
  readonly char: string;
  readonly length: number;
  readonly ownerDepth: number;
}

/**
 * Advances fence state over one line. Fence lines are never headings and never table rows; lines
 * inside a fence are literal code, so heading-looking bytes there remain ordinary content. A
 * closing run with a mismatched character (```` ``` ```` opened, `~~~` seen) does not close the
 * block; the fenced region continues until a matching closer or end of document.
 *
 * Preserved verbatim for K10-R8-01/R9: the round-8 structural heading reconstruction above is
 * not undone. Round 9 keeps this transition but guarantees it runs exactly once per line per
 * scan position via `scanBlocks` below, so a fence that terminates a table body cannot be
 * reprocessed as a second transition.
 */
function updateFence(state: FenceState | null, line: string, ownerDepth = 0): FenceState | null {
  const candidate = parseFenceCandidate(line);
  if (state === null) {
    if (candidate !== undefined) return { char: candidate.char, length: candidate.length, ownerDepth };
    return null;
  }
  if (
    candidate !== undefined &&
    candidate.char === state.char &&
    candidate.length >= state.length &&
    /^[ \t\r]*$/.test(candidate.info)
  ) {
    return null;
  }
  return state;
}

/**
 * Tracked GFM raw-HTML block state (GFM §4.6, seven block types).
 *
 * Kinds 1–5 end on a line containing a specific closing sequence, so they continue across blank
 * lines; kinds 6–7 end at the first blank line. While any HTML block is open its content lines
 * are raw: heading-looking bytes are not ATX headings and table-looking bytes are not tables.
 */
interface HtmlState {
  readonly kind: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  /**
   * The list-container stack depth that owns this leaf (0 = document top level). Like fences,
   * an HTML block ends at the last line of its containing container when its ordinary end
   * condition is not reached first (K10-R10-01).
   */
  readonly ownerDepth: number;
}

/**
 * Block tag names that open a type-6 HTML block under the pinned published GFM 0.29 rule set
 * (GFM §4.6, case-insensitive). This is exactly the 0.29 list: newer CommonMark additions such
 * as `search` are deliberately not included, so `<search> trailing prose` stays ordinary
 * Markdown (it is neither a type-6 start nor, with trailing prose, a complete type-7 tag)
 * while a complete `<search>` line alone still opens type 7 through the tag recognizer.
 * Adopting a newer hybrid list would be an explicit owner/version decision, not a silent edit.
 */
const HTML_BLOCK_TAGS =
  "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h1|h2|h3|h4|h5|h6|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";

/**
 * Whether the line is a thematic break (GFM §4.1): 0–3 spaces of indentation, then three or
 * more of the same `-`/`_`/`*` character, each optionally followed by spaces/tabs, and nothing
 * else. Thematic breaks take precedence over list items when both readings are possible
 * (GFM Example 30: `* * *` is a break, not a list), so list-marker detection must exclude them.
 * They remain ordinary lines for table discovery (a thematic line inside a table body reaches
 * the reader as an unreadable row — fail-loud), but like other structural lines they end open
 * list containers when dedented.
 */
function isThematicBreak(line: string): boolean {
  const indent = line.match(/^ */)?.[0].length ?? 0;
  if (indent > 3 || line.startsWith("\t")) return false;
  return /^([*_-])(?:[ \t]*\1){2,}[ \t\r]*$/.test(line.slice(indent));
}

/**
 * A parsed GFM list-item marker (CommonMark 0.31 §5.2 / GFM §5.2): bullets `-`/`+`/`*` or an
 * ordered run of 1–9 ASCII digits plus `.`/`)` (ten digits, as in `1234567890.`, never open an
 * item), followed by whitespace or end of line. Markers may be indented 0–3 spaces; four or
 * more columns is indented code and never reaches here.
 */
interface ListMarker {
  /** True for `N.`/`N)` forms, false for bullets. */
  readonly ordered: boolean;
  /** The ordered start number, or null for bullets. */
  readonly startNumber: number | null;
  /** Width of the marker itself (`-` → 1, `10.` → 3), in columns. */
  readonly markerWidth: number;
  /** Absolute indentation of the marker, in columns (0–3 here). */
  readonly indent: number;
  /** True when nothing but whitespace follows the marker (an empty item). */
  readonly empty: boolean;
  /** Absolute column at which this item's block content starts (marker + following gap). */
  readonly contentIndent: number;
}

/**
 * Parses a list-item marker at the start of `line`, or returns null. The content indent is
 * derived from GFM marker/continuation rules rather than a fixed width: marker width plus the
 * following 1–4 spaces (tab-expanded to tab stops); a gap of 5 or more columns collapses to 1
 * per the specification, and an empty item defaults to marker width plus 1. Callers must check
 * `isThematicBreak` first so `* * *` and `- - -` stay breaks rather than items.
 */
function parseListMarker(line: string): ListMarker | null {
  const indent = line.match(/^ */)?.[0].length ?? 0;
  if (indent > 3 || line.startsWith("\t")) return null;
  const rest = line.slice(indent);
  const bullet = rest[0] === "-" || rest[0] === "+" || rest[0] === "*";
  const ordered = rest.match(/^[0-9]{1,9}[.)]/)?.[0];
  // Ten or more digits never form an ordered marker: the ordered pattern above cannot match
  // `1234567890.` (no `.`/`)` within nine digits), so `ordered` stays undefined and this guard
  // keeps the line prose — as do digit runs with no delimiter at all (`123 abc`).
  if (!bullet && ordered === undefined) return null;
  const markerWidth = bullet ? 1 : ordered!.length;
  const after = rest.slice(markerWidth);
  if (after !== "" && !/^[ \t\r]/.test(after)) return null;
  // Column just past the marker, then expand the following gap with tab stops of 4.
  let col = indent + markerWidth;
  let k = 0;
  while (k < after.length && (after[k] === " " || after[k] === "\t")) {
    col += after[k] === " " ? 1 : 4 - (col % 4);
    k++;
  }
  const trailing = after.slice(k);
  if (!/^[ \t\r]*$/.test(trailing)) {
    let gap = col - (indent + markerWidth);
    if (gap >= 5) gap = 1;
    return {
      ordered: ordered !== undefined,
      startNumber: ordered !== undefined ? Number.parseInt(ordered.slice(0, -1), 10) : null,
      markerWidth,
      indent,
      empty: false,
      contentIndent: indent + markerWidth + gap,
    };
  }
  return {
    ordered: ordered !== undefined,
    startNumber: ordered !== undefined ? Number.parseInt(ordered.slice(0, -1), 10) : null,
    markerWidth,
    indent,
    empty: true,
    contentIndent: indent + markerWidth + 1,
  };
}

/** One open list-item container frame: where the marker sits and where its content lives. */
interface ListFrame {
  readonly markerIndent: number;
  readonly contentIndent: number;
}

/**
 * A complete HTML open or closing tag occupying its whole line (GFM §4.6 type 7, tag grammar
 * §6.10), or null. Open tags carry zero or more attributes, each beginning with whitespace
 * (so `<a href='bar'title=title>` is ordinary text); values may be unquoted (no whitespace,
 * `"`, `'`, `=`, `<`, `>` or backtick), single-quoted (only `'` ends them) or double-quoted
 * (only `"` ends them) — so quoted `<`/`>` never end the tag early — with optional whitespace
 * around `=` and before the closing `>`/`/>`. Closing tags are `</name>` with optional
 * whitespace only and can never carry attributes.
 */
interface CompleteTag {
  readonly close: boolean;
  readonly tag: string;
}

function parseCompleteTag(rest: string): CompleteTag | null {
  let i = 0;
  if (rest[i] !== "<") return null;
  i++;
  let close = false;
  if (rest[i] === "/") {
    close = true;
    i++;
  }
  const name = rest.slice(i).match(/^[A-Za-z][A-Za-z0-9-]*/)?.[0];
  if (name === undefined) return null;
  i += name.length;
  if (close) {
    while (rest[i] === " " || rest[i] === "\t") i++;
    if (rest[i] !== ">") return null;
    i++;
    if (!/^[ \t\r]*$/.test(rest.slice(i))) return null;
    return { close: true, tag: name };
  }
  for (;;) {
    // GFM defines each attribute as whitespace plus a name plus an optional value: the tag
    // end (`>`/`/>`) needs no whitespace, but another attribute cannot start without any
    // since the tag name or previous attribute, so `<a href='bar'title=title>` and
    // `<Warning a='x'b=title>` stay ordinary Markdown rather than opening a raw block.
    const sepStart = i;
    while (rest[i] === " " || rest[i] === "\t") i++;
    const ch = rest[i];
    if (ch === ">") {
      i++;
      break;
    }
    if (ch === "/" && rest[i + 1] === ">") {
      i += 2;
      break;
    }
    if (i === sepStart) return null;
    const attr = rest.slice(i).match(/^[A-Za-z_:][A-Za-z0-9_.:-]*/)?.[0];
    if (attr === undefined) return null;
    i += attr.length;
    // Optional `=` value with optional surrounding whitespace. When there is no `=`, `i`
    // stays right after the name so the next iteration's separator check sees the gap that
    // follows (this keeps valueless attributes such as `hidden` working).
    let j = i;
    while (rest[j] === " " || rest[j] === "\t") j++;
    if (rest[j] === "=") {
      j++;
      while (rest[j] === " " || rest[j] === "\t") j++;
      const quote = rest[j];
      if (quote === '"' || quote === "'") {
        const end = rest.indexOf(quote, j + 1);
        if (end === -1) return null;
        i = end + 1;
      } else {
        const value = rest.slice(j).match(/^[^ \t\r\n"'=`<>]+/)?.[0];
        if (value === undefined) return null;
        i = j + value.length;
      }
    }
  }
  if (!/^[ \t\r]*$/.test(rest.slice(i))) return null;
  return { close: false, tag: name };
}

/**
 * Whether the line opens a GFM raw-HTML block, assuming the scanner is outside fenced code and
 * outside any HTML block and the line is not blank, indented code or blockquote content.
 *
 * Order follows the pinned published GFM 0.29 specification: type 1 (script/pre/style) first,
 * then comment, processing instruction, CDATA, declaration, type-6 block tags, and finally
 * type 7 (a complete open tag — any name except script/style/pre — or a complete closing tag
 * with no attributes, alone on the line). `textarea` is not type 1 under 0.29: a complete
 * `<textarea>` line opens type 7 instead and therefore ends at a following blank line rather
 * than running to `</textarea>`. Matching is case-insensitive per GFM.
 * Type 4 follows the published uppercase-ASCII rule (`<!DOCTYPE …>` opens; `<!doctype …>` is
 * ordinary prose). Type 7 additionally requires `allowType7`, which the scanner denies while an
 * open paragraph could be interrupted: type-7 blocks cannot start mid-paragraph (GFM Example
 * 156), so a complete tag right after paragraph text stays inline prose rather than opening a
 * raw block. Types 1–6 may interrupt a paragraph and ignore that flag.
 */
function parseHtmlBlockStart(line: string, allowType7: boolean): { readonly kind: 1 | 2 | 3 | 4 | 5 | 6 | 7 } | null {
  const indent = line.match(/^ */)?.[0].length ?? 0;
  if (indent > 3) return null;
  if (line.startsWith("\t")) return null;
  const rest = line.slice(indent);
  if (rest.startsWith(">")) return null;
  if (/^<(script|pre|style)(\s|>|$)/i.test(rest)) return { kind: 1 };
  if (rest.startsWith("<!--")) return { kind: 2 };
  if (rest.startsWith("<?")) return { kind: 3 };
  if (rest.startsWith("<![CDATA[")) return { kind: 5 };
  if (/^<![A-Z]/.test(rest)) return { kind: 4 };
  const type6 = new RegExp(`^<\\/?(?:${HTML_BLOCK_TAGS})(?=[\\s>\\/$]|$)`, "i");
  if (type6.test(rest)) return { kind: 6 };
  if (!allowType7) return null;
  const tag = parseCompleteTag(rest);
  if (tag !== null) {
    const name = tag.tag.toLowerCase();
    if (name !== "script" && name !== "style" && name !== "pre") return { kind: 7 };
  }
  return null;
}
/** Whether a line inside an open HTML block of kinds 1–5 ends that block (the line is raw either way). */
function htmlClosesOnLine(kind: 1 | 2 | 3 | 4 | 5, line: string): boolean {
  switch (kind) {
    case 1:
      return /<\/(script|pre|style)>/i.test(line);
    case 2:
      return line.includes("-->");
    case 3:
      return line.includes("?>");
    case 4:
      return line.includes(">");
    case 5:
      return line.includes("]]>");
  }
}

/** Whether the line is blank (spaces/tabs only). Blank lines break tables and end type-6/7 HTML blocks. */
function isBlankLine(line: string): boolean {
  return line.trim() === "";
}

/**
 * Column width of leading indentation with tab stops of 4 (GFM §2.2). Lines reaching column 4
 * before any non-whitespace character are indented code at top level, never headings, fences,
 * HTML blocks or tables for this governed artifact.
 */
function indentWidth(line: string): number {
  let col = 0;
  for (const ch of line) {
    if (ch === " ") col += 1;
    else if (ch === "\t") col += 4 - (col % 4);
    else break;
  }
  return col;
}

/** Whether the line is indented code (non-blank, indented four or more columns). */
function isIndentedCode(line: string): boolean {
  return !isBlankLine(line) && indentWidth(line) >= 4;
}

/**
 * Whether the line is blockquote content at top level (up to three spaces, then `>`). Quoted
 * lines never open top-level fences, HTML blocks or inventory tables here; a quoted table is
 * not a top-level inventory assertion. The `>` line still breaks an open table body per GFM
 * Example 201, so divergences surface as further-table reports rather than silence.
 */
function isBlockquote(line: string): boolean {
  const indent = line.match(/^ */)?.[0].length ?? 0;
  if (indent > 3 || line.startsWith("\t")) return false;
  return line.slice(indent).startsWith(">");
}

/**
 * One physical source line with its coherent block context, computed exactly once by
 * `scanBlocks`. Section selection and table discovery both consume these annotations; neither
 * recomputes fence/HTML transitions, so a line can never open and close the same block merely
 * because two parser loops process it independently (K10-R8-01).
 */
export interface ScannedLine {
  readonly text: string;
  /** True for fence markers, fence content, HTML markers and HTML raw content: no heading/table recognition. */
  readonly inRaw: boolean;
  /** True for blank lines (table break; ends type-6/7 HTML blocks). */
  readonly isBlank: boolean;
  /**
   * True for indented-code, blockquote and list-container lines (table break; never a
   * top-level table row or section heading). List markers and their content break an open
   * table exactly like blockquotes do.
   */
  readonly isQuotedOrCode: boolean;
  /** The ATX heading on this line, if it is ordinary Markdown that parses as one. */
  readonly heading: { readonly level: number; readonly text: string } | undefined;
  /** True for ordinary Markdown lines on which table recognition may run. */
  readonly allowsTable: boolean;
}

/**
 * One line's block-state transition, recorded for the structural-transition audit.
 *
 * `consumedOnce` is always true: the scan advances exactly one line per step and never
 * reprocesses a line for a second fence/HTML transition. It is recorded per line so the audit
 * can show the K10-R8-01 property directly rather than assert it. `depthBefore`/`depthAfter`
 * carry the open list-item container stack (0 = document top level) with content indents in
 * `containers`; only depth-0 lines may delimit governed sections or form inventory tables
 * (K10-R9-01). The single coherent layer is documented on `scanTransitions` below.
 */
export interface LineTransition {
  readonly index: number;
  readonly text: string;
  readonly fenceBefore: string | null;
  readonly htmlBefore: string | null;
  readonly classification:
    | "fence-marker-open"
    | "fence-closer"
    | "fence-raw"
    | "html-open"
    | "html-open-close-same-line"
    | "html-close-line"
    | "html-raw"
    | "html-end-blank"
    | "blank"
    | "indented-code"
    | "blockquote"
    | "list-marker"
    | "list-content"
    | "ordinary";
  /** Open list-item containers before this line (0 = document top level). */
  readonly depthBefore: number;
  /** Open list-item containers after this line. Only top-level lines may delimit sections/tables. */
  readonly depthAfter: number;
  /** Content indents of the open containers after this line (`c2>c4`), or null when top-level. */
  readonly containers: string | null;
  readonly fenceAfter: string | null;
  readonly htmlAfter: string | null;
  readonly consumedOnce: true;
  /**
   * True when this line's container matching ended an open raw leaf before the line itself
   * was processed: the leaf died with its container (K10-R10-01) and the line then ran the
   * normal path at the surviving depth, so its eligibility below already reflects the close.
   */
  readonly containerClosedLeaf: boolean;
  readonly headingAllowed: boolean;
  readonly tableAllowed: boolean;
}

const fenceName = (fence: FenceState | null): string | null =>
  fence === null ? null : `open(${fence.char}x${fence.length})@${fence.ownerDepth}`;
const htmlName = (html: HtmlState | null): string | null =>
  html === null ? null : `html${html.kind}@${html.ownerDepth}`;

/**
 * Every line's transition through the shared block-state layer, in order. This is the primary
 * scan; `scanBlocks` projects it to the annotations section/table discovery consume.
 */
/**
 * Whether `line` (already split, trimmed) is shaped like a GFM delimiter row. Used only as a
 * paragraph heuristic: a pipeless prose line right after a delimiter-shaped line is plausibly a
 * table body row rather than paragraph text, so a following type-7 tag or restricted list
 * marker is still allowed to start its block (fail-loud) instead of being swallowed as prose.
 */
function isDelimiterShaped(trimmed: string): boolean {
  if (trimmed === "") return false;
  return isDelimiterCells(splitGfmRow(trimmed));
}

/**
 * Whether the previous scanned line keeps a paragraph open across the current line, for the
 * two GFM "cannot interrupt a paragraph" rules this scanner honors: type-7 HTML blocks
 * (Example 156) and restricted list markers (empty items and ordered starts other than 1,
 * which cannot interrupt). A denied tag/marker stays ordinary prose — which over-extends the
 * current container and can only add reports, never silently delete a table. Table-shaped
 * previous lines (pipes) and delimiter-adjacent pipeless lines do not count as paragraph text,
 * so a block after a table is still recognized (fail-loud direction).
 */
function paragraphContinues(out: readonly LineTransition[]): boolean {
  const prev = out[out.length - 1];
  if (prev === undefined) return false;
  if (prev.classification !== "ordinary" && prev.classification !== "list-content") return false;
  if (parseAtxHeading(prev.text) !== undefined) return false;
  if (isThematicBreak(prev.text)) return false;
  if (containsUnescapedPipe(prev.text)) return false;
  const prevprev = out[out.length - 2];
  if (prevprev !== undefined && isDelimiterShaped(prevprev.text.trim())) return false;
  return true;
}

/**
 * Every line's transition through the shared block-state layer, in order. This is the primary
 * scan; `scanBlocks` projects it to the annotations section/table discovery consume.
 *
 * Container model (K10-R9-01): list-item frames `{markerIndent, contentIndent}` form a stack.
 * A marker indented at least to the innermost content indent nests; a marker or structural
 * line dedented below it pops back to the fitting level; blank lines, lazily continuable
 * prose and fenced/HTML raw regions never pop (over-extending a container can only add
 * further-table reports, never silently delete one, while popping early could truncate a
 * section at a nested heading). Prose dedented after a blank line does pop: the blank ends
 * any open item paragraph, so no lazy continuation is possible there.
 * Pop-eligible structural lines are exactly those that can never be lazy paragraph
 * continuations: ATX headings, fences, HTML opens, list markers, blockquotes and thematic
 * breaks always pop when dedented; pipe-carrying lines pop only when no paragraph is open
 * (otherwise they may be lazy text); other prose never pops. Only depth-0 lines may delimit
 * governed sections or form inventory tables.
 *
 * The single coherent block-state transition layer shared by section selection and table
 * discovery (K10-R8-01/K10-R8-02 reconstruction, K10-R9-01/K10-R9-02 container and grammar
 * completion). Every physical source line has one structural identity — leaf/raw context
 * plus container depth — computed through exactly one transition per scan position, and only
 * top-level eligible blocks define governed section/table structure. Heading recognition
 * (`parseAtxHeading`) feeds section identity only on ordinary depth-0 lines, so
 * heading-looking text inside fenced code, raw HTML, quotes, code or list containers can
 * neither start nor end a governed section. Table recognition runs only on lines with
 * `allowsTable`, so literal, quoted or container-local table shapes cannot become inventory
 * relations merely because they resemble the table grammar.
 *
 * Supported Markdown contexts for this governed artifact: top-level ATX headings (any level
 * breaks a table body; exact level-2 titles delimit sections), list-item containers
 * (bullets, 1–9-digit ordered markers, marker-width-derived content indents, nesting;
 * container-local headings break bodies but never delimit), fenced code (backtick/tilde,
 * GFM §4.5), raw HTML blocks types 1–7 (GFM §4.6 with a complete-tag recognizer, the
 * uppercase-ASCII type-4 rule and the type-7 paragraph exception), blank lines, blockquote
 * breaks and indented-code exclusion. Unsupported without silent misreading: setext
 * headings, link reference definitions, tables nested inside blockquotes or list items, and
 * multi-paragraph lazy-continuation subtleties beyond the stated pop rules reach the reader
 * as unreadable/duplicate rows or extra further-table reports (fail-loud), never as silent
 * exits. Residual documented corners: a pipe-less table-body row immediately followed by a
 * type-7 tag or restricted marker is read as paragraph text (the tag/marker stays prose);
 * indented lines are always code regardless of a preceding blank line. Both err toward
 * reporting, never toward silence.
 */
export function scanTransitions(markdown: string): LineTransition[] {
  const lines = markdown.split("\n");
  const out: LineTransition[] = [];
  let fence: FenceState | null = null;
  let html: HtmlState | null = null;
  const lists: ListFrame[] = [];
  const containers = (): string | null =>
    lists.length === 0 ? null : lists.map((frame) => `c${frame.contentIndent}`).join(">");
  const popTo = (indent: number): void => {
    while (lists.length > 0 && indent < lists[lists.length - 1]!.contentIndent) lists.pop();
  };
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!;
    const depthBefore = lists.length;
    const fenceBefore = fenceName(fence);
    const htmlBefore = htmlName(html);
    let containerClosedLeaf = false;
    const common = (
      classification: LineTransition["classification"],
      extra: Partial<LineTransition> = {},
    ): LineTransition => ({
      index, text: line,
      fenceBefore, htmlBefore,
      classification,
      fenceAfter: fenceName(fence), htmlAfter: htmlName(html),
      consumedOnce: true, headingAllowed: false, tableAllowed: false,
      depthBefore, depthAfter: lists.length, containers: containers(),
      containerClosedLeaf,
      ...extra,
    });

    // Container continuation comes before any open leaf/raw state (K10-R10-01): a raw leaf
    // never outlives the list container that owns it. A non-blank line dedented below the
    // owner's content indent ends those containers first; a leaf they own dies with them and
    // the line is then processed normally at the surviving depth (a real heading there is
    // eligible again on that same line). Blank lines never close containers. Top-level
    // leaves (owner depth 0) are unaffected and keep their normal end-of-document lifetime.
    // The stack cannot grow while a leaf is open (raw lines never push), so the owner frame,
    // when one exists, is exactly lists[ownerDepth - 1].
    if (fence !== null || html !== null) {
      const ownerDepth = fence !== null ? fence.ownerDepth : (html as HtmlState).ownerDepth;
      const owner = ownerDepth > 0 ? lists[ownerDepth - 1] : undefined;
      if (owner !== undefined && !isBlankLine(line) && indentWidth(line) < owner.contentIndent) {
        popTo(indentWidth(line));
        fence = null;
        html = null;
        containerClosedLeaf = true;
      }
    }

    if (fence !== null) {
      fence = updateFence(fence, line);
      const closed = fence === null;
      out.push(common(closed ? "fence-closer" : "fence-raw"));
      continue;
    }
    if (html !== null) {
      if (html.kind <= 5) {
        const closes = htmlClosesOnLine(html.kind as 1 | 2 | 3 | 4 | 5, line);
        const kind = html.kind;
        if (closes) html = null;
        out.push(common(closes ? "html-close-line" : "html-raw"));
        continue;
      }
      if (isBlankLine(line)) {
        const kind = html.kind;
        html = null;
        out.push(common("html-end-blank"));
        continue;
      }
      out.push(common("html-raw"));
      continue;
    }
    if (isBlankLine(line)) {
      out.push(common("blank"));
      continue;
    }
    if (isIndentedCode(line)) {
      out.push(common("indented-code"));
      continue;
    }
    if (isBlockquote(line)) {
      // A dedented quote ends open items; a quote at content indent stays item content (GFM
      // containers compose). Either way the line itself is quoted, never top-level structure.
      // Quote-prefixed fence/HTML markers never enter leaf state, so a quote owns no open
      // leaf and there is nothing container-close here beyond the stack pop itself.
      popTo(indentWidth(line));
      out.push(common("blockquote"));
      continue;
    }
    const fenceCandidate = parseFenceCandidate(line);
    if (fenceCandidate !== undefined) {
      // Fences are never lazy continuations: a dedented marker ends open items first, then
      // opens at the surviving depth (container-local when still nested, recording that
      // depth as the new leaf's owner).
      popTo(indentWidth(line));
      fence = updateFence(fence, line, lists.length);
      out.push(common("fence-marker-open"));
      continue;
    }
    const htmlStart = parseHtmlBlockStart(line, !paragraphContinues(out));
    if (htmlStart !== null) {
      popTo(indentWidth(line));
      if (htmlStart.kind <= 5 && htmlClosesOnLine(htmlStart.kind as 1 | 2 | 3 | 4 | 5, line)) {
        out.push(common("html-open-close-same-line"));
      } else {
        html = { ...htmlStart, ownerDepth: lists.length };
        out.push(common("html-open"));
      }
      continue;
    }
    const marker = isThematicBreak(line) ? null : parseListMarker(line);
    if (marker !== null) {
      const restricted =
        marker.empty || (marker.ordered && marker.startNumber !== 1);
      if (restricted && paragraphContinues(out)) {
        // GFM keeps this line as paragraph text (empty items and non-1 ordered starts cannot
        // interrupt): fall through to ordinary prose below with no pop and no push, exactly as
        // if the marker bytes were not there.
      } else {
        popTo(marker.indent);
        lists.push({ markerIndent: marker.indent, contentIndent: marker.contentIndent });
        out.push(common("list-marker"));
        continue;
      }
    }
    // Ordinary content. Structural lines (ATX headings, pipe-carrying table candidates and
    // thematic breaks) end dedented items first — none of them can be lazy continuations —
    // while other prose pops only after a blank line (a blank ends the item paragraph, so no
    // lazy continuation is possible and a dedented paragraph truthfully closes the container;
    // without a preceding blank the prose may be lazy text and the container stays open, so a
    // lazily continued item paragraph is never mistaken for a closed container).
    const heading = parseAtxHeading(line);
    const prev = out[out.length - 1];
    const afterBlank =
      prev !== undefined &&
      (prev.classification === "blank" || prev.classification === "html-end-blank");
    const structural =
      heading !== undefined || isThematicBreak(line) ||
      (containsUnescapedPipe(line) && !paragraphContinues(out));
    if (structural || (afterBlank && lists.length > 0)) popTo(indentWidth(line));
    if (lists.length > 0) {
      out.push(common("list-content"));
      continue;
    }
    out.push(common("ordinary", { headingAllowed: heading !== undefined, tableAllowed: true }));
  }
  return out;
}

export function scanBlocks(markdown: string): ScannedLine[] {
  return scanTransitions(markdown).map((t) => {
    switch (t.classification) {
      case "blank":
      case "html-end-blank":
        return { text: t.text, inRaw: false, isBlank: true, isQuotedOrCode: false, heading: undefined, allowsTable: false };
      case "indented-code":
      case "blockquote":
      case "list-marker":
      case "list-content":
        return { text: t.text, inRaw: false, isBlank: false, isQuotedOrCode: true, heading: undefined, allowsTable: false };
      case "fence-marker-open":
      case "fence-closer":
      case "fence-raw":
      case "html-open":
      case "html-open-close-same-line":
      case "html-close-line":
      case "html-raw":
        return { text: t.text, inRaw: true, isBlank: false, isQuotedOrCode: false, heading: undefined, allowsTable: false };
      case "ordinary":
        return { text: t.text, inRaw: false, isBlank: false, isQuotedOrCode: false, heading: parseAtxHeading(t.text), allowsTable: true };
    }
  });
}

/**
 * The lines of one governed section, selected by Markdown structure rather than substrings.
 *
 * Rebuilt for K10-R7-01 and preserved for K10-R8-01/K10-R8-02. The previous version located
 * the section with `markdown.indexOf(heading)` and `rest.indexOf(nextHeading)`, so any occurrence
 * of those bytes - prose, an inline code span, fenced code, or a malformed heading-like line -
 * truncated the section before table discovery could inspect its block context, silently deleting
 * a later contradictory table. Selection now consumes the shared `scanBlocks` annotations: the
 * section starts at the first level-2 ATX heading on an ordinary line (outside fenced code and
 * outside every GFM raw-HTML block) whose normalised text equals `currentTitle` exactly, and ends
 * at the first later such heading whose text equals `nextTitle` exactly. The round-8 heading
 * grammar (prose/inline/fenced/escaped/malformed cases) is unchanged; round 9 only widens the
 * raw context from fenced code to fenced code plus raw HTML, indented code and blockquotes.
 *
 * Titles are the exact expected heading texts (`Zones`, `Current cross-boundary dependencies`,
 * …), not loose prefixes (`## Current cross-boundary`). A prefix convenient for `indexOf` is not
 * a section identity: two different sections can share a prefix, and a prose mention can contain
 * one. Only the full title at heading level 2 delimits the section.
 *
 * Headings with any other text between start and end - including a repeated current heading
 * (K1.0-SELF-12) - do not end the section. They stay inside it, where the ATX line breaks the
 * table body (GFM Example 201) and any table after them is discovered as a further table and
 * reported. A missing current heading yields no lines (the governed table is then reported
 * missing); a missing next heading runs the section to end of document, so following tables
 * become further tables rather than vanishing.
 */
/**
 * A governed section boundary is an exact expected level-2 ATX heading at the document's
 * top-level block/container depth (K10-R9-01): “parses as an ATX heading” is insufficient, so
 * container-local headings (list items, quotes, code, raw HTML) can break a table body but
 * never delimit a section. Section consumers share one precomputed scan per call below.
 */
function rangeFromScanned(scanned: readonly ScannedLine[], currentTitle: string, nextTitle: string): { readonly start: number; readonly end: number } | null {
  let start: number | null = null;
  let end = scanned.length;
  for (let i = 0; i < scanned.length; i++) {
    const entry = scanned[i]!;
    if (entry.inRaw || entry.isBlank || entry.isQuotedOrCode) continue;
    const heading = entry.heading;
    if (heading === undefined || heading.level !== 2) continue;
    if (start === null) {
      if (heading.text === currentTitle) start = i;
    } else if (heading.text === nextTitle) {
      end = i;
      break;
    }
  }
  if (start === null) return null;
  return { start, end };
}

function sectionRange(markdown: string, currentTitle: string, nextTitle: string): { readonly start: number; readonly end: number } | null {
  return rangeFromScanned(scanBlocks(markdown), currentTitle, nextTitle);
}

function sectionLines(markdown: string, currentTitle: string, nextTitle: string): string[] {
  const scanned = scanBlocks(markdown);
  const range = rangeFromScanned(scanned, currentTitle, nextTitle);
  if (range === null) return [];
  return scanned.slice(range.start + 1, range.end).map((entry) => entry.text);
}

/**
 * The text of one section, from its structural heading to the next one.
 *
 * Kept as a thin join over `sectionLines` because `sectionTables` consumes lines; the boundary
 * itself is structural (see above). `indexOf`/`split` on heading bytes must not return here:
 * slicing on substrings reintroduces K10-R7-01 no matter what the table scanner does.
 */
function sectionText(markdown: string, currentTitle: string, nextTitle: string): string {
  return sectionLines(markdown, currentTitle, nextTitle).join("\n");
}

/**
 * Every GFM table inside a section, each as a structurally identified header plus its body rows.
 *
 * Rebuilt for K10-R5-01, then again for K10-R6-01. Round 5's version accepted only lines that both
 * began and ended with `|`, so a valid GFM data row with an omitted edge pipe never reached the
 * shared keyed reader. Round 6 fixed that but still returned header and body in one stream, leaving
 * the reader to tell them apart by content. Discovery now carries the distinction itself, because
 * only discovery can know it: the header is the line immediately above the delimiter row.
 *
 * The row grammar is unchanged and remains the accepted round-6 reconstruction. A header line
 * carrying an unescaped `|` immediately followed by a delimiter row with the same cell count (GFM:
 * the header must match the delimiter in cell count, Example 203, or there is no table) opens a
 * table; then every subsequent non-blank line until the table breaks is a body candidate -
 * including a line with no `|` at all, which GFM still renders as a single-cell row padded with
 * empties (Example 202). The table breaks at the first blank line or at the start of another
 * block-level structure (fence, HTML block, ATX heading, blockquote, indented code; Example 201); prose before the header or
 * after the break is not a candidate, so the surrounding inventory prose is unaffected. Fenced code, raw-HTML content, indented code and blockquotes
 * are skipped so pipes inside non-table blocks stay out of the relations - such a line renders as code, so the
 * document does not assert it as a row. The delimiter row of a discovered table is the only line
 * consumed without becoming a candidate; any later delimiter-shaped line inside a body is an
 * ordinary body row and reaches the reader as unreadable rather than disappearing.
 *
 * Block context is shared with section selection through scanBlocks, so a heading inside fenced code or inside a raw-HTML block neither opens a table nor truncates a section, and a fence or HTML marker encountered where a table body is open closes that body and is consumed exactly once by the single linear pass below rather than reprocessed as a second transition (K10-R7-01 preserved; K10-R8-01/K10-R8-02). The heading break accepts any ATX level: any structural heading ends the table
 * body per GFM Example 201, while only the exact expected level-2 titles delimit sections.
 */
function sectionTables(markdown: string, currentTitle: string, nextTitle: string): DiscoveredTable[] {
  // One precomputed scan serves both the range and the table pass: the block-state model is
  // coherent per scan, and no line is re-transitioned between selection and discovery.
  const scanned = scanBlocks(markdown);
  const range = rangeFromScanned(scanned, currentTitle, nextTitle);
  if (range === null) return [];
  // Single linear pass over the shared annotations between the section boundaries. The index
  // always advances by at least one per iteration and block transitions are never recomputed
  // here, so a fence or HTML marker that terminates a table body is consumed exactly once
  // (K10-R8-01): it closes the open table as a break and the scan moves past it. There is no
  // nested body loop that can leave `i` on the terminator for the outer loop to reprocess as a
  // second transition.
  const tables: DiscoveredTable[] = [];
  let open: { readonly header: readonly string[]; readonly body: string[][] } | null = null;
  let i = range.start + 1;
  const closeOpen = (): void => {
    if (open !== null) {
      tables.push({ header: open.header, body: open.body });
      open = null;
    }
  };
  while (i < range.end) {
    const entry = scanned[i]!;
    const line = entry.text;
    if (entry.inRaw || entry.isBlank || entry.isQuotedOrCode) {
      // Fence/HTML markers and raw content, blank lines, indented code and blockquotes all break
      // an open table body per GFM Example 201 and are never rows themselves. Raw lines stay out
      // of the relations; quoted/code lines are top-level breaks rather than inventory rows.
      closeOpen();
      i++;
      continue;
    }
    if (entry.heading !== undefined) {
      // Any structural ATX heading (any level) breaks the body; only exact level-2 titles
      // delimit sections (handled by `sectionRange`).
      closeOpen();
      i++;
      continue;
    }
    if (open !== null) {
      // Every subsequent ordinary non-blank line until the table breaks is a body candidate,
      // including a line with no `|` at all (GFM Example 202, padded with empties downstream).
      // A later delimiter-shaped line is an ordinary body row reaching the reader as unreadable.
      open.body.push(splitGfmRow(line.trim()));
      i++;
      continue;
    }
    const trimmed = line.trim();
    if (!containsUnescapedPipe(trimmed)) {
      i++;
      continue;
    }
    // Peek at the delimiter candidate without transitioning block state: the annotation for the
    // next line was already computed once by `scanBlocks`, so this is a read, not a second
    // fence/HTML transition. The delimiter must itself be ordinary Markdown with a matching
    // cell count (GFM Example 203) or there is no table.
    const next = i + 1 < range.end ? scanned[i + 1]! : undefined;
    if (next === undefined || next.inRaw || next.isBlank || next.isQuotedOrCode || next.heading !== undefined) {
      i++;
      continue;
    }
    const headerCells = splitGfmRow(trimmed);
    const delimiterCells = splitGfmRow(next.text.trim());
    if (delimiterCells.length !== headerCells.length || !isDelimiterCells(delimiterCells)) {
      i++;
      continue;
    }
    // The delimiter row is the only line consumed without becoming a candidate; it is consumed
    // here, once, alongside its header.
    open = { header: headerCells, body: [] };
    i += 2;
  }
  closeOpen();
  return tables;
}

/** How one keyed table is read. */
interface RowSpec<T> {
  /** Name used in disagreement messages. */
  readonly table: string;
  /**
   * The first cell the structurally identified header is expected to carry.
   *
   * This is a *check* on the header discovery already found by position, never the rule that picks
   * it out (K10-R6-01). A header that does not carry this label is reported; a body row that does
   * carry it is an ordinary body row and is keyed, duplicate-checked and parsed like any other.
   */
  readonly expectedHeaderFirstCell: string;
  /** The row's key, or undefined when the row carries no recognisable key. */
  readonly keyOf: (cells: readonly string[]) => string | undefined;
  /** How a duplicate is described, so each table keeps its own established wording. */
  readonly duplicate: (key: string) => string;
  /** The row's value, or undefined when the remaining cells are malformed. */
  readonly valueOf: (cells: readonly string[]) => T | undefined;
}

/**
 * Reads one keyed table so that **every candidate row ends in exactly one outcome**: the governed
 * table's header is accepted (or reported when it is not the expected header), and every body row
 * is recorded, reported as a duplicate key, or reported as unreadable. Nothing is discarded
 * silently, and nothing is classified by its text.
 *
 * Two orderings carry the whole claim.
 *
 * Header before body, structurally (K10-R6-01). The header is whichever line discovery found above
 * the delimiter row, so exactly one row per table can take the header exit and it is chosen before
 * any cell is compared to anything. The previous version skipped `cells[0] === headerFirstCell`
 * inside the body loop, which gave every later row repeating that label the same silent exit: GFM
 * allows arbitrary inline text in a data cell, so `| Zone id | ... |` was an ordinary body row that
 * vanished. The label survives only as an assertion about the header it no longer selects.
 *
 * Key before value (K10-R4-01). The key is taken and the duplicate check runs *before* the rest of
 * the row is parsed, and a key is marked seen even when the rest fails to parse. Without that, a
 * row carrying a recognisable key and a malformed cell vanished before uniqueness was ever
 * considered, so a contradictory duplicate could be erased by its own malformedness. Failing to
 * parse a row is never a way to be ignored.
 *
 * A section is expected to hold exactly one governed table. A missing table is reported rather than
 * read as an empty relation, and every row of any further table in the section - its header
 * included - is reported, so a planted delimiter line cannot promote a contradictory row out of the
 * body and into a silently skipped header.
 */
function readKeyedTable<T>(
  tables: readonly DiscoveredTable[],
  spec: RowSpec<T>,
  into: Map<string, T>,
  unreadable: string[],
): void {
  const [governed, ...further] = tables;
  if (governed === undefined) {
    unreadable.push(`${spec.table} table is missing from its section`);
    return;
  }
  if (governed.header[0] !== spec.expectedHeaderFirstCell) {
    unreadable.push(
      `${spec.table} table header starts with "${governed.header[0] ?? ""}", not "${spec.expectedHeaderFirstCell}": ${governed.header.join(" | ")}`,
    );
  }

  const seen = new Set<string>();
  for (const cells of governed.body) {
    const key = spec.keyOf(cells);
    if (key === undefined || key === "") {
      unreadable.push(`${spec.table} row has no recognisable key: ${cells.join(" | ")}`);
      continue;
    }
    if (seen.has(key)) {
      unreadable.push(`${spec.duplicate(key)}: ${cells.join(" | ")}`);
      continue;
    }
    seen.add(key);
    const value = spec.valueOf(cells);
    if (value === undefined) {
      unreadable.push(`${spec.table} row for ${key} is malformed: ${cells.join(" | ")}`);
      continue;
    }
    into.set(key, value);
  }

  for (const extra of further) {
    for (const cells of [extra.header, ...extra.body]) {
      unreadable.push(`${spec.table} section contains a further table; this row is outside the governed table: ${cells.join(" | ")}`);
    }
  }
}

/** Parses the inventory's three ownership tables into the relations they assert. */
export function parseInventory(markdown: string): ParsedInventory {
  const zones = new Map<string, readonly string[]>();
  const deferred = new Map<string, { currentPath: string; disposition: string; owner: string }>();
  const packages = new Map<string, { subpaths: readonly string[]; published: boolean }>();
  const unreadable: string[] = [];

  readKeyedTable(
    sectionTables(markdown, "Zones", "Current cross-boundary dependencies"),
    {
      table: "Zones",
      expectedHeaderFirstCell: "Zone id",
      keyOf: (cells) => backticked(cells[0] ?? "")[0],
      duplicate: (key) => `duplicate Zones row for zone ${key}`,
      valueOf: (cells) => {
        const roots = backticked(cells[1] ?? "");
        return roots.length === 0 ? undefined : roots;
      },
    },
    zones,
    unreadable,
  );

  readKeyedTable(
    sectionTables(markdown, "Deferred extraction and bridge owners", "What this packet does not establish"),
    {
      table: "Deferred",
      expectedHeaderFirstCell: "Id",
      keyOf: (cells) => (/^DX-\d+$/.test(cells[0] ?? "") ? cells[0] : undefined),
      duplicate: (key) => `duplicate Deferred row for ${key}`,
      valueOf: (cells) => {
        const currentPath = backticked(cells[1] ?? "")[0];
        const disposition = cells[2];
        const owner = cells[3];
        if (currentPath === undefined || disposition === undefined || owner === undefined) return undefined;
        return { currentPath, disposition, owner };
      },
    },
    deferred,
    unreadable,
  );

  readKeyedTable(
    sectionTables(markdown, "Export ownership", "What the target zone may import"),
    {
      table: "Export",
      expectedHeaderFirstCell: "Package",
      keyOf: (cells) => backticked(cells[0] ?? "")[0],
      duplicate: (key) => `duplicate Export row for package ${key}`,
      valueOf: (cells) => {
        const subpaths = backticked(cells[1] ?? "");
        const publishedCell = cells[2];
        if (subpaths.length === 0 || publishedCell === undefined) return undefined;
        const normalised = publishedCell.toLowerCase();
        const published = normalised.startsWith("yes");
        if (!published && !normalised.startsWith("no")) return undefined;
        return { subpaths, published };
      },
    },
    packages,
    unreadable,
  );

  return { zones, deferred, packages, unreadable };
}

/** One row of the cross-boundary dependency table. */
export interface DependencyRow {
  readonly files: number;
  readonly reaches: ReadonlySet<string>;
  readonly thirdParty: ReadonlySet<string>;
}

export interface ParsedDependencyTable {
  readonly rows: ReadonlyMap<string, DependencyRow>;
  /** Rows the parser could not read, including duplicates, as human-readable locations. */
  readonly unreadable: readonly string[];
}

/**
 * Parses the cross-boundary dependency table under the same total-accounting rule as the three
 * ownership tables.
 *
 * This lived inline in `kernel-landing-zone.test.ts` and was the one keyed table that did not share
 * that rule (K10-R4-01). It is here so the strictness is structural rather than repeated by hand,
 * and so a future table cannot quietly get its own weaker loop.
 */
export function parseDependencyTable(markdown: string): ParsedDependencyTable {
  const rows = new Map<string, DependencyRow>();
  const unreadable: string[] = [];

  readKeyedTable(
    sectionTables(markdown, "Current cross-boundary dependencies", "Export ownership"),
    {
      table: "Dependency",
      expectedHeaderFirstCell: "Zone",
      keyOf: (cells) => backticked(cells[0] ?? "")[0],
      duplicate: (key) => `duplicate Dependency row for zone ${key}`,
      valueOf: (cells) => {
        const files = Number.parseInt(cells[1] ?? "", 10);
        const reachesCell = cells[2];
        const thirdCell = cells[3];
        if (Number.isNaN(files) || reachesCell === undefined || thirdCell === undefined) return undefined;
        // An em-dash means "self, not cross-boundary"; "nothing" means an empty set.
        const reaches =
          reachesCell.includes("nothing") || reachesCell === "\u2014" ? new Set<string>() : new Set(backticked(reachesCell));
        const thirdParty = thirdCell.includes("nothing") ? new Set<string>() : new Set(backticked(thirdCell));
        return { files, reaches, thirdParty };
      },
    },
    rows,
    unreadable,
  );

  return { rows, unreadable };
}

const sorted = (values: readonly string[]): string[] => [...values].sort();

/**
 * Every way the document and the enforced reality disagree, as concrete messages.
 *
 * Each relation is compared in both directions and by whole row, so a swapped root, a reassigned
 * owner, a changed disposition or a wrong publishability claim is a disagreement rather than an
 * unchanged token set.
 */
export function inventoryDisagreements(
  parsed: ParsedInventory,
  policy: { readonly zones: readonly Zone[]; readonly deferred: readonly DeferredExtraction[] },
  workspace: Workspace,
): string[] {
  const disagreements: string[] = [...parsed.unreadable.map((row) => `unreadable row: ${row}`)];

  const policyZones = new Map(policy.zones.map((zone) => [zone.id, sorted(zone.roots)]));
  for (const [id, roots] of parsed.zones) {
    const expected = policyZones.get(id);
    if (expected === undefined) {
      disagreements.push(`zone ${id} is documented but not declared by the policy`);
      continue;
    }
    const documented = sorted(roots);
    if (documented.join(",") !== expected.join(",")) {
      disagreements.push(`zone ${id} owns [${expected.join(", ")}] but the document gives it [${documented.join(", ")}]`);
    }
  }
  for (const id of policyZones.keys()) {
    if (!parsed.zones.has(id)) disagreements.push(`zone ${id} is declared by the policy but not documented`);
  }

  const policyDeferred = new Map(policy.deferred.map((row) => [row.id, row]));
  for (const [id, row] of parsed.deferred) {
    const expected = policyDeferred.get(id);
    if (expected === undefined) {
      disagreements.push(`deferred row ${id} is documented but not declared by the policy`);
      continue;
    }
    if (row.currentPath !== expected.currentPath) {
      disagreements.push(`deferred row ${id} covers ${expected.currentPath} but the document gives ${row.currentPath}`);
    }
    if (row.disposition !== expected.disposition) {
      disagreements.push(`deferred row ${id} is ${expected.disposition} but the document says ${row.disposition}`);
    }
    if (row.owner !== expected.owner) {
      disagreements.push(`deferred row ${id} is owned by ${expected.owner} but the document says ${row.owner}`);
    }
  }
  for (const id of policyDeferred.keys()) {
    if (!parsed.deferred.has(id)) disagreements.push(`deferred row ${id} is declared by the policy but not documented`);
  }

  for (const [name, row] of parsed.packages) {
    const entry: PackageEntry | undefined = workspace.packages.get(name);
    if (entry === undefined) {
      disagreements.push(`package ${name} is documented but is not a workspace package`);
      continue;
    }
    const declared = sorted([...entry.exports.keys()]);
    const documented = sorted(row.subpaths);
    if (documented.join(",") !== declared.join(",")) {
      disagreements.push(`package ${name} exports [${declared.join(", ")}] but the document gives [${documented.join(", ")}]`);
    }
    if (row.published === entry.isPrivate) {
      disagreements.push(
        `package ${name} is ${entry.isPrivate ? "private" : "publishable"} but the document says it is ${row.published ? "published" : "not published"}`,
      );
    }
  }
  for (const name of workspace.packages.keys()) {
    if (!parsed.packages.has(name)) disagreements.push(`package ${name} exists in the workspace but is not documented`);
  }

  return disagreements;
}
