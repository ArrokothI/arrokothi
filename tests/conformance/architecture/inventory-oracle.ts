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
 * check.
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

/** The body rows of the first Markdown table inside a section, as cell arrays. */
function tableRows(markdown: string, heading: string, nextHeading: string): string[][] {
  const section = markdown.split(heading)[1]?.split(nextHeading)[0] ?? "";
  const rows: string[][] = [];
  for (const line of section.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) continue;
    const cells = trimmed.slice(1, -1).split("|").map((cell) => cell.trim());
    if (cells.every((cell) => /^-+$/.test(cell))) continue;
    rows.push(cells);
  }
  return rows;
}

/** Parses the inventory's three ownership tables into the relations they assert. */
export function parseInventory(markdown: string): ParsedInventory {
  const zones = new Map<string, readonly string[]>();
  const deferred = new Map<string, { currentPath: string; disposition: string; owner: string }>();
  const packages = new Map<string, { subpaths: readonly string[]; published: boolean }>();
  const unreadable: string[] = [];

  for (const cells of tableRows(markdown, "## Zones", "## Current cross-boundary")) {
    const [idCell, rootsCell] = cells;
    if (idCell === undefined || rootsCell === undefined) continue;
    if (idCell === "Zone id") continue;
    const id = backticked(idCell)[0];
    const roots = backticked(rootsCell);
    if (id === undefined || roots.length === 0) {
      unreadable.push(`Zones row: ${cells.join(" | ")}`);
      continue;
    }
    zones.set(id, roots);
  }

  for (const cells of tableRows(markdown, "## Deferred extraction", "## What this packet")) {
    const [idCell, pathCell, dispositionCell, ownerCell] = cells;
    if (idCell === undefined || idCell === "Id") continue;
    const currentPath = pathCell === undefined ? undefined : backticked(pathCell)[0];
    if (!/^DX-\d+$/.test(idCell) || currentPath === undefined || dispositionCell === undefined || ownerCell === undefined) {
      unreadable.push(`Deferred row: ${cells.join(" | ")}`);
      continue;
    }
    deferred.set(idCell, { currentPath, disposition: dispositionCell, owner: ownerCell });
  }

  for (const cells of tableRows(markdown, "## Export ownership", "## What the target zone may import")) {
    const [nameCell, subpathCell, publishedCell] = cells;
    if (nameCell === undefined || nameCell === "Package") continue;
    const name = backticked(nameCell)[0];
    const subpaths = subpathCell === undefined ? [] : backticked(subpathCell);
    if (name === undefined || subpaths.length === 0 || publishedCell === undefined) {
      unreadable.push(`Export row: ${cells.join(" | ")}`);
      continue;
    }
    const normalised = publishedCell.toLowerCase();
    const published = normalised.startsWith("yes");
    if (!published && !normalised.startsWith("no")) {
      unreadable.push(`Export row has an unreadable Published? cell: ${cells.join(" | ")}`);
      continue;
    }
    packages.set(name, { subpaths, published });
  }

  return { zones, deferred, packages, unreadable };
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
