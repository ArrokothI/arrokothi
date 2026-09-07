"""Check study links, whitespace, pinned source identities, and untouched peer repos.
Run with Python 3; this only reads source and prints a JSON report.
"""
from pathlib import Path
import json
import re
import subprocess

study = Path(__file__).resolve().parent.parent
kernel = study.parent.parent
manifest = json.loads((study / 'evidence/source-manifest.json').read_text())
issues = []
links = 0
for path in sorted(study.rglob('*.md')):
    body = path.read_text()
    for line, text in enumerate(body.splitlines(), 1):
        if text.rstrip() != text:
            issues.append(f'{path.relative_to(study)}:{line}: trailing whitespace')
    for destination in re.findall(r'\]\(([^)]+)\)', body):
        if destination.startswith(('https://', 'http://', 'mailto:')):
            continue
        destination = destination.split('#')[0]
        if destination:
            links += 1
            if not (path.parent / destination).exists():
                issues.append(f'{path.relative_to(study)}: missing {destination}')
repositories = {}
for name, source in manifest['repositories'].items():
    repo = kernel.parent / source['workspaceDirectory']
    def git(*args):
        return subprocess.check_output(['git', '-C', str(repo), *args], text=True).strip()
    head = git('rev-parse', 'HEAD')
    status = git('status', '--porcelain')
    if head != source['commit']:
        issues.append(f'{name}: HEAD differs from inspected revision')
    if name != 'agent-kernel' and status:
        issues.append(f'{name}: peer repository is no longer clean')
    if name == 'agent-kernel':
        for line in status.splitlines():
            if 'docs/architecture-strategy-study/' not in line:
                issues.append(f'{name}: unexpected change {line}')
    repositories[name] = {'headMatches': head == source['commit'], 'status': status}
print(json.dumps({'localLinksChecked': links, 'repositories': repositories,
                  'issues': issues, 'result': 'PASS' if not issues else 'FAIL'}, indent=2))
raise SystemExit(bool(issues))
