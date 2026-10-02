#!/usr/bin/env python3
"""Reviewer: independent same-H verdict pairing. For each review/cleanup record in the DA-1 trees,
take the final standalone verdict line and every full 40-hex SHA in the record's first 60 lines
(where identity sections live). Report SHAs that carry an ACCEPT in one record and a non-ACCEPT
(CHANGES REQUIRED / BLOCKED / reopened) in a later-numbered record of the same packet."""
import re, subprocess, json, sys, collections
REPO=sys.argv[1]
A='9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49'; B='66bc041175e6fc191c2e7cf88de198111e7d97c9'
def git(*a): return subprocess.check_output(['git','-C',REPO,*a]).decode()
VERD=re.compile(r'^\**\s*(ACCEPT|CHANGES REQUIRED|BLOCKED\s*[—-]\s*ARCHITECTURE DECISION|REOPENED|CLEANUP COMPLETE[^*]*)\s*\**\.?\s*$')
SHA=re.compile(r'\b[0-9a-f]{40}\b')
recs=[]
for rev in [A,B]:
    for p in git('ls-tree','-r','--name-only',rev,'docs/development/work').splitlines():
        packet=p.split('/')[3]
        ok=(packet.startswith(('K0.','K1.0','K1.1')) if rev==A else packet in ['K1.1-correction-02','K1.2','K1.2-correction-01'])
        name=p.split('/')[-1]
        if not ok or not p.endswith('.md') or not re.match(r'(review|cleanup)',name) and 'review-' not in p: continue
        t=git('show',f'{rev}:{p}').splitlines()
        v=[m.group(1).strip() for l in t for m in [VERD.match(l.strip())] if m]
        verdict=v[-1] if v else None
        shas=sorted(set(SHA.findall('\n'.join(t[:60]))))
        num=re.search(r'(\d+)',name); recs.append(dict(rev=rev[:7],packet=packet,path=p,verdict=verdict,shas=shas,n=int(num.group(1)) if num else 0))
json.dump(recs,open(sys.argv[2],'w'),indent=1)
by=collections.defaultdict(list)
for r in recs:
    for s in r['shas']: by[(r['packet'],s)].append(r)
pairs=[]
for (pk,s),rs in by.items():
    acc=[r for r in rs if r['verdict']=='ACCEPT']
    non=[r for r in rs if r['verdict'] and r['verdict']!='ACCEPT']
    for a in acc:
        for b in non:
            if b['path']!=a['path'] and (b['n']>a['n'] or 'cleanup' in b['path']): pairs.append((pk,s,a['path'].split('/')[-1],b['path'].split('/')[-1],b['verdict']))
print(len(recs),'records;',sum(1 for r in recs if r['verdict'] is None),'without a parsed final verdict')
for p in sorted(set(pairs)): print(p)
