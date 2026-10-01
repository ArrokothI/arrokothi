# Independent review — K1.2-correction-01, review 10

## Identity, authority and access

- Reviewer: this independent Codex desktop session, 2026-09-28. Session instructions identify the
  model as **GPT-6**. A more specific backend model identifier and stable session identifier are
  unavailable. This is separate from implementation 06's Claude Code / `claude-opus-5-5` session.
- Packet/branch: K1.2-correction-01 / `codex/k1.2-correction-01-activation-identity`.
- Governing and cumulative base B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
- Payload C: `602ea3b3955f1aea935849e993ebfb66b64ebd5b`.
- Reviewed candidate H: **`35c6ba0277542236f21f95d695154fa0164feb96`**.
- Previous reviewed H: `3b0848ce408ddef9165434f7d7c36e9580ac6341`, [review 09](review-09.md),
  over C `2613f2b8dee37c934743d9b730e925705086c4c9`.
- Submitted [contract](contract.md): revision 7, Git blob
  `9042cf88ecf800de6dcdb930460e31dcd6bdb2b5`; parent [K1.2 contract](../K1.2/contract.md):
  revision 9, blob `edea43ed1c7583c28cca9c4a7612bf4163a75d2d`.
  [Amendment 01](amendment-01.md), [amendment 02](amendment-02.md), and
  [decision-05](../K1.2/decision-05.md) apply. Decisions 01–04 retain their expressly preserved scope.
- Applicable instructions: repository AGENTS.md; architecture and slice-audit skills; mental-model
  README, Kernel, Runtime, Driver, Deployment and reference index; development front door,
  implemented baseline, 006, 007, 008 and 012. Governing instructions/policy were checked at B.
  AGENTS.md, 006, 008 and 012 have no B..H change. Candidate architecture and contract amendments
  were reviewed as payload, not as permission to waive governing review requirements.
- Access: complete local Git objects, full pinned source, cumulative diff, surrounding source,
  test/example files, immutable submitted attachments and a local shell. The initial tree was clean
  at H; review runs used H's unchanged tracked source plus reviewer artifacts. Configured remote:
  `https://github.com/ArrokothI/arrokothi.git`. A fresh remote lookup failed DNS resolution; no current
  remote advertisement or push is certified. Required source/evidence is locally available, so
  006's external-blocker path is not triggered by that network limitation.

The report was initially opened to resolve C/H and exposed its explanation as well. The obligation
map below was subsequently reconstructed directly from canonical owners and the contract; this is
not represented as a blind, report-unseen first pass. No prior PASS was used to exempt a dependency.

## Pinned source and evidence checks

[Identity evidence](review-10/identity.json) records full trees, ancestry, contract blobs, every
cumulative path and the exact administrative allowlist. B..H has **664 paths**. The full untruncated
diff was obtained locally (276,818 lines), SHA-256
`c084c788979d06441dd6ce6856be2dba101d9070503e7ad696f2b1150a58710c`.
It is reproducible from the available B/H objects; the temporary diff copy is not the retained
evidence source. Both B..H and the correction delta from the previous H were examined. Review
covered the cumulative Kernel code and its supporting tests/docs, not just round 6's new probes.

- C..H is exactly the report's **54-path** allowlist: implementation 06, the one 007 status row,
  and 52 validation attachments including the manifest. Source, contract, fixtures, evaluators and
  normative documentation are all before C. The status change says WAITING_FOR_REVIEW, not ACCEPTED.
- Prerequisite accepted H `52b1600f3b42e3a360fdc3395178f1d147edf304` and integration
  `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`, and accepted H
  `719abbf9e55e7489b6255a08cbb9e97a1e960a5e` and integration
  `954d31b00eb7f2412c22ccf7d4d079699f0c4032`, are ancestors of B. Their records remain available.
- Release `6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb`, decision/amendment-01 record
  `13a73ad9ad0662fe585d1453280c5ac3da4f79bb`, amendment-02 record
  `60eebc24113eb834e5d88015ca2a196c95c60493`, B and C are ancestors of H.
  Both invalidation holds remain; this is the released correction, not a successor release.
