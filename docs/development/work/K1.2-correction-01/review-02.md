# Independent review — K1.2-correction-01, review 02 (PRELIMINARY, no candidate H)

**Status of this record.** Round 2 is still in progress. The branch has payload commits after
review 01 but no implementation-02 report, no validation-02 evidence, no C..H allowlist and no
WAITING_FOR_REVIEW row. There is therefore no H to bind a verdict to. This is an early,
non-binding review of the payload as it stands at `c323e821dffbcd65114447a66593eeec9be699fb`,
written so that its findings can be addressed before handoff. When a report-bearing H exists, it
must receive a full cumulative review; nothing here certifies that H or waives any part of it.

## Identity

- Reviewer: Claude Code desktop (Code tab) session `local_e046faff-6150-4997-a8c4-8614c63df5ae`,
  model `claude-opus-5-5`, effort xhigh. Dates 2026-09-27 UTC (2026-09-26 local). The owner's task
  message selected this reviewer. This session wrote no K1.2 or K1.2-correction-01 payload, report,
  contract or decision.
- Correlated-assumption disclosure: review-01 (the finding this round answers), review-14 and
  invalidation-01 came from Claude Code sessions of the same model. This session also has
  read-only memory notes from earlier K1.2 review sessions. I derived coverage from the contract,
  decision-02 and the Layer-3 owners, and checked the reviewer claims of review-01 by rerunning its
  probes rather than relying on them.
- Repository/branch: `ArrokothI/arrokothi`, `codex/k1.2-correction-01-activation-identity`.
  `git ls-remote` advertises `c323e821dffbcd65114447a66593eeec9be699fb` for the branch and
  `a20d278185eaffc7f8b7489345a3624231ff6e6d` for `main`.
- Governing base and process baseline B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`. 006, 008 and
  012 are byte-identical at B and at `c323e82`.
- Release `6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb`; previous payload C1
  `360538522be8c1b17d23948f632fd4f568a76ed0`, reviewed H1 `6541115e2e5389a7e5cff86f87d857b4eb486d7d`;
  review-01 recorded at `449b243cd31d5596c457e091233dfc4d77a4eff4` (CHANGES REQUIRED, K12C1-R1-DIAG-01).
- Round-2 payload so far: `67555e3d4da4b6ad70685564f2224091ad48fae5` (fix) and
  `c323e821dffbcd65114447a66593eeec9be699fb` (whitespace). Contract revision 2 at `c323e82`.
- B..`c323e82` is linear: 51 commits, no merges.

## Access and limits

- Full local clone, fetched. Detached clean worktrees at `c323e82` and at the release, `npm ci`
  in the first (the release worktree links to the first worktree's `node_modules`; `package-lock.json` is unchanged between them).
  `git status` empty before and after every run.
- Environment: Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64, 8 GiB RAM.
  Review-01 ran on Node 22 / Linux; the two legacy cancellations it saw (its O2) do not occur here.
- Read in full: the round-2 delta `449b243..c323e82` (16 files); the new
  `refusal-diagnostics.test.ts` and fixture; contract revision 2 and its delta from revision 1;
  `coverage-02.md`; `reconstruction.md`; the changed `ablations.mjs`, `original-ablations-02.mjs`,
  `probe-diagnostics-maxlen.ts`, `validate.mjs`, `check-records.mjs`; the Layer-3 and BASELINE
  hunks. Read in the surrounding cumulative source: `submitOutcome`, `requestTakeover`,
  `recoverExecution`, `reportProtocolFailure`, `#openExchange`, `#requireControl`, `#refusal`,
  `mintRefusal`, `#accept`'s history records, `redeliver`, `envelope.ts`, `outcome.ts`, and the
  issue producers and `describe` in `values.ts`.
- Not available, so not reviewed: implementation-02, validation-02, C..H allowlist, the
  implementer's final raw logs and push handoff. Not re-read line by line: unchanged pre-round-2
  test bodies (rerun instead). Out of contract and not examined: native Driver fidelity,
  persistence/process death, E gates, packaging.

## Reruns at `c323e82` (this reviewer)

