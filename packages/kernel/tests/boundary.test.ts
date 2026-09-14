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

  test("which code can read progress is answered only by pinned revisions and a codec", async () => {
    const driver = await readFile(resolve(SOURCE_ROOT, "driver.ts"), "utf8");
    for (const pinned of ["definitionRevision", "runtimeContractRevision", "progressCodec"]) {
      assert.match(driver, new RegExp(`readonly ${pinned}: string;`), `the Activation pins ${pinned}`);
    }
  });

  test("every import in the zone is internal or a node: builtin", async () => {
    const files = await sourceFiles();
    const specifiers = files.flatMap((file) => [...file.text.matchAll(/from "([^"]+)"/g)].map((match) => match[1] as string));
    assert.ok(specifiers.length > 0, "the scan found real imports");
    for (const specifier of specifiers) {
      assert.ok(
        specifier.startsWith("./") || specifier.startsWith("../") || specifier.startsWith("node:"),
        `${specifier} is outside the zone; the transitive guard owns the full rule, this is its local twin`,
      );
    }
  });
});
