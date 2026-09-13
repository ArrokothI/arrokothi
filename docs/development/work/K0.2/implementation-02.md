# Implementation report — K0.2, round 2

Correction round for the CHANGES REQUIRED verdict on H1. Round 1's record is
[implementation-01.md](implementation-01.md) and is unchanged.

## Identity

- **Packet / parent:** K0.2 — public controls and the K0/E0 gate; parent milestone K0.
- **Contract:** [`contract.md`](contract.md), **revision 2**, at C2 below. Revision 1 was reviewed at H1.
- **Governing process baseline:** `c079237ee7aff428481426f93e87a68b79f170d4`, unchanged.
- **State: `BLOCKED_EXTERNAL`,** unchanged. C1–C7 and the new C9 are complete and independently
  reviewable; C8 cannot be satisfied from this repository. See §5.
- **Owner release:** the original explicit release of 2026-09-11 still stands. 006: "Corrections on a
  released packet need no renewed permission." No successor is started or released.
- **Prerequisite:** K0.1 ACCEPTED at H12 `bab7bf6635781e6d2f9b0e8e333f58440ae0b047`, integrated as
  `42731300266eea00a9a24d867d5e82d9887c280d`. Unchanged.
- **Branch:** `codex/k0.2-public-controls-e0-gate`. **Configured remote:** `origin`
  `https://github.com/ArrokothI/Agent_SDK.git`, unchanged.
- **Base commit:** `c079237ee7aff428481426f93e87a68b79f170d4`, unchanged.
- **Previously reviewed candidate H1:** `6f162e5a8b6b5bb3b5c0b924e28a1ca4a02c33cf` (CHANGES REQUIRED).
- **Clean payload C2:** `8291da56d228997b736665d9c57dd22237aa95d7`. Final validation ran on this tree.
- **Candidate H2:** the commit containing this report. Full SHA in the external handoff.
- **Exact C2..H2 administrative allowlist:** `docs/development/work/K0.2/implementation-02.md` (this
  file) and the K0.2 row in `docs/development/007-work-packets.md`. **No payload rides in H2**: every
  substantive correction is in C2, and `git diff --stat C2 H2` is exactly those two files.
- **Working tree:** clean at C2 and at H2.
- **Push:** verified advertised remote SHA supplied in the external handoff after pushing.

## 1. Provenance of the findings, and one record gap

The three findings were supplied to this session **by the owner, as a transcription**, with their IDs,
required observable outcomes and named minimum cases. They are treated as authoritative correction
requirements and are dispositioned by ID in §2.

**The review record itself is not in this repository.** Before starting I searched the branch, `main`,
every remote ref, the reflog, unreachable objects, the stash and the worktree list; there is no
`work/K0.2/review-01.md` and no file anywhere containing the finding IDs. 006 requires a versioned
review with reviewed base/head and actionable findings for CHANGES_REQUESTED, and 008 requires the
reviewer's identity, access limits, per-criterion verdicts and coverage gaps. None of that reached
this session, and this report does not invent it: no reviewer identity, session, model or per-criterion
verdict is recorded here, and **no `review-01.md` was fabricated on the reviewer's behalf**. Recording
the review is the reviewer's or owner's action under 006 and 009 Prompt C.

Two consequences a re-reviewer should know. First, the corrections below were derived independently
against the accepted K0.1 worksheet rather than from a reviewer's suggested mechanisms — which the
owner's instruction also required — so where the review proposed a specific fix, what is implemented
is the smallest thing that satisfies the stated *outcome*. Second, because the review's per-criterion
verdicts are unavailable, this round cannot confirm which criteria the reviewer considered already
passing; the whole packet was therefore re-audited rather than only the three findings.

## 2. Finding dispositions

### K02-R1-01 — inherited §11 semantic coverage is incomplete — **CLOSED**

**Required outcome:** re-derive §11's assertions rather than relying on the row-granular map; make the
untested distinguishing obligations observable; inspect all ten rows for comparable gaps rather than
stopping at the named examples; make the coverage machinery prove obligations and counterexamples.

