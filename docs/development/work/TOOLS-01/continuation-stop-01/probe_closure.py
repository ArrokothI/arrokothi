"""Reproduce closure failures without changing the subject checkout.

Usage: python3 -B probe_closure.py /absolute/path/to/subject
Exit 1 means at least one required refusal was accepted. No result is acceptance.
"""
import json
from pathlib import Path
import subprocess
import sys
import time

started = time.monotonic()

root = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(root / 'tests/tooling'))
from test_adoption_format import FormatTwoTests
from test_preserved_tools import PreservedCensusTests, REGISTERED
from test_packet_tools import tool

results = []
fixture = FormatTwoTests('test_a_complete_origin_needs_its_closure')
fixture.setUp()
try:
    fixture.write('sealed.txt', 'Read docs/records/note.md.\n')
    fixture.write('docs/records/note.md', 'Read docs/records/deeper.md.\n')
    fixture.write('docs/records/deeper.md', 'Required transitive context.\n')
    fixture.b = fixture.commit('pinned sealed dependencies')
    def change(spec):
        spec['origins'][1].update(state='complete', closure={
            'links': [], 'non_executable': {'reason': 'record', 'rationale': 'A historical record.'},
            'context': [{'revision': fixture.b, 'path': 'sealed.txt', 'start': 1, 'end': 1}],
            'context_reasons': {'docs/records/note.md': 'Omit the named sealed record.'}})
    rev = fixture.fixture(change)
    try:
        result = fixture.check(rev)
    except tool.CheckError as exc:
        results.append({'id': 'TOOLS-CONT-01', 'required_refusal': True, 'observed': 'refused', 'reason': str(exc)})
    else:
        results.append({'id': 'TOOLS-CONT-01', 'required_refusal': True, 'observed': 'accepted',
                        'states': result['states'], 'closures': result['closures'],
                        'omitted': ['docs/records/note.md', 'docs/records/deeper.md']})
finally:
    fixture.doCleanups()

PreservedCensusTests.setUpClass()
try:
    fixture = PreservedCensusTests('test_witness_records_name_their_claim_and_members')
    spec = fixture.manifest(fixture.table, fixture.entries, order_model_holds=True)
    path = 'tests/fx/registered.test.mjs'
    origin = fixture.origins[path]
    held = fixture.held_member()
    spec['counterexamples'] = [{'id': 'ordinary', 'kind': 'behavior', 'origins': [origin],
                               'members': [held], 'required_result': 'Ordinary behavior, with no claim attribution.'}]
    for row in spec['origins']:
        if row['id'] == origin:
            row.update(state='complete', closure={
                'links': [{'kind': 'counterexample', 'id': 'ordinary'}],
                'context': [{'revision': fixture.pin, 'path': path, 'start': 1,
                             'end': len(REGISTERED.encode().split(b'\n'))}]})
    rev = fixture.commit_manifest(spec)
    try:
        result = tool.corpus(fixture.repo.reader, rev, 'corpus.json', toolchain=fixture.toolchain)
    except tool.CheckError as exc:
        results.append({'id': 'TOOLS-CONT-02', 'required_refusal': True, 'observed': 'refused', 'reason': str(exc)})
    else:
        results.append({'id': 'TOOLS-CONT-02', 'required_refusal': True, 'observed': 'accepted',
                        'states': result['states'], 'closures': result['closures'],
                        'held_member': held, 'record_kind': 'behavior', 'record_has_claim': False,
                        'held_count': result['preserved']['by_status']['held']})
finally:
    PreservedCensusTests.doClassCleanups()

print(json.dumps({'subject': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root).decode().strip(),
                  'probes': results, 'elapsed_seconds': round(time.monotonic() - started, 3), 'acceptance': 'not evaluated'}, indent=2))
sys.exit(1 if any(row['observed'] == 'accepted' for row in results) else 0)
