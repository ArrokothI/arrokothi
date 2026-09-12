# Independent review — K0.2, round 2

## Reviewer, date, identity

- **Reviewer:** OpenAI ChatGPT, GPT-5.6 Sol, High reasoning.
- **Role:** independent reviewer. I did not implement C2/H2.
- **Review date:** 2026-09-11 (America/New_York).
- **Governing base:** `c079237ee7aff428481426f93e87a68b79f170d4`.
- **Previously reviewed H1:** `6f162e5a8b6b5bb3b5c0b924e28a1ca4a02c33cf` — round 1 `CHANGES REQUIRED`.
- **Corrected clean payload C2:** `8291da56d228997b736665d9c57dd22237aa95d7`.
- **Reviewed candidate H2:** `60a05f822b9415382653e286be1189ec0a01e472`.
- **Branch reviewed:** `codex/k0.2-public-controls-e0-gate`.
- **Benchmark revision inspected read-only:** `98756f8c10bd806125da8318f1a129bc030aca61`.

This review is bound to H2 exactly. The later reviewer-provenance commit `9c63b2c1064747b3c00594584d910f30852d2a18`, which adds `review-01.md`, has H2 as its direct parent and is not part of H2's candidate. It does not alter the payload or the round-2 verdict below.

## Access and validation limits

I reviewed through the authorized GitHub connector: exact refs/commits, commit comparisons, repository files, the cumulative H1→C2 correction, C2→H2 administrative delta, and the pinned benchmark repository. I had no local checkout of this repository and did not independently rerun `npm test`, typecheck, builder-doc checks, whitespace checks or the implementer's mutation runs. GitHub exposes no status checks or workflow runs for C2 through the available connector, so the report's `1185 pass / 0 fail`, `1076` conformance and other command results remain implementer-reported evidence rather than reviewer-rerun evidence.

For finding K02-R2-02 only, I used a standalone Node language-semantics probe reproducing the checked-in `snapshot`/`deepFreeze` algorithm on a JSON object containing an own `"__proto__"` member. That was not a repository test run; it was a minimal JavaScript counterexample to the inspected source.

## Identity and correction-delta verification

The correction history is linear:

- H1 → C2 is one payload commit. The cumulative correction touches the K0.2 contract/specification and the K0 conformance fixture/tests; no unrelated production Kernel implementation is introduced.
- C2 → H2 is one administrative commit containing only `docs/development/007-work-packets.md` and `docs/development/work/K0.2/implementation-02.md`. No payload rides in H2.
- Repository `main` remains the governing base `c079237ee7aff428481426f93e87a68b79f170d4`.

I reconciled the correction against the accepted K0.1 worksheet rather than treating `implementation-02.md` as proof. In particular I rechecked the newly covered create/Activation identity cases, whole-envelope refusal, W-8 case 6 and B-7 paths, completion/terminal-ingress material, obligation-level coverage, interaction checks, operation-sink independence and fail-closed ledger observation.

## Round-1 finding dispositions

### K02-R1-01 — §11 semantic coverage under-covered the accepted K0 boundary assertions — **CLOSED as an under-coverage finding**

C2 materially rebuilds this area. The former row-number map is replaced by obligation-granular coverage; the missing create conflict, Activation identity/takeover, whole-envelope partway failure, malformed wait, W-8 case 6, B-7 path A, terminal ingress and other neighboring obligations now have explicit evidence or an explicit assignment with a reason. The exact subscription-only deadline case is present with an empty dependency list and a bound-1 B-7 timeout member, rather than being substituted by the dependency-based stale-timer control.

The correction also adds counterexamples tied to the step where an obligation lives and corpus-level interaction checks. That closes the original *under-coverage* defect. However, one newly added completion counterexample over-specifies the governing protocol and is a new P1 finding, K02-R2-01 below.

### K02-R1-02 — retained nested references could rewrite ledger history — **CLOSED for the reviewed retained-reference defect**

C2 no longer stores the caller's request/result objects directly. For ordinary E-1 arrays and plain objects, `snapshot()` recursively creates separate values, the stored entry is recursively frozen, and `attempt()` returns a separate result copy. The new tests actually mutate request input, nested input, arrays, returned result/error objects and a handler-reused result object.

That closes the H1 retained-reference attack. A distinct value-preservation/immutability defect exists for a valid object member named `"__proto__"`; that is K02-R2-02 below.

### K02-R1-03 — ledger assertions failed open when the observer was omitted — **CLOSED**

