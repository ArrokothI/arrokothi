#!/usr/bin/env python3
"""Independent intrinsic-contact probes, using the exact C tool; only temporary repositories change.
Usage: python3 -B probe_detector.py <clean-candidate-clone>
"""
import contextlib
import gzip
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()
C = '28258b282532b36eef8fb1571d79b6343b54427b'
sys.path.insert(0, str(ROOT / 'tests/tooling'))
from test_packet_tools import RepositoryFixture, tool
from test_target_tools import pinned_toolchain
from test_venv_detector import DetectorTests

assert subprocess.check_output(['node', '--version'], text=True).strip() == 'v26.10.0'
assert (ROOT / 'scripts/packet_tools.py').read_bytes() == tool.Git(ROOT).blob(C, 'scripts/packet_tools.py')
HEAD = "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\n"
MUTATE = "function mutate(p) { p.toJSON = () => 42; }\n"
CASES = {
    'direct-control': ('', 'Object.prototype.toJSON = () => 42;'),
    'escape-control': (MUTATE, 'mutate(Object.prototype);'),
    'parenthesized-escape': (MUTATE, 'mutate((Object.prototype));'),
    'cast-escape': (MUTATE, 'mutate(Object.prototype as any);'),
    'non-null-escape': (MUTATE, 'mutate(Object.prototype!);'),
    'satisfies-escape': (MUTATE, 'mutate(Object.prototype satisfies object);'),
    'parenthesized-storage': ('', 'const box = [(Object.prototype)]; box[0].toJSON = () => 42;'),
    'parenthesized-return': ('function proto() { return (Object.prototype); }\n', 'proto().toJSON = () => 42;'),
    'named-reader-helper': ('function keys(p) { p.toJSON = () => 42; }\n', 'keys(Object.prototype);'),
    'named-reader-return': ('function keys(p) { return p; }\n', 'const p = keys(Object.prototype); p.toJSON = () => 42;'),
    'reader-method-helper': ('const helper = { keys(p) { p.toJSON = () => 42; } };\n', 'helper.keys(Object.prototype);'),
    'descriptor-result': ('', "const d = Object.getOwnPropertyDescriptor(Object, 'prototype'); d.value.toJSON = () => 42;"),
    'descriptor-destructure': ('', "const { value } = Object.getOwnPropertyDescriptor(Object, 'prototype'); value.toJSON = () => 42;"),
    'descriptor-return': ("function proto() { return Object.getOwnPropertyDescriptor(Object, 'prototype').value; }\n", 'proto().toJSON = () => 42;'),
    'reflect-get': ('', "const p = Reflect.get(Object, 'prototype'); p.toJSON = () => 42;"),
    'entries-result': ('', "const p = Object.entries(Object.getOwnPropertyDescriptors(Object))[0]; p.extra = 1;"),
    'values-result': ('', "const p = Object.values(Object.getOwnPropertyDescriptors(Object)); p.extra = 1;"),
    'local-control': ('', 'const p = {}; p.x = 1;'),
    'keys-control': ('', "const p = Object.keys(Object); p.push('x');"),
}

def main():
    detector = DetectorTests(methodName='setUp')
    detector.setUp()
    output = {}
    try:
        files = {}
        for name, (helper, statement) in CASES.items():
            # The mutation tests prove the write via the affected serializer. Controls only finish.
            assertion = ("assert.equal(JSON.stringify({a: 1}), '42');" if name not in
                         ('entries-result', 'values-result', 'local-control', 'keys-control') else 'assert.ok(true);')
            files['tests/' + name + '.test.ts'] = HEAD + helper + f"test('member', () => {{ {statement} {assertion} }});\n"
        rev, matches = detector.matches(files)
        for file, source in files.items():
            run = subprocess.run(['node', '--test', '--experimental-strip-types', file], cwd=detector.root,
                                 capture_output=True, text=True, timeout=20)
            output[file] = {'source': source, 'matches': [row for key, row in matches.items() if key.startswith(file + ':')],
                            'runtime_exit': run.returncode, 'runtime_stdout': run.stdout, 'runtime_stderr': run.stderr}
        # Use the actual preservation census and register consumer, with identical pin/current source.
        tables = detector.format_two_tables()
        tables['holds']['register']['entries'] = []
        for p in ('catalog-reporter.mjs', 'read-trace.mjs', 'reach-coverage.mjs'):
            detector.write('tests/tooling/' + p, (ROOT / 'tests/tooling' / p).read_text())
        detector.document('package.json', {'type': 'module', 'scripts': {'test': 'node --test --experimental-strip-types tests/named-reader-helper.test.ts tests/parenthesized-escape.test.ts'}})
        detector.document('verify.json', {'version': 1, 'checks': [{
            'id': 'tests', 'catalog': {'script': 'test', 'script_text': 'node --test --experimental-strip-types tests/named-reader-helper.test.ts tests/parenthesized-escape.test.ts',
              'flags': ['--test', '--experimental-strip-types'], 'globs': ['tests/named-reader-helper.test.ts', 'tests/parenthesized-escape.test.ts']},
            'timeout_seconds': 30, 'output_limit_bytes': 1048576}]})
        floor = gzip.compress(json.dumps({'results': [{'assumption': 'A10', 'passed': True, 'facts': {
            'process_isolation': {'distinct_processes': True}, 'order_model_holds': True}}]}).encode(), mtime=0)
        (detector.root / 'floor.json.gz').write_bytes(floor)
        tables['floor'] = {'record': 'floor.json.gz', 'sha256': tool.digest(floor), 'order_model_holds': True}
        current = detector.commit('preservation probe setup')
        chosen = ['tests/named-reader-helper.test.ts', 'tests/parenthesized-escape.test.ts']
        intake = {'origins': [{'id': file, 'kind': 'artifact', 'path': file, 'revision': rev, 'line': 1} for file in chosen]}
        spec = {'verification': 'verify.json', 'suite_targets': [], **tables}
        env = tool.child_environment(tool.environment_declaration(None))[0]
        register = tool.hold_register(detector.reader, current, tables['holds']['register'],
                                     tool.holds_table(detector.reader, current, tables['holds']), chosen, env, pinned_toolchain())
        with contextlib.ExitStack() as stack:
            ctx = tool.target_context(detector.reader, current, spec, stack, pinned_toolchain())
            evaluations, _ = tool.preserved_census(detector.reader, current, spec, intake, ctx, register)
        output['preservation'] = {'register': register, 'members': tool.preserved_table(evaluations)}
        assert len(output['preservation']['members']) == 2
        print(json.dumps({'subject': C, 'results': output}, indent=2))
    finally:
        detector.doCleanups()

if __name__ == '__main__':
    main()
