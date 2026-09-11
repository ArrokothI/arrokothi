# Implementation report — K0.1, round 11

## Identity and status

- Packet **K0.1**, parent **K0**; [contract](contract.md), [worksheet](protocol-worksheet.md)
  **Revision 11**. State: **WAITING_FOR_REVIEW**, not accepted.
- Owner authorization: the delivered correction prompt in [review-10.md](review-10.md), continuing
  K0.1 only under the existing bootstrap release. No prerequisite or successor release changed.
- Integration base: `6464be12c11eb75f7dfbc5ece12ca8d3020a5c15`.
- Previous reviewed H10: `012ca92574319aa099a91c845f8fb4375c081f34`.
- Review-10 administrative commit: `5d726684f2911882c22762dcab61f001cd680847`.
- **Payload C11: `b40cfe968c8e0d2111a88df68c68f64fd02a4be3`.**
- **Candidate H11:** the commit containing this report and the K0.1 ledger-row update, and only those
  two files. Its full SHA and verified remote advertisement are supplied in the handoff.
- Branch: `codex/k0.1-protocol-legacy-disposition`; configured origin:
  `https://github.com/ArrokothI/Agent_SDK.git`. The URL was not changed.
- Before editing, HEAD and advertisements from both origin and the supplied
  `https://github.com/ArrokothI/agent-kernel.git` matched H10. H10's four artifact blobs matched the
  owner's expected identities, reproduced in review-10. The clean tree and exact chain
  H9 `00b30eb333024f7093c5a1db122a3772ca2b8b04` → prior administrative commit
  `ab3dbd6781a2c59a8bd0dc6386d4f7875c76ae8b` → C10
  `7f68df367d05641dfdcfca932a1f4c533b5ace3d` → H10 were verified.
- All final payload validation below ran **after C11 was committed**, with a clean tree. No evidence
  file or script was added to the repository after validation; the temporary helpers are reproduced
  here for independent inspection. H11 is followed by a normal fast-forward push and remote check;
  this report does not claim a push result before it occurs.

## Scope and dispositions

The review-record commit contains only review-10 and the K0.1 ledger row (`CHANGES_REQUESTED`).
C11 changes only contract correction history and the worksheet. H11 adds this report and changes only
that ledger row to `WAITING_FOR_REVIEW`. No runtime, package, test, canonical architecture, dependency,
benchmark or evidence file changed in this correction. **K0.2 was not started.**

**K01-R10-01 (reviewer-found, P2): corrected.** W-1's source-category paragraph and §11 row 5(b)
previously said B-2 selected a `WAITING` batch, contradicting B-2. They now cite `B-6`/`B-7` for
retirement and recoverable readiness and `B-2` for selection once `READY`. Row 5(e) and W-7 case 7
also identify B-2 as the selection owner. The revision marker, §13, revision history and contract
history record the correction. The selection algorithm itself is unchanged.

**K01-I11-01 (implementer-discovered): corrected separately.** W-6 case 4 said W-2 "finds and
consumes" an early result at registration. That permits premature acknowledgment, contrary to B-3 and
W-2: an Event outside the registering Outcome's own batch must remain unacknowledged. W-6 now states
that finding it creates B-6 path A readiness; registration and reservation do not acknowledge it.
W-9 case 3's reference to this example now says "find". This repairs an example, without changing
W-2, B-3, or generation fencing. It is not attributed to the independent reviewer.

The resulting lifecycle has one interpretation: W-1 decides eligibility under the live wait; the
applicable acceptance boundary atomically retires the wait, sets `READY` and records recoverable
readiness; B-2 subsequently selects and reserves the batch from `READY`. Reservation consumes
readiness, not Events. An accepted Outcome acknowledges its reserved Events; a terminal decision
instead records terminal dispositions. No live wait or satisfaction flag survives into READY.

