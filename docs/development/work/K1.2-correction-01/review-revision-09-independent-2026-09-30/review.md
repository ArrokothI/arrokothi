# Independent review — K1.2-correction-01, contract revision 9

## Identity, authority and access

- Reviewer: this independent Codex desktop session, 2026-09-30, Asia/Taipei. Session instructions identify the model as **GPT-6**; the exact serving variant is not exposed. I did not implement this candidate. No delegated reviewer or external acceptance is claimed.
- Governing integrated base and process baseline **B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`**.
- Validated payload **C: `81dca4575ea56cfdde5b5f8ed72c439c7ec31821`**.
- Reviewed candidate **H: `4a917f8caac04e7d9861e0ec3638662d52f9d3ae`**, the commit containing `docs/development/work/K1.2-correction-01/implementation-08.md`.
- Contract: `docs/development/work/K1.2-correction-01/contract.md` at H, revision 9; SHA-256 `c619a629602c17bebcfe603768aca73e432c452eccba950f508321949a041894`. It carries parent K1.2 revision 9, C1–C15 and DEC-1–20, with owner amendments 01–03 and decision-05.
- Owner release: `6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb`, including K1.2 invalidation-01 and the correction release. Starting from that cumulative, unintegrated candidate is the recorded owner exception.
- Prerequisites: accepted K1.1 correction H `52b1600f3b42e3a360fdc3395178f1d147edf304`, integrated with its reference dependency at `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`; correction-02 accepted H `719abbf9e55e7489b6255a08cbb9e97a1e960a5e`, integration `954d31b00eb7f2412c22ccf7d4d079699f0c4032`. Acceptance/integration records and ancestry were inspected; these integrations precede B. The later V-D1 claim hold is preserved.
- Previous reviewed H: `dcac779bdf7e887bcf42c8a6407c1b24c2083a55`, review-11 recorded at `d005dc6281a17f75bbad0b32c59aec169cdcc1ae`. Amendment 03 is at `b93ed1df6b70569ada060481523e5b37c206e324`, before C. Amendments 01–02/decision-05 are owner records, not authority invented by implementation-08.
- Branch: `codex/k1.2-correction-01-activation-identity`. Configured remote is `https://github.com/ArrokothI/agent-kernel.git`; the report used the historical `ArrokothI/arrokothi` URL. A read-only remote advertisement returned later head `e19d8e7f14bfe3fd661c22b3796a1eca365c3ec0`; H is its ancestor. **This review assesses H, not that later revision-10 candidate or an administrative/merge commit.**

Local shell and full Git objects were available. Network access was restricted; `git ls-remote` succeeded after the sandbox DNS failure was retried through the approval mechanism. No required source or raw attachment remained inaccessible, so 006's `BLOCKED_EXTERNAL` path is not invoked. No credentialed external benchmark, native integration, deployment, persistence or release check was performed or inferred.

I read repository `AGENTS.md`, the applicable architecture skill, the mental-model overview/major abstractions/reference, development front door, 006, 007, 008 and 012 at B. Governing 006/008/012 and repository instructions are unchanged in H. The submitted contract, owner decisions, scope/status records, report and earlier review records were treated as artifacts. They do not waive baseline review obligations.

Full B and H source exports are preserved in `source/`, alongside the **full binary cumulative diff** in `evidence/full-cumulative.patch`, SHA-256 `a78704e2f0ea554e483fe3091cccd0774d21ff187f502507dc6012322a8b2e65`. This is not a web patch or truncated report. The cumulative inventory contains 869 changed paths: 85 source/test/script paths, 68 policy/reference/record/configuration paths, and 716 historical/evidence paths. All 1,340 tracked H files were verified against Git blobs after the reruns, with zero differences. Reviewer probes are additional files in a scratch export; no submitted source was changed.

## Candidate and evidence identity

