# Implementation report — K1.1-reference-01, round 4 (C4/H4)

Every interval and grep below is copied from `validation-04/00-layer1-scope.log`, which prints each
one rather than describing it.

## Identity

- Packet/contract: K1.1-reference-01, [contract](contract.md) **revision 3** — an owner scope
  amendment, recorded at `f8dd3b41f7b3e6495dda39d8c65b6036a0c896d8` **before** any payload, in a
  commit carrying no payload at all.
- **Role and independence.** Implemented by the session that wrote review-05, K1.1-correction-01's
  C4/H5, and this packet's C2 and C3. **Disqualified from accepting anything in the K1.1 line.**
  Round 1 was the GPT-6 cleanup session's.

  | Label | SHA |
  |---|---|
  | A (supplement base) | `519ba002378707a4deccff1ea0a243d21eb694b7` |
  | D (owner documentation freeze) | `0ee13f8138af52107d86967043bcc460faba8893` |
  | H5 (accepted implementation, untouched) | `52b1600f3b42e3a360fdc3395178f1d147edf304` |
  | H1 / H2 / H3 (prior candidates) | `d4bd49f…` / `844bee41…` / `a5375786…` |
  | scope amendment (no payload) | `f8dd3b41f7b3e6495dda39d8c65b6036a0c896d8` |
  | **C4 (round-4 payload)** | **`bd4a86748c31eb32ed3800e6deff1e18243e3e66`** |
  | H4 | this commit |

- C4→H4 allowlist: this report, `validation-04/` (3 logs + MANIFEST), the 007 ledger row.
- State: WAITING_FOR_REVIEW. `next_release: none`.

## Why this round exists

Not a review finding. **An owner scope grant**, on 2026-09-16:

> "for `mental-model/README.md`, all the part in `## How these pages are organized` and
> `## Target, not shipped` can be modified"

under the standing rule that the five Layer-1/2 core pages "are not immutable, just need to have a
clear discussion instead of change them secretly."

This is the amendment [review-02](review-02.md) identified as resolution (a)'s prerequisite and
correctly declined to self-authorize. It is recorded in the contract before the payload, per the
discipline `KC1-DEC-7` established after the round-4 K1.1 collision — **not** justified inside a
report.

## Changes

**C4 edits one file, two sections. Nothing else.**

### `## How these pages are organized` — states the rule four rounds kept violating

The page describes three layers, a precedence rule and three navigation pages, but nowhere said
*where implementation status lives*. That silence is the root of `REF1-R1-CONV-01` and
`REF1-R2-DOC-01`, and of `KC1-R3-DOC-01` and `REF1-R1-STATUS-01` before them: four defects, each a
status sentence written onto a page that does not own status.

Added: no page in the three layers records what has been built; a specification page states a
contract and names its gate; implemented / independently accepted / integrated are owned by the
ledger alone; navigation pages may record provenance but defer status the same way. Plus the reason
it keeps happening — a status sentence reads as helpful the day it is written, and nothing in the
page's own subject matter reveals it later when the status moves — and a concrete trigger: if you
are adding "accepted", "implemented" or a commit identity to a `concepts/` or `mechanisms/` page,
the ledger is the place for it.

This does not create a second home for a rule. Documentation organization is this section's own
subject, and it agrees with 006's "One authoritative status lives in the table in 007".

### `## Target, not shipped` — replaces prose that had drifted

The old text asserted "Only the K0 gate is complete" and "a page naming any later gate describes
protocol behavior that **has not been built yet**", and described K1.1's boundaries in the future
tense ("belong to K1.1"). K1.1 is accepted; those boundaries are built. I raised this as a latent
issue last turn rather than editing it silently, and the grant makes it actionable.

**The new text is written so its failure mode is *incomplete* rather than *false*.** That is the
design point, not a stylistic preference:

| Sentence | Why it does not go stale |
|---|---|
| "A gate named on a page is the contract for that gate, not a claim that the gate has shipped" | a rule, not a status |
| "…are implemented under K1.1" | implementation does not un-happen |
| "…belong to later gates; the ledger says which of them have since landed" | when K1.2 lands this gets less informative, not untrue |
| every precise question | delegated to 007 and 002 by name |

It also names **accepted and integrated as different facts** — the distinction this whole line has
been fighting over — and summarizes the missing concept-page Status line with
`reference.md#how-pages-are-named` named as its owner.

## Coverage

