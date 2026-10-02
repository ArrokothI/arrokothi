#!/usr/bin/env python3
"""Inventory every executable artifact and executable Markdown fence in the evidence records.
Conservative superset: also lists helpers, gate scripts and tests at the same pinned trees.
"""
from pathlib import Path
import hashlib,json,re,subprocess,sys
sys.dont_write_bytecode = True
from session import SESSION
P=Path(__file__).resolve().parents[1]; ROOT=P.parents[3]
A='9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49'; B='66bc041175e6fc191c2e7cf88de198111e7d97c9'
def git(*a):return subprocess.check_output(['git','-C',str(ROOT),*a]).decode()
def disposition(path,text):
 n=path.lower()
 if re.search(r'(zone-analysis|ambient-reads|control-commits)',n):return 'TOOLS-01 registry (optional static regression guard)','DEC-8/9 syntactic ownership/effect regressions; never a completeness oracle'
 if re.search(r'(fault-oracle|fault-scenarios|fault-child|fault-sweep|whole-view)',n):return 'TOOLS-01 corpus + mutation registry','Complete permitted decisions and returned/retained evidence; preserve independent oracle controls'
 if re.search(r'(sweep|poison|ambient|host-members|hostile|reprototyp|exotic|rope)',n):return 'TOOLS-01 corpus + mutation registry (binding profile)','Ambient/read/intake counterexamples; hostile cases conditional on owner threat-model choice'
 if re.search(r'(mutant|mutat|ablat|negative|counterexample|probe|measure|cost|coverage|oracle|checks-)',n):return 'TOOLS-01 corpus + mutation registry','Extract distinct input, mutation site and expected complete result; timing is observation, never universal proof'
 if '/packages/kernel/tests/' in '/'+path or '/tests/' in path:return 'Covered by maintained test suite; index in TOOLS-01','Keep runnable test ownership; register obligation and mutation without copying the test'
 if re.search(r'(digest|manifest|scope|identity|validat|seal|record|check)',n):return 'Retire as a reusable runner; retain sealed provenance','Candidate identity, docs scope or historical gate; common record verifier should replace duplicate runner'
 return 'TOOLS-01 corpus + mutation registry; retire duplicate harness after extraction','Retain the distinct assertions/fixtures as corpus entries; reuse current runner rather than historical plumbing'