Every command ran in the clean detached worktree at `c323e82` (the `probe-cost` and
`probe-aggregate` comparisons also ran at the release). The raw logs are in
[`review-02/`](review-02/). The implementer's H evidence does not exist yet, so none was inspected.

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | exit 0; 3,233/3,233, 0 cancelled |
| `npm run test:kernel` | exit 0; 1,179/1,179 (1,137 + 42 new) |
| `npm run test:conformance` | exit 0; 1,945/1,945 |
| `npm run test:sdk` | exit 0; 22/22 |
| `npm run check:builder-docs` | exit 0; 72 files, 1,804 links, 38 imports |
| `npm run test:evals` | exit 0; 12/12 |
| `node docs/development/work/K1.2/ablations.mjs` (sealed, SHA-256 `9ea4cecb…1f55` verified) | exit 1; control 1,179/1,179; **32/36 rejected; B6, B12, B13, B14 NOT APPLICABLE** (anchor drift) |
| `node …/K1.2-correction-01/original-ablations-02.mjs` | exit 0; control 1,179/1,179; **36/36 rejected**. I checked separately that each respelled anchor matches exactly once and that only the diagnostic spelling changes |
| `node …/K1.2-correction-01/ablations.mjs` | exit 0; control 537/537; **41/41 rejected** (I1–I7, D1–D34) |
| reviewer `reviewer-ablations.mjs`, full kernel suite per mutant | control 1,179/1,179. Rejected: R1, R2, R3, R6, R8, R10, R11, R12. **Survived: R4, R5, R7, R9** (K12C1-R2-EVID-01) |
| `…/K1.2/review-11/probe-partial-claim.ts` | exit 0; 8/8 `stale_exchange`, state unchanged |
| `…/K1.2-correction-01/check-records.mjs` | exit 0; 10 files, 532 links/anchors |
| review-01 `probe-identity.ts` | P1–P3 as at H1. P4 reasons 111–165 units with no lone surrogate (at H1: 50,000,147 and an unpaired surrogate) |
| review-01 `probe-maxlen.ts` | all five return `stale_exchange` (104–158 units); **5 refusals recorded** (at H1: 5 × `RangeError`, 0 recorded) |
| implementer `probe-diagnostics-maxlen.ts` | 21/21 at `MAX_STRING_LENGTH − 16` |
| review-01 `probe-namespace.ts` | unchanged from H1: `continue` ok; `complete` and Emission `RangeError` (O1, now qualified) |
| reviewer `probe-aggregate.ts` | see K12C1-R2-AGG-01 |
| reviewer `probe-equality.ts` (candidate and an R4+R5+R7 mutant copy) | see K12C1-R2-EVID-01 |
| reviewer `probe-cost.ts` (release and candidate) | see O-R2-1 |
| `git diff --check` | B..`c323e82` exit 2 (sealed logs only); `449b243..c323e82` exit 0 |

Reviewer-authored files (not payload), SHA-256: `probe-aggregate.ts` `1361d24f…9fb6`,
`probe-equality.ts` `c1ae8da0…da90`, `probe-cost.ts` `0b5ea78b…5690`, `reviewer-ablations.mjs`
`5ba3e8bd…fbe7`. They and every rerun log are in [`review-02/`](review-02/), with SHA-256
digests in `review-02/MANIFEST.sha256`.

Mechanical results (suites, ablation counts, digests) are separate from the semantic judgments,
which rest on source reading and the reviewer probes.

## Independent obligation and interaction coverage

Derived from review-01's required outcomes, DEC-2 of K1.2 revision 9, decision-02,
`execution-cycle.md#outcome-acceptance`, `values.md` and contract revision 2, before reading
`coverage-02.md` and `reconstruction.md`.

Who can put what text into an Outcome/control refusal:

- A visibility-only caller reaches only the pre-authority groups (terminal, currency, grant). There
  the only caller text is a *wrong* primitive Activation string. Every matched string equals a
  Kernel-minted ID, which is long or non-ASCII only through the trusted namespace or accepted
  scope/key.
- The entitled attempt (current grant) also reaches the content group, where every captured issue
  is rendered: member names in paths, constructor names in messages, unknown field names,
  duplicate Emission keys.
- A control caller reaches `malformed_value` (paths and codes only), the stale/terminal/no-exchange
  refusals, and the code-hold reason built from creation-pinned names.

