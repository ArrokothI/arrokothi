"""Reconcile every adopted Python refusal check with its registered ablation."""
import ast
import json
from pathlib import Path

source = Path('scripts/packet_tools.py').read_text()
registry = json.loads(Path('tests/fixtures/packet-tools/refusal-guards.json').read_text())
calls = [ast.get_source_segment(source, node) for node in ast.walk(ast.parse(source))
         if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == 'require']
assert calls, 'non-vacuity: no refusal checks found'
registered = []
for case in registry['cases']:
    mutation = case['mutants'][0]
    assert source.count(mutation['before']) == 1, case['id'] + ': stale mutation'
    matches = [call for call in set(calls) if call in mutation['before']]
    assert len(matches) == 1, case['id'] + ': exactly one guard per mutation'
    registered.append(matches[0])
assert sorted(registered) == sorted(calls), 'every refusal check needs a registered negative input and ablation'
print(json.dumps({'refusal_checks': len(calls), 'registered_mutations': len(registered)}))
