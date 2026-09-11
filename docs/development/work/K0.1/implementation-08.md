# Implementation report — K0.1, round 8 (correction)

## Identity and status

- Packet / parent milestone: **K0.1** / **K0**; [contract.md](contract.md) (corrected this round);
  worksheet [protocol-worksheet.md](protocol-worksheet.md) **Revision 8**.
- State: **WAITING_FOR_REVIEW**
- Correcting: [review-07.md](review-07.md)'s CHANGES REQUIRED outcome, findings **K01-R7-01 (P1)**,
  **K01-R7-02 (P1)** and **K01-R7-03 (P2)**, against reviewed candidate H7
  `6bdc53ad10d50e0e41bccf57bab212d406b7a2ce` (payload C7 `fdac4ccdce5e674c9aba43b645b8061ca7578526`,
  base `6464be1`).
- Base commit (unchanged since round 1): `6464be12c11eb75f7dfbc5ece12ca8d3020a5c15`
- Reviewed candidates, all preserved and none rewritten: H `857fa05a8a72a4c6f4f294f9e775a0dc1f7919dc`,
  H2 `cc61e74455534abf896c46632246615185219b92`, H3 `aef1e33ba944a0647bb2319fb97ae40b18b05924`,
  H4 `a068e2f6c8d67e5e3e2512c765b29427acb4ac68`, H5 `d0dbc4800c10dad68a8b4b6c662bf90c963fd926`,
  H6 `c5bdd481134cf3691050b16dd6dd3a49aa9ab042`, H7 `6bdc53ad10d50e0e41bccf57bab212d406b7a2ce`.
- Round-8 review record commit (adds [review-07.md](review-07.md); ledger → CHANGES_REQUESTED):
  `5dda5a7fce11b09f98118085ea7f57d46c8e077c`
- **Correction payload C8: `40feb095d8e0f964bce854facd90f51d23633380`**
- Candidate H8: the commit containing this report and the ledger status edit, and **nothing else**;
  full SHA supplied in the handoff (per 006, H cannot name itself).
- Branch / remote: `codex/k0.1-protocol-legacy-disposition` / `origin`
  (`https://github.com/ArrokothI/Agent_SDK.git`; GitHub reports it moved to
  `https://github.com/ArrokothI/agent-kernel.git` — the configured URL is deliberately left unchanged).
- Working tree: verified clean at C8 **before** validation ran; nothing was written into the repository
  afterwards. Round 8 adds **no** evidence file, directory or script.
- History: every prior commit, report, review and evidence artifact is preserved unedited — verified
  file by file in `09-history-preserved` below (fifteen checks), including `implementation-04.md` and
  every other historical report byte-for-byte.

**Blob identities confirmed.** [review-07.md](review-07.md) pins the four artifacts it inspected by
blob SHA at H7. All four were checked against H7's tree before this correction began and all four
match: `contract.md` `fa0b95ed3a2ea3f5943e753789244a528d15af82`, `protocol-worksheet.md`
`bd2689ff5d6f36fb353d8b2a6f55643d3c05d68b`, `review-06.md` `ecc4e2f32fb762fe10199c6ecba502aa030978a7`,
`implementation-07.md` `f819fe4dc937aea73bf85913a70231a2d3da3012`.

## Round-8 commit sequence

| Step | Commit | Contents |
|---|---|---|
| Administrative review record | `5dda5a7fce11b09f98118085ea7f57d46c8e077c` | `review-07.md` + the 007 K0.1 status row → `CHANGES_REQUESTED`. No payload. |
| Payload **C8** | `40feb095d8e0f964bce854facd90f51d23633380` | `contract.md` + `protocol-worksheet.md` only. |
| Final validation | — | Run against the clean C8 tree, after C8 existed. |
| Candidate **H8** | the commit containing this report | `implementation-08.md` + the 007 K0.1 status row → `WAITING_FOR_REVIEW`. Nothing else. |

## Findings — individual disposition

### K01-R7-01 (P1) — application input must not bypass declared subscriptions — **Fixed**

The finding is exact, and so is its cause: round 5 made the selector grammar precise, which did not
*create* the bypass but made it reachable. Revision 7's rule read "matches at least one dependency
alternative, **or** it is application input matching at least one declared subscription" as two
independent *sufficient* conditions, so a Runtime could write a dependency alternative
`kind = external.input`, declare no subscription at all, and be woken by ordinary application input —
satisfying kernel.md's "application-input waits require a declared subscription" by declaring nothing.

