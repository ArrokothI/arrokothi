# K1.0 independent review — round 2

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-13  
**Role:** accountable independent reviewer; I did not implement this candidate.

## Candidate binding and access

This review binds only to submitted candidate H:

- governing process / review base: `c9a9ed7e6e538ab0542fc6a999426264abb6212a`;
- previous reviewed H: `40bb07a54cd5ba78aed386cb03cd0fb47579b6f6`;
- round-1 review record: `docs/development/work/K1.0/review-01.md`, recorded by `bded42da3f309716b463623aefbf8816176e65a1`;
- clean round-2 payload C: `960a446b77bbd7d6973900eb23e10558c2584763`;
- submitted round-2 H: `d4347837699b80e5cbffa83d48dd7a8c9e53f7e6`;
- branch: `codex/k1.0-target-boundary-legacy-quarantine`.

At review start and immediately before recording this review, the advertised branch SHA was exactly H.
Advertised `main` remains exactly the recorded base. I inspected the pinned repository through the
authorized GitHub connector, including the governing 006/007/008/012/013 baseline, contract revision 2,
round-1 review, round-2 report and validation records, the correction delta and cumulative source/tests.
I also rechecked the benchmark E1 preparation branch read-only.

I do **not** have a local executable checkout of either repository in this review session, so I did not
independently rerun the repository's full test/typecheck/conformance commands. I inspected their immutable
clean-C logs. Separately, I used an isolated local Node process to challenge the exact scanner visitor
algorithm and the scanner→resolver→graph→violation behavior on additional synthetic source. That local
probe has TypeScript 5.8.3 rather than the candidate's recorded 5.9.3; the blocking result does not depend
on a version-specific parse error: source inspection shows the candidate visitor has no `ImportTypeNode`
handling at all, and the probe's sources parse with zero diagnostics.

Identity / interval verification:

- previous H `40bb07a…` is followed by the immutable round-1 review record `bded42d…`;
- `bded42d…` → C is exactly one correction payload commit, touching seven K1.0 contract/inventory/
  architecture source-test files and no other packet payload;
- base → C is the cumulative K1.0 history (six commits), preserving the prior H/review record rather
  than rewriting history; no unrelated packet payload appears in the cumulative diff;
- H's parent is exactly C;
- C → H is exactly one report/evidence/status commit. It contains implementation-02, validation-02's
  manifest and nine logs, and the matching 001/007/README status summaries; no source, test, fixture,
  evaluator, threshold, package or configuration payload first appears in H.

Prerequisite identities remain valid. K0.2's accepted/integrated identities are unchanged. Benchmark
branch `codex/e1-kernel-acceptance-capture` still advertises H2
`8de04779d279dba82cf834d419e465d2b677ef46`, parent C2
`d8f17549c31f9ee5d995e773c2f211faed2785fb`. The E1 preparation therefore remains preparation only,
accepted by nobody and worth no E1 credit.

## Independent coverage and prior-finding disposition

I repeated cumulative coverage rather than treating round 1's PASS rows as immunity. The interactions
challenged were:

1. **C1 ↔ C2 ↔ C9:** whether the new AST scanner covers dependency-bearing TypeScript syntax as a
   category, not only the two round-1 examples and the committed positive-case matrix.
2. **C3 ↔ C6 ↔ C7:** whether the stronger scanner and its `typescript` dependency weaken the retained
   legacy/public-surface assertions or route existing consumers through the target zone.
3. **C4 ↔ C5:** whether the corrected inventory is truthfully pinned and whether the claimed
   bidirectional executable agreement rejects a materially wrong ownership relation rather than only
   comparing independent token sets.
4. **C8:** whether E1 preparation remains pinned, external and non-accepted.
5. **Correction closure:** whether K10-R1-01 and K10-R1-02 were closed at the governing invariant,
   including conceptual aliases and dependent paths required by 006/012.

The exact two round-1 K10-R1-01 examples are fixed: the regex-after-control-flow form now yields the
forbidden `@arrokothi/core` edge, and a non-literal runtime `import()` yields the fail-closed sentinel.
The round-1 K10-R1-02 provenance error is also fixed: the target row is now explicitly candidate-only
and the pre-existing rows are distinguished from it. The new self-found K1.0-SELF-03 and
K1.0-SELF-04 corrections are coherent with those changes.

However, both prior finding families remain open at the invariant level under new distinguishing
counterexamples below. Under 006's semantic-correction rule, the next correction must reconstruct the
affected scanner/guard and inventory-oracle subsystems rather than patch only these new examples, and
must record why the previous closure pass missed them.

## Findings

### K10-R2-01 — P1 — the corrected scanner still misses a legal type-only dependency

