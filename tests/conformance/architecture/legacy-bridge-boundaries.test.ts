/**
 * K1.4 (K14-3): the legacy bridge's structural rules, against the real tree and against fixture
 * repositories that plant one forbidden edge each.
 *
 * The rules are `bridgeBoundaryViolations` and `zoneOf` in `boundary-policy.ts`. Like the K1.0
 * guard, each rule runs twice: over the real tree, where it must find nothing, and over a broken
 * fixture, where it must find exactly the planted edge. A fixture is read back through the same
 * `loadWorkspace` path the real check uses.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadWorkspace, typeScriptFilesUnder, walkModuleGraph } from "./module-graph.ts";
import {
  HOST_SDK, LEGACY_BRIDGE, LEGACY_CORE, SDK_KERNEL_IMPORTERS, TARGET_KERNEL, TARGET_KERNEL_ENTRY_MODULES, TARGET_KERNEL_RULES, ZONES,
  boundaryViolations, bridgeBoundaryViolations, traversableUnder, zoneOf, type BridgeViolation, type Zone,
} from "./boundary-policy.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const MANIFESTS: Record<string, string> = {
  "packages/kernel/package.json": JSON.stringify({ name: "@arrokothi/kernel", private: true, exports: { ".": "./src/index.ts" } }),
  "packages/core/package.json": JSON.stringify({ name: "@arrokothi/core", exports: { ".": "./src/index.ts", "./ports": "./src/ports/index.ts" } }),
  "packages/sdk/package.json": JSON.stringify({ name: "@arrokothi/sdk", private: true, exports: { ".": "./src/index.ts" } }),
};

/** A clean bridge-shaped tree: every control below plants exactly one change in it. */
const CLEAN: Record<string, string> = {
  "packages/kernel/src/index.ts": 'export { ExecutionCoordinator } from "./coordinator.ts";\n',
  "packages/kernel/src/coordinator.ts": "export class ExecutionCoordinator {}\n",
  "packages/kernel/src/state.ts": "export class KernelState {}\n",
  "packages/core/src/index.ts": 'export * from "./runtime/harness.ts";\n',
  "packages/core/src/ports/index.ts": "export type Port = { readonly id: string };\n",
  "packages/core/src/runtime/harness.ts": "export class Harness {}\nexport class HarnessRunawayError extends Error {}\n",
  "packages/sdk/src/index.ts": 'export { createApplication } from "./application.ts";\n',
  "packages/sdk/src/application.ts": 'import type { ExecutionCoordinator } from "@arrokothi/kernel";\nimport type { Harness } from "@arrokothi/core";\nimport { LegacyDriver } from "./legacy-bridge/driver.ts";\nexport type Seen = [ExecutionCoordinator, Harness];\nexport const createApplication = () => new LegacyDriver();\n',
  "packages/sdk/src/host.ts": 'import { ExecutionCoordinator } from "@arrokothi/kernel";\nimport { HarnessRunawayError } from "@arrokothi/core";\nexport const host = [ExecutionCoordinator, HarnessRunawayError];\n',
  "packages/sdk/src/internal/value-capture.ts": "export const captureCanonicalBytes = (value: unknown) => value;\n",
  "packages/sdk/src/legacy-bridge/codec.ts": 'import type { ExecutionCoordinator } from "@arrokothi/kernel";\nimport { captureCanonicalBytes } from "../internal/value-capture.ts";\nexport type Codec = ExecutionCoordinator;\nexport const encode = captureCanonicalBytes;\n',
  "packages/sdk/src/legacy-bridge/driver.ts": 'import { Harness } from "@arrokothi/core";\nimport type { ExecutionCoordinator } from "@arrokothi/kernel";\nexport type Bound = ExecutionCoordinator;\nexport class LegacyDriver { readonly harness = new Harness(); }\n',
};