B → release → C → H ancestry and prerequisite integration ancestry pass. C..H is exactly the report's 66-file administrative allowlist: implementation-08, one correction status row in 007, and 64 validation attachments including the manifest. No script, evaluator, fixture, contract or production change is hidden there.

All 63 manifest entries match their bytes. Manifest SHA-256 is `1414096365f04eea0b851a7ad07ad52bb60c609fc8ccf156b63387110f451da5`. The seven compressed historical diff logs also decompress to the report's exact sizes and digests. Their whitespace failures are preserved raw evidence, not newly introduced source failures. The 61 command records, environment, exits and clean-C/clean-after declarations were inspected. Failed stale-anchor ablations and the equivalent survivor are disclosed; they were not counted as successful rejections.

The correction delta was reviewed as well as B..H. Revision 9 adds the two sweeps and maintained review-10/review-11 comparisons, demotes the existing analyzer in its documentation, and changes the refusal path to build and append its record before advancing the refusal index. `SELF-R8-REFUSAL-01` is an implementer finding, not a reviewer discovery. Source order, clean sweep results and pinned before-fix evidence support that specific repair. The preceding successful semantic repairs were traced into current consumers; an unchanged file or an earlier PASS was not used as an exemption.

## Independent coverage and methods

The preliminary coverage map is preserved in `evidence/coverage-before-reconciliation.md`. It derives obligations from canonical owners and the contract before substantive report/evidence reconciliation. The report was initially opened to locate H and its design introduction was visible; I do not claim a completely blinded review.

Applied 012's normative, deterministic execution, in-process race/fault, and process/documentation methods. Native fidelity belongs to R1, the external E1 gate to K1.4, persistence/process death to K3, public packaging/release to S1, and transferred V-D1 work to K1.1-correction-03. These exclusions are explicit packet boundaries, not substitutes for missing mandatory evidence.

| Obligation and canonical owner | Distinguishing interaction and whole-result examination | Evidence and result |
|---|---|---|
| Scope/powers — execution-cycle, authority, evidence | Hidden versus missing destinations; observer versus controller versus current attempt; content-read counting. Require no hidden record or diagnostic disclosure. | Own destination observation, `#visible`, `#requireControl`, grant checks; nondisclosure, control-authority and submission-authority suites. Holds. |
| Identity/replay — identity, execution-cycle and decision-02 | Maximum creation keys, long/surrogate namespaces, exchange 9→10, empty and malformed coordinates, terminal/later exchange, current/retired/forged/absent grants. Require exact original receipt on replay and independently classified stale coordinates. | Activation identity, exact-coordinate, partial-claim and submission-lifetime fixtures; direct code trace through capture, replay, currency, grant and content. Holds. |
| Capture/diagnostics — values, correction DEC-4–7 | Per-root limit/one-over, multiple roots, Proxy/getter faults, ambient residue, >8 mixed diagnostic occurrences, wrong IDs with the same lossy display. Require one coherent capture, exact weights/order, bounded rendering and no diagnostic-dependent equality. | `values`, `envelope`, `outcome`, `own-array`, diagnostic and value suites; historical extreme-input logs inspected. No regression found; V-D1 cost is not certified. |
| Acceptance/lifecycle/output — execution-cycle, lifecycle, actions, output | Continue then dispatch; complete/fail with queued input outside the batch; both ingress/acceptance orders; replay after terminal. Require batch-only acknowledgment, explicit terminal dispositions, exact progress/output identities/receipt and no reopening. | `#accept` construction/apply trace; acceptance, terminal, transaction, outcome-evidence and ingress tests. Holds on tested production paths. The added fault oracle has a separate evidence defect below. |
| Unsupported obligations — execution-cycle/lifecycle | Effects, await and completion with an obligation. Require whole refusal, no action record, no wait-content observation and no automatic retry. | Outcome capture and unsupported/hostile tests. Holds. |
| Recovery/takeover — identity, recovery, state, evidence | Entry/update/idempotence, both holds and both clears, safe/unsafe takeover, callback reentry, saved grants, next receipt positions. Require one causal immutable decision, prebuilt returned answer, no orphan receipt or stale overwrite. | Production source and 22/30-case comparisons hold. Mandatory DEC-9 evidence is incomplete: ORACLE-01 and SCOPE-01. |
| Physical delivery — delivery reporting boundary | Saved reports after newer delivery, takeover, resolution and next exchange. Require only the original physical row to settle, with no change to grants, receipts, lifecycle or acknowledgment. | `#deliver`, retained exchange rows, late-report and delivery-attribution suites. Holds. |
| DEC-8 runtime evidence — amendment 03 | Name enumeration, four prototype holders, accessor liveness, frame attribution, caller/Proxy-handler separation, hooked boundaries, catalog and comparison digest. Search plausible ordinary optional reads and their reachable paths. | Whole-suite poisoned runs match the control, zero zone firings. Known analyzer gaps are honestly stated. No new qualifying analyzer-escape finding. |
| DEC-9 runtime evidence — amendment 03 | Enumerate declared exits and fault sites; challenge each successful, refused, thrown and qualified result, including future positions and saved grant. | Four independent oracle negative controls pass incorrectly; 16 reachable control cases absent from fault scenarios. Findings below. |
| Structure/migration/reference — reference index, 007, 015 | Full import/export/file inventory, unchanged legacy consumers/examples, DX-4 disposition, normative deltas and administrative boundaries. | Private 13-file zone; no new runtime export/dependency/portable leaf; DX-4 explicitly remains unextracted with K2.2 routing. Semantic reference conventions hold; evidence claims need correction. |

