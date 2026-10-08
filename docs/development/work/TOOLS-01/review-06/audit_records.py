"""Independent byte/set/count review; does not import the candidate's verifier."""
import collections
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile

B = 'f62527e8d564a6e2f63b83cbb52e24053f333540'
C = '83094969e591dba5c4f25d19c572522b78a7a396'
H = 'a50c38867c93c63094f271d099cec71624382577'
OLD = '7f3a2af46d714dc2a0e47a755ccd4fe8aeb0ba94'
OLDER = '446dd25820500db4e0eb3d6940ec49e45634f39c'
P = 'docs/development/work/TOOLS-01/'
ADOPTION = 'tests/fixtures/packet-tools/adoption.json'
ROOT = Path(__file__).resolve().parents[5]
OUT = Path(__file__).resolve().parent
checks = []

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def blob(rev, path):
    return git('show', rev + ':' + path)

def doc(rev, path):
    return json.loads(blob(rev, path))

def sha(data):
    return hashlib.sha256(data).hexdigest()

def check(name, condition, facts=None):
    checks.append(dict(check=name, passed=bool(condition), facts=facts))

def index(rows, key='id'):
    return {r[key]: r for r in rows}

def flat(s):
    return ' '.join(s.split())

contract = P + 'contract.md'
for choice, previous, following, binding in [
        (10, '2b48e40e', '297375d5', '60af5db9'),
        (11, '297375d5', '4875f486', '4875f486')]:
    for at in [binding, C, H]:
        blocks = re.findall(rb'```diff\n(.*?)\n```', blob(at, P + f'owner-choice-{choice:02}.md'), re.S)
        check(f'choice {choice} at {at}: one diff', len(blocks) == 1)
        with tempfile.TemporaryDirectory(prefix='tools01-r6-apply-') as tmp:
            target = Path(tmp, contract)
            target.parent.mkdir(parents=True)
            target.write_bytes(blob(previous, contract))
            applied = subprocess.run(['git', 'apply', '-'], cwd=tmp, input=blocks[0] + b'\n', capture_output=True)
            result = target.read_bytes()
            check(f'choice {choice} at {at}: git apply previous revision',
                  applied.returncode == 0 and result == blob(following, contract),
                  dict(exit=applied.returncode, stderr=applied.stderr.decode(), result_sha256=sha(result)))
    check(f'choice {choice} binding bytes preserved at C/H',
          blob(binding, P + f'owner-choice-{choice:02}.md') == blob(C, P + f'owner-choice-{choice:02}.md') ==
          blob(H, P + f'owner-choice-{choice:02}.md'))
check('contract at C and H equals revision 11', blob(C, contract) == blob(H, contract) == blob('4875f486', contract))

changed = git('diff', '--name-only', B, H).decode().splitlines()
changed_c = git('diff', '--name-only', B, C).decode().splitlines()
administrative = git('diff', '--name-only', C, H).decode().splitlines()
check('C is H direct parent', git('rev-parse', H + '^').decode().strip() == C)
check('C..H exact report/007 allowlist', administrative == [
    'docs/development/007-work-packets.md', P + 'implementation-04.md'], administrative)
base_files = set(git('ls-tree', '-r', '--name-only', B).decode().splitlines())
modified_existing = sorted(set(changed) & base_files)
check('no production or Layer-3 change', not any(p.startswith(('packages/', 'mental-model/')) for p in changed))
check('no pre-B sealed record modified', modified_existing == [
    'AGENTS.md', 'README.md', 'docs/development/007-work-packets.md', 'package-lock.json', 'package.json',
    'tests/conformance/effects/fast-slow-equivalence.test.ts'], modified_existing)
check('no another packet change', not any(p.startswith('docs/development/work/') and not p.startswith(P) for p in changed))
for policy in ['006-development-process.md', '008-implementation-report.md', '012-review-methods.md']:
    check('policy pin: ' + policy, blob(H, 'docs/development/' + policy) ==
          blob('b759d0abc01915ea5abc94b4607c6f9101bbbcc7', 'docs/development/' + policy))
historical_edit='28258b282532b36eef8fb1571d79b6343b54427b'
historical_files=git('diff','--name-only',historical_edit+'^',historical_edit).decode().splitlines()
sample_files=[p for p in historical_files if '/review-01/sample-' in p]
check('earlier disclosed whitespace repair scope',len(sample_files)==13 and len(historical_files)==15)
for path in [*sample_files,P+'owner-choice-09.md']:
    previous=blob(historical_edit+'^',path)
    normalized=b'\n'.join(line.rstrip(b' \t') for line in previous.split(b'\n'))
    check('earlier repair only trailing spaces/tabs: '+path,blob(historical_edit,path)==normalized and
          blob(historical_edit,path)==blob(H,path))
