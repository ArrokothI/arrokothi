import os, re, sys, subprocess
root = sys.argv[1]
files = sys.argv[2:]
def slug(h):
    h = re.sub(r"<[^>]+>", "", h).strip().lower()
    h = re.sub(r"[^\w\- ]", "", h, flags=re.UNICODE)
    return h.replace(" ", "-")
cache = {}
def anchors(path):
    if path in cache: return cache[path]
    out, seen = set(), {}
    fence = False
    for line in open(path, encoding="utf8"):
        if line.startswith("```"): fence = not fence
        if fence: continue
        m = re.match(r"^(#{1,6})\s+(.*?)\s*#*\s*$", line)
        if m:
            s = slug(m.group(2)); n = seen.get(s, 0); seen[s] = n + 1
            out.add(s if n == 0 else f"{s}-{n}")
        for a in re.findall(r'<a (?:name|id)="([^"]+)"', line): out.add(a)
    cache[path] = out; return out
bad = total = 0
for f in files:
    p = os.path.join(root, f); text = open(p, encoding="utf8").read()
    text = re.sub(r"```.*?```", "", text, flags=re.S)
    for target in re.findall(r"\]\(([^)\s]+)\)", text):
        if re.match(r"^[a-z]+:", target): continue
        total += 1
        path, _, frag = target.partition("#")
        dest = os.path.normpath(os.path.join(os.path.dirname(p), path)) if path else p
        if not os.path.exists(dest): bad += 1; print("MISSING", f, target); continue
        if frag and dest.endswith(".md") and frag not in anchors(dest): bad += 1; print("ANCHOR", f, target)
print(f"{total} links, {bad} broken")
