# K1.0 independent review — round 1

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-13  
**Role:** accountable independent reviewer; I did not implement this candidate.

## Candidate binding and access

This review binds only to submitted candidate H:

- governing process / review base: `c9a9ed7e6e538ab0542fc6a999426264abb6212a`;
- clean payload C: `811758ee1037c3862d1ebd2ec799fad5f6c3b57f`;
- submitted H: `40bb07a54cd5ba78aed386cb03cd0fb47579b6f6`;
- branch: `codex/k1.0-target-boundary-legacy-quarantine`.

At review start the advertised branch SHA was exactly H and advertised `main` was exactly the recorded
base. I inspected the pinned repository through the authorized GitHub connector, including the
applicable repository instructions, mental model, development front door, 006/007/008/012/013 at the
governing base, the K1.0 contract, ownership inventory, implementation report, validation records,
changed source/tests/manifests, the predecessor architecture test, and the correction commits. I also
inspected the benchmark E1 preparation repository read-only at the identities K1.0 records.

I do **not** have a local executable checkout of either repository in this review session, so I did
not independently rerun `npm test`, typecheck, conformance, SDK, builder-docs or the candidate test
modules. I inspected the immutable clean-C logs. Separately, I used an isolated local Node process to
challenge a minimal source string against the candidate scanner algorithm and to syntax-check that
source; that is an independent counterexample probe, not a rerun of the repository suite.

Identity / interval verification:

- base→C is exactly three K1.0 payload commits: `0eb068d960df6ee944de6fbec9ab53950272c7db`,
  `2ed8523421bf4546134dc159ede080fafbfb065a`, and
  `811758ee1037c3862d1ebd2ec799fad5f6c3b57f`;
- base→C changes the declared fourteen files, including the package-lock workspace addition; no other
  packet payload is present;
- C→H is exactly one administrative/report commit. Its changes are the K1.0 implementation report,
  validation attachments/manifest, 007 status/release transcription, and matching 001/README live
  summaries; no source, test, fixture, evaluator, threshold or package payload first appears in H;
- the self-found traversal correction `2ed8523…` and the final contract/count reconciliation
  `811758e…` were inspected as correction deltas as well as through the cumulative H tree.

Prerequisites and external identities were also independently checked. K0.2 was accepted at H16
`90a6f37eaeb61009025449a1abc7e6d31dc1dbb2`, recorded by `review-17.md`, and integrated as
`0535160e677231da41b06d9f822e62e2f0364dd1`. The owner's K1.0 release and E1-dependency amendment are
recorded in the K1.0 contract. Benchmark branch `codex/e1-kernel-acceptance-capture` advertises H2
`8de04779d279dba82cf834d419e465d2b677ef46`, parent C2
`d8f17549c31f9ee5d995e773c2f211faed2785fb`, while benchmark `main` remains
`5a3f1ba525f68244701b1f73a1d29c4902ffe589`. Its authoritative E1 row is `BLOCKED_EXTERNAL`, accepted
by nobody; all fifteen subject schedules are `REFUSED` and the inherited gate has `NO_RESULT`.
`fixtures/e1/capture-set.json` independently confirms `e1-capture-set-v1`
`sha256:1bb8026410ae73229c42cb7f0c6f9c4286546d068f361c0f6ad4981f81bad898` and
`e1-capture-policy-v1` `sha256:61a1615d41be1e4300c3f54e8d67b0b4ac100e760d97a63e12b52f3388c01265`.
K1.0 therefore correctly earns no E1 credit.

## Independent coverage

I derived coverage from 007/013 and the contract before using the report's explanation. The main
interactions challenged were:

1. **C1 ↔ C2 ↔ C9:** an apparently clean target graph is meaningful only if legal source syntax
   cannot hide an edge from the scanner/walker. I challenged both false positives and false negatives,
   including syntax outside the committed positive-case matrix.
2. **C3 ↔ C6 ↔ C7:** preservation of the supported legacy surface must coexist with an unpublished,
   refusing target package; the rename may not silently weaken the old vendor-neutrality assertions.
3. **C4 ↔ C5:** the prose inventory must describe a pinned measured tree and agree with the executable
   policy and real packet owners, not merely contain matching strings.
4. **C8:** prepared E1 material must be pinned and truthfully non-accepted, without converting fixture
   preparation into a gate result.
5. **Correction closure:** K1.0-SELF-01 had to stop attribution at the first forbidden edge without
   making approved leaves opaque. The cumulative implementation does that, and the approved-leaf
   dependency control preserves the transitive check.

