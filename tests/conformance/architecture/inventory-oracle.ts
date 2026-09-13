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
 *
 * Cell *values* are decoded whole, never in part (K10-CLEANUP-01). Total row accounting says that
 * every row reaches one outcome; it does not say that the outcome used everything the row asserted.
 * A prefix numeric parse, a substring sentinel and a subset token extraction each read part of a
 * cell and discarded the rest, so `2.5` and `2oops` were the count `2`, a cell reading
 * "nothing, `@arrokothi/core`" was the empty set, and prose beside a code span vanished. Every
 * governed cell now has one decoder that must consume the cell from end to end, and a cell that
 * does not decode makes its row unreadable instead of making it mean less than it says. The
 * direction is the tie-breaker K10-R15-01 settled for character classes: too strict only adds
 * reports, while reading a prefix deletes the remainder of the claim silently.
 *
 * Table *schemas* own their arity, never the candidate header (K10-CORR1-R1-01). Round 1 measured
 * a body row's excess cells against `governed.header.length` and checked only the header's first
 * cell, so the document could widen its own header and delimiter by one column and thereby
 * authorize a fifth body cell that no decoder consumes: the widened row was not excess (the header
 * was five too), the dependency `valueOf` still read only cells 1-4, and the fifth claim was
 * silently discarded with the relation indistinguishable from baseline. Each keyed table now states
 * its exact expected header in `RowSpec.expectedHeader` — arity and every label, including the
 * labels of deliberately ungoverned prose positions — and a header that is not exactly that shape
 * is reported. A body row carrying more cells than the *schema* allows is reported even when the
 * document's header is widened to match it; short rows still fall through to their own decoders,
 * so a missing governed cell fails its decoder while an absent trailing ungoverned prose cell
 * asserts nothing. The reader withholds trailing ungoverned prose from the decoders physically by
 * passing `valueOf` only the governed prefix.
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

/**
 * Complete-cell value decoding (K10-CLEANUP-01).
 *
 * Row *accounting* was already total, but totality only says that every row reaches exactly one
 * outcome; it says nothing about whether that outcome used everything the row asserted. The value
 * decoders were the layer that still failed open, in three shapes that are all the same mistake -
 * read a *part* of a cell and discard the rest, so the document can assert something the oracle
 * never compares:
 *
 * - **Prefix numeric parse.** `Number.parseInt("2.5", 10)` and `Number.parseInt("2oops", 10)` are
 *   both `2`, so a fractional or junk-suffixed file count was indistinguishable from the correct
 *   one and the measured-tree recomputation stayed green on a false claim.
 * - **Substring sentinel.** `cell.includes("nothing")` made a cell that both denies and names an
 *   edge - `nothing, ` + "`@arrokothi/core`" - the empty set, deleting the named edge; the same
 *   shape let `startsWith("yes")` / `startsWith("no")` take a publishability claim from a cell's
 *   first word while the rest of the cell said something else.
 * - **Subset extraction.** The previous `backticked` helper collected the code spans occurring
 *   anywhere in a cell and ignored every other character, so prose beside a key vanished, a second
 *   span in a single-valued cell was dropped, and an unquoted token in a list cell was not read.
 *
 * The rule that replaces all three: **a cell is decoded as a whole or the row is unreadable.**
 * Each decoder below is a left-to-right walk that must consume the entire cell; anything it cannot
 * account for returns `undefined`, which `readKeyedTable` turns into a reported row rather than
 * into a row that means less than it says. The direction is the tie-breaker K10-R15-01 settled for
 * character classes, applied to values: a decoder that is too strict only adds reports, while one
 * that reads a prefix deletes the remainder of the document's claim silently.
 *
 * These decoders see a cell whose SPACE/TAB padding `splitGfmRow` has already removed, which is the
 * tables extension's own trim and the only normalisation applied to it. They apply no host
 * normalizer of their own - no `trim`, no case folding, no numeric coercion of free text.
 */

/**
 * A comma-separated list of single-backtick code spans, consuming the whole cell.
 *
 * The inventory writes every zone id, root, package name, subpath, path and specifier as one code
 * span, and writes a list as `` `a`, `b` `` with block whitespace permitted around the comma.
 * Nothing else is a list: prose beside the spans, a missing or unterminated span, an empty span, a
 * multi-backtick span, a trailing comma, or any character after the final span returns `undefined`.
 * A token repeated inside one cell is rejected rather than collapsed, because a set would erase the
 * second claim and an array would turn it into a length disagreement that reads as a different
 * defect.
 */
function decodeCodeSpanList(cell: string): string[] | undefined {
  const tokens: string[] = [];
  let i = 0;
  for (;;) {
    if (cell[i] !== "`") return undefined;
    const close = cell.indexOf("`", i + 1);
    // `close === i + 1` is an empty span, which asserts no token.
    if (close === -1 || close === i + 1) return undefined;
    const token = cell.slice(i + 1, close);
    if (tokens.includes(token)) return undefined;
    tokens.push(token);
    i = close + 1;
    while (isBlockWhitespace(cell[i])) i++;
    if (i === cell.length) return tokens;
    if (cell[i] !== ",") return undefined;
    i++;
    while (isBlockWhitespace(cell[i])) i++;
  }
}

