#!/usr/bin/env python3
"""Reduce matrix outputs to one JSON line per run: failed and vanished leaves against that file's control.

    python3 -B reduce.py <out.jsonl> <side>=<matrix.jsonl>...
"""
import json
import sys

with open(sys.argv[1], 'w') as out:
    for arg in sys.argv[2:]:
        side, path = arg.split('=', 1)
        rows = [json.loads(line) for line in open(path)]
        controls = {row['file']: row['leaves'] for row in rows if row.get('mutant') == 'control'}
        for row in rows:
            if 'file' not in row:
                out.write(json.dumps({'side': side, 'source': path.split('/')[-1], **row}) + '\n')
                continue
            control = controls.get(row['file'], {})
            record = {'side': side, 'source': path.split('/')[-1], 'mutant': row['mutant'], 'file': row['file'].split('/')[-1],
                      'status': row['status'], 'exit': row['exit']}
            if row['mutant'] == 'control':
                record['passed'] = sum(verdict == 'passed' for verdict in row['leaves'].values())
                record['not_passed'] = sorted(leaf for leaf, verdict in row['leaves'].items() if verdict != 'passed')
            else:
                record['failed'] = sorted(leaf for leaf, verdict in row['leaves'].items() if verdict == 'failed' and control.get(leaf) == 'passed')
                record['vanished'] = sorted(leaf for leaf in control if leaf not in row['leaves'])
            out.write(json.dumps(record) + '\n')
