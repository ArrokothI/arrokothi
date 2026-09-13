# Implementation report — K1.0-correction-01, round 1

## Identity

- **Packet:** K1.0-correction-01, a bounded correction of the released packet K1.0; parent milestone
  K1. **Contract:** [K1.0-correction-01/contract.md](contract.md) revision 1, which adopts
  [K1.0's contract](../K1.0/contract.md) — now **revision 17** — and its criteria C1–C9 unchanged.
  **Governing process baseline:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
- **State:** `WAITING_FOR_REVIEW`. Accepted by nobody. K1.0's historical ACCEPT is preserved and its
  use for C4 claims, integration and dependent release remains **held** until this correction is
  independently reviewed. Owner release of K1.0 and the E1-preparation exception are unchanged and
  recorded in [K1.0's contract](../K1.0/contract.md#release-provenance-and-the-e1-dependency-decision).
  Prerequisite: K0.2 ACCEPT `90a6f37eaeb61009025449a1abc7e6d31dc1dbb2`, integrated
  `0535160e677231da41b06d9f822e62e2f0364dd1` ([receipt](../K0.2/integration-01.md)).
- **Branch:** `codex/k1.0-target-boundary-legacy-quarantine`. **Configured remote:** `origin`,
  `https://github.com/ArrokothI/arrokothi.git`. **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`
  (still exactly remote `main`). **Payload C:** `76ce938074ffa910fbd74374e388ba8d226af4c6`.
  **Pinned head this correction started from:** `b8e394dd2a58b839b131943f4ca9b250abff94af`, the
  advertised branch head, which carries the cleanup and correction records and is the parent of C.
- **Prior candidate and its record:** H `f3aa29d7ecba2a23aa85788b7efdebdd383cab24` over clean payload
  C `d693d59aefe5335c8950d57cec6d6b57e375cadc`, independently **ACCEPTED** by
  [review-17](../K1.0/review-17.md) at A `36595f57d1f8cec8c4bf8a6293e888ca27750fab`. That ACCEPT is
  preserved verbatim. The reopening is the owner-delegated cleanup finding **K10-CLEANUP-01**
  recorded in [cleanup-01](../K1.0/cleanup-01.md), not a reviewer finding.
- **Candidate H:** the commit containing this report. Its full SHA cannot be named from inside it;
  the external handoff supplies it and the verified advertised remote SHA.
- **Exact C..H administrative file allowlist** (15 files, nothing else):
  - `docs/development/work/K1.0-correction-01/implementation-01.md` (this report)
  - `docs/development/work/K1.0-correction-01/validation-01/MANIFEST.md` and its ten `.log`
    attachments, declared output-only under 006
  - `docs/development/007-work-packets.md`, `docs/development/001-current-status-and-roadmap.md`
    and `docs/development/README.md` — status transcription only, no substantive change
- **Working tree:** clean at C, and clean at H apart from the validation directory this run writes,
  which is then committed in H. **Push:** performed after H; the advertised remote SHA is verified
  and reported in the external handoff, never claimed by this file.

## Changes and coverage

### Change groups and cumulative diff

Correction delta `b8e394dd..C`: **5 files changed, 721 insertions(+), 46 deletions(-)**.

| File | Lines | What changed |
|---|---|---|
| `tests/conformance/architecture/inventory-oracle.ts` | 190 | The whole-cell decoder layer; the excess-cell rule; the removal of `backticked`, `Number.parseInt` on a count cell, `includes("nothing")` and `startsWith("yes"/"no")` from every governed column |
| `tests/conformance/architecture/kernel-landing-zone.test.ts` | 386 | One new control block, `whole-cell value decoding (K10-CLEANUP-01)`, 14 tests |
| `tests/conformance/architecture/evidence-records.test.ts` | 43 | The guard's work roots widened to cover this packet's own validation directory |
| `docs/development/work/K1.0/contract.md` | 59 | Revision 17: the invariant, the derivation, the forbidden list, the live counts |
| `docs/development/work/K1.0-correction-01/contract.md` | 89 | New: the bounded corrective scope, authority and preserved identities |

Cumulative `base..C`: **223 files changed, 108 793 insertions(+), 39 deletions(-)**. No legacy
production, provider, SDK, example, script, benchmark or configuration path is touched by this
correction or by the packet; `tests/conformance/k0` is byte-identical to base.

**Ownership.** This is entirely C4 evidence machinery. It is not Kernel semantics, not an Execution
Runtime concern and not a deployment concern: `inventory-oracle.ts` is a conformance-test oracle that
reads a documentation file and compares the relations it asserts against the executable policy and
the real manifests. Governing sources: [K1.0-C4](../K1.0/contract.md#acceptance-criteria); the
inventory document's own prose about what each column means; [006](../../006-development-process.md)
for the correction lifecycle; [012](../../012-review-methods.md) for semantic correction closure.

### Selected 012 methods

- **Semantic correction closure** — the four steps below, applied to the whole affected path rather
  than to the reported strings.
- **Whole-observable checking** — the finding was invisible to the previous controls because they
  inspected a *part* of the result (messages present, keys unique) rather than the decoded values.
  Each new control reads the decoded relation or the reported message, through a production entry
  point, on the real document.
- **Deterministic execution** — every control is a pure function of document text; no clock, no
  network, no ordering dependence.
- **Materially excluded:** provider/native Driver fidelity, durability, isolation, packaging and E1.
  None is reachable from this diff, and none is claimed.

### Semantic correction closure

**1. The changed invariant.** Before: rows were accounted for totally, and the lexical classes that
find rows and sections were derived from the pinned grammar (rounds 12–16). Neither statement says
anything about whether the decoded *value* used everything the cell asserts, and four decoders did
not. After: **a governed cell is decoded whole or its row is unreadable.** Stated as a property
rather than a list — every governed column has exactly one total decoder; each consumes its cell from
end to end; none applies a host normalizer; anything left over makes the row an outcome, never a
partial read.

**2. The dependent paths, re-derived.** The complete path from a physical line to a compared relation
was walked, and every position that turns text into a value was given the language its own column
asserts. The four tables share one reader, so the table below is the whole surface.

| # | Position | Column / table | Language it asserts | Before | After |
|---|---|---|---|---|---|
| 1 | row → cells | all four | GFM tables extension; SPACE/TAB padding trimmed | correct (K10-R15-01) | unchanged |
| 2 | cell → zone id | Zones key | exactly one code span | first code span found anywhere; rest discarded | `decodeCodeSpan` |
| 3 | cell → roots | Zones value | non-empty comma-separated code-span list | every code span found anywhere; other characters discarded | `decodeCodeSpanList` |
| 4 | cell → owner/status | Zones column 3 | **ungoverned prose** | not read | not read, and now recorded as deliberately ungoverned |
| 5 | cell → zone id | Dependency key | exactly one code span | as #2 | `decodeCodeSpan` |
| 6 | cell → file count | Dependency column 2 | one whole decimal number | `Number.parseInt` — a parsable prefix | `decodeCount` |
| 7 | cell → workspace edges | Dependency column 3 | `nothing` \| `—` \| code-span list | `includes("nothing")`, else code spans found anywhere | `decodeEdgeCell` with that column's sentinels |
| 8 | cell → third-party edges | Dependency column 4 | `nothing` \| code-span list | `includes("nothing")`, else as #7 | `decodeEdgeCell` with that column's sentinel only |
| 9 | cell → package name | Export key | exactly one code span | as #2 | `decodeCodeSpan` |
| 10 | cell → subpaths | Export column 2 | non-empty comma-separated code-span list | as #3 | `decodeCodeSpanList` |
| 11 | cell → publishability | Export column 3 | closed normalised vocabulary | `toLowerCase().startsWith("yes"/"no")` | whole-cell vocabulary lookup |
| 12 | cell → DX id | Deferred key | `DX-<digits>`, whole cell | already whole-cell | unchanged, re-asserted |
| 13 | cell → current path | Deferred column 2 | exactly one code span | as #2 | `decodeCodeSpan` |
| 14 | cell → disposition | Deferred column 3 | the cell's exact text | already whole-cell | unchanged, re-asserted |
| 15 | cell → owner | Deferred column 4 | the cell's exact text | already whole-cell | unchanged, re-asserted |
| 16 | cell → rationale | Deferred column 5 | **ungoverned prose** | not read | not read, and now recorded as deliberately ungoverned |
| 17 | row arity vs header arity | all four | every cell is read by some column | excess cells silently ignored | reported (K1.0-SELF-29) |
| 18 | decoded value → comparison | `inventoryDisagreements`, measured-tree consumer | both directions, whole row | correct | unchanged |

Two adjacent decoders outside the governed columns were audited and left alone, with the reason
recorded rather than assumed: the ordered-list marker's `Number.parseInt` is applied to a string the
regular expression `/^[0-9]{1,9}[.)]/` has already matched, so it sees only digits and has no prefix
to accept; and `parseHtmlBlockStart`'s `toLowerCase()` is applied to a tag name that
`parseCompleteTag` has already restricted to `/^[A-Za-z][A-Za-z0-9-]*/`, so it folds ASCII only. The
`i`-flagged raw-HTML patterns are non-Unicode regular expressions, whose canonicalisation explicitly
does not map a non-ASCII character onto an ASCII one, so U+212A and U+017F cannot become tag letters.
The call-site inventory in [validation-01/01](validation-01/01-tree-and-environment.log) prints every
remaining occurrence so a reviewer can check the claim rather than take it.

**3. The counterexamples.** The direction chosen where the reading was open is the same tie-breaker
K10-R15-01 settled for character classes, applied to values: **the narrower language wins**, because
a decoder that is too strict only adds reports, while one that reads a prefix deletes the rest of the
document's claim silently, and fail-closed accounting must exclude silence first. Concretely: `02` is
reported although its numeric value is unambiguous; a repeated token in a list cell is reported rather
than collapsed; `yes` in lower case is reported although its intent is obvious. Each of those is a
spelling the document does not use, and each rejection costs a report and hides nothing.

**4. The evidence.** Fourteen controls in one block, each pairing the malformed or contradictory
family with the permitted spellings beside it. Eight fail against the accepted H; the other six are
preservation twins that pass in both, so a correction that narrowed too far would fail them. All 186
previously accepted cases in the file pass unchanged under both parsers. Beyond the controls, an
independent reference ([validation-01/09](validation-01/09-whole-cell-audit.log)) audits 89 cells
across seven columns in three executed columns, and the count that a shared authorial assumption
would produce — H and C agreeing while the reference differs — is zero.

### Tests

Added: `whole-cell value decoding (K10-CLEANUP-01)`, 14 tests — the cleanup's four counterexamples
through the production entry point; twelve malformed count spellings; a positive count control
including `0` and a multi-digit measurement; six contradictory edge cells in both dependency columns;
the column-specific empty sentinels; five subset-extraction cases across zones, exports and deferred
rows; an unquoted specifier in a dependency list; the permitted list spellings with SPACE/TAB padding;
six publishability prefixes; the vocabulary's positive twin in both directions; the whole-cell
disposition/owner re-assertion; the excess-cell rule with its trailing-VT case; the short-row twin;
and a non-vacuity control over every governed cell of the real document.

Removed: none. Ported: none. C4 file 186 → 200 tests; architecture suite 330 → 344; conformance
1917 → 1931; full suite 2030 → 2044. No test was weakened, renamed away or skipped.

Compatibility and refusal: unchanged. No production, SDK, example or guide file is touched; the
target package still exports only its two refusals and is still `private`; no public export changed.
Baseline, guides and repository skills are unaffected.

### Prior findings

| Finding | Disposition |
|---|---|
| **K10-CLEANUP-01** (P2, C4, owner-delegated cleanup) | **Closed this round.** Whole-cell decoding across all four tables, 14 controls, 8 failing against the accepted H, plus an independent reference audit over 89 cells and the real document's 93 governed cells. |
| K10-R15-01 (P2, C4) | Closed in round 16, ACCEPTED by review-17. Preserved and re-asserted: the VT/FF class-boundary block and the §4.6/§6.10 re-assertion pass unchanged. |
| K10-R14-01 (P2, C4) | Closed in round 15, confirmed by review-16. Preserved and re-asserted: the NBSP/Unicode-space controls pass unchanged. |
| K10-R1-01 … K10-R13-01 | Closed in their rounds; every control block is present in TAP order in [validation-01/10](validation-01/10-c4-control-inventory.log). |
| K1.0-SELF-01 … -28 | Unchanged; their controls are in the same inventory. |

### Additional self-found defect, separate provenance

**K1.0-SELF-29 — a body row's cells past its header's arity were read by no column.** Found while
tracing the decoders through the four tables, not while fixing K10-CLEANUP-01's cells. GFM Example
204 lets a renderer ignore the excess; for a fidelity oracle an ignored cell is document content that
no comparison can contradict, which is the same fail-open shape as a prefix parse one level up. Now
reported, after the key is accounted for so uniqueness still runs first. Short rows deliberately keep
their established outcome: a missing governed cell already fails its own decoder (K1.0-SELF-08) and
an absent ungoverned prose cell asserts nothing. This also makes observable the trailing-VT case that
round 16's audit could only record in prose.

A second, smaller item is recorded here rather than as a finding because it is an omission in
coverage rather than a defect in behaviour: this packet's corrective validation directory would have
sat outside `evidence-records.test.ts`, which scanned only `docs/development/work/K1.0`. Its work
roots are now explicit and include this packet's directory; [validation-01/10](validation-01/10-c4-control-inventory.log)
shows the guard green, and the post-manifest run below shows this directory in scope.

### Unresolved obligations

Unchanged from round 16 and restated so they are not read as closed: K1.0 establishes no protocol
behaviour, no durability, no isolation and no Driver fidelity; the allowed-leaf list is empty by
decision; the E1 preparation is built, unaccepted and closes no criterion. None is unblocked here.

## Validation and interpretation

Every command ran in `/Users/rex-shih/Documents/ArrokothI/arrokothi` against the committed payload
tree at C `76ce938074ffa910fbd74374e388ba8d226af4c6`, whose only uncommitted content was the
validation directory the run itself writes. Node v25.2.1, npm 11.6.2, TypeScript 5.9.3,
Darwin 25.6.0 arm64. Raw output, digests and the full quoted programs are in
[validation-01/MANIFEST.md](validation-01/MANIFEST.md).

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | 2044 tests, 300 suites, 0 fail, 0 skipped |
| `npm run test:conformance` | 0 | 1931 tests, 281 suites, 0 fail, 0 skipped |
| `npm run check:builder-docs` | 0 | 26 files, 286 links/anchors, 38 public imports |
| `npm run test:kernel` | 0 | 4 tests, 0 fail |
| `npm run test:sdk` | 0 | 22 tests, 0 fail |
| K10-CLEANUP-01 demonstration | 0 | cleanup's own reproduction on both parsers; 18 further cases, 9 distinguishing, 0 where C fails its own requirement |
| whole-cell audit | 0 | 89 cells: C wrong 0, accepted H wrong 56, both-wrong-together 0; non-vacuity 93 real cells, 0 mismatches |
| C4 control inventory (TAP) | 0 | 200 tests, 20 suites, 0 fail, 0 skipped |

After the manifest existed, the evidence guard was re-run so its coverage of *this* directory is
asserted rather than assumed:

```text
$ node --test --experimental-strip-types tests/conformance/architecture/evidence-records.test.ts
ℹ tests 4  ℹ pass 4  ℹ fail 0  ℹ skipped 0
manifested validation directories in scope: 17
  … docs/development/work/K1.0-correction-01/validation-01
this round's directory is in scope: true
logs whose recorded digest is their real SHA-256: 10
```

**External fixture / gate / decision.** None executed. The E1 preparation is pinned, built and
unaccepted; no benchmark run, result or decision is claimed, and no benchmark file was read or
edited by this correction.

**Checks not run, and the resulting limits.** `npm run test:evals` was not run: the correction
touches only the C4 evidence parser, its controls and the evidence-record guard, none of which is
reachable from an eval, so this candidate makes no claim about Agent or model-facing behaviour. No
E1 result is claimed. No durability, isolation, packaging or Driver-fidelity claim is made. Historical
raw logs from earlier rounds were not re-executed; their identities are preserved and were checked to
be byte-unchanged, which is not the same as re-running them.

**Why the evidence supports each criterion** (implementer assessment, never acceptance):

- **C1/C2/C9** — unchanged by this correction and re-run green: the target zone still exists, is still
  private, still reaches nothing outside itself, and the forbidden/permitted edge controls and the
  scanner's prose-vs-code discrimination are untouched and pass.
- **C3** — 2044 tests, 0 fail, 0 skipped; typecheck clean; the legacy export map and its 227/227/44/33/21
  runtime names are unchanged; no importer of the target zone exists outside it.
- **C4** — the criterion this round corrects. Total row accounting and the pinned lexical classes are
  preserved; whole-cell value decoding is added; the evidence is the 14 new controls (8 failing
  against the accepted H), the 89-cell independent audit with zero shared-assumption rows, and the
  93-cell non-vacuity run over the real document.
- **C5** — the executable policy is unchanged; the inventory document is unchanged; the two are still
  compared in both directions, now over values that are read whole.
- **C6/C8** — non-goals and release provenance are unchanged; this report re-states the E1 exception
  and claims nothing from it.
- **C7** — `legacy-core-boundaries.test.ts` is untouched; its thirteen assertions are intact; the
  architecture progression gains one step, 330 → 344, with nothing removed.

**Design choices and assumptions.** Three readings were open and are recorded because a reviewer
should be able to disagree with them specifically rather than with the correction as a whole.
(i) A repeated token inside one list cell is *reported* rather than collapsed or turned into a length
disagreement, because collapsing erases the second claim. (ii) A leading zero and a lower-case `yes`
are reported although their meanings are unambiguous, because the column's spelling is the document's
own and a wider language here buys nothing. (iii) Short rows are accepted while long rows are
reported; the rule is "every cell is read by some column", not "arity must match", and the twin
controls pin both halves.

**Strongest remaining risk.** One author wrote both the parser and the reference that judges it. The
quoting step is now beyond that author's reach — each governing sentence is read at run time from the
repository file that owns it, and the reference refuses to run if a sentence is absent or not unique
— but the inference from sentence to language is still one person's, and the `Published?` column is a
closed vocabulary where both sides necessarily agree. That column is labelled as such in the log
rather than counted as independent evidence. The second-strongest risk is scope: this correction
makes the oracle stricter, and a stricter oracle can only be wrong by rejecting a document a future
packet legitimately wants to write; the permitted-spelling twins are the guard against that, and they
are stated as controls rather than as intentions.

**Third-party review under AGENTS.md.** None required. No third-party code, dependency, fixture or
service was read, copied, adapted, vendored or added. Every line is original to this repository, and
the only external material referenced is the published GFM 0.29 specification already pinned by
earlier rounds, cited rather than reproduced.

## Handoff

Ready for a fresh, separate independent review of the cumulative interval from the original base
`c9a9ed7e6e538ab0542fc6a999426264abb6212a` to this candidate H. A previous ACCEPT on
`f3aa29d7ecba2a23aa85788b7efdebdd383cab24` exempts no dependency: review-17's C4 PASS is the
conclusion K10-CLEANUP-01 invalidated, so C4 must be judged afresh, and every other criterion must be
re-judged over the whole interval rather than over the correction delta.

Base, C, H and the verified advertised remote SHA are supplied in the external owner handoff after
the push; this file cannot certify a push that has not happened when it is written. No offline
artifact is involved.

No self-acceptance. K1.0's historical ACCEPT stays recorded and stays held for C4 claims, integration
and dependent release. Successor release remains owner-controlled; `next_release: none`.