**Search scope.** I searched names and related concepts across production, tests, current baseline/reference and correction records: `activationId`, identity packing/equality/rendering, replay/conflict, epoch/base coordinates, grant/submission, control/visibility, `resultingEpoch`, own/optional reads, host members, descriptor fields, inherited indices, serializer state, receipt/refusal indices, `#mint`, prebuild/apply, hold/history/clear, answer/projection, delivery/settlement, cost/bounded/limit claims and transferred V-D1 aliases. For the sweeps I inspected name derivation, exclusions, arming, attribution, liveness, hooked exports/methods, scenario construction, every oracle branch and all normalization. I compared scenario exits to source branches, including the safety callback's revalidation branches. I did not pursue arbitrary adversarial TypeScript programs or demand a sound analyzer.

## Findings

### K12C1-R9I-ORACLE-01 — P2 — the fault checker accepts observations that no permitted complete decision explains

**Location at H:** `packages/kernel/tests/sweep/fault-child.ts:409–423`, `:470–495`, `:501–519`. Associated claims: contract DEC-9 evidence/oracle, implementation-08 Design and coverage table, and `docs/development/002-implemented-kernel-baseline.md:256–261`.

**Governing obligation:** correction DEC-9 and amendment-03 item 2; parent C8–C10/C12; baseline 006 requires distinguishing evidence and rejects unsupported claims; 012 requires the whole returned/retained result and zero forbidden mutations. This finding concerns the finite runtime method the amendment authorizes, not static soundness.

Four independent negative controls against the exact H checker demonstrate the gap:

| Negative control | Incorrect observation supplied to the checker | Checker result |
|---|---|---|
| `reviewer-answer.ts` | Replace successful protocol-hold answers with `{activationId:"WRONG", writerEpoch:999, changed:false, recoveryHolds:[]}`, retaining the actual committed hold. | **PASS**, 24 runs, 0 violations; two altered successful observations, including the uninjected arm. |
| `reviewer-refusal-grant.ts` | In injected refusal arms of unsafe takeover, replace the observed setup grant's actual `accepted at 5` behavior with `unauthorized_submission`; keep the ordinary control untouched. | **PASS**, 27 runs, 0 violations; 11 altered observations. |
| `reviewer-preapply.ts` | At Outcome operation 12, replace the next acceptance position with 999 after a thrown `Object.defineProperty`. The recorded stack is `defineData → appendOwn → openContainer → capture → canonicalize → acceptRoot → captureOutcome → submitOutcome`, before acceptance/apply. | **PASS**, 2,190 runs, 0 violations; two altered pre-apply observations classified through the apply-kind allowance. |
| `reviewer-delivery.ts` | Replace the takeover's new delivery rows with two duplicate attempt-999 rows, foreign Activation identity, `delivered` status plus a failure string. | **PASS**, 75 runs, 0 violations; 14 altered observations. |

