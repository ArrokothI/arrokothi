# Independent review — K0.2, round 10

## Reviewer, date, identity

- **Reviewer:** OpenAI ChatGPT, GPT-5.6 Sol, High reasoning.
- **Role:** independent reviewer. I did not implement C10/H10.
- **Review date:** 2026-09-12 (America/New_York).
- **Governing base:** `c079237ee7aff428481426f93e87a68b79f170d4`.
- **Previously reviewed H9:** `80f2c887600bd2d611a7ef120d443fe6efbcb2d8` — round 9 `CHANGES REQUIRED`.
- **Round-9 review record:** `269ed51e1f3adce44203aff4344bffbe3733122d` (`review-09.md`).
- **Corrected clean payload C10:** `94aef9fd8398723fcce63963c4655cc2ba857c4c`.
- **Reviewed candidate H10:** `54a0bda358960b049800d8856128eaea90fc6fd1`.
- **Branch reviewed:** `codex/k0.2-public-controls-e0-gate`.
- **Benchmark revision inspected read-only:** `98756f8c10bd806125da8318f1a129bc030aca61`.

This review is bound to H10 exactly. The reviewer-record commit containing this file is administrative provenance and is not part of H10.

## Access and validation limits

I reviewed through the authorized GitHub connector: exact refs/commits, A9→C10 correction delta, C10→H10 administrative delta, cumulative source reached by the correction, the governing 001/006/012 sources at the pinned base, the accepted K0.1 worksheet and detail protocol, C10 contract/specification, fixture command/observation vocabulary, scenarios, coverage/candidates/regressions, implementation-10, prior review findings and the benchmark repository.

I had no local checkout and did not independently rerun the implementer's commands. GitHub exposes no combined status checks and no workflow runs for C10 through the available connector. The report's typecheck/test/conformance/SDK/architecture/builder-doc results are therefore implementer-reported validation rather than reviewer-rerun evidence.

## Identity and correction-delta verification

The round-10 history is clean and linear:

- `269ed51e1f3adce44203aff4344bffbe3733122d` → C10 is one correction commit touching exactly five K0.2 contract/specification/conformance files; `scenarios.ts` is not changed.
- C10 → H10 is one administrative commit containing only `docs/development/007-work-packets.md` and `docs/development/work/K0.2/implementation-10.md`. No payload rides in H10.
- H10's direct parent is C10.
- Repository `main` remains `c079237ee7aff428481426f93e87a68b79f170d4`.

I do **not** recommend reverting C10. Fix forward from C10.

## Round-9 finding disposition

### K02-R9-01 — OA-5 deadline inertness on malformed rejected Outcomes — **CLOSED**

C10 implements the requested narrow correction correctly.

R3-c4 now owns the malformed-envelope deadline partial at the existing `control-whole-envelope-validation` step. `envelope/malformed-wait-leaks-its-accepted-deadline` preserves the correct `malformed_envelope` rejection, `RUNNING`, the pinned Activation/batch, null live generation and every other observed fact, and changes only `acceptedDeadline` to the submitted value `5000`. The regression block pins both the single-field move and its distinction from the older W-1 acceptance failure, which removes the rejection and registers the malformed wait. R7-a6c remains a separate CX-6 rejection writer rather than being reused.

That closes K02-R9-01 itself. It does **not** establish that the full OA-5 zero-partial-state family or the neighbouring identity rows are complete; 012 requires a semantic correction to re-audit affected paths and the cumulative packet.

## Round-10 findings

### K02-R10-01 — P1 — the malformed-rejection OA-5 family is still only partly assertion-owned

**Affected material:** `tests/conformance/k0/coverage.ts`, `candidate.ts`, `scenarios.ts` (`control-whole-envelope-validation`), C7/C9 claims in `contract.md` and `public-fixture-specification.md`.

C10 correctly changes the coverage rule from “read the row's illustrative parenthetical” to “read the governing decision the row cites”. Applying that rule to OA-5 does not stop at the word `deadline`.

OA-5 states that a rejected Outcome creates no Effects, acknowledges no Events, commits no progress, accepts no emissions, and creates **no wait/deadline/readiness/next-state transition**. Row 3 cites OA-1–OA-6 and summarizes a failure partway through acceptance as leaving **zero partial state**.

The row-3 inventory now owns progress, emissions, acknowledgment, Effect intent and deadline. It still has no row-3 assertion-owned counterexample for the remaining OA-5 transition facts under a **correct rejection**:

- a malformed `await` must not install a wait/lifecycle transition;
- a rejected Outcome must not leave wait-ended readiness behind; and
- a malformed `continue`/other rejected Outcome must not commit its next-state transition.

This is not cured by the complete expected observation incidentally containing the right defaults. C9 says in terms that `forbids` prose, a neighbouring counterexample or an incidental complete-observation mismatch is not assertion-level evidence. The pre-existing `envelope/structurally-empty-wait-registered-because-it-has-a-deadline` is also not this partial: it turns the submission into an accepted wait and removes the rejection. A candidate can instead record the malformed rejection correctly while a wait/next-state writer has run too early.