| Sub-requirement from the finding | Where it is now satisfied | What it says |
|---|---|---|
| W-1's eligibility rule has an explicit source-category rule | §5 **W-1**, *Eligibility rule — by source category first* | A two-row category table, then the rule itself: eligible **iff** it is ordinary application input **and** matches a declared subscription, **or** it is not application input **and** matches a dependency alternative. |
| Ordinary application input: eligibility determined **only** by declared subscriptions | §5 **W-1**, category table row 1 | "**Only** a declared input subscription (item 2) naming its class." |
| A dependency alternative matching its identity/kind/correlation does **not** make it eligible | §5 **W-1**, row 1's "What does **not**" cell; §5 **W-7 case 6** | "A dependency alternative, however written. An alternative whose selector happens to match this Event's identity, kind or correlation does **not** make it eligible." |
| Non-application-input Kernel Events use the identity/kind/correlation grammar | §5 **W-1**, category table row 2 | Names the category members explicitly, including W-9's timeout observation. |
| Subscriptions stay separate; no label becomes a fourth dependency-selector field | §5 **W-1**, *The two lists stay separate in both directions* | "the source-category rule is not a back door for putting an application label into the grammar … neither reaches into the other's category." |
| How the category is determined | §5 **W-1**, row 1's first cell | By **trusted ingress provenance**, not by a kind's spelling: today `external.input` is the one kind in it (`packages/core/src/interaction/events.ts:28`, `:58-60`), and `user.input` is *not* — it is runtime-established and settles a specific Effect. |
| Recheck B-2, `B-6`, W-1, W-2, W-7, W-8, §11 row 5 | §3 B-2 middle case; §3 `B-6`; §5 W-1; §11 row 5 | All now say "the retired wait's rule" meaning W-1's source-category rule as that wait spelled it; §11 row 5 states the category rule inline. W-2 and W-8 needed no change — neither asserts an eligibility path of its own. |
| Preserve: application input outside every subscription stays queued and unacknowledged **even when the wait has dependency alternatives** | §5 **W-1** rule paragraph; §5 **W-7 cases 3, 6, 7** | "that stays true of application input outside every declared subscription **even when the wait also carries dependency alternatives**." W-7 case 3's reasoning is restated on the category rule rather than on "it is not a `child.result`". |
| `MIG-5`: matcher migratable, but **not** the complete target eligibility predicate | §12 **`MIG-5`**, *It is not by itself the target eligibility predicate* | "`eventSatisfiesWake` implements neither half of the category test: it never inspects an Event's trusted ingress provenance, and it is called with no knowledge of whether the condition it is evaluating came from a dependency alternative or from anywhere else." |
| The target caller must enforce the source-category rule before/around the matcher | §12 **`MIG-5`**, same paragraph | "**The target caller must enforce the source-category rule before or around this matcher** — running the matcher alone over an arbitrary mailbox reproduces exactly the bypass W-7 case 6 rules out." |
| A legacy `WakeCondition` matching `external.input` does not become a target subscription by migration | §12 **`MIG-5`**, same paragraph | "subscriptions are a separate list with a separate identity (W-1 item 2), and nothing in this record can be translated into one." The row's **Migratable** classification is unchanged and still correct: the matcher migrates; what does not is the assumption that it is the whole predicate. |
| `REF-5`/current-record refusal remains consistent | §12 **`REF-5`** | Unchanged this round — verified byte-identical against H7 in the `§12 rows changed` check below. Its grounds (one condition, one correlation, no identity field, no subscription concept, sentinel-encoded absence) are unaffected by the category rule. |
| Deterministic **negative** case | §5 **W-7 case 6** | `W′` = `W` plus dependency alternative `D3` (`kind = external.input`, no correlation) and an **empty** subscription list. Application input arrives, `D3` matches it on kind, and it is **still not eligible**: no wake, not acknowledged, stays queued (B-4). Names the revision-7 behaviour it replaces. |
| Deterministic **positive** case | §5 **W-7 case 7** | `W″` = `W′` plus `{correction}`. Input labelled `correction` is eligible and wakes P under `B-6`; `billing.question` against the same wait is still ineligible. Closes with what `D3` contributed in either case: **nothing**. |

### K01-R7-02 (P1) — give deadline expiry the same crash-safe batch semantics as Event wake — **Fixed**

