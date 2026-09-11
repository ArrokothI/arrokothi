# Implementation report — K0.1, round 5 (correction)

## Identity and status

- Packet / parent milestone: **K0.1** / **K0**; [contract.md](contract.md) (corrected this round);
  worksheet [protocol-worksheet.md](protocol-worksheet.md) **Revision 5**.
- State: **WAITING_FOR_REVIEW**
- Correcting: [review-04.md](review-04.md)'s CHANGES REQUIRED outcome, findings **K01-R4-01 (P1)** and
  **K01-R4-02 (P2)**, against reviewed candidate H4 `a068e2f6c8d67e5e3e2512c765b29427acb4ac68`
  (payload C4 `2286106dfc8efc43a9f8758b2deaa6a7ddb64fa9`, base `6464be1`).
- Base commit (unchanged since round 1): `6464be12c11eb75f7dfbc5ece12ca8d3020a5c15`
- Reviewed candidates, all preserved and none rewritten: H `857fa05a8a72a4c6f4f294f9e775a0dc1f7919dc`,
  H2 `cc61e74455534abf896c46632246615185219b92`, H3 `aef1e33ba944a0647bb2319fb97ae40b18b05924`,
  H4 `a068e2f6c8d67e5e3e2512c765b29427acb4ac68`.
- Round-5 review record commit (adds [review-04.md](review-04.md); ledger → CHANGES_REQUESTED):
  `cef33136c13f311064dff55c76932a444fa2c9da`
- **Correction payload C5: `ab2ff6d16914edbf89dee24498140ef2a41a5689`**
- Candidate H5: the commit containing this report and the ledger status edit, and **nothing else**;
  full SHA supplied in the handoff (per 006, H cannot name itself).
- Branch / remote: `codex/k0.1-protocol-legacy-disposition` / `origin`
  (`https://github.com/ArrokothI/Agent_SDK.git`; GitHub reports it moved to
  `https://github.com/ArrokothI/agent-kernel.git` — the configured URL is deliberately left unchanged).
- Working tree: verified clean at C5 **before** validation ran; nothing was written into the repository
  afterwards. Round 5 adds **no** evidence file, directory or script.
- History: every prior commit, report, review and evidence artifact is preserved unedited — verified
  file by file in `09-history-preserved` below, including `implementation-04.md` byte-for-byte.

## Round-5 commit sequence

| Step | Commit | Contents |
|---|---|---|
| Administrative review record | `cef33136c13f311064dff55c76932a444fa2c9da` | `review-04.md` + the 007 K0.1 status row → `CHANGES_REQUESTED`. No payload. |
| Payload **C5** | `ab2ff6d16914edbf89dee24498140ef2a41a5689` | `contract.md` + `protocol-worksheet.md` only. |
| Final validation | — | Run against the clean C5 tree, after C5 existed. |
| Candidate **H5** | the commit containing this report | `implementation-05.md` + the 007 K0.1 status row → `WAITING_FOR_REVIEW`. Nothing else. |

## Findings — individual disposition

### K01-R4-01 (P1) — repair the wait contract cumulatively — **Fixed**

The sources named in the finding were re-read before editing: kernel.md's *Events and waits*;
execution-protocol.md's *Input reservation and acknowledgment* and *Wait registration, deadlines and
liveness*; 001's K0 and K1 sections; 007's K0.2, K1.1 and K1.3 rows; and current
`packages/core/src/execution/context.ts`, `interaction/event-envelope.ts`, `interaction/events.ts` and
`ports/controller.ts`. Every line number cited below was read at C5, not recalled.