`runScenario` now accepts the complete `OperationSinkBundle`; the ledger observer is no longer an optional companion field. More importantly, the runtime path also fails closed: a missing/non-function observer or a non-numeric count produces an assertion failure instead of skipping the expectation. The negative tests exercise the known ledger-only violation and also require a conforming transcript to fail when the observer is unusable, while the same conforming transcript passes with a proper bundle.

## Round-2 findings

### K02-R2-01 — P1 — the completion control invents a rejection-reason distinction that the accepted K1 protocol does not require

**Affected material:** `tests/conformance/k0/scenarios.ts`, `tests/conformance/k0/candidate.ts`, `tests/conformance/k0/coverage.ts`, `docs/development/work/K0.2/public-fixture-specification.md`, and the C6/C7/C9 claims built on them.

The new `control-completion-obligations` step submits an Outcome that both proposes an Effect and requests `complete`. It expects the exact semantic answer to be a `malformed_envelope` rejection whose reason names the completion obligation. The violating transcript `completion/rejected-for-the-wrong-reason` changes only that reason to `"Effect proposals are not supported before K2"`, and C2 requires the oracle to reject this transcript as wrong.

That counterexample is not wrong under the governing accepted worksheet.

Accepted CX-3 says a completing Outcome must have no newly proposed Effects and must have every previously-owned required Effect/child obligation accounted for, but it immediately records that **K1 without Effects satisfies the owned-obligation check trivially and K2 is where it becomes non-trivial**. Accepted EF-1/EF-2 independently require every K1 Outcome proposing an Effect to be explicitly refused as a whole envelope during validation, before any Effect intent exists. §11 row 4 likewise requires a recorded inspectable whole-envelope refusal for a proposed Effect; it does not require a second, completion-specific rejection classification or reason.

Therefore a K1 candidate that receives this exact `complete + Effect` envelope and rejects it atomically with an inspectable reason equivalent to “Effect proposals are not supported before K2” satisfies EF-1/EF-2 and prevents the forbidden completion. C2 nevertheless labels that behavior a violation and fails it solely because the reason does not prove a separate completion check. The public fixture thus rejects a semantically conforming K1 transcript and turns a non-observable internal distinction into a normative observable requirement.

The explicit assignment of the genuinely non-trivial *previously-owned* obligation to K2.4 is defensible and follows CX-3. The defect is the additional claim that K0/K1 must expose a distinct completion-specific reason for the newly proposed Effect case.

**Required outcome:** align the completion control, coverage entry and counterexamples with the accepted CX-3/EF-1/EF-2 semantics. Do not make a special rejection reason or internal validation ordering observable unless a governing canonical decision actually requires it. Preserve the real observable obligation — the completing envelope must not be accepted with forbidden/unaccounted work — and keep any currently unobservable previously-owned-work rule honestly assigned rather than fabricating evidence for it. Every retained counterexample must represent behavior the governing protocol actually forbids.

**Impact:** K0.2-C6 FAIL, K0.2-C7 FAIL, K0.2-C9 FAIL.

### K02-R2-02 — P1 — `snapshot()` is not a value-preserving immutable snapshot for every valid E-1 object member name

**Affected material:** `tests/conformance/k0/operation-sink.ts`, `tests/conformance/k0/operation-sink.test.ts`.

The accepted E-1 value model permits JSON objects whose member names are arbitrary well-formed strings. `"__proto__"` is therefore a valid object member name; nothing in E-1/E-2/E-7 excludes it.

C2's `snapshot()` creates an ordinary `{}` and copies members with `copy[key] = snapshot(member)`. For an own data property named `"__proto__"`, that assignment invokes the inherited legacy `__proto__` setter instead of creating an own data property. A valid input such as the result of `JSON.parse('{"__proto__":{"x":1},"safe":2}')` is therefore recorded incorrectly: the own `"__proto__"` member disappears from `Object.keys`/JSON serialization and its copied value becomes the snapshot object's prototype.

The immutability claim also fails for that reachable value. `deepFreeze()` freezes the wrapper and recursively walks `Object.values(value)`, which does not include the prototype. The standalone reproduction of the checked-in algorithm showed the copied object had no own `"__proto__"` property, its prototype carried `x = 1`, the prototype was not frozen, and `Object.getPrototypeOf(snapshot).x = 99` remained possible after `deepFreeze()`.

This is not merely an exotic unsupported JavaScript object: the source value is ordinary JSON data permitted by the accepted boundary-value model. The independent ledger therefore does not faithfully record every valid attempted input and its returned observation surface is not deeply immutable for every accepted value shape. The new retained-reference tests use ordinary keys and do not distinguish this case.

