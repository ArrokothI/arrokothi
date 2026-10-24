#!/usr/bin/env python3
"""Loss-by-loss C1 observations, with no aggregate replacement credit.

Reads the maintained probe's full B/C matrices. Emits all original historical pairs, every
qualified B loss, and candidate exact C witnesses requiring isolated confirmation. A candidate
is not a closed replacement: the ledger retains the obligation and the isolated evidence slot.
"""
import argparse
import gzip
import importlib.util
import json
import hashlib
import re
import subprocess
from collections import defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
PACKET=ROOT/'docs/development/work/K1.1-correction-03'
_spec=importlib.util.spec_from_file_location('packet_tools',ROOT/'scripts/packet_tools.py')
tool=importlib.util.module_from_spec(_spec);_spec.loader.exec_module(tool)
require=tool.require


def load(path):
    summary=json.loads((path/'summary.json').read_text())
    if summary.get('runs')!=792 or not summary.get('production_restored'):
        raise RuntimeError('not a complete restored C1 matrix: '+str(path))
    with gzip.open(path/'observations.jsonl.gz','rt') as file:
        rows=[json.loads(line) for line in file]
    if len(rows)!=792:raise RuntimeError('wrong matrix row count')
    result={(row['mutant'],Path(row['file']).name):row for row in rows}
    if len(result)!=len(rows):raise RuntimeError('duplicate matrix cells')
    return result



def repository_path(path):
    if path.startswith('packages/'):return path
    if '/packages/' not in path:raise RuntimeError('witness outside repository tests: '+path)
    return 'packages/'+path.split('/packages/',1)[1]


def overlay(text, patch):
    original=text.splitlines(True);result=[];position=0
    for line in patch.splitlines(True):
        if line.startswith(('---','+++')):continue
        if line.startswith('@@'):
            start=int(re.match(r'@@ -(\d+)',line).group(1))-1
            result.extend(original[position:start]);position=start
        elif line.startswith((' ','-')):
            if original[position]!=line[1:]:raise RuntimeError('B overlay context mismatch')
            if line[0]==' ':result.append(original[position])
            position+=1
        elif line.startswith('+'):result.append(line[1:])
    result.extend(original[position:]);return ''.join(result)


def bind_assertions(runs, metadata, directory):
    requests=[];targets=[];sources={}
    for row in runs.values():
        for leaf in (row.get('observation') or {}).get('observations',[]):
            witness=leaf.get('witnessed')
            if not witness:continue
            path=repository_path(witness['module'])
            if path not in sources:
                text=subprocess.check_output(['git','show',metadata['revision']+':'+path],cwd=ROOT,text=True)
                if metadata['side']=='b' and path=='packages/kernel/tests/harness.ts':
                    patch=(directory/'harness-overlay.diff').read_text()
                    if hashlib.sha256(patch.encode()).hexdigest()!=metadata['overlay_sha256']:raise RuntimeError('overlay digest mismatch')
                    text=overlay(text,patch)
                sources[path]=text
            requests.append({'path':path,'text':sources[path],**{key:witness['anchor'][key] for key in ('line','column','expression')}})
            targets.append(witness)
    output=subprocess.check_output(['node','tests/tooling/value-cost-assertion-sites.mjs'],cwd=ROOT,input=json.dumps(requests),text=True)
    for target,anchor in zip(targets,json.loads(output),strict=True):target['exact_assertion']=anchor


def leaf_result(runs, mutant, file, title):
    row=runs.get((mutant,file))
    if row is None:return {'qualified':False,'state':'missing_run'}
    observation=row.get('observation') or {}
    leaves=[leaf for leaf in observation.get('observations',[]) if leaf['name']==title]
    if len(leaves)!=1:return {'qualified':False,'state':'missing_leaf' if not leaves else 'ambiguous_leaf','matches':leaves,'process':row.get('state')}
    leaf=leaves[0]
    controls=(runs.get(('control',file),{}).get('observation') or {})
    control=[value for value in controls.get('observations',[]) if value['name']==title and value['event']=='pass']
    witness=leaf.get('witnessed')
    qualified=(controls.get('state')=='passed' and len(control)==1 and row.get('state')=='assertion_failed'
               and leaf['event']=='fail' and leaf['failureType']=='testCodeFailure' and witness is not None)
    return {'qualified':qualified,'state':'qualifying_assertion' if qualified else 'passed' if leaf['event']=='pass' else row.get('state'),
            'process':row.get('state'),'leaf':leaf,'passing_control':len(control)==1 and controls.get('state')=='passed',
            'mixed':bool(observation.get('nonqualifying'))}


