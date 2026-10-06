"""Design 06 R1-03 and C2-LIMIT. A transfer must be in its decision's pinned list, which lies in the
decision's attachment directory; owner choice 04's limited origins carry exactly the pinned unbound members
plus extras, each admitted only through its target record, never by title."""
from test_adoption_format import FormatTwoTests
from test_packet_tools import RepositoryFixture, tool

P1H = tool.P1H_TARGET_REFUSAL.format('held')


class TransferListTests(RepositoryFixture):
    fixture, check, pin_list = FormatTwoTests.fixture, FormatTwoTests.check, FormatTwoTests.pin_list

    def refuses(self, fragment, call):
        error = None
        try:
            call()
        except Exception as exc:
            error = exc
        self.assertIsInstance(error, tool.CheckError, f'expected declared refusal {fragment}, observed {error!r}')
        self.assertIn(fragment, str(error))

    def two(self, transfers, lists, change=None, revalidate_second=True):
        """Both fixture origins await revalidation; `transfers` maps origin index to decision, `lists` maps a
        decision to the origin indexes its list names."""
        def legacy(data):
            if not revalidate_second:
                return
            data['mappings'][1] = {'origin': data['mappings'][1]['origin'], 'status': 'suite', 'rationale': 'Old mapping',
                                   'targets': ['suite']}

        def manifest(data):
            if revalidate_second:
                data['origins'][1].update(state='pending_revalidation',
                                          legacy={'status': 'suite', 'rationale': 'Old mapping', 'targets': ['suite']})
            ids = [row['id'] for row in data['origins']]
            data['transferred'] = [{'origin': ids[index], 'decision': decision} for index, decision in transfers]
            for decision, indexes in lists.items():
                self.pin_list(data, decision, [ids[index] for index in indexes])
            if change:
                change(data)
        return self.fixture(manifest, legacy)

    def test_each_decision_transfers_exactly_its_listed_origins(self):
        result = self.check(self.two([(0, 'a.md'), (1, 'b.md')], {'a.md': [0], 'b.md': [1]}))
        self.assertEqual((result['result'], result['transferred']['by_decision']), ('revalidation_complete', {'a.md': 1, 'b.md': 1}))

    def test_review_01_extra_transfer_is_refused(self):
        """A further origin cited under a decision whose list does not name it (review 01's 45th origin)."""
        rev = self.two([(0, 'a.md'), (1, 'a.md')], {'a.md': [0]})
        self.refuses("is in its decision's pinned list", lambda: self.check(rev))

    def test_review_01_unrelated_decision_is_refused(self):
        """A real decision file that pins no list cannot transfer an origin."""
        def change(data):
            self.write('unrelated.md', 'Held claim decision.\n')
            data['transferred'][1]['decision'] = 'unrelated.md'
        self.refuses("is in its decision's pinned list", lambda: self.check(self.two([(0, 'a.md'), (1, 'a.md')], {'a.md': [0]}, change)))

    def test_an_origin_cited_under_another_decision_is_refused(self):
        rev = self.two([(0, 'b.md'), (1, 'a.md')], {'a.md': [0], 'b.md': [1]})
        self.refuses("is in its decision's pinned list", lambda: self.check(rev))

    def test_a_listed_origin_without_its_transfer_is_refused(self):
        rev = self.two([(0, 'a.md')], {'a.md': [0, 1]})
        self.refuses("pinned list differs from the origins transferred under it", lambda: self.check(rev))

    def test_a_listed_origin_that_is_not_open_is_refused(self):
        rev = self.two([(0, 'a.md'), (1, 'a.md')], {'a.md': [0, 1]}, revalidate_second=False)
        self.refuses('a transferred origin is an open revalidation origin', lambda: self.check(rev))

    def test_list_shape_refusals(self):
        for message, change in [
                ('transfer lists are a list', lambda data: data.update(transfer_lists={})),
                ('names its decision once, the list and its SHA-256', lambda data: data['transfer_lists'].append(dict(data['transfer_lists'][0]))),
                ("lies in its decision's attachment directory", lambda data: data['transfer_lists'][0].update(list='b/transferred.json')),
                ('transfer list digest mismatch', lambda data: data['transfer_lists'][0].update(sha256='0' * 64))]:
            with self.subTest(message=message):
                self.setUp()
                rev = self.two([(0, 'a.md'), (1, 'b.md')], {'a.md': [0], 'b.md': [1]}, change)
                self.refuses(message, lambda: self.check(rev))

    def test_a_list_names_each_origin_once(self):
        rev = self.two([(0, 'a.md')], {'a.md': [0, 0]})
        self.refuses('a transfer list names each origin once', lambda: self.check(rev))


