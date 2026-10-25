"""Review 04 supplementary checks within owner choice 05's P/O and accommodation bounds.

Run at C with Node 26.10.0 first in PATH:
  PYTHONPATH=tests/tooling python3 -B /path/to/probe-bounds.py
All Git changes are in this probe's disposable repositories. No evasion search.
"""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unicodedata

from test_packet_tools import RepositoryFixture, tool
from test_target_tools import ROOT

facts = {}
r = RepositoryFixture(methodName='setUp')
r.setUp()
try:
    r.write('tests/fixtures/input.txt', 'actual\n')
    r.write('tests/fixtures/caf\u00e9.txt', 'unicode\n')
    os.symlink('input.txt', r.root / 'tests/fixtures/link')
    script = r'''import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const p = 'tests/fixtures/input.txt', d = 'tests/fixtures';
const invoke = (f, ...args) => new Promise((resolve, reject) =>
  f(...args, (error, value) => error ? reject(error) : resolve(value)));
for (const make of [() => ({}), () => Object.create(null), () => Object.create({})]) {
  const o = make();
  fs.readFileSync(p, o); await fs.promises.readFile(p, o); await invoke(fs.readFile, p, o);
  fs.readdirSync(d, o); await fs.promises.readdir(d, o); await invoke(fs.readdir, d, o);
  fs.opendirSync(d, o).closeSync(); await (await fs.promises.opendir(d, o)).close();
  for (const name of ['stat', 'lstat', 'statfs', 'realpath', 'readlink']) {
    const target = name === 'readlink' ? d + '/link' : p;
    fs[name + 'Sync'](target, o); await fs.promises[name](target, o);
  }
  fs.realpathSync.native(p, o);
  await fs.openAsBlob(p, o);
  for await (const chunk of fs.createReadStream(p, o)) void chunk;
}
for (const p of ['tests/fixtures/input.txt', './tests/fixtures/../fixtures/input.txt',
                 'tests/fixtures/INPUT.txt', 'tests/FIXTURES/input.txt',
                 'tests/fixtures/LINK', 'tests/fixtures/caf\u00e9.txt', 'tests/fixtures/cafe\u0301.txt']) {
  try { fs.readFileSync(p); } catch (e) { if (e.code !== 'ENOENT') throw e; }
}
fs.readFileSync(Buffer.from('tests/fixtures/input.txt'));
fs.readFileSync(pathToFileURL(process.cwd() + '/tests/fixtures/input.txt'));
process.chdir('tests');
fs.readFileSync('fixtures/input.txt');
'''
    r.write('probe.mjs', script)
    rev = r.commit('probe inputs')
    root = Path(os.path.realpath(r.root))
    assert tool.pristine(r.reader, rev)
    with tempfile.TemporaryDirectory() as output:
        trace = Path(output) / 'reads.jsonl'
        proc = subprocess.run(['node', 'probe.mjs'], cwd=root, capture_output=True, text=True,
                              env=dict(os.environ, NODE_OPTIONS='--import=' + str(ROOT / tool.READ_TRACE),
                                       ARROKOTHI_READ_TRACE=str(trace)))
        assert proc.returncode == 0, proc.stderr
        rows = [json.loads(line) for line in trace.read_text().splitlines()
                if json.loads(line).get('operation') != 'preload']
    ordinary = [row for row in rows if row.get('text') in ('tests/fixtures/input.txt', 'tests/fixtures')
                and row.get('second') == 'options']
    by_prototype = {}
    for proto in ('Object.prototype', 'null', 'other'):
        part = [row for row in ordinary if row.get('prototype') == proto]
        assert part
        outcomes = [tool.admit(r.reader, rev, root, row, set()) for row in part]
        if proto == 'other':
            assert all(o[0] == 'refused' and 'another prototype' in o[1] for o in outcomes), outcomes
        else:
            assert all(o[0] == 'read' for o in outcomes), outcomes
        by_prototype[proto] = sorted({row['operation'] for row in part})
    facts['real_tracer_options'] = by_prototype
    # Every options-taking matrix operation rejects missing/other prototype metadata even
    # for import-closure and outside-path rows. This is admission coverage, not native execution.
    options_ops = [op for op, (forms, _) in tool.READ_ARGUMENTS.items() if 'options' in forms]
    count = 0
    for op in options_ops:
        for text, aside in [('tests/fixtures/input.txt', {'tests/fixtures/input.txt'}),
                            ('/a-review-only-nonexistent-outside-path', set())]:
            for proto in ('other', None):
                row = dict(operation=op, argument='path', text=text, cwd=str(root),
                           second='options', keys=[])
                if proto is not None:
                    row['prototype'] = proto
                result = tool.admit(r.reader, rev, root, row, aside)
                assert result == ('refused', 'an options object with another prototype: ' + op), result
                count += 1
    facts['option_guard_before_scope'] = {'operations': options_ops, 'checks': count}
    # The path rule is checked before aside exemption and before tracked-link refusal.
    path_checks = []
    for text in ('tests/fixtures/INPUT.txt', 'tests/FIXTURES/input.txt', 'tests/fixtures/LINK',
                 unicodedata.normalize('NFD', 'tests/fixtures/caf\u00e9.txt')):
        row = next(row for row in rows if row.get('text') == text)
        outcome = tool.admit(r.reader, rev, root, row, {text})
        if os.path.lexists(root / text):
            assert outcome[0] == 'refused' and 'spelling is not a tracked entry' in outcome[1], outcome
        path_checks.append({'path': text, 'exists_on_host': os.path.lexists(root / text), 'outcome': outcome})
    positives = [row for row in rows if row.get('second') == 'undefined' and
                 row.get('text') in ('tests/fixtures/input.txt', './tests/fixtures/../fixtures/input.txt',
                                     str(root / 'tests/fixtures/input.txt'), 'fixtures/input.txt')]
    assert len(positives) >= 5, positives
    for row in positives:
        assert tool.admit(r.reader, rev, root, row, set()) == ('read', 'tests/fixtures/input.txt', 'bytes')
    facts['path_checks'] = path_checks
    facts['positive_path_rows'] = len(positives)
    facts['trace_rows'] = len(rows)
    assert tool.pristine(r.reader, rev)
