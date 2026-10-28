"""Run only K1.3 cases using H's unchanged registry runner and source blobs."""
import importlib.util,json,sys
from pathlib import Path
selected = sys.argv[2] if len(sys.argv)>2 else 'k13.'
if selected not in ['k13.', 'oracle.losingWindowAt']: raise SystemExit('unsupported selection')
repo=Path(sys.argv[1]); revision='d05af3476b1523dadee0858373c0713610103419'
spec=importlib.util.spec_from_file_location('packet_tools',repo/'scripts/packet_tools.py')
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
registry='tests/fixtures/packet-tools/mutations.json'
class SelectedGit(p.Git):
 def document(self,rev,path,versions=(1,)):
  data=super().document(rev,path,versions)
  if path==registry:
   data['cases']=[c for c in data['cases'] if (c['id'].startswith('k13.') if selected == 'k13.' else c['id'] == selected)]
   ids={c['id'] for c in data['cases']}
   data['determinism_sample']=[c for c in data.get('determinism_sample',[]) if c in ids]
  return data
result=p.mutations(SelectedGit(repo),revision,registry)
print(json.dumps(result,indent=2))
sys.exit(0 if result['result']=='selected_cases_passed' else 1)
