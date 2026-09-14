# K1.0 independent review — round 8

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-13  
**Role:** accountable independent reviewer; I did not implement this candidate.

## Candidate binding and access

This review binds only to submitted candidate H:

- governing process / review base: `c9a9ed7e6e538ab0542fc6a999426264abb6212a`;
- previous reviewed H7: `2dfc6d818498263c30cb64db32a91aa0ac0543a5`;
- round-7 review record: `docs/development/work/K1.0/review-07.md`, recorded by
  `f9bb7f5144b94ac78d4e7d87c61a56f7e38b9334`;
- clean round-8 payload C: `b8037aa02f76716d09293fb236e51bf3da9282fb`;
- submitted round-8 H: `065e864a796da6195ceca1d489201d2d687f7b8d`;
- branch: `codex/k1.0-target-boundary-legacy-quarantine`.

At review start the advertised branch SHA was exactly H and advertised `main` remained exactly the
recorded base. I inspected the pinned repository through the authorized GitHub connector, including
review-07, contract revision 8, the complete round-8 correction delta, the cumulative base-to-C file
set, the affected C4 oracle/tests, implementation-08 and validation-08. I also checked the published
GitHub Flavored Markdown specification (`https://github.github.com/gfm/`) for the fenced-code and
raw-HTML block rules because both findings below turn on whether heading/table-looking bytes remain
Markdown structure inside those block contexts. I rechecked the benchmark E1 preparation branch
read-only; it remains at H2 `8de04779d279dba82cf834d419e465d2b677ef46`, parent C2
`d8f17549c31f9ee5d995e773c2f211faed2785fb`, accepted by nobody.

I do **not** have a local executable checkout of either repository in this review session, so I did
not independently rerun the full typecheck/test/conformance commands. I inspected the immutable
clean-C logs and committed source/tests. The two blocking counterexamples below follow directly from
the committed control flow plus GFM block rules and do not depend on an unobserved command.

Identity / interval verification:

- H7 is followed by exactly one round-7 review-record commit, `f9bb7f51…`, adding only
  `review-07.md`;
- `f9bb7f51…` → C is exactly one correction payload commit touching only contract revision 8,
  `inventory-oracle.ts`, and `kernel-landing-zone.test.ts`;
- H's parent is exactly C;
- C → H is exactly one report/evidence/status commit containing implementation-08,
  validation-08's manifest/nine logs and matching 001/007/README status summaries; no source,
  test, fixture, evaluator, threshold, package or configuration payload first appears in H;
- base → C remains the cumulative K1.0 history; no unrelated packet payload appears in the changed
  file set;
- `tests/conformance/k0` is recorded byte-identical to the governing base.

## Independent coverage and prior-finding disposition

I repeated cumulative coverage rather than limiting review to the latest section-heading literal:

1. **C1 ↔ C2 ↔ C9:** preserve the accepted dependency-extraction reconstruction, transitive guard,
   forbidden-edge controls and prose-soundness distinction.
2. **C3 ↔ C6 ↔ C7:** preserve current legacy/public behavior, refusal-only target scaffolding and
   retained regressions while C4 evidence machinery changes.
3. **C4 ↔ C5:** the human ownership/export/dependency inventory must agree with executable policy;
   Markdown block context must neither hide an asserted row nor manufacture one from literal code.
4. **C8:** benchmark E1 preparation remains pinned, external and explicitly unaccepted.
5. **Evidence/process:** exact C/H scope and clean-C validation evidence must remain inspectable and
   truthful; report/evidence attachments must not conceal payload changes.

### K10-R7-01 disposition — CLOSED

The round-7 raw-substring section-boundary counterexample is genuinely fixed. Section selection no
longer uses `indexOf`/`split` on heading bytes. `sectionLines` scans top to bottom, identifies exact
level-2 ATX titles, and tracks fenced-code state so prose, inline-code text, escaped hashes,
no-whitespace hash runs, over-long runs, four-space indentation and mismatched fence closers do not
become section boundaries merely because their bytes resemble one. Call sites now name the full
expected section titles instead of loose textual prefixes.

The committed controls materially distinguish H7 from C on the review-07 literal, fenced heading
mention, escaped/indented forms and mismatched fence case, and retain SELF-12/SELF-13 plus the
round-7 header/body controls. So **K10-R7-01 is CLOSED at its stated substring-selection boundary**.

The findings below are deeper block-context defects in the new structural scanner. They do not mean
round 8 made no progress.

## Findings

### K10-R8-01 — P2 — a fence opened immediately after a table body is processed twice and can turn literal code into a further table

