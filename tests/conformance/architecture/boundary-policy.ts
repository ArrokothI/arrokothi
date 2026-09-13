/**
 * The executable ownership boundary for K1.0.
 *
 * `docs/development/work/K1.0/ownership-inventory.md` is the human-readable record of the same
 * decisions; `kernel-landing-zone.test.ts` asserts that the two agree, so neither can drift into
 * describing a boundary the other does not enforce.
 *
 * Nothing here is Kernel semantics. It is a dependency policy over repository paths.
 */

import type { ModuleGraph } from "./module-graph.ts";

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
 * current Harness/controller graph into the target name, which `docs/execution.md` explicitly warns
 * against: "Do not rename files and call that an asynchronous migration."
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
 * External specifiers the target Kernel zone may reach. Node builtins only: a target Kernel that
 * needs a third-party package needs an owner decision first, not an allowlist edit in a test.
 */
export const TARGET_KERNEL_ALLOWED_EXTERNAL_PREFIXES: readonly string[] = ["node:"];

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
}

/** The rules the real target Kernel zone is held to. */
export const TARGET_KERNEL_RULES: BoundaryRules = {
  zoneRoots: TARGET_KERNEL.roots,
  allowedLeaves: TARGET_KERNEL_ALLOWED_LEAVES,
  allowedExternalPrefixes: TARGET_KERNEL_ALLOWED_EXTERNAL_PREFIXES,
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
 * One predicate covers every import form because `walkModuleGraph` has already normalised them:
 * a static import, a type-only import, a re-export, a package-root barrel, a package subpath and a
 * dynamic import all arrive here as the same resolved edge. That is why a control can demonstrate
 * rejection of a type-only barrel import without the rule needing a clause about type-only imports.
 */
export function boundaryViolations(graph: ModuleGraph, rules: BoundaryRules): BoundaryViolation[] {
  const violations: BoundaryViolation[] = [];

  for (const edge of graph.edges) {
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
