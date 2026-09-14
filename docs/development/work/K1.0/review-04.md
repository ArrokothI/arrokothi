# K1.0 independent review — round 4

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-13  
**Role:** accountable independent reviewer; I did not implement this candidate.

## Candidate binding and access

This review binds only to submitted candidate H:

- governing process / review base: `c9a9ed7e6e538ab0542fc6a999426264abb6212a`;
- previous reviewed H3: `bddbbc6ee8bc3ce1198c431efedcf9227d8d5cba`;
- round-3 review record: `docs/development/work/K1.0/review-03.md`, recorded by
  `d0694071ae41de1c13fc526a63e96c3f5ccfb7ee`;
- clean round-4 payload C: `0f012d4eed6ccc905236ccdafc25148d399619d6`;
- submitted round-4 H: `14cc1c1997573ac434b2491653ab4cb974abf633`;
- branch: `codex/k1.0-target-boundary-legacy-quarantine`.

At review start the advertised branch SHA was exactly H, and advertised `main` remained exactly the
recorded base. I inspected the pinned repository through the authorized GitHub connector, including
review-03, contract revision 4, the complete round-4 correction delta, the cumulative K1.0 diff,
implementation-04, validation-04, and the affected C4 oracle/tests. I also rechecked the benchmark E1
preparation branch read-only; it remains at H2 `8de04779d279dba82cf834d419e465d2b677ef46`
with parent C2 `d8f17549c31f9ee5d995e773c2f211faed2785fb` and remains unaccepted preparation.

I do **not** have a local executable checkout of either repository in this review session, so I did
not independently rerun the repository's test/typecheck/conformance commands. I inspected the pinned
clean-C logs. The blocking C4 counterexample below follows directly from the committed parser control
flow and does not depend on an unobserved command. The validation-manifest digest defect is likewise
visible directly in the committed record.

Identity / interval verification:

- H3 is followed by exactly one immutable round-3 review-record commit, `d069407…`;
- `d069407…` → C is exactly one correction payload commit touching only contract revision 4,
  `inventory-oracle.ts`, and `kernel-landing-zone.test.ts`;
- C's parent is exactly `d069407…`;
- H's parent is exactly C;
- C → H is exactly one report/evidence/status commit containing implementation-04,
  validation-04's manifest/eight logs and matching 001/007/README live summaries; no source, test,
  fixture, evaluator, threshold, package or configuration payload first appears in H;
- base → C remains the cumulative K1.0 history; no unrelated packet payload appears in that diff;
- `tests/conformance/k0` is recorded byte-identical to the base.

## Independent coverage and prior-finding disposition

I repeated the cumulative obligation map rather than limiting review to the duplicate fix:

1. **C1 ↔ C2 ↔ C9:** preserve the accepted round-3 scanner reconstruction and its fail-closed/prose
   distinction.
2. **C3 ↔ C6 ↔ C7:** no correction may move legacy source, alter public exports, route consumers
   through the target package or weaken retained assertions.
3. **C4 ↔ C5:** every ownership/export/dependency assertion must be represented by evidence that
   rejects a materially wrong document, including row association, uniqueness and parser failure.
4. **C8:** E1 preparation remains pinned, external and non-accepted.
5. **Evidence/process:** the clean-C validation record itself must truthfully identify its raw evidence
   under 006/008.

### K10-R3-01 disposition — exact counterexample closed, C4 invariant still not fully closed

The round-3 duplicate-key counterexample is genuinely fixed for **well-formed** rows. `parseInventory`
now keeps the first zone/DX/package row and records later rows with the same key through its
`unreadable` disagreement channel. The committed controls exercise false-before-correct and
false-after-correct order for all three relations. The cross-boundary dependency table likewise has a
shared `parseDependencyTable` helper and detects a second **well-formed numeric** row for the same
zone in either order.

However, that dependency-table helper discards a candidate row before checking its key whenever its
file-count cell is not parseable. The revision-4 claim says a duplicate cross-boundary zone row is a
disagreement regardless of order, and C4 remains an accurate-inventory obligation. That broader
uniqueness/strictness invariant therefore remains open under the finding below.

