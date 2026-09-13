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
  loadWorkspace,
  walkModuleGraph,
  typeScriptFilesUnder,
  importSpecifiersIn,
  resolveSpecifier,
  type ModuleGraph,
} from "./module-graph.ts";
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
    // public surface updates these deliberately and says so.
    const surfaces = {
      "@arrokothi/core": { count: 227, digest: "0c293a68bb41b1567bd35297a8eb1fa4c795f1d8708ce69ba0df64a4b1fe4880" },
      "@arrokothi/core/execution": { count: 227, digest: "0c293a68bb41b1567bd35297a8eb1fa4c795f1d8708ce69ba0df64a4b1fe4880" },
      "@arrokothi/core/ports": { count: 44, digest: "fe347586965c368ef544d288d3d52088e7f30ed79765401ef9e691f5ac728bed" },
      "@arrokothi/core/reference": { count: 33, digest: "b73995e69da79b2db9fa6dc1213bb75e1fbca9da8f979bb8b44750d3ec19faa2" },
      "@arrokothi/core/testing": { count: 21, digest: "83670c5420b104771a67e3d506db12c0f020cd20640625e86050d08d7be61363" },
    } as const;

    for (const [specifier, expected] of Object.entries(surfaces)) {
      const surface = (await import(specifier)) as Record<string, unknown>;
      const names = Object.keys(surface).sort();
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
  test("every declared zone and zone root appears in the inventory document", async () => {
    const inventory = await readFile(resolve(REPO_ROOT, INVENTORY), "utf8");
    for (const zone of ZONES) {
      assert.ok(inventory.includes(zone.id), `the inventory names zone ${zone.id}`);
      for (const root of zone.roots) {
        assert.ok(inventory.includes(root), `the inventory names zone root ${root}`);
      }
    }
  });

  test("every deferred extraction is assigned an owner in both the policy and the inventory", async () => {
    const inventory = await readFile(resolve(REPO_ROOT, INVENTORY), "utf8");
    assert.ok(DEFERRED_EXTRACTIONS.length > 0, "the inventory of what the zone cannot reach yet is not empty");
    for (const row of DEFERRED_EXTRACTIONS) {
      assert.match(row.owner, /^(K1\.[1-4]|K2\.[1-4]|K3\.[1-4]|K4\.[1-5]|R1\.[1-3]|R2\.[1-3]|K5\.[1-3]|S1\.[1-9])$/);
      assert.ok(inventory.includes(row.id), `the inventory records ${row.id}`);
      assert.ok(inventory.includes(row.currentPath), `the inventory records ${row.currentPath}`);
      assert.ok(inventory.includes(row.owner), `the inventory records owner ${row.owner}`);
    }
  });

  test("the allowed-leaf list is empty, and the inventory says why", async () => {
    const inventory = await readFile(resolve(REPO_ROOT, INVENTORY), "utf8");
    assert.deepEqual(TARGET_KERNEL_RULES.allowedLeaves, [], "K1.0 approves no portable leaf");
    assert.ok(inventory.includes("no approved portable leaf"), "the decision is recorded, not merely implied");
  });
});
