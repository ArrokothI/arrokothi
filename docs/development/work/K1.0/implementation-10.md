# Implementation report — K1.0, round 10

## Identity

- **Packet / parent:** K1.0 — target boundary and legacy quarantine; parent milestone K1.
  **Contract:** [`contract.md`](contract.md), **revision 10**.
  **Governing process baseline:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
- **State:** `IN_PROGRESS` → `WAITING_FOR_REVIEW` (correction of the same released packet; no new
  owner release was sought or needed — 006 makes corrections on a released packet permission-free).
  **Owner release:** 2026-09-13, verbatim in the contract's *Release provenance* section, with the
  benchmark E1 dependency treated as built-but-unaccepted fixture preparation.
- **Prerequisite:** K0.2, independently ACCEPTED at H16 `90a6f37eaeb61009025449a1abc7e6d31dc1dbb2`,
  integrated as `0535160e677231da41b06d9f822e62e2f0364dd1`.
- **Branch:** `codex/k1.0-target-boundary-legacy-quarantine`; configured remote `origin`
  (`ArrokothI/arrokothi`).
- **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`, re-verified this session as exactly the
  advertised remote `main` (`git ls-remote origin main`).
- **Previous reviewed H9:** `4d7ebb9590c4a0a8da8fff4f5fa79c753eff2120`.
  **Round-9 review record:** [`review-09.md`](review-09.md), recorded by
  `784ab871d868693a1984c021b1f23392065cb79e`, which was the branch tip at session start.
- **Payload C:** `549e215abba1b9e8737d29c6800af07c8406b8ff`. Its parent is exactly the review-09
  record commit, so the correction interval is `784ab871…..549e215a…`, one commit touching only
  contract revision 10, `inventory-oracle.ts`, and `kernel-landing-zone.test.ts`.
- **Candidate H:** the commit containing this report. Its full SHA is supplied in the external
  handoff, after the push; it cannot be named from inside itself.
- **Exact C..H administrative allowlist:** `docs/development/work/K1.0/implementation-10.md`;
  `docs/development/work/K1.0/validation-10/` (MANIFEST.md and nine declared output-only `.log`
  attachments); and the status transcriptions in `docs/development/007-work-packets.md`,
  `docs/development/001-current-status-and-roadmap.md` and `docs/development/README.md`. No source,
  test, fixture, script, evaluator, threshold, package or configuration content first appears in H.
- **Working tree:** clean at C apart from `validation-10/`, which the validation run itself writes;
  clean at H. **Push:** performed after H exists; the advertised remote SHA is verified and reported
  in the external handoff, not claimed here.

## Changes and coverage

### The two open findings

**K10-R9-01 — P2 — a heading nested in a list item can be mistaken for a top-level governed-section
delimiter. Disposition: CLOSED by container-depth reconstruction.**

Revision 9 tracked leaf/raw contexts but no containers: a two-space-indented exact next-title
line inside a `- note` item parsed as an ordinary L2 heading and `sectionRange` used it as the
top-level delimiter, silently deleting the later contradictory table (reproduced against H9:
1 decoy unreadable row about `- note`, 0 further-table rows). `scanTransitions` now maintains a
list-item frame stack beside the fence/HTML state. Markers (bullets, 1–9-digit ordered forms,
0–3 indent, thematic-break precedence) push frames with GFM-derived content indents (marker
width plus 1–4 following spaces with tab stops, 5-plus collapses to 1, empty items default to
width plus 1); nested markers push, structural dedents pop, and blanks/lazy-prose/raw regions
never pop while dedented prose after a blank does (the blank ends any open item paragraph, so
no lazy continuation is possible there). Only depth-0 exact L2 headings delimit sections and
only depth-0 lines form tables; container-local headings break bodies but never delimit, and
the column-0 table after the list still escapes and reports. List markers always open
(interruption refinements could only under-extend toward silence); empty items and non-1
ordered starts honor the paragraph rule. Demonstrated H9 GREEN-silent → C RED-exact on
bullet/ordered/pop-to-outer/task-list shapes (validation-10/08, 5 container cases).

**K10-R9-02 — P2 — the claimed type-7 recognizer rejects valid complete tags with quoted `<`/`>`
and can reopen silent heading truncation. Disposition: CLOSED by a grammar-complete recognizer
plus the paragraph rule.**

The old regex forbade `<`/`>` anywhere in attributes and allowed attributes on closing tags,
and type 7 ignored the cannot-interrupt-a-paragraph rule. Reproduced against H9:
`<Warning title="a>b">` left the inner heading top-level and hid the table. A small explicit
complete-tag state machine now implements the quoted/unquoted attribute grammar (quoted
delimiters allowed, unquoted excludes whitespace/`"'=<`>/backtick, no space may be missing),
bare closing tags, no attributes on closes, the uppercase-ASCII type-4 rule and the type-7
paragraph exception (a tag after paragraph text stays prose; table rows are not paragraph
text, so blocks after tables still open; a delimiter-adjacent pipeless line keeps the block
open too). Neighboring audits fixed in the same pass: lowercase declarations stay prose,
type-6 keeps its tag boundary (mixed-case with attributes opens; longer names fall through to
type 7 correctly), and textarea follows type 1. Demonstrated H9 GREEN-silent → C RED-exact on
double/single-quoted openers (08, 2 cases), with the malformed-close, lowercase-declaration
and mid-paragraph-tag shapes flipping the other way (H9 RED-spurious → C GREEN).