| Sub-requirement | Where it is now satisfied | What changed |
|---|---|---|
| One unambiguous target wait representation | §5 **W-1** (the record), §3 **B-2** (selection), §5 **W-5** (what is *not* in it) | Revision 4 carried two target records at once — W-1's two lists, and W-5's singular `wake` plus `interleave`, with B-2 selecting by the second. There is now one record and one eligibility rule, and W-1 says so explicitly ("Nothing else is part of the record — in particular there is **no** third list, **no** separate `interleave` field (W-5) and **no** Runtime-local-work arm (W-4)"). |
| Record based on dependency alternatives + input subscriptions + optional deadline/generation | §5 **W-1** opening paragraph | The deadline (§4) and the generation identity (W-3) are now named as part of the record rather than left implicit; both were already required elsewhere in the worksheet. |
| Dependency alternatives NOT required to be non-empty | §5 **W-1** item 1 and the new **Well-formedness** paragraph | "a finite, enumerable list, **possibly empty**". The old sentence "An empty list is invalid: a wait must name what it waits for" is gone. |
| At least one eligible wake source across alternatives **+** subscriptions | §5 **W-1**, *Well-formedness: one eligible wake source across the two lists combined* | Valid iff `dependency alternatives + declared subscriptions ≥ 1`; neither list individually constrained; both-empty still invalid, with the reason given (a deadline bounds a wait, it is not the thing waited for — kernel.md's "optionally with a durable deadline", plus CL-1's three-clocks separation). |
| Permits the K0 trace's selective input-only wait | §5 **W-8**, §11 row 5 | W-8 walks 001's own K0 trace end to end and notes it is also 007 K0.2's fixture shape. |
| Dependency match ⇒ `READY` | §5 **W-1** item 1, eligibility rule | Unchanged in substance. |
| Application input eligible only via a declared subscription | §5 **W-1** eligibility rule; §11 row 5 | Restates kernel.md's "application-input waits require a declared subscription"; §11 row 5 now adds "whether or not the wait also names dependencies". |
| A subscribed input may be the sole reason for the wait | §5 **W-1** well-formedness; §5 **W-8** | This is the input-only wait, now first-class. |
| Any eligible wake retires the registration/generation ⇒ `READY` | §5 **W-1**, *Any eligible wake retires the registration* | New. Replaces revision 4's "the dependency stays outstanding" inside a still-live registration. |
| No persistent "dependency satisfied" flag | §5 **W-1**, same paragraph; §12 `REF-5` | Stated positively ("The Kernel records exactly two things...") and negatively (`REF-5` refuses `interleave` partly *because* it implies that flag). |
| Runtime re-registers what it still needs | §5 **W-1**; §5 **W-7** case 4; §5 **W-8** | "its **next Outcome registers that dependency again**, as a new registration under a new generation (W-3)". |
| No claim that a subscription wake proves an unrelated dependency settled | §5 **W-1**; §5 **W-7** case 4 | "**waking through a subscription is never evidence that an unrelated external dependency settled**". |
| B-2 selects by W-1's rule, not `wake` + `interleave` | §3 **B-2** | Rewritten; the old wording is quoted and explicitly withdrawn. |
| W-5 no longer defines `interleave` as a target field | §5 **W-5** | Reframed as current-0.8.x legacy/compatibility semantics, with exact current-code citations (`context.ts:102-108`, docstring `:79-100`, constructor `:132-134`; `controller.ts:86-92`, `:109`) and with the surviving principle folded into W-1. |
| Whole-worksheet sweep for target-semantic `wake` singular / `interleave` | §3, §5, §11, §12, §13 | Every remaining occurrence is now one of: a labelled description of current code, an explicit withdrawal of a prior target claim, or a revision-history entry. Checked by `grep`; the surviving set is listed under *Consistency pass* below. W-6 case 1's `await_event` was also corrected to the target Outcome vocabulary (`continue` / `await(wait)` / `complete(result)` / `fail(error)`). |
| §11 row 5 covers subscription-only input wait | §11 row 5 | Rewritten: names the combined-source rule, calls the subscription-only wait "a first-class registration a Runtime can express directly, not something it must fake a dependency to spell (W-8)", and states that the atomic check is not skipped merely because the dependency list is empty. |
| Deterministic K0-trace counterexample | §5 **W-8** (new) | Four numbered steps: registration (with the W-2 atomic check applying), unrelated `billing.question` input queued and unacknowledged, subscribed `continue` input waking and retiring the registration, and the next accepted Outcome permitted to `complete` — plus B-5's terminal disposition for the still-queued input. Closes with *What this rules out*, naming both defective spellings. |
| Existing child-result/correction examples preserved, correction expressed via subscriptions | §5 **W-7** cases 1–5 | Kept. Case 1 now points at `REF-5` for the record shape (and `MIG-5` for the matcher); case 4 is restated as retire-and-re-register and ends "no `interleave` field, because `correction` is a declared subscription in `W` itself (W-5)". |
| `MIG-5` = Migratable for ordinary correlated dependency matching | §12 `MIG-5` | Classification cell now reads "**Migratable** — for W-1's **dependency alternatives** only". |
| Do not claim `eventSatisfiesWake` unchanged builds both lists | §12 `MIG-5` | Revision 4's "exactly the primitive W-1 builds *both* of its lists from" is quoted and withdrawn. The reason is given with sources: a subscription selects by application-defined label, that label is in the body (`ExternalInputBody.label`, `packages/core/src/interaction/events.ts:334-337`), and `eventSatisfiesWake` reads only `event.kind` and `event.correlationId` (`event-envelope.ts:82-86`) — with the file's own deferral docstring (`:66-72`) cited as the source conceding it. |
| `REF-5` covers the `ExecutionWait.event` shape **including** legacy `interleave` | §12 `REF-5` | Record cell names the field explicitly with citations; the classification cell reads "the whole shape, `wake` and `interleave` together"; the reasoning has a dedicated **The `interleave` half is refused with it** paragraph. No fourth row was needed, so none was added. |
| Only Migratable / Legacy-only / Refused used | §12 | Verified mechanically — see *Consistency pass*. |
| No controller resumption or Runtime-local promise reintroduced as a Kernel wait | §5 **W-4** (untouched), §12 `LEG-1`/`REF-3` (untouched) | W-4 is byte-unchanged this round; the diff touches no part of it. |