def control_binding(runs, file, title):
    """Keep the original declaration even when a mutant prevents that leaf from appearing."""
    control=runs[('control',file)]
    leaves=[leaf for leaf in control['observation']['observations'] if leaf['name']==title]
    if len(leaves)!=1 or leaves[0]['event']!='pass' or control['state']!='passed':
        raise RuntimeError('missing or ambiguous passing control: '+file+' / '+title)
    leaf=leaves[0]
    return {'file':control['file'],'title':title,'path':leaf['path'],
            'declaration':{**leaf['declaration'],'file':repository_path(leaf['declaration']['file'])},
            'passing_control':True}



def registered_candidates(directory, metadata, mutants):
    """Use exact same-edit registry witnesses, including meter tests absent from the nine-file matrix."""
    if directory is None:return {}
    other=json.loads((directory/'metadata.json').read_text())
    if other['revision']!=metadata['revision'] or other['tooling']!=metadata['tooling']:
        raise RuntimeError('registry candidate revision/tooling differs')
    summary=json.loads((directory/'summary.json').read_text())
    if not summary.get('production_restored'):raise RuntimeError('registry source restoration not confirmed')
    with gzip.open(directory/'observations.jsonl.gz','rt') as file:rows=[json.loads(line) for line in file]
    if len(rows)!=summary['runs']:raise RuntimeError('registry observation count differs')
    runs={(row['case'],row['mutant']):row for row in rows}
    if len(runs)!=len(rows):raise RuntimeError('duplicate registry cells')
    bind_assertions(runs,other,directory)
    by_edit=defaultdict(list)
    for mutant in mutants:
        edits=mutant['at_c'] if isinstance(mutant['at_c'],list) else [mutant['at_c']]
        key=json.dumps([[edit[field] for field in ('path','before','after')] for edit in edits])
        by_edit[key].append(mutant['id'])
    result=defaultdict(list)
    for row in rows:
        if row['mutant']=='control':continue
        mids=by_edit.get(json.dumps(row['edits']),[])
        if not mids:continue
        file=Path(row['file']).name
        for leaf in (row.get('observation') or {}).get('observations',[]):
            pair={('control',file):runs[(row['case'],'control')],(row['mutant'],file):row}
            value=leaf_result(pair,row['mutant'],file,leaf['name'])
            if value['qualified']:
                witness={'file':file,'title':leaf['name'],'path':leaf['path'],'declaration':leaf['declaration'],
                         'from_registry_case':row['case'],**leaf['witnessed']}
                for mid in mids:result[mid].append(witness)
    return result


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--b',required=True,type=Path);parser.add_argument('--c',required=True,type=Path)
    parser.add_argument('--c-registry',type=Path,help='same-C registry observations, including maintained meter witnesses')
    parser.add_argument('--output',required=True,type=Path);args=parser.parse_args()
    # TOOLS-02 T2-2: it reads K1.1-correction-03 records from the working tree, so only a pristine checkout.
    git=tool.Git(ROOT)
    require(tool.pristine(git,git.run('rev-parse','HEAD').decode().strip()),'value-cost-loss-ledger'+tool.UNCLEAN)
    b,c=load(args.b),load(args.c)
    bm,cm=[json.loads((path/'metadata.json').read_text()) for path in (args.b,args.c)]
    if bm['tooling']!=cm['tooling']:raise RuntimeError('B/C qualification tooling differs')
    bind_assertions(b,bm,args.b);bind_assertions(c,cm,args.c)
    mapping=json.loads((PACKET/'c1-ablation/map.json').read_text())
    mutants=json.loads((ROOT/'tests/fixtures/packet-tools/value-cost-c1-ports.json').read_text())
    extra_candidates=registered_candidates(args.c_registry,cm,mutants)
    historical=[json.loads(line) for line in (PACKET/'c1-ablation-01.jsonl').read_text().splitlines()]
    old=defaultdict(dict);cascades=set()
    for row in historical:
        if row['side']=='b' and row.get('mutant')!='control':
            for kind in ['failed','vanished']:
                for title in row.get(kind,[]):old[(row['file'],title.split(' > ')[-1])][row['mutant']]=kind
        if row['side']=='b-alone' and row.get('alone')==['passed']:
            cascades.add((row['file'],row['leaf'],row['mutant']))
    rows=[];historical_count=0;losses=0;isolations=[]
    converted_keys={(row['file'],row['original']) for row in mapping}
    for conversion in mapping:
        file,original=conversion['file'],conversion['original']
        original_binding=control_binding(b,file,original)
        converted_bindings=[control_binding(c,file,title) for title in conversion['converted']]
        for mutant in mutants:
            mid=mutant['id'];before=leaf_result(b,mid,file,original)
            after=[leaf_result(c,mid,file,title) for title in conversion['converted']]
            historical_kind=old[(file,original)].get(mid)
            historical_count+=historical_kind is not None
            lost=before['qualified'] and not any(row['qualified'] for row in after)
            cascade=(file,original,mid) in cascades
            needs_replacement=lost or (historical_kind=='failed' and not cascade and not any(row['qualified'] for row in after))
            candidates=[]
            if lost:losses+=1
            if needs_replacement:
                for (mutant_id,c_file),run in c.items():
                    if mutant_id!=mid:continue
                    for leaf in (run.get('observation') or {}).get('observations',[]):
                        result=leaf_result(c,mid,c_file,leaf['name'])
                        if result['qualified']:
                            witness={'file':c_file,'title':leaf['name'],'path':leaf['path'],'declaration':leaf['declaration'],**leaf['witnessed']}
                            candidates.append(witness)
                candidates.extend(extra_candidates.get(mid,[]))
                candidates=list({json.dumps(witness,sort_keys=True):witness for witness in candidates}.values())
                # Exact candidate witnesses are leads until an isolated control/mutant result is attached.
                for witness in candidates:
                    isolations.append({'side':'c','mutant':mid,'file':witness['file'],'title':witness['title'],'path':witness['path']})
                if before.get('leaf'):
                    isolations.append({'side':'b','mutant':mid,'file':file,'title':original,'path':before['leaf']['path']})
            rows.append({'file':file,'original':original,'converted':conversion['converted'],'mutant':mid,
                         'original_test':original_binding,'converted_tests':converted_bindings,
                         'obligation':mutant['mechanism'],'historical':historical_kind,
                         'disposition':'retained' if before['qualified'] and not lost else 'uncredited_at_C' if lost else 'uncredited_at_B',
                         'historical_cascade':cascade,'needs_replacement':needs_replacement,'b':before,'c':after,'loss':lost,
                         'replacement_candidates':candidates,'replacement':None if needs_replacement else 'not_required',
                         'residual_reliance':False})
    if len(mapping)!=69 or len(mutants)!=87 or historical_count!=437:
        raise RuntimeError('C1 historical inventory changed')
    unchanged_losses=[]
    for (mid,file),run in b.items():
        if mid=='control':continue
        for leaf in (run.get('observation') or {}).get('observations',[]):
            if (file,leaf['name']) in converted_keys:continue
            before=leaf_result(b,mid,file,leaf['name']);after=leaf_result(c,mid,file,leaf['name'])
            if before['qualified'] and not after['qualified']:
                unchanged_losses.append({'file':file,'title':leaf['name'],'mutant':mid,'b':before,'c':after,
                    'scope':'outside the 69 conversions; separately visible qualification downgrade'})
    # A mixed matrix row is a lead only. Independently isolate each qualifying leaf before
    # relying on it, so a surviving or cascading neighbor cannot manufacture replacement credit.
    for side,runs in [('b',b),('c',c)]:
        for (mid,file),run in runs.items():
            if mid=='control' or not (run.get('observation') or {}).get('nonqualifying'):continue
            for leaf in (run.get('observation') or {}).get('observations',[]):
                if leaf_result(runs,mid,file,leaf['name'])['qualified']:
                    isolations.append({'side':side,'mutant':mid,'file':file,'title':leaf['name'],'path':leaf['path']})
    unique={json.dumps(row,sort_keys=True):row for row in isolations}
    args.output.mkdir(parents=True,exist_ok=True)
    (args.output/'loss-ledger.json').write_text(json.dumps({'conversions':69,'mutants':87,'matrix_files':9,
        'b_metadata':bm,'c_metadata':cm,'mutations':mutants,'unchanged_test_losses':unchanged_losses,
        'historical_pairs':historical_count,'qualified_b_losses':losses,'replacement_credit':'none until isolated obligation review',
        'replacement_rows':sum(row['needs_replacement'] for row in rows),'rows':rows},indent=2)+'\n')
    (args.output/'isolation-leads.json').write_text(json.dumps(list(unique.values()),indent=2)+'\n')
    print(json.dumps({'pairs':len(rows),'historical_pairs':historical_count,'qualified_b_losses':losses,'isolation_leads':len(unique)}))


if __name__=='__main__':main()
