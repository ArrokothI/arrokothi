# Independent review — K0.2, round 4

## Reviewer, date, identity

- **Reviewer:** OpenAI ChatGPT, GPT-5.6 Sol, High reasoning.
- **Role:** independent reviewer. I did not implement C4/H4.
- **Review date:** 2026-09-12 (America/New_York).
- **Governing base:** `c079237ee7aff428481426f93e87a68b79f170d4`.
- **Previously reviewed H3:** `b9b54a84393dde11b45c2395fec04f6130a3b0b2` — round 3 `CHANGES REQUIRED`.
- **Round-3 review record:** `cec66740c8b749c0706ddd45a0ac0294c619f957` (`review-03.md`).
- **Corrected clean payload C4:** `e2721ddf30416454ddba73a10ae509190e68cbc4`.
- **Reviewed candidate H4:** `ed438e88173e8f7306dfdfb16c290ea40fa0a0fd`.
- **Branch reviewed:** `codex/k0.2-public-controls-e0-gate`.
- **Benchmark revision inspected read-only:** `98756f8c10bd806125da8318f1a129bc030aca61`.

This review is bound to H4 exactly. The reviewer-record commit that contains this file is administrative provenance and is not part of H4.

## Access and validation limits

I reviewed through the authorized GitHub connector: exact refs/commits, reviewer-A3→C4 correction delta, C4→H4 administrative delta, the governing K0.1 worksheet, C4 contract/specification, observation vocabulary, scenarios, coverage map/tests, counterexample corpus, report, and the pinned benchmark repository.

I had no local repository checkout and did not independently rerun the implementer's repository commands. GitHub exposes no status checks or workflow runs for C4 through the available connector. The report's typecheck/test/conformance/SDK/architecture/builder-doc results are therefore implementer-reported validation rather than reviewer-rerun evidence.

## Identity and correction-delta verification

The round-4 history is clean and linear:

- `cec66740c8b749c0706ddd45a0ac0294c619f957` → C4 is one correction commit touching 14 K0.2 contract/specification/conformance files.
- C4 → H4 is one administrative commit containing only `docs/development/007-work-packets.md` and `docs/development/work/K0.2/implementation-04.md`. No payload rides in H4.
- Repository `main` remains the governing base `c079237ee7aff428481426f93e87a68b79f170d4`.
- Prior review records remain historical provenance.

I do **not** recommend reverting C4. The round-3 concrete blind spots are materially improved: readiness is now observable, retained Effect intents are observable, LP-1 has its own stale-local-state schedule, W-1 grammar cases are submitted through the candidate port, and the runner correctly stops pinning arbitrary non-canonical reason text. Those are good forward corrections. The findings below should be fixed on top of C4.

## Round-3 disposition

### K02-R3-01 — semantically atomic coverage — **PARTIALLY CLOSED; systemic finding remains open**

C4 closes the four concrete examples from review-03:

- W-1 selector grammar is no longer helper-only;
- B-8's phantom/second readiness has an observation surface;
- retained Effect intent/proposal binding has an observation surface;
- LP-1 now has a stale-writer-epoch scenario and counterexample of its own.

The added `shared` evidence form, reverse row-attribution check, and no-counterexample-double-duty guard are also useful. However, the contract's own rule is stronger: **two clauses are separate assertions whenever a plausible implementation can get one right and the other wrong.** C4 did not apply that rule consistently to older entries. K02-R4-02 below records the remaining systemic defect.

## Round-4 findings

### K02-R4-01 — P1 — the new W-1 subscription test invents an empty-string-invalid rule that the accepted protocol deliberately leaves implementation-owned

**Affected material:** `tests/conformance/k0/protocol-vocabulary.ts`, `scenarios.ts`, `candidate.ts`, `coverage.ts`, `rule-agreement.test.ts`, and the C7/C9 claims.

The accepted W-1 rule says:

- every present subscription must be **a declared subscription identity**;
- the rule fixes only that the entry is such an identity;
- its **exact spelling remains implementation-owned**, constrained to be finite, declarative, and compared by equality.

C4 instead makes a concrete spelling decision:

```ts
for (const subscription of wait.subscriptions) {
  if (subscription.subscriptionClass.length === 0) {
    return { wellFormed: false, reason: "declared subscription has an empty subscription identity" };
  }
}
```

The new candidate scenario then submits `{ subscriptionClass: "" }` and requires rejection, and `envelope/invalid-subscription-identity-registered` treats accepting it as a protocol violation.

