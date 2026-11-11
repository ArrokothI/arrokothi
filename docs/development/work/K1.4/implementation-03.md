# Implementation report — K1.4, round 3

## Identity

- **Packet:** K1.4, the legacy bridge (K14-1 to K14-6; K14-G is K1.4-gate's). This round corrects the same
  packet after independent review 02, as a narrow redesign. Records:
  - [review 02](https://github.com/ArrokothI/arrokothi/blob/b655733b9b90810eca747c61b8f2095f5f201341/docs/development/work/K1.4/review-02.md)
    and its [brief 03](https://github.com/ArrokothI/arrokothi/blob/b655733b9b90810eca747c61b8f2095f5f201341/docs/development/work/K1.4/review-02/brief-03.md):
    Codex GPT-6, CHANGES REQUIRED of H `96214874577f2108a7578d1d6fcebc4af0f7173c`, findings K14-R2-01 and
    K14-R2-02. Stop-and-redesign fired. Read by commit on `codex/k1.4-review-02` at
    `b655733b9b90810eca747c61b8f2095f5f201341`, with its probes; not merged.
  - [owner choice 05](owner-choice-05.md): "(a) Narrow redesign". Only R2-01 and R2-02, with a new bounded design
    check. If review 03 finds a third CHANGES REQUIRED in this subsystem, the route becomes (d), a recorded limit.
  - [design 04](design-04.md) (`9cf57c61`), which answers brief 03's four questions, and its §6 addendum
    (`853d5ee6`).
  - [design check 04](https://github.com/ArrokothI/arrokothi/blob/dc21f8e989b0828a236d65d3988eb9ade5391af3/docs/development/work/K1.4/design-check-04.md):
    Codex GPT-6, APPROVED WITH REQUIRED CHANGES D04-CHK-01..03, subject `9cf57c61`. Read by commit on
    `codex/k1.4-design-check-04` at `dc21f8e9`, with its appendix probes (`install-design.mjs`, `attacks.mjs`);
    not merged.
  - Earlier records stand: [release 01](release-01.md), [brief 01](brief-01.md), designs [01](design-01.md),
    [02](design-02.md) and [03](design-03.md), owner choices [01](owner-choices-01.md),
    [02](owner-choices-02.md), [03](owner-choice-03.md) and [04](owner-choice-04.md), and implementation reports
    [01](implementation-01.md) and [02](implementation-02.md).

  Process: [006](../../006-development-process.md), [008](../../008-implementation-report.md),
  [012](../../012-review-methods.md), [017](../../017-known-limitations.md). The owner directed that this round
  build after design check 04 with no further design check (006, routine corrections).
- **Prerequisites:** K1.3 and TOOLS-02 ranges 2–4 are accepted and integrated in B.
- **Implementer:** Claude Code desktop, Claude Opus 5.5 (`claude-opus-5-5`), on the owner's Mac (arm64), on
  2026-11-08. It has a local checkout, a shell, Node v26.10.0, Python 3.13 and `gh`, and used no subagents. It is
  not the reviewer or the design checker.
- **Branch:** `claude/k1.4`, in its own worktree.
  - Base B: `608f9ece44dbe42b78974bdac9e7ddcd33697705`. Main has not moved since.
  - Payload C: `3e8b4bac60266fda3e277ae0dd381c4936e15ff3`. It sits on design 04's addendum (`853d5ee6`), design 04 and owner choice 05
    (`9cf57c61`), which sit on the reviewed H `96214874`.
  - Candidate H: the commit that contains this report. Its full SHA goes in the external handoff.
  - The C..H allowlist (`administrative_files` in C's `verification.json`) is exactly:
    `docs/development/007-work-packets.md`, `docs/development/work/K1.4/implementation-03.md` and
    `docs/development/work/K1.4/progress.md`.
- **Push:** C was pushed before the CI dispatch. H is pushed after this report is committed.

## Changes and coverage

**Production** (`packages/sdk/src`; Kernel source and `packages/core/src` unchanged):
- `legacy-bridge/driver.ts`:
  - `reconcile`: whenever a collect's decision is `continue`, every READY member is scheduled into E's lineage
    with no store read, whether or not a step ran or an entry is queued (R2-01, D04-CHK-01).
  - The detector: the Driver records each scheduled member's revision and claim count. A member READY again at
    that revision after a claim since then throws `UnschedulableReadyError` through the `exception` site.
  - The step loop never parks on `continue`. A `continue` with nothing queued after reconciliation is a named
    Driver failure, not a park or a spin (deviation 3).
  - `terminate` catches a failed `endLineage` and reports a protocol hold through `reportProtocolFailure` alone.
    The diagnostic names the site, the cleanup failure and the failure it was ending with. The exchange's last
    catch reports the same way if `terminate` itself rejects (D04-CHK-02).
  - `TERMINATE_SITES`: one label per cleanup call site, 16 in all. `cancellation` splits into six `cancel.*`
    labels (R2-02, design 04 §3.1).
- `legacy-bridge/lineage-scheduler.ts`: `schedule(executionId, lineage)`, which is synchronous and reads
  nothing, and `claimsOf`. `enqueue` is unchanged, so a native lookup fault still reaches its native caller.
- `application.ts`: `cancel`'s second cascade carries the label `cancel.application`.

**Tests** (`packages/sdk/tests`):
- New, `bridge-progress.test.ts` (31 tests):
  - B-ENQUEUE-LOST-CAP and B-ENQUEUE-LOST-MODEL: review 02's two probes, promoted. Each producer's settled work
    reaches its next state, with one fault, one executor or model call, no hold and no unhandled rejection.
  - B-ENQUEUE-LOST-SCHEDULES: both producers × eight named gates, each recorded reached or unreachable (§
    Validation).
  - B-RECONCILE-STARVE: design check 04's continuing-parent witness, promoted. B-RECONCILE-MANY: two settled
    children, both enqueues lost. B-RECONCILE-REVISION, which is also B-ENQUEUE-LATE: a late duplicate claim is
    dropped, and a later READY revision runs without tripping the detector.
  - B-FAULT-COLLECT and B-FAULT-ACTIVATE: one-shot faults. B-FAULT-CLEANUP: design check 04's two-fault witness,
    promoted. B-UNSCHEDULABLE and B-UNSCHEDULABLE-CLEANUP.
  - In-test ablations: B-RECONCILE-ABLATION, B-REPORT-ABLATION and B-UNSCHEDULABLE-ABLATION (the last with a
    spin guard, since the phantom store would otherwise spin in microtasks).
  - B-PRODUCER-CENSUS: the native producers derived from `packages/core/src/runtime`.
- Rewritten, `bridge-terminate.test.ts` (70 tests):
  - B-TERM-TRIGGERS: 17 rows. These are T1–T11 with T6 now executed, T13 (review 02's live-lineage accounting
    hold), and C1–C4 (root creation, late spawn, forwarding and exchange start under cancellation).
  - B-TERM-CENSUS: the source census and its nine negative controls.
  - B-TERM-ORACLE: the table's consistency, the hold-row deletion control, and one baseline per row that pins
    the labels the row reaches.
  - B-TERM-ABLATION: one test per (row, label) pair.
- Extended:
  - `bridge-rig.ts`: a store option, a start input, and deferred root creation.
  - `bridge-inventory.test.ts`: G-SLOWMODEL and G-SLOWCAP also run with one lost post-commit lookup.
- No assertion, expected result or mutant fault was relaxed. B-TERM-ABLATION's old site table is replaced by
  the source-derived census and the oracle, which cover every label the old table did. No new test imports
  `@arrokothi/kernel`.

**Fixtures and evidence:**
- `tests/conformance/legacy-mapping.json`: an N row for `bridge-progress.test.ts`, and the property of
  `bridge-terminate.test.ts` updated.
- `tests/fixtures/packet-tools/adoption.json`: unchanged. `regenerate` reports `table_current` at the trial C in
  a fresh clone.
- `mutations.json`, `refusal-guards.json` and `value-cost.json` are byte-identical to B.
- `verification.json`: the administrative file is now implementation report 03, and the limits gain round 3's
  bounded searches.
- [`implementation-03/ablate.py`](implementation-03/ablate.py) and
  [`ablations.log`](implementation-03/ablations.log): five removed-fix rows by source edit, all caught.
- [`implementation-03/review-02-probes.log`](implementation-03/review-02-probes.log) and
  [`check-04-witnesses.log`](implementation-03/check-04-witnesses.log): the review's probes and the check's
  witnesses, rerun at C.
- [`implementation-02/ablations.log`](implementation-02/ablations.log): round 2's log, committed unchanged. The
  repository ignores `*.log`, so every log here is added with `git add -f`.

**Documents:**
- Design 04 with its §6 addendum, and owner choice 05.
- [BASELINE](../../002-implemented-kernel-baseline.md): the bridge paragraph describes reconciliation, the
  detector and the cleanup-failure hold.
- Implementation report 02 has dated corrections: the retracted L-31 attribution, G-SLOWCAP and G-SLOWMODEL,
  the 11-removal count, and the uncommitted log.
- Unchanged:
  - 017 L-31, which is neither extended nor cited for this case.
  - Integration's managed-native-job paragraph, which already says a cancellation acknowledgment proves no
    process stopped.
  - kernel-ownership: no file was added to the legacy-bridge zone.

**Diff sizes:**
- Cumulative, B..C: 98 files, +13,299/−1,252.
- Round 3 alone, `96214874`..C: 19 files, +1,921/−97. The build after the addendum (`853d5ee6`..C) is 16 files:
  - production: 3 files, +122/−17;
  - SDK tests: 4 files, +1,069/−75.

### Prior findings (review 02)

| Finding | Disposition | Evidence |
|---|---|---|
| K14-R2-01 (P2) | Fixed by mechanism: the Driver owns runnable work after a native commit (design 04 §2, §6 D04-CHK-01, D04-CHK-02) | B-ENQUEUE-LOST-CAP and -MODEL (the review's probes). B-ENQUEUE-LOST-SCHEDULES. B-RECONCILE-STARVE, -MANY and -REVISION. B-PRODUCER-CENSUS. B-RECONCILE-ABLATION. Ablation log rows R2-01 and D04-CHK-01. The review's five probes pass at C |
| K14-R2-02 (P2) | Fixed: the cleanup oracle comes from the code (design 04 §3, §6 D04-CHK-03) | T13, with the review's removed-hold mutant killed in-test and by source edit (ablation log row R2-02). B-TERM-CENSUS with its negative controls. B-TERM-ORACLE and B-TERM-ABLATION over 24 pairs |

### Design-check dispositions (design check 04)

- **D04-CHK-01:**
  - `reconcile` runs on every `continue`, before the decision is returned or the loop repeats. The lineage queue
    is FIFO with one entry per Execution, so a scheduled member is claimed after at most the entries ahead of
    it.
  - The detector compares the member's own claim count, so a sibling's steps neither mask the member nor count
    as its attempt.
  - B-RECONCILE-STARVE is the check's witness, with steps counted per member and capability calls counted.
    B-RECONCILE-MANY has two READY members. B-RECONCILE-REVISION covers a dropped duplicate claim and then a
    later revision.
  - Removing reconciliation fails both review probes and the witness: in-test (B-RECONCILE-ABLATION) and by
    source edit. The idle-only rule of design 04 §2.1, restored by source edit, fails STARVE and MANY. A detector
    that fires without a claim fails them too.
- **D04-CHK-02:**
  - The reporting path is `report`, then `hold`, then `reportProtocolFailure`: Kernel only, with no native read,
    scheduling or cascade.
  - A failed cleanup leaves `ended` set and reports the lineage as stopped and its cleanup unconfirmed. It is
    never reported as clean. Nothing is acknowledged.

    > **Correction, 2026-11-11 (round 4, after [review 03](https://github.com/ArrokothI/arrokothi/blob/5e36d514fb10347a182bbeaa36879ce9074fe72a/docs/development/work/K1.4/review-03.md) K14-R3-01; [owner choice 06](owner-choice-06.md)).**
    > This holds for a cleanup call that rejects. A cascade whose native `cancelExecution` answered
    > `cancellation_pending` resolves, and `terminate` then offers the Outcome and acknowledges the batch with no
    > hold. After a native exception past READY→RUNNING the member stays RUNNING, so that cleanup *is* reported as
    > clean ([017](../../017-known-limitations.md) L-36).
  - Cancellation loss is unchanged: `offer`'s check stands, and a hold on an exchange the Kernel already
    cancelled is refused and ignored.
  - B-FAULT-COLLECT and B-FAULT-ACTIVATE are the one-shot cases. B-FAULT-CLEANUP and B-UNSCHEDULABLE-CLEANUP are
    the two-fault cases. Each asserts:
    - the Kernel disposition;
    - no later native step;
    - one model call;
    - no unhandled rejection.
  - B-REPORT-ABLATION and ablation log row D04-CHK-02 show that the report is what closes them.
- **D04-CHK-03:**
  - Every pair's disposition is executed with only that label's cascade removed. A **kill** requires a
    behavioural `AssertionError` from the row; the reach log is checked only in the baseline.
  - **Empty obligation** (T6) asserts a terminal root and no descendant at the label's entry, and that the row
    passes. T6 is executed, with its ingress (`rejected`) and failure (`initial_input_rejected`) assertions.
  - **Redundant** names the other label. That label's cascade must have run unablated and left every member
    terminal, and every member at the end of the run must have existed at that cascade's exit. The row's full
    assertions must also pass under removal.
  - The census resolves native `harness.cancelExecution` and excludes the Kernel's `coordinator.cancelExecution`.
    It fails closed on aliases, `.call`/`.apply`/`.bind`, element access, unresolved receivers, reused labels and
    non-literal labels.

    > **Correction, 2026-11-11 (round 4, after [review 03](https://github.com/ArrokothI/arrokothi/blob/5e36d514fb10347a182bbeaa36879ce9074fe72a/docs/development/work/K1.4/review-03.md) K14-R3-03; [owner choice 06](owner-choice-06.md)).**
    > "Fails closed" covers identifier aliases, `.call`/`.apply`/`.bind` on the dot name, and element access by a
    > string literal. Static template element access and quoted destructuring aliases escape, as do names computed
    > at run time ([017](../../017-known-limitations.md) L-37).
  - The negative controls cover a new unlabelled call, a new labelled site with no table entry, and the deletion
    of T13's hold row.
  - The producer census is derived from the source. It finds 14 call expressions: two Harness delegate edges
    and 12 producers, two of them reached by a swallowing tracker. Each has its error owner.

**Oracle counts:**

| Measure | Count |
|---|---|
| Baseline rows | 17 |
| Distinct labels | 16 |
| Removals, one per (row, label) pair | 24 |
| Behavioural kills | 13 |
| Executed equivalences | 11 (1 empty obligation, 10 redundant) |

- Twelve labels have a killing row.
- Four are equivalent only, each with a recorded reason: `initial-input`, `cancel.application`,
  `cancel.forward-loop` and `cancel.exchange-start`.
- These are facts about these rows and schedules. They are not a proof for every interleaving.

> **Correction, 2026-11-11 (round 4, after [review 03](https://github.com/ArrokothI/arrokothi/blob/5e36d514fb10347a182bbeaa36879ce9074fe72a/docs/development/work/K1.4/review-03.md) K14-R3-02; [owner choice 06](owner-choice-06.md)).**
> The counts were accurate; the four "equivalent only" reasons were not. Each of the three `cancel.*` reasons
> assumed that the request's cascade succeeded. One rejected request cascade distinguishes all three, so rows
> F1–F3 now kill them, and only `initial-input` (T6) is equivalent only. Round 4's counts are in implementation
> report 04.

### Deviations from design 04

1. **G-SLOWCAP and G-SLOWMODEL run the fault variant in their checks.** Design 04 §4 said each row would add the
   B-ENQUEUE-LOST test to `covers`, but `covers` names API members, not tests.
2. **B-ENQUEUE-LATE is B-RECONCILE-REVISION.** The same schedule shows the late duplicate and the later
   revision.
3. **A `continue` with nothing queued after reconciliation throws.** `UnschedulableReadyError` names the lineage
   (revision −1). With `reconcile` present it is unreachable: reconciliation queues the READY member that made
   the decision `continue`. It makes a removed or broken reconciliation fail explicitly, instead of spinning in
   microtasks where no timer could stop it. That is the owner's "explicit failure, never a park" rule, applied
   to the Driver's own invariant.
4. **C2 uses the Driver rig with a Kernel cancellation, not `app.cancel`.**
   - A cancelled parent cannot spawn, so a late child must commit after the request's cascade lists the lineage
     and before that cascade cancels the root.
   - `app.cancel`'s second cascade runs after the request's cascade finished, so it would always see such a
     child. That makes `cancel.application` equivalent only, with that reason recorded.

   > **Correction, 2026-11-11 (round 4, after [review 03](https://github.com/ArrokothI/arrokothi/blob/5e36d514fb10347a182bbeaa36879ce9074fe72a/docs/development/work/K1.4/review-03.md) K14-R3-02; [owner choice 06](owner-choice-06.md)).**
   > The rig choice stands. The conclusion does not: the argument covers a member created late, not one that an
   > earlier cascade missed because it failed. Row F1 kills `cancel.application` under one rejected request
   > cascade.
5. **The cleanup-failure hold also names the failure it was ending with.** Design 04 §6 required the site and the
   cause; the operator would otherwise lose the original failure.

### Additional self-found defects (separate provenance)

1. **A design-to-build gap in round 2.**
   - *Found:* while answering brief 03.
   - *What:* design 03 §8's B-COMMIT-SIGNAL list required that the exchange progress after a one-shot
     `readExecution` failure inside `enqueue`. Round 2 built the wake but not the progress, and implementation
     report 02 listed the loss as a residual risk under L-31.
   - *Fix:* this round's mechanism, plus the dated correction in report 02.
2. **Evidence a linked report never committed.**
   - *Found:* review 02 noted that `implementation-02/ablations.log` was missing at H.
   - *Cause:* `.gitignore` ignores `*.log`.
   - *Fix:* every log this round links is force-added, and round 2's log is committed unchanged.
3. **A test hazard: a timed-out ablation leaks its prototype patch.**
   - *Found:* at build, when C2's first form waited without bound with `cancel.request` removed. The timed-out
     test never restored `LegacyDriver.prototype.endLineage`, so the next test ran with two labels removed.
   - *Fix:* C2's wait is bounded, so every row ends under every single-label removal.

### Not changed, and the strongest remaining risk

- **A settlement whose own transaction fails** stays L-31's: the pending operation or resumption never settles,
  and nothing claims recovery.
- **A failed native cleanup** leaves native members that may still be live; only the Driver's steps stop. That is
  Trusted Execution with no containment, as before. The Kernel hold makes it visible; it is not a cleanup.
- **The detector relies on the store's atomic visibility and monotone revisions** (design 03 §2.2, P1/P2). A store
  that breaks them can make a READY member unschedulable. The Driver then fails it explicitly rather than looping.
- **Bounded searches** are declared in `verification.json`'s limits:
  - the producer and cleanup censuses are syntactic, and computed property names built at run time fall outside
    them;

  > **Correction, 2026-11-11 (round 4, after [review 03](https://github.com/ArrokothI/arrokothi/blob/5e36d514fb10347a182bbeaa36879ce9074fe72a/docs/development/work/K1.4/review-03.md) K14-R3-01 and K14-R3-03; [owner choice 06](owner-choice-06.md)).**
  > - The cleanup census also misses static template element access and quoted destructuring aliases ([017](../../017-known-limitations.md) L-37).
  > - A native exception past READY→RUNNING leaves a member RUNNING with no hold; that is not covered by "a failed
  >   native cleanup" above, because no cleanup call fails ([017](../../017-known-limitations.md) L-36).
  - the oracle is a finite row set.
- **Cost.** Reconciliation adds no store read. It walks the members of the collect it already holds.

## Validation and interpretation

**Packet verify CI at C** with spec `docs/development/work/K1.4/verification.json`: run
[`42528215484`](https://github.com/ArrokothI/arrokothi/actions/runs/42528215484) at C
`3e8b4bac60266fda3e277ae0dd381c4936e15ff3`: 2026-11-08 22:03 to 2026-11-09 00:14 UTC: `checks_passed`,
19/19, exit 0, Node v26.10.0, Linux x86_64. Repository tests 5,034/5,034; archive tests 4/4; example tests 18/18;
tool tests 777; typecheck; adoption `mappings_complete`; inventory `provenance_verified`; dimensions
`coverage_reported`; registered, refusal and value-cost mutants `selected_cases_passed`; refusal and oracle
censuses; Kernel sweeps; race search; value-cost dimensions and continuations; builder docs; area gate `reported`.
The job log and `run.txt` both report revision and head C.

**Local checks:**
- A fresh clone at C, with `npm ci` and Node v26.10.0:
  - `npm test`: 5,034/5,034, with 0 failed, cancelled, skipped or todo;
  - `npm run typecheck`: exit 0;
  - `regenerate` on the adoption manifest: `table_current`;
  - `corpus`: `mappings_complete`; `inventory`: `provenance_verified`;
  - the architecture tests: 390/390.
- In the worktree (code identical to C):
  - `npm test`: 5,034/5,034, with 0 failed, cancelled, skipped or todo;
  - `bridge-terminate.test.ts` three times in a row: 70/70 each;
  - `npm run check:builder-docs`: passed;
  - `ablate.py`: all five rows caught (log retained).
- Review 02's five probes, with only their relative imports rebound to the tree: 5/5 pass at C. These include the
  two lost-enqueue reproducers, which failed at the reviewed C.
- Design check 04's `attacks.mjs`, without its prototype installer, asserts that each defect exists. Both now fail
  at C, which means neither defect reproduces:
  - the child completes while its parent continues;
  - the two-fault case ends in a `protocol_failure` hold naming its cause.

**Checks not run:** live-provider canaries and large-memory timing (`profiles_not_run`, owner choice 01). No E1
benchmark (K14-G is K1.4-gate's). The mutation registries were not rerun locally; CI runs them, unchanged.

**Why the evidence supports each criterion** (implementer assessment, not acceptance):
- **K14-1:** settled native work now reaches its next step after a failed post-commit enqueue, for both
  producers, and while a sibling continues.
- **K14-4:** G-SLOWCAP and G-SLOWMODEL hold under the one-fault case they now run.
- **K14-6:** every cleanup call site is in the oracle, from the source. Every non-equivalent label has a
  behavioural kill, and every equivalence is executed.

  > **Correction, 2026-11-11 (round 4, after [review 03](https://github.com/ArrokothI/arrokothi/blob/5e36d514fb10347a182bbeaa36879ce9074fe72a/docs/development/work/K1.4/review-03.md) K14-R3-02 and K14-R3-03; [owner choice 06](owner-choice-06.md)).**
  > Three labels recorded as equivalent had a distinguishing row, and the census missed two static forms. Round 4
  > adds the rows and records the exclusion ([017](../../017-known-limitations.md) L-37).
- **K14-2, K14-3 and K14-5:** unchanged in mechanism since review 02, which passed them.

**Third-party code and licences:** none. The tests use repository fixtures, `@arrokothi/core/testing`, the
TypeScript compiler API already in the repository, and Node builtins.

## Handoff

Ready for independent re-review of H over C `3e8b4bac60266fda3e277ae0dd381c4936e15ff3` and B `608f9ece44dbe42b78974bdac9e7ddcd33697705`:
Packet verify CI run [`42528215484`](https://github.com/ArrokothI/arrokothi/actions/runs/42528215484) at C reports `checks_passed`, 19/19. Cumulative review is required (brief 03). Owner choice 05's fallback applies to review 03. There is
no self-acceptance, and K14-G stays with K1.4-gate.
