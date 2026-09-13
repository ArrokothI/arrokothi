/**
 * K1.0's own evidence records, checked mechanically.
 *
 * Added for K10-R4-02. A validation manifest recorded a digest labelled SHA-256 that had 52
 * hexadecimal characters instead of 64, so it could not be the digest of anything. The underlying
 * log was intact and green; the defect was in the identity recorded for it. 006 and 008 require
 * these records to state raw paths and digests accurately, and nothing checked that they did.
 *
 * Three properties, each of which would have caught that defect on its own:
 *
 * 1. Every log's true digest appears in its manifest.
 * 2. Every manifest row's recorded digest is either the true one, or is explicitly superseded by a
 *    correction section that names both the file and its true digest - so a wrong value can be kept
 *    visible as history without the record as a whole being wrong.
 * 3. No token presented as a digest has an impossible length outside a correction section.
 *
 * A validation directory whose manifest does not exist yet is a capture still in progress: it
 * records no digests, so it has none that can be wrong, and checking it would make the suite result
 * depend on whether the manifest happened to be written before the tests ran. Those directories are
 * skipped, and a floor on the number of manifests actually checked keeps that from becoming a way
 * for the guard to see nothing.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const WORK = "docs/development/work/K1.0";

/**
 * Every work root whose raw evidence this guard owns. K1.0's correction packet keeps its own
 * report and validation directory, so it is listed here rather than left outside the check: an
 * evidence directory nothing verifies is exactly the gap this guard exists to close. Roots are
 * named explicitly rather than discovered, so adding a packet is a deliberate decision about who
 * checks its records instead of a silent widening of this one.
 */
const WORK_ROOTS = [WORK, "docs/development/work/K1.0-correction-01"] as const;

/**
 * Validation directories whose manifest exists, as `root/directory`, oldest first within each
 * root. A round mid-capture has no manifest and is skipped.
 */
async function manifestedRounds(): Promise<string[]> {
  const manifested: string[] = [];
  for (const root of WORK_ROOTS) {
    const entries = await readdir(resolve(REPO_ROOT, root), { withFileTypes: true });
    const directories = entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("validation-"))
      .map((entry) => entry.name)
      .sort();
    for (const directory of directories) {
      const names = await readdir(resolve(REPO_ROOT, root, directory));
      if (names.includes("MANIFEST.md")) manifested.push(`${root}/${directory}`);
    }
  }
  return manifested;
}

/**
 * Rounds whose evidence is already reviewed, so their manifests must always be present and correct.
 * A later round may be mid-capture; these cannot be.
 */
const SETTLED_ROUNDS = 4;

const HEX_TOKEN = /`([0-9a-fA-F]{20,})`/g;

/** Sections of a Markdown document, keyed by their `##` heading; the preamble is keyed `""`. */
function sections(markdown: string): Map<string, string> {
  const found = new Map<string, string>();
  let heading = "";
  let body: string[] = [];
  for (const line of markdown.split("\n")) {
    if (line.startsWith("## ")) {
      found.set(heading, body.join("\n"));
      heading = line.slice(3).trim();
      body = [];
      continue;
    }
    body.push(line);
  }
  found.set(heading, body.join("\n"));
  return found;
}

const isCorrection = (heading: string): boolean => heading.toLowerCase().startsWith("correction");