finally:
    r.doCleanups()

def accommodation_case(mode):
    r = RepositoryFixture(methodName='setUp')
    r.setUp()
    try:
        r.write('sealed-notes.md', 'Sealed.\n\n')
        sealed = r.commit('sealed notes')
        if mode == 'other-whitespace':
            r.write('other.md', 'Unexempted.\n\n')
        if mode == 'changed-sealed':
            r.write('sealed-notes.md', 'Changed.\n\n')
        c, h = r.candidate_pair(
            preserve=[{'revision': sealed, 'path': 'sealed-notes.md'}],
            whitespace_exceptions=[{'revision': sealed, 'path': 'sealed-notes.md', 'reason': 'Recorded exception.'}])
        try:
            result = tool.candidate(r.reader, c, h, 'spec.json')
        except tool.CheckError as e:
            assert mode != 'positive'
            if mode == 'other-whitespace':
                raw = subprocess.run(['git', '-C', str(r.root), 'diff', '--check', r.b, h,
                                      '--', '.', ':(exclude)sealed-notes.md'], capture_output=True, text=True)
                assert raw.returncode != 0 and 'other.md' in raw.stdout, raw
                return {'result': 'refused', 'error': str(e), 'diff_check': raw.stdout}
            assert 'preserved path changed' in str(e), str(e)
            return {'result': 'refused', 'error': str(e)}
        assert mode == 'positive', result
        return {'result': result['result'], 'whitespace_exceptions': result['whitespace_exceptions']}
    finally:
        r.doCleanups()

facts['accommodation'] = {mode: accommodation_case(mode)
                           for mode in ('positive', 'other-whitespace', 'changed-sealed')}
print(json.dumps(facts, indent=2, ensure_ascii=True))