- All entries of 13 correction validation/review SHA-256 manifests verified, including all 51
  validation-06 entries. That manifest's SHA-256 is
  `8e4d83584484dce4bf5ae6269c736cdd5cec648d73a85c1e44a9d1f461d52649`.
  Review-09's manifest is
  `fa6a80a77f727736099a227ee9fb8b050fd46562a9cfbb03af50d3c13614e357`.
  Record-preservation/ancestry checking also passes. Hash agreement establishes attachment identity,
  not semantic sufficiency.

## Independent coverage and per-criterion verdicts

Ownership: Kernel boundary semantics, recovery/control transactions and retained evidence. No native
Runtime quality, Driver fidelity, deployment containment or persistence guarantee is being reviewed
into existence. Selected 012 methods: normative examination, deterministic execution, in-process
race/fault probing and process/documentation checks. Native R1, external E1/K1.4, process-death K3
and public packaging S1 are assigned elsewhere. V-D1 is explicitly transferred to K1.1-correction-03.

The map uses execution-cycle's acceptance/delivery/atomic-decision rules; identity's
exchange/epoch/receipt rules; recovery's replacement permission; state/evidence's immutable,
authenticated recovery history; lifecycle/core's terminal and batch rules; and values' own-only,
single-observation and root-limit rules. A successful behavioral row does not substitute for the
additional revision-7 enforcement obligation. The FAIL rows below identify that distinction.

