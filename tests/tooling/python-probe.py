"""Named unittest assertion adapter; runtime/import errors are invalid, never kills."""
import contextlib
import io
import json
from pathlib import Path
import sys
import unittest

sys.dont_write_bytecode = True
spec = json.loads(Path('tests/fixtures/packet-tools/refusal-guards.json').read_text())
entry = next(row for row in spec['cases'] if row['id'] == sys.argv[1])
mutant = entry['mutants'][0]
source = Path(mutant['path']).read_text()
anchor = mutant['before'] if source.count(mutant['before']) == 1 else mutant['after']
if source.count(anchor) != 1:
    raise RuntimeError('stale refusal-check witness')
# Line numbers are ephemeral execution coordinates, never registry identities.
start = source[:source.index(anchor)].count('\n') + 1
end = start + anchor.count('\n')
reached = False
source_path = str(Path(mutant['path']).resolve())
def trace(frame, event, arg):
    global reached
    if event == 'line' and frame.f_code.co_filename == source_path and start <= frame.f_lineno <= end:
        reached = True
    return trace

suite = unittest.defaultTestLoader.loadTestsFromName(entry['input']['test'])
log = io.StringIO()
with contextlib.redirect_stdout(log), contextlib.redirect_stderr(log):
    sys.settrace(trace)
    try:
        result = unittest.TextTestRunner(stream=log, verbosity=0).run(suite)
    finally:
        sys.settrace(None)
if result.errors or result.skipped or result.testsRun != 1 or result.unexpectedSuccesses or result.expectedFailures:
    raise RuntimeError('invalid unittest execution: ' + log.getvalue())
failures = [test.id() for test, _ in result.failures]
passed = not failures
print(json.dumps(dict(case=entry['id'], assertion=entry['assertion'], passed=passed, reached=reached,
                      failures=failures, tests=result.testsRun)))
sys.exit(0 if passed else 17)
