# Independent cumulative review 07 — K1.1-reference-01 (contract revision 6)

Base `519ba002378707a4deccff1ea0a243d21eb694b7`; reviewed H `8373455ce3819f72d6a8849f9b8a6caf688d6dda`
(H7a, the head the remote advertises); review record `review-07.md`, this file. Findings
`REF1-R7-DIGEST-01`, `REF1-R7-QUOTE-02`, `REF1-R7-COUNT-03` (P2, must fix), `REF1-R7-EVID-04`
(P2, must fix), `REF1-R7-WORD-05` (P3, optional). No P0 or P1. All five REF criteria pass; the
round does not, because four claims in the round's own authoritative records are not what the
measurements say.

## 1. Session, model, date, environment, access and access limits

- Reviewer: an Arena.ai Agent Mode session on branch `arena/01a0a84c-arrokothi`. Arena discloses no
  underlying model name, so none is invented here (008 forbids fabricating the reviewer identity
  field); the mode and tooling are the honest content of the field. Not the implementer's session;
  this session wrote review-06 and nothing in C1–C7.
- Date of this review: 2026-09-16; the last timestamp I measured is the `ls-remote` below,
  05:22:23Z. I do not claim a window I did not stamp.
- Repository access: full clone history (the sandbox reverted to depth 1 between rounds; re-run of
  `git fetch --unshallow origin` restored 627 commits and deleted `.git/shallow`). `gh` works;
  `gh pr list --state all --head codex/k1.1-correction-01-review-findings` returns nothing: there is
  no pull request, so nothing was reviewed through GitHub's truncated diff.
- `git ls-remote origin` at 2026-09-16T05:22:23Z advertised
  `8373455ce3819f72d6a8849f9b8a6caf688d6dda` for the candidate branch and
  `07f7502c4a7d75aa37ab7694c5e62522e0e8c9ec` for `main`. The head I reviewed is the advertised head.
- Execution access: a `git worktree` at exactly H7a, `git status --porcelain` = 0 lines,
  `npm ci`-equivalent install (`npm install` then `git checkout -- package-lock.json`) with
  `node_modules/` ignored; `node v22.22.3`, npm 11, TypeScript from the pinned lockfile. Commands in
  §6 were **rerun by me on that tree**, not read out of the packet's logs.
- Access limits that bind this review: the owner's delegated-cleanup session transcript is not in
  the repository, so `REF1-DEC-1/2/3` quotations cannot be authenticated by any reviewer with any
  tooling; `docs/development/work/K1.1-correction-01/**` is a sibling packet's sealed record and
  cannot be changed by this one; I have no Node 18 or 25 here, so the environment the implementer's
  logs carry (v25.2.1) is inspected, not reproduced; and nothing I record says what the remote will
  advertise when the owner reads this — the owner must re-run `ls-remote` and match the SHA, as
  round 6 required and as the round-7 report now says in the same words.
- Hazard recorded so the next reviewer does not repeat it: with a shallow clone,
  `git diff --check <missing-sha> <sha>` prints nothing and **exits 0** while stderr carries
  `fatal: bad object`. A whitespace gate can therefore report a silent clean. Every range command in
  §6 was run with stderr visible; the candidate's own logs do not show stderr for these commands.

## 2. Candidate identity, packet label, and what this round actually is

| Label | SHA | Note |
|---|---|---|
| A — supplement base (K1.1-correction-01 acceptance) | `519ba002378707a4deccff1ea0a243d21eb694b7` | verified ancestor of H7a |
| B — governing policy baseline | `777b9955fb3a443f700b4f3d1f4f2aef1869345b` | 006/007/008/012 as read |
| D — owner documentation freeze | `0ee13f8138af52107d86967043bcc460faba8893` | Layer-2 reference |
| Sibling H5 — implementation ACCEPTED, untouched | `52b1600f3b42e3a360fdc3395178f1d147edf304` | not re-certified here |
| H6-ref — reviewed by review-06 | `bbcbf300acb583b87dbf6b4bd323700bccd9e90f` | |
| A6 — review-06 transcribed into the branch | `f696b21a7a534f8831926e9e7f54403e7c04218a` | |
| C7 — round-7 payload | `6535d5739c33a3973d0cce3a2473777a4ce14c2b` | |
| H7 — round-7 report + evidence | `6d0b983b046647b86ace523e88c691d2c97d088c` | **not the head** |
| **H7a — candidate head reviewed here** | `8373455ce3819f72d6a8849f9b8a6caf688d6dda` | report correction + 007 row |

Cumulative range `A..H7a` is linear over `A..C7` plus two report commits; `C7..H7a` touches exactly
8 paths (`implementation-07.md`, `validation-07/` 5 logs + MANIFEST, `007-work-packets.md`) and H7a
touches only `implementation-07.md` and `007-work-packets.md`, the two the packet declares for report
and ledger. The request label "K1.1-correction-02" is again not a packet that exists; the round is
K1.1-reference-01 round 7. The report notes this and asks the owner to check what was sent — correct,
and a reviewer aiming at the wrong packet would review the wrong tree.

