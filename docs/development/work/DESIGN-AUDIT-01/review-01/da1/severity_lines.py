#!/usr/bin/env python3
"""Reviewer: find severity-tagged lines (P0-P3) in in-scope Markdown records that carry no ID matching
enumerate.py's grammar. These are candidate unprefixed findings. Independent of the ID grammar."""
import re, subprocess, json, sys, collections
REPO=sys.argv[1]
A='9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49'; B='66bc041175e6fc191c2e7cf88de198111e7d97c9'
sys.path.insert(0, REPO+'/docs/development/work/DESIGN-AUDIT-01')
RX=re.compile(r'(?<![\w.-])(?:K(?:01|02|10|11|12(?:C1)?)-(?:[A-Z0-9]+-)+\d{2}|KC[12]-(?:[A-Z0-9]+-)+\d{2}|REF1-(?:[A-Z0-9]+-)+\d{2}|K[01]\.[02]-SELF-\d{2}|CORR2-SELF-\d{2}|SELF-(?:[A-Z0-9]+-)*\d{2}|O-R\d+-\d+)(?![\w-])')
SEV=re.compile(r'(?:\*\*|\||\(|\b)(P[0-3])(?:\*\*|\||\)|\b)')
def git(*a): return subprocess.check_output(['git','-C',REPO,*a]).decode()
out=collections.defaultdict(list)
for rev in [A,B]:
    for p in git('ls-tree','-r','--name-only',rev,'docs/development/work').splitlines():
        packet=p.split('/')[3]
        ok=(packet.startswith(('K0.','K1.0','K1.1')) if rev==A else packet in ['K1.1-correction-02','K1.2','K1.2-correction-01'])
        if not ok or not p.endswith('.md'): continue
        name=p.split('/')[-1]
        if not re.match(r'(review|cleanup|blocker|handoff|owner|decision|amend|invalid|integration)',name) and '/review' not in p: continue
        t=git('show',rev+':'+p)
        for n,line in enumerate(t.splitlines(),1):
            if SEV.search(line) and not RX.search(line):
                # skip generic policy lines
                if re.search(r'P0[:,]|P1[:,]|severity|Severity',line) and len(line)<60: continue
                out[(rev[:7],p)].append((n,line.strip()[:220]))
json.dump({f'{k[0]}:{k[1]}':v for k,v in out.items()},open(sys.argv[2],'w'),indent=1)
for k,v in sorted(out.items()):
    print(f'== {k[0]} {k[1]} ({len(v)})')
    for n,l in v[:6]: print(f'   {n}: {l}')