| Obligation | Check | Expected facts and forbidden changes | Evidence | Result |
|---|---|---|---|---|
| change confined to the two granted sections | split both versions on `## `, compare section by section | 6 sections byte-unchanged, 2 changed; **forbidden:** any edit elsewhere on the page | `00` §1 | PASS — proved per section |
| no heading renamed | diff the heading lists | identical, same order; every inbound anchor survives | `00` §1 | PASS |
| the constraining anchor survives | `reference.md` links `README.md#target-not-shipped` | heading text preserved verbatim | `00` §3 | PASS |
| no other core page touched | `git diff D` on the other four | byte-identical; **forbidden:** widening the grant | `00` §2 | PASS |
| mutual ownership coherent | read `reference.md:31` against the new README text | each links to the other for the half it does not own; both anchors exist | `00` §4 | PASS |
| earlier findings non-regressing | the four negative greps | all clean | `00` §5 | PASS |
| no live document repeats the replaced claims | grep the old assertions repo-wide | one hit, the new README line itself, annotated | `00` §6 | PASS |
| executable / H5 untouched | `git diff` each class | empty; `D→H5 -- mental-model/` empty, so the freeze and ACCEPT hold | §Identity checks | PASS |
| navigation | `check:builder-docs` | 57 files / **847** links+anchors / 38 imports (845 before; +2 new internal links) | `01` | PASS |
| types | `typecheck` | clean | `02` | PASS |

- Tests added/ported/removed: **none**. No test file changed.
- Prior findings: `REF1-R1-STATUS-01`, `REF1-R1-CONV-01`, `REF1-R1-NAV-01`, `REF1-R2-DOC-01` — all
  closed in earlier rounds, verified non-regressing here. No new finding closed or opened.
- Additional self-found defects: none.

## What a reviewer should attack first

1. **Verify the section-level scope proof independently.** It is the whole basis for claiming a
   Layer-1 edit stayed inside its grant, and it is my own script.
2. **Judge whether the new rule belongs at Layer 1 at all.** I argue documentation organization is
   this section's own subject and that it restates no Layer-3 rule. Disagree if you see a second
   home.
3. **Test the stale-resistance claim adversarially.** Assume K1.2 has just been accepted and reread
   the section. Anything that reads false rather than merely incomplete is a defect I introduced.
4. **Check the orientation paragraph is still accurate**, not just durable: K0.1, K0.2 and K1.0
   integrated; K1.1 implemented and accepted, not integrated.
5. **Discount my independence entirely.**

## Validation and limits

CWD repository root. C4 `bd4a86748c31eb32ed3800e6deff1e18243e3e66`, tree clean. Node v25.2.1,
npm 11.6.2, TypeScript 5.9.3. `check:builder-docs` 57/847/38 exit 0; `typecheck` clean exit 0. Raw
logs and digests: `validation-04/MANIFEST.md` (3 logs).

Runtime suites not rerun: no executable byte differs A→C4, printed in `00`. Round 2's cross-check
reruns and review-03's independent reruns at H2 stand.

**Node limitation, restated.** Two legacy Effect tests cancel on Node v22.22.3 — review-08 OP1,
reproduced by review-02 and review-03, pre-existing at original B. This machine has only Node 18
and 25 and has never reproduced it. **No all-supported-Node green claim is made.**

Not run and why: `test:evals` (no Agent/model/eval path); full suite, SDK, architecture, ablations
(no executable change); E1, native Driver, persistence, isolation, packaging — contract-excluded.

Third-party: **no new reuse**; manifests byte-unchanged; exact unmodified `canonicalize@3.0.0`
remains the sole approved third-party specifier.

## Handoff

Ready for independent review of exact H4 — cumulatively A→H4, plus the round-4 delta
`a5375786..C4` and the separate scope-amendment commit `f8dd3b41`. Reviews 01, 02 and 03 are
preserved unedited. Implementation ACCEPT at H5 is untouched and not re-certified. No
self-acceptance; integration and final cleanup remain held; `next_release: none`.

## Owner note

The mechanical check remains the open item and is still out of scope: `check:builder-docs` reads
neither `docs/development/work/**` nor `007`, so it validates links and never prose. This round
writes the *rule* at Layer 1, which makes the defect family nameable and checkable by a reader —
but a reader is what missed it four times. Widening the checker's source list and asserting that no
`concepts/` or `mechanisms/` page claims shipped status are `scripts/` changes, and they need their
own packet.