## 3. Governing baseline, and the process-change check this task requires

006, 007, 008, 012, `AGENTS.md` and `CLAUDE.md` are byte-identical at H7a to B, so the round-6
readings still govern: `006:115` inspect removed assertions and *exclusions* as closely as new code;
`006:142` "Never weaken a gate solely because an implementation failed it"; `006:139-141` a planning
defect solvable without changing semantics gets CHANGES REQUIRED plus a contract amendment proposed
for owner approval before implementation; `006:193` record base, previous review head and candidate
head **as full SHAs**; `006:212-213` the transcription commit names H and `H..A` must contain only
the verdict transcription; `006:241` documentation-only work "uses relevant links/anchors and diff
checks"; severity `006:124` P2 = "other contract defect, missing meaningful test/documentation or
unsupported claim; must fix", P3 = "optional improvement; does not block if every required criterion
passes". 012:22 requires this reviewer's own coverage map derived from canonical sources first.

Contract revision 6 and `decision-01.md` are candidate **artifacts**: they cannot authorize the
removal they propose, and the packet's self-assessment ("CONFIRMED, WORSE") of my round-6 findings
cannot close them. What a candidate can do is state facts a reviewer can falsify. I read the contract,
the decision record, 007, 008 and 012 before the report, then tested the report's claims against
measurements, as below.

## 4. Independent coverage map, derived before reconciling with the report

1. Revision 6's own text: is the withdrawal complete, is rev 5's text preserved as claimed, is every
   factual clause inside it measured-true, and is the residue (what still gets checked) stated.
2. 006's gate-change test applied to the withdrawal, not to the report's framing of it.
3. Authority: `decision-01.md` artifact form, its authentication limit, and whether "narrowed, not
   closed" is the true posture for `REF1-R6-AUTH-01`.
4. Every round-6 finding's remedy, re-measured at H7a rather than accepted as done.
5. The whitespace state of the tree, repo-wide and in scope, with **both** warning classes, because
   the withdrawal's whole premise is a `git diff --check` census.
6. The digest-pinning claim about `.log` files, repo-wide, including whether a digest exists at all.
7. Evidence hygiene: per-log header content, command-before-result, digest uniqueness, digest truth.
8. Payload confinement: README section-by-section vs D; other six pages vs D; Layer 2; executable
   tree; sealed records; `package.json`/lockfile.
9. Canonical-page status sweep, wider than the packet's, over all 31 `mental-model/` files.
10. Runtime gate, rerun rather than cited.
11. Ledger and report claim audit: every number, every universal, every identity.
12. Third-party and license; branch/main relationship; head binding and transcription readiness.

## 5. Surrounding source and non-delta inspection

Read in full at H7a: `contract.md` (239 lines, rev 6 header, rev-5 block marked WITHDRAWN, scope
list, REF table, proof paragraph "…`git diff --check` is not a proof step for this packet…"),
`decision-01.md` (all three entries verbatim), `implementation-07.md` (220 lines),
`validation-07/` 5 logs + MANIFEST, the `### K1.1-reference-01` section and ledger row of 007,
`mental-model/README.md:75-95`, `002` headings, `014:123-124,138-140`. Surrounding, not delta:
`K1.1-correction-01/review-01..04.md` (the sealed files whose 31 warnings the withdrawal turns on);
`K0.2/implementation-12..16.md` (where 33 logs are actually digested);
`K1.1/validation-06|10/MANIFEST.md` (two malformed digests, §6.4); `scripts/check-builder-docs.ts`
(still reads `mental-model/**` + guides only, so it cannot see `work/**` — OP6 unchanged);
`tests/conformance/effects/fast-slow-equivalence.test.ts` (the two Node-22 cancelled cases).

## 6. Mechanical verification performed by me

6.1 Reruns at exact H7a, tree clean, Node v22.22.3:
- `npm run check:builder-docs` → `57 Markdown files, 848 local links/anchors, 38 public package
  imports`, exit 0 — matches the report's `57/848/38` and is +1 link over round 6's 847, exactly the
  new `README → 002` link. Anchor validity therefore independently confirmed, including
  `#target-not-shipped`.
- `npm run typecheck` → exit 0, no output.
- `npm run test:kernel` → 264 pass / 55 suites / 0 fail.
- `npm run test:conformance` → 1949 tests / 283 suites, 1947 pass, 0 fail, **2 cancelled**, exit 1.
- `npm test` (full gate, which the report cites from H4-ref rather than rerun) → **2322 tests / 356
  suites, 2320 pass, 0 fail, 2 cancelled, exit 1**. My rerun reproduces the cited 2322/356 exactly.
  The exit 1 is OP1, the two legacy Effect tests that cancel on Node 22, pre-existing at B and
  reproduced by four reviewers; the report makes no all-supported-Node green claim, and correctly
  says its own machine (Node 18/25) has never reproduced it. No behavioral drift A→H7a.

