# Independent review — K1.2, review 09 (round-10 candidate H10)

## Identity

- Reviewer: Claude Code desktop session, model Claude Opus 5.5 (`claude-opus-5-5`), 2026-09-25.
  Owner-launched independent review; not an implementer session.
- Governing process baseline and base B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`
  (006/007/008/012 unchanged B..H; verified by `git diff --stat`).
- Payload C8: `61059a3e43d7057de9be29f101a65ebed9416ae2`.
- Reviewed candidate H10: `4f3c25f6f1b4927fb9f20a23318a598113139062`
  (`K1.2 H10: correct C8 range accounting with verified file list`).
- Previous report-bearing H9: `08fd9162617315f1cbc7fa7682a0fc5f0bed28d3`; previous review record:
  `review-08-merged.md` (reviewed H8 `ad4a0e8b4bcfa5e3064a53024fe49ae3d63f38c7`).
- Contract: `work/K1.2/contract.md` revision 7 (blob `6c3ea57275fd850f5eaa1a55206595b0a2b6875a` at H).
- Owner decision in force: `work/K1.2/decision-01.md` (carrier extension, 2026-09-25).
- Branch `claude/k1.2-outcome-acceptance-receipts`. `git ls-remote` advertises
  `4f3c25f6f1b4927fb9f20a23318a598113139062` for the branch; remote `main` = B.
- Prerequisites verified as ancestors of B: K1.1 H `52b1600f…`, integration `b53ccb48…`;
  K1.1-correction-02 H `719abbf9…`, integration `954d31b0…`.

## Access, independence and limits

- Full local checkout at exact H (clean before and after every run), complete Git history, shell,
  Node v25.2.1 on darwin. No GitHub PR or CI was used. The external handoff text named in
  implementation-10 was not supplied to me; nothing below depends on it (the exact-H10 documentation
  gate was rerun here).
- **Independence disclosure.** This session shares a memory store with earlier Claude Opus 5.5
  sessions on this repository. By that memory, an earlier session wrote review 06 and drafted the
  `execution-cycle.md#submission-authority` rewrite that the owner committed as `31ad130`
  (`mental-model-fix`, git author the owner). That is a correlated-assumption risk for the Layer-3
  portion of this review. The findings below concern the implementation and its evidence, measured
  against that text, not the text itself. The owner may want a second reviewer for Layer 3 if the
  correlation matters to them.

## Independently rerun on exact H10 (clean tree)

| Command | Result | Log digest (sha256, reviewer scratch) |
|---|---|---|
| `npm run typecheck` | exit 0 | `a2051020…84be` |
| `npm test` | exit 0; 2,504 tests, 2,504 pass, 0 fail/cancelled/skipped/todo | `df9b3bad…ed75` |
| `npm run test:kernel` | exit 0; 450/450 | `08e8af53…1ab1` |
| `npm run test:conformance` | exit 0; 1,945/1,945 | `ddf373b6…c15e` |
| `npm run test:sdk` | exit 0; 22/22 | `998cbbe0…b28c` |
| `npm run check:builder-docs` | exit 0; 72 Markdown files, 1,785 local links/anchors, 38 imports | `38e421ba…47b5` |
| `node docs/development/work/K1.2/ablations.mjs` | control 450/450; 27/27 rejected; B10 448/2, B11 449/1 | `c8c60d73…8203` |
| `node docs/development/work/K1.2/checks-07.mjs` | 8/8 PASS | — |
| Reviewer probes `review-09/probe-order.ts`, `review-09/probe-race.ts` | see findings and coverage | attached |
| Reviewer ablations `review-09/ablations-reviewer.mjs` (packet runner, new spans) | control 450/450; 11/12 rejected; **R1 survived** | `5b70f26f…c0db` |

Inspected, not rerun: `validation-08/*`, `validation-09/*` (C8 evidence), prior reviews 01–08,
implementation reports 01–10, `submission-audit-06.md`, `blocker-01.md`, `decision-01.md`.
`npm run test:evals` not run (no Agent/model path; contract exclusion accepted).

## Identity and scope checks

- C8..H10 is exactly 25 paths: `007-work-packets.md` plus 24 files under `work/K1.2/`
  (implementation-08/09/10, review-08-merged, validation-08/01..10, validation-09/01..10). The 007
  change over C8..H10 is the single K1.2 status row. H9..H10 touches only `implementation-10.md` and
  that row. No payload in the C..H range. **K12-R8-DOC-01's required outcome is met on exact H10.**