| Criterion | Counterexamples and interactions examined; required observable result | Verdict at H |
|---|---|---|
| C1 scope | Hidden versus missing on Outcome and all three controls, scope revocation on replay, eager capture after visibility; no hidden record mutation or additional field disclosure. Source, nondisclosure/control/submission suites. | PASS |
| C2 replay | Exact versus changed content after resolution, next exchange and terminal, with absent/retired grants. Original receipt and accepted decision preserved; conflict only adds its refusal. Outcome/late-report/terminal suites and accepted-record lookup. | PASS |
| C3 whole validation | Independent usable coordinates, malformed identity/numbers crossed with stale/terminal/current state and grant, capacity before content, every root limit and sibling roots. No pre-authority returned/retained content diagnostic; no partial acknowledgment/output. Partial-claim, identity, limits and exact-coordinate assertions plus classification/capture source. | PASS |
| C4 atomic Outcome | Reentrant observation precedes current-state checks; retained accepted record, progress, batch dispositions, emissions, terminal result and hold endings prebuilt before apply. Whole transaction assertions and current source; no claim of crash durability or engine-exhaustion atomicity. | PASS |
| C5 next exchange | Continue creates a new exchange with base+1 progress and new batch/identity; complete/fail never reopen. Replay cannot resolve the later exchange. Terminal/submission-lifetime/identity suites. | PASS |
| C6 B-5 | Queued input outside reserved batch gets terminal disposition, not acknowledgment. Terminal ingress replay/conflict remains distinct from refused new input. Terminal/ingress assertions and independent whole-view probe with an outside-batch Event. | PASS |
| C7 deferred operations | Effects, obligations and await refused whole; deferred nested effect/wait content not interpreted; no implicit retry. Unsupported/outcome suites and capture source. | PASS |
| C8 takeover | Safe/unsafe/absent/throwing safety declarations, callback reentry, same exchange/input and epoch+1, saved grant invalidation, ordinary redelivery preserving grant. Behavior inspected/passes; required DEC-9 first-mutation enforcement misses two regressions. | FAIL — COMMIT-01 |
| C9 code hold | Entry, changed reason, duplicate, declaration clear, both holds; RUNNING and pinned exchange/progress remain, permitted actions agree, immutable history survives. Current mechanism and probes pass; the shared required control-commit enforcement is incomplete. | FAIL — COMMIT-01 |
| C10 protocol hold | Current/stale report, duplicate, explicit control power versus attempt submission, takeover and Outcome clear. Correct causal history/answer under ambient fault/reentry attempts; required control-commit enforcement remains incomplete. | FAIL — COMMIT-01 |
| C11 late traffic | Reports settle only their physical delivery row with original epoch; accepted Outcome replay/conflict does not affect a newer exchange. Delivery-attribution/late-report suites and delivery closure capture. | PASS |
| C12 evidence | Receipt tokens/positions, frozen evidence, exact long/unrenderable coordinates, non-disclosure, whole returned/retained views and both history clear paths. Original history defect is repaired in current source; the required guard on prebuilding receipt/evidence before mutation is not complete. | FAIL — COMMIT-01 |
| C13 observation/ambient safety | Own envelope observation, optional host members, engine descriptors, grown arrays, positional history builders, commit/replay/redelivery/projection reads and serializer boundary. Current pollution probes pass; the claimed complete optional-read inventory misses valid equivalent reads. | FAIL — READ-01 |
| C14 zone/inventory | All 13 zone sources; private package/import restrictions, existing canonicalize exception, conformance inventory and retained legacy consumers. No provider/SDK/core dependency enters Kernel semantics. | PASS |
| C15 normative/docs | Canonical ownership, authorized carrier change, binding choices/OPEN markers, migration status, V-D1 transfer and alias search. No new silent architectural decision or shipped-cost claim found. | PASS |
| Correction DEC-1–3 | Primitive-string Activation identity on all consumers, including empty/long/lone-surrogate IDs; decision-02 precedence preserved. No coercion or creation narrowing. | PASS |
| DEC-4–6 | Exact coordinates separate from bounded diagnostic spelling; aggregate first-eight details and exact suffix weights/order; explicit diagnostics retain their distinct 1,024-unit rule. Rendering/source, exact-coordinate/aggregate/diagnostic assertions and pinned mutation outputs inspected. | PASS |
| DEC-7 retained obligations | Bounded issue storage/path creation, exact weighted suffixes, type-only diagnostics, scalar preflight, single observations, accepted values and prior read/byte-stop bounds. Cost parity is not inferred from these checks. | PASS |
| DEC-8 enforcement | Every optional-member/dynamic/in access must be inventoried or rejected. Three statically identifiable optional reads evade the actual scanner. | FAIL — READ-01 |
| DEC-9 enforcement | Actual first accepted-state mutation must follow construction of receipt/history/answer. Both early `#mint` and postfix index increment evade the guard and all 1,331 Kernel tests. | FAIL — COMMIT-01 |
| V-D1 meter/cost proof | Decision-05 and amendment-01 transfer it; no meter implemented or certification supplied here. | DEFERRED — K1.1-correction-03 |

### Current mechanism and searches beyond maintained tests

The runtime correction is substantive. `holdHistoryRecord` builds a record with exactly its own
required fields; `takeoverHistoryRecord` owns `resultingEpoch` explicitly. `ControlCommit` owns its
history and both hold fields. Simple controls construct the history, new hold and answer before
`applyControlCommit`; that helper appends history before its plain own-field hold writes. Takeover
prebuilds its receipt without incrementing the position, its Activation, grant, clearing history and
answer; it appends records before replacing the attempt and invokes Driver delivery afterwards.
Outcome hold endings were inspected with these changes, not exempted as unchanged.

For the simple controls, the one append may fail before mutation, while the following own-field
writes invoke no caller code. Takeover has two appends; its contract expressly excludes engine
resource exhaustion during apply. I did not turn that exclusion into a new durability or universal
engine-fault guarantee. Safety-callback revalidation and existing caller-observation reentry remain
separate from this apply-phase argument.

Beyond maintained tests I examined:

- All zone read categories and their construction sites, including record/view/replay consumers,
  optional host access, property descriptors, array growth, and the unmodified serializer's isolated
  call environment. An independent syntax inventory enumerates **1,068 sites in all 13 files**
  ([inventory](review-10/source-access-inventory.json)); enumeration is a navigation aid, not a proof
  that each site is safe. Host-owned required members and custom host prototypes remain subject to
  the declared trusted-host contract, not a newly invented hostile-host guarantee.
