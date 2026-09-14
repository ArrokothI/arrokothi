# Implementation report — K1.0, round 6 (correction)

## Identity

- **Packet:** K1.0 — target boundary and legacy quarantine. **Parent milestone:** K1.
  **Contract:** [`contract.md`](contract.md), revision 6.
- **Governing process baseline:** this repository's integrated `docs/development/` documents at the
  base commit — [006](../../006-development-process.md), [007](../../007-work-packets.md),
  [008](../../008-implementation-report.md), [012](../../012-review-methods.md),
  [013](../../013-structure-and-evidence-sequencing.md). This candidate changes none of them.
- **State:** CHANGES_REQUESTED → IN_PROGRESS → WAITING_FOR_REVIEW. No verdict is entered here and
  none is claimed.
- **Correction handoff acted on:** [review-05.md](review-05.md), recorded by
  `86fbd8423bf6fbfda1febcab6a9d3c59f0115f4b`, which is exactly one administrative commit containing
  only that record. Open finding **K10-R5-01** (P2); C4 the only failing criterion. No owner
  supplemental decision; no unresolved authority.
- **Owner release and its provenance:** unchanged from round 1 — the owner's verbatim 2026-09-13
  instruction releasing K1.0 and directing that the benchmark E1 dependency be treated as the
  already-built but unaccepted fixture preparation, quoted in the contract's *Release provenance*.
- **Prerequisite ACCEPT and integration identities:** unchanged. K0.2 accepted at H16
  `90a6f37eaeb61009025449a1abc7e6d31dc1dbb2`, integrated as
  `0535160e677231da41b06d9f822e62e2f0364dd1`. The benchmark E1 preparation remains built and
  **accepted by nobody**: `codex/e1-kernel-acceptance-capture`, payload
  `d8f17549c31f9ee5d995e773c2f211faed2785fb`, candidate `8de04779d279dba82cf834d419e465d2b677ef46`,
  `BLOCKED_EXTERNAL`, not merged.
- **Branch and configured remote:** `codex/k1.0-target-boundary-legacy-quarantine` on `origin`
  `https://github.com/ArrokothI/arrokothi.git`.
- **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`, unchanged across all six rounds.
- **Previous reviewed H and its review record:** H5 `2b274e6ecbaa8cdcc4600d8574234fc027c2b37e`,
  reviewed `CHANGES REQUIRED` by [review-05.md](review-05.md). Rounds 1–4 and their reviews are
  preserved.
- **Payload C:** `459be4e51370ebb8e859a46b29a966944bbd755a`. One correction payload commit after the
  round-5 review record. History is preserved, not rewritten.
- **Candidate H:** the commit containing this report. Its full SHA is supplied in the external
  handoff, since a commit cannot name itself.
- **Exact C..H administrative file allowlist:**
  - `docs/development/work/K1.0/implementation-06.md` (this report)
  - `docs/development/work/K1.0/validation-06/MANIFEST.md` and its eight `0*.log` attachments
  - the K1.0 status-row transcription in `docs/development/007-work-packets.md`
  - the matching live-summary sentences in `docs/development/README.md` and
    `docs/development/001-current-status-and-roadmap.md`

  Nothing else. No script, fixture, schema, test, threshold or configuration is in that interval.
  The six new `kernel-landing-zone.test.ts` controls and the `inventory-oracle.ts` reconstruction
  are payload in C, not H attachments, per 006.
- **Working-tree state:** clean at C when every command in `validation-06/` ran; the only
  uncommitted content during the runs was `validation-06/` itself, which the runs write.
- **Push status:** pending at the time of writing. The verified advertised remote SHA is supplied in
  the external handoff after the push; this report certifies no future push.

## Changes and coverage

### Change groups

`86fbd84 → C` is three files (review-05's record itself adds the fourth file in `H5 → C`).

| Group | Paths | Finding |
|---|---|---|
| GFM row-discovery reconstruction (front door before the shared reader) | `tests/conformance/architecture/inventory-oracle.ts` | K10-R5-01, K1.0-SELF-11 |
| Distinguishing controls through the production parser (4 tables + adjacent syntax) | `tests/conformance/architecture/kernel-landing-zone.test.ts` | K10-R5-01, K1.0-SELF-11 |
| Contract revision 6 (row-discovery rule, evidence counts) | `docs/development/work/K1.0/contract.md` | both |

`readKeyedTable` is byte-untouched except for the surrounding comments still describing it: the
round-5 key-before-value and seen-before-parse semantics are preserved exactly. The relational,
uniqueness, malformed-cell, dependency-recomputation, and provenance checks accepted in rounds
3–5 are preserved; only the row-discovery front door changes. C1/C2/C3/C5/C6/C7/C8/C9, the
round-3 scanner reconstruction, the round-5 evidence-record correction/guard, and the frozen
`tests/conformance/k0` (byte-identical to base, verified in `01`) are undisturbed.

### K10-R5-01 — row discovery rebuilt from the GFM table grammar

**Governing invariant.** Every candidate data row belonging to one of the four C4 tables must
reach the shared keyed accounting path and end in exactly one observable outcome: recorded,
duplicate, or unreadable. Legal table syntax must not provide a path around that accounting.

**The defect, exactly.** `tableRows` accepted only lines whose trimmed form both started **and**
ended with `|`. GFM states edge pipes are recommended, not required, and Example 199 deliberately
mixes rows with and without them. A valid contradictory row such as
`| \`target-kernel\` | \`packages/core/src\` | stale contradictory duplicate` (no trailing pipe)
was therefore ignored before `readKeyedTable` ever saw it; the later correct row parsed normally
and the oracle stayed green. The same front door serves all four keyed tables, so moving them
behind one reader in round 5 did not close this omission. Reproduced against H5 before editing:
the review-05 literal is silent there (`unreadable: []`, `disagreements: []`), and all six
omitted-edge spellings (trailing/leading/both × before/after) are silent when cleanly inserted
as standalone lines.

