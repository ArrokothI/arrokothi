/**
 * Module-dependency analysis shared by the architecture boundary guards.
 *
 * Two jobs, deliberately separated so each can be exercised on its own:
 *
 * 1. `moduleDependenciesIn` extracts every module dependency one TypeScript source carries.
 * 2. `walkModuleGraph` resolves those dependencies across workspace packages and returns the
 *    transitive closure plus the external specifiers it stopped at. Resolution is derived from the
 *    manifests actually present in the tree, never from a hardcoded package list.
 *
 * ## How the extractor decides what a dependency is
 *
 * Rebuilt for K10-R2-01. The previous version enumerated four node kinds that happened to cover the
 * examples in front of it, and silently emitted nothing for every other way TypeScript can name a
 * module. Enumerating examples is the defect; the rule below is stated over the whole category, and
 * a second, independently implemented extractor is run alongside it so completeness does not rest on
 * one author's enumeration being right.
 *
 * **A dependency is any syntax that names another module.** In TypeScript that is:
 *
 * | Syntax | Node or field | Resolved as |
 * |---|---|---|
 * | `import ... from "x"`, `import "x"` | `ImportDeclaration.moduleSpecifier` | specifier |
 * | `export ... from "x"`, `export * as ns from "x"` | `ExportDeclaration.moduleSpecifier` | specifier |
 * | `import A = require("x")` | `ImportEqualsDeclaration` / `ExternalModuleReference` | specifier |
 * | `import("x")` at a value position | `CallExpression` with the `import` keyword | specifier |
 * | `import("x").T`, `typeof import("x")`, `import("x")` at a type position | `ImportTypeNode.argument` | specifier |
 * | `declare module "x" { ... }` | `ModuleDeclaration` with a string-literal name | specifier |
 * | `/// <reference path="x" />` | `SourceFile.referencedFiles` | path, relative to the file |
 * | `/// <reference types="x" />` | `SourceFile.typeReferenceDirectives` | specifier |
 *
 * Type-only forms are deliberately not a separate case. `import type { T } from "x"` and
 * `type T = import("x").U` are the same obligation - 007 forbids the target zone reaching legacy
 * internals "through direct, type-only or barrel imports" - so they reach the same resolver, the
 * same graph and the same boundary decision. `/// <reference lib="..." />` names a TypeScript
 * library rather than a module and is not a dependency. JSDoc `import(...)` types are not analysed:
 * this workspace compiles `.ts` with `checkJs` off, so a JSDoc type annotation is not a dependency;
 * the K1.0 contract records that limit.
 *
 * **Where a target cannot be established statically, the extractor fails closed** rather than
 * reporting "no dependency": a dynamic `import(someIdentifier)` or an `import(SomeType).T` yields
 * `UNRESOLVABLE_MODULE_TARGET`, which no policy can permit.
 *
 * ## Why there are two extractors
 *
 * `astDependencies` walks the parsed tree against the table above. `preprocessorDependencies` asks
 * the TypeScript compiler's own file pre-processor, which is written and maintained by someone else
 * for a different purpose. The union of the two is returned, so a form missing from the table is
 * still reported as long as either extractor sees it. Provenance is kept on each dependency, and
 * `import-scanner.test.ts` asserts that over both the synthetic matrix and every source in this
 * repository the AST pass alone already covers everything the pre-processor finds - so the union is
 * a safety net, never a crutch hiding a hole in the table.
 *
 * Parsing rather than pattern-matching text is also what keeps K0.2-SELF-01 closed: prose ending in
 * the preposition "from" before a quoted term, a quoted import statement used as fixture text, and a
 * regular-expression literal containing quote characters are all text to a parser, so none of them
 * becomes an edge. That soundness is re-asserted after this rebuild, not assumed to have survived it.
 *
 * Neither function encodes a boundary policy. The policy lives in `boundary-policy.ts`.
 */

import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import ts from "typescript";

/**
 * Emitted where a module is named but its target cannot be recovered statically - a dynamic import
 * of an identifier, an import type over a non-literal, a template with substitutions. Deliberately
 * not a valid relative path, `node:` specifier or workspace package name, so it resolves as external
 * and `boundaryViolations` reports it with its own fail-closed reason.
 */
export const UNRESOLVABLE_MODULE_TARGET = "__unresolvable_module_target__";

/** Which syntax carried the dependency. Informational, and used to assert extractor provenance. */
export type DependencyForm =
  | "import-declaration"
  | "export-declaration"
  | "import-equals"
  | "dynamic-import"
  | "import-type"
  | "module-declaration"
  | "reference-path"
  | "reference-types"
  | "preprocessor-only";

/** How the target should be resolved. */
export type DependencyTarget = "specifier" | "path";

/** One module dependency carried by one source. */
export interface ModuleDependency {
  /** The module named, or `UNRESOLVABLE_MODULE_TARGET`. */
  readonly specifier: string;
  readonly form: DependencyForm;
  readonly target: DependencyTarget;
}

