# K1.0 independent review — round 17

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-13  
**Role:** independent reviewer; I did not implement this candidate. Session identifier is not exposed to me.

## Candidate binding and access

This review binds only to submitted candidate H:

- governing process / review base: `c9a9ed7e6e538ab0542fc6a999426264abb6212a`;
- previous reviewed H15: `d3d614f6cee4393d4ac63ecc2f29045b205505ff`;
- deciding prior review: `docs/development/work/K1.0/review-16.md`;
- inbound correction parent: `6e08fabb90766dbdcf9cf1a2dc6bfc4215dc8037`;
- clean round-16 payload C: `d693d59aefe5335c8950d57cec6d6b57e375cadc`;
- submitted round-16 H: `f3aa29d7ecba2a23aa85788b7efdebdd383cab24`;
- branch: `codex/k1.0-target-boundary-legacy-quarantine`;
- contract: `docs/development/work/K1.0/contract.md`, revision 16.

At review start the advertised branch SHA was exactly H and advertised `main` remained exactly the governing base. I inspected the pinned repository and immutable evidence through the authorized GitHub connector. I re-applied the governing repository instructions, mental model, development front door, 006/007/008/012/013 review obligations already governing this review line; inspected the correction interval, the cumulative base→C candidate, current contract/status, implementation-16, validation-16 raw logs, C4 parser and controls, target Kernel package, executable boundary policy, ownership inventory and benchmark E1 preparation identities; and independently checked the published GFM grammar and the pinned cmark-gfm 0.29 implementation at the disputed ATX/table character-class boundaries.

I do **not** have a local checkout or repository shell in this review session. I did not independently rerun npm commands or recompute MANIFEST digests. I inspected immutable raw clean-C logs and exact source. Required source and evidence were accessible, so this is not a 006 external-access blocker.

Identity / interval verification:

- advertised remote `main` = base `c9a9ed7e…`;
- advertised packet branch at review start = exact submitted H `f3aa29d7…`;
- `6e08fabb… → C` is exactly one payload commit and touches four files: contract revision 16, `inventory-oracle.ts`, `kernel-landing-zone.test.ts`, and the K1.0 paragraph/row in 007;
- `C → H` is exactly one administrative/evidence commit containing implementation-16, validation-16 and status-summary transcriptions; no source, test, fixture, script, evaluator, threshold, package or configuration payload first appears in H;
- base → C is 52 commits ahead and remains the cumulative K1.0 packet plus its preserved same-packet review/evidence history; I found no successor packet payload in that interval;
- the accidentally truncated 007 ledger remains restored, including later packet headings such as K5.2;
- K0.2 remains the independently accepted/integrated prerequisite at integration `0535160e677231da41b06d9f822e62e2f0364dd1`;
- benchmark E1 preparation remains branch H2 `8de04779d279dba82cf834d419e465d2b677ef46`, benchmark `main` `5a3f1ba525f68244701b1f73a1d29c4902ffe589`, accepted by nobody and carrying no E1 result.

## Independent coverage

The cumulative packet still has five interacting review groups:

1. **C1 ↔ C2 ↔ C9:** a non-vacuous transitive target-zone quarantine must cover every dependency-bearing form, reject unknown targets fail-closed and avoid prose false positives.
2. **C3 ↔ C6 ↔ C7:** the target package must remain structural/private/refusal-only while current 0.8.x behavior, public exports and useful legacy regressions remain intact.
3. **C4 ↔ C5:** ownership/export/dependency records must be read as exact relations with total fail-closed accounting, while every deferred extraction remains assigned.
4. **C8:** prepared benchmark E1 material is provenance only, not a result or acceptance.
5. **Process/evidence:** exact base/C/H identity, clean-C validation, correction closure, preserved prior records and no successor/release claim.

For the round-16 correction I did not use implementation-16's expected values as authority. I independently challenged the class selection at each ATX/table transition and then reconciled that with the report and tests.

## Prior finding disposition

### K10-R15-01 — CLOSED

Round 15 replaced JavaScript `trim()` with the broad GFM §2.1 whitespace-character definition and then used that class at ATX/table positions whose own grammar is narrower. Review-16 demonstrated the fail-open consequence with `## <configured title><VT>##`: H15 removed the hash run and VT, manufactured the exact next-section title and hid a contradictory further table.

Round 16 corrects the abstraction rather than blacklisting VT/FF:

- ATX opening/separator/content/closing decisions now use the position-specific SPACE/TAB class;
- the six-character GFM whitespace class remains confined to raw-HTML/type-1/6 and complete-tag grammar positions that actually use it;
- table row/cell edge normalization uses SPACE/TAB rather than a host normalizer or the broad six-character class;
- section/table/key consumers are unchanged and now receive the corrected lexical facts;
- opposite-direction SPACE/TAB controls ensure the fix did not simply refuse the newly demonstrated characters.

The exact review-16 document now distinguishes H15 from C through the full production path: H15 is silent, C reports both rows of the planted contradictory further table. VT/FF key/value-cell cases likewise stay distinct under C instead of collapsing to policy tokens. Review-15's NBSP/Unicode-space controls, round-14 physical-line controls and earlier raw-HTML/container/table/relational controls remain present.

The coding-agent direction is also materially different from surface patching: the correction explicitly traces source → line tokenization → ATX eligibility/content → exact heading identity → section range → table discovery → row/cell normalization → keyed relation → disagreement, and narrows the shared abstraction at its grammar boundary while retaining the broader class in productions that need it.

### K10-R14-01 — remains CLOSED