old_manifest=doc(historical_edit+'^',P+'review-01/manifest.json')
new_manifest=doc(historical_edit,P+'review-01/manifest.json')
changes=[]
for before,after in zip(old_manifest['files'],new_manifest['files'],strict=True):
    if before!=after:
        changes.append(after['path'])
        check('earlier manifest repair only bytes/digest: '+after['path'],
              {k:v for k,v in before.items() if k not in ['bytes','sha256']} ==
              {k:v for k,v in after.items() if k not in ['bytes','sha256']})
    data=blob(H,P+'review-01/'+after['path'])
    check('review-01 evidence digest: '+after['path'],sha(data)==after['sha256'] and len(data)==after['bytes'])
check('earlier manifest repair exactly 13 rows',len(changes)==13 and len(new_manifest['files'])==61 and
      old_manifest['subject']==new_manifest['subject'] and old_manifest['payload']==new_manifest['payload'])
delta_modified=git('diff','--name-only','--diff-filter=M',OLD,C,'--',P).decode().splitlines()
check('current round does not rewrite prior records',delta_modified==[P+'checks.json',P+'contract.md',P+'design-06.md',P+'verification.json'],delta_modified)

report = blob(H, P + 'implementation-04.md').decode()
c007 = blob(C, 'docs/development/007-work-packets.md').decode()
h007 = blob(H, 'docs/development/007-work-packets.md').decode()
row = re.findall(r'^\s*(\| TOOLS-01 \|.*\|)$', report, re.M)
check('one proposed status row', len(row) == 1)
proposed = re.sub(r'^\| TOOLS-01 \|.*$', lambda _: row[0], c007, flags=re.M)
scope = report.split('2. **TOOLS-02 scope**', 1)[1].split('## Risks and limits', 1)[0]
scope = ' '.join(re.findall(r'^\s*> ?(.*)$', scope, re.M))
marker = 'the 40 revalidation origins transferred by [owner choice 05](work/TOOLS-01/owner-choice-05.md).'
check('scope insertion anchor unique', proposed.count(marker) == 1)
proposed = proposed.replace(marker, marker + ' ' + scope)
check('007 equals exactly both report proposals modulo wrapping', flat(proposed) == flat(h007))

a = doc(C, ADOPTION)
old = doc(OLD, ADOPTION)
older = doc(OLDER, ADOPTION)
origins, old_origins, older_origins = [index(x['origins']) for x in [a, old, older]]
members, old_members = [index(x['preserved'], 'member') for x in [a, old]]
entries, old_entries = [index(x['holds']['register']['entries'], 'key') for x in [a, old]]
targets = index(a['suite_targets'])
witnesses = {r['id']: r for r in a['counterexamples'] if r['kind'] in ['held_witness', 'superseded_witness']}
rule = {key for key, r in entries.items() if r.get('decision') == P + 'owner-choice-08.md'}
old_rule = {key for key, r in old_entries.items() if r.get('decision') == P + 'owner-choice-08.md'}
overlap = {key for key, r in entries.items() if r.get('claim') != 'V-ENV' and 'V-ENV' in r['matched']}
old44 = {r['key'] for r in doc(H, P + 'review-02/venv-classification.json')['entries']}
rule_list = doc(C, P + 'coarse-rule/rule-1-entries.json')
check('committed rule-1 list exact, no duplicate', {r['key'] for r in rule_list} == rule and len(rule_list) == len(rule))
check('rule-1 prior-membership flags exact', all(r['review_02'] == (r['key'] in old44) and
      r['implementation_03'] == (r['key'] in old_rule) for r in rule_list))
check('old 44 and 188 all retained', old44 <= rule and old_rule <= rule, [len(old44), len(old_rule)])
overlap_list = doc(C, P + 'coarse-rule/category-v-env-entries.json')
expected_overlap = sorted([{k: entries[key][k] for k in ['key','claim','classification','decision']} for key in overlap], key=lambda r:r['key'])
check('committed category overlap list exact', sorted(overlap_list,key=lambda r:r['key']) == expected_overlap)
category = {key for key,r in entries.items() if r.get('claim') != 'V-ENV'}
check('all category dispositions unchanged', all(key in old_entries and all(entries[key].get(k) == old_entries[key].get(k)
      for k in ['classification','claim','decision','reason']) for key in category), len(category))
check('every rule-1 entry held, V-ENV-matched and owned', all(entries[k]['classification'] == 'held' and
      entries[k]['claim'] == 'V-ENV' and 'V-ENV' in entries[k]['matched'] for k in rule))
