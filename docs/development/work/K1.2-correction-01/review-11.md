# Independent review — K1.2-correction-01, review 11

## Identity, authority and access

- Reviewer: this independent Codex desktop session, 2026-09-29. Session instructions identify
  Codex as based on **GPT-6**; the exact serving variant and a durable session identifier are not
  exposed. This session did not implement the submitted candidate. Earlier reviewer records are
  inspected evidence; this record does not claim to have authored them in this session.
- The owner's initial prompt named revision 7. After confirming that [review 10](review-10.md)
  already reviews it, the owner's follow-up authorized reviewing the latest candidate instead.
- Packet/branch: K1.2-correction-01 / `codex/k1.2-correction-01-activation-identity`.
- Governing integrated base and policy baseline B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
- Payload C: `58d9c5c50ff3561c9f7b719a84acfd0b0d5d4d9f`.
- Reviewed candidate H: **`dcac779bdf7e887bcf42c8a6407c1b24c2083a55`**.
- Previous H: `35c6ba0277542236f21f95d695154fa0164feb96`; previous C:
  `602ea3b3955f1aea935849e993ebfb66b64ebd5b`; review 10 recording commit:
  `0efe0ba2ebb3fdde71ac8ab5b7a3ae048f5f5ac1`.
- Submitted [contract](contract.md): revision 8, blob `3535f38f34feda675f82dd252e613c3e7851f0c2`;
  parent [K1.2 contract](../K1.2/contract.md): revision 9, blob
  `edea43ed1c7583c28cca9c4a7612bf4163a75d2d`. [Amendment 01](amendment-01.md),
  [amendment 02](amendment-02.md) and [decision-05](../K1.2/decision-05.md) govern the correction;
  decisions 01–04 retain their expressly preserved scope. Submitted report:
  [implementation 07](implementation-07.md), blob `25f1960e7e61598145ba058a6091c401f5c4decf`.
- Instructions read: AGENTS.md; architecture and slice-audit skills; mental-model README, Kernel,
  Runtime, Driver, Deployment and reference index; development front door and implemented baseline;
  006, 007, 008 and 012. AGENTS.md, both skills, 006, 008 and 012 were checked against B and are
  unchanged through H. Candidate enforcement rules and workflow claims were reviewed as artifacts;
  they do not authorize weaker review.
- Access: complete local Git objects and source snapshots, full cumulative and correction diffs,
  surrounding source/tests/examples and submitted immutable attachments; local shell available.
  The working tree was clean at H for the candidate checks. Configured remote:
  `https://github.com/ArrokothI/arrokothi.git`. A fresh remote lookup failed DNS resolution
  ([raw output](review-11/remote.txt)); current advertised remote SHA/push status is unverified.
  No required review input is missing locally, so this does not require `BLOCKED_EXTERNAL` under
  006. No native Runtime, external service, containment or live release claim is certified.

## Source, prerequisites and evidence identity

[Identity checks](review-11/identity.json) and [source identities](review-11/source-identity.json)
record the verified objects, ancestry, administrative paths and evidence hashes.

- Full B..H was obtained, not a truncated patch: 752 changed paths, 30,141,910 bytes; SHA-256
  `585b36e6afad17f7bfc2082bc26f36260286425052e870dceef9bed26d71d6c8`.
  Full previous-H..H was also obtained: 9,425,104 bytes; SHA-256
  `a6d5ffbefe090612aa29df8dc13fb4dd02e9dcc9173258e05bc3dd7741631992`.
  The available Git objects retain the full source and regenerate both diffs. The large historical
  raw logs were not all reread line by line; source, normative payload, relevant tests and evidence
  were examined by obligation. [Cumulative paths](review-11/cumulative-paths.txt) and
  [correction paths](review-11/correction-paths.txt) are retained.
- C..H exactly matches implementation 07's 58-file administrative allowlist: its report, the one
  007 status update, and output attachments. Contract, analyzers, scripts, tests, source and baseline
  changes are payload at C. The status is WAITING_FOR_REVIEW, not an implementer-authored acceptance.