| # | Obligation / source | Strongest schedule examined | Expected / forbidden | Evidence and result |
|---|---|---|---|---|
| V1 | DIAG-01: returned and recorded, never thrown, for any engine-representable wrong string | engine-maximum (`MAX_STRING_LENGTH − 16`) and 50,000,000-unit wrong IDs; lone high/low surrogates; open, resolved and terminal; Outcome from a visibility-only caller; all three controls with and without control power | refusal returned **and** retained (same frozen object); printable ASCII ≤ 1,024; one read of the identity after control power; whole view otherwise unchanged; a later valid answer accepted | Source trace of all 30 `diagnosticIdentity` sites; 21-case matrix × 3 identities in `npm test`; reviewer reruns of review-01's `probe-maxlen` and `probe-identity` and of the implementer's engine-maximum probe (see reruns). **Holds** |
| V2 | Every renderer in the four boundaries is bounded before concatenation | grep of every `${…}` in `submitOutcome`, the three controls, `#openExchange` and `#requireControl`; the remaining interpolations are numbers, Kernel enums, `explain`/`explainOutcomeIssues`, the DEC-8 diagnostic and already-bounded hold reasons | no raw identity, Execution ID, key or pin | Source. 29 coordinator and 1 outcome sites. D1–D30 each restore one raw site and are each rejected. **Holds per fragment** |
| V3 | Diagnostic lossiness never feeds semantics | structured `refusal.executionId`, replay map key, current-exchange and control comparisons, duplicate-key comparison, code-availability comparison, hold `updated` detection, history `activationId` and actor | all exact; `updated` still fires when the missing set changes even though every pin renders as `<identity omitted>` | Source and `probe-equality` at `c323e82`: **behavior holds**. Evidence is partial. R1, R2, R3, R6 and R11 are rejected; R4, R5 and R7 **survive** the full suite. See K12C1-R2-EVID-01 |
| V4 | Edges of the rendering rule | 128 vs 129 units; `" ~"` endpoints; tab, DEL, non-ASCII; path 128/129; message limit | 128 and endpoints kept; the rest omitted | Identity edges pinned (R8 rejected). Message limit pinned only as a whole (R10 rejected). The path one-over edge is unpinned: **R9 survives**. See K12C1-R2-EVID-01 |
| V5 | DEC-6: explicit protocol/delivery diagnostics keep the first-1,024-unit rule | `"é".repeat(2000)` through both clearing paths | 1,024 `é` in every hold and history reason | Test; reviewer R12. **Holds** |
| V6 | Content diagnostics (DEC-5, SELF-DIAG-01/02): bounded and total, every issue accounted | entitled attempt; one root with ~533K refused positions, each an object whose inherited constructor name is 980 printable ASCII units | refusal returned and recorded, reason of stated finite size | **Fails**: `RangeError`, no refusal recorded. See K12C1-R2-AGG-01 |
| V7 | Same, pre-authority (visibility-only caller; stale epoch) | the same root, no grant; then a grant holder at a stale epoch | `unauthorized_submission` / `stale_exchange`, bounded, no content diagnostic | 216- and 144-unit reasons, one refusal each. **Holds**; cost in O-R2-1 |
| V8 | Same, controls | the same root in all three recovery availability lists | bounded `malformed_value` | 92,464,414-unit retained reason, no throw. Part of K12C1-R2-AGG-01 |
| V9 | C9 "hold naming what is missing" with omitted pins | long, 128, 129 and non-ASCII pins | the reason names the pin kind; exact pins stay inspectable | `ExecutionView` and `ActivationView` carry exact `definitionRevision`, `runtimeContractRevision` and `progressCodec`. **Holds** |
| V10 | Decision-02 order, replay and minted-ID answerability unchanged (review-01 R1–R7) | review-01 `probe-identity` P1–P4 at `c323e82` | P1–P3 as at H1; P4 reasons bounded | Rerun (see reruns). **Holds** |
| V11 | O1 disposition | namespace of 2^28 + 1,000 units | unchanged behavior; claims qualified | review-01 `probe-namespace` rerun; contract, BASELINE and identity.md qualified. **Holds** as a qualification |
| V12 | No change to integrated K1.1 creation-through-dispatch, `identity.ts` or `values.ts`; no existing test changed | `git diff` release..`c323e82` | only 3 test files added | Verified; `check-records.mjs` slice verified by rerun. **Holds** |
| V13 | Evidence mechanics | sealed runner vs adapter; anchors | adapter changes only spelling; each anchor matches once | Verified by rerun and by anchor count (see reruns) |