**Affected:** `tests/conformance/architecture/inventory-oracle.ts`, `sectionTables`; K1.0-C4's claim
that fenced code is skipped and that only rendered table assertions enter the keyed relation oracle.

The new scanner shares `parseFenceCandidate`/`updateFence`, but `sectionTables` has an inconsistent
state transition at a fence that terminates an already-open table body:

```ts
if (parseFenceCandidate(bodyLine) !== undefined) {
  fence = updateFence(fence, bodyLine);
  break;
}
...
tables.push({ header: headerCells, body });
continue;
```

`i` is not advanced when that fence line is consumed in the body loop. The outer loop therefore sees
**the same line again** with `fence !== null` and calls `updateFence(fence, line)` a second time. For a
bare opening fence such as ````` ``` ````` the second visit satisfies the closing-fence condition, so
the opener closes itself. The following literal code lines are then scanned as ordinary Markdown.

A distinguishing mutation after the final real Zones body row is:

```markdown
| `host-sdk` | `packages/sdk/src` | Application bootstrap and host composition. |
```
| Zone id | Roots | Owner and status |
|---|---|---|
| `target-kernel` | `packages/core/src` | this is code, not an inventory row |
```
```

GFM §4.5 says the content after an opening fence remains literal until a matching closing fence.
The table-looking lines above therefore assert **no Zones table at all**. The committed scanner,
however, opens the first fence in the body loop, immediately closes it by reprocessing the same line,
and can discover the three code lines as a second table. `readKeyedTable` then reports that further
table, making a valid document fail C4.

The validation-08 silent-exit audit's case 2e does not distinguish this bug: it places only one
row-shaped line inside the bare fence, with no delimiter row, so even after the fence is accidentally
self-closed there is no complete table for discovery to recognize. Its green result therefore does
not prove that fenced table-shaped code is skipped.

**Impact:** C4 can manufacture a disagreement from literal fenced code. This is the opposite direction
of the earlier fail-open bugs, but it still violates the contract's GFM reading and makes the drift
oracle reject a valid inventory artifact.

**Required outcome:** make fence transitions single-consumption and state-consistent across section
selection and table discovery. A fence line that terminates a table body must not be processed again
as a second transition. Add a production-parser control containing a **complete table** inside a bare
fenced block immediately after a real table body and require the C4 relation to remain green. Also
retain the existing closed-fence, info-string, mismatched-closer and unclosed-fence behaviors as
applicable. Do not weaken the further-table rule for actual Markdown tables.

### K10-R8-02 — P2 — section heading recognition ignores GFM raw-HTML block context and can still truncate on non-heading bytes

**Reopens:** only the broader structural-section invariant around K10-R7-01, not its corrected
prose/inline/fenced-code cases.  
**Affected:** `tests/conformance/architecture/inventory-oracle.ts`, `sectionLines` / block-state
recognition; K1.0-C4's claim that section membership is structural and that only a real ATX heading
can start/end a governed section.

`sectionLines` tracks only `FenceState`. Outside a fence it calls `parseAtxHeading(line)` directly.
It does not track GFM raw-HTML blocks. GFM §4.6 defines HTML blocks as raw lines and explicitly says
material inside such a block that might otherwise be recognized as a block start is ignored by the
Markdown parser until that HTML block's end condition.

A simple type-1 counterexample is:

```markdown
| `host-sdk` | `packages/sdk/src` | Application bootstrap and host composition. |

<script>
## Current cross-boundary dependencies
</script>

| Zone id | Roots | Owner and status |
|---|---|---|
| `target-kernel` | `packages/core/src` | stale contradictory further table |

## Current cross-boundary dependencies
```

Under GFM, `<script>` opens a raw HTML block and `</script>` closes it; the intervening
`## Current cross-boundary dependencies` line is raw HTML content, **not** an ATX heading. The
contradictory table after the HTML block therefore remains inside the real `## Zones` section and
must be reported as a further table.

The committed scanner instead sees that inner line while `fence === null`, parses it as the exact
expected next L2 heading, and ends the Zones section there. The contradictory table that follows is
excluded before table discovery, leaving the first correct table capable of keeping C4 green.

**Impact:** a valid GFM block context still supplies a silent section-boundary escape. The checked-in
inventory contains no raw-HTML block, so this is a drift-oracle/proof defect rather than evidence the
current ownership rows are factually wrong.

**Required outcome:** account for block contexts in which heading-looking source lines are not ATX
headings, or fail closed when such a context appears inside a governed section. A full general-purpose
Markdown parser is not automatically required; a bounded scanner may track/refuse the relevant raw
HTML block forms if the contract states that policy truthfully. Add at least one production-parser
control with an exact next-heading line inside a GFM raw-HTML block followed by a contradictory table
before the real next heading. Preserve all round-8 fence/ATX controls and exact-title section
identities.

