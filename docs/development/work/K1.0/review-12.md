# K1.0 independent review — round 12

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-13  
**Role:** accountable independent reviewer; I did not implement this candidate.

## Candidate binding and access

This review binds only to submitted candidate H:

- governing process / review base: `c9a9ed7e6e538ab0542fc6a999426264abb6212a`;
- previous reviewed H11: `4cd711f71fcafb64ffaa7d49a715d05eaec3c2dc`;
- round-11 review record: `docs/development/work/K1.0/review-11.md`, recorded by
  `f22786173120976be7b8bdfac23c6fa1db660f30`;
- clean round-12 payload C: `ec713563b8b76273411231aff6f1f3ad49e4ffb0`;
- submitted round-12 H: `da7db0275049a78e069a4068ca68b1b8f296e6a3`;
- branch: `codex/k1.0-target-boundary-legacy-quarantine`;
- contract: `docs/development/work/K1.0/contract.md`, revision 12.

At review start the advertised branch SHA was exactly H and advertised `main` remained exactly the
recorded base. I inspected the pinned repository through the authorized GitHub connector, including
the governing process/method records, review-11, contract revision 12, the complete round-12
correction delta, the cumulative base-to-C file set, the affected C4 oracle/tests, implementation-12,
validation-12, the target Kernel source/manifest, ownership inventory, executable boundary policy,
and the shared module-dependency analyzer. I also checked the published GFM 0.29 specification at
`https://github.github.com/gfm/`, specifically §2.1, §4.6 and §6.10, because the remaining finding
turns on the specification's distinct definitions of whitespace, Unicode whitespace and blank lines.

I do **not** have a local checkout of this repository in this review session, so I did not independently
rerun the repository's validation commands or recompute attachment digests. I inspected the immutable
clean-C logs and source. I used a local Node runtime only to sanity-check the host-language fact that
ECMAScript `\s` and `String.prototype.trim()` treat U+00A0, U+000B and U+000C as whitespace; the
repository counterexamples below otherwise follow directly from the pinned source and published GFM
rules.

The benchmark E1 preparation branch remains at H2
`8de04779d279dba82cf834d419e465d2b677ef46`, parent C2
`d8f17549c31f9ee5d995e773c2f211faed2785fb`; benchmark `main` remains
`5a3f1ba525f68244701b1f73a1d29c4902ffe589`. The preparation remains built but unaccepted and is
not an E1 result.

Identity / interval verification:

- the round-11 review record is the exact parent of C;
- `f2278617…` → C is exactly one correction commit touching four files: contract revision 12,
  `inventory-oracle.ts`, `kernel-landing-zone.test.ts`, and an explicitly superseding SELF-23
  correction section appended to `validation-11/MANIFEST.md`;
- H's parent is exactly C;
- C → H is exactly one report/evidence/status commit touching the three status summaries,
  `implementation-12.md`, and validation-12's manifest plus nine raw logs; no source, test,
  fixture, evaluator, threshold, package or configuration payload first appears in H;
- base → C is 37 commits ahead with the cumulative K1.0 file set and no unrelated packet payload;
- the clean-C evidence records `tests/conformance/k0` byte-identical to base;
- the SELF-23 historical-manifest correction follows the existing evidence-record mechanism: the
  bad historical token remains visible and the superseding section supplies the true 40-character
  blob identity rather than rewriting the original sentence.

## Independent coverage and correction disposition

Before using implementation-12's explanation I re-derived these interacting obligations from
007/013 and contract revision 12:

1. **C1 ↔ C2 ↔ C9:** the target Kernel zone must remain quarantined by meaningful transitive,
   type-only/barrel/dynamic-aware guards that fail closed rather than by an empty graph.
2. **C3 ↔ C6 ↔ C7:** current supported legacy behavior and useful regressions must remain intact;
   the target package may only establish the landing zone and explicit refusal surface.
3. **C4 ↔ C5:** every human ownership/dependency assertion must remain relationally checkable against
   the executable policy/tree, and the evidence parser must neither silently delete a relation nor
   manufacture one from Markdown content outside the governed top-level table/section.
4. **C8:** the benchmark preparation identities are prerequisites only; no E1 pass may be inferred.
5. **Process/evidence:** exact C/H scope, immutable clean-C evidence, faithful historical correction,
   and no K1/successor claim.