class LimitTests(RepositoryFixture):
    """C2-LIMIT corpus, with review 02's brief items 3 and the design 06 check's change-2 collisions."""

    def setUp(self):
        super().setUp()
        self.write(tool.LIMIT_DECISION, 'Owner choice 04 fixture.\n')
        self.document(tool.LIMIT_MEMBERS, {'members': 1, 'rows': [{'member': 'm.listed'}]})
        self.rev = self.commit('limit records')
        self.sha = tool.digest((self.root / tool.LIMIT_MEMBERS).read_bytes())
        member = lambda key, status='refused', origin='o.limited': {'member': key, 'origins': [origin], 'status': status}
        self.members = {'m.listed': member('m.listed'), 'm.extra': member('m.extra'), 'm.bound': member('m.bound'),
                        'm.held': member('m.held', 'held'), 'm.other': member('m.other', origin='o.other')}
        self.targets = {'t.extra': self.target('t.extra', 'm.extra', 5), 't.bound': self.target('t.bound', 'm.bound', 9)}
        self.results = [{'id': 't.extra', 'refused': [P1H], 'title_kind': 'literal'},
                        {'id': 't.bound', 'refused': [], 'title_kind': 'literal'}]
        self.register = {'f.test.ts:5:3': {'classification': 'held', 'claim': 'V-ENV', 'decision': tool.VENV_RECORD}}
        self.rows = [{'origin': 'o.limited', 'decision': tool.LIMIT_DECISION,
                      'limited': {'members': tool.LIMIT_MEMBERS, 'sha256': self.sha,
                                  'extras': [{'member': 'm.extra', 'target': 't.extra'}]}},
                     {'origin': 'o.other', 'decision': 'other.md'}]
        self.lists = {tool.LIMIT_DECISION: {'o.limited': {'origin': 'o.limited', 'members': 4}},
                      'other.md': {'o.other': {'origin': 'o.other'}}}

    @staticmethod
    def target(key, member, line, file='f.test.ts'):
        return {'id': key, 'member': member, 'file': file, 'declaration': {'line': line, 'column': 3}}

    def limit(self):
        return tool.limited_origins(self.reader, self.rev, self.rows, self.lists, self.members, self.targets,
                                    self.results, self.register)

    refuses = TransferListTests.refuses

    def test_a_valid_extra_maps_through_its_target_record(self):
        self.assertEqual(self.limit(), {'o.limited': {'listed': 1, 'extras': ['m.extra']}})

    def test_review_02_unlisted_unbound_member_is_refused(self):
        self.members['m.stray'] = {'member': 'm.stray', 'origins': ['o.limited'], 'status': 'refused'}
        self.lists[tool.LIMIT_DECISION]['o.limited']['members'] = 5
        self.refuses('the refused members without a credited target differ from the limit', self.limit)

    def test_a_same_title_leaf_elsewhere_maps_nothing(self):
        """Change 2: another member's target at a held leaf with the same title, in another file or another
        suite of the same file, is no mapping for the extra."""
        entry, bound = self.register['f.test.ts:5:3'], self.results[1]
        for file, line in (('g.test.ts', 5), ('f.test.ts', 40)):
            with self.subTest(file=file):
                self.targets = {'t.title': self.target('t.title', 'm.other', line, file), 't.bound': self.targets['t.bound']}
                self.results = [{'id': 't.title', 'refused': [P1H], 'title_kind': 'literal'}, bound]
                self.register = {f'{file}:{line}:3': entry}
                self.rows[0]['limited']['extras'] = [{'member': 'm.extra', 'target': 't.title'}]
                self.refuses('an extra limited member maps through its only target', self.limit)

    def test_missing_and_duplicate_mappings_create_no_exception(self):
        self.rows[0]['limited']['extras'] = [{'member': 'm.extra', 'target': 't.absent'}]
        self.refuses('an extra limited member maps through its only target', self.limit)
        self.rows[0]['limited']['extras'] = [{'member': 'm.extra', 'target': 't.extra'}]
        self.targets['t.twin'] = self.target('t.twin', 'm.extra', 7)
        self.results.append({'id': 't.twin', 'refused': [P1H], 'title_kind': 'literal'})
        self.refuses('an extra limited member maps through its only target', self.limit)

    def test_an_otherwise_refused_or_generated_or_non_rule_1_target_creates_no_exception(self):
        for change in (lambda: self.results[0]['refused'].insert(0, 'the catalog has no single passing leaf with this path'),
                       lambda: self.results[0].update(title_kind='template'),
                       lambda: self.register['f.test.ts:5:3'].update(claim='Proxy'),
                       lambda: self.register['f.test.ts:5:3'].pop('decision'),
                       lambda: self.register.clear()):
            with self.subTest(change=change):
                self.setUp()
                change()
                self.refuses("an extra limited member's target passes P1-T at a rule-1 held leaf", self.limit)

    def test_an_extra_is_a_further_member_of_its_own_origin(self):
        for extra in ({'member': 'm.other', 'target': 't.extra'}, {'member': 'm.listed', 'target': 't.extra'},
                      {'member': 'm.extra'}):
            with self.subTest(extra=extra):
                self.rows[0]['limited']['extras'] = [extra]
                self.refuses('an extra limited member is a further member of its origin', self.limit)

    def test_only_owner_choice_04_origins_carry_a_limit(self):
        self.rows[1]['limited'] = dict(self.rows[0]['limited'])
        self.refuses("only owner choice 04's origins carry a limit", self.limit)

    def test_limit_record_refusals(self):
        for message, change in [
                ('names the unbound-member list, its SHA-256 and its extras', lambda: self.rows[0].pop('limited')),
                ('the unbound-member list digest differs', lambda: self.rows[0]['limited'].update(sha256='0' * 64)),
                ("owner choice 04's member count differs from the preserved table",
                 lambda: self.lists[tool.LIMIT_DECISION]['o.limited'].update(members=3))]:
            with self.subTest(message=message):
                self.setUp()
                change()
                self.refuses(message, self.limit)

    def test_a_listed_member_outside_the_limited_origins_is_refused(self):
        self.members['m.listed']['origins'] = ['o.other']
        self.lists[tool.LIMIT_DECISION]['o.limited']['members'] = 3
        self.refuses('an unbound-member list entry lies outside the limited origins', self.limit)