**Reopens:** K10-R1-01 at the governing scanner-soundness invariant.  
**Affected:** `tests/conformance/architecture/module-graph.ts` `importSpecifiersIn`; the target graph
consumer in `kernel-landing-zone.test.ts`; K1.0-C2 and K1.0-C9; 007's explicit acceptance that new
Kernel work cannot depend on legacy/native internals through **type-only** imports; 013's transitive/
type-only guard requirement.

The AST rewrite handles `ImportDeclaration`, `ExportDeclaration`, `ImportEqualsDeclaration`, and a
runtime `CallExpression` whose expression is the `import` keyword. It does not handle TypeScript's
`ImportTypeNode`. Therefore this legal type-only source carries a dependency the scanner emits no edge
for:

```ts
export type LegacyExecution = import("@arrokothi/core").ExecutionContext;
```

`typeof import("@arrokothi/core")` has the same omission. An independent probe of the candidate visitor
algorithm returns `[]` for both forms with zero parse diagnostics. I also drove the first form through a
minimal replica of the candidate's `loadWorkspace`/`resolveSpecifier`/`walkModuleGraph`/
`boundaryViolations` behavior: it produces **zero edges and zero violations** even though the target
zone names `@arrokothi/core` in a TypeScript import type. The ordinary `import type { … } from …` form
is detected, which is why the committed matrix can be green while this distinct type-only form remains
invisible.

The repo-wide old-versus-new scanner comparison does not close this gap: a dependency form omitted by
both scanners appears in neither side of that comparison. This is exactly the class of correlated
assumption 012 requires a plausible wrong behavior to challenge.

**Impact:** K1.0's deliverable is an enforced target boundary. Future target source can acquire a
legacy type dependency while the architecture guard remains green. That directly violates the packet's
stated type-only boundary and means the scanner is still not meaningful in both directions.

**Required outcome:** reconstruct dependency extraction from the TypeScript dependency-bearing syntax
K1.0 must forbid/allow, including conceptual aliases rather than an enumerated list of prior examples.
Literal import-type expressions such as `import("…").T` and `typeof import("…")` must reach the same
resolver/graph/boundary decision as equivalent import declarations, or conservatively fail closed where
a target cannot be statically established. Add distinguishing extractor and full guard-path controls,
then re-audit **both** shared-scanner consumers and the K0.2-SELF-01 prose-soundness correction. Preserve
the already-correct regex-after-paren and non-literal-runtime-import behavior. The implementation
mechanism is not prescribed.

### K10-R2-02 — P2 — the inventory agreement oracle is still non-relational while claiming exact bidirectional agreement

**Reopens:** the agreement-proof half of K10-R1-02; its measurement-provenance half is closed.  
**Affected:** `tests/conformance/architecture/kernel-landing-zone.test.ts`, section **K1.0 policy and
inventory agree**; `docs/development/work/K1.0/contract.md` C4/C4↔C5; implementation-02's C4 closure
claim.

Round 2 adds reverse checks and real dependency recomputation, which is a material improvement, but
several dimensions still compare independent sets/global substrings rather than the relationships the
inventory claims:

- **Zones:** the reverse test compares the set of documented zone IDs and the set of documented roots
  independently. The forward test likewise checks global document presence. Swapping
  `target-kernel`'s root with `legacy-core`'s root leaves both sets unchanged, so the tests stay green
  while the ownership relation is wrong.
- **Deferred rows:** the forward test checks that each policy `id`, `currentPath` and `owner` occurs
  somewhere in the document; the reverse test compares only the DX-ID set. It does not compare the
  `(id, currentPath, disposition, owner)` row relation, and does not check documented disposition at
  all. Reassigning paths/owners among existing DX rows can therefore preserve every checked token.
- **Export ownership:** the test validates workspace manifests against a hard-coded expected map, then
  checks that each package name/subpath occurs somewhere in the inventory. It does not parse the
  package row or the `Published?` cell. The inventory could, for example, state that
  `@arrokothi/kernel` is published while the manifest remains private and this agreement test would
  still pass.

The **current** inventory text was independently read and its present rows agree with the policy and
manifests; this finding is about the report/contract claim that executable evidence now establishes
exact bidirectional agreement and prevents prose-only drift. The cross-boundary dependency table's new
row-keyed recomputation is substantially stronger and is not the defect here.

**Impact:** C4's evidence still permits material ownership/export/deferral drift while reporting the
agreement suite green. That is the same unsupported-proof family identified in round 1, even though
its candidate-tree provenance defect is corrected.

**Required outcome:** make the executable agreement evidence relational for every dimension the
contract claims — compare the actual zone-id→roots mapping, the complete deferred row tuples, and
package→export/publishability rows, or narrow the contract/report claim to exactly what is mechanically
verified while still satisfying 007's required accurate ownership/export/dependency inventory. Add
mutated-document controls or equivalent distinguishing evidence showing that plausible wrong row
associations are rejected. Reconcile contract/report wording and rerun affected checks. No owner
semantic decision is required.

