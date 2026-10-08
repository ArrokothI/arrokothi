#!/usr/bin/env python3
"""Recompute the review's finite-set comparisons from exact C."""
import sys, json, subprocess, ast, collections, hashlib
from pathlib import Path
ROOT=Path(sys.argv[1]).resolve()
C='b104bab192f57c5ecf5b7eccebcfbda412a17b5d'
OLD='5eb27f98569624ece3c19a09a608a09d28be4605'
def blob(path,rev=C):return subprocess.check_output(['git','-C',str(ROOT),'show',rev+':'+path])
def doc(path,rev=C):return json.loads(blob(path,rev))
s=doc('tests/fixtures/packet-tools/adoption.json')
u=doc('docs/development/work/TOOLS-01/continuation-stop-01/unbound-members.json')['rows']
p={r['member']:r for r in s['preserved']}
targets={r.get('member'):r['id'] for r in s['suite_targets'] if 'member' in r}
limited=[{'member':r['member'],'status':p[r['member']]['status'],'target':targets.get(r['member'])} for r in u]
assert len(limited)==24 and all(r['status']=='refused' and r['target'] is None for r in limited)
src=blob('scripts/packet_tools.py').decode();old=blob('scripts/packet_tools.py',OLD).decode()
def guards(text):return [ast.get_source_segment(text,n) for n in ast.walk(ast.parse(text)) if isinstance(n,ast.Call) and isinstance(n.func,ast.Name) and n.func.id=='require']
now,before=guards(src),guards(old)
registry=doc('tests/fixtures/packet-tools/refusal-guards.json');registered=[]
for case in registry['cases']:
 m=case['mutants'][0];assert src.count(m['before'])==1
 calls=[g for g in set(now) if g in m['before']];assert len(calls)==1
 registered.append(calls[0])
assert sorted(now)==sorted(registered)
added=collections.Counter(now)-collections.Counter(before)
result={'subject':C,'implementation_01_commit':OLD,'limited_members':limited,
 'origins':dict(collections.Counter(r['state'] for r in s['origins'])),
 'preserved_statuses':dict(collections.Counter(r['status'] for r in s['preserved'])),
 'target_count':len(s['suite_targets']),
 'refusal_checks':{'before':len(before),'current':len(now),'new_or_text_changed':sum(added.values()),'every_current_guard_registered':True,'new_or_text_changed_guards':list(added.elements())},
 'payload_checker_sha256':hashlib.sha256(src.encode()).hexdigest()}
print(json.dumps(result,indent=2))