- Prerequisite accepted H `52b1600f3b42e3a360fdc3395178f1d147edf304` and integration
  `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`, and accepted H
  `719abbf9e55e7489b6255a08cbb9e97a1e960a5e` and integration
  `954d31b00eb7f2412c22ccf7d4d079699f0c4032`, are ancestors of B. Acceptance and integration
  records were inspected, including archived records through their available pinned Git revision.
- Release `6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb`, decision/amendment-01 record
  `13a73ad9ad0662fe585d1453280c5ac3da4f79bb`, amendment-02 record
  `60eebc24113eb834e5d88015ca2a196c95c60493`, B and C are ancestors of H. Both invalidation holds
  remain. No successor release is inferred.
- All 450 entries across 15 correction review/validation manifests match their hashes.
  Validation-07's manifest has 55 entries and SHA-256
  `86f7103c9382a7fc98b6feec887b86755cc436ca42621e1682f375bf7760019d`.
  All 53 submitted command logs name C and match their recorded exit status; clean-C metadata
  records a clean tree before and after validation. Identity and execution logs do not prove the
  semantic adequacy of their oracles.

## Independent coverage and per-criterion verdicts

Ownership is Kernel boundary behavior, accepted state, recovery controls and retained evidence.
The map was derived from the canonical/detail owners and packet contract. The first revision-7
identity lookup exposed some of implementation 06's explanation; this is not claimed as a wholly
report-blind pass. The revision-8 addendum was written before reading implementation 07's account.
[Contemporaneous coverage notes](review-11/coverage-before-report.md) retain this distinction.

012 methods applied: normative decisions, deterministic execution, in-process race/fault, and
process/documentation. Native fidelity R1, external E1/K1.4, persistence/process death K3 and public
packaging S1 are assigned elsewhere. Exception injection here demonstrates a construction-fault
window, not process durability. V-D1 and the transferred time-cost claims belong to
K1.1-correction-03 and are **DEFERRED**. Existing diagnostic semantics remain in scope.

The coverage sources are execution-cycle's delivery/acceptance order and atomic decision,
identity's exchange/epoch/receipt lifetimes, recovery's safe replacement, state/evidence's history,
core/lifecycle's batch and terminal rules, and values' ownership, observation and limits. Every row
includes losing proposals and forbidden changes; a headline lifecycle state alone is insufficient.
The source review covered all 13 zone modules, the analyzer/inventory and both enforcement tests,
the full normative delta, and dependent tests, SDK/guide migration descriptions and examples.

