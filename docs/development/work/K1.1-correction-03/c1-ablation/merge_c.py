#!/usr/bin/env python3
"""Replace the C rows of mutants whose B site splits in two at C (or whose C anchor moved) with the rows of
their faithful C analogue, renamed to the B mutant they stand for.

    python3 -B merge_c.py <dir>   (reads matrix-c.jsonl, matrix-c-split.jsonl, matrix-c-mv3.jsonl; writes
                                   matrix-c-merged.jsonl)
"""
import json, sys
S = sys.argv[1]
ALIAS = {'SPLIT-RC-ELEMENT-READ': ['RC-ELEMENT-READ'], 'SPLIT-RC-ELEMENT-READ-TWICE': ['RC-ELEMENT-READ-TWICE'],
         'SPLIT-READ-FROM-DESCRIPTOR': ['MV1-element-read-replaced-by-descriptor-value', 'VAL-object-read-from-descriptor'],
         'MV3-AT-C': ['MV3-array-symbols-listing-skipped']}
replaced = {b for bs in ALIAS.values() for b in bs}
out = open(f'{S}/matrix-c-merged.jsonl', 'w')
for line in open(f'{S}/matrix-c.jsonl'):
    row = json.loads(line)
    if row.get('mutant') in replaced:
        continue
    out.write(line)
for name in ('matrix-c-split.jsonl', 'matrix-c-mv3.jsonl'):
    for line in open(f'{S}/{name}'):
        row = json.loads(line)
        if row.get('mutant') == 'control':
            continue
        for b in ALIAS[row['mutant']]:
            out.write(json.dumps(dict(row, mutant=b, c_mutant=row['mutant'])) + '\n')