That does not follow from W-1. Empty string is an ordinary finite E-1 string; W-1 never says it is syntactically invalid, and explicitly leaves the identity's concrete spelling to the implementation. A conforming implementation is therefore allowed to choose an identity representation in which `""` is a declared identity, or an adapter is allowed to map its native declared identity into that fixture spelling. C4 would fail such a conforming candidate solely because the fixture chose a spelling rule the protocol did not.

This is the same class as K02-R2-01: a fixture preference has become normative pass/fail behavior. The fact that the fixture genuinely needs a negative case for “not a declared subscription identity” does not authorize inventing a syntax rule to manufacture one.

**Required outcome:** test the semantic property the worksheet actually fixes, not a concrete spelling it leaves open. Represent declaration validity independently of spelling (for example, against fixture-declared subscription identities) or explicitly assign the concrete spelling/encoding choice to the packet that owns it. Do not use empty-string rejection, non-empty-string requirements, or another unowned token rule as a proxy. Re-audit neighboring “implementation-owned spelling” choices for the same mistake.

**Impact:** K0.2-C7 **FAIL** because a retained violating transcript is not behavior the governing protocol actually forbids; K0.2-C9 **FAIL** because R5-a4's claimed assertion/counterexample is unsound.

### K02-R4-02 — P1 — C4's independently-distinguishable-assertion rule is still not applied consistently; K02-R3-01 is not fully closed

**Affected material:** `coverage.ts`, `candidate.ts`, `coverage.test.ts`, the completion/stale-timer/whole-envelope scenarios, and C7/C9.

C4's contract defines the right rule: two clauses are separate when a plausible implementation can get one right and the other wrong. The structural guard then checks that one counterexample ID is not reused for two map entries. That guard catches **double-use of a transcript**, but it cannot detect the opposite failure: **one map entry still containing two or more independently violable assertions.** Several retained entries do exactly that.

Concrete examples:

1. **R3-c1 still bundles progress and emissions.** It says a partway acceptance failure leaves “no progress and no accepted emissions.” Its one transcript, `envelope/valid-prefix-kept-when-a-later-member-is-malformed`, commits **both** progress and an emission. A plausible implementation can leak only the progress writer while correctly withholding emissions, or vice versa. C4 itself recognizes exactly this separability in row 7, where losing progress and losing emissions are split into R7-a2 and R7-a3 because different writers can escape a fence independently. The same behavioral test requires the row-3 pair to be split too.

2. **R5-f1a still bundles retirement and wake.** It says a stale timer “retires nothing and wakes nothing,” while its counterexample changes both `state` to READY and `liveWaitGeneration` to null. A timer handler can incorrectly wake while leaving the generation live, or retire the generation without producing readiness. Those are independently observable fields and independently plausible bugs. Splitting timeout-Event creation into R5-f1b was correct, but the first half is still itself bundled.

3. **R8-a still bundles several independently distinguishable completion-refusal facts.** The entry requires: no terminal acceptance, a recorded inspectable reason, and nothing in the envelope committed. Its two counterexamples cover (a) accepting completion and (b) committing progress **and** acknowledgment under a reported refusal. A candidate that refuses whole and stays non-terminal but records no reason; commits only progress; commits only acknowledgment; or leaves only an Effect intent can get the other clauses right and this entry has no counterexample specific to that assertion. The runner would reject some such candidates because the complete expected observation contains those fields, but C9 explicitly requires a counterexample per independently distinguishable assertion; implicit coverage by a larger expected object is the representation C9 was introduced to replace.

4. **R8-b combines explicit terminal disposition with two different forbidden alternatives.** The retained global-cursor transcript exercises “treated as processed” by acknowledging unmatched input. A candidate can instead silently delete an unacknowledged Event without acknowledging it and without recording B-5 disposition. That is a distinct failure described by the same entry but not represented by its counterexample.

These are enough to disprove the report's claim that all 69 entries are at the contract's asserted granularity. They are not requests for four isolated patches; they show that the reconstruction pass stopped short on older entries.

**Why the new guard did not catch this:** `coverage.test.ts` enforces “no counterexample defends two obligations.” It has no mechanical way to determine that one `obligation` string still contains two independently distinguishable behaviors. That part still needs the semantic reconstruction/review that C9 itself describes.

**Required outcome:** re-run C4's own behavioral split rule over **every retained entry**, not only the entries added in round 4. Where a candidate can get one clause right and another wrong, create separate assertion entries with dedicated plausible counterexamples; use `shared` only for genuinely identical observable facts across different rows. In particular, audit composite phrases joined by “and,” “or,” “nothing,” and lists of independently stored fields against the actual writers/transactions rather than splitting mechanically by grammar. Preserve cases that are truly one atomic observable fact as one entry.

