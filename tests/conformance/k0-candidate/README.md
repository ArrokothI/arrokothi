# The real-Kernel candidate for the K0 public fixture

This directory holds one candidate for the fixture in [`../k0`](../k0): `kernelCandidate`, which drives the
target Kernel's `ExecutionCoordinator` through the `@arrokothi/kernel` package root with a deterministic fake
Driver. It exists so the benchmark's E1 can judge the Kernel instead of a scripted transcript.

It is written for the benchmark owner. **A run in this repository is the candidate's own report. It is not an
E1 result.** The K1/E1 gate belongs to packet K1.4-gate and to the benchmark's independent capture.

## Locator

| Item | Value |
|---|---|
| Module path | `tests/conformance/k0-candidate/kernel-candidate.ts` |
| Export | `kernelCandidate` (a `K0Candidate`) |
| Candidate version | `KERNEL_CANDIDATE_VERSION` = `arrokothi-k0-kernel-candidate/1` |
| Built for fixture | `FIXTURE_VERSION` = `arrokothi-k0-public-fixture/1` |
| Runtime | Node 26.10.0 or later, npm 11 |

The module imports `FIXTURE_VERSION` from `../k0/fixture.ts`. If the loaded fixture declares another version,
`begin` refuses every scenario and names both versions. Equal version strings do not prove equal bytes; the pin
below does that.

## Loading it from a checkout

1. Check out the pinned revision.
2. Run `npm ci` at the repository root. The candidate imports the bare specifier `@arrokothi/kernel`. npm's
   workspace link makes `node_modules/@arrokothi/kernel` point at `packages/kernel`, whose `exports["."]` is
   `./src/index.ts`. Node resolves the link to the real path, so TypeScript type stripping applies. `npm ci`
   installs the whole workspace, not only that link. The Kernel package itself has no dependency.
3. Do not pass `--preserve-symlinks`: Node refuses to strip types under `node_modules`.
4. Import the module by path and take `kernelCandidate`. Run it with the fixture's own `runScenario` and a fresh
   `createOperationSink()` per scenario.

## What E1 must pin and verify

Recording a commit is not verification. E1's current pin checks only the fixture directory's bytes, and it has
no loader for this locator. Before importing the candidate, E1's separately released loader must verify:

- **Identity:** the repository, the full subject revision and how it was accepted and integrated; the module
  path and export name above; `KERNEL_CANDIDATE_VERSION` and `FIXTURE_VERSION`.
- **Executed bytes:** the complete inventories and digests of `tests/conformance/k0` and
  `tests/conformance/k0-candidate`, and of every Kernel source file the import loads (`packages/kernel/src`). A
  missing, changed or unexpected file fails.
- **Resolution inputs:** the root `package.json`, `package-lock.json`, `packages/kernel/package.json`, and the
  workspace link's target and real path. Any external runtime dependency added later belongs here too.
- **Environment:** Node and npm versions and loader flags. Record a mismatch or a load failure; do not skip it.

A verified clean checkout at the revision gives the same coverage. Recompute the whole fixture inventory: the
fixture's comments changed with this candidate, and E1's existing pin already differed from this tree in three
members before that.

## Verdicts, and the exclusion E1 must predeclare

| Scenario | Steps | §11 rows | Unsafe control | Verdict |
|---|---:|---|---|---|
| `k0-trace` | 9 | 2, 3, 5, 6, 8, 10 | | PASS |
| `redelivery-acceptance` | 4 | 2 | | PASS |
| `delayed-runtime-non-blocking` | 7 | 1, 5 | | PASS |
| `identity-create-and-activation` | 10 | 1, 2, 10 | | PASS |
| `identity-producer-scope` | 12 | 1, 5 | | PASS |
| `control-whole-envelope-validation` | 10 | 2, 3, 5 | | PASS |
| `control-duplicate-conflicting-outcome` | 5 | 3 | yes | PASS |
| `control-subscription-wait-deadline` | 7 | 5 | yes | PASS |
| `control-cancel-versus-complete` | 12 | 7, 8 | yes | PASS |
| `control-completion-obligations` | 5 | 6, 8 | yes | PASS |
| `control-missing-checkpoint-code` | 6 | 5, 9 | yes | PASS |
| `effect-refusal-and-sink-attribution` | 4 | 3, 4 | | PASS |
| `control-stale-timer-and-lost-wake` | 18 | 5, 6 | yes | REFUSED |
| `wait-structure-not-satisfiability` | 8 | 5 | | REFUSED |
| `cited-decision-edges` | 25 | 1, 2, 3, 5, 7 | | REFUSED |

**Twelve PASS and three REFUSED.** A REFUSED scenario is not a pass.

The three refused schedules send `kernel_event` Events: trusted results that wake a wait through a dependency
alternative. The K1 Kernel has one ingress, application input, and no trusted non-timeout Event source
([017](../../../docs/development/017-known-limitations.md) L-21). The candidate decides this in `begin`, from each
command's kind and its Event's category only. It does not compare scenario IDs, and the refusal names the first
unsupported step.