6.2 `git diff --check`, warning lines only (git echoes the offending line after each warning; content
lines quoted inside `.log` files carry the same words, so a `grep "trailing whitespace"` tally is not
a count of warnings — see `REF1-R7-COUNT-03`):

| Range | Filter | total | trailing | blank-line-at-EOF |
|---|---|---|---|---|
| `A..C6` | none | 9 | 5 | 4 |
| `A..C7` | none | **12** | 7 | 5 |
| `A..H7a` | none | **12** | 7 | 5 |
| `C7..H7a` | none | **0** | 0 | 0 |
| `A..C7` | rev-5 exclusion (`*/validation-*/*.log`) | 0 | 0 | 0 |
| `A..C7` | rev-6 exclusion (`K1.1-reference-01/**`) | 0 | 0 | 0 |
| `main..C7` | none | **76** | 66 | 10 |
| `main..C7` | rev-5 exclusion | 31 | 31 | 0 |
| `main..C7` | rev-6 exclusion | 64 | 59 | 5 |

All 12 warnings in the `A..C7` range sit inside this packet's own `validation-*/*.log` files, and
none of them is in authored markdown: 5 trailing-space lines are quoted captures of earlier tool
output (`validation-03/00:24`, `validation-04/00:27-30`); 2 trailing-space lines are content the
packet authored (`validation-06/00:15`, the negative control's deliberately inserted space, and `:53`,
a `printf '%-52s '` column pad — rev 6's own admission, both verified present); and 5 are
`new blank line at EOF` at line 4 of the captured `tsc` output (`validation-02/02`, `03/02`, `04/02`,
`05/01`, `06/01`). The
packet's authored markdown (contract, decision record, seven mental-model pages, 002, 007, reports)
is clean of both classes in every range, and round 7's own content is clean with **no** exclusion at
all. So the withdrawal hides no dirty payload, and rev 5's "every one of the nine warnings is inside a
`.log` file" was true at its round (9 = 5 + 4).

6.3 Exclusion breadth, measured: `docs/development/work/*/validation-*/*.log` covers **453** files at
C6/C7 (433 at A, **458 at H7a** — the withdrawn exclusion silently grew by this packet's own five new
logs, which is the "carve-out that must grow each round" objection in its purest form and was available
to rev 6 without the false claim it used).

6.4 Digest-pinning census at H7a over those 458 logs: 423 have a manifest row whose sha256 equals the
file; 33 (all in `K0.2/validation-12|13`) have no `MANIFEST.md` in their directory but are
digest-pinned in the round report `K0.2/implementation-12..16.md` — I matched **all 33** to the real
file bytes; 2 rows are malformed and therefore do not pin their file (
`K1.1/validation-06/04-test-conformance.log`, manifest digest is 67 hex characters;
`K1.1/validation-10/09b-distinguishing-ablations.log`, manifest digest is a 51-hex prefix of the true
value). **Nothing is unpinned.** Within this packet, all 25 round-1..7 raw logs match their MANIFEST
digests, and round 7's five are mutually distinct and differ from the reused
`a2051020811e29fd…` of v02–v06. The two malformed predecessor rows are outside this payload and are
listed in §16 as owner work, not as a finding against H7a.

6.5 Scope and identity: `git diff --name-only A H7a` = 61 files; 47 in `work/K1.1-reference-01/`, and
the 14 outside are `002` (C1), the seven mental-model pages (C1/C2/C3/C7: identity, creation, sources;
values, execution-cycle, reference; roadmap; README), `007` (ledger rows, last touched by H7a), and
four files from three pre-payload cleanup commits (`014-owner-progress-summary.md`,
`K1.1-correction-01/cleanup-01.md`, `push-pending-01.md`, `push-verification-01.md`) which rev 6's
scope list names as "subsequent administrative work, outside C/H's payload" — disclosed, so
REF-5's "only declared payload differs" is true of the packet's commits; the range additionally
carries those four. `git diff --name-only A H7a -- packages tests examples scripts '*.json'` empty;
`D..H7a` for `mental-model/kernel.md`, `runtime.md`, `driver.md`, `deployment.md` empty; reviews
01–06 byte-identical to their recording commits; 006/008/009/012/AGENTS/CLAUDE unchanged.
`f696b21`'s and H7a's copy of review-06 is blob `47574be79ae90ace781b4ab4df19f43efb90efdf` against
my delivered `8457cf5b09e41f88ef46bf7dc072aef12889b07e`: one byte, the final newline (see WORD note in
§7.5).

## 7. Findings

### 7.1 `REF1-R7-DIGEST-01` — P2 — contract revision 6's load-bearing census is false

Rev 6: "The exclusion was also broader than revision 5 claimed.
`':(exclude)docs/development/work/*/validation-*/*.log'` exempts **453 files repo-wide**, **most of
them pinned by no MANIFEST digest**, and at least one … opens with hand-authored narrative prose
rather than command stdout." Measured in §6.3–6.4: the count 453 is right at C7, and the pinning claim
is inverted — 453 of 453 are digest-pinned, 423 verified matching at H7a and all 33 exceptions
verified matching in their round report; zero logs are unpinned. The clause is load-bearing: it is the
only stated reason to read breadth as *risk* rather than as the exclusion's virtue (an exempted file is
still byte-verifiable, which is exactly why 006 allows captures not to be edited). It also happens to
sit in the one document every future round of this packet must read as its gate.
*Counterexample:* `python3` census in §6.4; per-file check
`sha256sum $(git show H7a:<log>) ` against `git show H7a:<dir>/MANIFEST.md` (and
`K0.2/implementation-12..16.md` for the 33). The companion clause in the same paragraph — that "at
least one" exempted log "opens with hand-authored narrative prose rather than command stdout" — is
true but does not discriminate: at C7, 124 of the 453 exempted logs open with a comment or prose
header line (68 starting with `#`) and 126 carry a commit SHA or Node version within their first six
lines, because 006's environment rule and this packet's own round-6 remediation require an authored
header on every capture. So both quantitative pillars of that paragraph point the other way, and the
weakest material actually available to rev 6 — the 33 logs with no directory manifest — is the one it
did not cite, and even those are pinned in their round reports.
*Required outcome:* the contract states a census the repository reproduces — breadth in files, how
many of those are digest-verifiable, and which are not — and if the concern is that a digest pins
bytes without certifying hygiene, it says that instead, since that is the true and narrower objection.
The withdrawal may stand with the corrected number; nothing in this finding asks for rev 5 back.

