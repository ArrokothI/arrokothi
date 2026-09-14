# K1.0 independent review — round 6

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-13  
**Role:** accountable independent reviewer; I did not implement this candidate.

## Candidate binding and access

This review binds only to submitted candidate H:

- governing process / review base: `c9a9ed7e6e538ab0542fc6a999426264abb6212a`;
- previous reviewed H5: `2b274e6ecbaa8cdcc4600d8574234fc027c2b37e`;
- round-5 review record: `docs/development/work/K1.0/review-05.md`, recorded by
  `86fbd8423bf6fbfda1febcab6a9d3c59f0115f4b`;
- clean round-6 payload C: `459be4e51370ebb8e859a46b29a966944bbd755a`;
- submitted round-6 H: `5dd570002c082872914291ef0b3cc244bf9bc205`;
- branch: `codex/k1.0-target-boundary-legacy-quarantine`.

At review start the advertised branch SHA was exactly H and advertised `main` remained exactly the
recorded base. I inspected the pinned repository through the authorized GitHub connector, including
AGENTS.md, 006/007/008/012/013 at the governing base, review-05, contract revision 6, the complete
round-6 correction delta, the cumulative base-to-C file set, the affected C4 oracle/tests,
implementation-06 and validation-06. I also checked the published GitHub Flavored Markdown table
specification (`https://github.github.com/gfm/#tables-extension-`) because the corrected subsystem
claims to derive row discovery from GFM. I rechecked the benchmark E1 preparation branch read-only;
it remains at H2 `8de04779d279dba82cf834d419e465d2b677ef46`, parent C2
`d8f17549c31f9ee5d995e773c2f211faed2785fb`, accepted by nobody.

I do **not** have a local executable checkout of either repository in this review session, so I did
not independently rerun the full typecheck/test/conformance commands. I inspected the immutable
clean-C logs, the committed distinguishing demonstration and the source/tests that implement the
claimed oracle. The blocking counterexample below follows directly from the committed control flow
and GFM's rule that data cells contain arbitrary inline text; it does not depend on an unobserved
command.

Identity / interval verification:

- H5 is followed by exactly one immutable round-5 review-record commit, `86fbd842…`, adding only
  `review-05.md`;
- `86fbd842…` → C is exactly one correction payload commit touching only contract revision 6,
  `inventory-oracle.ts`, and `kernel-landing-zone.test.ts`;
- H's parent is exactly C;
- C → H is exactly one report/evidence/status commit containing implementation-06,
  validation-06's manifest/eight logs and matching 001/007/README status summaries; no source,
  test, fixture, evaluator, threshold, package or configuration payload first appears in H;
- base → C remains the cumulative K1.0 history; no unrelated packet payload appears in the changed
  file set;
- `tests/conformance/k0` is recorded byte-identical to the governing base.

## Independent coverage and prior-finding disposition

I repeated cumulative coverage rather than limiting review to the latest Markdown spelling:

1. **C1 ↔ C2 ↔ C9:** preserve the accepted dependency-extraction reconstruction, transitive guard,
   forbidden-edge controls and prose-soundness distinction.
2. **C3 ↔ C6 ↔ C7:** preserve current legacy/public behavior, refusal-only target scaffolding and
   retained regressions while C4 evidence machinery changes.
3. **C4 ↔ C5:** the human ownership/export/dependency inventory must agree with executable policy,
   and every candidate row inside a governed table must be classified without a silent escape before
   the relational oracle can inspect it.
4. **C8:** benchmark E1 preparation remains pinned, external and explicitly unaccepted.
5. **Evidence/process:** exact C/H scope and clean-C validation evidence must remain inspectable and
   truthful; report/evidence attachments must not conceal payload changes.

### K10-R5-01 disposition — exact edge-pipe finding CLOSED

The round-5 counterexample is genuinely fixed. `tableRows` no longer requires cosmetic leading and
trailing pipes. It identifies a GFM-style header/delimiter pair, splits only on unescaped pipes,
recognizes alignment colons, carries pipe-less body continuation lines into the shared reader and
stops at the represented table-break forms. This is consistent with the relevant published GFM
examples: edge pipes may be inconsistent (199), escaped pipes remain cell content (200), a pipe-less
body continuation remains a table row (202), header/delimiter cell counts must match (203), and body
row cardinality may vary (204).

