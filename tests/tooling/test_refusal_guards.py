"""Malformed independent inputs for TOOLS-01's public evidence boundaries."""
import copy
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from unittest.mock import patch
import test_packet_tools as base
import test_corpus_tools as corpus_tests
import test_research_tools as research_tests
import test_adoption_format as format_tests
import test_target_tools as target_tests
import test_runner_targets as runner_tests
import test_family_tools as family_tests

tool = base.tool


class RefusalGuardTests(base.RepositoryFixture):
    def refuses(self, fragment, call):
        error = None
        try:
            call()
        except Exception as exc:
            error = exc
        self.assertIsInstance(error, tool.CheckError, f'expected declared refusal {fragment}, observed {error!r}')
        self.assertIn(fragment, str(error))

    def edit(self, path, change):
        data = json.loads((self.root / path).read_text())
        change(data)
        self.document(path, data)
        return self.commit('malformed input')

    def test_path_empty(self):
        self.refuses('nonempty', lambda: tool.path_name(''))

    def test_text_list_type(self):
        self.refuses('text list', lambda: tool.unique_text([42], 'list'))

    def test_schema_version(self):
        self.document('spec.json', {'version': 999})
        rev = self.commit('schema')
        self.refuses('unsupported schema', lambda: self.reader.document(rev, 'spec.json'))

    def test_source_tree_empty(self):
        self.refuses('empty source tree', lambda: self.reader.files(self.b, 'absent'))

    def test_blob_missing_returns_declared_refusal(self):
        self.refuses('missing regular source', lambda: self.reader.blob(self.b, 'missing.txt'))

    def test_git_command_failure(self):
        self.refuses('git rev-parse', lambda: self.reader.run('rev-parse', '--verify', 'refs/heads/does-not-exist'))

    def test_administrative_allowlist_empty(self):
        c, h = self.candidate_pair(administrative_files=[])
        self.refuses('must not be empty', lambda: tool.candidate(self.reader, c, h, 'spec.json'))

    def test_evidence_owner_invalid(self):
        c, h = self.candidate_pair(evidence=[{'at': 'checkout', 'path': 'sealed.txt'}])
        self.refuses('must name payload', lambda: tool.candidate(self.reader, c, h, 'spec.json'))

    def test_fence_position(self):
        self.refuses('invalid fence line', lambda: tool.fenced_bytes(b'plain\n', 0))

    def test_fence_opening(self):
        self.refuses('not an opening', lambda: tool.fenced_bytes(b'plain\n', 1))

    def inventory_change(self, change, message):
        base.InventoryTests.fixture(self)
        rev = self.edit('inventory.json', change)
        self.refuses(message, lambda: tool.inventory(self.reader, rev, 'inventory.json'))

    def test_catalog_digest(self):
        self.inventory_change(lambda d: d['catalogs'][0].update(sha256='0'*64), 'catalog source digest')

    def test_catalog_kind(self):
        self.inventory_change(lambda d: d['catalogs'][0].update(kind='unknown'), 'unknown catalog kind')

    def test_origin_line(self):
        rev = base.InventoryTests.fixture(self, lambda a, m: a[0].update(line=0))
        self.refuses('invalid origin line', lambda: tool.inventory(self.reader, rev, 'inventory.json'))

    def test_additional_digest(self):
        def change(d):
            d['additional_sources'] = [dict(revision=self.b, path='sealed.txt', sha256='0'*64)]
        self.inventory_change(change, 'additional source digest')

    def test_additional_duplicate(self):
        def change(d):
            row = dict(revision=self.b, path='sealed.txt', sha256=tool.digest((self.root/'sealed.txt').read_bytes()), disposition='record')
            d['additional_sources'] = [row, row]
        self.inventory_change(change, 'duplicate origin')

    def test_mapping_destination(self):
        rev = base.InventoryTests.fixture(self)
        key = tool.inventory(self.reader, rev, 'inventory.json')['origins'][0]['id']
        rev = self.edit('inventory.json', lambda d: d.update(mappings=[dict(origin=key,status='proposed',rationale='retained',destination='')]))
        self.refuses('mapping needs destination', lambda: tool.inventory(self.reader, rev, 'inventory.json'))

    def test_proposed_mapping_unknown_origin(self):
        self.inventory_change(lambda d: d.update(mappings=[dict(origin='unknown',status='proposed',
                              rationale='independent malformed input',destination='test')]), 'missing or duplicate mapping')

    def corpus_change(self, change, message, path='corpus.json'):
        corpus_tests.CorpusTests.fixture(self)
        rev = self.edit(path, change)
        self.refuses(message, lambda: tool.corpus(self.reader, rev, 'corpus.json'))

    def test_mapping_rationale(self):
        self.corpus_change(lambda d:d['mappings'][0].update(rationale=''), 'mapping needs rationale')

    def test_mapping_status(self):
        self.corpus_change(lambda d:d['mappings'][0].update(status='accepted'), 'unknown adoption status')

    def test_mapping_cases_duplicate(self):
        self.corpus_change(lambda d:d['cases'].append(d['cases'][0]), 'duplicate case ID', 'registry.json')

    def test_suite_duplicate(self):
        self.corpus_change(lambda d:d['suites'].append(d['suites'][0]), 'duplicate suite ID')

    def test_suite_empty(self):
        self.corpus_change(lambda d:d['suites'][0].update(files=[]), 'suite has no source')

    def test_suite_command(self):
        self.corpus_change(lambda d:d['suites'][0].update(command=''), 'suite needs verification')

    def test_duplicate_destination(self):
        self.corpus_change(lambda d:d['mappings'][0].update(status='duplicate',target='absent'), 'duplicate target absent')

    def test_duplicate_mapping_cycle(self):
        def change(d):
            for index in range(2):
                d['mappings'][index].update(status='duplicate',target=d['mappings'][1-index]['origin'])
        self.corpus_change(change, 'cyclic duplicate mapping')

    def test_mapping_targets_empty(self):
        self.corpus_change(lambda d:d['mappings'][0].update(status='case',targets=[]), 'mapping needs targets')

    def coverage_change(self, change, message):
        fixture = research_tests.CoverageTests();fixture.fixture()
        change(fixture.spec,fixture.registry)
        self.refuses(message, lambda: tool.coverage_manifest(fixture.spec, fixture.registry))

    def test_coverage_cases_duplicate(self):
        self.coverage_change(lambda d,r:r['cases'].append(r['cases'][0]), 'unique nonempty cases')

    def test_coverage_families_empty(self):
        self.coverage_change(lambda d,r:d.update(families=[]), 'no families')

    def test_coverage_domains_empty(self):
        self.coverage_change(lambda d,r:d['families'][0].update(domains={}), 'declared domains')

    def test_coverage_product_bound(self):
        self.coverage_change(lambda d,r:d['families'][0].update(domains={'a':[str(i) for i in range(101)],'b':[str(i) for i in range(101)]}), 'bounded profile')

    def test_coverage_unknown_case(self):
        self.coverage_change(lambda d,r:d['families'][0]['cases'][0].update(case='absent'), 'family case')

    def test_coverage_missing_dimension(self):
        self.coverage_change(lambda d,r:d['families'][0]['cases'][0]['values'].pop('stage'), 'dimensions differ')

    def test_coverage_duplicate_coordinates(self):
        def change(d,r):
            r['cases'].append(dict(r['cases'][0],id='second'))
            d['families'][0]['cases'].append(dict(d['families'][0]['cases'][0],case='second'))
        self.coverage_change(change,'duplicate family coordinates')

    def test_coverage_categories_empty(self):
        self.coverage_change(lambda d,r:d.update(negative_categories=[]),'categories must be declared')

    def test_coverage_category_unknown(self):
        self.coverage_change(lambda d,r:r['cases'][0].update(category='unknown'),'undeclared negative category')

    def dependency_change(self, change, message):
        rev, dep = corpus_tests.DependencyTests.fixture(self)
        change(dep)
        self.refuses(message,lambda:tool.dependency_files(self.reader,rev,[dep]))

    def test_dependency_location(self):
        self.dependency_change(lambda d:d.update(path='vendor/example'),'must be under node_modules')

    def test_dependency_manifest_missing(self):
        self.dependency_change(lambda d:d['files'].pop('package.json'),'needs package.json')

    def test_dependency_file_missing(self):
        self.dependency_change(lambda d:(self.root/'node_modules/example/index.js').unlink(),'missing dependency file')

    def test_dependency_installed_version(self):
        def change(d):
            self.document('node_modules/example/package.json',{'version':'2.0.0'})
            d['files']['package.json']=tool.digest((self.root/'node_modules/example/package.json').read_bytes())
        self.dependency_change(change,'installed dependency version mismatch')

    def test_command_argv(self):
        self.refuses('needs argv',lambda:tool.command([],self.root,1,100,{}))

    def test_command_timeout(self):
        self.refuses('timeout must',lambda:tool.command(['true'],self.root,0,100,{}))

    def test_command_output_bound(self):
        self.refuses('output cap',lambda:tool.command(['true'],self.root,1,0,{}))

    def test_command_host(self):
        with patch.object(tool.os,'name','nt'):
            self.refuses('POSIX',lambda:tool.command(['true'],self.root,1,100,{}))

    def observation_change(self,change,message):
        value=dict(case='case',assertion='a',passed=True,reached=True)
        run=dict(status='finished',exit=0)
        change(run,value);run['output']=json.dumps(value)
        self.refuses(message,lambda:tool.observation(run,dict(id='case',assertion='a',failure_exit=17)))

    def test_observation_unfinished(self):
        self.observation_change(lambda r,v:r.update(status='timeout'),'did not finish')

    def test_observation_wrong_case(self):
        self.observation_change(lambda r,v:v.update(case='other'),'wrong case')

    def test_observation_false_named_failures(self):
        self.observation_change(lambda r,v:v.update(failures=['contradiction']),'failures disagree')

    def runner_change(self,change,message):
        base.RunnerTests.fixture(self)
        rev=self.edit('registry.json',change)
        self.refuses(message,lambda:tool.mutations(self.reader,rev,'registry.json'))

    def test_runner_duplicate_case(self):
        self.runner_change(lambda d:d['cases'].append(d['cases'][0]),'duplicate case ID')

    def test_runner_failure_exit(self):
        self.runner_change(lambda d:d['cases'][0].update(failure_exit=0),'invalid failure exit')

    def test_runner_duplicate_mutation(self):
        self.runner_change(lambda d:d['cases'][0]['mutants'].append(d['cases'][0]['mutants'][0]),'conflicting mutant ID')

    def test_runner_mutation_target(self):
        self.runner_change(lambda d:d['cases'][0]['mutants'][0].update(path='absent.py'),'mutation target absent')

    def test_runner_unchanged_mutation(self):
        self.runner_change(lambda d:d['cases'][0]['mutants'][0].update(after='result = 1'),'must change text')

    def test_runner_empty_registry(self):
        self.runner_change(lambda d:d.update(cases=[]),'registry has no cases')

    def test_runner_empty_mutations(self):
        self.runner_change(lambda d:d['cases'][0].update(mutants=[]),'registry has no mutations')

    def test_runner_missing_repeat_sample(self):
        self.runner_change(lambda d:d.update(determinism_sample=['absent']),'sample names absent')

    def test_verification_empty(self):
        self.document('verify.json',dict(version=1,checks=[]))
        rev=self.commit('empty verifier')
        self.refuses('verification has no checks',lambda:tool.verify(self.reader,rev,'verify.json'))

    # Design 05 step 2: declared environments, the environment census and pinned snapshot inputs.
    def test_environment_unknown_field(self):
        self.refuses('unknown fields', lambda: tool.environment_declaration({'inherit': True}))

    def test_environment_set_text(self):
        self.refuses('set values must be text', lambda: tool.environment_declaration({'set': {'LANG': 1}}))

    def test_environment_absent_effect(self):
        self.refuses('need an effect', lambda: tool.environment_declaration({'absent': [{'name': 'NODE_OPTIONS'}]}))

    def test_environment_name_twice(self):
        self.refuses('declared twice', lambda: tool.environment_declaration({'pass': ['PATH'], 'set': {'PATH': '/bin'}}))

    def test_environment_input_collision(self):
        declaration = tool.environment_declaration(None)
        self.refuses('input environment name already declared',
                     lambda: tool.child_environment(declaration, {'PATH': '/tmp'}))

    def test_command_environment(self):
        self.refuses('declared environment', lambda: tool.command(['true'], self.root, 1, 100, None))

    def census_spec(self, census, source='const x = 1;\n', inputs=None):
        self.write('tests/read.mjs', source)
        spec = {'version': 1, 'limits': ['Fixture evidence only'], 'checks': [{'id': 'unit', 'argv': ['true'],
                'timeout_seconds': 5, 'output_limit_bytes': 100}],
                'environment': {'pass': ['PATH', 'HOME', 'TMPDIR'], 'set': {'LANG': 'C.UTF-8'}, 'census': census}}
        if inputs is not None:
            spec['inputs'] = inputs
        self.document('verify.json', spec)
        return self.commit('census spec')

    def test_census_roots(self):
        rev = self.census_spec({'roots': []})
        self.refuses('needs declared roots', lambda: tool.verify(self.reader, rev, 'verify.json'))

    def test_census_computed_fields(self):
        rev = self.census_spec({'roots': ['tests'], 'computed': [{'path': 'tests/read.mjs'}]})
        self.refuses('needs path, text and reason', lambda: tool.verify(self.reader, rev, 'verify.json'))

    def test_census_computed_twice(self):
        row = {'path': 'tests/read.mjs', 'text': 'const all = { ...process.env };', 'reason': 'fixture'}
        rev = self.census_spec({'roots': ['tests'], 'computed': [row, row]}, 'const all = { ...process.env };\n')
        self.refuses('declared twice', lambda: tool.verify(self.reader, rev, 'verify.json'))

    def test_census_undeclared_name(self):
        rev = self.census_spec({'roots': ['tests']}, 'const gate = process.env.TOOLS01_GATE;\n')
        self.refuses('undeclared environment read', lambda: tool.verify(self.reader, rev, 'verify.json'))

    def test_census_undeclared_computed(self):
        rev = self.census_spec({'roots': ['tests']}, 'const all = { ...process.env };\n')
        self.refuses('needs a declaration', lambda: tool.verify(self.reader, rev, 'verify.json'))

    def test_census_stale_computed(self):
        rev = self.census_spec({'roots': ['tests'], 'computed': [
            {'path': 'tests/read.mjs', 'text': 'const all = { ...process.env };', 'reason': 'fixture'}]})
        self.refuses('stale computed', lambda: tool.verify(self.reader, rev, 'verify.json'))

    def snapshot(self):
        directory = Path(self.tmp.name + '-snapshot')
        directory.mkdir()
        self.addCleanup(shutil.rmtree, directory, True)
        tool.snapshot_input(self.reader, {'id': 'x', 'revision': self.b}, directory)
        return directory

    def test_snapshot_unsupported_entry(self):
        self.git('update-index', '--add', '--cacheinfo', '160000,' + self.b + ',submodule')
        self.git('commit', '-qm', 'gitlink')
        rev = self.git('rev-parse', 'HEAD')
        directory = Path(self.tmp.name + '-gitlink')
        directory.mkdir()
        self.addCleanup(shutil.rmtree, directory, True)
        self.refuses('unsupported entry', lambda: tool.verify_snapshot(self.reader, rev, directory))

    def test_snapshot_paths(self):
        directory = self.snapshot()
        (directory / 'extra').write_text('extra')
        self.refuses('paths differ', lambda: tool.verify_snapshot(self.reader, self.b, directory))

    def test_snapshot_entry_kind(self):
        directory = self.snapshot()
        (directory / 'sealed.txt').unlink()
        (directory / 'sealed.txt').symlink_to('source.md')
        self.refuses('entry kind differs', lambda: tool.verify_snapshot(self.reader, self.b, directory))

    def test_snapshot_bytes(self):
        directory = self.snapshot()
        (directory / 'sealed.txt').write_text('changed\n')
        self.refuses('bytes differ', lambda: tool.verify_snapshot(self.reader, self.b, directory))

    def test_snapshot_extraction(self):
        real = subprocess.run

        def failing_tar(argv, *args, **kwargs):
            return subprocess.CompletedProcess(argv, 1, b'', b'') if argv[0] == 'tar' else real(argv, *args, **kwargs)
        directory = Path(self.tmp.name + '-extraction')
        directory.mkdir()
        self.addCleanup(shutil.rmtree, directory, True)
        with patch.object(tool.subprocess, 'run', side_effect=failing_tar):
            self.refuses('extraction failed', lambda: tool.snapshot_input(self.reader, {'id': 'x', 'revision': self.b}, directory))

    def test_input_shape(self):
        rev = self.census_spec({'roots': ['tests']}, inputs=[{'id': 'x', 'kind': 'tarball', 'environment': 'X'}])
        self.refuses('git_snapshot kind', lambda: tool.verify(self.reader, rev, 'verify.json'))

    def test_input_twice(self):
        row = {'id': 'x', 'kind': 'git_snapshot', 'revision': self.b, 'environment': 'X'}
        rev = self.census_spec({'roots': ['tests']}, inputs=[row, dict(row, environment='Y')])
        self.refuses('input declared twice', lambda: tool.verify(self.reader, rev, 'verify.json'))

    def test_input_environment_collision(self):
        rev = self.census_spec({'roots': ['tests']}, inputs=[
            {'id': 'x', 'kind': 'git_snapshot', 'revision': self.b, 'environment': 'PATH'}])
        self.refuses('input environment name already declared', lambda: tool.verify(self.reader, rev, 'verify.json'))

    def fake_node(self, output):
        directory = Path(self.tmp.name + '-node')
        directory.mkdir(exist_ok=True)
        self.addCleanup(shutil.rmtree, directory, True)
        node = directory / 'node'
        node.write_text('#!/bin/sh\necho ' + output + '\n')
        node.chmod(0o755)
        return {'PATH': str(directory) + os.pathsep + os.environ.get('PATH', '')}

    def test_node_version_unreadable(self):
        environment = self.fake_node('unreadable')
        self.refuses('node --version failed', lambda: tool.node_version(environment, self.root))

    def test_node_below_floor(self):
        environment = self.fake_node('v22.9.0')
        self.refuses('below the v26.10.0 floor', lambda: tool.node_version(environment, self.root))

    def test_step_input_undeclared(self):
        self.write('tests/read.mjs', 'const x = 1;\n')
        self.document('verify.json', {'version': 1, 'limits': ['Fixture evidence only'], 'checks': [
            {'id': 'unit', 'argv': ['true'], 'inputs': ['absent'], 'timeout_seconds': 5, 'output_limit_bytes': 100}],
            'environment': {'pass': ['PATH', 'HOME', 'TMPDIR'], 'set': {'LANG': 'C.UTF-8'}, 'census': {'roots': ['tests']}}})
        rev = self.commit('undeclared input')
        self.refuses('undeclared input', lambda: tool.verify(self.reader, rev, 'verify.json'))

    def test_step_input_changed(self):
        self.write('tests/read.mjs', 'const x = 1;\n')
        self.write('change.py', 'import os\nopen(os.path.join(os.environ["X"], "sealed.txt"), "w").write("changed")\n')
        self.document('verify.json', {'version': 1, 'limits': ['Fixture evidence only'], 'checks': [
            {'id': 'unit', 'argv': [sys.executable, '-B', 'change.py'], 'inputs': ['x'], 'timeout_seconds': 10,
             'output_limit_bytes': 100}],
            'inputs': [{'id': 'x', 'kind': 'git_snapshot', 'revision': self.b, 'environment': 'X'}],
            'environment': {'pass': ['PATH', 'HOME', 'TMPDIR'], 'set': {'LANG': 'C.UTF-8'}, 'census': {'roots': ['tests']}}})
        rev = self.commit('changing input')
        self.refuses('snapshot input changed during unit', lambda: tool.verify(self.reader, rev, 'verify.json'))

    # Design 05 step 3: catalog declarations, glob selection and catalog events.
    def catalog_spec(self, catalog, script='node --test tests/*.test.mjs', files=('tests/a.test.mjs',)):
        for name in files:
            self.write(name, "import { test } from 'node:test';\ntest('a', () => {});\n")
        self.document('package.json', {'type': 'module', 'scripts': {'test': script}})
        self.document('verify.json', {'version': 1, 'limits': ['Fixture evidence only'], 'checks': [
            {'id': 'repository-tests', 'catalog': catalog, 'timeout_seconds': 30, 'output_limit_bytes': 65536}],
            'environment': {'pass': ['PATH', 'HOME', 'TMPDIR'], 'set': {'LANG': 'C.UTF-8'}, 'census': {'roots': ['tests']}}})
        return self.commit('catalog spec')

    CATALOG = {'script': 'test', 'script_text': 'node --test tests/*.test.mjs', 'flags': ['--test'],
               'globs': ['tests/*.test.mjs']}

    def test_catalog_declaration_shape(self):
        rev = self.catalog_spec({'flags': ['--test'], 'globs': ['tests/*.test.mjs']})
        self.refuses('package script and its text', lambda: tool.catalog_declaration(
            self.reader, rev, {'catalog': {'flags': ['--test'], 'globs': ['tests/*.test.mjs']}}))

    def test_catalog_flags(self):
        rev = self.catalog_spec(self.CATALOG)
        catalog = dict(self.CATALOG, flags=['--test', '--test-reporter=tap'])
        self.refuses('without their own reporter or selection',
                     lambda: tool.catalog_declaration(self.reader, rev, {'catalog': catalog}))

    def test_catalog_script_drift(self):
        rev = self.catalog_spec(self.CATALOG, script='node --test tests/*.test.mjs tests/b.test.mjs')
        self.refuses('catalog script drift', lambda: tool.catalog_declaration(self.reader, rev, {'catalog': self.CATALOG}))

    def test_catalog_glob_shape(self):
        rev = self.catalog_spec(self.CATALOG)
        self.refuses('relative single-segment pattern', lambda: tool.expand_globs(self.reader, rev, ['tests/**/*.mjs']))

    def test_catalog_glob_empty(self):
        rev = self.catalog_spec(self.CATALOG)
        self.refuses('matches no file', lambda: tool.expand_globs(self.reader, rev, ['tests/*.spec.mjs']))

    def test_catalog_glob_twice(self):
        rev = self.catalog_spec(self.CATALOG)
        self.refuses('select a file twice', lambda: tool.expand_globs(self.reader, rev, ['tests/*.test.mjs', 'tests/a.*']))

    SUMMARY = [{'type': 'summary', 'label': label, 'count': 0} for label in
               ('tests', 'suites', 'pass', 'fail', 'cancelled', 'skipped', 'todo')]

    def test_catalog_summary_duplicate(self):
        self.refuses('malformed or duplicate catalog summary',
                     lambda: tool.catalog_tree(self.SUMMARY + self.SUMMARY[:1], Path('/repo'), []))

    def test_catalog_event_shape(self):
        self.refuses('malformed catalog event',
                     lambda: tool.catalog_tree(self.SUMMARY + [{'type': 'test:pass', 'file': None}], Path('/repo'), []))

    def test_catalog_event_outside(self):
        row = {'type': 'test:pass', 'file': '/elsewhere/a.test.mjs', 'name': 'a', 'line': 1, 'column': 1, 'nesting': 0}
        self.refuses('outside the checkout', lambda: tool.catalog_tree(self.SUMMARY + [row], Path('/repo'), []))

    def test_catalog_summary_incomplete(self):
        self.refuses('catalog summary incomplete', lambda: tool.catalog_tree(self.SUMMARY[1:], Path('/repo'), []))

    # Design 05 step 4: adoption format 2 and its reconciliation with the pinned format-1 manifest.
    def format_two(self, change=None, legacy_change=None):
        rev = format_tests.FormatTwoTests.fixture(self, change, legacy_change)
        return lambda: tool.corpus(self.reader, rev, 'corpus.json')

    def test_format_two_source_shape(self):
        self.refuses('pinned format-1 source', self.format_two(lambda d: d['migration']['source'].update(format=2)))

    def test_format_two_source_digest(self):
        self.refuses('format-1 source digest', self.format_two(lambda d: d['migration']['source'].update(sha256='0' * 64)))

    def test_format_two_source_version(self):
        self.refuses('not format 1', self.format_two(legacy_change=lambda legacy: legacy.update(version=3)))

    def test_format_two_record_ids(self):
        self.refuses('records need text IDs', self.format_two(lambda d: d['origins'][0].pop('id')))

    def test_format_two_duplicate_record(self):
        self.refuses('duplicate record ID', self.format_two(lambda d: d['origins'].append(dict(d['origins'][1]))))

    def test_format_two_holds_object(self):
        self.refuses('holds table must be an object', self.format_two(lambda d: d.update(holds=[])))

    def test_format_two_hold_owner(self):
        self.refuses('owner and decisions', self.format_two(lambda d: d['holds']['claims'][0].update(owner='')))

    def test_format_two_tables(self):
        self.refuses('every adoption table', self.format_two(lambda d: d.pop('areas')))

    def test_format_two_every_origin(self):
        self.refuses('every origin', self.format_two(lambda d: d['origins'].pop()))

    def test_format_two_legacy_cover(self):
        self.refuses('does not cover the inventory', self.format_two(legacy_change=lambda legacy: legacy['mappings'].pop()))

    def test_format_two_state(self):
        self.refuses('unknown origin state', self.format_two(lambda d: d['origins'][1].update(state='accepted')))

    def test_format_two_closure(self):
        self.refuses('prose triage is not implemented', self.format_two(lambda d: d['origins'][1].update(state='triaged')))

    def test_format_two_empty_tables(self):
        self.refuses('areas are not implemented', self.format_two(lambda d: d.update(areas=[{'id': 'x'}])))

    def test_format_two_unmapped_revalidation(self):
        self.refuses('only a revision-2 mapping', self.format_two(lambda d: d['origins'][1].update(state='pending_revalidation')))

    def test_format_two_legacy_equal(self):
        self.refuses('differs from the format-1 source', self.format_two(lambda d: d['origins'][0]['legacy'].update(rationale='x')))

    def test_format_two_no_regression(self):
        self.refuses('cannot return to pending', self.format_two(lambda d: d['origins'][0].update(state='pending')))

    # Design 05 step 5: source facts, reach and suite targets.
    TARGET = {'id': 't', 'counterexample': 'cx', 'command': 'repository-tests', 'file': 'tests/a.test.mjs',
              'test_path': ['s', 'a'], 'declaration': {'line': 1, 'column': 1},
              'input_anchors': [{'anchor': 'x', 'sha256': tool.digest(b'x'), 'computed': True}],
              'assertion_anchors': [{'anchor': 'y', 'sha256': tool.digest(b'y')}],
              'relation': {'kind': 'exact_input'}, 'discrimination': {'reading': 'trace'}}

    def target_refuses(self, fragment, change):
        target = copy.deepcopy(self.TARGET)
        change(target)
        self.refuses(fragment, lambda: tool.target_record(target, {'cx': {'kind': 'behavior'}}))

    def test_target_fields(self):
        self.target_refuses('suite target needs', lambda t: t.pop('relation'))

    def test_target_counterexample(self):
        self.target_refuses('unknown counterexample', lambda t: t.update(counterexample='other'))

    def test_target_path(self):
        self.target_refuses('full test path', lambda t: t.update(test_path=[]))

    def test_target_declaration(self):
        self.target_refuses('declaration line and column', lambda t: t.update(declaration={'line': 1}))

    def test_target_relation(self):
        self.target_refuses('authorized_replacement with its decision', lambda t: t.update(relation={'kind': 'authorized_replacement'}))

    def test_target_anchor_counts(self):
        self.target_refuses('one input anchor', lambda t: t.update(input_anchors=[]))

    def test_target_discrimination(self):
        self.target_refuses('one registered mutation or one reading', lambda t: t.update(discrimination={}))

    def test_target_anchor_digest(self):
        self.target_refuses('its text and SHA-256', lambda t: t['assertion_anchors'][0].update(sha256='0' * 64))

    def test_counterexample_kind(self):
        self.refuses('unknown counterexample kind', lambda: tool.counterexample_table(
            [{'id': 'c', 'kind': 'other', 'origins': ['o'], 'required_result': 'r'}], ['o']))

    def test_counterexample_origins(self):
        self.refuses('needs known origins', lambda: tool.counterexample_table(
            [{'id': 'c', 'kind': 'behavior', 'origins': ['unknown'], 'required_result': 'r'}], ['o']))

    def test_counterexample_result(self):
        self.refuses('needs its required result', lambda: tool.counterexample_table(
            [{'id': 'c', 'kind': 'behavior', 'origins': ['o'], 'required_result': ' '}], ['o']))

    def test_typescript_pin(self):
        self.document('tests/fixtures/packet-tools/mutations.json', {'version': 1, 'cases': [], 'dependencies': []})
        rev = self.commit('no TypeScript pin')
        self.refuses('pin exactly one TypeScript subset', lambda: tool.typescript_toolchain(self.reader, rev))

    def broken_tool(self, path, text):
        self.write(path, text)
        rev = self.commit('broken tool')
        environment = tool.child_environment(tool.environment_declaration(None))[0]
        return rev, environment

    def test_source_facts_failure(self):
        rev, environment = self.broken_tool('tests/tooling/source-facts.mjs', 'process.exit(3);\n')
        self.refuses('source facts failed', lambda: tool.source_facts(self.reader, rev, [{'op': 'x'}], environment, {}))

    def test_source_facts_result(self):
        script = "import { writeFileSync } from 'node:fs';\nwriteFileSync(process.argv[3], JSON.stringify({typescript: '0', results: []}));\n"
        rev, environment = self.broken_tool('tests/tooling/source-facts.mjs', script)
        self.refuses('unexpected result', lambda: tool.source_facts(self.reader, rev, [{'op': 'x'}], environment, {}))

    def test_reach_coverage_failure(self):
        rev, environment = self.broken_tool('tests/tooling/reach-coverage.mjs', 'process.exit(3);\n')
        observation = {'coverage': str(self.root)}
        self.refuses('reach coverage failed', lambda: tool.coverage_counts(self.reader, rev, observation, [], environment))

    def target_corpus(self, change_reporter=None, **build):
        self.toolchain = target_tests.pinned_toolchain()
        fixture = target_tests.TargetTests
        row = fixture.target(self, 'exact', target_tests.anchor('const r = op(5);', computed=True), ['assert.equal(r.charge, 5);'])
        rev = fixture.build(self, [row], **build)
        if change_reporter:
            self.write('tests/tooling/catalog-reporter.mjs', change_reporter)
            rev = self.commit('silent reporter')
        return lambda: tool.corpus(self.reader, rev, 'corpus.json', toolchain=self.toolchain)

    def test_target_held_counterexample(self):
        self.refuses('never earn suite credit', self.target_corpus(counterexample_kind='held_witness'))

    def test_target_catalog_events(self):
        self.refuses('catalog run produced no events',
                     self.target_corpus('export default async function* reporter(events) { for await (const _ of events); }\n'))

    def test_target_literals(self):
        self.toolchain = target_tests.pinned_toolchain()
        fixture = target_tests.TargetTests
        row = fixture.target(self, 'exact', target_tests.anchor('const r = op(5);', literals=[{'ordinal': '5'}]),
                             ['assert.equal(r.charge, 5);'])
        rev = fixture.build(self, [row])
        self.refuses('literals (ordinal, value) or computed',
                     lambda: tool.corpus(self.reader, rev, 'corpus.json', toolchain=self.toolchain))

    # Design 05 step 6: hold register, floor record, helper reviews and moves (P1-H, P1-P).
    def recipes(self, change):
        return self.format_two(lambda d: change(d['holds']['register']['recipes']))

    def entries(self, rows):
        return self.format_two(lambda d: d['holds']['register'].update(entries=rows))

    def test_register_claims_stay(self):
        self.refuses('P1-H claims cannot leave', self.format_two(lambda d: d['holds']['claims'].pop()))

    def test_register_present(self):
        self.refuses('holds need a register', self.format_two(lambda d: d['holds'].pop('register')))

    def test_register_recipes_cover_claims(self):
        self.refuses('cover exactly the held claims', self.recipes(lambda r: r.pop('V-ENV')))

    def test_register_recipe_fields(self):
        self.refuses('fields are title, body and files', self.recipes(lambda r: r['Proxy'].update(span='x')))

    def test_register_recipe_text(self):
        self.refuses('pattern must be text', self.recipes(lambda r: r['Proxy'].update(body='')))

    def test_register_recipe_narrows_pattern(self):
        self.refuses('narrows the minimum body', self.recipes(lambda r: r['Proxy'].update(body='new Proxy')))

    def test_register_recipe_narrows_files(self):
        self.refuses('narrows the minimum files', self.recipes(lambda r: r['V-D1'].update(files=[])))

    def test_register_entry_key(self):
        self.refuses('unique key', self.entries([{'key': 1}]))

    def test_register_entry_classification(self):
        self.refuses('classification and its reason', self.entries([{'key': 'k', 'classification': 'maybe'}]))

    def test_register_entry_claim(self):
        self.refuses('names its held claim', self.entries([{'key': 'k', 'classification': 'held', 'reason': 'r'}]))

    def test_register_entries_recomputed(self):
        self.refuses('differ from the recomputed matches',
                     self.entries([{'key': 'k', 'classification': 'not_held', 'reason': 'r', 'matched': []}]))

    def test_register_entry_matched_claims(self):
        self.write('tests/tooling/source-facts.mjs', (target_tests.ROOT / 'tests/tooling/source-facts.mjs').read_text())
        self.write('tests/p.test.mjs', "import { test } from 'node:test';\ntest('p', () => new Proxy({}, {}));\n")
        self.document('package.json', {'type': 'module'})
        rev = self.commit('register subject')
        claims = {claim: {} for claim in tool.REGISTER_MINIMUM}
        register = {'recipes': json.loads(json.dumps(tool.REGISTER_MINIMUM)),
                    'entries': [{'key': 'tests/p.test.mjs:2:1', 'matched': ['V-ENV'], 'classification': 'not_held', 'reason': 'r'}]}
        environment = tool.child_environment(tool.environment_declaration(None))[0]
        self.refuses('records other matched claims', lambda: tool.hold_register(
            self.reader, rev, register, claims, ['tests/p.test.mjs'], environment, target_tests.pinned_toolchain()))

    def floor(self, distinct=True, holds=False):
        def change(data):
            record = base.gzip.compress(json.dumps({'results': [{'assumption': 'A10', 'passed': True, 'facts': {
                'process_isolation': {'distinct_processes': distinct}, 'order_model_holds': holds}}]}).encode(), mtime=0)
            (self.root / 'floor.json.gz').write_bytes(record)
            data['floor'].update(sha256=tool.digest(record), order_model_holds=holds)
        return self.format_two(change)

    def test_floor_record_shape(self):
        self.refuses('floor record and its A10 result', self.format_two(lambda d: d.update(floor={})))

    def test_floor_record_digest(self):
        self.refuses('floor record digest mismatch', self.format_two(lambda d: d['floor'].update(sha256='0' * 64)))

    def test_floor_isolation(self):
        self.refuses('shows no process isolation', self.floor(distinct=False))

    def test_floor_order_model(self):
        self.refuses('order model differs from the record',
                     self.format_two(lambda d: d['floor'].update(order_model_holds=True)))

    def review(self, **changes):
        twice = changes.pop('twice', False)

        def change(data):
            self.write('tests/h.mjs', 'export {};\n')
            row = {'id': 'review', 'origin': data['origins'][0]['id'], 'module': 'tests/h.mjs', 'pin_blob': None,
                   'current_blob': self.git('hash-object', 'tests/h.mjs'), 'covers': 'module', 'reason': 'r'}
            row.update(changes)
            data['helper_reviews'] = [row, dict(row, id='again')] if twice else [row]
        return self.format_two(change)

    def test_helper_review_origin(self):
        self.refuses('its origin and a test-side module', self.review(origin='unknown'))

    def test_helper_review_binding(self):
        self.refuses('not bound to the changed module', self.review(current_blob='0' * 40))

    def test_helper_review_scope(self):
        self.refuses('covers the whole module', self.review(covers='functions'))

    def test_helper_review_duplicate(self):
        self.refuses('helper review duplicated', self.review(twice=True))

    def test_move_shape(self):
        self.refuses('a move names its source', self.format_two(lambda d: d.update(moves=[{'from': 'a'}])))

    def test_move_presence(self):
        self.refuses('source gone and its destination present',
                     self.format_two(lambda d: d.update(moves=[{'from': 'source.md', 'to': 'sealed.txt', 'reason': 'r'}])))

    # Design 05 step 7: target-set and multi-edit mutants (F3).
    def target_registry(self, case_change=None, mutant=None):
        for path in (tool.CATALOG_REPORTER, tool.REACH_COVERAGE):
            self.write(path, (target_tests.ROOT / path).read_text())
        self.write('src/value.mjs', runner_tests.SOURCE)
        self.write('tests/a.test.mjs', runner_tests.TESTS)
        case = {'id': 'targets', 'targets': {'flags': ['--test'], 'files': ['tests/a.test.mjs']},
                'files': ['src/value.mjs', 'tests/a.test.mjs'], 'timeout_seconds': 60, 'output_limit_bytes': 1048576,
                'mutants': [mutant or runner_tests.mutant('kill', 'return n + 1;', 'return n + 2;')]}
        if case_change:
            case_change(case)
        self.document('registry.json', {'version': 1, 'cases': [case]})
        rev = self.commit('target registry')
        return lambda: tool.mutations(self.reader, rev, 'registry.json')

    def test_multi_edit_shape(self):
        self.refuses('two or more edits', self.target_registry(mutant=runner_tests.mutant('m', edits=[('return n + 1;', 'x')])))

    def test_target_case_without_argv(self):
        self.refuses('declares targets instead of argv', self.target_registry(lambda case: case.update(argv=['node'])))

    def test_target_flags(self):
        self.refuses('without their own reporter', self.target_registry(
            lambda case: case['targets'].update(flags=['--test', '--test-reporter=spec'])))

    def test_target_files(self):
        self.refuses('names its test files', self.target_registry(lambda case: case['targets'].update(files=[])))

    def test_target_expected_leaves(self):
        self.refuses('names its expected target leaves', self.target_registry(
            mutant=runner_tests.mutant('m', 'return n + 1;', 'return n + 2;', expected=[])))

    def test_target_expected_in_control(self):
        self.refuses('expected target leaves absent', self.target_registry(
            mutant=runner_tests.mutant('m', 'return n + 1;', 'return n + 2;', expected=[('tests/a.test.mjs', ['absent'])])))

    # Design 05 step 7: the family census and member routes (P1-M).
    def census(self, change=None, files=None, observed=None, extra=(), **table):
        fixture = family_tests.FamilyCensusTests
        self.toolchain = target_tests.pinned_toolchain()
        fixture.build(self, files or {'runner.mjs': family_tests.RUNNER}, observed)
        family = fixture.family(self)
        if change:
            change(family)
        return lambda: fixture.table(self, family, *[row(self) if callable(row) else row for row in extra], **table)

    def route(self, route):
        return self.census(lambda family: family['members'][0].update(route=route))

    def part(self, part, files=None, **census):
        return self.census(lambda family: family['census'].update(parts=[part], **census), files)

    def test_census_unlabelled_element(self):
        self.refuses('census element without a label', self.census(files={'runner.mjs': family_tests.RUNNER.replace('["M2 second",', '[label,')}))

    def test_route_kind(self):
        self.refuses('needs a known route', self.route({'kind': 'credit'}))

    def test_route_mutation(self):
        self.refuses('obligation is this member', self.route({'kind': 'mutation', 'case': 'c', 'mutant': 'm'}))

    def test_route_witness(self):
        self.refuses('names a held or superseded counterexample', self.route({'kind': 'witness', 'counterexample': 'cx'}))

    def test_route_no_longer_applicable(self):
        self.refuses('its reason and authority', self.route({'kind': 'no_longer_applicable', 'reason': 'gone'}))

    def test_route_equivalence(self):
        self.refuses('needs its argument', self.route({'kind': 'equivalence'}))

    def test_route_survivor(self):
        self.refuses('its finding and owner', self.route({'kind': 'survivor', 'finding': 'missed'}))

    def test_route_limit(self):
        self.refuses('names its record', self.route({'kind': 'limit'}))

    def test_family_role(self):
        self.refuses('mutation runner or a mixed origin', self.census(lambda family: family.update(role='probe')))

    def test_family_member_keys(self):
        self.refuses('member keys repeat', self.census(
            lambda family: family['members'][1].update(label='M1 second'),
            files={'runner.mjs': family_tests.RUNNER.replace('M2 second', 'M1 second')}))

    def child(self, part_change=None, member_change=None):
        def build(test):
            part = {'kind': 'inherits', 'family': 'family.runner'}
            if part_change:
                part_change(part)
            row = family_tests.FamilyCensusTests.family(test, 'runner.mjs', [part], id='family.child',
                                                        census={'count_assertions': []})
            if member_change:
                member_change(row['members'][0])
            return row
        return build

    def test_family_inherited_reuse(self):
        self.refuses('needs no reuse link', self.census(extra=[self.child(member_change=lambda member: member.update(
            reuses={'family': 'family.runner', 'label': 'M1 first'}))]))

    def test_family_reuse_target(self):
        self.refuses('names an existing member', self.census(lambda family: family['members'][0].update(
            reuses={'family': 'family.runner', 'label': 'M1 first'})))

    def test_family_origin(self):
        self.refuses('whole-file artifact origin', self.census(lambda family: family.update(origin='absent')))

    COMPUTED = family_tests.RUNNER.replace('const mutations = [', 'const mutations = base.concat([').replace(
        '];\nmutations.push', ']);\nmutations.push')

    def filter_part(self, source, **extra):
        return {'kind': 'structural', 'container': 'mutations',
                'initializer': {'kind': 'filter', 'source': source, 'container': 'mutations', 'pattern': '^M[12] ', **extra}}

    def test_census_source_shape(self):
        self.refuses('names a family or a path', self.part(self.filter_part({}), {'runner.mjs': self.COMPUTED}))

    def test_census_source_family(self):
        self.refuses('census source family absent', self.part(self.filter_part({'family': 'absent'}), {'runner.mjs': self.COMPUTED}))

    def test_census_source_digest(self):
        self.refuses('census source digest differs', self.part(self.filter_part({'family': 'family.runner', 'digest': '0' * 64}), {'runner.mjs': self.COMPUTED}))

    def test_census_kind(self):
        self.refuses('unknown census kind', self.part({'kind': 'guess'}))

    def test_census_container(self):
        self.refuses('census container absent', self.part({'kind': 'structural', 'container': 'mutants'}))

    def test_census_python_only(self):
        self.refuses('censuses Python runners only', self.part({'kind': 'python_ast', 'container': 'mutations'}))

    def generator(self, **changes):
        row = {'statement': 6, 'pattern': 'M3', 'count_anchor': 'assert.equal(mutations.length, 3);',
               'inputs': [{'path': 'runner.mjs', 'count': 3}], 'input_revision': 'x'}
        row.update(changes)
        return row

    def test_census_generator_statement_once(self):
        part = {'kind': 'structural', 'container': 'mutations', 'generators': [self.generator(), self.generator()]}
        self.refuses('one generator per statement', self.part(part))

    def test_census_generator_claims_a_statement(self):
        part = {'kind': 'structural', 'container': 'mutations', 'generators': [self.generator(statement=99)]}
        self.refuses('claims no adding statement', self.part(part))

    def test_census_inherited_family(self):
        self.refuses('inherited family absent', self.part({'kind': 'inherits', 'family': 'absent'}))

    def test_census_filter_pattern(self):
        self.refuses('filter regex absent from the runner', self.part(self.filter_part({'family': 'family.runner'}), {'runner.mjs': self.COMPUTED}))

    def test_census_loop_line(self):
        self.refuses('names its line in a JS runner', self.part({'kind': 'loop'}))

    def test_census_loop_statement(self):
        self.refuses('no top-level for-of over an array literal', self.part({'kind': 'loop', 'line': 1}))

    def test_census_bindings(self):
        self.refuses('bindings absent from the runner', self.part({'kind': 'bindings', 'names': ['anchor'], 'label': 'M1'}))

    def test_census_binding_label(self):
        files = {'runner.mjs': family_tests.RUNNER + family_tests.BINDINGS}
        self.refuses('a label the runner carries', self.part({'kind': 'bindings', 'names': ['anchor'], 'label': 'absent'}, files))

    def test_census_array_initializer(self):
        part = {'kind': 'structural', 'container': 'mutations', 'initializer': {'kind': 'inherits', 'family': 'family.runner'}}
        self.refuses('needs no initializer part', self.part(part))

    def test_census_computed_initializer(self):
        self.refuses('needs its initializer part', self.part({'kind': 'structural', 'container': 'mutations'},
                                                             {'runner.mjs': self.COMPUTED}))

    def test_census_filtered_line_label(self):
        part = self.filter_part({'family': 'family.runner'}, over='lines', pattern='M1', label='^(?:nothing)$')
        self.refuses('filtered line without a label', self.part(part, {'runner.mjs': self.COMPUTED + '// /M1/\n'}))

    def test_census_filter_container(self):
        part = self.filter_part({'family': 'family.runner'}, container='absent', pattern='M1')
        self.refuses('filter source container absent', self.part(part, {'runner.mjs': self.COMPUTED + '// /M1/\n'}))

    def generated_part(self, **changes):
        return {'kind': 'structural', 'container': 'mutations', 'generators': [dict({
            'statement': 3, 'pattern': r'site\((\w+)\)', 'count_anchor': 'const inventory = { "subject.ts": 2 };',
            'inputs': [{'path': 'subject.ts', 'count': 2}], 'input_revision': None}, **changes)]}

    def generator_census(self, **changes):
        files = {'runner-gen.mjs': family_tests.GENERATOR, 'subject.ts': 'site(alpha); site(beta);\n'}

        def change(family):
            family['census'] = {'parts': [self.generated_part(input_revision=self.pin, **changes)]}
            family['origin'] = self.origins['runner-gen.mjs']
            family['members'] = [{'label': label, 'route': {'kind': 'pending'}} for label in
                                 ('G0 fixed', 'G1 site at subject.ts:alpha', 'G2 site at subject.ts:beta')]
        fixture = family_tests.FamilyCensusTests
        self.toolchain = target_tests.pinned_toolchain()
        fixture.build(self, files)
        family = fixture.family(self, 'runner-gen.mjs')
        change(family)
        return lambda: fixture.table(self, family)

    def test_census_generator_pattern(self):
        self.refuses('generator regex absent from the runner', self.generator_census(pattern='absent'))

    def test_census_generator_anchor(self):
        self.refuses('generator count anchor absent', self.generator_census(count_anchor='absent'))

    def test_census_generator_literal(self):
        self.refuses('generator counts differ from the runner literal',
                     self.generator_census(inputs=[{'path': 'subject.ts', 'count': 3}]))

    def test_census_generator_input(self):
        self.refuses('generator count mismatch at the input revision',
                     self.generator_census(inputs=[{'path': 'runner-gen.mjs', 'count': 2}]))

    def test_census_member_labels(self):
        self.refuses('family members need labels', self.census(lambda family: family['members'][0].update(label='')))

    def test_census_cycle(self):
        self.refuses('cyclic family inheritance', self.census(
            lambda family: family['census'].update(parts=[{'kind': 'inherits', 'family': 'family.child'}], count_assertions=[]),
            extra=[self.child()]))

    def test_census_reading_reason(self):
        self.refuses('census: reading needs its reason', self.census(lambda family: family.update(census={'reading': ''})))

    def test_census_parts(self):
        self.refuses('needs census parts or census: reading', self.census(lambda family: family.update(census={})))

    def test_census_member_count(self):
        self.refuses('census has 3 members, the family lists 2', self.census(lambda family: family['members'].pop()))

    def test_census_member_label(self):
        self.refuses('census member differs', self.census(lambda family: family['members'][0].update(label='M1 renamed')))

    def test_census_generated_site(self):
        def change(family):
            family['members'][1]['label'], family['members'][2]['label'] = 'G1 site at subject.ts:beta', 'G2 site at subject.ts:alpha'
        files = {'runner-gen.mjs': family_tests.GENERATOR, 'subject.ts': 'site(alpha); site(beta);\n'}
        fixture = family_tests.FamilyCensusTests
        self.toolchain = target_tests.pinned_toolchain()
        fixture.build(self, files)
        family = fixture.family(self, 'runner-gen.mjs', [self.generated_part(input_revision=self.pin, label_contains='at {file}:{group}')],
                                ('G0 fixed', 'G1 site at subject.ts:alpha', 'G2 site at subject.ts:beta'), census={'count_assertions': []})
        change(family)
        self.refuses('generated member label lacks its site', lambda: fixture.table(self, family))

    def test_count_assertion_anchor(self):
        self.refuses('count assertion anchor absent', self.census(
            lambda family: family['census'].update(count_assertions=[{'anchor': 'absent', 'parts': [0]}])))

    def test_count_assertion_parts(self):
        self.refuses('count assertion names unknown parts', self.census(
            lambda family: family['census']['count_assertions'][0].update(parts=[4])))

    def test_count_assertion_size(self):
        self.refuses('the runner asserts', self.census(files={'runner.mjs': family_tests.RUNNER.replace('length, 3', 'length, 4')},
                     change=lambda family: family['census'].update(
                         count_assertions=[{'anchor': 'assert.equal(mutations.length, 4);', 'parts': [0]}])))

    def test_count_assertion_declared(self):
        self.refuses('undeclared count assertion', self.census(lambda family: family['census'].update(count_assertions=[])))

    def observed_census(self, labels=('M1 first', 'M2 second', 'M3 third'), summary='3/3 rejected', **changes):
        fixture = family_tests.FamilyCensusTests
        self.toolchain = target_tests.pinned_toolchain()
        fixture.build(self, {'runner.mjs': family_tests.RUNNER}, lambda tree: family_tests.output(tree, list(labels), summary))
        spec = fixture.observed(self, **changes)
        return lambda: fixture.table(self, fixture.family(self, observed=spec))

    def test_observed_shape(self):
        self.refuses('observed output needs revision', self.observed_census(line=None))

    def test_observed_digest(self):
        self.refuses('observed output digest mismatch', self.observed_census(sha256='0' * 64))

    def test_observed_runner_at_tree(self):
        def tree():
            self.write('runner.mjs', family_tests.RUNNER + '// later\n')
            return self.commit('later runner')
        fixture = family_tests.FamilyCensusTests
        self.toolchain = target_tests.pinned_toolchain()
        fixture.build(self, {'runner.mjs': family_tests.RUNNER},
                      lambda pin: family_tests.output(pin, ['M1 first', 'M2 second', 'M3 third']))
        spec = fixture.observed(self, tree=tree())
        self.refuses('runner at the observed tree differs', lambda: fixture.table(self, fixture.family(self, observed=spec)))

    def test_observed_partial(self):
        self.refuses('partial output', self.observed_census(summary='crashed'))

    def test_observed_total(self):
        self.refuses('another member total', self.observed_census(summary='4/4 rejected'))

    def test_observed_members(self):
        self.refuses('observed members differ', self.observed_census(labels=('M1 first', 'M2 second', 'M4 other')))

    def test_observed_names(self):
        self.refuses('does not name its command or tree', self.observed_census(names=['command: node other.mjs']))

    # Design 05 step 8: witness records and suite targets bound to refused members (P1-H, P1-T, P1-R).
    def witness(self, claims=False, **changes):
        row = {'kind': 'held_witness', 'claim': 'Proxy', 'members': ['m']}
        row.update(changes)
        members = {'m': {'status': 'held', 'file': 'a.test.mjs', 'current': [3, 1]}}
        register = {'a.test.mjs:3:1': {'classification': 'held', 'claim': 'Proxy'}}
        held = {'Proxy': {}, 'V-ENV': {}} if claims else {'Proxy': {}}
        return lambda: tool.witness_records({'w': row}, members, held, register)

    def test_witness_claim(self):
        self.refuses('a witness names a held claim', self.witness(claim='Unknown'))

    def test_witness_members(self):
        self.refuses('a witness lists its members', self.witness(members=[]))

    def test_witness_member_status(self):
        self.refuses('a witness member has another status', self.witness(kind='superseded_witness'))

    def test_witness_member_claim(self):
        self.refuses('registered under another claim', self.witness(claim='V-ENV', claims=True))

    def member_target(self, row, **target):
        def change(data):
            data['preserved'] = [row]
            data['suite_targets'] = [dict({'id': 't', 'counterexample': 'cx', 'member': 'm', 'file': 'a.test.mjs',
                                           'declaration': {'line': 1, 'column': 1}, 'relation': {'kind': 'exact_input'}}, **target)]
            data['counterexamples'] = [{'id': 'cx', 'kind': 'behavior', 'origins': [data['origins'][0]['id']], 'required_result': 'r'}]
        return self.format_two(change)

    def test_target_member_status(self):
        self.refuses('a target member is a refused member in its file',
                     self.member_target({'member': 'm', 'status': 'preserved', 'file': 'a.test.mjs'}))

    def test_target_member_declaration(self):
        self.refuses("sits at its member's declaration",
                     self.member_target({'member': 'm', 'status': 'refused', 'file': 'a.test.mjs', 'current': [5, 3]}))