These are **observation-level tests of the checker**, not claims that unmodified H actually returns these corrupt values. Production source remains unchanged. Each probe and its minimal diff from H, plus raw output, is included in this bundle.

The corresponding source defects are direct: successful arms compare only `state`, not `answer.value`; the uninjected arm ignores its returned outcome; `refusalAdded` omits `setupGrant`; `withoutNewDelivery` removes every row at the new epoch without validating count, identity or contents; and the Outcome apply exception accepts any altered state for a broad operation-name set without establishing that the fault occurred in the apply window. An operation's name does not identify its phase. `Object.defineProperty` also runs during early value capture, as the operation-12 trace proves.

The report's stronger whole-decision claims therefore do not follow from its 43,446 green runs. Disclosed exclusions for engine failure inside apply and contained observation faults do not justify accepting an arbitrary pre-apply state or an inconsistent public answer. The oracle can legitimately recognize a contained refusal or the declared diagnostic fallback, but must verify the complete corresponding decision.

**Required outcome:** distinguish the whole permitted result on each arm, including returned values, retained state, future receipt/refusal positions and grant behavior. Constrain any tolerated delivery difference to the declared physical delivery and legal contents. Establish the actual phase before applying a phase exclusion; pre-apply corruption must fail. Add maintained negative controls that reject these inconsistent observations while preserving honest contained-fault and declared apply-window behavior. Reconcile the contract/baseline/report claims with what the revised method demonstrates. The implementer chooses the in-scope mechanism; no particular patch is mandated.

### K12C1-R9I-SCOPE-01 — P2 — the fault sweep does not cover its declared recovery-control exits

**Location at H:** `packages/kernel/tests/sweep/fault-child.ts:45–49` and `:276–316` (`SCENARIOS`); implementation-08 `:132–138`, `:284`; contract DEC-9 Scope; baseline `:257–259`. Relevant production branches are `requestTakeover`, `reportProtocolFailure`, and `#openExchange` in `coordinator.ts`.

**Governing obligation:** amendment-03 item 2's completeness over declared maintained paths, correction DEC-9, parent C8–C10/C12, 012's takeover/missing/terminal and competing-order coverage, and 006's evidence/claim accuracy.

The sweep explicitly declares **every exit** of recovery (12 scenarios), protocol failure (7) and takeover (8). Comparing those fixtures with the control branches leaves these reachable cases absent:

- Unknown and hidden destination on each of the three controls: six cases.
- Protocol report after terminalization, with no unresolved exchange, and naming the wrong Activation: three cases.
- Takeover after terminalization and naming the wrong Activation: two cases.
- Takeover after its safety callback terminalizes, resolves, opens a different exchange, advances the epoch, or establishes a code hold: five cases.

The independent `reviewer-scope.ts` drives all **16** on unmodified H and verifies the expected refusal classifications; raw output is `evidence/probe-scope.txt`. Hidden/unknown are two inputs to the same scoping exit, not a claim of 16 distinct branches. In particular, the five post-callback cases reach distinct revalidation arms. Faults that incidentally make a field unreadable in a normal scenario do not establish coverage of these explicit states and schedules.

Some paths have ordinary maintained tests and are exercised by the separate poison run. That supports their ordinary behavior; it is not exception injection along them. The fault sweep does not use the maintained whole-suite paths. High line coverage measured for the poison suite cannot fill that gap.

