"""P1-R origin closure and the D04-CHK-06 minimum context (design 05 §4): every member of a closed origin
is preserved, targeted or witnessed, and the recorded ranges cover the file or fence section and every
sealed record it names; other path and revision candidates are covered or reasoned."""
from test_packet_tools import RepositoryFixture, tool

TEST_FILE = "import { test } from 'node:test';\n// See docs/records/note.md and revision a1b2c3d.\ntest('member', () => {});\n"
NOTE = 'A sealed note naming docs/records/deeper.md.\n'
DEEPER = 'The deepest record.\n'
REVIEW = '# Review\n\nIntro.\n\n## Finding one\n\nText.\n\n```js\nconst value = 1;\n```\n\nMore text.\n\n## Finding two\n\nOther.\n'


class ClosureTests(RepositoryFixture):
    def setUp(self):
        super().setUp()
        self.write('packages/kernel/tests/a.test.ts', TEST_FILE)
        self.write('docs/records/note.md', NOTE)
        self.write('docs/records/deeper.md', DEEPER)
        self.write('docs/review.md', REVIEW)
        self.pin = self.commit('records')
        self.test_origin = {'id': 'origin.test', 'kind': 'artifact', 'revision': self.pin, 'path': 'packages/kernel/tests/a.test.ts', 'line': 1}
        self.fence_origin = {'id': 'origin.fence', 'kind': 'artifact', 'revision': self.pin, 'path': 'docs/review.md', 'line': 9}

    def ranges(self, *rows):
        return [{'revision': self.pin, 'path': path, 'start': start, 'end': end} for path, start, end in rows]

    def full(self):
        return self.ranges(('packages/kernel/tests/a.test.ts', 1, 3), ('docs/records/note.md', 1, 1), ('docs/records/deeper.md', 1, 1))

    def facts(self, **changes):
        facts = {'target': {'target.one': {'refused': [], 'member': 'm.refused'}},
                 'counterexample': {'witness.one': {'kind': 'held_witness', 'members': ['m.held'],
                                                   'origins': ['origin.test']}},
                 'member': {'m.preserved': {'member': 'm.preserved', 'status': 'preserved', 'origins': ['origin.test']},
                            'm.refused': {'member': 'm.refused', 'status': 'refused', 'origins': ['origin.test']},
                            'm.held': {'member': 'm.held', 'status': 'held', 'origins': ['origin.test']}},
                 'family': {}, 'case': {'case.one': {}}}
        facts.update(changes)
        return facts

    def closure(self, links=None, **extra):
        closure = {'links': [{'kind': 'target', 'id': 'target.one'}, {'kind': 'counterexample', 'id': 'witness.one'}]
                   if links is None else links, 'context': self.full(), 'context_reasons': {'a1b2c3d': 'a commit the comment cites, not a record'}}
        closure.update(extra)
        return closure

    def close(self, closure, origin=None, facts=None):
        return tool.origin_closure(self.reader, self.pin, (origin or self.test_origin)['id'], {'closure': closure},
                                   origin or self.test_origin, facts or self.facts())

    def test_a_test_file_origin_closes_with_targets_witnesses_and_its_context(self):
        result = self.close(self.closure())
        self.assertEqual(result, {'ranges': 3, 'candidates': 3, 'reasoned': 1})

    def test_a_refused_member_needs_a_linked_target(self):
        with self.assertRaisesRegex(tool.CheckError, 'refused member of this origin has no linked target'):
            self.close(self.closure(links=[{'kind': 'counterexample', 'id': 'witness.one'}]))

    def test_a_held_member_needs_a_linked_witness(self):
        with self.assertRaisesRegex(tool.CheckError, 'held or superseded member of this origin has no linked witness'):
            self.close(self.closure(links=[{'kind': 'target', 'id': 'target.one'}]))

    def test_a_held_member_cannot_close_through_an_ordinary_record(self):
        facts = self.facts(counterexample={'witness.one': {
            'kind': 'behavior', 'members': ['m.held'], 'origins': ['origin.test']}})
        with self.assertRaisesRegex(tool.CheckError, 'has no linked witness'):
            self.close(self.closure(), facts=facts)

    def test_a_witness_kind_must_match_each_members_status(self):
        for status, wrong_kind in [('held', 'superseded_witness'), ('superseded', 'held_witness')]:
            with self.subTest(status=status):
                facts = self.facts()
                facts['member']['m.held']['status'] = status
                facts['counterexample']['witness.one']['kind'] = wrong_kind
                with self.assertRaisesRegex(tool.CheckError, 'has no linked witness'):
                    self.close(self.closure(), facts=facts)

    def test_a_witness_for_another_origin_cannot_close_this_one(self):
        facts = self.facts()
        facts['counterexample']['witness.one']['origins'] = ['origin.other']
        with self.assertRaisesRegex(tool.CheckError, 'has no linked witness'):
            self.close(self.closure(), facts=facts)

    def test_a_linked_target_must_hold_at_c(self):
        facts = self.facts(target={'target.one': {'refused': ['assertion anchor not reached'], 'member': 'm.refused'}})
        with self.assertRaisesRegex(tool.CheckError, 'links a refused target'):
            self.close(self.closure(), facts=facts)

    def test_links_must_exist(self):
        error = None
        try:
            self.close(self.closure(links=[{'kind': 'target', 'id': 'target.absent'}]))
        except Exception as exc:
            error = exc
        self.assertIsInstance(error, tool.CheckError, 'absent link must produce a declared refusal')
        self.assertIn('links an absent target', str(error))

    def test_a_member_link_names_a_preserved_member(self):
        links = [{'kind': 'target', 'id': 'target.one'}, {'kind': 'counterexample', 'id': 'witness.one'},
                 {'kind': 'member', 'id': 'm.refused'}]
        with self.assertRaisesRegex(tool.CheckError, 'names a preserved member'):
            self.close(self.closure(links=links))

    def test_the_context_covers_the_whole_artifact(self):
        closure = self.closure(context=self.ranges(('packages/kernel/tests/a.test.ts', 1, 2), ('docs/records/note.md', 1, 1),
                                                   ('docs/records/deeper.md', 1, 1)))
        with self.assertRaisesRegex(tool.CheckError, 'does not cover the minimum'):
            self.close(closure)

    def test_named_sealed_records_are_context_transitively(self):
        closure = self.closure(context=self.ranges(('packages/kernel/tests/a.test.ts', 1, 3), ('docs/records/note.md', 1, 1)))
        with self.assertRaisesRegex(tool.CheckError, 'named sealed record is outside the context: docs/records/deeper.md'):
            self.close(closure)

    def test_a_reason_cannot_waive_mandatory_sealed_context(self):
        for omitted, ranges in [
                ('docs/records/note.md', self.ranges(('packages/kernel/tests/a.test.ts', 1, 3))),
                ('docs/records/deeper.md', self.ranges(('packages/kernel/tests/a.test.ts', 1, 3),
                                                     ('docs/records/note.md', 1, 1)))]:
            with self.subTest(omitted=omitted):
                reasons = {'a1b2c3d': 'Historical revision.', omitted: 'Omit this required record.'}
                with self.assertRaisesRegex(tool.CheckError, 'a named sealed record is outside the context: ' + omitted):
                    self.close(self.closure(context=ranges, context_reasons=reasons))

    def test_reasons_do_not_reclassify_covered_mandatory_records(self):
        reasons = {'a1b2c3d': 'Historical revision.', 'docs/records/note.md': 'Already covered.'}
        with self.assertRaisesRegex(tool.CheckError, 'absent or mandatory candidates'):
            self.close(self.closure(context_reasons=reasons))

    def test_other_candidates_are_covered_or_reasoned(self):
        with self.assertRaisesRegex(tool.CheckError, 'unreasoned path or revision candidate in the context: a1b2c3d'):
            self.close(self.closure(context_reasons={}))
        with self.assertRaisesRegex(tool.CheckError, 'absent or mandatory candidates'):
            self.close(self.closure(context_reasons={'a1b2c3d': 'cited', 'f00dfeed1': 'not there'}))

    def test_a_fence_needs_its_heading_section(self):
        facts = self.facts(member={})
        good = self.closure(links=[{'kind': 'case', 'id': 'case.one'}], context=self.ranges(('docs/review.md', 5, 14)),
                            context_reasons={})
        self.assertEqual(self.close(good, self.fence_origin, facts)['ranges'], 1)
        short = dict(good, context=self.ranges(('docs/review.md', 9, 11)))
        with self.assertRaisesRegex(tool.CheckError, 'does not cover the minimum'):
            self.close(short, self.fence_origin, facts)

    def test_a_non_executable_closure_states_its_reason(self):
        facts = self.facts(member={})
        closure = self.closure(links=[], non_executable={'reason': 'record', 'rationale': 'A sealed log, not a program.'})
        self.assertEqual(self.close(closure, facts=facts)['ranges'], 3)
        with self.assertRaisesRegex(tool.CheckError, 'states its reason and rationale'):
            self.close(dict(closure, non_executable={'reason': 'unwanted', 'rationale': 'x'}), facts=facts)

    def test_an_empty_closure_is_refused(self):
        with self.assertRaisesRegex(tool.CheckError, 'without members, links or a non-executable reason'):
            self.close(self.closure(links=[]), facts=self.facts(member={}))

    def test_a_family_origin_needs_every_member_routed(self):
        family = {'id': 'family.one', 'origin': 'origin.test', 'members': [{'route': {'kind': 'pending'}}]}
        facts = self.facts(member={}, family={'family.one': family})
        with self.assertRaisesRegex(tool.CheckError, 'still has pending members'):
            self.close(self.closure(links=[{'kind': 'family', 'id': 'family.one'}]), facts=facts)
        with self.assertRaisesRegex(tool.CheckError, 'an origin with a family links it'):
            self.close(self.closure(links=[{'kind': 'case', 'id': 'case.one'}]), facts=facts)

    def test_markdown_sections_ignore_headings_inside_fences(self):
        lines = ['# Top', '', '## A', '```md', '# not a heading', '```', 'text', '## B', 'x']
        self.assertEqual(tool.markdown_section(lines, 4), (3, 7))

    def test_closure_shapes_are_checked(self):
        with self.assertRaisesRegex(tool.CheckError, 'closure links name a kind and an ID'):
            self.close(self.closure(links=[{'kind': 'guess', 'id': 'x'}]))
        with self.assertRaisesRegex(tool.CheckError, 'records its context ranges'):
            self.close(self.closure(context=[]))
        with self.assertRaisesRegex(tool.CheckError, 'context reasons need text'):
            self.close(self.closure(context_reasons={'a1b2c3d': ' '}))
