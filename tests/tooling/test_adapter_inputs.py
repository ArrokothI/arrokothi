"""Stored data must be the input that the disposable adapter actually executes."""
import json
from pathlib import Path
import subprocess
import unittest
from test_packet_tools import tool


ROOT = Path(__file__).resolve().parents[2]
REGISTRY = 'tests/fixtures/packet-tools/mutations.json'


class AdapterInputTests(unittest.TestCase):
    def run_adapter(self, case_id, change):
        registry = json.loads((ROOT / REGISTRY).read_text())
        case = next(row for row in registry['cases'] if row['id'] == case_id)
        change(case['input'])
        files = {REGISTRY: json.dumps(registry).encode()}
        paths = list((ROOT / 'packages/kernel/src').rglob('*.ts'))
        paths += [ROOT / 'tests/tooling' / name for name in
                  ('identity-probe.mjs', 'work-charge-probe.mjs', 'realm-probe.mjs', 'capture-witness.mjs')]
        for path in paths:
            files[path.relative_to(ROOT).as_posix()] = path.read_bytes()
        files.update(tool.dependency_files(tool.Git(ROOT), subprocess.check_output(
            ['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(), registry['dependencies']))
        if case_id.startswith('realm.'):
            # A literal process emits a known value; this isolates registry consumption from realm policy.
            case['input']['argv'] = ['--eval', 'process.stdout.write(JSON.stringify({marker: 7}))']
            files[REGISTRY] = json.dumps(registry).encode()
        run = tool.run_case(files, case, tool.child_environment(tool.environment_declaration(None))[0])
        return tool.observation(run, case)

    def test_identity_values_consumed(self):
        def change(data):
            data['values'][0] = ['changed', 'input']
        self.assertFalse(self.run_adapter('identity.parts', change)['passed'])

    def test_identity_expected_bytes_consumed(self):
        def change(data):
            data['expected'][0] = 'deliberately wrong'
        self.assertFalse(self.run_adapter('identity.parts', change)['passed'])

    def test_empty_identity_values_are_not_a_passing_probe(self):
        seen = self.run_adapter('identity.parts', lambda data: data.update(values=[]))
        self.assertFalse(seen['passed'])
        self.assertFalse(seen['reached'])

    def test_charge_recipe_consumed(self):
        seen = self.run_adapter('work-charge.array-surplus',
                                lambda data: data['recipe'].update(root_repetitions=5))
        self.assertEqual(seen['visits'], 5)
        self.assertFalse(seen['passed'])

    def test_charge_expected_count_consumed(self):
        seen = self.run_adapter('work-charge.array-surplus', lambda data: data.update(expected_visits=4048))
        self.assertEqual(seen['visits'], 4049)
        self.assertEqual(seen['failures'], ['work-charge.array-surplus.exact-visits'])

    def test_realm_argv_and_recorded_observation_consumed(self):
        seen = self.run_adapter('realm.kernel-lexical-shadow.control',
                               lambda data: data.update(recorded_observation={'marker': 7}))
        self.assertTrue(seen['passed'])
        self.assertEqual(seen['actual'], {'marker': 7})

    def test_capture_values_consumed_as_held_observation(self):
        seen = self.run_adapter('capture.current.Proxy', lambda data: data['recipe'].update(target={'x': 1}))
        self.assertFalse(seen['passed'])
        self.assertEqual(seen['actual'], {'accepted': True, 'canonical': '{"x":1}'})


class AttributionTests(unittest.TestCase):
    def test_held_reproduction_has_no_semantic_credit(self):
        claim = dict(kind='held_witness', owner='BINDING-01', reason='V-ENV remains held',
                     decision='owner decision-02', semantic_credit='passed')
        self.assertEqual(tool.claim_attribution({'claim': claim}), dict(claim, semantic_credit='none'))

    def test_unknown_claim_kind_refused(self):
        with self.assertRaisesRegex(tool.CheckError, 'unknown witness claim kind'):
            tool.claim_attribution({'claim': dict(kind='conformance', owner='owner', reason='reason', decision='decision')})

    def test_non_object_claim_refused(self):
        with self.assertRaisesRegex(tool.CheckError, 'unknown witness claim kind'):
            tool.claim_attribution({'claim': []})

    def test_unattributed_witness_refused(self):
        with self.assertRaisesRegex(tool.CheckError, 'witness needs owner'):
            tool.claim_attribution({'claim': dict(kind='held_witness', owner='', reason='reason', decision='decision')})


if __name__ == '__main__':
    unittest.main()
