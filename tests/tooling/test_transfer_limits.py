"""Design 06 R1-03 and C2-LIMIT. A transfer must be in its decision's pinned list, which lies in the
decision's attachment directory; owner choice 04's limited origins carry exactly the pinned unbound members
plus extras, each admitted only through its target record, never by title."""
from test_adoption_format import FormatTwoTests
from test_packet_tools import RepositoryFixture, tool

P1H = tool.P1H_TARGET_REFUSAL.format('held')
LATER_DECISION = 'docs/development/work/K1.1-correction-03/owner-choice-01.md'
SECOND_DECISION = 'docs/development/work/K1.1-correction-03/owner-choice-02.md'


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

    # Owner answers to design 06 revision 4 and owner choice 11.
    def owner_list(self, items):
        self.write(tool.LISTED_DECISION, 'Owner choice 11 fixture.\n')
        self.document(tool.LISTED_MEMBERS, items)
        self.rev = self.commit('owner choice 11 list')
        self.rows[0]['limited']['listed'] = {'members': tool.LISTED_MEMBERS,
                                             'sha256': tool.digest((self.root / tool.LISTED_MEMBERS).read_bytes())}

    def multi_leaf_member(self):
        """A refused member whose generated title maps through two targets, both refused by P1-H."""
        self.members['m.multi'] = {'member': 'm.multi', 'origins': ['o.limited'], 'status': 'refused'}
        self.lists[tool.LIMIT_DECISION]['o.limited']['members'] = 5
        for key in ('t.multi.1', 't.multi.2'):
            self.targets[key] = self.target(key, 'm.multi', 20)
            self.results.append({'id': key, 'refused': [P1H], 'title_kind': 'template'})

    def test_a_listed_member_held_by_rule_1_stays_in_the_limit(self):
        self.members['m.listed'].update(status='held', file='f.test.ts', current=[12, 3])
        self.register['f.test.ts:12:3'] = {'classification': 'held', 'claim': 'V-ENV', 'decision': tool.VENV_RECORD}
        self.assertEqual(self.limit(), {'o.limited': {'listed': 1, 'extras': ['m.extra']}})

    def test_a_listed_member_held_by_a_category_claim_is_bound(self):
        self.members['m.listed'].update(status='held', file='f.test.ts', current=[12, 3])
        self.register['f.test.ts:12:3'] = {'classification': 'held', 'claim': 'Proxy', 'decision': 'decision-01.md'}
        self.refuses('the refused members without a credited target differ from the limit', self.limit)

    def test_owner_choice_11_lists_a_multi_leaf_member(self):
        self.multi_leaf_member()
        self.refuses('the refused members without a credited target differ from the limit', self.limit)
        self.owner_list([{'origin': 'o.limited', 'member': 'm.multi', 'cause': 'two generated leaves'}])
        self.assertEqual(self.limit(), {'o.limited': {'listed': 2, 'extras': ['m.extra']}})

    def test_owner_list_refusals(self):
        for message, items, change in [
                ("owner choice 11's listed members and their SHA-256",
                 [{'origin': 'o.limited', 'member': 'm.multi'}], lambda: self.rows[0]['limited']['listed'].update(sha256='0' * 64)),
                ("owner choice 11's list names each member once, with its origin", [{'origin': 'o.limited'}], None),
                ("owner choice 11 lists further members of its origin", [{'origin': 'o.limited', 'member': 'm.listed'}], None),
                ("owner choice 11 lists further members of its origin", [{'origin': 'o.limited', 'member': 'm.other'}], None),
                ("owner choice 11's listed members lie in the limited origins",
                 [{'origin': 'o.limited', 'member': 'm.multi'}, {'origin': 'o.other', 'member': 'm.other'}], None)]:
            with self.subTest(message=message, items=items):
                self.setUp()
                self.multi_leaf_member()
                self.owner_list(items)
                if change:
                    change()
                self.refuses(message, self.limit)


    # K1.1-correction-03 owner choice 01: a later decision lists members whose tests a packet changed.
    def later_list(self, items, decision='later.md', path='later/limited-members.json', row=0):
        self.write(decision, 'Later owner decision fixture.\n')
        self.document(path, items)
        self.rev = self.commit('later limit list')
        entry = {'decision': decision, 'members': path, 'sha256': tool.digest((self.root / path).read_bytes())}
        self.rows[row]['limited'].setdefault('added', []).append(entry)
        return entry

    def changed_member(self):
        """A member of the limited origin whose test a later packet changed: refused, with no credited target."""
        self.members['m.changed'] = {'member': 'm.changed', 'origins': ['o.limited'], 'status': 'refused'}
        self.lists[tool.LIMIT_DECISION]['o.limited']['members'] = 5

    def second_limited_origin(self):
        self.members['m.second'] = {'member': 'm.second', 'origins': ['o.second'], 'status': 'refused'}
        self.rows.append({'origin': 'o.second', 'decision': tool.LIMIT_DECISION,
                          'limited': {'members': tool.LIMIT_MEMBERS, 'sha256': self.sha, 'extras': []}})
        self.lists[tool.LIMIT_DECISION]['o.second'] = {'origin': 'o.second', 'members': 1}

    def test_a_later_decision_lists_a_changed_member(self):
        self.changed_member()
        self.refuses('the refused members without a credited target differ from the limit', self.limit)
        self.later_list([{'origin': 'o.limited', 'member': 'm.changed', 'cause': 'test changed by a later packet'}])
        self.assertEqual(self.limit(), {'o.limited': {'listed': 2, 'extras': ['m.extra']}})

    def test_one_later_list_serves_two_limited_origins(self):
        self.changed_member()
        self.second_limited_origin()
        entry = self.later_list([{'origin': 'o.limited', 'member': 'm.changed'}, {'origin': 'o.second', 'member': 'm.second'}])
        self.rows[2]['limited']['added'] = [dict(entry)]
        self.assertEqual(self.limit(), {'o.limited': {'listed': 2, 'extras': ['m.extra']}, 'o.second': {'listed': 1, 'extras': []}})

    def test_a_later_member_still_bound_is_refused(self):
        """A later list cannot excuse a member that has a credited target: listed members must be unbound."""
        self.later_list([{'origin': 'o.limited', 'member': 'm.bound'}])
        self.refuses('the refused members without a credited target differ from the limit', self.limit)

    def test_later_limit_refusals(self):
        valid = [{'origin': 'o.limited', 'member': 'm.changed'}]
        for index, (message, items, change) in enumerate([
                ("a later limit names its decision, its member list in the decision's attachment directory and its SHA-256",
                 valid, lambda: self.rows[0]['limited']['added'][0].pop('sha256')),
                ("a later limit names its decision, its member list in the decision's attachment directory and its SHA-256",
                 valid, lambda: self.rows[0]['limited']['added'][0].update(members='elsewhere/limited-members.json')),
                ('a later limit list digest differs', valid, lambda: self.rows[0]['limited']['added'][0].update(sha256='0' * 64)),
                ('a later limit list names each member once, with its origin', [{'origin': 'o.limited'}], None),
                ('a later limit list names each member once, with its origin', valid + valid, None),
                ('a limited origin cites each later decision once', valid,
                 lambda: self.rows[0]['limited']['added'].append(dict(self.rows[0]['limited']['added'][0]))),
                ('a later decision lists further members of its limited origin', valid + [{'origin': 'o.limited', 'member': 'm.listed'}], None),
                ('a later decision lists further members of its limited origin', valid + [{'origin': 'o.limited', 'member': 'm.other'}], None),
                ("a later decision's listed members lie in limited origins that cite it",
                 valid + [{'origin': 'o.other', 'member': 'm.other'}], None)]):
            with self.subTest(index=index, message=message):
                self.setUp()
                self.changed_member()
                self.later_list(items)
                if change:
                    change()
                self.refuses(message, self.limit)

    def test_a_later_decision_must_exist_at_c(self):
        self.changed_member()
        self.later_list([{'origin': 'o.limited', 'member': 'm.changed'}])
        (self.root / 'later.md').unlink()
        self.rev = self.commit('later decision removed, its list kept')
        self.refuses('missing regular source', self.limit)

    def test_a_malformed_later_decision_is_a_declared_refusal(self):
        """A non-text decision is refused by the later limit's shape check, never a raw exception."""
        for decision in (['later.md'], {'x': 1}, None):
            with self.subTest(decision=decision):
                self.setUp()
                self.changed_member()
                self.later_list([{'origin': 'o.limited', 'member': 'm.changed'}])
                self.rows[0]['limited']['added'][0]['decision'] = decision
                self.refuses("a later limit names its decision, its member list in the decision's attachment directory",
                             self.limit)

    def test_a_later_list_that_is_not_json_is_refused(self):
        self.changed_member()
        self.later_list([])
        (self.root / 'later/limited-members.json').write_text('not json\n')
        self.rev = self.commit('broken later list')
        self.rows[0]['limited']['added'][0]['sha256'] = tool.digest(b'not json\n')
        self.refuses('a later limit list is not JSON', self.limit)

    def test_two_origins_citing_one_decision_cite_one_list(self):
        self.changed_member()
        self.second_limited_origin()
        self.later_list([{'origin': 'o.limited', 'member': 'm.changed'}])
        self.later_list([{'origin': 'o.second', 'member': 'm.second'}], path='later/second.json', row=2)
        self.refuses('every limited origin citing a later decision cites its one pinned list', self.limit)


