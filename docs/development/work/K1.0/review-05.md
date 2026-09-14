# K1.0 independent review — round 5

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-13  
**Role:** accountable independent reviewer; I did not implement this candidate.

## Candidate binding and access

This review binds only to submitted candidate H:

- governing process / review base: `c9a9ed7e6e538ab0542fc6a999426264abb6212a`;
- previous reviewed H4: `14cc1c1997573ac434b2491653ab4cb974abf633`;
- round-4 review record: `docs/development/work/K1.0/review-04.md`, recorded by
  `a9775ab13f6a5a8b465c1f390a7cd6e81cad8a61`;
- clean round-5 payload C: `6fd225e0115d6b91bd5088e22d41d137088d9688`;
- submitted round-5 H: `2b274e6ecbaa8cdcc4600d8574234fc027c2b37e`;
- branch: `codex/k1.0-target-boundary-legacy-quarantine`.

At review start the advertised branch SHA was exactly H and advertised `main` remained exactly the
recorded base. I inspected the pinned repository through the authorized GitHub connector, including
review-04, contract revision 5, both round-5 correction commits, the affected C4 parser/tests, the new
evidence-record guard, the corrected validation-04 manifest, implementation-05 and validation-05.
I rechecked the benchmark E1 preparation branch read-only; it remains at H2
`8de04779d279dba82cf834d419e465d2b677ef46`, parent C2
`d8f17549c31f9ee5d995e773c2f211faed2785fb`, accepted by nobody.

I do **not** have a local executable checkout of either repository in this review session, so I did
not independently rerun the full typecheck/test/conformance commands. I inspected their immutable
clean-C logs and the committed source/tests. I also checked the GitHub Flavored Markdown table syntax
against the published GFM specification (`https://github.github.com/gfm/#tables-extension`) because
the blocking counterexample below depends on whether an omitted edge pipe is still a table row. GFM
states that leading/trailing pipes are recommended, not required, and gives a table whose body row has
neither edge pipe.

Identity / interval verification:

- H4 is followed by exactly one round-4 review-record commit, `a9775ab…`;
- `a9775ab…` → C is exactly two correction payload commits: `bbc9a9df…` for K10-R4-01/
  K10-R4-02 plus adjacent self-find K1.0-SELF-08, then `6fd225e0…` for K1.0-SELF-09 found during
  validation capture;
- that correction interval touches only the K1.0 contract/evidence record and architecture
  oracle/test files needed by those corrections; no unrelated packet payload appears;
- H's parent is exactly C;
- C → H is exactly one report/evidence/status commit containing implementation-05,
  validation-05's manifest and nine logs, and matching 001/007/README status summaries; no source,
  test, fixture, evaluator, threshold, package or configuration payload first appears in H;
- `tests/conformance/k0` is recorded byte-identical to the governing base.

## Independent coverage and prior-finding disposition

I repeated cumulative coverage rather than limiting review to the two round-4 findings:

1. **C1 ↔ C2 ↔ C9:** preserve the accepted scanner reconstruction, transitive guard and prose
   soundness.
2. **C3 ↔ C6 ↔ C7:** preserve legacy/public behavior and retained regressions while the correction
   changes only architecture evidence machinery.
3. **C4 ↔ C5:** the human inventory and executable policy must agree as relations, and malformed or
   contradictory table content must not disappear before the relation oracle can see it.
4. **C8:** E1 preparation remains pinned, external and unaccepted.
5. **Evidence/process:** historical validation identities corrected after review must be superseded
   truthfully and new candidate evidence must remain auditable.

### K10-R4-01 disposition — exact finding CLOSED, broader total-row claim still open

The round-4 parse-before-uniqueness counterexample is genuinely fixed. All four keyed relations now
share `readKeyedTable`; the key is extracted and marked seen before `valueOf` parses the remaining
cells. A recognizable keyed row with `not-a-count` or a missing later cell therefore becomes either
an unreadable first row plus a duplicate later row, or a duplicate after an already recorded row.
K1.0-SELF-08 is likewise closed for short rows that actually reach this shared reader.

