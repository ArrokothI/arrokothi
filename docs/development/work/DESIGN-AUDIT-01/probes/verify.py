#!/usr/bin/env python3
"""Deterministic packet checks, including the owner's narrow DA-7 exception."""
from pathlib import Path
import argparse,hashlib,json,re,subprocess,sys
sys.dont_write_bytecode = True
from session import SESSION
print(SESSION)
print("Python",sys.version.split()[0],"Node",subprocess.check_output(["node","--version"]).decode().strip())
P=Path(__file__).resolve().parents[1];R=P.parents[3];B='66bc041175e6fc191c2e7cf88de198111e7d97c9'
a=argparse.ArgumentParser();a.add_argument('--require-clean',action='store_true');a.add_argument('--C');args=a.parse_args()
def git(*x):return subprocess.check_output(['git','-C',str(R),*x]).decode()
if args.require_clean:assert not git('status','--porcelain').strip(),'working tree is not clean'
packet=str(P.relative_to(R))+'/'
changed=git('diff','--name-only',B).splitlines()
assert all(p.startswith(packet) or p=='docs/development/007-work-packets.md' for p in changed),changed
review_record='1df760718215f9c45475163a883c259d09782dc3'
for path in git('diff','--name-only',review_record).splitlines():
 assert path.startswith(packet) or path=='docs/development/007-work-packets.md',path
 if path.startswith(packet+'review-01') or path in [packet+n for n in ['design-01.md','implementation-01.md','invalidation-01.md','stop-01.md','brief-01.md']]:
  raise AssertionError(('historical record edited',path))
old_ledger=git('show',review_record+':docs/development/007-work-packets.md').splitlines()
new_ledger=(R/'docs/development/007-work-packets.md').read_text().splitlines()
assert [l for l in old_ledger if not l.startswith('| DESIGN-AUDIT-01 |')]==[l for l in new_ledger if not l.startswith('| DESIGN-AUDIT-01 |')]
ledger=R/'docs/development/007-work-packets.md';before=git('show',B+':'+str(ledger.relative_to(R))).splitlines();after=ledger.read_text().splitlines()
assert len(before)==len(after)
for b,c in zip(before,after):
 if b==c:continue
 if b.startswith('| DESIGN-AUDIT-01 |'):continue
 assert b.startswith('| K1.1 |'),(b,c)
 assert c.startswith(b[:-2]),'K1.1 historical row changed'
 assert c.count('DESIGN-AUDIT-01 invalidation-01')==1
assert (P/'invalidation-01.md').exists() and not (P/'decision-drafts/invalidation-01.md').exists()
assert '## Owner adoption, 2026-10-01' in (P/'invalidation-01.md').read_text()
for script in [P/'enumerate.py',P/'probes/catalog.py',P/'probes/records.py',P/'probes/measure.py',P/'probes/render-register.py',P/'probes/searches.py',P/'probes/round2-checks.py']:
 r=subprocess.run([sys.executable,str(script),'--check'],capture_output=True,text=True);assert r.returncode==0,(str(script),r.stdout,r.stderr)
 print(script.name,'exit',r.returncode,'PASS')
 if script.name in ['render-register.py','round2-checks.py']: print(r.stdout.strip())
enum=json.loads((P/'enumeration-summary.json').read_text());reg=(P/'register.md').read_text()
for item in [*'ABCDEF',*enum['families']]:
 assert (P/'decision-drafts'/f'{item}.md').exists(),item
 assert re.search(r'^#{2,3} '+item+r' — ',reg,re.M),item
 if item in enum['families']:assert enum['families'][item]['qualifies'],item
for key,v in json.loads((P/'classifications.json').read_text()).items():
 assert v['summary'].strip(),key
 if v['kind']=='alias':assert v['alias_of'] in json.loads((P/'classifications.json').read_text()),key
# Every register item/family has keep plus an alternative and a nonempty closure column.
sections=re.split(r'\n#{2,3} (?:[A-F]|F\d\d) — ',reg)[1:]
for section in sections:
 tables=[l for l in section.splitlines() if l.startswith('|')]
 assert len(tables)>=4,section[:80]
 assert any('Keep' in l for l in tables),section[:80]
 assert any('Recommend' in l or 'recommend' in l for l in tables),section[:80]
 for row in tables[2:]:assert row.strip('| ').split('|')[-1].strip(),row
# Check local file links (fragments separately remain semantic navigation, not existence evidence).
links=0
for p in P.rglob('*.md'):
 if 'review-01' in p.relative_to(P).parts: continue  # immutable reviewer scratchpad locators, mapped in its README
 s=p.read_text();s=re.sub(r'```.*?```','',s,flags=re.S)
 for target in re.findall(r'(?<!!)\[[^\]\n]+\]\(([^)]+)\)',s):
  if target.startswith(('http:','https:','mailto:','#')):continue
  t=target.split('#')[0].split(' "')[0]
  if not t:continue
  assert (p.parent/t).exists(),(str(p.relative_to(R)),target)
  links+=1
# Saved output identities and actual run dispositions, without rerunning censored timing observations.
manifest=json.loads((P/'probes/review08-output/manifest-all.json').read_text())
for path,digest in manifest['sources'].items():assert hashlib.sha256((R/path).read_bytes()).hexdigest()==digest,path
for label in manifest['runs']:
 r=json.loads((P/'probes/review08-output'/f'{label}.json').read_text());assert r['label']==label
 assert r['exit']==0 or label.startswith('n15-mutant-'),(label,r['exit'])
consumers=json.loads((P/'probes/exotic-consumers.json').read_text());assert {r['field'] for r in consumers['results']}=={'authorityContext','initialInput','ingress','progress','emission','result','error'}
assert all(r['replay']['replayed'] for r in consumers['results'])
if args.C and git('rev-parse','HEAD').strip()!=args.C:
 assert git('rev-parse','HEAD^').strip()==args.C,'H must directly wrap C'
 delta=git('diff','--name-only',args.C,'HEAD').splitlines()
 allowed={packet+'implementation-02.md','docs/development/007-work-packets.md'}
 assert set(delta)<=allowed,delta
print(json.dumps({'base':B,'head':git('rev-parse','HEAD').strip(),'changed_tracked_files':len(changed),'finding_labels':enum['id_labels'],'qualifying_families':len(enum['families']),'decision_drafts':len(list((P/'decision-drafts').glob('*.md'))),'local_file_links':links,'scope':'packet plus audit row and single adopted-hold sentence in K1.1 row','skips':['sealed R8 timings: unchanged derivation; no rerun','historical reviewer scratchpad links: mapped by review README'],'result':'PASS'},indent=2))
