"""Design 06 R1-01 and §2, revision 5 (owner choice 10 §2's coarse rule). The V-ENV detector reads what
a leaf runs in its process (registration, helpers, module-scope variables, re-exports, hooks, load-time
code); every reference to an intrinsic value there is a match, held by owner choice 08 rule 1, and no
table exempts any position. Each held or superseded entry names its decision or its reading; category
entries keep their decisions."""
import contextlib
import itertools
import json

from test_packet_tools import RepositoryFixture, classified, tool
from test_target_tools import ROOT, pinned_toolchain

HEAD = "import { test, beforeEach } from 'node:test';\nimport assert from 'node:assert/strict';\n"
# Positive variants: review 01's probe family, the design's adjacent forms, design-06-check change 1, and
# the former controls that reference an intrinsic, which the coarse rule matches too.
POSITIVE = {
    'direct': "(Object.prototype as any).toJSON = () => 42;",
    'cast': "(Object.prototype as Record<string, unknown>).toJSON = () => 42;",
    'alias': "const p = Object.prototype as any; p.toJSON = () => 42;",
    'destructured alias': "const { prototype } = Object as any; prototype.toJSON = () => 42;",
    'prototype chain': "(Object.getPrototypeOf(Object.getPrototypeOf([])) as any).toJSON = 1;",
    'delete': "delete (Array.prototype as any).at;",
    'update': "(Number.prototype as any).count++;",
    'writer call': "Reflect.set(Array.prototype, 'x', 1);",
    'passed to a helper': "mutate(Array.prototype);",
    'imported helper': "install();",
    'imported helper through a re-export': "installAgain();",
    'namespace helper': "helpers.install();",
    'generated source': "new Function('Object.prototype.toJSON = () => 1')();",
    'function alias': "const F = Function; new F('return 1')();",
    'indirect eval': "(0, eval)('1');",
    'data import': "await import('data:text/javascript,globalThis.x=1');",
    'child process': "spawnSync(process.execPath, ['-e', 'void 0']);",
    'worker eval': "void new Worker('void 0', { eval: true });",
    'descriptor result': "const d = Object.getOwnPropertyDescriptor(Object, 'prototype')!; d.value.toJSON = () => 42;",
    'descriptor helper return': "proto().toJSON = () => 42;",
    'destructured descriptor': "const { value } = Object.getOwnPropertyDescriptor(Object, 'prototype')!; value.toJSON = 1;",
    'Reflect.get result': "const r = Reflect.get(Object, 'prototype'); r.toJSON = 1;",
    'unreadable helper called with Object': "mystery(Object);",
    'unresolvable import': "gone();",
    'Object.keys result': "const k = Object.keys(Object); k.push('x');",
    'local descriptor': "const own = Object.getOwnPropertyDescriptor({ a: 1 }, 'a')!; own.value = 2;",
    'Number.NaN argument': "local(Number.NaN);",
    'read-only assertion': "assert.equal(Object.getPrototypeOf([]), Array.prototype);",
    'fresh Map': "const m = new Map(); m.set('a', 1);",
    'extends a built-in': "class Failure extends Error {} void new Failure('x');",
}
# Controls: no reference to an intrinsic value. Aliases are scope-blind (design 06), so they use names no
# positive variant binds.
NEGATIVE = {
    'local object write': "const o: Record<string, unknown> = {}; o.x = 1;",
    'type annotation': "const f: Function | undefined = undefined; assert.equal(f, undefined);",
    'built-in names as keys and text': "const n = { Map: 1, Object: 'Object' }; n.Map = 2;",
    'local class': "class Base {} class Sub extends Base {} void new Sub();",
}
SUBJECT = HEAD + """import { spawnSync } from 'node:child_process';
import { Worker } from 'node:worker_threads';
import { mystery } from 'external-package';
import { install, installAgain } from './helper.ts';
import * as helpers from './helper.ts';
import { gone } from './missing.ts';
function mutate(target: object) { return target; }
function local(amount: number) { return amount; }
function proto() { return Object.getOwnPropertyDescriptor(Object, 'prototype')!.value; }
function constructor() { return 1; }
""" + ''.join(f"test({json.dumps(title)}, async () => {{ {code} }});\n" for title, code in {**POSITIVE, **NEGATIVE}.items())
HELPER = """export function install() { const holder = Object.prototype as any; holder.toJSON = () => 1; }
export { installAgain } from './again.ts';
"""
AGAIN = "export function installAgain() { Object.defineProperty(Array.prototype, 'x', { value: 1 }); }\n"

