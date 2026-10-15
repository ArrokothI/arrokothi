#!/usr/bin/env python3
"""Validate the delivered review records and hash the packet; no candidate writes."""
import ast, datetime, hashlib, json, re, subprocess
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[4]
REVIEW=HERE.parent/'review-02.md'
B='b9c1e549c81fa4fe4f18fa1a36986f1a5581fc9b'
C='ad9bc8640d261ace8af5e75c47aad1bad3ca84d7'
H='41628b8bcfd11c899c2fcf60ef4fb73c0858e298'
CTREE=Path('/private/tmp/arrokothi-kc3-review02-c')
BTREE=Path('/private/tmp/arrokothi-kc3-review02-b')
def git(tree,*args):return subprocess.check_output(['git',*args],cwd=tree,text=True).strip()
def read(name):return json.loads((HERE/name).read_text())
assert git(ROOT,'rev-parse','HEAD')==H
assert git(CTREE,'rev-parse','HEAD')==C
assert git(BTREE,'rev-parse','HEAD')==B
assert not git(ROOT,'diff','HEAD','--')
assert not git(CTREE,'status','--porcelain')
assert not git(BTREE,'diff','HEAD','--')
assert git(BTREE,'status','--porcelain') in ('','?? node_modules')
allowed={str(REVIEW.relative_to(ROOT))}
untracked=git(ROOT,'ls-files','--others','--exclude-standard').splitlines()
assert all(p in allowed or p.startswith(str(HERE.relative_to(ROOT))+'/') for p in untracked),untracked
admin=git(ROOT,'diff','--name-only',C,H).splitlines()
assert admin==['docs/development/007-work-packets.md','docs/development/work/K1.1-correction-03/implementation-03.md']
for row in read('pinned-inputs.json'):
    data=subprocess.check_output(['git','show',row['revision']+':'+row['path']],cwd=ROOT)
    assert hashlib.sha256(data).hexdigest()==row['sha256']
assert read('verify.json')['result']=='checks_passed'
assert read('verify-run.json')['exit_code']==0
assert read('verify-run.json')['node']=='v26.10.0'
assert read('verify-run.json')['clean_before']==read('verify-run.json')['clean_after']==''
for r in read('required-followups.json'):
    assert r['exit']==0 and r['clean_before']==r['clean_after']==''
expected={'original-stop':1,'original-declared-limit':1,'builder-docs-C':1,'builder-docs-B':1}
for r in read('review-probes.json'):
    assert r['exit']==expected.get(r['name'],0),r
for r in read('extra-probes.json'):assert r['exit']==0 and r['clean_before']==r['clean_after']==''
trace=read('continuations.stdout.log'); assert trace['exit']==0
trace=json.loads(trace['stdout']); assert trace['postStopHelpers']==trace['forbiddenCalls']==0
assert trace['shapes']==1824 and trace['runs']==359254
stop=read('stop-corpus.stdout.log')
assert json.loads(stop['static']['stdout'])['violations']==[]
assert stop['maintained']['exit']==0 and 'tests 475' in stop['maintained']['stdout'] and 'pass 475' in stop['maintained']['stdout']
assert json.loads(stop['trace']['stdout'])['continuations']==[{'site':'defineAt','stopped':True},{'site':'finishArray','stopped':True}]
false_credit=['callback_doesNotThrow_nonmatching','callback_doesNotReject_nonmatching','comparison_getter','predicate_callback',
    'harness_malformed_refusal','harness_truthy_ok_subject_value','harness_changing_ok_subject_value','harness_missing_error']
attribution={r['scenario']:r for r in read('attribution-02.stdout.log')['rows']}
assert all(attribution[k]['outcome']['status']=='killed' for k in false_credit)
assert attribution['direct_subject_exception']['outcome']['status']=='setup_error'
assert attribution['passing']['outcome']['status']=='survived'
assert attribution['genuine_assertion']['outcome']['status']=='killed'
group=next(r for r in read('c1-requalification.stdout.log')['rows'] if r['case']=='value-cost.c1.ingress' and r.get('ablation_ids')==['O-APPENDOWN-PUSH'])
assert group['b']['runner']=='killed' and group['c']['runner']=='setup_error'
direct=read('c1-direct.stdout.log')['runs']
assert 'expected acceptance, got malformed_value' in direct[0]['stdout']
assert 'Cannot convert undefined or null to object' in direct[1]['stdout']
for p in HERE.glob('*.py'):ast.parse(p.read_text(),filename=str(p))
assert REVIEW.read_text().rstrip().endswith('\nCHANGES REQUIRED')
assert (HERE/'owner-supplements.txt').read_text().strip() in REVIEW.read_text()
for filename in ('review-02.md','review-02/README.md','review-02/brief-03.md'):
    p=HERE.parent/filename
    for target in re.findall(r'\]\(([^)]+)\)',p.read_text()):
        if '://' in target or target.startswith('#'):continue
        linked=(p.parent/target.split('#')[0]).resolve()
        if linked in (HERE/'final-check.json',HERE/'manifest.json'):continue
        assert linked.exists(),(str(p),target)
rawdiff=subprocess.check_output(['git','diff','--binary',B,H],cwd=ROOT)
assert hashlib.sha256(rawdiff).hexdigest()==hashlib.sha256((HERE/'cumulative.diff').read_bytes()).hexdigest()
check={'time_utc':datetime.datetime.now(datetime.UTC).isoformat(),'B':B,'C':C,'H':H,
    'main_head':git(ROOT,'rev-parse','HEAD'),'main_tracked_diff':'','main_untracked_scope':'review-02.md and review-02/ only',
    'C_head':git(CTREE,'rev-parse','HEAD'),'C_status':git(CTREE,'status','--porcelain'),
    'C_shallow':git(CTREE,'rev-parse','--is-shallow-repository'),
    'B_head':git(BTREE,'rev-parse','HEAD'),'B_tracked_diff':'','B_status':git(BTREE,'status','--porcelain'),
    'administrative_files':admin,'pinned_input_hashes':'verified','cumulative_diff_hash':'matches fresh B..H binary diff',
    'required_and_review_results':'validated against raw records','new_counterexample_observations':'validated',
    'python_sources':'all parse','local_links':'all resolve (manifest written next)','owner_supplements':'verbatim match',
    'review_final_line':'CHANGES REQUIRED','candidate_changes':False,'commits_or_pushes':False}
(HERE/'final-check.json').write_text(json.dumps(check,indent=2)+'\n')
manifest=HERE/'manifest.json'
files=sorted([REVIEW]+[p for p in HERE.rglob('*') if p.is_file() and p!=manifest],key=lambda p:str(p))
rows=[]
for p in files:
    data=p.read_bytes(); rows.append({'path':str(p.relative_to(ROOT)),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
result={'algorithm':'SHA-256','path_base':'repository root','reviewed_head':H,
    'excluded':[str(manifest.relative_to(ROOT))],'files':rows}
manifest.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'files':len(rows),'bytes':sum(r['bytes'] for r in rows),'manifest':str(manifest),'candidate_unchanged':True},indent=2))
