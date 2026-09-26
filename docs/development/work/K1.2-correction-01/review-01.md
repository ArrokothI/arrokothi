# Independent review — K1.2-correction-01, review 01 (candidate H 6541115)

## Identity

- Reviewer: Claude Code session `session_01YEtKHKNDFMvJqHJx4EgNJw`. Date 2026-09-26 UTC.
  `get_session` reports one model for `configured_model`, `session_context.model` and
  `external_metadata.last_served_model`. This session's harness policy keeps model identifiers
  out of repository artifacts. The model is therefore stated in the reviewer's delivered handoff,
  for the owner to transcribe under 006. The task instruction launching this session is the
  owner's selection of the reviewer. This session wrote no K1.2 or K1.2-correction-01
  implementation, report, contract, decision or earlier review.
- Correlated-assumption disclosure: [review-14](../K1.2/review-14.md) and
  [invalidation-01](../K1.2/invalidation-01.md), whose findings this candidate answers, came from
  another Claude Code session on the same model as this one (see review-14's identity section).
  [Decision-02](../K1.2/decision-02.md) was recorded by a Claude Code session of the same model
  family. I checked the candidate against the
  Layer-3 owners, the contract and running code, not against the reasoning in those records. The
  finding below reopens behavior that review-14 recorded as holding at H14.
- Repository/branch: `ArrokothI/arrokothi`, `codex/k1.2-correction-01-activation-identity`.
  `git ls-remote` at review time advertised `6541115e2e5389a7e5cff86f87d857b4eb486d7d` for the
  branch, which is H, and `a20d278185eaffc7f8b7489345a3624231ff6e6d` for `main`, which is B.
- Governing base and process baseline B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`. 006, 008 and
  012 are byte-identical at B and H.
- Prerequisites verified as ancestors of B after unshallowing: K1.1 H
  `52b1600f3b42e3a360fdc3395178f1d147edf304`, integration `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`;
  K1.1-correction-02 H `719abbf9e55e7489b6255a08cbb9e97a1e960a5e`, integration
  `954d31b00eb7f2412c22ccf7d4d079699f0c4032`.
- Release: `6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb` (review-14, invalidation-01 and the 007 row
  releasing this packet). It is C's sole parent. `docs/development/work/K1.2` is byte-identical at
  the release and at H, so decision-01, decision-02 and the historical K1.2 records are unchanged.
- Contract: [correction contract revision 1](contract.md) at C, carrying forward
  [K1.2 revision 9](../K1.2/contract.md).
- Payload C: `360538522be8c1b17d23948f632fd4f568a76ed0`. Candidate H:
  `6541115e2e5389a7e5cff86f87d857b4eb486d7d`, whose sole parent is C. B..H is linear: 48 commits, no
  merges. Previous reviewed H (K1.2): `c36cbe04f7c97f198794bfede972d4861247cca0`.

## Access, independence and limits

- Full local Git clone, unshallowed, with all branches fetched. Full pinned source at B, the
  release, C and H. Cumulative `git diff B H` is 236 files (50 outside `docs/development/work`).
- Read in full: the correction delta release..C (16 files, 710 insertions, 8 deletions); the new
  `activation-identity.test.ts`; the correction's `ablations.mjs`, `validate.mjs`,
  `check-records.mjs`, `reconstruction.md` and `implementation-01.md`; every Layer-3 and development
  document hunk in B..H that concerns Activation identity, decision-02, O1–O3 or this packet.
- Read in the cumulative source, because the corrected assumption reaches them: `submitOutcome`,
  `requestTakeover`, `recoverExecution`, `reportProtocolFailure`, `#openExchange`, `#accept`,
  `#refusal`, `#visible`, dispatch/creation ID minting, `envelope.ts`, `outcome.ts` capture and
  control capture, `identity.ts` and `refusal.ts`.
- Not re-read line by line: the unchanged B..H14 test bodies that review-14 read. They were rerun
  (1,137 kernel tests) and exercised through the 36 original ablations. Native Driver fidelity,
  persistence/process death, E gates and timing nondisclosure are outside the contract and were
  not examined.
- Environment: Node v22.22.2, npm 10.9.7, TypeScript 5.9.3, Linux 6.18 x86_64. All reruns ran in a
  clean detached worktree at exact H after `npm ci`, with `git status` empty before and after.
  Reviewer probes ran from the session scratchpad against that worktree and against a detached
  worktree at the release. No GitHub web or PR access was needed. No candidate file was changed.

## Candidate identity, ranges and evidence

- `C..H` is exactly the report's declared allowlist of 18 paths: the report, the correction's own
  007 row (`IN_PROGRESS` → `WAITING_FOR_REVIEW`, with no other row touched) and `validation-01/`,
  which holds output only (logs, JSON, manifest; no scripts). No payload is hidden in H.
- `release..C` changes no existing test (`check-records.mjs` and my own diff agree), and neither
  `identity.ts`, `values.ts`, `package-lock.json` nor creation-through-dispatch code in
  `coordinator.ts`. Integrated K1.1 creation and Execution-ID behavior are unchanged, so no owner
  amendment was needed.
- Implementer evidence: all 15 `MANIFEST.sha256` digests recomputed and **15/15 match**. The logs
  are from Node v26.8.1 on Darwin arm64. The `git diff --check` exit 2 is the four inherited
  whitespace diagnostics in sealed K1.2 logs, which `14-preserved-whitespace.txt` shows are
  byte-identical at B..release and B..C. I accept that disposition.

Reruns at exact H, by me. Raw logs and probes are attached under [`review-01/`](review-01/), with
digests in `review-01/MANIFEST.sha256`.

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | exit 1: 3,191 tests, 3,189 pass, 0 fail, **2 cancelled** (O2 below) |
| `npm run test:kernel` | exit 0; 1,137/1,137 |
| `npm run test:conformance` | exit 1: 1,945 tests, 1,943 pass, 0 fail, 2 cancelled (the same two) |
| `npm run test:sdk` | exit 0; 22/22 |
| `npm run check:builder-docs` | exit 0 |
| `npm run test:evals` | exit 0; 12/12 |
| `node docs/development/work/K1.2/ablations.mjs` | exit 0; control 1,137/1,137; **36/36 rejected** |
| `node docs/development/work/K1.2-correction-01/ablations.mjs` | exit 0; control 495/495; **7/7 rejected** (I1–I7 fail 241, 120, 181, 93, 25, 2 and 12 tests, matching the implementer) |
| `review-11/probe-partial-claim.ts` | exit 0; 8/8 `stale_exchange`, state unchanged |
| `check-records.mjs` | exit 0; ancestry and preservation verified; 8 files, 501 local links/anchors |
| reviewer `probe-identity.ts` at H / at release | see coverage rows R1, R2, R5, R7, R8 |
| reviewer `probe-maxlen.ts` at H / at release | see finding K12C1-R1-DIAG-01 |
| reviewer `probe-namespace.ts` at H | see observation O1 |

The two cancellations are in the untouched legacy file
`tests/conformance/effects/fast-slow-equivalence.test.ts` (byte-identical at B and H). They reproduce
identically at B in this environment, and review-14 recorded the same pair. They are not
attributable to the candidate.

Mechanical results (typecheck, suites, ablations, digests) are separate from the semantic
judgments, which rest on source reading and the reviewer probes.

## Independent obligation and interaction coverage

I derived this map from the 007 correction row, invalidation-01, review-14's required outcomes,
decision-02, `execution-cycle.md#outcome-acceptance`, `identity.md#runtime-attempt`, `values.md`
and the contract (DEC-1 to DEC-3 and the carried C1–C15), before reading implementation-01 or
`reconstruction.md`.

Producers: dispatch mints `${executionId}/activation-${n}`, and creation mints
`execution-` + the length-prefixed pack of (trusted namespace, scope, creation key). Scope and key
are bounded, well-formed text. The namespace is any host-supplied string. Minted IDs are
therefore unbounded in length, can contain unpaired surrogates (only through the namespace), and
grow a digit at exchanges 10, 100 and so on.

Consumers: the replay map, the terminal/currency/grant/content classification, the three controls
(`captureAttempt`/`captureRecovery` → `#openExchange`), derived Emission and result IDs, grants,
holds and history, inspection views, **and the refusal reasons that render the identity**.

| # | Obligation | Strongest schedule examined | Expected / forbidden | Evidence and result |
|---|---|---|---|---|
| R1 | ID-01: every minted ID answerable on all four surfaces | review-14 CE2 (65,490-unit key; exchanges 1–9 at 65,536; exchange 10 at 65,537); CE1; 131,072-unit namespace; both lone-surrogate namespaces | code hold entered and cleared; protocol hold; takeover to epoch 2; `complete` with an Emission at base+1; whole-view deltas | Tests (5 producer schedules) and `probe-identity` P1: all accepted at H; all `malformed_value` at the release. **Holds**, subject to O1 |
| R2 | DEC-3 replay | replay after takeover, resolution, the next dispatch and terminal state, with no grant; conflict under a long ID | same receipt object, nothing appended; conflict appends only its refusal | Tests and P1/P2: `replayed=true`, same receipt. **Holds** |
| R3 | EVID-01: the text class is pinned in both directions | `""`, `\ud800`, `\udc00`, 65,536, 65,537, astral 65,537; × terminal, no exchange, stale epoch, stale base, current; × 4 grants; × invalid content; 3 controls × control power | wrong text → `terminal_destination` / `stale_exchange` / `no_unresolved_exchange`, never content group; no text diagnostic | 240 + 180 tests; I1–I5 rejected (I2 is inverse X24). **Holds** |
| R4 | Non-string identities unchanged | boxed `String`, revoked proxy, missing; the existing number/object/throwing matrix | content group after authority; controls return `malformed_value` | Tests; I6 rejected; existing B17–B20 rejected. **Holds** |
| R5 | Exact equality, with no truncation, prefix parsing or normalization | prefix, suffix, NFD, upper-case and rope-equal variants; exchange 10 truncated to 65,536 units equals exchange 1's ID | variants `stale_exchange`, rope-equal accepted; the truncated string addresses exchange 1's record (`duplicate_conflict`) | P2/P2b. **Holds**. Exchange 9→10 would also reject a truncating implementation |
| R6 | Order: scope first, then control power, then capture | outsider (hidden vs missing) with a counting getter on all four surfaces | identical refusals, 0 identity reads | 4 tests. **Holds** |
| R7 | Internal consumers of long or surrogate IDs | `fail` with two Emissions under a surrogate namespace; `complete` plus an Emission at exchange 10 | distinct Emission IDs, typed result, no throw mid-commit | P1, P3. **Holds** within engine limits; see O1 |
| R8 | Refusal rendering of now-usable caller strings | caller with visibility only (no grant, no control power) sends a wrong identity of 50,000,000 units, one containing `\ud800`, or one near the engine's string maximum; open exchange, no exchange, and the controls | refusal returned **and recorded**; caller text in retained evidence bounded like the binding's other diagnostics | `probe-identity` P4 and `probe-maxlen`: **fails**, see K12C1-R1-DIAG-01 |
| R9 | O3: bounded unknown-field names | names of 1,000,000 units, surrogate, control characters, 128 and 129 units, on the envelope, `next` and an Emission | bounded, whole refusal, value unread | 15 tests; I7 rejected. **Holds** for field names |
| R10 | C1–C15 still pass on the cumulative packet | full suites, 36 original ablations, R11 probe | green, 36/36, 8/8 | Reruns above. **Holds** except R8 |
| R11 | Layer 3 | identity.md closure rule and binding text; execution-cycle step 2 and preamble; sources, roadmap, rewrite-index §3/§4 | one owner; no status; marker kept; no silent settlement; §5 items 1, 3, 18, 26 and 28 not committed | Read; see the Layer-3 section. **Holds**; the BASELINE wording is part of DIAG-01 |
| R12 | Records | BASELINE DEC-1 paragraph; 007 row; C..H allowlist; digests | agree with the code | Verified. The BASELINE's reason-size sentence is inaccurate (DIAG-01) |

Reconciliation with the implementer's map: the contract rows and `reconstruction.md` match R1–R7
and R9–R12 and add nothing I would remove. The reconstruction lists "diagnostics" among the
aliases it searched. Its producer/consumer table stops at classification and retained *accepted*
records. BASELINE and the report treat refusal reasons as holding only "legitimate" large IDs. The
wrong-Activation and no-exchange paths render caller-supplied strings that were never minted. The
tests assert that one refusal is recorded, but only with wrong strings of at most 65,537 scalars;
no test bounds the reason's size or reaches a size where rendering fails. That is the gap behind R8.

## Layer-3 changes reviewed as normative payload

- **One owner.** `identity.md#runtime-attempt` now states the producer/consumer requirement: a
  binding's representation must admit every ID its Kernel can mint, on Outcome submission
  (including the replay lookup) and on the controls. This follows from requirements that already
  existed: step 3 accepts a current proposal, a takeover or hold names the unresolved exchange, and
  recovery holds visibly. Review-14's C3/C8/C9/C10 failures relied on it. It restates an existing
  invariant; it does not introduce a new decision. `execution-cycle.md` step 2 links to it and
  keeps the decision-02 order. The rewrite-index §4 entry, the marker, `sources.md` and
  `roadmap.md` are navigation and provenance. No competing rule was found in Layer 1/2, the
  guides, `values.md` or `creation.md`.
- **No status on specification pages.** The identity text describes the in-process binding's
  representation choice and says it is the binding's. That follows the existing identity.md
  precedent ("Read that as one binding's answer, not the rule"). It records no build or acceptance
  status and no commit identity.
- **Open choices.** The new `OPEN(implementation)` marker keeps the choice open. It records the
  binding's answer and points at BASELINE, as rewrite-index §4 requires, and the prose states the
  openness. Nothing is settled silently.
- **Dangerous inferences.** §5.1 (takeover keeps the ID) holds. §5.3 holds: the representation stays
  implementation-owned. §5.18 holds: "Structural validity neither proves that an exchange exists
  nor authorizes answering it". §5.26 and §5.28 hold.
- **Review-14's O1 and O2** are addressed: `sources.md` and rewrite-index §3 now carry decision-02's
  provenance; the preamble and the `coordinator.ts` comment describe the actual diagnostic guarantee;
  step 2 has "after" again.
- The identity.md phrase "arbitrarily long strings" and the contract/BASELINE claim "no finite
  semantic maximum" hold semantically, but not against the engine's string limit. See O1.

## Findings

### K12C1-R1-DIAG-01 — P2 — caller-supplied Activation text reaches refusal reasons unbounded, and a long one throws instead of refusing

- **Provenance:** reviewer-found in this review. It is a regression that C introduces: the same
  inputs behave correctly at the release (H14 code).
- **Location:** `packages/kernel/src/envelope.ts` `acceptActivationIdentity` now admits every
  primitive string. Those strings are interpolated into reasons at
  `packages/kernel/src/coordinator.ts` in `submitOutcome`'s no-exchange and wrong-Activation
  `stale_exchange` refusals (the `Activation ${activationId} …` reasons, about lines 1417–1441) and
  in `#openExchange`'s `stale_exchange` refusal (about lines 1920–1927), which serves
  `requestTakeover`, `recoverExecution` and `reportProtocolFailure`. `#refusal` / `mintRefusal`
  retain the reason unbounded.
- **Governing sources:**
  - C3: "The refusal is recorded with its reason."
  - C8, C9 and C10: a takeover, recovery request or report naming a non-current exchange is refused.
  - `execution-cycle.md#outcome-acceptance`: "Record the reason; never silently drop or endlessly
    retry it."
  - K1.1's total-classification rule carried by C13 (caller-owned input becomes a located refusal,
    never an exception escaping the boundary).
  - 006/012 semantic-correction closure: trace a changed validation rule to every consumer.
  - The candidate's own O3 rule in BASELINE and `outcome.ts`: diagnostics must not retain
    arbitrary caller text.
  - Decision-02's disclosure intent (no pre-authority retention of caller identity diagnostics).
  - Review-14's O3 calibration, which rated unbounded field names P3 because "the grant-less path
    is clean (198 characters)".
