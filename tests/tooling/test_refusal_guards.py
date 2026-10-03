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
