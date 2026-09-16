# Implementation report — K1.1-reference-01, round 3 (C3/H3)

Every interval and grep below is copied from `validation-03/00-bounded-sweep.log`, which prints
each one from git.

## Identity

- Packet/contract: K1.1-reference-01, [contract](contract.md) **revision 2** (this round; only the
  `execution-cycle.md` payload bullet changed — see below). Governing baseline: supplement base A,
  where 006/008/012 are byte-identical to original B.
- **Role and independence.** Implemented by the session that authored review-05 and
  K1.1-correction-01's C4/H5, and that implemented this packet's C2/H2. **Disqualified from
  accepting anything in the K1.1 line**, and supplies no acceptance. It transcribed
  [review-03](review-03.md) verbatim as the owner's delegate; provenance is stated in that file.
  Round 1 (contract revision 1, C1/H1) was authored by the GPT-6 cleanup session.

  | Label | SHA |
  |---|---|
  | A (supplement base) | `519ba002378707a4deccff1ea0a243d21eb694b7` |
  | H5 (accepted implementation, untouched) | `52b1600f3b42e3a360fdc3395178f1d147edf304` |
  | D (documentation freeze) | `0ee13f8138af52107d86967043bcc460faba8893` |
  | H1 / H2 (prior candidates) | `d4bd49fd49fb6d70a992635cf2b6bf8317c3af89` / `844bee41fd57d7ae6aa60adfd6731305394f83b9` |
  | review-03 recorded | `aaab9e498c8bdb8021d808660848abed4191b08b` |
  | **C3 (round-3 payload)** | **`934e8345e312cf8a38074e713a6c89e365534b45`** |
  | H3 | this commit |

- C3→H3 allowlist: this report, `validation-03/` (3 logs + MANIFEST), and the 007 ledger row.
- State: CHANGES_REQUESTED on review-03 → this round → WAITING_FOR_REVIEW. `next_release: none`.

## The finding, verified before it was acted on

[Review-03](review-03.md) closed all three round-1 findings as non-regressing, passed REF-1, REF-2,
REF-3 and REF-5, and raised one new P2 against REF-4. **It is correct**, and the defect is mine —
introduced by C2, which I wrote.

| Claim | What git showed before this round | Verdict |
|---|---|---|
| `roadmap.md:77` says execution-cycle "retains the delivery mechanism **with exact implementation evidence**" | verbatim present; while `execution-cycle.md:30` has said, since C2, "this page states the contract, **not what has shipped**" and defers status to the ledger | **CONFIRMED** |
| secondary: `contract.md:36–37` still instructs "replace obsolete acceptance-pending status with **exact accepted implementation evidence** and limits" | verbatim present; the opposite of what C2 deliberately did | **CONFIRMED** |
| `check:builder-docs` could never have caught it | its source list is `docs/development/README.md`, root/package READMEs, two legacy docs, the skill file, `docs/guides/**`, one example README and `mental-model/**` — **not** `docs/development/work/**` or `007` | **CONFIRMED** |

The statement was true at H1 and became false at C2. The same commit that removed the evidence from
the page did not update the two live documents describing it.

**Why the round-2 sweep missed it, accepted without deflection.** That sweep grepped `concepts/`
and `mechanisms/` — the directories I had edited — and printed accurate negatives *for those
directories*. But the stale sentence lives one directory up, in a page that **describes** the
edited page. Review-03's diagnosis is exact: the boundary was drawn around the edited **files**
instead of around the set of **statements about** them. 012 requires the latter — dependent paths
"including ones outside the edited section … which examples, migration rows or test oracles
describe it". A packet-mapping row in `roadmap.md` is precisely such a row.

This is the **fourth** appearance of the family (`KC1-R3-DOC-01`, `KC1-R4-PROC-02`,
`REF1-R1-STATUS-01`, now `REF1-R2-DOC-01`). Each time it was fixed where the editing happened and
missed one live document that merely talked about it.

## Changes and coverage

**C3 edits two paths, both inside the contract's declared ten. No scope amendment taken.**

1. `mental-model/roadmap.md:77` — "retains the delivery mechanism **with exact implementation
   evidence**" → "retains the delivery mechanism **unchanged and defers implementation status to
   the status ledger, which owns it**." No new link; the sentence already carries its 007 link.
2. `docs/development/work/K1.1-reference-01/contract.md` — **revision 2**. The `execution-cycle.md`
   payload bullet now asks for the obsolete acceptance-pending status to be removed and status
   deferred to the ledger. Revision 1's superseded wording is **quoted inside a dated note** rather
   than silently rewritten, so the contract records what changed and why.

**On whether revision 2 relaxes anything — judge this, do not accept it.** 006 forbids a candidate
from relaxing its own acceptance conditions. My claim is that it does not: **REF-3's required
outcome is unchanged** — "accepted H and pending integration accurately separated" still must hold,
and it does, in 007, `sources.md` and `roadmap.md`. What moved is only *where* the separation
lives, from a canonical page to the ledger 006 already designates the single status owner. The five
REF criteria, the ten payload paths, the anchors and every exclusion stand verbatim. Review-03
independently judged that approach "the stronger of the two resolutions, not merely the permitted
one" — but that was a judgement about C2's edit, not a pre-approval of my contract wording, so the
wording needs its own check.

**The sweep, re-bounded as review-03 required** (`00-bounded-sweep.log`):

- **All seven inbound references** to the two anchors this packet created were read and classified
  individually, not counted: `reference.md:141`, `sources.md:30`, `sources.md:32`, `roadmap.md:73`,
  `roadmap.md:77`, `integration.md:7`, `identity.md:35`. Six were accurate; only `roadmap.md:77`
  was stale. I reproduced review-03's classification rather than inheriting it.
