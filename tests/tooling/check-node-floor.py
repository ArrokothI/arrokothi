#!/usr/bin/env python3
"""TOOLS-01 exact Node v22.9.0 prerequisites; stop at the first failed assumption."""
import argparse
import copy
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile


ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / 'tests/tooling/node-floor'
ARCHIVE_REVISION = '9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49'
EVENT_TYPES = ('test:start', 'test:pass', 'test:fail')
TEST_FLAGS = ['--test', '--experimental-strip-types']
TEST_GLOBS = [
    'packages/core/tests/*.test.ts', 'packages/kernel/tests/*.test.ts',
    'packages/models/gemini/tests/*.test.ts', 'packages/retrieval/local/tests/*.test.ts',
    'packages/agents/strands/tests/*.test.ts', 'packages/interoperability/mcp/tests/*.test.ts',
    'tests/conformance/*/*.test.ts', 'packages/sdk/tests/*.test.ts',
]


def verify_archive_snapshot(directory):
    """Verify every extracted file and symlink against archive.md's pinned Git tree."""
    tree = subprocess.check_output(['git', 'ls-tree', '-r', '-z', ARCHIVE_REVISION], cwd=ROOT)
    entries = {}
    for row in tree.split(b'\0'):
        if not row:
            continue
        metadata, name = row.split(b'\t', 1)
        mode, kind, oid = metadata.decode().split()
        assert kind == 'blob' and mode in ('100644', '100755', '120000')
        entries[name.decode()] = (mode, oid)
    actual = {str(path.relative_to(directory)) for path in directory.rglob('*')
              if path.is_symlink() or not path.is_dir()}
    assert actual == set(entries), 'archive snapshot paths differ'
    manifest = []
    for name, (mode, oid) in sorted(entries.items()):
        path = directory / name
        assert path.is_symlink() == (mode == '120000'), 'archive entry kind differs: ' + name
        data = os.readlink(path).encode() if mode == '120000' else path.read_bytes()
        blob = b'blob ' + str(len(data)).encode() + b'\0' + data
        assert hashlib.sha1(blob).hexdigest() == oid, 'archive bytes differ: ' + name
        manifest.append([name, mode, hashlib.sha256(data).hexdigest()])
    return {'revision': ARCHIVE_REVISION,
            'regular_files': sum(mode != '120000' for mode, _ in entries.values()),
            'symlinks': sum(mode == '120000' for mode, _ in entries.values()),
            'content_manifest_sha256': hashlib.sha256(json.dumps(manifest).encode()).hexdigest(),
            'environment_set': {'ARROKOTHI_EVIDENCE_ROOT': 'verified temporary Git snapshot'},
            'source': 'docs/development/archive.md pinned Git fallback'}


def prepare_archive_snapshot(directory):
    archive = directory.parent / 'snapshot.tar'
    subprocess.run(['git', 'archive', '--format=tar', '--output=' + str(archive), ARCHIVE_REVISION],
                   cwd=ROOT, check=True, timeout=30)
    # This is the fixed repository-owned snapshot, never a caller-supplied archive.
    subprocess.run(['tar', '-xf', str(archive), '-C', str(directory)], check=True, timeout=30)
    archive.unlink()
    return verify_archive_snapshot(directory)


def fixture_registrations(path):
    """Source oracle for these literal, one-registration-per-line fixtures only.

    This is not step 5's general TypeScript registration parser. The fixture imports
    exactly these node:test bindings; its only receiver is the test context t.
    """
    registrations = {}
    for line, text in enumerate(path.read_text().splitlines(), 1):
        match = re.match(r"(\s*)(test|it|describe|suite|t\.test)\('([^']+)'", text)
        if match is None:
            match = re.match(r"(\s*)await (t\.test)\('([^']+)'", text)
            if match is None:
                continue
            column = len(match[1]) + len('await ') + 1
        else:
            column = len(match[1]) + 1
        # A method-call frame points to its property name within the registration.
        if match[2] == 't.test':
            column += len('t.')
        registrations[(str(path), line, column)] = {
            'kind': 'suite' if match[2] in ('describe', 'suite') else 'test',
            'name': match[3],
        }
    return registrations