### Preserved round-9 substance

K10-R8-01 fence single-consumption, the shared fence/HTML annotations, the fixed
`<script>`/comment/pre/div cases, SELF-18/19 exclusions, exact-title structural L2 identity,
structural header/body identity, one-governed-table accounting, round-6 GFM row discovery,
key-before-value uniqueness, bidirectional relational comparison with dependency
recomputation, the C1/C2/C9 scanner reconstruction and evidence-record protections are all
unchanged in behavior and re-asserted: the 110 pre-existing C4 tests pass verbatim, and the
clean inventory parses identically (the only real list in the document lives outside governed
sections; whole document green).

### Distinguishing controls committed with it

12 container tests ("list containers (K10-R9-01)"): the review's bullet literal, an ordered
equivalent, a wide-marker triple (3sp table escapes `10.` but stays nested under `-`, 3sp
heading ends the wide item green), a d2→d1 pop staying nested, current-title nesting, exact-2
termination locks (Deferred and Zones twins), supported plain lists with a pop-after-blank
lock, task lists, thematic precedence, restricted-marker/digit-limit locks, and a second-item
lock. 10 HTML tests ("complete type-7 tags (K10-R9-02)"): double/single-quoted delimiters,
unquoted/ordinary attributes, closing openers vs malformed closes, malformed near-tags, the
paragraph exception with its after-table counterpart, type-4 case rule with the single-line
self-close lock, type-6 boundary pair, and textarea. Validation-10/08 drives 17 shapes through
the byte-pinned H9 parser: 11 newly distinguishing, 6 agreeing as required, 0 regressing.

### The structural-transition audit

Validation-10/09 extends the round-9 audit with container depth: 14 windows each print depth
before/after with content indents, fence/HTML state, structural classification, `once`,
heading/table eligibility, the whole-parser observable and a `lines == transitions` check,
which holds everywhere. Shown: `c2`/`c3`/`c4` opens, the wide-vs-bullet table split, the
outer-item pop, denied markers, thematic prose, denied mid-paragraph tags with normal
termination, quoted openers, malformed closes, multi-line declarations, the preserved
fence/script/indented windows, and a clean-document spot check.

### Coverage map and evidence

| Obligation | Distinguishing input | Expected observable facts / forbidden | Location and result |
|---|---|---|---|
| C4 — nested headings do not delimit | bullet/ordered/nested/task/current-title lists + heading + later table | RED exact-2 under C, GREEN-silent under H9 | 7 container tests, pass |
| C4 — marker widths derive indents | wide-vs-bullet 3sp tables and headings | split verdicts, never hard-coded | wide + Zones tests, pass |
| C4 — termination/refusal boundaries | real heading after container; plain lists; thematic; restricted/digit markers | GREEN with exact silence | 4 container tests, pass |
| C4 — complete type-7 grammar | quoted delimiters, unquoted attrs, closing forms, malformed tags | RED-exact vs GREEN as grammar dictates | 6 HTML tests, pass |
| C4 — paragraph exception both ways | mid-paragraph tag vs tag after table row | GREEN vs RED | 2 HTML tests, pass |
| C4 — neighboring tag rules | type-4 case pair + self-close; type-6 pair; textarea | RED/GREEN per published rule | 3 HTML tests, pass |
| C4 — CRLF self-found | CRLF tag and bullet shapes | RED (was silent) | SELF-20 test, pass |
| C4 — all prior rounds preserved | 110 round-9 and earlier controls | all still pass verbatim | unchanged tests, pass |
| C3/C7 — nothing else moved | full suite, typecheck, export digests | 1977/1977, typecheck clean, export map unchanged | validation-10/02–07 |

