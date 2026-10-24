"""Review 02 independent read-identity probes. Run with a pristine candidate checkout as argv[1].
Only disposable synthetic repositories are mutated; no candidate implementation is patched.
Exit zero means all stated counterexamples/controls reproduced, not acceptance.
"""
import json
import os
from pathlib import Path
import subprocess
import sys
from unittest.mock import patch

candidate = Path(sys.argv[1]).resolve()
os.chdir(candidate)
sys.path.insert(0, str(candidate / 'tests/tooling'))
from test_read_form import CensusRepository, GLOBBER
from test_packet_tools import RepositoryFixture, tool

PREFIX = "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\n"
SYMLINK_SYNC = PREFIX + """import { readdirSync } from 'node:fs';
test('symlink sync', () => { assert.ok(readdirSync('tests/fixtures', {recursive:true}).length > 0); });
"""
SYMLINK_TYPED = PREFIX + """import { readdir } from 'node:fs/promises';
test('symlink typed promise', async () => { assert.ok((await readdir('tests/fixtures', {recursive:true,withFileTypes:true})).length > 0); });
"""
GLOB_SYNC = PREFIX + """import { globSync } from 'node:fs';
test('array sync', () => { assert.ok(globSync(['tests/fixtures/entry'], {withFileTypes:true}).length > 0); });
"""
GLOB_STRING = GLOB_SYNC.replace("['tests/fixtures/entry']", "'tests/fixtures/entry'")

class Symlinks(CensusRepository):
    members={'tests/sync/sync.test.mjs':SYMLINK_SYNC,'tests/typed/typed.test.mjs':SYMLINK_TYPED}
    seed={'data/target/seed.json':'{}\n'}
    globs=['tests/sync/*.test.mjs','tests/typed/*.test.mjs']

class Patterns(CensusRepository):
    members={'tests/sync/sync.test.mjs':GLOB_SYNC,'tests/string/string.test.mjs':GLOB_STRING}
    seed={'tests/fixtures/entry':'file\n'}
    globs=['tests/sync/*.test.mjs','tests/string/*.test.mjs']

original_commit=RepositoryFixture.commit
def with_link(repo,message):
    if message == 'pin':
        (repo.root/'tests/fixtures').mkdir(parents=True,exist_ok=True)
        (repo.root/'tests/fixtures/link').symlink_to('../../data/target',target_is_directory=True)
    return original_commit(repo,message)

def observe(cls,code):
    r=subprocess.run(['node','--input-type=module','-e',code],cwd=cls.repo.root,text=True,capture_output=True,check=True)
    return json.loads(r.stdout)

def snapshot(cls):
    return {r['file']:{k:r[k] for k in ('status','reads','reasons') if k in r} for r in cls.table}

def one_step(cls,test,changes,code):
    before=observe(cls,code)
    result=test.step(changes)
    after=observe(cls,code)
    rev=cls.repo.git('rev-parse','HEAD')
    corpus=tool.corpus(cls.repo.reader,rev,'corpus.json',toolchain=cls.toolchain)
    return {'revision':rev,'pristine':tool.pristine(cls.repo.reader,rev),'before':before,'after':after,
            'regenerate':result['result'],'changed':result['changed'],'corpus':corpus['result']}

out={'candidate':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),
     'node':subprocess.check_output(['node','--version'],text=True).strip(),'python':sys.version.split()[0]}
try:
    with patch.object(RepositoryFixture,'commit',with_link): Symlinks.setUpClass()
    test=Symlinks(methodName='runTest')
    out['symlink_initial']=snapshot(Symlinks)
    assert all(r['status']=='preserved' for r in Symlinks.table)
    code="import fs from 'node:fs'; console.log(JSON.stringify(fs.readdirSync('tests/fixtures',{recursive:true}).sort()));"
    out['symlink_steps']=[]
    for name in ('one.json','deeper/two.json'):
        step=one_step(Symlinks,test,{'data/target/'+name:'{}\n'},code)
        assert step['pristine'] and step['before'] != step['after']
        assert (step['regenerate'],step['changed'],step['corpus'])==('table_current',[],'revalidation_complete')
        out['symlink_steps'].append(step)
    positive=test.step({'tests/fixtures/direct.json':'{}\n'})
    assert positive['result']=='table_differs'
    out['symlink_direct_control']={'regenerate':positive['result'],'changed':positive['changed']}
finally:
    Symlinks.doClassCleanups()
try:
    Patterns.setUpClass()
    test=Patterns(methodName='runTest')
    out['pattern_initial']=snapshot(Patterns)
    for row in Patterns.table:
        assert row['status']==('refused' if '/string/' in row['file'] else 'preserved')
    code="import fs from 'node:fs'; console.log(JSON.stringify(fs.globSync(['tests/fixtures/entry'], {withFileTypes:true}).map(x=>({name:x.name,file:x.isFile(),directory:x.isDirectory()}))));"
    out['pattern_steps']=[]
    for changes in ({'tests/fixtures/entry':None,'tests/fixtures/entry/seed.json':'{}\n'},
                    {'tests/fixtures/entry/seed.json':None}):
        if len(changes)==1:
            # Delete the tracked directory before replacing it with a same-name file.
            Patterns.repo.git('rm','-rq','tests/fixtures/entry')
            changes={'tests/fixtures/entry':'file again\n'}
        step=one_step(Patterns,test,changes,code) if len(changes)>1 else None
        if step is None:
            # Observe the prior result from the completed directory stage; current tree is already edited.
            before=out['pattern_steps'][-1]['after']
            result=test.step(changes)
            rev=Patterns.repo.git('rev-parse','HEAD')
            corpus=tool.corpus(Patterns.repo.reader,rev,'corpus.json',toolchain=Patterns.toolchain)
            step={'revision':rev,'pristine':tool.pristine(Patterns.repo.reader,rev),'before':before,
                  'after':observe(Patterns,code),'regenerate':result['result'],'changed':result['changed'],'corpus':corpus['result']}
        assert step['pristine'] and step['before'] != step['after']
        assert (step['regenerate'],step['changed'],step['corpus'])==('table_current',[],'revalidation_complete')
        out['pattern_steps'].append(step)

finally:
    Patterns.doClassCleanups()
print(json.dumps(out,indent=2))
