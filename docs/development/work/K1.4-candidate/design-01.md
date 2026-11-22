# Design 01 — K1.4-candidate

Implementer: a Claude Code desktop session on Claude Fable 5.2 (`claude-fable-5-2`), 2026-11-14, assigned by the
owner (Q7: release 01 names Claude Opus 5.5). Base B `c1951226338de6ccd3e4e6289259549551268f61` (main after PR #69,
which merged [release 01](release-01.md) and [brief 01](brief-01.md) with the owner's answers). Branch
`claude/k1.4-candidate`. This note answers brief 01's three suspect designs and four questions.

**It stops for the owner.** Brief 01's stop conditions fire four times (§1). No candidate code exists and none
is written before the design check returns and the owner answers Q1–Q7.

**How the facts below were established.** By reading at B: the fixture
([fixture.ts](../../../../tests/conformance/k0/fixture.ts), [scenarios.ts](../../../../tests/conformance/k0/scenarios.ts),
[candidate.ts](../../../../tests/conformance/k0/candidate.ts),
[protocol-vocabulary.ts](../../../../tests/conformance/k0/protocol-vocabulary.ts),
[operation-sink.ts](../../../../tests/conformance/k0/operation-sink.ts)), the Kernel package
(`index.ts`, `coordinator.ts`, `driver.ts`, `plan.ts`, `inspection.ts`, `waits.ts`, `outcome.ts`, `identity.ts`,
`refusal.ts`, `time.ts`), [017](../../017-known-limitations.md), and the benchmark's `src/e1/port.ts` and
`src/e1/pin.ts` on `codex/e1-kernel-acceptance-capture`. A read-only script over `ALL_SCENARIOS` counted commands
and listed the names each expectation uses. **Nothing was run against the Kernel.** Every "passes" in §3 is a
prediction from reading. The build's first act is the real run, and any miss returns to the owner.

**Ownership.** The candidate is test-side adapter code and a fake Execution Runtime behind a fake Driver. It is
not Kernel code, and it changes no Kernel, Runtime, Driver or deployment semantics. Step numbers below are the
runner's 0-based `stepIndex`.

## 1. Stop: what cannot pass as the brief assumed

Brief 01 says "All 15 scenarios cite K0/K1 rules … None obviously belongs to a later packet." The evidence below
contradicts that for S1. S2 and S3 are fixture expectations a candidate that does not read expectations cannot
meet. S4 is one Observation field with no Kernel source.

### S1. Three scenarios need a trusted non-timeout Event source. The K1 Kernel has none.

- **Fixture.** `accept_event` carries three categories. `kernel_event` stands for "Runtime-established results,
  settlements, child results, peer messages", eligible through a dependency alternative (W-1). Eleven commands use
  it:
  - `control-stale-timer-and-lost-wake`: steps 2, 9, 12, 13 (`res-1`, `res-2`, `res-3`, `res-off`);
  - `wait-structure-not-satisfiability`: steps 4, 5 (`oth-1`, `res-9`);
  - `cited-decision-edges`: steps 2, 3, 5, 8, 9 (`wrong`, `early`, `late-eligible`, `impostor`, `match`).
- **Kernel.** `SourceCategory` is `"application_input" | "kernel_timeout"`
  ([waits.ts:83](../../../../packages/kernel/src/waits.ts)). `submitInput` is the only ingress and writes
  `application_input`. `eligible()` ends in a `never` check. The module says so: "Dependency alternatives are
  accepted, validated and retained in K1, but no live category reaches them before K2 adds trusted non-timeout
  Events (017)." [017](../../017-known-limitations.md) L-21 records the limit, with K2 as the fix.
- **Consequence.** These scenarios turn on a dependency alternative waking a wait. Sending a `kernel_event` as
  application input would not wake it (application input wakes only through a subscription), and translating
  alternatives into subscriptions would test a different rule. `cited-decision-edges` also selects by
  `eventIdentity`, a laboratory Event ID, while the Kernel mints Event IDs.
- **These three cannot pass without a Kernel change.** That change is K2's first trusted non-timeout category. It
  is outside this brief's bounds.

### S2. One expectation names a Kernel-minted Event that no command names.

`control-subscription-wait-deadline` step 6 expects `queued: ["bq-1", "to-gd2"]`. `to-gd2` is the timeout Event the
Kernel mints when a wait's deadline is already due at registration (B-7 path A). `fixture.ts` says Event IDs
"originate in the schedule and reach the candidate unchanged". For this one Event that is not true: no command
carries `to-gd2`. A `deliver_timer` command supplies the name of every other timeout in the corpus. The scripted
candidates pass because they echo the expectation. A candidate that does not read expectations cannot know the
spelling. This is the only such name in the corpus (script result: one unnamed token in 142 steps).

### S3. The corpus does not say when `rejection` ends, and its two data points pull apart.

`Observation.rejection` is "the most recent recorded create/input/Outcome rejection, if any". Nothing says what
ends it. Every transition but two fits "the rejection this command produced":

| Scenario, step | Previous step | This command | Expected `rejection` |
|---|---|---|---|
| `identity-create-and-activation` 3 | `create_retry` refused (`duplicate_conflict`) | `dispatch`, accepted | `null` |
| `control-whole-envelope-validation` 7 | `submit_outcome` refused (`malformed_envelope`) | `accept_event`, accepted | the previous step's rejection, retained |

The field comment's plainest reading (a create/input/Outcome answer replaces it) predicts the opposite at both
steps. The Kernel keeps refusals in a list with their own positions, which share no counter with receipts
(`RefusalRecord.position`), so `inspect` alone cannot order a refusal against a later acceptance. Whatever rule is
chosen needs the candidate's own run memory, and the rule itself is not written anywhere.

### S4. `effectIntents` has no Kernel source.

`ExecutionView` has no Effect field, and no K1 record type can hold an Effect intent. The candidate can only
report `[]` as a constant. KC-1 says every field comes from a Kernel result or `inspect`. The related ledger
assertions are vacuous for the same reason: K1 has no Kernel-mediated operation, so the candidate never calls
`sink.attempt`, and `ledgerCount: 0` holds by construction.

### What the brief's other suspect fields need

None of them needs a Kernel change. `terminalDispositions`, `waitEndedReadiness`, the accepted live deadline and
`emissions` are all in `ExecutionView` (§2.3).

## 2. Mechanism

One module, `tests/conformance/k0-candidate/kernel-candidate.ts`, exports `kernelCandidate: K0Candidate`. Each
`begin` builds a fresh `ExecutionCoordinator` from the `@arrokothi/kernel` package root, with a fake Driver and an
injected clock. `apply(command)` makes the coordinator calls of §2.2, then calls `inspect` once and builds the
Observation from that view and from the answer the command returned (§2.3).

Three rules hold everywhere:

1. **The Kernel decides.** The candidate never classifies, selects, deduplicates or compares content. `create`
   and `create_retry` make the same call; so do `submit_outcome` and `resubmit_outcome`.
2. **Bytes in.** Every fixture value (progress, Emission value, result, error, Effect proposal, payload, revision
   list) reaches the Kernel as canonical JSON bytes from a small local encoder (sorted keys, no whitespace). The
   Kernel validates canonical form itself, so an encoder defect is refused, not absorbed. The encoder is written
   here; no third-party code is copied and the SDK is not imported.
3. **Fail visible.** A Kernel-minted ID with no laboratory name is reported in the Kernel's own spelling, never
   as a guessed fixture name. A Kernel answer the candidate has no rule for makes `apply` throw, which the runner
   records as FAIL. The candidate never returns a REFUSED after `begin`.

### 2.1 Token families (suspect design 1)

The fixture compares three families relationally (receipt, Activation ID, writer epoch). It compares the rest
literally, as laboratory-supplied. The Kernel mints several of those.

| Family | Fixture treats it as | In the Kernel | Candidate |
|---|---|---|---|
| Receipt | relational | Kernel-minted `Receipt.token` | reports the token |
| Activation ID | relational | Kernel-minted | reports it; a submitted envelope already arrives in the candidate's spelling (`adaptCommandToCandidate`) |
| Writer epoch | relational, per exchange | Kernel-minted | reports it; same adaptation |
| Execution ID | literal, laboratory-supplied | Kernel-minted (`CreationAccepted.executionId`) | **alias**: bound from the `create` answer |
| Event ID, application input | literal | Kernel-minted (`eventId`, `initialEventId`) | **carried**: the laboratory name is the payload, read back from `inspect().mailbox` |
| Event ID, timeout | literal (`deliver_timer.timeoutEvent.eventId`) | Kernel-minted at expiry | **alias**: bound from the `fireTimer` answer's `timeoutEventId`; S2 for the one that has no command |
| Wait generation | literal string (`WaitRecord.generation`) | Kernel-minted integer | **alias**: bound from `OutcomeAccepted.wait.generation` |
| Emission ID | literal | caller-supplied `emissionKey` (the Kernel's own `emissionId` is derived) | passes it as `emissionKey`, reports `emissionKey` |
| Deadline, progress, producer, request key, definition revision, batch bound | literal | caller-supplied | passed through |

- **An alias is a pair (name in the command, ID in the Kernel's answer to that command).** It is bound only when
  the Kernel reports a new acceptance. If the Kernel's ID is already bound to another name, the earlier name is
  reported, so a collision (two producers' creates collapsing onto one Execution) is visible as a wrong
  `executionId`. Aliases are scoped to one run.
- **The payload carries the input Event's name.** A `FixtureEvent` has no payload. Its content, as the fixture
  uses it, is everything outside the identity triple: `identity-create-and-activation` step 2 retries a create
  whose initial input differs only in `eventId` and expects a content conflict. So the payload is the canonical
  bytes of `{ eventId, correlation? }`; `kind` and `subscriptionClass` go in their own Kernel fields. The Kernel
  then sees the same "same content / different content" the fixture means, and the name the candidate reports for
  a mailbox entry is data the Kernel holds.
- **`deliver_timer` names a Kernel-minted generation through its alias.** The command's `generation` resolves to
  the integer the Kernel returned when that wait registered, and the fire key is
  `{ executionId, kind: "wait_deadline", generation }`. A name the Kernel never issued a generation for makes
  `apply` throw. No corpus command does that.

### 2.2 Commands (question 1)

Callers: a producer caller `{ namespace: <producer>, scopes: [S] }` for `create`, `create_retry` and
`accept_event`; one laboratory caller with `scopes`, `controlScopes` and `cancelScopes` of `[S]` for everything
else. `S` is one constant scope. `create.producer` defaults to `initialInput.producer`.

| Command | Coordinator call |
|---|---|
| `create`, `create_retry` | `createExecution(producer, { creationKey: requestKey, scope: S, definitionRevision, runtimeContractRevision: RC, progressCodec: PC, authorityContext: bytes(null), initialInput: { kind, payload, subscriptionClass } })`. `RC` and `PC` are candidate constants. |
| `accept_event`, `application_input` | `submitInput(producer, { destination: <Kernel ID>, requestKey, kind, payload, subscriptionClass })` |
| `accept_event`, `kernel_event` | **no call exists** (S1) |
| `dispatch` | `dispatch(lab, id, { bound })` |
| `redeliver_dispatch` | `redeliver(lab, id)` |
| `submit_outcome`, `resubmit_outcome` | `submitOutcome(lab, envelope, grant)`. The envelope is the laboratory's, with values as bytes, `emissionId` as `emissionKey`, the wait without its `generation` name, and `effects` as a list of byte roots of the same length. The grant is the one the Driver received for the named attempt (§2.4). |
| `accept_cancellation` | `cancelExecution(lab, id)` |
| `deliver_timer` | clock step (§2.5), then `fireTimer({ executionId, kind: "wait_deadline", generation })` |
| `recover` | `recoverExecution(lab, id, { activationId: <from inspect>, available: { definitionRevisions: bytes(<the command's list>), runtimeContractRevisions: bytes([RC]), progressCodecs: bytes([PC]) } })` |
| `takeover` | `requestTakeover(lab, id, { activationId, writerEpoch })`, both from `inspect` |
| `inspect` | no call but the observation's |

The Execution observed after a command is the one the command addresses. For `create` and `create_retry` it is
the one the Kernel's answer or refusal names.

### 2.3 Observation fields (question 1, suspect design 2)

`view` is `inspect(lab, id)` after the command. `name()` maps a Kernel Event ID to its laboratory name (payload
for input, alias for a timeout), and `gen()` a Kernel generation to its alias.

| Field | Source |
|---|---|
| `executionId` | alias of `view.executionId` |
| `state`, `progressRevision` | `view.state`, `view.progressRevision` |
| `progress` | `view.acceptedProgress`, copied to plain JSON |
| `emissions` | `view.emissions[*].emissionKey` |
| `acknowledged`, `queued`, `terminalDispositions` | `name()` over the view's lists of the same names |
| `liveWaitGeneration` | `gen(view.wait.generation)`, or `null` |
| `waitEndedReadiness` | `[{ generation: gen(…), species }]` from `view.waitEndedReadiness`, or `[]`. The Kernel has one readiness slot, so the list has length 0 or 1. |
| `acceptedDeadline` | `view.wait?.deadline ?? null` |
| `dispatchedBatch`, `activationId`, `writerEpoch` | `view.activation`: `name()` over `batch`, `activationId`, `writerEpoch`; `null`, `null`, `0` when no exchange is open (the runner does not compare the epoch then) |
| `receipt` | the answer's `receipt.token` when this command's answer is a creation or Outcome acceptance, fresh or replayed; otherwise the newest `creation` or `outcome_acceptance` entry of `view.receipts` |
| `rejection` | the Kernel's refusal to a `create`, `create_retry`, `accept_event` or Outcome command, with its `classification` and `reason` **verbatim**. The Kernel already uses the fixture's four spellings and CX-6's exact reason (`refusal.ts`), so there is no translation table. Retention is S3. |
| `ingressRefused` | this command's Event name, when the Kernel answered this `accept_event` with `terminal_destination`; that refusal is not reported as `rejection` |
| `recoveryHold` | `{ reason }` of `view.recoveryHolds[0]`, or `null` |
| `effectIntents` | `[]`, a constant (S4) |

A refused `dispatch`, `redeliver`, `takeover`, `recover` or cancellation has no Observation field. It shows as
unchanged state, which is how the fixture's own violations model it.

### 2.4 The fake Driver (question 2, suspect design 3)

- **`deliver`** stores `{ activation, grant }` under (Execution, Activation ID, writer epoch), calls
  `settlement.delivered()` and returns `undefined`. It never submits an Outcome. The laboratory is the Runtime,
  and a Runtime that has not answered is the fixture's "delayed Runtime".
- **Submission.** `submit_outcome` presents the stored grant for the attempt the envelope names. A stale attempt
  presents its own retired grant, and the Kernel fences it. If no grant was ever delivered for the named attempt,
  the candidate presents an object that is no grant, and the Kernel decides.
- **`isSafeToReplace`** returns `true`. The fake Runtime has no native work a superseded attempt could continue,
  so replacement is safe by construction. `takeover` needs this; `false` would refuse it as `unsafe_replacement`.
- **`requestCancellation`** records the request and returns `undefined`.
- **Definition revisions.** `create` pins the command's `definitionRevision`. `recover` passes the command's list
  as the available definition revisions and always declares the candidate's own `RC` and `PC` available. The
  Kernel compares the pin; the candidate and the Driver hold no revision logic.
- **Producer scope** is the caller's `namespace`. Creation and Input identity are then the Kernel's own triples.

### 2.5 The clock

The Kernel needs an injected clock for any deadline, and `deliver_timer` carries no instant. The candidate's
clock starts at 1. Before a fire, if `pendingTimers()` lists the named generation with a deadline later than now,
the clock moves to that deadline. It never moves otherwise. A stale generation is not listed, so its fire changes
nothing. The start value is the one place where the corpus's unstated time model is fixed by the candidate:
`alreadyDueWait` (deadline 1) must be due at registration, and every other deadline (1,000 and up) must not be
(Q5).

## 3. Predicted results, by reading

With S1–S3 unresolved and `rejection` reported per command:

| Scenario | Prediction |
|---|---|
| `k0-trace`, `redelivery-acceptance`, `delayed-runtime-non-blocking`, `identity-create-and-activation`, `identity-producer-scope`, `control-duplicate-conflicting-outcome`, `control-cancel-versus-complete`, `control-completion-obligations`, `control-missing-checkpoint-code`, `effect-refusal-and-sink-attribution` | PASS (10) |
| `control-whole-envelope-validation` | FAIL at step 7 only (S3) |
| `control-subscription-wait-deadline` | FAIL at step 6 only (S2) |
| `control-stale-timer-and-lost-wake`, `wait-structure-not-satisfiability`, `cited-decision-edges` | cannot run past their first `kernel_event` (S1) |

With the recommended answers to Q1–Q3: 12 PASS and 3 REFUSED by name.

## 4. Why each criterion closes

- **KC-1.** Structural: a source guard over the candidate directory allows exactly these import specifiers:
  `@arrokothi/kernel`, sibling files, `node:` builtins, and from `../k0/` only types plus `FIXTURE_VERSION`. Its
  controls are rejected edges: a Kernel source path, a deep package subpath, `@arrokothi/core`, `@arrokothi/sdk`,
  `../k0/scenarios.ts`, `../k0/candidate.ts`, and dynamic `import()`. K1.0's forbidden-edge table gains the
  directory. Deterministic: the candidate factory takes the coordinator constructor as a parameter (default: the
  package root's). The ablation test copies `packages/kernel/src` to a temporary directory, applies one textual
  change that must match exactly once, loads that copy and runs the named scenario through the unmodified runner.
  One ablation per decision family, at least five: Outcome replay lookup, stale-epoch check, the CX-6 fence,
  wait-ended batch selection and Effect refusal. Each must turn its named step to FAIL. S4 is the exception to
  "every field" and needs the owner (Q4).
- **KC-2.** Structural: the candidate never imports `scenarios.ts`, `candidate.ts` or `coverage.ts`, so the only
  path to an expectation is the `begin` argument. Deterministic: a wrapper hands `begin` a scenario whose every
  member but `id` (and, under Q1 option a, `steps[*].command`) throws when read; the run must finish with the
  same observations. A second run through the unmodified runner replaces every expected field the runner does not
  need for adaptation with other values, and deletes `forbids` and `ledgerCount`; the observations the candidate
  returns must be identical to the first run's. S2 option b and S3 option b put corpus conventions in the
  candidate at design time. These checks cannot see that, which is why both are owner decisions.
- **KC-3.** One test per scenario through `runScenario` with `createOperationSink()`. The expected verdict set is
  whatever the owner's answers to Q1–Q3 make it; the test pins it exactly, so a REFUSED or FAIL can never read as
  a pass.
- **KC-4.** `oracle-discrimination`, `controls` and `blind-spot-regression` are not edited. Decision 4 changes
  `refusingCandidate`'s reason text and comments only; its `name` stays, since E1 records it.
- **KC-5.** §5.
- **KC-6.** A bounded text pass over BASELINE, the fixture's prose, 007's K1.4-gate text and the roadmap, plus the
  brief's grep. New 017 entries: the brief's three limits, and whichever of S1–S4 the owner records as limits.

## 5. The locator (question 3, KC-5)

- **Module:** `tests/conformance/k0-candidate/kernel-candidate.ts`. **Export:** `kernelCandidate`.
  **Version:** exported `KERNEL_CANDIDATE_VERSION = "arrokothi-k0-kernel-candidate/1"`.
- **Fixture binding.** The module imports `FIXTURE_VERSION` from `../k0/fixture.ts`. If it is not the version the
  candidate was built for (`arrokothi-k0-public-fixture/1`), `begin` returns a refusal that names both versions.
  The test builds the candidate through its factory with another version.
- **Resolution in a checkout.** The candidate imports the bare specifier `@arrokothi/kernel`. After `npm ci` at the
  checkout root, npm's workspace link makes `node_modules/@arrokothi/kernel` point at `packages/kernel`, whose
  `exports["."]` is `./src/index.ts`. Node resolves the link to the real path, so type stripping applies (it is
  refused for files under `node_modules`; `--preserve-symlinks` would break this). The Kernel package has no
  dependencies, so `npm ci` adds only the link. This is how `packages/sdk` already imports the package root.
- **What E1 must pin:** the repository and commit; the fixture directory's digests again (decision 4 changes
  bytes in `candidate.ts` and `fixture.ts`); the candidate directory's digests; the module path and export name;
  `KERNEL_CANDIDATE_VERSION` and `FIXTURE_VERSION`; and the subject itself, `packages/kernel/src`, by digest or
  by the commit. Its loader must run `npm ci` in the checkout first. A `README.md` in the candidate directory
  states this for the benchmark. No benchmark file changes here.

## 6. Accepted designs relied on

| Design | Fit for this purpose? |
|---|---|
| The fixture's literal comparison of Event IDs, Execution IDs and wait generations | Fit with the alias and payload rules of §2.1, except S2. Root fix for S2: a fixture revision that lets the laboratory name a wait's timeout Event. Owner (Q2). |
| `Observation.rejection`'s definition | Not fit: incomplete (S3). Root fix: state the rule in the fixture. Owner (Q3). |
| K1.3's L-21 (no trusted non-timeout category before K2) | Fit for K1.3. It makes three fixture scenarios K2's (S1). Owner (Q1). |
| `ExecutionView` without an Effect field | Fit for K1. It leaves `effectIntents` without a source (S4). Owner (Q4). |
| The coordinator's public API and the fake-Driver pattern of the Kernel's own tests | Fit. No new Kernel entry is needed for the 12 runnable scenarios. |

## 7. Corpus

Kept passing, unedited: the K0.2 fixture corpus and its oracle controls (810 tests at B); the K1.1–K1.3 Kernel
corpus, COORD-REFACTOR-01's plan/apply oracle and K1.3's owner predicate; K1.0's forbidden-edge controls;
BINDING-01's byte boundary (§2 rule 2). Added: the per-scenario verdict tests, the import-guard controls, the
expectation tripwire and altered-expectation runs, the version-mismatch refusal, and the ablations. Each new test
file is declared in `tests/conformance/legacy-mapping.json`.

Baseline at B in this worktree: `npm run typecheck` exit 0; `tests/conformance/k0/*.test.ts` 810 of 810. The
local Node is v25.2.1, below the repository floor of 26.10.0, so this is informational. Packet verify in CI at
the first C is the baseline of record.

## 8. Size (question 4)

One range, if the owner's answers need no fixture or Kernel change. About 450 lines of candidate (adapter,
encoder, fake Driver), about 600 lines of tests, and the text pass of KC-6. A fixture revision (Q2 a, Q3 a) or a
trusted-Event ingress (Q1 c) is not in this packet's bounds and would be its own release.

## 9. Questions

**Q1 (S1). Three scenarios need a Kernel surface K2 owns.**
- **a (recommended).** The candidate refuses them by name. `begin` scans the scenario's commands (never its
  expectations) and refuses when one has no Kernel surface, citing L-21. KC-3 becomes "12 PASS, 3 REFUSED, pinned
  exactly", and KC-2 allows `begin` to read `steps[*].command`. A 017 entry records it. Whether E1's declared
  scope accepts three REFUSED is the benchmark owner's decision and K1.4-gate's.
- b. Run them and let `apply` throw at the first `kernel_event`: three FAILs whose cause is a missing K2 surface,
  not a wrong answer.
- c. Add a trusted non-timeout ingress to the Kernel now. A Kernel semantic change: 006's architecture steps and
  a new release.
- d. Move the three scenarios to a later fixture set. A fixture change, outside this brief.

**Q2 (S2). The unnamed timeout Event `to-gd2`.**
- a. Revise the fixture so the laboratory names a wait's timeout Event (for example an optional member on
  `WaitRecord`). The root fix; a vocabulary change, so `FIXTURE_VERSION` /2, outside this brief.
- **b (recommended, with a.'s fix recorded in 017 for the next fixture revision).** A timeout Event that no
  `deliver_timer` named is reported as `to-<name of its generation>`, the corpus's own helper convention. The
  generation comes from the Kernel's mailbox entry, so a timeout minted for the wrong generation still shows.
  The prefix is fixture spelling held in the candidate.
- c. Report the Kernel's spelling and accept one FAIL at step 6 that is not a Kernel defect.

**Q3 (S3). When `rejection` ends.**
- a. Per command: the rejection this command produced, else `null`. No run memory. `control-whole-envelope-validation`
  step 7 then FAILs until the fixture's expectation is corrected, which is outside this brief.
- **b (recommended).** Retained for the Execution's current lifecycle episode: a rejection stays reported until a
  command changes that Execution's lifecycle state or open Activation. This fits the field comment and every
  rejection transition in the corpus, and needs run memory of the previous state. It is inferred from two data points; the rule
  would be written into the `rejection` comment in `fixture.ts` (comment only, like decision 4) and the README.
- c. The owner states a different rule.

**Q4 (S4).** Record as limits in 017 that `effectIntents` is a constant `[]` and the ledger assertions are
vacuous until K2 gives the Kernel an Effect record and a mediated operation (recommended)? Or add an always-empty
field to `ExecutionView` now, which is a Kernel inspection change?

**Q5.** Confirm the clock convention of §2.5 (start at 1; move only to a listed pending deadline at a fire).

**Q6.** Confirm that the Driver reports `delivered()` at once and answers `isSafeToReplace` with `true` (§2.4).

**Q7. Roles.** Release 01 names "a fresh Claude Opus 5.5 session" as implementer. The owner assigned this
session, which runs Claude Fable 5.2. Confirm, and note the consequence for decision 5: a Claude Fable 5.2
reviewer would share the implementer's model, so it must at least be a different session that has not worked on
this packet. This session's context was loaded with the index of the owner's Claude notes directory; it read no
planner note file.
