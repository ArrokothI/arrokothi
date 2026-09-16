# Implementation report — K1.1-reference-01, round 8 (C8/H8)

## Identity

| Label | SHA |
|---|---|
| A (supplement base) | `519ba002378707a4deccff1ea0a243d21eb694b7` |
| D (owner documentation freeze) | `0ee13f8138af52107d86967043bcc460faba8893` |
| K1.1-correction-01 H5, accepted, untouched | `52b1600f3b42e3a360fdc3395178f1d147edf304` |
| C7 (round-7 payload) | `6535d5739c33a3973d0cce3a2473777a4ce14c2b` |
| **H7a — the head review-07 reviewed and bound its verdict to** | **`8373455ce3819f72d6a8849f9b8a6caf688d6dda`** |
| A7 — review-07 recorded | `3ec56b61c10c8cf5bab73627201e2d0b08c3f8ba` |
| **C8 (round-8 payload)** | **`30397797852de07c561d27216b87526bbd091ba3`** |
| H8 | this commit; named by the review record that follows it, per 006:212-213 |

- Contract **revision 7**. C8 edits three paths: this packet's `contract.md`, `mental-model/README.md`
  (inside the two authorized sections), and the 007 packet **section**. C8→H8: this report,
  `validation-08/` (5 logs + MANIFEST), the 007 ledger **row**.
- **Role.** Implemented by the session that wrote review-05 of the sibling packet and this packet's
  C2–C8. **Disqualified from accepting anything in the K1.1 line.**
- State: WAITING_FOR_REVIEW. `next_release: none`.

## The findings, verified before acting

**All six of [review-07](review-07.md)'s items are correct.** Each was measured against git before
any edit. None is a hallucination, and **all four P2s are false statements this session wrote.**

| Finding | The claim I made | What the repository says | Verdict |
|---|---|---|---|
| `REF1-R7-DIGEST-01` P2 | contract rev 6: the exempted logs are "most of them pinned by no MANIFEST digest" | **inverted.** Of 458: 423 same-dir MANIFEST rows match the bytes, 33 (`K0.2/validation-12..16`) are pinned in `K0.2/implementation-12..16` and all 33 verified matching, 2 carry malformed 67- and 51-hex rows. **Nothing is unpinned.** | **CONFIRMED** |
| `REF1-R7-QUOTE-02` P2 | contract rev 6: revision 5's "text follows unedited" | the block is byte-identical, but the contract's closing `next_release` paragraph that followed it at C6 now closes revision 6 | **CONFIRMED** |
| `REF1-R7-COUNT-03` P2 | report: "Unscoped 7" (`A..C7`) and "Unscoped 66" (`main..C7`) | those are the **trailing-whitespace class alone**; the totals are **12** and **76**. The same report credits review-06 with "unscoped at H6 is 12", a total — so the record contradicts itself in unit | **CONFIRMED** |
| `REF1-R7-EVID-04` P2 | report: "**every** round-7 log carries its commit SHA, UTC run timestamp and Node/npm versions" | true of 2 of 5. `01` had Node without npm; `00` and `04` had no toolchain line | **CONFIRMED** |
| `REF1-R7-WORD-05` P3 | `README:83` routed "implemented" to the ledger | two sentences above now give the API-surface role to `002` | **CONFIRMED** |
| §11 head binding P2-class | — | `8373455…` appeared **zero** times in `contract.md`, `decision-01.md`, `implementation-07.md`, `validation-07/` and `007` | **CONFIRMED** |

Review-07 also **accepts the withdrawal itself** and records all five REF criteria as PASS, with
`REF1-R6-CHK-01` and `REF1-R6-EXCL-01` moot by owner-directed withdrawal rather than closed. Round 8
changes no scope and no acceptance criterion; it corrects the record.

## Changes

### `REF1-R7-DIGEST-01` — contract revision 7 replaces a false census with a measured one

The clause was load-bearing: it was the only stated reason to read the exclusion's breadth as *risk*
rather than as the exclusion's own defence. It was also wrong in the one document every future round
of this packet must read as its gate. Revision 7 states the census the repository reproduces
(`01`), names the two malformed predecessor rows, and corrects the companion clause too — "at least
one exempted log opens with hand-authored prose" is true but does not discriminate, because **73 of
458** open with a `#` header, which 006's environment rule *requires*.

