# Implementation report — K0.2, round 15

## Identity

- Packet/parent: K0.2 / K0; [contract.md](contract.md), revision 15.
- Governing base: `c079237ee7aff428481426f93e87a68b79f170d4`.
- State: **WAITING_FOR_REVIEW**, accountable **Round 16** against H15. No K0.2 acceptance is granted here.
- Owner release: explicit 2026-09-11 release, followed by the current fix-forward instruction for
  every Round-15 blocker and C15/H15. The owner subsequently stated E0 was finished and asked for a
  fresh benchmark check; the independently inspected owner decision below resolves the external
  dependency. Correction resumes the same released packet under 006, with requirements unchanged.
- Prerequisite K0.1 accepted H12 `bab7bf6635781e6d2f9b0e8e333f58440ae0b047`; A12
  `679734a1777ce087c62305d7665071687d8f1cb6`; integration
  `42731300266eea00a9a24d867d5e82d9887c280d` ([receipt](../K0.1/integration-01.md)).
- Branch: `codex/k0.2-public-controls-e0-gate`; configured remote
  `https://github.com/ArrokothI/Agent_SDK.git`, unchanged.
- Previous C14 `377bcbeda14b16bfebd325064db1d2617feedc4a`; reviewed H14
  `e2677451ad76caadfcac73473e22d6444f611b83`.
- Fetched and fast-forwarded to reviewer A15 **`8dce735fab6012fb562cfe2d73787a74de2c9d17`**;
  [review-15.md](review-15.md), CHANGES REQUIRED. No C13/H13/C14 revert or published rewrite.
- **Clean payload C15: `839f1619bc9a628c55a9c60eeef01992727cc613`.** All six final deterministic commands ran on this
  exact commit, clean before and after each command.
- **H15:** the direct child of C15 containing this report; full SHA and verified remote head are
  supplied in the external handoff after push. Push status at report construction: pending handoff.
- Exact C15..H15 administrative allowlist: this report; only the authoritative K0.2 row of
  `docs/development/007-work-packets.md`; and the eight output-only files under `validation-15/`
  listed below. No script, fixture, evaluator rule, threshold, test or configuration first appears in H15.

## Changes and coverage

All substantive changes are fixture/coverage/development documentation. Kernel, Runtime/Driver,
SDK, dependencies, canonical architecture and accepted K0.1 decisions are unchanged. The current
0.8.x implementation continues to refuse the target asynchronous fixture; local PASS is fixture
validation, not a K1 implementation result.

- **Cumulative base→C15:** 72 files, +35246/−6. The full K0.2 fixture, historical records/reviews,
  logs and authoritative ledger row; no scope outside `tests/conformance/k0/`,
  `docs/development/work/K0.2/` and 007.
- **A15→C15 correction:** 13 files, +1351/−207. Exact files:

- `docs/development/work/K0.2/cited-decision-audit-15.md`
- `docs/development/work/K0.2/cited-decision-reconciliation.md`
- `docs/development/work/K0.2/contract.md`
- `docs/development/work/K0.2/public-fixture-specification.md`
- `tests/conformance/k0/candidate.ts`
- `tests/conformance/k0/cited-decisions.test.ts`
- `tests/conformance/k0/cited-decisions.ts`
- `tests/conformance/k0/clause-refinements.ts`
- `tests/conformance/k0/coverage.ts`
- `tests/conformance/k0/fixture.ts`
- `tests/conformance/k0/refusal.test.ts`
- `tests/conformance/k0/scenarios.ts`
- `tests/conformance/k0/selector-isolation.test.ts`

[The complete decision audit](cited-decision-audit-15.md) covers every decision cited by all ten §11
rows, including retained grouping reasons and the full C14 counterexample sweep. The preserved C14
inventory now has **455 references across 51 decisions**, resolving to **269 obligations = 126 scenario
+ 4 shared + 20 corpus + 119 assigned**. There are **126 violating transcripts, 26 atomicity notes,
15 scenarios / 137 steps**. Per-row counts: 20, 22, 27, 21, 100, 5, 28, 14, 26, 6.

The 34 authored independence refinements separate independently encoded fields, acceptance paths,
clock roles, receipt coordinates, recovery outputs and corpus invariants. Each assignment names
its absent observation surface and actual first 007 owner. Independent negative tests reject
re-bundling even without using the inventory seal. Human decomposition remains reviewable work;
no test claims that matching labels or a recomputed digest proves semantic completeness.