**Impact:** K0.2-C7 **FAIL** because the promised “at least one plausible-wrong transcript per obligation/assertion” is not yet true at the contract's own granularity; K0.2-C9 **FAIL** because the assertion inventory is still not semantically atomic.

## Per-criterion verdicts

| Criterion | Verdict | Review basis |
|---|---|---|
| K0.2-C1 | **PASS** | The deterministic public K0 trace remains coherent and its subscription-only wait/typed-output/completion path is not weakened by C4. |
| K0.2-C2 | **PASS** | The scheduled delayed-Runtime/non-blocking scenario remains coherent and keeps Runtime-local work `RUNNING`, not Kernel-`WAITING`. |
| K0.2-C3 | **PASS** | The independent ledger corrections from rounds 1–3 remain intact; C4 does not regress retained-reference or `"__proto__"` fidelity. |
| K0.2-C4 | **PASS** | The direct-baseline/shared-laboratory specification remains intact. |
| K0.2-C5 | **PASS** | Both public application shapes remain prepared without claiming external E0 execution or acceptance. |
| K0.2-C6 | **PASS** | The unsafe/state-loss control scenarios are materially stronger in C4; the new readiness/Effect-intent observations close review-03's concrete invisibility defects. The open findings are about one invalid W-1 negative case and the coverage inventory's granularity, not a false M-1 control result. |
| K0.2-C7 | **FAIL** | R5-a4's empty-string counterexample is not canonically forbidden, and the assertion inventory still lacks dedicated wrong-candidate transcripts for independently distinguishable clauses. K02-R4-01/R4-02. |
| K0.2-C8 | **FAIL — BLOCKED_EXTERNAL** | Accepted pinned E0 evidence still does not exist at the inspected benchmark revision. |
| K0.2-C9 | **FAIL** | The map is much stronger, but it still contains both an unsound assertion and several non-atomic entries under its own behavioral definition. K02-R4-01/R4-02. |

## External E0 blocker

The benchmark repository's `main` still points exactly to `98756f8c10bd806125da8318f1a129bc030aca61`. Its roadmap still states that E0–E6 are planned, not implemented.

K0.2-C8 therefore remains `BLOCKED_EXTERNAL`: responsible actor is the benchmark repository owner; unblock requires an accepted E0 deliverable/evidence set at a pinned benchmark revision that this repository can record and an independent reviewer can inspect. Nothing in H4 grants or infers E0 acceptance.

This is not an architecture-decision blocker. The correct overall review verdict remains `CHANGES REQUIRED`.

## Validation-evidence distinction

`implementation-04.md` reports clean-C4 validation including typecheck, 1331 tests with zero failures, 1222 conformance tests, SDK, architecture and builder-doc checks. I did not independently rerun those repository commands, and no GitHub status/workflow evidence for C4 is exposed through the available connector.

Both round-4 findings are source/contract counterexamples that a green suite cannot discharge. K02-R4-01 is a false normative assertion encoded in the tests; K02-R4-02 is a mismatch between C9's semantic coverage promise and the granularity actually represented by the map/counterexamples.

## Correction handoff and revert recommendation

**Fix forward from C4. Do not revert C4/H4 to C3/H3.** The added observation surfaces, LP-1 schedule, reason-text normalization and much of the 69-entry reconstruction are useful and should be preserved.

Correct the same released K0.2 packet. Remove the unowned empty-string subscription validity rule and replace it with a semantic declaration-validity test or an explicit permitted assignment. Then finish K02-R3-01's reconstruction by applying C4's own independently-distinguishable rule to every retained assertion, including older entries. Preserve K02-R2-01, K02-R2-02 and the concrete review-03 blind-spot fixes. Keep C8 `BLOCKED_EXTERNAL` until accepted pinned E0 evidence actually exists. Produce a newly validated clean payload and administrative candidate/report. Do not self-accept, merge, close K0 or release K1.0.

## Final outcome

H4 `ed438e88173e8f7306dfdfb16c290ea40fa0a0fd` is not acceptable. C4 is a substantial improvement and should be fixed forward, not reverted, but it introduces one new protocol over-constraint and does not yet satisfy its own assertion-atomicity rule across the full inherited coverage inventory. C8 also remains externally blocked.

**CHANGES REQUIRED**