### 7.2 `REF1-R7-QUOTE-02` — P2 — "Its text follows unedited" is false about revision 5's preserved block

Rev 6 introduces the withdrawn text with: "Its text follows unedited so that revision 6's objection can
be read against what it objects to." Diffing the rev-5 block at C6 against the one at H7a: identical
until the last paragraph, which the H7a block drops — `` `next_release: none`. Implementation
acceptance remains intact; integration waits for this separate documentation review and a completed
cleanup handoff.`` — and that sentence now closes **revision 6** instead (3079 → 2924 characters). No
words were lost, but the fidelity claim that the record offers as the reason a reviewer may trust the
preserved text is not accurate, and the move has a consequence: a state claim belonging to revision 5
is now printed as the governing revision's own closer, so provenance of `next_release: none` and of
the "cleanup handoff" precondition is displaced. *Required outcome:* restore the sentence inside the
withdrawn block (or record the single editorial change and why); the packet's own standard is that
sealed text is quoted byte-for-byte or marked as edited.

### 7.3 `REF1-R7-COUNT-03` — P2 — the report presents one class of warnings as the total, and contradicts itself

The report's measurement table reads `A..C7 — the packet's own | 7`, `main..C7 — integration | 66`
under a column headed "Unscoped", and the §7 prose repeats them. Measured (§6.2): the unscoped totals
are **12** and **76**; 7 and 66 are the trailing-whitespace class alone, which is what the commands in
`00` §1a/§1b actually ran (`| grep -c "trailing whitespace"` — so the raw log is honest and the
report's label is what fails). This is not cosmetic here, because (a) the same report two sections
earlier credits review-06 with "unscoped at H6 is **12**", a *total*, for a range whose files are a
subset of A..C7's — the record contradicts itself; (b) the 5 dropped warnings are blank-line-at-EOF
lines in this packet's own `.log` files, i.e. precisely the material the withdrawn exclusion covered,
so the disclosure of "what the exclusion hid" is itself incomplete; (c) rev 5 and rev 6 argue from
"nine warnings" (a total), so the round-7 table quietly changes the unit mid-argument. *Required
outcome:* every count in the report states which warning classes it includes and the totals
(12, 76, and 31/64 for the two exclusions at integration) are recorded beside them.

### 7.4 `REF1-R7-EVID-04` — P2 — the closure of `REF1-R6-EVID-01` rests on a universal that is false

Report: "Every round-7 log carries its commit SHA, UTC run timestamp and Node/npm versions in its
header, and prints the command before each result." 007 repeats it: "every round-7 log carries its
commit, UTC timestamp and toolchain and shows each command". Measured, of the five round-7 logs:
`02`, `03` — commit, timestamp, Node and npm; `01` — Node, no npm; `00` and `04` — commit and
timestamp, no toolchain line at all. The command-before-result half holds in all five. The claim is the
evidence that the prior finding was actually remediated rather than answered, and it is asserted in
the cross-packet ledger. *Required outcome:* qualify or complete — a version line in `00` and `04`
(cheap, they are git-only logs, so a note that no toolchain applies is equally honest) or a sentence
that says which headers carry what; the 007 clause follows whichever way is taken.

### 7.5 `REF1-R7-WORD-05` — P3 — one clause of the fixed README still mis-routes an "implemented" note

`README.md:81` and `:89` now name the same two owners (ledger for accepted/integrated, `002` for the
API surface that exists) and I verified `002`'s contents support that role (its 16 sections are the
implemented surface, through "Application SDK above core"). The section's last sentence, `:85`, still
says: if you would add "accepted", "**implemented**" or a commit identity to a `concepts/` or
`mechanisms/` page, "the ledger is the place for it" — routing a build-status word to the document the
preceding sentence says does not own it. Same family as `REF1-R6-WORD-02`, one clause, inside an
authorized section, and non-blocking under `006:125`. Separately recorded, not a finding because it is
disclosed in the report: the transcribed review-06 differs from the delivered blob by the missing
final newline, while rev 6's scope list commits "Historical reports, reviews, decisions and evidence
remain byte-identical"; restoring one byte makes the copy verbatim.

## 8. Revision 6 judged as asked: is the withdrawal a forbidden gate weakening?

Three questions, and I answered each from measurement before reading the report's argument.

**Was the route available at all?** Yes, and it is the route 006 prescribes for a planning defect:
amend the contract, get owner approval, implement, then have a fresh review check it. Rev 6 was
implemented as a contract revision plus a decision artifact, its payload carries no executable or
sealed-record change, and it is submitted for exactly this review. The candidate did not "decide" its
own relief: `decision-01.md` records `REF1-DEC-3` superseding `REF1-DEC-2`, and rev 6 says in the
packet's own words that a reviewer should test the argument, not accept it.

**Does it weaken a gate that 006 requires?** No. 006:241 requires documentation-only work to use
"relevant links/anchors and diff checks"; what rev 6 removed is the packet's own rev-4 addition, a
`git diff --check` proof step that rev 5 had bound into REF-5. The 006 floor is intact and I verified
each part of it independently: link/anchor integrity (builder-docs 57/848/38, exit 0, rerun), scope
diffs against A and against D (61 files, all declared or disclosed as administrative), executable-tree
diff (empty), sealed-record comparison (unchanged), clean-C tree state (report + logs, digests match).
`git diff --check` appears nowhere in 006, 008 or 012 as a repository-wide requirement.

**Then is it "solely because an implementation failed it"?** Not solely, and the part of the argument
that carries weight is true. I re-measured rev 6's three load-bearing facts as the report asked: 31 of
31 surviving integration warnings are exactly two trailing spaces, 0 exceptions, in four files that
belong to the sibling packet and that this packet may not edit — verified independently here and in
round 6; they are markdown hard line breaks whose deletion would change what a sealed review renders;
and rev 5's in-packet pass depended on an exclusion that hid two *authored* whitespace lines inside an
excluded `.log` — verified at `validation-06/00:15` and `:53`. Together those establish that the step
as specified (range `A..H` over a tree containing other packets' sealed files) is unsatisfiable in
range, and that the exclusion needed to make it satisfiable has no stable boundary: it grew from 433
files at A to 453 at C7 to 458 at H7a, five of them added by the round that argued about it. A gate
that can only be made to pass by a carve-out which must widen every round, and which fails for reasons
outside the payload, is measuring the wrong property of this content type. That is a substantive fault
in the gate, which is what 006 asks the reviewer to decide.

What I do not accept is the packaging around it, and the record must say so: (i) one of the three
supporting claims about the exclusion's *risk* is false (§7.1), so the case as written is stronger than
the repository supports and the true, narrower reason — a digest pins bytes but certifies no hygiene —
is not stated; (ii) the alternative the report itself names as "available and not taken", exempting the
sibling's four sealed files by *identity*, was the smaller change and is not recorded as rejected on
any ground, only as declined; (iii) the owner-facing ask, quoted verbatim in `REF1-DEC-3`, proposed the
change as one that "deletes the entire finding class rather than redrawing its boundary". Disclosed
candor is the right instinct and it is why this is not P1, but a decision whose stated benefit is the
disappearance of findings is precisely the shape 006:142 warns about, and the contract should carry
the reason that survives review (wrong property, wrong operand, boundary cannot stabilize) rather than
the one that sells the outcome; (iv) the whole route rests on an owner approval that nothing in this
repository can authenticate (`REF1-R6-AUTH-01`, still open). Consequently: I do **not** reject the
withdrawal, and I do **not** order rev 5 restored — but `REF1-R6-CHK-01` and `REF1-R6-EXCL-01` are
recorded in this review as **moot by owner-directed withdrawal, not as closed findings**, which is how
rev 6 labels them ("resolved by withdrawal rather than by compliance"), and they reopen unchanged if
the owner declines `REF1-DEC-3`. No finding is issued for the removal itself.

## 9. Reconciliation with the report, and every prior finding re-verified

| Prior finding | Packet's round-7 claim | My measurement at H7a | Status |
|---|---|---|---|
| `REF1-R6-CHK-01` P2 (check recorded at C, never at H, as rev 5 required) | confirmed; resolved by withdrawal | rev 5's requirement removed; the check still run and recorded, scoped result 0 at C7 and H7a and A..C7 | moot by withdrawal, reopenable |
| `REF1-R6-EXCL-01` P2 (exclusion drawn by path shape, not by the justifying property) | "CONFIRMED, WORSE": 453 files, "most pinned by no digest" | 453 ✓ at C7 (458 at H7a); shape objection ✓; **the pinning clause false** | moot by withdrawal; corrected by `DIGEST-01` |
| `REF1-R6-WORD-02` P3 (README :81 vs :89 contradiction; present-tense build claim) | fixed in the two authorized sections | :81/:89 name the same two owners; `grep -cE "are implemented under|whose structure is integrated"` = 0; confinement verified section-by-section against D (6 unchanged, 2 changed, heading list and order identical, `#target-not-shipped` present, anchor resolves in the rerun) | closed; residual → `WORD-05` |
| `REF1-R6-EVID-01` P3 (five identical typecheck captures; results without commands) | closed at round 7 | 5 mutually distinct digests, all matching their files; every result preceded by its command; historical v02–v06 logs correctly left sealed | closed for the live round; new defect in the closure claim → `EVID-04` |
| `REF1-R6-AUTH-01` P3 (owner scope decisions exist only as this session's quotations) | narrowed, not closed; new `decision-01.md` in the sibling's artifact form, limit stated in ¶2 | file exists, append-only, three entries, ¶2 states the authentication limit verbatim; nothing in the repo authenticates DEC-1/2/3 | **open, narrowed** — owner confirmation is the only closure |
| report's own self-found defects — three declared in §Coverage, plus one correction listed separately (`sources.md:30`) and one appended post-H7 (the push-state claim, which it numbers the seventh appearance of the family) | two ranges once conflated; a 97-line grep that would have been reported as a count; `grep … \|\| echo "(none)"` rendering an error as a pass; a permitted SHA recorded with its reason instead of hidden by a narrower grep; a current-state sentence carried forward unmeasured | all disclosed with the corrected measurement visible in the logs; the push-state correction is present in the report and in 007, appended rather than edited, C7 byte-untouched | disclosed; but the *same* class recurs as `COUNT-03`/`EVID-04`, and the head still moves unrecorded → `HEAD` item in §11 |

Note on the "Two errors in the review" paragraph: review-06 §14's "all 21 match" against its own §6
"20" is real and my record's §6.4 count of 20 raw logs is the correct one; the label complaint about
"K1.1-correction-02" is also correct. Both accepted as reconciliation.

## 10. Sweep wider than the candidate's, as the report asked

Independent regex over all 31 files under `mental-model/` (any `K\d`/`R\d` within 80 characters of a
perfect-verb + accepted/implemented/integrated/shipped/released/landed/merged, plus the bare passive):
**1** hit, `mechanisms/execution-cycle.md:81` — "The example uses K2 target actions to connect the
protocol; **it is not** a shipped API", a denial, correct. Their classified sweep reports 18
gate-adjacent phrases and classifies 15 as the standard disclaimer, 2 as permitted provenance
(`values.md:3`, `evidence.md:3`) and 1 as a released-SDK statement on `deployment.md:21` (byte-identical
to D, flagged not changed). Our two methods agree on the conclusion: no canonical page asserts that a
gate has been built, accepted or integrated. `sources.md:30` carries a commit SHA and it is permitted
provenance on a navigation page, recorded with its reason — that is the fix for the earlier narrower
grep. Outside the payload, still stale after seven rounds: `014:139` points at `implementation-01.md`
as this packet's report, and `014:123-124` describes the supplement as awaiting review — verified at
H7a, correctly carried as an owner observation, and the file was edited in this very lineage by cleanup
commit `154a765`, so the two-line fix is available to the owner at any time. `002` needs no change:
its characterization in README:81 matches its actual 16 sections.

## 11. Head binding, ledger state, and what the records can be used for

006:193 requires base, previous review head and candidate head as full SHAs. The report's identity
table gives every identity except the head it is standing in: `| H7 | this commit |`. The "this
commit" convention is the packet's own established form (round 6 wrote `| H6 | this commit |`) and is
not the defect. The defect is that the head then moved to H7a — an append that edits the report and
the ledger row — and H7a's SHA `8373455ce3819f72d6a8849f9b8a6caf688d6dda` appears **zero** times in
`contract.md`, `decision-01.md`, `implementation-07.md`, `validation-07/` and `007-work-packets.md`.
007 still says "[Report] and [evidence] in candidate H7", and the round-7 narrative sentence inside
that same row ("found after H7 and carried in the candidate head") shows the author knew the head had
moved while the row's identity stayed behind. Consequences, concretely: an owner transcribing a verdict
must "name H" and verify `H..A` contains only the transcription (006:212-213) — with no recorded head
that check cannot be performed as written; and any statement bound to H7 would exclude the correction
that H7a carries, i.e. would certify a record containing the false push-state sentence. This review is
therefore bound to **H7a `8373455…`** and to nothing else; H7 alone is not a reviewable head any more,
and no later administrative commit can certify itself. *Required outcome:* the report's identity table
and the 007 row name the head as a full SHA (and say whether it is H7a or a fresh H8); this is the
same one-line class of fix as `REF1-R6-AUTH-01`'s relatives and it is the seventh time this packet has
described its own state one commit stale.

## 12. Third-party / license review (AGENTS.md)

No new dependency, no vendoring, no license surface: `package.json` and `package-lock.json` byte-identical
A→H7a; the dependency-free rule for the kernel is untouched; `canonicalize@3.0.0` remains the sole
approved third-party specifier and its manifest entries are byte-unchanged; no rename and no new
public API. Nothing in round 7 changes any of this.

## 13. Per-criterion verdicts (cumulative A→H7a, bound to H7a)

| ID | Required outcome (rev 6 wording) | Verdict |
|---|---|---|
| REF-1 | distinct creation-key/Input-ID identity domains; fresh-then-replay example; separate receipts | **PASS** — pages byte-identical to the C2/C3 state review-06 verified; anchors resolve in my rerun |
| REF-2 | in-process values describe one coherent snapshot; no broadened containment or wire claim | **PASS** — `values.md`/`creation.md` unchanged since C2; sweep in §10 clean |
| REF-3 | delivery rules unchanged; accepted H and pending integration separated accurately | **PASS**, and strengthened: `04` + report now record that `main` carries `f117e6b`'s kernel and 9 files differ from accepted H5 — independently reproduced here |
| REF-4 | one owner per definition; related pages assessed; navigation valid | **PASS** with the `WORD-05` P3 residual; navigation verified by rerun, not by claim |
| REF-5 | only declared documentation payload differs; Layer 1/2, executable tree, sealed records unchanged; C/H and review independence preserved | **PASS** on every measured element (§6.5); independence preserved — the implementer is disqualified from accepting and this review is a different session |
| 006 §Record/evidence: exact commands, environment, exit codes, counts, digests; full SHAs for base/previous head/candidate head | — | **FAIL** — `EVID-04`, `COUNT-03`, `HEAD` item in §11 |
| 006 §Review rules: a report's assertion of success must be supported by the observations | — | **FAIL** — `DIGEST-01`, `QUOTE-02` |
| 006:142 gate-weakening prohibition, tested on rev 6 | — | **not violated**, on the reasoning in §8; the removal is acceptable as an owner-scoped narrowing of the packet's own addition provided the record states it truthfully and the owner confirms `REF1-DEC-3` |
| `REF1-R6-AUTH-01` | — | **still open (narrowed)** — external confirmation, owner-side, not a payload defect |

## 14. Coverage gaps and limits of this review

I cannot authenticate the three owner quotations or the owner's message ordering (nothing in the repo
can); I ran the suites on Node 22, so the implementer's Node 25 environment is inspected as recorded
rather than reproduced, and the OP1 asymmetry is stated, not resolved; I did not re-derive the
sibling packet's acceptance; the two malformed predecessor digest rows (§6.4) and the stale `014`
pointers are outside this payload and are reported to the owner rather than to this packet; the
`.log` census is a *repo-tree* measurement at two revisions, so a future round adding logs changes the
breadth figure again; and I read no GitHub PR because none exists.

