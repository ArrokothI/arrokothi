import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const CORE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CORE_SOURCE = resolve(CORE_ROOT, "src");
const REPOSITORY_ROOT = resolve(CORE_ROOT, "../..");
const FORBIDDEN_SOURCE_ROOTS = [
  "packages/agents",
  "packages/models",
];
const FORBIDDEN_PACKAGES = [
  "@arrokothi/integration-strands",
  "@arrokothi/provider-gemini",
  "@strands-agents/sdk",
  "@google/genai",
];
const IMPORT_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["']([^"']+)["']/g;

test("core source does not import application or implementation packages", async () => {
  const files = (await readdir(CORE_SOURCE, { recursive: true }))
    .filter((path) => path.endsWith(".ts"));
  const violations: string[] = [];

  for (const path of files) {
    const absolutePath = resolve(CORE_SOURCE, path);
    const source = await readFile(absolutePath, "utf8");
    for (const match of source.matchAll(IMPORT_SPECIFIER)) {
      const specifier = match[1]!;
      if (FORBIDDEN_PACKAGES.some((name) => specifier === name || specifier.startsWith(`${name}/`))) {
        violations.push(`${relative(REPOSITORY_ROOT, absolutePath)} imports ${specifier}`);
        continue;
      }
      if (!specifier.startsWith(".")) continue;
      const target = relative(REPOSITORY_ROOT, resolve(dirname(absolutePath), specifier));
      if (FORBIDDEN_SOURCE_ROOTS.some((root) => target === root || target.startsWith(`${root}/`))) {
        violations.push(`${relative(REPOSITORY_ROOT, absolutePath)} imports ${specifier} (${target})`);
      }
    }
  }

  assert.deepEqual(violations, []);
});
