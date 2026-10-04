#!/usr/bin/env python3
"""Immutable packet facts and a small, isolated evidence runner. No acceptance authority."""
from __future__ import annotations

import argparse
import ast
from collections import Counter
import contextlib
import fnmatch
import gzip
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import selectors
import shutil
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
ENVIRONMENT_OTHER = re.compile(r'\bprocess\s*\[\s*[\'"]env[\'"]\s*\]|'
                               r'from\s+[\'"](?:node:)?process[\'"]|require\(\s*[\'"](?:node:)?process[\'"]\s*\)')
# Design 05 §4 title catalog: the second reporter of a catalog step and the summary it reports.
CATALOG_REPORTER = 'tests/tooling/catalog-reporter.mjs'
# Design 05 §4 source facts and reach: parsed with the pinned TypeScript subset, counted from raw V8 coverage.
SOURCE_FACTS = 'tests/tooling/source-facts.mjs'
REACH_COVERAGE = 'tests/tooling/reach-coverage.mjs'
# Design 05 §2.3 rule 5: the reads-phase preload, and how each fs operation is compared at pin and C.
READ_TRACE = 'tests/tooling/read-trace.mjs'
READ_KIND = {'readFile': 'bytes', 'open': 'bytes', 'createReadStream': 'bytes', 'openAsBlob': 'bytes',
             'readdir': 'listing', 'opendir': 'listing', 'glob': 'listing',
             'stat': 'exists', 'lstat': 'exists', 'statfs': 'exists', 'exists': 'exists', 'access': 'exists',
             'realpath': 'exists', 'readlink': 'exists'}
NODE_BUILTINS = {'assert', 'async_hooks', 'buffer', 'child_process', 'crypto', 'events', 'fs', 'http', 'https', 'module',
                 'net', 'os', 'path', 'perf_hooks', 'process', 'readline', 'stream', 'string_decoder', 'test', 'timers',
                 'url', 'util', 'vm', 'worker_threads', 'zlib'}
REGISTER_CLASSES = ('held', 'superseded', 'not_held')
# D05-CHK-05: the minimum hold-register recipes; a manifest may widen them, never narrow them.
REGISTER_MINIMUM = {
    'Proxy': {'body': r'new Proxy|Proxy\.revocable'},
    're-prototyped-built-in': {'body': r'setPrototypeOf|__proto__|Object\.create\('},
    'V-ENV': {'body': r'\bvm\b|createContext|runInContext|frozen-intrinsics|globalThis'},
    'V-D1': {'title': r'V-D1', 'files': ['packages/kernel/tests/value-diagnostic-work.test.ts',
                                         'packages/kernel/tests/value-refusal-cost.test.ts']},
}
TEST_SUFFIXES = ('.test.ts', '.test.mjs', '.test.js')
# P1-M (design 05 D04-CHK-03, D05-CHK-06): census kinds over pinned runner bytes, and member routes.
CENSUS_KINDS = ('structural', 'python_ast', 'loop', 'filter', 'inherits', 'bindings')
MEMBER_ROUTES = ('pending', 'mutation', 'witness', 'no_longer_applicable', 'equivalence', 'survivor', 'limit')
FAMILY_ROLES = ('runner', 'mixed')
# P1-R and the P1 preamble (design 05 §4, D04-CHK-06): origin closure links and minimum contexts.
CLOSURE_LINKS = ('target', 'counterexample', 'family', 'case', 'member')
NON_EXECUTABLE_REASONS = ('policy', 'historical_command', 'record', 'unavailable_source')
CONTEXT_PATH = re.compile(r'(?<![\w/.-])((?:docs|packages|tests|scripts|examples|mental-model)/[\w./@-]*\w)')
CONTEXT_SHA = re.compile(r'(?<![0-9A-Za-z])([0-9a-f]{7,40})(?![0-9A-Za-z])')
SEALED_PREFIXES = ('docs/',)
SUMMARY_LABELS = ('tests', 'suites', 'pass', 'fail', 'cancelled', 'skipped', 'todo')
# Adoption format 2 (design 04, design 05 §4): origin states and the tables every manifest carries.
ORIGIN_STATES = ('pending', 'pending_revalidation', 'triaged', 'complete')
FORMAT_2_TABLES = ('origins', 'counterexamples', 'suite_targets', 'preserved', 'families', 'holds', 'areas',
                   'moves', 'floor', 'helper_reviews')
COUNTEREXAMPLE_KINDS = ('behavior', 'mutation', 'held_witness', 'superseded_witness', 'prose_pending')
TARGET_FIELDS = ('id', 'counterexample', 'command', 'file', 'test_path', 'declaration', 'input_anchors',
                 'assertion_anchors', 'relation', 'discrimination')


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


def mutation_edits(mutant):
    """A mutant's ordered edits: one (path, before, after), or `edits` applied atomically (F3 multi-edit)."""
    if 'edits' in mutant:
        edits = mutant['edits']
        require(not {'path', 'before', 'after'} & set(mutant) and isinstance(edits, list) and len(edits) >= 2 and
                all(isinstance(edit, dict) and set(edit) == {'path', 'before', 'after'} for edit in edits),
                'a multi-edit mutant lists two or more edits, each a path, before and after')
        rows = [(edit['path'], edit['before'], edit['after']) for edit in edits]
    else:
        rows = [(mutant.get('path'), mutant.get('before'), mutant.get('after'))]
    for path, before, after in rows:
        require(isinstance(path, str) and isinstance(before, str) and isinstance(after, str) and before != after,
                'mutation must change text')
    return rows


def mutation_key(mutant):
    if 'edits' in mutant:
        return content_key('mutation', ['edits', [list(edit) for edit in mutation_edits(mutant)],
                                        mutant.get('operator', 'replace')])
    return content_key('mutation', [mutant['path'], mutant['before'],
                                   mutant.get('operator', 'replace'), mutant['after']])


def case_key(case):
    return content_key('case', [case['id'], case.get('assertion'), case.get('argv') or case.get('targets'), case.get('input')])


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

    def document(self, rev, path, versions=(1,)):
        try:
            value = json.loads(self.blob(rev, path))
        except (ValueError, UnicodeError) as exc:
            raise CheckError(f'invalid JSON: {path}') from exc
        require(isinstance(value, dict) and value.get('version') in versions, f'unsupported schema: {path}')
        return value

    def ancestor(self, old, new):
        self.run('merge-base', '--is-ancestor', old, new)

    def tree(self, rev):
        """Every path at a revision, directories included, mapped to (mode, object ID); cached."""
        key = ('tree', rev)
        if key not in self.cache:
            entries = {}
            for row in self.run('ls-tree', '-r', '-t', '-z', rev).split(b'\0'):
                if row:
                    metadata, name = row.split(b'\t', 1)
                    mode, _, oid = metadata.decode().split()
                    entries[name.decode()] = (mode, oid)
            self.cache[key] = entries
        return self.cache[key]

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


def scheduled_registry(git, rev, spec):
    """The adoption manifest's registry must run as a required mutation step in its verification."""
    registry = git.document(rev, spec['registry'])
    plan = execution_plan(git.document(rev, spec['verification']))
    require(any(row.get('operation') == 'mutations' and row.get('spec') == spec['registry'] and
                row.get('expected') == 'selected_cases_passed' and row['execution'] == 'required'
                for row in plan.values()), 'corpus registry must run in verification')
    return registry, plan


