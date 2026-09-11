#!/usr/bin/env python3
"""Mechanical process-document checks; no semantic or independent acceptance claim.

Run from the repository root. This script uses only the Python standard library.
It checks current tracked/untracked scope and the explicitly named integration history.
It does not execute historical evidence scripts or access external websites.
"""
from pathlib import Path
import re
import json
import subprocess
from urllib.parse import unquote

BASE = '42731300266eea00a9a24d867d5e82d9887c280d'
PLANNING = '6464be12c11eb75f7dfbc5ece12ca8d3020a5c15'
C12 = '7a51801afcdf5c13d481e92c5d219a8c9be7c0eb'
H12 = 'bab7bf6635781e6d2f9b0e8e333f58440ae0b047'
A12 = '679734a1777ce087c62305d7665071687d8f1cb6'
ROOT = Path(__file__).resolve().parents[4]
PREFIX = 'docs/development/'
DOCS = [PREFIX + name for name in (
    'README.md', '001-current-status-and-roadmap.md', '006-development-process.md',
    '007-work-packets.md', '008-implementation-report.md', '009-universal-prompts.md',
    '010-pipeline-planning-assessment.md', '011-k0.1-process-retrospective.md',
    '012-review-methods.md', '013-structure-and-evidence-sequencing.md', 'work/K0.1/integration-01.md',
    'work/K0.1-process-review/contract.md',
)] + ['README.md']
REPORT = PREFIX + 'work/K0.1-process-review/implementation-02.md'
INTERIM = PREFIX + 'work/K0.1-process-review/implementation-01.md'
INTERIM_COMMIT = '88236083e52c1a006077653482cae3f71eb213df'
BENCHMARK = '98756f8c10bd806125da8318f1a129bc030aca61'
ALLOWED = set(DOCS + [REPORT, INTERIM, 'packages/sdk/package.json', PREFIX + 'work/K0.1-process-review/validate.py'])
failures = []


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()


def check(condition, message):
    if not condition:
        failures.append(message)


def prose(text):
    # Exclude fenced examples/templates, with proper opening/closing fence length.
    lines, fence = [], None
    for line in text.splitlines():
        match = re.match(r'^\s{0,3}(`{3,}|~{3,})(.*)$', line)
        if fence:
            if match and match[1][0] == fence[0] and len(match[1]) >= len(fence) and not match[2].strip():
                fence = None
        elif match:
            fence = match[1]
        else:
            lines.append(line)
    return '\n'.join(lines)


def anchors(text):
    found, counts = set(), {}
    for heading in re.findall(r'^#{1,6}\s+(.+?)\s*#*\s*$', prose(text), re.M):
        heading = re.sub(r'\[([^\]]+)\]\([^)]*\)', r'\1', heading)
        slug = re.sub(r'[^\w\- ]', '', heading.lower()).replace(' ', '-')
        count = counts.get(slug, 0)
        counts[slug] = count + 1
        found.add(slug if count == 0 else f'{slug}-{count}')
    found.update(re.findall(r'(?:id|name)=["\']([^"\']+)["\']', text))
    return found


check(Path.cwd().resolve() == ROOT, 'Run from repository root')
changed = set(git('diff', '--name-only', BASE, '--').splitlines())
untracked = set(git('ls-files', '--others', '--exclude-standard').splitlines())
check(not (changed | untracked) - ALLOWED,
      f'Unexpected changed/untracked paths: {sorted((changed | untracked) - ALLOWED)}')
print(f'Scope: {len(changed | untracked)} changed/new paths; all must be explicitly allowed')

historical = git('ls-tree', '-r', '--name-only', BASE, '--', PREFIX + 'work/K0.1').splitlines()
for name in historical:
    check((ROOT / name).is_file(), f'Missing historical file: {name}')
    if (ROOT / name).is_file():
        check(git('hash-object', name) == git('rev-parse', BASE + ':' + name),
              f'Historical K0.1 file altered: {name}')
print(f'Historical preservation: {len(historical)} pre-existing K0.1 files compared by Git blob')
check(not (ROOT / PREFIX / 'work/K0.2').exists(), 'K0.2 directory exists')
check(not (ROOT / PREFIX / 'work/K1.0').exists(), 'K1.0 implementation directory exists')
check(git('hash-object', INTERIM) == git('rev-parse', INTERIM_COMMIT + ':' + INTERIM),
      'Interim process report altered')
ledger = (ROOT / PREFIX / '007-work-packets.md').read_text()
rows = re.findall(r'^\| ([KRDS]\d+\.\d+) \| ([A-Z_]+) \|', ledger, re.M)
check(len(rows) == 35 and len(dict(rows)) == 35, 'Expected 35 unique status rows')
check(dict(rows).get('K0.1') == 'ACCEPTED', 'K0.1 not ACCEPTED')
check(all(status == 'PLANNED' for packet, status in rows if packet != 'K0.1'),
      'Successor state changed')
