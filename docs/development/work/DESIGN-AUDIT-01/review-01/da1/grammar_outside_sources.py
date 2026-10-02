#!/usr/bin/env python3
"""Reviewer: apply enumerate.py's OWN regex to every text file in scope (not only its selected
review/cleanup/handoff/owner-note Markdown). Report IDs that never occur in its selected sources."""
import re, subprocess, json, sys, collections
REPO=sys.argv[1]
A='9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49'; B='66bc041175e6fc191c2e7cf88de198111e7d97c9'
RX=re.compile(r'(?<![\w.-])(?:K(?:01|02|10|11|12(?:C1)?)-(?:[A-Z0-9]+-)+\d{2}|KC[12]-(?:[A-Z0-9]+-)+\d{2}|REF1-(?:[A-Z0-9]+-)+\d{2}|K[01]\.[02]-SELF-\d{2}|CORR2-SELF-\d{2}|SELF-(?:[A-Z0-9]+-)*\d{2}|O-R\d+-\d+)(?![\w-])')
def git(*a): return subprocess.check_output(['git','-C',REPO,*a])
cls=json.loads(open(REPO+'/docs/development/work/DESIGN-AUDIT-01/classifications.json').read())
bare=set(k.split('::')[-1] for k in cls)
found=collections.defaultdict(list)
for rev in [A,B]:
    for p in git('ls-tree','-r','--name-only',rev,'docs/development/work').decode().splitlines():
        packet=p.split('/')[3]
        ok=(packet.startswith(('K0.','K1.0','K1.1')) if rev==A else packet in ['K1.1-correction-02','K1.2','K1.2-correction-01'])
        if not ok or p.endswith(('.gz','.png','.sha256')): continue
        try: t=git('show',rev+':'+p).decode()
        except UnicodeDecodeError: continue
        for n,l in enumerate(t.splitlines(),1):
            for m in RX.finditer(l):
                if m.group() not in bare: found[m.group()].append((rev[:7],p,n,l.strip()[:200]))
json.dump(found,open(sys.argv[2],'w'),indent=1)
print(len(found),'grammar-matching IDs absent from the audit label set')
for k,v in sorted(found.items()):
    files=sorted(set(x[1] for x in v))
    print(f'{k}  n={len(v)}  {files[:3]}')
    print('     ', v[0][3][:180])
