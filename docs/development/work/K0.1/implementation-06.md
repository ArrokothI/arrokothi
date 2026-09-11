# Implementation report — K0.1, round 6 (correction)

## Identity and status

- Packet / parent milestone: **K0.1** / **K0**; [contract.md](contract.md) (corrected this round);
  worksheet [protocol-worksheet.md](protocol-worksheet.md) **Revision 6**.
- State: **WAITING_FOR_REVIEW**
- Correcting: [review-05.md](review-05.md)'s CHANGES REQUIRED outcome, findings **K01-R5-01 (P1)** and
  **K01-R5-02 (P2)**, against reviewed candidate H5 `d0dbc4800c10dad68a8b4b6c662bf90c963fd926`
  (payload C5 `ab2ff6d16914edbf89dee24498140ef2a41a5689`, base `6464be1`).
- Base commit (unchanged since round 1): `6464be12c11eb75f7dfbc5ece12ca8d3020a5c15`
- Reviewed candidates, all preserved and none rewritten: H `857fa05a8a72a4c6f4f294f9e775a0dc1f7919dc`,
  H2 `cc61e74455534abf896c46632246615185219b92`, H3 `aef1e33ba944a0647bb2319fb97ae40b18b05924`,
  H4 `a068e2f6c8d67e5e3e2512c765b29427acb4ac68`, H5 `d0dbc4800c10dad68a8b4b6c662bf90c963fd926`.
- Round-6 review record commit (adds [review-05.md](review-05.md); ledger → CHANGES_REQUESTED):
  `35e7de50dc2091d925f918c14c3b2bc5ee62ba0b`
- **Correction payload C6: `4a015b316d604f501a9895e85c627b7d0ba0edfd`**
- Candidate H6: the commit containing this report and the ledger status edit, and **nothing else**;
  full SHA supplied in the handoff (per 006, H cannot name itself).
- Branch / remote: `codex/k0.1-protocol-legacy-disposition` / `origin`
  (`https://github.com/ArrokothI/Agent_SDK.git`; GitHub reports it moved to
  `https://github.com/ArrokothI/agent-kernel.git` — the configured URL is deliberately left unchanged).
- Working tree: verified clean at C6 **before** validation ran; nothing was written into the repository
  afterwards. Round 6 adds **no** evidence file, directory or script.
- History: every prior commit, report, review and evidence artifact is preserved unedited — verified
  file by file in `09-history-preserved` below, including `implementation-04.md` byte-for-byte.

## Round-6 commit sequence

| Step | Commit | Contents |
|---|---|---|
| Administrative review record | `35e7de50dc2091d925f918c14c3b2bc5ee62ba0b` | `review-05.md` + the 007 K0.1 status row → `CHANGES_REQUESTED`. No payload. |
| Payload **C6** | `4a015b316d604f501a9895e85c627b7d0ba0edfd` | `contract.md` + `protocol-worksheet.md` only. |
| Final validation | — | Run against the clean C6 tree, after C6 existed. |
| Candidate **H6** | the commit containing this report | `implementation-06.md` + the 007 K0.1 status row → `WAITING_FOR_REVIEW`. Nothing else. |

## Findings — individual disposition

### K01-R5-01 (P1) — make wake-derived READY preserve the wait eligibility rule through the next dispatch — **Fixed**

The finding was right, and the defect was exactly as described: W-1 retires the registration on any
eligible wake, so by dispatch time the Execution is always `READY`; with only two cases in B-2, the
ordinary `READY` rule ("all currently unacknowledged Events in acceptance order") governed every
wake-triggered dispatch, and an older **ineligible** Event could take the batch slot the wake Event
needed. The sources named in the finding were re-read at C6 before editing: execution-protocol.md's
*Input reservation and acknowledgment* and *Wait registration, deadlines and liveness*; kernel.md's
*Events and waits* and its Acceptance/atomicity table; and worksheet B-1/B-2/B-4, W-1/W-2/W-3/W-7/W-8
and §11 row 5.

