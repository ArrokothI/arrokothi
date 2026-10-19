#!/usr/bin/env python3
"""C1 registry cases: for each converted-test group, the mutants its original tests killed at B (each kill
reproduced alone, not a vanished or cascaded leaf) that the converted tests still kill at C.

Run from the repository root:  python3 -B build_c1_cases.py  (reads analysis3.json, the analyze.py output over
the merged C matrix, beside this script; writes c1-after-cases.json, which the value-cost.json generator merged
into the registry as the seven value-cost.c1.* cases)
"""
import json
import pathlib
import sys
from collections import defaultdict

ROOT = pathlib.Path.cwd()
sys.path.insert(0, str(ROOT / 'scripts'))
import packet_tools  # noqa: E402

HERE = pathlib.Path(__file__).resolve().parent
analysis = json.loads((HERE / 'analysis3.json').read_text())
mutants_all = {m['id']: m for m in json.loads((HERE / 'mutants-all.json').read_text())}
split = {m['id']: m for m in json.loads((HERE / 'mutants-split.json').read_text())}
mv3 = {m['id']: m for m in json.loads((HERE / 'mutants-mv3.json').read_text())}
C_EDITS = {
    'RC-ELEMENT-READ': split['SPLIT-RC-ELEMENT-READ']['at_c'],
    'RC-ELEMENT-READ-TWICE': split['SPLIT-RC-ELEMENT-READ-TWICE']['at_c'],
    'MV1-element-read-replaced-by-descriptor-value': split['SPLIT-READ-FROM-DESCRIPTOR']['at_c'],
    'VAL-object-read-from-descriptor': split['SPLIT-READ-FROM-DESCRIPTOR']['at_c'],
    'MV3-array-symbols-listing-skipped': mv3['MV3-AT-C']['at_c'],
}
# Kills added by strengthening after the matrix ran, each reproduced alone at C (snap-c.jsonl).
ADDED = {'ingress.test.ts': ['VAL-snapshot-is-caller-object', 'VAL-snapshot-rereads-caller']}
CLOSURE = {
    'values.test.ts': ['harness.ts', 'capture-instruments.ts'],
    'value-diagnostic-work.test.ts': ['harness.ts', 'capture-instruments.ts', 'refusal-diagnostics-fixture.ts'],
    'value-refusal-cost.test.ts': ['harness.ts', 'capture-instruments.ts', 'refusal-diagnostics-fixture.ts'],
    'creation.test.ts': ['harness.ts', 'capture-instruments.ts'],
    'ingress.test.ts': ['harness.ts', 'capture-instruments.ts'],
    'dispatch.test.ts': ['harness.ts', 'capture-instruments.ts'],
    'outcome-hostile.test.ts': ['harness.ts', 'capture-instruments.ts'],
}
JS_SPECIAL = set('\\^$.*+?()[]{}|/')


def js_escape(text):
    return ''.join('\\' + ch if ch in JS_SPECIAL else ch for ch in text)


def c_edits(mid):
    edits = C_EDITS.get(mid) or mutants_all[mid]['at_c']
    return edits if isinstance(edits, list) else [edits]


groups = defaultdict(lambda: {'tests': [], 'mutants': set()})
for row in analysis['converted']:
    group = groups[row['file']]
    group['tests'] += [t for t in row['converted'] if t not in group['tests']]
    group['mutants'] |= set(row['killed_at_b']) & set(row['killed_at_c'])
for name, extra in ADDED.items():
    groups[name]['mutants'] |= set(extra)

cases = []
for name in sorted(groups):
    group = groups[name]
    stem = name[:-len('.test.ts')]
    file = 'packages/kernel/tests/' + name
    by_key = {}
    for mid in sorted(group['mutants']):
        edits = c_edits(mid)
        for edit in edits:
            text = (ROOT / edit['path']).read_text()
            assert text.count(edit['before']) == 1, (mid, edit['before'][:60], text.count(edit['before']))
        row = ({'path': edits[0]['path'], 'before': edits[0]['before'], 'after': edits[0]['after']} if len(edits) == 1
               else {'edits': edits})
        row['operator'] = 'c1-ablation'
        key = packet_tools.mutation_key(row)
        by_key.setdefault(key, (row, []))[1].append(mid)
    mutants = []
    for key, (row, ids) in by_key.items():
        mutants.append({'id': key, **row, 'name': ' + '.join(ids) + f' (C1: killed by the {stem} converted tests at B and at C)'})
    pattern = '^(?:' + '|'.join(js_escape(t) for t in group['tests']) + ')$'
    case_id = f'value-cost.c1.{stem}'
    cases.append({
        'id': case_id, 'category': 'value-cost', 'assertion': case_id + '.converted-tests',
        'source': f'K1.1-correction-03 design check C1: the {len(group["tests"])} converted Proxy-instrument tests of {file} '
                  f'still kill the mutants their originals killed at B',
        'input': {'file': file, 'pattern': pattern, 'timeout_ms': 170000},
        'files': ['tests/tooling/value-cost-probe.mjs'],
        'argv': ['node', '--no-warnings', '--experimental-strip-types', 'tests/tooling/value-cost-probe.mjs', case_id],
        'timeout_seconds': 180, 'output_limit_bytes': 32768, 'failure_exit': 17, 'mutants': mutants,
        'closure': [file] + ['packages/kernel/tests/' + helper for helper in CLOSURE[name]],
    })
    print(case_id, len(group['tests']), 'tests', len(mutants), 'mutants', file=sys.stderr)
(HERE / 'c1-after-cases.json').write_text(json.dumps(cases, indent=1) + '\n')
