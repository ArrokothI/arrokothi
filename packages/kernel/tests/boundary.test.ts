/**
 * K1.1-C8 - no Agent or Workflow discriminator in the new boundary, and nothing reached from outside.
 *
 * 007's K1.1 acceptance: "no Agent/Workflow discriminator in the new boundary." `PC-1` says why it
 * matters: the question the legacy `kind: "agent" | "workflow"` tag answered - which code can
 * understand this progress - is answered here by the pinned Definition revision, Runtime contract
 * revision and progress codec, and the closed controller port is refused (`DX-12`) rather than
 * carried forward.
 *
 * `tests/conformance/architecture/kernel-landing-zone.test.ts` owns the transitive import guard for
 * this zone. What is added here is the vocabulary check that guard does not make, held against the
 * package's own sources rather than a documented list.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../src");

/**
 * Whether a source line is documentation rather than code.
 *
 * Deliberately narrow: only a line that is entirely a comment counts. A line that mixes code with a
 * trailing comment is treated as code, so a forbidden word in either half is reported. Where two
 * readings are defensible this takes the one that only ever adds reports - a too-strict rule costs a
 * rewritten comment, while a too-loose one lets the discriminator back in behind a `//`.
 */
const isCommentLine = (line: string): boolean => {
  const trimmed = line.trim();
  return trimmed === "" || trimmed.startsWith("*") || trimmed.startsWith("//") || trimmed.startsWith("/*");
};

