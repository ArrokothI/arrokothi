#!/usr/bin/env python3
"""C1 analysis: mutants each original test killed at B that its converted test(s) no longer kill at C.

    python3 -B analyze.py <conversion-map.json> <out.json> --b <matrix-b*.jsonl>... --c <matrix-c*.jsonl>...

<conversion-map.json>: [{file, original, converted: [leaf titles]}] for every converted test. Leaves are
matched by their last path segment within a file. A run whose control did not pass, or that timed out
(status != finished), is reported, never counted as a kill. Unchanged leaves (same title at B and C, not in
the map) are compared too: a kill lost there is a silent pass.
"""
import json
import sys
from collections import defaultdict

args = sys.argv[1:]
mapping, out = json.load(open(args[0])), args[1]
b_files = args[args.index('--b') + 1:args.index('--c')]
c_files = args[args.index('--c') + 1:]


def load(paths):
    runs = defaultdict(dict)  # (mutant) -> file -> run
    for path in paths:
        for line in open(path):
            row = json.loads(line)
            if 'file' not in row:
                continue
            runs[row['mutant']][row['file'].split('/')[-1]] = row
    return runs


VANISHED = {}  # (side, file, leaf title, mutant) for kills that are only a leaf missing under the mutant


def kills(runs, side):
    """file -> leaf title -> set of mutants that fail it (control passing)."""
    out, problems = defaultdict(lambda: defaultdict(set)), []
    controls = runs.get('control', {})
    for name, run in controls.items():
        bad = [leaf for leaf, verdict in run['leaves'].items() if verdict != 'passed']
        if run['status'] != 'finished' or bad:
            problems.append(f'control {name}: {run["status"]} {bad[:3]}')
    for mutant, files in runs.items():
        if mutant == 'control':
            continue
        for name, run in files.items():
            control = controls.get(name, {}).get('leaves', {})
            if run['status'] != 'finished':
                # A timeout is no kill attribution: every leaf that did not report is unknown.
                problems.append(f'{mutant} {name}: {run["status"]}')
            for leaf, verdict in run['leaves'].items():
                if verdict == 'failed' and control.get(leaf) == 'passed':
                    out[name][leaf.split(' > ')[-1]].add(mutant)
            if run['status'] == 'finished':
                for leaf in control:
                    if leaf not in run['leaves']:
                        out[name][leaf.split(' > ')[-1]].add(mutant)  # a leaf that vanished under the mutant failed to run
                        VANISHED[(side, name, leaf.split(' > ')[-1], mutant)] = True
    return out, problems


b_runs, c_runs = load(b_files), load(c_files)
kb, pb = kills(b_runs, 'b')
kc, pc = kills(c_runs, 'c')
mapped = defaultdict(set)
rows = []
for entry in mapping:
    name = entry['file'].split('/')[-1]
    mapped[name].add(entry['original'])
    before = kb[name].get(entry['original'], set())
    after = set().union(*[kc[name].get(title, set()) for title in entry['converted']]) if entry['converted'] else set()
    rows.append({'file': name, 'original': entry['original'], 'converted': entry['converted'],
                 'killed_at_b': sorted(before), 'killed_at_c': sorted(after), 'lost': sorted(before - after),
                 'gained': sorted(after - before),
                 'lost_b_vanished_only': sorted(m for m in before - after if VANISHED.get(('b', name, entry['original'], m)))})
unchanged = []
for name in sorted(set(kb) | set(kc)):
    for title in sorted(set(kb[name]) | set(kc[name])):
        if title in mapped[name]:
            continue
        lost = kb[name].get(title, set()) - kc[name].get(title, set())
        if lost:
            unchanged.append({'file': name, 'leaf': title, 'lost': sorted(lost), 'lost_b_vanished_only': sorted(m for m in lost if VANISHED.get(('b', name, title, m)))})
summary = {'converted_tests': len(rows), 'pairs_at_b': sum(len(r['killed_at_b']) for r in rows),
           'lost_pairs': sum(len(r['lost']) for r in rows), 'unchanged_leaves_losing_kills': len(unchanged),
           'b_problems': pb, 'c_problems': pc}
json.dump({'summary': summary, 'converted': rows, 'unchanged': unchanged}, open(out, 'w'), indent=1)
print(json.dumps(summary, indent=1))
for row in rows:
    if row['lost']:
        print('LOST', row['file'], '|', row['original'][:90], '|', row['lost'])
for row in unchanged:
    print('UNCHANGED-LOST', row['file'], '|', row['leaf'][:90], '|', row['lost'])
