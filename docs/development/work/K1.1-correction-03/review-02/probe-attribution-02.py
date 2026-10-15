#!/usr/bin/env python3
"""Independent negative controls for C's assertion witness; never edits the candidate.
Run from a clean C clone: python3 -B /path/to/probe-attribution-02.py
Each temporary case uses C's unmodified probe, reporter, witness and outer classifier.
"""
import importlib.util,json,os,pathlib,shutil,subprocess,tempfile
ROOT=pathlib.Path.cwd()
spec=importlib.util.spec_from_file_location('packet_tools_review', ROOT/'scripts/packet_tools.py')
tool=importlib.util.module_from_spec(spec);spec.loader.exec_module(tool)
ENV={k:os.environ[k] for k in ('PATH','HOME','TMPDIR') if k in os.environ};ENV['LANG']='C.UTF-8'
SUBJECT="""import assert from 'node:assert/strict';
export const subjectError = new assert.AssertionError({message:'subject-owned exception, not a test assertion'});
export function subject() { throw subjectError; }
export function subjectValue() { return {get x() {throw subjectError;}}; }
export const subjectTypeError = new TypeError('subject getter failed');
export const malformedRefusal = {ok:false, get error() {throw subjectTypeError;}};
"""
HEADER="""import assert from 'node:assert/strict';
import {test,describe,beforeEach,after} from 'node:test';
import {subject,subjectError,subjectValue,malformedRefusal,subjectTypeError} from '../src/review-subject.mjs';
import {accepted,refused} from './harness.ts';
"""
SCENARIOS={
 'passing':"test('probe',()=>assert.equal(1,1));",
 'genuine_assertion':"test('probe',()=>assert.equal(1,2));",
 'direct_subject_exception':"test('probe',()=>subject());",
 'callback_throws_passthrough':"test('probe',()=>assert.throws(subject));",
 'callback_doesNotThrow_nonmatching':"test('probe',()=>assert.doesNotThrow(subject, TypeError));",
 'callback_doesNotReject_nonmatching':"test('probe',async()=>await assert.doesNotReject(async()=>subject(),TypeError));",
 'comparison_getter':"test('probe',()=>assert.deepEqual(subjectValue(),{x:1}));",
 'predicate_callback':"test('probe',()=>assert.throws(()=>{throw new TypeError('expected');},()=>subject()));",
 'harness_malformed_refusal':"test('probe',()=>accepted(malformedRefusal));",
 'harness_truthy_ok_subject_value':"test('probe',()=>accepted({ok:1,get value(){throw subjectTypeError;}}));",
 'harness_changing_ok_subject_value':"test('probe',()=>{let reads=0;accepted({get ok(){return reads++===0;},get value(){throw subjectTypeError;}});});",
 'harness_missing_error':"test('probe',()=>accepted({ok:false}));",
 'hook_assertion':"describe('probe',()=>{beforeEach(()=>assert.equal(1,2));test('leaf',()=>assert.equal(1,1));});",
 'mixed_hook':"test('probe valid',()=>assert.equal(1,2)); describe('probe hook',()=>{beforeEach(()=>{throw new Error('setup');});test('leaf',()=>assert.equal(1,1));});",
 'mixed_subject':"test('probe valid',()=>assert.equal(1,2));test('probe exception',()=>subject());",
 'mixed_cancellation':"test('probe valid',()=>assert.equal(1,2));test('probe parent',async(t)=>{t.test('unawaited',()=>new Promise(r=>setTimeout(r,100)));});",
 'mixed_timeout':"test('probe valid',()=>assert.equal(1,2));test('probe slow',{timeout:10},()=>new Promise(r=>setTimeout(r,100)));",
 'assertion_then_late_exception':"test('probe valid',()=>{setTimeout(()=>{throw new Error('late setup/load failure');},50);assert.equal(1,2);});",
}
rows=[]
with tempfile.TemporaryDirectory(prefix='kc3-review02-attribution-') as d:
 root=pathlib.Path(d)
 for rel in ['tests/tooling/value-cost-probe.mjs','tests/tooling/value-cost-witness.mjs','tests/tooling/value-cost-reporter.mjs','package.json']:
  dst=root/rel;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/rel,dst)
 shutil.copytree(ROOT/'packages/kernel/src',root/'packages/kernel/src')
 tests=root/'packages/kernel/tests';tests.mkdir(parents=True)
 shutil.copy2(ROOT/'packages/kernel/tests/harness.ts',tests/'harness.ts')
 (root/'node_modules').symlink_to(ROOT/'node_modules',target_is_directory=True)
 (root/'packages/kernel/src/review-subject.mjs').write_text(SUBJECT)
 registry=root/'tests/fixtures/packet-tools/value-cost.json';registry.parent.mkdir(parents=True)
 for name,body in SCENARIOS.items():
  entry={'id':'review.control','assertion':'review.control.intended-test-assertion','input':{'file':'packages/kernel/tests/review.test.mjs','pattern':'^probe'},'failure_exit':17,'argv':['node','--no-warnings','--experimental-strip-types','tests/tooling/value-cost-probe.mjs','review.control'],'timeout_seconds':30,'output_limit_bytes':32768,'claim':'A reached intended test assertion; never an exception from the subject or failed setup.'}
  registry.write_text(json.dumps({'version':1,'cases':[entry]}))
  (tests/'review.test.mjs').write_text(HEADER+body+'\n')
  run=tool.command(entry['argv'],root,entry['timeout_seconds'],entry['output_limit_bytes'],ENV)
  row={'scenario':name,'test_source':body,'run':run,'outcome':tool.execution_outcome(run,entry)}
  rows.append(row)
print(json.dumps({'node':subprocess.check_output(['node','--version'],text=True).strip(),'candidate':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'subject_source':SUBJECT,'rows':rows},indent=2))
