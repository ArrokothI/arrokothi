# Implementation report — K0.1, round 12

## Identity and status

- Packet **K0.1**, parent **K0**; [contract](contract.md), [worksheet](protocol-worksheet.md)
  **Revision 12**. State: **WAITING_FOR_REVIEW**, not accepted.
- Owner authorization: the complete Round-12 correction instructions recorded in
  [review-11.md](review-11.md). This continues the existing K0.1 bootstrap release only.
- Integration base: `6464be12c11eb75f7dfbc5ece12ca8d3020a5c15`.
- Reviewed **H11: `9202571f21e97a51c119b0324f3d279f8772ca9c`**.
- Previous validated **C11: `b40cfe968c8e0d2111a88df68c68f64fd02a4be3`**.
- Review-11 administrative commit: **`78f628bb4d30405314e3a2437b22e64e29c45219`**.
- Clean-validated **C12: `7a51801afcdf5c13d481e92c5d219a8c9be7c0eb`**.
- **H12 convention:** the commit containing this report and only the K0.1 ledger-row update.
  Its full SHA and the verified remote advertisement are supplied in the final handoff; this avoids
  a self-referential SHA and does not claim a push result before that push occurs.
- Branch: `codex/k0.1-protocol-legacy-disposition`.
- Current configured origin: `https://github.com/ArrokothI/agent-kernel.git` (fetch and push).
  No remote configuration was changed. The delivered reviewer report's historical origin name is
  reproduced unchanged; this checkout's origin already uses the requested repository name.
- Initial HEAD was exact H11 with a clean tree. Before C12 validation, remote branch advertisement
  was independently checked and still matched H11. Local reviewed history is preserved, with no
  amend, rebase, force push or merge.
- Final payload validation ran **after C12 was committed**, with a clean working tree at its start
  and end. No tracked evidence files or scripts were added. H12 contains administrative material only.

## Scope, precedence and provenance

The administrative commit adds review-11 and changes only the K0.1 ledger row to CHANGES_REQUESTED.
It reproduces the owner-delivered Claude Opus 5 review dated 2026-09-11 verbatim, including its stated
reviewer role, inspected/rerun evidence, C1/C2/C5 FAIL and C3/C4/C6 PASS, and CHANGES REQUIRED verdict.
The complete owner correction instructions follow it. Owner-supplied supplemental findings are
separately labelled and never attributed to Claude. Exact inclusion of both delivered texts was
checked. No unrelated schedule-surface/live-tail review was incorporated.

C12 changes **only contract and worksheet**. H12 changes **only this report and the K0.1 ledger row**.
No runtime, packages, tests, scripts, dependencies, canonical architecture, benchmark or prior evidence
was changed. No executable target behavior is claimed. **K0.2 remains PLANNED and unreleased.**

This is Kernel protocol work. Governing reads: AGENTS.md and its arrokothi-architecture skill;
docs/README, mental-model, kernel, execution; execution-protocol, recovery-and-compatibility and
evidence-and-observability; development 001, 006, 007 and 008; contract, full normative worksheet,
implementation-11 and the delivered review. Architecture/detail design govern, not current code.
Read-only migration evidence includes harness.ts cancellation checks at 747–757 and 953–965, its
unconditional `control: outcome.control` at 1119, and cancellation-request.ts's pending/applied record.

Kernel Recovery and cancellation says accepted cancellation fences further progress; Recovery and
compatibility's Cancellation and operational recovery says the fence is immediate at the accepted
boundary. Those owners, plus all-or-nothing Outcome acceptance, decide the target. The review's
suggested alternative of overriding only next state is not adopted. No higher-priority source requires
a 1 MiB cap on a complete Activation/Outcome; a search across canonical owners and detail design
found no such numeric restriction. E-1's existing per-value scope is clarified as instructed.
No unresolved canonical conflict or new architecture choice was identified.

## Finding dispositions

