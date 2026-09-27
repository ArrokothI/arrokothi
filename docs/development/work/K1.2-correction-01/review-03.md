# Independent review — K1.2-correction-01, review 03 (candidate H 312f258)

## Identity

- Reviewer: Claude Code desktop (Code tab) session `local_e046faff-6150-4997-a8c4-8614c63df5ae`,
  model `claude-opus-5-5`, 2026-09-27 UTC. The owner's task message selected this reviewer. This
  session wrote no K1.2 or K1.2-correction-01 payload, report, contract or decision. It wrote
  preliminary review 02 (recorded at `b18a729`), whose findings this candidate answers, and it
  gave the owner the fix prompt the implementer received. That prompt restated review 02's required
  outcomes and 006/008 duties. It prescribed no patch.
- Correlated-assumption disclosure: this review checks this reviewer's own earlier findings. Review
  01 and review 14 came from Claude Code sessions of the same model. To offset that, I derived
  the coverage below from the contract and governing sources before reading the report, reran
  every check myself, and wrote new ablations (N1–N10) aimed at the new renderer instead of reusing
  the implementer's G-series.
- Repository/branch: `ArrokothI/arrokothi`, `codex/k1.2-correction-01-activation-identity`.
  `git ls-remote` advertises `312f2584d14b0c168c2152c373a4f07d4a292d74` (H) for the branch and
  `a20d278185eaffc7f8b7489345a3624231ff6e6d` (B) for `main`.
- Governing base and process baseline B `a20d278185eaffc7f8b7489345a3624231ff6e6d`. 006, 008 and
  012 are byte-identical at B and H.
- Release `6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb`. Round 1: C1 `360538522be8c1b17d23948f632fd4f568a76ed0`,
  H1 `6541115e2e5389a7e5cff86f87d857b4eb486d7d`, review-01 at `449b243`. Unreported payload
  `67555e3`/`c323e82`, preliminary review 02 at `b18a729d989dea334a86ec08bdf8773ee77de4db`.
- Payload C `6d9fbb3db4955ee2216fedf0d0b69c8e104367bf` (sole parent `b18a729`). Candidate H
  `312f2584d14b0c168c2152c373a4f07d4a292d74` (sole parent C). B..H is linear: 54 commits, no merges.
- Contract: [correction contract revision 3](contract.md) at C, carrying forward K1.2 revision 9.

## Access and limits

- Full local clone, fetched. A clean detached worktree at exact H with `npm ci` (lockfile
  unchanged since B). `git status` was empty before and after every run. The earlier detached
  worktrees at `c323e82` and at the release were kept for comparison.
- Environment: Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64, 8 GiB RAM. This is
  the same toolchain family as the implementer's; review 01's Node 22/Linux reruns are not repeated.
- Read in full: the delta `b18a729..C` (12 files): `envelope.ts`, `outcome.ts`, `coordinator.ts`
  hunks, the new `aggregate-refusal.test.ts`, contract revision 3 and its delta, `coverage-03.md`,
  the `reconstruction.md` delta, and the changed `ablations.mjs`, `check-records.mjs` and
  `validate.mjs`. Also read: `implementation-02.md`, the 007 row, and the implementer's
  `08-correction-ablations` and `20-review-aggregate` logs.
- Round-2 payload `449b243..c323e82` was read in full for review 02 and is carried forward
  cumulatively here. The code it introduced (`diagnosticIdentity`, DEC-4 sites, the refusal-diagnostics
  tests) is unchanged in C except where the delta above says so.
- Surrounding cumulative source re-read where the change reaches it: `submitOutcome`'s content
  group, the three controls' `malformed_value` paths, `redeliver`, `#refusal`/`mintRefusal`, and
  `values.ts` `capture`/`captureObject` (path building inside the `try` that turns throws into
  `unstable_representation`).
- Not re-read line by line: pre-round-2 test bodies and unchanged K1.2 paths, which reviews 13, 14
  and 01 read. They were rerun, and both original-ablation runners exercise them. Out of contract:
  native Driver fidelity, persistence/process death, E gates, packaging.

## Candidate identity, ranges and evidence

- `C..H` is exactly the report's 30-path allowlist: `implementation-02.md`, 28 `validation-02/`
  outputs and manifest (JSON, text, manifest; no scripts), and the correction's 007 row
  (CHANGES_REQUESTED → WAITING_FOR_REVIEW). The new row still links review 01 and review 02. No
  other row changes.
