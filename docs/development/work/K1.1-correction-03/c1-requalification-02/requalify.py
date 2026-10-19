#!/usr/bin/env python3
"""K1.1-correction-03 round 2: design check C1 judged at B and at C by the same evidence contract.

Review 01 (KC3-R1-EVID-02) found that the value-cost probe credited setup failures as kills. Implementation 03
gives it an evidence contract (tests/tooling/value-cost-probe.mjs). Rerunning the registry under it left nine
value-cost.c1.* registrations without a qualifying kill and one survivor (registrations.json). This script
runs each of them, and each group's control, through that same probe on two trees:

- C: a copy of the candidate tree, the group's converted tests (the case's own pattern), the registered edit;
- B: a worktree at B, the group's original tests (c1-ablation/map.json), the mutant's B edit
  (c1-ablation/mutants-all.json).

Usage, from the candidate root with Node v26.10.0 on PATH:
  git worktree add --detach /tmp/b b9c1e549c81fa4fe4f18fa1a36986f1a5581fc9b && ln -s "$PWD/node_modules" /tmp/b/node_modules
  python3 -B docs/development/work/K1.1-correction-03/c1-requalification-02/requalify.py /tmp/b > result.json
The B worktree is restored after each run; the candidate tree is never edited (its copy is temporary).
"""
import importlib.util
import json
import os
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path.cwd()
HERE = Path(__file__).resolve().parent
ABLATION = HERE.parent / 'c1-ablation'
spec = importlib.util.spec_from_file_location('packet_tools', ROOT / 'scripts/packet_tools.py')
tool = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tool)

PROBE = ['tests/tooling/value-cost-probe.mjs', 'tests/tooling/value-cost-witness.mjs', 'tests/tooling/value-cost-reporter.mjs']
REGISTRY = 'tests/fixtures/packet-tools/value-cost.json'
ENVIRONMENT = {name: os.environ[name] for name in ('PATH', 'HOME', 'TMPDIR') if name in os.environ}
ENVIRONMENT['LANG'] = 'C.UTF-8'
JS = set('\\^$.*+?()[]{}|/')
escape = lambda text: ''.join('\\' + ch if ch in JS else ch for ch in text)


def probe(tree, file, pattern, edits):
    case = {'id': 'requalify', 'assertion': 'requalify.selected-tests', 'input': {'file': file, 'pattern': pattern},
            'failure_exit': 17, 'argv': ['node', '--no-warnings', '--experimental-strip-types', 'tests/tooling/value-cost-probe.mjs', 'requalify'],
            'timeout_seconds': 900, 'output_limit_bytes': 32768}
    (tree / REGISTRY).parent.mkdir(parents=True, exist_ok=True)
    (tree / REGISTRY).write_text(json.dumps({'version': 1, 'cases': [case]}))
    saved = {path: (tree / path).read_text() for path, _, _ in edits}
    refused = tool.apply_edits(tree, edits) if edits else None
    try:
        if refused:
            return {'applied': refused}
        run = tool.command(case['argv'], tree, case['timeout_seconds'], case['output_limit_bytes'], ENVIRONMENT)
    finally:
        for path, text in saved.items():
            (tree / path).write_text(text)
    observation = json.loads(run['output']) if run['status'] == 'finished' else {}
    return {'runner': tool.execution_outcome(run, case)['status'], 'state': observation.get('state'), 'leaves': observation.get('leaves'),
            'failures': observation.get('failures'), 'nonqualifying': observation.get('nonqualifying')}


def main(b_tree):
    b_tree = Path(b_tree).resolve()
    records = json.loads((HERE / 'registrations.json').read_text())
    mutants = {row['id']: row for row in json.loads((ABLATION / 'mutants-all.json').read_text())}
    titles = json.loads((ABLATION / 'map.json').read_text())
    cases = {case['id']: case for case in json.loads((ROOT / REGISTRY).read_text())['cases']}
    restore_b = {path: (b_tree / path).read_bytes() if (b_tree / path).exists() else None for path in PROBE + [REGISTRY]}
    for path in PROBE:
        shutil.copyfile(ROOT / path, b_tree / path)
    out = []
    with tempfile.TemporaryDirectory(prefix='c1-requalify-') as tmp:
        c_tree = Path(tmp)
        for name in ['packages/kernel/src', 'packages/kernel/tests']:
            shutil.copytree(ROOT / name, c_tree / name)
        for name in ['package.json', 'tsconfig.json', *PROBE]:
            (c_tree / name).parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / name, c_tree / name)
        (c_tree / 'node_modules').symlink_to(ROOT / 'node_modules', target_is_directory=True)
        try:
            rows = [dict(row, kind='withdrawn') for row in records['withdrawn']] + [dict(row, kind='ported') for row in records['ported']]
            groups = sorted({row['case'] for row in rows})
            for group in groups:
                case = cases[group]
                file = case['input']['file']
                original = '^(?:' + '|'.join(escape(row['original']) for row in titles if row['file'] == file.split('/')[-1]) + ')$'
                out.append({'case': group, 'mutant': None, 'c': probe(c_tree, file, case['input']['pattern'], []),
                            'b': probe(b_tree, file, original, [])})
                for row in [row for row in rows if row['case'] == group]:
                    registration = row['registration']
                    c_edits = tool.mutation_edits(registration)
                    b_edits = []
                    for identifier in row['ablation_ids']:
                        edit = mutants[identifier]['at_b']
                        b_edits = [(e['path'], e['before'], e['after']) for e in (edit if isinstance(edit, list) else [edit])]
                        break
                    out.append({'case': group, 'mutant': registration['id'], 'ablation_ids': row['ablation_ids'], 'kind': row['kind'],
                                'c': probe(c_tree, file, case['input']['pattern'], c_edits), 'b': probe(b_tree, file, original, b_edits)})
                    print(json.dumps(out[-1])[:300], file=sys.stderr, flush=True)
        finally:
            for path, data in restore_b.items():
                if data is None:
                    (b_tree / path).unlink(missing_ok=True)
                else:
                    (b_tree / path).write_bytes(data)
    print(json.dumps({'node': os.popen('node --version').read().strip(), 'rows': out}, indent=1))


if __name__ == '__main__':
    main(sys.argv[1])