| Finding / provenance | Correction in C12 |
|---|---|
| K01-R11-01, Claude, P2 | CX-1/CX-2 order by cancellation request acceptance. CX-6 rejects the entire losing Outcome with cancellation/terminal-conflict classification and a fixed reason, no acknowledgment/progress/emissions/Effect intents/wait/deadline/readiness/next-state mutation. Exact retry returns its recorded rejection; OA-2 applies only to an already-accepted Outcome. OA-3/OA-4 order validation and commit atomically against cancellation; OA-5, B-3/B-5, §11 rows 3/7/8 and M-1 agree. MIG-1 retains only safe-boundary/pending-control mechanics; REF-6 refuses losing-progress installation. |
| K01-R11-02, Claude, P3 | B-8 includes both a live WAITING generation and a generation created and retired in its registration transaction. Rows 1–4, W-3 and readiness lifetime remain unchanged. |
| K01-R11-03, Claude, P3 | ID-6 now points to the six boundaries enumerated in ID-7. |
| K01-R11-04, Claude, P3 | B-4 distinguishes ordinary READY candidates from candidates eligible under the retired wait when consuming wait-ended readiness. Dependent references in contrast row 6, W-7 case 3, W-8 case 2 and §11 row 6 align. B-2 selection is unchanged. |
| K01-O12-01, owner supplement, P2 | E-6 recursively defines scalar depth 0, empty-container depth 1, and non-empty-container depth 1 + max child-value depth; names add no level. Exact A32/A33 and alternating object/array examples remove off-by-one ambiguity. |
| K01-O12-02, owner supplement, P2 | E-6 explicitly bounds decoded string values and object member names at 65,536 Unicode scalars before escaping/UTF-8 serialization. Key sorting remains E-7's separate UTF-16 comparison. Exact 65,536/65,537-name cases supplied. |
| K01-O12-03, owner supplement, P2 | E-1/E-6 and contract C2 identify each E-1 boundary-value root as the independent canonical-size unit. Siblings are not summed. The 700 KiB + 700 KiB case and exactly/over-1-MiB Event payload cases have explicit answers. No aggregate message/wire-size guarantee added. |

**Implementer-discovered issues:** none separate from these seven findings. The broad duplicate
assertion and retained-input examples are dependent occurrences of R11-01/R11-04, respectively.
REF-6 is the required migration split for R11-01, not a new independent finding or fourth label.
The worksheet revision marker, §13 ledger, revision history and contract correction history distinguish
Claude and owner findings explicitly.

## Adversarial cross-check

Before committing C12, searched the current worksheet and contract for every requested term:
`cancel`, `cancellation`, `pending`, `applied`, `terminal`, `discarded`, `Outcome`, `acknowledge`,
`progress`, `emission`, `B-3`, `B-5`, `CX-`, `OA-`, `MIG-1`, `depth`, `nesting`, `deepest scalar`,
`string field`, `string length`, `member name`, `object key`, `65,536`, `canonical envelope`,
`canonical size`, `boundary value`, `1,048,576`, `1 MiB`, `bounded value`.
The case-insensitive line search found 403 lines (380 worksheet, 23 contract), repeated on clean C12.
The `rg -n -i` command uses the same pattern/paths as the recorded `rg -c -i` command below; its full
output was kept temporarily outside Git while reviewing surrounding normative sections.

Contextual interpretation: cancellation acceptance fences progress even with pending physical work;
rejection recording is not Runtime progress acceptance; terminal disposition is not acknowledgment;
late external evidence retains its separate owner. OA-2 and §11 row 3 now explicitly refer to an
already-accepted Outcome. Historical discussions of superseded rules in §13/revision history remain
historical. The remaining phrase "canonical envelope size" in E-7 is explicitly a quotation of
Round 2's old problem, not the operative bound. E-6 and C2 have only the per-root accounting rule.
No live deepest-scalar, string-field-only, applied-time ordering, next-state-only discard, or
MIG-1 no-behavioral-change claim remains. These are implementer document checks, not executed K1 tests.

