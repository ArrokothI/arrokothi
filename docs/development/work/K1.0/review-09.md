# K1.0 independent review — round 9

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-13  
**Role:** accountable independent reviewer; I did not implement this candidate.

## Candidate binding and access

This review binds only to submitted candidate H:

- governing process / review base: `c9a9ed7e6e538ab0542fc6a999426264abb6212a`;
- previous reviewed H8: `065e864a796da6195ceca1d489201d2d687f7b8d`;
- round-8 review record: `docs/development/work/K1.0/review-08.md`, recorded by
  `f7dedc3c6fe41019665f5a93fdb29b570c59bbc4`;
- clean round-9 payload C: `f2b8397eb2f8e743f937594e52f22f9d34fb1e98`;
- submitted round-9 H: `4d7ebb9590c4a0a8da8fff4f5fa79c753eff2120`;
- branch: `codex/k1.0-target-boundary-legacy-quarantine`.

At review start the advertised branch SHA was exactly H and advertised `main` remained exactly the
recorded base. I inspected the pinned repository through the authorized GitHub connector, including
AGENTS.md, 006/007/008/012/013 at the governing base, review-08, contract revision 9, the complete
round-9 correction delta, the cumulative base-to-C changed-file set, the affected C4 oracle/tests,
implementation-09 and validation-09. I rechecked the benchmark repository read-only: benchmark
`main` remains `5a3f1ba525f68244701b1f73a1d29c4902ffe589`; E1 preparation remains at H2
`8de04779d279dba82cf834d419e465d2b677ef46`, parent C2
`d8f17549c31f9ee5d995e773c2f211faed2785fb`, accepted by nobody.

I also checked the published GitHub Flavored Markdown specification at
`https://github.github.com/gfm/` because the corrected C4 subsystem explicitly claims GFM block
classification, including list/container handling and all seven HTML-block forms. The relevant
published rules are that container blocks may contain other blocks; list items may contain any kind
of block and specifically may contain headings; type-7 HTML blocks start from a complete open or
closing tag and cannot interrupt a paragraph; and quoted HTML attribute values may contain `<` or
`>` when those characters are not the quote delimiter.

I do **not** have a local executable checkout of either repository in this review session, so I did
not independently rerun the full typecheck/test/conformance commands. I inspected the immutable
clean-C logs, the distinguishing demonstration/state-transition audit and the committed production
source/tests. The two findings below follow directly from the committed scanner plus the published
GFM grammar; they do not depend on an unobserved command.

Identity / interval verification:

- H8 is followed by exactly one round-8 review-record commit, `f7dedc3c…`, adding only
  `review-08.md`;
- `f7dedc3c…` → C is exactly one correction payload commit touching only contract revision 9,
  `inventory-oracle.ts`, and `kernel-landing-zone.test.ts`;
- H's parent is exactly C;
- C → H is exactly one report/evidence/status commit containing implementation-09,
  validation-09's manifest/nine logs and matching 001/007/README status summaries; no source,
  test, fixture, evaluator, threshold, package or configuration payload first appears in H;
- base → C is the cumulative K1.0 history; I found no unrelated packet payload in the changed-file
  set;
- `tests/conformance/k0` is recorded byte-identical to the governing base.

## Independent coverage and prior-finding disposition

I repeated cumulative coverage rather than limiting review to the two round-8 literals:

1. **C1 ↔ C2 ↔ C9:** preserve the accepted dependency-extraction reconstruction, transitive guard,
   forbidden-edge controls and prose-soundness distinction.
2. **C3 ↔ C6 ↔ C7:** preserve current legacy/public behavior, refusal-only target scaffolding and
   retained regressions while C4 evidence machinery changes.
3. **C4 ↔ C5:** the ownership/export/dependency inventory must agree with executable policy; only
   top-level governed Markdown tables may enter the relation oracle, and only top-level exact section
   headings may delimit those governed sections.
4. **C8:** benchmark E1 preparation remains pinned, external and explicitly unaccepted.
5. **Evidence/process:** exact C/H scope and clean-C evidence must remain inspectable and truthful;
   a scanner's claimed grammar must be distinguished by inputs that exercise the actual block
   contexts it says it handles.

### K10-R8-01 disposition — CLOSED

