# Independent review 02 — K1.4

**Verdict: CHANGES REQUIRED.** Two P2 findings remain: a committed native settlement can lose its
enqueue and silently strand the exchange; the maintained cascade corpus does not detect removal of
the accounting-failure hold's cascade. The four original counterexamples now pass, with maintained
equivalents. Their passage does not close the wider mechanisms required by review 01 and design check 03.

## Identity and access

- Reviewer: Codex, GPT-6, independent reviewer session in this chat, 2026-11-08. This session did not
  implement the candidate or write its design. No delegated reviewer or subagent was used.
- Remote/subject: `https://github.com/ArrokothI/arrokothi.git`, `origin/claude/k1.4`.
- **H: `96214874577f2108a7578d1d6fcebc4af0f7173c`.**
- **C: `3e4c59faa7b6138693bb9094144cafff7a33158e`.**
- **B: `608f9ece44dbe42b78974bdac9e7ddcd33697705`.**
- Review branch: `codex/k1.4-review-02`, created from H. Full cumulative subject is B..C; the correction
  delta is also inspected. No candidate or prior-review branch was merged. Remote `ls-remote`
  independently advertised H and the two prior-record heads below during this review.
- Contract: [brief 01](brief-01.md) at B/H, K14-1..K14-6; [release 01](release-01.md), owner choices
  [01](owner-choices-01.md), [02](owner-choices-02.md), [03](owner-choice-03.md), [04](owner-choice-04.md),
  [design 02](design-02.md), [design 03 including §8](design-03.md), and implementations
  [01](implementation-01.md) and [02](implementation-02.md), all read at H.