- **Selected 012 methods:** deterministic execution (dominant) and process/documentation
  (C4/C5/C6/C8 are records). **Materially excluded, unchanged:** race and fault, native
  Runtime/Driver, external evidence/gate.
- **Tests added:** 23 cases in two new `describe` blocks plus one self-found control inside the
  existing C4 suite. **Removed:** none. **Weakened:** none. Architecture suite 277 cases
  (254 + 23); full suite 1977 (1954 + 23); conformance 1864 (1841 + 23); zero skipped.
- **Compatibility / refusal:** unchanged. The target package stays `private` and refusal-only.
- **Baseline / guides / skills:** unaffected; `check:builder-docs` unchanged at 26 files, 284
  links/anchors, 38 public imports.

### Prior findings

| Finding | Round | Disposition |
|---|---|---|
| K10-R9-01 | 9 | **CLOSED** this round by container-depth reconstruction; 5 newly distinguishing demonstrations, 12 committed controls, depth-carrying transition audit |
| K10-R9-02 | 9 | **CLOSED** this round by complete-tag recognizer with paragraph rule and type-4/6 audits; 4 newly distinguishing demonstrations each way, 10 committed controls |
| K10-R8-01 | 8 | CLOSED in round 9; single-consumption layer preserved verbatim in behavior, re-asserted |
| K10-R8-02 | 8 | Exact reviewed forms CLOSED in round 9; broadened correctly here; all controls pass |
| K10-R7-01 | 7 | CLOSED in round 8; ATX/fence heading grammar preserved verbatim |
| K10-R6-01 | 6 | CLOSED in round 7; header/body split preserved verbatim |
| K10-R5-01 | 5 | CLOSED in round 6; GFM row grammar preserved verbatim |
| K10-R4-01, K10-R4-02 | 4 | CLOSED; key-before-value and evidence-record guard unchanged |
| K10-R3-01 | 3 | CLOSED; duplicate controls in both orders unchanged |
| K10-R2-01, K10-R2-02 | 2 | CLOSED; scanner reconstruction and relational comparison untouched |
| K10-R1-01, K10-R1-02 | 1 | CLOSED; unchanged |
| K1.0-SELF-08 … -17 | 4–8 | CLOSED; all controls unchanged and passing |
| K1.0-SELF-18, -19 | 9 | CLOSED in round 9; both still passing |
| **K1.0-SELF-20** | **10** | **New, self-found:** trailing-CR intolerance silently dropped CRLF type-7 openers (tag became a decoy unreadable row while the nested heading truncated). Fixed at every block-boundary whitespace check; CRLF tag and bullet controls added |

### Cumulative re-audit beyond C4

Re-checked at C: `tests/conformance/k0` byte-identical to base (`git diff --quiet` exit 0); no file
under `packages/core`, `packages/sdk`, `packages/agents`, `packages/models`, `packages/retrieval`
or `packages/interoperability` differs from base beyond the cumulative K1.0 payload already
reviewed; the only manifest added remains the private `packages/kernel/package.json`; the
C1/C2/C9 scanner, forbidden-edge controls, legacy re-attribution with its 13 assertions, and the
refusal-only target surface are untouched and green. The correction delta is three files
(contract revision 10, `inventory-oracle.ts`, `kernel-landing-zone.test.ts`). The round-9
"one pass" wording note is resolved in code: `sectionTables`/`sectionLines` share one
precomputed scan per call via `rangeFromScanned`.

## Validation and interpretation

All commands ran in `/Users/rex-shih/Documents/ArrokothI/arrokothi` against clean payload C
`549e215abba1b9e8737d29c6800af07c8406b8ff`, whose only uncommitted content was `validation-10/`,
which the run writes. Environment: Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64.
Raw logs, digests and exact commands: [`validation-10/MANIFEST.md`](validation-10/MANIFEST.md).

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | 1977 tests, 291 suites, 0 fail, 0 skipped |
| `npm run test:conformance` | 0 | 1864 tests, 272 suites, 0 fail, 0 skipped |
| `npm run check:builder-docs` | 0 | 26 Markdown files, 284 links/anchors, 38 public package imports |
| `npm run test:kernel` | 0 | 4 tests, 0 fail |
| `npm run test:sdk` | 0 | 22 tests, 0 fail |
| K10-R9-01/R9-02 demonstration | 0 | 17 cases, 11 newly distinguishing, 0 regressions |
| structural-transition audit | 0 | 14 windows; lines == transitions everywhere; depth-gated eligibility shown |

