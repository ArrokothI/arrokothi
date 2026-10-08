"""Review 04, checks 1 and 5: owner-record diffs, the 28258b28 whitespace edit and H's 007 edits.
Read-only. Usage: python3 -B check_records.py <repo>. Exit 0 when every check holds."""
import hashlib, json, os, re, subprocess, sys, tempfile

REPO = sys.argv[1]
B, C, H = 'f62527e8d564a6e2f63b83cbb52e24053f333540', '28258b282532b36eef8fb1571d79b6343b54427b', '7f3a2af46d714dc2a0e47a755ccd4fe8aeb0ba94'
W = 'docs/development/work/TOOLS-01/'
CONTRACT = W + 'contract.md'
failures = []


def git(*args):
    return subprocess.run(['git', '-C', REPO, *args], capture_output=True, check=True).stdout


def show(rev, path):
    return git('show', f'{rev}:{path}')


def check(label, ok, detail=''):
    print(('PASS ' if ok else 'FAIL ') + label + (f' — {detail}' if detail else ''))
    if not ok:
        failures.append(label)


# Check 1: each owner choice's embedded diff, as it stands at its binding commit, at C and at H, applied with
# `git apply` to the previous contract revision, reproduces the next revision byte for byte.
def embedded(rev, path):
    blocks = re.findall(r'^```diff\n(.*?)^```$', show(rev, path).decode(), re.S | re.M)
    assert len(blocks) == 1
    return blocks[0].encode()


for record, binding, previous, new in (('owner-choice-08.md', '9e84b587', '0eee9b41', 'e39a8b10'),
                                       ('owner-choice-09.md', '2b48e40e', 'e39a8b10', '2b48e40e')):
    for rev in (binding, C, H):
        with tempfile.TemporaryDirectory() as tmp:
            subprocess.run(['git', 'init', '-q', tmp], check=True)
            os.makedirs(os.path.join(tmp, os.path.dirname(CONTRACT)))
            with open(os.path.join(tmp, CONTRACT), 'wb') as handle:
                handle.write(show(previous, CONTRACT))
            with open(os.path.join(tmp, 'p.diff'), 'wb') as handle:
                handle.write(embedded(rev, W + record))
            run = subprocess.run(['git', '-C', tmp, 'apply', 'p.diff'], capture_output=True)
            with open(os.path.join(tmp, CONTRACT), 'rb') as handle:
                out = handle.read()
        check(f'{record}@{rev} applies to contract@{previous} and equals contract@{new}',
              run.returncode == 0 and out == show(new, CONTRACT), hashlib.sha256(out).hexdigest())
check('contract at C and H equals revision 9 (2b48e40e)', show(C, CONTRACT) == show('2b48e40e', CONTRACT) == show(H, CONTRACT))
check('owner-choice-08.md unchanged since its binding commit 9e84b587',
      show('9e84b587', W + 'owner-choice-08.md') == show(C, W + 'owner-choice-08.md') == show(H, W + 'owner-choice-08.md'))

# Check 5: 28258b28 strips only trailing spaces/tabs; review-01/manifest.json changes only those files' bytes and sha256.
changed = [p for p in git('diff', '--name-only', 'ca28491d', C).decode().split('\n') if p]
manifest = W + 'review-01/manifest.json'
check('28258b28 changes owner-choice-09.md, review-01/manifest.json and 13 review-01 samples',
      len(changed) == 15 and manifest in changed and W + 'owner-choice-09.md' in changed, str(len(changed)))
lines = 0
for path in changed:
    if path == manifest:
        continue
    old, new = show('ca28491d', path).split(b'\n'), show(C, path).split(b'\n')
    same = len(old) == len(new) and all(a.rstrip(b' \t') == b for a, b in zip(old, new))
    lines += sum(a != b for a, b in zip(old, new))
    check(f'{path.split("/")[-1]}: only trailing whitespace removed', same and b'\r' not in show(C, path))
check('217 sample lines and 2 owner-choice-09 lines changed', lines == 219, str(lines))
mo, mn = json.loads(show('ca28491d', manifest)), json.loads(show(C, manifest))
old_rows, new_rows = {r['path']: r for r in mo['files']}, {r['path']: r for r in mn['files']}
diff_rows = {k for k in new_rows if old_rows[k] != new_rows[k]}
check('manifest: same 61 entries, other fields equal', set(old_rows) == set(new_rows) and len(new_rows) == 61 and
      {k: v for k, v in mo.items() if k != 'files'} == {k: v for k, v in mn.items() if k != 'files'})
