# Implementation report — K0.1, round 10 (narrow correction)

## Identity and status

- Packet / parent milestone: **K0.1** / **K0**; [contract.md](contract.md) (corrected this round);
  worksheet [protocol-worksheet.md](protocol-worksheet.md) **Revision 10**.
- State: **WAITING_FOR_REVIEW**
- Correcting: [review-09.md](review-09.md)'s CHANGES REQUIRED outcome, findings **K01-R9-01 (P2)** and
  **K01-R9-02 (P2)**, against reviewed candidate H9 `00b30eb333024f7093c5a1db122a3772ca2b8b04`
  (payload C9 `1b2ef1bd83681f302637ffd27c9630575289d37b`, base `6464be1`).
- Base commit (unchanged since round 1): `6464be12c11eb75f7dfbc5ece12ca8d3020a5c15`
- Reviewed candidates, all preserved and none rewritten: H `857fa05a8a72a4c6f4f294f9e775a0dc1f7919dc`,
  H2 `cc61e74455534abf896c46632246615185219b92`, H3 `aef1e33ba944a0647bb2319fb97ae40b18b05924`,
  H4 `a068e2f6c8d67e5e3e2512c765b29427acb4ac68`, H5 `d0dbc4800c10dad68a8b4b6c662bf90c963fd926`,
  H6 `c5bdd481134cf3691050b16dd6dd3a49aa9ab042`, H7 `6bdc53ad10d50e0e41bccf57bab212d406b7a2ce`,
  H8 `6290e68fb0231a6a8b4e6956d9a44afe7ac051ab`, H9 `00b30eb333024f7093c5a1db122a3772ca2b8b04`.
- Round-10 review record commit (adds [review-09.md](review-09.md); ledger → CHANGES_REQUESTED):
  `ab3dbd6781a2c59a8bd0dc6386d4f7875c76ae8b`
- **Correction payload C10: `7f68df367d05641dfdcfca932a1f4c533b5ace3d`**
- Candidate H10: the commit containing this report and the ledger status edit, and **nothing else**;
  full SHA supplied in the handoff (per 006, H cannot name itself).
- Branch / remote: `codex/k0.1-protocol-legacy-disposition` / `origin`
  (`https://github.com/ArrokothI/Agent_SDK.git`; GitHub reports it moved to
  `https://github.com/ArrokothI/agent-kernel.git` — the configured URL is deliberately left unchanged).
- Working tree: verified clean at C10 **before** validation ran; nothing was written into the
  repository afterwards. Round 10 adds **no** evidence file, directory or script.
- History: every prior commit, report, review and evidence artifact is preserved unedited — verified
  file by file in `09-history-preserved` below (eighteen checks), including
  [review-08.md](review-08.md), `implementation-04.md` and every other historical record
  byte-for-byte. No reviewed commit was amended, rebased or force-pushed.

**Blob identities confirmed before editing.** [review-09.md](review-09.md) pins the four artifacts it
inspected by blob SHA at H9. All four were checked against H9's tree before this correction began and
all four match: `contract.md` `95015d103b31a6709be1cf5b3671872750d2e03c`, `protocol-worksheet.md`
`39334ef7bca32f599da0a69878a55f4002b2a29a`, `review-08.md`
`aad8377e3ec25ee5370d3c340a02ccebff8b3571`, `implementation-09.md`
`33c46df10772e3bd72e507d7c07b24ac25ae2cc4`.

## Round-10 commit sequence

| Step | Commit | Contents |
|---|---|---|
| Administrative review record | `ab3dbd6781a2c59a8bd0dc6386d4f7875c76ae8b` | `review-09.md` + the 007 K0.1 status row → `CHANGES_REQUESTED`. No payload. |
| Payload **C10** | `7f68df367d05641dfdcfca932a1f4c533b5ace3d` | `contract.md` + `protocol-worksheet.md` only. |
| Final validation | — | Run against the clean C10 tree, after C10 existed. |
| Candidate **H10** | the commit containing this report | `implementation-10.md` + the 007 K0.1 status row → `WAITING_FOR_REVIEW`. Nothing else. |

## Scope of this round