The existing corpus already supplies strong schedules for two of the missing facts: the malformed future-deadline `await` can distinguish a correct rejection with leaked wait/lifecycle state, and the duplicate-emission envelope has a valid `next: continue` whose next-state writer must remain inert when validation rejects it. If readiness needs a sharper schedule to distinguish it honestly, add the smallest one rather than folding it into lifecycle or deadline. `waitEndedReadiness` is deliberately a separate field group in this packet because earlier reviews established that readiness can fail independently.

**Required outcome:** re-derive OA-5's zero-partial-state family at the whole-envelope-validation writer, not only its deadline member. Give every independently plausible remaining partial its own candidate-level owner (or a justified `shared` entry only when it is truly the same observable writer). Preserve R3-c4. Do not borrow the CX-6 row-7 writer.

**Impact:** C7 FAIL, C9 FAIL.

### K02-R10-02 — P1 — row 2 still under-covers the accepted Activation-exchange identity rule

**Affected material:** `tests/conformance/k0/scenarios.ts` (`identity-create-and-activation`), `coverage.ts`, `candidate.ts`, `fixture.ts` command surface, C7/C9 claims.

The accepted ID-9 decision distinguishes ordinary redelivery, takeover, stale-old-writer submission and the next semantic Activation. For takeover, the rule is not merely “same Activation ID + incremented epoch”: the replacement attempt keeps the **same immutable exchange input**, including the pinned Event batch. The canonical detail protocol says the same thing: delivery retries preserve dispatch input, and takeover cannot replace it with new mailbox content under the old Activation ID.

C10's takeover step already expects `dispatchedBatch: ["in-1"]` and its prose explicitly says the batch must stay pinned, but row-2 coverage owns only the Activation-ID half (R2-c1) and writer-epoch half (R2-c2). No violating transcript represents a candidate that keeps `act-1`, advances to epoch 2 correctly, but repins/replaces the batch. That is precisely the visible-but-unattributed shape C9 says does not count.

ID-9 case 3 is also present in the schedule — the old epoch submits after takeover and is rejected — but its counterexample is attributed only to R10-a/LP-1. Because §11 row 2 explicitly invokes ID-9 cases 2–3, row 2 needs an honest owner for that same observable fact, normally a justified `shared` link if it is truly identical. A neighbouring row-10 transcript with no declared row-2 relationship is not coverage under C9's own rules.

Finally, ID-9 case 1 / ID-3 ordinary dispatch redelivery is not representable at all: the command vocabulary has `dispatch` and `takeover`, but no redelivery of an unresolved dispatch preserving Activation ID, writer epoch and immutable input. If the accepted row-2/ID-3 decision is intentionally outside K0.2, record the governing assignment/exclusion; otherwise add the smallest deterministic schedule and candidate evidence. It cannot remain an implicit assumption while C9 claims assertion-granular coverage.

**Required outcome:** re-derive row 2 from ID-3/ID-4/ID-9 and B-1/B-2. At minimum own takeover input immutability and the case-3 stale-writer fact; account explicitly for ordinary redelivery instead of leaving it unrepresentable. Split independently violable ID, epoch and pinned-input facts rather than rebundling them.

**Impact:** C7 FAIL, C9 FAIL.

### K02-R10-03 — P1 — row 1's producer scope and accepted-receipt surface are not representable by the fixture

**Affected material:** `tests/conformance/k0/fixture.ts`, `protocol-vocabulary.ts`, `identity-create-and-activation`, receipt relation/comparison code, row-1 coverage and C7/C9 claims.

The accepted identity decisions make request/input identity **scoped**, not global. ID-2 binds input identity to authenticated producer namespace + destination + producer request key, and the detail protocol says a retried create uses the same **caller-scoped** request key. Two producers may therefore reuse the same raw key text without colliding.

The fixture comments call `requestKey` caller-scoped, but the command/event vocabulary carries no caller or producer namespace at all. Every current create/retry therefore occurs in one implicit scope. A candidate that incorrectly deduplicates raw request-key text globally can pass every row-1 transcript because the fixture cannot construct the counterexample. This is a missing observation/input surface, not merely a missing mutation.

The receipt surface has the same problem. ID-6/ID-7 define receipts/acceptance positions per accepted boundary and the runner claims its receipt bijection enforces ID-6/ID-7. Yet `Observation` has one overloaded `receipt` field, documented as the receipt returned by the most recent accepted Outcome while scenarios also use it for create; `accept_event` and `dispatch` steps simply retain an earlier create/Outcome receipt. There is no candidate-visible place for the accepted input-ingress or dispatch-intent receipt/acceptance identity. The bijection can prove sameness/difference only for tokens the scenario actually exposes; it cannot prove boundary-specific receipts that are absent from the observation model.

