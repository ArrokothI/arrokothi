# Implementation report — K1.0, round 15

## Identity

- **Packet / parent:** K1.0 — target boundary and legacy quarantine; parent milestone K1.
  **Contract:** [`contract.md`](contract.md), **revision 15**.
  **Governing process baseline:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
- **State:** `CHANGES_REQUESTED` → `IN_PROGRESS` → `WAITING_FOR_REVIEW` (correction of the same
  released packet; 006 makes corrections on a released packet permission-free). **Owner release:**
  2026-09-13, verbatim in the contract's *Release provenance* section, with the benchmark E1
  dependency treated as built-but-unaccepted fixture preparation.
- **Prerequisite:** K0.2, independently ACCEPTED at H16 `90a6f37eaeb61009025449a1abc7e6d31dc1dbb2`,
  integrated as `0535160e677231da41b06d9f822e62e2f0364dd1`.
- **Branch:** `codex/k1.0-target-boundary-legacy-quarantine`; configured remote `origin`
  (`ArrokothI/arrokothi`).
- **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`, re-verified this session as exactly the
  advertised remote `main` (`git ls-remote origin main`, recorded in
  [validation-15/01](validation-15/01-tree-and-environment.log)).
- **Previous reviewed H14:** `0a9333faa7ea9cdf742f01b16af1069357b88bad`, clean payload C14
  `933e357a2d1fab9660f8af4a89b3031594dd3caa`.
  **Round-14 review record:** [`review-14.md`](review-14.md), recorded by
  `9d66313ddc3b90503b666efb4f0079775e7fe9ff`, which ACCEPTED that exact H14.
  **Authoritative second review:** [`review-15.md`](review-15.md), recorded by `d21dc58`, which
  found C4 defect **K10-R14-01**, returned CHANGES REQUIRED and invalidated using review-14's
  ACCEPT as the basis for integration or dependent release. Both records are preserved unchanged;
  this round rewrites neither.
- **Inbound branch head at session start:** `3616031dfdacafbc85d15bcf9e3c416638212ef7`, the owner's
  status transcription of review-15, and the advertised remote branch SHA. Advertised remote `main`
  remained exactly base. Benchmark E1 preparation was rechecked read-only from the contract's
  *Release provenance* identities (branch `codex/e1-kernel-acceptance-capture`, C2
  `d8f17549c31f9ee5d995e773c2f211faed2785fb` / H2 `8de04779d279dba82cf834d419e465d2b677ef46`,
  benchmark `main` `5a3f1ba525f68244701b1f73a1d29c4902ffe589`): built, accepted by nobody, closes
  no E1 criterion. No E1 result is claimed; no benchmark artifact was touched.
- **Payload C:** `2ef6f9803ff6f529ed5ffac0709299b49ebf904c`. Its parent is exactly
  `3616031…`, so the correction interval is `3616031…..2ef6f980…`, one commit touching contract
  revision 15, `inventory-oracle.ts`, `kernel-landing-zone.test.ts` and
  `docs/development/007-work-packets.md` (the last for K1.0-SELF-25, below).
- **Candidate H:** the commit containing this report. Its full SHA is supplied in the external
  handoff, after the push; it cannot be named from inside itself.
- **Exact C..H administrative allowlist:** `docs/development/work/K1.0/implementation-15.md`;
  `docs/development/work/K1.0/validation-15/` (MANIFEST.md and ten declared output-only `.log`
  attachments); and the status transcriptions in `docs/development/007-work-packets.md`,
  `docs/development/001-current-status-and-roadmap.md` and `docs/development/README.md`. No source,
  test, fixture, script, evaluator, threshold, package or configuration content first appears in H.
  **007 appears in both C and H, deliberately and for different reasons:** C restores the ledger
  body that the inbound commit truncated and reconciles the K1.0 row to the owner's own
  CHANGES_REQUESTED paragraph; H then transcribes the round-15 status. The two edits are disjoint
  and both are visible in the respective diffs.
- **Working tree:** clean at C apart from `validation-15/`, which the validation run itself writes;
  clean at H. **Push:** performed after H exists; the advertised remote SHA is verified and reported
  in the external handoff, not claimed here.

## Changes and coverage

### The open reviewer finding

**K10-R14-01 — P2 — ATX title normalization can erase NBSP and create a false governed-section
boundary. Disposition: CLOSED by making every C4 heading and row identity obey the pinned GFM
character classes instead of a host normalizer.**

`parseAtxHeading` derived heading content with `after.trim().replace(/[ \t]+#+[ \t]*$/, "").trim()`.
`String.prototype.trim()` removes every ECMAScript `WhiteSpace`/`LineTerminator` character, so
NBSP U+00A0 — and U+FEFF, U+3000, U+2009, U+2028/U+2029, U+1680, U+202F, U+205F and U+2000–U+200A —
was deleted from a heading's semantic content. `rangeFromScanned` ends a governed section when a
level-2 heading's text equals the configured next title *exactly*, so a line whose real content is
`<NBSP>What this packet does not establish` collapsed onto that title, terminated the Deferred
section at a boundary the grammar does not put there, and removed every later row — including a
planted contradictory further table — from C4's total, fail-closed accounting.

**What the correction is, at the abstraction the finding belongs to.** Not a filter on NBSP. The
packet had already established, in revision 13, that "every C4 Markdown lexical predicate uses the
character class defined by the governing GFM production" — and then exempted two predicates in the
same sentence: "List markers, indentation, thematic breaks, ATX heading text and table-cell
normalization keep their own grammar rules and are deliberately untouched." List markers,
indentation and thematic breaks really do have their own explicit `[ \t]` classes. ATX heading text
and table-cell normalization did not: they had `trim()`. The exemption was the defect. Revision 15
removes it and derives the classes those two paths actually need:

- **Block-structure whitespace** (§2.2), exactly SPACE and TAB, fixes where block content *starts*:
  the required separator after an ATX opening sequence, the offset at which heading content begins,
  and a table row's indentation. A leading VT or FF is therefore heading content, not padding.
- **The §2.1 whitespace class** (SPACE, TAB, LF, VT, FF, CR) governs every *right*-strip: the end of
  heading content, the character an optional closing `#` run must be preceded by, the end of a table
  row, and the two ends of a cell.
- **Unicode whitespace** is neither. It is content, at every position, in both paths.

`stripAtxContent` states GFM 0.29 §4.2 in three ordered steps with those classes; `gfmRowContent`
and `gfmTrim` state the tables extension's two. `parseAtxHeading` no longer normalises any text
itself, and its separator test narrows from `[ \t\r]` to `[ \t]` — CR is unreachable inside a
physical line because `splitPhysicalLines` (§2.1, K10-R13-01) is the only producer of the lines it
sees and consumes every CR as a line ending.

**Adjacent cases, audited from the grammar rather than blacklisted.** Every ATX position and both
sequence boundaries were re-derived, and the audit is committed as evidence
([validation-15/09](validation-15/09-atx-whitespace-audit.log)) with the expected value for each
line taken from the published spec, Examples 41–47 included:

| Case | Reviewed H14 | C | Governing rule |
|---|---|---|---|
| `## <NBSP>Title` | `Title` (false boundary) | `<NBSP>Title` | U+00A0 is Unicode whitespace, not §2.2 |
| `## Title<NBSP>` | `Title` (false boundary) | `Title<NBSP>` | not in the §2.1 right-strip class |
| `## Title ##<NBSP>` | `Title` (false boundary) | `Title ##<NBSP>` | the `#` run is not at the end after the §2.1 right-strip |
| `## <U+3000\|U+FEFF>Title`, `## Title<U+2009>` | `Title` (false boundary) | unchanged content | same class, three further characters |
| `## <VT>Title`, `## <FF>Title` | `Title` (false boundary) | `<VT>Title` | VT/FF are §2.1 whitespace but not §2.2 block-structure whitespace |
| `## Title<VT>` , `## Title<FF>` | `Title` | `Title` | §2.1 right-strip — the asymmetry is real and both sides are pinned |
| `## Title<VT>##` | `Title<VT>##` (over-extends) | `Title` | the closing run may be preceded by any §2.1 whitespace, not only `[ \t]` |
| `### ###`, `## ###` | `###` | `` | Example 47: the run reaching the start of the content |
| `# foo#`, `### foo \###`, `### foo ### b` | unchanged | unchanged | Examples 44–46: runs the grammar does not recognise stay content |
| `##<NBSP>Title`, `##<VT>Title`, `##Title` | not a heading | not a heading | §4.2 requires SPACE/TAB or EOL after the opening sequence |
| `####### Title`, `    ## Title` | not a heading | not a heading | six-hash limit; four columns is indented code |

C matches the derived grammar value on all 27 cases; H14 differs on 11, in **both** directions. The
two over-extending H14 rows matter for honesty about the correction's shape: this is a class
reconstruction, not a one-way tightening, and the committed GREEN controls would fail on a patch
that merely refused NBSP.

**Why the prior pass missed it.** Round 13 reconstructed the lexical classes it had *named* and
wrote down its own list of which predicates had classes. Round 14 then went one layer beneath that
list — physical-line tokenization — and inherited the list itself without re-deriving §4.2. The
exemption sentence was carried forward through three rounds and three reviews as if it were an
observation about the code, when it was an assumption about the code. The correction therefore
restates the invariant in a form that admits no exemption, and says explicitly that a host
normalizer is never the rule for a structural identity, because host classes are defined by Unicode
and the governed identities are defined by the pinned grammar.

### Additional self-found defects (separate provenance)

**K1.0-SELF-24 — the same host-trim substitution in table row and cell normalization. Corrected.**
Found by carrying the finding's question — "where else is a governed identity decided by a host
normalizer?" — through the rest of the parser rather than stopping at the reported line.
`splitGfmRow` trimmed each cell with `trim()` and three call sites reduced a physical line to row
content with `line.trim()`. Consequences, both in C4's forbidden class: a cell whose real token is
`DX-1<NBSP>` compared equal to the policy's `DX-1`, so a wrong association survived with the token
set unchanged; and `<NBSP>| a | b |` lost its first cell, so a line GFM renders as a paragraph was
read as a two-cell row that could match a delimiter GFM would not match. Both now follow the tables
extension's own classes. Five committed controls; four of the five fail against H14.

**K1.0-SELF-25 — the inbound status commit truncated 007, leaving a frozen K0 conformance test red
at the branch head. Restored.** `3616031` ("status(K1.0): reopen after second-review finding") is
recorded as 6 insertions and **242 deletions**: it wrote the CHANGES_REQUESTED paragraph and, in the
same commit, cut `docs/development/007-work-packets.md` from 378 lines to 142, deleting every packet
definition from K2.1 onward. `tests/conformance/k0/cited-decisions.test.ts` asserts that each
assigned K0 obligation names a real 007 packet heading; `R1-f` is assigned to K5.2, whose heading
went with the truncation, so `npm test` and `npm run test:conformance` were **red at the inbound
branch head, before any change in this round** (reproduced and recorded before editing anything).
C restores the ledger body byte-for-byte from `9d66313`; the resulting file differs from that
revision only by the owner's CHANGES_REQUESTED paragraph and the K1.0 status row, which C reconciles
to it. This is a repair of a transport accident in an administrative commit, not a scope or status
decision: no packet's scope, dependency, acceptance or owner text is altered, and the diff in
[validation-15/01](validation-15/01-tree-and-environment.log) shows exactly that. It is payload
rather than administrative because it changes a test result.

**K1.0-SELF-26 — round-12 control constants were literal control bytes although their comment said
escapes. Corrected.** The K10-R12-01 block's comment claims "VT/FF/NBSP are written with escapes so
the source stays printable"; the file actually carried raw U+000B/U+000C/U+00A0 bytes. All eleven
such declarations (round 12's and this round's) now use `\uXXXX` escapes. `"" === "\x0B"`, so
this is semantics-preserving; it only makes the source say what it claimed.

**K1.0-SELF-27 — three uncalled section wrappers. Removed.** `sectionRange`, `sectionLines` and
`sectionText` had no live caller at H14 (`sectionText` was called only by nothing; `sectionLines`
only by `sectionText`; `sectionRange` by nothing). `sectionTables` is the single consumer of a
section boundary and calls `rangeFromScanned` against its own `scanBlocks` result. They carried doc
comments describing the live invariant, which invites a future reader to treat dead code as the
load-bearing path — and `sectionText` in particular was `sectionLines(...).join("\n")`, a helper
that reassembles already-tokenized physical lines into one string, exactly the shape K10-R7-01 and
K10-R13-01 each had to undo. `splitPhysicalLines` now has one producer, one consumer and no path
back to a string. Typecheck and the full suite prove nothing depended on them.

**K1.0-SELF-28 — the contract's C4 evidence count was stale by 19. Corrected.** The C4 evidence cell
read "100 cases plus 16 mutated-document controls", a figure last updated at revision 11. Rounds 12,
13 and 14 each added cases and described the growth in their revision notes without updating the
cell. Measured at H14 the block held 119 cases plus the 16 controls; at C it holds 131 plus 16. The
cell now reads 131, and the revision-15 note states the H14 measurement so the discrepancy is
visible rather than quietly overwritten.

### Audited and deliberately not changed

- **`evidence-records.test.ts`'s `sections()` helper** scans manifests with `line.startsWith("## ")`
  and `line.slice(3).trim()`. That is the same host normalizer, so it was audited rather than
  assumed safe. It is not a GFM parser and makes no grammar claim: its input is this packet's own
  manifests, its only consumer is `isCorrection(heading)`, and the divergence it can produce is
  cosmetic — `## <NBSP>Correction, round n` reads as a correction section to the scanner *and* to a
  human reading the rendered manifest, while `##<NBSP>Correction` matches neither. No reachable
  fail-open was found, so it is left alone and recorded here rather than churned. Its declared
  limits (no fence awareness, `"## "` only) are unchanged from earlier rounds.
- **`isThematicBreak`, `parseListMarker`, `updateFence`, `indentWidth`, `isGfmBlankLine`** use
  explicit `[ \t]`/`[ \t\r]` classes, never `\s` or `trim()`. Their `\r` members are unreachable
  after §2.1 tokenization, i.e. dead but not wrong; they are accepted code and are left unchanged.
  Only `parseAtxHeading`'s separator narrowed, because that predicate was being rebuilt anyway and
  a class that claims "SPACE or TAB" should not silently contain CR.

### Change groups, ownership and governing sources

| Group | Files | Ownership | Governing source |
|---|---|---|---|
| ATX heading identity + table row/cell classes | `tests/conformance/architecture/inventory-oracle.ts` | C4 evidence parser (conformance test support, not Kernel) | Published GFM 0.29 §2.1, §2.2, §4.2 (Examples 41–47) and the tables extension |
| Twelve new controls, escape-literal cleanup | `tests/conformance/architecture/kernel-landing-zone.test.ts` | C4 evidence | Contract C4; 012 deterministic-execution method |
| Contract revision 15 | `docs/development/work/K1.0/contract.md` | Packet requirement map | 006/008 |
| 007 ledger restoration + row reconciliation | `docs/development/007-work-packets.md` | Owner-owned status ledger; repair only | 006 status rules; the ledger's own prior revision `9d66313` |

**Cumulative diff base..C:** 187 files changed, 88 654 insertions, 36 deletions (13 218 insertions
outside the `validation-*` evidence directories). **Correction delta `3616031…..C`:** 4 files
changed, 768 insertions, 61 deletions. Both are recorded in
[validation-15/01](validation-15/01-tree-and-environment.log).

**Selected 012 methods and material exclusions:** unchanged from the contract — deterministic
execution carries C1/C2/C3/C7/C9 and, this round, the whole of the C4 correction; process/
documentation carries C4's record side, C5, C6 and C8; packaging/release is used only negatively
for C6. Race and fault, native Runtime/Driver and external evidence/gate remain materially excluded
for the reasons the contract states.

### Obligation and interaction coverage

| Obligation | Input, including the negative case | Expected facts / forbidden | Location and result |
|---|---|---|---|
| C4 heading identity (K10-R14-01) | Six Unicode-whitespace positions, two leading VT/FF, three non-separator forms, eight exact-heading twins, a non-exact *current* heading with its TAB twin, a document-wide TAB re-separation | A non-exact heading must not delimit; the planted contradictory table must be reported; a genuine exact heading must still terminate. Forbidden: a section boundary manufactured by host trimming | `kernel-landing-zone.test.ts` "GFM ATX heading identity and structural whitespace (K10-R14-01)", 7 tests — pass; 5 of 7 fail on H14 |
| C4 ATX content grammar | 27-entry `scanBlocks` primitive matrix | Each line's content equals the value derived from §4.2 with §2.1/§2.2 classes | same block, 1 test — pass; H14 differs on 11 entries |
| C4 row/cell identity (K1.0-SELF-24) | Padded key, padded value, padded publishability, Unicode-indented row, ASCII-padded preservation, document-wide trailing ASCII whitespace | A padded token is not the policy's token and must be reported; ASCII padding is still trimmed | `kernel-landing-zone.test.ts` "GFM table row and cell whitespace (K1.0-SELF-24)", 5 tests — pass; 4 of 5 fail on H14 |
| C4 ↔ C5 | The real inventory, unmutated | Every zone, DX and package relation still agrees in both directions | full C4 block 147/147 — pass |
| C4 prior corrections | Round-14 CRLF/LF/lone-CR, round-13 whitespace/blank-line, round-12 type-6 tokens, round-11/10/9/8 container, tag, fence and heading controls | All preserved and re-asserted; none removed or weakened | [validation-15/10](validation-15/10-c4-control-inventory.log) names every block; 177/177 in the file |
| C3 ↔ C7 (K1.0-SELF-25) | The inbound branch head's 007 | The frozen K0 fixture's assigned-owner assertion must pass; `tests/conformance/k0` must stay byte-identical to base | red at `3616031`, green at C; `git diff base..C -- tests/conformance/k0` empty |
| C1/C2/C6/C8/C9 | Unchanged inputs | No target-zone, policy, manifest, scanner or provenance content changed this round | 2021/2021 full suite; `git diff --stat` shows no such file in the correction interval |

### Tests added, ported or removed

Twelve tests added, all inside the C4 block, all driving the production `parseInventory` /
`inventoryDisagreements` path except one `scanBlocks` primitive matrix that pins the content grammar
directly. **None removed, none skipped, none weakened.** C4 block 135 → 147 leaf tests (119 → 131
cases plus the same 16 mutated-document controls); file 165 → 177; architecture suite 309 → 321;
conformance 1896 → 1908; full suite 2009 → 2021. No compatibility or refusal surface changed; no
baseline, guide or skill is materially affected (`npm run check:builder-docs` unchanged at 26/284/38).

### Semantic correction closure (012 §"Semantic correction closure")

1. **Invariant changed.** Previously: "every C4 Markdown lexical predicate uses the class defined by
   the governing GFM production — *except* ATX heading text and table-cell normalization, which keep
   their own rules." Now: the same sentence with no exception, plus the named §2.2 block-structure
   class alongside §2.1, and the explicit rule that a host normalizer is never a structural
   identity. Authoritative source: published GFM 0.29 §2.1/§2.2/§4.2 and the tables extension.
   Original counterexample: review-15's NBSP heading with a planted contradictory further table.
2. **Dependent rules and paths.** Who creates the fact: `parseAtxHeading` (heading text),
   `splitGfmRow` (cell text), `gfmRowContent` (row text). Who validates it: `rangeFromScanned`
   (section bounds), `sectionTables` (table discovery), `readKeyedTable` (key, duplicate, value),
   `inventoryDisagreements` (relation comparison). Who consumes it: `parseInventory` and
   `parseDependencyTable`, then the C4/C5 tests. Conceptual aliases searched, not only names:
   `trim`, `trimStart`, `trimEnd`, `\s`, `split(`, "whitespace", "blank", "normalis/ze" — across
   `inventory-oracle.ts`, `boundary-policy.ts`, `module-graph.ts`, `evidence-records.test.ts`,
   `kernel-landing-zone.test.ts` and the target zone. Findings: the four in-parser call sites
   (corrected), `evidence-records.test.ts`'s `sections()` (audited, left, reasoned above), and
   nothing in the Kernel zone, policy or module graph.
3. **Paths walked together.** Both ends of the heading (leading and trailing), both sequence
   boundaries (opening separator and closing run), the empty-content and all-`#` limits, the
   one-over case (seven hashes) and the indentation limit (four columns); for tables, the key cell,
   a value cell, the publishability cell, the row's leading and trailing edges, and a cell past the
   four the relation reads. Both section ends were walked, not only the terminating one: a
   non-exact *current* heading must fail to open the section and report a missing governed table.
   Material exclusion: inline-content rendering (emphasis, links, entity references) is not modeled
   and is not needed — section identity compares raw heading content, and the contract already
   states that unsupported constructs reach the reader as extra reports, never as silence.
4. **Re-audit.** The whole cumulative packet was re-checked after the correction, not only C4; see
   the criterion assessment below. Additional defects are recorded above with their own IDs.

### Prior findings

| Finding | Round | Disposition |
|---|---|---|
| **K10-R14-01** | 15 (review-15) | **CLOSED** this round by class reconstruction across heading and row/cell identity; 12 committed controls, 9 of which fail on H14; demonstration 08 and audit 09 |
| K10-R13-01 | 13 | **CLOSED** in round 14; physical-line tokenization preserved verbatim and re-asserted (08 rows: LF→CR and LF→CRLF whole-inventory equivalence still GREEN in both columns) |
| K10-R12-01 | 12 | **CLOSED** in round 13; whitespace/blank-line classes preserved and re-asserted (08 rows: VT type-7 opener and `<div<NBSP>x>` unchanged) |
| K10-R11-01 | 11 | CLOSED in round 12; type-6 boundary tokens preserved, re-asserted |
| K10-R10-01/-02/-03 | 10 | CLOSED in round 11; container-owned leaves, attribute separators and the GFM-0.29 `textarea`/`search` pin preserved, re-asserted |
| K10-R9-01, K10-R9-02 | 9 | CLOSED in round 10; container depth and the complete-tag recognizer preserved, re-asserted |
| K10-R8-01, K10-R8-02 | 8 | CLOSED in round 9; single-consumption layer preserved, re-asserted |
| K10-R7-01 | 7 | CLOSED in round 8; structural section membership preserved — and strengthened here, since a false boundary from host trimming was the residue of the same claim |
| K10-R6-01 | 6 | CLOSED in round 7; structural header/body split preserved |
| K10-R5-01 | 5 | CLOSED in round 6; GFM row grammar preserved |
| K10-R4-01, K10-R4-02 | 4 | CLOSED; key-before-value ordering and the evidence-record guard unchanged (the guard re-verifies validation-15's own digests) |
| K10-R3-01 | 3 | CLOSED; duplicate controls in both orders unchanged |
| K10-R2-01, K10-R2-02 | 2 | CLOSED; scanner reconstruction and relational comparison untouched |
| K10-R1-01, K10-R1-02 | 1 | CLOSED; unchanged |
| K1.0-SELF-08 … -23 | 4–12 | CLOSED; all controls unchanged and passing |
| K1.0-SELF-24 … -28 | 15 | Self-found this round; -24, -25, -26, -27, -28 corrected as described above |

**Unresolved obligations.** None owned by this packet is left for the reviewer. The contract's four
standing limits are unchanged: no E1 credit and no K1 acceptance; `tests/conformance/k0` frozen with
its stale comment assigned to K1.4; an empty allowed-leaf list exercised only by a fixture; static
guards that establish nothing about durability, isolation or Driver fidelity; and an unpublished
private zone with no packaged-artifact evidence. K1.0-SELF-21 remains an observation: no general
Markdown renderer was built, and this round's reconstruction demonstrated no further blocking
interaction with the absolute-indent fence/code corner.

## Validation and interpretation

- **Exact commands / cwd / C / environment / exits / counts / raw paths / digests:** every row of the
  validation-15 [MANIFEST](validation-15/MANIFEST.md) table. Cwd
  `/Users/rex-shih/Documents/ArrokothI/arrokothi` throughout; C
  `2ef6f9803ff6f529ed5ffac0709299b49ebf904c`; Node v25.2.1 / npm 11.6.2 / TypeScript 5.9.3 /
  Darwin 25.6.0 arm64. `npm run typecheck` exit 0 clean; `npm test` exit 0, 2021/2021, 298 suites,
  0 fail / 0 skipped; `npm run test:conformance` exit 0, 1908/1908, 279 suites, 0 fail / 0 skipped;
  `npm run check:builder-docs` exit 0 (26 / 284 / 38); `npm run test:kernel` exit 0, 4/4;
  `npm run test:sdk` exit 0, 22/22; demonstration 08 exit 0, 27 cases, 14 distinguishing, 13
  agreeing, 0 where C fails its own expectation; audit 09 exit 0, 27 heading cases with C matching
  the derived grammar value on all 27 and H14 differing on 11, plus 9 row/cell cases with H14
  differing on 3; control inventory 10 exit 0, 177/177. Raw logs 01–10 and their SHA-256 digests are
  the MANIFEST attachments; the committed `evidence-records.test.ts` guard re-verifies those digests
  inside the same suite run.
- **External fixture prepared / gate executed / external decision, separately:** benchmark E1
  preparation unchanged from the contract's *Release provenance* (branch
  `codex/e1-kernel-acceptance-capture`, C2 `d8f17549c31f9ee5d995e773c2f211faed2785fb` / H2
  `8de04779d279dba82cf834d419e465d2b677ef46`, benchmark `main`
  `5a3f1ba525f68244701b1f73a1d29c4902ffe589`): built, inspected at release, accepted by nobody,
  closes no E1 criterion. No E1 result is claimed; no benchmark artifact was touched. No gate was
  executed and no external decision was obtained this round.
- **Checks not run and resulting claim limits:** `npm run test:evals` was not run. This packet
  changes no Agent or model-facing behaviour and nothing in the diff is reachable from an eval; the
  claim is limited accordingly. There is no lint or build script in this repository, so the relevant
  static check is `npm run typecheck` and the relevant link/import check is
  `npm run check:builder-docs`, both run and green.
- **Why the evidence supports each criterion (implementer assessment, not acceptance):**
  **C1/C2** — the target-zone walk and the 23 forbidden-edge controls are untouched by the
  correction interval and green inside the 2021-test suite; no file under `packages/kernel` or
  `boundary-policy.ts` appears in the diff. **C3** — full suite 2021/2021 and typecheck clean; the
  export map and the five sorted-name digests are unchanged; no legacy source moved. Note that C3
  is *stronger* than at H14 in one respect: the suite was red at the inbound branch head and is
  green at C. **C4** — 147/147 in the C4 block including the twelve new controls, the 27-case
  H14→C demonstration (strongest row: the reviewer's own NBSP counterexample, H14 GREEN with the
  planted table hidden, C RED(2) naming both of its rows), and the 27+9-case grammar audit in which
  C matches the derived spec value everywhere. **C5** — the twelve deferrals are untouched and still
  assigned to packets 007 declares; K1.0-SELF-25 matters here, because the restored ledger is what
  makes "a packet that exists in 007" checkable at all. **C6** — the target package is untouched,
  still `private`, still refusal-only. **C7** — the legacy quarantine assertions and the 326-source
  scanner-identity control are green; the suite grew only by addition. **C8** — the E1 identities
  are recorded with their unaccepted status and no result is claimed. **C9** — the scanner and
  evidence machinery are untouched and green, and `tests/conformance/k0` is byte-identical to base.
- **Design choices, owner amendments, assumptions, strongest remaining risk:** the leading/trailing
  asymmetry in ATX content is a deliberate fidelity choice, not an oversight — §2.2 fixes where
  content starts and §2.1 governs the right-strip — and both halves are pinned by GREEN and RED
  controls so a future simplification to one class would fail. Where the published prose says
  "spaces" and the reference implementation's behaviour is the six ASCII whitespace characters, the
  code follows the class that the spec's own §2.1/§2.2 definitions and Examples 6 and 41–47 support,
  and says so at the site. No owner amendment was sought: aligning with the GFM 0.29 rules the
  contract already cites needs none, and K1.0-SELF-25 is a byte-level restoration of the ledger's
  own prior revision rather than a status or scope decision. **Strongest remaining risk:** this
  round corrected an *exemption* that survived three rounds because it was written down as a fact.
  The same shape could exist in another sentence of the packet's own documentation that no test
  pins. The mitigation used here — deriving each case from the pinned spec and committing the
  derivation as evidence (09) rather than only the assertions — narrows but does not eliminate it.
  The residual SELF-21 corner (absolute-indent fence/code disambiguation inside deep containers) is
  untouched and behaviour-neutral on every pinned control.
- **Third-party review under AGENTS.md:** none. No third-party code, dependency, service, asset or
  bundled material was learned from, used, copied or adapted in this round. The only external
  reference is the published GitHub Flavored Markdown 0.29 specification already cited by the
  contract, consulted as a rule source; no specification text was copied into the repository, and
  its rules are restated in the implementers' own words at the sites that implement them.

## Handoff

- Ready for independent review. Remaining work in this packet: none.
- Base / C / H and the verified advertised remote SHA are supplied externally after the push; no
  offline bundle is needed (push is available).
- No self-acceptance. Review-14's ACCEPT of H14 remains a preserved historical record and is **not**
  carried forward to this candidate; K1.0 stays unaccepted until a fresh independent review of this
  H returns ACCEPT. Successor release remains owner-controlled. No E1 result, no K1 acceptance.
