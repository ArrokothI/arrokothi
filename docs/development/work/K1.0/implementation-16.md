# Implementation report — K1.0, round 16

## Identity

- **Packet / parent:** K1.0 — target boundary and legacy quarantine; parent milestone K1.
  **Contract:** [`contract.md`](contract.md), **revision 16**.
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
  advertised remote `main`.
- **Previous reviewed H15:** `d3d614f6cee4393d4ac63ecc2f29045b205505ff`, over clean payload C15
  `2ef6f9803ff6f529ed5ffac0709299b49ebf904c`.
  **Deciding review record:** [`review-16.md`](review-16.md), recorded by `79761f6`, which returned
  CHANGES REQUIRED with one open finding **K10-R15-01** (P2, C4), recorded **K10-R14-01 CLOSED**,
  and gave C1–C3 and C5–C9 PASS. [`review-14.md`](review-14.md) and [`review-15.md`](review-15.md)
  are preserved byte-unchanged alongside it; this round rewrites none of the three.
- **Inbound branch head at session start:** `6e08fabb90766dbdcf9cf1a2dc6bfc4215dc8037`, the status
  transcription that reopened the packet to `CHANGES_REQUESTED`, and the advertised remote branch
  SHA. Advertised remote `main` remained exactly base. Benchmark E1 preparation was rechecked
  read-only from the contract's *Release provenance* identities (branch
  `codex/e1-kernel-acceptance-capture`, C2 `d8f17549c31f9ee5d995e773c2f211faed2785fb` / H2
  `8de04779d279dba82cf834d419e465d2b677ef46`, benchmark `main`
  `5a3f1ba525f68244701b1f73a1d29c4902ffe589`): built, accepted by nobody, closes no E1 criterion.
  No E1 result is claimed; no benchmark artifact was touched.
- **Payload C:** `d693d59aefe5335c8950d57cec6d6b57e375cadc`. Its parent is exactly `6e08fabb…`, so
  the correction interval is `6e08fabb…..d693d59a…`, one commit touching contract revision 16,
  `inventory-oracle.ts`, `kernel-landing-zone.test.ts` and the K1.0 paragraph and row in
  `docs/development/007-work-packets.md`.
- **Candidate H:** the commit containing this report. Its full SHA is supplied in the external
  handoff, after the push; it cannot be named from inside itself.
- **Exact C..H administrative allowlist:** `docs/development/work/K1.0/implementation-16.md`;
  `docs/development/work/K1.0/validation-16/` (MANIFEST.md and ten declared output-only `.log`
  attachments); and the status transcriptions in `docs/development/007-work-packets.md`,
  `docs/development/001-current-status-and-roadmap.md` and `docs/development/README.md`. No source,
  test, fixture, script, evaluator, threshold, package or configuration content first appears in H.
  007 appears in both C and H for different reasons, as in round 15: C reconciles the K1.0
  paragraph and row to review-16 as the deciding record, H transcribes the round-16 status. The
  restored ledger body — 385 lines, 35 `###` packet headings including K5.2 — is untouched by both.
- **Working tree:** clean at C apart from `validation-16/`, which the validation run itself writes;
  clean at H. **Push:** performed after H exists; the advertised remote SHA is verified and reported
  in the external handoff, not claimed here.

## Changes and coverage

### The open reviewer finding

**K10-R15-01 — P2 — C4: the correction substitutes the broad §2.1 whitespace class where GFM
requires structural space/tab semantics. Disposition: CLOSED by deriving the class each ATX and
table position's own production names, rather than sharing one class across the parser.**

#### What I rederived, before touching the implementation

Review-16 instructed that neither contract revision 15, implementation-15, validation-15/09 nor the
committed tests be used as the oracle, because all four encode the reviewed mistake. They were not.
The derivation below comes from the published GFM 0.29 sentences, which are quoted verbatim in the
evidence ([validation-16/09](validation-16/09-whitespace-class-audit.log)) so that a reviewer can
check each rule against the text rather than against my prose.

