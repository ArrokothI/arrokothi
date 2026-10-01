import subprocess,json,pathlib,hashlib,re
root=pathlib.Path('/Users/rex-shih/Documents/ArrokothI/arrokothi')
def git(*a): return subprocess.check_output(['git',*a],cwd=root,text=True).strip()
B='a20d278185eaffc7f8b7489345a3624231ff6e6d'; C='58d9c5c50ff3561c9f7b719a84acfd0b0d5d4d9f'; H='dcac779bdf7e887bcf42c8a6407c1b24c2083a55'
ids={'B':B,'C':C,'H':H,'previousH':'35c6ba0277542236f21f95d695154fa0164feb96','review10':'0efe0ba2ebb3fdde71ac8ab5b7a3ae048f5f5ac1','release':'6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb','decision':'13a73ad9ad0662fe585d1453280c5ac3da4f79bb','amendment02':'60eebc24113eb834e5d88015ca2a196c95c60493','K11H':'52b1600f3b42e3a360fdc3395178f1d147edf304','K11integration':'b53ccb48a8fd4b9d0b0028fc11e925d563e284fa','K11C2H':'719abbf9e55e7489b6255a08cbb9e97a1e960a5e','K11C2integration':'954d31b00eb7f2412c22ccf7d4d079699f0c4032'}
commits={}
for name,sha in ids.items():
 commits[name]={'sha':git('rev-parse',sha+'^{commit}'),'subject':git('show','-s','--format=%s',sha),'ancestorH':subprocess.run(['git','merge-base','--is-ancestor',sha,H],cwd=root).returncode==0,'ancestorB':subprocess.run(['git','merge-base','--is-ancestor',sha,B],cwd=root).returncode==0}
report=git('show',H+':docs/development/work/K1.2-correction-01/implementation-07.md')
allow=report.split('## Exact C..H administrative allowlist')[1].split('```text')[1].split('```')[0].strip().splitlines()
actual=git('diff','--name-only',C,H).splitlines()
assert sorted(allow)==sorted(actual)
policies=['AGENTS.md','.agents/skills/arrokothi-architecture/SKILL.md','.agents/skills/arrokothi-slice-audit/SKILL.md','docs/development/006-development-process.md','docs/development/008-implementation-report.md','docs/development/012-review-methods.md']
assert not git('diff',B,H,'--',*policies)
manifest_results=[]
for m in sorted((root/'docs/development/work/K1.2-correction-01').glob('*/MANIFEST.sha256')):
 entries=[]
 for line in m.read_text().splitlines():
  if not line.strip():continue
  digest,name=line.split(maxsplit=1);name=name.lstrip('*')
  candidates=[m.parent/name,root/name]
  p=next((p for p in candidates if p.is_file()),None)
  actualHash=hashlib.sha256(p.read_bytes()).hexdigest() if p else None
  assert actualHash==digest,(str(m),name,actualHash,digest)
  entries.append(name)
 manifest_results.append({'path':str(m.relative_to(root)),'sha256':hashlib.sha256(m.read_bytes()).hexdigest(),'entries':len(entries)})
result={'commits':commits,'branch':git('branch','--show-current'),'remote':git('remote','get-url','origin'),'status':git('status','--porcelain'),'adminFiles':actual,'policyUnchanged':policies,'manifests':manifest_results,'cumulativeStat':git('diff','--shortstat',B,H),'productionDelta':git('diff','--stat',ids['previousH'],H,'--','packages/kernel/src'),'fullDiffSha256':hashlib.sha256(pathlib.Path('/tmp/arrokothi-r8-review-evidence/cumulative.patch').read_bytes()).hexdigest()}
pathlib.Path('/tmp/arrokothi-r8-review-evidence/identity.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'commits':commits,'adminFiles':len(actual),'manifestCount':len(manifest_results),'manifestEntries':sum(x['entries'] for x in manifest_results),'cumulativeStat':result['cumulativeStat']},indent=2))
