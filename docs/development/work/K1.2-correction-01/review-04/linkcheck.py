import re, os, sys
root = sys.argv[1]
files = []
for d in ["mental-model", "mental-model/concepts", "mental-model/mechanisms"]:
    for f in os.listdir(os.path.join(root, d)):
        if f.endswith(".md"): files.append(os.path.join(d, f))
files += ["docs/development/002-implemented-kernel-baseline.md", "docs/development/007-work-packets.md",
          "docs/development/work/K1.2-correction-01/contract.md", "docs/development/work/K1.2-correction-01/implementation-02.md",
          "docs/development/work/K1.2/contract.md", "docs/development/work/K1.2/decision-02.md"]
def slugify(h):
    h = h.strip().lower()
    h = re.sub(r"[^\w\- ]", "", h, flags=re.UNICODE)
    return h.replace(" ", "-")
anchors = {}
def get_anchors(path):
    if path in anchors: return anchors[path]
    s = set(); counts = {}
    try: text = open(os.path.join(root, path), encoding="utf8").read()
    except FileNotFoundError: anchors[path] = None; return None
    text = re.sub(r"```.*?```", "", text, flags=re.S)
    for m in re.finditer(r"^#{1,6}\s+(.*?)\s*#*$", text, flags=re.M):
        base = slugify(re.sub(r"`", "", m.group(1)))
        n = counts.get(base, 0); counts[base] = n + 1
        s.add(base if n == 0 else f"{base}-{n}")
    for m in re.finditer(r'<a (?:name|id)="([^"]+)"', text): s.add(m.group(1))
    anchors[path] = s; return s
bad = 0; total = 0
for f in files:
    text = open(os.path.join(root, f), encoding="utf8").read()
    text_nc = re.sub(r"```.*?```", "", text, flags=re.S)
    for m in re.finditer(r"\]\(([^)\s]+)\)", text_nc):
        link = m.group(1)
        if link.startswith(("http", "mailto:")): continue
        total += 1
        path, _, frag = link.partition("#")
        target = os.path.normpath(os.path.join(os.path.dirname(f), path)) if path else f
        if not os.path.exists(os.path.join(root, target)):
            print("MISSING FILE", f, link); bad += 1; continue
        if frag and target.endswith(".md"):
            a = get_anchors(target)
            if a is not None and frag not in a:
                print("MISSING ANCHOR", f, link); bad += 1
print(f"checked {total} links in {len(files)} files; {bad} broken")
