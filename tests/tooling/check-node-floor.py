#!/usr/bin/env python3
"""TOOLS-01 Node v22.9.0 A1 prerequisite probe; later checks are not implemented here."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--node', type=Path, required=True)
    args = parser.parse_args()
    node = args.node.resolve()
    root = Path(__file__).resolve().parents[2]
    fixture = root / 'tests/tooling/node-floor'
    environment = {name: os.environ[name] for name in ('PATH', 'HOME', 'TMPDIR') if name in os.environ}
    environment['LANG'] = 'C.UTF-8'
    environment['PATH'] = str(node.parent) + os.pathsep + environment.get('PATH', '')
    version = subprocess.check_output([str(node), '--version'], env=environment, text=True).strip()
    if version != 'v22.9.0':
        parser.error('This floor check requires exactly v22.9.0, got ' + version)
    argv = [str(node), '--test', '--test-reporter=' + str(fixture / 'events-reporter.mjs'),
            str(fixture / 'events.test.mjs')]
    run = subprocess.run(argv, cwd=root, env=environment, text=True, capture_output=True, timeout=30)
    events = [json.loads(line) for line in run.stdout.splitlines()]
    relevant = [event for event in events if event['type'] in ('test:start', 'test:pass', 'test:fail')]
    problems = []
    if run.returncode != 1:
        problems.append('The intentional assertion-failure fixture must exit 1')
    for event in relevant:
        data = event['data']
        for field in ('name', 'nesting', 'file', 'line', 'column'):
            if field not in data:
                problems.append(event['type'] + ': missing ' + field + ' for ' + data.get('name', '?'))
        if event['type'] != 'test:start' and 'type' not in data.get('details', {}):
            problems.append(event['type'] + ': missing details.type for ' + data.get('name', '?'))
    starts = [event['data'].get('name') for event in relevant if event['type'] == 'test:start']
    if starts != ['first pass', 'second intentional failure', 'outer suite', 'nested pass']:
        problems.append('test:start order differs from definition order: ' + repr(starts))
    result = {'node': version, 'assumption': 'A1', 'passed': not problems, 'problems': problems,
              'argv': argv, 'exit': run.returncode, 'events': relevant, 'stderr': run.stderr,
              'remaining': ['A' + str(i) for i in range(2, 12)]}
    print(json.dumps(result, indent=2))
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
