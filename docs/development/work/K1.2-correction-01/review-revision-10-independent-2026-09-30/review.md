# Independent review — K1.2-correction-01, contract revision 10

## Identity, authority and access

- Reviewer: this independent Codex desktop session, 2026-09-30, America/New_York. Session instructions identify Codex as based on GPT-6; the exact serving variant is not exposed. I did not implement this candidate. No delegated reviewer or external acceptance is claimed.
- Governing baseline and cumulative base **B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`**.
- Validated payload **C: `e19d8e7f14bfe3fd661c22b3796a1eca365c3ec0`**.
- Reviewed candidate **H: `b7191dbf630defeff7756122a6798e15d0b73dd3`**, containing `implementation-09.md`.
- Contract at H: `work/K1.2-correction-01/contract.md`, revision 10, SHA-256 `99d2f58f7cd19e1f634b6362b6137be4bae9a2d70e1c63d332c0b4f7a96a93c3`; parent K1.2 revision 9, C1–C15 and DEC-1–20, with amendments 01–03 and owner decisions 01–05.
- Owner correction release: `6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb`, including K1.2 invalidation-01. Its exception permits correction of the cumulative unintegrated candidate.
- Prerequisites: K1.1 correction accepted H `52b1600f3b42e3a360fdc3395178f1d147edf304` and reference accepted H `644dfffc7904176ee3a4f9943310cf926408a113`, integrated at `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`; correction-02 accepted H `719abbf9e55e7489b6255a08cbb9e97a1e960a5e`, integrated at `954d31b00eb7f2412c22ccf7d4d079699f0c4032`. Their acceptance records, integration receipts and ancestry through B were inspected. The subsequent V-D1 claim hold remains applicable.
- Previous reviewed H: `4a917f8caac04e7d9861e0ec3638662d52f9d3ae`. Both review-12 and the supplied same-H independent review concern that older candidate. The latter is recorded at `4156646dbbc3aeac1f55074440fa34cf6620f484`; it is supplemental historical evidence, not this review's target.
- Configured remote: `https://github.com/ArrokothI/arrokothi.git`; branch `codex/k1.2-correction-01-activation-identity`. A read-only remote query advertised `4156646dbbc3aeac1f55074440fa34cf6620f484`, a descendant of H. This verdict certifies neither that commit nor a later administrative or merge commit.

I had full local Git objects, source, shell and dependency access. Network access was restricted; the remote query succeeded through the approval mechanism after the sandbox DNS failure. No required source or raw evidence remained inaccessible, so 006's external-blocker path is unnecessary. I did not authenticate private owner conversations independently of their pinned decision records, run credentialed external gates, or claim native, deployment or persistence evidence.

I read applicable AGENTS instructions and architecture/audit skills, the mental-model overview and relevant canonical owners, the development front door, and governing 006/007/008/012 at B. AGENTS, 006, 008 and 012 are unchanged through H. Candidate contract/evidence rules were reviewed as payload under those governing rules; their wording did not waive review duties. Amendment 03 governs the bounded runtime method, without demanding static soundness. V-D1 is transferred by amendment 01/decision-05.

The review used an exact-H detached worktree and a separate H export for additional probe files. Production and submitted evaluators were unchanged. A dependency symlink was the only untracked addition in the worktree. All **1,626 tracked files** were checked against H's Git blobs after reruns; the scratch export's tracked files also match H.

## Source and immutable evidence

The evidence bundle contains full B and H source archives, the **full binary B..H cumulative diff**, and the full old-H..H correction diff. The cumulative inventory has 1,155 changed paths, including 65 paths under packages/tests/scripts/examples; historical records and raw attachments account for much of the volume. Review was not limited to the report or a hosted patch. I inspected the cumulative production changes and their surrounding consumers, relevant test assertions and evidence machinery, normative changes, and the correction delta. The latest correction changes the evaluator and claims; production source is unchanged from old H.

Identity checks establish B → release → C → H. **C..H exactly matches the declared 76-path administrative allowlist**: report, status transcription and output attachments. No evaluator or semantic payload is hidden in that interval. All **73 validation-09 manifest entries** match their bytes; manifest SHA-256 is `f261accd9542ea255f4b961429986b47e8ab0e0c83c90f0579e499fbbb5dbdb7`. All seven compressed historical diff logs decompress to the stated sizes and digests.