**What was wrong.** The map's unit was the §11 *row*, and `coverage.test.ts` proved only that each row
number pointed at a scenario that existed. Several rows state several distinguishing obligations in one
cell, so that check passed while most of what those rows require went untested. Two claims in the
round-1 payload were outright false and are withdrawn: that `control-stale-timer-and-lost-wake`
already covered W-8 case 6 (it does not — that case is sharp precisely because the wait has *no*
dependency alternatives, which is why the timeout cannot be reached by matching), and that the
row-attribution check constituted coverage.

**Re-derivation.** All ten §11 rows were re-read verbatim from the accepted worksheet and decomposed
into distinguishing obligations. That produced **ten** untested gaps — the four named in the finding
and six found by the sweep the finding asked for:

| Gap | §11 source | Named in the finding? | Now observed by |
|---|---|---|---|
| Same create key, different content must conflict | row 1 | yes | `identity-create-and-activation` step 2 |
| Semantically different dispatches never share an Activation ID | row 2 | yes | same scenario, step 6 |
| Takeover keeps the Activation ID and advances the epoch | row 2 | yes | same scenario, step 4 |
| W-8 case 6: subscription-only wait with a deadline, B-7's mandatory timeout member at bound 1 | row 5(e) | yes | `control-subscription-wait-deadline` step 5 |
| Completion with unaccounted owned work is rejected | row 8 | yes | `control-completion-obligations` step 2 |
| A failure partway through acceptance leaves zero partial state | row 3 | **no** | `control-whole-envelope-validation` step 2 |
| A structurally empty wait declaration is refused at envelope validation | row 5(a) | **no** | same scenario, step 3 |
| B-7 path A: an already-due deadline at registration never persists a live wait | row 5(c) | **no** | `control-subscription-wait-deadline` step 6 |
| Terminal ingress refuses new ordinary input | row 6 | **no** | `control-completion-obligations` step 4 |
| No K0/K1 artifact asserts remote-revocation freshness | row 10 | **no** | corpus scan in `coverage.test.ts` |

**Payload.** Four scenarios added; 20 violating transcripts added (10 → 30); two observation fields
added (`activationId`, `ingressRefused`) because row 2's and row 6's obligations were not expressible
at all without them; one command added (`takeover`). `coverage.ts` rebuilt at obligation granularity:
**33 obligations**, of which 31 resolve to a scenario step plus at least one counterexample, one
(R10-b) is a corpus-level negative check, and one (R8-c) is explicitly assigned.

**Coverage machinery now proves obligations, not row numbers.** `coverage.test.ts` checks that every
obligation names a scenario that exists and a step index within range; that it carries at least one
counterexample; that each counterexample exists, targets that scenario, is actually rejected by the
oracle, **and fails at that obligation's own step** — so a counterexample cannot defend an obligation
by failing somewhere else; that every violating transcript defends a recorded obligation; that row 5's
seven lettered sub-parts are each represented; and that the map and the scenarios' declared rows agree
in both directions. `interactions.test.ts` adds eleven corpus-level invariants over all 11 scenarios.

**One scope judgement, recorded rather than buried.** §11 row 8's second clause — that a *previously
owned* obligation is settled, transferred or abandoned before completion — has no observable K0 case,
because no previously owned obligation can exist while K1 refuses Effects outright. CX-3 states this
directly. Rather than fabricate state the protocol says cannot exist, it is recorded as obligation
R8-c assigned to **K2.4** with that reason, mechanically checked to carry a substantive justification.
The clause that *is* reachable now — work proposed in the completing Outcome itself — is observed, and
its counterexamples include a candidate that rejects for the *wrong reason*, so rejecting merely
because Effects are unsupported does not pass.

### K02-R1-02 — the ledger is not independent against retained nested references — **CLOSED**

**Required outcome:** a candidate must not be able to rewrite historical ledger evidence by mutating
request input, returned result, nested observation/error objects or any other retained reference after
`attempt()`; add tests that actually mutate them; preserve the surface separation; do not weaken
attribution.

**What was wrong.** `Object.freeze` is shallow, and the entry was built from the caller's own objects
(`{ ...request, sequence, result }`). The request's `input`, the returned `result`, and everything
nested inside either remained shared with the ledger. A candidate needed only to keep the reference it
already had. Historical evidence editable by the party it incriminates is not evidence, and the
round-1 test suite missed it because it only checked top-level freezing and absent methods.

