"""Reconcile every adopted Python refusal check with its registered ablation.

The scanned sources are packet_tools.py and, from TOOLS-02 T2-2 (design check 02, D02-CHK-03), the
two K1.1-correction-03 evidence scripts whose clean-checkout guards are `require` calls of their own."""
import ast
import json
from pathlib import Path

SOURCES = ('scripts/packet_tools.py', 'tests/tooling/requalify-value-cost.py', 'tests/tooling/value-cost-loss-ledger.py')
sources = {path: Path(path).read_text() for path in SOURCES}
registry = json.loads(Path('tests/fixtures/packet-tools/refusal-guards.json').read_text())
calls = [(path, ast.get_source_segment(source, node)) for path, source in sources.items() for node in ast.walk(ast.parse(source))
         if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == 'require']
assert calls, 'non-vacuity: no refusal checks found'
assert all(any(path == scanned for path, _ in calls) for scanned in SOURCES), 'non-vacuity: a scanned source has no refusal check'
registered = []
for case in registry['cases']:
    mutation = case['mutants'][0]
    assert mutation['path'] in sources, case['id'] + ': mutation outside the scanned sources'
    source = sources[mutation['path']]
    assert source.count(mutation['before']) == 1, case['id'] + ': stale mutation'
    matches = [call for call in set(calls) if call[0] == mutation['path'] and call[1] in mutation['before']]
    assert len(matches) == 1, case['id'] + ': exactly one guard per mutation'
    registered.append(matches[0])
assert sorted(registered) == sorted(calls), 'every refusal check needs a registered negative input and ablation'
print(json.dumps({'refusal_checks': len(calls), 'registered_mutations': len(registered),
                  'sources': {path: sum(call[0] == path for call in calls) for path in SOURCES}}))
