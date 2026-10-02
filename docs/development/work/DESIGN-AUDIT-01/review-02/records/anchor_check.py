#!/usr/bin/env python3
"""Review 02 (Claude Code, claude-opus-5-5): resolve every Markdown link fragment in the packet's current (non-historical) files
against GitHub-style heading slugs. Usage: anchor_check.py <repo-root> <packet-rel-dir>"""
import re, sys, unicodedata
from pathlib import Path
R = Path(sys.argv[1]); P = R / sys.argv[2]
HIST = {'review-01.md', 'implementation-01.md', 'design-01.md', 'stop-01.md', 'brief-01.md', 'invalidation-01.md'}
def slugs(path):
    s = re.sub(r'```.*?```', '', path.read_text(), flags=re.S); out = {}
    res = set()
    for h in re.findall(r'^#{1,6} (.+)$', s, re.M):
        t = re.sub(r'[`*_]', '', h).strip().lower()
        t = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', t)
        t = ''.join(c for c in t if c.isalnum() or c in ' -')
        t = t.replace(' ', '-'); n = out.get(t, 0); out[t] = n + 1
        res.add(t if n == 0 else f'{t}-{n}')
    return res
bad = []; n = 0
for p in sorted(P.rglob('*.md')):
    rel = p.relative_to(P)
    if rel.parts[0] == 'review-01' or str(rel) in HIST: continue
    s = re.sub(r'```.*?```', '', p.read_text(), flags=re.S)
    for target in re.findall(r'(?<!!)\[[^\]\n]+\]\(([^)\s]+)\)', s):
        if target.startswith(('http:', 'https:', 'mailto:')) or '#' not in target: continue
        f, frag = target.split('#', 1); tp = (p.parent / f) if f else p
        n += 1
        if not tp.exists(): bad.append((str(rel), target, 'missing file')); continue
        if tp.suffix == '.md' and frag not in slugs(tp): bad.append((str(rel), target, 'missing anchor'))
print('fragment links checked', n, 'bad', len(bad))
for b in bad: print(b)