The strongest additional counterexamples were a legal regular-expression placement that corrupts the
scanner's lexical state, a non-literal dynamic import that the scanner does not represent at all, and
a provenance check of the inventory's claimed measurement revision against the base→C diff.

## Findings

### K10-R1-01 — P1 — the import scanner can miss a real forbidden dependency

**Affected:** `tests/conformance/architecture/module-graph.ts`, especially `maskSource`,
`startsRegex`, the slash/regex branch, and `DYNAMIC_IMPORT`; K1.0-C2 and K1.0-C9; 007/013's meaningful
transitive-guard obligation.

The scanner's regular-expression recognition is heuristic. `startsRegex()` does not treat a slash
after a control-flow closing `)` as the start of a regular-expression literal. The following is
syntactically valid module source:

```ts
if (true) /["']/.test('x');
import { LegacyHarness } from "@arrokothi/core";
```

An independent probe using the candidate algorithm returns **no import specifier** for this source.
The slash after `)` is treated as ordinary code; the quote inside the regex is then treated as a
string delimiter and consumes text through the later import literal. The resulting masked source no
longer presents the forbidden import to `FROM_CLAUSE`, so `walkModuleGraph`/`boundaryViolations` sees
no edge. Node's parser accepts the source. This is therefore a real false-negative path, not malformed
input.

There is a second path in the same defect family: `DYNAMIC_IMPORT` recognizes only a direct literal
slot. A legal `const target = "@arrokothi/core"; await import(target);` creates a runtime dependency
that the scanner emits no edge for. K1.0 explicitly claims dynamic-import coverage; a non-literal
form cannot silently become "no dependency" merely because its value is not statically recoverable.

**Impact:** the exact H tree happens not to contain either bypass, but K1.0's deliverable is an
*enforced* landing zone. Future target Kernel code can introduce a forbidden legacy/package dependency
while the guard remains green. That violates the boundary invariant and makes the C9 claim that the
mechanism is meaningful in both directions false. The existing regex test covers only a regex in a
context the heuristic already recognizes (`=`), so it does not distinguish this wrong scanner.

**Required outcome:** make dependency extraction for the target zone sound or conservatively
fail-closed for the source forms the package can legally contain. The correction evidence must drive
at least the regex/control-flow counterexample above and the non-literal dynamic-import case through
the same scanner → workspace resolver → graph → boundary-violation path used by the real guard, with
the whole forbidden result asserted. Re-audit both consumers of the shared scanner and the
K0.2-SELF-01 false-positive correction so closing this false negative does not reintroduce prose
phantoms. The implementation mechanism is not prescribed here.

### K10-R1-02 — P2 — the ownership inventory has false measurement provenance and its agreement proof is overstated

**Affected:** `docs/development/work/K1.0/ownership-inventory.md`, section **Current cross-boundary
dependencies**; `tests/conformance/architecture/kernel-landing-zone.test.ts`, section **K1.0 policy
and inventory agree**; K1.0-C4 and the implementation report's C4 interpretation.

The inventory says its cross-boundary table was "Measured at base
`c9a9ed7e6e538ab0542fc6a999426264abb6212a`" and then records `target-kernel` as having two `.ts`
files. That cannot be true: base→C adds `packages/kernel` and both of those source files. At the named
base the target package did not exist. The table may describe the candidate tree, but its recorded
measurement identity is wrong.

The claimed mechanical agreement is also narrower than the report says. The tests establish that each
policy zone id/root occurs as a substring in the document, that each policy deferral's fields occur in
the document, and that the allowed-leaf list is empty with a reason. They do not check the reverse
(document-only rows), the measured cross-boundary edge table, or the export-ownership table. Thus the
report/contract language that policy and inventory are checked "in both directions" is not supported
by those assertions. The twelve **actual** deferred owners used by H do correspond to packet IDs in
007, so I do not turn that proof-description weakness into a separate C5 failure.

**Impact:** C4 is a required packet record, not optional explanatory prose. A false pinned measurement
identity makes its evidence non-reproducible, and the current oracle would permit material prose-only
drift while claiming bidirectional agreement.

**Required outcome:** give the inventory's measured facts one truthful pinned tree identity (or
explicitly distinguish facts measured at different pinned trees) and reconcile the claimed ownership,
exports and dependency measurements with that identity. Evidence must either actually distinguish
policy↔inventory drift for the dimensions C4 claims or narrow the claim/evidence wording to what is
really verified, while still satisfying 007's inventory obligation. Reconcile the implementation
report/contract evidence description and rerun affected checks. No semantic owner decision is needed.

## Validation and evidence assessment

I inspected the immutable clean-C validation manifest plus the tree/environment, typecheck, full-test
and scanner-comparison raw logs. They record:

