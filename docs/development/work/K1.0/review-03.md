# K1.0 independent review — round 3

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-13  
**Role:** accountable independent reviewer; I did not implement this candidate.

## Candidate binding and access

This review binds only to submitted candidate H:

- governing process / review base: `c9a9ed7e6e538ab0542fc6a999426264abb6212a`;
- previous reviewed H2: `d4347837699b80e5cbffa83d48dd7a8c9e53f7e6`;
- round-2 review record: `docs/development/work/K1.0/review-02.md`, recorded by
  `eef87cc3dcfc577992dca2d67704ee11cdc12245`;
- clean round-3 payload C: `839b32d085306b96358295edf86fec85836ce462`;
- submitted round-3 H: `bddbbc6ee8bc3ce1198c431efedcf9227d8d5cba`;
- branch: `codex/k1.0-target-boundary-legacy-quarantine`.

At review start the advertised branch SHA was exactly H, and advertised `main` remained exactly the
recorded base. I inspected the pinned repository through the authorized GitHub connector: the
round-2 review, revision-3 contract, correction delta, cumulative source/tests, ownership inventory,
new inventory oracle, implementation-03 and validation-03 records. I also rechecked the benchmark E1
preparation branch read-only; it still advertises H2 `8de04779d279dba82cf834d419e465d2b677ef46`
with parent C2 `d8f17549c31f9ee5d995e773c2f211faed2785fb` and remains unaccepted preparation.

I do **not** have a local executable checkout of either repository in this review session, so I did
not independently rerun `npm test`, typecheck, conformance, SDK, builder-docs or the candidate test
modules. I inspected their immutable clean-C logs and the quoted demonstration sources/output. The
blocking counterexample below is established directly from the committed parser/oracle control flow;
it does not depend on an unobserved test run.

Identity / interval verification:

- H2 is followed by exactly one immutable round-2 review-record commit, `eef87cc…`;
- `eef87cc…` → C is exactly one correction payload commit touching the revision-3 contract,
  inventory, the two reconstructed architecture subsystems and their tests; no other packet payload is
  present;
- C's parent is exactly `eef87cc…`;
- H's parent is exactly C;
- C → H is exactly one report/evidence/status commit containing implementation-03,
  validation-03's manifest and ten logs, and matching 001/007/README status summaries; no source,
  test, fixture, evaluator, threshold, package or configuration payload first appears in H;
- base → C remains the cumulative K1.0 history; no unrelated packet payload appears in that diff;
- `tests/conformance/k0` is recorded byte-identical to the base.

## Independent coverage and prior-finding disposition

I derived the same governing interactions from 007/013 and the contract before relying on the round-3
report:

1. **C1 ↔ C2 ↔ C9:** dependency extraction must reject legal dependency-bearing source forms rather
   than only the prior counterexamples, while retaining the K0.2-SELF-01 prose distinction.
2. **C3 ↔ C6 ↔ C7:** stronger analysis machinery must not route consumers through the target package,
   change the legacy public surface or weaken retained legacy architecture assertions.
3. **C4 ↔ C5:** the human inventory must be accurately pinned and the executable oracle must reject a
   materially wrong ownership/export/dependency relation, including document shapes not selected by
   the implementer's mutation matrix.
4. **C8:** E1 preparation must remain pinned and explicitly non-accepted.
5. **Correction closure:** because both round-2 findings reopened previously corrected subsystems, the
   round-3 work had to demonstrate reconstruction at the governing invariant and explain why the prior
   pass missed the conceptual aliases.

### K10-R2-01 disposition — CLOSED

The dependency-extraction reconstruction materially changes the coverage model rather than patching
only `ImportTypeNode`. `moduleDependenciesIn` now consumes a typed dependency record; the AST pass
covers import/export declarations, import-equals, value-position dynamic import, `ImportTypeNode`,
string-named module declarations, reference paths and reference-types directives, while
`preProcessFile` supplies a separately implemented second extractor. Unresolvable targets use the
general `UNRESOLVABLE_MODULE_TARGET` fail-closed sentinel. Reference paths retain their path target so
the graph resolves them relative to the referring file instead of treating them as bare packages.

I inspected the committed extractor matrix and full-path controls. The review-02 counterexample
`type T = import("@arrokothi/core").X`, `typeof import(...)`, nested import types, both triple-slash
reference forms and the ambient-module form now reach the same workspace resolver / graph / boundary
predicate and produce the forbidden edge. The ordinary import forms and permitted in-zone cases remain
present, and the K0.2-SELF-01 prose controls are reasserted after the rebuild. The validation-03
round-2-versus-round-3 demonstration reports seven previously invisible forms going 0 → 1 violation,
with two already-working forms remaining 1 → 1. I found no additional required NodeNext module-syntax
form that bypasses the target boundary in this candidate.