/** Exactly one code span and nothing else: a key cell, or a single-valued path cell. */
function decodeCodeSpan(cell: string): string | undefined {
  const tokens = decodeCodeSpanList(cell);
  return tokens !== undefined && tokens.length === 1 ? tokens[0] : undefined;
}

/**
 * A whole-cell decimal count: `0`, or a non-zero digit followed by digits, and nothing else.
 *
 * The column asserts a measured number of files, so the decoded value must be the number the cell
 * spells and the cell must spell exactly one number. A sign, a decimal point, an exponent, a digit
 * separator, a leading zero or any suffix is not this document's spelling of a count and is
 * reported rather than silently truncated to its parsable prefix. A run of digits too large to be
 * an exact JavaScript integer is reported for the same reason: the decoded value would not be the
 * value the cell asserts.
 */
function decodeCount(cell: string): number | undefined {
  if (!/^(?:0|[1-9][0-9]*)$/.test(cell)) return undefined;
  const files = Number(cell);
  return Number.isSafeInteger(files) ? files : undefined;
}

/**
 * A dependency edge cell: either exactly one of that column's empty sentinels, or a complete
 * code-span list.
 *
 * The sentinel is matched against the whole cell, never searched for inside it, so a cell that
 * denies every edge and then names one is a contradiction the reader reports instead of resolving
 * in the denial's favour. `nothing` is an explicit empty set in both columns; the em dash
 * additionally means "self, not cross-boundary" and is accepted only in the column that uses it.
 */
function decodeEdgeCell(cell: string, emptySentinels: readonly string[]): Set<string> | undefined {
  if (emptySentinels.includes(cell)) return new Set<string>();
  const tokens = decodeCodeSpanList(cell);
  return tokens === undefined ? undefined : new Set(tokens);
}

/** Workspace-reach column: "nothing" is the empty set, U+2014 is "self, not cross-boundary". */
const REACHES_EMPTY = ["nothing", "\u2014"] as const;
/** Third-party column: only "nothing" denies every edge; it has no self-reference to spell. */
const THIRD_PARTY_EMPTY = ["nothing"] as const;

/**
 * The document's normalised `Published?` vocabulary, matched as a whole cell and exactly.
 *
 * The inventory states that this column carries "a normalised `Published?` value", so the column is
 * a closed vocabulary rather than free text with a yes/no prefix. Matching is exact and
 * case-sensitive: the spellings below are the document's own, and no host case folding is applied
 * at a position whose vocabulary is fixed ASCII (the same reasoning that keeps `toLowerCase` out of
 * every other governed cell).
 */