**Revision 7 states the objection that survives measurement instead**, and it is narrower than what
revision 6 argued: **a digest pins bytes and certifies no whitespace hygiene**, so "these files are
digest-pinned" was never a reason a linter could safely skip them. Alongside it, the boundary
argument, which the measurements strengthen: the exempted set grew **433 → 453 → 458** across A, C7
and H7a — five of the last additions made by the round that was arguing about it.

**The withdrawal is not disturbed.** It rests on the wrong measured property (two-space hard breaks
are markdown syntax), the wrong operand (the 31 survivors are in a sibling packet's sealed files),
and that unstable boundary. The false clause is withdrawn, not repaired into a different argument
for the same conclusion.

### `REF1-R7-QUOTE-02` — the preservation claim is made precise

The revision-5 block is byte-identical to C6 from its heading through its last sentence, and `00` §6
diffs it to show that. What moved is the contract's closing `next_release` status line. Revision 7
records this rather than restoring the paragraph inside the block, because `next_release` is the
contract's **live status field** and printing a live status field inside text marked WITHDRAWN would
be a worse defect than the displacement it fixes. Revision 5's authorship of that sentence is stated
so the provenance review-07 flagged is not lost.

### `REF1-R7-COUNT-03` — classes named, totals given

`00` §1 tabulates `A..C7`, `A..C8`, `main..C7`, `main..C8` and `C7..C8` with **TOTAL, trailing and
EOF-blank in separate columns** plus the exit code, and every command is run with stderr captured so
a bad range prints STDERR rather than a silent clean. That guard caught a malformed range while this
log was being written — the hazard review-07 §1 records, reproduced and defeated in the same file.

### `REF1-R7-EVID-04` — the universal is made true, not qualified

All five round-8 logs carry an identical seven-line header: commit, UTC run time, Node, npm, git,
platform, and a note saying which of those the log's own commands use. Round 7's claim was true of
two of five; this is checkable by reading lines 2–8 of each file.

### `REF1-R7-WORD-05` — README:83

"the ledger is the place for it" becomes "one of those two documents is the place for it:
acceptance, integration and commit identities in the ledger, and what the API surface actually
provides in the implemented baseline." Inside an authorized section; six sections still byte-unchanged
against D.

### Head binding (§11)

**H7a `8373455ce3819f72d6a8849f9b8a6caf688d6dda` is now recorded in the repository** — in this
table, in `00` §7, in the 007 row, and in the A7 commit message. No commit can contain its own SHA,
so a candidate head is named by the **review record that follows it**, which is what 006:212-213
already prescribes; this round discharges that for H7a, and the same mechanism names this round's
head when its review is transcribed. A reviewer binds the verdict to the SHA they measured with
`git ls-remote`.

### Deliberately not done

`implementation-07.md` is **preserved unedited**. Its four false statements are superseded by name
in the table above, which is the treatment `implementation-04.md` received for `KC1-R5-PROC-01` and
which review-08 of the sibling packet accepted. Editing a reviewed report to make it look correct
would destroy the record of what the reviewer actually read.

## Coverage

| Obligation | Check | Expected facts and forbidden changes | Evidence | Result |
|---|---|---|---|---|
| `REF1-R7-DIGEST-01` closed | census every exempted file against its manifest and round reports | 423 + 33 + 2 = 458; nothing unpinned | `01` | PASS |
| `REF1-R7-QUOTE-02` closed | diff the rev-5 block against C6 | byte-identical; the moved paragraph named | `00` §6 | PASS |
| `REF1-R7-COUNT-03` closed | per-class and total columns, stderr visible | 12/76 totals recorded beside 7/66 | `00` §1 | PASS |
| `REF1-R7-EVID-04` closed | read lines 2–8 of all five logs | identical seven-line header in each | `MANIFEST`, each log | PASS |
| `REF1-R7-WORD-05` closed | grep old and new wording | 0 old, 1 new | `02` | PASS |
| head binding | H7a recorded and locatable | present in report, `00` §7, 007 row, A7 message | `00` §7 | PASS |
| `REF1-R6-AUTH-01` | — | unchanged; owner confirmation is the only closure | — | **still open** |
| README confined | section-by-section against D | 6 unchanged, 2 changed, headings and order identical | `02` | PASS |
| executable / Layer-2 / sealed | `git diff` each class incl. `package*.json` | 0 paths, byte-identical, 0 modified or deleted | `00` §3–5 | PASS |
| status sweep | gate-adjacent regex, classified | 18 hits, 0 build claims; 1 permitted SHA with its reason | `02` | PASS |
| navigation, types | `check:builder-docs`, `typecheck` | 57/848/38, clean, both exit 0 | `04`, `03` | PASS |

- Tests added/ported/removed: **none**.
- Additional self-found defects this round: one, disclosed in `00` itself — the first draft of the
  count table passed a malformed range and the stderr guard printed `STDERR: fatal: ambiguous
  argument` instead of a clean zero. Recorded because it is the first time this packet's own
  tooling caught that class instead of shipping it.

## What a reviewer should attack first

1. **Re-measure the census in `01` yourself.** It is the correction this whole round turns on, and
   the previous version of it was wrong in the governing artifact. `423 + 33 + 2 = 458`.
2. **Judge whether revision 7's narrower objection still supports the withdrawal**, or whether
   losing the breadth-as-risk argument should reopen it. Review-07 accepted the withdrawal on the
   three facts it verified; revision 7 keeps those and drops the false one. If you think what
   remains is insufficient, the remedy is unchanged: restore revision 5's command and reopen
   `REF1-R6-EXCL-01`.
3. **Check that `implementation-07.md` is byte-unedited** and that its false sentences are
   superseded by name rather than rewritten.
4. **Sweep wider than I did.** Seven rounds of the stale-record family have each been closed by a
   sweep whose boundary was slightly too small, including mine.
5. **Discount my independence entirely.** I wrote C2–C8.

## Validation and limits

CWD repository root. C8 `30397797852de07c561d27216b87526bbd091ba3`, tree clean at capture.
Node v25.2.1, npm 11.6.2, git 2.39.5, Darwin 25.6.0. `typecheck` exit 0; `check:builder-docs`
57/848/38 exit 0. Digests in `validation-08/MANIFEST.md`.

Runtime suites not rerun: no executable byte or dependency manifest differs A→C8 (`00` §3).
Review-07 independently reran the full gate at H7a and reproduced 2322/356 with 0 failures.

**Node limitation, restated.** Two legacy Effect tests cancel on Node v22.22.3 (OP1), pre-existing
at original B, reproduced by five reviewers including review-07. This machine has Node 18 and 25
only and has never reproduced it. **No all-supported-Node green claim is made.**

Carried owner observations, none actioned because all are outside this packet's payload: `014:139`
(points at `implementation-01.md` as this packet's report, eight rounds stale) and `014:123–124`;
**OP6** (`check:builder-docs` reads neither `work/**` nor `007`); and **two malformed digest rows in
predecessor packets** — `K1.1/validation-06/04-test-conformance.log` (67 hex characters) and
`K1.1/validation-10/09b-distinguishing-ablations.log` (a 51-hex prefix), found by review-07 and
reproduced in `01`. Those two rows pin nothing today.

Third-party: **no new reuse**; `package.json` and `package-lock.json` byte-identical A→C8; exact
unmodified `canonicalize@3.0.0` remains the sole approved third-party specifier.

## Handoff

Ready for independent review of exact H8 — cumulatively A→H8, plus the round-8 delta `A7..C8`.
Reviews 01–07 preserved unedited. Implementation ACCEPT at K1.1-correction-01's H5 untouched and
not re-certified. No self-acceptance; integration and final cleanup remain held; `next_release: none`.

**Push state.** Measured only at the moment of writing, and deliberately carrying no claim about
what the remote advertises when you read this: a reviewer runs `git ls-remote` and confirms the
advertised SHA matches the exact candidate they were given, before reviewing anything.

## Owner note

**Round 8 is the fourth consecutive round whose findings were all about this packet's own records,
not its content.** REF-1 through REF-4 have passed every review since round 2, and review-07 passed
all five REF criteria. What keeps failing is narrower than "documentation": it is that each round's
report makes fresh factual claims — counts, censuses, universals — and the next reviewer measures
them. Four of this round's six findings exist only because round 7 asserted numbers instead of
printing measurements.

The structural fix is the one this packet has now named three times and cannot implement inside its
own scope: `check:builder-docs` extended to read `007` and `work/**`, plus a markdown-aware
whitespace check that knows a two-space line ending is syntax. A `scripts/` packet. On eight rounds
of evidence it is worth more than another careful read.

`main` still carries the pre-correction kernel (`f117e6b`), and a merge of this branch is clean and
yields this branch's tree exactly. That is an owner decision and does not change this packet's state.