class RepositoryLimitTests(RepositoryFixture):
    """The maintained manifest: owner choices 04 and 05 pin their lists, and owner choice 04's limit admits
    exactly the two extras design 06 names as positive controls, each through its target record."""

    def test_the_manifest_pins_both_lists_and_maps_both_extras(self):
        import json
        from test_target_tools import ROOT
        manifest = json.loads((ROOT / 'tests/fixtures/packet-tools/adoption.json').read_text())
        lists = {row['decision']: row for row in manifest['transfer_lists']}
        self.assertEqual(sorted(lists), [tool.LIMIT_DECISION, 'docs/development/work/TOOLS-01/owner-choice-05.md'])
        for decision, row in lists.items():
            listed = {item['origin'] for item in json.loads((ROOT / row['list']).read_text())}
            self.assertEqual(tool.digest((ROOT / row['list']).read_bytes()), row['sha256'])
            self.assertEqual(listed, {item['origin'] for item in manifest['transferred'] if item['decision'] == decision})
        extras = {row['origin']: row['limited']['extras'] for row in manifest['transferred'] if 'limited' in row}
        self.assertEqual(len(extras), 4)
        self.assertEqual(extras.pop('artifact-73555fe668cc180905b1e49a'), [
            {'member': 'packages/kernel/tests/dispatch.test.ts:1363:3@5a8d958ffdab', 'target': 'target.dispatch.1363.3.5a8d958ffdab'},
            {'member': 'packages/kernel/tests/dispatch.test.ts:1426:3@5a8d958ffdab', 'target': 'target.dispatch.1426.3.5a8d958ffdab'}])
        self.assertEqual(list(extras.values()), [[], [], []])
        targets = {row['id']: row for row in manifest['suite_targets']}
        self.assertEqual({key: [targets[key]['declaration']['line'], targets[key]['declaration']['column']]
                          for key in ('target.dispatch.1363.3.5a8d958ffdab', 'target.dispatch.1426.3.5a8d958ffdab')},
                         {'target.dispatch.1363.3.5a8d958ffdab': [1390, 3], 'target.dispatch.1426.3.5a8d958ffdab': [1459, 3]})