# Owner choice 10's corpus, kept as maintained regression cases. Review 03's 19 probe cases
# (review-03/probe_detector.py), the wrapper x position cross-product and the same-name and rebinding
# cases (design-06-r4/probe_safe_positions.py): under the coarse rule every leaf that references an
# intrinsic matches, the former safe-position controls included.
MUTATE = "function mutate(p) { p.toJSON = () => 42; }\n"
REVIEW_03 = {
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
    'descriptor-return': ("function proto() { return Object.getOwnPropertyDescriptor(Object, 'prototype').value; }\n",
                          'proto().toJSON = () => 42;'),
    'reflect-get': ('', "const p = Reflect.get(Object, 'prototype'); p.toJSON = () => 42;"),
    'entries-result': ('', "const p = Object.entries(Object.getOwnPropertyDescriptors(Object))[0]; p.extra = 1;"),
    'values-result': ('', "const p = Object.values(Object.getOwnPropertyDescriptors(Object)); p.extra = 1;"),
    'local-control': ('', 'const p = {}; p.x = 1;'),
    'keys-control': ('', "const p = Object.keys(Object); p.push('x');"),
}
WRAPPERS = {'bare': '{}', 'paren': '({})', 'as': '{} as any', 'satisfies': '{} satisfies object', 'nonnull': '{}!', 'angle': '<any>{}'}
POSITIONS = {
    'argument': (MUTATE, 'mutate(@);'),
    'receiver': ('', "@@.__defineGetter__('x', () => 42);"),
    'receiver-listed': ('', 'const n = @@.hasOwnProperty("x");'),
    'storage-array': ('', 'const box = [@]; box[0].toJSON = () => 42;'),
    'storage-object': ('', 'const box = { p: @ }; box.p.toJSON = () => 42;'),
    'return': ('function proto() { return @; }\n', 'proto().toJSON = () => 42;'),
    'alias': ('', 'const p = @; p.toJSON = () => 42;'),
}
SAME_NAME = {
    'local-function': ('function keys(p) { p.toJSON = () => 42; }\n', 'keys(Object.prototype);'),
    'local-arrow': ('const stringify = (p) => { p.toJSON = () => 42; };\n', 'stringify(Object.prototype);'),
    'imported-function': ("import { keys } from './helper.ts';\n", 'keys(Object.prototype);'),
    'imported-namespace': ("import * as Obj from './helper.ts';\n", 'Obj.keys(Object.prototype);'),
    'member-function': ('const helper = { keys(p) { p.toJSON = () => 42; } };\n', 'helper.keys(Object.prototype);'),
    'shadowed-global-param': ('function run(JSON) { JSON.stringify(Object.prototype); }\n', 'run({ stringify(p) { p.toJSON = () => 42; } });'),
    'shadowed-global-local': ('', 'const Array = { isArray(p) { p.toJSON = () => 42; } }; Array.isArray(Object.prototype);'),
}
REBINDING = {
    'rebound-member': "Object.keys = (p) => { p.toJSON = () => 42; return []; };\ntest('other', () => { Object.keys(Object.prototype); });",
    'rebound-global-member': "test('other', () => { JSON.stringify(Object.prototype); });\ntest('rebind', () => { globalThis.JSON = { stringify() {} }; });",
    'rebound-global-computed': "const k = 'JSON';\ntest('other', () => { JSON.stringify(Object.prototype); });\ntest('rebind', () => { globalThis[k] = { stringify() {} }; });",
    'rebound-global-escape': "function swap(g) { g.JSON = { stringify() {} }; }\ntest('other', () => { JSON.stringify(Object.prototype); });\ntest('rebind', () => { swap(globalThis); });",
    'rebound-elsewhere': "test('other', () => { Object.keys(Object.prototype); });\ntest('rebind', () => { globalThis.Object = { keys() {} }; });",
}


