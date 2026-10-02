#!/usr/bin/env python3
"""Immutable packet facts and a small, isolated evidence runner. No acceptance authority."""
from __future__ import annotations

import argparse
from collections import Counter
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
        require(suite['command'] in plan and bool(plan[suite['command']].get('argv')),
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


def command(argv, cwd, timeout, output_limit):
    """POSIX process-group termination; cap captured output while the child is running."""
    require(isinstance(argv, list) and argv and all(isinstance(x, str) for x in argv), 'command needs argv')
    require(type(timeout) in (int, float) and 0 < timeout <= 3600, 'timeout must be in (0, 3600] seconds')
    require(type(output_limit) is int and 0 < output_limit <= 1048576, 'output cap must be in (0, 1048576]')
    require(os.name == 'posix', 'mutation runner supports POSIX hosts')
    try:
        proc = subprocess.Popen(argv, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                stdin=subprocess.DEVNULL, start_new_session=True,
                                env=dict(os.environ, PYTHONDONTWRITEBYTECODE='1'))
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


def run_case(files, case, mutant=None):
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
        return command(case['argv'], directory, case['timeout_seconds'], case['output_limit_bytes'])


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
    case_ids, mutant_ids, results = set(), {}, []
    for case in registry['cases']:
        print('Case ' + case['id'], file=sys.stderr, flush=True)
        require(case['id'] not in case_ids, 'duplicate case ID')
        case_ids.add(case['id'])
        require(type(case['failure_exit']) is int and 1 <= case['failure_exit'] <= 125, 'invalid failure exit')
        names = unique_text(case['files'], 'case files')
        files = {**shared, **{path_name(name): git.blob(rev, name) for name in names}}
        baseline = run_case(files, case)
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
                run = run_case(files, case, mutant)
                outcome = execution_outcome(run, case)
                state = outcome['status']
                result = {'mutation': mutant['id'], 'status': state, 'run': run,
                          'invalid': state in ('setup_error', 'timeout', 'output_limit')}
                if state == 'killed':
                    seen = outcome['observation']
                    result['killed_by'] = seen.get('failures', [case['assertion']])[0]
                if case['id'] in registry.get('determinism_sample', []):
                    repeated_run = run_case(files, case, mutant)
                    stable = execution_outcome(repeated_run, case) == outcome
                    result['determinism'] = {'passed': stable, 'runs': 2, 'repeat': repeated_run}
                    if not stable:
                        result['status'] = 'nondeterministic'
                        result.pop('killed_by', None)
            result['content_key'] = mutation_key(mutant)
            case_result['mutations'].append(result)
        if case['id'] in registry.get('determinism_sample', []):
            repeat = run_case(files, case)
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
            'counts': counts, 'cases': results, 'determinism_sample': sample, 'acceptance': 'not evaluated',
            'witnesses': [{'case': c['case'], **c['claim'],
                           'reproduced': c['control'] == 'passed'}
                          for c in results if c['claim']['kind'] != 'test_assertion'],
            'limits': ['Only the listed cases and mutations were executed',
                       'Structured witnesses rely on reviewed independent fixtures; no universal causal proof',
                       'Trusted repository commands run without containment; temporary copies protect source files']}


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
            run = command(step['argv'], git.repo, step['timeout_seconds'], step['output_limit_bytes'])
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
            results.append({'id': step['id'], 'argv': step['argv'], 'passed': ok, 'counts': counts, **run})
        clean_payload(git, rev)
    return {'operation': 'verify', 'revision': rev, 'specification': spec_path,
            'result': 'checks_passed' if all(r['passed'] for r in results) else 'attention_required',
            'environment': {'python': platform.python_version(), 'platform': platform.platform(),
                            'node': git_command_version('node', '--version'), 'git': git_command_version('git', '--version')},
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