- Read by immutable commit, without merging:
  [review 01](https://github.com/ArrokothI/arrokothi/blob/0f415d6e016824ea9bddac0ca7aca3fd2d3accb5/docs/development/work/K1.4/review-01.md),
  [brief 02](https://github.com/ArrokothI/arrokothi/blob/0f415d6e016824ea9bddac0ca7aca3fd2d3accb5/docs/development/work/K1.4/review-01/brief-02.md)
  and its `probes.mjs` on `codex/k1.4-review-01` at
  `0f415d6e016824ea9bddac0ca7aca3fd2d3accb5`;
  [design check 03](https://github.com/ArrokothI/arrokothi/blob/3e55960e0493854490ac83a420ee12295c003e82/docs/development/work/K1.4/design-check-03.md)
  on `codex/k1.4-design-check-03` at `3e55960e0493854490ac83a420ee12295c003e82`.
- Process baseline: AGENTS.md, [006](../../006-development-process.md),
  [008](../../008-implementation-report.md), [012](../../012-review-methods.md),
  [017](../../017-known-limitations.md), and `arrokothi-slice-audit`. Canonical owners were located
  through the mental model/reference index: integration, execution-cycle, creation, waits, lifecycle
  and evidence. The development front door, implemented baseline, ownership map, roadmap and
  applicable prior-art reading-map sections supplied context; no external project's behavior is used
  as proof of this candidate.
- Full Git source was available. Local execution used a detached worktree at C and the requested
  Node v26.10.0 path. Dependency setup and evidence-access details are in
  [the evidence README](review-02/README.md). No production correction was made by the reviewer.

## Candidate and CI binding

The [candidate check](review-02/candidate.json) returns `facts_verified`. C..H changes exactly:

1. `docs/development/007-work-packets.md`
2. `docs/development/work/K1.4/implementation-02.md`
3. `docs/development/work/K1.4/progress.md`

These are exactly the administrative allowlist in `verification.json`; no source, test, evaluator or
configuration change is hidden after C. `packages/kernel/src` is byte-for-byte unchanged from B.
`packages/core/src` and the three registered mutation specifications (`mutations.json`,
`refusal-guards.json`, `value-cost.json`) are also unchanged from B. The preserved historical
whitespace exception is not a change in this candidate.

I independently obtained the successful [Packet verify run 42451451228](https://github.com/ArrokothI/arrokothi/actions/runs/42451451228)
and [job 128641343212](https://github.com/ArrokothI/arrokothi/actions/runs/42451451228/job/128641343212).
Its [log excerpt](review-02/ci-revision.log) includes:

```text
2026-11-08T05:36:41.7774206Z   REVISION: 3e4c59faa7b6138693bb9094144cafff7a33158e
2026-11-08T05:36:49.2502773Z HEAD is now at 3e4c59fa K1.4 round 2: correction for review 01 (K14-R1-01..05)
```

The workflow's own main-branch head is not substituted for its checked-out subject. The downloaded
artifact's `verify.json` and [run metadata](review-02/ci-run.txt) both name C. I counted the array in
the downloaded [summary.json](review-02/ci-summary.json): **19 checks, 19 passed**, result
`checks_passed`. This count includes the reported area gate. Repository tests: 4,957; archive tests:
4; examples: 18; all have zero failures, cancellations, skips and TODOs. Tool tests: 777. Full raw
mutation results report **339 + 358 + 238 killed** for the registered/refusal/value-cost registries.
Typecheck, the sweeps, race search, both value-cost studies, censuses, adoption and builder docs also pass.
Artifact identity, SHA-256 digests and retention are recorded in the evidence README.

As directed, **the full verify was not rerun**. These CI observations are inspected evidence;
the targeted executions below are reviewer reruns. None of these counts constitutes K14-G/E1 acceptance.

## Targeted execution and independent search

| Check at C | Observed result | Evidence |
|---|---|---|
| Original review-01 probe file, before new searches | 4 pass, 1 fail: the R1-01 intervention's `observed` check cannot find renamed method `LegacyDriver.lineage` | [Original output](review-02/review01-original.log) |
| Same file, only stack selector rebound to `LegacyDriver.collect` | **5/5 pass**: control plus all four counterexamples, with the intervention observed | [Rebound probe](review-02/review01-probes.mjs), [output](review-02/review01-rebound.log) |
| All eight `bridge-*.test.ts` files, wrapper environment, binding surface, bridge boundaries, legacy mapping, landing zone and builder-docs controls | **412/412 pass**, 36 suites, no failures/cancellations/skips/TODOs | [Targeted log](review-02/targeted.log) |
| Candidate's `implementation-02/ablate.py` | All five ablations caught: retained destination; scheduler construction; failed-forward unknown; no second forward; current-iteration step rule | [Ablation log](review-02/implementation-ablations.log) |
| Additional independent probes | **3 pass, 2 fail**; both failures are K14-R2-01 | [Probe](review-02/probes.mjs), [output](review-02/additional-probes.log) |
| Same 412 maintained tests with only `endLineage(..., "hold")` disabled | **412/412 pass: mutant survives** | [Reproducer](review-02/hold-mutant.py), [output](review-02/hold-mutant.log) |

The candidate's ablation log link is not present at H; its script is present and was rerun, so this
does not leave inaccessible required evidence. The raw original probe failure is retained rather than
hidden as a pass. Its only rebind changes the intervention's method name, not assertions or outcomes.
The four maintained replacements are in `bridge-observe.test.ts` (snapshot/hook),
`bridge-ingress.test.ts` (retry/early failure), and the strengthened inventory hook row.

The additional search was bounded and mechanism-directed: real committed and rolled-back state under
the facade; a signal delayed until after an open no-wake lineage parks; one failed post-commit scheduler
lookup after a capability settlement and after a model resumption; and accounting failure with a live
parent/called child, with and without its hold cascade. The latter is a non-equivalence control, not a
production cascade bug. Source restoration was checked after the maintained-suite mutant run.
The new search did not claim arbitrary store failures, durable recovery, unbounded topology enumeration,
live model quality, containment, or publication readiness.

## Findings

### 1. K14-R2-01 — P2: committed native work can remain READY and unqueued forever

**Locations at C:** `packages/sdk/src/legacy-bridge/lineage-scheduler.ts:49` and
`packages/sdk/src/legacy-bridge/driver.ts:365` (especially the unqueued-READY park at lines 369–376).
Dependent native paths: `packages/core/src/runtime/effect-processor.ts:2998` and `:3450`,
`packages/core/src/runtime/resumption-processor.ts:367` and `:442`.
**Obligations:** K14-1/K14-4, R1-01's complete exchange-progress mechanism, D03-CHK-01, and design 03
§8's explicit one-shot `readExecution` failure inside `enqueue` test.

**Failure scenario.** Start ordinary supported work with `createNoInlineWaitBudget`. Allow its capability
or model promise to settle, and fail exactly one `readExecution` whose caller is
`LineageScheduler.enqueue`. All other reads succeed; transaction state is committed. In the capability
case there is also a human confirmation. Both independent probes observe:

```text
faults = 1; Kernel = RUNNING; native root = READY; queuedCount = 0; recoveryHolds = []
two subsequent runUntilBlocked calls = timeout, timeout
capability = settled/dispatched; or model resumption = settled
```

This is not proof from a short timing threshold alone. The code explains the indefinite wait:
`enqueue` reads before adding its queue entry; the native asynchronous trackers swallow the rejection;
the facade signal only wakes an observer, without reconstructing runnable work. `step` sees READY,
finds no queue entry, and assumes the enqueue is still in flight. It parks again with no remaining
settlement or enqueue to wake it. Pumping the host cannot repair that queue. The same mechanism affects
two native producers, so special-casing one capability shape would not close it.

The facade itself preserves transaction results and errors, and its non-reading signal does arrive.
Those correct properties are insufficient for the required exchange progress. The maintained
B-COMMIT-SIGNAL failing-read control never exercises an actual failing enqueue followed by continued
exchange progress. B-ACK-EXITS does exercise a post-commit enqueue failure during forwarding, where the
Driver catches the error and terminates; it does not cover background settlement's swallowed error.

**Accepted design/root attribution.** The loss is inherited from the native commit-then-enqueue/error
handling pattern and the bridge's dependence on a derived queue. Implementation 02 explicitly describes
it under “A lost native post-commit enqueue,” then attributes it to L-31. That attribution is unsupported:
L-31 concerns sibling work still in flight or never settling. Here the work **has settled**, the native
Execution is READY, and the model-only reproducer has no human pause at all. Design 03 §8 explicitly
requires this failure to preserve progress. This is not a Kernel invariant failure or a request for
durable recovery; it belongs to the SDK Driver/native scheduling boundary.

**Required fix.** Make committed runnable state lead to a usable scheduling opportunity, or turn failure
of that obligation into an explicit Driver failure/recovery hold. Preserve the native transaction's
original promise/result/error, correct lineage routing, single active native step, and no repeated
capability/model execution. A learned-root scheduling path or an explicit reconciliation/error channel
are possible mechanisms; the owner must select the design under the stop-and-redesign rule below.
Maintain both reproducers, vary registration/commit/notification order, and keep the existing no-wake,
rollback, isolation and no-unhandled-rejection cases. Correct the L-31 attribution and corresponding
progress claims. No Kernel source change is demonstrated necessary.

### 2. K14-R2-02 — P2: the accounting-hold cascade has no distinguishing maintained test

**Locations at C:** `packages/sdk/tests/bridge-ingress.test.ts:229`,
`packages/sdk/tests/bridge-terminate.test.ts:196`, and
`packages/sdk/src/legacy-bridge/driver.ts:520`.
**Obligations:** K14-6's meaningful replacement evidence, K14-R1-05, D03-CHK-02's ended-lineage hold,
design 03 §8's per-site ablations, and 012's maintained non-equivalent mutants rule.

**Failure scenario/evidence.** Disable only the `"hold"` site in `endLineage`; leave every other cascade
and assertion intact. All **412 maintained focused tests still pass**. The existing accounting-encoding
test runs a Function that has already completed, so its “lineage ended” check succeeds without this
cascade. B-TERM-ABLATION's site table omits `hold`; its active rows cover nine distinct sites and eleven
row/site removals. The reported “12 site ablations” counts its inventory assertion as though it were a
removal. T6's recorded equivalence is legitimate; it does not explain the missing hold site.

The independent probe first creates a live Workflow parent and called chat child, then injects the same
ledger encoder failure on the next input. At C the hold site is reached once and both members become
CANCELLED. With that site's cascade removed, the same protocol hold is recorded but **both members remain
WAITING**. Thus this mutant is non-equivalent and the missing discriminator is material. T12's refused
terminal-Outcome hold is a different route: the terminal cascade already ran there. Its use of the
`fail` site is additionally exercised by T10; that does not cover accounting failure on a nonterminal
decision's distinct `hold` site.

**Required fix.** Add the live-lineage accounting-failure case and its removed-hold-cascade mutant to
the maintained corpus. Enumerate all real `endLineage` sites against trigger rows, including separately
documented equivalences, so a new site cannot silently evade the table. Assert held Kernel state, no
acknowledgment or accounting Emission, every native member terminal, and no later native work. Preserve
the functioning production cascade. Correct the report's ablation count and claim of complete coverage.
The next build may use the explicitly adopted in-test ablation arrangement; changing the general
registry runner is not required for this finding.

## Prior findings and semantic closure

| Prior obligation | Disposition at C | Mechanism and evidence |
|---|---|---|
| K14-R1-01 | **Original counterexample fixed; closure incomplete** | Two structural collects, re-traversed membership/links, context revisions and one-way record states prevent an incoherent human await. Rebound original and maintained snapshot probe pass. Progress after a failed background enqueue remains K14-R2-01. |
| K14-R1-02 | **Closed** | `retainedDestination` reads the accepted Kernel Event, guards nullable `inputId`, excludes creation/timeout kinds and supplies only D. Fresh label/payload/correlation/causation and explicit destination still go through canonical comparison. Child-pause disappearance, later multiple pauses, terminal replay, conflicts and the explicit-original-destination control pass; removing lookup is caught. |
| K14-R1-03 | **Accounting correction closed; hold cascade evidence is K14-R2-02** | One `BatchLedger` covers the reserved input Events, preserving attempted results and marking only unattempted terminal entries discarded. Before-first, partial, before/after-commit failure, initial rejection and output-encoding exits are covered. Unknown ends forwarding; the per-Execution attempted set survives an unaccepted Outcome and prevents a second forward, clearing only on acceptance. No accounting encoding means no Outcome/acknowledgment and an inspectable hold. |
| K14-R1-04 | **Closed** | The actual scheduler is constructed before `controllers(services)` and injected into the Driver. Tests read/retain it during the hook, compare identity and observe root enqueue through that same instance; removal is caught. |
| K14-R1-05 | **Partial; K14-R2-02 remains** | T1/T2 cancel and Execution deadline; T3 wait deadline; T4 malformed progress; T5 missing root; T7/T7f read/forward exceptions; T8 encoding failure; T9/T10/T11 native terminal roots all have live descendants and caught matching removals. T6 has no possible live descendant before first input forwarding. T12 verifies a nonterminal hold without acknowledgment/result, but the new nonterminal accounting-hold site lacks its own discriminator. |
| D03-CHK-01 | **FAIL** | Underlying transaction promise/result/error and committed/rollback state are preserved. Learned-root synchronous signals, unknown-scope broadcast and delayed registration avoid the signal lookup problem. A committed READY state still loses its runnable queue entry on the explicitly required one-shot enqueue fault: K14-R2-01. |
| D03-CHK-02 | **Accounting oracle PASS; ended-lineage evidence incomplete** | Delivered once; unknown zero/one; discarded/rejected/ignored none. Precommit and postcommit forwarding probes distinguish the two unknown cases; attempted IDs prevent repeat forwarding after a refused Outcome. Encoder failure holds with unacknowledged batch. The live-lineage termination discriminator is K14-R2-02. |
| D03-CHK-03 | **PASS within declared scope** | Named registration/read/validation/submission/park gates and real F1–F4 settlements replace an unobserved time release. Watchdog fallback is recorded unreachable, never credited reached. Post-validation input/cancel/inert-tail tests and structural quiescence argument cover submission; record products are labeled separately. |

**Quiescence through Outcome acceptance.** Equal projections include membership, child links, each
context's revision/lifecycle/wait and relevant operation/confirmation/resumption states. The Driver
awaits its own native step first. At a validated human pause no dispatchable operation, pending native
resumption, READY/RUNNING member or unresolved call settlement can autonomously change the relevant
projection. Subsequent root/emission/deadline reads therefore cannot revive the original torn-read
window. Late invalidated callbacks and delayed enqueue tails can be inert. Kernel input queues until
acceptance's wait scan; cancellation fences a losing Outcome. This relies on the conforming native
store's atomic visibility, monotone revisions, no deletion and inspected one-way writers, not on
double collection alone. The writer census/regex guards are bounded regression evidence, not a proof
against arbitrary future writer edits. The lost-enqueue finding does not invalidate this await-safety
argument: it strands an Execution in RUNNING instead.

**Search accounting.** The real schedule suite reports F1 13/26, F2 25/46, F3 23/46 and F4 13/26 reached:
**74 reached, 70 unreachable, 144 requested**. I inspected the unreachable reasons and the code that
disarms fallback coverage; the total is not presented as 144 exercised races. These targets cover
registration, reads in collects 1/2, validation, submission and park. The `signal` seam is exercised
separately by signal tests and the independent delayed-signal probe, not included in that 144 count.
Normal child completion plus parent settlement is awaited inside one `runOnce`, not falsely counted
as a concurrent collect window. The forged-record search retains the original 4,410 cells and adds the
105,140-cell operation/status/dispatch/outcome/confirmation/resumption product and 144 mixed cells.
These products exercise the classifier; they do not replace real Runtime schedules.

**Owner choice 04.** L-29 and `mental-model/mechanisms/integration.md` agree with the owner-authorized
third case: a failed forward can have committed native delivery, is reported unknown, and is never
forwarded twice. Kernel acknowledgment means accounted-for input, not native processing. Native
statuses remain Runtime Emissions; no new Kernel per-Event status or receipt is introduced. The
original design 03 sentence that this added no limitation is superseded by its §8 and the explicit
owner amendment. The empty start/no-input Event is not falsely described as a native input delivery.

## Cumulative K14-1..K14-6 audit over B..C

The independent coverage map used the contract boundaries and their distinguishing failures, rather
than treating inventory membership or prior PASS as proof. Normative examination, deterministic SDK
execution, race/fault probing, Driver/native path tracing, packaging boundary checks and evidence
preservation apply. Live provider quality, process-death recovery, isolation and release packaging are
outside this packet's declared in-memory/private/trusted scope; K14-G has its own assigned gate.

| Criterion | Result | Cumulative coverage and limit |
|---|---|---|
| **K14-1** supported host drives accepted asynchronous exchanges | **FAIL** | Source and B-DELIVER/CONTINUE/WAKE/INPUT/CONFIRM/TERM/FAIL/STALL/INTERLEAVE cover accepted exchange, timers, cancellation and independent Executions. Native settle-to-next-step progress fails K14-R2-01. CI success does not close that untested path. |
| **K14-2** private native controllers and Outcome-declared waits | **PASS** | Harness construction is confined to the Driver; native Agent/Workflow/resumption types stay outside Kernel source. Total classification plus validated observation declares only Kernel input/confirmation subscriptions through an Outcome. Mixed in-flight work stays RUNNING with no wait; native children remain Runtime-private. |
| **K14-3** structural quarantine and ownership | **PASS** | Longest-root bridge zone, exact package-root Kernel importer list, no Kernel→legacy dependency, no Driver→Kernel-internal imports, sole Harness construction, inventory agreement and forbidden-edge controls pass. Nested SDK/bridge relative imports are explicit; examples remain outside Kernel admission. |
| **K14-4** feature preservation/migration/refusal | **FAIL** | Closed export/type-member/Harness/guide inventory and behavioral rows cover 35 Harness methods, supported hooks/options, memory, tools, children, run/input/confirmation/cancel and named refusals without partial records. Guides/examples migrate mutators and receipt observations. G-SLOWCAP/G-SLOWMODEL/native-store progress is overclaimed for the postcommit fault in K14-R2-01; L-31 does not bound it. |
| **K14-5** wrapper and L-01 | **PASS** | Public wrapper/ValueIssue and named environment error; eight free identifiers checked at startup, call and serializer window; fresh-process lexical/global replacement and capture-time shadow controls. Core capture prefix/property checks and metering stay preserved. Genuine load-time intrinsics/cooperative host remain the documented limit; this is not realm isolation. |
| **K14-6** conformance mapping and useful properties | **FAIL** | Complete file mapping, exact owner checks, migration tests, retained native tests and new Kernel/bridge attribution pass. However the promised full termination/failure replacement corpus admits a non-equivalent removed-cascade mutant, K14-R2-02. The original R1-05 evidence obligation is not closed by table completeness. |
| **K14-G** K1/E1 external gate | **DEFERRED** | Owner's brief/release split assigns it to K1.4-gate. No E1 fixture execution or external acceptance is claimed; successor release remains owner-controlled. |

**Preservation and removed expectations.** I found no weakened assertion, expected result or existing
mutant in the cumulative or correction diffs. This is distinct from the missing discriminator above.
The following changes were specifically reconciled:

- Native conformance files given X mappings retain their executable bodies; the added headers move
  attribution without deleting useful regressions. The mapping's closed file set and owner existence
  controls pass. Existing test/mutant registries are not silently reduced.
- SDK/example calls move from refused Harness mutators to Kernel-routed methods. Immediate native
  `inputReceipt`/confirmation answers move to their documented later `ingress_result` observations;
  actual delivered/dispatched/already-resolved, state, output and business-effect assertions remain.
  The custom-scheduler test becomes the named refusal plus initial-input ordering under the owned
  scheduler, consistent with the owner decision.
- The binding-surface test restates the exact public export list, no Kernel import from the capture
  graph and the B-identical capture prefix apart from the added environment check. The Kernel itself
  remains untouched. SDK/private dependency and ownership parser controls now use the still-public
  Strands package where their example requires a public package; the malformed/contradictory outcomes
  remain required.
- In adoption data all 1,549 origin IDs and 1,272 preserved member IDs remain. Existing retained
  counterexample objects are unchanged; existing suite targets change only declaration locations
  (18 rows), with no removed target or changed input/assertion anchor. Twelve historical held witness
  records for six parser properties are replaced by six explicit counterexamples/targets for the
  `deedd7950724` members. All twelve historical members remain in the preserved table, now `refused`;
  owner choice 03 authorizes the six limited-origin replacement extras without adoption credit.
  This does not promote the old evidence. The held-claim definitions and detector recipes remain
  unchanged. The source parser tests retain
  their distinguishing malformed-list/publishability/missing-row checks.
- The correction adds the expanded classifier product and maintains the original one; it does not
  lower the oracle to accept the old torn-read result. `unknown` is an owner-authorized refinement with
  stronger before/after-commit and no-second-forward evidence, not an unexplained expected-result change.

Layer-3 integration/execution-cycle, reference mapping, implemented baseline, ownership inventory,
guides, SDK README and builder guidance follow the managed-native-job/private-SDK choice. Tool, memory
and child work remains unmediated Trusted Execution; no containment or native takeover claim is added.
Package changes add only the repository's private Kernel dependency; the existing third-party
dependency versions are unchanged. No third-party source was copied/adapted by this review, and no new
license clearance is inferred from the tests or documentation.

No criterion was left unexamined because a blocker was found. The two failures above bound the refusal
to accept; PASS rows remain evidence for this candidate, not independent releases or a future acceptance.

## Root-cause note and handoff

This is the second CHANGES REQUIRED in the already corrected bridge observation/termination subsystem.
[006's stop-and-redesign rule](../../006-development-process.md#stop-and-redesign) applies.

1. **Mechanism producing the family.** Native state commits, runnable queue entries, observer wakeups
   and Driver terminal cleanup are separate obligations. The correction establishes observation and
   ledger correctness, but assumes that notification implies future runnable work and that a list of
   named terminal rows enumerates all cleanup routes. Neither follows by construction.
2. **Design that allows it.** Design 03 §2/§8 requires the right outcomes but leaves READY-without-queue
   ownership to native postcommit behavior; the current step loop treats absence as a delay forever.
   The cascade table is hand-listed and misses the separately added nonterminal hold site. This traces
   into accepted native asynchronous error handling, whose comments describe a precommit pending-state
   failure although the swallowed error can occur after settlement committed.
3. **Why earlier passes missed it.** The signal fault control proves no read occurs in signal, not that
   a real failed enqueue permits progress. The forwarding postcommit test has a synchronous error owner,
   unlike background settlement. The hold test's root is already terminal, so it cannot discriminate
   cleanup; the site's own name is absent from the ablation table. Counts and shared helpers hid these
   independent postconditions.
4. **Owner options.** Prefer a new design note/check that gives committed runnable state a recoverable
   scheduling owner (or explicit failure channel), and closes cleanup coverage against actual sites.
   A refined claim must identify exactly which conforming-port failures are supported and provide a
   finishable discriminator. A split needs an explicit combined bridge-progress/cleanup gate and cannot
   silently accept these interactions elsewhere. An accepted recorded limit would need a new owner
   decision and consistent contract/017/guide changes; existing L-31 is not that decision. None permits
   merely changing the expected timeout or dropping the mutant.

The [correction brief 03](review-02/brief-03.md) records these outcomes and questions. No further patch
round starts before the owner's choice under 006. This review does not change production, merge the
candidate, release K1.4-gate, or certify acceptance. The review branch's pushed recording SHA is supplied
in the external handoff after push; this document does not certify its own future push.

CHANGES REQUIRED