- **Counterexample 1 (`probe-identity` P4):** an `observer` holds only visibility of the
  Execution: no grant and no control power. It submits an Outcome whose `activationId` is
  `"Z".repeat(50_000_000)` while an exchange is open.
  - At H: `stale_exchange`, and the retained, returned reason is **50,000,147** code units. A second
    visible principal reads it through `inspect`.
  - `"inject\ud800"` produces a retained reason containing an **unpaired surrogate**.
  - After resolution (no exchange) the reason is 50,000,148 units. A control-authorized takeover
    with the same string gives 50,000,093.
  - At the release, the same inputs give reasons of 195, 189 and 93 units and no unpaired surrogate.
- **Counterexample 2 (`probe-maxlen`):** a wrong `activationId` of 2^29 − 40 code units, just under
  V8's maximum string length.
  - At H, `submitOutcome` from the visibility-only caller (with an exchange open and again after
    resolution), and `requestTakeover`, `recoverExecution` and `reportProtocolFailure` from a
    control caller, all **throw `RangeError: Invalid string length`** out of the boundary.
  - **Zero refusals are recorded.** Accepted state is unchanged.
  - At the release, all five return refusals (`unauthorized_submission`, `malformed_value` ×3,
    `stale_exchange`) and five are recorded.
- **Impact:**
  - A principal with visibility alone, before any authority check, can make the Kernel retain
    arbitrary-size, arbitrary-code-unit caller text as refusal evidence that other principals
    read. The candidate's O3 correction closed that class only for the more privileged grant holder.
  - At the size edge, the Kernel records no refusal and a raw exception escapes all four surfaces.
  - No accepted state is corrupted; the exchange stays answerable. This is the unchanged severity
    scale's P2: a contract defect, plus the unsupported claims below. It is not a P1.
