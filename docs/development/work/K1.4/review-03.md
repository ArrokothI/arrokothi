# Independent review 03 — K1.4

**Verdict: CHANGES REQUIRED**, bound to **H `b1769c0fcdb73bfc6297551b87f80e74bc6cb588`**.
The lost-enqueue correction works, including the continuing-sibling case, and the original hold-cascade
mutant is now killed. Three P2 findings remain in the same observation/termination subsystem:
unconfirmed logical cleanup can take the ordinary terminal-Outcome path; three cancellation labels
have missing distinguishing fault rows; and the cleanup census accepts statically named forms it
claims to refuse. Owner choice 05 therefore selects **(d), a recorded limit**, not another patch round.
This review supplies the necessary scope below; it does not approve the content of a new limit.

## Identity, authority and access

- Reviewer: Codex, GPT-6, independent reviewer session, 2026-11-08 (America/New_York).
  This session did not implement the candidate. No subagents or delegated reviews were used.
- Remote: `https://github.com/ArrokothI/arrokothi.git`; subject branch `claude/k1.4`.
- **B:** `608f9ece44dbe42b78974bdac9e7ddcd33697705`.
- **C:** `3e8b4bac60266fda3e277ae0dd381c4936e15ff3`.
- **H:** `b1769c0fcdb73bfc6297551b87f80e74bc6cb588`.
- Review branch: `codex/k1.4-review-03`, created directly from H. Full cumulative subject B..H;
  correction delta from review 02's H `96214874577f2108a7578d1d6fcebc4af0f7173c` also examined.
  No branch was merged. Remote `ls-remote` independently advertised the requested H and both
  prior-record heads below; the review branch did not already exist remotely.
