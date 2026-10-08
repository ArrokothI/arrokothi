"""Review 04, check 7: the seeded soundness sample. Read-only. Usage: python3 -B sample.py <repo> > sample.json.
Within each stratum, keys are ordered by SHA-256 of the salt, a newline and the key, and the first `quota`
are taken. Strata and quotas were fixed before any sampled entry was read."""
import collections, hashlib, json, re, subprocess, sys

REPO = sys.argv[1]
SALT = 'review-04/claude-opus-5-5/2026-10-07'
C, PREV_H, H = '28258b282532b36eef8fb1571d79b6343b54427b', '446dd25820500db4e0eb3d6940ec49e45634f39c', '7f3a2af46d714dc2a0e47a755ccd4fe8aeb0ba94'
load = lambda rev, path: json.loads(subprocess.run(['git', '-C', REPO, 'show', f'{rev}:{path}'], capture_output=True, check=True).stdout)
c, p = load(C, 'tests/fixtures/packet-tools/adoption.json'), load(PREV_H, 'tests/fixtures/packet-tools/adoption.json')
r2 = {e['key'] for e in load(H, 'docs/development/work/TOOLS-01/review-02/venv-classification.json')['entries']}
EP = {e['key']: e for e in p['holds']['register']['entries']}
order = lambda key: hashlib.sha256((SALT + '\n' + key).encode()).hexdigest()


def stratum(e):
    key = e['key']
    if key in r2:
        return 'A review 02 44'
    if key not in EP:
        if key.startswith('case:'):
            return 'B new case'
        return 'C1 new leaf, child-process only' if 'finds child-process in its run set' in e['reason'] else 'C2 new leaf, other detector kinds'
    return 'D former not_held' if EP[key]['classification'] == 'not_held' else 'E V-ENV before this round'


quota = {'A review 02 44': 3, 'B new case': 1, 'C1 new leaf, child-process only': 1, 'C2 new leaf, other detector kinds': 2,
         'D former not_held': 1, 'E V-ENV before this round': 2}
strata = collections.defaultdict(list)
for e in c['holds']['register']['entries']:
    if e.get('decision') == 'docs/development/work/TOOLS-01/owner-choice-08.md':
        strata[stratum(e)].append(e['key'])
OC, OP = {o['id']: o for o in c['origins']}, {o['id']: o for o in p['origins']}
relinked = sorted(k for k, o in OC.items() if o['state'] == 'complete' and o['closure'] != OP[k]['closure'])
print(json.dumps({'salt': SALT, 'method': 'per stratum: sort keys by sha256(salt + "\\n" + key), take quota',
                  'strata': {s: len(v) for s, v in sorted(strata.items())}, 'quota': quota,
                  'held': {s: sorted(v, key=order)[:quota[s]] for s, v in sorted(strata.items())},
                  'relinked_population': len(relinked), 'relinked': sorted(relinked, key=order)[:5]}, indent=1))
