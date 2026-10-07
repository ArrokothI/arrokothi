"""Review 04, checks 3 and 4 and the report's figures, recomputed from adoption.json at C and at the previous H.
Read-only. Usage: python3 -B limits_relinks.py <repo> > limits-relinks.json.
P1-T results are not stored in the manifest; the two P1-H-refused mapping targets are taken from the
composed verify at C (verify-C-summary.json lists the refused targets), and every other target counts as
credited, which that run also reports (381 credited readings)."""
import collections, gzip, hashlib, io, json, subprocess, sys

REPO = sys.argv[1]
C, PREV_H = '28258b282532b36eef8fb1571d79b6343b54427b', '446dd25820500db4e0eb3d6940ec49e45634f39c'
W = 'docs/development/work/TOOLS-01/'
MAPPING = {'target.dispatch.1363.3.5a8d958ffdab', 'target.dispatch.1426.3.5a8d958ffdab'}


def blob(rev, path):
    return subprocess.run(['git', '-C', REPO, 'show', f'{rev}:{path}'], capture_output=True, check=True).stdout


load = lambda rev, path: json.loads(blob(rev, path))
c, p = load(C, 'tests/fixtures/packet-tools/adoption.json'), load(PREV_H, 'tests/fixtures/packet-tools/adoption.json')
out = {}

# Report figures.
out['figures'] = {
    'origins_by_state': dict(collections.Counter(o['state'] for o in c['origins'])),
    'preserved_census': dict(collections.Counter(m['status'] for m in c['preserved'])),
    'preserved_census_previous_h': dict(collections.Counter(m['status'] for m in p['preserved'])),
    'suite_targets': len(c['suite_targets']),
    'witness_records': dict(collections.Counter(x['kind'] for x in c['counterexamples'] if x['kind'] != 'behavior')),
    'closures': sum(o['state'] == 'complete' for o in c['origins']),
    'context_ranges': sum(len(o['closure'].get('context', [])) for o in c['origins'] if o['state'] == 'complete'),
    'transferred_by_decision': dict(collections.Counter(r['decision'].split('/')[-1] for r in c['transferred'])),
    'families': len(c['families']), 'family_members': sum(len(f['members']) for f in c['families']),
    'registry_cases': len(load(C, 'tests/fixtures/packet-tools/mutations.json')['cases']),
    'refusal_ablations': len(load(C, 'tests/fixtures/packet-tools/refusal-guards.json')['cases']),
}
targets_prev = {t['id'] for t in p['suite_targets']}
targets_c = {t['id'] for t in c['suite_targets']}
out['figures']['targets_removed'] = sorted(targets_prev - targets_c)
out['figures']['targets_added'] = sorted(targets_c - targets_prev)

# Check 4: transfers and closed origins.
pending_rev = {o['id'] for o in c['origins'] if o['state'] == 'pending_revalidation'}
transferred = {r['origin']: r['decision'] for r in c['transferred']}
lists = {row['decision']: row for row in c['transfer_lists']}
listed = {d: {x['origin'] for x in json.loads(blob(C, row['list']))} for d, row in lists.items()}
out['transfers'] = {
    'pending_revalidation_equals_transferred': pending_rev == set(transferred), 'count': len(transferred),
    'each_list_digest_matches': all(hashlib.sha256(blob(C, row['list'])).hexdigest() == row['sha256'] for row in lists.values()),
    'each_list_equals_its_rows': all(listed[d] == {o for o, dd in transferred.items() if dd == d} for d in listed),
    'unchanged_since_previous_h': {r['origin']: r['decision'] for r in p['transferred']} == transferred,
}
OC, OP = {o['id']: o for o in c['origins']}, {o['id']: o for o in p['origins']}
complete_c = {k for k, o in OC.items() if o['state'] == 'complete'}
complete_p = {k for k, o in OP.items() if o['state'] == 'complete'}
CX, M, T = {x['id']: x for x in c['counterexamples']}, {m['member']: m for m in c['preserved']}, {t['id']: t for t in c['suite_targets']}
TP = {t['id']: t for t in p['suite_targets']}
REG = {e['key']: e for e in c['holds']['register']['entries']}
leaf = lambda m: f"{M[m]['file']}:{M[m]['current'][0]}:{M[m]['current'][1]}"
relinked, defects = {}, []
for k in sorted(complete_c):
    if OC[k]['closure'] == OP[k]['closure']:
        continue
    before = {json.dumps(l, sort_keys=True) for l in OP[k]['closure']['links']}
    after = {json.dumps(l, sort_keys=True) for l in OC[k]['closure']['links']}
    removed, added = [json.loads(x) for x in sorted(before - after)], [json.loads(x) for x in sorted(after - before)]
    if OC[k]['closure'].get('context') != OP[k]['closure'].get('context'):
        defects.append((k, 'context changed'))
    links = collections.defaultdict(set)
    for l in OC[k]['closure']['links']:
        links[l['kind']].add(l['id'])
    for t in links['target']:
        if t in MAPPING or t not in T:
            defects.append((k, 'links a refused or absent target', t))
    for m in (m for m in M.values() if k in m['origins']):
        if m['status'] == 'refused' and not any(T[t].get('member') == m['member'] for t in links['target']):
            defects.append((k, 'refused member without a linked target', m['member']))
        if m['status'] in ('held', 'superseded') and not any(
                CX[x]['kind'] == m['status'] + '_witness' and k in CX[x]['origins'] and m['member'] in CX[x].get('members', [])
                for x in links['counterexample']):
            defects.append((k, 'held member without its witness', m['member']))
    witnesses = [a['id'] for a in added if a['kind'] == 'counterexample']
    covered = set()
    for w in witnesses:
        x = CX[w]
        for m in x['members']:
            e = REG.get(leaf(m))
            ok = x['kind'] == 'held_witness' and M[m]['status'] == 'held' and e and e['classification'] == 'held' and e['claim'] == x['claim']
            if not ok:
                defects.append((k, 'added link is not a valid held witness', w, m))
            covered.add(leaf(m))
    routes = []
    for r in removed:
        if r['kind'] == 'target':
            t = TP[r['id']]
            declared = f"{t['file']}:{t['declaration']['line']}:{t['declaration']['column']}"
            routes.append({'removed_target': r['id'], 'leaf': declared, 'held_witness_on_same_leaf': declared in covered,
                           'target_still_in_table': r['id'] in T})
            if declared not in covered:
                defects.append((k, 'removed target without a same-leaf held witness', r['id']))
        else:
            defects.append((k, 'removed a non-target link', r))
    relinked[k] = {'path': None, 'links_before': len(before), 'links_after': len(after),
                   'members': dict(collections.Counter(m['status'] for m in M.values() if k in m['origins'])),
                   'removed_targets': routes, 'added_witnesses': [
                       {'id': w, 'claim': CX[w]['claim'], 'leaves': sorted({leaf(m) for m in CX[w]['members']}),
                        'register': sorted({REG[leaf(m)]['decision'].split('/')[-1] for m in CX[w]['members']}),
                        'witness_names_this_origin': k in CX[w]['origins']} for w in witnesses]}
