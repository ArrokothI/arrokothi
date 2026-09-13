# Implementation report — K0.2, round 1

## Identity

- **Packet / parent:** K0.2 — public controls and the K0/E0 gate; parent milestone K0.
- **Contract:** [`contract.md`](contract.md), revision 1, at C below.
- **Governing process baseline:** `c079237ee7aff428481426f93e87a68b79f170d4` — integrated `main`,
  including the accepted and integrated [post-K0.1 process review](../K0.1-process-review/integration-01.md).
- **State: `BLOCKED_EXTERNAL`.** Criteria K0.2-C1 through C7 are complete and independently
  reviewable. K0.2-C8 ("obtain pinned E0 evidence") cannot be satisfied from this repository. 006
  states that unavailable required evidence "becomes `BLOCKED_EXTERNAL`, not review-ready", so
  **this attempt is not offered as review-ready in whole**. See §5.
- **Owner release:** explicit owner instruction, 2026-09-11. Provenance in §1.
- **Prerequisite:** K0.1 ACCEPTED at H12 `bab7bf6635781e6d2f9b0e8e333f58440ae0b047`
  ([review-12.md](../K0.1/review-12.md)), integrated as `42731300266eea00a9a24d867d5e82d9887c280d`
  ([receipt](../K0.1/integration-01.md)). Both prerequisites for entry are met.
- **Branch:** `codex/k0.2-public-controls-e0-gate`. **Configured remote:** `origin`
  `https://github.com/ArrokothI/Agent_SDK.git`, unchanged; the owner's current name for the hosted
  repository is `ArrokothI/arrokothi`.
- **Base commit:** `c079237ee7aff428481426f93e87a68b79f170d4`.
- **Clean payload C:** `9aa70a82f02d57b2658e0906af53dc31bc34e483`. Final validation ran on this tree.
- **Candidate H:** the commit containing this report. Its full SHA is supplied in the external handoff.
- **Exact C..H administrative allowlist:** `docs/development/work/K0.2/implementation-01.md` (this
  file) and the K0.2 row in `docs/development/007-work-packets.md`. No payload, script, fixture,
  threshold or configuration change rides in H.
- **Previous reviewed H / review:** none. This is round 1 of a fresh attempt; see §1 on the
  withdrawn predecessor, which was never reviewed and holds no acceptance.
- **Working tree:** clean at C and at H.
- **Push:** a report written before H exists cannot certify its own push. The verified advertised
  remote SHA is supplied in the external handoff after pushing.

## 1. Owner release provenance and predecessor disclosure

**Release.** Entering this session the ledger recorded `next_release: none` with an explicit owner
hold on K0.2, carried identically in both integration receipts. [009](../../009-universal-prompts.md)
states that "an ambiguous or absent release requires clarification; merely pasting Prompt A does not
release K0.2 or any other successor", so the launcher was treated as insufficient. The repository
state was reported back to the owner together with two facts that bear on the decision: that a prior
K0.2 attempt existed on a since-deleted remote branch, and that the benchmark repository is unchanged
at `98756f8c`, so the E0 clause would block again. The owner then released K0.2 explicitly, selecting
implementation **as written** over a scope amendment, and a **fresh** implementation over recovering
the withdrawn attempt. Corrections on a released packet need no renewed permission; a successor still
does.

**Predecessor.** A withdrawn attempt existed on a remote branch of the same conventional name, tip
`48da596`, based on `42731300`. The owner deleted it; `main` carries no K0.2 record, report or status
from it. During the repository-state survey exactly two things about it were observed: the file list
and line counts from `git diff --stat`, and the ledger row text it had written. **Its payload contents
were not read, and nothing here is copied or adapted from it.** Convergence on the directory
`tests/conformance/k0/` follows from the existing `tests/conformance/*/*.test.ts` globs in `npm test`
and `npm run test:conformance`, which make that the one location a new conformance family runs from
without a script change. A reviewer with access to the deleted branch should expect independent work
that solves the same forced problem, not a reproduction, and is invited to check that directly.

## 2. Changes and coverage

