#!/usr/bin/env python3
"""Independent TOOLS-01 soundness probes. Only temporary fixture repositories are mutated.
Usage: PATH=<Node 26.10.0 bin>:$PATH python3 -B probe_review.py /path/to/candidate [all|transfer|context|kills|holds]
Exit 0 means observations were collected, not acceptance. Rebased replay: assertions now require the earlier false-credit observations to be refused or held.
"""
import sys, json, copy, subprocess, time
from pathlib import Path
ROOT=Path(sys.argv[1]).resolve(); MODE=sys.argv[2] if len(sys.argv)>2 else 'all'
C='28258b282532b36eef8fb1571d79b6343b54427b'
sys.path.insert(0,str(ROOT/'tests/tooling'))
from test_packet_tools import RepositoryFixture,tool
from test_adoption_format import FormatTwoTests
from test_target_tools import pinned_toolchain
from test_runner_targets import TargetSetRunnerTests,mutant

def blob(path): return subprocess.check_output(['git','-C',str(ROOT),'show',C+':'+path])
assert (ROOT/'scripts/packet_tools.py').read_bytes()==blob('scripts/packet_tools.py'), 'Requires exact candidate checker bytes'
out={'subject':C,'node':subprocess.check_output(['node','--version'],text=True).strip(),'probes':{}}
assert out['node']=='v26.10.0'
start=time.monotonic()

def transfer():
 s=json.loads(blob('tests/fixtures/packet-tools/adoption.json')); rows={r['id']:r for r in s['origins']}
 four={'artifact-73555fe668cc180905b1e49a','artifact-9fd619f5375d598ebb2b88aa','artifact-d2153e36d9c7464883ecea0b','artifact-ea5444a6d42154e413fe0f2e'}
 forty=json.loads(blob('docs/development/work/TOOLS-01/owner-choice-05/transferred-origins.json'))
 if isinstance(forty,dict): forty=next(v for v in forty.values() if isinstance(v,list))
 allowed=four|{r.get('origin',r.get('id')) for r in forty}
 assert len(allowed)==44
 actual={r['origin'] for r in s['transferred']}; assert actual==allowed
 invented='artifact-394a3572417fe81cafbd7097'
 assert invented not in allowed and rows[invented]['state']=='complete'
 rows[invented]['state']='pending_revalidation';rows[invented].pop('closure')
 added=s['transferred']+[{'origin':invented,'decision':'docs/development/work/TOOLS-01/owner-choice-04.md'}]
 lists=tool.transfer_lists(tool.Git(ROOT),C,s['transfer_lists'])
 try:
  tool.transferred_origins(tool.Git(ROOT),C,added,rows,lists)
  raise AssertionError('45th transfer accepted')
 except tool.CheckError as e: extra_error=str(e)
 f=FormatTwoTests(methodName='setUp');f.setUp()
 try:
  # The file contains only "Held claim decision", with no transfer authorization or origin list.
  rev=f.fixture(lambda d:d.update(transferred=[{'origin':d['origins'][0]['id'],'decision':'decision.md'}]))
  try:
   f.check(rev)
   raise AssertionError('unrelated decision accepted')
  except tool.CheckError as e: fixture_error=str(e)
  return {'candidate_exact_44_match':True,'refused_45th':invented,'reason':extra_error,
          'cited_decision':'owner-choice-04.md (does not name this origin)',
          'full_fixture_corpus_refused':fixture_error}
 finally:f.doCleanups()

def context_one(fence, complete):
 r=RepositoryFixture(methodName='setUp');r.setUp()
 try:
  text='# Review\n## Finding\n'+fence+'js\nconst value = `\n## Embedded heading\n`;\n'+fence+'\nRead [note](docs/records/note.md).\n## Next\nOther.\n'
  r.write('source.md',text);r.write('docs/records/note.md','Required record.\n');pin=r.commit('source')
  row={'revision':pin,'path':'source.md','line':3,'kind':'inline js','sha256':tool.digest(tool.fenced_bytes(text.encode(),3)),'disposition':'extract'}
  r.document('origins.json',[row]);catalog=r.commit('catalog')
  r.document('inventory.json',{'version':1,'catalogs':[{'revision':catalog,'path':'origins.json','kind':'artifact','count':1,'sha256':tool.digest((r.root/'origins.json').read_bytes())}]})
  r.document('registry.json',{'version':1,'cases':[{'id':'example'}]})
  r.document('verify.json',{'version':1,'checks':[{'id':'mutants','operation':'mutations','spec':'registry.json','expected':'selected_cases_passed'}]})
  origin=tool.origin_id('artifact',row)
  legacy={'version':1,'mappings':[{'origin':origin,'status':'case','rationale':'A recorded case','targets':['example']}]}
  r.document('legacy.json',legacy);old=r.commit('legacy')
  ranges=[{'revision':pin,'path':'source.md','start':2,'end':8 if complete else 4}]
  if complete:ranges.append({'revision':pin,'path':'docs/records/note.md','start':1,'end':1})
  data={'version':2,'inventory':'inventory.json','registry':'registry.json','verification':'verify.json',
        'migration':{'source':{'format':1,'revision':old,'path':'legacy.json','sha256':tool.digest((r.root/'legacy.json').read_bytes())}},
        'origins':[{'id':origin,'state':'complete','legacy':{k:v for k,v in legacy['mappings'][0].items() if k!='origin'},
                    'closure':{'links':[{'kind':'case','id':'example'}],'context':ranges}}],
        'counterexamples':[],'suite_targets':[],'preserved':[],'families':[],**r.format_two_tables()}
  r.document('corpus.json',data);rev=r.commit('proposed closure')
  minimum=tool.context_minimum(r.reader,dict(row,id=origin))[:2]
  try:
   result=tool.corpus(r.reader,rev,'corpus.json')
   return {'accepted':True,'result':result['result'],'closures':result['closures'],'minimum':minimum,'source':text,'ranges':ranges}
  except tool.CheckError as e:return {'accepted':False,'error':str(e),'minimum':minimum,'source':text,'ranges':ranges}
 finally:r.doCleanups()

