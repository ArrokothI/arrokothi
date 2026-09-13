# Independent review — K0.2, round 6

## Reviewer, date, identity

- **Reviewer:** OpenAI ChatGPT, GPT-5.6 Sol, High reasoning.
- **Role:** independent reviewer. I did not implement C6/H6.
- **Review date:** 2026-09-12 (America/New_York).
- **Governing base:** `c079237ee7aff428481426f93e87a68b79f170d4`.
- **Previously reviewed H5:** `053bca6c77ad37aa3f3a4816765639707b662a4d` — round 5 `CHANGES REQUIRED`.
- **Round-5 review record:** `c3fcef35c2de577edad8cebf451afad99f9c2bf7` (`review-05.md`).
- **Corrected clean payload C6:** `66dd526534bcbb737143d47c00e65e5eda9509e3`.
- **Reviewed candidate H6:** `c9798894db6f8d844cf0abcc4365c1fa30ef71fe`.
- **Branch reviewed:** `codex/k0.2-public-controls-e0-gate`.
- **Benchmark revision inspected read-only:** `98756f8c10bd806125da8318f1a129bc030aca61`.

This review is bound to H6 exactly. The reviewer-record commit that contains this file is administrative provenance and is not part of H6.

## Access and validation limits

I reviewed through the authorized GitHub connector: exact refs/commits, reviewer-A5→C6 correction delta, C6→H6 administrative delta, the accepted K0.1 worksheet, C6 contract/specification, fixture runner, scenarios, controls, interactions, coverage map, counterexample corpus, oracle-discrimination tests, implementation report and the pinned benchmark repository.

I had no local repository checkout and did not independently rerun the implementer's repository commands. GitHub exposes no status checks or workflow runs for C6 through the available connector. The report's typecheck/test/conformance/SDK/architecture/builder-doc results are therefore implementer-reported validation rather than reviewer-rerun evidence.

## Identity and correction-delta verification

The round-6 history is clean and linear:

- `c3fcef35c2de577edad8cebf451afad99f9c2bf7` → C6 is one correction commit touching 10 K0.2 contract/specification/conformance files.
- C6 → H6 is one administrative commit containing only `docs/development/007-work-packets.md` and `docs/development/work/K0.2/implementation-06.md`. No payload rides in H6.
- Repository `main` remains the governing base `c079237ee7aff428481426f93e87a68b79f170d4`.
- Prior review records remain historical provenance.

I do **not** recommend reverting C6. The separate token namespaces, R3-b split, losing-`await` schedule and narrower assertion structure are useful corrections. The finding below should be fixed forward from C6.

## Round-5 finding dispositions

### K02-R5-01 — cross-namespace receipt / Activation-ID coupling — **CLOSED**

C6 correctly scopes relational comparison by protocol token family. `runScenario` now maintains separate `receiptTokens` and `activationTokens`; `compareRepresentations` checks each family only against its own bijection.

The permanent discrimination test now exercises the missing conforming case: receipt `opaque-1` may coexist with Activation ID `opaque-1`, while collapsing two receipts or two Activation IDs inside their own family still fails. That matches ID-3/ID-9 and ID-6/ID-7 without imposing a raw-token namespace rule the worksheet never makes.

### K02-R5-02 — atomicity guard / row-7 deadline observability — **PARTIALLY CLOSED; one semantic over-constraint remains**

C6 correctly fixes the concrete R3-b defect. The conflict path is split into a recorded-rejection assertion and a separate no-merge-beside-correct-rejection assertion; the latter has a dedicated transcript that keeps `duplicate_conflict` intact while leaking only progress.

C6 also correctly adds the schedule review-05 required: the cancellation control now submits a losing `await` carrying a well-formed wait with a deadline, and wait / readiness / next-state effects are separately observable rather than inferred from one lifecycle mutation.

The `COUPLED_FIELD_GROUPS` text is materially better: it is now explicitly a heuristic rather than proof that a partial writer cannot exist, and the retained notes name concrete writer constructions. I did not find a second source-level atomicity defect comparable to round 5's R3-b issue in this pass.