**The counterexample the finding required to become impossible.** "Wait for application input
`label=continue`" now has exactly one spelling: dependency alternatives `[]`, declared input
subscriptions `[continue]`. It needs no fake dependency (the list is legitimately empty under W-1's
combined-source rule) and it does not over-match (eligibility is decided by the subscription, not by a
catch-all `external.input` alternative). W-8 case 2 is the explicit negative test: unrelated
`billing.question` input produces no wake and no acknowledgment.

### K01-R4-02 (P2) — correct PC-1's progress compatibility wording — **Fixed**

§9 **PC-1** no longer calls the current record "fully compatible" as a whole. Its form-(a) clause now
names the **nested `ControllerProgress.progress: JsonObject` payload**
(`packages/core/src/execution/context.ts:57-59`, with the "The kernel stores and returns `progress`
unchanged" docstring at `:53`) as the example, and says that it is that nested payload, not its
wrapper, which `MIG-3` classifies migratable. A new paragraph, *What form (a) does not claim about the
current wrapper*, quotes and withdraws revision 4's sentence and states the three facts the finding
asked for:

- `ControllerProgress` is a **closed two-arm union tagged `kind: "agent" | "workflow"`**
  (`context.ts:57-59`) and `ExecutionContext.control` (`context.ts:200`) stores that tagged wrapper,
  not a bare payload;
- the tag does **not** migrate unchanged — `LEG-4` classifies it legacy-only, 001's K1 section requires
  removing "closed Agent/Workflow progress discriminators from the new Kernel protocol", and 007's K1.1
  acceptance states "no Agent/Workflow discriminator in the new boundary";
- **K1 compatibility is determined through the pinned Runtime/definition/codec contract (PC-4), never
  through that two-value tag** — the pinned revision `ExecutionContext.definition` already tracks per
  Execution, kind-agnostically.

The recheck against the other three sources was done and recorded in both directions, so the four now
state one rule: `MIG-3`'s reasoning gained a sentence saying what migrates is the nested payload and
not the wrapper whose closed tag is `LEG-4`; and `LEG-4`'s reasoning gained a **Concordant sources**
clause naming 001 K1, 007 K1.1, PC-1's corrected form-(a) statement and `MIG-3`'s scope together.

## Consistency pass (required by [review-04.md](review-04.md))

| Check | Result |
|---|---|
| B-2, W-1…W-8, §11 row 5, `MIG-5`/`REF-5` and legacy `interleave` text describe **one** wait protocol | **PASS.** One record (W-1), one eligibility rule (W-1, applied by B-2), one classification of the current shape (`REF-5`) and of the matcher inside it (`MIG-5`), and `interleave` named only as legacy. |
| Surviving `interleave` / singular `wake` occurrences are all legacy-labelled or historical | **PASS.** After the edits they appear only in: B-2's explicit withdrawal; W-1's "no separate `interleave` field"; W-5 (entirely about current 0.8.x code and the withdrawal); W-7 case 1 (current record shape) and case 4's closing note; §12 `REF-5` and the §12 header note; §13's contradiction entry; and the Revision 3/4/5 history bullets. No target-semantic use remains. |
| PC-1, `MIG-3` and `LEG-4` describe **one** progress-compatibility protocol | **PASS**, and each now cites the other two plus 001 K1 / 007 K1.1. |
| No new fourth legacy-disposition label | **PASS.** The §12 classification column contains only **Migratable** (`MIG-1`…`MIG-5`), **Legacy-only** (`LEG-1`…`LEG-5`) and **Refused** (`REF-1`, `REF-3`, `REF-4`, `REF-5`); `LIM-1` remains outside the table in its own subsection, with zero table rows. Verified mechanically by splitting every `§12` row on unescaped `\|`. |
| E-7 / JCS untouched | **PASS.** No defect was found, so none was changed. The worksheet diff's first hunk after the revision marker begins at line 292 (§3), and §1 spans lines 26–230 — E-7 is outside every hunk. |
| No regression of previously fixed decisions | **PASS.** Spot-checked and diff-confirmed: ID-3/ID-9's "same Activation ID rather than minting a new one" (round 1); W-4's "no Runtime-local-work arm" (round 1); §8/`EF-1`'s K1 Effect refusal (round 1); `MIG-4`'s "NOT equivalent to the target's semantic `base_progress_revision`" (round 1); round-3's `LIM-1` placement and `LEG-5`; round-4's E-7 realignment and evidence/review-provenance records. §2, §6, §7, §8, §10 and §14 are untouched by this round's diff. |
| Scope not broadened | **PASS.** The correction delta touches `contract.md`, `protocol-worksheet.md` and `review-04.md` (plus the ledger row in the administrative commits). No `packages/`, no `tests/`, no canonical doc, no new packet. |

## Validation

All commands ran at **C5 `ab2ff6d16914edbf89dee24498140ef2a41a5689`** with the working tree verified
clean. Output was captured outside the repository and is reproduced verbatim below rather than copied
back in, per [review-03.md](review-03.md)'s K01-R3-03 and [review-04.md](review-04.md)'s round-5
process. **Round 5 added no evidence file, directory or script to the repository.**

- **cwd:** `/Users/rex-shih/Documents/Codex/projects/agent-kernel`
- **Environment:** Node `v25.2.1`, npm `11.6.2`, Python `3.13.5`, git `2.39.5 (Apple Git-154)`,
  Darwin `24.6.0 arm64` / macOS `15.7.9`, package `arrokothi-agent-kernel@0.8.1`, installed workspace
  dependencies.
- **UTC timestamp of the environment capture:** `2026-09-11T04:42:49Z`; every command below ran in the
  same session immediately after it, at the same HEAD.

### The `git diff --check` result, stated plainly

The cumulative hygiene gate under **default strict rules exits 2**, and this report does not present
that as a pass. Both flagged lines are `implementation-04.md:227` and `:235`, and both are a single
space — the blank **context** lines of the unified diff that round 4 reproduced verbatim, exactly as
review round 3 required. They are content, not accident, and `implementation-04.md` is a delivered,
reviewed report that is **not** edited to satisfy a hygiene check.

Per the historical-evidence exception now recorded in [contract.md](contract.md)'s command plan
(owner-approved before this validation ran), the gate is run three ways and all three are below:

| Run | Requirement | Result |
|---|---|---|
| `git diff --check <base> <C5>`, default strict rules | only already-known `blank-at-eol` lines inside immutable verbatim diff evidence | exit 2 — **exactly** `implementation-04.md:227` and `:235`, nothing else, no other whitespace class |
| `git -c core.whitespace=-blank-at-eol diff --check <base> <C5>` | **must pass** | exit 0 |
| `git diff --check <H4> <C5>` — this round's own delta | **must pass under the default strict rule, no exceptions** | exit 0 |

No repository configuration and no `.gitattributes` file was changed; the middle run is a command-line
override for that invocation only. New work is not granted the exception: the third run holds every
line this round added to the strict rule, and it passes.

### Criterion observations

| Criterion ID and source | Assertion / independent observation | Command and evidence | Observed result |
|---|---|---|---|
| K01-R4-01 ([review-04.md](review-04.md)) | One wait protocol across B-2, W-1…W-8, §11 row 5, `MIG-5`/`REF-5`; K0-trace input-only wait expressible; `interleave` legacy-only | Inspection of §3, §5, §11, §12, §13 at C5 + the `grep` sweep summarised above | **PASS** |
| K01-R4-02 ([review-04.md](review-04.md)) | PC-1, `MIG-3`, `LEG-4`, 001 K1 and 007 K1.1 state one rule | Inspection of §9 and §12 at C5 | **PASS** |
| K0.1 contract command plan, step 1 | `npm run check:builder-docs` passes unchanged | `01-builder-docs` | **PASS**, exit 0 |
| K0.1 contract command plan, step 2 | cumulative `git diff --check` under the recorded three-run form | `03a` / `03b` / `03c` | **PASS** under the recorded exception; see the table above for the exact split |
| K0.1 contract command plan, step 3 | K0.1 link/anchor audit passes | `07-link-anchor-audit`, `08-extra-links` | **PASS**, 0 unresolved files, 0 bad anchors |
| K0.1 contract command plan, step 4 | cumulative scope touches only `docs/development/` | `04-diff-stat-cumulative` | **PASS** — no `packages/`, no `tests/`, no canonical doc |
| K0.1 contract command plan, step 5 | `npm run typecheck` passes | `02-typecheck` | **PASS**, exit 0, no diagnostics |
| 006 history preservation | every prior report, review and evidence artifact byte-identical | `09-history-preserved` | **PASS** — nine checks, no diff |

**`npm test` was not run**, and is not required: this round changes documentation and review records
only. `04-diff-stat-cumulative` shows the full cumulative diff touching nothing under `packages/` or
`tests/`. No live model/provider call, process-kill fault injection, or E0–E6 benchmark run was
performed or is claimed.

### Raw output, reproduced verbatim

Each block is the complete unedited output of the command in its first line, captured at C5. The
`exit=` line is the shell's exit status for that command. One documented deviation is marked at
`03a`; every other block is byte-for-byte.

#### `00-env` — environment capture

```text
node    : v25.2.1
npm     : 11.6.2
python3 : Python 3.13.5
git     : git version 2.39.5 (Apple Git-154)
uname   : Darwin 24.6.0 arm64
sw_vers : macOS 15.7.9
package : arrokothi-agent-kernel@0.8.1
cwd     : /Users/rex-shih/Documents/Codex/projects/agent-kernel
HEAD    : ab2ff6d16914edbf89dee24498140ef2a41a5689
utc     : 2026-09-11T04:42:49Z
```

#### `01-builder-docs`

```text
$ npm run check:builder-docs

> arrokothi-agent-kernel@0.8.1 check:builder-docs
> node --experimental-strip-types scripts/check-builder-docs.ts

Builder checks passed: 26 Markdown files, 275 local links/anchors, 38 public package imports. Named symbols are checked by npm run typecheck.
exit=0
```

#### `02-typecheck`

```text
$ npm run typecheck

> arrokothi-agent-kernel@0.8.1 typecheck
> tsc --noEmit -p tsconfig.json

exit=0
```

#### `03a-diff-check-strict` — cumulative base..C5, default strict rules

```text
$ git diff --check 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 ab2ff6d16914edbf89dee24498140ef2a41a5689
docs/development/work/K0.1/implementation-04.md:227: trailing whitespace.
+
docs/development/work/K0.1/implementation-04.md:235: trailing whitespace.
+
exit=2
```

**The one deviation in this report.** `git diff --check` echoes each offending line, so the two `+`
lines above are literally `+` followed by one space (`0x2B 0x20`) in the real output. Reproducing those
two bytes here would put `blank-at-eol` into *this* report and propagate the very defect the exception
is meant to contain — so those two trailing spaces, and only those, are stripped in this reproduction.
The stripped bytes are precisely what the command is reporting, so nothing is hidden: the command's
own message names the file and line of each. Everything else in this block, and every other block in
this report, is byte-for-byte.

#### `03b-diff-check-noblankeol` — cumulative base..C5 with only the blank-at-eol rule disabled

```text
$ git -c core.whitespace=-blank-at-eol diff --check 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 ab2ff6d16914edbf89dee24498140ef2a41a5689
exit=0
```

#### `03c-diff-check-delta` — this round's own delta H4..C5, default strict rules, no exception

```text
$ git diff --check a068e2f6c8d67e5e3e2512c765b29427acb4ac68 ab2ff6d16914edbf89dee24498140ef2a41a5689
exit=0
```

#### `04-diff-stat-cumulative` — cumulative base..C5 scope

```text
$ git diff --stat 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 ab2ff6d16914edbf89dee24498140ef2a41a5689
 docs/development/007-work-packets.md               |    2 +-
 docs/development/work/K0.1/contract.md             |  177 +++
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
 docs/development/work/K0.1/implementation-02.md    |  109 ++
 docs/development/work/K0.1/implementation-03.md    |  114 ++
 docs/development/work/K0.1/implementation-04.md    |  436 +++++++
 docs/development/work/K0.1/protocol-worksheet.md   | 1217 ++++++++++++++++++++
 docs/development/work/K0.1/review-01.md            |  146 +++
 docs/development/work/K0.1/review-02.md            |  134 +++
 docs/development/work/K0.1/review-03.md            |  205 ++++
 docs/development/work/K0.1/review-04.md            |  190 +++
 20 files changed, 3046 insertions(+), 1 deletion(-)
exit=0
```

#### `05-diff-stat-correction` — correction delta H4..C5

```text
$ git diff --stat a068e2f6c8d67e5e3e2512c765b29427acb4ac68 ab2ff6d16914edbf89dee24498140ef2a41a5689
 docs/development/007-work-packets.md             |   2 +-
 docs/development/work/K0.1/contract.md           |  33 +++
 docs/development/work/K0.1/protocol-worksheet.md | 305 ++++++++++++++++++-----
 docs/development/work/K0.1/review-04.md          | 190 ++++++++++++++
 4 files changed, 468 insertions(+), 62 deletions(-)
exit=0
```

#### `06-status` — clean tree at C5

```text
$ git status --porcelain
exit=0
```

#### `07-link-anchor-audit` — K0.1 link/anchor audit

```text
$ python3 link-anchor-audit-r5.py   (run from repo root; script kept outside the repository)
relative links checked : 188
resolved files         : 170
anchors verified       : 12
known forward refs     : 18 (implementation-05.md, written by the report commit H5)
unresolved files       : 0
bad anchors            : 0
RESULT: PASS
exit=0
```

The link count rose from round 4's 134 to 188, a delta of 54 accounted for exactly: `review-04.md`
contributes 17 (it did not exist at C4), `implementation-04.md` contributes 16 (it exists in the tree
at C5 but was written by H4, so it was absent at C4), `protocol-worksheet.md` gained 18 and
`contract.md` gained 3. The 18 known forward references are the references to `implementation-05.md` —
this file, written by H5 — 16 from `protocol-worksheet.md` and one each from `contract.md` and
`review-04.md`.

**The script that ran.** `docs/development/work/K0.1/evidence/round-3/link-anchor-audit.py` is already
in the repository at H3 (SHA-256
`4713f621db707d80cfce3c3a9c43b11dfeffa2c4a3c973e7b4d2d7ebe107767a`). Round 5 must add no file to the
repository, so the round-5 variant ran from outside the working tree. It differs from the committed
script in exactly two places — the round number of the expected forward reference and its comment —
and nowhere else. Shown as explicit before/after line sets rather than a unified diff, so this report
introduces no blank context lines:

Lines 9–11, before:

```python
# implementation-03.md is written by the report commit (H3) that also carries this log,
# so at the payload commit (C3) it is a known forward reference, reported, not hidden.
FORWARD = {"implementation-03.md"}
```

Lines 9–11, after:

```python
# implementation-05.md is written by the report commit (H5); at the payload commit (C5) it is a
# known forward reference, reported, not hidden. Round 5 adds no evidence file to the repository.
FORWARD = {"implementation-05.md"}
```

Line 49, before:

```python
print(f"known forward refs     : {fwd} (implementation-03.md, written by the report commit H3)")
```

Line 49, after:

```python
print(f"known forward refs     : {fwd} (implementation-05.md, written by the report commit H5)")
```

The resulting file's SHA-256 is
`b8ddc4516b03d8f86e0a93a3277c7731e9f41c637c6f72f6f6314d8977b4e094`. A reviewer can reconstruct it
byte-identically by applying those two substitutions to the committed script and verifying the digest.

#### `08-extra-links` — same-file anchors and 007 ledger links

The audit script skips same-file `#anchor` targets and only walks `docs/development/work/K0.1/`, so the
worksheet's subsection anchor and the edited 007 status row were checked separately:

```text
$ python3 - (same-file anchors and 007 K0.1-row links; neither is covered by the audit script)
same-file anchor #reference-implementation-limitations-not-a-legacy-disposition -> OK
007 K0.1-row link work/K0.1/review-04.md -> OK
007 K0.1-row link work/K0.1/implementation-04.md -> OK
007 K0.1-row link work/K0.1/review-01.md -> OK
007 K0.1-row link work/K0.1/review-02.md -> OK
007 K0.1-row link work/K0.1/review-03.md -> OK
007 K0.1-row link work/K0.1/evidence/round-3/ -> OK
exit=0
```

#### `09-history-preserved` — every prior report, review and evidence artifact untouched

Each check diffs a path against the commit that introduced it. No diff printed means byte-identical.
`implementation-04.md` is included deliberately: the `03a` result above is *not* resolved by editing it.

```text
$ git diff --stat <introducing commit> HEAD -- <path>     (no diff printed = byte-identical)
--- review-01.md  (introduced in 4d47638)
--- review-02.md  (introduced in ca06599)
--- review-03.md  (introduced in 6738884)
--- review-04.md  (introduced in cef3313)
--- implementation-01.md  (introduced in 857fa05)
--- implementation-02.md  (introduced in cc61e74)
--- implementation-03.md  (introduced in aef1e33)
--- implementation-04.md  (introduced in a068e2f)
--- evidence/round-3/  (introduced in aef1e33)
exit=0  (no section above printed a diff)
```

## Interpretation and decisions

- **Why this candidate satisfies the correction request.** K01-R4-01 and K01-R4-02 have separate
  dispositions above, the first broken out sub-requirement by sub-requirement against the finding's own
  bullet list, with the exact worksheet location for each. Neither is collapsed into "addressed."
- **Why W-1 retires the registration rather than tracking satisfaction.** The finding forbade inventing
  a persistent "dependency satisfied" flag, and the alternative had to be stated positively or the
  worksheet would simply have a hole where the semantics belong. Retire-on-wake plus re-registration is
  the minimum that works: it needs no per-alternative Kernel state, it is already how W-3's generations
  behave, and it makes the honest statement the finding demanded — the Kernel knows a registration
  ended, not that some external dependency settled. The Runtime's observable experience is unchanged,
  because it re-reports the same alternatives either way.
- **Why no fourth `REF-` row for `interleave`.** The finding allowed splitting one but did not require
  it, and the field only ever exists *inside* the record `REF-5` already refuses — it is not separately
  adoptable. Folding it into `REF-5` with its own paragraph satisfies the mandatory clause ("`REF-5`
  must explicitly cover... including its optional legacy `interleave` field") without adding a row that
  would have no independent subject.
- **Why W-8 is a new decision rather than a sixth W-7 case.** W-7 is one scenario (P with children C1
  and C2); the K0 trace is a different Execution with a different shape, and the finding asked for the
  exact trace. Keeping them separate also keeps W-7's five cases preserved unedited in substance, which
  the finding required.
- **The `git diff --check` conflict was surfaced, not absorbed.** The gate's failure is a real
  collision between two things this packet was told to do — reproduce raw output verbatim in tracked
  Markdown, and keep the cumulative diff whitespace-clean. It was put to the owner rather than resolved
  unilaterally, because all three obvious fixes had a cost (editing a reviewed report, changing repo
  config, or shipping a red gate). The recorded resolution is deliberately the narrowest one: the
  exception reaches only lines already committed in a reviewed report, it is not a config change, and
  this round's own delta is held to the strict rule and passes.
- **Roadmap deviations:** none. No scope, gate or acceptance requirement was weakened. The contract
  change this round is the command-plan exception above, which *adds* two required runs (`03b`, `03c`)
  rather than removing one.
- **Reviewer focus for this round:** **W-1's retire-on-wake paragraph against W-3 and W-2.** It is the
  only genuinely new Kernel-behaviour statement this round, and the question worth attacking is whether
  retiring a registration on a subscription wake loses anything a Runtime needed — specifically whether
  W-2's atomic check at the *re-registration* recovers a dependency result that arrived between the
  wake and the next Outcome. (The worksheet's answer is W-6 cases 3–4: the result is a durable mailbox
  fact and the new registration's atomic check finds it. Worth testing rather than taking on trust.)
  Then §12 `MIG-5`'s narrowed scope: whether "dependency alternatives only" is the right cut, or
  whether even that overstates what a matcher with no body access can do.
- **Known limitations:** unchanged in kind. This worksheet still cannot be validated against running K1
  behaviour, because K1 does not exist; W-8 is a specification of a trace, not a passing fixture, and
  K0.2 owns the fixture that would exercise it. The wait-protocol repair is verified by reading the
  canonical sources and the current code, not by executing anything.
- **Third-party source / dependency / service:** **none added.** No code, test material or asset was
  copied, adapted or vendored, no dependency or service was introduced, and `package.json` is untouched
  (`04-diff-stat-cumulative`). Round 4's RFC 8785 / ECMA-262 citations are unchanged and no new external
  document was relied on this round; the sources read for this round are all repository-internal.
- **Prior review findings — each ID → correction evidence.** Round 4: K01-R4-01 → Fixed (§3 B-2; §5
  W-1, W-5, W-7 cases 1/4, new W-8; §11 row 5; §12 `MIG-5`/`REF-5` and header note; §13); K01-R4-02 →
  Fixed (§9 PC-1; §12 `MIG-3`, `LEG-4`). Round 3's K01-R3-01..04, round 2's K01-R2-01..06 and round 1's
  K01-REV-01..05 remain fixed as recorded in [implementation-04.md](implementation-04.md),
  [implementation-03.md](implementation-03.md) and [implementation-02.md](implementation-02.md); the
  consistency pass above re-checked them and none regressed. No finding across any round remains
  unresolved or partially resolved.

## Handoff

- Ready for independent review at candidate H5 (SHA supplied in the handoff message; base `6464be1`,
  H `857fa05`, H2 `cc61e74`, H3 `aef1e33`, H4 `a068e2f`, round-5 review record `cef3313`, payload C5
  `ab2ff6d16914edbf89dee24498140ef2a41a5689`).
- `git diff --stat ab2ff6d <H5>` is verified in the handoff message to contain exactly
  `docs/development/work/K0.1/implementation-05.md` and `docs/development/007-work-packets.md`, which
  is the entirety of the declared administrative material for this candidate.
- No self-acceptance. K0.2 and every later packet remain unstarted and unreleased.
