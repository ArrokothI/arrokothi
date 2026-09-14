# K1.0-correction-01 independent review — round 2

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-13  
**Role:** independent reviewer; I did not implement this correction. Session identifier is not exposed to me.

## Candidate binding and access

This review binds only to correction candidate H:

- governing/original K1.0 base: `c9a9ed7e6e538ab0542fc6a999426264abb6212a`;
- historically accepted K1.0 H: `f3aa29d7ecba2a23aa85788b7efdebdd383cab24` over C `d693d59aefe5335c8950d57cec6d6b57e375cadc`;
- authentic historical acceptance record A: `36595f57d1f8cec8c4bf8a6293e888ca27750fab` (`../K1.0/review-17.md`);
- cleanup/reopening head: `b8e394dd2a58b839b131943f4ca9b250abff94af`;
- round-1 correction C/H: `76ce938074ffa910fbd74374e388ba8d226af4c6` / `61133e9c8fd6fc80c6995fd26495e11e9f7f2e57`;
- round-1 review record: `2d50fa3b3d7e23b01823f6d93e80952f70c0c5cc` (`review-01.md`), CHANGES REQUIRED on K10-CORR1-R1-01;
- clean round-2 payload C: `36460438e95e968beec0b354b07a616b53981256`;
- submitted round-2 H: `1295c68b03ae5d8eb0bbb86e974353402ff9a518`;
- branch: `codex/k1.0-target-boundary-legacy-quarantine`;
- K1.0 contract revision 18 plus `K1.0-correction-01/contract.md` revision 2.

At review start the advertised packet branch was exactly H and advertised `main` remained exactly the governing base. I inspected pinned repository source and immutable evidence through the authorized GitHub connector. I do not have a local checkout or repository shell in this review session, so I did not independently rerun npm commands or recompute recorded SHA-256 values. Required source and raw evidence were accessible; this is not a 006 external-access blocker.

Identity / interval verification:

- `2d50fa3… → C` is exactly one payload commit touching four files: K1.0 contract revision 18, correction contract revision 2, `inventory-oracle.ts`, and `kernel-landing-zone.test.ts`;
- `C → H` is exactly one administrative/evidence commit containing implementation-02, ten validation logs plus MANIFEST, and status-summary transcriptions; no source/test/fixture/evaluator/configuration payload first appears in H;
- benchmark E1 preparation remains H2 `8de04779d279dba82cf834d419e465d2b677ef46`, benchmark `main` remains `5a3f1ba525f68244701b1f73a1d29c4902ffe589`, accepted by nobody and carrying no E1 result;
- no successor packet payload, K1.1 implementation, main merge or release claim appears in the reviewed interval.

## Independent coverage

The cumulative obligations remain the same five interacting groups used in the prior full reviews:

1. **C1 ↔ C2 ↔ C9:** non-vacuous target-zone dependency quarantine and meaningful scanner controls.
2. **C3 ↔ C6 ↔ C7:** preserved legacy/public behavior plus a private refusal-only target package and retained regressions.
3. **C4 ↔ C5:** exact fail-closed ownership/dependency relations, now including structural schema ownership and whole-cell decoding, plus assigned deferred owners.
4. **C8:** prepared benchmark E1 provenance only, with no result or acceptance credit.
5. **Process/evidence:** exact base/C/H identity, clean-C validation, preserved historical ACCEPT/invalidation records, and no successor release.

Round 2 changes only the C4 oracle/contracts/tests. I therefore rechecked the C4 producer/consumer path in detail and re-reconciled the other criteria against the unchanged cumulative implementation and the fresh clean-C full/conformance evidence rather than treating their prior PASS as automatic exemption.

## Prior finding disposition

### K10-CORR1-R1-01 — CLOSED

Round 1 measured an excess body row against `governed.header.length` while validating only the first header cell. A candidate document could widen its own header and delimiter, making an unread fifth body cell non-excess even though `valueOf` still consumed only the original four columns.

Round 2 removes that self-authorizing boundary:

- each table now has a fixed `RowSpec.expectedHeader`, including exact arity and every header label;
- `readKeyedTable` compares the whole discovered header against that schema;
- body excess is judged against `spec.expectedHeader.length`, never against the candidate header;
- `valueOf` receives only the fixed governed prefix, with the two trailing prose positions explicitly declared through `ungovernedTrailing`;
- a malformed/widened/narrowed header is loud but does not change the meaning or allowable width of schema-correct body rows;
- a body cell past the fixed schema remains loud even when the candidate header is widened to match it.

I independently derived the current ownership mapping from `ownership-inventory.md`, not from implementation-02's table:

| Table | Fixed schema | Governed relation | Explicitly ungoverned trailing prose |
|---|---|---|---|
| Zones | `Zone id`, `Roots`, `Owner and status` | zone id → roots | owner/status prose |
| Dependency | `Zone`, `` `.ts` files ``, `` Reaches `legacy-core` via ``, `Reaches third-party` | zone id → count/workspace/third-party edges | none |
| Export | `Package`, `Exported subpaths`, `Published?` | package → subpaths/publishability | none |
| Deferred | `Id`, `Current path`, `Disposition`, `Owner`, `Why it is assigned there` | DX id → path/disposition/owner | assignment-rationale prose |

That mapping matches the four `RowSpec` call sites. The exact review-01 counterexample now produces both a bad-header report and an excess-row report and does not record the attacked relation; the same structural attack is covered for Zones, Export and Deferred. The reverse direction is also exercised: narrowing or widening only the header does not cause schema-correct bodies to disappear or become excess, and short rows are accepted only where the omitted position is the declared trailing prose cell.