Deliberately narrow. Round 9's consolidation held: [review-09.md](review-09.md) confirmed §3's and §5's
rewritten structure, the timeout Event's semantic home, `B-6`/`B-7`, W-2's ordered registration
algorithm and the commit choreography, and reopened none of them. Round 10 changes **one normative
rule** — W-1's registration well-formedness — plus the three places that restated or depended on it,
and adds an administrative supersession record. The round-9 wait / batch / clock state machine is
otherwise untouched, and the *Non-regression re-check* below is the file-by-file evidence for that.

## Findings — individual disposition

### K01-R9-01 (P2) — W-1 registration well-formedness contradicted its intentionally permitted inert alternatives — **Fixed**

**The exact defect.** Revision 9's W-1 carried two normative statements that disagree about the same
submitted record.

- Its well-formedness paragraph was titled "**one eligible wake source across the two lists
  combined**", declared the registration valid "iff `dependency alternatives + declared subscriptions
  ≥ 1`", and justified the both-empty rejection with "a wait must name at least one Event class that
  **can end it**."
- Its selector-grammar paragraph, a few lines below, said "**A well-formed alternative can still be
  inert.** Validity is structural; *eligibility* is decided by the category rule above… It is **not**
  rejected at registration — the Kernel does not audit a Runtime's intent — it simply contributes
  nothing."

For `dependencies = [{kind: external.input}]` with `subscriptions = []`, the first reading **rejects**
the registration — that alternative can never end the wait, because ordinary application input is
eligible only through a declared subscription — and the second **accepts** it, because one
structurally valid alternative is present. A K1.1 implementer writing the validator could take either
as normative, and the two produce different observable Kernel behaviour for the same Outcome.

**The exact final rule.** W-1's well-formedness is now a purely **structural** test, renamed so the
name cannot be mistaken for an eligibility claim: **a structurally non-empty wait declaration**. A
registration is well formed iff all three hold:

1. **structurally non-empty** — `dependency alternatives + declared subscriptions ≥ 1`; either list may
   individually be empty, they may not **both** be empty;
2. **every dependency alternative that is present is itself valid** under the selector grammar — at
   least one supplied selector field, no supplied empty kind set, no selector outside the three fields;
3. **every declared subscription that is present is structurally valid** — a declared subscription
   identity in the sense of W-1 item 2, whose exact spelling remains implementation-owned under W-9's
   closing *Left open* note.

Three consequences are stated explicitly, because they are what the two readings disagreed about:

- **An inert alternative still counts toward structural non-emptiness.** An alternative naming an
  application-input kind or a timeout kind can never make an Event eligible, yet it is valid and it
  satisfies rule 1. **No intent or satisfiability checker is introduced.**
- **A well-formed wait may therefore never be woken.** Absent a deadline, the Execution remains
  `WAITING` until cancellation or another accepted terminal decision.
- **K0.1 promises structure, never satisfiability**, and no general deadlock prevention.

**A deadline still does not rescue a record with both lists literally empty.** A deadline on a
*well-formed* wait is a different matter: it can end that wait through `B-7`, including a wait whose
only declared sources happen to be inert.

**Worksheet location.** §5 W-1 *Well-formedness: a structurally non-empty wait declaration* (rewritten,
with the four-case table); §5 W-1's selector-grammar bullets *At least one of the three must be
supplied* and *A well-formed alternative can still be inert, and it still counts*; §5 W-8's
registration sentence and its *What this makes unnecessary — and what it deliberately does not police*
(formerly *What this rules out*); §11 row 5(a); §13's new `K01-R9-01` entry and its round-4 rename
annotation; revision history.