The supplied older independent-review archive matches SHA-256 `947309dc8c745bfcc534ecbdb4dd350aadc0dd143c2474e3573a5f2c5975aac1`; all 39 entries in its extracted manifest verify. Its original four patches and generated controls were read before porting. Review-12's probes and scope record were also available at H. See `integrity.json`, `identity.json`, `prerequisites/`, `changed-paths.txt` and the bundle README for reproducible identities and raw files.

## Independent coverage and methods

`coverage-before-report.md` records the obligation map made before reading implementation-09's explanation. Initial discovery read identity locators; this was not a blinded review. I applied 012's normative, deterministic execution, in-process race/fault, and process/documentation methods. The table below reconciles that map with the actual source, assertions and results; expected decisions include forbidden changes.

| Obligation / owner | Distinguishing interactions and observations | Examination and result |
|---|---|---|
| C1: authority, execution-cycle | Missing versus hidden destination; hostile remaining fields; observer versus control caller. No hidden mutation or content disclosure. | `#visible`, `#requireControl`, own destination capture; nondisclosure/control-authority assertions and hidden/unknown fault scenarios. PASS. |
| C2/C3, DEC-1–3: identity, execution-cycle, decision-02 | Long and surrogate minted IDs; exchange 9→10; empty/wrong primitive strings; independently malformed epoch/base/ID; absent, forged and retired grants; replay after later exchange/terminal. | Producer/consumer trace through capture, replay, currency, authority and content; activation-identity, partial-claim, submission-authority/lifetime and exact-coordinate assertions. Correct original receipt or whole refusal; no diagnostic-based lookup. PASS. |
| C3/C13, DEC-4–7: values | Four limits at/one past on separate roots; eager siblings; getter/Proxy failures; more than eight mixed issues; distinct identities with identical omitted display. | `values`, `envelope`, `outcome`, `own-array`; limits, aggregate-refusal, diagnostic-work and refusal-diagnostic assertions. Exact values and weighted issue order/counts survive bounded rendering. No cost certification. PASS for retained scope. |
| C4–C7: core, lifecycle, output | Both ingress/terminal orders; continue then new dispatch; complete/fail with queued outside-batch input; Effects, await and obligations. | Complete prebuild/apply trace and acceptance/terminal/transaction tests. Batch-only acknowledgment, explicit remaining dispositions, exact progress/output/receipt and no unsupported partial application or retry. PASS. |
| C8–C10: recovery, identity, state | Both Outcome/takeover orders; five safety-callback changes; code/protocol holds alone/together; duplicate and clear paths. | Control prebuild and post-callback revalidation; takeover-reentrancy, hold/history and ambient tests; complete fault sweep. No orphan receipt, overwritten nested decision, invented history or premature grant/index mutation. PASS. |
| C11/C12: delivery boundary, evidence | Saved delivery reports after takeover/resolution/new dispatch; original grant after redelivery; exact replay and mutable caller references. | Delivery-local row/epoch capture; delivery-attribution, late-report, submission-lifetime and exact-coordinate tests. Only the original row settles; retained records remain immutable; authority and sequence positions retain their meanings. PASS. |
| C13/DEC-8: inherited-field rule and amendment 03 | Optional history/host members, descriptors, live prototype methods, caller versus engine activity, poison liveness. | Production ownership trace, static inventory/limitations, whole-suite and descriptor catalog runtime checks. Zero zone firings and matching traces within declared scope. PASS. |
| DEC-9: amendment 03, complete decisions | Returned answer/refusal, whole view, next positions, setup grant; pre-apply versus actual apply/delivery sites; nested callback baselines; declared exits. | Read classifier, source model, scenarios and instrumentation; independently ported seven control families; full sweep and 16-path scope probe. All altered observations rejected; clean observations pass. PASS. |
| C14/C15: reference index, rewrite index, 007, ownership inventory | Source/import boundary; legacy/public callers; normative owner and open-choice discipline; live evidence claims. | 13-source private zone remains isolated from legacy code; DX-4 remains unextracted with K2.2 owner. Full normative diff and surrounding definitions agree with binding decisions and held claims. PASS. |

