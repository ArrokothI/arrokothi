#!/usr/bin/env python3
"""Reviewer experiment: Node event evidence, not the uncommitted correction checker.

Run with Node v26.10.0 first in PATH. All source files are created in temporary
directories. No candidate files are loaded or changed.
"""
import json
import subprocess
import tempfile
import time
from pathlib import Path

REPORTER = r"""import { AssertionError } from 'node:assert';
export default async function* reporter(events) {
  for await (const event of events) {
    if (!['test:fail', 'test:pass'].includes(event.type)) continue;
    const error = event.data.details?.error;
    const cause = error?.cause;
    yield JSON.stringify({type: event.type, name: event.data.name,
      failureType: error?.failureType, causeName: cause?.name,
      code: cause?.code, instanceOfAssertionError: cause instanceof AssertionError,
      stack: cause?.stack}) + '\n';
  }
}
"""
TARGET = """import assert from 'node:assert/strict';
import test from 'node:test';
import { value } from './production.mjs';
test('declared target', () => {
  const result = value();
  assert.equal(result, 1);
});
"""
PRODUCTION = {
    'passing_control': 'export function value() { return 1; }\n',
    'target_assertion': 'export function value() { return 0; }\n',
    'production_assertion': """import { AssertionError } from 'node:assert';
export function value() {
  throw new AssertionError({actual: 0, expected: 1, operator: 'strictEqual'});
}
""",
    'production_assertion_trimmed': """import { AssertionError } from 'node:assert';
export function value() {
  throw new AssertionError({actual: 0, expected: 1, operator: 'strictEqual',
    stackStartFn: value});
}
""",
}


def main():
    version = subprocess.check_output(['node', '--version'], text=True).strip()
    if version != 'v26.10.0':
        raise SystemExit('Requires v26.10.0, found ' + version)
    results = []
    with tempfile.TemporaryDirectory(prefix='tools01-design06-') as directory:
        root = Path(directory).resolve()
        (root / 'reporter.mjs').write_text(REPORTER)
        (root / 'target.test.mjs').write_text(TARGET)
        for label, source in PRODUCTION.items():
            (root / 'production.mjs').write_text(source)
            command = ['node', '--test', '--test-reporter=./reporter.mjs', 'target.test.mjs']
            started = time.monotonic()
            result = subprocess.run(command, cwd=root, text=True,
                                    capture_output=True, timeout=15)
            elapsed = round(time.monotonic() - started, 3)
            # Normalize only the temporary directory, retaining every frame.
            stdout = result.stdout.replace(root.as_posix(), '<fixture>')
            results.append(dict(case=label, command=command, exit=result.returncode,
                                seconds=elapsed,
                                events=[json.loads(line) for line in stdout.splitlines()],
                                stderr=result.stderr))
    print(json.dumps(dict(node=version, results=results), indent=2))


if __name__ == '__main__':
    main()
