# Design 03 — K1.4 correction after review 01

Implementer: the K1.4 implementer's Claude Code desktop session, Claude Opus 5.5 (`claude-opus-5-5`), 2026-11-07.
This note answers the five questions of [brief 02](https://github.com/ArrokothI/arrokothi/blob/0f415d6e016824ea9bddac0ca7aca3fd2d3accb5/docs/development/work/K1.4/review-01/brief-02.md)
for [review 01](https://github.com/ArrokothI/arrokothi/blob/0f415d6e016824ea9bddac0ca7aca3fd2d3accb5/docs/development/work/K1.4/review-01.md)
(Codex GPT-6, CHANGES REQUIRED of H `072f9627791f43e4d990a6f47c3e32510cbbc011`, findings K14-R1-01..05). Both
records were read at review commit `0f415d6e` on `codex/k1.4-review-01`, without merging that branch.
- **Subject:** design 01 as changed by [design 02](design-02.md), and the code at C
  `0d05d32971dfeda89dc874450e38f440af2c4a1d`. Line references are to that C. Base B is `608f9ece`.
- **Owner decisions in force:** [owner choices 01](owner-choices-01.md), [owner choices 02](owner-choices-02.md) and
  [owner choice 03](owner-choice-03.md). There is no owner supplement for this round.
- **Precedence:** designs 01 and 02 stand except where this note changes them; where they differ, this note wins.
- **Bounds:** every change is in the SDK, the legacy Driver, their tests and the dependent descriptions. Kernel
  source and `packages/core/src` are unchanged. No accepted behaviour changes, and no question goes to the owner
  (§7). No code is written before the design check.

## 1. Cause shared by the findings

The review traced four findings to one assumption: that facts read one after another form one stable fact.
- **R1-01:** separate async reads of the lineage were treated as a simultaneous human-pause state.
- **R1-02:** the destination was recomputed on each call from pauses that change between calls.
- **R1-04:** the services object was handed out before the scheduler existed.

R1-03 has a related cause: accounting for the batch has no single owner, so each exit makes its own choice.
R1-05 is a gap in the evidence: a claim that rested on a shared helper instead of a test of each branch.

The corrections below give each fact one owner, and one point at which it is fixed or validated.

## 2. R1-01 — a validated observation, and a commit signal (brief question 1)

### 2.1 What breaks

At C, `lineage()` (`driver.ts:334–349`) reads each member's context, pending operations, confirmations,
resumptions and child links in separate awaits. `classifyLineage` (`classify.ts:109–128`) then treats the
result as one state. In the review's probe:
1. The context reads `WAITING`.
2. The dispatched capability settles, and the member becomes `READY` (one native transaction).
3. The operation list then reads the settled operation, with the human confirmation still pending.

`notAwaitable` skips settled operations (`classify.ts:68`), so the classifier declares `await`, but no such state
ever existed. The design 02 soundness argument ("only Kernel input can advance the lineage") is about state at a
single moment, so it cannot rule this out: it assumed a premise that the reads do not provide.

### 2.2 Native store properties used

The native `RuntimeStore` port (`packages/core/src/ports/runtime-store.ts`) provides:
- **P1, atomic visibility.** A transaction's writes appear together or not at all (`:1–27`, `:301–305`). The
  in-memory store commits a transaction by swapping in its draft in one step (`in-memory-runtime-store.ts:455–468`).
- **P2, a version on every context.** Every context update is compare-and-set on its revision (`:52–53`). Every
  writer advances the revision by one (`context.ts:349`, `:354`), and the published store contract asserts
  "revision advances once per write" (`testing/contracts/runtime-store.ts:120–134`).
- **P3, no deletion.** No facet has a delete: operations, confirmations, resumptions and links are only inserted
  and updated.
- **P4, states move one way.** The fields the classifier reads change only forward:
  - an operation's `status` goes `pending` → `settled` | `abandoned`, and its `dispatch` goes `not_dispatched` →
    `dispatched` (`effects/pending.ts:129–160`);
  - a confirmation goes `pending` → `approved` | `declined` | `abandoned`;
  - a link goes `active` → `settled` | `abandoned`;
  - a resumption goes `pending` → `settled` → `invalidated`, or `pending` → `invalidated`;
  - `effectKind`, record IDs and the parent/child pairs never change.

A maintained guard, B-RECORD-ONEWAY, keeps P4 true (§6).

### 2.3 Mechanism

**Observation.** One `collect(E)` reads the lineage in BFS order from the root, as now. It keeps only a
projection: per member, the context and its `revision`, and the P4 fields of every operation, confirmation,
resumption and link. The classifier takes that projection type as its only input, so it cannot read a field the
validation does not cover.

**Validation (a double collect).** A collect may support a commitment only after a second collect validates it:
1. `c₁ := collect(E)`, then `d := classify(c₁)`.
2. If `d` is `await`: `c₂ := collect(E)`.
   - If `c₂` equals `c₁`, the observation is validated: submit `await`.
   - Otherwise set `c₁ := c₂`, reclassify, and repeat.
3. If `d` is anything else, it needs no validation (below).

*Argument.* Take any record r. It was read at time aᵣ in the first collect and bᵣ in the second, with
aᵣ ≤ end(c₁) < start(c₂) ≤ bᵣ.
- By P2 and P4, equal values at aᵣ and bᵣ mean r did not change during [aᵣ, bᵣ]. P2 rules out A→B→A on
  contexts; P3 and P4 rule it out on the other records.
- So at any instant t between the two collects, every projected record held its collected value.
- By P1, the store's state at t is a committed state.
- The links at t are the collected links, so the BFS at t reaches exactly the collected members: none is
  missing.

The validated projection is therefore the store's projected state at t, not a mix of moments.

*Which decisions need it.*
- **Terminal decisions** read only the root's terminal lifecycle, which never changes once reached.
- **`continue`** commits nothing about quiescence. At worst it causes one extra exchange or loop, which steps
  and classifies again.
- **`open`** submits nothing.
- **`await`** is the only decision that asserts a whole-lineage fact. It alone is validated.

*Progress.* Each failed validation means a lineage record changed between the collects, which is a real native
step. A lineage whose state satisfies the predicate cannot change (§2.4). So the loop ends either in a validated
`await` or in a non-`await` decision. Under continuous change the lineage is not quiescent, and the classifier
returns a non-`await` decision.

**Notification (the commit signal).** At C, a parked exchange (`step`, `driver.ts:267–273`) wakes only on a
lineage `enqueue`. That relies on every relevant commit also making some member `READY`. The store port does
not promise that: a settlement whose Event does not match the member's wake condition leaves the member
`WAITING` (`event-router.ts:12–37`).

The Driver therefore gives its native Runtime a **commit-signalling store facade**:
- It forwards every port method unchanged, in an explicit forwarding class with no Proxy.
- After each `transact(scope, …)` settles, whether it committed or rolled back, it calls `scheduler.signal(scope)`.
- `signal` resolves scope's lineage the way `enqueue` already does (`lineage-scheduler.ts:41–48`). It wakes that
  lineage's waiters without queueing anything.
- `Application.services.store` stays the caller's store object. Writes through that side door are unsupported
  (SIDE-01, L-34).

**Ordering.**
- `step` takes `work := scheduler.nextWork(E)` before `c₁`, as at C.
- A commit that became visible before the registration is seen by `c₁`.
- A commit visible after it resolves `work`: the signal fires after its `transact` settles, and so after the
  registration. A spurious wake costs one more collect.

There is therefore no lost wake-up, whether or not the commit enqueues anything.

### 2.4 Through Outcome submission

Suppose the projection validated at instant t satisfies the predicate. Then every live member is `WAITING` with
no pending resumption. Every pending operation is one of:
- a `not_dispatched` operation behind a pending confirmation;
- a `spawn_execution` whose live child is itself awaitable;
- settled or abandoned. In a state at one instant (P1), such an operation is inert: its settlement either woke
  the member in the same transaction, or left its Event in the mailbox, where only the member's next wake reads it.

The native writers are the 25 `transact` sites in `packages/core/src/runtime`, named here by their enclosing
method. After t, each of them stays idle without Kernel input:
- **Inside an Activation:**
  - `activate`, `applyOutcome` and `failActivation` (`harness.ts:742`, `:938`, `:1345`);
  - `processOne`, `gateForConfirmation`, the five `dispatch…` methods, `refuse`, `replay` and
    `checkPriorOperations` (`effect-processor.ts:576`, `:764`, `:1484`, `:1827`, `:2143`, `:2509`, `:2633`,
    `:3052`, `:3109`, `:3156`, `:3264`).

  An Activation needs a `READY` member to claim (`harness.ts:745`), and there is none.
- **Settlement of a dispatched operation** (`settle`, `effect-processor.ts:2907`): no operation is dispatched and
  in flight.
- **Child-terminal settlement** (`settleOwnerOnChildTerminal`, `harness.ts:1441`): it needs a child to reach a
  terminal state. Every child is live and awaitable, and only the Driver's cascade cancels it.
- **Resumption settlement** (`resumption-processor.ts:398`): there is no pending resumption.
- **External delivery and confirmation resolution:**
  - `deliverEnvelope` (`harness.ts:502`);
  - `declineConfirmation` and `approveConfirmation` (`effect-processor.ts:879`, `:965`);
  - the approval follow-ups `denyApprovedConfirmation` and `abandonApprovedConfirmation` (`:1165`, `:1220`), and
    the capability dispatch that an approval starts.

  These run only through the Driver's `forward`, that is, through Kernel input. The deprecated `app.harness` view
  refuses `deliverExternalInput`, `deliverEnvelope` and `resolveConfirmation` (`harness-view.ts:24–30`).
- **User input** (`submitUserInput`, `effect-processor.ts:469`): the view refuses it. Like peer messages, it needs
  a custom controller, which the SDK cannot reach (inventory rows G-PEER and G-CORE-DIRECT are N).
- **Cancellation** (`cancelExecution`, `harness.ts:1641`): the Driver's own cascade.
- **Creation** (`createExecution`, `harness.ts:429`): new roots only.

`packages/core/src` has no native timer apart from the inline-wait yield inside an Activation (B-NATIVE-TIMERS).
A guard, B-NATIVE-WRITERS, pins this census (§6).

So between t and `submitOutcome`, the Driver's own reads see the state at t:
- `declareWait`'s `transitionsOf`, which derives the pause IDs;
- the root `inspect`;
- `emissionsOf`.

One concurrent writer remains: a Kernel cancellation's cascade. The Kernel orders the two (CX-6). Either the
cancellation wins and the `await` is a losing Outcome, or the `await` is accepted and the cancellation ends E
afterwards. After an accepted `await`, the lineage changes only through a later Activation's forward.

### 2.5 The windows the brief names

| Settlement or change | Effect |
|---|---|
| Commits before the registration | Visible to `c₁`; classified on a validated state |
| Commits during `c₁` | `c₁` may be mixed. `await` fails validation against `c₂`; any other decision commits nothing, and `work` is already resolved |
| Commits between `c₁` and `c₂`, or during `c₂` | Validation fails; reclassify |
| Commits after `c₂`, before submission | Impossible when the validated state is awaitable (§2.4). Otherwise nothing was committed, and the commit resolves `work` |
| Commits after an accepted `await` | Impossible without Kernel input (§2.4) |
| Commits around the registration | No lost wake-up (§2.3, ordering) |
| Mixed human and non-human work on one member | An in-flight operation is never awaitable, so the result is `open`. Its settlement either makes the member `READY` (`continue`) or leaves it `WAITING` with only the human pause, and the commit signal wakes the exchange to declare `await` |
| Mixed human and non-human work across members (a child human pause, a root capability in flight) | Same, member by member. A lineage is awaitable only if every live member is |
| Child links | New links and child terminals are records in the projection. A child created or ended between the collects fails validation. A coherent "child terminal, parent's operation still pending" is `open` ("child of … is settling"); the parent's settlement (scope = parent, same lineage) signals |

### 2.6 Rejected alternatives

- **Reading inside `store.transact`.** The port promises atomic commit, not isolation for reads made inside a
  transaction. The in-memory store also serializes every transaction, so a lineage read inside one would stall
  every Execution's native writes for the duration of the read. It would also make the Driver a native writer.
- **A store-wide quiet window** (no `transact` in progress across the reads). Any other Execution's commit would
  fail the validation. Under S-INTERLEAVE that can starve the `await` indefinitely.
- **A Kernel-visible "native wake" subscription.** That would make `WAITING` depend on native work, which the
  Kernel/Runtime boundary forbids. It is also native scheduling in the Kernel.
- **Re-reading only the field the probe races.** It closes one read order and leaves the others open.

### 2.7 Tests (provenance: review 01, K14-R1-01; D01-CHK-02)

- **B-OBSERVE-PROBE.** The review's snapshot probe, maintained as is: the supported async store port delays the
  Driver's operation read until the real executor has settled.
- **B-OBSERVE-SCHEDULES.**
  - *Search.* A gating store counts the Driver's observation reads, selected by stack frame as in the probe. For
    every read position k in the sequence, it pauses at k, releases one real native settlement, waits at most
    200 event-loop turns until the store shows it, then resumes. The sequence runs from the registration through
    both collects, `declareWait` and the submission reads.
  - *Fixtures:*
    - F1: one member with a dispatched capability and a confirmation-gated operation (the probe's shape);
    - F2: a root capability in flight while a called child waits for input;
    - F3: a child's completion settling its parent's call while a sibling confirmation is pending;
    - F4: a pending controller resumption (B-RES's shape) with a human pause elsewhere in the lineage.
  - *Assertions for each (fixture, k):*
    - no accepted `await` while the store has a live `READY` member or an in-flight operation, checked at every
      accepted Outcome;
    - a second host run changes nothing (nothing is stranded);
    - the end state equals the unscheduled run's.
  - *Bound:* the declared search is all positions × F1–F4. The build reports the sequence length of each fixture.
- **B-QUIESCE-CELLS (extended).** This supplies the product D01-CHK-02 promised:
  - single-operation cells: `effectKind × status × dispatch × outcome × confirmation state`, crossed with
    `lifecycle × wait kind × resumption state` (none, pending, settled, invalidated);
  - two-operation cells over the verdict classes (none, human-gated, in flight, inert, child awaitable, child
    settling, unsupported kind);
  - each for one member and for a parent with one called child.

  Expected decisions come from a spec table written in the test from §2.4, not from `classify.ts`.
- **B-NOTIFY-NOWAKE.** This is a Driver-level case. A scripted native controller waits on `external.input` alone
  while its capability is dispatched, so the settlement wakes nothing and enqueues nothing. The exchange must
  still declare `await` after the settlement, through the commit signal. At C it stays parked. The SDK's stock
  controllers do not reach this shape, so this is a robustness test, not a claimed SDK defect.
- **B-COMMIT-SIGNAL.** The facade forwards every port method unchanged. It signals after a committed or
  rolled-back transaction, and only to the scope's lineage.
- **B-NATIVE-WRITERS** and **B-RECORD-ONEWAY** (structural) are described in §6.

## 3. R1-02 — keep the resolved destination with the request's identity (brief question 2)

**Cause.** At C, `input()` derives the default destination from the latest pauses on every call
(`application.ts:321–335`) and writes it into the canonical payload. The Kernel identity is
`(producer, E, requestKey)`, and replay compares the content bytes (`coordinator.ts:1141–1160`). After the pauses
change, the same caller request becomes different bytes, and the Kernel refuses it with `duplicate_conflict`.

**Where the resolution is kept.** It is kept in the Kernel's own accepted Event, as the `destination` field of its
payload. That Event is retained with its identity, including after E ends: the identity lookup runs before the
terminal check (`coordinator.ts:1141–1160`), and `inspect(E).mailbox` exposes each input's `inputId` and payload
(`inspection.ts:48–63`). The SDK adds no second store and no new Kernel entry.

**Rule.** When the caller supplies a `requestKey` and omits `destination`, `input()` does the following in one
synchronous section (`input()` has no `await` before `submitInput`, and `pump()` moves ahead of it):
1. It looks for the Kernel's retained input entry with this identity: `inputId.requestKey === requestKey`, kind
   `arrokothi.legacy.input`.
2. If one exists, the omitted destination resolves to that entry's recorded `destination`.
3. Otherwise, INGRESS-01 applies unchanged:
   - exactly one input pause → that member;
   - none → the root;
   - several → `destination_required`.

The canonical payload is then built and submitted, and the Kernel's content check decides as before. A generated
key is always fresh, so it skips the lookup (owner choice Q5: only caller keys make retries exact).

**Caller identity and content.**
- **Identity** is `(E, requestKey)`.
- **Content** is `label`, `payload`, `correlationId`, `causationId` and the resolved `destination`.
- Whether the caller named the destination explicitly is not content: the brief keeps the explicit-child retry
  control, which replays an implicitly resolved input.

| First call | Retry (same key) | Result |
|---|---|---|
| destination omitted, resolved to D | omitted, same content; after `continue`, the pause disappearing, a new pause, several pauses, or E terminal | Replays the original Event, receipt and position; no second native delivery |
| omitted, resolved to D | explicit D | Replays (the review's control) |
| omitted, resolved to D | explicit D′ ≠ D | `duplicate_conflict` |
| omitted, resolved to D | omitted, with changed label, payload or correlation | `duplicate_conflict`: the candidate is D plus the new content |
| explicit D | omitted, same content | Replays: the recorded resolution is D |
| either | new key, E terminal | Refused as at C |

Changed-content conflicts are unchanged: every changed field still changes the bytes. Ambiguity (several pauses)
can arise only for an identity the Kernel has not seen. No caller is ever required to name a destination it could
omit before.

**Cost.** The lookup is one `inspect` per keyed input with the destination omitted. Its growth joins L-35's
measurement.

**Tests (provenance: review 01, K14-R1-02; owner choice Q5; INGRESS-01).** B-INPUT-RETRY is a matrix:
- *Retry moment:* before `continue`; after the pause disappears; after a different pause appears; with several
  pauses; after E is terminal.
- *Retry form:* the rows above.
- *Assertions:* `eventId`, receipt and `acceptancePosition` equal the original's; conflicts are refused by name;
  the child's native `external.input` count stays 1.
- *Kept:* the review's probe as a case, and its explicit-child control.

## 4. R1-03 — one owner for the batch's disposition (brief question 3)

**Owner.** A per-exchange `BatchLedger`, created from `activation.events` at the start of `exchange`, is the only
source of `ingress_result` entries. Each Event's entry moves through:
- `unattempted` → `attempting` → one of:
  - `forwarded`: the native receipt's status, plus `reason` or `detail`;
  - `rejected`: SDK validation, or outside the lineage;
  - `ignored`: not application input; this includes the Kernel timeout Event, so every acknowledged Event has an
    entry;
  - `unknown`: `forward` threw, reported with reason `forward_failed`.

`unknown` is needed because a throw mid-forward does not say whether the native delivery committed. Reporting
`discarded` would deny processing that may have happened; reporting `delivered` would claim processing that may
not have. When a terminal decision closes the ledger, every Event still `unattempted` becomes `discarded`, with
the terminal code as its reason.

**Every Outcome takes the ledger.**
- `offer` takes the ledger, not a results array, so no exit can leave the accounting out.
- A non-terminal Outcome requires that no entry is `unattempted`; non-terminal Outcomes are submitted only after
  the forward loop.
- `endWith` and `finish` keep the forwarded entries and the progress already read. At C the catch-all exit passes
  `null` progress and `[]` (`driver.ts:245–247`).

**Encodable by construction.**
- A batch holds at most 64 Events (`DISPATCH_BOUND`, `host.ts:19`).
- Each field is bounded: Kernel identity text; SDK constant kinds and statuses; native `reason` capped at 64
  characters and `detail` at 1,024. A capped field is marked `detailsOmitted`, as D01-CHK-05 already does.
- So one `ingress_result` stays far below the 1 MiB root limit and the 4,096-entry limit. The build measures the
  worst case and pins it in a test.
- If encoding still fails, the Driver submits no acknowledging Outcome. It reports a protocol failure instead,
  and the Kernel holds the exchange with the Events unacknowledged. At C, `finish` drops the results silently
  (`driver.ts:437–442`).

| Exit at C | Accounting after the correction |
|---|---|
| `readProgress` throws (`:211`) | Every input Event `discarded` |
| Native root missing (`:214`) | Every input Event `discarded` |
| Kernel timeout (`:219–223`) | As at C, plus the timeout Event `ignored` |
| Initial input rejected (`:230–231`) | The rejected start entry, then every later Event `discarded` |
| `forward` throws (to `:245`) | Earlier entries kept, the current Event `unknown`, later ones `discarded` |
| Classification, step or submission throws, including `value_unrepresentable` (`:245`) | Every forwarded entry kept |
| `ended` before or during the forward, or during the step (`:206`, `:226`, `:241`) | No Outcome is submitted. The Kernel's cancellation gives the batch its B-5 terminal disposition, not an acknowledgment, as at C |

**Tests (provenance: review 01, K14-R1-03; ACK-01; L-29).** B-ACK-EXITS has one row per exit above:
- *Fixtures:* at least two Events per row (initial input plus later inputs). Faults are injected through the
  supported async store port, as in the review's probe.
- *Rows:*
  - a store read failure before the first forward (the probe);
  - a throw on the second of three forwards;
  - initial-input rejection followed by queued inputs;
  - an over-limit native terminal result after two forwards.
- *Assertions:*
  - each acknowledged Event has exactly one entry, with its original `eventId`;
  - Kernel receipts are unchanged;
  - native deliveries never exceed the `forwarded` entries.
- *Size:* B-ACK-BOUND encodes a 64-Event batch with maximal fields.

## 5. R1-04, R1-05

### R1-04 — initialized services in the hook (brief question 4)

**Cause.** `createApplication` passes the hook a partial object whose `scheduler` is `undefined`, then patches it
after constructing the Driver (`application.ts:143–148`, `:177`).

**Change.** Construction follows the dependency order:
1. the store;
2. `LineageScheduler(store)`;
3. the commit facade (§2.3);
4. the complete `services` object (`store`, `definitions`, `scheduler`, `catalog`, `models`);
5. `controllers(services)`;
6. the controller registry;
7. the Driver, which takes the scheduler and facade as options instead of building its own.

The hook sees the final scheduler object, which is the one the Harness uses. There is no placeholder and no later
substitution.

**Other constructor-time consumers, audited:**
- the Agent options' authority and memory resolvers take the complete store;
- `onChange` captures `host`, but runs only from exchange tasks, which start after construction;
- the Kernel host, the `harness` view and the preflight context are built after the Driver;
- the Harness receives its scheduler at construction.

None of them reads a member before it exists.

**Test (provenance: review 01, K14-R1-04; D01-CHK-08).** B-HOOK-SERVICES:
- inside the hook, read `services.scheduler.queuedCount()` and keep the scheduler;
- afterwards, check it is `app.services.scheduler`;
- after `start`, check the kept scheduler reports the root that native creation queued. That proves it is the
  native Runtime's scheduler, through a read only.

S-OPT-NATIVE and S-SERVICES assert inside the callback.

### R1-05 — terminal triggers and the cascade (brief question 5)

**One owner.** Every exit that ends E calls one `terminate(activation, ledger, next)`. It:
1. sets `ended`;
2. cascades every non-terminal lineage member, descendants first. The lineage is read after the step returns, so
   a child created by that step is included;
3. closes the ledger;
4. offers the Outcome.

The complete, fail and native-cancelled branches of `submit` (`driver.ts:369–377`) call it too, replacing
`cascadeDescendants`. Kernel-side ends keep the `requestCancellation` path.

| # | Trigger | Path | Late-work window and its stop | Test row |
|---|---|---|---|---|
| T1 | Kernel cancellation | `requestCancellation`: `ended`, then the cascade | Creation in progress: re-check in `createRoot`. A spawn mid-step: cascade after the step. Dispatched Effects: L-20 | Kept: B-CANCEL-PREROOT, B-CANCEL-MIDSTEP-CHILD |
| T2 | Kernel Execution-deadline fire | Kernel cancellation, then `requestCancellation` (`coordinator.ts:2249–2250`) | As T1 | New, manual clock, with a live called child |
| T3 | Wait-deadline timeout | `terminate` `wait_deadline_expired` | — | Kept (one called child) |
| T4 | Malformed accepted progress | `terminate` `native_error` | Reachable only through a Kernel defect | New, Driver-level, with a live child |
| T5 | Native root missing | `terminate` `native_session_missing` | Children found through the store's links | New, store fault, with a live child |
| T6 | Initial input rejected | `terminate` `initial_input_rejected` | No descendant can exist: the first exchange forwards before any step; the root ends | New (shared with B-ACK-EXITS) |
| T7 | Store, forward or step exception | `terminate` `native_error` | Mid-step | Kept root-only case, plus a new one with a live child |
| T8 | Value unrepresentable | `terminate` `value_unrepresentable` | Root `COMPLETED` with an over-limit result while a child is live | New |
| T9 | Root `COMPLETED` | `terminate` `complete` | A live descendant | New |
| T10 | Root `FAILED` | `terminate` `fail` | A live descendant | New |
| T11 | Root `CANCELLED` natively, no Kernel cancellation | `terminate` `native_cancelled` | A live descendant | New, Driver-level |
| T12 | The Driver's terminal Outcome refused (not a cancellation loss) | `terminate` has already ended the lineage; protocol-failure hold | E is held, not terminal; no native work | B-PROTOCOL-HOLD, plus "lineage ended" |

**Fixtures.** Each row runs through the SDK where stock controllers reach the trigger. Otherwise it runs at
Driver level with a scripted native controller, which exercises the same exit, and the report says which. Every
row asserts:
- the Kernel's terminal code;
- every lineage member terminal;
- after a later `runUntilBlocked` and a `runUntilIdle`, unchanged step-listener, handler and executor counts:
  no new native work.

**Why completion with a live descendant ends it.** Once E is terminal, the Kernel can neither accept the
descendant's input nor carry its pauses, so the descendant would be native work that nothing owns or can reach.
D01-CHK-01 (TERM-01) therefore ends the lineage at every terminal decision.

**The claim that rested on a helper.**
- Implementation report 01 said every design 02 §3 item is a maintained test, after a check that matched names
  only (`implementation-01.md:82`). For B-FAIL-CASCADE's scope ("each Driver-originated `fail`, and a root
  `COMPLETED` with a live descendant"), that claim rested on every exit routing through the shared
  `finish`/`cascadeDescendants` helpers. Only two exits had tests.
- **The new oracle** pairs the per-trigger table with one registered mutant per `terminate` call site, each of
  which submits that exit's Outcome without the cascade. Each mutant must be killed by its own row.
- The report's closure claim is corrected.

## 6. Accepted designs relied on, and the corpus

| Design | Fit? | Correction |
|---|---|---|
| D01-CHK-02 (design 02): the predicate | The predicate is fit for a state at one instant. Its premise that the reads give one was unfit | §2: validated observation, commit signal, writer census. Mechanism only; the decision table is unchanged |
| D01-CHK-01: termination | Fit; the evidence was incomplete | §5: one `terminate`, a row per trigger, mutants |
| INGRESS-01 with Q5 | Fit once the resolution is kept with the identity | §3; first submissions unchanged |
| ACK-01 / L-29 | Fit; had no single owner | §4. L-29 gains the `unknown` (`forward_failed`) entry to the accounting list. It adds no new limitation |
| D01-CHK-08: hook services | Fit; the construction order was wrong | §5, R1-04 |
| Native store port (`packages/core`) | Fit: P1–P4 hold and the in-memory store satisfies them | Unchanged; P4 and the writer census are guarded |

**New maintained items.** All carry review 01 provenance unless noted.
- **R1-01:** B-OBSERVE-PROBE, B-OBSERVE-SCHEDULES, B-QUIESCE-CELLS (extended), B-NOTIFY-NOWAKE, B-COMMIT-SIGNAL.
- **R1-01, structural guards:**
  - B-NATIVE-WRITERS pins the 25 `transact` sites by file and enclosing method. A new site fails until §2.4 is
    re-argued.
  - B-RECORD-ONEWAY pins the only writers of the P4 fields: the constructors and the `mark…` transitions in
    `pending.ts`, `confirmation-request.ts`, `child-link.ts` and `resumption.ts`.
- **R1-02:** B-INPUT-RETRY.
- **R1-03:** B-ACK-EXITS, B-ACK-BOUND.
- **R1-04:** B-HOOK-SERVICES.
- **R1-05:** B-TERM-TRIGGERS (T1–T12), and the `terminate` mutants in `mutations.json`, requalified in a fresh
  clone with the TOOLS-02 tools.

**Kept.** All of design 02's corpus stays, along with:
- the original and native conformance;
- the K14-4 inventory and K14-6 mapping;
- the binding-surface prefix check;
- the boundary controls;
- the three mutation registries, with no fault removed or weakened.

**Updated only after their checks distinguish the repaired mechanism:**
- the K14-6 kept properties for exact input retry (`interaction/event-delivery.test.ts`) and native-only waits;
- inventory rows S-INPUT, S-OPT-NATIVE and S-SERVICES;
- the report's claims.

**Cost.** The second collect at least doubles the reads of an `await` classification. The build re-runs the L-35
growth probe and records the result.

## 7. Questions

**None for the owner.** No fix needs an accepted behaviour change, a Kernel change, or a wider boundary:
- R1-02 restores Q5's exact replay without requiring a destination;
- the `unknown` ingress status reports a case that C left unreported;
- `packages/core` and the Kernel source are untouched.

**For the design check:**
1. Is the double collect over P1–P4 a sufficient validation, or does the check require the store-wide window
   that §2.6 rejects?
2. Is an explicit-then-omitted retry replaying (§3) acceptable, given that explicitness cannot be content while
   the brief keeps the omitted-then-explicit control?
3. Should `unknown` be a status of its own, or `discarded` with reason `forward_failed`? The second would claim
   no processing where the native delivery may have committed.
4. Is the B-NATIVE-WRITERS and B-RECORD-ONEWAY pair the right closure for the census, or does the check want
   the census in a different form?

## 8. Addendum after design check 03

[Design check 03](https://github.com/ArrokothI/arrokothi/blob/3e55960e0493854490ac83a420ee12295c003e82/docs/development/work/K1.4/design-check-03.md)
(Codex GPT-6, `codex/k1.4-design-check-03` at `3e55960e`, subject `270463b2`, read by commit and not merged) is
APPROVED WITH REQUIRED CHANGES D03-CHK-01..03. This section disposes each required change, the T12 clarification
and one deviation from §6. The owner directed that the build proceed with no further design check (006 routine
corrections). Where this section differs from §§2–7, it wins.

### D03-CHK-01 — notification

**Adopted.** Notification cannot change a transaction's result, and a committed wake cannot be lost.

**Facade.** `CommitSignallingStore.transact(scope, work)` returns the underlying store's own promise object. The
result and any exception reach the caller untouched, and the facade adds no read and no `await` to the
transaction. When that promise settles either way, the facade calls `signal(scope)` synchronously.

**Signal.** `signal` cannot fail:
- It resolves scope's lineage from the lineage scheduler's map of root assignments. Roots never change. The map is
  filled:
  - at `createRoot`, before native creation;
  - at every collect;
  - from each successful `enqueue` lookup.
- A scope not in the map wakes every registered waiter. That broadcast costs extra passes only.
- No fallible read sits on the notification path. So a committed change always wakes its lineage, and a
  notification failure can never pass for a rollback.

**§2.4's "stays idle"** means that no remaining writer can advance the projection. Inert tails may still run
without changing it: an invalidated resumption's late callback, or a delayed post-commit `enqueue`.

**B-COMMIT-SIGNAL tests:**
- a committed and a rolled-back transaction: the caller receives the same promise with its result or error, the
  store state matches, and the lineage is woken;
- an unknown scope across registration: the broadcast reaches the registered waiter;
- a one-shot `readExecution` failure inside `enqueue`: the facade's wake still arrives, and the open exchange
  progresses;
- lineage isolation: a known scope wakes only its own lineage;
- no unhandled rejection.

### D03-CHK-02 — the accounting oracle

**Adopted, with [owner choice 04](owner-choice-04.md).**

**Status.** `unknown` (reason `forward_failed`) remains the status of a forward that threw before its receipt.
The owner chose to amend L-29 and the managed-native-job paragraph of integration with this third case.

**Per-Event oracle**, replacing §4's aggregate assertion:

| Ledger entry | Native deliveries of that Event allowed |
|---|---|
| Forwarded | Exactly one |
| `unknown` | Zero or one |
| `discarded`, `rejected` or `ignored` | None |

Original Event IDs and Kernel receipts are kept.

**Never a second forward.**
- An `unknown` ends the exchange through `terminate` (`native_error`): no later Event in the batch is forwarded.
- The Driver keeps, per Execution, the IDs of attempted Events whose acknowledging Outcome was not accepted. If one
  arrives in a later batch, it is reported `unknown` (`already_attempted`) without forwarding.
- The set is cleared when an Outcome is accepted.

**Cases added to B-ACK-EXITS:**
- **Before commit:** a store fault aborts the delivery transaction. Zero native deliveries; `unknown`.
- **After commit:** design check 03's scheduler-read fault. One native delivery; entries `unknown, discarded`. The
  check's `chatAgent` recipe is kept as given.
- **Ledger encoding failure:** the test makes the ledger's encoder throw. The Driver submits no Outcome, the
  exchange becomes an inspectable protocol hold, the batch Events stay reserved and unacknowledged, and the lineage
  is ended.

### D03-CHK-03 — the schedule search

**Adopted.**

**Named gates.** `LegacyDriver.gate(point, executionId, detail)` returns `undefined` in production, so it adds no
`await`. Tests replace it on the prototype. The points are:
- `register`, before and after;
- `read`, before and after, with the collect (1 or 2), ordinal and record;
- `validated`;
- `submit`, before and after;
- `park`, before;
- `signal`, before the wake.

Registration and the signal are gated directly, not through a store read.

**Record.** Each requested schedule records fixture, point, phase, occurrence, and either `reached` or
`unreachable`, with its ordering reason.
- A bounded watchdog, counted in host runs and event-loop turns, limits the wait to reach a gate.
- An unreached schedule releases its settlement as a fallback and is never counted as covered.
- The test pins the expected `reached`/`unreachable` table, and reports exercised counts separately.

**Real native schedules** run through the SDK with real executor or provider settlements:
- **F1:** one member with mixed work (the probe's shape).
- **F2:** a fork whose capability branch is in flight while its called `chat` child waits for input.
- **F3:** a fork whose called child Agent has an independently settling resumption (a deferred model), beside a
  confirmation branch.
- **F4:** a fork with its own LLM-stage resumption, beside a confirmation branch.

A normal child completion settles its parent inside the same `runOnce` (`harness.ts:1150`, `:687`). That window is
recorded as structurally unreachable for a concurrent collect. B-QUIESCE-CELLS is labelled a record-model test,
apart from these.

**Post-validation windows.** At the `validated` and `submit` gates, the schedules exercise legal inert tails and
Kernel input or cancellation. An autonomous settlement there is closed by §2.4's argument, not by a release.

### T12

T12 asserts:
- a nonterminal protocol hold;
- the refused Outcome;
- no acknowledgment of the batch;
- an ended lineage.

It does not assert a Kernel terminal code. T4 and T11 stay labelled as Driver-level injected cases.

### Deviation from §6: R1-05's mutants are in-test ablations

The mutation registry's runner materializes only a case's declared repository files, with no workspace
`node_modules` (`scripts/packet_tools.py`, `run_targets`). Every target test it runs today uses relative imports
only. The bridge tests import `@arrokothi/sdk` and `@arrokothi/core`, so the registry cannot run them.

The removed-cascade mutants are therefore maintained in the test itself, as **B-TERM-ABLATION**:
- `terminate` passes its call-site label to `endLineage`.
- For each call site, the test makes `endLineage` skip only that site, then runs every T row that shares the site.
  Each row must fail.
- The table lists the rows that share each site, so no source site is invented to match a test name.

The other fixes are shown the same way where the fix is a single method: removing validation, the signal, the
retained-destination lookup, the ledger's close, or the construction order each fails a named test. Each of these
is kept in-test or listed in a retained ablation log.

`mutations.json`, `refusal-guards.json` and `value-cost.json` stay byte-identical to B.