## Validation and evidence assessment

I inspected validation-08's manifest, targeted raw suite logs and the round-8 distinguishing/audit
records. They bind to clean payload C `b8037aa02f76716d09293fb236e51bf3da9282fb`, Node v25.2.1 /
npm 11.6.2 / TypeScript 5.9.3 / Darwin 25.6.0 arm64, and record:

- `npm run typecheck`: exit 0;
- `npm test`: 1937/1937, 287 suites, zero fail/skipped;
- `npm run test:conformance`: 1824/1824, 268 suites, zero fail/skipped;
- builder-docs: 26 Markdown files / 284 links or anchors / 38 public package imports;
- target-kernel: 4/4; SDK: 22/22;
- the K10-R7-01 demonstration: 11 cases, five newly distinguishing, zero reported regressions;
- the silent-exit audit: the recorded heading-context matrix and downstream parser branches;
- `tests/conformance/k0`: byte-identical to base.

The full-suite and conformance raw logs independently show the stated 1937/1937 and 1824/1824
summaries. These logs are credible for the cases run. They do not distinguish K10-R8-01 because the
fenced-code audit uses an incomplete one-row pseudo-table, and they do not distinguish K10-R8-02
because no raw-HTML block context is exercised.

`npm run test:evals` was not run; that remains an appropriate exclusion because K1.0 changes no
Agent/model-facing behavior and makes no eval-dependent claim.

## Per-criterion verdicts

| Criterion | Verdict | Independent basis |
|---|---|---|
| **K1.0-C1** | **PASS** | Target source and the accepted scanner/graph enforcement remain unchanged; round 8 introduces no target dependency. |
| **K1.0-C2** | **PASS** | The round-3 forbidden-edge reconstruction and representative controls remain intact; round 8 changes only C4 parsing evidence. |
| **K1.0-C3** | **PASS** | Clean-C typecheck/full-suite evidence is green at 1937/1937; the correction moves no legacy source and changes no public export. |
| **K1.0-C4** | **FAIL** | Raw substring section selection is fixed, but block-context handling is still unsound in two directions: a body-ending fence can be processed twice and literal code can become a table; raw-HTML contents can be mistaken for a real next heading and hide a later table. See K10-R8-01/-02. |
| **K1.0-C5** | **PASS** | The twelve current deferrals remain assigned to concrete packet owners; no assignment changed or became unresolved. |
| **K1.0-C6** | **PASS** | Target package remains private and refusal-only; no protocol implementation, no-op API, E1 success or release claim is introduced. |
| **K1.0-C7** | **PASS** | Legacy regressions and the accepted dependency scanner reconstruction are untouched; the conformance suite remains green. |
| **K1.0-C8** | **PASS** | Benchmark E1 preparation remains at the same unaccepted C2/H2 identities and K1.0 still claims no E1 result. |
| **K1.0-C9** | **PASS** | Dependency-extraction/prose-soundness evidence is unchanged; the documented repository-source count is reconciled to 326. |

No packet criterion is left unexamined. No architecture ambiguity or unavailable mandatory evidence
blocks correction; both findings are deterministic same-packet C4 oracle defects.

## Verdict and correction handoff

**Required packet status for transcription:** `CHANGES_REQUESTED`.

Round 8 makes substantive progress: it closes the round-7 textual section-boundary defect, replaces
prefix identities with exact structural headings, and adds useful neighboring controls. It cannot yet
be accepted because the new block scanner does not maintain one coherent Markdown block state across
section and table discovery.

```text
Correct the same released packet K1.0 on codex/k1.0-target-boundary-legacy-quarantine.
Base c9a9ed7e6e538ab0542fc6a999426264abb6212a; reviewed H 065e864a796da6195ceca1d489201d2d687f7b8d;
review record docs/development/work/K1.0/review-08.md.
Open findings K10-R8-01 and K10-R8-02; required outcomes and counterexamples are in that record.
Owner supplemental decisions none; unresolved authority none.
Apply 006/012 at C4's shared Markdown block scanner: make block-state transitions single-consumption
and ensure non-Markdown block contents cannot become headings/tables. Preserve exact structural section
identities, structural header/body classification, GFM row discovery, key-before-value semantics,
relational comparisons, scanner reconstruction and evidence correction. Re-review the cumulative packet
and record any additional in-scope defect separately.
Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.
```

CHANGES REQUIRED
