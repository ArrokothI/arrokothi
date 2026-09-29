# Independent review — K1.2-correction-01, round 12

## Result

**CHANGES REQUIRED.** Record packet state **CHANGES_REQUESTED**. Two P2 findings remain in the required DEC-9 evidence: the fault oracle accepts observations that violate its advertised complete-decision rule, and its scenario list does not cover the control exits it claims to cover. Neither finding is a demonstrated production failure at H. The production tests and both runtime sweeps pass; their passing results do not close these defects in the evidence itself.

This is an independent review under governing 006 and 008. No implementation, repository record update, commit, merge, integration or successor release was performed. No architecture decision or unavailable required access prevents the corrections. Both existing invalidation holds remain. No revision, including a later administrative or merge commit, is accepted by this record.

## Reviewer, identity and access

- **Reviewer:** this independent Codex desktop session, 2026-09-29 UTC. Session instructions identify the GPT-6 family; the exact serving model/version is not exposed. I did not author the submitted implementation or any earlier review in this session. No delegated reviewer was used.
- **Packet:** K1.2-correction-01, parent K1.2; both submitted contracts revision 9. Owner amendments 01–03 and K1.2 decision-05 govern the correction. Amendment 03 changes the acceptance evidence for DEC-8/9; it does not waive their runtime obligations. V-D1 is transferred.
- **Repository:** `https://github.com/ArrokothI/arrokothi.git`; branch `codex/k1.2-correction-01-activation-identity`.
- **Access:** full local Git objects, source, cumulative diff, correction diff and retained raw evidence were accessible. The owner checkout remained clean and unchanged. Review execution used a separate full Git clone at detached H with its own copied dependency directory. Initial sandbox DNS failure was resolved by an approved read-only remote query. No required external blocker remains. This session does not independently authenticate the earlier owner conversations behind the adopted decision records.
- **Environment:** Darwin arm64, Node v25.2.1, npm 11.6.2, TypeScript 5.9.3. Dependencies were copied from the available installation, not independently installed from a clean package registry. Native Driver, live model, external quality and deployment access were not used or credited.

| Identity | Full revision |
|---|---|
| Governing process baseline and cumulative base B | `a20d278185eaffc7f8b7489345a3624231ff6e6d` |
| Payload C | `81dca4575ea56cfdde5b5f8ed72c439c7ec31821` |
| Reviewed candidate H | `4a917f8caac04e7d9861e0ec3638662d52f9d3ae` |
| Previous reviewed H | `dcac779bdf7e887bcf42c8a6407c1b24c2083a55` |
| Previous review 11 recording revision | `d005dc6281a17f75bbad0b32c59aec169cdcc1ae` |
| Correction release / invalidation-01 | `6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb` |
| Amendment 01 / decision-05 | `13a73ad9ad0662fe585d1453280c5ac3da4f79bb` |
| Amendment 02 | `60eebc24113eb834e5d88015ca2a196c95c60493` |
| Amendment 03 | `b93ed1df6b70569ada060481523e5b37c206e324` |

The read-only remote query advertised H for the branch and B for `main`. Local HEAD was H and clean. C is an ancestor of H. C..H contains exactly the declared administrative allowlist: the K1.2-correction-01 row of 007, `implementation-08.md`, and its enumerated validation-08 outputs/manifest (66 files). No evaluator, fixture or production change is smuggled into that delta.

Prerequisite acceptance and integration records were inspected, including archived records at `9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49`. The following identities are ancestors of B as well as H:

| Prerequisite | Accepted H | Integration |
|---|---|---|
| K1.1-correction-01 | `52b1600f3b42e3a360fdc3395178f1d147edf304` | `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa` |
| K1.1-reference-01 | `644dfffc7904176ee3a4f9943310cf926408a113` | `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa` |
| K1.1-correction-02 | `719abbf9e55e7489b6255a08cbb9e97a1e960a5e` | `954d31b00eb7f2412c22ccf7d4d079699f0c4032` |

These historical acceptances do not release the held V-D1 claim or imply acceptance of the cumulative candidate.

### Governing and evidence identities