**Fix.** `createOperationSink` now deep-copies the recorded input and result via a structural
`snapshot()`, deep-freezes what it stores, and returns a **separate** copy to the caller, so no
reference the candidate holds is the reference the ledger keeps. The candidate-facing surface is
unchanged and still has exactly one method, asserted.

**Evidence that the tests discriminate.** Six new tests mutate: the request input object; a nested
object inside it; an array inside it; the returned result; a nested error object on it; and a handler's
own reused result object across two attempts. Plus a deep-freeze assertion down every level. All six
were run against a faithful reconstruction of H1's recording logic and **all six fail against it**;
they pass against C2. A test that passes both ways would prove nothing, so this was checked rather
than assumed.

### K02-R1-03 — ledger assertions fail open when the observer is omitted — **CLOSED**

**Required outcome:** a scenario declaring an independent-ledger expectation must never pass merely
because the runner was invoked without the observer; make it fail closed or structurally impossible to
omit; add a negative test showing the effect-attribution bad candidate cannot pass through such an
invocation; preserve `REFUSED`/`PASS`/`FAIL` semantics.

**What was wrong.** The runner read `if (ledgerCount !== undefined && options.ledgerCount !== undefined)`
and silently skipped the assertion otherwise. The one violating transcript catchable *only* through the
ledger would therefore have reported PASS purely because of the call shape.

**Fix, closed two independent ways.** The runner now takes the whole `OperationSinkBundle` instead of a
sink plus an optional observer, so omission is a **type error** — confirmed by the compiler rejecting
the previous `{ sink }` call sites during this correction. And `assertLedger` treats an unusable
observer at runtime as a **failure of the assertion**, never a reason to skip it, so a caller that
casts around the type still cannot get a free pass.

**Negative tests.** The effect-attribution bad candidate is run through three malformed invocation
shapes — observer omitted entirely, present but unusable, and returning a non-count — and must FAIL in
each, with the failure naming why the expectation could not be evaluated. A fourth test runs the
**conforming** candidate through the same malformed shape and requires FAIL as well: if only bad
candidates failed there, the guard would be discriminating on the candidate rather than on whether the
obligation was checked. A fifth confirms the same conforming candidate still PASSes with a proper
bundle, so the guard is not simply always-fail. `REFUSED`, `PASS` and `FAIL` keep their meanings, and
`refusal.test.ts` still requires REFUSED for all 11 scenarios.

## 3. Whole-packet re-audit

Not limited to the three findings. What was re-reconciled, and what it turned up:

| Area | Result |
|---|---|
| Scenario corpus versus §11 | Re-derived from the worksheet; ten gaps found and closed (§2). |
| `protocol-vocabulary.ts` derivation | Extended: the new W-8 case 6 expectation is cross-checked against the independently coded `selectWaitEndedBatch`/`isEligibleUnderWait`, as case 4 already was. |
| Coverage map | Rebuilt at obligation granularity; row attribution corrected for three scenarios that claimed rows the map did not attribute to them (`k0-trace` row 1, `delayed-runtime-non-blocking` row 2, `control-stale-timer-and-lost-wake` row 6). §11 row 8's cell was under-split and is now two obligations (R8-b, R8-b2). |
| Oracle discrimination | 30 counterexamples, each required to fail at its obligation's own step. |
| Specification document | Scenario table, control table, oracle description and obligation counts reconciled with the code; §8 added recording what round 1 got wrong. |
| Contract | Revision 2: C3, C6, C7 amended; C9 added for the coverage machinery; R8-c assigned to K2.4. |
| Round-1 report | Untouched, as immutable history. |

### The named interactions

Checked as corpus-level invariants in `interactions.test.ts`, sweeping all 11 scenarios rather than
asserting per-scenario:

1. **Wait registration × wait-ended batch selection × terminal disposition.** For every wait registered
   anywhere in the corpus, every member of the batch its ending produced must be eligible under that
   wait by the independently coded rule (timeout Events excepted, since they are mandatory by
   construction). Plus: no Event is ever both acknowledged and terminally disposed, and no terminal
   state leaves an Event merely queued.
2. **Duplicate/conflict × receipt replay.** Every exact resubmission in the corpus must replay exactly
   one of the two answers — an accepted identity returns its Outcome receipt with no rejection; a
   never-accepted one returns its recorded rejection and no Outcome receipt — and never advances the
   revision or re-publishes emissions.
