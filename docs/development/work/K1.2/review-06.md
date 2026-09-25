# Independent review — K1.2 Outcome acceptance and receipts, review 06

## Identity

- Reviewer: Claude Code desktop session acting under Prompt B (independent reviewer). Model: Claude
  Opus 5.5 (`claude-opus-5-5`). Date: 2026-09-25.
- **Independence disclosure.** The contract records the round-1/2 implementer as "Claude Code session
  (Claude Opus 5.5)", which is the same model as this reviewer. This session's local auto-memory also
  holds notes written by earlier Claude sessions, including one by the round-1 implementer. None of
  those notes was used as evidence. Every claim below was re-derived from the pinned repository and
  from reruns. The owner may still weigh the correlated-assumption risk.
- Governing process/reference baseline B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`. This equals
  `origin/main` at review time. AGENTS.md, the mental model, the development front door and
  006/007/008/012 were read at B, together with the candidate's Layer-3 edits.
- Prerequisites, verified as ancestors of B: K1.1 accepted H `52b1600f3b42e3a360fdc3395178f1d147edf304`
  and integrated `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`; K1.1-correction-02 accepted H
  `719abbf9e55e7489b6255a08cbb9e97a1e960a5e` and integrated `954d31b00eb7f2412c22ccf7d4d079699f0c4032`.
- Release: owner release 2026-09-16, hold lifted 2026-09-24 with the B-5 amendment (007 header and
  seed).
- Contract: `docs/development/work/K1.2/contract.md`, revision 5, unchanged after C5.
- Round-5 payload C5: `aa8709673e6d53455f226d0fc01bdca6fb55e600`. Report-bearing H5:
  `d13a82881c5fa11aa8fc48eff83a9472eef595a6`. The C5..H5 files are exactly `implementation-05.md`,
  `validation-05/01..10` and the K1.2 row of 007.
- Branch `claude/k1.2-outcome-acceptance-receipts`. Local and remote head:
  `cbf3bdf5c814fe544d61038ec3b273426dddff00` (checked with `git fetch`). The post-H5 commits are:
  - `f0de303f2ad20423debef9e88a83436df6a35110`, which adds `mental-model/concepts/operations.rewrite.md`
    and `roles.rewrite.md`;
  - `8ae4cd336e5e4be73235962100f88ee622d74d70`, the owner's round-5 review record and 007 row;
  - `cbf3bdf5c814fe544d61038ec3b273426dddff00`, the owner's "clean-rewrite", which deletes the same
    two drafts.
- Net post-H state: `git diff d13a828 cbf3bdf` is only `review-05-merged.md` (added) and the K1.2
  row of 007. `git diff aa87096 cbf3bdf`, excluding `docs/development/work` and 007, is empty. The
  payload tree at the branch head is therefore byte-identical to C5.
- **No round-6 report, C6 or H6 exists**, and 007 still reads CHANGES_REQUESTED. This review
  therefore covers the cumulative payload B..H5, which is identical at the head, plus the post-H
  delta. It can bind no acceptance to `f0de303` or `cbf3bdf`.

### Access, reruns and inspected evidence

The reviewer had a full local clone with a shell. It read the full source and tests at the pinned
commits, the cumulative diff B..head (95 files), the round-5 correction delta `7237704..aa87096` and
the post-H delta. It also read the contract, reports 01–05, reviews 01–05-merged, and every
`validation-05` attachment header and relevant tail. No PR tooling was used.

**Inspected evidence.** All ten `validation-05` files match the SHA-256 values in implementation-05.
Each file's embedded output digest verifies over its marked output, and each names C5.

**Reviewer reruns.** Run on the head, whose payload equals C5, under Darwin 25.6.0 arm64, Node
v25.2.1 and npm 11.6.2. The checkout was clean before and after.

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run test:kernel` | 448/448 |
| `npm test` | 2,502/2,502; 0 failed, cancelled, skipped or todo |
| `npm run check:builder-docs` | exit 0; 72 files, 1,762 links, 38 imports |
| `node docs/development/work/K1.2/ablations.mjs` | clean control 448/448; 25/25 rejected |

The builder-docs link count differs from C5's 1,768 by exactly the 6 links removed from the K1.2 row
of 007 after H5.

**Reviewer-authored checks.** These are scratch files, not payload, and are available on request:

- ten deterministic probes (P1–P10), all passing on the head;
- fifteen further single-span ablations (R1–R10, R16, R25, R28–R30), built with the same runner
  mechanics; 14 were rejected and **R6 survived**.

