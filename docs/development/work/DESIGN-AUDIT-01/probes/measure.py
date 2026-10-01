#!/usr/bin/env python3
"""Pinned line census and measured R8 summary; no timing thresholds."""
from pathlib import Path
import collections,hashlib,json,re,statistics,subprocess,sys
P=Path(__file__).resolve().parents[1]; ROOT=P.parents[3]; B='66bc041175e6fc191c2e7cf88de198111e7d97c9'
def source(p):return subprocess.check_output(['git','-C',str(ROOT),'show',B+':'+p]).decode()
def main():
 rows=[]
 for path in subprocess.check_output(['git','-C',str(ROOT),'ls-tree','-r','--name-only',B,'packages/kernel/src','packages/kernel/tests']).decode().splitlines():
  if not path.endswith('.ts'):continue
  t=source(path);ls=t.splitlines();rows.append({'path':path,'lines':len(ls),'nonblank':sum(bool(l.strip()) for l in ls),'sha256':hashlib.sha256(t.encode()).hexdigest()})
 # Attribution is explicit, conservative and non-additive with the enclosing files.
 ranges=[('packages/kernel/src/values.ts',1008,1409,'exclusive','Serializer-safe clone and save/swap/restore window; replaceable as a unit only after binding change'),('packages/kernel/src/own-array.ts',169,193,'exclusive','Restore engine descriptors without polluted descriptor-field conversion'),('packages/kernel/src/own-array.ts',241,245,'exclusive','Descriptor lookup for internal own-list reads'),('packages/kernel/src/values.ts',111,217,'mixed','Captured primitives include operations needed even without hostile callers'),('packages/kernel/src/values.ts',220,1006,'mixed','Snapshot, limits, diagnostics and cycle checks protect accidents too'),('packages/kernel/src/coordinator.ts',143,213,'mixed','Ambient-safe methods and their documentation intertwined with ordinary map operations'),('packages/kernel/src/own-array.ts',1,168,'mixed','Module discipline plus own-data definitions preserve __proto__ and envelope semantics too'),('packages/kernel/src/own-array.ts',194,240,'mixed','Owned list construction and append logic; replacement still needs ordinary append behavior'),('packages/kernel/src/own-array.ts',246,282,'mixed','Copies, truncation and mappings are still required')]
 strict_tests=['outcome-hostile.test.ts','poison-catalog.test.ts','recovery-ambient.test.ts','review-11-probes.test.ts','whole-view-ambient.test.ts']
 for n in strict_tests:ranges.append(('packages/kernel/tests/'+n,1,len(source('packages/kernel/tests/'+n).splitlines()),'exclusive','Dedicated same-process pollution/hostile observation corpus; shared setup included'))
 for n in ['zone-analysis.ts','zone-inventory.ts','ambient-reads.test.ts','control-commits.test.ts','fault-oracle.test.ts','fault-sweep.test.ts','host-members.test.ts']:
  ranges.append(('packages/kernel/tests/'+n,1,len(source('packages/kernel/tests/'+n).splitlines()),'infrastructure-mixed','DEC-8/9 evidence/regression machinery; ordinary atomicity/host-policy checks still useful'))
 for r in rows:
  if '/sweep/' in r['path']:ranges.append((r['path'],1,r['lines'],'infrastructure-mixed','Poison profile and/or ordinary complete-decision fault evidence'))
 for r in json.loads((P/'hostile-test-spans.json').read_text()):ranges.append((r['path'],r['start'],r['end'],'exclusive',r['reason']))
 spans=[]
 for p,a,b,kind,why in ranges:
  ls=source(p).splitlines();assert 1<=a<=b<=len(ls)
  spans.append(dict(path=p,start=a,end=b,lines=b-a+1,nonblank=sum(bool(l.strip()) for l in ls[a-1:b]),attribution=kind,rationale=why))
 classif=json.loads((P/'classifications.json').read_text());hf=[k for k,v in classif.items() if v.get('hostile_only') and v['kind']!='alias']
 hprimary=[k for k in hf if classif[k]['kind'] in ['finding','cleanup','owner-supplement']]
 costs=collections.defaultdict(list)
 for p in sorted((P/'probes/review08-output').glob('cost-*.json')):
  r=json.loads(p.read_text());assert r['exit']==0
  obj=json.loads(r['stdout']);costs[obj['shape']].append(obj)
 costrows=[dict(shape=k,runs=len(v),accepted=v[0]['ok'],ms_min=min(x['ms'] for x in v),ms_median=statistics.median(x['ms'] for x in v),ms_max=max(x['ms'] for x in v),heapMiB=[x.get('heapMiB') for x in v]) for k,v in sorted(costs.items())]
 slow=max((r for r in costrows if r['accepted']),key=lambda r:r['ms_median']);deep=next(r for r in costrows if r['shape']=='R-foreign-deep')
 totals={'production_files':sum('/src/' in r['path'] for r in rows),'production_lines':sum(r['lines'] for r in rows if '/src/' in r['path']),'test_files':sum('/tests/' in r['path'] for r in rows),'test_lines':sum(r['lines'] for r in rows if '/tests/' in r['path']),'exclusive_identified_production_lines':sum(r['lines'] for r in spans if r['attribution']=='exclusive' and '/src/' in r['path']),'exclusive_identified_test_lines':sum(r['lines'] for r in spans if r['attribution']=='exclusive' and '/tests/' in r['path']),'mixed_evidence_infrastructure_lines':sum(r['lines'] for r in spans if r['attribution']=='infrastructure-mixed'),'hostile_only_primary_findings':hprimary,'hostile_only_all_nonalias_labels':hf,'R_foreign_deep_to_slowest_sampled_acceptance_median_ratio':deep['ms_median']/slow['ms_median'],'slowest_sampled_acceptance':slow['shape']}
 md=['# Measurement results','', 'Generated by `python3 probes/measure.py` from B and the saved original review-08 probe outputs. Physical lines include comments and blanks; nonblank counts and SHA-256 are in `measurements.json`. The exclusive spans below identify dedicated hostile-caller mechanisms, not a predicted deletion diff. Their totals are a conservative attributable floor: mixed files also contain scattered hardening. Shared capture/atomicity code is explicitly not charged entirely to hostility. Do not add spans to their enclosing-file counts.','', 'No supported SDK consumer uses the private target Kernel: BASELINE states this; `compatibility-search.txt` records the matching repository dependency/import search. An API redesign still costs internal callers, fixtures, documentation and future wire design; it has no demonstrated supported SDK migration today.','', '| Selected footprint | Physical lines |','|---|---:|']
 for r in rows:
  if r['path'].endswith(('values.ts','own-array.ts','coordinator.ts','zone-analysis.ts','zone-inventory.ts')) or '/sweep/' in r['path']:md.append(f"| {r['path']} | {r['lines']} |")
 md+=['','| Attribution | Path and lines | Physical lines | Reason |','|---|---|---:|---|']
 for r in spans:md.append(f"| {r['attribution']} | {r['path']}:{r['start']}–{r['end']} | {r['lines']} | {r['rationale']} |")
 md+=['','```json',json.dumps(totals,indent=2),'```','','## Original R8 cost probe on B','','| Shape | Accepted | Runs | Min / median / max ms |','|---|---|---:|---|']
 for r in costrows:md.append(f"| {r['shape']} | {r['accepted']} | {r['runs']} | {r['ms_min']} / {r['ms_median']} / {r['ms_max']} |")
 md+=['','The ratio compares this finite corpus on this engine, not the costliest possible acceptance. Heap samples are not allocation bounds. Deep refusals remain a held observation, not a new claim invalidation or a wall-clock gate. No isolated per-operation cost follows from these end-to-end samples. `mechanism-cost.py` supplies a separate controlled ablation.']
 out={'measurements.json':json.dumps(dict(base=B,files=rows,spans=spans,totals=totals,costs=costrows),indent=2)+'\n','measurements.md':'\n'.join(md)+'\n'}
 for n,s in out.items():
  if '--check' in sys.argv:assert (P/n).read_text()==s,n
  else:(P/n).write_text(s)
 print(json.dumps(totals,indent=2))
if __name__=='__main__':main()