def corpus_files():
    """One test file per case; the value of each is whether its leaves must match."""
    files = {}
    test = lambda body: f"test('member', () => {{ {body} }});\n"
    for name, (helper, body) in REVIEW_03.items():
        files[f'tests/r03-{name}.test.ts'] = (HEAD + helper + test(body), name != 'local-control')
    for (wrapper, form), (position, (helper, body)) in itertools.product(WRAPPERS.items(), POSITIONS.items()):
        value = form.replace('{}', 'Object.prototype')
        member = value if wrapper in ('bare', 'paren') else f'({value})'
        fill = lambda text: text.replace('@@', member).replace('@', value)
        files[f'tests/x-{position}-{wrapper}.test.ts'] = (HEAD + fill(helper) + test(fill(body)), True)
    for name, (helper, body) in SAME_NAME.items():
        files[f'tests/name-{name}.test.ts'] = (HEAD + helper + test(body), True)
    for name, body in REBINDING.items():
        files[f'tests/name-{name}.test.ts'] = (HEAD + body + '\n', True)
    return files


# Design check 03's five false-preserved leaves under revision 4's prototype
# (design-06-check-03/probe_credit.py): each victim and poison leaf is held, never preserved.
CHECK_03 = {}
for _name, _assignment in {
    'destructure-member': '({replacement: Object.keys} = {replacement: replacement});',
    'array-destructure-member': '[Object.keys] = [replacement];',
    'global-destructure-member': '({replacement: global.Object.keys} = {replacement: replacement});',
}.items():
    CHECK_03[_name] = """let touched = false;
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
""".replace('ASSIGNMENT', _assignment)
CHECK_03['json-replacer'] = """test('victim', () => {
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
CHECK_03['global-getter'] = """let touched = false;
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


