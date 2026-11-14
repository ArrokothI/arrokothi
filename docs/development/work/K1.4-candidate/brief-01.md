# Brief 01 — K1.4-candidate

Planner: the owner's Claude Code desktop session (`claude-opus-5-5`), 2026-11-14, at the owner's request
("Draft the brief"), using Prompt D. The owner chose the route on 2026-11-14: "ArrokothI adapter packet first".
The owner's answers to the decisions below will be recorded here, and a release record will release it. Written
under [006 working principle 6](../../006-development-process.md#working-principles) and
[017](../../017-known-limitations.md).

## Goal

Give the K0 public fixture a real candidate. Today every candidate in `tests/conformance/k0` is either
scripted or refuses, so the benchmark's E1 cannot judge the Kernel. This packet adds one candidate that
drives the real Kernel through its public entry and passes the fixture, at a revision E1 can pin.

## Why this packet exists

The benchmark's E1 (benchmark branch `codex/e1-kernel-acceptance-capture`, H2 `8de04779`, not merged) is
`BLOCKED_EXTERNAL`. It pins this repository's fixture at `0535160e`, and all 15 schedules come back `REFUSED`.
Its implementation report 02 names the unblock: "an ArrokothI candidate implementing the pinned fixture's
`K0Candidate` port at a pinned revision". [K1.4-gate](../../007-work-packets.md#k14-gate--k1e1-gate) waits
on E1's release, so the two packets wait on each other. K1.4's K14-6 "conformance port" ported legacy tests;
it did not implement `K0Candidate`. Nothing owns that work today.

## Facts the design starts from

- **The port is synchronous.** `CandidateRun.apply(command): Observation`
  ([fixture.ts](../../../../tests/conformance/k0/fixture.ts), "Candidate port").
- **So is the Kernel's public API.** `ExecutionCoordinator`'s `createExecution`, `submitInput`, `dispatch`,
  `redeliver`, `submitOutcome`, `requestTakeover`, `recoverExecution`, `cancelExecution`, `inspect`,
  `pendingTimers` and `fireTimer` all return a value, not a Promise. `ExecutionDriver.deliver` returns
  `undefined`. No fixture change to an async port looks needed.
- **The fixture speaks Kernel commands, not SDK calls.** Its 12 command kinds (`create`, `create_retry`,
  `accept_event`, `dispatch`, `submit_outcome`, `resubmit_outcome`, `accept_cancellation`, `deliver_timer`,
  `recover`, `takeover`, `redeliver_dispatch`, `inspect`) are coordinator operations. The laboratory plays
  the Runtime: `submit_outcome` is the Runtime's answer.
- **All 15 scenarios cite K0/K1 rules,** including `effect-refusal-and-sink-attribution` (K1 refuses an
  Effect at whole-envelope validation, EF-1/EF-2). None obviously belongs to a later packet.
- **E1 finds candidates by file and export name.** Its `src/e1/port.ts` imports `fixture.ts`, `scenarios.ts`,
  `candidate.ts` and `operation-sink.ts` from the pinned directory and binds `refusingCandidate`. A new
  candidate needs a locator E1 can pin, and E1 needs its own owner release to use it.
- **The fixture says something no longer true.** `refusingCandidate`'s reason, the `candidate.ts` header and
  the `K0Candidate` doc comment say the target Activation/Outcome protocol is unimplemented. K1.1–K1.3 built
  it. Owner decision 4.

## Build right now (expensive to change later)

| ID | Criterion (governing source) | Closes by |
|---|---|---|
| KC-1 | **The candidate drives the real Kernel.** It implements `K0Candidate` by calling only `ExecutionCoordinator`'s public methods through the `@arrokothi/kernel` package root, with a deterministic fake Driver (AGENTS.md: Kernel conformance uses deterministic fake Runtimes). Every `Observation` field comes from a Kernel result or `inspect`, never from the fixture. | Structural: an import guard (package root only, no Kernel internals) with rejected-edge controls. Deterministic: a Kernel-side ablation (for example a disabled stale-Outcome check) turns the named scenario to FAIL. |
| KC-2 | **The oracle stays blind.** `begin(scenario, sink)` receives the whole scenario, expected observations included. The candidate reads the scenario's identity and the commands handed to `apply`, never `steps[*]`'s expectations or `forbids`. | Deterministic: the candidate yields identical observations for a scenario whose expectations are deleted or altered. Structural: a guard on which scenario members the candidate module reads. |
| KC-3 | **The whole fixture passes.** All 15 scenarios return `PASS` under `runScenario` with the independent `OperationSink` bundle and its ledger assertions. A `REFUSED` scenario is not a pass; any refusal is an owner decision (stop conditions). | Deterministic: one test per scenario through the unmodified runner. |
| KC-4 | **The fixture still discriminates.** The existing oracle controls keep their verdicts: `refusingCandidate` REFUSED, `conformingCandidate` PASS, every `violatingCandidate` FAIL at its step. | Deterministic: the existing `oracle-discrimination`, `controls` and `blind-spot-regression` tests, unchanged. |
| KC-5 | **A pinnable locator.** One module path, one export name and one candidate version string that E1 can pin beside `FIXTURE_VERSION`, documented for the benchmark. The candidate refuses by name if the fixture version it loads is not the one it was built for. | Deterministic: the locator test and the version-mismatch refusal test. |
| KC-6 | **Current claims are true.** BASELINE, the fixture's prose (per decision 4), K1.4-gate's 007 text and the roadmap say what exists and what E1 still has to do. A passing in-repo run is labelled the candidate's own report, never E1 evidence. | Bounded text review of the named pages; a grep for "unimplemented" protocol claims under `tests/conformance` and `docs/development`. |

## Recorded as limits (017), not built

- **In-process only.** The candidate binds the in-process coordinator with an injected clock. No transport,
  persistence or process death; `recover` and `takeover` run against the in-memory coordinator only.
- **No SDK or legacy Driver in the verdict.** The fixture judges the Kernel. The SDK host and K1.4's legacy
  Driver stay outside it (benchmark attribution: Kernel correctness separate from Driver fidelity).
- **Not the gate.** This repository's run of the candidate is self-report. The K1/E1 gate stays with
  K1.4-gate, decided by the benchmark's independent capture.

## Known counterexamples to keep passing

- The K0.2 fixture corpus and its oracle controls (KC-4), unchanged.
- The K1.1–K1.3 Kernel corpus, COORD-REFACTOR-01's plan/apply oracle and K1.3's owner predicate (P1–P9). The
  candidate uses public coordinator entries only.
- K1.0's forbidden-edge controls, extended to the candidate's module.
- BINDING-01's canonical-bytes boundary: fixture values reach the Kernel as canonical bytes, never as live objects.

## Suspect design

1. **Tokens the fixture names, tokens the Kernel mints.** Scenarios name receipts, Activation IDs, wait
   generations and Event IDs. The runner relates expected and observed tokens per family. **Question:** which
   tokens the candidate passes through, which it reports as Kernel-minted, and how `deliver_timer` names a
   generation the Kernel minted.
2. **Observation fields `inspect` may not expose.** `terminalDispositions`, `waitEndedReadiness`, the accepted
   live deadline and `emissions` must come from Kernel state. **Question:** can each be read from public
   results and `inspect`? A missing field would need a Kernel inspection change, which is 006 work.
3. **`create` carries a definition revision; `recover` names available revisions.** **Question:** how the fake
   Driver and caller identity represent definition revisions and producer scope without fixture logic in the
   candidate.

## Questions before code

1. The mapping from each of the 12 command kinds to coordinator calls, and from Kernel results to every
   `Observation` field.
2. The fake Driver's policy: what it records at `deliver`, how the laboratory's `submit_outcome` reaches the
   delivered `SubmissionGrant`, and what its safe-replacement answer is for `takeover`.
3. How E1 loads the candidate from a checkout: the module path, how its package-root import resolves there
   (`npm ci` in the checkout), and what E1 must pin.
4. Size: one range is expected; say if not.

## Bounds

No Kernel semantic change and no new Kernel entry for the candidate's convenience: 006's architecture steps
apply if one is needed. No change to the fixture's scenarios, runner or oracle. No benchmark change: E1 round
3 (re-pin, load the new locator, capture) is the benchmark owner's separate release.

## Stop conditions

Use 006 and ask the owner if any scenario cannot pass without a Kernel change, if an `Observation` field
cannot be read from public results, or if the fixture's expectation for a scenario looks wrong. Never weaken
a scenario, skip a ledger assertion or turn a FAIL into a REFUSED to make the run pass.

## Owner decisions

1. **Packet and dependency order.**
   - **A (recommended):** a new packet `K1.4-candidate`, depending on K1.4 (integrated). K1.4-gate's
     dependencies become "K1.4-candidate accepted and integrated, and the benchmark owner's E1 release that
     pins it". The K1 milestone row adds K1.4-candidate.
   - **B:** fold the candidate into K1.4-gate. One packet, but the gate would build the candidate it is judged on.
2. **Which entry the candidate drives.**
   - **A (recommended):** the Kernel package root, `ExecutionCoordinator`, with a deterministic fake Driver.
     The fixture's commands are coordinator operations, and Kernel correctness stays separate from Driver
     fidelity. K1.4-gate's scope sentence "against K1.4's supported entry" is amended to "against the Kernel's
     public entry".
   - **B:** the SDK host. It would put the legacy Driver and the SDK in the Kernel verdict, and the fixture's
     `submit_outcome`, `takeover` and `redeliver_dispatch` have no SDK equivalent.
3. **Where the candidate lives.**
   - **A (recommended):** its own directory, `tests/conformance/k0-candidate/`, exporting `kernelCandidate`.
     The fixture's files stay the oracle; E1 pins the two directories separately.
   - **B:** add it to `tests/conformance/k0/candidate.ts`. Simpler for E1's loader, but subject and oracle
     share one file and one pin.
4. **The fixture's stale "unimplemented" prose.**
   - **A (recommended):** correct the comments and `refusingCandidate`'s reason in place. Scenarios, runner and
     oracle stay byte-identical, so `FIXTURE_VERSION` stays `/1`. E1 round 3 re-pins the digests anyway.
   - **B:** leave the bytes as K0.2 sealed them and record the gap in BASELINE.
   - **C:** correct them and bump to `/2`.
5. **Roles and lifecycle.** GPT-6 quota is low.
   - **Recommended:** a fresh Claude Opus 5.5 session implements. A design note and one design check, with no
     Prompt E (an adapter, no Kernel change). Design check and review by a session that has not worked on the
     packet and does not read the planner's notes directory: your teammate's GPT-6 or a Claude Fable 5.2
     session. A fresh session does Prompt C.