The fence double-consumption defect is genuinely fixed. The table scanner no longer carries its own
nested fence-state loop. `scanTransitions`/`scanBlocks` first annotate block context and
`sectionTables` then performs one monotonically advancing pass over those annotations. A fence marker
that breaks an open table body is therefore not left at the same table-scan index to be reconsidered
as another transition.

The new complete-table controls distinguish the exact prior defect rather than the weaker one-row
round-8 audit. Bare backtick and tilde fences containing a header/delimiter/body table after the real
Zones body are spurious further tables under H8 and stay green under C; shorter and mismatched closer
cases exercise neighboring fence-state paths; the same complete table outside a fence still fails as
a genuine further table. **K10-R8-01 is CLOSED.**

### K10-R8-02 disposition — exact reviewed forms CLOSED, broader claimed block grammar still incomplete

The reviewed `<script>...</script>` escape and the neighboring comment/pre/div forms are materially
fixed. `scanTransitions` now carries HTML block state and suppresses heading/table recognition while
those tested blocks are raw, so the exact next-heading bytes inside them no longer truncate the
section. The new demonstration distinguishes H8 on script/comment/pre/div and the state-transition
audit shows the intended gating.

That is substantive progress. However, revision 9 broadens the claim to **GFM raw-HTML block types
1–7**, and the implementation's type-7 tag grammar is not complete enough for that claim. Finding
K10-R9-02 below is therefore a new counterexample at the widened invariant, not a rejection of the
specific round-8 `<script>` correction.

### Self-found round-9 defects

`K1.0-SELF-18` and `K1.0-SELF-19` are useful neighboring corrections. Indented-code table shapes no
longer become top-level inventory tables, and blockquoted fence/table-looking lines no longer rely on
accidental delimiter mismatch. Their controls exercise real false-positive directions and strengthen
the new block-state boundary.

## Findings

### K10-R9-01 — P2 — a heading nested in a list item can be mistaken for a top-level governed-section delimiter

**Affected:** `tests/conformance/architecture/inventory-oracle.ts`, `scanTransitions` / `sectionRange`;
K1.0-C4's structural section-identity claim and revision 9's assertion that unsupported list
constructs fail loud rather than silently changing section membership.

Revision 9 tracks fences, raw HTML, blank lines, indented code and blockquotes, but it has no list or
container state. The contract says lists have no state of their own and are nevertheless
"fail-loud, never silent." That is not true for a list-contained heading.

`scanTransitions` treats a two-space-indented line as ordinary Markdown because its indentation is
less than the four-column indented-code threshold. `parseAtxHeading` also deliberately accepts up to
three leading spaces. So after a bullet item, a valid heading that belongs **inside that list item**
can be returned as an ordinary level-2 heading. `sectionRange` has no container identity and may use
that nested heading as the exact top-level next-section delimiter.

A distinguishing Deferred-section mutation is:

```markdown
- note

  ## What this packet does not establish

| Id | Current path | Disposition | Owner | Why it is assigned there |
|---|---|---|---|---|
| DX-1 | `packages/core/src/util/json.ts` | migratable | K1.1 | stale contradictory further table |

## What this packet does not establish
```

For the `- note` item, two spaces are sufficient continuation indentation for a following block; GFM
list items may contain any kind of block and explicitly may contain headings. The indented `## What
this packet does not establish` is therefore a heading **inside the list container**, not the
repository document's top-level section boundary.

The contradictory table that follows the completed list, before the real top-level next heading,
remains part of the governed Deferred section and must be reported as a further table. The round-9
scanner instead can parse the nested heading as the exact next title and end the Deferred range there.
The later contradictory table is excluded before table discovery, while the original correct
Deferred table remains sufficient for the relation comparison to stay green.

**Impact:** a valid GFM container can silently hide a human inventory assertion. This directly
contradicts revision 9's stated "lists ... fail-loud, never silent" boundary and means section
identity is structural only at the leaf-block level, not at the required top-level container level.

