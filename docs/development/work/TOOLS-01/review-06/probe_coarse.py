"""Independent bounded coarse-rule probes; run only after the composed verify exits.

No subject fixture is executed. The pinned parser's raw sites are inspected in a temporary copy.
This checks recognition and lack of a table exemption, not arbitrary JavaScript soundness.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

ROOT=Path(__file__).resolve().parents[5]
OUT=Path(__file__).resolve().parent
C='83094969e591dba5c4f25d19c572522b78a7a396'
def blob(path):
    return subprocess.check_output(['git','show',C+':'+path],cwd=ROOT)
names='Object Function Array String Number Boolean BigInt Symbol Date RegExp Error AggregateError EvalError RangeError ReferenceError SyntaxError TypeError URIError Map Set WeakMap WeakSet WeakRef FinalizationRegistry Promise ArrayBuffer SharedArrayBuffer DataView Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float16Array Float32Array Float64Array BigInt64Array BigUint64Array JSON Math Reflect Atomics Intl WebAssembly globalThis global'.split()
cases=[]
def case(name,body,expected=True):
    cases.append(dict(name=name,text="import {test} from 'node:test';\n"+f"test('probe', () => {{ {body} }});\n",expected=expected))
for name in names:
    case('bare/'+name,'void '+name+';')
    case('type/'+name,'type T = typeof '+name+'; let x: T | undefined; void x;',False)
old_safe={
 'keys':'Object.keys({a:1})', 'reflection':'Reflect.ownKeys({a:1})', 'array-is':'Array.isArray([])',
 'assert':'assert.equal(Object.prototype,Object.prototype)', 'comparison':'Object===Object',
 'entries':'Object.entries(Object)', 'values':'Object.values(Object)', 'create':'Object.create(null)',
 'json':'JSON.stringify({a:1})','json-parse':"JSON.parse('{}')",'map':'new Map()',
 'promise':'Promise.resolve(1)','constant':'Number.NaN','symbol':'Symbol.iterator',
 'math':'Math.min(1,2)','date':'Date.now()','string':'String(1)','number':'Number(1)',
 'error':"new Error('x')",'regexp':"new RegExp('x')",'webassembly':'WebAssembly.Module',
}
for name,expr in old_safe.items(): case('formerly-safe/'+name,'void ('+expr+');')
for name,body in {
 'descriptor':"const d=Object.getOwnPropertyDescriptor(Object,'prototype'); void d;",
 'destructure':'const {prototype:p}=Object; void p;',
 'scope-blind':'const Object = {}; void Object;',
 'member-name':'void value.prototype;',
 'computed-name':"void value['constructor'];",
 'computed-prototype':"void value['__proto__'];",
 'getPrototypeOf':'const p=Reflect.getPrototypeOf(value); void p;',
 'class-extends':'class E extends Error {}',
 'unicode':r'void \u004fbject;',
 'optional':'Object?.keys?.({})',
}.items(): case('recognition/'+name,body)
for name,body in {
 'ordinary':'const x={a:1}; x.a=2;',
 'property-spelling':"const x={Object:1}; void x.Object;",
 'string':"const x='Object.prototype'; void x;",
 'interface':'interface X extends Object {}',
 'implements':'class X implements Object {}',
}.items(): case('negative/'+name,body,False)
for name,body in {
 'eval':"const e=eval; e('1');",
 'dynamic-import':"void import(name);",
 'data-import':"void import('data:text/javascript,1');",
 'worker-eval':"new Worker('1',{eval:true});",
}.items(): case('unread/'+name,body)

requests=[dict(op='helpers',path='tests/'+r['name'].replace('/','-')+'.test.ts',text=r['text']) for r in cases]
env=os.environ.copy()
env['PATH']='/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin:'+env['PATH']
with tempfile.TemporaryDirectory(prefix='tools01-r6-coarse-') as directory:
    tmp=Path(directory)
    (tmp/'source-facts.mjs').write_bytes(blob('tests/tooling/source-facts.mjs'))
    dependencies=json.loads(blob('tests/fixtures/packet-tools/mutations.json'))['dependencies']
    pinned=next(r for r in dependencies if r['path']=='node_modules/typescript')
    for relative,expected in pinned['files'].items():
        data=(ROOT/pinned['path']/relative).read_bytes()
        assert hashlib.sha256(data).hexdigest()==expected
        target=tmp/pinned['path']/relative
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(data)
    (tmp/'requests.json').write_text(json.dumps(requests))
    cmd=['node','--no-warnings',str(tmp/'source-facts.mjs'),str(tmp/'requests.json'),str(tmp/'results.json')]
    run=subprocess.run(cmd,cwd=tmp,env=env,capture_output=True,text=True)
    assert run.returncode==0,run.stderr
    parsed=json.loads((tmp/'results.json').read_text())
rows=[]
for fixture,facts in zip(cases,parsed['results'],strict=True):
    sites=facts['registrations'][0]['ambient']
    rows.append(dict(**fixture,sites=sites,diagnostics=facts['diagnostics'],
                     passed=bool(sites)==fixture['expected'] and facts['diagnostics']==0))
result=dict(revision=C,node=subprocess.check_output(['node','--version'],env=env,text=True).strip(),
            typescript=parsed['typescript'],cases=rows,summary=dict(total=len(rows),
            passed=sum(r['passed'] for r in rows),failed=[r['name'] for r in rows if not r['passed']]))
(OUT/'coarse-probes.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result['summary'],indent=2))
