"""Summarize the independently captured composition without discarding its raw output."""
import datetime
import gzip
import hashlib
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent
plain = OUT / 'verify.json'
compressed = OUT / 'verify.json.gz'
raw = plain.read_bytes() if plain.exists() else gzip.decompress(compressed.read_bytes())
data = json.loads(raw)
run = json.loads((OUT / 'verify-run.json').read_text())
assert data['revision'] == run['head'] == '83094969e591dba5c4f25d19c572522b78a7a396'
assert data['result'] == 'checks_passed' and run['exit_code'] == 0
assert run['status_before'] == run['status_after'] == ''
assert data['environment']['node'] == run['node'] == 'v26.10.0'
assert len(data['checks']) == 13 and all(c['passed'] for c in data['checks'])

checks = []
for c in data['checks']:
    row = {k: c[k] for k in ['id', 'passed', 'exit', 'status', 'advisory', 'counts'] if k in c}
    result = c.get('result', {})
    row.update({k: result[k] for k in ['result', 'counts'] if k in result})
    if c['id'] in ['refusal-census', 'oracle-census']:
        row['census'] = json.loads(c['output'])
    checks.append(row)

adoption = next(c['result'] for c in data['checks'] if c['id'] == 'adoption')
gate = next(c['result'] for c in data['checks'] if c['id'] == 'area-gate')
summary = dict(
    revision=data['revision'], result=data['result'], checks=checks,
    start=run['start'], end=run['end'],
    seconds=(datetime.datetime.fromisoformat(run['end']) -
             datetime.datetime.fromisoformat(run['start'])).total_seconds(),
    environment=data['environment'],
    adoption={k: adoption[k] for k in ['counts', 'states', 'suite_credit', 'register', 'closures']},
    transfer_counts=dict(origins=adoption['transferred']['origins'],
                         by_decision=adoption['transferred']['by_decision']),
    area_gate={k: gate[k] for k in ['result', 'advisory', 'changed_paths', 'behaviour_paths',
                                   'touched_areas', 'areas', 'open_origins', 'reported', 'ungated']},
    profiles_not_run=data['profiles_not_run'], result_reuse=data['result_reuse'],
    acceptance=data['acceptance'], limits=data['limits'],
    raw_output=dict(path='verify.json.gz', encoding='gzip of unmodified UTF-8 JSON',
                    uncompressed_bytes=len(raw), uncompressed_sha256=hashlib.sha256(raw).hexdigest()))
(OUT / 'verify-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
compressed.write_bytes(gzip.compress(raw, mtime=0))
assert gzip.decompress(compressed.read_bytes()) == raw
print(json.dumps(dict(result=summary['result'], checks=len(checks), seconds=summary['seconds'],
                     raw_output=summary['raw_output']), indent=2))