def leaf_key(row):
    if row.get('current'):
        return f"{row['file']}:{row['current'][0]}:{row['current'][1]}"
    declaration=row.get('declaration',{})
    return f"{row.get('file')}:{declaration.get('line')}:{declaration.get('column')}"
held_targets={k for k,t in targets.items() if entries.get(leaf_key(t),{}).get('classification') in ['held','superseded']}
check('no preserved member at a held registered leaf',not any(r['status']=='preserved' and
      entries.get(leaf_key(r),{}).get('classification') in ['held','superseded'] for r in members.values()))
check('37 target leaves held, 15 unheld', len(held_targets)==37 and len(targets)-len(held_targets)==15)
check('all witnesses name a correctly classified member and claim',all(
      w['members'] and all(members[k]['status']+'_witness'==w['kind'] and
          entries.get(leaf_key(members[k]),{}).get('claim')==w['claim'] for k in w['members'])
      for w in witnesses.values()))

transferred = index(a['transferred'], 'origin')
transfer_facts = []
for item in a['transfer_lists']:
    data = blob(C, item['list'])
    listed = {r['origin'] for r in json.loads(data)}
    actual = {k for k,r in transferred.items() if r['decision'] == item['decision']}
    check('transfer pin/set: ' + item['decision'], sha(data) == item['sha256'] and listed == actual)
    transfer_facts.append(dict(decision=item['decision'], origins=sorted(actual), sha256=sha(data)))
check('open revalidation set equals all transfer lists', {k for k,r in origins.items() if r['state']=='pending_revalidation'} == set(transferred))
closed = {k for k,r in origins.items() if r['state']=='complete'}
old_closed = {k for k,r in old_origins.items() if r['state']=='complete'}
new_transfer = {r['origin'] for r in doc(C, P+'owner-choice-11/transferred-origins.json')}
check('only choice 11 three reopened; no new closures', old_closed - closed == new_transfer and closed <= old_closed)
check('transferred three have no closure', all(origins[k]['state']=='pending_revalidation' and 'closure' not in origins[k] for k in new_transfer))
for key in sorted(closed):
    closure_links=origins[key]['closure']['links']
    linked_targets={r['id'] for r in closure_links if r['kind']=='target'}
    linked_witnesses={r['id'] for r in closure_links if r['kind']=='counterexample'} & set(witnesses)
    required=[r for r in members.values() if key in r['origins']]
    routes=not (linked_targets & held_targets)
    for member in required:
        if member['status']=='refused':
            routes &= any(targets[t].get('member')==member['member'] for t in linked_targets)
        if member['status'] in ['held','superseded']:
            routes &= any(key in witnesses[w]['origins'] and member['member'] in witnesses[w]['members'] and
                          witnesses[w]['kind']==member['status']+'_witness' for w in linked_witnesses)
    check('closed-origin no held target; all member routes: '+key, routes)
listed = doc(C,P+'owner-choice-11/limited-members.json')
check('choice 11 one member/four targets exact', len(listed)==1 and len(listed[0]['targets'])==4 and
      set(listed[0]['targets']) == {t['id'] for t in a['suite_targets'] if t.get('member')==listed[0]['member']} and
      listed[0]['origin'] in members[listed[0]['member']]['origins'])
extra_pin = transferred[listed[0]['origin']]['limited']['listed']
check('choice 11 member list digest and decision text', extra_pin['members']==P+'owner-choice-11/limited-members.json' and
      extra_pin['sha256']==sha(blob(C,extra_pin['members'])) and extra_pin['sha256'] in blob(C,P+'owner-choice-11.md').decode())
old_list = {r['member'] for r in doc(C,P+'continuation-stop-01/unbound-members.json')['rows']}
held_list = {key for key in old_list if members[key]['status']=='held'}
check('24 original listed members: 22 held under rule 1', len(old_list)==24 and len(held_list)==22 and all(
      f"{members[k]['file']}:{members[k]['current'][0]}:{members[k]['current'][1]}" in rule for k in held_list))
check('report expressly states 22 stay listed without credit',
      "22 of choice 04's 24 listed members are rule-1 held" in report and
      'one held by rule 1 stays listed and earns no credit' in report)
for transfer in a['transferred']:
    if 'limited' not in transfer:
        continue
    for extra in transfer['limited']['extras']:
        mapped=[t for t in targets.values() if t.get('member')==extra['member']]
        check('limited extra unique target/held leaf: '+extra['member'], len(mapped)==1 and
              mapped[0]['id']==extra['target'] and leaf_key(mapped[0]) in rule and
              members[extra['member']]['status']=='refused' and transfer['origin'] in members[extra['member']]['origins'])