- All 27 `validation-02/MANIFEST.sha256` digests recompute and match. 28 files are attached; the
  manifest does not list itself.
- Sealed records are unchanged since their recording commits: all of `work/K1.2/`, and
  `implementation-01`, `validation-01`, `review-01`, `review-02` and their folders (checked with
  `git diff`, and by the rerun `check-records.mjs`). `mental-model/` is unchanged in `b18a729..H`.
- Only four test files were added since the release, and no existing test body changed.
  `identity.ts`, `values.ts` and the lockfile are unchanged. Creation-through-dispatch code is
  unchanged except for the single declared redelivery-hold line (`check-records` normalizes exactly
  that line).
- The implementer's evidence was inspected, not relied on. Its figures agree with my reruns below.

## Reruns at exact H (this reviewer)

All in the clean worktree at H, sequentially for the memory-heavy probes. The raw logs are in
[`review-03/`](review-03/). Mechanical results are kept separate from the semantic judgments above
and below.

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | exit 0; 3,267/3,267, 0 cancelled/skipped |
| `npm run test:kernel` | exit 0; 1,213/1,213 (1,179 + 34 new) |
| `npm run test:conformance` | exit 0; 1,945/1,945 |
| `npm run test:sdk` | exit 0; 22/22 |
| `npm run check:builder-docs` | exit 0; 72 files, 1,806 links, 38 imports |
| `npm run test:evals` | exit 0; 12/12 |
| sealed `K1.2/ablations.mjs` | exit 1; control 1,213/1,213; 32/36; B6/B12/B13/B14 NOT APPLICABLE (disclosed anchor drift) |
| `original-ablations-02.mjs` (adapter) | exit 0; control 1,213/1,213; **36/36 rejected** |
| correction `ablations.mjs` | exit 0; control 571/571; **67/67 rejected** (I1–I7, D1–D35, R1/R2/R4–R12, G1–G14) |
| reviewer `reviewer-ablations-h2.mjs`, full kernel suite per mutant | control 1,213/1,213. N1, N2, N4, N6, N7, N8, N9 **rejected**. N3 and N5 **survive** (O-R3-1). N10 survives as intended: it is an equivalence check, since takeover issues carry no value root |
| review-11 `probe-partial-claim.ts` | exit 0; 8/8 `stale_exchange`, state unchanged |
| `check-records.mjs` | exit 0; 11 files, 538 links/anchors |
| review-01 `probe-identity.ts` | P1–P3 unchanged; P4 reasons 111–165, no lone surrogate |
| review-01 `probe-maxlen.ts` | 5 × `stale_exchange` (104–158), 5 refusals recorded |
| `probe-diagnostics-maxlen.ts` | 21/21 at `MAX_STRING_LENGTH − 16` |
| review-01 `probe-namespace.ts` | O1 unchanged: `continue` ok; `complete`/Emission `RangeError` (qualified limit) |
| review-02 `probe-aggregate.ts 130 980` | Outcome: `malformed_envelope`, **8,621 units, 1 refusal**, later answer accepted. Recovery: `malformed_value`, **519 units**. At `c323e82`: `RangeError` with 0 refusals, and 92,464,414 units |
| same with `PRE=1` | no grant: `unauthorized_submission` (216); stale epoch: `stale_exchange` (144); one refusal each |
| review-02 `probe-equality.ts` | E1/E2 `stale_exchange`, E3 accepted |
| review-02 `probe-cost.ts` (peak footprint incl. ~100 MB baseline) | accept 0.64 s / 102 MB; refuse `undefined` 1.13 s / 288 MB; refuse constructor names 1.76 s / 338 MB (at `c323e82`: 4.7 s / 1,017 MB) |
| `git diff --check` | B..H exit 2: only sealed K1.2/validation-01 logs and `validation-02/12-diff-check.txt`, which quotes them (as disclosed); `b18a729..C` exit 0 |

## Independent obligation and interaction coverage

Derived from review 02's required outcomes, contract revision 3's DEC-4/5, K1.2 DEC-2, decision-02,
`execution-cycle.md#outcome-acceptance` and `values.md`, before reading implementation-02.

