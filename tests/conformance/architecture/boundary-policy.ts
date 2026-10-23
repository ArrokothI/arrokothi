/**
 * The executable ownership boundary for K1.0.
 *
 * `docs/development/kernel-ownership.md` is the human-readable record of the same
 * decisions; `kernel-landing-zone.test.ts` asserts that the two agree, so neither can drift into
 * describing a boundary the other does not enforce.
 *
 * Nothing here is Kernel semantics. It is a dependency policy over repository paths.
 */

import { dirname, posix } from "node:path";
import ts from "typescript";
import type { ModuleGraph } from "./module-graph.ts";
import { moduleDependenciesIn, UNRESOLVABLE_MODULE_TARGET } from "./module-graph.ts";

/** One ownership zone: a set of repo-relative path prefixes with a single owner. */
export interface Zone {
  /** Stable identifier used by the inventory document and by findings. */
  readonly id: string;
  /** Repo-relative path prefixes the zone owns. */
  readonly roots: readonly string[];
}

/**
 * The target Kernel zone. New Kernel work lands here and nowhere else.
 *
 * `packages/kernel` was chosen over renaming `packages/core` because renaming would carry the
 * current Harness/controller graph into the target name. `mental-model/mechanisms/evidence.md`,
 * under "Structural evidence": "Moving code is not migrating it. A new directory, a new package
 * name or a renamed file decides where future work lands. It changes nothing about what the code
 * does." This zone is where the protocol will land, not evidence that any of it exists.
 */
export const TARGET_KERNEL: Zone = {
  id: "target-kernel",
  roots: ["packages/kernel/src"],
};

/**
 * The quarantined 0.8.x implementation. It keeps its supported exports, its behaviour and its
 * regression suite; it is legacy by attribution, not by removal.
 */
export const LEGACY_CORE: Zone = {
  id: "legacy-core",
  roots: ["packages/core/src"],
};

/** Runtime and provider integrations. Each depends inward on the legacy core today. */
export const RUNTIME_INTEGRATIONS: Zone = {
  id: "runtime-integrations",
  roots: [
    "packages/agents/strands/src",
    "packages/models/gemini/src",
    "packages/retrieval/local/src",
    "packages/interoperability/mcp/src",
  ],
};

/** Application host composition. */
export const HOST_SDK: Zone = {
  id: "host-sdk",
  roots: ["packages/sdk/src"],
};

export const ZONES: readonly Zone[] = [TARGET_KERNEL, LEGACY_CORE, RUNTIME_INTEGRATIONS, HOST_SDK];

/** Entry modules whose transitive graph defines everything the target Kernel zone depends on. */
export const TARGET_KERNEL_ENTRY_MODULES: readonly string[] = ["packages/kernel/src/index.ts"];

/**
 * External specifiers the target Kernel zone may reach by prefix.
 *
 * Node builtins always. A further third-party need still requires an owner decision first,
 * not an allowlist edit in a test.
 */
export const TARGET_KERNEL_ALLOWED_EXTERNAL_PREFIXES: readonly string[] = ["node:"];

/** BINDING-01: canonicalize belongs to SDK capture; the core has no third-party dependency. */
export const TARGET_KERNEL_ALLOWED_EXTERNAL_SPECIFIERS: readonly string[] = [];

/**
 * Portable leaves from outside the zone that the target Kernel may reuse.
 *
 * Deliberately empty at K1.0. `packages/core/src/util/{hash,json,result}.ts` and
 * `packages/core/src/schema/value-schema.ts` are the plausible candidates, but each needs an
 * individual audit and an extraction owner before a target module depends on it, and K1.0
 * implements no target module that needs one. Extraction is assigned in the inventory document;
 * adding an entry here is a reviewed decision, not a convenience.
 */
export const TARGET_KERNEL_ALLOWED_LEAVES: readonly string[] = [];

/** A dependency rule the target Kernel zone broke. */
export interface BoundaryViolation {
  /** Repo-relative file that contains the import. */
  readonly from: string;
  /** The specifier exactly as written. */
  readonly specifier: string;
  /** Why it is forbidden. */
  readonly reason: string;
}

