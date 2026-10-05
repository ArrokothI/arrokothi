"""Review-02 probe: per-origin area derivation at a revision, using the candidate's own functions.
Usage: python3 -B gate_areas.py <repo> <revision>. Writes nothing into the repository."""
import sys, json, collections, posixpath, re
sys.dont_write_bytecode = True
repo, rev = sys.argv[1], sys.argv[2]
sys.path.insert(0, repo + '/scripts')
import packet_tools as pt
git = pt.Git(__import__('pathlib').Path(repo)); rev = git.commit(rev)
spec = git.document(rev, pt.ADOPTION_MANIFEST, versions=(2,))
intake = pt.inventory(git, rev, spec['inventory'])
ids, area_of, paths = pt.area_map(git, rev, spec['areas'])
res = pt.origin_areas(git, spec, intake, ids, area_of, paths)
full = {k for k, r in res.items() if len(r['areas']) == len(ids)}
print(json.dumps({'open': len(res), 'ungated': sum(not r['derived'] for r in res.values()),
                  'every_area': len(full), 'every_area_ids': sorted(full)[:20],
                  'areas_hist': collections.Counter(len(r['areas']) for r in res.values()).most_common()}, indent=1))