def main():
 rows=[]; packets={A:None,B:{'K1.1-correction-02','K1.2','K1.2-correction-01'}}
 for rev in [A,B]:
  files=git('ls-tree','-r','--name-only',rev,'docs/development/work','packages/kernel/tests','tests/conformance/architecture','scripts').splitlines()
  for path in files:
   parts=path.split('/'); inrecord=path.startswith('docs/development/work/') and (parts[3].startswith('K1.1') if rev==A else parts[3] in packets[B])
   # The archived K1.1 correction-02 was not present; active source is the audit base.
   if inrecord and rev==A and parts[3]=='K1.1-correction-02':continue
   support=path.startswith(('packages/kernel/tests/','tests/conformance/architecture/','scripts/'))
   if not (inrecord or support):continue
   if not path.endswith(('.ts','.mts','.cts','.mjs','.cjs','.js','.py','.sh','.md')):continue
   t=git('show',rev+':'+path)
   if path.endswith('.md'):
    if not inrecord:continue
    lines=t.splitlines();i=0
    while i<len(lines):
     m=re.match(r'^\s*(`{3,}|~{3,})([\w-]*)',lines[i]);start=i
     if not m:i+=1;continue
     i+=1;body=[]
     while i<len(lines) and not re.match(r'^\s*'+re.escape(m[1][0])+r'{'+str(len(m[1]))+r',}\s*$',lines[i]):body.append(lines[i]);i+=1
     code='\n'.join(body)+'\n';i+=1
     if m[2] not in ['js','javascript','ts','typescript','mjs','cjs','python','py','bash','sh','shell','zsh','console'] and not (m[2]=='' and re.search(r'^(?:node |python3? |npm |npx |git |const |import |set -)',code,re.M)):continue
     d,reason=disposition(path,code)
     rows.append(dict(revision=rev,path=path,line=start+1,kind='inline '+(m[2] or 'inferred executable'),sha256=hashlib.sha256(code.encode()).hexdigest(),lines=len(body),disposition=d,reason=reason))
   else:
    d,reason=disposition(path,t)
    rows.append(dict(revision=rev,path=path,line=1,kind='record artifact' if inrecord else 'supporting test/gate superset',sha256=hashlib.sha256(t.encode()).hexdigest(),lines=len(t.splitlines()),disposition=d,reason=reason))
 # Every prose-only evidence mention is retained as a locator, including names whose source was never checked in.
 mentions=[]
 for rev in [A,B]:
  for p in git('ls-tree','-r','--name-only',rev,'docs/development/work').splitlines():
   packet=p.split('/')[3]
   if not p.endswith('.md') or not (packet.startswith('K1.1') and packet!='K1.1-correction-02' if rev==A else packet in packets[B]):continue
   for i,l in enumerate(git('show',rev+':'+p).splitlines(),1):
    if re.search(r'\b(probe|mutant|mutation|ablation|oracle)\b',l,re.I):
     mentions.append(dict(revision=rev,path=p,line=i,text=l,disposition='Index distinct counterexample/mutation in TOOLS-01; linked runnable file above or sealed prose-only evidence. Do not claim absent source executable.'))
 stats={'artifacts_and_fences':len(rows),'record_artifacts':sum(r['kind']=='record artifact' for r in rows),'inline_fences':sum(r['kind'].startswith('inline') for r in rows),'supporting_snapshot_entries':sum(r['kind'].startswith('supporting') for r in rows),'prose_evidence_locators':len(mentions),'by_disposition':{k:sum(x['disposition']==k for x in rows) for k in sorted({x['disposition'] for x in rows})}}
 md=[SESSION,'','# Evidence infrastructure inventory','', 'Generated by `python3 probes/catalog.py`. Closed K1.1, its correction/reference records and their support are read at the archive; correction-02, K1.2 and correction-01 at B. Includes every executable file and executable Markdown fence in these packet directories, plus a deliberately broad supporting test/gate inventory at each revision. Distinct snapshot entries are not distinct probes; identical hashes permit consolidation. No script was rerun merely because it appears here.','', 'Each row has an operational disposition. “TOOLS-01” recommends extracting the distinct input, expected whole result, mutation and original provenance into its corpus/registry; it does not release TOOLS-01. Retiring a runner means stop maintaining/re-executing superseded infrastructure, never erase historical evidence. Current tests listed as covered elsewhere stay owned by their suite. `evidence-mentions.json` preserves every prose probe/mutant/oracle mention, including disclosed or inline experiments with no standalone source. These locators are not claimed as runnable artifacts.','', 'Under adversarial intake retain the hostile profile and poison sweeps; under cooperative intake retire hostile-only gates only after the binding packet lands and its claim amendments are adopted but retain accidents and ordinary atomicity; under bytes intake run them against the convenience wrapper only if it promises that profile. Fault-oracle completeness and state-transition examples remain useful in all profiles. Static analyzer guards remain regression aids, never proof; owner direction e permits their retirement only after the coordinator refactor with coverage mapping. TOOLS-01 precedes K1.1-correction-03. These timing conditions govern every row below; a retire disposition is not permission for immediate deletion.','', '| Pinned source | Kind | Physical lines | Disposition | Protected claim / rationale |','|---|---|---:|---|---|']
 for r in rows:md.append(f"| [{r['path']}:{r['line']}](https://github.com/ArrokothI/arrokothi/blob/{r['revision']}/{r['path']}#L{r['line']}) | {r['kind']} | {r['lines']} | {r['disposition']} | {r['reason']} |")
 outputs={'evidence-inventory.json':json.dumps(rows,indent=2)+'\n','evidence-mentions.json':json.dumps(mentions,indent=2)+'\n','evidence-inventory-summary.json':json.dumps(stats,indent=2)+'\n','evidence-inventory.md':'\n'.join(md)+'\n'}
 for n,s in outputs.items():
  if '--check' in sys.argv:assert (P/n).read_text()==s,n
  else:(P/n).write_text(s)
 print(json.dumps(stats,indent=2))
if __name__=='__main__':main()