The sources named in the finding were re-read at C8 before editing: kernel.md's *Events and waits* and
*Acceptance and atomicity*; execution-protocol.md's *Wait registration, deadlines and liveness* and its
race table; recovery-and-compatibility.md's crash windows; and worksheet CL-1/CL-2, B-1/B-2/`B-6`,
W-1/W-3/W-6 and §11 row 5. The defect is `B-6`'s own shape: it fixed the Event-ended half of "a wait
ended" and left the deadline-ended half in B-2's *ordinary* `READY` case, where backlog could displace
the timeout exactly as it could once have displaced a wake Event.

| Sub-requirement from the finding | Where it is now satisfied | What it says |
|---|---|---|
| A current-generation expiry is a Kernel-owned accepted timeout fact | §5 **W-9**, *What an expiry is* | "a Kernel-owned **accepted fact**, on the same footing as an accepted Event and unlike a bare scheduler tick: it is recorded, it is recoverable, and the Runtime learns it through the ordinary accepted-input contract." |
| Its acceptance atomically retires the wait/generation | §3 **`B-7`** step 1 | "retires that wait registration and its generation (W-1's retirement rule, reached through the other door)." |
| …records the timeout observation tied to the expired generation | §3 **`B-7`** step 2; §5 **W-9** | Step 2 plus W-9's *Wait-generation correlation*: "it names the exact wait generation that expired (W-3)." |
| …makes the Execution `READY` | §3 **`B-7`** step 3 | — |
| …records recoverable readiness sufficient to deliver it in the immediately resulting Activation | §3 **`B-7`** step 4 | All four in **one transaction**, with the note that there is no Outcome boundary available here any more than there is on `B-6` path B. |
| Deadline expiry must **not** fall into ordinary `READY` selection | §3 **B-2** middle case; §3 **`B-7`** | B-2's middle case is generalized from "retired by an eligible wake" to "because a registered wait **ended**", with `B-6`/`B-7` as its two species. |
| Older unrelated backlog **must not** displace the timeout observation | §3 **B-2**; §3 **`B-7`** *What the next batch must contain*; §5 **W-9 case 1** | "cannot displace the timeout observation at any bound," worked at bound 1 in W-9 case 1. |
| One coherent **"wait-ended readiness"** protocol | §3 **B-2** middle case + `B-6` + `B-7` | "**wait-ended readiness** is the genus (B-2's middle case), `B-6` and `B-7` are its species" — differing only in what the batch **must** contain. |
| Event-triggered readiness keeps `B-6`'s behaviour | §3 **`B-6`** | Unchanged this round except for the path-B row split required by K01-R7-03. |
| Deadline-triggered readiness makes the timeout observation **mandatory** | §3 **`B-7`** | "it is the thing the Runtime is being activated to learn, and a batch without it would activate a Runtime that cannot tell why." |
| Events eligible under the retired wait accepted **before reservation** remain eligible for that batch | §3 **`B-7`**; §3 *A representation may not weaken the selector semantics* | "the selection is evaluated at reservation, not frozen at expiry." |
| Deterministic acceptance ordering, normal bound | §3 **`B-7`** | "in deterministic acceptance order among them, subject to the normal bound." |
| Unrelated backlog remains queued | §3 **`B-7`**; §5 **W-9 case 1** | Stays queued and unacknowledged (B-4). |
| After durable reservation the readiness is consumed and the pinned Activation/batch governs replay/takeover | §3 **`B-7`** *Lifetime…* | Explicitly "`B-6`'s, unchanged", including the no-re-arm rule. |
| The timeout observation must be observable through the Activation's accepted input/batch contract | §5 **W-9**, *Mandatory delivery* | "A transition to `READY` that leaves the Runtime unable to distinguish 'my deadline expired' from ordinary readiness is **not conforming**." |
| Logical identity, generation correlation and mandatory delivery cannot remain unspecified | §5 **W-9**, *Three properties are decided here* | All three stated; identity is "a distinct, addressable accepted fact … not a boolean on the Execution record, and not the *absence* of data." |
| Wire spelling may remain replaceable | §5 **W-9**, *Left open (implementation-owned)* | Event-of-a-kind, Activation field, or otherwise — K1.3 chooses. Notes the current vocabulary has no spelling at all: "Timer kinds remain deliberately absent until the Effect/runtime work that establishes them" (`events.ts:68`). "It may not choose to leave the three properties above unspecified." |
| Preserve W-3 | §5 **W-9**, *Generation fencing is unchanged*; §5 **W-9 case 2** | A superseded-generation timer "retires nothing, records no observation, creates no readiness and wakes nothing." |
| Do not convert timeout into proof the action failed | §5 **W-9**, *What an expiry is not* | Cites CL-2 and the race table's "never turn timeout into proof of non-execution." |
| Preserve CL-2: timeout and later result are both accepted facts | §5 **W-9 case 3** | Neither is rewritten into the other, at either bound. |
| Deterministic case 1 — bound 1, backlog cannot displace | §5 **W-9 case 1** | Single slot holds the timeout observation, never the older `billing.question`. |
| Deterministic case 2 — G1 replaced by G2, G1 timer fires | §5 **W-9 case 2** | No-op against G2; W-6 case 2 restated with the machinery `B-7` adds, answer unchanged. |
| Deterministic case 3 — timeout then correlated result before reservation | §5 **W-9 case 3** | Both facts survive; at bound ≥ 2 the batch holds both in deterministic acceptance order, at bound 1 the mandatory timeout takes the slot and the result stays queued, durable and eligible later. States what must not happen at either bound. |
| §11 row 5 covers both matching-Event wake and current-generation timeout wake | §11 row 5 | "in either way a wait can end" — and the stale-timer clause now adds "that retires nothing and records no timeout observation." |