def pairs_from_events(events, registrations):
    """A1's start/result join, source-kind check and leaf rule, without synthetic events."""
    starts, results, order = {}, {}, []
    for event in events:
        if event['type'] not in EVENT_TYPES:
            continue
        data = event['data']
        for field in ('file', 'name'):
            if not isinstance(data.get(field), str) or not data[field]:
                raise ValueError('missing location/name: ' + field)
        for field in ('line', 'column', 'nesting'):
            minimum = 0 if field == 'nesting' else 1
            if type(data.get(field)) is not int or data[field] < minimum:
                raise ValueError('missing location/nesting: ' + field)
        key = tuple(data[field] for field in ('file', 'line', 'column', 'nesting', 'name'))
        table = starts if event['type'] == 'test:start' else results
        if key in table:
            raise ValueError('duplicated key among ' + ('starts' if table is starts else 'results'))
        table[key] = data
        if table is starts:
            order.append(key)
    if set(starts) != set(results):
        raise ValueError('start/result keys differ')
    pairs = []
    for key in order:
        data = results[key]
        details = data.get('details', {})
        if 'type' not in details:
            kind = 'test'
        elif details['type'] == 'suite':
            kind = 'suite'
        else:
            raise ValueError('unknown details.type')
        source = registrations.get(key[:3])
        if source is None or source['kind'] != kind or source['name'] != key[4]:
            raise ValueError('source registration mismatch')
        parent = next((i for i in range(len(pairs) - 1, -1, -1)
                       if pairs[i]['nesting'] == key[3] - 1), None)
        if key[3] and parent is None:
            raise ValueError('missing parent start')
        pairs.append({'name': key[4], 'nesting': key[3], 'kind': kind,
                      'parent': parent, 'location': list(key[:3])})
    parents = {pair['parent'] for pair in pairs}
    for index, pair in enumerate(pairs):
        pair['leaf'] = pair['kind'] == 'test' and index not in parents
    return pairs


def range_count(scripts, offset):
    candidates = [block for script in scripts for function in script['functions']
                  for block in function['ranges'] if block['startOffset'] <= offset < block['endOffset']]
    assert candidates, 'no range covers anchor'
    return min(candidates, key=lambda block: block['endOffset'] - block['startOffset'])['count']


def source_offset(file, anchor):
    source = file.read_text()
    assert source.count(anchor) == 1, 'ambiguous fixture anchor: ' + anchor
    return len(source[:source.index(anchor)].encode('utf-16-le')) // 2


def summary_counts(events):
    counts = {}
    for event in events:
        if event['type'] == 'test:diagnostic' and event['data']['nesting'] == 0:
            match = re.fullmatch(r'(tests|suites|pass|fail|cancelled|skipped|todo) (\d+)',
                                 event['data']['message'])
            if match:
                assert match[1] not in counts, 'duplicate summary count'
                counts[match[1]] = int(match[2])
    assert set(counts) == {'tests', 'suites', 'pass', 'fail', 'cancelled', 'skipped', 'todo'}, counts
    return counts


def full_paths(pairs):
    paths = []
    for pair in pairs:
        parent = pair['parent']
        paths.append((paths[parent] if parent is not None else []) + [pair['name']])
    return paths


def valid_reach(events, registrations, target):
    def synthetic(event):
        data = event['data']
        return (event['type'] in EVENT_TYPES and data.get('name') == data.get('file')
                and data.get('nesting') == 0 and data.get('line') == 1 and data.get('column') == 1
                and (data.get('file'), 1, 1) not in registrations)
    pairs = pairs_from_events([event for event in events if not synthetic(event)], registrations)
    leaves = [path for pair, path in zip(pairs, full_paths(pairs)) if pair['leaf']]
    counts = summary_counts(events)
    return (leaves == [target] and not any(event['type'] == 'test:fail' for event in events)
            and counts == {'tests': 1, 'suites': sum(p['kind'] == 'suite' for p in pairs),
                           'pass': 1, 'fail': 0, 'cancelled': 0, 'skipped': 0, 'todo': 0})