## 15. Strongest additional counterexamples I looked for and did not find

That rev 5's preserved text was silently rewritten in substance (it was relocated one paragraph, §7.2,
not altered); that the withdrawal was chosen to conceal a whitespace defect in the payload (round 7's
own files are clean with no exclusion, and both classes are 0 in scope); that the 31 integration
warnings were not two-space hard breaks (31/31 measured, twice); that the exclusion hid logs no one
could verify (all 453 are digest-pinned — the opposite of the claim, §7.1); that the runtime gate had
drifted (2322/356 reproduced exactly, 0 fail); that 002 mis-describes itself as the API-surface owner
(16 sections of actual surface); that the anchor rule was quietly widened to a Layer-1 rewrite (6
sections byte-unchanged, 2 changed, headings and order identical, Layer-2 identical); that sealed
records were edited to satisfy the linter (reviews 01–06 byte-identical; the packet's own `:15`/`:53`
admission was disclosed instead of "fixed"); that a PR existed with a truncated diff (none).

## 16. What would make this candidate acceptable next round

Cumulative review A→H remains required, and a fresh H must be pushed for it. Required:

1. `REF1-R7-DIGEST-01`: replace the false pinning clause in contract rev 6 (or supersede it with a
   revision that states the measured census: 453 files at C7, 458 at H7a, all digest-pinned, 423
   verified matching, 2 malformed rows in predecessor packets, and the honest objection that a digest
   pins bytes but not hygiene).
