# Implementation report — K1.1-reference-01, round 7 (C7/H7)

## Identity

| Label | SHA |
|---|---|
| A (supplement base) | `519ba002378707a4deccff1ea0a243d21eb694b7` |
| D (owner documentation freeze) | `0ee13f8138af52107d86967043bcc460faba8893` |
| K1.1-correction-01 H5, accepted, untouched | `52b1600f3b42e3a360fdc3395178f1d147edf304` |
| H6-ref, reviewed by [review-06](review-06.md) | `bbcbf300acb583b87dbf6b4bd323700bccd9e90f` |
| A6 — review-06 recorded | `f696b21a7a534f8831926e9e7f54403e7c04218a` |
| **C7 (round-7 payload)** | **`6535d5739c33a3973d0cce3a2473777a4ce14c2b`** |
| H7 | this commit |

- Contract **revision 6**. C7 edits four paths: this packet's `contract.md`, the new
  `decision-01.md`, the 007 packet **section**, and the two authorized `README.md` sections.
  C7→H7: this report, `validation-07/` (5 logs + MANIFEST), the 007 ledger **row**.
- **Role.** Implemented by the session that wrote review-05 of the sibling packet and this
  packet's C2–C7. **Disqualified from accepting anything in the K1.1 line.**
- State: WAITING_FOR_REVIEW. `next_release: none`.

## The five findings, verified before acting

All five of [review-06](review-06.md)'s findings are **correct**. Each was checked against git
before any edit, and two were found to be worse than stated.

| Finding | Claim | Git | Verdict |
|---|---|---|---|
| `REF1-R6-CHK-01` P2 | revision 5 requires the check on C **and on H**; round 6 recorded only A→C6 | confirmed; unscoped at H6 is **12**, not the 9 review-05 saw, and the 3 new ones are in round 6's own files | **CONFIRMED** |
| `REF1-R6-EXCL-01` P2 | the exclusion is drawn by path shape, not by the property that justifies it | confirmed and **understated**: **453** files exempted repo-wide, not the 8 sealed instances under discussion; `../K1.0/validation-01/09-self-01-demonstration.log` is hand-authored prose; **31** warnings survive on the integration range | **CONFIRMED, WORSE** |
| `REF1-R6-WORD-02` P3 | README:81 says the ledger owns status "alone", README:89 says "Two documents answer that" | verbatim present; plus "are implemented under K1.1", a present-tense build claim on Layer 1 | **CONFIRMED** |
| `REF1-R6-EVID-01` P3 | all five typecheck logs v02–v06 share one digest; results printed without their commands | digest `a2051020811e29fd…` identical across five rounds | **CONFIRMED** |
| `REF1-R6-AUTH-01` P3 | the owner's revision-5 decision exists only as this session's quotation of it | true by construction | **CONFIRMED** |

**Two errors in the review, offered as reconciliation, not rebuttal.** §14 says "all 21 match"
while §6 self-corrects to 20; the packet holds 20 raw logs and 20 is right. §2 records that the
request named the candidate "K1.1-correction-02", which is not a packet that exists — worth the
owner checking what was sent, since a reviewer pointed at the wrong packet would review the wrong
tree. Neither affects any finding.

## Changes

### `REF1-R6-EXCL-01` and `REF1-R6-CHK-01` — contract revision 6, on owner decision REF1-DEC-3

**The step is withdrawn, not re-scoped.** `git diff --check` is no longer a proof step for this
packet, and revision 5's exclusion goes with it. Revision 5's text is preserved unedited and marked
withdrawn.

**State the shape first: this removes a gate an implementation failed — the move 006 forbids.**
The contract says so in those words before it argues, and names the remedy if the argument fails:
restore revision 5's command and reopen the finding. The argument is that the tool is measuring a
property this content type does not have, which is a different fault from a dirty payload.

The measurement, with both ranges stated because they answer differently (`00` §1):

| Range | Unscoped | Revision 5's scoped command |
|---|---|---|
| `A..C7` — the packet's own | 7 | **0** |
| `main..C7` — integration | 66 | **31** |

On its own range revision 5 passed. It passed **because the exclusion hid two authored lines**
inside `validation-06/00-findings-and-scope.log` — `:15`, the negative control's own inserted
space, and `:53`, a `printf '%-52s '` pad. At the integration range it leaves **31** warnings in
the **sibling** packet's sealed reviews, which this packet may not edit. All 31 are **exactly two
trailing spaces** — 31 of 31, measured — the markdown hard line break:

