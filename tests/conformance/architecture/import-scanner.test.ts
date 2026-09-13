/**
 * The import scanner behind every architecture guard.
 *
 * Two obligations pull in opposite directions and are therefore asserted separately:
 *
 * - It must not report prose. The previous raw-text scanner treated any text ending in the
 *   preposition "from" immediately before a quoted term as a bare import, recorded as K0.2-SELF-01
 *   and left open there because changing a live guard under no criterion risked weakening it. K1.0
 *   owns the guards, and the forbidden-edge controls carry import statements as fixture text, so
 *   the defect had to close before those controls could exist.
 * - It must not miss an import. A scanner that is quiet about prose by being quiet about everything
 *   would turn every boundary guard green while enforcing nothing, so every import form the
 *   repository can contain is asserted positively, including the type-only and dynamic forms K1.0's
 *   acceptance names explicitly.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { importSpecifiersIn, maskSource } from "./module-graph.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/** Reads a repository source and returns the specifiers the scanner finds in it. */
async function specifiersInFile(path: string): Promise<string[]> {
  return importSpecifiersIn(await readFile(resolve(REPO_ROOT, path), "utf8"));
}

describe("import scanner: prose is not an import (K0.2-SELF-01)", () => {
  test("a line comment ending in the preposition before a quoted term yields nothing", () => {
    const source = [
      "// must be visibly wrong, not silently indistinguishable from \"nothing matched\".",
      "export const value = 1;",
    ].join("\n");
    assert.deepEqual(importSpecifiersIn(source), []);
  });

  test("a documentation block ending in the preposition before a quoted term yields nothing", () => {
    const source = [
      "/**",
      " * Distinguishes \"this definitely did not happen\" from \"this may have happened\".",
      " */",
      "export const value = 1;",
    ].join("\n");
    assert.deepEqual(importSpecifiersIn(source), []);
  });

  test("a string used as a search needle is data, not an import", () => {
    const source = 'if (!(await read(file)).includes(\'from "@arrokothi/sdk"\')) fail();\n';
    assert.deepEqual(importSpecifiersIn(source), []);
  });

  test("a word list containing the preposition is data, not an import", () => {
    const source = 'const STOPWORDS = ["for", "from", "had"];\nexport const words = STOPWORDS;\n';
    assert.deepEqual(importSpecifiersIn(source), []);
  });

  test("a fixture carrying an import statement as literal text is data, not an import", () => {
    const fixture = 'import { LegacyHarness } from "@arrokothi/core";';
    const source = `const FIXTURE = ${JSON.stringify(fixture)};\nexport const planted = FIXTURE;\n`;
    assert.deepEqual(
      importSpecifiersIn(source),
      [],
      "the forbidden-edge controls cannot be stated at all if planting one counts as committing one",
    );
  });

  test("the same holds for a template literal, which is how the controls actually carry them", () => {
    const source = [
      "const FIXTURE = `",
      'import type { LegacyController } from "@arrokothi/core/ports";',
      'export * from "@arrokothi/core";',
      "`;",
      "export const planted = FIXTURE;",
    ].join("\n");
    assert.deepEqual(importSpecifiersIn(source), []);
  });
});

describe("import scanner: every real import form is still found", () => {
  const cases: Record<string, string> = {
    "named import": 'import { a } from "./a.ts";',
    "default import": 'import a from "./a.ts";',
    "namespace import": 'import * as a from "./a.ts";',
    "default and named import": 'import a, { b } from "./a.ts";',
    "side-effect import": 'import "./a.ts";',
    "type-only import": 'import type { A } from "./a.ts";',
    "inline type import": 'import { type A, b } from "./a.ts";',
    "multi-line import": "import {\n  a,\n  b,\n} from \"./a.ts\";",
    "import with a comment before the from clause": "import { a } /* keep */ from \"./a.ts\";",
    "re-export all": 'export * from "./a.ts";',
    "re-export named": 'export { a } from "./a.ts";',
    "re-export namespace": 'export * as ns from "./a.ts";',
    "re-export type": 'export type { A } from "./a.ts";',
    "dynamic import": 'const m = await import("./a.ts");',
    "dynamic import with whitespace": 'const m = await import(\n  "./a.ts",\n);',
  };

  for (const [name, source] of Object.entries(cases)) {
    test(name, () => {
      assert.deepEqual(importSpecifiersIn(source), ["./a.ts"], `${name} must still be seen by every guard`);
    });
  }

  test("a dynamic import inside a template interpolation is still found", () => {
    const source = "export const load = async () => `${await import(\"./a.ts\")}`;";
    assert.deepEqual(importSpecifiersIn(source), ["./a.ts"]);
  });

  test("several imports in one file are all found", () => {
    const source = [
      'import { readFile } from "node:fs/promises";',
      'import type { A } from "./a.ts";',
      'export * from "./b.ts";',
      'const c = await import("@arrokothi/core");',
    ].join("\n");
    assert.deepEqual(importSpecifiersIn(source).sort(), ["./a.ts", "./b.ts", "@arrokothi/core", "node:fs/promises"]);
  });
});