**Required outcome:** make the ledger snapshot preserve every valid E-1 object member as its own data, with no key-dependent prototype semantics, and ensure every value reachable through the stored observation is detached/immutable as claimed. Add a distinguishing valid-boundary test that would fail the C2 implementation rather than merely testing the common-key cases.

**Impact:** K0.2-C3 FAIL.

## Per-criterion verdicts

| Criterion | Verdict | Review basis |
|---|---|---|
| K0.2-C1 | **PASS** | The deterministic 001 trace remains complete, and the exact W-8 case-6 shape now exists separately rather than being substituted by the stale-timer case. |
| K0.2-C2 | **PASS** | The scheduled delayed-Runtime scenario still demonstrates another Execution reaching completion while the first Activation remains unresolved and never invents a Kernel wait. |
| K0.2-C3 | **FAIL** | The retained-reference defect was substantially corrected, but the snapshot is not faithful/deeply immutable for the valid `"__proto__"` member case. K02-R2-02. |
| K0.2-C4 | **PASS** | The direct-baseline fairness/shared-instance specification remains intact; the correction does not weaken it. |
| K0.2-C5 | **PASS** | Both public application shapes and ownership/claim preparation remain specified without claiming E0 execution or acceptance. |
| K0.2-C6 | **FAIL** | The M-1 controls and W-8 case 6 are present, but the added completion control declares canonically permitted K1 refusal behavior to be a failure. K02-R2-01. |
| K0.2-C7 | **FAIL** | Refusal and fail-closed ledger handling are sound, but oracle discrimination is not semantically valid if a conforming K1 transcript is intentionally classified as a violation. K02-R2-01. |
| K0.2-C8 | **FAIL — BLOCKED_EXTERNAL** | Accepted pinned E0 evidence still does not exist at the inspected benchmark revision. |
| K0.2-C9 | **FAIL** | The obligation-level machinery is structurally much stronger, but one of its required “counterexamples” is not a protocol violation; mechanical rejection at the right step cannot convert a conforming behavior into valid evidence. K02-R2-01. |

## External E0 blocker

The benchmark repository's `main` still points exactly to `98756f8c10bd806125da8318f1a129bc030aca61`. At that revision `docs/roadmap.md` still says E0–E6 are planned and not implemented and describes E0 as future fixture/ownership/claim/baseline/control work.

K0.2-C8 therefore remains legitimately `BLOCKED_EXTERNAL`: responsible actor is the benchmark repository owner; unblock requires an accepted E0 deliverable/evidence set at a pinned benchmark revision that this repository can record and an independent reviewer can inspect. Nothing in this review grants or infers E0 acceptance.

This external blocker is not an unresolved architecture decision. It does not erase the two local P1 findings above, and it does not justify the `BLOCKED — ARCHITECTURE DECISION` review outcome.

## Validation-evidence distinction

`implementation-02.md` reports successful C2 validation including typecheck, 1185 tests with zero failures, 1076 conformance tests, builder-doc checks and mutation probes. I did not independently rerun those repository commands, and no GitHub status/workflow evidence for C2 is exposed through the available connector.

Both round-2 findings are static/source-level counterexamples. K02-R2-01 follows directly from the accepted CX-3/EF-1/EF-2 semantics versus the oracle's deliberately rejected transcript. K02-R2-02 follows from the checked-in JavaScript copy algorithm and the accepted E-1 object model, with the JavaScript behavior separately reproduced in a minimal probe. A green test suite that omits these distinguishing cases does not discharge either finding.

## Correction handoff

Correct the same released K0.2 packet; do not start or release a successor.

1. **K02-R2-01:** remove the invented completion-specific rejection-reason requirement and ensure the completion/coverage/oracle material judges only distinctions the canonical K1 protocol makes observable. Keep genuine later owned-work semantics explicitly assigned until they can exist.
2. **K02-R2-02:** make independent-ledger snapshots faithful and immutable for the complete accepted E-1 object-key space, including `"__proto__"`, with a distinguishing regression test.

Reconcile the neighboring contract/specification, coverage map, counterexamples and interaction claims after those corrections rather than patching only one assertion. Preserve C8 as `BLOCKED_EXTERNAL` until accepted pinned E0 evidence really exists. Produce a newly validated clean payload and administrative candidate/report under 006/008/012. Do not self-accept, merge, close K0 or release K1.0.

## Final outcome

H2 `60a05f822b9415382653e286be1189ec0a01e472` is not acceptable. The three round-1 defects are materially addressed, but the correction introduces two local P1 failures: a semantically over-constrained completion oracle and a non-value-preserving/non-deeply-immutable ledger snapshot for a valid boundary object key. C8 also remains externally blocked.

**CHANGES REQUIRED**
