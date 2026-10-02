#!/usr/bin/env python3
"""Codex desktop/GPT-6; local read-only regressions; no acceptance authority."""
from pathlib import Path
import json,subprocess,sys,tempfile,hashlib
sys.dont_write_bytecode = True
from session import SESSION
P=Path(__file__).resolve().parents[1];R=P.parents[3];review=P/'review-01'
def run(args):
 r=subprocess.run([str(x) for x in args],cwd=R,capture_output=True,text=True,timeout=45)
 assert r.returncode==0,(args,r.returncode,r.stdout,r.stderr)
 return r.stdout
with tempfile.TemporaryDirectory(prefix='da02-') as td:
 output=Path(td)/'template.json'
 text=run([sys.executable,review/'da2/template_check.py',P/'register.md',output]);rows=json.loads(output.read_text())
 assert rows and all(not r['claims_identical'] and not r['rec_closure_equals_keep_plus_suffix'] for r in rows.values())
 print(text.strip())
 text=run([sys.executable,review/'da3/consistency_extract.py',P/'register.md'])
 lines=text.splitlines()
 for i,line in enumerate(lines):
  if 'RECOMMENDED' in line:assert 'CORE = bytes/text' in lines[i+1],line
 print(text.strip())
 text=run(['bash',review/'da3/claims_coverage.sh',P]);print(text.strip())
 assert 'values.md#in-process-value-capture' in (P/'register.md').read_text()
 assert 'values.md#what-these-rules-do-not-cover' not in (P/'register.md').read_text()
 print('Corrected citation PASS; historical coverage script prints its hard-coded obsolete anchor for comparison')
frozen=json.loads(run(['node','--frozen-intrinsics',review/'a-missing-option/frozen-intrinsics-probe.mjs']))
assert all(v=='threw TypeError' for k,v in frozen['out'].items() if k in ['Object.prototype.toJSON =','Array.prototype[0] accessor','ArrayIteratorPrototype.next =','Object.keys =','Promise[Symbol.species]'])
assert frozen['out']['Proxy still constructible'] is True
for flag,expected in [([],True),(['--frozen-intrinsics'],False)]:
 r=json.loads(run(['node',*flag,'--experimental-strip-types','--no-warnings',review/'a-missing-option/kernel-under-frozen.mts',R]));assert r['ok'] is expected,r
 expanded=json.loads(run(['node',*flag,'--experimental-strip-types','--no-warnings',P/'probes/realm-values.mts',R]))
 assert len(expanded['results'])==8 and all(v['ok'] is expected for v in expanded['results'])
 if not expected:assert all(v['codes']==['unstable_representation'] for v in expanded['results'])
 print('realm corpus', 'frozen' if flag else 'ordinary', 'PASS',len(expanded['results']),'cases',r['node'])
# Transport policy arithmetic is a proposal, not evidence for a parser that does not exist.
canonical_cap=1048576;proposed_wire_cap=8*1024*1024
assert proposed_wire_cap==8*canonical_cap and len(json.dumps('\x01'))-2==6
print('proposed transport cap arithmetic PASS',proposed_wire_cap,'bytes per uncompressed encoded root; parser not implemented')
spans=json.loads((P/'hostile-test-spans.json').read_text());mixed=[s for s in spans if s.get('attribution')=='mixed']
assert len(mixed)==4 and sum(s['end']-s['start']+1 for s in mixed)==127
model=json.loads((P/'family-notes.json').read_text());inv=json.loads((P/'claim-inventory.json').read_text())['claims']
assert len(inv)==20
owner=(P/'owner-decisions-02.md').read_text();checks=(P/'owner-checks-02.md').read_text()
assert all(f'| {c} |' in checks and f'{c}) ' in owner for c in 'abcdef')
for row in ['A','B','C','D','E','F02','F09','F10','K1.1-correction-03']:
 assert f'| {row} |' in (P/'decision-drafts/CORE.md').read_text()
print('owner checks / CORE mapping / corrected span attribution PASS; no R8 timing rerun')
