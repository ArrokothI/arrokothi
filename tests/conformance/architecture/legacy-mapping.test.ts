/**
 * K14-6: the legacy conformance mapping (K1.4 design 01 §11; design 02 D01-CHK-09).
 *
 * `tests/conformance/legacy-mapping.json` gives every file of a declared set one disposition and a kept
 * property. This test lists the set at runtime and fails on a missing or an extra file. It also fails when
 * a named owner does not exist: a P or X row's bridge test (an ID in a `test` or `describe` name under
 * `packages/sdk/tests`), an X row's Kernel test file, or an inventory row of `bridge-inventory.test.ts`.
 * Each X file carries its header note.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const REPO = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
interface Entry { readonly disposition: string; readonly property: string; readonly bridge?: readonly string[]; readonly kernel?: readonly string[]; readonly inventory?: readonly string[] }
interface Mapping { readonly scope: readonly string[]; readonly dispositions: Readonly<Record<string, string>>; readonly files: Readonly<Record<string, Entry>> }
const mapping = JSON.parse(readFileSync(join(REPO, "tests/conformance/legacy-mapping.json"), "utf8")) as Mapping;

const walk = (directory: string): string[] => readdirSync(join(REPO, directory)).flatMap(name => {
  const path = `${directory}/${name}`;
  return statSync(join(REPO, path)).isDirectory() ? walk(path) : [path];
});
/** The declared set, listed now. */
function declaredSet(): string[] {
  const files = [
    ...walk("tests/conformance").filter(path => path.endsWith(".ts")),
    ...readdirSync(join(REPO, "packages/sdk/tests")).filter(name => name.endsWith(".ts")).map(name => `packages/sdk/tests/${name}`),
    ...walk("examples").filter(path => path.endsWith(".test.ts")),
    "packages/kernel/tests/binding-surface.test.ts",
  ];
  return [...new Set(files)].sort();
}
/** Every bridge test ID named by a `test(...)` or `describe(...)` call under `packages/sdk/tests`. */
function bridgeTestIds(): Set<string> {
  const ids = new Set<string>();
  for (const name of readdirSync(join(REPO, "packages/sdk/tests")).filter(file => file.endsWith(".test.ts"))) {
    const text = readFileSync(join(REPO, "packages/sdk/tests", name), "utf8");
    for (const call of text.matchAll(/\b(?:test|describe)\(\s*["`]([^"`]*)["`]/g)) {
      for (const id of call[1]!.matchAll(/\bB-[A-Z][A-Z0-9-]*[A-Z0-9]\b/g)) ids.add(id[0]);
    }
  }
  return ids;
}
const inventoryRows = (): Set<string> =>
  new Set([...readFileSync(join(REPO, "packages/sdk/tests/bridge-inventory.test.ts"), "utf8").matchAll(/\{ id: "([A-Z]-[A-Z0-9-]+)"/g)].map(match => match[1]!));
/** A Kernel test path, or a `*` pattern within one directory, and the files it names. */
function kernelFiles(pattern: string): string[] {
  if (!pattern.includes("*")) return statSync(join(REPO, pattern), { throwIfNoEntry: false })?.isFile() ? [pattern] : [];
  const directory = pattern.slice(0, pattern.lastIndexOf("/"));
  const expression = new RegExp(`^${pattern.slice(directory.length + 1).replace(/[.]/g, "\\.").replace(/\*/g, "[^/]*")}$`);
  return readdirSync(join(REPO, directory)).filter(name => expression.test(name)).map(name => `${directory}/${name}`);
}

test("K14-6: the mapping covers exactly the declared set", () => {
  const listed = Object.keys(mapping.files).sort();
  const present = declaredSet();
  assert.deepEqual(present.filter(file => !listed.includes(file)), [], "files with no mapping row");
  assert.deepEqual(listed.filter(file => !present.includes(file)), [], "mapping rows for files outside the set");
  assert.deepEqual(mapping.scope, ["tests/conformance/**/*.ts", "packages/sdk/tests/*.ts", "examples/**/*.test.ts", "packages/kernel/tests/binding-surface.test.ts"]);
});

test("K14-6: every row has a declared disposition and a kept property", () => {
  for (const [file, entry] of Object.entries(mapping.files)) {
    assert.ok(Object.hasOwn(mapping.dispositions, entry.disposition), `${file}: ${entry.disposition}`);
    assert.ok(entry.property.length >= 10, `${file} states its kept property`);
  }
});

test("K14-6: every named owner exists; P rows name a bridge test, X rows an owner and a header note", () => {
  const ids = bridgeTestIds();
  const rows = inventoryRows();
  for (const [file, entry] of Object.entries(mapping.files)) {
    for (const id of entry.bridge ?? []) assert.ok(ids.has(id), `${file}: bridge test ${id} exists`);
    for (const row of entry.inventory ?? []) assert.ok(rows.has(row), `${file}: inventory row ${row} exists`);
    for (const pattern of entry.kernel ?? []) assert.ok(kernelFiles(pattern).length > 0, `${file}: Kernel test ${pattern} exists`);
    if (entry.disposition === "P") assert.ok((entry.bridge ?? []).length > 0, `${file}: a P row names its bridge test`);
    if (entry.disposition === "X") {
      assert.ok((entry.kernel ?? []).length + (entry.bridge ?? []).length + (entry.inventory ?? []).length > 0, `${file}: an X row names the claim's new owner`);
      assert.match(readFileSync(join(REPO, file), "utf8").split("\n", 1)[0]!, /^\/\/ K1\.4 conformance mapping: X\./, `${file} carries the header note`);
    }
  }
});

test("K14-6: the owner checks discriminate", () => {
  assert.equal(bridgeTestIds().has("B-NOT-A-TEST"), false);
  assert.ok(bridgeTestIds().has("B-SCHED") && bridgeTestIds().has("B-CANCEL"));
  assert.deepEqual(kernelFiles("packages/kernel/tests/no-such-file.test.ts"), []);
  assert.ok(kernelFiles("packages/kernel/tests/waits-*.test.ts").length >= 5);
  assert.equal(inventoryRows().has("S-OWNER"), true);
});
