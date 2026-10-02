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

sys.dont_write_bytecode = True


class CheckError(Exception):
    """A declared input or checked fact is invalid."""


def require(condition, message):
    if not condition:
        raise CheckError(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


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


def command(argv, cwd, timeout, output_limit):
    """POSIX process-group termination; cap captured output while the child is running."""
    require(isinstance(argv, list) and argv and all(isinstance(x, str) for x in argv), 'command needs argv')
    require(type(timeout) in (int, float) and 0 < timeout <= 300, 'timeout must be in (0, 300] seconds')
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
    return value


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
                return {'status': 'not_applicable', 'exit': None, 'output': ''}
            target.write_bytes(original.replace(before, after, 1))
        return command(case['argv'], directory, case['timeout_seconds'], case['output_limit_bytes'])


def mutations(git, revision, registry_path):
    rev = git.commit(revision)
    registry = git.document(rev, registry_path)
    case_ids, mutant_ids, results = set(), set(), []
    for case in registry['cases']:
        require(case['id'] not in case_ids, 'duplicate case ID')
        case_ids.add(case['id'])
        require(type(case['failure_exit']) is int and 1 <= case['failure_exit'] <= 125, 'invalid failure exit')
        names = unique_text(case['files'], 'case files')
        files = {path_name(name): git.blob(rev, name) for name in names}
        baseline = run_case(files, case)
        try:
            control = observation(baseline, case)
            valid = control['reached'] and control['passed']
        except CheckError:
            valid = False
        case_result = {'case': case['id'], 'control': 'passed' if valid else 'invalid_baseline',
                       'baseline': baseline, 'mutations': []}
        for mutant in case['mutants']:
            require(mutant['id'] not in mutant_ids, 'duplicate mutant ID')
            mutant_ids.add(mutant['id'])
            require(mutant['path'] in files, 'mutation target absent from declared files')
            require(isinstance(mutant['before'], str) and isinstance(mutant['after'], str) and
                    mutant['before'] != mutant['after'], 'mutation must change text')
            if not valid:
                result = {'mutation': mutant['id'], 'status': 'invalid_baseline'}
            else:
                run = run_case(files, case, mutant)
                state = run['status']
                if state == 'finished':
                    try:
                        seen = observation(run, case)
                        state = 'uncovered' if not seen['reached'] else 'survived' if seen['passed'] else 'killed'
                    except CheckError:
                        state = 'setup_error'
                result = {'mutation': mutant['id'], 'status': state, 'run': run}
            case_result['mutations'].append(result)
        results.append(case_result)
    require(bool(results), 'registry has no cases')
    counts = dict(Counter(m['status'] for c in results for m in c['mutations']))
    require(bool(counts), 'registry has no mutations')
    passed = all(c['control'] == 'passed' for c in results) and set(counts) == {'killed'}
    return {'operation': 'mutations', 'revision': rev, 'registry': registry_path,
            'result': 'selected_cases_passed' if passed else 'attention_required',
            'counts': counts, 'cases': results, 'acceptance': 'not evaluated',
            'limits': ['Only the listed cases and mutations were executed',
                       'Structured witnesses rely on reviewed independent fixtures; no universal causal proof',
                       'Trusted repository commands run without containment; temporary copies protect source files']}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--repo', type=Path, default=Path.cwd())
    sub = p.add_subparsers(dest='operation', required=True)
    c = sub.add_parser('candidate')
    c.add_argument('--payload', required=True)
    c.add_argument('--head', required=True)
    c.add_argument('--spec', required=True)
    for name in ('inventory', 'mutations'):
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
        else:
            result = mutations(git, args.revision, args.spec)
        print(json.dumps(result, indent=2))
        return 1 if result.get('result') == 'attention_required' else 0
    except (CheckError, KeyError, TypeError, ValueError, OSError) as exc:
        print(json.dumps({'operation': args.operation, 'result': 'invalid', 'error': str(exc)}))
        return 2


if __name__ == '__main__':
    sys.exit(main())