§2.1 defines a *whitespace character* as one of six — SPACE, TAB, LF, VT, FF, CR — and separately
defines *Unicode whitespace* and *blank line*. §2.2 says tabs are not expanded to spaces, "however,
in contexts where spaces help to define block structure, tabs behave as if they were replaced by
spaces with a tab stop of 4 characters". §4.2 then says, of ATX headings:

- "The opening `#` character may be indented 0-3 **spaces**."
- "The opening sequence of `#` characters must be followed by a **space** or by the end of line."
- "The optional closing sequence of `#`s must be **preceded by a space** and **may be followed by
  spaces only**."
- "The raw contents of the heading are stripped of leading and trailing **spaces** before being
  parsed as inline content."

Five positions, and §4.2 names *space* at all five. §2.2 adds *tab* at all five, because all five
are positions where spaces define block structure. **§4.2 never cites the §2.1 definition.** The
productions that do cite it by name are §4.6's type-1/6 raw-HTML start boundaries and the §6.10
complete-tag grammar — the two places round 13 correctly gave it. So the §2.1 six was never the
ATX class; revision 15 borrowed it from a neighbouring production.

The tables extension is the second half. Its published examples surround cell content with spaces
and render it without them, and the extension defines no trim over the §2.1 set. The row's leading
run is block indentation, which is block structure by definition. So cell and row edges take the
same SPACE/TAB class.

**Where the reading is not forced, C4 now takes the narrower class deliberately, and says why.** A
class that is too narrow can only fail to recognise a boundary the grammar allows: the governed
section over-extends and *more* further-table reports appear. A class that is too broad manufactures
a boundary the grammar forbids: the section truncates and evidence disappears silently. C4's
obligation is total, fail-closed accounting, so silence is the error that must be excluded first.
This is now written into the parser's invariant, not left as an unstated preference, because it is
the rule that decides the residual cases in both this finding and the last one.

#### The complete path, transition by transition

Review-16 asked for the whole chain, with the owning class named at each whitespace-sensitive
transition. Every row was re-derived; the last column says what changed this round.

| # | Transition | Owning production and class | Round 16 |
|---|---|---|---|
| 1 | source → physical lines | §2.1 line ending: LF, CR, CRLF | unchanged (K10-R13-01) |
| 2 | physical line → ATX opening eligibility | §4.2 indent 0–3 **spaces** + §2.2 tab stops; 4 columns is indented code | unchanged; `indentWidth` already column-correct |
| 3 | opening sequence | §4.2 1–6 unescaped `#` | unchanged |
| 4 | separator after the opening sequence | §4.2 **space** or EOL, §2.2 tab → `[ \t]` | unchanged (already narrowed in round 15) |
| 5 | content start | §4.2 strip leading **spaces**, §2.2 tab → `[ \t]` | unchanged |
| 6 | raw content end | §4.2 strip trailing **spaces**, §2.2 tab → `[ \t]` | **narrowed** from the §2.1 six |
| 7 | closing-run predecessor | §4.2 "preceded by a **space**", §2.2 tab → `[ \t]`, or the opening separator when the run reaches the content's start | **narrowed** from the §2.1 six |
| 8 | closing-run follower | §4.2 "followed by **spaces** only" — enforced by requiring the run to end the content after step 6 | **narrowed** with step 6 |
| 9 | exact heading identity | string equality against the configured title | unchanged, but now fed the corrected content |
| 10 | `rangeFromScanned` | depth-0, non-raw, level-2, exact title | unchanged |
| 11 | governed section membership | first exact current title → first later exact next title | unchanged |
| 12 | table discovery | header above a delimiter row with matching cell count | unchanged |
| 13 | row normalization | tables extension; leading indentation and trailing run, SPACE/TAB | **narrowed** from the §2.1 six at the trailing end |
| 14 | cell normalization | tables extension "spaces around cells are trimmed", SPACE/TAB | **narrowed** from the §2.1 six at both ends |
| 15 | keyed relation identity | `/^DX-\d+$/`, backticked extraction, exact token comparison | unchanged, but now fed corrected cells |
| 16 | `inventoryDisagreements` | relation comparison in both directions | unchanged |

