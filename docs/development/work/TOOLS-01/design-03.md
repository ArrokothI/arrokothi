# Design 03 — TOOLS-01 research reconciliation

Recorded 2026-10-02, before this continuation's implementation. This extends designs
[01](design-01.md) and [02](design-02.md) under contract revision 2 and owner choice 01.
The owner's current instruction authorizes continuing P1/P2 after this note, subject to
the existing stop conditions. This is implementer rationale, not independent acceptance.

## Base and ownership

Main `8292d6f3e56223c425bd5d048299735ccc248ac4` is the new B. It reached this branch through
merge `8358ea291c0283e3c6cb4c7a22e1b9a30b5d467e`. The research, AGENTS.md, development front
door and two skill changes are base content. The new verification specification will use
that B, require B→C→H ancestry, and keep H as a direct administrative child of C. C..H
will contain implementation-02.md and the 007 status update only. The research merge is
before C, never an administrative attachment or candidate payload. Preserve production,
canonical owners, audit evidence and governing process files at the new B; retain the
historical catalogs' original revisions and bytes. Release 01 and implementation 01 stay
unchanged historical records. This updates identity, not how F1 closes.

This is development evidence tooling. The canonical owner is
[evidence attribution](../../../../mental-model/mechanisms/evidence.md), particularly its
separation of an observation, a structural fact and acceptance. No Kernel, Runtime/Driver
or deployment contract changes. Current implementation and migration status were checked
through 002, 001 and 007. No Layer-3 change is required.

## Research read and primary evidence

Read the research README's usage rules/tags/map, the 2026-10-02 report's §8, strict-validator
testing subsection and TOOLS-01 decision row, and the 2026-10-01 Problem 2. Reports supply
leads, not authority. Primary texts checked for this note:

- [Stryker result states](https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/):
  compile/runtime errors are invalid; ignored results remain visible. Its timeout scoring
  is not adopted: TOOLS-01 requires the named assertion, so timeout stays inconclusive.
