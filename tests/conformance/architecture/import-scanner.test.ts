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
 *   acceptance names explicitly. K10-R1-01 showed a lexical heuristic for division versus regular
 *   expression can hide a real import and that a non-literal dynamic import was invisible; the
 *   scanner therefore parses with the TypeScript compiler and fails closed on non-literal targets.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  UNRESOLVABLE_MODULE_TARGET,
  astDependencies,
  importSpecifiersIn,
  moduleDependenciesIn,
  preprocessorDependencies,
  typeScriptFilesUnder,
} from "./module-graph.ts";

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

describe("import scanner: the parser survives real source shapes", () => {
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

  test("a regular expression after a control-flow closing paren does not hide the next import (K10-R1-01)", () => {
    // The heuristic scanner treated the slash after `)` as division, read the quote inside the
    // character class as a string delimiter, and consumed the forbidden import literal. The parser
    // knows the slash starts a regular expression, so the import is still seen.
    const source = [
      'if (true) /["\']/.test(\'x\');',
      'import { LegacyHarness } from "@arrokothi/core";',
    ].join("\n");
    assert.deepEqual(importSpecifiersIn(source), ["@arrokothi/core"]);
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

  test("nested template literals are parsed back into code correctly", () => {
    const source = "const s = `a${`b${1}c`}d`;\nimport { a } from \"./a.ts\";";
    assert.deepEqual(importSpecifiersIn(source), ["./a.ts"]);
  });

  test("an identifier that merely starts with the keyword is not an import", () => {
    const source = 'const importedFiles = ["./a.ts"];\nexport const files = importedFiles;';
    assert.deepEqual(importSpecifiersIn(source), []);
  });

  test("a non-literal dynamic import fails closed instead of reporting no dependency (K10-R1-01)", () => {
    const source = 'const target = "@arrokothi/core";\nconst m = await import(target);\n';
    assert.deepEqual(importSpecifiersIn(source), [UNRESOLVABLE_MODULE_TARGET]);
  });

  test("a template dynamic import with substitutions fails closed", () => {
    const source = "const m = await import(`./${name}.ts`);\n";
    assert.deepEqual(importSpecifiersIn(source), [UNRESOLVABLE_MODULE_TARGET]);
  });

  test("a no-substitution template dynamic import is still a literal", () => {
    const source = "const m = await import(`./a.ts`);\n";
    assert.deepEqual(importSpecifiersIn(source), ["./a.ts"]);
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


describe("dependency extractor: every way TypeScript can name a module (K10-R2-01)", () => {
  // Round 2's extractor enumerated four node kinds. These are the forms that enumeration omitted,
  // each a legal dependency on `@arrokothi/core` that the whole guard would otherwise not see.
  const dependencyBearing: Record<string, string> = {
    "import type at a property position": 'export type A = import("@arrokothi/core").ExecutionContext;',
    "import type under typeof": 'export type A = typeof import("@arrokothi/core");',
    "import type with no qualifier": 'export type A = import("@arrokothi/core");',
    "import type with type arguments": 'export type A = import("@arrokothi/core").Box<string>;',
    "import type in a parameter": 'export function f(a: import("@arrokothi/core").A): void { void a; }',
    "import type nested in a generic": 'export type A = ReadonlyArray<import("@arrokothi/core").A>;',
    "import type in a return position": 'export function f(): import("@arrokothi/core").A { throw new Error("x"); }',
    "triple-slash types reference": '/// <reference types="@arrokothi/core" />\nexport const a = 1;',
    "ambient module declaration": 'declare module "@arrokothi/core" { interface Q { a: 1 } }\nexport const a = 1;',
  };

  for (const [name, source] of Object.entries(dependencyBearing)) {
    test(name, () => {
      assert.deepEqual(
        [...new Set(importSpecifiersIn(source))],
        ["@arrokothi/core"],
        `${name} names a module, so every guard must see it`,
      );
    });
  }

  test("a triple-slash path reference is extracted as a path, not a bare specifier", () => {
    const source = '/// <reference path="../core/src/runtime/harness.ts" />\nexport const a = 1;';
    assert.deepEqual(moduleDependenciesIn(source), [
      { specifier: "../core/src/runtime/harness.ts", form: "reference-path", target: "path" },
    ]);
  });

  test("a lib reference names a TypeScript library, not a module, and is not a dependency", () => {
    assert.deepEqual(importSpecifiersIn('/// <reference lib="es2015" />\nexport const a = 1;'), []);
  });

  test("an import type whose target is not a literal fails closed", () => {
    const source = 'type N = "@arrokothi/core";\nexport type A = import(N).X;';
    assert.deepEqual(importSpecifiersIn(source), [UNRESOLVABLE_MODULE_TARGET]);
  });

  test("a re-export with no module specifier names no module", () => {
    assert.deepEqual(importSpecifiersIn("const a = 1;\nexport { a };"), []);
  });

  test("each form is reported with the syntax that carried it", () => {
    const source = [
      'import { a } from "./a.ts";',
      'export * from "./b.ts";',
      'import c = require("./c.ts");',
      'const d = await import("./d.ts");',
      'export type E = import("./e.ts").E;',
      'declare module "./f.ts" {}',
    ].join("\n");
    assert.deepEqual(
      moduleDependenciesIn(source).map((dependency) => [dependency.specifier, dependency.form]).sort(),
      [
        ["./a.ts", "import-declaration"],
        ["./b.ts", "export-declaration"],
        ["./c.ts", "import-equals"],
        ["./d.ts", "dynamic-import"],
        ["./e.ts", "import-type"],
        ["./f.ts", "module-declaration"],
      ],
    );
  });
});

describe("dependency extractor: two independent extractors, and what each is for", () => {
  test("the AST pass alone already finds everything the compiler's pre-processor finds", async () => {
    // The union is a safety net against the table in `module-graph.ts` being incomplete, not a
    // crutch covering a known hole. If this fails, a form is missing from that table.
    const sources: string[] = Object.values({
      matrix: [
        'import { a } from "@arrokothi/core";',
        'import type { A } from "@arrokothi/core";',
        'import "@arrokothi/core";',
        'export { a } from "@arrokothi/core";',
        'export * from "@arrokothi/core";',
        'import A = require("@arrokothi/core");',
        'const m = await import("@arrokothi/core");',
        'export type A = import("@arrokothi/core").X;',
        'export type B = typeof import("@arrokothi/core");',
        '/// <reference path="../core/src/x.ts" />',
        '/// <reference types="@arrokothi/core" />',
        'declare module "@arrokothi/core" {}',
      ].join("\n"),
    });
    for (const directory of ["packages", "tests", "examples", "scripts"]) {
      for (const file of await typeScriptFilesUnder(REPO_ROOT, directory)) {
        sources.push(await readFile(resolve(REPO_ROOT, file), "utf8"));
      }
    }
    assert.ok(sources.length > 100, `the corpus actually covered the tree (${sources.length} sources)`);

    const uncovered: string[] = [];
    for (const source of sources) {
      const ast = new Set(astDependencies(source).map((dependency) => dependency.specifier));
      for (const dependency of preprocessorDependencies(source)) {
        if (!ast.has(dependency.specifier)) uncovered.push(dependency.specifier);
      }
    }
    assert.deepEqual(uncovered, [], "no dependency is visible only to the second extractor");
  });

  test("the union still reports a dependency only one extractor can see", () => {
    // Demonstrates the safety net actually works, using the one form that is genuinely asymmetric:
    // an unresolvable target is the AST pass's own fail-closed signal and the pre-processor emits
    // nothing for it, so the union must keep it.
    const source = 'const t = "@arrokothi/core";\nexport const load = async () => import(t);';
    assert.deepEqual(preprocessorDependencies(source), []);
    assert.deepEqual(importSpecifiersIn(source), [UNRESOLVABLE_MODULE_TARGET]);
  });
});

describe("dependency extractor: prose soundness survives the rebuild (K0.2-SELF-01)", () => {
  // Re-asserted after the K10-R2-01 reconstruction rather than assumed to have survived it. The
  // forbidden-edge controls carry import statements as fixture text, so a regression here would
  // make the guards report their own controls as committed dependencies.
  const text: Record<string, string> = {
    "prose in a line comment": '// indistinguishable from "@arrokothi/core".\nexport const a = 1;',
    "prose in a documentation block": '/**\n * derives from "@arrokothi/core".\n */\nexport const a = 1;',
    "an import statement as a string": 'const needle = \'from "@arrokothi/core"\';\nexport const a = needle;',
    "an import statement in a template": 'const fixture = `import { A } from "@arrokothi/core";`;\nexport const a = fixture;',
    "a reference directive as fixture text": 'const fixture = `/// <reference types="@arrokothi/core" />`;\nexport const a = fixture;',
    "an import type as fixture text": 'const fixture = `export type A = import("@arrokothi/core").X;`;\nexport const a = fixture;',
    "a word list containing the preposition": 'const stop = ["for", "from", "had"];\nexport const a = stop;',
  };

  for (const [name, source] of Object.entries(text)) {
    test(name, () => {
      assert.deepEqual(importSpecifiersIn(source), [], `${name} is text, not a dependency`);
    });
  }
});