check('Integration is pending owner merge' not in ledger, 'Stale current integration claim')
check('next_release: none' in ledger, 'Missing explicit release hold')
definitions = re.findall(r'^### ([KRDS]\d+\.\d+) .+?\n\n\*\*Dependencies:\*\* ([^\n]+)', ledger, re.M)
dependencies = {name: re.findall(r'[KRDS]\d+\.\d+', body.split('**Scope:**')[0])
                for name, body in definitions}
check(set(dependencies) == set(dict(rows)), 'Packet definitions/status rows mismatch')
for packet, deps in dependencies.items():
    check(all(dep in dependencies for dep in deps), f'Unknown prerequisite of {packet}')

def visit(packet, active, done):
    if packet in active:
        failures.append(f'Dependency cycle at {packet}')
        return
    if packet in done or packet not in dependencies:
        return
    for dep in dependencies[packet]:
        visit(dep, active | {packet}, done)
    done.add(packet)

completed = set()
for packet in dependencies:
    visit(packet, set(), completed)
check(dependencies.get('K1.0') == ['K0.2'], 'K1.0 must follow K0.2')
check(dependencies.get('K1.1') == ['K1.0'], 'K1.1 must follow K1.0')
check('| K1 | K1.0–K1.4 | K1.4 ACCEPTED, structural obligations plus full E1 |' in ledger,
      'K1 aggregate closure lost structural/E1 obligation')
print('Ledger: 35 unique packets/definitions; K0.1 ACCEPTED, 34 PLANNED; acyclic dependencies')
print('Sequence: K0.2 -> K1.0 -> K1.1; K1.4 retains full gate; no K0.2/K1.0 implementation directories')

old_sdk = json.loads(git('show', BASE + ':packages/sdk/package.json'))
new_sdk = json.loads((ROOT / 'packages/sdk/package.json').read_text())
old_sdk['repository']['url'] = 'git+https://github.com/ArrokothI/arrokothi.git'
check(new_sdk == old_sdk, 'SDK metadata change exceeds repository URL')
print('SDK metadata: only repository URL changed; package name/version/exports/dependencies preserved')
benchmark = ROOT.parent / 'benchmark'
check(benchmark.is_dir(), 'Read-only benchmark checkout unavailable')
if benchmark.is_dir():
    actual = subprocess.check_output(['git', '-C', str(benchmark), 'rev-parse', 'HEAD'], text=True).strip()
    dirty = subprocess.check_output(['git', '-C', str(benchmark), 'status', '--porcelain=v1'], text=True)
    check(actual == BENCHMARK and not dirty, 'Benchmark identity/clean state differs')
print('Benchmark: read-only HEAD/clean-state check at ' + BENCHMARK)
print('Interim process report: preserved byte-for-byte at ' + INTERIM_COMMIT)

for older, newer in [(PLANNING, H12), (H12, A12), (A12, BASE)]:
    result = subprocess.run(['git', 'merge-base', '--is-ancestor', older, newer], cwd=ROOT)
    check(result.returncode == 0, f'Ancestry failed: {older} -> {newer}')
check(git('show', '-s', '--format=%P', BASE).split() == [PLANNING, A12], 'Unexpected merge parents')
check(git('rev-parse', A12 + '^{tree}') == git('rev-parse', BASE + '^{tree}'), 'A12/merge tree mismatch')
for older, newer, record in [(C12, H12, 'implementation-12.md'), (H12, A12, 'review-12.md')]:
    expected = {PREFIX + '007-work-packets.md', PREFIX + 'work/K0.1/' + record}
    check(set(git('diff', '--name-only', older, newer).splitlines()) == expected,
          f'Unexpected administrative delta {older}..{newer}')
    delta = git('diff', '--unified=0', older, newer, '--', PREFIX + '007-work-packets.md')
    edits = [line for line in delta.splitlines() if line.startswith(('+', '-'))
             and not line.startswith(('+++', '---'))]
    check(len(edits) == 2 and all(line[1:].startswith('| K0.1 |') for line in edits),
          f'Administrative ledger edit exceeds K0.1 row at {newer}')
print('Integration: 3 ancestry checks; exact merge parents; A12/full merge tree equality; C12/H12/A12 scope')

files = DOCS + [INTERIM] + ([REPORT] if (ROOT / REPORT).exists() else [])
links = 0
external = 0
for name in files:
    path = ROOT / name
    check(path.is_file(), f'Missing document: {name}')
    if not path.is_file():
        continue
    for target in re.findall(r'(?<!!)\[[^\]\n]*\]\(([^)\n]+)\)', prose(path.read_text())):
        if re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:', target):
            external += 1
            continue
        target = unquote(target.strip().removeprefix('<').removesuffix('>'))
        destination, _, fragment = target.partition('#')
        resolved = (path.parent / destination).resolve() if destination else path
        links += 1
        check(resolved.exists(), f'{name}: missing link target {target}')
        if fragment and resolved.is_file():
            check(fragment in anchors(resolved.read_text()), f'{name}: missing anchor {target}')
print(f'Links: {len(files)} documents; {links} local links/anchors; {external} external links excluded')
print('Link parser scope: inline Markdown links outside fenced examples; not remote reachability or full Markdown rendering')
for message in failures:
    print('FAIL:', message)
print(f'Result: {len(failures)} failures')
raise SystemExit(bool(failures))