However, the new deadline observation itself is not protocol-neutral. K02-R6-01 below records that remaining defect.

## Round-6 finding

### K02-R6-01 — P1 — `pendingTimers` conflates accepted deadline state with an implementation-owned timer mechanism

**Affected material:** `tests/conformance/k0/fixture.ts`, `scenarios.ts`, `candidate.ts`, `interactions.test.ts`, `coverage.ts`, `contract.md`, and `public-fixture-specification.md`.

The canonical requirement is clear and useful: CX-6 / OA-5 say a rejected losing Outcome creates **no wait, deadline, readiness or next-state transition**. Round 5 was correct that the fixture needed a losing deadline-bearing `await` and an observation capable of distinguishing a leaked deadline fact.

C6 supplies that observation as `Observation.pendingTimers`, documented as **persisted Kernel timer registrations**, and then strengthens it into a corpus invariant that persisted timers "live exactly while a deadline wait is live": no `pendingTimers` entry may exist outside `WAITING`, and every entry must name the live generation. The contract/specification similarly describe the row-7 rule as zero "persisted deadline/timer" state and the new field as a retained accepted timer registration.

That is stronger than the accepted protocol and fixes the wrong layer.

The K0.1 worksheet deliberately separates the **semantic deadline/wait state** from the **timer mechanism**:

- W-2 step 4 requires an accepted wait to persist `WAITING` with its live registration, generation **and deadline**.
- OA-4 includes any accepted wait/deadline in the atomic accepted set; OA-5/CX-6 require a rejected Outcome to create none of those accepted facts.
- W-3 explicitly anticipates a timer scheduled for an old generation arriving **after that generation has retired or been replaced** and requires it to be a stale no-op. W-2 likewise says a timer scheduled for a generation retired during registration is stale on arrival.
- W-9 expressly leaves the timer mechanism and storage layout implementation-owned.

A conforming implementation can therefore keep a scheduler/transport registration for G1 after G1's logical wait/deadline has retired, let that physical timer later fire, and reject the delivery by generation fencing. In fact W-3's deterministic stale-timer cases are written to require that late delivery to be harmless, not to require eager cancellation of the timer mechanism.

C6's global invariant would describe such a conforming design as invalid because a persisted/scheduled timer survives while the Execution is no longer `WAITING`. Conversely, requiring `pendingTimers` to disappear at retirement silently chooses an eager timer-cancellation/storage design that W-9 explicitly leaves open.

This is another over-constraint of the same general class that earlier rounds caught for rejection text, subscription spelling and token namespaces: the fixture turns an implementation-owned representation/mechanism into pass/fail behavior.

The problem is not the new losing-`await` schedule. That schedule is correct and should remain. The problem is what the observation claims to mean.

**Required outcome:** preserve the schedule and observe the canonical **accepted deadline state**, not the physical/scheduler timer mechanism. Use the smallest implementation-neutral accepted-state observation that can distinguish:

1. an accepted live wait whose deadline fact was committed;
2. a rejected losing `await`, for which no deadline fact was accepted under CX-6/OA-5; and
3. a retired wait whose accepted deadline fact is no longer live even though a physical timer scheduled earlier may still arrive later and be fenced as stale.

A representation such as an accepted wait/deadline record keyed by generation is fine if it observes Kernel semantic state rather than scheduler internals. The exact field name is not important. Do **not** require physical timer registrations to be cancelled/removed when the logical wait retires.

Reconcile every place that currently states the stronger timer-mechanism rule, especially:

- the `pendingTimers` field documentation;
- `interactions.test.ts`'s "persisted deadline timers live exactly while a deadline wait is live" invariant;
- R7-a6c and its orphaned-timer counterexample;
- R5-b4 / R5-c3 counterexamples and atomicity notes that now mention a timer remaining persisted;
- C6/C7/C9 contract text and the public specification.