### K01-R7-03 (P2) — separate durable child routing obligation from destination Event acceptance — **Fixed**

Round 7's own *Reviewer focus* flagged this row as its likeliest error; it was. Revision 7 stated one
conforming profile as if it were the rule, and in doing so began freezing a mechanism K4 owns.

| Sub-requirement from the finding | Where it is now satisfied |
|---|---|
| Message whose success *is* durable destination-mailbox acceptance: destination Event acceptance and readiness **may** be one atomic boundary | §3 `B-6` path-B table, new row — quoting kernel.md's "Message send remains an Effect: its success means destination mailbox acceptance, not Runtime processing" |
| Child terminal result: the child's terminal boundary may commit the result **plus a durable routing obligation** without accepting a parent mailbox Event | §3 `B-6`, *Routing obligation is not destination Event acceptance*, bullet 1 — quoting kernel.md's "committed with the terminal result **or a durable routing intent**" |
| In that case the parent is **not** `B-6`-ready merely because the obligation exists | same bullet — "no Event has been accepted for it, so there is nothing a batch could contain and nothing a selector could match" |
| Recovery must replay / idempotently fulfil the obligation | bullet 2 — cites *Terminal result before routing/delivery acknowledgment* ("Replay durable routing/publication intent with the same identity") and *Parent intent before child creation/link* ("Idempotent fulfillment binds one child and one budget debit") |
| `B-6` starts for the parent only when fulfilment accepts the Event into the parent's mailbox, and that acceptance atomically records wake/readiness | bullet 3 |
| A single-transaction profile is also conforming; do not require it universally | bullet 4 — "**permitted, not required**. K0.1 mandates neither shape." |
| Same principle for any other routed Event; never fabricate destination readiness before the destination Event exists | bullet 5 — "readiness attaches to the **latter**" |
| K4 owns the mechanism; K0.1 states only the cross-cutting invariant | closing paragraph — names K4 and composition-and-communication.md, and explains that the table row now names a *boundary role* rather than a mechanism |

## Cumulative consistency pass (required by [review-07.md](review-07.md))

