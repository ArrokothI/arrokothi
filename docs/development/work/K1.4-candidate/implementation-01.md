# Implementation report — K1.4-candidate, round 1

## Identity

- **Packet:** K1.4-candidate, a real-Kernel candidate for the K0 public fixture (KC-1 to KC-6). Records:
  - [release 01](release-01.md) and [brief 01](brief-01.md) with the owner's answers (2026-11-14);
  - [design 01](design-01.md), which stopped for the owner under the brief's stop conditions (S1–S4, Q1–Q7);
  - [owner choice 01](owner-choice-01.md) ("Confirm Q7"): roles;
  - design check 01, APPROVED WITH REQUIRED CHANGES D01-CHK-01..09, at
    [`e06984a9`](https://github.com/ArrokothI/arrokothi/blob/e06984a9573efd1524692ab74332eb7744941bcf/docs/development/work/K1.4-candidate/design-check-01.md)
    (Codex GPT-6, `codex/k1.4-candidate-design-check-01`), read by commit and not merged;
  - [owner choice 02](owner-choice-02.md) ("Accept check's answers", "Predeclared K1 matrix"): Q1–Q6 and the gate's
    scope. **KC-3 is now 12 PASS and 3 REFUSED, pinned exactly;**
  - [design 01 addendum 01](design-01-addendum-01.md), which disposes the nine findings and names the ablations.
    It governs where it differs from design 01.

  Process: [006](../../006-development-process.md), [008](../../008-implementation-report.md),
  [012](../../012-review-methods.md), [017](../../017-known-limitations.md).
- **Prerequisite:** K1.4 is accepted and integrated in B (`eb8472e5`, PR #67).
- **Implementer:** Claude Code desktop, Claude Fable 5.2 (`claude-fable-5-2`), on the owner's Mac (arm64),
  2026-11-14 to 2026-11-15. It has a local checkout, a shell, Node v26.10.0 (from
  `~/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin`), npm 11.19.1, Python 3 and `gh`. It used no subagents.
  It is not the planner, the design checker or the reviewer.
- **Branch:** `claude/k1.4-candidate`, in its own worktree.
  - Base B: `c1951226338de6ccd3e4e6289259549551268f61`, main after PR #69.
  - Payload C: `61ea8126507506b043ce5ba6515073f62c19c42f`.
  - No earlier review.
- **Candidate H:** the commit containing this report. C..H changes exactly the spec's administrative allowlist:
  this report, the 007 row and `progress.md`.
- **Push:** C was pushed before the CI dispatch. H is pushed after this report is committed; its SHA goes in the
  external handoff.

## Changes (B..C)

`packages/` is byte-identical to B: **no Kernel source, test or manifest changed**, and no dependency was added.

| Group | Files |
|---|---|
| **The candidate.** `kernelCandidate` implements `K0Candidate` over `ExecutionCoordinator` from the `@arrokothi/kernel` package root: the capability preflight, the twelve commands as coordinator calls, the Observation built from one `inspect` and the command's own answer, per-Execution alias tables, the `rejection` memory and the laboratory clock | `tests/conformance/k0-candidate/kernel-candidate.ts` |
| **Its two helpers.** A narrow canonical-JSON encoder that refuses what it cannot keep exactly and re-decodes every encoding; a fake Driver that records deliveries and grants and never decides | `canonical-json.ts`, `fake-driver.ts` |
| **Tests.** Verdicts (KC-3), blindness (KC-2), boundary and locator (KC-1, KC-5), ablations (KC-1), convention witnesses (D01-CHK-03, -04, -06, -07), and test helpers | `verdicts.test.ts`, `blindness.test.ts`, `boundary.test.ts`, `ablations.test.ts`, `conventions.test.ts`, `support.ts` |
| **E1 handoff.** The locator, how to load it, the pin contract of D01-CHK-08, the verdict table, the exclusion E1 must predeclare with its cost, the conventions and the limits | `tests/conformance/k0-candidate/README.md` |
| **Decision 4: the fixture's stale prose.** Comments in three files; the refusal control's reason string; the header and `describe` title of `refusal.test.ts`. `refusingCandidate`'s `name` is kept | `tests/conformance/k0/{candidate,fixture,protocol-vocabulary}.ts`, `refusal.test.ts` |
| **Guards extended.** The K1.0 guard names the three candidate files that import the Kernel package root, on existing lines (deviation 7); nine mapping rows | `tests/conformance/architecture/kernel-landing-zone.test.ts`, `tests/conformance/legacy-mapping.json` |
| **Documents.** 007 (the K1.4-candidate, K1.4-gate and K2.4 sections and rows; the K1 and K2 milestone rows), 001, the roadmap mapping, BASELINE §15, 017 L-38 to L-44 | `docs/development/{001,002,007,017}*.md`, `mental-model/roadmap.md` |
| **Layer 3.** One sentence in evidence § Attribution and gates | `mental-model/mechanisms/evidence.md` |
| **Packet records and spec.** Design 01, addendum 01, owner choices 01 and 02, `progress.md`, the verification spec | `docs/development/work/K1.4-candidate/` |

**Decision 4, checked.** With comments removed, `fixture.ts` and `protocol-vocabulary.ts` are identical to B.
`candidate.ts` differs in the two lines of the reason string, and `refusal.test.ts` in its `describe` title.
`scenarios.ts`, `operation-sink.ts`, `coverage.ts`, the cited-decision files and every other fixture test are
preserved at B by the spec. The new reason still names "target Activation/Outcome protocol", which
`refusal.test.ts` asserts. `FIXTURE_VERSION` stays `/1`.

**Ownership.** Test-side adapter code and a fake Execution Runtime behind a fake Driver. No Kernel, Runtime,
Driver or deployment semantics change.

## The result

The first real run matched design 01's prediction with the owner's answers applied: **12 PASS and 3 REFUSED**.

| Verdict | Scenarios |
|---|---|
| PASS (12; 91 steps) | `k0-trace`, `redelivery-acceptance`, `delayed-runtime-non-blocking`, `identity-create-and-activation`, `identity-producer-scope`, `control-whole-envelope-validation`, `control-duplicate-conflicting-outcome`, `control-subscription-wait-deadline`, `control-cancel-versus-complete`, `control-completion-obligations`, `control-missing-checkpoint-code`, `effect-refusal-and-sink-attribution` |
| REFUSED (3; 51 steps) | `control-stale-timer-and-lost-wake` (first unsupported step 2), `wait-structure-not-satisfiability` (step 4), `cited-decision-edges` (step 2) |

A REFUSED scenario is not a pass. This is the candidate's own report, **not an E1 result**: the benchmark has not
captured it, and the gate is K1.4-gate's.

## Why each criterion is met (implementer's assessment, not acceptance)

- **KC-1, the candidate drives the real Kernel.**
  - *Structure.* `boundary.test.ts` allows the three implementation files exactly six import specifiers: the
    package root, each other, and from the fixture types plus the `FIXTURE_VERSION` value. They import no `node:`
    module and use no dynamic `import()`, `require` or `import.meta`. Twenty rejected-edge controls cover Kernel
    source paths, a deep subpath, core, the SDK, the scenarios (value, type-only, re-export, side-effect, dynamic,
    multi-line), the scripted candidates, the coverage map, fixture values, a `node:` builtin and a test-side
    sibling. A second lexical check finds no ambient host object (`process`, `globalThis`, `eval`, `fetch`, …).
    The K1.0 guard `kernel-landing-zone.test.ts` now names the candidate's three Kernel importers.
  - *Dependence on the Kernel.* Five ablations, each on a supported schedule, each against a temporary copy of
    `packages/kernel/src` with one edit. Every one fails at the step and field addendum §A11 predicted:

    | ID | Decision removed | Schedule, step | Observed |
    |---|---|---|---|
    | ABL-1 | OA-2 replay lookup | `control-duplicate-conflicting-outcome`, 3 | `rejection`: `stale_exchange` where none is expected |
    | ABL-2 | stale-epoch check | `identity-create-and-activation`, 7 | `rejection`: `unauthorized_submission` instead of `stale_exchange` (the grant fence still holds) |
    | ABL-3 | CX-6 fence | `control-cancel-versus-complete`, 3 | `rejection`: `terminal_destination` instead of `cancellation_terminal_conflict` |
    | ABL-4 | wait-ended selection | `k0-trace`, 7 | `dispatchedBatch`: `["bq-1"]` instead of `["cont-1"]` |
    | ABL-5 | Effect refusal | `effect-refusal-and-sink-attribution`, 2 | ten fields: the Outcome is accepted |

    Each requires an exact-once anchor, a PASS on an unedited copy made the same way, a first failure at the target
    step, every listed field named, and no "candidate threw".
  - *Exception.* `effectIntents` is a constant `[]` (017 L-41, owner choice 02 Q4).
- **KC-2, the oracle stays blind.** For all 15 scenarios: a tripwire scenario on which every member but `id`,
  `steps` and each step's `command` throws gives the same verdict and the same returned observations, with zero
  forbidden reads; a run whose expectations are wrong in every field the runner does not adapt with returns the
  same observations; a renamed scenario gets the same answer. A supported schedule with one `kernel_event` (or
  `kernel_timeout`) command added is refused at that step. `begin` shown one schedule while the runner drives
  another answers for the driven one. Structurally, the candidate imports none of `scenarios.ts`, `candidate.ts`
  or `coverage.ts`, and its source reads only `scenario.id` and `scenario.steps`.
  **Limit:** the `to-<generation>` label and the `rejection` episode rule were fixed at design time from the
  corpus and adopted by the owner. No run-time test can show how they were chosen (017 L-39, L-40).
- **KC-3, the pinned verdicts.** `verdicts.test.ts` runs each scenario through the unmodified `runScenario` with
  a fresh `createOperationSink()`: twelve exact `PASS` results with their step counts, and three `REFUSED` with
  the capability reason, the first unsupported step and an empty ledger. A scenario the table does not name
  fails. The 51/91 step split is asserted.
- **KC-4, the fixture still discriminates.** `oracle-discrimination`, `controls` and `blind-spot-regression` are
  byte-identical to B and pass. `refusingCandidate` is REFUSED on all 15, `conformingCandidate` passes, every
  violating candidate fails at its step.
- **KC-5, the locator.** `tests/conformance/k0-candidate/kernel-candidate.ts`, export `kernelCandidate`, version
  `arrokothi-k0-kernel-candidate/1`. A fixture of another version is refused by name for every scenario, before
  any scenario member is read. The package root resolves to `packages/kernel/src/index.ts` by real path, and the
  Kernel has no dependency. The README states the locator, and a test keeps the two in step.
- **KC-6, current claims.** BASELINE §15, the fixture's prose, 007, 001, the roadmap mapping and 017 say what
  exists. The brief's grep, run over `tests/conformance` and `docs/development`:
  - corrected: `k0/candidate.ts` (header, reason), `k0/fixture.ts` (two comments), `k0/protocol-vocabulary.ts`
    (header), `k0/refusal.test.ts` (header, `describe` title);
  - left, with reasons: the K1.0 guard's test titles and one assertion message in `kernel-landing-zone.test.ts`
    ("the unimplemented target Kernel"), because renaming them changes test identities the adoption manifest
    catalogues; `kernel-ownership.md` line 30, which explains why the package is private; `refusingCandidate`'s
    `name`, which external captures record; 014, which the cleanup refreshes. `packages/kernel/src/index.ts` still
    says "It is not a working Kernel yet … the E1 gate are K1.4's": Kernel source is out of bounds here.
    **These are for the reviewer to weigh.**

## Design check 01 and its dispositions

Addendum 01 §A1 disposes each finding. What the build did with them:

| Finding | In the build |
|---|---|
| D01-CHK-01 | Preflight by command kind and Event category; no scenario ID compared. The 51 lost steps and boundary rows are in the README and 017 L-38. |
| D01-CHK-02 | `to-<generation>` only for an observed timeout entry with no explicit name, from that entry's own generation in its own Execution; witness with two Executions. 017 L-39 holds the root fix. |
| D01-CHK-03 | Episode key `(state, activationId, writerEpoch)` per Execution; witnesses for keep (input, inspect, redelivery), drop (takeover, cancellation, dispatch, accepted Outcome) and independence between Executions. |
| D01-CHK-04 | Deferred to the K2/E2 gate by owner choice 02. A witness pins `acknowledged` as acceptance order (`initial, older, newer`). 017 L-42. |
| D01-CHK-05 | Ledger assertions kept; `effectIntents` and the bounded projections recorded (017 L-41, L-42). |
| D01-CHK-06 | Encoder with a closed domain, golden vectors, 18 refusals and a decode-and-compare self-check; aliases keyed per Execution and never overwritten, in both directions; one rule for Kernel answers (addendum §A8), with throws tested. |
| D01-CHK-07 | Grants kept per attempt; `delivered()` at once; clock `max(now, deadline)` for the exact timer, then a fire in every case. |
| D01-CHK-08 | README pin contract. |
| D01-CHK-09 | Tripwire, altered expectations, rename and no-replay tests; the guard's scope stated; five named ablations on supported schedules. |

## Deviations and self-found defects

1. **The ablations are a maintained test, not registry cases** (addendum §A11, 017 L-44). D01-CHK-09 asked for
   the existing mutation workflow. The rows carry 012's fields (site, obligation, rejecting test), but they are
   not in `tests/fixtures/packet-tools/mutations.json`, so the registry run earns no kill from them. A reviewer or
   the owner can require registration.
2. **The ablations run in a child process.** `legacy-core-boundaries.test.ts` fails any conformance source with a
   non-literal dynamic `import()`. The edited Kernel copy's path is made at run time. I first added a named
   exception to that guard, then withdrew it: the guard is unchanged from B, and each copy is loaded in a child
   process from a generated entry file whose imports are literal. A child that cannot load or run fails the
   test; it is never counted as a kill.
3. **ABL-3's anchor** is the `CANCELLED` test together with the `#refuseLosing` line beneath it, because the
   first line alone is not unique in `coordinator.ts`. The site is the one the addendum names.
4. **Self-found, fixed before C.** The encoder accepted a member name with a lone surrogate; its own refusal test
   caught it. `String.prototype.isWellFormed` is not in the repository's TypeScript lib, so the encoder scans code
   units itself.
5. **A Layer-3 sentence beyond the brief's list.** `evidence.md` now says a gate's matrix is declared before its
   capture and a refusal stays a refusal. It states owner choice 02's gate rule where gates are defined. The
   reviewer may prefer it out.
6. **`refusal.test.ts`** is not one of KC-4's three named files. Its header and `describe` title said "the
   current tree refuses the target protocol", which decision 4 corrects. Its assertions are unchanged.
7. **Self-found, fixed before C: the guard edit shifted lines.** My first edit to
   `kernel-landing-zone.test.ts` added lines to the list of named Kernel importers. The adoption manifest's hold
   register keys on line numbers, so `corpus` in a fresh clone reported "register entries differ from the
   recomputed matches". The edit now changes two existing lines and adds none; `corpus` at the payload's tree
   reports `mappings_complete` with no regeneration. The long list line is the cost.
8. **A local flake outside this packet.** In one of two full local runs, under machine load,
   `packages/sdk/tests/bridge-observe.test.ts` B-NOTIFY-NOWAKE failed (`READY` where `RUNNING` was expected). It
   passed three times alone and in the other full run. `packages/` is byte-identical to B, so this is K1.4's
   timing-sensitive test, reported here for its owner.

## Validation

- **Packet verify (CI), at clean C:** run [`43676796376`](https://github.com/ArrokothI/arrokothi/actions/runs/43676796376),
  `packet-verify.yml`, revision `61ea8126507506b043ce5ba6515073f62c19c42f`, spec `docs/development/work/K1.4-candidate/verification.json`:
  `checks_passed`, 19 of 19 checks, exit 0, on Node v26.10.0; repository tests 5,212 of 5,212 with no failure, skip or todo. The artifact `packet-verify-61ea8126507506b043ce5ba6515073f62c19c42f` records `revision` and `head` both equal to C in `run.txt`.
- **Local, Node v26.10.0, at the working tree that became C:** `npm run typecheck` exit 0; `npm test`
  5,212 of 5,212, no skip, on the first full run (a second run under load: 5,211 of 5,212, deviation 8);
  `npm run check:builder-docs` passed (75 Markdown files, 2,347 links and anchors). The candidate's five test files: 158 tests. In a fresh clone at the
  payload's tree, `packet_tools.py corpus` reports `mappings_complete`. `packet_tools.py candidate` over B, C and
  H reports `facts_verified`.
- **Not run:** the benchmark's E1. No credentialed or live-provider profile (as in K1.4's spec).
- **Claim limits:** every verdict above is this repository's run. The three refused schedules are not evidence
  of anything about the Kernel.

## Reference maintenance

- Accepted semantic sources: owner choice 02 (the K1 gate's matrix).
- Layer 3 changed: `mechanisms/evidence.md` § Attribution and gates, one sentence. `roadmap.md` maps the gate
  scope to K1.4 and K2.4. No Layer-1 or Layer-2 change.
- Inspected and unchanged: `mechanisms/waits.md` (the source-category table already states the third category),
  `mechanisms/execution-cycle.md`, `mechanisms/identity.md`, `concepts/values.md`.
- Links in the changed pages were checked by path.

## Third-party review

None needed. No third-party code, test, asset or dependency was copied, adapted, vendored or added. The encoder
follows RFC 8785's rules as `values.md` states them and is written here.

## Handoff

- Ready for independent review by a Codex GPT-6 session that has not worked on this packet (owner choice 01).
- Strongest remaining risks: the two corpus-derived conventions (L-39, L-40); the 51 steps not run (L-38); the
  ablations' registry status (L-44).
- Base, C and H with the verified remote SHA are supplied in the external handoff.
- No self-acceptance. K1.4-gate and the benchmark's E1 round 3 remain the owner's and the benchmark owner's to
  release.