The reviewer did not run conformance or SDK separately, because `npm test` includes both. Test
evals, external gates, native Drivers, process kills and packaging are excluded, as the contract
states.

## Independent coverage, derived before reading the reports

**Sources.**

- `execution-cycle.md`: before sending, the delivery reporting boundary, retry versus takeover,
  Outcome acceptance steps 1–5 and the atomic decisions.
- `identity.md`: Runtime attempt, writer epoch, dispatch and delivery, receipts.
- `core.md`: Activation, Outcome, mailbox, batch and acknowledgment, terminal disposition.
- `lifecycle.md`: transitions and the completion check.
- `state.md`: progress, recovery-held, Execution History.
- `evidence.md`: the K1 inspection row, permitted next actions, recorded commands, and inspection
  privilege not being control privilege.
- `recovery.md`: permission before replacement.
- `output.md` and `actions.md#emission-result-and-output-obligation`.
- `creation.md#when-the-destination-cannot-take-the-input`.
- Worksheet OA-1–OA-6 and B-5.
- 007 K1.2 seed and acceptance line; contract C1–C15.
- `rewrite-index.md` §4 and §5 items 1–7, 13, 18, 19, 26 and 28.

| Obligation | Distinguishing schedule, including the negative case | Expected facts / forbidden changes | Evidence and result |
|---|---|---|---|
| OA-1 scope first (C1) | Outsider on all four surfaces, hidden versus missing, with a read-counting Proxy envelope | Identical `unknown_destination`, position 0, zero reads past `executionId`, hidden Execution byte-identical | P2 passes; code: `observeOwn(executionId)` then `#visible` before anything else |
| OA-2 replay before validation (C2, C11) | Epoch-2 Outcome accepted, then the epoch-1 attempt's late Outcome; grant-less exact replay; replay after `fail` | Conflict for the late Outcome with only the refusal list grown; the replay returns the same receipt object | P1 and P4 pass; A2 and R1 rejected |
| OA-3/OA-5 whole refusal (C3, C7) | Stale epoch, stale base, no grant, forged grant, Effect, `await` with a counting `wait` getter, over-capacity, duplicate keys, unknown field, missing claim | Whole-view snapshot equal except one refusal record; no redelivery; wait never read; the corrected Outcome is then accepted at revision+1 | P3 passes; A3, A6, A11, A14, A15 and R25 rejected |
| OA-4 atomic commit, B-3 (C4) | Batch of one plus Events outside it; `continue`, `fail` | Exactly the batch acknowledged; progress captured; one receipt; exchange resolved | P3, P4 and P9 pass; A1, A16 and R30 rejected; `#accept` inventory traced |
| Lifecycle and next exchange (C5) | `continue`, then dispatch; terminal, then every surface | New Activation ID, base 1, captured progress resent, epoch 1; terminal never reopens | P4 and P9 pass; R5 rejected |
| B-5 and terminal ingress (C6) | Event queued before and after reservation, then `fail` | Batch acknowledged, the rest terminal in the same decision; new input refused and not queued; exact retry replays with its terminal disposition; changed retry conflicts | P4 passes; A7 and R16 rejected |
| Retry versus takeover, ID-3/4/9 (C8) | Unsafe, throwing and non-`true` safety callback; visible caller without control; takeover twice; redelivery after takeover; **redelivery, then a reply carrying the first send's grant** | Same Activation ID and batch; epoch+1 once; late input outside the batch; refusals without mutation; redelivery keeps the attempt and its authority | P8 and P10 pass on the candidate. **R6 survives the payload suite** (K12-R6-EVID-01) |
| Holds, PC-4/5, OA-6 (C9, C10) | Code hold, then redelivery, takeover and a current-attempt Outcome; protocol hold, then takeover | RUNNING, reason and permitted actions; refusals; `ended_by_outcome` with `attempt_submission` | P6 passes; A10, R8, R10 and R28 rejected |
| DEC-20 attempt authority | Forged or retired grant against current coordinates; reentrant takeover during capture | `unauthorized_submission` or `stale_exchange` per the order; the grant never appears in any view or Activation | P5 and P7 pass; B8, R2, R3 and R7 rejected |
| Receipts and nondisclosure (C12) | Accepted, refused and replayed Outcomes | One `outcome_acceptance` receipt per acceptance; refusals mint none | P7 passes; A12 and B5 rejected |
| Single observation (C13) | Getter reentering with a takeover or an acceptance; caller mutation after acceptance | The outer arm is stale or replayed; retained state is the capture | P7 and P9 pass; A13 rejected |
| Structure (C14) | Zone file list, imports and inventory | 13 files, `canonicalize` only, types-only exports | Conformance landing-zone suite inside `npm test` |
| Layer-3 maintenance (C15, 006) | Every canonical statement about what the Driver receives and who may answer an Activation | No superseded current description; one owner; no status; no silent settlement | **K12-R6-LAYER3-01** |

