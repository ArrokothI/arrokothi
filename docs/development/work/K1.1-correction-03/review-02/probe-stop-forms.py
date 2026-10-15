#!/usr/bin/env python3
"""Challenge stop propagation across values, nested functions, classes and aliases.

Run from clean C. All mutations are in a disposable copy. Each static check includes
the candidate's typecheck. The maintained oracle is unmodified. Trace injection is
applied only afterward and records the two array continuations, not a new guard.
"""
from pathlib import Path
import json, os, shutil, subprocess, tempfile

ROOT = Path.cwd()
ANCHOR = 'if (value === null) return charge(state, 4) ? null : STOPPED;'
MUTATIONS = {
    'correct_control': (ANCHOR, ''),
    'false_instead_of_stop': ('if (value === null) return charge(state, 4) ? null : false;', ''),
    'nested_return_ignored': ('if (value === null) { const paid = (): boolean => charge(state, 4); paid(); return null; }', ''),
    'class_return_ignored': ('if (value === null) { ReviewNullCharge.capture(state); return null; }',
        '\nclass ReviewNullCharge { static capture(state: CaptureState): Visited { return charge(state, 4) ? null : STOPPED; } }\n'),
    'alias_false': ('if (value === null) return reviewNullCharge(state, 4) ? null : false;',
        '\nconst reviewNullCharge = charge;\n'),
}
env = {k: os.environ[k] for k in ('PATH', 'HOME', 'TMPDIR') if k in os.environ}
env['LANG'] = 'C.UTF-8'
rows = []
with tempfile.TemporaryDirectory(prefix='kc3-review02-stop-forms-') as directory:
    root = Path(directory)
    shutil.copytree(ROOT/'packages/kernel', root/'packages/kernel')
    for name in ('package.json', 'tsconfig.json'):
        shutil.copy2(ROOT/name, root/name)
    (root/'node_modules').symlink_to(ROOT/'node_modules', target_is_directory=True)
    source = root/'packages/kernel/src/values.ts'
    original = source.read_text()
    assert original.count(ANCHOR) == 1
    guard = root/'guard.mjs'
    guard.write_text("import {meteringViolations} from './packages/kernel/tests/capture-metering.ts';\nconsole.log(JSON.stringify({violations:meteringViolations()}));\n")
    driver = root/'trace.mjs'
    driver.write_text("globalThis.__reviewContinuation=[];\nconst {captureWithWork,CAPTURE_WORK_BUDGET}=await import('./packages/kernel/src/values.ts');\nconst answer=captureWithWork([null],CAPTURE_WORK_BUDGET,2);\nconsole.log(JSON.stringify({answer,continuations:globalThis.__reviewContinuation}));\n")
    def run(argv):
        p = subprocess.run(argv, cwd=root, env=env, capture_output=True, text=True, timeout=300)
        return {'argv': argv, 'exit': p.returncode, 'stdout': p.stdout, 'stderr': p.stderr}
    for name, (replacement, helper) in MUTATIONS.items():
        mutated = original.replace(ANCHOR, replacement) + helper
        source.write_text(mutated)
        static = run(['node', '--experimental-strip-types', '--no-warnings', str(guard)])
        maintained = run(['node', '--experimental-strip-types', '--no-warnings', '--test', 'packages/kernel/tests/capture-stop.test.ts'])
        traced = mutated.replace('defineAt(out, index, item);', 'globalThis.__reviewContinuation.push({site:"defineAt",stopped:state.stopped}); defineAt(out, index, item);')
        traced = traced.replace('return finishArray(out);', 'globalThis.__reviewContinuation.push({site:"finishArray",stopped:state.stopped}); return finishArray(out);')
        source.write_text(traced)
        observed = run(['node', '--experimental-strip-types', '--no-warnings', str(driver)])
        rows.append({'name': name, 'replacement': replacement, 'helper': helper,
            'static': static, 'maintained': maintained, 'trace': observed})
print(json.dumps({'node':subprocess.check_output(['node','--version'],env=env,text=True).strip(),
    'anchor': ANCHOR, 'rows': rows}, indent=2))
