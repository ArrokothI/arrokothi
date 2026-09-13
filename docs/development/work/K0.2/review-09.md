# Independent review — K0.2, round 9

## Reviewer, date, identity

- **Reviewer:** OpenAI ChatGPT, GPT-5.6 Sol, High reasoning.
- **Role:** independent reviewer. I did not implement C9/H9.
- **Review date:** 2026-09-12 (America/New_York).
- **Governing base:** `c079237ee7aff428481426f93e87a68b79f170d4`.
- **Previously reviewed H8:** `c254c7faa414f9046fdab8c55a06b829529d7789` — round 8 `CHANGES REQUIRED`.
- **Round-8 review record:** `adb2b7791f674c9a7e4c988010bda60f60a15804` (`review-08.md`).
- **Corrected clean payload C9:** `bba23e3c67c918510d480bc2a5df000c1d275159`.
- **Reviewed candidate H9:** `80f2c887600bd2d611a7ef120d443fe6efbcb2d8`.
- **Branch reviewed:** `codex/k0.2-public-controls-e0-gate`.
- **Benchmark revision inspected read-only:** `98756f8c10bd806125da8318f1a129bc030aca61`.

This review is bound to H9 exactly. The reviewer-record commit containing this file is administrative provenance and is not part of H9.

## Access and validation limits

I reviewed through the authorized GitHub connector: exact refs/commits, A8→C9 correction delta, C9→H9 administrative delta, cumulative base→C9 file inventory, the governing process/methods at the pinned base, the accepted K0.1 worksheet, C9 contract/specification, changed scenario/coverage/candidate/regression files, the round-9 report, prior review findings reached by the correction, and the benchmark repository.

I had no local checkout and did not independently rerun the implementer's commands. GitHub exposes no commit status checks or workflow runs for C9 through the available connector. The report's typecheck/test/conformance/SDK/architecture/builder-doc results are therefore implementer-reported validation rather than reviewer-rerun evidence.

## Identity and correction-delta verification

The round-9 history is clean and linear:

- `adb2b7791f674c9a7e4c988010bda60f60a15804` → C9 is one correction commit touching exactly six K0.2 contract/specification/conformance files.
- C9 → H9 is one administrative commit containing only `docs/development/007-work-packets.md` and `docs/development/work/K0.2/implementation-09.md`. No payload rides in H9.
- H9's direct parent is C9.
- Repository `main` remains `c079237ee7aff428481426f93e87a68b79f170d4`.
- The cumulative base→C9 inventory contains the same K0.2 fixture/document family plus the round-9 corrections; prior review records remain historical provenance.

I do **not** recommend reverting C9. Fix forward from C9.

## Round-8 finding disposition

### K02-R8-01 — deadline cleanup unowned on B-6 path B — **CLOSED**

C9 adds the missing boundary cleanly.

`control-stale-timer-and-lost-wake` now first parks `g3` durably as `WAITING` with `acceptedDeadline = 3000`, after W-2 step 1 has acknowledged the Outcome's own batch and no eligible Event remains. A later `accept_event` for `res-3` then exercises B-6 path B at the Event's own acceptance boundary, with no Outcome in the transaction: the conforming observation is `READY`, the live generation is retired, Event-triggered readiness is created, `res-3` stays queued and unacknowledged, progress/acknowledgment do not advance, and `acceptedDeadline` returns to null.

New obligation R5-d6 owns that exact transition. Its violating transcript changes only `acceptedDeadline`, leaving `3000` behind while every other path-B result is correct. R5-d4 is narrowed to B-6 path A / Outcome acceptance. The regression block pins the parked-then-woken schedule and the `submit_outcome` versus `accept_event` boundary distinction. This closes the writer/boundary gap identified in review-08 without reintroducing any physical timer-lifetime requirement.

## Round-9 finding

### K02-R9-01 — P1 — OA-5 deadline inertness on malformed rejected Outcomes is visible but still unattributed

**Affected material:** `tests/conformance/k0/candidate.ts`, `coverage.ts`, `control-whole-envelope-validation` in `scenarios.ts`, C7/C9 claims in `contract.md` / `public-fixture-specification.md`, and implementation-09 §2's deliberate exclusion.

C9's boundary sweep explicitly notices one remaining deadline transition and declines to own it: `control-whole-envelope-validation` step 4 submits a structurally empty `await` carrying deadline `5000`; the candidate is correctly rejected as `malformed_envelope`, the Execution stays `RUNNING`, no live wait exists, and the complete observation therefore has `acceptedDeadline = null`.

The report says this need not have its own deadline counterexample because §11 writes an explicit zero-deadline clause only in row 7. That reading is too narrow. The accepted worksheet's governing rule OA-5 says a **rejected Outcome**, including a malformed envelope, creates no Effects, acknowledges no Events, commits no progress, accepts no emissions and creates **no wait/deadline/readiness/next-state transition**. §11 row 3 cites OA-1–OA-6 and summarizes the same invariant as a failure partway through acceptance leaving **zero partial state**; the parenthetical examples (`progress`, `Effect intent`, `acknowledgment`) do not turn OA-5's explicit deadline prohibition into permission to leak one.