class Floor:
    def __init__(self, node):
        self.node = node
        self.environment = {name: os.environ[name] for name in ('PATH', 'HOME', 'TMPDIR')
                            if name in os.environ}
        self.environment['LANG'] = 'C.UTF-8'
        self.environment['PATH'] = str(node.parent) + os.pathsep + self.environment.get('PATH', '')
        self.runs = []

    def run(self, arguments, extra_env=None, timeout=30, cwd=ROOT):
        argv = [str(self.node), *map(str, arguments)]
        env = dict(self.environment, **(extra_env or {}))
        return self.run_command(argv, env, timeout, cwd, extra_env)

    def run_command(self, argv, env, timeout=30, cwd=ROOT, extra_env=None, record_output=True):
        run = subprocess.run(argv, cwd=cwd, env=env, text=True, capture_output=True, timeout=timeout)
        record = {'argv': argv, 'exit': run.returncode, 'stdout': run.stdout, 'stderr': run.stderr,
                  'extra_environment': extra_env or {}}
        self.runs.append(record if record_output else {
            'argv': argv, 'exit': run.returncode, 'output_recorded': False})
        return record

    def events(self, file, flags=(), extra_env=None):
        run = self.run(['--test', *flags, '--test-reporter=' + str(FIXTURES / 'events-reporter.mjs'),
                        file], extra_env)
        events = [json.loads(line) for line in run['stdout'].splitlines()]
        return run, events

    def a1(self):
        file = FIXTURES / 'events.test.mjs'
        run, events = self.events(file)
        assert run['exit'] == 1, 'intentional failure fixture must exit 1'
        registrations = fixture_registrations(file)
        pairs = pairs_from_events(events, registrations)
        expected = ['first pass', 'second intentional failure', 'outer suite', 'nested pass',
                    'failing suite', 'nested intentional failure', 'empty suite', 'parent test', 'subtest']
        assert [pair['name'] for pair in pairs] == expected, 'definition order differs'
        assert [pair['name'] for pair in pairs if pair['leaf']] == [
            'first pass', 'second intentional failure', 'nested pass', 'nested intentional failure', 'subtest']
        assert [pair['parent'] for pair in pairs] == [None, None, None, 2, None, 4, None, None, 7]
        relevant = [event for event in events if event['type'] in EVENT_TYPES]
        starts = [event for event in relevant if event['type'] == 'test:start']
        assert all('details' not in event['data'] for event in starts), 'start gained details'
        verdicts = {(event['data']['name'], event['type']) for event in relevant if event['type'] != 'test:start'}
        assert ('outer suite', 'test:pass') in verdicts and ('failing suite', 'test:fail') in verdicts
        negatives = {}
        for name in ('unknown_type', 'kind_mismatch', 'start_without_result', 'result_without_start',
                     'duplicate_start', 'duplicate_result', 'missing_start_location', 'missing_result_location'):
            altered = copy.deepcopy(relevant)
            start = next(e for e in altered if e['type'] == 'test:start')
            result = next(e for e in altered if e['type'] == 'test:pass')
            if name == 'unknown_type':
                result['data'].setdefault('details', {})['type'] = 'unknown'
            elif name == 'kind_mismatch':
                result['data'].setdefault('details', {})['type'] = 'suite'
            elif name == 'start_without_result':
                altered.remove(result)
            elif name == 'result_without_start':
                altered.remove(start)
            elif name == 'duplicate_start':
                altered.append(copy.deepcopy(start))
            elif name == 'duplicate_result':
                altered.append(copy.deepcopy(result))
            elif name == 'missing_start_location':
                del start['data']['line']
            else:
                del result['data']['column']
            try:
                pairs_from_events(altered, registrations)
            except ValueError as exc:
                negatives[name] = str(exc)
            else:
                raise AssertionError('negative fixture accepted: ' + name)
        return {'pairs': pairs, 'refusals': negatives}

    def coverage(self, file, flags=()):
        with tempfile.TemporaryDirectory(prefix='tools-01-floor-coverage-') as temporary:
            run, events = self.events(file, ['--experimental-strip-types', *flags],
                                      {'NODE_V8_COVERAGE': temporary})
            scripts = []
            for path in sorted(Path(temporary).glob('coverage-*.json')):
                for script in json.loads(path.read_text())['result']:
                    if script['url'] == file.as_uri():
                        scripts.append(script)
            assert scripts, 'no child coverage for ' + str(file)
            run['fixture_coverage'] = scripts
            return run, events, scripts

    def a2(self):
        file = FIXTURES / 'offsets.ts'
        run, events, scripts = self.coverage(file)
        assert run['exit'] == 0, 'typed fixture failed'
        source = file.read_text()
        start = source.index('function typedProbe')
        end = source.index('\n}', start) + 2
        # V8 offsets are UTF-16 code units, not UTF-8 bytes or Python characters.
        expected = [len(source[:index].encode('utf-16-le')) // 2 for index in (start, end)]
        functions = [function for script in scripts for function in script['functions']
                     if function['functionName'] == 'typedProbe']
        assert len(functions) == 1, 'typed function coverage ambiguous'
        outer = functions[0]['ranges'][0]
        assert [outer['startOffset'], outer['endOffset']] == expected, (outer, expected)
        assert outer['count'] == 1, outer
        return {'original_utf16_function_span': expected, 'observed_range': outer,
                'type_syntax_and_astral_character': True}

    def a3(self):
        file = FIXTURES / 'reach.ts'
        run, events, scripts = self.coverage(file)
        assert run['exit'] == 0, 'reach fixture failed'
        assert any(function['isBlockCoverage'] for script in scripts for function in script['functions'])
        expected = {
            'assert.equal(result.ok, true)': 2,
            "throw Error('untaken same-line throw')": 0,
            'assert.equal(r.charge, 33554432)': 1,
            'assert.equal(1, 999)': 0,
            "result.ok || assert.fail('untaken assertion')": 1,
            "assert.fail('untaken assertion')": 0,
            "assert.equal('template', 'not executed')": 1,
        }
        observed = {anchor: range_count(scripts, source_offset(file, anchor)) for anchor in expected}
        assert observed == expected, (observed, expected)
        return {'counts': observed, 'caught_and_literal_anchors_require_source_guards': True}

    def a4(self):
        file = FIXTURES / 'reach.ts'
        registrations = fixture_registrations(file)
        target = ['reach suite', 'same-line throw']
        selected, events, scripts = self.coverage(file, ['--test-name-pattern=^reach suite same-line throw$'])
        assert selected['exit'] == 0 and valid_reach(events, registrations, target), 'full-path selection invalid'
        baseline, no_events, no_scripts = self.coverage(file, ['--test-skip-pattern=.'])
        assert baseline['exit'] == 0
        relevant = [event for event in no_events if event['type'] in EVENT_TYPES]
        # Keep the exact observed synthetic shape; it has no source registration.
        assert len(relevant) == 2 and [e['type'] for e in relevant] == ['test:start', 'test:pass'], relevant
        for event in relevant:
            data = event['data']
            assert Path(data['name']).resolve() == file and Path(data['file']).resolve() == file
            assert data['nesting'] == 0 and data.get('line') == 1 and data.get('column') == 1, data
        assert not valid_reach(no_events, registrations, target), 'synthetic file pass earned reach'
        counts = summary_counts(no_events)
        assert counts == {'tests': 1, 'suites': 0, 'pass': 1, 'fail': 0, 'cancelled': 0, 'skipped': 0, 'todo': 0}, counts
        anchors = ['assert.equal(result.ok, true)', 'assert.equal(r.charge, 33554432)',
                   "assert.equal('template', 'not executed')"]
        observations = {anchor: {'selected': range_count(scripts, source_offset(file, anchor)),
                                  'baseline': range_count(no_scripts, source_offset(file, anchor))}
                        for anchor in anchors}
        assert observations[anchors[0]] == {'selected': 2, 'baseline': 0}
        assert all(observations[a] == {'selected': 0, 'baseline': 0} for a in anchors[1:])
        multiple, multiple_events = self.events(file, ['--experimental-strip-types'])
        assert multiple['exit'] == 0 and not valid_reach(multiple_events, registrations, target)
        parent_file = FIXTURES / 'parent.test.mjs'
        parent, parent_events = self.events(parent_file, ['--test-name-pattern=^parent$'])
        assert parent['exit'] == 1
        assert not valid_reach(parent_events, fixture_registrations(parent_file), ['parent', 'child'])
        parent_pairs = pairs_from_events(parent_events, fixture_registrations(parent_file))
        assert [p['name'] for p in parent_pairs if p['leaf']] == ['child']
        return {'selected_counts': summary_counts(events), 'baseline_counts': counts,
                'synthetic_events': relevant, 'anchor_counts': observations,
                'multiple_leaves_refused': True, 'passing_child_of_failing_parent_refused': True}

    def a5(self):
        file = FIXTURES / 'reach.ts'
        with tempfile.TemporaryDirectory(prefix='tools-01-floor-reporters-') as temporary:
            tap = Path(temporary) / 'tap.txt'
            catalog = Path(temporary) / 'events.jsonl'
            run = self.run(['--test', '--experimental-strip-types', '--test-reporter=tap',
                            '--test-reporter-destination=' + str(tap),
                            '--test-reporter=' + str(FIXTURES / 'events-reporter.mjs'),
                            '--test-reporter-destination=' + str(catalog), file])
            assert run['exit'] == 0
            tap_text = tap.read_text()
            catalog_text = catalog.read_text()
            events = [json.loads(line) for line in catalog_text.splitlines()]
            counts = summary_counts(events)
            for label, count in counts.items():
                assert re.findall(r'^# ' + label + r' (\d+)$', tap_text, re.M) == [str(count)]
            run['tap'] = tap_text
            run['catalog'] = catalog_text
            return {'matching_counts': counts, 'separate_destinations': True}

    def a6(self):
        registry = json.loads((ROOT / 'tests/fixtures/packet-tools/mutations.json').read_text())
        dependency, = [d for d in registry['dependencies'] if d['path'] == 'node_modules/typescript']
        lock = json.loads((ROOT / 'package-lock.json').read_text())
        assert dependency['version'] == lock['packages'][dependency['path']]['version'] == '5.9.3'
        with tempfile.TemporaryDirectory(prefix='tools-01-floor-typescript-') as temporary:
            dest = Path(temporary)
            for relative, expected in dependency['files'].items():
                path = Path(dependency['path']) / relative
                data = (ROOT / path).read_bytes()
                assert hashlib.sha256(data).hexdigest() == expected, 'pinned TypeScript digest: ' + relative
                (dest / path).parent.mkdir(parents=True, exist_ok=True)
                (dest / path).write_bytes(data)
            shutil.copyfile(FIXTURES / 'parser.mjs', dest / 'parser.mjs')
            run = self.run([dest / 'parser.mjs'], cwd=dest)
            assert run['exit'] == 0, 'TypeScript subset probe failed'
            facts = json.loads(run['stdout'])
            assert facts['version'] == '5.9.3'
            return {'pinned_files': dependency['files'], 'parser': facts, 'subset_extended': False}

    def a7(self):
        package = json.loads((ROOT / 'package.json').read_text())
        rendering = ' '.join(['node', *TEST_FLAGS, *TEST_GLOBS])
        assert package['scripts']['test'] == rendering, 'test script drift'
        files = [path for pattern in TEST_GLOBS for path in sorted(ROOT.glob(pattern))]
        assert files and len(files) == len(set(files)), 'empty or duplicate file selection'
        run = self.run([*TEST_FLAGS, '--test-reporter=' + str(FIXTURES / 'events-reporter.mjs'), *files], timeout=900)
        events = [json.loads(line) for line in run['stdout'].splitlines()]
        reported = {str(Path(e['data']['file']).resolve()) for e in events
                    if e['type'] in EVENT_TYPES and 'file' in e['data']}
        expected = {str(path) for path in files}
        run['selected_files'] = sorted(expected)
        run['reported_files'] = sorted(reported)
        assert reported == expected, {'missing': sorted(expected - reported), 'extra': sorted(reported - expected)}
        counts = summary_counts(events)
        run['counts'] = counts
        assert run['exit'] == 0, 'repository test run failed; see raw events'
        assert counts['tests'] >= 3774 and all(counts[k] == 0 for k in ('fail', 'cancelled', 'skipped', 'todo')), counts
        self.repository_counts = counts
        return {'script': rendering, 'files': len(files), 'selection_matches_events': True, 'counts': counts}

    def a8(self):
        with tempfile.TemporaryDirectory(prefix='tools-01-archive-') as temporary:
            snapshot = Path(temporary) / 'snapshot'
            snapshot.mkdir()
            self.archive_input = prepare_archive_snapshot(snapshot)
            try:
                return self.a8_checks(snapshot)
            finally:
                assert verify_archive_snapshot(snapshot) == self.archive_input, 'archive input changed during A8'

    def a8_checks(self, snapshot):
        revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
        spec = json.loads((ROOT / 'docs/development/work/TOOLS-01/checks.json').read_text())
        declared = dict(self.environment, ARROKOTHI_EVIDENCE_ROOT=str(snapshot))
        inherited = dict(os.environ)
        inherited['PATH'] = self.environment['PATH']
        inherited['ARROKOTHI_EVIDENCE_ROOT'] = str(snapshot)
        comparisons = []
        for step in spec['checks']:
            pair = {}
            for label, env in [('declared', declared), ('inherited', inherited)]:
                print('A8 ' + step['id'] + ' (' + label + ')', file=sys.stderr, flush=True)
                run = self.run_command([sys.executable, '-B', str(FIXTURES / 'check-step.py'),
                                        '--revision', revision, '--step', step['id']], env,
                                       timeout=3600, record_output=False)
                self.runs[-1]['environment_profile'] = label
                # Only the helper's selected facts are retained. Never retain inherited
                # environment values or arbitrary child output, including error output.
                result = json.loads(run['stdout'])
                self.runs[-1]['observation'] = result
                assert run['exit'] == 0 and result['observation_valid'], 'A8 check failed: ' + step['id'] + ' (' + label + ')'
                pair[label] = result
            assert pair['declared']['meets_final_spec'] == pair['inherited']['meets_final_spec']
            assert pair['declared']['facts'] == pair['inherited']['facts'], 'environment facts/counts differ: ' + step['id']
            comparisons.append({'id': step['id'], 'facts_equal': True,
                                'meets_final_spec': pair['declared']['meets_final_spec'],
                                'facts': pair['declared']['facts']})
        return {'comparisons': comparisons, 'revision_for_pinned_operations': revision,
                'profiles_not_run': spec['profiles_not_run'],
                'claim': 'environment equivalence only; pending adoption remains a failed final gate',
                'all_final_gates_passed': all(row['meets_final_spec'] for row in comparisons)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--node', type=Path, required=True)
    parser.add_argument('--through', type=int, choices=range(1, 12), default=11,
                        help='stop after this assumption; a partial run is never complete')
    args = parser.parse_args()
    floor = Floor(args.node.resolve())
    version = floor.run(['--version'])['stdout'].strip()
    if version != 'v22.9.0':
        parser.error('This floor check requires exactly v22.9.0, got ' + version)
    results = []
    for index in range(1, args.through + 1):
        check = getattr(floor, 'a' + str(index), None)
        if check is None:
            break
        first_run = len(floor.runs)
        try:
            facts = check()
            result = {'assumption': 'A' + str(index), 'passed': True, 'facts': facts}
        except (AssertionError, ValueError, OSError, subprocess.SubprocessError) as exc:
            result = {'assumption': 'A' + str(index), 'passed': False,
                      'error': type(exc).__name__ + ': ' + str(exc)}
        result['runs'] = floor.runs[first_run:]
        results.append(result)
        print(result['assumption'] + ': ' + ('PASS' if result['passed'] else 'FAIL'), file=sys.stderr, flush=True)
        if not result['passed']:
            break
    passed = all(result['passed'] for result in results)
    print(json.dumps({'node': version, 'environment': {
                          'pass_names': ['PATH', 'HOME', 'TMPDIR'], 'set': {'LANG': 'C.UTF-8'},
                          'path_prepend': str(floor.node.parent), 'inherited_values_recorded': False}, 'passed': passed,
                      'complete': len(results) == 11 and passed, 'results': results,
                      'archive_input': getattr(floor, 'archive_input', None),
                      'remaining': ['A' + str(i) for i in range(len(results) + 1, 12)]}, indent=2))
    return 0 if passed else 1


if __name__ == '__main__':
    sys.exit(main())
