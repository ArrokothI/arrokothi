# Implementation report — K0.1, round 7 (correction)

## Identity and status

- Packet / parent milestone: **K0.1** / **K0**; [contract.md](contract.md) (corrected this round);
  worksheet [protocol-worksheet.md](protocol-worksheet.md) **Revision 7**.
- State: **WAITING_FOR_REVIEW**
- Correcting: [review-06.md](review-06.md)'s CHANGES REQUIRED outcome, findings **K01-R6-01 (P1)** and
  **K01-R6-02 (P2)**, against reviewed candidate H6 `c5bdd481134cf3691050b16dd6dd3a49aa9ab042`
  (payload C6 `4a015b316d604f501a9895e85c627b7d0ba0edfd`, base `6464be1`).
- Base commit (unchanged since round 1): `6464be12c11eb75f7dfbc5ece12ca8d3020a5c15`
- Reviewed candidates, all preserved and none rewritten: H `857fa05a8a72a4c6f4f294f9e775a0dc1f7919dc`,
  H2 `cc61e74455534abf896c46632246615185219b92`, H3 `aef1e33ba944a0647bb2319fb97ae40b18b05924`,
  H4 `a068e2f6c8d67e5e3e2512c765b29427acb4ac68`, H5 `d0dbc4800c10dad68a8b4b6c662bf90c963fd926`,
  H6 `c5bdd481134cf3691050b16dd6dd3a49aa9ab042`.
- Round-7 review record commit (adds [review-06.md](review-06.md); ledger → CHANGES_REQUESTED):
  `6b9a66d448e762744c6e473f104754de5c81984c`
- **Correction payload C7: `fdac4ccdce5e674c9aba43b645b8061ca7578526`**
- Candidate H7: the commit containing this report and the ledger status edit, and **nothing else**;
  full SHA supplied in the handoff (per 006, H cannot name itself).
- Branch / remote: `codex/k0.1-protocol-legacy-disposition` / `origin`
  (`https://github.com/ArrokothI/Agent_SDK.git`; GitHub reports it moved to
  `https://github.com/ArrokothI/agent-kernel.git` — the configured URL is deliberately left unchanged).
- Working tree: verified clean at C7 **before** validation ran; nothing was written into the repository
  afterwards. Round 7 adds **no** evidence file, directory or script.
- History: every prior commit, report, review and evidence artifact is preserved unedited — verified
  file by file in `09-history-preserved` below, including `implementation-04.md` and
  `implementation-06.md` byte-for-byte.

**Blob identities confirmed.** [review-06.md](review-06.md) pins the four artifacts it inspected by
blob SHA at H6. All four were checked against H6's tree before this correction began and all four
match: `contract.md` `70350d75627f040ce25fca605c322024a43d577b`, `protocol-worksheet.md`
`4079effad29bbeef33ded38783706396f70a0c3e`, `review-05.md` `fd75cde77f3e21c291a5064aebe818a09ccb6341`,
`implementation-06.md` `99768ff09dde8267f3e25e623aac3cbca2bdbe68`. The review and this correction are
therefore demonstrably about the same bytes.

## Round-7 commit sequence

| Step | Commit | Contents |
|---|---|---|
| Administrative review record | `6b9a66d448e762744c6e473f104754de5c81984c` | `review-06.md` + the 007 K0.1 status row → `CHANGES_REQUESTED`. No payload. |
| Payload **C7** | `fdac4ccdce5e674c9aba43b645b8061ca7578526` | `contract.md` + `protocol-worksheet.md` only. |
| Final validation | — | Run against the clean C7 tree, after C7 existed. |
| Candidate **H7** | the commit containing this report | `implementation-07.md` + the 007 K0.1 status row → `WAITING_FOR_REVIEW`. Nothing else. |

## The two `B-6` acceptance paths, stated explicitly

[review-06.md](review-06.md) requires this report to distinguish them, so they are set out here before
the disposition tables. They differ in **which boundary commits the readiness**; they are identical in
what it contains and in everything that follows.

