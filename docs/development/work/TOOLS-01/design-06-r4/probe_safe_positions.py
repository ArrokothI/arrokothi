"""Design 06 revision 4: detector-level probe of the safe-position prototype (review 03's 19 cases, owner
choice 10's cross-product, same-named functions, rebinding and controls). Parses only; executes nothing.
Usage: python3 -B probe_safe_positions.py <clone of 60af5db9 with prototype.diff applied and node_modules>
Exit 0 only when every hazard matches and every control does not."""
import itertools, json, os, subprocess, sys, tempfile
ROOT = os.path.abspath(sys.argv[1])
HEAD = "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\n"
MUTATE = "function mutate(p) { p.toJSON = () => 42; }\n"
R03 = {  # review-03/probe_detector.py CASES, verbatim
    'direct-control': ('', 'Object.prototype.toJSON = () => 42;'),
    'escape-control': (MUTATE, 'mutate(Object.prototype);'),
    'parenthesized-escape': (MUTATE, 'mutate((Object.prototype));'),
    'cast-escape': (MUTATE, 'mutate(Object.prototype as any);'),
    'non-null-escape': (MUTATE, 'mutate(Object.prototype!);'),
    'satisfies-escape': (MUTATE, 'mutate(Object.prototype satisfies object);'),
    'parenthesized-storage': ('', 'const box = [(Object.prototype)]; box[0].toJSON = () => 42;'),
    'parenthesized-return': ('function proto() { return (Object.prototype); }\n', 'proto().toJSON = () => 42;'),
    'named-reader-helper': ('function keys(p) { p.toJSON = () => 42; }\n', 'keys(Object.prototype);'),
    'named-reader-return': ('function keys(p) { return p; }\n', 'const p = keys(Object.prototype); p.toJSON = () => 42;'),
    'reader-method-helper': ('const helper = { keys(p) { p.toJSON = () => 42; } };\n', 'helper.keys(Object.prototype);'),
    'descriptor-result': ('', "const d = Object.getOwnPropertyDescriptor(Object, 'prototype'); d.value.toJSON = () => 42;"),
    'descriptor-destructure': ('', "const { value } = Object.getOwnPropertyDescriptor(Object, 'prototype'); value.toJSON = () => 42;"),
    'descriptor-return': ("function proto() { return Object.getOwnPropertyDescriptor(Object, 'prototype').value; }\n", 'proto().toJSON = () => 42;'),
    'reflect-get': ('', "const p = Reflect.get(Object, 'prototype'); p.toJSON = () => 42;"),
    'entries-result': ('', "const p = Object.entries(Object.getOwnPropertyDescriptors(Object))[0]; p.extra = 1;"),
    'values-result': ('', "const p = Object.values(Object.getOwnPropertyDescriptors(Object)); p.extra = 1;"),
    'local-control': ('', 'const p = {}; p.x = 1;'),
    'keys-control': ('', "const p = Object.keys(Object); p.push('x');"),
}
CONTROLS = {'local-control', 'keys-control'}
WRAP = {'bare': '{}', 'paren': '({})', 'as': '{} as any', 'satisfies': '{} satisfies object', 'nonnull': '{}!', 'angle': '<any>{}'}
VALUE = 'Object.prototype'
POS = {
    'argument': (MUTATE, 'mutate(@);'),
    'receiver': ('', "@@.__defineGetter__('x', () => 42);"),
    'receiver-listed': ('', 'const n = @@.hasOwnProperty("x");'),
    'storage-array': ('', 'const box = [@]; box[0].toJSON = () => 42;'),
    'storage-object': ('', 'const box = { p: @ }; box.p.toJSON = () => 42;'),
    'return': ('function proto() { return @; }\n', 'proto().toJSON = () => 42;'),
    'alias': ('', 'const p = @; p.toJSON = () => 42;'),
}
SAME_NAME = {
    'local-function': ('function keys(p) { p.toJSON = () => 42; }\n', 'keys(Object.prototype);'),
    'local-arrow': ('const stringify = (p) => { p.toJSON = () => 42; };\n', 'stringify(Object.prototype);'),
    'imported-function': ("import { keys } from './helper.ts';\n", 'keys(Object.prototype);'),
    'imported-namespace': ("import * as Obj from './helper.ts';\n", 'Obj.keys(Object.prototype);'),
    'member-function': ('const helper = { keys(p) { p.toJSON = () => 42; } };\n', 'helper.keys(Object.prototype);'),
    'shadowed-global-param': ('function run(JSON) { JSON.stringify(Object.prototype); }\n', 'run({ stringify(p) { p.toJSON = () => 42; } });'),
    'shadowed-global-local': ('', 'const Array = { isArray(p) { p.toJSON = () => 42; } }; Array.isArray(Object.prototype);'),
    'rebound-member': ('', "Object.keys = (p) => { p.toJSON = () => 42; return []; };\ntest('other', () => { Object.keys(Object.prototype); });"),
    'rebound-global-member': ('', "test('other', () => { JSON.stringify(Object.prototype); });\ntest('rebind', () => { globalThis.JSON = { stringify() {} }; });"),
    'rebound-global-computed': ('', "const k = 'JSON';\ntest('other', () => { JSON.stringify(Object.prototype); });\ntest('rebind', () => { globalThis[k] = { stringify() {} }; });"),
    'rebound-global-escape': ('', "function swap(g) { g.JSON = { stringify() {} }; }\ntest('other', () => { JSON.stringify(Object.prototype); });\ntest('rebind', () => { swap(globalThis); });"),
    'rebound-elsewhere': ('', "test('other', () => { Object.keys(Object.prototype); });\ntest('rebind', () => { globalThis.Object = { keys() {} }; });"),
}
GENUINE = {  # must stay unmatched
    'object-keys-intrinsic': ('', "const p = Object.keys(Object); p.push('x');"),
    'object-keys-local': ('', 'const p = Object.keys({ a: 1 }); p.push("x");'),
    'json-stringify-intrinsic': ('', 'const s = JSON.stringify(Object.prototype);'),
    'array-isarray': ('', 'const b = Array.isArray(Object.prototype);'),
    'local-object': ('', 'const p = {}; p.x = 1;'),
    'new-map': ('', 'const m = new Map(); m.set("a", 1);'),
    'number-constant': ('', 'const n = Number.POSITIVE_INFINITY;'),
    'unrelated-global-write': ('', "test('other', () => { JSON.stringify(Object.prototype); });\ntest('count', () => { globalThis.__reads = 0; });"),
}
cases = {}
for name, (helper, stmt) in R03.items(): cases['r03/' + name] = (helper, stmt)
for (w, wrap), (p, (helper, stmt)) in itertools.product(WRAP.items(), POS.items()):
    expr = wrap.replace('{}', VALUE)
    member = expr if w in ('bare', 'paren') else '(' + expr + ')'   # a receiver needs parentheses around these wrappers
    fill = lambda text: text.replace('@@', member).replace('@', expr)
    cases[f'x/{p}/{w}'] = (fill(helper), fill(stmt))
