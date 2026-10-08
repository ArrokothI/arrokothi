#!/usr/bin/env python3
"""Read-only, independent reconciliation after the supplied scratch regeneration.
Usage: python3 -B check_figures.py <prototype-clone> <output.json>
"""
import json
import subprocess
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(ROOT / 'scripts'))
import packet_tools as tool

git = tool.Git(ROOT)
rev = git.run('rev-parse', 'HEAD').decode().strip()
spec = json.loads(git.blob(rev, 'tests/fixtures/packet-tools/adoption.json'))
old = json.loads(git.blob('60af5db9', 'tests/fixtures/packet-tools/adoption.json'))
entries = {row['key']: row for row in spec['holds']['register']['entries']}
files = sorted({row['file'] for row in spec['preserved']} | {row['file'] for row in spec['suite_targets']})
environment = tool.child_environment(tool.environment_declaration(None))[0]
matches = {r['key']: r for r in tool.register_matches(git, rev, files, spec['holds']['register']['recipes'],
                                                    environment, tool.typescript_toolchain(git, rev))}
operator_only = []
for member in spec['preserved']:
    if member['status'] != 'held' or not member.get('current'):
        continue
    key = f"{member['file']}:{member['current'][0]}:{member['current'][1]}"
    match = matches.get(key)
    if entries.get(key, {}).get('decision') == tool.VENV_RECORD and match and match['detector'] and \
       {site.split('@')[0] for site in match['detector']} == {'operator'}:
        operator_only.append({'member': member['member'], 'key': key, 'detector': match['detector']})

old_origins = {row['id']: row for row in old['origins']}
relinked = [row['id'] for row in spec['origins'] if row.get('closure') != old_origins[row['id']].get('closure')]
closed = [row for row in spec['origins'] if row['state'] == 'complete']
retained_states = all(row['state'] == old_origins[row['id']]['state'] for row in spec['origins'])
witnesses = {row['id'] for row in spec['counterexamples'] if row['kind'] in ('held_witness', 'superseded_witness')}
closed_with_witness = [r['id'] for r in closed if any(link['kind'] == 'counterexample' and link['id'] in witnesses
                                                   for link in r['closure']['links'])]
limited = []
for fragment in ('dispatch.test.ts:1527:3@', 'values.test.ts:735:3@'):
    member, = [row for row in spec['preserved'] if fragment in row['member']]
    limited.append(member)
result = {'revision': rev, 'node': subprocess.check_output(['node', '--version'], text=True).strip(),
          'member_statuses': dict(Counter(r['status'] for r in spec['preserved'])),
          'register_entries': len(entries), 'rule_1': sum(r.get('decision') == tool.VENV_RECORD for r in entries.values()),
          'closed_origins': len(closed), 'origin_states_unchanged': retained_states,
          'relinked': relinked, 'closed_with_witness': closed_with_witness,
          'operator_only_members': operator_only, 'owner_answer_limited_members': limited,
          'transfer_origins_unchanged': {r['origin'] for r in spec['transferred']} == {r['origin'] for r in old['transferred']}}
Path(sys.argv[2]).write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({k: len(v) if isinstance(v, list) else v for k, v in result.items()}, indent=2))