| # | Obligation / source | Strongest schedule examined | Expected / forbidden | Evidence and result |
|---|---|---|---|---|
| W1 | AGG-01: every content-rendering refusal on `submitOutcome` and the three controls is returned and recorded, never thrown, for any proposal within per-root limits and Emission capacity | review 02's witness: one root of 130 × 4,096 references to an object with a 980-unit inherited constructor name (532,480 issues); the same root in all three recovery lists; progress + two Emissions + result/error at 4,096 issues each | one refusal, returned ≡ retained, finite stated bound, later valid answer accepted | Source: every Outcome/control content reason goes through `explainDiagnosticIssues`, whose loop renders at most 8 details and otherwise only increments counters. Rerun `probe-aggregate` at H (see reruns); `aggregate-refusal.test.ts`; G1/G2/G3, N2 and N7 rejected. **Holds** |
| W2 | DEC-5 bound: at most 16,384 units regardless of N or Emission capacity | derivation: 8 details, each < 1,280 (root < 64, path ≤ 128, code ≤ 32, message ≤ 1,024), plus a summary over the code vocabulary | the vocabulary is finite and Kernel-owned; counts are bounded | I checked the vocabulary myself: every Outcome/control issue code is one of 17 literals in `values.ts`/`envelope.ts`/`outcome.ts` (`ValueIssueCode` is a typed subset). Counts are bounded by JS array length (≤ 10 digits). Non-root detail paths are Kernel labels, with unknown names already bounded to 128. The longest root label is `available.runtimeContractRevisions` (32); `emissions[i].value` stays < 64 for any safe-integer capacity. The bound-proof test pins 17 codes. **Holds** |
| W3 | DEC-5 semantics: details keep capture order; every remaining issue contributes an exact count, codes in first-remaining-occurrence order; the root label stays separate; projection happens at render; `root` is read own-only | edges 0/8/9; late codes after 8; path 128/129; message 1,024/1,025; `Object.prototype.root` getter | as specified | Tests; G4/G5/G10/G11/G12/G13/G14 and N1/N4/N6 rejected. Presentation details not pinned: N3 (controls rendering messages) and N5 (`root.[i]` spelling) survive. See O-R3-1. **Holds** |
| W4 | DEC-2/decision-02: content diagnostics still decide nothing and are not retained before authority; a combined refusal names the content group | aggregate root with no grant, and with a grant at a stale epoch; malformed identity + many content issues | `unauthorized_submission` / `stale_exchange` with no content text; `malformed_envelope` with the identity issue first | Test "aggregate content stays behind currency and authority"; rerun pre-authority probe; B12–B20 rejected under the adapter. **Holds** |
| W5 | EVID-01: exact equality where two unrenderable identities differ | wrong = current + `-wrong` under long, `é`, high- and low-surrogate namespaces; the Outcome carries a **valid grant**; each control; two distinct 129-unit and non-ASCII keys | `stale_exchange` / both keys accepted | 16 + 2 tests; R4/R5/R7 rejected (4/12/2 failures); rerun `probe-equality` gives E1/E2 `stale_exchange` and E3 accepted. **Holds** |
| W6 | EVID-01 edges | path 128/129 and message 1,024/1,025 on Outcome and recovery roots | exact edges | Tests; R9/G6/G7/G8 rejected. **Holds** |
| W7 | O-R2-1: no eager projection before authority | source; G9; rerun `probe-cost` | capture stores raw issues plus a Kernel root label; projection only in the renderer | `appendRootIssues` copies fields only. Rerun cost figures are in the reruns table above. **Holds** for the round-2 increment; the integrated K1.1 excess remains (O-R3-2) |
| W8 | O-R2-2: redelivery hold bounded | long + surrogate namespace; code hold and protocol hold | minted fragment omitted; the DEC-8 payload kept | Two tests; D35 and N9 rejected. **Holds** |
| W9 | DIAG-01 not regressed | review-01 `probe-identity` and `probe-maxlen`; engine-maximum probe | as at `c323e82` | Reruns table above. **Holds** |
| W10 | Cumulative C1–C15 | full suites; sealed and adapted original runners; R11 probe | green; 36/36 under the adapter | Reruns table above. **Holds** |
| W11 | Records | allowlist, manifest, 007, sealed paths, O-R2-3 disclosure | exact | Verified above; the report discloses sealed exit 1 and diff-check exit 2, and labels the adapter as substitute evidence. **Holds** |

Reconciliation with the implementer's map (`coverage-03.md`, `reconstruction.md`): they match
W1–W11. The implementer adds the several-root regression test and the code-inventory tripwire,
which I would keep. My additions are N3/N5 (presentation not pinned, P3) and the vocabulary and
label-length check behind W2, which I did myself rather than relying on the tripwire test.

## Layer-3 changes

