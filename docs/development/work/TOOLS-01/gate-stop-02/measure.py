"""Owner choice 06 measurements (a) and (b) at HEAD with rules 1-3, using the committed gate pieces.
Run from the repository root: python3 -B docs/development/work/TOOLS-01/gate-stop-02/measure.py <out.json>"""
import importlib.util, json, sys
from collections import Counter
from pathlib import Path
ROOT = Path.cwd()
spec = importlib.util.spec_from_file_location('pt', ROOT / 'scripts/packet_tools.py')
pt = importlib.util.module_from_spec(spec); spec.loader.exec_module(pt)
git = pt.Git(ROOT)
rev = git.commit(git.run('rev-parse', 'HEAD').decode().strip())
manifest = json.loads(git.blob(rev, pt.ADOPTION_MANIFEST))
intake = pt.inventory(git, rev, manifest['inventory'])
kinds = {r['id']: r['kind'] for r in intake['origins']}
ids, area_of, paths = pt.area_map(git, rev, manifest['areas'])
origins = pt.origin_areas(git, manifest, intake, ids, area_of, paths)
def behaviour(path):  # rule 1
    return not (path.startswith(('docs/', 'mental-model/')) or ('/' not in path and path.endswith('.md')))
placed = {k: v for k, v in origins.items() if v['derived']}  # rule 2
ungated = [k for k, v in origins.items() if not v['derived']]
transferred = {row['origin'] for row in json.loads(git.blob(rev, 'docs/development/work/TOOLS-01/owner-choice-05/transferred-origins.json'))}
transferred |= {'artifact-73555fe668cc180905b1e49a', 'artifact-9fd619f5375d598ebb2b88aa', 'artifact-d2153e36d9c7464883ecea0b', 'artifact-ea5444a6d42154e413fe0f2e'}
assert len(transferred) == 44 and all(origins[k]['state'] == 'pending_revalidation' for k in transferred)
packet = git.document(rev, 'docs/development/work/TOOLS-01/verification.json')
changed = sorted({p for p in git.run('diff', '--name-only', '-z', '--no-renames', packet['base'], rev).decode().split('\0') if p} | set(packet['administrative_files']))
touched = {area_of(p) for p in changed if behaviour(p)}
a = {k: sorted(set(v['areas']) & touched) for k, v in placed.items() if k not in transferred and set(v['areas']) & touched}
a_pending = {k: v for k, v in a.items() if origins[k]['state'] == 'pending'}
print('ungated', len(ungated), Counter(origins[k]['state'] for k in ungated))
print('(a) behaviour-bearing changed paths', sum(map(behaviour, changed)), 'of', len(changed), '; touched', sorted(touched))
print('(a) pending blocked', len(a_pending), '; any open blocked', len(a), Counter(origins[k]['state'] for k in a))
print('    by touched area', Counter(x for v in a_pending.values() for x in v).most_common())
print('    single area', Counter(v[0] for v in a_pending.values() if len(v) == 1).most_common(), 'multi', sum(len(v) > 1 for v in a_pending.values()))
print('    by kind', Counter(kinds[k] for k in a_pending))
kernel = {area_of(p) for p in paths if p.startswith('packages/kernel/')}
b = {k: v for k, v in placed.items() if set(v['areas']) & kernel}
print('(b) kernel areas', sorted(kernel), '; open blocked', len(b), Counter(v['state'] for v in b.values()))
print('    by kind', Counter(kinds[k] for k in b))
src = Counter('/'.join(Path(rowpath).parts[:4]) for rowpath in [next(r['path'] for r in intake['origins'] if r['id'] == k) for k in b])
print('    by source', src.most_common(8))
json.dump({'touched': sorted(touched), 'a': a, 'b': {k: v['areas'] for k, v in b.items()}, 'ungated': ungated},
          open(sys.argv[1], 'w'), indent=1)