2. `REF1-R7-QUOTE-02`: restore revision 5's closing paragraph inside the withdrawn block, or record
   the one editorial change and its reason, so "text follows unedited" is true.
3. `REF1-R7-COUNT-03`: state the warning classes with every count and give the totals (12, 76);
   record 31 vs 64 for the two exclusions at the integration range so the comparison is like-for-like.
4. `REF1-R7-EVID-04`: make "every round-7 log carries …" true by completing the headers or by stating
   what each log carries; the 007 sentence follows.
5. §11 head binding: record the candidate head as a full SHA in the report and in 007, and say which
   commit a verdict binds to.
Optional (P3): `WORD-05` one clause in `README.md:85`, and the transcribed review's final newline.
Owner-side, outside the packet: confirm or correct `REF1-DEC-1/2/3` (the only thing that can close
`AUTH-01` and that makes rev 6's authorization a fact rather than an attributed quotation); consider
the durable fix the packet keeps naming — `check:builder-docs` extended to `007`/`work/**` plus a
markdown-aware whitespace check that knows a hard line break is syntax (a `scripts/` packet, outside
this one's authorization, and explicitly *not* prescribed as this round's fix); `014:123-124,139`;
the two malformed `K1.1/validation-06|10` digest rows; and `main`, which carries kernel code no review
accepted and merges this branch cleanly to the branch's own tree.

## 17. Exact text for transcription into 007 (owner or owner-delegated cleanup only)

> **K1.1-reference-01 round 7 CHANGES REQUIRED** at H7a `8373455ce3819f72d6a8849f9b8a6caf688d6dda`
> over C7 `6535d5739c33a3973d0cce3a2473777a4ce14c2b`, base A `519ba002378707a4deccff1ea0a243d21eb694b7`
> ([review-07](work/K1.1-reference-01/review-07.md)). Payload content passes all five criteria:
> README confined to the two authorized sections (6 sections byte-unchanged vs D, 2 changed, headings
> and order identical), Layer 2 and every executable byte unchanged A→H7a, sealed records untouched,
> `typecheck` clean and `check:builder-docs` 57/848/38 rerun by the reviewer, full gate 2322/356
> reproduced with 0 fail. The withdrawal of `git diff --check` is **accepted as a change** — the
> 31/31 two-space hard breaks in sealed sibling files, the two authored lines rev 5's exclusion hid,
> and an exclusion that grew 433→453→458 files are all independently verified — so
> `REF1-R6-CHK-01`/`REF1-R6-EXCL-01` stand moot by owner-directed withdrawal, not closed. Four record
> defects block: contract rev 6's claim that most exempted logs carry no MANIFEST digest is false
> (453 of 453 are digest-pinned); the withdrawn revision 5 is not preserved "unedited" (its closing
> `next_release` paragraph moved into revision 6); the report's "unscoped 7 / 66" are one warning class
> of true totals 12 / 76 and contradict its own "12 at H6"; and the "every round-7 log carries …
> toolchain" closure claim for `REF1-R6-EVID-01` is false for 3 of 5 logs. The candidate head H7a is
> named nowhere in the packet's records or in this row — 006's full-SHA head record is unmet, and a
> verdict bound to H7 would certify the pre-correction text. `REF1-R6-AUTH-01` stays open pending
> direct owner confirmation of `REF1-DEC-1/2/3`. `next_release: none`; implementation H5 acceptance and
> the integration hold unchanged; main carries the pre-correction kernel (`f117e6b`), a merge is clean
> and yields this branch's tree exactly — an owner decision, not this packet's state.

## 18. Compact correction handoff (008 form — locators only)

Base `519ba002378707a4deccff1ea0a243d21eb694b7`; reviewed H `8373455ce3819f72d6a8849f9b8a6caf688d6dda`;
review record `docs/development/work/K1.1-reference-01/review-07.md` (this file).

Open findings and required outcomes, no prescribed patch:

- `REF1-R7-DIGEST-01` P2 — `contract.md` rev 6, exclusion-breadth paragraph. Required: a census the
  repository reproduces; validation: same two commands as §6.3–6.4.
- `REF1-R7-QUOTE-02` P2 — `contract.md` rev 6, withdrawn-rev-5 block. Required: preserved text is
  byte-exact or the edit is recorded; validation: diff of the block against `2f1a7ce`.
- `REF1-R7-COUNT-03` P2 — `implementation-07.md` measurement table and prose. Required: classes named,
  totals recorded; validation: `git diff --check` warning-line counts at `A..C7`, `A..H7a`, `main..C7`.
- `REF1-R7-EVID-04` P2 — `implementation-07.md` §`REF1-R6-EVID-01`, 007 round-7 sentence. Required: the
  universal true or qualified; validation: header lines of `validation-07/00,01,04`.
- `REF1-R7-WORD-05` P3 — `mental-model/README.md:85` inside the authorized section.
- Head record P2-class requirement (§11) — report identity table + 007 row: full SHA of the head, and
  which commit a verdict binds to.
- Carried open from review-06: `REF1-R6-AUTH-01` (owner-side confirmation only).
- Prior findings moot-by-withdrawal, reopen if `REF1-DEC-3` is declined: `REF1-R6-CHK-01`,
  `REF1-R6-EXCL-01`.

CHANGES REQUIRED