Reconciliation with the implementer's map. `coverage-02.md` and `reconstruction.md` match V1–V5
and V9–V12 and add SELF-DIAG-01/02, which I agree with. They treat content diagnostics per issue
only. `reconstruction.md` states that "a reason with N issues is bounded by 1,024 + 2,050N units"
and that aggregate truncation "would contradict DEC-2's combined diagnostics". Neither map
examines how large N can be. Each value root admits roughly one issue per charged canonical
byte, so N reaches about a million per root. That gap is behind V6 and V8. The reconstruction also
lists redelivery as "integrated code" (see O-R2-2).

## Layer-3 changes reviewed as normative payload

Round 2 changes `concepts/identity.md#runtime-attempt` (rule sentence, binding paragraph, marker)
and the rewrite-index §4 entry.

- **One owner.** The producer/consumer rule stays in `identity.md`. The added qualification
  ("within the binding's engine allocation limits, including required derived-identity
  compositions") answers review-01 O1 in the form O1 offered. `execution-cycle.md` is unchanged
  in this round. No other Layer-1/2/3 page states the rule.
- **Does the qualification weaken an accepted rule?** The unqualified sentence was introduced by
  C1 of this same, unaccepted packet. Physical allocation limits already bound it. The
  qualification makes the text true of the implementation: an Execution with a namespace above
  half the engine maximum can `continue` but never `complete` or `fail`. It is not a silent
  settlement: the contract, BASELINE and marker say the same thing.
- **No status.** No "implemented", "accepted" or commit identity on the page. The binding paragraph
  follows the page's existing "one binding's answer" precedent.
- **Open choice.** The `OPEN(implementation)` marker is kept and cites §4. §4's number is unchanged.
- **Dangerous inferences.** §5.1, §5.3, §5.26 and §5.28 still hold. Nothing in round 2 infers wire
  format, a semantic length maximum, or authority from structural validity. §5.30 ("a rendered
  string stands in for a structure") is the one round 2 touches. `recoverExecution` decides
  `entered`/`updated` by comparing the rendered missing-code reason (`coordinator.ts:1807`), and
  DEC-4 made that rendering lossy. It still distinguishes every missing set: an exchange's three
  pins are fixed, each kind has its own label, so equal reasons mean equal missing sets. The pinned
  test's `entered → updated` sequence and reviewer ablation R11 pin that behavior. The comparison
  predates round 2. A structural comparison would remove the dependency, but I do not require one.
- **Diagnostic policy placement.** DEC-4 to DEC-6 are binding choices and live in the contract and
  BASELINE, not in Layer 3. The only Layer-3 constraints on reasons are "Record the reason"
  (`execution-cycle.md` OA-5) and the delivery-diagnostic rule (`execution-cycle.md` delivery
  reporting). DEC-6 keeps the latter unchanged. Neither requires a refusal reason to spell an
  identity, so `<identity omitted>` contradicts no owner.
- **Layer 3 on refusal cost.** `concepts/values.md` "Refusing a value must also be cheap … no value
  may cost more time or memory to refuse than a value at the limits costs to accept." This bears on
  K12C1-R2-AGG-01 and O-R2-1.

## Findings

### K12C1-R2-AGG-01 — P2 — combined content diagnostics have no aggregate bound, and an entitled Outcome throws instead of refusing

- **Provenance:** reviewer-found in this review. It is **not** introduced by round 2: the release
  (H14 code) throws identically. It is the cumulative K1.2 behavior of `explainOutcomeIssues`, which
  round 2's DEC-5 was written to bound and did not bound in aggregate.
- **Location:**
  - `packages/kernel/src/outcome.ts` `explainOutcomeIssues` (463–471) concatenates every issue
    with its message.
  - `packages/kernel/src/coordinator.ts:1551` and `:1557` interpolate it into the
    `malformed_envelope` reason. `explain` feeds the control `malformed_value` reasons at `:1609`,
    `:1775` and `:1858`.
  - `acceptRoot` (outcome.ts 192–203) keeps every issue of every root. Each issue's message
    is now ≤ 1,024 units, but nothing bounds how many issues there are.
  - `values.ts` records one issue per refused array position or object member. Each position is
    charged about one canonical byte (a comma), so a root inside the 1 MiB limit can carry about
    a million issues.
- **Governing sources:**
  - K1.2 C3: "The refusal is recorded with its reason."
  - `execution-cycle.md#outcome-acceptance`: "Record the reason; never silently drop or endlessly
    retry it."
  - K1.1's total-classification rule (K11-R16-ID-01, carried by C13): caller-owned input
    becomes a located refusal, never an exception escaping the boundary.
  - Contract revision 2's own coverage rows: "refusal returned and recorded … no exception", and
    "every renderer follows DEC-4/5".
  - Review-01's DIAG-01 validation instruction: trace every renderer.
  - 006: because this is the third defect found in the Outcome/control refusal-rendering subsystem,
    reconstruct that subsystem before patching it again.
- **Counterexample** (reviewer probe `probe-aggregate.ts`):
  - Setup: the current attempt holds a valid grant and names the current Activation, epoch and
    base. Its `progress` is an outer array holding 130 references to one inner array. The inner
    array holds 4,096 references to one object whose inherited `constructor.name` is 980 × `"N"`.
    The distinct heap is about 33 KB, and about 533,000 canonical bytes are charged, which is
    within the 1 MiB root limit.
  - At `c323e82`: `submitOutcome` **throws `RangeError: Invalid string length`** after about 6 s.
    **Zero refusals are recorded.** The exchange stays answerable, and a later valid Outcome is
    accepted.
  - At the release: identical.
  - With 8 inner arrays instead of 130 (32,768 issues), `c323e82` records a
    **34,790,834-unit** `malformed_envelope` reason.
  - Control path: a control caller puts the same root in all three recovery availability lists.
    The result is a retained **92,464,414-unit** `malformed_value` reason. There is no throw,
    because `explain` omits messages.
  - Estimate, **not run**: long constructor names are not required. `undefined_member` renders
    about 100 units per issue, so about six roots of the same shape (progress, a result and four
    Emission values, well inside the default capacity of 256) would pass the engine limit. Memory
    may run out first on a small host. I did not run this, and the finding does not depend on it.
- **Impact:**
  - The entitled attempt, the Runtime answering its own exchange, can make the Kernel raise
    instead of refusing, with nothing recorded. That is the same failure DIAG-01 closed for
    identity text, reached through content diagnostics.
  - Below the throw threshold, the Kernel retains caller-shaped refusal text roughly 1,000 times
    larger than the canonical budget the caller spent.
  - No accepted state is corrupted.
  - Exposure is narrower than DIAG-01's: the content group runs only after currency and grant
    (V7), so a visibility-only caller cannot reach it.
  - P2 on 006's scale: C3's recorded-refusal obligation fails, and the DEC-5 and BASELINE claims
    are unsupported (below).
- **Unsupported claims to correct:**
  - Contract DEC-5, BASELINE and `reconstruction.md`: "an Outcome/control refusal with N issues is
    bounded by 1,024 + 2,050N units". This is true, but presented as the bound although N is not
    bounded.
  - "No aggregate truncation is used: DEC-2 requires content issues to be reported together." DEC-2
    requires one refusal that names the content group and reports its issues together. The binding
    already reports a bounded subset in two places: unknown fields stop after eight per holder
    (`UNKNOWN_FIELD_REPORT_LIMIT`), and value capture stops reading at the byte limit ("the rest of
    the value was not read"). If the implementer still reads DEC-2 as forbidding any bound on the
    rendered list, the contract must record that reading together with a way to keep the refusal
    total. It must not rest on the premise without that.
- **Why round 2 missed it:** the map reasoned per issue. The tests use at most three issues per
  root, and nothing examines how large N can be (see the reconciliation above).
- **Required outcome** (the means are the implementer's choice; examples only):
  - Every refusal on `submitOutcome` and the three controls whose reason renders captured content
    issues is returned and recorded, never thrown. This holds for any proposal within the per-root
    value limits and the configured Emission capacity.
  - The rendered reason has a stated finite bound that does not grow with the number of captured
    issues, or the contract and BASELINE record a justified alternative that still guarantees
    totality.
  - Classification, the decision-02 group order, every issue code's presence as the contract
    defines it, replay, and minted-ID answerability are preserved.
  - Correct DEC-5, BASELINE and the reconstruction accordingly.
  - Possible means include: a count-preserving summary after K rendered issues (as the
    unknown-field rule already does); a per-root issue cap in the Outcome/control projection; or
    rendering codes and counts rather than messages beyond a budget.
- **Validation:**
  - An entitled-caller test with enough issues that the previous rendering would exceed the engine
    limit or a stated large bound, across progress, several Emission values and result/error, and
    a control test with the recovery roots.
  - Assertions: returned equals retained, one refusal appended, whole-state equality, reason within
    the stated bound, and a later valid answer accepted.
  - An ablation restoring the unbounded aggregate, rejected by the suite.
  - Reconstruct the Outcome/control refusal-rendering subsystem per 006, by aggregate as well as
    per fragment. Record why round 2 missed it.

### K12C1-R2-EVID-01 — P2 — "diagnostic lossiness never affects equality" is unpinned where two unrenderable identities differ

- **Provenance:** reviewer-found in this review, by single-span ablation. The behavior at
  `c323e82` is correct. The finding is about evidence: DEC-4 introduced a lossy rendering of
  identities, and the suite cannot tell whether that rendering leaks into comparisons.
- **Location:** the comparisons at `coordinator.ts:1435` (Outcome wrong-Activation check) and
  `:1921` (`#openExchange`, all three controls), and `outcome.ts:325` (duplicate Emission key).
  The tests are in `refusal-diagnostics.test.ts` and `activation-identity.test.ts`.
- **Governing sources:**
  - Contract DEC-1: exact UTF-16 code-unit equality.
  - DEC-4: "Diagnostic lossiness never affects classification, equality, authority …".
  - DEC-4's "exact duplicate … comparisons".
  - PLAN-01: a control acts only on the exchange it names, and an Outcome names the exchange it
    answers.
  - K1.2 C3, C8–C10.
  - 012 deterministic execution: "Include a plausible broken behavior that the oracle would
    reject".
  - 006: a PASS needs a trace or observation that could distinguish a plausible wrong
    implementation.
- **Counterexample** (reviewer ablations on the full 1,179-test kernel suite, clean control):
  - **R4** makes the Outcome wrong-Activation check compare `diagnosticIdentity(…)` spellings. It
    **survives** 1,179/1,179.
  - **R5** does the same in `#openExchange`. It **survives**.
  - **R7** does the same for the duplicate-Emission-key comparison. It **survives**.
  - `probe-equality.ts`, run on a copy of the package with R4, R5 and R7 applied (one caller
    namespace of 200 printable units, so both identities render as `<identity omitted>`):
    - **E1:** the grant holder's Outcome naming `<current ID>-not-this-exchange` is **accepted into
      the current exchange** (revision 0 → 1, exchange resolved).
    - **E2:** a control takeover naming that different ID **advances the current exchange** to
      epoch 2.
    - **E3:** two distinct 129-unit Emission keys are **refused as duplicates**.
  - At `c323e82` the same probe gives E1 `stale_exchange`, E2 `stale_exchange` and E3 accepted.
  - Cause: every test pairs an unrenderable identity with a renderable one. Wrong IDs are either
    short (`"wrong"`) or tested against a short current ID. Duplicate-key tests use equal keys
    only. No test pairs two *different* identities that both render as `<identity omitted>`.
- **Adjacent edge gap:** reviewer ablation **R9** raises the path limit to 129 units, and it
  **survives**. The tests reach path projection only with 4,096-unit and lone-surrogate member
  names, and message projection only with 6,144-unit and surrogate constructor names. DEC-5's
  128-unit path and 1,024-unit message limits have no at-limit or one-over test. 012 asks for
  both for every bounded value.
- **Impact:** a later refactor that normalized or rendered identities before comparing them (the
  shared helper now sits beside the comparisons) would commit a proposal into an exchange it does
  not name and take over an unnamed exchange, and every test would still pass. This is the
  packet's central claim, exact equality over long and surrogate minted IDs, left without a
  distinguishing oracle in the configuration DEC-4 created. P2 on 006's scale: a missing
  meaningful test and an unsupported claim. There is no present behavioral defect.
- **Required outcome:**
  - Distinguishing tests in which a wrong identity and the current identity differ and both are
    unrenderable (over 128 units, and separately non-ASCII or surrogate-bearing). Cover the
    Outcome path (grant holder, so a wrong comparison would *accept*), each of the three controls,
    and two distinct unrenderable Emission keys in one Outcome.
  - At-limit and one-over tests for the DEC-5 path and message limits.
  - Ablations equivalent to R4, R5, R7 and R9, each rejected.

### Non-blocking observations (P3; reviewer-found)

- **O-R2-1 — pre-authority cost of the eager projection.**
  - What round 2 changed: `diagnosticIssues` runs inside `acceptRoot`, during eager capture, before
    currency and grant are checked. For each issue it copies the issue and reads up to 1,024 message
    units, which flattens rope strings.
  - Measurement (`probe-cost.ts`, one process per mode, idle machine, peak memory footprint
    including the ~100 MB process baseline):

    | Case | Release | `c323e82` |
    |---|---|---|
    | Accepting an at-limit root (127 × 4,096 numbers, about 1 MiB) | 0.63 s / 105 MB | 0.64 s / 104 MB |
    | Visibility-only refusal of about 533K `undefined` positions | 1.8 s / 365 MB | 2.1 s / 403 MB |
    | Same root with 980-unit constructor names | 2.3 s / 385 MB | 4.7 s / 1,017 MB |

  - `values.md` says "no value may cost more time or memory to refuse than a value at the limits
    costs to accept". The release already exceeds that by about 3–4×. That excess is in integrated
    K1.1 value capture, outside this packet's change authority, and I raise it for the owner, not as
    a finding here.
  - Round 2 roughly doubles it again for the constructor-name shape. Any visible principal can
    trigger that per request, and it multiplies across the up to 258 roots of one Outcome (K1.2-OPEN-2).
  - Projecting at render time, after authority, would remove the increment. A fix for
    K12C1-R2-AGG-01 may do so naturally.
  - This is a single-run measurement. No correctness failure.
- **O-R2-2 — one K1.2 renderer outside the four boundaries.** `redeliver`'s `recovery_held`
  refusal (`coordinator.ts:1271`) renders the raw minted Activation ID. That refusal was added by
  K1.2 and is not integrated K1.1 code. `reconstruction.md` nonetheless classes redelivery with
  "integrated code … unchanged". The text is not caller-arbitrary: the minted ID contains the
  trusted namespace plus accepted scope and key, each within K1.1's text limits. DEC-4 is scoped
  to the four boundaries, so no claim is false. But DEC-4's own rationale, that a matched Kernel
  ID is not exempt, applies here too. Either bound it or correct the classification.
- **O-R2-3 — evidence disclosure for the coming report.** Run as the contract requires, the sealed
  original runner gives 32/36 with B6, B12, B13 and B14 NOT APPLICABLE and exits 1. The B..HEAD
  `git diff --check` in `validate.mjs` exits 2. I reran it at `c323e82`: the output lists the
  inherited sealed K1.2 logs, which review-01 accepted, and the sealed `validation-01` logs that
  quote them. The round-2 range `449b243..c323e82` exits 0. `validate.mjs` therefore cannot exit 0. The report must
  state both, and must present the adapted run as the substitute evidence, not as the sealed
  result.

## Prior findings

- **K12C1-R1-DIAG-01:** closed on the payload at `c323e82`, subject to confirmation at H. Every
  identity interpolation on the four boundaries is bounded before concatenation (V1, V2). Both of
  review-01's counterexamples now refuse and record, at 50,000,000 units and at the engine
  maximum. Distinguishing tests exist, and D1–D30 are each rejected. The three unsupported claims
  are replaced in BASELINE and `reconstruction.md`. Implementation-01 is sealed, so the coming
  implementation-02 must supersede it explicitly. The adjacent content-diagnostic class is not
  closed in aggregate: K12C1-R2-AGG-01.
- **Review-01 O1:** closed by qualification (contract DEC-3, BASELINE, identity.md), which is one of
  the two dispositions O1 offered. Behavior is unchanged (V11).
- **Review-01 O2:** environment-only. Not reproduced on Node 25.
- **K12-R14-ID-01 and K12-R14-EVID-01:** closures stand. `probe-identity` P1–P3 and the I1–I7
  ablations were rerun at `c323e82` with the same results (V10).
- **K12-R13-ARCH-01, -DOC-01, -REC-01, K12-R11-ORDER-01 and the other K1.2 findings:** closures
  stand by reference. B17–B20 are rejected under the sealed runner, and B12–B14 are rejected under
  the adapted runner (see reruns).
- **Carried unchanged:** the P3 on the stale 007 introduction (reviews 12/13), and review-13's P3
  on the historical OPEN-5 paragraph.

## Per-criterion verdicts (preliminary, cumulative B..`c323e82`)

These are not binding: no H exists. They record where the payload stands, so the implementer can
act before handoff.

| Criterion | Verdict | Rationale |
|---|---|---|
| C1 | PASS | Scope first on all four surfaces; hidden ≡ missing; the identity is read 0 times for denied controls and once after control power (21-case matrix) |
| C2 | PASS | Replay/conflict precede fresh validation. The conflict reason is now bounded. The replayed receipt is the same object after terminalization, with no grant. R6 (lossy replay key) is rejected |
| C3 | **FAIL** | K12C1-R2-AGG-01: an entitled malformed proposal can throw with no refusal recorded. K12C1-R2-EVID-01: exact equality between two differing unrenderable identities, and between distinct unrenderable Emission keys, is unpinned (R4 and R7 survive). Identity-text refusals (DIAG-01) now pass |
| C4 | PASS | Acceptance path untouched except already-bounded history text; A1–A16 and B5 rejected |
| C5 | PASS | Unchanged; the O1 engine limit is qualified, not hidden |
| C6 | PASS | Unchanged; A7/A8 rejected |
| C7 | PASS | Unchanged; A6/A15 rejected |
| C8 | **FAIL** | Evidence only (K12C1-R2-EVID-01): a takeover naming a *different* unrenderable exchange is correctly refused at `c323e82`, but R5 survives, and under it E2 advances the current exchange. Every takeover refusal, including post-callback revalidation, is otherwise bounded and recorded (15 callback tests; D14–D22). B6 rejected under the adapter |
| C9 | **FAIL** | Evidence only: the same R5 gap on `recoverExecution` (shared `#openExchange`). The hold names the missing pin kind; exact pins stay inspectable; `entered/updated/cleared` preserved (V9; R2 and R11 rejected) |
| C10 | **FAIL** | Evidence only: the same R5 gap on `reportProtocolFailure`. The stale report is bounded; the DEC-8 payload rule is unchanged (V5; R12 rejected) |
| C11 | PASS | Unchanged; late-report suites rerun |
| C12 | PASS | Returned ≡ retained frozen refusal; one per-Execution position; whole-view equality asserted. The size of retained reasons falls under C3/AGG-01 |
| C13 | PASS | No new caller observation; the renderer uses only `length`, indexing and comparisons on primitives already captured. `diagnosticText` is reached only with values that are strings by construction |
| C14 | PASS | No new file or export; the helpers are internal to `envelope.ts`; conformance guard rerun |
| C15 | PASS | See the Layer-3 section. The BASELINE/DEC-5 aggregate claim is recorded under AGG-01 |

No criterion is DEFERRED.

## Preliminary verdict and handoff

K1.2-correction-01 round-2 payload at `c323e821dffbcd65114447a66593eeec9be699fb` (no report-bearing
H; base `a20d278185eaffc7f8b7489345a3624231ff6e6d`; release `6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb`;
contract revision 2): preliminary review 02, Claude Code session
`local_e046faff-6150-4997-a8c4-8614c63df5ae`, 2026-09-27 UTC.

- K12C1-R1-DIAG-01 is closed on this payload, subject to confirmation at H.
- New: K12C1-R2-AGG-01 (P2, pre-existing in cumulative K1.2) and K12C1-R2-EVID-01 (P2, evidence).
  C3, C8, C9 and C10 FAIL.
- P3 observations O-R2-1 to O-R2-3.
- This record binds to no H and certifies no later commit. 007 links it; the packet state stays
  CHANGES_REQUESTED.
- Invalidation-01's integration hold on K1.2 stays. There is no acceptance, no merge, and no K1.3
  or other successor release.

Compact correction handoff:

```text
Correct the same released packet K1.2-correction-01 on codex/k1.2-correction-01-activation-identity.
Base a20d278185eaffc7f8b7489345a3624231ff6e6d; reviewed H: none yet (preliminary review 02 of payload
c323e821dffbcd65114447a66593eeec9be699fb); prior review record review-01.md at 449b243.
Review record docs/development/work/K1.2-correction-01/review-02.md at the commit that records it.
Open findings K12C1-R2-AGG-01 and K12C1-R2-EVID-01 (required outcomes and counterexamples in
that record); observations O-R2-1..3. Owner supplemental decisions: decision-01, decision-02 (unchanged);
unresolved authority: none.
Apply 006 and 012: reconstruct the Outcome/control refusal-rendering subsystem by aggregate as well
as per fragment, then re-review the whole cumulative packet. Fix additional in-scope defects with
separate provenance. Use 008 for implementation-02 and 006 for new C/H plus evidence/push handoff.
No successor release.
```