Adjacent positions audited and found already correct, so deliberately not touched: the §4.5 fence
closer tail (`[ \t\r]`), the §4.1 thematic-break tail, the §5.2 list-marker gap and trailing run,
the §2.1 blank-line predicate (SPACE/TAB only), and `indentWidth`'s tab-stop arithmetic. Their `\r`
members are unreachable after step 1 and were already documented as such. The §2.1 six remains
exactly where it was at §4.6 and §6.10, and [validation-16/01](validation-16/01-tree-and-environment.log)
prints every call site of both classes so that confinement is checkable rather than asserted.

#### The observable outcome

`## What this packet does not establish<VT>##` is now a heading whose content is
`What this packet does not establish<VT>##`, which is not the configured next title. With a
contradictory further table planted after it and a genuine exact heading after that, the governed
Deferred section runs through the planted table and reports both of its rows. Under the reviewed H15
the same document produced **no** messages at all. The FF analogue behaves identically, as the
derivation predicts. Both are committed controls and both appear in
[validation-16/08](validation-16/08-r1501-demonstration.log).

On the table side, `DX-1<VT>` and `DX-4<FF>` key cells now reach the keyed reader as rows with no
recognisable key — reported twice over, since the policy's row is then also missing — and
`<VT>migratable` / `migratable<FF>` value cells are reported as a different disposition token. Under
H15 all four were silently the policy's row.

#### Why validation-15/09 derived the wrong expected value, and what is different now

Round 15's audit printed three columns: a hand-typed *expected*, H14 and C. The expected column was
typed by the same author who had just written `stripAtxContent`, from the same reading of §4.2. When
that reading was wrong, the expected column was wrong in exactly the same way, the audit reported
"C matches the derived GFM value on all 27 cases", and the report repeated that as evidence. An
oracle that restates the implementation's intent cannot detect the implementation's misreading; it
can only detect a typo between intent and code.

The change is structural, not a promise of more care:

1. The expected column is now **executed, not typed**. `gfm-reference.mts` is a separate module that
   transliterates the quoted §2.1/§2.2/§4.2/tables sentences one at a time. It imports nothing from
   the parser and shares no helper.
2. It is written in a **different shape**: a left-to-right index walk over the whole physical line in
   the sentences' own order, where the parser normalises the substring after the opening sequence.
   A shared structural assumption has fewer places to hide.
3. The audit compares **three** executed columns and explicitly counts the rows where H15 and C agree
   while the reference differs — the shape that would reveal an assumption shared across rounds. It
   is 0.
4. The sentences the reference implements are **printed above the table**, so the part a reviewer
   checks is the published text, not my summary of it.
5. The reference is checked for **non-vacuity** against the real document: it and C are run over all
   117 physical lines of the ownership inventory and agree on every line, including which 7 are ATX
   headings and their exact content.

What this does not fix, and I will not claim it does: one author still wrote both. A misreading of a
quoted sentence could still be duplicated in both. That is the strongest remaining risk and it is
recorded as such below; printing the quotes is the mitigation that does not depend on the author.

### Additional self-found defects (separate provenance)

**None this round.** The audit of every whitespace-sensitive transition in the table above, plus the
call-site inventory in 01, found no further instance of the class-substitution family: the §2.1 six
is confined to §4.6/§6.10, no host `trim()`/`trimStart`/`trimEnd` call site exists in the parser,
and one `split(` implements the one physical-line model.

`evidence-records.test.ts`'s `sections()` helper still scans this packet's own manifests with
`startsWith("## ")` and `trim()`. It was re-examined under this round's lens — a broad class at a
position whose production is narrower — and the round-15 disposition stands unchanged: it is not a
GFM parser and makes no grammar claim, its input is packet-authored and reviewer-inspected evidence,
and the only divergence it can produce is cosmetic, since `## <NBSP>Correction, round n` reads as a
correction section to the scanner *and* to a human reading the rendered manifest while
`##<NBSP>Correction` matches neither. Recorded as audited and left, not as a defect.

### Change groups, ownership and governing sources