**The reconstruction (not a trailing-pipe special case).** `tableRows` was re-derived from the
GFM table section the document actually uses
(`https://github.github.com/gfm/#tables-extension-`):

- a header line carrying an unescaped `|` immediately followed by a delimiter row with the same
  cell count (header must match delimiter or there is no table, Example 203), then every
  subsequent non-blank line until the table breaks as a body candidate;
- edge pipes optional and possibly inconsistent (Example 199), spaces around cells trimmed;
- only an unescaped `|` delimits; `\|` (including inside other inline spans) stays in its cell
  (Example 200), with odd/even backslash-run handling and unescaping after the split;
- the delimiter is dashes with optional alignment colons (`^:?-+:?$`), so `:---` variants are
  still the delimiter rather than data;
- the table breaks at the first blank line or at another block start (fence, ATX heading,
  blockquote; Example 201); prose before the header or after the break is not a candidate, so
  surrounding inventory prose is unaffected; fenced code is skipped;
- a body line with no `|` at all is still a single-cell row padded with empties (Example 202) and
  therefore still reaches the reader;
- body rows may carry fewer cells (empties inserted) or more (excess ignored, Example 204); that
  padding is left to each table's `valueOf`, which already fails closed after the key is seen;
- the header's own delimiter is the only delimiter skipped silently; any later
  delimiter-shaped line inside the body reaches `readKeyedTable` as unreadable;
- the header row is still returned and skipped by each table's `headerFirstCell` rule inside the
  unchanged `readKeyedTable`.

A repository-wide search for sibling row-discovery aliases found only this `tableRows` (four call
sites, one per C4 table, all sharing it) plus one frozen `tests/conformance/k0` line that names a
different table for a different purpose and must not be touched. No second in-scope parser exists;
that check is recorded here rather than left for the reviewer.

**Distinguishing evidence** ([`08`](validation-06/08-r501-demonstration.log)), H5 front door
(quoted in the log) versus committed, against the real document through the production parser:

| Case | H5 | Committed |
|---|---|---|
| baseline, unmutated | 0 | 0 unreadable, 0 disagreements |
| review-05 literal (Zones omitted trailing, before) | misses bad row | 1 unreadable, 2 disagreements |
| Zones/Deferred/Export/Dependency × omitted trailing/leading/both × before/after (24) | misses in all 24 | duplicate flagged in all 24 |
| pipe-less single-cell row before/after (SELF-11 challenger) | misses (5 Zones rows, pipeless absent) | 2 / 1 unreadable, names `target-kernel` |
| alignment delimiter / edgeless header+delimiter | valid variants green | same, plus edge-less contradictory beside alignment still duplicate |
| escaped `\|` in a cell | — | still one row, duplicate key |

