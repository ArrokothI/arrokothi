#!/usr/bin/env python3
"""Immutable packet facts and a small, isolated evidence runner. No acceptance authority."""
from __future__ import annotations

import argparse
from collections import Counter
import fnmatch
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import selectors
import signal
import subprocess
import sys
import tempfile
import time
import platform
from itertools import product
from math import prod

sys.dont_write_bytecode = True

# Design 05 §4: every child process gets a declared environment. Inherited names outside the
# declaration never reach it; records hold names and declared settings, never inherited values.
DEFAULT_ENVIRONMENT = {'pass': ['PATH', 'HOME', 'TMPDIR'], 'set': {'LANG': 'C.UTF-8'}}
NODE_FLOOR = (26, 10, 0)  # contract F4, owner choice 03
SOURCE_SUFFIXES = ('.ts', '.mts', '.cts', '.js', '.mjs', '.cjs')
ENVIRONMENT_READ = re.compile(r'process\.env\b')
ENVIRONMENT_NAME = re.compile(r'process\.env(?:\.([A-Za-z_$][\w$]*)|\[\s*([\'"])([^\'"\\]+)\2\s*\])')
CATALOG_REPORTER = 'tests/tooling/catalog-reporter.mjs'
SUMMARY_LABELS = ('tests', 'suites', 'pass', 'fail', 'cancelled', 'skipped', 'todo')
ENVIRONMENT_OTHER = re.compile(r'\bprocess\s*\[\s*[\'"]env[\'"]\s*\]|'
                               r'from\s+[\'"](?:node:)?process[\'"]|require\(\s*[\'"](?:node:)?process[\'"]\s*\)')


class CheckError(Exception):
    """A declared input or checked fact is invalid."""