| | **Path A** | **Path B** |
|---|---|---|
| Situation | The eligible Event is **already accepted and unacknowledged** when the Outcome registering the wait is accepted | No eligible Event existed at registration, so the Execution became `WAITING`; an eligible Event is accepted **later** |
| Is there an Outcome? | **Yes** — the one registering the wait | **No.** The Runtime is not running and submits nothing |
| Authoritative acceptance boundary | **Outcome acceptance** | **The boundary that accepts that Event**: creation/input ingress (application input), Effect settlement (settlement), or the authoritative fulfillment/routing boundary (child/message result) |
| Canonical text that already carries readiness there | "commit progress, accepted emissions, all Effect intents, next state and **recoverable readiness**" (kernel.md); "next state, wait/deadline and **recoverable readiness**" (execution-protocol.md step 4) | "mailbox entry, **with readiness when applicable**"; "Authenticated evidence, action state, **result Event and recoverable readiness**"; "Idempotent creation/routing obligation and parent correlation/budget reservation; fulfillment cannot lose the link" (all kernel.md) |
| Does the Execution ever reach `WAITING`? | No | Yes, and it leaves `WAITING` at this boundary |
| Governing crash window | *Outcome accepted before receipt* | *Input commit before scheduler notification*; *Settlement committed before wake* |
| Worked example | §5 W-8 case 1's immediate-`READY` branch | §5 W-7 case 4; §5 W-8 cases 2–4 |

Two rules bind both paths and every row of path B: **never** accept the Event durably and depend on a
later unjournaled wake write, and **no later Runtime Outcome is needed** to make the `READY` state
durable. Revision 6 said the two paths "both create wake-triggered readiness identically" and that it
is committed "with the accepted Outcome" — true of A, and on B naming a boundary that does not exist.

## Findings — individual disposition

### K01-R6-01 (P1) — correct `B-6`'s acceptance-boundary atomicity — **Fixed**

