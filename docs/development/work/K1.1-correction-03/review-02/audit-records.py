#!/usr/bin/env python3
"""Independent record reconciliation; only reads Git and submitted JSON."""
import collections
import hashlib
import json
from pathlib import Path
import subprocess
import sys

tree = Path(sys.argv[1]).resolve()
B = 'b9c1e549c81fa4fe4f18fa1a36986f1a5581fc9b'
C = 'ad9bc8640d261ace8af5e75c47aad1bad3ca84d7'
H = '41628b8bcfd11c899c2fcf60ef4fb73c0858e298'
packet = 'docs/development/work/K1.1-correction-03/'
def git(*args): return subprocess.check_output(['git', *args], cwd=tree)
def blob(rev, path): return git('show', rev + ':' + path)
def doc(rev, path): return json.loads(blob(rev, path))
def digest(data): return hashlib.sha256(data).hexdigest()
records = {'pins': {'B': B, 'C': C, 'H': H}, 'checks': {}}
assert git('rev-parse', H + '^').decode().strip() == C
admin = git('diff', '--name-only', C, H).decode().splitlines()
assert admin == ['docs/development/007-work-packets.md', packet + 'implementation-03.md']
records['checks']['administrative_files'] = admin
records['checks']['baseline_policy_unchanged'] = {}
for path in ['AGENTS.md', *['docs/development/' + p for p in ('006-development-process.md', '008-implementation-report.md', '012-review-methods.md')]]:
    assert blob(B, path) == blob(H, path)
    records['checks']['baseline_policy_unchanged'][path] = digest(blob(B, path))
for head, integration, cleanup in [
    ('b7191dbf630defeff7756122a6798e15d0b73dd3', 'ed509e11dc39ff24e10c1ace68189776c4270919', 'e0868a085d188c09842b10f5221a016cf2facc52'),
    ('a50c38867c93c63094f271d099cec71624382577', '8f82900337e38dfdb93026b04de2066df75b175c', 'a457f8a6aeca5ccc5c94a21206b0be75315f6053')]:
    git('merge-base', '--is-ancestor', head, integration)
    git('merge-base', '--is-ancestor', integration, B)
    assert git('rev-parse', integration + '^{tree}') == git('rev-parse', cleanup + '^{tree}')
    records['checks'][integration] = {'accepted_head': head, 'ancestor_of_B': True, 'cleanup_tree_equal': True}

old = doc(B, 'tests/fixtures/packet-tools/adoption.json')
new = doc(C, 'tests/fixtures/packet-tools/adoption.json')
origB = {x['id']: x for x in old['origins']}
origC = {x['id']: x for x in new['origins']}
assert set(origB) == set(origC)
transfers = doc(C, packet + 'owner-choice-01/transferred-origins.json')
limited = doc(C, packet + 'owner-choice-01/limited-members.json')
reopened = {key for key in origB if origB[key]['state'] == 'complete' and origC[key]['state'] != 'complete'}
assert reopened == {r['origin'] for r in transfers} and len(reopened) == 15
for row in transfers:
    assert row['previous_closure'] == origB[row['origin']]['closure']
    assert origC[row['origin']]['state'] == 'pending_revalidation'
    assert 'closure' not in origC[row['origin']]
for row in new['transfer_lists']:
    assert digest(blob(C, row['list'])) == row['sha256']
for row in new['transferred']:
    for addition in row.get('limited', {}).get('added', []):
        assert digest(blob(C, addition['members'])) == addition['sha256']
assert len(limited) == len({r['member'] for r in limited}) == 24
presB = {r['member']: r for r in old['preserved']}
presC = {r['member']: r for r in new['preserved']}
for row in limited:
    assert row['origin'] in presC[row['member']]['origins']
    assert presC[row['member']]['status'] == 'refused'
cxB = {r['id']: r for r in old['counterexamples']}
cxC = {r['id']: r for r in new['counterexamples']}
dropped = set(cxB) - set(cxC)
assert len(dropped) == 96
listed_drops = {w for r in transfers for w in r['stale_witnesses']}
assert len(listed_drops) == 76 and listed_drops <= dropped
supplemental = {}
for prefix in ['artifact-21fb34d9', 'artifact-ada9f66c']:
    key = next(k for k in origC if k.startswith(prefix))
    assert origC[key]['state'] == 'complete'
    supplemental[key] = origC[key]['state']