At B I read `AGENTS.md`, applicable architecture/slice-audit skills, the mental-model entry, the development front door, 006, 008 and 012. AGENTS, those skills and 006/008/012 are unchanged at H. I examined the front-door change as payload. I read the submitted contracts, 007 scope/status, implementation-08, amendments, decisions, invalidations and prior reviews, then reconciled their claims with the candidate.

| Artifact | Identity |
|---|---|
| 006 at B/H, Git blob | `1f0c5bb7c780c90560f9624fd6fa3c017160b6a8` |
| 008 at B/H, Git blob | `bacea5d120c6a29f6700773f87ee7350e247bdb7` |
| 012 at B/H, Git blob | `35fa507ae81973e7b8190876dd4a4a98446bb3e7` |
| Parent contract SHA-256 | `28f5103c2158bda671a1b80155c8ccea7fb9a741887dfb49955f7d887fb1c9f4` |
| Correction contract SHA-256 | `c619a629602c17bebcfe603768aca73e432c452eccba950f508321949a041894` |
| Submitted validation-08 manifest SHA-256 | `1414096365f04eea0b851a7ad07ad52bb60c609fc8ccf156b63387110f451da5` |
| Full B..H binary patch, uncompressed SHA-256 | `a78704e2f0ea554e483fe3091cccd0774d21ff187f502507dc6012322a8b2e65` |
| Previous H..H correction patch, uncompressed SHA-256 | `3112b96ed9064750280362f44e5cf4e1f01d4d4ee92688f8525b12be2e8fd7e7` |

The full patches contain 455,775 lines / 34,266,392 bytes and 59,049 lines / 4,169,721 bytes respectively. They were obtained locally without a hosted diff truncation. The cumulative payload and surrounding source were inspected; repetitive historical raw outputs were audited as evidence, not mistaken for new executable payload. All 551 entries across 17 available correction review/validation manifests match, and all seven compressed historical diff-check outputs match their declared uncompressed digests.

The [evidence directory](review-12-evidence/README.md) contains the full source archive at H, both full compressed patches, reviewer logs/probes, search records and an integrity manifest. This makes the findings and underlying source available without relying on an inaccessible temporary path.

## Independent obligations and interaction coverage

I wrote the [independent coverage map](review-12-evidence/independent-coverage.md) from the governing sources and contracts before using implementation-08's explanation, apart from identity/initial discovery excerpts. Governing owners examined include core; identity, values, state, evidence, authority, lifecycle and output; creation, execution-cycle, recovery and actions; Kernel/Runtime/Driver boundaries and deployment; and rewrite-index §§4–5.

012 methods used: normative decisions, deterministic execution, in-process race/fault, and process/documentation. Native fidelity belongs to R1; external E1 to K1.4; persistence/process death to K3; packaging/public release to S1. These methods were excluded for those assigned claims. Exception injection is not process-death proof. V-D1 cost work is assigned to K1.1-correction-03 under decision-05; no timing measurement in this review certifies it.

The following table records the independently chosen distinguishing cases, full-result obligations and final per-criterion verdicts. PASS is a bounded review conclusion at H, not a proof against all future programs. FAIL rows distinguish correct observed production behavior from deficient mandatory evidence.