Six new committed controls drive the same parser the real C4 check uses (four omitted-edge-pipe
tables, one pipe-less continuation, one delimiter/header/escaped-pipe variant case); each loops
over its edge/position matrix internally. The six round-3 duplicate controls, three round-4
malformed/short controls, and all ten round-2 relational controls are unchanged and still pass.

### Why rounds 3, 4, and 5 missed this family (006 repeated-defect rule)

Rounds 3–5 each closed the exact counterexample in front of them inside `readKeyedTable`'s
neighbourhood — last-write-wins (R3), parse-before-uniqueness in the dependency helper (R4),
short-row absence in Zones (SELF-08) — while leaving the earlier `tableRows` filter unexamined.
Each round asked "does a row that reaches the reader end accounted for?" rather than "can a
valid row avoid reaching the reader at all?" The committed mutation strings in every round used
both edge pipes, so green tests could not distinguish a total reader from a reader total only
over the subset its front door admits. The reviewer in each round correctly noted the exact fix
but had no reason to re-derive the Markdown grammar the front door implicitly assumed.

This correction closes the **row-discovery invariant**, not the latest spelling, because it
replaces the cosmetic `startsWith("|") && endsWith("|")` + `^-+$` rule with the GFM table-block
rule above, shares it structurally across all four tables (one `tableRows`, one
`readKeyedTable`), and asserts it with a matrix that varies edge presence, row order, table
identity, and adjacent GFM forms (pipe-less continuation, alignment delimiters, edgeless
header/delimiter, escaped pipes) rather than with one more literal-string control. A future
spelling in the same family — any GFM body row the document's tables can render — either reaches
the reader or breaks the table block openly; there is no longer a recommended-but-optional
delimiter whose absence is silence.

Cumulative re-review after the correction: C1/C2/C9 scanner and forbidden-edge controls
untouched and green; C3 legacy quarantine and export digests untouched and green (1905/1905);
C5 twelve deferrals untouched; C6 private/refusal-only untouched; C7 thirteen retained assertions
untouched (architecture 199 → 205, the +6 being the new C4 cases); C8 E1 preparation still pinned
and unaccepted; C4 relational comparisons and recomputation preserved with the front door fixed.
No new prose, scanner, evidence-guard, or legacy change was needed.

### Prior findings

| Id | Round | Disposition |
|---|---|---|
| **K10-R5-01** | 5 | **Closed.** Row discovery rebuilt from GFM; 24 omitted-edge controls across all four tables × both orders plus adjacent-syntax cases, all through the production parser; H5-silent vs committed-flagged demonstrated in `08`. |
| K10-R4-01/-02 | 4 | Remain closed; controls unchanged and green. |
| K10-R1-01/-02, K10-R2-01/-02, K10-R3-01 | 1–3 | Remain closed; controls unchanged and green. |
| K1.0-SELF-01 … -10 | 1–5 | Remain closed; evidence-record guard and all earlier controls unchanged. |

### Additional self-found defects (separate provenance)

| Id | Defect | Disposition |
|---|---|---|
| **K1.0-SELF-11** | While re-deriving the front door from GFM instead of patching the reviewer's literal, three adjacent legal forms in the same subsystem were also silent or mishandled: a pipe-less body line inside the table block (Example 202) vanished entirely; an alignment-colon delimiter (`:---`) would have been read as a data row under the old `^-+$` filter; and a fully edge-less header/delimiter/table would have vanished into "not documented". None was named in K10-R5-01. | **Fixed** in C by the same reconstruction; asserted by two new cases (pipe-less before/after; delimiter/header/escaped-pipe variants including the alignment, edgeless, and `\|` forms). No other in-scope row-discovery alias was found; the one `k0` match is frozen and out of scope. |

### Unresolved obligations and their unblock conditions

1. **`tests/conformance/k0` remains frozen** — its comment still names the pre-rename guard path;
   bytes pinned by benchmark E1. Assigned to K1.4.