However, the parser has another front door before `readKeyedTable`: `tableRows`. That helper only
returns lines whose trimmed form both starts **and ends** with `|`. A valid GFM data row may omit one
or both edge pipes, so such a row never reaches the supposedly total keyed reader. This is the
finding below.

### K10-R4-02 disposition — CLOSED

The validation-04 SDK-log identity defect is corrected as a superseding record rather than by erasing
history. The original 52-character value remains visible, while the correction section records the
64-character SHA-256
`dd227f9ffd8ab92b4e77570cd9ea294559dbbbad00b172e3bb575a7f1cad1470` and identifies the unchanged
`07-test-sdk.log`. The clean-C full suite includes `evidence-records.test.ts`; that test recomputes the
actual log digests for manifested settled rounds and accepts a historical wrong row only when a
correction section names that file and actual digest. The round-5 audit separately checks all 36
rounds-1–4 rows and finds the same single historical defect. This is sufficient to close K10-R4-02.

The round-5 manifest itself is an H attachment and therefore was not present during the clean-C
capture; its nine recorded digest tokens are structurally valid 64-character values and I found no
contrary evidence in the pinned attachments. No separate evidence-record finding is opened.

## Finding

### K10-R5-01 — P2 — the “total” C4 parser silently ignores valid GFM rows that omit an edge pipe

**Reopens:** the row-accounting portion of K10-R4-01 / K10-R3-01 / K10-R2-02 at the C4 evidence
invariant. The round-5 key-before-value logic itself is correct.  
**Affected:** `tests/conformance/architecture/inventory-oracle.ts` `tableRows`; all four keyed C4
relations that consume it; K1.0-C4 and revision-5's claim that every candidate data row is recorded,
duplicate, or unreadable.

`tableRows` currently does this before any key extraction:

```ts
const trimmed = line.trim();
if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) continue;
```

So the shared `readKeyedTable` can be total only over the subset of lines `tableRows` chooses to
return. GitHub Flavored Markdown does not require table rows to have leading/trailing pipes: the GFM
table specification says they are recommended for clarity, and its Example 199 deliberately mixes
rows with and without edge pipes.

A distinguishing mutation of the real Zones table is therefore:

```markdown
| Zone id | Roots | Owner and status |
|---|---|---|
| `target-kernel` | `packages/core/src` | stale contradictory duplicate
| `target-kernel` | `packages/kernel/src` | New Kernel work ... |
```

The first data line is still a valid GFM table row, but because it lacks the final `|`, `tableRows`
silently skips it. The correct second row reaches `readKeyedTable`, so `target-kernel` is recorded with
its correct root, `unreadable` remains empty for the skipped row, and the relation comparison can stay
green. The same front door is shared by Deferred, Export and cross-boundary Dependency parsing, so
moving all four relations behind one keyed reader did not close this omission.

This is not a formatting preference. The artifact under review is a Markdown inventory rendered under
GFM semantics, and revision 5 expressly claims **total** accounting of every candidate data row and
forbids a row with an absent cell from disappearing. A syntactically valid Markdown row carrying a
recognizable key cannot be outside that claim merely because it omits a recommended edge delimiter.

**Impact:** C4 can still report agreement while the human-readable inventory contains a contradictory
ownership/export/dependency assertion that GitHub renders as part of the table. The checked-in
inventory currently uses edge pipes consistently; the defect is in the executable drift evidence and
its stated totality claim.

**Required outcome:** make row discovery consistent with the Markdown table syntax the document uses,
or otherwise fail closed on row-shaped content inside each governed table section before it can be
silently skipped. Add distinguishing controls for a recognizable contradictory row with an omitted
trailing pipe (and preferably the symmetric omitted-leading-pipe form) before/after the correct row.
Preserve `readKeyedTable`'s key-before-value rule, the accepted relational comparisons, and the
historical evidence correction. No owner semantic decision or scanner redesign is required.

## Validation and evidence assessment