**Change groups.** All sixteen files are new; **no existing file is modified**, which is why the
full cumulative diff `c079237..9aa70a8` is 3,222 insertions and 0 deletions. Existing consumer
behavior is preserved trivially rather than by argument.

| Group | Files | Ownership |
|---|---|---|
| Target-protocol vocabulary | `protocol-vocabulary.ts` | Kernel semantics, restated from the accepted worksheet |
| Scenario model, candidate port, runner | `fixture.ts` | fixture machinery, no protocol logic |
| The scenario set | `scenarios.ts` | the fixture proper |
| Independent sink | `operation-sink.ts` | laboratory observation |
| Candidates and violating transcripts | `candidate.ts` | oracle validation |
| Boundary coverage map | `coverage.ts` | K0 exit accounting |
| Tests | 8 `*.test.ts` files | assertions over the above |
| Packet records | `contract.md`, `public-fixture-specification.md` | development records |

**Design decision worth a reviewer's attention.** The fixture imports nothing from `@arrokothi/*`.
It describes the *target* protocol, which the 0.8.x packages do not implement; importing the current
`ExecutionWait`/`ControllerProgress` vocabulary would bake the legacy shapes
[013](../../013-structure-and-evidence-sequencing.md) identifies as the coupling problem into the
oracle that exists to judge their replacement. The cost is that the vocabulary is a second statement
of rules the worksheet already owns, so it can drift; §4 records how that risk is contained and
`rule-agreement.test.ts` is the control for it.

**Selected 012 methods:** normative decisions; deterministic execution; external evidence/gate;
process/documentation. **Materially excluded:** race-and-fault (no persistence or process-death claim
is made — orderings are scheduled data, and actual process death is E4/K3); native Runtime/Driver (no
Driver exists at K0; the missing-checkpoint control asserts the Kernel-side PC-4/PC-5 refusal only);
packaging/release (S1 owns it; nothing is exported).

### Obligation and interaction coverage

| Obligation / source | Input or schedule, including the negative case | Expected facts and forbidden changes | Location and result |
|---|---|---|---|
| C1 — 001's K0 trace (W-8 cases 1–5) | create → retried create → dispatch → arrival during RUNNING → typed output + subscription-only wait → unrelated input while WAITING → subscribed input → dispatch at bound **1** → complete | READY at creation; retry changes nothing; pinned batch unaffected by later arrivals; WAITING on g1; unrelated input inert, unacknowledged, retained; wake retires g1 without acknowledging; bound-1 batch is `[cont-1]`; completion acknowledges only its batch and disposes `bq-1`/`bq-2` under B-5 | `scenarios.ts` `k0Trace`; `k0-trace.test.ts` (15 tests) — PASS |
| C1 negative | a candidate selecting the older backlog at bound 1; a candidate acknowledging via one global cursor | both must FAIL, naming `dispatchedBatch` / `acknowledged`+`terminalDispositions` | `candidate.ts` violations 1–2; `oracle-discrimination.test.ts` — PASS |
| C2 — delayed Runtime (001 K0, 001 K1, W-4) | X dispatched and never answers; Y created, dispatched and completed; X re-inspected | Y reaches RUNNING then COMPLETED; X stays RUNNING with `liveWaitGeneration` null throughout; X byte-identical before and after Y's activity | `delayed-runtime.test.ts` (8 tests) — PASS |
| C3 — independent ledger (001 K0) | attempts through the sink; snapshot mutation attempts; unscripted operation | candidate surface has only `attempt`; entries frozen and ordered; unscripted settles `unknown`, never `failure`; logical ID distinct from physical sequence | `operation-sink.test.ts` (7 tests) — PASS |
| C3 negative | a candidate reporting refusal while having called the sink | must FAIL, attributed to the independent ledger and not to self-report | `candidate.ts` violation 10 — PASS |
| C4 — direct baseline (001 K0) | — | shared instances named; allowed differences named; comparable versus incomparable observations separated; fairness rules stated | `public-fixture-specification.md` §4 |
| C5 — both application shapes (E0) | — | each shape states authoritative state, attempted-action boundary, input acceptance, physical controls, failure observations, planned unsafe and state-loss controls; claim-ledger rows in the methodology's six fields | `public-fixture-specification.md` §5 |
| C6 — M-1's four controls | duplicate/conflict; lost wake + stale timer + timer idempotency + unfenced result; cancel-vs-complete both orders; missing checkpoint | every assertion M-1 names by name, checked individually | `controls.test.ts` (14 tests) — PASS |
| C6 negative | eight violating transcripts across the four controls, including M-1's named failing variant | each must FAIL at its exact step naming its exact fields | `oracle-discrimination.test.ts` — PASS |
| C7 — preparation is not a pass | refusing candidate over all 7 scenarios; conforming transcript; 10 violating transcripts | all REFUSED, never PASS; conforming PASSes; every violation FAILs | `refusal.test.ts` (9), `oracle-discrimination.test.ts` (20) — PASS |
| K0 exit — all ten §11 rows observable | — | map and scenarios agree in both directions; no orphan scenario, no aspirational row | `coverage.ts`, `coverage.test.ts` (7 tests) — PASS |
| C8 — pinned E0 evidence | benchmark inspected read-only at `98756f8c` | evidence identities recorded, **or** a named blocker | **UNAVAILABLE — BLOCKED_EXTERNAL**, §5 |