**Ownership and precedence.** This is Kernel protocol documentation. Governing reads included
AGENTS.md, docs/README and mental-model, kernel, the detail-design map and execution-protocol,
recovery-and-compatibility, evidence-and-observability, the development front door and 001–008,
contract, worksheet, review-09 and implementation-10. Read-only code/test checks included the
Event-envelope/wake matcher and wait-wake-resume conformance. Current 0.8.x consumption is migration
evidence, not the target's acknowledgment rule. B-2 already explains how execution-protocol's
wait-side sentence preserves the eligible-wake-before-backlog guarantee across retirement, consistent
with kernel.md's WAITING → READY → dispatch lifecycle. No canonical conflict requiring an owner
decision was found. OA-3 was not redesigned.

## Adversarial review and preservation

These are implementer observations about a document, not executed target-protocol tests or independent
acceptance. Searches preceded C11 and were repeated on C11. I tried to derive competing answers for
eligibility, retirement, readiness, reservation and acknowledgment in the following scenarios.

| Scenario | Required answer retained at C11 |
|---|---|
| WAITING, only unrelated application backlog | W-1 rejects eligibility; no retirement, readiness, selection or dispatch; Event stays queued. |
| WAITING, subscribed input accepted with older unrelated backlog, bound 1 | B-6 path B atomically accepts the Event, retires the wait and creates READY readiness. B-2 later reserves the eligible input; unrelated backlog cannot displace it. |
| Eligible Event already queued at registration | W-2 acknowledges only the registering Outcome's own batch, then finds the still-unacknowledged Event and creates B-6 path A readiness. It does not consume that Event; corrected W-6 agrees. |
| Already-due deadline at registration, with / without an eligible queued Event | W-2 step 2 wins with an eligible Event; otherwise step 3 creates one mandatory timeout Event and B-7 readiness. No durable WAITING in either case. |
| Result accepted before expiry | B-6 retires the generation; its later timer is stale, with no timeout Event. |
| Timeout accepted first, result arrives before reservation | B-7 preserves the mandatory timeout; B-8 creates no second readiness. Bound 1 delivers timeout; bound ≥2 includes the eligible result, in acceptance order. |
| Further eligible Event after wake but before reservation | B-2 evaluates the retired selector against Events unacknowledged at reservation; no stale snapshot, extra readiness or live wait is inferred. |
| Cancellation after wait retirement but before reservation | No Activation; every unacknowledged Event receives B-5 terminal disposition. |
| Reservation then retry/takeover | Readiness is consumed once; immutable batch/Activation ID retained, epoch changes only for authorized takeover. No re-selection. |
| Subscription wake with external dependencies outstanding | Wait is retired, no per-alternative satisfaction or interleave state; Runtime re-registers remaining needs. |
| Routing obligation without destination acceptance | No destination readiness until its Event acceptance boundary; recovery fulfills the obligation. |
| Inert alternative; subscription-only wait; Runtime-local work | Structural validity remains distinct from eligibility; subscription-only waits remain valid; private work keeps its Activation unresolved/RUNNING. |

Mechanically checked unchanged: worksheet §§1–4 (including B-1 through B-8), §§6–10 and §12;
W-1 structural well-formedness, W-2 through W-5, W-8; and the contract from Identity onward, including
all six acceptance criteria and the command plan. Diff inspection confirmed W-9 changes only its W-6
cross-reference. Thus E-7/JCS, identity/epochs, Effect refusal, progress compatibility, MIG-5/REF-5,
legacy labels, timeout identity/idempotency, routing, clocks and the whitespace exception remain intact.
All 28 historical report/review/evidence blobs present at H10 are unchanged at C11, as is review-10's
administrative blob. Earlier findings retain their recorded dispositions; reviewed history was not
amended, rebased or force-pushed.

| Criterion | Implementer observation / evidence |
|---|---|
| C1 | §11 now cites the lifecycle owners consistently; scenarios above cover the affected observable boundary. |
| C2 | Dedicated decisions retained; protected sections and algorithms are byte-identical. |
| C3 | §12 is byte-identical; no classification change. |
| C4 | No new entity, wire codec, store or selection mechanism. |
| C5 | §13 records K01-R10-01 and the separate K01-I11-01 correction against their governing rules. |
| C6 | Revision 11 marker and local rule citations; link audit passes. |

## Validation environment and results