check('R1-01 run-set and regex machinery retained byte-for-byte',
      blob(C,'scripts/packet_tools.py').split(b'def register_recipes(',1)[1].split(b'def intrinsic_trace(',1)[0].strip() ==
      blob(OLD,'scripts/packet_tools.py').split(b'def register_recipes(',1)[1].split(b'def floor_order_model(',1)[0].strip())
source_now=blob(C,'tests/tooling/source-facts.mjs')
source_old=blob(OLD,'tests/tooling/source-facts.mjs')
check('unread-code visitor unchanged',source_now.split(b"if (ts.isIdentifier(node) && node.text === 'eval'",1)[1] ==
      source_old.split(b"if (ts.isIdentifier(node) && node.text === 'eval'",1)[1])
check('no executable read-only/fresh-result exemption table remains',all(token not in source_now for token in
      [b'const READ_ONLY',b'const FRESH_RESULTS',b'const SAFE_',b'function safeUse']))

def links(row):
    return {(v['kind'],v['id']) for v in row.get('closure',{}).get('links',[])}
relink03 = {k for k in old_closed if links(old_origins[k]) != links(older_origins[k])}
relink04 = {k for k in closed if links(origins[k]) != links(old_origins[k])}
relinks = doc(C,P+'coarse-rule/relinked-origins.json')
check('relink list equals independently diffed 18 and 70 plus choice 11 transfers',
      {r['origin'] for r in relinks} == relink03 | relink04 | new_transfer and len(relinks)==len(relink03 | relink04 | new_transfer),
      dict(round3=len(relink03),round4=len(relink04),union=len(relink03 | relink04),
           extra_transfers=sorted(new_transfer-relink03-relink04)))
for r in relinks:
    key=r['origin']
    expected_by = (['implementation_03'] if key in relink03 else []) + (['implementation_04'] if key in relink04 else [])
    check('relink contents: '+key, r['state']==origins[key]['state'] and r['relinked_by']==expected_by and
          set(r['witnesses']) == {v for kind,v in links(origins[key]) if kind=='counterexample' and v in witnesses} and
          set(r['added_since_implementation_03']) == {v for _,v in links(origins[key])-links(old_origins[key])} and
          set(r['dropped_since_implementation_03']) == {v for _,v in links(old_origins[key])-links(origins[key])})

figures = dict(member_status=dict(collections.Counter(r['status'] for r in members.values())),
    transitioned_to_held=dict(collections.Counter(old_members[k]['status'] for k,r in members.items()
        if r['status']=='held' and old_members[k]['status']!='held')),
    register_entries=len(entries), rule_1=len(rule), not_held=sum(r['classification']=='not_held' for r in entries.values()),
    overlap=len(overlap), target_rows=len(targets), witnesses=len(witnesses), closed=len(closed), transferred=len(transferred),
    listed= len(old_list) + len(listed), held_listed=len(held_list),
    extras_by_file=dict(collections.Counter(members[e['member']]['file'] for t in transferred.values() for e in t.get('limited',{}).get('extras',[]))),
    closure_contexts=sum(len(origins[k]['closure']['context']) for k in closed),
    origin_states=dict(collections.Counter(r['state'] for r in origins.values())),
    B_C_changed_paths=len(changed_c),B_H_changed_paths=len(changed))
expected=dict(preserved=49,held=1095,superseded=74,refused=54)
check('report census recomputes',figures['member_status']==expected)
check('report headline counts recompute', [figures[k] for k in ['register_entries','rule_1','not_held','overlap','target_rows','witnesses','closed','transferred','listed','held_listed']]
      == [950,853,0,96,52,1169,107,47,25,22])
admin_at_c = doc(C,P+'verification.json')['administrative_files']
check('report area-gate count including declared administrative paths',len(set(changed_c)|set(admin_at_c))==345)

result=dict(base=B,payload=C,candidate=H,checks=checks,figures=figures,transfer_lists=transfer_facts,
    wording_observations=[
        'The report calls 345 paths B..C; literal B..C has 344. The area gate includes the declared report path and correctly reports 345.',
        'The 80 relink rows include the union of 18 prior and 70 current relinks (78 distinct), plus two other choice-11 transfers. The JSON accurately labels all three transfers pending_revalidation; 77 rows are currently complete.'
    ],
    held_listed_members=sorted(held_list),changed_paths=changed,administrative_files=administrative,
    summary=dict(passed=sum(c['passed'] for c in checks),failed=[c['check'] for c in checks if not c['passed']]))
(OUT/'records.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'summary':result['summary'],'figures':figures},indent=2))