export interface BoundaryRules {
  /** Repo-relative prefixes the zone owns. */
  readonly zoneRoots: readonly string[];
  /** Repo-relative files outside the zone that may nonetheless be imported. */
  readonly allowedLeaves: readonly string[];
  /** External specifier prefixes that may be imported. */
  readonly allowedExternalPrefixes: readonly string[];
  /** Exact third-party specifiers that may be imported (no prefix extension). */
  readonly allowedExternalSpecifiers: readonly string[];
}

/** The rules the real target Kernel zone is held to. */
export const TARGET_KERNEL_RULES: BoundaryRules = {
  zoneRoots: TARGET_KERNEL.roots,
  allowedLeaves: TARGET_KERNEL_ALLOWED_LEAVES,
  allowedExternalPrefixes: TARGET_KERNEL_ALLOWED_EXTERNAL_PREFIXES,
  allowedExternalSpecifiers: TARGET_KERNEL_ALLOWED_EXTERNAL_SPECIFIERS,
};

const isUnder = (file: string, roots: readonly string[]): boolean =>
  roots.some((root) => file === root || file.startsWith(`${root}/`));

/**
 * Whether the walk should continue through a resolved file.
 *
 * Permitted files are traversed, so approving a portable leaf does not silently approve that leaf's
 * own imports. Forbidden files are recorded and stopped at, so one forbidden barrel import reports
 * one violation rather than one per edge inside the package it reached.
 */
export const traversableUnder =
  (rules: BoundaryRules) =>
  (file: string): boolean =>
    isUnder(file, rules.zoneRoots) || rules.allowedLeaves.includes(file);

/**
 * Every edge in `graph` that the rules forbid.
 *
 * One predicate covers every dependency form because `walkModuleGraph` has already normalised them:
 * a static import, a type-only import, a `type T = import("x").U` import type, a re-export, a
 * package-root barrel, a package subpath, a dynamic import, an ambient module declaration and a
 * triple-slash reference all arrive here as the same resolved edge. That is why a control can
 * demonstrate rejection of a type-only barrel import without the rule needing a clause about
 * type-only imports, and why K10-R2-01's import-type counterexample needed no new rule here once
 * the extractor emitted it.
 * A dependency whose target cannot be recovered statically arrives as UNRESOLVABLE_MODULE_TARGET and
 * is always forbidden: the guard fails closed rather than recording "no dependency".
 */
export function boundaryViolations(graph: ModuleGraph, rules: BoundaryRules): BoundaryViolation[] {
  const violations: BoundaryViolation[] = [];

  for (const edge of graph.edges) {
    if (edge.specifier === UNRESOLVABLE_MODULE_TARGET) {
      violations.push({
        from: edge.from,
        specifier: edge.specifier,
        reason: `names a module through ${edge.form} whose target cannot be statically verified; the zone must use only literal specifiers`,
      });
      continue;
    }
    if (edge.resolution.kind === "internal") {
      const target = edge.resolution.file;
      if (isUnder(target, rules.zoneRoots)) continue;
      if (rules.allowedLeaves.includes(target)) continue;
      violations.push({
        from: edge.from,
        specifier: edge.specifier,
        reason: `reaches ${target}, which is outside the zone and is not an approved portable leaf`,
      });
      continue;
    }

    if (edge.resolution.kind === "unresolved") {
      violations.push({
        from: edge.from,
        specifier: edge.specifier,
        reason: "names a workspace package but no declared export subpath",
      });
      continue;
    }

    if (rules.allowedExternalPrefixes.some((prefix) => edge.specifier.startsWith(prefix))) continue;
    if (rules.allowedExternalSpecifiers.includes(edge.specifier)) continue;
    violations.push({
      from: edge.from,
      specifier: edge.specifier,
      reason: "imports an external package; the zone may use node: builtins only",
    });
  }

  return violations;
}

/** A dependency the target Kernel will eventually need, and the packet that owns supplying it. */
export interface DeferredExtraction {
  /** Stable row id used by the inventory document. */
  readonly id: string;
  /** Where the behaviour lives today. */
  readonly currentPath: string;
  /** migratable: reusable as a portable leaf; legacy-only: stays behind a bridge; refused: not carried forward. */
  readonly disposition: "migratable" | "legacy-only" | "refused";
  /** The packet that owns the extraction, bridge or refusal. */
  readonly owner: string;
}