I challenged adjacent ordering as well. Key recognition/duplicate detection still happens before arity/value parsing, so a malformed or excess duplicate cannot become silent. Rows with invalid keys, duplicates, excess cells or malformed governed cells remain loud through at least one total outcome. Further tables and missing tables retain their earlier fail-closed behavior.

### K10-CLEANUP-01 — remains CLOSED

The round-1 whole-cell decoders remain in place: decimal counts consume the whole cell; empty sentinels are whole-cell values; publishability is a closed whole-cell vocabulary; code-span/list values consume the whole cell. Round 2 changes their structural input boundary, not their value grammar. The original four cleanup counterexamples and the wider decoder family remain covered by unchanged controls.

### K10-R15-01 / K10-R14-01 and earlier findings — remain CLOSED

The correction does not modify the physical-line, ATX, raw-HTML/container, table-cell whitespace or dependency-scanner subsystems involved in those findings. Their controls remain in the focused C4 inventory and the fresh cumulative suite.

## Evidence qualification

I inspected validation-02 bound to clean C. It records:

- `npm run typecheck`: exit 0;
- `npm test`: 2051/2051, 301 suites, zero fail/skipped;
- `npm run test:conformance`: 1938/1938, 282 suites, zero fail/skipped;
- builder-docs: 26 files / 286 links+anchors / 38 public imports;
- kernel: 4/4;
- SDK: 22/22;
- focused C4 inventory: 207 tests / 21 suites, zero fail/skipped;
- evidence-record guard: 4/4;
- round-1-C versus new-C demonstration: the exact reviewed attack plus schema-family cases, with five old-silent/new-loud distinctions and no new-C requirement failure.

The schema audit's **results** are useful, but its provenance description is overstated. The log says its four schema header lines are “read out of `ownership-inventory.md` at run time”; the quoted program actually hard-codes the four literal header strings and then checks that each occurs exactly once in the real inventory. I therefore do **not** treat the header spelling as independently runtime-derived evidence. This does not block C4 here: the program is quoted in full, the literals are uniqueness-checked against the actual inventory, and I independently derived and inspected the four schema/ownership mappings above. The report correctly identifies the remaining correlated-assumption risk: one author wrote the production parser, controls and reference, especially the prose-to-governed-position classification.

Two minor record inconsistencies are also nonblocking for this exact review: correction contract revision 2 has stale prose saying the adopted K1.0 criteria are “at revision 17” even though its header and implementation report correctly bind revision 18; and the H status row begins by calling the corrective scope “revision 1” while its round-2 paragraph and K1.0 row correctly identify revision 18/current round 2. The criterion IDs did not change, revision-2 requirement 5 explicitly carries K10-CORR1-R1-01's schema obligation, and the exact revision 18/revision 2 identities are unambiguous from the candidate binding. These are administrative cleanup items, not a semantic or evidence gap in the reviewed C.

## Cumulative criterion verdicts

| Criterion | Verdict | Independent rationale |
|---|---|---|
| **K1.0-C1** | **PASS** | No target-zone policy/module-graph source changed in round 2. The cumulative target remains the same private zone with transitive fail-closed dependency rules. |
| **K1.0-C2** | **PASS** | Forbidden/permitted dependency-form controls are unchanged; round 2 only adds C4 schema controls. Fresh full/conformance evidence is green and non-vacuity remains represented. |
| **K1.0-C3** | **PASS** | No legacy production, SDK or public export path changed. Clean-C full suite is 2051/2051 with zero skipped and typecheck is clean. |
| **K1.0-C4** | **PASS** | K10-CORR1-R1-01 is closed at the schema-ownership layer. Header validity, allowable row width and governed decoder input are now controlled by fixed per-table schemas rather than candidate-document width; whole-cell decoding and prior structural fail-closed controls remain intact. |
| **K1.0-C5** | **PASS** | The twelve deferred path/disposition/owner assignments remain unchanged and are still compared as exact relations; the trailing rationale is explicitly outside that relation. |
| **K1.0-C6** | **PASS** | Target package remains private/refusal-only with no protocol implementation, no no-op target API, no E1 pass and no package-release claim. |
| **K1.0-C7** | **PASS** | Legacy regression/vendor-neutrality sources are unchanged. Architecture coverage grows without removing earlier controls; fresh suites record zero skips. |
| **K1.0-C8** | **PASS** | E1 preparation identities remain unchanged and unaccepted; no E1 result or decision is claimed. |
| **K1.0-C9** | **PASS** | Dependency scanner/source parser is unchanged by round 2 and retains the meaningful two-direction/fail-closed controls previously reviewed. |

## Verdict

Every K1.0 criterion C1–C9 passes for correction candidate H `1295c68b03ae5d8eb0bbb86e974353402ff9a518` over clean payload C `36460438e95e968beec0b354b07a616b53981256`, K1.0 contract revision 18, K1.0-correction-01 contract revision 2, governing/original base `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.

**ACCEPT** is for that exact correction H only. It closes K10-CORR1-R1-01 and restores an independently reviewed cumulative K1.0 C1–C9 candidate, while preserving the historical ACCEPT/invalidation history. It grants no benchmark E1 result, K1 milestone closure, merge/integration or successor release. Owner-delegated final cleanup still precedes manual merge under 006.

ACCEPT
