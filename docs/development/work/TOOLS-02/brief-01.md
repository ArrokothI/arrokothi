# Brief 01 — TOOLS-02 (DRAFT, not released)

Planner: the owner's Claude Code desktop session (`claude-opus-5-5`), 2026-10-22, at the owner's request
("draft the TOOLS-02 brief (not released)"). It is written under
[006 working principle 6](../../006-development-process.md#working-principles) and
[017](../../017-known-limitations.md). It needs an owner scope choice before release (see the end).

## Goal

Make the evidence tooling cheap to keep green, and settle the open evidence origins well enough for K1.4's
acceptance ([owner choice 06](../TOOLS-01/owner-choice-06.md)). Today every packet pays for tooling drift:
BINDING-01 lost three CI rounds to it, and every new test file invalidates scanner census rows. Most of the
1,395 pending origins are not counterexamples. Design 05 §5.4's samples, cited in
[owner choice 06](../TOOLS-01/owner-choice-06.md), put prose-only counterexamples at 11–13% of mentions.

## Scope as 007 states it

The [007 section](../../007-work-packets.md#tools-02--remaining-corpus-extraction) lists:
- the 1,395 `pending` origins, including the 26 families, mention triage and sealed-log extraction;
- the limited and transferred origins of TOOLS-01 owner choices 04, 05 and 11, and
  `kernel-landing-zone.test.ts:1200:9@deedd7950724`;
- K1.1-correction-03's transfers (owner choices 01–03): 15 + 46 origins, 24 + 10 limited members, eleven
  uncredited registrations, five C1 mutant meanings, and review 03's P3 observations;
- the target-set assertion-provenance design ([owner choice 09](../TOOLS-01/owner-choice-09.md));
- the revalidation of hold-register entries under the released V-D1 and classification claims;
- from BINDING-01 ([cleanup 01](../BINDING-01/cleanup-01.md)): the 853 rule-1 V-ENV entries, the reopened
  origins, and three P3 items;
- whatever COORD-REFACTOR-01 reopens and transfers.

Closing all of that origin by origin under P1 rules is the most expensive item, and it protects the least.
This brief therefore separates what to build right now from what a declared bounded search can settle.

## Build right now (blocking quality)

| ID | Criterion | Closes by |
|---|---|---|
| T2-1 | **Census stable under unrelated additions.** Adding a test file that no member reads, or adding an unrelated repository file, leaves the preserved table valid. Scanner members, the tests that read the whole repository, compare reads in a form that new unrelated paths do not change. A real change to a path a member depends on still invalidates it. | Deterministic: a tool test adds an unrelated test file and expects `revalidation_complete`; a mutant edits a read dependency and expects invalidation. |
| T2-2 | **No fixture is written from an unclean tree.** Every operation that writes or recomputes fixture digests (`corpus`, census regeneration, inventory writes) refuses a checkout with entries not tracked at C, as `verify` does. | Deterministic: a tool test with an untracked file expects a refusal from each writer. A registered refusal guard. |
| T2-3 | **Target-set kills have provenance.** A target-set mutation earns a kill only with evidence that its qualifying assertion executed and failed in the named test. A production `AssertionError` that imitates the test's frames does not count ([owner choice 09](../TOOLS-01/owner-choice-09.md)). | Mechanism plus mutants: a forged-frame production assertion is not credited, and a real test assertion is. |
| T2-4 | **The hold register matches current claims.** The 853 rule-1 V-ENV entries are reclassified under [hold release 01](../BINDING-01/hold-release-01.md): core entries are revalidated, and wrapper entries point to L-01. Entries held under the released V-D1 and classification claims are revalidated. No new credit without a passing check. | Deterministic: a register check run in verify; no entry cites a released hold as active. |

## Settled by a declared bounded search (non-blocking per origin)

- **T2-5, origin triage.** Every pending, limited or transferred origin gets exactly one disposition:
  - *closed*, bound to an existing maintained test or artifact;
  - *extracted*, its counterexample turned into a maintained test;
  - *retired*, with a reason class (not a counterexample, covered elsewhere, or superseded by a later
    design such as the bytes core or the plan/apply refactor).

  The triage rule is declared in advance. An independent reviewer audits a random sample with a fixed seed
  and size and reports the error rate. Retirement never deletes historical evidence (archive policy).
- **The local timeout flake** (BINDING-01 cleanup): recorded as a limit unless it appears in CI.

## Known counterexamples to keep passing

- Every check of the BINDING-01 composed verify (CI run 39868378094) and its successor at COORD-REFACTOR-01.
- TOOLS-02A's clean-payload guard, and the registered mutation, refusal-guard and value-cost registries.

## Suspect design

1. **P1 per-origin closure as the only route.** Owner choices 04–06 assume each origin closes under P1.
   The samples say most origins are not counterexamples. **Question:** can T2-5's triage, with a
   sampled audit, replace per-origin P1 closure for the retired class?
2. **Whole-repository read digests** (cause of T2-1). Should scanner members digest only the paths their
   analysis consumes, or be classed as "whole-repository readers" with a structural rule instead of a
   digest?

## Questions before code

1. Design T2-1's comparison form, and show it still invalidates on a real dependency change.
2. Choose T2-3's provenance mechanism (for example, a test-side marker in the assertion vocabulary, or
   reporter-side attribution). How does a production `AssertionError` fail it?
3. Write T2-5's triage rule, reason classes, sample size and seed, before running it.
4. Give the volume per disposition after triage, and the time to close the extracted class.

## Process

- **Release timing:** after COORD-REFACTOR-01 is integrated. Both packets edit `tests/fixtures/packet-tools`.
- **Lifecycle:** design note, design check, build. Verify runs in Packet verify CI from the first C. Before
  each dispatch, run tool-tests, both mutation registries and the full verify in a fresh clone.
- **Review gate:** a concrete defect against T2-1 to T2-4, or a false current claim in 007, BASELINE or
  017. The T2-5 sample audit reports an error rate; the owner judges it.
- **Stop and ask:** if a product file would change; if a retirement would delete historical evidence; or if
  the sample's error rate exceeds the bound declared in question 3.

## Owner decisions needed to release

1. **Scope.**
   - **A:** the full 007 scope, closing every origin under P1.
   - **B (recommended):** T2-1 to T2-4 as blocking, plus T2-5's triage with a sampled audit.

   B amends owner choices 04–06 for the retired class only. It keeps owner choice 06's rule that TOOLS-02
   precedes K1.4's acceptance.
2. **Implementer, design checker and reviewer.**