Working directory for every command:
`/Users/rex-shih/Documents/Codex/projects/agent-kernel`.
Run September 11, 2026, America/New_York, on Darwin arm64; Node `v25.2.1`, npm `11.6.2`,
Python `3.14.6`, Git `2.39.5 (Apple Git-154)`. No installs or configuration changes. Commands below
are fresh C11 runs, distinct from the reviewer's inspection-only evidence.

The strict cumulative whitespace command **exited 2**, with exactly the two approved historical
findings at implementation-04 lines 227 and 235. It is not reported as green. Only blank-at-eol disabled
passes cumulatively, and the entire new H10..C11 delta passes strict default rules without exceptions.
The following stdout/stderr is reproduced from the runs; the two offending `+ ` lines are rendered
as `+[one trailing space omitted]` so the report does not introduce new trailing whitespace.
Empty output means the command emitted nothing; its exit code is still recorded.

```text
$ npm run check:builder-docs

> arrokothi-agent-kernel@0.8.1 check:builder-docs
> node --experimental-strip-types scripts/check-builder-docs.ts

Builder checks passed: 26 Markdown files, 275 local links/anchors, 38 public package imports. Named symbols are checked by npm run typecheck.
exit=0
```

```text
$ npm run typecheck

> arrokothi-agent-kernel@0.8.1 typecheck
> tsc --noEmit -p tsconfig.json

exit=0
```

```text
$ git diff --check 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 b40cfe968c8e0d2111a88df68c68f64fd02a4be3
docs/development/work/K0.1/implementation-04.md:227: trailing whitespace.
+[one trailing space omitted]
docs/development/work/K0.1/implementation-04.md:235: trailing whitespace.
+[one trailing space omitted]
exit=2
```

```text
$ git -c core.whitespace=-blank-at-eol diff --check 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 b40cfe968c8e0d2111a88df68c68f64fd02a4be3
exit=0
```

```text
$ git diff --check 012ca92574319aa099a91c845f8fb4375c081f34 b40cfe968c8e0d2111a88df68c68f64fd02a4be3
exit=0
```

```text
$ git diff --stat 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 b40cfe968c8e0d2111a88df68c68f64fd02a4be3
 docs/development/007-work-packets.md               |    2 +-
 docs/development/work/K0.1/contract.md             |  287 +++
 .../work/K0.1/evidence/round-3/01-builder-docs.txt |   15 +
 .../work/K0.1/evidence/round-3/02-typecheck.txt    |   14 +
 .../evidence/round-3/03-diff-check-cumulative.txt  |   10 +
 .../evidence/round-3/04-diff-stat-cumulative.txt   |   18 +
 .../evidence/round-3/05-diff-stat-correction.txt   |   15 +
 .../work/K0.1/evidence/round-3/06-status-clean.txt |   10 +
 .../K0.1/evidence/round-3/07-link-anchor-audit.txt |   17 +
 .../work/K0.1/evidence/round-3/README.md           |   36 +
 .../K0.1/evidence/round-3/link-anchor-audit.py     |   55 +
 docs/development/work/K0.1/implementation-01.md    |  127 ++
 docs/development/work/K0.1/implementation-02.md    |  109 +
 docs/development/work/K0.1/implementation-03.md    |  114 +
 docs/development/work/K0.1/implementation-04.md    |  436 ++++
 docs/development/work/K0.1/implementation-05.md    |  454 ++++
 docs/development/work/K0.1/implementation-06.md    |  490 ++++
 docs/development/work/K0.1/implementation-07.md    |  473 ++++
 docs/development/work/K0.1/implementation-08.md    |  472 ++++
 docs/development/work/K0.1/implementation-09.md    |  693 ++++++
 docs/development/work/K0.1/implementation-10.md    |  563 +++++
 docs/development/work/K0.1/protocol-worksheet.md   | 2383 ++++++++++++++++++++
 docs/development/work/K0.1/review-01.md            |  146 ++
 docs/development/work/K0.1/review-02.md            |  134 ++
 docs/development/work/K0.1/review-03.md            |  205 ++
 docs/development/work/K0.1/review-04.md            |  190 ++
 docs/development/work/K0.1/review-05.md            |  197 ++
 docs/development/work/K0.1/review-06.md            |  199 ++
 docs/development/work/K0.1/review-07.md            |  217 ++
 docs/development/work/K0.1/review-08.md            |   86 +
 docs/development/work/K0.1/review-09.md            | 1242 ++++++++++
 docs/development/work/K0.1/review-10.md            |  626 +++++
 32 files changed, 10034 insertions(+), 1 deletion(-)
exit=0
```

