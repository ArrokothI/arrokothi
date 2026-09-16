# Implementation report — K1.1-reference-01, round 9 (C9/H9)

## Identity

| Label | SHA |
|---|---|
| A (supplement base) | `519ba002378707a4deccff1ea0a243d21eb694b7` |
| D (owner documentation freeze) | `0ee13f8138af52107d86967043bcc460faba8893` |
| K1.1-correction-01 H5, accepted, untouched | `52b1600f3b42e3a360fdc3395178f1d147edf304` |
| H7a — the head review-07 bound its verdict to | `8373455ce3819f72d6a8849f9b8a6caf688d6dda` |
| A7 — review-07 recorded | `3ec56b61c10c8cf5bab73627201e2d0b08c3f8ba` |
| C8 (round-8 payload) | `30397797852de07c561d27216b87526bbd091ba3` |
| **H8 — round-8 candidate head, base of this round's delta** | **`212855ff849413669f26f0e2d8f0e7a701cc3d11`** |
| **C9 (round-9 payload)** | **`a117b2983278f09c03027e2b3553a9a644d18986`** |
| H9 | this commit; named by the review record that follows it, per 006:212-213 |

- Contract **revision 8**. C9 edits three paths: `decision-01.md`, `contract.md`, and the 007 packet
  **section**. C9→H9: this report, `validation-09/` (3 logs + MANIFEST), the 007 ledger **row**.
- **Role.** Implemented by the session that wrote this packet's C2–C9. **Disqualified from accepting
  anything in the K1.1 line.**
- State: WAITING_FOR_REVIEW. `next_release: none`.

## What this round is

**One thing: the owner confirmed the decisions, and `REF1-R6-AUTH-01` closes.** No review drove
this round. It closes the last finding standing from review-06, which review-07 carried forward as
the only item neither the implementer nor any reviewer could resolve.

On 2026-09-16 the owner was shown the standing finding — that `REF1-DEC-1/2/3` exist only as this
session's quotation of them, and that no reviewer with any tooling can authenticate that — and
confirmed the entries directly. Their instruction is quoted verbatim in
[`REF1-DEC-4`](decision-01.md). **This is the closure condition [review-06](review-06.md) and
[review-07](review-07.md) both named**, in both cases as the only thing capable of closing it.

**Contract revision 8 changes no scope, no acceptance criterion, no proof step and no payload path.**
It corrects revision 6's payload bullet, which said the finding was "narrowed, not closed", and
records the confirmation and its consequence.

## What the closure rests on, and what is not claimed

Stated here as well as in the decision record, because it is the kind of thing a reviewer should not
have to discover: **every commit in this repository carries the owner's git identity**, including
the ones this session authors on the owner's instruction — `REF1-DEC-4` among them. A reviewer
therefore cannot cryptographically distinguish an owner-authored confirmation from a transcribed
one, and nothing in round 9 changes that.

What changed is what the finding actually asked for. The decisions are no longer supported only by
the session that benefited from them, and the confirmation is in the durable record rather than a
transcript. A GPG-signed commit or a confirmation authored outside this session would be a stronger
artifact; **neither was done, and neither is claimed.**

## Consequence for the withdrawal

Review-07 §8 recorded four reservations about contract revision 6 while still declining to reject
the withdrawal. Their status now:

| Reservation | Status |
|---|---|
| (i) one of three claims about the exclusion's *risk* is false | closed by contract revision 7 (`REF1-R7-DIGEST-01`) |
| (ii) the identity-based alternative was declined without a stated ground | addressed in revision 7's statement of the surviving objection |
| (iii) the owner-facing ask was framed as making findings disappear | recorded verbatim in `REF1-DEC-3`, with revision 6 carrying the reason that survives review |
| (iv) "the whole route rests on an owner approval that nothing in this repository can authenticate" | **discharged** — `REF1-DEC-3` is that approval, and the owner has now confirmed it |

`REF1-R6-CHK-01` and `REF1-R6-EXCL-01` remain **moot by owner-directed withdrawal**, as review-07
recorded them. The conditional review-07 attached — "reopen unchanged if the owner declines
`REF1-DEC-3`" — is **no longer live**, because the owner has not declined it.

## Coverage

| Obligation | Check | Expected facts and forbidden changes | Evidence | Result |
|---|---|---|---|---|
| `REF1-R6-AUTH-01` closed | `REF1-DEC-4` present, owner instruction verbatim, residual stated | 4 entries; confirmation quoted; residual in the entry itself | `00` §1 | PASS |
| decision record still append-only | byte-prefix comparison H8 vs C9 | first 4,646 bytes identical; 2,503 appended | `00` §1 | PASS |
| round-9 delta confined | `git diff --name-only H8 C9` | exactly 3 declared paths | `00` §2 | PASS |
| no scope or criterion change | read revision 8 against revision 7 | payload list unchanged except the corrected bullet; REF table untouched | `contract.md` | PASS |
| executable / Layer-2 / sealed | `git diff` each class, cumulative | 0 paths, byte-identical, 0 modified or deleted | `00` §3–4 | PASS |
| navigation, types | `check:builder-docs`, `typecheck` | 57/848/38, clean, both exit 0 | `02`, `01` | PASS |

