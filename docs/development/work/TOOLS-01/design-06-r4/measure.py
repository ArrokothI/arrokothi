"""Design 06 revision 4: regenerate adoption.json and the registry's case attributions with the prototype
detector, as design 06's build regenerated them, and log the figures. Scratch measurement, not the build.
Usage: python3 -B measure.py <clone with prototype.diff committed> <log.json> [--write]
With --write it rewrites tests/fixtures/packet-tools/{adoption,mutations}.json for a following `corpus` run."""
import contextlib, json, sys
from collections import Counter
from pathlib import PurePosixPath

W, LOG = sys.argv[1], sys.argv[2]
WRITE = '--write' in sys.argv
sys.path.insert(0, W + '/scripts')
import packet_tools as tool


def dump(d):
    """adoption.json's layout: two-space indent, ASCII escapes, and one line per preserved row."""
    parts = []
    for key, value in d.items():
        if key == 'preserved':
            rows = ',\n'.join('    ' + json.dumps(row, ensure_ascii=True) for row in value)
            text = '[\n' + rows + '\n  ]' if value else '[]'
        else:
            text = json.dumps(value, indent=2, ensure_ascii=True).replace('\n', '\n  ')
        parts.append('  ' + json.dumps(key) + ': ' + text)
    return '{\n' + ',\n'.join(parts) + '\n}\n'


git = tool.Git(W)
rev = git.commit(git.run('rev-parse', 'HEAD').decode().strip())
tool.clean_payload(git, rev)
ADOPTION, REGISTRY = W + '/tests/fixtures/packet-tools/adoption.json', W + '/tests/fixtures/packet-tools/mutations.json'
spec = json.load(open(ADOPTION))
registry = json.load(open(REGISTRY))
intake = tool.inventory(git, rev, spec['inventory'])
origins = {row['id']: row for row in intake['origins']}
environment = tool.child_environment(tool.environment_declaration(None))[0]
toolchain = tool.typescript_toolchain(git, rev)
log = {}

# A. V-ENV's governing decisions include owner choice 08 (rule 1).
venv_claim = next(row for row in spec['holds']['claims'] if row['id'] == 'V-ENV')
if tool.VENV_RECORD not in venv_claim['decisions']:
    venv_claim['decisions'].append(tool.VENV_RECORD)

TARGET_1363 = 'target.dispatch.1363.3.5a8d958ffdab'
log['restored_1363'] = 'already in the manifest'

# C. The register, recomputed with the committed tool.
moves = tool.moves_table(git, rev, spec['moves'])
tested = tool.test_file_origins(intake)
def scope_of(targets):
    return sorted({moves.get(row['path'], row['path']) for row in tested if tool.blob_id(git, rev, moves.get(row['path'], row['path']))} |
                  {row['file'] for row in targets if isinstance(row.get('file'), str) and tool.blob_id(git, rev, row['file'])})
recipes = tool.register_recipes({row['id']: row for row in spec['holds']['claims']}, spec['holds']['register'])
scope = scope_of(spec['suite_targets'])
matches = tool.register_matches(git, rev, scope, recipes, environment, toolchain)
matches += tool.register_case_matches(git, rev, registry['cases'], recipes, spec['registry'], environment, toolchain)
matches = {row['key']: row for row in matches}
old = {row['key']: row for row in spec['holds']['register']['entries']}
log['dropped'] = sorted(set(old) - set(matches))
assert not log['dropped'], log['dropped']
CATEGORY = {claim: paths[0] for claim, paths in tool.CATEGORY_DECISIONS.items()}

def kinds(row):
    return ', '.join(sorted({site.split('@')[0] for site in row['detector']})) or 'the regex minimum'

entries, flipped, new_keys = [], [], []
cases = {case['id']: case for case in registry['cases']}
ATTRIBUTION = ('Held by owner choice 08 rule 1: its run set starts node:child_process children the V-ENV detector '
               'cannot read. The oracle control is a tooling mechanism check; per-test classification is BINDING-01\'s, '
               'and it earns no conformance or correction credit.')
