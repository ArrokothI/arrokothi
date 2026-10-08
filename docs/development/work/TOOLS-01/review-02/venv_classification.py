"""Review-02 probe (TOOLS01-R2-VENV-01): list the 44 register entries that item 2 (4bd40b4f) made
`held` under V-ENV by one rule, and flag those whose own reason quotes an earlier per-test reading
that excludes value capture and its serializer window. Read-only.
Usage: python3 -B venv_classification.py <repo>"""
import sys, json, subprocess, collections
repo = sys.argv[1]
def manifest(rev):
    return json.loads(subprocess.run(['git', '-C', repo, 'show', f'{rev}:tests/fixtures/packet-tools/adoption.json'],
                                     capture_output=True, check=True).stdout)
def register(doc): return {e['key']: e for e in doc['holds']['register']['entries']}
pre, post, c = (register(manifest(r)) for r in ('4bd40b4f^', '4bd40b4f', 'b104bab192f57c5ecf5b7eccebcfbda412a17b5d'))
held = lambda e: e['classification'] == 'held' and e.get('claim') == 'V-ENV'
new = sorted(k for k, e in post.items() if k not in pre and held(e))
reclassified = sorted(k for k, e in post.items() if k in pre and pre[k]['classification'] == 'not_held' and held(e))
exclusion = 'not value capture or its serializer window'
rows = []
for k in new + reclassified:
    e = c[k]
    rows.append({'key': k, 'group': 'new' if k in new else 'reclassified', 'held_at_C': held(e),
                 'reason_excludes_value_capture': exclusion in e['reason'], 'reason': e['reason']})
summary = {'new': len(new), 'reclassified': len(reclassified), 'still_held_at_C': sum(r['held_at_C'] for r in rows),
           'reason_excludes_value_capture': sum(r['reason_excludes_value_capture'] for r in rows),
           'by_file': dict(collections.Counter(r['key'].rsplit(':', 2)[0].split('/')[-1] for r in rows))}
print(json.dumps({'summary': summary, 'entries': rows}, indent=1))
