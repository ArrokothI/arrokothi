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

/**
 * The body rows of every GFM table inside a section, as cell arrays.
 *
 * Rebuilt for K10-R5-01. The previous version accepted only lines that both began and ended with
 * `|`, so a valid GFM data row with an omitted edge pipe never reached the shared keyed reader and
 * the C4 total-accounting claim held only over the subset `tableRows` chose to return. GFM states
 * the edge pipes are recommended, not required, and Example 199 deliberately mixes rows with and
 * without them.
 *
 * Discovery now follows the table forms this document uses: a header line carrying an unescaped
 * `|` immediately followed by a delimiter row with the same cell count (GFM: the header must match
 * the delimiter in cell count, Example 203, or there is no table), then every subsequent non-blank
 * line until the table breaks as a body candidate — including a line with no `|` at all, which GFM
 * still renders as a single-cell row padded with empties (Example 202). The table breaks at the
 * first blank line or at the start of another block-level structure (fence, ATX heading,
 * blockquote; Example 201); prose before the header or after the break is not a candidate, so the
 * surrounding inventory prose is unaffected. Fenced code is skipped so pipes inside code stay out
 * of the relations. The header's own delimiter is the only delimiter skipped silently; any later
 * delimiter-shaped line inside the body reaches `readKeyedTable` as unreadable rather than
 * disappearing. The header row itself is still returned and skipped by each table's
 * `headerFirstCell` rule inside the unchanged `readKeyedTable`.
 */
function tableRows(markdown: string, heading: string, nextHeading: string): string[][] {
  const section = markdown.split(heading)[1]?.split(nextHeading)[0] ?? "";
  const lines = section.split("\n");
  const rows: string[][] = [];
  let inFence = false;
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i]!.trim();
    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      inFence = !inFence;
      i++;
      continue;
    }
    if (inFence || trimmed === "") {
      i++;
      continue;
    }
    if (containsUnescapedPipe(trimmed)) {
      const headerCells = splitGfmRow(trimmed);
      const nextTrimmed = lines[i + 1]?.trim() ?? "";
      if (!nextTrimmed.startsWith("```") && !nextTrimmed.startsWith("~~~")) {
        const delimiterCells = splitGfmRow(nextTrimmed);
        if (delimiterCells.length === headerCells.length && isDelimiterCells(delimiterCells)) {
          rows.push(headerCells);
          i += 2;
          while (i < lines.length) {
            const bodyTrimmed = lines[i]!.trim();
            if (bodyTrimmed === "") break;
            if (bodyTrimmed.startsWith("```") || bodyTrimmed.startsWith("~~~")) break;
            if (/^#{1,6}\s/.test(bodyTrimmed)) break;
            if (bodyTrimmed.startsWith(">")) break;
            rows.push(splitGfmRow(bodyTrimmed));
            i++;
          }
          continue;
        }
      }
    }
    i++;
  }
  return rows;
}

/** How one keyed table is read. */
interface RowSpec<T> {
  /** Name used in disagreement messages. */
  readonly table: string;
  /** First cell of the header row, which is the only row that may be skipped silently. */
  readonly headerFirstCell: string;
  /** The row's key, or undefined when the row carries no recognisable key. */
  readonly keyOf: (cells: readonly string[]) => string | undefined;
  /** How a duplicate is described, so each table keeps its own established wording. */
  readonly duplicate: (key: string) => string;
  /** The row's value, or undefined when the remaining cells are malformed. */
  readonly valueOf: (cells: readonly string[]) => T | undefined;
}

/**
 * Reads one keyed table so that **every candidate data row ends in exactly one outcome**: recorded,
 * reported as a duplicate key, or reported as unreadable. Nothing is discarded silently.
 *
 * The ordering matters and is the substance of K10-R4-01. The key is taken and the duplicate check
 * runs *before* the rest of the row is parsed, and a key is marked seen even when the rest fails to
 * parse. Without that, a row carrying a recognisable key and a malformed cell vanished before
 * uniqueness was ever considered, so a contradictory duplicate could be erased by its own
 * malformedness - the same disappearing-row failure K10-R3-01 closed for well-formed duplicates,
 * reached by a different route. Failing to parse a row is now never a way to be ignored.
 */
function readKeyedTable<T>(
  rows: readonly (readonly string[])[],
  spec: RowSpec<T>,
  into: Map<string, T>,
  unreadable: string[],
): void {
  const seen = new Set<string>();
  for (const cells of rows) {
    if (cells[0] === spec.headerFirstCell) continue;
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
}

/** Parses the inventory's three ownership tables into the relations they assert. */
export function parseInventory(markdown: string): ParsedInventory {
  const zones = new Map<string, readonly string[]>();
  const deferred = new Map<string, { currentPath: string; disposition: string; owner: string }>();
  const packages = new Map<string, { subpaths: readonly string[]; published: boolean }>();
  const unreadable: string[] = [];

  readKeyedTable(
    tableRows(markdown, "## Zones", "## Current cross-boundary"),
    {
      table: "Zones",
      headerFirstCell: "Zone id",
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
    tableRows(markdown, "## Deferred extraction", "## What this packet"),
    {
      table: "Deferred",
      headerFirstCell: "Id",
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
    tableRows(markdown, "## Export ownership", "## What the target zone may import"),
    {
      table: "Export",
      headerFirstCell: "Package",
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
    tableRows(markdown, "## Current cross-boundary", "## Export ownership"),
    {
      table: "Dependency",
      headerFirstCell: "Zone",
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
