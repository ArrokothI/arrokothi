"""Reproduce TOOLS-CONT-03 against a subject checkout without changing it.

Usage: python3 -B probe_context_lines.py /absolute/path/to/subject
Exit 1 means a line-coordinate defect reproduced; no result is acceptance.
Only the fixture repositories created by RepositoryFixture are written.
"""
import json
from pathlib import Path
import subprocess
import sys
import time

started = time.monotonic()
root = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(root / 'tests/tooling'))
from test_closure_tools import ClosureTests, tool


def lf_lines(data):
    return max(1, data.count(b'\n') + bool(data and not data.endswith(b'\n')))


results = []
reader = tool.Git(root)
path = 'tests/conformance/architecture/kernel-landing-zone.test.ts'
for revision in ('9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49',
                 '66bc041175e6fc191c2e7cf88de198111e7d97c9'):
    data = reader.blob(revision, path)
    origin = {'kind': 'artifact', 'revision': revision, 'path': path, 'line': 1}
    origin['id'] = tool.origin_id('artifact', origin)
    start, end, _ = tool.context_minimum(reader, origin)
    results.append({'probe': 'pinned_whole_file', 'origin': origin, 'sha256': tool.digest(data),
                    'expected_range': [1, lf_lines(data)], 'observed_range': [start, end],
                    'defect_reproduced': [start, end] != [1, lf_lines(data)]})

fixture = ClosureTests('test_a_fence_needs_its_heading_section')
fixture.setUp()
try:
    # Exactly seven LF lines. Unicode line separators are content within line 2.
    data = ('# Intro\nprefix\u2028## Forged\u2028padding\u2028padding\n'
            '## Required\nRead docs/records/note.md.\n```js\nconst value = 1;\n```\n').encode()
    (fixture.root / 'docs/review.md').write_bytes(data)
    revision = fixture.commit('pinned LF fence with Unicode separators')
    origin = {'id': 'origin.fence', 'kind': 'artifact', 'revision': revision,
              'path': 'docs/review.md', 'line': 5}
    closure = {'links': [], 'non_executable': {'reason': 'record', 'rationale': 'Diagnostic only.'},
               'context': [{'revision': revision, 'path': 'docs/review.md', 'start': 3, 'end': 5}],
               'context_reasons': {}}
    facts = {'target': {}, 'counterexample': {}, 'member': {}, 'family': {}, 'case': {}}
    start, end, text = tool.context_minimum(fixture.reader, origin)
    record = {'probe': 'fence_omits_required_context', 'source_utf8': data.decode(),
              'fence_LF_line': 5, 'expected_minimum': [3, 7], 'observed_minimum': [start, end],
              'text_checker_scanned': text, 'recorded_range': [3, 5],
              'omitted': ['docs/records/note.md', 'docs/records/deeper.md']}
    try:
        result = tool.origin_closure(fixture.reader, revision, origin['id'], {'closure': closure}, origin, facts)
    except tool.CheckError as exc:
        record.update(observed='refused', reason=str(exc), defect_reproduced=False)
    else:
        record.update(observed='accepted', result=result, defect_reproduced=True)
    results.append(record)

    # Distinguishing control: with ordinary content on LF line 2, the same short range refuses.
    (fixture.root / 'docs/review.md').write_bytes(data.replace(b'prefix\xe2\x80\xa8## Forged\xe2\x80\xa8padding\xe2\x80\xa8padding', b'prefix'))
    revision = fixture.commit('ordinary LF control')
    origin['revision'] = revision
    closure['context'][0]['revision'] = revision
    try:
        tool.origin_closure(fixture.reader, revision, origin['id'], {'closure': closure}, origin, facts)
    except tool.CheckError as exc:
        results.append({'probe': 'ordinary_LF_control', 'observed': 'refused', 'reason': str(exc),
                        'control_passed': 'does not cover the minimum' in str(exc)})
    else:
        results.append({'probe': 'ordinary_LF_control', 'observed': 'accepted', 'control_passed': False})
finally:
    fixture.doCleanups()

print(json.dumps({'subject': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root).decode().strip(),
                  'probes': results, 'elapsed_seconds': round(time.monotonic() - started, 3),
                  'scope': 'context_minimum and origin_closure with real Git blobs, not a full corpus run',
                  'acceptance': 'not evaluated'}, indent=2))
sys.exit(1 if any(row.get('defect_reproduced') or row.get('control_passed') is False for row in results) else 0)