```text
$ git diff --stat 012ca92574319aa099a91c845f8fb4375c081f34 b40cfe968c8e0d2111a88df68c68f64fd02a4be3
 docs/development/007-work-packets.md             |   2 +-
 docs/development/work/K0.1/contract.md           |  13 +
 docs/development/work/K0.1/protocol-worksheet.md |  82 ++-
 docs/development/work/K0.1/review-10.md          | 626 +++++++++++++++++++++++
 4 files changed, 695 insertions(+), 28 deletions(-)
exit=0
```

```text
$ git status --porcelain
exit=0
```

```text
$ python3 docs/development/work/K0.1/evidence/round-3/link-anchor-audit.py
relative links checked : 405
resolved files         : 405
anchors verified       : 15
known forward refs     : 0 (implementation-03.md, written by the report commit H3)
unresolved files       : 0
bad anchors            : 0
RESULT: PASS
exit=0
```

```text
$ python3 /tmp/k01-r11-20260911/extra-links.py
Same-file anchors and K0.1 ledger links checked: 4
Unresolved paths/anchors: 0
exit=0
```

```text
$ python3 /tmp/k01-r11-20260911/preservation.py
Ancestor preserved: 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15
Ancestor preserved: 00b30eb333024f7093c5a1db122a3772ca2b8b04
Ancestor preserved: ab3dbd6781a2c59a8bd0dc6386d4f7875c76ae8b
Ancestor preserved: 7f68df367d05641dfdcfca932a1f4c533b5ace3d
Ancestor preserved: 012ca92574319aa099a91c845f8fb4375c081f34
Ancestor preserved: 5d726684f2911882c22762dcab61f001cd680847
Prior report/review/evidence blobs unchanged from H10: 28
Review-10 administrative blob unchanged
Contract after correction history: byte-identical (criteria and command plan included)
Worksheet sections 1-4, 6-10 and 12: byte-identical
W-1 structural rule, W-2 through W-5, W-8: byte-identical
H10..C11 scope: exactly review-10, K0.1 ledger, contract, worksheet
ADMIN..C11 scope: exactly contract and worksheet
Working tree: clean
exit=0
```

```text
$ python3 /tmp/k01-r11-20260911/consistency.py
PATTERN: `?WAITING`?\s+batch
1728: `WAITING` batch
1974: `WAITING` batch
2162: `WAITING` batch
PATTERN: (?:select\w*|reserv\w*|dispatch\w*)[^.\n]{0,55}`?WAITING`?
335: selected into a batch from a `WAITING`
344: selection rule from the `WAITING`
1728: selected the `WAITING`
1974: selected a `WAITING`
2378: selected while `WAITING`
PATTERN: `?WAITING`?[^.\n]{0,55}(?:select\w*|reserv\w*|dispatch\w*)
332: `WAITING` — no batch is selected
332: `WAITING` Execution is not dispatched
335: `WAITING` state, and the resulting dispatch
342: WAITING, select
1748: WAITING, select
1844: `WAITING` Execution is not dispatched, so there is nothing to select
2295: `WAITING` Execution is not dispatched and therefore selects
PATTERN: (?:consum\w*[^.]{0,80}registr\w*|registr\w*[^.]{0,80}consum\w*)
6: registration consumes
1981: consumes" an early result at registration
LIVE sections 1-12 WAITING-batch phrase matches: 0
Live early-result consumes-at-registration claim: absent
Search is textual evidence; contextual lifecycle review is recorded separately.
exit=0
```