```text
**Verdict:** ACCEPT··
**Reviewer:** OpenAI GPT-5.6 Sol (High)··
```

Deleting that markup would reflow those metadata lines into one paragraph, changing what a sealed
review renders as. So revision 5 produced a step that **passes inside the packet and cannot pass at
integration**, and whose in-packet pass depended on hiding authored whitespace. That is not a gate.

**On my own negative control, which review-05 asked for and I supplied.** It added a trailing space
to `reference.md` and showed the scoped check still caught it. That proves the exclusion does not
hide whitespace in *non-excluded* pages — and says nothing about whitespace inside the excluded
ones, which is the only place it could hide anything. It was built to confirm what the revision
claimed rather than to break it. The owner's instruction was that the modification "would not
weaken the future `git diff`"; measured properly, it did, and I reported it as strengthened.

Recorded in [decision-01](decision-01.md) as `REF1-DEC-2` superseded by `REF1-DEC-3`, including the
owner's own expressed doubt at the time — *"Not sure if we can just exclude record from git diff"* —
which was the correct instinct.

**No replacement gate is claimed.** A markdown-aware whitespace check that distinguishes a hard
break from residue, and that reads `docs/development/work/**`, is a `scripts/` packet. It is named
in the contract so the gap stays visible rather than closing silently.

### `REF1-R6-WORD-02` — the two authorized README sections

`:81` now names the same two owners `:89` does — the ledger for what has been accepted and
integrated, `002` for the API surface that exists — and states that no page in Layers 1–3 is a
second place for either. The orientation paragraph stops asserting build state: "are implemented
under K1.1" becomes "are K1.1's", framed as which gate owns what, with the current answer deferred
to the ledger. Scope proved section by section against D in `01`: six sections byte-unchanged, two
changed, section list and order identical, `#target-not-shipped` intact.

### `REF1-R6-AUTH-01` — narrowed, not closed

[`decision-01.md`](decision-01.md) now holds the owner's scope decisions in the sibling packet's
artifact form, append-only, three entries. **It states its own authentication limit in its second
paragraph**: a reviewer can verify that behavior matches the quotations but cannot authenticate the
quotations, because the session transcript is not in the repository. Creating the file does not
close the finding. Closing it needs the owner to confirm the entries directly.

### `REF1-R6-EVID-01`

Every round-7 log carries its commit SHA, UTC run timestamp and Node/npm versions in its header,
and prints the command before each result. The five digests in the MANIFEST are mutually distinct
and differ from `a2051020811e29fd…`.

## Coverage

| Obligation | Check | Expected facts and forbidden changes | Evidence | Result |
|---|---|---|---|---|
| `REF1-R6-EXCL-01`/`CHK-01` resolved | measure both ranges; classify every survivor | 31/31 exactly 2 trailing spaces; 453 files exempted; 2 authored lines were hidden | `00` §1 | PASS — by withdrawal, not compliance |
| `REF1-R6-WORD-02` closed | read :81 and :89 together; grep build claims | one pair of owners in both; 0 present-tense claims | `01` | PASS |
| `REF1-R6-EVID-01` closed | digests and headers | 5 distinct digests; commands shown | `MANIFEST` | PASS |
| `REF1-R6-AUTH-01` narrowed | decision record exists, states its limit | 3 entries; limit in ¶2 | `01` | PARTIAL — by design |
| README still confined | section-by-section against D | 6 unchanged, 2 changed, headings identical | `01` | PASS |
| executable / Layer-2 / sealed | `git diff` each class | 0 paths, byte-identical, 0 modified or deleted | `00` §3–5 | PASS |
| status sweep | gate-adjacent regex, classified | 18 hits, 0 are build claims; 1 permitted SHA on a navigation page | `01` | PASS |
| navigation, types | `check:builder-docs`, `typecheck` | 57/848/38, clean, both exit 0 | `03`, `02` | PASS |
| integration state | ancestry, subtree hashes, merge dry-run | recorded | `04` | recorded, not a claim |

