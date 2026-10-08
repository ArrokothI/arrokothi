"""Design 06 revision 5 (owner choice 10 §2): the structural trace from intrinsic recognition to the register and
every credit consumer. A key whose run set has a detector site is held; no member or target at such a leaf earns
credit."""
import unittest

from test_packet_tools import tool

P1H = 'the target leaf is a registered held test (P1-H)'


class IntrinsicTraceTests(unittest.TestCase):
    def setUp(self):
        # t.test.ts:3:1 has an intrinsic reference and a case runs a child process; q.test.ts:1:1 matches only a
        # regex recipe, with no detector site.
        self.detected = {'t.test.ts:3:1': ['intrinsic@t.test.ts:3', 'intrinsic@helper.ts:9'],
                         'case:c': ['child-process@runner.mjs:2'], 'q.test.ts:1:1': []}
        self.register = {'t.test.ts:3:1': {'classification': 'held'}, 'case:c': {'classification': 'held'},
                         'q.test.ts:1:1': {'classification': 'not_held'}}
        self.members = {'m1': {'member': 'm1', 'file': 't.test.ts', 'current': [3, 1], 'status': 'held'},
                        'm2': {'member': 'm2', 'file': 'q.test.ts', 'current': [1, 1], 'status': 'preserved'},
                        'm3': {'member': 'm3', 'file': 't.test.ts', 'current': None, 'status': 'refused'}}
        self.targets = {'tA': {'file': 't.test.ts', 'declaration': {'line': 3, 'column': 1}},
                        'tB': {'file': 'q.test.ts', 'declaration': {'line': 1, 'column': 1}}}
        self.results = [{'id': 'tA', 'refused': [P1H]}, {'id': 'tB', 'refused': [], 'credit': 'target_reading'}]

    def trace(self):
        return tool.intrinsic_trace(self.detected, self.register, self.members, self.targets, self.results)

    def refused(self, fragment):
        with self.assertRaisesRegex(tool.CheckError, fragment):
            self.trace()

    def test_the_trace_counts_sites_keys_members_and_targets(self):
        self.assertEqual(self.trace(), {'sites': 3, 'keys': 2, 'cases': 1, 'members': 1, 'targets': 1})

    def test_a_key_with_a_detector_site_left_not_held_is_refused(self):
        self.register['t.test.ts:3:1'] = {'classification': 'not_held'}
        self.refused('a key with a detector site is held or superseded: t.test.ts:3:1')

    def test_an_unregistered_case_with_a_detector_site_is_refused(self):
        del self.register['case:c']
        self.refused('a key with a detector site is held or superseded: case:c')

    def test_a_preserved_member_at_a_traced_leaf_is_refused(self):
        self.members['m1']['status'] = 'preserved'
        self.refused('a member at a leaf with a detector site earns no preserved credit: m1')

    def test_a_credited_target_at_a_traced_leaf_is_refused(self):
        self.results[0] = {'id': 'tA', 'refused': [], 'credit': 'target_reading'}
        self.refused('a target at a leaf with a detector site earns no credit: tA')

    def test_a_regex_only_match_is_not_traced(self):
        # q.test.ts:1:1 carries no detector site, so its preserved member m2 and credited target tB pass the trace.
        self.assertEqual(self.trace()['keys'], 2)


if __name__ == '__main__':
    unittest.main()