def contexts():
 a=context_one('~~~',False);b=context_one('```',False);c=context_one('~~~',True)
 assert not a['accepted'] and not b['accepted'] and c['accepted']
 return {'tilde_short':a,'backtick_short_control':b,'tilde_full_control':c}

def kills():
 r=TargetSetRunnerTests(methodName='setUp');r.setUp()
 try:
  skip={'id':'skip-target','path':'tests/a.test.mjs','before':"test('compute adds one',",'after':"test.skip('compute adds one',",
        'expected_targets':[{'file':'tests/a.test.mjs','path':['compute adds one']}]}
  rows,result=r.run_registry([mutant('assertion-control','return n + 1;','return n + 2;'),
                             mutant('type-error','return n + 1;','throw new TypeError("setup failed before assertion");'),skip])
  assert {k:v['status'] for k,v in rows.items()}=={'assertion-control':'observed','type-error':'observed','skip-target':'observed'}
  return {'result':result['result'],'counts':result['counts'],'control':result['cases'][0]['control'],
          'mutations':rows,'fixture_source':'export function compute(n) { return n + 1; }',
          'assertion':"test('compute adds one', () => { assert.equal(compute(1), 2); });",
          'checkout_clean_after':r.git('status','--porcelain')==''}
 finally:r.doCleanups()

def holds():
 s=json.loads(blob('tests/fixtures/packet-tools/adoption.json'))
 files=['packages/kernel/tests/creation.test.ts','packages/kernel/tests/dispatch.test.ts','packages/kernel/tests/values.test.ts']
 env=tool.child_environment(tool.environment_declaration(None))[0];tc=pinned_toolchain()
 matches=tool.register_matches(tool.Git(ROOT),C,files,s['holds']['register']['recipes'],env,tc)
 keys={r['key']:r for r in matches}; selected=[]
 for file,line in [(files[0],333),(files[1],615),(files[2],893),(files[2],910)]:
  key=f'{file}:{line}:3'; assert key in keys
  members=[r for r in s['preserved'] if r['file']==file and r.get('current')==[line,3]]
  targets=[r for r in s['suite_targets'] if r['file']==file and r['declaration']=={'line':line,'column':3}]
  assert not any(r['status']=='preserved' for r in members)
  assert not targets
  entry=next(r for r in s['holds']['register']['entries'] if r['key']==key)
  assert entry['classification']=='held' and entry['decision']==tool.VENV_RECORD
  selected.append({'key':key,'matched':True,'entry':entry,'members':members,'target_ids':[r['id'] for r in targets]})
 r=RepositoryFixture(methodName='setUp');r.setUp()
 try:
  r.document('package.json',{'type':'module'})
  r.write('tests/tooling/source-facts.mjs',blob('tests/tooling/source-facts.mjs').decode())
  r.write('tests/helper.mjs',"export function install() { const p = Array.prototype; p.toJSON = () => 99; }\n")
  text="""import { test } from 'node:test';
import { install } from './helper.mjs';
test('direct control', () => { Object.prototype.toJSON = () => 42; });
test('alias', () => { const p = Object.prototype; p.toJSON = () => 42; });
test('cast', () => { (Object.prototype as Record<string, unknown>).toJSON = () => 42; });
test('helper', () => { install(); });
test('generated', () => { const p = 'Object.prototype'; const source = `${p}.toJSON = () => 42;`; new Function(source)(); });
"""
  r.write('tests/install.test.ts',text);rev=r.commit('lexical shapes')
  synthetic=tool.register_matches(r.reader,rev,['tests/install.test.ts'],s['holds']['register']['recipes'],env,tc)
  assert {x['key'] for x in synthetic}=={f'tests/install.test.ts:{i}:1' for i in range(3,8)}
  return {'actual_candidate':selected,'synthetic_source':text,'helper_source':(r.root/'tests/helper.mjs').read_text(),'synthetic_matches':synthetic,
          'minimums_not_narrowed':tool.register_recipes({x['id'] for x in s['holds']['claims']},s['holds']['register'])==s['holds']['register']['recipes']}
 finally:r.doCleanups()

for name,fn in [('transfer',transfer),('context',contexts),('kills',kills),('holds',holds)]:
 if MODE in ('all',name):
  at=time.monotonic();out['probes'][name]=fn();out['probes'][name]['seconds']=time.monotonic()-at
out['seconds']=time.monotonic()-start
print(json.dumps(out,indent=2))
