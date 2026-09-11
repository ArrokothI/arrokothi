# Review record — K0.1, round 11

Administrative transcription of the owner-delivered `review11.md`, received for Round 12.
The independent review below is reproduced verbatim. Its self-described second-reviewer role is
source metadata; this record adds no reviewer identity and incorporates no other review.
The owner correction instructions govern this correction, including the cancellation choice where
the reviewer offered alternatives. Neither transcription nor correction constitutes acceptance.

## Delivered independent review (verbatim)

# Independent review — K0.1, round 11 (second independent reviewer)

## Reviewer, date, identity

- **Reviewer model as actually used:** Claude Opus 5 (`claude-opus-5`), running in Claude Code with
  shell, full working tree and local Git access.
- **Role:** SECOND independent reviewer for K0.1. No prior review's verdict, finding or criterion
  disposition was relied on; every prior review file was read as a *claim*, and every load-bearing
  claim re-derived from the canonical sources or the current source tree.
- **Date:** 2026-09-11.
- **Base:** `6464be12c11eb75f7dfbc5ece12ca8d3020a5c15`
- **Candidate (H11):** `9202571f21e97a51c119b0324f3d279f8772ca9c`
- **Payload (C11):** `b40cfe968c8e0d2111a88df68c68f64fd02a4be3`
- **Branch:** `codex/k0.1-protocol-legacy-disposition`

## Access and limitations

- Full local checkout, clean tree, HEAD == candidate. Verified.
- Remote `origin` is `https://github.com/ArrokothI/Agent_SDK.git`, not the `ArrokothI/agent-kernel`
  URL given in the handoff. The advertised remote branch SHA matches local HEAD exactly, so the
  candidate is confirmed; the repository-name discrepancy in the handoff is recorded, not treated as
  a defect.
- No cross-repository benchmark (E0–E6) evidence was available or required: K0.1 asserts none.
- `npm test` was not rerun; the contract excludes it with a recorded justification, and I confirmed
  no `packages/`, `tests/` or `scripts/` file changed across the cumulative diff.

## What I inspected versus what I actually reran

**Inspected (read in full or in the cited ranges):**
`AGENTS.md`; `docs/kernel.md` (Acceptance/atomicity, Events-and-waits, lifecycle);
`docs/detail-design/execution-protocol.md` (all sections);
`docs/development/006-development-process.md`; `007-work-packets.md` status table;
`docs/development/work/K0.1/contract.md`; `protocol-worksheet.md` (all 2383 lines);
`implementation-11.md`; the round-10 review record; `001-current-status-and-roadmap.md` K0/K1
sections. Current source read for classification evidence:
`packages/core/src/execution/{context,lifecycle}.ts`, `definitions/types.ts`,
`packages/core/src/runtime/harness.ts` (claim path `742-782`, Effect path `886-915`, Outcome-commit
path `935-968`).