for key, match in matches.items():
    venv = 'V-ENV' in match['claims']
    if key in old:
        entry = dict(old[key], matched=match['claims'])
        if entry['classification'] == 'not_held' and venv:
            entry = {'key': key, 'matched': match['claims'], 'classification': 'held', 'claim': 'V-ENV',
                     'decision': tool.VENV_RECORD,
                     'reason': f"Held by owner choice 08 rule 1: the V-ENV detector finds {kinds(match)} in its run set. "
                               f"Earlier reading, kept as a note for BINDING-01: {old[key]['reason']}"}
            flipped.append(key)
    else:
        assert venv, key
        entry = {'key': key, 'matched': match['claims'], 'classification': 'held', 'claim': 'V-ENV',
                 'decision': tool.VENV_RECORD,
                 'reason': f"Held by owner choice 08 rule 1: the V-ENV detector finds {kinds(match)} in its run set; "
                           f"per-test classification is BINDING-01's."}
        new_keys.append(key)
        if key.startswith('case:'):
            case = cases[key[len('case:'):]]
            assert not case.get('claim'), key
            case['claim'] = {'kind': 'mechanism_witness', 'owner': 'BINDING-01', 'decision': tool.VENV_RECORD,
                             'reason': ATTRIBUTION}
            entry['reason'] = 'Registry case attributed mechanism_witness to BINDING-01: ' + ATTRIBUTION
    if entry['classification'] != 'not_held' and 'decision' not in entry and 'reading' not in entry:
        if entry['claim'] == 'V-ENV':
            assert venv, ('a V-ENV-claimed entry that is no V-ENV match', key)
            entry['decision'] = tool.VENV_RECORD
        else:
            entry['decision'] = CATEGORY[entry['claim']]
    entries.append(entry)
order = {key: index for index, key in enumerate(old)}
entries.sort(key=lambda row: (order.get(row['key'], len(order)), row['key']))
spec['holds']['register']['entries'] = entries
register = {row['key']: row for row in entries}
held_now = {key for key, row in register.items() if row['classification'] != 'not_held'}
newly_held = {key for key in held_now if key not in old or old[key]['classification'] == 'not_held'}
log['register'] = {'entries': len(entries), 'new': len(new_keys), 'new_cases': sum(k.startswith('case:') for k in new_keys),
                   'flipped': flipped, 'rule_1': sum(row.get('decision') == tool.VENV_RECORD for row in entries),
                   'by': dict(Counter(f"{row['classification']}:{row.get('claim', '-')}" for row in entries))}

# E. The census at C with the new register.
with contextlib.ExitStack() as stack:
    context = tool.target_context(git, rev, spec, stack, toolchain)
    evaluations, all_earlier = tool.preserved_census(git, rev, spec, intake, context, register)
table = tool.preserved_table(evaluations)
before = {row['member']: row['status'] for row in json.load(open(ADOPTION))['preserved']}
spec['preserved'] = table
status = {row['member']: row['status'] for row in table}
log['census'] = {'by_status': dict(Counter(row['status'] for row in table)),
                 'moved': dict(Counter(f"{before.get(row['member'])}->{row['status']}" for row in table
                                       if before.get(row['member']) != row['status']))}

# D. Suite targets: a target on a newly held leaf leaves the table unless it maps a limited origin's member.
LIMITED = [row['origin'] for row in spec['transferred'] if row['decision'] == tool.LIMIT_DECISION]
member_origins = {row['member']: row['origins'] for row in spec['preserved']}
def leaf(target):
    return f"{target['file']}:{target['declaration']['line']}:{target['declaration']['column']}"
removed, kept_mapping = [], []
targets = []
for target in spec['suite_targets']:
    if leaf(target) in newly_held:
        # A mapping target: its member stays refused and unbound in a limited origin (C2-LIMIT extra).
        if set(member_origins.get(target.get('member'), [])) & set(LIMITED) and status.get(target.get('member')) == 'refused':
            kept_mapping.append(target['id'])
        else:
            removed.append(target)
            continue
    targets.append(target)
targets.sort(key=lambda row: [row['file'], row['declaration']['line'], row['id']])
removed_cx = {row['counterexample'] for row in removed}
assert not removed_cx & {row['counterexample'] for row in targets}
spec['suite_targets'] = targets
counterexamples = [row for row in spec['counterexamples'] if row['id'] not in removed_cx]
log['targets'] = {'rows': len(targets), 'removed': sorted(row['id'] for row in removed), 'kept_mapping': kept_mapping}
assert scope_of(targets) == scope, 'the register scope changed with the targets'

# F. One witness per held or superseded member.
claims = {row['id']: row for row in spec['holds']['claims']}
witnessed = {member: row['id'] for row in counterexamples if row['kind'] in ('held_witness', 'superseded_witness')
             for member in row.get('members', [])}
created = []
for row in table:
    if row['status'] not in ('held', 'superseded') or row['member'] in witnessed:
        continue
    entry = register[f"{row['file']}:{row['current'][0]}:{row['current'][1]}"]
    path, site = row['member'].rsplit('@', 1)[0], row['member'].rsplit('@', 1)[1]
    name, line, column = path.rsplit(':', 2)
    stem = PurePosixPath(name).name
    for suffix in tool.TEST_SUFFIXES:
        stem = stem.removesuffix(suffix)
    witness = {'id': f'witness.{stem}.{line}.{column}.{site}', 'kind': row['status'] + '_witness', 'claim': entry['claim'],
               'origins': row['origins'], 'members': [row['member']],
               'required_result': f"Held for {claims[entry['claim']]['owner']} under {entry['claim']}: {entry['reason']} "
                                  f"Test: {row['title']}"}
    assert witness['id'] not in {cx['id'] for cx in counterexamples}, witness['id']
    counterexamples.append(witness)
    witnessed[row['member']] = witness['id']
    created.append(witness['id'])