def corpus(git, revision, spec_path, toolchain=None):
    """Resolve explicit semantic mappings; execution remains a separate observation.

    Format 2 is the revision-3 manifest (design 04 and 05). Format 1 stays readable for historical
    inspection with `target_verification: legacy_unverified`; it cannot report mappings_complete."""
    rev = git.commit(revision)
    spec = git.document(rev, spec_path, versions=(1, 2))
    intake = inventory(git, rev, spec['inventory'])
    if spec['version'] == 2:
        return corpus_format_2(git, rev, spec, intake, toolchain)
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
    registry, plan = scheduled_registry(git, rev, spec)
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
    return {'operation': 'corpus', 'format': 1, 'target_verification': 'legacy_unverified',
            'result': 'legacy_unverified' if not pending else 'extraction_pending',
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


def legacy_manifest(git, migration):
    """P1-R: the revision-2 (format-1) manifest, read at its pinned revision and digest."""
    source = migration.get('source') if isinstance(migration, dict) else None
    require(isinstance(source, dict) and source.get('format') == 1 and isinstance(source.get('path'), str) and
            isinstance(source.get('sha256'), str), 'migration needs its pinned format-1 source')
    data = git.blob(git.commit(source['revision']), source['path'])
    require(digest(data) == source['sha256'], 'format-1 source digest mismatch')
    old = json.loads(data)
    require(isinstance(old, dict) and old.get('version') == 1, 'migration source is not format 1')
    return {row['origin']: row for row in old['mappings']}


def unique_records(rows, label):
    require(isinstance(rows, list) and all(isinstance(row, dict) and isinstance(row.get('id'), str) and row['id']
                                           for row in rows), label + ': records need text IDs')
    ids = [row['id'] for row in rows]
    require(len(ids) == len(set(ids)), label + ': duplicate record ID')
    return {row['id']: row for row in rows}


def holds_table(git, rev, holds):
    require(isinstance(holds, dict), 'holds table must be an object')
    claims = unique_records(holds.get('claims', []), 'hold claims')
    for claim in claims.values():
        require(isinstance(claim.get('owner'), str) and bool(claim['owner']) and
                bool(unique_text(claim.get('decisions', []), 'hold decisions')), 'hold claim needs owner and decisions')
        for path in claim['decisions']:
            git.blob(rev, path)
    return claims


def corpus_format_2(git, rev, spec, intake, toolchain=None):
    origins = {row['id']: row for row in intake['origins']}
    require(all(table in spec for table in FORMAT_2_TABLES), 'format 2 needs every adoption table')
    rows = unique_records(spec['origins'], 'origins')
    require(set(rows) == set(origins), 'adoption manifest must account for every origin, including pending')
    legacy = legacy_manifest(git, spec.get('migration'))
    require(set(legacy) == set(origins), 'format-1 source does not cover the inventory')
    for key, row in rows.items():
        require(row.get('state') in ORIGIN_STATES, 'unknown origin state')
        old = legacy[key]
        if old['status'] == 'pending':
            require('legacy' not in row and row['state'] != 'pending_revalidation',
                    'only a revision-2 mapping can await revalidation')
        else:
            expected = {name: value for name, value in old.items() if name != 'origin'}
            require(row.get('legacy') == expected, 'migrated row differs from the format-1 source: ' + key)
            require(row['state'] != 'pending', 'a revision-2 mapping cannot return to pending')
        # Prose triage arrives with the mentions (design 05 §6 step 11); a complete origin is checked below.
        require(row['state'] != 'triaged', 'prose triage is not implemented in this format revision: ' + key)
    require(spec['areas'] == [], 'areas are not implemented in this format revision')
    claims = holds_table(git, rev, spec['holds'])
    require(set(REGISTER_MINIMUM) <= set(claims), 'P1-H claims cannot leave the holds table')
    registry, _ = scheduled_registry(git, rev, spec)
    counterexamples = counterexample_table(spec['counterexamples'], origins)
    targets = unique_records(spec['suite_targets'], 'suite targets')
    for target in targets.values():
        require(counterexamples.get(target.get('counterexample'), {}).get('kind') == 'behavior',
                'held or superseded counterexamples never earn suite credit')
    stored = {row.get('member'): row for row in spec['preserved'] if isinstance(row, dict)}
    for target in targets.values():
        if 'member' in target:
            member = stored.get(target['member'])
            replacement = (target.get('relation') or {}).get('kind') == 'authorized_replacement'
            require(member is not None and member['status'] == 'refused' and (member['file'] == target.get('file') or replacement),
                    'a target member is a refused member in its file: ' + target['id'])
            declaration = target.get('declaration') or {}
            require(member.get('current') is None or [declaration.get('line'), declaration.get('column')] == member['current']
                    or replacement,
                    'a target sits at its member\'s declaration unless it is an authorized replacement: ' + target['id'])
    tested = test_file_origins(intake)
    moves = moves_table(git, rev, spec['moves'])
    floor_order_model(git, rev, spec['floor'])
    helper_review_table(git, rev, spec['helper_reviews'], origins)
    scope = sorted({moves.get(row['path'], row['path']) for row in tested if blob_id(git, rev, moves.get(row['path'], row['path']))} |
                   {target['file'] for target in targets.values() if isinstance(target.get('file'), str) and
                    blob_id(git, rev, target['file'])})
    with contextlib.ExitStack() as stack:
        context = target_context(git, rev, spec, stack, toolchain) if targets or tested else None
        environment = child_environment(environment_declaration(None))[0] if context is None else context['environment']
        register = hold_register(git, rev, spec['holds'].get('register'), claims, scope, environment, toolchain)
        results = [check_target(git, rev, target, counterexamples, registry, context) for target in targets.values()]
        evaluations, all_earlier = preserved_census(git, rev, spec, intake, context, register) if tested else ([], None)
        _, family_counts = family_table(git, rev, spec['families'], origins, counterexamples, registry, environment, toolchain)
    for target, result in zip(targets.values(), results):
        declaration = target.get('declaration') or {}
        entry = register.get(f"{target['file']}:{declaration.get('line')}:{declaration.get('column')}")
        if entry is not None and entry['classification'] != 'not_held':
            result['refused'].append('the target leaf is a registered ' + entry['classification'] + ' test (P1-H)')
            result.pop('credit', None)
    table = preserved_table(evaluations)
    if spec['preserved'] != table:
        stored = {row.get('member'): row for row in spec['preserved'] if isinstance(row, dict)}
        differing = sorted(row['member'] for row in table if stored.get(row['member']) != row)
        missing = sorted(set(stored) - {row['member'] for row in table})
        raise CheckError(f'preserved table differs from the census at C: {len(differing)} members differ, '
                         f'{len(missing)} not recomputed (first: {(differing + missing)[:3]})')
    figures = census_figures(evaluations, table, all_earlier)
    register_counts = Counter((row['classification'], row.get('claim')) for row in register.values())
    members = {row['member']: row for row in table}
    witness_records(counterexamples, members, claims, register)
    facts = {'target': {key: {'refused': bool(result['refused']), 'member': targets[key].get('member')}
                        for key, result in zip(targets, results)},
             'counterexample': counterexamples, 'member': members,
             'family': unique_records(spec['families'], 'families'),
             'case': {case['id']: case for case in registry['cases']}}
    closures = {key: origin_closure(git, rev, key, row, origins[key], facts)
                for key, row in rows.items() if row['state'] == 'complete'}
    states = Counter(row['state'] for row in rows.values())
    revalidation = Counter(row['legacy']['status'] for row in rows.values() if row['state'] == 'pending_revalidation')
    pending = sorted(key for key, row in rows.items() if row['state'] in ('pending', 'pending_revalidation'))
    return {'operation': 'corpus', 'format': 2, 'revision': rev,
            'result': 'mappings_complete' if not pending else 'extraction_pending',
            'origins': len(rows), 'states': dict(states), 'pending_revalidation': dict(revalidation),
            'closures': {'complete': len(closures), 'context_ranges': sum(row['ranges'] for row in closures.values()),
                         'context_candidates': sum(row['candidates'] for row in closures.values()),
                         'context_reasoned': sum(row['reasoned'] for row in closures.values())},
            'pending_adoption': len(pending), 'pending_origins': pending,
            'counts': {'origins': len(rows), 'counterexamples': len(counterexamples),
                       'families': sum(row.get('families', 0) for row in family_counts.values()),
                       'members': sum(row.get('occurrences', 0) for row in family_counts.values()),
                       'suite_targets': len(targets), 'preserved': figures['by_status'].get('preserved', 0), 'kills': 0},
            'targets': {'counts': target_counts(results), 'results': results},
            'suite_credit': target_counts(results)['credit'], 'holds': sorted(claims),
            'preserved': figures, 'families': family_counts,
            'register': {'scope_files': len(scope), 'entries': len(register),
                         'by_classification': {f'{kind}:{claim or "-"}': count for (kind, claim), count in sorted(register_counts.items(), key=str)}},
            'mapping_complete': not pending, 'execution': 'not evaluated',
            'full_corpus_complete': False, 'acceptance': 'not evaluated',
            'limits': ['Semantic equivalence and non-executable classifications require source review',
                       'A complete mapping is not a passing corpus run or release of held claims',
                       'Revision-2 mappings carry no credit until revalidated (P1-R)',
                       'Preserved means the same test-side code, fixtures and assertion at C, not discrimination; '
                       'reads outside fs, by native code or in processes that drop NODE_OPTIONS are unseen',
                       'The hold register covers leaf registrations in preserved and target files; '
                       'registry cases are not yet registered']}


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


def apply_edits(directory, edits):
    """Apply a mutant's edits atomically. Every anchor must occur exactly once in its file's original
    bytes and edits in one file must not overlap; otherwise nothing is written and the reason returns."""
    planned = {}
    for path, before, after in edits:
        target = directory / path
        if not target.is_file():
            return {'detail': 'mutation target absent', 'matches': 0}
        plan = planned.setdefault(path, {'data': target.read_bytes(), 'ranges': []})
        anchor = before.encode()
        count = plan['data'].count(anchor) if anchor else 0
        if count != 1:
            return {'detail': 'stale or ambiguous mutation anchor', 'matches': count}
        start = plan['data'].index(anchor)
        plan['ranges'].append((start, start + len(anchor), after.encode()))
    for plan in planned.values():
        ranges = sorted(plan['ranges'])
        if any(left[1] > right[0] for left, right in zip(ranges, ranges[1:])):
            return {'detail': 'overlapping mutation edits', 'matches': 1}
    for path, plan in planned.items():
        data = plan['data']
        for start, end, text in sorted(plan['ranges'], reverse=True):
            data = data[:start] + text + data[end:]
        (directory / path).write_bytes(data)
    return None


def edit_offsets(files, edits):
    """UTF-16 offsets of each edit's anchor in the original files, as V8 coverage counts them."""
    offsets = []
    for path, before, _ in edits:
        data = files.get(path, b'')
        index = data.find(before.encode())
        offsets.append((path, None if index < 0 else len(data[:index].decode('utf-8', 'replace').encode('utf-16-le')) // 2))
    return offsets


def run_case(files, case, environment, mutant=None):
    with tempfile.TemporaryDirectory(prefix='arrokothi-evidence-') as tmp:
        directory = Path(tmp)
        for name, data in files.items():
            dest = directory / path_name(name)
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
        if mutant is not None:
            refused = apply_edits(directory, mutation_edits(mutant))
            if refused is not None:
                return {'status': 'not_applicable', 'exit': None, 'output': '', **refused}
        return command(case['argv'], directory, case['timeout_seconds'], case['output_limit_bytes'], environment)


def target_declaration(case):
    """A target-set case runs its declared test files under node:test and names failing leaves."""
    targets = case.get('targets')
    require(isinstance(targets, dict) and 'argv' not in case, 'a target-set case declares targets instead of argv')
    flags = unique_text(targets.get('flags', []), 'target flags')
    require('--test' in flags and not any(flag.startswith(('--test-reporter', '--test-name-pattern', '--test-skip-pattern',
                                                             '--test-only', '--test-isolation=none'))
                                          for flag in flags),
            'target flags run each file under node:test without their own reporter or selection')
    files = [path_name(name) for name in unique_text(targets.get('files', []), 'target files')]
    require(bool(files), 'a target-set case names its test files')
    return flags, files


def run_targets(files, case, environment, mutant=None, offsets=None):
    """One run of a target-set case in a temporary copy; with offsets, also the coverage counts there."""
    flags, selected = target_declaration(case)
    with tempfile.TemporaryDirectory(prefix='arrokothi-evidence-') as tmp, \
            tempfile.TemporaryDirectory(prefix='arrokothi-evidence-events-') as side:
        directory = Path(os.path.realpath(tmp))
        for name, data in files.items():
            dest = directory / path_name(name)
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
        if mutant is not None:
            refused = apply_edits(directory, mutation_edits(mutant))
            if refused is not None:
                return {'status': 'not_applicable', 'exit': None, 'output': '', **refused}
        events = Path(side) / 'events.jsonl'
        coverage = Path(side) / 'coverage'
        coverage.mkdir()
        argv = ['node', *flags, '--test-reporter=' + str(directory / CATALOG_REPORTER),
                '--test-reporter-destination=' + str(events), *selected]
        run_environment = environment if offsets is None else dict(environment, NODE_V8_COVERAGE=str(coverage))
        run = command(argv, directory, case['timeout_seconds'], case['output_limit_bytes'], run_environment)
        try:
            rows = [json.loads(line) for line in events.read_text().splitlines()] if events.exists() else None
            tree = None if rows is None else catalog_tree(rows, directory, selected)
        except (ValueError, CheckError):
            tree = None
        if offsets is not None and run['status'] == 'finished':
            sites = [(path, offset) for path, offset in offsets if offset is not None]
            request = Path(side) / 'request.json'
            request.write_text(json.dumps([{'file': str(directory / path), 'offsets': [offset], 'processes': 'any'}
                                           for path, offset in sites]))
            counted = command(['node', str(directory / REACH_COVERAGE), str(coverage), str(request)],
                              directory, 120, 1048576, environment)
            if counted['status'] == 'finished' and counted['exit'] == 0:
                rows = json.loads(counted['output'])
                run['reach'] = {f'{path}:{offset}': row['counts'][0] for (path, offset), row in zip(sites, rows)}
    run['tree'] = tree
    return run


def target_leaves(run):
    """Leaf verdicts of a valid target-set run, keyed by (file, full path); None when the run is invalid."""
    tree = run.get('tree')
    if run['status'] != 'finished' or tree is None or not tree.get('valid') or tree.get('refused'):
        return None
    return {(name, tuple(pair['path'])): pair['verdict'] for name, facts in tree['files'].items()
            for pair in facts['pairs'] if pair['leaf']}


def expected_targets(mutant):
    rows = mutant.get('expected_targets')
    require(isinstance(rows, list) and bool(rows) and all(
        isinstance(row, dict) and set(row) == {'file', 'path'} and isinstance(row['file'], str) and
        isinstance(row['path'], list) and bool(row['path']) and all(isinstance(name, str) for name in row['path'])
        for row in rows), 'a target-set mutant names its expected target leaves')
    return {(row['file'], tuple(row['path'])) for row in rows}


def target_outcome(run, mutant, reached):
    """F3: a kill is a failing leaf in the mutant's declared target set; any other failure is a wrong kill."""
    if run['status'] != 'finished':
        return dict(status=run['status'], matches=run.get('matches'))
    leaves = target_leaves(run)
    if leaves is None:
        return dict(status='setup_error', exit=run['exit'])
    failed = sorted(key for key, verdict in leaves.items() if verdict != 'passed')
    expected = expected_targets(mutant)
    qualifying = [key for key in failed if key in expected]
    if not reached:
        return {'status': 'uncovered', 'failures': len(failed)}
    if qualifying:
        return {'status': 'killed', 'killed_by': qualifying[0][0] + ' > ' + ' > '.join(qualifying[0][1]),
                'failures': len(failed)}
    if failed:
        return {'status': 'wrong_kill', 'first_failure': failed[0][0] + ' > ' + ' > '.join(failed[0][1]),
                'failures': len(failed)}
    return {'status': 'survived' if run['exit'] == 0 else 'setup_error', 'failures': 0}


def target_control(files, case, environment, mutants):
    """The passing control of a target-set case, with the coverage counts at every mutant's edit sites."""
    offsets = sorted({offset for mutant in mutants for offset in edit_offsets(files, mutation_edits(mutant))},
                     key=lambda item: (item[0], -1 if item[1] is None else item[1]))
    run = run_targets(files, case, environment, offsets=offsets)
    leaves = target_leaves(run)
    valid = run['status'] == 'finished' and run['exit'] == 0 and leaves is not None and \
        all(verdict == 'passed' for verdict in leaves.values()) and run.get('reach') is not None
    return run, leaves, valid, run.get('reach') or {}


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
    if any('targets' in case for case in registry['cases']):
        shared.update({name: git.blob(rev, name) for name in (CATALOG_REPORTER, REACH_COVERAGE)})
    environment, environment_record = child_environment(environment_declaration(registry.get('environment')))
    case_ids, mutant_ids, results = set(), {}, []
    for case in registry['cases']:
        print('Case ' + case['id'], file=sys.stderr, flush=True)
        require(case['id'] not in case_ids, 'duplicate case ID')
        case_ids.add(case['id'])
        targeted = 'targets' in case
        if not targeted:
            require(type(case['failure_exit']) is int and 1 <= case['failure_exit'] <= 125, 'invalid failure exit')
        names = unique_text(case['files'], 'case files')
        files = {**shared, **{path_name(name): git.blob(rev, name) for name in names}}
        mutants = [] if cases_only else case.get('mutants', [])
        if targeted:
            baseline, leaves, valid, counts = target_control(files, case, environment, mutants)
            for mutant in mutants:
                require(expected_targets(mutant) <= {key for key, verdict in (leaves or {}).items() if verdict == 'passed'}
                        or not valid, 'expected target leaves absent from the passing control: ' + str(mutant.get('id')))
        else:
            baseline = run_case(files, case, environment)
            try:
                control = observation(baseline, case)
                valid = control['reached'] and control['passed']
            except CheckError:
                valid = False
        case_result = {'case': case['id'], 'content_key': case_key(case),
                       'claim': claim_attribution(case), 'kind': 'target_set' if targeted else 'probe',
                       'control': 'passed' if valid else 'invalid_baseline',
                       'baseline': baseline, 'mutations': []}
        local_mutants = set()
        for mutant in mutants:
            key = mutation_key(mutant)
            require(mutant['id'] not in local_mutants and mutant_ids.get(mutant['id'], key) == key,
                    'duplicate or conflicting mutant ID')
            local_mutants.add(mutant['id'])
            mutant_ids[mutant['id']] = key
            edits = mutation_edits(mutant)
            require(all(path in files for path, _, _ in edits), 'mutation target absent from declared files')
            if not valid:
                result = {'mutation': mutant['id'], 'status': 'invalid_baseline'}
            else:
                if targeted:
                    reached = any((counts.get(f'{path}:{offset}') or 0) > 0 for path, offset in edit_offsets(files, edits))
                    run = run_targets(files, case, environment, mutant)
                    outcome = target_outcome(run, mutant, reached)
                else:
                    run = run_case(files, case, environment, mutant)
                    outcome = execution_outcome(run, case)
                state = outcome['status']
                result = {'mutation': mutant['id'], 'status': state, 'run': run,
                          'invalid': state in ('setup_error', 'timeout', 'output_limit')}
                if state == 'killed':
                    result['killed_by'] = outcome['killed_by'] if targeted else \
                        outcome['observation'].get('failures', [case['assertion']])[0]
                if state == 'wrong_kill':
                    result['first_failure'] = outcome['first_failure']
                if case['id'] in registry.get('determinism_sample', []):
                    repeated_run = run_targets(files, case, environment, mutant) if targeted else \
                        run_case(files, case, environment, mutant)
                    repeated = target_outcome(repeated_run, mutant, reached) if targeted else \
                        execution_outcome(repeated_run, case)
                    stable = repeated == outcome
                    result['determinism'] = {'passed': stable, 'runs': 2, 'repeat': repeated_run}
                    if not stable:
                        result['status'] = 'nondeterministic'
                        result.pop('killed_by', None)
            if 'discovery' in mutant:
                result['discovery'] = {'metadata': mutant['discovery'], 'credit': 'none'}
            result['content_key'] = key
            case_result['mutations'].append(result)
        if case['id'] in registry.get('determinism_sample', []):
            if targeted:
                repeat, repeated_leaves, repeated_valid, _ = target_control(files, case, environment, [])
                stable = valid and repeated_valid and repeated_leaves == leaves
            else:
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


@contextlib.contextmanager
def step_inputs(git, inputs, step):
    """Extract a step's declared snapshot inputs for its run, then check they were not changed by it."""
    names = unique_text(step.get('inputs', []), 'step inputs')
    require(all(name in inputs for name in names), 'step names an undeclared input')
    with tempfile.TemporaryDirectory(prefix='arrokothi-input-') as temporary:
        provided, facts = {}, []
        for name in names:
            directory = Path(temporary) / name
            directory.mkdir()
            facts.append(dict(snapshot_input(git, inputs[name], directory), id=name))
            provided[inputs[name]['environment']] = str(directory)
        yield provided, facts
        for fact in facts:
            try:
                verify_snapshot(git, fact['revision'], Path(temporary) / fact['id'])
            except CheckError as exc:
                raise CheckError('snapshot input changed during ' + step['id'] + ': ' + str(exc)) from exc


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


def catalog_run(git, rev, step, environment, toolchain=None):
    """One run of a catalog command at C feeds verify (first reporter) and the catalog (second)."""
    facts = catalog_declaration(git, rev, step)
    reporter = git.repo / CATALOG_REPORTER
    git.blob(rev, CATALOG_REPORTER)
    with tempfile.TemporaryDirectory(prefix='arrokothi-catalog-') as temporary:
        events = Path(temporary) / 'events.jsonl'
        argv = ['node', *facts['flags'], '--test-reporter=spec', '--test-reporter-destination=stdout',
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
    if tree is not None and 'files' in tree:
        tree = catalog_source_check(tree, source_kinds(git, rev, facts['files'], environment, toolchain))
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
            'source_kind_checked': True}


def typescript_toolchain(git, rev):
    """The digest-pinned TypeScript 5.9.3 subset the mutation registry already declares (design 05 A6)."""
    registry = git.document(rev, 'tests/fixtures/packet-tools/mutations.json')
    pinned = [row for row in registry.get('dependencies', []) if row.get('path') == 'node_modules/typescript']
    require(len(pinned) == 1, 'the mutation registry must pin exactly one TypeScript subset')
    return dependency_files(git, rev, pinned)


def source_facts(git, rev, requests, environment, toolchain=None):
    """Parse sources in a temporary copy with the pinned TypeScript subset; nothing parsed is executed."""
    files = dict(typescript_toolchain(git, rev) if toolchain is None else toolchain)
    files['source-facts.mjs'] = git.blob(rev, SOURCE_FACTS)
    with tempfile.TemporaryDirectory(prefix='arrokothi-source-facts-') as temporary:
        directory = Path(temporary)
        for name, data in files.items():
            (directory / name).parent.mkdir(parents=True, exist_ok=True)
            (directory / name).write_bytes(data)
        (directory / 'request.json').write_text(json.dumps(requests))
        run = command(['node', 'source-facts.mjs', 'request.json', 'result.json'], directory, 600, 65536, environment)
        require(run['status'] == 'finished' and run['exit'] == 0 and (directory / 'result.json').exists(),
                'source facts failed: ' + run['output'][-2000:])
        result = json.loads((directory / 'result.json').read_text())
    require(result.get('typescript') == '5.9.3' and len(result.get('results', [])) == len(requests),
            'source facts returned an unexpected result')
    return result['results']


def name_pattern(path):
    """A --test-name-pattern matching exactly one full test path (ancestors joined by spaces)."""
    return '^' + ' '.join(re.sub(r'[\\^$.*+?()[\]{}|/]', lambda match: '\\' + match[0], name) for name in path) + '$'


def reach_run(git, rev, flags, file, environment, selection):
    """One coverage run of one file: a full-path name pattern, or the no-test baseline."""
    events_rows, directory = None, tempfile.mkdtemp(prefix='arrokothi-reach-')
    coverage = Path(directory) / 'coverage'
    coverage.mkdir()
    events = Path(directory) / 'events.jsonl'
    argv = ['node', *flags, '--test-reporter=' + str(git.repo / CATALOG_REPORTER),
            '--test-reporter-destination=' + str(events), selection, file]
    run = command(argv, git.repo, 300, 1048576, dict(environment, NODE_V8_COVERAGE=str(coverage)))
    if events.exists():
        try:
            events_rows = [json.loads(line) for line in events.read_text().splitlines()]
        except ValueError:
            events_rows = None
    return {'run': run, 'rows': events_rows, 'directory': directory, 'coverage': str(coverage)}


def reach_valid(observation, path):
    """D05-CHK-02: exactly one leaf equal to the target path, no failure anywhere, matching summary."""
    rows = observation['rows']
    if observation['run']['status'] != 'finished' or observation['run']['exit'] != 0 or rows is None:
        return False, 'reach run did not finish cleanly'
    if any(row.get('type') == 'test:fail' for row in rows):
        return False, 'a test failed in the reach run'
    tree, reason = file_tree([row for row in rows if row.get('type') in ('test:start', 'test:pass', 'test:fail')])
    if tree is None:
        return False, reason
    leaves = [pair['path'] for pair in tree['pairs'] if pair['leaf']]
    if leaves != [path]:
        return False, f'{len(leaves)} leaves matched, not exactly the target'
    summary = {row['label']: row['count'] for row in rows if row.get('type') == 'summary'}
    tests = sum(pair['kind'] == 'test' for pair in tree['pairs'])
    expected = {'tests': tests, 'suites': sum(pair['kind'] == 'suite' for pair in tree['pairs']), 'pass': tests,
                'fail': 0, 'cancelled': 0, 'skipped': 0, 'todo': 0}
    if tests != 1 or summary != expected:
        return False, 'summary counts do not match one passing leaf'
    return True, None


def coverage_counts(git, rev, observation, requests, environment):
    with tempfile.TemporaryDirectory(prefix='arrokothi-reach-request-') as temporary:
        request = Path(temporary) / 'request.json'
        request.write_text(json.dumps(requests))
        run = command(['node', str(git.repo / REACH_COVERAGE), observation['coverage'], str(request)],
                      git.repo, 120, 1048576, environment)
    require(run['status'] == 'finished' and run['exit'] == 0, 'reach coverage failed: ' + run['output'][-2000:])
    return json.loads(run['output'])


def target_record(target, counterexamples):
    require(isinstance(target, dict) and all(field in target for field in TARGET_FIELDS),
            'suite target needs ' + ', '.join(TARGET_FIELDS))
    require(target['counterexample'] in counterexamples, 'suite target names an unknown counterexample')
    require(isinstance(target['test_path'], list) and bool(target['test_path']) and
            all(isinstance(name, str) for name in target['test_path']), 'suite target needs a full test path')
    declaration = target['declaration']
    require(isinstance(declaration, dict) and type(declaration.get('line')) is int and
            type(declaration.get('column')) is int, 'suite target needs a declaration line and column')
    relation = target['relation']
    require(isinstance(relation, dict) and (relation.get('kind') == 'exact_input' or
            (relation.get('kind') == 'authorized_replacement' and isinstance(relation.get('decision'), str) and
             bool(relation['decision']))), 'relation is exact_input or authorized_replacement with its decision')
    require(bool(target['input_anchors']) and len(target['input_anchors']) == 1 and
            bool(target['assertion_anchors']), 'a suite target names one input anchor and its assertion anchors')
    discrimination = target['discrimination']
    require(isinstance(discrimination, dict) and len(discrimination) == 1 and
            (isinstance(discrimination.get('mutation'), str) or isinstance(discrimination.get('reading'), str)),
            'discrimination is one registered mutation or one reading trace')
    anchors = [*target['input_anchors'], *target['assertion_anchors'], *target.get('operation_anchors', [])]
    for anchor in anchors:
        require(isinstance(anchor, dict) and isinstance(anchor.get('anchor'), str) and bool(anchor['anchor']) and
                anchor.get('sha256') == digest(anchor['anchor'].encode()), 'anchor needs its text and SHA-256')
    return target


def source_kinds(git, rev, files, environment, toolchain=None):
    """Registrations per file at C, keyed by the location Node reports (the callee's last name)."""
    requests = [{'op': 'registrations', 'path': name, 'text': git.blob(rev, name).decode()} for name in files]
    kinds = {}
    for name, result in zip(files, source_facts(git, rev, requests, environment, toolchain)):
        kinds[name] = {(row['location']['line'], row['location']['column']): row for row in result['registrations']}
    return kinds


def catalog_source_check(tree, kinds):
    """A1: each pair's kind agrees with the source registration at its location, or the file is refused."""
    for name, file in list(tree['files'].items()):
        for pair in file['pairs']:
            registration = kinds.get(name, {}).get((pair['line'], pair['column']))
            expected = {'suite': ('suite',), 'test': ('leaf', 'subtest')}[pair['kind']]
            if registration is None or registration['kind'] not in expected:
                tree['refused'][name] = 'source registration mismatch at ' + str(pair['line']) + ':' + str(pair['column'])
                del tree['files'][name]
                break
    tree['valid'] = tree['valid'] and not tree['refused']
    return tree


def check_target(git, rev, target, counterexamples, registry, context):
    """P1-T facts for one suite target at C. A failed check is a reported refusal, never credit."""
    target_record(target, counterexamples)
    facts = {'id': target['id'], 'counterexample': target['counterexample'], 'refused': [], 'anchors': []}
    refuse = facts['refused'].append
    step = context['catalogs'].get(target['command'])
    if step is None:
        refuse('command is not a catalog command')
        return facts
    catalog = context['catalog'](target['command'])
    file = target['file']
    if file not in catalog['selection']:
        refuse("file is not in the command's own selection")
        return facts
    location = (target['declaration']['line'], target['declaration']['column'])
    registration = context['kinds'](file).get(location)
    if registration is None or registration['kind'] not in ('leaf', 'subtest'):
        refuse('no test registration at the declaration')
        return facts
    if registration['kind'] == 'subtest':
        refuse('a t.test subtest cannot be selected by its full path (A9)')
        return facts
    title = registration['title']
    if title['kind'] == 'literal' and title['value'] != target['test_path'][-1]:
        refuse('the declaration registers another title')
    leaf = [pair for pair in catalog['tree']['files'].get(file, {'pairs': []})['pairs']
            if (pair['line'], pair['column']) == location and pair['path'] == target['test_path']]
    if len(leaf) != 1 or not leaf[0]['leaf'] or leaf[0]['verdict'] != 'passed':
        refuse('the catalog has no single passing leaf with this path at the declaration')
    anchors = [('input', row) for row in target['input_anchors']] + \
              [('assertion', row) for row in target['assertion_anchors']] + \
              [('operation', row) for row in target.get('operation_anchors', [])]
    by_file = {}
    for role, row in anchors:
        by_file.setdefault(row.get('file', file), []).append((role, row))
    located = {}
    for name, rows in by_file.items():
        span = registration['span'] if name == file else None
        result = source_facts(git, rev, [{'op': 'anchors', 'path': name, 'text': git.blob(rev, name).decode(), 'span': span,
                                          'anchors': [{'role': role, 'anchor': row['anchor']} for role, row in rows]}],
                              context['environment'], context.get('toolchain'))[0]['anchors']
        for (role, row), fact in zip(rows, result):
            located.setdefault(name, []).append((role, row, fact))
    for name, rows in located.items():
        for role, row, fact in rows:
            entry = {'file': name, 'role': role, 'anchor': row['anchor'][:120], 'bound': 'error' not in fact}
            if fact.get('not_observable'):
                entry['not_observable'] = fact['not_observable'] if isinstance(fact['not_observable'], str) else fact['error']
            elif 'error' in fact:
                refuse(role + ' anchor: ' + fact['error'])
            if role == 'input' and 'error' not in fact:
                entry['scope'] = fact['scope']
                if fact['scope'] == 'other_test':
                    refuse('input anchor lies in another test')
                if row.get('computed') is True:
                    entry['input'] = 'computed'
                else:
                    tokens = {token['ordinal']: token for token in fact['tokens']}
                    literals = row.get('literals')
                    require(isinstance(literals, list) and bool(literals) and all(
                        isinstance(item, dict) and type(item.get('ordinal')) is int and isinstance(item.get('value'), str)
                        for item in literals), 'input anchor needs literals (ordinal, value) or computed')
                    matched = all(tokens.get(item['ordinal'], {}).get('value') == item['value'] for item in literals)
                    entry['input'] = 'tokens_matched' if matched else 'tokens_differ'
                    if not matched:
                        refuse('input literal tokens differ at their recorded positions')
            entry['offset'] = fact.get('offset')
            facts['anchors'].append(entry)
    if facts['refused']:
        return facts
    flags = step['catalog']['flags']
    selected = reach_run(git, rev, flags, file, context['environment_for'](step), '--test-name-pattern=' + name_pattern(target['test_path']))
    baseline = context['baseline'](step, file)
    try:
        valid, reason = reach_valid(selected, target['test_path'])
        facts['reach_run'] = 'valid' if valid else reason
        if not valid:
            refuse('invalid reach run: ' + reason)
            return facts
        if baseline['run']['status'] != 'finished' or baseline['run']['exit'] != 0:
            refuse('the no-test baseline did not finish cleanly')
            return facts
        requests = {}
        for entry in facts['anchors']:
            if entry.get('offset') is not None:
                requests.setdefault(entry['file'], []).append(entry['offset'])
        request = [{'file': str(Path(os.path.realpath(git.repo)) / name), 'offsets': offsets} for name, offsets in requests.items()]
        chosen = {row['file']: row['counts'] for row in coverage_counts(git, rev, selected, request, context['environment'])}
        base = {row['file']: row['counts'] for row in coverage_counts(git, rev, baseline, request, context['environment'])}
        cursor = Counter()
        for entry in facts['anchors']:
            if entry.get('offset') is None:
                continue
            key = str(Path(os.path.realpath(git.repo)) / entry['file'])
            index = cursor[key]
            cursor[key] += 1
            count, before = chosen[key][index], base[key][index] or 0
            entry['count'], entry['baseline'] = count, before
            entry['reached'] = count is not None and count > before
            if entry.get('not_observable'):
                continue
            if entry['role'] == 'assertion' and not entry['reached']:
                refuse('assertion anchor not reached: ' + entry['anchor'])
            if entry['role'] == 'input' and entry.get('scope') == 'span' and not entry['reached']:
                refuse('input anchor not reached: ' + entry['anchor'])
    finally:
        shutil.rmtree(selected['directory'], True)
    discrimination = target['discrimination']
    if 'reading' in discrimination:
        facts['credit'] = 'target_reading'
    else:
        mutation = next((row for case in registry['cases'] for row in case.get('mutants', [])
                         if row.get('id') == discrimination['mutation']), None)
        operation_files = {entry['file'] for entry in facts['anchors'] if entry['role'] == 'operation'}
        if mutation is None or mutation.get('obligation') != target['counterexample']:
            refuse('the mutation is not registered to this counterexample')
        elif not {path for path, _, _ in mutation_edits(mutation)} & operation_files:
            refuse('the mutated file holds no cited operation anchor')
        else:
            # A qualifying named failure of this leaf is executed with the target-set mutants (step 7).
            facts['credit'] = 'target_mutation_pending_execution'
    return facts


def counterexample_table(rows, origins):
    table = unique_records(rows, 'counterexamples')
    for row in table.values():
        require(row.get('kind') in COUNTEREXAMPLE_KINDS, 'unknown counterexample kind')
        require(bool(unique_text(row.get('origins', []), 'counterexample origins')) and set(row['origins']) <= set(origins),
                'counterexample needs known origins')
        require(isinstance(row.get('required_result'), str) and bool(row['required_result'].strip()),
                'counterexample needs its required result')
    return table


def target_context(git, rev, spec, stack, toolchain=None):
    """Catalog runs and source facts for suite targets and the preserved census, computed once per
    corpus invocation at a clean C. Snapshot inputs live until `stack` closes, then are checked."""
    clean_payload(git, rev)
    verification = git.document(rev, spec['verification'])
    declaration = environment_declaration(verification.get('environment'))
    inputs = declared_inputs(verification, declaration)
    environment, _ = child_environment(declaration)
    catalogs = {step['id']: step for step in verification['checks'] if 'catalog' in step}
    cache = {}

    def environment_for(step):
        if ('environment', step['id']) not in cache:
            provided, _ = stack.enter_context(step_inputs(git, inputs, step))
            cache[('environment', step['id'])] = child_environment(declaration, provided)[0]
        return cache[('environment', step['id'])]

    def catalog(command_id):
        if ('catalog', command_id) not in cache:
            step = catalogs[command_id]
            facts, run, tree = catalog_run(git, rev, step, environment_for(step), toolchain)
            require(tree is not None and 'files' in tree, 'catalog run produced no events: ' + command_id)
            cache[('catalog', command_id)] = {'selection': facts['files'], 'tree': tree}
        return cache[('catalog', command_id)]

    def kinds(name):
        if ('kinds', name) not in cache:
            cache[('kinds', name)] = source_kinds(git, rev, [name], environment, toolchain)[name]
        return cache[('kinds', name)]

    def baseline(step, name):
        # One no-test baseline per command and file; its coverage lives until the corpus run ends.
        if ('baseline', step['id'], name) not in cache:
            observation = reach_run(git, rev, step['catalog']['flags'], name, environment_for(step), '--test-skip-pattern=.')
            stack.callback(shutil.rmtree, observation['directory'], True)
            cache[('baseline', step['id'], name)] = observation
        return cache[('baseline', step['id'], name)]
    return {'catalogs': catalogs, 'catalog': catalog, 'kinds': kinds, 'environment': environment,
            'environment_for': environment_for, 'baseline': baseline, 'toolchain': toolchain}


def target_counts(results):
    anchors = [entry for row in results for entry in row['anchors']]
    return {'targets': len(results), 'targets_refused': sum(bool(row['refused']) for row in results),
            'anchors_bound': sum(entry['bound'] for entry in anchors),
            'anchors_reached': sum(entry.get('reached') is True for entry in anchors),
            'anchors_not_observable': sum('not_observable' in entry for entry in anchors),
            'input_tokens_matched': sum(entry.get('input') == 'tokens_matched' for entry in anchors),
            'input_computed': sum(entry.get('input') == 'computed' for entry in anchors),
            'input_module_scope': sum(entry.get('scope') == 'module' for entry in anchors if entry['role'] == 'input'),
            'credit': dict(Counter(row['credit'] for row in results if not row['refused'] and 'credit' in row))}


def test_side(path):
    """A test-side module lives under a `tests` directory; everything else it imports is production."""
    return 'tests' in PurePosixPath(path).parts


def blob_id(git, rev, path):
    """The object ID of a path at a revision (file, symlink or directory), or None when absent."""
    entry = git.tree(rev).get(path)
    return None if entry is None else entry[1]


def listing(git, rev, path):
    """Entry names of a directory at a revision; None when the path is absent or not a directory."""
    entry = git.tree(rev).get(path) if path else ('040000', None)
    if entry is None or entry[0] != '040000':
        return None
    prefix = path + '/' if path else ''
    return sorted(name[len(prefix):] for name in git.tree(rev)
                  if name.startswith(prefix) and '/' not in name[len(prefix):])


def workspace_packages(git, rev):
    root = json.loads(git.blob(rev, 'package.json'))
    packages = {}
    for directory in root.get('workspaces', []):
        manifest = json.loads(git.blob(rev, directory + '/package.json'))
        packages[manifest['name']] = (directory, manifest.get('exports'))
    return packages


def resolve_specifier(git, rev, importer, specifier, packages):
    """One static import at a revision: a repository file, a builtin, an external package or missing."""
    if specifier.startswith('node:') or specifier.split('/')[0] in NODE_BUILTINS:
        return 'builtin', specifier
    if specifier.startswith('.'):
        path = os.path.normpath(os.path.join(os.path.dirname(importer), specifier))
        return ('file', path) if blob_id(git, rev, path) is not None else ('missing', path)
    parts = specifier.split('/')
    name = '/'.join(parts[:2]) if specifier.startswith('@') else parts[0]
    if name not in packages:
        return 'external', specifier
    directory, exports = packages[name]
    subpath = '.' + specifier[len(name):]
    target = exports.get(subpath) if isinstance(exports, dict) else (exports if subpath == '.' else None)
    if isinstance(target, dict):
        target = target.get('import', target.get('default'))
    if not isinstance(target, str):
        return 'missing', specifier
    path = os.path.normpath(os.path.join(directory, target))
    return ('file', path) if blob_id(git, rev, path) is not None else ('missing', path)


def import_closures(git, rev, files, environment, toolchain=None, tools=None):
    """Static value-import closures at one revision (design 05 §2.3 rule 6), followed through test-side
    and production modules alike. Type-only imports load nothing; dynamic imports are listed, not followed.
    Sources are read at `rev` and parsed with the tooling at `tools` (C; default `rev`)."""
    packages = workspace_packages(git, rev) if files else {}
    facts, pending = {}, sorted(set(files))
    while pending:
        results = source_facts(git, tools or rev, [{'op': 'imports', 'path': name, 'text': git.blob(rev, name).decode()}
                                                   for name in pending], environment, toolchain)
        found = set()
        for name, result in zip(pending, results):
            edges = [resolve_specifier(git, rev, name, specifier, packages) for specifier in result['requests']]
            facts[name] = {'edges': edges, 'dynamic': result['dynamic']}
            found.update(target for kind, target in edges if kind == 'file' and target.endswith(SOURCE_SUFFIXES))
        pending = sorted(found - set(facts))
    closures = {}
    for name in files:
        seen, queue = set(), [name]
        other = {'external': set(), 'missing': set(), 'dynamic': set()}
        while queue:
            current = queue.pop()
            for kind, target in facts[current]['edges']:
                if kind == 'file' and target not in seen and target != name:
                    seen.add(target)
                    if target in facts:
                        queue.append(target)
                elif kind in other:
                    other[kind].add(target)
            other['dynamic'].update(str(item) for item in facts[current]['dynamic'])
        closures[name] = {'test_side': sorted(path for path in seen if test_side(path)),
                          'production': sorted(path for path in seen if not test_side(path)),
                          **{key: sorted(value) for key, value in other.items()}}
    return closures


def traced_reads(git, flags, file, environment):
    """Design 05 §2.3 rule 5: one run of one test file with the read-trace preload; leaf verdicts and reads."""
    with tempfile.TemporaryDirectory(prefix='arrokothi-reads-') as temporary:
        trace = Path(temporary) / 'trace.jsonl'
        events = Path(temporary) / 'events.jsonl'
        traced = dict(environment, NODE_OPTIONS='--import=' + str(git.repo / READ_TRACE), ARROKOTHI_READ_TRACE=str(trace))
        argv = ['node', *flags, '--test-reporter=' + str(git.repo / CATALOG_REPORTER),
                '--test-reporter-destination=' + str(events), file]
        run = command(argv, git.repo, 600, 1048576, traced)
        try:
            rows = [json.loads(line) for line in events.read_text().splitlines()] if events.exists() else []
            reads = [json.loads(line) for line in trace.read_text().splitlines()] if trace.exists() else []
        except ValueError:
            rows, reads = [], []
    try:
        tree, _ = file_tree([row for row in rows if row.get('type') in ('test:start', 'test:pass', 'test:fail')])
    except CheckError:
        tree = None
    verdicts = None if tree is None else sorted([pair['line'], pair['column'], pair['path'], pair['verdict']]
                                                for pair in tree['pairs'] if pair['leaf'])
    return {'status': run['status'], 'exit': run['exit'], 'verdicts': verdicts,
            'child_preloads': sum(row.get('operation') == 'preload' and row.get('test_child') is True for row in reads),
            'reads': [row for row in reads if row.get('operation') != 'preload']}


def read_kind(operation):
    return READ_KIND.get(operation.removeprefix('promises.').removesuffix('.native').removesuffix('Sync'))


def fixture_read(path, kind):
    """A changed fixture refuses the file: a non-module file under a test directory, or a listing of a
    `fixtures` directory under one (design 05 §2.3 rule 5)."""
    parts = PurePosixPath(path).parts
    if 'tests' not in parts:
        return False
    if kind == 'listing':
        return 'fixtures' in parts[parts.index('tests'):]
    return not path.endswith(SOURCE_SUFFIXES)


def compared_reads(root, reads, aside):
    """Traced reads inside the repository, outside node_modules and the static import closure."""
    compared = set()
    for row in reads:
        kind = read_kind(row.get('operation') or '')
        if kind is None or not isinstance(row.get('path'), str):
            continue
        absolute = Path(os.path.realpath(row['path']))
        if not absolute.is_relative_to(root):
            continue
        relative = absolute.relative_to(root).as_posix()
        if relative != '.' and 'node_modules' not in PurePosixPath(relative).parts and relative not in aside:
            compared.add((relative, kind))
    return sorted(compared)


def changed_reads(git, pin, rev, compared):
    """Each remaining read compared at the pin and at C: bytes, directory entries or existence."""
    changed = []
    for relative, kind in compared:
        if kind == 'bytes':
            same = blob_id(git, pin, relative) == blob_id(git, rev, relative)
        elif kind == 'listing':
            same = listing(git, pin, relative) == listing(git, rev, relative)
        else:
            same = (blob_id(git, pin, relative) is None) == (blob_id(git, rev, relative) is None)
        if not same:
            changed.append({'path': relative, 'kind': kind, 'fixture': fixture_read(relative, kind)})
    return changed


def register_recipes(claims, register):
    """P1-H: recipes per held claim; each may widen design 05's minimum (D05-CHK-05), never narrow it."""
    require(isinstance(register, dict) and isinstance(register.get('recipes'), dict),
            'holds need a register with recipes')
    recipes = register['recipes']
    require(set(recipes) == set(claims), 'register recipes must cover exactly the held claims')
    for claim, recipe in recipes.items():
        require(isinstance(recipe, dict) and set(recipe) <= {'title', 'body', 'files'},
                'register recipe fields are title, body and files: ' + claim)
        for field in ('title', 'body'):
            require(field not in recipe or isinstance(recipe[field], str) and bool(recipe[field]),
                    'register recipe pattern must be text: ' + claim)
            if field in recipe:
                try:
                    re.compile(recipe[field])
                except re.error as exc:
                    raise CheckError('register recipe pattern does not compile: ' + claim) from exc
        unique_text(recipe.get('files', []), 'register recipe files')
        minimum = REGISTER_MINIMUM.get(claim, {})
        for field in ('title', 'body'):
            if field in minimum:
                require(recipe.get(field) == minimum[field] or str(recipe.get(field, '')).startswith(minimum[field] + '|'),
                        'register recipe narrows the minimum ' + field + ': ' + claim)
        require(set(minimum.get('files', [])) <= set(recipe.get('files', [])),
                'register recipe narrows the minimum files: ' + claim)
    return recipes


def register_matches(git, rev, files, recipes, environment, toolchain=None):
    """D05-CHK-05: match each claim's title, body and file recipes against every leaf registration in
    `files`. A body is the registration's text plus, transitively, the text of the same-file and
    test-side helpers whose names it references; a namespace import widens to every exported helper."""
    if not files:
        return []
    closures = import_closures(git, rev, files, environment, toolchain)
    modules = sorted({*files, *(path for closure in closures.values() for path in closure['test_side'])})
    requests = [{'op': op, 'path': name, 'text': git.blob(rev, name).decode()} for name in modules for op in ('helpers', 'imports')]
    results = source_facts(git, rev, requests, environment, toolchain)
    helper_facts = {name: results[2 * index] for index, name in enumerate(modules)}
    import_facts = {name: results[2 * index + 1] for index, name in enumerate(modules)}
    packages = workspace_packages(git, rev)
    compiled = {claim: {field: re.compile(recipe[field]) for field in ('title', 'body') if field in recipe}
                for claim, recipe in recipes.items()}

    def expand(module, names, seen, texts):
        functions = helper_facts[module]['functions']
        bindings = {row['local']: row for row in import_facts[module]['bindings'] if not row['type_only']}
        for name in names:
            if (module, name) in seen:
                continue
            seen.add((module, name))
            for declaration in functions.get(name, []):
                texts.append(declaration['text'])
                expand(module, declaration['references'], seen, texts)
            binding = bindings.get(name)
            if binding is None:
                continue
            kind, target = resolve_specifier(git, rev, module, binding['module'], packages)
            if kind != 'file' or target not in helper_facts:
                continue
            exported = {row['exported']: row['local'] for row in helper_facts[target]['exports']}
            if binding['imported'] == '*':
                targets = [key for key, rows in helper_facts[target]['functions'].items() if any(row['exported'] for row in rows)]
                targets += list(exported.values())
            else:
                targets = [exported.get(binding['imported'], binding['imported'])]
            expand(target, targets, seen, texts)

    matches = []
    for name in files:
        for registration in helper_facts[name]['registrations']:
            if registration['kind'] != 'leaf':
                continue
            texts = [registration['text']]
            expand(name, registration['references'], set(), texts)
            body = '\n'.join(texts)
            title = registration['title'].get('value', registration['title'].get('text', ''))
            claims = sorted(claim for claim, recipe in recipes.items()
                            if name in recipe.get('files', []) or
                            ('title' in compiled[claim] and compiled[claim]['title'].search(title)) or
                            ('body' in compiled[claim] and compiled[claim]['body'].search(body)))
            if claims:
                location = registration['location']
                matches.append({'key': f"{name}:{location['line']}:{location['column']}", 'claims': claims})
    return matches


def hold_register(git, rev, register, claims, files, environment, toolchain=None):
    """P1-H: the register's recipes, recomputed at C over `files`, must equal its classified entries."""
    recipes = register_recipes(claims, register)
    entries = {}
    for row in register.get('entries', []):
        require(isinstance(row, dict) and isinstance(row.get('key'), str) and row['key'] not in entries,
                'register entry needs a unique key')
        require(row.get('classification') in REGISTER_CLASSES and isinstance(row.get('reason'), str) and
                bool(row['reason'].strip()), 'register entry needs a classification and its reason')
        require(row['classification'] == 'not_held' or row.get('claim') in claims,
                'a held or superseded entry names its held claim')
        entries[row['key']] = row
    matches = register_matches(git, rev, files, recipes, environment, toolchain)
    require({row['key'] for row in matches} == set(entries), 'register entries differ from the recomputed matches')
    for row in matches:
        require(entries[row['key']].get('matched') == row['claims'], 'register entry records other matched claims: ' + row['key'])
    return entries


def floor_order_model(git, rev, floor):
    """Design 05 §2.3 rule 1: the A10 result of the recorded floor run decides the run model."""
    require(isinstance(floor, dict) and isinstance(floor.get('record'), str) and isinstance(floor.get('sha256'), str) and
            isinstance(floor.get('order_model_holds'), bool), 'format 2 needs the floor record and its A10 result')
    data = git.blob(rev, floor['record'])
    require(digest(data) == floor['sha256'], 'floor record digest mismatch')
    try:
        results = json.loads(gzip.decompress(data))['results']
        a10 = [row for row in results if row.get('assumption') == 'A10']
        facts = a10[0]['facts'] if len(a10) == 1 and a10[0].get('passed') is True else None
        isolated = facts['process_isolation']['distinct_processes'] is True
        holds = facts['order_model_holds']
    except (OSError, ValueError, KeyError, TypeError, IndexError) as exc:
        raise CheckError('floor record has no passing A10 result') from exc
    require(isolated, 'floor record shows no process isolation')
    require(holds is floor['order_model_holds'], 'floor A10 order model differs from the record')
    return holds


def helper_review_table(git, rev, rows, origins):
    """Counted helper reviews: each covers one changed test-side module, top-level code included, for one origin."""
    reviews = {}
    for row in unique_records(rows, 'helper reviews').values():
        require(row.get('origin') in origins and isinstance(row.get('module'), str) and test_side(row['module']),
                'helper review needs its origin and a test-side module')
        origin = origins[row['origin']]
        require(row.get('pin_blob') == blob_id(git, origin['revision'], row['module']) and
                row.get('current_blob') == blob_id(git, rev, row['module']) and row['pin_blob'] != row['current_blob'],
                'helper review is not bound to the changed module: ' + row['id'])
        require(row.get('covers') == 'module' and isinstance(row.get('reason'), str) and bool(row['reason'].strip()),
                'helper review covers the whole module and states its reason: ' + row['id'])
        require((row['origin'], row['module']) not in reviews, 'helper review duplicated: ' + row['id'])
        reviews[(row['origin'], row['module'])] = row['id']
    return reviews


def moves_table(git, rev, rows):
    moves = {}
    for row in rows:
        require(isinstance(row, dict) and isinstance(row.get('from'), str) and isinstance(row.get('to'), str) and
                row['from'] not in moves and isinstance(row.get('reason'), str) and bool(row['reason'].strip()),
                'a move names its source, destination and reason')
        require(blob_id(git, rev, row['from']) is None and blob_id(git, rev, row['to']) is not None,
                'a move needs its source gone and its destination present at C')
        moves[row['from']] = row['to']
    return moves


def test_file_origins(intake):
    """Whole-file test origins: the members P1-P can preserve (design 05 §5.1: 71 at the pinned inventory)."""
    return [row for row in intake['origins'] if row['kind'] == 'artifact' and row['line'] == 1 and
            row['path'].endswith(TEST_SUFFIXES)]


def blocking_reasons(blocking):
    """One reason per blocking kind and side: its first line and how many more share it."""
    grouped = {}
    for entry in blocking:
        grouped.setdefault((entry['reason'], entry.get('side')), []).append(entry.get('line'))
    reasons = []
    for (reason, side), lines in grouped.items():
        lines = sorted(line for line in lines if line is not None)
        if side is None or not lines:
            reasons.append(reason)
        else:
            reasons.append(f'{reason} ({side} line {lines[0]}' + (f', {len(lines) - 1} more)' if len(lines) > 1 else ')'))
    return reasons


def origin_census(git, rev, origin, path, leaves, run, closures, prefixes, reviews, register):
    """P1-P for one origin's leaves at its pin; one evaluation per pinned leaf."""
    pin, pin_path = origin['revision'], origin['path']
    evaluations = []
    for leaf in leaves:
        location = leaf['location']
        row = {'origin': origin['id'], 'pin': (pin_path, blob_id(git, pin, pin_path), location['line'], location['column']),
               'file': path, 'title': leaf['title'].get('value', leaf['title'].get('text')), 'title_kind': leaf['title']['kind']}
        if run['refused'] is not None:
            evaluations.append(dict(row, reasons=[run['refused']]))
            continue
        reasons, current = [], (location['line'], location['column'])
        if run['whole']:
            row['scope'] = 'whole_file'
        else:
            facts = prefixes[location['line'], location['column']]
            row.update(scope='span', span_identical=facts['span_identical'], prefix_blocked=bool(facts['blocking']))
            row['prefix_differences'] = sorted({entry['kind'] + ': ' + entry['reason'] for entry in facts.get('inert', [])})
            current = (facts['current']['line'], facts['current']['column']) if facts.get('current') else None
            reasons += blocking_reasons(facts['blocking'])
        if current is not None:
            found = [pair for pair in run['pairs'] if pair['leaf'] and (pair['line'], pair['column']) == current and
                     (leaf['title']['kind'] != 'literal' or pair['path'][-1] == leaf['title']['value'])]
            if not found:
                reasons.append('no leaf at C for this title or declaration site')
            elif any(pair['verdict'] != 'passed' for pair in found):
                reasons.append('a leaf at C does not pass')
        changed = run['changed_helpers']
        reviewed = [reviews[origin['id'], module] for module in changed if (origin['id'], module) in reviews]
        reasons += ['test-side module changed without a helper review: ' + module for module in changed
                    if (origin['id'], module) not in reviews or leaf['title']['kind'] != 'literal']
        changed_reads_now = changed_reads(git, pin, rev, run['compared'])
        fixtures = [entry['path'] for entry in changed_reads_now if entry['fixture']]
        if fixtures:
            reasons.append('changed test fixture read: ' + ', '.join(fixtures))
        entry = register.get(f'{path}:{current[0]}:{current[1]}') if current is not None else None
        evaluations.append(dict(row, reasons=reasons, current=None if current is None else list(current),
                                helper_closure='unchanged' if not changed else {'reviewed': sorted(reviewed)},
                                reads=run['reads_digest'], register=None if entry is None else entry['classification'],
                                production_changed=[module for module in closures['production']
                                                    if blob_id(git, pin, module) != blob_id(git, rev, module)],
                                repository_read_changed=[entry['path'] for entry in changed_reads_now if not entry['fixture']]))
    return evaluations


def preserved_census(git, rev, spec, intake, context, register):
    """P1-P for every member of every whole-file test origin, fresh at C (design 05 §2.3, D05-CHK-07, -11)."""
    origins = {row['id']: row for row in intake['origins']}
    moves = moves_table(git, rev, spec['moves'])
    all_earlier = not floor_order_model(git, rev, spec['floor'])
    reviews = helper_review_table(git, rev, spec['helper_reviews'], origins)
    environment, toolchain = context['environment'], context['toolchain']
    tested = test_file_origins(intake)
    paths = {row['id']: moves.get(row['path'], row['path']) for row in tested}
    present = sorted({path for path in paths.values() if blob_id(git, rev, path) is not None})
    closures_now = import_closures(git, rev, present, environment, toolchain)
    by_pin = {}
    for row in tested:
        by_pin.setdefault(row['revision'], set()).add(row['path'])
    closures_then, pinned = {}, {}
    for pin, names in by_pin.items():
        names = sorted(names)
        closures_then[pin] = import_closures(git, pin, names, environment, toolchain, tools=rev)
        facts = source_facts(git, rev, [{'op': 'registrations', 'path': name, 'text': git.blob(pin, name).decode()}
                                        for name in names], environment, toolchain)
        for name, result in zip(names, facts):
            pinned[pin, name] = [row for row in result['registrations'] if row['kind'] == 'leaf']
    # Selection is the command's own expanded globs; a catalog runs only for a command that selects a file.
    selection = {}
    for command_id in sorted(context['catalogs']):
        for path in catalog_declaration(git, rev, context['catalogs'][command_id])['files']:
            selection.setdefault(path, command_id)
    changed = sorted({(row['revision'], row['path'], paths[row['id']]) for row in tested if paths[row['id']] in present and
                      blob_id(git, row['revision'], row['path']) != blob_id(git, rev, paths[row['id']])})
    facts = source_facts(git, rev, [{'op': 'prefix', 'path': path, 'pin': git.blob(pin, pin_path).decode(),
                                     'current': git.blob(rev, path).decode(), 'all_earlier': all_earlier}
                                    for pin, pin_path, path in changed], environment, toolchain)
    prefixes = {}
    for key, result in zip(changed, facts):
        inert = [entry for entry in result['differences'] if entry['inert']]
        prefixes[key] = {(row['pin']['line'], row['pin']['column']): dict(row, inert=inert) for row in result['members']}
    root = Path(os.path.realpath(git.repo))
    traces, evaluations = {}, []
    for origin in tested:
        pin, pin_path, path = origin['revision'], origin['path'], paths[origin['id']]
        run = {'refused': None}
        if path not in present:
            run['refused'] = 'file absent at C'
        elif path not in selection:
            run['refused'] = 'no catalog command selects the file at C'
        else:
            step = context['catalogs'][selection[path]]
            if any(flag.split('=')[0] in ('--test-isolation', '--experimental-test-isolation') and
                   not flag.endswith('=process') for flag in step['catalog']['flags']):
                run['refused'] = 'the command does not run each file in its own process'
            else:
                tree = context['catalog'](selection[path])['tree']
                if path not in tree['files']:
                    run['refused'] = 'the catalog refused the file: ' + str(tree['refused'].get(path, 'not reported'))
        if run['refused'] is None:
            if path not in traces:
                traced = traced_reads(git, step['catalog']['flags'], path, context['environment_for'](step))
                expected = sorted([pair['line'], pair['column'], pair['path'], pair['verdict']]
                                  for pair in tree['files'][path]['pairs'] if pair['leaf'])
                compared = compared_reads(root, traced['reads'], {path, *closures_now[path]['test_side'],
                                                                  *closures_now[path]['production']})
                traces[path] = {'compared': compared, 'digest': digest(json.dumps(compared).encode()),
                                'refused': None if traced['verdicts'] == expected and traced['child_preloads'] >= 1 else
                                'the traced run differs from the catalog run, or did not load the trace'}
            run['refused'] = traces[path]['refused']
        if run['refused'] is None:
            now, then = closures_now[path], closures_then[pin][pin_path]
            run.update(pairs=tree['files'][path]['pairs'], compared=traces[path]['compared'],
                       reads_digest=traces[path]['digest'], whole=(pin, pin_path, path) not in prefixes,
                       changed_helpers=sorted(set(now['test_side']) ^ set(then['test_side']) |
                                              {module for module in now['test_side']
                                               if blob_id(git, pin, module) != blob_id(git, rev, module)}))
        evaluations += origin_census(git, rev, origin, path, pinned[pin, pin_path], run, closures_now.get(path),
                                     prefixes.get((pin, pin_path, path), {}), reviews, register)
    return evaluations, all_earlier


def preserved_table(evaluations):
    """Merge per-origin evaluations into one record per distinct pinned registration (path, blob, site).
    Origins sharing a member share its file at C, so scope, counterpart, trace and register entry agree by
    construction; reasons, labels and reviews are unions. A member refused for any origin is refused;
    held and superseded register entries make witness records, never credit."""
    members = {}
    for row in evaluations:
        members.setdefault(row['pin'], []).append(row)
    table = []
    for (pin_path, pin_blob, line, column), rows in sorted(members.items()):
        first = rows[0]
        reasons = sorted({reason for row in rows for reason in row['reasons']})
        register = first.get('register')
        status = register if register in ('held', 'superseded') else 'refused' if reasons else 'preserved'
        record = {'member': f'{pin_path}:{line}:{column}@{pin_blob[:12]}', 'origins': sorted(row['origin'] for row in rows),
                  'file': first['file'], 'pin_blob': pin_blob, 'title': first['title'], 'title_kind': first['title_kind'],
                  'status': status, 'reasons': reasons}
        if 'scope' in first:
            reviewed = sorted({review for row in rows if isinstance(row['helper_closure'], dict)
                               for review in row['helper_closure']['reviewed']})
            record.update(scope=first['scope'], current=first['current'], reads=first['reads'], register=register,
                          helper_closure={'reviewed': reviewed} if reviewed else 'unchanged',
                          production_changed=sorted({module for row in rows for module in row['production_changed']}),
                          repository_read_changed=sorted({path for row in rows for path in row['repository_read_changed']}))
            if first['scope'] == 'span':
                record['prefix_differences'] = first['prefix_differences']
        table.append(record)
    return table


def census_figures(evaluations, table, all_earlier):
    """The design 05 §5.1 and §2.3 figures, recomputed for the step-6 record (counts, never credit)."""
    whole = [row for row in evaluations if row.get('scope') == 'whole_file']
    changed = [row for row in evaluations if row.get('scope') == 'span']
    span_identical = [row for row in changed if row['span_identical']]
    distinct = lambda rows: len({row['pin'] for row in rows})
    preserved = [row for row in table if row['status'] == 'preserved']
    return {
        'all_leaves_earlier': all_earlier,
        'test_file_origins': len({row['origin'] for row in evaluations}),
        'registrations': len(evaluations),
        'by_title_kind': dict(Counter(row['title_kind'] for row in evaluations)),
        'identical_origins': len({row['origin'] for row in whole}), 'identical_distinct': distinct(whole),
        'changed_origins': len({row['origin'] for row in changed}), 'changed_registrations': len(changed),
        'changed_span_identical': len(span_identical),
        'changed_kept_by_prefix': sum(not row['prefix_blocked'] for row in span_identical),
        'changed_refused_by_prefix': sum(row['prefix_blocked'] for row in span_identical),
        'identical_fixture_refused': distinct([row for row in whole if any(reason.startswith('changed test fixture')
                                                                          for reason in row['reasons'])]),
        'identical_read_labelled': distinct([row for row in whole if row['repository_read_changed']]),
        'members': len(table), 'by_status': dict(Counter(row['status'] for row in table)),
        'preserved_whole_file': sum(row['scope'] == 'whole_file' for row in preserved),
        'preserved_prefix_inert': sum(row['scope'] == 'span' for row in preserved),
        'preserved_helper_reviewed': sum(isinstance(row['helper_closure'], dict) for row in preserved),
        'preserved_production_changed': sum(bool(row['production_changed']) for row in preserved),
        'preserved_repository_read_changed': sum(bool(row['repository_read_changed']) for row in preserved),
        'preserved_register_not_held': sum(row['register'] == 'not_held' for row in preserved),
        'preserved_refused': dict(Counter(category for row in table if row['status'] == 'refused'
                                          for category in {reason.split(':')[0].split(' (')[0] for reason in row['reasons']}))}


def python_container(text, name):
    """The Python counterpart of source-facts' `container` operation, by the standard `ast` module."""
    tree = ast.parse(text)
    declaration, statements = None, []

    def label(node):
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            return node.value
        if isinstance(node, (ast.Tuple, ast.List)) and node.elts:
            return label(node.elts[0])
        return None
    for statement in tree.body:
        targets = statement.targets if isinstance(statement, ast.Assign) else []
        if declaration is None and any(isinstance(target, ast.Name) and target.id == name for target in targets):
            value = statement.value
            if isinstance(value, ast.Dict):
                elements = [{'label': label(key), 'line': key.lineno} for key in value.keys]
            elif isinstance(value, (ast.List, ast.Tuple)):
                elements = [{'label': label(item), 'line': item.lineno} for item in value.elts]
            else:
                elements = []
            declaration = {'line': statement.lineno, 'kind': 'computed' if not elements and not isinstance(
                value, (ast.Dict, ast.List, ast.Tuple)) else 'array', 'elements': elements}
            continue
        if declaration is None or not any(isinstance(node, ast.Name) and node.id == name for node in ast.walk(statement)):
            continue
        adds = any(isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and
                   isinstance(node.func.value, ast.Name) and node.func.value.id == name and
                   node.func.attr in ('append', 'extend', 'insert', 'update', 'setdefault', 'pop', 'popitem', 'clear')
                   for node in ast.walk(statement)) or any(
            isinstance(node, (ast.Assign, ast.AugAssign, ast.Delete)) and any(
                isinstance(target, ast.Subscript) and isinstance(target.value, ast.Name) and target.value.id == name or
                isinstance(target, ast.Name) and target.id == name
                for target in (node.targets if isinstance(node, (ast.Assign, ast.Delete)) else [node.target]))
            for node in ast.walk(statement))
        statements.append({'line': statement.lineno, 'class': 'adds' if adds else 'reads', 'literal': False})
    return {'name': name, 'declaration': declaration, 'statements': statements, 'constants': []}


def runner_container(git, tools, path, text, name, environment, toolchain):
    if path.endswith('.py'):
        return python_container(text, name)
    result, = source_facts(git, tools, [{'op': 'container', 'path': path, 'text': text, 'name': name}],
                           environment, toolchain)
    return result


def carries_pattern(text, pattern):
    """A filter or generator regex counts only if the runner carries it verbatim, as a JS literal or a Python string."""
    return any(form in text for form in ('/' + pattern + '/', "r'" + pattern + "'", 'r"' + pattern + '"'))


def labelled(elements, where):
    require(all(isinstance(row['label'], str) and row['label'] for row in elements),
            'census element without a label: ' + where)
    return [{'label': row['label']} for row in elements]


class Census:
    """Recompute one family's member census over pinned bytes (design 05 D04-CHK-03, D05-06, D05-CHK-09)."""

    def __init__(self, git, tools, families, origins, environment, toolchain):
        self.git, self.tools, self.families, self.origins = git, tools, families, origins
        self.environment, self.toolchain, self.done = environment, toolchain, {}

    def runner(self, family_id):
        family = self.families[family_id]
        origin = self.origins.get(family.get('origin'))
        require(origin is not None and origin['kind'] in ('artifact', 'additional') and origin['line'] == 1,
                'a family names a whole-file artifact origin: ' + family_id)
        return origin['revision'], origin['path'], self.git.blob(origin['revision'], origin['path'])

    def source(self, spec, text, where):
        """A filter or inheritance source: another family's runner, or a pinned file, bound by the digest the runner checks."""
        require(isinstance(spec, dict) and (('family' in spec) != ('path' in spec)), 'census source names a family or a path: ' + where)
        if 'family' in spec:
            require(spec['family'] in self.families, 'census source family absent: ' + where)
            _, path, data = self.runner(spec['family'])
        else:
            path, data = spec['path'], self.git.blob(self.git.commit(spec['revision']), spec['path'])
        if 'digest' in spec:
            require(spec['digest'] == digest(data) and spec['digest'] in text,
                    'census source digest differs from the bytes or is absent from the runner: ' + where)
        return path, data

    def part(self, family_id, index, part, text, path):
        where = f'{family_id} part {index}'
        kind = part.get('kind')
        require(kind in CENSUS_KINDS, 'unknown census kind: ' + where)
        if kind == 'inherits':
            require(part.get('family') in self.families and part['family'] != family_id, 'inherited family absent: ' + where)
            self.source(part, text, where)
            return [{'label': row['label'], 'from': part['family']} for row in self.members(part['family'])]
        if kind == 'filter':
            source_path, data = self.source(part.get('source'), text, where)
            pattern = part.get('pattern')
            require(isinstance(pattern, str) and carries_pattern(text, pattern), 'filter regex absent from the runner: ' + where)
            compiled = re.compile(pattern)
            if part.get('over') == 'lines':
                labeller = re.compile(part.get('label', ''))
                labels = [labeller.search(line) for line in data.decode().splitlines() if compiled.search(line)]
                require(all(match and match.groups() for match in labels), 'filtered line without a label: ' + where)
                rows = [{'label': match.group(1)} for match in labels]
            else:
                facts = runner_container(self.git, self.tools, source_path, data.decode(), part.get('container'),
                                         self.environment, self.toolchain)
                require(facts['declaration'] is not None and facts['declaration']['kind'] == 'array',
                        'filter source container absent: ' + where)
                rows = [row for row in labelled(facts['declaration']['elements'], where) if compiled.search(row['label'])]
            origin = part['source'].get('family')
            return [dict(row, **({'from': origin} if origin else {})) for row in rows]
        if kind == 'loop':
            require(type(part.get('line')) is int and not path.endswith('.py'), 'a loop part names its line in a JS runner: ' + where)
            result, = source_facts(self.git, self.tools, [{'op': 'loop', 'path': path, 'text': text, 'line': part['line']}],
                                   self.environment, self.toolchain)
            require(result['elements'] is not None, 'no top-level for-of over an array literal at that line: ' + where)
            return labelled(result['elements'], where)
        if kind == 'bindings':
            facts = runner_container(self.git, self.tools, path, text, '', self.environment, self.toolchain)
            names = unique_text(part.get('names', []), 'binding names')
            require(bool(names) and set(names) <= {row['name'] for row in facts['constants']},
                    'bindings absent from the runner: ' + where)
            require(isinstance(part.get('label'), str) and bool(part['label']) and part['label'] in text,
                    'a bindings member needs a label the runner carries: ' + where)
            return [{'label': part['label']}]
        # structural and python_ast: a container declaration and every top-level statement mentioning it
        facts = runner_container(self.git, self.tools, path, text, part.get('container'), self.environment, self.toolchain)
        require(facts['declaration'] is not None, 'census container absent: ' + where)
        require((kind == 'python_ast') == path.endswith('.py'), 'python_ast censuses Python runners only: ' + where)
        rows = []
        if facts['declaration']['kind'] == 'array':
            require('initializer' not in part, 'an array container needs no initializer part: ' + where)
            rows += labelled(facts['declaration']['elements'], where)
        else:
            require(isinstance(part.get('initializer'), dict), 'a computed container needs its initializer part: ' + where)
            rows += [dict(row, initializer=True) for row in
                     self.part(family_id, f'{index}.initializer', part['initializer'], text, path)]
        generators = {row.get('statement'): row for row in part.get('generators', [])}
        require(len(generators) == len(part.get('generators', [])), 'one generator per statement: ' + where)
        claimed = set()
        for statement in facts['statements']:
            if statement['class'] != 'adds':
                continue
            if statement['literal']:
                rows += labelled(statement['elements'], where)
            elif statement['line'] in generators:
                claimed.add(statement['line'])
                rows += self.generated(generators[statement['line']], text, where)
            else:
                raise CheckError(f"unclassified addition to the container at line {statement['line']}: {where}")
        require(claimed == set(generators), 'a generator claims no adding statement: ' + where)
        return rows

    def generated(self, generator, text, where):
        """D05-06: the runner's own regex over its inputs at the recorded input revision, counted by the runner's literal."""
        pattern = generator.get('pattern')
        require(isinstance(pattern, str) and carries_pattern(text, pattern), 'generator regex absent from the runner: ' + where)
        anchor = generator.get('count_anchor')
        require(isinstance(anchor, str) and text.count(anchor) == 1, 'generator count anchor absent from the runner: ' + where)
        inputs = generator.get('inputs', [])
        require([int(value) for value in re.findall(r'\b\d+\b', anchor)] == [row.get('count') for row in inputs],
                'generator counts differ from the runner literal: ' + where)
        revision = self.git.commit(generator.get('input_revision'))
        compiled, rows = re.compile(pattern), []
        for row in inputs:
            source = self.git.blob(revision, row['path']).decode()
            matches = list(compiled.finditer(source))
            require(len(matches) == row['count'], 'generator count mismatch at the input revision: ' + where)
            for match in matches:
                site = {'file': PurePosixPath(row['path']).name, 'line': source.count('\n', 0, match.start()) + 1,
                        'group': match.group(1) if match.groups() else match.group(0)}
                rows.append({'generated': generator.get('label_contains', '{file}:{line}').format(**site)})
        return rows

    def members(self, family_id):
        """The census rows of a family (labels, or generated sites matched to member labels), memoised."""
        if family_id in self.done:
            require(self.done[family_id] is not None, 'cyclic family inheritance: ' + family_id)
            return self.done[family_id]
        self.done[family_id] = None
        family = self.families[family_id]
        census = family.get('census')
        members = family.get('members')
        require(isinstance(members, list) and all(isinstance(row, dict) and isinstance(row.get('label'), str) and
                                                  row['label'] for row in members), 'family members need labels: ' + family_id)
        if isinstance(census, dict) and 'reading' in census:
            require(isinstance(census['reading'], str) and bool(census['reading'].strip()) and set(census) == {'reading'},
                    'census: reading needs its reason: ' + family_id)
            rows = [{'label': row['label'], 'reading': True} for row in members]
        else:
            require(isinstance(census, dict) and isinstance(census.get('parts'), list) and bool(census['parts']),
                    'a family needs census parts or census: reading: ' + family_id)
            _, path, data = self.runner(family_id)
            text = data.decode()
            parts = [self.part(family_id, index, part, text, path) for index, part in enumerate(census['parts'])]
            self.count_assertions(family_id, census, parts, text)
            rows = [row for part in parts for row in part]
            require(len(rows) == len(members), f'census has {len(rows)} members, the family lists {len(members)}: {family_id}')
            for row, member in zip(rows, members):
                if 'generated' in row:
                    require(row['generated'] in member['label'], 'generated member label lacks its site: ' + member['label'])
                    row['label'] = member['label']
                require(row['label'] == member['label'], f"census member differs: {row['label']!r} != {member['label']!r}")
            if 'observed' in family:
                self.observed(family_id, family['observed'], rows, data)
        self.done[family_id] = rows
        return rows

    def count_assertions(self, family_id, census, parts, text):
        """Cross-check the runner's own count assertions; every count assertion it makes must be declared."""
        names = [part.get('container') for part in census['parts'] if part.get('container')]
        declared = census.get('count_assertions', [])
        for row in declared:
            require(isinstance(row, dict) and isinstance(row.get('anchor'), str) and text.count(row['anchor']) == 1,
                    'count assertion anchor absent from the runner: ' + family_id)
            numbers = [int(value) for value in re.findall(r'\.length\s*(?:[!=]==?|[<>]=?|,)\s*(\d+)', row['anchor'])]
            covered = row.get('parts', list(range(len(parts))))
            require(isinstance(covered, list) and all(isinstance(index, int) and 0 <= index < len(parts) for index in covered),
                    'count assertion names unknown parts: ' + family_id)
            size = sum(sum(row.get('scope') != 'initializer' or entry.get('initializer', False) for entry in parts[index])
                       for index in covered)
            require(numbers == [size], f'the runner asserts {numbers}, the census counts {size}: {family_id}')
        for name in names:
            for line in text.splitlines():
                if re.search(r'\b' + re.escape(name) + r'\.length\b\s*(?:[!=]==?|[<>]=?|,)\s*\d', line):
                    require(any(row['anchor'] in line or line.strip() in row['anchor'] for row in declared),
                            'an undeclared count assertion in the runner: ' + line.strip())

    def observed(self, family_id, spec, rows, runner_bytes):
        """D05-CHK-09: a complete sealed run output of this runner must name exactly the census members."""
        require(isinstance(spec, dict) and all(isinstance(spec.get(key), str) for key in
                                               ('revision', 'path', 'sha256', 'tree', 'runner_path', 'line', 'summary')),
                'observed output needs revision, path, digest, tree, runner path, line and summary: ' + family_id)
        output = self.git.blob(self.git.commit(spec['revision']), spec['path'])
        require(digest(output) == spec['sha256'], 'observed output digest mismatch: ' + family_id)
        require(self.git.blob(self.git.commit(spec['tree']), spec['runner_path']) == runner_bytes,
                'the runner at the observed tree differs from the pinned origin: ' + family_id)
        text = output.decode()
        lines = [line for line in text.splitlines() if line.strip()]
        trailer = spec.get('trailer')
        while lines and isinstance(trailer, str) and re.fullmatch(trailer, lines[-1].strip()):
            lines.pop()
        summary = re.fullmatch(spec['summary'], lines[-1].strip()) if lines else None
        require(summary is not None, 'observed output does not end with the runner summary (partial output): ' + family_id)
        require(summary.groupdict().get('total') in (None, str(len(rows))),
                'the runner summary counts another member total: ' + family_id)
        for name in spec.get('names', []):
            require(isinstance(name, str) and name in text, 'observed output does not name its command or tree: ' + family_id)
        seen = [match.group('label') for match in re.finditer(spec['line'], text, re.MULTILINE)]
        require(sorted(seen) == sorted(row['label'] for row in rows),
                f'observed members differ from the census ({len(seen)} observed, {len(rows)} counted): {family_id}')


def member_key(member):
    return member.get('key', member['label'].split()[0])


def member_route(git, rev, family_id, member, counterexamples, mutants):
    """P1-M routes. Only a registered mutation can later earn a kill; every other route is counted, never a kill."""
    route = member.get('route')
    require(isinstance(route, dict) and route.get('kind') in MEMBER_ROUTES, 'member needs a known route: ' + member['label'])
    kind = route['kind']
    text = lambda name: isinstance(route.get(name), str) and bool(route[name].strip())
    if kind == 'mutation':
        mutant = mutants.get((route.get('case'), route.get('mutant')))
        require(mutant is not None and mutant.get('obligation') == f'{family_id}#{member_key(member)}',
                'a mutation route needs a registered mutant whose obligation is this member: ' + member['label'])
    elif kind == 'witness':
        require(counterexamples.get(route.get('counterexample'), {}).get('kind') in ('held_witness', 'superseded_witness'),
                'a witness route names a held or superseded counterexample: ' + member['label'])
    elif kind == 'no_longer_applicable':
        require(text('reason') and text('authority'), 'no-longer-applicable needs its reason and authority: ' + member['label'])
        git.blob(rev, route['authority'])
    elif kind == 'equivalence':
        require(text('argument'), 'an equivalence route needs its argument: ' + member['label'])
    elif kind == 'survivor':
        require(text('finding') and text('owner'), 'a survivor needs its finding and owner: ' + member['label'])
    elif kind == 'limit':
        require(text('owner_record'), 'an owner limit names its record: ' + member['label'])
        git.blob(rev, route['owner_record'])
    return kind


def family_table(git, rev, rows, origins, counterexamples, registry, environment, toolchain):
    """P1-M: recompute every family's census over pinned bytes and check each member's links and route."""
    families = unique_records(rows, 'families')
    census = Census(git, rev, families, origins, environment, toolchain)
    mutants = {(case['id'], mutant.get('id')): mutant for case in registry['cases'] for mutant in case.get('mutants', [])}
    counts = {role: Counter() for role in FAMILY_ROLES}
    for family_id, family in families.items():
        require(family.get('role') in FAMILY_ROLES, 'a family is a mutation runner or a mixed origin: ' + family_id)
        entries = census.members(family_id)
        keys = [member_key(member) for member in family['members']]
        require(len(keys) == len(set(keys)), 'member keys repeat within a family (declare `key`): ' + family_id)
        count = counts[family['role']]
        count['families'] += 1
        count['census_reading'] += 'reading' in family['census']
        for entry, member in zip(entries, family['members']):
            count['occurrences'] += 1
            if 'from' in entry:
                require('reuses' not in member, 'an inherited member needs no reuse link: ' + member['label'])
                count['inherited'] += 1
            elif 'reuses' in member:
                link = member['reuses']
                require(isinstance(link, dict) and link.get('family') in families and link['family'] != family_id and
                        any(other['label'] == link.get('label') and member_key(other) == member_key(member)
                            for other in families[link['family']]['members']),
                        'a reuse link names an existing member with the same key: ' + member['label'])
                count['reused'] += 1
            count['route:' + member_route(git, rev, family_id, member, counterexamples, mutants)] += 1
    for count in counts.values():
        count['distinct'] = count['occurrences'] - count['inherited'] - count['reused']
    return families, {role: dict(count) for role, count in counts.items()}


def markdown_section(lines, line):
    """The heading section enclosing a fence line: from its nearest heading to the next of equal or higher level."""
    level = lambda text: len(text) - len(text.lstrip('#')) if re.match(r'#{1,6} ', text) else 0
    fenced, start = False, 1
    heading = 0
    for index, text in enumerate(lines[:line - 1], 1):
        if text.lstrip().startswith('```'):
            fenced = not fenced
        elif not fenced and level(text):
            start, heading = index, level(text)
    end = len(lines)
    fenced = False
    for index in range(line, len(lines) + 1):
        text = lines[index - 1]
        if text.lstrip().startswith('```'):
            fenced = not fenced
        elif not fenced and level(text) and (heading == 0 or level(text) <= heading) and index > line:
            end = index - 1
            break
    return start, end


def context_minimum(git, origin):
    """D04-CHK-06 as design 05 adapts it: an artifact's whole file, or a fence's heading section."""
    data = git.blob(origin['revision'], origin['path']).decode('utf-8', 'replace')
    lines = data.splitlines()
    if origin['line'] == 1:
        return 1, max(len(lines), 1), data
    start, end = markdown_section(lines, origin['line'])
    return start, end, '\n'.join(lines[start - 1:end])


def context_check(git, origin, closure):
    """Recorded ranges cover the minimum context and every sealed record it names, transitively;
    every other path or revision candidate in that text is covered or reasoned."""
    ranges = closure.get('context')
    require(isinstance(ranges, list) and bool(ranges) and all(
        isinstance(row, dict) and isinstance(row.get('path'), str) and type(row.get('start')) is int and
        type(row.get('end')) is int and 1 <= row['start'] <= row['end'] and isinstance(row.get('revision'), str)
        for row in ranges), 'a closed origin records its context ranges')
    reasons = closure.get('context_reasons', {})
    require(isinstance(reasons, dict) and all(isinstance(value, str) and value.strip() for value in reasons.values()),
            'context reasons need text')

    def covers(revision, path, start, end):
        return any(row['revision'] == revision and row['path'] == path and row['start'] <= start and end <= row['end']
                   for row in ranges)
    start, end, text = context_minimum(git, origin)
    require(covers(origin['revision'], origin['path'], start, end), 'the context does not cover the minimum: ' + origin['id'])
    seen, queue, used = set(), [text], set()
    while queue:
        current = queue.pop()
        for candidate in sorted(set(CONTEXT_PATH.findall(current)) | {sha for sha in CONTEXT_SHA.findall(current)
                                                                      if re.search('[a-f]', sha) and re.search('[0-9]', sha)}):
            if candidate in seen:
                continue
            seen.add(candidate)
            entry = git.tree(origin['revision']).get(candidate)
            if entry is not None and entry[0] == '100644' and candidate.startswith(SEALED_PREFIXES) and candidate not in reasons:
                record = git.blob(origin['revision'], candidate).decode('utf-8', 'replace')
                require(covers(origin['revision'], candidate, 1, max(len(record.splitlines()), 1)),
                        'a named sealed record is outside the context: ' + candidate)
                queue.append(record)
            elif candidate in reasons:
                used.add(candidate)
            else:
                require(any(row['path'] == candidate or row['revision'].startswith(candidate) for row in ranges),
                        'an unreasoned path or revision candidate in the context: ' + candidate)
    require(set(reasons) <= used, 'context reasons name candidates that do not occur: ' + origin['id'])
    return {'ranges': len(ranges), 'candidates': len(seen), 'reasoned': len(used)}


def origin_closure(git, rev, key, row, origin, facts):
    """P1-R/P1-G: a complete origin links everything it needs; each kind of origin closes by its own rule."""
    closure = row.get('closure')
    require(isinstance(closure, dict), 'a complete origin records its closure: ' + key)
    links = closure.get('links', [])
    require(isinstance(links, list) and all(isinstance(link, dict) and link.get('kind') in CLOSURE_LINKS and
                                            isinstance(link.get('id'), str) for link in links),
            'closure links name a kind and an ID: ' + key)
    linked = {kind: {link['id'] for link in links if link['kind'] == kind} for kind in CLOSURE_LINKS}
    for kind, ids in linked.items():
        require(ids <= set(facts[kind]), f'a closure links an absent {kind}: {key}')
    for target in linked['target']:
        require(not facts['target'][target]['refused'], 'a closure links a refused target: ' + target)
    for member in linked['member']:
        require(facts['member'][member]['status'] == 'preserved' and key in facts['member'][member]['origins'],
                'a member link names a preserved member of this origin: ' + member)
    non_executable = closure.get('non_executable')
    if non_executable is not None:
        require(isinstance(non_executable, dict) and non_executable.get('reason') in NON_EXECUTABLE_REASONS and
                isinstance(non_executable.get('rationale'), str) and bool(non_executable['rationale'].strip()),
                'a non-executable closure states its reason and rationale: ' + key)
    members = [member for member in facts['member'].values() if key in member['origins']]
    for member in members:
        if member['status'] == 'refused':
            require(any(facts['target'][target]['member'] == member['member'] for target in linked['target']),
                    'a refused member of this origin has no linked target: ' + member['member'])
        elif member['status'] in ('held', 'superseded'):
            require(any(member['member'] in facts['counterexample'][cx].get('members', []) for cx in linked['counterexample']),
                    'a held or superseded member of this origin has no linked witness: ' + member['member'])
    for family in (row for row in facts['family'].values() if row['origin'] == key):
        require(family['id'] in linked['family'], 'an origin with a family links it: ' + key)
        require(all(member['route']['kind'] != 'pending' for member in family['members']),
                'a linked family still has pending members: ' + family['id'])
    require(bool(members) or non_executable is not None or any(linked.values()),
            'a closure without members, links or a non-executable reason: ' + key)
    return context_check(git, origin, closure)


def witness_records(counterexamples, members, claims, register):
    """P1-H: a held or superseded witness names its claim and the members the register classifies so."""
    for key, row in counterexamples.items():
        if row['kind'] not in ('held_witness', 'superseded_witness'):
            continue
        require(row.get('claim') in claims, 'a witness names a held claim: ' + key)
        expected = 'held' if row['kind'] == 'held_witness' else 'superseded'
        linked = unique_text(row.get('members', []), 'witness members')
        for member in linked:
            record = members.get(member)
            require(record is not None and record['status'] == expected,
                    'a witness member has another status: ' + member)
            entry = register.get(f"{record['file']}:{record['current'][0]}:{record['current'][1]}")
            require(entry is not None and entry.get('claim') == row['claim'],
                    'a witness member is registered under another claim: ' + member)
        require(bool(linked), 'a witness lists its members: ' + key)


def clean_payload(git, rev):
    require(git.run('rev-parse', 'HEAD').decode().strip() == rev, 'HEAD must be payload C')
    require(not git.run('status', '--porcelain', '--untracked-files=all').strip(), 'payload checkout must be clean')


def verify(git, revision, spec_path, toolchain=None):
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
                result = corpus(git, rev, step['spec'], toolchain)
            elif operation == 'coverage':
                result = coverage(git, rev, step['spec'])
            else:
                result = mutations(git, rev, step['spec'], cases_only=operation == 'cases')
            ok = result['result'] == step['expected']
            results.append({'id': step['id'], 'operation': operation, 'passed': ok, 'result': result})
        else:
            with step_inputs(git, inputs, step) as (provided, facts):
                environment, record = child_environment(declaration, provided)
                if 'catalog' in step:
                    catalog_facts, run, tree = catalog_run(git, rev, step, environment, toolchain)
                else:
                    catalog_facts, tree = None, None
                    run = command(step['argv'], git.repo, step['timeout_seconds'], step['output_limit_bytes'], environment)
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