- C8 and H10 carry byte-identical payload (source, tests, scripts, contract, Layer 3).
- Runtime source is unchanged since H5 (`checks-07`). Every behavior below has therefore existed
  since round 5, and most since round 4.

## Independent coverage (derived before reading the report)

Sources: `execution-cycle.md` (Before sending, Submission authority, Delivery reporting,
Retry versus takeover, Outcome acceptance), `identity.md` (Runtime attempt, Writer epoch, Dispatch and
delivery, Receipt), `core.md` (Outcome, Batch/acknowledgment/terminal disposition), `lifecycle.md`,
`state.md` (Recovery-held, History), `recovery.md`, `evidence.md`, `creation.md` (terminal
destination), WS OA-1–OA-6, ID-3/4/9, B-3/B-5, CX-3, EF-1/2, PC-4/5, the 007 seed, and contract C1–C15.

| Obligation | Distinguishing schedule | Expected / forbidden | Evidence and result |
|---|---|---|---|
| OA-1 scope first on all four surfaces | hidden vs missing; read-counting envelope | identical `unknown_destination`, position 0, no read past `executionId` | source trace `coordinator.ts:1359-1362, 1500-1503, 1666-1669, 1747-1750`; suite. Holds |
| OA-2 replay/conflict before fresh validation, no grant needed | replay with `undefined` grant after `complete`; changed epoch; invalid content | same receipt object; `duplicate_conflict` | probe P5; ablations A2, R3, R7 rejected. Holds |
| Step-3 order: exchange → authority → content | grant-less current proposal with bad content; grant-less proposal with malformed claim + bad content | `unauthorized_submission`, content never examined for a non-entitled attempt | P1 holds; **P2 fails (K12-R9-ORDER-01)**; **R1 survives (K12-R9-EVID-01)** |
| Currency before authority | retired grant + old coords; retired grant + current coords; forged | stale; unauthorized; unauthorized | suite; R2 rejected; P7. Holds |
| Grant lifetime: mint, deliver, redeliver, takeover, next exchange, cross-Execution | saved references across all transitions | same across redelivery; replaced at takeover; new per exchange; foreign grant useless | P3, P4, P7; B10, B11, R5, R12 rejected. Holds |
| Grant never disclosed | views, answers, refusals, Activation | no reference reachable | source (`DispatchAccepted`, `TakeoverAccepted`, `RecoveryDecision`, views); suite `containsReference`. Holds |
| OA-4/B-3 atomic whole-batch commit | queued non-batch Event; progress claiming refusals | batch acked only; progress opaque | suite; A1, R10 rejected. Holds |
| B-5 and live terminal ingress | `fail` with a queued outside Event; retry/changed/new input after | terminal disposition in the decision; replay with terminal disposition; conflict; `terminal_destination`, not queued | probe P6. Holds |
| Takeover (ID-3/4/9, DEC-14/15/19) | control vs observer; unsafe Driver; nested reentry; repeat | epoch+1 once, same Activation/batch, dispatch receipt | suite; A4, A5, B1, B6 rejected. Holds |
| Holds (PC-4/5, OA-6) | code/protocol/both; stale report; valid Outcome ends holds | RUNNING, no revision, permitted actions predict controls | suite; A9, A10, B3, R8, R11 rejected. Holds |
| Late reports and Outcomes (C11) | epoch-1 report after takeover and after resolution | only own row changes | probe P7. Holds |
| DEC-10 reentrancy during capture | getter takes over, or resolves the exchange with another Outcome | outer `stale_exchange` / `duplicate_conflict`; single commit | `probe-race.ts`. Holds |
| Layer-3 conventions | single owner, status, open choices, §5 inferences 1–7/13/26/28 | one bold definition; gate naming only; `OPEN(K3.2)` in prose + §4 | grep + overlap check (no pair ≥ 0.45). Holds |

Reconciliation with the report: implementation-10 and review-08-merged carry C1–C14 as PASS by
reference. My map adds three things they lack: the grant-less × malformed-claim arm, the inverse-order
ablation R1, and a check that the refusal reason is inspectable evidence. The report's range
accounting is accurate (25 paths; see observation O2).

## Findings

### K12-R9-ORDER-01 — P2 — content is validated and recorded before submission authority when the claim is malformed