The cumulative `git diff --name-only 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 b40cfe968c8e0d2111a88df68c68f64fd02a4be3`
also exited 0 and listed the same 32 paths as the cumulative stat above: only the ledger and K0.1
artifacts. H10..C11 contains exactly four files; the review-admin..C11 payload contains exactly the
two declared contract/worksheet files. No packages, tests, executable implementation or new evidence.
The existing link audit was run unchanged; its legacy forward-reference label reports **zero** forward
references, not a missing artifact. The extra audit covers same-file anchors and the ledger row.

**Search interpretation.** The three remaining literal WAITING-batch matches (1728, 1974, 2162)
are explicitly historical: revision-4's defect, the round-10 finding, and revision-5's history.
The broader live hits at 332–335 explicitly forbid selection/dispatch from WAITING. Lines 342–344
quote the canonical wait-side sentence and immediately reconcile it with READY selection; they do
not establish a second selector. The other hits are historical or explicit prohibitions. The
consumption hits at 6 and 1981 describe the removed defect. Live sections 1–12 have zero literal
WAITING-batch claims and no remaining consumes-at-registration claim. Text matching alone cannot
prove semantics; the scenario review and surrounding B-2/W-1/W-2/B-3 text supply that assessment.

## Reproducible temporary helper source

These helpers were stored outside the repository before C11 validation. Their full source is included
so the evidence does not depend on temporary-file retention. The existing main link-audit source is
already tracked in `evidence/round-3/link-anchor-audit.py`. No helper below implements the target
protocol or constitutes an executable K/E fixture.

### extra-links.py

```python
from pathlib import Path
import re
root = Path('docs/development/work/K0.1')
def slug(s):
    return re.sub(r'[^\w\s-]', '', s.replace('`', '').replace('*', '').strip().lower()).replace(' ', '-')
count = 0
for p in sorted(root.glob('*.md')) + [Path('docs/development/007-work-packets.md')]:
    text = p.read_text()
    if p.name == '007-work-packets.md':
        text = next(l for l in text.splitlines() if l.startswith('| K0.1 |'))
    for target in re.findall(r'\]\(([^)]+)\)', text):
        if target.startswith(('https://', 'http://')):
            continue
        if p.name != '007-work-packets.md' and not target.startswith('#'):
            continue
        path, _, anchor = target.partition('#')
        full = (p.parent / path) if path else p
        assert full.exists(), (p, target)
        if anchor:
            headings = re.findall(r'^#{1,6}\s+(.*)$', full.read_text(), re.M)
            assert anchor in [slug(h) for h in headings], (p, target)
        count += 1
print('Same-file anchors and K0.1 ledger links checked:', count)
print('Unresolved paths/anchors: 0')
```

### preservation.py

```python
from pathlib import Path
import re, subprocess
H10 = '012ca92574319aa099a91c845f8fb4375c081f34'
BASE = '6464be12c11eb75f7dfbc5ece12ca8d3020a5c15'
ADMIN = '5d726684f2911882c22762dcab61f001cd680847'
ROOT = 'docs/development/work/K0.1/'
def git(*args):
    return subprocess.check_output(['git', *args], text=True).strip()
for revision in [BASE, '00b30eb333024f7093c5a1db122a3772ca2b8b04',
                 'ab3dbd6781a2c59a8bd0dc6386d4f7875c76ae8b',
                 '7f68df367d05641dfdcfca932a1f4c533b5ace3d', H10, ADMIN]:
    subprocess.run(['git', 'merge-base', '--is-ancestor', revision, 'HEAD'], check=True)
    print('Ancestor preserved:', revision)
paths = git('ls-tree', '-r', '--name-only', H10, ROOT).splitlines()
count = 0
for path in paths:
    name = path.removeprefix(ROOT)
    if name.startswith(('review-', 'implementation-', 'evidence/')):
        assert git('rev-parse', H10 + ':' + path) == git('rev-parse', 'HEAD:' + path), path
        count += 1
