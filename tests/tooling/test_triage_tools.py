"""T2-5 retirement pointers, executable closure, transfer provenance and frozen sampling."""
import copy
from pathlib import Path
import random
import runpy
from test_packet_tools import RepositoryFixture, tool


class TriageTests(RepositoryFixture):
    def setUp(self):
        super().setUp()
        self.write(tool.TRIAGE_LIMITS, '| L-01 | Current limit |\nText mentions L-99, not a register row.\n')
        for decision in tool.TRIAGE_DECISIONS:
            self.write(decision, 'Accepted decision at the base.\n')
        self.write(tool.VENV_RELEASE, 'Core hold release.\n')
        self.rev = self.commit('triage pointers')
        self.origins = {'closed': {'state': 'complete'}, 'retired': {'state': 'triaged'}}
        self.registry = {'cases': [{'id': 'case.one'}]}
        self.leaves = [{'leaf': True, 'path': ['suite', 'leaf'], 'verdict': 'passed'}]
        self.catalog = {'selection': ['tests/a.test.ts'], 'tree': {'files': {'tests/a.test.ts': {'pairs': self.leaves}}}}
        self.context = {'catalogs': {'unit': {}}, 'catalog': lambda command: self.catalog}

    def check(self, kind='not_a_counterexample', **changes):
        triage = {'class': kind, 'rationale': 'Read the pinned source paragraph.', **changes}
        return tool.triage_origin(self.reader, self.rev, 'origin', {'state': 'triaged', 'triage': triage},
                                  self.origins, self.registry, self.context)

    def leaf(self, **changes):
        return {'kind': 'leaf', 'command': 'unit', 'file': 'tests/a.test.ts', 'test_path': ['suite', 'leaf'], **changes}

    def test_valid_retirement_pointers(self):
        self.assertEqual(self.check(), 'not_a_counterexample')
        self.check('superseded', decision=tool.TRIAGE_DECISIONS[2])
        self.check('recorded_limit', limit='L-01')
        for covered in [self.leaf(), {'kind': 'case', 'id': 'case.one'}, {'kind': 'origin', 'id': 'closed'}]:
            self.check('covered_elsewhere', covered_by=covered)

    def test_unknown_class(self):
        with self.assertRaisesRegex(tool.CheckError, 'retirement class'):
            self.check('accepted')

    def test_empty_rationale(self):
        with self.assertRaisesRegex(tool.CheckError, 'states its rationale'):
            self.check(rationale=' ')

    def test_exact_class_pointer(self):
        with self.assertRaisesRegex(tool.CheckError, 'only its class pointer'):
            self.check(limit='L-01')

    def test_unlisted_superseding_decision(self):
        with self.assertRaisesRegex(tool.CheckError, 'listed superseding decision'):
            self.check('superseded', decision=tool.TRIAGE_LIMITS)

    def test_limit_must_be_a_current_row(self):
        for limit in ['L-99', 'L-999', None]:
            with self.subTest(limit=limit), self.assertRaisesRegex(tool.CheckError, 'current 017 limit'):
                self.check('recorded_limit', limit=limit)

    def test_unknown_coverage_kind(self):
        with self.assertRaisesRegex(tool.CheckError, 'coverage names a leaf'):
            self.check('covered_elsewhere', covered_by={'kind': 'claim'})

    def test_leaf_shape_and_catalog(self):
        for covered in [self.leaf(command='missing'), self.leaf(test_path=[]), self.leaf(extra=True)]:
            with self.subTest(covered=covered), self.assertRaisesRegex(tool.CheckError, 'catalog command'):
                self.check('covered_elsewhere', covered_by=covered)

    def test_leaf_must_exist_and_pass_uniquely(self):
        for verdict in ['failed', 'skipped', 'todo']:
            self.leaves[0]['verdict'] = verdict
            with self.subTest(verdict=verdict), self.assertRaisesRegex(tool.CheckError, 'single passing'):
                self.check('covered_elsewhere', covered_by=self.leaf())
        self.leaves[0]['verdict'] = 'passed'
        with self.assertRaisesRegex(tool.CheckError, 'single passing'):
            self.check('covered_elsewhere', covered_by=self.leaf(test_path=['wrong']))
        self.leaves.append(copy.deepcopy(self.leaves[0]))
        with self.assertRaisesRegex(tool.CheckError, 'single passing'):
            self.check('covered_elsewhere', covered_by=self.leaf())

    def test_case_must_exist(self):
        with self.assertRaisesRegex(tool.CheckError, 'existing scheduled registry case'):
            self.check('covered_elsewhere', covered_by={'kind': 'case', 'id': 'missing'})

    def test_origin_cannot_point_to_retirement(self):
        for key in ['retired', 'missing']:
            with self.subTest(key=key), self.assertRaisesRegex(tool.CheckError, 'complete origin'):
                self.check('covered_elsewhere', covered_by={'kind': 'origin', 'id': key})

    def test_counterexample_reaches_only_executable_evidence(self):
        facts = {'counterexample': {'cx': {'kind': 'behavior'}}, 'target': {}, 'member': {}, 'case': {}, 'family': {}}
        self.assertFalse(tool.counterexample_executable('cx', facts))
        facts['target']['target'] = {'counterexample': 'cx', 'refused': False}
        self.assertTrue(tool.counterexample_executable('cx', facts))
        facts['target']['target']['refused'] = True
        self.assertFalse(tool.counterexample_executable('cx', facts))
        facts['counterexample']['cx']['members'] = ['member']
        for status in ['unread', 'held', 'superseded', 'refused']:
            facts['member']['member'] = {'status': status}
            self.assertFalse(tool.counterexample_executable('cx', facts))
        facts['member']['member']['status'] = 'preserved'
        self.assertTrue(tool.counterexample_executable('cx', facts))
        facts['member'].clear()
        facts['counterexample']['cx']['evidence'] = [{'kind': 'case', 'id': 'case'}]
        self.assertFalse(tool.counterexample_executable('cx', facts))
        facts['case']['case'] = {}
        self.assertTrue(tool.counterexample_executable('cx', facts))
        facts['counterexample']['cx']['evidence'] = [{'kind': 'family', 'id': 'family'}]
        facts['family']['family'] = {'members': [{'route': {'kind': 'pending'}}]}
        self.assertFalse(tool.counterexample_executable('cx', facts))
        facts['family']['family']['members'][0]['route']['kind'] = 'mutation'
        self.assertTrue(tool.counterexample_executable('cx', facts))

    def test_sampler_is_order_independent_and_uses_declared_algorithm(self):
        sample = runpy.run_path(str(Path(__file__).with_name('triage-sample.py')))['sample']
        rows = [{'id': f'origin.{i:03}', 'state': 'triaged'} for i in range(200)]
        manifest = {'origins': rows}
        result = sample(manifest, 20261026, 50)
        self.assertEqual(result['sample'], random.Random(20261026).sample(sorted(row['id'] for row in rows), 50))
        self.assertEqual(result['unsafe_bound'], 1)
        self.assertEqual(result, sample({'origins': list(reversed(rows))}, 20261026, 50))
        self.assertNotEqual(result['population_sha256'], sample({'origins': rows[:-1]}, 20261026, 50)['population_sha256'])
        self.assertEqual(sample({'origins': rows[:4]}, 1, 150)['unsafe_bound'], 0)
        self.assertEqual(sample({'origins': []}, 1, 150)['sample'], [])
        complete = {'origins': [{'id': 'closed', 'state': 'complete'}, {'id': 'extracted', 'state': 'complete', 'disposition': 'extracted'}]}
        self.assertEqual(sample(complete, 1, 10, 'closed')['sample'], ['closed'])
        self.assertEqual(sample(complete, 1, 10, 'extracted')['sample'], ['extracted'])