- **Statements claiming a page carries implementation evidence**, across live documents including
  the two classes the builder gate cannot read: four hits, all accounted for in the log —
  `roadmap.md:77` (now true), `002:309` (unrelated usage, pre-existing), and `contract.md:41/:44`
  (the new bullet and its dated quotation of the superseded wording).
- **The three round-1 negative greps re-run for non-regression**: no stale status phrase in 007; no
  accepted/shipped assertion under `concepts/`+`mechanisms/`; no candidate SHA there; 0 of 65
  canonical-list entries carry a second target.

| Obligation | Check | Expected facts and forbidden changes | Evidence | Result |
|---|---|---|---|---|
| `REF1-R2-DOC-01` closed | read `roadmap.md:77` against `execution-cycle.md:30` | the description matches the page | `00` §3 | PASS |
| secondary closed | contract bullet vs what the payload does | contract is a current requirement map again; superseded wording preserved, not erased | `00` §3 | PASS |
| sweep bounded correctly this time | all inbound refs read individually; live docs beyond the builder gate's reach | every stale statement found, not only those in edited directories | `00` §1–2 | PASS |
| round-1 findings non-regressing | three negative greps | all clean | `00` §4 | PASS |
| scope | `git diff A..C3` | 2 paths, both declared; **forbidden:** a scope amendment self-authorized in a report | `00` | PASS |
| executable / Layer-1-2 / sealed records | `git diff` each class | empty; reviews 01–03 unedited | `00` | PASS |
| H5 untouched | `git diff D H5 -- mental-model/` | empty; freeze and ACCEPT intact | `00` | PASS |
| navigation | `check:builder-docs` | 57 files / 845 links+anchors / 38 imports, unchanged from H2 | `01` | PASS |
| types | `typecheck` | clean | `02` | PASS |

- Tests added/ported/removed: **none**. No test file changed.
- Prior findings: `REF1-R1-STATUS-01`, `REF1-R1-CONV-01`, `REF1-R1-NAV-01` — closed at C2, verified
  non-regressing here and by review-03. `REF1-R2-DOC-01` — closed this round. All K1.1 and
  K1.1-correction-01 findings remain closed at H5; no executable byte moved, so none reopens.
- Additional self-found defects: none this round.

## What a reviewer should attack first

1. **Judge contract revision 2 on the merits.** It is the one thing here that could be a
   self-serving relaxation. Check REF-3's required outcome against what the tree actually does.
2. **Re-run the bounded sweep yourself, with a wider boundary than mine.** Mine is bounded by
   statements about the pages *this packet* edited. If a stale statement exists about something
   else, my boundary misses it too — that is the standing weakness of a hand-run sweep.
3. **Check I did not over-correct `roadmap.md`.** The sentence must still describe the packet
   accurately, not just avoid the false clause.
4. **Discount my independence entirely.** I wrote C2, which caused this finding, and C4/H5 and
   review-05 before it.

## Validation and limits

CWD repository root. C3 `934e8345e312cf8a38074e713a6c89e365534b45`, tree clean. Node v25.2.1,
npm 11.6.2, TypeScript 5.9.3. `check:builder-docs` 57/845/38 exit 0; `typecheck` clean exit 0.
Raw logs and digests: `validation-03/MANIFEST.md` (3 logs).

**Runtime suites not rerun this round**, and the reason is printed rather than asserted: no
executable byte differs A→C3 (`00`). Round 2's `test:kernel` 264/55 and `test:conformance`
1949/283 cross-checks stand, and review-03 independently reran all four commands at H2 on
Node v22.22.3 and matched.

**Node limitation, restated.** Two legacy Effect tests cancel on Node v22.22.3 — review-08 OP1,
reproduced by review-02 and again by review-03. Pre-existing at original B, untouched by anything
in the K1.1 line. This machine has only Node 18 and 25, so I have never reproduced it myself.
**No all-supported-Node green claim is made here.**

Not run and why: `test:evals` (no Agent/model/eval path; that diff is empty); full suite, SDK,
architecture and the ablation battery (no executable change — round 2's cross-check and review-03's
reruns cover the claim); E1, native Driver, persistence, isolation, packaging — contract-excluded.

Third-party: **no new reuse**; `package.json` and `package-lock.json` byte-unchanged. Exact
unmodified `canonicalize@3.0.0` (Apache-2.0) remains the sole approved third-party specifier.

## Handoff

Ready for independent review of exact H3 — cumulatively A→H3, plus the correction delta
`aaab9e49..C3`. Reviews 01, 02 and 03 are preserved unedited. Implementation ACCEPT at H5 is
untouched and not re-certified by this packet. No self-acceptance; integration and final cleanup
remain held; `next_release: none`.

## Owner note carried forward

Review-03 escalated the family again and verified why the existing gate cannot catch it:
`scripts/check-builder-docs.ts` reads neither `docs/development/work/**` nor `007`, so it validated
`roadmap.md:77`'s **link** — which resolves — and could never have seen its **prose**. Four rounds
have now each been closed by a careful hand-run sweep, and three of those sweeps missed exactly one
live sentence.

The durable fix is mechanical and has two parts: widen the checker's source list to the live
development documents, and add an assertion that no `concepts/` or `mechanisms/` page claims
shipped status. Both are `scripts/` changes — executable payload — and therefore **outside this
documentation packet's declared scope**. They need their own packet. I am not widening scope inside
a report to reach them, which is the same discipline review-03 asked for.