Add a conforming/protocol-shape regression that makes the distinction explicit: logical accepted deadline state may be gone while a later stale timer delivery for that retired generation is still permitted and must be a no-op under W-3. The fixture need not and should not inspect whether the implementation cancelled an external timer job.

**Impact:**

- **K0.2-C6 FAIL** — the row-7 unsafe control now exercises the right deadline-bearing submission, but its deadline assertion is expressed through an implementation-owned timer-registration invariant.
- **K0.2-C7 FAIL** — the oracle can reject a conforming implementation solely for retaining a physical/scheduled stale timer after the logical wait retired.
- **K0.2-C9 FAIL** — R7-a6c's current counterexample is not yet a protocol-neutral discriminating assertion because it treats timer-registration lifetime as the canonical deadline fact.

## Per-criterion verdicts

| Criterion | Verdict | Review basis |
|---|---|---|
| K0.2-C1 | **PASS** | The deterministic K0 trace remains coherent; C6 does not weaken its accepted-input / typed-output / subscription-wait / completion path. |
| K0.2-C2 | **PASS** | The delayed-Runtime / non-blocking scenario remains coherent. |
| K0.2-C3 | **PASS** | Independent-ledger retained-reference and `"__proto__"` corrections remain intact. |
| K0.2-C4 | **PASS** | Direct-baseline/shared-laboratory specification remains intact. |
| K0.2-C5 | **PASS** | Both public application shapes remain prepared without claiming external gate acceptance. |
| K0.2-C6 | **FAIL** | The new losing-`await` schedule is good, but the deadline check pins an implementation-owned timer-registration lifetime. K02-R6-01. |
| K0.2-C7 | **FAIL** | The per-family token fix is sound, but `pendingTimers` can fail a conforming stale-timer mechanism. K02-R6-01. |
| K0.2-C8 | **FAIL — BLOCKED_EXTERNAL** | Accepted pinned E0 evidence still does not exist at the inspected benchmark revision. |
| K0.2-C9 | **FAIL** | The assertion inventory is substantially improved, but R7-a6c currently observes timer mechanism rather than the canonical accepted deadline fact. K02-R6-01. |

## External E0 blocker

The benchmark repository's `main` still points exactly to `98756f8c10bd806125da8318f1a129bc030aca61`. Its roadmap still states that E0–E6 are planned, not implemented.

K0.2-C8 therefore remains `BLOCKED_EXTERNAL`: responsible actor is the benchmark repository owner; unblock requires an accepted E0 deliverable/evidence set at a pinned benchmark revision that this repository can record and an independent reviewer can inspect. Nothing in H6 grants or infers E0 acceptance.

This is not an architecture-decision blocker. The correct overall review verdict remains `CHANGES REQUIRED`.

## Validation-evidence distinction

`implementation-06.md` reports clean-C6 validation including typecheck, 1405 tests with zero failures, 1296 conformance tests, SDK, architecture and builder-doc checks. I did not independently rerun those repository commands, and no GitHub status/workflow evidence for C6 is exposed through the available connector.

The round-6 finding is semantic and cannot be discharged by a green suite: the current tests encode the over-constraint themselves.

## Correction handoff and revert recommendation

**Fix forward from C6. Do not revert C6/H6.** K02-R5-01 is closed; preserve the separate receipt/Activation token relations. Preserve the R3-b split, the losing deadline-bearing `await`, and the useful assertion-granularity work. Replace only the timer-mechanism observation with a protocol-neutral accepted-deadline-state observation and sweep its dependent wording/tests.

Keep C8 `BLOCKED_EXTERNAL` until accepted pinned E0 evidence actually exists. Produce a newly validated clean payload and administrative candidate/report. Do not self-accept, merge, close K0 or release K1.0.

## Final outcome

H6 `c9798894db6f8d844cf0abcc4365c1fa30ef71fe` is not acceptable. C6 is a substantial improvement and should be fixed forward, not reverted, but its new `pendingTimers` observation chooses a timer-registration lifetime the accepted worksheet deliberately leaves implementation-owned. C8 also remains externally blocked.

**CHANGES REQUIRED**
