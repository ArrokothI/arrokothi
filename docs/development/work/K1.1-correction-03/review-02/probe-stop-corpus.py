#!/usr/bin/env python3
"""Review-only boolean stop-sentinel mutation with the full maintained value corpus; run from clean C after required checks.

The candidate stays untouched. A temporary copy runs C's static guard and maintained stop oracle,
then a separate trace demonstrates whether the wrong sentinel permits a continuation.
"""
from pathlib import Path
import json, os, shutil, subprocess, tempfile

ROOT = Path.cwd()
BEFORE = 'if (typeof value === "boolean") return charge(state, value ? 4 : 5) ? value : STOPPED;'
AFTER = 'if (typeof value === "boolean") return charge(state, value ? 4 : 5) ? value : false;'
with tempfile.TemporaryDirectory(prefix='kc3-review02-stop-guard-') as directory:
    root = Path(directory)
    shutil.copytree(ROOT / 'packages/kernel', root / 'packages/kernel')
    for name in ['package.json', 'tsconfig.json']:
        shutil.copy2(ROOT / name, root / name)
    (root / 'node_modules').symlink_to(ROOT / 'node_modules', target_is_directory=True)
    source = root / 'packages/kernel/src/values.ts'
    original = source.read_text()
    assert original.count(BEFORE) == 1
    mutated = original.replace(BEFORE, AFTER)
    source.write_text(mutated)
    guard = root / 'guard.mjs'
    guard.write_text("import {meteringViolations} from './packages/kernel/tests/capture-metering.ts';\nconsole.log(JSON.stringify({violations:meteringViolations()}));\n")
    env = {k: os.environ[k] for k in ('PATH', 'HOME', 'TMPDIR') if k in os.environ}
    env['LANG'] = 'C.UTF-8'
    def run(argv, timeout=300):
        p = subprocess.run(argv, cwd=root, env=env, capture_output=True, text=True, timeout=timeout)
        return {'argv': argv, 'exit': p.returncode, 'stdout': p.stdout, 'stderr': p.stderr}
    static = run(['node', '--experimental-strip-types', '--no-warnings', str(guard)])
    maintained = run(['node', '--experimental-strip-types', '--no-warnings', '--test', *['packages/kernel/tests/'+name+'.test.ts' for name in ('capture-corpus','capture-refusals','capture-work','capture-metering','capture-stop','value-refusal-cost','value-diagnostic-work','values')]])
    # Add observation only after running the unmodified maintained checker and oracle.
    # The two names below are exactly the array-child continuation and finalization.
    traced = mutated.replace('defineAt(out, index, item);',
        'globalThis.__reviewContinuation.push({site:"defineAt",stopped:state.stopped}); defineAt(out, index, item);')
    assert traced != mutated
    traced = traced.replace('return finishArray(out);',
        'globalThis.__reviewContinuation.push({site:"finishArray",stopped:state.stopped}); return finishArray(out);')
    source.write_text(traced)
    driver = root / 'trace.mjs'
    driver.write_text("globalThis.__reviewContinuation=[];\nconst {captureWithWork,CAPTURE_WORK_BUDGET}=await import('./packages/kernel/src/values.ts');\nconst answer=captureWithWork([false],CAPTURE_WORK_BUDGET,2);\nconsole.log(JSON.stringify({answer,continuations:globalThis.__reviewContinuation}));\n")
    observed = run(['node', '--experimental-strip-types', '--no-warnings', str(driver)])
    print(json.dumps({'node':subprocess.check_output(['node','--version'],env=env,text=True).strip(),
        'mutation':{'path':'packages/kernel/src/values.ts','before':BEFORE,'after':AFTER},
        'static':static,'maintained':maintained,'trace':observed},indent=2))