| Case | Final answer / decision |
|---|---|
| A. Cancellation accepted while A RUNNING, then A submits continue | CX-6 rejection; no reserved Event acknowledged, no progress or emissions accepted, no Effect intent or transition. Cancellation wins; B-5 dispositions at CANCELLED. |
| B. Same, A submits complete | Same full rejection and fixed reason; no partial commit, no installed result/progress, no reopened lifetime. |
| C. Complete accepted first, then cancellation | Normal atomic acceptance stands; terminal completion cannot reopen. An exact accepted-Outcome retry returns its original OA-2 receipt without new mutation. |
| D. Cancel first, exact losing-Outcome retry | Return the same recorded cancellation/terminal-conflict classification and cancellation-accepted-before-Outcome-acceptance reason. Never an acceptance receipt or later acceptance. |
| E. 32 nested empty arrays | A1 is []; A32 wraps it in 31 singleton arrays, exactly 32 bracket pairs. Depth 32: PASS. |
| F. 33 nested empty arrays | A33 has 33 bracket pairs. Depth 33: REJECT. Alternating containers have the same count. |
| G. Object name of 65,536 Unicode scalars | PASS for decoded string length, subject to every other bound. The one-member a-repetition/null example is 65,545 canonical bytes. Supplementary scalars still count once each. |
| H. Object name of 65,537 Unicode scalars | REJECT before acceptance, irrespective of ordering or transport escaping. |
| I. Progress about 700 KiB and emissions field about 700 KiB | Not rejected solely for aggregate Outcome size over 1 MiB. Every E-1 root is checked independently, with all structural/schema/string/entry/depth bounds still required. |
| J. Event payload exactly 1,048,576 canonical bytes | PASS for size if otherwise valid. For example, an array of 15 strings of 65,536 ASCII a characters and one of 65,487 has 1,048,527 content bytes + 32 quotes + 15 commas + 2 brackets = 1,048,576, with 16 entries and depth 1. |
| K. Event payload one byte over | REJECT before acceptance. Increasing the final string in J by one character yields 1,048,577 canonical bytes while the string, entry and depth bounds still pass. |

Additional order checks: continue accepted first then cancellation preserves accepted progress and
its receipt; cancellation after wait retirement before reservation suppresses the Activation; pending
native interruption does not grant another progress write; a later malformed/current/stale Outcome
cannot bypass the terminal fence. Existing bound-1 timeout/result ordering, result-before-wait and
source-category rules retain their prior answers.

## Preservation and criterion observations

Mechanically compared all 30 prior report/review/evidence blobs present at H11, plus review-11's
administrative blob: unchanged. H11/base/admin are ancestors of C12. Admin..C12 is exactly the two
payload files. Protected byte comparisons cover E-7/JCS; §4 clocks; §8 Effect refusal; §9 progress;
§10 policy; B-6/B-7; readiness lifetime; W-1 through W-6 and W-9; MIG-5/REF-5. B-1/B-2's algorithm is
unchanged; its contrast row 6 only changes its B-4 selection citation. ID-3/ID-4 takeover identity and
Event-only batching remain unchanged. Contract from Identity onward differs only in C2's root wording.
These checks preserve the existing Runtime-local-promise, routing, timeout and historical-whitespace
rules; no target lifecycle state or classification label is added.

| Criterion | Implementer observation, not independent acceptance |
|---|---|
| C1 | §11 cancel/terminal/duplicate rows now specify observable full rejection or accepted-receipt results. |
| C2 | CX-6 resolves cancellation; E-6 has total depth and explicit string/size units and roots. |
| C3 | MIG-1/REF-6 classify current mechanics against the target; other classifications preserved. |
| C4 | No new entity, lifecycle, wire codec or store; per-root sizing adds no aggregate transport restriction. |
| C5 | §13 records each contradiction and resolution, with reviewer/owner attribution kept distinct. |
| C6 | Revision 12 and rule citations align; the existing and supplemental link/anchor audits pass. |

## Validation on clean C12

Date: 2026-09-11, Asia/Taipei. Working directory for every command below:
`/Users/linzhenglin/Desktop/ArrokothAI/agent-kernel`.
Environment versions appear in the raw outputs. No installations, repository configuration changes
or dependency changes were needed.

**Historical-whitespace exception:** strict cumulative `git diff --check base C12` exited **2**,
not green, with exactly the two already-approved immutable blank-at-EOL findings at
`implementation-04.md:227` and `:235`. Only that historical class is disabled in the second cumulative
command, which exited 0. The strict H11..C12 delta exited 0 **with no exception**. The historical
files remain byte-for-byte unchanged. In the output reproduction only the two `+ ` lines are
rendered as `+[one trailing space omitted]` to avoid creating another trailing-whitespace finding.
All other command output below is reproduced as observed; no output means empty stdout/stderr.