## Validation and evidence assessment

I inspected the round-2 immutable manifest and source-bearing evidence. It records clean payload C
`960a446…` on Node v25.2.1 / npm 11.6.2 / TypeScript 5.9.3 and:

- `npm run typecheck`: exit 0;
- `npm test`: 1846/1846, 280 suites, zero fail/skipped;
- `npm run test:conformance`: 1733/1733, 261 suites, zero fail/skipped;
- builder-docs: 26 Markdown files / 284 links or anchors / 38 public package imports;
- target-kernel tests: 4 pass; SDK tests: 22 pass;
- `tests/conformance/k0`: byte-identical to the base;
- scanner comparison: 325 files, 317 identical, 32 old-only and 1 new-only, with the pre-existing
  differences inspected as prose/data removals or one genuine recovered import;
- `09-r101-demonstration.log`: the two round-1 scanner counterexamples each produce exactly one
  violation through the candidate's real guard path.

These are inspected pinned logs, not reviewer reruns. They credibly establish the cases that were run,
but neither green suites nor the old/new comparison distinguishes K10-R2-01, and the existing C4 tests
do not distinguish K10-R2-02's wrong-row mutations. `npm run test:evals` was not run; that remains an
appropriate exclusion because this packet changes no Agent/model-facing behavior.

## Per-criterion verdicts

| Criterion | Verdict | Independent basis |
|---|---|---|
| **K1.0-C1** | **PASS** | Narrowly for the submitted tree: `packages/kernel/src` still contains only the refusal entry and implementation, and no forbidden dependency is present in those exact files. This does not rescue the enforcement oracle that fails C2/C9. |
| **K1.0-C2** | **FAIL** | The new controls close the two round-1 examples, but a legal TypeScript import-type dependency produces no scanner edge and therefore no forbidden violation. See K10-R2-01. |
| **K1.0-C3** | **PASS** | Clean-C full-suite/typecheck evidence remains green; legacy public exports/digests are retained; no legacy source is moved and existing consumers are not routed through the target package. |
| **K1.0-C4** | **FAIL** | Measurement provenance is now truthful and the dependency recomputation is improved, but the claimed exact bidirectional agreement for zones/deferrals/exports is not established by the current non-relational oracle. See K10-R2-02. |
| **K1.0-C5** | **PASS** | The twelve current inventory rows were inspected and each has a concrete path, disposition and existing packet owner. The weak row-drift oracle is blocking under C4, but I found no actually unassigned current deferral. |
| **K1.0-C6** | **PASS** | The target package remains private and exposes only an explicit throwing refusal/error; no protocol implementation, no no-op surface, no E1 pass and no publication claim is introduced. |
| **K1.0-C7** | **PASS** | The retained legacy boundary suite remains present; the `typescript` dev-only scanner dependency and explicit sentinel branch are justified and do not remove the original assertion subjects. The shared-scanner false negative is separately blocking under C2/C9. |
| **K1.0-C8** | **PASS** | The benchmark preparation identities remain pinned and unchanged; the branch is still unaccepted preparation and K1.0 claims no E1 result. |
| **K1.0-C9** | **FAIL** | The AST scanner is still not complete for a required type-only dependency form. `ImportTypeNode` can hide a forbidden package from both scanner consumers. See K10-R2-01. |

No packet criterion is left unexamined. No architecture ambiguity or unavailable mandatory evidence
prevents correction; the defects are ordinary same-packet implementation/evidence defects.

## Verdict and correction handoff

**Required packet status for transcription:** `CHANGES_REQUESTED`.

The round-2 candidate cannot be accepted. The exact round-1 examples and provenance defect were
corrected, but both corrected subsystems still admit distinguishing failures at the invariant level.
Because 006 explicitly says a subsequent defect in an already semantically corrected subsystem
triggers reconstruction of that subsystem, the next correction should not be another example-by-
example patch.

```text
Correct the same released packet K1.0 on codex/k1.0-target-boundary-legacy-quarantine.
Base c9a9ed7e6e538ab0542fc6a999426264abb6212a; reviewed H d4347837699b80e5cbffa83d48dd7a8c9e53f7e6;
review record docs/development/work/K1.0/review-02.md.
Open findings K10-R2-01, K10-R2-02; required outcomes and counterexamples are in that record.
Owner supplemental decisions none; unresolved authority none.
Apply 006 and 012: reconstruct the affected scanner/guard and inventory-agreement subsystems and their
dependencies, explain why the prior correction pass missed these conceptual aliases, then re-review
the whole cumulative packet. Fix additional in-scope defects with separate provenance.
Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.
```

CHANGES REQUIRED
