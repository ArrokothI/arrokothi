"""Run from a fresh clone at c02c9e38 with Node v26.10.0 first on PATH; output path must be outside the clone."""
import importlib.util, json, sys
from pathlib import Path
s=importlib.util.spec_from_file_location('packet_tools','scripts/packet_tools.py');t=importlib.util.module_from_spec(s);s.loader.exec_module(t)
g=t.Git(Path.cwd());rev=g.run('rev-parse','HEAD').decode().strip();t.clean_payload(g,rev)
spec='tests/fixtures/packet-tools/value-cost.json';registry=g.document(rev,spec)
case=next(c for c in registry['cases'] if c['id']=='value-cost.c1.ingress')
mutant=next(m for m in case['mutants'] if m['id'].startswith('mutation-8326241e'))
files={}
for root in registry['source_trees']:
 for name in g.files(rev,root):files[name]=g.blob(rev,name)
for name in [*registry['files'],*case['files']]:files[name]=g.blob(rev,name)
files.update(t.dependency_files(g,rev,registry['dependencies']))
environment,_=t.child_environment(t.environment_declaration(registry.get('environment')))
results=[]
for label,edit in [('control',None),('mutant',mutant)]:
 run=t.run_case(files,case,environment,edit)
 results.append({'side':label,'run':run,'outcome':t.execution_outcome(run,case)})
result={'revision':rev,'case':case,'mutant':mutant,'results':results}
Path(sys.argv[1]).write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'revision':rev,'case':case['id'],'mutant':mutant['id'],'results':[{ 'side':r['side'],'status':r['outcome']['status'],'state':json.loads(r['run']['output']).get('state'),'leaves':json.loads(r['run']['output']).get('leaves')} for r in results]}))
