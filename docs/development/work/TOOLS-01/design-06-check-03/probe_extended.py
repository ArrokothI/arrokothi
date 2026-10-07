#!/usr/bin/env python3
"""Independent design-check probes. Parse generated inputs; never execute this matrix.
Usage: PATH=<Node 26.10.0 bin>:$PATH python3 -B probe_extended.py <prototype-clone> <output.json>
Exit 0 means evidence collected, not approval. No prototype source is modified.
"""
import itertools
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(ROOT / 'tests/tooling'))
from test_venv_detector import DetectorTests
from test_target_tools import pinned_toolchain
from test_packet_tools import tool

assert subprocess.check_output(['node', '--version'], text=True).strip() == 'v26.10.0'
HEAD = "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\n"
WRAPPERS = {'bare': '{}', 'paren': '({})', 'as': '{} as any', 'satisfies': '{} satisfies object',
            'nonnull': '{}!', 'angle': '<any>{}'}
POSITIONS = {
    'argument': 'consume(@);', 'receiver': '@@.method();',
    'storage': 'const box = {value: @};', 'return': 'function give() { return @; } give();',
    'arrow-return': 'const give = () => @; give();', 'alias': 'const alias = @; consume(alias);',
    'spread-array': 'const box = [...@@];', 'spread-object': 'const box = {...@@};',
    'default-parameter': 'function give(p = @) { return p; } give();',
    'template': 'const text = `${@}`;', 'optional-receiver': '@@?.method();',
    'optional-call': 'consume?.(@);', 'comma': 'const box = (0, @);',
    'conditional-yes': 'const box = flag ? @ : plain;', 'conditional-no': 'const box = flag ? plain : @;',
    'and': 'const box = flag && @@;', 'or': 'const box = flag || @@;', 'nullish': 'const box = flag ?? @@;',
}
cases = {}
for value_name, value in [('intrinsic', 'Object.prototype'), ('local', 'plain')]:
    for (w, wrapper), (p, position) in itertools.product(WRAPPERS.items(), POSITIONS.items()):
        expression = wrapper.replace('{}', value)
        member = expression if w in ('bare', 'paren', 'nonnull') else '(' + expression + ')'
        statement = position.replace('@@', member).replace('@', expression)
        cases[f'matrix-{value_name}-{p}-{w}'] = {
            'text': HEAD + "function consume(p) {}\n" +
                    "test('member', () => { const plain = {}; const flag = true; " + statement + ' });\n',
            'expected_match': value_name == 'intrinsic', 'category': 'matrix', 'wrapper': w, 'position': p}

def single(name, code, match=True, category='identity'):
    cases[name] = {'text': HEAD + code + '\n', 'expected_match': match, 'category': category}

for name, prefix, expr in [
    ('local', 'function keys(p) { p.x = 1; }', 'keys'),
    ('import', "import { keys } from './helper.ts';", 'keys'),
    ('namespace', "import * as Obj from './helper.ts';", 'Obj.keys'),
    ('member', 'const helper = {keys(p) { p.x = 1; }};', 'helper.keys'),
    ('shadow-param', 'function run(Object) { Object.keys(p); }', 'run'),
    ('shadow-local', 'const Object = {keys(p) { p.x = 1; }};', 'Object.keys'),
    ('shadow-import', "import { Object } from './helper.ts';", 'Object.keys'),
    ('destructured-local', 'const { Object } = {Object: {keys(p) { p.x = 1; }}};', 'Object.keys'),
    ('destructured-global', 'const { Object: Obj } = globalThis;', 'Obj.keys'),
    ('destructured-global-alias', 'const { JSON: J } = global;', 'J.stringify'),
]:
    single('identity-' + name, prefix + "\ntest('member', () => { " + expr + '(Object.prototype); });')

single('identity-with', "test('member', () => { with ({Object: {keys(p) { p.x = 1; }}}) { Object.keys(Array.prototype); } });")
single('identity-global-alias', "const g = global; test('member', () => { Object.keys(Object.prototype); });")
single('identity-globalthis-alias', "const g = globalThis; test('member', () => { Object.keys(Object.prototype); });")
single('identity-getter', "Object.defineProperty(globalThis, 'Object', {get() { return {keys(p) {p.x=1;}}; }}); test('member', () => { Object.keys(Array.prototype); });")
single('identity-defineproperty', "Object.defineProperty(globalThis, 'JSON', {value: {stringify(p) {p.x=1;}}}); test('member', () => { JSON.stringify(Object.prototype); });")