| Group | Files | Ownership | Governing source |
|---|---|---|---|
| ATX and table structural-whitespace class | `tests/conformance/architecture/inventory-oracle.ts` | C4 evidence parser (conformance test support, not Kernel) | Published GFM 0.29 §2.1, §2.2, §4.2 and the tables extension |
| Nine new controls; two corrected round-15 assertions | `tests/conformance/architecture/kernel-landing-zone.test.ts` | C4 evidence | Contract C4; 012 deterministic-execution method |
| Contract revision 16, with revision 15's two wrong sentences marked superseded | `docs/development/work/K1.0/contract.md` | Packet requirement map | 006/008/012 |
| K1.0 paragraph and row reconciled to review-16 | `docs/development/007-work-packets.md` | Owner-owned status ledger | 006 status rules; review-16 |

**Cumulative diff base..C:** 200 files changed, 96 696 insertions, 36 deletions.
**Correction delta `6e08fabb…..C`:** 4 files changed, 436 insertions, 128 deletions. Both are
recorded in [validation-16/01](validation-16/01-tree-and-environment.log).

**Selected 012 methods and material exclusions:** unchanged from the contract — deterministic
execution carries C1/C2/C3/C7/C9 and the whole of the C4 correction; process/documentation carries
C4's record side, C5, C6 and C8; packaging/release is used only negatively for C6. Race and fault,
native Runtime/Driver and external evidence/gate remain materially excluded for the reasons the
contract states.

### Obligation and interaction coverage

| Obligation | Input, including the negative case | Expected facts / forbidden | Location and result |
|---|---|---|---|
| C4 closing-sequence predecessor (K10-R15-01) | VT and FF immediately before a trailing hash run, each with a planted contradictory table, against SPACE and TAB twins | A VT/FF-preceded run is content, so the heading is not the exact title and the section runs on; a SPACE/TAB-preceded run is a closing sequence and the section terminates | `kernel-landing-zone.test.ts` "ATX and table structural-whitespace classes (K10-R15-01)" — pass; the RED cases fail on H15 |
| C4 closing-sequence follower | VT/FF after a `##` run | "followed by spaces only": the run is not a closing sequence | same block — pass; fails on H15 |
| C4 end-of-content strip | VT/FF at the end of heading content | Not stripped; the heading is not the exact title | same block — pass; fails on H15 |
| C4 cell identity | VT/FF key cells, VT/FF value cells, VT row indentation, with SPACE/TAB padding twins | A grammar-distinct token is reported, not silently matched; genuine padding still parses | same block — pass; the key/value cases fail on H15 |
| C4 class confinement | The §4.6/§6.10 productions that cite the §2.1 six | VT/FF still open a complete type-7 tag: the class shrank at two productions, not across the file | same block — pass in both columns |
| C4 grammar fidelity | 36 ATX forms and 11 row forms against an independently written reference | C matches the reference everywhere; rows where H15 and C agree but the reference differs = 0 | [validation-16/09](validation-16/09-whitespace-class-audit.log) — C wrong 0, H15 wrong 5 |
| C4 non-vacuity | All 117 lines of the real inventory | Reference and C agree line for line on heading identity | same log — 0 mismatches |
| C4 prior corrections | Review-15 NBSP/Unicode-space, round-14 CRLF/LF/lone-CR, round-13 raw-HTML whitespace/blank-line, round-12 type-6 tokens, round-11/10/9/8 container, tag, fence, list and heading controls | All preserved and re-asserted; none removed or weakened | [validation-16/10](validation-16/10-c4-control-inventory.log) names every block; 186/186 in the file |
| C4 ↔ C5 | The real inventory, unmutated | Every zone, DX and package relation still agrees in both directions | full C4 block 156/156 — pass |
| C1/C2/C3/C6/C7/C8/C9 | Unchanged inputs | No target-zone, policy, manifest, scanner, package or provenance content changed this round | 2030/2030 full suite; the correction interval contains no such file |

### Tests added, ported or removed