/** The string target of a node position that must name a module, or the fail-closed sentinel. */
function literalTarget(node: ts.Node | undefined): string {
  if (node === undefined) return UNRESOLVABLE_MODULE_TARGET;
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isLiteralTypeNode(node) && ts.isStringLiteralLike(node.literal)) return node.literal.text;
  return UNRESOLVABLE_MODULE_TARGET;
}

/** Dependencies found by walking the parsed tree against the table above. */
export function astDependencies(source: string): ModuleDependency[] {
  const sourceFile = ts.createSourceFile("guard-scan.ts", source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const found: ModuleDependency[] = [];
  const add = (specifier: string, form: DependencyForm, target: DependencyTarget = "specifier"): void => {
    found.push({ specifier, form, target });
  };

  for (const reference of sourceFile.referencedFiles) add(reference.fileName, "reference-path", "path");
  for (const reference of sourceFile.typeReferenceDirectives) add(reference.fileName, "reference-types");

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      add(literalTarget(node.moduleSpecifier), "import-declaration");
    } else if (ts.isExportDeclaration(node)) {
      // A re-export without a module specifier (`export { a };`) names no module.
      if (node.moduleSpecifier !== undefined) add(literalTarget(node.moduleSpecifier), "export-declaration");
    } else if (ts.isImportEqualsDeclaration(node)) {
      const reference = node.moduleReference;
      if (ts.isExternalModuleReference(reference)) add(literalTarget(reference.expression), "import-equals");
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      add(literalTarget(node.arguments[0]), "dynamic-import");
    } else if (ts.isImportTypeNode(node)) {
      add(literalTarget(node.argument), "import-type");
    } else if (ts.isModuleDeclaration(node) && ts.isStringLiteral(node.name)) {
      add(node.name.text, "module-declaration");
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

/** Dependencies found by the TypeScript compiler's own file pre-processor. */
export function preprocessorDependencies(source: string): ModuleDependency[] {
  const processed = ts.preProcessFile(source, true, true);
  return [
    ...processed.referencedFiles.map((file) => ({ specifier: file.fileName, target: "path" as const })),
    ...processed.importedFiles.map((file) => ({ specifier: file.fileName, target: "specifier" as const })),
    ...processed.typeReferenceDirectives.map((file) => ({ specifier: file.fileName, target: "specifier" as const })),
    ...(processed.ambientExternalModules ?? []).map((name) => ({ specifier: name, target: "specifier" as const })),
  ].map((entry) => ({ ...entry, form: "preprocessor-only" as const }));
}

/**
 * Every module dependency one source carries: the union of both extractors, deduplicated by target
 * and specifier. A dependency only the pre-processor saw keeps the `preprocessor-only` form, which
 * is what `import-scanner.test.ts` asserts never happens in this repository.
 */
export function moduleDependenciesIn(source: string): ModuleDependency[] {
  const dependencies = astDependencies(source);
  const seen = new Set(dependencies.map((entry) => `${entry.target}\u0000${entry.specifier}`));
  for (const entry of preprocessorDependencies(source)) {
    const key = `${entry.target}\u0000${entry.specifier}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dependencies.push(entry);
  }
  return dependencies;
}

/**
 * Specifier strings only, for the guards that scan text rather than walk a graph. Duplicates are
 * retained; a path-shaped reference directive appears as written.
 */
export function importSpecifiersIn(source: string): string[] {
  return moduleDependenciesIn(source).map((dependency) => dependency.specifier);
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

/**
 * Resolves one dependency against the workspace.
 *
 * A `path` target - a `/// <reference path="..." />` - is always relative to the file that wrote it,
 * with or without a leading `./`, because that is what TypeScript does with it. Resolving it as a
 * bare specifier instead would make a reference into the zone look like an unknown external package.
 */
export function resolveDependency(workspace: Workspace, fromFile: string, dependency: ModuleDependency): Resolution {
  if (dependency.target === "path") {
    const absolute = resolve(dirname(resolve(workspace.repoRoot, fromFile)), dependency.specifier);
    return { kind: "internal", file: relative(workspace.repoRoot, absolute) };
  }
  return resolveSpecifier(workspace, fromFile, dependency.specifier);
}

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

/** One resolved dependency edge. */
export interface Edge {
  readonly from: string;
  readonly specifier: string;
  /** The syntax that carried it, so a violation can say how the dependency was written. */
  readonly form: DependencyForm;
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

    for (const dependency of moduleDependenciesIn(source)) {
      const resolution = resolveDependency(workspace, file, dependency);
      edges.push({ from: file, specifier: dependency.specifier, form: dependency.form, resolution });
      if (resolution.kind === "internal") {
        if (shouldTraverse(resolution.file)) queue.push(resolution.file);
        continue;
      }
      external.set(dependency.specifier, [...(external.get(dependency.specifier) ?? []), file]);
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