- **Where:** `packages/kernel/src/coordinator.ts:1407-1412` (claim `null` returns
  `malformed_envelope` with `explainOutcomeIssues(capture.issues)`, i.e. every content issue) precedes
  the grant check at `:1438`. BASELINE `002-implemented-kernel-baseline.md:78` states the opposite
  order.
- **Governing:** `execution-cycle.md:87` and `:93`: step 3 is exchange, then submission authority,
  then content, "so a proposal's content is examined only for the attempt entitled to make it".
  Contract K1.2-DEC-2 (`contract.md:300`): "the classification names the first failing group". Also
  DEC-20. Criteria C3 and C15.
- **Counterexample (probe P2, reproducible):** a visible caller holding no grant
  (`submission = undefined`) submits for the current Activation with `writerEpoch` omitted, progress at
  depth 40, a duplicate Emission key, and a lone-surrogate `fail` error. It gets `malformed_envelope`
  whose retained reason, readable by every inspector of the Execution, lists `progress … too_deep`,
  `emissions[1].emissionKey duplicate_key` and `next.error lone_surrogate`. The same content with
  `writerEpoch: 1` is refused `unauthorized_submission` with no content examined (P2b). Likewise
  `baseProgressRevision: -1` plus `effects: [1]` reports `effects_unsupported` to a grant-less caller
  (P2c). So whether a non-entitled submitter's content is validated and reported depends on whether
  its epoch/base numbers are well formed. The first failing group (exchange) is not what the refusal
  names. No accepted state changes; the defect is order, classification and retained evidence.
- **Required outcome:** on every path, no content validation result is produced or recorded for a
  proposal that has not passed the exchange and submission-authority steps. The refusal names the
  first failing group. BASELINE and any other description of the order agree with the code. Whether a
  malformed claim is classified in the exchange group or otherwise is the implementer's choice within
  DEC-2 and the canonical step 3; it must not surface content issues ahead of authority. If the
  implementer concludes the canonical order should instead exempt malformed claims, that is an
  architecture change for the owner, not a code choice.
- **Validation:** tests covering grant-less and forged-grant arms × well-formed and malformed claim
  (missing, fractional, negative epoch/base) × invalid content. They must assert the classification,
  the absence of content issues in the reason and retained refusal, and zero accepted-state change.
  The existing grant-holding malformed-claim tests keep passing.
- **Provenance:** new in this review. Adjacent to closed K12-R3-AUTH-02 (grant check introduced
  without re-tracing the claim-malformed branch) and K12-R6-LAYER3-01 (canonical order stated without
  tracing it into every refusal branch).

### K12-R9-EVID-01 — P2 — no test distinguishes "authority before content" at all

- **Where:** kernel suite, especially `submission-authority.test.ts`,
  `control-authority.test.ts:297-313` and `outcome-acceptance.test.ts:240-290`. Every grant-less
  case sends valid content, and every content-defect case presents the current grant.
