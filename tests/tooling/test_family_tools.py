"""P1-M family census (design 05 D04-CHK-03, D05-06, D05-CHK-06, D05-CHK-09): members recomputed from pinned
runner bytes, cross-checked with the runner's own count assertions and a complete sealed output."""
import json
import subprocess
import unittest

from test_packet_tools import RepositoryFixture, tool
from test_target_tools import ROOT, pinned_toolchain

RUNNER = """import assert from "node:assert/strict";
const mutations = [
  ["M1 first", "a.ts", "x", "y"],
  ["M2 second", "a.ts", "p", "q"],
];
mutations.push(["M3 third", "a.ts", "r", "s"]);
assert.equal(mutations.length, 3);
for (const mutation of mutations) console.log(`REJECTED ${mutation[0]}: exit=1`);
console.log(`${mutations.length}/${mutations.length} rejected`);
"""
GENERATOR = """const inventory = { "subject.ts": 2 };
const mutations = [["G0 fixed", "a.ts", "x", "y"]];
for (const [file, expected] of Object.entries(inventory)) {
  for (const match of source.matchAll(/site\\((\\w+)\\)/g)) mutations.push([`G site at ${file}:${match[1]}`, file, match[0], "x"]);
}
"""
PYTHON = 'MUTANTS = {\n "Z1-first": ("c.ts", "a", "b"),\n "Z2-second": ("c.ts", "c", "d"),\n}\nfor name in MUTANTS:\n    print(name)\n'
LOOP = 'for (const [name, find] of [["early-mint", "a"], ["early-increment", "b"]]) console.log(name, find);\n'
BINDINGS = "const anchor = 'return ok(view);'; const insert = 'void 0;'; const out = 'read-mutant-suite.txt';\n"


def output(tree, labels, summary='3/3 rejected'):
    return ''.join([f'payload C: {tree}\n', 'command: node runner.mjs\n',
                    *[f'REJECTED {label}: exit=1\n' for label in labels], summary + '\n',
                    'exit: 0; signal: null; error: none\n'])


