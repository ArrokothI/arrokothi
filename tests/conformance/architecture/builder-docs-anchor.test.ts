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
    for (const name of ["sdk", "core", "kernel", "agents/strands", "models/gemini", "interoperability/mcp", "retrieval/local"]) {
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

/** K1.4 (D01-CHK-12): the private Kernel is admitted from the named SDK files only, never from an example. */
test("builder docs admits the Kernel from the SDK host and refuses it from an example and from a public SDK", () => {
  const fixture = mkdtempSync(join(tmpdir(), "builder-kernel-"));
  const put = (path: string, text: string) => { const file = join(fixture, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text); };
  try {
    put("scripts/check-builder-docs.ts", readFileSync(join(repository, "scripts/check-builder-docs.ts"), "utf8"));
    put("package.json", readFileSync(join(repository, "package.json"), "utf8"));
    put("package-lock.json", readFileSync(join(repository, "package-lock.json"), "utf8"));
    for (const name of ["sdk", "core", "kernel", "agents/strands", "models/gemini", "interoperability/mcp", "retrieval/local"]) {
      put(`packages/${name}/package.json`, readFileSync(join(repository, `packages/${name}/package.json`), "utf8"));
    }
    for (const file of ["README.md", "AGENTS.md", "docs/README.md", "packages/sdk/README.md", ".agents/skills/arrokothi-agent-builder/SKILL.md", "docs/guides/README.md", "examples/execution-kernel-minimal/README.md", "mental-model/README.md"]) put(file, "# Fixture\n\nUse @arrokothi/sdk.\n");
    for (const file of ["app.ts", "patterns.ts", "classification.ts"]) put(`examples/execution-kernel-minimal/${file}`, 'import {} from "@arrokothi/sdk";\n');
    for (const dir of ["docs/development", "packages/core/src", "node_modules"]) mkdirSync(join(fixture, dir), { recursive: true });
    symlinkSync(join(repository, "node_modules/typescript"), join(fixture, "node_modules/typescript"), "dir");
    put("packages/sdk/src/host.ts", 'import { ExecutionCoordinator } from "@arrokothi/kernel";\nexport const host = ExecutionCoordinator;\n');
    put("packages/sdk/src/legacy-bridge/driver.ts", 'import type { ExecutionDriver } from "@arrokothi/kernel";\nexport type Driver = ExecutionDriver;\n');
    const run = () => spawnSync(process.execPath, ["--experimental-strip-types", "scripts/check-builder-docs.ts"], { cwd: fixture, encoding: "utf8", timeout: 30_000 });
    const admitted = run();
    assert.ifError(admitted.error);
    assert.equal(admitted.status, 0, admitted.stderr);

    put("examples/execution-kernel-minimal/kernel-direct.ts", 'import { ExecutionCoordinator } from "@arrokothi/kernel";\nexport const direct = ExecutionCoordinator;\n');
    const fromExample = run();
    assert.equal(fromExample.status, 1, fromExample.stderr);
    assert.equal(fromExample.stderr.trim(), "examples/execution-kernel-minimal/kernel-direct.ts: the private Kernel is admitted only through @arrokothi/kernel from the named SDK host and bridge files: @arrokothi/kernel");
    rmSync(join(fixture, "examples/execution-kernel-minimal/kernel-direct.ts"));

    put("packages/sdk/src/preflight.ts", 'import type { ExecutionView } from "@arrokothi/kernel";\nexport type View = ExecutionView;\n');
    const unnamed = run();
    assert.equal(unnamed.status, 1, unnamed.stderr);
    assert.match(unnamed.stderr, /packages\/sdk\/src\/preflight\.ts: the private Kernel is admitted only/);
    rmSync(join(fixture, "packages/sdk/src/preflight.ts"));

    const manifest = JSON.parse(readFileSync(join(fixture, "packages/sdk/package.json"), "utf8")) as Record<string, unknown>;
    delete manifest["private"];
    put("packages/sdk/package.json", JSON.stringify(manifest));
    const published = run();
    assert.equal(published.status, 1, published.stderr);
    assert.match(published.stderr, /packages\/sdk\/package\.json must be private/);
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});
