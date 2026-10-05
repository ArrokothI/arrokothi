"""Review-02 record checks for TOOLS-01 (read-only on the repository; temporary files only).

1. Contract revisions 4, 6 and 7 equal `git apply` of owner choices 04, 06 and 07's embedded diffs on
   the previous revision; revision 5 equals owner choice 05's three textual substitutions (its embedded
   diff has no hunk line numbers, so `git apply` refuses it).
2. 007 at H equals 007 at C plus owner choice 07's four 007 items and implementation-02's two
   proposals, modulo line wrapping, and nothing else.
3. The `transferred` table at C equals owner choice 04's four origins plus owner choice 05's forty,
   each attributed to its decision, and equals the set of `pending_revalidation` origins.
Usage: python3 -B check_records.py <repo>   (exit 0 when every check holds)"""
import json, re, subprocess, sys, tempfile, os
REPO = sys.argv[1]
C, H = 'b104bab192f57c5ecf5b7eccebcfbda412a17b5d', '446dd25820500db4e0eb3d6940ec49e45634f39c'
W = 'docs/development/work/TOOLS-01/'
def show(rev, path):
    return subprocess.run(['git', '-C', REPO, 'show', f'{rev}:{path}'], capture_output=True, check=True, text=True).stdout
results = {}
rev = {n: show(c, W + 'contract.md') for n, c in [(3, 'ea9bc7b4^'), (4, 'ea9bc7b4'), (5, 'f9b39b76'), (6, '3cfda480'), (7, '0eee9b41')]}
results['contract_at_H_is_rev7'] = show(H, W + 'contract.md') == rev[7]
diffs = {n: re.findall(r'```diff\n(.*?)```', show(H, W + f'owner-choice-0{n}.md'), re.S)[0] for n in (4, 5, 6, 7)}
with tempfile.TemporaryDirectory() as tmp:
    subprocess.run(['git', 'init', '-q', tmp], check=True)
    target = os.path.join(tmp, W, 'contract.md'); os.makedirs(os.path.dirname(target))
    for n in (4, 6, 7):
        open(target, 'w').write(rev[n - 1]); open(os.path.join(tmp, 'p.diff'), 'w').write(diffs[n])
        ok = subprocess.run(['git', '-C', tmp, 'apply', 'p.diff'], capture_output=True).returncode == 0
        results[f'rev{n}_equals_git_apply_of_owner_choice_0{n}'] = ok and open(target).read() == rev[n]
    open(os.path.join(tmp, 'p.diff'), 'w').write(diffs[5]); open(target, 'w').write(rev[4])
    results['owner_choice_05_diff_git_apply_accepted'] = subprocess.run(['git', '-C', tmp, 'apply', '--check', 'p.diff'], capture_output=True).returncode == 0
lines = [l for l in diffs[5].splitlines() if l[:1] in '+-' and not l.startswith(('---', '+++'))]
text = rev[4].replace('# TOOLS-01 contract — revision 4', '# TOOLS-01 contract — revision 5', 1)
anchor = 'origins and four limited origins move to TOOLS-02; P1 below applies to the scope it keeps.\n'
text = text.replace(anchor, anchor + lines[2][1:] + '\n', 1)
for old, new in ((lines[3], lines[4]), (lines[5], lines[6])):
    assert text.count(old[1:]) == 1; text = text.replace(old[1:], new[1:])
results['rev5_equals_owner_choice_05_substitutions'] = text == rev[5]
# 2. 007
c007, h007 = show(C, 'docs/development/007-work-packets.md'), show(H, 'docs/development/007-work-packets.md')
edits = [('and the four origins limited by owner\nchoice 04', 'the four origins limited by owner choice 04, and the 40 revalidation origins transferred by [owner choice 05](work/TOOLS-01/owner-choice-05.md)'),
         ('Not a dependency of K1.3, K1.1-correction-03 or BINDING-01; the area gate binds those instead.',
          'Not a dependency of K1.3, K1.1-correction-03 or BINDING-01. Their `verify` summaries list the open origins in the areas they touch, as an advisory report ([owner choice 07](work/TOOLS-01/owner-choice-07.md)). TOOLS-02 must be accepted and integrated before K1.4 is accepted ([owner choice 06](work/TOOLS-01/owner-choice-06.md)).'),
         ("so that its area gate binds this packet's changed paths", 'so that its registry and area report are available'),
         ('**Dependencies:** K1.3. **Scope:** Integrate', '**Dependencies:** K1.3, and TOOLS-02 accepted and integrated ([owner choice 06](work/TOOLS-01/owner-choice-06.md)). **Scope:** Integrate')]
report = show(H, W + 'implementation-02.md')
entry = re.search(r'1\. \*\*Entry check\*\*.*?\n((?:   > .*\n)+)', report).group(1)
entry = ' '.join(l.strip()[2:] for l in entry.splitlines())
row = re.search(r'```markdown\n\s*(\| TOOLS-01 \|.*?)\n\s*```', report, re.S).group(1).strip()
x = c007
for old, new in edits:
    assert x.count(old) == 1; x = x.replace(old, new)
a = 'Scaffolding must explicitly refuse unsupported APIs.\n\n'; x = x.replace(a, a + entry + '\n\n', 1)
x = '\n'.join(row if l.startswith('| TOOLS-01 |') else l for l in x.split('\n'))
norm = lambda s: [re.sub(r'\s*\n\s*', ' ', p) for p in s.split('\n\n')]
results['007_at_H_equals_authorized_text'] = norm(x) == norm(h007)
# 3. transferred origins
adoption = json.loads(show(C, 'tests/fixtures/packet-tools/adoption.json'))
oc04 = set(re.findall(r'`(artifact-[0-9a-f]{24})`', show(H, W + 'owner-choice-04.md')))
oc05 = {r['origin'] for r in json.loads(show(C, W + 'owner-choice-05/transferred-origins.json'))}
table = {r['origin']: r['decision'] for r in adoption['transferred']}
open_rev = {o['id'] for o in adoption['origins'] if o['state'] == 'pending_revalidation'}
results['transferred_equals_oc04_plus_oc05'] = len(oc04) == 4 and len(oc05) == 40 and not oc04 & oc05 and set(table) == oc04 | oc05
results['transferred_decisions_attributed'] = all(table[o].endswith('owner-choice-04.md') for o in oc04) and all(table[o].endswith('owner-choice-05.md') for o in oc05)
results['pending_revalidation_equals_transferred'] = open_rev == set(table)
states = {}
for o in adoption['origins']: states[o['state']] = states.get(o['state'], 0) + 1
results['states'] = states
print(json.dumps(results, indent=1))
expected_false = {'owner_choice_05_diff_git_apply_accepted'}
sys.exit(0 if all(v for k, v in results.items() if k not in expected_false and k != 'states') else 1)
