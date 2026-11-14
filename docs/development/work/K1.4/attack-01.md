# Attack 01 — K1.4

2026-11-06, Claude Code desktop adversary session (Claude Opus 5.5, `claude-opus-5-5`), under
[Prompt E](../../009-universal-prompts.md). The owner's launch prompt assigned this attack to this session. Release 01
names Codex GPT-6 for the attack, so the owner's prompt is the provenance for the change of model. This is a pre-build
attack. It is **not a design approval and not an independent acceptance review**. No feature code, governing
specification, packet status, 007 row or mutation registry is changed. A different Claude session wrote design 01.
This session treated that author's assumptions as suspect.

**Exact subject:** `origin/claude/k1.4` at `6831b112b8a14f54ca481b965abf755801e7aefe`, fetched for this session. Design
base B is `608f9ece44dbe42b78974bdac9e7ddcd33697705`. Between B and the subject only five K1.4 work files differ, so
the code attacked is B's code. Output branch: `claude/k1.4-attack`, created from the subject. Full pinned source was
available locally. Node v26.10.0. No K1.4 implementation exists at this pin.

**Read first (the owners):** AGENTS.md; [006](../../006-development-process.md); the mental-model mechanisms
[integration](../../../../mental-model/mechanisms/integration.md),
[execution-cycle](../../../../mental-model/mechanisms/execution-cycle.md),
[waits](../../../../mental-model/mechanisms/waits.md) and
[evidence](../../../../mental-model/mechanisms/evidence.md);
[kernel-ownership](../../kernel-ownership.md#deferred-extraction-and-bridge-owners) DX-5 to DX-12;
[decision-02](../DESIGN-AUDIT-01/decision-02.md); [017](../../017-known-limitations.md) L-01 and L-19 to L-22.
**Then the packet:** [brief 01 with the owner's answers](brief-01.md), [release 01](release-01.md),
[design 01](design-01.md) and [owner choices 01](owner-choices-01.md).
**Code inspected:** `packages/kernel/src/{coordinator,driver,waits,state,identity,value-types}.ts`; the legacy
`Harness`, effect and resumption processors, the controller and scheduler ports, the in-memory store, the scheduler
contract suite, and `packages/sdk/src/*`. Also the SDK tests, the BINDING-01 surface test, the examples and the guide
tree.

Owner choices 01 settles Q1 to Q8. This record reopens none of them. Where a finding touches one (DL-01 on Q4, QS-01
on Q7, BREAK-01 on Q2), it says what the choice did not decide.

## Summary

| ID | Sev. | Design section it defeats | One line |
|---|---|---|---|
| [CX-01](#cx-01--a-cancellation-request-is-dropped-before-the-native-root-exists-and-during-a-step) | P1 | §3 step 1, §4, §6 Q3 | A cancellation can arrive before the queued task creates the native root, or during a step. The design drops the request, and the task then starts fresh unmediated native work after the cancellation was accepted |
| [QS-01](#qs-01--the-quiescence-predicate-that-guards-waiting-is-not-defined-over-anything-observable) | P1 | §3 step 2 and table, §12 K14-2 | No observable native state defines "in flight". The two natural readings either strand native results behind a Kernel `WAITING`, or never surface a child's human wait |
| [PF-01](#pf-01--the-protocol-failure-fallback-is-refused-for-the-designs-own-caller) | P2 | §2 host caller, §4 | `reportProtocolFailure` needs control power, and the design's only caller has none. The promised hold is never entered, and the exchange stays `RUNNING` silently. Probed |
| [DL-01](#dl-01--every-class-matching-wake-re-arms-humanwaitdeadlinems) | P2 | §3 (Q4 deadline) | Each re-declared wait gets a fresh `clockNow + waitDeadlineMs`. An input that wakes the Kernel wait but not the native pause pushes the deadline back. Probed |
| [DL-02](#dl-02--deadlines-are-enforced-only-inside-run-calls) | P2 | §4 host loop | Ingress pumps no timers. A reply that arrives long after the deadline still wins, unless something happened to call `runUntilBlocked` first. Probed |
| [VAL-01](#val-01--legal-legacy-values-now-fail-executions-after-native-work-ran) | P2 | §5 payloads, §7 P rows | A 70,000-character model answer, a result with more than 4,096 rows, or 1 MiB of bytes fails the Execution after native side effects ran. The rows claim "P" (preserved), and no inventory row records the change. Probed |
| [BIND-01](#bind-01--k14-5-breaks-three-pinned-binding-01-assertions-the-design-does-not-map) | P2 | §9, §11, §13 | The re-export and the per-call check break `binding-surface.test.ts`: its internal-unreachable assertion, its byte-identical prefix and its exact key list |
| [SCHED-01](#sched-01--the-lineage-scheduler-cannot-pass-the-published-scheduler-contract) | P2 | §2 lineage scheduler, §11 `contracts/scheduler` (P), B-SCHED | The contract claims with `w1`/`w2` and expects any worker to take any Execution. A lineage-only `claim` fails it, so the row has no clean disposition |
| [INV-01](#inv-01--the-g-row-closure-is-not-the-guide-map) | P2 | §7, §12 K14-4 | The six pages the design lists are not the guide map. It omits pages that document SDK features, so K14-4's closure is not a declared bounded search |
| [CONC-01](#conc-01--native-activations-of-different-executions-now-interleave) | P2 | §4 concurrency, §5, §7 P rows | The legacy SDK ran every native Activation one at a time through `exclusive`. The bridge interleaves them across Executions, and no migration row records that |
| [GROW-01](#grow-01--kernel-cost-per-exchange-grows-with-history-and-blocks-every-execution) | P2 | §3 "one native step per exchange", K14-1 | Synchronous Kernel cost per turn grows linearly: 2 ms per turn becomes 15 ms per turn over 2,000 chat turns. That work blocks every other Execution. No limit records it. Probed |
| [ID-01](#id-01--deterministic-root-ids-collide-with-persistent-or-shared-native-stores) | P3 | §3, §10 ID row | The native root ID is a pure function of `creationKey`. A persistent or shared native store outlives the Kernel's deduplication |
| [ALS-01](#als-01--the-root-identity-scope-is-loosely-bounded) | P3 | §2 root identity scope | The design names the prefix `exec`, but the real prefix is `exe`. The scope answers an unlimited number of requests and propagates into callbacks |
| [EMIT-01](#emit-01--the-emission-overflow-carry-is-underspecified) | P3 | §5 | `ingress_result` Emissions are outside the cursor; ordering and the carry when new Events arrive are not stated |
| [TERM-01](#term-01--driver-originated-fails-orphan-the-native-lineage) | P3 | §3 table, §5 | `value_unrepresentable`, `native_error` and `initial_input_rejected` fail the Execution but leave the native lineage live. A Kernel-terminal Execution can no longer be cancelled |
| [HOST-01](#host-01--host-loop-gaps) | P3 | §4 | Several details are undefined: how `activation_limit` orders against open exchanges, manual-clock deadline racing, change signals, and an O(N) READY scan |
| [INGRESS-01](#ingress-01--structural-input-errors-move-from-a-synchronous-rejection-to-an-emission) | P3 | §5, §7 S-INPUT | An empty label used to get a synchronous `rejected` receipt. It is now an accepted Kernel receipt plus a later Emission. The default destination is the root |
| [SIDE-01](#side-01--appservices-keeps-mutating-native-side-doors) | P3 | §6 Q2, §7 S-SERVICES | Q2 closes the Harness mutators, but `services.scheduler.claim` and `services.store.transact` remain second resume paths |
| [PUB-01](#pub-01--unpublishable-has-no-mechanism) | P3 | §16 Q1 | The SDK manifest is not `private`. Nothing makes "unpublishable" true |
| [BREAK-01](#break-01--breaking-changes-the-owner-was-not-asked-about) | P3 | §7 F/M rows vs brief decision 3 | Several refusals and the `harness` type narrowing are breaking changes. Brief decision 3 promised no breaking removal in K1.4 |
| [ACK-01](#ack-01--acknowledgment-wording-contradicts-the-timeout-path) | P3 | §3 step 3, §15 | "Acknowledgment means the native mailbox took responsibility" is false for timeout batches |
| [MBX-01](#mbx-01--the-kernel-mailbox-cap-is-a-new-refusal) | P3 | §7 G-SLOWCAP and G-FORK | Long `RUNNING` exchanges (Q7) queue input in a 1,024-entry Kernel mailbox. The legacy runtime had no cap |

**Two P1 and nine P2 findings.** Every finding is a design defect with a cheap fix that keeps to the managed-native-job
shape. No finding needs a Kernel semantic change, with one possible exception, GROW-01. The answers to the prompt's
four questions are [at the end](#answers-to-the-four-questions).

## P1

### CX-01 — A cancellation request is dropped before the native root exists, and during a step

**Scenario A (pre-root).** `start` creates E, and the host dispatches. `deliver` reports `delivered()`, queues the task
with `queueMicrotask`, and returns (§4). Before the task runs, or while it is awaiting `harness.createExecution`,
something accepts a cancellation of E: `app.cancel(E)`, or an Execution-deadline fire in the same host iteration. The
Kernel commits `CANCELLED` and synchronously calls `requestCancellation({ executionId: E, attempt: A1 })`. The Driver
"cancels the native lineage" (§6, Q3). That lineage is empty: the root does not exist yet, so the cancel finds
nothing and does nothing. The task then runs step 1. It creates the native root, forwards the initial input and runs
one native Activation. That Activation can propose and dispatch an unmediated tool, for example a send. The Outcome
then loses under CX-6. So the Kernel says `CANCELLED`, and native work began *after* the Driver received the
cancellation. [The probe](attack-01/bridge-probes.mjs) (CX-01 lines) shows the order on the real Kernel:
`requestCancellation` is seen with `attempt` set, and the Driver task starts afterwards.

**Scenario B (mid-step child).** The cancellation arrives while a native step is running. The cascade enumerates
descendants at request time. A child that the running step creates after that moment is not cancelled. The legacy
Harness also processes a running Activation's Effects *before* it checks the pending cancellation request:
`harness.ts:897` calls `processActivationEffects`, and `harness.ts:956` reads `cancellationRequests`. So a tool
proposed in that step is dispatched after the Kernel has recorded `CANCELLED`.

**Defeats:** §3 step 1 ("create the native root" with no cancellation check), §4 (the queued task) and §6 Q3, which
the owner accepted: "`requestCancellation` cancels the native root and its native descendants". L-20 excuses failing
to *stop in-flight* work. It does not excuse the Driver *starting* new native work after it received the request.
[Integration](../../../../mental-model/mechanisms/integration.md#native-human-work-and-output) says to map
cancellation by effect, not by name.

**Fix:**
- Keep a sticky per-Execution `cancelRequested` flag in the Driver, set synchronously by `requestCancellation`.
- The task checks the flag before root creation, before each forward, and before and after each `runOnce`. When the
  flag is set, the task stops without stepping and submits nothing. Its Outcome would lose anyway.
- Re-run the cascade after the current step returns, so a descendant created during the step is cancelled too.
- Record in 017, beside L-20, that a native Activation already running dispatches its proposed Effects before the
  Harness sees the cancellation (`harness.ts:897` before `:956`).

**Corpus:** B-CANCEL-PREROOT (cancel between `deliver` and the task: no native root is ever created, and the tool
sink stays at 0) and B-CANCEL-MIDSTEP-CHILD (a child spawned by the running step ends `CANCELLED`).

### QS-01 — The quiescence predicate that guards `WAITING` is not defined over anything observable

**Scenario.** §3 declares `await` only when the lineage is *quiescent*: "nothing in the lineage is runnable or in
flight". It counts "a pending controller resumption or an Effect dispatch whose promise is unsettled" as in flight.
The Harness exposes no such promise:
- `effect-processor.ts:367` and `resumption-processor.ts:176` hold private `inFlight` sets;
- those sets are global to the one shared Harness, not per lineage;
- the only public hook is `drainEffects`/`drainResumptions`, which Q2 refuses.

What the Driver can observe is store records. On those records the cases the design must tell apart look the same:

| Native state (stock features) | Record the Driver sees | Required decision |
|---|---|---|
| G-SLOWCAP: capability executor still pending | `PendingOperation` `status: pending`, `dispatch: dispatched`, `outcome: null` | in flight → no Outcome |
| G-CHILD: a `call` child waits on a confirmation | the parent's `SpawnExecution` `PendingOperation`, same three fields | not in flight → `await`, with the child's `waitingExecutionId` |
| An approved confirmation forwarded by `resolveConfirmation` dispatches its tool *outside any `runOnce`* | same three fields, no Activation running | in flight |
| An Effect has settled and its transaction has committed the Execution `READY`, but `scheduler.enqueue` has not yet run (`harness.ts:441–443`, `:515`; effect `wake`) | the store says `READY`; the lineage FIFO is empty | runnable → `continue` |

Two readings would each pass a review of §3:
- **"dispatched with no outcome counts as in flight".** The G-CHILD row never reaches `await`. The child's
  confirmation never surfaces, and B-CHILD and inventory row G-CHILD fail.
- **"in flight means only resumptions and capability Effects, and runnable means the FIFO is non-empty".** The fourth
  row is classified quiescent, so with a pending confirmation the Driver declares `await`. The `enqueue` then lands in
  a lineage that no exchange is serving. Native work is now runnable while the Kernel records `WAITING`, and it stays
  stranded until a human replies. L-21 means no trusted Event can wake a K1 wait. This is exactly the failure §3 says
  it prevents.

Q7 (owner-accepted) also has an unbounded tail. If a sibling's in-flight call never settles (a hung executor), the
pending confirmation is *never* surfaced. The legacy SDK surfaced it at once. The recorded limit says "once that
call settles", which understates this.

**Defeats:** §3 step 2 and the table rows "work in flight" and "stuck", and §12 K14-2's argument. B-MAP "walks every
row" of a table whose rows are not a partition of native states. So K14-2's one-resume-owner and no-advance-while-
`WAITING` property has no closing mechanism (006 principle 3).

**Fix:** state the predicate *positively* as a total function of store records, and drop the in-flight/stuck
distinction. The two rows produce the same Kernel state (`RUNNING`, no Outcome) anyway.
1. Declare `await` only when **every** non-terminal native Execution in the lineage is in an *awaitable human wait*:
   - `WAITING` with an `event` wake on `external.input`; or
   - `WAITING` on the result of a pending confirmation; or
   - `WAITING` only on `call` children that are themselves in awaitable human waits.
   No lineage member may be `READY` in the store.
2. In every other case keep the exchange open, and wake the task on the lineage `enqueue` notification. The design
   already has that path.

"Runnable" then reads the store, not the FIFO, so the fourth row is safe. Prove closure by enumerating the finite
product that drives the classifier, `lifecycle × waitingFor.kind × pending-operation kind/dispatch/outcome ×
resumption status`, in one table-driven test. Each cell maps to `await`, `continue`, a terminal step or open. Add
"unbounded if a sibling never settles" to the Q7 limit text.

**Corpus:** B-QUIESCE-CELLS (the enumerated product), B-CHILD-CONFIRM, B-SLOWCAP-NO-WAIT, B-APPROVAL-INFLIGHT, and
B-ENQUEUE-WINDOW. The last one uses a scheduler wrapper that delays `enqueue` after the settle commit, and asserts no
`await`.

## P2

### PF-01 — The protocol-failure fallback is refused for the design's own caller

**Scenario.** §4 says: "If the Kernel refuses that [fail] Outcome, the Driver files `reportProtocolFailure`, which
leaves an inspectable hold." §2 fixes the only caller as `{ namespace: "arrokothi.sdk", scopes: ["application"],
cancelScopes: ["application"] }`, with **no `controlScopes`**. `reportProtocolFailure` calls `#requireControl` before
anything else (`coordinator.ts:2077–2081`, K1.2-DEC-14). [The probe](attack-01/bridge-probes.mjs) (PF-01 lines) gets
`unauthorized_control` back. The state afterwards is `RUNNING` with no hold. The exchange stays open forever, with no
inspectable reason, which violates OA-6 ("never silent").

**Defeats:** §2 against §4, and B-DELIVER's "a refused fallback becomes a protocol-failure hold".

**Fix:** give the Driver a separate trusted caller, with `controlScopes: ["application"]`, used only for
`reportProtocolFailure`. `requestTakeover` stays refused, because the Driver has no `isSafeToReplace`. The public
host caller is unchanged. Alternatively, drop the claim and record the silent hold as a limit. The first is cheap.

**Corpus:** B-PROTOCOL-HOLD: force a refusal of the Driver's fail Outcome and assert the hold.

### DL-01 — Every class-matching wake re-arms `humanWaitDeadlineMs`

**Scenario.** Q4 puts `deadline = clockNow + waitDeadlineMs` on *each* Kernel wait the Driver declares (§3). An
input whose `subscriptionClass` is `arrokothi.legacy.input` wakes the Kernel wait by class equality. Native then
rejects it, for example because its `destination` is outside the lineage, its label is empty, or (for a confirmation)
the decision is stale. The native pause is unchanged, so the Driver re-declares `await` with a **new** deadline.

[The probe](attack-01/bridge-probes.mjs) (DL-01 lines) sends three stray inputs, each before the current deadline.
The first deadline was 1,100. After the strays, the clock reads 1,270 and the live deadline is 1,370. The human pause
was never bounded. Any input with that class extends it: a buggy integration, a retry without a `requestKey` (each
retry is a fresh Event), or a stale confirmation decision. The owner chose the deadline's *source*, an application
option. Q4 did not decide whether it bounds the native pause or one Kernel registration.

**Defeats:** §3's Q4 paragraph and B-DEADLINE-WAIT's claim.

**Fix:** carry the native pause's first deadline in progress, for example `{ v, root, emissionCursor, pause: {
identity, deadline } }`. The pause identity is the waiting native Execution plus its wait or confirmation ID.
Re-declare the *same absolute* deadline while the same native pause persists. W-2 then expires an already-due one at
registration.

**Corpus:** B-DEADLINE-STRAY (strays before the deadline do not extend it).

### DL-02 — Deadlines are enforced only inside run calls

**Scenario.** The host pumps timers only inside `runUntilBlocked` and `runUntilIdle`, and "the ingress methods …
dispatch nothing" (§4). Take a common chat host:

1. `runUntilBlocked` returns `input_required`.
2. The host returns the response to the user and calls nothing until the user's next message.
3. The user replies after `humanWaitDeadlineMs`.
4. `app.input` is accepted and wakes the wait. The input wins, because no fire was accepted first (L-22).

[The probe](attack-01/bridge-probes.mjs) (DL-02 lines) shows a reply 10,000 ms past a 10 ms deadline. Afterwards the
Execution is `READY`, no timer is pending, and the next batch holds only the input. The same applies to
`executionDeadline` on a `WAITING` Execution. L-22 makes the *Kernel* fire-only on purpose, and puts the obligation on
the host: "The host must pump." The SDK is that host, and it pumps at the wrong points.

**Defeats:** K14-1 ("the SDK host pumps `pendingTimers`/`fireTimer`") as §4 implements it, and Q4's documented
meaning.

**Fix:** fire due timers at the start of *every* host entry that can accept a decision: `input`,
`resolveConfirmation`, `cancel` and `start`, as well as the run calls. State in the guides that deadlines take effect
at the next host call. That is still L-22, now at a predictable point. No Kernel change.

**Corpus:** B-DEADLINE-AT-INGRESS (advance the manual clock past the deadline, call `app.input`, and assert the
timeout wins with the input queued).

### VAL-01 — Legal legacy values now fail Executions after native work ran

**Scenario.** Legacy JSON has no size limits: `core/src/util/json.ts` checks only finiteness, plain objects and
cycles. The Kernel refuses any of the following (`value-types.ts:4–9`):
- strings over 65,536 Unicode scalar values;
- containers with more than 4,096 entries;
- depth over 32;
- more than 1 MiB of canonical bytes.

Each of these is an ordinary output of a preserved feature, and each ends as a named Execution **failure**, after
every tool and model call has already run:
- a model answer of 70,000 characters (G-CHAT);
- a RAG Workflow result of 5,000 rows (G-WORKFLOW);
- a long Emission.

[The probe](attack-01/bridge-probes.mjs) (VAL-01 lines) gets `malformed_envelope` for a 70,000-character `complete`.
The native failure path has the same problem. If `ExecutionFailure.details` is over a limit, the failure is replaced
by `value_unrepresentable`, and the native failure code is lost.

**Defeats:** the P dispositions of S-RUN `completed`, G-CHAT, G-WORKFLOW and G-PROVIDERS, and K14-4's rule that a
feature is either preserved or refused by name *with no partial work*.

**Fix:** pick one per value class, and record it in the inventory and 017:
- **(a)** carry oversize native values by locator, which the managed-native-job shape allows. The Kernel result or
  Emission then holds `{ nativeEmissionId }` or `{ terminal: "native" }`, and the value is read through the
  deprecated native view.
- **(b)** add an **M** row "values over the core limits now fail the Execution", with a preflight warning and the
  guide text.

Either way, cap `details` so that a failure code always survives.

**Corpus:** B-VALUE-RESULT-70K, B-VALUE-ROWS-5000 and B-VALUE-FAIL-DETAILS.

### BIND-01 — K14-5 breaks three pinned BINDING-01 assertions the design does not map

**Scenario.** `packages/kernel/tests/binding-surface.test.ts:38–58` asserts three things:
1. The public graph from `packages/sdk/src/index.ts` reaches **no** file under `packages/sdk/src/internal/`.
2. `Object.keys(sdkPublic)` is exactly five names.
3. The prefix of `internal/value-capture.ts` before `// Internal SDK bridge:` has a pinned SHA-256.

Design 01 breaks all three:
- §2 re-exports `toCanonicalBytes` from `internal/value-capture.ts`, and `legacy-bridge/codec.ts` imports it into the
  public graph. That breaks 1.
- The new runtime exports (`toCanonicalBytes`, and the error classes callers need for `instanceof`) break 2.
- §9 runs the L-01 check "immediately before each serializer call, inside the existing sandbox window". The serializer
  call is `value-capture.ts:1777`, inside the pinned prefix (the marker is at `:1979`). That breaks 3.

§13 claims "BINDING-01's canonical-bytes boundary" keeps passing. §11 maps only `tests/conformance`, `packages/core`,
`tests/evals` and `application.test.ts`, so these assertions are changed without a recorded kept property. A reviewer
inspecting removed assertions (006) will find them.

**Defeats:** §9, §11 coverage and §13.

**Fix:** add `packages/kernel/tests/binding-surface.test.ts` and the `packages/sdk/tests/*` wrapper files to the K14-6
mapping, each with its kept property:
- the capture graph still imports no Kernel;
- the public surface is the new exact list;
- the prefix is byte-identical except for the inserted L-01 call. Re-pin the hash with the diff shown, or place the
  call after the marker by wrapping `captureCanonicalBytes`.

The second form keeps the pin.

**Corpus:** the re-stated surface test itself.

### SCHED-01 — The lineage scheduler cannot pass the published Scheduler contract

**Scenario.** §11 maps `contracts/scheduler.test.ts` as **P**: "the published Scheduler contract also runs against
the Driver's lineage scheduler" (B-SCHED). The contract (`core/src/testing/contracts/scheduler.ts:20–27, 55–62`) has
these cases:
- enqueue `A` and `B`, then `claim("w1")` returns `A` and then `B`;
- in "exclusion does not block unrelated Executions", `claim("w2")` takes `B`.

§2's lineage scheduler: "`claim(workerId)` serves only the lineage that `workerId` names". `w1` names no lineage, so
it returns `undefined`, and `A` and `B` have no native record to map to a root. The suite fails by construction.

**Defeats:** the §11 `contracts/scheduler` row and B-SCHED. This is a K14-6 row with no clean disposition.

**Fix:** build the lineage scheduler as a contract-conforming FIFO plus a lineage-filtered claim. A non-`lineage:`
worker claims from all lineages in enqueue order; it never runs in the bridge. Then the published suite passes
unchanged, and B-LINEAGE adds the filter's own cases. Otherwise mark the row **R** and state the lineage contract
separately. Also say how `enqueue(childId)` finds the root: a store read of `rootExecutionId` at enqueue.

**Corpus:** B-SCHED (the contract suite, unchanged) and B-LINEAGE.

### INV-01 — The G-row closure is not the guide map

**Scenario.** §12 says the "G-rows are closed by the guide map's list of SDK-documented features (above)". §7's list
has six pages. The guide map (`docs/guides/README.md` and the section READMEs) also reaches the following pages:
- `execution/native/worked-examples.md`: the SDK conversation-and-confirmation example;
- `execution/native/evaluation-and-diagnosis.md`: `app.preflight`, `runUntilBlocked(...).reason`,
  `readAgentControlState(context.control.progress)` on `RunResult.execution`, and the child/peer/wait-graph readers;
- `deployment/current-hosting.md`;
- `execution/native/requirements-and-control.md` and `workflow-agent-and-stages.md`.

`deployment/quick-start.md:139–141` also documents `submitUserInput` as an SDK host action, and S-USERINPUT marks it
**F**. Nothing checks the six-page list against the map. So K14-4's "closed by construction" is a hand-made list, not
a declared bounded search (006 principle 3). **N** ("not an SDK feature") is also a fourth disposition, which the
brief's preserve, migrate or refuse rule does not contain.

**Defeats:** §7 and §12 K14-4.

**Fix:**
- Declare the scope as every page reachable from `docs/guides/README.md`.
- Use a mechanical extraction rule: every backticked SDK or Harness member and every linked example test. A test
  fails on an extracted feature with no row.
- Put **N** to the owner, or fold it into **F** with a reason.

**Corpus:** the extraction test.

### CONC-01 — Native Activations of different Executions now interleave

**Scenario.** The legacy SDK wraps every `harness.runOnce()` and `runUntilIdle()` in `exclusive` (`application.ts`),
so native Activations never overlapped across Executions. Only settling continuations could overlap a running one.
§4 requires and implements concurrent exchanges. The default store serializes transactions (`in-memory-runtime-store.ts:455–468`),
so store integrity holds. Application code shared across Executions is another matter, because it now sees concurrent
Activations for the first time:
- trusted Function handlers and adapters;
- capability executors;
- a `ScriptedModelProvider` with one step list;
- shared counters in examples.

That changes side-effect ordering and test determinism for features marked **P**.

**Defeats:** §7's P rows G-WORKFLOW, G-TOOLS, G-PROVIDERS and S-OPT-NATIVE, and §5's "Dropped legacy state: none".
The `exclusive` lock carried a behaviour, not only a race fix.

**Fix:** add an **M** row: native Activations of different Executions may interleave, and trusted handlers,
executors and providers shared across Executions must be reentrant. Add a test that shows the interleaving. Offer
no global serial mode, because that would defeat K14-1.

**Corpus:** B-INTERLEAVE (two Executions sharing a handler observe interleaved calls).

### GROW-01 — Kernel cost per exchange grows with history and blocks every Execution

**Scenario.** K1.3 owner choice 05 evaluates P1–P9 in full on every successor. `postStateViolation` loops over the
Execution's whole mailbox, including acknowledged entries, and all of its retired waits (`state.ts:1370–1391`).
`inspect` copies every exchange, Emission, receipt and fire. The bridge spends one exchange per native step, and the
host re-reads state each iteration. [The growth probe](attack-01/growth-probe.mjs) models one chat turn as
`continue`, then `await`, then an input, then `inspect`. Over 2,000 turns of one Execution:

| Turns | ms per turn |
|---|---|
| 0–500 | 2.1 |
| 500–1,000 | 6.0 |
| 1,000–1,500 | 10.3 |
| 1,500–2,000 | 15.3 |

That is linear growth per turn, so the total over an Execution's life is quadratic. All of it is synchronous, so it
blocks every other Execution's native work. L-24 records *memory* for retired waits and fires. Nothing records this
time cost or the double retention: the Kernel keeps every Emission, and so does the native store.

**Defeats:** K14-1 ("a delayed Runtime does not block another Execution") as a practical claim for long-lived chats,
and §3's "same pacing" argument.

**Fix:** an owner choice. Either:
- **(a)** a 017 row with these measurements and a trigger, a long-lived SDK conversation, assigned to K5 retention;
  or
- **(b)** an accepted-design change: evaluate P over the successor's *changed* positions, with the full witness kept
  test-only, as K1.3 design check 03 offered. This is a Kernel change and needs 006's architecture steps.

The bridge can also reduce exchanges by running native steps until a boundary when no input is queued. That trades
against Q8-era pacing.

**Corpus:** the growth probe as a bounded performance observation in 017, not a pass/fail test.

## P3

### ID-01 — Deterministic root IDs collide with persistent or shared native stores

The native root ID is `execution-13:arrokothi.sdk11:application<n>:<creationKey>`. The namespace and scope are
constants for every SDK application. A user-supplied persistent `runtime.store` (S-RT-NATIVE P) outlives the Kernel's
creation index (L-19). The same happens when two applications share one store. A caller key reused after a restart,
or in a second application, makes the first exchange's native `executions.insert` fail. The port says it "fails if
the Execution already exists" (`runtime-store.ts:50`), so the result is a generic `native_error`. **Fix:** check
whether the root exists at the first exchange, and fail as `arrokothi.bridge.native_root_exists`. Document that keys
are scoped to one coordinator lifetime and are application-global, so different end users share one key space.

### ALS-01 — The root identity scope is loosely bounded

The scope is said to answer the `exec` prefix, but `ID_PREFIXES.execution` is `"exe"` (`ports/ids.ts`). The
`AsyncLocalStorage` store also propagates into any callback that a custom store or scheduler registers inside
`createExecution`. **Fix:** make the scope one-shot. The first `exe` request in scope gets E, and a second one throws.
Wrap only `harness.createExecution` in it. B-ROOTID then asserts the one-shot.

### EMIT-01 — The emission overflow carry is underspecified

`ingress_result` Emissions are not covered by `emissionCursor`, and progress has no room for any held back. §5 does
not say:
- that ingress results go first, so that at most 64 always fit;
- what `next` is when the carry exchange also forwards a new batch, which makes native runnable;
- how a terminal or `await` step is deferred behind a carry.

**Fix:** state the order and the deferral, and add B-VALUE cases for carry plus new input and carry plus terminal.

### TERM-01 — Driver-originated fails orphan the native lineage

§3 cancels the lineage only for `wait_deadline_expired`. For `value_unrepresentable`, `native_error` and
`initial_input_rejected`, the native root can still be `WAITING` or `READY`, with live children and in-flight Effects.
The Kernel is terminal, so `app.cancel` is refused and `requestCancellation` never comes. **Fix:** cascade-cancel the
native lineage before every Driver-originated `fail`, and after a root `COMPLETED` with live descendants.

### HOST-01 — Host-loop gaps

- B-CONTINUE asserts that the Kernel is `READY` at `activation_limit`. The loop must therefore await the Outcomes of
  the exchanges it dispatched before it checks the limit. §4 does not say so.
- "Raced against … the next pending deadline" uses real time, which means nothing on a manual clock. Say that manual
  clocks rely on the caller re-entering, and on DL-02's pump at ingress.
- Change signals are needed for cancellation and for input from another caller.
- "Dispatch every … READY" needs an O(N) `visibleExecutions` and `inspect` scan per iteration. Keep a host-side
  READY set, updated from Kernel answers.
- `runUntilIdle`'s "await until no lineage can run a step" must say whether it waits for in-flight work. The legacy
  call did not.
- The Driver should key forwarding by `activationId`, so that a future `redeliver` cannot forward twice.

### INGRESS-01 — Structural input errors move from a synchronous rejection to an Emission

The legacy `deliverExternalInput` returned `rejected` synchronously for structural errors. The quick-start guide says
"check their receipts". Under the bridge, the Kernel accepts any JSON payload, and an empty label or a malformed
destination becomes an `ingress_result` Emission later. That input also wakes the wait (DL-01).
- **Fix:** validate the structural part (label, destination pattern, JSON) in the SDK before `submitInput`, and
  refuse synchronously. Only lineage-dependent and state-dependent rejections stay asynchronous.
- `destination` defaults to E. A migrator who drops `destination: waitingExecutionId` sends a child's reply to the
  root's native mailbox, where it sits unseen. Default instead to the unique input-waiting Execution in the lineage,
  or require `destination` when `waitingExecutionId ≠ E`.

### SIDE-01 — `app.services` keeps mutating native side doors

S-SERVICES (P) exposes the lineage scheduler and the native store, and so does the `controllers(services)` hook.
`services.scheduler.claim("lineage:E")` steals a lineage's step, so the Driver sees nothing runnable.
`services.store.transact` writes mailboxes. Under the cooperative model this is not an attack, but it leaves Q2's
"one resume owner" short of complete. **Fix:** expose a read-only scheduler view (`queuedCount` only) and document
store writes as unsupported. Or record the gap in 017.

### PUB-01 — "Unpublishable" has no mechanism

Q1 makes the SDK "unpublishable until a release packet". `packages/sdk/package.json` has no `"private": true`, and
`packages/kernel` does. **Fix:** set `"private": true` on the SDK in K1.4, or add a guard test. A release packet
removes it.

### BREAK-01 — Breaking changes the owner was not asked about

Brief decision 3: "No 0.9 breaking removal in K1.4." Q2 (accepted) refuses the mutators. The following also break
existing callers, and none was put to the owner:
- S-RT-SCHED and S-RT-MAXRUN make `createApplication` throw for options that worked before;
- S-OWNER refuses `ownerExecutionId`;
- S-START-REJECT, and native creation errors such as `UnknownDefinitionError`, move from a throwing `start` to a later
  failed Execution;
- narrowing `Application.harness` from `Harness` to `LegacyHarnessView` breaks TypeScript callers that pass it as a
  `Harness`, for example `examples/…/settle.ts` and `classification.ts`.

**Fix:** list them in one owner question at the design check. The check confirms or adjusts; it does not reopen Q2.

### ACK-01 — Acknowledgment wording contradicts the timeout path

§3 step 3 and the planned 017 row say that acknowledgment "means that the native mailbox took responsibility for each
Event". A timeout batch can carry the timeout *and* a reply accepted after expiry (bound 64, W-9). §5 forwards nothing
for it, then fails. A forward that throws mid-batch fails as well. Those Events are acknowledged and never forwarded.
The Runtime may decide this (W-9: both facts survive). **Fix:** word the rule as "accounted for by the Runtime's
Outcome: forwarded, or discarded by a terminal decision". Report each discarded reply in an `ingress_result`.

### MBX-01 — The Kernel mailbox cap is a new refusal

Under Q7 and G-SLOWCAP an exchange can stay `RUNNING` for hours. Input queues in the Kernel mailbox (default 1,024),
and then `capacity_exhausted` refuses it. The legacy runtime had no cap. **Fix:** add an inventory note and a guide
line, or set `mailboxCapacity` from an application option.

## Answers to the four questions

1. **Kernel guarantees on the bridge's own paths.**
   - Cancellation: CX-01.
   - Waits and deadlines: DL-01 and DL-02.
   - Outcome: PF-01 (silent hold) and VAL-01 (failure after work).
   - Input: INGRESS-01.
   - Creation: ID-01.

   Creation atomicity, dispatch, one current attempt, CX-6 losing Outcomes and takeover refusal hold as designed.
2. **One pause with two resume owners, or native advancing while `WAITING`.**
   - QS-01 is the general vector: the misclassified enqueue window, and an approval dispatched outside a step.
   - SIDE-01 is the remaining side door after Q2.
   - CX-01 is the cancellation analogue: native advancing while the Kernel records `CANCELLED`.
3. **A Kernel change or a new entry the design says it does not need.** None is required. PF-01 needs a second,
   control-scoped trusted caller. That is a host-configuration change, though it contradicts §2's "no `controlScopes`".
   GROW-01's option (b) would be a Kernel change, and needs an owner decision.
4. **Rows and criteria with no clean closure.**
   - K14-6: the `contracts/scheduler` row (SCHED-01), and the BINDING-01 surface test outside the mapping (BIND-01).
   - K14-4: the closure (INV-01), and the P rows VAL-01 and CONC-01 falsify.
   - K14-2: its closure depends on QS-01.
   - K14-5: closable once BIND-01 is mapped.

## Searched and not filed (declared scope)

- **K14-6 table against the tree.** The 132 entries match `tests/conformance/**/*.ts` at B exactly, with no extras or
  omissions. The totals are as stated: 79 R, 7 P, 11 X, 20 U, 4 G and 11 S.
- **Native ID shape.** The longest Kernel ID, with a 64-character key, is 107 characters, all from
  `[A-Za-z0-9._:-]`. It passes `execution/ids.ts:24`. Kernel Activation IDs contain `/`, and the design never uses
  them as native IDs.
- **`interleave`.** No stock controller uses it (repository grep). The legacy `interleave` semantics that the bridge
  delays are therefore unreachable through the SDK.
- **Function Stage Effects.** Function Stage `awaitEffects` accepts only capability and `WriteMemory` requests
  (`ports/stage.ts:166–227`). G-PEER's "custom controllers only" is correct.
- **Conformance and evals.** Legacy conformance and evals use `createAgentTestHarness` or a core `Harness`, not
  `app.harness`. Q2's refusals do not break them. The scripts and examples that do use `app.harness` mutators
  (`settle.ts`, `patterns*.ts`, `mcp-gemini-canary.ts` via the test harness) are already slated for migration in
  range B.
- **L-01 three-reference check.** The logic is sound for V-ENV's `let JSON` hop, both before and after load. Its only
  defect is placement (BIND-01).
- **`deliver`.** `deliver` → `undefined` with a microtask task observes no Promise. Takeover is refused by the
  missing `isSafeToReplace`, and before that by missing control. An exact `start` retry replays creation without
  native work.
- **Not searched.** Real-provider adapters (Gemini, Strands, MCP) beyond their port shapes, the K1.4-gate E1 fixtures,
  and performance beyond GROW-01's one shape.

## Probes

Both probes are plain ESM. They import the Kernel source directly, add no Kernel importer, and run from the
repository root with Node v26.10.0:

```bash
node docs/development/work/K1.4/attack-01/bridge-probes.mjs
```

```bash
node docs/development/work/K1.4/attack-01/growth-probe.mjs 2000
```

Recorded output at the subject (`bridge-probes.mjs`, exit 0):

```text
PF-01 reportProtocolFailure with the design's host caller: unauthorized_control
PF-01 state afterwards: RUNNING holds: []
DL-01 first wait deadline: [ 1100 ]
DL-01 deadline after three stray wakes: [ 1370 ] clock: 1270 (first promised 1100)
DL-02 state after a late reply with no pump: READY pending timers: 0
DL-02 next batch kinds: [ 'arrokothi.legacy.input' ]
CX-01 cancel: accepted ; order: [
  'requestCancellation seen (1 so far), attempt {"activationId":"execution-13:arrokothi.sdk11:application5:cx-01/activation-1","writerEpoch":1}',
  'driver task starts: native root does not exist until here'
]
VAL-01 complete with a 70,000-character native result: malformed_envelope
probes done
```

`growth-probe.mjs 2000`, exit 0, on the owner's Mac (timings vary by machine; the slope is the observation):

```text
turns 0-500: 2.094 ms/turn
turns 500-1000: 6.016 ms/turn
turns 1000-1500: 10.306 ms/turn
turns 1500-2000: 15.271 ms/turn
```

These probes drive the real Kernel with a fake Driver that stands in for the design's Driver decisions. They prove
the Kernel-side facts each finding relies on. They do not exercise a bridge, because none exists. The native-side
facts in CX-01, QS-01, SCHED-01, BIND-01, INV-01 and CONC-01 are cited to source lines above. Per 006, each finding's
corpus entry becomes a maintained test in the build. Design 01 §13 says attack items join its corpus table with their
provenance.
