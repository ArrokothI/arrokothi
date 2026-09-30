# Independent review — K1.2, review 13 (round-14 candidate H14)

## Identity

- Reviewer: ChatGPT, GPT-5.6 Sol, owner-requested independent review, 2026-09-26 UTC. No stable
  session identifier is exposed to the reviewer.
- Repository/branch: `ArrokothI/arrokothi`,
  `claude/k1.2-outcome-acceptance-receipts`.
- Governing base B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
- Owner architecture decision: [decision-02](decision-02.md), commit
  `5b5fc53010e20ebbb8aa9f570ebd5216598e13be`.
- Payload C12: `2f4e64b1f51c679e2b381f9fb9800f2e290ddd30`.
- Reviewed candidate H14: `c36cbe04f7c97f198794bfede972d4861247cca0`.
- Previous review/status commit: `64af8501ff07dff70e1cfe97b48d180763979534`,
  containing [review-12](review-12.md) and [blocker-02](blocker-02.md).

Acceptance in this record binds only to exact H14 `c36cbe04f7c97f198794bfede972d4861247cca0`. It is not an integration receipt and
does not release K1.3.

## Access, independence and limits

The reviewer had authenticated GitHub repository access sufficient to inspect full pinned source,
commit ancestry, candidate ranges, the owner decision, contract, Layer-3 owner, BASELINE, tests,
ablations and immutable validation attachments.

The local shell available to this session did not have outbound GitHub/DNS access, so the repository
was not cloned for an independent execution rerun. The validation results below are therefore
**inspected pinned executions**, not reviewer reruns. Governing 006 allows review from adequate
immutable evidence when that distinction is explicit.

No implementation code or semantic document was modified during the substantive review. Native
Driver fidelity, persistence/process-death behavior and E-gate evidence remain outside K1.2's claims.

## Candidate identity, ranges and evidence

- `decision-02` is one commit after review-12's administrative head and changes only
  `decision-02.md` plus the K1.2 ledger state from BLOCKED_ARCHITECTURE to CHANGES_REQUESTED.
- C12 has sole parent `decision-02`.
- The implementation range `decision-02..C12` is exactly seven payload paths:
  the Layer-3 Outcome-acceptance owner, BASELINE, contract revision 9, coordinator,
  `outcome-partial-claim.test.ts`, `outcome-hostile.test.ts`, and `ablations.mjs`.
- H14 has sole parent C12.
- `C12..H14` contains only `implementation-14.md`, `validation-14/` attachments, and the
  K1.2 007 status-row update. No payload, evaluator, threshold, fixture or configuration change is
  hidden in H.

I independently recomputed SHA-256 for all seven C12 payload files and all ten validation-14 logs
listed in `validation-14/MANIFEST.txt`. **17/17 digests match**.

Pinned validation reports:

| Check | Inspected result |
|---|---:|
| `npm run typecheck` | pass |
| `npm test` | 2696/2696 pass |
| `npm run test:kernel` | 642/642 pass |
| `npm run test:conformance` | 1945/1945 pass |
| `npm run test:sdk` | 22/22 pass |
| `npm run test:evals` | 12/12 pass |
| `npm run check:builder-docs` | pass; 72 Markdown files, 1786 links/anchors |
| packet ablations | 36/36 rejected; control 642/642 |
| unchanged review-11 probe | 8/8 expected `stale_exchange`; accepted state unchanged |

## Architecture-decision closure

### K12-R13-ARCH-01 — CLOSED

Decision-02 supplies the missing authority requested by blocker-02 and gives a total rule:

1. scope;
2. replay/conflict only when `activationId` is well formed;
3. terminal fence;
4. exchange currency independently across Activation identity, writer epoch and base revision,
   using only Kernel state and well-formed coordinates;
5. submission authority;
6. content, where missing/malformed/unobservable coordinates are diagnosed.

The implementation follows that rule directly.

A malformed or unobservable Activation identity no longer returns early. It cannot address the
accepted-Outcome map, does not block the terminal fence, does not itself establish staleness, and
does not suppress a well-formed stale epoch/base coordinate. If the proposal survives exchange
currency, the current grant is checked before the identity diagnostic can determine, return or be
retained as the refusal. Once authority succeeds, the identity issue joins the ordinary content
issues.

The decision's distinguishing schedules are covered across missing, numeric, object and throwing
identities, terminal/no-exchange/stale/current states, current/retired/forged/absent grants and
valid/invalid content. B17-B20 independently reject: the old early return, malformed identity treated
as a wrong exchange, identity diagnostics before authority, and rendering the malformed identity in
a pre-content refusal.

### K12-R13-DOC-01 — CLOSED

The canonical owner and DEC-2 now state the actual eager-capture guarantee: capture may compute
content diagnostics internally for DEC-10 single observation, but before submission authority
succeeds those diagnostics do not determine the refusal and are neither returned nor retained.
The coordinator preserves eager capture and implements the stated observable order.