- `npm run typecheck`: exit 0;
- `npm test`: 1837/1837 pass, 280 suites, zero fail/skipped;
- `npm run test:conformance`: 1724 pass according to the immutable manifest;
- builder-docs, target-kernel tests and SDK tests: green according to the immutable manifest;
- base→C: fourteen files, 1608 insertions / 26 deletions, three payload commits;
- `tests/conformance/k0`: byte-identical to base;
- old/new scanner comparison over 325 files: four old-only prose/data entries among pre-existing
  files and no observed lost import in that existing corpus; two new-only genuine imports;
- K1.0-SELF-01 demonstration: four over-attributed violations before the traversal correction, one
  correctly attributed violation after it.

These are **inspected logs, not reviewer reruns**. Their green result is credible evidence for the
exact cases run, but it cannot pass K10-R1-01 because the distinguishing source shape is absent from
the suite. `npm run test:evals` was not run; that exclusion is appropriate because K1.0 claims no
Agent behavior.

## Per-criterion verdicts

| Criterion | Verdict | Independent basis |
|---|---|---|
| **K1.0-C1** | **PASS** | For exact H, the complete target package source is only `index.ts` and `unsupported.ts`; manual source inspection and the real-graph evidence show no forbidden dependency in the submitted tree. This PASS is intentionally narrow: it does not rescue the future enforcement claim that fails C2/C9. |
| **K1.0-C2** | **FAIL** | The committed controls pass their listed cases, but a legal source form can hide a planted `@arrokothi/core` edge and make the same guard path green. A meaningful forbidden-edge oracle must reject a plausible wrong implementation/source shape, not only its existing matrix. See K10-R1-01. |
| **K1.0-C3** | **PASS** | Clean-C full-suite/typecheck evidence is immutable and inspected; the legacy export map/name-digest assertions remain; no legacy source is moved and no existing consumer is routed through the target package. Commands were not independently rerun. |
| **K1.0-C4** | **FAIL** | Required inventory provenance is false for the target row, and the asserted bidirectional policy/document agreement is not actually established for the dependency/export inventory. See K10-R1-02. |
| **K1.0-C5** | **PASS** | All twelve deferred rows have dispositions and owners; the actual owner IDs used by H exist in 007. No unassigned deferral was found. |
| **K1.0-C6** | **PASS** | `@arrokothi/kernel` is private, exports only the explicit throwing refusal/error, implements no protocol, moves no legacy implementation and claims neither publication nor E1 success. |
| **K1.0-C7** | **PASS** | The predecessor and renamed architecture tests retain the thirteen regression cases; the rename/rewording does not remove their assertion subjects. The shared-scanner defect is separately blocking under C2/C9, but the existing legacy corpus comparison found no lost pre-existing import edge. |
| **K1.0-C8** | **PASS** | The E1 preparation identities, branch status, main identity and two capture hashes were independently matched to the benchmark repository. They remain preparation only: accepted by nobody, `BLOCKED_EXTERNAL`, no E1 result. |
| **K1.0-C9** | **FAIL** | The scanner is not meaningful in both directions: K10-R1-01 gives a syntactically valid false negative, and non-literal dynamic import is unrepresented. The existing 35 cases do not discriminate these failures. |

No packet criterion is left unexamined. The three implementation-report limits are treated as limits,
not hidden passes: the stale frozen K0 fixture comment is administrative wording under the recorded
pin; the empty real allowlist is truthful at K1.0; and static structure earns no behavioral K1/E1
credit.

## Verdict and correction handoff

**Required packet status for transcription:** `CHANGES_REQUESTED`.

The current H cannot be accepted because K1.0's primary structural enforcement can be bypassed by
valid source and C4's inventory evidence is not reproducibly bound to the tree it names. Neither
finding requires an architecture decision; both are ordinary same-packet corrections.

```text
Correct the same released packet K1.0 on codex/k1.0-target-boundary-legacy-quarantine.
Base c9a9ed7e6e538ab0542fc6a999426264abb6212a; reviewed H 40bb07a54cd5ba78aed386cb03cd0fb47579b6f6;
review record docs/development/work/K1.0/review-01.md.
Open findings K10-R1-01, K10-R1-02; required outcomes and counterexamples are in that record.
Owner supplemental decisions none; unresolved authority none.
Apply 006 and 012: close the affected scanner/guard and inventory-evidence subsystems and their
dependencies, then re-review the whole cumulative packet. Fix additional in-scope defects with
separate provenance. Use 008 for the next report and 006 for new C/H plus evidence/push handoff.
No successor release.
```

CHANGES REQUIRED
