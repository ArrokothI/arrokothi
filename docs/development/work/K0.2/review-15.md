# K0.2 independent review — round 15

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-12  
**Role:** accountable independent reviewer; I did not implement this candidate.

## Candidate binding and access

This review binds only the submitted H14 candidate:

- governing base: `c079237ee7aff428481426f93e87a68b79f170d4`;
- previous reviewer record A14: `61732c2f18e6806bcecf83c85e6ad28f26f083ff`;
- clean payload C14: `377bcbeda14b16bfebd325064db1d2617feedc4a`;
- submitted handoff H14: `e2677451ad76caadfcac73473e22d6444f611b83`.

I inspected the repository through the GitHub connector. I did not independently rerun the validation commands in a shell. I inspected the pinned C14/H14 source, cumulative correction context, the accepted K0.1 worksheet, the Round-14 finding, the new cited-decision inventory and guards, the new scenario/counterexamples, the H14 implementation report and immutable clean-C14 logs, and the current benchmark E0 state.

A14→C14 is exactly one payload commit. C14→H14 is exactly one administrative/evidence commit containing the implementation report, K0.2 ledger update and six output-only validation logs. I found no C/H allowlist violation.

## Review method

Round 14 required a full source-side reconstruction rather than another label patch. I therefore did not treat the new `cited-decisions.ts` inventory or its hashes as proof. I checked:

1. whether every §11 row citation is represented;
2. whether representative new decompositions correspond to the accepted K0.1 decision text;
3. whether later assignments name a truthful first owner rather than merely a nearby packet;
4. whether newly added scenario evidence presents the condition it claims to discriminate;
5. whether a violating transcript can fail because of a neighbouring independent rule instead of the claimed rule; and
6. whether the inventory still bundles clauses that a plausible implementation can get right and wrong independently.

The new omission machinery is materially better than H13. It seals the accepted worksheet source, checks all ten row citation sets, requires every authored clause to resolve to a real obligation, requires every obligation to reconcile back to the source inventory, independently rejects dangling owners, and checks that assigned packet headings actually exist. Its own text correctly says that these guards make drift visible but cannot prove semantic decomposition. That limitation matters in the findings below.

## Round-14 finding disposition

### K02-R14-01 — **NOT CLOSED**

C14 performs the requested all-row/all-decision sweep and closes many concrete omissions. In particular, OA-1/OA-6, EF-3/EF-4, CL-1 family clauses, CX-4/CX-5 and PC-1/PC-2/PC-3 are no longer silently absent; clauses without a truthful K0.2 surface are explicitly assigned with an observation-gap explanation and later owner. Several clauses that were actually expressible received new schedules/counterexamples instead of being hidden behind assignment.

However, the reconstruction still fails C9 in two independent ways. These are the residual defects of the same Round-14 root cause, not grounds to revert the useful C14 work.

## Findings

### K02-R15-01 — P1 — two new selector counterexamples are rejected through an independent W-3 lifecycle violation

C14 adds candidate-level owners for two W-1 selector clauses in `cited-decision-edges`:

- `R5-k1`: an exact Event-identity selector cannot be ignored when kind and correlation match;
- `R5-k1b`: membership in the non-first member of a finite kind set can make an Event eligible.

The schedule conditions themselves are useful and truthful. The problem is the violating transcripts.

For `clauses/r5-k1`, the conforming step is `WAITING` under live generation `edge-g2` after an impostor Event matches kind/correlation but not exact Event identity. The violation changes only `liveWaitGeneration` to `null`, leaving the lifecycle `WAITING` and readiness empty. That candidate therefore violates W-3 independently: the accepted worksheet fixes that a live generation exists exactly while `WAITING`. The oracle can reject this transcript even without enforcing the exact-identity selector clause.

For `clauses/r5-k1b`, the conforming step accepts `match` through the second kind-set member, retires the wait and becomes `READY` with Event-triggered readiness. The violation changes only `liveWaitGeneration` back to `edge-g2`, leaving `READY` and the readiness in place. That again independently violates W-3: a live generation cannot coexist with `READY`.

These are not harmless extra symptoms. C9's unit is the independently distinguishable assertion, and the packet itself says a counterexample belonging to a neighbouring rule does not count as evidence. A plausible selector-only implementation bug has a coherent state-machine consequence:

- if exact Event identity is ignored, the impostor is treated as eligible, so the normal B-6 path-B result is `READY`, retired generation and one readiness;
- if only the first kind-set member is checked, the legitimate second-member Event is treated as ineligible, so the normal result remains `WAITING` with the live generation and no readiness.

The current mutations instead create internally inconsistent lifecycle/generation states and therefore do not isolate the selector rules they are assigned to.

**Required correction:** replace these with semantically coherent selector-only counterexamples (or an equivalent candidate-level discriminator) that violate the claimed W-1 matching decision while preserving W-3/B-6 semantics for the candidate's mistaken eligibility decision. Re-run the assertion-level discrimination guards and re-audit the other newly added transcripts for the same contamination pattern.

### K02-R15-02 — P1 — the explicit cited-decision inventory still bundles independently distinguishable clauses