siblings = {
    'direct-root': 'Object = fake;', 'direct-member': 'Object.keys = fake;',
    'global-root': 'globalThis.Object = fake;', 'global-member': 'globalThis.Object.keys = fake;',
    'computed-literal': "globalThis['Object'] = fake;", 'computed-dynamic': "const key = 'Object'; globalThis[key] = fake;",
    'global-alias': 'const g = global;', 'globalthis-alias': 'const g = globalThis;',
    'destructured-global': 'const {Object: obj} = globalThis;',
    'destructure-root': '({Object} = {Object: fake});',
    'destructure-member': '({method: Object.keys} = {method: fake});',
    'array-destructure-member': '[Object.keys] = [fake];',
    'destructure-default': '({method: Object.keys = fake} = {});',
    'getter': "Object.defineProperty(globalThis, 'Object', {get() {return fake;}});",
    'defineproperty': "Object.defineProperty(globalThis, 'Object', {value: fake});",
    'computed-unrelated': "globalThis['unrelated'] = 0;",
    'global-destructure-member': '({method: global.Object.keys} = {method: fake});',
}
for name, statement in siblings.items():
    single('sibling-' + name, "const fake = (p) => {p.x=1; return [];};\n" +
           "test('poison', () => { " + statement + " });\n" +
           "test('victim', () => { Object.keys(Object.prototype); });", category='sibling')
    cases['sibling-' + name]['expected_leaf'] = 'victim'

for name, statement, expect in [
    ('keys', 'Object.keys(Object.prototype);', False),
    ('getnames', 'Object.getOwnPropertyNames(Object.prototype);', False),
    ('ownkeys', 'Reflect.ownKeys(Object.prototype);', False),
    ('isfrozen', 'Object.isFrozen(Object.prototype);', False),
    ('hasown', "Object.hasOwn(Object.prototype, 'x');", False),
    ('hasown-key', 'Object.hasOwn({}, Object.prototype);', False),
    ('isarray', 'Array.isArray(Object.prototype);', False),
    ('stringify-first', 'JSON.stringify(Object.prototype);', False),
    ('stringify-replacer', 'JSON.stringify({}, Object.prototype);', True),
    ('stringify-space', 'JSON.stringify({}, null, Object.prototype);', True),
    ('resolve-arg', 'Promise.resolve(Object.prototype);', True),
    ('reject-arg', 'Promise.reject(Object.prototype);', True),
    ('all-arg', 'Promise.all(Object.prototype);', True),
    ('entries', 'Object.entries(Object.prototype);', True),
    ('values', 'Object.values(Object.prototype);', True),
    ('fromentries', 'Object.fromEntries(Object.prototype);', True),
    ('create', 'Object.create(Object.prototype);', True),
    ('arrayfrom', 'Array.from(Object.prototype);', True),
    ('array', 'Array(Object.prototype);', True),
    ('regexp', 'RegExp(Object.prototype);', True),
    ('assert', 'assert.equal(Object.prototype, Object.prototype);', True),
    ('compare', 'const equal = Object.prototype === Object.prototype;', True),
    ('typeof', 'const kind = typeof Object;', True),
    ('optional-listed-call', 'Object.keys?.(Object.prototype);', False),
    ('optional-listed-receiver', 'Object?.keys(Object.prototype);', False),
    ('constant', 'consume(Number.NaN);', False),
]:
    single('table-' + name, 'function consume(p) {}\ntest(\'member\', () => { ' + statement + ' });', expect, 'table')