Native Driver fidelity belongs to R1; external E1 and the legacy bridge to K1.4; actual process death/durability to K3; public packaging/release to S1; V-D1 metering and transferred evidence to K1.1-correction-03. These are explicit exclusions. No required in-packet obligation is left unassessed; the finite scope and rerun limitations below remain material.

## Required controls and closure of the four open findings

### K12C1-R12-ORACLE-01 and K12C1-R9I-ORACLE-01 — CLOSED

The revised checker compares each permitted decision's returned value, entire view, both future positions and setup-grant behavior. A refusal must match its retained record and position and preserve the grant. Successful and uninjected runs compare their answers. Delivery exceptions prescribe the exact row count, identity, status and contents. Apply exceptions require actual source-statement location and a permitted prefix; an operation name alone grants no exception.

I ported the **observation alterations**, leaving H's Kernel and oracle unchanged. Every altered observation below was reported as a violation, and all corresponding clean classifications had zero violations.

| Original archived control | Altered observations | Rejected | Escaped |
|---|---:|---:|---:|
| Successful report answer replaced with WRONG identity, epoch 999, `changed:false`, empty holds | 2 | 2 | 0 |
| Unsafe-takeover refusal's saved grant changed to `unauthorized_submission` | 11 | 11 | 0 |
| Outcome operation 12: thrown `Object.defineProperty` during capture, next acceptance changed to 999 | 2 | 2 | 0 |
| Takeover delivery rows replaced with duplicate attempt-999, foreign-identity, delivered-plus-failure rows | 14 | 14 | 0 |

The operation-12 stack was inspected: `defineData → defineAt → appendOwn → openContainer → capture → accept/canonicalize → acceptRoot/captureOutcome → submitOutcome`. It is before Outcome apply. Both altered observations fail on next acceptance position (999 versus 4), rather than receiving an apply exception.

Review-12's three controls were also independently ported and run: a malformed-report refusal losing its grant; a successful report returning the opposite hold answer; and arbitrary progress revision 123456 presented as an Outcome apply prefix solely through a `Reflect.apply` label. All three clean counterparts pass and all alterations fail. The maintained test selection independently passes its four tests, including the clean inventory check and these three control families; its additional variants include both accepted/no-fault arms and an impossible prefix placed inside an actual apply statement.

These are evaluator negative controls, not claims that unmodified production produces the corrupt observations. Raw `control-*.jsonl`, `control-*.txt`, `review12-independent.json`, probe sources and port builders preserve the distinction. Deliberately corrupted child sweeps exit 1 because they detect violations; zero escaped controls is the successful reviewer result.

### K12C1-R12-SCOPE-01 and K12C1-R9I-SCOPE-01 — CLOSED

All 16 previously omitted combinations are explicit scenarios: hidden/unknown on each control, the report's stale-Activation/no-open/terminal cases, takeover's stale-Activation/terminal cases, and all five safety-callback revalidation outcomes. The unchanged review-12 scope probe runs against H and verifies all 16 clean whole-result behaviors. That establishes reachability; the separately rerun fault sweep supplies fault evidence on those scenarios.

The current inventory parses returns from the four swept methods and their refusal helpers, attributes helper exits to the calling control, and excludes the callback's nested coverage. All **57 declared exits are taken**. Every scenario's declared exit is checked. Callback scenarios use the callback's committed decision as their post-callback no-outer-call baseline, so an outer refusal cannot erase or silently extend it.

The contract now states 66 finite scenarios, injection points and exceptions. Injection pauses inside the trusted safety callback; the corresponding nested Outcome/control decisions are separately swept, with pre-state differences disclosed. Nested dispatch remains K1.1 scope. This is an auditable bounded claim, not universal path enumeration or static soundness. None of review-12's 16 combinations is waived by the revised wording.

## Search performed and remaining risk

Searches covered production, tests, live baseline/ownership/contract and mental-model sources for identity packing/equality/rendering, replay/conflict, submission grants and control scopes; optional/own members and aliases; receipt/refusal positions, mint/build/apply and history; delivery settlement and projections; sweep scope, classifier exceptions, source locations and exit attribution; and V-D1/cost claim aliases. Exact commands and results are saved as `search-*.txt`; the prior-finding heading inventory is also saved.