const PUBLISHED_VOCABULARY: ReadonlyMap<string, boolean> = new Map([
  ["Yes", true],
  ["No", false],
  ["No (private)", false],
]);

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
 * Splits one row-content line (see `gfmRowContent`) into GFM table cells.
 *
 * GFM Table extension (https://github.github.com/gfm/#tables-extension-): leading and trailing
 * pipes are recommended but not required and may be inconsistent (Example 199), spaces around
 * cells are trimmed, and a pipe is a delimiter only when it is not escaped (Example 200:
 * `\|`, including inside other inline spans, stays inside the cell). Body rows may carry fewer
 * cells than the header (empty cells are inserted) or more (a renderer ignores the excess,
 * Example 204). This function reports the cells the row actually has; what an arity that differs
 * from the schema's means is `readKeyedTable`'s decision, which fails closed on a missing governed
 * cell through that column's own decoder and reports an excess cell that no column reads
 * (K1.0-SELF-29, K10-CORR1-R1-01), in both cases after the key has already been accounted for.
 *
 * "Spaces around cells are trimmed" is block-structure whitespace — SPACE and TAB — and not a
 * host `trim()` (K1.0-SELF-24) and not the §2.1 six (K10-R15-01). The extension's published
 * examples surround cell content with spaces and it defines no trim over the wider set, so a
 * cell whose content is `DX-1<NBSP>` or `DX-1<VT>` asserts that token and not `DX-1`, and must
 * reach the keyed reader as itself so the relation can disagree with the policy. The argument
 * is already `gfmRowContent`-normalised row content, never a raw physical line.
 */
function splitGfmRow(rowContent: string): string[] {
  const parts: string[] = [];
  let current = "";
  for (let i = 0; i < rowContent.length; i++) {
    const ch = rowContent[i]!;
    if (ch === "|" && !isEscapedPipe(rowContent, i)) {
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
  if (rowContent.startsWith("|")) start = 1;
  // A trailing `|` is the outer delimiter only when it is not itself escaped.
  if (rowContent.endsWith("|") && !isEscapedPipe(rowContent, rowContent.length - 1)) end = parts.length - 1;
  return parts
    .slice(start, end)
    .map((cell) => blockWsTrim(cell.replace(/\\\|/g, "|")));
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
 *
 * The required separator after the opening sequence is exactly SPACE or TAB — the §2.2
 * block-structure class, never `\s` and never an arbitrary Unicode space (K10-R14-01). CR is
 * not in it because CR cannot occur inside a physical line at all: `splitPhysicalLines`
 * (§2.1, K10-R13-01) is the only producer of the lines this sees, and it consumes every CR as
 * a line ending. Heading *content* is normalised by `stripAtxContent`, which states the three
 * grammar steps and their separate classes; this function never normalises text itself.
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
  return { level: hashes.length, text: stripAtxContent(after) };
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
 * C4 Markdown lexical model (K10-R12-01, K10-R14-01, K10-R15-01).
 *
 * Published GFM 0.29 §2.1 defines three separate concepts that host-language
 * `\s` and `String.prototype.trim()` conflate:
 *
 * - **whitespace character**: exactly U+0020 SPACE, U+0009 TAB, U+000A LF,
 *   U+000B LINE TABULATION (vertical tab), U+000C FORM FEED, U+000D CR;
 * - **Unicode whitespace**: a broader class that additionally contains
 *   characters such as U+00A0 NO-BREAK SPACE;
 * - **blank line**: a line containing no characters, or only U+0020 SPACE
 *   and U+0009 TAB.
 *
 * Round 12 re-derived *which tokens* may follow a type-6 tag name but inherited
 * the host meaning of "whitespace", so `\s` admitted NBSP as a type-1/6
 * boundary while the hand-written `[ \t]` loops in `parseCompleteTag` rejected
 * valid VT/FF attribute whitespace, and `trim()` closed raw blocks on
 * NBSP/VT/FF-only lines that GFM does not call blank.
 *
 * Invariant: every C4 Markdown lexical predicate uses the character class
 * defined by the governing GFM production. GFM whitespace, Unicode whitespace
 * and blank-line whitespace are separate concepts and cannot be substituted
 * with host-language `\s` or `trim()`.
 *
 * **Four classes, and which production owns each** (K10-R12-01, K10-R14-01,
 * K10-R15-01). §2.1 defines a *whitespace character* set of six and a wider
 * *Unicode whitespace* set, and §2.2 defines TAB's substitution for SPACE
 * "in contexts where spaces help to define block structure". Those are separate
 * definitions, not one shared notion, and a production gets the class its own
 * sentence names:
 *
 * | Class | Members | Productions that name it |
 * |---|---|---|
 * | block-structure whitespace | SPACE, TAB | §4.2 ATX at every position; §4.1 thematic-break tail; §4.5 fence tail; §5.2 marker gap; table row and cell edges |
 * | §2.1 whitespace character | SPACE, TAB, LF, VT, FF, CR | §4.6 type-1/6 start boundaries; §6.10 complete-tag grammar |
 * | blank line | SPACE, TAB only, whole line | §4.6 type-6/7 termination; the table/section blank decision |
 * | line ending | LF, CR, CRLF | §2.1 physical-line tokenization, which runs first |
 *
 * Unicode whitespace is in none of them here: it is content.
 *
 * **Two corrections got this wrong in opposite directions, and the pattern is
 * the point.** Revision 14 normalised ATX content and table cells with
 * `String.prototype.trim()`, erasing NBSP, U+FEFF, U+3000, U+2009 and every
 * other Unicode space, so a heading whose real content was not the configured
 * title collapsed onto it and falsely terminated a governed section
 * (K10-R14-01). Revision 15 replaced that host class with the §2.1 six —
 * one broad project-wide substitute for another — and thereby erased VT and
 * FF and accepted them before an ATX closing hash run, so `## Title<VT>##`
 * collapsed onto `Title` in exactly the same fail-open shape (K10-R15-01).
 * §4.2 names neither class. It says *space* four times and *spaces* once, and
 * §2.2 adds *tab*. The §2.1 six is cited by §4.6 and §6.10, and those two are
 * now its only consumers in this file.
 *
 * **Invariant.** Every C4 Markdown structural predicate uses the class named by
 * its own production, not the class used by a neighbouring production and not
 * a host-language notion of "whitespace". Where two readings of a production
 * are defensible, C4 takes the **narrower** class: too narrow can only miss a
 * boundary and over-extend a governed section, which adds reports; too broad
 * manufactures a boundary and truncates the section, which deletes evidence
 * silently. Total, fail-closed accounting is the obligation, so silence is the
 * error that must be excluded first.
 *
 * Scope: the §2.1 helpers immediately below serve raw-HTML start recognition
 * (§4.6 types 1/6) and the complete-tag grammar (§6.10: attribute separators,
 * whitespace around `=`, pre-close and trailing whitespace, unquoted-value
 * terminators). The block-structure helpers after them serve ATX heading
 * identity and table row/cell normalization. The blank-line predicate serves
 * type-6/7 termination and the table/section blank decision. List markers,
 * indentation and thematic breaks keep their own explicit `[ \t]` rules, which
 * are the same class by a different spelling and are deliberately untouched.
 */

/** Inner source of the GFM-whitespace regex atom: exactly the §2.1 six. */
const GFM_WS_INNER = " \\t\\n\\x0B\\x0C\\r";
/** One GFM whitespace character, as a regex atom shared by all start boundaries. */
const GFM_WS_ATOM = `[${GFM_WS_INNER}]`;
const GFM_WS_ONE = new RegExp(`^${GFM_WS_ATOM}$`);
/** A trailing run of GFM whitespace (complete-tag tails, §6.10/§4.6 type 7). */
const GFM_WS_TAIL = new RegExp(`^${GFM_WS_ATOM}*$`);
/** An unquoted attribute value: anything but GFM whitespace or `"`, `'`, `=`, `<`, `>`, backtick. */
const GFM_UNQUOTED_VALUE = new RegExp(`^[^${GFM_WS_INNER}"'=\`<>]+`);

/** Whether `ch` is a GFM §2.1 whitespace character (never Unicode-only whitespace such as NBSP). */
function isGfmWhitespace(ch: string | undefined): boolean {
  return ch !== undefined && GFM_WS_ONE.test(ch);
}

/**
 * **Block-structure whitespace: exactly SPACE (U+0020) and TAB (U+0009)** (K10-R15-01).
 *
 * This is the class named by the productions that define where a *block's* structure and
 * content begin and end, and it is narrower than the §2.1 six. §4.2 says "space" at every
 * ATX structural position — the opening `#` may be indented 0–3 **spaces**, the opening
 * sequence must be followed by **a space** or end of line, the optional closing sequence
 * must be **preceded by a space** and **may be followed by spaces only**, and the raw
 * contents are stripped of leading and trailing **spaces**. §2.2 then admits TAB, and only
 * TAB, wherever spaces define block structure. Neither sentence admits U+000B LINE
 * TABULATION or U+000C FORM FEED, which appear in the §2.1 *whitespace character*
 * definition because other productions — raw-HTML type-1/6 start boundaries, the §6.10
 * complete-tag grammar — cite that definition by name. §4.2 does not.
 *
 * The same class serves the tables extension. Its published examples show cell content
 * surrounded by spaces and nothing else, and the extension defines no trim over the §2.1
 * set, so a VT or FF beside a cell's content is part of that cell.
 *
 * **Where the reading is not forced, C4 takes the narrower class deliberately.** A class
 * that is too narrow can only fail to recognise a boundary the grammar allows, which
 * over-extends a governed section and produces *extra* further-table reports. A class that
 * is too broad manufactures a boundary the grammar forbids, which truncates the section and
 * deletes evidence silently. C4's obligation is total, fail-closed accounting, so under any
 * residual ambiguity the narrow class is the correct one. Revision 15 chose the broad one
 * and reintroduced exactly the fail-open shape review-15 had just closed.
 */
const BLOCK_WS_RUN_AT_START = /^[ \t]+/;
/** A trailing run of block-structure whitespace. */
const BLOCK_WS_RUN_AT_END = /[ \t]+$/;

/** Whether `ch` is block-structure whitespace: SPACE or TAB, never VT/FF/CR/LF or Unicode space. */
function isBlockWhitespace(ch: string | undefined): boolean {
  return ch === " " || ch === "\t";
}

/** Strips a trailing run of block-structure whitespace. Never a host `trimEnd()`, never the §2.1 six. */
function blockWsRightTrim(text: string): string {
  return text.replace(BLOCK_WS_RUN_AT_END, "");
}

/** Strips leading and trailing runs of block-structure whitespace. Never a host `trim()`. */
function blockWsTrim(text: string): string {
  return blockWsRightTrim(text).replace(BLOCK_WS_RUN_AT_START, "");
}

/**
 * The raw content of an ATX heading, given everything after its opening `#` sequence
 * (published GFM 0.29 §4.2, K10-R14-01 then K10-R15-01). Used by `parseAtxHeading` above,
 * and defined here so heading identity lives with the class that governs it rather than
 * next to a host normalizer or a broader class borrowed from another production.
 *
 * §4.2's own sentences, and the class each one names:
 *
 * 1. **Content start** — "The raw contents of the heading are stripped of leading and
 *    trailing **spaces**", with §2.2 admitting TAB where spaces define block structure.
 *    Content begins at the first character that is neither SPACE nor TAB. A leading VT,
 *    FF or NBSP is content: `## <VT>Title` is a heading whose text is not `Title`.
 * 2. **Trailing strip** — the same sentence, the same class. `## Title<VT>` keeps its VT.
 * 3. **Optional closing sequence** — "The optional closing sequence of `#`s must be
 *    **preceded by a space** and **may be followed by spaces only**." A trailing run of
 *    `#` is therefore dropped only when step 2 has already put it at the end (that is what
 *    "followed by spaces only" means) **and** the character before it is SPACE or TAB, or
 *    the run reaches the start of the content, where the opening separator is what precedes
 *    it (`## ###` is the empty heading of Example 47). Step 2 then runs again.
 *    A run preceded by anything else — the letter in `# foo#`, the backslash of an escaped
 *    `\###`, a VT or FF — is content and stays.
 *
 * **Two classes were wrong here before, in opposite ways.** Revision 14 used
 * `String.prototype.trim()`, which erased NBSP and every other Unicode space, so a heading
 * whose real content was not the configured title collapsed onto it (K10-R14-01). Revision
 * 15 replaced it with the §2.1 six, which erased VT and FF and accepted them before the
 * closing run, so `## Title<VT>##` collapsed onto `Title` the same way (K10-R15-01). §4.2
 * names neither class. It names *space*, and §2.2 adds *tab*. Nothing else normalises a
 * heading's identity, at any position.
 */
function stripAtxContent(afterOpeningSequence: string): string {
  const content = blockWsRightTrim(afterOpeningSequence.replace(BLOCK_WS_RUN_AT_START, ""));
  let n = content.length;
  while (n > 0 && content[n - 1] === "#") n--;
  if (n !== content.length && (n === 0 || isBlockWhitespace(content[n - 1]))) {
    return blockWsRightTrim(content.slice(0, n));
  }
  return content;
}

/**
 * One physical line reduced to the row content the GFM tables extension sees
 * (K1.0-SELF-24, narrowed by K10-R15-01). Both ends use block-structure whitespace. The
 * leading run is the line's indentation, already bounded below four columns because four
 * or more is indented code and never reaches row discovery; the trailing run is the same
 * class, so a VT or FF after the final pipe is a further cell rather than padding.
 *
 * `line.trim()` erased Unicode whitespace here too, so `<NBSP>| a | b |` lost its first
 * cell and became a two-cell row that could match a delimiter GFM would not match. Under
 * the grammar that leading NBSP is a cell of its own, the cell counts disagree, and the
 * lines are paragraph text — which is what the document actually renders as.
 */
function gfmRowContent(line: string): string {
  return blockWsRightTrim(line.replace(BLOCK_WS_RUN_AT_START, ""));
}

/**
 * Whether the split physical line is a GFM blank line: only U+0020 SPACE and
 * U+0009 TAB, tolerating one trailing U+000D left by CRLF splitting (SELF-20).
 * Lines containing only NBSP, VT, FF or any other character are content, so an
 * open type-6/7 block continues across them.
 */
function isGfmBlankLine(line: string): boolean {
  return /^[ \t]*\r?$/.test(line);
}

/**
 * Physical-line tokenization (K10-R13-01).
 *
 * Published GFM 0.29 §2.1 defines a line ending as LF, lone CR, or CRLF, in
 * that preference order: a CR immediately followed by LF is one ending, never
 * two. C4 block parsing first tokenizes the source by this production; only
 * then are per-line whitespace, blankness, container, raw-block, heading and
 * table predicates evaluated. In particular a CR is a line boundary here, never
 * in-line GFM whitespace: tokenization happens first.
 *
 * EOF/final-empty-line behavior is deliberate and matches what LF-only
 * documents have always produced: a trailing line ending yields one final
 * empty line (`"a\n"`, `"a\r"` and `"a\r\n"` all tokenize to `["a", ""]`),
 * no trailing ending yields none (`"a"` tokenizes to `["a"]`), and the empty
 * document is one empty line (`""` tokenizes to `[""]`). For inputs without
 * any CR this is byte-for-byte identical to the previous LF-only split, so no
 * LF-document behavior changes. This is the single physical-line model for the
 * C4 evidence parser: `scanTransitions` is its only consumer, and every
 * section/table decision below consumes that scan rather than splitting again.
 */
function splitPhysicalLines(markdown: string): string[] {
  return markdown.split(/\r\n|\r|\n/);
}

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
 * §6.10), or null. Open tags carry zero or more attributes, each beginning with GFM
 * whitespace (so `<a href='bar'title=title>` is ordinary text, while VT/FF also begin
 * attributes); values may be unquoted (no GFM whitespace, `"`, `'`, `=`, `<`, `>` or
 * backtick), single-quoted (only `'` ends them) or double-quoted (only `"` ends them) — so
 * quoted `<`/`>` never end the tag early — with optional GFM whitespace around `=` and
 * before the closing `>`/`/>`. Closing tags are `</name>` with optional GFM whitespace
 * only and can never carry attributes; trailing whitespace after the tag is GFM whitespace.
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
    while (isGfmWhitespace(rest[i])) i++;
    if (rest[i] !== ">") return null;
    i++;
    if (!GFM_WS_TAIL.test(rest.slice(i))) return null;
    return { close: true, tag: name };
  }
  for (;;) {
    // GFM defines each attribute as whitespace plus a name plus an optional value: the tag
    // end (`>`/`/>`) needs no whitespace, but another attribute cannot start without any
    // since the tag name or previous attribute, so `<a href='bar'title=title>` and
    // `<Warning a='x'b=title>` stay ordinary Markdown rather than opening a raw block.
    const sepStart = i;
    while (isGfmWhitespace(rest[i])) i++;
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
    // Optional `=` value with optional surrounding GFM whitespace. When there is no `=`, `i`
    // stays right after the name so the next iteration's separator check sees the gap that
    // follows (this keeps valueless attributes such as `hidden` working).
    let j = i;
    while (isGfmWhitespace(rest[j])) j++;
    if (rest[j] === "=") {
      j++;
      while (isGfmWhitespace(rest[j])) j++;
      const quote = rest[j];
      if (quote === '"' || quote === "'") {
        const end = rest.indexOf(quote, j + 1);
        if (end === -1) return null;
        i = end + 1;
      } else {
        const value = rest.slice(j).match(GFM_UNQUOTED_VALUE)?.[0];
        if (value === undefined) return null;
        i = j + value.length;
      }
    }
  }
  if (!GFM_WS_TAIL.test(rest.slice(i))) return null;
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
  if (new RegExp(`^<(script|pre|style)(${GFM_WS_ATOM}|>|$)`, "i").test(rest)) return { kind: 1 };
  if (rest.startsWith("<!--")) return { kind: 2 };
  if (rest.startsWith("<?")) return { kind: 3 };
  if (rest.startsWith("<![CDATA[")) return { kind: 5 };
  if (/^<![A-Z]/.test(rest)) return { kind: 4 };
  // GFM 0.29 §4.6 type 6: a recognized block tag name followed by exactly one of
  // GFM whitespace, `>`, the two-character string `/>`, or end of line. This is a
  // structural alternation, not a character class: a lone `/` is insufficient and
  // `$` is an end anchor, never a literal boundary token, so `<div/ x>`,
  // `<div/foo>`, `<div/` and `<div$foo>` stay ordinary text while `<div>`,
  // `<div/>` and `<div class=x>` still open type 6. The whitespace alternative is
  // the shared GFM class (K10-R12-01), never host `\s`: NBSP and other Unicode-only
  // whitespace are not boundaries. Neighbor audit: type 1 uses the same shared
  // class; types 2/3/5 are fixed prefixes needing no boundary; type 4 is `<!` plus
  // ASCII uppercase; type 7 is a complete tag via `parseCompleteTag`, so the
  // malformed forms above fail there too and stay ordinary.
  const type6 = new RegExp(`^<\\/?(?:${HTML_BLOCK_TAGS})(?=${GFM_WS_ATOM}|>|/>|$)`, "i");
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
  return !isGfmBlankLine(line) && indentWidth(line) >= 4;
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
 * Whether one already-split line, reduced to row content by `gfmRowContent`, is shaped like a
 * GFM delimiter row. Used only as a paragraph heuristic: a pipeless prose line right after a
 * delimiter-shaped line is plausibly a table body row rather than paragraph text, so a following
 * type-7 tag or restricted list marker is still allowed to start its block (fail-loud) instead of
 * being swallowed as prose.
 */
function isDelimiterShaped(rowContent: string): boolean {
  if (rowContent === "") return false;
  return isDelimiterCells(splitGfmRow(rowContent));
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
  if (prevprev !== undefined && isDelimiterShaped(gfmRowContent(prevprev.text))) return false;
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
  * top-level eligible blocks define governed section/table structure. Physical lines come from
  * `splitPhysicalLines` (GFM §2.1 CRLF | LF | CR, K10-R13-01), so lone-CR documents scan as the
  * same line sequence as their LF twins. Heading recognition
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
  const lines = splitPhysicalLines(markdown);
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
      if (owner !== undefined && !isGfmBlankLine(line) && indentWidth(line) < owner.contentIndent) {
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
      if (isGfmBlankLine(line)) {
        const kind = html.kind;
        html = null;
        out.push(common("html-end-blank"));
        continue;
      }
      out.push(common("html-raw"));
      continue;
    }
    if (isGfmBlankLine(line)) {
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
 * The bounds of one governed section, selected by Markdown structure rather than substrings.
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
 * reported. A missing current heading yields no range at all (the governed table is then
 * reported missing); a missing next heading runs the section to end of document, so following
 * tables become further tables rather than vanishing.
 */
/**
 * A governed section boundary is an exact expected level-2 ATX heading at the document's
 * top-level block/container depth (K10-R9-01): “parses as an ATX heading” is insufficient, so
 * container-local headings (list items, quotes, code, raw HTML) can break a table body but
 * never delimit a section. Its one consumer, `sectionTables`, passes the single `scanBlocks`
 * result it already computed, so no section decision rescans the document.
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

/*
 * The `sectionRange` / `sectionLines` / `sectionText` wrappers are deliberately gone
 * (K1.0-SELF-27). All three were already uncalled at the reviewed candidate: `sectionTables`
 * below is the one consumer of a section boundary and it calls `rangeFromScanned` against its
 * own `scanBlocks` result directly. Their removal changes no behaviour, and it removes three
 * doc comments that described the live invariant from functions no path reached.
 *
 * `sectionText` in particular was `sectionLines(...).join("\n")` — a helper that turns
 * already-tokenized physical lines back into one blob, which is exactly the shape that invites
 * a second split or an `indexOf` on heading bytes. K10-R7-01 and K10-R13-01 each had to undo
 * that mistake. `splitPhysicalLines` now has one producer, one consumer and no path back to a
 * string.
 */

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
      open.body.push(splitGfmRow(gfmRowContent(line)));
      i++;
      continue;
    }
    const rowContent = gfmRowContent(line);
    if (!containsUnescapedPipe(rowContent)) {
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
    const headerCells = splitGfmRow(rowContent);
    const delimiterCells = splitGfmRow(gfmRowContent(next.text));
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
   * The exact header the governed table must carry, one cell per schema position.
   *
   * This is the table's *schema*, stated independently of the candidate document — never inferred
   * from the header discovery found (K10-CORR1-R1-01). Discovery still picks the header out by
   * position (K10-R6-01); this is the *check* on what it found, over the whole shape rather than
   * only the first label: arity and every cell must match exactly. A header that adds, drops,
   * renames or reorders any position is reported, so the document cannot authorize new unread body
   * cells merely by adding header cells. The labels of deliberately ungoverned prose positions are
   * part of the fixed schema too: the Zones `Owner and status` and Deferred `Why it is assigned
   * there` headers must read exactly so, even though the body prose beneath them is not decoded.
   */
  readonly expectedHeader: readonly string[];
  /**
   * How many trailing schema positions are deliberately ungoverned prose (0 or 1 in this
   * document). Those body cells carry no claim the executable policy could contradict, so the
   * reader withholds them from `valueOf` physically: the decoder receives only the governed
   * prefix and can neither read nor be confused by them. This declaration is what owns those
   * cells; any body cell past the schema's arity is owned by nothing and is reported.
   *
   * Per-table ownership:
   *
   * | Table | Schema | Governed positions | Ungoverned trailing |
   * |---|---|---|---|
   * | Zones | `Zone id`, `Roots`, `Owner and status` | 0: zone key, 1: root list | 1: owner/status prose |
   * | Dependency | `Zone`, `` `.ts` files ``, `` Reaches `legacy-core` via ``, `Reaches third-party` | 0: zone key, 1: count, 2: workspace edges, 3: third-party edges | 0 |
   * | Export | `Package`, `Exported subpaths`, `Published?` | 0: package key, 1: subpath list, 2: publishability | 0 |
   * | Deferred | `Id`, `Current path`, `Disposition`, `Owner`, `Why it is assigned there` | 0: DX key, 1: path, 2: disposition, 3: owner | 1: assignment rationale |
   */
  readonly ungovernedTrailing: number;
  /** The row's key, or undefined when the row carries no recognisable key. */
  readonly keyOf: (cells: readonly string[]) => string | undefined;
  /** How a duplicate is described, so each table keeps its own established wording. */
  readonly duplicate: (key: string) => string;
  /**
   * The row's value, or undefined when the governed cells are malformed. Receives the governed
   * prefix — the first `expectedHeader.length - ungovernedTrailing` cells, with missing cells
   * already absent so `cells[i] ?? ""` still fails a governed decoder exactly as before. Never
   * sees trailing ungoverned prose or excess cells: short rows reach it directly, excess rows are
   * reported before it runs.
   */
  readonly valueOf: (governedCells: readonly string[]) => T | undefined;
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
 *
 * Key before arity before value (K10-CLEANUP-01, K1.0-SELF-29, K10-CORR1-R1-01). Once the key
 * is accounted for, a row carrying more cells than its *schema* allows is reported, because those
 * cells are document content that no column reads and no comparison can contradict. The authority
 * is the schema's arity, never the header the document wrote: a widened header is itself reported
 * and cannot authorize the extra body cells. Everything else is decided by the column decoders,
 * each of which consumes its whole cell or gives up, so a row that "parses" can no longer mean
 * less than the document says. Short rows need no arity rule and keep their established outcome:
 * a missing governed cell already fails its own decoder (K1.0-SELF-08) and an absent trailing
 * ungoverned prose cell asserts nothing — but that exception never widens the schema, so a short
 * row is still loud when its header is.
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
  // Schema before body (K10-CORR1-R1-01). The header's validity and the schema's arity are both
  // checked against `spec.expectedHeader`, independently of each other and of any body data: the
  // candidate header is never the oracle for its own allowable width. A renamed first cell keeps
  // the established wording with the governed schema appended; any other header widening,
  // narrowing, rename or reorder takes the must-be wording. Either way the reader continues to
  // the bodies, judging each against the schema — so a widened header cannot hide an excess body
  // cell, and a broken header cannot turn a schema-correct body into excess.
  const schemaArity = spec.expectedHeader.length;
  const headerIsSchema =
    governed.header.length === schemaArity &&
    governed.header.every((cell, index) => cell === spec.expectedHeader[index]);
  if (!headerIsSchema) {
    if (governed.header[0] !== spec.expectedHeader[0]) {
      unreadable.push(
        `${spec.table} table header starts with "${governed.header[0] ?? ""}", not "${spec.expectedHeader[0]}": ${governed.header.join(" | ")} (governed schema: ${spec.expectedHeader.join(" | ")})`,
      );
    } else {
      unreadable.push(
        `${spec.table} table header must be "${spec.expectedHeader.join(" | ")}" but the document has "${governed.header.join(" | ")}"`,
      );
    }
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
    if (cells.length > schemaArity) {
      // K1.0-SELF-29, hardened by K10-CORR1-R1-01. GFM Example 204 lets a renderer ignore cells
      // past the header's arity, which is a rendering rule; for this oracle an ignored cell is
      // document content that no column reads and therefore no comparison can contradict. The
      // comparison is against the schema's arity, never the header the document wrote: when the
      // document widens its own header the extra body cells are still excess here, and the header
      // itself is already reported above. The established wording is kept with the schema's
      // allowance appended, so the earlier arity controls still match. Short rows need no such
      // rule: a missing governed cell already fails its own decoder, and a column the schema
      // declares but no relation governs asserts nothing the policy could disagree with.
      unreadable.push(
        `${spec.table} row for ${key} carries ${cells.length} cells but its header declares ${governed.header.length}; the excess is read by no column (governed schema allows ${schemaArity}): ${cells.join(" | ")}`,
      );
      continue;
    }
    // Only the governed prefix reaches the decoder: trailing ungoverned prose is withheld by
    // slicing, so it can neither satisfy nor corrupt a governed column, and an absent trailing
    // prose cell simply leaves a shorter prefix whose governed cells still decode.
    const value = spec.valueOf(cells.slice(0, schemaArity - spec.ungovernedTrailing));
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
      expectedHeader: ["Zone id", "Roots", "Owner and status"],
      // Position 2 is owner/status prose: asserted by no relation, withheld from the decoder.
      ungovernedTrailing: 1,
      keyOf: (cells) => decodeCodeSpan(cells[0] ?? ""),
      duplicate: (key) => `duplicate Zones row for zone ${key}`,
      valueOf: (cells) => decodeCodeSpanList(cells[1] ?? ""),
    },
    zones,
    unreadable,
  );

  readKeyedTable(
    sectionTables(markdown, "Deferred extraction and bridge owners", "What this packet does not establish"),
    {
      table: "Deferred",
      expectedHeader: ["Id", "Current path", "Disposition", "Owner", "Why it is assigned there"],
      // Position 4 is the assignment rationale: asserted by no relation, withheld from the decoder.
      ungovernedTrailing: 1,
      keyOf: (cells) => (/^DX-\d+$/.test(cells[0] ?? "") ? cells[0] : undefined),
      duplicate: (key) => `duplicate Deferred row for ${key}`,
      valueOf: (cells) => {
        const currentPath = decodeCodeSpan(cells[1] ?? "");
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
      expectedHeader: ["Package", "Exported subpaths", "Published?"],
      // Every position is governed; there is no prose column to withhold.
      ungovernedTrailing: 0,
      keyOf: (cells) => decodeCodeSpan(cells[0] ?? ""),
      duplicate: (key) => `duplicate Export row for package ${key}`,
      valueOf: (cells) => {
        const subpaths = decodeCodeSpanList(cells[1] ?? "");
        const published = PUBLISHED_VOCABULARY.get(cells[2] ?? "");
        if (subpaths === undefined || published === undefined) return undefined;
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
      expectedHeader: ["Zone", "`.ts` files", "Reaches `legacy-core` via", "Reaches third-party"],
      // Every position is governed; there is no prose column to withhold.
      ungovernedTrailing: 0,
      keyOf: (cells) => decodeCodeSpan(cells[0] ?? ""),
      duplicate: (key) => `duplicate Dependency row for zone ${key}`,
      valueOf: (cells) => {
        const files = decodeCount(cells[1] ?? "");
        const reaches = decodeEdgeCell(cells[2] ?? "", REACHES_EMPTY);
        const thirdParty = decodeEdgeCell(cells[3] ?? "", THIRD_PARTY_EMPTY);
        if (files === undefined || reaches === undefined || thirdParty === undefined) return undefined;
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
