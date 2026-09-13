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
  if (after !== "" && !/^[ \t]/.test(after)) return undefined;
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

/** Tracked fenced-code state while scanning block structure top to bottom. */
interface FenceState {
  readonly char: string;
  readonly length: number;
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
function updateFence(state: FenceState | null, line: string): FenceState | null {
  const candidate = parseFenceCandidate(line);
  if (state === null) {
    if (candidate !== undefined) return { char: candidate.char, length: candidate.length };
    return null;
  }
  if (
    candidate !== undefined &&
    candidate.char === state.char &&
    candidate.length >= state.length &&
    /^[ \t]*$/.test(candidate.info)
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
}

/**
 * Block tag names that open a type-6 HTML block (GFM §4.6, case-insensitive). This is the union
 * of the GFM 0.29-gfm list and CommonMark 0.31's addition (`search`), so detection errs toward
 * entering a raw block (fail-loud: later tables stay inside the section and are reported) rather
 * than toward missing a true block start (fail-open: a heading inside the block truncates the
 * section). Over-approximation here can only keep the section open longer and report more, never
 * silently delete a contradictory table.
 */
const HTML_BLOCK_TAGS =
  "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h1|h2|h3|h4|h5|h6|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|section|source|search|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";

/**
 * Whether the line opens a GFM raw-HTML block, assuming the scanner is outside fenced code and
 * outside any HTML block and the line is not blank, indented code or blockquote content.
 *
 * Order follows the specification: type 1 (script/pre/style/textarea) first, then comment,
 * processing instruction, declaration, CDATA, type-6 block tags, and finally type 7 (a complete
 * open or closing tag alone on the line, excluding script/style/pre which belong to type 1).
 * Matching is case-insensitive per GFM. Type 7's "cannot interrupt a paragraph" exception is
 * deliberately not honoured: treating a type-7 candidate inside a paragraph as a block start
 * keeps the section open and reports (fail-loud) rather than truncating silently, so the
 * simplification is sound in the prohibited direction and is stated here rather than hidden.
 */
function parseHtmlBlockStart(line: string): HtmlState | null {
  const indent = line.match(/^ */)?.[0].length ?? 0;
  if (indent > 3) return null;
  if (line.startsWith("\t")) return null;
  const rest = line.slice(indent);
  if (rest.startsWith(">")) return null;
  if (/^<(script|pre|style|textarea)(\s|>|$)/i.test(rest)) return { kind: 1 };
  if (rest.startsWith("<!--")) return { kind: 2 };
  if (rest.startsWith("<?")) return { kind: 3 };
  if (rest.startsWith("<![CDATA[")) return { kind: 5 };
  if (/^<![A-Za-z]/.test(rest)) return { kind: 4 };
  const type6 = new RegExp(`^<\\/?(?:${HTML_BLOCK_TAGS})(?=[\\s>\\/$]|$)`, "i");
  if (type6.test(rest)) return { kind: 6 };
  const type7 = rest.match(/^<\/?([A-Za-z][A-Za-z0-9-]*)(\s[^<>]*)?\s*\/?>\s*$/);
  if (type7 !== null) {
    const tag = type7[1]!.toLowerCase();
    if (tag !== "script" && tag !== "style" && tag !== "pre") return { kind: 7 };
  }
  return null;
}

/** Whether a line inside an open HTML block of kinds 1–5 ends that block (the line is raw either way). */
function htmlClosesOnLine(kind: 1 | 2 | 3 | 4 | 5, line: string): boolean {
  switch (kind) {
    case 1:
      return /<\/(script|pre|style|textarea)>/i.test(line);
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
  /** True for indented-code or blockquote lines (table break; never a top-level table row). */
  readonly isQuotedOrCode: boolean;
  /** The ATX heading on this line, if it is ordinary Markdown that parses as one. */
  readonly heading: { readonly level: number; readonly text: string } | undefined;
  /** True for ordinary Markdown lines on which table recognition may run. */
  readonly allowsTable: boolean;
}

/**
 * The single coherent block-state transition layer shared by section selection and table
 * discovery (K10-R8-01/K10-R8-02 reconstruction).
 *
 * Invariant: every physical source line is consumed through exactly one block-state transition
 * at a given parser position. The scan walks top to bottom; each line advances the
 * (fence, html) state at most once and is annotated as raw, blank, quoted/code, or ordinary.
 * Heading recognition (`parseAtxHeading`) runs only on ordinary lines outside raw blocks, so
 * heading-looking text inside fenced code (round 8) or inside a GFM raw-HTML block (round 9)
 * cannot start or end a governed section. Table recognition runs only on lines with
 * `allowsTable`, so literal code (fenced, indented) and quoted/raw lines cannot become
 * inventory relations merely because they resemble the table grammar.
 *
 * Supported Markdown contexts for this governed artifact: ATX headings (any level breaks a
 * table body; exact level-2 titles delimit sections), fenced code (backtick/tilde, GFM §4.5),
 * raw HTML blocks types 1–7 (GFM §4.6, tracked as raw), blank lines, blockquote breaks and
 * indented-code exclusion. Refused/unsupported without silent misreading: setext headings,
 * thematic breaks, lists, link reference definitions and tables nested inside blockquotes or
 * lists are not given their own block states; where they appear inside a table body they become
 * ordinary body candidates and reach the reader as unreadable/duplicate rows (fail-loud),
 * never as silent exits. Type-7 HTML's paragraph-interruption exception is intentionally
 * over-approximated toward raw (stated in `parseHtmlBlockStart`); indented lines are always
 * code regardless of a preceding blank line (both err toward reporting, never toward silence).
 */
/**
 * One line's block-state transition, recorded for the state-transition audit.
 *
 * `consumedOnce` is always true: the scan advances exactly one line per step and never
 * reprocesses a line for a second fence/HTML transition. It is recorded per line so the audit
 * can show the K10-R8-01 property directly rather than assert it.
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
    | "ordinary";
  readonly fenceAfter: string | null;
  readonly htmlAfter: string | null;
  readonly consumedOnce: true;
  readonly headingAllowed: boolean;
  readonly tableAllowed: boolean;
}

const fenceName = (fence: FenceState | null): string | null =>
  fence === null ? null : `open(${fence.char}x${fence.length})`;
const htmlName = (html: HtmlState | null): string | null =>
  html === null ? null : `html${html.kind}`;

/**
 * Every line's transition through the shared block-state layer, in order. This is the primary
 * scan; `scanBlocks` projects it to the annotations section/table discovery consume.
 */
export function scanTransitions(markdown: string): LineTransition[] {
  const lines = markdown.split("\n");
  const out: LineTransition[] = [];
  let fence: FenceState | null = null;
  let html: HtmlState | null = null;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!;
    if (fence !== null) {
      const before = fenceName(fence);
      fence = updateFence(fence, line);
      const closed = fence === null;
      out.push({
        index, text: line,
        fenceBefore: before, htmlBefore: htmlName(html),
        classification: closed ? "fence-closer" : "fence-raw",
        fenceAfter: fenceName(fence), htmlAfter: htmlName(html),
        consumedOnce: true, headingAllowed: false, tableAllowed: false,
      });
      continue;
    }
    if (html !== null) {
      if (html.kind <= 5) {
        const closes = htmlClosesOnLine(html.kind as 1 | 2 | 3 | 4 | 5, line);
        const kind = html.kind;
        if (closes) html = null;
        out.push({
          index, text: line,
          fenceBefore: null, htmlBefore: `html${kind}`,
          classification: closes ? "html-close-line" : "html-raw",
          fenceAfter: null, htmlAfter: htmlName(html),
          consumedOnce: true, headingAllowed: false, tableAllowed: false,
        });
        continue;
      }
      if (isBlankLine(line)) {
        const kind = html.kind;
        html = null;
        out.push({
          index, text: line,
          fenceBefore: null, htmlBefore: `html${kind}`,
          classification: "html-end-blank",
          fenceAfter: null, htmlAfter: null,
          consumedOnce: true, headingAllowed: false, tableAllowed: false,
        });
        continue;
      }
      out.push({
        index, text: line,
        fenceBefore: null, htmlBefore: htmlName(html),
        classification: "html-raw",
        fenceAfter: null, htmlAfter: htmlName(html),
        consumedOnce: true, headingAllowed: false, tableAllowed: false,
      });
      continue;
    }
    if (isBlankLine(line)) {
      out.push({
        index, text: line, fenceBefore: null, htmlBefore: null, classification: "blank",
        fenceAfter: null, htmlAfter: null, consumedOnce: true, headingAllowed: false, tableAllowed: false,
      });
      continue;
    }
    if (isIndentedCode(line) || isBlockquote(line)) {
      out.push({
        index, text: line,
        fenceBefore: null, htmlBefore: null,
        classification: isIndentedCode(line) ? "indented-code" : "blockquote",
        fenceAfter: null, htmlAfter: null,
        consumedOnce: true, headingAllowed: false, tableAllowed: false,
      });
      continue;
    }
    const fenceCandidate = parseFenceCandidate(line);
    if (fenceCandidate !== undefined) {
      fence = updateFence(fence, line);
      out.push({
        index, text: line,
        fenceBefore: null, htmlBefore: null, classification: "fence-marker-open",
        fenceAfter: fenceName(fence), htmlAfter: null,
        consumedOnce: true, headingAllowed: false, tableAllowed: false,
      });
      continue;
    }
    const htmlStart = parseHtmlBlockStart(line);
    if (htmlStart !== null) {
      if (htmlStart.kind <= 5 && htmlClosesOnLine(htmlStart.kind as 1 | 2 | 3 | 4 | 5, line)) {
        out.push({
          index, text: line,
          fenceBefore: null, htmlBefore: null, classification: "html-open-close-same-line",
          fenceAfter: null, htmlAfter: null,
          consumedOnce: true, headingAllowed: false, tableAllowed: false,
        });
      } else {
        html = htmlStart;
        out.push({
          index, text: line,
          fenceBefore: null, htmlBefore: null, classification: "html-open",
          fenceAfter: null, htmlAfter: htmlName(html),
          consumedOnce: true, headingAllowed: false, tableAllowed: false,
        });
      }
      continue;
    }
    const heading = parseAtxHeading(line);
    out.push({
      index, text: line,
      fenceBefore: null, htmlBefore: null, classification: "ordinary",
      fenceAfter: null, htmlAfter: null,
      consumedOnce: true, headingAllowed: heading !== undefined, tableAllowed: true,
    });
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
function sectionRange(markdown: string, currentTitle: string, nextTitle: string): { readonly start: number; readonly end: number } | null {
  const scanned = scanBlocks(markdown);
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

function sectionLines(markdown: string, currentTitle: string, nextTitle: string): string[] {
  const range = sectionRange(markdown, currentTitle, nextTitle);
  if (range === null) return [];
  return markdown.split("\n").slice(range.start + 1, range.end);
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
  const scanned = scanBlocks(markdown);
  const range = sectionRange(markdown, currentTitle, nextTitle);
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
