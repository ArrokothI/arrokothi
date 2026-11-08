# Implementation report — K1.4, round 2

## Identity

- **Packet:** K1.4, the legacy bridge (K14-1 to K14-6; K14-G is K1.4-gate's). This round corrects the same
  packet after independent review 01. Records:
  - [review 01](https://github.com/ArrokothI/arrokothi/blob/0f415d6e016824ea9bddac0ca7aca3fd2d3accb5/docs/development/work/K1.4/review-01.md)
    and its [brief 02](https://github.com/ArrokothI/arrokothi/blob/0f415d6e016824ea9bddac0ca7aca3fd2d3accb5/docs/development/work/K1.4/review-01/brief-02.md):
    Codex GPT-6, CHANGES REQUIRED of H `072f9627791f43e4d990a6f47c3e32510cbbc011`, findings K14-R1-01..05. Read by
    commit on `codex/k1.4-review-01` at `0f415d6e016824ea9bddac0ca7aca3fd2d3accb5`; not merged.
  - [design 03](design-03.md) (`2c28d758`), which answers brief 02's five questions, and its §8 addendum
    (`c306fe38`).
  - [design check 03](https://github.com/ArrokothI/arrokothi/blob/3e55960e0493854490ac83a420ee12295c003e82/docs/development/work/K1.4/design-check-03.md):
    Codex GPT-6, APPROVED WITH REQUIRED CHANGES D03-CHK-01..03, subject `270463b2`. Read by commit on
    `codex/k1.4-design-check-03` at `3e55960e0493854490ac83a420ee12295c003e82`; not merged.
  - [owner choice 04](owner-choice-04.md): "Amend L-29 (Recommended)". The ingress accounting may report
    `unknown`.
  - Earlier records stand: [release 01](release-01.md), [brief 01](brief-01.md), designs [01](design-01.md) and
    [02](design-02.md), owner choices [01](owner-choices-01.md), [02](owner-choices-02.md) and
    [03](owner-choice-03.md), and [implementation report 01](implementation-01.md).

  Process: [006](../../006-development-process.md), [008](../../008-implementation-report.md),
  [012](../../012-review-methods.md), [017](../../017-known-limitations.md). The owner directed that this round
  build after design check 03 with no further design check (006, routine corrections).
- **Prerequisites:** K1.3 and TOOLS-02 ranges 2–4 are accepted and integrated in B.
- **Implementer:** Claude Code desktop, Claude Opus 5.5 (`claude-opus-5-5`), on the owner's Mac (arm64), from
  2026-11-07 to 2026-11-08. It has a local checkout, a shell, Node v26.10.0, Python 3.13 and `gh`, and used no
  subagents. It is not the reviewer or the design checker.
- **Branch:** `claude/k1.4`, in its own worktree.
  - Base B: `608f9ece44dbe42b78974bdac9e7ddcd33697705`. Main has not moved since.
  - Payload C: `3e4c59faa7b6138693bb9094144cafff7a33158e`. It sits on design 03 and its addendum (`c306fe38`), which
    sit on the reviewed H `072f9627`.
  - Candidate H: the commit that contains this report. Its full SHA goes in the external handoff.
  - The C..H allowlist (`administrative_files` in C's `verification.json`) is exactly:
    `docs/development/007-work-packets.md`, `docs/development/work/K1.4/implementation-02.md` and
    `docs/development/work/K1.4/progress.md`.
- **Push:** C was pushed before the CI dispatch. H is pushed after this report is committed.

## Changes and coverage

**Production** (`packages/sdk/src`; Kernel source and `packages/core/src` unchanged):
- `legacy-bridge/driver.ts`:
  - `observe` and `collect` read the lineage as the classifier's projection. An `await` is committed only
    when a second collect equals the one it was classified from; otherwise the newer collect is classified
    again (R1-01).
  - Named gates (`gate`, which returns `undefined` in production) and the progress reader (`progressOf`).
  - One `terminate` path that sets `ended`, calls `endLineage(site)`, closes the ledger and offers the
    Outcome (R1-05).
  - A per-Execution set of attempted Events, cleared when an Outcome is accepted, so an Event is never
    forwarded twice (D03-CHK-02).
  - The step loop returns `continue` only when that iteration stepped. Otherwise it waits for the in-flight
    enqueue (self-found defect 1).
- `legacy-bridge/classify.ts`: the projection types, `projectMember` and `sameObservation`. The decision table
  is unchanged.
- `legacy-bridge/commit-signal-store.ts` (new): the facade the native Runtime writes through. It forwards every
  port method. `transact` returns the store's own promise, then signals the scope synchronously.
- `legacy-bridge/lineage-scheduler.ts`: a map of learned roots, `learn`, and an infallible `signal`. An unknown
  scope wakes every waiter.
- `legacy-bridge/ledger.ts` (new): `BatchLedger`, the only source of `ingress_result` entries (R1-03).
- `application.ts`:
  - The lineage scheduler is built first, so the `controllers(services)` hook receives the complete services
    object (R1-04).
  - A keyed `input` with `destination` omitted reuses the destination the Kernel recorded for that key
    (R1-02).
  - `cancel`'s second cascade goes through `endLineage(…, "cancellation")` (self-found defect 2).

**Tests** (`packages/sdk/tests`):
- New:
  - `bridge-observe.test.ts`: B-OBSERVE-PROBE, B-OBSERVE-SCHEDULES (F1–F4, 144 schedules), the F3 structural
    row, B-OBSERVE-POSTVALIDATION, B-COMMIT-SIGNAL, B-NOTIFY-NOWAKE, B-NATIVE-WRITERS, B-RECORD-ONEWAY,
    B-HOOK-SERVICES, B-OBSERVE-ABLATION and B-NOTIFY-ABLATION.
  - `bridge-ingress.test.ts`: B-INPUT-RETRY, B-ACK-EXITS, B-ACK-ABLATION, B-ACK-BOUND and B-ACK-ONCE.
  - `bridge-terminate.test.ts`: B-TERM-TRIGGERS (T1–T11, with T6 recorded) and B-TERM-ABLATION (12 site
    ablations).
  - `bridge-rig.ts`: a Driver-level rig with the scripted native controllers from `@arrokothi/core/testing`.
- Extended:
  - `bridge-classify.test.ts`: B-QUIESCE-CELLS in the record model, with operation status and outcome,
    confirmation states, invalidated resumptions, and two operations per member.
  - `bridge-deadline-cancel.test.ts`: T12 in B-PROTOCOL-HOLD.
  - `bridge-inventory.test.ts`: S-OPT-NATIVE and S-SERVICES now read the scheduler inside the hook; S-INPUT
    covers an omitted-destination keyed retry.
- No assertion, expected result or mutant fault was relaxed. No new test imports `@arrokothi/kernel`, so the
  landing-zone quarantine list is unchanged.

**Fixtures and evidence:**
- `tests/conformance/legacy-mapping.json`:
  - three N rows and one S row for the new files;
  - the kept properties for exact input retry (`interaction/event-delivery.test.ts`, now also B-INPUT-RETRY)
    and native-only waits (`execution/controlled-interleaving.test.ts` and `multi-dependency-wait.test.ts`, now
    also B-OBSERVE-SCHEDULES).
- `tests/fixtures/packet-tools/value-cost-source-files.json`: the two new production files.
- `tests/fixtures/packet-tools/adoption.json`: the preserved table was regenerated with TOOLS-02's
  `regenerate --write` in a fresh clone, as the spec's limits declare.
  - Only the `reads` digest of 364 landing-zone members changed. They read `kernel-ownership.md`, whose
    legacy-bridge row now counts 8 files, and the trees round 2 added files to.
  - No status changed (985 unread, 263 refused, 1 superseded, 23 preserved, before and after), and no credit
    or extra moved.
- `mutations.json`, `refusal-guards.json` and `value-cost.json` are byte-identical to B.
- [`implementation-02/ablate.py`](implementation-02/ablate.py) and its log
  [`ablations.log`](implementation-02/ablations.log), run at C's tree.

**Documents:**
- [017](../../017-known-limitations.md) L-29: the third accounting case, per owner choice 04.
- [Integration](../../../../mental-model/mechanisms/integration.md): the managed-native-job paragraph, the same.
- [Quick start](../../../guides/deployment/quick-start.md): retry destination and `unknown`.
- [BASELINE](../../002-implemented-kernel-baseline.md): the bridge API paragraph.
- [kernel-ownership](../../kernel-ownership.md): the legacy-bridge zone has 8 files.
- Design 03 with its addendum, and owner choice 04.
- Implementation report 01 has a dated correction of its B-FAIL-CASCADE closure claim.

**Diff sizes:**
- Cumulative, B..C: 89 files, +11,217/−1,252.
- Round 2 alone, `072f9627`..C: 27 files, +3,313/−534. Of that, production is 6 files (+585/−131), SDK tests are
  7 files (+1,486/−2), and the regenerated adoption manifest is 378 lines replaced.

### Prior findings (review 01)

| Finding | Disposition | Evidence |
|---|---|---|
| K14-R1-01 (P1) | Fixed by mechanism: validated double collect plus the commit signal (design 03 §2, §8 D03-CHK-01) | B-OBSERVE-PROBE, the review's probe with its stack frame renamed to `LegacyDriver.collect`. B-OBSERVE-SCHEDULES: 144 real native schedules, 74 reached and 70 recorded unreachable with reasons; a non-vacuity row shows a failed validation was exercised. B-QUIESCE-CELLS record model. B-NOTIFY-NOWAKE. B-OBSERVE-ABLATION and B-NOTIFY-ABLATION |
| K14-R1-02 (P2) | Fixed: the omitted destination resolves from the Kernel's retained input entry for that key (design 03 §3) | B-INPUT-RETRY: the review's probe and its control, a later fork with several pauses, explicit-then-omitted, conflicts on every changed field, and a terminal E. Ablation log row R1-02 |
| K14-R1-03 (P2) | Fixed: `BatchLedger` owns every entry; `unknown` for a failed forward (owner choice 04); a hold when accounting cannot be encoded (design 03 §4, §8 D03-CHK-02) | B-ACK-EXITS: the review's probe, a fault before commit, design check 03's post-commit scheduler-read fault, initial rejection with queued inputs, an over-limit result after two forwards, and the accounting-encoding hold. B-ACK-ONCE. B-ACK-BOUND. B-ACK-ABLATION. Ablation log rows for R1-03 |
| K14-R1-04 (P2) | Fixed: scheduler-first construction (design 03 §5) | B-HOOK-SERVICES: the review's probe, plus the kept scheduler reporting the queued native root. S-OPT-NATIVE and S-SERVICES. Ablation log row R1-04 |
| K14-R1-05 (P2) | Fixed: a trigger table with live descendants, and in-test site ablations (design 03 §5, §8) | B-TERM-TRIGGERS T1–T11 and T12; B-TERM-ABLATION catches the removal of each site in every row that shares it |

### Design-check dispositions (design check 03)

- **D03-CHK-01:**
  - The facade returns the store's own promise, so the result or exception is untouched. The signal is
    synchronous and reads nothing. An unknown scope wakes every waiter.
  - B-COMMIT-SIGNAL covers a committed and a rolled-back transaction, a synchronously throwing store, lineage
    isolation, an unknown scope, a failing lineage read that cannot reach the signal, and no unhandled
    rejection.
- **D03-CHK-02:**
  - The per-Event oracle is `ALLOWED` in `bridge-ingress.test.ts`. An `unknown` permits 0 or 1 native
    deliveries; it ends the exchange, and B-ACK-ONCE shows it is never forwarded again.
  - The post-commit case reproduces the check's recipe: the first reply is in the native mailbox once, and the
    second is absent.
  - The accounting-encoding case forces `BatchLedger.prototype.encode` to throw. The result is a
    `protocol_failure` hold, `acknowledged: []`, no ingress entries, and an ended lineage.
- **D03-CHK-03:**
  - The gate points are `register` (before and after), `read` (before and after, per collect and ordinal),
    `validated`, `submit` (before and after), `park` and `signal`.
  - Each schedule records `reached` or `unreachable` with its ordering reason; the pinned expectation is
    `unreachableReason` in the test.
  - The watchdog is bounded by progress, not time: it stops after two quiet host slices with the exchange
    parked and S held. A fallback release disarms the gate and is never counted.
  - F1–F4 are real native settlements through the SDK, labelled apart from the record model. F3's
    same-`runOnce` window is recorded as structurally unreachable.
  - Post-validation windows exercise Kernel input (F2) and cancellation (F4) at `validated` and
    `submit.before`.
- **T12:** asserts a nonterminal hold, no result, `acknowledged: []`, and an ended lineage.

### Deviations from design 03

1. **Removed-cascade mutants are in-test ablations, not registry mutants** (addendum §8). The registry runner
   materializes only declared files, with no workspace `node_modules`, and none of its target tests import a
   workspace package. B-TERM-ABLATION patches `LegacyDriver.prototype.endLineage` to skip one site and requires
   every row that shares the site to fail. The site table is pinned in the test.
2. **A `discarded` entry carries no reason.** Design 03 §4 said it would carry the terminal code. C keeps
   round 1's shape, which an existing assertion pins, and the terminal error already carries the code.
3. **A creation Event whose initial input is `null` has no entry**, as in round 1. It carries nothing to
   forward or discard. The per-Event oracle covers every acknowledged Event that carries input.
4. **A Kernel timeout Event now has an `ignored` entry** (reason `kernel_timeout`), so every Event of a
   timed-out batch is accounted for.
5. **T8 runs on the Driver rig.** A stock parallel branch cannot emit
   (`parallel_branch_emissions_unsupported`), so no stock Workflow emits while a called child lives.
6. **T6 is recorded, not ablated.** A root's initial input is rejected natively only when the root is already
   terminal, and no descendant exists before the first step, so that site has nothing to end.

### Additional self-found defects (separate provenance)

1. **Split exchanges after the commit signal.**
   - *Found:* at build, by the existing B-RES and B-QUEUED tests.
   - *Cause:* the new signal can wake a parked exchange after a settlement's commit but before its post-commit
     `enqueue`. The round 1 rule then returned `continue`, because the exchange had stepped earlier, and split
     one resumption across two exchanges.
   - *Fix:* `continue` returns only when the current iteration stepped. A READY member that is not yet queued
     waits for its enqueue. Ablation log row "R1-01 step loop".
2. **A cascade outside the named sites.**
   - *Found:* by B-TERM-ABLATION, whose T1 row survived removal of the cancellation site.
   - *Cause:* `app.cancel` ran a second, direct `driver.cascade`.
   - *Fix:* that call is now `endLineage(…, "cancellation")`, so the site has one name.

### Not changed, and the strongest remaining risk

- **A lost native post-commit enqueue.** If the native Runtime's `enqueue` fails after a settlement committed,
  a READY member stays unqueued. The parked exchange then waits for a later lineage commit, a cancellation or
  `executionDeadline`.
  - This is a native Runtime failure path, the same at the reviewed H. With a forward it surfaces as
    `unknown` (B-ACK-EXITS); elsewhere it surfaces as L-31's open exchange.
- **Store properties the observation relies on.** The double collect relies on four properties of the native
  store port: atomic visibility, context revisions, no deletes, and one-way record states.
  - The in-memory store and the published store contract test provide the first three. B-RECORD-ONEWAY guards
    the fourth's writers, within bounds.
  - A third-party store that breaks atomic visibility is outside the port contract.
- **Cost.** Each `await` classification now reads the lineage at least twice. The L-35 growth note stands.

## Validation and interpretation

**Packet verify CI at C** with spec `docs/development/work/K1.4/verification.json`: run
[`42451451228`](https://github.com/ArrokothI/arrokothi/actions/runs/42451451228) at C
`3e4c59faa7b6138693bb9094144cafff7a33158e`: 2026-11-08, 05:36–07:22 UTC: `checks_passed`,
19/19, exit 0, Node v26.10.0, Linux x86_64. Repository tests 4,957/4,957; archive tests 4/4; example tests 18/18;
tool tests 777; typecheck; adoption `mappings_complete`; inventory `provenance_verified`; dimensions
`coverage_reported`; registered, refusal and value-cost mutants `selected_cases_passed`; refusal and oracle
censuses; Kernel sweeps; race search; value-cost dimensions and continuations; builder docs; area gate `reported`.
The job log and `run.txt` both report revision and head C.

**Local checks at C:**
- A fresh clone at C, with `npm ci` and Node v26.10.0:
  - `npm test`: 4,957/4,957, with 0 failed, cancelled, skipped or todo. This ran before the adoption manifest
    was regenerated; C differs from that run's tree only in `adoption.json`;
  - `npm run typecheck`: exit 0;
  - `regenerate` on the adoption manifest: first `table_differs` (the `reads` digests above), then
    `regenerate --write`, then `table_current` at C;
  - `corpus`: `mappings_complete` at C;
  - `inventory`: `provenance_verified`;
  - the architecture tests at C: 390/390.
- In the worktree (code identical to C):
  - the bridge suites four times concurrently, as a load check: 81/81 each;
  - `npm run check:builder-docs`: passed;
  - the value-cost source policy over the new source list: `ok`, with no violations;
  - `ablate.py`: all five rows caught (log retained).
- Review 01's probes, unchanged except for absolute import paths, at C: the control, R1-02, R1-03 and R1-04
  pass. The R1-01 probe selects the Driver's read by its old frame name `LegacyDriver.lineage`, so its window
  never opens; the maintained B-OBSERVE-PROBE renames that frame to `LegacyDriver.collect` and passes.

**Checks not run:** live-provider canaries and large-memory timing (`profiles_not_run`, owner choice 01). No E1
benchmark (K14-G is K1.4-gate's). The mutation registries were not rerun locally; CI runs them, unchanged.

**Why the evidence supports each criterion** (implementer assessment, not acceptance):
- **K14-1:** exchange behaviour now holds across asynchronous settlement (R1-01), every exit's accounting
  (R1-03) and every terminal trigger (R1-05).
- **K14-2:** a Kernel wait is committed only on a validated instant of the native store, and the writer
  census carries it through submission.
- **K14-3 and K14-5:** unchanged since review 01, which passed them. Zone attribution and the quarantine
  list still pass.
- **K14-4:** retry identity, ingress accounting and the controller services are now checked behaviourally in
  their rows.
- **K14-6:** the kept properties for exact input retry and native-only waits now name tests that distinguish
  the repaired mechanism.

**Third-party code and licences:** none. The tests use repository fixtures, `@arrokothi/core/testing` and Node
builtins.

## Handoff

Ready for independent re-review of H over C `3e4c59faa7b6138693bb9094144cafff7a33158e` and B
`608f9ece44dbe42b78974bdac9e7ddcd33697705`: Packet verify CI run [`42451451228`](https://github.com/ArrokothI/arrokothi/actions/runs/42451451228) at C reports `checks_passed`, 19/19. Cumulative review is required (brief 02). There is no
self-acceptance, and K14-G stays with K1.4-gate.
