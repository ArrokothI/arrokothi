#!/usr/bin/env python3
"""Reviewer: for each family F01-F16 in register.md, compare the Keep and Recommend rows.
Reports whether 'Affected claims' are identical and whether the Recommend closure is the Keep
closure plus a fixed suffix. Also checks whether a 'why instance-by-instance' sentence and sites exist."""
import re, sys, json
reg=open(sys.argv[1]).read()
SUFFIX='; if refactored, differential preservation of the accepted corpus and explicit ownership/bypass check'
out={}
for m in re.finditer(r'^### (F\d\d) — (.+?)\n(.*?)(?=^### F\d\d — |\Z)', reg, re.S|re.M):
    fid,title,body=m.groups()
    rows=[l for l in body.splitlines() if l.startswith('| Keep') or l.startswith('| Recommend')]
    cells=[[c.strip() for c in r.strip('|').split('|')] for r in rows]
    keep=[c for c in cells if c[0].startswith('Keep')][0]; rec=[c for c in cells if c[0].startswith('Recommend')][0]
    out[fid]=dict(title=title,
        n_options=len(rows),
        claims_identical=keep[2]==rec[2],
        rec_closure_equals_keep_plus_suffix=rec[3]==keep[3]+SUFFIX,
        keep_closure=keep[3], rec_closure_extra=rec[3][len(keep[3]):] if rec[3].startswith(keep[3]) else rec[3],
        sites=re.search(r'\*\*Sites:\*\*(.*?)\*\*Why',body,re.S).group(1).strip(),
        why=re.search(r'\*\*Why instance-by-instance:\*\*(.*?)\n',body).group(1).strip())
json.dump(out,open(sys.argv[2],'w'),indent=1)
print('family | options | claims identical | rec closure == keep closure + fixed suffix')
for f,v in out.items(): print(f, v['n_options'], v['claims_identical'], v['rec_closure_equals_keep_plus_suffix'])
print('all identical claims:',all(v['claims_identical'] for v in out.values()))
print('all suffix-only closures:',all(v['rec_closure_equals_keep_plus_suffix'] for v in out.values()))