### Interactions, checked as interactions rather than separately

1. **Wait registration × batch selection × terminal disposition.** `billing.question` is carried
   across all three in one scenario: it arrives during RUNNING, stays ineligible through the wait,
   is excluded from the bound-1 batch, and receives a B-5 disposition at completion. A candidate
   cannot satisfy the three rules with inconsistent bookkeeping, because it is the same Event.
2. **Cancellation fence × receipt replay.** OA-2's accepted-receipt replay and CX-6's
   recorded-rejection replay are the same submitted-identity lookup with opposite answers. Both are
   exercised in one scenario — X replays a rejection, Y replays a receipt *after* a later
   cancellation — so implementing only one rule fails.
3. **Generation fencing × authenticated Events.** W-3 fences wait-created timers but explicitly does
   not fence authenticated result Events. Both halves are asserted in sequence: the stale timer is a
   no-op, and a result accepted after the timeout still reaches the next batch alongside it.
4. **Envelope refusal × ledger attribution.** The Effect-refusal scenario asserts the rejection *and*
   `ledgerCount: 0`, and violation 10 leaves the observation conforming so that only the ledger
   contradicts it.

### Tests

98 new tests across 8 files; 0 existing tests removed, weakened, skipped or retitled; 0 existing
assertions deleted. Pre-existing suite: 965 tests, independently re-run at C and all passing.

**Compatibility and refusal:** no public surface is added, so there is nothing to migrate or refuse.
The fixture is unadvertised and not exported from any package. Baseline, guides and skills are
materially unaffected — `check:builder-docs` inventories builder documentation, which this packet
does not change, and it passes unchanged at 26 files / 280 links / 38 imports.

**Semantic correction closure:** none applies. No accepted semantic rule was changed or corrected by
this packet; it restates accepted K0.1 decisions as observations and modifies no existing behavior.

**Prior findings:** none. Round 1, fresh attempt, no predecessor findings to dispose of.

## 3. Additional self-found defects

Found during implementation and re-audit, with provenance separate from any reviewer finding.

| ID | What | Disposition |
|---|---|---|
| **K0.2-SELF-01** | `tests/conformance/architecture/kernel-boundaries.test.ts:11` scans conformance sources for import specifiers with a raw-text regex. Any prose ending in the preposition f-r-o-m immediately before a string literal is parsed as a bare import and reported as a boundary violation. A test title of that shape made the existing guard fail. | **Not fixed here, deliberately.** `specifiersIn` also backs `walkGraph`, which enforces the real kernel import-graph guard; changing it inside K0.2 — under no criterion, with no coverage — risks silently weakening a guard a reviewer would rightly scrutinize. Worked around by wording, with the reason recorded at the site. **Recommended as a separate corrective packet.** The guard's actual obligation is unaffected: this packet's fixture imports only `node:` and relative specifiers, asserted directly. |
| **K0.2-SELF-02** | The contract initially cited `k0-trace.test.ts` and `delayed-runtime.test.ts` as the evidence for C1 and C2; neither existed, and those criteria rested only on indirect coverage. | **Fixed in C.** Both files were written with direct structural assertions (23 tests). Found by re-auditing each criterion's named evidence against the tree rather than against the plan. |
| **K0.2-SELF-03** | The contract linked forward to `implementation-01.md`, which exists only in H, leaving the validated payload C internally inconsistent. | **Fixed in C.** The release provenance and predecessor disclosure were moved inline into the contract and the forward links removed; C now has 13 local links, all resolving. |