- Equivalent TypeScript access syntax against the *actual* candidate scanner, and execution of all
  six forms against an inherited getter. Three missed forms still invoke that getter.
- The existing mutating `#mint` helper and unary writes as alternative locations of the first
  takeover mutation. Both regression variants were tested in disposable package copies.
- Thirty independent whole-view comparisons across six recovery transitions and five modes
  (control/data/mutable/throw/reentry). Stable identities permit deep equality of complete before
  views, answers and after views across arms. These also assert history count, progress, receipts,
  unchanged mailbox/output on controls, and acknowledgment versus B-5 on completion. All pass.
- Claim aliases throughout live source, docs/guides, baseline, ledger, roadmap and architecture:
  `V-D1`, `KC2-1`, refusal/cost/cheap/time/memory combinations, work bounds and `no more than`.
  [Search output](review-10/claim-search.txt) retains the broad search. `values.ts` now states
  read/retention bounds and the held claim. The old `values.test.ts:588` suite title says refusal
  costs stay within the size limit; its actual assertions cover byte/read regressions. I did not
  treat that historical test grouping as certification of the transferred whole-cost theorem.
- Current examples/guides/public imports and the legacy boundary. The target remains private;
  current SDK/core examples do not silently migrate to the new Kernel. DX-4 legacy coercing schemas
  remain assigned to their later consumer/retirement work. No new third-party production dependency
  or copied provider source is introduced. Reviewer probes use existing Node/TypeScript dependencies;
  this review gives no new legal-clearance opinion on unchanged dependencies.

### Layer-3 payload

`execution-cycle.md` remains the owner of delivery/submission lifetimes and acceptance order.
Core, identity, integration and reference link to it. Decision-01 authorizes the narrow third carrier
argument; decision-02 authorizes the independent-coordinate rule. Identity records primitive-string
representation and per-exchange epoch numbering as binding choices while keeping OPEN markers.
Values owns the decision-05 metered meaning; its unit table/budget remains open, and no implemented
meter is inferred. Baseline and 007 carry implementation/acceptance status. The mechanism-page
"Status" lines describe target gates, not build/acceptance results.

Rewrite-index §5 checks included exchange versus attempt, whole-Outcome fencing, representation
overconstraint, atomicity versus durability, held RUNNING versus WAITING, batch acknowledgment versus
obedience, receipt absence, physical exclusion versus fencing, mediation versus isolation, target
specification versus shipped status, silent choices and structural evidence. No new dangerous
inference in these normative changes was found. Layer 1/2 is unchanged.

## Findings

### K12C1-R10-READ-01 — P2 — optional reads escape the required source inventory

**Candidate location:** `packages/kernel/tests/ambient-reads.test.ts:96–98` (binding-element branch)
and the access dispatcher at lines 84–101. Governing obligations: correction DEC-8 enforcement,
C13, amendment-02's subsystem reconstruction and 006/012's meaningful evidence requirement.

For `interface E { resultingEpoch?: number }`, these three ordinary reads are not inventoried:

```ts
const { "resultingEpoch": quoted } = e;
const { ["resultingEpoch"]: computed } = e;
({ resultingEpoch: assigned } = e);
```

The first two use `getText()` values containing quotes/brackets instead of the property name;
assignment destructuring is not a BindingElement and has no matching branch. The same program's
dot access, string element access and bare-name binding are inventoried. This is not uncertainty
about dynamic runtime types: the member is explicitly optional and statically named in all six.

[The probe](review-10/probe-enforcement.mjs) extracts the candidate's actual `scan` implementation:
only **3 of 6** accesses are found ([results](review-10/enforcement-results.json)). A separate
[execution probe](review-10/probe-read-effects.mjs) confirms all six invoke an inherited getter and
return 777 ([raw result](review-10/read-effects.txt)). Thus a new optional read can enter the zone
without being classified or rejected, contradicting the enforcement contract and the test's stated
whole-class guarantee. The original `resultingEpoch` runtime defect is nevertheless fixed at H.

