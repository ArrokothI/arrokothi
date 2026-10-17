#!/usr/bin/env python3
"""Loss-by-loss C1 observations, with no aggregate replacement credit.

Reads the maintained probe's full B/C matrices. Emits all original historical pairs, every
qualified B loss, and candidate exact C witnesses requiring isolated confirmation. A candidate
is not a closed replacement: the ledger retains the obligation and the isolated evidence slot.
"""
import argparse
import gzip
import json
from collections import defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
PACKET=ROOT/'docs/development/work/K1.1-correction-03'


def load(path):
    with gzip.open(path/'observations.jsonl.gz','rt') as file:
        rows=[json.loads(line) for line in file]
    return {(row['mutant'],Path(row['file']).name):row for row in rows}


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


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--b',required=True,type=Path);parser.add_argument('--c',required=True,type=Path)
    parser.add_argument('--output',required=True,type=Path);args=parser.parse_args()
    b,c=load(args.b),load(args.c)
    mapping=json.loads((PACKET/'c1-ablation/map.json').read_text())
    mutants=json.loads((ROOT/'tests/fixtures/packet-tools/value-cost-c1-ports.json').read_text())
    historical=[json.loads(line) for line in (PACKET/'c1-ablation-01.jsonl').read_text().splitlines()]
    old=defaultdict(dict);cascades=set()
    for row in historical:
        if row['side']=='b' and row.get('mutant')!='control':
            for kind in ['failed','vanished']:
                for title in row.get(kind,[]):old[(row['file'],title.split(' > ')[-1])][row['mutant']]=kind
        if row['side']=='b-alone' and row.get('alone')==['passed']:
            cascades.add((row['file'],row['leaf'],row['mutant']))
    rows=[];historical_count=0;losses=0;isolations=[]
    for conversion in mapping:
        file,original=conversion['file'],conversion['original']
        for mutant in mutants:
            mid=mutant['id'];before=leaf_result(b,mid,file,original)
            after=[leaf_result(c,mid,file,title) for title in conversion['converted']]
            historical_kind=old[(file,original)].get(mid)
            historical_count+=historical_kind is not None
            lost=before['qualified'] and not any(row['qualified'] for row in after)
            candidates=[]
            if lost:
                losses+=1
                for (mutant_id,c_file),run in c.items():
                    if mutant_id!=mid:continue
                    for leaf in (run.get('observation') or {}).get('observations',[]):
                        result=leaf_result(c,mid,c_file,leaf['name'])
                        if result['qualified']:
                            witness={'file':c_file,'title':leaf['name'],'path':leaf['path'],'declaration':leaf['declaration'],**leaf['witnessed']}
                            candidates.append(witness)
                # Exact candidate witnesses are leads until an isolated control/mutant result is attached.
                for witness in candidates:
                    isolations.append({'side':'c','mutant':mid,'file':witness['file'],'title':witness['title'],'path':witness['path']})
                isolations.append({'side':'b','mutant':mid,'file':file,'title':original,'path':before['leaf']['path']})
            rows.append({'file':file,'original':original,'converted':conversion['converted'],'mutant':mid,
                         'obligation':mutant['mechanism'],'historical':historical_kind,
                         'historical_cascade':(file,original,mid) in cascades,'b':before,'c':after,'loss':lost,
                         'replacement_candidates':candidates,'replacement':None if lost else 'not_required',
                         'residual_reliance':False})
    if len(mapping)!=69 or len(mutants)!=87 or historical_count!=437:
        raise RuntimeError('C1 historical inventory changed')
    unique={json.dumps(row,sort_keys=True):row for row in isolations}
    args.output.mkdir(parents=True,exist_ok=True)
    (args.output/'loss-ledger.json').write_text(json.dumps({'conversions':69,'mutants':87,'matrix_files':9,
        'historical_pairs':historical_count,'qualified_b_losses':losses,'replacement_credit':'none until isolated obligation review',
        'rows':rows},indent=2)+'\n')
    (args.output/'isolation-leads.json').write_text(json.dumps(list(unique.values()),indent=2)+'\n')
    print(json.dumps({'pairs':len(rows),'historical_pairs':historical_count,'qualified_b_losses':losses,'isolation_leads':len(unique)}))


if __name__=='__main__':main()