class FamilyCensusTests(RepositoryFixture):
    toolchain = None

    @classmethod
    def setUpClass(cls):
        cls.toolchain = pinned_toolchain()

    def build(self, files, observed=None):
        self.write(tool.SOURCE_FACTS, (ROOT / tool.SOURCE_FACTS).read_text())
        for path, text in files.items():
            self.write(path, text)
        rows = [{'revision': None, 'path': path, 'line': 1, 'kind': 'runner', 'sha256': tool.digest(text.encode()),
                 'disposition': 'extract'} for path, text in files.items() if path.startswith('runner')]
        self.pin = self.commit('runners')
        if observed is not None:
            self.write('out.txt', observed(self.pin))
        for row in rows:
            row['revision'] = self.pin
        self.document('origins.json', rows)
        catalog = self.commit('catalog')
        self.document('inventory.json', {'version': 1, 'catalogs': [{
            'revision': catalog, 'path': 'origins.json', 'kind': 'artifact', 'count': len(rows),
            'sha256': tool.digest((self.root / 'origins.json').read_bytes())}], 'additional_sources': []})
        self.rev = self.commit('inventory')
        self.origins = {row['path']: row['id'] for row in tool.inventory(self.reader, self.rev, 'inventory.json')['origins']}
        return self.rev

    def family(self, runner='runner.mjs', parts=None, members=('M1 first', 'M2 second', 'M3 third'), **extra):
        census = {'parts': parts if parts is not None else [{'kind': 'structural', 'container': 'mutations'}],
                  'count_assertions': [{'anchor': 'assert.equal(mutations.length, 3);', 'parts': [0]}]}
        census.update(extra.pop('census', {}))
        return {'id': extra.pop('id', 'family.runner'), 'origin': self.origins[runner], 'role': 'runner', 'census': census,
                'members': [{'label': label, 'route': {'kind': 'pending'}} for label in members], **extra}

    def table(self, *families, registry=None, counterexamples=None):
        origins = {row['id']: row for row in tool.inventory(self.reader, self.rev, 'inventory.json')['origins']}
        environment = tool.child_environment(tool.environment_declaration(None))[0]
        return tool.family_table(self.reader, self.rev, list(families), origins, counterexamples or {},
                                 registry or {'cases': []}, environment, self.toolchain)[1]

    def observed(self, **changes):
        spec = {'revision': self.rev, 'path': 'out.txt', 'sha256': tool.digest((self.root / 'out.txt').read_bytes()),
                'tree': self.pin, 'runner_path': 'runner.mjs', 'line': r'^REJECTED (?P<label>.+?): exit=',
                'summary': r'(?P<passed>\d+)/(?P<total>\d+) rejected', 'trailer': r'exit: \d+; signal: \S+; error: .*',
                'names': ['command: node runner.mjs']}
        spec.update(changes)
        return spec

    def test_structural_census_matches_count_assertion_and_sealed_output(self):
        self.build({'runner.mjs': RUNNER}, lambda tree: output(tree, ['M1 first', 'M2 second', 'M3 third']))
        counts = self.table(self.family(observed=self.observed()))
        self.assertEqual(counts['runner'], {'families': 1, 'census_reading': 0, 'occurrences': 3, 'route:pending': 3,
                                            'distinct': 3})

    def test_member_dropped_from_the_list(self):
        self.build({'runner.mjs': RUNNER})
        with self.assertRaisesRegex(tool.CheckError, 'census has 3 members, the family lists 2'):
            self.table(self.family(members=('M1 first', 'M2 second')))

    def test_member_dropped_from_list_and_count_is_caught_by_the_output(self):
        dropped = RUNNER.replace('mutations.push(["M3 third", "a.ts", "r", "s"]);\n', '').replace('length, 3', 'length, 2')
        self.build({'runner.mjs': dropped}, lambda tree: output(tree, ['M1 first', 'M2 second', 'M3 third'], '2/2 rejected'))
        family = self.family(members=('M1 first', 'M2 second'), observed=self.observed(),
                             census={'count_assertions': [{'anchor': 'assert.equal(mutations.length, 2);', 'parts': [0]}]})
        with self.assertRaisesRegex(tool.CheckError, 'observed members differ from the census'):
            self.table(family)

    def test_partial_output_is_refused(self):
        self.build({'runner.mjs': RUNNER}, lambda tree: output(tree, ['M1 first', 'M2 second'], summary='').rstrip() + '\n')
        with self.assertRaisesRegex(tool.CheckError, 'partial output'):
            self.table(self.family(observed=self.observed()))

    def test_summary_total_must_equal_the_census(self):
        self.build({'runner.mjs': RUNNER}, lambda tree: output(tree, ['M1 first', 'M2 second', 'M3 third'], '4/4 rejected'))
        with self.assertRaisesRegex(tool.CheckError, 'another member total'):
            self.table(self.family(observed=self.observed()))

    def test_wrong_container(self):
        self.build({'runner.mjs': RUNNER})
        with self.assertRaisesRegex(tool.CheckError, 'census container absent'):
            self.table(self.family(parts=[{'kind': 'structural', 'container': 'mutants'}]))

    def test_unclassified_addition(self):
        self.build({'runner.mjs': RUNNER + 'for (const extra of []) mutations.push(extra);\n'})
        with self.assertRaisesRegex(tool.CheckError, 'unclassified addition to the container'):
            self.table(self.family())

    def test_unlabelled_element(self):
        self.build({'runner.mjs': RUNNER.replace('["M2 second",', '[label,')})
        with self.assertRaisesRegex(tool.CheckError, 'census element without a label'):
            self.table(self.family())

    def test_count_assertion_disagrees(self):
        self.build({'runner.mjs': RUNNER.replace('length, 3', 'length, 4')})
        family = self.family(census={'count_assertions': [{'anchor': 'assert.equal(mutations.length, 4);', 'parts': [0]}]})
        with self.assertRaisesRegex(tool.CheckError, r'the runner asserts \[4\], the census counts 3'):
            self.table(family)

    def test_undeclared_count_assertion(self):
        self.build({'runner.mjs': RUNNER})
        with self.assertRaisesRegex(tool.CheckError, 'undeclared count assertion'):
            self.table(self.family(census={'count_assertions': []}))

    def test_filter_and_inheritance_bind_the_source_digest(self):
        child = ('import { createHash } from "node:crypto";\n'
                 f'const digest = "{tool.digest(RUNNER.encode())}";\n'
                 'const mutations = all.filter(m => /^M[12] /.test(m[0]));\n')
        self.build({'runner.mjs': RUNNER, 'runner-child.mjs': child})
        source = {'family': 'family.runner', 'digest': tool.digest(RUNNER.encode())}
        part = {'kind': 'structural', 'container': 'mutations',
                'initializer': {'kind': 'filter', 'source': source, 'container': 'mutations', 'pattern': '^M[12] '}}
        filtered = self.family('runner-child.mjs', [part], ('M1 first', 'M2 second'), id='family.child', census={'count_assertions': []})
        counts = self.table(self.family(), filtered)
        self.assertEqual((counts['runner']['inherited'], counts['runner']['distinct']), (2, 3))
        absent = dict(part, initializer=dict(part['initializer'], pattern='^M[13] '))
        with self.assertRaisesRegex(tool.CheckError, 'filter regex absent from the runner'):
            self.table(self.family(), self.family('runner-child.mjs', [absent], ('M1 first', 'M3 third'), id='family.child',
                                                  census={'count_assertions': []}))
        stale = dict(part, initializer=dict(part['initializer'], source=dict(source, digest='0' * 64)))
        with self.assertRaisesRegex(tool.CheckError, 'census source digest differs'):
            self.table(self.family(), self.family('runner-child.mjs', [stale], ('M1 first', 'M2 second'), id='family.child',
                                                  census={'count_assertions': []}))

    def test_generator_counts_the_runner_regex_at_its_input_revision(self):
        files = {'runner-gen.mjs': GENERATOR, 'subject.ts': 'site(alpha); site(beta);\n'}
        self.build(files)
        generator = {'statement': 3, 'pattern': r'site\((\w+)\)', 'count_anchor': 'const inventory = { "subject.ts": 2 };',
                     'inputs': [{'path': 'subject.ts', 'count': 2}], 'input_revision': self.pin,
                     'label_contains': 'at {file}:{group}'}
        part = {'kind': 'structural', 'container': 'mutations', 'generators': [generator]}
        members = ('G0 fixed', 'G1 site at subject.ts:alpha', 'G2 site at subject.ts:beta')
        family = self.family('runner-gen.mjs', [part], members, census={'count_assertions': []})
        self.assertEqual(self.table(family)['runner']['occurrences'], 3)
        with self.assertRaisesRegex(tool.CheckError, 'generated member label lacks its site'):
            self.table(self.family('runner-gen.mjs', [part], ('G0 fixed', 'G1 site at subject.ts:beta', 'G2 site at subject.ts:alpha'),
                                   census={'count_assertions': []}))
        wrong = dict(generator, inputs=[{'path': 'subject.ts', 'count': 3}], count_anchor='const inventory = { "subject.ts": 2 };')
        with self.assertRaisesRegex(tool.CheckError, 'generator counts differ from the runner literal'):
            self.table(self.family('runner-gen.mjs', [dict(part, generators=[wrong])], members, census={'count_assertions': []}))

    def test_python_loop_and_binding_censuses(self):
        self.build({'runner.py': PYTHON, 'runner-loop.mjs': LOOP, 'runner-bind.mjs': BINDINGS})
        families = [
            self.family('runner.py', [{'kind': 'python_ast', 'container': 'MUTANTS'}], ('Z1-first', 'Z2-second'), id='f.py',
                        census={'count_assertions': []}),
            self.family('runner-loop.mjs', [{'kind': 'loop', 'line': 1}], ('early-mint', 'early-increment'), id='f.loop',
                        census={'count_assertions': []}),
            self.family('runner-bind.mjs', [{'kind': 'bindings', 'names': ['anchor', 'insert'], 'label': 'read-mutant'}],
                        ('read-mutant',), id='f.bind', census={'count_assertions': []})]
        self.assertEqual(self.table(*families)['runner']['occurrences'], 5)
        absent = dict(families[2], census={'parts': [{'kind': 'bindings', 'names': ['anchor'], 'label': 'not carried'}]})
        with self.assertRaisesRegex(tool.CheckError, 'label the runner carries'):
            self.table(absent)

    def test_census_reading_needs_its_reason(self):
        self.build({'runner.mjs': RUNNER})
        family = self.family(members=('X1 read',))
        family['census'] = {'reading': ' '}
        with self.assertRaisesRegex(tool.CheckError, 'census: reading needs its reason'):
            self.table(family)
        family['census'] = {'reading': 'selected by argv'}
        self.assertEqual(self.table(family)['runner']['census_reading'], 1)

    def test_equivalence_and_survivor_routes_never_count_as_kills(self):
        self.build({'runner.mjs': RUNNER})
        family = self.family()
        family['members'][0]['route'] = {'kind': 'equivalence', 'argument': 'The bound is applied again downstream.'}
        family['members'][1]['route'] = {'kind': 'survivor', 'finding': 'A missed site.', 'owner': 'K1.1-correction-03'}
        counts = self.table(family)['runner']
        self.assertEqual((counts['route:equivalence'], counts['route:survivor'], counts.get('route:mutation', 0)), (1, 1, 0))
        family['members'][2]['route'] = {'kind': 'equivalence', 'argument': ''}
        with self.assertRaisesRegex(tool.CheckError, 'needs its argument'):
            self.table(family)

    def test_mutation_route_needs_a_mutant_registered_to_this_member(self):
        self.build({'runner.mjs': RUNNER})
        family = self.family()
        family['members'][0]['route'] = {'kind': 'mutation', 'case': 'case', 'mutant': 'm1'}
        registry = {'cases': [{'id': 'case', 'mutants': [{'id': 'm1', 'obligation': 'family.runner#M1'}]}]}
        self.assertEqual(self.table(family, registry=registry)['runner']['route:mutation'], 1)
        registry['cases'][0]['mutants'][0]['obligation'] = 'family.runner#M2'
        with self.assertRaisesRegex(tool.CheckError, 'obligation is this member'):
            self.table(family, registry=registry)

    def test_reuse_links_name_an_existing_member(self):
        self.build({'runner.mjs': RUNNER, 'runner-two.mjs': RUNNER})
        second = self.family('runner-two.mjs', id='family.two')
        second['members'][0]['reuses'] = {'family': 'family.runner', 'label': 'M1 first'}
        counts = self.table(self.family(), second)['runner']
        self.assertEqual((counts['reused'], counts['distinct']), (1, 5))
        second['members'][0]['reuses'] = {'family': 'family.runner', 'label': 'M9 absent'}
        with self.assertRaisesRegex(tool.CheckError, 'reuse link names an existing member'):
            self.table(self.family(), second)


