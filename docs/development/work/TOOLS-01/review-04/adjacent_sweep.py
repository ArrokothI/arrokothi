"""Review 04, bounded adjacent search in the false-credit direction: credited leaves at C (preserved members and
targets other than the two P1-H-refused mapping targets) whose own registration span writes an intrinsic, starts a
child process or evaluates code, or calls a named test-side helper that does. Lexical and same-span only; it is a
search, not a detector. Read-only. Usage: python3 -B adjacent_sweep.py <repo> > adjacent-sweep.txt"""
import collections, json, re, subprocess, sys

REPO, C = sys.argv[1], '28258b282532b36eef8fb1571d79b6343b54427b'
show = lambda path: subprocess.run(['git', '-C', REPO, 'show', f'{C}:{path}'], capture_output=True).stdout.decode('utf-8', 'replace')
c = json.loads(show('tests/fixtures/packet-tools/adoption.json'))
REG = {e['key']: e for e in c['holds']['register']['entries']}
MAPPING = {'target.dispatch.1363.3.5a8d958ffdab', 'target.dispatch.1426.3.5a8d958ffdab'}
credited = collections.defaultdict(set)
for m in c['preserved']:
    if m['status'] == 'preserved' and m.get('current'):
        credited[m['file']].add(tuple(m['current']))
for t in c['suite_targets']:
    if t['id'] not in MAPPING:
        credited[t['file']].add((t['declaration']['line'], t['declaration']['column']))
INTRINSIC = (r'(?:Object|Function|Array|String|Number|Boolean|BigInt|Symbol|Date|RegExp|Error|TypeError|RangeError|Map|Set|'
             r'WeakMap|WeakSet|Promise|ArrayBuffer|DataView|Uint8Array|JSON|Math|Reflect|globalThis|global)')
WRITE = re.compile(r'(?:' + INTRINSIC + r'(?:\s*\.\s*prototype)?(?:\s*as\s+[^)]+)?\)?\s*(?:\.\s*\w+|\[[^\]]+\])\s*=(?!=|>)'
                   r'|delete\s*\(?\s*' + INTRINSIC + r'|(?:definePropert(?:y|ies)|setPrototypeOf|assign)\s*\(\s*\(?\s*' + INTRINSIC + r'\b'
                   r'|__proto__\s*=|\.constructor\s*=|Symbol\.species|child_process|spawnSync|execFileSync|new Function|\beval\s*\()')
# Test-side helpers found (by WRITE over every non-test module under */tests/ and over same-file helpers) to write
# intrinsics or run children: harness.ts, creation.test.ts, recovery-ambient.test.ts, whole-view-ambient.test.ts,
# host-members.test.ts, values.test.ts and the sweep modules.
HELPERS = ['polluteDescriptorFields', 'polluteDescriptorGetter', 'pollutePromiseSpecies', 'pollutePromiseConstructor',
           'polluteObjectSpecies', 'trapInheritedIndices', 'polluteObjectField', 'createPoison', 'setProtoFields',
           'clearProtoFields', 'runCase', 'compare', 'inherit', 'inBoundedChild']


def span(src, line, column):
    indent = ' ' * (column - 1)
    for i in range(line, len(src)):
        if re.match(re.escape(indent) + r'\}\)', src[i]):
            return src[line - 1:i + 1]
    return None


total, nospan, hits = 0, [], []
for path, leaves in sorted(credited.items()):
    src = show(path).split('\n')
    for line, column in sorted(leaves):
        total += 1
        body = span(src, line, column)
        if body is None:
            nospan.append(f'{path}:{line}:{column}')
            continue
        text = '\n'.join(body)
        writes = [l.strip()[:120] for l in body if WRITE.search(l) and not l.strip().startswith(('//', '*'))]
        calls = [h for h in HELPERS if re.search(r'\b' + h + r'\s*\(', text)]
        if writes or calls:
            entry = REG.get(f'{path}:{line}:{column}', {})
            hits.append((f'{path}:{line}:{column}', entry.get('classification'), writes, calls))
print(f'credited leaves examined: {total}; without a delimitable span: {len(nospan)} {nospan}')
print(f'credited leaves with an in-span pattern or a named writer-helper call: {len(hits)}')
for key, classification, writes, calls in hits:
    print(f'  {key} register={classification} writes={writes} calls={calls}')
