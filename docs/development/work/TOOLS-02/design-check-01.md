# TOOLS-02 — design check 01

- Reviewer: Codex GPT-6 session, independently checking the implementer's design at the owner's request, 2026-10-23 (America/New_York).
- Checked revision: `1aec8b6210647d16e0014cdbe4e303d6369b0be4`, supplied as `origin/claude/tools-02`. Local HEAD and that tracking ref both resolved to this commit before review.
- Design: [design 01](design-01.md), against [brief 01](brief-01.md), scope B, and [release 01](release-01.md).
- This is a design check under [006's packet lifecycle and design-check rule](../../006-development-process.md#packet-lifecycle), not implementation acceptance. No build, corpus run, mutation run or full verify was performed. No product, tooling or fixture changes are included.

The source inspection stayed within the owner's read scope: `AGENTS.md`; 006 (using its lifecycle, design-check and working-principle rules); [017](../../017-known-limitations.md); the three TOOLS-02 documents above; `scripts/packet_tools.py`; and the design-named fixtures `adoption.json`, `inventory.json`, `coverage.json`, `mutations.json`, `refusal-guards.json`, `value-cost.json` and `state-owner-controls.json` under `tests/fixtures/packet-tools`. The owner then explicitly authorized the named tooling files in `tests/tooling` and BINDING-01's hold release. Additional inspection covered `value-cost-witness.mjs`, `value-cost-source-policy.mjs`, `catalog-reporter.mjs`, `requalify-value-cost.py`, `test_runner_targets.py`, `test_preserved_tools.py`, and [BINDING-01 hold release 01](../BINDING-01/hold-release-01.md), all at the same pinned revision.

T2-3 checks the proposed mechanism against the reused witness and source-policy code; the future target-route implementation is not being reviewed. T2-4 checks the actual hold release as well as brief T2-4 and 017 L-01. Linked historical records outside the authorized list were not followed.

## Findings

### D01-CHK-01 — T2-1: the walk form makes real dependency edits invisible

**Required redesign.** Design lines 59–74 classify every read below any listed ancestor as enumerated, then omit enumerated non-fixture reads from comparison. Lines 100–108 substitute an unchanged “assumed changed” label for invalidation. This does not meet brief line 38.

A concrete trace distinguishes the two:

1. A test lists `packages/kernel/src` and reads `packages/kernel/src/dep.ts` as source text. It checks a property of that source and passes. The file is not in its static import closure.
2. Store the walk-form census at C0. Its walk is `packages/kernel/src`; the source-text read is enumerated and non-fixture.
3. At C1, change a dependency in `dep.ts` while retaining the property the test checks, so the test still passes. Keep the paths, listings, test code and import closure unchanged.
4. The design produces the same `reads`, `walks`, named-change list and fixture reasons. No field changes to invalidate the stored table.

This is not dependent on a missed trace or exotic filesystem operation. It follows directly from the proposed comparison. `packet_tools.py:2037–2045` classifies this source read as non-fixture; `:2479–2489` currently records changed non-fixture reads; `:781–787` rejects unequal preserved tables. The proposed form removes even a first-change signal for this read. A path explicitly named by test code also becomes “enumerated” merely because another operation lists an ancestor: the trace's ancestry does not establish that the read was incidental.

The same mechanism hides removal of an inner listing while its outer walk remains. Also, a named path already different from its historical pin can change again without changing a path-only `repository_read_changed` list. The latter is an inherited weakness, not newly introduced by TOOLS-02, but it matters if the packet claims that every real dependency change invalidates.

**Required outcome:** specify a comparison that distinguishes current dependency identity/content from unrelated enumeration, with a declared baseline for invalidation. Include controls for a first and a subsequent dependency edit, a named read beneath a listed ancestor, and removal of an inner dependency/listing. Replacing invalidation with “assumed changed” requires an explicit change to the brief; this check does not grant it. Keeping the old status counts is not proof of the requested behavior.

### D01-CHK-02 — T2-1: an unrelated new test directory can still invalidate

**Required change.** Design lines 94–98 rely on `.test.ts` not being a fixture, while line 518 explicitly retains the broader directory-as-fixture behavior.

Consider a recursive scanner that lists `tests`, calls `statSync` on each directory it encounters, and reads only files selected by its source filter. Start with no fixture difference under that walk. Add and commit `tests/new-suite/unrelated.test.ts`, a passing test independent of the preserved member's assertion and excluded by the scanner's content filter. The scanner's new `statSync('tests/new-suite')` is an existence read. `packet_tools.py:47–50` maps `stat` to `exists`, and `:2037–2045` treats that extensionless path under `tests` as a fixture. It did not exist at the pin, so it raises the walk's first fixture flag. The design invalidates despite unchanged named reads, walk roots and substantive input to the preserved assertion; the new test's bytes need not be read at all.

A read-only evaluation of the existing `fixture_read` function returned:

```text
tests/new-suite exists                         fixture_read = True
tests/new-suite/unrelated.test.ts bytes         fixture_read = False
packages/kernel/src/dep.ts bytes                fixture_read = False
```

Thus “a `.test.ts` file is never a fixture” does not establish the addition guarantee. Existing walkers that already have a fixture flag merely mask this case; they do not close the criterion for a clean member.

**Required outcome:** distinguish directory discovery from a fixture input whose identity the member depends on. Add the unrelated-test control both in an existing directory and in a new directory, with the original member initially free of fixture-change reasons. Declare how unrelated fixture-directory listings are treated. Resolve this together with D01-CHK-01, rather than suppressing all directory or fixture changes.

### D01-CHK-03 — T2-2: preflights cover selected writers, not every digest-producing operation

**Required change.** Brief line 39 expressly includes inventory writes and every operation that writes or recomputes fixture digests. Design lines 130–132 exempt Git-object readers; lines 138–166 add preflights only to `corpus`, `regenerate` and `requalify-value-cost.py`, beside the existing `verify` guard.

`inventory` is a concrete omitted operation. `packet_tools.py:361–400` recomputes `source_sha256`; the standalone dispatch at `:3447–3448` calls it without `clean_payload`, and `:3459` prints its result. A caller can redirect that result to a fixture or consume it in a fixture-generation snippet from an unclean checkout. Reading Git blobs explains why these digests may still be reproducible; it does not implement the brief's required refusal.

The proposed file-level census cannot close this omission. `scripts/packet_tools.py` contains many operations, so classifying that file once does not establish which entry points are guarded. A stdout-producing operation need not call any of the census's listed file-write APIs. The design also identifies direct calls to `preserved_census` as an existing regeneration route (lines 128–129), but does not say how that route becomes guarded or ceases to be supported.

**Required outcome:** inventory the actual fixture/digest-producing entry points and their output routes, including standalone inventory generation and the callable census/regeneration path. Put the guard at an operation boundary shared by those routes, or explicitly amend which operations the brief covers. Give each supported route an untracked/ignored/invisible-directory refusal control and its refusal-guard coverage. A file census can check a declared bounded vocabulary; it must not claim to prove every writer is guarded merely because its containing file is listed.

### D01-CHK-04 — T2-3: object identity defeats fresh forgeries, but must be bound to the failing test invocation

**The stated fresh forged-frame attack is rejected by the proposed mechanism.** Design lines 185–207 require a test-side instrumented assertion and identity lookup of the failing cause. A freshly constructed production `AssertionError` does not acquire that identity by forging its frames. The proposed source policy also refuses the explicitly named production constructor. M-real and M-forge-frames are suitable positive and negative controls for this distinction.

**Required design completion:** the witness described at lines 187–191 is keyed by error object and records a source site. The kill predicate at lines 202–207 requires a target failure and a witness in a test-side module, but does not require that witness to have been produced in that target leaf's invocation. Those are different guarantees.

The reused code confirms this gap: `value-cost-witness.mjs:25–31` creates a process-wide error map; `:119–137` records only assertion kind, module and source anchor. Its `AsyncLocalStorage` carries an assertion-nesting boolean, not a test-invocation identity. There is no per-leaf reset in that module. `catalog-reporter.mjs:11–28` reports the failing leaf and its cause, which supplies the other half of the proposed lookup but does not bind the earlier assertion to that leaf.

A passing helper leaf A can catch and save the real error from an admitted `assert.equal` failure. Leaf B, the declared target, passes in the control. In the mutant, production rethrows the saved object from A, optionally giving it B's frames. Production only needs an error argument and `throw`; it need not import assert or name `AssertionError`. Under the written predicate, B fails with `testCodeFailure`, the object is witnessed, the site is test-side, and the source-policy conditions listed in the design remain satisfied. Yet no qualifying assertion executed and failed in B. M-other-leaf, which checks an actual failure of a non-target leaf, does not exercise a passing leaf's caught failure reused in the target.

**Required outcome:** bind admission and lookup to the named test invocation, including helper assertions, and define the lifetime of a caught witness. Add a control for cross-leaf rethrow of an already witnessed error and verify it earns no credit. This is the brief's named-test provenance requirement, not a request to defend against arbitrary hostile code mutating the witness implementation. The inherited witness establishes assertion origin at a source site; the target route adds an obligation it does not yet meet.

Also state how the source-policy inventory is generalized: `value-cost-source-policy.mjs:9–23` scans source directories under `packages`, whereas the existing target controls use `src/value.mjs` (`test_runner_targets.py:68–79`). Reusing that policy unchanged refuses those trees for missing `packages`; merely relaxing that refusal would leave their production source uninspected. Define the complete checked source set and retain both the positive assertion control and the forged-constructor refusal. Neither the witness nor these controls was executed in this design check.

### D01-CHK-05 — T2-4: import reachability is not the scope of the released guarantee

**Required change.** The direction is correct: released holds must stop appearing as active, wrapper V-ENV limits must cite L-01, and no classification itself grants credit. The proposed register validation and fresh P1 checks support that direction. The automatic classification at design lines 293–312 does not, however, establish the distinctions in brief T2-4 and 017 L-01. Hold release 01 lines 26–38 restores the core guarantee only after trusted initialization, explicitly excluding pre-import poisoning; lines 40–49 give the wrapper no V-ENV claim and record L-01. Lines 51–55 leave the register as TOOLS-02 bookkeeping with no automatic new credit.

- A test file can import a wrapper through a general helper and still have a leaf asserting only the released core behavior. The file's production closure makes the key `wrapper`, and rule 2 gives L-01 precedence over every other matched claim. That does not establish that the leaf's required result is excluded by L-01. A passing core test cannot become a wrapper limitation merely because an unused wrapper is reachable.
- `child-process`, `unresolved` and `parse` describe missing analysis, not a wrapper limitation. A child-process case can test the released core. Automatically marking it L-01 converts an unread scope into an asserted semantic disposition.
- Conversely, 017 L-01 retains genuine intrinsics at core initialization as a host precondition. A core-only closure does not establish when intrinsic replacement happened. For example, an earlier imported helper can replace an intrinsic before the core initializes. Defaulting such a key to `not_held`, with an optional reading expected to find none (design lines 300–301), does not distinguish pre-initialization from released post-initialization behavior.

The current detector is intentionally coarse: `packet_tools.py:2184–2190,2225–2259` includes load-time code and helpers in each leaf's run set. Adding another file/closure-level predicate retains that cause rather than revalidating the claim each entry actually observes. A fresh P1 preservation check can prove that the same test passed; it cannot supply the missing interpretation of the released guarantee.

**Required outcome:** use mechanical scope as a candidate classification, then establish the required result, affected component and initialization timing where they matter. Mixed files and unread cases need an explicit disposition supported by a reading or resolved child scope; uncertainty must not be relabeled L-01. Test a core leaf with an incidental wrapper import, a core child-process case, and pre-/post-initialization intrinsic replacement. Continue to forbid credit without the appropriate passing check.

**Count check:** the permitted `adoption.json` confirms **891** entries with claim `V-ENV` and decision `owner-choice-08.md`: 804 registrations and 87 cases. It also has 965 held entries and one superseded entry overall. The design's correction of the release's 853 count is supported. This count correction does not settle any entry's classification. Narrowing the old blanket hold to the core/wrapper release scope is already requested by brief T2-4; broadening L-01 to cover unread or incidental-wrapper cases is not.

### D01-CHK-06 — T2-5: predeclared parameters do not make the audit sample independent

**Required change.** Sections 5.3–5.5 do declare the ordered triage rule, reason classes, independent sample seed `20261023`, sample size 150 and bound of at most three unsafe errors before the proposed run. They also declare the relevance and self-audit samples. That satisfies the declaration part, subject to settling the proposed `recorded_limit` class before triage.

The sample is nevertheless `random.Random(20261023).sample(sorted(retired IDs at C), 150)`. The implementer knows the seed and chooses which origins enter that list, and can know the resulting sample before finishing their dispositions or rationales. Moving one origin between retired and a P1 disposition changes the sampling population and the selected IDs. Even with a fixed population, the known sample permits concentrating reading effort on sampled origins. The reviewer's optional supplementary sample does not define an independent acceptance sample or give it a decision bound.

A read-only illustration using 1,516 synthetic IDs `origin-0000` through `origin-1515` and the declared seed changed **137 of 150** selected IDs after removing the first initially unsampled ID. This is a demonstration of population dependence, not an allegation about the implementer's behavior and not a run of the actual audit.

**Required outcome:** commit and freeze the complete disposition population and rationales before an independent reviewer selects the audit seed. Predeclare the sampling algorithm, classes, size and bound; record the reviewer-selected seed before the audit run. Bind the population, seed and results to that exact candidate. Repairs or population changes need an explicit re-audit rule that prevents repeatedly selecting a favorable sample. A privately preregistered reviewer seed is another option. Keep a deterministic public sampler for reproducibility after selection.

Also declare the threshold when fewer than 150 origins are retired: the current “all of them” rule changes the denominator, while “more than three” is still the stated stop condition. Specify whether the bound is a rate, an absolute count or a separate census rule. The claimed sampling probabilities must not be presented as guarantees for an adaptively selected population.

## Design disposition

| Criterion | Design-check result |
|---|---|
| T2-1 | Does not close: both unwanted invalidation and invisible real changes have explicit counterexamples (01–02). |
| T2-2 | Does not close: selected operation preflights and a file census omit an expressly named route (03). |
| T2-3 | Fresh production forgery is rejected in the specified mechanism; named-test provenance still needs invocation binding (04). |
| T2-4 | Release direction and revised count are supported; automatic scope classifications do not establish the released claim/limit distinction (05). |
| T2-5 | Parameters are declared, but sample independence and the small-population bound need revision (06). |

These are defects against the packet's expressly released criteria or its claimed closing mechanisms. They are not findings of a production defect. Applying 006 working principle 6 and 017 does not require hypothetical universal tooling hardening here: a bounded writer vocabulary and declared witness limitations remain acceptable when accurately stated. It also does not make an omitted T2-2 route, a redefinition of T2-1 invalidation, or an unsupported T2-4 classification satisfy the current brief. Any relaxation needs the owner and an amended criterion.

For the design's open questions: Q1 is authorized only within the release scope above; Q3 is not approved; Q5 needs the independent selection and denominator rules above; Q8's per-file process arrangement is reasonable provided the reporter sees the same cause object and invocation binding is enforced. Keep `recorded_limit` distinct from `superseded` (Q2), subject to the owner's agreement, so a still-existing but unguaranteed behavior is not described as removed. The proposed extraction stop, early integration and new L-16 disposition remain owner choices; this check neither releases another packet nor approves an unverified “never in CI” claim.

Revise the comparison and classification mechanisms and complete the writer, provenance and audit rules before building. Carry the counterexamples above into the revised design's deterministic controls. No implementation acceptance or status-ledger change is made by this report.

Validation of this report: source/line inspection at the pinned revision; read-only evaluation of the existing fixture predicate; read-only fixture counts; synthetic sampling arithmetic; Markdown link and diff checks. No new third-party material, dependency or service was incorporated.

REDESIGN
