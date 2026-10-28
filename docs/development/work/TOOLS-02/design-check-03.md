# TOOLS-02 — design check 03

**Verdict: APPROVED WITH REQUIRED CHANGES (D03-CHK-01).**

- Reviewer: Codex GPT-6 session, independently checking the design at the owner's request,
  2026-10-23 (America/New_York).
- Checked branch and revision: `claude/tools-02-design-03`,
  `d7635be5b8c93b930225cb1eeb8a78586fe49575`. The branch's existing worktree was clean before review.
- Contract: [brief 01](brief-01.md), T2-4, as amended by [owner choice 02](owner-choice-02.md).
  Subject: [design 03](design-03.md); prior finding: [design check 02](design-check-02.md), D02-CHK-05.
- Scope: T2-4 only. Range 1, T2-3, T2-5's approved triage design, and other approved parts are not reopened.
  This is design approval subject to the completion below, not implementation acceptance or a release.

The change belongs to repository evidence tooling. It changes no Kernel, Runtime/Driver or deployment
contract. The architecture/development front doors, the evidence owner, 006, 012, 017 and the research
reading map supplied context; the conclusions below use the pinned repository documents and source.

## Contract disposition

| Obligation | Result and evidence |
|---|---|
| Close D02-CHK-05 under the owner's refined claim | **PASS at design level.** Owner choice 02 explicitly replaces automatic scope classification with `unread`, carrying neither credit nor a per-entry limit. The incidental-wrapper, hook and child-attribution counterexamples no longer cause a false L-01 or `not_held` classification because the environment classifier is removed. Its observation controls are not requirements for this replacement. |
| No released hold remains active | **PASS at design level.** The four claims are marked released; the release paths are fixed; `corpus` rejects `held` under those claims. `unread` must name the appropriate release and no limit. This implements the amended T2-4; it does not restore the brief's superseded requirement to classify core versus wrapper now. |
| No credit from the conversion | **PASS at design level.** Members become `unread`; targets remain refused by P1-H; the detector trace admits credit only through `not_held` with a reading and the existing P1-P/P1-T checks. Keeping registry attribution kinds is valid: `claim_attribution` at `scripts/packet_tools.py:172–180` assigns both kinds `semantic_credit: none`. A reading remains a source-review obligation, not a claim that a nonempty string proves semantics. |
| Preserve witness closures | **PASS at design level for the stated route.** `witness_records` and `origin_closure` gain the matching `unread_witness` route. Preserve witness IDs, origins, required results, claims and members, and the existing wrong-status, wrong-claim and missing-link refusals. This retains closure without granting behavior/target credit. The migration must also cover the separate C2-LIMIT consumer below. |
| The migration composes with every affected corpus consumer | **FAIL as specified: D03-CHK-01.** The cascade omits `limited_origins`, which still requires active rule-1 holds. This is a direct dependency of the T2-4 conversion, not a request to redesign T2-5. |
| Current-claim reporting | **PASS at design level.** L-17 and the replacement BASELINE sentence distinguish unread evidence from released claims. Recount at range 3's C and keep V-ENV's release scoped to the core. Neither this check nor the design has shipped those edits. |

## D03-CHK-01 — Complete the unread cascade through C2-LIMIT

**Required change to design 03 §1's cascade and §4's controls.** `corpus_format_2` calls
`limited_origins` at `scripts/packet_tools.py:804`, after witness/closure checks. Updating the four named
functions alone cannot make the proposed migration pass `corpus`:

- `limited_origins`'s `rule_1_held` predicate at lines 638–641 recognizes a listed member only with status
  `held`, claim V-ENV and `decision == VENV_RECORD` (owner choice 08). An `unread` listed member with the
  BINDING-01 release decision drops out of the unbound set at lines 703–706. The equality against the
  pinned lists then fails, even though the member has earned no credit.
- The extra-target route at lines 697–701 requires register classification `held`, that same old decision,
  and the exact P1-H refusal for `held`. The designed `unread` entry and `unread` refusal fail this guard.

These are populated paths at the checked revision. The four limited origins contain **32 listed held
members** (12 dispatch, 18 kernel-landing-zone, one evidence-records, one values) and **21 extra-target
routes** (12 dispatch, eight kernel-landing-zone, one values). The member lists and transfers already
exist; the design needs to preserve their accounting through the status change.

**Completion:** specify how those existing listed members and extra-target routes remain uncredited and
accounted for after the released V-ENV entries become `unread`. Bind the replacement predicate to the
released V-ENV claim and its fixed release record. Preserve the pinned-list/digest and origin checks,
one-target mapping, literal-title requirement, exact P1-H-only refusal and set equality. Do not restore
an active owner-choice-08 hold, drop the listed members, accept an unrelated unread claim, or count all
unread members as new exceptions. C2-LIMIT's transfer accounting is distinct from the proposed semantic
register class `limit` and from assigning an entry L-01.