**Required outcome:** make the permitted source forms enforce the optional/unowned-read rule, with
meaningful checks for equivalent binding and assignment forms and the existing inventory. The
negative controls above must fail the protection while a clean source control passes. A correction
may enforce a smaller permitted syntax or use another sound mechanism; no particular patch is
required. Reconcile the inventory/coverage claims with what is actually checked. Do not merely add
three probe names while leaving equivalent permitted operations unexamined.

### K12C1-R10-COMMIT-01 — P2 — first-mutation detection misses actual receipt-index mutation

**Candidate location:** `packages/kernel/tests/ambient-reads.test.ts:225–229` and `:250–266`;
affected mechanism `packages/kernel/src/coordinator.ts:1775–1816` and `#mint`.
Governing obligations: correction DEC-9 (specifically position read, not advanced, before all
construction), amendment-02, C8/C9/C10/C12 and 006/012's meaningful distinguishing evidence.

The detector recognizes four named mutating calls and property-assignment binary expressions.
It misses both the existing mutating `this.#mint(...)` helper and postfix `++`. Therefore it chooses
the later `appendOwn(record.receipts, receipt)` as the "first" mutation for either variant:

1. Replace takeover's `mintReceipt("dispatch_intent", position, record.executionId)` with
   `this.#mint("dispatch_intent", record)`. `#mint` increments `nextAcceptancePosition` immediately.
2. Replace `const position = record.nextAcceptancePosition` with
   `const position = record.nextAcceptancePosition++`.

Both advance accepted-state bookkeeping before constructing the Activation, grant, history and
answer. Their successful final state is unchanged because the later assignment writes `position+1`.
Consequently the end-state tests do not distinguish them. In independent disposable-copy runs,
**each passes all 1,331 Kernel tests**, including the new structural ordering test:
[early-mint](review-10/early-mint.txt), [early-increment](review-10/early-increment.txt),
[exact replacements/commands/counts](review-10/enforcement-results.json).

This is a failure of the mandatory ordering protection, not a claim that H currently advances its
index early. H's production ordering is correct on inspection. Nor does this finding demand a new
engine-exhaustion guarantee for takeover: it challenges the express prebuild rule and the evidence
offered to enforce it. The submitted H3–H7/H22 mutations depend on this structural protection for
their rejection; recognizing only their spellings leaves the same prohibited order possible.

**Required outcome:** enforce the actual first accepted-state mutation across the permitted control
code and the mutating helpers it can call, including equivalent writes/initializers. Establish
distinguishing evidence for prebuild and append-before-hold-write obligations; the two regressions
above must no longer pass. Recheck all three controls, their helper boundaries, answers and retained
evidence, including no-op paths and reentry/fault behavior. Alternative mechanisms are permitted;
do not weaken DEC-9 or present the current end-state suite as an ordering proof.

## Reconciliation with submitted evidence and earlier findings

Implementation 06's behavioral account is supported: the old history matrix now has zero violations,
own history keys/immutable content are correct, and its three self-found host-member problems have
real mechanism fixes. Its stronger claim that the new source rules enforce the whole classes is not
supported. H1–H22 rejecting does not cover the equivalent reads or earlier mutations above.

The original and rebound ablation scripts were inspected. Rebinding X12/X18/X19/X20 targets the
reconstructed coordinate sites without changing their wrong semantics; B6/B12/B13/B14's adapter
changes diagnostic spelling anchors. The raw records disclose stale-anchor failures in the sealed
runners, the equivalent V5 survivor, and the new-oracles-on-old-H negative control. These are not
relabelled as successful unmodified runs. Cost/timing logs remain observations for transferred work.

