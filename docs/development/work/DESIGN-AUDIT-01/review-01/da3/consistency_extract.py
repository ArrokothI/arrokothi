#!/usr/bin/env python3
"""Reviewer: print, side by side, every option of register items A, B, C and the Recommend rows of
F02, F09, F10, tagging each by where object capture lives. Usage: consistency_extract.py <register.md>"""
import re, sys
reg = open(sys.argv[1]).read().splitlines()
def rows(start_heading, stop_prefix='## '):
    i = next(n for n, l in enumerate(reg) if l.startswith(start_heading))
    out = []
    for n in range(i + 1, len(reg)):
        if reg[n].startswith(stop_prefix) and n > i: break
        if reg[n].startswith('| ') and not reg[n].startswith('| Option') and not reg[n].startswith('|---'):
            out.append((n + 1, [c.strip() for c in reg[n].strip('|').split('|')]))
    return out
def tag(text):
    t = text.lower()
    if 'bytes/text core' in t or 'inert core' in t or 'bytes/text at the kernel' in t or 'behind bytes adapter' in t: return 'CORE = bytes/text; objects only in a wrapper outside the Kernel contract'
    if 'cooperative' in t and 'object' in t or 'simplify internal traversal' in t or 'cooperative convenience binding' in t: return 'CORE = live objects (cooperative capture inside the Kernel); bytes only for isolated hostile callers'
    if ' or ' in t and 'parser' in t and 'cooperative' in t: return 'BOTH (disjunction)'
    return '-'
for item, head in [('A', '## A — '), ('B', '## B — '), ('C', '## C — ')]:
    for line, cells in rows(head):
        rec = 'RECOMMENDED' if cells[0].startswith('**Recommend') else ''
        print(f'{item} register.md:{line} {rec:11} | {cells[0][:95]}')
        print(f'    -> {tag(cells[0])}')
        if item == 'C' and 'If A keeps objects' in ' '.join(cells): print('    -> conditional in this row:', re.search(r'\*\*If A keeps objects[^*]*\*\*', ' '.join(cells)).group(0))
for fam in ['F02', 'F09', 'F10']:
    for line, cells in rows(f'### {fam} — ', stop_prefix='### '):
        if cells[0].startswith('Recommend'):
            print(f'{fam} register.md:{line} RECOMMENDED | {cells[0][:95]}')
            print(f'    -> {tag(cells[0])}')