**Required outcome:** reconcile the finite fault-sweep scope with the actual control exits and interactions, and supply distinguishing fault evidence for the required paths. Include appropriate reference outcomes for legitimate nested decisions so an outer refusal neither erases them nor hides an outer forbidden mutation. Where path equivalence is claimed, state and demonstrate it; do not call unexercised paths covered. Any genuine scope reduction must follow the governing contract/owner process rather than silently weakening a report sentence. No universal path enumeration or sound static analysis is requested.

## Per-criterion verdicts

FAIL below is about the required evidence where stated; it is not a claim of an observed production corruption. PASS remains limited to the in-process profile and stated owner decisions.

| Criterion | Verdict | Rationale |
|---|---|---|
| C1 scope before content | PASS | Own destination then visibility; hidden/missing equal, no later envelope observations or hidden retained refusal. Read-counting and whole-view tests pass. |
| C2 replay/conflict before fresh validation | PASS | Exact captured identity returns original decision/receipt without grant or mutation after later exchanges/terminal; changed content conflicts before fresh checks. |
| C3 whole-envelope validation | PASS | Independent coordinate currency, authority-before-content disclosure, separate root limits, capacity, unique keys and whole refusal; long/surrogate identities remain exact. No current code defect found. |
| C4 atomic acceptance/one writer | PASS | Caller capture precedes final state checks; retained records including wrapper/history are prebuilt; batch-only acknowledgment, revision and outputs commit together under the declared in-memory apply qualification. Source and meaningful ordinary/reentrant tests support this independently of the flawed extra fault oracle. |
| C5 next/terminal lifecycle | PASS | Continue opens a new exchange only on later dispatch; complete/fail retain typed result; terminal operations refuse and do not reopen. |
| C6 terminal disposition/ingress | PASS | Whole batch acknowledgment plus explicit disposition for other queued Events; terminal new input refuses while old exact/conflicting input retries retain their meanings. |
| C7 unsupported Effects/waits/obligations | PASS | Whole proposal refusal; no K2 evidence, partial application or wait-content observation. |
| C8 authorized takeover/redelivery | FAIL | Current authority, safe replacement, revalidation, pinned input and grant lifetimes hold; required DEC-9 result oracle and fault-path evidence fail ORACLE-01/SCOPE-01. |
| C9 pinned-code recovery hold | FAIL | Ordinary entry/update/idempotence/clear and causal history hold; required fault evidence has unchecked result/grant dimensions and omitted scoping paths. |
| C10 protocol-failure hold | FAIL | Ordinary authority, bounded explicit diagnostic, duplicate, takeover/Outcome clear hold; successful answers are not checked by fault oracle and several refusal paths are absent. |
| C11 late reports/Outcomes | PASS | Saved delivery capability settles only its original operational row; accepted Outcome replay remains its original decision and cannot affect a later exchange. |
| C12 receipts/evidence/inspection | FAIL | Exact immutable coordinates, per-Execution indices and ordinary observations hold; claimed fault verification misses grant/answer/delivery/phase inconsistencies. |
| C13 single observation/ambient safety | PASS | Own-only eager capture, captured primitives, positional history builders and optional-host resolution examined. DEC-8 runtime evidence passes within its declared limits; analyzer is no longer treated as proof. |
| C14 structural boundary/inventory | PASS | 13 private zone source files, no legacy reachability or new third-party dependency/runtime export; inventory and DX-4 disposition agree with source and conformance. |
| C15 reference/baseline maintenance | FAIL | Layer-3 normative ownership/open-choice maintenance passes, but live DEC-9 coverage and whole-decision evidence descriptions overstate the implemented checks. |
| Correction DEC-1–3: producer closure/exact identity/order | PASS | Minted long/surrogate identity, wrong text, non-string, replay and all four entry surfaces covered, under the explicit engine-allocation qualification. |
| Correction DEC-4–6: bounded rendered diagnostics/exact coordinates | PASS | Lossy display is isolated from lookup/retained coordinates; exact-token/answer oracles and aggregate bounds retained. Explicit protocol diagnostic keeps its separate rule. |
| Correction DEC-7 diagnostic semantics | PASS | Eight bounded details, weighted suffix counts, first-occurrence order, type-only labels and bounded paths remain; no V-D1 cost inference. |
| Correction DEC-8 runtime evidence/analyzer limits | PASS | Full maintained suite and catalog run under counting/throwing/reentrant poison; zero zone firings and matching traces; declared analyzer gaps are retained. |
| Correction DEC-9 runtime evidence | FAIL | ORACLE-01 and SCOPE-01. Green counts do not discharge these gaps. |
| 006/008 exact candidate, release/prerequisites, available evidence | PASS | Identities/ancestry, C..H allowlist, hashes and preserved historical records verified; no fabricated acceptance or successor release. Evidence sufficiency fails separately above. |
| V-D1/time-cost, transferred evidence and metered implementation | DEFERRED | Explicitly assigned by amendment 01/decision-05 to K1.1-correction-03; claim hold remains. |

