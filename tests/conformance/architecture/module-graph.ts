/**
 * Import-graph analysis shared by the architecture boundary guards.
 *
 * Two jobs, deliberately separated so each can be exercised on its own:
 *
 * 1. `importSpecifiersIn` extracts import/export specifiers from one TypeScript source by parsing
 *    it with the TypeScript compiler, so prose that merely ends in the preposition "from" before
 *    a quoted term is not read as a bare import, and a regular-expression literal containing quote
 *    characters cannot corrupt the rest of the file. That false positive is the pre-existing guard
 *    defect recorded as K0.2-SELF-01; the forbidden-edge controls in `kernel-landing-zone.test.ts`
 *    carry import statements as literal fixture text, so the guards could not state their own
 *    controls until the scanner distinguished code from text. Parsing (rather than a lexical
 *    heuristic for division versus regular expression) also closes K10-R1-01: a `/` after `)` in
 *    `if (true) /["']/.test('x')` is a regular expression to the parser, not division, so the
 *    following forbidden import is still seen. A dynamic `import()` whose argument is not a string
 *    literal cannot be resolved statically, so it is reported as NON_LITERAL_DYNAMIC_IMPORT rather
 *    than as "no dependency": the guard fails closed on that form.
 * 2. `walkModuleGraph` resolves those specifiers across workspace packages - relative paths,
 *    package roots and package subpath exports alike - and returns the transitive closure plus the
 *    external specifiers it stopped at. Resolution is derived from the manifests actually present
 *    in the tree, never from a hardcoded package list, so a new workspace package is covered the
 *    moment it exists.
 *
 * Neither function encodes a boundary policy. The policy lives in `boundary-policy.ts`.
 */

import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import ts from "typescript";

/**
 * Sentinel specifier emitted for a dynamic `import()` whose argument is not statically recoverable
 * (an identifier, a template with substitutions, or any other non-literal). It is deliberately not
 * a valid relative path, `node:` specifier, or workspace package name, so `resolveSpecifier`
 * treats it as external and `boundaryViolations` reports it with its own fail-closed reason rather
 * than silently recording "no dependency".
 */
export const NON_LITERAL_DYNAMIC_IMPORT = "__non_literal_dynamic_import__";

/**
 * Every import/export specifier in a source, grouped by form, with duplicates retained. A
 * non-literal dynamic import contributes one NON_LITERAL_DYNAMIC_IMPORT entry per call site.
 *
 * Covered forms: static `import ... from`, side-effect `import`, `export ... from` (including
 * `export * as ns from` and type-only variants), `import x = require("...")`, and dynamic
 * `import("...")` (including a no-substitution template literal). `import.meta` is not an import
 * and contributes nothing. Bare `require("...")` calls are intentionally out of scope: in this
 * ESM workspace `require` is not a global, so flagging every identifier named `require` would trade
 * this scanner's prose soundness for false positives; see the K1.0 contract limits.
 */
export function importSpecifiersIn(source: string): string[] {
  const sourceFile = ts.createSourceFile("guard-scan.ts", source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const specifiers: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      const specifier = node.moduleSpecifier;
      if (specifier !== undefined && ts.isStringLiteralLike(specifier)) specifiers.push(specifier.text);
    } else if (ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier !== undefined && ts.isStringLiteralLike(node.moduleSpecifier)) {
        specifiers.push(node.moduleSpecifier.text);
      }
    } else if (ts.isImportEqualsDeclaration(node)) {
      const reference = node.moduleReference;
      if (
        ts.isExternalModuleReference(reference) &&
        reference.expression !== undefined &&
        ts.isStringLiteralLike(reference.expression)
      ) {
        specifiers.push(reference.expression.text);
      }
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const argument = node.arguments[0];
      if (argument !== undefined && ts.isStringLiteralLike(argument)) specifiers.push(argument.text);
      else specifiers.push(NON_LITERAL_DYNAMIC_IMPORT);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return specifiers;
}

/** One workspace package's name and its declared export subpaths, resolved to repo-relative files. */
export interface PackageEntry {
  readonly name: string;
  /** Repo-relative directory, e.g. `packages/core`. */
  readonly directory: string;
  /** Export subpath (`.`, `./ports`, ...) to repo-relative source file. */
  readonly exports: ReadonlyMap<string, string>;
  /** True when the manifest marks the package private, so it cannot be published. */
  readonly isPrivate: boolean;
}

export interface Workspace {
  readonly repoRoot: string;
  readonly packages: ReadonlyMap<string, PackageEntry>;
}

