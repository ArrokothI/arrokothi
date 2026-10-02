#!/usr/bin/env python3
"""Session/model: Codex / GPT-6; local sandboxed repository access, no acceptance authority.
Check recorded-case coverage before executing probes; render its reviewable account.
This validates memberships and expectations, not the meaning of the prose.
"""
import copy,json,sys
from pathlib import Path
sys.dont_write_bytecode = True
from session import SESSION
P=Path(__file__).resolve().parents[1]
SCOPES={'A':['F02','F09','F10','F13','F15','F16'],'B':['F02','F09','F10'],'C':['F02'],
        'D':['F03','F11','F12','F13','F15','F16'],'E':['F05','F06','F14','F15','F16'],'F':['F07','F08']}
BINDINGS={'isNaN','isFinite','Object','Array','JSON','Set','Error','Symbol'}
def validate(hard,closure,classes,model):
    hostile={k for k,v in classes.items() if v.get('hostile_only')}
    assert set(hard['findings'])==hostile,'hostile label coverage'
    assert set(hard['bindings'])==BINDINGS,'binding coverage'
    for label,row in hard['findings'].items():
        assert row['source'] and row['reason'] and row['reach']
        assert row['probes'] and set(row['probes'])<=set(hard['channels']),label
    for row in [*hard['channels'].values(),*hard['bindings'].values()]:
        assert (P/row['probe']).is_file()
        assert row['expected_frozen'] and row['expected_unfrozen']
    assert all(v['expected_pinned'] for v in hard['bindings'].values())
    assert set(closure['families'])==set(SCOPES['D']+SCOPES['E']+SCOPES['F']+SCOPES['A']+['F01','F04'])
    for fid,family in closure['families'].items():
        labels=family['labels']
        assert len(labels)==len(set(labels)) and set(labels)=={k for k,v in classes.items() if v.get('family')==fid},fid
        assert family['dimensions'] and family['locators']
    assert set(closure['options'])=={o['id'] for i in model['items'].values() for o in i['options']}
    for key,item in model['items'].items():
        for o in item['options']:
            row=closure['options'][o['id']]
            assert row['families']==SCOPES.get(key,[key]),o['id']
            assert len(row['response'].split())>=18,o['id']
def main():
    hard=json.loads((P/'hardening-corpus.json').read_text());closure=json.loads((P/'closure-corpus.json').read_text())
    classes=json.loads((P/'classifications.json').read_text());model=json.loads((P/'family-notes.json').read_text())
    validate(hard,closure,classes,model)
    for kind in ['hostile','binding','family','option']:
        h=copy.deepcopy(hard);c=copy.deepcopy(closure)
        if kind=='hostile':h['findings'].pop(next(iter(h['findings'])))
        if kind=='binding':h['bindings'].pop('Object')
        if kind=='family':c['families']['F09']['labels'].pop()
        if kind=='option':c['options']['A-hard']['families']=[]
        try:validate(h,c,classes,model)
        except AssertionError:pass
        else:raise AssertionError('surviving missing-'+kind)
    lines=[SESSION,'','# Recorded counterexamples and option closure','','Generated from `closure-corpus.json` and checked against `classifications.json`; option responses are authored assessments. All 51 options must answer their recorded families, even where evidence stays historical or a claim becomes conditional. A new classified label fails verification until reconciled. This guards coverage, not semantic truth. [Hardening manifest](hardening-corpus.json) supplies executable expected results for all 16 hostile labels. [Review-02 regressions](review02-regressions.json) and [runner](probes/round3-checks.py) retain the new counterexamples.','','No historical suite is claimed rerun by listing it. [DA-1 source table](da-1-table.md) and `enumeration-occurrences.json` locate the exact records. Future implementation closures must port those witnesses to maintained tests before acceptance.','','## Family scopes']
    for k,v in closure['families'].items():
        lines+=['',f'### {k}','',v['dimensions'],'','Recorded labels: '+', '.join('`'+x+'`' for x in v['labels'])+'.']
    lines+=['','## Option responses']
    for k,v in closure['options'].items():
        lines+=['',f'### {k}','','Recorded families: '+', '.join(f'[{f}](#{f.lower()})' for f in v['families'])+'.','',v['response']]
    result='\n'.join(lines)+'\n'
    if '--check' in sys.argv:assert (P/'closure-corpus.md').read_text()==result,'stale closure corpus'
    else:(P/'closure-corpus.md').write_text(result)
    print(json.dumps({'result':'PASS','hostile_labels':len(hard['findings']),'bindings':len(hard['bindings']),'option_reconciliations':len(closure['options']),'family_labels':sum(len(v['labels']) for v in closure['families'].values()),'negative_controls':4}))
if __name__=='__main__':main()