| Sub-requirement from the finding | Where it is now satisfied | What it says |
|---|---|---|
| The two creation paths must remain separate | §3 **`B-6`** *When it is created — two paths, at two different acceptance boundaries* | Replaces "both create wake-triggered readiness identically"; the shared three-step transaction is stated once, then each path names its own boundary. |
| Path A: Outcome-acceptance transaction runs W-2's check; on a hit it retires the wait, sets `READY`, commits the readiness in **that** boundary | §3 **`B-6`** *Path A* | Stated in those terms, with the kernel.md and execution-protocol.md quotations that already put recoverable readiness in that boundary, and "Nothing new is added to it." |
| Path B: **no new Outcome** at this point | §3 **`B-6`** *Path B*, first sentence | "**There is no new Outcome at this point** — the Runtime is not running and submits nothing." |
| Path B: the Event's authoritative boundary accepts the Event/mailbox fact and the readiness atomically together | §3 **`B-6`** *Path B* | "it must accept the Event/mailbox fact **and** the wake-triggered readiness **atomically together**." |
| Ordinary application input → creation/input ingress's "mailbox entry, with readiness when applicable" | §3 **`B-6`** *Path B* table, row 1 | Quoted verbatim from kernel.md's Acceptance/atomicity table. |
| Effect settlement → "result Event and recoverable readiness" | §3 **`B-6`** *Path B* table, row 2 | Quoted verbatim, with the K1 scope note that Effects are refused until K2 (§8 `EF-1`). |
| Child/message/result → their authoritative accepted fulfillment/routing boundary, consistent with kernel.md and the recovery contract | §3 **`B-6`** *Path B* table, row 3 | Cites the Child/message operation row ("fulfillment cannot lose the link") read together with kernel.md's rule that a terminal result is "committed with the terminal result or a durable routing intent." |
| Never accept the Event durably and depend on a later unjournaled wake write | §3 **`B-6`**, first rule under the *Path B* table | Tied to execution-protocol.md's "Never rely on an unjournaled enqueue after commit," with the consequence named: the difference between losing a notification (recoverable) and losing the reason the next batch must be selective (not recoverable). |
| No later Runtime Outcome is needed to make this `READY` durable | §3 **`B-6`**, second rule | "Path B completes without the Runtime being involved at all; the next Outcome is a *consequence* of the readiness, never a precondition for it." |
| *When it is created* and *Recovery* say "the authoritative acceptance boundary," not "the accepted Outcome" | §3 **`B-6`** both paragraphs | *Recovery* now opens "committed by **the authoritative acceptance boundary that creates it**" and explicitly names revision 6's phrasing as covering path A only. |
| Correct implementation/revision-history prose **prospectively**; preserve `implementation-06.md` unchanged | Revision-history entry **Revision 7**; §13's round-5 entry | `implementation-06.md` is byte-identical (`09-history-preserved`). The Revision 6 history entry is left as the accurate account of what revision 6 did; Revision 7 states the correction. §13's round-5 entry, which is a live ledger rather than a historical report, had its "kernel.md's Acceptance/atomicity table and execution-protocol.md's acceptance step 4" phrasing generalised to "the relevant canonical acceptance boundary … whichever boundary applies," pointing forward to the round-6 entry. |
| Use the crash-window rules explicitly | §3 **`B-6`** *Recovery* table | Four rows, each naming the recovery-and-compatibility.md window and what it requires here: *Input commit before scheduler notification* → "Reconstruct READY from accepted input/wait state" → reconstruct a **wake-triggered** `READY`, not a generic one; *Settlement committed before wake* → "Reconstruct Event/readiness from accepted records"; plus *Outcome accepted before receipt* for path A and *Dispatch intent before send* for the post-reservation state. |
| Lifetime: survives a crash before reservation | §3 **`B-6`** *Lifetime*, first bullet | "Having been committed by the authoritative acceptance boundary above, it is accepted truth; a restart reconstructs it rather than losing it." |
| Lifetime: consumed when the batch is **durably reserved** | §3 **`B-6`** *Lifetime*, second bullet | Consumption is tied to B-1's "explicit, finite, enumerable set of Event references pinned at dispatch time," at the Activation-dispatch-intent boundary — "not Outcome acceptance and not an in-memory hand-off." |
| Lifetime: after reservation the pinned intent/batch suffices for replay/takeover, and `B-6` must not re-arm | §3 **`B-6`** *Lifetime*, third bullet | Grounded in *Dispatch intent before send*'s "same immutable Activation": "Re-arming `B-6` after reservation would let a takeover recompute a batch, which is precisely what that window forbids." |
| No second wait type, no per-alternative satisfaction state | §3 **`B-6`** *What this is not* (unchanged from revision 6) | Both bullets stand; the two-path split changes only which boundary commits, never what is committed. |
| Materialized eligible-Event set must preserve B-2's exact observable selection semantics through reservation | §3 *Left open (implementation-owned)* → **A representation may not weaken the selector semantics** | Names the specific way it can go wrong: an eligible Event accepted *after* the readiness is created and *before* reservation. B-2's rule is defined over Events unacknowledged **at selection time**, so a set materialized once at wake and never updated could, at a small bound, yield a different batch than the selector would. Conforming options: maintain the set as further eligible Events are accepted, or re-evaluate the selector at reservation. "A stale snapshot is not." |

### K01-R6-02 (P2) — make empty kind-set semantics normative in W-1 — **Fixed**

The rule now lives in the grammar, and `MIG-5` carries only the encoding translation. The report's own
round-6 *Reviewer focus* note raised exactly this question; the finding answers it, and the answer is
implemented.

| Sub-requirement from the finding | Where it is now satisfied |
|---|---|
| Event identity selector: optional exact identity | §5 **W-1** grammar table, row 1 (unchanged) |
| Kind selector: optional one kind **or NON-EMPTY finite set** | §5 **W-1** grammar table, row 2 — "one Event kind, **or** a **non-empty** finite set of kinds" |
| Correlation selector: optional exact correlation identity | §5 **W-1** grammar table, row 3 (unchanged) |
| At least one selector dimension must be present | §5 **W-1**, at-least-one bullet (unchanged) |
| **Empty finite kind set is not a valid supplied Kind selector in the target grammar** | §5 **W-1**, new bullet |
| The rule is normative **in W-1**, not only in `MIG-5` | §5 **W-1**, same bullet: "This rule is normative **here**, in W-1, because W-1 is the grammar; §12's `MIG-5` describes only how the current 0.8.x encoding maps onto it, and carries no validation rule of its own. Revision 6 had it the other way round, which put a normative constraint in a legacy classification row." |
| legacy `eventKinds: []` means "Kind selector absent", because the source says so | §12 **`MIG-5`**, *The encoding mapping* — cited to the source's own docstring, "Empty means 'any Event addressed to me'" (`event-envelope.ts:75`) |
| legacy `correlationId: null` means "Correlation selector absent" | §12 **`MIG-5`** — cited to `eventSatisfiesWake` skipping the comparison when it is null (`event-envelope.ts:84`) |
| `MIG-5` stops carrying a pseudo-normative validation rule | §12 **`MIG-5`**: "this row states the translation and carries **no validation rule of its own** — validity is W-1's, exclusively." Revision 6's "K1 must reject …" sentence is gone. |

