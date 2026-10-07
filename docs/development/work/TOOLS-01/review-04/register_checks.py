"""Review 04, check 2: the hold register at C under owner choice 08 option (b).
Read-only. Usage: python3 -B register_checks.py <repo> > register.json. Imports the candidate's packet_tools.py
from <repo>/scripts (equal at C and H) only for the refusal probes, which fire before any Node work."""
import collections, copy, json, subprocess, sys

REPO = sys.argv[1]
C, PREV_H, H = '28258b282532b36eef8fb1571d79b6343b54427b', '446dd25820500db4e0eb3d6940ec49e45634f39c', '7f3a2af46d714dc2a0e47a755ccd4fe8aeb0ba94'
VENV_RECORD = 'docs/development/work/TOOLS-01/owner-choice-08.md'


def load(rev, path):
    return json.loads(subprocess.run(['git', '-C', REPO, 'show', f'{rev}:{path}'], capture_output=True, check=True).stdout)


adoption = 'tests/fixtures/packet-tools/adoption.json'
c, p = load(C, adoption), load(PREV_H, adoption)
r2 = {e['key'] for e in load(H, 'docs/development/work/TOOLS-01/review-02/venv-classification.json')['entries']}
E, EP = c['holds']['register']['entries'], {e['key']: e for e in p['holds']['register']['entries']}
claims = {row['id']: row for row in c['holds']['claims']}
venv = [e for e in E if 'V-ENV' in e['matched']]
rule1 = [e for e in E if e.get('decision') == VENV_RECORD]
category = [e for e in E if e.get('claim') in ('Proxy', 'V-D1', 're-prototyped-built-in')]
held = [e for e in E if e['classification'] != 'not_held']
overlap = [e for e in venv if e.get('claim') != 'V-ENV']
facts = {
    'register': {'entries': len(E), 'cases': sum(e['key'].startswith('case:') for e in E),
                 'by_class': dict(collections.Counter(e['classification'] for e in E))},
    'held_or_superseded': {'count': len(held), 'name_a_decision': sum('decision' in e for e in held),
                           'name_a_reading': sum('reading' in e for e in held),
                           'name_neither': [e['key'] for e in held if 'decision' not in e and 'reading' not in e]},
    'v_env_matched': {'count': len(venv), 'not_held': [e['key'] for e in venv if e['classification'] == 'not_held'],
                      'claimed_v_env': sum(e.get('claim') == 'V-ENV' for e in venv)},
    'rule_1': {'count': len(rule1), 'all_held_v_env_and_v_env_matched': all(
        e['classification'] == 'held' and e['claim'] == 'V-ENV' and 'V-ENV' in e['matched'] for e in rule1),
               'v_env_claims_not_naming_choice_08': [e['key'] for e in E if e.get('claim') == 'V-ENV' and e.get('decision') != VENV_RECORD],
               'includes_review_02_44': r2 <= {e['key'] for e in rule1}, 'review_02_keys': len(r2),
               'former_not_held': sorted(e['key'] for e in rule1 if e['key'] in EP and EP[e['key']]['classification'] == 'not_held'),
               'new_since_previous_h': sum(e['key'] not in EP for e in rule1),
               'keys': [e['key'] for e in rule1]},
    'category': {'count': len(category), 'owner': {k: claims[k]['owner'] for k in ('Proxy', 'V-D1', 're-prototyped-built-in')},
                 'decisions': {f"{k[0]} -> {k[1]}": v for k, v in collections.Counter((e['claim'], e['decision']) for e in category).items()},
                 'classification_claim_reason_changed_since_previous_h': [
                     e['key'] for e in category if any(EP[e['key']].get(f) != e.get(f) for f in ('classification', 'claim', 'reason'))]},
    'v_env_matched_category_entries': {
        'count': len(overlap),
        'by_claim_and_class': {f'{k[0]}/{k[1]}': v for k, v in collections.Counter((e['claim'], e['classification']) for e in overlap).items()},
        'newly_v_env_matched_at_c': sum('V-ENV' not in EP[e['key']]['matched'] for e in overlap),
        'entries': [{'key': e['key'], 'classification': e['classification'], 'claim': e['claim'], 'decision': e['decision'],
                     'matched': e['matched'], 'v_env_matched_at_previous_h': 'V-ENV' in EP[e['key']]['matched']} for e in overlap]},
}

# Refusal probes on the real register at C: one altered entry each; hold_register refuses before recomputing matches.
sys.path.insert(0, REPO + '/scripts')
import packet_tools as tool  # noqa: E402
git, env = tool.Git(REPO), tool.child_environment(tool.environment_declaration(None))[0]
spec = load(C, adoption)


def probe(pred, alter):
    register = copy.deepcopy(spec['holds']['register'])
    entry = next(e for e in register['entries'] if pred(e))
    alter(entry)
    try:
        tool.hold_register(git, C, register, claims, [], env)
        return {'key': entry['key'], 'refused': None}
    except tool.CheckError as exc:
        return {'key': entry['key'], 'refused': str(exc)}


facts['refusal_probes'] = {
    'Proxy superseded entry naming neither': probe(lambda e: e.get('claim') == 'Proxy' and e['classification'] == 'superseded', lambda e: e.pop('decision')),
    'rule-1 entry naming neither': probe(lambda e: e.get('decision') == VENV_RECORD, lambda e: e.pop('decision')),
    'V-D1 entry naming neither': probe(lambda e: e.get('claim') == 'V-D1', lambda e: e.pop('decision')),
    'V-D1 entry naming another claim\'s decision': probe(lambda e: e.get('claim') == 'V-D1', lambda e: e.update(decision=VENV_RECORD)),
    'Proxy entry with a reading instead of decision-01': probe(lambda e: e.get('claim') == 'Proxy',
                                                               lambda e: (e.pop('decision'), e.update(reading={'facts': 'x', 'claim': 'Proxy'}))),
}
print(json.dumps(facts, indent=1))