## 4. Assumptions, design choices and the strongest remaining risk

- **The fixture is transcript-validated, not Kernel-validated.** Implementing the protocol is
  K1.1–K1.3's responsibility, so no reference Kernel was built. Oracle discrimination is established
  by hand-authored violating transcripts instead.
- **The conforming transcript is derived from the scenarios' own expectations and is therefore
  circular.** It proves the runner can report PASS and nothing more. This is stated in the code, in
  the specification and here, rather than being left for a reviewer to notice.
- **Strongest remaining risk: the vocabulary is a second statement of the worksheet's rules and could
  encode a misreading.** Containment is that the scenarios state expectations *literally* while
  `protocol-vocabulary.ts` codes the rules *independently*, and `rule-agreement.test.ts` asserts the
  two agree where a misreading would matter. Two derivations agreeing is meaningfully stronger than
  one. It is **not** proof: both are readings of the same document by the same author, and a reviewer
  who independently re-derives W-1 eligibility and §3 batch selection from the worksheet is the
  control this packet cannot supply for itself. That is the single highest-value review target here.
- **Scenario economy.** W-8 case 6 (a deadline on the subscription-only wait) is not duplicated as a
  separate scenario; its distinguishing behavior — B-7's mandatory timeout member — is observed
  against a live generation in the stale-timer control. Recorded at the assertion site so the
  omission is a stated choice rather than a gap.

**Third-party review under AGENTS.md: none.** No dependency was added, and no third-party code,
test, script, asset or configuration was copied, adapted or vendored. `package.json`,
`package-lock.json` and the workspace list are unchanged. The fixture uses only `node:test`,
`node:assert` and `node:fs`, already in use throughout the repository.

## 5. K0.2-C8: the E0 blocker

| Field | Value |
|---|---|
| Criterion | K0.2-C8, "obtain pinned E0 evidence" |
| State | **BLOCKED_EXTERNAL** |
| Unavailable input | any E0 fixture, ownership record, baseline contract, evaluator version or control result |
| Observed external state | benchmark repository at `98756f8c10bd806125da8318f1a129bc030aca61`; `docs/roadmap.md:3` states E0–E6 are "**planned**, not implemented by this documentation revision"; `docs/current-state.md:79` lists "Start E0 ownership/claim fixtures" under next useful work |
| Access used | read-only inspection. No file, ref, configuration, snapshot or evidence in that repository was changed |
| Responsible actor | benchmark repository owner |
| Unblock condition | E0's deliverable produced and accepted there at a pinned revision, with artifact identities recordable here |
| Claimed | **nothing.** No E0 acceptance is claimed, implied or self-granted |

Because K0.2 is K0's final gate packet ([007's old→new mapping](../../007-work-packets.md#old--new-mapping-and-milestone-closure):
"K0.2 ACCEPTED, including E0"), **K0 does not close while C8 is open**, however C1–C7 are judged.
006 permits this preparation to proceed — "Missing cross-repository gate evidence blocks only
dependent acceptance, not independent fixture preparation" — but it does not permit calling the
packet review-ready as a whole.

The owner released the packet as written with this consequence stated in advance, having declined a
scope amendment that would have split C8 into its own gate packet. That option remains available and
is the obvious unblock path if E0 is not imminent; proposing it again is an owner decision under
006's amendment rule, not something this report can adopt.

## 6. Validation and interpretation