## Prior findings and correction closure

The immutable records at H remain the source of exact earlier findings and dispositions. The following reconciliation includes their dependent current paths; abbreviations group IDs, not new severities. Review-03's earlier PASS does not override review-04, and the historical K1.2 review-13 ACCEPT does not override review-14/invalidation-01. No absent correction review-05 or review-07 is invented.

| Prior family / record | Disposition at this H and rechecked dependency |
|---|---|
| K12-R1-AUTH-01/HOLD-01/DELIVERY-01; R2-TAKEOVER-01 | Original runtime defects remain closed: separate powers, permitted held actions, physical attribution and callback revalidation. New fault-evidence deficiencies affect those behaviors' required evidence, not their historical runtime closure. |
| K12-R1-HISTORY-01; R3-HISTORY-02; K12C1-R9-HISTORY-01 | Runtime closure retained: positional frozen records, actor authority, takeover-only resulting epoch, no retained foreign object, both clears and Outcome end. Maintained 22/30-case and review-11 tests pass. |
| K12-R1-DOC-01/REC-01; R3-AUTH-02; R4-AUTH-DOC-01 | Accepted wrapper/history prebuild and attempt authority match current code/docs; exact attachment identities remain accessible. |
| K12-R5-LAYER3-01/PROC-01; R7-PROC-01 | Canonical payload is inside C/H; C..H is administrative only. Review accepts no later head. |
| K12-R6-LAYER3-01/EVID-01/DOC-01; R8-DOC-01 | Three-argument carrier, distinct attempt/delivery lifetimes and development front door retained; saved-grant redelivery oracle and builder check pass. |
| K12-R9-ORDER-01/EVID-01; R10-EVID-01/VAL-01 | Grant/content ordering and actual malformed-surrogate fixtures retained; raw evidence/digests available. |
| K12-R11-ORDER-01; R13-ARCH-01/REC-01/DOC-01 | Decision-02 owner resolution and independent coordinate checks retained; eager computation is distinguished from deciding/disclosing diagnostics. |
| K12-R14-ID-01/EVID-01 | Producer-compatible primitive exact UTF-16 identity remains closed across minted limits/surrogates and exchange growth. Engine composition qualification stays explicit. |
| K12C1-R1-DIAG-01; R2-AGG-01/EVID-01 | Bounded fragment and aggregate rendering, later answerability, diagnostic-independent equality and boundary oracles retained. |
| K12C1-R4-EVID-01; R6-EVID-01 | Exact creation/ingress/dispatch/takeover receipts, redelivery answer, carried destinations and inspected coordinates retained with independent spellings. |
| K12C1-R4-VALUE-COST-01; R6-VALUE-TIME-01; R8-VALUE-DEPTH-01/EVID-01; O-R8-1–3 | Cost/evidence obligations transferred, not declared repaired here. Remaining diagnostic semantics and string preflight retained. No performance measurements are promoted into proof. |
| K12C1-R9-CLAIM-01 | V-D1 live implementation claim remains withdrawn. Canonical current wording/provenance and future metered decision are distinguished; baseline and ledger retain the hold. |
| K12C1-R10-READ-01 and R11-READ-01 | Under amendment 03, old universal-analysis requirement is superseded. Exact historical read forms are rejected by pinned runtime negative controls; current maintained runtime poison tests pass and known analyzer gaps are disclosed. No new qualifying plausible escape was found. |
| K12C1-R10-COMMIT-01 and R11-COMMIT-01 | Exact historical early-mutation examples are rejected in pinned evidence and clean seed passes. General evidence closure under the revised runtime method remains open through ORACLE-01/SCOPE-01. No demand to restore the superseded universal static proof. |
| SELF-R4-STRING/DESCRIPTOR/HANDLER; SELF-R6-HOST-01–03; SELF-R7-UNSUPPORTED-01 | Implementer provenance retained. String preflight, caller/engine boundary, host-member resolution and own error-name field remain; decisions 03–05 and cost transfer constrain claims. |
| SELF-R8-REFUSAL-01 | Specific repair supported: record build/append precedes index advancement. Original before-fix 57-violation evidence inspected; current sweep rerun is clean, subject to the checker findings. |
| Other carried P3 observations | Engine-allocation qualification is retained; old status-introduction/historical OPEN-5 wording and DEC-5 presentation-only oracle notes remain nonblocking observations, not upgraded into fixes or silently dropped. O-R8-4 (re-prototyped built-ins) remains the recorded pre-existing owner-triage item outside this correction. Eager-cost observations follow the transfer. Reporter spelling/Node-version and cleanup editorial notes do not establish runtime acceptance. |