**Deterministic counterexamples** (W-1's new case table; each has exactly one answer):

| # | Record | Well-formed? | Result |
|---|---|---|---|
| 1 | `dependencies = []`, `subscriptions = []` | **No** | Rejected at envelope validation (§7 OA-3); whole Outcome refused. **A deadline does not change this.** |
| 2 | `dependencies = [{kind: external.input}]`, `subscriptions = []`, no deadline | **Yes** | The alternative is inert; arriving application input is accepted, produces no wake, is not acknowledged, stays queued (B-4); the Execution stays `WAITING` indefinitely absent cancellation. |
| 3 | case 2 **with a deadline** | **Yes** | Same eligibility answer; the current-generation deadline ends the wait through `B-7` — one timeout Event, `READY`, deadline-triggered readiness. |
| 4 | `dependencies = []`, `subscriptions = {continue}` | **Yes** | The subscription-only input wait of W-8, behaving exactly as W-8 states. |

Cases 2 and 3 are precisely the records revision 9 answered two ways.

**How the corrected rule prevents the defect.** The contradiction existed because one rule was *named*
for a property it did not check. Splitting the two questions by vocabulary — *structural non-emptiness*
at registration, *eligibility* in the source-category table and nowhere else — removes the shared
vocabulary that let one rule be read as the other. The Kernel now refuses malformed selectors and
nothing else; it never refuses a merely useless wait, and it says so.

**This resolves toward the canonical owner, not away from it.** The rejected reading would have had
K0.1 promising a satisfiability guarantee two canonical pages explicitly disclaim: kernel.md's
"Parent/peer cyclic waits can still deadlock: expose correlations and deadlines; do not promise general
deadlock prevention", and execution-protocol.md's "General deadlock prevention is not promised." The
structural reading is the one consistent with both.

### K01-R9-02 (P2) — review-08.md omitted the corrective prompt and sufficient source references — **Fixed prospectively, without editing review-08.md**

**The exact defect.** Measured against [008](../../008-implementation-report.md), the round-8
administrative transcription omitted two things: **meaningful file/section/contract references** for its
four severity findings, each of which was recorded as a bare one-sentence statement; and **the complete
corrective prompt** delivered with the round-8 CHANGES REQUIRED verdict, which defined round 9's scope,
target semantic model, rewrite authorisation, adversarial-self-review obligation, commit choreography
and validation plan. Neither omission changed the verdict or the findings — round 9 fixed all four —
but the committed record did not carry what 008 requires it to carry.

**Why review-08.md is not edited.** It is reviewed history. Editing it would violate this packet's
standing constraint and 006's rule against rewriting published review commits, and it would make the
blob SHA [review-09.md](review-09.md) pins unverifiable. It remains byte-identical at
`aad8377e3ec25ee5370d3c340a02ccebff8b3571`, introduced in `6ac959f` and verified unchanged at C10 in
`09-history-preserved` below.

**The exact repair.** [review-09.md](review-09.md) carries a section titled **"Supersession of
review-08 administrative transcription"** which states that review-08.md remains immutable, names the
two 008 omissions, and then supplies both:

1. **Exact H8 references for the four round-8 findings**, as a table giving for each finding its
   severity, its exact location in the H8 tree, and the conflict with the contract criteria and
   canonical owner it turns on:
   - **K01-R8-01** — H8 worksheet §3 **B-2**'s `WAITING` bullet against §5 **W-1**'s source-category
     eligibility rule; criteria K0.1-C5/C6; kernel.md *Events and waits*.
   - **K01-R8-02** — H8 worksheet §3 **B-1** and **B-7** against §5 **W-9**'s *Left open* paragraph;
     criteria K0.1-C2/C6; execution-protocol.md's wait-registration paragraph.
   - **K01-R8-03** — H8 worksheet §5 **W-1**'s *Scope note* following the source-category rule;
     criteria K0.1-C2/C6; kernel.md *Events and waits* and composition-and-communication.md (target K4).
   - **K01-R8-04** — H8 `implementation-08.md` *Reviewer focus for this round* against §5 **W-2** and
     §3 **B-7**; criteria K0.1-C2/C6; kernel.md's lifecycle table and execution-protocol.md.
2. **The complete round-8 corrective prompt, reproduced verbatim**, fenced so its separator lines,
   numbering and emphasis survive as delivered rather than being rendered as Markdown. It is preserved
   whole — nothing added, summarised, reordered or omitted — with two non-altering reading notes: that
   it names the commissioned work "round 9", which the repository records as C9/H9; and that its
   section 5 is an explicitly conditional *target semantic model to test against canonical sources*,
   which round 9 tested and found free of canonical conflict.

**The prompt was available in this session and is reproduced from it.** It is the owner message that
opened the round-9 coding-agent session. No text is invented, reconstructed or labelled verbatim
without being verbatim; had it not been available, the correct action would have been to stop and ask
the owner for it rather than to paraphrase.

**Location.** [review-09.md](review-09.md) §*Supersession of review-08 administrative transcription*;
[contract.md](contract.md)'s round-9 correction-history entry records the practice change.

**Going forward.** The transcription practice is corrected **forward**: this packet's review records
carry finding-level references and any corrective prompt delivered with the verdict. Rounds 1–7's
records are not retrofitted; [review-09.md](review-09.md)'s supersession section is the authoritative
reference record for round 8 specifically, because that is the round whose omission was found.

## Non-regression re-check

Every decision [review-09.md](review-09.md) passed, and every decision earlier rounds settled, was
re-read at C10. None changed meaning.

| Area | Status at C10 |
|---|---|
| Timeout is a **Kernel Event** (W-9) | unchanged — identity, destination, semantic timeout class, wait-generation correlation, Kernel timer provenance; exactly one per generation; duplicate delivery idempotent |
| `B-6`/`B-7` two-path semantics | unchanged — four rows of §3's wait-ended table, both species, both paths |
| **W-2** ordered one-transaction registration | unchanged — batch ack, mailbox check, already-due deadline, else `WAITING`; still one transaction, still "evaluation, not four commits" |
| Timeout/result ordering | unchanged — W-9 cases 3 and 4; neither fact rewritten into the other |
| Cancellation before reservation | unchanged — W-9 *Mandatory delivery* terminal caveat and B-5 |
| **`B-8`** no-extra-readiness rule | unchanged — §3 row 6 and `B-8` |
| Source-category eligibility (W-1) | unchanged — three categories, application input only via subscription, timeout via neither |
| K4 versioned peer-subscription extension | unchanged |
| Activation ID / writer epoch (ID-3, ID-4, ID-9) | unchanged |
| E-7 / RFC 8785 JCS canonical form | unchanged, not reopened |
| K1 Effect refusal (EF-1, EF-2) | unchanged |
| Progress (PC-1–PC-5, `MIG-3`, `LEG-4`) | unchanged |
| Three-label legacy classification | unchanged — migratable / legacy-only / refused; no fourth label |
| `MIG-5` / `REF-5` | unchanged, including `MIG-5`'s timeout clause and `REF-5`'s seven refusal grounds |
| `LEG-5`, `REF-4`, `LIM-1` | unchanged |
| Historical whitespace exception | unchanged and applied identically this round |
| `interleave` (W-5) | unchanged — not reintroduced |

**Diff-level confirmation.** `H9..C10` touches four files, two of which belong to the administrative
review commit. C10's own payload is `contract.md` (+32 lines, correction history only) and
`protocol-worksheet.md` (+197/−43), and every worksheet hunk is inside W-1's well-formedness rule, W-1's
two grammar bullets, W-8's two paragraphs, §11 row 5(a), §13 and the revision history/header.

## Adversarial self-review

I re-read every normative statement about wait validity, eligibility, inert alternatives, deadlines and
`WAITING` at C10 and tried to find a record with two answers.

| Probe | Answered by | Result |
|---|---|---|
| both lists empty, no deadline | W-1 rule 1, case 1 | malformed; whole Outcome refused |
| both lists empty, **with** deadline | W-1 *A deadline does not rescue a literally empty declaration*, case 1 | still malformed — the deadline is not a wake source |
| only an inert `{kind: external.input}` alternative | W-1 rule 1 + case 2 | **well formed**; never woken by application input; stays `WAITING` |
| same, with a deadline | case 3 | well formed; ended by `B-7` |
| subscription-only wait | case 4, W-8 | well formed; unchanged from revision 9 |
| match-everything alternative (no field supplied) | selector grammar, *At least one of the three* | **invalid** — structural, and now explicitly not a dischargeability judgement |
| alternative with `eventKinds: []` supplied | selector grammar, empty-kind-set bullet | invalid before matching; `MIG-5` case 1 unchanged |
| a wait that can only be woken by work the Runtime never started | W-1 third bullet + W-8 *what it deliberately does not police* | accepted; the Kernel proves structure, not satisfiability |
| does an inert alternative change *eligibility* anywhere? | W-1 category table; W-7 cases 6–7 | no — inert in both directions, unchanged from revision 9 |
| does the rename weaken the application-input rule? | W-1 category table | no — eligibility was never stated by the well-formedness rule, which is the whole point of the split |

**Two precision defects in my own draft were found and fixed before C10**, both mine rather than the
reviewer's:

1. W-1's new case 2 originally ended "This is W-7 case 6." That is wrong: W-7's `W′` also carries `D1`
   and `D2`, which *can* wake it, so `W′` is not the pathological record. The cell now says the
   **eligibility answer** is W-7 case 6's while noting that this record's only declared source is the
   inert one — otherwise a reader could conclude W-7 case 6 describes a wait that can never be woken.
2. Well-formedness rule 3 originally read as though it fixed the spelling of a declared subscription
   identity, which W-9's closing *Left open* note explicitly leaves to K1.3. It now fixes only that the
   entry *is* such an identity and defers the spelling to that note.

**Where a reviewer inventing a new counterexample is most likely to look next**, in my own estimation:
whether §7's OA-3 envelope validation is the right home for *all three* well-formedness rules, or only
for rule 1. Revision 10 places all three there (W-1 case 1 cites OA-3, and W-2's preamble says the wait
"is well-formed under W-1" by the time it runs), which I believe is right — a malformed selector is an
invalid next step exactly as a malformed envelope field is, and execution-protocol.md's acceptance step
3 covers "valid next step" — but it is the seam this round moved most, and it is stated in two places
rather than one.

**No K0.1 semantic ambiguity is known to remain.** No canonical owners conflict, so nothing is
BLOCKED_ARCHITECTURE.

## Validation

All commands ran at **C10 `7f68df367d05641dfdcfca932a1f4c533b5ace3d`** with the working tree verified
clean. Output was captured outside the repository and is reproduced below. **Round 10 added no evidence
file, directory or script.**

**On the accuracy of "verbatim."** Every block below is byte-for-byte **except** `03a`, where the two
echoed offending lines are rendered without their single trailing space, for the reason given at that
block. This report reproduces the raw outputs **subject to the documented historical-whitespace
rendering exception**, and the 007 status row says exactly that rather than claiming full verbatim
reproduction.

- **cwd:** `/Users/rex-shih/Documents/Codex/projects/agent-kernel`
- **Environment:** Node `v25.2.1`, npm `11.6.2`, Python `3.13.5`, git `2.39.5 (Apple Git-154)`,
  Darwin `24.6.0`, macOS `15.7.9`, package `arrokothi-agent-kernel@0.8.1`.
- **UTC timestamp of the environment capture:** `2026-09-11T09:26:07Z`; every command below ran in the
  same session immediately after it, at the same HEAD.

### The three-way `git diff --check` plan

| Run | Requirement | Result |
|---|---|---|
| `git diff --check <base> <C10>`, default strict rules | may report **only** the two already-approved immutable `implementation-04.md` blank-at-EOL findings | exit 2 — **exactly** `implementation-04.md:227` and `:235`, nothing else, no other whitespace class |
| `git -c core.whitespace=-blank-at-eol diff --check <base> <C10>` | **exit 0** | exit 0 |
| `git diff --check <H9> <C10>` — this round's own delta | **exit 0, no exception** | exit 0 |

### Criterion observations

| Criterion ID and source | Assertion / independent observation | Command and evidence | Observed result |
|---|---|---|---|
| K01-R9-01 ([review-09.md](review-09.md)) | Well-formedness is structural, renamed, with inert alternatives counting, no satisfiability promise, a deadline not rescuing an empty record, and four deterministic cases; eligibility untouched | Inspection of §5 W-1, W-8, §11 row 5(a), §13 at C10 | **PASS** |
| K01-R9-02 ([review-09.md](review-09.md)) | review-09 carries the supersession section with H8 references and the complete verbatim round-8 prompt; review-08.md unedited | Inspection of `review-09.md` at C10; `09-history-preserved` | **PASS** |
| K0.1 contract command plan, step 1 | `npm run check:builder-docs` passes unchanged | `01-builder-docs` | **PASS**, exit 0 |
| K0.1 contract command plan, step 2 | the recorded three-way `git diff --check` plan | `03a` / `03b` / `03c` | **PASS** — see the table above |
| K0.1 contract command plan, step 3 | K0.1 link/anchor audit passes | `07-link-anchor-audit`, `08-extra-links` | **PASS**, 0 unresolved files, 0 bad anchors |
| K0.1 contract command plan, step 4 | cumulative scope touches only `docs/development/` | `04-diff-stat-cumulative` | **PASS** — no `packages/`, no `tests/`, no canonical doc |
| K0.1 contract command plan, step 5 | `npm run typecheck` passes | `02-typecheck` | **PASS**, exit 0, no diagnostics |
| 006 history preservation | every prior report, review and evidence artifact byte-identical, **including review-08.md** | `09-history-preserved` | **PASS** — eighteen checks, no diff |

**`npm test` was not run**, and is not required: this round changes documentation and review records
only. `04-diff-stat-cumulative` shows the cumulative diff touching nothing under `packages/` or
`tests/`. No live model/provider call, process-kill fault injection, or E0–E6 benchmark run was
performed or is claimed. **No executable behaviour is validated by this packet.**

### Raw output

#### `00-env` — environment capture

```text
node    : v25.2.1
npm     : 11.6.2
python3 : Python 3.13.5
git     : git version 2.39.5 (Apple Git-154)
uname   : Darwin 24.6.0
sw_vers : macOS 15.7.9
package : arrokothi-agent-kernel@0.8.1
cwd     : /Users/rex-shih/Documents/Codex/projects/agent-kernel
HEAD    : 7f68df367d05641dfdcfca932a1f4c533b5ace3d
utc     : 2026-09-11T09:26:07Z
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

#### `03a-diff-check-strict` — cumulative base..C10, default strict rules

```text
$ git diff --check 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 7f68df367d05641dfdcfca932a1f4c533b5ace3d
docs/development/work/K0.1/implementation-04.md:227: trailing whitespace.
+
docs/development/work/K0.1/implementation-04.md:235: trailing whitespace.
+
exit=2
```

**The one rendering exception in this report.** `git diff --check` echoes each offending line, so the
two `+` lines above are literally `+` followed by one space (`0x2B 0x20`) in the real output.
Reproducing those two bytes would put `blank-at-eol` into *this* report. Those two trailing spaces, and
only those, are stripped here; they are precisely what the command is reporting, and its own message
names the file and line of each, so nothing is concealed. Every other block in this report is
byte-for-byte.

#### `03b-diff-check-noblankeol` — cumulative base..C10 with only the blank-at-eol rule disabled

```text
$ git -c core.whitespace=-blank-at-eol diff --check 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 7f68df367d05641dfdcfca932a1f4c533b5ace3d
exit=0
```

#### `03c-diff-check-delta` — this round's own delta H9..C10, default strict rules, no exception

```text
$ git diff --check 00b30eb333024f7093c5a1db122a3772ca2b8b04 7f68df367d05641dfdcfca932a1f4c533b5ace3d
exit=0
```

#### `04-diff-stat-cumulative` — cumulative base..C10 scope

Thirty files, all under `docs/development/`. The tail of the listing and the scope check:

```text
$ git diff --stat 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 7f68df367d05641dfdcfca932a1f4c533b5ace3d | tail -8
 docs/development/work/K0.1/review-03.md            |  205 ++
 docs/development/work/K0.1/review-04.md            |  190 ++
 docs/development/work/K0.1/review-05.md            |  197 ++
 docs/development/work/K0.1/review-06.md            |  199 ++
 docs/development/work/K0.1/review-07.md            |  217 ++
 docs/development/work/K0.1/review-08.md            |   86 +
 docs/development/work/K0.1/review-09.md            | 1242 +++++++++++
 30 files changed, 8804 insertions(+), 1 deletion(-)
```

```text
$ git diff --name-only 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 7f68df367d05641dfdcfca932a1f4c533b5ace3d | grep -v '^docs/development/' || echo 'nothing outside docs/development/'
nothing outside docs/development/
```

The only file outside `docs/development/work/K0.1/` is the 007 ledger row.

#### `05-diff-stat-correction` — correction delta H9..C10

```text
$ git diff --stat 00b30eb333024f7093c5a1db122a3772ca2b8b04 7f68df367d05641dfdcfca932a1f4c533b5ace3d
 docs/development/007-work-packets.md             |    2 +-
 docs/development/work/K0.1/contract.md           |   32 +
 docs/development/work/K0.1/protocol-worksheet.md |  240 ++++-
 docs/development/work/K0.1/review-09.md          | 1242 ++++++++++++++++++++++
 4 files changed, 1472 insertions(+), 44 deletions(-)
```

Two of those four files belong to the **administrative review-record commit** `ab3dbd6`
(`review-09.md`, and the 007 ledger row → `CHANGES_REQUESTED`), which sits between H9 and C10. **C10's
own payload is exactly two files**, `contract.md` and `protocol-worksheet.md`, as the commit sequence
table above requires.

#### `06-status` — clean tree at C10

```text
$ git status --porcelain
(empty output)
```

#### `07-link-anchor-audit` — K0.1 link/anchor audit

```text
$ python3 link-anchor-audit-r10.py   (run from repo root; script kept outside the repository)
relative links checked : 372
resolved files         : 368
anchors verified       : 12
known forward refs     : 4 (implementation-10.md, written by the report commit H10)
unresolved files       : 0
bad anchors            : 0
RESULT: PASS
exit=0
```

The four known forward references are references to `implementation-10.md` — this file, written by
H10 — two from `protocol-worksheet.md` and one each from `contract.md` and `review-09.md`. The link
count rose from round 9's 321 to 372: `implementation-09.md` contributes 34 (it exists in the tree at
C10 but was written by H9, so it was absent at C9), `review-09.md` contributes 13, and `contract.md`
and `protocol-worksheet.md` account for the small remainder.

**The script that ran.** `docs/development/work/K0.1/evidence/round-3/link-anchor-audit.py` is already
in the repository at H3 (SHA-256 `4713f621db707d80cfce3c3a9c43b11dfeffa2c4a3c973e7b4d2d7ebe107767a`).
Round 10 must add no file to the repository, so the round-10 variant ran from outside the working tree,
differing in exactly two places, shown as explicit before/after line sets so this report introduces no
blank diff context lines:

Lines 9–11, before:

```python
# implementation-03.md is written by the report commit (H3) that also carries this log,
# so at the payload commit (C3) it is a known forward reference, reported, not hidden.
FORWARD = {"implementation-03.md"}
```

Lines 9–11, after:

```python
# implementation-10.md is written by the report commit (H10) that also carries this log,
# so at the payload commit (C10) it is a known forward reference, reported, not hidden.
FORWARD = {"implementation-10.md"}
```

Line 49, before:

```python
print(f"known forward refs     : {fwd} (implementation-03.md, written by the report commit H3)")
```

Line 49, after:

```python
print(f"known forward refs     : {fwd} (implementation-10.md, written by the report commit H10)")
```

The resulting file's SHA-256 is
`7baff6df84fdc948666daa69ee24e021e45aa780eb9a286d3fb578d04b27f798`.

#### `08-extra-links` — same-file anchors and 007 ledger links

```text
$ python3 - (same-file anchors and 007 K0.1-row links; neither is covered by the audit script)
same-file anchor #reference-implementation-limitations-not-a-legacy-disposition -> OK
007 K0.1-row link work/K0.1/review-09.md -> OK
007 K0.1-row link work/K0.1/review-08.md -> OK
007 K0.1-row link work/K0.1/review-01.md -> OK
007 K0.1-row link work/K0.1/review-02.md -> OK
007 K0.1-row link work/K0.1/review-03.md -> OK
007 K0.1-row link work/K0.1/evidence/round-3/ -> OK
007 K0.1-row link work/K0.1/review-04.md -> OK
007 K0.1-row link work/K0.1/review-05.md -> OK
007 K0.1-row link work/K0.1/review-06.md -> OK
007 K0.1-row link work/K0.1/review-07.md -> OK
exit=0
```

Duplicate ledger links are de-duplicated before checking; every distinct target resolves.

#### `09-history-preserved` — every prior report, review and evidence artifact untouched

Each check diffs a path against the commit that introduced it. No diff printed means byte-identical.
**`review-08.md` is included deliberately**, because K01-R9-02's disposition depends on it being
unedited.

```text
$ git diff --stat <introducing commit> HEAD -- <path>     (no diff printed = byte-identical)
--- review-01.md             (introduced in 4d47638)
--- review-02.md             (introduced in ca06599)
--- review-03.md             (introduced in 6738884)
--- review-04.md             (introduced in cef3313)
--- review-05.md             (introduced in 35e7de5)
--- review-06.md             (introduced in 6b9a66d)
--- review-07.md             (introduced in 5dda5a7)
--- review-08.md             (introduced in 6ac959f)
--- implementation-01.md     (introduced in 857fa05)
--- implementation-02.md     (introduced in cc61e74)
--- implementation-03.md     (introduced in aef1e33)
--- implementation-04.md     (introduced in a068e2f)
--- implementation-05.md     (introduced in d0dbc48)
--- implementation-06.md     (introduced in c5bdd48)
--- implementation-07.md     (introduced in 6bdc53a)
--- implementation-08.md     (introduced in 6290e68)
--- implementation-09.md     (introduced in 00b30eb)
--- evidence/round-3/        (introduced in aef1e33)
exit=0  (no section above printed a diff)
```

## Interpretation and decisions

- **What changed semantically.** Exactly one rule: W-1's registration well-formedness, from an
  eligibility-flavoured test to a structural one, with the promise it never made now explicitly
  disclaimed. Everything else in this round is that rule's restatements, the administrative
  supersession, and history.
- **Why the structural reading rather than the effective one.** Three reasons, all recorded in the
  worksheet: revision 9's own grammar paragraph already implied it; the alternative requires an intent
  or satisfiability checker the review explicitly forbade adding; and the effective reading would have
  K0.1 promising deadlock prevention that kernel.md and execution-protocol.md both decline to promise.
- **What a reviewer should attack.** Named in *Adversarial self-review*: whether §7 OA-3 is the right
  home for all three well-formedness rules, which is the seam this round moved most.
- **Roadmap deviations:** none. No scope, gate or acceptance requirement was weakened; K0.1-C1 through
  C6 stand exactly as written, and the command plan including its owner-approved exception is
  unmodified.
- **Known limitations:** unchanged in kind. K1 does not exist, so nothing here is validated against
  running behaviour; the worksheet's cases are specifications of traces, not passing fixtures.
- **Third-party source / dependency / service:** **none added.** No code, test material or asset was
  copied, adapted or vendored, no dependency or service was introduced, and `package.json` is untouched.
  Every source read this round was repository-internal or supplied by the owner in-session.
- **Prior review findings — each ID → correction evidence.** Round 9: K01-R9-01 → Fixed (§5 W-1
  well-formedness rewritten with four cases; W-1's two grammar bullets; W-8's registration sentence and
  *What this makes unnecessary*; §11 row 5(a); §13; revision history); K01-R9-02 → Fixed
  ([review-09.md](review-09.md)'s *Supersession of review-08 administrative transcription*, with
  review-08.md byte-identical). Rounds 1–8's findings remain fixed as recorded in
  [implementation-09.md](implementation-09.md) and its predecessors; the *Non-regression re-check*
  above re-checked each named point at C10 and none regressed. No finding across any round remains
  unresolved or partially resolved.

## Handoff

- Base `6464be12c11eb75f7dfbc5ece12ca8d3020a5c15`; reviewed H9
  `00b30eb333024f7093c5a1db122a3772ca2b8b04`; administrative review record
  `ab3dbd6781a2c59a8bd0dc6386d4f7875c76ae8b`; payload **C10**
  `7f68df367d05641dfdcfca932a1f4c533b5ace3d`; candidate **H10** = the commit containing this report,
  whose full SHA is supplied with this handoff.
- `git diff --stat <C10> <H10>` must contain exactly two files: this report and the 007 K0.1 ledger row.
- Review `base..H10` cumulatively as well as `H9..C10`. The worksheet delta is small and local; the
  large file in `H9..C10` is `review-09.md`, which belongs to the administrative commit.
- **This report claims no acceptance.** The coding agent cannot grant it. K0.2 and every later packet
  remain unreleased.