for name, statement in {
    'stringify-callback': "JSON.stringify(Object.prototype, function(k, v) { v.__check03 = 42; delete v.__check03; return v; });",
    'stringify-callback-return': "const box = []; JSON.stringify(Object.prototype, function(k, v) {box.push(v); return v;}); box[0].__check03 = 42; delete box[0].__check03;",
    'hasown-key-hook': "const key = {toString() {this.changed = true; return 'x';}}; Object.hasOwn(Object.prototype, key);",
    'regexp-existing': 'const r = /x/; const again = RegExp(r); again.lastIndex = 4;',
}.items():
    # Only the two replacer cases escape an intrinsic. The other two are row-justification
    # observations (ordinary input mutation / non-fresh result), not false-credit allegations.
    single('semantics-' + name, "test('member', () => { " + statement + ' });',
           name.startswith('stringify-'), 'semantics')

table_text = (ROOT / 'tests/tooling/source-facts.mjs').read_text().split('const SAFE_CALLS = new Map([', 1)[1].split(']);', 1)[0]
rows = re.findall(r"\['([^']+)', ROW\((.*?)\)\]", table_text)
assert len(rows) >= 45
for path, admission in rows:
    admitted = '*' if admission == "'*'" else json.loads(admission or '[]')
    for index in range(3):
        arguments = ['null'] * (index + 1)
        arguments[index] = 'Object.prototype'
        statement = path + '(' + ', '.join(arguments) + ');'
        safe = admitted == '*' or index in admitted
        single(f'admission-{path.replace(" ", "-")}-{index}', "test('member', () => { " + statement + ' });', not safe, 'admission')
    for global_name in ('globalThis', 'global'):
        # Receiver/callee identity must fail for every listed row, not just Object.keys.
        name = f'all-roots-alias-{global_name}-{path.replace(" ", "-")}'
        single(name, "test('poison', () => { const alias = " + global_name + "; });\n" +
               "test('victim', () => { " + path + '(null); });', True, 'all-roots')
        cases[name]['expected_leaf'] = 'victim'

single('sibling-computed-other-root', "test('poison', () => { globalThis['Object'] = {}; });\n" +
       "test('victim', () => { JSON.stringify(Array.prototype); });", True, 'sibling')
cases['sibling-computed-other-root']['expected_leaf'] = 'victim'
single('sibling-getter-method', "test('poison', () => { globalThis.__defineGetter__('JSON', () => ({stringify(p) {p.x = 1;}})); });\n" +
       "test('victim', () => { JSON.stringify(Object.prototype); });", True, 'sibling')
cases['sibling-getter-method']['expected_leaf'] = 'victim'

fixture = DetectorTests(methodName='setUp')
fixture.setUp()
try:
    files = {'tests/' + name + '.test.ts': row['text'] for name, row in cases.items()}
    files['tests/helper.ts'] = 'export function keys(p) { p.x = 1; }\nexport const Object = {keys};\n'
    revision, matches = fixture.matches(files)
    environment = tool.child_environment(tool.environment_declaration(None))[0]
    requests = [{'op': op, 'path': 'tests/' + name + '.test.ts', 'text': row['text']}
                for name, row in cases.items() for op in ('survey', 'helpers')]
    facts = tool.source_facts(fixture.reader, revision, requests, environment, pinned_toolchain())
    for index, (name, row) in enumerate(cases.items()):
        path = 'tests/' + name + '.test.ts'
        row['survey'], helper = facts[index * 2:index * 2 + 2]
        row['parse_diagnostics'] = helper['diagnostics']
        leaf = row.get('expected_leaf', 'member')
        registration, = [r for r in helper['registrations'] if r['kind'] == 'leaf' and r['title'].get('value') == leaf]
        key = f"{path}:{registration['location']['line']}:{registration['location']['column']}"
        row['key'] = key
        row['match'] = matches.get(key)
        row['matched'] = bool(row['match'] and 'V-ENV' in row['match']['claims'])
        row['as_expected'] = row['matched'] == row['expected_match']
    summary = {category: {'count': sum(r['category'] == category for r in cases.values()),
                         'unexpected': [n for n, r in cases.items() if r['category'] == category and not r['as_expected']]}
               for category in sorted({r['category'] for r in cases.values()})}
    result = {'node': subprocess.check_output(['node', '--version'], text=True).strip(), 'summary': summary, 'cases': cases}
    Path(sys.argv[2]).write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(summary, indent=2))
finally:
    fixture.doCleanups()
