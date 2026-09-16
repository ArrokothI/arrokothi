# Implementation report — K1.1-reference-01, round 2 (C2/H2)

Every interval below is copied from `validation-02/00-scope-and-findings.log`, which prints each
one from git. That habit exists because `KC1-R5-PROC-01` was a report narrative that contradicted
its own evidence.

## Identity

- Packet/contract: K1.1-reference-01, [contract](contract.md) revision 1, REF-1–REF-5, **unchanged
  this round**. Governing process baseline: supplement base A, where 006/008/012 are byte-identical
  to original B.
- **Role and independence.** Round 1 (contract, payload C, report `implementation-01.md`) was
  written by the **GPT-6 owner-delegated cleanup session**. This round was implemented by a
  different session (**Anthropic Claude Opus 5**) at the owner's instruction, acting on
  [review-02](review-02.md)'s findings. That session also implemented K1.1-correction-01's C4/H5
  and authored its review-05, so it is **disqualified from accepting anything in the K1.1 line**,
  including this candidate. It transcribed review-02 verbatim as the owner's delegate; provenance
  is stated in that file.
- Identity chain, as git prints it:

  | Label | SHA | What it is |
  |---|---|---|
  | A | `519ba002378707a4deccff1ea0a243d21eb694b7` | supplement base (acceptance/status commit) |
  | H5 | `52b1600f3b42e3a360fdc3395178f1d147edf304` | accepted K1.1-correction-01 implementation, **untouched** |
  | D | `0ee13f8138af52107d86967043bcc460faba8893` | owner documentation freeze; `D→H5 -- mental-model/` is still empty |
  | C1 | `2dc3cedb02888d891ec0a6389439b7cfb3b07943` | round-1 payload |
  | H1 | `d4bd49fd49fb6d70a992635cf2b6bf8317c3af89` | round-1 candidate; reviewed by review-01 and review-02 |
  | — | `bb4e4fdff422ee64e6146106c8d47ab9955a13e1` | review-01 recorded (ACCEPT) |
  | — | `8bb0de6d6d223850ae930eec63cab6e9d08866dc` | review-02 recorded (CHANGES REQUIRED) |
  | **C2** | `fc3e450027bf2723a61784eb9d48c4c76f8a0377` | **round-2 payload** |
  | H2 | this commit | round-2 candidate (full SHA in external handoff) |

- Exact C2→H2 administrative allowlist: this report, `validation-02/` (5 logs + MANIFEST), and the
  007 ledger row for this packet. No `mental-model/`, executable, contract or sealed-record change.
- State: CHANGES_REQUESTED on review-02 → this round → WAITING_FOR_REVIEW. `next_release: none`.

## Two reviews of exact H1 disagree; both stand

[Review-01](review-01.md) (OpenAI GPT-5.6 Sol, High, GitHub-only, no shell, no reruns) returned
**ACCEPT** with "P2: none". [Review-02](review-02.md) (independent Arena.ai agent-mode reviewer,
full shell, Node v22.22.3) returned **CHANGES REQUIRED** with two P2 and one P3.

**The implementer verified all three findings against git before acting.** None was taken on
trust, and none is hallucinated:

| Finding | Claim | What git shows | Verdict |
|---|---|---|---|
| `REF1-R1-STATUS-01` | 007's live K1.1 narrative says acceptance is outstanding | line 43 read "`K11-R16-DISP-01` remains open … revision-2 implementation and independent acceptance remain outstanding", while table row 481 read `ACCEPTED` with review-08 | **CONFIRMED** |
| `REF1-R1-CONV-01` | new prose asserts shipped status where the convention forbids it | `reference.md:31` "A concept page you reached directly still describes target specification, not shipped behavior"; `values.md:25` said "The **accepted** K1.1 TypeScript binding captures…"; `execution-cycle.md:30` asserted "independently accepted by review-08" **25 lines under its own Status line** saying "target specification, not shipped behavior" | **CONFIRMED** |
| `REF1-R1-NAV-01` | the canonical list gains its only two-target entry | `reference.md:56` "Each entry points to its sole definition section"; of 65 bullet entries exactly one — line 94 — carried a second target | **CONFIRMED** |

Under 006, acceptance requires one accountable full cumulative review, not a majority. Review-01
is preserved unedited and is not withdrawn; it simply did not reach these three. This is the third
divergent pair in the K1.1 line (review-04/05, review-06/07, now review-01/02), and in all three
the shell-equipped reviewer found the defect the GitHub-only reviewer did not. That pattern is for
the owner, and is noted again below.