- **Governing:** 012 deterministic execution ("include a plausible broken behavior that the oracle
  would reject"); `execution-cycle.md:93`; DEC-2/DEC-20; C3.
- **Counterexample:** reviewer ablation R1 moves the `submission !== intent.submission` block from
  `coordinator.ts:1438` to just before `return ok(this.#accept(…))`. That is content validated before
  authority, the literal inverse of the canonical clause. Result: control 450/450, R1
  **450/450 pass, SURVIVED**. The same ablation run rejects R2 (authority before currency), R3 (replay
  requires grant) and R4 (field comparison). So the suite pins only the neighbors of this clause, not
  the clause itself.
- **Required outcome:** distinguishing evidence exists for the authority-before-content clause
  (well-formed-claim arm) and for K12-R9-ORDER-01's arm. An ablation equivalent to R1 is rejected with
  a clean control, and the packet's ablation list includes it or its equivalent.
- **Provenance:** new; same subsystem as K12-R6-EVID-01 (evidence written for the given
  counterexample, not for the rule).

### Non-blocking observations (P3)

- **O1.** The 007 introductory prose (`007-work-packets.md:7-10`) still describes only the first
  three K1.2 candidates. Carried from review-08; administrative.
- **O2.** implementation-10 says "24 files at H9; H10 adds only the two files named". The C8..H10
  range is 25 distinct paths, because `007-work-packets.md` was already counted. The grouped table is
  accurate; stating the total would remove the ambiguity.
- **O3.** implementation-10 omits several 008 fields rather than saying "none"/"unchanged"
  (selected 012 methods, obligation coverage, third-party review). Administrative.
- **O4.** Carried from review-08: the `fail` wording tension between the concept prose and BASELINE's
  typed `failed` result.

## Prior findings

- K12-R8-DOC-01: **closed** on exact H10 (builder-docs exit 0; the live row links files only).
- K12-R7-PROC-01, K12-R6-DOC-01, K12-R6-EVID-01, K12-R6-LAYER3-01, K12-R6-SELF-COMMENT-01: closure
  confirmed on the unchanged payload. Rerun evidence: B10/B11 rejected; the Layer-3 single owner and
  `OPEN(K3.2)` checked. EVID-01's closure stands for grant lifetime; K12-R9-EVID-01 is a different
  clause.
- R1–R5 findings (AUTH-01, DELIVERY-01, DOC-01, HISTORY-01, HOLD-01, REC-01, OBS-PERMITTED-01,
  PROC-01, TAKEOVER-01, AUTH-02, HISTORY-02, AUTH-DOC-01, R5-PROC-01): prior closures stand by
  reference. Their mechanisms were re-exercised by the packet ablations and my probes. AUTH-02's
  closure is qualified by K12-R9-ORDER-01, which is an uncaught branch of the same check placement.

## Per-criterion verdicts

| Criterion | Verdict | Rationale |
|---|---|---|
| C1 | PASS | Scope precedes every read on all four surfaces; hidden ≡ missing; suite and source trace |
| C2 | PASS | P5; A2/R3/R7 rejected |
| C3 | **FAIL** | K12-R9-ORDER-01 (validation order on the malformed-claim path); K12-R9-EVID-01 (the order is unevidenced) |
| C4 | PASS | A1/A16/R10 rejected; suite |
| C5 | PASS | Next exchange, typed result, no reopening (P4, P6) |
| C6 | PASS | B-5 in the same decision; live terminal ingress (P6); A7/A8 rejected |
| C7 | PASS | Effects/await/obligations refused whole (A6, A11, A15) |
| C8 | PASS | Takeover, fencing, grant replacement, reentrancy (A4, A5, B6, R5; P7) |
| C9 | PASS | Code hold semantics; A9/A10/R8 rejected |
| C10 | PASS | Protocol-failure hold; stale report refused (R11); grant-less current Outcome refused |
| C11 | PASS | Late reports and Outcomes (P7; suite) |
| C12 | PASS | Receipts contiguous (B5), immutable evidence, nondisclosure suite |
| C13 | PASS | Single observation and pollution suites; DEC-10 race probes |
| C14 | PASS | Landing-zone guard and inventory (13 files); DX-4 disposition |
| C15 | **FAIL** | Consequence of K12-R9-ORDER-01: BASELINE `#outcome-acceptance-api` (line 78) describes an order the code does not follow on that path. Layer-3 conventions otherwise hold; the documentation gate passes |

No criterion is DEFERRED.

## Verdict and status text for transcription

K1.2 candidate H10 `4f3c25f6f1b4927fb9f20a23318a598113139062` (payload C8
`61059a3e43d7057de9be29f101a65ebed9416ae2`, base `a20d278185eaffc7f8b7489345a3624231ff6e6d`) is not
accepted. K12-R8-DOC-01 is closed. Two new P2 findings in the Outcome-submission authority ordering
remain: K12-R9-ORDER-01 and K12-R9-EVID-01. Status: CHANGES_REQUESTED. No K1.3 release.

## Compact correction handoff

```text
Correct the same released packet K1.2 on claude/k1.2-outcome-acceptance-receipts.
Base a20d278185eaffc7f8b7489345a3624231ff6e6d; reviewed H 4f3c25f6f1b4927fb9f20a23318a598113139062;
review record docs/development/work/K1.2/review-09.md.
Open findings K12-R9-ORDER-01, K12-R9-EVID-01; required outcomes and counterexamples are in that record.
Owner supplemental decisions: decision-01 (carrier) only; unresolved authority: none.
Apply 006 and 012: the Outcome-submission refusal order is a semantic subsystem already corrected in
rounds 1, 3, 4 and 6. Reconstruct it whole: enumerate every refusal branch of submitOutcome against
execution-cycle step 3 and DEC-2 (grant present/absent/forged/retired × claim well-formed/malformed ×
content valid/invalid × exchange current/stale/terminal), and give each ordering clause a
distinguishing test and ablation. Then re-review the whole cumulative packet. Record why earlier
passes missed the branch. Fix additional in-scope defects with separate provenance.
Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.
```

CHANGES REQUIRED
