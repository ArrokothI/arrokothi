"""Independent review 03: pinned commit scope and preservation checks; run at repository root."""
import json
import subprocess

B = 'c1951226338de6ccd3e4e6289259549551268f61'
C = '41bd3aaa5cf83c51e93d41da567558d34f943410'
H = 'ddc53bd132fde4f71bc989ccec7f4d0e430a45dc'
H2 = '14a7ef485282ab2c16d08702be5d61cfeb9997e7'

def git(*args):
    return subprocess.check_output(['git', *args], text=True).strip()

for left, right in [(B, C), (C, H)]:
    subprocess.run(['git', 'merge-base', '--is-ancestor', left, right], check=True)

trees = {}
for path in ['packages', 'scripts', 'tests/tooling']:
    old, new = git('rev-parse', f'{B}:{path}'), git('rev-parse', f'{H}:{path}')
    assert old == new, path
    trees[path] = old

administrative = git('diff', '--name-only', C, H).splitlines()
assert administrative == [
    'docs/development/007-work-packets.md',
    'docs/development/work/K1.4-candidate/implementation-03.md',
    'docs/development/work/K1.4-candidate/progress.md',
]
fixture_changes = git('diff', '--name-only', B, H, '--', 'tests/conformance/k0').splitlines()
assert fixture_changes == [f'tests/conformance/k0/{name}' for name in [
    'candidate.ts', 'fixture.ts', 'protocol-vocabulary.ts', 'refusal.test.ts']]

unchanged = [
    'docs/development/006-development-process.md',
    'docs/development/008-implementation-report.md',
    'docs/development/009-universal-prompts.md',
    'docs/development/012-review-methods.md',
    'package.json', 'package-lock.json', '.github/workflows/packet-verify.yml',
    'tests/conformance/k0/scenarios.ts', 'tests/conformance/k0/operation-sink.ts',
    'tests/conformance/k0/controls.test.ts', 'tests/conformance/k0/oracle-discrimination.test.ts',
    'tests/conformance/k0/blind-spot-regression.test.ts',
]
for path in unchanged:
    assert git('rev-parse', f'{B}:{path}') == git('rev-parse', f'{H}:{path}'), path

kept_since_review02 = [
    'tests/conformance/k0-candidate/ablation-table.ts',
    'tests/conformance/k0-candidate/ablation-probe.mjs',
    'tests/conformance/k0-candidate/fake-driver.ts',
    'tests/conformance/k0-candidate/canonical-json.ts',
    'tests/conformance/k0-candidate/verdicts.test.ts',
    'mental-model/mechanisms/evidence.md',
]
for path in kept_since_review02:
    assert git('rev-parse', f'{H2}:{path}') == git('rev-parse', f'{H}:{path}'), path

print(json.dumps({
    'result': 'passed', 'B': B, 'C': C, 'H': H,
    'ancestry': ['B ancestor of C', 'C ancestor of H'],
    'trees_identical_to_B': trees,
    'C_to_H_administrative_files': administrative,
    'fixture_changed_files_manually_reviewed': fixture_changes,
    'unchanged_from_B': unchanged,
    'unchanged_from_review02_H': kept_since_review02,
}, indent=2))
