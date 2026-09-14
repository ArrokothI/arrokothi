# K1.0-correction-02 independent review — round 1

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-13  
**Role:** independent reviewer; I did not implement this correction. Session identifier is not exposed to me.

## Candidate binding and access

This review binds only to correction candidate H:

- governing/original K1.0 base: `c9a9ed7e6e538ab0542fc6a999426264abb6212a`;
- historical K1.0 accepted H: `f3aa29d7ecba2a23aa85788b7efdebdd383cab24` over C `d693d59aefe5335c8950d57cec6d6b57e375cadc`, acceptance record `36595f57d1f8cec8c4bf8a6293e888ca27750fab`;
- historical K1.0-correction-01 accepted H: `1295c68b03ae5d8eb0bbb86e974353402ff9a518` over C `36460438e95e968beec0b354b07a616b53981256`, acceptance record `41728edfc3cfc5c745e4293c511a740942f7b631`;
- owner-delegated correction-01 cleanup/invalidation head: `968d74605cd34b30541bfd868b30bb1d0868cc41`;
- clean correction-02 payload C: `95d74530f37c7af8706ef92d29574425a39afcf1`;
- submitted correction-02 H: `def91fb9f34ade40a65cbde999c0ffe192d18239`;
- branch: `codex/k1.0-target-boundary-legacy-quarantine`;
- K1.0 contract revision 19 plus `K1.0-correction-02/contract.md` revision 1.

At review start the advertised packet branch was exactly submitted H and advertised repository `main` remained exactly the governing base. The benchmark E1 preparation branch remained H2 `8de04779d279dba82cf834d419e465d2b677ef46`, benchmark `main` remained `5a3f1ba525f68244701b1f73a1d29c4902ffe589`, and no E1 result or acceptance exists.

I inspected pinned GitHub source, cumulative/correction diffs, contracts, the correction-01 cleanup finding, implementation-01, and accessible raw validation evidence through the authorized GitHub connector. I do not have a local candidate checkout with which to independently rerun npm commands, so the recorded command executions are inspected evidence rather than independent reruns. Required source and raw logs were accessible; this is not a 006 external-access blocker.

Identity / interval verification:

- `968d7460… → C` is exactly one payload commit touching six files: correction-02 contract, K1.0 contract revision 19, the 007 packet seed row, `inventory-oracle.ts`, `kernel-landing-zone.test.ts`, and the evidence-record guard root list;
- `C → H` is exactly one administrative/evidence commit: implementation-01, ten output-only validation logs plus MANIFEST, and four status-summary transcriptions; no source/test/fixture/evaluator/configuration payload first appears in H;
- cumulative `base → C` contains K1.0 and its correction history, not K1.1 or successor implementation payload;
- `main` is unchanged at the original base and no merge/integration is claimed.

## Independent coverage

The cumulative obligations remain the same interacting groups used in the prior K1.0 reviews:

1. **C1 ↔ C2 ↔ C9:** non-vacuous target-zone quarantine and meaningful dependency-scanner controls.
2. **C3 ↔ C6 ↔ C7:** preserved legacy/public behavior, private refusal-only target package, and retained regressions.
3. **C4 ↔ C5:** exact fail-closed inventory/dependency relations plus assigned deferred owners.
4. **C8:** prepared benchmark E1 provenance only, with no result or acceptance credit.
5. **Process/evidence:** exact base/C/H lineage, clean-C validation, preserved historical ACCEPT/invalidation records, and no successor release.

Correction-02 changes the final equality/diagnostic layer of C4 and its dependency consumer. I therefore re-derived the collection-equality obligation independently before following implementation-01: for every collection-valued relation, agreement requires identical cardinality and identical member identities while member order is irrelevant. A serialization is not a relation identity because distinct collections can have the same rendering.

## Cleanup finding disposition

### K10-CORR1-CLEANUP-01 — CLOSED

The delegated cleanup finding is valid. At correction-01 H, Zones roots and Export subpaths were decoded as distinct members but later compared by `sorted(...).join(",")`. Therefore the five core export subpaths could be replaced by one code span containing their comma-joined rendering, and the four runtime-integration roots could likewise be collapsed into one invented root, while `inventoryDisagreements` remained empty. The cleanup's 22 reproduced false relations correctly invalidate the prior C4 PASS for current use.

Correction-02 closes the invariant rather than blacklisting the reported separator:

- `sameCollection` first checks cardinality, then compares exact members after sorting both sides;
- `collectionDisagreement` is the single collection-valued comparison used by Zones roots and Export subpaths;
- both measured dependency columns now use that same comparison instead of a separate hand-written sorted-array assertion;
- `decodeEdgeCell` carries decoded members as arrays to the comparison, while the measured-tree side still deduplicates import specifiers as the set-valued relation the inventory describes;
- reordering remains permitted;
- diagnostics quote each member separately and state cardinality, so the one-member `"a,b"` relation cannot be rendered ambiguously as the two-member `"a", "b"` relation.

I challenged the equality beyond the literal comma collision:

- fewer members but a surviving prefix must disagree (cardinality is required);
- same cardinality with different members must disagree (member identity is required);
- an invented member using comma+space, a space, or a slash still disagrees (the separator byte is not the rule);
- the reverse direction also disagrees: an enforced one-member collection containing a comma cannot be documented as two split members;
- reversing a correct collection still agrees;
- duplicate documented members remain rejected earlier by the whole-cell list decoder rather than silently collapsed;
- the empty dependency sentinels still produce the empty collection only in their established columns.

No alternative rendering collision remains in this equality: comparison is performed on the string elements themselves, not on a joined representation.

### Adjacent consumers

