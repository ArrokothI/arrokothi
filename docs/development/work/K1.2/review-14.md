# Independent review — K1.2, review 14 (second owner-requested review of candidate H14)

Recorded at the owner's explicit instruction of 2026-09-26 ("push the review-14, as well as the
needed changes"), together with [invalidation-01](invalidation-01.md) and the 007 status update. The
review text below is unchanged from the reviewer's delivered record except for this paragraph and the note on where the raw rerun logs were kept.

## Identity

- Reviewer: Claude Code session `session_01XeB6Z344VH7JaWgqru134Y`; `get_session` reports
  `session_context.model` and `last_served_model` both `claude-opus-5-5`. Date 2026-09-26 UTC.
  Owner-requested independent review of the same candidate that review-13 (ChatGPT, GPT-5.6 Sol)
  accepted. This session authored no K1.2 implementation, report, decision or earlier review.
- Correlated-assumption disclosure: `decision-02.md` and the owner-directed canonical, contract and
  BASELINE text included in C12 were recorded or drafted by "a Claude Code session (Claude Opus 5.5)"
  (decision-02; implementation-14). This session did not write them, but shares that model family.
  I tested them against the governing Layer-3 owners and against running code, not against their
  own reasoning.
- Repository/branch: `ArrokothI/arrokothi`, `claude/k1.2-outcome-acceptance-receipts`
  (advertised remote head `c0e2b01ffa36e4e6be20ed35958f8568008995b8`, which is review-13's
  administrative commit A; this review does not certify A).
- Governing base and process baseline B: `a20d278185eaffc7f8b7489345a3624231ff6e6d` (006/007/008/012
  as they stand there; B..H changes no process document except 007 status rows and the
  development README).
- Owner decision: `decision-02.md`, commit `5b5fc53010e20ebbb8aa9f570ebd5216598e13be`.
- Payload C12: `2f4e64b1f51c679e2b381f9fb9800f2e290ddd30`. Reviewed candidate H14:
  `c36cbe04f7c97f198794bfede972d4861247cca0`. Contract revision 9 (at C12).
- Prerequisites verified as ancestors of B after unshallowing the clone: K1.1 H
  `52b1600f3b42e3a360fdc3395178f1d147edf304`, integration `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`;
  K1.1-correction-02 H `719abbf9e55e7489b6255a08cbb9e97a1e960a5e`, integration
  `954d31b00eb7f2412c22ccf7d4d079699f0c4032`. B is an ancestor of current remote `main` (= B).

## Access, independence and limits

- Full local Git clone of the repository (all refs fetched, then unshallowed); full pinned source at
  B, C12 and H14; cumulative `git diff B H14` (209 files; 48 outside `work/K1.2`) read in full for
  source, tests, Layer-3 and development documents; correction delta `5b5fc53..C12` read in full.
- Shell with Node v22.22.2, npm 10.9.7, TypeScript 5.9.3, Linux x86_64. All reruns below were made
  in a clean detached worktree at exact H14 (`git status` empty before and after), with `npm ci`.
- No GitHub web/PR access was needed or used. No implementation or semantic document was changed.
- Not examined: native Driver fidelity, persistence/process death and E-gate evidence (outside K1.2's
  claims); timing non-disclosure (not claimed); every one of the 642 kernel test bodies line by line
  (the C1–C4, C7, E-6, decision-02 and C2-replay suites were read; others were assessed through
  names, targeted reading and the 46 ablations).

## Candidate identity, ranges and evidence

- B..H14 is linear (44 commits, no merges). C12's sole parent is the decision commit; H14's sole
  parent is C12.
- `C12..H14` contains exactly `implementation-14.md`, `validation-14/` (ten logs and `MANIFEST.txt`)
  and the K1.2 row of 007: the declared allowlist. No payload is hidden in H.
- `H14..A` (`c0e2b01`) contains only `review-13.md` and the K1.2 row of 007.
- I recomputed all 17 MANIFEST digests (seven C12 payload files via `git show`, ten logs):
  **17/17 match**.

