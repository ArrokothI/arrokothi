/**
 * Import-graph analysis shared by the architecture boundary guards.
 *
 * Two jobs, deliberately separated so each can be exercised on its own:
 *
 * 1. `importSpecifiersIn` extracts import/export specifiers from one TypeScript source. It masks
 *    comments and string/template literals first, so prose that merely ends in the preposition
 *    "from" before a quoted term is not read as a bare import. That false positive is the
 *    pre-existing guard defect recorded as K0.2-SELF-01; the forbidden-edge controls in
 *    `kernel-landing-zone.test.ts` carry import statements as literal fixture text, so the guards
 *    could not state their own controls until the scanner distinguished code from text.
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

/** Keywords after which a `/` begins a regular expression rather than a division. */
const REGEX_PRECEDING_KEYWORDS = new Set([
  "return",
  "typeof",
  "instanceof",
  "in",
  "of",
  "new",
  "delete",
  "void",
  "throw",
  "case",
  "do",
  "else",
  "yield",
  "await",
]);

/** Punctuation after which a `/` begins a regular expression rather than a division. */
const REGEX_PRECEDING_PUNCTUATION = new Set([
  "(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "+", "-", "*", "%", "~", "^", "<", ">",
]);

/**
 * Stands in for one string literal in the masked source. A NUL character cannot occur in the
 * TypeScript sources this repository compiles, so a slot is never confused with real code.
 */
const SLOT = String.fromCharCode(0);

export interface MaskedSource {
  /** Source text with comments blanked and every string literal replaced by a single slot. */
  readonly code: string;
  /** Literal values, in source order, one per slot in `code`. */
  readonly literals: readonly string[];
}

/**
 * Replaces comments with whitespace and string literals with slots.
 *
 * Template literals contribute a slot for their literal text while their interpolated expressions
 * are lexed as ordinary code, so a dynamic import inside an interpolation is still seen. Regular
 * expression literals are recognised and skipped, because a character class such as `["']` would
 * otherwise be lexed as the start of a string and corrupt everything after it.
 */
export function maskSource(source: string): MaskedSource {
  let out = "";
  const literals: string[] = [];
  const templates: { raw: string; exprDepth: number }[] = [];
  let mode: "code" | "template" = "code";
  let braceDepth = 0;
  let index = 0;

  const lastSignificantChar = (): string => {
    for (let cursor = out.length - 1; cursor >= 0; cursor -= 1) {
      const character = out[cursor]!;
      if (!/\s/.test(character)) return character;
    }
    return "";
  };

  const lastWord = (): string => /([A-Za-z_$][A-Za-z0-9_$]*)\s*$/.exec(out)?.[1] ?? "";

  const readQuoted = (quote: string): string => {
    let value = "";
    index += 1;
    while (index < source.length) {
      const character = source[index]!;
      if (character === "\\") {
        value += character + (source[index + 1] ?? "");
        index += 2;
        continue;
      }
      if (character === quote) {
        index += 1;
        break;
      }
      value += character;
      index += 1;
    }
    return value;
  };

  const startsRegex = (): boolean => {
    const word = lastWord();
    if (word !== "") return REGEX_PRECEDING_KEYWORDS.has(word);
    const character = lastSignificantChar();
    return character === "" || REGEX_PRECEDING_PUNCTUATION.has(character);
  };

  while (index < source.length) {
    const character = source[index]!;

    if (mode === "template") {
      const template = templates[templates.length - 1]!;
      if (character === "\\") {
        template.raw += character + (source[index + 1] ?? "");
        index += 2;
        continue;
      }
      if (character === "$" && source[index + 1] === "{") {
        literals.push(template.raw);
        template.raw = "";
        out += SLOT;
        template.exprDepth = braceDepth;
        braceDepth += 1;
        mode = "code";
        index += 2;
        continue;
      }
      if (character === "`") {
        literals.push(template.raw);
        out += SLOT;
        templates.pop();
        mode = "code";
        index += 1;
        continue;
      }
      template.raw += character;
      index += 1;
      continue;
    }

    if (character === "/" && source[index + 1] === "/") {
      while (index < source.length && source[index] !== "\n") index += 1;
      out += " ";
      continue;
    }

    if (character === "/" && source[index + 1] === "*") {
      index += 2;
      while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) index += 1;
      index += 2;
      out += " ";
      continue;
    }

    if (character === "/" && startsRegex()) {
      index += 1;
      let inClass = false;
      while (index < source.length) {
        const regexCharacter = source[index]!;
        if (regexCharacter === "\\") {
          index += 2;
          continue;
        }
        if (regexCharacter === "[") inClass = true;
        else if (regexCharacter === "]") inClass = false;
        else if (regexCharacter === "/" && !inClass) {
          index += 1;
          break;
        } else if (regexCharacter === "\n") break;
        index += 1;
      }
      while (index < source.length && /[a-z]/.test(source[index]!)) index += 1;
      out += " ";
      continue;
    }

    if (character === '"' || character === "'") {
      literals.push(readQuoted(character));
      out += SLOT;
      continue;
    }

    if (character === "`") {
      templates.push({ raw: "", exprDepth: braceDepth });
      mode = "template";
      index += 1;
      continue;
    }

    if (character === "{") braceDepth += 1;
    if (character === "}") {
      braceDepth -= 1;
      const template = templates[templates.length - 1];
      if (template !== undefined && braceDepth === template.exprDepth) {
        mode = "template";
        out += " ";
        index += 1;
        continue;
      }
    }

    out += character;
    index += 1;
  }

  return { code: out, literals };
}

/**
 * An import/export clause may only contain identifiers, braces, commas, stars and whitespace
 * between its keyword and `from`. Anything else - a parenthesis, an operator, a string - means the
 * keyword belonged to some other construct, so the pattern stops rather than running on to the next
 * quoted value in the file.
 */
const FROM_CLAUSE = new RegExp(`(?<![\\w$])(?:import|export)\\b[\\w$\\s{},*]*?\\bfrom\\s*${SLOT}`, "g");
const SIDE_EFFECT_IMPORT = new RegExp(`(?<![\\w$])import\\s*${SLOT}`, "g");
const DYNAMIC_IMPORT = new RegExp(`(?<![\\w$])import\\s*\\(\\s*${SLOT}`, "g");

/** Every import/export specifier in a source, grouped by form, with duplicates retained. */
export function importSpecifiersIn(source: string): string[] {
  const { code, literals } = maskSource(source);

  const slotIndexByOffset = new Map<number, number>();
  let slotCount = 0;
  for (let cursor = 0; cursor < code.length; cursor += 1) {
    if (code[cursor] === SLOT) {
      slotIndexByOffset.set(cursor, slotCount);
      slotCount += 1;
    }
  }

  const specifiers: string[] = [];
  for (const pattern of [FROM_CLAUSE, SIDE_EFFECT_IMPORT, DYNAMIC_IMPORT]) {
    for (const match of code.matchAll(pattern)) {
      const slotOffset = match.index + match[0].length - 1;
      const slotIndex = slotIndexByOffset.get(slotOffset);
      if (slotIndex === undefined) continue;
      const literal = literals[slotIndex];
      if (literal !== undefined) specifiers.push(literal);
    }
  }
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
