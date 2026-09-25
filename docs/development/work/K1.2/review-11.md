# Independent review — K1.2, review 11 (round-12 candidate H12)

## Identity

- Reviewer: Claude Code cloud session `session_01Yc5w8rkvteJXzWeeyFFCws`; session model and last
  served model both `claude-opus-5-5` (read from the session record), 2026-09-25. Owner-launched
  independent review (Prompt B); not an implementer session.
- Repository/branch: `ArrokothI/arrokothi`, `claude/k1.2-outcome-acceptance-receipts`.
- Governing process baseline and base B: `a20d278185eaffc7f8b7489345a3624231ff6e6d` (remote `main`).
  006/007/008/009/012 are unchanged B..H except the K1.2 status row and 007's intro prose; this
  candidate changes no process rule.
- Payload C10: `b1c2e3bdad1ab9352e8a95307593cce654bc3e3c`.
- Reviewed candidate H12: `9655d12cf583967eff08582d175ed8beb5e2506e`. `git ls-remote` advertises
  exactly this SHA for the branch.
- Previous candidate H11 `870720c9731b6e72da55c616c06bf0f3187f6cee`; previous review record
  [review-10](review-10.md) at `35e8c9eac24338064c48963189e0d07998004bee`.
- Contract: [contract.md](contract.md) revision 7 as of C10 (sha256 `3cefba98…6310b69f`).
  Owner decision in force: [decision-01](decision-01.md). Release: 007 row and hold-lift note.
- Prerequisites: K1.1 integration `b53ccb48…`, K1.1-correction-02 H `719abbf9…` and integration
  `954d31b0…` are ancestors of B.

## Access, independence and limits

- Full clone of the branch with shell, Node v22.22.2, npm 10.9.7, TypeScript 5.9.3, Linux x86_64.
  The clone is shallow: K1.1's accepted H `52b1600f…` is not present locally, so its ancestry was
  checked through its integration commit only.
- Independence: this session shares a model family with the round-1 implementer and with the
  review-09 reviewer. It has no memory store and no prior context on this repository. I read
  implementation-12's identity and correction-delta sections first, to learn C/H. I derived the
  obligation map below from the canonical owners before reading the code, prior coverage tables or
  implementation-12's coverage claims. The finding below lies outside the report's coverage.
- The implementer's external handoff for the exact-H12 documentation gate was not supplied to me.
  I reran that gate on exact H12 instead.
- Not examined: native Driver fidelity, persistence and process death, and E-gate evidence. None is
  claimed by the contract. I spot-checked the nondisclosure suite's oracles through ablations A3/A12
  and my own probes rather than re-deriving every arm.

## Evidence identities

- C10..H12 is exactly 15 paths: `implementation-12.md`, the 13 `validation-12/` files, and the K1.2
  row of `007-work-packets.md`. No payload is in H. `35e8c9e..C10` is exactly the three declared
  payload paths. The fixture bytes changed from a raw `0x01` to the escape `\ud800` at
  `submission-authority.test.ts:426,487`.
- `validation-12/MANIFEST.txt`: I recomputed all 12 evidence-file digests and all 12 C10 payload
  digests (`git show C10:<path> | sha256sum`). Every one matches.

Reruns, independent of the implementer's logs, on exact H12 in a clean detached worktree after
`npm ci` (porcelain empty before and after):