class DetectorTests(RepositoryFixture):
    def matches(self, files):
        self.document('package.json', {'type': 'module'})
        self.write('tests/tooling/source-facts.mjs', (ROOT / 'tests/tooling/source-facts.mjs').read_text())
        for path, text in files.items():
            self.write(path, text)
        rev = self.commit('detector subject')
        environment = tool.child_environment(tool.environment_declaration(None))[0]
        rows = tool.register_matches(self.reader, rev, [path for path in files if path.endswith('.test.ts')],
                                     tool.REGISTER_MINIMUM, environment, pinned_toolchain())
        return rev, {row['key']: row for row in rows}

    def keyed(self, rows, path, text):
        lines = {line: index for index, line in enumerate(text.splitlines(), 1)}
        return {title: rows.get(f'{path}:{lines[next(line for line in lines if line.startswith(f"test({json.dumps(title)},"))]}:1')
                for title in {**POSITIVE, **NEGATIVE}}

    def test_every_variant_matches_and_every_control_does_not(self):
        _, rows = self.matches({'tests/subject.test.ts': SUBJECT, 'tests/helper.ts': HELPER, 'tests/again.ts': AGAIN})
        found = self.keyed(rows, 'tests/subject.test.ts', SUBJECT)
        unmatched = [title for title in POSITIVE if found[title] is None or 'V-ENV' not in found[title]['claims']]
        self.assertEqual(unmatched, [])
        self.assertEqual({title: found[title] for title in NEGATIVE}, dict.fromkeys(NEGATIVE))
        kinds = {title: {site.split('@')[0] for site in found[title]['detector']} for title in POSITIVE}
        self.assertEqual(set().union(*kinds.values()), {'intrinsic', 'generated', 'child-process', 'unresolved'})
        self.assertEqual(kinds['unresolvable import'], {'unresolved'})
        self.assertIn('child-process', kinds['child process'])
        self.assertIn('generated', kinds['indirect eval'])
        self.assertEqual(kinds['Object.keys result'], {'intrinsic'})

    def test_owner_choice_10_corpus_matches_every_intrinsic_reference(self):
        files = corpus_files()
        _, rows = self.matches({**{path: text for path, (text, _) in files.items()},
                                'tests/helper.ts': "export function keys(p: any) { p.toJSON = () => 42; }\n"})
        matched = {path: any(key.startswith(path + ':') and 'V-ENV' in row['claims'] for key, row in rows.items())
                   for path in files}
        self.assertEqual(len(files), 19 + 42 + 12)
        self.assertEqual({path for path, (_, expected) in files.items() if matched[path] != expected}, set())
        leaves = {key for key in rows if key.startswith('tests/name-rebound-')}
        self.assertEqual(len(leaves), 9, 'every leaf of a rebinding case, the rebinding leaf included, matches')

    def test_design_check_03_false_preserved_leaves_earn_no_credit(self):
        files = {f'tests/{name}.test.ts': HEAD + text for name, text in CHECK_03.items()}
        pin, matches = self.matches(files)
        tables = self.format_two_tables()
        tables['holds']['register']['entries'] = [classified(row) for row in matches.values()]
        for path in ('catalog-reporter.mjs', 'read-trace.mjs', 'reach-coverage.mjs'):
            self.write('tests/tooling/' + path, (ROOT / 'tests/tooling' / path).read_text())
        command = 'node --test --experimental-strip-types ' + ' '.join(files)
        self.document('package.json', {'type': 'module', 'scripts': {'test': command}})
        self.document('verify.json', {'version': 1, 'checks': [{
            'id': 'tests', 'catalog': {'script': 'test', 'script_text': command,
                                       'flags': ['--test', '--experimental-strip-types'], 'globs': list(files)},
            'timeout_seconds': 60, 'output_limit_bytes': 1048576}]})
        current = self.commit('credit subject')
        intake = {'origins': [{'id': path, 'kind': 'artifact', 'path': path, 'revision': pin, 'line': 1} for path in files]}
        spec = {'verification': 'verify.json', 'suite_targets': [], **tables}
        environment = tool.child_environment(tool.environment_declaration(None))[0]
        register = tool.hold_register(self.reader, current, tables['holds']['register'],
                                      tool.holds_table(self.reader, current, tables['holds']), list(files),
                                      environment, pinned_toolchain())
        with contextlib.ExitStack() as stack:
            context = tool.target_context(self.reader, current, spec, stack, pinned_toolchain())
            evaluations, _ = tool.preserved_census(self.reader, current, spec, intake, context, register)
        members = tool.preserved_table(evaluations)
        self.assertEqual(sorted((row['file'], row['title'], row['status']) for row in members),
                         sorted([(path, 'poison', 'held') for path in files if 'replacer' not in path] +
                                [(path, 'victim', 'held') for path in files]))
        self.assertTrue(all(register[f"{row['file']}:{row['current'][0]}:{row['current'][1]}"]['claim'] == 'V-ENV'
                            for row in members))

    def test_hooks_suite_bodies_and_load_time_code_hold_the_leaves_they_run_around(self):
        cases = {
            'hook': HEAD + "beforeEach(() => { (Object.prototype as any).x = 1; });\ntest('a', () => {});\n",
            'suite body': HEAD + "import { describe } from 'node:test';\n"
                                 "describe('s', () => { (Array.prototype as any).x = 1; test('a', () => {}); });\n",
            'load time': HEAD + "const HOLDERS = [Object.prototype];\ntest('a', () => {});\n",
            'load-time helper call': HEAD + "import { install } from './helper.ts';\ninstall();\ntest('a', () => {});\n",
            'imported load time': HEAD + "import './side.ts';\ntest('a', () => {});\n",
            'parse error': HEAD + "test('a', () => {});\nconst = ;\n",
        }
        files = {f'tests/{name.replace(" ", "-")}.test.ts': text for name, text in cases.items()}
        files.update({'tests/helper.ts': HELPER, 'tests/again.ts': AGAIN, 'tests/side.ts': "(globalThis as any).flag = 1;\n"})
        _, rows = self.matches(files)
        held = {path for path in files if path.endswith('.test.ts') and
                any(key.startswith(path + ':') and 'V-ENV' in row['claims'] for key, row in rows.items())}
        self.assertEqual(held, {path for path in files if path.endswith('.test.ts')})

    def test_a_hook_in_another_suite_does_not_hold_a_leaf(self):
        text = HEAD + ("import { describe } from 'node:test';\n"
                       "describe('one', () => { beforeEach(() => { (Object.prototype as any).x = 1; }); test('a', () => {}); });\n"
                       "describe('two', () => { test('b', () => {}); });\n")
        _, rows = self.matches({'tests/suites.test.ts': text})
        self.assertEqual([key.rsplit(':', 2)[1] for key in rows], ['4'])

    def test_a_case_run_set_is_its_named_files_and_their_closures(self):
        self.document('package.json', {'type': 'module'})
        self.write('tests/tooling/source-facts.mjs', (ROOT / 'tests/tooling/source-facts.mjs').read_text())
        self.write('tests/tooling/probe.mjs', "import { run } from './runner.mjs';\nrun();\n")
        self.write('tests/tooling/runner.mjs', "import { execFileSync } from 'node:child_process';\n"
                                               "export function run() { execFileSync('node', ['x.mjs']); }\n")
        self.write('tests/tooling/plain.mjs', "export const value = 1;\n")
        self.write('tests/tooling/broken.mjs', "import { gone } from './gone.mjs';\nexport const value = gone;\n")
        rev = self.commit('case subjects')
        cases = [{'id': name, 'assertion': 'a', 'files': [], 'input': {}, 'argv': ['node', f'tests/tooling/{name}.mjs']}
                 for name in ('probe', 'plain', 'broken')]
        rows = tool.register_case_matches(self.reader, rev, cases, tool.REGISTER_MINIMUM, 'registry.json',
                                          toolchain=pinned_toolchain())
        self.assertEqual({row['key']: row['claims'] for row in rows}, {'case:probe': ['V-ENV'], 'case:broken': ['V-ENV']})


