/**
 * K1.4-candidate KC-1 (structure) and KC-5 (locator).
 *
 * **Import guard.** The candidate's implementation files may import only the `@arrokothi/kernel`
 * package root, each other, and from the fixture only types plus the `FIXTURE_VERSION` value. They
 * import no `node:` module, so they hold no file API, and they use no dynamic `import()` or `require`.
 * The guard is a regression guard for plausible accidental edges, checked against rejected-edge
 * controls. It is lexical, and it is not proof that no other read is possible: code built to evade it
 * is outside its scope (012; design check 01 D01-CHK-09).
 *
 * **Two boundaries in one directory.** Test files and `support.ts` are test-side. They load scenarios,
 * scripted candidates and edited Kernel copies, which the implementation may not. Every file in the
 * directory is named in exactly one of the two lists, so a new file has to be classified.
 *
 * **Locator.** One module path, one export name and one version string that the benchmark's E1 can pin,
 * and a refusal by name when the loaded fixture is not the version the candidate was built for.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { FIXTURE_VERSION, runScenario } from "../k0/fixture.ts";
import type { K0Candidate, Scenario } from "../k0/fixture.ts";
import { createOperationSink } from "../k0/operation-sink.ts";
import { ALL_SCENARIOS } from "../k0/scenarios.ts";
import { BUILT_FOR_FIXTURE_VERSION, createKernelCandidate, kernelCandidate, KERNEL_CANDIDATE_VERSION } from "./kernel-candidate.ts";

const DIRECTORY = import.meta.dirname;
const REPO_ROOT = resolve(DIRECTORY, "../../..");

/** The candidate itself: what E1 loads and what the import guard constrains. */
const IMPLEMENTATION = ["canonical-json.ts", "fake-driver.ts", "kernel-candidate.ts"];
/** Test-side files. They are outside the candidate's import closure. */
const TEST_SIDE = [
  "ablation-probe.mjs",
  "ablation-table.ts",
  "ablations.test.ts",
  "blindness.test.ts",
  "boundary.test.ts",
  "conventions.test.ts",
  "support.ts",
  "verdicts.test.ts",
];
const DOCUMENTS = ["README.md"];

const read = (file: string): string => readFileSync(join(DIRECTORY, file), "utf8");

