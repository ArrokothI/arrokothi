"""Review-02 probe: print the adoption facts for named origins at a revision (read-only).
Usage: python3 -B origin_facts.py <repo> <full-rev> <origin-id>..."""
import sys, json
sys.dont_write_bytecode = True
repo, rev, ids = sys.argv[1], sys.argv[2], sys.argv[3:]
sys.path.insert(0, repo + '/scripts')
import packet_tools as pt
from pathlib import Path
git = pt.Git(Path(repo)); rev = git.commit(rev)
spec = git.document(rev, pt.ADOPTION_MANIFEST, versions=(2,))
intake = pt.inventory(git, rev, spec['inventory'])
io = {r['id']: r for r in intake['origins']}
rows = {r['id']: r for r in spec['origins']}
cx = {r['id']: r for r in spec['counterexamples']}
tg = {r['id']: r for r in spec['suite_targets']}
for k in ids:
    o = io[k]; r = rows[k]
    print('=' * 100); print(k, r['state'])
    print('ORIGIN', json.dumps({x: o[x] for x in o if x not in ('text',)})[:700])
    print('LEGACY', json.dumps(r.get('legacy'))[:900])
    cl = r.get('closure', {})
    print('CONTEXT', cl.get('context'), cl.get('context_reasons'), 'NONEXEC', cl.get('non_executable'))
    links = cl.get('links', [])
    mem = [m for m in spec['preserved'] if k in m['origins']]
    print('MEMBERS', len(mem), dict(__import__('collections').Counter(m['status'] for m in mem)))
    for m in mem[:12]:
        print('   ', m['member'], m['status'], m.get('title', '')[:70] if isinstance(m.get('title'), str) else m.get('title'), m.get('reasons'))
    for l in links[:12]:
        if l['kind'] == 'target':
            t = tg[l['id']]; print('  TARGET', l['id'], t['member'], t['relation'], json.dumps(t['discrimination'])[:300])
        elif l['kind'] == 'counterexample':
            c = cx[l['id']]; print('  CX', l['id'], c['kind'], c.get('claim'), c['members'][:3], c['required_result'][:200])
        else:
            print('  LINK', l)
    if len(links) > 12: print('  ... links', len(links))
