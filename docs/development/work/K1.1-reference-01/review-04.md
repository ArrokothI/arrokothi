# K1.1-reference-01 independent review — round 3, cumulative re-review of exact H3

**Transcription provenance.** Transcribed into the branch by the implementing session (Anthropic
Claude Opus 5) as the owner's delegate, from the review text supplied on 2026-09-16. Nothing below
is implementer wording. **Sequencing, recorded plainly:** this ACCEPT binds exact H3
`a53757868277f954d55180c63d09b3ebd027ae9f`. After it was produced, the owner granted a bounded
Layer-1 scope amendment and the implementer built C4 `bd4a86748c31eb32ed3800e6deff1e18243e3e66`
and H4 `7db74aa881155a59acdd3933c118180ea68c6924` on top. Under 006, payload added after a review
is not covered by it. **This ACCEPT therefore covers H3 and not H4**, exactly as its own text says.
Whether to bank the ACCEPT at H3 or re-review at H4 is the owner's decision.

---

Reviewer: independent Arena.ai agent-mode reviewer — the same reviewer who wrote
[review-02](review-02.md) and [review-03](review-03.md). Underlying model identity unverified and
not disclosed by the platform. Review-only: no candidate edit, no merge, no successor release. This
record is authored in the reviewer's own workspace and is not part of the candidate; transcription
into the branch is administrative and supplies no acceptance.

Reviewer continuity is disclosed rather than hidden: this reviewer raised `REF1-R2-DOC-01` and now
certifies its closure. The disqualified party remains the implementing session, which authored C2
(the commit that caused the finding), C4/H5 and review-05, and which correctly declares itself
unable to accept anything in the K1.1 line.

## 1. Access, and two environment failures that had to be repaired first

Full shell in a clone of `ArrokothI/arrokothi`. Full pinned source obtained by `git archive` of
exact H3 into a clean directory — not a report, not a truncated patch. Node v22.22.3, npm 10.9.8.

Two things broke in this reviewer's environment before any result could be trusted. Both are
recorded because a result produced before the repair would have been wrong:

- **The clone had reverted to shallow.** `git rev-parse --is-shallow-repository` returned `true`,
  `.git/shallow` bounded history at `07f7502c`/`8e583252`, and `git cat-file -t` reported A
  `519ba002…`, D `0ee13f81…`, H5 `52b1600f…` and H1 `d4bd49fd…` as *bad objects*. A first scope
  command chain consequently printed `count=0` and empty "clean" results — all vacuous. Repaired
  with `git fetch --unshallow origin`: shallow now `false`, 618 commits reachable from H3, all six
  identities resolve, and `git merge-base --is-ancestor A H3` returns true. Every scope claim in §3
  was produced after that repair.
- **`node_modules` was empty** (0 entries), so an initial rerun produced `tsc: not found`, a
  `check:builder-docs` crash and `test:kernel` at 19 tests / 11 fail. Repaired with `npm install`
  (190 packages); `package.json` and `package-lock.json` were then restored and verified
  byte-identical, so the repair left no payload-side change. Every rerun in §5 was produced after
  that repair.

Standing limits, unchanged from prior rounds:

- The owner instruction quoted in `contract.md` is an in-session message and cannot be verified
  from the repository. Nothing here depends on its exact wording.
- Other reviewers' and the implementer's self-declared models, tools and access are their own
  claims. Their records and evidence files were inspected; their sessions cannot be re-executed.
- The prospective documentation-anchor exception rests on the pre-payload owner scope decision at
  `e46c772`. Its existence and precedence were verified; the owner's authorization channel was not.
- No external system (registry, CI, deployment target) was reachable or relevant.

## 2. Identities