class RepositoryLimitTests(RepositoryFixture):
    """The maintained manifest: owner choices 04, 05 and 11 pin their lists; owner choice 04's limit admits each
    extra through its only target record, design 06's two extras among them; owner choice 11 lists one member;
    K1.1-correction-03 owner choices 01 and 02, BINDING-01 design 01 and COORD-REFACTOR-01 design 01 pin later
    mechanical revalidation and unbound members; TOOLS-02 owner choice 03 reopens the two mcp-boundaries origins."""

    def test_the_manifest_pins_its_lists_and_maps_every_extra(self):
        import json
        from test_target_tools import ROOT
        manifest = json.loads((ROOT / 'tests/fixtures/packet-tools/adoption.json').read_text())
        lists = {row['decision']: row for row in manifest['transfer_lists']}
        binding_decision = 'docs/development/work/BINDING-01/design-01.md'
        refactor_decision = 'docs/development/work/COORD-REFACTOR-01/design-01.md'
        reopen_decision = 'docs/development/work/TOOLS-02/owner-choice-03.md'
        self.assertEqual(sorted(lists), sorted([LATER_DECISION, SECOND_DECISION, tool.LIMIT_DECISION,
                                              'docs/development/work/TOOLS-01/owner-choice-05.md', tool.LISTED_DECISION,
                                              binding_decision, refactor_decision, reopen_decision]))
        for decision, row in lists.items():
            listed = {item['origin'] for item in json.loads((ROOT / row['list']).read_text())}
            self.assertEqual(tool.digest((ROOT / row['list']).read_bytes()), row['sha256'])
            self.assertEqual(listed, {item['origin'] for item in manifest['transferred'] if item['decision'] == decision})
        self.assertEqual(len(json.loads((ROOT / lists[tool.LISTED_DECISION]['list']).read_text())), 3)
        limits = {row['origin']: row['limited'] for row in manifest['transferred'] if 'limited' in row}
        self.assertEqual(len(limits), 4)
        targets = {row['id']: row for row in manifest['suite_targets']}
        for origin, limit in limits.items():
            for extra in limit['extras']:
                self.assertEqual([key for key, row in targets.items() if row.get('member') == extra['member']], [extra['target']])
        dispatch = {extra['member']: extra['target'] for extra in limits['artifact-73555fe668cc180905b1e49a']['extras']}
        retained = 'packages/kernel/tests/dispatch.test.ts:1363:3@5a8d958ffdab'
        self.assertEqual(targets[dispatch[retained]]['declaration'], {'line': 1462, 'column': 3})
        # The removed wrapper-only assertion has no current target; its old binding is retained as history.
        reopened = 'packages/kernel/tests/dispatch.test.ts:1426:3@5a8d958ffdab'
        self.assertNotIn(reopened, dispatch)
        attachment = json.loads((ROOT / 'docs/development/work/BINDING-01/design-01/reopened-bindings.json').read_text())
        self.assertIn(reopened, json.dumps(attachment))
        pinned = {origin: limit['listed'] for origin, limit in limits.items() if 'listed' in limit}
        self.assertEqual(pinned, {'artifact-9fd619f5375d598ebb2b88aa': {
            'members': tool.LISTED_MEMBERS, 'sha256': tool.digest((ROOT / tool.LISTED_MEMBERS).read_bytes())}})
        # K1.1-correction-03 owner choice 01 lists the 24 members its test conversions changed in two limited origins.
        later = {origin: limit['added'] for origin, limit in limits.items() if 'added' in limit}
        later_list = LATER_DECISION[:-len('.md')] + '/limited-members.json'
        entry = {'decision': LATER_DECISION, 'members': later_list, 'sha256': tool.digest((ROOT / later_list).read_bytes())}
        # Owner choice 02 lists ten further refused members of the dispatch origin.
        second_list = SECOND_DECISION[:-len('.md')] + '/limited-members.json'
        second = {'decision': SECOND_DECISION, 'members': second_list, 'sha256': tool.digest((ROOT / second_list).read_bytes())}
        binding_list = binding_decision[:-len('.md')] + '/limited-members.json'
        binding = {'decision': binding_decision, 'members': binding_list,
                   'sha256': tool.digest((ROOT / binding_list).read_bytes())}
        self.assertEqual(later, {'artifact-73555fe668cc180905b1e49a': [entry, second, binding],
                                 'artifact-ea5444a6d42154e413fe0f2e': [entry, binding],
                                 'artifact-9fd619f5375d598ebb2b88aa': [binding]})
        for path, expected in ((later_list, {'artifact-73555fe668cc180905b1e49a': 3, 'artifact-ea5444a6d42154e413fe0f2e': 21}),
                               (second_list, {'artifact-73555fe668cc180905b1e49a': 10}),
                               (binding_list, {'artifact-73555fe668cc180905b1e49a': 6,
                                               'artifact-9fd619f5375d598ebb2b88aa': 13,
                                               'artifact-ea5444a6d42154e413fe0f2e': 2})):
            counts = {}
            for item in json.loads((ROOT / path).read_text()):
                counts[item['origin']] = counts.get(item['origin'], 0) + 1
            self.assertEqual(counts, expected)
