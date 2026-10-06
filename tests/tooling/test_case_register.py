"""P1-H over registry cases (step 9, reduced): cases match the register's recipes by their stored input,
argv and named files, never by the registry's own text; a held case carries its witness attribution and
every attributed case is registered held or superseded."""
from test_packet_tools import RepositoryFixture, tool
from test_target_tools import ROOT, pinned_toolchain

REGISTRY = 'tests/fixtures/packet-tools/mutations.json'
CLAIMS = set(tool.REGISTER_MINIMUM)
WITNESS = {'kind': 'held_witness', 'owner': 'K1.1-correction-03', 'decision': 'docs/decision.md', 'reason': 'Held.'}


class CaseRegisterTests(RepositoryFixture):
    def setUp(self):
        super().setUp()
        self.write('tests/tooling/proxy-probe.mjs', 'export const value = new Proxy({}, {});\n')
        self.write('tests/tooling/source-facts.mjs', (ROOT / 'tests/tooling/source-facts.mjs').read_text())
        self.document('package.json', {'type': 'module'})
        for path in (tool.VENV_RECORD, *tool.CATEGORY_DECISIONS['Proxy']):
            self.write(path, 'Fixture copy of a governing decision.\n')
        self.write(REGISTRY, '{"note": "new Proxy and globalThis appear in the registry text only"}\n')
        self.rev = self.commit('case register inputs')
        self.cases = [
            {'id': 'case.runs-probe', 'assertion': 'a', 'files': [], 'input': {}, 'argv': ['node', 'tests/tooling/proxy-probe.mjs']},
            {'id': 'case.registry-only', 'assertion': 'b', 'files': [REGISTRY], 'input': {}, 'argv': ['python3', REGISTRY]},
            # A V-ENV match is held by owner choice 08 rule 1, so this case carries its witness attribution.
            {'id': 'case.input', 'assertion': 'c', 'files': [], 'input': {'source': 'globalThis.JSON'}, 'argv': ['node'],
             'claim': dict(WITNESS, owner='BINDING-01')},
        ]

    def register(self, entries):
        return {'recipes': {key: dict(value) for key, value in tool.REGISTER_MINIMUM.items()}, 'entries': entries}

    def entry(self, key, matched, classification='not_held', claim=None):
        row = {'key': key, 'matched': matched, 'classification': classification, 'reason': 'Classified for the fixture.'}
        if claim:
            row['claim'] = claim
            row['decision'] = tool.VENV_RECORD if claim == 'V-ENV' else tool.CATEGORY_DECISIONS[claim][0]
        return row

    def hold(self, cases, entries):
        environment = tool.child_environment(tool.environment_declaration(None))[0]
        claims = {claim: {'decisions': [tool.VENV_RECORD, *tool.CATEGORY_DECISIONS['Proxy']]} for claim in CLAIMS}
        return tool.hold_register(self.reader, self.rev, self.register(entries), claims, [], environment, pinned_toolchain(),
                                  cases, REGISTRY)

    def test_cases_match_by_input_argv_and_named_files_but_not_the_registry(self):
        matches = tool.register_case_matches(self.reader, self.rev, self.cases, tool.REGISTER_MINIMUM, REGISTRY,
                                             toolchain=pinned_toolchain())
        self.assertEqual(matches, [{'key': 'case:case.runs-probe', 'claims': ['Proxy'], 'detector': []},
                                   {'key': 'case:case.input', 'claims': ['V-ENV'], 'detector': []}])

    def test_a_held_case_needs_its_witness_attribution(self):
        entries = [self.entry('case:case.runs-probe', ['Proxy'], 'held', 'Proxy'), self.entry('case:case.input', ['V-ENV'], 'held', 'V-ENV')]
        with self.assertRaisesRegex(tool.CheckError, 'a held or superseded case carries its witness attribution: case.runs-probe'):
            self.hold(self.cases, entries)
        self.cases[0]['claim'] = WITNESS
        self.assertEqual(set(self.hold(self.cases, entries)), {'case:case.runs-probe', 'case:case.input'})

    def test_an_attributed_case_is_registered_held_or_superseded(self):
        self.cases[0]['claim'] = WITNESS
        with self.assertRaisesRegex(tool.CheckError, 'an attributed witness case is registered as held or superseded: case.runs-probe'):
            self.hold(self.cases, [self.entry('case:case.runs-probe', ['Proxy']), self.entry('case:case.input', ['V-ENV'], 'held', 'V-ENV')])
        self.cases[1]['claim'] = WITNESS
        with self.assertRaisesRegex(tool.CheckError, 'an attributed witness case is registered as held or superseded: case.registry-only'):
            self.hold(self.cases, [self.entry('case:case.runs-probe', ['Proxy'], 'held', 'Proxy'), self.entry('case:case.input', ['V-ENV'], 'held', 'V-ENV')])

    def test_an_unclassified_case_match_is_refused(self):
        with self.assertRaisesRegex(tool.CheckError, 'register entries differ from the recomputed matches'):
            self.hold(self.cases, [self.entry('case:case.input', ['V-ENV'], 'held', 'V-ENV')])