Prior immutable findings/dispositions are carried by [review 09's complete reconciliation](review-09.md#reconciliation-with-prior-findings)
and their linked original records; their dependent mechanisms were re-examined here:

| Earlier findings | Disposition on this H |
|---|---|
| K12-R1-AUTH-01/HOLD-01/DELIVERY-01; K12-R2-TAKEOVER-01 | Separate control authority, safe-replacement refusal, permitted actions, attempt attribution and post-callback revalidation remain. No reopening of their original counterexamples. |
| K12-R1-HISTORY-01; K12-R3-HISTORY-02 | History presence and authority attribution remain; new READ-01/COMMIT-01 prevent claiming complete enforcement closure of the reconstructed subsystem. |
| K12-R1-DOC-01/REC-01; K12-R3-AUTH-02; K12-R4-AUTH-DOC-01 | Prebuilt Outcome wrapper, accessible identified evidence, current grant checks and truthful attempt-submission attribution remain. |
| K12-R5-LAYER3-01/PROC-01; K12-R7-PROC-01 | Payload before C and exact C..H administrative scope verified; no extension of an old ACCEPT to this H. |
| K12-R6-LAYER3-01/EVID-01; K12-R8-DOC-01 | Authorized three-argument delivery carrier, separate lifetimes, saved-grant tests and baseline/link checks remain. |
| K12-R9-ORDER-01/EVID-01; K12-R10-EVID-01/VAL-01 | Grant-before-content in both fresh paths, actual surrogate fixture and affirmative content assertions; raw validation accessible. |
| K12-R11-ORDER-01; K12-R13-ARCH-01/REC-01/DOC-01 | Per-coordinate currency, owner decision-02, parent revision 9 and precise eager-capture wording retained. |
| K12-R14-ID-01/EVID-01 | Every primitive-string coordinate admitted; long/tenth-exchange/surrogate cases and inverse old-validator mutations retained. |
| K12C1-R1-DIAG-01; R2-AGG-01/EVID-01 | Bounded fragments/aggregate reasons and exact omitted-spelling comparisons retained. |
| K12C1-R4-EVID-01; R6-EVID-01 | Input-derived exact-coordinate/token oracles and X/Z mutation evidence remain, including new takeover construction sites. |
| K12C1-R4-VALUE-COST-01 | Retained diagnostic storage bounded; its time/cost dimension remains transferred and held, not fully closed here. |
| K12C1-R6-VALUE-TIME-01 | Constructor/name diagnostic traversal remains removed. Type-only descriptions address this mechanism; no full cost proof inferred. |
| K12C1-R8-VALUE-DEPTH-01/EVID-01; O-R8-1–3 | Open in the explicitly assigned K1.1-correction-03 work. |
| O-R8-4; SELF-R4-STRING-01/DESCRIPTOR-01/HANDLER-01 | Owner triage / preserved preflight / decisions 03–05 retain the previously stated dispositions; no new threat-model decision here. |
| K12C1-R9-HISTORY-01 | Original runtime counterexamples closed: positional records, prebuilt controls, matrix 22/22 and new whole-view comparisons 30/30. Required mechanism enforcement is incomplete under the two new findings. |
| K12C1-R9-CLAIM-01 | Closed for the live implementation claim: source/roadmap corrected and alias search reconciled with the transfer. V-D1 remains held. |

SELF-R6-HOST-01–03 retain implementer provenance, not reviewer discovery. Correction reviews 05/07
are not recorded; no verdict is invented for them. Earlier optional observations remain with their
original records and are not silently converted into architectural requirements.

## Validation and coverage limits

Reviewer commands ran from `/Users/rex-shih/Documents/ArrokothI/arrokothi` on H's tracked source,
Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin arm64. Exact commands/exits and probe variants
are in [execution metadata](review-10/execution.json), [supplement](review-10/supplement.json) and
[enforcement results](review-10/enforcement-results.json). [SHA-256 manifest](review-10/MANIFEST.sha256)
identifies the retained reviewer evidence.

| Independently rerun | Result |
|---|---|
| `npm run typecheck` | Exit 0; [log](review-10/typecheck.txt). |
| `npm test` | Exit 0; 3,385 pass, zero fail/cancelled/skipped/todo; [log](review-10/npm-test.txt). |
| `npm run check:builder-docs` | Exit 0; 72 files, 1,844 links/anchors, 38 imports; [log](review-10/builder-docs.txt). |
| `node docs/development/work/K1.2-correction-01/check-records.mjs` | Exit 0; preservation/ancestry/link checks; [log](review-10/check-records.txt). |
| Review-09 matrix with `--expect-correct` | Exit 0; 22 cases, zero violations; [log](review-10/recovery-matrix.txt). |
| Reviewer enforcement probe | Exit 0 means the evidence-gap reproducer succeeded: scanner misses 3 reads; both broken-order copies pass 1,331 tests. |
| Reviewer inherited-read execution | Exit 0; all six forms invoke the inherited getter, including all three missed forms. |
| Reviewer whole-view probe | Exit 0; 30/30; [log](review-10/whole-view.txt), [complete observations](review-10/whole-view-results.json). Initial reviewer fixture used a nested input shape and failed before its scenarios; corrected to the declared top-level API, then rerun. That initial failure is not a candidate defect. |

Final record checks verified all 20 reviewer manifest entries and all 29 local links in the review
and owner note. The staged whitespace check reports only the original trailing blank line in raw
`typecheck.txt`; that output is preserved byte for byte. Review prose/scripts/JSON have no whitespace
errors. The post-record preservation check passes with 698 local links/anchors.

Inspected, not independently rerun: validation-06's separate Kernel/conformance/SDK/eval commands,
long ablation batteries, engine-maximum and cost probes. Its reported 1,331 Kernel, 1,945 conformance,
22 SDK and 12 eval cases are pinned logs; the full maintained suite above was independently rerun.
The 67 correction, 36 adapted parent, rebound exact-coordinate, Z/T and 22 H mutations are evidence
for their specific variants, not a universal semantic proof. No external evaluator, native provider,
crash-recovery or second-engine result is claimed.

Coverage limits: no exhaustive hostile-JavaScript proof, all possible schedules, or line-by-line
reaudit of every historical raw log and legacy test. Full source and cumulative diff access were
available; test inspection followed concrete assertions and dependent paths. The material new gaps
are the false-negative enforcement cases above. The broader in-process threat-model decision stays
with DESIGN-AUDIT-01; it is not settled using trusted-host examples in this review. No other required
obligation was intentionally deferred or waived.

## Verdict, status transcription and compact handoff

**Verdict for exact H `35c6ba0277542236f21f95d695154fa0164feb96`: CHANGES REQUIRED.**
Status: **CHANGES_REQUESTED**. Open findings: `K12C1-R10-READ-01` and
`K12C1-R10-COMMIT-01`, both P2 under governing 006. The requirements are unambiguous; no architecture
blocker or missing-access waiver applies. This is not acceptance of H or any later administrative
or merge commit. Both invalidation holds remain. No implementation, merge or successor release.

Compact correction handoff (preserved once here; use this review's recording commit as locator):

> Correct the same released packet K1.2-correction-01 on
> `codex/k1.2-correction-01-activation-identity`. Base
> `a20d278185eaffc7f8b7489345a3624231ff6e6d`; reviewed H
> `35c6ba0277542236f21f95d695154fa0164feb96`; authoritative findings are this pinned
> `docs/development/work/K1.2-correction-01/review-10.md` and its evidence manifest.
> Open IDs: `K12C1-R10-READ-01`, `K12C1-R10-COMMIT-01`; required outcomes and counterexamples are
> in those findings. Owner decisions: amendment-01, amendment-02 and decision-05 as pinned in H;
> unresolved architecture authority: none. Apply 006/012 to close the affected subsystem and
> dependencies, then review the whole cumulative packet. Report other in-scope defects with
> separate provenance. Use 008 and new C/H with evidence/push handoff. No successor release.

CHANGES REQUIRED
