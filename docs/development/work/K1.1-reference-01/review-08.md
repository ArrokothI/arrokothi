# Independent cumulative review 08 — K1.1-reference-01 (contract revisions 7 and 8)

Base `519ba002378707a4deccff1ea0a243d21eb694b7`; reviewed H `644dfffc7904176ee3a4f9943310cf926408a113`
(H9, the head the remote advertises); review record `review-08.md`, this file. Round 7's six items are
all verified fixed. **No P0, P1 or P2 finding is open.** Five P3 items are recorded, none blocking.
Every REF criterion passes, and `REF1-R6-AUTH-01` is closed on the route review-06 itself named.

## 1. Session, model, date, environment, access and access limits

- Reviewer: an Arena.ai Agent Mode session on `arena/01a0a84c-arrokothi`, the same session that wrote
  review-06 and review-07 and no payload commit. Arena discloses no underlying model name, so none is
  invented in this record (008 forbids fabricating the reviewer field). The candidate's own commit
  trailers assert "Co-Authored-By: Claude Opus 5"; that is the candidate's statement about itself and
  I neither confirm nor rely on it.
- Date: 2026-09-16. My last measurement timestamp is the `ls-remote` below, 05:50:13Z, with the
  reruns completing after it; I claim no window I did not stamp.
- Access: full clone (`.git/shallow` absent this round; verified before measuring, because a shallow
  clone makes `git diff --check <missing> <sha>` print nothing and exit 0 — the hazard my review-07 §1
  recorded, which round 8's own log cites and guards by printing STDERR). `gh` works; there is no pull
  request for this branch (`gh pr list --state all --head …` empty), so no GitHub-side diff was used.
- `git ls-remote origin` at 2026-09-16T05:50:13Z advertised `644dfffc7904176ee3a4f9943310cf926408a113`
  for the candidate branch and `07f7502c4a7d75aa37ab7694c5e62522e0e8c9ec` for `main`. The head I
  reviewed is the advertised head. Nothing here says what the remote will advertise when the owner
  reads this, and the packet now says the same.
- Execution: worktree checked out at exactly H9, `git status --porcelain` = 0 lines (only ignored
  `node_modules/`), Node v22.22.3. §5 items are **reruns by me**, not reads of the candidate's logs.
- Limits that bind the verdict: the owner's messages in the delegated cleanup session are not in the
  repository, so `REF1-DEC-1/2/3/4` remain attributable but not authenticateable — this round's
  central question, judged in §4; the sibling packet's sealed files cannot be edited by this packet;
  Node 18/25 unavailable here, so the implementer's environment is inspected, not reproduced; and
  `docs/development/work/K1.1-correction-01/**` plus the `K1.1` predecessor rows are outside scope.

## 2. Candidate identity

| Label | SHA | Verified here |
|---|---|---|
| A — supplement base | `519ba002378707a4deccff1ea0a243d21eb694b7` | ancestor of H9 |
| B — governing policy baseline | `777b9955fb3a443f700b4f3d1f4f2aef1869345b` | 006/008/012 byte-identical at H9 |
| D — owner documentation freeze | `0ee13f8138af52107d86967043bcc460faba8893` | Layer-2 reference |
| Sibling H5 — implementation ACCEPTED | `52b1600f3b42e3a360fdc3395178f1d147edf304` | not re-certified here |
| H7a — head bound by review-07 | `8373455ce3819f72d6a8849f9b8a6caf688d6dda` | named in A7, report 08/09, 007 |
| A7 — review-07 transcribed | `3ec56b61c10c8cf5bab73627201e2d0b08c3f8ba` | see §7.4 |
| C8 — round-8 payload | `30397797852de07c561d27216b87526bbd091ba3` | contract rev 7, README, 007 section |
| H8 — round-8 head | `212855ff849413669f26f0e2d8f0e7a701cc3d11` | named in report 09 and `00` v09 |
| C9 — round-9 payload | `a117b2983278f09c03027e2b3553a9a644d18986` | contract rev 8, decision-01, 007 section |
| **H9 — candidate head reviewed here** | `644dfffc7904176ee3a4f9943310cf926408a113` | report 09 + validation-09 + 007 row |

Two rounds arrived in one push (`3039779 → 212855f → a117b29 → 644dfffc`, plus `3ec56b6` transcribing
my review-07), and the review obligation is therefore cumulative over `A..H9` with the round-8/9
delta `C7..H9`. 006:193 is satisfied for every head but the one in progress: H8's full SHA is in
report 09's table and in `validation-09/00`; H9's cannot be self-named, and this record names it — the
mechanism the packet documented last round and which the A7 message demonstrated.

## 3. Round-7 findings, re-measured rather than accepted

| Finding | Round-8/9 claim | My independent measurement | Status |
|---|---|---|---|
| `REF1-R7-DIGEST-01` P2 | rev 7 replaces the false census: 453 at C7, 458 at H7a; 423 + 33 + 2 = 458; nothing unpinned; 433 → 453 → 458; 73 of 458 open with `#` | Census rerun at H9 by me: **466** logs match the exclusion pattern at H9, **431** same-dir MANIFEST rows match (423 + the 8 new round-8/9 captures), **33** in `K0.2/validation-12..16` with no directory manifest, all 33 matching a digest in `K0.2/implementation-12..16`, **2** malformed predecessor rows; `#`-headers **81** at H9 = their 73 at H7a + 8 new ✓; 433/453/458 reproduce at A/C7/H7a ✓ | **CLOSED** (one 2-file overstatement → §7.2) |
| `REF1-R7-QUOTE-02` P2 | block byte-identical to C6 through its last sentence; the `next_release` paragraph is recorded as moved, not restored | Cut at their stated boundary: **2923 = 2923 chars, identical**; whole-block diff shows exactly the 3 moved lines | **CLOSED** — via the second branch my finding allowed, with the reason stated and provenance preserved |
| `REF1-R7-COUNT-03` P2 | `00` §1 gives TOTAL / trailing / EOF-blank columns and exit codes per range, stderr visible | Every figure reproduced: A..C7 12/7/5, A..C8 12/7/5, main..C7 76/66/10, main..C8 76/66/10, C7..C8 0/0/0, and round 9's A..C9 18/13/5, main..C9 82/72/10, H8..C9 0/0/0 | **CLOSED** |
| `REF1-R7-EVID-04` P2 | "the universal is made true, not qualified": all five round-8 logs carry an identical seven-line header | Read lines 2–8 of all **8** round-8/9 logs: commit, UTC run, Node, npm, git, platform, plus a toolchain note naming which the log's commands use ✓ in each; all 13 round-7/8/9 log digests mutually distinct; all 33 packet logs match their MANIFEST | **CLOSED** — the stronger of the two options I offered |
| `REF1-R7-WORD-05` P3 | `README:83` now routes by subject: ledger for acceptance/integration/commit identities, `002` for the API surface | Verified the replacement sentence, and that the edit stayed inside `## How these pages are organized`: 8 sections, heading list identical to D, 6 byte-unchanged, the same 2 authorized sections changed, `#target-not-shipped` intact. Note: **my review-07 cited this sentence as `:85`; the accurate locator is `:83`** — the packet's number is right and my record was wrong; corrected here | **CLOSED** |
| §11 head binding | H7a recorded; convention stated for the head in progress | `8373455…` present in A7's message body, report 08/09 tables, `00` v08 §7, and the 007 row; `212855f…` in report 09 and v09 `00`; ledger still WAITING_FOR_REVIEW, no self-certification | **DISCHARGED** |
| `REF1-R6-AUTH-01` P3 | closed by `REF1-DEC-4` on the owner's direct confirmation | Judged in §4; the artifact is append-only (4,646-byte prefix, 2,503 appended, verified by `cmp`-equivalent), the owner instruction quoted verbatim, the residual disclosed in the entry, the contract and the ledger | **CLOSED** on review-06's second route (§4.3) |
| `REF1-R6-CHK-01`, `REF1-R6-EXCL-01` | remain moot by owner-directed withdrawal; review-07's conditional no longer live | `main..H9` with rev 5's exclusion still reports 31 warnings, all two-space hard breaks in the sibling's sealed reviews — the premise of the withdrawal is unchanged and still reproduces; owner confirmed `REF1-DEC-3` | **moot**, correctly labeled |

Round 8/9's own numbers are, for the first time in this line, a set I could reproduce in full without
finding a discrepancy in the payload's substance: five of the six discrepancies below are wording or
pointer defects, and one is mine.

## 4. `REF1-DEC-4`: can a candidate close an authentication finding by recording the owner's confirmation of its own transcriptions?

**4.1 What was asked.** review-06's `AUTH-01` required outcome was disjunctive: transcribe the dated
owner instruction into an immutable decision artifact under 008 and link it from the row, **or** record
the owner's own confirmation in the ledger; I called it "the only obligation in this review I cannot
verify from repository content". review-07 added that direct owner confirmation was "the only thing that
can close" it and that confirmation would make rev 6's authorization "a fact rather than an attributed
quotation". Round 7 satisfied the first branch (`decision-01.md`) and the packet itself declined to
count that as closure. Round 9 supplies the second branch: `REF1-DEC-4` records the owner's instruction
verbatim — *"I confirm REF1-DEC-1/2/3 are accurate, record that and close AUTH-01, commit and push it"*
— the confirmation is summarized in the contract revision 8 section and in the 007 ledger row, and the
entry states what it does not claim.

**4.2 The residual, which they wrote themselves.** A confirmation that reaches the record through the
session it exonerates has no more evidentiary standing than the quotations it confirms: a fabricated
`DEC-1/2/3` would be accompanied by a fabricated `DEC-4`. The entry says exactly this ("a reviewer
therefore **cannot cryptographically distinguish** an owner-authored confirmation from a transcribed
one, and nothing in this file changes that"), notes that every commit in this repository carries the
owner's git identity including the ones the implementing session authors, and names the stronger
artifacts (a GPG-signed commit, a confirmation authored outside the session) as things that were **not**
done and are **not** claimed. Report 09, the contract and the ledger row repeat the limit rather than
burying it. That disclosure is why this is a judgment and not a defect.

**4.3 My ruling.** The finding is **closed as an obligation on this packet**. 006:139-141 makes the
owner, not the reviewer, the authority who accepts a contract amendment; review-06's stated second
route is literally satisfied — the owner's confirmation is recorded in the ledger and in a decision
artifact; and there is no further action the implementer could take inside its own scope to make a
human's words more verifiable. What my acceptance certifies is therefore *the record's fidelity to what
DEC-4 says*, not the owner's words themselves: if the owner later says DEC-4 misrepresents them, the
correct action is the one rev 6 already named — restore revision 5's scoped command, reopen
`REF1-R6-EXCL-01`, and correct `REF1-DEC-3/4` as append-only history, leaving the historical verdicts
intact per 006's invalidation rule. I also verified that nothing else in the round depends on the
question: the withdrawal's three surviving facts held under my own measurement in round 7 and again
here (§3 row 8), and rev 8 changed no scope, no criterion, no proof step and no payload path — the
contract's REF table is byte-unchanged from rev 6 to rev 8 (`git diff 6535d57 H9 -- contract.md` shows
no `| REF-` line moved), so a decline would touch one finding class, not the packet.

**4.4 Reservation, recorded rather than blocked.** `REF1-DEC-4`, the contract bullet and report 09 each
say review-06 *and* review-07 named direct confirmation as "the only thing capable of closing" the
finding. review-07 did (§16 of that record). review-06 did not: its required outcome offered the
artifact route first. See `REF1-R9-QUOTE-01` in §7.

## 5. What I verified mechanically at exact H9

5.1 Reruns (tree clean, Node v22.22.3): `npm run check:builder-docs` → **57 files / 848 links / 38
imports**, exit 0 — reproducing both reports' claim and confirming that round 8's README edit neither
broke nor added a link; `npm run typecheck` → exit 0; `npm run test:kernel` → **264 pass, 0 fail**, 55
suites; `npm run test:conformance` → **1949 tests / 283 suites, 1947 pass, 0 fail, 2 cancelled**, exit
1. The 2 cancels are OP1 on Node 22, pre-existing at B, reproduced in rounds 4–7 and again here; the
packet makes no all-supported-Node claim, so I did not treat exit 1 as a defect and did not rerun the
full suite: `git diff --name-only A H9 -- packages tests examples scripts '*.json' '*.jsonc'` is empty,
which is exactly why 006 does not require a duplicate full run — and my round-7 full-gate rerun at H7a
(2322/356, 0 fail) already covers the byte-identical tree.

5.2 Scope and identity. `A..H9` = **74** changed files: 60 in `work/K1.1-reference-01/`, and the same
14 as round 7 — `002` (C1), the seven `mental-model/` payload pages (C1/C2/C3/C7/C8), the `007` ledger
(rows, last touched by H9), plus four files from three pre-payload cleanup commits (`014`, sibling
`cleanup-01/push-pending-01/push-verification-01`) which the contract names as administrative and
outside C/H's payload. `C7..C8` = contract + README + 007 section ✓; `H8..C9` = 3 declared paths ✓;
`C9..H9` = report + 3 logs + MANIFEST + row ✓. Layer 2 (`kernel.md`, `runtime.md`, `driver.md`,
`deployment.md`) byte-identical to D ✓. `006`, `008`, `012`, `AGENTS.md`, `CLAUDE.md` identical to B ✓.
`package.json`/`package-lock.json` unchanged; `canonicalize@3.0.0` remains the sole third-party
specifier ✓ (no new reuse; nothing vendored — AGENTS.md satisfied).

5.3 Sealed records and digests. All 58 `review-*.md`, `implementation-*.md` and `validation-*/`
`.md`/`.log` files in the packet are byte-identical to the commit that recorded them — 0 modified after
recording, which independently confirms report 08's "`implementation-07.md` preserved unedited" and
"reviews 01–07 preserved unedited" as stated *within the repository*, and `decision-01.md` is a strict
append (4,646-byte prefix; 2,503 appended). All 33 packet `.log` files match their MANIFEST digests;
the 13 round-7/8/9 captures are mutually distinct.

5.4 Whitespace, both classes, stderr visible. `A..H9` = **18** (13 trailing, 5 EOF-blank), all 18
inside this packet's own `.log` captures; 6 of them were introduced by round 8's `printf` column
padding in `validation-08/00-scope-and-counts.log`, disclosed by round 9, and left in place because
committed captures are not edited to look tidy — the correct call, and the one rev 5 had argued for.
`C9..H9` and `H8..C9` = **0/0/0**, `C7..C9` = 6/6/0, `A..H9` with rev 5's withdrawn exclusion = **0**,
`main..H9` with it = 31. Two consequences I checked deliberately: (a) authored markdown — contract,
decision record, all nine reports, all reviews, README, 002, 007 — is clean of **both** classes in every
range; (b) round 8's regression would **not** have been caught by the withdrawn step either, since it
sits in a `.log` the exclusion exempted, so this round neither vindicates nor undermines the
withdrawal; the gap the contract says it leaves (a markdown-aware check reading `work/**`) is exactly
what the padding illustrates, and `scripts/check-builder-docs.ts` still cannot see `work/**` or `007`.

5.5 Their evidence for my own record. `git log --oneline --all -S"8373455…"` in `00` v08 §7 reproduces
(C8-era: only A7 carried it). `git diff --check` counts in both rounds' logs reproduce exactly (§3).
The README locator `:83` reproduces (mine did not). The append-only and prefix sizes reproduce. I found
no number in round 8's or round 9's logs that my re-run contradicted — a first for this packet.

## 6. Wider sweeps than the candidate's

Status sweep, independent regex over all 31 `mental-model/` files (any `K\d`/`R\d` within 80 characters
of a perfect-verb + accepted/implemented/integrated/shipped/released/landed/merged, plus bare passive):
1 hit, `execution-cycle.md:81`, a denial — agrees with round 8's classified 18-hit sweep (`02`) that
canonical pages assert no build state; `sources.md:30` remains permitted provenance with its reason
recorded. `014-owner-progress-summary.md`: `:139` still points at `implementation-01.md`, and I measured
the staleness precisely — `014` was touched by exactly one commit in this lineage (`154a765`) and the
pointer has been stale at every head from H2 onward: **7 heads as of round 8** (the report says "eight
rounds stale"; §7.3). Layer-1 confinement re-verified section-by-section (§5.2), and the two malformed
predecessor digest rows I found in round 7 are now recorded in the report and the contract and still
unrepaired outside this payload — `K1.1/validation-06/04-test-conformance.log`'s true digest appears
**nowhere** in the predecessor tree except this packet's round-8 census log, and
`K1.1/validation-10/09b-…log` is pinned by a correct digest in `K1.1/validation-11/MANIFEST.md`.

## 7. Findings (all P3 — non-blocking under 006:125; each is a wording or pointer fix)

**7.1 `REF1-R9-LOCATE-01` — a self-found defect is attributed to a log that does not contain it.**
Report 08: the count-table guard "caught a malformed range while this log was being written — the hazard
review-07 §1 records, reproduced and defeated **in the same file**", and the Coverage bullet says the
defect is "disclosed **in `00` itself**". `validation-08/00-scope-and-counts.log` contains the guard's
*policy* (line 22: commands run with stderr captured, a bad range prints STDERR) and no account of an
event: `grep -iE 'draft|malformed|guard|caught'` on that log returns nothing, and the string `ambiguous
argument` occurs in this packet only inside report 08 (`:76` and `:126`); the sole `STDERR` mention in
`00` is that policy sentence at its line 22. Required outcome: the next round's report states
that the catch is recorded in the report, not the capture (or prints the guard's stderr in a future log).
Not P2: no number, criterion or gate depends on it, and the substance — that the guard exists and the
draft was corrected before commit — is corroborated by the log's own §1 header. My round-7 record
carried a locator error of the same shape (`:85` for the README sentence, actually `:83`), which is
why this is graded as a pointer slip and corrected here rather than held against the packet alone.

**7.2 `REF1-R9-DIGEST-02` — "nothing is unpinned" is true of 457 of 458, and the residual 2 are not
equivalent to each other.** Contract rev 7 (`contract.md:242`) writes "**Nothing is unpinned**" two sentences after
recording that 2 rows "do not pin their file"; the 007 section (`:231`) compresses it to "all 458
exempted logs are digest-pinned", which drops the exception entirely. Measured: `K1.1/validation-10/09b-…log` is pinned by a correct digest in
`K1.1/validation-11/MANIFEST.md` (a later manifest in its own packet), so it was never unpinned;
`K1.1/validation-06/04-test-conformance.log` had only the malformed 67-hex row before this round, so as
of the round-7 head **one** log was pinned by nothing that verifies. Required outcome: one clause
distinguishing the two (the census is otherwise exactly right). The overstatement originated in my
review-07 §7.1 ("zero logs are unpinned"), and that sentence is corrected here in the same terms; the
packet inherited it rather than inventing it.

**7.3 `REF1-R9-COUNT-03` — two incidental counts do not reproduce.** (a) Report 08:159: "`014:139` …
eight rounds stale" — `014` was touched by exactly one commit in this lineage, and the pointer has been
stale at 7 heads as of round 8 (H2..H8); "eight" is true only counting H9, which did not exist when the
sentence was written. (b) "reproduced by five reviewers" — report 08:155 ("including review-07"), report
09:116, and both evidence indexes (`validation-08/MANIFEST.md:28`, `validation-09/MANIFEST.md:20`) —
review-06 and review-07 are the same session, so distinct reviewers is one fewer than review records;
the count sitting in a MANIFEST should state its basis too. Required outcome: pick the basis and name it
in one parenthetical each. Both are immaterial to any criterion, which is precisely why they should be
stated as measured rather than asserted — the lesson this packet has now learned eight times.

**7.4 `REF1-R9-QUOTE-01` — `REF1-DEC-4` misstates what review-06 required.** Four places assert that
review-06 *and* review-07 named direct owner confirmation as the sole possible closure:
`decision-01.md:80` ("the only thing that can close the finding"), echoed verbatim in
`validation-09/00-scope-and-auth.log:32`, report 09:33 ("the only thing capable of closing it"), and
contract rev 8's scope bullet ("the closure condition review-06 and review-07 both named"). review-06's finding names
two routes ("…into an immutable decision artifact under 008 and link it from the row; **or** record the
owner's own confirmation in the ledger") and calls it the only obligation *unverifiable from repository
content* — not the only possible closure. The distinction matters forward, because a future round reading
DEC-4 will believe the stricter rule is the recorded rule, and because the framing quietly improves the
packet's position (round 7 had already satisfied the artifact route, yet the record now implies closure
was impossible until this round). Required outcome: restate the disjunction and say that round 9 took the
second branch. The closure itself stands; this is the attribution, not the outcome.

**7.5 `REF1-R9-EVID-05` — sealed captures that are byte-identical re-runs are not labelled as such.**
Beyond the typecheck family that `REF1-R6-EVID-01` found (5 logs, `a2051020811e29fd…`), the packet's
sealed evidence contains two further reuse families no review had recorded:
`validation-02/01-builder-docs.log` and `validation-03/01-builder-docs.log` share `77872bb1ab55f373…`,
and `validation-04/01`, `validation-05/02`, `validation-06/02` share `42d94006d6acf254…`. Identical
bytes for an unchanged measurement is not fabrication, and these files may not be edited — but 10 of 33
captures are carried forward without the note review-06's required outcome offered ("state in the
MANIFEST that a named log is intentionally a carried-forward capture"). Required outcome: a list in the
next round's evidence index naming the three digest families and which rounds are re-runs; it also
narrows nothing and repairs nothing retroactively, which is why it is P3 and not more.

## 8. Contract revisions 7 and 8 as process artifacts

Rev 7 changes no scope, criterion or proof step and rev 8 changes none either; both are verified as
text-deltas, not as claims: rev 7's hunks are the header line, the withdrawn-block fidelity paragraph and
the corrected census paragraph; rev 8's are the header line, the `decision-01` bullet and the new
revision-8 section — `git diff 3039779 a117b29 -- contract.md` = 3 hunks, the REF table and payload path
list untouched (verified against C7's rev 6 as well). Rev 7 explicitly labels itself "correcting a false
factual claim in a governing artifact … not an amendment", which is the right characterization: an
artifact may be corrected for accuracy without an owner decision, and only the *withdrawal* needed
`REF1-DEC-3`. Rev 6's `git diff --check` withdrawal continues to stand as judged in review-07 §8 and is
not re-litigated here; the ledger and the contract now state the surviving reasons (wrong measured
property, wrong operand, boundary that widens every round) rather than the false census, and
`main..H9` under rev 5's exclusion still reports 31 sibling hard breaks, so the operand problem is
reproduced rather than recalled. The residual honest gap — "no replacement gate is asserted to exist" —
is now demonstrated twice by the packet's own rounds: a padding artifact it caught by hand (round 8) and
a stale pointer in a page no script reads (`014`, round 9's §6). Both point at the same `scripts/`
packet the owner has been asked for eight times; I do not treat that packet as this one's obligation,
and I do not prescribe its contents.

## 9. Per-criterion verdicts (cumulative A→H9, bound to H9 `644dfffc7904176ee3a4f9943310cf926408a113`)

| ID | Required outcome | Verdict |
|---|---|---|
| REF-1 | distinct identity domains for creation key and Input ID; fresh-then-replay example; separate receipts | **PASS** — pages byte-identical to the state review-06/07 verified; navigation re-run clean |
| REF-2 | in-process values as one coherent immutable snapshot; no broadened containment or wire claim | **PASS** — no page changed since C3 except README's authorized sections |
| REF-3 | delivery rules unchanged; accepted H vs pending integration separated accurately | **PASS** — `main`'s kernel state recorded since round 7 and reproduced here (`main` tree = `a8ac787`; `main:packages/kernel` = superseded `f117e6b`; 9 files from H5; merge clean to this branch's tree) |
| REF-4 | one owner per definition; related pages assessed; navigation valid | **PASS** — `WORD-05` closed; builder-docs rerun 57/848/38 |
| REF-5 | only declared payload differs from A; Layer 1/2, executable tree, sealed records unchanged; C/H and review independence preserved | **PASS** — §5.2, §5.3; implementer disqualified from accepting; this review is a different session |
| 006 evidence record (commands, environment, exit codes, counts, digests; full-SHA identities) | — | **PASS** with the §7 P3 items; every logged number reproduced, no silent-clean hazard observed |
| 006 review rules (claims supported by observations; removed exclusions inspected as closely as new code) | — | **PASS** — the exclusion is gone, its successor claims are measured, and §7.1/7.4 are pointer and attribution defects |
| `REF1-R6-AUTH-01` | — | **CLOSED** (§4.3), with the authentication residual disclosed by the packet itself |
| `REF1-R6-CHK-01`, `REF1-R6-EXCL-01` | — | **moot by owner-directed withdrawal**, reopened only if the owner disowns `REF1-DEC-3/4` |
| `REF1-R7-DIGEST-01`, `QUOTE-02`, `COUNT-03`, `EVID-04`, `WORD-05` | — | **CLOSED**, verified by re-measurement (§3) |

## 10. Limits of this review and what I did not have to accept

I did not rely on the reports for any figure above, and I did not accept the candidate's
self-assessment of its own corrections: each was re-measured. What I cannot do is reach the owner's
transcript (so §4.3's ruling is bounded as stated), reproduce Node 25, or repair the predecessor
packets' 2 malformed digest rows and the `014` pointers, all outside this payload. I found no
executable, dependency, Layer-2, sealed-record or criterion change; no claim about the runtime gate that
my reruns contradicted; and no false statement in round 8/9's measurement content — the five items in §7
are the whole list, and none of them changes what the payload says about the system. Under 006's verdict
rules that supports acceptance; per the standing rule, acceptance binds to the exact head recorded here
and to no later administrative commit, and nothing in this record merges, releases, or re-certifies the
sibling packet's H5.

## 11. Exact text for transcription into 007 (owner or owner-delegated cleanup only)

> **K1.1-reference-01 rounds 8 and 9 ACCEPT** at H9 `644dfffc7904176ee3a4f9943310cf926408a113`, over
> C9 `a117b2983278f09c03027e2b3553a9a644d18986`, base A `519ba002378707a4deccff1ea0a243d21eb694b7`
> ([review-08](work/K1.1-reference-01/review-08.md)); cumulative `A..H9`, with round-8 head H8
> `212855ff849413669f26f0e2d8f0e7a701cc3d11` recorded in report 09. All five REF criteria PASS.
> Review-07's four P2 findings and its head-binding item are verified fixed by re-measurement: the
> digest census reproduces (466 exempted logs at H9; 431 manifest-pinned, 33 report-pinned, 2
> malformed predecessor rows), revision 5's block is byte-identical to C6 across its stated boundary
> (2923 = 2923), both rounds' whitespace counts reproduce by class (A..C9 18/13/5, main..C9
> 82/72/10, H8..C9 0), all eight round-8/9 logs carry the identical seven-line header, all 33 packet
> captures match their MANIFEST digests, and H7a's SHA is now in the repository. **`REF1-R6-AUTH-01`
> is CLOSED** on `REF1-DEC-4` — the owner's verbatim confirmation, recorded in the decision artifact,
> contract and ledger, with its own limit stated: a reviewer cannot cryptographically distinguish an
> owner-authored confirmation from this session's transcription of one, and if the owner disowns
> `REF1-DEC-3/4` the named remedy is to restore revision 5's scoped command and reopen
> `REF1-R6-EXCL-01`. `REF1-R6-CHK-01`/`EXCL-01` remain moot by owner-directed withdrawal. Reruns at
> H9: `check:builder-docs` 57/848/38, `typecheck` clean, `test:kernel` 264/0, `test:conformance`
> 1949/283 with 0 fail and the two Node-22 OP1 cancels; executable tree byte-identical A→H9, so no
> full-suite rerun is required. Five P3 items are recorded non-blocking in review-08 §7 (a self-found
> defect attributed to a log that does not contain it; "nothing is unpinned" overstating by the one
> predecessor log; two incidental counts; `REF1-DEC-4` misstating review-06's disjunctive closure
> condition; 10 sealed captures carried forward unlabelled). Owner-side, outside this payload and
> unchanged: the `scripts/` gap (`check:builder-docs` reads neither `007` nor `work/**`; a
> markdown-aware whitespace check), `014:139` and `014:123–124`, the two malformed predecessor digest
> rows, and `main`, which still carries the pre-correction kernel while merging this branch cleanly to
> this branch's tree. `next_release: none`. State after this record: **ACCEPTED for review; integration
> and final cleanup remain held** — acceptance binds to H9 alone and no later administrative commit
> certifies itself.

## 12. Compact handoff (008 form — locators only)

Base `519ba002378707a4deccff1ea0a243d21eb694b7`; reviewed H `644dfffc7904176ee3a4f9943310cf926408a113`;
review record `docs/development/work/K1.1-reference-01/review-08.md` (this file). Verdict ACCEPT; no
blocking finding remains. Non-blocking P3 items, by ID, with the one place each is fixed — none of them
a reason to reopen the round, and each fixable in the next round's record without touching sealed
material: `REF1-R9-LOCATE-01` (report 08:76,126 → fix in the next report's attribution), `REF1-R9-DIGEST-02`
(`contract.md:242`, `007:231`; review-07 §7.1 and §6.4 carry the same overstatement), `REF1-R9-COUNT-03`
(report 08:159, plus the four OP1 reviewer counts in reports 08/09 and both MANIFESTs),
`REF1-R9-QUOTE-01` (`decision-01.md:80` echoed at `validation-09/00:32`, report 09:33, contract rev 8's
bullet), `REF1-R9-EVID-05` (a
carried-forward list in the next round's evidence index). Durable owner items: OP6 plus a
markdown-aware whitespace check; `014:123–124,139`; `K1.1/validation-06|10` digest rows; `main`'s
kernel state; and this review's transcription, which must name H9 as the bound head.

ACCEPT