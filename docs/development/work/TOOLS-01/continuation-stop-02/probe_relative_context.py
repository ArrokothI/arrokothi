"""Reproduce missing relative/qualified sealed context through the full corpus.

Usage: python3 -B probe_relative_context.py /absolute/path/to/subject
Exit 1 means a required refusal was accepted (or the direct-path control failed).
Only the fixture repositories are written; the subject checkout is untouched.
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
from test_packet_tools import tool

results = []
for form in ('relative', 'qualified', 'direct_control'):
    fixture = FormatTwoTests('test_a_complete_origin_needs_its_closure')
    fixture.setUp()
    try:
        fixture.write('docs/records/note.md', 'Required context: [deeper](deeper.md).\n')
        fixture.write('docs/records/deeper.md', 'Required transitive context.\n')
        pin = fixture.commit('pinned named records')
        reasons = {}
        if form == 'relative':
            text = 'Required context: [note](./docs/records/note.md).\n'
        elif form == 'qualified':
            text = f'Required context: [note](https://github.com/ArrokothI/arrokothi/blob/{pin}/docs/records/note.md).\n'
            reasons[pin] = 'Revision quoted in the source link; no context range is provided for its file.'
        else:
            text = 'Required context: docs/records/note.md.\n'
        fixture.write('sealed.txt', text)
        fixture.b = fixture.commit('origin with a named sealed dependency')

        def change(spec):
            spec['origins'][1].update(state='complete', closure={
                'links': [], 'non_executable': {'reason': 'record', 'rationale': 'A historical record.'},
                'context': [{'revision': fixture.b, 'path': 'sealed.txt', 'start': 1, 'end': 1}],
                'context_reasons': reasons})

        record = {'form': form, 'source': text, 'omitted': ['docs/records/note.md', 'docs/records/deeper.md'],
                  'required_refusal': True}
        try:
            result = fixture.check(fixture.fixture(change))
        except tool.CheckError as exc:
            record.update(observed='refused', reason=str(exc))
        else:
            record.update(observed='accepted', states=result['states'], closures=result['closures'])
        results.append(record)
    finally:
        fixture.doCleanups()

print(json.dumps({'subject': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root).decode().strip(),
                  'probes': results, 'elapsed_seconds': round(time.monotonic() - started, 3),
                  'scope': 'full corpus in temporary Git fixtures; no checker mocks',
                  'acceptance': 'not evaluated'}, indent=2))
sys.exit(1 if any(row['observed'] != 'refused' for row in results) else 0)