I followed producers through validation, commit, projection, replay and the next consumer. For plausible accidental DEC-8/9 mistakes I examined partial/nested type assertions, default parameters and shadowed names, ordinary optional host/history reads, descriptor fields, late report paths, early receipt/index mutation, refusal append order, answer projection and the classifier's excluded phases. **I established no plausible mistake on a reachable path that escapes the applicable runtime checks.** An additional static-analysis evasion alone would not be a finding under amendment 03.

The method remains finite: other built-in prototypes, `in`, names outside the declared derived set, unexecuted paths and subprocesses outside preload windows are not made universally safe by the poison run. Dedicated tests cover some such cases. Fault injection covers captured callable operations, not arbitrary allocation/property-write failure. Source anchors and V8 stack/block coverage create maintenance and engine-version dependencies; the negative controls exercise them on the measured engine. None of this is native exclusion, containment, crash durability or a proof of arbitrary future code.

## Prior findings and cumulative reconciliation

Original records remain authoritative for their exact counterexamples. The disposition below includes dependent current behavior; an earlier PASS or unchanged source was not treated as an exemption. Abbreviations group IDs from the named records.

| Prior findings | Current disposition and closure evidence |
|---|---|
| K12-R1-AUTH-01/HOLD-01/DELIVERY-01; R2-TAKEOVER-01 | Closed: separate powers/safe replacement, explicit permitted actions, per-delivery epoch attribution and all post-safety revalidation outcomes remain correct. Current tests and expanded faults cover their interactions. |
| K12-R1-HISTORY-01; R3-HISTORY-02; K12C1-R9-HISTORY-01 | Closed: positional frozen history owns only intended fields; actual authority is recorded; no inherited optional read or caller object enters retained history. Prebuilt answers/history preserve causal order across both hold clears and Outcome completion. |
| K12-R1-DOC-01/REC-01; R3-AUTH-02; R4-AUTH-DOC-01 | Closed: accepted wrapper and hold-ending records are prebuilt; attempt grant is distinct from control/inspection; transaction prose and available immutable evidence agree. |
| K12-R5-LAYER3-01/PROC-01; R7-PROC-01; R8-DOC-01 | Closed: normative payload is inside exact C/H; administrative allowlist verifies; exact-H documentation checks pass. No later-head acceptance. |
| K12-R6-LAYER3-01/EVID-01/DOC-01 | Closed: decision-01 authorizes the carrier; original grant saved before redelivery remains usable; per-delivery capabilities remain distinct; front door reflects the private implemented surface. |
| K12-R9-ORDER-01/EVID-01; R10-EVID-01/VAL-01 | Closed: malformed content does not decide or disclose pre-authority refusal; real malformed-text fixtures, whole-state assertions and raw validation remain available. |
| K12-R11-ORDER-01; R13-ARCH-01/DOC-01/REC-01 | Closed under decision-02: independently usable stale coordinates still fence a proposal; eager computation is distinguished from diagnostic disclosure; revision identities agree. |
| K12-R14-ID-01/EVID-01 | Closed: primitive-string consumer rule admits minted long/surrogate IDs throughout replay and controls; exact equality and engine-composition qualification are preserved. |
| K12C1-R1-DIAG-01; R2-AGG-01/EVID-01 | Closed: bounding occurs before caller-sized concatenation; weighted suffix counts/order and lossy-display-independent identity survive all root consumers. |
| K12C1-R4-EVID-01; R6-EVID-01 | Closed: independent spelling oracles cover returned/retained receipts, carried Events, redelivery, holds, two exchanges/Executions and both terminal forms. Z/X evidence remains available. |
| K12C1-R4-VALUE-COST-01; R6-VALUE-TIME-01; R8-VALUE-DEPTH-01/EVID-01 | Cost/evidence obligations transferred, not accepted here. The concrete diagnostic constructor-chain read is eliminated and diagnostic semantics remain covered. V-D1 stays held for K1.1-correction-03. |
| K12C1-R9-CLAIM-01 | Closed: source comments, baseline and roadmap no longer claim the transferred cost guarantee as implemented. |
| K12C1-R10-READ-01/COMMIT-01; R11-READ-01/COMMIT-01 | Closed under amendment 03: their exact prior examples are rejected by pinned runtime controls, and the current runtime sweeps pass. Analyzer gaps are disclosed. The superseded universal-analysis requirement is not reinstated. |
| K12C1-R12-ORACLE-01/SCOPE-01; K12C1-R9I-ORACLE-01/SCOPE-01 | Closed by the independent controls, source inspection, scope probe and complete sweeps above. |
| Implementer STRING/DESCRIPTOR/HANDLER, HOST-01–03, UNSUPPORTED-01, REFUSAL-01 and CATALOG-01 corrections | Provenance remains implementer-owned. String preflight/type-only labels, optional-host resolution, own error name, append-before-index refusal and accurate catalog wording agree with source/evidence. No transferred cost claim is inferred. |