Nine tests added, all inside the C4 block, all driving the production
`parseInventory` / `inventoryDisagreements` path except the class-confinement control, which drives
the same path through a type-7 opener. **None removed, none skipped, none weakened.** Two round-15
assertions that encoded the reviewed mistake were corrected in place rather than deleted: the GREEN
list in "a genuine exact next heading still terminates the section" loses its two VT entries and
gains two SPACE/TAB forms, and the `scanBlocks` primitive matrix's three VT/FF rows now carry the
values the specification gives. C4 block 147 → 156 leaf tests (131 → 140 cases plus the same 16
mutated-document controls); file 177 → 186; architecture suite 321 → 330; conformance 1908 → 1917;
full suite 2021 → 2030. No compatibility or refusal surface changed; no baseline, guide or skill is
materially affected (`npm run check:builder-docs` unchanged at 26/284/38).

### Semantic correction closure (012 §"Semantic correction closure")

1. **Invariant changed.** Previously: "every C4 Markdown lexical predicate uses the character class
   defined by the governing GFM production", implemented as one shared §2.1 class at ATX and table
   positions. Now: every C4 structural predicate uses the class named by **its own** production, not
   the class used by a neighbouring production and not a host-language notion of whitespace — with
   an explicit table of which production owns which class, and an explicit tie-breaker toward the
   narrower class where two readings are defensible. Authoritative source: published GFM 0.29 §2.1,
   §2.2, §4.2 and the tables extension, quoted in the evidence. Original counterexample: review-16's
   `## What this packet does not establish<VT>##` with a planted contradictory further table.
2. **Dependent rules and paths.** Every transition is enumerated in the sixteen-row table above, with
   the creator (`parseAtxHeading`/`stripAtxContent`, `gfmRowContent`, `splitGfmRow`), the validators
   (`rangeFromScanned`, `sectionTables`, `readKeyedTable`), and the consumers (`parseInventory`,
   `parseDependencyTable`, `inventoryDisagreements`, the C4/C5 tests). Conceptual aliases searched
   rather than only names: `trim`, `trimStart`, `trimEnd`, `\s`, `split(`, `isGfmWhitespace`,
   `GFM_WS_*`, "whitespace", "blank", "strip", "normalis/ze" — across `inventory-oracle.ts`,
   `boundary-policy.ts`, `module-graph.ts`, `evidence-records.test.ts`, `kernel-landing-zone.test.ts`
   and the target zone. The call-site inventory is committed in 01 rather than asserted here.
3. **Paths walked together.** Both ATX ends (content start and content end), both closing-sequence
   boundaries (predecessor and follower), the empty-content and all-hash limits, the one-over case
   (seven hashes), the indentation limit in columns including the tab cases, and — on the table side
   — the key cell, a value cell, both row edges, and a cell past the four the relation reads. Both
   section ends were walked: a non-exact *current* heading must fail to open the section, which the
   preserved round-15 control asserts. Material exclusion: inline-content rendering (emphasis, links,
   entity references) is still not modelled and is still not needed, because section identity
   compares raw heading content.
4. **Re-audit.** The whole cumulative packet was re-checked after the correction; the criterion
   assessment below covers C1–C9, not only C4. No additional in-scope defect was found this round.

### Prior findings