| Criterion | Independent challenge and evidence | Verdict |
|---|---|---|
| C1 scope/nondisclosure | Hidden versus missing destinations on Outcome and all three controls; revoked-scope replay; destination before content; no hidden-state read, receipt or accessible-view difference. Traced scope checks and inspected nondisclosure/authority matrices; full H suite passes. | PASS |
| C2 accepted replay/conflict | Exact stored identity/content/receipt before fresh terminal/currency/grant checks; replay after takeover, next exchange and terminal; conflict adds only the permitted refusal. Traced replay lookup, captured comparison and immutable receipt; activation-identity, late-report and replay assertions pass. | PASS |
| C3 current exchange/content | Long, empty and surrogate primitive IDs versus missing/boxed/revoked/throwing inputs; independent stale coordinates before grant/content; eager capture without pre-authority diagnostic disclosure. Examined partial-claim, exact-coordinate and limit oracles, capacity and no-retry behavior. All four root limits and read bounds retained; no V-D1 credit. | PASS |
| C4 atomic one-writer acceptance | Full batch acknowledgment, outside-batch input, revision, Emissions, receipt and resolution together; synchronous/reentrant delivery; second proposal cannot commit. Traced prebuild/apply and transaction/hostile tests, including refusal/replay equality. | PASS |
| C5 continue/terminal | New exchange carries accepted progress and fresh identity; complete/fail retain typed result; terminal controls/dispatch cannot reopen. Inspected terminal and long-ID paths and tests. | PASS |
| C6 terminal mailbox dispositions | Outside-batch entries get terminal dispositions, never acknowledgments/deletion; terminal ingress refuses, prior input replay retains its disposition, changed retry conflicts. Source and terminal/transaction tests agree. | PASS |
| C7 unsupported obligations | Effect-bearing proposals refuse wholly; unsupported wait content is not traversed; no partial Effect intent or retry. Source and unsupported/Outcome tests pass. Error name is now an own field, closing SELF-R7-UNSUPPORTED-01. | PASS |
| C8 takeover/redelivery | Same exchange/input, new epoch/grant/receipt only on safe takeover; saved grant survives ordinary redelivery; safety callback revalidates terminal/open/currency/code hold after nested operations. Current runtime and maintained tests pass, but mandatory DEC-9 enforcement admits early accepted-state mutation (COMMIT-01 below). | FAIL |
| C9 code recovery | Entry/update/declaration clear, duplicate no-op, coexistence with protocol hold, permitted actions and later answerability; full hold/history/receipt state compared. Current paths pass the 22-case and 30-case reruns. Required common commit enforcement remains unsound (COMMIT-01). | FAIL |
| C10 protocol/authority | Control versus attempt authority, wrong/retired/absent grant, current Outcome ending holds, safe takeover clearing hold, idempotent/stale reports. Runtime source and matrices agree; common recovery-control enforcement remains incomplete (COMMIT-01). | FAIL |
| C11 late physical reports | Physical delivery capability settles only its own row across takeover, resolution and next dispatch; old exact Outcome replays without changing the newer exchange. Inspected delivery attribution, capability closures and late-report tests. | PASS |
| C12 retained evidence/receipts/inspection | Frozen exact coordinates, no mutation by replay/inspection, contiguous future positions after refusals/faults, whole-view nondisclosure. New mutants pass every maintained Kernel test yet allow inspection reentry and an invisible early position advance revealed by the next input receipt (READ-01, COMMIT-01). | FAIL |
| C13 ownership/single observation | Own-only eager capture; every post-observation access, projection, retained history, replay and trusted-host optional member; no live ambient callback after checks. Runtime repairs pass original probes, but assertions/predicates can bypass mandatory access classification (READ-01). | FAIL |
| C14 structure | Private 13-file zone, imports/exports and ownership inventory; no new dependency or portable leaf. Cumulative graph guard and H conformance tests pass; the analyzer defect is not an import-boundary defect. | PASS |
| C15 reference/baseline | Layer-3 ownership, open choices and dangerous inferences pass the normative review below. However, baseline lines 255–266 describe comprehensive order/access enforcement that the new counterexamples disprove. It must agree with the corrected mechanism; linked READ-01/COMMIT-01, not a third independent defect. | FAIL |

Correction decisions: DEC-1–6 and DEC-7's retained diagnostic semantics **PASS**: exact UTF-16
identity across producers/consumers; diagnostics independently bounded and lossy; eight details plus
exact weighted code counts in suffix order; type-only labels; bounded paths before concatenation;
explicit diagnostics retain their separate truncation rule. DEC-7's transferred cost dimension is
**DEFERRED**. DEC-8 and DEC-9 **FAIL** for mandatory enforcement, despite the repaired current runtime
paths. Both apply to dependent unchanged behavior; old PASS labels do not exempt it.

### Searches and normative payload beyond maintained tests

The independent challenges went beyond rerunning named regressions: named-member introduction from
partially known types; nested optionality; user-defined predicates; default parameter provenance;
local symbols shadowing built-in spellings; alias/helper/callback effects; all accepted-state writers,
all hold producers and consumers, prebuild/apply/delivery boundaries; and the next observable receipt
after a construction fault. The new probes below were written independently of the maintained
negative-control matrix. The runtime comparison includes returned answers, state, revision, receipt
count, history and nested acceptance; the fault comparison also follows the next accepted input.

[Expanded claim search](review-11/claim-search-expanded.txt) covers Kernel source and tests, mental
model, active development documentation, guides, SDK README and root README. It searches `V-D1`
and aliases involving refusal/cost/cheap/bound/time, diagnostic retention/construction/expansion,
allocation/traversal, linear/amortized/constant time, meters, per-issue work and costliest cases.
Active contract/report and historical findings were inspected separately. This was not just a search
for the literal V-D1 label. An initial narrower command included a nonexistent Kernel README; the
retained expanded search covers the actual paths. Its exact argument vector and successful exit are
recorded in [claim-search-command.json](review-11/claim-search-command.json).