| Proof obligation | Result |
|---|---|
| **Application input has exactly one target wake path** | **PASS.** W-1's category table row 1 admits only the subscription path and names the alternative path in its "What does **not**" cell; W-7 case 6 is the executable negative; §11 row 5 repeats it; `MIG-5` records that the legacy matcher cannot supply the other path. Searched the worksheet for every occurrence of "source category"/"source-category": eleven, all consistent, spread across B-2, W-1, W-7, §11 row 5, `MIG-5`, §13 and the revision history. |
| **Non-input dependency Events use exactly one selector grammar** | **PASS.** W-1's grammar is unchanged this round and remains the only description of what an alternative may constrain; the category rule sits *above* it and adds no selector field. |
| **Event wake and deadline wake both have crash-safe next-batch semantics** | **PASS.** One genus in B-2's middle case, two species (`B-6`, `B-7`) with identical lifetime, consumption and no-re-arm rules, each mapped to a recovery-and-compatibility.md crash window. |
| **Routing obligations are not confused with Event acceptance** | **PASS.** `B-6`'s path-B table now names destination Event-acceptance boundaries only, and the new note states the invariant plus both conforming profiles. |
| Activation-ID takeover identity | **PASS, unchanged.** §2 is outside every hunk; ID-9's "same Activation ID rather than minting a new one" present and unmodified. |
| Effect-refusal boundary | **PASS.** §8 untouched; `B-7` and `B-6`'s settlement row carry K1 scope notes rather than implying Effects exist in K1. |
| Canonical encoding (E-7 / JCS) | **PASS, untouched.** §1 spans lines 30–228 and the diff's first hunk after the revision marker begins at 304. |
| Progress decisions (PC-1 / `MIG-3` / `LEG-4`) | **PASS, untouched.** §9 outside every hunk; row-by-row comparison shows only `MIG-5` changed in §12. |
| Legacy disposition | **PASS.** Three labels only; every classification cell still begins with Migratable, Legacy-only or Refused; `LIM-1` still outside the table. |
| C/H process identity and evidence decisions | **PASS.** Review record → C8 → validation on clean C8 → H8; the approved whitespace exception untouched; no historical report edited. |

## Validation

All commands ran at **C8 `40feb095d8e0f964bce854facd90f51d23633380`** with the working tree verified
clean. Output was captured outside the repository and is reproduced below. **Round 8 added no evidence
file, directory or script to the repository.**