Round 14 required a clause-level reconstruction using the packet's own C9 rule: split two clauses whenever a plausible implementation can get one right and the other wrong. The new inventory is exhaustive as an authored list, but some authored entries still combine such clauses behind one obligation/disposition.

Concrete examples:

1. `B-1.5` states both that no batch member lies outside accepted Events **and** that no legal dispatch bound is below one, and maps both to `R5-j1`. These are independent constraints. An implementation can validate `bound >= 1` while admitting a non-Event member, or enforce Event-only membership while allowing a zero bound. A whole-corpus guard checking both conditions together does not turn them into one assertion.

2. `W-9.2` combines a timeout Event's stable Event identity, destination, semantic timeout class and exact wait-generation correlation into one `R5-k6` assignment. W-9 enumerates these as separate properties of the timeout Event. A future implementation can preserve identity and generation while writing the wrong destination, or preserve destination while dropping the semantic timeout class, without the other properties failing. Sharing a later packet owner is not a reason to combine independently violable assertions.

The source/inventory hash correctly catches deletion of an authored entry, but it cannot catch this under-decomposition because the bundled entry itself is what was hashed. This is exactly why the new guard describes the decomposition as human-reviewed semantic work.

**Required correction:** apply the C9 split test across the complete explicit inventory, not only the two examples above. For every entry containing multiple behavioural claims, ask whether one plausible implementation can satisfy one while violating another. Split when yes. Each resulting clause must receive its truthful scenario/shared/corpus/assigned disposition; clauses with the same later owner may remain separately assigned rather than forcing artificial K0.2 scenarios. If clauses are retained together, record a concrete writer/observable-identity reason showing why one implementation bug necessarily produces both, rather than relying on prose proximity or common ownership.

This is a reconstruction correction, not an instruction to manufacture new Kernel concepts, commands or observations.

## Criteria

| Criterion | Round-15 result | Basis |
|---|---|---|
| C1 | **PASS** | Published trace and public fixture remain intact; the correction does not weaken the accepted trace semantics. |
| C2 | **PASS** | Delayed-Runtime/non-blocking evidence remains unchanged and the added schedule introduces no coordinator-blocking claim. |
| C3 | **PASS** | Independent sink/ledger attribution remains intact; no new self-report substitution was introduced. |
| C4 | **PASS** | Baseline/shared laboratory contract remains unchanged. |
| C5 | **PASS** | Both public application shapes remain prepared and no benchmark success is inferred from preparation. |
| C6 | **PASS** | Prior unsafe/state-loss controls remain; the expanded corpus does not weaken them. |
| C7 | **PASS** | Round-13 exchange-local epoch correction remains intact, including relational command adaptation and conforming-policy acceptance. |
| C8 | **FAIL — BLOCKED_EXTERNAL** | No benchmark-owner E0 acceptance exists yet. |
| C9 | **FAIL** | K02-R15-01 and K02-R15-02: assertion-level discrimination and decomposition are still incomplete. |

## Validation evidence

I inspected H14's immutable clean-C14 logs rather than rerunning them. They report:

- `npm run typecheck`: exit 0;
- `npm test`: 1,666 tests / 268 suites / 1,666 pass / 0 fail / 0 skipped;
- `npm run test:conformance`: 1,557 tests / 250 suites / 1,557 pass / 0 fail / 0 skipped;
- K0 fixture tests: 701 tests / 57 suites / 701 pass / 0 fail / 0 skipped;
- SDK tests: 22 pass / 0 fail / 0 skipped;
- builder-doc checks: 26 Markdown files / 280 links+anchors / 38 public imports.

Those logs support that C14's declared test corpus is green. They do not cure the semantic oracle defects above: both findings concern what the green tests count as valid assertion-level evidence.

## C8 external gate

The benchmark repository has moved since H14's handoff snapshot, so I rechecked the current state rather than assuming the report was still current.

- benchmark `main` remains `98756f8c10bd806125da8318f1a129bc030aca61`;
- `e0-claims-ownership-and-public-controls` has advanced to `0d47ddea1035fd0550281ad76ebecd3749b18a84`;
- an `e0-correction-round-2` branch exists at `c1c1663bb3206327d4d4c73eb4dc87078f591ff1`.

At current E0 branch revision `0d47ddea1035fd0550281ad76ebecd3749b18a84`, `fixtures/e0/evidence-record.json` still records a deterministic mechanical gate `PASS` but `ownerDecision.state: "pending"`, with an explicit statement that the mechanical PASS does not supply or imply acceptance. Therefore C8 remains `BLOCKED_EXTERNAL`. Branch movement or a correction branch is not the external decision C8 requires.

## Verdict

**CHANGES REQUIRED**

The candidate should be fixed forward. Do **not** revert C14/H14: the full cited-decision inventory, assignments, omission guards and sound new schedule material are useful progress and should be preserved. Correct the two C9 defects above, then re-run the affected/full deterministic validation on a clean new payload.

C8 remains independently blocked on benchmark-owner E0 acceptance. Local C9 correction may proceed in parallel; do not self-accept, merge K0.2, close K0, release K1.0 or begin a successor packet.

The next corrected C/H candidate is reviewable as Round 16.