| Finding | Round | Disposition |
|---|---|---|
| **K10-R15-01** | 16 (review-16) | **CLOSED** this round by deriving each position's own class from the pinned productions; 9 committed controls, 6 of which fail on H15; demonstration 08 and independent-reference audit 09 |
| K10-R14-01 | 15 (review-15) | **CLOSED**, confirmed by review-16. Preserved and re-asserted here: the NBSP/Unicode-space controls are unchanged and still RED in both columns of 08, and the reference in 09 independently agrees that U+00A0/U+3000/U+FEFF/U+2009 are heading content |
| K10-R13-01 | 13 | CLOSED in round 14; physical-line tokenization preserved and re-asserted (08: LF→CR and LF→CRLF whole-inventory equivalence still GREEN in both columns) |
| K10-R12-01 | 12 | CLOSED in round 13; the §2.1 raw-HTML/tag classes are **unchanged** by this round and re-asserted by a dedicated control, because this correction narrowed two productions rather than the file |
| K10-R11-01 | 11 | CLOSED in round 12; type-6 boundary tokens preserved |
| K10-R10-01/-02/-03 | 10 | CLOSED in round 11; container-owned leaves, attribute separators and the GFM-0.29 `textarea`/`search` pin preserved |
| K10-R9-01, K10-R9-02 | 9 | CLOSED in round 10; container depth and the complete-tag recognizer preserved |
| K10-R8-01, K10-R8-02 | 8 | CLOSED in round 9; single-consumption layer preserved |
| K10-R7-01 | 7 | CLOSED in round 8; structural section membership preserved — and strengthened again here, since a false boundary from an over-broad class is the same claim's residue |
| K10-R6-01 | 6 | CLOSED in round 7; structural header/body split preserved |
| K10-R5-01 | 5 | CLOSED in round 6; GFM row grammar preserved |
| K10-R4-01, K10-R4-02 | 4 | CLOSED; key-before-value ordering and the evidence-record guard unchanged (the guard re-verifies validation-16's own digests) |
| K10-R3-01 | 3 | CLOSED; duplicate controls in both orders unchanged |
| K10-R2-01, K10-R2-02 | 2 | CLOSED; scanner reconstruction and relational comparison untouched |
| K10-R1-01, K10-R1-02 | 1 | CLOSED; unchanged |
| K1.0-SELF-08 … -23 | 4–12 | CLOSED; all controls unchanged and passing |
| K1.0-SELF-24 … -28 | 15 | CLOSED in round 15 and confirmed by review-16. SELF-24's table-cell identity is **narrowed further** here by the same derivation; SELF-25's restored ledger is intact at 385 lines with K5.2 present; SELF-26's escape spellings are extended to this round's constants; SELF-27's removals stand; SELF-28's count is updated to 140 |
| — | 16 | No new self-found defect |

**Unresolved obligations.** None owned by this packet is left for the reviewer. The contract's
standing limits are unchanged: no E1 credit and no K1 acceptance; `tests/conformance/k0` frozen with
its stale comment assigned to K1.4; an empty allowed-leaf list exercised only by a fixture; static
guards that establish nothing about durability, isolation or Driver fidelity; and an unpublished
private zone with no packaged-artifact evidence. K1.0-SELF-21 remains an observation: no general
Markdown renderer was built, and this round's reconstruction demonstrated no further blocking
interaction with the absolute-indent fence/code corner.

## Validation and interpretation

- **Exact commands / cwd / C / environment / exits / counts / raw paths / digests:** every row of the
  validation-16 [MANIFEST](validation-16/MANIFEST.md) table. Cwd
  `/Users/rex-shih/Documents/ArrokothI/arrokothi` throughout; C
  `d693d59aefe5335c8950d57cec6d6b57e375cadc`; Node v25.2.1 / npm 11.6.2 / TypeScript 5.9.3 /
  Darwin 25.6.0 arm64. `npm run typecheck` exit 0 clean; `npm test` exit 0, 2030/2030, 299 suites,
  0 fail / 0 skipped; `npm run test:conformance` exit 0, 1917/1917, 280 suites, 0 fail / 0 skipped;
  `npm run check:builder-docs` exit 0 (26 / 284 / 38); `npm run test:kernel` exit 0, 4/4;
  `npm run test:sdk` exit 0, 22/22; demonstration 08 exit 0, 29 cases, 10 distinguishing, 0 where C
  fails its own expectation; audit 09 exit 0, 36 ATX cases with C wrong 0 and H15 wrong 5, 11 row
  cases with H15 ≠ C on 4, and 117/117 real-inventory lines agreeing with the independent reference;
  control inventory 10 exit 0, 186/186. Raw logs 01–10 and their SHA-256 digests are the MANIFEST
  attachments; the committed `evidence-records.test.ts` guard re-verifies those digests inside the
  same suite run.
- **External fixture prepared / gate executed / external decision, separately:** benchmark E1
  preparation unchanged from the contract's *Release provenance* (branch
  `codex/e1-kernel-acceptance-capture`, C2 `d8f17549c31f9ee5d995e773c2f211faed2785fb` / H2
  `8de04779d279dba82cf834d419e465d2b677ef46`, benchmark `main`
  `5a3f1ba525f68244701b1f73a1d29c4902ffe589`): built, accepted by nobody, closes no E1 criterion. No
  gate was executed and no external decision was obtained this round.
