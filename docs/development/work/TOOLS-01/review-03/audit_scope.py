#!/usr/bin/env python3
"""Recompute hold register and minimum contexts; audit finite scope without composed verify.
Usage: python3 -B audit_scope.py <clean-candidate-clone>
"""
import json
import sys
from collections import Counter
from pathlib import Path
ROOT = Path(sys.argv[1]).resolve()
C = '28258b282532b36eef8fb1571d79b6343b54427b'
OLD = '446dd25820500db4e0eb3d6940ec49e45634f39c'
sys.path.insert(0, str(ROOT / 'tests/tooling'))
from test_packet_tools import tool
g = tool.Git(ROOT)
spec = json.loads(g.blob(C, 'tests/fixtures/packet-tools/adoption.json'))
old = json.loads(g.blob(OLD, 'tests/fixtures/packet-tools/adoption.json'))
inventory = tool.inventory(g, C, spec['inventory'])
origins = {r['id']: r for r in inventory['origins']}
contexts = {}
uncertain = {}
for row in spec['origins']:
    key = row['id']
    minimum = tool.context_minimum(g, origins[key])
    if minimum[3] is not None:
        uncertain[key] = minimum[3]
    if row['state'] == 'complete':
        contexts[key] = tool.context_check(g, origins[key], row['closure'])
scope = sorted({r['path'] for r in tool.test_file_origins(inventory) if tool.blob_id(g,C,r['path'])} |
               {r['file'] for r in spec['suite_targets']})
env = tool.child_environment(tool.environment_declaration(None))[0]
registry = g.document(C, spec['registry'])
detected = {}
claims = tool.holds_table(g,C,spec['holds'])
register = tool.hold_register(g,C,spec['holds']['register'], claims, scope, env, tool.typescript_toolchain(g,C),
                              registry['cases'],spec['registry'],detected)
assert len(register) == 305
assert sum(r.get('decision') == tool.VENV_RECORD for r in register.values()) == 188
assert set(claims) == {r['id'] for r in old['holds']['claims']}
for before in old['holds']['claims']:
    now = claims[before['id']]
    assert before['owner'] == now['owner']
    assert set(now['decisions']) - set(before['decisions']) <= {tool.VENV_RECORD}
assert old['holds']['register']['recipes'] == spec['holds']['register']['recipes']
members = {r['member']: r for r in spec['preserved']}
cx = {r['id']: r for r in spec['counterexamples']}
tool.witness_records(cx, members, claims, register)
lists = tool.transfer_lists(g,C,spec['transfer_lists'])
transferred = tool.transferred_origins(g,C,spec['transferred'],{r['id']:r for r in spec['origins']}, lists)
assert len(transferred) == 44
assert len(contexts) == 110 and not uncertain
changes = {}
oldrows = {r['id']:r for r in old['origins']}
for row in spec['origins']:
    if oldrows[row['id']].get('closure') == row.get('closure'):
        continue
    before = oldrows[row['id']]['closure']; after = row['closure']
    old_links = {json.dumps(r,sort_keys=True) for r in before['links']}
    new_links = {json.dumps(r,sort_keys=True) for r in after['links']}
    added = [json.loads(r) for r in sorted(new_links-old_links)]
    assert before['context'] == after['context']
    assert all(r['kind']=='counterexample' and cx[r['id']]['kind']=='held_witness' for r in added)
    changes[row['id']] = {'removed':[json.loads(r) for r in sorted(old_links-new_links)],
                           'added':[dict(r,witness=cx[r['id']]) for r in added]}
print(json.dumps({'subject':C,'inventory':{k:v for k,v in inventory.items() if k!='origins'},
                  'contexts':contexts,'uncertain':uncertain,'scope_files':scope,
                  'register':{'entries':len(register),'rule_1':188,
                              'classes':dict(Counter(r['classification']+':'+r.get('claim','-') for r in register.values())),
                              'unclassified':{k:v for k,v in detected.items() if any(x.startswith('unclassified@') for x in v)}},
                  'transfers':dict(Counter(transferred.values())), 'closure_changes':changes},indent=2))