3. **Cancellation × whole-envelope rejection.** After any accepted cancellation, every later submission
   for that Execution is checked against the fenced observation field by field, and must carry the
   cancellation/terminal-conflict classification. Separately, *every* rejected submission anywhere in
   the corpus is checked to leave revision, progress, emissions and acknowledgment untouched.
4. **Timeout generation × authenticated result.** A timer delivery must never remove a previously
   accepted Event from the mailbox, and may mint a timeout Event only when the generation it names was
   the live one — otherwise it must mint nothing and retire nothing.
5. **Sink attribution × candidate self-report.** Every Outcome proposing an Effect must pin the ledger
   at that step, and any scenario that asserts the ledger at all must assert it at *every* step, so no
   unasserted step can hide an unattributed dispatch.

**The interaction suite was mutation-checked, not assumed.** Two deliberate perturbations were applied
to the scenario corpus and reverted: making a cancellation-fenced submission advance the revision, and
letting ineligible backlog into a wait-ended batch. The first was caught by two interaction tests; the
second by one interaction test and, independently, by two rule-agreement tests. A suite that passes
whatever the corpus says would establish nothing.

## 4. Additional self-found defects

Separate provenance from the reviewer's findings.

| ID | What | Disposition |
|---|---|---|
| **K0.2-SELF-01** | `tests/conformance/architecture/kernel-boundaries.test.ts:11` parses conformance sources for imports with a raw-text regex, so prose of a particular shape is read as a bare import. | **Unchanged from round 1: not fixed here, deliberately.** Still recommended as a separate corrective packet. Re-verified at C2: the k0 fixture produces zero false positives. |
| **K0.2-SELF-04** | Round 1's `k0-trace.test.ts` carried a test whose stated rationale — that the stale-timer control already covered W-8 case 6 — became false the moment case 6 got its own scenario, and was wrong even when written. | **Fixed in C2.** The test now asserts the case-6 wait exists as its own record with an empty dependency list and a deadline, and records why the earlier reasoning was rejected. Found during the re-audit, not named by the review. |
| **K0.2-SELF-05** | Three scenarios declared `k0BoundaryRows` the rebuilt map did not attribute to them, and the field's meaning was ambiguous between "rows this scenario touches" and "rows the map relies on it for". | **Fixed in C2.** Attribution corrected and the field's meaning documented; `coverage.test.ts` now enforces agreement in both directions. |
| **K0.2-SELF-06** | §11 row 8's cell states two obligations; the rebuilt map initially carried one, which would have left the cancellation-loser disposition clause unattributed. | **Fixed in C2** before commit, by splitting R8-b and R8-b2. |

## 5. K0.2-C8: the E0 blocker, re-checked

Re-inspected read-only for this round, as instructed.

| Field | Value |
|---|---|
| Criterion | K0.2-C8, "obtain pinned E0 evidence" |
| State | **BLOCKED_EXTERNAL**, unchanged |
| Benchmark revision re-checked | `98756f8c10bd806125da8318f1a129bc030aca61` — identical to round 1; clean tree |
| Observed | `docs/roadmap.md:3` still states E0–E6 are "**planned**, not implemented by this documentation revision"; `docs/current-state.md:79` still lists "Start E0 ownership/claim fixtures" under next useful work; a filesystem search outside `.git` found no E0 artifact |
| Access used | read-only. No file, ref, configuration, snapshot or evidence in that repository was created or modified |
| Responsible actor | benchmark repository owner |
| Unblock condition | E0's deliverable produced and accepted there at a pinned revision, with artifact identities recordable here |
| Claimed | **nothing.** No E0 acceptance is claimed, implied, inferred or self-granted |

No genuinely new accepted E0 evidence exists, so K0.2 stays `BLOCKED_EXTERNAL` and **is not presented
as review-ready as a whole**. Because K0.2 is K0's final gate packet, **K0 does not close**.

## 6. Validation and interpretation

