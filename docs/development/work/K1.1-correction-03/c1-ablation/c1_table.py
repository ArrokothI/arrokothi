#!/usr/bin/env python3
"""C1 tables (markdown) from the analysis: per conversion group, per converted test, and per unchanged leaf.

    python3 -B c1_table.py <dir>

Reads <dir>/analysis3.json (analyze.py over the merged C matrix), cascade-b.jsonl and snap-c.jsonl
(cascade.py), matrix-c-merged.jsonl and matrix-c-new.jsonl, and conversion-records.json beside this script.
Writes <dir>/c1-tables.md and <dir>/c1-killers.json. A lost kill's reason is one of:
  vanished at B  the leaf did not run under the mutant at B, so B shows no kill by this leaf;
  cascade at B   the leaf fails at B only after earlier tests in its file, and passes alone;
  restored       a C-side strengthening, checked alone at C, kills it again;
  elsewhere      this test no longer reaches the mechanism, and other C leaves kill the mutant;
  unkilled       no C leaf kills the mutant.
"""
import json
import pathlib
import sys
from collections import defaultdict

D = pathlib.Path(sys.argv[1])
HERE = pathlib.Path(__file__).resolve().parent
a = json.loads((D / 'analysis3.json').read_text())
alone = {(r['file'], r['leaf'], r['mutant']): r['alone'] for r in map(json.loads, open(D / 'cascade-b.jsonl'))}
snap = {(r['file'], r['leaf'], r['mutant']): r['alone'] for r in map(json.loads, open(D / 'snap-c.jsonl'))}
records = {}
for group in json.loads((HERE / 'conversion-records.json').read_text()):
    for test in group['conv']['tests']:
        records[(test['file'].split('/')[-1], test['original_title'])] = test
ALIAS = {'SPLIT-READ-FROM-DESCRIPTOR': ['MV1-element-read-replaced-by-descriptor-value', 'VAL-object-read-from-descriptor'],
         'SPLIT-RC-ELEMENT-READ-TWICE': ['RC-ELEMENT-READ-TWICE'], 'MV3-AT-C': ['MV3-array-symbols-listing-skipped']}
KIND = {'W': 'witness', 'I': 'instrument', 'WI': 'witness + instrument'}
# Converted after the conversion records were written, by the silent-pass search (3e6a51d8): the Proxy whose
# getPrototypeOf trap swapped the Object binding is now a refused witness, and an envelope getter swaps it.
records[('creation.test.ts', 'K11-R5-VAL-03 creation refuses a prototype observation that swaps the live Object binding')] = {'kind': 'WI'}

killers = defaultdict(set)
for name in ('matrix-c-merged.jsonl', 'matrix-c-new.jsonl'):
    rows = [json.loads(line) for line in open(D / name)]
    controls = {r['file']: r['leaves'] for r in rows if r.get('mutant') == 'control'}
    for r in rows:
        if r.get('mutant') in (None, 'control') or 'file' not in r or r['status'] != 'finished':
            continue
        for leaf, verdict in r['leaves'].items():
            if verdict == 'failed' and controls[r['file']].get(leaf) == 'passed':
                for m in ALIAS.get(r['mutant'], [r['mutant']]):
                    killers[m].add(r['file'].split('/')[-1] + ' › ' + leaf.split(' > ')[-1])
(D / 'c1-killers.json').write_text(json.dumps({k: sorted(v) for k, v in sorted(killers.items())}, indent=1) + '\n')


def reason(file, leaf, m, row, title=None):
    if m in row.get('lost_b_vanished_only', []):
        return 'vanished at B'
    if alone.get((file, leaf, m)) == ['passed']:
        return 'cascade at B'
    if snap.get((file, title or leaf, m)) == ['failed']:
        return 'restored'
    return 'elsewhere' if killers.get(m) else 'unkilled'


groups = defaultdict(lambda: {'tests': 0, 'b': set(), 'c': set()})
detail, totals = [], defaultdict(int)
for row in a['converted']:
    file, leaf = row['file'], row['original']
    title = row['converted'][0] if row['converted'] else '(removed)'
    lost = {m: reason(file, leaf, m, row, title) for m in row['lost']}
    own_b = {m for m in row['killed_at_b'] if lost.get(m) not in ('vanished at B', 'cascade at B')}
    at_c = (set(row['killed_at_b']) - set(row['lost'])) | {m for m, r in lost.items() if r == 'restored'}
    g = groups[file]
    g['tests'] += 1
    g['b'] |= own_b
    g['c'] |= at_c | set(row['killed_at_c'])
    for r in lost.values():
        totals[r] += 1
    totals['pairs'] += len(row['killed_at_b'])
    totals['kept'] += len(at_c)
    rec = records.get((file, leaf), {})
    renamed = '' if title == leaf else f' (was: {leaf})'
    lost_text = '; '.join(f'`{m}`: {r}' for m, r in sorted(lost.items())) or '—'
    detail.append(f"| {file} | {title}{renamed} | {KIND.get(rec.get('kind'), '?')} | {len(row['killed_at_b'])} | {len(at_c)} | {lost_text} |")
summary = []
for file, g in sorted(groups.items()):
    missing = sorted(g['b'] - g['c'])
    text = '; '.join(f'`{m}` (killed at C by {len(killers[m])} other leaves)' if killers.get(m) else f'`{m}` (no C leaf kills it)'
                     for m in missing) or '—'
    summary.append(f"| {file} | {g['tests']} | {len(g['b'])} | {len(g['b'] & g['c'])} | {text} |")
unchanged = []
for row in sorted(a['unchanged'], key=lambda r: (r['file'], r['leaf'])):
    lost = {m: reason(row['file'], row['leaf'], m, row) for m in row['lost']}
    for r in lost.values():
        totals['unchanged ' + r] += 1
    unchanged.append(f"| {row['file']} | {row['leaf']} | " + '; '.join(f'`{m}`: {r}' for m, r in sorted(lost.items())) + ' |')
lost_mutants = sorted({m for row in a['converted'] for m in row['lost']} | {m for row in a['unchanged'] for m in row['lost']})
killer_lines = [f"| `{m}` | {len(killers.get(m, []))} | " + ('; '.join(sorted(killers.get(m, []))[:6]) or '—') +
                (' …' if len(killers.get(m, [])) > 6 else '') + ' |' for m in lost_mutants]
out = ['## Groups', '', '| Group | Converted tests | Mutants killed at B (own kills) | Still killed by the group at C | Not killed by the group at C |',
       '|---|---|---|---|---|', *summary, '', '## Converted tests', '',
       '| File | Test at C | Conversion | Killed at B | Killed at C | Lost, with reason |', '|---|---|---|---|---|---|', *detail, '',
       '## Unchanged leaves that lost a kill', '', '| File | Leaf | Lost, with reason |', '|---|---|---|', *unchanged, '',
       '## Where each lost mutant is killed at C', '', '| Mutant (B id) | C leaves killing its C analogue | First six |', '|---|---|---|',
       *killer_lines, '']
(D / 'c1-tables.md').write_text('\n'.join(out))
print(json.dumps(totals))