I inspected validation-05's manifest and targeted raw/demonstration records. They bind to clean C
`6fd225e0115d6b91bd5088e22d41d137088d9688` on Node v25.2.1 / npm 11.6.2 /
TypeScript 5.9.3 and record:

- `npm run typecheck`: exit 0;
- `npm test`: 1899/1899, 285 suites, zero fail/skipped;
- `npm run test:conformance`: 1786/1786, 266 suites, zero fail/skipped;
- builder-docs: 26 Markdown files / 284 links or anchors / 38 public package imports;
- target-kernel: 4/4; SDK: 22/22;
- architecture suite: 199 cases;
- `tests/conformance/k0`: byte-identical to base;
- round-4 malformed keyed dependency rows: old helper 0 complaints, committed parser 2/1 depending
  order; no-key row 0 → 1; retained well-formed duplicate controls unchanged;
- all 36 manifest digests from validation-01 through validation-04 audited, with only the already
  corrected validation-04 SDK identity defective in its historical row.

These logs are credible for the exact controls run. They do not distinguish K10-R5-01 because all of
the committed mutation strings still use both edge pipes and therefore enter `tableRows`. Green tests
cannot establish the stronger totality claim against a line the parser discards before the tested
logic.

`npm run test:evals` was not run; that remains an appropriate exclusion because K1.0 changes no
Agent/model-facing behavior and claims no such evidence.

## Per-criterion verdicts

| Criterion | Verdict | Independent basis |
|---|---|---|
| **K1.0-C1** | **PASS** | Target source and the accepted scanner/graph enforcement remain unchanged; no new target dependency is introduced. |
| **K1.0-C2** | **PASS** | The round-3 forbidden-edge reconstruction and controls remain intact; round 5 changes only C4/evidence machinery. |
| **K1.0-C3** | **PASS** | Clean-C suite/typecheck evidence is green; no legacy source/public export change is in the correction interval. |
| **K1.0-C4** | **FAIL** | Key-before-value parsing closes the round-4 malformed-cell bypass, but `tableRows` silently excludes valid GFM table rows without edge pipes before total accounting begins. See K10-R5-01. |
| **K1.0-C5** | **PASS** | The twelve actual current deferrals remain concretely assigned; no current assignment defect was found. |
| **K1.0-C6** | **PASS** | Target package remains private and refusal-only; no protocol implementation, no-op API, E1 success or package-release claim appears. |
| **K1.0-C7** | **PASS** | Legacy regressions/scanner behavior are untouched by round 5 and the retained assertion subjects remain present. |
| **K1.0-C8** | **PASS** | Benchmark E1 preparation remains at the same unaccepted C2/H2 identities and K1.0 claims no E1 result. |
| **K1.0-C9** | **PASS** | The accepted dependency-extraction/prose-soundness reconstruction is unchanged and no new scanner bypass was found. |

No packet criterion is left unexamined. No architecture ambiguity or unavailable mandatory evidence
prevents correction; K10-R5-01 is an ordinary same-packet C4 oracle/evidence defect.

## Verdict and correction handoff

**Required packet status for transcription:** `CHANGES_REQUESTED`.

Round 5 closes both findings from review-04 at their exact counterexamples and materially improves the
shared parser. It cannot yet be accepted because the claimed total row-accounting invariant still has
a front-door omission for valid GFM table rows before the shared reader runs.

```text
Correct the same released packet K1.0 on codex/k1.0-target-boundary-legacy-quarantine.
Base c9a9ed7e6e538ab0542fc6a999426264abb6212a; reviewed H 2b274e6ecbaa8cdcc4600d8574234fc027c2b37e;
review record docs/development/work/K1.0/review-05.md.
Open finding K10-R5-01; required outcome and counterexample are in that record.
Owner supplemental decisions none; unresolved authority none.
Apply 006/012 narrowly at C4's row-discovery front door: account for GFM-valid rows with omitted edge
pipes before keyed relation parsing, then re-review the cumulative packet. Preserve the accepted
key-before-value reader, relational comparisons, scanner reconstruction and evidence correction.
Fix any additional in-scope defect with separate provenance.
Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.
```

CHANGES REQUIRED