- Contract: [brief 01](brief-01.md), K14-1..K14-6, with owner choices 01–05 and
  [brief 03](https://github.com/ArrokothI/arrokothi/blob/b655733b9b90810eca747c61b8f2095f5f201341/docs/development/work/K1.4/review-02/brief-03.md).
  K14-G belongs to K1.4-gate. Process baseline: AGENTS.md, 006, 008, 012 and 017 at B/H
  (unchanged between B and H); architecture and slice-audit skills.
- Read by immutable commit, without merging:
  [review 02](https://github.com/ArrokothI/arrokothi/blob/b655733b9b90810eca747c61b8f2095f5f201341/docs/development/work/K1.4/review-02.md)
  and brief 03, `probes.mjs`, `hold-mutant.py`, the rebound review-01 probes and README at
  **`b655733b9b90810eca747c61b8f2095f5f201341`**;
  [design check 04](https://github.com/ArrokothI/arrokothi/blob/dc21f8e989b0828a236d65d3988eb9ade5391af3/docs/development/work/K1.4/design-check-04.md)
  including `install-design.mjs` and `attacks.mjs` at
  **`dc21f8e989b0828a236d65d3988eb9ade5391af3`**.
  [Design 04](design-04.md), including §6, is byte-identical to
  **`853d5ee610128b4e5fb2475d87086526f125dc95`**. Owner choice 05, implementation-03.md and
  every linked implementation-03 log were read at H.
- Full local Git source, shell and CI artifact access were available. Local executions used H's source
  (identical to C's source), existing workspace dependencies, Darwin arm64 and Node v26.10.0 at
  `/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin/node`.
  Temporary/prototype mutations were restored; no production correction was made.
- Canonical ownership was derived through the mental-model overview/reference: integration,
  execution-cycle, lifecycle and evidence, with the Kernel/Runtime/Driver/deployment descriptions.
  Development front door, baseline, roadmap/packet scope and prior-art reading-map material supplied
  context. No external project's behavior or license is used as evidence for this candidate.

## Exact candidate and verification binding

The independently run [candidate check](review-03/candidate.json) returns `facts_verified`.
**C..H changes only the paths in C's `verification.json.administrative_files`:**

1. `docs/development/007-work-packets.md`
2. `docs/development/work/K1.4/implementation-03.md`
3. `docs/development/work/K1.4/progress.md`

`verification.json` itself does not change after C. No source, test, evaluator or configuration is hidden
in C..H. `packages/kernel/src` and `packages/core/src` are byte-for-byte unchanged from B, as are the
three registered mutation specifications (`mutations.json`, `refusal-guards.json`, `value-cost.json`).
The prior historical whitespace exception remains the candidate tool's explicit exception.

I independently fetched [Packet verify run 42528215484](https://github.com/ArrokothI/arrokothi/actions/runs/42528215484),
[job 128876429472](https://github.com/ArrokothI/arrokothi/actions/runs/42528215484/job/128876429472),
and downloaded artifact **13640786681**, `packet-verify-3e8b4bac60266fda3e277ae0dd381c4936e15ff3`.
The workflow metadata's main-branch SHA is not the tested revision. The [job-log excerpt](review-03/ci-revision.log) says:

```text
2026-11-08T22:02:56.4535449Z   REVISION: 3e8b4bac60266fda3e277ae0dd381c4936e15ff3
2026-11-08T22:03:04.0258951Z HEAD is now at 3e8b4bac K1.4 round 3: correction for review 02 (K14-R2-01, K14-R2-02)
```

The downloaded `verify.json` and [run.txt](review-03/ci-run.txt) also name C. I counted the actual array
in the downloaded [summary.json](review-03/ci-summary.json): **19 checks, 19 `passed: true`, `checks_passed`**.
Repository tests 5,034/5,034, archive 4/4, examples 18/18, with no failures/cancellations/skips/TODOs;
tool tests 777. The raw mutation payload reports **339 + 358 + 238 killed** in the three registries.
Typecheck, inventory/adoption, censuses, sweeps, race search, value-cost studies and builder docs pass.
The area gate says `reported`, which is not K14-G/E1 acceptance. Digests and retention are in
[the evidence README](review-03/README.md).

**No CI run or full verify was started or rerun.** CI results above are independently inspected evidence;
the executions below are reviewer reruns. Live-provider and large-memory profiles remain explicitly
unrun. Publication, containment, durable recovery and E1 are outside this review.

## Independent obligation and interaction coverage

The review traced the public entry to native work, then the native facts back to Kernel acceptance,
including failure and cancellation at each boundary. Source ownership and observed results, rather
than prior PASS labels, determine these dispositions.

| Obligation / source | Distinguishing check or trace | Result |
|---|---|---|
| K14-1: Kernel-driven asynchronous exchange; execution-cycle | `start` → coordinator creation → Driver microtask → batch forwarding → native step → `offer` with grant; host dispatch/timer pump. B-CONTINUE, slow second Execution, wait/deadline/cancel, redelivery and terminal tests. Failure after native RUNNING also checked. | **FAIL** overall: ordinary exchanges pass; unconfirmed cleanup is R3-01. No Kernel invariant failure found. |
| K14-2: private native machinery; integration | One Driver constructs Harness; native resumptions/operations remain in its store. Classifier keeps pending internal work RUNNING and declares only validated human waits. B-QUIESCE/OBSERVE and live slow-work tests reject premature Kernel WAITING. | **PASS** within the in-memory trusted profile. |
| K14-3: boundary protection | Kernel transitive dependency guard, distinct bridge/host zones, package-root-only Kernel access, read-back ownership inventory. Rejected direct/type-only/barrel/internal-import and out-of-Driver Harness-construction controls ran. | **PASS**; Kernel/core source unchanged, no weakened edge rule found. |
| K14-4: supported feature disposition and migration | Public exports/type members/Harness methods/guide-map census, every inventory row, refusal-before-work controls, SDK-backed Agent/Workflow/capability/memory and examples. Keyed destination retention, confirmation, ledger and concurrency paths inspected. | **FAIL** for the current whole-lineage cleanup claim (R3-01); other searched feature dispositions pass. |
| K14-5: public wrapper and L-01 | Export and dependency direction; eight free identifiers checked at application/wrapper entry and serializer window. Canonical bytes/refusal, before/after lexical shadow, property replacement and capture-window controls ran. | **PASS**; genuine module-load intrinsics remain the stated L-01 precondition. |
| K14-6: conformance replacement and honest oracles | Mapping closure and kept-property checks; T13 with live parent/child; all 24 row/label removals; independent fault rows and census negative controls. | **FAIL**: T13 is fixed, but R3-02 and R3-03 contradict the wider evidence claims. |
| K14-G | Benchmark-owned E1; explicitly assigned to K1.4-gate. | **DEFERRED**, not executed or accepted here. |

**Interactions retained.** The projection contains each context revision, membership and child links,
plus one-way operation/confirmation/resumption fields. Two equal collects support a coherent human
await; at that state no autonomous pending native producer remains under the declared stock-controller
assumptions. Registration precedes observation; commit signals use learned roots/broadcast without a
read or substituted transaction promise. Reconciliation uses the collected member and root, not a new
fallible enqueue lookup. FIFO deduplication, pending requeue and native transactional READY checks
preserve one active step and do not replay consumed work. This finite-opportunity argument assumes each
native step returns; it promises no CPU preemption.

The per-member detector compares that member's revision **and its own claim count**. Sibling claims
cannot trip or mask it; a genuine subsequent READY revision resets the recorded attempt. The maintained
late-enqueue/re-READY test actually drops one duplicate claim before running a later revision, and the
many-member and starvation tests execute those distinctions. Carry-only observations also call the
same reconciliation through `observe`. No further lost-READY or detector false-positive case was found
in this bounded inspection and corpus.

Ingress retains accepted destinations only for keyed input retries and still compares new content.
One ledger covers every input-carrying Event; attempted IDs prevent second forwarding after an unaccepted
Outcome. Unknown, discarded, rejected and delivered remain distinct, and unencodable accounting submits
no acknowledgment. The new cleanup finding does not demonstrate a misreported ingress disposition:
its input was delivered, but logical native cleanup was not complete.

## Executions, corpus and further search

| Reviewer execution at H's source | Observation | Evidence |
|---|---|---|
| All `bridge-*.test.ts`, wrapper environment, binding surface and bridge/mapping/landing-zone/builder-docs architecture tests | **489/489 pass**, 42 suites, zero failed/cancelled/skipped/TODO | [targeted.log](review-03/targeted.log) |
| Both prior-review probe files, unchanged assertions | **10/10 pass** | [prior-probes.log](review-03/prior-probes.log) |
| Implementation-03 source ablations | **5/5 caught**, each with passing unmodified control | [implementation-ablations.log](review-03/implementation-ablations.log) |
| Review-02's exact hold-mutant script | **487 pass, 2 fail** of 489: T13 and its logged baseline reject WAITING members; mutant no longer survives | [prior-hold-mutant.log](review-03/prior-hold-mutant.log) |
| Design-check-04 `attacks.mjs`, without prototype installer | Both old defect assertions fail: child now COMPLETED with one child step; two-fault case has protocol hold | [d04-witnesses.log](review-03/d04-witnesses.log) |
| New independent [probes.mjs](review-03/probes.mjs) | **8 tests: 3 pass, 5 fail**. Three passes prove cancellation removals are non-equivalent. Two failures expose unfinished cleanup; three expose census escapes. | [probes.log](review-03/probes.log) |

The existing census, 17 baseline rows, 16 labels, 24 removals, 13 behavioral kills and 11 executed
row-specific equivalences (one empty, ten redundant) really run. Those counts are accurate. Their
meaning is narrower than the `EQUIVALENT_ONLY` explanations; R3-02 does not erase the observed passes.
The kill check requires a row `AssertionError`; a missing label alone is not credited as a kill.
The source-derived native producer list has 14 current expressions: two delegates and 12 producers,
with the two swallowing settlement trackers correctly identified. Its syntactic scan is a regression
guard, not arbitrary interprocedural resolution.

After the corpus/CI evidence, the additional search varied: native failure before versus after the
READY→RUNNING commit; a rejected applyOutcome transaction versus a failed definition read; successful
versus one-shot-failed request cleanup; cancellation with a parked parent/child, a pre-existing root
before exchange start, and a held exchange immediately before forwarding; and cleanup references as
property calls, static template element access and quoted destructuring aliases. The probes change
only the selected port failure or single-label cascade removal. Census probes execute the candidate's
exact extracted function against modified source strings, not a replacement analyzer.

No exhaustive arbitrary topology, repeated-fault, permanently pending-call or interleaving claim is
made. Kernel control failure, process death, hostile same-process mutation, live provider quality and
physical interruption are excluded by scope. No in-scope criterion is silently left unassessed; the
findings below remain unresolved.

## Findings

### K14-R3-01 — P2: a fulfilled cancellation request is treated as completed native cleanup

**Candidate locations:** `packages/sdk/src/legacy-bridge/driver.ts:275`–`:282` (receipt ignored),
`:647`–`:657` (only rejection triggers the unconfirmed-cleanup report);
`docs/development/002-implemented-kernel-baseline.md:1040` (whole-lineage ending claim).
Native cause: `packages/core/src/runtime/harness.ts:745`–`:768`, `:797`, `:938` and `:1657`–`:1659`.
**Obligations:** K14-1/K14-4, brief 03 R2-PROGRESS/R2-CUMULATIVE, D04-CHK-02 and design 04 §6.

Through public `createApplication`, run an ordinary Function Workflow. Reject exactly one native
`Harness.applyOutcome` transaction after its READY→RUNNING transaction committed. A second probe instead
rejects exactly one `DefinitionStore.get` in `Harness.runController`, at the same lifecycle boundary.
All other reads and transactions, including cancellation, work normally. Observations in both:

```text
faults=1; Kernel=FAILED (native_error); native=RUNNING; cancellation request=pending
recoveryHolds=[]; acknowledged=1; later native steps=0; native remains RUNNING
```

The function executes once in the applyOutcome case and zero times in the definition-read case. This
is not a wall-clock assertion about a slow provider: the step's promise has rejected and the Driver's
exchange has finished. No remaining step can apply the pending cancellation. `Harness.cancelExecution`
correctly returns `cancellation_pending` for RUNNING; `cascade` discards that receipt and resolves.
`terminate` therefore closes/acknowledges the ledger and offers ordinary `fail`, without the new
cleanup-unconfirmed hold. It reports the original failure, **not successful work**, but loses the
separate cleanup uncertainty that this round promises to expose.

**Mechanism and attribution.** The bridge inherits a native failure path that can leave RUNNING after
its step exits, and treats “cancel call fulfilled” as “native lineage terminal.” The reporting fix only
handles rejected cleanup promises. This belongs to Driver/native lifecycle fidelity, not Kernel
fencing. L-20 excludes physical interruption; L-32 allows diagnostic state to differ from Kernel state.
Neither establishes this packet's promised completed logical cascade or its cleanup-failure reporting.
L-31 concerns still-in-flight/never-settled work, not a rejected step whose exchange has already failed.

**Required disposition:** either establish logical cleanup completion or explicitly preserve its
uncertainty, without retrying completed native work or changing Kernel semantics. Under owner choice
05, the immediate route is a recorded limit that states this exact failed-step/RUNNING/pending case,
the accepted FAILED/acknowledged result and the absence of a cleanup hold or recovery. Update the
baseline and dependent cleanup claims accordingly. The two probes must remain accessible as the
counterexample corpus; no automatic replay or forced native terminal-state write is authorized here.

### K14-R3-02 — P2: three “equivalent-only” labels have distinguishing one-fault rows

**Candidate locations:** `packages/sdk/tests/bridge-terminate.test.ts:512`–`:517`;
`packages/sdk/src/legacy-bridge/driver.ts:260` and `:265`–`:266`.
**Obligations:** K14-6, brief 03 R2-CLEANUP, D04-CHK-03 and design 04 §6's non-equivalent-label rule.

The explanations assume a completed request cascade. In fact `requestCancellation` catches its
rejection and `cancellationSettled` resolves either way. Inject one failed `readExecution` from that
request cascade, then allow all reads to succeed. Run each scenario with the real label and with only
that label's cascade removed:

| Label | Schedule | Baseline | Only this cascade removed |
|---|---|---|---|
| `cancel.application` | Public `app.cancel` on a parked Workflow/child lineage; request cascade rejects once | Both native members CANCELLED | Both WAITING |
| `cancel.exchange-start` | Root already created; dispatch queued, then Kernel cancellation before exchange starts; request cascade rejects once | Native root CANCELLED | Native root READY |
| `cancel.forward-loop` | Hold the exchange's root read immediately before the forwarding loop; cancel; request cascade rejects once; release | Native root CANCELLED | Native root READY |

All six runs have Kernel CANCELLED; no cleanup API is replaced with a fake success in the baseline.
The latter two use the real Driver rig to select a public-protocol schedule. These are behavioral kills,
not label-hit failures. The new three witness tests pass by demonstrating each difference.

The existing 11 equivalence executions are valid **for their successful-cleanup rows**. They do not
justify “why no row can distinguish its removal.” Deviation 4's late-spawn reasoning addresses member
creation, but a prior cascade can miss an existing member by failing; no spawn is required. Initial-input
remains a real empty obligation on T6's supported first-forward path: terminal root, no descendant,
with ingress rejection and failure asserted under removal.

**Required disposition:** retain all three production cascades. Add the fault rows as distinguishing
coverage, or record that the current termination oracle excludes prior-cascade failure combinations
and withdraw the label-wide equivalence explanations. Owner choice 05 selects that recorded-limit
route now; it does not authorize silently treating these mutants as equivalent. This is an evidence
finding about working fallback cleanup, separate from R3-01's production cleanup gap.

### K14-R3-03 — P2: static template access and quoted aliases silently escape the cleanup census

**Candidate locations:** `packages/sdk/tests/bridge-terminate.test.ts:403`–`:415`, its file-header
fail-closed claim; `verification.json`'s round-3 limit; implementation-03's D04-CHK-03 disposition.
**Obligations:** K14-6, D04-CHK-03, design 04 §6 and 012's truthful bounded-search claims.

The declared exclusion is computed property names **built at run time**. These three added, statically
named routes each return `errors=[]` and the same 16 labels from the candidate's census:

```ts
this[`endLineage`](id, "hold");
const { "endLineage": end } = this; end.call(this, id, "hold");
const { "cancelExecution": cancel } = this.harness;
cancel.call(this.harness, { executionId: id });
```

The first is a `NoSubstitutionTemplateLiteral`, not the `StringLiteral` accepted by the element-access
check. Quoted destructuring keys are not Identifiers, so the second walk never sees a forbidden
reference; `.call` on the renamed binding has no recognized name. An extra native cancellation can
therefore disappear just as an extra cleanup label can. All three independent fail-closed assertions
fail. The current source itself has no demonstrated hidden cleanup call; its 16-label census is correct.

**Required disposition:** explicitly bound the guard to the syntactic forms it checks and record these
static-form exclusions, or reject them with negative controls. Owner choice 05 selects the former
route now. This does not demand a sound analyzer for arbitrary JavaScript. It corrects an exact current
claim about aliases/element access and a narrower stated exclusion, so it is P2 under 017's false-current-
claim rule rather than an unclaimed hypothetical future-code P3.

## Previous findings, design conditions and deviations

| Item | Review-03 disposition |
|---|---|
| K14-R2-01 | **Closed for the committed-READY scheduling mechanism.** Both original producers, named gates, late enqueue, two members and continuing sibling pass; removing reconciliation fails them. Adjacent failure/cleanup ownership is R3-01. |
| K14-R2-02 | **Original hold omission closed.** T13 starts with live parent/child, asserts hold/no acknowledgment/no accounting/no later steps, and removal is killed. Label-wide and census closure remain R3-02/R3-03. |
| D04-CHK-01 | **Met.** Every `continue` observation reconciles; FIFO finite opportunity and member/revision/claim detector inspected and exercised. |
| D04-CHK-02 | **Reporting path implemented; full cleanup claim not met.** `report` → `hold` → `reportProtocolFailure` needs no native read; both old rejection witnesses are fixed. Fulfilled-but-pending cancellation bypasses it (R3-01). |
| D04-CHK-03 | **Partially met, not closed.** Source census, executed T6/T13, 24 removals and negative controls exist. Remaining unsupported equivalences and static escapes are R3-02/R3-03. |
| R1-01 / D03-CHK-01,03 | Coherent-await and notification controls retained; original observation probe passes. Scheduling correction closes the prior lost-READY gap; fallback/unreachable schedules are not counted as reached. |
| R1-02 | Retained accepted destination preserves retry identity without bypassing conflict comparison; old replay and maintained conflict controls pass. |
| R1-03 / D03-CHK-02 | Ledger/unknown/no-second-forward and unencodable-accounting behavior retained. R3-01 is cleanup uncertainty, not a demonstrated ledger-disposition regression. |
| R1-04 | Scheduler constructed before hook; identity/observed-enqueue control still distinguishes removal. |
| R1-05 | Original terminal triggers and new hold trigger pass; the wider termination guarantee and oracle remain open through this review's findings. |

| Implementation-03 deviation | Judgment |
|---|---|
| 1: execute slow-producer fault variants instead of naming tests in `covers` | **Acceptable.** `covers` enumerates API members; the actual checks now execute healthy and lost-enqueue cases and assert the fault/call count. |
| 2: combine B-ENQUEUE-LATE with B-RECONCILE-REVISION | **Acceptable.** One schedule asserts the dropped duplicate and the later genuine READY revision separately. |
| 3: throw on continue with empty queue after reconciliation | **Acceptable.** Defensive invariant failure; synchronous healthy reconciliation queues the observed READY member. The mutant fails explicitly rather than spinning. |
| 4: C2 uses Kernel cancellation in the Driver rig | **Rig choice acceptable; equivalence justification incomplete.** It reaches the late-spawn window, but says nothing about a failed earlier cascade; R3-02 supplies missing rows. |
| 5: include the original failure in cleanup-hold diagnostic | **Acceptable.** Useful context, bounded by the final report and requiring no native read. |

## Root cause and owner-choice-05 limit handoff

This is the third CHANGES REQUIRED in the same subsystem. The recurring mechanism is promoting a
partial observation into a stronger conclusion: a wake was treated as usable runnable work; a fulfilled
cancellation call is now treated as ended native state; and successful selected rows are treated as
label-wide equivalence. The new queue mechanism fixes the first. The cleanup path still distinguishes
promise rejection, not all cleanup dispositions. Earlier tests failed before activation or in a collect,
leaving a cancellable READY/WAITING member; they did not fail after the native RUNNING commit. The
cancellation oracle varied creation/spawn timing but held request cleanup success constant. The static
controls used dot names and string-literal brackets but omitted static templates and quoted aliases.

Owner choice 05 has already selected the route on this outcome. **Do not start another patch round.**
[Brief 04](review-03/brief-04.md) asks for the concrete limit disposition and claim corrections. Suggested
fields for that owner record (proposals, not newly accepted 017 entries):

| Scope | What the limit must say | Why a bounded limit is possible / trigger and owner |
|---|---|---|
| Native logical cleanup after a failed step | A native exception after READY→RUNNING can leave RUNNING plus pending cancellation after the Kernel accepted FAILED and acknowledged accounted input; no cleanup hold, automatic recovery or proven native termination follows. Driver starts no later step. | No new Kernel/public wire shape is required to describe this. Original failure is explicit and L-29 still governs accounting. Trigger: a real custom store/definition port failure needs trustworthy cleanup/recovery. Proposed owner: legacy Driver fidelity in R1, coordinated with K3 if persisted recovery is required. |
| Cancellation mutation coverage | The 17-row oracle does not establish redundancy under a rejected earlier cascade; the three named cancellation sites are retained fallback paths with unmaintained one-fault discriminators. | Evidence-only correction; preserve the new witnesses and working cascades. Trigger: changing cancellation/cleanup or claiming fault-complete coverage. Proposed owner: the touching Driver packet, with tooling work only if needed. |
| Cleanup census forms | Dot calls and the currently rejected syntax are checked; static template element access and quoted destructuring aliases also escape, beyond the already-declared runtime-computed names. | Bounded syntactic guard, no current hidden production call demonstrated. Trigger: new cleanup access syntax or stronger guard claim. Proposed owner: the touching packet / evidence tooling. |

The owner must decide the final wording and 017 eligibility, especially the consequences for cleanup
claims; this review does not reinterpret logical Kernel failure as proof of physical stop. Baseline,
verification limits, oracle comments/reasons and implementation claim corrections must agree with any
accepted limit. Preserve the successful reconciliation and accounting protections. No successor or E1
release follows, and no production/core/Kernel patch is authorized by this review.

Third-party reuse: none added. Probes use repository fixtures, Node builtins and the already-installed
TypeScript compiler API. The candidate adds only the internal Kernel dependency; no new external
package or copied third-party material was found in the reviewed delta.

**Transcription:** K1.4 `CHANGES_REQUESTED`; findings K14-R3-01, K14-R3-02, K14-R3-03; owner-choice-05
fallback (d). This review branch records evidence only; the candidate ledger and implementation remain
unchanged. Publication of this record is not integration or acceptance.

CHANGES REQUIRED — H `b1769c0fcdb73bfc6297551b87f80e74bc6cb588` — K1.4 (K14-1..K14-6).