- Tests added/ported/removed: **none**.
- **Self-found defects this round: two, both caught before commit and both the familiar class.**
  (1) The first draft of `00` measured the round-9 delta as `C8..C9`, which also spans H8's report
  and evidence and printed five paths where the round touched three; corrected to `H8..C9`, with
  the reason stated in the log. (2) The first draft closed the whitespace census with "unchanged
  from round 8". **It was not unchanged**: `A..C9` is 18/13/5 against round 8's 12/7/5, and the six
  new trailing-whitespace lines are in round 8's own `validation-08/00-scope-and-counts.log`,
  produced by that log's `printf` column padding. Round 8's logs are committed evidence and were
  **not** edited to tidy this; round 9's tables drop the padding instead, so `H8..C9` is 0/0/0. No
  gate is affected — `git diff --check` is withdrawn for this packet — but a log asserting
  "unchanged" would have been the same false-universal that `REF1-R7-EVID-04` found.

## What a reviewer should attack first

1. **Judge whether `REF1-DEC-4` actually closes `REF1-R6-AUTH-01`**, given that the confirmation is
   recorded by the same session it exonerates. The record says so itself; decide whether that is
   sufficient or whether you want an owner-authored or signed artifact. If the latter, say so — the
   owner can supply it and nothing else in the packet depends on the answer.
2. **Check revision 8 changed no scope.** The payload list, the REF table and every acceptance
   criterion should be identical to revision 7 apart from the corrected AUTH-01 bullet.
3. **Confirm `decision-01.md` is genuinely append-only**, not rewritten — `00` §1 does a byte-prefix
   comparison, but do it yourself.
4. **Re-measure round 8's corrections rather than trusting this report's summary of them**, in
   particular the digest census in `validation-08/01`.
5. **Discount my independence entirely.** I wrote C2–C9.

## Validation and limits

CWD repository root. C9 `a117b2983278f09c03027e2b3553a9a644d18986`, tree clean at capture.
Node v25.2.1, npm 11.6.2, git 2.39.5, Darwin 25.6.0. `typecheck` exit 0; `check:builder-docs`
57/848/38 exit 0. Digests in `validation-09/MANIFEST.md`.

Runtime suites not rerun: no executable byte or dependency manifest differs A→C9, and the round-9
delta is three documentation paths (`00` §2–3). Review-07 independently reran the full gate at H7a
and reproduced 2322/356 with 0 failures on Node v22.22.3.

**Node limitation, restated.** Two legacy Effect tests cancel on Node v22.22.3 (OP1), pre-existing
at original B, reproduced by five reviewers. This machine has Node 18 and 25 only and has never
reproduced it. **No all-supported-Node green claim is made.**

Carried owner observations, all outside this packet's payload and none actioned: `014:139` and
`014:123–124`; **OP6**; and the **two malformed digest rows in predecessor packets** —
`K1.1/validation-06/04-test-conformance.log` (67 hex characters) and
`K1.1/validation-10/09b-distinguishing-ablations.log` (a 51-hex prefix) — which pin nothing today.

Third-party: **no new reuse**; `package.json` and `package-lock.json` byte-identical A→C9; exact
unmodified `canonicalize@3.0.0` remains the sole approved third-party specifier.

## Handoff

Ready for independent review of exact H9 — cumulatively A→H9, plus the round-9 delta `H8..C9`.
Reviews 01–07 preserved unedited. Implementation ACCEPT at K1.1-correction-01's H5 untouched and not
re-certified. No self-acceptance; integration and final cleanup remain held; `next_release: none`.

**Push state.** Carries no claim about what the remote advertises when you read this: run
`git ls-remote` and confirm the advertised SHA matches the exact candidate you were given.

## Owner note

**Every finding from review-06 and review-07 is now closed or moot, and no finding is open.**
`REF1-R6-AUTH-01` was the last one, and only the owner could close it.

What remains for a reviewer is a judgment, not a defect list: whether contract revision 7's narrower
objection still supports the withdrawal, and whether an owner confirmation recorded by the
implementing session closes an authentication finding. Both are stated in the record for a reviewer
to decide against, not accept.

Outside this packet, unchanged and still worth more than another round: `check:builder-docs`
extended to read `007` and `work/**`, plus a markdown-aware whitespace check. Round 9 supplies one
more data point for it — the six warnings this packet's own round-8 log introduced through column
padding were found by hand, again. `main` still carries the pre-correction kernel (`f117e6b`), and a
merge of this branch is clean and yields this branch's tree exactly.