| Criterion | Obligation, strongest cases and forbidden changes examined | Evidence and verdict |
|---|---|---|
| C1 scope | Hidden/missing on Outcome and all three controls, content getters, caller visibility versus control power. Destination alone may be observed before scope; hidden activity changes no visible record. | Coordinator scoping, nondisclosure/control suites, independent omitted-exit probe: **PASS**. |
| C2 replay/conflict | Exact replay after resolution, next exchange and terminal, including absent/retired grants; changed epoch/content conflicts. Original receipt/decision preserved, no other mutation. | Captured accepted identity, replay lookup, late-report/terminal/exact-coordinate assertions: **PASS**. |
| C3 complete validation | Long/empty/surrogate primitive IDs, malformed/absent/unobservable coordinates crossed with usable stale coordinates, grant and invalid content; separate root limits, sibling roots, capacity, duplicate emissions. No unauthorized returned/retained content diagnostics or partial acceptance. | Identity, partial-claim, limits, aggregate and authority tests; envelope/value/currency source: **PASS**, excluding assigned V-D1 cost proof. |
| C4 Outcome atomicity | Capture/reentry before checks; prebuild receipt, progress, output, terminal dispositions, resolved exchange, both hold endings and accepted wrapper; apply once to pinned batch. | Full coordinator/Outcome source and transaction/hostile/terminal tests: **PASS** for declared caller-reachable semantics. The supplementary fault oracle's unqualified Outcome exemption is a separate evidence defect below; engine exhaustion inside apply is not claimed atomic. |
| C5 next state/exchange | Continue then fresh dispatch, empty batch, new ID/base; complete and fail never reopen. Old replay cannot resolve the later exchange. | Lifecycle/identity/exact-coordinate tests and dispatch/acceptance source: **PASS**. |
| C6 B-5 and terminal ingress | Reserved batch plus later input; both terminal forms; exact old input replay, changed retry and new input. Queued outside-batch input is disposed, never acknowledged or silently dropped. | Terminal/ingress suites and full acceptance writes: **PASS**. |
| C7 deferred work | Effects, completion obligations and await, including hostile nested values; whole refusal, no Effect/admission/settlement record, no wait interpretation or automatic retry. | Unsupported/Outcome tests and capture source: **PASS**. |
| C8 takeover/authority lifetime | Safe/unsafe/absent/throwing Driver; safety callback resolves, terminates, changes exchange, takes over or holds code. Same batch/ID, one epoch advance, saved grant survives ordinary redelivery and is fenced by takeover; distinct delivery reporters. | Takeover, reentrancy and submission-lifetime tests plus source and independent five-callback probe pass. Required DEC-9 evidence is incomplete: **FAIL — ORACLE-01, SCOPE-01**. |
| C9 code hold | Entry, reason update, duplicate, clear, both holds, Outcome end; unchanged RUNNING/progress/exchange, actions agree with commands, frozen causal history survives. | Recovery/hold/history tests and positional builders pass; mandatory control-fault evidence remains deficient: **FAIL — ORACLE-01, SCOPE-01**. |
| C10 protocol hold | Bounded diagnostic/fallback, current/stale/no-open/terminal reports, control versus attempt authority, duplicate, takeover/Outcome clear. Compare returned hold answer as well as retained history. | Recovery/control/ambient tests and source pass. Fault classifier does not compare the accepted answer, and scope misses exits: **FAIL — ORACLE-01, SCOPE-01**. |
| C11 late traffic | First settlement wins, original delivery epoch retained across redelivery/takeover/resolution/next dispatch; old Outcome replay/conflict touches no newer exchange. | Delivery closure capture and attribution/late-report/lifetime tests: **PASS**. |
| C12 receipts/evidence | Exact receipt/output/Activation/Event coordinates, cross-execution uniqueness, both terminal forms, immutable projections/history, contiguous per-execution positions, hidden-scope equivalence and old-grant capability. | Direct exact-value assertions, whole-view tests and source pass. Required fault checker loses grant and returned-answer coverage on allowed decision branches: **FAIL — ORACLE-01**. |
| C13 own observation/ambient safety | Own fields once; inherited/throwing/revoked fields; descriptor/index/global pollution, host optional member resolution, serializer and late callbacks. Search dependent reads and writes after observation. | DEC-8 bounded runtime sweep, complete-name catalog, source and existing hostile/ambient tests: **PASS**. Analyzer gaps acknowledged; no universal static-proof credit. |
| C14 private boundary/inventory | All 13 zone modules, imports, dependency inventory, DX-4 disposition and legacy consumers. No portable/public/native inference. | Architecture guards and source/import review: **PASS**. `canonicalize@3.0.0` remains the sole third-party zone dependency; no new dependency introduced. |
| C15 maintained reference/claims | One owner per rule, open markers retained, decision provenance, no Layer-3 build status, examples/migration match actual boundary; evidence descriptions must match the checker. | Normative Layer-3 payload passes. BASELINE/contract/report overstate DEC-9 scope and observation: **FAIL — ORACLE-01, SCOPE-01**. |