**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64. **Working
directory:** repository root. **Tree:** clean payload C2 `8291da56d228997b736665d9c57dd22237aa95d7`.

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0, no diagnostics |
| `npm test` | exit 0 — **1185 tests, 239 suites, 1185 pass, 0 fail, 0 skipped, 0 todo** |
| `npm run test:conformance` | exit 0 — 1076 tests, 1076 pass, 0 fail |
| `npm run check:builder-docs` | exit 0 — 26 Markdown files, 280 local links/anchors, 38 public package imports |
| `node --test tests/conformance/k0/*.test.ts` | exit 0 — **220 tests, 220 pass** (was 98 at H1) |
| pre-existing suite with `tests/conformance/k0` excluded | exit 0 — **965 tests, 965 pass**; unchanged from H1, so the correction regressed nothing |
| `git diff --check --cached` on C2 | exit 0, no whitespace findings |
| K0.2 document link/anchor audit, mirroring `scripts/check-builder-docs.ts:34` | 14 local links, 0 problems |
| import-scanner false positives in the k0 directory | 0 |
| K02-R1-02 discrimination check against reconstructed H1 sink | 6 of 6 new assertions fail against H1, pass against C2 |
| interaction-suite mutation check | 2 of 2 deliberate perturbations caught; both reverted |

`npm run test:evals` not run: no Agent behavior, model access or eval fixture change. `npm run test:sdk`
not run separately: `npm test` already includes `packages/sdk/tests/*.test.ts`.

**Raw evidence.** Counts are recorded inline. No external artifact is cited: the only raw logs are in a
session-local temporary directory, and 008 is explicit that a temporary local path is insufficient.
What replaces it is reproducibility — every command is deterministic and offline, with no model,
network, container, database, clock dependency or random seed — so a reviewer rerunning them at C2 gets
these exact numbers, and a divergence is itself a finding.

**Fixture prepared / gate executed / external decision**, kept separate: a fixture was **prepared**;
**no gate was executed**; **no external decision exists**.

**Checks not run, and the resulting claim limits:** no process-death, persistence, isolation,
performance, cost or model-quality check was run, and none is claimed. No E0 or E1 evidence was
produced. No candidate implements the protocol, so nothing here is evidence about a Kernel.

**Third-party review under AGENTS.md: none.** No dependency added; nothing copied, adapted or vendored.
`package.json` and `package-lock.json` are unchanged. The fixture uses only `node:test`, `node:assert`,
`node:fs`, `node:path` and `node:url`.

**Strongest remaining risk, unchanged in kind and now larger in surface.** `protocol-vocabulary.ts` and
the coverage map are both *my* reading of the accepted worksheet, and this round added substantially
more of both. Cross-checking the literal expectations against the independently coded predicates makes
disagreement detectable, and the mutation checks show the suites bite — but two derivations by the same
author from the same document can be consistently wrong together. A reviewer who re-derives §11 from
the worksheet without reading `coverage.ts` first is the control this packet cannot supply for itself,
and it is where review effort pays most. The round-1 review found exactly this class of defect.

## 7. Handoff

**Not review-ready as a whole**, per 006's rule on unavailable required evidence. Precisely:

- **C1–C7 and C9 are corrected and independently reviewable now.** A review of them cannot accept the
  packet while C8 is unmet, and its record should say so.
- **C8 requires the benchmark owner**, not more work here.
- **Remaining work in this repository for C1–C7/C9: none.**
- **One record gap is outstanding and is not mine to close:** the round-1 review record is absent from
  the repository (§1). Under 006 and 009 Prompt C, transcribing it is the reviewer's or owner's action.

```text
Correct the same released packet K0.2 on codex/k0.2-public-controls-e0-gate.
Base c079237ee7aff428481426f93e87a68b79f170d4; previously reviewed H1
6f162e5a8b6b5bb3b5c0b924e28a1ca4a02c33cf; corrected payload C2
8291da56d228997b736665d9c57dd22237aa95d7; candidate H2 supplied in the handoff.
Round-1 findings K02-R1-01, K02-R1-02, K02-R1-03: all CLOSED, dispositioned in
implementation-02.md §2. The round-1 review record is not in the repository;
its findings reached this session as an owner transcription, recorded in §1.
Self-found defects K0.2-SELF-04/05/06 closed in C2; K0.2-SELF-01 remains open
and is recommended as a separate corrective packet.
C8 remains BLOCKED_EXTERNAL on benchmark E0 at 98756f8c; responsible actor is
the benchmark repository owner. No successor release.
```

No self-acceptance is claimed or implied. K0 is not closed, nothing is merged, and K1.0 is not
released.