```text
$ git status --porcelain
exit=0
```

```text
$ node --version
v26.8.1
exit=0
```

```text
$ npm --version
11.19.0
exit=0
```

```text
$ python3 --version
Python 3.13.7
exit=0
```

```text
$ git --version
git version 2.39.5 (Apple Git-154)
exit=0
```

```text
$ uname -sm
Darwin arm64
exit=0
```

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
$ git diff --check 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 7a51801afcdf5c13d481e92c5d219a8c9be7c0eb
docs/development/work/K0.1/implementation-04.md:227: trailing whitespace.
+[one trailing space omitted]
docs/development/work/K0.1/implementation-04.md:235: trailing whitespace.
+[one trailing space omitted]
exit=2
```

```text
$ git -c core.whitespace=-blank-at-eol diff --check 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 7a51801afcdf5c13d481e92c5d219a8c9be7c0eb
exit=0
```

```text
$ git diff --check 9202571f21e97a51c119b0324f3d279f8772ca9c 7a51801afcdf5c13d481e92c5d219a8c9be7c0eb
exit=0
```

```text
$ python3 docs/development/work/K0.1/evidence/round-3/link-anchor-audit.py
relative links checked : 411
resolved files         : 411
anchors verified       : 15
known forward refs     : 0 (implementation-03.md, written by the report commit H3)
unresolved files       : 0
bad anchors            : 0
RESULT: PASS
exit=0
```

```text
$ python3 /tmp/k01-r12/extra-links.py
Same-file anchors and K0.1 ledger links checked: 4
Unresolved paths/anchors: 0
exit=0
```

```text
$ git diff --stat 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 7a51801afcdf5c13d481e92c5d219a8c9be7c0eb
 docs/development/007-work-packets.md               |    2 +-
 docs/development/work/K0.1/contract.md             |  301 +++
 .../work/K0.1/evidence/round-3/01-builder-docs.txt |   15 +
 .../work/K0.1/evidence/round-3/02-typecheck.txt    |   14 +
 .../evidence/round-3/03-diff-check-cumulative.txt  |   10 +
 .../evidence/round-3/04-diff-stat-cumulative.txt   |   18 +
 .../evidence/round-3/05-diff-stat-correction.txt   |   15 +
 .../work/K0.1/evidence/round-3/06-status-clean.txt |   10 +
 .../K0.1/evidence/round-3/07-link-anchor-audit.txt |   17 +
 .../work/K0.1/evidence/round-3/README.md           |   36 +
 .../K0.1/evidence/round-3/link-anchor-audit.py     |   55 +
 docs/development/work/K0.1/implementation-01.md    |  127 +
 docs/development/work/K0.1/implementation-02.md    |  109 +
 docs/development/work/K0.1/implementation-03.md    |  114 +
 docs/development/work/K0.1/implementation-04.md    |  436 ++++
 docs/development/work/K0.1/implementation-05.md    |  454 ++++
 docs/development/work/K0.1/implementation-06.md    |  490 ++++
 docs/development/work/K0.1/implementation-07.md    |  473 ++++
 docs/development/work/K0.1/implementation-08.md    |  472 ++++
 docs/development/work/K0.1/implementation-09.md    |  693 ++++++
 docs/development/work/K0.1/implementation-10.md    |  563 +++++
 docs/development/work/K0.1/implementation-11.md    |  427 ++++
 docs/development/work/K0.1/protocol-worksheet.md   | 2511 ++++++++++++++++++++
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
 docs/development/work/K0.1/review-11.md            |  918 +++++++
 34 files changed, 11521 insertions(+), 1 deletion(-)
exit=0
```

```text
$ git diff --stat 9202571f21e97a51c119b0324f3d279f8772ca9c 7a51801afcdf5c13d481e92c5d219a8c9be7c0eb
 docs/development/007-work-packets.md             |   2 +-
 docs/development/work/K0.1/contract.md           |  16 +-
 docs/development/work/K0.1/protocol-worksheet.md | 230 ++++--
 docs/development/work/K0.1/review-11.md          | 918 +++++++++++++++++++++++
 4 files changed, 1113 insertions(+), 53 deletions(-)