Correction DEC-1 through DEC-7 pass for their retained in-packet identity, exactness and bounded diagnostic obligations. DEC-7's assigned refusal-cost obligation and V-D1 are **DEFERRED to K1.1-correction-03**, not accepted. Correction DEC-8 **PASS** under amendment 03's bounded method. Correction DEC-9 **FAIL** for the two findings below. No other in-packet obligation was intentionally left unexamined; evidence gaps and material limits are recorded below.

### Layer-3, examples, migration and correction delta

I read the full Layer-3 diff and its owning context. The third submission argument, attempt-grant lifetime and delivery capability belong to execution-cycle under decision-01. Identity accepts the required primitive strings without conflating exact identity with diagnostic rendering. Decision-02 governs malformed coordinates and keeps eager internal capture distinct from refusal disclosure. Values observation/handler cost qualifications track decisions 03/04; decision-05 and amendment 01 keep V-D1 held and assigned elsewhere. Open binding, epoch representation, persistence of grants, receipt/storage and per-entry disposition choices remain marked and point to implementation decisions.

No new competing normative owner, Layer-3 build/acceptance status, or silently settled open choice was found. I checked all rewrite-index §5 dangerous-inference entries for relevance, including delivery versus acceptance, retry versus takeover, visibility versus authority, held versus failed, Outcome versus native completion, batch acknowledgment versus progress, terminal disposition versus acknowledgment, outputs versus authority/Effects, and interface/fake evidence versus native/external proof. The packet does not commit those inferences. SDK/examples continue to use the legacy supported surface; this private landing zone claims no migrated public consumer or packaged release. DX-4 retains its explicit owner/trigger because legacy coercing schemas do not implement values.md.

The correction delta adds runtime sweep machinery and bounded analyzer descriptions; its substantive coordinator fix builds/appends the refusal before advancing its index. I traced that shared helper and its callers, not just the seed test. The old-H fault log records 57 violations across refusal paths; current H and the rerun have zero. The Outcome and three control implementations were also reread with surrounding helpers and immutable projections. The review did not treat unchanged paths or earlier PASS results as exemptions.

## Findings

### K12C1-R12-ORACLE-01 — P2 — the fault checker accepts incomplete or inconsistent observations