No renewed V-D1 implementation claim was found. Source comments distinguish retention/read bounds;
the baseline holds the cost claim; roadmap/007 map its transfer. Canonical values.md's existing
normative requirement is intentionally preserved by amendment 01, and historical test names or
sealed timing logs are not fresh certification. No new V-D1 implementation is credited or requested.
The owner progress summary (014) explicitly identifies an older checked-revision snapshot and sends
current authority to 007; its former acceptance description is not treated as a new claim for H.

The cumulative Layer-3 delta keeps delivery/acceptance order with execution-cycle, exact identity and
authority lifetimes with identity, recovery permission with recovery, retained history with
state/evidence, and value semantics with values. Binding choices remain marked and point to the
development record; no new build/acceptance status is put on a specification page. The rewrite
index's open choices and all 31 dangerous inferences were checked for relevance: in particular,
delivery versus acceptance, activation versus attempt/delivery, replay versus fresh submission,
control versus submission authority, `RUNNING` plus hold versus waiting/terminal, Event acknowledgment
versus terminal disposition, memory atomicity versus durable commit, and Kernel fencing versus native
writer exclusion remain distinct. Current 0.8.x examples/SDK are migration context, not evidence that
the target private Kernel API has shipped. No Layer-1/2 change is needed by this correction.

## Findings

### K12C1-R11-READ-01 — P2 — partial and nested type claims evade the ownership rule

**Location at H:** `packages/kernel/tests/zone-analysis.ts:284–296,444–456`; affected contract
DEC-8, C12/C13 and baseline C15. `strengthened` notices an existing optional member but ignores a
member absent from a source type. Introduction is then checked only when the source has no members
at all. The same gap exists for predicates, and the comparison does not descend into nested types.

The independent analyzer probe produces no type errors, no classified sites and no unclassified
calls for each of these forms:

```ts
interface Base { writerEpoch: number }
interface Extra extends Base { resultingEpoch: number }
export const read = (value: Base): number => (value as Extra).resultingEpoch;
// Also missed: a Base -> Extra type predicate, and a cast that changes
// { child: { resultingEpoch?: number } } to { child: { resultingEpoch: number } }.
```

A concrete zone mutant adds this immediately before `inspect()` returns `ok(viewOf(record))`:

```ts
const summary: Pick<ExecutionRecord, "executionId"> = record;
(summary as { executionId: string; resultingEpoch: number }).resultingEpoch;
```

It typechecks and passes **all 1,411 maintained Kernel tests**, including the permitted-syntax,
inventory, effect and negative-control checks. Neither enforcement nor existing runtime tests reject
it. It introduces a declared member from a partially known record; it is not DEC-8's expressly
excluded unknown-to-primitive/list cast.

**Impact:** an authorized protocol report's own `activationId` getter installs an inherited
`resultingEpoch` getter. Clean H never reads it. The undetected mutant reads it during `inspect()`:
counting observes one call, throwing escapes as `reviewer inherited read`, and reentry submits a valid
terminal Outcome with the saved grant. That changes RUNNING/revision 0/two receipts to
COMPLETED/revision 1/three receipts and adds `ended_by_outcome` history while inspection is running.
This reproduces the forbidden behavior in a mutant accepted by the required enforcement; it is not
a claim that unmodified H currently performs this inherited read.

**Evidence:** [analyzer probe](review-11/probe-independent.mjs) and
[results](review-11/probe-independent.json); [full-suite mutant](review-11/run-read-mutant.mjs),
[result](review-11/read-mutant-result.json), [raw suite](review-11/read-mutant-suite.txt);
[runtime probe](review-11/probe-read-runtime.mjs) and [six results](review-11/read-runtime-results.json).

**Required outcome:** the ownership enforcement must account for unchecked member introduction and
strengthening through partially known and nested types, assertions and predicates, including their
dependent reads. These forms must be rejected or soundly classified under the contract, while a
clean control passes. Recheck all post-observation consumers and retain distinguishing whole-result
oracles for ambient counting, faults and reentry. The present implementation choice is not the only
permitted correction; weakening DEC-8 or merely adding these spellings to a denylist would not close
its stated mechanism-level obligation.