exit=0
```

```text
$ git diff --name-only 9202571f21e97a51c119b0324f3d279f8772ca9c 7a51801afcdf5c13d481e92c5d219a8c9be7c0eb
docs/development/007-work-packets.md
docs/development/work/K0.1/contract.md
docs/development/work/K0.1/protocol-worksheet.md
docs/development/work/K0.1/review-11.md
exit=0
```

```text
$ git status --porcelain
exit=0
```

```text
$ python3 /tmp/k01-r12/preservation.py
Ancestor preserved: 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15
Ancestor preserved: 9202571f21e97a51c119b0324f3d279f8772ca9c
Ancestor preserved: 78f628bb4d30405314e3a2437b22e64e29c45219
Prior report/review/evidence blobs unchanged: 30
Review-11 administrative blob unchanged
H11..admin: exactly review-11 and ledger
admin..C12: exactly contract and worksheet
E-7/JCS; clocks; B-1/B-2 algorithm; B-6/B-7 and readiness lifetime; W-1..W-6/W-9; Effects/progress/policy; MIG-5/REF-5 preserved
Contract after history unchanged except C2 accounting-root wording
Working tree: clean
exit=0
```

```text
$ rg -c -i 'cancel|cancellation|pending|applied|terminal|discarded|Outcome|acknowledge|progress|emission|B-3|B-5|CX-|OA-|MIG-1|depth|nesting|deepest scalar|string field|string length|member name|object key|65,536|canonical envelope|canonical size|boundary value|1,048,576|1 MiB|bounded value' docs/development/work/K0.1/protocol-worksheet.md docs/development/work/K0.1/contract.md
docs/development/work/K0.1/contract.md:23
docs/development/work/K0.1/protocol-worksheet.md:380
exit=0
```

All required C12 checks completed on the committed payload. The existing link audit was used
unchanged; its legacy forward-reference label reports zero missing future reports. The supplemental
audit checks same-file anchors and the actual K0.1 ledger links. No tracked evidence file was added
after validation.

Remote preflight (separate from C12 payload checks): the initial sandboxed `git ls-remote` failed with
exit 128, `Could not resolve host: github.com`. Retrying with approved network access succeeded:

```text
$ git ls-remote origin refs/heads/codex/k0.1-protocol-legacy-disposition
9202571f21e97a51c119b0324f3d279f8772ca9c	refs/heads/codex/k0.1-protocol-legacy-disposition
exit=0
```

## Reproducible temporary audit sources

These helpers were created outside the repository before C12 validation; their sources are included
here so validation does not depend on temporary-file retention. They inspect documentation and Git
objects only; they are not K0.2 fixtures or runtime tests. Run preservation.py against C12, not H12,
because it deliberately asserts admin..HEAD contains only the payload.

### preservation.py

```python
from pathlib import Path
import subprocess
H11='9202571f21e97a51c119b0324f3d279f8772ca9c'
BASE='6464be12c11eb75f7dfbc5ece12ca8d3020a5c15'
ROOT='docs/development/work/K0.1/'
def git(*a): return subprocess.check_output(['git',*a],text=True).strip()
ADMIN=git('rev-parse',H11+'^0') # Resolve the first new administrative child on this linear history below.
commits=git('rev-list','--reverse',H11+'..HEAD').splitlines()
ADMIN=commits[0]
for rev in [BASE,H11,ADMIN]:
 subprocess.run(['git','merge-base','--is-ancestor',rev,'HEAD'],check=True)
 print('Ancestor preserved:',rev)
count=0
for path in git('ls-tree','-r','--name-only',H11,ROOT).splitlines():
 name=path.removeprefix(ROOT)
 if name.startswith(('review-','implementation-','evidence/')):
  assert git('rev-parse',H11+':'+path)==git('rev-parse','HEAD:'+path),path
  count+=1
