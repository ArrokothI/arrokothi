#!/usr/bin/env python3
"""Review-only pinned provenance, record conservation and two actual P1-T mapping checks.
Usage: python3 -B audit_candidate.py <clean-candidate-clone>
"""
import contextlib
import gzip
import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()
C = '28258b282532b36eef8fb1571d79b6343b54427b'
OLD = '446dd25820500db4e0eb3d6940ec49e45634f39c'
P = 'docs/development/work/TOOLS-01/'
sys.path.insert(0, str(ROOT / 'tests/tooling'))
from test_packet_tools import tool

g = tool.Git(ROOT)
assert subprocess.check_output(['node', '--version'], text=True).strip() == 'v26.10.0'
assert subprocess.check_output(['git', '-C', str(ROOT), 'rev-parse', 'HEAD'], text=True).strip() == C
spec = json.loads(g.blob(C, 'tests/fixtures/packet-tools/adoption.json'))
old = json.loads(g.blob(OLD, 'tests/fixtures/packet-tools/adoption.json'))
out = {'subject': C}

# Reviewer 01 source and evidence: only 13 trailing-whitespace trims, plus their byte counts/digests.
paths = g.files('c4a13bc2', P + 'review-01')
changed = []
for path in paths:
    if path.endswith('manifest.json'):
        continue
    before, after = g.blob('c4a13bc2', path), g.blob(C, path)
    if before != after:
        assert b'\n'.join(line.rstrip(b' \t') for line in before.split(b'\n')) == after, path
        changed.append(path)
before = json.loads(g.blob('c4a13bc2', P + 'review-01/manifest.json'))
after = json.loads(g.blob(C, P + 'review-01/manifest.json'))
expected = json.loads(json.dumps(before))
for row in expected['files']:
    raw = g.blob(C, P + 'review-01/' + row['path'])
    if P + 'review-01/' + row['path'] in changed:
        row.update(bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())
    assert row['bytes'] == len(raw) and row['sha256'] == hashlib.sha256(raw).hexdigest()
assert after == expected
out['review01_manifest_shape'] = list(after) if isinstance(after, dict) else 'list'
out['review01_trimmed'] = changed
assert len(changed) == 13

# Full scratch source is now retained as review evidence, not retroactively certified as committed.
raw = gzip.decompress((Path(__file__).parent / 'restored-target-source.json.gz').read_bytes())
source = json.loads(raw)
assert hashlib.sha256(raw).hexdigest() == 'd5ea1655908497538c545f7d94aaac451689b9b297421445779d174a28f7b278'
targets = {t['id']: t for t in spec['suite_targets']}
old_targets = {t['id']: t for t in old['suite_targets']}
scratch_targets = {t['id']: t for t in source['targets']}
overlap = set(scratch_targets) & set(old_targets)
assert len(scratch_targets) == 43 and len(overlap) == 34
assert all(scratch_targets[k] == old_targets[k] for k in overlap)
key = 'target.dispatch.1363.3.5a8d958ffdab'
assert targets[key] == scratch_targets[key]
out['restoration'] = {'sha256': hashlib.sha256(raw).hexdigest(), 'scratch_targets': 43,
    'prior_rows_equal': 34, 'previously_absent': sorted(set(scratch_targets) - set(old_targets)),
    'restored_row_equals_scratch': True, 'target': targets[key]}
historical = json.loads(gzip.decompress(g.blob(C, P + 'continuation-repair-01/targets.json.gz')))
historic = next(r for r in historical['dispatch'] if r['id'] == key)
current_anchors = [row['anchor'] for group in ('input_anchors', 'assertion_anchors', 'operation_anchors')
                   for row in targets[key].get(group, [])]
assert len(historic['anchors']) == 5
assert all(row['anchor'] == full[:120] for row, full in zip(historic['anchors'], current_anchors))
out['historical_dispatch_check'] = historic

# No additional transferred origins, no reopened origins, conservative credit withdrawal only.
assert {r['origin'] for r in old['transferred']} == {r['origin'] for r in spec['transferred']}
before_origins, after_origins = ({r['id']: r for r in x['origins']} for x in (old, spec))
assert all(before_origins[k]['state'] == after_origins[k]['state'] for k in before_origins)
changed_closures = [k for k in before_origins if before_origins[k].get('closure') != after_origins[k].get('closure')]
assert len(changed_closures) == 18
before_members, after_members = ({r['member']: r for r in x['preserved']} for x in (old, spec))
from collections import Counter
transitions = Counter((before_members[k]['status'], after_members[k]['status']) for k in before_members)
out['conservation'] = {'transfer_count': len(spec['transferred']), 'origin_states_unchanged': True,
    'closures_changed': changed_closures, 'member_status_transitions': {' -> '.join(k): v for k, v in transitions.items()}}

# The candidate's full catalog selection/environment is retained for P1-T.
tc = tool.typescript_toolchain(g, C)
cx = {r['id']: r for r in spec['counterexamples']}
registry = g.document(C, spec['registry'])
with contextlib.ExitStack() as stack:
    ctx = tool.target_context(g, C, spec, stack, tc)
    results = [tool.check_target(g, C, targets[k], cx, registry, ctx)
               for k in (key, 'target.dispatch.1426.3.5a8d958ffdab')]
    for result in results:
        assert result['refused'] == [] and result['title_kind'] == 'literal' and result['reach_run'] == 'valid'
    matched = tool.register_matches(g, C, ['packages/kernel/tests/dispatch.test.ts'],
                                   spec['holds']['register']['recipes'], ctx['environment'], tc)
    assert all(any(r['key'] == 'packages/kernel/tests/dispatch.test.ts:' + str(n) + ':3' and 'V-ENV' in r['claims']
                   for r in matched) for n in (1390, 1459))
    for result in results:
        result['refused'].append(tool.P1H_TARGET_REFUSAL.format('held'))
        result.pop('credit', None)
    out['p1t'] = results
print(json.dumps(out, indent=2))
