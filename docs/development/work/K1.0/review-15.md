# K1.0 second independent review — round 15

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-13  
**Role:** second independent reviewer; I did not implement this candidate.

## Candidate binding and access

This review binds only to submitted candidate H `0a9333faa7ea9cdf742f01b16af1069357b88bad`, with clean payload C `933e357a2d1fab9660f8af4a89b3031594dd3caa`, governing base `c9a9ed7e6e538ab0542fc6a999426264abb6212a`, branch `codex/k1.0-target-boundary-legacy-quarantine`, and contract revision 14.

The previous independent review is preserved at `docs/development/work/K1.0/review-14.md`, recorded by commit `9d66313ddc3b90503b666efb4f0079775e7fe9ff`; it ACCEPTED this exact H. I do not rewrite that historical record. This review is later evidence against the same candidate and therefore invalidates using that ACCEPT as the current basis for integration until the finding below is corrected and the corrected candidate is independently reviewed.

I inspected pinned GitHub source and cumulative/correction intervals, repository instructions, the mental model, development front door, 006/007/008/012/013 at the governing baseline, contract revision 14, review-13, review-14, implementation-14, validation-14 raw records, target Kernel source/manifest, ownership inventory, boundary policy, module analyzer, C4 parser and its controls. I also checked the pinned GFM 0.29 grammar used by this packet.

I do **not** have a local repository checkout or shell in this review session. I did not independently rerun npm commands or recompute attachment digests. I inspected immutable raw evidence and independently challenged the pinned source. Required source and evidence were accessible, so this is not a 006 external-access blocker.

Identity checks remain valid: `main` is the recorded base; review-13 is the parent of C; H is one administrative/evidence commit after C; the later `9d66313…` commit adds only review-14. K0.2 remains independently accepted/integrated at `0535160e677231da41b06d9f822e62e2f0364dd1`. Benchmark E1 preparation remains H2 `8de04779d279dba82cf834d419e465d2b677ef46` / C2 `d8f17549c31f9ee5d995e773c2f211faed2785fb`, benchmark `main` `5a3f1ba525f68244701b1f73a1d29c4902ffe589`, accepted by nobody and claiming no E1 result.

## Independent coverage

I independently re-derived the interacting obligations before relying on implementation-14:

- C1 ↔ C2 ↔ C9: meaningful, non-vacuous target dependency quarantine across every module-naming form, fail-closed on unknown targets.
- C3 ↔ C6 ↔ C7: legacy behavior/regressions remain supported while the target package is private, structural and refusal-only.
- C4 ↔ C5: every ownership/dependency relation is structurally and relationally accounted for; the Markdown evidence parser may neither silently delete governed relations nor manufacture section boundaries from non-equivalent text.
- C8: benchmark preparation is provenance only, not an E1 pass.
- Process/evidence: exact C/H binding, correction/admin separation, prior-finding disposition and no successor claim.

## Prior finding disposition

**K10-R13-01 CLOSED.** Round 14 correctly moves physical-line tokenization before block scanning and recognizes CRLF, lone LF and lone CR. The CR-only whole-inventory and primitive demonstrations distinguish H13 from C14 and preserve prior controls. I found no defect in that correction itself.

## Finding

### K10-R14-01 — P2 — ATX title normalization can erase NBSP and create a false governed-section boundary

**Affected source:** `tests/conformance/architecture/inventory-oracle.ts`, `parseAtxHeading` → `rangeFromScanned`.  
**Criterion:** K1.0-C4.  
**Governing source:** the packet's pinned GFM 0.29 lexical/block grammar and C4's exact structural-title requirement.

`parseAtxHeading` obtains heading content with host-language normalization:

```ts
const content = after.trim().replace(/[ \t]+#+[ \t]*$/, "").trim();
```

The packet already reconstructs the relevant lexical distinction elsewhere: GFM whitespace/space and Unicode whitespace are not interchangeable, and NBSP U+00A0 must not be admitted merely because ECMAScript `trim()` treats it as whitespace. Yet the ATX heading identity path still uses `String.trim()`.

`rangeFromScanned` ends a governed section when a level-2 heading's normalized `heading.text` exactly equals `nextTitle`. Therefore a source line whose real heading content begins with NBSP can be collapsed by host `trim()` to the configured exact title.