**Required outcome:** make governed section delimiters explicitly **top-level** exact L2 headings, not
merely any line that parses as an ATX heading. Track enough list/container context to distinguish a
nested heading, or explicitly reject/refuse list-container syntax in governed sections *before* a
nested heading can delimit the section, with an observable fail-loud result. Do not special-case the
literal next-title string. Add production-parser controls for bullet and ordered list forms,
including marker-width/continuation-indentation neighbors, plus a real top-level next heading that
still terminates normally. If list syntax is intentionally unsupported, demonstrate that the refusal
itself is observable and cannot erase the rows that follow.

### K10-R9-02 — P2 — the claimed type-7 raw-HTML recognizer rejects valid complete tags with quoted `<`/`>` and can reopen silent heading truncation

**Affected:** `tests/conformance/architecture/inventory-oracle.ts`, `parseHtmlBlockStart` /
`scanTransitions` / `sectionRange`; K1.0-C4 and revision 9's claim to track GFM raw-HTML block types
1–7.

The type-7 branch currently uses:

```ts
const type7 = rest.match(/^<\/?([A-Za-z][A-Za-z0-9-]*)(\s[^<>]*)?\s*\/?>\s*$/);
```

That forbids `<` or `>` anywhere in the attribute text. GFM's tag grammar is more precise: an
unquoted value excludes `<` and `>`, but a single-quoted value excludes only `'`, and a
double-quoted value excludes only `"`. So `<Warning title="a>b">` is a valid complete custom open tag
and may start a type-7 HTML block when it is not interrupting a paragraph.

A distinguishing Deferred-section mutation, with a blank line before the tag so the type-7 paragraph
restriction is satisfied, is:

```markdown
<Warning title="a>b">
## What this packet does not establish

| Id | Current path | Disposition | Owner | Why it is assigned there |
|---|---|---|---|---|
| DX-1 | `packages/core/src/util/json.ts` | migratable | K1.1 | stale contradictory further table |

## What this packet does not establish
```

Under GFM the first line is a complete type-7 open tag; the following heading-looking line is raw
HTML-block content. The type-7 block ends before the blank line, so the contradictory table after it
is ordinary Markdown still inside the Deferred section until the real top-level next heading. It
must therefore be reported as a further table.

The committed regex rejects the opener because the quoted attribute contains `>`. The following
exact-title line is then ordinary ATX syntax, so `sectionRange` can terminate at it and silently
exclude the contradictory table. The checked-in inventory contains no such tag; this is again a
proof/oracle defect, not evidence the current ownership rows are wrong.

**Impact:** the exact `<script>`/comment/pre/div cases are fixed, but the broader "types 1–7" claim
still contains a valid raw-block escape. The present controls do not challenge complete type-7 tag
grammar with quoted delimiter characters.

**Required outcome:** either implement a bounded but grammar-correct recognizer for the complete
open/closing tag forms accepted as type 7, or explicitly refuse type-7 blocks in governed sections in
an observable fail-loud way before heading selection. Do not patch only `a>b`. If retaining the
claim of GFM types 1–7, audit the neighboring grammar rather than inheriting regex approximations:

- type-4 declarations in the published grammar begin `<!` followed by uppercase ASCII letters;
- type-6 block-tag starts have their specified terminator/lookahead conditions;
- type-7 closing tags have a narrower grammar than open tags and cannot carry attributes.

Add valid type-7 controls with double-quoted `>` and preferably single-quoted `<`, invalid-nearby tag
controls, the real top-level next heading after the raw block, and inline-HTML controls proving the
correction does not turn ordinary inline HTML into a raw block/refusal.

### Non-blocking evidence/wording note

Revision 9 repeatedly says one `scanBlocks` pass computes each line once and is shared by section
selection and table discovery. Inside `sectionTables`, however, the code calls `scanBlocks(markdown)`
and then calls `sectionRange(markdown, ...)`, which calls `scanBlocks(markdown)` again. Each scan is
pure and individually single-advancing, so I found no recurrence of K10-R8-01 from this redundant
recomputation; it is not a C4 blocker. Reconcile the wording or pass the precomputed annotations/range
through if the report intends "one pass" literally.

## Validation and evidence assessment

I inspected validation-09's manifest, raw full-suite/conformance tails, the distinguishing log and the
state-transition audit. They bind to clean payload C
`f2b8397eb2f8e743f937594e52f22f9d34fb1e98`, Node v25.2.1 / npm 11.6.2 /
TypeScript 5.9.3 / Darwin 25.6.0 arm64, and record:

- `npm run typecheck`: exit 0;
- `npm test`: 1954/1954, 289 suites, zero fail/skipped;
- `npm run test:conformance`: 1841/1841, 270 suites, zero fail/skipped;
- builder-docs: 26 Markdown files / 284 links or anchors / 38 public package imports;
- target-kernel: 4/4; SDK: 22/22;
- K10-R8-01/R8-02 demonstration: 11 cases, eight newly distinguishing, zero reported regressions;
- state-transition audit: 13 windows with one recorded transition per physical line within each scan;
- `tests/conformance/k0`: byte-identical to base.

The raw suite tails independently match the manifest's 1954/1954 and 1841/1841 counts. The evidence
is credible for the cases run. It does not distinguish K10-R9-01 because no nested list heading is
exercised, and it does not distinguish K10-R9-02 because the type-7 controls do not include a valid
complete custom tag whose quoted attribute contains `<` or `>`.

`npm run test:evals` was not run; that remains an appropriate exclusion because K1.0 changes no
Agent/model-facing behavior and makes no eval-dependent claim.

## Cumulative criterion verdicts

| Criterion | Verdict | Independent basis |
|---|---|---|
| **K1.0-C1** | **PASS** | Target source and accepted dependency scanner/graph enforcement remain unchanged; round 9 introduces no target dependency. |
| **K1.0-C2** | **PASS** | The round-3 forbidden-edge reconstruction and representative controls remain intact; round 9 changes only C4 evidence parsing. |
| **K1.0-C3** | **PASS** | Clean-C typecheck/full-suite evidence is green at 1954/1954; correction moves no legacy source and changes no public export. |
| **K1.0-C4** | **FAIL** | Fence single-consumption and the reviewed raw-HTML forms are fixed, but top-level section identity is still not container-aware and the claimed type-7 grammar misses a legal raw block. See K10-R9-01/-02. |
| **K1.0-C5** | **PASS** | The twelve current deferrals remain assigned to concrete packet owners; no assignment changed or became unresolved. |
| **K1.0-C6** | **PASS** | Target package remains private and refusal-only; no protocol implementation, no-op API, E1 success or release claim is introduced. |
| **K1.0-C7** | **PASS** | Legacy regressions and accepted dependency scanner reconstruction are untouched; the conformance suite remains green. |
| **K1.0-C8** | **PASS** | Benchmark E1 preparation remains at the same unaccepted C2/H2 identities and K1.0 still claims no E1 result. |
| **K1.0-C9** | **PASS** | Dependency-extraction/prose-soundness evidence is unchanged; no new scanner bypass was found in the cumulative pass. |

No packet criterion is left unexamined. No architecture ambiguity or unavailable mandatory evidence
blocks correction; both findings are deterministic same-packet C4 oracle defects.

## Verdict and correction handoff

**Required packet status for transcription:** `CHANGES_REQUESTED`.

Round 9 makes substantive progress. It closes the fence double-consumption defect by reconstruction,
closes the reviewed script/comment/pre/div raw-block cases, and adds useful indented-code/blockquote
controls. It cannot yet be accepted because the new block layer still lacks top-level container
identity for list-contained headings and overclaims complete type-7 HTML recognition.

```text
Correct the same released packet K1.0 on codex/k1.0-target-boundary-legacy-quarantine.
Base c9a9ed7e6e538ab0542fc6a999426264abb6212a; reviewed H 4d7ebb9590c4a0a8da8fff4f5fa79c753eff2120;
review record docs/development/work/K1.0/review-09.md.
Open findings K10-R9-01 and K10-R9-02; required outcomes and counterexamples are in that record.
Owner supplemental decisions none; unresolved authority none.
Apply 006/012 at C4's block/container grammar boundary: make governed section delimiters top-level
structural headings and make the claimed/raw-HTML type-7 boundary grammar-complete or explicitly
fail-loud refused. Preserve the accepted single-consumption fence/HTML state layer, structural
header/body classification, GFM row discovery, key-before-value semantics, relational comparisons,
dependency scanner reconstruction and evidence correction. Re-review the whole cumulative packet and
record any additional in-scope defect separately.
Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.
```

CHANGES REQUIRED