**Candidate locations:** [fault-child.ts lines 409–414](https://github.com/ArrokothI/arrokothi/blob/4a917f8caac04e7d9861e0ec3638662d52f9d3ae/packages/kernel/tests/sweep/fault-child.ts#L409), lines 470–496 and 501–520. Related claims: correction contract DEC-9 observation/oracle and coverage row (lines 349–362, 430); implementation-08 lines 101–121, 257 and 454–455; implemented baseline lines 255–263.

**Governing obligation:** correction DEC-9 under amendment 03, C8–C10/C12 and 012 deterministic/race-fault methods. A declared allowed decision must account for the whole observable result and forbidden mutations. The candidate explicitly adds the setup grant to its observations because it is absent from the view.

**Concrete checker failures:**

1. `refusalAdded` compares the view and both positions but never compares `state.setupGrant`. A refusal can therefore be classified as “exactly one refusal recorded” even if the observed original grant becomes unauthorized. The helper's `State` type and `observe` already include this observation; the refusal branch discards it.
2. Accepted branches compare only `state`; they never compare `answer.value` with the reference or alternate returned answer. An accepted `reportProtocolFailure` returning `changed: false` and `recoveryHolds: []` passes while retained state correctly contains the newly entered protocol hold. This loses the returned half of DEC-9's retained-or-returned decision. The no-fault repeat also compares state alone.
3. The Outcome exception branch permits any changed state when the thrown operation's **method name** is in `APPLY_KINDS`. It does not establish that the fault occurred in the declared apply window or that the state is a permitted prefix. The recorded source site is used only in a message. A synthetic observation with `progressRevision: 123456` and label `Reflect.apply` is accepted as an Outcome apply exception. This demonstrates an unqualified exception in the evidence rule; it is not a claim that current production creates that state. Genuine engine faults inside the declared apply window remain outside the packet's atomicity claim.

**Independent evidence:** [oracle-probe.json](review-12-evidence/oracle-probe.json), generated by the supplied [probe builder](review-12-evidence/build-oracle-probe.py). It copies the exact candidate classification branches, obtains real clean reference/refusal observations, alters only the observations described above, and receives zero violations in all three cases. The first grant changes from `accepted at 5` to `unauthorized_submission`; the second reverses the returned hold answer while preserving the actual correct view. This is a mechanical negative control of the evaluator, not a production mutation, analyzer evasion, or proof of a production exploit. The full runtime fault sweep also passed when rerun.

**Impact:** the reported zero violations cannot support the promised complete-decision/grant/answer claim. The ordinary test suite may catch many wrong answers, but it does not repair the fault sweep's missing comparisons under injected faults.

**Required outcome:** make each allowed fault outcome an auditable complete decision over the relevant returned value, whole view, sequence positions and authority capability, with narrowly justified exceptions for genuinely excluded apply/delivery phases. The above altered observations must be rejected where the decision requires them to agree. Add meaningful finite negative controls and rerun affected fault coverage; keep claims synchronized. The finding specifies the outcome, not a required helper design or sole patch. It does not require a sound analyzer or a proof over arbitrary future programs.

### K12C1-R12-SCOPE-01 — P2 — “every exit” is wider than the fault sweep's reachable scenario coverage

**Candidate locations:** [fault-child.ts lines 288–330](https://github.com/ArrokothI/arrokothi/blob/4a917f8caac04e7d9861e0ec3638662d52f9d3ae/packages/kernel/tests/sweep/fault-child.ts#L288); contract lines 363–368 and 430; implementation-08 lines 132–139 and 284–286; implemented baseline lines 255–263.

**Governing obligation:** amendment 03 requires honest declared bounded runtime scope; correction DEC-9 declares every exit of all three controls. 012 requires terminal, missing-resource and both reentrant orders where they affect the claim. Passing ordinary tests or executing a shared line elsewhere is not evidence that faults were swept along a missing path with its own pre-state.

**Concrete missing paths:**

| Control | Reachable exits absent from `SCENARIOS` |
|---|---|
| All three controls | Unknown and hidden destination entry exits. |
| `reportProtocolFailure` | Wrong Activation, no unresolved exchange and terminal destination. |
| `requestTakeover` | Wrong Activation and terminal destination before safety evaluation. |
| `requestTakeover` after `isSafeToReplace` reentry | Callback terminates, resolves the exchange, starts a different exchange, commits a nested takeover, or establishes a code hold. These reach distinct revalidation exits in coordinator.ts lines 1723–1771. |

The report scenarios have only seven entries and the takeover scenarios only eight; none schedules those five callback decisions. Independent [scope-probe.mjs](review-12-evidence/scope-probe.mjs) exercised all 16 listed missing combinations against clean H. [Its output](review-12-evidence/scope-probe.json) records the expected refusal classifications and preserved whole view, or the nested callback's committed decision plus only the outer refusal. This establishes reachability and correct ordinary behavior; it injects no faults and does not fill the missing fault evidence.

**Impact:** a maintainer reading “every exit” cannot determine the true boundary of the DEC-9 result. In particular, no-call baselines after an intentional callback decision need explicit treatment; a nominal accepted-takeover scenario does not establish those paths' fault behavior.

**Required outcome:** reconcile the scenario inventory, actual reachable branches and declared scope. Exercise the advertised obligations or provide an auditable, justified bounded coverage/equivalence account consistent with amendment 03 and the maintained review-09/10/11 obligations. Correct the live contract, baseline and new report accordingly; preserve historical records. Any actual scope reduction requiring owner authority follows 006. No universal path enumeration or prescribed implementation is demanded. A declaration cannot simply waive the governing runtime obligation.

## Search performed and amended DEC-8/9 assessment

I searched source and live docs for ownership/optional reads and aliases (`resultingEpoch`, `controlScopes`, limits, `isSafeToReplace`, `hostMember`, `observeOwn`, descriptors and prototype lookups); commit authority and aliases (`mint`, acceptance/refusal positions, append/apply, record builders, grants, receipts, recovery history and returned answers); and sweep/analyzer claim terms (`every exit`, `whole`, scope, guard, sound/comprehensive enforcement, V-D1 and cost claims). Search outputs are in the evidence directory. I followed the located producers through validation, commit, projection, replay and documentation rather than treating search results as closure.

For plausible accidental analyzer gaps I examined the prior partial/nested type claims, default-parameter and shadowed-name examples, host optional-member resolution, descriptor/serialization/late-report paths, and their runtime observation windows. The supplied negative-control logs show the previous in-scope examples rejected by runtime sweeps. Known gaps are now stated: assertions can strengthen types; default initializers can lose mutation provenance; a local named `undefined` can confuse the guard. I did not treat one more syntactic evasion as a finding. **No new program was established here that is both a plausible maintainer mistake and escapes the applicable runtime sweeps on a reachable path.** The two findings concern the submitted evidence artifacts themselves.

DEC-8's full-suite sweep covers 42 test files, derived names on Object/Function/Array/String prototypes, count/throw/reenter modes and window liveness. The catalog supplies descriptor-field poisoning excluded from ordinary caller fixtures. Attribution distinguishes Kernel/canonicalize frames from caller/registered Proxy-handler activity. Limits such as `in`, other built-in prototypes, dynamically built names beyond indexed scope, unexecuted paths and subprocesses outside preload windows are material, not universal proof. Existing dedicated ambient tests cover several of these cases. The bounded evidence and actual source support DEC-8 at H.

I accept the distinction between an escaping pre-apply fault, a contained unobservable-field refusal and a failure of delivery after a committed takeover: canonical observation/delivery rules make these different outcomes. This requires the complete permitted decision to be checked, which ORACLE-01 presently fails. It does not require an architecture decision to force every contained fault back to the no-call state.

## Validation: reruns versus inspected evidence

All commands in this table ran on the clean review clone at H, except the two explicit external probe files. Full raw output is retained. No test failure, cancellation, skipped test or todo was hidden in these reruns.

| Independently rerun command | Result |
|---|---|
| `npm run typecheck` | Exit 0. |
| `npm test` | Exit 0; 3,507/3,507 tests, 441 suites, zero failures/cancellations/skips/todos. Includes maintained static guards, catalog, small fault scenarios, conformance and SDK coverage. |
| `node --experimental-strip-types --no-warnings packages/kernel/tests/sweep/fault-child.ts --summary` | Exit 0; 37 scenarios, 35 intercepted method kinds, 43,446 classified runs, zero reported violations. This is 43,409 injection points plus 37 no-fault repeats; it is not 43,446 distinct injected operations. The JSON result equals submitted validation-08/52. |
| `node --experimental-strip-types --no-warnings packages/kernel/tests/sweep/run-poison-sweep.ts --out <evidence>/reviewer-poison` | Exit 0; off/count/throw/reenter each 1,445/1,445 tests. Each mode has 11,532 windows and 11,578 traced calls; each poisoned mode has 11,532 successful liveness probes, zero zone firings and matching traces. Raw counts distinguish caller/handler activity and 34,596 skipped prototype slots. |
| `npm run check:builder-docs` | Exit 0; 72 Markdown files, 1,846 links, 38 imports. Navigation/mechanical validation only. |
| `node docs/development/work/K1.2-correction-01/check-records.mjs` | Exit 0; 26 files, 713 local links/anchors and preservation/ancestry checks. Remote links not fetched by this checker. |
| Reviewer oracle challenge | Exit 0; three deliberately wrong observations are accepted by the candidate classifier. This successful probe reproduces ORACLE-01, not a passing acceptance gate. |
| Reviewer omitted-path probe | Exit 0; 16 reachable paths, correct normal refusal/whole-view behavior. This reproduces the scope mismatch, not fault coverage. |

The C-time documentation counts are one link lower than H's administrative records. This does not indicate a semantic mismatch. The raw sweep count wording above is more precise than the report's “injected runs” wording.

### Inspected immutable logs, not independently rerun

I inspected validation-08's command, identity, output, exit/count and digest records and reconciled nonzero results rather than treating them all as green gates. These include the original/adapted 36 ablations, 67 correction ablations, exact-coordinate Z1–Z16, diagnostic T1–T4, H1–H22 and 28 round-7 read/commit mutations; the rebound revision-4 runner; reviewer history/ambient/enforcement probes; environment and comparison-cost outputs; eval and separate kernel/conformance/SDK runs; zone coverage; and the new runtime negative controls.

- The original ablation run has four obsolete anchors; the declared adapted run rejects all 36. The older revision-4 runner stops at an obsolete anchor; its rebound result distinguishes 20 rejected mutants and one equivalent V5 raw-message mutation after elimination of that producer. Equivalent is not counted as rejected; the diagnostic-lookup producer mutation remains live evidence.
- Validation-08/56 records 28 runtime-rejected controls and six explicitly outside the claimed observation: C8/C10/C12 and R7/R9/R10. The prior review-11 Pick/default/shadow examples are among the detected controls. I inspected those outputs; I did not independently rerun the full mutation collection.
- Validation-08/57's previous-H faults produce 57 violations, while the poisoned run remains clean. The new shared-refusal ordering fixes that concrete defect. Reviewer reruns confirm the current fault result, with the oracle limitations above.
- Old history defect reproduction commands now exit 1 because the expected defect is absent; the expected-correct matrix records zero failures. Compressed historical diff-check failures refer to sealed quoted/log whitespace; decompression and digests were verified. No claim of a universal clean historical whitespace diff is made.
- Zone line/branch coverage improves with the catalog; it cannot establish all decision paths. Remaining reported lines are the diagnostic catch reached by engine faults and a defensive byte recheck. Cost measurements are observations under their environment, not V-D1 closure.

The [validation audit](review-12-evidence/validation08-audit.txt) and [integrity record](review-12-evidence/identity-integrity.json) give the attachment-level details. Builder/link checks, successful unit tests, analyzer guards and runtime sweeps have distinct evidentiary roles. None constitutes external E1, native exclusion, durability or public-release proof.

## Prior finding reconciliation and semantic closure

The immutable parent and correction review records remain authoritative for their original counterexamples. All references in this section are to those records at H, available in the source archive (under `docs/development/work/K1.2/` and `K1.2-correction-01/`) and in the [pinned source tree](https://github.com/ArrokothI/arrokothi/tree/4a917f8caac04e7d9861e0ec3638662d52f9d3ae/docs/development/work). “Closed” below means the earlier concrete mechanism remains corrected at H; it does not erase historical verdicts or grant acceptance.

| Earlier finding(s) | Disposition after current cumulative inspection |
|---|---|
| K12-R1-AUTH-01, HOLD-01, HISTORY-01, DELIVERY-01 | Separate control power and safe-replacement declaration; explicit permitted actions; causal recovery history; delivery-local epoch attribution all remain implemented. Current dependent source and tests pass. New evidence findings are separate. |
| K12-R1-DOC-01, REC-01 | Complete retained Outcome construction inventory precedes mutation; immutable raw records and identities now available. Closed. |
| K12-R2-TAKEOVER-01 | All five post-safety-callback revalidation cases remain correct; independently exercised here. Its production defect stays closed. Required fault coverage over those paths is separately missing under SCOPE-01. |
| K12-R3-AUTH-02, HISTORY-02; K12-R4-AUTH-DOC-01 | Current-attempt grant is separate from visibility/control; hold-ending history records actual authority; canonical prose describes the three-argument carrier. Closed. |
| K12-R5-LAYER3-01, PROC-01; K12-R7-PROC-01; K12-R8-DOC-01 | This review includes the complete normative payload in exact H, verifies C..H administrative scope and reruns exact-H docs. Earlier identity/late-payload/gate defects remain historically recorded and do not recur. |
| K12-R6-LAYER3-01, EVID-01, DOC-01 | Decision-01 owns the carrier/lifetimes; saved original grant is explicitly tested before ordinary redelivery and after takeover; front door now names implemented surfaces. Closed. |
| K12-R9-ORDER-01, EVID-01; K12-R10-EVID-01, VAL-01 | Authority precedes returned/retained content diagnostics in malformed current-claim combinations; the distinguishing malformed text fixture and raw validation are present. Closed. |
| K12-R11-ORDER-01 | Per-coordinate currency uses any independently usable stale coordinate; malformed companions do not suppress it. Source and partial-claim tests preserve closure. |
| K12-R13-ARCH-01, DOC-01, REC-01 (review-12/13 records) | Owner decision-02 resolves precedence; internal diagnostic production is correctly qualified; revision identities agree. Closed without reopening the owner decision. |
| K12-R14-ID-01, EVID-01 | Producer-compatible primitive-string identity, long and surrogate namespaces/keys, repeated exchange IDs and every consuming boundary are covered. Exactness is distinct from diagnostic rendering. Closed. |
| K12C1-R1-DIAG-01 | Bound before concatenation; malformed/huge identities cannot force an unbounded refusal reason. Producer, control, outcome and projection consumers inspected. Closed. |
| K12C1-R2-AGG-01, EVID-01 | Bounded retained detail with exact weighted code/count suffix and direct exact-identity equality assertions; no loss of issue order/weight. Closed for in-packet diagnostic/identity obligations. |
| K12C1-R4-EVID-01; K12C1-R6-EVID-01 | Independent exact receipt/answer/carried Event/inspection spellings across two Executions/exchanges and both terminal forms; Z/X negative controls in immutable logs. Closed. |
| K12C1-R4-VALUE-COST-01; K12C1-R6-VALUE-TIME-01; K12C1-R8-VALUE-DEPTH-01, EVID-01 | Assigned cost and depth/evidence obligations are deferred to K1.1-correction-03 under amendment-01/decision-05, with the claim hold retained. The concrete constructor-chain diagnostic read is eliminated by type-only classification; this does not prove V-D1. |
| K12C1-R9-HISTORY-01 | Positional builders own only their fields; prebuilt control decisions remove inherited optional history reads and the mutation-before-history window. Reentrant/throwing/mutable-history mechanisms remain corrected. |
| K12C1-R9-CLAIM-01 | Live V-D1 implementation claims removed/qualified and transferred work mapped correctly. Closed. |
| K12C1-R10-READ-01 and K12C1-R11-READ-01 | Original source-guard counterexamples are runtime-detected in the bounded sweep, with static gaps documented. Closed under amendment 03's revised evidence requirement; no universal analyzer requirement retained. |
| K12C1-R10-COMMIT-01 and K12C1-R11-COMMIT-01 | Exact earlier receipt-index mutants are detected by runtime faults and the named seed. Their concrete counterexamples close under amendment 03. Broader required DEC-9 evidence remains open through new ORACLE-01/SCOPE-01; it is not represented as a soundness challenge. |

Prior P3 observations (including protocol-only availability wording, reporter-format dependence, binding/editorial qualifiers and historical cost observations) retain their nonblocking historical status; none is silently promoted to a fresh obligation. Implementer-found STRING/DESCRIPTOR/HANDLER, HOST-01–03, unsupported diagnostic-name and SELF-R8-REFUSAL-01 changes were assessed separately from reviewer findings. Their applicable bounded mechanisms remain corrected; cost work stays transferred. No owner-supplied supplement has been relabeled as an independently discovered defect.

## Gaps, limits and handoff

The unresolved in-packet gaps are exactly the fault oracle and the fault-scenario scope above. I have not independently repeated every historical mutation or cost run, proved static-analysis soundness, run native/external/process-death/packaging gates, or authenticated earlier private owner conversations. Their inspected evidence or explicit out-of-packet assignment is stated above. No production counterexample at H is established by these two new findings.

The strongest remaining risk is that broad evidence labels conceal distinctions between a correct retained state, a correct returned decision, preserved future authority and an excluded failure phase. Increasing scenario counts without checking these observations would not close ORACLE-01. Conversely, correcting the oracle does not by itself establish SCOPE-01's advertised paths.

The [compact handoff](handoff-12.md) identifies this immutable review and its two required outcomes. Corrections remain in the same released packet, followed by a fresh cumulative review of new C/H and evidence. The owner-facing recurrence assessment is a separate [owner note](owner-note-12.md), outside this report's findings and verdict. Neither this review nor its handoff authorizes a merge or successor release.

CHANGES REQUIRED
