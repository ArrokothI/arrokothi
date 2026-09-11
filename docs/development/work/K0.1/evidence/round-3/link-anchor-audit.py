#!/usr/bin/env python3
"""K0.1 link/anchor audit. Checks every relative markdown link in docs/development/work/K0.1/
resolves to an existing file, and that every #anchor matches a heading in the target file
using GitHub's slug rule (lowercase; drop characters outside [word, space, hyphen]; spaces
-> hyphens, without collapsing runs)."""
import os, re, sys

BASE = "docs/development/work/K0.1"
# implementation-03.md is written by the report commit (H3) that also carries this log,
# so at the payload commit (C3) it is a known forward reference, reported, not hidden.
FORWARD = {"implementation-03.md"}

def slug(h):
    h = re.sub(r'`|\*', '', h).strip().lower()
    h = re.sub(r'[^\w\s-]', '', h)
    return h.replace(' ', '-')

links = missing = fwd = anchors_ok = bad = 0
problems = []
for fn in sorted(os.listdir(BASE)):
    if not fn.endswith(".md"):
        continue
    text = open(os.path.join(BASE, fn), encoding="utf-8").read()
    for m in re.finditer(r'\]\(([^)]+)\)', text):
        target = m.group(1)
        if target.startswith(("http://", "https://", "#")):
            continue
        links += 1
        path, _, anchor = target.partition("#")
        full = os.path.normpath(os.path.join(BASE, path))
        if not os.path.exists(full):
            if os.path.basename(path) in FORWARD:
                fwd += 1
            else:
                missing += 1
                problems.append(f"MISSING FILE  {fn} -> {target}")
            continue
        if anchor:
            heads = re.findall(r'^#{1,6}\s+(.*)$', open(full, encoding="utf-8").read(), re.M)
            if anchor in [slug(h) for h in heads]:
                anchors_ok += 1
            else:
                bad += 1
                problems.append(f"BAD ANCHOR    {fn} -> {target}")

print(f"relative links checked : {links}")
print(f"resolved files         : {links - missing - fwd}")
print(f"anchors verified       : {anchors_ok}")
print(f"known forward refs     : {fwd} (implementation-03.md, written by the report commit H3)")
print(f"unresolved files       : {missing}")
print(f"bad anchors            : {bad}")
for p in problems:
    print(p)
print("RESULT:", "PASS" if (missing == 0 and bad == 0) else "FAIL")
sys.exit(0 if (missing == 0 and bad == 0) else 1)
