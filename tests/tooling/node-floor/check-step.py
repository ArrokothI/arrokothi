#!/usr/bin/env python3
"""Run one existing checks.json step for A8; never change its verdict or specification."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parents[3]
sys.dont_write_bytecode = True
module_spec = importlib.util.spec_from_file_location('packet_tools', ROOT / 'scripts/packet_tools.py')
tool = importlib.util.module_from_spec(module_spec)
module_spec.loader.exec_module(tool)


def operation_facts(result):
    if result['operation'] == 'mutations':
        return {'result': result['result'], 'counts': result['counts'],
                'cases': [{'case': case['case'], 'control': case['control'],
                           'repeat_passed': case.get('determinism', {}).get('passed'),
                           'mutations': [{key: mutant[key] for key in
                                          ('mutation', 'status', 'killed_by') if key in mutant}
                                         for mutant in case['mutations']]}
                          for case in result['cases']], 'witnesses': result['witnesses']}
    return result


def run_step(revision, step_id):
    git = tool.Git(ROOT)
    specification = 'docs/development/work/TOOLS-01/checks.json'
    spec = git.document(revision, specification)
    assert spec == json.loads((ROOT / specification).read_text()), 'uncommitted checks drift'
    step, = [row for row in spec['checks'] if row['id'] == step_id]
    if 'operation' in step:
        result = getattr(tool, step['operation'])(git, revision, step['spec'])
        meets_spec = result['result'] == step['expected']
        # Existing corpus incompleteness is preserved as a failed final-packet gate.
        # A8 tests environment equivalence; it cannot complete the pending migration.
        format_one = result.get('format') in (None, 1) and result.get('pending_adoption') == 1395 and \
            result.get('counts') == {'suite': 116, 'case': 8, 'non_executable': 30, 'pending': 1395}
        # Design 05 step 4 migrated the same 1,549 origins to format 2: 154 await revalidation.
        format_two = result.get('format') == 2 and result.get('pending_adoption') == 1549 and \
            result.get('states') == {'pending': 1395, 'pending_revalidation': 154} and \
            result.get('pending_revalidation') == {'suite': 116, 'case': 8, 'non_executable': 30}
        pending = (step_id == 'adoption' and result['result'] == 'extraction_pending'
                   and result['origins'] == 1549 and (format_one or format_two))
        return {'id': step_id, 'observation_valid': meets_spec or pending, 'meets_final_spec': meets_spec,
                'known_pending_adoption': pending, 'facts': operation_facts(result)}
    # A8 compares the environment its caller sets, so this runner passes that environment through.
    if 'catalog' in step:
        _, run, _ = tool.catalog_run(git, revision, step, dict(os.environ))
    else:
        run = tool.command(step['argv'], ROOT, step['timeout_seconds'], step['output_limit_bytes'], dict(os.environ))
    counts = {}
    for label, pattern in step.get('counts', {}).items():
        matches = re.findall(pattern, run['output'], re.M)
        assert len(matches) == 1 and isinstance(matches[0], str), (step_id, label, matches)
        counts[label] = int(matches[0])
    facts = {'counts': counts}
    if step_id in ('repository-tests', 'archive-tests'):
        for label in ('pass', 'suites'):
            matches = re.findall(r'^[#ℹ] ' + label + r' (\d+)$', run['output'], re.M)
            assert len(matches) == 1, 'missing or duplicate test summary'
            counts[label] = int(matches[0])
    if step_id in ('refusal-census', 'oracle-census') and run['exit'] == 0:
        # Node's experimental warning follows the single JSON record.
        lines = [line for line in run['output'].splitlines() if line.startswith('{')]
        assert len(lines) == 1, lines
        facts['census'] = json.loads(lines[0])
    if step_id == 'kernel-sweeps':
        facts['summaries'] = [line for line in run['output'].splitlines()
                              if line.startswith(('FAULT SWEEP ', 'EXIT INVENTORY:', 'BOUNDARY ', 'POISON SWEEP '))]
        for prefix in ('FAULT SWEEP ', 'EXIT INVENTORY:', 'BOUNDARY ', 'POISON SWEEP '):
            assert sum(line.startswith(prefix) for line in facts['summaries']) == 1, 'missing or duplicate sweep summary'
        facts['modes'] = {}
        for line in run['output'].splitlines():
            match = re.match(r'(RUN|MODE) (\w+): (\{.*\})$', line)
            if match:
                value = json.loads(match[3])
                value.pop('seconds', None)
                key = match[1] + ' ' + match[2]
                assert key not in facts['modes'], 'duplicate sweep mode'
                assert value and all(type(count) is int for count in value.values()), 'invalid sweep count'
                facts['modes'][key] = value
        assert set(facts['modes']) == {kind + ' ' + mode for kind in ('RUN', 'MODE')
                                      for mode in ('off', 'count', 'throw', 'reenter')}, 'missing sweep mode'
    passed = run['status'] == 'finished' and run['exit'] == 0
    passed = passed and all(counts.get(k, -1) >= v for k, v in step.get('minimum_counts', {}).items())
    passed = passed and all(counts.get(k) == v for k, v in step.get('exact_counts', {}).items())
    return {'id': step_id, 'observation_valid': passed, 'meets_final_spec': passed, 'facts': facts,
            'argv': step.get('argv') or step['catalog']['script_text'], 'status': run['status'], 'exit': run['exit']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--revision', required=True)
    parser.add_argument('--step', required=True)
    args = parser.parse_args()
    try:
        result = run_step(args.revision, args.step)
    except Exception as exc:
        # Exception messages and child output may contain inherited environment values.
        result = {'id': args.step, 'observation_valid': False, 'meets_final_spec': False,
                  'error_type': type(exc).__name__}
    print(json.dumps(result))
    sys.exit(0 if result['observation_valid'] else 1)