- **Unsupported claims to correct:**
  - BASELINE ("This bounds the diagnostic fragment, not the whole reason (which can include a long
    legitimate Execution/Activation ID)").
  - `implementation-01.md` ("O3 bounds field-name fragments, not entire reasons containing
    legitimate large identities").
  - `reconstruction.md` ("No early identity refusal or content leak is reintroduced").
  - These reasons are not limited to legitimate IDs.
- **Why the correction missed it:** the reconstruction followed the identity through
  classification into retained accepted records. It judged reason size by minted IDs only. The
  text-edge matrix asserts classification, one recorded refusal and the absence of diagnostic codes,
  but it stops at 65,537-scalar strings and never checks reason size. Before C,
  `acceptIdentityText` bounded and Unicode-checked every string that reached these reasons.
  Removing it moved that duty onto the renderer, and no one assigned it.
- **Required outcome** (the means are the implementer's choice within the contract; examples only):
  - Every refusal on `submitOutcome` and on the three controls that is reached with a
    caller-supplied primitive-string Activation identity is returned and recorded as a refusal,
    never an exception, for any string the engine can represent.
  - The caller-attributable text in returned and retained refusal evidence is bounded and does not
    retain arbitrary caller code units, consistent with the binding's own diagnostic rules (O3,
    DEC-8, delivery-failure bounds). Alternatively, the binding records an explicit, justified
    alternative in the contract and BASELINE.
  - Classification, the decision-02 order, replay and minted-ID answerability (R1–R7) are preserved.
  - Possible means include omitting the caller's identity from stale reasons, naming the Kernel's
    own current exchange instead, or rendering a bounded, sanitized fragment.
  - Correct the three statements quoted above and the DEC-1/BASELINE record.
- **Validation:**
  - Distinguishing tests, using a caller with visibility alone and a control caller: wrong identity
    of at least tens of millions of units, containing an unpaired surrogate, and near the engine
    maximum; open exchange, no exchange, and the `#openExchange` path of all three controls.
  - Assertions: returned equals retained, bounded reason, refusal recorded, whole-state equality,
    and a later valid answer still accepted.
  - An ablation that restores unbounded interpolation, rejected by the suite.
  - Because this is again the Outcome/control refusal subsystem (006's reconstruction trigger),
    trace every renderer of caller-supplied identity text, not only the two sites named here.

### Non-blocking observations (P3; reviewer-found unless noted)

- **O1 — the engine limit bounds the closure claim.** Take a trusted namespace just over half of
  V8's maximum string length (`probe-namespace`; namespace `2^28 + 1,000` units). Creation and
  dispatch succeed, and a no-Emission `continue` is accepted. But `complete`, `fail` and any
  Emission throw `RangeError` from `#accept`'s pre-apply construction of derived IDs
  (`result-`/`emission-` + `packIdentity([executionId, activationId, …])`), so that Execution can
  never finish. Nothing is mutated, and this is no regression: the release could not answer that
  exchange at all. The input is extreme and host-trusted. Still, "every minted ID remains usable",
  "no finite longest minted ID" (contract, BASELINE) and "arbitrarily long strings" (identity.md)
  should be qualified by the engine limit, or the composition should be closed under it.
- **O2 (environment):** two legacy cancellations under Node 22, described above; they reproduce at B.
- **Carried by reference, unchanged:** the P3 on review-12/13's stale 007 introduction, and
  review-13's P3 on the historical OPEN-5 paragraph.

## Prior findings

- **K12-R14-ID-01:** closed for every Kernel-minted identity within engine limits. The shared
  primitive-string classifier covers all four surfaces. Both review-14 schedules and the
  namespace-produced IDs are accepted, taken over, held and cleared with whole-result
  assertions (R1, `probe-identity` P1). I1, I3, I4 and I5 are rejected. Limit: O1.
- **K12-R14-EVID-01:** closed. The text-identity class is pinned in both directions across the
  decision-02 schedules and the three controls (R3). The inverse-X24 ablation (I2) is rejected, and
  the contract's coverage row is updated.
- **Review-14 O1 and O2:** closed (see the Layer-3 section).
- **Review-14 O3:** closed for unknown field names (R9, I7). The same class on the identity path is
  DIAG-01.
- **K12-R13-ARCH-01, K12-R13-DOC-01, K12-R13-REC-01, K12-R11-ORDER-01 and R1–R10:** closures stand by
  reference. Reruns: R11 probe 8/8, 36 original ablations 36/36 rejected. I found no contrary
  evidence apart from DIAG-01, which is new.

## Per-criterion verdicts (cumulative candidate B..H)

| Criterion | Verdict | Rationale |
|---|---|---|
| C1 | PASS | Scope precedes every other read on all four surfaces; hidden ≡ missing; 0 identity reads (R6) |
| C2 | PASS | Replay and conflict precede fresh validation for every minted string, including long, surrogate and post-terminal cases, with no grant (R2, R5) |
| C3 | **FAIL** | K12C1-R1-DIAG-01: a stale proposal carrying a long caller string is not recorded and throws; retained reasons carry unbounded, arbitrary caller text before authority. Minted-ID acceptance, the text class, the order, limits, capacity and no-retry otherwise hold |
| C4 | PASS | Atomic whole-batch acceptance at base+1, Emission IDs, one writer; unchanged suites and ablations |
| C5 | PASS | continue/complete/fail and the next exchange hold for minted IDs, including exchange 10 and the surrogate namespace; O1 is an engine-limit P3 |
| C6 | PASS | B-5 and terminal ingress unchanged; suites rerun |
| C7 | PASS | Effects refused by length, `await` refused naming K1.3; unchanged suites rerun, and A6/A15 are among the 36 rejected ablations. The correction does not touch this path |
| C8 | **FAIL** | K12C1-R1-DIAG-01: a takeover naming a non-current exchange with a long caller string throws instead of being refused. Takeover of every minted exchange, fencing and grant lifetime otherwise hold (R1) |
| C9 | **FAIL** | K12C1-R1-DIAG-01: the same for `recoverExecution`. Holds entered and cleared on minted IDs otherwise hold |
| C10 | **FAIL** | K12C1-R1-DIAG-01: the same for `reportProtocolFailure`. Protocol hold, bounded diagnostic and both clearing paths otherwise hold |
| C11 | PASS | Late reports and late Outcomes unchanged; settlement consumes no identity text |
| C12 | PASS | Retained records immutable; per-Execution positions; returned equals retained. The size of retained reasons is recorded under C3 |
| C13 | PASS | One observation of `activationId` (counted); no coercion of boxed strings; the classifier is `typeof` only; O3 names are indexed without live methods |
| C14 | PASS | 13 zone files; the new helper is internal; no export or dependency change; conformance guard rerun |
| C15 | PASS | One Layer-3 owner per rule, no status, marker kept, decision-02 provenance added. The inaccurate BASELINE sentence is recorded under DIAG-01 |

No criterion is DEFERRED.

## Verdict and status text for transcription

K1.2-correction-01 candidate H `6541115e2e5389a7e5cff86f87d857b4eb486d7d` (payload C
`360538522be8c1b17d23948f632fd4f568a76ed0`, base `a20d278185eaffc7f8b7489345a3624231ff6e6d`,
release `6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb`, correction contract revision 1):
independent review 01 (Claude Code session `session_01YEtKHKNDFMvJqHJx4EgNJw`, 2026-09-26) — **CHANGES REQUIRED**.
K12-R14-ID-01 and K12-R14-EVID-01 are closed within engine limits. Open: K12C1-R1-DIAG-01 (P2).
C3, C8, C9 and C10 FAIL. Invalidation-01's integration hold on K1.2 stays. No acceptance, no
merge, no K1.3 or other successor release. This review certifies no later administrative commit.

## Compact correction handoff

```text
Correct the same released packet K1.2-correction-01 on codex/k1.2-correction-01-activation-identity.
Base a20d278185eaffc7f8b7489345a3624231ff6e6d; reviewed H 6541115e2e5389a7e5cff86f87d857b4eb486d7d;
review record docs/development/work/K1.2-correction-01/review-01.md at the commit that records it.
Open findings K12C1-R1-DIAG-01; required outcomes and counterexamples are in that record.
Owner supplemental decisions: decision-01, decision-02 (unchanged); unresolved authority: none.
Apply 006 and 012: close the affected semantic subsystem and its dependencies, then re-review the
whole cumulative packet. Fix additional in-scope defects with separate provenance.
Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.
```