### K12C1-R11-COMMIT-01 — P2 — defaults and shadowed names erase mutation provenance

**Location at H:** `packages/kernel/tests/zone-analysis.ts:1064–1070,1078–1086` and
`:975–978,997–1000`; affected DEC-9, C8–C10/C12 and baseline C15. Call mapping omits a parameter
when there is no supplied argument, losing the object provided by its default initializer.
Separately, identity/reach return `NONE` for an identifier spelled `undefined` before resolving its
symbol, even when it names a local Kernel object.

Two independent `requestTakeover()` mutants insert one of the following immediately after the
original prebuilt `mintReceipt` call, before Activation/grant/history/answer construction:

```ts
const reserve = (target: ExecutionRecord = record): Receipt =>
  this.#mint("dispatch_intent", target);
reserve();
```

```ts
const undefined = record;
undefined.nextAcceptancePosition = position + 1;
```

Each passes **all 1,411 maintained Kernel tests**, with tests and inventory unchanged. The analyzer
also reports no control-order/writer violations and the same access inventory. `#mint` advances the
acceptance position before constructing its receipt. The later normal apply suffix writes the same
position, so successful final-state tests conceal both premature mutations.

**Impact and fault proof:** inject the same exception immediately before the subsequent
`PrimordialObjectFreeze` Activation construction in clean H and both mutants. The public view after
failure is deeply equal to its pre-call view in all three cases. Yet the next accepted input receives
position **3** in clean H and position **4** in each mutant. Accepted state was changed before all
construction completed; immediate view equality did not expose the forbidden mutation. The fault is
before takeover's apply interval, so the permitted resource-exhaustion qualification for its two
appends does not excuse it. This is an enforcement defect, not a reproduced fault-order failure in
the unmodified production path.

**Evidence:** [analyzer results](review-11/probe-independent.json);
[full-suite mutation runner](review-11/run-mutants.mjs), [results](review-11/mutant-results.json),
[default log](review-11/default-parameter-suite.txt),
[shadowed-name log](review-11/shadowed-undefined-suite.txt);
[fault runner](review-11/run-faults.mjs), [fault probe](review-11/probe-fault.mjs) and
[three fault results](review-11/fault-results.json). The analyzer-only default probe replaces the
receipt builder; the full-suite variant inserts the helper after the original builder, preserving
all maintained textual anchors. Both reveal the same lost provenance; no test is edited.

**Required outcome:** conservatively retain reachable accepted-state effects across allowed
parameter initialization and argument binding (including absent/undefined arguments), aliases,
helpers and symbol shadowing. Every allowed route must either be analyzed soundly or rejected by the
enforced language. The two mutants must fail the required enforcement while clean H's corrected
successor passes. Recheck all three controls, no-op/refusal exits, construction/apply/delivery order,
and future receipts as well as immediate views. Preserve the declared fault boundary; no particular
patch is mandated.

## Prior findings and correction closure

The current correction delta replaces the old syntactic checks with a substantial TypeScript
analyzer and inventory; production changes are coordinator comments and the own `name` field in
`unsupported.ts`. Exact review-10 probes are now rejected. However, their **required general
outcomes remain open**, carried by R11-READ-01 and R11-COMMIT-01 above. The source of the new failures
is the same conceptual gap between recognized examples and sound classification of permitted code.

