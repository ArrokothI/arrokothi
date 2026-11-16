# Adapted from repository-owned review 02 evidence at 2a95a49a6e7ff46242a137f9d9ca6835e70ed946.
"""Run the twelve unchanged C registry cases with the existing runner, plus link controls.
From repository root, Node 26.10+ on PATH:
python3 -B docs/development/work/K1.4-candidate/review-03/registry-check.py
The selection is review-side only; no committed registry or tool is changed.
"""
import importlib.util
import json
from pathlib import Path
import tempfile

C = '41bd3aaa5cf83c51e93d41da567558d34f943410'
ROOT = Path.cwd().resolve()
REGISTRY = 'tests/fixtures/packet-tools/mutations.json'
spec = importlib.util.spec_from_file_location('packet_tools', ROOT / 'scripts/packet_tools.py')
tool = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tool)

class SelectedGit(tool.Git):
    def document(self, rev, path, versions=(1,)):
        value = super().document(rev, path, versions)
        if path == REGISTRY:
            value = dict(value, cases=[c for c in value['cases'] if c['id'].startswith('k14-candidate.')])
            value['determinism_sample'] = [c['id'] for c in value['cases']]
        return value

git = SelectedGit(ROOT)
result = tool.mutations(git, C, REGISTRY)
assert result['result'] == 'selected_cases_passed'
assert len(result['cases']) == 12 and result['counts'] == {'killed': 12}
assert all(c['control'] == 'passed' and c['claim']['semantic_credit'] == 'none' for c in result['cases'])

registry = git.document(C, REGISTRY)
case = registry['cases'][0]
files = {name: git.blob(C, name) for name in case['files'] + ['package.json']}
files.update({name: git.blob(C, name) for name in git.files(C, 'packages/kernel/src')})
environment = tool.child_environment(tool.environment_declaration(None))[0]
without_flag = dict(case, argv=[a for a in case['argv'] if a != '--link-workspace-kernel'])
missing = tool.run_case(files, without_flag, environment)
assert tool.execution_outcome(missing, case)['status'] == 'setup_error'
assert 'ERR_MODULE_NOT_FOUND' in missing['output']

with tempfile.TemporaryDirectory(prefix='k14-review03-link-') as temp:
    directory = Path(temp).resolve()
    for name, data in files.items():
        destination = directory / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(data)
    link = directory / 'node_modules/@arrokothi/kernel'
    link.parent.mkdir(parents=True)
    link.symlink_to(ROOT / 'packages/kernel', target_is_directory=True)
    wrong = tool.command(case['argv'], directory, 60, 65536, environment)
    assert tool.execution_outcome(wrong, case)['status'] == 'setup_error'
    assert 'not to this tree' in wrong['output']
    assert link.resolve() == ROOT / 'packages/kernel'  # never overwritten

result['review_link_controls'] = {
    'absent_link_without_flag': {'result': 'invalid_run', 'exit': missing['exit']},
    'existing_link_to_other_checkout': {'result': 'invalid_run', 'exit': wrong['exit'], 'preserved': True},
    'with_flag': 'twelve controls and twelve mutated copies use their own copied Kernel',
}
print(json.dumps(result, indent=2))