This matters to 001 K0 directly: K0 is required to resolve exact accepted IDs/receipts and exit with observable acceptance/rejection results at each boundary. It also matters to C7's explicit claim that candidate-minted receipt tokens are judged by the relations ID-6/ID-7 fix.

**Required outcome:** extend the smallest truthful fixture input/observation surface needed to express producer-scoped identity and the receipt-bearing accepted boundaries, without pinning opaque token spelling. Add a conforming cross-producer/same-raw-key case and a wrong globally deduplicating candidate. Reconcile which commands return or expose acceptance receipts/positions and test the ID-6/ID-7 relation at those actual boundaries. Preserve the per-family token separation from K02-R5-01.

If a particular accepted ID/receipt clause truly has no K0.2 observable case, record an explicit governed assignment; do not silently omit it while claiming row-level completeness.

**Impact:** C7 FAIL, C9 FAIL.

## Additional audit result: row 8

I applied the same decision-level check to row 8 because implementation-10 specifically identifies it as a likely parenthetical-shaped risk. I found no comparable new local blocker there. The K0-reachable “new work proposed in the completing Outcome” clause has explicit refusal, lifecycle, recorded-reason, progress, acknowledgment and Effect-intent owners. The distinct “previously owned Effect/child obligation” clause is explicitly assigned to K2.4 with CX-3's own reason that K1 without Effects satisfies it trivially. CX-4's unknown-work behavior becomes non-trivial with that later owned-work surface; I do not require K0.2 to fabricate external work that the accepted K1 boundary says does not yet exist.

This does not exempt row 8 from the next cumulative sweep if corrections alter its shared OA-5/Effect-refusal paths.

## Per-criterion verdicts

| Criterion | Verdict | Review basis |
|---|---|---|
| K0.2-C1 | **PASS** | The deterministic K0 trace remains coherent; the new findings concern the assertion inventory/surfaces outside the trace-specific proof. |
| K0.2-C2 | **PASS** | Delayed-Runtime / non-blocking scenario remains coherent. |
| K0.2-C3 | **PASS** | Independent ledger protections remain intact. |
| K0.2-C4 | **PASS** | Direct-baseline/shared-laboratory specification remains intact. |
| K0.2-C5 | **PASS** | Both public application shapes remain prepared without claiming E0 acceptance. |
| K0.2-C6 | **PASS** | The named unsafe controls remain semantically correct and implementation-neutral; K02-R9-01's deadline correction is sound. |
| K0.2-C7 | **FAIL** | K02-R10-01/-02/-03: the oracle still lacks required candidate-level discrimination/surface for several accepted assertions. |
| K0.2-C8 | **FAIL — BLOCKED_EXTERNAL** | Benchmark `main` remains `98756f8c10bd806125da8318f1a129bc030aca61`; its roadmap still says E0–E6 are planned, not implemented. |
| K0.2-C9 | **FAIL** | C10's new “read the governing decision” rule is not yet carried through rows 1–3. |

## External blocker

C8 remains a genuine external blocker, not an architecture ambiguity and not a reason to stop reviewing independent local fixture work.

- **Responsible actor:** benchmark repository owner.
- **Unavailable input:** accepted E0 fixture/config identities, raw observations, evaluator version and actual E0 decision at a pinned benchmark revision.
- **Unblock condition:** an accepted E0 deliverable/evidence record at a pinned benchmark revision, recordable in this repository and independently inspectable.

Arrokothi `main` remains `c079237ee7aff428481426f93e87a68b79f170d4`. Benchmark `main` remains `98756f8c10bd806125da8318f1a129bc030aca61`, whose `docs/roadmap.md` still states that E0–E6 are planned rather than implemented. No E0 acceptance is claimed or inferred. K0 remains open and K1.0 remains unreleased.

## Validation evidence

The implementation report records clean-C10 validation: typecheck exit 0; `npm test` 1438/1438; conformance 1329; SDK 22; builder-docs 26 files / 280 links / 38 imports; 473 K0 tests; architecture guards 79; 12/12 real-tree scenarios refused. I inspected those claims but did **not** rerun them. The GitHub connector exposes neither combined statuses nor workflow runs for C10.

## Verdict

**CHANGES REQUIRED**

K02-R9-01 is closed. Fix forward from C10; do not revert C10/H10. Preserve R3-c4, the g3/res-3 B-6 path-B correction, all accepted-deadline lifecycle transcripts, per-family token relations, prior split counterexamples and the semantic-deadline/physical-timer distinction.

The next correction should apply C10's own decision-level rule as a cumulative method, not as another one-field patch: complete OA-5's malformed-rejection partial-state family, repair row-2 ID-9 ownership/schedules, and make row-1 producer/receipt scope genuinely representable. Re-audit dependent rows after changing the command/observation surface, reconcile obligation/transcript counts and contract/specification claims, validate a clean payload, and produce the next administrative candidate/report.

Keep C8 `BLOCKED_EXTERNAL`. Do not self-accept, merge, close K0, or release K1.0.