| Sub-requirement from the finding | Where it is now satisfied | What it says |
|---|---|---|
| Retire the wait/generation exactly as W-1 already requires | §5 **W-1** (unchanged rule), §3 **`B-6`** step 1 | `B-6`'s accepting transaction "retires the wait registration and its generation, exactly as W-1 requires — no live wait remains." |
| Make the Execution `READY` | §3 **`B-6`** step 2 | Unchanged from W-1; restated as part of the single transaction. |
| Preserve enough accepted/recoverable readiness to apply the retired wait's eligibility rule to the next dispatch | §3 **`B-6`** step 3 | Recorded "as part of the **recoverable readiness** the acceptance boundary already commits alongside next state," quoting kernel.md's Acceptance/atomicity table and execution-protocol.md's acceptance step 4 — an existing committed field, not a new one. |
| Next dispatch MUST include at least one Event eligible under the retired wait | §3 **B-2** middle case; §3 **`B-6`** *What it does* | "The batch **must** contain at least one Event eligible under the retired rule." |
| Next dispatch MUST NOT let older ineligible backlog displace it | §3 **B-2** middle case; §5 **W-8 case 4** | "older **ineligible** backlog **must not** displace it — including when the bound is 1." |
| Select that batch only from Events eligible under the retired rule, in acceptance order among eligible Events, subject to the normal bound | §3 **B-2** middle case | Stated verbatim in those terms, with the bound named as the same implementation-owned maximum. |
| Unrelated backlog remains queued/unacknowledged under B-4 | §3 **B-2** middle case; §5 **W-8 case 4** | "Ineligible Events stay queued and unacknowledged (B-4)"; W-8 case 4 adds that it is not acknowledged by the Outcome ending that exchange (B-3). |
| After the wake-triggered exchange is reserved, ordinary `READY` rules resume unless another wait is registered | §3 **`B-6`** *Lifetime — exactly one exchange* | "consumed when that Activation's batch is reserved," then ordinary `READY` (B-2's first case) "unless that exchange's accepted Outcome registers another wait." |
| Do not reintroduce a live wait after retirement | §3 **`B-6`** *What this is not* → "Not a revived wait, and not a second wait type" | The retired generation stays dead and a timer naming it is still a no-op (W-3); no new lifecycle state, wait record or Kernel entity. |
| Do not invent a persistent per-alternative "satisfied" flag | §3 **`B-6`** *What this is not* → second bullet | "What survives is the **selector** … not a record of which alternative matched, and not any claim about whether external work settled. W-1's prohibition stands unchanged." |
| Recoverable readiness / batch-selection semantics, not another Kernel entity | §3 **`B-6`** *What this is not* → third bullet, and *Recovery* | "a property of readiness … not an object with its own identity and lifecycle"; committed with the Outcome so a crash between acceptance and dispatch cannot downgrade it — execution-protocol.md's "Never rely on an unjournaled enqueue after commit." |
| Leave the exact storage representation implementation-owned | §3 *Left open (implementation-owned)* | Flag-plus-selector-copy, retained-registration pointer, or materialized eligible set are all named as conforming; K0.1 fixes only which Events the next batch may and must contain, and that it survives a crash. |
| **B-2** distinguishes (1) ordinary `READY` from (2) wake-triggered `READY` | §3 **B-2** | Rewritten as three cases; a *Why the middle case is load bearing* paragraph states the defect, names W-7 case 5 and W-8 case 3 as the contradicted decisions, and quotes execution-protocol.md's "with an eligible wake included before unrelated backlog." |
| **W-1/W-2** cover the case where the Event was already present at the atomic check | §5 **W-1** retire-on-wake paragraph; §5 **W-2** | W-2 gains a paragraph: the `READY` outcome of the atomic check "is a *wake-triggered* readiness, not an ordinary one," and without that the result-before-wait race "would be 'fixed' only in the weakest sense." `B-6` specifies its two creation paths (i) and (ii) identically for this reason. |
| **W-7 cases 4/5** point to the rule rather than asserting the batch | §5 **W-7** cases 4 and 5 | Case 4: "it is **`B-6`** that makes 'the next batch' contain it rather than this example simply asserting so." Case 5: "**by `B-6`** and B-2's wake-triggered case, not by assumption." |
| **W-8** points to the rule | §5 **W-8** case 3 | Now derives the batch from `B-6` + B-2's middle case and notes that "without `B-6` … case 4 below would go the wrong way." |
| Load-bearing deterministic case (bound = 1) | §5 **W-8 case 4** (new; old case 4 renumbered to 5) | X `WAITING` on `{continue}`; older ineligible `billing.question` queued; `continue` accepted and wakes X; at bound 1 the single slot goes to `continue`, never `billing.question`; `billing.question` stays queued and unacknowledged; after the exchange, ordinarily `READY` again and acceptance-order handling resumes. Stated explicitly as failing under revision 5's two-case B-2 and passing under the three-case rule. Also summarised in `B-6`'s *Deterministic case*. |
| §11 row 5 observable assertion | §11 row 5 | Now contains, verbatim: "**an older unmatched Event cannot displace the Event that woke the wait from the wake-triggered next batch**" — with the mechanism (selected only from Events eligible under the retired rule, at least one of them, at every bound including 1) and the resumption of ordinary readiness afterwards. |
| Consistent with the canonical detail-design rule | §3 B-2 *Why the middle case is load bearing*; §13 | Both quote execution-protocol.md's sentence in full and explain that it is phrased from the `WAITING` side because it predates W-1's retire-on-wake refinement, so `B-6` carries its guarantee across the retirement rather than amending it. §13 records the resolution "in the Kernel's favour." |

### K01-R5-02 (P2) — state one exact dependency-alternative selector grammar — **Fixed**

Revision 5 described a dependency alternative twice and differently — "its kind (set membership)
and/or its correlation identity" in W-1 item 1, then "compared by equality over envelope identity,
kind, correlation and declared-subscription name" three paragraphs later. §5 **W-1** now carries one
grammar, under the heading *The dependency-alternative selector grammar (exact)*, which quotes and
supersedes both.

| Sub-requirement from the finding | How it is stated |
|---|---|
| Use the canonical dimensions kernel.md already names | A three-row table — **Event identity** (exact envelope identity), **Kind** (one kind or a finite kind set), **Correlation** (one correlation identity) — introduced as "each a canonical dimension kernel.md already names," quoting "Conditions use envelope identity/kind/correlation, not arbitrary code or model-text predicates." |
| Each supplied "when supplied" | "One alternative supplies **any non-empty subset** of exactly three optional selector fields"; "A field the alternative does not supply places no constraint." |
| Conjunction over every supplied field | "**Within one alternative, every supplied field must match: the combinator is conjunction (AND).**" |
| At least one of identity/kind/correlation supplied; no match-everything empty alternative | "**At least one of the three must be supplied.** An alternative supplying none would match every Event addressed to the Execution; that match-everything alternative is **invalid**, not a shorthand" — tied back to the over-matching spelling W-8 rejects. |
| Finite list, ANY-OF only | "**Between alternatives the only combinator is ANY-OF**, over the finite list in item 1"; item 1 itself keeps "finite, enumerable list." |
| No predicate/query/model-text condition | "**Every comparison is equality** … no ordering or range comparison, no prefix, glob or regular expression, no negation, no arbitrary predicate, callback, query language or model-text condition, and no field outside the three above. In particular an Event's **payload/body is not selectable at all**." |
| Subscription matching kept separate | A dedicated paragraph: subscriptions "are not dependency alternatives and do not use this grammar"; the label/name selection "is **not** a fourth selector field, and putting a label into a dependency alternative is not a way to spell a subscription." |
| W-1 item 1 and the later restatement reconciled | Item 1 now defers to the grammar; the old looser sentence is replaced by "Both lists therefore stay pure declarative, serializable data, compared only by the equalities this grammar fixes (for alternatives) and by declared-subscription identity (for subscriptions)." |

`MIG-5` is reconciled with the grammar, point by point:

- **Migratable unchanged as the kind/correlation matching component.** The classification cell reads
  "**Migratable** — unchanged, as the **kind/correlation matching component** of W-1's
  dependency-alternative grammar." The reasoning shows the match is exact, not approximate:
  `wake.eventKinds` is a finite kind set tested by membership and `wake.correlationId` is tested by
  equality, with an unsupplied field (`eventKinds: []`, `correlationId: null`) placing no constraint —
  "the grammar's 'conjunction over supplied fields' rule already written out in four lines"
  (`event-envelope.ts:82-86`). For an alternative constraining only kind and/or correlation it is the
  **complete** target matcher.
- **Not the complete target dependency matcher when exact Event identity is constrained.** Stated
  under *What it is not*: "`WakeCondition` has no identity field and `eventSatisfiesWake` never
  compares `event.eventId`."
- **Target exact Event-ID matching is an additional ordinary equality check, not a new language.**
  "That gap is closed by **an additional ordinary equality check** — one more supplied-field comparison
  in the same conjunction — **not** by a new matching language, a predicate or a query construct; the
  grammar's whole point is that every dimension is an equality."
- **The subscription-label statement is retained**, verbatim in substance and with its citations
  (`ExternalInputBody.label` at `packages/core/src/interaction/events.ts:334-337`; the matcher reading
  only `event.kind` and `event.correlationId` at `event-envelope.ts:82-86`; the source's own deferral
  docstring at `:66-72`).
- **One thing the reconciliation surfaced that the finding did not ask for, recorded because it is a
  real K1 obligation:** the current type *permits* the input the grammar forbids — `eventKinds: []`
  with `correlationId: null` supplies no field and matches every Event addressed to the Execution — so
  `MIG-5` now states that K1 must **reject** it rather than inherit it as a shorthand.

`REF-5` was rechecked alongside and gained one sentence: the current record "carries **no
Event-identity selector field**, so it cannot express the identity dimension of W-1's selector grammar
at all," plus an explicit note of the asymmetry the `MIG-5`/`REF-5` split records — a good matcher
inside a record that still cannot hold W-1's two lists. §11 row 5 now summarises the grammar in its
Decisions/assertion cell so a fixture author reading only §11 gets the same rule.

## Cumulative consistency pass (required by [review-05.md](review-05.md))

| Check | Result |
|---|---|
| **One batch-selection protocol** (B-1/B-2/B-4, plus new `B-6`) | **PASS.** B-2 is the only decision that selects a batch; `B-6` supplies the input B-2's middle case consumes, B-1 fixes the batch's representation and B-4 the fate of what is excluded. Mechanically checked: the phrase "acceptance order" appears six times, and only the two occurrences inside B-2 are selection rules — the others are a W-1 cross-reference to B-2, W-8 case 4's counterfactual, §13's quotation of B-2's superseded text, and §6's unrelated cancellation-ordering sentence. |
| **One wait protocol** (W-1…W-8, §11 row 5, `MIG-5`/`REF-5`) | **PASS.** One record (W-1), one eligibility rule (W-1, applied by B-2), one retirement rule (W-1 + `B-6`), one classification of the current shape (`REF-5`) and of the matcher in it (`MIG-5`). `interleave` remains legacy-only (W-5) and W-4's no-Runtime-local-wait rule is untouched. |
| **One selector grammar** | **PASS.** W-1's grammar is the only description of what an alternative may constrain; the previously conflicting restatement is replaced, and §11 row 5 and `MIG-5`/`REF-5` all refer to the same three fields. |
| PC-1 / `MIG-3` / `LEG-4` | **PASS, unchanged.** Round 5 reconciled them; §9 and those two rows are outside every hunk of this round's diff, and re-reading them against 001 K1 and 007 K1.1 found nothing to change. |
| §13 contradiction ledger | **PASS.** Both round-5 defects are entered with their resolutions, and the closing "no contradiction found" bullet is updated to four self-inflicted internal inconsistencies, noting that the last two were each a consequence of a correct earlier correction not carried through to every dependent decision. |
| No fourth legacy-disposition label | **PASS.** The §12 classification column contains only **Migratable** (`MIG-1`…`MIG-5`), **Legacy-only** (`LEG-1`…`LEG-5`) and **Refused** (`REF-1`, `REF-3`, `REF-4`, `REF-5`); `LIM-1` remains outside the table with zero rows. Verified mechanically by splitting each row on unescaped `\|`. |
| E-7 / JCS untouched | **PASS.** No defect was independently discovered, so nothing changed. §1 spans worksheet lines 28–226 and the diff's first hunk after the revision marker begins at line 293. |
| Activation-ID takeover identity not regressed | **PASS.** §2 is untouched by this round's diff; ID-9's "advances the writer epoch under the **same** Activation ID rather than minting a new one" is present and unmodified. |
| Runtime-local promises not reintroduced as Kernel waits | **PASS.** W-4 is untouched; "no Runtime-local-work arm" is present and unmodified, and `B-6` explicitly introduces no new wait type. |
| K1 Effect-refusal boundary unaltered | **PASS.** §8 is untouched; `LEG-5`'s "K1 still refuses all Effects" scope note is unmodified. |
| Generic `revision` not equated with `base_progress_revision` | **PASS.** `MIG-4` is untouched; its "NOT equivalent to the target's semantic `base_progress_revision` without redefinition" stands. |
| Accepted historical-evidence whitespace exception not reopened | **PASS.** `implementation-04.md` is byte-identical (`09-history-preserved`), the command-plan exception text in `contract.md` is unmodified, and this round's only `contract.md` change is the round-5 entry in the correction history. |
| Scope not broadened | **PASS.** The correction delta touches `contract.md`, `protocol-worksheet.md` and `review-05.md` (plus the ledger row in the administrative commits). No `packages/`, no `tests/`, no canonical doc, no new packet. |

One incidental hygiene fix is recorded rather than left silent: the Revision 3, 4 and 5 entries in the
worksheet's revision history each still said "(this document)", a marker that is only true of the
newest entry. All three were corrected and only Revision 6 now carries it. This changes no decision.

## Validation

All commands ran at **C6 `4a015b316d604f501a9895e85c627b7d0ba0edfd`** with the working tree verified
clean. Output was captured outside the repository and is reproduced verbatim below rather than copied
back in. **Round 6 added no evidence file, directory or script to the repository.**

- **cwd:** `/Users/rex-shih/Documents/Codex/projects/agent-kernel`
- **Environment:** Node `v25.2.1`, npm `11.6.2`, Python `3.13.5`, git `2.39.5 (Apple Git-154)`,
  Darwin `24.6.0 arm64` / macOS `15.7.9`, package `arrokothi-agent-kernel@0.8.1`, installed workspace
  dependencies.
- **UTC timestamp of the environment capture:** `2026-09-11T07:25:39Z`; every command below ran in the
  same session immediately after it, at the same HEAD.

### The three-way `git diff --check` plan

Run exactly as recorded in [contract.md](contract.md)'s command plan, which
[review-05.md](review-05.md) accepted and which this round does not reopen:

| Run | Requirement | Result |
|---|---|---|
| `git diff --check <base> <C6>`, default strict rules | may report **only** the already-approved immutable `implementation-04.md` blank-at-EOL exceptions | exit 2 — **exactly** `implementation-04.md:227` and `:235`, nothing else, no other whitespace class |
| `git -c core.whitespace=-blank-at-eol diff --check <base> <C6>` | **must exit 0** | exit 0 |
| `git diff --check <H5> <C6>` — this round's own delta | **must exit 0, no exception** | exit 0 |

No repository configuration and no `.gitattributes` file was changed; the middle run is a command-line
override for that invocation only. This report contains **no unified-diff context lines**, so it adds
nothing to the exception — the one place a `diff -u` block would have appeared (the audit-script
difference) is rendered as explicit before/after line sets instead.

### Criterion observations

| Criterion ID and source | Assertion / independent observation | Command and evidence | Observed result |
|---|---|---|---|
| K01-R5-01 ([review-05.md](review-05.md)) | Wake-derived `READY` selects only from Events eligible under the retired wait's rule, must include one, and cannot be displaced by older ineligible backlog at any bound | Inspection of §3 B-2/`B-6`, §5 W-1/W-2/W-7/W-8, §11 row 5 at C6 | **PASS** |
| K01-R5-02 ([review-05.md](review-05.md)) | Exactly one dependency-alternative selector grammar, reconciled with `MIG-5`/`REF-5` and §11 row 5 | Inspection of §5 W-1, §11 row 5, §12 `MIG-5`/`REF-5` at C6 | **PASS** |
| K0.1 contract command plan, step 1 | `npm run check:builder-docs` passes unchanged | `01-builder-docs` | **PASS**, exit 0 |
| K0.1 contract command plan, step 2 | the recorded three-way `git diff --check` plan | `03a` / `03b` / `03c` | **PASS** — see the table above for the exact split |
| K0.1 contract command plan, step 3 | K0.1 link/anchor audit passes | `07-link-anchor-audit`, `08-extra-links` | **PASS**, 0 unresolved files, 0 bad anchors |
| K0.1 contract command plan, step 4 | cumulative scope touches only `docs/development/` | `04-diff-stat-cumulative` | **PASS** — no `packages/`, no `tests/`, no canonical doc |
| K0.1 contract command plan, step 5 | `npm run typecheck` passes | `02-typecheck` | **PASS**, exit 0, no diagnostics |
| 006 history preservation | every prior report, review and evidence artifact byte-identical | `09-history-preserved` | **PASS** — eleven checks, no diff |

**`npm test` was not run**, and is not required: this round changes documentation and review records
only. `04-diff-stat-cumulative` shows the full cumulative diff touching nothing under `packages/` or
`tests/`. No live model/provider call, process-kill fault injection, or E0–E6 benchmark run was
performed or is claimed.

### Raw output, reproduced verbatim

Each block is the complete unedited output of the command in its first line, captured at C6. The
`exit=` line is the shell's exit status for that command. One documented deviation is marked at `03a`;
every other block is byte-for-byte.

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
HEAD    : 4a015b316d604f501a9895e85c627b7d0ba0edfd
utc     : 2026-09-11T07:25:39Z
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

#### `03a-diff-check-strict` — cumulative base..C6, default strict rules

```text
$ git diff --check 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 4a015b316d604f501a9895e85c627b7d0ba0edfd
docs/development/work/K0.1/implementation-04.md:227: trailing whitespace.
+
docs/development/work/K0.1/implementation-04.md:235: trailing whitespace.
+
exit=2
```

**The one deviation in this report.** `git diff --check` echoes each offending line, so the two `+`
lines above are literally `+` followed by one space (`0x2B 0x20`) in the real output. Reproducing those
two bytes here would put `blank-at-eol` into *this* report, which the round-5 review explicitly
forbids. Those two trailing spaces, and only those, are stripped in this reproduction; they are
precisely what the command is reporting, and the command's own message names the file and line of each,
so nothing is concealed. Everything else in this block, and every other block in this report, is
byte-for-byte.

#### `03b-diff-check-noblankeol` — cumulative base..C6 with only the blank-at-eol rule disabled

```text
$ git -c core.whitespace=-blank-at-eol diff --check 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 4a015b316d604f501a9895e85c627b7d0ba0edfd
exit=0
```

#### `03c-diff-check-delta` — this round's own delta H5..C6, default strict rules, no exception

```text
$ git diff --check d0dbc4800c10dad68a8b4b6c662bf90c963fd926 4a015b316d604f501a9895e85c627b7d0ba0edfd
exit=0
```

#### `04-diff-stat-cumulative` — cumulative base..C6 scope

```text
$ git diff --stat 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 4a015b316d604f501a9895e85c627b7d0ba0edfd
 docs/development/007-work-packets.md               |    2 +-
 docs/development/work/K0.1/contract.md             |  189 +++
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
 docs/development/work/K0.1/implementation-04.md    |  436 ++++++
 docs/development/work/K0.1/implementation-05.md    |  454 ++++++
 docs/development/work/K0.1/protocol-worksheet.md   | 1453 ++++++++++++++++++++
 docs/development/work/K0.1/review-01.md            |  146 ++
 docs/development/work/K0.1/review-02.md            |  134 ++
 docs/development/work/K0.1/review-03.md            |  205 +++
 docs/development/work/K0.1/review-04.md            |  190 +++
 docs/development/work/K0.1/review-05.md            |  197 +++
 22 files changed, 3945 insertions(+), 1 deletion(-)
exit=0
```

#### `05-diff-stat-correction` — correction delta H5..C6

```text
$ git diff --stat d0dbc4800c10dad68a8b4b6c662bf90c963fd926 4a015b316d604f501a9895e85c627b7d0ba0edfd
 docs/development/007-work-packets.md             |   2 +-
 docs/development/work/K0.1/contract.md           |  12 +
 docs/development/work/K0.1/protocol-worksheet.md | 332 +++++++++++++++++++----
 docs/development/work/K0.1/review-05.md          | 197 ++++++++++++++
 4 files changed, 494 insertions(+), 49 deletions(-)
exit=0
```

#### `06-status` — clean tree at C6

```text
$ git status --porcelain
exit=0
```

#### `07-link-anchor-audit` — K0.1 link/anchor audit

```text
$ python3 link-anchor-audit-r6.py   (run from repo root; script kept outside the repository)
relative links checked : 235
resolved files         : 218
anchors verified       : 12
known forward refs     : 17 (implementation-06.md, written by the report commit H6)
unresolved files       : 0
bad anchors            : 0
RESULT: PASS
exit=0
```

The link count rose from round 5's 188 to 235, a delta of 47 accounted for exactly: `review-05.md`
contributes 15 (it did not exist at C5), `implementation-05.md` contributes 13 (it exists in the tree
at C6 but was written by H5, so it was absent at C5), `protocol-worksheet.md` gained 17 and
`contract.md` gained 2. The 17 known forward references are the references to `implementation-06.md` —
this file, written by H6 — 15 from `protocol-worksheet.md` and one each from `contract.md` and
`review-05.md`.

**The script that ran.** `docs/development/work/K0.1/evidence/round-3/link-anchor-audit.py` is already
in the repository at H3 (SHA-256
`4713f621db707d80cfce3c3a9c43b11dfeffa2c4a3c973e7b4d2d7ebe107767a`). Round 6 must add no file to the
repository, so the round-6 variant ran from outside the working tree. It differs from the committed
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
# implementation-06.md is written by the report commit (H6); at the payload commit (C6) it is a
# known forward reference, reported, not hidden. Round 6 adds no evidence file to the repository.
FORWARD = {"implementation-06.md"}
```

Line 49, before:

```python
print(f"known forward refs     : {fwd} (implementation-03.md, written by the report commit H3)")
```

Line 49, after:

```python
print(f"known forward refs     : {fwd} (implementation-06.md, written by the report commit H6)")
```

The resulting file's SHA-256 is
`d8381c252fc69467e8f305eecd355c85977d5c6ff4e6a7d52713dad8ea0186f6`. A reviewer can reconstruct it
byte-identically by applying those two substitutions to the committed script and verifying the digest.

#### `08-extra-links` — same-file anchors and 007 ledger links

The audit script skips same-file `#anchor` targets and only walks `docs/development/work/K0.1/`, so the
worksheet's subsection anchor and the edited 007 status row were checked separately:

```text
$ python3 - (same-file anchors and 007 K0.1-row links; neither is covered by the audit script)
same-file anchor #reference-implementation-limitations-not-a-legacy-disposition -> OK
007 K0.1-row link work/K0.1/review-05.md -> OK
007 K0.1-row link work/K0.1/implementation-05.md -> OK
007 K0.1-row link work/K0.1/review-01.md -> OK
007 K0.1-row link work/K0.1/review-02.md -> OK
007 K0.1-row link work/K0.1/review-03.md -> OK
007 K0.1-row link work/K0.1/evidence/round-3/ -> OK
007 K0.1-row link work/K0.1/review-04.md -> OK
exit=0
```

#### `09-history-preserved` — every prior report, review and evidence artifact untouched

Each check diffs a path against the commit that introduced it. No diff printed means byte-identical.
`implementation-04.md` is included deliberately: the `03a` result above is resolved by the recorded
exception, never by editing that file.

```text
$ git diff --stat <introducing commit> HEAD -- <path>     (no diff printed = byte-identical)
--- review-01.md  (introduced in 4d47638)
--- review-02.md  (introduced in ca06599)
--- review-03.md  (introduced in 6738884)
--- review-04.md  (introduced in cef3313)
--- review-05.md  (introduced in 35e7de5)
--- implementation-01.md  (introduced in 857fa05)
--- implementation-02.md  (introduced in cc61e74)
--- implementation-03.md  (introduced in aef1e33)
--- implementation-04.md  (introduced in a068e2f)
--- implementation-05.md  (introduced in d0dbc48)
--- evidence/round-3/  (introduced in aef1e33)
exit=0  (no section above printed a diff)
```

## Interpretation and decisions

- **Why this candidate satisfies the correction request.** K01-R5-01 and K01-R5-02 have separate
  dispositions above, each broken out sub-requirement by sub-requirement against the finding's own
  bullet list, with the exact worksheet location and the actual wording for every line. Neither is
  collapsed into "addressed."
- **Why `B-6` is a batch-selection decision rather than a wait decision.** The finding forbade another
  wait type, and the honest home for "which Events may the next batch contain" is §3, beside B-1/B-2/
  B-4, not §5. Putting it in §5 would have made it read as a second kind of wait however carefully it
  was worded; putting it in §3 makes it what it actually is — an input to B-2's middle case. W-1 and
  W-2 point at it rather than restating it, so there is still exactly one place each rule lives.
- **Why "recoverable readiness" rather than a new field.** kernel.md's Acceptance/atomicity table and
  execution-protocol.md's acceptance step 4 both already commit "recoverable readiness" with next
  state. Naming that existing field, instead of inventing a sibling, is what keeps this inside K0.1-C4
  ("no new mandatory Kernel concept") — and it comes with the recovery property for free, since the
  canonical text already says readiness is rebuilt from accepted records and never from an unjournaled
  post-commit enqueue.
- **Why the one-exchange lifetime is stated as "consumed when the batch is reserved."** Reservation,
  not Outcome acceptance, is the moment the wake Event actually reaches a Runtime; tying consumption
  to acceptance would leave a window in which a crash-and-redispatch could re-apply the retired
  selector to a second exchange, and tying it to the Outcome would leave the selector live across a
  dispatch that had already used it. B-1's "pinned at dispatch time" batch gives the exact boundary.
- **Why W-8 case 4 rather than a new decision.** The finding prescribed a scenario that is W-8's
  scenario with the bound pinned to 1. Keeping it there means the K0 trace is read once, end to end,
  with the displacement case in its natural position between the wake and the completion; `B-6` carries
  a one-paragraph summary so a §3 reader is not sent away to find it.
- **What the grammar deliberately does not add.** Exact Event identity was already in kernel.md's
  dimension list, so naming it is not an extension — but it is worth being explicit that nothing else
  was taken from that list either. `destination`, `causationId`, `occurredAt` and per-mailbox
  `sequence` remain envelope vocabulary an alternative is written *about*, not fields it can select on;
  admitting any of them would have quietly widened the Kernel's matching surface.
- **Roadmap deviations:** none. No scope, gate or acceptance requirement was weakened. The only
  `contract.md` change is the round-5 entry in the correction history; the command plan, including its
  accepted exception, is unmodified.
- **Reviewer focus for this round:** **`B-6`'s one-exchange lifetime under recovery.** It is the only
  new Kernel-behaviour statement, and the question worth attacking is the crash window: a crash after
  the accepting transaction commits but before the batch is reserved must redispatch as
  wake-triggered, and a crash after reservation but before Outcome acceptance must not re-arm it a
  second time. The worksheet's answer is that the readiness is committed with the Outcome and consumed
  at reservation, and that B-1's pinned batch is the durable record of the latter — worth testing
  against execution-protocol.md's crash-window table rather than taking on trust. Then W-1's grammar
  against `MIG-5`: specifically whether "K1 must reject `eventKinds: []` with `correlationId: null`"
  belongs in `MIG-5` as a migration obligation or in W-1 as a validation rule — it is currently stated
  in `MIG-5` and implied by W-1's "at least one must be supplied," and a reviewer may reasonably want
  it stated once, normatively, in W-1.
- **Known limitations:** unchanged in kind. This worksheet still cannot be validated against running K1
  behaviour, because K1 does not exist. W-8 case 4 is a specification of a trace, not a passing
  fixture; K0.2 owns the fixture that would exercise it, and it is now a strictly better fixture
  target than it was, because it has a stated batch bound and a mandatory negative outcome.
- **Third-party source / dependency / service:** **none added.** No code, test material or asset was
  copied, adapted or vendored, no dependency or service was introduced, and `package.json` is untouched
  (`04-diff-stat-cumulative`). Every source read this round was repository-internal; no external
  document was consulted, and round 4's RFC 8785 / ECMA-262 citations are unchanged.
- **Prior review findings — each ID → correction evidence.** Round 5: K01-R5-01 → Fixed (§3 B-2 and new
  `B-6`; §5 W-1 retire-on-wake paragraph, W-2, W-7 cases 4/5, W-8 case 3 and new case 4; §11 row 5;
  §13); K01-R5-02 → Fixed (§5 W-1 selector grammar; §12 `MIG-5`, `REF-5`; §11 row 5; §12 header note;
  §13). Round 4's K01-R4-01..02, round 3's K01-R3-01..04, round 2's K01-R2-01..06 and round 1's
  K01-REV-01..05 remain fixed as recorded in [implementation-05.md](implementation-05.md),
  [implementation-04.md](implementation-04.md), [implementation-03.md](implementation-03.md) and
  [implementation-02.md](implementation-02.md); the consistency pass above re-checked each of the
  named non-regression points and none regressed. No finding across any round remains unresolved or
  partially resolved.

## Handoff

- Ready for independent review at candidate H6 (SHA supplied in the handoff message; base `6464be1`,
  H `857fa05`, H2 `cc61e74`, H3 `aef1e33`, H4 `a068e2f`, H5 `d0dbc48`, round-6 review record
  `35e7de5`, payload C6 `4a015b316d604f501a9895e85c627b7d0ba0edfd`).
- `git diff --stat 4a015b3 <H6>` is verified in the handoff message to contain exactly
  `docs/development/work/K0.1/implementation-06.md` and `docs/development/007-work-packets.md`, which
  is the entirety of the declared administrative material for this candidate.
- No self-acceptance. K0.2 and every later packet remain unstarted and unreleased.
