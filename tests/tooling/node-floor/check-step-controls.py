#!/usr/bin/env python3
"""Negative controls for A8's narrow observation and output-retention rules."""
import copy
import importlib.util
import json
from pathlib import Path

spec = importlib.util.spec_from_file_location('check_step', Path(__file__).with_name('check-step.py'))
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
checks = json.loads((helper.ROOT / 'docs/development/work/TOOLS-01/checks.json').read_text())


class FixtureGit:
    def __init__(self, _root):
        pass

    def document(self, _revision, _path):
        return checks


helper.tool.Git = FixtureGit
pending = {'operation': 'corpus', 'result': 'extraction_pending', 'origins': 1549,
           'pending_adoption': 1395,
           'counts': {'suite': 116, 'case': 8, 'non_executable': 30, 'pending': 1395}}
helper.tool.corpus = lambda *_args: pending
result = helper.run_step('fixture', 'adoption')
assert result['observation_valid'] and result['known_pending_adoption']
assert not result['meets_final_spec'] and 'passed' not in result
refusals = []
for field, value in [('result', 'attention_required'), ('origins', 1548),
                     ('pending_adoption', 1394), ('counts', dict(pending['counts'], suite=115))]:
    changed = copy.deepcopy(pending)
    changed[field] = value
    helper.tool.corpus = lambda *_args: changed
    result = helper.run_step('fixture', 'adoption')
    assert not result['observation_valid'] and not result['meets_final_spec']
    refusals.append(field)

# Arbitrary command output must never be forwarded into the floor record, even
# if it could include inherited secrets. The marker is synthetic, not a secret.
marker = 'FLOOR_SYNTHETIC_ENV_VALUE_DO_NOT_SERIALIZE'
for status, code in [('finished', 0), ('finished', 1), ('timeout', -9)]:
    helper.tool.command = lambda *_args: {'status': status, 'exit': code, 'output': marker}
    result = helper.run_step('fixture', 'typecheck')
    assert result['observation_valid'] == (status == 'finished' and code == 0)
    assert marker not in json.dumps(result) and 'raw' not in result
helper.tool.command = lambda *_args: {'status': 'finished', 'exit': 0, 'output': ''}
try:
    helper.run_step('fixture', 'kernel-sweeps')
except AssertionError:
    pass
else:
    raise AssertionError('empty sweep output earned a count comparison')
print(json.dumps({'pending_is_not_final_pass': True, 'changed_pending_refused': refusals,
                  'arbitrary_output_not_serialized': True, 'empty_sweep_refused': True}))
