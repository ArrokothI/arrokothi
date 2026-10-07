"""Review 04: summarize a composed `packet_tools.py verify` output (plain or gzip JSON) per step.
Usage: python3 -B verify_summary.py verify-C.json.gz [started finished checkout] > verify-C-summary.json"""
import gzip, hashlib, json, sys

path = sys.argv[1]
raw = open(path, 'rb').read()
data = gzip.decompress(raw) if path.endswith('.gz') else raw
run = json.loads(data)
KEEP = ('result', 'states', 'transferred', 'counts', 'closures', 'targets', 'register', 'witnesses', 'preserved',
        'census', 'limited', 'kills', 'observations', 'cases', 'mutations', 'touched_areas', 'open_origins', 'reported',
        'ungated', 'changed_paths', 'behaviour_paths', 'origins', 'artifacts', 'mentions', 'additional')


def small(value, depth=0):
    """Keep scalars and small structures; summarize long lists by length."""
    if isinstance(value, list):
        return value if len(value) <= 12 and depth < 3 else {'items': len(value)}
    if isinstance(value, dict):
        return {k: small(v, depth + 1) for k, v in value.items()} if depth < 3 else {'keys': len(value)}
    return value


steps = []
for check in run['checks']:
    row = {'id': check['id'], 'passed': check['passed']}
    for field in ('status', 'exit', 'counts'):
        if field in check:
            row[field] = check[field]
    result = check.get('result')
    if isinstance(result, dict):
        row['summary'] = {k: small(v) for k, v in result.items() if k in KEEP}
        targets = result.get('targets')
        if isinstance(targets, dict) and isinstance(targets.get('results'), list):
            row['summary']['refused_targets'] = {t['id']: t['refused'] for t in targets['results'] if t['refused']}
    steps.append(row)
summary = {'command': 'python3 -B scripts/packet_tools.py verify --revision ' + run['revision'] +
                      ' --spec docs/development/work/TOOLS-01/checks.json',
           'output_sha256': hashlib.sha256(data).hexdigest(), 'output_bytes': len(data),
           'result': run['result'], 'revision': run['revision'],
           'environment': {k: run['environment'][k] for k in ('python', 'platform', 'node', 'git')},
           'profiles_not_run': run.get('profiles_not_run'), 'steps': steps}
if len(sys.argv) > 4:
    summary.update(started=sys.argv[2], finished=sys.argv[3], checkout=sys.argv[4])
print(json.dumps(summary, indent=1))
