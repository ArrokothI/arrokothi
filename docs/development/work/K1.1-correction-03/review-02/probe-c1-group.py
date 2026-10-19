#!/usr/bin/env python3
"""Direct B/C leaf errors for ingress O-APPENDOWN-PUSH, without the value-cost adapter.
Run from C with the B clone as argument. All edits happen in disposable copies.
"""
import json, os, shutil, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path.cwd()
BASE = Path(sys.argv[1]).resolve()
PACKET = ROOT/'docs/development/work/K1.1-correction-03'
records = json.loads((PACKET/'c1-requalification-02/registrations.json').read_text())
row = next(r for r in records['withdrawn'] if r['case']=='value-cost.c1.ingress' and 'O-APPENDOWN-PUSH' in r['ablation_ids'])
mutant = next(r for r in json.loads((PACKET/'c1-ablation/mutants-all.json').read_text()) if r['id']=='O-APPENDOWN-PUSH')
case = next(r for r in json.loads((ROOT/'tests/fixtures/packet-tools/value-cost.json').read_text())['cases'] if r['id']==row['case'])
titles = json.loads((PACKET/'c1-ablation/map.json').read_text())
special = set('\\^$.*+?()[]{}|/')
escape = lambda s: ''.join('\\'+c if c in special else c for c in s)
bpattern = '^(?:'+'|'.join(escape(r['original']) for r in titles if r['file']=='ingress.test.ts')+')$'
env = {k:os.environ[k] for k in ('PATH','HOME','TMPDIR') if k in os.environ}
env['LANG'] = 'C.UTF-8'
out = []
for label, tree, pattern, edit in [('B',BASE,bpattern,mutant['at_b']),('C',ROOT,case['input']['pattern'],row['registration'])]:
    with tempfile.TemporaryDirectory(prefix='kc3-review02-c1-direct-') as tmp:
        root = Path(tmp)
        for path in ('packages/kernel/src','packages/kernel/tests'):
            shutil.copytree(tree/path,root/path)
        for path in ('package.json','tsconfig.json'):
            shutil.copy2(tree/path,root/path)
        (root/'node_modules').symlink_to(ROOT/'node_modules',target_is_directory=True)
        # Registrations use either one edit inline or an edits list.
        edits = edit if isinstance(edit,list) else edit.get('edits',[edit])
        for e in edits:
            p=root/e['path']; text=p.read_text()
            assert text.count(e['before'])==1,(label,e['path'],text.count(e['before']))
            p.write_text(text.replace(e['before'],e['after']))
        argv=['node','--no-warnings','--experimental-strip-types','--test','--test-reporter=tap','--test-name-pattern='+pattern,'packages/kernel/tests/ingress.test.ts']
        run=subprocess.run(argv,cwd=root,env=env,text=True,capture_output=True,timeout=120)
        out.append({'tree':label,'revision':subprocess.check_output(['git','rev-parse','HEAD'],cwd=tree,text=True).strip(),
            'edits':edits,'argv':argv,'exit':run.returncode,'stdout':run.stdout,'stderr':run.stderr})
print(json.dumps({'node':subprocess.check_output(['node','--version'],env=env,text=True).strip(),'runs':out},indent=2))