Deterministic counterexample inside the Deferred section:

```text
## <NBSP>What this packet does not establish

| Id | Current path | Disposition | Owner | Why it is assigned there |
|---|---|---|---|---|
| DX-1 | `packages/core/src/util/json.ts` | migratable | K1.1 | planted contradictory table |

## What this packet does not establish
```

`<NBSP>` denotes an actual U+00A0 immediately after the normal ATX separator. Under the pinned grammar this heading's content is not the exact expected title. It therefore must not terminate the governed Deferred section. The planted further table remains in scope and must be reported.

The candidate removes the NBSP with `trim()`, obtains exactly `What this packet does not establish`, terminates the section at the false boundary, and can therefore hide the planted contradictory table from C4's total/fail-closed accounting.

This is not a new architecture decision. It is the same host-character-class substitution family previously reconstructed for C4 raw-HTML/blank-line parsing, surviving in another structural predicate.

**Required outcome:** make governed heading identity obey the pinned GFM character classes rather than ECMAScript Unicode trimming. A heading whose semantic content differs from the expected title only because it contains NBSP (or another character outside the grammar's allowed trimming class) must not delimit the section. Add a production-parser control that plants a contradictory further table after that non-exact heading and proves it remains visible, while the genuine exact next heading still terminates the section. Preserve K10-R13-01 and every earlier C4 control.

The required outcome is normative; no single patch technique is prescribed.

## Criterion verdicts

| Criterion | Verdict | Rationale |
|---|---|---|
| K1.0-C1 | PASS | Target-zone graph, policy and module analyzer remain meaningful and unchanged by the round-14 C4 correction. |
| K1.0-C2 | PASS | Forbidden/permitted controls remain non-vacuous and exercise the production walk. |
| K1.0-C3 | PASS | No legacy/public production source changed in round 14; inspected clean-C full/typecheck evidence is green. |
| K1.0-C4 | **FAIL** | K10-R14-01 permits a non-exact NBSP-bearing heading to become the exact configured section boundary and hide governed contradictory evidence. |
| K1.0-C5 | PASS | All twelve deferred rows remain assigned to declared packet owners. |
| K1.0-C6 | PASS | Target package remains private and refusal-only; no target protocol/no-op/E1/package-release claim. |
| K1.0-C7 | PASS | Legacy regression attribution and scanner coverage remain present; inspected full/conformance evidence is green. |
| K1.0-C8 | PASS | Benchmark preparation identities remain explicit and unaccepted; no E1 result is claimed. |
| K1.0-C9 | PASS | AST + compiler-preprocessor extraction and fail-closed unknown-target behavior remain intact. |

## Evidence and invalidation notice

Inspected validation-14 records remain mechanically green: typecheck clean; full suite 2009/2009; conformance 1896/1896; builder-docs 26/284/38; Kernel 4/4; SDK 22/22; line-ending demonstrations/audits green. These are inspected executions, not reruns. They close K10-R13-01 but do not exercise K10-R14-01.

**Invalidation notice for review-14:** preserve `review-14.md` and its ACCEPT as the historical decision for exact H `0a9333faa7ea9cdf742f01b16af1069357b88bad`. This later full review supplies concrete contrary evidence on C4. Do not integrate or use review-14 to release dependent work. K1.0 must resume correction and obtain a fresh independent review of the corrected candidate.

## Compact correction handoff

Correct the same released packet K1.0 on `codex/k1.0-target-boundary-legacy-quarantine`.
Base `c9a9ed7e6e538ab0542fc6a999426264abb6212a`; reviewed H `0a9333faa7ea9cdf742f01b16af1069357b88bad`; review record `docs/development/work/K1.0/review-15.md`.
Open finding **K10-R14-01**; required outcome and distinguishing NBSP counterexample are above.
Owner supplemental decisions: none. Unresolved authority: none.
Apply 006 and 012: reconstruct the affected C4 heading/whitespace subsystem and its connections rather than patching only the literal example, then re-review the whole cumulative packet. Fix additional in-scope defects with separate provenance.
Use 008 for the next report and 006 for new C/H plus clean evidence/push handoff. No successor release.

**Overall verdict: CHANGES REQUIRED.**  
**Required status transcription: `CHANGES_REQUESTED`.**

CHANGES REQUIRED
