# Independent review — K0.2, round 1

## Reviewer, date, identity

- **Reviewer:** OpenAI ChatGPT, GPT-5.6 Sol, High reasoning.
- **Role:** independent reviewer. The verdict recorded here was reached before this later administrative repository update. This file transcribes that already-issued review; it does **not** review, amend, or accept the later K0.2 round-2 payload/candidate.
- **Review date:** 2026-09-11.
- **Governing base:** `c079237ee7aff428481426f93e87a68b79f170d4`.
- **Clean payload C1:** `9aa70a82f02d57b2658e0906af53dc31bc34e483`.
- **Reviewed candidate H1:** `6f162e5a8b6b5bb3b5c0b924e28a1ca4a02c33cf`.
- **Branch reviewed:** `codex/k0.2-public-controls-e0-gate`.
- **Benchmark revision inspected read-only:** `98756f8c10bd806125da8318f1a129bc030aca61`.

This record is intentionally bound to H1. It is being added after the branch advanced beyond H1 because the owner explicitly authorized the reviewer to transcribe the missing historical review record into the repository. Its presence in a later commit must not be treated as review evidence for H2 or any later candidate.

## Access and limitations

I reviewed through an authorized GitHub connector with read access to repository refs, commits, comparisons, files and the pinned benchmark repository material available through that connector. I inspected the exact base, C1 and H1 identities, the full cumulative candidate file set and relevant surrounding sources/tests, and the C1..H1 administrative delta.

I did **not** have a local checkout or shell in the review session and did not independently rerun `npm test`, typecheck, builder-doc checks, whitespace checks, or other reported commands. The implementation report's command results were therefore inspected evidence, not reviewer-rerun evidence. The source-level findings below do not depend on accepting those reported command results.

The original off-repository owner release message was not independently available through the repository connector. H1's repository records and the owner-provided handoff both represented K0.2 as explicitly released; I did not invent additional release provenance.

## Material inspected

I read the applicable repository instructions and governing development material, including the mental model, development front door, 006 development process, 007 work-packet ledger, 008 report/review format and 012 review methods. I also inspected the accepted K0.1 contract/worksheet, its acceptance/integration records, the K0.2 contract, public fixture specification, round-1 implementation report, full K0 fixture/candidate/test sources, and the pinned benchmark roadmap/current-state material relevant to E0.

I independently derived the K0 boundary obligations from the accepted K0.1 worksheet before reconciling them with K0.2's report and coverage claims. In particular, the accepted material requires more than row-number attribution: it includes create replay versus same-key/different-content conflict, Activation identity and authorized takeover semantics, whole-envelope acceptance/rejection behavior, exact wait/wake/deadline cases including W-8 case 6, terminal-disposition constraints, missing-code/resource holds and local-state freshness.

## Criterion verdicts

| Criterion | Verdict | Review basis |
|---|---|---|
| K0.2-C1 | **FAIL** | The positive K0 trace is useful, but the inherited §11 boundary obligations are not semantically covered in full. See K02-R1-01. |
| K0.2-C2 | **PASS** | The delayed-Runtime schedule demonstrates unrelated work completing while another native Runtime remains running, without misrepresenting the delayed Runtime as a Kernel wait. |
| K0.2-C3 | **FAIL** | The independent operation ledger can be rewritten through retained nested references, and its assertion can be silently skipped when the observer is omitted. See K02-R1-02 and K02-R1-03. |
| K0.2-C4 | **PASS** | The direct-baseline specification defines the shared sink/validators/inputs/human channel/limits and states allowed comparability differences at the specification level. |
| K0.2-C5 | **PASS** | Both public application shapes, ownership/control boundaries and claim-ledger preparation are specified without claiming benchmark execution or acceptance. |
| K0.2-C6 | **PASS** | The four Decision M-1 unsafe/state-loss control families are present, including the required cancellation assertions. |
| K0.2-C7 | **FAIL** | The real repository candidate refuses the public fixture, but the public oracle is not fail-closed because a ledger-only violation can escape when the independent observer is omitted. See K02-R1-03. |
| K0.2-C8 | **FAIL** | Required accepted pinned E0 benchmark evidence is unavailable. The packet therefore remains `BLOCKED_EXTERNAL` on this criterion. |

## Findings

### K02-R1-01 — P1 — §11 semantic coverage materially under-covers the accepted K0 boundary assertions

**Affected material:** `tests/conformance/k0/coverage.ts`, `tests/conformance/k0/coverage.test.ts`, `tests/conformance/k0/scenarios.ts`, `tests/conformance/k0/k0-trace.test.ts`, with the accepted K0.1 worksheet as the governing obligation source.

The round-1 coverage machinery establishes that rows 1–10 have prose, point to existing scenarios and agree with scenario-declared row numbers. That is useful bookkeeping, but it does not prove the full semantic sub-obligations accepted in K0.1 or require a distinguishing counterexample for each obligation.

Concrete omissions found in H1 include:

- row 1 does not distinguish an exact create replay from reuse of the same create/request key with different content, which must conflict rather than edit or replay;
- row 2 does not make the accepted Activation-ID distinctions and authorized takeover behavior observable, including same unresolved Activation identity with a new writer epoch where takeover applies;
- row 8 does not exercise rejection of completion while owned work remains unresolved;
- the exact W-8 case 6 boundary is intentionally omitted from `k0-trace.test.ts` and delegated to the stale-timer control, but that substitute is not equivalent. W-8 case 6 is the sharp **subscription-only wait with a deadline** case that exposed the prior protocol contradiction; the stale-timer scenario uses dependency waits and its wait-ended selections are not the same distinguishing case.

Because the K0.2 contract maps the inherited K0 exit obligations into this fixture through §11, structural row attribution is insufficient for C1.

**Required outcome:** re-derive all accepted §11 obligations and make the omitted semantic boundaries and their distinguishing counterexamples observable in the public fixture/coverage mechanism. The implementation mechanism and scenario count are implementation-owned; the review does not prescribe a patch shape.

**Impact:** K0.2-C1 FAIL.

### K02-R1-02 — P1 — the independent operation ledger can be rewritten through candidate-held nested references

**Affected material:** `tests/conformance/k0/operation-sink.ts`, `tests/conformance/k0/operation-sink.test.ts`.

H1 records an operation by freezing only the outer ledger entry while retaining nested values supplied by the caller/handler, and it returns the same result object that is stored in the ledger entry. The outer `Object.freeze` therefore does not make the historical observation independent: a candidate retaining a reference to nested request input, result, observation/error data, or another mutable nested object can mutate that reference after `attempt()` and thereby change what a later ledger read observes.

The round-1 immutability test checks mutation of the outer entry/property; it does not distinguish this retained-reference rewrite.

**Required outcome:** historical ledger evidence must be detached/immutable against later mutation through candidate-held references, with a test that actually performs such nested retained-reference mutations and proves the recorded history remains unchanged. Exact copy/freeze/API design remains implementation-owned.

**Impact:** K0.2-C3 FAIL.

### K02-R1-03 — P1 — a declared independent-ledger assertion fails open when its observer is omitted

**Affected material:** `tests/conformance/k0/fixture.ts`, `tests/conformance/k0/oracle-discrimination.test.ts`.

H1 makes the ledger-count observer optional and performs the ledger assertion only when both the step declares a ledger expectation and the caller supplied that observer. A scenario can therefore declare an independent-ledger expectation yet silently skip it under an invocation that supplies the sink without the observer.

That is a distinguishing failure, not merely an API nicety: the known effect-attribution violating transcript leaves the ordinary candidate observation conforming while making a sink attempt. The independent ledger is what exposes the violation. If that observation path is omitted silently, the public oracle can return PASS for behavior it is supposed to reject.

**Required outcome:** whenever a scenario declares an independent-ledger expectation, omission or unusability of the independent observer must fail closed or be structurally impossible. Add a distinguishing negative test covering the omission shape and the ledger-only violating behavior. Exact API design remains implementation-owned.

**Impact:** K0.2-C3 and K0.2-C7 FAIL.

## External E0 blocker

I independently confirmed that the pinned benchmark revision `98756f8c10bd806125da8318f1a129bc030aca61` exists and that its roadmap/current-state material still describes E0 as planned/unimplemented rather than supplying an accepted E0 fixture/evaluator/control evidence set.

Under 006, unavailable required cross-repository evidence keeps the dependent criterion and packet state `BLOCKED_EXTERNAL`. This is not an unresolved protocol/architecture decision and therefore does **not** convert this review into `BLOCKED — ARCHITECTURE DECISION`. It also does not prevent correction and independent review of the K0.2 fixture work that is separable from E0 execution/acceptance.

**Responsible actor:** benchmark repository owner.

**Unblock condition:** an accepted E0 deliverable/evidence set exists at a pinned benchmark revision and can be recorded and independently inspected here without self-granted acceptance.

## Validation evidence distinction

The H1 implementation report states that clean payload C1 passed typecheck and its reported test/document checks, including 1063 tests with zero failures. I did not independently rerun those commands. The three P1 findings above are based on inspected source/test semantics and concrete counterexamples, so their validity does not depend on a failed test run.

## Correction handoff

Correct the same released K0.2 packet; do not start or release a successor. The required outcomes are:

1. semantic coverage of the accepted §11 obligations and their distinguishing cases rather than row-number attribution alone;
2. an independent operation ledger whose historical records cannot be rewritten through candidate-held nested references;
3. fail-closed independent-ledger observation whenever a scenario declares that expectation.

Preserve K0.2-C8 as `BLOCKED_EXTERNAL` until genuine accepted pinned E0 evidence exists. Apply 006/012 to the correction, produce a newly validated payload and administrative candidate/report, and preserve this H1 review as immutable history. This review does not authorize self-acceptance, merge, K0 closure, or release of K1.0.

## Final outcome

The reviewed candidate is exactly H1 `6f162e5a8b6b5bb3b5c0b924e28a1ca4a02c33cf`. K0.2-C1, C3 and C7 fail on local P1 findings, and C8 remains externally unavailable. No unresolved architecture decision requires the architecture-blocker outcome.

**CHANGES REQUIRED**