/** Source text with comments blanked, keeping string and template contents and every line break. */
function withoutComments(source: string): string {
  let out = "";
  let index = 0;
  let quote: string | null = null;
  while (index < source.length) {
    const char = source[index] as string;
    const next = source[index + 1];
    if (quote !== null) {
      out += char;
      if (char === "\\") {
        out += next ?? "";
        index += 2;
        continue;
      }
      if (char === quote) quote = null;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      out += char;
      index += 1;
      continue;
    }
    if (char === "/" && next === "/") {
      while (index < source.length && source[index] !== "\n") index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      const end = source.indexOf("*/", index + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += source.slice(index, stop).replace(/[^\n]/g, " ");
      index = stop;
      continue;
    }
    out += char;
    index += 1;
  }
  return out;
}

interface ImportEdge {
  readonly specifier: string;
  readonly typeOnly: boolean;
  /** The import clause, whitespace-normalized; empty for a side-effect import. */
  readonly clause: string;
}

function staticEdges(code: string): ImportEdge[] {
  const edges: ImportEdge[] = [];
  const withClause = /\b(?:import|export)\s+(type\s+)?([^;"'`]*?)\s*\bfrom\s*["']([^"']+)["']/g;
  for (const match of code.matchAll(withClause)) {
    edges.push({ specifier: match[3] as string, typeOnly: match[1] !== undefined, clause: (match[2] as string).replace(/\s+/g, " ").trim() });
  }
  for (const match of code.matchAll(/\bimport\s*["']([^"']+)["']/g)) {
    edges.push({ specifier: match[1] as string, typeOnly: false, clause: "" });
  }
  return edges;
}

const TYPE_ONLY_FROM_FIXTURE = ["../k0/fixture.ts", "../k0/protocol-vocabulary.ts", "../k0/operation-sink.ts"];

/** Every reason `source` may not be one of the candidate's implementation files. */
function implementationViolations(source: string): string[] {
  const code = withoutComments(source);
  const problems: string[] = [];
  if (/\bimport\s*\(/.test(code)) problems.push("a dynamic import()");
  if (/\brequire\s*\(/.test(code)) problems.push("a require()");
  if (/\bimport\s*\.\s*meta\b/.test(code)) problems.push("import.meta");
  for (const edge of staticEdges(code)) {
    if (edge.specifier === "@arrokothi/kernel") continue;
    if (edge.specifier.startsWith("./")) {
      if (!IMPLEMENTATION.includes(edge.specifier.slice(2))) problems.push(`${edge.specifier}: not an implementation file of the candidate`);
      continue;
    }
    if (TYPE_ONLY_FROM_FIXTURE.includes(edge.specifier)) {
      if (edge.typeOnly) continue;
      if (edge.specifier === "../k0/fixture.ts" && edge.clause === "{ FIXTURE_VERSION }") continue;
      problems.push(`${edge.specifier}: a value import other than FIXTURE_VERSION`);
      continue;
    }
    problems.push(`${edge.specifier}: outside the candidate's allowed imports`);
  }
  return problems;
}

describe("K1.4-candidate KC-1: the candidate reaches the Kernel through its package root only", () => {
  test("every file in the directory is classified as implementation, test-side or a document", () => {
    assert.deepEqual(readdirSync(DIRECTORY).sort(), [...IMPLEMENTATION, ...TEST_SIDE, ...DOCUMENTS].sort());
  });

  for (const file of IMPLEMENTATION) {
    test(`${file} has no forbidden import edge`, () => {
      assert.deepEqual(implementationViolations(read(file)), []);
    });
  }

  test("the implementation imports exactly these modules", () => {
    const specifiers = new Set<string>();
    for (const file of IMPLEMENTATION) for (const edge of staticEdges(withoutComments(read(file)))) specifiers.add(edge.specifier);
    assert.deepEqual([...specifiers].sort(), [
      "../k0/fixture.ts",
      "../k0/operation-sink.ts",
      "../k0/protocol-vocabulary.ts",
      "./canonical-json.ts",
      "./fake-driver.ts",
      "@arrokothi/kernel",
    ]);
  });

  const rejected: readonly (readonly [string, string, RegExp])[] = [
    ["a Kernel source file by path", 'import { KernelState } from "../../../packages/kernel/src/state.ts";', /packages\/kernel\/src\/state\.ts: outside/],
    ["a deep package subpath", 'import { ExecutionCoordinator } from "@arrokothi/kernel/src/coordinator.ts";', /@arrokothi\/kernel\/src\/coordinator\.ts: outside/],
    ["the legacy core", 'import { Harness } from "@arrokothi/core";', /@arrokothi\/core: outside/],
    ["the SDK", 'import { createApplication } from "@arrokothi/sdk";', /@arrokothi\/sdk: outside/],
    ["the scenarios", 'import { ALL_SCENARIOS } from "../k0/scenarios.ts";', /scenarios\.ts: outside/],
    ["the scenarios, type-only", 'import type { Anything } from "../k0/scenarios.ts";', /scenarios\.ts: outside/],
    ["the scripted candidates", 'import { conformingCandidate, expectedObservations } from "../k0/candidate.ts";', /candidate\.ts: outside/],
    ["the coverage map", 'import { K0_OBLIGATIONS } from "../k0/coverage.ts";', /coverage\.ts: outside/],
    ["the runner as a value", 'import { runScenario } from "../k0/fixture.ts";', /fixture\.ts: a value import other than FIXTURE_VERSION/],
    ["another value beside FIXTURE_VERSION", 'import { FIXTURE_VERSION, runScenario } from "../k0/fixture.ts";', /fixture\.ts: a value import other than FIXTURE_VERSION/],
    ["the fixture's eligibility rule as a value", 'import { isEligibleUnderWait } from "../k0/protocol-vocabulary.ts";', /protocol-vocabulary\.ts: a value import/],
    ["the sink factory as a value", 'import { createOperationSink } from "../k0/operation-sink.ts";', /operation-sink\.ts: a value import/],
    ["a node builtin", 'import { readFileSync } from "node:fs";', /node:fs: outside/],
    ["a test-side sibling", 'import { startRun } from "./support.ts";', /\.\/support\.ts: not an implementation file/],
    ["a re-export of the scenarios", 'export * from "../k0/scenarios.ts";', /scenarios\.ts: outside/],
    ["a side-effect import", 'import "../k0/scenarios.ts";', /scenarios\.ts: outside/],
    ["a dynamic import", 'const loaded = await import("../k0/scenarios.ts");', /a dynamic import\(\)/],
    ["a require", 'const fs = require("node:fs");', /a require\(\)/],
    ["import.meta", "const here = import.meta.dirname;", /import\.meta/],
    ["a multi-line import", 'import {\n  ALL_SCENARIOS,\n} from\n  "../k0/scenarios.ts";', /scenarios\.ts: outside/],
  ];

  for (const [title, source, expected] of rejected) {
    test(`rejected edge: ${title}`, () => {
      const problems = implementationViolations(source);
      assert.ok(problems.length > 0, "the guard reports the edge");
      assert.match(problems.join("\n"), expected);
    });
  }

  test("accepted edges: the guard is not trivially red, and comments and strings are not edges", () => {
    const allowed = [
      'import { ExecutionCoordinator } from "@arrokothi/kernel";',
      'import type { ExecutionView } from "@arrokothi/kernel";',
      'import { FIXTURE_VERSION } from "../k0/fixture.ts";',
      'import type { Command, Scenario } from "../k0/fixture.ts";',
      'import type { FixtureEvent } from "../k0/protocol-vocabulary.ts";',
      'import type { OperationSink } from "../k0/operation-sink.ts";',
      'import { canonicalBytes } from "./canonical-json.ts";',
      '// import { ALL_SCENARIOS } from "../k0/scenarios.ts";',
      '/* const fs = require("node:fs"); */',
    ].join("\n");
    assert.deepEqual(implementationViolations(allowed), []);
  });

  test("the candidate reads only the scenario's id and steps, and each step's command", () => {
    const code = withoutComments(read("kernel-candidate.ts"));
    const members = new Set([...code.matchAll(/\bscenario\s*\.\s*(\w+)/g)].map((match) => match[1]));
    assert.deepEqual([...members].sort(), ["id", "steps"]);
    for (const member of ["expect", "forbids", "ledgerCount", "waits", "sources", "k0BoundaryRows", "isUnsafeControl", "title", "label", "observation"]) {
      assert.doesNotMatch(code, new RegExp(`\\.\\s*${member}\\b`), `the candidate never reads .${member}`);
    }
    assert.equal([...code.matchAll(/\b_sink\b/g)].length, 1, "the operation sink is a parameter the candidate never uses");
    assert.doesNotMatch(code, /\bsink\s*\.\s*attempt\b/);
  });

  for (const file of IMPLEMENTATION) {
    test(`${file} names no ambient host object and evaluates no text`, () => {
      // A bounded lexical check beside the import guard: with no `node:` import and none of these names,
      // the implementation has no route to a file, the process, the network or generated code.
      const code = withoutComments(read(file));
      for (const name of ["process", "globalThis", "global", "eval", "fetch", "Deno", "Bun", "WebAssembly", "Worker"]) {
        assert.doesNotMatch(code, new RegExp(`(^|[^.\\w"'\`-])${name}\\b`), `${file} does not name ${name}`);
      }
      assert.doesNotMatch(code, /\bFunction\s*\(/);
    });
  }

  test("the package root resolves to the Kernel's own source, and the Kernel has no dependency", () => {
    const resolved = fileURLToPath(import.meta.resolve("@arrokothi/kernel"));
    const real = realpathSync(resolved);
    assert.equal(real, realpathSync(join(REPO_ROOT, "packages/kernel/src/index.ts")));
    assert.doesNotMatch(real, /node_modules/, "the workspace link resolves to real source, so type stripping applies");
    const manifest = JSON.parse(readFileSync(join(REPO_ROOT, "packages/kernel/package.json"), "utf8")) as Record<string, unknown>;
    assert.deepEqual(manifest.exports, { ".": "./src/index.ts" });
    assert.equal(manifest.dependencies, undefined);
    assert.equal(manifest.peerDependencies, undefined);
  });
});

describe("K1.4-candidate KC-5: a locator E1 can pin", () => {
  const MODULE_PATH = "tests/conformance/k0-candidate/kernel-candidate.ts";

  test("one module path, one export name, one version string", () => {
    // The module this file imports as `./kernel-candidate.ts` is the file at the documented path, so the
    // exports checked here are the ones E1 gets when it imports that path from a checkout.
    assert.equal(import.meta.resolve("./kernel-candidate.ts"), pathToFileURL(join(REPO_ROOT, MODULE_PATH)).href);
    const candidate: K0Candidate = kernelCandidate;
    assert.equal(typeof candidate.begin, "function");
    assert.equal(candidate.name, "arrokothi-kernel-coordinator");
    assert.equal(KERNEL_CANDIDATE_VERSION, "arrokothi-k0-kernel-candidate/1");
    const exported = [...withoutComments(read("kernel-candidate.ts")).matchAll(/^export (?:const|function|interface|type|class) (\w+)/gm)].map((match) => match[1]);
    assert.deepEqual(exported.sort(), ["BUILT_FOR_FIXTURE_VERSION", "KERNEL_CANDIDATE_VERSION", "KernelCandidateOptions", "createKernelCandidate", "kernelCandidate"]);
  });

  test("the candidate was built for the fixture version this checkout holds", () => {
    assert.equal(BUILT_FOR_FIXTURE_VERSION, "arrokothi-k0-public-fixture/1");
    assert.equal(FIXTURE_VERSION, BUILT_FOR_FIXTURE_VERSION);
  });

  test("a fixture of another version is refused by name, for every scenario, before anything is read or run", () => {
    const other = createKernelCandidate({ fixtureVersion: "arrokothi-k0-public-fixture/2" });
    for (const scenario of ALL_SCENARIOS) {
      const bundle = createOperationSink();
      const result = runScenario(other, scenario, bundle);
      assert.equal(result.outcome, "REFUSED", scenario.id);
      assert.equal(
        (result as { readonly reason: string }).reason,
        "arrokothi-k0-kernel-candidate/1 was built for fixture arrokothi-k0-public-fixture/1; the loaded fixture declares arrokothi-k0-public-fixture/2, so nothing is run",
      );
      assert.equal(bundle.ledger.count(), 0);
    }
    // Not even the commands are read: a scenario on which every member throws is refused the same way.
    const unreadable = new Proxy({} as Scenario, {
      get: (_target, key) => {
        throw new Error(`read scenario.${String(key)}`);
      },
    });
    const started = other.begin(unreadable, createOperationSink().sink);
    assert.equal((started as { readonly refused?: boolean }).refused, true);
  });

  test("the README states the locator the code exports", () => {
    const readme = read("README.md");
    for (const required of [MODULE_PATH, "`kernelCandidate`", KERNEL_CANDIDATE_VERSION, BUILT_FOR_FIXTURE_VERSION, "npm ci", "--preserve-symlinks", "26.10.0"]) {
      assert.ok(readme.includes(required), `README names ${required}`);
    }
  });
});