**On the accuracy of "verbatim" (per [review-07.md](review-07.md)'s round-8 instruction).** Every block
below is byte-for-byte **except** `03a`, where the two echoed offending lines are rendered without their
single trailing space, for the reason given at that block. This report therefore reproduces the raw
outputs **subject to the documented historical-whitespace rendering exception**, and the 007 status row
says exactly that rather than claiming full verbatim reproduction.

- **cwd:** `/Users/rex-shih/Documents/Codex/projects/agent-kernel`
- **Environment:** Node `v25.2.1`, npm `11.6.2`, Python `3.13.5`, git `2.39.5 (Apple Git-154)`,
  Darwin `24.6.0 arm64` / macOS `15.7.9`, package `arrokothi-agent-kernel@0.8.1`, installed workspace
  dependencies.
- **UTC timestamp of the environment capture:** `2026-09-11T08:10:50Z`; every command below ran in the
  same session immediately after it, at the same HEAD.

### The three-way `git diff --check` plan

| Run | Requirement | Result |
|---|---|---|
| `git diff --check <base> <C8>`, default strict rules | may report **only** the two already-approved immutable `implementation-04.md` blank-at-EOL findings | exit 2 — **exactly** `implementation-04.md:227` and `:235`, nothing else, no other whitespace class |
| `git -c core.whitespace=-blank-at-eol diff --check <base> <C8>` | **exit 0** | exit 0 |
| `git diff --check <H7> <C8>` — this round's own delta | **exit 0, no exception** | exit 0 |

### Criterion observations

| Criterion ID and source | Assertion / independent observation | Command and evidence | Observed result |
|---|---|---|---|
| K01-R7-01 ([review-07.md](review-07.md)) | Ordinary application input is eligible only via a declared subscription; a matching dependency alternative is inert; `MIG-5` reconciled; `REF-5` consistent | Inspection of §5 W-1/W-7, §3 B-2/`B-6`, §11 row 5, §12 at C8 | **PASS** |
| K01-R7-02 ([review-07.md](review-07.md)) | Deadline expiry is an accepted fact with identity, generation correlation and mandatory delivery; one wait-ended-readiness protocol; W-3 and CL-2 preserved | Inspection of §3 B-2/`B-7`, §5 W-9, §11 row 5 at C8 | **PASS** |
| K01-R7-03 ([review-07.md](review-07.md)) | Obligation creation and destination Event acceptance may be distinct accepted facts; readiness attaches to acceptance; K4 mechanism not frozen | Inspection of §3 `B-6` path B at C8 | **PASS** |
| K0.1 contract command plan, step 1 | `npm run check:builder-docs` passes unchanged | `01-builder-docs` | **PASS**, exit 0 |
| K0.1 contract command plan, step 2 | the recorded three-way `git diff --check` plan | `03a` / `03b` / `03c` | **PASS** — see the table above |
| K0.1 contract command plan, step 3 | K0.1 link/anchor audit passes | `07-link-anchor-audit`, `08-extra-links` | **PASS**, 0 unresolved files, 0 bad anchors |
| K0.1 contract command plan, step 4 | cumulative scope touches only `docs/development/` | `04-diff-stat-cumulative` | **PASS** — no `packages/`, no `tests/`, no canonical doc |
| K0.1 contract command plan, step 5 | `npm run typecheck` passes | `02-typecheck` | **PASS**, exit 0, no diagnostics |
| 006 history preservation | every prior report, review and evidence artifact byte-identical | `09-history-preserved` | **PASS** — fifteen checks, no diff |

**`npm test` was not run**, and is not required: this round changes documentation and review records
only. `04-diff-stat-cumulative` shows the full cumulative diff touching nothing under `packages/` or
`tests/`. No live model/provider call, process-kill fault injection, or E0–E6 benchmark run was
performed or is claimed.

### Raw output

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
HEAD    : 40feb095d8e0f964bce854facd90f51d23633380
utc     : 2026-09-11T08:10:50Z
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

#### `03a-diff-check-strict` — cumulative base..C8, default strict rules

```text
$ git diff --check 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 40feb095d8e0f964bce854facd90f51d23633380
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

#### `03b-diff-check-noblankeol` — cumulative base..C8 with only the blank-at-eol rule disabled

```text
$ git -c core.whitespace=-blank-at-eol diff --check 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 40feb095d8e0f964bce854facd90f51d23633380
exit=0
```

#### `03c-diff-check-delta` — this round's own delta H7..C8, default strict rules, no exception

```text
$ git diff --check 6bdc53ad10d50e0e41bccf57bab212d406b7a2ce 40feb095d8e0f964bce854facd90f51d23633380
exit=0
```

#### `04-diff-stat-cumulative` — cumulative base..C8 scope

```text
$ git diff --stat 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 40feb095d8e0f964bce854facd90f51d23633380
 docs/development/007-work-packets.md               |    2 +-
 docs/development/work/K0.1/contract.md             |  217 +++
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
 docs/development/work/K0.1/implementation-04.md    |  436 +++++
 docs/development/work/K0.1/implementation-05.md    |  454 +++++
 docs/development/work/K0.1/implementation-06.md    |  490 +++++
 docs/development/work/K0.1/implementation-07.md    |  473 +++++
 docs/development/work/K0.1/protocol-worksheet.md   | 1901 ++++++++++++++++++++
 docs/development/work/K0.1/review-01.md            |  146 ++
 docs/development/work/K0.1/review-02.md            |  134 ++
 docs/development/work/K0.1/review-03.md            |  205 +++
 docs/development/work/K0.1/review-04.md            |  190 ++
 docs/development/work/K0.1/review-05.md            |  197 ++
 docs/development/work/K0.1/review-06.md            |  199 ++
 docs/development/work/K0.1/review-07.md            |  217 +++
 26 files changed, 5800 insertions(+), 1 deletion(-)
exit=0
```

#### `05-diff-stat-correction` — correction delta H7..C8

```text
$ git diff --stat 6bdc53ad10d50e0e41bccf57bab212d406b7a2ce 40feb095d8e0f964bce854facd90f51d23633380
 docs/development/007-work-packets.md             |   2 +-
 docs/development/work/K0.1/contract.md           |  16 +
 docs/development/work/K0.1/protocol-worksheet.md | 354 +++++++++++++++++++++--
 docs/development/work/K0.1/review-07.md          | 217 ++++++++++++++
 4 files changed, 556 insertions(+), 33 deletions(-)
exit=0
```

#### `06-status` — clean tree at C8

```text
$ git status --porcelain
exit=0
```

#### `07-link-anchor-audit` — K0.1 link/anchor audit

```text
$ python3 link-anchor-audit-r8.py   (run from repo root; script kept outside the repository)
relative links checked : 318
resolved files         : 304
anchors verified       : 12
known forward refs     : 14 (implementation-08.md, written by the report commit H8)
unresolved files       : 0
bad anchors            : 0
RESULT: PASS
exit=0
```

The link count rose from round 7's 275 to 318, a delta of 43 accounted for exactly:
`implementation-07.md` contributes 14 (it exists in the tree at C8 but was written by H7, so it was
absent at C7), `protocol-worksheet.md` gained 15, `review-07.md` contributes 12, and `contract.md`
gained 2. The 14 known forward references are the references to `implementation-08.md` — this file,
written by H8 — 12 from `protocol-worksheet.md` and one each from `contract.md` and `review-07.md`.

**The script that ran.** `docs/development/work/K0.1/evidence/round-3/link-anchor-audit.py` is already
in the repository at H3 (SHA-256
`4713f621db707d80cfce3c3a9c43b11dfeffa2c4a3c973e7b4d2d7ebe107767a`). Round 8 must add no file to the
repository, so the round-8 variant ran from outside the working tree, differing in exactly two places,
shown as explicit before/after line sets so this report introduces no blank diff context lines:

Lines 9–11, before:

```python
# implementation-03.md is written by the report commit (H3) that also carries this log,
# so at the payload commit (C3) it is a known forward reference, reported, not hidden.
FORWARD = {"implementation-03.md"}
```

Lines 9–11, after:

```python
# implementation-08.md is written by the report commit (H8); at the payload commit (C8) it is a
# known forward reference, reported, not hidden. Round 8 adds no evidence file to the repository.
FORWARD = {"implementation-08.md"}
```

Line 49, before:

```python
print(f"known forward refs     : {fwd} (implementation-03.md, written by the report commit H3)")
```

Line 49, after:

```python
print(f"known forward refs     : {fwd} (implementation-08.md, written by the report commit H8)")
```

The resulting file's SHA-256 is
`649f1699e97c109484b0e8fd40488c140de31217b2d493d83b44c56e5424b9ed`.

#### `08-extra-links` — same-file anchors and 007 ledger links

```text
$ python3 - (same-file anchors and 007 K0.1-row links; neither is covered by the audit script)
same-file anchor #reference-implementation-limitations-not-a-legacy-disposition -> OK
007 K0.1-row link work/K0.1/review-07.md -> OK
007 K0.1-row link work/K0.1/implementation-07.md -> OK
007 K0.1-row link work/K0.1/review-01.md -> OK
007 K0.1-row link work/K0.1/review-02.md -> OK
007 K0.1-row link work/K0.1/review-03.md -> OK
007 K0.1-row link work/K0.1/evidence/round-3/ -> OK
007 K0.1-row link work/K0.1/review-04.md -> OK
007 K0.1-row link work/K0.1/review-05.md -> OK
007 K0.1-row link work/K0.1/review-06.md -> OK
exit=0
```

#### `09-history-preserved` — every prior report, review and evidence artifact untouched

Each check diffs a path against the commit that introduced it. No diff printed means byte-identical.

```text
$ git diff --stat <introducing commit> HEAD -- <path>     (no diff printed = byte-identical)
--- review-01.md  (introduced in 4d47638)
--- review-02.md  (introduced in ca06599)
--- review-03.md  (introduced in 6738884)
--- review-04.md  (introduced in cef3313)
--- review-05.md  (introduced in 35e7de5)
--- review-06.md  (introduced in 6b9a66d)
--- review-07.md  (introduced in 5dda5a7)
--- implementation-01.md  (introduced in 857fa05)
--- implementation-02.md  (introduced in cc61e74)
--- implementation-03.md  (introduced in aef1e33)
--- implementation-04.md  (introduced in a068e2f)
--- implementation-05.md  (introduced in d0dbc48)
--- implementation-06.md  (introduced in c5bdd48)
--- implementation-07.md  (introduced in 6bdc53a)
--- evidence/round-3/  (introduced in aef1e33)
exit=0  (no section above printed a diff)
```

## Interpretation and decisions

- **Why this candidate satisfies the correction request.** K01-R7-01, K01-R7-02 and K01-R7-03 have
  three separate dispositions above, each broken out sub-requirement by sub-requirement against the
  finding's own bullet list, with the exact worksheet location and the actual wording for every line.
  None is collapsed into "addressed."
- **Why the category rule is a table rather than a longer sentence.** The defect was a sentence whose
  two clauses read as independent sufficient conditions. Replacing it with a longer sentence would have
  risked the same ambiguity; a table forces each category to state both what makes an Event eligible
  and what does **not**, and the "What does not" column is where the actual rule lives.
- **Why the category is defined by ingress provenance rather than by kind.** Naming `external.input`
  would have frozen a 0.8.x spelling into a target rule and would break the first time the vocabulary
  gains a second application-input kind. kernel.md already separates "Application input, trusted adapter
  settlement and operator control" by *ingress*, so the category has a canonical basis that survives
  vocabulary changes; the current kind is cited as today's instance, not as the definition.
- **Why `B-7` is a sibling rather than a generalization of `B-6` in place.** The finding permitted
  either. A sibling keeps `B-6` byte-stable for a reviewer who has already accepted it, makes the one
  real difference (a mandatory member) visible in one place instead of diffused through `B-6`'s prose,
  and lets B-2's middle case name the genus explicitly — which is where a K1.1 implementer looks first.
- **What W-9 deliberately does not decide.** The timeout observation's spelling is open, and that is not
  evasion: the current Event vocabulary has no timer kind at all and says so, so choosing one here would
  invent target vocabulary K1.3 owns. What K0.1 cannot leave open — identity, generation correlation,
  mandatory delivery — is exactly the set a K0.2 fixture must assert, which is the test for whether the
  split is in the right place.
- **On K01-R7-03 and the limits of what K0.1 should say.** The correction removes a claim rather than
  adding one. The temptation was to specify *which* boundary a child result uses; the finding is right
  that K0.1 should not, because kernel.md permits two profiles and K4 owns the choice. What K0.1 needs
  from that area is one invariant, and stating only that is the whole correction.
- **Roadmap deviations:** none. No scope, gate or acceptance requirement was weakened. The only
  `contract.md` change is the round-7 entry in the correction history; the command plan, including its
  accepted exception, is unmodified.
- **Reviewer focus for this round:** **`B-7`'s interaction with W-2.** `B-6` path A exists because an
  eligible Event can already be present when a wait is registered; the deadline analogue is a wait
  registered with a deadline that has *already* passed by the time the Outcome is accepted. The
  worksheet does not say what happens there, and there are two defensible answers (accept the wait and
  let expiry fire immediately as an ordinary `B-7`; or treat it as an immediate timeout inside the
  Outcome-acceptance boundary, the deadline analogue of path A). I did not invent one, because the
  finding did not ask and either choice is a real semantic decision — but a reviewer may judge that
  K0.1 owes K1.3 an answer. Second, W-9 case 3 at bound 1 leaves a correlated result queued behind a
  mandatory timeout; that is deliberate and I believe right, but it is the case where "mandatory member"
  and "eligible under the retired rule" pull hardest against each other.
- **Known limitations:** unchanged in kind. K1 does not exist, so none of this is validated against
  running behaviour; W-9's cases are specifications of traces, not passing fixtures, and the crash-window
  mapping remains a reading of the canonical recovery contract rather than a tested recovery path.
- **Third-party source / dependency / service:** **none added.** No code, test material or asset was
  copied, adapted or vendored, no dependency or service was introduced, and `package.json` is untouched
  (`04-diff-stat-cumulative`). Every source read this round was repository-internal.
- **Prior review findings — each ID → correction evidence.** Round 7: K01-R7-01 → Fixed (§5 W-1
  eligibility rule, W-7 cases 3/6/7; §3 B-2, `B-6`; §11 row 5; §12 `MIG-5`; §13); K01-R7-02 → Fixed
  (§3 B-2 middle case, new `B-7`; §5 new W-9; §11 row 5; §13); K01-R7-03 → Fixed (§3 `B-6` path-B table
  and the new routing note; §13). Rounds 1–6's findings remain fixed as recorded in
  [implementation-07.md](implementation-07.md) and its predecessors; the consistency pass above
  re-checked each named non-regression point and none regressed. No finding across any round remains
  unresolved or partially resolved.

## Handoff

- Ready for independent review at candidate H8 (SHA supplied in the handoff message; base `6464be1`,
  H `857fa05`, H2 `cc61e74`, H3 `aef1e33`, H4 `a068e2f`, H5 `d0dbc48`, H6 `c5bdd48`, H7 `6bdc53a`,
  round-8 review record `5dda5a7`, payload C8 `40feb095d8e0f964bce854facd90f51d23633380`).
- `git diff --stat 40feb09 <H8>` is verified in the handoff message to contain exactly
  `docs/development/work/K0.1/implementation-08.md` and `docs/development/007-work-packets.md`.
- No self-acceptance. K0.2 and every later packet remain unstarted and unreleased.
