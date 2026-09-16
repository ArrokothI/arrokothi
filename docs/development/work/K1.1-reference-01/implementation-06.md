# Implementation report — K1.1-reference-01, round 6 (C6/H6)

## Identity

| Label | SHA |
|---|---|
| A (supplement base) | `519ba002378707a4deccff1ea0a243d21eb694b7` |
| D (owner documentation freeze) | `0ee13f8138af52107d86967043bcc460faba8893` |
| K1.1-correction-01 H5, accepted, untouched | `52b1600f3b42e3a360fdc3395178f1d147edf304` |
| H5-ref, reviewed by [review-05](review-05.md) | `7fe0bba85f630744253ce0470206fd7e78709b7d` |
| review-05 recorded | `bf4d4e4fd20c7e57001f9945c140c34adbae2eb6` |
| **C6 (round-6 payload)** | **`2f1a7ced4ab0a4b340132899bd61fc14ae678a6d`** |
| H6 | this commit |

- Contract **revision 5**. C6→H6 allowlist: this report, `validation-06/` (3 logs + MANIFEST), the
  007 ledger row.
- **Role.** Implemented by the session that wrote review-05 of the sibling packet and this packet's
  C2–C6. **Disqualified from accepting anything in the K1.1 line.**
- State: WAITING_FOR_REVIEW. `next_release: none`.

## The three findings, verified before acting

All three of [review-05](review-05.md)'s findings are **correct**. Each was checked against git
before any edit.

| Finding | Claim | Git | Verdict |
|---|---|---|---|
| `REF1-R5-SCOPE-01` P2 | 007's live K1.1-reference-01 *section* cites contract revision 1 and omits the Layer-1 README scope | verbatim present; frozen since the section was created, while the contract reached revision 4 and the *row* was updated five times | **CONFIRMED** |
| `REF1-R5-CHK-01` P2 | the contract requires `git diff --check`; recorded round 1 only; A→H not clean | `validation-01/01-clean-C.log:43` records it; rounds 2–5 record it nowhere; `git diff --check A H` exits 2 with nine warnings | **CONFIRMED** |
| `REF1-R5-WORD-01` P3 | the README headline overstates against its own carve-out and `sources.md` | headline was absolute; `sources.md:30` records acceptance status, which the carve-out described only as "which decision a rule came from" | **CONFIRMED** |

**One correction to the review, offered as reconciliation not rebuttal.** Review-05 states the
sealed/current split of the nine warnings as "six" in one sentence and "five" in another. The actual
split is **8 sealed (`validation-02`…`04`) + 1 current (`validation-05`) = 9**. Its total is right
and nothing in the finding or its required outcome depends on the split; recorded because the
required outcome names "the six warnings inside sealed v02–v04 logs" and a reader reconciling that
against git would find eight.

## Changes

**C6 edits three paths, all in the declared payload.**

### `REF1-R5-SCOPE-01` — the 007 section

007 describes this packet in two places: the ledger row (which I updated every round) and the
`### K1.1-reference-01` section (which I never looked at). The section now names contract revision
5, records the bounded Layer-1 README exception and the no-payload commit that authorized it,
states that the other four core pages remain byte-identical to D, and defers the revision history
to the row and the contract rather than duplicating a second chronology that could drift again.

**Fifth appearance of this family, same boundary error every time.** The sweep was scoped to the
files being edited, or to the packet directory, or to the row — never to the full set of places that
*describe* the thing being changed. 012 asks for the latter. Recording it plainly rather than
presenting the fix as routine.

### `REF1-R5-CHK-01` — contract revision 5, on the owner's decision of 2026-09-16

The owner chose scoping over a standing waiver, with the explicit constraint that it "would not
weaken the future `git diff` check, so someone can make use of it."

The exclusion is the **narrowest that works**, verified rather than assumed: `*.log` byte-captures
under `validation-*/` only. Everything else stays checked and is named in the contract — every
`mental-model/` page, every `docs/` page, every contract, every `implementation-*.md`, every
transcribed `review-*.md`, every `MANIFEST.md`. I confirmed the whole tree minus those `.log` files
exits 0, so nothing broader was needed.

**Transcribed reviews are deliberately not excluded**, even though they too must not be edited.
They are clean today; widening a carve-out for a problem that does not exist is how a narrow one
becomes broad. If a future transcription carries authored-looking whitespace that is a fresh
decision, not a precedent already granted.

**The net effect is a stronger gate.** Before: nominally covered everything, actually run in one
round of five. Now: covers all authored content and **must be run and recorded every round on C and
on H**; a round that omits it fails REF-5. `00` records it on C6 **with a negative control** — a
trailing space added to `reference.md` is still caught, proving the exclusion does not hide authored
whitespace — then restored clean.

The contract states plainly that the check failed first, that the authored payload was already
clean, and why editing a sealed byte-capture to satisfy a linter is the wrong remedy: it breaks the
recorded digest, stops the file being a faithful capture, and for rounds 2–4 would modify sealed
records.

### `REF1-R5-WORD-01` — the README sentence

Headline scoped to "records **current build or acceptance status**"; the carve-out now names "which
accepted work it derives from", which is what `sources.md` actually does.

### Deliberately not done