The two new candidate discriminators cover normal Outcome acceptance after ordinary redelivery
and forbidden progress installation on cancellation-rejection replay. The first adds a four-step
schedule through existing vocabulary. An exact structural comparison against A15 verified all 14
prior scenarios and all 133 prior expected steps unchanged. Existing C13 epoch policies, exchange-local
ordinals, Activation-ID/epoch port adaptation, R5-c2/c2b/c2c and all prior closed corrections remain.

### 012 semantic correction closure and cumulative self-review

Sources: all ten row citation sets and their 51 decisions, with 007 implementing owners. Producers:
three selector mutations now take a coherent B-6 branch for their incorrect Boolean eligibility;
empty-batch and premature-acknowledgment constructions preserve unrelated record invariants.
Validators: existing field-complete oracle unchanged; new selector isolation checks enforce W-3 in
both directions and B-8 lifecycle/retirement provenance. Consumers: coverage, clause inventory,
refinement binding, scenario attribution, refusal totals and public specification reconciled.
Tests: candidate discrimination, separate negative corpus assertions, old-mutant rejection and
independent-owner collapse controls. Documentation: C9 history/explanation, complete audit, current
public totals and this evidence/status record. No scenario-only helper test is substituted for a
candidate-level discriminator.

The cumulative C1–C9 self-review follows the original trace, delayed Runtime, independent sink,
shared laboratory/baseline contract, application shapes, unsafe/state-loss controls, relational
oracle and refusal, external E0 evidence, and the full ownership inventory. Full applicable
validation is below. Provider/model canaries, behavioral evals, Docker durability/isolation and
successor gates are excluded: this change touches no provider, Runtime implementation or persistent
candidate and makes no such claim. Third-party incorporation: **none**; benchmark material is
inspected/pinned evidence, not copied/adapted implementation or a new dependency.

### Finding reconciliation

| Finding | Implementer disposition and evidence |
|---|---|
| K02-R15-01 (P1) | Addressed for independent review. R5-k1 now reports READY/null/g2 event-readiness for the wrong-ID match; R5-k1b reports WAITING/g2/no-readiness for the first-kind-only miss. They preserve independent lifecycle invariants. The isolation guard rejects both old C14 mutations; normal oracle discrimination still rejects corrected candidates at steps 8/9. |
| K02-R15-02 (P1) | Addressed for independent review through the entire 51-decision audit. B-1 membership and positive bound have different corpus owners. W-9 minted identity, destination, semantic class and exact generation correlation have four different K1.3 assignments. The other 32 refinement groups and additional source reconciliations are recorded, not limited to reviewer examples. |
| K02-R14-01 | Carried as NOT CLOSED by A15; the two residual blockers above and the full reconstruction are now offered for closure by Round 16. This report does not independently close it. |
| K02-R13-01 / K02-R13-02 | Preserve A14/A15 CLOSED dispositions. Exchange-scoped epoch relation/port adaptation and split R5-c2/c2b ownership remain unchanged, with all policy and shortcut discrimination controls passing. |
| Older accepted corrections | Preserve the dispositions referenced by A15 and prior reviews; only concrete dependent evidence defects listed here change. No normative rule is reverted. |
| C8 external blocker | Resolved evidence dependency after the owner's follow-up: exact accepted E0 H, independent ACCEPT and later owner acceptance/integration are bound below. Offered as C8 PASS to the independent K0.2 reviewer; not inferred from mechanical PASS. |

**Self-found defects, separate provenance:** ANY-OF selector mutation had the same contamination;
empty-batch refusal lacked a coherent no-dispatch branch; premature acknowledgment double-booked an
Event as queued and acknowledged. Corrected in C15. The inventory sweep separately found stored
input content hidden behind retained IDs, acceptance after ordinary redelivery absent from the
schedule, and cancellation replay progress protection missing despite rejection protection.
Those receive explicit assignments or new candidate evidence. A stale fixture comment assigning
required Effects to K2.4 was corrected to K2.3. The initial uncommitted smoke test caught the expected
inventory-seal update, a short corpus note and a stale refusal-count assertion; those were corrected
before C15. They are not final validation failures.