None in this round: `mental-model/` is byte-identical at `b18a729` and H. The round-1/2 Layer-3
payload (identity.md's producer/consumer rule and engine-allocation qualification, rewrite-index §4
entry, sources/roadmap provenance) was reviewed as normative payload in reviews 01 and 02 and is
unchanged. Rechecked against the round's changes:

- DEC-5's detail/summary format and 16,384-unit bound are binding choices. They live in the
  contract and BASELINE, not in Layer 3. The only Layer-3 constraint on refusal text is "Record the
  reason" (OA-5), which the bound serves.
- No status on specification pages. The `OPEN(implementation)` marker is unchanged.
- §5.30 ("a rendered string stands in for a structure"): the new summary is prose evidence and
  feeds no comparison. The code-hold `updated` comparison noted in review 02 is unchanged and
  still pinned (R11 rejected).

## Findings

No P0, P1 or P2 finding.

### Non-blocking observations (P3; reviewer-found)

- **O-R3-1 — two DEC-5 presentation details are unpinned.**
  - DEC-5 renders messages "for Outcomes" only. Reviewer ablation N3 makes the recovery control
    render messages too, and it survives the full 1,213-test suite.
  - Reviewer ablation N5 spells a bracketed value path as `root.[i]` instead of `root[i]`, and it
    also survives.
  - Neither mutant can exceed the 16,384-unit bound or emit unprojected text: messages are
    projected either way, and the root label is still present. So neither affects C3 or the DEC-5
    bound.
  - The bound-proof test finds codes by the regex `code: "…"`. A future code written in another
    syntactic form would escape that tripwire; W2's derivation would still need re-checking.
  - Worth a test each when this subsystem is next touched. Not required for acceptance.
- **O-R3-2 — `values.md` refusal cost, for the owner.** Owner: integrated K1.1 value capture, not
  this packet. See the `probe-cost` figures in the reruns table above.
  - Refusing one pathological root still costs roughly 2–3× the time and memory of accepting an
    at-limit root.
  - Eager Outcome capture runs before authority and repeats that cost for each of up to 258 roots.
    So any visible principal can impose it per request.
  - This is the pre-existing excess review 02 attributed to integrated K1.1 value capture
    (`values.ts` builds one issue object per refused position). It is not this packet's to change:
    007 requires an owner amendment for integrated K1.1 behavior, and `values.ts` is unchanged here.
  - The round-2 increment (eager projection) is gone (W7). Implementation-02 correctly makes no claim
    that the broader `values.md` obligation holds.
  - I recommend the owner decide whether a separate K1.1 value-capture item, such as capping issues
    per root in capture, or a K1.2-OPEN-2 transport note, should carry it.
- **Carried unchanged:** review-01 O1 (the engine-allocation limit on derived Emission/result IDs is
  qualified in the contract, BASELINE and `identity.md`; `probe-namespace` still reproduces it);
  the P3 on the stale 007 introduction (reviews 12/13); review-13's P3 on the historical OPEN-5
  paragraph.

## Prior findings

- **K12C1-R2-AGG-01: closed.**
  - Every Outcome and control content reason renders through `explainDiagnosticIssues`: at most
    eight projected details, then exact per-code counts drawn from a fixed 17-code vocabulary.
    DEC-5's stated bound of 16,384 units is derivable from source (W2).
  - Review 02's witness now gives one recorded refusal of 8,621 units (Outcome) and 519 units
    (recovery), where it previously threw or produced 92 million units. A later answer is accepted.
  - G1/G2/G3, N2, N7 and N8 are rejected.
  - DEC-5's former premise about DEC-2 is withdrawn in the contract, BASELINE and reconstruction.
- **K12C1-R2-EVID-01: closed.**
  - Two differing unrenderable identities are now tested on the Outcome path (with a valid grant)
    and on every control, under long, non-ASCII and both lone-surrogate namespaces.
  - Distinct unrenderable Emission keys are accepted.
  - The path and message edges are exact.
  - R4/R5/R7/R9 equivalents are rejected with a clean control.
- **K12C1-R1-DIAG-01: closed** (the round-2 fix is carried forward; see the reruns of review 01's
  probes and the engine-maximum probe).
- **O-R2-1:** the round-2 increment is removed (W7). The pre-existing K1.1 remainder is O-R3-2.
- **O-R2-2:** closed. Redelivery is bounded, D35/N9 are rejected, and the provenance is corrected.
- **O-R2-3:** closed. The report discloses both non-zero exits and labels the adapted runner as
  substitute evidence.
