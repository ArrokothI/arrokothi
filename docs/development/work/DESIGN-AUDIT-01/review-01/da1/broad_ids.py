#!/usr/bin/env python3
"""Reviewer: broad ID-token search over every text file in the DA-1 trees (all extensions except
binary/gz), independent of enumerate.py's grammar. Reports tokens not in the audit's label set."""
import re, subprocess, json, sys, collections
REPO=sys.argv[1]; OUT=sys.argv[2]
A='9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49'; B='66bc041175e6fc191c2e7cf88de198111e7d97c9'
def git(*a): return subprocess.check_output(['git','-C',REPO,*a])
cls=json.loads(open(REPO+'/docs/development/work/DESIGN-AUDIT-01/classifications.json').read())
audit_keys=set(cls)
audit_bare=set(k.split('::')[-1] for k in cls)
# Broad: uppercase-led hyphenated token with >=1 hyphen and final numeric segment of any width
BROAD=re.compile(r'(?<![\w.\-/#])([A-Z][A-Za-z0-9.]*(?:-[A-Za-z0-9]+)*-\d+[a-z]?)(?![\w\-])')
occ=collections.defaultdict(list)
for rev in [A,B]:
    for p in git('ls-tree','-r','--name-only',rev,'docs/development/work').decode().splitlines():
        packet=p.split('/')[3]
        ok=(packet.startswith(('K0.','K1.0','K1.1')) if rev==A else packet in ['K1.1-correction-02','K1.2','K1.2-correction-01'])
        if not ok or p.endswith(('.gz','.png','.sha256')): continue
        try: t=git('show',rev+':'+p).decode('utf-8')
        except UnicodeDecodeError: continue
        if len(t)>3_000_000: continue
        for n,line in enumerate(t.splitlines(),1):
            for m in BROAD.finditer(line):
                occ[m.group(1)].append((rev[:7],p,n))
res={k:dict(n=len(v),files=sorted(set(x[1] for x in v))[:6],first=v[0]) for k,v in occ.items() if k not in audit_bare}
json.dump(res,open(OUT,'w'),indent=1)
# Summarize by "shape": replace digits
shape=collections.Counter()
for k in res: shape[re.sub(r'\d+','N',k)]+=1
print(len(occ),'distinct broad tokens;',len(res),'not in audit label set')
for s,c in shape.most_common(150): print(c,s)
