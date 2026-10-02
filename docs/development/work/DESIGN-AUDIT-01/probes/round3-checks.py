#!/usr/bin/env python3
"""Session/model: Codex / GPT-6; sandboxed local read-only regressions; no acceptance authority."""
import json,re,subprocess,sys,tempfile
from pathlib import Path
sys.dont_write_bytecode=True
from session import SESSION
from corpus import validate
P=Path(__file__).resolve().parents[1];R=P.parents[3];review=P/'review-02'
counts={'commands':0,'channels':0,'bindings':0,'review_cases':0}
def run(args):
    r=subprocess.run([str(x) for x in args],cwd=R,capture_output=True,text=True,timeout=45)
    counts['commands']+=1
    assert r.returncode==0,(args,r.returncode,r.stdout,r.stderr)
    return r.stdout
def subset(actual,expected):
    assert {k:actual.get(k) for k in expected}==expected,(actual,expected)
hard=json.loads((P/'hardening-corpus.json').read_text());closure=json.loads((P/'closure-corpus.json').read_text())
model=json.loads((P/'family-notes.json').read_text());classes=json.loads((P/'classifications.json').read_text())
validate(hard,closure,classes,model)
print(SESSION)
for group in ['channels','bindings']:
    for name,row in hard[group].items():
        for mode,flags in [('unfrozen',[]),('frozen',['--frozen-intrinsics'])]:
            out=json.loads(run(['node',*flags,P/row['probe'],row['argument']]))
            subset(out,row['expected_'+mode]);counts[group]+=1
        if 'expected_pinned' in row:
            out=json.loads(run(['node','--frozen-intrinsics',P/row['probe'],row['argument'],'pinned']))
            subset(out,row['expected_pinned']);counts[group]+=1
print('hardening: exact expected observations PASS; flag-only binding protection FAIL (expected); pinning mechanism PASS; no Kernel hardening support inferred')
for flags in [[],['--frozen-intrinsics']]:
    frozen=bool(flags)
    out=json.loads(run(['node',*flags,review/'realm/global-binding-probe.mjs',R/'node_modules/canonicalize/lib/canonicalize.js']))
    subset(out,{'objectPrototypeFrozen':frozen,'JSONObjectFrozen':frozen,'globalThisFrozen':False,
        'globalJSONDescriptor':{'writable':True,'configurable':True},'globalObjectDescriptor':{'writable':True,'configurable':True},
        'objectPrototypeToJSON':'threw TypeError' if frozen else 'assigned','replaceGlobalJSON':'assigned','replaceGlobalObject':'assigned',
        'before':'{"a":[1,"x"],"b":2}','after':'{"a":[999,"x"]}','restored':'{"a":[1,"x"],"b":2}','steered':True})
    out=json.loads(run(['node',*flags,review/'realm/global-bindings-all.mjs']))
    assert set(out['bindings'])==set(hard['bindings'])
    for v in out['bindings'].values():
        assert v=={'writable':True,'configurable':True,'intrinsicFrozen':frozen,'assignment':'replaced'},v
    counts['review_cases']+=2
expected=json.loads((P/'review02-regressions.json').read_text())
for name,command in [('proxy',['node','--experimental-strip-types','--no-warnings',review/'brand/proxy-exotic-probe.mts',R]),('clone',['node',review/'brand/structured-clone-control.mjs'])]:
    out=json.loads(run(command));out.pop('node')
    assert out==expected['expected'][name],(name,out)
    counts['review_cases']+=len(out)
with tempfile.TemporaryDirectory(prefix='da03-') as td:
    path=Path(td)/'mutants.json'
    run([sys.executable,review/'guards/validator_mutants.py',P,path])
    mutants=json.loads(path.read_text());assert len(mutants)==7
    for name,observed in mutants.items():
        want=expected['mutants'][name.split()[0]]
        assert observed.startswith(want),(name,observed,want)
    counts['review_cases']+=7
    # Preserve the old exact rendered-cell detector independently of schema/tag guards.
    suffix='; if refactored, differential preservation of the accepted corpus and explicit ownership/bypass check'
    text=(P/'register.md').read_text();parts=re.split(r'(?=^### F\d\d — )',text,flags=re.M)
    for i in range(1,len(parts)):
        lines=parts[i].splitlines();keep=next(l for l in lines if l.startswith('| Keep')).split('|')[4].strip()
        for j,line in enumerate(lines):
            if line.startswith('| Recommend'):
                cells=line.split('|');cells[4]=' '+keep+suffix+' ';lines[j]='|'.join(cells)
        parts[i]='\n'.join(lines)+'\n'
    mutant=Path(td)/'register.md';mutant.write_text(''.join(parts));out=Path(td)/'template.json'
    run([sys.executable,P/'review-01/da2/template_check.py',mutant,out])
    rows=json.loads(out.read_text());assert len(rows)==16 and all(v['rec_closure_equals_keep_plus_suffix'] for v in rows.values())
anchors=run([sys.executable,review/'records/anchor_check.py',R,P.relative_to(R)])
assert re.search(r'fragment links checked [1-9]\d* bad 0\s*$',anchors),anchors
print(anchors.strip())
# Cheap cumulative witnesses only: no R8 timing, allocation or N15 suite rerun.
text=run([sys.executable,P/'probes/reverify-exotics.py'])
old=(P/'probes/reverify-exotics.txt').read_text()
def observations(s):return [l for l in s.splitlines() if ' ACCEPT ' in l or ' REFUSE ' in l]
assert observations(text)==observations(old) and len(observations(text))==10
out=json.loads(run(['node','--experimental-strip-types','--no-warnings',P/'probes/exotic-consumers.mts']))
old=json.loads((P/'probes/exotic-consumers.json').read_text());out.pop('node');old.pop('node')
assert out==old,'whole exotic-consumer observation drift'
print('cumulative exotic witnesses: 10 domain cases and 7 whole root-consumer/replay observations PASS (known classification defect retained)')
print('review-02 realm/brand/clone/mutant regressions PASS; M2/M3/M5/M6 remain semantic-reading limits; M7 accepted; private transcript comparison not rerun')
print(json.dumps({'result':'PASS',**counts,'skips':['private transcript provenance comparison unavailable','R8 timing corpus not rerun','future hardened Kernel/wrapper/parser not implemented']}))
