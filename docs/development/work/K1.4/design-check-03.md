# K1.4 — independent design check 03

**APPROVED WITH REQUIRED CHANGES — D03-CHK-01 through D03-CHK-03.**

The double collect can establish a coherent human-pause observation, and the native writer argument can
carry that observation through Outcome submission. No store-wide exclusion or Kernel change is required.
Reusing the accepted input's destination also preserves replay without weakening the Kernel's content
comparison. The required changes below concern the new notification boundary and executable evidence;
they do not replace these mechanisms with another design.

## Binding, independence and scope

- Checker: this independent Codex desktop session, GPT-6 per session instructions, 2026-11-07
  (America/New_York). This session did not write design 03 or perform K1.4 review 01. No subagents.
- Fetched and checked **`origin/claude/k1.4` at
  `270463b2b46ed62f470ba416cb87e5e6d730856a`**. This is the subject of this check, including
  [design 03](design-03.md) and [design 02](design-02.md).
- Separately bound **`codex/k1.4-review-01` at
  `0f415d6e016824ea9bddac0ca7aca3fd2d3accb5`**; both its local and fetched remote refs resolved there.
  Read its [review](https://github.com/ArrokothI/arrokothi/blob/0f415d6e016824ea9bddac0ca7aca3fd2d3accb5/docs/development/work/K1.4/review-01.md),
  [brief 02](https://github.com/ArrokothI/arrokothi/blob/0f415d6e016824ea9bddac0ca7aca3fd2d3accb5/docs/development/work/K1.4/review-01/brief-02.md),
  `probes.mjs` and `probes.log` directly from those Git objects. That branch was not merged.
- Created `codex/k1.4-design-check-03` directly from the subject head. The final commit identity belongs
  in the external handoff. This branch adds only this report.
- Governing workflow: [006](../../006-development-process.md) and [012](../../012-review-methods.md),
  with the architecture and slice-audit skills. Read the mental-model overview/reference and relevant
  Kernel, Runtime, Driver and deployment descriptions, then the execution-cycle, waits, lifecycle,
  creation and integration owners; development front door, baseline, roadmap, K1.4 scope and owner Q5/Q7.
  The prior-art reading map's idempotency, wait/cancellation and evidence sections were background only.
- Bounded remit: R1-01 observation/notification/submission, R1-02 retry identity, and the mechanism/test
  mappings for R1-03..05. This is a design check, **not** cumulative implementation acceptance, a new
  C/H review, an integration, a status-ledger update or a successor release.

The subject changes only design/progress records relative to reviewed H
`072f9627791f43e4d990a6f47c3e32510cbbc011`. Design 03's correction code and new maintained tests do not
exist at the subject. All PASS labels below mean the **design obligation** checked here, not a shipped fix.

## R1-01: observation and commitment

**PASS for the double-collect and commitment mechanism; required notification and search corrections below.**

The proof needs the entire projection, including record-set membership and immutable association fields,
not just equal context revisions. For each context, revision equality excludes an intervening lifecycle
change and return. For each operation, confirmation, resumption and child link, the inspected native writers
advance the classifier-relevant states without returning to an earlier value. No native facet deletes a
record. Equality must be structural over owned snapshots, with stable record identity/order; equality of
references or of counts would not establish the claim.

Under those conditions, equal collects have a common instant between them. An insertion cannot disappear
again before the second list, and an inserted child cannot be hidden by traversing only the original member
set: collection must rebuild the BFS and compare links and membership as specified. I inspected the
constructors/transitions, their Runtime write sites, context revisions and the in-memory store's atomic
draft swap. The 25 `transact` sites in design 03's census match the source search. These are constraints on
this native Runtime and its conforming store, not new Kernel rules.

The second part of the argument is essential. At the common instant:

- No live member is READY or RUNNING; the Driver has awaited its own `runOnce` before collecting.
- A confirmation-gated operation cannot dispatch autonomously. An approved-but-undispatched operation is
  not covered by the pending-confirmation case and keeps the exchange open.
- A pending dispatched capability, pending resumption or unresolved call to a terminal/missing child keeps
  the exchange open. Mixed work cannot hide behind a human pause on the same member or another member.
- A settled operation's Event routing and possible READY transition were committed atomically with its
  settlement. If it did not wake the member, only a later native activation can consume that Event.
- A terminal child may remain in the lineage. It does not invalidate the argument: a still-pending call
  dependency makes the parent open; a plain spawn has no parent terminal-result settlement; an already
  settled call has no second result to deliver.

Thus no eligible autonomous transition remains to invalidate a validated `await` before `declareWait`,
root inspection, emission reading or synchronous `submitOutcome`. Kernel input received in that interval
is queued for a later Activation, and the Kernel's wait-registration scan preserves it. Cancellation is
ordered at Kernel acceptance and fences a losing Outcome.

Read §2.4's statement that writers are "idle" as **no remaining writer can advance the relevant projection**.
It is too literal to say no callback or transaction can execute: an invalidated resumption's late callback
can enter settlement and return without changing anything; a delayed post-commit enqueue can still run.
Those inert tails do not defeat the proof. Keep that distinction in the revised argument and tests.

| Attempted window | Result of the check |
|---|---|
| Settlement before registration or before the first read | The first collect sees committed state. A signal already consumed before registration is harmless only because this read follows registration. |
| Before/after each selected read, including stale values returned after settlement | An incoherent `await` is rejected by the next collect. A non-`await` need not be validated. The real mixed-operation probe and read sweep below exercised this. |
| Between collects or during the second | Equality fails for the changed record/set/revision. Taking the second as the next first collect is sound. |
| After equal collects, around submission reads and after accepted `await` | No relevant autonomous writer remains under the predicate and inspected writer census. This is a structural closure, not a claim that an in-flight settlement was experimentally released in an impossible window. |
| Around notification registration | Registration is synchronous and precedes collection. A commit visible earlier is observed; a later successfully delivered signal resolves the registered waiter. A delayed signal can cause a harmless extra pass. Signal failure is D03-CHK-01. |
| Child creation, completion and parent settlement | Membership/link validation is necessary. A coherent terminal-child/pending-call interval is open. Normal child completion and its parent settlement are awaited inside `runOnce`; D03-CHK-03 distinguishes that ordering from an independently settling resumption. |

The existing predicate's decision table need not change. B-RECORD-ONEWAY and B-NATIVE-WRITERS are useful
regression guards, not proofs against arbitrary future edits inside the same methods. Keep their bounded
scope explicit and retain the behavioral product and race tests.

## R1-02: retained identity

**PASS.** The retained Kernel Event is an appropriate owner for the accepted destination. The SDK has one
fixed producer namespace, and inspection is scoped to E; lookup by caller key and input kind within that
view recovers D without introducing another mutable retry cache. Guard nullable `inputId` and exclude the
creation/timeout domains when implementing the lookup.

Crucially, lookup supplies **only D**. It must not return the saved receipt itself or substitute the old
label/payload/correlation/causation. Build the candidate from the new caller content plus D and let
`submitInput` compare the canonical content. `coordinator.ts:1141–1160` performs that comparison before
terminal/capacity refusal. This preserves both replay and conflicts after termination.

| Caller situation | Required result, supported by the design |
|---|---|
| Omitted destination, same key/content; no pause, different pause or several pauses now | Original Event, receipt and acceptance position; no new native delivery. |
| Originally omitted, retry explicitly names original D | Replay; this is the review's preserved control. |
| Originally explicit D, retry omits destination | Replay. Explicitness was never a separate canonical field; the two forms resolve to identical content. |
| Same key, changed label, payload, correlation, causation or explicit destination | Conflict; the stored destination must not erase the changed field. Preserve null/omitted distinctions already made by capture. |
| Several pauses, genuinely new caller identity | `destination_required`, as before. |
| Terminal E, previously accepted identity versus fresh key | Replay/conflict for the former; terminal refusal for the latter. |

The synchronous resolution/submit section and pumping placement must remain as designed. No explicit
destination requirement is added to previously valid retries. The throwaway matrix below checked the
Kernel comparison with changed pause-cache inputs and a real terminal transition; it does not substitute
for the planned real Workflow multiple-pause test.

## R1-03..05: mechanism and distinguishing tests

| Finding | Mechanism | Test that distinguishes an incorrect implementation | Design result |
|---|---|---|---|
| R1-03 | One `BatchLedger` from the entire reserved batch; every offer takes it; terminal close preserves attempted dispositions and marks only unattempted entries discarded; unencodable accounting cannot acknowledge. | Before-first failure; partial forward including commit-then-throw; initial rejection with trailing Events; output encoding failure with prior forwarding; ledger encoding failure producing an unacknowledged protocol hold. Assert original IDs/receipts and exactly one disposition per acknowledged Event. | **FAIL as currently specified oracle; mechanism approved subject to D03-CHK-02.** |
| R1-04 | Construct the actual lineage scheduler before `controllers(services)` and inject that same object into the Driver/Harness. | Read and retain it inside the callback; compare retained identity with app services; observe the queued native root after start. This defeats both undefined-at-call and later-placeholder-substitution implementations. | **PASS.** Construction ordering and the named other consumers support the claim. |
| R1-05 | Shared `terminate` for Driver-originated ends, sticky `ended`, descendant-first cascade; retain cancellation's before-root/after-step checks. | T1–T12 vary the actual trigger; completion/failure/native cancellation have live descendants; subsequent runs start no new native work. A separate bypass mutant for each terminal call site must fail its matching case. | **PASS with the T12 clarification below.** The trigger table closes the helper-presence gap in review 01. |

For T12, assert a **nonterminal recovery/protocol hold**, refused Outcome, no batch acknowledgment and ended
native lineage, not a "Kernel terminal code". The table itself correctly says E is held; the following
blanket assertion should be narrowed accordingly. T6's no-descendant explanation is legitimate because the
initial input is forwarded before any step. T4 and T11 must remain labeled Driver-level injected cases;
they are not claims of normal SDK reachability. The mutation inventory should distinguish multiple trigger
rows sharing one call site instead of inventing separate source sites to match test names.

## Required changes

### D03-CHK-01 — make notification failure preserve both the store contract and exchange progress

**P2, R1-01, design 03 §2.3/§2.7.** The ordering argument covers successful signals. It does not yet specify
what happens when resolving the lineage through `readExecution` fails. That is a supported asynchronous
port read, also used by `LineageScheduler.enqueue` at `lineage-scheduler.ts:42`.

The straightforward `try { return await store.transact(...) } finally { await signal(scope) }` composition
can reject **after the underlying transaction committed**. It no longer forwards the port unchanged:
`runtime-store.ts:301–305` says a thrown transaction rolls back. If notification is instead detached and its
rejection swallowed, a no-wake settlement can leave the open exchange parked despite its now-awaitable
state. Neither behavior is an acceptable implementation of the stated mechanism. This is a design omission
at a new boundary, not a claim that a production facade already exists.

Specify a noninterfering, reliable lineage-notification path: preserve the underlying transaction's result
or original exception, and ensure a committed change either wakes the correct lineage or produces an
explicit Driver failure/hold rather than silently losing its wake. Resolving an already registered immutable
lineage without a new fallible read is one possible implementation; another needs an explicit failure path.
Do not translate a notification failure into a fictitious transaction rollback. This stays inside the Driver.

Extend B-COMMIT-SIGNAL/B-NOTIFY-NOWAKE with committed and rolled-back transactions, delayed lineage
resolution across registration, and a one-shot lookup failure. Assert the original transaction result/error,
actual committed/rolled-back state, lineage isolation, and that the parked exchange does not disappear into
an unobserved rejected Promise. The minimal failing composition exercised here is:

```js
let committed = false;
const store = {
  async transact(_scope, work) { const r = await work(); committed = true; return r; },
  async readExecution() { throw Error("one lineage lookup failed"); },
};
const scheduler = new LineageScheduler(store);
const work = scheduler.nextWork("root");
async function signal(scope) {
  const root = (await store.readExecution(scope))?.rootExecutionId ?? scope;
  scheduler.wake(root);
}
async function facadeTransact(scope, callback) {
  try { return await store.transact(scope, callback); }
  finally { await signal(scope); }
}
// facadeTransact("root", async () => 42) rejects; committed is true; work is unresolved.
```

### D03-CHK-02 — make the accounting oracle accept honest uncertainty and test the hold fallback

**P2, R1-03, design 03 §4.** `unknown/forward_failed` is the truthful status for a throw whose commit point
the Driver cannot establish. Do **not** encode it as `discarded`. However, the proposed assertion "native
deliveries never exceed the `forwarded` entries" contradicts that status.

A concrete conforming schedule exists without a commit-then-reject transaction: let `deliverEnvelope` commit
an input that wakes a WAITING member; then fail the scheduler's post-commit `readExecution`. The native input
exists, but `forward` throws before returning its receipt. This session reproduced that schedule through
the SDK. With one later input queued in the same batch, the design's correct ledger is `unknown, discarded`,
while there is one native delivery and zero known-forwarded entries in that batch.

Replace the aggregate oracle with per-Event assertions: known delivered entries match delivery evidence;
an unknown entry permits zero or one native delivery for that attempted forward and must never cause a
second forwarding attempt; unattempted/discarded and validation-rejected entries have none. Preserve the
original Event IDs and ingress receipts. Include both failure-before-commit and failure-after-commit cases.
For the latter, this is the reproducible fault injection used here:

```js
class Store extends InMemoryRuntimeStore {
  armed = false;
  async readExecution(id) {
    if (this.armed && new Error().stack.includes("LineageScheduler.enqueue")) {
      this.armed = false;
      throw Error("post-commit scheduler read failed");
    }
    return super.readExecution(id);
  }
}
```

Use review-01's existing `chatAgent`, `models` and `ScriptedModelProvider` fixture: start with initial input,
run to `input_required`, queue two keyed replies, then arm the fault and run. Before any native step consumes
the reply, the run fails and `store.peekMailbox(context.mailbox.mailboxId)` contains the first reply exactly
once and not the second. The maintained correction test must additionally assert the two ledger entries.

Also add an explicit **accounting-encoding failure** case: an over-limit terminal result tests a different
branch. Force encoding of the ledger itself to fail and assert no acknowledging Outcome, unchanged reserved
Event dispositions and an inspectable protocol hold. B-ACK-BOUND remains the positive size control. Reconcile
the `unknown` explanation with both L-29 and the managed-native-job paragraph in
[integration](../../../../mental-model/mechanisms/integration.md); do not imply a native processing receipt
or silently keep an exhaustive forwarded/discarded description that excludes the new disposition.

### D03-CHK-03 — define a reachable, non-vacuous schedule search

**P2, R1-01 evidence, design 03 §2.7.** "All positions × F1–F4" is not yet an executable bound. A first collect
that sees a pending capability/resumption returns `open` and does not start a second collect or submission.
Holding the only settlement until one of those later positions therefore cannot reach the intended gate.
The 200-turn limit starts after reaching the gate and does not bound waiting for that gate. Registration is
also not a RuntimeStore read, so a read-only gate does not exercise both sides of registration.

F3 needs the same precision: ordinary child completion awaits `settleOwnerOnChildTerminal` inside
`Harness.applyOutcome` (`harness.ts:1150`) and `runOnce` awaits `activate` (`:687`). The Driver cannot collect
concurrently with that normal same-step parent settlement. A cancellation race, a Driver-level modeled
terminal-child gap, and an actual independently settling child resumption are different experiments.

Define named gate points and before/after phases, a bounded reachability watchdog, and a recorded result for
each requested schedule: reached and asserted, or structurally unreachable with its ordering reason. Report
actual exercised counts separately; a watchdog/fallback release is not a covered window. Add explicit
registration/signal gates outside store reads. For post-validation submission windows, exercise legal inert
tails or cancellation/input, and use the writer argument to close the impossible autonomous-settlement
case. Keep F1–F4's intended obligations, but label real native schedules separately from record-product/model
tests. No fabricated store records should be presented as execution of the review's real settlement probe.

## Evidence and limits

All probes ran locally with Node **v26.10.0** at
`/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin/node`. Disposable files were confined to
`/tmp/k14-design-check-03`; no production source was edited. Successful design probes are experiments with
the proposed algorithm, not tests of code at the subject that has not been implemented.

| Command/experiment | Observation |
|---|---|
| Pinned review-01 `probes.mjs`, copied to `/tmp` with only import paths made absolute; `node --test` | Exit 1: ordinary-flow control passes, all four original counterexamples fail as reported. |
| `node --test packages/sdk/tests/bridge-classify.test.ts` | Exit 0: 15 tests, 3 suites, no failures/skips. Fixed snapshots alone do not discharge R1-01. |
| Disposable `LegacyDriver.prototype.classify` implementing repeated double collects using structural equality of full returned records; original control/R1-01/R1-02 probes, with an input adapter supplying only retained D | Exit 0: 3/3. The original settlement race ends Kernel WAITING/native WAITING; exact terminal retry replays. Full-record comparison is conservative relative to the proposed narrower projection. |
| F1 real executor settlement; gate before and after each of requested read ordinals 1–36 in lineage/traversal/submission reads | Exit 0: 72 attempts, **40 reached**, **32 not reached before a bounded fallback release**. No observed Kernel WAITING/native READY pair after either host run. This is a bounded F1 experiment, not all F1–F4 coverage. |
| Finite record model using the actual classifier: waking and non-waking settlement, two settlements, root capability plus human child, child resumption, terminal-child call settlement; cut positions 0–28, ordered pairs for two settlements | Exit 0: 580 schedules, 2 equal validated-await observations, 0 invalid validated awaits after modeled submission steps. This checks record interleavings, not native fixture reachability or the facade. |
| Retained-D adapter plus real Kernel; original/absent/different/multiple pause-cache controls, changed label/payload/correlation/causation/destination, then real terminal state and fresh key | Exit 0: 35 replay/conflict/refusal assertions; one accepted ordinary input entry retained. Pause-cache variants were controlled inputs to the rule, not claimed real multiple-pause Workflows. |
| SDK post-commit scheduler-read fault described in D03-CHK-02 | Exit 0 for the counterexample assertions: failed run, first reply still in native mailbox exactly once, second absent. Demonstrates the proposed aggregate oracle's contradiction. |
| Minimal facade/signal-failure composition in D03-CHK-01 | Underlying transaction committed, facade rejected, waiter not notified. Demonstrates why unchanged transaction semantics and signal-failure handling must be specified together. |

The complete new F1–F4 corpus, facade implementation, ledger, constructor correction, T1–T12 fixtures and
mutant kills remain build obligations. No full packet verify, new mutation run, live-model benchmark or
isolation/recovery claim is made by this design check. No external source was copied/adapted, and no new
dependency, service or license clearance is involved; probes use repository fixtures and Node builtins.

The implementer should incorporate D03-CHK-01..03 into the design and maintained corpus, apply the T12
assertion clarification, then build the same packet. A later independent cumulative review must bind the
new C/H and verify the repairs. No K1.4 acceptance or successor release is granted here.