**Material exclusions.** Hidden-versus-missing timing is not measurable deterministically; only
shape and wording were compared. New ambient-pollution attacks were not constructed; C13 relies on
the suite, A13 and a trace of the load-time primitives used on the commit path.

## Reconciliation with the report, evidence and prior findings

Implementation-05's criterion traces agree with the reviewer's map except in two places.

1. Its C15 row, and its reference line "canonical ... execution-cycle ... rules are unchanged ... No
   Layer-1/2 or Layer-3 edits", did not consider `execution-cycle.md`'s binding-specific delivery
   signature. Its attachment 10 searched authority vocabulary only. `deliver(` and "capability" were
   not searched, so the stale code block could not surface.
2. Its C8 and C10 rows cite suites that cannot distinguish a redelivery that rotates the grant. The
   `submissionFor` helper (`tests/harness.ts:330`) returns the latest grant recorded, and its own
   comment assumes the property under test ("Redeliveries record the same grant object again").
   Every grant-based test uses it.

**Correction delta `7237704..aa87096`.** Only comments and one suite title change. The behavior is
unchanged. The only non-comment line is `describe("K12-R1-AUTH-01 visible caller without control
...")`. K12-R4-AUTH-DOC-01 remains closed: no absolute "inspect-only" authority wording is left in
live source, contract or baseline, apart from the disclosed B1 ablation label.

**Prior findings.**

- K12-R1-AUTH-01, HOLD-01, HISTORY-01, DELIVERY-01, DOC-01 and REC-01, K12-R2-TAKEOVER-01,
  K12-R3-AUTH-02 and HISTORY-02, and K12-R4-AUTH-DOC-01 stay closed. Their subsystems were
  re-exercised above: B1–B9 were rejected in the rerun, and P5–P8 pass.
- **K12-R5-LAYER3-01 (P1).** The required tree outcome is met at `cbf3bdf`: the two drafts are
  absent and the head payload equals C5. The canonical `operations.md` and `roles.md` were not
  altered. The removal is not yet packaged in any report-bearing candidate, so closure is to be
  confirmed in the next H's cumulative review.
- **K12-R5-PROC-01 (P2).** Remains open until a report-bearing successor H exists. `cbf3bdf` carries
  no report and no WAITING_FOR_REVIEW status, and its range from H5 contains two content commits
  whose effects cancel out. Neither `f0de303` nor `cbf3bdf` can be certified. This closes naturally
  when the next C/H is produced from the current head under 006.
- The P3 observations carried from earlier rounds keep their disposition:
  - a protocol-only hold accepts a no-op availability declaration;
  - `request_takeover` is listed even when a Driver can never be safe;
  - the Arena reviewer's five P3s.

## Layer-3 review

| Check | Result |
|---|---|
| Status or acceptance recorded on a Layer-3 page | None. `identity.md` changes only the writer-epoch `OPEN(implementation)` note, which now points at BASELINE `#outcome-acceptance-api`; the marker stays. |
| rewrite-index §4 | Records the three binding choices consistently with BASELINE. |
| Open choice settled in prose | None found. |
| §5.1–7, 13, 18, 19, 26, 28 | Respected. Takeover keeps the Activation ID; the epoch fences the whole Outcome; epoch values are compared only within the binding's own tests; atomicity is not durability; held stays RUNNING; acknowledgment is not compliance; the grant's readable fields authorize nothing; fencing is not native exclusion. |
| Canonical text the candidate's semantics superseded | One superseded description remains; see K12-R6-LAYER3-01. |

## Findings

### K12-R6-LAYER3-01 — P2 — the canonical delivery boundary no longer describes the binding K1.2 ships