for name, row in SAME_NAME.items(): cases['name/' + name] = row
for name, row in GENUINE.items(): cases['genuine/' + name] = row
requests = []
for name, (helper, stmt) in cases.items():
    body = stmt if stmt.startswith(("test(", "Object.keys =", "const k", "function swap")) else f"test('member', () => {{ {stmt} }});"
    requests.append({'op': 'survey', 'path': name.replace('/', '_') + '.test.ts', 'text': HEAD + helper + body + '\n'})
with tempfile.TemporaryDirectory() as temporary:
    # source-facts.mjs imports ./node_modules/typescript, as in the tool's own temporary copy.
    with open(os.path.join(ROOT, 'tests/tooling/source-facts.mjs'), 'rb') as source:
        open(os.path.join(temporary, 'source-facts.mjs'), 'wb').write(source.read())
    os.symlink(os.path.join(ROOT, 'node_modules'), os.path.join(temporary, 'node_modules'))
    json.dump(requests, open(os.path.join(temporary, 'requests.json'), 'w'))
    subprocess.run(['node', os.path.join(temporary, 'source-facts.mjs'), os.path.join(temporary, 'requests.json'),
                    os.path.join(temporary, 'results.json')], check=True)
    out = json.load(open(os.path.join(temporary, 'results.json')))['results']
bad = []
for (name, _), rows in zip(cases.items(), out):
    unsafe = sorted({r['reason'] + ('(' + r['path'] + ')' if r.get('path') else '') for r in rows if 'reason' in r})
    expect_clean = name.startswith('genuine/') or name.split('/', 1)[1] in CONTROLS
    # The unrelated global write is itself unsafe; it must not break JSON's identity in the other test.
    ok = unsafe == ['write'] if name == 'genuine/unrelated-global-write' else (not unsafe) if expect_clean else bool(unsafe)
    if not ok: bad.append(name)
    print(('ok  ' if ok else 'BAD ') + name.ljust(34), unsafe if unsafe else 'no match')
print(len(cases), 'cases;', len(bad), 'unexpected:', bad)
sys.exit(1 if bad else 0)