print('Prior report/review/evidence blobs unchanged from H10:', count)
# Preserve the new review record as well.
assert git('rev-parse', ADMIN + ':' + ROOT + 'review-10.md') == git('rev-parse', 'HEAD:' + ROOT + 'review-10.md')
print('Review-10 administrative blob unchanged')
contract = ROOT + 'contract.md'
old = git('show', H10 + ':' + contract)
new = Path(contract).read_text()
assert old[old.index('## Identity'):] == new[new.index('## Identity'):].strip()
print('Contract after correction history: byte-identical (criteria and command plan included)')
worksheet = ROOT + 'protocol-worksheet.md'
old = git('show', H10 + ':' + worksheet)
new = Path(worksheet).read_text()
def section(text, n):
    return text.split('## ' + str(n) + '. ', 1)[1].split('\n## ', 1)[0]
for n in [1, 2, 3, 4, 6, 7, 8, 9, 10, 12]:
    assert section(old, n) == section(new, n), n
print('Worksheet sections 1-4, 6-10 and 12: byte-identical')
for start, end in [('**Well-formedness:', 'This rule determines'),
                   ('**Decision W-2', '**Decision W-6'),
                   ('**Decision W-8', '**Decision W-9')]:
    # W-1 loses its obsolete selection sentence only; compare the structural rule separately.
    if start == '**Well-formedness:':
        end = '### Eligibility while'
    assert old.split(start, 1)[1].split(end, 1)[0] == new.split(start, 1)[1].split(end, 1)[0]
print('W-1 structural rule, W-2 through W-5, W-8: byte-identical')
changed = git('diff', '--name-only', H10, 'HEAD').splitlines()
assert set(changed) == {'docs/development/007-work-packets.md', ROOT+'review-10.md', contract, worksheet}
assert set(git('diff', '--name-only', ADMIN, 'HEAD').splitlines()) == {contract, worksheet}
print('H10..C11 scope: exactly review-10, K0.1 ledger, contract, worksheet')
print('ADMIN..C11 scope: exactly contract and worksheet')
assert not git('status', '--porcelain')
print('Working tree: clean')
```

### consistency.py

```python
from pathlib import Path
import re
p = Path('docs/development/work/K0.1/protocol-worksheet.md')
s = p.read_text()
# Search all text, including line wraps; report excerpts with original line numbers.
patterns = [r'`?WAITING`?\s+batch',
    r'(?:select\w*|reserv\w*|dispatch\w*)[^.\n]{0,55}`?WAITING`?',
    r'`?WAITING`?[^.\n]{0,55}(?:select\w*|reserv\w*|dispatch\w*)',
    r'(?:consum\w*[^.]{0,80}registr\w*|registr\w*[^.]{0,80}consum\w*)']
for pattern in patterns:
    print('PATTERN:', pattern)
    for m in re.finditer(pattern, s, re.I):
        line = s.count('\n', 0, m.start()) + 1
        print(f'{line}: ' + ' '.join(m.group().split()))
# Sections 13 and revision history retain historical findings. The live 1-12 body has no such phrase.
live = s[s.index('## 1. '):s.index('## 13. ')]
n = len(re.findall(patterns[0], live, re.I))
print('LIVE sections 1-12 WAITING-batch phrase matches:', n)
assert n == 0
assert 'finds and consumes it' not in live
print('Live early-result consumes-at-registration claim: absent')
print('Search is textual evidence; contextual lifecycle review is recorded separately.')
```

## Limits and handoff

No tests were added, ported or removed. `npm test`, conformance/eval suites, live provider calls,
benchmarks, process-kill and isolation checks were not run: this is a documentation-only correction,
and those tests cannot prove the target worksheet's behavior. K0.2/E0 and later executable proof
remain **DEFERRED to their owning packets**, not passed. No new ambiguity was identified after the
corrections; independent review must still assess the cumulative candidate.

Third-party reuse: none. No dependency/service was introduced and no third-party source, test or asset
was copied, adapted or vendored. Existing prior-art references remain learning material and imply no
license clearance. Baseline/guides require no implementation update because no behavior shipped.

Review base..H11 cumulatively, H10..C11 for the correction, and C11..H11 for exactly this report plus
the K0.1 ledger row. Final push, remote SHA, H11 scope and clean-tree verification are supplied in the
handoff after H11 exists. No merge to main, release, self-acceptance or successor work is authorized
by this report. **K0.2 was not started.**
