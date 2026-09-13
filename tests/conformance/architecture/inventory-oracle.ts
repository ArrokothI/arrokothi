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
 * The lines of one governed section, selected by Markdown structure rather than substrings.
 *
 * Rebuilt for K10-R7-01. The previous version located the section with
 * `markdown.indexOf(heading)` and `rest.indexOf(nextHeading)`, so any occurrence of those bytes -
 * prose, an inline code span, fenced code, or a malformed heading-like line - truncated the
 * section before table discovery could inspect its block context, silently deleting a later
 * contradictory table. Selection now scans block structure top to bottom with fence tracking: the
 * section starts at the first level-2 ATX heading outside fenced code whose normalised text equals
 * `currentTitle` exactly, and ends at the first later level-2 ATX heading outside fenced code
 * whose text equals `nextTitle` exactly.
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
function sectionLines(markdown: string, currentTitle: string, nextTitle: string): string[] {
  const lines = markdown.split("\n");
  let fence: FenceState | null = null;
  let start: number | null = null;
  let end = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (fence !== null) {
      fence = updateFence(fence, line);
      continue;
    }
    const opened = updateFence(fence, line);
    if (opened !== null) {
      fence = opened;
      continue;
    }
    const heading = parseAtxHeading(line);
    if (heading === undefined || heading.level !== 2) continue;
    if (start === null) {
      if (heading.text === currentTitle) start = i;
    } else if (heading.text === nextTitle) {
      end = i;
      break;
    }
  }
  if (start === null) return [];
  return lines.slice(start + 1, end);
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
 * block-level structure (fence, ATX heading, blockquote; Example 201); prose before the header or
 * after the break is not a candidate, so the surrounding inventory prose is unaffected. Fenced code
 * is skipped so pipes inside code stay out of the relations - such a line renders as code, so the
 * document does not assert it as a row. The delimiter row of a discovered table is the only line
 * consumed without becoming a candidate; any later delimiter-shaped line inside a body is an
 * ordinary body row and reaches the reader as unreadable rather than disappearing.
 *
 * Fence tracking and ATX recognition are shared with section selection (`parseFenceCandidate`,
 * `parseAtxHeading`, `updateFence`), so a heading inside fenced code neither opens a table nor
 * breaks a body, and a mismatched fence closer does not silently resume table discovery
 * (K10-R7-01). The heading break accepts any ATX level: any structural heading ends the table
 * body per GFM Example 201, while only the exact expected level-2 titles delimit sections.
 */
function sectionTables(markdown: string, currentTitle: string, nextTitle: string): DiscoveredTable[] {
  const lines = sectionLines(markdown, currentTitle, nextTitle);
  const tables: DiscoveredTable[] = [];
  let fence: FenceState | null = null;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (fence !== null) {
      // Inside fenced code: literal text, never a heading or a row. A mismatched closer does not
      // exit, via `updateFence`.
      fence = updateFence(fence, line);
      i++;
      continue;
    }
    if (parseFenceCandidate(line) !== undefined) {
      // A fence marker opens a code block and breaks any table body; it is never a row itself.
      fence = updateFence(fence, line);
      i++;
      continue;
    }
    const trimmed = line.trim();
    if (trimmed === "") {
      i++;
      continue;
    }
    if (containsUnescapedPipe(trimmed)) {
      const headerCells = splitGfmRow(trimmed);
      const nextLine = lines[i + 1] ?? "";
      if (parseFenceCandidate(nextLine) === undefined) {
        const delimiterCells = splitGfmRow(nextLine.trim());
        if (delimiterCells.length === headerCells.length && isDelimiterCells(delimiterCells)) {
          const body: string[][] = [];
          i += 2;
          while (i < lines.length) {
            const bodyLine = lines[i]!;
            if (parseFenceCandidate(bodyLine) !== undefined) {
              fence = updateFence(fence, bodyLine);
              break;
            }
            const bodyTrimmed = bodyLine.trim();
            if (bodyTrimmed === "") break;
            if (parseAtxHeading(bodyLine) !== undefined) break;
            const bodyIndent = bodyLine.match(/^ */)?.[0].length ?? 0;
            const bodyRest = bodyLine.slice(bodyIndent);
            if (bodyRest.startsWith(">")) break;
            body.push(splitGfmRow(bodyTrimmed));
            i++;
          }
          tables.push({ header: headerCells, body });
          continue;
        }
      }
    }
    i++;
  }
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