/** Reads every package manifest under `packages/` in the tree and indexes it by package name. */
export async function loadWorkspace(repoRoot: string): Promise<Workspace> {
  const packagesRoot = resolve(repoRoot, "packages");
  const packages = new Map<string, PackageEntry>();

  const manifests = (await readdir(packagesRoot, { recursive: true })).filter(
    (path) => path.endsWith("package.json") && !path.includes("node_modules"),
  );

  for (const manifestPath of manifests) {
    const absolute = resolve(packagesRoot, manifestPath);
    const manifest = JSON.parse(await readFile(absolute, "utf8")) as {
      name?: string;
      private?: boolean;
      exports?: Record<string, string> | string;
    };
    if (manifest.name === undefined) continue;

    const directory = relative(repoRoot, dirname(absolute));
    const exports = new Map<string, string>();
    const declared = typeof manifest.exports === "string" ? { ".": manifest.exports } : (manifest.exports ?? {});
    for (const [subpath, target] of Object.entries(declared)) {
      exports.set(subpath, relative(repoRoot, resolve(dirname(absolute), target)));
    }

    packages.set(manifest.name, {
      name: manifest.name,
      directory,
      exports,
      isPrivate: manifest.private === true,
    });
  }

  return { repoRoot, packages };
}

/** What a specifier resolved to. */
export type Resolution =
  | { readonly kind: "internal"; readonly file: string }
  | { readonly kind: "external"; readonly specifier: string }
  | { readonly kind: "unresolved"; readonly specifier: string };

/** Resolves one specifier seen in `fromFile` (repo-relative) against the workspace. */
export function resolveSpecifier(workspace: Workspace, fromFile: string, specifier: string): Resolution {
  if (specifier.startsWith("node:")) return { kind: "external", specifier };

  if (specifier.startsWith(".")) {
    const absolute = resolve(dirname(resolve(workspace.repoRoot, fromFile)), specifier);
    return { kind: "internal", file: relative(workspace.repoRoot, absolute) };
  }

  for (const entry of workspace.packages.values()) {
    if (specifier !== entry.name && !specifier.startsWith(`${entry.name}/`)) continue;
    const subpath = specifier === entry.name ? "." : `.${specifier.slice(entry.name.length)}`;
    const target = entry.exports.get(subpath);
    if (target !== undefined) return { kind: "internal", file: target };
    return { kind: "unresolved", specifier };
  }

  return { kind: "external", specifier };
}

/** One resolved import edge. */
export interface Edge {
  readonly from: string;
  readonly specifier: string;
  readonly resolution: Resolution;
}

export interface ModuleGraph {
  /** Every repo-relative source file reached, including the entry modules. */
  readonly files: ReadonlySet<string>;
  /** Every edge walked, including the ones that stopped at an external package. */
  readonly edges: readonly Edge[];
  /** External specifiers reached, mapped to the files that import them. */
  readonly external: ReadonlyMap<string, readonly string[]>;
}

/**
 * Transitive closure over every import form, starting from repo-relative entry modules.
 *
 * `shouldTraverse` decides which resolved files the walk continues through. A guard supplies one so
 * that a file the policy forbids is recorded as an edge and then stopped at, rather than walked into:
 * without it, one forbidden import of a package barrel would report a violation for every edge
 * *inside* that package, attributed to files that are not in the zone being guarded at all. Files
 * the policy does permit - an approved portable leaf, say - are still traversed, because approving a
 * leaf must not silently approve whatever that leaf imports.
 *
 * A file that cannot be read stops that branch rather than throwing, so a guard reports the broken
 * boundary it was asked about instead of a read error from somewhere else in the graph.
 */
export async function walkModuleGraph(
  workspace: Workspace,
  entries: readonly string[],
  shouldTraverse: (file: string) => boolean = () => true,
): Promise<ModuleGraph> {
  const files = new Set<string>();
  const edges: Edge[] = [];
  const external = new Map<string, string[]>();
  const queue = [...entries];

  while (queue.length > 0) {
    const file = queue.pop()!;
    if (files.has(file)) continue;
    files.add(file);

    let source: string;
    try {
      source = await readFile(resolve(workspace.repoRoot, file), "utf8");
    } catch {
      continue;
    }

    for (const specifier of importSpecifiersIn(source)) {
      const resolution = resolveSpecifier(workspace, file, specifier);
      edges.push({ from: file, specifier, resolution });
      if (resolution.kind === "internal") {
        if (shouldTraverse(resolution.file)) queue.push(resolution.file);
        continue;
      }
      external.set(specifier, [...(external.get(specifier) ?? []), file]);
    }
  }

  return { files, edges, external };
}

/** Every `.ts` file under a repo-relative directory, as repo-relative paths. */
export async function typeScriptFilesUnder(repoRoot: string, directory: string): Promise<string[]> {
  const absolute = resolve(repoRoot, directory);
  try {
    if (!(await stat(absolute)).isDirectory()) return [];
  } catch {
    return [];
  }
  return (await readdir(absolute, { recursive: true }))
    .filter((path) => path.endsWith(".ts") && !path.includes("node_modules"))
    .map((path) => `${directory}/${path}`);
}
