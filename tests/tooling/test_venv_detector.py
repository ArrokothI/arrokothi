"""Design 06 R1-01 and §2. The V-ENV detector reads what a leaf runs in its process (registration,
helpers, module-scope variables, re-exports, hooks, load-time code); every match is held by owner
choice 08 rule 1 and earns no credit. Uncertain forms are matches. Each held or superseded entry names
its decision or its reading; category entries keep their decisions."""
import json

from test_packet_tools import RepositoryFixture, tool
from test_target_tools import ROOT, pinned_toolchain

HEAD = "import { test, beforeEach } from 'node:test';\nimport assert from 'node:assert/strict';\n"
# Positive variants: review 01's probe family, the design's adjacent forms and design-06-check change 1.
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
}
# Negative controls. Aliases are scope-blind (design 06), so they use names no positive variant binds.
NEGATIVE = {
    'local object write': "const o: Record<string, unknown> = {}; o.x = 1;",
    'Object.keys result': "const k = Object.keys(Object); k.push('x');",
    'local descriptor': "const own = Object.getOwnPropertyDescriptor({ a: 1 }, 'a')!; own.value = 2;",
    'Number.NaN argument': "local(Number.NaN);",
    'read-only assertion': "assert.equal(Object.getPrototypeOf([]), Array.prototype);",
    'type annotation': "const f: Function | undefined = undefined; assert.equal(f, undefined);",
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
        self.assertEqual({title for title, found_kinds in kinds.items() if 'unclassified' in found_kinds},
                         {'descriptor result', 'descriptor helper return', 'destructured descriptor', 'Reflect.get result'})
        self.assertIn('unresolved', kinds['unresolvable import'])
        self.assertIn('escape', kinds['unreadable helper called with Object'])
        self.assertIn('child-process', kinds['child process'])

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