The existing W-1 counterexample at this step does not cover that partial failure. `envelope/structurally-empty-wait-registered-because-it-has-a-deadline` turns the malformed submission into an accepted `WAITING` registration: it changes lifecycle/generation and removes the rejection. A different candidate can get the rejection itself right and still parse/store the supplied deadline too early, leaving only `acceptedDeadline = 5000` beside the correct rejection and otherwise unchanged state.

R7-a6c cannot honestly stand in for this case. It exercises the CX-6 cancellation/terminal-conflict fence on a losing Outcome. Malformed-envelope validation is an OA-3/OA-5 rejection path with a different writer/boundary. C9's own correction correctly established that two different writers reaching the same accepted-deadline state are independently distinguishable when one can be right and the other wrong. The same test applies here.

This is the same visible-but-unattributed class as the round-4 and round-7 findings: the complete observation would incidentally reject a leaked deadline, but C7/C9 require an assertion-owned plausible-wrong transcript rather than relying on incidental structural mismatch, `forbids` prose, or a neighbouring rejection path.

**Required outcome:** at the existing malformed deadline-bearing wait step, add candidate-level evidence for a candidate that preserves the correct `malformed_envelope` rejection, keeps `RUNNING`, leaves `liveWaitGeneration = null`, preserves the pinned Activation/batch and all other accepted facts, but leaks only `acceptedDeadline = 5000`. Map that fact to the governing OA-5/§11 row-3 zero-partial-state obligation (or an honestly equivalent shared entry if the implementation can prove identity of the writer, which the current cancellation evidence does not).

Do not add a new schedule merely for this finding: the schedule and complete observation already exist. Do not broaden the correction into unrelated cancellation-of-idle-WAITING behavior; this finding is specifically the malformed rejected Outcome already in the corpus. Preserve R5-d6 and all six accepted-deadline lifecycle/writer corrections.

**Impact:**

- **K0.2-C6 PASS** — the unsafe controls and semantic accepted-deadline observation remain correct and implementation-neutral.
- **K0.2-C7 FAIL** — one independently plausible wrong rejected-Outcome behavior still lacks its own candidate transcript.
- **K0.2-C9 FAIL** — the assertion-granular coverage map omits an OA-5 partial-state assertion already observable at an existing boundary.

## Per-criterion verdicts

| Criterion | Verdict | Review basis |
|---|---|---|
| K0.2-C1 | **PASS** | Deterministic K0 trace remains coherent. |
| K0.2-C2 | **PASS** | Delayed-Runtime / non-blocking scenario remains coherent. |
| K0.2-C3 | **PASS** | Independent ledger / retained-reference and accepted-key-space protections remain intact. |
| K0.2-C4 | **PASS** | Direct-baseline/shared-laboratory specification remains intact. |
| K0.2-C5 | **PASS** | Both public application shapes remain prepared without claiming external gate acceptance. |
| K0.2-C6 | **PASS** | Controls remain semantically correct; C9 closes the B-6 path-B deadline writer gap without timer-mechanism coupling. |
| K0.2-C7 | **FAIL** | K02-R9-01: no assertion-owned transcript covers a correct malformed rejection that leaks only the accepted deadline. |
| K0.2-C8 | **FAIL — BLOCKED_EXTERNAL** | Benchmark `main` remains `98756f8c10bd806125da8318f1a129bc030aca61`; `docs/roadmap.md` still says E0–E6 are planned, not implemented. |
| K0.2-C9 | **FAIL** | K02-R9-01: the assertion-granular inventory still omits one OA-5 partial-state fact at an existing boundary. |

## External blocker

C8 remains a genuine external blocker, not an architecture ambiguity and not a reason to stop reviewing independent local fixture work.

- **Responsible actor:** benchmark repository owner.
- **Unavailable input:** accepted E0 fixture/config identities, raw observations, evaluator version and actual E0 decision at a pinned benchmark revision.
- **Unblock condition:** an accepted E0 deliverable/evidence record at a pinned benchmark revision, recordable in this repository and independently inspectable.

No E0 acceptance is claimed or inferred. K0 remains open and K1.0 remains unreleased.

## Validation evidence

The implementation report records clean-C9 validation: typecheck exit 0; `npm test` 1431/1431; conformance 1322; SDK 22; builder-docs 26 files / 280 links / 38 imports; 466 K0 tests; architecture guards 79; 12/12 real-tree scenarios refused. I inspected those claims but did **not** rerun them. The GitHub connector exposes neither combined statuses nor workflow runs for C9.

## Verdict

**CHANGES REQUIRED**

Fix forward from C9. Do not revert C9/H9. Preserve K02-R8-01's g3/res-3 B-6 path-B correction, all prior accepted-deadline single-field transcripts, the per-family token relations, the R3-b and cancellation splits, and the implementation-neutral timer/deadline distinction. Add the one missing malformed-rejection deadline-leak transcript/coverage entry, reconcile counts and C7/C9 claims, rerun clean-payload validation, and produce the next administrative candidate/report.

Keep C8 `BLOCKED_EXTERNAL`. Do not self-accept, merge, close K0, or release K1.0.