Reruns at exact H14 (reviewer-executed; raw logs stayed in the reviewer's session scratchpad and are not attached, so only digests are recorded; the counterexamples are reproducible from the schedules in the findings):

| Command | Result | Log SHA-256 |
|---|---|---|
| `npm run typecheck` | exit 0 | `a2c9b592…a0a9` |
| `npm test` | exit 1: 2696 tests, 2694 pass, 0 fail, **2 cancelled** (see O4) | `7a735158…7833` |
| `npm run test:kernel` | exit 0; 642/642 | `d671aae1…6c22` |
| `npm run test:conformance` | exit 1: 1945 tests, 1943 pass, 0 fail, 2 cancelled (same two) | `f4606722…268f` |
| `npm run test:sdk` | exit 0; 22/22 | `aace0673…a4c1` |
| `npm run test:evals` | exit 0; 12/12 | `83368328…b614` |
| `npm run check:builder-docs` | exit 0 | `a1373be0…0244` |
| `node docs/development/work/K1.2/ablations.mjs` | control 642/642; **36/36 rejected** | `9c899961…9246` |
| `review-11/probe-partial-claim.ts` | 8/8 `stale_exchange`, state unchanged | `d66d5324…6402` |
| reviewer ablations X4–X24 (runner copied from `ablations.mjs`) | control 642/642; **9/10 rejected, X24 survived** | `b6a68b76…a1de` |

The two cancellations are in the untouched legacy file
`tests/conformance/effects/fast-slow-equivalence.test.ts` and reproduce identically at B in the same
environment; they are not attributable to this candidate. The implementer's pinned Node 25.2.1 logs
show none. Mechanical results (typecheck, suites, ablations) are distinguished below from semantic
judgments, which rest on source reading and the reviewer probes.

Reviewer probes (not payload): `probe-1` (decision-02 schedules, replay without authority, precedence,
unread wait/Effects, B-5 and terminal ingress), `probe-2` (reentrant getters, protocol hold, retained
immutability, synchronous Driver, late reports, hidden-Execution read counting), `probe-3` and
`probe-6` (Kernel-minted identity length), `probe-4` (unknown-field rendering), `probe-5`
(string-malformed identities). All pass except the defects recorded below.

## Independent obligation/interaction coverage

Derived from `execution-cycle.md` (base and C12), `identity.md`, `core.md`, `lifecycle.md`,
`state.md`, `recovery.md`, `evidence.md`, `values.md`, `creation.md`, decision-01/02 and the contract,
before reading implementation-14.

| Obligation | Strongest schedule examined | Expected facts / forbidden changes | Evidence and result |
|---|---|---|---|
| OA-1 scope first (C1) | Proxy envelope counting every trap, outsider on all four surfaces | identical `unknown_destination`, position 0, zero reads past `executionId`, nothing recorded | probe-2 R7: 0 reads, identical shape; holds |
| OA-2 replay/conflict (C2, decision-02) | exact replay by a grant-less visible caller; changed epoch; malformed identity after acceptance at a later exchange and when terminal | replay returns same receipt object, nothing appended; conflict recorded; unusable identity never replays | probe-1 P2/P5; A2, B17, X8 rejected; holds |
| Exchange group (C3) | terminal × {missing, 7, throwing, lone surrogate}; no exchange; well-formed stale epoch/base with malformed identity | `terminal_destination` / `stale_exchange`, no content diagnostic returned or retained, value not rendered | probe-1 P1/P3/P4; B18, X7, X22, X23 rejected; holds |
| Authority before content (C3/C10) | current coordinates, malformed identity, absent/forged/retired grant, invalid content | `unauthorized_submission` with no diagnostic; retained equals returned | probe-1 P3; B12, B13, B19, B20 rejected; holds |
| Content group (C3) | entitled + malformed identity + invalid content; over capacity | one `malformed_envelope` listing all issues; capacity first | probe-1 P3/P6; X4, B14 rejected; holds |
| **Current identity is answerable (C3/C8/C9/C10)** | **Kernel-minted Activation ID longer than 65,536 scalar values** | **current attempt's valid Outcome and every control accepted** | **probe-3, probe-6: refused as malformed — K12-R14-ID-01** |
| Text-malformed identity class (C3, decision-02) | lone-surrogate / over-limit text identity | classification pinned by tests | probe-5 observes content-group; X24 survives — **K12-R14-EVID-01** |
| E-6 limits (C3) | at-limit and one-past for four roots; two 700 KiB siblings | at-limit retained exactly; one-past refused whole, located | `outcome-limits.test.ts` read; holds |
| Atomic acceptance, one writer (C4) | synchronous Driver answering and redispatching inside `deliver` | answers describe own exchange; receipts contiguous 1..4 with own boundaries | probe-2 R5; A1, A16, X12, B5 rejected; holds |
| Terminal and B-5 (C5/C6) | `fail` with a queued non-batch Event; ingress replay/conflict/new after end; all controls after end | batch acknowledged, rest terminal in same decision; replay shows `terminal`; everything else refused | probe-1 P8; A7, A8 rejected; holds |
| Effects/await (C7) | accessor on `next.wait` and on `effects[0]` | never read; whole refusal; no Effect record | probe-1 P7; A6, A15 rejected; holds |
| Takeover/fencing (C8) | reentrant takeover during capture; retired grant at new epoch | outer `stale_exchange`; retired grant `unauthorized_submission`; new grant commits | probe-2 R2; A3–A5, B6, B10, B11 rejected; holds except K12-R14-ID-01 |
| Holds (C9/C10) | protocol hold with 5,000-char diagnostic, then grant-holding observer Outcome | bounded reason; redelivery refused; Outcome ends hold with `attempt_submission` history | probe-2 R3; X13, X17, X18, A9, A10, B3 rejected; holds except K12-R14-ID-01 |
| Late reports (C11) | out-of-order reports across two epochs after resolution, hostile failure reason | own rows only; fixed failure text; no state/receipt change | probe-2 R6; holds |
| Retained evidence (C12) | mutate carried progress, Emission value, result value, returned lists and receipt | all throw; replay/inspection unchanged | probe-2 R4; holds |
| Single observation (C13) | getter reentering with the same Outcome during capture | inner accepts, outer is exact replay, one revision | probe-2 R1; A13 rejected; holds |
| Zone (C14) | file count, imports | 13 files; `node:buffer`, `canonicalize` only | measured; holds |
| Layer-3 (C15) | normative reading of every Layer-3 hunk | one owner, no status, no silent settlement | see below; holds with P3 notes |

## Layer-3 changes reviewed as normative payload

- One owner: `execution-cycle.md#outcome-acceptance` owns the total order and
  `#submission-authority` owns authority lifetime. `identity.md`, `core.md` and `integration.md` add
  linked summaries, not competing rules. DEC-2 and BASELINE restate the order for the binding and cite
  the owner.
- No build or acceptance status on specification pages. "Introduced by … K1.2" names a gate, which
  the README allows. The BASELINE pointer is provenance.
- Open choices: the identity.md `OPEN(implementation)` marker stays, and the binding's epoch choice
  is recorded at the marker and in BASELINE. The new `OPEN(K3.2)` names an existing packet and states
  the openness in prose. The rewrite-index §4 entries agree.
- §5 inferences 1–7, 13, 26 and 28 are not committed.
- P3 notes O1 and O2 below.

## Findings

### K12-R14-ID-01 — P2 — the Kernel refuses its own minted Activation ID as malformed

- Location: `packages/kernel/src/coordinator.ts` `submitOutcome` (`identityUsable = … acceptIdentityText(activationField.observed, "activationId", …)`);
  `packages/kernel/src/outcome.ts` `captureAttempt` and `captureRecovery` (same call). The producers
  are `dispatch` (`${record.executionId}/activation-${n}`) and `createExecution`
  (`execution-${creationRequestIdKey(…)}`, which embeds the whole creation key, scope and namespace).
  Present since the first K1.2 candidate (`4babb6e`).
- Governing: C3 (a proposal naming the current unresolved Activation, epoch and base, with valid
  content and the current grant, is accepted); C8 (a takeover naming the current exchange and epoch
  advances); C9 and C10 (a request or report naming the unresolved exchange is acted on);
  `execution-cycle.md#outcome-acceptance` step 3; decision-02 ("well-formed" must not exclude the
  identity the Kernel itself issued); `recovery.md` (hold visibly rather than leave the work stuck).
- Counterexample 1 (probe-3): create with a 65,536-scalar creation key, which creation accepts at the
  string limit. Dispatch mints a 65,582-character Activation ID. The current attempt's valid Outcome
  with the current grant is refused `malformed_envelope` (`activationId string_too_long`). Takeover
  of that exchange at its current epoch is refused `malformed_value`.
- Counterexample 2 (probe-6): with a 65,490-scalar creation key, exchanges 1–9 have Activation IDs of
  exactly 65,536 scalars and are accepted. Exchange 10's ID is 65,537 scalars. Its valid Outcome is
  `malformed_envelope`, and takeover, recovery declaration and protocol-failure report are all
  `malformed_value`. The Execution stays `RUNNING` at progress revision 9. No K1.2 path can resolve,
  hold or replace that exchange, and cancellation is K1.3's.
- Impact: a validly created Execution becomes permanently unanswerable and unrecoverable from
  inputs the Kernel accepted. No accepted state is corrupted. Long host namespaces or scopes lower
  the creation-key threshold.
- Required outcome: no accepted Execution can reach an unresolved exchange whose Kernel-minted
  Activation ID is refused by `submitOutcome` (replay lookup, currency, content), `requestTakeover`,
  `recoverExecution` or `reportProtocolFailure`. One way is to classify every Kernel-minted identity
  as a well-formed Activation identity. Another is to bound or refuse, at the earliest accepted
  boundary, whatever would mint an identity those surfaces refuse. Other coherent binding choices
  are acceptable.
  - Record the chosen well-formedness rule for the Activation identity in contract DEC-1/2/3 and
    BASELINE `#outcome-acceptance-api`.
  - A correction that changes integrated K1.1 creation or Execution-ID behavior needs an
    owner-approved amendment under 006 before implementation.
- Validation: both schedules above on all four surfaces, with whole-result assertions (acceptance at
  base+1, epoch+1, hold entered and cleared), plus an ablation that restores the limit and is
  rejected.
- Reconstruction trigger (006): this is the Outcome-refusal classification subsystem again
  (R3-AUTH-02, R9-ORDER-01, R11-ORDER-01, R13-ARCH-01). Reconstruct Activation-identity
  classification from its producers (creation → Execution ID → dispatch/takeover) to every consumer
  before patching.
- Why the prior passes missed it: the check reuses K1.1's caller-text rule (K11-R3-ID-02) on a
  Kernel-issued identity. The producer side was never walked against it. The decision-02 matrices
  build malformed identities only as missing, number, object or throwing, and the E-6 limits were
  exercised on value roots only.

### K12-R14-EVID-01 — P2 — the text-malformed Activation identity class is unevidenced

- Location: `packages/kernel/tests/outcome-partial-claim.test.ts` (identity variants
  `missing | number | object | throwing`); contract coverage row "C3 malformed Activation identity".
- Governing: decision-02 ("missing, malformed or unobservable"); 012 deterministic execution (an
  oracle that rejects a plausible broken behavior); 006 (PASS needs distinguishing evidence).
- Counterexample: reviewer ablation X24 treats any string `activationId` as well formed, which
  bypasses text rules. It **survives** the full kernel suite (642/642). At H, probe-5 shows a
  lone-surrogate or over-limit string identity is content-group (`malformed_envelope` with the
  grant, `unauthorized_submission` without). No test pins either classification.
- Required outcome: pin whatever well-formedness rule K12-R14-ID-01's correction adopts.
  - Cover text identities at its edges: lone surrogate; at-limit and over-limit if a limit remains;
    the longest Kernel-minted identity.
  - Run them across the decision-02 schedules (terminal, no exchange, stale epoch/base, grant-less,
    entitled) on `submitOutcome` and the three controls.
  - Add an X24-equivalent ablation, or its inverse, that the suite rejects, and update the contract
    coverage row.

### Non-blocking observations (P3; reviewer-found unless noted)

- **O1:** `mental-model/sources.md` and rewrite-index §3 record decision-01's provenance but not
  decision-02's, although decision-02 changed the canonical Outcome-acceptance order. This is
  navigation only, because the rule lives in its owner.
- **O2:** `execution-cycle.md` Outcome-acceptance wording has two problems. The preamble's "a
  proposal's content is examined only for the attempt entitled to make it" is stronger than step 3's
  precise guarantee (eager capture may compute diagnostics that neither decide nor are returned or
  retained). This is the K12-R13-DOC-01 family; the same phrase is in the `coordinator.ts` comment
  near line 1499. Separately, step 2's "precedes all fresh validation, including later policy changes
  or cancellation" lost the base text's "after".
- **O3:** after authority succeeds, `malformed_envelope` reasons render caller-owned unknown field
  names without a bound or sanitization. Probe-4: a 1,000,000-character name yields a retained
  2,000,262-character reason, and a lone-surrogate key is retained verbatim. Only the current grant
  holder can reach it; the grant-less path is clean (198 characters). Consider bounding it like the
  DEC-8 diagnostic.
- **O4 (environment):** the two legacy cancellations noted above.
- **Carried by reference:** review-12/13's P3 on the stale 007 introduction, and review-13's P3 on the
  historical OPEN-5 paragraph.

## Prior findings

- K12-R13-ARCH-01, K12-R13-DOC-01 and K12-R13-REC-01 were closed in review-13. I agree for the
  classification order decision-02 specifies; K12-R14-ID-01 is a new defect in the same subsystem, not
  a reopening of ARCH-01's decision.
- K12-R11-ORDER-01 closure is preserved: the R11 probe gives 8/8 and B15/B16 are rejected.
- R1–R10 closures stand by reference. This review's reruns (36/36 ablations) and probes found no
  contrary evidence.

## Per-criterion verdicts

| Criterion | Verdict | Rationale |
|---|---|---|
| C1 | PASS | Scope precedes every other read on all four surfaces (probe-2 R7, 0 reads); hidden ≡ missing |
| C2 | PASS | Replay/conflict before fresh validation; unusable identity never addresses a record; replay needs no grant and records nothing |
| C3 | **FAIL** | K12-R14-ID-01 (the current Kernel-minted identity is refused) and K12-R14-EVID-01 (text-malformed class unpinned); the order, limits, capacity and no-retry parts otherwise hold |
| C4 | PASS | Whole batch only, base+1, Emission IDs, one writer, synchronous-Driver ordering, capacity interaction |
| C5 | PASS | continue/complete/fail, next exchange and terminal non-reopening hold wherever acceptance is reachable (reachability failure is recorded under C3) |
| C6 | PASS | B-5 in the same decision; terminal ingress refused, replayed with current disposition, conflict on change |
| C7 | PASS | Effects refused by length only; the wait is never read; no Effect record |
| C8 | **FAIL** | K12-R14-ID-01: a takeover naming the current exchange and epoch is refused `malformed_value`; fencing, grant lifetime and reentrancy otherwise hold |
| C9 | **FAIL** | K12-R14-ID-01: a recovery declaration naming the unresolved exchange is refused; hold semantics otherwise hold |
| C10 | **FAIL** | K12-R14-ID-01: a protocol-failure report naming the current attempt is refused; hold, authority-before-content and history otherwise hold |
| C11 | PASS | Late reports settle only their own rows across epochs; late Outcomes replay or conflict |
| C12 | PASS | Own receipts and contiguous positions; retained evidence immutable; hidden activity undisclosed |
| C13 | PASS | One observation per field, including malformed identity; reentrant getter ordered before checks; pollution cases |
| C14 | PASS | 13 files; only `node:buffer` and `canonicalize`; inventory and guard agree |
| C15 | PASS | One Layer-3 owner; no status on specification pages; markers correct; P3 O1/O2 |

No criterion is DEFERRED.

## Verdict and status text for transcription

K1.2 candidate H14 `c36cbe04f7c97f198794bfede972d4861247cca0` (payload C12
`2f4e64b1f51c679e2b381f9fb9800f2e290ddd30`, base `a20d278185eaffc7f8b7489345a3624231ff6e6d`,
contract revision 9): independent review 14 (Claude Code, `claude-opus-5-5`, 2026-09-26) —
**CHANGES REQUIRED**. Open: K12-R14-ID-01 (P2) and K12-R14-EVID-01 (P2). C3, C8, C9 and C10 FAIL.

Process consequence under 006, for the owner to record: review-13 already recorded ACCEPT for this
exact H14, and the packet is not integrated. This review is later evidence that invalidates that
acceptance with a reproducible counterexample. 006's rule is therefore to:

1. retain review-13's historical ACCEPT unchanged;
2. append an invalidation notice to the K1.2 record;
3. hold integration of H14 and any claim depending on it;
4. create the linked corrective packet.

K1.3 stays unreleased. This review does not certify `c0e2b01`, does not merge and releases nothing.

## Compact correction handoff

```text
Correct K1.2 through the corrective packet the owner creates under 006's invalidation rule
(review-13's ACCEPT of H14 retained; integration and K1.3 held).
Base a20d278185eaffc7f8b7489345a3624231ff6e6d; reviewed H c36cbe04f7c97f198794bfede972d4861247cca0;
review record docs/development/work/K1.2/review-14.md at the owner's recording commit.
Open findings K12-R14-ID-01, K12-R14-EVID-01; required outcomes and counterexamples are in that record.
Owner supplemental decisions: decision-01, decision-02 (unchanged). Unresolved authority: none, unless
the chosen correction changes integrated K1.1 creation/Execution-ID behavior, which needs an
owner-approved amendment first.
Apply 006 and 012: reconstruct Activation-identity classification from its producers to every
consumer, then re-review the whole cumulative packet. Fix additional in-scope defects with separate
provenance.
Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.
```