/**
 * What the target Kernel zone cannot reach yet, and who owns changing that.
 *
 * These are assignments, not promises that the named packet will keep the behaviour: a `migratable`
 * row still requires that packet's own audit before an entry appears in `TARGET_KERNEL_ALLOWED_LEAVES`.
 */
export const DEFERRED_EXTRACTIONS: readonly DeferredExtraction[] = [
  { id: "DX-1", currentPath: "packages/core/src/util/hash.ts", disposition: "migratable", owner: "K1.1" },
  { id: "DX-2", currentPath: "packages/core/src/util/json.ts", disposition: "migratable", owner: "K1.1" },
  { id: "DX-3", currentPath: "packages/core/src/util/result.ts", disposition: "migratable", owner: "K1.1" },
  { id: "DX-4", currentPath: "packages/core/src/schema/value-schema.ts", disposition: "migratable", owner: "K1.2" },
  { id: "DX-5", currentPath: "packages/core/src/runtime/harness.ts", disposition: "legacy-only", owner: "K1.4" },
  { id: "DX-6", currentPath: "packages/core/src/runtime/resumption-processor.ts", disposition: "legacy-only", owner: "K1.4" },
  { id: "DX-7", currentPath: "packages/core/src/runtime/effect-processor.ts", disposition: "legacy-only", owner: "K2.1" },
  { id: "DX-8", currentPath: "packages/core/src/ports/runtime-store.ts", disposition: "legacy-only", owner: "K3.1" },
  { id: "DX-9", currentPath: "packages/core/src/ports/scheduler.ts", disposition: "legacy-only", owner: "K3.1" },
  { id: "DX-10", currentPath: "packages/core/src/controllers", disposition: "legacy-only", owner: "R2.1" },
  { id: "DX-11", currentPath: "packages/agents/strands/src/agent-executor.ts", disposition: "legacy-only", owner: "R1.1" },
  { id: "DX-12", currentPath: "packages/core/src/ports/controller.ts", disposition: "refused", owner: "K1.1" },
];

// -- Inside the target zone: who may reach accepted state (COORD-REFACTOR-01) ------------------------

/**
 * One import rule between modules of the target zone.
 *
 * `importers`: only the `allowed` files may import `subject`, and at least one does. `imports`: `subject`
 * imports none of `forbidden`. `edges: "all"` counts every dependency form, type-only imports included,
 * because naming a type is already reaching it; `edges: "value"` counts only imports of runtime bindings,
 * because the rule is about which code the subject can call. `module-graph.ts` keeps no value/type
 * distinction, so `zoneImportEdges` reads it from the import declarations itself.
 */
export interface ZoneImportRule {
  readonly id: string;
  readonly subject: string;
  readonly kind: "importers" | "imports";
  readonly edges: "all" | "value";
  readonly allowed?: readonly string[];
  readonly forbidden?: readonly string[];
  readonly reason: string;
}

const KERNEL_SRC = "packages/kernel/src";
const zoneFile = (name: string): string => `${KERNEL_SRC}/${name}`;

/**
 * The state owner's boundary (design 01, CR1-2). `state-records.ts` holds the mutable record shapes and
 * only the owner may name them; `state.ts` is the owner, and only the coordinator holds one; plans cannot
 * name either, so no plan can carry a mutable record; and neither the owner nor the plans can call the
 * modules that observe caller envelopes or hold the Driver.
 */
