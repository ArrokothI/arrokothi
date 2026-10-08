"""Review-02 probe: rebuild the register body of named leaf registrations at a revision with the
candidate's own helpers and print every V-ENV recipe match with surrounding text (read-only).
Usage: python3 -B venv_bodies.py <repo> <full-rev> <file:line:col>..."""
import sys, re
sys.dont_write_bytecode = True
repo, rev, keys = sys.argv[1], sys.argv[2], sys.argv[3:]
sys.path.insert(0, repo + '/scripts')
import packet_tools as pt
from pathlib import Path
git = pt.Git(Path(repo)); rev = git.commit(rev)
spec = git.document(rev, pt.ADOPTION_MANIFEST, versions=(2,))
recipe = re.compile(spec['holds']['register']['recipes']['V-ENV']['body'])
environment = pt.child_environment(pt.environment_declaration(None))[0]
files = sorted({k.rsplit(':', 2)[0] for k in keys})
closures = pt.import_closures(git, rev, files, environment, None)
modules = sorted({*files, *(p for c in closures.values() for p in c['test_side'])})
req = [{'op': op, 'path': n, 'text': git.blob(rev, n).decode()} for n in modules for op in ('helpers', 'imports')]
res = pt.source_facts(git, rev, req, environment, None)
hf = {n: res[2 * i] for i, n in enumerate(modules)}; imf = {n: res[2 * i + 1] for i, n in enumerate(modules)}
packages = pt.workspace_packages(git, rev)
def expand(module, names, seen, out):
    functions = hf[module]['functions']
    bindings = {r['local']: r for r in imf[module]['bindings'] if not r['type_only']}
    for name in names:
        if (module, name) in seen: continue
        seen.add((module, name))
        for d in functions.get(name, []):
            out.append((module, name, d['text'])); expand(module, d['references'], seen, out)
        b = bindings.get(name)
        if b is None: continue
        kind, target = pt.resolve_specifier(git, rev, module, b['module'], packages)
        if kind != 'file' or target not in hf: continue
        exported = {r['exported']: r['local'] for r in hf[target]['exports']}
        if b['imported'] == '*':
            targets = [k for k, rows in hf[target]['functions'].items() if any(r['exported'] for r in rows)] + list(exported.values())
        else:
            targets = [exported.get(b['imported'], b['imported'])]
        expand(target, targets, seen, out)
for key in keys:
    name, line, col = key.rsplit(':', 2)
    reg = [r for r in hf[name]['registrations'] if r['kind'] == 'leaf' and r['location']['line'] == int(line) and r['location']['column'] == int(col)]
    print('=' * 100); print(key, 'registrations found:', len(reg))
    if not reg: continue
    r = reg[0]; parts = [(name, '<registration>', r['text'])]
    expand(name, r['references'], set(), parts)
    print('title:', r['title'].get('value', r['title'].get('text', ''))[:150]); print('parts:', [(m.split('/')[-1], n, len(t)) for m, n, t in parts])
    body = '\n'.join(t for _, _, t in parts)
    m = recipe.search(body)
    print('V-ENV body match:', bool(m))
    # Which part contributes a match (first two alternatives are local; the \A lookahead alternative needs the whole body)
    for module, nm, text in parts:
        for mm in re.finditer(r'\bvm\b|createContext|runInContext|frozen-intrinsics|globalThis|\b(?:Object|Reflect)\s*\.\s*(?:definePropert(?:y|ies)|assign|set)\s*\(\s*[A-Z]\w*(?:\s*\.\s*prototype)?\s*,|\b[A-Z]\w*(?:\s*\.\s*prototype)?\s*(?:\.\s*\w+|\[[^\]\n]+\])\s*=(?!=|>)', text):
            s = max(0, mm.start() - 120); e = min(len(text), mm.end() + 120)
            print(f'  [{module.split("/")[-1]}::{nm}] match {mm.group(0)!r}: ...{text[s:e]!r}...')
    if m and m.group(0) == '' or (m and m.start() == 0 and len(m.group(0)) < 3):
        print('  (matched via the anchored lookahead alternative: an intrinsic prototype and a defineProperty call both occur in the body)')