## Changes and coverage

**C2 edits four paths, all already in the contract's declared ten. No scope amendment was needed
or taken.**

1. `docs/development/007-work-packets.md` — closes `REF1-R1-STATUS-01` using **007's own
   convention for the K0.2 and K1.0 holds**: the historical paragraph is kept and marked "That
   paragraph stands as the record of the hold at its own date", and a new **Resolved since**
   paragraph states the current truth — `K11-R16-DISP-01` closed, implementation independently
   accepted at exact H5 by review-08, table rows authoritative, integration and cleanup held for
   this packet's review, `next_release: none`. Review-02 offered "state current truth **or** mark
   as dated historical record"; this does both, because the historical paragraph is itself true of
   its date and deleting it would lose the invalidation record 006 requires be preserved.
2. `mental-model/concepts/values.md` — "The **accepted K1.1** TypeScript binding captures…" →
   "The **in-process** TypeScript binding captures…". The rule is unchanged; what is removed is
   the assertion that it has shipped, on a page whose convention says it carries none. This
   matches the phrasing already accepted in `execution-cycle.md` ("For the in-process TypeScript
   binding, delivery uses…").
3. `mental-model/mechanisms/execution-cycle.md` — the "**Implementation evidence:**" paragraph
   becomes "**Introduced by:**" plus a pointer: which candidate implements it, what has been
   accepted and what remains to integrate "are recorded in the [status ledger], which owns that
   question; this page states the contract, not what has shipped." No candidate SHA, no acceptance
   assertion, no review link. The delivery **rules** below it are untouched.
4. `mental-model/reference.md` — line 94 restored to one target. Nothing is lost: `identity.md`'s
   own new sentence already points at the delivery reporting boundary, and `reference.md` has a
   "Find a mechanism" table.

**Why resolution (b).** Review-02 named two honest resolutions and declined to prescribe either.
Resolution (a) — amending README's "Target, not shipped" and `reference.md`'s convention to permit
a status marker — requires Layer-1 payload that this contract excludes, and would need an owner
scope amendment. Resolution (b) is entirely inside the declared ten paths. It also produces the
better rule: **status claims live in the documents that own status** — 007, `sources.md`
(provenance) and `roadmap.md` (packet mapping) — **and the canonical concept/mechanism pages stay
target specification.** `sources.md` keeps "implemented in exact H5 …, independently accepted by
review-08" because it is the provenance page, neither a concept nor a mechanism page, and is not
governed by the convention in `reference.md:31`.

**Family sweep (012).** Review-02 records that `REF1-R1-STATUS-01` is the third appearance of the
stale-current-state family across the K1.1 line, after `KC1-R3-DOC-01` and `KC1-R4-*`. So the fix
was not stopped at the three reported instances. `validation-02/00` prints a grep over every
`concepts/` and `mechanisms/` page for accepted/shipped assertions and for candidate SHAs: **no
match**. The single pattern hit is the new `execution-cycle.md` pointer itself, which names the
ledger as owner and asserts nothing — annotated in the log so a reviewer is not misled by the
grep. `evidence.md`'s pre-existing "accepted K1.0 structural preparation limits" is unchanged,
refers to an accepted decision rather than shipped status, and is out of this packet's scope.

**Coverage table.**

| Obligation | Distinguishing check | Expected facts and forbidden changes | Evidence | Result |
|---|---|---|---|---|
| `REF1-R1-STATUS-01` closed | grep "remain outstanding\|remains open" in 007 | no match; narrative agrees with table rows 481/482 and review-08 | `00` | PASS |
| `REF1-R1-CONV-01` closed | grep accepted/shipped assertions and candidate SHAs across `concepts/` + `mechanisms/` | no assertion, no SHA; the convention in `reference.md:31` and README's "Target, not shipped" hold again | `00` | PASS |
| `REF1-R1-NAV-01` closed | count bullet entries with a second target | 0 of 65 | `00` | PASS |
| no Layer-1/2 byte moved | `git diff A C2 --` the five Layer-1/2 pages | empty; **forbidden:** editing README to fit the prose | `00` | PASS |
| no executable byte moved | `git diff A C2 --` packages/tests/scripts/examples/manifests | empty | `00` | PASS |
| no sealed record edited | `git diff 8bb0de6 C2 -- docs/development/work/` | empty; review-01 and review-02 unedited | `00` | PASS |
| H5's acceptance untouched | `git diff D H5 -- mental-model/` | empty; the KC1-DEC-7 freeze still holds at H5 | `00` | PASS |
| navigation still valid | `check:builder-docs` | 57 files / **845** links+anchors / 38 imports, zero broken (847 before; net −2 from the removed second target and the replaced evidence link) | `01` | PASS |
| no executable change, cross-checked | `test:kernel`, `test:conformance`, `typecheck` | 264/55/0, 1949/283/0, clean | `02`–`04` | PASS |

- Tests added/ported/removed: **none**. No test file changed.
- Prior findings: `REF1-R1-STATUS-01`, `REF1-R1-CONV-01`, `REF1-R1-NAV-01` — all **closed**, each
  with a printed negative grep. REF-1 and REF-2 passed in both reviews and are unchanged by this
  round; REF-5's scope conditions are re-verified above. Every K1.1 and K1.1-correction-01 finding
  remains closed at H5; no executable byte moved, so none is reopened.
- Additional self-found defects: none this round.

## What a reviewer should attack first

1. **Re-run the three negative greps yourself.** They are my greps about my own fix.
2. **Judge resolution (b) on the merits.** I chose it partly because it stays in scope. If you
   think the canonical pages *should* be allowed to record acceptance and that README plus
   `reference.md:31` are the things that should change, say so — that is a real disagreement and
   needs an owner scope amendment, not a quiet edit.
3. **Check I did not over-delete.** Removing the H5 SHA and the review-08 link from
   `execution-cycle.md` must not lose provenance: `sources.md` and `roadmap.md` still carry it.
   Confirm that, and confirm I did not reintroduce `KC1-R3-DOC-01` (a pointer asserts nothing about
   pending or complete, so it cannot be stale — check that reasoning holds).
4. **Check the 007 rewrite preserves the invalidation record.** 006 requires the historical hold be
   retained, not deleted. Confirm the old paragraph is intact and only marked as dated.
5. **Discount my independence.** I implemented K1.1-correction-01's C4/H5 and wrote its review-05.

## Validation and limits

CWD repository root. C2 `fc3e450027bf2723a61784eb9d48c4c76f8a0377`, HEAD = C2, tree clean. Node
v25.2.1, npm 11.6.2, TypeScript 5.9.3. All exits 0: `check:builder-docs` 57/845/38; `typecheck`
clean; `test:kernel` 264/55/0/0; `test:conformance` 1949/283/0/0. Raw logs and digests:
`validation-02/MANIFEST.md` (5 logs).

**Node limitation, stated rather than buried.** The two runtime suites above ran on **Node v25.2.1
only**. Review-08 and review-02 both independently reproduced **two cancelled legacy Effect tests
on Node v22.22.3** (`tests/conformance/effects/fast-slow-equivalence.test.ts`), pre-existing at
original B and untouched by anything in the K1.1 line. This machine has only Node 18 and 25, so I
could not reproduce it. **No all-supported-Node green claim is made here**, and that observation is
not claimed away. It remains an owner item, not a packet finding.

Not run and why: `test:evals` (no Agent/model/eval path; the diff over `tests/evals/`,
`packages/agents/`, `packages/models/`, `examples/` is empty); full suite, SDK, architecture and
the ablation battery (no executable byte changed — the two suites above are a cross-check on that,
not new gates); E1, native Driver, persistence, isolation, packaging — all contract-excluded.

Third-party: **no new reuse**, no dependency added, removed or upgraded; `package.json` and
`package-lock.json` byte-unchanged. Exact unmodified `canonicalize@3.0.0` (Apache-2.0) remains the
sole approved third-party specifier in the target zone.

## Handoff

Ready for independent review of exact H2 — cumulatively A→H2, and the review-02 correction delta
`8bb0de6..C2`. Review-01 and review-02 are preserved unedited and both bind H1, not this candidate.
Implementation ACCEPT at H5 is untouched and is not re-certified by this packet. No self-acceptance;
K1.2 not begun; integration and final cleanup remain held; `next_release: none`.

## Owner note carried forward

Review-02 escalated a defect-family observation and it is repeated here rather than buried: stale
current-state acceptance wording in live documents has now surfaced three times across the K1.1
line (`KC1-R3-DOC-01`, `KC1-R4-PROC-02`, `REF1-R1-STATUS-01`). Each time it was fixed in the pages
that were being edited and missed in one live document that was not. The durable fix is a
mechanical one — a check that no `concepts/` or `mechanisms/` page asserts shipped status and that
007's narrative agrees with its own table — rather than another careful read. This round performs
that check by hand and prints it; making it a committed script is a code change and therefore
outside this documentation packet's declared scope.