The five deterministic examples are a worked list inside `MIG-5`'s *encoding mapping*, kept together so
the two spellings of `[]` can never be confused:

| # | Encoding | Maps to | Valid? |
|---|---|---|---|
| 1 | legacy `eventKinds: []` + `correlationId: null` | no selector field supplied | **invalid** under W-1's at-least-one rule — the over-matching spelling W-8 rejects, and the only legacy shape with no valid target alternative |
| 2 | legacy `eventKinds: []` + `correlationId: c1` | correlation-only alternative | **valid**; matches correlation `c1` regardless of kind |
| 3 | legacy `eventKinds: ["child.result"]` + `correlationId: null` | kind-only alternative | **valid** |
| 4 | legacy `eventKinds: ["child.result"]` + `correlationId: c1` | conjunction of Kind and Correlation | **valid** |
| 5 | a **target** Kind-set field supplied as `[]` | — (not a legacy encoding) | **invalid before matching** (W-1); listed here so the target-side `[]` is never read as the legacy sentinel |

Exact Event identity still requires the additional ordinary equality check `MIG-5` already described,
unchanged. The recheck of the three neighbours was done: **`REF-5`** gained a clause recording that the
record's *sentinel-encoded absence* does not carry over either — "the record uses in-band sentinels …
where the target grammar expresses absence by not supplying the field at all, which is why `MIG-5`
states a translation rather than a straight adoption" — and **§11 row 5** now states the non-empty
constraint inline ("kind — one kind or a **non-empty** finite kind set, an empty set being invalid
before matching").

## Cumulative consistency pass (required by [review-06.md](review-06.md))

| Check | Result |
|---|---|
| B-2 / `B-6` / W-1 / W-2 / W-7 / W-8 and §11 row 5 describe the same wake → `READY` → dispatch **crash-safe** protocol | **PASS.** One selection rule (B-2), one readiness mechanism (`B-6`) with two named boundaries, one consumption point (durable reservation), and the same four crash windows referenced wherever durability is claimed. W-1's retire paragraph, W-2, W-7 case 4 and W-8 cases 1 and 3 each now name the path and boundary that applies to them rather than saying "the wake records …". |
| Input ingress, settlement and Outcome acceptance are **not conflated** | **PASS.** They appear as three distinct rows of `B-6`'s path-B table plus path A, each quoted from its own row of kernel.md's Acceptance/atomicity table. Mechanically checked: the two remaining occurrences of "committed with the accepted Outcome" in the worksheet are both **quotations of the superseded wording** — one in §13's round-6 entry, one in the Revision 7 history entry — and both are explicit withdrawals. |
| W-1 and `MIG-5` have one exact **encoding-independent** selector meaning | **PASS.** W-1 defines the three fields and their validity with no reference to any encoding; `MIG-5` translates one concrete encoding onto them and asserts no validity of its own. The words "absent" and "supplied" carry the meaning in both, and the sentinel values appear only on the `MIG-5` side. |
| Activation-ID takeover identity | **PASS, unchanged.** §2 is outside every hunk of this round's diff; ID-9's "advances the writer epoch under the **same** Activation ID rather than minting a new one" is present and unmodified. |
| Runtime-local promises not reintroduced as Kernel waits | **PASS.** W-4 is untouched; `B-6`'s two-path split changes only which boundary commits an existing field. |
| K1 Effect-refusal boundary | **PASS.** §8 is untouched. `B-6`'s settlement row carries an explicit K1 scope note rather than implying Effects exist in K1. |
| Canonical encoding (E-7 / JCS) | **PASS, untouched.** §1 spans worksheet lines 29–227 and the diff's first hunk after the revision marker begins at line 355. |
| Progress decisions (PC-1 / `MIG-3` / `LEG-4`) | **PASS, untouched.** §9 is outside every hunk, and `MIG-3` and `LEG-4` are byte-identical — verified row by row against H6, where only `MIG-5` and `REF-5` changed. |
| Legacy classification vocabulary | **PASS.** Still exactly three labels; `MIG-5` remains **Migratable** and `REF-5` remains **Refused**; `LIM-1` remains outside the table. |
| Historical-evidence decisions | **PASS.** `implementation-04.md` byte-identical, the command-plan exception text unmodified, and this round's only `contract.md` change is the round-6 entry in the correction history. |
| Scope not broadened | **PASS.** The correction delta touches `contract.md`, `protocol-worksheet.md` and `review-06.md` (plus the ledger row in the administrative commits). No `packages/`, no `tests/`, no canonical doc, no new packet. |

## Validation

All commands ran at **C7 `fdac4ccdce5e674c9aba43b645b8061ca7578526`** with the working tree verified
clean. Output was captured outside the repository and is reproduced verbatim below. **Round 7 added no
evidence file, directory or script to the repository**, and this report contains **no unified-diff
context lines**, so it adds nothing to the approved blank-at-EOL exception.

- **cwd:** `/Users/rex-shih/Documents/Codex/projects/agent-kernel`
- **Environment:** Node `v25.2.1`, npm `11.6.2`, Python `3.13.5`, git `2.39.5 (Apple Git-154)`,
  Darwin `24.6.0 arm64` / macOS `15.7.9`, package `arrokothi-agent-kernel@0.8.1`, installed workspace
  dependencies.
- **UTC timestamp of the environment capture:** `2026-09-11T07:51:12Z`; every command below ran in the
  same session immediately after it, at the same HEAD.

### The three-way `git diff --check` plan

| Run | Requirement | Result |
|---|---|---|
| `git diff --check <base> <C7>`, default strict rules | may report **only** the two already-approved `implementation-04.md` blank-at-EOL findings | exit 2 — **exactly** `implementation-04.md:227` and `:235`, nothing else, no other whitespace class |
| `git -c core.whitespace=-blank-at-eol diff --check <base> <C7>` | **exit 0** | exit 0 |
| `git diff --check <H6> <C7>` — this round's own delta | **exit 0, no exception** | exit 0 |

### Criterion observations

| Criterion ID and source | Assertion / independent observation | Command and evidence | Observed result |
|---|---|---|---|
| K01-R6-01 ([review-06.md](review-06.md)) | `B-6`'s two paths are separate, each naming its authoritative acceptance boundary; recovery mapped to the crash-window rows; lifetime consumed at durable reservation with no re-arm; representations cannot weaken B-2 | Inspection of §3 `B-6`, §5 W-1/W-2/W-7/W-8, §13 at C7 | **PASS** |
| K01-R6-02 ([review-06.md](review-06.md)) | Empty kind-set rule normative in W-1; `MIG-5` a pure encoding mapping with the five worked cases; `REF-5` and §11 row 5 rechecked | Inspection of §5 W-1, §11 row 5, §12 `MIG-5`/`REF-5` at C7 | **PASS** |
| K0.1 contract command plan, step 1 | `npm run check:builder-docs` passes unchanged | `01-builder-docs` | **PASS**, exit 0 |
| K0.1 contract command plan, step 2 | the recorded three-way `git diff --check` plan | `03a` / `03b` / `03c` | **PASS** — see the table above |
| K0.1 contract command plan, step 3 | K0.1 link/anchor audit passes | `07-link-anchor-audit`, `08-extra-links` | **PASS**, 0 unresolved files, 0 bad anchors |
| K0.1 contract command plan, step 4 | cumulative scope touches only `docs/development/` | `04-diff-stat-cumulative` | **PASS** — no `packages/`, no `tests/`, no canonical doc |
| K0.1 contract command plan, step 5 | `npm run typecheck` passes | `02-typecheck` | **PASS**, exit 0, no diagnostics |
| 006 history preservation | every prior report, review and evidence artifact byte-identical | `09-history-preserved` | **PASS** — thirteen checks, no diff |

**`npm test` was not run**, and is not required: this round changes documentation and review records
only. `04-diff-stat-cumulative` shows the full cumulative diff touching nothing under `packages/` or
`tests/`. No live model/provider call, process-kill fault injection, or E0–E6 benchmark run was
performed or is claimed.

### Raw output, reproduced verbatim

Each block is the complete unedited output of the command in its first line, captured at C7. The
`exit=` line is the shell's exit status. One documented deviation is marked at `03a`; every other block
is byte-for-byte.

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
HEAD    : fdac4ccdce5e674c9aba43b645b8061ca7578526
utc     : 2026-09-11T07:51:12Z
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

#### `03a-diff-check-strict` — cumulative base..C7, default strict rules

```text
$ git diff --check 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 fdac4ccdce5e674c9aba43b645b8061ca7578526
docs/development/work/K0.1/implementation-04.md:227: trailing whitespace.
+
docs/development/work/K0.1/implementation-04.md:235: trailing whitespace.
+
exit=2
```

**The one deviation in this report.** `git diff --check` echoes each offending line, so the two `+`
lines above are literally `+` followed by one space (`0x2B 0x20`) in the real output. Reproducing those
two bytes would put `blank-at-eol` into *this* report. Those two trailing spaces, and only those, are
stripped here; they are precisely what the command is reporting, and its own message names the file and
line of each, so nothing is concealed.

#### `03b-diff-check-noblankeol` — cumulative base..C7 with only the blank-at-eol rule disabled

```text
$ git -c core.whitespace=-blank-at-eol diff --check 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 fdac4ccdce5e674c9aba43b645b8061ca7578526
exit=0
```

#### `03c-diff-check-delta` — this round's own delta H6..C7, default strict rules, no exception

```text
$ git diff --check c5bdd481134cf3691050b16dd6dd3a49aa9ab042 fdac4ccdce5e674c9aba43b645b8061ca7578526
exit=0
```

#### `04-diff-stat-cumulative` — cumulative base..C7 scope

```text
$ git diff --stat 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 fdac4ccdce5e674c9aba43b645b8061ca7578526
 docs/development/007-work-packets.md               |    2 +-
 docs/development/work/K0.1/contract.md             |  201 +++
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
 docs/development/work/K0.1/implementation-06.md    |  490 ++++++
 docs/development/work/K0.1/protocol-worksheet.md   | 1611 ++++++++++++++++++++
 docs/development/work/K0.1/review-01.md            |  146 ++
 docs/development/work/K0.1/review-02.md            |  134 ++
 docs/development/work/K0.1/review-03.md            |  205 +++
 docs/development/work/K0.1/review-04.md            |  190 +++
 docs/development/work/K0.1/review-05.md            |  197 +++
 docs/development/work/K0.1/review-06.md            |  199 +++
 24 files changed, 4804 insertions(+), 1 deletion(-)
exit=0
```

#### `05-diff-stat-correction` — correction delta H6..C7

```text
$ git diff --stat c5bdd481134cf3691050b16dd6dd3a49aa9ab042 fdac4ccdce5e674c9aba43b645b8061ca7578526
 docs/development/007-work-packets.md             |   2 +-
 docs/development/work/K0.1/contract.md           |  12 ++
 docs/development/work/K0.1/protocol-worksheet.md | 252 ++++++++++++++++++-----
 docs/development/work/K0.1/review-06.md          | 199 ++++++++++++++++++
 4 files changed, 417 insertions(+), 48 deletions(-)
exit=0
```

#### `06-status` — clean tree at C7

```text
$ git status --porcelain
exit=0
```

#### `07-link-anchor-audit` — K0.1 link/anchor audit

```text
$ python3 link-anchor-audit-r7.py   (run from repo root; script kept outside the repository)
relative links checked : 275
resolved files         : 262
anchors verified       : 12
known forward refs     : 13 (implementation-07.md, written by the report commit H7)
unresolved files       : 0
bad anchors            : 0
RESULT: PASS
exit=0
```

The link count rose from round 6's 235 to 275, a delta of 40 accounted for exactly: `review-06.md`
contributes 12 (it did not exist at C6), `implementation-06.md` contributes 13 (it exists in the tree at
C7 but was written by H6, so it was absent at C6), `protocol-worksheet.md` gained 13 and `contract.md`
gained 2. The 13 known forward references are the references to `implementation-07.md` — this file,
written by H7 — 11 from `protocol-worksheet.md` and one each from `contract.md` and `review-06.md`.

**The script that ran.** `docs/development/work/K0.1/evidence/round-3/link-anchor-audit.py` is already
in the repository at H3 (SHA-256
`4713f621db707d80cfce3c3a9c43b11dfeffa2c4a3c973e7b4d2d7ebe107767a`). Round 7 must add no file to the
repository, so the round-7 variant ran from outside the working tree. It differs from the committed
script in exactly two places, shown as explicit before/after line sets so this report introduces no
blank context lines:

Lines 9–11, before:

```python
# implementation-03.md is written by the report commit (H3) that also carries this log,
# so at the payload commit (C3) it is a known forward reference, reported, not hidden.
FORWARD = {"implementation-03.md"}
```

Lines 9–11, after:

```python
# implementation-07.md is written by the report commit (H7); at the payload commit (C7) it is a
# known forward reference, reported, not hidden. Round 7 adds no evidence file to the repository.
FORWARD = {"implementation-07.md"}
```

Line 49, before:

```python
print(f"known forward refs     : {fwd} (implementation-03.md, written by the report commit H3)")
```

Line 49, after:

```python
print(f"known forward refs     : {fwd} (implementation-07.md, written by the report commit H7)")
```

The resulting file's SHA-256 is
`d4a6f5ef7aef293ad0b91d665749c953f190e0ff48c42dca4612a3ba83806f99`. A reviewer can reconstruct it
byte-identically by applying those two substitutions to the committed script and verifying the digest.

#### `08-extra-links` — same-file anchors and 007 ledger links

```text
$ python3 - (same-file anchors and 007 K0.1-row links; neither is covered by the audit script)
same-file anchor #reference-implementation-limitations-not-a-legacy-disposition -> OK
007 K0.1-row link work/K0.1/review-06.md -> OK
007 K0.1-row link work/K0.1/implementation-06.md -> OK
007 K0.1-row link work/K0.1/review-01.md -> OK
007 K0.1-row link work/K0.1/review-02.md -> OK
007 K0.1-row link work/K0.1/review-03.md -> OK
007 K0.1-row link work/K0.1/evidence/round-3/ -> OK
007 K0.1-row link work/K0.1/review-04.md -> OK
007 K0.1-row link work/K0.1/review-05.md -> OK
exit=0
```

#### `09-history-preserved` — every prior report, review and evidence artifact untouched

Each check diffs a path against the commit that introduced it. No diff printed means byte-identical.
`implementation-04.md` and `implementation-06.md` are both included deliberately: the `03a` result is
resolved by the recorded exception and never by editing the first, and K01-R6-01's prose correction is
prospective and never by editing the second.

```text
$ git diff --stat <introducing commit> HEAD -- <path>     (no diff printed = byte-identical)
--- review-01.md  (introduced in 4d47638)
--- review-02.md  (introduced in ca06599)
--- review-03.md  (introduced in 6738884)
--- review-04.md  (introduced in cef3313)
--- review-05.md  (introduced in 35e7de5)
--- review-06.md  (introduced in 6b9a66d)
--- implementation-01.md  (introduced in 857fa05)
--- implementation-02.md  (introduced in cc61e74)
--- implementation-03.md  (introduced in aef1e33)
--- implementation-04.md  (introduced in a068e2f)
--- implementation-05.md  (introduced in d0dbc48)
--- implementation-06.md  (introduced in c5bdd48)
--- evidence/round-3/  (introduced in aef1e33)
exit=0  (no section above printed a diff)
```

## Interpretation and decisions

- **Why this candidate satisfies the correction request.** K01-R6-01 and K01-R6-02 have separate
  dispositions above, each broken out sub-requirement by sub-requirement against the finding's own
  bullet list, and the two `B-6` acceptance paths are set out in their own section before them, as the
  review required. Neither finding is collapsed into "addressed."
- **Why the path-B boundary is a table rather than a sentence.** Path B has three genuinely different
  authoritative boundaries depending on how the Event arrives, and each is a distinct row of kernel.md's
  Acceptance/atomicity table with its own quoted guarantee. Writing it as one sentence would have
  reproduced the original defect in smaller form — a single catch-all phrase standing in for three
  boundaries. The table also makes the K1/K2 scope visible: only the first row is reachable in K1,
  because K1 refuses Effects and K4 owns child/message durability.
- **Why consumption is tied to durable reservation rather than to acceptance or dispatch-send.**
  Reservation is the moment B-1's pinned batch exists as accepted truth. Tying consumption to Outcome
  acceptance would leave the selector live across a dispatch that had already used it; tying it to the
  send would leave a window in which a crash-and-redispatch could re-select a different batch, which
  *Dispatch intent before send* forbids by requiring the same immutable Activation.
- **Why the materialized-set constraint was worth stating rather than dropping the example.** Dropping
  it would have been easier and would have lost information: a materialized set is a reasonable
  implementation, and the failure mode is specific and easy to miss — eligible Events accepted between
  wake and reservation. Naming the failure and the two conforming fixes is more useful to K1.1 than
  silently narrowing the allowed representations.
- **Why `MIG-5` keeps the five cases rather than W-1.** Four of the five are legacy-encoding
  translations and belong on the migration side; the fifth is a target-side check that exists only to
  stop a reader carrying the legacy sentinel across. Keeping them together makes the confusion they
  prevent visible, while W-1 carries the rule itself and needs no examples to be normative.
- **Roadmap deviations:** none. No scope, gate or acceptance requirement was weakened. The only
  `contract.md` change is the round-6 entry in the correction history; the command plan, including its
  accepted exception, is unmodified.
- **Reviewer focus for this round:** **path B's third row — child/message results.** It is the one
  boundary the canonical table does not describe with the word "readiness," so this correction had to
  read the Child/message operation row together with kernel.md's rule that a terminal result is
  "committed with the terminal result or a durable routing intent." That is a defensible reading, and
  it is the reading most likely to be wrong: a reviewer should test whether a child result that wakes a
  parent commits its readiness at the child's terminal-result boundary, at the parent's routing-intent
  boundary, or at a distinct parent-side ingress, and whether K4 later needs that answer sharpened.
  Second, `B-6`'s *Lifetime* against a redelivery that is not a takeover — the worksheet says the
  pinned batch is re-sent and `B-6` does not re-arm, which is right, but the reviewer may want the
  redelivery-versus-takeover distinction stated in `B-6` rather than inferred from §2's ID-9.
- **Known limitations:** unchanged in kind. K1 does not exist, so none of this is validated against
  running behaviour; the crash-window mapping is a reading of the canonical recovery contract, not a
  tested recovery path. K0.2 owns the fixture, and W-8 case 4 remains the sharpest target in it.
- **Third-party source / dependency / service:** **none added.** No code, test material or asset was
  copied, adapted or vendored, no dependency or service was introduced, and `package.json` is untouched
  (`04-diff-stat-cumulative`). Every source read this round was repository-internal.
- **Prior review findings — each ID → correction evidence.** Round 6: K01-R6-01 → Fixed (§3 `B-6`
  *When it is created* two paths, *Lifetime*, *Recovery*, *Left open*; §5 W-1 retire paragraph, W-2,
  W-7 case 4, W-8 cases 1 and 3; §13); K01-R6-02 → Fixed (§5 W-1 grammar table and new bullet; §12
  `MIG-5`, `REF-5`; §11 row 5; §13). Round 5's K01-R5-01..02, round 4's K01-R4-01..02, round 3's
  K01-R3-01..04, round 2's K01-R2-01..06 and round 1's K01-REV-01..05 remain fixed as recorded in
  [implementation-06.md](implementation-06.md), [implementation-05.md](implementation-05.md),
  [implementation-04.md](implementation-04.md), [implementation-03.md](implementation-03.md) and
  [implementation-02.md](implementation-02.md); the consistency pass above re-checked each named
  non-regression point and none regressed. No finding across any round remains unresolved or partially
  resolved.

## Handoff

- Ready for independent review at candidate H7 (SHA supplied in the handoff message; base `6464be1`,
  H `857fa05`, H2 `cc61e74`, H3 `aef1e33`, H4 `a068e2f`, H5 `d0dbc48`, H6 `c5bdd48`, round-7 review
  record `6b9a66d`, payload C7 `fdac4ccdce5e674c9aba43b645b8061ca7578526`).
- `git diff --stat fdac4cc <H7>` is verified in the handoff message to contain exactly
  `docs/development/work/K0.1/implementation-07.md` and `docs/development/007-work-packets.md`.
- No self-acceptance. K0.2 and every later packet remain unstarted and unreleased.