Add controls for both paths, preserving the limited member identities/counts and zero credit. Their
negative cases must still reject an unrelated claim/release, missing or duplicate target, and an extra
P1-T refusal. The baseline below passes; changing only the status/decision/refusal to the proposed
values reproduces both failures. Carry these probes into the build's maintained controls.

Run from the checked worktree:

```sh
PYTHONPATH=tests/tooling python3 -B - <<'PY'
from test_transfer_limits import LimitTests, tool
release = 'docs/development/work/BINDING-01/hold-release-01.md'
for mode in ('extra', 'listed'):
    x = LimitTests()
    x.setUp()
    try:
        if mode == 'listed':
            x.members['m.listed'].update(status='held', file='f.test.ts', current=[1, 3])
            x.register['f.test.ts:1:3'] = {
                'classification': 'held', 'claim': 'V-ENV', 'decision': tool.VENV_RECORD}
        print(mode, 'before:', x.limit())
        if mode == 'extra':
            x.register['f.test.ts:5:3'].update(classification='unread', decision=release)
            x.results[0]['refused'] = [tool.P1H_TARGET_REFUSAL.format('unread')]
        else:
            x.members['m.listed']['status'] = 'unread'
            x.register['f.test.ts:1:3'].update(classification='unread', decision=release)
        try:
            print(mode, 'after:', x.limit())
        except tool.CheckError as error:
            print(mode, 'after REFUSED:', error)
    finally:
        x.doCleanups()
PY
```

Observed: both baselines returned `{'o.limited': {'listed': 1, 'extras': ['m.extra']}}`.
The extra conversion was refused with `an extra limited member's target passes P1-T at a rule-1 held
leaf: m.extra`; the listed conversion was refused with `the refused members without a credited target
differ from the limit: o.limited (unlisted [], bound ['m.listed'])`. These exercise the current consumer,
not an implementation of design 03 or a full corpus run.

## Answer to design 03 §5

**I recommend omitting the executable `limit` class from range 3 until an entry needs it.** Keep the
written rule that a later semantic-limit classification needs a per-entry reading and a current 017
mapping. No current entry needs that transition, and owner choice 02 requires no readings here.

It costs more than one check. `preserved_table` currently recognizes only `held` and `superseded` as
register-imposed member statuses (`scripts/packet_tools.py:2569–2583`); design 03 adds `unread` but gives no member/witness cascade
for `limit`. `witness_records` and `origin_closure` likewise need a defined route before a limit member
can safely retain closure. Those paths and their controls would have to accompany an executable class.
Documenting the future reading requirement already prevents an unread entry from being presented as
L-01. Deferral is proportionate; it does not change L-01 or the owner's permission to classify an entry
when a later packet reads it. This is the requested scope recommendation, not a second blocking finding
against the current all-unread migration.

## Validation and review boundary

- Independently counted the pinned adoption manifest: **966 entries** (965 held, one superseded), including
  891 V-ENV entries (804 registrations and 87 cases), 41 held Proxy entries, 21 V-D1 entries and 12
  re-prototyped-built-in entries. There are **1,013 held members**, **542 held witness records** and **15
  complete origins linking those witnesses**. The manifest bytes equal those at design 01's B
  `b5daf35aeee37305c1ee41bb626c97d26db94ab2`, so design 03's measurements check out. Other member statuses
  are 30 preserved, 228 refused and one superseded; these are measurements, not newly awarded credit.
- Inspected `hold_register`, `intrinsic_trace`, `witness_records` and `origin_closure`, plus their direct
  schema, census, target-refusal, registry-attribution and limited-origin consumers. There are no current
  family `witness` routes; future use of `unread_witness` there must also respect `member_route`'s kind check.
- Ran `PYTHONPATH=tests/tooling python3 -B -m unittest test_intrinsic_trace.IntrinsicTraceTests test_closure_tools.ClosureTests test_transfer_limits.LimitTests`:
  **47 tests passed**. These validate the inspected existing consumers, not the proposed new statuses.
  Ran the two migration probes above and inspected the source/delta and local Markdown links.
- Full verify, the mutation/refusal registries and product suites were **not run**: this is a documentation
  design check with no range-3 implementation. Their candidate-bound execution remains a build/review
  obligation. No code, fixture, owner record, current claim or historical evidence was changed by this check;
  no third-party source or dependency was incorporated.

D02-CHK-05 is settled under owner choice 02. Complete D03-CHK-01 before building the range-3 migration;
no further classifier redesign or owner amendment is required by this finding.
