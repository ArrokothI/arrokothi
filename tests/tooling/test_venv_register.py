"""CONT-05: property installation recipes register ambient tests without executing their writes."""
from test_packet_tools import RepositoryFixture, tool
from test_target_tools import ROOT, pinned_toolchain


class VenvRegisterTests(RepositoryFixture):
    def test_intrinsic_writes_and_imported_alias_helpers_enter_the_hold_register(self):
        self.document('package.json', {'type': 'module'})
        self.write('tests/tooling/source-facts.mjs', (ROOT / 'tests/tooling/source-facts.mjs').read_bytes().decode())
        self.write('tests/alias.mjs', '''export function install() {
  const holder = Object.getPrototypeOf([][Symbol.iterator]());
  Object.defineProperty(holder, 'next', {value: () => ({done: true})});
}
''')
        self.write('tests/install.test.mjs', '''import { test } from 'node:test';
import { install } from './alias.mjs';
test('prototype slot', () => { Object.defineProperty(Array.prototype, '0', {value: 1}); });
test('static intrinsic', () => { Object.defineProperties(JSON, {stringify: {value: () => ''}}); });
test('assignment', () => { String.prototype.charCodeAt = () => 0; });
test('symbol assignment', () => { Array.prototype[Symbol.iterator] = () => []; });
test('static assignment', () => { Object.keys = () => []; });
test('alias helper', () => { install(); });
test('child source', () => { const source = `Object.defineProperty(Array.prototype, "0", {get() {return 0;}})`; });
test('own input control', () => { const input = {}; Object.defineProperty(input, 'x', {value: 1}); });
''')
        revision = self.commit('property installation recipes')
        env = tool.child_environment(tool.environment_declaration(None))[0]
        matches = tool.register_matches(self.reader, revision, ['tests/install.test.mjs'], tool.REGISTER_MINIMUM,
                                        env, pinned_toolchain())
        self.assertEqual({row['key'] for row in matches}, {f'tests/install.test.mjs:{line}:1' for line in range(3, 10)})
        self.assertTrue(all('V-ENV' in row['claims'] for row in matches))

    def test_old_recipe_cannot_omit_the_known_restoration_target_family(self):
        register = {'recipes': {key: dict(value) for key, value in tool.REGISTER_MINIMUM.items()}}
        register['recipes']['V-ENV']['body'] = r'\bvm\b|createContext|runInContext|frozen-intrinsics|globalThis'
        with self.assertRaisesRegex(tool.CheckError, 'register recipe narrows the minimum body: V-ENV'):
            tool.register_recipes(set(tool.REGISTER_MINIMUM), register)