| Command | Result | Scratch log sha256 (prefix) |
|---|---|---|
| `npm run typecheck` | exit 0 | `a2c9b592ac2f` |
| `npm test` | exit 1: 2,511 tests, 2,509 pass, 0 fail, **2 cancelled** | `449303d907e1` |
| `npm run test:kernel` | exit 0; 457/457 | `9eda2044aad4` |
| `npm run test:conformance` | 1,945 tests: 1,943 pass, 2 cancelled, 0 fail | — |
| `npm run test:sdk` | exit 0; 22/22 | — |
| `npm run check:builder-docs` | exit 0; 72 files, 1,785 links/anchors, 38 imports (exact-H12 gate) | `675d1cb7e8d5` |
| `npm run test:evals` | exit 0; 12/12 | `a6fe7c7620a6` |
| `node docs/development/work/K1.2/ablations.mjs` | control 457/457; 30/30 rejected | `09e3ea29ad56` |
| `review-09/ablations-reviewer.mjs` | control 457/457; 11/12 rejected, R2 not applicable (span superseded) | `82e8d913f9aa` |
| `review-09/probe-order.ts`, `probe-race.ts` (import paths rewritten only) | P1–P7 and race results as implementation-12 reports | — |
| Lint-clean narrow B14 (reviewer variant, below) | rejected by exactly one test: Case C | — |
| `review-11/probe-partial-claim.ts` | exit 1; 7 of 8 arms misclassified (K12-R11-ORDER-01) | file sha256 `4dbb11d2…f528e7` |

The two cancellations are `tests/conformance/effects/fast-slow-equivalence.test.ts` cases 6 and 7
("Promise resolution is still pending but the event loop has already resolved"). The same two cancel
identically at base B on this Node. B..H changes neither that file, `packages/core` nor the
lockfile. This is the retained historical Node 22 limitation, not a K1.2 regression. The
implementer's Node v25.2.1 logs show them passing.

## Independent obligation/interaction coverage

Sources: `execution-cycle.md` (before sending, submission authority, delivery reporting, retry
versus takeover, Outcome acceptance), `identity.md` (runtime attempt, writer epoch, dispatch and
delivery, receipt), `core.md` (Outcome, mailbox, batch/acknowledgment/terminal disposition),
`lifecycle.md`, `output.md`, `actions.md` (Emission), `state.md` (progress, recovery-held,
History), `recovery.md`, `evidence.md`, `values.md`, rewrite-index §4/§5, the 007 seed, contract
C1–C15 and DEC-1–20.

| Obligation | Distinguishing schedule | Expected / forbidden | Evidence and result |
|---|---|---|---|
| OA-1 scope before content | outsider, hidden vs missing, Proxy counting reads | identical `unknown_destination`, position 0, zero reads past `executionId` | probe R6; suite. Holds |
| OA-2 replay/conflict before fresh validation, no grant | replay after next dispatch and after `complete`; changed epoch/content; reentrant nested acceptance | same receipt; `duplicate_conflict`; new exchange untouched | probes R1c/d, R2a/b, R3; A2, R3, R7. Holds |
| Step 3: stale whatever authority; unauthorized only when current | retired/absent/current grant × claim {well-formed stale, **partially malformed with a stale well-formed half**, fully malformed} | superseded or not-yet-issued attempt → `stale_exchange` | well-formed and fully malformed hold (Case D, probes P2/Q1a). **Partially malformed fails (K12-R11-ORDER-01)** |
| Authority before content | grant-less current proposal × invalid content × malformed claim | `unauthorized_submission`, no content diagnostics returned or retained | P1/P2; B12, B13, R1. Holds |
| Entitled attempt reaches content | current grant, malformed claim, deep + duplicate + `\ud800` | `malformed_envelope` naming claim and content defects | Case C; lint-clean narrow B14 rejected only by Case C. Holds |
| OA-4/B-3 atomic whole-batch commit, one writer | batch plus a queued Event outside it; progress claiming refusals; second Outcome | batch only acked; progress opaque; conflict | A1, A16, R10; probe R2. Holds |
| Next exchange after `continue` | queued input across exchanges | new Activation ID, newly selected batch, base = accepted revision, progress carried, epoch 1 | probe R2. Holds |
| B-5 and live terminal ingress | `fail` with three queued Events at bound 1; new, retried and changed input afterwards | batch acked, rest terminal in the same decision; refused and not queued; replay with terminal disposition; conflict | probe R5; A7, A8. Holds |
| Terminal never reopens | dispatch, redeliver, takeover, new Outcome after `complete` | all refused, state unchanged | probe R1. Holds; see observation O6 on classification order |
| Effects, obligations, waits | Effect-bearing, `await`, unknown fields | whole refusal, no Effect record, exchange open | suite; A6, A11, A15. Holds |
| Takeover and fencing | reentrant takeover inside `deliver`; retired grant; repeat takeover | epoch + 1 once; old epoch stale; dispatch answer describes its own attempt | probe R7; A4, A5, B6, R5. Holds |
| Grant lifetime and non-disclosure | save references across redelivery, takeover, next exchange, other Execution; deep-search views and answers | same across redelivery; replaced at takeover; new per exchange; never reachable from views or answers | probe R4; B10, B11, R12; P3/P4. Holds |
| Holds, permitted actions, History | code/protocol/both; stale report; Outcome ends holds | RUNNING, no revision; permitted list predicts controls; authority attribution | suite; A9, A10, B2, B3, B7, B9, R8, R11. Holds |
| Late reports and late Outcomes | reports after resolution, takeover and end; late Outcome while B open | only own row; replay or conflict; B untouched | suite; probe R2. Holds |
| Receipts, immutability, nondisclosure | refusals, replays and redeliveries between acceptances; hidden-scope activity | contiguous per-Execution positions; frozen evidence; no cross-scope observable | suite; B5, A3, A12. Holds |
| Single observation and pollution | getters, reentrancy, polluted builtins | one read per field; decision unaffected | suite; A13; probe R3; race probe. Holds |
| Structure and inventory | import graph, 13 zone files, DX-4 | no violation; inventory matches | conformance suite. Holds |
| Layer 3 as payload | single owner, no status, open choices, §5 items 1–7/13/26/28 | one definition; gate naming only; `OPEN(K3.2)` in prose and §4 | diff read; link check. Holds, except C15 consequence below |