check('manifest: exactly the 13 samples changed, in bytes and sha256 only',
      len(diff_rows) == 13 and all({f for f in old_rows[k] if old_rows[k][f] != new_rows[k][f]} == {'bytes', 'sha256'} for k in diff_rows))
mismatch = [k for k, row in new_rows.items()
            if (lambda data: row['bytes'] != len(data) or row['sha256'] != hashlib.sha256(data).hexdigest())(show(C, W + 'review-01/' + k))]
check('manifest: every entry matches its file at C', not mismatch, str(mismatch))
check('git diff --check B C prints nothing', subprocess.run(['git', '-C', REPO, 'diff', '--check', B, C], capture_output=True).returncode == 0)

# Check 5: C..H is exactly the report and 007; H's 007 = 007 at C + the report's two proposals (modulo wrapping).
check('C..H changes exactly 007 and implementation-03.md',
      sorted(p for p in git('diff', '--name-only', C, H).decode().split('\n') if p) ==
      ['docs/development/007-work-packets.md', W + 'implementation-03.md'])
P = 'docs/development/007-work-packets.md'
report, choice = show(H, W + 'implementation-03.md').decode(), show(H, W + 'owner-choice-09.md').decode()
row = re.search(r'```markdown\n\s*(\| TOOLS-01 \|.*?\|)\n\s*```', report, re.S).group(1).strip()
quote = lambda text, marker: ' '.join(l.strip()[2:].strip() for l in re.search(marker, text).group(1).strip().split('\n'))
sentence = quote(report, r'add:\n((?:\s*> .*\n)+)')
check("the report's TOOLS-02 sentence equals owner choice 09's", sentence == quote(choice, r'add:\n\n((?:> .*\n)+)'))
text = show(C, P).decode().split('\n')
rows = [i for i, l in enumerate(text) if l.startswith('| TOOLS-01 |')]
text[rows[0]] = row
unwrap = lambda t: re.sub(r'[ \t]*\n[ \t]*(?=\S)(?![|#>*-])', ' ', t)
anchor = 'the 40 revalidation origins transferred by [owner choice 05](work/TOOLS-01/owner-choice-05.md).'
rebuilt = unwrap('\n'.join(text))
check('007 at C has the TOOLS-02 anchor once and one TOOLS-01 row', len(rows) == 1 and rebuilt.count(anchor) == 1)
check("H's 007 = 007 at C + the report's status row + choice 09's sentence (modulo wrapping)",
      rebuilt.replace(anchor, anchor + ' ' + sentence) == unwrap(show(H, P).decode()))

# Check 5: B..H boundaries. No production, Layer-3, skill, research, policy or other-packet path changes; the
# non-tooling files review 02 checked at 446dd258 are unchanged since, so only tooling and TOOLS-01 records moved.
paths = [line.split('\t', 1) for line in git('diff', '--name-status', '--no-renames', B, H).decode().split('\n') if line]
names = [p for _, p in paths]
forbidden = [p for p in names if p.startswith(('packages/', 'mental-model/', '.agents/', 'docs/development/research/')) or
             (p.startswith('docs/development/work/') and not p.startswith(W)) or
             (p.startswith('docs/development/') and p.count('/') == 2 and p != 'docs/development/007-work-packets.md')]
check(f'B..H: {len(names)} paths, none production, Layer 3, skills, research, policy or another packet', not forbidden, str(forbidden))
outside = sorted(p for p in names if not p.startswith((W, 'tests/tooling/', 'tests/fixtures/packet-tools/')))
check('B..H outside TOOLS-01 records and tooling: the review-02-checked files, packet_tools.py and 007',
      outside == ['AGENTS.md', 'README.md', 'docs/development/007-work-packets.md', 'package-lock.json', 'package.json',
                  'scripts/packet_tools.py', 'tests/conformance/effects/fast-slow-equivalence.test.ts'], str(outside))
since = sorted(p for p in git('diff', '--name-only', '446dd25820500db4e0eb3d6940ec49e45634f39c', C).decode().split('\n')
               if p and not p.startswith((W, 'tests/tooling/', 'tests/fixtures/packet-tools/')))
check('446dd258..C outside TOOLS-01 records and tooling changes only scripts/packet_tools.py', since == ['scripts/packet_tools.py'], str(since))
print('FAILURES:', failures)
sys.exit(1 if failures else 0)