def require(condition, message):
    if not condition:
        raise CheckError(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def content_key(kind, value):
    return kind + '-' + digest(json.dumps(value, sort_keys=True, separators=(',', ':'),
                                        ensure_ascii=True).encode())


def mutation_key(mutant):
    return content_key('mutation', [mutant['path'], mutant['before'],
                                   mutant.get('operator', 'replace'), mutant['after']])


def case_key(case):
    return content_key('case', [case['id'], case['assertion'], case['argv'], case.get('input')])


def claim_attribution(case):
    claim = case.get('claim')
    if claim is None:
        return {'kind': 'test_assertion', 'semantic_credit': 'not evaluated'}
    require(isinstance(claim, dict) and claim.get('kind') in ('held_witness', 'mechanism_witness'),
            'unknown witness claim kind')
    require(all(isinstance(claim.get(key), str) and bool(claim[key].strip())
                for key in ('owner', 'reason', 'decision')), 'witness needs owner, reason and decision')
    return dict(claim, semantic_credit='none')


def path_name(value):
    require(isinstance(value, str) and bool(value), 'path must be nonempty text')
    p = PurePosixPath(value)
    require(not p.is_absolute() and str(p) == value and
            all(x not in ('.', '..', '.git') for x in p.parts) and
            '\\' not in value and '\x00' not in value, f'unsafe path: {value!r}')
    return value


def unique_text(items, label):
    require(isinstance(items, list) and all(isinstance(x, str) and x for x in items),
            f'{label}: expected a text list')
    require(len(items) == len(set(items)), f'{label}: duplicate entries')
    return items


def environment_declaration(value):
    """Validate a declared child environment; the default passes PATH, HOME and TMPDIR."""
    value = DEFAULT_ENVIRONMENT if value is None else value
    require(isinstance(value, dict) and set(value) <= {'pass', 'set', 'absent', 'census'},
            'environment declaration has unknown fields')
    passed = unique_text(value.get('pass', []), 'environment pass names')
    assigned = value.get('set', {})
    require(isinstance(assigned, dict) and all(isinstance(name, str) and name and isinstance(text, str)
                                               for name, text in assigned.items()),
            'environment set values must be text')
    absent = value.get('absent', [])
    require(isinstance(absent, list) and all(isinstance(row, dict) and isinstance(row.get('name'), str) and
                                             row['name'] and isinstance(row.get('effect'), str) and
                                             bool(row['effect'].strip()) for row in absent),
            'deliberately absent environment names need an effect')
    names = [*passed, *assigned, *(row['name'] for row in absent)]
    require(len(names) == len(set(names)), 'environment name declared twice')
    return {'pass': passed, 'set': dict(assigned), 'absent': absent, 'census': value.get('census')}


def child_environment(declaration, provided=None):
    """The only environment a child receives, and a record holding names, never inherited values."""
    provided = provided or {}
    require(not set(provided) & {*declaration['pass'], *declaration['set']}, 'input environment name already declared')
    environment = {name: os.environ[name] for name in declaration['pass'] if name in os.environ}
    environment.update(declaration['set'])
    environment.update(provided)
    environment['PYTHONDONTWRITEBYTECODE'] = '1'
    return environment, {'passed': [name for name in declaration['pass'] if name in os.environ],
                         'unset_in_parent': [name for name in declaration['pass'] if name not in os.environ],
                         'set': dict(declaration['set'], PYTHONDONTWRITEBYTECODE='1'),
                         'inputs': sorted(provided),
                         'absent': [row['name'] for row in declaration['absent']],
                         'inherited_values_recorded': False}


class Git:
    def __init__(self, repo):
        self.repo = Path(repo).resolve()
        self.cache = {}

    def run(self, *args):
        run = subprocess.run(['git', '-C', str(self.repo), *args], capture_output=True)
        require(run.returncode == 0, 'git ' + args[0] + ': ' + run.stderr.decode(errors='replace').strip())
        return run.stdout

    def commit(self, value):
        require(isinstance(value, str) and re.fullmatch('[0-9a-f]{40}', value) is not None,
                'expected a full 40-character commit SHA')
        require(self.run('cat-file', '-t', value).strip() == b'commit', 'object is not a commit')
        return value

    def blob(self, rev, path):
        path_name(path)
        key = (rev, path)
        if key not in self.cache:
            # Permit only ordinary files, even in evidence and fixtures. Never follow a symlink.
            tree = self.run('ls-tree', '-z', rev, '--', path).split(b'\0')
            exact = [x for x in tree if x and x.split(b'\t', 1)[1].decode() == path]
            require(len(exact) == 1, f'missing regular source: {rev}:{path}')
            mode, kind, _ = exact[0].split(b'\t', 1)[0].split()
            require(mode in (b'100644', b'100755') and kind == b'blob', f'not a regular file: {path}')
            self.cache[key] = self.run('show', rev + ':' + path)
        return self.cache[key]

    def document(self, rev, path):
        try:
            value = json.loads(self.blob(rev, path))
        except (ValueError, UnicodeError) as exc:
            raise CheckError(f'invalid JSON: {path}') from exc
        require(isinstance(value, dict) and value.get('version') == 1, f'unsupported schema: {path}')
        return value

    def ancestor(self, old, new):
        self.run('merge-base', '--is-ancestor', old, new)

    def files(self, rev, prefix):
        path_name(prefix)
        rows = self.run('ls-tree', '-r', '-z', rev, '--', prefix).split(b'\0')
        names = [row.split(b'\t', 1)[1].decode() for row in rows if row]
        require(bool(names), f'empty source tree: {prefix}')
        return names


def candidate(git, payload, head, spec_path):
    c, h = git.commit(payload), git.commit(head)
    spec = git.document(c, spec_path)
    b = git.commit(spec['base'])
    git.ancestor(b, c)
    git.ancestor(c, h)
    require(c != h, 'candidate H must wrap payload C')
    if spec.get('require_direct_parent', False):
        require(git.run('rev-parse', h + '^').decode().strip() == c, 'H must directly wrap C')
    allowed = unique_text(spec['administrative_files'], 'administrative_files')
    require(bool(allowed), 'administrative_files must not be empty')
    for path in allowed:
        path_name(path)
        require(Path(path).suffix in ('.md', '.txt', '.json', '.jsonl', '.log'),
                f'executable/configuration attachment requires payload review: {path}')
    changed = sorted(x.decode() for x in git.run('diff', '--name-only', '-z', c, h).split(b'\0') if x)
    require(changed == sorted(allowed), f'C..H files differ: actual={changed}, expected={sorted(allowed)}')
    git.run('diff', '--check', b, h)
    for item in spec.get('preserve', []):
        old = git.commit(item['revision'])
        path_name(item['path'])
        require(bool(git.run('ls-tree', old, '--', item['path']).strip()), 'preservation source is missing')
        require(not git.run('diff', '--name-only', old, h, '--', item['path']).strip(),
                f'preserved path changed: {item["path"]}')
    attachments = []
    for item in spec.get('evidence', []):
        require(item.get('at') in ('payload', 'candidate'), 'evidence.at must name payload or candidate')
        rev = c if item['at'] == 'payload' else h
        data = git.blob(rev, item['path'])
        require(digest(data) == item['sha256'], f'evidence digest mismatch: {item["path"]}')
        attachments.append({'path': item['path'], 'at': item['at'], 'sha256': digest(data)})
    return {'operation': 'candidate', 'result': 'facts_verified', 'base': b, 'payload': c,
            'candidate': h, 'specification': spec_path, 'administrative_files': changed,
            'evidence': attachments, 'acceptance': 'not evaluated',
            'limits': ['File sets do not establish absence of semantic prose changes',
                       'Owner/reviewer authenticity and command execution are not inferred from metadata',
                       'No remote push or integration claim']}


def fenced_bytes(data, line):
    lines = data.decode().splitlines()
    require(isinstance(line, int) and 1 <= line <= len(lines), 'invalid fence line')
    opening = re.match(r'^\s*(`{3,}|~{3,})([\w-]*)', lines[line - 1])
    require(opening is not None, 'fence locator is not an opening fence')
    body = []
    for text in lines[line:]:
        if re.match(r'^\s*' + re.escape(opening[1][0]) + r'{' + str(len(opening[1])) + r',}\s*$', text):
            return ('\n'.join(body) + '\n').encode()
        body.append(text)
    raise CheckError('unclosed source fence')


def origin_id(kind, row):
    # Include the kind: one file can hold a prose mention and a fence on the same line.
    key = json.dumps([kind, row['revision'], row['path'], row['line']], separators=(',', ':'))
    return kind + '-' + digest(key.encode())[:24]


def inventory(git, revision, spec_path):
    rev = git.commit(revision)
    spec = git.document(rev, spec_path)
    origins, seen = [], set()
    for group in spec['catalogs']:
        source_rev = git.commit(group['revision'])
        raw = git.blob(source_rev, group['path'])
        require(digest(raw) == group['sha256'], 'catalog source digest mismatch')
        rows = json.loads(raw)
        require(isinstance(rows, list) and len(rows) == group['count'], 'catalog row count mismatch')
        kind = group['kind']
        require(kind in ('artifact', 'mention'), 'unknown catalog kind')
        for row in rows:
            row_rev = git.commit(row['revision'])
            data = git.blob(row_rev, row['path'])
            require(type(row['line']) is int and row['line'] > 0, 'invalid origin line')
            if kind == 'artifact':
                body = fenced_bytes(data, row['line']) if row['kind'].startswith('inline ') else data
                require(digest(body) == row['sha256'], f'origin digest mismatch: {row["path"]}:{row["line"]}')
            else:
                lines = data.decode().splitlines()
                require(row['line'] <= len(lines) and lines[row['line'] - 1] == row['text'],
                        f'prose locator mismatch: {row["path"]}:{row["line"]}')
            key = origin_id(kind, row)
            require(key not in seen, f'duplicate origin: {key}')
            seen.add(key)
            origins.append({'id': key, 'kind': kind, 'revision': row_rev, 'path': row['path'],
                            'line': row['line'], 'source_sha256': digest(data),
                            'recommended_disposition': row['disposition'], 'adoption': 'pending'})
    for item in spec.get('additional_sources', []):
        row = dict(item, line=item.get('line', 1))
        git.commit(row['revision'])
        data = git.blob(row['revision'], row['path'])
        require(digest(data) == row['sha256'], f'additional source digest mismatch: {row["path"]}')
        key = origin_id('additional', row)
        require(key not in seen, f'duplicate origin: {key}')
        seen.add(key)
        origins.append({'id': key, 'kind': 'additional', 'revision': row['revision'],
                        'path': row['path'], 'line': row['line'], 'source_sha256': digest(data),
                        'recommended_disposition': item['disposition'], 'adoption': 'pending'})
    mappings = spec.get('mappings', [])
    mapped = set()
    by_id = {r['id']: r for r in origins}
    for row in mappings:
        key = row['origin']
        require(key in by_id and key not in mapped, f'missing or duplicate mapping origin: {key}')
        mapped.add(key)
        # This foundation records proposals only. Adoption requires P1's executable integration.
        require(row.get('status') == 'proposed' and isinstance(row.get('rationale'), str) and row['rationale'].strip(),
                'foundation mappings need proposed status and rationale')
        require(isinstance(row.get('destination'), str) and row['destination'].strip(), 'mapping needs destination')
        by_id[key]['mapping'] = row
    return {'operation': 'inventory', 'result': 'provenance_verified', 'revision': rev,
            'counts': dict(Counter(r['kind'] for r in origins)), 'origins': origins,
            'pending_adoption': len(origins), 'proposed_mappings': len(mapped),
            'full_corpus_complete': False, 'acceptance': 'not evaluated'}


def execution_plan(spec):
    """Resolve command ownership, including explicitly unexecuted profiles."""
    entries = []
    for step in spec['checks']:
        entries.append(dict(step, profile='deterministic', execution='required'))
    profile_ids = unique_text([row['id'] for row in spec.get('profiles_not_run', [])], 'profile IDs')
    require('deterministic' not in profile_ids, 'deterministic profile must execute')
    for profile in spec.get('profiles_not_run', []):
        require(isinstance(profile.get('reason'), str) and bool(profile['reason'].strip()),
                'unexecuted profile needs a reason')
        require(bool(profile.get('checks')), 'unexecuted profile needs commands')
        for step in profile['checks']:
            require(isinstance(step.get('argv'), list) and bool(step['argv']) and
                    all(isinstance(arg, str) and bool(arg) for arg in step['argv']),
                    'profile command needs argv')
            entries.append(dict(step, profile=profile['id'], execution='not_run', reason=profile['reason']))
    unique_text([row['id'] for row in entries], 'execution command IDs')
    return {row['id']: row for row in entries}


def corpus(git, revision, spec_path):
    """Resolve explicit semantic mappings; execution remains a separate observation."""
    rev = git.commit(revision)
    spec = git.document(rev, spec_path)
    intake = inventory(git, rev, spec['inventory'])
    origins = {row['id']: row for row in intake['origins']}
    mappings = {}
    for row in spec['mappings']:
        key = row['origin']
        require(key in origins and key not in mappings, f'missing or duplicate mapping origin: {key}')
        require(isinstance(row.get('rationale'), str) and row['rationale'].strip(), 'mapping needs rationale')
        require(row.get('status') in ('pending', 'case', 'suite', 'duplicate', 'non_executable'),
                'unknown adoption status')
        mappings[key] = row
    require(set(mappings) == set(origins), 'adoption manifest must account for every origin, including pending')
    registry = git.document(rev, spec['registry'])
    plan = execution_plan(git.document(rev, spec['verification']))
    require(any(row.get('operation') == 'mutations' and row.get('spec') == spec['registry'] and
                row.get('expected') == 'selected_cases_passed' and row['execution'] == 'required'
                for row in plan.values()), 'corpus registry must run in verification')
    cases = {row['id']: row for row in registry['cases']}
    require(len(cases) == len(registry['cases']), 'duplicate case ID')
    checks = {row['id']: row for row in spec['suites']}
    require(len(checks) == len(spec['suites']), 'duplicate suite ID')
    for suite in checks.values():
        unique_text(suite['files'], 'suite files')
        require(bool(suite['files']), 'suite has no source')
        for path in suite['files']:
            git.blob(rev, path)
        require(isinstance(suite.get('command'), str) and suite['command'], 'suite needs verification command ID')
        require(suite['command'] in plan and bool(plan[suite['command']].get('argv') or plan[suite['command']].get('catalog')),
                'suite command absent from verification')
        require(suite.get('profile', 'deterministic') == plan[suite['command']]['profile'],
                'suite execution profile disagrees with verification')
    def resolve(key, stack):
        require(key not in stack, 'cyclic duplicate mapping')
        row = mappings[key]
        status = row['status']
        if status == 'duplicate':
            target = row['target']
            require(target in mappings, 'duplicate target absent')
            return resolve(target, stack | {key})
        if status in ('case', 'suite'):
            targets = unique_text(row['targets'], 'mapping targets')
            require(bool(targets), 'mapping needs targets')
            owner = cases if status == 'case' else checks
            require(all(target in owner for target in targets), 'mapping target absent')
        if status == 'non_executable':
            require(row.get('reason') in ('policy', 'historical_command', 'record', 'unavailable_source'),
                    'non-executable mapping needs a declared evidence reason')
            # This records a reviewed explanation; it cannot decide if prose hides a counterexample.
        return status
    resolved = {key: resolve(key, set()) for key in mappings}
    pending = [key for key, status in resolved.items() if status == 'pending']
    return {'operation': 'corpus', 'result': 'mappings_complete' if not pending else 'extraction_pending',
            'revision': rev, 'origins': len(origins),
            'counts': dict(Counter(row['status'] for row in mappings.values())),
            'pending_adoption': len(pending), 'pending_origins': pending,
            'suite_execution': [{'suite': row['id'], 'command': row['command'],
                                 'profile': plan[row['command']]['profile'],
                                 'execution': plan[row['command']]['execution'],
                                 'reason': plan[row['command']].get('reason')}
                                for row in checks.values()],
            'mapping_complete': not pending, 'execution': 'not evaluated',
            'non_executable': [row for row in mappings.values() if row['status'] == 'non_executable'],
            'full_corpus_complete': False, 'acceptance': 'not evaluated',
            'limits': ['Semantic equivalence and non-executable classifications require source review',
                       'A complete mapping is not a passing corpus run or release of held claims']}


def coverage_manifest(spec, registry):
    """A declared finite parameter model, never a domain inferred from observed tests."""
    cases = {case['id']: case for case in registry['cases']}
    require(len(cases) == len(registry['cases']) and bool(cases), 'coverage needs unique nonempty cases')
    families = unique_text([row['id'] for row in spec['families']], 'coverage families')
    require(bool(families), 'coverage has no families')
    used, results = set(), []
    for family in spec['families']:
        domains = family['domains']
        require(isinstance(domains, dict) and bool(domains), 'family needs declared domains')
        for dimension, domain in domains.items():
            require(bool(dimension) and bool(unique_text(domain, 'dimension domain')), 'empty dimension domain')
        require(prod(len(domain) for domain in domains.values()) <= 10000, 'dimension product exceeds bounded profile')
        coordinates = set()
        for entry in family['cases']:
            require(entry['case'] in cases and entry['case'] not in used, 'missing or repeated family case')
            used.add(entry['case'])
            values = entry['values']
            require(set(values) == set(domains), 'case dimensions differ from declared dimensions')
            require(all(values[key] in domain for key, domain in domains.items()), 'undeclared dimension value')
            point = tuple(values[key] for key in domains)
            require(point not in coordinates, 'duplicate family coordinates')
            coordinates.add(point)
        reason = family.get('empty_reason')
        require(bool(coordinates) or (isinstance(reason, str) and bool(reason.strip())),
                'non-vacuity: family matches no input')
        missing = [dict(zip(domains, point)) for point in product(*domains.values()) if point not in coordinates]
        results.append({'family': family['id'], 'domains': domains, 'cases': len(coordinates),
                        'missing_combinations': missing, 'empty_reason': reason})
    require(used == set(cases), 'every case needs a declared family')
    categories = unique_text(spec['negative_categories'], 'negative categories')
    require(bool(categories), 'negative categories must be declared')
    counts = dict.fromkeys(categories, 0)
    for case in cases.values():
        category = case.get('category')
        require(category in counts, 'case has undeclared negative category')
        counts[category] += 1
        data = case.get('input')
        require(isinstance(data, dict) and bool(data) and bool(set(data) - {'seed', 'generator'}),
                'case needs stored inputs, not only a seed')
        if 'seed' in data:
            require(isinstance(data.get('generator'), dict) and
                    set(data['generator']) >= {'version', 'commit'}, 'seed metadata needs version and commit')
    readings = spec.get('readings', [])
    unique_text([row['id'] for row in readings], 'reading/waiver IDs')
    for row in readings:
        require(row.get('status') in ('closed_by_reading', 'waived') and
                isinstance(row.get('reason'), str) and bool(row['reason'].strip()), 'reading/waiver needs reason')
    return {'families': results, 'negative_categories': counts,
            'missing_categories': [key for key, count in counts.items() if not count],
            'readings': readings, 'reading_kills': 0}


def coverage(git, revision, spec_path):
    rev = git.commit(revision)
    spec = git.document(rev, spec_path)
    registry = git.document(rev, spec['registry'])
    result = coverage_manifest(spec, registry)
    return {'operation': 'coverage', 'revision': rev, 'result': 'coverage_reported', **result,
            'acceptance': 'not evaluated', 'limits': ['Declared finite domains; no universal coverage claim']}


def dependency_files(git, rev, spec):
    """Copy a finite, content-pinned subset of already installed dependencies. Never install."""
    files = {}
    lock = json.loads(git.blob(rev, 'package-lock.json')) if spec else {}
    for dep in spec:
        root = path_name(dep['path'])
        require(root.startswith('node_modules/'), 'dependency must be under node_modules')
        require(lock.get('packages', {}).get(root, {}).get('version') == dep['version'],
                f'dependency version differs from lock: {root}')
        require(isinstance(dep['files'], dict) and 'package.json' in dep['files'], 'dependency needs package.json')
        for relative, expected in dep['files'].items():
            name = root + '/' + path_name(relative)
            local = git.repo / name
            require(not any(part.is_symlink() for part in [local, *local.parents[:len(PurePosixPath(name).parts) - 1]]),
                    f'dependency symlink refused: {name}')
            require(local.is_file(), f'missing dependency file: {name}; use the existing locked install')
            data = local.read_bytes()
            require(digest(data) == expected, f'dependency digest mismatch: {name}')
            files[name] = data
        manifest = json.loads(files[root + '/package.json'])
        require(manifest['version'] == dep['version'], 'installed dependency version mismatch')
    return files


def command(argv, cwd, timeout, output_limit, environment):
    """POSIX process-group termination; cap captured output while the child is running."""
    require(isinstance(argv, list) and argv and all(isinstance(x, str) for x in argv), 'command needs argv')
    require(isinstance(environment, dict) and all(isinstance(name, str) and isinstance(text, str)
                                                  for name, text in environment.items()),
            'command needs a declared environment')
    require(type(timeout) in (int, float) and 0 < timeout <= 3600, 'timeout must be in (0, 3600] seconds')
    require(type(output_limit) is int and 0 < output_limit <= 1048576, 'output cap must be in (0, 1048576]')
    require(os.name == 'posix', 'mutation runner supports POSIX hosts')
    try:
        proc = subprocess.Popen(argv, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                stdin=subprocess.DEVNULL, start_new_session=True, env=environment)
    except OSError as exc:
        return {'status': 'setup_error', 'detail': str(exc), 'output': '', 'exit': None}
    selector = selectors.DefaultSelector()
    selector.register(proc.stdout, selectors.EVENT_READ)
    output = bytearray()
    started = time.monotonic()
    status = 'finished'
    try:
        while selector.get_map() or proc.poll() is None:
            remaining = timeout - (time.monotonic() - started)
            if remaining <= 0:
                status = 'timeout'
                break
            for key, _ in selector.select(min(remaining, 0.05)):
                part = os.read(key.fd, min(8192, output_limit - len(output) + 1))
                if not part:
                    selector.unregister(key.fileobj)
                else:
                    output.extend(part)
                    if len(output) > output_limit:
                        status = 'output_limit'
                        break
            if status != 'finished':
                break
    finally:
        # Also terminate any inherited-pipe descendants of a normally exited fixture.
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        proc.wait()
        selector.close()
        proc.stdout.close()
    return {'status': status, 'exit': proc.returncode,
            'output': bytes(output[:output_limit]).decode(errors='replace')}


def observation(run, case):
    require(run['status'] == 'finished', 'command did not finish')
    try:
        value = json.loads(run['output'])
    except ValueError as exc:
        raise CheckError('fixture did not emit one JSON observation') from exc
    require(isinstance(value, dict) and value.get('case') == case['id'] and
            value.get('assertion') == case['assertion'] and
            type(value.get('reached')) is bool and type(value.get('passed')) is bool,
            'fixture observation has wrong case, assertion or flags')
    require(run['exit'] == (0 if value['passed'] else case['failure_exit']), 'exit disagrees with observation')
    if 'failures' in value:
        failures = unique_text(value['failures'], 'named failures')
        require(bool(failures) != value['passed'], 'named failures disagree with result')
    return value


def execution_outcome(run, case):
    """Compare structured outcomes without promoting invalid runs to observations."""
    if run['status'] != 'finished':
        return {'status': run['status'], 'matches': run.get('matches')}
    try:
        value = observation(run, case)
    except CheckError:
        return {'status': 'setup_error', 'exit': run['exit']}
    state = 'uncovered' if not value['reached'] else 'survived' if value['passed'] else 'killed'
    return {'status': state, 'observation': value}


def run_case(files, case, environment, mutant=None):
    with tempfile.TemporaryDirectory(prefix='arrokothi-evidence-') as tmp:
        directory = Path(tmp)
        for name, data in files.items():
            dest = directory / path_name(name)
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
        if mutant is not None:
            target = directory / mutant['path']
            original = target.read_bytes()
            before, after = mutant['before'].encode(), mutant['after'].encode()
            if not before or original.count(before) != 1:
                return {'status': 'not_applicable', 'exit': None, 'output': '',
                        'matches': original.count(before) if before else 0,
                        'detail': 'stale or ambiguous mutation anchor'}
            target.write_bytes(original.replace(before, after, 1))
        return command(case['argv'], directory, case['timeout_seconds'], case['output_limit_bytes'], environment)


def mutations(git, revision, registry_path, *, cases_only=False):
    rev = git.commit(revision)
    registry = git.document(rev, registry_path)
    shared = {}
    for prefix in registry.get('source_trees', []):
        for name in git.files(rev, prefix):
            shared[name] = git.blob(rev, name)
    for name in unique_text(registry.get('files', []), 'shared files'):
        shared[path_name(name)] = git.blob(rev, name)
    shared.update(dependency_files(git, rev, registry.get('dependencies', [])))
    environment, environment_record = child_environment(environment_declaration(registry.get('environment')))
    case_ids, mutant_ids, results = set(), {}, []
    for case in registry['cases']:
        print('Case ' + case['id'], file=sys.stderr, flush=True)
        require(case['id'] not in case_ids, 'duplicate case ID')
        case_ids.add(case['id'])
        require(type(case['failure_exit']) is int and 1 <= case['failure_exit'] <= 125, 'invalid failure exit')
        names = unique_text(case['files'], 'case files')
        files = {**shared, **{path_name(name): git.blob(rev, name) for name in names}}
        baseline = run_case(files, case, environment)
        try:
            control = observation(baseline, case)
            valid = control['reached'] and control['passed']
        except CheckError:
            valid = False
        case_result = {'case': case['id'], 'content_key': case_key(case),
                       'claim': claim_attribution(case),
                       'control': 'passed' if valid else 'invalid_baseline',
                       'baseline': baseline, 'mutations': []}
        local_mutants = set()
        for mutant in ([] if cases_only else case.get('mutants', [])):
            key = mutation_key(mutant)
            require(mutant['id'] not in local_mutants and mutant_ids.get(mutant['id'], key) == key,
                    'duplicate or conflicting mutant ID')
            local_mutants.add(mutant['id'])
            mutant_ids[mutant['id']] = key
            require(mutant['path'] in files, 'mutation target absent from declared files')
            require(isinstance(mutant['before'], str) and isinstance(mutant['after'], str) and
                    mutant['before'] != mutant['after'], 'mutation must change text')
            if not valid:
                result = {'mutation': mutant['id'], 'status': 'invalid_baseline'}
            else:
                run = run_case(files, case, environment, mutant)
                outcome = execution_outcome(run, case)
                state = outcome['status']
                result = {'mutation': mutant['id'], 'status': state, 'run': run,
                          'invalid': state in ('setup_error', 'timeout', 'output_limit')}
                if state == 'killed':
                    seen = outcome['observation']
                    result['killed_by'] = seen.get('failures', [case['assertion']])[0]
                if case['id'] in registry.get('determinism_sample', []):
                    repeated_run = run_case(files, case, environment, mutant)
                    stable = execution_outcome(repeated_run, case) == outcome
                    result['determinism'] = {'passed': stable, 'runs': 2, 'repeat': repeated_run}
                    if not stable:
                        result['status'] = 'nondeterministic'
                        result.pop('killed_by', None)
            result['content_key'] = mutation_key(mutant)
            case_result['mutations'].append(result)
        if case['id'] in registry.get('determinism_sample', []):
            repeat = run_case(files, case, environment)
            try:
                repeated = observation(repeat, case)
                stable = valid and repeated == control
            except CheckError:
                stable = False
            case_result['determinism'] = {'passed': stable, 'runs': 2, 'repeat': repeat}
            if not stable:
                case_result['control'] = 'invalid_baseline'
                for result in case_result['mutations']:
                    result['observed_status'] = result['status']
                    result['status'] = 'invalid_baseline'
                    result.pop('killed_by', None)
        results.append(case_result)
    require(bool(results), 'registry has no cases')
    counts = dict(Counter(m['status'] for c in results for m in c['mutations']))
    if not cases_only:
        require(bool(counts), 'registry has no mutations')
    sample = unique_text(registry.get('determinism_sample', []), 'determinism sample')
    require(set(sample) <= case_ids, 'determinism sample names absent cases')
    passed = all(c['control'] == 'passed' and c.get('determinism', {}).get('passed', True)
                 for c in results) and (cases_only or set(counts) == {'killed'})
    return {'operation': 'cases' if cases_only else 'mutations', 'revision': rev, 'registry': registry_path,
            'result': 'selected_cases_passed' if passed else 'attention_required',
            'counts': counts, 'cases': results, 'determinism_sample': sample, 'environment': environment_record,
            'acceptance': 'not evaluated',
            'witnesses': [{'case': c['case'], **c['claim'],
                           'reproduced': c['control'] == 'passed'}
                          for c in results if c['claim']['kind'] != 'test_assertion'],
            'limits': ['Only the listed cases and mutations were executed',
                       'Structured witnesses rely on reviewed independent fixtures; no universal causal proof',
                       'Trusted repository commands run without containment; temporary copies protect source files']}


def environment_census(git, rev, declaration, provided):
    """D05-CHK-10: every process.env read in the declared roots is passed, set, provided or absent.

    A lexical regression guard over a superset of the selected test files and their closures.
    Aliases of process.env that never spell it are a stated gap."""
    census = declaration['census']
    require(isinstance(census, dict) and bool(unique_text(census.get('roots', []), 'census roots')),
            'environment census needs declared roots')
    declared = {*declaration['pass'], *declaration['set'], *(row['name'] for row in declaration['absent']), *provided}
    expected = {}
    for row in census.get('computed', []):
        require(isinstance(row, dict) and all(isinstance(row.get(key), str) and bool(row[key].strip())
                                              for key in ('path', 'text', 'reason')),
                'computed environment read needs path, text and reason')
        require((row['path'], row['text']) not in expected, 'computed environment read declared twice')
        expected[(row['path'], row['text'])] = row
    reads, found, undeclared, files = {}, set(), [], 0
    for root in census['roots']:
        for path in git.files(rev, root):
            if not path.endswith(SOURCE_SUFFIXES) or 'node_modules' in PurePosixPath(path).parts:
                continue
            files += 1
            for text in git.blob(rev, path).decode(errors='replace').splitlines():
                names = [match[1] or match[3] for match in ENVIRONMENT_NAME.finditer(text)]
                for name in names:
                    reads.setdefault(name, set()).add(path)
                if len(ENVIRONMENT_READ.findall(text)) + len(ENVIRONMENT_OTHER.findall(text)) > len(names):
                    key = (path, text.strip())
                    if key in expected:
                        found.add(key)
                    else:
                        undeclared.append(path + ': ' + text.strip())
    missing = sorted(set(reads) - declared)
    require(not missing, 'undeclared environment read: ' + ', '.join(missing))
    require(not undeclared, 'computed environment read needs a declaration: ' + '; '.join(undeclared))
    require(found == set(expected), 'stale computed environment read declaration')
    return {'roots': census['roots'], 'files': files,
            'names': {name: sorted(paths) for name, paths in sorted(reads.items())},
            'computed': [{'path': path, 'text': text} for path, text in sorted(expected)],
            'declared_not_read': sorted(declared - set(reads)),
            'limits': ['Lexical: an alias of process.env that never spells it is not seen',
                       'Python tool code builds child environments only through command()']}


def verify_snapshot(git, rev, directory):
    """Every extracted path, entry kind and byte equals the pinned Git tree."""
    entries = {}
    for row in git.run('ls-tree', '-r', '-z', rev).split(b'\0'):
        if not row:
            continue
        metadata, name = row.split(b'\t', 1)
        mode, kind, oid = metadata.decode().split()
        require(kind == 'blob' and mode in ('100644', '100755', '120000'), 'snapshot input holds an unsupported entry')
        entries[name.decode()] = (mode, oid)
    actual = {str(path.relative_to(directory)) for path in directory.rglob('*')
              if path.is_symlink() or not path.is_dir()}
    require(actual == set(entries), 'snapshot input paths differ from the pinned tree')
    manifest = []
    for name, (mode, oid) in sorted(entries.items()):
        path = directory / name
        require(path.is_symlink() == (mode == '120000'), 'snapshot input entry kind differs: ' + name)
        data = os.readlink(path).encode() if mode == '120000' else path.read_bytes()
        require(hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest() == oid,
                'snapshot input bytes differ: ' + name)
        manifest.append([name, mode, digest(data)])
    return {'revision': rev, 'regular_files': sum(mode != '120000' for mode, _ in entries.values()),
            'symlinks': sum(mode == '120000' for mode, _ in entries.values()),
            'content_manifest_sha256': digest(json.dumps(manifest).encode())}


def snapshot_input(git, row, directory):
    """Extract a pinned Git tree outside the checkout; the bytes are verified, never trusted."""
    rev = git.commit(row['revision'])
    archive = directory.parent / (directory.name + '.tar')
    git.run('archive', '--format=tar', '--output=' + str(archive), rev)
    extracted = subprocess.run(['tar', '-xf', str(archive), '-C', str(directory)], capture_output=True)
    archive.unlink()
    require(extracted.returncode == 0, 'snapshot input extraction failed: ' + row['id'])
    return verify_snapshot(git, rev, directory)


def declared_inputs(spec, declaration):
    inputs = {}
    for row in spec.get('inputs', []):
        require(isinstance(row, dict) and row.get('kind') == 'git_snapshot' and isinstance(row.get('id'), str) and
                bool(row['id']) and isinstance(row.get('environment'), str) and bool(row['environment']),
                'input needs id, git_snapshot kind and environment name')
        require(row['id'] not in inputs, 'input declared twice')
        inputs[row['id']] = row
    names = [row['environment'] for row in inputs.values()]
    require(len(names) == len(set(names)) and not set(names) & {
        *declaration['pass'], *declaration['set'], *(row['name'] for row in declaration['absent'])},
        'input environment name already declared')
    return inputs


def node_version(environment, cwd):
    run = command(['node', '--version'], cwd, 30, 4096, environment)
    version = run['output'].strip()
    match = re.fullmatch(r'v(\d+)\.(\d+)\.(\d+)', version)
    require(run['status'] == 'finished' and run['exit'] == 0 and match is not None,
            'node --version failed under the declared environment')
    require(tuple(int(part) for part in match.groups()) >= NODE_FLOOR,
            f'Node {version} is below the v26.10.0 floor')
    return version


def glob_match(pattern, parts):
    # A shell glob: each segment matches one path segment; a leading dot needs a literal dot.
    return len(pattern) == len(parts) and all(
        fnmatch.fnmatchcase(part, segment) and (not part.startswith('.') or segment.startswith('.'))
        for segment, part in zip(pattern, parts))


def expand_globs(git, rev, globs):
    """Expand a catalog command's globs over the tree at C, as the package script's shell would."""
    tree = [path for path in git.run('ls-tree', '-r', '-z', '--name-only', rev).decode().split('\0') if path]
    files = []
    for pattern in globs:
        require(not pattern.startswith('/') and '**' not in pattern and '{' not in pattern,
                'catalog glob must be a relative single-segment pattern: ' + pattern)
        matched = sorted(path for path in tree if glob_match(pattern.split('/'), path.split('/')))
        require(bool(matched), 'catalog glob matches no file: ' + pattern)
        files.extend(matched)
    require(len(files) == len(set(files)), 'catalog globs select a file twice')
    return files


def catalog_declaration(git, rev, step):
    """D04-CHK-02: the declared script text, flags and globs must equal the package script at C."""
    catalog = step.get('catalog')
    require(isinstance(catalog, dict) and isinstance(catalog.get('script'), str) and bool(catalog['script']) and
            isinstance(catalog.get('script_text'), str), 'catalog needs a package script and its text')
    flags = unique_text(catalog.get('flags', []), 'catalog flags')
    globs = unique_text(catalog.get('globs', []), 'catalog globs')
    require('--test' in flags and not any(flag.startswith(('--test-reporter', '--test-name-pattern',
                                                             '--test-skip-pattern', '--test-only'))
                                          for flag in flags),
            'catalog flags must run tests without their own reporter or selection')
    rendering = ' '.join(['node', *flags, *globs])
    scripts = json.loads(git.blob(rev, 'package.json')).get('scripts', {})
    require(catalog['script_text'] == rendering == scripts.get(catalog['script']),
            'catalog script drift: ' + catalog['script'])
    return {'script': catalog['script'], 'script_text': rendering, 'flags': flags, 'globs': globs,
            'files': expand_globs(git, rev, globs)}


def file_tree(rows):
    """A1 for one file: order and nesting from starts, kind from results, one result per start."""
    starts, results, order, synthetic = {}, {}, [], 0
    for row in rows:
        if row.get('synthetic') is True:
            synthetic += row['type'] != 'test:start'
            continue
        key = tuple(row.get(field) for field in ('line', 'column', 'nesting', 'name'))
        if not (type(key[0]) is int and key[0] > 0 and type(key[1]) is int and key[1] > 0 and
                type(key[2]) is int and key[2] >= 0 and isinstance(key[3], str)):
            return None, 'missing location, nesting or name'
        table = starts if row['type'] == 'test:start' else results
        if key in table:
            return None, 'duplicated key among ' + ('starts' if table is starts else 'results')
        table[key] = row
        if table is starts:
            order.append(key)
    if set(starts) != set(results):
        return None, 'start/result keys differ'
    pairs = []
    for key in order:
        result = results[key]
        kind = result.get('details_type', 'test')  # absent (v22.9.0) or 'test' (v22.15.0)
        if kind not in ('test', 'suite'):
            return None, 'unknown details.type'
        parent = next((index for index in range(len(pairs) - 1, -1, -1) if pairs[index]['nesting'] == key[2] - 1), None)
        if key[2] and parent is None:
            return None, 'missing parent start'
        verdict = ('todo' if result.get('todo') else 'skipped' if result.get('skip') else
                   'failed' if result['type'] == 'test:fail' else 'passed')
        path = (pairs[parent]['path'] if parent is not None else []) + [key[3]]
        pairs.append({'path': path, 'line': key[0], 'column': key[1], 'nesting': key[2], 'kind': kind,
                      'parent': parent, 'verdict': verdict})
    parents = {pair['parent'] for pair in pairs}
    for index, pair in enumerate(pairs):
        pair['leaf'] = pair['kind'] == 'test' and index not in parents
    return {'pairs': pairs, 'synthetic': synthetic}, None


def catalog_tree(rows, root, selected):
    """Group catalog rows by file; refuse a malformed file, never the run's other files."""
    summary, by_file = {}, {}
    for row in rows:
        if row.get('type') == 'summary':
            require(row.get('label') in SUMMARY_LABELS and row['label'] not in summary and type(row.get('count')) is int,
                    'malformed or duplicate catalog summary')
            summary[row['label']] = row['count']
            continue
        require(row.get('type') in ('test:start', 'test:pass', 'test:fail') and isinstance(row.get('file'), str),
                'malformed catalog event')
        path = Path(os.path.realpath(row['file']))
        require(path.is_relative_to(root), 'catalog event outside the checkout')
        by_file.setdefault(path.relative_to(root).as_posix(), []).append(row)
    require(set(summary) == set(SUMMARY_LABELS), 'catalog summary incomplete')
    files, refused = {}, {}
    for name in selected:
        tree, reason = file_tree(by_file.get(name, []))
        if tree is None:
            refused[name] = reason
        elif not tree['pairs'] and not tree['synthetic']:
            refused[name] = 'no result reported'
        else:
            files[name] = tree
    tests = sum(pair['kind'] == 'test' for tree in files.values() for pair in tree['pairs'])
    verdicts = Counter(pair['verdict'] for tree in files.values() for pair in tree['pairs'] if pair['kind'] == 'test')
    synthetic = sum(tree['synthetic'] for tree in files.values())
    consistent = not refused and summary == {
        'tests': tests + synthetic, 'suites': sum(pair['kind'] == 'suite' for tree in files.values() for pair in tree['pairs']),
        'pass': verdicts['passed'] + synthetic, 'fail': summary['fail'], 'cancelled': summary['cancelled'],
        'skipped': verdicts['skipped'], 'todo': verdicts['todo']} and summary['fail'] + summary['cancelled'] == verdicts['failed']
    return {'files': files, 'refused': refused, 'unselected': sorted(set(by_file) - set(selected)),
            'summary': summary, 'summary_consistent': consistent,
            'valid': consistent and not refused and set(by_file) == set(selected)}


def catalog_run(git, rev, step, environment):
    """One run of a catalog command at C feeds verify (first reporter) and the catalog (second)."""
    facts = catalog_declaration(git, rev, step)
    reporter = git.repo / CATALOG_REPORTER
    git.blob(rev, CATALOG_REPORTER)
    with tempfile.TemporaryDirectory(prefix='arrokothi-catalog-') as temporary:
        events = Path(temporary) / 'events.jsonl'
        argv = ['node', *facts['flags'], '--test-reporter=tap', '--test-reporter-destination=stdout',
                '--test-reporter=' + str(reporter), '--test-reporter-destination=' + str(events), *facts['files']]
        run = command(argv, git.repo, step['timeout_seconds'], step['output_limit_bytes'], environment)
        rows = []
        if events.exists():
            for line in events.read_text().splitlines():
                try:
                    rows.append(json.loads(line))
                except ValueError:
                    rows = None
                    break
    tree = None
    if run['status'] == 'finished' and rows is not None:
        try:
            tree = catalog_tree(rows, Path(os.path.realpath(git.repo)), facts['files'])
        except CheckError as exc:
            tree = {'valid': False, 'error': str(exc)}
    return facts, run, tree


def catalog_summary(facts, tree):
    if tree is None:
        return {'script': facts['script'], 'files': len(facts['files']), 'valid': False, 'error': 'no catalog events'}
    if 'files' not in tree:
        return {'script': facts['script'], 'files': len(facts['files']), **tree}
    leaves = [pair for file in tree['files'].values() for pair in file['pairs'] if pair['leaf']]
    return {'script': facts['script'], 'files': len(facts['files']), 'valid': tree['valid'],
            'summary_consistent': tree['summary_consistent'], 'refused_files': tree['refused'],
            'unselected_files': tree['unselected'], 'leaves': len(leaves),
            'leaf_verdicts': dict(Counter(pair['verdict'] for pair in leaves)),
            'source_kind_checked': False}


def clean_payload(git, rev):
    require(git.run('rev-parse', 'HEAD').decode().strip() == rev, 'HEAD must be payload C')
    require(not git.run('status', '--porcelain', '--untracked-files=all').strip(), 'payload checkout must be clean')


def verify(git, revision, spec_path):
    rev = git.commit(revision)
    clean_payload(git, rev)
    spec = git.document(rev, spec_path)
    execution_plan(spec)
    ids = unique_text([step['id'] for step in spec['checks']], 'verification checks')
    require(bool(ids), 'verification has no checks')
    declaration = environment_declaration(spec.get('environment'))
    inputs = declared_inputs(spec, declaration)
    census = environment_census(git, rev, declaration, [row['environment'] for row in inputs.values()])
    base_environment, _ = child_environment(declaration)
    node = node_version(base_environment, git.repo)
    results = []
    for step in spec['checks']:
        print('Checking ' + step['id'], file=sys.stderr, flush=True)
        if step.get('operation') in ('inventory', 'corpus', 'mutations', 'cases', 'coverage'):
            operation = step['operation']
            if operation == 'inventory':
                result = inventory(git, rev, step['spec'])
            elif operation == 'corpus':
                result = corpus(git, rev, step['spec'])
            elif operation == 'coverage':
                result = coverage(git, rev, step['spec'])
            else:
                result = mutations(git, rev, step['spec'], cases_only=operation == 'cases')
            ok = result['result'] == step['expected']
            results.append({'id': step['id'], 'operation': operation, 'passed': ok, 'result': result})
        else:
            names = unique_text(step.get('inputs', []), 'step inputs')
            require(all(name in inputs for name in names), 'step names an undeclared input')
            with tempfile.TemporaryDirectory(prefix='arrokothi-input-') as temporary:
                provided, facts = {}, []
                for name in names:
                    directory = Path(temporary) / name
                    directory.mkdir()
                    facts.append(dict(snapshot_input(git, inputs[name], directory), id=name))
                    provided[inputs[name]['environment']] = str(directory)
                environment, record = child_environment(declaration, provided)
                if 'catalog' in step:
                    catalog_facts, run, tree = catalog_run(git, rev, step, environment)
                else:
                    catalog_facts, tree = None, None
                    run = command(step['argv'], git.repo, step['timeout_seconds'], step['output_limit_bytes'], environment)
                for fact in facts:
                    try:
                        verify_snapshot(git, fact['revision'], Path(temporary) / fact['id'])
                    except CheckError as exc:
                        raise CheckError('snapshot input changed during ' + step['id'] + ': ' + str(exc)) from exc
            counts = {}
            for label, expression in step.get('counts', {}).items():
                matches = re.findall(expression, run['output'], re.MULTILINE)
                require(len(matches) == 1 and isinstance(matches[0], str), f'ambiguous or missing count {step["id"]}:{label}')
                counts[label] = int(matches[0])
            ok = run['status'] == 'finished' and run['exit'] == 0
            for label, minimum in step.get('minimum_counts', {}).items():
                ok = ok and counts.get(label, -1) >= minimum
            for label, exact in step.get('exact_counts', {}).items():
                ok = ok and counts.get(label) == exact
            catalog = None if catalog_facts is None else catalog_summary(catalog_facts, tree)
            ok = ok and (catalog is None or catalog['valid'])
            results.append({'id': step['id'], 'argv': step.get('argv') or catalog_facts['script_text'], 'passed': ok,
                            'counts': counts, 'environment': record, 'inputs': facts,
                            **({'catalog': catalog} if catalog is not None else {}), **run})
        clean_payload(git, rev)
    return {'operation': 'verify', 'revision': rev, 'specification': spec_path,
            'result': 'checks_passed' if all(r['passed'] for r in results) else 'attention_required',
            'environment': {'python': platform.python_version(), 'platform': platform.platform(),
                            'node': node, 'git': git_command_version('git', '--version'),
                            'declared': child_environment(declaration)[1], 'census': census},
            'checks': results, 'profiles_not_run': spec.get('profiles_not_run', []),
            'result_reuse': False, 'acceptance': 'not evaluated',
            'limits': spec['limits']}


def git_command_version(*argv):
    return subprocess.check_output(argv, text=True).strip()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--repo', type=Path, default=Path.cwd())
    sub = p.add_subparsers(dest='operation', required=True)
    c = sub.add_parser('candidate')
    c.add_argument('--payload', required=True)
    c.add_argument('--head', required=True)
    c.add_argument('--spec', required=True)
    for name in ('inventory', 'mutations', 'cases', 'corpus', 'verify', 'coverage'):
        child = sub.add_parser(name)
        child.add_argument('--revision', required=True)
        child.add_argument('--spec', required=True)
    args = p.parse_args()
    try:
        git = Git(args.repo)
        if args.operation == 'candidate':
            result = candidate(git, args.payload, args.head, args.spec)
        elif args.operation == 'inventory':
            result = inventory(git, args.revision, args.spec)
        elif args.operation == 'corpus':
            result = corpus(git, args.revision, args.spec)
        elif args.operation == 'coverage':
            result = coverage(git, args.revision, args.spec)
        elif args.operation == 'verify':
            result = verify(git, args.revision, args.spec)
        else:
            result = mutations(git, args.revision, args.spec, cases_only=args.operation == 'cases')
        print(json.dumps(result, indent=2))
        return 1 if result.get('result') == 'attention_required' else 0
    except (CheckError, KeyError, TypeError, ValueError, OSError) as exc:
        print(json.dumps({'operation': args.operation, 'result': 'invalid', 'error': str(exc)}))
        return 2


if __name__ == '__main__':
    sys.exit(main())