class StructureTests(RepositoryFixture):
    """Design 06 §2: owner choice 08's structural check over register entries."""

    def setUp(self):
        super().setUp()
        self.document('package.json', {'type': 'module'})
        self.write('tests/tooling/source-facts.mjs', (ROOT / 'tests/tooling/source-facts.mjs').read_text())
        self.write('tests/p.test.mjs', "import { test } from 'node:test';\n"
                                       "test('venv', () => { Object.prototype.x = 1; });\n"
                                       "test('proxy', () => new Proxy({}, {}));\n"
                                       "test('both', () => new Proxy(Object.prototype, {}));\n")
        self.decisions = {'V-D1': ['decision.md', *tool.CATEGORY_DECISIONS['V-D1']],
                          'Proxy': ['decision.md', *tool.CATEGORY_DECISIONS['Proxy']],
                          're-prototyped-built-in': ['decision.md', *tool.CATEGORY_DECISIONS['re-prototyped-built-in']],
                          'V-ENV': ['decision.md', tool.VENV_RECORD]}
        for path in {path for paths in self.decisions.values() for path in paths}:
            self.write(path, 'Fixture copy of a governing decision.\n')
        self.rev = self.commit('structure subject')
        self.entries = {
            'venv': {'key': 'tests/p.test.mjs:2:1', 'matched': ['V-ENV'], 'classification': 'held', 'claim': 'V-ENV',
                     'decision': tool.VENV_RECORD, 'reason': 'Rule 1; earlier reading kept as a note for BINDING-01.'},
            'proxy': {'key': 'tests/p.test.mjs:3:1', 'matched': ['Proxy'], 'classification': 'held', 'claim': 'Proxy',
                      'decision': tool.CATEGORY_DECISIONS['Proxy'][0], 'reason': 'Category entry.'},
            'both': {'key': 'tests/p.test.mjs:4:1', 'matched': ['Proxy', 'V-ENV'], 'classification': 'superseded',
                     'claim': 'Proxy', 'decision': tool.CATEGORY_DECISIONS['Proxy'][0], 'reason': 'Category keeps its owner.'},
        }

    def hold(self):
        claims = {claim: {'decisions': decisions} for claim, decisions in self.decisions.items()}
        environment = tool.child_environment(tool.environment_declaration(None))[0]
        return tool.hold_register(self.reader, self.rev, {'recipes': json.loads(json.dumps(tool.REGISTER_MINIMUM)),
                                                          'entries': list(self.entries.values())},
                                  claims, ['tests/p.test.mjs'], environment, pinned_toolchain())

    def check(self, fragment):
        error = None
        try:
            self.hold()
        except Exception as exc:
            error = exc
        self.assertIsInstance(error, tool.CheckError, f'expected declared refusal {fragment}, observed {error!r}')
        self.assertIn(fragment, str(error))

    def test_rule_1_and_category_entries_pass(self):
        self.assertEqual(set(self.hold()), {row['key'] for row in self.entries.values()})

    def test_a_v_env_match_left_not_held_is_refused(self):
        self.entries['venv'] = {'key': 'tests/p.test.mjs:2:1', 'matched': ['V-ENV'], 'classification': 'not_held',
                                'reason': 'Not value capture or its serializer window.'}
        self.check('a V-ENV match is held by owner choice 08 rule 1')

    def test_a_rule_1_entry_names_owner_choice_08(self):
        self.entries['venv']['decision'] = 'decision.md'
        self.check('a V-ENV match held under V-ENV names owner choice 08')
        self.entries['venv'].pop('decision')
        self.entries['venv']['reading'] = {'facts': 'Writes Object.prototype.x.', 'claim': 'V-ENV'}
        self.check('a V-ENV match held under V-ENV names owner choice 08')

    def test_owner_choice_08_names_only_v_env_matches(self):
        self.entries['proxy'].update(claim='V-ENV', decision=tool.VENV_RECORD)
        self.check('owner choice 08 holds V-ENV matches only')

    def test_an_entry_names_exactly_one_decision_or_reading(self):
        self.entries['proxy'].pop('decision')
        self.check('names exactly one of its decision or its reading')
        self.entries['proxy'].update(decision=tool.CATEGORY_DECISIONS['Proxy'][0], reading={'facts': 'x', 'claim': 'Proxy'})
        self.check('names exactly one of its decision or its reading')

    def test_a_decision_governs_its_claim(self):
        self.entries['proxy']['decision'] = tool.VENV_RECORD
        self.check("decision governs its claim")

    def test_a_reading_states_its_facts_and_claim(self):
        self.entries['proxy'].pop('decision')
        self.entries['proxy']['reading'] = {'facts': ' ', 'claim': 'Proxy'}
        self.check('a reading states its facts and the claim they bear on')

    def test_a_category_entry_names_its_existing_decision(self):
        self.entries['proxy']['decision'] = 'decision.md'
        self.check('a category entry names its existing decision')

    def test_a_not_held_entry_names_no_hold_decision(self):
        self.entries['proxy'].update(classification='not_held')
        self.entries['proxy'].pop('claim')
        self.check('a not_held entry names no hold decision')


