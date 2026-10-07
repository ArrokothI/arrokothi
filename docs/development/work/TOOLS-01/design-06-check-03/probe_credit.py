#!/usr/bin/env python3
"""Runtime and real register/census/preserved-table reproductions of design-r4 misses.
Temporary fixture repositories only. Exit 0 asserts these exact counterexamples reproduce.
Usage: PATH=<Node 26.10.0 bin>:$PATH python3 -B probe_credit.py <prototype-clone> <output.json>
"""
import contextlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(ROOT / 'tests/tooling'))
from test_venv_detector import DetectorTests
from test_target_tools import pinned_toolchain
from test_packet_tools import tool, classified

assert subprocess.check_output(['node', '--version'], text=True).strip() == 'v26.10.0'
HEAD = "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\n"
CASES = {}
for name, assignment in {
    'destructure-member': '({replacement: Object.keys} = {replacement: replacement});',
    'array-destructure-member': '[Object.keys] = [replacement];',
    'global-destructure-member': '({replacement: global.Object.keys} = {replacement: replacement});',
}.items():
    CASES[name] = HEAD + """let touched = false;
test('poison', () => {
  const original = Object.keys;
  function replacement(p) {
    p.__check03 = 42;
    assert.equal(p.__check03, 42);
    delete p.__check03;
    touched = true;
    return original(p);
  }
  ASSIGNMENT
});
test('victim', () => {
  Object.keys(Object.prototype);
  assert.equal(touched, true);
});
""".replace('ASSIGNMENT', assignment)
CASES['json-replacer'] = HEAD + """test('victim', () => {
  const escaped = [];
  JSON.stringify(Object.prototype, function(key, value) {
    escaped.push(value);
    return value;
  });
  escaped[0].__check03 = 42;
  assert.equal(escaped[0].__check03, 42);
  delete escaped[0].__check03;
});
"""
CASES['global-getter'] = HEAD + """let touched = false;
test('poison', () => {
  const original = JSON.stringify;
  const parse = JSON.parse;
  function replacement(p) {
    p.__check03 = 42;
    assert.equal(p.__check03, 42);
    delete p.__check03;
    touched = true;
    return original(p);
  }
  globalThis.__defineGetter__('JSON', () => ({stringify: replacement, parse}));
});
test('victim', () => {
  JSON.stringify(Object.prototype);
  assert.equal(touched, true);
});
"""

fixture = DetectorTests(methodName='setUp')
fixture.setUp()
try:
    files = {'tests/' + name + '.test.ts': text for name, text in CASES.items()}
    pin, matches = fixture.matches(files)
    result = {'node': subprocess.check_output(['node', '--version'], text=True).strip(), 'cases': {}}
    for name, source in CASES.items():
        file = 'tests/' + name + '.test.ts'
        run = subprocess.run(['node', '--test', '--experimental-strip-types', file], cwd=fixture.root,
                             capture_output=True, text=True, timeout=30)
        assert run.returncode == 0, (name, run.stdout, run.stderr)
        result['cases'][name] = {'file': file, 'source': source, 'runtime_exit': run.returncode,
                                 'runtime_stdout': run.stdout, 'runtime_stderr': run.stderr,
                                 'matches': [row for key, row in matches.items() if key.startswith(file + ':')]}
    tables = fixture.format_two_tables()
    # Keep the actual matched poison leaves held. No fabricated not_held disposition is supplied.
    tables['holds']['register']['entries'] = [classified(row) for row in matches.values()]
    for path in ('catalog-reporter.mjs', 'read-trace.mjs', 'reach-coverage.mjs'):
        fixture.write('tests/tooling/' + path, (ROOT / 'tests/tooling' / path).read_text())
    command = 'node --test --experimental-strip-types ' + ' '.join(files)
    fixture.document('package.json', {'type': 'module', 'scripts': {'test': command}})
    fixture.document('verify.json', {'version': 1, 'checks': [{
        'id': 'tests', 'catalog': {'script': 'test', 'script_text': command,
            'flags': ['--test', '--experimental-strip-types'], 'globs': list(files)},
        'timeout_seconds': 60, 'output_limit_bytes': 1048576}]})
    current = fixture.commit('independent credit probe setup')
    intake = {'origins': [{'id': file, 'kind': 'artifact', 'path': file, 'revision': pin, 'line': 1} for file in files]}
    spec = {'verification': 'verify.json', 'suite_targets': [], **tables}
    environment = tool.child_environment(tool.environment_declaration(None))[0]
    register = tool.hold_register(fixture.reader, current, tables['holds']['register'],
                                 tool.holds_table(fixture.reader, current, tables['holds']), list(files),
                                 environment, pinned_toolchain())
    with contextlib.ExitStack() as stack:
        context = tool.target_context(fixture.reader, current, spec, stack, pinned_toolchain())
        evaluations, _ = tool.preserved_census(fixture.reader, current, spec, intake, context, register)
    members = tool.preserved_table(evaluations)
    victims = [row for row in members if row['title'] == 'victim']
    assert len(victims) == len(CASES), members
    assert all(row['status'] == 'preserved' for row in victims), victims
    assert all(f"{row['file']}:{row['current'][0]}:{row['current'][1]}" not in register for row in victims)
    result['preservation'] = {'register': register, 'members': members, 'evaluations': evaluations,
                              'false_preserved_victims': len(victims),
                              'floor_note': 'Repository fixture A10 stub, order_model_holds=false; no production floor certification claimed.'}
    Path(sys.argv[2]).write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'runtime_cases_passed': len(CASES), 'false_preserved_victims': len(victims),
                      'statuses': [[row['file'], row['title'], row['status']] for row in members]}, indent=2))
finally:
    fixture.doCleanups()
