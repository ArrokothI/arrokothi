"""Independent review 06 of K1.4: every Markdown link on a line the correction added resolves at H.

Usage (repository root): python3 -I docs/development/work/K1.4/review-06/prose-links.py
Reads Git objects only. A link is `[text](target)`; a target is a relative path with an optional
`#anchor`. Anchors are compared with GitHub's heading slugs of the target file at H.
"""
import posixpath
import re
import subprocess
import sys

K = "b153ccacb57c35652be3aeba43f47a48905e077b"
C = "5b81a1b0cd9e73d7591ea23fd29195e24536d50d"
H = "64c505bfee13cae340710942e69fe805723aaad9"
FILES = ["mental-model/mechanisms/execution-cycle.md", "mental-model/concepts/values.md", "docs/guides/deployment/quick-start.md"]


def git(*args):
    return subprocess.run(["git", *args], check=True, capture_output=True, text=True).stdout


def slugs(path):
    out = set()
    for line in git("show", f"{H}:{path}").splitlines():
        match = re.match(r"^#{1,6}\s+(.*?)\s*$", line)
        if match:
            text = re.sub(r"[`*_]", "", match.group(1)).lower()
            out.add(re.sub(r"\s", "-", re.sub(r"[^\w\s-]", "", text)))
    return out


bad = 0
total = 0
for path in FILES:
    assert git("rev-parse", f"{C}:{path}") == git("rev-parse", f"{H}:{path}"), path
    added = [line[1:] for line in git("diff", "-U0", K, C, "--", path).splitlines() if line.startswith("+") and not line.startswith("+++")]
    for line in added:
        for target in re.findall(r"\]\(([^)\s]+)\)", line):
            if re.match(r"^[a-z]+://", target):
                continue
            total += 1
            file_part, _, anchor = target.partition("#")
            resolved = posixpath.normpath(posixpath.join(posixpath.dirname(path), file_part)) if file_part else path
            exists = subprocess.run(["git", "cat-file", "-e", f"{H}:{resolved}"], capture_output=True).returncode == 0
            ok = exists and (not anchor or anchor in slugs(resolved))
            bad += 0 if ok else 1
            print(f"{'ok ' if ok else 'BAD'} {path} -> {resolved}{'#' + anchor if anchor else ''}")
print(f"links_on_added_lines={total} broken={bad}")
# Control: the comparison is not vacuous.
assert "registering-a-wait" in slugs("mental-model/mechanisms/waits.md")
assert "registering-a-wiat" not in slugs("mental-model/mechanisms/waits.md")
sys.exit(1 if bad or total == 0 else 0)
