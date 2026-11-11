# Independent review 04 — K1.4

**Verdict: CHANGES REQUIRED**, bound to **H `1b98a76e625ef187ba179fdad2e823ac4dabd521`**.
The owner-approved L-36/L-37 dispositions are supported by the observed behavior, and F1–F3 are real
behavioral kills. The recount is correct. One P2 claim-consistency finding remains: current Driver
comments still promise ended native members, and the new L-36/baseline wording overstates which
rejected cleanup calls produce a protocol hold. The required correction is prose only; no new runtime
patch, expanded census or reopened earlier disposition is requested.

## Identity, authority and scope

- Reviewer: Codex, GPT-6, independent reviewer session, **2026-11-11 (America/New_York)**.
  This session did not implement the candidate. No subagents or delegated reviews were used.
- Remote: `https://github.com/ArrokothI/arrokothi.git`; subject branch `claude/k1.4`.
- **B:** `608f9ece44dbe42b78974bdac9e7ddcd33697705`.
- **C:** `697922e251a572d0c96f7a02c1b646b607c351fc`.
- **H:** `1b98a76e625ef187ba179fdad2e823ac4dabd521`.
- **Previously reviewed H:** `b1769c0fcdb73bfc6297551b87f80e74bc6cb588`.
- Review branch: `codex/k1.4-review-04`, created directly from H. No merge, production correction,
  integration, ledger transcription or successor release was performed. Before publication,
  `ls-remote` advertised the exact requested H for `claude/k1.4` and the exact review-03 commit below;
  the new review branch did not exist remotely.