The round-15 host-`trim()` NBSP defect remains closed. U+00A0 and the other Unicode-space controls are still content at the relevant C4 identities and remain loud in the production-path evidence.

## Independent grammar check and residual boundary

The published GFM ATX rule says the opening sequence must be followed by a space or EOL, the optional closing hashes must be preceded by a space and followed by spaces only, and the raw heading content is stripped of leading/trailing spaces. The tables extension says spaces between pipes and cell content are trimmed. The pinned cmark-gfm 0.29 implementation is consistent with the round-16 physical-line behavior: its closing-hash predecessor test is space/tab and its table cell trimming does not admit VT/FF as cell padding.

There is one wording nuance worth bounding explicitly rather than turning into an unsupported claim: the GFM ATX section later says leading/trailing whitespace is ignored during **inline parsing**. K1.0's C4 helper is not a general Markdown renderer; it is a conservative structural-identity oracle for this governed inventory. Where that wording could make an exotic heading render equivalently after inline parsing, round 16's narrower structural identity over-extends the governed section and reports extra evidence rather than manufacturing a boundary and deleting evidence. I found no fail-open counterexample from that distinction, and the actual 0.29 cmark-gfm implementation supports the narrower physical-line class used here. This review therefore does not treat the C4 helper as evidence of complete Markdown semantic equivalence beyond its stated fail-closed inventory purpose.

A preserved older SELF-24 test comment still describes the superseded broad table-whitespace reading. Revision 16's contract/tests and live implementation clearly supersede it; the stale historical wording does not drive an assertion or acceptance result. I treat that as non-blocking historical prose, not a C4 failure.

## Cumulative criterion verdicts

| Criterion | Verdict | Independent rationale |
|---|---|---|
| **K1.0-C1** | **PASS** | The current target zone remains `packages/kernel/src`; its transitive rule permits in-zone files, an empty audited-leaf list and `node:` externals only, with nonliteral/unresolvable module targets failing closed. Round 16 changes none of this subsystem. |
| **K1.0-C2** | **PASS** | The representative forbidden/permitted edge controls and non-vacuity requirement remain in the cumulative candidate and unchanged by the correction. The real target package has an internal edge, so the guard is not green only because the zone is empty. |
| **K1.0-C3** | **PASS** | No legacy production/public-export surface is changed by round 16. Clean-C evidence records typecheck clean and 2030/2030 full tests, 299 suites, zero fail/skipped; the cumulative contract still pins the existing core export map/name digests and no consumer is routed through the target zone. |
| **K1.0-C4** | **PASS** | K10-R15-01 is closed at the grammar-class abstraction. The exact prior fail-open case is distinguishing through `parseInventory → inventoryDisagreements`; opposite SPACE/TAB twins prevent a literal blacklist; table key/value identities are likewise distinguished; prior section/container/raw/table/line-ending/relational controls remain green. The real inventory and independent audit reference agree on its structural lines. |
| **K1.0-C5** | **PASS** | All twelve deferred extraction/bridge/refusal rows remain present in both policy and inventory and point to packet ids present in the restored 007 ledger. |
| **K1.0-C6** | **PASS** | `@arrokothi/kernel` remains `private: true`, contains no Activation/Outcome implementation and exports only explicit unsupported-surface refusal machinery. No no-op target API, E1 pass, package publication or native Runtime rewrite is claimed. |
| **K1.0-C7** | **PASS** | The legacy vendor-neutrality/regression family and shared scanner remain unchanged by this correction. The cumulative architecture suite grows to 330 cases rather than removing prior assertions; full/conformance evidence records zero skips. |
| **K1.0-C8** | **PASS** | Contract/report record the exact prepared benchmark E1 identities and explicitly state accepted-by-nobody / NO_RESULT. Independent branch/main checks still match those identities. |
| **K1.0-C9** | **PASS** | The TypeScript AST + compiler-preprocessor dependency analysis, prose-soundness controls and fail-closed unknown-target behavior are unchanged and remain the meaningful two-direction guard mechanism. |

## Evidence assessment

I inspected validation-16 bound to clean payload C. It records:

- `npm run typecheck`: exit 0;
- `npm test`: 2030/2030, 299 suites, zero fail/skipped;
- `npm run test:conformance`: 1917/1917, 280 suites, zero fail/skipped;
- `npm run check:builder-docs`: 26 Markdown files / 284 links+anchors / 38 public package imports;
- `npm run test:kernel`: 4/4;
- `npm run test:sdk`: 22/22;
- K10-R15-01 demonstration: 29 cases, 10 H15/C distinctions, zero C failures against the declared outcome; the exact review-16 planted-table counterexample is H15 GREEN → C RED(2);
- whitespace-class audit: 36 ATX cases, 11 table-row cases and a real-inventory non-vacuity comparison; the independently written reference source and rules are quoted in the log;
- focused C4 suite: 186 tests, 19 suites, zero fail/skipped;
- evals not run, appropriately limiting the claim because round 16 changes only the structural C4 evidence parser/controls and no Agent/model-facing behavior.

These are inspected immutable logs, not commands I independently reran. I did not independently recompute the MANIFEST SHA-256 values.

## Verdict

Every K1.0 criterion C1–C9 passes for exact candidate H `f3aa29d7ecba2a23aa85788b7efdebdd383cab24` over clean payload C `d693d59aefe5335c8950d57cec6d6b57e375cadc`, contract revision 16, governing base `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.

**ACCEPT** is for that exact H only. It grants no benchmark E1 result, no K1 milestone closure, no merge/integration and no successor release. Under 006 the authoritative K1.0 status may now be transcribed to `ACCEPTED`; owner integration/discussion and any next release remain separate decisions.

ACCEPT