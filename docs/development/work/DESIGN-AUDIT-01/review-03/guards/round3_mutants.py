#!/usr/bin/env python3
"""Reviewer mutants (DESIGN-AUDIT-01 review 03; Claude Code, claude-opus-5-5).
Applies plausible wrong drafts to the candidate's own data in memory and passes them to the
candidate's checked-in validators: render-register.validate() and corpus.validate().
Usage: python3 round3_mutants.py <packet dir at H> <round-2 H checkout packet dir or git ref> <out.json>
"""
import copy, importlib.util, json, subprocess, sys
from pathlib import Path
sys.dont_write_bytecode = True
P = Path(sys.argv[1]).resolve(); out = Path(sys.argv[3])
sys.path.insert(0, str(P / 'probes'))
def load(name, file):
    spec = importlib.util.spec_from_file_location(name, P / 'probes' / file); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
rr = load('rr', 'render-register.py'); corpus = load('corpus', 'corpus.py')
model = json.loads((P / 'family-notes.json').read_text()); inv = json.loads((P / 'claim-inventory.json').read_text())['claims']
hard = json.loads((P / 'hardening-corpus.json').read_text()); clos = json.loads((P / 'closure-corpus.json').read_text())
classes = json.loads((P / 'classifications.json').read_text())
root = P.parents[3]
old_model = json.loads(subprocess.check_output(['git', '-C', str(root), 'show', sys.argv[2] + ':docs/development/work/DESIGN-AUDIT-01/family-notes.json']))
def run(name, m=model, h=hard, c=clos):
    res = {}
    for label, fn in [('render-register.validate', lambda: rr.validate(m, inv)), ('corpus.validate', lambda: corpus.validate(h, c, classes, m))]:
        try: fn(); res[label] = 'SURVIVES'
        except AssertionError as e: res[label] = 'rejected: ' + str(e)[:160]
    return res
results = {'control (candidate as committed)': run('control')}
# RM1: restore round-2 A-hard / B-hard text (the REALM-01 defect) while keeping round-3 ids/schema.
m = copy.deepcopy(model); old = {o['id']: o for it in old_model['items'].values() for o in it['options']}
for it in m['items'].values():
    for o in it['options']:
        if o['id'] in ('A-hard', 'B-hard'):
            for f in ('claims', 'closure', 'cost', 'method', 'inventory'): o[f] = copy.deepcopy(old[o['id']][f])
results['RM1 A-hard/B-hard claims, closure, cost and inventory restored to round-2 H 4c1b11e (REALM-01 text)'] = run('RM1', m=m)
# RM2: every option response in closure-corpus.json replaced by one generic sentence (>=18 words).
c = copy.deepcopy(clos); generic = 'This option keeps every recorded counterexample of its families as a maintained case and reconciles each one with its stated closure before acceptance.'
for v in c['options'].values(): v['response'] = generic
results['RM2 all 51 closure-corpus responses identical generic text'] = run('RM2', c=c)
# RM3: misclassify K11-R5-VAL-03 as stopped by the flag alone.
h = copy.deepcopy(hard); h['findings']['K11-R5-VAL-03']['reach'] = 'poison-blocked'; h['findings']['K11-R5-VAL-03']['reason'] = 'Frozen intrinsics stop it.'
results['RM3 K11-R5-VAL-03 reach set to poison-blocked by the flag'] = run('RM3', h=h)
# RM4 (control): drop a hostile label.
h = copy.deepcopy(hard); h['findings'].pop('K11-R5-STATE-01')
results['RM4 control: hostile label removed from hardening corpus'] = run('RM4', h=h)
# RM5: A-hard closure loses its binding-pinning sentence (closure still >=18 words).
m = copy.deepcopy(model)
for it in m['items'].values():
    for o in it['options']:
        if o['id'] == 'A-hard':
            o['closure'] = 'Run the node --frozen-intrinsics flag at startup and check intrinsic identities once; reconcile every hostile_only finding through hardening-corpus.json and require ordinary encoding to succeed.'
results['RM5 A-hard closure reduced to flag plus startup identity check'] = run('RM5', m=m)
out.write_text(json.dumps(results, indent=1) + '\n'); print(json.dumps(results, indent=1))