Earlier P3 observations retain their recorded nonblocking status: reporter/engine dependence, permitted-action qualifiers, historical editorial/status wording, allocation limits and cost observations. The earlier re-prototyped-built-in observation remains its separate owner-triage item. No absent correction review-05 or review-07 is invented. Historical ACCEPTs do not supersede later invalidations; the old recurrence owner notes remain intact. This H closes the identified oracle/scope family rather than carrying it into another correction round.

## Normative payload, migration and third-party scope

The full Layer-3 delta preserves one rule owner. Execution-cycle owns submission authority and its ordering/lifetime; identity owns exchange/attempt/epoch and producer-compatible identity; values owns capture and diagnostic obligations. Links from core, integration and the index point to these owners. Decision-01 narrowly authorizes the third delivery argument; decision-02 resolves coordinate precedence; decisions 03/04 establish the caller/engine boundary. Decision-05's future meter is not silently installed in current values prose.

Binding representation, epoch numbering, receipt/disposition storage and transaction choices remain explicitly binding choices with their open markers. Persistent submission authority remains `OPEN(K3.2)`. Specification pages acquire no build/acceptance status. Relevant rewrite-index dangerous inferences were checked, including delivery versus acceptance, retry versus takeover, epoch versus authority/native exclusion, held RUNNING versus WAITING/failure, reservation versus acknowledgment, terminal disposition versus deletion, output versus action, structure versus identity, specification versus shipped behavior, and green local checks versus external proof. No additional violation was found.

SDK/guides/examples still use the supported legacy core. The private target package has no migrated public consumer or release claim. The source/import inventory and DX-4's K2.2 disposition match the code. No new third-party dependency, copied external source or asset appears in the cumulative implementation; the lockfile is unchanged, and the existing approved `canonicalize` dependency remains the boundary's serializer. This is not a new legal-clearance opinion. Reviewer probes are evidence files, not product incorporation.

## Validation: reruns and inspected logs

Reviewer environment: Node **v25.2.1**, npm **11.6.2**, TypeScript **5.9.3**, Darwin arm64; existing dependencies, no install or lockfile change. Commands ran in the exact-H worktree except the explicitly identified scratch probes.

| Independently executed | Result |
|---|---|
| `npm run typecheck` | Exit 0. |
| `npm test` | Exit 0; **3,774/3,774 tests**, 447 suites; zero failed, cancelled, skipped or todo. |
| `npm run test:kernel-sweeps` | Exit 0. Fault: **66 scenarios, 54,288 runs** (54,222 injected operations plus 66 repeats), 35 intercepted method kinds, zero violations; 57/57 exits. Poison: **1,712/1,712** in each off/count/throw/reenter mode; 43 test files, 310 names, four prototypes; 11,532 windows and 11,578 matching traced calls per mode; zero zone firings; every poisoned window has its liveness probe. |
| Four archived controls ported to H | 29 altered observations, all rejected; zero clean violations; operation-12 capture stack preserved. |
| Three review-12 controls independently ported | Three rejected alterations, three passing clean counterparts; exit 0. |
| Maintained review-12 control selection | Exit 0; four tests pass, no skips. |
| Original review-12 scope probe against H | Exit 0; all 16 rows agree with expected classification and whole-view constraints. |
| `node docs/development/work/K1.2-correction-01/check-records.mjs` | Exit 0; ancestry/preservation checks and 26 files/713 local links. |
| `npm run check:builder-docs` | Exit 0; 72 Markdown files, 1,845 links/anchors, 38 package imports. Navigation evidence only. |
| Source, archive and attachment integrity | Exact allowlist, 1,626 tracked blobs, 73 evidence hashes, seven decompressions and 39 prior archive entries verify. |

