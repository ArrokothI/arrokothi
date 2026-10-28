"""TOOLS-02 design 03 and D03-CHK-01: released claims retain no active hold or inferred credit."""
import copy
from test_packet_tools import RepositoryFixture, tool
from test_target_tools import pinned_toolchain
from test_venv_detector import StructureTests
from test_transfer_limits import LimitTests


class ReleasedRegisterTests(StructureTests):
    check = StructureTests.check
    # Reuse the fixture, not its active-hold assertions.
    def setUp(self):
        StructureTests.setUp(self)
        self.claims = {key: {'id': key, 'owner': 'fixture', 'decisions': self.decisions[key],
                             'status': 'released', 'release': release, 'limits': limits,
                             **({'scope': 'core'} if key == 'V-ENV' else {})}
                       for key, (release, limits) in tool.CLAIM_RELEASES.items()}
        for claim in self.claims.values():
            self.write(claim['release'], 'Released fixture claim.\n')
        self.rev = self.commit('released claims')
        for row in self.entries.values():
            if row['classification'] == 'held':
                row.update(classification='unread', decision=self.claims[row['claim']]['release'])

    def hold(self):
        environment = tool.child_environment(tool.environment_declaration(None))[0]
        tool.holds_table(self.reader, self.rev, {'claims': list(self.claims.values())})
        return tool.hold_register(self.reader, self.rev,
            {'recipes': copy.deepcopy(tool.REGISTER_MINIMUM), 'entries': list(self.entries.values())},
            self.claims, ['tests/p.test.mjs'], environment, pinned_toolchain())

    def test_released_entries_are_unread_and_superseded(self):
        self.assertEqual([entry['classification'] for entry in self.hold().values()], ['unread', 'unread', 'superseded'])

    def test_released_claim_refuses_active_hold(self):
        self.entries['venv'].update(classification='held', decision=tool.VENV_RECORD)
        self.check('a released claim cannot retain a held entry')

    def test_unread_has_only_its_release_not_a_reading_or_limit(self):
        original = copy.deepcopy(self.entries['venv'])
        for change in ({'decision': tool.VENV_RECORD}, {'decision': tool.CLAIM_RELEASES['Proxy'][0]},
                       {'reading': {'claim': 'V-ENV', 'facts': 'read'}}, {'limit': 'L-01'}):
            self.entries['venv'] = dict(original, **change)
            self.check('an unread entry names its released claim and release only')

    def test_not_held_needs_reading_and_then_uses_normal_preservation(self):
        row = self.entries['venv']
        row.update(classification='not_held')
        row.pop('decision')
        self.check('a not_held match under a released claim needs a per-entry reading')
        row['reading'] = {'facts': 'This fixture asserts only its core result after initialization.', 'claim': 'V-ENV'}
        self.assertEqual(self.hold()[row['key']]['classification'], 'not_held')
        # A reading is not automatic preservation: ordinary P1-P reasons still refuse.
        evaluation = {'pin': ('tests/p.test.mjs', 'a'*40, 2, 1), 'origin': 'o', 'file': 'tests/p.test.mjs',
                      'title': 'venv', 'title_kind': 'literal', 'register': 'not_held', 'reasons': ['changed callback']}
        self.assertEqual(tool.preserved_table([evaluation])[0]['status'], 'refused')
        evaluation.update(register='unread', reasons=[])
        self.assertEqual(tool.preserved_table([evaluation])[0]['status'], 'unread')

    def test_unread_witness_requires_the_same_status_and_claim(self):
        row = {'kind': 'unread_witness', 'claim': 'V-ENV', 'members': ['m']}
        members = {'m': {'status': 'unread', 'file': 'tests/p.test.mjs', 'current': [2, 1]}}
        register = self.hold()
        tool.witness_records({'w': row}, members, self.claims, register)
        row['kind'] = 'held_witness'
        with self.assertRaisesRegex(tool.CheckError, 'another status'):
            tool.witness_records({'w': row}, members, self.claims, register)
        row.update(kind='unread_witness', claim='Proxy')
        with self.assertRaisesRegex(tool.CheckError, 'another claim'):
            tool.witness_records({'w': row}, members, self.claims, register)

    def test_executable_limit_is_not_admitted(self):
        self.entries['venv']['classification'] = 'limit'
        self.check('register entry needs a classification')

    def test_claim_status_is_required(self):
        self.claims['V-ENV'].pop('status')
        self.check('a claim names its held or released status')

    def test_release_path_and_limits_are_fixed(self):
        self.claims['V-ENV']['release'] = self.claims['Proxy']['release']
        self.check('a released claim names its fixed release and limits')

    def test_core_release_does_not_claim_wrapper_release(self):
        self.claims['V-ENV']['scope'] = 'wrapper'
        self.check('V-ENV release is scoped to the core')

class ReleasedLimitTests(LimitTests):
    setUp, limit, refuses = LimitTests.setUp, LimitTests.limit, LimitTests.refuses
    target = staticmethod(LimitTests.target)
    def test_both_routes_refuse_old_holds_unrelated_claims_and_releases(self):
        for route in ('listed', 'extra'):
            for change in ({'claim': 'Proxy'}, {'decision': tool.CLAIM_RELEASES['Proxy'][0]},
                           {'decision': tool.VENV_RECORD}, {'classification': 'held', 'decision': tool.VENV_RECORD}):
                with self.subTest(route=route, change=change):
                    self.setUp()
                    key = 'f.test.ts:5:3'
                    if route == 'listed':
                        self.members['m.listed'].update(status='unread', file='f.test.ts', current=[12, 3])
                        key = 'f.test.ts:12:3'
                        self.register[key] = {'classification': 'unread', 'claim': 'V-ENV', 'decision': tool.VENV_RELEASE}
                    self.register[key].update(change)
                    self.refuses('limit' if route == 'listed' else 'unread released-V-ENV leaf', self.limit)

    def test_released_claim_status_is_required_on_both_routes(self):
        self.refuses('unread released-V-ENV leaf', lambda: tool.limited_origins(self.reader, self.rev, self.rows, self.lists,
            self.members, self.targets, self.results, self.register, {'V-ENV': {'status': 'held'}}))

# These fixtures reuse setup and helpers; active-hold tests run on their original class.
for derived, base in ((ReleasedRegisterTests, StructureTests), (ReleasedLimitTests, LimitTests)):
    for name in dir(base):
        if name.startswith("test_") and name not in derived.__dict__:
            setattr(derived, name, None)
