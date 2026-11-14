"""K14-R2-02: run the maintained focused corpus with only the hold cascade removed.

Run from an isolated checkout of C. Source is restored even if a check fails.
An exit of zero is the observed surviving mutant, not acceptance.
The independent live-child counterexample is in probes.mjs.
"""
import os
from pathlib import Path
import subprocess

source = Path("packages/sdk/src/legacy-bridge/driver.ts")
original = source.read_bytes()
before = b'endLineage(executionId: string, _site: TerminateSite): Promise<void> {\n    return this.cascade(executionId);'
after = b'endLineage(executionId: string, _site: TerminateSite): Promise<void> {\n    if (_site === "hold") return Promise.resolve();\n    return this.cascade(executionId);'
assert original.count(before) == 1, "mutant must match exactly one site"
args = ["node", "--experimental-strip-types", "--test"]
args += [str(path) for path in sorted(Path("packages/sdk/tests").glob("bridge-*.test.ts"))]
args += ["packages/sdk/tests/wrapper-environment.test.ts", "packages/kernel/tests/binding-surface.test.ts"]
args += [f"tests/conformance/architecture/{name}.test.ts" for name in
         ["legacy-bridge-boundaries", "legacy-mapping", "kernel-landing-zone", "builder-docs-anchor"]]
env = os.environ.copy()
env["PATH"] = "/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin:" + env["PATH"]
try:
    source.write_bytes(original.replace(before, after))
    result = subprocess.run(args, env=env)
finally:
    source.write_bytes(original)
assert source.read_bytes() == original
print("removed-hold-cascade maintained suite exit:", result.returncode)
raise SystemExit(result.returncode)