## Findings

### K10-R4-01 — P2 — the dependency-table parser still drops malformed keyed rows before uniqueness checking

**Reopens:** the cross-boundary dependency-table portion of K10-R3-01 / C4 only. The three ownership
relations' duplicate handling is closed.  
**Affected:** `tests/conformance/architecture/kernel-landing-zone.test.ts`, `parseDependencyTable`;
K1.0-C4 and revision 4's claim that a duplicate cross-boundary dependency zone row is a disagreement
regardless of order.

`parseDependencyTable` extracts `zoneId`, then parses the file-count cell with `Number.parseInt`. If
that parse is `NaN`, it executes `continue` **before** the `parsed.has(zoneId)` duplicate check. The
row is not recorded as unreadable, not recorded as a duplicate and not otherwise preserved.

A concrete distinguishing mutation is to insert this row immediately before the current correct
`target-kernel` dependency row:

```markdown
| `target-kernel` | not-a-count | `@arrokothi/core` | nothing |
| `target-kernel` | 2 | nothing | nothing |
```

The first row is a Markdown dependency-table row with the same declared zone key and a materially
wrong dependency assertion. The current helper obtains `zoneId === "target-kernel"`, obtains
`NaN` for the file count, and silently continues. The correct row then populates the map;
`duplicates` remains empty; the key set and recomputed file/edge comparisons see only the correct
row and pass. The same malformed duplicate placed after the correct row is also silently skipped
before the duplicate check.

This is the same failure mode revision 4 says it closes: a contradictory duplicate row for the same
key can still disappear, now through parse failure rather than last-write-wins. It is also inconsistent
with the strictness principle already used by `parseInventory`, where an unreadable ownership row is
itself a disagreement rather than silence.

**Impact:** C4's dependency evidence can remain green while the human inventory contains an invalid or
contradictory assertion for a declared zone. The checked-in document currently has no such row; the
defect is in the executable drift oracle that revision 4 claims is order-independent and fail-closed.

**Required outcome:** account for every candidate data row in the dependency table before discarding
it. A row with a recognizable zone key but malformed count/cells must be an explicit disagreement,
and duplicate detection must not depend on the other cells parsing successfully. Add controls for a
malformed duplicate both before and after the correct row through the same parser used by the real C4
check. Preserve the accepted relational and well-formed duplicate controls; no broader redesign is
required.

### K10-R4-02 — P2 — validation-04 records an impossible SHA-256 identity for the SDK log

**Affected:** `docs/development/work/K1.0/validation-04/MANIFEST.md`; 006/008 evidence-record
requirements. This does not invalidate the underlying SDK test result itself.

The manifest labels the digest of `07-test-sdk.log` as SHA-256 but records:

```text
dd227f9ffd8ab92b4e77570cd9ea294559dbbb575a7f1cad1470
```

That value contains 52 hexadecimal characters; a SHA-256 digest encoded as hex has 64. The raw
`07-test-sdk.log` is accessible in H and records 22 passes / 0 failures, and the full suite also
contains the SDK tests, so this is not a claim that SDK behavior failed. It is an incorrect immutable
evidence identity in a manifest that 006/008 require to record raw paths and digests accurately.

**Required outcome:** recompute and record the exact SHA-256 of the pinned SDK log, reconcile any
report/manifest reference that depends on it, and carry the corrected evidence in the next candidate
under 006's rule that evidence changed after H requires a new candidate/review. No source correction
is implied by this finding.

## Validation and evidence assessment

I inspected `validation-04/MANIFEST.md` and the targeted raw records. They bind to clean payload C
`0f012d4eed6ccc905236ccdafc25148d399619d6`, Node v25.2.1 / npm 11.6.2 /
TypeScript 5.9.3, and record:

- `npm run typecheck`: exit 0;
- `npm test`: 1892/1892, 284 suites, zero fail/skipped;
- `npm run test:conformance`: 1779/1779, 265 suites, zero fail/skipped;
- builder-docs: 26 Markdown files / 284 links or anchors / 38 public package imports;
- target-kernel tests: 4 pass; SDK tests: 22 pass;
- `tests/conformance/k0`: byte-identical to the base;
- the six zone/DX/package duplicate controls reject false-before and false-after forms;
- the committed cross-boundary test rejects a second well-formed numeric `target-kernel` row in both
  orders.

These are inspected pinned logs, not reviewer reruns. The suite is credible evidence for the exact
cases run. It does not contain the malformed-row case above, which is skipped before the new duplicate
check. The SDK raw log itself is available and green; K10-R4-02 concerns the manifest's malformed
digest identity, not the observed test result. `npm run test:evals` was not run; that remains an
appropriate exclusion because K1.0 changes no Agent/model-facing behavior.

The two non-blocking round-3 wording nits remain non-blocking: C2 still calls 23 control **cases**
"fixture repositories" even though some cases create more than one temporary repository, and the
bare-`require()` exclusion wording is broader than the compiler-preprocessor implementation detail.
Neither supplies a boundary bypass or changes a criterion verdict. Revision 4 also retains a stale
C9 prose count of 325 repository sources while validation-03's corpus evidence reports 326; that is a
documentation count drift, not a semantic failure, but it should be reconciled with the required
correction.

## Per-criterion verdicts

| Criterion | Verdict | Independent basis |
|---|---|---|
| **K1.0-C1** | **PASS** | The submitted target source remains the two-file refusal package and the accepted round-3 graph/scanner reconstruction is byte-untouched by round 4. |
| **K1.0-C2** | **PASS** | The round-3 full-path controls remain intact; round 4 changes no scanner, resolver or boundary predicate. |
| **K1.0-C3** | **PASS** | Clean-C full-suite/typecheck evidence is green; no legacy source/public export is changed. The malformed SDK digest is a process/evidence-record finding, not contrary behavior evidence. |
| **K1.0-C4** | **FAIL** | Well-formed duplicate keys are now rejected, but the dependency-table parser silently discards a malformed row with a recognizable duplicate zone key before checking uniqueness. See K10-R4-01. |
| **K1.0-C5** | **PASS** | The twelve actual DX rows remain assigned to concrete existing packet owners; round 4 changes no assignment. |
| **K1.0-C6** | **PASS** | Target package remains private and exposes only the explicit throwing refusal/error; no protocol, no-op, E1 or release claim is introduced. |
| **K1.0-C7** | **PASS** | The retained legacy suite/scanner reconstruction is unchanged this round and the original assertion subjects remain present. |
| **K1.0-C8** | **PASS** | Benchmark E1 preparation remains at the same unaccepted H2/C2 identities and K1.0 claims no E1 result. |
| **K1.0-C9** | **PASS** | The accepted round-3 scanner reconstruction and prose-soundness evidence are untouched; no new dependency-syntax bypass was found in this round. |

No packet criterion is left unexamined. No architecture ambiguity or unavailable mandatory evidence
blocks correction; both findings are ordinary same-packet corrections.

## Verdict and correction handoff

**Required packet status for transcription:** `CHANGES_REQUESTED`.

The round-4 candidate cannot be accepted. It closes the exact well-formed duplicate-key bypass from
review-03, but the same C4 parser still has a parse-before-uniqueness path that can erase a malformed
contradictory dependency row, and one validation digest identity is malformed.

```text
Correct the same released packet K1.0 on codex/k1.0-target-boundary-legacy-quarantine.
Base c9a9ed7e6e538ab0542fc6a999426264abb6212a; reviewed H 14cc1c1997573ac434b2491653ab4cb974abf633;
review record docs/development/work/K1.0/review-04.md.
Open findings K10-R4-01, K10-R4-02; required outcomes and counterexamples are in that record.
Owner supplemental decisions none; unresolved authority none.
Apply 006 and 012: close dependency-table strictness/uniqueness without redesigning the accepted
relations, correct the validation digest record, then re-review the whole cumulative packet.
Fix any additional in-scope defect with separate provenance.
Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.
```

CHANGES REQUIRED
