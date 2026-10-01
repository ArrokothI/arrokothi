#!/usr/bin/env python3
"""Reviewer: list every file under the DA-1 packet trees at the pinned revisions, and mark which ones
enumerate.py's sources() reads. Independent of enumerate.py's ID grammar."""
import re, subprocess, json, sys, collections
REPO=sys.argv[1]
A='9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49'; B='66bc041175e6fc191c2e7cf88de198111e7d97c9'
def git(*a): return subprocess.check_output(['git','-C',REPO,*a]).decode()
rows=[]
for rev in [A,B]:
    for p in git('ls-tree','-r','--name-only',rev,'docs/development/work').splitlines():
        packet=p.split('/')[3]
        inscope_packet = (packet.startswith(('K0.','K1.0','K1.1')) if rev==A else packet in ['K1.1-correction-02','K1.2','K1.2-correction-01'])
        if not inscope_packet: continue
        audit_allowed = bool(re.fullmatch(r'K(?:0\.[12]|1\.[01])(?:-(?:correction|reference)-\d+)?',packet)) if rev==A else True
        audit_reads = audit_allowed and p.endswith('.md') and any(x.startswith(('review','cleanup','handoff','owner-note')) for x in p.split('/')[4:])
        rows.append(dict(rev=rev[:7],packet=packet,path=p,audit_reads=audit_reads))
json.dump(rows,open(sys.argv[2],'w'),indent=1)
c=collections.Counter((r['rev'],r['packet'],r['audit_reads']) for r in rows)
for k,v in sorted(c.items()): print(k,v)
# text-like files not read
ext=collections.Counter((r['path'].rsplit('.',1)[-1] if '.' in r['path'].split('/')[-1] else '') for r in rows if not r['audit_reads'])
print('unread by extension:',ext.most_common())
