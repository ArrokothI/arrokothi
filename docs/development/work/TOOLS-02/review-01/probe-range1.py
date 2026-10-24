"""Independent TOOLS-02 range-1 review probes; run against a clean checkout at C.

Usage: PATH=<Node-26.10-bin>:$PATH python3 -B probe-range1.py /path/to/checkout
Creates and deletes only temporary fixture repositories. No candidate source is patched.
Exit 0 means the assertions below held, including reproduction of T2-R1-READ-01;
it is deliberately a counterexample reproducer, not a passing acceptance test.
"""
import json
from pathlib import Path
import subprocess
import sys

C = 'a6ce515018c2bd59a930b20c762a339089bb0973'
repo = Path(sys.argv[1]).resolve()
assert subprocess.check_output(['git', '-C', str(repo), 'rev-parse', 'HEAD'], text=True).strip() == C
sys.path.insert(0, str(repo / 'tests/tooling'))
import test_read_form as fixture
from test_packet_tools import RepositoryFixture, tool


def pristine_controls():
    f = RepositoryFixture('setUp')
    f.setUp()
    results = {}
    try:
        f.write('.gitignore', 'node_modules/\n.DS_Store\n')
        rev = f.commit('ignore permitted entries')
        results['clean'] = tool.pristine(f.reader, rev)
        results['wrong_head_refused'] = not tool.pristine(f.reader, f.b)
        f.write('sealed.txt', 'modified\n')
        results['unstaged_refused'] = not tool.pristine(f.reader, rev)
        f.git('add', 'sealed.txt')
        results['staged_refused'] = not tool.pristine(f.reader, rev)
        f.git('restore', '--source=HEAD', '--staged', '--worktree', 'sealed.txt')
        (f.root / 'empty').mkdir()
        results['empty_directory_refused'] = not tool.pristine(f.reader, rev)
        (f.root / 'empty').rmdir()
        f.write('node_modules/dep/index.js', 'export {};\n')
        f.write('.DS_Store', 'metadata\n')
        results['permitted_entries_accepted'] = tool.pristine(f.reader, rev)
        assert all(results.values()), results
        return results
    finally:
        f.doCleanups()


class SeededRepository(RepositoryFixture):
    def setUp(self):
        super().setUp()
        # The nested directory exists before the origin pin, so its member is
        # preserved initially; the probe does not start from an already-refused row.
        self.write('tests/fixtures/nested/seed.json', '{}\n')


def recursive_fixture_listing():
    fixture.RepositoryFixture = SeededRepository
    # Keep the existing three-file catalog, with two ordinary named readers.
    # Only the lister reads the nested additions; no other scanner can mask it.
    fixture.MEMBERS['tests/scan/scanner.test.mjs'] = fixture.NAMED
    fixture.MEMBERS['tests/lister/lister.test.mjs'] = fixture.LISTER.replace(
        'import.meta.url)).length', 'import.meta.url), { recursive: true }).length')
    cls = fixture.ReadFormCensusTests
    cls.setUpClass()
    observations = []
    try:
        case = cls('test_a_direct_fixture_listing_changes_with_each_entry_change')
        member = next(row for row in cls.table if row['file'] == 'tests/lister/lister.test.mjs')
        assert member['status'] == 'preserved', member
        original = dict(member)

        def actual_entries():
            js = ("import fs from 'node:fs'; console.log(JSON.stringify("
                  "fs.readdirSync('tests/fixtures', {recursive: true}).sort()));")
            return json.loads(subprocess.check_output(
                ['node', '--input-type=module', '-e', js], cwd=cls.repo.root, text=True))

        previous_entries = actual_entries()
        for name in ('nested/one.json', 'nested/deeper/two.json'):
            result = case.step({'tests/fixtures/' + name: '{}\n'})
            rev = cls.repo.git('rev-parse', 'HEAD')
            assert tool.pristine(cls.repo.reader, rev)
            entries = actual_entries()
            assert entries != previous_entries
            corpus = tool.corpus(cls.repo.reader, rev, 'corpus.json', toolchain=cls.toolchain)
            assert result['result'] == 'table_current', result
            assert result['changed'] == result['added'] == result['removed'] == []
            assert corpus['result'] == 'revalidation_complete'
            stored = json.loads((cls.repo.root / 'corpus.json').read_text())['preserved']
            assert next(row for row in stored if row['member'] == original['member']) == original
            observations.append({'addition': name, 'actual_entries': entries,
                                 'regenerate': result['result'], 'changed_members': result['changed'],
                                 'corpus': corpus['result'], 'member_status': original['status'],
                                 'member_reads_unchanged': True})
            previous_entries = entries

        # Distinguishing positive control: an immediate child is detected.
        direct = case.step({'tests/fixtures/direct.json': '{}\n'})
        assert direct['result'] == 'table_differs'
        assert 'tests/lister/lister.test.mjs' in case.changed_files(direct)
        return {'finding': 'T2-R1-READ-01', 'initial_status': original['status'],
                'recursive_additions': observations,
                'immediate_child_control': direct['result']}
    finally:
        cls.doClassCleanups()


print(json.dumps({'candidate_payload': C, 'pristine_controls': pristine_controls(),
                  'counterexample': recursive_fixture_listing()}, indent=2))
