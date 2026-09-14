# K1.0 independent review — round 16

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-13  
**Role:** independent reviewer; I did not implement this candidate. Session identifier is not exposed to me.

## Candidate binding and access

This review binds only to submitted candidate H:

- governing process / review base: `c9a9ed7e6e538ab0542fc6a999426264abb6212a`;
- previous reviewed H14: `0a9333faa7ea9cdf742f01b16af1069357b88bad`;
- review-15 finding record: `docs/development/work/K1.0/review-15.md`;
- inbound correction parent: `3616031dfdacafbc85d15bcf9e3c416638212ef7`;
- clean round-15 payload C: `2ef6f9803ff6f529ed5ffac0709299b49ebf904c`;
- submitted round-15 H: `d3d614f6cee4393d4ac63ecc2f29045b205505ff`;
- branch: `codex/k1.0-target-boundary-legacy-quarantine`;
- contract: `docs/development/work/K1.0/contract.md`, revision 15.

At review start the advertised branch SHA was exactly H and advertised `main` remained exactly the governing base. I inspected the pinned repository through the authorized GitHub connector, including repository instructions and the governing development process, contract revision 15, prior reviews, the complete correction interval, cumulative candidate, affected C4 source/tests, implementation-15, raw validation-15 evidence, the restored 007 ledger, target Kernel package, boundary policy, shared module graph, and the benchmark E1 preparation identities. I independently checked the published GFM 0.29 grammar used by this packet and compared the disputed ATX/table normalization to cmark-gfm's parsing structure as a secondary implementation check.

I do **not** have a local checkout or repository shell in this review session. I did not independently rerun npm commands or recompute MANIFEST digests. I inspected immutable raw clean-C logs and source. Required source and raw evidence were accessible, so this is not a 006 external-access blocker.

Identity / interval verification:

- `3616031…` is the exact parent of C;
- `3616031… → C` is one payload commit touching exactly four files: `contract.md`, `inventory-oracle.ts`, `kernel-landing-zone.test.ts`, and `007-work-packets.md`;
- the large 007 delta in C is substantive repair: `3616031…` accidentally truncated the ledger after K1.4, and C restores the later packet definitions/status table while preserving the intended K1.0 CHANGES_REQUESTED state;
- H is one administrative/evidence commit after C; C → H contains the report, validation-15 attachments and status summaries only, with no source/test/fixture/evaluator/threshold/package/configuration payload first appearing in H;
- base → C remains the cumulative K1.0 candidate with same-packet historical review/evidence records and no successor payload identified;
- benchmark E1 remains at H2 `8de04779d279dba82cf834d419e465d2b677ef46`, parent C2 `d8f17549c31f9ee5d995e773c2f211faed2785fb`, benchmark `main` `5a3f1ba525f68244701b1f73a1d29c4902ffe589`, state `BLOCKED_EXTERNAL`, accepted by nobody and holding no E1 result.

## Independent coverage

Before relying on implementation-15's explanation I re-derived the interacting packet obligations:

1. **C1 ↔ C2 ↔ C9:** target Kernel must be a non-vacuous transitive quarantine over every dependency-bearing form, with unknown targets failing closed.
2. **C3 ↔ C6 ↔ C7:** supported 0.8.x behavior/public exports/regressions must remain intact while the target package stays private, structural and refusal-only.
3. **C4 ↔ C5:** the ownership inventory parser must interpret the pinned Markdown grammar closely enough that governed sections/tables and exact keyed relations cannot disappear or collapse through a host or over-broad character class; all deferred ownership must remain assigned.
4. **C8:** E1 preparation is provenance only, not an E1 result.
5. **Process/evidence:** exact C/H identity, clean-C validation, prior-finding closure, truthful restoration of the damaged ledger, and no successor claim.

The strongest correction challenge was not another Unicode-space spelling. It was whether revision 15 had actually derived the grammar class at each transition rather than replacing `String.trim()` with one broad project-wide substitute.

## Prior finding disposition

### K10-R14-01 — CLOSED

Review-15's exact NBSP failure is genuinely corrected. `parseAtxHeading` no longer uses JavaScript `trim()`, so U+00A0/U+3000/U+FEFF/U+2009 remain semantic content instead of collapsing onto an exact governed section title. The committed production-level controls demonstrate the reviewed H14 false boundary becoming loud at C, and an exact next-heading twin still terminates normally.