The dependency measurement remains set-valued at the enforced side: its scanner accumulates reached workspace and third-party specifiers in `Set<string>` and exposes arrays only after measurement, so duplicate import occurrences do not become false cardinality changes. The documented side preserves exactly the decoded member collection. Both are then compared by the shared equality.

Deferred remains a scalar tuple and is correctly left outside the collection helper. Path, disposition and owner continue to use exact scalar comparison, including a separator-bearing false owner value. Publishability remains its closed scalar vocabulary. I found no other current collection-valued C4 relation that retains a join/rendering comparison.

### Prior findings

- **K10-CLEANUP-01:** remains CLOSED. Whole-cell count, sentinel, publishability and code-span/list decoders remain intact.
- **K10-CORR1-R1-01:** remains CLOSED. Fixed table-schema/header/body-arity ownership is unchanged and its controls remain in the focused inventory.
- **K10-R14-01 / K10-R15-01 and earlier parser/scanner findings:** remain CLOSED; correction-02 does not alter those lexical/structural subsystems and their controls remain present in the fresh focused suite.
- **CORR2-SELF-01:** the reverse-direction collision is a genuine consequence of the same equality and is covered by the correction.
- **CORR2-SELF-02:** the ambiguous diagnostic is corrected; this is a useful evidence/readability hardening rather than a separate false-agreement invariant.
- **CORR2-SELF-03:** removal of the decoded dependency `Set` is correctly described as defence in depth, not falsely presented as a reproduced reachable defect.

## Evidence assessment

I inspected correction-02 validation-01 bound to clean C. It records:

- `npm run typecheck`: exit 0;
- `npm test`: 2060/2060, 302 suites, zero fail/skipped;
- `npm run test:conformance`: 1947/1947, 283 suites, zero fail/skipped;
- builder-docs: 26 Markdown files / 286 links+anchors / 38 public imports;
- kernel: 4/4;
- SDK: 22/22;
- focused C4 inventory: 216 tests, zero fail/skipped;
- cleanup demonstration: reviewed parser accepts 22/22 reproduced false collections while new C accepts 0, with real inventory green under both;
- six one-behaviour ablations distinguishing the old joined equality, the forbidden separator-blacklist fix, missing cardinality, missing member identity, ambiguous diagnostics, and the old `Set` representation.

The ablation evidence is especially relevant because it demonstrates that the controls are not merely green against this implementation: plausible weaker implementations fail named tests. The separator-blacklist ablation is rejected by the reverse-direction case, and cardinality-only/member-only equalities are rejected independently.

One evidence-process limitation is recorded here explicitly. The focused `10-c4-control-inventory.log` runs the evidence-record guard, but the candidate records do not demonstrate a separate post-MANIFEST rerun that necessarily included correction-02's own new validation directory under the guard's mid-capture rule. I therefore do not treat that 4/4 result as independent proof that this round's ten manifest digests were mechanically rechecked after the manifest was written. The raw logs and manifest are accessible and their digest tokens are well-formed; I did not independently recompute SHA-256 values in this session. This does not block acceptance under 006 because the required source and raw evidence are accessible and the semantic review does not depend on a digest-only inaccessible artifact. A cleanup pass may rerun the guard after the manifest exists if desired.

## Cumulative criterion verdicts

| Criterion | Verdict | Independent rationale |
|---|---|---|
| **K1.0-C1** | **PASS** | Correction-02 changes no target-zone module graph/policy implementation. The cumulative target remains private and its transitive graph remains constrained to the target zone plus allowed `node:` builtins. |
| **K1.0-C2** | **PASS** | Representative forbidden/permitted dependency controls are unchanged; no correction weakens their non-vacuous rejection behavior. Fresh cumulative suites are green. |
| **K1.0-C3** | **PASS** | No legacy production, SDK, provider, example or public-export payload changes in correction-02. Full clean-C suite is 2060/2060 with zero skipped and typecheck is clean. |
| **K1.0-C4** | **PASS** | K10-CORR1-CLEANUP-01 is closed at the collection-equality layer. Collection-valued relations preserve member identity/cardinality through comparison, all current collection consumers share one equality, reordering remains permitted, whole-cell/schema/structural fail-closed layers remain intact, and distinguishing evidence rejects plausible weaker fixes. |
| **K1.0-C5** | **PASS** | The twelve deferred path/disposition/owner assignments are unchanged and continue to be compared as exact scalar relations. |
| **K1.0-C6** | **PASS** | Target package remains private/refusal-only; no protocol implementation, no no-op target API, no package release, no E1 pass and no K1 closure are claimed. |
| **K1.0-C7** | **PASS** | Existing legacy regressions remain; architecture coverage grows by the new correction controls with no removed/skipped tests. |
| **K1.0-C8** | **PASS** | E1 preparation identities remain unchanged and unaccepted; correction-02 claims and executes no E1 result. |
| **K1.0-C9** | **PASS** | Dependency scanner/module-naming behavior is unchanged and its bidirectional/fail-closed controls remain in the cumulative suite. |

## Verdict

Every K1.0 criterion C1–C9 passes for correction-02 candidate H `def91fb9f34ade40a65cbde999c0ffe192d18239` over clean payload C `95d74530f37c7af8706ef92d29574425a39afcf1`, K1.0 contract revision 19, K1.0-correction-02 contract revision 1, governing/original base `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.

**ACCEPT** is for that exact H only. It closes K10-CORR1-CLEANUP-01 for the reviewed candidate and restores an independently reviewed cumulative K1.0 C1–C9 candidate while preserving both historical ACCEPT/invalidation chains. It grants no benchmark E1 result, K1 milestone closure, merge/integration, or successor release. Owner-delegated final cleanup still precedes manual merge under 006.

ACCEPT