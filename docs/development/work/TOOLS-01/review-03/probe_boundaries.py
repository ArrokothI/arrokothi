#!/usr/bin/env python3
"""Independent shared-parser and observation-only probes; temporary fixtures only.
Usage: python3 -B probe_boundaries.py <clean-candidate-clone>
"""
import json
import subprocess
import sys
from pathlib import Path
ROOT = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(ROOT / 'tests/tooling'))
from test_packet_tools import RepositoryFixture, tool
from test_runner_targets import TargetSetRunnerTests, mutant, SOURCE

assert subprocess.check_output(['node', '--version'], text=True).strip() == 'v26.10.0'
out = {'subject': '28258b282532b36eef8fb1571d79b6343b54427b', 'markdown': {}}
cases = {
    'trailing-text': ['~~~js', '~~~ not-a-close', '## still code', '~~~'],
    'shorter': ['~~~~js', '~~~', '## still code', '~~~~'],
    'mixed': ['~~~js', '```', '## still code', '~~~'],
    'whitespace': ['~~~js', '## still code', '   ~~~~ \t'],
    'backticks': ['````js', '```', '## still code', '````'],
    'unclosed': ['~~~js', '## still code'],
    'indented': ['    ~~~js', '## still code', '    ~~~'],
    'list': ['- ~~~js', '  ## still code', '  ~~~'],
    'quote': ['> ~~~js', '> ## still code', '> ~~~'],
    'html': ['<!--', '## still comment', '-->', '~~~js', 'code', '~~~'],
}
r = RepositoryFixture(methodName='setUp'); r.setUp()
try:
    for label, middle in cases.items():
        lines = ['# Review', '## Finding', *middle, 'Read [note](docs/records/note.md).', '## Next', 'outside']
        text = '\n'.join(lines) + '\n'
        r.write('source.md', text); r.write('docs/records/note.md', 'Required record.\n')
        pin = r.commit(label)
        origin = {'id': label, 'revision': pin, 'path': 'source.md', 'line': 3, 'kind': 'artifact'}
        lo, hi, _, uncertain = tool.context_minimum(r.reader, origin)
        ranges = [{'revision': pin, 'path': 'source.md', 'start': lo, 'end': hi}]
        results = {}
        for with_note in (False, True):
            try:
                value = tool.context_check(r.reader, origin, {'context': ranges + ([{
                    'revision': pin, 'path': 'docs/records/note.md', 'start': 1, 'end': 1}] if with_note else [])})
                results[str(with_note)] = value
            except tool.CheckError as e:
                results[str(with_note)] = {'refused': str(e)}
        assert 'refused' in results['False']
        if label in ('unclosed', 'indented', 'list', 'quote', 'html'):
            assert uncertain and 'refused' in results['True']
        else:
            assert uncertain is None and hi == len(lines) - 2 and 'refused' not in results['True']
        out['markdown'][label] = {'source': text, 'minimum': [lo, hi], 'uncertain': uncertain, 'checks': results}
finally:
    r.doCleanups()

r = TargetSetRunnerTests(methodName='setUp'); r.setUp()
try:
    source = "import { AssertionError } from 'node:assert';\n" + SOURCE
    mutations = [
        mutant('trimmed-production', 'return n + 1;', "throw new AssertionError({actual: 0, expected: 1, operator: 'strictEqual', stackStartFn: compute});"),
        mutant('empty-provenance', 'return n + 1;', "const e = new AssertionError({actual: 0, expected: 1}); e.stack = ''; throw e;"),
        mutant('numeric-provenance', 'return n + 1;', "const e = new AssertionError({actual: 0, expected: 1}); Object.defineProperty(e, 'stack', {value: 17}); throw e;"),
        mutant('missing-provenance', 'return n + 1;', 'throw 17;'),
    ]
    rows, result = r.run_registry(mutations, source=source)
    assert all(row['status'] == 'observed' and 'killed_by' not in row for row in rows.values())
    assert result['counts'].get('killed', 0) == 0 and result['result'] == 'attention_required'
    out['mutations'] = mutations
    out['observations'] = result
finally:
    r.doCleanups()
print(json.dumps(out, indent=2))
