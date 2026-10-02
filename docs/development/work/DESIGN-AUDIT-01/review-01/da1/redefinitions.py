#!/usr/bin/env python3
"""Reviewer: find IDs that have a definition-shaped line (heading, bold list lead, or first table cell
followed by a severity) in more than one source record. Candidates for reused IDs."""
import re, json, sys, collections
REPO=sys.argv[1]
occ=json.load(open(REPO+'/docs/development/work/DESIGN-AUDIT-01/enumeration-occurrences.json'))
cls=json.load(open(REPO+'/docs/development/work/DESIGN-AUDIT-01/classifications.json'))
DEF=re.compile(r'^\s*(?:#{2,4}\s+`?|[-*]\s+\*\*|\|\s*\*{0,2}`?)(?P<id>[A-Z][\w.:-]+)`?\*{0,2}\s*(?:[—:\-|(]|\*\*)')
res={}
for k,v in occ.items():
    bare=k.split('::')[-1]
    defs=[(o['path'],o['line'],o['text'].strip()[:150]) for o in v if (m:=DEF.match(o['text'])) and m['id'].rstrip('`*')==bare and re.search(r'P[0-3]|FINDING|finding|CLOSED|OPEN|—',o['text'])]
    files=sorted(set(d[0] for d in defs))
    if len(files)>1: res[k]=dict(classified_source=cls.get(k,{}).get('source'),kind=cls.get(k,{}).get('kind'),defs=defs[:8])
json.dump(res,open(sys.argv[2],'w'),indent=1)
print(len(res),'IDs with definition-shaped lines in >1 file')
for k,v in res.items():
    heads=[d for d in v['defs'] if d[2].lstrip().startswith('#')]
    hf=sorted(set(d[0] for d in heads))
    if len(hf)>1: print('HEADING in multiple files:',k,v['kind'],hf)
