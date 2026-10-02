#!/usr/bin/env python3
"""Codex/GPT-6 session; local sandboxed repository access, no acceptance authority.
Render option-owned records. No generated suffix or inherited closure/claims field exists.
"""
from pathlib import Path
import copy,json,re,sys
sys.dont_write_bytecode = True
from session import SESSION
P=Path(__file__).resolve().parents[1]
REQUIRED={'A','B','C','F02','F09','F10'}
def norm(x):
    return re.sub(r'\s+',' ',re.sub(r'[*`_]','',x)).strip().lower()
def validate(model,inventory):
    assert model['schema_version']==2
    for key,item in model['items'].items():
        opts=item['options'];assert len(opts)>=2,key
        assert any(o['label'].startswith('Keep') for o in opts),key
        assert sum('Recommend' in o['label'] for o in opts)==1,key
        for field in ('claims','closure'):
            cells=[norm('; '.join(o[field]) if isinstance(o[field],list) else o[field]) for o in opts]
            assert all(cells) and len(set(cells))==len(cells),(key,'identical or empty',field)
        assert len({o['id'] for o in opts})==len(opts)
        for o in opts:
            assert o['claims'] and isinstance(o['claims'],list)
            assert o['method'] in ['deterministic check','structural mechanism','declared bounded search']
            c=norm(o['closure'])
            # A reference may support a closure, but cannot supply its missing mechanism.
            assert not re.fullmatch(r'(?:see|use|follow|refer to|same as|as in|per)\b.*',c),(key,'reference-only closure')
            assert len(c.split())>=18 and re.search(r'\b(test|check|reject|refuse|compare|assert|verify|derive|run|prove|record|enumerate|walk|generate|require|permit|maintain|validate|keep|core|only|no)\w*\b',c),(key,'no concrete closure')
            if key in REQUIRED:
                assert set(o['inventory'])==set(inventory),(key,o['id'],'inventory coverage')
                assert all(v['disposition'] in ['keep','narrow','remove'] and v['reason'].strip() for v in o['inventory'].values())
                assert o['sdk'].strip() and isinstance(o['moot_findings'],list) and o['moot_reason'].strip()
            if 'Recommend' in o['label'] and key in REQUIRED:
                assert o['core']=='canonical-bytes',(key,'contradictory selected core')
def self_test(model,inventory):
    for field in ['claims','closure']:
        bad=copy.deepcopy(model);bad['items']['F01']['options'][1][field]=bad['items']['F01']['options'][0][field]
        try:validate(bad,inventory)
        except AssertionError:pass
        else:raise AssertionError('surviving duplicate '+field)
    for text in ['Use C closure criteria','See [A](A.md) for every closure and all tests','Same as item B; refer to it for the independently required implementation details and all tests']:
        bad=copy.deepcopy(model);bad['items']['F02']['options'][1]['closure']=text
        try:validate(bad,inventory)
        except AssertionError:pass
        else:raise AssertionError('surviving reference-only closure')
    for kind in ['missing-claim','wrong-core']:
        bad=copy.deepcopy(model)
        if kind=='missing-claim':bad['items']['A']['options'][0]['inventory'].pop(next(iter(inventory)))
        else:bad['items']['C']['options'][-1]['core']='live'
        try:validate(bad,inventory)
        except AssertionError:pass
        else:raise AssertionError('surviving '+kind)
def table(key,item):
    lines=['| Option | Benefit and cost | Affected claims | Finishable closure | Recorded counterexamples |','|---|---|---|---|---|']
    for o in item['options']:
        label=o['label'];label=('**'+label+'**') if len(key)==1 and 'Recommend' in label else label
        claims='; '.join(o['claims'])
        if key in REQUIRED:claims+=f" Full dispositions, SDK and moot K1.1 findings: [§{o['id']}](option-claims.md#{o['id'].lower()})."
        closure=o['method']+': '+o['closure']
        if o.get('dependency'):closure+=' '+o['dependency']
        assert all('|' not in v for v in [label,o['cost'],claims,closure])
        corpus=f"[{o['id']}](closure-corpus.md#{o['id'].lower()})"
        lines.append('| '+' | '.join([label,o['cost'],claims,closure,corpus])+' |')
    return '\n'.join(lines)