**Actually reran (my own commands, not the report's logs):**

| Command | Result |
|---|---|
| `git merge-base --is-ancestor <base> <candidate>` | ancestor — confirmed |
| `git rev-parse HEAD` / `git status --porcelain` | `9202571f…`, clean |
| `git ls-remote origin <branch>` | `9202571f…` — matches local |
| `git diff --check 6464be12 b40cfe9` (strict cumulative) | **exit 2**, exactly `implementation-04.md:227` and `:235`, `blank-at-eol` only |
| `git -c core.whitespace=-blank-at-eol diff --check 6464be12 b40cfe9` | exit 0 |
| `git diff --check 012ca925 b40cfe9` (round delta, strict) | exit 0 |
| `npm run check:builder-docs` | PASS — 26 files, 275 links/anchors, 38 imports |
| `npm run typecheck` | PASS (clean) |
| `python3 …/evidence/round-3/link-anchor-audit.py` | PASS — 408 links, 15 anchors, 0 bad |
| `git diff --name-only <base> <candidate> \| grep -E '^(packages\|tests\|scripts)/'` | empty — docs only |
| Node `v25.2.1` script re-deriving every E-7 rule-7 number, rule-6 escape and the rule-4 key order | all claims reproduce exactly |
| Per-file commit counts for `review-*.md` / `implementation-*.md` | 1 each — no reviewed file ever edited |

I independently re-derived E-7's canonical bytes rather than trusting the worksheet: `-0` to `0`,
`1e20` to `100000000000000000000`, `1e21` to `1e+21`, `1.5e300` to `1.5e+300`, `1e-6` to `0.000001`,
`1e-7` to `1e-7`, `5e-324` to `5e-324`; C0 controls escaped with lowercase hex; `/` raw; and U+1F600's
lead surrogate `0xD83D` sorting **before** U+FFFD under UTF-16 code-unit order. Every byte count in
E-7's boundary-example table (13/7/7/11/9/10, and 10 vs 2, and 18) is arithmetically correct. §1 is
sound.

## Per-criterion verdicts

| ID | Verdict | Basis |
|---|---|---|
| **K0.1-C1** | **FAIL** | §11 covers all ten 001 K0 boundaries with an owner and an assertion, and rows 1–6 and 9–10 are genuinely observable pass/fail. Rows 7 and 8 are not: for the cancel-versus-in-flight-Outcome schedule the worksheet states no acceptance/rejection result for the losing Outcome (K01-R11-01). 001 K0's exit clause requires exactly that of the cancel boundary. |
| **K0.1-C2** | **FAIL** | Equality/limits (§1), scoped receipts (§2), batches (§3), three clocks (§4), progress compatibility (§9) are each dedicated and decided; E-7's canonical encoding is fully specified and computable, verified empirically. The cancellation/terminal-obligations section (§6) does not decide the accepted-state consequence it owns. Same calibration the packet itself applied to `K01-R8-04` (an undecided clock case failed C2). Weakest of the three failures; clears with the single correction below. |
| **K0.1-C3** | **PASS** | Every record type C3 enumerates is classified, split where one label would misrepresent it: `MIG-1`–`MIG-5`, `LEG-1`–`LEG-5`, `REF-1`/`REF-3`/`REF-4`/`REF-5`. Exactly three labels; `LIM-1` correctly sits outside the table. I spot-verified the file/line evidence against the current tree — `context.ts:57-59`/`:200`/`:220`, `lifecycle.ts:16`/`:24-32`/`:46-54`, `types.ts:22`, `harness.ts:747-757`/`:762`/`:890-911`/`:938`/`:953-965` — all accurate at `6464be1`. |
| **K0.1-C4** | **PASS** | No new entity, lifecycle state, wire codec or storage engine. The timeout Event is argued as the *minimum*-concept answer (the alternative adds a second batch-member type and duplicates B-3/B-4/B-5 behind it), and its acceptance is named as a **boundary role** filled by existing boundaries, not a seventh row in kernel.md's table. Wait-ended readiness is scoped to the `recoverable readiness` that table already commits, representation left implementation-owned with the observable result pinned. |
| **K0.1-C5** | **FAIL** | §13 is unusually thorough and honest about worksheet-internal contradictions. But the §11-row-7-versus-`OA-4`/`OA-5` conflict is neither called out nor resolved, and `MIG-1` blesses current code's shape ("no behavioral change is needed to satisfy §6") without §6 ever stating the target rule — the precise pattern C5 forbids: resolving by picking whichever the current implementation already does. |
| **K0.1-C6** | **PASS** | Revision marker present and accurate (Revision 11); 408 relative links and 15 anchors resolve; rules are stated once and cited rather than paraphrased. One broken internal pointer (K01-R11-03, P3) does not defeat self-containment. |

## Findings

### K01-R11-01 — P2 — the cancel-versus-in-flight-Outcome race has no stated acceptance/rejection result

**Location.** `docs/development/work/K0.1/protocol-worksheet.md`
§11 row 7 (line 1538) and row 8 (line 1539); §6 `CX-1`/`CX-2` (lines 1265–1277);
§7 `OA-4` (1329) and `OA-5` (1340); §3 `B-3` (397) and `B-5` (411); §12 `MIG-1` (1604).

**Conflicting sources.**
- `docs/development/001-current-status-and-roadmap.md`, K0 **Exit**: "each input/Outcome/Effect/
  wake/**cancel** boundary has one authoritative owner and **an observable acceptance/rejection
  result**."
- `docs/kernel.md` Acceptance/atomicity, Outcome-acceptance row (all-or-nothing accepted set).
- `docs/detail-design/execution-protocol.md` Outcome-acceptance step 4, and "Malformed or stale
  Outcomes create no Effects, acknowledge no Events and commit no progress."

**Schedule.** Execution `E`. Activation `A` is dispatched with reserved batch `{e1}`; `E` is `RUNNING`.

- `T2` — a cancellation request is accepted for `E`. Per `MIG-1`'s own cited rationale a `RUNNING`
  Execution "cannot be interrupted mid-Activation", so the request is recorded and `E` is not yet
  terminal.
- `T3` — the Runtime submits a well-formed Outcome for `A`: `complete(result)`, progress `P`,
  emissions `M`, at the current epoch and base revision.

§11 row 7 says cancellation wins and "that Outcome's `complete`/`fail`/`continue` is **discarded** and
the Execution is `CANCELLED`". It says nothing about the rest of the Outcome. Three readings are each
reachable from the committed text, and at least two are observably different:

- **R1** — the cancel request makes `E` terminal at `T2`; the `T3` Outcome is *rejected* against a
  terminal Execution (`OA-5`). `e1` is never acknowledged, so at terminal it receives a `B-5`
  disposition. `P` not installed. Submitter sees a rejection.
- **R2** — cancellation stays pending; at `T3` the whole Outcome is *rejected*, then cancellation is
  applied. Same observable end state as R1.
- **R3** — at `T3` the Outcome is *accepted* and only its next state is overridden to `CANCELLED`.
  `e1` **is** acknowledged (`B-3`), so it gets **no** `B-5` disposition; `P` **is** installed at
  revision r+1; emissions suppressed. This is the shape of the current code (`harness.ts:953-965`,
  whose comment reads "every controller report loses, including complete/fail, and no emission is
  published") — and it is the shape `MIG-1` classifies **Migratable** with "no behavioral change …
  needed to satisfy §6".

R1/R2 and R3 disagree on three separately observable facts: whether `e1` carries a `B-5` terminal
disposition, whether progress `P` is part of accepted state, and what receipt a replay of that Outcome
returns under `OA-2`. `OA-5`'s rejection causes are enumerated as "malformed envelope, stale
epoch/revision, unresolvable wait reference" — cancellation is not among them — so `OA-5` does not
select R1/R2, while `OA-4`'s "one atomic step" does not authorise R3's partial acceptance either.

A secondary ambiguity sits inside the same gap: `CX-2` orders "cancellation **applied**, completion
accepted", while §11 row 7 orders by cancellation **request acceptance**. Under `MIG-1`'s cited
rationale "applied" happens at the safe boundary, i.e. inside the `T3` transaction, so the two rules
name different ordering points for the same race.

**Why it violates the contract.** K0.1-C1 requires each 001 K0 boundary to carry an assertion phrased
as an observable pass/fail; rows 7 and 8 do not resolve this schedule. 001 K0's exit clause demands an
"observable acceptance/rejection result" for the cancel boundary specifically. K0.1-C5 is violated
twice: an internal contradiction between §11 row 7 and §7's atomicity rules is not called out, and
`MIG-1` silently adopts the current implementation's answer. The consequence is not academic — `M-1`
names "row 7's cancel-vs-complete race" as one of the four unsafe/state-loss controls **K0.2's fixture
must include as a negative test**, and K0.2 cannot write that assertion against three readings. Two
K1.1 implementers can build R2 and R3 and both believe they conform.

**Smallest principled correction.** Add one decision to §6 — call it `CX-6` — stating, for an accepted
cancellation that precedes acceptance of an in-flight Activation's Outcome, exactly one answer to:
(a) whether that Outcome is *rejected* in `OA-5`'s sense or *accepted with next state overridden*;
(b) consequently whether its reserved batch is acknowledged (`B-3`) or falls to `B-5`; (c) whether
progress and accepted emissions are installed; and (d) what `OA-2` returns for a later exact
resubmission. Also name the single ordering point (request acceptance, or application at the safe
boundary) so `CX-2` and §11 row 7 agree. Then have §11 row 7's assertion and row 8's terminal-
obligation assertion cite `CX-6`, and align `MIG-1` so the current code's shape is classified *against
the stated target rule* rather than standing in for it. No canonical owner needs amending: kernel.md's
all-or-nothing Outcome acceptance and `CX-2`'s acceptance-order rule both admit a clean answer — the
decision is which one K0.1 takes, stated once. The reviewer expresses no preference between R1/R2 and
R3; either is defensible, and only the silence is a defect.

### K01-R11-02 — P3 — `B-8`'s "live" qualifier contradicts W-3 and §3's own exhaustiveness paragraph

**Location.** `protocol-worksheet.md:511` (`B-8`), against `:391` ("Rows 1–4 are exhaustive") and W-3's
"A generation is live exactly while the Execution is `WAITING`".

`B-8` reads "No boundary creates wait-ended readiness except one that retires a **live** wait
generation — rows 1–4 above and nothing else." But §3's own next paragraph states that W-3 fixes a live
generation as existing only while `WAITING`, "where only rows **2 and 4** can retire it" — rows 1 and 3
(`B-6` path A and `B-7` path A) retire a generation created and retired inside one Outcome-acceptance
transaction that never reaches `WAITING`, i.e. never live.

Read literally with W-3's definition, `B-8` denies readiness to rows 1 and 3 — under which an `await`
whose wake Event was already accepted would go *ordinarily* `READY`, and at batch bound 1 older
ineligible backlog could displace the wake, the exact defect `B-6` exists to prevent. The explicit
enumeration "rows 1–4 and nothing else" in the same clause makes the intended rule recoverable, so this
is inconsistent wording rather than a live protocol fork — but it is the same class of defect (a
qualifier claiming something different from what the rule delivers) that `K01-R9-01` corrected.

**Correction.** Drop "live" from `B-8`, or replace it with "a wait generation (live, or retired in its
own registration transaction)". One word.

### K01-R11-03 — P3 — `ID-6` points at a section that contains no boundary list

**Location.** `protocol-worksheet.md:259`.

`ID-6` reads "one of the six atomic boundaries in kernel.md's Acceptance/atomicity table (**§7's
boundary list**)". §7 is "Outcome acceptance algorithm, duplicates and conflicts" (`OA-1`–`OA-6`) and
contains no boundary enumeration — I grepped its full line range and found none. The six-boundary list
is in **`ID-7`**, immediately below `ID-6`.

**Correction.** Change the parenthetical to "(enumerated in `ID-7` below)".

### K01-R11-04 — P3 — `B-4`'s "when it becomes eligible" reads as a filter `B-2`'s ordinary case does not apply

**Location.** `protocol-worksheet.md:404-409` (`B-4`), against `B-2`'s ordinary-readiness bullet
(`:317-319`).

`B-4` says a retained Event "is included in a later batch **when it becomes eligible**". Eligibility is
a `WAITING`-time concept (W-1); under `B-2`'s ordinary readiness the batch is selected "from **all**
currently unacknowledged Events, in per-Execution acceptance order", with no eligibility filter. A
K1.1 implementer reading `B-4` alone could build a permanent eligibility gate that never releases an
Event no wait ever names. W-8 case 4 states the correct answer explicitly ("an ordinary candidate like
any other"), so the normative rule is recoverable, but `B-4` is the decision a reader reaches first.

**Correction.** Replace "when it becomes eligible" with "in a later batch — under `B-2`'s ordinary
readiness as an ordinary candidate, or under a wait-ended readiness if it is eligible under that
retired wait's rule".

## Things I attacked and could not break

Recorded so the owner can see the negative space, not to pad the review.

- **E-7 canonical form.** Re-derived every byte-affecting rule against ECMA-262 Number-to-String and
  RFC 8785 §3.2.2.3/§3.2.3, and every table byte count. The UTF-16-code-unit key order, the `+` in
  positive exponents, lowercase hex for C0 controls, raw `/` and raw non-ASCII all hold. The
  supplementary-plane counterexample is correct and is the right one to have chosen.
- **The wait/batch/clock state machine.** §3's four-row table, `B-6`/`B-7`'s two paths each, W-2's
  ordered four-step transaction and W-3's liveness rule compose without a gap I could find. I tested
  batch bound 1, empty mailbox, already-present Events, late Events, stale timers, duplicate timer
  delivery, timeout-then-result and result-then-timeout, subscription-only waits, inert alternatives,
  takeover with a pinned batch, and crash before reservation. Each has exactly one answer, and the
  acceptance-order tiebreak is grounded in kernel.md's per-Execution acceptance order.
- **The "mandatory member is always available at reservation" argument.** It holds: only an accepted
  Outcome acknowledges, at most one Activation may commit per Execution, and `OA-2` makes a duplicate
  Outcome non-acknowledging, so nothing can consume the member between readiness and reservation.
- **Application-input bypass.** The source-category-first rule genuinely closes it; a dependency
  alternative naming `external.input` is inert in both W-7 case 6 and W-1 well-formedness case 2, and
  the two lists do not reach into each other in either direction.
- **C4 pressure on the timeout Event and on wait-ended readiness.** Both are defensible as refinements
  of existing canonical vocabulary rather than new mandatory Kernel entities.
- **Structural well-formedness (Revision 10's correction) and Revision 11's own two corrections.** I
  verified no stale "select while `WAITING`" claim and no "consumes" wording survives anywhere.

## Process and evidence verdict — PASS

- **Candidate/branch identity:** verified; HEAD == `9202571f…`; remote branch matches.
- **Ancestry:** base is an ancestor of the candidate; 32 commits, all inspected.
- **Commit-identity convention (006 "Git and artifact handoff"):** correctly followed this round —
  administrative review record `5d72668`, then payload **C11 `b40cfe9`** (worksheet + contract only),
  then candidate **H11 `9202571`** containing *only* `implementation-11.md` and the single 007 status
  row. I diffed `C11..H11` and confirmed nothing else changed.
- **No executable/contract/evidence mutation after claimed validation:** confirmed. Nothing outside
  `docs/` changed cumulatively; no evidence file was added in H11 (round 3's defect is not repeated).
- **Reviewed history not rewritten:** every named C/H from rounds 1–10 is still a reachable ancestor,
  and each of the 21 `review-*.md`/`implementation-*.md` files was touched by exactly one commit.
- **Whitespace exception:** correctly bounded. I inspected `implementation-04.md:227` and `:235` — both
  are a single space then EOL, blank *context* lines inside a fenced verbatim `diff` block, exactly as
  the command plan describes. The strict cumulative run fails on those two lines and nothing else; the
  exception-limited run and the strict round-delta run both pass.
- **Report honesty:** `implementation-11.md` reports the strict run as exit 2 rather than green, does
  not self-certify acceptance, and its status row reads `WAITING_FOR_REVIEW`. Every validation claim I
  checked reproduced.
- **K0.2 not started:** `docs/development/work/` contains only `K0.1`; K0.2 and all successors remain
  `PLANNED`.

## Final outcome

**CHANGES REQUIRED**

One must-fix defect (`K01-R11-01`, P2) and three P3 corrections. Recorded packet state:
`CHANGES_REQUESTED` — correction resumes K0.1; K0.2 stays unreleased. Process, evidence and commit
choreography are sound and are **not** reopened.

## Owner-supplied supplemental adversarial findings

The owner supplied these findings after the independent review, stated they were independently
verified against H11, and required their resolution in the same correction round. They are **not
Claude reviewer findings**. No second reviewer identity is invented for this supplement.

| ID | Severity | H11 source / defect | Required correction |
|---|---|---|---|
| K01-O12-01 | P2 | Worksheet E-6: deepest-scalar depth is undefined for empty-container trees | Total recursive depth: scalars 0, empty containers 1, non-empty containers 1 + maximum child-value depth; names add no level; 32 passes, 33 rejects. |
| K01-O12-02 | P2 | Worksheet E-6: string bound does not explicitly cover member names | Every decoded string value and object member name has at most 65,536 Unicode scalars, before escaping; key ordering remains UTF-16 code-unit based. |
| K01-O12-03 | P2 | Worksheet E-1/E-6 and contract C2: field/value/envelope terminology leaves the size root ambiguous | Check canonical bytes independently for each E-1 boundary-value root, at most 1,048,576 bytes; no aggregate Activation/Outcome cap. |

## Complete owner-delivered correction instructions (verbatim)

The following is the complete owner request, recorded as provenance and correction scope.

````text
Continue correcting the SAME ArrokothI agent-kernel packet K0.1.

This is Round 12. Do not start K0.2.

Repository:
[https://github.com/ArrokothI/agent-kernel](https://github.com/ArrokothI/agent-kernel)

Branch:
codex/k0.1-protocol-legacy-disposition

Reviewed candidate:
H11 = 9202571f21e97a51c119b0324f3d279f8772ca9c

Validated H11 payload:
C11 = b40cfe968c8e0d2111a88df68c68f64fd02a4be3

Integration base:
6464be12c11eb75f7dfbc5ece12ca8d3020a5c15

IMPORTANT:
Preserve H11 and all earlier history exactly.
No amend.
No rebase.
No force push.
No editing prior review/implementation reports.
No packages/tests/runtime implementation changes.
No K0.2 work.

There are TWO sources of valid Round-11 feedback to incorporate:

A. The Claude Opus 5 independent review:
- K01-R11-01 P2 — cancel-versus-in-flight-Outcome acceptance semantics are incomplete.
- K01-R11-02 P3 — B-8 incorrectly says all rows 1–4 retire a “live” generation.
- K01-R11-03 P3 — ID-6 has a bad internal cross-reference.
- K01-R11-04 P3 — B-4’s “when it becomes eligible” wording conflicts with ordinary READY batching.

B. Owner-supplied supplemental adversarial findings, independently verified against H11:
- K01-O12-01 P2 — E-6 nesting depth is undefined for empty-container trees.
- K01-O12-02 P2 — E-6 does not say whether object member names are covered by the per-string bound.
- K01-O12-03 P2 — E-1/E-6/contract C2 use field/value/envelope terminology inconsistently, leaving the 1 MiB accounting root ambiguous.

Do NOT incorporate the separate review that discusses
`docs/protocol/k0.1-schedule-surface.md`, live-tail cursors,
`docs/process.md`, `docs/principles.md`, or payload `aef2c0f...`.
That review did not inspect this H11 repository state and is out of scope.

============================================================
1. REQUIRED READING AND PRECEDENCE
============================================================

Before editing, read:

- AGENTS.md
- docs/README.md
- docs/mental-model.md
- docs/kernel.md
- docs/execution.md
- docs/detail-design/execution-protocol.md
- docs/detail-design/recovery-and-compatibility.md
- docs/detail-design/evidence-and-observability.md
- docs/development/001-current-status-and-roadmap.md
- docs/development/006-development-process.md
- docs/development/007-work-packets.md
- docs/development/008-implementation-report.md
- docs/development/work/K0.1/contract.md
- docs/development/work/K0.1/protocol-worksheet.md
- implementation-11.md
- the delivered Round-11 independent review

Architecture/detail design outrank development worksheet/current code.
Current code is migration evidence, never the target semantic owner.

If canonical architecture actually conflicts on a required choice, stop with:
BLOCKED — ARCHITECTURE DECISION

Do not guess merely to obtain review readiness.

============================================================
2. ADMINISTRATIVE REVIEW RECORD FIRST
============================================================

From exact H11, first create the Round-11 administrative review-record commit.

Create:
docs/development/work/K0.1/review-11.md

Update only:
docs/development/007-work-packets.md
K0.1 -> CHANGES_REQUESTED

review-11.md must faithfully record the Claude Opus 5 independent review:
- reviewer/model
- date
- base
- C11
- H11
- access and rerun information
- criterion verdicts
- K01-R11-01 through K01-R11-04
- source references
- final CHANGES REQUIRED
- the complete owner-delivered correction instructions

Then add a clearly labelled section:
“Owner-supplied supplemental adversarial findings”

Record K01-O12-01 through K01-O12-03 there.
Do NOT pretend they were findings of the Claude reviewer.
Do NOT invent a second-reviewer identity.
State that the owner supplied them after the independent review and required
them to be resolved in the same correction round.

This administrative commit may change ONLY:
- review-11.md
- docs/development/007-work-packets.md

============================================================
3. CANCELLATION: K01-R11-01
============================================================

Fix the cancel-versus-in-flight-Outcome race deterministically.

Canonical direction:

- Cancellation REQUEST ACCEPTANCE is the semantic ordering point.
- Once cancellation is accepted, it fences further Runtime progress.
- Physical/native interruption may happen later at a safe boundary; that does
  not defer the semantic fence.
- Therefore, if cancellation acceptance precedes acceptance of the current
  Activation’s Outcome, that later Outcome LOSES.

The losing Outcome is NOT “partly accepted with next state overridden.”

It must:
- be rejected with an explicit inspectable cancellation/terminal-conflict reason;
- acknowledge NONE of its reserved Event batch;
- install NO Runtime progress;
- accept NO emissions;
- accept NO Effect intents;
- create NO wait/deadline/next-state transition;
- never reopen or otherwise alter the cancellation winner.

When cancellation reaches terminal CANCELLED state, the still-unacknowledged
reserved Events receive B-5 terminal disposition.

For a repeated exact submission of this rejected losing Outcome:
- OA-2’s “return the original accepted receipt” rule does NOT apply, because
  the Outcome was never accepted;
- define one deterministic recorded-rejection behavior, e.g. replay/return the
  same recorded rejection classification/reason;
- it must never become accepted merely because it is retried after cancellation.

If the Outcome acceptance commits first:
- it commits atomically under the normal OA rules;
- a later cancellation is ordered against the resulting accepted state;
- terminal completion/failure cannot be reopened.

Align all relevant text:
- CX-1
- CX-2
- add CX-6 or equivalent dedicated decision
- OA-3 / OA-4 / OA-5 as needed
- B-3
- B-5
- §11 row 7
- §11 row 8 where applicable
- M-1 fixture obligation
- §13
- revision history

MIG-1 MUST be corrected.

The current implementation’s useful migratable property is only the
safe-boundary cancellation-check/order pattern.

Do NOT retain the current claim:
“no behavioral change is needed to satisfy §6”

Current 0.8.x applyOutcome can carry `outcome.control` into the cancelled
context while suppressing the reported next state. That is current-code
behavior, not the target acceptance rule above.

Classify MIG-1 against the now-explicit target:
- safe-boundary/pending-control mechanism may be reusable;
- accepting/installing Runtime progress from the losing Outcome is NOT.

Do not introduce a new lifecycle state.

============================================================
4. K01-R11-02 — B-8 “LIVE” QUALIFIER
============================================================

B-8 currently says wait-ended readiness only comes from a boundary retiring a
“live” generation, while rows 1 and 3 create and retire their generation inside
the registration Outcome transaction and never persist WAITING.

Correct the wording without changing the state machine.

Use wording equivalent to:

“No boundary creates wait-ended readiness except one that retires a wait
generation — either a live generation while WAITING, or a generation created
and retired within its own registration transaction — rows 1–4 above and
nothing else.”

Preserve:
- W-3 live-generation semantics
- rows 1–4
- B-6/B-7
- readiness lifetime/recovery

============================================================
5. K01-R11-03 — ID-6 CROSS-REFERENCE
============================================================

ID-6 currently says:
“§7’s boundary list”

That is wrong.

Change it to:
“the six atomic boundaries enumerated in ID-7 below”
or equivalent.

No semantic redesign.

============================================================
6. K01-R11-04 — B-4 ORDINARY READINESS
============================================================

B-4 currently says an unmatched retained Event is included later “when it
becomes eligible.”

That incorrectly suggests W-1 wait eligibility gates ordinary READY batching.

Replace it with wording equivalent to:

“An Event not selected in the current batch remains queued with its own
disposition. It is a later ordinary candidate under B-2’s ordinary-READY rule,
or, when a wait-ended readiness is being consumed, a candidate only if it is
eligible under that retired wait’s rule.”

Preserve:
- ordinary READY selects from all currently unacknowledged Events, to the bound;
- wait-ended READY uses the retired wait’s restricted rule;
- no global cursor semantics.

============================================================
7. K01-O12-01 — TOTAL NESTING-DEPTH DEFINITION
============================================================

E-6 currently defines depth as boundaries from the root to its “deepest
scalar,” which has no value for an empty container.

Replace it with a total recursive definition over every E-1 value:

- scalar (`null`, boolean, number, string): depth = 0
- empty array or object: depth = 1
- non-empty array:
  depth = 1 + max(depth(element))
- non-empty object:
  depth = 1 + max(depth(member value))
- object member NAMES do not add a nesting level

The limit remains:
depth <= 32

Add deterministic boundary examples:
- exactly 32 nested empty containers -> PASS
- exactly 33 nested empty containers -> REJECT
- include an alternating object/array example if useful to prove container
  spelling does not change the counting rule.

Be exact about what “32 nested containers” means so there is no off-by-one
ambiguity.

============================================================
8. K01-O12-02 — STRING LIMIT INCLUDES OBJECT MEMBER NAMES
============================================================

Make the 65,536 Unicode-scalar limit apply to EVERY decoded string in the
canonical value model, including:
- string values
- object member names

Counting is performed on the decoded Unicode string BEFORE E-7 escaping or
UTF-8 serialization.

Object-key sorting remains E-7’s separate UTF-16-code-unit ordering rule.
Do not conflate ordering units with length-counting units.

Add exact cases:
- object member name of 65,536 Unicode scalar values -> PASS
- object member name of 65,537 Unicode scalar values -> REJECT

Subject, of course, to the other simultaneous E-6 limits.

Rename “String field length” if necessary to something unambiguous such as:
“Decoded string length (values and object member names)”

============================================================
9. K01-O12-03 — EXACT 1 MiB ACCOUNTING ROOT
============================================================

Resolve E-1/E-6/C2 terminology explicitly.

Use the existing E-1 scope as the target:

The 1,048,576-byte canonical-size bound is a PER-BOUNDARY-VALUE-ROOT bound,
NOT a second aggregate whole-Activation/whole-Outcome envelope limit.

A “boundary-value root” for this rule is each logical value E-1 identifies,
including:
- an individual Activation/Outcome envelope VALUE FIELD governed by E-1;
- an Effect proposal value;
- an Event payload value;
- any other value explicitly brought under E-1 by the protocol.

For each such root:
canonicalize that root under E-7;
its canonical byte length must be <= 1,048,576 bytes.

Do NOT sum sibling Activation/Outcome fields together for this E-6 bound.

This means the adversarial example:
- progress canonical size ~700 KiB
- emissions field canonical size ~700 KiB
- complete Outcome >1 MiB in aggregate

is NOT rejected merely because the aggregate logical Outcome exceeds 1 MiB,
provided every E-1 boundary-value root and every other structural/schema bound
passes.

State this result explicitly.

Why this direction:
- it matches E-1’s existing “boundary value (Activation/Outcome envelope field,
  Effect proposal, Event payload)” scope;
- it does not accidentally create a new aggregate envelope restriction that
  could make a legal near-limit Event payload impossible to place into an
  Activation once envelope metadata is counted;
- transport framing/wire byte length remains implementation-owned.

Rename misleading terminology:
- prefer “Canonical boundary-value size”
over
- “Canonical envelope size”

Update contract K0.1-C2 correspondingly:
replace ambiguous “canonical envelope bytes” language with exact
“canonical bytes of each E-1 boundary-value root” terminology.

Do NOT introduce a new aggregate wire/message-size guarantee in K0.1.
A later implementation/deployment may impose smaller transport/request limits,
but such limits must not change the K0 semantic equality/value-validity result
unless versioned into the protocol.

If you find a HIGHER-PRIORITY canonical source that explicitly requires the
same 1 MiB number to cap the complete Activation/Outcome envelope, STOP with
BLOCKED — ARCHITECTURE DECISION rather than silently changing this direction.

============================================================
10. ADVERSARIAL CROSS-CHECK BEFORE C12
============================================================

Before committing C12, search the CURRENT worksheet and contract for all
normative occurrences of:

cancel
cancellation
pending
applied
terminal
discarded
Outcome
acknowledge
progress
emission
B-3
B-5
CX-
OA-
MIG-1

depth
nesting
deepest scalar
string field
string length
member name
object key
65,536
canonical envelope
canonical size
boundary value
1,048,576
1 MiB
bounded value

For every occurrence check that there is only one answer.

At minimum run these semantic counterexamples mentally and record their answers
in implementation-12.md:

A. Cancellation accepted while Activation A RUNNING, then A submits continue.
   -> Outcome rejected; no ack/progress/emissions; cancellation wins.

B. Same but A submits complete.
   -> same losing-Outcome acceptance result; no partial commit.

C. Outcome complete accepted first, then cancellation arrives.
   -> accepted completion remains terminal; cancellation cannot reopen it.

D. Cancel accepted, losing Outcome exact retry.
   -> deterministic recorded rejection result, never acceptance receipt.

E. 32 nested empty arrays.
   -> valid depth.

F. 33 nested empty arrays.
   -> rejected for depth.

G. object key length 65,536 Unicode scalars.
   -> valid for string-length rule.

H. object key length 65,537 Unicode scalars.
   -> rejected.

I. progress ~700 KiB and emissions field ~700 KiB, aggregate Outcome >1 MiB.
   -> not rejected solely for aggregate size; each E-1 root is checked
      independently.

J. one Event payload whose canonical form is exactly 1 MiB and otherwise valid.
   -> passes E-6 size boundary.

K. one Event payload 1 byte over the canonical limit.
   -> rejected before acceptance.

If another genuine K0.1 contradiction is discovered during this pass and its
answer follows unambiguously from canonical owners, fix it in C12 and record it
as implementer-discovered.

If it requires a new architecture choice, stop:
BLOCKED — ARCHITECTURE DECISION

Do not knowingly defer a K0.1 contradiction to another review round.

============================================================
11. NON-REGRESSION
============================================================

Do not casually rewrite already-settled semantics.

Preserve:
- Activation ID on takeover; writer epoch advances
- Runtime-local promise is not Kernel WAITING
- B-1 Event-only batches
- B-2 ordinary vs wait-ended READY selection
- no dispatch/select while WAITING
- B-6/B-7 two-path semantics
- timeout is a semantic Kernel Event
- W-1 source-category eligibility
- W-1 structural well-formedness
- W-2 atomic registration algorithm
- result-before-wait behavior
- wait generation fencing
- timeout/result ordering including bound 1
- cancellation after wait retirement before reservation terminally suppresses
  that Activation
- child routing obligation != destination Event acceptance
- whole-batch acknowledgment only by accepted Outcome
- E-7 RFC8785/JCS rules
- exact finite values other than the clarifications above
- K1 Effect whole-envelope refusal
- progress compatibility decisions
- exactly three legacy labels
- MIG-5/REF-5
- owner-approved historical whitespace exception
- K0.2 remains PLANNED/unreleased

============================================================
12. C12 PAYLOAD SCOPE
============================================================

After the administrative review-record commit, create C12.

C12 itself may change ONLY:

- docs/development/work/K0.1/contract.md
- docs/development/work/K0.1/protocol-worksheet.md

No runtime code.
No tests.
No scripts.
No canonical architecture docs.
No new evidence files.
No dependency changes.

Update:
- worksheet Revision 12 marker
- revision history
- §13 contradiction/correction ledger
- contract correction history

Clearly distinguish:
- Claude reviewer findings K01-R11-01..04
- owner-supplied supplemental findings K01-O12-01..03
- any implementer-discovered issue, if one appears

============================================================
13. VALIDATION ON CLEAN C12
============================================================

Commit C12 first.

Ensure tree clean.

Then run:

1. npm run check:builder-docs

2. npm run typecheck

3. strict cumulative:
   git diff --check \
     6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 \
     <C12>

Expected nonzero ONLY for the two already-approved immutable historical
blank-at-EOL findings:
- implementation-04.md:227
- implementation-04.md:235

No other finding is permitted.

4. cumulative with only historical blank-at-EOL class disabled:
   git -c core.whitespace=-blank-at-eol diff --check \
     6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 \
     <C12>

Must exit 0.

5. strict new-round delta:
   git diff --check \
     9202571f21e97a51c119b0324f3d279f8772ca9c \
     <C12>

Must exit 0 with NO exception.

6. Run the existing K0.1 link/anchor audit.

7. Review:
   git diff --stat <base> <C12>
   git diff --stat <H11> <C12>
   git diff --name-only <H11> <C12>

8. git status --porcelain
   Must be empty.

9. Explicit preservation checks:
   - H11 is ancestor
   - every prior review/implementation/evidence blob unchanged
   - review-11 administrative blob unchanged after its commit
   - C12 payload after admin commit is exactly contract + worksheet

npm test remains unnecessary because this is documentation-only and no
packages/tests changed.

Do not add tracked evidence files/scripts after validating C12.

============================================================
14. H12 REPORT / STATUS COMMIT
============================================================

After clean-C12 validation, create:

docs/development/work/K0.1/implementation-12.md

Update only:
docs/development/007-work-packets.md
K0.1 -> WAITING_FOR_REVIEW

implementation-12.md must include:

- base
- H11
- review-11 admin SHA
- C12
- H12 convention
- branch
- scope
- clean-tree statement
- exact validation commands/output/exit codes
- historical-whitespace exception wording
- disposition of each:
  K01-R11-01
  K01-R11-02
  K01-R11-03
  K01-R11-04
  K01-O12-01
  K01-O12-02
  K01-O12-03
- adversarial cases A–K and their final answers
- any implementer-discovered issue separately labelled
- no acceptance claim
- K0.2 remains unreleased

C12..H12 must contain exactly:
- implementation-12.md
- docs/development/007-work-packets.md

============================================================
15. PUSH
============================================================

Push fast-forward only.

No force.

Verify remote advertised branch SHA equals H12.

Return:

- base full SHA
- H11 full SHA
- review-11 administrative commit SHA
- C12 full SHA
- H12 full SHA
- remote advertised SHA
- clean-tree state
- base..H12 scope
- H11..C12 scope
- admin..C12 payload scope
- C12..H12 admin scope
- validation observations
- any additional defect discovered

Do not merge.
Do not mark ACCEPTED.
Do not start K0.2.
````