| Role | SHA |
| --- | --- |
| Base A (accepted baseline) | `519ba002378707a4deccff1ea0a243d21eb694b7` |
| **Payload C3** | **`934e8345e312cf8a38074e713a6c89e365534b45`** |
| **Exact H3 — the object of this review** | **`a53757868277f954d55180c63d09b3ebd027ae9f`** |
| Contract | **revision 2** |
| review-03 transcription commit | `aaab9e498c8bdb8021d808660848abed4191b08b` |
| Prior H2 / H1 | `844bee41fd57d7ae6aa60adfd6731305394f83b9` / `d4bd49fd49fb6d70a992635cf2b6bf8317c3af89` |
| K1.1-correction-01 accepted H5 | `52b1600f3b42e3a360fdc3395178f1d147edf304` |
| Documentation freeze D | `0ee13f8138af52107d86967043bcc460faba8893` |

`git ls-remote origin codex/k1.1-correction-01-review-findings` returned
`a53757868277f954d55180c63d09b3ebd027ae9f` at the start and again at the end of this review, so H3
did not move under it. Three commits arrived since round 2: `aaab9e4` (transcribes review-03 —
byte-diffed against this reviewer's own copy; the body is preserved verbatim under an added
provenance header), `934e834` (**C3**), `a537578` (**H3**).

**This review binds to `a53757868277f954d55180c63d09b3ebd027ae9f` only.** It certifies no later
administrative, transcription or merge commit, including whatever commit eventually records this
file, and it does not re-certify H5 — that acceptance belongs to review-08.

## 3. Scope, derived from git after the repair

`git diff --name-status A H3` returns **34 paths**. Ten are declared payload paths; the remaining
24 are post-A administrative or 008-mandated records (`implementation-01/02/03.md`,
`review-01/02/03.md`, `validation-01/` 4 files, `validation-02/` 6 files, `validation-03/` 4 files,
plus `014-owner-progress-summary.md`, `cleanup-01.md`, `push-pending-01.md`,
`push-verification-01.md`, which `contract.md:56–57` places outside C/H's payload). Filtering all
34 against that enumeration returns nothing: **no undeclared path is in the cumulative diff.**

Correction delta, as git produces it:

- `aaab9e4 → C3`: **2 paths** — `mental-model/roadmap.md` and the packet `contract.md`. Both are
  inside the declared ten. **No scope amendment was taken**, and none was needed: review-03 named
  exactly these two locations.
- `C3 → H3`: the 007 ledger row plus `implementation-03.md` and `validation-03/` (MANIFEST + 3 logs).

Guards:

- `git diff --exit-code A H3 -- packages tests scripts examples package.json package-lock.json
  tsconfig.json` → **exit 0**. No executable, test, dependency or build byte moved.
- Same over the five Layer-1/2 files → **exit 0**. D's freeze is intact.
- `git diff D H5 -- mental-model/` → **0 paths**, so `KC1-DEC-7` holds and H5's ACCEPT is untouched.
- `git diff --exit-code A H3 -- packages/kernel/src/coordinator.ts packages/kernel/src/values.ts` →
  **exit 0**. REF-1 and REF-2's implementation basis is byte-identical to A.
- All ten governing files (`006`, `008`, `012`, `015`, `001`, `009`, `013`,
  `docs/development/README.md`, `AGENTS.md`, `CLAUDE.md`) → **UNCHANGED** A→H3.
- `git diff aaab9e4 H3 -- review-01.md review-02.md review-03.md` → empty. **All three prior
  reviews, including this reviewer's two, are preserved unedited.**

**REF-5 PASS.**

## 4. Evidence verification

`sha256sum` of the three extracted `validation-03/` logs matches all three digests in
`validation-03/MANIFEST.md` (**3/3**). `01-builder-docs.log`'s digest
`77872bb1ab55f37391591492cbd5c85d3ae7ee34d0b1d97c3950c0c38ed6ea9b` is identical to H2's, which is
the expected result of an unchanged 57/845/38 output — `roadmap.md:77`'s rewrite adds no link and
`contract.md` is outside the gate's source list.

`00-bounded-sweep.log` was **inspected, not rerun as a log**: its four sections were reproduced
independently in §8 with a wider boundary, and its classification of the seven inbound anchor
references matches this reviewer's own reading. Its authorship environment is Node v25.2.1, so it
could not reproduce the Node v22.22.3 conformance cancellations; §5 settles that here.

The report's decision **not** to rerun the runtime suites is sound and honestly printed rather than
asserted — no executable byte differs A→C3 — but it leaves the claim resting on round 2. This
reviewer closed that gap by rerunning all four commands at H3 anyway.

## 5. Reruns at exact H3 (reviewer's own execution, Node v22.22.3)

| Command | Result | Matches pinned evidence |
| --- | --- | --- |
| `npm run check:builder-docs` | exit 0 — **57 Markdown files, 845 local links/anchors, 38 public package imports** | yes, and unchanged from H2 |
| `npm run typecheck` | exit 0, no diagnostics | yes |
| `npm run test:kernel` | **264 tests / 55 suites / 264 pass / 0 fail / 0 cancelled** | yes |
| `npm run test:conformance` | **1949 tests / 283 suites / 1947 pass / 0 fail / 2 cancelled** | reproduces review-08 OP1 |

The 845 is unchanged, not merely equal: `roadmap.md:77`'s rewrite introduces no new link (the
sentence already carried its 007 link), and `contract.md` is not in the gate's source list. The 2
cancellations are the pre-existing legacy Effect tests, reproduced at original B by review-08 and
again by review-02 and review-03. Nothing in `packages/`, `tests/` or `examples/` differs between A
and H3, so they are not attributable to this packet. Recorded as owner observation **OP3**.