What the refusal costs:

- **51 of the fixture's 142 steps are not run**, including one of the six unsafe controls.
- The refused schedules also hold checks that do not need a trusted Event: in `cited-decision-edges`, input
  identity scoped by destination, a stale base revision, an old exchange's changed content, and replay of an
  accepted Outcome after cancellation. Other schedules witness some of these rules. Nobody has certified that
  every excluded obligation has a replacement witness.
- A trusted ingress alone would not make all three pass. `cited-decision-edges` selects Events by identity
  before their ingress, and it expects `acknowledged` in acknowledgment order where the Kernel lists acceptance
  order.

ArrokothI's owner scoped the K1 gate to **E1's predeclared K1 matrix**: the twelve runnable schedules. The three
refused schedules belong to the K2/E2 gate. **E1 must declare that exclusion before it captures**, keep the three
refusals visible in its result, and never count them as passes or as Kernel violations.

## Conventions in this candidate that are the fixture's, not the Kernel's

The fixture compares most names literally, as if the laboratory had supplied them. The Kernel mints several of
them. The candidate translates as follows.

- **Execution IDs, wait generations, timeout Events:** a laboratory name is paired with the Kernel's ID when the
  Kernel first returns that ID in answer to the command carrying the name. Generations and timeout Events are
  paired per Execution. A pair is never overwritten. A Kernel ID with no name is reported in the Kernel's own
  spelling (`kernel-execution:…`, `kernel-generation:…`, `kernel-event:…`), so it shows as a difference.
- **Input Events:** the laboratory's Event name travels as the Event's payload, and is read back from the
  Kernel's mailbox. This also makes "same content" and "different content" mean what the fixture means.
- **The unnamed timeout Event.** `control-subscription-wait-deadline` step 6 expects `to-gd2`, a timeout the
  Kernel mints when a deadline is already due. No command names it. The candidate reports a timeout that no
  `deliver_timer` named as `to-<laboratory name of its own generation>`. This is the corpus's own spelling,
  adopted by the owner as an exception. Another schedule that spelled such an Event differently would fail.
  The root fix is a fixture revision that lets the laboratory name a wait's timeout Event.
- **`rejection`.** The fixture does not say when a reported rejection ends. The candidate reports the most recent
  Kernel refusal of a create, input or Outcome command for an Execution, and drops it when that Execution's
  `(state, activationId, writerEpoch)` changes. The classification and reason are the Kernel's words. This rule
  was fixed from two transitions in the corpus and adopted by the owner. A terminal-ingress refusal is reported
  as `ingressRefused` instead.
- **The clock.** `deliver_timer` carries no instant. The candidate's clock starts at 1 and moves only to a
  pending deadline the Kernel lists for the timer being fired. The Kernel decides whether the fire does anything.

The last three were chosen at design time by reading the corpus. The tests show the candidate does not read
expectations while it runs; they cannot show how a convention was chosen.

## What a PASS here does not show

- **`effectIntents` is a constant `[]`.** The K1 Kernel has no Effect record and its inspection has no Effect
  field. The candidate never calls the operation sink, because K1 has no Kernel-mediated operation, so an empty
  ledger says only that this assembly attempted nothing. The Effect-refusal scenarios still observe the refusal
  itself, with unchanged progress, receipt, batch, Emissions and state.
- **Bounded projections.** `waitEndedReadiness` has length 0 or 1, because the Kernel has one readiness slot.
  `recoveryHold` shows one of at most two holds, and the corpus exercises only code availability. `emissions`
  lists the Runtime's Emission keys, not the Kernel's derived Emission IDs. `acknowledged` is in acceptance
  order.
- **The fake Driver.** It reports delivery at once, answers "safe to replace" with yes because it has no native
  work, and records a cancellation request. It shows nothing about a real Driver's delivery, takeover or
  interruption.
- **In process only.** One in-memory coordinator with an injected clock. No transport, persistence or process
  death: `recover` and `takeover` run against memory.
- **No SDK and no legacy Driver.** The fixture judges the Kernel. The SDK host and K1.4's legacy bridge are
  outside this verdict.

## Files

| File | Role |
|---|---|
| `kernel-candidate.ts` | The candidate: commands to coordinator calls, Kernel answers to Observations |
| `canonical-json.ts` | A narrow canonical-JSON encoder for laboratory values; refuses what it cannot keep exactly |
| `fake-driver.ts` | The fake Driver |
| `verdicts.test.ts` | The pinned verdict of every scenario through the unmodified runner |
| `blindness.test.ts` | The candidate reads commands, never expectations |
| `boundary.test.ts` | The import guard and the locator |
| `ablations.test.ts` | Removing a Kernel decision turns its witness schedule to FAIL |
| `conventions.test.ts` | Witnesses for the conventions and limits above |
| `support.ts` | Test helpers |

Design records: `docs/development/work/K1.4-candidate/` (design 01, its addendum 01, owner choices 01 and 02).