class RepositoryRuleOneTests(RepositoryFixture):
    """The maintained register: review 01's four ambient toJSON leaves, review 02's brief items 1, 2 and 5,
    and the two former not_held entries are held under V-ENV by owner choice 08 rule 1; earlier readings
    stay in their reasons as notes for BINDING-01."""

    def test_known_leaves_are_rule_1_entries(self):
        manifest = json.loads((ROOT / 'tests/fixtures/packet-tools/adoption.json').read_text())
        entries = {row['key']: row for row in manifest['holds']['register']['entries']}
        keys = ['packages/kernel/tests/creation.test.ts:333:3', 'packages/kernel/tests/dispatch.test.ts:615:3',
                'packages/kernel/tests/values.test.ts:893:3', 'packages/kernel/tests/values.test.ts:910:3',
                'packages/kernel/tests/host-members.test.ts:166:3', 'packages/kernel/tests/dispatch.test.ts:1390:3',
                'packages/kernel/tests/values.test.ts:1728:3', 'packages/kernel/tests/values.test.ts:1498:3',
                'packages/kernel/tests/creation.test.ts:516:3', 'packages/kernel/tests/ingress.test.ts:459:3']
        self.assertEqual({key: (entries[key]['classification'], entries[key]['claim'], entries[key]['decision'])
                          for key in keys}, dict.fromkeys(keys, ('held', 'V-ENV', tool.VENV_RECORD)))
        self.assertIn('not value capture or its serializer window', entries['packages/kernel/tests/host-members.test.ts:166:3']['reason'])
        self.assertIn('Earlier reading, kept as a note for BINDING-01', entries['packages/kernel/tests/creation.test.ts:516:3']['reason'])
        venv = next(row for row in manifest['holds']['claims'] if row['id'] == 'V-ENV')
        self.assertIn(tool.VENV_RECORD, venv['decisions'])