records['adoption'] = {'reopened': sorted(reopened), 'limited_members': len(limited),
    'dropped_witnesses': len(dropped), 'linked_dropped_witnesses': len(listed_drops),
    'unlinked_dropped_witnesses': sorted(dropped - listed_drops),
    'supplemental_owner_exceptions': supplemental,
    'states': dict(collections.Counter(r['state'] for r in new['origins']))}

# Reconstruct the supplied reduced matrices independently, including the split
# sites' explicit aliases. This checks records, not the truth of a raw assertion.
rows = [json.loads(line) for line in blob(C, packet + 'c1-ablation-01.jsonl').splitlines()]
aliases = {'SPLIT-RC-ELEMENT-READ': ['RC-ELEMENT-READ'], 'SPLIT-RC-ELEMENT-READ-TWICE': ['RC-ELEMENT-READ-TWICE'],
 'SPLIT-READ-FROM-DESCRIPTOR': ['MV1-element-read-replaced-by-descriptor-value', 'VAL-object-read-from-descriptor'],
 'MV3-AT-C': ['MV3-array-symbols-listing-skipped']}
merged = {'b': {}, 'c': {}}
for row in rows:
    if row['side'] not in merged or 'file' not in row or row['mutant'] == 'control': continue
    if row['source'] == 'matrix-c-new.jsonl': continue
    for mutant in aliases.get(row['mutant'], [row['mutant']]):
        merged[row['side']][row['file'], mutant] = row
def leaves(row, which): return {p.split(' > ')[-1] for p in row.get(which, [])}
def killed(side, file, title):
    return {m for (f, m), r in merged[side].items() if f == file and
        (title in leaves(r, 'failed') or r['status'] == 'finished' and title in leaves(r, 'vanished'))}
mapping = doc(C, packet + 'c1-ablation/map.json')
aloneB = {(r['file'], r['leaf'], r['mutant']): r['alone'] for r in rows if r['side'] == 'b-alone'}
aloneC = {(r['file'], r['leaf'], r['mutant']): r['alone'] for r in rows if r['side'] == 'c-alone'}
killersC = collections.defaultdict(set)
for r in rows:
    if r['side'] == 'c' and r.get('status') == 'finished' and 'file' in r:
        for m in aliases.get(r['mutant'], [r['mutant']]):
            for leaf in leaves(r, 'failed'): killersC[m].add((r['file'], leaf))
counts = collections.Counter()
lost, vanishedC = [], []
for entry in mapping:
    file, title = entry['file'], entry['original']
    kb = killed('b', file, title)
    kc = set().union(*(killed('c', file, t) for t in entry['converted']))
    counts['pairs_at_B'] += len(kb)
    counts['kept_at_C'] += len(kb & kc)
    for m in kb & kc:
        row = merged['c'][file, m]
        if not (set(entry['converted']) & leaves(row, 'failed')): vanishedC.append([file, title, m])
    for m in kb - kc:
        br = merged['b'][file, m]
        if title in leaves(br, 'vanished'): reason = 'vanished_at_B'
        elif aloneB.get((file, title, m)) == ['passed']: reason = 'cascade_at_B'
        elif any(aloneC.get((file, t, m)) == ['failed'] for t in entry['converted']): reason = 'restored'
        elif killersC[m]: reason = 'elsewhere_at_C'
        else: reason = 'unreplaced'
        counts[reason] += 1
        lost.append({'file': file, 'original': title, 'mutant': m, 'reason': reason})
records['c1'] = {'conversion_count': len(mapping), 'counts': dict(counts), 'lost': lost,
                 'kept_only_by_vanishing_at_C': vanishedC,
                 'limits': 'Supplied reduced matrix inspected; not an independent rerun of all 1,566 file/mutant pairs. Loss replacement requires source and rerun checks as well.'}
print(json.dumps(records, indent=2))