The full earlier records are available in the H source archive. Their detailed immutable findings are referenced rather than copied into a growing policy transcript.

## Layer-3 normative payload and migration

I inspected the complete mental-model delta and its surrounding owners. Submission authority belongs to `execution-cycle.md#submission-authority`; identity, core and integration cross-reference it. Delivery reporting remains per physical delivery and cannot propose an Outcome; submission authority remains per writer attempt and cannot report delivery. Decision-01 changes only the carrier extension. Decision-02 owns coordinate precedence. Identity owns primitive-string binding/producer closure with the allocation qualification. Values owns diagnostic/capture obligations and the adopted caller-engine boundary.

Binding representation, epoch restart, receipt/disposition representation and transaction choice remain recorded as implementation choices with owner markers/index pointers. Persistent submission authority remains `OPEN(K3.2)`. The diff introduces no build/acceptance status in specification pages, no universal credential/token format, and no silently settled open choice. Provenance/status records remain distinct. The V-D1 transfer does not silently rewrite its current canonical owner into a passed meter.

Relevant rewrite-index dangerous inferences were checked: resend versus new exchange/takeover; epoch versus authority/native exclusion; observed delivery versus accepted Outcome; accepted output versus external action; RUNNING hold versus WAITING/failure; reservation versus acknowledgment; terminal disposition versus deletion; receipt/index versus portable credential; locator/checkpoint/history versus automatic replay; specification versus shipped status; diagnostic rendering versus structural identity; conceptual Kernel coverage versus the private package; and mechanical green checks versus semantic/external proof. No additional normative violation was found.

The supported SDK, guides and examples still describe the legacy core. Their production sources and consumers are unchanged; K1.4 owns migration and E1. No source was retired without a consumer disposition. The only external runtime dependency remains the already approved `canonicalize`; no new third-party incorporation required a new license decision. Workspace tests do not certify packaging or native Driver fidelity.

## Validation, interpretation and remaining limits