- Governing correction contract: [brief 04 at the pinned review-03 commit](https://github.com/ArrokothI/arrokothi/blob/5e36d514fb10347a182bbeaa36879ce9074fe72a/docs/development/work/K1.4/review-03/brief-04.md),
  R3-LIMIT, R3-CLAIMS, R3-CORPUS and R3-PRESERVE, with owner choices [05](owner-choice-05.md)
  and [06](owner-choice-06.md). Scope is the delta from previous H to H and regressions it introduces.
  [Brief 01](brief-01.md) supplies K14-1..K14-6; K14-G remains K1.4-gate's.
- Read by immutable Git commit, without merging: [review 03](https://github.com/ArrokothI/arrokothi/blob/5e36d514fb10347a182bbeaa36879ce9074fe72a/docs/development/work/K1.4/review-03.md),
  brief 04 and `review-03/probes.mjs` at **`5e36d514fb10347a182bbeaa36879ce9074fe72a`**;
  owner choices 05/06, [implementation-04.md](implementation-04.md) and all five attached logs at H.
  Review 03's already-closed findings remain closed; this review does not repeat its full original search.
- Policy: AGENTS.md, 006, 008 and 012 at B/H; 017 at H includes the two owner-approved limits being
  reviewed. Architecture and slice-audit skills used. Canonical ownership was located through the
  mental-model overview/reference, then integration, lifecycle and evidence, with the major abstraction
  pages, development front door and baseline. This is **Driver/native fidelity and evidence wording**,
  not a change to Kernel semantics or deployment guarantees. The prior-art reading map's cancellation
  and evidence sections were background only; no third-party assertion supplies acceptance evidence.
- Full local source, Git, shell and downloaded CI artifact access were available. Local executions used
  H's source and the installed workspace dependencies, Darwin arm64, Node **v26.10.0**. The exact commands
  and evidence locations are in [review-04/README.md](review-04/README.md).

### Owner supplements supplied with this review

The owner supplied these verbatim answers, dated **2026-11-11**:

> Deviation 1, L-36's CANCELLED variant: "Confirm both cases".

> Deviation 3, driver.ts comments still saying the cascade ends the lineage: "Review as is".

The owner also explicitly asked that false current comments be identified and said a comment-only fix
would be taken in cleanup. These are owner supplements, not implementer or reviewer inventions.
Deviation 1 is resolved. Deviation 3 authorizes reviewing the unchanged candidate; it does not make the
comments true or waive brief 04's R3-CLAIMS criterion.

## Candidate and CI binding

The independently executed [candidate check](review-04/candidate.json) returns `facts_verified`.
**C..H contains exactly C's `administrative_files`:**

1. `docs/development/007-work-packets.md`
2. `docs/development/work/K1.4/implementation-04.md`
3. `docs/development/work/K1.4/progress.md`

`verification.json` is identical at C and H. No source, test, fixture or evaluator changed after C.
The [independent evidence check](review-04/evidence.json) compares all **196 production `src` files**
in the two trees: none changed since **`3e8b4bac60266fda3e277ae0dd381c4936e15ff3`**.
`packages/kernel/src` and `packages/core/src` are also unchanged from B. The three registered mutation
specifications remain identical to B. The cumulative B..H changes are retained from the earlier review
except for the enumerated 20-file correction delta; every delta hunk was inspected against brief 04.

I independently fetched [Packet verify run 43088962951](https://github.com/ArrokothI/arrokothi/actions/runs/43088962951),
job **130760659762**, and downloaded artifact **13893544648**,
`packet-verify-697922e251a572d0c96f7a02c1b646b607c351fc`.
The workflow metadata's `main` SHA is B, not the tested revision. The [job-log excerpt](review-04/ci-revision.log) says:

```text
2026-11-11T19:37:48.9487435Z   REVISION: 697922e251a572d0c96f7a02c1b646b607c351fc
2026-11-11T19:37:58.1134624Z HEAD is now at 697922e2 K1.4 round 4: keep design 02 preserved
```

The downloaded `verify.json` and [run.txt](review-04/ci-run.txt) also bind revision/head to C.
I counted the array in the downloaded [summary.json](review-04/ci-summary.json): **19 checks,
19 `passed: true`, `checks_passed`**, exit 0. Repository tests **5,054**, archive **4**, examples **18**,
each with zero failures/cancellations/skips/TODOs; tool tests **777**. The raw verification payload
reports **339 + 358 + 238 killed** in the three registries. Typecheck, inventory/adoption, censuses,
sweeps, race search, value-cost checks and builder docs passed. `area-gate: reported` is not E1 acceptance.
The downloaded ZIP's SHA-256 matches GitHub's artifact digest; identities and retention are in the README.

**No CI run, CI retry or full local Packet verify was started.** The existing CI is inspected evidence;
the executions below are reviewer reruns. Live providers, large-memory timing, durable recovery,
isolation, publication and K14-G are not claimed.

## Independent coverage and results

The coverage map was derived from brief 04 and the owner decisions before adopting report 04's
explanations: match each limit to its counterexample and owner; compare current claims and preserved
history; discriminate each fallback under a single request-cascade fault; and prove the correction
does not change production or remove the earlier corpus. The report agrees on that scope. Its disclosed
comment deviation and the unqualified cleanup-rejection sentence prevent full claim closure.

| Criterion / closing method | Independent check and observable result | Disposition |
|---|---|---|
| R3-LIMIT / deterministic records and traces | L-36 names FAILED with accounted-input acknowledgment, native RUNNING/pending cancellation, no hold/recovery/later step; the confirmed CANCELLED variant is maintained. Trigger: real store/definition failure requiring trustworthy cleanup/recovery. Fix: legacy Driver fidelity in R1, K3 coordination for persistence. L-37 names checked syntax, both static exclusions plus runtime-computed names, trigger and touching-packet/TOOLS-02 owner. | **FAIL narrowly:** the intended scopes/owners are valid; L-36's final blanket rejection-to-hold sentence is false (R4-01). No widening of either approved limitation is needed. |
| R3-CLAIMS / bounded text and diff review | Baseline, both guides, mapping, verification limits, test header, census comment, current report and Driver comments compared with the three review-03 scenarios and the CANCELLED variant. Equivalence reasons removed as required; dated corrections preserve original lines. | **FAIL:** R4-01, remaining cleanup claims. |
| R3-CORPUS / executable corpus | All eight review-03 cases have maintained counterparts. The original file still gives 3 passes/5 expected failures; B-TERM-LIMIT and L-37 tests assert actual limited behavior. F1–F3 distinguish real native state under one fault. | **PASS**. No unpromoted case is credited as a guarantee. |
| R3-PRESERVE / exact trees, diff and regression executions | No production source changes; original 17 rows and 24 pair dispositions retained; scheduling, accounting, cleanup-hold and fallback corpus runs. Existing source-ablation and prior-probe logs inspected. | **PASS**. No delta-introduced behavioral regression found. |

### Executions and the oracle

| Reviewer execution | Result |
|---|---|
| Bridge suites, wrapper, binding surface, bridge/mapping/landing-zone/builder-docs architecture tests | **507/507**, 43 suites, zero failed/cancelled/skipped/TODO; [targeted.log](review-04/targeted.log). Includes all **90** termination tests. |
| Exact review-03 `probes.mjs`, unchanged assertions | **3 pass, 5 fail**, exit 1, as expected under L-36/L-37; [prior-probes.log](review-04/prior-probes.log). |
| Candidate's exact F rows, exposed with test registration disabled, nine baseline/removal executions | All reviewer assertions pass; [inspect-oracle.mjs](review-04/inspect-oracle.mjs), [oracle.jsonl](review-04/oracle.jsonl). |
| Rejected-request cleanup claim probe through public `app.cancel` | **1/1 pass** observing the counterexample to the prose; [probes.mjs](review-04/probes.mjs), [probes.log](review-04/probes.log). |

The independent recount from the executable table is **20 baseline rows, 16 labels, 30 removals,
16 behavioral kills and 14 executed equivalences (1 empty obligation, 13 redundant)**. Fifteen labels
have a killing row; only `initial-input` remains equivalent-only through T6's empty obligation.
The maintained kill check requires a row `AssertionError`, not just a missing label. The new kills are
specifically the terminal-state assertions:

| Row / removed fallback | Real fallback after one rejected request cascade | Only that fallback removed, same one fault |
|---|---|---|
| F1 / `cancel.application` | Parent and child CANCELLED | Parent and child WAITING |
| F2 / `cancel.exchange-start` | Existing root CANCELLED | Root READY |
| F3 / `cancel.forward-loop` | Root CANCELLED | Root READY |

Kernel state is CANCELLED in each row. These are native-state differences, not injector failures,
timeouts or label-count artifacts. The unablated rows also assert no later native work.

**Deviation 2 is acceptable.** `inRequestScope` wraps `requestCancellation` with AsyncLocalStorage;
the mark follows the asynchronous request cascade. The injected read additionally requires the cascade
stack. Observation reads and the separately started fallback therefore do not consume that fault.
The baseline and each fallback-removal execution record **one** fault. Removing `cancel.request`
removes the selected failing operation, so those three redundancy executions record **zero** faults;
the remaining real fallback ends every member. This is a site-scoped fault schedule, not a claim that
a zero-fault execution survived one fault. The explicit counts, native state assertions and restored
prototype identities were independently checked. It earns row-specific equivalence only, not a proof
of redundancy under arbitrary failures or interleavings.

The preserved implementation logs were inspected rather than rerun: prior reviews **10/10**;
design-check-04 defect assertions **0/2** because the child completes and cleanup failure is held;
hold-cascade source mutant **507 pass/2 fail of 509**, both T13; five source ablations **5/5 caught**
with passing controls. Their distinct command sets/counts are not conflated with the 507-test reviewer run.

### Claims and history closure

- L-36's two original failed-step cases still produce Kernel FAILED/native RUNNING/pending cancellation,
  one acknowledged input, no cleanup hold and zero later steps. The maintained mid-step cancellation
  variant produces Kernel CANCELLED/native RUNNING/pending cancellation and resolves `app.cancel`.
  The owner confirmation covers both. This is a disclosed Driver limitation, not Kernel failure or a
  claim that native processing occurred.
- L-37 agrees across the register, verification limits, test header and census comment. The exact
  extracted census still misses static template element access and both quoted-alias examples. Its
  existing controls reject dot-name aliases, `.call`, string-literal element access, duplicate labels,
  unlabelled calls and misplaced native cleanup. No expanded analyzer or new syntax family is demanded.
- The guides and child-cancellation mapping now say **request** the end and describe the failed-step
  case. The termination mapping's per-row guarantee is supported by ROWS, with B-TERM-LIMIT explicitly
  separate. The baseline's FAILED example refers to L-36; its limits summary at lines 1065–1066 should
  also include the newly recorded limits during the same prose correction.
- All pre-existing lines of designs 03/04 and implementation reports 02/03 remain in order, with only
  dated correction insertions. Design 02 is byte-identical to its preserved revision `138937918ed0a0f2677bd5588eedafba6c51750c`;
  design 03 explicitly corrects its cascade claim. Historical assertions and old counts were not erased.

After the corpus, further search was bounded to the affected cleanup claims and their consumers:
request versus terminate rejection; fulfilled-pending versus rejected cleanup; FAILED versus CANCELLED;
real versus individually removed fallbacks; baseline/mapping/guide/source-comment aliases for end,
cancel and cleanup; and the three previously identified census escapes. The additional public-entry
probe adds an explicit no-hold observation to F1's known schedule. There is no new production-defect
claim, arbitrary topology search, repeated-fault search, static-analysis soundness claim or reopening of
the scheduling/accounting dispositions closed by review 03. No brief-04 obligation remains unexamined.

## Finding

### K14-R4-01 — P2: current cleanup descriptions still promise more than the recorded behavior

**Criterion/source:** R3-LIMIT/R3-CLAIMS; owner choice 06 R3-01; 012 semantic correction closure;
017's distinction between a recorded limitation and a false current claim. Attribution: Driver
documentation/evidence, not Kernel correctness.

**Locations at H:**

- `packages/sdk/src/legacy-bridge/driver.ts:19`–`:24`, `:209`, `:274`, `:637`–`:639`:
  current comments say the Driver/cascade ends the lineage, and describe the lineage as ended before
  ledger closure/Outcome. These are live source descriptions, not sealed historical records.
- `docs/development/017-known-limitations.md:110`, final sentence of L-36's first cell:
  "A cleanup call that rejects is still reported as a protocol-failure hold".
- `docs/development/002-implemented-kernel-baseline.md:1043`–`:1044`: the equivalent unqualified
  rejection-to-hold sentence.

**Counterexamples and mechanism:**

1. The already-approved L-36 cases are sufficient to falsify "ends the lineage": the native cancel call
   fulfills with `cancellation_pending`; its receipt is discarded at driver.ts:280; a failed native step
   leaves RUNNING with no remaining step to apply the request. The Driver closes its ledger and offers
   FAILED, or the earlier Kernel CANCELLED stands. B-TERM-LIMIT and the unchanged prior probes reproduce it.
2. The existing F1 schedule also falsifies the new blanket rejection-to-hold wording. One request-cascade
   read rejects. `requestCancellation` catches that rejection at driver.ts:260. `app.cancel` waits for the
   settled request and runs its real fallback, which succeeds. The added reviewer probe observes:

   ```text
   faults=1
   cleanup=[cancel.request: rejected, cancel.application: fulfilled]
   Kernel=CANCELLED; native=[CANCELLED,CANCELLED]; recoveryHolds=[]; laterSteps=0
   ```

   The reporting guarantee belongs to `terminate`'s rejection handler (`:648`–`:652`) for an eligible
   unresolved exchange. It is not a guarantee for every cleanup call. Once Kernel cancellation has won,
   a protocol report cannot turn that terminal Execution into a held exchange.

**Required outcome:** make the live comments describe requesting native cancellation and stopping
future Driver scheduling, with L-36's pending/failed-step limit. Qualify the register/baseline reporting
sentence by the actual `terminate`/exchange boundary and preserve the request-cascade swallow/fallback
behavior. Check dependent current summaries for the same ambiguity; preserve historical text with dated
corrections. The owner may take the source-comment correction in cleanup as instructed. This review
does not edit the candidate or pre-accept the corrected tree: changed prose remains payload under 006.

**Why blocking:** brief 04 explicitly requires truthful current claims. L-36 authorizes the limited
behavior, not contradictory promises about it. Deviation 3 was candidly disclosed and is owner-supplied
review scope; its disclosure does not satisfy R3-CLAIMS. The second occurrence is reviewer-found in
the disposition wording. Both are one documentation-closure family, requiring no mechanism redesign.

## Prior dispositions, acceptance map and handoff

| Item | Review-04 disposition |
|---|---|
| K14-R3-01 | Behavior accepted as L-36, including owner-confirmed CANCELLED variant; remaining current-claim closure is R4-01. No native-state fix requested. |
| K14-R3-02 | **Closed.** F1–F3 and all six new pair dispositions are meaningful; deviation 2 accepted; recount correct. |
| K14-R3-03 | **Closed as L-37.** Exact exclusions retained and honestly asserted. |
| Review-03 closed R1/R2 findings and D03/D04 conditions | Carried by reference to review 03; no reopening. Production unchanged and the relevant corpus remains effective. |

The K14 acceptance map below applies the owner-approved limits and the bounded continuation of review
03; PASS does not claim a fresh unbounded review of the original packet.

| Criterion | Disposition at H |
|---|---|
| K14-1 | **PASS with L-36.** Asynchronous exchange/cancellation mechanics preserved; terminal Kernel state does not prove native cleanup. |
| K14-2 | **PASS.** Private Runtime boundary unchanged; bridge corpus passes. |
| K14-3 | **PASS.** Kernel/core source and protected imports unchanged; boundary controls pass. |
| K14-4 | **FAIL for current cleanup documentation (R4-01).** Feature mechanisms and approved L-36 scope are otherwise preserved. |
| K14-5 | **PASS.** Wrapper/L-01 mechanism unchanged; wrapper/binding checks pass. |
| K14-6 | **PASS with L-37.** Maintained corpus, F rows, true behavioral kills, row-specific equivalences and mapping corrections checked. |
| K14-G | **DEFERRED to K1.4-gate**, not executed or accepted here. |

**006 root-cause note:** the recurring error is still promoting a cancellation request/promise result
into a stronger cleanup fact. This round successfully limits the behavior and repairs the mutation
evidence, but the claim correction did not reach the current source comments and generalized one
rejection handler to all cleanup calls. Earlier successful-cleanup rows could not expose that wording;
F1 and L-36 now do. Owner choice 05's route (d) and choice 06 remain sufficient: finish the bounded prose
correction, retaining the chosen limits and production behavior. No new design/patch loop is proposed.

[Brief 05](review-04/brief-05.md) carries that correction. Third-party reuse: **none added**; the review
uses repository fixtures and existing Node/TypeScript dependencies, with no dependency or vendored code
change. The review branch contains review/evidence artifacts only. Integration and successor release
remain with the owner.

**Transcription:** K1.4 `CHANGES_REQUESTED`; open finding **K14-R4-01**; L-36/L-37 behavior/exclusion
dispositions retained; K14-G remains K1.4-gate's. No acceptance is extended to a future cleanup commit.

CHANGES REQUIRED — H `1b98a76e625ef187ba179fdad2e823ac4dabd521` — K1.4 (K14-1..K14-6).