The same audit also correctly found the analogous host-normalization problem in table key/value identity (SELF-24), restored the accidentally truncated 007 ledger (SELF-25), made the old control-byte source spellings truthful (SELF-26), removed dead section wrappers (SELF-27), and reconciled the stale C4 evidence count (SELF-28).

Closing K10-R14-01 does **not** establish the new abstraction chosen by revision 15. That abstraction contains the new finding below.

## Findings

### K10-R15-01 — P2 — C4: the correction substitutes the broad §2.1 whitespace class where GFM requires structural space/tab semantics

**Affected source:** `tests/conformance/architecture/inventory-oracle.ts`, especially `stripAtxContent`, `gfmTrim`, `parseAtxHeading`, and their consumers in section/table identity.  
**Affected contract/evidence:** contract revision 15's statement that the “§2.1 six” governs the character before an optional ATX closing `#` run; `kernel-landing-zone.test.ts`'s VT-closing-run GREEN controls; validation-15/09's expected-value oracle.

Published GFM 0.29 distinguishes `space`, `whitespace character`, Unicode whitespace, and TAB's block-structure substitution. In §4.2 an optional ATX closing hash sequence must be preceded by a **space** and may be followed by spaces only. §2.2 permits TAB where spaces define block structure. That does not authorize VT or FF as structural separators before the closing hash run.

The candidate instead does this:

```ts
while (n > 0 && content[n - 1] === "#") n--;
if (n !== content.length && (n === 0 || isGfmWhitespace(content[n - 1]))) {
  return gfmRightTrim(content.slice(0, n));
}
```

`isGfmWhitespace` is the six-character §2.1 set, including U+000B VT and U+000C FF. Revision 15 then commits the same interpretation as a requirement and adds a GREEN twin for ``## ${TITLE}${VT}##``. Validation-15/09 labels `## Title\u000b##` as expected `Title` for the same reason.

That is a distinguishing false-boundary counterexample. Put this valid heading before the real next section heading, with a contradictory further table between them:

```text
## What this packet does not establish<VT>##

| Id | Current path | Disposition | Owner | Why it is assigned there |
|---|---|---|---|---|
| DX-1 | `packages/core/src/util/json.ts` | migratable | K1.1 | contradictory planted table |

## What this packet does not establish
```

The opening `## ` is valid. The trailing `##` is **not** an optional closing sequence merely because VT precedes it; the heading's semantic content is therefore not the exact configured next title. The governed Deferred section must continue through the planted table until the later genuine exact heading. Candidate C removes the hash run because VT satisfies `isGfmWhitespace`, then removes VT with `gfmRightTrim`, obtains the exact configured title and terminates the section early. The contradictory table is outside the governed range and can disappear from C4 accounting. This is the same fail-open shape as review-15, reached through the replacement abstraction rather than JavaScript `trim()`.

A second affected boundary is table-cell identity. The GFM table rule says spaces around cell content are trimmed; cmark-gfm's table path trims through its own parser character class, not the full six-character class used by C. Candidate `gfmTrim` strips VT/FF from both ends of every cell. Therefore a governed key such as `DX-1<VT>` can collapse to exact `DX-1` and survive as the policy row rather than remaining a distinct token that must be reported. The round-15 table controls exercise NBSP and ordinary space/tab, but not this VT/FF class boundary.

**Impact:** K1.0-C4's exact structural section identity and total keyed-relation accounting remain fail-open for grammar-distinct input. The report's statement that C matches the derived GFM value on all 27 heading cases is unsupported because one of its expected values encodes the same mistaken class substitution.

**Required outcome:** re-derive the ATX and table normalization productions independently from the pinned GFM 0.29 rules, distinguishing generic §2.1 character definitions from the narrower grammar classes used at each structural position. A semantically non-exact heading with VT/FF immediately before a hash run must not become the exact configured section title merely through normalization, and a VT/FF-distinct table key/cell must not become the exact policy token unless the pinned table grammar actually defines that normalization. Add production-path controls that distinguish these cases from genuine SPACE/TAB forms and preserve the NBSP, line-ending, raw-HTML, container, row and relational controls already closed. Reconcile contract prose and the standalone audit oracle with the corrected production rather than letting either define its own expected grammar.