**Mechanical vs semantic.** These four commands establish link integrity, type integrity and
behavioural non-regression. They cannot establish that a prose sentence says what it should. REF-4
was decided in §6–§8 by reading.

## 6. Closure of REF1-R2-DOC-01 (P2)

**Primary location — `mental-model/roadmap.md:77` — CLOSED.** The sentence now reads:

> "[Execution-cycle](mechanisms/execution-cycle.md#delivery-reporting-boundary) retains the delivery
> mechanism **unchanged and defers implementation status to the status ledger, which owns it**."

Read side by side with `execution-cycle.md:30` — "Which candidate implements it, what has been
independently accepted and what remains to integrate are recorded in the [status ledger](…), which
owns that question; this page states the contract, not what has shipped" — the description and the
page now agree exactly.

The report asks whether this **over-corrected**. It did not. Three checks: the sentence still says
the mechanism is *retained*, and the delivery rules below `execution-cycle.md:30` are indeed
byte-unchanged; it still says the mechanism is *unchanged*, which is true; and it still attributes
status to the ledger, which is what the page does. Nothing was deleted to make the sentence
passable, and the rest of the paragraph — navigation, scope/review dependency, no successor
release — is untouched and accurate.

**Secondary location — `contract.md:36–37` — CLOSED.** Revision 1's bullet ("replace obsolete
acceptance-pending status with exact accepted implementation evidence and limits") is replaced at
`contract.md:41–52`, and revision 1's superseded wording is quoted inside a dated note rather than
erased, so the contract records what changed and why.

## 7. Judgment on contract revision 2 — the item the report asked to be attacked first

The report is right that this is the one thing here that could be a self-serving relaxation, and it
asked to be judged rather than believed. Judged:

- **No acceptance condition was relaxed, verified two ways.** The `## Acceptance criteria` section
  hashes identically at H2 and H3 (`sha256 6a1c62d5f8654604e7585bf085bb413d723d9a0adfc93bd36d1a1f8b69fedd9f`
  for both), so REF-1…REF-5 and their required outcomes are byte-identical. And enumerating *every*
  removed line in the file returns exactly three: the `Revision 1;` header line and the two lines
  of the superseded bullet. No criterion, exclusion, anchor or required-outcome line was removed.
- **REF-3's required outcome is genuinely unchanged.** "Accepted H and pending integration
  accurately separated" still holds, and I verified it holds in 007's narrative (`007:43`,
  `007:45–51`), `007:490` and `sources.md:30`. Only *where* the separation lives moved — from a
  canonical page to the ledger.
- **The revision removes a latent conflict rather than creating one.** 006 states "One authoritative
  status lives in the table in 007." Revision 1's bullet, asking `execution-cycle.md` to carry
  accepted implementation evidence, sat against that rule. Revision 2 aligns the bullet with it.
