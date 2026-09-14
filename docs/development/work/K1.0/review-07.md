# K1.0 independent review — round 7

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-13  
**Role:** accountable independent reviewer; I did not implement this candidate.

## Candidate binding and access

This review binds only to submitted candidate H:

- governing process / review base: `c9a9ed7e6e538ab0542fc6a999426264abb6212a`;
- previous reviewed H6: `5dd570002c082872914291ef0b3cc244bf9bc205`;
- round-6 review record: `docs/development/work/K1.0/review-06.md`, recorded by
  `3e9779e64305f87b48e773b102d4d1523e7ea4cb`;
- clean round-7 payload C: `249c7a8b04f4a724926efd9ba0c67782a30286ce`;
- submitted round-7 H: `2dfc6d818498263c30cb64db32a91aa0ac0543a5`;
- branch: `codex/k1.0-target-boundary-legacy-quarantine`.

At review start the advertised branch SHA was exactly H and advertised `main` remained exactly the
recorded base. I inspected the pinned repository through the authorized GitHub connector, including
the governing AGENTS/006/007/008/012/013 material already bound to this unchanged base, review-06,
contract revision 7, the complete round-7 correction delta, cumulative base-to-C file set, the C4
oracle/tests, implementation-07, validation-07 and its targeted raw logs. I also rechecked the
published GitHub Flavored Markdown specification because this subsystem claims structural GFM
section/table interpretation. I rechecked the benchmark E1 preparation branch read-only; it remains
at H2 `8de04779d279dba82cf834d419e465d2b677ef46`, parent C2
`d8f17549c31f9ee5d995e773c2f211faed2785fb`, accepted by nobody.

I do **not** have a local executable checkout of either repository in this review session, so I did
not independently rerun typecheck/test/conformance. I inspected the immutable clean-C evidence and
committed source/tests. The blocking counterexample below follows directly from the committed
`sectionText` control flow and Markdown block semantics; it does not depend on an unobserved command.

Identity / interval verification:

- H6 is followed by exactly one immutable round-6 review-record commit, `3e9779e6…`, adding only
  `review-06.md`;
- `3e9779e6…` → C is exactly one correction payload commit touching only contract revision 7,
  `inventory-oracle.ts`, and `kernel-landing-zone.test.ts`;
- H's parent is exactly C;
- C → H is exactly one report/evidence/status commit containing implementation-07,
  validation-07's manifest/nine logs and matching 001/007/README status summaries; no source, test,
  fixture, evaluator, threshold, package or configuration payload first appears in H;
- base → C remains the cumulative K1.0 history; no unrelated packet payload appears in the changed
  file set;
- `tests/conformance/k0` is recorded byte-identical to the governing base.

## Independent coverage and prior-finding disposition

I repeated cumulative coverage rather than limiting review to the latest header/body correction:

1. **C1 ↔ C2 ↔ C9:** preserve the accepted dependency-extraction reconstruction, transitive guard,
   forbidden-edge controls and prose-soundness distinction.
2. **C3 ↔ C6 ↔ C7:** preserve current legacy/public behavior, refusal-only target scaffolding and
   retained regressions while C4 evidence machinery changes.
3. **C4 ↔ C5:** the human ownership/export/dependency inventory must agree with executable policy;
   every assertion inside the governed Markdown section must reach row discovery/accounting or be
   excluded only because Markdown structure really places it outside that section/table.
4. **C8:** benchmark E1 preparation remains pinned, external and explicitly unaccepted.
5. **Evidence/process:** exact C/H scope and clean-C validation evidence must remain inspectable and
   truthful; report/evidence attachments must not conceal payload changes.

### K10-R6-01 disposition — CLOSED

The round-6 content-based header-classification defect is genuinely fixed. Discovery now returns a
`DiscoveredTable` with its structural header separated from its body. `readKeyedTable` checks the
configured header label only against that structural header and iterates only `governed.body` for
key extraction, duplicate detection, value parsing and unreadable reporting. A body row beginning
`Zone id`, `Id`, `Package` or `Zone` therefore has no path to the header exit.

The committed controls materially distinguish H6 from C across all four governed tables, before and
after an otherwise correct row, with full and omitted edge pipes. The real structural headers remain
accepted, renamed headers remain fail-loud, and round-6 GFM edge/pipe-less/escaped-pipe controls are
preserved. **K10-R6-01 is CLOSED.**