Prior immutable dispositions are carried by [review 10's reconciliation](review-10.md) and
[review 09](review-09.md), then rechecked where their assumptions reach H:

| Prior finding family | Current disposition and dependent checks |
|---|---|
| K12-R1-AUTH/HOLD/DELIVERY; R2-TAKEOVER | Runtime closure retained: separate authority, safe replacement, held actions, physical delivery attribution and post-callback revalidation. |
| K12-R1-HISTORY; R3-HISTORY-02; K12C1-R9-HISTORY-01 | Original inherited optional read is gone; positional history construction, exact own fields, mutable foreign references and both clears pass the 22/30-case reruns. Mandatory read/commit enforcement remains open through the two new findings. |
| K12-R1-DOC/REC; R3-AUTH-02; R4-AUTH-DOC | Prebuilt Outcome wrapper and retained evidence, authority and actor attribution remain consistent across acceptance and hold ending. |
| K12-R5-LAYER3/PROC; R7-PROC | Payload versus administrative identity and role separation remain correct. No acceptance of C/H/A is fabricated. |
| K12-R6-LAYER3/EVID; R8-DOC | Three-argument submission carrier and separate exchange/attempt/delivery lifetimes retained; saved grant works across ordinary redelivery. |
| K12-R9-ORDER/EVID; R10-EVID/VAL | Grant-before-content and actual surrogate fixtures remain covered; no content leak or weakening to ASCII-only identity. |
| K12-R11-ORDER; R13-ARCH/REC/DOC | Decision-02's independent currency coordinates, eager capture and canonical ownership remain intact. |
| K12-R14-ID/EVID | Primitive exact identity is closed across producer/consumer paths, long/surrogate namespaces, long keys and the tenth exchange. No invented maximum beyond the declared engine-allocation qualification. |
| K12C1-R1-DIAG; R2-AGG/EVID | Bounded detail rendering, exact equality and aggregate weights/order retained, including matched IDs, missing pins and duplicate Emission keys. |
| K12C1-R4-EVID; R6-EVID | Exact input-derived coordinates, receipt tokens, redelivery and takeover construction remain covered; no receipt-boundary substitution. |
| K12C1-R4-VALUE-COST; R6-VALUE-TIME; R8-VALUE-DEPTH/EVID; O-R8-1–3 | Retention/diagnostic behavior remains covered. Time-cost obligations explicitly transferred to K1.1-correction-03; not closed by timing or allocation observations here. |
| K12C1-R9-CLAIM-01 | Closed for this H by the expanded alias search and inspection of live source, baseline, roadmap, 007 and canonical owners. |
| K12C1-R10-READ-01 / COMMIT-01 | Exact examples rejected; mechanism-level required outcomes not closed. R11 findings give additional counterexamples with full-suite and semantic evidence. |
| O-R8-4; SELF-R4-STRING/DESCRIPTOR/HANDLER; SELF-R6-HOST-01–03 | Owner/implementer provenance retained, not relabeled reviewer discoveries. String preflight and diagnostic/read semantics preserved; decisions 03–05 retain their stated limits and transfer. |
| SELF-R7-UNSUPPORTED-01 | Own error-name field closes the implementation's self-found inherited setter defect; source and new H tests pass. This is not a new reviewer discovery. |

This table uses family abbreviations only for navigation; the linked original records preserve exact
IDs, severities and required outcomes. No absent review-05 or review-07 is invented. Historical
acceptance and invalidation records remain unchanged.

## Validation, interpretation and limits

Local environment: Darwin arm64, Node `v25.2.1`, npm `11.6.2`, TypeScript `5.9.3`, repository
configuration at H. Main candidate commands ran from
`/Users/rex-shih/Documents/ArrokothI/arrokothi` while tracked source was clean at H. Probes/mutants
used exact-H disposable copies, unchanged maintained tests and the installed dependencies via a
symlink. No implementation patch was made to the shared checkout.

| Independently rerun | Result / raw evidence |
|---|---|
| `npm test` | Exit 0; 3,465 tests, 438 suites; zero failures, cancellations, skips or TODOs. [Log](review-11/npm-test.txt). |
| `npm run typecheck` | Exit 0. [Log](review-11/typecheck.txt). |
| `npm run check:builder-docs` | Exit 0; 72 Markdown files, 1,844 links/anchors, 38 imports. [Log](review-11/builder-docs.txt). Link success is navigation evidence only. |
| `node docs/development/work/K1.2-correction-01/check-records.mjs` | Exit 0; ancestry/preservation checks and 25 files/705 local links. [Log](review-11/check-records.txt). Remote links were not fetched. |
| Review-09 recovery matrix with `--expect-correct` | 22 cases, zero violations. [Probe](review-11/probe-recovery-matrix.mjs), [log](review-11/recovery-matrix.txt). |
| Review-10 whole-view comparison | 30 comparisons pass, including queued outside-batch input and mutable/throwing/reentrant ambient values. Only import/output paths adapted to disposable H; assertions preserved. [Probe](review-11/probe-whole-view.mjs), [results](review-11/whole-view-results.json). |
| Independent analyzer/read/fault probes | Three type forms missed; three full-suite mutants each pass 1,411 tests; six ambient runs and three fault runs distinguish clean from mutants as reported above. Scripts and raw results are retained. |
| Git identity/manifests/log audit | Exact allowlist, full ancestors and 450 attachment hashes verified; 53 submitted logs reconciled. [Identity](review-11/identity.json), [log audit](review-11/submitted-log-audit.json). |

**Inspected, not independently rerun:** the entire submitted 53-command battery, original/adapted
36 ablations, I/X/Z/H/R/C mutation families, engine-limit and memory/cost runs, separate eval command
and old-head comparisons. Validation-07's new R/C controls and old-review adapters were inspected in
source and raw output. Its 28 new mutations are rejected by its chosen enforcement tests; that result
does not generalize to the three independently constructed mutants above. The submitted separate
Kernel/conformance/SDK checks are logged; their tests also run in the independent full suite.

Nonzero submitted results are preserved, not silently called passes: the original ablation runner
has 32/36 with four stale anchors, while its disclosed adapter rejects 36/36; the old correction
runner stops at X12's stale anchor, with the rebound run rejecting 20/21 and recording equivalent V5;
the two old defect reproducers exit nonzero because the defect no longer reproduces; historical
diff-whitespace checks fail on retained evidence logs. Metadata records no signals or runner errors.
Old-head enforcement tests expose the old unsupported-name defect; their pass/fail pattern is not a
claim that every prior defect is still present. Timing runs are observations, never V-D1 proof.

No required accessible criterion was abandoned after the first defect. Remaining limitations are
finite counterexample coverage, no universal soundness proof for the custom analyzer, one local
Node/TypeScript environment, unavailable live remote advertisement, and the contract's explicit
external/native/persistence/packaging exclusions. No extra architecture choice or missing authority
blocks correction. This review added no dependency or copied third-party implementation; its scripts
use repository test helpers, Node and the existing TypeScript dependency. No new license clearance
is claimed.

## Verdict and compact correction handoff

Exact transcription: **CHANGES REQUIRED**; packet status **CHANGES_REQUESTED** for H
`dcac779bdf7e887bcf42c8a6407c1b24c2083a55`. Two P2 mandatory enforcement defects prevent acceptance.
Current runtime success and passing test counts do not satisfy DEC-8/9's additional obligations.
No `BLOCKED_EXTERNAL` or architecture decision is needed. The owner ledger has not been edited by
this review. No later administrative/merge commit is certified and no successor is released.

This new review, its evidence and the separate owner note are sealed by
[MANIFEST.sha256](review-11/MANIFEST.sha256). They are local review artifacts; no recording commit or
push is asserted. The source and prior records are pinned by H; preserve these review bytes when
recording the verdict. Reproduction instructions and exact scratch-path qualifications are in
[the evidence README](review-11/README.md).

```text
Correct the same released packet K1.2-correction-01 on codex/k1.2-correction-01-activation-identity.
Base a20d278185eaffc7f8b7489345a3624231ff6e6d; reviewed H dcac779bdf7e887bcf42c8a6407c1b24c2083a55.
Review record: docs/development/work/K1.2-correction-01/review-11.md, with its delivered
review-11/MANIFEST.sha256 content seal.
Open findings K12C1-R11-READ-01 and K12C1-R11-COMMIT-01; required outcomes and counterexamples
are in that record. Review-10's general required outcomes remain open through these findings.
Owner decisions: amendment-01/decision-05 at 13a73ad9ad0662fe585d1453280c5ac3da4f79bb and
amendment-02 at 60eebc24113eb834e5d88015ca2a196c95c60493; unresolved authority: none.
Apply 006 and 012: close the affected semantic subsystem and its dependencies, then re-review
the whole cumulative packet. Fix additional in-scope defects with separate provenance.
Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.
```

CHANGES REQUIRED
