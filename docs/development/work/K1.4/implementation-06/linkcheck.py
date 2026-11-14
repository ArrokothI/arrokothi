"""Local Markdown path/anchor check: python3 -I linkcheck.py <repo root> <file or dir>...

Checks relative links (not http/mailto) for an existing target path and, for .md targets with a
fragment, a matching GitHub-style heading slug or explicit anchor. Skips fenced code blocks and
inline code spans. Prints each broken link and a summary.
"""
import re
import sys
from pathlib import Path

root = Path(sys.argv[1]).resolve()
files = []
for arg in sys.argv[2:]:
    p = (root / arg)
    files += sorted(p.rglob("*.md")) if p.is_dir() else [p]

LINK = re.compile(r"(?<!!)\[(?:[^\[\]]|\[[^\]]*\])*\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)|!\[[^\]]*\]\(([^)\s]+)\)")
anchors_cache = {}


def slug(text):
    text = re.sub(r"`([^`]*)`", r"\1", text)
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = text.strip().lower()
    text = re.sub(r"[^\w\- ]", "", text)
    return text.replace(" ", "-")


def anchors(path):
    if path not in anchors_cache:
        found, counts, fence = set(), {}, False
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.lstrip().startswith("```"):
                fence = not fence
                continue
            if fence:
                continue
            m = re.match(r"^(#{1,6})\s+(.*?)\s*#*\s*$", line)
            if m:
                s = slug(m.group(2))
                n = counts.get(s, 0)
                counts[s] = n + 1
                found.add(s if n == 0 else f"{s}-{n}")
            for a in re.findall(r"<a\s+(?:id|name)=\"([^\"]+)\"", line):
                found.add(a)
        anchors_cache[path] = found
    return anchors_cache[path]


links = broken = 0
for f in files:
    fence = False
    for no, line in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
        if line.lstrip().startswith("```"):
            fence = not fence
            continue
        if fence:
            continue
        stripped = re.sub(r"`[^`]*`", "", line)
        for m in LINK.finditer(stripped):
            target = m.group(1) or m.group(2)
            if re.match(r"^[a-z]+:", target):
                continue
            links += 1
            path_part, _, frag = target.partition("#")
            dest = f if not path_part else (f.parent / path_part).resolve()
            if not dest.exists():
                broken += 1
                print(f"{f.relative_to(root)}:{no}: missing path {target}")
                continue
            if frag and dest.suffix == ".md" and frag not in anchors(dest):
                broken += 1
                print(f"{f.relative_to(root)}:{no}: missing anchor {target}")
print(f"files={len(files)} links={links} broken={broken}")
sys.exit(1 if broken else 0)
