#!/usr/bin/env python3
"""Review-only negative controls for the new value-cost probe.

Run after the required verification/corpus/registries, with Node v26.10.0 first
in PATH: python3 -B probe-evidence-attribution.py /absolute/clean-C-tree
All faults are placed in a temporary copy. The submitted tree is untouched.
"""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

tree = Path(sys.argv[1]).resolve()
spec = importlib.util.spec_from_file_location('review_packet_tools', tree / 'scripts/packet_tools.py')
tool = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tool)
registry = json.loads((tree / 'tests/fixtures/packet-tools/value-cost.json').read_text())
case = next(c for c in registry['cases'] if c['id'] == 'value-cost.unit-table')
environment = dict(os.environ)
for name in ['NODE_OPTIONS', 'NODE_TEST_CONTEXT', 'NODE_V8_COVERAGE', 'KERNEL_POISON_MODE']:
    environment.pop(name, None)
rows = []
with tempfile.TemporaryDirectory(prefix='kc3-review-attribution-') as directory:
    root = Path(directory)
    shutil.copytree(tree / 'packages/kernel', root / 'packages/kernel')
    for relative in ['package.json', 'tsconfig.json', 'tests/tooling/value-cost-probe.mjs',
                     'tests/fixtures/packet-tools/value-cost.json']:
        dest = root / relative
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(tree / relative, dest)
    (root / 'node_modules').symlink_to(tree / 'node_modules', target_is_directory=True)
    source = root / 'packages/kernel/src/values.ts'
    original = source.read_text()
    variants = {
        'control': original,
        'syntax-error-before-any-test': original + '\nconst = ;\n',
        'module-load-throw-before-any-test': original + '\nthrow new Error("independent-review setup failure");\n',
    }
    for name, text in variants.items():
        source.write_text(text)
        # Direct TAP independently shows which event failed and whether a
        # selected assertion was reached; the wrapper discards this evidence.
        argv = ['node', '--test', '--experimental-strip-types', '--no-warnings', '--test-reporter=tap',
                '--test-name-pattern=' + case['input']['pattern'], case['input']['file']]
        direct = subprocess.run(argv, cwd=root, env=environment, capture_output=True, text=True, timeout=180)
        probe = subprocess.run(case['argv'], cwd=root, env=environment, capture_output=True, text=True, timeout=180)
        run = {'status': 'finished', 'exit': probe.returncode, 'output': probe.stdout}
        outcome = tool.execution_outcome(run, case)
        rows.append({'variant': name, 'probe_argv': case['argv'], 'probe_exit': probe.returncode,
                     'probe_observation': json.loads(probe.stdout), 'runner_classification': outcome,
                     'direct_exit': direct.returncode, 'direct_tap': direct.stdout, 'direct_stderr': direct.stderr})
    source.write_text(original)
assert rows[0]['probe_exit'] == 0 and rows[0]['probe_observation']['passed']
assert all(r['probe_observation']['pass'] == 0 for r in rows[1:])
assert all(r['runner_classification']['status'] == 'killed' for r in rows[1:])
print(json.dumps({'tree': str(tree), 'node': subprocess.check_output(['node', '--version'], text=True).strip(),
                  'contract_holds': False, 'rows': rows,
                  'limit': 'These negative controls show false kill attribution. They do not establish that any submitted registered mutant actually failed this way.'}, indent=2))