### K12-R13-REC-01 — CLOSED

The active contract is revision 9 and records the revision history: revision 8 names C11's
per-coordinate currency change; revision 9 applies decision-02. Contract, implementation-14 and the
007 candidate row agree.

### K12-R11-ORDER-01 — closure preserved

C12 leaves the C11 independent epoch/base representation intact. The unchanged review-11 probe still
returns 8/8 `stale_exchange`, and B15/B16 remain rejected. The unblock did not regress the
repeatedly corrected currency/authority subsystem.

## Independent obligation assessment

| Criterion | Verdict | Independent assessment |
|---|---|---|
| C1 | PASS | Scope precedes proposal observation beyond `executionId`; hidden remains indistinguishable from missing |
| C2 | PASS | Well-formed accepted identity replays/conflicts before fresh validation; unusable identity addresses no accepted Outcome and follows fresh ordering |
| C3 | PASS | Whole-envelope refusal, terminal/currency/authority/content order, per-coordinate identity/epoch/base classification, limits/capacity and no-retry behavior are coherent and distinguished |
| C4 | PASS | Whole-batch acknowledgment, progress revision and accepted records remain atomic with one writer |
| C5 | PASS | continue/complete/fail, next exchange and terminal non-reopening behavior hold |
| C6 | PASS | B-5 terminal dispositions and terminal ingress remain in the same accepted decision |
| C7 | PASS | Effects, unsupported obligations and await remain whole-proposal refusals |
| C8 | PASS | Takeover, epoch fencing, grant replacement/lifetime and reentrancy remain intact |
| C9 | PASS | Code-unavailable recovery hold semantics and permitted actions remain intact |
| C10 | PASS | Protocol-failure hold and authority-before-content semantics remain intact, including malformed identity |
| C11 | PASS | Late reports and late Outcomes preserve exact attribution/replay/conflict behavior |
| C12 | PASS | Receipts, refusal evidence, immutability, contiguity and nondisclosure remain intact |
| C13 | PASS | Single observation survives the decision-02 change; hostile tests exercise missing/non-text/throwing identity while every other field is still captured once |
| C14 | PASS | Kernel landing-zone/inventory evidence remains green |
| C15 | PASS | One Layer-3 owner states the resolved rule; decision-02 supplies authority; contract revision 9 and BASELINE agree; no competing status rule was added to Layer 3 |

No criterion is DEFERRED.

## Distinguishing-power assessment

The new evidence is materially stronger than a green suite alone.

- B17 restores the pre-decision early malformed-identity return and is rejected.
- B18 makes malformed identity act like a wrong Activation and is rejected.
- B19 moves identity diagnostic classification before submission authority and is rejected.
- B20 renders the malformed identity in a pre-content refusal and is rejected.
- B12/B13 still distinguish authority-before-content and capacity-after-authority.
- B15/B16 still distinguish both halves of the R11 per-coordinate currency rule.
- The unchanged R11 probe independently exercises the original eight counterexamples.

This is sufficient distinguishing evidence for the architecture change and its interaction with the
previous correction family.

## Non-blocking observations

1. The contract's closed OPEN-5 subsection intentionally preserves the old wording after explicitly
   labeling it “Record of the pre-decision state follows.” Inside that historical paragraph the old
   present-tense phrases (“current binding behavior”, “awaits an owner decision”) can still be
   momentarily confusing. This is editorial P3 only because the subsection is explicitly marked
   closed and the live rule is unambiguous in decision-02, DEC-2 and the Layer-3 owner. Rephrase or
   move it to a history note during integration cleanup if desired.
2. The carried 007 introductory prose still describes only the first three K1.2 candidates. This is
   administrative P3 cleanup and does not affect candidate identity or acceptance.

Neither observation weakens a criterion or requires a new payload before acceptance.

## Prior findings

- K12-R13-ARCH-01: **closed** by owner decision-02 and C12.
- K12-R13-DOC-01: **closed**.
- K12-R13-REC-01: **closed**.
- K12-R11-ORDER-01: **closed and preserved**.
- K12-R10-EVID-01, K12-R10-VAL-01, K12-R9-ORDER-01, K12-R9-EVID-01,
  K12-R8-DOC-01, K12-R7-PROC-01, K12-R6-* and R1-R5: prior closures stand; the cumulative
  suites/ablations give no contrary evidence.

## Verdict

K1.2 candidate H14 `c36cbe04f7c97f198794bfede972d4861247cca0` over payload C12 `2f4e64b1f51c679e2b381f9fb9800f2e290ddd30` and base
`a20d278185eaffc7f8b7489345a3624231ff6e6d` satisfies K1.2 C1-C15. The review-12 architecture blocker is resolved by owner decision-02,
its implementation matches the authorized semantics, the previous currency/authority correction is
preserved, and the immutable evidence is internally verified.

Acceptance is for exact H14 only. No integration is performed here. No K1.3 release is granted here.

**ACCEPT**