**Inspected, not fully rerun:** the 68 submitted command records and associated raw outputs, historical mutation/adaptation collections, extreme-memory/string and timing probes, line/branch coverage, and before-fix comparisons. In particular, the original 36-ablation runner has four obsolete anchors; the adapted run rejects all 36. The revision-4 runner stops at an obsolete anchor; its rebound run rejects 20 and reports V5 as the disclosed equivalent survivor after removal of its message producer. The live diagnostic-lookup controls remain rejected. Old history reproducers fail because their expected bad value is absent; the expected-correct matrix has zero violations. Historical diff-check whitespace is confined to sealed output/quoted evidence. Search exit 1 denotes no match. These nonzero exits were not represented as green tests.

Submitted entries 56/62/63 distinguish 28 rejected runtime mutants from six declared outside cases, kill every one of 29 oracle comparisons, and reject five production mutants that the older sweep accepted. Their clean controls pass. The report also preserves an earlier oracle-test timeout and its completed rerun; I do not infer successful evidence from the timed-out attempt. Current reviewer runs complete cleanly.

No Node 22 run, clean dependency installation, exhaustive repetition of historical mutations, native integration, process-death, packaging, paid/live benchmark or V-D1 proof was performed. Agent behavior is unchanged; its submitted 12-test eval log was inspected, not rerun. The full suite includes relevant conformance/SDK checks; duplicate script aliases were not rerun merely to repeat them.

## Per-criterion verdicts and disposition

| Criterion | Verdict | Rationale |
|---|---|---|
| C1 | PASS | Scope precedes content; hidden/missing produce the same nonmutating refusal. |
| C2 | PASS | Replay/conflict precede fresh checks and preserve original decisions. |
| C3 | PASS | Whole-envelope, per-coordinate and per-root rules hold; refusal leaves the exchange answerable. |
| C4 | PASS | One accepted writer and complete prebuilt decision under the declared in-process qualification. |
| C5 | PASS | Continue/terminal/next-exchange transitions and result types remain correct. |
| C6 | PASS | Batch acknowledgment and outside-batch terminal disposition remain distinct; terminal ingress refuses. |
| C7 | PASS | Unsupported Effects/waits/obligations refuse the whole proposal. |
| C8 | PASS | Authorized safe takeover preserves the exchange, replaces attempt authority and revalidates callback changes; required fault evidence now holds. |
| C9 | PASS | Code holds preserve logical state and exact evidence through entry/update/idempotence/clear. |
| C10 | PASS | Protocol holds and both ending paths preserve authority, history and returned answers. |
| C11 | PASS | Late reports settle only their physical row; late Outcomes cannot commit into a later exchange. |
| C12 | PASS | Immutable exact evidence and sequence positions; the oracle now checks all promised observations. |
| C13 | PASS | Own observation/ambient safety and bounded runtime evidence support the declared claim. |
| C14 | PASS | Private zone/import boundary and deferred consumer inventory remain accurate. |
| C15 | PASS | Canonical ownership, open choices, baseline, migration and runtime-scope claims agree. |
| Correction DEC-1–3 | PASS | Producer-compatible exact identity and decision-02 ordering. |
| Correction DEC-4–6 | PASS | Bounded diagnostic display, exact structured coordinates and separate explicit-diagnostic rule. |
| Correction DEC-7 retained semantics | PASS | Bounded details with exact weighted suffix counts/order; no skipped roots or semantic-limit change. |
| Correction DEC-8 | PASS | Declared poison scope passes; analyzer limits are honest; no qualifying escaping mistake found. |
| Correction DEC-9 | PASS | Complete-decision/location checks, negative controls and declared scenario/exit coverage pass. |
| 006/008 identity, release, prerequisites and evidence | PASS | Exact identities, cumulative/correction scope and accessible immutable evidence verified. |
| V-D1 and transferred cost/evidence work | DEFERRED | Explicitly assigned to K1.1-correction-03; its claim hold remains. |

No new blocking finding or unresolved architecture decision. Recommended transcription: **ACCEPTED for H `b7191dbf630defeff7756122a6798e15d0b73dd3` only**, closing the four oracle/scope IDs above. This supplies independent acceptance of the cumulative packet at that candidate. It does not accept the review's recording commit, verify a later merge, remove the separate V-D1 hold, integrate the packet, or release a successor. Owner integration and discussion remain separate under 006.

ACCEPT