class RepositoryFamilyTests(unittest.TestCase):
    """D05-CHK-09 on the pinned records: the crashed validation-08/27 run of ablations-03 is not a complete output."""

    def test_the_partial_validation_08_output_is_refused(self):
        reader = tool.Git(ROOT)
        rev = subprocess.check_output(['git', '-C', str(ROOT), 'rev-parse', 'HEAD'], text=True).strip()
        manifest = json.loads((ROOT / 'tests/fixtures/packet-tools/adoption.json').read_text())
        families = {row['id']: row for row in manifest['families']}
        sealed, family = families['family.k12c1.review-04'], dict(families['family.k12c1.ablations-03'])
        partial = 'docs/development/work/K1.2-correction-01/validation-08/27-revision4-ablations.txt'
        family['observed'] = dict(family['observed'], path=partial, tree='81dca4575ea56cfdde5b5f8ed72c439c7ec31821',
                                  sha256=tool.digest(reader.blob(family['observed']['revision'], partial)))
        origins = {row['id']: row for row in tool.inventory(reader, rev, manifest['inventory'])['origins']}
        environment = tool.child_environment(tool.environment_declaration(None))[0]
        with self.assertRaisesRegex(tool.CheckError, 'partial output'):
            tool.family_table(reader, rev, [sealed, family], origins, {}, {'cases': []}, environment, pinned_toolchain())