export const KERNEL_STATE_RULES: readonly ZoneImportRule[] = [
  {
    id: "R1",
    subject: zoneFile("state-records.ts"),
    kind: "importers",
    edges: "all",
    allowed: [zoneFile("state.ts")],
    reason: "only the state owner may name the mutable records",
  },
  {
    id: "R2",
    subject: zoneFile("state.ts"),
    kind: "importers",
    edges: "all",
    allowed: [zoneFile("coordinator.ts")],
    reason: "only the coordinator holds the state owner",
  },
  {
    id: "R3",
    subject: zoneFile("plan.ts"),
    kind: "imports",
    edges: "all",
    forbidden: [zoneFile("state.ts"), zoneFile("state-records.ts"), zoneFile("coordinator.ts")],
    reason: "a plan cannot name the owner, its mutable records or the coordinator",
  },
  {
    id: "R4",
    subject: zoneFile("state.ts"),
    kind: "imports",
    edges: "value",
    forbidden: [zoneFile("envelope.ts"), zoneFile("outcome.ts"), zoneFile("coordinator.ts")],
    reason: "the owner cannot call caller observation, capture or the Driver",
  },
  {
    id: "R4",
    subject: zoneFile("state-records.ts"),
    kind: "imports",
    edges: "value",
    forbidden: [zoneFile("envelope.ts"), zoneFile("outcome.ts"), zoneFile("coordinator.ts")],
    reason: "the record shapes import no code",
  },
  {
    id: "R4",
    subject: zoneFile("plan.ts"),
    kind: "imports",
    edges: "value",
    forbidden: [zoneFile("envelope.ts"), zoneFile("outcome.ts")],
    reason: "the plan module cannot call caller observation or capture",
  },
];

/** One import between two zone files, and whether it imports a runtime binding. */
export interface ZoneEdge {
  readonly from: string;
  readonly to: string;
  readonly value: boolean;
}

/** The relative specifiers in `text` that import or re-export at least one runtime binding. */
const valueSpecifiers = (text: string): Set<string> => {
  const source = ts.createSourceFile("source.ts", text, ts.ScriptTarget.Latest, true);
  const out = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      const named = clause?.namedBindings;
      const value =
        clause === undefined ||
        (!clause.isTypeOnly &&
          (clause.name !== undefined ||
            (named !== undefined && ts.isNamespaceImport(named)) ||
            (named !== undefined && ts.isNamedImports(named) && named.elements.some((element) => !element.isTypeOnly))));
      if (value) out.add(node.moduleSpecifier.text);
    }
    if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.exportClause;
      const value = !node.isTypeOnly && (clause === undefined || ts.isNamespaceExport(clause) || clause.elements.some((element) => !element.isTypeOnly));
      if (value) out.add(node.moduleSpecifier.text);
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [argument] = node.arguments;
      if (argument !== undefined && ts.isStringLiteralLike(argument)) out.add(argument.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return out;
};

/** Every import between files of `sources` (repo-relative path → text) that a relative specifier names. */
export function zoneImportEdges(sources: ReadonlyMap<string, string>): ZoneEdge[] {
  const edges: ZoneEdge[] = [];
  for (const [from, text] of sources) {
    const values = valueSpecifiers(text);
    for (const dependency of moduleDependenciesIn(text)) {
      if (!dependency.specifier.startsWith(".")) continue;
      const to = posix.normalize(posix.join(dirname(from), dependency.specifier));
      if (!sources.has(to)) continue;
      edges.push({ from, to, value: values.has(dependency.specifier) });
    }
  }
  return edges;
}

/** Every broken rule, every rule that names a missing file, and every importer rule no edge matches. */
export function zoneImportViolations(sources: ReadonlyMap<string, string>, rules: readonly ZoneImportRule[]): string[] {
  const out: string[] = [];
  const edges = zoneImportEdges(sources);
  for (const rule of rules) {
    for (const file of [rule.subject, ...(rule.allowed ?? []), ...(rule.forbidden ?? [])]) {
      if (!sources.has(file)) out.push(`${rule.id}: names ${file}, which is not a zone source (a rule must match real files)`);
    }
    const counted = edges.filter((edge) => rule.edges === "all" || edge.value);
    if (rule.kind === "importers") {
      const importers = counted.filter((edge) => edge.to === rule.subject);
      if (importers.length === 0) out.push(`${rule.id}: no file imports ${rule.subject}, so the rule matches nothing`);
      for (const edge of importers) {
        if (!(rule.allowed ?? []).includes(edge.from)) out.push(`${rule.id}: ${edge.from} imports ${rule.subject}; ${rule.reason}`);
      }
    } else {
      for (const edge of counted) {
        if (edge.from === rule.subject && (rule.forbidden ?? []).includes(edge.to)) out.push(`${rule.id}: ${rule.subject} imports ${edge.to}; ${rule.reason}`);
      }
    }
  }
  return out;
}