- Tests added/ported/removed: **none**.
- **Additional self-found defects, all in this round's own evidence before it was committed.**
  Three, and each is the same class review-06 named. (1) The first draft of `00` measured
  `git diff --check` on `A..C7` and then quoted the 31-warning figure from `main..H6` beside it —
  two ranges presented as one, which is `KC1-R5-PROC-01` again; both ranges are now stated
  separately with that risk named in the log. (2) A sweep grep in the first draft of `01` returned
  97 lines of ordinary protocol vocabulary and would have been reported as a number; a bare count
  cannot distinguish "an Outcome is accepted" from "K1.1 is accepted", so it was replaced with a
  classified list. (3) A `grep -rnoE ... || echo "(none)"` printed "(none)" when the regex itself
  **errored** on a complexity limit — a failure rendered as a pass, which is exactly `REF1-R6-EVID-01`;
  replaced with a checker that cannot fail silently. Also corrected: widening the SHA grep to all of
  `mental-model/` found `sources.md:30`, and the log's inline comment still claimed none existed —
  the hit is permitted provenance and is now recorded with its reason rather than hidden by a
  narrower grep.

## What a reviewer should attack first

1. **Judge the withdrawal as a gate removal.** It is one. Test the three load-bearing facts
   yourself: are all 31 survivors exactly two trailing spaces; are they all in sealed files this
   packet may not edit; did revision 5's in-packet pass depend on hiding authored whitespace. If
   any fails, the argument fails and the remedy is in the contract.
2. **Test whether removal is broader than it needs to be.** A reviewer could reasonably hold that
   the step should stay and only the sibling's sealed files be exempted by *identity*, not shape.
   That option was available and was not taken; say so if you prefer it.
3. **Check `decision-01.md` against behavior**, since you cannot check it against a transcript.
4. **Sweep wider than I did.** Six rounds of the stale-status family have each been closed by a
   sweep whose boundary was slightly too small, including mine.
5. **Discount my independence entirely.** I wrote C2–C7 and the review that started the sibling
   packet.

## Validation and limits

CWD repository root. C7 `6535d5739c33a3973d0cce3a2473777a4ce14c2b`, tree clean at capture.
Node v25.2.1, npm 11.6.2, TypeScript 5.9.3. `typecheck` exit 0; `check:builder-docs` 57/848/38
exit 0. Digests in `validation-07/MANIFEST.md`.

Runtime suites not rerun: no executable byte differs A→C7 (`00` §3). The full gate was run at
H4-ref — 2322/356, conformance 1949/283, kernel 264/55, SDK 22, architecture 362/37.

**Node limitation, restated.** Two legacy Effect tests cancel on Node v22.22.3 (OP1), pre-existing
at original B, reproduced by four reviewers. This machine has Node 18 and 25 only and has never
reproduced it. **No all-supported-Node green claim is made.**

Carried owner observations, none actioned here because all are outside this packet's payload:
**OP4** (`014:123–124` wording), **OP6** (`check:builder-docs` reads neither `work/**` nor `007`),
and `014:139`, which still points at `implementation-01.md` as this packet's report — six rounds
and six contract revisions stale.

Third-party: **no new reuse**; manifests byte-unchanged; exact unmodified `canonicalize@3.0.0`
remains the sole approved third-party specifier.

## Handoff

Ready for independent review of exact H7 — cumulatively A→H7, plus the round-7 delta `A6..C7`.
Reviews 01–06 preserved unedited. Implementation ACCEPT at K1.1-correction-01's H5 untouched and
not re-certified. No self-acceptance; integration and final cleanup remain held; `next_release: none`.

**Push state:** everything from `f8dd3b41` onward is unpushed. A reviewer given this branch must
confirm the remote advertises H7 before reviewing.

## Owner note

**`main` is carrying kernel code no review accepted, and nothing in six rounds of this packet's
records said so.** `04` has the commands. `main` `07f7502c` is a merge the owner made on
2026-09-15; its tree equals `a8ac787b`, the K1.1 candidate as it stood **before**
K1.1-correction-01 — before the `KC1-ARCH-1` delivery reporting boundary that resolved the
`BLOCKED_ARCHITECTURE` finding. `main:packages/kernel` is byte-identical to superseded `f117e6b`
and differs from accepted H5 by 9 files.

The merge itself is clean: both of main's parents are ancestors of this branch, so merging produces
this branch's tree exactly, with zero conflicts. It cannot fast-forward and needs a merge commit,
but there is nothing to resolve. **That is an owner integration decision and this packet's state is
unchanged: WAITING_FOR_REVIEW.**

OP6 remains the durable item. Six appearances of one family, each closed by a hand sweep whose
boundary was slightly too small. Extending `check:builder-docs` to read `007` and `work/**`, plus
an assertion that no canonical page claims shipped status, is worth more than another careful read
— and round 7 adds a second candidate for that packet: a markdown-aware whitespace check, which is
the thing revision 6 just proved does not exist.