async function sourceFiles(): Promise<{ path: string; text: string }[]> {
  const names = (await readdir(SOURCE_ROOT, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => resolve(entry.parentPath, entry.name));
  assert.ok(names.length > 0, "the scan found the zone's sources");
  return Promise.all(names.map(async (path) => ({ path, text: await readFile(path, "utf8") })));
}

const occurrences = (files: { path: string; text: string }[], pattern: RegExp): { path: string; line: string; number: number }[] => {
  const found: { path: string; line: string; number: number }[] = [];
  for (const file of files) {
    file.text.split("\n").forEach((line, index) => {
      if (pattern.test(line)) found.push({ path: file.path, line, number: index + 1 });
    });
  }
  return found;
};

describe("K1.1-C8 the boundary carries no Agent or Workflow discriminator", () => {
  test("neither word appears in the zone's executable text", async () => {
    const files = await sourceFiles();
    const all = occurrences(files, /\b(agents?|workflows?)\b/i);
    const inCode = all.filter((hit) => !isCommentLine(hit.line));

    assert.deepEqual(
      inCode.map((hit) => `${hit.path.replace(SOURCE_ROOT, "")}:${hit.number}`),
      [],
      `Agent/Workflow vocabulary reached executable code: ${inCode.map((hit) => hit.line.trim()).join(" | ")}`,
    );
    // The scan is not vacuous: the words do occur, in the documentation that explains their absence.
    assert.ok(all.length > 0, "the pattern really does match this repository's prose");
  });

  test("no legacy controller vocabulary is carried forward into code either", async () => {
    const files = await sourceFiles();
    const inCode = occurrences(files, /\b(DefinitionKind|ControllerProgress|ControllerResumption|Harness|controller)\b/).filter(
      (hit) => !isCommentLine(hit.line),
    );
    assert.deepEqual(inCode.map((hit) => `${hit.path.replace(SOURCE_ROOT, "")}:${hit.number}`), []);
  });

  test("the exported surface names no Agent or Workflow concept", async () => {
    const surface = await import("../src/index.ts");
    for (const name of Object.keys(surface)) {
      assert.doesNotMatch(name, /agent|workflow/i, `${name} would put a Runtime role in the Kernel boundary`);
    }
  });

  test("the JCS substrate is the owner-approved exact dependency (K11-R1-JCS-01)", async () => {
    // values.md requires an unmodified conforming JCS implementation, not an almost-equivalent
    // serializer. The owner approved exact `canonicalize@3.0.0`; this pins that decision
    // structurally so a quiet swap of the substrate is a deliberate, reviewed change.
    const manifest = JSON.parse(await readFile(resolve(SOURCE_ROOT, "../package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
    };
    assert.equal(manifest.dependencies?.["canonicalize"], "3.0.0", "exact pin, no range");
  });

  test("which code can read progress is answered only by pinned revisions and a codec", async () => {
    const driver = await readFile(resolve(SOURCE_ROOT, "driver.ts"), "utf8");
    for (const pinned of ["definitionRevision", "runtimeContractRevision", "progressCodec"]) {
      assert.match(driver, new RegExp(`readonly ${pinned}: string;`), `the Activation pins ${pinned}`);
    }
  });

  test("K11-R6-STATE-02 no ordinary indexed assignment survives outside own-array.ts", async () => {
    // The round-7 reconstruction replaced the zone's live prototype methods with
    // `list[list.length] = item` and argued completeness by inspection. That argument was the
    // defect: an ordinary indexed write into a position a list does not own yet is `[[Set]]`, so it
    // consults the prototype chain and a caller-installed inherited accessor receives it instead.
    //
    // This control states the replacement as a property of the zone's executable text rather than
    // as a claim in a comment. `own-array.ts` is the one place `[[DefineOwnProperty]]` is applied to
    // a list position; every other module must reach a list through it. The pattern requires a
    // non-empty subscript immediately after an identifier, so `const out: ValueIssue[] = []`
    // (an empty type-position bracket) and `const [a, b] = pair` (a destructuring pattern, which
    // has whitespace before its bracket) are not assignments and are not matched.
    const files = await sourceFiles();
    const assignments = occurrences(files, /[A-Za-z0-9_$)\]]\[[^\]\n]+\][ \t]*=(?!=)/).filter(
      (hit) => !isCommentLine(hit.line) && !hit.path.endsWith("own-array.ts"),
    );
    assert.deepEqual(
      assignments.map((hit) => `${hit.path.replace(SOURCE_ROOT, "")}:${hit.number}`),
      [],
      `an ordinary indexed write is caller-steerable through an inherited accessor: ${assignments.map((hit) => hit.line.trim()).join(" | ")}`,
    );

    // Not vacuous: the pattern really does match this spelling where it is still discussed, and the
    // module that owns the rule really exists.
    assert.ok(
      occurrences(files, /[A-Za-z0-9_$)\]]\[[^\]\n]+\][ \t]*=(?!=)/).length > 0,
      "the pattern matches the spelling this rule is about",
    );
    assert.ok(
      files.some((file) => file.path.endsWith("own-array.ts")),
      "the zone has one owner for building and reading Kernel-owned lists",
    );
  });

  test("K11-R6-STATE-02 no array mutator method is applied to a Kernel-owned list", async () => {
    // `push`/`pop`/`shift`/`unshift`/`splice`/`fill`/`copyWithin` all perform `[[Set]]` or
    // `[[Delete]]` on positions through the ordinary property path, so capturing the primordial
    // function does not make them independent of an inherited indexed accessor. The zone builds
    // lists with `own-array.ts` instead. `sort`/`join`/`map` are named here as well because the
    // previous rounds' reason for avoiding them — a live, replaceable prototype method — still
    // stands; the serializer sandbox restores them for the dependency's own use, which is a
    // different thing from this zone calling them.
    const files = await sourceFiles();
    const pattern = /\.(push|pop|shift|unshift|splice|fill|copyWithin|sort|reverse|map|filter|slice|concat|includes|indexOf|forEach|flat|flatMap)\(/;
    const all = occurrences(files, pattern);
    const inCode = all.filter((hit) => !isCommentLine(hit.line));
    assert.deepEqual(
      inCode.map((hit) => `${hit.path.replace(SOURCE_ROOT, "")}:${hit.number}`),
      [],
      `an array prototype method reached executable code: ${inCode.map((hit) => hit.line.trim()).join(" | ")}`,
    );
    // Not vacuous: these spellings do occur in the zone, in the documentation explaining why the
    // implementation does not use them.
    assert.ok(all.length > 0, "the pattern really does match this zone's prose");
  });

  test("every import in the zone is internal, a node: builtin, or the approved JCS dependency", async () => {
    const files = await sourceFiles();
    const specifiers = files.flatMap((file) => [...file.text.matchAll(/from "([^"]+)"/g)].map((match) => match[1] as string));
    assert.ok(specifiers.length > 0, "the scan found real imports");
    for (const specifier of specifiers) {
      assert.ok(
        specifier.startsWith("./") ||
          specifier.startsWith("../") ||
          specifier.startsWith("node:") ||
          specifier === "canonicalize",
        `${specifier} is outside the zone; the transitive guard owns the full rule, this is its local twin`,
      );
    }
    // The twin is not vacuous: the approved dependency is really imported exactly once, by values.ts.
    assert.equal(specifiers.filter((specifier) => specifier === "canonicalize").length, 1);
  });
});