### K1.0-SELF-12 / SELF-13 disposition

Both self-found cases are useful and correctly handled at their stated examples:

- `K1.0-SELF-12`: repeating `## Zones` no longer causes `split(heading)` to discard the remainder;
  the contradictory second table is kept inside the candidate section and reported.
- `K1.0-SELF-13`: every row of a further table in a governed section, including its structural
  header, is reported, so a planted delimiter cannot silently promote a contradictory body row into
  an ignored header.

However, the SELF-12 repair still identifies the **end** of a section using raw substring search for
`nextHeading`. That leaves a distinct section-selection escape below.

## Finding

### K10-R7-01 — P2 — section selection can still truncate at a literal next-heading string that is not a heading

**Reopens:** C4's total section/row-accounting invariant only; K10-R6-01's structural header/body
classification remains closed.  
**Affected:** `tests/conformance/architecture/inventory-oracle.ts`, `sectionText`; all four keyed C4
relations; contract revision 7's claim that section text runs from the first heading to the first
following next-heading.

The round-7 helper is:

```ts
function sectionText(markdown: string, heading: string, nextHeading: string): string {
  const from = markdown.indexOf(heading);
  if (from === -1) return "";
  const rest = markdown.slice(from + heading.length);
  const to = rest.indexOf(nextHeading);
  return to === -1 ? rest : rest.slice(0, to);
}
```

The first-heading change closes the exact repeated-heading defect, but the end boundary is still
selected by the first **textual occurrence** of `nextHeading`, not by the next structural ATX heading.
GFM headings are block structures; the characters `## Current cross-boundary` inside ordinary prose,
an inline code span or a fenced code block are not a section heading. `sectionText` nevertheless
cuts at those bytes before `sectionTables` can inspect their Markdown context.

A concrete distinguishing mutation of the real Zones section is:

```markdown
| `host-sdk` | `packages/sdk/src` | Application bootstrap and host composition. |

The literal token `## Current cross-boundary` is mentioned here; this line is prose, not an ATX heading.

| Zone id | Roots | Owner and status |
|---|---|---|
| `target-kernel` | `packages/core/src` | stale contradictory further table |

## Current cross-boundary dependencies
```

The first, real Zones table is still complete and correct. Under GFM the prose line does not close the
`## Zones` section, so the second table is still a further table in that section and must be reported
under revision 7's one-governed-table rule. The committed `sectionText`, however, finds the
`nextHeading` substring inside the prose/code literal and returns only the text before it. The
contradictory second table is therefore deleted from the parser's input. The first correct table is
parsed normally, no further table is visible, `unreadable` can remain empty and the relation can stay
green.

The same shape can be produced with the next-heading text inside a fenced code block. GFM treats
fenced block contents as literal text, not headings, but `sectionText` performs its substring cut
before the fence-aware table scanner runs. This makes the defect specifically a section-boundary
classification problem, not another table-row spelling issue.

**Impact:** C4 can report agreement while the human-readable inventory contains a contradictory
additional table in the same rendered section. The checked-in inventory contains no such literal
next-heading mention; this is a defect in the executable drift oracle and in the claimed totality of
its section-selection stage, not evidence that the current real rows themselves are factually wrong.

**Required outcome:** make section boundaries structural rather than substring-based. The parser must
identify the actual governed ATX heading and the actual following section heading under the Markdown
forms this document accepts, so literal heading text in prose, inline code or fenced code cannot end a
section. Add production-parser controls for at least a literal `nextHeading` mention before a
contradictory further table and a fenced-code occurrence of that text; preserve SELF-12 repeated-
heading handling, SELF-13 further-table reporting and all accepted row/header/key/value controls.
Audit the section-start boundary at the same time so no raw textual heading alias can silently select
or truncate a governed section.

No owner semantic decision is required. This is an ordinary same-packet deterministic C4 oracle
defect.

## Validation and evidence assessment

I inspected validation-07's manifest, the silent-exit audit and targeted raw suite tails. They bind to
clean payload C `249c7a8b04f4a724926efd9ba0c67782a30286ce`, Node v25.2.1 / npm 11.6.2 /
TypeScript 5.9.3 / Darwin 25.6.0 arm64, and record:

- `npm run typecheck`: exit 0;
- `npm test`: 1926/1926, 286 suites, zero fail/skipped;
- `npm run test:conformance`: 1813/1813, 267 suites, zero fail/skipped;
- builder-docs: 26 Markdown files / 284 links or anchors / 38 public package imports;
- target-kernel: 4/4; SDK: 22/22;
- the H6 header-label body-row family is silent there and reported in C across 16 variants;
- SELF-12 repeated-heading and SELF-13 further-table cases are reported;
- the unmutated inventory remains green;
- `tests/conformance/k0` is recorded byte-identical to base.

The nine round-7 manifest digest tokens are structurally valid 64-character hexadecimal SHA-256
values. The full and conformance raw logs are accessible and independently inspected at their tails:
1926/1926 and 1813/1813 respectively, both exit 0. I did not independently recompute every attachment
digest in this no-checkout session.

The committed `09-silent-exit-audit.log` is useful, but its stage-1 cases test **absence** of the next
heading and repetition of the current heading. It does not test an earlier textual occurrence of the
next-heading bytes that Markdown does not classify as a heading. Consequently its conclusion that
section selection has no other silent exit is not established for the actual implementation above.

`npm run test:evals` was not run; that remains an appropriate exclusion because K1.0 changes no
Agent/model-facing behavior and makes no eval-dependent claim.

Non-blocking documentation note carried forward: C9's prose still says the two-extractor comparison
covered 325 repository sources while the earlier pinned comparison evidence reported 326. This is a
stale documentation count, not a scanner-behavior failure, and does not change a criterion verdict.

## Per-criterion verdicts

| Criterion | Verdict | Independent basis |
|---|---|---|
| **K1.0-C1** | **PASS** | Target source and the accepted scanner/graph enforcement remain unchanged; round 7 introduces no target dependency. |
| **K1.0-C2** | **PASS** | The round-3 forbidden-edge reconstruction and representative controls remain intact; round 7 changes only C4 parsing evidence. |
| **K1.0-C3** | **PASS** | Clean-C typecheck/full-suite evidence is green at 1926/1926; no legacy source or public export changes in the correction interval. |
| **K1.0-C4** | **FAIL** | Structural header/body classification closes K10-R6-01, but raw `indexOf(nextHeading)` can still truncate a section at literal text that is not a Markdown heading, silently deleting a later contradictory table. See K10-R7-01. |
| **K1.0-C5** | **PASS** | The twelve current deferrals remain assigned to concrete packet owners; no assignment changed or became unresolved. |
| **K1.0-C6** | **PASS** | Target package remains private and refusal-only; no protocol implementation, no-op API, E1 success or package-release claim is introduced. |
| **K1.0-C7** | **PASS** | Legacy regressions and accepted scanner reconstruction are untouched; full conformance remains green. |
| **K1.0-C8** | **PASS** | Benchmark E1 preparation remains at the same unaccepted C2/H2 identities and K1.0 still claims no E1 result. |
| **K1.0-C9** | **PASS** | Dependency-extraction/prose-soundness code is unchanged; no new scanner bypass was found in this cumulative pass. |

No packet criterion is left unexamined. No architecture ambiguity or unavailable mandatory evidence
blocks correction; K10-R7-01 is a narrow deterministic C4 section-selection defect.

## Verdict and correction handoff

**Required packet status for transcription:** `CHANGES_REQUESTED`.

Round 7 genuinely closes the round-6 header/body finding and materially improves the parser by making
row identity structural. It cannot yet be accepted because the section boundary itself is still
identified textually, so literal next-heading bytes can erase later governed content before the
structural table logic runs.

```text
Correct the same released packet K1.0 on codex/k1.0-target-boundary-legacy-quarantine.
Base c9a9ed7e6e538ab0542fc6a999426264abb6212a; reviewed H 2dfc6d818498263c30cb64db32a91aa0ac0543a5;
review record docs/development/work/K1.0/review-07.md.
Open finding K10-R7-01; required outcome and counterexample are in that record.
Owner supplemental decisions none; unresolved authority none.
Apply 006/012 narrowly at C4's section-selection boundary: make section identity structural rather
than substring-based, then re-review the cumulative packet. Preserve the accepted GFM row discovery,
structural header/body split, key-before-value semantics, relational comparisons, scanner
reconstruction and evidence correction. Fix additional in-scope defects with separate provenance.
Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.
```

CHANGES REQUIRED