### K10-R11-01 disposition — CLOSED

The round-11 type-6 boundary-token defect is genuinely fixed. The new predicate

```ts
(?=\s|>|/>|$)
```

no longer makes a lone `/` independently sufficient and no longer treats a literal `$` as a boundary
token. The end-to-end matrix correctly distinguishes `<div/ x>`, `<div/foo>`, `<div/` and
`<div$foo>` from the accepted `>`, `/>`, whitespace and EOL forms, and it preserves type-7 handling
of complete custom tags. Validation-12/08 demonstrates the exact H11 RED-manufactured → C GREEN
transition on all four reviewed malformed forms; validation-12/09 shows the resulting line
classification and heading eligibility directly.

The finding below is a deeper lexical-class interaction revealed by that reconstruction. It does not
reopen the slash-vs-`/>` token distinction.

## Finding

### K10-R12-01 — P2 — the raw-HTML scanner conflates three different GFM whitespace classes

**Affected candidate source:**
`tests/conformance/architecture/inventory-oracle.ts`, especially `parseHtmlBlockStart`,
`parseCompleteTag`, and `isBlankLine`.  
**Governing criterion:** K1.0-C4; contract revision 12's pinned published GFM 0.29 raw-HTML claim.  
**Governing source:** published GFM 0.29 §2.1, §4.6 and §6.10.

Round 12 corrected the **token alternatives** after a type-6 tag name, but it inherited the word
"whitespace" as if JavaScript and GFM meant the same character class. They do not.

Published GFM 0.29 §2.1 defines a **whitespace character** as exactly space U+0020, tab U+0009,
newline U+000A, line tabulation U+000B, form feed U+000C, or carriage return U+000D. It separately
defines **Unicode whitespace**. It separately defines a **blank line** as a line containing only
spaces U+0020 or tabs U+0009. §4.6's type-1 and type-6 starts use the first category, while type-6/7
termination uses the blank-line category; §6.10's tag grammar uses GFM whitespace for attributes.

The candidate uses three incompatible host-language approximations instead:

```ts
if (/^<(script|pre|style)(\s|>|$)/i.test(rest)) return { kind: 1 };
...
const type6 = new RegExp(`^<\\/?(?:${HTML_BLOCK_TAGS})(?=\\s|>|/>|$)`, "i");
```

ECMAScript `\s` is broader than GFM whitespace and includes U+00A0 NBSP (and other Unicode
whitespace). Conversely, `parseCompleteTag` skips only literal space and tab before attributes and
around `=`, and its trailing check is `[ \t\r]*`, so it is narrower than GFM's tag whitespace and
misses U+000B/U+000C. Finally:

```ts
function isBlankLine(line: string): boolean {
  return line.trim() === "";
}
```

uses ECMAScript trimming, which treats U+00A0, U+000B and U+000C as empty even though GFM blank lines
may contain only spaces/tabs. The function's own comment says "spaces/tabs only", but the executable
predicate is broader.

#### Distinguishing fail-open counterexample: valid type-7 block is missed

Use the actual U+000B **LINE TABULATION / vertical-tab** character where `\u000B` is shown below,
with a blank before the opener so paragraph interruption is irrelevant:

```text
<Warning\u000Btitle="x">
## What this packet does not establish

| Id | Current path | Disposition | Owner | Why it is assigned there |
|---|---|---|---|---|
| DX-1 | `packages/core/src/util/json.ts` | migratable | K1.1 | planted contradictory further table |

## What this packet does not establish
```

Under GFM 0.29, U+000B is a whitespace character. The first line is therefore a valid complete
custom open tag: the vertical tab begins the `title` attribute. It opens a type-7 raw HTML block.
The first exact heading-looking line is raw content, not the Deferred terminator. The following blank
line ends type 7, so the planted table remains inside Deferred before the later real heading and must
be reported as a further table.

C instead reaches `parseCompleteTag`, does not skip U+000B, returns `null`, and leaves the opener
ordinary. The immediately following exact L2 heading can terminate Deferred, placing the planted
contradictory table outside the governed section. This recreates the silent-deletion direction C4 has
been reconstructing across rounds.

U+000C FORM FEED is the same valid-GFM neighbor.

#### Distinguishing false-positive counterexample: JavaScript `\s` is too broad

Use an actual U+00A0 **NO-BREAK SPACE** immediately after a recognized type-6 name:

```text
<div\u00A0x>
## What this packet does not establish

| Id | Current path | Disposition | Owner | Why it is assigned there |
|---|---|---|---|---|
| DX-1 | `packages/core/src/util/json.ts` | migratable | K1.1 | planted table |

## What this packet does not establish
```

GFM explicitly distinguishes Unicode whitespace from its narrower `whitespace` category; U+00A0 is
not a type-6 whitespace boundary. The line is not a valid complete tag either, because attribute
whitespace uses the same GFM category. The first exact heading should therefore be real and the
planted table outside Deferred.

C's JavaScript `\s` matches U+00A0, opens HTML-6, hides the heading until the blank line, and can
manufacture the same kind of further-table disagreement that rounds 10–12 have been removing.
The type-1 `(\s|>|$)` neighbor has the same over-broad boundary issue.

#### Distinguishing lifetime counterexample: GFM blank line is narrower than `trim()`

A type-7 block followed by a line containing only U+00A0 is **not** followed by a GFM blank line,
because GFM blank lines contain only spaces/tabs. The raw block must continue across that line and a
subsequent heading-looking line. C's `line.trim() === ""` instead ends the raw block on the U+00A0
line, re-enables the heading, and can silently move a later contradictory table outside the section.
U+000B/U+000C-only lines expose the same mismatch.

**Impact:** contract revision 12 still cannot truthfully claim the published GFM 0.29 raw-HTML
boundary. Depending on which host whitespace character is used, C can either manufacture an inventory
disagreement or silently miss a contradictory further table. K1.0-C4 therefore remains failed.

**Required outcome:** reconstruct raw-HTML lexical classes once, rather than patching these literals.
Use one explicit GFM-whitespace definition for §4.6/§6.10 positions and a separate explicit GFM
blank-line predicate (space/tab only). Apply them consistently to at least:

- type-1 start boundaries;
- type-6 start boundaries;
- `parseCompleteTag` attribute separators, optional whitespace around `=`, pre-close whitespace and
  trailing-whitespace checks;
- type-6/type-7 blank-line termination / `isBlankLine` where C4 depends on GFM blankness.

Do not globally replace every `\s` or `.trim()` in unrelated Markdown logic: list markers, table
normalization and other grammar positions have their own rules.

Required production-parser controls should include:

1. a custom type-7 tag with U+000B before an attribute, proving the raw block opens and the planted
   further table surfaces;
2. the U+000C equivalent;
3. optional/trailing GFM tag whitespace using U+000B/U+000C, with type-7 lifetime distinguished;
4. `<div` + U+00A0 + text stays ordinary (type 6 must not open);
5. `<script` + U+00A0 + text stays ordinary (type 1 must not open);
6. a U+00A0-only line does not end an open type-6/type-7 block;
7. U+000B/U+000C-only lines likewise do not count as GFM blank lines;
8. space-only and tab-only lines still terminate type 6/type 7 as before;
9. CRLF and the round-12 slash/dollar matrix remain green;
10. an H12→corrected-C demonstration through `inventoryDisagreements`, not a helper-only regex test.

Because this is another adjacent defect in the repeatedly corrected C4 Markdown subsystem, 006/012's
reconstruction rule applies: explain that round 12 audited **which boundary tokens** were allowed but
never independently derived the specification's lexical classes, so host `\s` / `trim()` and the
hand-written `[ \t]` loops survived with mutually inconsistent meanings.

### Nonblocking precision note — P3

Contract revision 12's live acceptance table still carries round-11 exact evidence counts in a few
places: C3 says `1990` full tests and C7's architecture progression ends at `290`, while the submitted
round-12 evidence is 1994 full tests / 294 architecture cases. The revision-12 preamble,
implementation-12 and raw logs carry the current values, so this does not change the semantic verdict;
reconcile the live rows during the next contract edit.

## Cumulative criterion verdicts

