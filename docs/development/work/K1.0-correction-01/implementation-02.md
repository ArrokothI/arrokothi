# Implementation report — K1.0-correction-01, round 2

## Identity

- **Packet:** K1.0-correction-01, a bounded correction of the released packet K1.0; parent milestone
  K1. **Contract:** [K1.0-correction-01/contract.md](contract.md) revision 2, which adopts
  [K1.0's contract](../K1.0/contract.md) — now **revision 18** — and its criteria C1–C9 unchanged.
  **Governing process baseline:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
- **State:** `WAITING_FOR_REVIEW`. Accepted by nobody. K1.0's historical ACCEPT is preserved and its
  use for C4 claims, integration and dependent release remains **held** until this correction is
  independently reviewed. Owner release of K1.0 and the E1-preparation exception are unchanged and
  recorded in [K1.0's contract](../K1.0/contract.md#release-provenance-and-the-e1-dependency-decision).
  Prerequisite: K0.2 ACCEPT `90a6f37eaeb61009025449a1abc7e6d31dc1dbb2`, integrated
  `0535160e677231da41b06d9f822e62e2f0364dd1` ([receipt](../K0.2/integration-01.md)).
- **Branch:** `codex/k1.0-target-boundary-legacy-quarantine`. **Configured remote:** `origin`,
  `https://github.com/ArrokothI/arrokothi.git`. **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`
  (still exactly remote `main`). **Payload C:** `36460438e95e968beec0b354b07a616b53981256`.
  **Parent of C:** `2d50fa3b3d7e23b01823f6d93e80952f70c0c5cc`, the round-1 independent review record.
- **Prior round and its record:** round-1 clean payload C `76ce938074ffa910fbd74374e388ba8d226af4c6`,
  candidate H `61133e9c8fd6fc80c6995fd26495e11e9f7f2e57`, independently reviewed in
  [review-01](review-01.md) (OpenAI GPT-5.6 Sol (High), 2026-09-13): C1–C3 and C5–C9 PASS, **C4 FAIL**,
  verdict **CHANGES REQUIRED** on the new finding **K10-CORR1-R1-01** (P2, C4). Round 1 had closed
  K10-CLEANUP-01's four decoder defects; the review showed its SELF-29 arity closure still trusted
  the document's own header. Work resumed as IN_PROGRESS under that review; no successor packet was
  created and K1.1 was not implemented.
- **Prior candidate and its record:** H `f3aa29d7ecba2a23aa85788b7efdebdd383cab24` over clean payload
  C `d693d59aefe5335c8950d57cec6d6b57e375cadc`, independently **ACCEPTED** by
  [review-17](../K1.0/review-17.md) at A `36595f57d1f8cec8c4bf8a6293e888ca27750fab`. That ACCEPT is
  preserved verbatim. The reopening is the owner-delegated cleanup finding **K10-CLEANUP-01**
  recorded in [cleanup-01](../K1.0/cleanup-01.md), not a reviewer finding.
- **Candidate H:** the commit containing this report. Its full SHA cannot be named from inside it;
  the external handoff supplies it and the verified advertised remote SHA.
- **Exact C..H administrative file allowlist** (15 files, nothing else):
  - `docs/development/work/K1.0-correction-01/implementation-02.md` (this report)
  - `docs/development/work/K1.0-correction-01/validation-02/MANIFEST.md` and its ten `.log`
    attachments, declared output-only under 006
  - `docs/development/007-work-packets.md`, `docs/development/001-current-status-and-roadmap.md`
    and `docs/development/README.md` — status transcription only, no substantive change
- **Working tree:** clean at C, and clean at H apart from the validation directory this run writes,
  which is then committed in H. **Push:** performed after H; the advertised remote SHA is verified
  and reported in the external handoff, never claimed by this file.

## Changes and coverage

### Change groups and cumulative diff

Correction delta `2d50fa3..C`: **4 files changed, 478 insertions(+), 39 deletions(-)**.

| File | Lines | What changed |
|---|---|---|
| `tests/conformance/architecture/inventory-oracle.ts` | 139 | The table-schema ownership layer: `RowSpec.expectedHeader` + `ungovernedTrailing` replace `expectedHeaderFirstCell`; header and body arity are each judged against the fixed schema; `valueOf` receives only the governed prefix |
| `tests/conformance/architecture/kernel-landing-zone.test.ts` | 298 | One new control block, `governed table schemas own their arity (K10-CORR1-R1-01)`, 7 tests |
| `docs/development/work/K1.0/contract.md` | 46 | Revision 18: the schema-ownership invariant, the derivation, supersede notes on revision 17's header-derived sentences, live C4/C3/C7 row reconciliation |
| `docs/development/work/K1.0-correction-01/contract.md` | 34 | Revision 2: round-1 history, the K10-CORR1-R1-01 scope, the schema-ownership requirement, round-2 evidence map |

Cumulative `base..C`: **236 files changed, 117 749 insertions(+), 39 deletions(-)**. No legacy
production, provider, SDK, example, script, benchmark or configuration path is touched by this
correction or by the packet; `tests/conformance/k0` is byte-identical to base.

**Ownership.** This is entirely C4 evidence machinery. It is not Kernel semantics, not an Execution
Runtime concern and not a deployment concern: `inventory-oracle.ts` is a conformance-test oracle that
reads a documentation file and compares the relations it asserts against the executable policy and
the real manifests. Governing sources: [K1.0-C4](../K1.0/contract.md#acceptance-criteria); the
inventory document's own headers, which supply the schemas' spellings; [006](../../006-development-process.md)
for the correction lifecycle; [012](../../012-review-methods.md) for semantic correction closure.

### Selected 012 methods

- **Semantic correction closure** — the four steps below, applied to the whole affected path rather
  than to the reported five-column example.
- **Whole-observable checking** — the finding was invisible to round-1 controls because the 89-cell
  oracle inspected decoded *cells* while the defect sits *before* any decoder runs: the ignored fifth
  cell never reaches one. Each new control reads the header verdict and the recorded relation, through
  a production entry point, on the real document; the reworked audit checks loudness *and* the full
  recorded relation on every document, including loud ones.
- **Deterministic execution** — every control is a pure function of document text; no clock, no
  network, no ordering dependence.
- **Materially excluded:** provider/native Driver fidelity, durability, isolation, packaging and E1.
  None is reachable from this diff, and none is claimed.

### Semantic correction closure

**1. The changed invariant.** Before (round 1): a body row is excess when it carries more cells than
*its header declares*, and a header is valid when its first cell matches. Neither statement binds the
table to anything the document did not write, so widening the header widened what the oracle tolerates.
After: **every governed table has an independent schema, and no document-controlled width is
trusted.** `RowSpec.expectedHeader` states the exact header — arity and every label, including the
labels of deliberately ungoverned prose positions — and `RowSpec.ungovernedTrailing` declares how many
trailing positions are prose withheld from the decoders. Header validity and body arity are each checked
against that schema, independently of each other and of any body data. A header that adds, drops,
renames or reorders any position is reported; a body row carrying more cells than the *schema* allows
is reported even when the document's header is widened to match it; schema-correct bodies still decode
when only the header is wrong. Short rows keep their established outcome — a missing governed cell
fails its own decoder (K1.0-SELF-08), an absent trailing ungoverned prose cell asserts nothing — but
that exception never widens the schema. This is revision 16's tie-breaker once more: a strict header
only adds reports, while a trusted header deletes claims silently.

**2. The dependent paths, re-derived.** The complete path from a physical line to a compared relation
was walked again for the new layer. Producers and consumers:

| # | Position | Before (round 1) | After |
|---|---|---|---|
| 1 | physical line → table discovery (`sectionTables`) | accepts a five-cell header with a five-cell delimiter (correct GFM) | unchanged: accepting the table is the grammar's job, trusting it is not |
| 2 | header → validity (`readKeyedTable`) | first cell only, against a label | full shape against `expectedHeader`: widen/narrow/rename/reorder all reported |
| 3 | body row → arity (`readKeyedTable`) | `cells.length > governed.header.length` | `cells.length > expectedHeader.length`; the established message prefix is kept with the schema allowance appended |
| 4 | body row → decoder input | full `cells`, ungoverned prose ignored by convention | governed prefix only (`cells.slice(0, arity − ungovernedTrailing)`), so prose positions are structurally unreachable by decoders |
| 5 | Zones/Dependency/Export/Deferred `valueOf` | whole-cell decoders over all cells | unchanged decoders over the governed prefix; identical results at schema width |
| 6 | decoded value → comparison | both directions, whole row | unchanged |

Per-table ownership (checked into `RowSpec`, asserted by the short-row and width-meaning twins):

| Table | Schema arity | Governed positions | Ungoverned trailing |
|---|---|---|---|
| Zones | 3 | 0 key, 1 root list | 1 (owner/status prose) |
| Dependency | 4 | 0 key, 1 count, 2 workspace edges, 3 third-party edges | 0 |
| Export | 3 | 0 key, 1 subpath list, 2 publishability | 0 |
| Deferred | 5 | 0 DX key, 1 path, 2 disposition, 3 owner | 1 (assignment rationale) |

**3. The counterexamples.** The review's exact production counterexample is the first control, with the
remaining real dependency rows at four cells: reviewed C silent (0 unreadable, relation identical to
baseline), new C loud twice (header must-be plus excess with schema allowance 4, row not recorded).
The family around it — the same widening in Zones/Export/Deferred, non-first-position renames and a
reorder, narrowed and widened headers with schema-correct bodies, ordinary excess in the two tables
round 1 did not name, the same width meaning different things under each schema, and the Zones
short-form twin — distinguishes a schema reconstruction from a five-column blacklist in both
directions: four of the seven tests fail against the reviewed C, three pass under both parsers as
shared-reader and preservation proofs, and a correction that merely rejected every width change would
fail the short-row twin and the schema-correct-body twins.

**4. The evidence.** Seven controls in one block, each through the production entry points on the real
document. Beyond the controls, a reworked independent reference ([validation-02/09](validation-02/09-schema-ownership-audit.log))
audits 29 documents across all four tables over the whole chain — physical line, discovery,
header/schema validation, arity/ownership, per-cell decoding, keyed relation, downstream comparison —
with schemas read verbatim out of the inventory file at run time and no arity taken from any candidate
header: reference and the new C agree on loudness *and* on the full recorded relation on all 29
(including loud documents, where loudness alone would hide a parser that reports the header yet still
records the attacked row); the reviewed C misses 10, every one of them in the header family. The
real document is clean under both, its downstream disagreements are empty, and a decoded-but-false
Deferred owner still reaches its consumer.

### Tests

Added: `governed table schemas own their arity (K10-CORR1-R1-01)`, 7 tests — the review's exact
counterexample with untouched-row readability; the same widening in Zones, Export and Deferred; one
width meaning different things under each schema; non-first-position rename/reorder/narrow controls
with schema-correct-body twins; narrowed/widened-header authority twins; ordinary excess in
Dependency and Export; the Zones short-form twin with its missing-governed counterpart.

Removed: none. Ported: none. Weakened: none — the two round-1 message prefixes are kept verbatim with
the governed schema appended, so the SELF-29 excess controls and the first-cell rename controls match
unchanged. C4 file 200 → 207 tests; architecture suite 344 → 351; conformance 1931 → 1938; full suite
2044 → 2051. No test was renamed away or skipped.

Compatibility and refusal: unchanged. No production, SDK, example or guide file is touched; the
target package still exports only its two refusals and is still `private`; no public export changed.
Baseline, guides and repository skills are unaffected.

### Prior findings

| Finding | Disposition |
|---|---|
| **K10-CORR1-R1-01** (P2, C4, round-1 review) | **Closed this round.** Independent per-table schemas, header/body arity each judged against them, governed-prefix decoding, 7 controls (4 failing against round-1 C `76ce938074ffa910fbd74374e388ba8d226af4c6`), plus a 29-document independent audit with zero reference disagreements and 10 reviewed-C misses confined to the header family. |
| **K10-CLEANUP-01** (P2, C4, owner-delegated cleanup) | **Stays closed.** Its four counterexamples and the whole decoder family are re-asserted: the decoders are byte-unchanged in behavior at schema width, the round-1 controls pass unmodified, and the audit carries one whole-cell decoder case per table. |
| K1.0-SELF-29 (self-found, round 1) | **Hardened, not reopened.** Its ordinary-excess controls pass unmodified (message prefixes preserved); its invariant statement — arity against the header — is superseded by schema authority in K1.0 contract revision 18, with the supersede note kept in revision 17's paragraph. |
| K10-R15-01 (P2, C4) | Closed in round 16, ACCEPTED by review-17. Preserved and re-asserted: the VT/FF class-boundary block and the §4.6/§6.10 re-assertion pass unchanged. |
| K10-R14-01 (P2, C4) | Closed in round 15, confirmed by review-16. Preserved and re-asserted: the NBSP/Unicode-space controls pass unchanged. |
| K10-R1-01 … K10-R13-01 | Closed in their rounds; every control block is present in TAP order in [validation-02/10](validation-02/10-c4-control-inventory.log). |
| K1.0-SELF-01 … -28 | Unchanged; their controls are in the same inventory. |

### Additional self-found defect, separate provenance

**Manifest transcription defect (no finding ID: process hygiene, not C4 behavior).** While writing
[validation-02/MANIFEST.md](validation-02/MANIFEST.md) by hand, the 64-character digest recorded for
`10-c4-control-inventory.log` was transcribed with 53 characters — exactly the K10-R4-02 shape the
evidence guard exists to catch. The post-manifest guard run failed on it before any commit, the true
digest was verified with an independent recomputation, the row was corrected, and the guard re-run
green (4/4). No evidence was altered to match a record; the record was corrected to match the evidence.
A second pre-commit slip of the same class — a widened-row test anchor that dropped its pipe
separator and therefore built a malformed fourth cell instead of a five-cell row — was caught by the
failing control itself during iteration and repaired before C; it never entered any candidate.

### Unresolved obligations

Unchanged from round 1 and restated so they are not read as closed: K1.0 establishes no protocol
behaviour, no durability, no isolation and no Driver fidelity; the allowed-leaf list is empty by
decision; the E1 preparation is built, unaccepted and closes no criterion. None is unblocked here.

## Validation and interpretation

Every command ran in `/Users/rex-shih/Documents/ArrokothI/arrokothi` against the committed payload
tree at C `36460438e95e968beec0b354b07a616b53981256`, whose only uncommitted content was the
validation directory the run itself writes. Node v25.2.1, npm 11.6.2, TypeScript 5.9.3,
Darwin 25.6.0 arm64. Raw output, digests and the full quoted programs are in
[validation-02/MANIFEST.md](validation-02/MANIFEST.md).

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | 2051 tests, 301 suites, 0 fail, 0 skipped |
| `npm run test:conformance` | 0 | 1938 tests, 282 suites, 0 fail, 0 skipped |
| `npm run check:builder-docs` | 0 | 26 files, 286 links/anchors, 38 public imports |
| `npm run test:kernel` | 0 | 4 tests, 0 fail |
| `npm run test:sdk` | 0 | 22 tests, 0 fail |
| K10-CORR1-R1-01 demonstration | 0 | review's exact counterexample plus six schema-family cases on both parsers; 5 old-silent/new-loud distinctions, 0 where new C fails its requirement |
| schema/column-ownership audit | 0 | 29 documents: reference-vs-new disagreements 0; old-vs-reference misses 10, all header-family; real-doc downstream clean, decoded-but-false owner reaches consumer |
| C4 control inventory (TAP) | 0 | 207 tests, 21 suites, 0 fail, 0 skipped |

After the manifest existed, the evidence guard was re-run so its coverage of *this* directory is
asserted rather than assumed (and it caught the transcription defect above before the re-run):

```text
$ node --test --experimental-strip-types tests/conformance/architecture/evidence-records.test.ts
ℹ tests 4  ℹ pass 4  ℹ fail 0  ℹ skipped 0
manifested validation directories in scope: 18
  … docs/development/work/K1.0-correction-01/validation-02
this round's directory is in scope: true
logs whose recorded digest is their real SHA-256: 10
```

**External fixture / gate / decision.** None executed. The E1 preparation is pinned, built and
unaccepted; no benchmark run, result or decision is claimed, and no benchmark file was read or
edited by this correction.

**Checks not run, and the resulting limits.** `npm run test:evals` was not run: the correction
touches only the C4 evidence parser, its controls and contract prose, none of which is
reachable from an eval, so this candidate makes no claim about Agent or model-facing behaviour. No
E1 result is claimed. No durability, isolation, packaging or Driver-fidelity claim is made. Historical
raw logs from earlier rounds were not re-executed; their identities are preserved and were checked to
be byte-unchanged, which is not the same as re-running them.

**Why the evidence supports each criterion** (implementer assessment, never acceptance):

- **C1/C2/C9** — unchanged by this correction and re-run green: the target zone still exists, is still
  private, still reaches nothing outside itself, and the forbidden/permitted edge controls and the
  scanner's prose-vs-code discrimination are untouched and pass.
- **C3** — 2051 tests, 0 fail, 0 skipped; typecheck clean; the legacy export map and its 227/227/44/33/21
  runtime names are unchanged; no importer of the target zone exists outside it.
- **C4** — the criterion this round corrects. Row discovery and whole-cell value decoding are
  preserved; table-schema ownership is added; the evidence is the 7 new controls (4 failing
  against round-1 C), the 29-document independent audit with zero reference disagreements, and the
  preserved 200-case inventory with unmodified expectations.
- **C5** — the executable policy is unchanged; the inventory document is unchanged; the two are still
  compared in both directions, now over relations keyed under fixed schemas.
- **C6/C8** — non-goals and release provenance are unchanged; this report re-states the E1 exception
  and claims nothing from it.
- **C7** — `legacy-core-boundaries.test.ts` is untouched; its thirteen assertions are intact; the
  architecture progression gains one step, 344 → 351, with nothing removed.

**Design choices and assumptions.** Two readings were open and are recorded because a reviewer
should be able to disagree with them specifically rather than with the correction as a whole.
(i) Header validity is exact equality with the schema — no alignment forgiveness, no extra
whitespace class beyond the tables extension's own SPACE/TAB trim — because a forgiving header check
is a narrower or wider schema by another name, and the schema must be one thing. (ii) A header that
is wrong does not poison schema-correct bodies: they still decode, and the header report alone
carries the loudness. The alternative — dropping every body under a bad header — would make a
one-cell header typo indistinguishable from a fabricated relation and would hide the bodies' own
verdicts from the audit. (iii) The short-row exception covers only an absent *trailing ungoverned
prose* cell; any missing governed cell fails its decoder, and any extra cell is excess.

**Strongest remaining risk.** One author wrote the parser, the new controls and the reference. The
schemas are now quoted out of the governed document at run time and the reference agrees with the
parser on relations even where both are loud, but the *inference* from header line to per-position
ownership — which trailing positions are prose — is still one person's, checked in as a table in
`RowSpec` and pinned only by the short-row twins. An independent derivation of that table from the
document's prose about what each column means (rather than from its header row) would be the next
evidence to ask for. The second-strongest risk is scope: this correction makes the oracle stricter
about headers, and a stricter oracle can only be wrong by rejecting a document a future packet
legitimately wants to write; the schema-correct-body twins and the canonical-header acceptance
control are the guard against that, stated as controls rather than intentions.

**Third-party review under AGENTS.md.** None required. No third-party code, dependency, fixture or
service was read, copied, adapted, vendored or added. Every line is original to this repository, and
the only external material referenced is the published GFM 0.29 specification already pinned by
earlier rounds, cited rather than reproduced.

## Whole-packet self-review (012)

- **The fixed invariant:** table-schema ownership — header validity and body arity are each judged
  against an independent per-table schema, never against each other or against document-controlled
  widths; every body cell is owned by a governed decoder or a declared ungoverned prose position.
- **The independent schema representation:** `RowSpec.expectedHeader` (exact header cells) plus
  `RowSpec.ungovernedTrailing`, one constant per table at its call site, with the ownership table in
  the interface comment; enforced by the header check, the `schemaArity` excess check and the
  governed-prefix slice.
- **Every producer/consumer affected:** `sectionTables` (unchanged producer of header/body splits);
  `readKeyedTable` (header check, arity check, decoder input); the four `RowSpec` call sites
  (schemas declared); `parseInventory`/`parseDependencyTable`/`inventoryDisagreements` (unchanged
  consumers of louder, schema-keyed relations); the seven new and all prior controls.
- **Why round 1's SELF-29 check missed the self-authorizing-header interaction:** its controls
  appended a body cell while leaving the real header unchanged, distinguishing only body width
  against the current document header width; its audit oracle replaced one cell at a time and asked
  what that cell means — but the ignored fifth cell never reaches a decoder, so no per-cell oracle
  can reveal a defect that occurs before decoding.
- **Distinguishing controls in both directions:** new-loud/old-silent on the exact attack in all four
  tables plus renames/reorder (schema reconstruction proved); old-loud/new-recorded on narrowed
  headers with schema-correct bodies (authority direction proved); both-loud on ordinary excess and
  the cleanup family and both-clean on short prose forms and canonical headers (no regression proved).
- **Disposition of findings:** K10-CORR1-R1-01 closed here; K10-CLEANUP-01 stays closed with its
  decoders unchanged; SELF-29 hardened with its controls green and its header-derived sentence
  superseded in place; R14/R15 and SELF-01…28 preserved; one self-found manifest transcription defect
  caught by the guard and corrected, recorded above.
- **Strongest remaining risk:** as stated above — single authorship of parser, controls and
  reference, with the prose-to-ownership inference as the next evidence to seek independently.

## Handoff

Ready for a fresh, separate independent review of the cumulative interval from the original base
`c9a9ed7e6e538ab0542fc6a999426264abb6212a` to this candidate H. A previous ACCEPT on
`f3aa29d7ecba2a23aa85788b7efdebdd383cab24` exempts no dependency: review-17's C4 PASS is the
conclusion K10-CLEANUP-01 invalidated, and review-01's C4 FAIL is the conclusion this round answers,
so C4 must be judged afresh, and every other criterion must be re-judged over the whole interval
rather than over the correction delta.

Base, C, H and the verified advertised remote SHA are supplied in the external owner handoff after
the push; this file cannot certify a push that has not happened when it is written. No offline
artifact is involved.

No self-acceptance. K1.0's historical ACCEPT stays recorded and stays held for C4 claims, integration
and dependent release. Successor release remains owner-controlled; `next_release: none`.
