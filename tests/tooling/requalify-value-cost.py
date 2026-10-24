#!/usr/bin/env python3
"""Design-03 B/C requalification through the maintained probe and packet_tools classifier.

The temporary B tree differs in production by zero bytes; only the two approved harness branches
and their assert import are overlaid in tests. Tooling overlays are listed with exact digests.
Every mutation is restored. Full process observations are retained, including mixed failures.
"""
import argparse
import difflib
import gzip
import hashlib
import importlib.util
import io
import json
import os
import re
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile
import time

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('packet_tools', ROOT / 'scripts/packet_tools.py')
tool = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tool)
require = tool.require
B = 'b9c1e549c81fa4fe4f18fa1a36986f1a5581fc9b'
PROBE = ['tests/tooling/value-cost-probe.mjs', 'tests/tooling/value-cost-witness.mjs',
         'tests/tooling/value-cost-reporter.mjs', 'tests/tooling/value-cost-source-policy.mjs']
REGISTRY = 'tests/fixtures/packet-tools/value-cost.json'
ENV = {name: os.environ[name] for name in ('PATH', 'HOME', 'TMPDIR') if name in os.environ}
ENV['LANG'] = 'C.UTF-8'
sha = lambda data: hashlib.sha256(data).hexdigest()


def probe(tree, entry, edits):
    saved = {path: (tree/path).read_bytes() for path, _, _ in edits}
    refusal = tool.apply_edits(tree, edits) if edits else None
    try:
        if refusal:
            return {'runner': 'setup_error', 'state': 'anchor_error', 'detail': refusal}
        (tree/REGISTRY).parent.mkdir(parents=True, exist_ok=True)
        (tree/REGISTRY).write_text(json.dumps({'version': 1, 'cases': [entry]}))
        run = tool.command(entry['argv'], tree, entry['timeout_seconds'], entry['output_limit_bytes'], ENV)
        if entry.get('direct'):
            return {'runner':'unqualified_direct_observation','state':'direct','run':run,'observation':None}
        outcome = tool.execution_outcome(run, entry)
        try:
            observation = json.loads(run.get('output', ''))
        except ValueError:
            observation = None
        return {'runner': outcome['status'], 'state': (observation or {}).get('state'),
                'run': run, 'observation': observation}
    finally:
        for path, data in saved.items():
            (tree/path).write_bytes(data)
            if (tree/path).read_bytes() != data:
                raise RuntimeError('mutation restore mismatch: ' + path)


def case(identifier, file, pattern='.'):
    return {'id': identifier, 'assertion': identifier+'.selected-tests',
            'input': {'file': file, 'pattern': pattern}, 'failure_exit': 17,
            'argv': ['node', '--no-warnings', '--experimental-strip-types', 'tests/tooling/value-cost-probe.mjs', identifier],
            'timeout_seconds': 900, 'output_limit_bytes': 1048576}



def edits_of(value):
    rows = value if isinstance(value, list) else value.get('edits', [value])
    return [(row['path'], row['before'], row['after']) for row in rows]


def original_case(entry, conversions):
    result = json.loads(json.dumps(entry))
    names = [row['original'] for row in conversions if entry['input']['file'].endswith('/'+row['file'])
             and any(re.search(entry['input']['pattern'], name) for name in row['converted'])]
    if not names: raise RuntimeError('no original counterpart for '+entry['id'])
    result['input']['pattern'] = '^(?:'+'|'.join(re.sub(r'([\\^$.*+?()\[\]{}|/])', r'\\\1', name) for name in names)+')$'
    return result