The manifest's nine digests name the exact log bytes above; the H9 source pinned in 08 carries
SHA-256 `dfaa9aa14abe92a20e1318300b9eb594409d15f31c34b51cf9333dd40afb1f37` and was extracted
with `git show 4d7ebb9590c4a0a8da8fff4f5fa79c753eff2120:…`, not paraphrased.

- **External fixture / gate / decision:** none executed. The benchmark E1 preparation was re-checked
  read-only this session: benchmark `main` still advertises
  `5a3f1ba525f68244701b1f73a1d29c4902ffe589` and the preparation branch still advertises
  `8de04779d279dba82cf834d419e465d2b677ef46` (both via `git ls-remote`, unaccepted by nobody);
  the contract's seven E1 identities are unchanged, and nothing in this branch touches that
  repository. **This packet claims no E1 result.**
- **Checks not run:** `npm run test:evals`. This packet changes no Agent or model-facing behaviour
  and nothing in the diff is reachable from an eval. The limit: this candidate makes no claim about
  Agent behaviour or model-facing quality.
- **Why the evidence supports the criteria (implementer assessment, not acceptance):** C4's claim
  now rests on the whole chain — committed controls that flip the reviewed H9's verdicts in both
  directions (nested containers H9 GREEN → C RED; malformed/lowercase/mid-paragraph shapes H9 RED →
  C GREEN), a depth-carrying transition audit showing every line's single structural step with its
  eligibility and whole-parser outcome, and the preserved round-2…9 controls proving the
  reconstruction narrowed nothing. Residual corners (pipe-less body rows before tags/markers,
  always-code indented lines) are stated in contract and code and err toward reporting.
- **Design choices:** silent container tracking over refusal, because the inventory's governed
  sections need no lists yet refusal still requires the same container knowledge to keep the
  later table surfacing; interpreting (not refusing) type 7 with a hand-rolled recognizer rather
  than a broader regex or a new dependency; markers always opening (interruption refinements
  could only under-extend toward silence); prose-after-blank popping (blank kills laziness).
- **Owner amendments:** none this round. **Assumptions:** none beyond the recorded release.
- **Strongest remaining risk:** the scanner covers the GFM subset this one document uses (ATX
  headings, list containers, backtick/tilde fences, raw-HTML types 1–7, blank/quote/indented
  breaks); setext headings, thematic-break structure, link definitions and nested-table
  relations have no block state of their own and surface as unreadable/duplicate/further rows
  (fail-loud), argued from the specification and probed against pandoc's GFM reader where the
  published text is silent — notably GFM tables are read here as unable to interrupt a
  paragraph (pandoc T1 agrees), with the table scanner itself left over-approximating (opens
  without a preceding blank) so the uncertainty errs loud, never silent.
- **Third-party review under AGENTS.md:** no code, test, script, asset or dependency was copied,
  adapted, vendored or added this round, and no dependency was added to any manifest. Two
  pre-existing environment tools were used read-only as behavioral references and are disclosed
  here: pandoc 2.12 (`pandoc 2.12`, GPL-2.0-or-later, system install at `/Users/rex-shih/
  anaconda3/bin/pandoc`, invoked as `pandoc -f gfm -t html` on scratch inputs to probe
  paragraph-interruption, list-continuation and thematic-precedence behavior; its outputs were
  treated as one imperfect signal — disagreements with the published GFM text on table
  interruption after list items and bare body-row continuation were resolved in favor of the
  published specification) and python-markdown 3.8 (BSD-2-Clause, present but not relied on:
  its table extension is not GFM). No text, code or fixture from either was reproduced; the
  oracle implementation remains independent. Unresolved terms: none for this use (no
  redistribution, no derivative inclusion).

## Handoff

- **Ready for independent review.** The whole cumulative packet is submitted, not only the delta.
- Base, payload C and candidate H, with the verified advertised remote SHA, are supplied in the
  external owner handoff after the push. This report cannot certify its own future push.
- **No self-acceptance.** No E1 result, no K1 acceptance, no successor release. `next_release: none`.
