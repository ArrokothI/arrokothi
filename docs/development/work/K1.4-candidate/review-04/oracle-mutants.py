"""Review-only predicate removals. Execute H's declared matrix and D05 controls unchanged.
This is test discrimination evidence, not production-mutant conformance credit.
Usage: Node 26.10+ on PATH, python3 -B this-file.py /absolute/H-checkout
"""
from pathlib import Path
import json, os, shutil, subprocess, sys, tempfile

root = Path(sys.argv[1]).resolve()
relative = 'tests/conformance/k0-candidate/identity-lab.ts'
source = (root / relative).read_text()
edits = [
    ('report-arity', 'report.method !== "delivered" || report.args.length !== 0', 'report.method !== "delivered"', 'report arity'),
    ('accepted-value', 'object && answer.ok === true && answer.value !== undefined && answer.value !== null', 'object && answer.ok === true', 'V1 createExecution'),
    ('inspection-view', '!object || answer.ok !== true || answer.value === undefined || answer.value === null', '!object || answer.ok !== true', 'V4 recover'),
]
results = []
for name, old, new, witness in [('honest', '', '', '')] + edits:
    with tempfile.TemporaryDirectory(prefix='k14-r04-oracle-') as directory:
        target = Path(directory)
        shutil.copy2(root / 'package.json', target / 'package.json')
        for part in ['k0', 'k0-candidate']:
            shutil.copytree(root / 'tests/conformance' / part, target / 'tests/conformance' / part)
        (target / 'node_modules').symlink_to(root / 'node_modules', target_is_directory=True)
        if old:
            assert source.count(old) == 1, (name, source.count(old))
            (target / relative).write_text(source.replace(old, new))
        command = ['node', '--no-warnings', '--test', '--test-reporter=tap', '--experimental-strip-types', 'tests/conformance/k0-candidate/identity-oracle.test.ts']
        run = subprocess.run(command, cwd=target, text=True, capture_output=True, timeout=60)
        failures = [line.strip() for line in run.stdout.splitlines() if 'not ok ' in line]
        if name == 'honest':
            assert run.returncode == 0 and not failures
        else:
            assert run.returncode == 1
            assert any(witness in line for line in failures), (name, failures)
            # Removing a missing-view gate may make the oracle throw; the test fails,
            # never reports that exception as the expected `answer` rejection.
        results.append({'name': name, 'edit': [old, new] if old else None, 'exit': run.returncode, 'failing_tests': failures, 'stdout': run.stdout, 'stderr': run.stderr})
print(json.dumps({'subject': 'a734d03a9eb352bd29988bff1a68d9d6ca9bb2d3', 'results': results}, indent=2))
