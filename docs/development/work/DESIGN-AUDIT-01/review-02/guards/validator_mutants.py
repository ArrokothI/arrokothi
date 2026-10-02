#!/usr/bin/env python3
"""Review 02 (Claude Code, claude-opus-5-5). Plausible wrong drafts applied to the candidate's own
option data, then passed to the checked-in render-register.validate(). A mutant 'survives' when
validate() accepts it. Usage: validator_mutants.py <packet-dir> <out.json>"""
import copy, importlib.util, json, sys
from pathlib import Path
P = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(P / 'probes')); sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('rr', P / 'probes/render-register.py'); rr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rr)
model = json.loads((P / 'family-notes.json').read_text()); inv = json.loads((P / 'claim-inventory.json').read_text())['claims']
rr.validate(model, inv)  # control: candidate data passes
SUFFIX = '; if refactored, differential preservation of the accepted corpus and explicit ownership/bypass check'
def opt(m, item, idx): return m['items'][item]['options'][idx]
def rec_index(m, item): return next(i for i, o in enumerate(m['items'][item]['options']) if 'Recommend' in o['label'])
def keep_index(m, item): return next(i for i, o in enumerate(m['items'][item]['options']) if o['label'].startswith('Keep'))
mutants = {}
def m1(m):  # review-01's exact defect: every family Recommend closure = Keep closure + fixed suffix
    for k in m['items']:
        if k.startswith('F') and len(k) == 3: opt(m, k, rec_index(m, k))['closure'] = opt(m, k, keep_index(m, k))['closure'] + SUFFIX
mutants['M1 rec closure = keep closure + review-01 fixed suffix (all F-families)'] = m1
def m2(m):  # same defect, suffix reworded per family so no fixed string exists
    for k in m['items']:
        if k.startswith('F') and len(k) == 3: opt(m, k, rec_index(m, k))['closure'] = opt(m, k, keep_index(m, k))['closure'] + f'; for {k}, also preserve the accepted corpus differentially'
mutants['M2 rec closure = keep closure + per-family reworded suffix'] = m2
def m3(m):  # reference-only closure that does not start with see/use/same
    opt(m, 'F02', rec_index(m, 'F02'))['closure'] = 'This option is closed exactly as item C closes its recommendation: every check, test and rejection case listed there applies here unchanged.'
mutants['M3 reference-only closure phrased without a leading see/use/same'] = m3
def m4(m):  # identical claims with items reordered
    k = 'F03'; a = opt(m, k, keep_index(m, k)); r = opt(m, k, rec_index(m, k)); r['claims'] = list(reversed(a['claims'])) + ['']
    r['claims'] = [c for c in r['claims'] if c] or a['claims']
    if len(a['claims']) == 1: r['claims'] = [a['claims'][0] + ' ']
mutants['M4 rec claims = keep claims (reordered / trailing space)'] = m4
def m5(m):  # bytes recommendation keeps every accepted claim
    for e in opt(m, 'A', rec_index(m, 'A'))['inventory'].values(): e['disposition'] = 'keep'
mutants['M5 A-bytes marks every inventory entry keep'] = m5
def m6(m):  # recommendation tagged canonical-bytes but text describes live capture in the core
    o = opt(m, 'F09', rec_index(m, 'F09')); o['closure'] = 'The Kernel core captures live caller objects once, preserves own __proto__, rejects accessors, cycles and undefined members, and verifies retained snapshots survive caller mutation.'
mutants['M6 Recommend tagged canonical-bytes, closure describes live core capture'] = m6
def m7(m):  # D/E recommendation tagged live-object core
    opt(m, 'E', rec_index(m, 'E'))['core'] = 'independent'
mutants['M7 E recommendation tagged core-independent (true for TOOLS-01)'] = m7
res = {}
for name, f in mutants.items():
    bad = copy.deepcopy(model); f(bad)
    try: rr.validate(bad, inv); res[name] = 'SURVIVES validate()'
    except AssertionError as e: res[name] = 'rejected: ' + str(e)[:120]
json.dump(res, open(sys.argv[2], 'w'), indent=1)
for k, v in res.items(): print(f'{k:75} {v}')