describe("import scanner: the lexer survives real source shapes", () => {
  test("a regular expression containing quote characters does not corrupt the rest of the file", () => {
    const source = [
      "const PATTERN = /(?:\\bfrom\\s*|\\bimport\\s*)[\"']([^\"']+)[\"']/g;",
      'import { a } from "./a.ts";',
    ].join("\n");
    assert.deepEqual(
      importSpecifiersIn(source),
      ["./a.ts"],
      "the old guard's own source contains exactly this shape",
    );
  });

  test("division is not mistaken for a regular expression", () => {
    const source = 'const ratio = total / count;\nimport { a } from "./a.ts";';
    assert.deepEqual(importSpecifiersIn(source), ["./a.ts"]);
  });

  test("import.meta before a later string produces no phantom specifier", () => {
    const source = [
      'const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");',
      'const LABEL = "not an import";',
    ].join("\n");
    assert.deepEqual(importSpecifiersIn(source), []);
  });

  test("an escaped quote inside a string does not end it early", () => {
    const source = 'const s = "a \\" from \\"b";\nexport const value = s;';
    assert.deepEqual(importSpecifiersIn(source), []);
  });

  test("nested template literals are lexed back into code correctly", () => {
    const source = "const s = `a${`b${1}c`}d`;\nimport { a } from \"./a.ts\";";
    assert.deepEqual(importSpecifiersIn(source), ["./a.ts"]);
  });

  test("an identifier that merely starts with the keyword is not an import", () => {
    const source = 'const importedFiles = ["./a.ts"];\nexport const files = importedFiles;';
    assert.deepEqual(importSpecifiersIn(source), []);
  });

  test("masking preserves literals in source order", () => {
    const { literals } = maskSource('const a = "one"; // "comment"\nconst b = `two`;');
    assert.deepEqual(literals, ["one", "two"]);
  });
});

describe("import scanner: the real tree", () => {
  // The five files where the previous scanner reported a specifier that is not an import. Each is
  // checked both ways: the phantom is gone, and the file's genuine imports are still reported.
  const knownProseSites: { path: string; phantom: string; realImports: string[] }[] = [
    {
      path: "packages/retrieval/local/src/records.ts",
      phantom: "nothing matched",
      realImports: [],
    },
    {
      path: "packages/interoperability/mcp/src/import/result.ts",
      phantom: "this may have happened and the answer was lost",
      realImports: [],
    },
    {
      path: "packages/retrieval/local/src/lexical.ts",
      phantom: ", ",
      realImports: ["@langchain/core/documents", "@langchain/textsplitters"],
    },
    {
      path: "scripts/check-builder-docs.ts",
      phantom: "@arrokothi/sdk",
      realImports: ["node:fs/promises", "node:path", "typescript"],
    },
  ];

  for (const site of knownProseSites) {
    test(`${site.path} reports its imports and not its prose`, async () => {
      const specifiers = await specifiersInFile(site.path);
      assert.equal(specifiers.includes(site.phantom), false, "the prose is no longer read as an import");
      for (const real of site.realImports) {
        assert.ok(specifiers.includes(real), `${real} is still reported`);
      }
    });
  }

  test("the k0 fixture, worded around the old defect, still reports only node builtins", async () => {
    // tests/conformance/k0 is the accepted K0.2 deliverable and is pinned by the benchmark's E1
    // fixture at ArrokothI 0535160e677231da41b06d9f822e62e2f0364dd1. K1.0 changes none of its bytes;
    // this asserts the new scanner reads it the same way the old one did.
    const specifiers = new Set<string>();
    for (const file of [
      "tests/conformance/k0/controls.test.ts",
      "tests/conformance/k0/fixture.ts",
      "tests/conformance/k0/scenarios.ts",
      "tests/conformance/k0/candidate.ts",
      "tests/conformance/k0/coverage.ts",
    ]) {
      for (const specifier of await specifiersInFile(file)) specifiers.add(specifier);
    }
    const bare = [...specifiers].filter((specifier) => !specifier.startsWith("."));
    assert.deepEqual(
      bare.every((specifier) => specifier.startsWith("node:")),
      true,
      `the pinned fixture imports node builtins and relative paths only (saw ${bare.join(", ")})`,
    );
  });
});