- [Stryker incremental-mode limitations](https://stryker-mutator.io/blog/announcing-incremental-mode/):
  changes outside mutated/test files and environment changes can invalidate reused results.
- [fast-check maintainer, discussion 4406 (2023)](https://github.com/dubzzz/fast-check/discussions/4406):
  retain examples for regression coverage; seeds/paths are troubleshooting coordinates.
- [NISTIR 7878](https://nvlpubs.nist.gov/nistpubs/ir/2012/NIST.IR.7878.pdf):
  evaluate combinations against a parameter model. Our explicit domains below are a
  bounded coverage model, not a claim that pairwise coverage proves correctness.
- [ArchUnit empty-rule behavior](https://www.archunit.org/userguide/html/000_Index.html#_fail_rules_on_empty_should):
  an empty selection can hide a stale rule; explicit exceptions remain a human decision.

No recent GitHub issue or small-repository claim is relied on, so §9 is not needed. No
[S], [P~] or [I] claim is promoted to evidence. The implementation below is independent;
these references authorize no source copying, dependency, service or license clearance.

## Reconciliation and checks

| Item | Disposition, existing coverage and planned mechanism | Criteria / closing check |
|---|---|---|
| 1. Stable identity | **Adopt** content keys alongside readable category names. Existing cases have semantic names, and `run_case` checks a unique exact replacement, but mutant names alone do not bind their content. Compute identity from file, exact anchor, operator and replacement; cases bind explicit input and assertion. Never use enumeration or current line numbers. Historical origin IDs retain pinned revision/line locators as provenance, distinct from executable identity. A moved site keeps its key; edited/ambiguous anchors yield explicit `not_applicable` with match count. | F2/F3/P1: prepend unrelated lines without changing key; change anchor, replacement or operator and check identity/applicability. |
| 2. Kill semantics | **Already covered**, with an **adopted reporting completion**. `observation`, `oracle-probe.mjs` and `assertion-reporter.mjs` separate named assertions from loader/import failures. Add explicit first `killed_by` assertion/test to each killed result. Report setup/syntax/import/compile errors as invalid executions, never kills; test all categories. Keep F3's passing control, reached witness and exit agreement. | F3/F5/P2: malformed result, failing baseline, import/syntax/compile/setup, unreached and survivor controls; oracle comparison ablations must identify the first named failing test. |
| 3. Waivers / reading | **Already covered in design 02**, **adopt** in summary/schema. Require reasons for waivers and closed-by-reading entries and emit those reasons; keep separate counts. RM1/RM2/RM3/RM5 retain their arguments. No waiver or reading result can satisfy an executable kill requirement. | F2/F5/P1: missing-reason rejection and summary tests; inspect the original reading arguments. |
| 4. Inputs, not seeds | **Already covered** by identity literals, oracle negative vectors and realm argument/expected-value records; **adopt** explicit input provenance for every maintained family. Source-defined literal scenarios are stored inputs too. Seeds, if present, require tool version and commit as troubleshooting metadata; they never replace the values/bytes/scenario. | F2/F3/P1: registry validation rejects seed-only entries; adapters execute the stored input, not a second unconnected representation. |
| 5. Declared dimensions | **Adopt** a separate versioned family manifest. Explicitly enumerate domains for access form (assignment, defineProperty, global declaration, pre-pin declaration), stage, environment, target and pin mode where relevant. Record fixed dimensions as singleton domains. Store each case's coordinates. Compute the full Cartesian product for these small families and list missing tuples with any explicit applicability explanation. Do not infer domains from cases, silently drop absent values or claim coverage beyond the manifest. | F3/F5/P1/P2: remove every case of one form while retaining that declared form; summary must name missing combinations. Reject unknown values/dimensions, duplicate coordinates and empty domains; zero-match family is an error unless explicitly reasoned. |
| 6. Non-vacuity | **Partly covered** by exact file sets, unique mutations, reached flags, test counts and oracle registry reconciliation. **Adopt** an explicit finite inventory of adopted rules/guards/allowlists/probes, with positive selection/reach evidence or visible reasoned opt-out. A miss is a failed check, not empty success. This is bounded to TOOLS-01's adopted evidence mechanisms; it does not introduce a universal repository analyzer obligation. | F1/F3/F5/P2: must-fail fixture with a selector matching no input; empty suite/registry/allowlist, missing named control and unreached-probe controls. Manifest reconciliation detects newly unregistered adopted checks. |
| 7. Check ablation | **Partly covered**: all 29 complete-decision comparisons have registered removal mutants and named controls; identity has one. **Adopt** removal mutations for each newly adopted refusal check and held-witness assertion. Keep guards and their negative inputs paired in a finite registry; mutants run only in temporary copies. Historical survivors remain visible until their maintained test kills the same fault or a reasoned disposition is reviewed. Held witnesses assert reproduction of the defect; ablating their observation comparison must turn their negative control red. | F3/P1/P2: registry reconciliation, passing controls, reached check and first named failure. Problem 2 motivates deterministic work-count assertions when a count is observable; changing a production meter or adding a semantic cost claim belongs to the correction owner. |
| 8. Determinism | **Adopt** a declared sample from each maintained family, rerun in fresh source trees/processes. Compare structured outcomes (including counts and first failure), excluding timing, PID and temporary path metadata. A mismatch is attention-required. This detects sampled flakiness, not all nondeterminism. | F4/F5/P2: deterministic repeat passes; an alternating fixture fails comparison. Report sample IDs and repetitions. |
| 9. No result reuse | **Already covered** by design 02 `verify`: commands read C and run anew, with cleanliness checked around each step; no result cache exists. Keep this property when composing corpus/profile summaries. | F1/F5/P2: clean-C executes every required step and mutant again; no imported previous-run success field. Separate profiles remain explicitly not run under owner choice 01. |
| 10. Negative categories | **Partly covered** by named oracle comparisons and runner states. **Adopt** declared negative categories with case membership and category counts/gaps. Keep categories meaningful (identity, scope, stale mutation, invalid execution, non-vacuity, dimension omission, held realm witness, oracle decision fields). | F3/F5/P1/P2: an empty declared category remains visible; missing names cannot collapse to a total count. |

## Corpus and verification composition

Continue the complete 208 artifact/fence + 1,333 prose + 8 final-review origin intake.
Inspect source content when assigning a semantic mapping. A reference to a command is not
another test; a historical runner can be replaced by maintained cases only if its distinct
assertions/mutations have destinations. Preserve policy-only evidence with a reason. Pending
entries block mapping completion; complete mappings alone still do not claim execution.

Keep the complete-decision oracle's current legal decisions and phase-specific exceptions,
the hostile suite and analyzer. Existing-suite mappings name source/test coverage and the
verification command that executes it. Default verification executes deterministic corpus,
registered mutations, tooling tests, typecheck, repository tests and standalone sweeps.
Live-provider and large-memory/timing profiles retain commands, mappings and explicit not-run
status. The known builder-docs broken link on main is reported if checked, never repaired here.

Negative controls validate the tooling's own refusals, summary distinctions and fixture
oracles. Cumulative self-review uses 012's obligation/interaction map, source inspection,
counterexamples and mutation discrimination. Commit payload C, rerun the declared clean-C
composition without cached results, then commit only the report/status wrapper H and verify
it against the specification at C. Supply exact identities and outside-repository handover.

## Accepted designs and questions

Design 01's isolation/result protocol and design 02's explicit mappings remain fit, with the
reporting and coverage gaps above. This note adds mechanisms for the existing finite F/P
obligations; it adds no criterion, execution profile, acceptance gate or legal outcome. No
contract revision or owner question is currently required. If implementation shows that a
criterion must close differently, stop that dependent work and propose the precise revision.

Owner notes: bytes-core adoption, canonicalize@3.0.0 findings, PROXY-01, realm correction,
coordinator refactoring and K1.3 remain outside this packet. Reproducing a held defect earns
no correction/hold-release credit. Any newly exposed semantic defect is recorded for its
owner while independent tooling work continues. No production-package edit, dependency,
third-party source reuse, hostile-suite/analyzer retirement, push, merge or self-acceptance.