stale = [cx['id'] for cx in counterexamples if cx['kind'] in ('held_witness', 'superseded_witness') and
         any(next((row['status'] for row in table if row['member'] == member), None) != cx['kind'][:-len('_witness')]
             for member in cx['members'])]
assert not stale, stale
spec['counterexamples'] = counterexamples
log['witnesses'] = {'total': sum(cx['kind'] in ('held_witness', 'superseded_witness') for cx in counterexamples),
                    'created': len(created)}

# G. Closures: drop links to removed or P1-H-refused targets and removed records; link each held member's
# witness, and the witnesses of members now held at a dropped target's leaf.
refused_targets = {target_id for target_id in kept_mapping} | {TARGET_1363}
by_leaf = {}
for row in table:
    if row['status'] in ('held', 'superseded') and row.get('current'):
        by_leaf.setdefault(f"{row['file']}:{row['current'][0]}:{row['current'][1]}", []).append(witnessed[row['member']])
removed_by_id = {row['id']: row for row in removed}
all_targets = {row['id']: row for row in spec['suite_targets']}
relinked = []
for origin in spec['origins']:
    if origin['state'] != 'complete':
        continue
    links = origin['closure']['links']
    kept, added = [], []
    for link in links:
        if link['kind'] == 'target' and (link['id'] in removed_by_id or link['id'] in refused_targets):
            target = removed_by_id.get(link['id']) or all_targets[link['id']]
            added += by_leaf.get(leaf(target), [])
            continue
        if link['kind'] == 'counterexample' and link['id'] in removed_cx:
            continue
        kept.append(link)
    members = [row for row in table if origin['id'] in row['origins'] and row['status'] in ('held', 'superseded')]
    added += [witnessed[row['member']] for row in members]
    present = {(link['kind'], link['id']) for link in kept}
    extra = [{'kind': 'counterexample', 'id': cx} for cx in dict.fromkeys(added) if ('counterexample', cx) not in present]
    if kept != links or extra:
        origin['closure']['links'] = kept + extra
        relinked.append({'origin': origin['id'], 'dropped': [link['id'] for link in links if link not in kept],
                         'added': [link['id'] for link in extra]})
log['closures'] = {'relinked': len(relinked), 'detail': relinked}

# H. Transfer lists and the owner choice 04 limit.
def pinned(decision, path):
    return {'decision': decision, 'list': path, 'sha256': tool.digest(git.blob(rev, path))}
spec['transfer_lists'] = [pinned(tool.LIMIT_DECISION, 'docs/development/work/TOOLS-01/owner-choice-04/limited-origins.json'),
                          pinned('docs/development/work/TOOLS-01/owner-choice-05.md',
                                 'docs/development/work/TOOLS-01/owner-choice-05/transferred-origins.json')]
listed = {row['member'] for row in json.loads(git.blob(rev, tool.LIMIT_MEMBERS))['rows']}
p1h = {target['id'] for target in spec['suite_targets'] if leaf(target) in held_now}
credited = {target['member'] for target in spec['suite_targets'] if 'member' in target and target['id'] not in p1h}
limits = {}
for row in spec['transferred']:
    if row['decision'] != tool.LIMIT_DECISION:
        continue
    unbound = {member['member'] for member in table if row['origin'] in member['origins'] and member['status'] == 'refused'
               and member['member'] not in credited}
    unbound |= {member['member'] for member in table if member['member'] in listed and row['origin'] in member['origins'] and member['status'] == 'held'}
    extras = []
    for member in sorted(unbound - listed):
        mapped = [target['id'] for target in spec['suite_targets'] if target.get('member') == member]
        assert len(mapped) == 1, ('an unbound member without a single mapping target', member, mapped)
        extras.append({'member': member, 'target': mapped[0]})
    mine = listed & {m['member'] for m in table if row['origin'] in m['origins']}
    log.setdefault('limited_listed_not_unbound', {})[row['origin']] = sorted(
        (member, next(m['status'] for m in table if m['member'] == member)) for member in mine - unbound)
    row['limited'] = {'members': tool.LIMIT_MEMBERS, 'sha256': tool.digest(git.blob(rev, tool.LIMIT_MEMBERS)), 'extras': extras}
    limits[row['origin']] = extras
log['limited'] = limits
keys = list(spec)
spec = {key: spec[key] for key in [*keys[:keys.index('transferred')], 'transfer_lists', 'transferred']}

json.dump(log, open(LOG, 'w'), indent=1)
print(json.dumps({key: value for key, value in log.items() if key != 'closures'}, indent=1))
print('closures relinked', log['closures']['relinked'])
if WRITE:
    open(ADOPTION, 'w').write(dump(spec))
    open(REGISTRY, 'w').write(json.dumps(registry, indent=2, ensure_ascii=False) + '\n')
    print('written')