Review-05 asked that `validation-05/01-typecheck.log` be regenerated without its trailing blank
line. Under revision 5 that line is an excluded byte-capture, and regenerating a log to look tidier
is exactly the edit revision 5 says not to make. Leaving it is the consistent action; the finding's
other two parts are done.

## Coverage

| Obligation | Check | Expected facts and forbidden changes | Evidence | Result |
|---|---|---|---|---|
| `REF1-R5-SCOPE-01` closed | read the section against the contract and the row | section names revision 5 and the Layer-1 exception | `00` §2 | PASS |
| `REF1-R5-CHK-01` closed | scoped check on C6, recorded | exit 0; recorded as the contract now requires | `00` §1 | PASS |
| the exclusion does not weaken the gate | add a trailing space to an authored page, re-run | **rejected**; then restored clean | `00` §1 | PASS — negative control |
| `REF1-R5-WORD-01` closed | read headline and carve-out together | scoped to current status; carve-out matches `sources.md` | `00` §3 | PASS |
| README still confined | section-by-section against D | 6 unchanged, 2 changed, headings identical | `00` §5 | PASS |
| executable / Layer-2 / sealed / H5 | `git diff` each class | empty, byte-identical, none, empty | `00` §4 | PASS |
| reviews 01–05 unedited | modification count | 0 | `00` §4 | PASS |
| standing negative greps | four greps | 0 / none / none / 0 | `00` §6 | PASS |
| navigation, types | `check:builder-docs`, `typecheck` | 57/847/38, clean | `01`, `02` | PASS |

- Tests added/ported/removed: **none**.
- Additional self-found defects: two wrong greps in my own first draft of `00` — the section print
  stopped at the first blank line, and the revision grep was unscoped and matched the sibling row's
  "revision 3". Both corrected in place with the correction noted in the log itself; the section
  text was always right. Recorded because an evidence log that prints the wrong thing is the same
  class of defect as a report that claims the wrong thing.

## What a reviewer should attack first

1. **Judge revision 5 as a gate change, not a fix.** It narrows a proof requirement after that
   requirement failed — the exact shape 006 forbids. Test whether the argument holds: is every
   excluded file genuinely a byte-capture, is the authored payload genuinely clean, and does the
   negative control genuinely still catch authored whitespace? If you think this is weakening, say
   so; the alternative the owner rejected was a standing waiver, and either is available.
2. **Check the exclusion is as narrow as claimed.** `':(exclude)docs/development/work/*/validation-*/*.log'`
   — confirm nothing authored falls inside it, especially `MANIFEST.md`.
3. **Sweep wider than I did.** Five rounds of this family have each been closed by a sweep whose
   boundary was slightly too small. Mine is bounded by places describing the edited pages; if a
   stale statement exists one step further out, my boundary misses it too.
4. **Discount my independence entirely.**

## Validation and limits

CWD repository root. C6 `2f1a7ced4ab0a4b340132899bd61fc14ae678a6d`, tree clean. Node v25.2.1,
npm 11.6.2, TypeScript 5.9.3. Scoped `git diff --check` on C6: **exit 0**. `typecheck` clean;
`check:builder-docs` 57/847/38. Digests in `validation-06/MANIFEST.md`.

Runtime suites not rerun: no executable byte differs A→C6 (`00` §4). The full gate was run at
H4-ref — 2322/356, conformance 1949/283, kernel 264/55, SDK 22, architecture 362/37 — and review-05
independently reran the proof commands at H5-ref on Node v22.22.3.

**Node limitation, restated.** Two legacy Effect tests cancel on Node v22.22.3 (OP1), pre-existing
at original B, reproduced by four reviewers. This machine has only Node 18 and 25 and has never
reproduced it. **No all-supported-Node green claim is made.**

Carried owner observations from review-05, none actioned here because all are outside this
packet's payload: **OP4** (`014:123–124` "updates delivery evidence" is ambiguous — 014 is
administrative), **OP6** (`check:builder-docs` reads neither `work/**` nor `007`, so stale ledger
citations are structurally invisible to it), and the grant-artifact-form note (the Layer-1 grant
lives as a quoted instruction in the contract rather than a separate decision artifact like the
sibling's `decision-01.md`).

Third-party: **no new reuse**; manifests byte-unchanged; exact unmodified `canonicalize@3.0.0`
remains the sole approved third-party specifier.

## Handoff

Ready for independent review of exact H6 — cumulatively A→H6, plus the round-6 delta
`bf4d4e4..C6`. Reviews 01–05 preserved unedited. Implementation ACCEPT at K1.1-correction-01's H5
untouched and not re-certified. No self-acceptance; integration and final cleanup remain held;
`next_release: none`.

**Push state:** everything from `f8dd3b41` onward is unpushed; the remote advertises H3-ref
`a53757868277f954d55180c63d09b3ebd027ae9f`. A reviewer given this branch must confirm the remote
advertises H6 before reviewing, or they will review a three-round-stale head.

## Owner note

OP6 is the durable item and is still out of scope: the gate that passes cannot see the file where
this round's P2 lived. Five appearances of one family, each closed by a hand sweep, each sweep's
boundary slightly too small. Extending `check:builder-docs` to read `007` and `work/**`, plus an
assertion that no canonical page claims shipped status, remains a `scripts/` packet — and on this
evidence it is worth more than another careful read.