**Environment:** Node v25.2.1 (`engines` requires ≥22.9.0), npm 11.6.2, TypeScript 5.9.3,
Darwin 25.6.0 arm64. **Working directory:** repository root. **Tree:** clean payload C
`9aa70a82f02d57b2658e0906af53dc31bc34e483`.

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0, no diagnostics |
| `npm test` | exit 0 — **1063 tests, 229 suites, 1063 pass, 0 fail, 0 skipped, 0 todo** |
| `npm run test:conformance` | exit 0 — 954 tests, 211 suites, 954 pass, 0 fail |
| `npm run check:builder-docs` | exit 0 — 26 Markdown files, 280 local links/anchors, 38 public package imports |
| `node --test --experimental-strip-types tests/conformance/k0/*.test.ts` | exit 0 — 98 tests, 98 pass |
| pre-existing suite with `tests/conformance/k0` excluded | exit 0 — **965 tests, 965 pass**; 965 + 98 = 1063 |
| `git diff --check --cached` on the C payload | exit 0, no whitespace findings |
| K0.2 document link/anchor audit, mirroring `scripts/check-builder-docs.ts:34` | 13 local links, 0 problems |

`npm run test:evals` was **not run**: no Agent behavior, model access or eval fixture changes.
`npm run test:sdk` was not run separately because `npm test` already includes
`packages/sdk/tests/*.test.ts`; 006 does not require duplicate full-suite runs to exercise every alias.

**Raw evidence.** The counts above are recorded inline. No external artifact is cited, because the
only raw logs are in a session-local temporary directory and 008 is explicit that a temporary local
path is insufficient evidence. What replaces it is reproducibility: every command is deterministic
and offline — no model, network, container, database, clock dependency or random seed — so a reviewer
rerunning them at C gets these exact numbers, and a divergence is itself a finding.

**Fixture prepared / gate executed / external decision** — kept separate, as 012's external-evidence
method requires: a fixture was **prepared**; **no gate was executed**; **no external decision exists**.

**Checks not run, and the resulting claim limits:** no process-death, persistence, isolation,
performance, cost or model-quality check was run, and none is claimed. No E0/E1 evidence was produced.
No candidate implements the protocol, so nothing here is evidence about a Kernel.

**Why the evidence supports each criterion** — implementer assessment, not acceptance:

| Criterion | Assessment |
|---|---|
| C1 | The trace exists with all five phases, W-8's cases 1–5 individually asserted, and two violating transcripts proving the oracle rejects the two ways this trace is usually got wrong. |
| C2 | The delay is scheduled rather than timed, Y completes while X is unresolved, and X is asserted never to report WAITING or hold a live generation. |
| C3 | Independence is structural — the candidate surface has exactly one method — and is proven by a violation catchable only through the ledger. |
| C4 | The baseline contract fixes shared instances, allowed differences and incomparable observations. It is a specification; it has no executable evidence and claims none. |
| C5 | Both shapes are specified in the fields E0 and the methodology require. Same limit: specification, not evidence. |
| C6 | All four controls exist; every assertion M-1 names is checked individually; the variant M-1 names as failing is shipped and rejected. |
| C7 | All 7 scenarios REFUSED by the only real-repository candidate; conforming PASSes; all 10 violations FAIL at exact steps naming exact fields. |
| C8 | Not satisfied. Blocked externally; see §5. |

## 7. Handoff

**Not review-ready as a whole**, per 006's rule on unavailable required evidence. Precisely:

- **C1–C7 are complete and independently reviewable now.** If the owner wants early review of the
  fixture itself, this candidate supports it — but such a review cannot accept the packet, because
  C8 is unmet. It would be review of part of a blocked packet, and its record should say so.
- **C8 requires the benchmark owner**, not more work here.
- **Remaining work in this repository: none for C1–C7.** Everything blocked is external.

**Identities:** base `c079237ee7aff428481426f93e87a68b79f170d4`; clean payload C
`9aa70a82f02d57b2658e0906af53dc31bc34e483`; candidate H is the commit containing this report, with
its full SHA and the verified advertised remote SHA supplied in the external handoff after pushing.

No self-acceptance is claimed or implied. No successor is started; successor release remains
owner-controlled, and this report does not release K1.0 or anything else.