- **Checks not run and resulting claim limits:** `npm run test:evals` was not run. The correction is
  confined to the C4 evidence parser and its controls and reaches no Agent or model-facing behaviour,
  so nothing in the diff is reachable from an eval; the claim is limited accordingly. There is no
  lint or build script in this repository, so `npm run typecheck` and `npm run check:builder-docs`
  are the relevant static and link/import checks, both run and green.
- **Why the evidence supports each criterion (implementer assessment, not acceptance):**
  **C1/C2** — the target-zone walk and the 23 forbidden-edge controls are untouched by the correction
  interval and green inside the 2030-test suite; no file under `packages/kernel` or
  `boundary-policy.ts` appears in the diff. **C3** — full suite 2030/2030 and typecheck clean; the
  export map and the five sorted-name digests are unchanged; no legacy source moved. **C4** —
  156/156 in the C4 block including the nine new controls, the 29-case H15→C demonstration (strongest
  row: review-16's own VT counterexample, H15 GREEN with the planted table hidden, C RED(2) naming
  both of its rows), and the three-column audit in which C matches an independently written
  specification reference on all 36 ATX and 11 row cases and on all 117 lines of the real document.
  **C5** — the twelve deferrals are untouched and still assigned to packets 007 declares, and the
  restored ledger still contains those packet headings. **C6** — the target package is untouched,
  still `private`, still refusal-only. **C7** — the legacy quarantine assertions and the 326-source
  scanner-identity control are green; the suite grew only by addition. **C8** — the E1 identities are
  recorded with their unaccepted status and no result is claimed. **C9** — the scanner and evidence
  machinery are untouched and green, and `tests/conformance/k0` is byte-identical to base.
- **Design choices, owner amendments, assumptions, strongest remaining risk:** the decisive design
  choice is the explicit narrow-class tie-breaker, now written into the parser's invariant: where two
  readings of a production are defensible, C4 takes the narrower class, because too narrow only adds
  reports while too broad deletes evidence silently. That rule, rather than a character list, is what
  makes this correction a reconstruction. No owner amendment was sought: aligning with the GFM 0.29
  rules the contract already cites needs none. **Strongest remaining risk:** the same author wrote
  both the parser and the specification reference that now judges it, so a misreading of a quoted
  sentence could still be duplicated in both columns. The audit counts the rows where H15 and C agree
  while the reference differs — the shape that would expose a shared assumption — and it is 0, but
  that count cannot detect an assumption shared by all three. The mitigation is that the sentences
  are printed verbatim in the evidence, so the authority a reviewer checks is the published text and
  not my restatement of it. The secondary risk is that two corrections in a row have now been found
  in the same subsystem by widening rather than deriving; the response is the per-production class
  table above, which makes "which production owns this position?" a question with a written answer
  for every transition rather than a shared default.
- **Third-party review under AGENTS.md:** none. No third-party code, dependency, service, asset or
  bundled material was learned from, used, copied or adapted in this round. The only external
  reference is the published GitHub Flavored Markdown 0.29 specification already cited by the
  contract, consulted as a rule source; the sentences it defines are quoted in the evidence log as
  short normative citations with attribution, and no specification text is copied into the shipped
  repository source.

## Handoff

- Ready for independent review. Remaining work in this packet: none.
- Base / previous reviewed H15 / C / H and the verified advertised remote SHA are supplied externally
  after the push; no offline bundle is needed (push is available).
- No self-acceptance. Review-14's ACCEPT of H14 remains a preserved historical record for that exact
  candidate and is not carried forward; review-15 and review-16 are preserved unchanged. K1.0 stays
  unaccepted until a fresh independent review of this H returns ACCEPT. Successor release remains
  owner-controlled. No E1 result, no K1 acceptance.