def supplementary_plans(selection, side, tree, isolation_file):
    registry = json.loads((ROOT/REGISTRY).read_text())['cases']
    conversions = json.loads((ROOT/'docs/development/work/K1.1-correction-03/c1-ablation/map.json').read_text())
    mutants = {row['id']: row for row in json.loads((ROOT/'tests/fixtures/packet-tools/value-cost-c1-ports.json').read_text())}
    historical = json.loads((ROOT/'docs/development/work/K1.1-correction-03/c1-requalification-02/registrations.json').read_text())
    plans, dispositions = [], []
    if selection == 'registry':
        for entry in registry:
            if side == 'b' and not (tree/entry['input']['file']).is_file():
                for mutant in entry['mutants']:
                    dispositions.append({'case':entry['id'],'mutant':mutant['id'],'state':'inapplicable_at_B',
                        'reason':'selected meter/corpus test file absent at B: '+entry['input']['file']})
                continue
            current = original_case(entry, conversions) if side == 'b' else entry
            plans.append((current, 'control', []))
            for mutant in entry['mutants']:
                if side == 'c': variants = [('current', edits_of(mutant))]
                else:
                    ids = mutant['name'].split(' (C1:',1)[0].split(' + ')
                    if any(mid not in mutants for mid in ids):raise RuntimeError('unmapped B registration: '+mutant['name'])
                    variants = [(mid, edits_of(mutants[mid]['at_b'])) for mid in ids]
                seen = set()
                for meaning, edits in variants:
                    key = json.dumps(edits)
                    if key in seen:continue
                    seen.add(key)
                    name = mutant['id']+'@'+meaning
                    dispositions.append({'case':entry['id'],'mutant':mutant['id'],'run_mutant':name,'meaning':meaning,'edits':edits,'state':'planned'})
                    plans.append((current, name, edits))
    elif selection in ('withdrawn','equivalent'):
        rows = historical['withdrawn' if selection == 'withdrawn' else 'ported']
        for index, row in enumerate(rows):
            entry = next(value for value in registry if value['id']==row['case'])
            current = original_case(entry, conversions) if side == 'b' else entry
            current = json.loads(json.dumps(current))
            current['id'] += '.'+selection+'.'+str(index)
            current['argv'][-1] = current['id'];current['assertion'] = current['id']+'.selected-tests'
            plans.append((current, 'control', []))
            for mid in row['ablation_ids']:
                mutant = mutants[mid]
                edit = mutant['at_b'] if side=='b' else row['registration'] if selection=='equivalent' else mutant['at_c']
                plans.append((current, mid, edits_of(edit)))
                dispositions.append({'case':current['id'],'historical':row,'meaning':mid,'mode':selection,'edits':edits_of(edit)})
    elif selection == 'isolated':
        for row in json.loads(isolation_file.read_text()):
            if row['side'] != side:continue
            pattern = '^'+re.sub(r'([\\^$.*+?()\[\]{}|/])',r'\\\1',row['title'])+'$'
            entry = case('isolated.'+str(len(plans)//2), 'packages/kernel/tests/'+row['file'], pattern)
            plans.extend([(entry,'control',[]),(entry,row['mutant'],edits_of(mutants[row['mutant']]['at_'+side]))])
            dispositions.append({'case':entry['id'],**row})
    elif selection == 'direct':
        entry = next(value for value in registry if value['id']=='value-cost.c1.ingress')
        current = original_case(entry,conversions) if side=='b' else entry
        current = json.loads(json.dumps(current));current['id'] = 'direct.ingress';current['direct'] = True
        current['argv'] = ['node','--no-warnings','--experimental-strip-types','--test','--test-reporter=tap',
                           '--test-name-pattern='+current['input']['pattern'],current['input']['file']]
        plans.extend([(current,'control',[]),(current,'O-APPENDOWN-PUSH',edits_of(mutants['O-APPENDOWN-PUSH']['at_'+side]))])
    return plans, dispositions


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--revision', required=True)
    parser.add_argument('--side', choices=['b', 'c'], required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--control-file', help='Focused unmutated control only; never a full matrix result')
    parser.add_argument('--selection', choices=['c1','registry','withdrawn','equivalent','isolated','direct'], default='c1')
    parser.add_argument('--isolation-file',type=Path)
    parser.add_argument('--plan-only',action='store_true',help='Write exact plans and applicability; no execution credit')
    args = parser.parse_args()
    # TOOLS-02 T2-2: it reads registry and ledger files from the working tree, so only a pristine checkout.
    git = tool.Git(ROOT)
    require(tool.pristine(git, git.run('rev-parse', 'HEAD').decode().strip()), 'requalify-value-cost' + tool.UNCLEAN)
    revision = subprocess.check_output(['git', 'rev-parse', args.revision], cwd=ROOT, text=True).strip()
    if args.side == 'b' and revision != B:
        raise RuntimeError('B is fixed')
    args.output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='kc3-requalification-', dir=os.path.realpath(tempfile.gettempdir())) as tmp:
        tree = Path(tmp)
        archive = subprocess.check_output(['git', 'archive', revision], cwd=ROOT)
        with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
            tar.extractall(tree, filter='data')
        # Archive mtimes are historical; refresh disposable files for long-running local jobs.
        for path in tree.rglob('*'):
            if path.is_file() and not path.is_symlink(): os.utime(path, None)
        (tree/'node_modules').symlink_to(ROOT/'node_modules', target_is_directory=True)
        sources = sorted(p for p in (tree/'packages').rglob('*') if p.is_file() and 'src' in p.relative_to(tree).parts
                         and p.suffix in ('.ts','.mts','.cts','.tsx','.js','.mjs','.cjs','.jsx'))
        production = {str(p.relative_to(tree)): sha(p.read_bytes()) for p in sources}
        tooling = {}
        for path in PROBE:
            (tree/path).parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT/path, tree/path)
            tooling[path] = sha((tree/path).read_bytes())
        inventory = tree/'tests/fixtures/packet-tools/value-cost-source-files.json'
        inventory.parent.mkdir(parents=True, exist_ok=True)
        inventory.write_text(json.dumps(sorted(production)))
        overlay = ''
        if args.side == 'b' and args.selection != 'direct':
            path = tree/'packages/kernel/tests/harness.ts'; before = path.read_text()
            after = before.replace('import type {', 'import assert from "node:assert/strict";\n\nimport type {', 1)
            old = 'if (!result.ok) throw new Error(`expected acceptance, got ${result.error.classification}: ${result.error.reason}`);'
            new = 'if (!result.ok) {\n    const message = `expected acceptance, got ${result.error.classification}: ${result.error.reason}`;\n    assert.fail(message);\n  }'
            old2 = 'if (result.ok) throw new Error("expected a refusal, but the request was accepted");'
            if before.count(old) != 1 or before.count(old2) != 1:
                raise RuntimeError('B harness overlay anchor changed')
            after = after.replace(old,new).replace(old2,'if (result.ok) assert.fail("expected a refusal, but the request was accepted");')
            path.write_text(after)
            overlay = ''.join(difflib.unified_diff(before.splitlines(True),after.splitlines(True),fromfile='B/packages/kernel/tests/harness.ts',tofile='B-with-test-only-overlay/packages/kernel/tests/harness.ts'))
        (args.output/'harness-overlay.diff').write_text(overlay)
        metadata = {'revision': revision, 'side': args.side, 'label': ('B unadapted direct observation' if args.selection=='direct' else 'B with test-only harness overlay') if args.side=='b' else 'C',
                    'node': subprocess.check_output(['node','--version'],text=True).strip(), 'tooling': tooling,
                    'inputs': {path:sha((ROOT/path).read_bytes()) for path in ['tests/tooling/requalify-value-cost.py','tests/fixtures/packet-tools/value-cost-c1-ports.json',REGISTRY]},
                    'production': production, 'overlay_sha256': sha(overlay.encode()), 'selection': args.selection}
        (args.output/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
        plans=[]
        if args.selection == 'c1':
            mutants=json.loads((ROOT/'tests/fixtures/packet-tools/value-cost-c1-ports.json').read_text())
            historical=[json.loads(line) for line in (ROOT/'docs/development/work/K1.1-correction-03/c1-ablation-01.jsonl').read_text().splitlines()]
            files=sorted({row['file'] for row in historical if row['side']=='b'})
            for mutant in [None,*mutants]:
                edit = [] if mutant is None else mutant['at_'+args.side]
                edit = edit if isinstance(edit,list) else [edit]
                edits = [(e['path'],e['before'],e['after']) for e in edit]
                for file in files:
                    plans.append((case('c1.'+file,'packages/kernel/tests/'+file), 'control' if mutant is None else mutant['id'], edits))
        else:
            plans, dispositions = supplementary_plans(args.selection,args.side,tree,args.isolation_file)
            (args.output/'dispositions.json').write_text(json.dumps(dispositions,indent=2)+'\n')
        (args.output/'plans.json').write_text(json.dumps([{'case':e,'mutant':m,'edits':d} for e,m,d in plans],indent=2)+'\n')
        if args.plan_only:
            for entry,mutant,edits in plans:
                for path,before,after in edits:
                    count = (tree/path).read_text().count(before)
                    if count != 1: raise RuntimeError(f'anchor matches {count}: {entry["id"]} {mutant} {path}')
            print(json.dumps({'plans':len(plans),'execution':'not run'}));return
        if args.control_file:
            plans=[row for row in plans if row[1]=='control' and row[0]['input']['file'].endswith('/'+args.control_file)]
            if len(plans)!=1:raise RuntimeError('control file selection must resolve once')
        counts={}
        with gzip.open(args.output/'observations.jsonl.gz','wt',encoding='utf8') as output:
            for index,(entry,mutant,edits) in enumerate(plans):
                if production != {str(p.relative_to(tree)):sha(p.read_bytes()) for p in sources if p.is_file()}:
                    raise RuntimeError('source tree changed outside the declared mutation; discard this run')
                started=time.monotonic()
                row={'case':entry['id'],'file':entry['input']['file'],'mutant':mutant,'edits':edits,**probe(tree,entry,edits)}
                row['seconds']=round(time.monotonic()-started,3)
                output.write(json.dumps(row)+'\n');output.flush()
                if mutant == 'control' and row['state'] != 'passed' and not entry.get('direct'):
                    raise RuntimeError('unmutated control failed: '+entry['id'])
                counts[row['state'] or row['runner']]=counts.get(row['state'] or row['runner'],0)+1
                print(json.dumps({'index':index+1,'total':len(plans),'case':entry['id'],'mutant':mutant,'state':row['state'],'runner':row['runner'],'seconds':row['seconds']}),flush=True)
        if production != {str(p.relative_to(tree)):sha(p.read_bytes()) for p in sources}:
            raise RuntimeError('production changed after restoration')
        (args.output/'summary.json').write_text(json.dumps({'runs':len(plans),'counts':counts,'production_restored':True},indent=2)+'\n')


if __name__=='__main__':
    main()
