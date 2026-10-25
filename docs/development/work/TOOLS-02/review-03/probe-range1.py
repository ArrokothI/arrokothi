"""Review 03: real tracer-to-census counterexamples; requires a case-insensitive filesystem.
Only disposable repositories change. Exit zero reproduces the failures, not acceptance.
"""
import json, os, subprocess, sys
from pathlib import Path
candidate=Path(sys.argv[1]).resolve(); os.chdir(candidate)
sys.path.insert(0,str(candidate/'tests/tooling'))
from test_read_form import CensusRepository, member
from test_packet_tools import tool

# The shell opens fd 3 before launching the traced child; NODE_OPTIONS is retained.
STREAM_CODE="import fs from 'node:fs'; const options = Object.create({fd:3, autoClose:false}); let out=''; for await (const chunk of fs.createReadStream('tests/fixtures/decoy.txt', options)) out += chunk; process.stdout.write(out);"
OWN_CODE=STREAM_CODE.replace('Object.create({fd:3, autoClose:false})','{fd:3, autoClose:false}')
def stream_member(code):
    command='exec '+subprocess.check_output(['which','node'],text=True).strip()+" --input-type=module -e '"+code.replace("'","'\"'\"'")+"' 3< tests/fixtures/input.txt"
    return member('const out = execFileSync("sh", ["-c", '+json.dumps(command)+']); assert.ok(out.length > 0);', "import { execFileSync } from 'node:child_process';")

class Options(CensusRepository):
    members={'tests/stream/inherited.test.mjs':stream_member(STREAM_CODE),
             'tests/stream/own.test.mjs':stream_member(OWN_CODE)}
    seed={'tests/fixtures/input.txt':'ACTUAL 1\n','tests/fixtures/decoy.txt':'DECOY\n'}
    globs=['tests/stream/*.test.mjs']

class DirectOptions(CensusRepository):
    members={'tests/stream/inherited.test.mjs':member("const fd = openSync('tests/fixtures/input.txt'); const options = streamOptions(fd); let out=''; for await (const chunk of createReadStream('tests/fixtures/decoy.txt',options)) out += chunk; assert.ok(out.length > 0);", "import { openSync, createReadStream } from 'node:fs';\nimport { streamOptions } from '../../src/options.mjs';")}
    seed={'tests/fixtures/input.txt':'ACTUAL 1\n','tests/fixtures/decoy.txt':'DECOY\n', 'src/options.mjs':'export function streamOptions(fd) { return Object.create({fd}); }\n'}
    globs=['tests/stream/*.test.mjs']

class CasePaths(CensusRepository):
    members={'tests/read/case.test.mjs':member("assert.ok(readFileSync('tests/fixtures/INPUT.txt', 'utf8').length > 0);")}
    seed={'tests/fixtures/input.txt':'ACTUAL 1\n'}
    globs=['tests/read/*.test.mjs']

def snapshot(cls):
    return {r['file']:{k:r[k] for k in ('status','reads','reasons') if k in r} for r in cls.table}

def step(cls,t,changes):
    result=t.step(changes);rev=cls.repo.git('rev-parse','HEAD')
    try: corpus=tool.corpus(cls.repo.reader,rev,'corpus.json',toolchain=cls.toolchain)['result']
    except tool.CheckError as e: corpus='invalid: '+str(e)
    return dict(revision=rev,pristine=tool.pristine(cls.repo.reader,rev),regenerate=result['result'],changed=result['changed'],corpus=corpus)

out={'candidate':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),
     'node':subprocess.check_output(['node','--version'],text=True).strip(),'python':sys.version.split()[0]}
for cls,name in ((Options,'options'),(DirectOptions,'direct_options'),(CasePaths,'case_paths')):
    try:
        cls.setUpClass();t=cls(methodName='runTest');out[name]={'initial':snapshot(cls),'steps':[]}
        for text in (() if cls is DirectOptions else ('ACTUAL 2 longer\n','ACTUAL 3 longer still\n')):
            result=step(cls,t,{'tests/fixtures/input.txt':text})
            code = STREAM_CODE.replace('fd:3','fd:0') if cls is Options else "import fs from 'node:fs'; process.stdout.write(fs.readFileSync('tests/fixtures/INPUT.txt'));"
            with (cls.repo.root/'tests/fixtures/input.txt').open('rb') as source:
                observed=subprocess.run(['node','--input-type=module','-e',code],cwd=cls.repo.root,stdin=source,capture_output=True,text=True,check=True)
            result['observed_content']=observed.stdout
            assert observed.stdout==text
            assert result['pristine'] and result['regenerate']=='table_current' and result['changed']==[] and result['corpus']=='revalidation_complete'
            out[name]['steps'].append(result)
        expected='held' if cls is Options else 'preserved'
        assert next(r for r in cls.table if r['file']==next(iter(cls.members)))['status']==expected
        if cls is Options: assert cls.table[1]['status']=='refused'
        trace=tool.traced_reads(cls.repo.reader,['--test'],next(iter(cls.members)),tool.child_environment(tool.environment_declaration(None))[0])
        out[name]['relevant_rows']=[r for r in trace['reads'] if r.get('operation')=='createReadStream' or 'INPUT.txt' in r.get('text','')]
        out[name]['child_preloads']=trace['child_preloads']
        out[name]['admissions']=[tool.admit(cls.repo.reader,cls.repo.git('rev-parse','HEAD'),cls.repo.root.resolve(),r,set()) for r in out[name]['relevant_rows']]
        out[name]['positive_control']=step(cls,t,{'tests/fixtures/decoy.txt':'DECOY 2\n'}) if cls is Options else None
    finally: cls.doClassCleanups()
print(json.dumps(out,indent=2))