The committed controls materially distinguish the old and new front doors: all 24 combinations of
four governed tables × omitted trailing/leading/both edge pipes × before/after the correct row are
silent under the quoted H5 discovery helper and are reported by the committed production parser.
The adjacent pipe-less, alignment-delimiter, edge-less header/delimiter and escaped-pipe challengers
also exercise the production parser rather than a copied test-only parser.

So **K10-R5-01 is CLOSED at its stated counterexample and row-discovery boundary**. The finding below
is a different silent path after discovery, inside the shared reader's header/body classification.

## Finding

### K10-R6-01 — P2 — body rows whose first cell equals the header label are silently discarded as headers

**Reopens:** only C4's claimed total-row accounting invariant, not K10-R5-01's GFM edge-pipe fix.  
**Affected:** `tests/conformance/architecture/inventory-oracle.ts`, `readKeyedTable`; all four keyed
C4 relations; K1.0-C4 and revision 6's claim that every candidate body row reaches one observable
outcome.

Round 6 correctly reconstructs which lines belong to the table, but `readKeyedTable` still decides
whether a discovered row is the header by comparing the first cell's **text**:

```ts
for (const cells of rows) {
  if (cells[0] === spec.headerFirstCell) continue;
  const key = spec.keyOf(cells);
  ...
}
```

The accompanying contract/comment says the actual header row is the only row allowed to be skipped
silently. The code cannot enforce that distinction: any later body row whose first cell happens to
contain the same text is skipped by the same branch.

A distinguishing mutation of the real Zones table is:

```markdown
| Zone id | Roots | Owner and status |
|---|---|---|
| Zone id | `packages/core/src` | stale contradictory body row |
| `target-kernel` | `packages/kernel/src` | New Kernel work ... |
| `legacy-core` | `packages/core/src` | ... |
| `runtime-integrations` | ... | ... |
| `host-sdk` | `packages/sdk/src` | ... |
```

GFM permits arbitrary inline text in body cells, so the third line above is an ordinary table body
row. Round 6's rebuilt `tableRows` correctly returns it. `readKeyedTable`, however, sees
`cells[0] === "Zone id"` and executes `continue` before `keyOf`, duplicate detection or the
`unreadable` channel. The four legitimate rows then populate the exact expected relation, so the
extra body assertion can disappear with `unreadable === []` and the ownership comparison otherwise
green.

The same content-based escape exists in every keyed table because the shared reader is configured
with these header labels:

- Zones: `Zone id`;
- Deferred extraction: `Id`;
- Export ownership: `Package`;
- Cross-boundary dependencies: `Zone`.

A later body row beginning with the corresponding label is silently skipped rather than classified as
an unreadable row. Edge-pipe presence is irrelevant; the new GFM front door now discovers these rows
correctly, then the reader erases them by value.

**Impact:** C4 can still report agreement while the rendered human inventory contains an additional
invalid or contradictory body row. The checked-in inventory contains no such row; this is again a
defect in the executable drift oracle and in revision 6's total-accounting proof, not evidence that
the current four real relations are factually wrong.

**Required outcome:** distinguish the structurally recognized header from body rows structurally, not
by cell value. The actual header may be omitted from the body-row stream, tagged as a header, or
skipped by its unique structural position; but after that point **no later row may escape because its
content equals a header label**. A body row beginning `Zone id`, `Id`, `Package` or `Zone` must reach
normal key/unreadable accounting. Add production-parser controls that place a header-label body row
inside each of the four governed tables (including before/after an otherwise correct keyed row where
useful) while keeping the real header accepted and the round-6 GFM edge/escaped/pipe-less controls
green. Preserve the accepted relational comparisons, key-before-value/seen-before-parse semantics,
scanner reconstruction and evidence-record correction.

No owner semantic decision is required. This is an ordinary same-packet proof/oracle correction.

## Validation and evidence assessment

I inspected validation-06's manifest, targeted raw suite logs and the round-6 distinguishing log.
They bind to clean payload C `459be4e51370ebb8e859a46b29a966944bbd755a`, Node v25.2.1 / npm 11.6.2 /
TypeScript 5.9.3 / Darwin 25.6.0, and record:

- `npm run typecheck`: exit 0;
- `npm test`: 1905/1905, 285 suites, zero fail/skipped;
- `npm run test:conformance`: 1792/1792, 266 suites, zero fail/skipped;
- builder-docs: 26 Markdown files / 284 links or anchors / 38 public package imports;
- target-kernel: 4/4; SDK: 22/22;
- architecture suite: 199 → 205 cases;
- `tests/conformance/k0`: byte-identical to base;
- all 24 omitted-edge variants are H5-silent / committed-reported;
- the pipe-less challenger is H5-silent / committed-unreadable;
- the unmutated inventory is green.

The eight SHA-256 tokens in the round-6 manifest are structurally valid 64-character hexadecimal
values; I did not independently recompute every attachment digest in this no-checkout session. The
raw attachments themselves are available and the targeted logs inspected are consistent with the
manifest. I found no evidence-record defect analogous to K10-R4-02.

These logs are credible for the cases run. They do not distinguish K10-R6-01 because every committed
body mutation uses a real key in the first cell; none tests the reader's content-based header skip.
Green tests therefore cannot establish the stronger statement that the **actual header** is the only
row skipped silently.

`npm run test:evals` was not run; that remains an appropriate exclusion because K1.0 changes no
Agent/model-facing behavior and makes no eval-dependent claim.

Non-blocking documentation note: contract revision 6's C3 row still says `1899 tests pass` while the
same revision's change note, implementation-06 and validation-06 correctly record 1905. The current
suite is green and no behavior criterion depends on that stale exact count, so I do not fail C3 for
it; reconcile the number during the required correction.

## Per-criterion verdicts

| Criterion | Verdict | Independent basis |
|---|---|---|
| **K1.0-C1** | **PASS** | The target source and accepted scanner/graph enforcement remain unchanged; round 6 introduces no target dependency. |
| **K1.0-C2** | **PASS** | The round-3 forbidden-edge reconstruction and representative controls remain intact; round 6 changes only C4 parsing evidence. |
| **K1.0-C3** | **PASS** | Clean-C typecheck/full-suite evidence is green at 1905/1905; the correction moves no legacy source and changes no public export. |
| **K1.0-C4** | **FAIL** | GFM row discovery now closes K10-R5-01, but a discovered body row can still be silently discarded when its first-cell text equals the configured header label. See K10-R6-01. |
| **K1.0-C5** | **PASS** | The twelve current deferrals remain assigned to concrete packet owners; no assignment changed or became unresolved. |
| **K1.0-C6** | **PASS** | Target package remains private and refusal-only; no protocol implementation, no-op API, E1 success or release claim is introduced. |
| **K1.0-C7** | **PASS** | Legacy regressions and the accepted scanner reconstruction are untouched; the full conformance suite remains green. |
| **K1.0-C8** | **PASS** | Benchmark E1 preparation remains at the same unaccepted C2/H2 identities and K1.0 still claims no E1 result. |
| **K1.0-C9** | **PASS** | Dependency-extraction/prose-soundness evidence is unchanged; no new scanner bypass was found in the cumulative pass. |

No packet criterion is left unexamined. No architecture ambiguity or unavailable mandatory evidence
blocks correction; K10-R6-01 is a narrow deterministic C4 oracle defect.

## Verdict and correction handoff

**Required packet status for transcription:** `CHANGES_REQUESTED`.

Round 6 genuinely closes the round-5 GFM edge-pipe/front-door finding and improves the subsystem
substantially. It cannot yet be accepted because the reader still identifies the header by content,
which gives an ordinary body row a silent path around the exact total-accounting invariant C4 claims.

```text
Correct the same released packet K1.0 on codex/k1.0-target-boundary-legacy-quarantine.
Base c9a9ed7e6e538ab0542fc6a999426264abb6212a; reviewed H 5dd570002c082872914291ef0b3cc244bf9bc205;
review record docs/development/work/K1.0/review-06.md.
Open finding K10-R6-01; required outcome and counterexample are in that record.
Owner supplemental decisions none; unresolved authority none.
Apply 006/012 narrowly at C4's header/body classification boundary: make header identity structural,
then re-review the cumulative packet. Preserve the accepted GFM row discovery, key-before-value
reader semantics, relational comparisons, scanner reconstruction and evidence correction.
Fix any additional in-scope defect with separate provenance.
Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.
```

CHANGES REQUIRED