async function withTree<T>(changes: Record<string, string>, run: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(resolve(tmpdir(), "arrokothi-k1-4-"));
  try {
    for (const [path, contents] of Object.entries({ ...MANIFESTS, ...CLEAN, ...changes })) {
      const absolute = resolve(root, path);
      await mkdir(dirname(absolute), { recursive: true });
      await writeFile(absolute, contents, "utf8");
    }
    return await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/** Every `.ts` file the bridge rules govern: the legacy core and both SDK zones. */
async function governedSources(root: string): Promise<Map<string, string>> {
  const sources = new Map<string, string>();
  for (const zone of [LEGACY_CORE, HOST_SDK, LEGACY_BRIDGE]) {
    for (const directory of zone.roots) {
      for (const file of await typeScriptFilesUnder(root, directory)) sources.set(file, await readFile(resolve(root, file), "utf8"));
    }
  }
  return sources;
}

const violationsIn = (changes: Record<string, string>): Promise<BridgeViolation[]> =>
  withTree(changes, async root => bridgeBoundaryViolations(await loadWorkspace(root), await governedSources(root)));

const only = (violations: readonly BridgeViolation[], rule: BridgeViolation["rule"], from: string): void => {
  assert.equal(violations.length, 1, JSON.stringify(violations));
  assert.equal(violations[0]!.rule, rule);
  assert.equal(violations[0]!.from, from);
};

describe("K1.4 legacy bridge: the real tree", () => {
  test("the bridge rules find nothing, and the scan is not vacuous", async () => {
    const sources = await governedSources(REPO_ROOT);
    assert.ok([...sources.keys()].some(file => file.startsWith("packages/sdk/src/legacy-bridge/")), "the bridge zone has files");
    assert.ok(sources.size > 150, `the scan covered the governed zones (saw ${sources.size} files)`);
    assert.deepEqual(bridgeBoundaryViolations(await loadWorkspace(REPO_ROOT), sources), []);
  });

  test("every governed file is attributed to exactly one zone", async () => {
    const counts = new Map<string, number>();
    for (const zone of ZONES) {
      for (const root of zone.roots) {
        for (const file of await typeScriptFilesUnder(REPO_ROOT, root)) {
          const owner = zoneOf(file);
          assert.ok(owner, `${file} has an owner`);
          counts.set(owner.id, (counts.get(owner.id) ?? 0) + (owner === zone ? 1 : 0));
        }
      }
    }
    assert.ok((counts.get(LEGACY_BRIDGE.id) ?? 0) > 0);
    assert.equal(zoneOf("packages/sdk/src/legacy-bridge/driver.ts")?.id, LEGACY_BRIDGE.id);
    assert.equal(zoneOf("packages/sdk/src/application.ts")?.id, HOST_SDK.id);
    assert.equal(zoneOf("packages/sdk/src/internal/value-capture.ts")?.id, HOST_SDK.id);
    assert.equal(zoneOf("examples/execution-kernel-minimal/app.ts"), undefined);
  });
});

test("check:builder-docs admits the Kernel from exactly the files the quarantine names", async () => {
  const script = await readFile(resolve(REPO_ROOT, "scripts/check-builder-docs.ts"), "utf8");
  const list = /const SDK_KERNEL_IMPORTERS = \[([^\]]*)\];/.exec(script);
  assert.ok(list, "the script declares its admitted list");
  assert.deepEqual([...list[1]!.matchAll(/"([^"]+)"/g)].map(match => match[1]), [...SDK_KERNEL_IMPORTERS]);
});

describe("K1.4 legacy bridge: rejected-edge controls", () => {
  test("the clean fixture is accepted, so the controls below are not trivially red", async () => {
    assert.deepEqual(await violationsIn({}), []);
  });

  test("a bridge file reaching Kernel internals by a relative path is rejected", async () => {
    only(await violationsIn({ "packages/sdk/src/legacy-bridge/codec.ts": 'import { KernelState } from "../../../kernel/src/state.ts";\nexport const s = KernelState;\n' }),
      "K14-3-ROOT", "packages/sdk/src/legacy-bridge/codec.ts");
  });

  test("a type-only import of a Kernel module other than the package root is rejected", async () => {
    only(await violationsIn({ "packages/sdk/src/host.ts": 'import type { ExecutionCoordinator } from "../../kernel/src/coordinator.ts";\nexport type T = ExecutionCoordinator;\n' }),
      "K14-3-ROOT", "packages/sdk/src/host.ts");
  });

  test("a re-export barrel of Kernel source is rejected", async () => {
    only(await violationsIn({ "packages/sdk/src/legacy-bridge/codec.ts": 'export * from "../../../kernel/src/index.ts";\n' }),
      "K14-3-ROOT", "packages/sdk/src/legacy-bridge/codec.ts");
  });

  test("the legacy core importing the Kernel is rejected", async () => {
    only(await violationsIn({ "packages/core/src/runtime/harness.ts": 'import { ExecutionCoordinator } from "@arrokothi/kernel";\nexport class Harness { k = ExecutionCoordinator; }\nexport class HarnessRunawayError extends Error {}\n' }),
      "K14-3-CORE", "packages/core/src/runtime/harness.ts");
  });

  test("the legacy core importing the bridge is rejected", async () => {
    only(await violationsIn({ "packages/core/src/ports/index.ts": 'import type { LegacyDriver } from "../../../sdk/src/legacy-bridge/driver.ts";\nexport type Port = LegacyDriver;\n' }),
      "K14-3-CORE", "packages/core/src/ports/index.ts");
  });

  test("the value wrapper importing the Kernel is rejected", async () => {
    only(await violationsIn({ "packages/sdk/src/internal/value-capture.ts": 'import type { ExecutionCoordinator } from "@arrokothi/kernel";\nexport type T = ExecutionCoordinator;\nexport const captureCanonicalBytes = (value: unknown) => value;\n' }),
      "K14-3-WRAPPER", "packages/sdk/src/internal/value-capture.ts");
  });

  test("the value wrapper importing the bridge is rejected", async () => {
    only(await violationsIn({ "packages/sdk/src/internal/value-capture.ts": 'import { encode } from "../legacy-bridge/codec.ts";\nexport const captureCanonicalBytes = encode;\n' }),
      "K14-3-WRAPPER", "packages/sdk/src/internal/value-capture.ts");
  });

  for (const [name, source] of [
    ["a direct Harness construction in the host", 'import { Harness } from "@arrokothi/core";\nexport const h = new Harness();\n'],
    ["an aliased Harness import", 'import { Harness as Native } from "@arrokothi/core";\nexport const h = new Native();\n'],
    ["a namespace import of the legacy package", 'import * as core from "@arrokothi/core";\nexport const h = new core.Harness();\n'],
    ["a dynamic import of the legacy package", 'export const h = async () => new (await import("@arrokothi/core")).Harness();\n'],
  ] as const) {
    test(`${name} outside the Driver is rejected`, async () => {
      only(await violationsIn({ "packages/sdk/src/application.ts": source }), "K14-3-HARNESS", "packages/sdk/src/application.ts");
    });
  }

  test("the Kernel importing the bridge is rejected by the target-zone guard", async () => {
    await withTree({ "packages/kernel/src/index.ts": 'export { LegacyDriver } from "../../sdk/src/legacy-bridge/driver.ts";\n' }, async root => {
      const graph = await walkModuleGraph(await loadWorkspace(root), TARGET_KERNEL_ENTRY_MODULES, traversableUnder(TARGET_KERNEL_RULES));
      const violations = boundaryViolations(graph, TARGET_KERNEL_RULES);
      assert.equal(violations.length, 1);
      assert.match(violations[0]!.reason, /packages\/sdk\/src\/legacy-bridge\/driver\.ts/);
    });
  });

  test("two zones with an equal-length matching root are refused, not ordered", () => {
    const twin: Zone = { id: "twin", roots: [LEGACY_BRIDGE.roots[0]!] };
    assert.throws(() => zoneOf("packages/sdk/src/legacy-bridge/driver.ts", [...ZONES, twin]), /equal-length roots/);
    assert.equal(zoneOf("packages/kernel/src/state.ts")?.id, TARGET_KERNEL.id);
  });
});