Reviewer reruns used the full H export at `/private/tmp/arrokothi-review-r9/candidate`, Node **v26.8.1**, npm **11.19.0**, TypeScript **5.9.3**, Darwin arm64, using locally available dependencies. No dependency installation or lockfile change was performed.

| Independently executed | Result / raw evidence |
|---|---|
| `npm run typecheck` | Exit 0; `evidence/rerun-typecheck.txt`. |
| `npm test` | Exit 0; 3,507 tests, 441 suites, zero failures/cancellations/skips/todo; `evidence/rerun-full.txt`. |
| `npm run test:kernel-sweeps` | Exit 0; fault: 37 scenarios, 43,446 runs, 35 intercepted methods, zero reported violations. Poison: 42 files/310 names/four prototypes, 1,445 tests in each of off/count/throw/reenter; 11,532 windows and 11,578 traced calls per run; zero zone firings and matching traces. `evidence/rerun-sweeps.txt`. Findings challenge what these green outputs prove. |
| `npm run test:evals` | Exit 0; 12 tests/2 suites; `evidence/rerun-evals.txt`. These are local behavioral checks, not an external E gate. |
| `npm run check:builder-docs` | Exit 0; 72 Markdown files, 1,846 local links/anchors, 38 package imports; `evidence/rerun-builder.txt`. Navigation, not semantic proof. |
| Pinned record checker | Exit 0; 26 files/713 local links. Adapter only redirects Git reads to available repository objects and substitutes exact H for HEAD; all file reads use H export. Adapter and output included. |
| Four oracle controls plus control-path probe | All completed, confirming the two findings above; commands and source in `probes/`, raw `probe-*.txt` outputs in `evidence/`. |
| Git/source/attachment integrity | Exact allowlist, 63 hashes, seven decompressions, all tracked H blobs, full cumulative/correction diffs and historical preservation verified. |

**Inspected, not independently rerun in full:** the submitted historical ablation/adaptation runners, extreme memory/string and timing probes, coverage measurements, 34 sweep negative controls (28 rejected, six explicitly outside), and the before-fix sweep on previous H. The clean full suite, complete current sweeps and independent checker controls were rerun. Inspection of immutable raw logs is evidence of the recorded runs; it is not a claim that I repeated them.

The report's Node v25.2.1 clean-C logs and this session's v26.8.1 runs are separate observations. Node 22 and clean installation were not tested; the report discloses the sweep hook's Node 22.15 minimum. No all-version support claim follows. Poison's descriptor-field catalog, nonconfigurable-slot skips, caller/Proxy-handler treatment, `in`, other built-in prototypes, dynamic names/indices and unexercised paths remain its stated limits. Reported 99.77% zone line coverage is not full branch or path coverage. Arbitrary same-process code, allocation exhaustion, native exclusivity, crash durability, external acceptance and V-D1 are not proved by these checks.

Required coverage gaps are the checker dimensions and declared fault paths in the two findings. No inaccessible required artifact or unresolved architecture decision prevented the remaining review. Other required criteria were assessed cumulatively; a finite pass does not assert absence of every possible bug.

## Verdict and compact handoff locator

Under 006, the two P2 evidence/claim defects require correction. Recommended status transcription for **this exact H**: `CHANGES_REQUESTED`; open `K12C1-R9I-ORACLE-01` and `K12C1-R9I-SCOPE-01`; C8–C10, C12, C15 and correction DEC-9 FAIL. C13/DEC-8 pass under amendment 03. No `BLOCKED_EXTERNAL` or `BLOCKED_ARCHITECTURE` is asserted. Both invalidation holds remain; no merge or successor release is authorized.

`handoff.md` is the compact correction locator, binding this report by SHA-256. `owner-note.md` is a separate owner communication, outside this reviewer report. `MANIFEST.sha256` fixes this bundle's delivered bytes. The report itself does not certify a recording commit or any later candidate.

CHANGES REQUIRED
