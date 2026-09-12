# Independent review — K0.2, round 8

## Reviewer, date, identity

- **Reviewer:** OpenAI ChatGPT, GPT-5.6 Sol, High reasoning.
- **Role:** independent reviewer. I did not implement C8/H8.
- **Review date:** 2026-09-12 (America/New_York).
- **Governing base:** `c079237ee7aff428481426f93e87a68b79f170d4`.
- **Previously reviewed H7:** `a9ea3d532c25e9074b7ce11bc102196058a6a41d` — round 7 `CHANGES REQUIRED`.
- **Round-7 review record:** `1f3a4393756dda659559f9153844240e8e5830af` (`review-07.md`).
- **Corrected clean payload C8:** `7206dbd64003d3bd32e220cf9ccefced0c9c1d4f`.
- **Reviewed candidate H8:** `c254c7faa414f9046fdab8c55a06b829529d7789`.
- **Branch reviewed:** `codex/k0.2-public-controls-e0-gate`.
- **Benchmark revision inspected read-only:** `98756f8c10bd806125da8318f1a129bc030aca61`.

This review is bound to H8 exactly. The reviewer-record commit containing this file is administrative provenance and is not part of H8.

## Access and validation limits

I reviewed through the authorized GitHub connector: exact refs/commits, A7→C8 correction delta, C8→H8 administrative delta, governing process/methods at the pinned base, the accepted K0.1 worksheet, C8 contract/specification, changed coverage/candidate/regression files, unchanged scenarios reached by the correction, implementation report, and the benchmark repository.

I had no local checkout and did not independently rerun the implementer's commands. GitHub exposes no commit status checks or workflow runs for C8 through the available connector. The report's typecheck/test/conformance/SDK/architecture/builder-doc results are therefore implementer-reported validation rather than reviewer-rerun evidence.

## Identity and correction-delta verification

The round-8 history is clean and linear:

- `1f3a4393756dda659559f9153844240e8e5830af` → C8 is one correction commit touching exactly five K0.2 contract/specification/conformance files.
- C8 → H8 is one administrative commit containing only `docs/development/007-work-packets.md` and `docs/development/work/K0.2/implementation-08.md`. No payload rides in H8.
- H8's direct parent is C8.
- Repository `main` remains `c079237ee7aff428481426f93e87a68b79f170d4`.
- Prior review records remain historical provenance.

I do **not** recommend reverting C8. Fix forward from C8.

## Round-7 finding disposition

### K02-R7-01 — accepted-deadline lifecycle ownership — **NOT FULLY CLOSED**

C8 correctly adds five useful single-field counterexamples:

- W-2 step-4 persistence: a future-deadline wait becomes `WAITING` but drops `acceptedDeadline`;
- B-7 path A: an already-due deadline retires immediately but leaves the deadline fact behind;
- B-6 path A: an already-accepted eligible Event retires the just-created wait but leaves the deadline fact behind;
- B-7 path B: current-generation expiry otherwise retires correctly but leaves the deadline fact behind; and
- W-3 stale fencing: a stale delivery clears the replacement wait's live accepted deadline while changing nothing else.

Each new transcript moves only `acceptedDeadline`, and the path-A leftover is a real narrowing of the older multi-field ordering-swap transcript. None reintroduces the round-6 physical-timer-lifetime overconstraint.

However, the requested full lifecycle re-derivation is still incomplete. The residual is recorded as K02-R8-01 below.

## Round-8 finding

### K02-R8-01 — P1 — deadline cleanup is still unowned on B-6 path B, a distinct acceptance boundary

**Affected material:** `tests/conformance/k0/scenarios.ts`, `coverage.ts`, `candidate.ts`, the C8 C7/C9 claims in `contract.md` / `public-fixture-specification.md`, and the round-8 report's claim that the deadline lifecycle is complete.

The accepted K0.1 worksheet makes B-6 path A and B-6 path B different acceptance boundaries:

- **Path A:** Outcome acceptance creates the registration, finds an already-accepted eligible Event, and immediately retires the registration/generation in that Outcome transaction.
- **Path B:** the Execution is already `WAITING`; a later eligible Event is accepted at **that Event's own acceptance boundary**, with **no Outcome**, and that boundary retires the registration/generation and creates readiness.

That distinction is material under this packet's own coverage rule. C8 says assertions split when one plausible implementation can get one writer/boundary right and another wrong. Its pre-existing R5-d1 evidence for "any eligible wake retires the registration and generation" is specifically the path-B `k0-trace` wake, while the new deadline-specific R5-d4 uses only path A.

The scenario corpus contains no B-6 path-B wake while a deadline-bearing wait is live. `k0-trace` has B-6 path B, but its wait has no deadline. The deadline-bearing waits that become durably `WAITING` (`g2` and `gd1`) end through timer expiry, not through a later eligible Event. Therefore a candidate can:

1. persist the accepted deadline correctly;
2. clear it correctly on the Outcome-acceptance path-A immediate wake;
3. clear it correctly on deadline expiry; and
4. nevertheless fail to clear it when a later eligible Event wakes a live deadline-bearing wait through path B.

That is a plausible independent bug: the path-A cleanup lives in Outcome acceptance, while path-B cleanup lives in ingress/settlement/routing Event acceptance. Such a candidate would leave `state = READY`, `liveWaitGeneration = null`, correct Event-triggered readiness and mailbox facts, but retain the old `acceptedDeadline`. C8 has no schedule from which to construct that one-field violating transcript, so the asserted "complete transition set" remains incomplete.

This is exactly the semantic-correction closure rule in 012: for alternate paths to one state, inspect **every entry boundary**. It is also the specific instruction from review-07 to re-check both retirement species and the registration-time paths and split wherever one plausible writer can get one transition right and another wrong.

**Required outcome:** add candidate-level evidence for a deadline-bearing wait that first persists durably as `WAITING`, then is ended by a later eligible Event through B-6 path B. The conforming observation must clear `acceptedDeadline`; a discriminating violating transcript must leave only that deadline fact behind while the Event/mailbox, lifecycle, generation and readiness results remain correct.

Do not substitute B-6 path A, a deadline-less path-B wake, `forbids` prose, or a corpus invariant. Preserve the existing five C8 transcripts and the implementation-neutral deadline/timer distinction. Reconcile the obligation/transcript inventory and C7/C9 claims after adding the missing boundary.

**Impact:**

- **K0.2-C6 PASS** — the unsafe controls and accepted-deadline observation remain semantically correct and implementation-neutral.
- **K0.2-C7 FAIL** — the claimed plausible-wrong transcript coverage is incomplete for a distinct accepted-deadline transition.
- **K0.2-C9 FAIL** — the assertion-granular map still omits a writer/boundary-distinguishable deadline cleanup case.

## Per-criterion verdicts

| Criterion | Verdict | Review basis |
|---|---|---|
| K0.2-C1 | **PASS** | Deterministic K0 trace remains coherent. |
| K0.2-C2 | **PASS** | Delayed-Runtime / non-blocking scenario remains coherent. |
| K0.2-C3 | **PASS** | Independent ledger / retained-reference and accepted-key-space protections remain intact. |
| K0.2-C4 | **PASS** | Direct-baseline/shared-laboratory specification remains intact. |
| K0.2-C5 | **PASS** | Both public application shapes remain prepared without claiming external gate acceptance. |
| K0.2-C6 | **PASS** | The controls still observe accepted deadlines at the semantic layer and preserve W-3 stale-timer permissiveness. |
| K0.2-C7 | **FAIL** | K02-R8-01: no plausible-wrong transcript owns deadline cleanup on B-6 path B. |
| K0.2-C8 | **FAIL — BLOCKED_EXTERNAL** | Benchmark `main` remains `98756f8c10bd806125da8318f1a129bc030aca61`; `docs/roadmap.md` still says E0–E6 are planned, not implemented. |
| K0.2-C9 | **FAIL** | K02-R8-01: the assertion-granular inventory is still incomplete across distinct B-6 acceptance boundaries. |

## External blocker

C8 remains a genuine external blocker, not an architecture ambiguity and not a reason to stop reviewing independent local fixture work.

- **Responsible actor:** benchmark repository owner.
- **Unavailable input:** accepted E0 fixture/config identities, raw observations, evaluator version and actual E0 decision at a pinned benchmark revision.
- **Unblock condition:** an accepted E0 deliverable/evidence record at a pinned benchmark revision, recordable in this repository and independently inspectable.

No E0 acceptance is claimed or inferred. K0 remains open and K1.0 remains unreleased.

## Validation evidence

The implementation report records clean-C8 validation: typecheck exit 0; `npm test` 1424/1424; conformance 1315; SDK 22; builder-docs 26 files / 280 links / 38 imports; 459 K0 tests; architecture guards 79; 12/12 real-tree scenarios refused. I inspected those claims but did **not** rerun them. The GitHub connector exposes neither combined statuses nor workflow runs for C8.

## Verdict

**CHANGES REQUIRED**

Fix forward from C8. Do not revert C8/H8. Preserve the five sound round-8 deadline transcripts and all previously closed representation/timer/atomicity corrections. Add the missing deadline-bearing B-6 path-B schedule/obligation/transcript, re-run the assertion-granular sweep, keep K0.2-C8 `BLOCKED_EXTERNAL`, and do not self-accept, merge, close K0 or release K1.0.