2. **The allowed-leaf list is empty**, so the real tree never exercises a non-empty allowlist; two
   fixture controls do. Unblocked by K1.1.
3. **Three deliberate extractor exclusions** — `reference lib`, JSDoc import types, bare `require()` —
   recorded in the contract's limits.
4. **The evidence-record guard checks manifests, not reports.** A digest quoted in an
   `implementation-*.md` is not compared to anything; only manifests are. Extending it is available to
   any later packet that wants it, and is not claimed here.
5. **Static guarantees only.** These guards constrain dependency direction in source and the accuracy
   of this packet's own records. They establish nothing about durability, isolation, Driver fidelity
   or protocol correctness.

## Validation and interpretation

Exact commands, environment, exit codes, counts and digests are in
[`validation-06/MANIFEST.md`](validation-06/MANIFEST.md). All ran from
`/Users/rex-shih/Documents/ArrokothI/arrokothi` against the clean payload tree at C, on
Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0.

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | 1905 tests, 285 suites, 0 fail, 0 skipped |
| `npm run test:conformance` | 0 | 1792 tests, 266 suites, 0 fail, 0 skipped |
| `npm run check:builder-docs` | 0 | 26 Markdown files, 284 links/anchors, 38 public package imports |
| `npm run test:kernel` | 0 | 4 tests, 0 fail |
| `npm run test:sdk` | 0 | 22 tests, 0 fail |

Suite 1899 → 1905; conformance 1786 → 1792; architecture 199 → 205. Nothing removed, skipped
or weakened; `legacy-core-boundaries.test.ts` still reports the same 13 assertions it had at base,
and `tests/conformance/k0` is byte-identical to the base.

**Checks not run.** `npm run test:evals` — this packet changes no Agent or model-facing behaviour and
nothing in the diff is reachable from an eval. The limit is that this candidate offers no evidence
about Agent behaviour and claims none.

**External fixture, gate and decision, stated separately.** Unchanged: the benchmark E1 preparation
was inspected, not executed, and is accepted by nobody. No E1 schedule ran here, no E1 criterion is
closed, and the structural pass earns no evidence credit.

**Why the evidence supports C4** (implementer assessment, not acceptance). C4 failed because a
syntactically valid contradictory row could avoid the total reader through omitted edge pipes. Row
discovery is now the GFM table-block rule shared by all four tables, the key-before-value reader is
unchanged, and the demonstration shows H5-miss vs committed-flag across the full edge×order×table
matrix plus a pipe-less challenger the reviewer did not name, with the baseline still green. The
strongest thing that would still get past it is a wrong assertion in *prose* outside the four
tables, which no oracle here reads and which the contract does not claim to check.

**Design choices.** Rebuilding `tableRows` around header+delimiter block detection was preferred
over whitelisting "missing trailing pipe": the latter would have left leading, both-missing,
pipe-less, alignment-delimiter, and escaped-pipe spellings for the next round, repeating the
R3→R4→R5 pattern. Breaking only on blank/fence/heading/blockquote keeps the change minimal for
this document's sections while remaining fail-closed (any extra line inside the block becomes
unreadable/duplicate rather than silence).

**Owner amendments.** None this round. The round-1 E1 dependency amendment stands.

**Strongest remaining risk.** Unchanged: these are static guarantees about source and about this
packet's own records. A future packet could satisfy every rule here and still reproduce the legacy
execution model in new files inside the zone; K1.4's behavioural recheck is where that would surface.

**Third-party review under AGENTS.md.** None. No dependency was added, no third-party source copied,
adapted or vendored; the only specification referenced is the public GFM table extension for
grammar, not code reuse. `package-lock.json` is unchanged this round.

## Handoff

- **Ready for independent review.** The one open finding is closed with distinguishing evidence that
  is silent on H5 and flagged on C. One adjacent-syntax defect was self-found in the same subsystem
  and is reported with separate provenance. Five obligations are recorded unresolved with named
  unblock conditions.
- Base, previous reviewed H5, C and H, and the verified push SHA are supplied in the external owner
  handoff.
- No self-acceptance is claimed, nothing is merged, and no successor is started or released.