describe("K1.0 evidence records", () => {
  test("every settled round's manifest is present and checked", async () => {
    // Non-vacuity, and the floor that stops "skip what has no manifest" from becoming "check
    // nothing". Rounds 1 to 4 are already reviewed; their manifests cannot go missing.
    const manifested = await manifestedRounds();
    assert.ok(
      manifested.length >= SETTLED_ROUNDS,
      `expected at least ${SETTLED_ROUNDS} manifests, saw ${manifested.length}: ${manifested.join(", ")}`,
    );
    for (let round = 1; round <= SETTLED_ROUNDS; round += 1) {
      const name = `${WORK}/validation-0${round}`;
      assert.ok(manifested.includes(name), `${name} has a manifest`);
    }
  });

  test("every recorded digest is the digest of the file it names", async () => {
    const problems: string[] = [];

    for (const directory of await manifestedRounds()) {
      const manifestPath = `${directory}/MANIFEST.md`;
      const manifest = await readFile(resolve(REPO_ROOT, manifestPath), "utf8");
      const logs = (await readdir(resolve(REPO_ROOT, directory)))
        .filter((name) => name.endsWith(".log"))
        .sort();
      assert.ok(logs.length > 0, `${directory} has attachments to check`);

      const corrections = [...sections(manifest)]
        .filter(([heading]) => isCorrection(heading))
        .map(([, body]) => body)
        .join("\n");

      for (const log of logs) {
        const actual = createHash("sha256")
          .update(await readFile(resolve(REPO_ROOT, directory, log)))
          .digest("hex");

        // 1. The true digest is recorded somewhere in the manifest.
        if (!manifest.includes(actual)) {
          problems.push(`${directory}/${log}: the manifest does not record its actual SHA-256`);
          continue;
        }

        // 2. The row's own digest is correct, or explicitly superseded.
        const row = manifest.split("\n").find((line) => line.includes(`](${log})`));
        if (row === undefined) {
          problems.push(`${directory}/${log}: no manifest row`);
          continue;
        }
        const tokens = [...row.matchAll(HEX_TOKEN)].map((match) => match[1]!);
        const recorded = tokens[tokens.length - 1];
        if (recorded === actual) continue;
        if (!corrections.includes(log) || !corrections.includes(actual)) {
          problems.push(
            `${directory}/${log}: row records ${recorded ?? "(nothing)"} and no correction section supersedes it`,
          );
        }
      }
    }

    assert.deepEqual(problems, []);
  });

  test("no token presented as a digest has an impossible length", async () => {
    // The direct guard on K10-R4-02's shape. A 40-character token is a Git object name and a
    // 64-character one is a SHA-256; anything else claiming to be either is a transcription defect.
    // One is tolerated only where a correction section quotes that exact token, which is how a
    // wrong historical value stays visible in its original row without the record being wrong.
    const problems: string[] = [];

    for (const directory of await manifestedRounds()) {
      const manifest = await readFile(resolve(REPO_ROOT, directory, "MANIFEST.md"), "utf8");
      const parts = sections(manifest);
      const corrections = [...parts]
        .filter(([heading]) => isCorrection(heading))
        .map(([, body]) => body)
        .join("\n");

      for (const [heading, body] of parts) {
        if (isCorrection(heading)) continue;
        for (const match of body.matchAll(HEX_TOKEN)) {
          const token = match[1]!;
          if (token.length === 40 || token.length === 64) continue;
          if (corrections.includes(token)) continue;
          problems.push(`${directory}/MANIFEST.md, section "${heading}": ${token.length}-character token ${token}`);
        }
      }
    }

    assert.deepEqual(problems, []);
  });

  test("the check is not vacuous: it rejects a manifest whose digest is wrong", async () => {
    // Distinguishing evidence, on a copy in memory rather than on the committed records.
    const manifest = await readFile(resolve(REPO_ROOT, WORK, "validation-01", "MANIFEST.md"), "utf8");
    const actual = createHash("sha256")
      .update(await readFile(resolve(REPO_ROOT, WORK, "validation-01", "02-typecheck.log")))
      .digest("hex");
    assert.ok(manifest.includes(actual), "the real manifest records the real digest");

    const truncated = `${actual.slice(0, 38)}${actual.slice(50)}`;
    assert.equal(truncated.length, 52, "the mutation reproduces K10-R4-02's exact shape");
    const mutated = manifest.replace(actual, truncated);
    assert.ok(!mutated.includes(actual), "property 1 fails on the mutated manifest");

    const parts = sections(mutated);
    const corrections = [...parts]
      .filter(([heading]) => isCorrection(heading))
      .map(([, body]) => body)
      .join("\n");
    const offending = [...parts]
      .filter(([heading]) => !isCorrection(heading))
      .flatMap(([, body]) => [...body.matchAll(HEX_TOKEN)].map((match) => match[1]!))
      .filter((token) => token.length !== 40 && token.length !== 64 && !corrections.includes(token));
    assert.deepEqual(offending, [truncated], "property 3 fails on the mutated manifest");
  });
});