The contract's recorded exclusions do not earn broader claims: the guard remains a static source
boundary and no durability, Runtime fidelity or K1/E1 behavior follows from it. Those limits do not
prevent C2/C9 from passing their K1.0 obligation.

### K10-R2-02 disposition — still open at the C4 invariant

The new oracle is a substantial improvement: it parses row associations instead of independent token
sets, compares zone roots, complete DX tuples and package export/publishability rows, and the committed
mutations now distinguish the round-2 swap/owner/disposition/publishability failures. The current
inventory text also agrees with the current executable policy/manifests.

However, the rebuilt parser remains fail-open for a distinct wrong-document shape: **duplicate readable
rows with the same key**. That is the finding below.

## Finding

### K10-R3-01 — P2 — the “strict” relational inventory oracle silently erases contradictory duplicate rows

**Reopens:** only the agreement-proof portion of K10-R2-02 / K10-R1-02. The measurement-provenance
correction remains closed.  
**Affected:** `tests/conformance/architecture/inventory-oracle.ts` `parseInventory`; the separate
cross-boundary table parser in `tests/conformance/architecture/kernel-landing-zone.test.ts`; K1.0-C4
and revision-3's claim that an unreadable/wrong row cannot go quiet.

Each parsed ownership relation is stored directly in a `Map` with `set(id, row)` / `set(name, row)`.
There is no duplicate-key check before the write. A later readable row therefore overwrites an earlier
readable row with the same key. The overwritten row is not added to `unreadable`, is not preserved as
an extra relation, and cannot be seen by `inventoryDisagreements`.

A concrete mutation of the real **Zones** table is enough to distinguish the problem. Insert this
readable but false row immediately **before** the current correct `target-kernel` row, leaving the
correct row untouched:

```markdown
| `target-kernel` | `packages/core/src` | stale/contradictory duplicate |
| `target-kernel` | `packages/kernel/src` | New Kernel work under the target protocol ... |
```

`parseInventory` first stores `target-kernel → packages/core/src`, then silently overwrites it with
`target-kernel → packages/kernel/src`. `parsed.unreadable` stays empty; the final map agrees with the
policy; `inventoryDisagreements` therefore reports no problem from the contradictory row. Reversing
the two rows happens to fail, which means the oracle's result depends on duplicate-row order rather
than on whether the document is internally consistent.

The same structural hole exists for duplicate DX ids and package names in `parseInventory`. The
separate cross-boundary dependency-table test also builds a `Map<string,...>` with `parsed.set(zoneId,
...)` and no duplicate check, so a stale wrong dependency row followed by the correct row is likewise
silently discarded before recomputation.

This is not an invented requirement about Markdown style. C4 requires an **accurate** ownership,
export and dependency inventory, and revision 3 specifically claims relational agreement and strict
parsing such that a wrong row cannot go quiet. A human-readable inventory containing two contradictory
rows for the same declared identity does not agree with the policy merely because the parser chooses
the last one.

**Impact:** the reconstructed evidence can still be green while the required inventory itself contains
material contradictory ownership/export/dependency assertions. The current checked-in inventory does
not contain such duplicates; the defect is in the executable evidence that claims to distinguish its
future drift, so C4 cannot receive PASS on the stated evidence claim.

**Required outcome:** make uniqueness part of every keyed inventory relation the C4 evidence claims.
A duplicate zone id, DX id, package name or cross-boundary dependency zone must be an explicit
agreement failure (or preserve all rows and compare them without last-write-wins loss). Add
mutated-document controls with a false duplicate both before and after the correct row so the result is
order-independent. Keep the current relational tuple comparisons and measurement provenance; this
finding does not ask for another redesign of the already-correct dimensions. Reconcile the C4
contract/report wording if the implemented guarantee differs. No owner semantic decision is needed.

## Validation and evidence assessment

I inspected `validation-03/MANIFEST.md` and the relevant raw/demonstration records. They bind to clean
payload C `839b32d085306b96358295edf86fec85836ce462`, Node v25.2.1 / npm 11.6.2 /
TypeScript 5.9.3, and record:

- `npm run typecheck`: exit 0;
- `npm test`: 1885/1885, 284 suites, zero fail/skipped;
- `npm run test:conformance`: 1772/1772, 265 suites, zero fail/skipped;
- builder-docs: 26 Markdown files / 284 links or anchors / 38 public package imports;
- target-kernel tests: 4 pass; SDK tests: 22 pass;
- `tests/conformance/k0`: byte-identical to the base;
- two-extractor comparison over the synthetic matrix and 326 repository sources: no reported
  preprocessor-only specifier in that corpus;
