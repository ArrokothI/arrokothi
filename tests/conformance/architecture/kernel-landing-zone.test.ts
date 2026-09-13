/**
 * K1.0 - the enforced landing zone for target Kernel work, and the quarantine around the current
 * 0.8.x implementation.
 *
 * The guard is stated twice on purpose. It runs against the real tree, where it must find nothing,
 * and against deliberately broken fixture repositories, where it must find exactly the forbidden
 * edge that was planted. A guard that only ever runs against a clean tree proves that the tree is
 * clean, not that the guard works; 013 calls that out directly ("An empty target directory with a
 * vacuously passing graph check is insufficient").
 *
 * The fixture repositories are written to a temporary directory and read back through the same
 * `loadWorkspace` / `walkModuleGraph` / `boundaryViolations` path the real check uses, so a control
 * exercises manifest parsing, subpath resolution and the violation rule rather than a
 * reimplementation of them.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  UNRESOLVABLE_MODULE_TARGET,
  loadWorkspace,
  walkModuleGraph,
  typeScriptFilesUnder,
  importSpecifiersIn,
  resolveSpecifier,
  type ModuleGraph,
} from "./module-graph.ts";
import { inventoryDisagreements, parseDependencyTable, parseInventory } from "./inventory-oracle.ts";
import {
  DEFERRED_EXTRACTIONS,
  traversableUnder,
  TARGET_KERNEL,
  TARGET_KERNEL_ENTRY_MODULES,
  TARGET_KERNEL_RULES,
  ZONES,
  boundaryViolations,
  type BoundaryRules,
} from "./boundary-policy.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const INVENTORY = "docs/development/work/K1.0/ownership-inventory.md";

/** A minimal workspace with the same shape as the real one: a target zone, a legacy core, an SDK. */
const FIXTURE_MANIFESTS: Record<string, string> = {
  "packages/kernel/package.json": JSON.stringify({
    name: "@arrokothi/kernel",
    private: true,
    exports: { ".": "./src/index.ts" },
  }),
  "packages/core/package.json": JSON.stringify({
    name: "@arrokothi/core",
    exports: { ".": "./src/index.ts", "./ports": "./src/ports/index.ts" },
  }),
  "packages/sdk/package.json": JSON.stringify({
    name: "@arrokothi/sdk",
    exports: { ".": "./src/index.ts" },
  }),
};

/** Legacy and host sources the controls import forbidden things from. */
const FIXTURE_OUTSIDE_SOURCES: Record<string, string> = {
  // The legacy barrel re-exports two further legacy modules, exactly as the real one does. A walk
  // that continued through a forbidden edge would report those inner edges as violations too.
  "packages/core/src/index.ts": 'export * from "./runtime/harness.ts";\nexport * from "./ports/index.ts";\n',
  "packages/core/src/ports/index.ts": 'export * from "../runtime/harness.ts";\nexport type LegacyController = { readonly kind: string };\n',
  "packages/core/src/runtime/harness.ts": "export class LegacyHarness {}\n",
  "packages/core/src/util/hash.ts": "export const hashValue = (value: string): string => value;\n",
  "packages/core/src/util/composite.ts": 'export { unaudited } from "./unaudited.ts";\n',
  "packages/core/src/util/unaudited.ts": "export const unaudited = 1;\n",
  "packages/sdk/src/index.ts": "export const bootstrapApplication = 1;\n",
};