Reconciliation with implementation-12: its coverage matrix and B14 evidence are accurate for the
cases it lists. It does not cover a claim with one well-formed and one malformed number. That is the
branch where the C9 "any malformed claim skips currency" rule contradicts the canonical
stale-whatever-authority rule. The B14 mutation spelled with `.filter(` is partly rejected by the
zone's static text rule, not only by oracles. My lint-clean narrow variant (filter only on the
`claim === null` path, index loop) is rejected by exactly Case C, so the K12-R10-EVID-01 correction
does distinguish the intended broken behavior.

## Findings

### K12-R11-ORDER-01 — P2 — a stale proposal with one malformed claim number is not refused as stale

- **Where:** `packages/kernel/src/outcome.ts` `captureOutcome` (the claim is `null` whenever either
  number is malformed), and `packages/kernel/src/coordinator.ts:1416-1439` (currency checks run
  only when `claim !== null`) before the grant check at `:1446`. BASELINE
  `002-implemented-kernel-baseline.md#outcome-acceptance-api` describes currency before the grant
  without this exception. Neither the contract nor BASELINE records the malformed-claim routing;
  only a code comment does.
- **Governing:** `execution-cycle.md#outcome-acceptance` step 3: "A proposal that no longer answers
  the current exchange is refused as stale whatever authority it presents; only a current proposal
  without the current authority is refused as unauthorized." The same page's rationale: "exchange
  currency is checked before submission authority so a superseded attempt is refused as stale."
  Contract C3 (`stale_exchange` otherwise), C8 ("its Outcome is `stale_exchange` with no staleness
  window") and DEC-2 ("the classification names the first failing group … a submission that no
  longer answers the current exchange is told so first").
- **Counterexample** (`review-11/probe-partial-claim.ts`, exit 1). After an accepted takeover, the
  current exchange is epoch 2, base 0:
  - The superseded attempt submits `writerEpoch: 1` with `baseProgressRevision` missing or `-1`,
    presenting its retired grant. It is refused `unauthorized_submission`, with the reason "presents
    no submission authority for the current attempt at writer epoch 2". The same envelope with a
    well-formed base is `stale_exchange`.
  - The current grant holder sends the same stale epoch with the base missing. It gets
    `malformed_envelope` about the base, never learning it named a superseded epoch.
  - A not-yet-issued epoch 5 with the base missing, and a missing epoch with a stale base 7, are
    likewise `unauthorized_submission` or `malformed_envelope`.

  No accepted state changes. The defect is classification and retained evidence: a superseded
  attempt is recorded as an authority failure, exactly the conflation the canonical order exists to
  prevent.
- **Adjacent branch to settle in the same pass (observation O6):** an Outcome for a terminal
  Execution with a non-text `activationId` is `malformed_envelope`, not `terminal_destination`
  (probe R1a). The identity is validated before the replay lookup and therefore before the terminal
  check. DEC-2 does not say whether a malformed identity or claim part belongs to the exchange
  group or the content group.
- **Required outcome:** one explicit, total classification rule over every combination of the
  envelope's claim — Activation identity, epoch and base, each missing/malformed, current, stale or
  not-yet-issued — crossed with grant state (current, retired, forged, absent) and content state.
  That rule must agree with the canonical step 3: whenever the envelope's well-formed coordinates
  show that it does not answer the current exchange, it is refused as stale whatever it presents.
  It must also keep K12-R9-ORDER-01's outcome: no content diagnostic is produced, returned or
  retained before authority succeeds. State the rule where DEC-2 and BASELINE state the order, so
  code, contract and BASELINE agree. If the implementer concludes that the canonical text should
  instead treat a partially malformed claim as not naming any attempt, that is an owner decision on
  Layer 3, not a code choice.
- **Validation:** table-driven tests over that matrix. Each asserts classification, the absence of
  content diagnostics in returned and retained reasons, and zero accepted-state change. Add a
  distinguishing mutation equivalent to the current "skip all currency when either number is
  malformed" behavior, with a clean control. The existing Case B/C/D tests keep passing.
- **Provenance:** new in this review. Same subsystem as K12-R3-AUTH-02, K12-R6-LAYER3-01 and
  K12-R9-ORDER-01. The C9 correction fixed the fully malformed claim but treated the claim as
  atomic, so a well-formed stale half lost its currency check. 006 therefore requires
  reconstructing this classification subsystem, not patching the one arm.

### Non-blocking observations (P3)

- **O1** (carried): 007's intro prose still says only the first three K1.2 candidates were reviewed.
- **O2** (carried from review-09 O3): implementation-12 omits 008 fields rather than saying
  "none" or "not run": selected 012 methods, third-party review, and checks not run (`test:evals`,
  Node 22).
- **O3:** C10 changed a contract coverage row, but the contract still says revision 7.
- **O4:** the retained payload script `checks-07.mjs` now fails at C10 on superseded pins.
  `validation-12/11` explains this. Marking it historical, or retiring it, would avoid a future
  reader treating the failure as a regression.
- **O5** (carried from review-09 O4): `core.md` says `fail` ends "without a result", while BASELINE
  and C5 record a typed `failed` terminal result carrying the error.
- **O6:** see the adjacent branch under K12-R11-ORDER-01.

## Prior findings

- `K12-R10-EVID-01`: **closed.** The fixture is a genuine lone surrogate (byte-verified). Case C
  asserts four concrete diagnostics plus retained equality, and B14 is rejected. My lint-clean
  narrow B14 is rejected by Case C alone. Implementation-12 corrects implementation-11's overclaims.
- `K12-R10-VAL-01`: **closed.** `validation-12/` holds raw C10 output with a manifest. Every digest
  was recomputed and matches, and my H12 reruns agree apart from the pre-existing Node 22
  cancellations.
- `K12-R9-ORDER-01`: its counterexample (a fully malformed claim leaking content) stays closed; the
  P2/P2b/P2c probes rerun `unauthorized_submission` with no content. The same check placement has a
  further uncovered branch, recorded as K12-R11-ORDER-01.
- `K12-R9-EVID-01`: **closed** (R1 rejected; B12/B13 in the packet list).
- `K12-R8-DOC-01`, `K12-R7-PROC-01`, `K12-R6-DOC-01`, `K12-R6-EVID-01`, `K12-R6-LAYER3-01` and the
  R1–R5 findings: prior closures stand by reference. Their mechanisms were re-exercised by the 30
  packet ablations, the reviewer ablations and my probes.

## Per-criterion verdicts

| Criterion | Verdict | Rationale |
|---|---|---|
| C1 | PASS | Scope precedes every read on all four surfaces; hidden ≡ missing (probe R6; suite) |
| C2 | PASS | Replay/conflict before terminal and currency, without a grant (R1c/d, R2a/b, R3; A2/R3/R7) |
| C3 | **FAIL** | K12-R11-ORDER-01: a proposal whose well-formed epoch or base is stale is not refused `stale_exchange` when the other number is malformed. E-6 matrix, content, capacity and OA-5 otherwise hold |
| C4 | PASS | Whole-batch acknowledgment, opaque progress, one writer (A1/A16/R10; probe R2) |
| C5 | PASS | Next exchange shape, typed result, terminal never reopens (R1, R2, R5) |
| C6 | PASS | B-5 in the same decision; live terminal ingress (R5; A7/A8) |
| C7 | PASS | Effects, obligations and `await` refused whole (A6/A11/A15; P1b/P1c) |
| C8 | **FAIL** | K12-R11-ORDER-01: the superseded epoch's Outcome is `unauthorized_submission`, not `stale_exchange`, when its base is malformed. Fencing, epoch advance, grant replacement and reentrancy otherwise hold (R7; A4/A5/B6/R5) |
| C9 | PASS | Code hold: RUNNING, no revision, permitted actions, clearing (A9/A10/R8; suite) |
| C10 | PASS | Protocol-failure hold, stale report refused, takeover or Outcome ends it (R11; suite) |
| C11 | PASS | Late reports settle only their row; late Outcomes replay or conflict (probe R2; suite) |
| C12 | PASS | Own receipts, contiguous positions, frozen evidence, nondisclosure (B5/A3/A12; suite) |
| C13 | PASS | Own-field single observation, pollution, reentrancy (A13; R3; race probe) |
| C14 | PASS | Landing-zone guard and 13-file inventory; DX-4 disposition |
| C15 | **FAIL** | Consequence of K12-R11-ORDER-01: BASELINE's stated order is not what the code does for partially malformed claims, and the malformed-claim routing is recorded nowhere but a code comment. Layer-3 single ownership, status and open-choice conventions otherwise hold |

No criterion is DEFERRED.

## Verdict and status text for transcription

K1.2 candidate H12 `9655d12cf583967eff08582d175ed8beb5e2506e` (payload C10
`b1c2e3bdad1ab9352e8a95307593cce654bc3e3c`, base `a20d278185eaffc7f8b7489345a3624231ff6e6d`) is not
accepted. K12-R10-EVID-01, K12-R10-VAL-01 and K12-R9-EVID-01 are closed. A new P2 finding,
K12-R11-ORDER-01, shows that a stale proposal with one malformed claim number is classified as
unauthorized or malformed rather than stale. Status: CHANGES_REQUESTED. No integration. No K1.3
release.

## Compact correction handoff

```text
Correct the same released packet K1.2 on claude/k1.2-outcome-acceptance-receipts.
Base a20d278185eaffc7f8b7489345a3624231ff6e6d; reviewed H 9655d12cf583967eff08582d175ed8beb5e2506e;
review record docs/development/work/K1.2/review-11.md (with review-11/probe-partial-claim.ts).
Open findings K12-R11-ORDER-01; required outcomes and counterexamples are in that record.
Owner supplemental decisions decision-01.md; unresolved authority none, unless the correction
concludes the canonical step-3 text itself must change, which is an owner decision.
Apply 006 and 012: close the affected semantic subsystem and its dependencies, then re-review the
whole cumulative packet. Fix additional in-scope defects with separate provenance.
Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.
```

CHANGES REQUIRED