out['closed_origins'] = {'complete_at_c': len(complete_c), 'same_set_as_previous_h': complete_c == complete_p,
                         'reopened': sorted(complete_p - complete_c), 'newly_closed': sorted(complete_c - complete_p),
                         'relinked_count': len(relinked), 'defects': defects, 'relinked': relinked}

# Check 3: C2-LIMIT recomputed from the manifests.
members_list = load(C, W + 'continuation-stop-01/unbound-members.json')
L24 = {r['member'] for r in members_list['rows']}
by_member = collections.defaultdict(list)
for t in c['suite_targets']:
    if 'member' in t:
        by_member[t['member']].append(t['id'])
limits = {}
for r in (r for r in c['transferred'] if 'limited' in r):
    o = r['origin']
    in_origin = {k for k, m in M.items() if o in m['origins']}
    unbound = {k for k in in_origin if M[k]['status'] == 'refused' and not any(t not in MAPPING for t in by_member.get(k, []))}
    extras = []
    for x in r['limited']['extras']:
        t = T[x['target']]
        decl = f"{t['file']}:{t['declaration']['line']}:{t['declaration']['column']}"
        extras.append({'member': x['member'], 'target': x['target'], 'targets_naming_member': by_member.get(x['member']),
                       'declared_at': decl, 'register_at_declaration': {f: REG.get(decl, {}).get(f) for f in ('classification', 'claim', 'decision')},
                       'title_kind_of_member': M[x['member']]['title_kind'], 'member_status': M[x['member']]['status']})
    limits[o] = {'members': len(in_origin), 'refused': sum(M[k]['status'] == 'refused' for k in in_origin), 'unbound': len(unbound),
                 'listed_24_in_origin': len(L24 & in_origin),
                 'unbound_equals_listed_plus_extras': unbound == (L24 & in_origin) | {x['member'] for x in r['limited']['extras']},
                 'extras': extras, 'list_sha256_matches': hashlib.sha256(blob(C, r['limited']['members'])).hexdigest() == r['limited']['sha256']}
out['limited'] = {'origins': limits, 'total_unbound': sum(v['unbound'] for v in limits.values()), 'listed': len(L24)}

# The restored 1363:3 target against the committed check record (continuation-repair-01/targets.json.gz).
record = next(x for x in json.loads(gzip.decompress(blob(C, W + 'continuation-repair-01/targets.json.gz')))['dispatch']
              if x['id'] == 'target.dispatch.1363.3.5a8d958ffdab')
target = T['target.dispatch.1363.3.5a8d958ffdab']
source = blob(C, target['file']).decode()
anchors = [a['anchor'] for a in target['input_anchors'] + target['assertion_anchors']]
lines = source.split('\n')
start = sum(len(l) + 1 for l in lines[:target['declaration']['line'] - 1])
following = next(i for i in range(target['declaration']['line'], len(lines)) if lines[i].startswith('  test('))
end = sum(len(l) + 1 for l in lines[:following])  # the leaf's span ends where the next sibling test starts
out['restored_target'] = {
    'committed_record_refused': record['refused'], 'committed_reach_run': record['reach_run'], 'committed_credit': record['credit'],
    'anchors': [{'role': rec['role'], 'manifest_extends_committed_prefix': full.startswith(rec['anchor']),
                 'occurrences_at_c': source.count(full), 'offset_at_c_equals_committed': source.find(full) == rec['offset'],
                 'inside_declared_leaf_span': start <= source.find(full) < end}
                for rec, full in zip(record['anchors'], anchors)],
    'member': target['member'], 'declaration': target['declaration'], 'test_path': target['test_path'],
}
print(json.dumps(out, indent=1))
