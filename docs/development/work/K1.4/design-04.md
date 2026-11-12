# Design 04 — K1.4 narrow redesign after review 02

Implementer: the K1.4 implementer's Claude Code desktop session, Claude Opus 5.5 (`claude-opus-5-5`), 2026-11-08.
This note answers the four questions of [brief 03](https://github.com/ArrokothI/arrokothi/blob/b655733b9b90810eca747c61b8f2095f5f201341/docs/development/work/K1.4/review-02/brief-03.md)
for [review 02](https://github.com/ArrokothI/arrokothi/blob/b655733b9b90810eca747c61b8f2095f5f201341/docs/development/work/K1.4/review-02.md)
(Codex GPT-6, CHANGES REQUIRED of H `96214874577f2108a7578d1d6fcebc4af0f7173c`, findings K14-R2-01 and
K14-R2-02). Both records and the review's probes were read at review commit `b655733b` on
`codex/k1.4-review-02`, without merging that branch.
- **Subject:** the code at C `3e4c59faa7b6138693bb9094144cafff7a33158e`. Line references are to that C. Base B is
  `608f9ece`.
- **Owner decisions in force:** owner choices [01](owner-choices-01.md), [02](owner-choices-02.md),
  [03](owner-choice-03.md), [04](owner-choice-04.md) and [05](owner-choice-05.md). Owner choice 05 is "(a) Narrow
  redesign": only R2-01 and R2-02, a new bounded design check, and route (d), a recorded limit, if review 03 finds
  a third CHANGES REQUIRED in this subsystem.
- **Precedence:** designs 01–03 stand except where this note changes them.
- **Bounds:** every change is in the legacy Driver, its scheduler, their tests and the dependent reports. Kernel
  source and `packages/core/src` are unchanged. No accepted behaviour changes. No code is written before the
  design check.

## 1. Cause

Both findings come from one habit: the Driver trusted a derived record instead of the fact it was derived from.

- **R2-01.** The native Runtime commits READY, then calls a fallible `enqueue` (`lineage-scheduler.ts:46–48` reads
  the Execution before it adds the entry). The two background trackers (`effect-processor.ts:3450`,
  `resumption-processor.ts:367`) swallow that rejection. Their comments describe a settlement that could not be
  written. Here the settlement was written; only the queue entry was lost. The Driver's step loop
  (`driver.ts:363–376`) read "READY with no queue entry" as "an enqueue is still in flight" and parked. Nothing
  else was left to wake it.
  - Design 03 §8 required this case to progress ("a one-shot `readExecution` failure inside `enqueue` … the open
    exchange progresses"). The build delivered only the wake, not the progress. Implementation 02 then listed the
    loss as a residual risk under L-31. Both are corrected below (§4).
- **R2-02.** The cleanup ablation table was derived from the trigger rows (`bridge-terminate.test.ts:197`), not
  from the code's cleanup sites. A site with no row (`hold`) was never ablated. The only accounting-hold test
  ran on a terminal root, where the cascade has nothing to end.

## 2. R2-01 — the Driver owns runnable work (brief questions 1 and 2)

### 2.1 Owner

The Driver owns scheduling for its lineage. Committed READY in the native store is the fact. A queue entry is only
a hint that a producer has already scheduled it.

**Rule (reconcile).** In the step loop, when an iteration ran no step, the decision is `continue`, and the lineage
has no claimable entry, the Driver schedules every READY member of that collect, then loops. A `continue` never
parks. Only `open` parks.

- **`schedule(executionId, lineage)`.** A new synchronous `LineageScheduler` method with no read and no `await`.
  The lineage is E, the exchange's own root: every member came from the BFS from E. It shares `enqueue`'s
  insertion rules (one entry per Execution; an Execution that is claimed gets a requeue instead).
- **`enqueue` is unchanged.** It still reads, so the reviewer's fault injection still bites, and its rejection
  still goes to the native caller.
- **This is the "learned root" route D03-CHK-01 named,** applied to scheduling, not only to notification.

### 2.2 Failed versus in flight

The Driver does not need to tell them apart, because scheduling twice is harmless.

- One queue entry per Execution: a second `schedule` or a late `enqueue` finds the entry and adds nothing.
- A late `enqueue` while the Execution is claimed becomes one requeue. When that entry is claimed later,
  `activate` reads the context in a transaction and drops a claim whose Execution is not READY
  (`harness.ts:745`). It acks the claim and runs no controller.
- A READY state is consumed by exactly one Activation: `activate` moves READY to RUNNING in a transaction checked
  against the context's revision.
- Only the Driver's lineage worker claims this lineage's entries, one `runOnce` at a time. So there is still one
  active native step per lineage.

### 2.3 Both producers, and every other

| Producer | Commit | Then | Error owner |
|---|---|---|---|
| Capability settlement (`effect-processor.ts:2998`) | Operation settled, observation routed, Execution READY | `wake` → `enqueue` | Background tracker; swallowed |
| Model resumption (`resumption-processor.ts:444`) | Resumption settled, Execution READY | `wake` → `enqueue` | Background tracker; swallowed |

Reconciliation reads the result (READY), not the producer. So it covers both rows the same way, and any other
producer whose enqueue is lost. A producer whose error reaches a caller keeps its accepted route: the Driver's
forward reports `unknown` and ends E (owner choice 04); a step that throws ends E through the `exception` site.

The build adds a census of the 13 native `wake`/`enqueue` call sites (`harness.ts` 4, `effect-processor.ts` 8,
`resumption-processor.ts` 1), each with its error owner. Any other site whose rejection is swallowed gets the same
fault test as the two rows above.

### 2.4 Order of commit, notification and registration

Registration (`nextWork`) still precedes the first read (design 03 §2.3). Notification is unchanged: the facade's
synchronous signal, with learned roots, and a broadcast for an unknown scope.

| Commit lands | What the Driver does |
|---|---|
| Before collect | The collect sees READY → `continue` → reconcile |
| During collect, visible | The same |
| During collect, not visible | `open` → park; the signal already resolved `work`, so the loop runs again at once and sees READY |
| After collect | The signal wakes the parked loop → READY → reconcile |
| On an unknown lineage | The broadcast wakes every waiter; scheduling uses E either way |

### 2.5 Cancellation and cleanup

Unchanged. The loop checks `ended` before every step. An entry the Driver scheduled for an ended lineage is
either never claimed (no worker for that lineage runs again) or is claimed and dropped. A pending native
cancellation makes `activate` cancel the Execution without controller work (`harness.ts:750`).

### 2.6 No second native step, model or capability call

- A model call or capability dispatch happens only inside a step, or in a tracker that has already started.
  Scheduling starts neither.
- A step runs only from READY, consumed once (§2.2). The settled observation or resumption is delivered once,
  because those records only move forward.
- Tests count executor invocations, `provider.invocationCount` and Activation records per member.

### 2.7 The transaction port is unchanged

The facade, the signal, `enqueue` and all native code stay as they are. `schedule` runs outside any transaction.
It adds no `await` to a transaction's promise. The caller still gets the store's own promise, with its result or
error.

### 2.8 What cannot be ruled out becomes a Driver failure

After reconciliation, only one READY state could make no progress: the store shows READY to a collect but not
to `activate`'s transaction, at the same context revision. That breaks atomic visibility (design 03 §2.2, P1).

The Driver records each `(member, revision)` it schedules. Suppose the next `runOnce` activates nothing, and the
next collect still shows that member READY at that same revision. Then the Driver throws a named
`UnschedulableReadyError` through the existing `exception` site. E fails `native_error` with a bounded diagnostic
naming the member. It is never a park, and never a loop.

### 2.9 Tests (provenance: review 02, K14-R2-01; design 03 §8, D03-CHK-01)

- **B-ENQUEUE-LOST-CAP** and **B-ENQUEUE-LOST-MODEL:** the review's two probes, promoted with provenance.
  - Exactly one fault each.
  - The exchange progresses: the capability case reaches its human confirmation, then completes; the model case
    completes.
  - Executor calls and `provider.invocationCount` are both 1.
  - No hold, and no unhandled rejection.
- **B-ENQUEUE-LOST-SCHEDULES:** the same one-shot fault for both producers, with the settlement released at each
  named gate (`register.before/after`, `read.before/after` in collects 1 and 2, `validated`, `park`).
  - Each schedule is recorded as reached or unreachable; a fallback release is not coverage (D03-CHK-03).
- **B-ENQUEUE-LATE:** the producer's `enqueue` is delayed until after the Driver scheduled and stepped the
  member. The result is one Activation and one dropped claim.
- **B-UNSCHEDULABLE:** a store that reports READY to `readExecution` but not inside `transact` at the same
  revision. Expected: the `exception` site, `native_error`, and a bounded loop.
- **B-RECONCILE-ABLATION:** removing reconciliation fails both B-ENQUEUE-LOST tests. This is an in-test
  ablation of a `reconcile` prototype method (design 03 §8 deviation).
- **Retained unchanged:** the review's committed/rollback facade control, its delayed-signal no-wake control,
  B-COMMIT-SIGNAL, B-NOTIFY-NOWAKE, lineage isolation, and B-ENQUEUE-WINDOW. B-ENQUEUE-WINDOW keeps its
  expectations; its delayed enqueue becomes a late duplicate.

### 2.10 Rejected

- **Skip `enqueue`'s read when the root is known.** It hides one fault without owning the state, and it would
  make the reviewer's probes vacuous.
- **Have `signal` enqueue its scope.** That queues non-READY Executions on every transaction and changes the
  facade.
- **Hold on READY-without-queue.** That turns a recoverable committed state into a failure.
- **Change the native trackers.** `packages/core/src` is out of scope.

## 3. R2-02 — the cleanup oracle comes from the code (brief question 3)

### 3.1 One label per call site

- `TERMINATE_SITES` becomes a runtime tuple, and `TerminateSite` is its element type.
- Each `endLineage` call site gets its own label. Today's `cancellation` serves six call sites, so it splits into:
  - `cancel.request` (`driver.ts:228`);
  - `cancel.root-created` (`:198`);
  - `cancel.exchange-start` (`:279`);
  - `cancel.forward-loop` (`:300`);
  - `cancel.step-ended` (`:331`);
  - `cancel.application` (`application.ts:380`).
- The terminal call at `driver.ts:518` stays one call site with its three labels.
- That makes 16 labels. Production behaviour is unchanged; only the label argument differs.

### 3.2 Static census

A test parses `packages/sdk/src` with the TypeScript compiler API and requires:

- every `endLineage(` call to carry a literal label, or a conditional of literals. The one exception is the
  forwarding call inside `terminate`.
- every `terminate(` call to carry a literal label;
- each label to appear at exactly one call site;
- the set of labels to equal both `TERMINATE_SITES` and the oracle table's keys;
- `cascade(` to be called only from `endLineage`, and the native `cancelExecution(` only from `cascade`.

So a new cleanup call fails the census until it has its own label and a table entry.

### 3.3 The oracle

Every trigger row runs once unablated and logs the labels it reaches. Then each label is removed in turn, by the
existing prototype patch of `endLineage`, and every row that reached it runs again.

The table gives each label one disposition, and the test requires the observed results to match it exactly:

| Disposition | Required evidence |
|---|---|
| **caught** | The named rows fail with the label removed. |
| **equivalent** | A written argument naming the label that had already ended the lineage on every row that reaches it. The test asserts that this label was reached first. |

A label no row reaches fails the census.

### 3.4 Rows

- **T1–T12 kept.**
  - T12 stays the terminal-Outcome route. Its cascade runs at the terminal label, and the hold that follows
    (`driver.ts:586`) has no cascade of its own.
- **T6 becomes a row.** It reaches `initial-input`. It is declared **equivalent**: the destination is already
  terminal, and no descendant exists before the first forward. This keeps T6's recorded argument.
- **T13 (new; provenance: review 02 probe, K14-R2-02).** A live Workflow parent with a called chat child. The
  accounting encoder fails on the next, nonterminal exchange, which reaches `hold` (`driver.ts:523`). It asserts:
  - a Kernel recovery hold with cause `protocol_failure`;
  - the batch unacknowledged, with no `ingress_result` Emission;
  - every native member terminal;
  - no later native steps.

  With `hold` removed, both members stay WAITING, so T13 fails. That is the removed-cascade mutant the review
  asked for.
- **Cancellation labels.** T1 (Kernel cancel) and T2 (Execution deadline) stay. A row is added for
  `app.cancel`'s second cascade: a step spawns a child while the request's cascade runs (D01-CHK-01).
  - Each `cancel.*` label must end the build **caught** or **equivalent**.
  - A label that is neither stops the build and is reported. It is not dropped.

### 3.5 Count

At C, B-TERM-ABLATION had 12 tests: 11 removals over nine labels, plus the inventory assertion. `hold` and
`initial-input` had none. Implementation 02's "12 site ablations" and its claim of complete coverage were wrong.

## 4. Corrections (brief question 4)

- **L-31.** It covers sibling work still in flight, or work that never settles. A settlement that committed and
  then lost its queue entry is neither, and §2 closes it.
  - Implementation 02's attribution to L-31 is retracted by a dated correction in that report.
  - 017 L-31 is unchanged and not extended.
  - A settlement whose transaction fails stays L-31: the pending operation or resumption never settles.
- **G-SLOWCAP and G-SLOWMODEL** (`bridge-inventory.test.ts:806`, `:818`). At C these claimed native progress
  without qualification, and the post-commit fault broke that claim.
  - After the build, each row adds B-ENQUEUE-LOST-CAP or B-ENQUEUE-LOST-MODEL to `covers`.
  - The feature text names the one-fault case. It claims nothing about a failing transaction.
- **Ablation count and coverage claim:** §3.5, corrected in a dated note in implementation 02.
- **Missing link.** Implementation 02 linked `implementation-02/ablations.log`, which was not committed at H. The
  next report commits its own log.
- **Design 03 §8.** Its B-COMMIT-SIGNAL enqueue-failure test required progress, and the build did not deliver
  it. Implementation 03 records this as a design-to-build gap, separate from the review's findings.

## 5. Scope for design check 04

The check is bounded to R2-01 and R2-02. These are the questions it should settle:

1. Does reconciliation give every committed READY member in E's lineage a step, with no read and no change to the
   transaction port?
2. Is §2.2's idempotence argument sound against a late `enqueue`, a requeue and cancellation?
3. Is §2.8 the only state left that makes no progress?
4. Do the §3.2 census and the §3.3 matrix force every present and future cleanup call site into the table?

Everything else in the cumulative packet is for review 03.

## 6. Addendum after design check 04

[Design check 04](https://github.com/ArrokothI/arrokothi/blob/dc21f8e989b0828a236d65d3988eb9ade5391af3/docs/development/work/K1.4/design-check-04.md)
(Codex GPT-6, `codex/k1.4-design-check-04` at `dc21f8e9`, subject `9cf57c61`) is APPROVED WITH REQUIRED CHANGES
D04-CHK-01..03. Its appendix probes (`install-design.mjs`, `attacks.mjs`) were read at that commit. This section
disposes the three changes; where it differs from §§2–4, it wins. Owner choice 05 still governs, and the build
follows without a new design check (006 routine corrections).

### D04-CHK-01 — reconcile on every `continue`

**Adopted.** The §2.1 precondition was wrong. A sibling that keeps returning `continue` takes the
`if (record) return decision` branch on every pass, so a READY member whose enqueue was lost never gets one.

- **Rule.** Whenever the decision is `continue`, the Driver schedules every READY member of that collect, then
  either returns the decision (a step ran) or loops (none ran). This applies whether or not a step ran and whether
  or not an entry is queued. Scheduling is idempotent (§2.2), so a member that is already queued keeps its place.
- **Finite opportunity.** The lineage queue is FIFO with one entry per Execution. A scheduled member is claimed
  after at most the entries ahead of it, whatever its siblings do. One native step per lineage and one step per
  `continue` are unchanged.
- **The §2.8 detector is bound to an actual attempt.** The scheduler counts the claims of each Execution. When the
  Driver schedules member X, it records X's context revision r and X's claim count. It throws
  `UnschedulableReadyError` only if a later collect shows X READY at revision r **and** X was claimed since then.
  - An activating claim moves READY to RUNNING and bumps the revision, so it cannot match.
  - A dropped claim means the transaction saw X not READY after the collect that saw READY at r; seeing READY at
    r again breaks P1/P2.
  - A sibling's steps are not claims of X, so they neither mask X nor count as its attempt.
- **Tests.** These add to §2.9:
  - **B-RECONCILE-STARVE:** the check's continuing-parent/settled-child witness, promoted. The child runs, and
    capability calls stay at 1.
  - **B-RECONCILE-MANY:** two READY members whose enqueues were both lost. Each runs once.
  - **B-RECONCILE-REVISION:** a member is scheduled by the Driver, its late duplicate claim is dropped, and it
    later becomes READY at a new revision. The detector does not fire, and the member runs.
  - **The ablation:** removing reconciliation fails B-RECONCILE-STARVE and both B-ENQUEUE-LOST tests.

### D04-CHK-02 — a reporting path that needs nothing native

**Adopted.** `terminate` awaited the cascade before reporting, and the exchange's catch swallowed whatever
`terminate` threw. So a failed cleanup lost the report.

- **`terminate`.** It sets `ended` first, as before. If `endLineage` rejects, it reports a protocol hold through
  `reportProtocolFailure`, with a bounded diagnostic naming the site and the cause. It neither offers a terminal
  Outcome nor acknowledges the batch. The diagnostic says that the lineage is stopped and its cleanup unconfirmed;
  it never claims the cleanup succeeded.

  > **Correction, 2026-11-11 (round 4, after [review 03](https://github.com/ArrokothI/arrokothi/blob/5e36d514fb10347a182bbeaa36879ce9074fe72a/docs/development/work/K1.4/review-03.md) K14-R3-01; [owner choice 06](owner-choice-06.md)).**
  > Only a rejected `endLineage` reaches this report. A cascade whose native `cancelExecution` answered
  > `cancellation_pending` resolves, so `terminate` closes the ledger and offers the Outcome with no hold, although
  > the RUNNING member has not ended. After a native exception past READY→RUNNING, that member stays RUNNING
  > ([017](../../017-known-limitations.md) L-36). "Never claims the cleanup succeeded" holds only for a rejected
  > cleanup call.

  > **Correction, 2026-11-11 (round 5, after [review 04](https://github.com/ArrokothI/arrokothi/blob/8ca7288b041d376dad7a8c12f083e43427bbb101/docs/development/work/K1.4/review-04.md) K14-R4-01; [brief 05](https://github.com/ArrokothI/arrokothi/blob/8ca7288b041d376dad7a8c12f083e43427bbb101/docs/development/work/K1.4/review-04/brief-05.md)).**
  > "A rejected cleanup call" means `terminate`'s own call. The Kernel records that hold only for E's unresolved
  > Activation while E is not terminal. `requestCancellation`'s request swallows its rejection, as "keeps its
  > existing handling" below says: no hold follows it. `app.cancel` then requests again (`cancel.application`),
  > and when that fallback is fulfilled no hold follows either (review 04's probe of row F1's schedule).
- **The exchange's final catch.** If `terminate` itself rejects, a guarded `hold` reports what happened. That
  path is Kernel-only: no native read, no scheduling and no cascade.
- **Unchanged.** A cancellation accepted first still wins. `offer`'s cancellation-loss check is untouched, and the
  Kernel refuses a hold on a cancelled exchange, which the Driver ignores. `requestCancellation`'s own cascade keeps
  its existing handling.
- **Tests:**
  - **B-FAULT-COLLECT** and **B-FAULT-ACTIVATE:** a one-shot fault in a collect inspector and in activation setup.
    E fails `native_error` and the cascade runs.
  - **B-FAULT-CLEANUP:** the check's two-fault witness (a collect read, then the exception cascade's read).
  - **B-UNSCHEDULABLE-CLEANUP:** the §2.8 detector, then a cascade read fault.
  - Each case asserts its Kernel disposition, no later native steps, no second provider or executor call, and no
    unhandled rejection.

### D04-CHK-03 — executed equivalences and a census that fails closed

**Adopted.** The oracle becomes a table of (row, label) pairs. Each label a row reaches in its baseline run has one
of three dispositions, and the test runs each one:

| Disposition | Executed check, with only that label's cascade removed |
|---|---|
| **kill** | The row's **behavioural** assertions fail. The reach log is checked only in the baseline run, so a missed label never counts as a kill. |
| **equivalent: empty obligation** | At the label's entry the root is terminal and E has no descendant. The row's full assertions pass with and without the label. This is T6. |
| **equivalent: redundant** | Names the other label that ran earlier. At this label's entry, a BFS over child links (which are never deleted, P3) shows every member terminal. The row's full assertions, including no later native work, pass under removal. |

- **Label rules.**
  - A label with no **kill** pair must have only equivalent pairs and a recorded reason.
  - An unreached label, an unmapped pair, a pair that survives without its equivalence check, or a malformed
    entry fails the test.
  - A label can be redundant on one row and necessary on another.
- **Cancellation rows.** Before any `cancel.*` label is given an equivalence, the corpus includes:
  - a delayed root creation, with cancellation during `createRoot`;
  - a late spawn, where a step creates a child while the request's cascade runs.
- **Census rules.** The census resolves syntactically over `packages/sdk/src`:
  - `endLineage(` and `terminate(` calls need a literal label, or a conditional of literals. The one exception is
    the forward inside `terminate`.
  - Each label belongs to exactly one call site.
  - `cascade(` is called only from `endLineage`.
  - A native cancellation is `….harness.cancelExecution(`, only inside `cascade`. The Kernel's
    `coordinator.cancelExecution(` is recognised and excluded. Any other `cancelExecution` receiver fails.
- **Fails closed.** These forms fail the census rather than escape it:
  - a reference to `endLineage`, `cascade` or `cancelExecution` outside a call;
  - an element access by those names;
  - a `.call`, `.apply` or `.bind` of them.

  Computed property names built at run time are a declared gap, outside this bounded search.

  > **Correction, 2026-11-11 (round 4, after [review 03](https://github.com/ArrokothI/arrokothi/blob/5e36d514fb10347a182bbeaa36879ce9074fe72a/docs/development/work/K1.4/review-03.md) K14-R3-02 and K14-R3-03; [owner choice 06](owner-choice-06.md)).**
  > - **Fails closed** was too wide. Static template element access and quoted destructuring aliases (a
  >   StringLiteral property name, then `.call` through the renamed binding) also escape the census. They are
  >   recorded exclusions beside run-time names ([017](../../017-known-limitations.md) L-37).
  > - **Cancellation rows.** The delayed-creation and late-spawn rows held the request's cleanup successful. One
  >   rejected request cascade distinguishes `cancel.application`, `cancel.exchange-start` and
  >   `cancel.forward-loop`, so none of the three is equivalent only. Rows F1–F3 kill each one; only
  >   `initial-input` (T6) stays equivalent only.
- **Negative controls.** The census and the oracle check run on mutated inputs and must fail for:
  - an added unlabelled call;
  - an added call with a new label but no table entry;
  - an aliased call;
  - the table with its `hold` row deleted.
- **Producer census.** The §2.3 count of 13 is withdrawn. A test derives the native producer list from
  `packages/core/src/runtime`: every `scheduler.enqueue(` and `deps.wake(` call. It separates delegate edges (the
  Harness's `wake:` callbacks) from producers. For each producer it records the enclosing method and whether a
  tracker that swallows errors reaches it. The test compares the derived list with a table that gives each
  producer's error owner. A tracker-reached producer must name its lost-enqueue test. A new producer fails until
  it is classified.
- **Reporting.** The report gives baseline rows, distinct labels, removals, behavioural kills and executed
  equivalences separately.

### §4's corrections

They are made as dated corrections in implementation 02:
- the retracted L-31 attribution;
- the G-SLOWCAP and G-SLOWMODEL qualification;
- the 11-removal count.

Implementation 03 commits every log it links. It also records design 03 §8's unbuilt enqueue-failure promise as
a design-to-build gap.