K0.2-SELF-01 remains assigned to its separate packet as recorded in prior reports, unchanged.
The strongest remaining local risk is human semantic decomposition/retained-group reasoning,
which independent Round 16 must assess; the guards expose drift but cannot certify that reasoning.

## Validation and interpretation

All commands ran from `/Users/rex-shih/Documents/Codex/projects/agent-kernel` on exact clean C15.
Node v25.2.1; npm 11.6.2; TypeScript 5.9.3; macOS 26.6.2 arm64. Logs contain UTC times, commands,
environment, C15, exit status and clean-tree checks. No provider/model/network service was used by
these six commands. Every test passed, with zero failures, cancellations, skips or TODOs.

| Command | Result / count | Immutable raw output |
|---|---|---|
| `npm run typecheck` | Exit 0 | [01](validation-15/01-typecheck.log) |
| `npm test` | 1753 tests / 270 suites | [02](validation-15/02-test.log) |
| `npm run test:conformance` | 1644 tests / 252 suites | [03](validation-15/03-conformance.log) |
| `node --test --experimental-strip-types tests/conformance/k0/*.test.ts` | 788 tests / 59 suites | [04](validation-15/04-k0.log) |
| `npm run test:sdk` | 22 tests | [05](validation-15/05-sdk.log) |
| `npm run check:builder-docs` | 26 Markdown files / 280 links and anchors / 38 imports | [06](validation-15/06-builder-docs.log) |

The suites overlap; do not sum these counts. K0 increases by 87 from C14's 701; the full-suite
non-K0 count remains 965. Logs were captured outside the tree and copied verbatim only after all
clean-C commands completed. The external inspections below are read-only evidence checks, not K0
validation or a local E0 gate rerun.

| Output-only file | SHA-256 |
|---|---|
| [validation-15/01-typecheck.log](validation-15/01-typecheck.log) | `a6218e3860a4fd25369b970443358a9bc59d2f3a926f7bb43b7af68961df611c` |
| [validation-15/02-test.log](validation-15/02-test.log) | `22dc16ea09d07b511f0edf8098d34d9c0b018914cdba8d21ecfbe8873299f22d` |
| [validation-15/03-conformance.log](validation-15/03-conformance.log) | `7f4aadbea23a2ef6efdedb747edcb03d41d0fe29542f9fad43edbebd8b5fead1` |
| [validation-15/04-k0.log](validation-15/04-k0.log) | `25742e6e579a1126323d21d6292674cfc76fa95fc6a1c96813af579cf56d4776` |
| [validation-15/05-sdk.log](validation-15/05-sdk.log) | `0726b1b0ea567ef2eafc71dec9a1c89ca90d22ac00a6138adef69ceff0174838` |
| [validation-15/06-builder-docs.log](validation-15/06-builder-docs.log) | `92b68f721d39bb46b6e365b1e4a81a80020331b6aef34b59e93aa69e91723c7a` |
| [validation-15/07-benchmark-owner.log](validation-15/07-benchmark-owner.log) | `2010cd4f31d6becaa4b2e26451aed550aa0a6c366cdfd6ad4c6042524248bd40` |
| [validation-15/08-benchmark-accepted.log](validation-15/08-benchmark-accepted.log) | `889397d7be477aa94727735301bfc17120a17f9480557eabb38bc32b636036b8` |

### C8: actual accepted E0, distinct from local fixture PASS

The initial inspection in [07](validation-15/07-benchmark-owner.log) saw the old main and pending
branch records. After clean C15 validation the owner reported E0 finished and requested a fresh
check. [08](validation-15/08-benchmark-accepted.log) records the newly fetched main, acceptance chain,
owner receipt, complete evidence record, raw validation/identity outputs and verification of all
12 committed E0 attachment digests. This later administrative binding supersedes the C8 blocked
snapshot in C15's audit/contract/specification, without changing requirements or rewriting that
already-validated payload.