- **The dated-note form is established convention here, not an invention.**
  `work/K1.1-correction-01/contract.md` carries revision-2 and revision-3 notes of the same kind
  ("Revision 3 is a second deliberate contract change…", "It is not a claim that H3 satisfied
  revision 2"). 006's "keep the contract a current requirement map" is satisfied.
- **The quotation of this reviewer is verbatim accurate.** `contract.md:47–48` quotes review-03's
  "the stronger of the two resolutions, not merely the permitted one". An initial single-line grep
  reported zero matches; unwrapping the paragraph shows the phrase is split across a line break and
  matches review-03 exactly. It is not a misquote, and this record says so because the first check
  appeared to say otherwise.

**Residual process observation — recorded, not blocking.** Revision 2 carries no owner decision
artifact. That differs from this repo's precedent: K1.1-correction-01's revisions 2 and 3 were
anchored to `decision-01` / `KC1-ARCH-1` / `KC1-DEC-7`. And review-03's own required outcome said
"by revision **or** by a recorded superseding note, *per the owner's preference*" — no owner
preference was recorded, so the implementer chose. **That ambiguity is this reviewer's, not the
implementer's**, and it is corrected here: either form is acceptable. It is not treated as a
finding because no acceptance condition moved, the substance was independently judged correct by
review-03 before revision 2 existed, and the owner exercises approval through this review.

The condition under which it *would* become a finding is stated so it does not have to be
rediscovered: **any future revision that touches the acceptance criteria, the exclusions or a
required outcome needs an owner decision artifact before implementation.** A revision confined to
reconciling a payload-description bullet with an already-judged approach does not.

## 8. Independent sweep, deliberately bounded wider than the implementer's

The report asks the reviewer to re-run its sweep with a wider boundary, because its own is bounded
by statements about the pages *this packet* edited. Done, along three axes:

1. **Inbound references — four anchors, not two.** The implementer grepped the two anchors this
   packet created; this review also grepped `identity.md#request-key-and-input-id` and
   `creation.md#later-input-has-a-destination`, across `mental-model/`,
   `docs/development/*.md` and the packet contract: **12 references**, each read individually —
   `identity.md:17`, `identity.md:35`, `creation.md:3`, `creation.md:25`, `creation.md:27`,
   `integration.md:7`, `reference.md:91`, `reference.md:141`, `roadmap.md:73`, `roadmap.md:77`,
   `sources.md:30`, `sources.md:32`. All 12 are accurate at H3.
2. **Status/evidence-location claims** across live documents, including the two classes the builder
   gate cannot read: only `execution-cycle.md:30` and `007:490` assert where implementation status
   lives, and both are correct. `roadmap.md:77` no longer matches the pattern at all.
3. **Revision-citation staleness — an axis neither prior round checked.** Moving the contract to
   revision 2 could orphan documents citing "revision 1". Grepping for that returns only
   `implementation-02.md:9` and `review-01.md:20`, both sealed records correctly describing their
   own date. Nothing live is orphaned.

**Non-regression of the three round-1 findings, re-run here rather than inherited:** no stale
status phrase in 007's narrative (the single hit at `007:489` is the dated in-row chronology of
review-01's state, unchanged since A and accepted by review-02); no shipped/accepted assertion under
`concepts/`+`mechanisms/` beyond the pre-existing `evidence.md:3` reference to accepted K1.0
*decisions* and `execution-cycle.md:30`'s own negation; no candidate SHA under either directory;
**0 of 65** canonical-list entries carry a second target.

`REF1-R2-DOC-01` is **CLOSED and non-regressing**. No new finding of any severity against the
candidate.

## 9. Criterion verdicts at exact H3

| Criterion | Verdict | Basis |
| --- | --- | --- |
| REF-1 identity/creation domain separation | **PASS** | `coordinator.ts` byte-identical A→H3 (exit 0); `identity.md`/`creation.md` prose re-read against source |
| REF-2 in-process value capture | **PASS** | `values.ts` byte-identical A→H3 (exit 0); every representation rule on the page matches |
| REF-3 delivery rules; accepted-H / pending-integration separation | **PASS** | Delivery rules unchanged; separation verified in 007 narrative + row and `sources.md:30`; `next_release: none` |
| REF-4 canonical navigation, ownership and provenance | **PASS** | `REF1-R2-DOC-01` closed in both locations; 12/12 inbound references accurate; 845/845 links resolve |
| REF-5 bounded scope | **PASS** | 2-path correction delta, both declared; executable tree exit 0; no undeclared path in 34 |

All findings from all three prior rounds are closed: `REF1-R1-STATUS-01`, `REF1-R1-CONV-01`,
`REF1-R1-NAV-01` (closed at C2, re-verified non-regressing here) and `REF1-R2-DOC-01` (closed at
C3). No P0–P3 finding is open against the candidate. No BLOCKED condition: every input this review
required was reachable after the two environment repairs in §1.

## 10. Owner observations — administrative items, not candidate defects

Each of these sits in a path the contract places outside C/H's payload, so the candidate has no
in-scope way to fix them and none is counted against it:

- **OP4 — `014-owner-progress-summary.md:124`** still says the reference supplement "records the
  accepted identity/value boundaries and **updates delivery evidence**". After rounds 2–3 the
  supplement deliberately carries *no* implementation evidence and defers status to the ledger, so
  that clause is now ambiguous in the same family. 014 was touched only by admin commit `154a765`.
  Belongs to final cleanup.
- **OP5 — `work/K1.1-correction-01/cleanup-01.md:26` and `:123`** still name H1 `d4bd49fd…` as the
  reference candidate and the disposition as BLOCKED. Both are correct as of their date and are
  superseded by this review. Belongs to final cleanup.
- **OP6 — the durable fix for this defect family is out of this packet's reach.** The mechanical
  check the implementer proposes requires widening `scripts/check-builder-docs.ts`'s source list to
  `docs/development/**` and 007, plus an assertion that no `concepts/`/`mechanisms/` page claims
  shipped status. Both are `scripts/` changes — executable payload — and therefore outside a
  documentation-only packet. The implementer declined to widen scope inside a report, which is the
  discipline 006 requires; the owner needs a separate packet for it.
- **OP3 — the two legacy Effect tests still cancel on Node v22.22.3**, reproduced here a third
  time. Pre-existing at original B; not attributable to anything in the K1.1 line.

## 11. Coverage gaps

- The owner's in-session authorization of this packet, and of the documentation-anchor exception,
  is not verifiable from the repository.
- Other sessions' models, tools and access are not independently verifiable.
- No external proof of registry publication, CI execution or deployment was available or in scope;
  the packet makes no such claim.
- This reviewer's sweep, like the implementer's, is hand-run and bounded — here by statements about
  this packet's edited pages, plus revision citations. A stale statement about something outside
  that boundary would not have been caught. That is the standing weakness OP6 exists to remove.
- Runtime suites were rerun on Node v22.22.3 only. The round-2 author's Node v25.2.1 runs were not
  reproduced; both are inside the declared support range.

## 12. Acceptance

Exact **H3 `a53757868277f954d55180c63d09b3ebd027ae9f`** over payload **C3
`934e8345e312cf8a38074e713a6c89e365534b45`**, base **A
`519ba002378707a4deccff1ea0a243d21eb694b7`**, contract **revision 2**, evidence
`validation-03/MANIFEST.md` (3/3 digests verified), REF-1…REF-5 all PASS, no open finding.

This acceptance binds to that exact commit and no other. It does not re-certify H5, does not
authorize a merge, does not release a successor, and does not close integration or the parent K1
milestone. Implementation ACCEPT at H5 remains review-08's. `next_release: none`.

**Verdict: ACCEPT** of exact H3 `a53757868277f954d55180c63d09b3ebd027ae9f`. All five criteria PASS;
`REF1-R2-DOC-01` closed in both named locations and non-regressing; contract revision 2 verified not
to relax any acceptance condition; no new finding at any severity.