print('Prior report/review/evidence blobs unchanged:',count)
assert git('rev-parse',ADMIN+':'+ROOT+'review-11.md')==git('rev-parse','HEAD:'+ROOT+'review-11.md')
print('Review-11 administrative blob unchanged')
assert set(git('diff','--name-only',H11,ADMIN).splitlines())=={ROOT+'review-11.md','docs/development/007-work-packets.md'}
assert set(git('diff','--name-only',ADMIN,'HEAD').splitlines())=={ROOT+'contract.md',ROOT+'protocol-worksheet.md'}
print('H11..admin: exactly review-11 and ledger')
print('admin..C12: exactly contract and worksheet')
old=git('show',H11+':'+ROOT+'protocol-worksheet.md');new=Path(ROOT+'protocol-worksheet.md').read_text()
def section(t,n): return t.split('## '+str(n)+'. ',1)[1].split('\n## ',1)[0]
for n in [4,8,9,10]: assert section(old,n)==section(new,n),n
for a,b in [('**Decision E-7','## 2.'),('**Decision B-1','**Decision B-3'),('**Decision B-6','**Decision B-8'),('**Lifetime, consumption','## 4.'),('**Decision W-1','**Decision W-7'),('**Decision W-9','## 6.')]:
 x=old.split(a,1)[1].split(b,1)[0];y=new.split(a,1)[1].split(b,1)[0]
 # B-1/B-2 semantics unchanged; only contrast row 6 cites selection rather than promising ordinary eligibility.
 if a=='**Decision B-1':
  x=x.replace('it is an ordinary candidate for a later batch (B-4), or takes a terminal disposition (B-5)','it remains queued for later selection under B-2/B-4, or takes a terminal disposition (B-5)')
 assert x==y,a
for prefix in ['| MIG-5 |','| REF-5 |']:
 assert next(l for l in old.splitlines() if l.startswith(prefix))==next(l for l in new.splitlines() if l.startswith(prefix))
print('E-7/JCS; clocks; B-1/B-2 algorithm; B-6/B-7 and readiness lifetime; W-1..W-6/W-9; Effects/progress/policy; MIG-5/REF-5 preserved')
a=git('show',H11+':'+ROOT+'contract.md');b=Path(ROOT+'contract.md').read_text()
a=a[a.index('## Identity'):].replace('"canonical envelope bytes"','"canonical bytes of each E-1 boundary-value root"')
b=b[b.index('## Identity'):].strip()
assert a==b
print('Contract after history unchanged except C2 accounting-root wording')
assert not git('status','--porcelain')
print('Working tree: clean')
```

### extra-links.py

```python
from pathlib import Path
import re
root=Path('docs/development/work/K0.1')
def slug(s): return re.sub(r'[^\w\s-]','',s.replace('`','').replace('*','').strip().lower()).replace(' ','-')
count=0
for p in sorted(root.glob('*.md'))+[Path('docs/development/007-work-packets.md')]:
 text=p.read_text()
 if p.name=='007-work-packets.md': text=next(l for l in text.splitlines() if l.startswith('| K0.1 |'))
 for target in re.findall(r'\]\(([^)]+)\)',text):
  if target.startswith(('https://','http://')): continue
  if p.name!='007-work-packets.md' and not target.startswith('#'): continue
  path,_,anchor=target.partition('#');full=p.parent/path if path else p
  assert full.exists(),(p,target)
  if anchor: assert anchor in [slug(h) for h in re.findall(r'^#{1,6}\s+(.*)$',full.read_text(),re.M)],(p,target)
  count+=1
print('Same-file anchors and K0.1 ledger links checked:',count)
print('Unresolved paths/anchors: 0')
```

## Limits and handoff

No tests were added, modified or removed. `npm test` was not run because this is documentation-only
and no packages/tests/runtime changed; it would not exercise the target protocol. No benchmark,
provider, live model, fault-kill or isolation gate ran. K0.2/E0 fixtures and K1+ executable proof remain
with their owning unreleased packets; document consistency and successful typechecking are not proof
that target cancellation/limits have shipped. Baseline/guides need no implementation update.
Third-party source, dependency, service or asset reuse: none introduced; no license adoption claim.

Review base..H12 cumulatively, H11..C12 for this correction, admin..C12 for its two-file payload and
C12..H12 for exactly this report plus the ledger row. The final handoff supplies H12's full SHA,
post-push advertised SHA, clean-tree state and verified scopes. Push is fast-forward only; no merge,
ACCEPTED status, release or successor work is performed. Ready for independent review, not accepted.