- Fresh benchmark main: `4d83c245c8f6bb0886c1035ec1c6bba3f91f0ddd`.
- E0 payload C: `516e77ff2f3cd93eb407990040259a7524802372`.
- **Accepted E0 H: `26d274fad53b2aa4fc2c7f596cae52e072cd24b5`.**
- Independent ACCEPT A: `ac1445fb8144ffab8a9153b243d4b9237d1927b0`,
  [review-04.md](https://github.com/ArrokothI/benchmark/blob/ac1445fb8144ffab8a9153b243d4b9237d1927b0/docs/development/work/E0/review-04.md).
- **Actual owner decision:** ACCEPT E0 and integrate that H, recorded at
  `9b816d47e83ff210fa32400aa91994f8055138d5`,
  [integration-04.md](https://github.com/ArrokothI/benchmark/blob/9b816d47e83ff210fa32400aa91994f8055138d5/docs/development/work/E0/integration-04.md).
  The receipt records explicit repository-owner instruction on 2026-09-12. The integration point
  is A via fast-forward. H→A contains only `review-04.md`; A is an ancestor of current main.
- Fixture: `e0-public-controls/4`, protocol `e0-public-controls-v1`;
  `e0-fixture-set-v1` = `sha256:f4f3b4932b8375f907cf3ae93ec4c37c5b6e897b6a5666609484db7c37e937a0`.
- Configuration/observation policy: `e0-observation-policy-v1` =
  `sha256:9a24863833807db998c2e6a198e82c10cfba77504d8f61e3ebc27ba2623b8ccf`.
- Freshness reference identity: `e0-private-corpus-v1` =
  `sha256:db65b91cc597ce6b077f1a417eb516a489a40aaddb8b5010db9e512050ae28f5`, 197 tracked files.
  No private content or file list is copied. The independent review accepts the declared corpus
  scope and records the non-blocking distinctiveness limitation.
- Evaluator: `e0-gate-v1`; freshness check `e0-freshness-v3`; deterministic, no semantic judge.
- [Pinned evidence record](https://github.com/ArrokothI/benchmark/blob/26d274fad53b2aa4fc2c7f596cae52e072cd24b5/fixtures/e0/evidence-record.json)
  and [raw-output manifest](https://github.com/ArrokothI/benchmark/blob/26d274fad53b2aa4fc2c7f596cae52e072cd24b5/docs/development/work/E0/validation-04/MANIFEST.md).
  Raw `02-npm-run-validate-e0.txt`: SHA-256
  `07d440f77c30167d1cc303afe97df4c0fcef08a6776e61d55bb8e33da0bf6e0d`;
  raw `08-identity-recomputation.txt`: SHA-256
  `74290c7908def43bc85aa984d0ca8519124640ccf6034ba7db62cecefaf79f39`.
  Both are reproduced in inspection output 08, and all twelve public raw attachment digests match.

The accepted H's `ownerDecision.state: pending` is intentionally immutable historical content.
The later owner receipt explicitly supersedes its status without editing reviewed evidence. C8
is satisfied by that actual later decision plus the pinned fixture/config/raw/evaluator identities,
not by the old branch, a commit message, independent ACCEPT alone, or mechanical PASS. No benchmark
file was modified and no benchmark test was rerun in this correction. E0 remains fixture preparation;
no execution-system quality, model, durability, containment or comparative claim follows.

### Cumulative criterion assessment (implementer, not acceptance)

| Criterion | Assessment and basis |
|---|---|
| C1 | PASS offered: original K0 public trace preserved; existing protocol covers the added redelivery schedule. |
| C2 | PASS preserved: delayed Runtime and independent second Execution unchanged. |
| C3 | PASS preserved: independent sink and operation attribution unchanged. |
| C4 | PASS preserved: baseline/shared laboratory contract unchanged. |
| C5 | PASS preserved: two public application shapes unchanged; external preparation separately pinned. |
| C6 | PASS preserved: every prior unsafe/state-loss control retained; corrected and new candidates discriminate their actual defect. |
| C7 | PASS preserved: all conforming epoch policies, violating epoch relations, opaque ID adaptation and target refusal pass. |
| C8 | PASS offered: actual owner-accepted E0 H and all required evidence identities bound above. External dependency no longer blocked. |
| C9 | PASS offered: full assertion independence audit, truthful assignments, coherent selectors, separate corpus evidence and omission/re-bundling guards; independent semantic review pending. |

## Handoff

H15 is ready for **accountable Round-16 independent review**. Review cumulative base→H15 and
A15→C15, verify the exact ten-file C15→H15 administrative allowlist, and reconcile both P1s and
K02-R14-01 independently. The external handoff supplies C15/H15/advertised-remote SHAs after push.
No self-acceptance, K0.2 merge, K0 closure, K1.0 release or successor packet. E0 owner acceptance
resolves only the external evidence dependency; it does not accept this local candidate.