No architecture decision or owner supplement is required; this is a deterministic correction under the existing C4 contract.

## Cumulative criterion verdicts

| Criterion | Verdict | Independent rationale |
|---|---|---|
| **K1.0-C1** | **PASS** | The target zone remains `packages/kernel/src`, with a real internal edge, empty portable-leaf allowlist, `node:`-only external allowance and fail-closed unresolved targets. Round 15 does not change this subsystem. |
| **K1.0-C2** | **PASS** | Representative forbidden/permitted controls and the shared transitive boundary predicate remain intact; the correction does not weaken them. |
| **K1.0-C3** | **PASS** | Round 15 changes no legacy production/public export surface. Inspected clean-C evidence records 2021/2021 tests, 298 suites, zero fail/skipped and clean typecheck. The 007 restoration fixes an inbound documentation/conformance regression rather than changing legacy behavior. |
| **K1.0-C4** | **FAIL** | K10-R14-01's NBSP failure is closed, but K10-R15-01 shows the replacement lexical-class abstraction still produces false exact heading/table identities and can exclude governed evidence. |
| **K1.0-C5** | **PASS** | All twelve deferred extraction/bridge rows remain assigned; restored 007 again contains the referenced later owner packet headings, including K5.2. |
| **K1.0-C6** | **PASS** | `@arrokothi/kernel` remains private and refusal-only, exporting only `UnsupportedKernelSurfaceError` and `refuseUnsupportedSurface`; no protocol, silent no-op, E1 result or release claim appears. |
| **K1.0-C7** | **PASS** | The legacy regression and scanner families are unchanged by the correction and remain present; inspected full/conformance logs are green with zero skipped. |
| **K1.0-C8** | **PASS** | E1 preparation identities independently match the benchmark branch/main state and remain explicitly unaccepted / `NO_RESULT`. |
| **K1.0-C9** | **PASS** | The shared TypeScript AST + preprocessor analyzer, prose-soundness controls and fail-closed nonliteral handling are unchanged and remain meaningful in both directions. |

## Evidence assessment

Inspected validation-15 records bind to clean payload C and record:

- `npm run typecheck`: exit 0;
- `npm test`: 2021/2021, 298 suites, zero fail/skipped;
- `npm run test:conformance`: 1908/1908, 279 suites, zero fail/skipped;
- `npm run check:builder-docs`: 26 Markdown files / 284 links+anchors / 38 public package imports;
- `npm run test:kernel`: 4/4;
- `npm run test:sdk`: 22/22;
- validation-15/08: 27 cases, 14 H14/C distinctions, no failure against its own encoded expectations;
- validation-15/09: 27 ATX cases plus 9 table cases, but its expected-value derivation is itself affected by K10-R15-01;
- evals not run, appropriately limiting claims because this packet changes no Agent/model-facing behavior.

I did not independently rerun these commands. Green execution does not cure K10-R15-01 because the affected controls assert the incorrect expected grammar.

## Correction handoff

```text
Correct the same released packet K1.0 on codex/k1.0-target-boundary-legacy-quarantine.
Base c9a9ed7e6e538ab0542fc6a999426264abb6212a; reviewed H d3d614f6cee4393d4ac63ecc2f29045b205505ff; review record docs/development/work/K1.0/review-16.md.
Open finding K10-R15-01 P2/C4; required outcomes and counterexamples are in this record.
Prior K10-R14-01 is CLOSED; preserve review-14/review-15 and all earlier controls.
Owner supplemental decisions none; unresolved authority none.
Apply 006 and 012: reconstruct the affected ATX/table lexical subsystem from the pinned grammar rather than broadening one shared whitespace class, trace section/table/key consumers, then re-review the whole cumulative packet. Fix additional in-scope defects with separate provenance.
Use 008 for the next report and 006 for new clean C / administrative H plus immutable evidence and verified push handoff. No successor release.
```

## Verdict

K1.0-C4 fails for exact H `d3d614f6cee4393d4ac63ecc2f29045b205505ff`; every other packet criterion is independently PASS. This is a deterministic coding/contract-oracle defect, not an architecture or external-access blocker. Required status: `CHANGES_REQUESTED`. No successor is released.

CHANGES REQUIRED