/** Writes a fixture repository, runs the real guard path over it, and removes it. */
async function violationsFor(
  kernelSources: Record<string, string>,
  rules: BoundaryRules = TARGET_KERNEL_RULES,
): Promise<{ from: string; specifier: string; reason: string }[]> {
  const root = await mkdtemp(resolve(tmpdir(), "arrokothi-k1-0-"));
  try {
    const files = { ...FIXTURE_MANIFESTS, ...FIXTURE_OUTSIDE_SOURCES, ...kernelSources };
    for (const [path, contents] of Object.entries(files)) {
      const absolute = resolve(root, path);
      await mkdir(dirname(absolute), { recursive: true });
      await writeFile(absolute, contents, "utf8");
    }
    const workspace = await loadWorkspace(root);
    const graph = await walkModuleGraph(workspace, TARGET_KERNEL_ENTRY_MODULES, traversableUnder(rules));
    return boundaryViolations(graph, rules);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const realGraph = async (): Promise<ModuleGraph> =>
  walkModuleGraph(
    await loadWorkspace(REPO_ROOT),
    TARGET_KERNEL_ENTRY_MODULES,
    traversableUnder(TARGET_KERNEL_RULES),
  );

describe("K1.0 target Kernel landing zone", () => {
  test("the target zone exists, is a workspace member, and cannot be published", async () => {
    const workspace = await loadWorkspace(REPO_ROOT);
    const kernel = workspace.packages.get("@arrokothi/kernel");
    assert.ok(kernel, "the landing zone is a real workspace package, not a planned one");
    assert.equal(kernel.directory, "packages/kernel");
    assert.equal(kernel.isPrivate, true, "an unimplemented target Kernel must not be publishable");
    assert.deepEqual([...kernel.exports.keys()], ["."], "one entry point until a protocol packet needs more");
    assert.equal(kernel.exports.get("."), "packages/kernel/src/index.ts");

    const rootManifest = JSON.parse(await readFile(resolve(REPO_ROOT, "package.json"), "utf8")) as {
      workspaces: string[];
      scripts: Record<string, string>;
    };
    assert.ok(rootManifest.workspaces.includes("packages/kernel"), "the zone is installed, not orphaned");
    assert.ok(
      (rootManifest.scripts["test"] ?? "").includes("packages/kernel/tests/"),
      "the zone's own tests run in the standard suite",
    );
  });

  test("the target zone's real import graph reaches nothing outside itself", async () => {
    const violations = await boundaryViolations(await realGraph(), TARGET_KERNEL_RULES);
    assert.deepEqual(violations, [], "new Kernel work depends on no legacy, Runtime, host or vendor code");
  });

  test("that result is not vacuous: the graph has real files and a real internal edge", async () => {
    const graph = await realGraph();
    const files = [...graph.files].sort();
    assert.deepEqual(files, ["packages/kernel/src/index.ts", "packages/kernel/src/unsupported.ts"]);

    const internalEdges = graph.edges.filter((edge) => edge.resolution.kind === "internal");
    assert.ok(internalEdges.length >= 1, "the walk actually traversed an edge rather than reading one leaf file");
    assert.ok(
      graph.edges.length >= 1 && files.every((file) => file.startsWith(`${TARGET_KERNEL.roots[0]}/`)),
      "every reached file belongs to the declared zone root",
    );
  });

  test("the zone refuses unimplemented surfaces rather than answering with a no-op", async () => {
    const kernel = await import("@arrokothi/kernel");
    assert.deepEqual(Object.keys(kernel).sort(), ["UnsupportedKernelSurfaceError", "refuseUnsupportedSurface"]);
    assert.throws(
      () => kernel.refuseUnsupportedSurface("createExecution", "K1.1"),
      (error: unknown) => {
        assert.ok(error instanceof kernel.UnsupportedKernelSurfaceError);
        assert.equal(error.surface, "createExecution");
        assert.equal(error.owner, "K1.1");
        assert.match(error.message, /K1\.1 owns this surface/);
        return true;
      },
    );
  });
});

describe("K1.0 forbidden-edge controls", () => {
  test("a direct relative import into the legacy implementation is rejected", async () => {
    const violations = await violationsFor({
      "packages/kernel/src/index.ts": 'import { LegacyHarness } from "../../core/src/runtime/harness.ts";\nexport const use = LegacyHarness;\n',
    });
    assert.equal(violations.length, 1);
    assert.match(violations[0]!.reason, /packages\/core\/src\/runtime\/harness\.ts/);
  });

  test("a type-only import of a legacy subpath barrel is rejected", async () => {
    const violations = await violationsFor({
      "packages/kernel/src/index.ts": 'import type { LegacyController } from "@arrokothi/core/ports";\nexport type Alias = LegacyController;\n',
    });
    assert.equal(violations.length, 1);
    assert.equal(violations[0]!.specifier, "@arrokothi/core/ports");
    assert.match(violations[0]!.reason, /packages\/core\/src\/ports\/index\.ts/);
  });

  test("an import of the legacy package root barrel is rejected", async () => {
    const violations = await violationsFor({
      "packages/kernel/src/index.ts": 'import { legacyBarrel } from "@arrokothi/core";\nexport const use = legacyBarrel;\n',
    });
    assert.equal(violations.length, 1);
    assert.equal(violations[0]!.specifier, "@arrokothi/core");
  });

  test("a re-export of the legacy package root barrel is rejected", async () => {
    const violations = await violationsFor({
      "packages/kernel/src/index.ts": 'export * from "@arrokothi/core";\n',
    });
    assert.equal(violations.length, 1);
    assert.equal(violations[0]!.specifier, "@arrokothi/core");
  });

  test("a dynamic import of the legacy implementation is rejected", async () => {
    const violations = await violationsFor({
      "packages/kernel/src/index.ts": 'export const load = async () => import("@arrokothi/core");\n',
    });
    assert.equal(violations.length, 1);
    assert.equal(violations[0]!.specifier, "@arrokothi/core");
  });

  test("a forbidden import after a regular expression after a control-flow paren is rejected (K10-R1-01)", async () => {
    // The heuristic scanner read the slash after `)` as division, treated the quote inside `["']`
    // as a string delimiter, and consumed the forbidden import literal. The parser knows the slash
    // starts a regular expression, so the same scanner → resolver → graph → violation path still
    // reports the planted edge.
    const violations = await violationsFor({
      "packages/kernel/src/index.ts":
        'if (true) /["\']/.test(\'x\');\nimport { LegacyHarness } from "@arrokothi/core";\nexport const use = LegacyHarness;\n',
    });
    assert.equal(violations.length, 1);
    assert.equal(violations[0]!.from, "packages/kernel/src/index.ts");
    assert.equal(violations[0]!.specifier, "@arrokothi/core");
  });

  test("a non-literal dynamic import fails closed instead of reporting no dependency (K10-R1-01)", async () => {
    // `const target = "@arrokothi/core"; await import(target)` creates a runtime dependency the old
    // scanner emitted no edge for. K1.0 claims dynamic-import coverage, so an unresolvable target
    // must be forbidden, not silent. The violation carries the sentinel specifier with its own
    // reason through the same guard path.
    const violations = await violationsFor({
      "packages/kernel/src/index.ts":
        'const target = "@arrokothi/core";\nexport const load = async () => import(target);\n',
    });
    assert.equal(violations.length, 1);
    assert.equal(violations[0]!.from, "packages/kernel/src/index.ts");
    assert.equal(violations[0]!.specifier, UNRESOLVABLE_MODULE_TARGET);
    // The reason now names the form that carried the unresolvable target, because K10-R2-01's
    // rebuild made the fail-closed rule general rather than specific to dynamic imports. The
    // subject of this retained control is unchanged: one violation, from this file, sentinel
    // specifier, reason stating the target could not be verified.
    assert.match(violations[0]!.reason, /dynamic-import whose target cannot be statically verified/);
  });

  test("a type-only import-type dependency on the legacy barrel is rejected (K10-R2-01)", async () => {
    // The counterexample round 2 missed. `import("x").T` is a legal TypeScript dependency that the
    // enumerated visitor emitted no edge for, so the whole guard could stay green while target
    // source named the legacy package in a type. 007 forbids reaching legacy internals "through
    // direct, type-only or barrel imports"; this is all three at once.
    const violations = await violationsFor({
      "packages/kernel/src/index.ts":
        'export type LegacyExecution = import("@arrokothi/core").ExecutionContext;\n',
    });
    assert.equal(violations.length, 1);
    assert.equal(violations[0]!.from, "packages/kernel/src/index.ts");
    assert.equal(violations[0]!.specifier, "@arrokothi/core");
    assert.match(violations[0]!.reason, /packages\/core\/src\/index\.ts/);
  });

  test("a typeof import-type dependency on the legacy barrel is rejected (K10-R2-01)", async () => {
    const violations = await violationsFor({
      "packages/kernel/src/index.ts": 'export type LegacyModule = typeof import("@arrokothi/core");\n',
    });
    assert.equal(violations.length, 1);
    assert.equal(violations[0]!.specifier, "@arrokothi/core");
  });

  test("an import type nested in a signature or generic is rejected (K10-R2-01)", async () => {
    // Depth matters: the dependency is not at statement level, so a visitor that only inspects
    // top-level declarations would miss it.
    const parameter = await violationsFor({
      "packages/kernel/src/index.ts":
        'export function use(value: import("@arrokothi/core/ports").LegacyController): void { void value; }\n',
    });
    assert.equal(parameter.length, 1);
    assert.equal(parameter[0]!.specifier, "@arrokothi/core/ports");

    const generic = await violationsFor({
      "packages/kernel/src/index.ts":
        'export type Many = ReadonlyArray<import("../../core/src/runtime/harness.ts").LegacyHarness>;\n',
    });
    assert.equal(generic.length, 1);
    assert.match(generic[0]!.reason, /packages\/core\/src\/runtime\/harness\.ts/);
  });

  test("an import type whose target is not a literal fails closed (K10-R2-01)", async () => {
    const violations = await violationsFor({
      "packages/kernel/src/index.ts":
        'type Name = "@arrokothi/core";\nexport type Sneaky = import(Name).Anything;\n',
    });
    assert.equal(violations.length, 1);
    assert.equal(violations[0]!.specifier, UNRESOLVABLE_MODULE_TARGET);
    assert.match(violations[0]!.reason, /import-type whose target cannot be statically verified/);
  });

  test("a triple-slash reference into the legacy tree is rejected (K10-R2-01)", async () => {
    // A reference directive is a type dependency written outside any import statement. It resolves
    // as a path relative to the referring file, which is what TypeScript does with it.
    const violations = await violationsFor({
      "packages/kernel/src/index.ts":
        '/// <reference path="../../core/src/runtime/harness.ts" />\nexport const marker = 1;\n',
    });
    assert.equal(violations.length, 1);
    assert.match(violations[0]!.reason, /packages\/core\/src\/runtime\/harness\.ts/);
  });

  test("a triple-slash types reference on a forbidden package is rejected (K10-R2-01)", async () => {
    const violations = await violationsFor({
      "packages/kernel/src/index.ts": '/// <reference types="@arrokothi/core" />\nexport const marker = 1;\n',
    });
    assert.equal(violations.length, 1);
    assert.equal(violations[0]!.specifier, "@arrokothi/core");
  });

  test("an ambient declaration of a forbidden module is rejected (K10-R2-01)", async () => {
    const violations = await violationsFor({
      "packages/kernel/src/index.ts":
        'declare module "@arrokothi/core" {\n  interface Added { readonly x: number }\n}\nexport const marker = 1;\n',
    });
    assert.equal(violations.length, 1);
    assert.equal(violations[0]!.specifier, "@arrokothi/core");
  });

  test("a reference and an import type that stay inside the zone are accepted (K10-R2-01)", async () => {
    // The other direction: the new forms must not be rejected wholesale, or the guard would be red
    // on correct code and its green result would mean nothing.
    const violations = await violationsFor({
      "packages/kernel/src/index.ts":
        '/// <reference path="./helper.ts" />\nexport type H = typeof import("./helper.ts").helper;\nexport const marker = 1;\n',
      "packages/kernel/src/helper.ts": "export const helper = 1;\n",
    });
    assert.deepEqual(violations, []);
  });

  test("a legacy dependency reached through an in-zone module is rejected", async () => {
    const violations = await violationsFor({
      "packages/kernel/src/index.ts": 'export { relay } from "./internal.ts";\n',
      "packages/kernel/src/internal.ts": 'import { LegacyHarness } from "@arrokothi/core";\nexport const relay = LegacyHarness;\n',
    });
    assert.equal(violations.length, 1);
    assert.equal(violations[0]!.from, "packages/kernel/src/internal.ts", "the guard is transitive, not direct-only");
  });

  test("an import of the application host is rejected", async () => {
    const violations = await violationsFor({
      "packages/kernel/src/index.ts": 'import { bootstrapApplication } from "@arrokothi/sdk";\nexport const use = bootstrapApplication;\n',
    });
    assert.equal(violations.length, 1);
    assert.equal(violations[0]!.specifier, "@arrokothi/sdk");
  });

  test("an import of a third-party package is rejected", async () => {
    const violations = await violationsFor({
      "packages/kernel/src/index.ts": 'import { Agent } from "@strands-agents/sdk";\nexport const use = Agent;\n',
    });
    assert.equal(violations.length, 1);
    assert.match(violations[0]!.reason, /node: builtins only/);
  });

  test("a workspace subpath that is not a declared export is rejected as unresolved", async () => {
    const violations = await violationsFor({
      "packages/kernel/src/index.ts": 'import { hidden } from "@arrokothi/core/internals";\nexport const use = hidden;\n',
    });
    assert.equal(violations.length, 1);
    assert.match(violations[0]!.reason, /no declared export subpath/);
  });

  test("the guard accepts what the policy actually permits", async () => {
    const violations = await violationsFor({
      "packages/kernel/src/index.ts": 'import { createHash } from "node:crypto";\nexport { helper } from "./helper.ts";\nexport const digest = createHash;\n',
      "packages/kernel/src/helper.ts": "export const helper = 1;\n",
    });
    assert.deepEqual(violations, [], "node: builtins and in-zone modules are permitted, so the guard is not trivially red");
  });

  test("an approved portable leaf is accepted while its unaudited sibling stays rejected", async () => {
    const rules: BoundaryRules = { ...TARGET_KERNEL_RULES, allowedLeaves: ["packages/core/src/util/hash.ts"] };

    const approved = await violationsFor(
      { "packages/kernel/src/index.ts": 'export { hashValue } from "../../core/src/util/hash.ts";\n' },
      rules,
    );
    assert.deepEqual(approved, [], "an explicitly approved leaf is reusable");

    const sibling = await violationsFor(
      { "packages/kernel/src/index.ts": 'export { unaudited } from "../../core/src/util/unaudited.ts";\n' },
      rules,
    );
    assert.equal(sibling.length, 1, "approval is per file, not per directory");
    assert.match(sibling[0]!.reason, /unaudited\.ts/);
  });

  test("approving a leaf does not approve what that leaf imports", async () => {
    // The failure 013 names: a shared leaf that quietly reconnects the target zone to the legacy
    // tree. An approved file is still walked through, so its own dependencies face the same rule.
    const rules: BoundaryRules = { ...TARGET_KERNEL_RULES, allowedLeaves: ["packages/core/src/util/composite.ts"] };
    const violations = await violationsFor(
      { "packages/kernel/src/index.ts": 'export { unaudited } from "../../core/src/util/composite.ts";\n' },
      rules,
    );
    assert.equal(violations.length, 1);
    assert.equal(violations[0]!.from, "packages/core/src/util/composite.ts");
    assert.match(violations[0]!.reason, /unaudited\.ts/);
  });

  test("one forbidden barrel import reports one violation, not one per edge behind it", async () => {
    // Self-found defect K1.0-SELF-01. The walk used to continue through a forbidden file, so a
    // single import of the legacy barrel reported a violation for every edge inside the legacy
    // package, attributed to legacy files that are not in the guarded zone at all.
    const violations = await violationsFor({
      "packages/kernel/src/index.ts": 'export * from "@arrokothi/core";\n',
    });
    assert.deepEqual(
      violations.map((violation) => violation.from),
      ["packages/kernel/src/index.ts"],
      "every violation is attributed to a file in the guarded zone",
    );
    assert.equal(violations.length, 1);
  });
});

describe("K1.0 legacy quarantine", () => {
  test("nothing outside the zone depends on the unimplemented target Kernel", async () => {
    const workspace = await loadWorkspace(REPO_ROOT);
    const scanned: string[] = [];
    for (const directory of ["packages", "tests", "examples", "scripts"]) {
      scanned.push(...(await typeScriptFilesUnder(REPO_ROOT, directory)));
    }

    // The zone's own sources are not consumers of it. This one guard is: it imports the package by
    // name to prove the specifier resolves and that the published surface is only the refusal. It is
    // named exactly rather than excluded by directory, so a second importer under `architecture/`
    // would still fail this check.
    const VERIFIERS = ["tests/conformance/architecture/kernel-landing-zone.test.ts"];

    const importers: string[] = [];
    for (const file of scanned) {
      if (file.startsWith("packages/kernel/")) continue;
      const source = await readFile(resolve(REPO_ROOT, file), "utf8");
      for (const specifier of importSpecifiersIn(source)) {
        const resolution = resolveSpecifier(workspace, file, specifier);
        if (resolution.kind === "internal" && resolution.file.startsWith("packages/kernel/")) {
          importers.push(file);
        }
      }
    }

    assert.ok(scanned.length > 100, `the scan actually covered the tree (saw ${scanned.length} files)`);
    assert.deepEqual(
      [...new Set(importers)].sort(),
      VERIFIERS,
      "no SDK, example, script, legacy or integration source is routed through unfinished target work",
    );
  });

  test("the legacy package keeps its published export map exactly", async () => {
    const manifest = JSON.parse(await readFile(resolve(REPO_ROOT, "packages/core/package.json"), "utf8")) as {
      name: string;
      private?: boolean;
      exports: Record<string, string>;
    };
    assert.equal(manifest.name, "@arrokothi/core");
    assert.notEqual(manifest.private, true, "quarantine is attribution and dependency direction, not withdrawal");
    assert.deepEqual(manifest.exports, {
      ".": "./src/index.ts",
      "./execution": "./src/execution-api.ts",
      "./ports": "./src/ports/index.ts",
      "./reference": "./src/reference/index.ts",
      "./testing": "./src/testing/index.ts",
    });
  });

  test("the legacy package's exported names are unchanged by this packet", async () => {
    // Pinned before any K1.0 edit, at base c9a9ed7e6e538ab0542fc6a999426264abb6212a. The count is
    // readable and the digest over the sorted name list catches a rename that preserves it. K1.0
    // moves no legacy source, so both must hold exactly; a later packet that intends to change a
    // public surface updates these deliberately and says so. Each surface is imported by a literal
    // specifier (not `import(specifier)`): a non-literal dynamic import would fail the guard's own
    // fail-closed rule, so the guard must not commit one itself.
    const surfaces = {
      "@arrokothi/core": {
        count: 227,
        digest: "0c293a68bb41b1567bd35297a8eb1fa4c795f1d8708ce69ba0df64a4b1fe4880",
        module: (await import("@arrokothi/core")) as Record<string, unknown>,
      },
      "@arrokothi/core/execution": {
        count: 227,
        digest: "0c293a68bb41b1567bd35297a8eb1fa4c795f1d8708ce69ba0df64a4b1fe4880",
        module: (await import("@arrokothi/core/execution")) as Record<string, unknown>,
      },
      "@arrokothi/core/ports": {
        count: 44,
        digest: "fe347586965c368ef544d288d3d52088e7f30ed79765401ef9e691f5ac728bed",
        module: (await import("@arrokothi/core/ports")) as Record<string, unknown>,
      },
      "@arrokothi/core/reference": {
        count: 33,
        digest: "b73995e69da79b2db9fa6dc1213bb75e1fbca9da8f979bb8b44750d3ec19faa2",
        module: (await import("@arrokothi/core/reference")) as Record<string, unknown>,
      },
      "@arrokothi/core/testing": {
        count: 21,
        digest: "83670c5420b104771a67e3d506db12c0f020cd20640625e86050d08d7be61363",
        module: (await import("@arrokothi/core/testing")) as Record<string, unknown>,
      },
    } as const;

    for (const [specifier, expected] of Object.entries(surfaces)) {
      const names = Object.keys(expected.module).sort();
      assert.equal(names.length, expected.count, `${specifier} runtime export count drifted`);
      assert.equal(
        createHash("sha256").update(names.join("\n")).digest("hex"),
        expected.digest,
        `${specifier} runtime export names drifted without the count changing`,
      );
    }
  });
});

describe("K1.0 policy and inventory agree", () => {
  /** Applies each replacement once, failing loudly if an anchor is not uniquely present. */
  const mutate = (markdown: string, edits: readonly (readonly [string, string])[]): string => {
    let mutated = markdown;
    for (const [from, to] of edits) {
      assert.equal(mutated.split(from).length - 1, 1, `the control's anchor appears exactly once: ${from}`);
      mutated = mutated.replace(from, to);
    }
    return mutated;
  };

  const realInventory = async (): Promise<string> => readFile(resolve(REPO_ROOT, INVENTORY), "utf8");
  const policy = { zones: ZONES, deferred: DEFERRED_EXTRACTIONS };


  test("the parser actually reads the three ownership tables", async () => {
    // Non-vacuity. A parser that silently read nothing would report no disagreement about anything.
    const parsed = parseInventory(await realInventory());
    assert.deepEqual(parsed.unreadable, [], "every row in the three tables parsed");
    assert.equal(parsed.zones.size, ZONES.length);
    assert.equal(parsed.deferred.size, DEFERRED_EXTRACTIONS.length);
    assert.equal(parsed.packages.size, (await loadWorkspace(REPO_ROOT)).packages.size);
  });

  test("the inventory's ownership relations agree with the policy and the manifests", async () => {
    const disagreements = inventoryDisagreements(
      parseInventory(await realInventory()),
      policy,
      await loadWorkspace(REPO_ROOT),
    );
    assert.deepEqual(disagreements, [], "zone roots, deferred rows and export rows all match what is enforced");
  });

  test("every deferred owner names a packet the ledger declares", async () => {
    assert.ok(DEFERRED_EXTRACTIONS.length > 0, "the inventory of what the zone cannot reach yet is not empty");
    for (const row of DEFERRED_EXTRACTIONS) {
      assert.match(row.owner, /^(K1\.[1-4]|K2\.[1-4]|K3\.[1-4]|K4\.[1-5]|R1\.[1-3]|R2\.[1-3]|K5\.[1-3]|S1\.[1-9])$/);
      assert.match(row.disposition, /^(migratable|legacy-only|refused)$/);
    }
  });

  describe("mutated-document controls (K10-R2-02)", () => {
    // Each mutation is a plausible wrong row association that leaves every token set unchanged, so
    // the round-2 oracle stayed green on all of them. The oracle must name the specific relation.
    const controls: { name: string; edits: readonly (readonly [string, string])[]; expect: RegExp }[] = [
      {
        // The review's own counterexample. A one-sided change would remove a root from the page and
        // be caught by a set comparison; a true swap leaves every token present and only the
        // association wrong, which is precisely what a set comparison cannot see.
        name: "two zones' roots are swapped with each other",
        edits: [
          ["| `target-kernel` | `packages/kernel/src` |", "| `target-kernel` | `PLACEHOLDER` |"],
          ["| `legacy-core` | `packages/core/src` |", "| `legacy-core` | `packages/kernel/src` |"],
          ["| `target-kernel` | `PLACEHOLDER` |", "| `target-kernel` | `packages/core/src` |"],
        ],
        expect: /zone target-kernel owns \[packages\/kernel\/src\] but the document gives it \[packages\/core\/src\]/,
      },
      {
        name: "one zone's root is replaced",
        edits: [["| `target-kernel` | `packages/kernel/src` |", "| `target-kernel` | `packages/core/src` |"]],
        expect: /zone target-kernel owns \[packages\/kernel\/src\] but the document gives it \[packages\/core\/src\]/,
      },
      {
        name: "a deferred row's owner is reassigned",
        edits: [["| DX-1 | `packages/core/src/util/hash.ts` | migratable | K1.1 |", "| DX-1 | `packages/core/src/util/hash.ts` | migratable | K3.1 |"]],
        expect: /deferred row DX-1 is owned by K1\.1 but the document says K3\.1/,
      },
      {
        name: "a deferred row's disposition is changed",
        edits: [["| DX-5 | `packages/core/src/runtime/harness.ts` | legacy-only | K1.4 |", "| DX-5 | `packages/core/src/runtime/harness.ts` | migratable | K1.4 |"]],
        expect: /deferred row DX-5 is legacy-only but the document says migratable/,
      },
      {
        name: "a deferred row's path is moved to another subsystem",
        edits: [["| DX-8 | `packages/core/src/ports/runtime-store.ts` | legacy-only | K3.1 |", "| DX-8 | `packages/core/src/ports/scheduler.ts` | legacy-only | K3.1 |"]],
        expect: /deferred row DX-8 covers packages\/core\/src\/ports\/runtime-store\.ts but the document gives packages\/core\/src\/ports\/scheduler\.ts/,
      },
      {
        name: "a private package is claimed to be published",
        edits: [["| `@arrokothi/kernel` | `.` | No (private) |", "| `@arrokothi/kernel` | `.` | Yes |"]],
        expect: /package @arrokothi\/kernel is private but the document says it is published/,
      },
      {
        name: "a published package is claimed to be private",
        edits: [["| `@arrokothi/sdk` | `.` | Yes |", "| `@arrokothi/sdk` | `.` | No (private) |"]],
        expect: /package @arrokothi\/sdk is publishable but the document says it is not published/,
      },
      {
        name: "an exported subpath is dropped from a row",
        edits: [["| `@arrokothi/core` | `.`, `./execution`, `./ports`, `./reference`, `./testing` | Yes |", "| `@arrokothi/core` | `.`, `./execution`, `./ports`, `./reference` | Yes |"]],
        expect: /package @arrokothi\/core exports \[.*\.\/testing.*\] but the document gives \[/,
      },
      {
        name: "a package row is deleted entirely",
        edits: [["| `@arrokothi/provider-gemini` | `.` | Yes |\n", ""]],
        expect: /package @arrokothi\/provider-gemini exists in the workspace but is not documented/,
      },
      {
        name: "an undeclared zone is added in prose",
        edits: [["| `host-sdk` | `packages/sdk/src` |", "| `host-sdk` | `packages/sdk/src` |\n| `invented-zone` | `packages/kernel/src` |"]],
        expect: /zone invented-zone is documented but not declared by the policy/,
      },
      {
        // K10-R3-01. A stale contradictory row before the correct row must not be silently
        // overwritten by last-write-wins; the duplicate itself is a disagreement.
        name: "a duplicate zone row before the correct row is rejected",
        edits: [
          [
            "| `target-kernel` | `packages/kernel/src` |",
            "| `target-kernel` | `packages/core/src` | stale contradictory duplicate |\n| `target-kernel` | `packages/kernel/src` |",
          ],
        ],
        expect: /duplicate Zones row for zone target-kernel/,
      },
      {
        // K10-R3-01. Order-independence: the same contradiction after the correct row must also fail.
        name: "a duplicate zone row after the correct row is rejected",
        edits: [
          [
            "| `target-kernel` | `packages/kernel/src` |",
            "| `target-kernel` | `packages/kernel/src` |\n| `target-kernel` | `packages/core/src` | stale contradictory duplicate |",
          ],
        ],
        expect: /duplicate Zones row for zone target-kernel/,
      },
      {
        // K10-R3-01. Same last-write-wins hole for deferred rows, false row first.
        name: "a duplicate deferred row before the correct row is rejected",
        edits: [
          [
            "| DX-1 | `packages/core/src/util/hash.ts` | migratable | K1.1 | First packet that needs stable identity/receipt hashing. |",
            "| DX-1 | `packages/core/src/util/json.ts` | migratable | K1.1 | stale contradictory duplicate |\n| DX-1 | `packages/core/src/util/hash.ts` | migratable | K1.1 | First packet that needs stable identity/receipt hashing. |",
          ],
        ],
        expect: /duplicate Deferred row for DX-1/,
      },
      {
        // K10-R3-01. Same hole, false row last.
        name: "a duplicate deferred row after the correct row is rejected",
        edits: [
          [
            "| DX-1 | `packages/core/src/util/hash.ts` | migratable | K1.1 | First packet that needs stable identity/receipt hashing. |",
            "| DX-1 | `packages/core/src/util/hash.ts` | migratable | K1.1 | First packet that needs stable identity/receipt hashing. |\n| DX-1 | `packages/core/src/util/json.ts` | migratable | K1.1 | stale contradictory duplicate |",
          ],
        ],
        expect: /duplicate Deferred row for DX-1/,
      },
      {
        // K10-R3-01. Same last-write-wins hole for package rows, false row first.
        name: "a duplicate package row before the correct row is rejected",
        edits: [
          [
            "| `@arrokothi/kernel` | `.` | No (private) |",
            "| `@arrokothi/kernel` | `.` | Yes |\n| `@arrokothi/kernel` | `.` | No (private) |",
          ],
        ],
        expect: /duplicate Export row for package @arrokothi\/kernel/,
      },
      {
        // K10-R3-01. Same hole, false row last.
        name: "a duplicate package row after the correct row is rejected",
        edits: [
          [
            "| `@arrokothi/kernel` | `.` | No (private) |",
            "| `@arrokothi/kernel` | `.` | No (private) |\n| `@arrokothi/kernel` | `.` | Yes |",
          ],
        ],
        expect: /duplicate Export row for package @arrokothi\/kernel/,
      },
    ];

    for (const control of controls) {
      test(control.name, async () => {
        const workspace = await loadWorkspace(REPO_ROOT);
        const mutated = mutate(await realInventory(), control.edits);
        const disagreements = inventoryDisagreements(parseInventory(mutated), policy, workspace);
        assert.ok(
          disagreements.some((message) => control.expect.test(message)),
          `the oracle must name this wrong association; it reported: ${JSON.stringify(disagreements)}`,
        );
      });
    }
  });

  test("the cross-boundary dependency table matches the measured tree (K10-R1-02)", async () => {
    const inventory = await readFile(resolve(REPO_ROOT, INVENTORY), "utf8");
    const { rows, unreadable } = parseDependencyTable(inventory);
    assert.deepEqual(unreadable, [], "every dependency row is readable, unique and accounted for");
    assert.deepEqual(
      [...rows.keys()].sort(),
      ZONES.map((zone) => zone.id).sort(),
      "the dependency table covers exactly the declared zones",
    );

    const workspace = await loadWorkspace(REPO_ROOT);
    for (const zone of ZONES) {
      let files: string[] = [];
      for (const root of zone.roots) files.push(...(await typeScriptFilesUnder(REPO_ROOT, root)));
      const documented = rows.get(zone.id);
      assert.ok(documented, `the dependency table has a row for ${zone.id}`);
      assert.equal(files.length, documented.files, `${zone.id} .ts file count drifted from the inventory`);

      const actualReaches = new Set<string>();
      const actualThirdParty = new Set<string>();
      const relativeOutside: string[] = [];
      for (const file of files) {
        const source = await readFile(resolve(REPO_ROOT, file), "utf8");
        for (const specifier of importSpecifiersIn(source)) {
          if (specifier === UNRESOLVABLE_MODULE_TARGET) {
            relativeOutside.push(`${file} uses a non-literal dynamic import`);
            continue;
          }
          const resolution = resolveSpecifier(workspace, file, specifier);
          if (resolution.kind === "internal") {
            const targetInZone = zone.roots.some(
              (root) => resolution.file === root || resolution.file.startsWith(`${root}/`),
            );
            if (!targetInZone) {
              if (specifier.startsWith(".")) relativeOutside.push(`${file} reaches ${resolution.file} via ${specifier}`);
              else actualReaches.add(specifier);
            }
          } else if (resolution.kind === "external") {
            if (!specifier.startsWith("node:")) actualThirdParty.add(specifier);
          } else {
            actualReaches.add(specifier);
          }
        }
      }
      assert.deepEqual(relativeOutside, [], `${zone.id} has no unlisted relative cross-boundary edge`);
      assert.deepEqual(
        [...actualReaches].sort(),
        [...documented.reaches].sort(),
        `${zone.id} workspace reaches drifted from the inventory`,
      );
      assert.deepEqual(
        [...actualThirdParty].sort(),
        [...documented.thirdParty].sort(),
        `${zone.id} third-party reaches drifted from the inventory`,
      );
    }
  });

  test("a malformed keyed dependency row fails closed in either position (K10-R4-01)", async () => {
    // The row carries a recognisable zone key and a materially wrong dependency assertion, but its
    // file-count cell does not parse. Before this fix the parser discarded it before uniqueness was
    // ever considered, so it vanished: no duplicate, no unreadable row, and the correct row made
    // recomputation green. Both orders are exercised because the old code skipped it either way.
    const real = await realInventory();
    const correct = "| `target-kernel` | 2 | nothing | nothing |";
    const malformed = "| `target-kernel` | not-a-count | `@arrokothi/core` | nothing |";

    for (const [position, replacement] of [
      ["before", `${malformed}\n${correct}`],
      ["after", `${correct}\n${malformed}`],
    ] as const) {
      const { unreadable } = parseDependencyTable(mutate(real, [[correct, replacement]]));
      assert.ok(
        unreadable.length > 0,
        `a malformed keyed dependency row ${position} the correct row must be accounted for, not dropped`,
      );
      assert.ok(
        unreadable.some((message) => /Dependency row .*target-kernel/.test(message)),
        `the disagreement must name the zone key; got: ${JSON.stringify(unreadable)}`,
      );
    }
  });

  test("a dependency row with no recognisable key fails closed (K10-R4-01)", async () => {
    const real = await realInventory();
    const correct = "| `target-kernel` | 2 | nothing | nothing |";
    const { unreadable } = parseDependencyTable(mutate(real, [[correct, `| not-a-zone | 2 | nothing | nothing |\n${correct}`]]));
    assert.ok(
      unreadable.some((message) => /Dependency row has no recognisable key/.test(message)),
      `got: ${JSON.stringify(unreadable)}`,
    );
  });

  test("a short row with a recognisable key fails closed in every ownership table (K1.0-SELF-08)", async () => {
    // Self-found while closing K10-R4-01: the Zones loop discarded a row whose later cells were
    // simply absent, which is the same fail-open shape in a table the round-4 review had cleared.
    // Every keyed table now shares one total-accounting rule, so this is asserted for all of them.
    const real = await realInventory();
    const cases: { table: string; anchor: string; short: string }[] = [
      { table: "Zones", anchor: "| `target-kernel` | `packages/kernel/src` |", short: "| `target-kernel` |" },
      {
        table: "Deferred",
        anchor: "| DX-1 | `packages/core/src/util/hash.ts` | migratable | K1.1 |",
        short: "| DX-1 |",
      },
      { table: "Export", anchor: "| `@arrokothi/sdk` | `.` | Yes |", short: "| `@arrokothi/sdk` |" },
    ];

    for (const { table, anchor, short } of cases) {
      const parsed = parseInventory(mutate(real, [[anchor, `${short}\n${anchor}`]]));
      assert.ok(
        parsed.unreadable.length > 0,
        `a short ${table} row with a recognisable key must be accounted for, not dropped`,
      );
      assert.ok(
        parsed.unreadable.some((message) => message.startsWith(table)) ||
          parsed.unreadable.some((message) => /^duplicate /.test(message)),
        `the disagreement must name the ${table} table; got: ${JSON.stringify(parsed.unreadable)}`,
      );
    }
  });

  test("duplicate cross-boundary dependency rows fail closed (K10-R3-01)", async () => {
    const real = await realInventory();
    const anchor = "| `target-kernel` | 2 | nothing | nothing |";
    const stale = "| `target-kernel` | 999 | nothing | nothing |";
    const variants = [
      mutate(real, [[anchor, `${stale}\n${anchor}`]]),
      mutate(real, [[anchor, `${anchor}\n${stale}`]]),
    ];
    for (const mutated of variants) {
      const { unreadable } = parseDependencyTable(mutated);
      assert.ok(
        unreadable.some((message) => /duplicate Dependency row for zone target-kernel/.test(message)),
        `a duplicate dependency row must be reported regardless of order; got: ${JSON.stringify(unreadable)}`,
      );
    }
  });

  test("the allowed-leaf list is empty, and the inventory says why", async () => {
    const inventory = await readFile(resolve(REPO_ROOT, INVENTORY), "utf8");
    assert.deepEqual(TARGET_KERNEL_RULES.allowedLeaves, [], "K1.0 approves no portable leaf");
    assert.ok(inventory.includes("no approved portable leaf"), "the decision is recorded, not merely implied");
  });
});
