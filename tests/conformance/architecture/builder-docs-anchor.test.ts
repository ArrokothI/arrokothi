/** TOOLS-02 / K11-R15-DOC-02: a canonical heading rename must break its local cross-reference. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repository = resolve(import.meta.dirname, "../../..");
test("builder docs rejects a renamed canonical heading after a passing cross-reference control", () => {
  const fixture = mkdtempSync(join(tmpdir(), "builder-anchor-"));
  const put = (path: string, text: string) => { const file = join(fixture, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text); };
  try {
    put("scripts/check-builder-docs.ts", readFileSync(join(repository, "scripts/check-builder-docs.ts"), "utf8"));
    put("package.json", readFileSync(join(repository, "package.json"), "utf8"));
    put("package-lock.json", readFileSync(join(repository, "package-lock.json"), "utf8"));
    for (const name of ["sdk", "core", "agents/strands", "models/gemini", "interoperability/mcp", "retrieval/local"]) {
      put(`packages/${name}/package.json`, readFileSync(join(repository, `packages/${name}/package.json`), "utf8"));
    }
    for (const file of ["README.md", "AGENTS.md", "docs/README.md", "packages/sdk/README.md", ".agents/skills/arrokothi-agent-builder/SKILL.md", "docs/guides/README.md", "examples/execution-kernel-minimal/README.md"]) put(file, "# Fixture\n\nUse @arrokothi/sdk.\n");
    for (const file of ["app.ts", "patterns.ts", "classification.ts"]) put(`examples/execution-kernel-minimal/${file}`, 'import {} from "@arrokothi/sdk";\n');
    for (const dir of ["docs/development", "packages/sdk/src", "packages/core/src", "node_modules"]) mkdirSync(join(fixture, dir), { recursive: true });
    symlinkSync(join(repository, "node_modules/typescript"), join(fixture, "node_modules/typescript"), "dir");
    put("mental-model/README.md", "# Canonical model\n\n[Boundary](boundary.md#stable-heading)\n");
    put("mental-model/boundary.md", "# Stable heading\n");
    const run = () => spawnSync(process.execPath, ["--experimental-strip-types", "scripts/check-builder-docs.ts"], { cwd: fixture, encoding: "utf8", timeout: 30_000 });
    const control = run();
    assert.ifError(control.error);
    assert.equal(control.status, 0, control.stderr);
    assert.match(control.stdout, /Builder checks passed:/);
    put("mental-model/boundary.md", "# Renamed heading\n");
    const changed = run();
    assert.ifError(changed.error);
    assert.equal(changed.status, 1, changed.stderr);
    assert.equal(changed.stderr.trim(), "mental-model/README.md: missing anchor: boundary.md#stable-heading");
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});
