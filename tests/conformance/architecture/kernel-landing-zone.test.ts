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
import { inventoryDisagreements, parseDependencyTable, parseInventory, scanBlocks, scanTransitions } from "./inventory-oracle.ts";
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

  test("contradictory zone rows with omitted edge pipes fail closed in either position (K10-R5-01)", async () => {
    // GFM Table extension: leading/trailing pipes are recommended, not required, and may be
    // inconsistent (Example 199). The previous `tableRows` required both edge pipes, so a valid
    // contradictory row without one edge never reached the shared keyed reader. Full-row anchors
    // are used so the inserted row stands alone instead of merging with the remainder of a split
    // prefix row.
    const real = await realInventory();
    const workspace = await loadWorkspace(REPO_ROOT);
    const correct =
      "| `target-kernel` | `packages/kernel/src` | New Kernel work under the target Activation/Outcome protocol. **Contains no protocol implementation at this revision.** |";
    const badByEdge: Record<string, string> = {
      "omitted trailing pipe":
        "| `target-kernel` | `packages/core/src` | stale contradictory duplicate",
      "omitted leading pipe":
        "`target-kernel` | `packages/core/src` | stale contradictory duplicate |",
      "omitted both edge pipes": "`target-kernel` | `packages/core/src` | stale contradictory duplicate",
    };
    for (const [edge, bad] of Object.entries(badByEdge)) {
      for (const position of ["before", "after"] as const) {
        const mutated =
          position === "before"
            ? mutate(real, [[correct, `${bad}\n${correct}`]])
            : mutate(real, [[correct, `${correct}\n${bad}`]]);
        const disagreements = inventoryDisagreements(parseInventory(mutated), policy, workspace);
        assert.ok(
          disagreements.some((message) => /duplicate Zones row for zone target-kernel/.test(message)),
          `a contradictory zone row with ${edge} ${position} the correct row must be reported; got: ${JSON.stringify(disagreements)}`,
        );
      }
    }
  });

  test("contradictory deferred rows with omitted edge pipes fail closed in either position (K10-R5-01)", async () => {
    // Same front door as Zones: the shared parser serves all four keyed tables, so the omitted-edge
    // bypass is asserted here rather than only for the review's literal Zones example.
    const real = await realInventory();
    const workspace = await loadWorkspace(REPO_ROOT);
    const correct =
      "| DX-1 | `packages/core/src/util/hash.ts` | migratable | K1.1 | First packet that needs stable identity/receipt hashing. |";
    const badByEdge: Record<string, string> = {
      "omitted trailing pipe":
        "| DX-1 | `packages/core/src/util/json.ts` | migratable | K1.1 | stale contradictory duplicate",
      "omitted leading pipe":
        "DX-1 | `packages/core/src/util/json.ts` | migratable | K1.1 | stale contradictory duplicate |",
      "omitted both edge pipes":
        "DX-1 | `packages/core/src/util/json.ts` | migratable | K1.1 | stale contradictory duplicate",
    };
    for (const [edge, bad] of Object.entries(badByEdge)) {
      for (const position of ["before", "after"] as const) {
        const mutated =
          position === "before"
            ? mutate(real, [[correct, `${bad}\n${correct}`]])
            : mutate(real, [[correct, `${correct}\n${bad}`]]);
        const disagreements = inventoryDisagreements(parseInventory(mutated), policy, workspace);
        assert.ok(
          disagreements.some((message) => /duplicate Deferred row for DX-1/.test(message)),
          `a contradictory deferred row with ${edge} ${position} the correct row must be reported; got: ${JSON.stringify(disagreements)}`,
        );
      }
    }
  });

  test("contradictory export rows with omitted edge pipes fail closed in either position (K10-R5-01)", async () => {
    const real = await realInventory();
    const workspace = await loadWorkspace(REPO_ROOT);
    const correct = "| `@arrokothi/kernel` | `.` | No (private) |";
    const badByEdge: Record<string, string> = {
      "omitted trailing pipe": "| `@arrokothi/kernel` | `.` | Yes",
      "omitted leading pipe": "`@arrokothi/kernel` | `.` | Yes |",
      "omitted both edge pipes": "`@arrokothi/kernel` | `.` | Yes",
    };
    for (const [edge, bad] of Object.entries(badByEdge)) {
      for (const position of ["before", "after"] as const) {
        const mutated =
          position === "before"
            ? mutate(real, [[correct, `${bad}\n${correct}`]])
            : mutate(real, [[correct, `${correct}\n${bad}`]]);
        const disagreements = inventoryDisagreements(parseInventory(mutated), policy, workspace);
        assert.ok(
          disagreements.some((message) => /duplicate Export row for package @arrokothi\/kernel/.test(message)),
          `a contradictory export row with ${edge} ${position} the correct row must be reported; got: ${JSON.stringify(disagreements)}`,
        );
      }
    }
  });

  test("contradictory dependency rows with omitted edge pipes fail closed in either position (K10-R5-01)", async () => {
    const real = await realInventory();
    const correct = "| `target-kernel` | 2 | nothing | nothing |";
    const badByEdge: Record<string, string> = {
      "omitted trailing pipe": "| `target-kernel` | 999 | `@arrokothi/core` | nothing",
      "omitted leading pipe": "`target-kernel` | 999 | `@arrokothi/core` | nothing |",
      "omitted both edge pipes": "`target-kernel` | 999 | `@arrokothi/core` | nothing",
    };
    for (const [edge, bad] of Object.entries(badByEdge)) {
      for (const position of ["before", "after"] as const) {
        const mutated =
          position === "before"
            ? mutate(real, [[correct, `${bad}\n${correct}`]])
            : mutate(real, [[correct, `${correct}\n${bad}`]]);
        const { unreadable } = parseDependencyTable(mutated);
        assert.ok(
          unreadable.some((message) => /duplicate Dependency row for zone target-kernel/.test(message)),
          `a contradictory dependency row with ${edge} ${position} the correct row must be reported; got: ${JSON.stringify(unreadable)}`,
        );
      }
    }
  });

  test("a pipe-less contradictory row inside the table block fails closed (K1.0-SELF-11)", async () => {
    // Self-found while re-deriving the row-discovery boundary from GFM rather than patching only
    // the reviewer's omitted-trailing-pipe spelling. GFM Example 202 shows a body line with no
    // `|` at all (`bar`) still renders as a single-cell table row padded with empties, as long as
    // no blank line or other block breaks the table. Such a line inside the Zones block carries a
    // recognisable key but no roots, so it must end as unreadable/duplicate rather than vanishing
    // before the shared reader. The previous `tableRows` ignored every line without an edge pipe.
    const real = await realInventory();
    const correct =
      "| `target-kernel` | `packages/kernel/src` | New Kernel work under the target Activation/Outcome protocol. **Contains no protocol implementation at this revision.** |";
    const pipeless = "`target-kernel`";
    for (const position of ["before", "after"] as const) {
      const mutated =
        position === "before"
          ? mutate(real, [[correct, `${pipeless}\n${correct}`]])
          : mutate(real, [[correct, `${correct}\n${pipeless}`]]);
      const parsed = parseInventory(mutated);
      assert.ok(
        parsed.unreadable.length > 0,
        `a pipe-less row ${position} the correct row must be accounted for, not dropped; got: ${JSON.stringify(parsed.unreadable)}`,
      );
      assert.ok(
        parsed.unreadable.some((message) => /Zones row .*target-kernel/.test(message)),
        `the disagreement must name the zone key; got: ${JSON.stringify(parsed.unreadable)}`,
      );
    }
  });

  test("GFM delimiter and header variants do not hide the table (K1.0-SELF-11)", async () => {
    // Adjacent syntax from the same GFM section: the delimiter may use alignment colons
    // (`:---`, `---:`, `:---:`) and header/delimiter/body may all omit edge pipes (Example 199).
    // The previous discovery required both edge pipes and only skipped `^-+$` delimiters, so an
    // alignment delimiter would have been treated as a data row and a fully edge-less table would
    // have vanished into "not documented". Both directions are asserted through the production
    // parser: valid variants stay green, and a contradictory edge-less row beside them still fails.
    const real = await realInventory();
    const workspace = await loadWorkspace(REPO_ROOT);
    const headerAndDelim = "| Zone id | Roots | Owner and status |\n|---|---|---|";
    const aligned = "| Zone id | Roots | Owner and status |\n| :--- | ---: | :---: |";
    const alignedDoc = mutate(real, [[headerAndDelim, aligned]]);
    const alignedParsed = parseInventory(alignedDoc);
    assert.deepEqual(
      alignedParsed.unreadable,
      [],
      `an alignment delimiter is still the delimiter, not a data row; got: ${JSON.stringify(alignedParsed.unreadable)}`,
    );
    assert.equal(alignedParsed.zones.size, ZONES.length);

    const edgelessHeaderAndDelim = "Zone id | Roots | Owner and status\n---|---|---";
    const edgelessDoc = mutate(real, [[headerAndDelim, edgelessHeaderAndDelim]]);
    const edgelessParsed = parseInventory(edgelessDoc);
    assert.deepEqual(
      edgelessParsed.unreadable,
      [],
      `a header/delimiter without edge pipes is still the table start; got: ${JSON.stringify(edgelessParsed.unreadable)}`,
    );
    assert.equal(edgelessParsed.zones.size, ZONES.length);

    const correct =
      "| `target-kernel` | `packages/kernel/src` | New Kernel work under the target Activation/Outcome protocol. **Contains no protocol implementation at this revision.** |";
    const bad = "`target-kernel` | `packages/core/src` | stale contradictory duplicate";
    const disagreements = inventoryDisagreements(
      parseInventory(mutate(alignedDoc, [[correct, `${bad}\n${correct}`]])),
      policy,
      workspace,
    );
    assert.ok(
      disagreements.some((message) => /duplicate Zones row for zone target-kernel/.test(message)),
      `an edge-less contradictory row beside an alignment delimiter must still be reported; got: ${JSON.stringify(disagreements)}`,
    );

    // An escaped pipe stays inside its cell (Example 200) rather than splitting it: the row below
    // is still one Zones row with a duplicate key, not two cells that lose the key.
    const escaped = "| `target-kernel` | `packages/core/src` | stale \\| contradictory duplicate |";
    const escapedDisagreements = inventoryDisagreements(
      parseInventory(mutate(real, [[correct, `${escaped}\n${correct}`]])),
      policy,
      workspace,
    );
    assert.ok(
      escapedDisagreements.some((message) => /duplicate Zones row for zone target-kernel/.test(message)),
      `a row with an escaped pipe must still be read as a duplicate key; got: ${JSON.stringify(escapedDisagreements)}`,
    );
  });

  describe("header identity is structural, not textual (K10-R6-01)", () => {
    // The reader used to decide "is this the header?" by comparing the first cell against a
    // configured label. GFM allows arbitrary inline text in a data cell, so an ordinary body row
    // repeating that label took the header's silent exit: discovered by the round-6 front door,
    // then erased by value before keying, duplicate detection or the unreadable channel. Discovery
    // now returns header and body apart, so exactly one row per table - the line above the
    // delimiter - can be a header, and it is chosen by position before any cell is read.
    //
    // Each control below plants a header-label body row in one governed table, before and after an
    // otherwise correct keyed row, with full and with omitted edge pipes, and requires it back out
    // of the production parser through the same relation comparison C4 asserts on.
    const headerLabelControls = [
      {
        table: "Zones",
        correct:
          "| `target-kernel` | `packages/kernel/src` | New Kernel work under the target Activation/Outcome protocol. **Contains no protocol implementation at this revision.** |",
        badByEdge: {
          "full edge pipes": "| Zone id | `packages/core/src` | stale contradictory body row |",
          "omitted both edge pipes": "Zone id | `packages/core/src` | stale contradictory body row",
        },
        expect: /Zones row has no recognisable key: Zone id \| `packages\/core\/src`/,
      },
      {
        table: "Deferred",
        correct:
          "| DX-1 | `packages/core/src/util/hash.ts` | migratable | K1.1 | First packet that needs stable identity/receipt hashing. |",
        badByEdge: {
          "full edge pipes": "| Id | `packages/core/src/util/json.ts` | migratable | K1.1 | stale contradictory body row |",
          "omitted both edge pipes": "Id | `packages/core/src/util/json.ts` | migratable | K1.1 | stale contradictory body row",
        },
        expect: /Deferred row has no recognisable key: Id \| `packages\/core\/src\/util\/json\.ts`/,
      },
      {
        table: "Export",
        correct: "| `@arrokothi/kernel` | `.` | No (private) |",
        badByEdge: {
          "full edge pipes": "| Package | `.` | Yes |",
          "omitted both edge pipes": "Package | `.` | Yes",
        },
        expect: /Export row has no recognisable key: Package \| `\.` \| Yes/,
      },
    ] as const;

    for (const { table, correct, badByEdge, expect } of headerLabelControls) {
      for (const [edge, bad] of Object.entries(badByEdge)) {
        for (const position of ["before", "after"] as const) {
          test(`a ${table} body row beginning with the header label is accounted for, ${position} the correct row, with ${edge}`, async () => {
            const real = await realInventory();
            const workspace = await loadWorkspace(REPO_ROOT);
            const mutated =
              position === "before"
                ? mutate(real, [[correct, `${bad}\n${correct}`]])
                : mutate(real, [[correct, `${correct}\n${bad}`]]);
            const disagreements = inventoryDisagreements(parseInventory(mutated), policy, workspace);
            assert.ok(
              disagreements.some((message) => expect.test(message)),
              `the header-label body row must reach normal accounting, not the header exit; got: ${JSON.stringify(disagreements)}`,
            );
          });
        }
      }
    }

    // The dependency table shares the same reader and is read through its own entry point, so its
    // `Zone` label gets the same control rather than being assumed covered by the three above.
    for (const [edge, bad] of Object.entries({
      "full edge pipes": "| Zone | 999 | `@arrokothi/core` | nothing |",
      "omitted both edge pipes": "Zone | 999 | `@arrokothi/core` | nothing",
    })) {
      for (const position of ["before", "after"] as const) {
        test(`a Dependency body row beginning with the header label is accounted for, ${position} the correct row, with ${edge}`, async () => {
          const real = await realInventory();
          const correct = "| `target-kernel` | 2 | nothing | nothing |";
          const mutated =
            position === "before"
              ? mutate(real, [[correct, `${bad}\n${correct}`]])
              : mutate(real, [[correct, `${correct}\n${bad}`]]);
          const { unreadable } = parseDependencyTable(mutated);
          assert.ok(
            unreadable.some((message) => /Dependency row has no recognisable key: Zone \| 999/.test(message)),
            `the header-label body row must reach normal accounting, not the header exit; got: ${JSON.stringify(unreadable)}`,
          );
        });
      }
    }

    test("the real structural header of each governed table is accepted and is not read as data", async () => {
      // The positive half. Each header must be consumed as a header - so no relation gains a row
      // keyed from a header cell, and every relation is exactly the size the policy declares - and
      // the whole document must still parse with nothing unreadable.
      const real = await realInventory();
      const parsed = parseInventory(real);
      const dependency = parseDependencyTable(real);
      assert.deepEqual(parsed.unreadable, [], "the three ownership headers are accepted, not reported");
      assert.deepEqual(dependency.unreadable, [], "the dependency header is accepted, not reported");
      assert.equal(parsed.zones.size, ZONES.length);
      assert.equal(parsed.deferred.size, DEFERRED_EXTRACTIONS.length);
      assert.equal(parsed.packages.size, (await loadWorkspace(REPO_ROOT)).packages.size);
      assert.equal(dependency.rows.size, ZONES.length);
      for (const label of ["Zone id", "Id", "Package", "Zone"]) {
        assert.ok(!parsed.zones.has(label), `no zone is keyed from the header label ${label}`);
        assert.ok(!parsed.deferred.has(label), `no deferred row is keyed from the header label ${label}`);
        assert.ok(!parsed.packages.has(label), `no package is keyed from the header label ${label}`);
        assert.ok(!dependency.rows.has(label), `no dependency row is keyed from the header label ${label}`);
      }
    });

    test("a header that does not carry its expected label is reported, not silently accepted", async () => {
      // Position picks the header out; the configured label survives as a check on it. Without that
      // check, making header identity structural would have *weakened* the oracle: a renamed header
      // used to fall through to the body loop and surface as an unreadable row.
      const real = await realInventory();
      const renames: { table: string; from: string; to: string; expect: RegExp }[] = [
        {
          table: "Zones",
          from: "| Zone id | Roots | Owner and status |",
          to: "| Zone identifier | Roots | Owner and status |",
          expect: /Zones table header starts with "Zone identifier", not "Zone id"/,
        },
        {
          table: "Deferred",
          from: "| Id | Current path | Disposition | Owner | Why it is assigned there |",
          to: "| Ident | Current path | Disposition | Owner | Why it is assigned there |",
          expect: /Deferred table header starts with "Ident", not "Id"/,
        },
        {
          table: "Export",
          from: "| Package | Exported subpaths | Published? |",
          to: "| Module | Exported subpaths | Published? |",
          expect: /Export table header starts with "Module", not "Package"/,
        },
      ];
      for (const { table, from, to, expect } of renames) {
        const parsed = parseInventory(mutate(real, [[from, to]]));
        assert.ok(
          parsed.unreadable.some((message) => expect.test(message)),
          `a renamed ${table} header must be reported; got: ${JSON.stringify(parsed.unreadable)}`,
        );
      }
      const dependencyParsed = parseDependencyTable(
        mutate(real, [
          [
            "| Zone | `.ts` files | Reaches `legacy-core` via | Reaches third-party |",
            "| Boundary | `.ts` files | Reaches `legacy-core` via | Reaches third-party |",
          ],
        ]),
      );
      assert.ok(
        dependencyParsed.unreadable.some((message) => /Dependency table header starts with "Boundary", not "Zone"/.test(message)),
        `a renamed Dependency header must be reported; got: ${JSON.stringify(dependencyParsed.unreadable)}`,
      );
    });

    test("a contradictory row promoted to a further table's header is still accounted for (K1.0-SELF-13)", async () => {
      // Self-found adjacent challenger, aimed at the silent exit a naive structural fix creates
      // rather than at another Markdown spelling. Skipping "the header" by position is only safe
      // while a section holds one governed table: plant a delimiter line under a contradictory row
      // placed after the real table, and that row becomes the header of a second table - which a
      // reader that silently skips every header would drop, reopening K10-R6-01 through structure
      // instead of through text. Every row of a further table in the section is reported instead.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const lastZoneRow = "| `host-sdk` | `packages/sdk/src` | Application bootstrap and host composition. |\n";
      const promoted = "| `target-kernel` | `packages/core/src` | stale contradictory row |";
      const mutated = mutate(real, [[lastZoneRow, `${lastZoneRow}\n${promoted}\n|---|---|---|\n`]]);
      const disagreements = inventoryDisagreements(parseInventory(mutated), policy, workspace);
      assert.ok(
        disagreements.some((message) =>
          /Zones section contains a further table; this row is outside the governed table: `target-kernel` \| `packages\/core\/src`/.test(message),
        ),
        `a row promoted to a further table's header must not take the header exit; got: ${JSON.stringify(disagreements)}`,
      );
    });

    test("a repeated section heading cannot delete the rows after it (K1.0-SELF-12)", async () => {
      // Self-found while auditing section selection, the first stage of the pipeline. Section text
      // was taken with `split(heading)[1]`, which ends at a *second* occurrence of the same heading
      // text, so a duplicated `## Zones` carrying a contradictory table deleted those rows from the
      // candidate stream before discovery ever ran: no key, no duplicate, no unreadable row. The
      // section is now sliced from the first heading to the first following next-heading, so the
      // repeated heading breaks the body (GFM Example 201) and the table under it is reported.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const lastZoneRow = "| `host-sdk` | `packages/sdk/src` | Application bootstrap and host composition. |\n";
      const repeated =
        `${lastZoneRow}\n## Zones\n\n| Zone id | Roots | Owner and status |\n|---|---|---|\n| \`target-kernel\` | \`packages/core/src\` | stale contradictory row |\n`;
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[lastZoneRow, repeated]])),
        policy,
        workspace,
      );
      assert.ok(
        disagreements.some((message) =>
          /Zones section contains a further table; this row is outside the governed table: `target-kernel` \| `packages\/core\/src`/.test(message),
        ),
        `rows under a repeated heading must not disappear; got: ${JSON.stringify(disagreements)}`,
      );
    });

    test("a governed table that is not discoverable at all is reported, not read as an empty relation", async () => {
      // The other end of the same accounting: discovery returning nothing must be an observable
      // disagreement about the table, not a quietly empty map that only the reverse-direction
      // comparison happens to notice.
      const real = await realInventory();
      const parsed = parseInventory(mutate(real, [["| Zone id | Roots | Owner and status |\n|---|---|---|\n", ""]]));
      assert.ok(
        parsed.unreadable.some((message) => /Zones table is missing from its section/.test(message)),
        `a missing governed table must be reported; got: ${JSON.stringify(parsed.unreadable)}`,
      );
    });
  });

  describe("structural section boundaries (K10-R7-01)", () => {
    // Section membership is determined by Markdown structure, not by occurrence of heading-looking
    // bytes. The previous `sectionText` cut the section with `indexOf(nextHeading)`, so a literal
    // mention of the next heading in prose, inline code or fenced code truncated the section before
    // table discovery could inspect its block context, silently deleting a later contradictory
    // table. Selection now scans block structure with fence tracking: only a real level-2 ATX
    // heading outside fenced code carrying the exact expected title starts or ends a section.
    //
    // Each control below plants the full next-heading text for the Zones section
    // (`## Current cross-boundary dependencies`) in a non-heading context, followed by a
    // well-formed contradictory table still before the real next heading, and requires it back out
    // of the production parser as a further table. Two further controls show the start boundary is
    // structural the same way, one shows a real ATX next heading still terminates the section, and
    // the closing controls are adjacent GFM-grammar challengers (escaped `#`, missing whitespace,
    // over-long runs, indented code, mismatched fences) plus one second-relation case.
    const lastZoneRow =
      "| `host-sdk` | `packages/sdk/src` | Application bootstrap and host composition. |\n";
    const badZonesTable =
      "| Zone id | Roots | Owner and status |\n|---|---|---|\n| `target-kernel` | `packages/core/src` | stale contradictory further table |\n";
    const furtherZones = /Zones section contains a further table; this row is outside the governed table: `target-kernel` \| `packages\/core\/src`/;

    test("a literal next-heading mention in prose does not truncate the section", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion =
        `${lastZoneRow}\nThe literal token ## Current cross-boundary dependencies is mentioned here; this line is prose, not an ATX heading.\n\n${badZonesTable}`;
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[lastZoneRow, insertion]])),
        policy,
        workspace,
      );
      assert.ok(
        disagreements.some((message) => furtherZones.test(message)),
        `prose carrying the next-heading bytes must not end the section; got: ${JSON.stringify(disagreements)}`,
      );
    });

    test("a next-heading mention inside an inline code span does not truncate the section", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion =
        `${lastZoneRow}\nThe literal token \`## Current cross-boundary dependencies\` is mentioned here.\n\n${badZonesTable}`;
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[lastZoneRow, insertion]])),
        policy,
        workspace,
      );
      assert.ok(
        disagreements.some((message) => furtherZones.test(message)),
        `an inline code span is inline content on a paragraph line, not a heading; got: ${JSON.stringify(disagreements)}`,
      );
    });

    test("a next-heading mention inside a fenced code block does not truncate the section", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion =
        `${lastZoneRow}\n\`\`\`\n## Current cross-boundary dependencies\n\`\`\`\n\n${badZonesTable}`;
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[lastZoneRow, insertion]])),
        policy,
        workspace,
      );
      assert.ok(
        disagreements.some((message) => furtherZones.test(message)),
        `fenced lines are literal code, so the heading bytes there must not end the section; got: ${JSON.stringify(disagreements)}`,
      );
    });

    test("a real ATX next heading still terminates the section", async () => {
      // The positive half: a Zones-shaped table planted after the real
      // `## Current cross-boundary dependencies` heading belongs to a later section, so the Zones
      // channel must stay green. Without termination the planted rows would be further tables.
      const real = await realInventory();
      const heading = "## Current cross-boundary dependencies\n";
      const parsed = parseInventory(mutate(real, [[heading, `${heading}\n${badZonesTable}`]]));
      assert.deepEqual(parsed.unreadable, [], `rows after the real next heading are outside the section; got: ${JSON.stringify(parsed.unreadable)}`);
      assert.equal(parsed.zones.size, ZONES.length);
    });

    test("a current-heading mention in earlier prose does not select the section start", async () => {
      // A prose line and a planted table before the real `## Zones` heading are outside the
      // section. Substring selection would have started at the prose bytes and read the planted
      // table as governed or further; structural selection stays green.
      const real = await realInventory();
      const fakeTable =
        "| Zone id | Roots | Owner and status |\n|---|---|---|\n| `target-kernel` | `packages/core/src` | planted before the section |\n\n";
      const parsed = parseInventory(
        mutate(real, [["## Zones\n", `See ## Zones below.\n\n${fakeTable}## Zones\n`]]),
      );
      assert.deepEqual(parsed.unreadable, [], `content before the real heading is outside the section; got: ${JSON.stringify(parsed.unreadable)}`);
    });

    test("a current-heading mention inside a fenced block does not select the section start", async () => {
      const real = await realInventory();
      const fakeTable =
        "| Zone id | Roots | Owner and status |\n|---|---|---|\n| `target-kernel` | `packages/core/src` | planted before the section |\n\n";
      const parsed = parseInventory(
        mutate(real, [["## Zones\n", `\`\`\`\n## Zones\n\`\`\`\n\n${fakeTable}## Zones\n`]]),
      );
      assert.deepEqual(parsed.unreadable, [], `a fenced heading mention is code, not the section start; got: ${JSON.stringify(parsed.unreadable)}`);
    });

    test("an escaped hash does not start or end a section (K1.0-SELF-14)", async () => {
      // Self-found adjacent challenger, aimed at structural heading recognition rather than another
      // table spelling. Per GFM an escaped `\#` is literal text, so `\## Current cross-boundary
      // dependencies` is a paragraph line, not an ATX heading, and must not truncate.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion = `${lastZoneRow}\n\\## Current cross-boundary dependencies\n\n${badZonesTable}`;
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[lastZoneRow, insertion]])),
        policy,
        workspace,
      );
      assert.ok(
        disagreements.some((message) => furtherZones.test(message)),
        `an escaped hash is paragraph text, not a heading; got: ${JSON.stringify(disagreements)}`,
      );
    });

    test("a heading-like line without the required whitespace is not a heading (K1.0-SELF-15)", async () => {
      // GFM requires a space, tab or end of line after the opening run: `##Current …` is paragraph
      // text. It must not truncate the section.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion = `${lastZoneRow}\n##Current cross-boundary dependencies\n\n${badZonesTable}`;
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[lastZoneRow, insertion]])),
        policy,
        workspace,
      );
      assert.ok(
        disagreements.some((message) => furtherZones.test(message)),
        `a hash run with no following whitespace is not a heading; got: ${JSON.stringify(disagreements)}`,
      );
    });

    test("an over-long hash run and indented code are not headings (K1.0-SELF-16)", async () => {
      // Seven `#` characters are not an ATX heading (maximum six), and four-space indented
      // `## …` is indented code, not a heading. Neither may truncate the section.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      for (const line of [
        "####### Current cross-boundary dependencies",
        "    ## Current cross-boundary dependencies",
      ]) {
        const insertion = `${lastZoneRow}\n${line}\n\n${badZonesTable}`;
        const disagreements = inventoryDisagreements(
          parseInventory(mutate(real, [[lastZoneRow, insertion]])),
          policy,
          workspace,
        );
        assert.ok(
          disagreements.some((message) => furtherZones.test(message)),
          `${JSON.stringify(line)} is not an ATX heading; got: ${JSON.stringify(disagreements)}`,
        );
      }
    });

    test("a mismatched fence closer does not end the fenced region (K1.0-SELF-17)", async () => {
      // A `~~~` line does not close a ```` ``` ```` block: the closing run must use the same
      // character. The heading bytes between them stay code and must not truncate; the
      // contradictory table after the matching closer is ordinary section content and is reported.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion =
        `${lastZoneRow}\n\`\`\`\n## Current cross-boundary dependencies\n~~~\n\`\`\`\n\n${badZonesTable}`;
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[lastZoneRow, insertion]])),
        policy,
        workspace,
      );
      assert.ok(
        disagreements.some((message) => furtherZones.test(message)),
        `a mismatched closer leaves the fence open; got: ${JSON.stringify(disagreements)}`,
      );
    });

    test("the structural boundary holds for the second relation as well", async () => {
      // The same defect class in the Current cross-boundary section: a fenced mention of its next
      // heading (`## Export ownership`) before a contradictory dependency table must not truncate.
      const real = await realInventory();
      const anchor = "| `host-sdk` | 4 | `@arrokothi/core`, `@arrokothi/core/ports`, `@arrokothi/core/reference` | nothing |\n";
      const badDependencyTable =
        "| Zone | `.ts` files | Reaches `legacy-core` via | Reaches third-party |\n|---|---|---|---|\n| `target-kernel` | 999 | `@arrokothi/core` | nothing |\n";
      const mutated = mutate(real, [[
        anchor,
        `${anchor}\n\`\`\`\n## Export ownership\n\`\`\`\n\n${badDependencyTable}`,
      ]]);
      const { unreadable } = parseDependencyTable(mutated);
      assert.ok(
        unreadable.some((message) => /Dependency section contains a further table; this row is outside the governed table: `target-kernel` \| 999/.test(message)),
        `a fenced next-heading mention must not hide a contradictory dependency row; got: ${JSON.stringify(unreadable)}`,
      );
    });
  });

  describe("fence single-consumption (K10-R8-01)", () => {
    // A fence marker encountered where a table body is open terminates that body and is consumed
    // exactly once by the single shared block scan. The round-8 scanner consumed it in the body
    // loop without advancing `i`, so the outer loop reprocessed the same bare marker as its own
    // closer and the literal code lines after it became a spurious further table. Each control
    // below plants a complete three-line table (header + delimiter + body, the shape the round-8
    // audit's single-row case lacked) inside a fence immediately after the last real Zones body
    // row and drives the production parser.
    const lastZoneRow =
      "| `host-sdk` | `packages/sdk/src` | Application bootstrap and host composition. |\n";
    const codeTable = (rows: string): string => rows;
    const completeCodeTable =
      "| Zone id | Roots | Owner and status |\n|---|---|---|\n| `target-kernel` | `packages/core/src` | this is code, not an inventory row |\n";
    const furtherZones = /Zones section contains a further table; this row is outside the governed table: `target-kernel` \| `packages\/core\/src`/;

    test("a complete table inside a bare backtick fence immediately after the body stays green", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const mutated = mutate(real, [[lastZoneRow, `${lastZoneRow}\`\`\`\n${completeCodeTable}\`\`\`\n`]]);
      const disagreements = inventoryDisagreements(parseInventory(mutated), policy, workspace);
      assert.deepEqual(disagreements, [], `fenced literal code must not become a further table; got: ${JSON.stringify(disagreements)}`);
    });

    test("the same block with a legitimate fence info string stays green", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const mutated = mutate(real, [[lastZoneRow, `${lastZoneRow}\`\`\`markdown\n${completeCodeTable}\`\`\`\n`]]);
      const disagreements = inventoryDisagreements(parseInventory(mutated), policy, workspace);
      assert.deepEqual(disagreements, [], `an info string does not change the fence transition; got: ${JSON.stringify(disagreements)}`);
    });

    test("a tilde-fenced equivalent stays green", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const mutated = mutate(real, [[lastZoneRow, `${lastZoneRow}~~~\n${completeCodeTable}~~~\n`]]);
      const disagreements = inventoryDisagreements(parseInventory(mutated), policy, workspace);
      assert.deepEqual(disagreements, [], `tilde fences share the single-consumption rule; got: ${JSON.stringify(disagreements)}`);
    });

    test("a real second Markdown table at the same location but outside a fence still fails", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const badZonesTable =
        "| Zone id | Roots | Owner and status |\n|---|---|---|\n| `target-kernel` | `packages/core/src` | stale contradictory further table |\n";
      const mutated = mutate(real, [[lastZoneRow, `${lastZoneRow}\n${badZonesTable}`]]);
      const disagreements = inventoryDisagreements(parseInventory(mutated), policy, workspace);
      assert.ok(
        disagreements.some((message) => furtherZones.test(message)),
        `an unfenced second table is still a further table; got: ${JSON.stringify(disagreements)}`,
      );
    });

    test("mismatched closers remain inside the open fence", async () => {
      // A `~~~` line does not close a backtick block, so the code table between them stays raw.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const mutated = mutate(real, [[lastZoneRow, `${lastZoneRow}\`\`\`\n~~~\n${completeCodeTable}\`\`\`\n`]]);
      const disagreements = inventoryDisagreements(parseInventory(mutated), policy, workspace);
      assert.deepEqual(disagreements, [], `a mismatched closer leaves the fence open; got: ${JSON.stringify(disagreements)}`);
    });

    test("a shorter closer than the opener does not close it", async () => {
      // Four backticks open; three backticks cannot close (closing run must be at least as long).
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const mutated = mutate(real, [[lastZoneRow, `${lastZoneRow}\`\`\`\`\n${completeCodeTable}\`\`\`\n\`\`\`\`\n`]]);
      const disagreements = inventoryDisagreements(parseInventory(mutated), policy, workspace);
      assert.deepEqual(disagreements, [], `a shorter run leaves the fence open; got: ${JSON.stringify(disagreements)}`);
    });

    test("an unclosed fence before the governed table stays fail-loud (GFM-consistent)", async () => {
      // An unclosed fence swallows the governed header as code, so discovery reports the table
      // missing rather than reading an empty relation quietly. This preserves the round-8 audit's
      // case 2d direction under the reconstructed scanner.
      const real = await realInventory();
      const header = "## Zones\n";
      const parsed = parseInventory(mutate(real, [[header, `${header}\`\`\`\n`]]));
      assert.ok(
        parsed.unreadable.some((message) => /Zones table is missing from its section/.test(message)),
        `an unclosed fence must be loud, not silent; got: ${JSON.stringify(parsed.unreadable)}`,
      );
    });

    test("a complete table inside indented code after the body stays green (adjacent block challenger)", async () => {
      // Four-space indented lines are indented code at top level (GFM §4.4), never inventory
      // rows. The pre-round-9 table scanner trimmed every line before checking pipes, so an
      // indented code table would have become a spurious further table through the same
      // false-positive direction as K10-R8-01.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const indented = completeCodeTable.split("\n").filter((line) => line !== "").map((line) => `    ${line}`).join("\n") + "\n";
      const mutated = mutate(real, [[lastZoneRow, `${lastZoneRow}\n${indented}`]]);
      const disagreements = inventoryDisagreements(parseInventory(mutated), policy, workspace);
      assert.deepEqual(disagreements, [], `indented code must not become a further table; got: ${JSON.stringify(disagreements)}`);
    });

    test("table-shaped lines inside a blockquote after the body stay green (adjacent block challenger)", async () => {
      // Quoted lines break the body per GFM Example 201 but never become top-level inventory
      // rows: a quoted table is not a top-level assertion of this document.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const quoted = completeCodeTable.split("\n").filter((line) => line !== "").map((line) => `> ${line}`).join("\n") + "\n";
      const mutated = mutate(real, [[lastZoneRow, `${lastZoneRow}\n${quoted}\n`]]);
      const disagreements = inventoryDisagreements(parseInventory(mutated), policy, workspace);
      assert.deepEqual(disagreements, [], `quoted table-shaped lines must not become relations; got: ${JSON.stringify(disagreements)}`);
    });

    test("a real table after a blockquote break still fails", async () => {
      // The break must not swallow what follows: a genuine contradictory table after the quote
      // and a blank line is still reported.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const badZonesTable =
        "| Zone id | Roots | Owner and status |\n|---|---|---|\n| `target-kernel` | `packages/core/src` | stale contradictory further table |\n";
      const mutated = mutate(real, [[lastZoneRow, `${lastZoneRow}\n> quoted prose, not a row\n\n${badZonesTable}`]]);
      const disagreements = inventoryDisagreements(parseInventory(mutated), policy, workspace);
      assert.ok(
        disagreements.some((message) => furtherZones.test(message)),
        `a table after the quote break is still discovered; got: ${JSON.stringify(disagreements)}`,
      );
    });
  });

  describe("raw HTML blocks (K10-R8-02)", () => {
    // GFM §4.6: material inside a raw HTML block that might otherwise be recognised as a block
    // start is ignored until that block's end condition. `sectionLines` used to track only
    // fences, so an exact next-heading line inside `<script>…</script>` truncated the Zones
    // section and silently excluded a later contradictory table. The shared `scanBlocks` layer
    // now tracks all seven HTML block types as raw, so neither the heading nor tables inside
    // the block become structure, while tables after the block (before the real next heading)
    // remain inside the section and are reported.
    const lastZoneRow =
      "| `host-sdk` | `packages/sdk/src` | Application bootstrap and host composition. |\n";
    const badZonesTable =
      "| Zone id | Roots | Owner and status |\n|---|---|---|\n| `target-kernel` | `packages/core/src` | stale contradictory further table |\n";
    const furtherZones = /Zones section contains a further table; this row is outside the governed table: `target-kernel` \| `packages\/core\/src`/;

    test("an exact next-heading line inside a script block cannot truncate the section", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion =
        `${lastZoneRow}\n<script>\n## Current cross-boundary dependencies\n</script>\n\n${badZonesTable}`;
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[lastZoneRow, insertion]])),
        policy,
        workspace,
      );
      assert.ok(
        disagreements.some((message) => furtherZones.test(message)),
        `the heading inside <script> is raw HTML content, so the later table must surface; got: ${JSON.stringify(disagreements)}`,
      );
    });

    test("a script open tag with attributes and mixed case still opens the raw block", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion =
        `${lastZoneRow}\n<SCRIPT type="text/javascript">\n## Current cross-boundary dependencies\n</script>\n\n${badZonesTable}`;
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[lastZoneRow, insertion]])),
        policy,
        workspace,
      );
      assert.ok(
        disagreements.some((message) => furtherZones.test(message)),
        `type-1 matching is case-insensitive and allows attributes; got: ${JSON.stringify(disagreements)}`,
      );
    });

    test("an HTML comment block hides its heading but not the later table (adjacent raw-block challenger)", async () => {
      // Type 2 (`<!--` … `-->`) ends on a different sequence than type 1, so this challenger
      // falsifies a `<script>`-only implementation rather than re-proving it.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion =
        `${lastZoneRow}\n<!--\n## Current cross-boundary dependencies\n-->\n\n${badZonesTable}`;
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[lastZoneRow, insertion]])),
        policy,
        workspace,
      );
      assert.ok(
        disagreements.some((message) => furtherZones.test(message)),
        `the heading inside the comment is raw, so the later table must surface; got: ${JSON.stringify(disagreements)}`,
      );
    });

    test("a pre block hides its heading but not the later table", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion =
        `${lastZoneRow}\n<pre>\n## Current cross-boundary dependencies\n</pre>\n\n${badZonesTable}`;
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[lastZoneRow, insertion]])),
        policy,
        workspace,
      );
      assert.ok(
        disagreements.some((message) => furtherZones.test(message)),
        `the heading inside <pre> is raw, so the later table must surface; got: ${JSON.stringify(disagreements)}`,
      );
    });

    test("a type-6 div block hides its heading until the blank line", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion =
        `${lastZoneRow}\n<div>\n## Current cross-boundary dependencies\n\n${badZonesTable}`;
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[lastZoneRow, insertion]])),
        policy,
        workspace,
      );
      assert.ok(
        disagreements.some((message) => furtherZones.test(message)),
        `the heading inside <div> is raw until the blank line; got: ${JSON.stringify(disagreements)}`,
      );
    });

    test("ordinary inline HTML and prose do not open a raw block", async () => {
      // Control 11 for an interpreting (not refusing) design: a complete tag with trailing prose
      // is paragraph text (type 7 requires the tag alone on the line), and mid-line tags are
      // inline HTML. Neither may start a block that hides the later table, and neither is
      // refused: the contradictory table after them is still reported through the normal channel.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion =
        `${lastZoneRow}\nThe tokens <code>hi</code> and <a href="https://example.com">link</a> are inline, not blocks.\n\n<a href="https://example.com">link</a> with trailing prose is a paragraph, not a type-7 block.\n\n${badZonesTable}`;
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[lastZoneRow, insertion]])),
        policy,
        workspace,
      );
      assert.ok(
        disagreements.some((message) => furtherZones.test(message)),
        `inline HTML must not open a raw block or be refused; got: ${JSON.stringify(disagreements)}`,
      );
    });

    test("inline HTML alone without a contradictory table stays green", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion =
        `${lastZoneRow}\nThe tokens <code>hi</code> and <a href="https://example.com">link</a> are inline, not blocks.\n`;
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[lastZoneRow, insertion]])),
        policy,
        workspace,
      );
      assert.deepEqual(disagreements, [], `ordinary inline HTML must not be rejected as a block; got: ${JSON.stringify(disagreements)}`);
    });
  });

  describe("list containers (K10-R9-01)", () => {
    // A governed section boundary is an exact expected level-2 ATX heading at the document's
    // top-level block/container depth: "parses as an ATX heading" is insufficient, because GFM
    // list items may contain any block including headings. The shared scan now tracks
    // list-item containers (marker-width-derived content indents, nesting), so a nested
    // heading breaks a table body but never delimits a section, while a dedented heading still
    // terminates normally and a column-0 table after the list is still discovered.
    const lastDxRow =
      "| DX-12 | `packages/core/src/ports/controller.ts` | refused | K1.1 | The closed `DefinitionKind` controller port is replaced by the Driver boundary; it is not carried forward in this shape. |\n";
    const badDeferredTable =
      "| Id | Current path | Disposition | Owner | Why it is assigned there |\n|---|---|---|---|---|\n| DX-1 | `packages/core/src/util/json.ts` | migratable | K1.1 | stale contradictory further table |\n";
    const furtherDeferred = /Deferred section contains a further table; this row is outside the governed table: (Id \| Current path|DX-1 \| `packages\/core\/src\/util\/json\.ts`)/;

    test("a next-heading line nested in a bullet item cannot truncate the section", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion = `${lastDxRow}\n- note\n\n  ## What this packet does not establish\n\n${badDeferredTable}`;
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[lastDxRow, insertion]])),
        policy,
        workspace,
      );
      assert.equal(disagreements.length, 2, `the nested heading must not delimit and the later table must surface exactly; got: ${JSON.stringify(disagreements)}`);
      assert.ok(
        disagreements.every((message) => furtherDeferred.test(message)),
        `both rows of the later table must surface; got: ${JSON.stringify(disagreements)}`,
      );
    });

    test("an ordered-list equivalent cannot truncate the section", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion = `${lastDxRow}\n1. note\n\n   ## What this packet does not establish\n\n${badDeferredTable}`;
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[lastDxRow, insertion]])),
        policy,
        workspace,
      );
      assert.equal(disagreements.length, 2, `got: ${JSON.stringify(disagreements)}`);
      assert.ok(disagreements.every((message) => furtherDeferred.test(message)), `got: ${JSON.stringify(disagreements)}`);
    });

    test("a wider ordered marker derives a deeper continuation indent", async () => {
      // `10. ` opens content at column 4 while `- ` opens at column 2: the same three-space
      // table is top-level after the wide marker (reported) but list content after the
      // bullet (ignored), and a three-space heading ends the wide item normally (green).
      // Indentation comes from GFM marker rules, not a hard-coded two spaces.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const wideTable =
        "   | Id | Current path | Disposition | Owner | Why |\n   |---|---|---|---|---|\n   | DX-1 | `packages/core/src/util/json.ts` | migratable | K1.1 | stale |\n";
      const wide = mutate(real, [[lastDxRow, `${lastDxRow}\n10. note\n\n${wideTable}`]]);
      assert.ok(
        inventoryDisagreements(parseInventory(wide), policy, workspace).some((message) =>
          furtherDeferred.test(message),
        ),
        "a three-space table escapes the wide item and is reported",
      );
      const bullet = mutate(real, [[lastDxRow, `${lastDxRow}\n- note\n\n${wideTable}`]]);
      assert.deepEqual(
        inventoryDisagreements(parseInventory(bullet), policy, workspace),
        [],
        "the same table stays list content after the bullet and is ignored",
      );
      const topLevel = mutate(real, [[lastDxRow, `${lastDxRow}\n10. note\n\n   ## What this packet does not establish\n\n${badDeferredTable}`]]);
      assert.deepEqual(
        inventoryDisagreements(parseInventory(topLevel), policy, workspace),
        [],
        "three-space heading ends the wide item, terminates normally, and leaves the later table outside",
      );
    });

    test("a heading nested two containers deep cannot truncate the section", async () => {
      // The inner item (`  - inner`, content at column 4) closes at the dedented heading,
      // which remains content of the outer item (content at column 2): the section stays
      // open through the pop and the later table still surfaces. (Doubly nested headings at
      // four-plus spaces are indented code in every implementation, so the depth is
      // exercised through the pop rather than the indent.)
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion = `${lastDxRow}\n- outer\n\n  - inner\n\n  ## What this packet does not establish\n\n${badDeferredTable}`;
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[lastDxRow, insertion]])),
        policy,
        workspace,
      );
      assert.equal(disagreements.length, 2, `got: ${JSON.stringify(disagreements)}`);
      assert.ok(disagreements.every((message) => furtherDeferred.test(message)), `got: ${JSON.stringify(disagreements)}`);
    });

    test("a list-contained heading equal to the current title stays inside", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion = `${lastDxRow}\n- note\n\n  ## Deferred extraction and bridge owners\n\n${badDeferredTable}`;
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[lastDxRow, insertion]])),
        policy,
        workspace,
      );
      assert.ok(
        disagreements.some((message) => furtherDeferred.test(message)),
        `a repeated current heading inside the list must still report its table; got: ${JSON.stringify(disagreements)}`,
      );
    });

    test("a genuine top-level exact next heading after the container still terminates", async () => {
      // The container must not swallow the real delimiter: with no contradictory table, the
      // section ends normally and stays green; the Zones twin below locks the count.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion = `${lastDxRow}\n- note\n\n  ## What this packet does not establish\n`;
      assert.deepEqual(
        inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, insertion]])), policy, workspace),
        [],
        "a nested heading plus no later table stays green and the real heading still delimits",
      );
    });

    test("a normal list with no dangerous heading is supported behavior", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion = `${lastDxRow}\n- note\n\n  continued prose inside the item\n`;
      assert.deepEqual(
        inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, insertion]])), policy, workspace),
        [],
        "ordinary list content without headings or tables changes nothing",
      );
      // Dedented prose after the blank closes the container (no lazy continuation is
      // possible), so a later top-level heading still terminates normally and green.
      const closed = `${lastDxRow}\n- note\n\nclosed prose ends the item\n\n  ## What this packet does not establish\n\n${badDeferredTable}`;
      assert.deepEqual(
        inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, closed]])), policy, workspace),
        [],
        "prose after a blank pops the container, so the heading delimits",
      );
    });

    test("a task-list item is a list container too", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion = `${lastDxRow}\n- [ ] note\n\n  ## What this packet does not establish\n\n${badDeferredTable}`;
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[lastDxRow, insertion]])),
        policy,
        workspace,
      );
      assert.ok(
        disagreements.some((message) => furtherDeferred.test(message)),
        `got: ${JSON.stringify(disagreements)}`,
      );
    });

    test("a thematic break does not open a list container", async () => {
      // `* * *` is a break (GFM precedence over lists), so the following indented heading is
      // top-level and terminates normally, leaving the later table outside and green.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion = `${lastDxRow}\n* * *\n\n  ## What this packet does not establish\n\n${badDeferredTable}`;
      assert.deepEqual(
        inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, insertion]])), policy, workspace),
        [],
        "the break is not a marker, so the heading delimits and the table is outside",
      );
    });

    test("restricted markers after prose stay prose", async () => {
      // Empty items and non-1 ordered starts cannot interrupt a paragraph: `2. item` and a
      // lone `*` after prose are text, so the following indented heading is top-level and the
      // section ends normally (green). Ten digits never form a marker at all.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      for (const marker of ["2. item", "*", "1234567890. item"]) {
        const insertion = `${lastDxRow}\nSome prose about deferrals.\n${marker}\n\n  ## What this packet does not establish\n\n${badDeferredTable}`;
        assert.deepEqual(
          inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, insertion]])), policy, workspace),
          [],
          `${JSON.stringify(marker)} after prose is not a container, so the heading delimits`,
        );
      }
    });

    test("a dash line that is really a second item keeps the container open", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion = `${lastDxRow}\n- first\n- second\n\n  ## What this packet does not establish\n\n${badDeferredTable}`;
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[lastDxRow, insertion]])),
        policy,
        workspace,
      );
      assert.ok(
        disagreements.some((message) => furtherDeferred.test(message)),
        `got: ${JSON.stringify(disagreements)}`,
      );
    });

    test("the container boundary holds for the Zones relation as well", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const lastZoneRow =
        "| `host-sdk` | `packages/sdk/src` | Application bootstrap and host composition. |\n";
      const badZonesTable =
        "| Zone id | Roots | Owner and status |\n|---|---|---|\n| `target-kernel` | `packages/core/src` | stale contradictory further table |\n";
      const insertion = `${lastZoneRow}\n- note\n\n  ## Current cross-boundary dependencies\n\n${badZonesTable}`;
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[lastZoneRow, insertion]])),
        policy,
        workspace,
      );
      assert.equal(disagreements.length, 2, `the nested heading must not delimit and termination must hold exactly; got: ${JSON.stringify(disagreements)}`);
    });
  });

  describe("complete type-7 tags (K10-R9-02)", () => {
    // GFM type-7 blocks start from a complete open tag (any name except script/style/pre) or a
    // complete closing tag alone on the line. Quoted attribute values may contain `<`/`>` when
    // those are not the quote delimiter, closing tags carry no attributes, and type 7 cannot
    // interrupt a paragraph. The previous recognizer rejected any `<`/`>` in attributes, always
    // allowed attributes on closing tags, and ignored the paragraph rule.
    const lastDxRow =
      "| DX-12 | `packages/core/src/ports/controller.ts` | refused | K1.1 | The closed `DefinitionKind` controller port is replaced by the Driver boundary; it is not carried forward in this shape. |\n";
    const badDeferredTable =
      "| Id | Current path | Disposition | Owner | Why it is assigned there |\n|---|---|---|---|---|\n| DX-1 | `packages/core/src/util/json.ts` | migratable | K1.1 | stale contradictory further table |\n";
    const furtherDeferred = /Deferred section contains a further table; this row is outside the governed table: (Id \| Current path|DX-1 \| `packages\/core\/src\/util\/json\.ts`)/;

    test("a double-quoted value containing > still opens the raw block", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion = `${lastDxRow}\n<Warning title="a>b">\n## What this packet does not establish\n\n${badDeferredTable}`;
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[lastDxRow, insertion]])),
        policy,
        workspace,
      );
      assert.equal(disagreements.length, 2, `the heading is raw block content and the table must surface exactly; got: ${JSON.stringify(disagreements)}`);
      assert.ok(disagreements.every((message) => furtherDeferred.test(message)), `got: ${JSON.stringify(disagreements)}`);
    });

    test("a single-quoted value containing < still opens the raw block", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion = `${lastDxRow}\n<Warning title='a<b'>\n## What this packet does not establish\n\n${badDeferredTable}`;
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[lastDxRow, insertion]])),
        policy,
        workspace,
      );
      assert.equal(disagreements.length, 2, `got: ${JSON.stringify(disagreements)}`);
      assert.ok(disagreements.every((message) => furtherDeferred.test(message)), `got: ${JSON.stringify(disagreements)}`);
    });

    test("ordinary and unquoted attributes still open the raw block", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      for (const opener of ['<Warning foo=bar baz="qux">', '<Warning data-note>', "<i class='foo'>"]) {
        const insertion = `${lastDxRow}\n${opener}\n## What this packet does not establish\n\n${badDeferredTable}`;
        const disagreements = inventoryDisagreements(
          parseInventory(mutate(real, [[lastDxRow, insertion]])),
          policy,
          workspace,
        );
        assert.ok(
          disagreements.some((message) => furtherDeferred.test(message)),
          `${opener} must open a raw block; got: ${JSON.stringify(disagreements)}`,
        );
      }
    });

    test("a complete closing tag opens the raw block but carries no attributes", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const openInsertion = `${lastDxRow}\n</Warning>\n## What this packet does not establish\n\n${badDeferredTable}`;
      const openDisagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[lastDxRow, openInsertion]])),
        policy,
        workspace,
      );
      assert.ok(
        openDisagreements.some((message) => furtherDeferred.test(message)),
        `a bare closing tag is a valid opener; got: ${JSON.stringify(openDisagreements)}`,
      );
      const attrInsertion = `${lastDxRow}\n</Warning title="x">\n## What this packet does not establish\n\n${badDeferredTable}`;
      assert.deepEqual(
        inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, attrInsertion]])), policy, workspace),
        [],
        "attributes on a closing tag are malformed, so the heading delimits and the table is outside",
      );
    });

    test("malformed near-tags remain ordinary Markdown", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      for (const opener of ['<Warning title="a>b>', "<3Warning>", "<Warning foo=a>b>", "<Warning foo=bar'baz'>"]) {
        const insertion = `${lastDxRow}\n${opener}\n## What this packet does not establish\n\n${badDeferredTable}`;
        assert.deepEqual(
          inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, insertion]])), policy, workspace),
          [],
          `${opener} is not a complete tag, so the heading delimits and the table is outside`,
        );
      }
    });

    test("type 7 cannot interrupt a paragraph", async () => {
      // The tag right after prose (no blank) stays inline text, so the following exact heading
      // is real, terminates normally, and leaves the later table outside and green.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion = `${lastDxRow}\nSome prose about deferrals.\n<Warning title="x">\n## What this packet does not establish\n\n${badDeferredTable}`;
      assert.deepEqual(
        inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, insertion]])), policy, workspace),
        [],
        "a mid-paragraph tag opens no block, so the heading delimits",
      );
    });

    test("a tag after a table row still opens the raw block", async () => {
      // Table rows are not paragraph text: with no blank after the governed body row, the tag
      // still starts its block (fail-loud direction), hiding its heading but not the table.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion = `${lastDxRow}\n<Warning title="x">\n## What this packet does not establish\n\n${badDeferredTable}`;
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[lastDxRow, insertion]])),
        policy,
        workspace,
      );
      assert.ok(
        disagreements.some((message) => furtherDeferred.test(message)),
        `got: ${JSON.stringify(disagreements)}`,
      );
    });

    test("type-4 declarations use the uppercase-ASCII rule", async () => {
      // A single-line declaration opens and closes on the same line (GFM: a block whose
      // first line meets both conditions contains just that line), so the hiding case needs
      // a multi-line declaration whose first line carries no `>`.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const upperInsertion = `${lastDxRow}\n<!DOCTYPE greeting [\n## What this packet does not establish\n]>\n\n${badDeferredTable}`;
      assert.ok(
        inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, upperInsertion]])), policy, workspace).some((message) =>
          furtherDeferred.test(message),
        ),
        "an uppercase declaration opens a raw block",
      );
      const lowerInsertion = `${lastDxRow}\n<!doctype greeting [\n## What this packet does not establish\n]>\n\n${badDeferredTable}`;
      assert.deepEqual(
        inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, lowerInsertion]])), policy, workspace),
        [],
        "a lowercase declaration is ordinary prose, so the heading delimits",
      );
      const singleInsertion = `${lastDxRow}\n<!DOCTYPE html>\n## What this packet does not establish\n\n${badDeferredTable}`;
      assert.deepEqual(
        inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, singleInsertion]])), policy, workspace),
        [],
        "a single-line declaration closes on itself, so the next heading is ordinary",
      );
    });

    test("type-6 starts match the declared tag boundary", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const openInsertion = `${lastDxRow}\n<Div class="x">\n## What this packet does not establish\n\n${badDeferredTable}`;
      assert.ok(
        inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, openInsertion]])), policy, workspace).some((message) =>
          furtherDeferred.test(message),
        ),
        "mixed-case block tag with attributes opens a raw block",
      );
      const customInsertion = `${lastDxRow}\n<divfoo>\n## What this packet does not establish\n\n${badDeferredTable}`;
      assert.ok(
        inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, customInsertion]])), policy, workspace).some((message) =>
          furtherDeferred.test(message),
        ),
        "a longer name is still a valid complete custom tag, so type 7 hides the heading",
      );
      const trailingInsertion = `${lastDxRow}\n<divfoo> trailing prose\n## What this packet does not establish\n\n${badDeferredTable}`;
      assert.deepEqual(
        inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, trailingInsertion]])), policy, workspace),
        [],
        "a tag with trailing prose is not alone on its line, so the heading delimits",
      );
    });

    test("textarea follows published GFM: type 7, not type 1 (K10-R10-03)", async () => {
      // Under published GFM 0.29 a complete `<textarea>` line is a type-7 opener, so its block
      // ends at the blank line right after the opener: the first heading is real, terminates
      // Deferred, and leaves the planted table outside and green. Without that blank the raw
      // block continues and the table still surfaces. `script`/`pre`/`style` stay type 1.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const blankInsertion = `${lastDxRow}\n<textarea>\n\n## What this packet does not establish\n</textarea>\n\n${badDeferredTable}`;
      assert.deepEqual(
        inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, blankInsertion]])), policy, workspace),
        [],
        "type 7 ends at the blank, so the heading delimits and the table is outside",
      );
      const rawInsertion = `${lastDxRow}\n<textarea>\n## What this packet does not establish\n</textarea>\n\n${badDeferredTable}`;
      assert.ok(
        inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, rawInsertion]])), policy, workspace).some((message) =>
          furtherDeferred.test(message),
        ),
        "with no blank the raw block continues and the table surfaces",
      );
      const styleInsertion = `${lastDxRow}\n<style>\n## What this packet does not establish\n</style>\n\n${badDeferredTable}`;
      assert.ok(
        inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, styleInsertion]])), policy, workspace).some((message) =>
          furtherDeferred.test(message),
        ),
        "style remains type 1",
      );
    });

    test("search follows published GFM: no type-6 start (K10-R10-03)", async () => {
      // The published 0.29 type-6 list has no `search`: with trailing prose the line is
      // ordinary Markdown and the heading delimits, while a complete `<search>` line alone
      // still opens type 7 through the tag recognizer.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const trailingInsertion = `${lastDxRow}\n<search> trailing prose\n## What this packet does not establish\n\n${badDeferredTable}`;
      assert.deepEqual(
        inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, trailingInsertion]])), policy, workspace),
        [],
        "search with trailing prose is ordinary, so the heading delimits",
      );
      const aloneInsertion = `${lastDxRow}\n<search>\n## What this packet does not establish\n\n${badDeferredTable}`;
      assert.ok(
        inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, aloneInsertion]])), policy, workspace).some((message) =>
          furtherDeferred.test(message),
        ),
        "a complete search line still opens a type-7 raw block",
      );
    });
  });

  test("CRLF line endings do not reopen the escapes (K1.0-SELF-20)", async () => {
      // Self-found while auditing block boundaries: a trailing CR made a complete type-7 tag
      // fail its alone-on-the-line check, so the tag became an unreadable body row while the
      // nested heading truncated the section and hid the later table. Block-boundary
      // whitespace now tolerates CR; both the tag and the bullet shapes stay loud under CRLF.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const lastDxRow =
        "| DX-12 | `packages/core/src/ports/controller.ts` | refused | K1.1 | The closed `DefinitionKind` controller port is replaced by the Driver boundary; it is not carried forward in this shape. |\n";
      const badDeferredTable =
        "| Id | Current path | Disposition | Owner | Why it is assigned there |\n|---|---|---|---|---|\n| DX-1 | `packages/core/src/util/json.ts` | migratable | K1.1 | stale contradictory further table |\n";
      const crlf = (value: string): string => value.replace(/\n/g, "\r\n");
      const furtherDeferred = /Deferred section contains a further table; this row is outside the governed table: (Id \| Current path|DX-1 \| `packages\/core\/src\/util\/json\.ts`)/;
      for (const insertion of [
        crlf(`${lastDxRow}\n<Warning title="a>b">\n## What this packet does not establish\n\n${badDeferredTable}`),
        crlf(`${lastDxRow}\n- note\n\n  ## What this packet does not establish\n\n${badDeferredTable}`),
      ]) {
        const disagreements = inventoryDisagreements(
          parseInventory(mutate(real, [[lastDxRow, insertion]])),
          policy,
          workspace,
        );
        assert.ok(
          disagreements.some((message) => furtherDeferred.test(message)),
          `CRLF must not hide the later table; got: ${JSON.stringify(disagreements)}`,
        );
      }
    });

  describe("GFM line endings (K10-R13-01)", () => {
    // GFM §2.1: a line ending is LF, lone CR, or CRLF. Tokenization happens before
    // any per-line predicate, so recoding a document's line endings changes no
    // section, raw-block-lifetime or table boundary. Every control below drives the
    // production parser; LF twins pin the expected outcome and CR/CRLF/mixed twins
    // must agree with them exactly.
    const lastDxRow =
      "| DX-12 | `packages/core/src/ports/controller.ts` | refused | K1.1 | The closed `DefinitionKind` controller port is replaced by the Driver boundary; it is not carried forward in this shape. |\n";
    const badDeferredTable =
      "| Id | Current path | Disposition | Owner | Why it is assigned there |\n|---|---|---|---|---|\n| DX-1 | `packages/core/src/util/json.ts` | migratable | K1.1 | planted row |\n";
    const furtherDeferred = /Deferred section contains a further table; this row is outside the governed table: (Id \| Current path|DX-1 \| `packages\/core\/src\/util\/json\.ts`)/;
    const toCrOnly = (value: string): string => value.replace(/\r?\n/g, "\r");
    const toCrlf = (value: string): string => value.replace(/\r?\n/g, "\r\n");
    const toMixed = (value: string): string => {
      // Line-wise: each original LF becomes exactly one cycled ending attached to its
      // preceding line. A "\r" ending is only used when the next line is non-blank:
      // emitting "\r" before a blank line's own "\n" would fuse into one CRLF and
      // delete a GFM line, while LF before any next line can never fuse.
      const endings = ["\n", "\r\n", "\r"];
      const parts = value.split("\n");
      return parts.map((line, i) => {
        if (i >= parts.length - 1) return line;
        if (parts[i + 1] === "") return `${line}\n`;
        return `${line}${endings[i % endings.length]!}`;
      }).join("");
    };

    test("the whole real inventory recoded LF → lone CR stays baseline-green", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      assert.deepEqual(
        inventoryDisagreements(parseInventory(toCrOnly(real)), policy, workspace),
        [],
        "lone CR is a line ending, so the CR-only inventory is the same lines, headings, tables and relations",
      );
    });

    test("the whole real inventory recoded LF → CRLF stays baseline-green", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      assert.deepEqual(
        inventoryDisagreements(parseInventory(toCrlf(real)), policy, workspace),
        [],
        "CRLF is one line ending, so the recoded inventory is unchanged",
      );
    });

    test("mixed LF/CRLF/lone-CR preserves governed section and table boundaries", async () => {
      // A contradictory further table must surface identically under mixed endings.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion =
        `${lastDxRow}\n<div>\n## What this packet does not establish\n\n${badDeferredTable}\n## What this packet does not establish\n`;
      const expected = inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, insertion]])), policy, workspace);
      assert.ok(
        expected.some((message) => furtherDeferred.test(message)),
        `the LF twin must catch the planted table; got: ${JSON.stringify(expected)}`,
      );
      assert.deepEqual(
        inventoryDisagreements(parseInventory(toMixed(mutate(real, [[lastDxRow, insertion]]))), policy, workspace),
        expected,
        "mixed endings must preserve the exact same section and table boundaries",
      );
    });

    test("physical-line primitives: CR, CRLF and LF all delimit", async () => {
      for (const source of ["a\rb", "a\r\nb", "a\nb"]) {
        const seen = scanTransitions(source);
        assert.equal(seen.length, 2, `${JSON.stringify(source)} is two GFM lines`);
        assert.deepEqual(seen.map((t) => t.text), ["a", "b"]);
      }
    });

    test("a lone-CR-separated exact next heading terminates its section", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion =
        `${lastDxRow}\n<div>\n## What this packet does not establish\n\n${badDeferredTable}\n## What this packet does not establish\n`;
      const lfDoc = mutate(real, [[lastDxRow, insertion]]);
      const expected = inventoryDisagreements(parseInventory(lfDoc), policy, workspace);
      assert.ok(
        expected.some((message) => furtherDeferred.test(message)),
        `the LF twin must catch the planted table; got: ${JSON.stringify(expected)}`,
      );
      assert.deepEqual(
        inventoryDisagreements(parseInventory(toCrOnly(lfDoc)), policy, workspace),
        expected,
        "the CR-only twin terminates the section identically",
      );
    });

    test("lone-CR raw-block lifetime matches the LF twin (type-6 and type-7)", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      for (const opener of ["<div>", "<Warning>"]) {
        const lfDoc = mutate(real, [[
          lastDxRow,
          `${lastDxRow}\n${opener}\n## What this packet does not establish\n\n${badDeferredTable}\n## What this packet does not establish\n`,
        ]]);
        const expected = inventoryDisagreements(parseInventory(lfDoc), policy, workspace);
        assert.ok(
          expected.some((message) => furtherDeferred.test(message)),
          `the LF twin of ${opener} must hide the heading; got: ${JSON.stringify(expected)}`,
        );
        assert.deepEqual(
          inventoryDisagreements(parseInventory(toCrOnly(lfDoc)), policy, workspace),
          expected,
          `the CR-only twin of ${opener} must keep the heading raw across the same lifetime`,
        );
      }
    });

    test("CR-only table header/delimiter/body rows remain distinct physical rows", async () => {
      // If CR did not delimit, header, delimiter and body would merge into one scanner
      // line and no table — governed or further — could be discovered here.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const crTable =
        `| Id | Current path | Disposition | Owner | Why it is assigned there |\r|---|---|---|---|---|\r| DX-1 | \`packages/core/src/util/json.ts\` | migratable | K1.1 | planted row |\r`;
      const insertion = `${lastDxRow}\n<div>\n## What this packet does not establish\n\n${crTable}\n## What this packet does not establish\n`;
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[lastDxRow, insertion]])),
        policy,
        workspace,
      );
      assert.ok(
        disagreements.some((message) => furtherDeferred.test(message)),
        `CR-separated rows must still form a further table; got: ${JSON.stringify(disagreements)}`,
      );
    });

    test("final line with and without a trailing line ending behaves intentionally", async () => {
      assert.deepEqual(scanTransitions("a").map((t) => t.text), ["a"], "no trailing ending yields no final empty line");
      assert.deepEqual(scanTransitions("a\n").map((t) => t.text), ["a", ""], "trailing LF yields one final empty line");
      assert.deepEqual(scanTransitions("a\r").map((t) => t.text), ["a", ""], "trailing lone CR yields one final empty line");
      assert.deepEqual(scanTransitions("a\r\n").map((t) => t.text), ["a", ""], "trailing CRLF yields one final empty line");
      assert.deepEqual(scanTransitions("").map((t) => t.text), [""], "the empty document is one empty line");
      // The governed tables parse identically whether or not the document ends with LF.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      assert.deepEqual(
        inventoryDisagreements(parseInventory(real.replace(/\n$/, "")), policy, workspace),
        [],
        "dropping the final LF changes no governed relation",
      );
    });
  });

  describe("GFM ATX heading identity and structural whitespace (K10-R14-01)", () => {
    // GFM 0.29 §4.2 with the §2.2/§2.1 classes. An ATX opening sequence is followed by
    // SPACE or TAB; the heading's raw content begins at the first character that is
    // neither; the content is right-stripped by the §2.1 whitespace class; and an
    // optional closing `#` run is dropped only when §2.1 whitespace — or the separator
    // itself — precedes it. Unicode whitespace is heading *content* at every position:
    // NBSP U+00A0, U+FEFF, U+3000 and U+2009 are not block-structure whitespace and
    // never pad a heading's identity, and U+000B/U+000C pad the trailing side only.
    //
    // `String.prototype.trim()` erases all of them, so a level-2 heading whose real
    // content is not the configured title collapsed onto it, falsely terminated the
    // governed Deferred section, and hid a planted contradictory table from C4's total,
    // fail-closed accounting. Each RED case below places a *non-exact* heading before a
    // well-formed contradictory table and requires that table to surface; each GREEN
    // case keeps a genuinely exact heading and requires the section to terminate
    // normally, so the correction is a character-class reconstruction in both directions
    // rather than a blacklist of one literal counterexample. Non-ASCII and control
    // characters are written as escapes so the source stays printable; the parser sees
    // the real characters.
    const NBSP = "\u00A0";
    const VT = "\u000B";
    const FF = "\u000C";
    const IDEOGRAPHIC = "\u3000";
    const ZWNBSP = "\uFEFF";
    const THIN = "\u2009";
    const TITLE = "What this packet does not establish";
    const lastDxRow =
      "| DX-12 | `packages/core/src/ports/controller.ts` | refused | K1.1 | The closed `DefinitionKind` controller port is replaced by the Driver boundary; it is not carried forward in this shape. |\n";
    const badDeferredTable =
      "| Id | Current path | Disposition | Owner | Why it is assigned there |\n|---|---|---|---|---|\n| DX-1 | `packages/core/src/util/json.ts` | migratable | K1.1 | planted contradictory row |\n";
    const furtherDeferred = /Deferred section contains a further table; this row is outside the governed table: (Id \| Current path|DX-1 \| `packages\/core\/src\/util\/json\.ts`)/;
    // The candidate heading sits after a blank line, so the governed table is already
    // closed and nothing but the heading's own identity decides where the section ends.
    const shape = (headingLine: string): string =>
      `${lastDxRow}\n${headingLine}\n\n${badDeferredTable}\n## ${TITLE}\n`;

    test("a heading whose content carries Unicode whitespace is not the exact title", async () => {
      // The reviewed counterexample (K10-R14-01) plus the same substitution at the other
      // content positions and for three further Unicode-only whitespace characters.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      for (const headingLine of [
        `## ${NBSP}${TITLE}`,
        `## ${TITLE}${NBSP}`,
        `## ${TITLE} ##${NBSP}`,
        `## ${IDEOGRAPHIC}${TITLE}`,
        `## ${ZWNBSP}${TITLE}`,
        `## ${TITLE}${THIN}`,
      ]) {
        const disagreements = inventoryDisagreements(
          parseInventory(mutate(real, [[lastDxRow, shape(headingLine)]])),
          policy,
          workspace,
        );
        assert.ok(
          disagreements.some((message) => furtherDeferred.test(message)),
          `${JSON.stringify(headingLine)} is not the exact title, so the section runs on and the planted table must surface; got: ${JSON.stringify(disagreements)}`,
        );
      }
    });

    test("leading vertical tab and form feed are heading content, not padding", async () => {
      // §2.2 block-structure whitespace is SPACE and TAB. VT and FF belong to the §2.1
      // whitespace class, which governs the *trailing* strip, not where content starts.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      for (const headingLine of [`## ${VT}${TITLE}`, `## ${FF}${TITLE}`]) {
        const disagreements = inventoryDisagreements(
          parseInventory(mutate(real, [[lastDxRow, shape(headingLine)]])),
          policy,
          workspace,
        );
        assert.ok(
          disagreements.some((message) => furtherDeferred.test(message)),
          `${JSON.stringify(headingLine)} keeps its leading character as content; got: ${JSON.stringify(disagreements)}`,
        );
      }
    });

    test("the opening sequence needs SPACE or TAB, never a Unicode space", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      for (const headingLine of [`##${NBSP}${TITLE}`, `##${VT}${TITLE}`, `##${TITLE}`]) {
        const disagreements = inventoryDisagreements(
          parseInventory(mutate(real, [[lastDxRow, shape(headingLine)]])),
          policy,
          workspace,
        );
        assert.ok(
          disagreements.some((message) => furtherDeferred.test(message)),
          `${JSON.stringify(headingLine)} is not an ATX heading at all, so it cannot delimit; got: ${JSON.stringify(disagreements)}`,
        );
      }
    });

    test("a genuine exact next heading still terminates the section", async () => {
      // The twin of every RED case above. These are the forms GFM renders as exactly the
      // configured title, so the planted table lies outside the governed section and
      // nothing is reported. The VT-before-closing-run form additionally distinguishes
      // the correction in the opposite direction: the reviewed `[ \t]+#+` closing rule
      // did not recognise it, so that candidate over-extended the section there.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      for (const headingLine of [
        `## ${TITLE}`,
        `##\t${TITLE}`,
        `##   ${TITLE}   `,
        `## ${TITLE} ##`,
        `## ${TITLE}\t##   `,
        `## ${TITLE}${VT}##`,
        `## ${TITLE}${VT}`,
        `## ${TITLE}${FF}`,
      ]) {
        assert.deepEqual(
          inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, shape(headingLine)]])), policy, workspace),
          [],
          `${JSON.stringify(headingLine)} renders as exactly the title, so it must terminate the section`,
        );
      }
    });

    test("a Unicode-whitespace current heading does not open the governed section", async () => {
      // The other direction of the same identity: if the *start* heading is not exact the
      // section does not exist, and C4 must report a missing governed table rather than
      // reading an empty relation or finding the table anyway.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const current = "## Deferred extraction and bridge owners\n";
      const broken = inventoryDisagreements(
        parseInventory(mutate(real, [[current, `## ${NBSP}Deferred extraction and bridge owners\n`]])),
        policy,
        workspace,
      );
      assert.ok(
        broken.some((message) => message.includes("Deferred table is missing from its section")),
        `an NBSP-bearing current heading opens no section; got: ${JSON.stringify(broken)}`,
      );
      assert.deepEqual(
        inventoryDisagreements(
          parseInventory(mutate(real, [[current, "##\tDeferred extraction and bridge owners\n"]])),
          policy,
          workspace,
        ),
        [],
        "a TAB separator is block-structure whitespace, so the same heading still opens the section",
      );
    });

    test("the whole real inventory re-separated with TAB stays baseline-green", async () => {
      // Document-wide, not one planted line: every governed heading keeps its identity
      // when the separator is the other block-structure whitespace character.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const tabbed = real.replace(/^(#{1,6}) /gm, "$1\t");
      assert.notEqual(tabbed, real, "the re-separation actually changed the document");
      assert.deepEqual(
        inventoryDisagreements(parseInventory(tabbed), policy, workspace),
        [],
        "TAB separators change no section, table or relation",
      );
    });

    test("ATX content primitives follow the grammar, not the host trimmer", async () => {
      // `scanBlocks` is the production annotation the section scan consumes; these pin
      // the three grammar steps directly, including the closing-sequence cases the
      // whole-document controls above cannot isolate.
      const headingOf = (line: string): string | undefined => scanBlocks(line)[0]?.heading?.text;
      const cases: readonly (readonly [string, string | undefined])[] = [
        ["## Title", "Title"],
        ["##\tTitle", "Title"],
        ["##   Title   ", "Title"],
        ["## Title ##", "Title"],
        ["## Title\t##", "Title"],
        ["## Title ##   ", "Title"],
        [`## Title${VT}##`, "Title"],
        [`## Title${VT}`, "Title"],
        [`## Title${FF}`, "Title"],
        // Unicode whitespace is content at every position.
        [`## ${NBSP}Title`, `${NBSP}Title`],
        [`## Title${NBSP}`, `Title${NBSP}`],
        [`## Title ##${NBSP}`, `Title ##${NBSP}`],
        [`## ${IDEOGRAPHIC}Title`, `${IDEOGRAPHIC}Title`],
        [`## ${ZWNBSP}Title`, `${ZWNBSP}Title`],
        [`## Title${THIN}`, `Title${THIN}`],
        // VT/FF are §2.1 whitespace but not block-structure whitespace, so they pad the
        // trailing side only.
        [`## ${VT}Title`, `${VT}Title`],
        [`## ${FF}Title`, `${FF}Title`],
        // Closing sequences the grammar does not recognise stay content.
        ["# foo#", "foo#"],
        ["### foo \\###", "foo \\###"],
        ["### foo ### b", "foo ### b"],
        // A run reaching the start of the content is preceded by the separator.
        ["### ###", ""],
        ["## ###", ""],
        // Not headings at all.
        [`##${NBSP}Title`, undefined],
        [`##${VT}Title`, undefined],
        ["##Title", undefined],
        ["####### Title", undefined],
        ["    ## Title", undefined],
      ];
      for (const [line, expected] of cases) {
        assert.equal(headingOf(line), expected, `${JSON.stringify(line)} heading content`);
      }
    });
  });

  describe("GFM table row and cell whitespace (K1.0-SELF-24)", () => {
    // Self-found while reconstructing the heading path: the tables extension trims cells
    // by the §2.1 whitespace class and takes row content after block-structure
    // indentation. `String.prototype.trim()` erased Unicode whitespace there too, so a
    // cell whose real token is `DX-1<NBSP>` compared equal to `DX-1` and a wrong
    // association survived with the token set unchanged — exactly what C4 forbids. Each
    // case mutates the real document so the reviewed candidate stays silent and the
    // correction reports.
    const NBSP = "\u00A0";
    const IDEOGRAPHIC = "\u3000";

    test("a key cell padded with Unicode whitespace is not the policy's key", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[
          "| DX-1 | `packages/core/src/util/hash.ts`",
          `| DX-1${NBSP} | \`packages/core/src/util/hash.ts\``,
        ]])),
        policy,
        workspace,
      );
      assert.ok(
        disagreements.some((message) => message.includes("Deferred row has no recognisable key")),
        `the padded row carries no DX key; got: ${JSON.stringify(disagreements)}`,
      );
      assert.ok(
        disagreements.includes("deferred row DX-1 is declared by the policy but not documented"),
        `and DX-1 is then missing from the document; got: ${JSON.stringify(disagreements)}`,
      );
    });

    test("a value cell padded with Unicode whitespace disagrees with the policy", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[
          "| `packages/core/src/util/hash.ts` | migratable |",
          `| \`packages/core/src/util/hash.ts\` | ${NBSP}migratable |`,
        ]])),
        policy,
        workspace,
      );
      assert.ok(
        disagreements.some((message) => message.startsWith("deferred row DX-1 is migratable but the document says")),
        `the padded disposition is a different token; got: ${JSON.stringify(disagreements)}`,
      );
    });

    test("a padded publishability cell is unreadable, not a silent yes", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[
          "| `@arrokothi/sdk` | `.` | Yes |",
          `| \`@arrokothi/sdk\` | \`.\` | ${IDEOGRAPHIC}Yes |`,
        ]])),
        policy,
        workspace,
      );
      assert.ok(
        disagreements.some((message) => message.includes("Export row for @arrokothi/sdk is malformed")),
        `an ideographic-space-padded value is not "yes"; got: ${JSON.stringify(disagreements)}`,
      );
    });

    test("a row indented with Unicode whitespace is not a row with an edge pipe", async () => {
      // `<NBSP>| … |` has no leading edge pipe under the grammar: the NBSP is the first
      // cell, the counts shift, and the row carries no recognisable key. Host `trim()`
      // deleted the NBSP and read the line as an ordinary keyed row.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const disagreements = inventoryDisagreements(
        parseInventory(mutate(real, [["| DX-3 | ", `${NBSP}| DX-3 | `]])),
        policy,
        workspace,
      );
      assert.ok(
        disagreements.some((message) => message.includes("Deferred row has no recognisable key")),
        `the NBSP-indented row has no key; got: ${JSON.stringify(disagreements)}`,
      );
      assert.ok(
        disagreements.includes("deferred row DX-3 is declared by the policy but not documented"),
        `and DX-3 is missing; got: ${JSON.stringify(disagreements)}`,
      );
    });

    test("ASCII space and tab padding around cells is still trimmed", async () => {
      // The preservation direction: block-structure whitespace and the §2.1 class keep
      // doing exactly what they did, so no accepted row becomes unreadable.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      assert.deepEqual(
        inventoryDisagreements(
          parseInventory(mutate(real, [[
            "| DX-2 | `packages/core/src/util/json.ts` | migratable |",
            "|  \tDX-2\t  | `packages/core/src/util/json.ts` |\tmigratable\t|",
          ]])),
          policy,
          workspace,
        ),
        [],
        "spaces and tabs around cells are GFM whitespace and are trimmed",
      );
      assert.deepEqual(
        inventoryDisagreements(parseInventory(real.replace(/ \|$/gm, " |  ")), policy, workspace),
        [],
        "trailing ASCII whitespace on every row changes no relation",
      );
    });
  });

  describe("container-owned leaf lifetime (K10-R10-01)", () => {
    // A raw leaf never outlives the list container that owns it: container continuation is
    // resolved before any open fence/HTML state, so a dedented line ends the owning
    // containers first, kills the leaves they own, and is then processed normally at the
    // surviving depth — where a real governed heading is eligible again on that same line.
    // Top-level unclosed leaves keep their accepted run-to-document-end behavior.
    const lastZoneRow =
      "| `host-sdk` | `packages/sdk/src` | Application bootstrap and host composition. |\n";
    const lastDxRow =
      "| DX-12 | `packages/core/src/ports/controller.ts` | refused | K1.1 | The closed `DefinitionKind` controller port is replaced by the Driver boundary; it is not carried forward in this shape. |\n";
    const badDeferredTable =
      "| Id | Current path | Disposition | Owner | Why it is assigned there |\n|---|---|---|---|---|\n| DX-1 | `packages/core/src/util/json.ts` | migratable | K1.1 | stale contradictory further table |\n";
    const furtherDeferred = /Deferred section contains a further table; this row is outside the governed table: (Id \| Current path|DX-1 \| `packages\/core\/src\/util\/json\.ts`)/;

    test("an unclosed list-local fence ends with its item before a real heading", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion = `${lastZoneRow}\n- note\n\n  \`\`\`\n  literal list-local code\n## Current cross-boundary dependencies\n`;
      assert.deepEqual(
        inventoryDisagreements(parseInventory(mutate(real, [[lastZoneRow, insertion]])), policy, workspace),
        [],
        "the fence dies with the item, the heading terminates Zones, and later sections parse normally",
      );
    });

    test("an equivalent ordered and wide-marker list-local fence", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      for (const [marker, fence] of [["1. note", "   ```"], ["10. note", "    ```"]] as const) {
        const insertion = `${lastZoneRow}\n${marker}\n\n${fence}\n  literal list-local code\n## Current cross-boundary dependencies\n`;
        assert.deepEqual(
          inventoryDisagreements(parseInventory(mutate(real, [[lastZoneRow, insertion]])), policy, workspace),
          [],
          `${JSON.stringify(marker)} owns its fence the same way`,
        );
      }
    });

    test("a list-local type-7 block without its blank terminator ends with the item", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion = `${lastDxRow}\n- note\n\n  <Warning>\n## What this packet does not establish\n\n${badDeferredTable}\n## What this packet does not establish\n`;
      assert.deepEqual(
        inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, insertion]])), policy, workspace),
        [],
        "the heading is real, so the planted table is outside Deferred",
      );
    });

    test("a list-local type-1 and comment block without closers end with the item", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      for (const opener of ["  <script>", "  <!--"]) {
        const insertion = `${lastDxRow}\n- note\n\n${opener}\n## What this packet does not establish\n\n${badDeferredTable}\n## What this packet does not establish\n`;
        assert.deepEqual(
          inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, insertion]])), policy, workspace),
          [],
          `${JSON.stringify(opener)} dies with its item, so the heading delimits`,
        );
      }
    });

    test("a properly closed list-local fence stays local and green", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion = `${lastDxRow}\n- note\n\n  \`\`\`\n  code\n  \`\`\`\n## What this packet does not establish\n\n${badDeferredTable}\n## What this packet does not establish\n`;
      assert.deepEqual(
        inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, insertion]])), policy, workspace),
        [],
        "the closed fence never leaks, and the real heading delimits normally",
      );
    });

    test("a nested raw block closes at the correct inner and outer boundary", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      // Dedent to the outer content indent: the inner item and its fence die, but the line
      // stays outer-item content, so the heading cannot delimit and the table surfaces.
      const innerInsertion = `${lastDxRow}\n- outer\n\n  - inner\n\n    \`\`\`\n    code\n  ## What this packet does not establish\n\n${badDeferredTable}\n## What this packet does not establish\n`;
      const innerDisagreements = inventoryDisagreements(
        parseInventory(mutate(real, [[lastDxRow, innerInsertion]])),
        policy,
        workspace,
      );
      assert.equal(innerDisagreements.length, 2, `got: ${JSON.stringify(innerDisagreements)}`);
      assert.ok(innerDisagreements.every((message) => furtherDeferred.test(message)), `got: ${JSON.stringify(innerDisagreements)}`);
      // Dedent to top level: everything dies and the heading delimits, leaving green.
      const outerInsertion = `${lastDxRow}\n- outer\n\n  - inner\n\n    \`\`\`\n    code\n## What this packet does not establish\n\n${badDeferredTable}\n## What this packet does not establish\n`;
      assert.deepEqual(
        inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, outerInsertion]])), policy, workspace),
        [],
        "a fully dedented heading is top-level again",
      );
    });

    test("a real table after the dedented heading stays outside the section", async () => {
      // The deepEqual-green shapes above already prove this for their tables; this pins it
      // once more with the planted row's key absent from the parsed Deferred relation.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const insertion = `${lastDxRow}\n- note\n\n  <Warning>\n## What this packet does not establish\n\n${badDeferredTable}\n## What this packet does not establish\n`;
      const parsed = parseInventory(mutate(real, [[lastDxRow, insertion]]));
      assert.ok(!parsed.deferred.has("DX-1") || parsed.deferred.get("DX-1")?.currentPath === "packages/core/src/util/hash.ts");
    });

    test("a quote-prefixed fence never owns leaf state (blockquote analogue)", async () => {
      // `>` lines never enter fence state: the `>` check precedes leaf transitions, so a quote
      // owns no open leaf by construction and a dedented heading is processed at top level.
      // Both parsers agree here; the control documents why no quote-ownership state exists.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const lastZoneRow2 =
        "| `host-sdk` | `packages/sdk/src` | Application bootstrap and host composition. |\n";
      const badZonesTable =
        "| Zone id | Roots | Owner and status |\n|---|---|---|\n| `target-kernel` | `packages/core/src` | stale contradictory further table |\n";
      const insertion = `${lastZoneRow2}\n> \`\`\`\n> quoted code, never a fence\n## Current cross-boundary dependencies\n\n${badZonesTable}\n## Current cross-boundary dependencies\n`;
      assert.deepEqual(
        inventoryDisagreements(parseInventory(mutate(real, [[lastZoneRow2, insertion]])), policy, workspace),
        [],
        "quoted markers are quotes, so the heading delimits and the later table is outside Zones",
      );
    });
  });

  describe("attribute separators (K10-R10-02)", () => {
    // GFM defines each attribute as whitespace plus a name plus an optional value: with no
    // whitespace after the tag name or a previous value, no new attribute starts and the tag
    // is ordinary text. Optional whitespace around `=` and before `>`/`/>` still parses.
    const lastDxRow =
      "| DX-12 | `packages/core/src/ports/controller.ts` | refused | K1.1 | The closed `DefinitionKind` controller port is replaced by the Driver boundary; it is not carried forward in this shape. |\n";
    const badDeferredTable =
      "| Id | Current path | Disposition | Owner | Why it is assigned there |\n|---|---|---|---|---|\n| DX-1 | `packages/core/src/util/json.ts` | migratable | K1.1 | planted row |\n";
    const furtherDeferred = /Deferred section contains a further table; this row is outside the governed table: (Id \| Current path|DX-1 \| `packages\/core\/src\/util\/json\.ts`)/;
    const greenShape = (opener: string): string =>
      `${lastDxRow}\n${opener}\n## What this packet does not establish\n\n${badDeferredTable}\n## What this packet does not establish\n`;

    test("the exact GFM missing-whitespace form stays ordinary", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const mutated = mutate(real, [[lastDxRow, greenShape("<a href='bar'title=title>")]]);
      assert.deepEqual(
        inventoryDisagreements(parseInventory(mutated), policy, workspace),
        [],
        "no whitespace between attributes means no tag: the heading terminates and the table is outside",
      );
    });

    test("missing whitespace after quoted values stays ordinary", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      for (const opener of ["<Warning a='x'b=title>", '<Warning a="x"b=title>', "<Warning a='x'title>"]) {
        const mutated = mutate(real, [[lastDxRow, greenShape(opener)]]);
        assert.deepEqual(
          inventoryDisagreements(parseInventory(mutated), policy, workspace),
          [],
          `${opener} opens nothing, so the heading delimits`,
        );
      }
    });

    test("valid multi-attribute tags still open raw blocks", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      for (const opener of ['<Warning a="x" b=\'y\' c=z>', "<Warning hidden data-x>", '<Warning a = "x" b =\'y\' >']) {
        const insertion = `${lastDxRow}\n${opener}\n## What this packet does not establish\n\n${badDeferredTable}\n## What this packet does not establish\n`;
        const disagreements = inventoryDisagreements(
          parseInventory(mutate(real, [[lastDxRow, insertion]])),
          policy,
          workspace,
        );
        assert.ok(
          disagreements.some((message) => furtherDeferred.test(message)),
          `${opener} must open a raw block; got: ${JSON.stringify(disagreements)}`,
        );
      }
    });

    test("malformed and valid neighbors stay separated", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      // Empty unquoted value and a name where `=` belongs: ordinary, green.
      for (const opener of ["<Warning a=>", "<Warning =x>"]) {
        const mutated = mutate(real, [[lastDxRow, greenShape(opener)]]);
        assert.deepEqual(
          inventoryDisagreements(parseInventory(mutated), policy, workspace),
          [],
          `${opener} is malformed, so the heading delimits`,
        );
      }
      // Self-closing with valid spacing still opens.
      const selfClosing = `${lastDxRow}\n<Warning a="x" />\n## What this packet does not establish\n\n${badDeferredTable}\n## What this packet does not establish\n`;
      assert.ok(
        inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, selfClosing]])), policy, workspace).some((message) =>
          furtherDeferred.test(message),
        ),
        "a valid self-closing tag opens a raw block",
      );
    });
  });

  describe("type-6 boundary tokens (K10-R11-01)", () => {
    // Published GFM 0.29 §4.6 type 6: a recognized block tag name followed by exactly one of
    // whitespace, `>`, the exact two-character string `/>`, or end of line. A lone `/` is not
    // sufficient and `$` is not a boundary token at all. Each malformed opener below is followed
    // by the exact next governed heading and a contradictory well-formed table after that
    // heading, so GREEN proves section membership (the heading is real and the planted table is
    // outside Deferred) rather than merely testing a regex helper; each valid opener hides that
    // heading until the blank line and manufactures a further-table RED.
    const lastDxRow =
      "| DX-12 | `packages/core/src/ports/controller.ts` | refused | K1.1 | The closed `DefinitionKind` controller port is replaced by the Driver boundary; it is not carried forward in this shape. |\n";
    const badDeferredTable =
      "| Id | Current path | Disposition | Owner | Why it is assigned there |\n|---|---|---|---|---|\n| DX-1 | `packages/core/src/util/json.ts` | migratable | K1.1 | planted row |\n";
    const furtherDeferred = /Deferred section contains a further table; this row is outside the governed table: (Id \| Current path|DX-1 \| `packages\/core\/src\/util\/json\.ts`)/;
    const shape = (opener: string): string =>
      `${lastDxRow}\n${opener}\n## What this packet does not establish\n\n${badDeferredTable}\n## What this packet does not establish\n`;

    test("lone-slash and dollar forms stay ordinary", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      for (const opener of ["<div/ x>", "<div/foo>", "<div/", "<div$foo>"]) {
        const mutated = mutate(real, [[lastDxRow, shape(opener)]]);
        assert.deepEqual(
          inventoryDisagreements(parseInventory(mutated), policy, workspace),
          [],
          `${opener} is ordinary text: the heading terminates Deferred and the planted table is outside`,
        );
      }
    });

    test("valid open boundaries still open the raw block", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      for (const opener of ["<div/>", "<div>", "<div class=x>", "<div"]) {
        const disagreements = inventoryDisagreements(
          parseInventory(mutate(real, [[lastDxRow, shape(opener)]])),
          policy,
          workspace,
        );
        assert.ok(
          disagreements.some((message) => furtherDeferred.test(message)),
          `${opener} must open type 6 and hide the heading; got: ${JSON.stringify(disagreements)}`,
        );
      }
    });

    test("closing tags keep the same valid boundaries; prefixes do not inherit them", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      for (const opener of ["</div>", "</div/>", "</div class=x>", "</div"]) {
        const disagreements = inventoryDisagreements(
          parseInventory(mutate(real, [[lastDxRow, shape(opener)]])),
          policy,
          workspace,
        );
        assert.ok(
          disagreements.some((message) => furtherDeferred.test(message)),
          `${opener} must open type 6 and hide the heading; got: ${JSON.stringify(disagreements)}`,
        );
      }
      // `divfoo` carries the recognized prefix `div` plus an ordinary name character. If the
      // prefix alone sufficed for type 6, the trailing-prose line below would still open a raw
      // block; instead it stays ordinary (GREEN) because after `div` comes `f`, not a boundary,
      // and with trailing prose it is not a complete type-7 tag either.
      assert.deepEqual(
        inventoryDisagreements(
          parseInventory(mutate(real, [[lastDxRow, shape("<divfoo> trailing prose")]])),
          policy,
          workspace,
        ),
        [],
        "<divfoo> trailing prose is ordinary: the div prefix alone does not open type 6",
      );
      // The same name alone is still a complete custom tag, so type 7 hides the heading (RED):
      // the prefix guard narrows type 6 without weakening type 7.
      assert.ok(
        inventoryDisagreements(
          parseInventory(mutate(real, [[lastDxRow, shape("<divfoo>")]])),
          policy,
          workspace,
        ).some((message) => furtherDeferred.test(message)),
        "a complete <divfoo> line still opens type 7",
      );
    });

    test("round-11 textarea/search, attribute-whitespace and owner-depth controls are unchanged", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      // textarea with blank after the opener ends type 7 at the blank (GREEN).
      assert.deepEqual(
        inventoryDisagreements(
          parseInventory(
            mutate(real, [[lastDxRow, shape("<textarea>\n")]]),
          ),
          policy,
          workspace,
        ),
        [],
        "textarea blank split is preserved",
      );
      // search with trailing prose stays ordinary (GREEN).
      assert.deepEqual(
        inventoryDisagreements(
          parseInventory(mutate(real, [[lastDxRow, shape("<search> trailing prose")]])),
          policy,
          workspace,
        ),
        [],
        "search trailing prose is preserved ordinary",
      );
      // Missing whitespace between attributes stays ordinary (GREEN).
      assert.deepEqual(
        inventoryDisagreements(
          parseInventory(mutate(real, [[lastDxRow, shape("<a href='bar'title=title>")]])),
          policy,
          workspace,
        ),
        [],
        "missing attribute whitespace is preserved ordinary",
      );
      // Container-owned leaf lifetime: a list-local type-7 block without its blank terminator
      // still ends with its item (GREEN).
      const containerInsertion = `${lastDxRow}\n- note\n\n  <Warning>\n## What this packet does not establish\n\n${badDeferredTable}\n## What this packet does not establish\n`;
      assert.deepEqual(
        inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, containerInsertion]])), policy, workspace),
        [],
        "container-owned leaf lifetime is preserved",
      );
    });
  });

  describe("GFM whitespace and blank-line lexical classes (K10-R12-01)", () => {
    // GFM §2.1 defines whitespace as exactly SPACE/TAB/LF/VT/FF/CR, keeps Unicode
    // whitespace (e.g. NBSP) separate, and defines blank lines as SPACE/TAB only.
    // Host `\s`/`trim()` conflate all three. Each opener below is followed by the
    // exact next governed heading and a contradictory well-formed table after it
    // (GREEN = heading real, planted table outside; RED = heading raw, planted
    // table caught inside Deferred), except where the shape itself varies the
    // blank-line lifetime. VT/FF/NBSP are written with escapes so the source stays
    // printable; the parser sees the real characters.
    const lastDxRow =
      "| DX-12 | `packages/core/src/ports/controller.ts` | refused | K1.1 | The closed `DefinitionKind` controller port is replaced by the Driver boundary; it is not carried forward in this shape. |\n";
    const badDeferredTable =
      "| Id | Current path | Disposition | Owner | Why it is assigned there |\n|---|---|---|---|---|\n| DX-1 | `packages/core/src/util/json.ts` | migratable | K1.1 | planted row |\n";
    const furtherDeferred = /Deferred section contains a further table; this row is outside the governed table: (Id \| Current path|DX-1 \| `packages\/core\/src\/util\/json\.ts`)/;
    // The opener goes after a blank following the governed table, so the type-7
    // cannot-interrupt-a-paragraph rule can never be the reason a block opens.
    const blankShape = (opener: string): string =>
      `${lastDxRow}\n\n${opener}\n## What this packet does not establish\n\n${badDeferredTable}\n## What this packet does not establish\n`;
    const shape = (opener: string): string =>
      `${lastDxRow}\n${opener}\n## What this packet does not establish\n\n${badDeferredTable}\n## What this packet does not establish\n`;
    const VT = "\u000B";
    const FF = "\u000C";
    const NBSP = "\u00A0";

    test("vertical-tab and form-feed begin attributes in a complete type-7 tag", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      for (const opener of [`<Warning${VT}title="x">`, `<Warning${FF}title="x">`]) {
        const disagreements = inventoryDisagreements(
          parseInventory(mutate(real, [[lastDxRow, blankShape(opener)]])),
          policy,
          workspace,
        );
        assert.ok(
          disagreements.some((message) => furtherDeferred.test(message)),
          `${JSON.stringify(opener)} is a valid complete tag, so the heading is raw and the planted table surfaces; got: ${JSON.stringify(disagreements)}`,
        );
      }
    });

    test("optional and trailing tag whitespace accepts vertical-tab and form-feed", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      for (const opener of [
        `<Warning a${VT}=${VT}"x">`,
        `<Warning a="x"${FF}>`,
        `<Warning> ${VT}`,
      ]) {
        const disagreements = inventoryDisagreements(
          parseInventory(mutate(real, [[lastDxRow, blankShape(opener)]])),
          policy,
          workspace,
        );
        assert.ok(
          disagreements.some((message) => furtherDeferred.test(message)),
          `${JSON.stringify(opener)} carries only GFM whitespace around =/before >/after >, so it still opens type 7; got: ${JSON.stringify(disagreements)}`,
        );
      }
    });

    test("no-break space is not a type-6 or type-1 boundary", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      for (const opener of [`<div${NBSP}x>`, `<script${NBSP}x>`]) {
        const mutated = mutate(real, [[lastDxRow, shape(opener)]]);
        assert.deepEqual(
          inventoryDisagreements(parseInventory(mutated), policy, workspace),
          [],
          `${JSON.stringify(opener)} is ordinary text: NBSP is Unicode whitespace, not a GFM boundary, so the heading delimits`,
        );
      }
    });

    test("a script boundary in NBSP opens no raw block that swallows later sections", async () => {
      // `<script\u00A0x>` is ordinary, so a Zones-placed opener must leave every later
      // governed table exactly where it is. A host-`\s` type-1 opener instead swallows
      // the rest of the document and reports later tables missing.
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      const lastZoneRow =
        "| `host-sdk` | `packages/sdk/src` | Application bootstrap and host composition. |\n";
      const badZonesTable =
        "| Zone id | Roots | Owner and status |\n|---|---|---|\n| `target-kernel` | `packages/core/src` | stale contradictory further table |\n";
      const insertion = `${lastZoneRow}\n<script${NBSP}x>\n## Current cross-boundary dependencies\n\n${badZonesTable}\n## Current cross-boundary dependencies\n`;
      assert.deepEqual(
        inventoryDisagreements(parseInventory(mutate(real, [[lastZoneRow, insertion]])), policy, workspace),
        [],
        "the NBSP script line is ordinary prose: the heading delimits and later sections parse normally",
      );
    });

    test("NBSP-only, vertical-tab-only and form-feed-only lines do not end raw blocks", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      for (const filler of [NBSP, VT, FF]) {
        for (const opener of ["<Warning>", "<div>"]) {
          const insertion = `${lastDxRow}\n\n${opener}\n${filler}\n## What this packet does not establish\n\n${badDeferredTable}\n## What this packet does not establish\n`;
          const disagreements = inventoryDisagreements(
            parseInventory(mutate(real, [[lastDxRow, insertion]])),
            policy,
            workspace,
          );
          assert.ok(
            disagreements.some((message) => furtherDeferred.test(message)),
            `${JSON.stringify(opener)} with a ${JSON.stringify(filler)}-only line keeps the heading raw; got: ${JSON.stringify(disagreements)}`,
          );
        }
      }
    });

    test("space-only and tab-only lines still end raw blocks", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      for (const filler of [" ", "\t"]) {
        for (const opener of ["<Warning>", "<div>"]) {
          const insertion = `${lastDxRow}\n\n${opener}\n${filler}\n## What this packet does not establish\n\n${badDeferredTable}\n## What this packet does not establish\n`;
          assert.deepEqual(
            inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, insertion]])), policy, workspace),
            [],
            `${JSON.stringify(opener)} with a ${JSON.stringify(filler)}-only line ends there, so the heading delimits`,
          );
        }
      }
    });

    test("ordinary ASCII syntax, CRLF tolerance and the round-12 token matrix are unchanged", async () => {
      const real = await realInventory();
      const workspace = await loadWorkspace(REPO_ROOT);
      // ASCII multi-attribute tags still open; missing-whitespace forms stay ordinary.
      assert.ok(
        inventoryDisagreements(
          parseInventory(mutate(real, [[lastDxRow, blankShape('<Warning a="x" b=\'y\'>')]])),
          policy,
          workspace,
        ).some((message) => furtherDeferred.test(message)),
        "ASCII attribute syntax still opens type 7",
      );
      assert.deepEqual(
        inventoryDisagreements(
          parseInventory(mutate(real, [[lastDxRow, blankShape("<a href='bar'title=title>")]])),
          policy,
          workspace,
        ),
        [],
        "missing attribute whitespace stays ordinary",
      );
      // Round-12 token matrix: lone slash/dollar ordinary, valid forms raw.
      for (const opener of ["<div/ x>", "<div/foo>", "<div/", "<div$foo>"]) {
        assert.deepEqual(
          inventoryDisagreements(parseInventory(mutate(real, [[lastDxRow, shape(opener)]])), policy, workspace),
          [],
          `${opener} stays ordinary`,
        );
      }
      for (const opener of ["<div/>", "<div>", "<div class=x>"]) {
        assert.ok(
          inventoryDisagreements(
            parseInventory(mutate(real, [[lastDxRow, shape(opener)]])),
            policy,
            workspace,
          ).some((message) => furtherDeferred.test(message)),
          `${opener} still opens type 6`,
        );
      }
      // A VT attribute next to a CRLF line ending stays a valid complete tag.
      assert.ok(
        inventoryDisagreements(
          parseInventory(mutate(real, [[lastDxRow, blankShape(`<Warning${VT}title="x">\r`)]])),
          policy,
          workspace,
        ).some((message) => furtherDeferred.test(message)),
        "trailing CR does not disturb VT attribute parsing",
      );
    });
  });

  test("the allowed-leaf list is empty, and the inventory says why", async () => {
    const inventory = await readFile(resolve(REPO_ROOT, INVENTORY), "utf8");
    assert.deepEqual(TARGET_KERNEL_RULES.allowedLeaves, [], "K1.0 approves no portable leaf");
    assert.ok(inventory.includes("no approved portable leaf"), "the decision is recorded, not merely implied");
  });
});
