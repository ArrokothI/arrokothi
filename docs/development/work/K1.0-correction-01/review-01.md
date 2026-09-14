# K1.0-correction-01 independent review — round 1

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-13  
**Role:** independent reviewer; I did not implement this correction. Session identifier is not exposed to me.

## Candidate binding and access

This review binds only to correction candidate H:

- governing/original K1.0 base: `c9a9ed7e6e538ab0542fc6a999426264abb6212a`;
- historically accepted K1.0 H: `f3aa29d7ecba2a23aa85788b7efdebdd383cab24` over C `d693d59aefe5335c8950d57cec6d6b57e375cadc`;
- authentic historical acceptance record A: `36595f57d1f8cec8c4bf8a6293e888ca27750fab` (`review-17.md`);
- owner-delegated cleanup/reopening head: `b8e394dd2a58b839b131943f4ca9b250abff94af`;
- clean correction payload C: `76ce938074ffa910fbd74374e388ba8d226af4c6`;
- submitted correction H: `61133e9c8fd6fc80c6995fd26495e11e9f7f2e57`;
- branch: `codex/k1.0-target-boundary-legacy-quarantine`;
- K1.0 contract revision 17 plus `K1.0-correction-01/contract.md` revision 1.

I read `docs/development/work/K1.0/cleanup-01.md` first, as requested, then the corrective contract/report/evidence and the cumulative candidate. I inspected pinned repository source and immutable logs through the authorized GitHub connector. I do not have a local repository checkout or shell in this review session, so I did not independently rerun npm commands or recompute recorded SHA-256 values. Required source and raw evidence were accessible; this is not a 006 external-access blocker.

Identity checks:

- advertised `main` remains exactly `c9a9ed7e6e538ab0542fc6a999426264abb6212a`;
- advertised packet branch at review start is exact submitted H `61133e9c8fd6fc80c6995fd26495e11e9f7f2e57`;
- `b8e394dd… → C` is exactly one five-file payload commit: the correction contract, K1.0 contract revision 17, `inventory-oracle.ts`, `kernel-landing-zone.test.ts`, and the evidence-record guard;
- `C → H` is exactly one administrative/evidence commit: report, ten logs plus MANIFEST, and status-summary transcriptions; no source/test/fixture/evaluator/configuration payload first appears in H;
- base → C is the cumulative K1.0 history plus the cleanup/correction records; no successor packet payload appears;
- benchmark E1 preparation remains H2 `8de04779d279dba82cf834d419e465d2b677ef46`, benchmark `main` `5a3f1ba525f68244701b1f73a1d29c4902ffe589`, accepted by nobody and carrying no E1 result.

## Cleanup finding disposition

### K10-CLEANUP-01 — materially improved but NOT CLOSED

The correction genuinely closes the four concrete cleanup reproductions and the immediate decoder family behind them:

- decimal count decoding no longer accepts a numeric prefix;
- dependency empty sentinels are matched as whole cells rather than substrings;
- publishability is a whole-cell vocabulary rather than a yes/no prefix;
- code-span/list cells are consumed end to end rather than extracting only quoted subsets.

Those changes are coherent, are exercised through the production parser, and preserve positive spellings. The accepted H's four cleanup counterexamples become unreadable under C as required.

However, the newly added K1.0-SELF-29 closure leaves the same silent-discard invariant open one structural level above the cell decoders.

## Finding K10-CORR1-R1-01 — P2 — C4

**Title:** SELF-29 measures excess cells against the document's mutable header, so an extra header column can make an unread body cell silent again.

**Governing obligation:** K1.0 contract revision 17 and correction contract revision 1 require that every asserted governed value be preserved or rejected; revision 17 additionally states that a body cell read by no column must be reported. C4 remains total/fail-closed relational accounting, not renderer-style truncation.

**Source path:** `tests/conformance/architecture/inventory-oracle.ts`, `readKeyedTable` plus each `RowSpec` consumer.

The reader validates only `governed.header[0]` against `expectedHeaderFirstCell`. Its excess-cell guard is then:

```ts
if (cells.length > governed.header.length) {
  ... report excess ...
}
```

No independent schema arity or full expected-header shape exists in `RowSpec`. Therefore the document can enlarge its own header and delimiter and thereby enlarge the number of body cells the oracle considers non-excess, even though `valueOf` still consumes only the original governed columns.

### Deterministic production-path counterexample

Start from the real **Current cross-boundary dependencies** table and change only its header, delimiter, and target row:

```md
| Zone | `.ts` files | Reaches `legacy-core` via | Reaches third-party | Extra claim |
|---|---:|---|---|---|
| `target-kernel` | 2 | nothing | nothing | `evil-package` |
```

Leave the other real body rows unchanged at four cells.

The current C processes this as follows:

1. `sectionTables` accepts the five-cell header because the five-cell delimiter matches it.
2. `readKeyedTable` accepts the header because its first cell is still exactly `Zone`; cells 2–5 of the header are not validated against an independent schema.
3. Existing four-cell dependency rows remain accepted because short rows are deliberately allowed and their first four governed cells decode normally.
4. The mutated target row has five cells and the header now also has five, so `cells.length > governed.header.length` is false.
5. `parseDependencyTable.valueOf` still decodes only cells 1–4 (`Zone`, count, workspace reaches, third-party reaches). The fifth body cell is consumed by no decoder and is silently discarded.
6. The recorded dependency relation is therefore the same `target-kernel -> { files: 2, reaches: empty, thirdParty: empty }` relation as the baseline, so downstream measured-tree comparison has no fact with which to contradict the fifth claim.

This is the exact fail-open shape SELF-29 says it closes: document content is read by no column and no comparison can contradict it. The difference is that the document first widened its own header, which the current implementation trusts when deciding what counts as excess.

The committed SELF-29 controls append a body cell while leaving the real header unchanged, so they distinguish only `body width > current document header width`. The 89-cell reference audit is cell-local and likewise cannot reveal a schema/header interaction in which the ignored fifth cell never reaches a decoder.

### Required outcome

Reconstruct row schema ownership rather than patching the literal five-column example:

- define the allowed/expected schema independently of the document header for all four governed tables (for example, exact expected header shape and/or an explicit schema arity in `RowSpec`);
- a header must not be able to authorize additional unread body cells merely by adding columns;
- any body cell not owned either by a governed decoder or by an explicitly permitted ungoverned prose column must be reported;
- preserve the established short-row rule where a deliberately ungoverned trailing prose cell is absent, without letting that exception widen the schema;
- add a full production-path control that widens header + delimiter and plants an extra body-cell claim, and show the reviewed C is silent while the correction is loud;
- audit the same header/schema interaction across Zones, Dependency, Export and Deferred tables, not only Dependency;
- update revision-17 prose/report/reference audit so "every cell is read by some column" is proved against a fixed schema rather than against the document's own arity.

No architecture decision is needed: the existing contract already requires the fail-closed outcome. This is a coding/evidence defect.

## Cumulative criterion verdicts

| Criterion | Verdict | Independent rationale |
|---|---|---|
| **K1.0-C1** | **PASS** | Correction-01 changes no target-zone traversal/policy source. The cumulative zone remains the same refusal-only package and the transitive fail-closed dependency rule remains intact. |
| **K1.0-C2** | **PASS** | Representative forbidden/permitted edge controls are unchanged by this correction and remain covered by the clean-C full/conformance runs. No correction change weakens scanner non-vacuity. |
| **K1.0-C3** | **PASS** | No legacy production/public-export path changes in the correction. Clean-C evidence records 2044/2044 full tests, 300 suites, zero fail/skipped, and typecheck clean. |
| **K1.0-C4** | **FAIL** | K10-CLEANUP-01's direct decoder bugs are corrected, but K10-CORR1-R1-01 leaves an unread-cell fail-open path when the document widens its own header/delimiter. The claimed SELF-29 invariant is therefore not closed. |
| **K1.0-C5** | **PASS** | Deferred policy/inventory assignments remain unchanged; all twelve assignments and packet owners remain present. Whole-cell changes do not alter their owners. |
| **K1.0-C6** | **PASS** | Target package/non-goals are unchanged: private, refusal-only, no protocol implementation, no E1/package-release claim. |
| **K1.0-C7** | **PASS** | Legacy regression/vendor-neutrality sources are untouched; architecture coverage grows without removed tests. Clean-C evidence records zero skipped tests. |
| **K1.0-C8** | **PASS** | E1 preparation identities remain unchanged and unaccepted; correction claims no E1 result. |
| **K1.0-C9** | **PASS** | Dependency scanner/source parser is unchanged by correction-01; its fail-closed/prose-discrimination controls remain in the cumulative suite. |

## Evidence assessment

I inspected the immutable validation-01 records bound to clean payload C. They record:

- `npm run typecheck`: exit 0;
- `npm test`: 2044/2044, 300 suites, zero fail/skipped;
- `npm run test:conformance`: 1931/1931, 281 suites, zero fail/skipped;
- builder-docs: 26 files / 286 links+anchors / 38 public imports;
- kernel: 4/4;
- SDK: 22/22;
- cleanup demonstration: original four reproductions plus 18 further cases, 9 H/C distinctions;
- whole-cell audit: 89 mutated cells across seven governed columns plus 93 real governed cells;
- focused C4 controls: 200 tests / 20 suites, zero fail/skipped; evidence-record guard 4/4.

These logs support the implemented decoder changes but do not cover K10-CORR1-R1-01's header/schema interaction. Green tests therefore do not close C4.

## Verdict

**CHANGES REQUIRED.**

K1.0-correction-01 round 1 does not restore usable acceptance for cumulative candidate H `61133e9c8fd6fc80c6995fd26495e11e9f7f2e57`. C1–C3 and C5–C9 PASS; C4 FAILS on K10-CORR1-R1-01.

The historical ACCEPT of K1.0 H `f3aa29d7ecba2a23aa85788b7efdebdd383cab24` remains preserved as history, while its C4 claims, integration and dependent release remain on hold. No E1 result, K1 closure, merge or successor release follows from this review.

CHANGES REQUIRED