- **K12-R14-ID-01 and K12-R14-EVID-01:** closures stand. I1–I7 are rejected, and `probe-identity`
  P1–P3 are unchanged.
- **K12-R13-ARCH-01, -DOC-01, -REC-01, K12-R11-ORDER-01 and earlier K1.2 findings:** closures stand
  by reference. B12–B20 and all 36 are rejected under the adapter, and R11 gives 8/8.

## Per-criterion verdicts (cumulative candidate B..H)

| Criterion | Verdict | Rationale |
|---|---|---|
| C1 | PASS | Scope, then control power, then capture on all four surfaces. The 21-case matrix counts identity reads (0 for denied controls, 1 after control power). Unchanged this round; rerun |
| C2 | PASS | The exact-text replay lookup precedes terminal/currency/grant; the conflict reason is bounded; the replayed receipt is the same object, with no grant. R6 is rejected |
| C3 | PASS | Decision-02 order unchanged (B12–B20 rejected under the adapter). Every content refusal, including review 02's aggregate witness, is returned and recorded within DEC-5's 16,384-unit bound (W1, W2). Exact equality between differing unrenderable IDs and keys is pinned (W5). E-6 limits, capacity and whole-refusal state are unchanged |
| C4 | PASS | The acceptance path is untouched this round. A1–A16 and B5 are rejected; accepted keys and IDs use exact captured inputs (R1, R6, R7 rejected) |
| C5 | PASS | Unchanged; exchange 10 and the surrogate-namespace lifecycle are rerun in `probe-identity`. The O1 engine limit is qualified, not hidden |
| C6 | PASS | Unchanged; A7/A8 are rejected; the terminal-ingress suites are rerun |
| C7 | PASS | Unchanged; A6/A15 are rejected; `effects_unsupported` and `wait_unsupported` still appear in the combined refusal (late-codes test) |
| C8 | PASS | A takeover naming a different unrenderable exchange is refused (W5; R5 rejected); every refusal, including post-callback revalidation, is bounded; B6 is rejected under the adapter; the malformed-request reason is bounded |
| C9 | PASS | Same for recovery; all three roots aggregate within bound; exact pins and `entered`/`updated`/`cleared` are preserved (R2, R11 rejected); the redelivery hold refusal is bounded (N9 rejected) |
| C10 | PASS | Same for protocol reports; the DEC-8 explicit payload is kept (R12 rejected), including through redelivery |
| C11 | PASS | Unchanged; the late-report and delivery-attribution suites are rerun |
| C12 | PASS | Returned ≡ retained frozen refusal with one per-Execution position (`assertOnlyRefusal` in every new case); raw capture issues are not retained |
| C13 | PASS | No new caller observation: capture is still eager, and raw issues are copied from Kernel-built records. The renderer reads `root` through a load-time own-descriptor (G14 rejected; pollution test) |
| C14 | PASS | No new source file, export or dependency; the conformance guard is rerun |
| C15 | PASS | No Layer-3 change this round; the earlier Layer-3 payload is unchanged and was reviewed. DEC-4/5, BASELINE and the reconstruction agree with the code; the withdrawn DEC-2 premise is recorded |

No criterion is DEFERRED.

## Verdict and status text for transcription

K1.2-correction-01 candidate H `312f2584d14b0c168c2152c373a4f07d4a292d74` (payload C
`6d9fbb3db4955ee2216fedf0d0b69c8e104367bf`, base `a20d278185eaffc7f8b7489345a3624231ff6e6d`,
release `6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb`, correction contract revision 3): independent
review 03 (Claude Code session `local_e046faff-6150-4997-a8c4-8614c63df5ae`, 2026-09-27) — **ACCEPT**.

- K12C1-R2-AGG-01, K12C1-R2-EVID-01 and K12C1-R1-DIAG-01 are closed, together with review 14's
  K12-R14-ID-01 and K12-R14-EVID-01, which this packet was released to close.
- C1–C15 PASS on the cumulative candidate. B..H contains all of K1.2 (through H14) plus this
  correction, so this is the acceptance of the whole corrected K1.2 at exact H. The K1.2 row's
  historical H14 ACCEPT and invalidation notice stay as recorded.
- P3 observations O-R3-1 and O-R3-2 do not block.
- Acceptance binds to exact H only. It certifies no later administrative, cleanup or merge commit.

What this acceptance does not do:

- It does not lift invalidation-01's hold by itself. Integrating K1.2 (H14 plus this correction)
  remains an owner action under 006.
- No merge is performed.
- No K1.3 or other successor is released.