- K10-R2-01 demonstration: seven previously invisible forms 0 → 1 violation, two retained forms 1 → 1,
  and 326/326 current sources unchanged versus the round-2 extractor;
- K10-R2-02 demonstration: the old token-set checks miss five of ten selected wrong documents, while
  the new relation oracle rejects all ten selected mutations.

These are inspected pinned logs, not reviewer reruns. The green suite is credible for the exact cases
run, but the ten C4 mutations do not include a duplicate-key document, and source inspection shows why
that eleventh shape bypasses the new oracle. `npm run test:evals` was not run; that remains an
appropriate exclusion because K1.0 changes no Agent/model-facing behavior.

I also noticed two non-blocking evidence-description nits while completing the cumulative pass. C2's
revision-3 prose calls its 23 **test cases** “fixture repositories”; some cases create two temporary
repositories, so the literal repository count is higher. The suite/report's 15 → 23 control-case count
is the meaningful number and is supported. Separately, the contract describes bare `require()` as a
deliberate extractor exclusion; the compiler preprocessor is intentionally broader than the AST table,
so that wording should not be read as a proof that every future call with that spelling is invisible.
Neither observation supplies a boundary bypass in the submitted target tree or changes the verdict
below; they should be reconciled when the required C4 payload is corrected.

## Per-criterion verdicts

| Criterion | Verdict | Independent basis |
|---|---|---|
| **K1.0-C1** | **PASS** | The exact submitted target source remains the two-file refusal package and its reconstructed real graph has no forbidden edge. No target source/public behavior was added by round 3. |
| **K1.0-C2** | **PASS** | The reconstructed extractor closes the review-02 import-type bypass and the additional reference/ambient families through the same real guard path, while permitted/in-zone controls remain green. I found no further required NodeNext module-syntax bypass in scope. |
| **K1.0-C3** | **PASS** | Clean-C full-suite/typecheck evidence is green; cumulative diff still moves no legacy source or public export, and reverse quarantine remains in place. |
| **K1.0-C4** | **FAIL** | Current rows are correct, but the claimed strict relational evidence silently overwrites an earlier contradictory duplicate row for every keyed ownership table, and the dependency-table parser has the same last-write-wins hole. See K10-R3-01. |
| **K1.0-C5** | **PASS** | The twelve actual current DX rows each have a concrete path, disposition and packet owner; the duplicate-row oracle defect is blocking under C4, not evidence that a current extraction is unassigned. |
| **K1.0-C6** | **PASS** | Target package remains private and exposes only the explicit throwing refusal/error; no protocol implementation, no no-op API, no E1 success and no package-release claim is introduced. |
| **K1.0-C7** | **PASS** | The retained legacy suite remains present with the same thirteen original assertion subjects; round 3's shared-scanner changes do not alter the legacy public surface or route it through target work. |
| **K1.0-C8** | **PASS** | Benchmark E1 preparation identities remain pinned at the same unaccepted H2/C2 branch; K1.0 still claims no E1 result. |
| **K1.0-C9** | **PASS** | The prior scanner false-negative family is reconstructed across import types, reference directives and ambient module syntax, with general fail-closed handling and post-rebuild prose controls. The recorded static-source limits remain limits, not behavioral credit. |

No packet criterion is left unexamined. No architecture ambiguity or unavailable mandatory evidence
blocks correction; K10-R3-01 is an ordinary same-packet evidence/oracle defect.

## Verdict and correction handoff

**Required packet status for transcription:** `CHANGES_REQUESTED`.

Round 3 successfully closes the P1 scanner family. It cannot yet be accepted because the reconstructed
C4 oracle still has an order-dependent last-write-wins path that can erase a contradictory inventory
row while claiming strict relational agreement.

```text
Correct the same released packet K1.0 on codex/k1.0-target-boundary-legacy-quarantine.
Base c9a9ed7e6e538ab0542fc6a999426264abb6212a; reviewed H bddbbc6ee8bc3ce1198c431efedcf9227d8d5cba;
review record docs/development/work/K1.0/review-03.md.
Open finding K10-R3-01; required outcome and counterexample are in that record.
Owner supplemental decisions none; unresolved authority none.
Apply 006 and 012: close duplicate-key/uniqueness handling across every keyed C4 inventory relation,
then re-review the whole cumulative packet. Preserve the round-3 scanner reconstruction and current
relational tuple checks; fix any additional in-scope defect with separate provenance.
Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.
```

CHANGES REQUIRED
