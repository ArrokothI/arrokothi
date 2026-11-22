"""Read-only identity/preservation checks for review 04; run from the H checkout."""
import hashlib, json, subprocess
from pathlib import Path
B='c1951226338de6ccd3e4e6289259549551268f61'
C='848b1957ae9e598bb256712c07a3cc22c39fbaf7'
H='a734d03a9eb352bd29988bff1a68d9d6ca9bb2d3'
H3='ddc53bd132fde4f71bc989ccec7f4d0e430a45dc'
def git(*args): return subprocess.check_output(['git',*args],text=True).strip()
def equal(a,b,paths):
    changed=git('diff','--name-only',a,b,'--',*paths)
    assert not changed, changed
    return {p:git('rev-parse',f'{b}:{p}') for p in paths}
for a,b in [(B,C),(C,H),(H3,C)]: subprocess.run(['git','merge-base','--is-ancestor',a,b],check=True)
protected=equal(B,H,['packages','scripts','tests/tooling','package.json','package-lock.json','tsconfig.json'])
policy=equal(B,H,['AGENTS.md','docs/development/006-development-process.md','docs/development/008-implementation-report.md','docs/development/009-universal-prompts.md','docs/development/012-review-methods.md'])
old=['kernel-candidate.ts','canonical-json.ts','fake-driver.ts','ablation-table.ts','ablation-probe.mjs','ablations.test.ts','identity-mutants.ts','identity-witnesses.ts','identity-probe.mjs','conventions.test.ts','blindness.test.ts','support.ts','verdicts.test.ts']
preserved=equal(H3,H,['tests/conformance/k0-candidate/'+p for p in old]+['tests/fixtures','tests/conformance/k0'])
fixture=equal(B,H,['tests/conformance/k0/scenarios.ts','tests/conformance/k0/operation-sink.ts','tests/conformance/k0/oracle-discrimination.test.ts','tests/conformance/k0/controls.test.ts','tests/conformance/k0/blind-spot-regression.test.ts'])
admin=git('diff','--name-only',C,H).splitlines()
assert admin==['docs/development/007-work-packets.md','docs/development/work/K1.4-candidate/implementation-04.md','docs/development/work/K1.4-candidate/progress.md']
prerequisite=git('rev-parse','eb8472e5^{commit}')
subprocess.run(['git','merge-base','--is-ancestor',prerequisite,B],check=True)
print(json.dumps({'B':B,'C':C,'H':H,'H3':H3,'prerequisite':prerequisite,'protected_equal_B':protected,'policies_equal_B':policy,'preserved_equal_H3':preserved,'fixture_controls_equal_B':fixture,'C_to_H':admin,'B_to_H_paths':git('diff','--name-only',B,H).splitlines(),'H3_to_H_paths':git('diff','--name-only',H3,H).splitlines()},indent=2))