- Criterion: C15, under 006 §Maintaining the mental-model reference ("update changed semantics,
  replace superseded current descriptions").
- Location: `mental-model/mechanisms/execution-cycle.md:34–49` (roadmap K1.2's first-listed owner),
  against `packages/kernel/src/driver.ts` (`ExecutionDriver.deliver`) and `coordinator.ts:2125`.
- Canonical fact: the page states the in-process TypeScript binding's delivery call exactly —
  `deliver(activation: Activation, settlement: DeliverySettlement): undefined;` — and says that
  "Ordinary redelivery supplies a new capability for a new delivery attempt".
- Candidate fact: DEC-20 changed that binding to `deliver(activation, settlement, submission)`. The
  third argument is the attempt's submission authority. It is bound to the *Runtime attempt*: kept
  across redeliveries, replaced by takeover, and required back by reference on `submitOutcome`. The
  per-delivery capability is a different object.
- No canonical page says that the delivery call hands over proposal authority, or that a Driver must
  return it. Nor does any say that Outcome acceptance refuses a current-looking proposal without it
  (`unauthorized_submission`, placed after currency and before content). A `git grep` of
  `mental-model/` finds no "submission authority" or "grant" wording, and no `deliver(` other than the
  stale signature.
- Counterexample:
  1. A Driver is written from the Layer-3 contract. It takes the two documented arguments and drops
     the third.
  2. Its every Outcome is refused `unauthorized_submission`.
  3. By 006's precedence, Layer 3 outranks BASELINE, so the conflict resolves toward the wrong
     signature.
  4. Separately, the page's only statement about what redelivery supplies ("a new capability for a
     new delivery attempt") invites exactly the per-delivery grant rotation that K12-R6-EVID-01
     shows no test rejects.
- Required outcome:
  - The canonical owner no longer presents a superseded binding contract.
  - The packet states where the attempt-bound submission rule lives, and its place in the acceptance
    order. Round 3 treated it as the Kernel→Driver→Runtime boundary; nothing in Layer 3 states it.
  - Any form is acceptable, provided each rule keeps one owner and no status reaches the page.
    - If the rule belongs to every binding, state it at its canonical owner. The likely owners are
      `execution-cycle.md#outcome-acceptance` and the delivery boundary; `identity.md` is related.
    - If it is only this binding's representation of an unforgeable epoch claim, say so in the
      decision artifact and BASELINE. Then make the canonical page stop describing the binding in a
      way the binding contradicts.
  - If stating it canonically would extend an accepted decision (KC1-ARCH-1 fixed the two-argument
    reporting call), take that item through 006's owner or blocker path rather than choosing
    silently.
  - Validate the link and anchor checks, and grep `mental-model/` for `deliver(` and
    capability/grant wording.

### K12-R6-EVID-01 — P2 — no test distinguishes a redelivery that rotates the attempt's grant

- Criteria: C8 (retry versus takeover), with the C10/DEC-20 row.
- Sources:
  - `execution-cycle.md#retry-versus-takeover`: "a reply produced by the first send is still a valid
    reply to the current exchange";
  - `identity.md#runtime-attempt`: sending the same dispatch again "continues the same attempt";
  - contract DEC-20 and BASELINE: "Redelivery preserves the attempt and its grant".
- Behavior: correct. `redeliver` passes the same `intent.submission`. Probe P10 (dispatch, two
  redeliveries, then an Outcome carrying the first send's grant) is accepted, and P8 checks grant
  identity after redelivery.
- Evidence gap: reviewer ablation R6 inserts
  `intent.submission = mintSubmission(...)` before `const resent = intent.activation;` in `redeliver`
  (`coordinator.ts:1273`). That is a fresh grant per delivery attempt, mirroring the fresh
  per-delivery settlement capability. The whole kernel suite still passes, 448/448. On the same
  mutation, P10 fails.
  - The retry-only test (`tests/takeover.test.ts:140`) and every grant test submit with
    `submissionFor(driver, …)`, which returns the newest grant, so they cannot observe the defect.
  - None of the 25 packet ablations covers it.
  - Impact: a plausible regression would refuse the current attempt's reply to its first send after
    any redelivery. That breaks the Layer-3 retry rule and silently undoes DEC-20's redelivery
    property with green CI.
- Required outcome: add evidence that rejects a per-delivery grant rotation. The form is up to the
  implementer: a test answering with an earlier send's grant after ordinary redelivery, an ablation
  added to the packet runner, or equivalent. Then check the other grant paths the same way: mint,
  hand-over, redelivery, takeover, submission and inspection. Do not rely on a helper that assumes
  the property.

### K12-R6-DOC-01 — P3 — the development front door understates the implemented package

`docs/development/README.md:29–30` still says the private package "currently supplies creation,
ingress, reservation and dispatch only". In the candidate tree that is false. Optional; it may be
repaired with the next correction or at cleanup.

### Non-blocking observations (P3)

- The live header prose of 007 (`007-work-packets.md:7–9`, from owner record `206dcc1`) still says
  "its first three candidates received CHANGES REQUIRED ... Rounds 2 and 3 ...". This is
  administrative.
- A current-attempt Outcome that ends a code hold (DEC-7) leaves no standing record that the pinned
  code was declared unavailable. The next dispatch proceeds unheld (P6). This is consistent with
  DEC-7 and "no standing registry". K3 recovery work should not assume dispatch re-checks
  availability.
- `fail`'s error is retained as `result` / `TerminalResultView` with `kind: "failed"`, and BASELINE
  calls it a "typed result". However, `core.md` says `fail` ends "without a result", and `actions.md`
  defines a terminal result as output accepted with completion. The vocabulary is worth aligning
  when `execution-cycle.md` is rewritten. Behavior is unaffected.

## Per-criterion verdicts

| Criterion | Verdict | Rationale |
|---|---|---|
| C1 | PASS | P2: identical refusals, zero content reads, hidden Execution unchanged; revoked-scope suite |
| C2 | PASS | P1 and P4; the lookup precedes terminal, currency and authority checks; A2 and R1 rejected |
| C3 | PASS | P3 whole-refusal matrix; E-6 suite; A3, A11, A14 and R25 rejected |
| C4 | PASS | `#accept` builds before it applies; exact batch acknowledged; A1, A16 and R30 rejected |
| C5 | PASS | P4 and P9: next exchange, typed terminal, never reopens; R5 rejected |
| C6 | PASS | P4; A7, A8 and R16 rejected |
| C7 | PASS | P3: Effect and `await` refused whole, wait unread; A6 and A15 rejected |
| C8 | **FAIL** | Behavior verified (P8, P10); the packet's evidence cannot reject R6 — K12-R6-EVID-01 |
| C9 | PASS | P6; A9, A10, R8 and R28 rejected; permitted actions predict the controls |
| C10 | PASS | Protocol hold, stale report and takeover clearing; B8, R2, R3, R7 and R10 rejected. The DEC-20 redelivery gap is charged to C8 |
| C11 | PASS | Late Outcome and report isolation; B4 rejected |
| C12 | PASS | Receipts, immutability and nondisclosure; grant never exposed (P5); A12 and B5 rejected |
| C13 | PASS | P7 and P9 reentrancy and capture; A13 rejected; hostile suites |
| C14 | PASS | 13 files, no new third party, inventory and guard agree, DX-4 disposition recorded |
| C15 | **FAIL** | K12-R6-LAYER3-01: a superseded Layer-3 binding description, and no canonical owner for attempt-bound submission authority |

No criterion is DEFERRED.

## Verdict and status for transcription

`K1.2 | CHANGES_REQUESTED`. Review 06, by Claude Opus 5.5, dated 2026-09-25. It covers the
cumulative payload B `a20d278…` .. H5 `d13a828…`, which is identical at the head `cbf3bdf…`, plus the
post-H5 delta.

Open findings:

- K12-R6-LAYER3-01 (P2, C15);
- K12-R6-EVID-01 (P2, C8);
- K12-R5-PROC-01 (P2), open until a report-bearing successor H exists.

K12-R5-LAYER3-01 is met in the tree at `cbf3bdf` and is to be confirmed at the next H. No
acceptance, E1 result, K1 closure, integration or K1.3 release. Acceptance must not bind to
`f0de303` or `cbf3bdf`.

## Compact correction handoff

```text
Correct the same released packet K1.2 on claude/k1.2-outcome-acceptance-receipts.
Base a20d278185eaffc7f8b7489345a3624231ff6e6d; reviewed H d13a82881c5fa11aa8fc48eff83a9472eef595a6
(payload C aa8709673e6d53455f226d0fc01bdca6fb55e600; current head cbf3bdf5c814fe544d61038ec3b273426dddff00,
payload-identical to C5); review record K1.2/review-06.md as transcribed by the owner.
Open findings K12-R6-LAYER3-01, K12-R6-EVID-01, K12-R5-PROC-01; required outcomes and counterexamples
are in that record. Build the next C on top of cbf3bdf so K12-R5-LAYER3-01's removal is inside the
reviewed line.
Owner supplemental decisions: none. Unresolved authority: whether attempt-bound submission authority
is canonical Kernel semantics or binding representation; use 006's owner/blocker path if stating it
in Layer 3 would extend an accepted decision.
Apply 006 and 012: close the submission-grant subsystem (mint, hand-over, redelivery, takeover,
submission, inspection, canonical description), then re-review the whole cumulative packet. Fix
additional in-scope defects with separate provenance.
Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.
```

CHANGES REQUIRED