| Criterion | Verdict | Independent rationale |
|---|---|---|
| **K1.0-C1** | **PASS** | The target package source remains the two-file refusal-only zone; executable policy still permits only in-zone files/empty approved leaves plus `node:` externals. The module analyzer still parses module-bearing TypeScript forms and fails closed on unresolved dynamic targets. Correction delta does not touch C1 machinery. |
| **K1.0-C2** | **PASS** | The 23 forbidden/permitted fixture structure and shared boundary predicate are unchanged; no correction changes the walker or violation rule. Full conformance remains green. |
| **K1.0-C3** | **PASS** | Correction delta moves no legacy/public source. Clean-C raw full log records 1994/1994, 294 suites, zero fail/skipped; typecheck is recorded clean. Target remains isolated rather than routing existing consumers through it. |
| **K1.0-C4** | **FAIL** | **K10-R12-01 P2.** Raw-HTML recognition still uses inconsistent host whitespace classes and can both silently delete a contradictory relation and manufacture one relative to pinned GFM 0.29. |
| **K1.0-C5** | **PASS** | Inventory and executable policy still carry the same 12 DX assignments: four migratable, seven legacy-only and one refused, each with a packet owner. |
| **K1.0-C6** | **PASS** | `@arrokothi/kernel` remains `private`; it exports only `UnsupportedKernelSurfaceError` and `refuseUnsupportedSurface`, whose implementation throws. No protocol, no-op API, E1 pass or release claim appears. |
| **K1.0-C7** | **PASS** | Correction delta changes no legacy regression source. Full/conformance logs are green with zero skipped, and the cumulative changed-file set retains the legacy-boundary re-attribution rather than deleting it. |
| **K1.0-C8** | **PASS** | E1 preparation identities remain C2/H2 at the benchmark branch, benchmark main unchanged, and both contract/report continue to say prepared/unaccepted/no result. |
| **K1.0-C9** | **PASS** | Shared AST + TypeScript-preprocessor dependency extraction and fail-closed sentinel remain unchanged; C1/C2 still consume that analyzer. Round-12 changes are confined to C4 Markdown evidence plus the historical manifest correction. |

## Evidence assessment

Inspected clean-C records show:

- `npm run typecheck`: exit 0, clean;
- `npm test`: 1994 tests / 294 suites / 1994 pass / 0 fail / 0 skipped;
- `npm run test:conformance`: 1881 tests / 275 suites / 1881 pass / 0 fail / 0 skipped;
- builder-docs: 26 Markdown files / 284 links+anchors / 38 public package imports;
- Kernel: 4/4; SDK: 22/22;
- validation-12/08: 18 cases, 4 distinguishing, 14 agreeing, 0 regressions;
- validation-12/09: 19 boundary windows with one transition per physical line;
- evals: not run, appropriately outside this structural packet's Agent/model claim.

I did not independently rerun those repository commands. The raw full/conformance tails are present and
consistent with the manifest. The evidence is sufficient for C1/C2/C3/C5–C9, but green tests do not
override the source-level C4 counterexamples above.

## Prior findings and progress

- **K10-R11-01:** CLOSED this round; slash-vs-`/>` and literal-dollar boundary fixed with meaningful
  end-to-end H11→C evidence.
- **K10-R10-01/-02/-03 and earlier closed findings:** preserved at their reviewed boundaries; no
  correction delta reopens their direct counterexamples.
- **K1.0-SELF-23:** historical evidence identity correction is properly superseding rather than a
  rewrite; the corrected 40-character blob identity is also used by validation-12.
- **New reviewer finding:** K10-R12-01 P2 above.

Round 12 made substantive progress. It closed the exact round-11 defect and narrowed the remaining C4
problem from block/container structure and token boundaries to one shared lexical-class model. This is
not evidence that the coding agent is stuck.

## Verdict and status

Required transcription state: `CHANGES_REQUESTED`.

Correction handoff:

```text
Correct the same released packet K1.0 on codex/k1.0-target-boundary-legacy-quarantine.
Base c9a9ed7e6e538ab0542fc6a999426264abb6212a; reviewed H da7db0275049a78e069a4068ca68b1b8f296e6a3.
Review record: docs/development/work/K1.0/review-12.md (recording commit supplied externally).
Open finding K10-R12-01 P2; required outcomes and counterexamples are in that record.
Owner supplemental decisions: none. Unresolved authority: none.
Apply 006 and 012: reconstruct the raw-HTML whitespace/blank-line lexical classes and their dependent
paths, preserve the accepted container/token machinery, then re-review the whole cumulative packet.
Fix additional in-scope defects with separate provenance. Use 008 for the next report and 006 for new
C/H plus evidence/push handoff. No successor release.
```

**CHANGES REQUIRED**