def main():
    model=json.loads((P/'family-notes.json').read_text());inv=json.loads((P/'claim-inventory.json').read_text())['claims'];validate(model,inv);self_test(model,inv)
    measures=json.loads((P/'measurements.json').read_text())
    def expand(s):return s.replace('{{exclusive_test_lines}}',f"{measures['totals']['exclusive_identified_test_lines']:,}")
    out={};sections=[]
    for key,item in model['items'].items():
        if len(key)==1:context=expand(item['context'])
        else:
            rules=[]
            for part in item['rules'].split('; '):
                path=part.split('#')[0]
                if path.startswith(('mechanisms/','concepts/')):part='mental-model/'+part
                if part.startswith(('mental-model/','docs/development/','AGENTS.md')):rules.append(f'[{part}](../../../../{part})')
                else:rules.append(part)
            context=f"**Cause:** {item['cause']}\n\n**Rule owner:** {'; '.join(rules)}. **Sites:** {item['sites']}. **Why instance-by-instance:** {item['why']}"
        body=context+'\n\n'+table(key,item)+'\n\n'+expand(item.get('after',''))
        body+=f'\n\nDecision draft: [{key}](decision-drafts/{key}.md). [CORE](decision-drafts/CORE.md) owns joint dependencies; no amendment or successor is released.'
        sections.append(('##' if len(key)==1 else '###')+f' {key} — {item["title"]}\n\n'+body)
        # Same data and text in drafts, links relocated mechanically.
        db=re.sub(r'\]\((?!https?:|#)([^)]+)\)',lambda q:'](../'+q.group(1)+')',body)
        out[f'decision-drafts/{key}.md']=SESSION+f'\n\n# DRAFT owner decision — {key}: {item["title"]}\n\nNot adopted. Owner-selected drafting directions are in [owner-decisions-02](../owner-decisions-02.md); accepted rules change only through separately adopted amendments and accepted packets.\n\n'+db+'\n'
    intro=SESSION+'\n\n# DESIGN-AUDIT-01 register\n\nGenerated by `probes/render-register.py` from option-owned `family-notes.json`; edit the data, then regenerate. Owner-selected directions are drafts, not adopted amendments. The [classification hold](invalidation-01.md) and [V-D1 hold](../K1.2/invalidation-02.md) remain. No successor is released.\n\n[Joint CORE draft](decision-drafts/CORE.md), [claim inventory](claim-inventory.md), [per-option claims](option-claims.md), [owner checks and evidence](owner-checks-02.md), [DA-1 table](da-1-table.md), [measurements](measurements.md), [R8 results](review08-results.md), [evidence catalog](evidence-inventory.md), [flip checklist](verdict-flips.md).\n\n'
    out['register.md']=intro+'\n\n'.join(sections)+'\n'
    out['claim-inventory.md']=SESSION+'\n\n# Declared claim inventory\n\nPinned to B `66bc041175e6fc191c2e7cf88de198111e7d97c9`. These are current obligations, not newly adopted rules. Dispositions describe hypothetical successor amendments. A keep disposition does not lift either hold. Narrow names a scope, location or profile restriction; remove names a replaced rule.\n\n| ID | Current claim | Owner |\n|---|---|---|\n'+'\n'.join(f'| {k} | {v["claim"]} | [{k}]({v["source"]}) |' for k,v in inv.items())+'\n'
    lines=[SESSION,'','# Per-option claim dispositions','','Every option below owns a complete inventory map. The compact register claims cell adds the option-specific mechanism; shared unchanged obligations remain keep. Current SDK compatibility is based on BASELINE and the bounded repository import search, not private external users.']
    for key,item in model['items'].items():
        if key not in REQUIRED:continue
        for o in item['options']:
            lines+=['',f'## {o["id"]}','',o['label'],'', '**SDK compatibility:** '+o['sdk'],'','**K1.1 findings made moot:** '+(', '.join(o['moot_findings']) or 'None')+'. '+o['moot_reason'],'','| Inventory entry | Disposition | Reason |','|---|---|---|']
            lines += [f'| [{k}](claim-inventory.md) | {v["disposition"]} | {v["reason"]} |' for k,v in o['inventory'].items()]
    out['option-claims.md']='\n'.join(lines)+'\n'
    for name,text in out.items():
        if '--check' in sys.argv:assert (P/name).read_text()==text,('stale render',name)
        else:(P/name).write_text(text)
    print(json.dumps(dict(result='PASS',items=len(model['items']),options=sum(len(i['options']) for i in model['items'].values()),inventory_entries=len(inv),negative_controls=7,rendered_files=len(out))))
if __name__=='__main__':main()
