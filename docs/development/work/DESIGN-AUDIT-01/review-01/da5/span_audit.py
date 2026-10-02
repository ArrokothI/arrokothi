#!/usr/bin/env python3
"""Reviewer: for every 'exclusive' test span in measurements.json, split it into test() / it() blocks
and flag blocks that contain no same-process hostile construct. Heuristic marker list (a block with a
marker may still be cooperative; a block without one is a strong candidate for mis-attribution)."""
import json, re, subprocess, sys
REPO=sys.argv[1]; B='66bc041175e6fc191c2e7cf88de198111e7d97c9'
m=json.load(open(REPO+'/docs/development/work/DESIGN-AUDIT-01/measurements.json'))
MARK=re.compile(r'Proxy|setPrototypeOf|__proto__|Object\.prototype|Array\.prototype|\.prototype\b|defineProperty\(|Symbol\.(species|iterator|toPrimitive)|poison|pollut|hostile|ambient|globalThis\.|Reflect\.|\bget \w+\(|get:\s|getter|trap|revocable|species|primordial|monkey|patch|preload|inherited',re.I)
TEST=re.compile(r'^\s*(?:test|it|describe)\s*\(\s*(["\'`])(.*?)\1')
def src(p): return subprocess.check_output(['git','-C',REPO,'show',f'{B}:{p}']).decode().splitlines()
report=[]
for s in m['spans']:
    if s['attribution']!='exclusive' or '/tests/' not in s['path']: continue
    lines=src(s['path'])[s['start']-1:s['end']]
    blocks=[]; cur=None
    for i,l in enumerate(lines, s['start']):
        t=TEST.match(l)
        if t and not l.strip().startswith('describe'):
            if cur: blocks.append(cur)
            cur=dict(line=i,name=t.group(2)[:110],body=[])
        if cur: cur['body'].append(l)
    if cur: blocks.append(cur)
    for b in blocks:
        hit=bool(MARK.search('\n'.join(b['body'])))
        report.append(dict(path=s['path'],span=f"{s['start']}-{s['end']}",line=b['line'],test=b['name'],hostile_marker=hit,lines=len(b['body'])))
json.dump(report,open(sys.argv[2],'w'),indent=1)
no=[r for r in report if not r['hostile_marker']]
print(len(report),'test blocks in exclusive test spans;',len(no),'with no hostile marker, totalling',sum(r['lines'] for r in no),'physical lines (block extent to next test in span)')
for r in no: print(f"  {r['path'].split('/')[-1]}:{r['line']} [{r['span']}] ({r['lines']} lines) {r['test']}")
